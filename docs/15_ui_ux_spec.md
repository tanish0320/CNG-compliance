# Mobile UI / UX Specification

## Visual direction
- Light neutral surfaces, high legibility, clear status hierarchy.
- Large touch targets for field operation.
- One primary action per screen.
- Minimal text entry; OCR correction uses a prominent editable plate component.
- Strong status semantics with icon + label + explanation; never rely on color alone.
- 3D/Three.js layer is decorative/assistive only and must degrade gracefully.

## Primary screens
1. Sign in.
2. Home / Scan Vehicle.
3. Camera with plate framing and capture-quality hints.
4. OCR confirmation.
5. Verifying state with visible pipeline progress.
6. Result: Valid / Expiring / Expired / Invalid / Not Found / Review.
7. Verification history.
8. Manual-review queue (authorized roles).
9. Admin/configuration (authorized roles).
10. Profile/device diagnostics.

## Field UX
- Provide haptic/audio success feedback where device policy allows.
- Keep result usable in direct sunlight.
- Provide retry path for glare/blur.
- Preserve captured request locally when connectivity drops, subject to security policy.
