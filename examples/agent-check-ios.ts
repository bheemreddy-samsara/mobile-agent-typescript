/**
 * iOS Agent smoke: starts a session against a .app (simulator) and prints UI state.
 *
 * Usage:
 *   export MOBILE_APP_PATH="/absolute/path/to/SampleRNApp.app"
 *   npx ts-node examples/agent-check-ios.ts
 */
import { remote } from "webdriverio";
import { MobileAgent } from "../src";

async function run() {
  const appPath = process.env.MOBILE_APP_PATH;
  if (!appPath) throw new Error("Set MOBILE_APP_PATH to the built .app (simulator).");

  const driver = await remote({
    hostname: process.env.APPIUM_HOST || "localhost",
    port: parseInt(process.env.APPIUM_PORT || "4723", 10),
    capabilities: {
      platformName: "iOS",
      "appium:automationName": "XCUITest",
      "appium:deviceName": process.env.MOBILE_DEVICE_NAME || "iPhone 15 Pro",
      "appium:platformVersion": process.env.MOBILE_PLATFORM_VERSION, // optional
      "appium:app": appPath,
      "appium:noReset": true,
    },
  });

  const agent = new MobileAgent({
    driver,
    apiKey: process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || "test-key",
    verbose: true,
  });

  try {
    await agent.startSession();
    const state = await agent.getCurrentState();
    console.log("Activity:", state.activity);
    console.log("Elements:", state.elements.length);
    if (state.screenshotBase64) console.log("Screenshot length:", state.screenshotBase64.length);
    await agent.stopSession("success");
  } finally {
    await driver.deleteSession();
  }
}

run().catch((e) => {
  console.error("iOS agent smoke failed:", e);
  process.exit(1);
});
