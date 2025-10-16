# Pure Vision Mode - Complete Guide

## 🎯 Overview

**Pure Vision** is a fourth-tier fallback approach and optional standalone mode that uses raw screenshots with multimodal LLMs to identify UI elements without any image processing (no tags, no grids).

### **Two Ways to Use Pure Vision**

1. **Tier 4 Fallback** (Default) - Last resort after other tiers fail
2. **Pure Vision Only Mode** - Skip all other tiers, use only pure vision

---

## 🏗️ Architecture: Four-Tier System

```
┌─────────────────────────────────────────────────────┐
│ Tier 1: Hierarchy (XML)                            │
│ ✓ Fastest (100-200ms)                              │
│ ✓ Most accurate (95-100%)                          │
│ ✓ No image processing                              │
└─────────────────────────────────────────────────────┘
                    ↓ (if fails or low confidence)
┌─────────────────────────────────────────────────────┐
│ Tier 2: Vision + Numeric Tags                      │
│ ✓ Fast (2-3s)                                      │
│ ✓ High accuracy (90-95%)                           │
│ ✓ Requires image processing                        │
└─────────────────────────────────────────────────────┘
                    ↓ (if fails)
┌─────────────────────────────────────────────────────┐
│ Tier 3: Vision + Grid Overlay                      │
│ ✓ Moderate speed (2-3s)                            │
│ ✓ Good accuracy (85-90%)                           │
│ ✓ Requires image processing                        │
└─────────────────────────────────────────────────────┘
                    ↓ (if fails)
┌─────────────────────────────────────────────────────┐
│ Tier 4: Pure Vision ⭐ NEW                         │
│ ✓ Moderate speed (2-3s)                            │
│ ✓ Acceptable accuracy (60-75%)                     │
│ ✓ NO image processing                              │
│ ✓ Last resort fallback                             │
└─────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### **Option 1: Four-Tier Fallback (Recommended)**

Pure vision automatically activates as Tier 4 when other methods fail:

```typescript
import { MobileAgent } from '@mobile-agent/sdk';

const agent = new MobileAgent({
  driver,
  apiKey: process.env.OPENAI_API_KEY!,
  llmProvider: 'openai',
  enableVisionFallback: true,  // Enable vision fallbacks
  visionConfig: {
    enabled: true,
    pureVisionConfig: {
      enabled: true,          // ✅ Enable Tier 4 (default: true)
      minimumConfidence: 0.5, // Minimum confidence to accept
    },
  },
});

// Automatically uses best tier for each action
await agent.execute(driver, "Click the login button");
```

**Fallback Flow:**
```
Hierarchy → Failed
  ↓
Vision Tagging → Failed  
  ↓
Grid Overlay → Failed
  ↓
Pure Vision → Success! ✅
```

### **Option 2: Pure Vision Only Mode** 

Skip all tiers and use only pure vision:

```typescript
const agent = new MobileAgent({
  driver,
  apiKey: process.env.OPENAI_API_KEY!,
  llmProvider: 'openai',
  visionConfig: {
    enabled: true,
    pureVisionOnly: true,  // ⭐ Skip Tiers 1-3, use only pure vision
    pureVisionConfig: {
      enabled: true,
      minimumConfidence: 0.6,  // Higher threshold for only mode
    },
  },
});

// Every action uses pure vision
await agent.execute(driver, "Click the login button");
```

**Use Cases for Pure Vision Only:**
- Research/experimentation with vision models
- Apps where hierarchy is completely unreliable
- Testing pure LLM vision capabilities
- Comparing vision vs hierarchy performance

---

## 📊 Configuration Options

### **Complete Configuration**

```typescript
interface VisionFallbackConfig {
  enabled: boolean;
  
  // Pure Vision Settings ⭐
  pureVisionOnly?: boolean;  // Skip tiers 1-3 (default: false)
  pureVisionConfig?: {
    enabled: boolean;                // Enable Tier 4 (default: true)
    minimumConfidence?: number;      // Min confidence (default: 0.5)
    usePercentageCoordinates?: boolean;  // Use % coords (default: true)
  };
  
  // Other tier settings
  fallbackOnElementNotFound?: boolean;
  fallbackOnLowConfidence?: boolean;
  confidenceThreshold?: number;
  gridSize?: number;
}
```

### **Configuration Examples**

#### **1. Default (Four-Tier Fallback)**
```typescript
// Pure vision enabled as Tier 4
visionConfig: {
  enabled: true,
  // pureVisionConfig not specified = uses defaults
}
```

#### **2. Disable Pure Vision Fallback**
```typescript
// Only use Tiers 1-3
visionConfig: {
  enabled: true,
  pureVisionConfig: {
    enabled: false,  // ❌ Tier 4 disabled
  },
}
```

#### **3. Strict Pure Vision**
```typescript
// Higher confidence requirement
visionConfig: {
  enabled: true,
  pureVisionConfig: {
    enabled: true,
    minimumConfidence: 0.75,  // Require high confidence
  },
}
```

#### **4. Pure Vision Only Mode**
```typescript
// Skip all other tiers
visionConfig: {
  enabled: true,
  pureVisionOnly: true,  // ⭐ Only use pure vision
  pureVisionConfig: {
    enabled: true,
    minimumConfidence: 0.6,
  },
}
```

---

## 🔍 How Pure Vision Works

### **1. Capture Raw Screenshot**
```typescript
// No overlays, no processing
const screenshotBase64 = await observer.captureScreenshotAsBase64(driver);
const screenSize = await driver.getWindowSize();
```

### **2. Query LLM with Vision**
```typescript
const prompt = `
Analyze this mobile app screenshot and complete: "Click the login button"

Screen dimensions: 390x844

Identify the element and its location as percentage (0-100%):
- x_percent: 0 is left, 100 is right
- y_percent: 0 is top, 100 is bottom

Respond with JSON:
{
  "element": "Login button",
  "location": {"x_percent": 50, "y_percent": 85},
  "action": "click",
  "confidence": 0.75,
  "reasoning": "Blue button labeled 'Login' at bottom center"
}
`;

const response = await llm.queryWithVision(prompt, screenshotBase64);
```

### **3. Convert Percentages to Coordinates**
```typescript
// LLM returns: { x_percent: 50, y_percent: 85 }
const x = Math.floor(screenSize.width * (50 / 100));  // 390 * 0.5 = 195
const y = Math.floor(screenSize.height * (85 / 100)); // 844 * 0.85 = 717

// Tap at (195, 717)
await driver.touchAction([{ action: 'tap', x, y }]);
```

---

## 📈 Accuracy & Performance

### **Tier Comparison**

| Tier | Method | Speed | Accuracy | Processing | Use Case |
|------|--------|-------|----------|------------|----------|
| 1 | Hierarchy | 100-200ms | 95-100% | None | Standard elements |
| 2 | Vision + Tags | 2-3s | 90-95% | Tag overlay | Hidden/complex elements |
| 3 | Vision + Grid | 2-3s | 85-90% | Grid overlay | Any screen location |
| 4 | Pure Vision | 2-3s | 60-75% | None | Last resort |

### **Why Pure Vision Has Lower Accuracy**

1. **No Reference Points**: LLMs struggle with absolute coordinates without visual anchors
2. **Screen Scale Variations**: Different devices, different dimensions
3. **Ambiguity**: Multiple similar elements hard to distinguish
4. **Percentage Estimation**: LLMs aren't precise with spatial reasoning

### **When Pure Vision Works Best**

✅ **Good for:**
- Large, prominent buttons
- Centered elements
- Unique visual elements
- Simple layouts

❌ **Challenging for:**
- Small icons/buttons
- Crowded screens
- Multiple similar elements
- Precise positioning

---

## 🧪 Testing

### **Test Suite: `test/PureVision.test.ts`**

```bash
npm test -- test/PureVision.test.ts
```

**37 Total Tests:**
- 14 Pure Vision tests
- 23 Other tests (hierarchy, config, grid)

**Pure Vision Test Coverage:**
1. ✅ Configuration (defaults, custom settings)
2. ✅ Pure vision only mode
3. ✅ LLM response parsing
4. ✅ Coordinate conversion (different screen sizes)
5. ✅ Error handling (parse errors, missing fields)
6. ✅ Prompt building
7. ✅ Four-tier fallback logic
8. ✅ Confidence validation

---

## 💡 Best Practices

### **1. Use Four-Tier Fallback (Default)**
```typescript
// ✅ Recommended for production
visionConfig: {
  enabled: true,
  pureVisionConfig: { enabled: true },
}
```
**Why:** Maximizes success rate by trying all methods.

### **2. Adjust Confidence Threshold**
```typescript
// For critical actions
pureVisionConfig: {
  minimumConfidence: 0.7,  // Stricter
}

// For exploratory testing
pureVisionConfig: {
  minimumConfidence: 0.4,  // More lenient
}
```

### **3. Log Which Tier Was Used**
```typescript
// Already logged automatically:
// [INFO] ✓ Pure vision approach succeeded (Tier 4)
// [DEBUG] Pure vision located element "Login button" at 50%, 85% (195, 717)
```

### **4. Use Pure Vision Only for Specific Scenarios**
```typescript
// Example: Testing vision capabilities
if (process.env.TEST_MODE === 'vision-only') {
  config.visionConfig.pureVisionOnly = true;
}
```

---

## 🐛 Troubleshooting

### **Problem: Pure Vision Always Fails**

**Possible Causes:**
1. Confidence threshold too high
2. LLM struggling with complex layout
3. API rate limits
4. Poor screenshot quality

**Solutions:**
```typescript
// Lower confidence threshold
pureVisionConfig: {
  minimumConfidence: 0.4,  // Try lower
}

// Check logs for LLM response
logger.level = LogLevel.DEBUG;

// Try simpler instructions
// Bad:  "Click the small icon next to the username"
// Good: "Click the settings button"
```

### **Problem: Coordinates Are Off**

**Possible Causes:**
1. LLM providing inaccurate percentages
2. Screen size mismatch
3. High-DPI scaling issues

**Solutions:**
```typescript
// Verify screen size is correct
const size = await driver.getWindowSize();
console.log(`Screen: ${size.width}x${size.height}`);

// Pure vision uses percentage-based coords
// These are less affected by DPI scaling

// If still inaccurate, fallback to grid overlay
pureVisionConfig: { enabled: false }
```

### **Problem: Too Slow**

**Possible Causes:**
1. Using pure vision only mode unnecessarily
2. All tiers being tried every time

**Solutions:**
```typescript
// Use hierarchy when possible (fastest)
// Only use pure vision as last resort

// Check if confidence threshold is causing unnecessary fallbacks
confidenceThreshold: 0.6,  // Don't set too high
```

---

## 📚 Examples

### **Example 1: Automatic Fallback to Tier 4**

```typescript
import { MobileAgent } from '@mobile-agent/sdk';

const agent = new MobileAgent({
  driver,
  apiKey: process.env.OPENAI_API_KEY!,
  llmProvider: 'openai',
  visionConfig: {
    enabled: true,
    pureVisionConfig: { enabled: true },
  },
});

await agent.startSession();

// Hierarchy fails → Vision tagging fails → Grid fails → Pure vision succeeds
await agent.execute("Click the submit button");
// [INFO] ✓ Pure vision approach succeeded (Tier 4)
```

### **Example 2: Pure Vision Only Mode**

```typescript
const agent = new MobileAgent({
  driver,
  apiKey: process.env.OPENAI_API_KEY!,
  llmProvider: 'openai',
  visionConfig: {
    enabled: true,
    pureVisionOnly: true,  // Skip all other tiers
  },
});

await agent.startSession();
await agent.execute("Click login");
// [INFO] Pure vision only mode enabled
// [INFO] ✓ Pure vision approach succeeded
```

### **Example 3: Compare Tiers**

```typescript
// Test same action with different tiers
const configs = [
  { name: 'Hierarchy Only', config: { enableVisionFallback: false } },
  { name: 'Vision Tagging', config: { visionConfig: { pureVisionOnly: false } } },
  { name: 'Pure Vision Only', config: { visionConfig: { pureVisionOnly: true } } },
];

for (const { name, config } of configs) {
  const agent = new MobileAgent({ driver, apiKey, ...config });
  const start = Date.now();
  
  try {
    await agent.execute("Click settings");
    console.log(`${name}: SUCCESS in ${Date.now() - start}ms`);
  } catch (error) {
    console.log(`${name}: FAILED in ${Date.now() - start}ms`);
  }
}
```

---

## 🎯 When to Use Each Mode

### **Four-Tier Fallback (Default)** ✅ Recommended

**Use When:**
- Production testing
- CI/CD pipelines
- Maximum reliability needed
- Apps with mixed complexity

**Pros:**
- Highest success rate
- Fast when hierarchy works
- Graceful degradation

**Cons:**
- May be overkill for simple apps

### **Pure Vision Only** 🔬 Experimental

**Use When:**
- Research/experimentation
- Comparing vision capabilities
- Testing new LLM models
- Hierarchy completely unreliable

**Pros:**
- No image processing overhead
- Tests pure vision capabilities
- Simpler debugging

**Cons:**
- Lower accuracy (60-75%)
- Slower than hierarchy
- Not recommended for production

---

## 🔗 Related Documentation

- [README.md](./README.md) - Main documentation
- [VISION_FALLBACK_GUIDE.md](./VISION_FALLBACK_GUIDE.md) - Three-tier system
- [BUG_FIXES.md](./BUG_FIXES.md) - Bug fixes and DPI scaling
- [APPAGENT_COMPARISON.md](./APPAGENT_COMPARISON.md) - Comparison with AppAgent

---

## ✅ Summary

**Pure Vision provides:**
1. ✅ **Tier 4 Fallback** - Last resort after other tiers fail
2. ✅ **Pure Vision Only Mode** - Optional standalone mode
3. ✅ **No Image Processing** - Raw screenshots only
4. ✅ **Percentage-Based Coordinates** - Screen-size agnostic
5. ✅ **Fully Tested** - 14 comprehensive tests
6. ✅ **Configurable** - Multiple configuration options

**Recommendations:**
- 🎯 **Use four-tier fallback** for maximum reliability (default)
- 🔬 **Use pure vision only** for experimentation/research
- ⚙️ **Adjust confidence threshold** based on your needs
- 📊 **Monitor which tiers are used** to optimize configuration

---

**Status**: ✅ Production Ready  
**Tests**: 37/37 passing  
**Documentation**: Complete  

🚀 **Ready to use!**

