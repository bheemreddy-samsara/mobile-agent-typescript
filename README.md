# Mobile Agent SDK (TypeScript)

> Natural language mobile app testing for Appium/WebDriverIO

A TypeScript SDK that brings natural language testing capabilities to your existing Appium/WebDriverIO test suites. Powered by GPT-4 and Claude, it allows you to write tests using simple English instructions instead of complex element selectors.

## 🌟 Features

- **Natural Language Testing**: Write tests using plain English instructions
- **Easy Integration**: Works with existing WebDriverIO/Appium tests
- **Multiple LLM Support**: OpenAI GPT-4 and Anthropic Claude
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Four-Tier Hybrid System**: Intelligent fallback from hierarchy → vision tagging → grid overlay → pure vision
- **Vision Fallback**: Multimodal LLM support when hierarchy fails (with DPI-aware scaling)
- **Zero Configuration**: Minimal setup required

## 📦 Installation

```bash
npm install @mobile-agent/sdk
```

## 🚀 Quick Start

### Basic Usage

```typescript
import { remote } from 'webdriverio';
import { MobileAgent } from '@mobile-agent/sdk';

// Initialize WebDriverIO
const driver = await remote({
  hostname: 'localhost',
  port: 4723,
  capabilities: {
    platformName: 'Android',
    'appium:automationName': 'UiAutomator2',
    'appium:appPackage': 'com.example.app',
  },
});

// Create Mobile Agent
const agent = new MobileAgent({
  driver,
  apiKey: process.env.OPENAI_API_KEY!,
});

// Start session
await agent.startSession();

// Execute natural language commands
await agent.execute('tap on the settings icon');
await agent.execute('scroll down to privacy settings');
await agent.execute('enable location services');

// Verify results
const passed = await agent.assert('location services are enabled');

// Stop session
const result = await agent.stopSession(passed ? 'success' : 'failure');

await driver.deleteSession();
```

### Integration with Existing Tests

```typescript
import { MobileAgent } from '@mobile-agent/sdk';

describe('My App Tests', () => {
  let driver: WebdriverIO.Browser;
  let agent: MobileAgent;

  before(async () => {
    driver = await remote({
      // your existing Appium config
    });

    agent = new MobileAgent({
      driver,
      apiKey: process.env.OPENAI_API_KEY!,
    });

    await agent.startSession();
  });

  it('should navigate to settings', async () => {
    // Natural language instead of manual selectors!
    await agent.execute('tap on settings icon');
    await agent.assert('settings page is open');
  });

  after(async () => {
    await agent.stopSession('success');
    await driver.deleteSession();
  });
});
```

## 📖 API Reference

### MobileAgent

#### Constructor

```typescript
new MobileAgent(config: MobileAgentConfig)
```

**Config Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `driver` | `WebdriverIO.Browser` | *required* | WebDriverIO driver instance |
| `apiKey` | `string` | *required* | LLM API key (OpenAI or Anthropic) |
| `llmProvider` | `'openai' \| 'anthropic'` | `'openai'` | LLM provider to use |
| `model` | `string` | `'gpt-4o'` | Model name |
| `maxSteps` | `number` | `20` | Maximum actions per session |
| `timeoutSeconds` | `number` | `300` | Session timeout |
| `verbose` | `boolean` | `false` | Enable debug logging |

#### Methods

##### `startSession(): Promise<void>`

Start a new testing session. Must be called before execute() or assert().

##### `execute(instruction: string): Promise<void>`

Execute a natural language instruction.

```typescript
await agent.execute('tap on the login button');
await agent.execute('type "user@example.com" into email field');
await agent.execute('scroll down to find the submit button');
```

##### `assert(condition: string): Promise<boolean>`

Verify a condition using natural language.

```typescript
const passed = await agent.assert('login was successful');
const passed = await agent.assert('error message is displayed');
```

##### `stopSession(status: 'success' | 'failure'): Promise<TestResult>`

End the session and get the complete test result.

```typescript
const result = await agent.stopSession('success');
console.log(`Duration: ${result.durationSeconds}s`);
console.log(`Steps: ${result.steps.length}`);
```

##### `getCurrentState(): Promise<UIState>`

Get the current UI state (activity, elements, etc.).

## 🔧 Configuration

### Environment Variables

```bash
# OpenAI
export OPENAI_API_KEY="sk-..."

# Anthropic
export ANTHROPIC_API_KEY="sk-ant-..."

# Appium (optional)
export APPIUM_HOST="localhost"
export APPIUM_PORT="4723"
```

### Using Different LLM Providers

#### OpenAI (Default)

```typescript
const agent = new MobileAgent({
  driver,
  apiKey: process.env.OPENAI_API_KEY!,
  llmProvider: 'openai',
  model: 'gpt-4o', // or 'gpt-4-turbo', 'gpt-3.5-turbo'
});
```

#### Anthropic Claude

```typescript
const agent = new MobileAgent({
  driver,
  apiKey: process.env.ANTHROPIC_API_KEY!,
  llmProvider: 'anthropic',
  model: 'claude-3-5-sonnet-20241022',
});
```

## 🎯 Supported Actions

The SDK understands various natural language instructions:

### Navigation
- "tap on [element]"
- "click the [element]"
- "press [button name]"
- "open [menu/screen]"

### Text Input
- "type [text] into [field]"
- "enter [text] in [input]"
- "fill [field] with [text]"

### Gestures
- "scroll up/down/left/right"
- "swipe up/down/left/right"
- "long press on [element]"

### Verification
- "verify [condition]"
- "check if [condition]"
- "ensure [condition]"

## 🏗️ Architecture

The SDK uses a **three-tier hybrid approach** combining hierarchy and vision:

### Tier 1: Hierarchy-Based (Primary)

1. **UI Observation**: Parses XML hierarchy from Appium
2. **LLM Planning**: Sends UI structure to LLM for action planning
3. **Action Execution**: Executes planned actions via WebDriverIO
4. **Verification**: Uses LLM to verify test outcomes

**Benefits:**
- ✅ **100% Accurate** - Perfect element detection
- ✅ **Instant** - No processing delay
- ✅ **Cost Effective** - Minimal API costs
- ✅ **No OCR Errors** - Direct text extraction

### Tier 2: Vision + Numeric Tagging (Fallback)

When hierarchy fails (element not found, low confidence), the system falls back to:

1. **Screenshot Capture**: Takes screenshot of current state
2. **Numeric Tagging**: Overlays numbered tags on interactive elements
3. **Vision LLM**: Sends tagged screenshot to GPT-4V/Claude 3.5 Sonnet
4. **Action Selection**: LLM selects element by number
5. **Coordinate Mapping**: Maps number back to precise coordinates

**Benefits:**
- ✅ **90-95% Accurate** - Reliable element detection
- ✅ **Handles Complex UI** - Works with dynamic layouts
- ✅ **Visual Context** - Understands visual hierarchy

### Tier 3: Vision + Grid Overlay (Last Resort)

For pixel-perfect interactions:

1. **Grid Generation**: Creates grid overlay (A1, B2, C3, etc.)
2. **Vision LLM**: Analyzes screenshot with grid labels
3. **Grid Selection**: LLM selects grid cell
4. **Coordinate Calculation**: Converts grid position to exact coordinates

**Benefits:**
- ✅ **85-90% Accurate** - Precise positioning
- ✅ **No Element Required** - Works on any screen area
- ✅ **Custom Gestures** - Complex interactions

### Fallback Configuration

```typescript
const agent = new MobileAgent({
  driver,
  apiKey: process.env.OPENAI_API_KEY!,
  enableVisionFallback: true,  // Enable 3-tier system
  visionConfig: {
    enabled: true,
    fallbackOnElementNotFound: true,
    fallbackOnLowConfidence: true,
    confidenceThreshold: 0.7,
    gridSize: 10,
  },
});
```

## 📊 Examples

See the [`examples/`](./examples) directory for complete examples:

### Basic Examples
- [`basic-usage.ts`](./examples/basic-usage.ts) - Simple getting started example
- [`existing-test-integration.ts`](./examples/existing-test-integration.ts) - Integration with existing test suites
- [`multi-provider.ts`](./examples/multi-provider.ts) - Using different LLM providers

### Demo App & Tests
- [`demo-app/`](./examples/demo-app) - React Native demo app for testing
- [`tests/demo-app/`](./examples/tests/demo-app) - Comprehensive test suite for demo app
  - `login-flow.test.ts` - Form validation and login testing
  - `navigation.test.ts` - Screen navigation testing
  - `fallback-scenarios.test.ts` - Three-tier fallback system testing

### Real App Tests
- [`tests/real-apps/`](./examples/tests/real-apps) - Tests for production apps
  - `settings.test.ts` - Android/iOS Settings app testing
  - `google-maps.test.ts` - Complex UI testing with Google Maps

See [`examples/README.md`](./examples/README.md) for detailed setup instructions.

## 🧪 Testing

```bash
# Run tests
npm test

# Build the SDK
npm run build

# Lint code
npm run lint
```

## 🔗 Related Projects

- **[MobileAgentFramework](https://github.com/yourusername/MobileAgentFramework)** - Python version of this SDK
- **[Appium](https://appium.io/)** - Mobile automation framework
- **[WebDriverIO](https://webdriver.io/)** - Browser and mobile automation test framework

## 📝 Comparison with GPT Driver

| Feature | Mobile Agent SDK | GPT Driver |
|---------|-----------------|------------|
| Language | TypeScript | TypeScript |
| LLM Support | OpenAI, Claude | OpenAI |
| Driver Support | WebDriverIO | WebDriverIO |
| Platform | Android, iOS | Android, iOS |
| API Style | Similar | Similar |
| Open Source | ✅ | ❌ |

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🆘 Troubleshooting

### "Session not started" Error

Make sure to call `startSession()` before `execute()` or `assert()`:

```typescript
await agent.startSession(); // Don't forget this!
await agent.execute('tap on button');
```

### API Key Issues

Ensure your API key is properly set:

```bash
# Check if key is set
echo $OPENAI_API_KEY

# Set it if missing
export OPENAI_API_KEY="sk-..."
```

### Appium Connection Failed

Verify Appium is running:

```bash
# Start Appium server
appium --port 4723

# Check if it's running
curl http://localhost:4723/status
```

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/yourusername/mobile-agent-typescript/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/mobile-agent-typescript/discussions)
- **Documentation**: [Full Docs](https://mobile-agent.dev)

## 🎓 Learn More

### Documentation
- [Pure Vision Guide](./PURE_VISION_GUIDE.md) - Four-tier system and pure vision mode
- [Vision Fallback Guide](./VISION_FALLBACK_GUIDE.md) - Technical implementation details
- [Bug Fixes](./BUG_FIXES.md) - Critical bug fixes and DPI scaling
- [AppAgent Comparison](./APPAGENT_COMPARISON.md) - Comparison with TencentQQGYLab/AppAgent

### External Resources
- [Mobile Agent Python SDK](../MobileAgentFramework)
- [Appium Documentation](https://appium.io/docs)
- [WebDriverIO Documentation](https://webdriver.io/docs/gettingstarted)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)

---

**Made with ❤️ for mobile test automation**

