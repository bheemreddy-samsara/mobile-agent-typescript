/**
 * Basic usage example for Mobile Agent SDK
 */

import { remote } from "webdriverio";
import { MobileAgent } from "../src";

async function runBasicTest() {
  // Initialize WebDriverIO with Appium
  const driver = await remote({
    hostname: process.env.APPIUM_HOST || "localhost",
    port: parseInt(process.env.APPIUM_PORT || "4723", 10),
    logLevel: "info",
    capabilities: {
      platformName: "Android",
      "appium:automationName": "UiAutomator2",
      "appium:deviceName": "Android Emulator",
      "appium:appPackage": "com.android.settings",
      "appium:appActivity": ".Settings",
    },
  });

  try {
    // Create Mobile Agent
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY || "test-key";
    const agent = new MobileAgent({
      driver,
      apiKey,
      llmProvider: "openai",
      verbose: true,
    });

    // Start test session
    await agent.startSession();

    // Execute natural language instructions
    await agent.execute("tap on Network & internet");

    // Verify the result
    const passed = await agent.assert("the network settings page is open");

    // Stop session
    const result = await agent.stopSession(passed ? "success" : "failure");

    console.log("\n=== Test Result ===");
    console.log(`Success: ${result.success}`);
    console.log(`Duration: ${result.durationSeconds.toFixed(1)}s`);
    console.log(`Steps: ${result.steps.length}`);
    console.log(`Verifications: ${result.verificationResults.length}`);
  } finally {
    await driver.deleteSession();
  }
}

// Run the test
runBasicTest()
  .then(() => console.log("Test completed successfully"))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
