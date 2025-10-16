/**
 * Demo App - Navigation Test
 */

import { Browser } from 'webdriverio';
import { initializeDriver, initializeMobileAgent, wait } from '../utils/testHelpers';
import { androidDemoAppConfig } from '../config/android.config';
import { MobileAgent } from '../../../src';

describe('Demo App - Navigation', () => {
  let driver: Browser;
  let agent: MobileAgent;

  beforeAll(async () => {
    driver = await initializeDriver(androidDemoAppConfig);
    agent = initializeMobileAgent(driver, { verbose: true });
  }, 60000);

  afterAll(async () => {
    if (driver) {
      await driver.deleteSession();
    }
  }, 30000);

  it('should navigate from login to home screen', async () => {
    await agent.startSession();

    // Login first
    await agent.execute('type "user@test.com" in email field');
    await agent.execute('type "testpass" in password field');
    await agent.execute('tap Login button');

    await wait(1000);

    const passed = await agent.assert('home screen is visible with user@test.com');
    expect(passed).toBe(true);

    await agent.stopSession('success');
  }, 120000);

  it('should open settings from home screen', async () => {
    await agent.startSession();

    // Login first
    await agent.execute('type "user@test.com" in email field');
    await agent.execute('type "testpass" in password field');
    await agent.execute('tap Login button');

    await wait(1000);

    // Tap settings
    await agent.execute('tap on Settings button');

    const passed = await agent.assert('settings dialog or alert is displayed');
    expect(passed).toBe(true);

    await agent.stopSession('success');
  }, 120000);

  it('should logout and return to login screen', async () => {
    await agent.startSession();

    // Login first
    await agent.execute('type "user@test.com" in email field');
    await agent.execute('type "testpass" in password field');
    await agent.execute('tap Login button');

    await wait(1000);

    // Logout
    await agent.execute('tap on Logout button');
    await agent.execute('confirm logout in the dialog');

    await wait(500);

    const passed = await agent.assert('login screen is displayed');
    expect(passed).toBe(true);

    await agent.stopSession('success');
  }, 120000);
});

