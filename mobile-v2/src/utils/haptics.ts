import { Vibration, Platform } from 'react-native';

export const haptics = {
  // Light tactile buzz for button taps (48dp controls, tabs, shutter)
  tap: () => {
    if (Platform.OS === 'android') {
      Vibration.vibrate(25);
    }
  },

  // Double pulse for authorized / compliant vehicle verification
  success: () => {
    if (Platform.OS === 'android') {
      // pause 0ms, buzz 35ms, pause 50ms, buzz 45ms
      Vibration.vibrate([0, 35, 50, 45]);
    }
  },

  // Single alert pulse for warning / expiring soon / manual review needed
  warning: () => {
    if (Platform.OS === 'android') {
      // pause 0ms, buzz 60ms, pause 70ms, buzz 60ms
      Vibration.vibrate([0, 60, 70, 60]);
    }
  },

  // Heavy distinct triple pulse for refueling denied / expired hydrotest
  error: () => {
    if (Platform.OS === 'android') {
      // pause 0ms, buzz 90ms, pause 60ms, buzz 110ms
      Vibration.vibrate([0, 90, 60, 110]);
    }
  },
};
