/**
 * Demo App - Login Flow Test
 */

import { Browser } from 'webdriverio';
import { initializeDriver, initializeMobileAgent, wait } from '../utils/testHelpers';
import { androidDemoAppConfig } from '../config/android.config';
import { MobileAgent } from '../../../src';

describe('Demo App - Login Flow', () => {
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

  it('should display validation error for invalid email', async () => {
    await agent.startSession();

    await agent.execute('type "invalid-email" in the email field');
    await agent.execute('type "password123" in the password field');
    await agent.execute('tap on Login button');

    const passed = await agent.assert('error message about invalid email is displayed');
    expect(passed).toBe(true);

    await agent.stopSession('success');
  }, 120000);

  it('should display validation error for short password', async () => {
    await agent.startSession();

    await agent.execute('type "test@example.com" in the email field');
    await agent.execute('type "12" in the password field');
    await agent.execute('tap on Login button');

    const passed = await agent.assert('error message about password length is displayed');
    expect(passed).toBe(true);

    await agent.stopSession('success');
  }, 120000);

  it('should successfully login with valid credentials', async () => {
    await agent.startSession();

    await agent.execute('type "test@example.com" in the email field');
    await agent.execute('type "password123" in the password field');
    await agent.execute('tap on Login button');

    // Wait for navigation
    await wait(1000);

    const passed = await agent.assert('home screen is displayed with welcome message');
    expect(passed).toBe(true);

    await agent.stopSession('success');
  }, 120000);

  it('should show forgot password dialog', async () => {
    await agent.startSession();

    await agent.execute('tap on Forgot Password link');

    const passed = await agent.assert('forgot password dialog or alert is displayed');
    expect(passed).toBe(true);

    await agent.stopSession('success');
  }, 120000);
});

