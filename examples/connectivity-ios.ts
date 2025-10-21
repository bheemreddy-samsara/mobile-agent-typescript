/**
 * iOS connectivity smoke test using Appium WebDriver.
 *
 * Supports either:
 *  - MOBILE_APP_PATH pointing to a simulator .app bundle, or
 *  - MOBILE_BUNDLE_ID to launch an installed app (e.g., com.apple.Preferences)
 *
 * Saves a screenshot to ARTIFACTS_DIR if set.
 */
import { remote } from 'webdriverio';

async function run() {
  const host = process.env.APPIUM_HOST || 'localhost';
  const port = parseInt(process.env.APPIUM_PORT || '4723', 10);
  const deviceName = process.env.MOBILE_DEVICE_NAME || 'iPhone 15 Pro';
  const platformVersion = process.env.MOBILE_PLATFORM_VERSION; // optional
  const appPath = process.env.MOBILE_APP_PATH;
  const bundleId = process.env.MOBILE_BUNDLE_ID;

  if (!appPath && !bundleId) {
    throw new Error('Set MOBILE_APP_PATH (.app) or MOBILE_BUNDLE_ID to run this iOS connectivity test');
  }

  const capabilities: any = {
    platformName: 'iOS',
    'appium:automationName': 'XCUITest',
    'appium:deviceName': deviceName,
    'appium:noReset': true,
  };
  if (platformVersion) capabilities['appium:platformVersion'] = platformVersion;
  if (appPath) capabilities['appium:app'] = appPath; else capabilities['appium:bundleId'] = bundleId;

  const driver = await remote({ hostname: host, port, capabilities });

  try {
    // If using bundleId, ensure app is activated
    if (!appPath && bundleId) {
      try { await (driver as any).activateApp(bundleId); } catch {}
    }

    // Give it a moment to settle
    await driver.pause(1000);

    // Capture page source + screenshot
    const page = await driver.getPageSource();
    const activity = await (driver as any).getCurrentActivity?.().catch(() => '');
    const shot = await driver.takeScreenshot();

    console.log('Activity:', activity || '(n/a)');
    console.log('Elements (approx):', (page.match(/<\w+/g) || []).length);
    console.log('Screenshot (base64 length):', shot.length);

    const dir = process.env.ARTIFACTS_DIR;
    if (dir) {
      const fs = await import('fs');
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(`${dir}/connectivity-ios.png`, Buffer.from(shot, 'base64'));
      console.log('Saved screenshot to', `${dir}/connectivity-ios.png`);
    }
  } finally {
    await driver.deleteSession();
  }
}

run().catch((e) => {
  console.error('iOS connectivity failed:', e);
  process.exit(1);
});

