/**
 * Test Helper Utilities
 */

import { remote, Browser } from 'webdriverio';
import { MobileAgent } from '../../../src';

export interface TestConfig {
  platform: 'Android' | 'iOS';
  appPath?: string;
  appPackage?: string;
  appActivity?: string;
  bundleId?: string;
  deviceName?: string;
  platformVersion?: string;
}

/**
 * Initialize WebDriverIO driver with Appium
 */
export async function initializeDriver(config: TestConfig): Promise<Browser> {
  const capabilities: any = {
    platformName: config.platform,
    'appium:deviceName': config.deviceName || (config.platform === 'Android' ? 'Android Emulator' : 'iPhone 15 Pro'),
    'appium:automationName': config.platform === 'Android' ? 'UiAutomator2' : 'XCUITest',
  };

  if (config.platform === 'Android') {
    if (config.appPath) {
      capabilities['appium:app'] = config.appPath;
    }
    if (config.appPackage) {
      capabilities['appium:appPackage'] = config.appPackage;
    }
    if (config.appActivity) {
      capabilities['appium:appActivity'] = config.appActivity;
    }
  } else {
    if (config.appPath) {
      capabilities['appium:app'] = config.appPath;
    }
    if (config.bundleId) {
      capabilities['appium:bundleId'] = config.bundleId;
    }
    if (config.platformVersion) {
      capabilities['appium:platformVersion'] = config.platformVersion;
    }
  }

  const driver = await remote({
    hostname: process.env.APPIUM_HOST || 'localhost',
    port: parseInt(process.env.APPIUM_PORT || '4723', 10),
    logLevel: 'warn',
    capabilities,
  });

  return driver;
}

/**
 * Initialize Mobile Agent with driver
 */
export function initializeMobileAgent(
  driver: Browser,
  options: {
    llmProvider?: 'openai' | 'anthropic';
    enableVisionFallback?: boolean;
    verbose?: boolean;
  } = {}
): MobileAgent {
  const apiKey = options.llmProvider === 'anthropic' 
    ? process.env.ANTHROPIC_API_KEY!
    : process.env.OPENAI_API_KEY!;

  return new MobileAgent({
    driver,
    apiKey,
    llmProvider: options.llmProvider || 'openai',
    verbose: options.verbose !== undefined ? options.verbose : true,
    enableVisionFallback: options.enableVisionFallback !== undefined ? options.enableVisionFallback : true,
    visionConfig: {
      enabled: true,
      fallbackOnElementNotFound: true,
      fallbackOnLowConfidence: true,
      confidenceThreshold: 0.7,
      gridSize: 10,
    },
  });
}

/**
 * Wait for a specified time
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function multiple times
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  delayMs: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (attempt < maxAttempts) {
        console.log(`Attempt ${attempt} failed, retrying in ${delayMs}ms...`);
        await wait(delayMs);
      }
    }
  }

  throw lastError || new Error('All attempts failed');
}

