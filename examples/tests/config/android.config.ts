/**
 * Android Appium Configuration
 */

import { TestConfig } from '../utils/testHelpers';

export const androidDemoAppConfig: TestConfig = {
  platform: 'Android',
  appPackage: 'com.demoapp',
  appActivity: '.MainActivity',
  deviceName: 'Android Emulator',
  // appPath: '/path/to/app-debug.apk', // Uncomment and set path when ready
};

export const androidGoogleMapsConfig: TestConfig = {
  platform: 'Android',
  appPackage: 'com.google.android.apps.maps',
  appActivity: 'com.google.android.maps.MapsActivity',
  deviceName: 'Android Emulator',
};

export const androidSettingsConfig: TestConfig = {
  platform: 'Android',
  appPackage: 'com.android.settings',
  appActivity: '.Settings',
  deviceName: 'Android Emulator',
};

