/**
 * Basic iOS usage example for Mobile Agent SDK
 *
 * Prereqs:
 * - Xcode + a booted simulator (e.g., iPhone 15)
 * - Appium server running: `appium --port 4723`
 * - OPENAI_API_KEY or ANTHROPIC_API_KEY set
 *
 * Run:
 *   npx ts-node examples/basic-usage.ios.ts
 */

import { remote } from "webdriverio";
import { MobileAgent } from "../src";

async function runBasicIosTest() {
  const host = process.env.APPIUM_HOST || "localhost";
  const port = parseInt(process.env.APPIUM_PORT || "4723", 10);
  const deviceName = process.env.MOBILE_DEVICE_NAME || "iPhone 15";
  const bundleId = process.env.MOBILE_BUNDLE_ID || "com.apple.Preferences"; // iOS Settings
  const platformVersion = process.env.MOBILE_PLATFORM_VERSION; // optional
  const noReset = process.env.APPIUM_NO_RESET === "true";

  const capabilities: Record<string, unknown> = {
    platformName: "iOS",
    "appium:automationName": "XCUITest",
    "appium:deviceName": deviceName,
    "appium:bundleId": bundleId,
    "appium:noReset": noReset,
  };
  if (platformVersion) {
    capabilities["appium:platformVersion"] = platformVersion;
  }

  const driver = await remote({ hostname: host, port, capabilities });

  try {
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || "test-key";
    const provider = (process.env.LLM_PROVIDER === "anthropic" ? "anthropic" : "openai") as
      | "openai"
      | "anthropic";
    const agent = new MobileAgent({
      driver,
      apiKey,
      llmProvider: provider,
      verbose: true,
    });

    await agent.startSession();

    // Navigate within iOS Settings
    await agent.execute("tap on Wi‑Fi");
    const passed = await agent.assert("the Wi‑Fi settings page is open");

    const result = await agent.stopSession(passed ? "success" : "failure");

    console.log("\n=== iOS Test Result ===");
    console.log(`Success: ${result.success}`);
    console.log(`Duration: ${result.durationSeconds.toFixed(1)}s`);
    console.log(`Steps: ${result.steps.length}`);
    console.log(`Verifications: ${result.verificationResults.length}`);
    if (result.screenshots?.length) {
      console.log("Artifacts:", result.screenshots);
    }
  } finally {
    await driver.deleteSession();
  }
}

runBasicIosTest()
  .then(() => console.log("iOS example completed"))
  .catch((err) => {
    console.error("iOS example failed:", err);
    process.exit(1);
  });
