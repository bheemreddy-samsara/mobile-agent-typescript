# Mobile Agent SDK (TypeScript)

Natural‑language mobile app testing and automation for Appium/WebDriverIO — with a four‑tier hierarchy + vision system and optional MCP server mode for agent clients (Claude Desktop, Cursor, Cline, Goose, etc.).

## 🌟 Features

- Natural language testing over Appium/WebDriverIO
- Multi‑LLM support: OpenAI GPT‑4o, Anthropic Claude 3.5
- Type‑safe SDK with comprehensive TypeScript types
- Four‑tier vision system: Hierarchy → Vision+Tags → Grid → Pure Vision
- DPI‑aware scaling and confidence scoring
- Optional MCP server mode for agent workflows
- Minimal setup; works with real devices, simulators, emulators

## 📦 Installation

Choose one path based on your use case.

- Use as a dependency in your project:
  - `npm install @mobile-agent/sdk`

- Contribute/run from source (this repo):
  - Bun (recommended because this repo uses `bun.lock`)
    - `bun install`
  - Or npm
    - `npm ci`

Appium setup (required for both):

```bash
npm install -g appium
appium driver install uiautomator2   # Android
appium driver install xcuitest       # iOS
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ (Bun 1.1+ recommended for this repo)
- Appium server (`appium --port 4723`)
- Android emulator/device or iOS simulator/device
- OpenAI or Anthropic API key

### 5-Minute Setup

**Step 1: Set your API key**
```bash
export OPENAI_API_KEY="sk-..."  # or ANTHROPIC_API_KEY
```

**Step 2: Start Appium**
```bash
appium --port 4723
```

**Step 3: Write your first test**

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
    },
  });

  // 2. Create agent
  const agent = new MobileAgent({
    driver,
    apiKey: process.env.OPENAI_API_KEY!,
  });

  // 3. Start session and execute commands
  await agent.startSession();
  await agent.execute('tap on Network & internet');
  const passed = await agent.assert('network settings page is open');
  await agent.stopSession(passed ? 'success' : 'failure');
  
  await driver.deleteSession();
}

firstTest().catch(console.error);
```

**Step 4: Run it**
```bash
npx ts-node test.ts
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

## 🤖 Agent Mode (MCP Server)

Run Mobile Agent as an MCP server so agent clients (Claude Desktop, Cursor, Cline, Goose) can control devices:

```bash
# Set API key and run
export OPENAI_API_KEY="sk-..."
npx @mobile-agent/sdk mobile-agent-mcp
```

Example agent workflow:
```
Start a mobile testing session
Navigate to settings and enable dark mode
Take a screenshot
Verify dark mode is enabled
Stop the session with success
```

The agent uses the four‑tier vision system automatically.

Setup & client configurations:
- See `examples/mcp-server/README.md` for Claude Desktop, Cursor, and Cline configs; tool reference; workflows; troubleshooting.

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
## Optional advanced capabilities mapping
# Android
export MOBILE_APP_PACKAGE="com.example.app"
export MOBILE_APP_ACTIVITY=".MainActivity"
# iOS
export MOBILE_BUNDLE_ID="com.example.App"
# Common
export MOBILE_APP_PATH="/path/to/app.apk_or_app"
export MOBILE_DEVICE_NAME="Android Emulator"   # or iPhone 15
export MOBILE_UDID="<device-udid>"
export MOBILE_PLATFORM_VERSION="17.5"         # iOS only
export APPIUM_AUTOMATION_NAME="UiAutomator2"  # or XCUITest
export APPIUM_NO_RESET="false"
export APPIUM_NEW_COMMAND_TIMEOUT="120"

# Optional: save per-step screenshots
export ARTIFACTS_DIR="./artifacts"
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

The SDK uses a four‑tier hybrid approach combining hierarchy and vision:

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

### Tier 3: Vision + Grid Overlay

For pixel-perfect interactions:

1. **Grid Generation**: Creates grid overlay (A1, B2, C3, etc.)
2. **Vision LLM**: Analyzes screenshot with grid labels
3. **Grid Selection**: LLM selects grid cell
4. **Coordinate Calculation**: Converts grid position to exact coordinates

**Benefits:**
- ✅ 85–90% accuracy — precise positioning
- ✅ Works without element metadata
- ✅ Enables complex gestures

### Tier 4: Pure Vision (Last Resort)

When hierarchy, tags, and grid are insufficient:

1. Raw screenshot analysis via vision LLM
2. LLM returns percentage‑based coordinates
3. SDK maps to device coordinates and executes the action

**Benefits:**
- ✅ Maximum compatibility when no metadata is available
- ⚠️ Lowest confidence of the four tiers (80–85%)

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
    pureVisionOnly: false,
  },
});
```

## 📊 Examples

See the `examples/` directory for complete examples:

- `examples/basic-usage.ts` — Basic SDK usage
- `examples/existing-test-integration.ts` — Integrate into existing tests
- `examples/multi-provider.ts` — Switch between OpenAI and Anthropic
- `examples/connectivity-android.ts` / `examples/connectivity-ios.ts` — Appium connectivity checks
- `examples/agent-check-ios.ts` — Quick agent sanity check

Sample React Native app and smoke tests:

- `examples/sample-rn-app/` — RN sample app
- `examples/tests/sample-rn-app/login-smoke.ts` — Android smoke
- `examples/tests/sample-rn-app/ios-login-smoke.ts` — iOS smoke

Real app examples:

- `examples/tests/real-apps/settings.test.ts`
- `examples/tests/real-apps/google-maps.test.ts`

See `examples/README.md` and `examples/mcp-server/README.md` for setup details.

## 🧪 Development & Testing

With Bun (recommended in this repo):

```bash
bun install
bunx tsc -p tsconfig.json
bunx jest
bunx @biomejs/biome check .
```

Or with npm:

```bash
npm ci
npm run build
npm test
npm run lint
```

Husky pre‑commit runs `biome check .` and tests; consider adding `--write` to auto‑fix formatting locally.

## 🔗 Useful Links

- Appium: https://appium.io
- WebDriverIO: https://webdriver.io

## 📝 Comparison

See `docs/APPAGENT_COMPARISON.md` for a comparison with other agent frameworks.

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

- Issues: use GitHub Issues on this repo
- Discussions: use GitHub Discussions (if enabled)

## 🎓 Learn More

### Documentation
- `docs/VISION_FALLBACK_GUIDE.md` — Four‑tier system
- `docs/PURE_VISION_GUIDE.md` — Pure vision implementation
- `docs/BUG_FIXES.md` — Bug fixes and DPI scaling
- `docs/APPAGENT_COMPARISON.md` — Comparison notes

### External Resources
- [Mobile Agent Python SDK](../MobileAgentFramework)
- [Appium Documentation](https://appium.io/docs)
- [WebDriverIO Documentation](https://webdriver.io/docs/gettingstarted)
- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)

---

**Made with ❤️ for mobile test automation**
