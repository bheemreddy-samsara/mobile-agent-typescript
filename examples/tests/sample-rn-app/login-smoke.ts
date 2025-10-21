/**
 * Sample RN App (Android) smoke test without LLM.
 * - Installs/launches the APK
 * - Taps the login button
 * - Verifies Home screen appears
 *
 * Usage:
 *   export MOBILE_APP_PATH="$PWD/examples/sample-rn-app/android/app/build/outputs/apk/release/app-release.apk"
 *   npx ts-node examples/tests/sample-rn-app/login-smoke.ts
 */
import { remote } from 'webdriverio';

async function run() {
  const apk = process.env.MOBILE_APP_PATH;
  if (!apk) throw new Error('Set MOBILE_APP_PATH to your sample RN app APK');

  const driver = await remote({
    hostname: process.env.APPIUM_HOST || 'localhost',
    port: parseInt(process.env.APPIUM_PORT || '4723', 10),
    logLevel: 'info',
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:deviceName': process.env.MOBILE_DEVICE_NAME || 'Android Emulator',
      'appium:app': apk,
      'appium:noReset': true,
      'appium:newCommandTimeout': 120,
    },
  });

  try {
    // Small settle time for RN app
    await driver.pause(1500);

    // If RN RedBox is present, fail fast with a helpful hint
    const redbox = await driver.$$(`android=new UiSelector().resourceIdMatches(".*rn_redbox_stack")`);
    if (redbox.length > 0) {
      throw new Error("React Native RedBox detected. Start Metro with 'npx react-native start' or ensure the bundle is embedded.");
    }

    // Try to find the login button by accessibility id first
    let clicked = false;
    const byA11y = await driver.$$(`~login-button`);
    if (byA11y.length > 0) {
      await byA11y[0].click();
      clicked = true;
    }

    // Fallback: find by visible text 'Login'
    if (!clicked) {
      const byText = await driver.$(`android=new UiSelector().textMatches("(?i)\\bLogin\\b")`);
      await byText.waitForExist({ timeout: 10000 });
      await byText.click();
      clicked = true;
    }

    // Verify Home screen
    let ok = false;
    try {
      const logout = await driver.$('~logout-button');
      await logout.waitForExist({ timeout: 5000 });
      ok = true;
    } catch {}

    // Fallback: find text "Home"
    if (!ok) {
      const homeText = await driver.$('android=new UiSelector().textContains("Home")');
      await homeText.waitForExist({ timeout: 5000 });
      ok = true;
    }

    if (!ok) throw new Error('Home screen not detected');

    console.log('✅ Sample RN login smoke passed');
  } finally {
    await driver.deleteSession();
  }
}

run().catch((e) => {
  console.error('❌ Sample RN login smoke failed:', e);
  process.exit(1);
});
