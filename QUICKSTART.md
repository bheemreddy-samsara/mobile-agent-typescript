# Quick Start Guide

Get started with Mobile Agent SDK in 5 minutes!

## 📋 Prerequisites

Before you begin, ensure you have:

- ✅ Node.js 18+ installed
- ✅ Appium server running
- ✅ Android device/emulator or iOS simulator
- ✅ OpenAI or Anthropic API key

## 🎯 Step 1: Install Dependencies

```bash
# Install the SDK
npm install @mobile-agent/sdk

# Install Appium client (if not already installed)
npm install webdriverio
```

## 🔑 Step 2: Set Up API Key

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# OR Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."
```

## 🚀 Step 3: Start Appium Server

```bash
# In a separate terminal
appium --port 4723
```

## 💻 Step 4: Write Your First Test

Create `test.ts`:

```typescript
import { remote } from 'webdriverio';
import { MobileAgent } from '@mobile-agent/sdk';

async function firstTest() {
  // 1. Connect to Appium
  const driver = await remote({
    hostname: 'localhost',
    port: 4723,
    capabilities: {
      platformName: 'Android',
      'appium:automationName': 'UiAutomator2',
      'appium:appPackage': 'com.android.settings',
      'appium:appActivity': '.Settings',
    },
  });

  // 2. Create agent
  const agent = new MobileAgent({
    driver,
    apiKey: process.env.OPENAI_API_KEY!,
    verbose: true,
  });

  // 3. Start session
  await agent.startSession();

  // 4. Execute commands
  await agent.execute('tap on Network & internet');
  
  // 5. Verify
  const passed = await agent.assert('network settings page is open');

  // 6. Stop session
  await agent.stopSession(passed ? 'success' : 'failure');
  
  // 7. Cleanup
  await driver.deleteSession();
}

firstTest().catch(console.error);
```

## ▶️ Step 5: Run Your Test

```bash
npx ts-node test.ts
```

## 🎉 That's It!

You should see output like:

```
[INFO] MobileAgent initialized
[INFO] Starting test session
[INFO] Session started on activity: .Settings
[INFO] Executing: tap on Network & internet
[INFO] Action executed: Clicking on network settings button
[INFO] Verifying: network settings page is open
[INFO] ✓ Assertion passed
[INFO] Session completed in 8.5s
```

## 🔍 What's Next?

### Try More Complex Tests

```typescript
// Multiple actions
await agent.execute('scroll down to find developer options');
await agent.execute('tap on developer options');
await agent.execute('enable USB debugging');

// Verify multiple conditions
await agent.assert('USB debugging is enabled');
await agent.assert('developer options menu is visible');
```

### Integrate with Your Test Suite

```typescript
describe('Settings Tests', () => {
  let agent: MobileAgent;

  before(async () => {
    const driver = await remote({ /* config */ });
    agent = new MobileAgent({ driver, apiKey: '...' });
    await agent.startSession();
  });

  it('should enable WiFi', async () => {
    await agent.execute('tap on WiFi');
    await agent.execute('toggle WiFi on');
    await agent.assert('WiFi is enabled');
  });

  after(async () => {
    await agent.stopSession('success');
  });
});
```

### Use Different LLM Providers

```typescript
// OpenAI GPT-4
const agent = new MobileAgent({
  driver,
  apiKey: process.env.OPENAI_API_KEY!,
  llmProvider: 'openai',
  model: 'gpt-4o',
});

// Anthropic Claude
const agent = new MobileAgent({
  driver,
  apiKey: process.env.ANTHROPIC_API_KEY!,
  llmProvider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
});
```

## 🐛 Troubleshooting

### "Cannot find module '@mobile-agent/sdk'"

```bash
npm install @mobile-agent/sdk
```

### "OPENAI_API_KEY not set"

```bash
export OPENAI_API_KEY="your-key-here"
```

### "Connection refused to localhost:4723"

Make sure Appium is running:

```bash
appium --port 4723
```

### "No devices found"

Start an Android emulator or connect a device:

```bash
# List available emulators
emulator -list-avds

# Start an emulator
emulator -avd Pixel_5_API_33
```

## 📚 Learn More

- [Full README](./README.md) - Complete documentation
- [API Reference](./README.md#-api-reference) - Detailed API docs
- [Examples](./examples/) - More example code
- [Contributing](./CONTRIBUTING.md) - How to contribute

## 💬 Get Help

- [GitHub Issues](https://github.com/yourusername/mobile-agent-typescript/issues)
- [Discussions](https://github.com/yourusername/mobile-agent-typescript/discussions)

---

Happy Testing! 🚀

