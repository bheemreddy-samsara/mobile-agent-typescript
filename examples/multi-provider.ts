/**
 * Example: Using different LLM providers (OpenAI, Anthropic)
 */

import { remote } from "webdriverio";
import { MobileAgent } from "../src";

async function testWithOpenAI() {
  const driver = await remote({
    hostname: "localhost",
    port: 4723,
    capabilities: {
      platformName: "Android",
      "appium:automationName": "UiAutomator2",
      "appium:deviceName": "Android Emulator",
      "appium:appPackage": "com.android.calculator2",
      "appium:appActivity": ".Calculator",
    },
  });

  const agent = new MobileAgent({
    driver,
    apiKey: process.env.OPENAI_API_KEY!,
    llmProvider: "openai",
    model: "gpt-4o",
    verbose: true,
  });

  try {
    await agent.startSession();

    await agent.execute("tap on number 5");
    await agent.execute("tap on plus button");
    await agent.execute("tap on number 3");
    await agent.execute("tap on equals button");
    await agent.assert("the result shows 8");

    await agent.stopSession("success");
  } finally {
    await driver.deleteSession();
  }
}

async function testWithAnthropic() {
  const driver = await remote({
    hostname: "localhost",
    port: 4723,
    capabilities: {
      platformName: "Android",
      "appium:automationName": "UiAutomator2",
      "appium:deviceName": "Android Emulator",
      "appium:appPackage": "com.android.calculator2",
      "appium:appActivity": ".Calculator",
    },
  });

  const agent = new MobileAgent({
    driver,
    apiKey: process.env.ANTHROPIC_API_KEY!,
    llmProvider: "anthropic",
    model: "claude-3-5-sonnet-20241022",
    verbose: true,
  });

  try {
    await agent.startSession();

    await agent.execute("calculate 10 times 4");
    await agent.assert("the result is 40");

    await agent.stopSession("success");
  } finally {
    await driver.deleteSession();
  }
}

// Run tests
async function main() {
  console.log("Testing with OpenAI GPT-4...");
  await testWithOpenAI();

  console.log("\nTesting with Anthropic Claude...");
  await testWithAnthropic();
}

main()
  .then(() => console.log("\nAll tests completed"))
  .catch((error) => {
    console.error("Test failed:", error);
    process.exit(1);
  });
