# Mobile Agent SDK Examples

This directory contains comprehensive examples demonstrating the Mobile Agent SDK's three-tier vision fallback system.

## 📁 Directory Structure

```
examples/
├── demo-app/              # React Native demo application
│   ├── screens/           # Login and Home screens
│   ├── App.tsx           # Navigation setup
│   └── README.md         # Setup instructions
│
├── tests/                # Test examples
│   ├── config/           # Appium configurations
│   │   ├── android.config.ts
│   │   └── ios.config.ts
│   ├── utils/            # Test utilities
│   │   └── testHelpers.ts
│   ├── real-apps/        # Tests for real applications
│   │   ├── settings.test.ts
│   │   └── google-maps.test.ts
│   └── demo-app/         # Tests for the demo app
│       ├── login-flow.test.ts
│       ├── navigation.test.ts
│       └── fallback-scenarios.test.ts
│
├── basic-usage.ts        # Simple getting started example
├── existing-test-integration.ts  # Integration example
└── multi-provider.ts     # Multiple LLM providers example
```

## 🚀 Quick Start

### Prerequisites

1. **Node.js 18+** and npm
2. **Appium Server** installed globally:
   ```bash
   npm install -g appium
   appium driver install uiautomator2  # For Android
   appium driver install xcuitest      # For iOS
   ```

3. **Android/iOS Setup**:
   - Android: Android Studio with emulator or physical device
   - iOS: Xcode with simulator (macOS only)

4. **API Keys**:
   ```bash
   export OPENAI_API_KEY="sk-..."
   # or
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```

### Running Examples

#### 1. Basic Usage Example (Android)

```bash
# Start Appium server
appium --port 4723

# In another terminal
cd examples
npx ts-node basic-usage.ts
```

#### 1b. Basic Usage Example (iOS)

```bash
# Start Appium server
appium --port 4723

# Boot a simulator (if not already booted)
xcrun simctl list devices | grep Booted || xcrun simctl boot "iPhone 15"

# In another terminal
cd examples
# Optional overrides:
# export MOBILE_DEVICE_NAME="iPhone 15"
# export MOBILE_BUNDLE_ID="com.apple.Preferences"
npx ts-node basic-usage.ios.ts
```

#### 2. Demo App APK (Android)

If you have the Android native project under `examples/demo-app/android` (gradle wrapper present), you can build the APK via:

```bash
npm run build:demo:android
```

The APK is expected at:

```
examples/demo-app/android/app/build/outputs/apk/debug/app-debug.apk
```

Then run the connectivity test against the APK (no LLM required):

```bash
export MOBILE_APP_PATH="$PWD/examples/demo-app/android/app/build/outputs/apk/debug/app-debug.apk"
npx ts-node examples/connectivity-android.ts
```

If the Android project is not present, follow `examples/demo-app/README.md` for setup, or point `MOBILE_APP_PATH` to any existing APK.

#### 3. Demo App Tests

First, set up the demo app (see [demo-app/README.md](./demo-app/README.md)):

```bash
cd demo-app
npm install

# For Android
npm run android

# For iOS (macOS only)
npm run ios
```

Then run tests:

```bash
cd ../..
npm test -- examples/tests/demo-app/
```

#### 4. Real App Tests

```bash
# Ensure the app is installed on your device/emulator
# For Settings app (pre-installed on Android/iOS)
npm test -- examples/tests/real-apps/settings.test.ts

# For Google Maps (must be installed)
npm test -- examples/tests/real-apps/google-maps.test.ts
```

## 🎯 Three-Tier Fallback System

The examples demonstrate the three-tier fallback approach:

### Tier 1: Hierarchy-Based (Default)
- **Speed**: Instant
- **Accuracy**: 100%
- **Cost**: Low
- **Use Case**: Standard UI elements with clear hierarchy

```typescript
// Uses XML hierarchy parsing
await agent.execute('tap on Network & internet');
```

### Tier 2: Vision + Numeric Tagging (Fallback)
- **Speed**: 2-3 seconds
- **Accuracy**: 90-95%
- **Cost**: Medium
- **Use Case**: Elements not found in hierarchy

```typescript
// Overlays numbered tags on screenshot, LLM selects by number
await agent.execute('tap on the blue login button');
```

### Tier 3: Vision + Grid Overlay (Last Resort)
- **Speed**: 2-3 seconds
- **Accuracy**: 85-90%
- **Cost**: Medium
- **Use Case**: Precise coordinate-based interactions

```typescript
// Creates grid overlay (A1, B2, C3, etc.), LLM selects grid position
await agent.execute('tap on the third task in the list');
```

## 📊 Example Test Scenarios

### Demo App Tests

| Test | Tier Used | Description |
|------|-----------|-------------|
| `login-flow.test.ts` | Tier 1 | Standard form validation |
| `navigation.test.ts` | Tier 1-2 | Screen navigation, button clicks |
| `fallback-scenarios.test.ts` | All 3 | Comprehensive fallback testing |

### Real App Tests

| Test | Tier Used | Description |
|------|-----------|-------------|
| `settings.test.ts` | Tier 1-2 | Settings navigation with fallback |
| `google-maps.test.ts` | Tier 2-3 | Complex UI requiring vision |

## 🔧 Configuration

### Customizing Vision Fallback

```typescript
const agent = new MobileAgent({
  driver,
  apiKey: process.env.OPENAI_API_KEY!,
  enableVisionFallback: true,
  visionConfig: {
    enabled: true,
    fallbackOnElementNotFound: true,
    fallbackOnLowConfidence: true,
    confidenceThreshold: 0.7,
    gridSize: 10,
    alwaysUseVision: false,
  },
});
```

### Test Configuration

Edit `examples/tests/config/*.config.ts` to customize:
- Device names
- App paths
- Platform versions
- Capabilities

## 📝 Writing Your Own Tests

### 1. Create Test File

```typescript
import { Browser } from 'webdriverio';
import { initializeDriver, initializeMobileAgent } from '../utils/testHelpers';

describe('My App Test', () => {
  let driver: Browser;
  let agent: MobileAgent;

  beforeAll(async () => {
    driver = await initializeDriver({
      platform: 'Android',
      appPackage: 'com.myapp',
      appActivity: '.MainActivity',
    });
    agent = initializeMobileAgent(driver);
  });

  afterAll(async () => {
    await driver.deleteSession();
  });

  it('should perform action', async () => {
    await agent.startSession();
    await agent.execute('tap on button');
    const passed = await agent.assert('action succeeded');
    expect(passed).toBe(true);
    await agent.stopSession('success');
  });
});
```

### 2. Run Your Test

```bash
npm test -- path/to/your-test.test.ts
```

## 🐛 Troubleshooting

### Appium Connection Issues

```bash
# Check if Appium is running
curl http://localhost:4723/status

# Restart Appium
pkill -f appium
appium --port 4723
```

### Vision Fallback Not Working

1. Ensure API keys are set
2. Check model supports vision (GPT-4o, Claude 3.5 Sonnet)
3. Enable verbose logging:
   ```typescript
   const agent = new MobileAgent({
     ...config,
     verbose: true,
   });
   ```

### Tests Timing Out

- Increase Jest timeout: `jest.setTimeout(180000)`
- Add waits between actions: `await wait(1000)`
- Check device performance

## 📚 Additional Resources

- [Main README](../README.md) - SDK overview
- [Demo App Guide](./demo-app/README.md) - Demo app setup
- [API Reference](../README.md#api-reference) - Complete API docs

## 🤝 Contributing

Feel free to add more examples or test scenarios! See [CONTRIBUTING.md](../CONTRIBUTING.md).

## 📄 License

MIT - See [LICENSE](../LICENSE) for details.
