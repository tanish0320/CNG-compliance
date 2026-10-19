export const haptics = {
  // Safe tactile feedback stubs (prevents SecurityException on prebuilt APK without VIBRATE manifest entry)
  tap: () => {},
  success: () => {},
  warning: () => {},
  error: () => {},
};

