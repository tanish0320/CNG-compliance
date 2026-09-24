# Mobile Application

Recommended baseline: React Native + TypeScript, Android-first.

## Key modules
- `auth`
- `camera`
- `plate-recognition`
- `verification`
- `history`
- `review`
- `admin`
- `telemetry`
- `secure-storage`

## 3D UX
Use `three` + `@react-three/fiber` only for lightweight visual polish such as the home/capture state. Core scanning, confirmation and result flows must remain native, accessible and fast.

## Android release
- Configure a release keystore outside source control.
- Use environment-specific API endpoints.
- Enable minification/obfuscation after testing.
- Run mobile security analysis before release.
- Distribute through approved enterprise/Play channel.
