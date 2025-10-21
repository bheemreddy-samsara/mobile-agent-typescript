// Minimal ambient declarations so this example compiles without Mocha types
// Remove these if you add @types/mocha and run under Mocha
declare const describe: (name: string, fn: () => void) => void;
declare const it: (name: string, fn: (this: any) => Promise<void> | void) => void;
declare const before: (fn: (this: any) => Promise<void> | void) => void;
declare const after: (fn: (this: any) => Promise<void> | void) => void;

/**
 * Example: Integrating with existing Appium test suites
 * 
 * This shows how to add Mobile Agent to your existing WebDriverIO/Appium tests
 */

import { remote } from 'webdriverio';
import { MobileAgent } from '../src';

// Example using a test framework like Mocha/Jest
describe('My App Tests with Mobile Agent', () => {
  let driver: WebdriverIO.Browser;
  let agent: MobileAgent;

  // Use classic function with an explicit `this` annotation to satisfy TS
  before(async function (this: any) {
    this.timeout(60000);

    // Your existing WebDriverIO setup
    driver = await remote({
      hostname: 'localhost',
      port: 4723,
      capabilities: {
        platformName: 'Android',
        'appium:automationName': 'UiAutomator2',
        'appium:deviceName': 'Android Emulator',
        'appium:appPackage': 'com.example.myapp',
        'appium:appActivity': '.MainActivity',
      },
    });

    // Initialize Mobile Agent with your existing driver
    agent = new MobileAgent({
      driver,
      apiKey: process.env.OPENAI_API_KEY!,
      llmProvider: 'openai',
      model: 'gpt-4o',
    });

    await agent.startSession();
  });

  it('should navigate to settings using natural language', async function (this: any) {
    this.timeout(30000);

    // Use natural language instead of manual element selectors
    await agent.execute('tap on the settings icon in the bottom navigation');
    
    // Verify with natural language
    const passed = await agent.assert('settings page is visible');
    
    if (!passed) {
      throw new Error('Settings page not found');
    }
  });

  it('should enable dark mode', async function (this: any) {
    this.timeout(30000);

    await agent.execute('scroll down to find dark mode toggle');
    await agent.execute('tap on the dark mode switch to enable it');
    await agent.assert('dark mode is enabled');
  });

  it('can mix manual and AI-driven actions', async function (this: any) {
    this.timeout(30000);

    // Manual WebDriverIO action
    const backButton = await driver.$('~Navigate up');
    await backButton.click();

    // AI-driven action
    await agent.execute('tap on the profile icon');
    await agent.assert('user profile is displayed');
  });

  after(async function (this: any) {
    this.timeout(10000);

    // Stop agent session
    await agent.stopSession('success');

    // Clean up driver
    await driver.deleteSession();
  });
});

// Run standalone (without test framework)
async function runStandalone() {
  const driver = await remote({
    hostname: 'localhost',
    port: 4723,
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:appPackage': 'com.example.app',
    },
  });

  const agent = new MobileAgent({
    driver,
    apiKey: process.env.OPENAI_API_KEY!,
  });

  try {
    await agent.startSession();
    
    await agent.execute('tap on youtube');
    await agent.assert('the youtube app is open');
    
    const result = await agent.stopSession('success');
    console.log('Test result:', result);
  } finally {
    await driver.deleteSession();
  }
}

// Uncomment to run standalone
// runStandalone().catch(console.error);
