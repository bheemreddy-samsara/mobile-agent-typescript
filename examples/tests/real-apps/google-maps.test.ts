/**
 * Google Maps Test - Complex UI Testing with Vision Fallback
 * 
 * This test demonstrates the three-tier approach on a complex, dynamic UI
 * where vision-based methods may be needed for map-based interactions
 */

import { Browser } from 'webdriverio';
import { initializeDriver, initializeMobileAgent, wait } from '../utils/testHelpers';
import { androidGoogleMapsConfig } from '../config/android.config';
import { MobileAgent } from '../../../src';

describe('Google Maps - Three-Tier Fallback Demo', () => {
  let driver: Browser;
  let agent: MobileAgent;

  beforeAll(async () => {
    driver = await initializeDriver(androidGoogleMapsConfig);
    agent = initializeMobileAgent(driver, { verbose: true });
  }, 60000);

  afterAll(async () => {
    if (driver) {
      await driver.deleteSession();
    }
  }, 30000);

  it('should search for a location', async () => {
    await agent.startSession();

    // Wait for app to load
    await wait(3000);

    // Search for a location
    await agent.execute('tap on the search box');
    await agent.execute('type "Eiffel Tower" in search');
    await agent.execute('press enter or search button');

    // Wait for results
    await wait(2000);

    const passed = await agent.assert('Eiffel Tower is displayed on the map or in results');
    expect(passed).toBe(true);

    await agent.stopSession('success');
  }, 180000);

  it('should get directions between two locations', async () => {
    await agent.startSession();

    await wait(3000);

    // Open directions
    await agent.execute('tap on directions button');
    await agent.execute('type "Paris" in starting point');
    await agent.execute('type "Lyon" in destination');
    await agent.execute('start navigation or show routes');

    const passed = await agent.assert('route directions are displayed');
    expect(passed).toBe(true);

    await agent.stopSession('success');
  }, 180000);

  it('should switch map view (demonstrates grid overlay fallback)', async () => {
    await agent.startSession();

    await wait(3000);

    // Switching map layers often requires vision as the UI varies
    await agent.execute('tap on layers or map type button');
    await agent.execute('select satellite view');

    const passed = await agent.assert('satellite view is active');
    expect(passed).toBe(true);

    await agent.stopSession('success');
  }, 180000);
});

