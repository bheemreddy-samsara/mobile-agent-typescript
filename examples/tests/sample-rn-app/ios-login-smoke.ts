/**
 * iOS sample RN app smoke test (no LLM).
 * Requires MOBILE_APP_PATH to point to the built simulator .app bundle.
 *
 * Usage:
 *   export MOBILE_APP_PATH="/absolute/path/to/SampleRNApp.app"
 *   npx ts-node examples/tests/sample-rn-app/ios-login-smoke.ts
 */
import { remote } from 'webdriverio';

async function run() {
  const app = process.env.MOBILE_APP_PATH;
  if (!app) throw new Error('Set MOBILE_APP_PATH (.app) for the iOS simulator');

  const driver = await remote({
    hostname: process.env.APPIUM_HOST || 'localhost',
    port: parseInt(process.env.APPIUM_PORT || '4723', 10),
    capabilities: {
      platformName: 'iOS',
      'appium:automationName': 'XCUITest',
      'appium:deviceName': process.env.MOBILE_DEVICE_NAME || 'iPhone 15 Pro',
      'appium:platformVersion': process.env.MOBILE_PLATFORM_VERSION, // optional
      'appium:app': app,
      'appium:noReset': true,
      'appium:newCommandTimeout': 120,
    },
  });

  try {
    await driver.pause(1500);

    // Click the login button by accessibility id
    let clicked = false;
    const a11y = await driver.$$(`~login-button`);
    if (a11y.length) { await a11y[0].click(); clicked = true; }

    // Fallback: by label text "Login"
    if (!clicked) {
      const byLabel = await driver.$(`-ios predicate string:label == "Login"`);
      await byLabel.waitForExist({ timeout: 10000 });
      await byLabel.click();
      clicked = true;
    }

    // Verify logout button exists on Home screen
    let ok = false;
    try {
      const logout = await driver.$('~logout-button');
      await logout.waitForExist({ timeout: 5000 });
      ok = true;
    } catch {}

    if (!ok) {
      const byHome = await driver.$(`-ios predicate string:label CONTAINS[c] "Home"`);
      await byHome.waitForExist({ timeout: 5000 });
      ok = true;
    }

    if (!ok) throw new Error('Home screen not detected');

    console.log('✅ iOS Sample RN login smoke passed');
  } finally {
    await driver.deleteSession();
  }
}

run().catch((e) => {
  console.error('❌ iOS Sample RN login smoke failed:', e);
  process.exit(1);
});

