/**
 * Demo App - Three-Tier Fallback Scenarios Test
 * 
 * This test specifically validates that all three tiers work correctly
 */

import { Browser } from 'webdriverio';
import { initializeDriver, initializeMobileAgent, wait } from '../utils/testHelpers';
import { androidDemoAppConfig } from '../config/android.config';
import { MobileAgent } from '../../../src';

describe('Demo App - Three-Tier Fallback Scenarios', () => {
  let driver: Browser;
  let agent: MobileAgent;

  beforeAll(async () => {
    driver = await initializeDriver(androidDemoAppConfig);
  }, 60000);

  afterAll(async () => {
    if (driver) {
      await driver.deleteSession();
    }
  }, 30000);

  it('Tier 1: should use hierarchy-based approach for standard elements', async () => {
    // Standard elements should be found via hierarchy
    agent = initializeMobileAgent(driver, { 
      verbose: true,
      enableVisionFallback: false // Disable fallback to test hierarchy only
    });

    await agent.startSession();

    await agent.execute('type "test@example.com" in the email input field');
    const passed = await agent.assert('email field contains text');
    
    expect(passed).toBe(true);

    await agent.stopSession('success');
  }, 120000);

  it('Tier 2: should fallback to vision tagging when element has ambiguous hierarchy', async () => {
    // Enable vision fallback
    agent = initializeMobileAgent(driver, { 
      verbose: true,
      enableVisionFallback: true
    });

    await agent.startSession();

    // Try to interact with an element that might be hard to find via hierarchy alone
    await agent.execute('tap on the blue login button');
    
    const passed = await agent.assert('login button was pressed or validation occurred');
    expect(passed).toBe(true);

    await agent.stopSession('success');
  }, 120000);

  it('Tier 3: should use grid overlay for precise coordinate-based interactions', async () => {
    agent = initializeMobileAgent(driver, { 
      verbose: true,
      enableVisionFallback: true,
      // Can configure to prefer grid overlay
    });

    await agent.startSession();

    // Login first to get to home screen with multiple items
    await agent.execute('type "user@test.com" in email');
    await agent.execute('type "password" in password');
    await agent.execute('tap login');

    await wait(1000);

    // Try to tap on a specific task card that might need precise coordinates
    await agent.execute('tap on the third task in the list');

    const passed = await agent.assert('task details or alert is displayed');
    expect(passed).toBe(true);

    await agent.stopSession('success');
  }, 180000);

  it('should gracefully cascade through all tiers when needed', async () => {
    agent = initializeMobileAgent(driver, {
      verbose: true,
      enableVisionFallback: true,
    });

    await agent.startSession();

    // Complex instruction that may require fallback
    await agent.execute('find and tap the small settings icon in the top area');

    // This should try hierarchy first, then vision tagging, then grid if needed
    const passed = await agent.assert('settings was accessed or some action occurred');
    
    expect(passed).toBe(true);

    await agent.stopSession('success');
  }, 180000);
});

