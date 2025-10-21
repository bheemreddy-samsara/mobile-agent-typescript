/**
 * Settings App Test - Demonstrates Three-Tier Vision Fallback
 */

import type { Browser } from "webdriverio";
import type { MobileAgent } from "../../../src";
import { androidSettingsConfig } from "../config/android.config";
import { initializeDriver, initializeMobileAgent } from "../utils/testHelpers";

describe("Settings App - Three-Tier Fallback", () => {
  let driver: Browser;
  let agent: MobileAgent;

  beforeAll(async () => {
    driver = await initializeDriver(androidSettingsConfig);
    agent = initializeMobileAgent(driver, { verbose: true });
  }, 60000);

  afterAll(async () => {
    if (driver) {
      await driver.deleteSession();
    }
  }, 30000);

  it("should navigate to WiFi settings using hierarchy (Tier 1)", async () => {
    await agent.startSession();

    // This should use hierarchy-based approach
    await agent.execute("tap on Network & internet");
    await agent.execute("tap on Wi-Fi");

    const passed = await agent.assert("WiFi settings page is displayed");
    expect(passed).toBe(true);

    await agent.stopSession("success");
  }, 120000);

  it("should navigate to Bluetooth settings demonstrating fallback", async () => {
    await agent.startSession();

    // Navigate to Bluetooth (may trigger vision fallback if element not found)
    await agent.execute("open Bluetooth settings");

    const passed = await agent.assert("Bluetooth page is visible");
    expect(passed).toBe(true);

    await agent.stopSession("success");
  }, 120000);

  it("should search in settings using vision fallback", async () => {
    await agent.startSession();

    // Search functionality might require vision fallback
    await agent.execute("tap on the search icon");
    await agent.execute('type "Display" in the search field');

    const passed = await agent.assert("search results for Display are shown");
    expect(passed).toBe(true);

    await agent.stopSession("success");
  }, 120000);
});
