import asyncio
import os
import statistics
import sys
import time
import uuid
from httpx import ASGITransport, AsyncClient

root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, os.path.join(root_dir, "backend"))
sys.path.insert(0, os.path.join(root_dir, "backend", "tests"))

from app.main import app
from test_auth import create_test_token


async def worker(client: AsyncClient, token: str, requests_per_worker: int, results: list[tuple[float, int]]) -> None:
    for _ in range(requests_per_worker):
        key = str(uuid.uuid4())
        start = time.perf_counter()
        try:
            resp = await client.post(
                "/api/v1/verifications",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Idempotency-Key": key,
                },
                json={"vehicle_registration": "DL01AB1234", "ocr_confidence": 0.95},
            )
            duration = time.perf_counter() - start
            results.append((duration, resp.status_code))
            if resp.status_code != 200 and len(results) <= 3:
                print(f"Debug response: {resp.status_code} {resp.text}")
        except Exception as exc:
            duration = time.perf_counter() - start
            results.append((duration, 500))
            if len(results) <= 3:
                print(f"Debug exc: {exc}")


async def run_load_test(concurrent_workers: int = 10, requests_per_worker: int = 50) -> None:
    from app.core.database import init_db
    await init_db()

    token = create_test_token(user_id="load_tester", roles=["PUMP_OPERATOR"])
    results: list[tuple[float, int]] = []

    print(f"Starting benchmark: {concurrent_workers} workers x {requests_per_worker} requests = {concurrent_workers * requests_per_worker} total verifications...")
    start_total = time.perf_counter()

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as client:
        tasks = [
            asyncio.create_task(worker(client, token, requests_per_worker, results))
            for _ in range(concurrent_workers)
        ]
        await asyncio.gather(*tasks)

    total_time = time.perf_counter() - start_total
    total_reqs = len(results)
    successful_reqs = sum(1 for _, status in results if status == 200)
    durations = [d * 1000.0 for d, _ in results]  # convert to ms

    durations.sort()
    p50 = statistics.median(durations)
    p95 = durations[int(len(durations) * 0.95)]
    p99 = durations[int(len(durations) * 0.99)]
    rps = total_reqs / total_time
    error_rate = ((total_reqs - successful_reqs) / total_reqs) * 100.0

    print("\n========================================")
    print("LOAD TEST BENCHMARK RESULTS")
    print("========================================")
    print(f"Total Requests:      {total_reqs}")
    print(f"Successful (200):    {successful_reqs}")
    print(f"Total Time:          {total_time:.2f} s")
    print(f"Requests / sec:      {rps:.2f} req/s")
    print(f"Latency p50:         {p50:.2f} ms")
    print(f"Latency p95:         {p95:.2f} ms")
    print(f"Latency p99:         {p99:.2f} ms")
    print(f"Error Rate:          {error_rate:.2f}%")
    print("========================================\n")


if __name__ == "__main__":
    asyncio.run(run_load_test())
