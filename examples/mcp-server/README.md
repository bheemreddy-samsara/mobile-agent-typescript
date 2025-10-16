# Mobile Agent MCP Server Examples

This directory contains examples and configuration files for running Mobile Agent as an MCP server.

## 📋 Prerequisites

1. **Appium Server** running on `localhost:4723`
2. **Mobile Device** or emulator connected
3. **API Key** for OpenAI or Anthropic

## 🚀 Quick Start

### 1. Start Appium

```bash
appium --port 4723
```

### 2. Connect Device/Emulator

**Android:**
```bash
# Start emulator
emulator -avd Pixel_5_API_30

# Verify connection
adb devices
```

**iOS:**
```bash
# Start simulator
xcrun simctl boot "iPhone 15 Pro"

# Verify
xcrun simctl list devices | grep Booted
```

### 3. Set Environment Variables

```bash
export OPENAI_API_KEY="sk-..."
export MOBILE_PLATFORM="Android"
export MOBILE_APP_PACKAGE="com.example.app"
```

### 4. Run MCP Server

```bash
# Using npx
npx @mobile-agent/sdk mobile-agent-mcp

# Or using npm script
npm run mcp-server
```

## 🎯 MCP Client Configurations

### Claude Desktop

**Location:** `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS)

```json
{
  "mcpServers": {
    "mobile-agent": {
      "command": "npx",
      "args": ["-y", "@mobile-agent/sdk", "mobile-agent-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "MOBILE_PLATFORM": "Android",
        "MOBILE_APP_PACKAGE": "com.android.settings"
      }
    }
  }
}
```

### Cursor

**Cursor Settings → MCP → Add New Server**

```json
{
  "name": "mobile-agent",
  "type": "command",
  "command": "npx",
  "args": ["-y", "@mobile-agent/sdk", "mobile-agent-mcp"],
  "env": {
    "OPENAI_API_KEY": "sk-...",
    "MOBILE_PLATFORM": "Android"
  }
}
```

### Cline (VS Code)

**File:** `.vscode/mcp-settings.json`

```json
{
  "mcpServers": {
    "mobile-agent": {
      "command": "npx",
      "args": ["-y", "@mobile-agent/sdk", "mobile-agent-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "MOBILE_PLATFORM": "iOS",
        "MOBILE_APP_PACKAGE": "com.apple.mobilesafari"
      }
    }
  }
}
```

## 💡 Example Workflows

### Example 1: Android Settings Test

**Agent Prompt:**
```
1. Start a mobile testing session
2. Navigate to Network & Internet settings
3. Click on Wi-Fi
4. Take a screenshot
5. Verify that Wi-Fi settings are displayed
6. Stop the session with success status
```

**Expected Output:**
```
✅ Session started
✅ Navigated to Network & Internet
✅ Clicked Wi-Fi
📸 Screenshot captured
✅ Assertion passed: "Wi-Fi settings are displayed"
✅ Session stopped: success
```

### Example 2: Login Flow

**Agent Prompt:**
```
Test the login flow:
1. Start session
2. Enter "test@example.com" in email field
3. Enter "password123" in password field
4. Click login button
5. Verify login successful
6. Stop session with success
```

### Example 3: Pure Vision Mode

**Agent Prompt:**
```
1. Start mobile session
2. Configure agent to use pure vision only mode
3. Click the settings icon (use vision to find it)
4. Navigate to Account section
5. Take screenshot
6. Stop session
```

### Example 4: Complex Navigation

**Agent Prompt:**
```
Explore the app and document all screens:
1. Start session
2. Take screenshot of home screen
3. Navigate to each menu item
4. Take screenshot of each screen
5. Get UI state for each screen
6. Stop session with success
```

## 🔧 Environment Variables Reference

### Required

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` | LLM API key | `sk-...` |

### Optional

| Variable | Description | Default | Example |
|----------|-------------|---------|---------|
| `LLM_PROVIDER` | LLM provider | `openai` | `anthropic` |
| `MOBILE_PLATFORM` | Target platform | `Android` | `iOS` |
| `MOBILE_APP_PACKAGE` | App package/bundle ID | `com.example.app` | `com.android.settings` |
| `MOBILE_APP_PATH` | Path to app file | - | `/path/to/app.apk` |
| `APPIUM_HOST` | Appium host | `localhost` | `192.168.1.100` |
| `APPIUM_PORT` | Appium port | `4723` | `4723` |
| `VERBOSE` | Verbose logging | `false` | `true` |

## 🐛 Debugging

### Enable Debug Mode

```bash
export VERBOSE=true
npx @mobile-agent/sdk mobile-agent-mcp
```

### Check Server Connection

In your MCP client, verify the server appears in the available servers list.

### View Logs

- **Claude Desktop**: Help → Developer → View Logs
- **Cursor**: Developer Tools Console (Cmd+Option+I)
- **Cline**: VS Code Output panel

### Test Connectivity

```bash
# Test Appium
curl http://localhost:4723/status

# Test device connection
adb devices  # Android
xcrun simctl list devices | grep Booted  # iOS
```

## 📱 Supported Apps

### Pre-installed Apps (No Installation Required)

**Android:**
- Settings: `com.android.settings`
- Chrome: `com.android.chrome`
- Calculator: `com.android.calculator2`

**iOS:**
- Settings: `com.apple.Preferences`
- Safari: `com.apple.mobilesafari`
- Calculator: `com.apple.calculator`

### Custom Apps

For your own apps:

**Android (.apk):**
```bash
export MOBILE_APP_PATH="/path/to/your-app.apk"
export MOBILE_APP_PACKAGE="com.yourcompany.yourapp"
```

**iOS (.app for simulator, .ipa for device):**
```bash
export MOBILE_APP_PATH="/path/to/YourApp.app"
export MOBILE_APP_PACKAGE="com.yourcompany.YourApp"
```

## 🎨 Advanced Usage

### Custom Configuration Files

Create a `.env` file:

```bash
# .env
OPENAI_API_KEY=sk-...
MOBILE_PLATFORM=Android
MOBILE_APP_PACKAGE=com.example.app
APPIUM_HOST=localhost
APPIUM_PORT=4723
VERBOSE=true
```

Load with:

```bash
source .env
npx @mobile-agent/sdk mobile-agent-mcp
```

### Multiple Device Testing

Run separate MCP servers for different devices:

```bash
# Terminal 1 - Android
export MOBILE_PLATFORM=Android
export APPIUM_PORT=4723
npx @mobile-agent/sdk mobile-agent-mcp

# Terminal 2 - iOS
export MOBILE_PLATFORM=iOS
export APPIUM_PORT=4724
npx @mobile-agent/sdk mobile-agent-mcp
```

### CI/CD Integration

For headless testing in CI/CD:

```bash
# Start Appium in background
appium --port 4723 &

# Start emulator
emulator -avd Pixel_5_API_30 -no-window -no-audio &

# Wait for boot
adb wait-for-device

# Run tests via MCP
# (Your CI script calls the agent with test instructions)
```

## 🔗 See Also

- [Main MCP Guide](../../MCP_GUIDE.md)
- [Vision Fallback Documentation](../../VISION_FALLBACK_GUIDE.md)
- [Pure Vision Guide](../../PURE_VISION_GUIDE.md)
- [SDK Documentation](../../README.md)

