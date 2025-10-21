/**
 * iOS Appium Configuration
 */

import type { TestConfig } from "../utils/testHelpers";

export const iosDemoAppConfig: TestConfig = {
  platform: "iOS",
  bundleId: "com.demoapp",
  deviceName: "iPhone 15 Pro",
  platformVersion: "17.0",
  // appPath: '/path/to/DemoApp.app', // Uncomment and set path when ready
};

export const iosSettingsConfig: TestConfig = {
  platform: "iOS",
  bundleId: "com.apple.Preferences",
  deviceName: "iPhone 15 Pro",
  platformVersion: "17.0",
};

export const iosGoogleMapsConfig: TestConfig = {
  platform: "iOS",
  bundleId: "com.google.Maps",
  deviceName: "iPhone 15 Pro",
  platformVersion: "17.0",
};
