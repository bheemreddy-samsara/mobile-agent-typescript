/**
 * Android Settings wait benchmark without LLM.
 * Compares: hard sleep vs page-source stability vs deterministic waitForExist
 */
import { remote } from "webdriverio";

async function waitForUiSettle(driver: WebdriverIO.Browser, timeoutMs = 1200, pollMs = 150) {
  const deadline = Date.now() + timeoutMs;
  let last: string | undefined;
  let stable = 0;
  while (Date.now() < deadline) {
    try {
      const src = await driver.getPageSource();
      if (last !== undefined && src === last) {
        stable++;
        if (stable >= 2) return true;
      } else {
        stable = 0;
        last = src;
      }
    } catch {
      /* ignore transient source errors */
    }
    await driver.pause(pollMs);
  }
  return false;
}

async function bench() {
  const host = process.env.APPIUM_HOST || "localhost";
  const port = parseInt(process.env.APPIUM_PORT || "4723", 10);

  const capabilities: any = {
    platformName: "Android",
    "appium:automationName": "UiAutomator2",
    "appium:deviceName": process.env.MOBILE_DEVICE_NAME || "Android Emulator",
    "appium:noReset": true,
  };

  const driver = await remote({ hostname: host, port, capabilities, logLevel: "warn" });
  try {
    const runs = parseInt(process.env.BENCH_RUNS || "3", 10);
    const results: Record<string, number[]> = { hard: [], settle: [], exists: [] };

    // Ensure we are on top-level of Settings
    try {
      await (driver as any).startActivity(
        process.env.MOBILE_APP_PACKAGE || "com.android.settings",
        process.env.MOBILE_APP_ACTIVITY || ".Settings",
      );
    } catch {
      await (driver as any).activateApp(process.env.MOBILE_APP_PACKAGE || "com.android.settings");
    }
    await driver.pause(800);

    for (const strategy of ["hard", "settle", "exists"] as const) {
      for (let i = 0; i < runs; i++) {
        // Relaunch Settings main screen each iteration for consistency
        try {
          await (driver as any).startActivity(
            process.env.MOBILE_APP_PACKAGE || "com.android.settings",
            process.env.MOBILE_APP_ACTIVITY || ".Settings",
          );
        } catch {
          /* best-effort */
        }
        await driver.pause(500);

        const start = Date.now();
        // Tap "Network & internet" (case-insensitive)
        const item = await driver.$(
          'android=new UiSelector().textMatches("(?i)network\\s*&\\s*internet")',
        );
        await item.waitForExist({ timeout: 5000 });
        await item.click();

        if (strategy === "hard") {
          await driver.pause(1500);
        } else if (strategy === "settle") {
          await waitForUiSettle(driver, 1500, 150);
        } else {
          const locator =
            'android=new UiSelector().textMatches("(?i)(Wi-?Fi|Internet|Network\\s*&\\s*internet)")';
          const el = await driver.$(locator);
          await el.waitForExist({ timeout: 5000 });
        }

        const elapsed = Date.now() - start;
        results[strategy].push(elapsed);
        console.log(`Run #${i + 1} [${strategy}] ${elapsed} ms`);
      }
    }

    const avg = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length || 0;
    console.log("\nAverages (ms):", {
      hard: Math.round(avg(results.hard)),
      settle: Math.round(avg(results.settle)),
      exists: Math.round(avg(results.exists)),
    });
  } finally {
    await driver.deleteSession();
  }
}

bench().catch((e) => {
  console.error("Benchmark failed:", e);
  process.exit(1);
});
