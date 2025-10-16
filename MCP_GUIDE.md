# Mobile Agent MCP Server Guide

This guide explains how to use Mobile Agent SDK as a Model Context Protocol (MCP) server, enabling agent-based workflows with Claude Desktop, Cursor, Cline, and other MCP-compatible clients.

## 🌟 What is MCP?

Model Context Protocol (MCP) is an open protocol that standardizes how AI applications interact with external data sources and tools. By running Mobile Agent as an MCP server, you can:

- ✅ **Agent-to-Agent Communication**: Enable LLMs to control mobile devices
- ✅ **Natural Language Automation**: Execute complex mobile workflows via chat
- ✅ **Four-Tier Vision System**: Automatic fallback from hierarchy → tags → grid → pure vision
- ✅ **Multi-Platform**: Works with Claude Desktop, Cursor, Cline, Goose, and more

## 📦 Installation

### Option 1: Using npx (Recommended)

```bash
npx @mobile-agent/sdk mobile-agent-mcp
```

### Option 2: Global Installation

```bash
npm install -g @mobile-agent/sdk
mobile-agent-mcp
```

### Option 3: Local Development

```bash
git clone <your-repo>
cd mobile-agent-typescript
npm install
npm run build
npm run mcp-server
```

## 🔧 Configuration

### Prerequisites

1. **Appium Server**: Must be running before starting MCP server
   ```bash
   appium --port 4723
   ```

2. **Mobile Device/Emulator**: Connected and ready
   ```bash
   # Android
   adb devices
   
   # iOS
   xcrun simctl list devices | grep Booted
   ```

3. **API Keys**: Set environment variables
   ```bash
   export OPENAI_API_KEY="sk-..."
   # OR
   export ANTHROPIC_API_KEY="sk-ant-..."
   ```

### Environment Variables

| Variable | Description | Default | Required |
|----------|-------------|---------|----------|
| `OPENAI_API_KEY` | OpenAI API key | - | Yes (if using OpenAI) |
| `ANTHROPIC_API_KEY` | Anthropic API key | - | Yes (if using Anthropic) |
| `LLM_PROVIDER` | LLM provider (`openai` or `anthropic`) | `openai` | No |
| `MOBILE_PLATFORM` | Target platform (`Android` or `iOS`) | `Android` | No |
| `MOBILE_APP_PACKAGE` | App package/bundle ID | `com.example.app` | No |
| `MOBILE_APP_PATH` | Path to app file (.apk/.ipa) | - | No |
| `APPIUM_HOST` | Appium server host | `localhost` | No |
| `APPIUM_PORT` | Appium server port | `4723` | No |
| `VERBOSE` | Enable verbose logging | `false` | No |

## 🎯 MCP Client Setup

### Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "mobile-agent": {
      "command": "npx",
      "args": ["-y", "@mobile-agent/sdk", "mobile-agent-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "MOBILE_PLATFORM": "Android",
        "MOBILE_APP_PACKAGE": "com.example.app"
      }
    }
  }
}
```

### Cursor

1. Go to **Cursor Settings** → **MCP**
2. Click **Add new MCP Server**
3. Configure:
   - **Name**: `mobile-agent`
   - **Type**: `command`
   - **Command**: `npx -y @mobile-agent/sdk mobile-agent-mcp`
4. Add environment variables in the UI

### Cline (VS Code Extension)

Add to your MCP settings file (`.vscode/mcp-settings.json`):

```json
{
  "mcpServers": {
    "mobile-agent": {
      "command": "npx",
      "args": ["-y", "@mobile-agent/sdk", "mobile-agent-mcp"],
      "env": {
        "OPENAI_API_KEY": "sk-...",
        "MOBILE_PLATFORM": "Android"
      }
    }
  }
}
```

### Goose

```bash
goose mcp add mobile-agent npx -y @mobile-agent/sdk mobile-agent-mcp
```

## 🛠️ Available MCP Tools

### 1. `mobile_start_session`

Start a new testing session. Must be called first.

**Parameters:** None

**Example:**
```
Start a mobile testing session
```

### 2. `mobile_execute`

Execute a natural language instruction with four-tier fallback.

**Parameters:**
- `instruction` (string, required): Natural language instruction
- `visionMode` (string, optional): `"auto"` (default) or `"pure-vision-only"`

**Examples:**
```
Click the login button
Type "user@example.com" in the email field
Scroll down to find the settings menu
Navigate to the profile page
```

**Four-Tier Fallback:**
1. **Hierarchy** (XML) - Fast, accurate
2. **Vision + Tags** - When hierarchy fails
3. **Vision + Grid** - Universal fallback
4. **Pure Vision** - Last resort

### 3. `mobile_assert`

Verify a condition on the mobile screen.

**Parameters:**
- `condition` (string, required): Condition to verify

**Examples:**
```
Verify that login was successful
Check if the user is on the home screen
Assert that the error message is displayed
```

### 4. `mobile_take_screenshot`

Capture the current screen state.

**Parameters:**
- `saveToFile` (string, optional): File path to save screenshot

**Examples:**
```
Take a screenshot
Take a screenshot and save to ./debug.png
```

### 5. `mobile_get_state`

Get the current UI state including elements and hierarchy.

**Parameters:**
- `includeScreenshot` (boolean, optional): Include screenshot in response

**Examples:**
```
Get the current UI state
Show me what's on screen with a screenshot
```

### 6. `mobile_configure`

Configure mobile agent settings.

**Parameters:**
- `enableVisionFallback` (boolean): Enable vision fallback
- `confidenceThreshold` (number, 0-1): Confidence threshold for fallback
- `pureVisionOnly` (boolean): Use only pure vision mode
- `gridSize` (number, 5-20): Grid size for overlay

**Examples:**
```
Enable pure vision only mode
Set confidence threshold to 0.8
Use a 12x12 grid for overlays
```

### 7. `mobile_stop_session`

Stop the current session and get results.

**Parameters:**
- `status` (string, required): `"success"` or `"failure"`

**Examples:**
```
Stop the session with success status
End the session with failure status
```

## 💡 Usage Examples

### Example 1: Login Flow Test

```
1. Start a mobile testing session
2. Click the email input field
3. Type "test@example.com"
4. Click the password field
5. Type "password123"
6. Click the login button
7. Verify that login was successful
8. Stop the session with success status
```

### Example 2: Search and Verify

```
1. Start a mobile testing session
2. Click the search icon
3. Type "mobile automation"
4. Press the search button
5. Take a screenshot
6. Verify that search results are displayed
7. Stop the session with success status
```

### Example 3: Pure Vision Mode

```
1. Start a mobile testing session
2. Configure mobile agent to use pure vision only mode
3. Click the button with a settings icon
4. Navigate to the privacy settings
5. Take a screenshot
6. Stop the session with success status
```

### Example 4: Complex Navigation

```
1. Start a mobile testing session
2. Scroll down to find the menu
3. Click on "Settings"
4. Navigate to "Account"
5. Verify that the account page is displayed
6. Get the current UI state with screenshot
7. Stop the session with success status
```

## 🎨 Agent Prompts

Here are effective prompts to use with your MCP-enabled agent:

### Testing Workflows

```
Test the login flow of the mobile app:
1. Enter email and password
2. Click login
3. Verify successful login
```

### Exploratory Testing

```
Explore the mobile app and document all screens:
1. Take screenshots of each screen
2. Navigate through all menu items
3. Record what functionality each screen provides
```

### Regression Testing

```
Run a regression test on the shopping cart:
1. Add 3 items to cart
2. Update quantities
3. Apply a discount code
4. Verify total price calculation
5. Proceed to checkout
```

### Performance Testing

```
Test the app's responsiveness:
1. Navigate quickly between screens
2. Take screenshots at each step
3. Report any delays or errors
```

## 🔍 Debugging

### Enable Verbose Logging

```bash
export VERBOSE=true
npx @mobile-agent/sdk mobile-agent-mcp
```

### Check MCP Server Status

In your MCP client, check the server status:
- **Claude Desktop**: Look for "mobile-agent" in the server list
- **Cursor**: Check MCP settings panel
- **Cline**: Verify in extension settings

### Common Issues

**1. "Session not started"**
- Solution: Call `mobile_start_session` before other tools

**2. "API key not found"**
- Solution: Set `OPENAI_API_KEY` or `ANTHROPIC_API_KEY` environment variable

**3. "Driver not initialized"**
- Solution: Ensure Appium is running and device is connected

**4. "Element not found"**
- Solution: The four-tier fallback should handle this automatically. If it persists, enable pure vision mode.

### View Logs

Logs are written to stdout/stderr and can be viewed in:
- **Claude Desktop**: Help → Developer → View Logs
- **Cursor**: Developer Tools Console
- **Cline**: VS Code Output panel

## 🚀 Advanced Configuration

### Custom Appium Capabilities

Set environment variables for custom capabilities:

```bash
export MOBILE_PLATFORM=Android
export MOBILE_APP_PACKAGE=com.myapp
export MOBILE_APP_PATH=/path/to/app.apk
export APPIUM_HOST=192.168.1.100
export APPIUM_PORT=4723
```

### Vision Fallback Tuning

Configure vision fallback behavior at runtime:

```
Configure mobile agent:
- Enable vision fallback: true
- Confidence threshold: 0.75
- Grid size: 12
```

### Pure Vision Mode

For maximum compatibility with any app:

```
Configure mobile agent to use pure vision only mode
```

This skips hierarchy/tags/grid and uses only the pure vision approach.

## 📊 Comparison with Mobile-MCP

| Feature | Mobile-MCP | Our SDK + MCP |
|---------|------------|---------------|
| **Accessibility Trees** | ✅ | ✅ (Tier 1) |
| **Screenshot Fallback** | ✅ | ✅ (Tiers 2-4) |
| **Numeric Tagging** | ❌ | ✅ (Tier 2) |
| **Grid Overlay** | ❌ | ✅ (Tier 3) |
| **Pure Vision** | ❌ | ✅ (Tier 4) |
| **Four-Tier Fallback** | ❌ | ✅ |
| **MCP Protocol** | ✅ | ✅ |
| **Direct SDK** | ❌ | ✅ |
| **CI/CD Integration** | ⚠️ | ✅ |

**Our Advantage**: More sophisticated vision fallback system with four intelligent tiers.

## 🤝 Contributing

Found an issue or want to contribute? Please see [CONTRIBUTING.md](./CONTRIBUTING.md).

## 📄 License

MIT License - see [LICENSE](./LICENSE) for details.

## 🔗 Links

- **Main Documentation**: [README.md](./README.md)
- **Vision Fallback Guide**: [VISION_FALLBACK_GUIDE.md](./VISION_FALLBACK_GUIDE.md)
- **Pure Vision Guide**: [PURE_VISION_GUIDE.md](./PURE_VISION_GUIDE.md)
- **Example Tests**: [examples/README.md](./examples/README.md)
- **MCP Protocol**: https://github.com/modelcontextprotocol
- **Mobile-MCP**: https://github.com/mobile-next/mobile-mcp

