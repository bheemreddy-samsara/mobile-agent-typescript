/**
 * Wait strategy benchmark
 * Compares: hard sleeps vs UI settle vs verification-as-wait (oracle)
 *
 * Requirements:
 * - Appium server running
 * - Android Settings or sample RN app available
 * - OPENAI_API_KEY (for LLM-based verification-as-wait)
 */
import { remote } from "webdriverio";
import { MobileAgent } from "../../src";

type Strategy = "hard" | "uiSettle" | "oracle";

async function bench(strategy: Strategy) {
  const host = process.env.APPIUM_HOST || "localhost";
  const port = parseInt(process.env.APPIUM_PORT || "4723", 10);
  const platform = process.env.MOBILE_PLATFORM || "Android";

  const capabilities: any = {
    platformName: platform,
  };
  if (platform === "Android") {
    capabilities["appium:automationName"] = "UiAutomator2";
    if (process.env.MOBILE_APP_PATH) {
      capabilities["appium:app"] = process.env.MOBILE_APP_PATH;
    } else {
      capabilities["appium:appPackage"] = process.env.MOBILE_APP_PACKAGE || "com.android.settings";
      capabilities["appium:appActivity"] = process.env.MOBILE_APP_ACTIVITY || ".Settings";
    }
    capabilities["appium:deviceName"] = process.env.MOBILE_DEVICE_NAME || "Android Emulator";
    capabilities["appium:noReset"] = true;
  } else {
    capabilities["appium:automationName"] = "XCUITest";
    capabilities["appium:deviceName"] = process.env.MOBILE_DEVICE_NAME || "iPhone 15 Pro";
    if (process.env.MOBILE_APP_PATH) {
      capabilities["appium:app"] = process.env.MOBILE_APP_PATH;
    } else {
      capabilities["appium:bundleId"] = process.env.MOBILE_BUNDLE_ID || "com.apple.Preferences";
    }
    if (process.env.MOBILE_PLATFORM_VERSION)
      capabilities["appium:platformVersion"] = process.env.MOBILE_PLATFORM_VERSION;
    capabilities["appium:noReset"] = true;
  }

  const driver = await remote({ hostname: host, port, capabilities, logLevel: "warn" });
  const agent = new MobileAgent({
    driver,
    apiKey:
      process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY || "sk-missing-for-bench-only",
    verbose: false,
  });

  try {
    await agent.startSession();

    // Scenario selection
    const useRN = Boolean(process.env.MOBILE_APP_PATH);
    const instruction = useRN
      ? "tap the login button"
      : platform === "Android"
        ? "open Network & internet"
        : "open Wi-Fi";
    const condition = useRN ? "Home screen is visible" : "Wi-Fi settings are displayed";

    // Warm up
    if (strategy !== "hard") {
      await agent.getCurrentState();
    }

    const runs = parseInt(process.env.BENCH_RUNS || "3", 10);
    let totalMs = 0;

    for (let i = 0; i < runs; i++) {
      const start = Date.now();
      if (strategy === "hard") {
        await agent.execute(instruction);
        await (driver as any).pause(1500);
      } else if (strategy === "uiSettle") {
        await agent.execute(instruction);
        // UI settle waits are applied internally in MobileAgent actions
      } else {
        const passed = await agent.executeAndWait(instruction, condition, {
          timeoutMs: 6000,
          pollMs: 800,
        });
        if (!passed) {
          console.warn(`Run #${i + 1}: oracle did not pass within timeout`);
        }
      }
      const elapsed = Date.now() - start;
      totalMs += elapsed;
      console.log(`Run #${i + 1} [${strategy}] took ${elapsed} ms`);
    }

    console.log(`\nAverage [${strategy}] = ${(totalMs / runs).toFixed(0)} ms over ${runs} run(s)`);

    await agent.stopSession("success");
  } finally {
    await driver.deleteSession();
  }
}

async function main() {
  const strategy = (process.argv[2] as Strategy) || "uiSettle";
  if (!["hard", "uiSettle", "oracle"].includes(strategy)) {
    console.error("Usage: ts-node wait-bench.ts [hard|uiSettle|oracle]");
    process.exit(1);
  }
  await bench(strategy as Strategy);
}

main().catch((e) => {
  console.error("Benchmark failed:", e);
  process.exit(1);
});
