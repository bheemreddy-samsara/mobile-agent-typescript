/**
 * Sample RN app wait benchmark without LLM.
 * Compares: hard sleep vs page-source stability vs deterministic waitForExist.
 * Uses the included example APK by default.
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
  const path = await import("node:path");
  const apkRel =
    process.env.MOBILE_APP_PATH ||
    "examples/sample-rn-app/android/app/build/outputs/apk/release/app-release.apk";
  const apk = path.resolve(process.cwd(), apkRel);

  const capabilities: any = {
    platformName: "Android",
    "appium:automationName": "UiAutomator2",
    "appium:deviceName": process.env.MOBILE_DEVICE_NAME || "Android Emulator",
    "appium:app": apk,
    "appium:noReset": true,
    "appium:newCommandTimeout": 120,
  };

  const driver = await remote({ hostname: host, port, capabilities, logLevel: "warn" });
  try {
    const runs = parseInt(process.env.BENCH_RUNS || "3", 10);
    const results: Record<string, number[]> = { hard: [], settle: [], exists: [] };

    for (const strategy of ["hard", "settle", "exists"] as const) {
      for (let i = 0; i < runs; i++) {
        // Relaunch main activity to reset to login screen (best-effort)
        try {
          await (driver as any).startActivity("com.sample.rnapp", ".MainActivity");
        } catch {
          await (driver as any).activateApp("com.sample.rnapp");
        }
        await driver.pause(800);

        const start = Date.now();
        // Tap login via accessibility id
        const login = await driver.$("~login-button");
        await login.waitForExist({ timeout: 5000 });
        await login.click();

        if (strategy === "hard") {
          await driver.pause(1500);
        } else if (strategy === "settle") {
          await waitForUiSettle(driver, 1500, 150);
        } else {
          // Deterministic post-condition: logout button appears or Home text present
          const logout = await driver.$("~logout-button");
          try {
            await logout.waitForExist({ timeout: 5000 });
          } catch {
            const homeText = await driver.$('android=new UiSelector().textContains("Home")');
            await homeText.waitForExist({ timeout: 5000 });
          }
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
