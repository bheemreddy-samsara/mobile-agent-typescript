/**
 * Connectivity smoke test (Android):
 * - Connects to emulator/device via Appium
 * - Launches Android Settings
 * - Captures page source and a screenshot
 * - Prints basic UI state (activity, element count)
 *
 * Does NOT require an LLM API key.
 *
 * Run:
 *   appium --port 4723
 *   npx ts-node examples/connectivity-android.ts
 */

import { remote } from 'webdriverio';
import { UIObserver } from '../src/observer/UIObserver';

async function run() {
  const host = process.env.APPIUM_HOST || 'localhost';
  const port = parseInt(process.env.APPIUM_PORT || '4723', 10);

  const capabilities: any = {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:deviceName': process.env.MOBILE_DEVICE_NAME || 'Android Emulator',
    'appium:noReset': true,
  };
  const appPath = process.env.MOBILE_APP_PATH;
  if (appPath) {
    capabilities['appium:app'] = appPath; // Install/launch APK
  } else {
    capabilities['appium:appPackage'] = process.env.MOBILE_APP_PACKAGE || 'com.android.settings';
    capabilities['appium:appActivity'] = process.env.MOBILE_APP_ACTIVITY || '.Settings';
  }

  const driver = await remote({ hostname: host, port, capabilities });
  const observer = new UIObserver();

  try {
    // Ensure target app is foregrounded (best-effort)
    const usingAppPath = Boolean(appPath);
    const pkg = String(process.env.MOBILE_APP_PACKAGE || 'com.android.settings');
    const act = String(process.env.MOBILE_APP_ACTIVITY || '.Settings');
    if (!usingAppPath) {
      try {
        await (driver as any).startActivity(pkg, act);
      } catch {
        try {
          await (driver as any).activateApp(pkg);
        } catch {}
      }
      await driver.pause(800);
    } else {
      // Appium should auto-launch the app when 'app' is provided; small settle wait
      await driver.pause(1200);
    }

    const state = await observer.getUIState(driver, 'screenshot');
    console.log('Activity:', state.activity);
    console.log('Elements:', state.elements.length);
    console.log('Screenshot (base64 length):', state.screenshotBase64?.length || 0);

    // Basic validation: warn if expected package is not in XML root packages
    const expectedPkg = usingAppPath ? undefined : pkg;
    const looksLikeHome = state.xmlSource?.includes('com.google.android.apps.nexuslauncher');
    if (looksLikeHome && expectedPkg !== 'com.google.android.apps.nexuslauncher') {
      console.warn('Warning: Launcher UI detected; target app may not be foregrounded.');
    }

    // Optionally save screenshot
    if (process.env.ARTIFACTS_DIR && state.screenshotBase64) {
      const fs = await import('fs');
      const dir = process.env.ARTIFACTS_DIR;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const path = `${dir}/connectivity.png`;
      fs.writeFileSync(path, Buffer.from(state.screenshotBase64, 'base64'));
      console.log('Saved screenshot to', path);
    }
  } finally {
    await driver.deleteSession();
  }
}

run().catch((e) => {
  console.error('Connectivity test failed:', e);
  process.exit(1);
});
