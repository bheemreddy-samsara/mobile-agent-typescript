/**
 * Tests for gesture actions (double tap, pinch, zoom)
 */

import { MobileAgent } from '../src/MobileAgent';
import { ActionType } from '../src/types';

const makeAgent = () => {
  const driver: any = {
    getPageSource: jest.fn().mockResolvedValue('<hierarchy></hierarchy>'),
    getCurrentActivity: jest.fn().mockResolvedValue('Main'),
    capabilities: { platformName: 'Android' },
    getWindowSize: jest.fn().mockResolvedValue({ width: 400, height: 800 }),
    takeScreenshot: jest.fn().mockResolvedValue('iVBORw0KGgo='),
    touchAction: jest.fn().mockResolvedValue(undefined),
    performActions: jest.fn().mockResolvedValue(undefined),
    releaseActions: jest.fn().mockResolvedValue(undefined),
    pause: jest.fn().mockResolvedValue(undefined),
  };

  const agent = new MobileAgent({ driver, apiKey: 'test-key' });
  return { agent: agent as any, driver };
};

describe('Gesture actions', () => {
  it('double tap uses two taps', async () => {
    const { agent, driver } = makeAgent();
    await agent.startSession();
    const step = await agent.executeAction(ActionType.DOUBLE_TAP, undefined, { coordinates: { x: 100, y: 200 } });
    expect(driver.touchAction).toHaveBeenCalledTimes(2);
    expect(step.success).toBe(true);
  });

  it('pinch uses performActions', async () => {
    const { agent, driver } = makeAgent();
    await agent.startSession();
    const step = await agent.executeAction(ActionType.PINCH, undefined, { coordinates: { x: 150, y: 250 } });
    expect(driver.performActions).toHaveBeenCalled();
    expect(driver.releaseActions).toHaveBeenCalled();
    expect(step.success).toBe(true);
  });

  it('zoom uses performActions', async () => {
    const { agent, driver } = makeAgent();
    await agent.startSession();
    const step = await agent.executeAction(ActionType.ZOOM, undefined, { coordinates: { x: 150, y: 250 } });
    expect(driver.performActions).toHaveBeenCalled();
    expect(driver.releaseActions).toHaveBeenCalled();
    expect(step.success).toBe(true);
  });
});

