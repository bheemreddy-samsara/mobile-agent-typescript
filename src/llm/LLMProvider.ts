/**
 * Abstract LLM Provider interface
 */

import {
  type LLMActionResponse,
  type LLMVerificationResponse,
  type UIElement,
  type UIState,
  VisionMethod,
} from "../types";

/**
 * Try to robustly parse JSON from LLM outputs that may contain
 * markdown code fences or surrounding prose. Returns the first
 * valid JSON object/array found, or throws on failure.
 */
function parseJsonLoose(text: string): any {
  if (!text) throw new Error("Empty response");

  // Strip markdown code fences if present
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```[a-zA-Z0-9]*\n([\s\S]*?)\n```\s*$/m, "$1");

  // If it's valid JSON as-is
  try {
    return JSON.parse(cleaned);
  } catch {
    /* ignore: will try alternative parsing strategies */
  }

  // Attempt to extract the first {...} or [...] block
  const objMatch = cleaned.match(/\{[\s\S]*\}/);
  const arrMatch = cleaned.match(/\[[\s\S]*\]/);
  const candidate = objMatch?.[0] || arrMatch?.[0];
  if (candidate) {
    try {
      return JSON.parse(candidate);
    } catch {
      /* ignore: candidate might be malformed, continue */
    }
  }

  // Try removing stray backticks and retry
  const deTicked = cleaned.replace(/`/g, "");
  try {
    return JSON.parse(deTicked);
  } catch {
    /* ignore: will throw a descriptive error below */
  }

  throw new Error(`Failed to parse LLM response as JSON: ${text.substring(0, 200)}...`);
}

export interface LLMProvider {
  /**
   * Query the LLM with a prompt
   */
  query(prompt: string, systemPrompt?: string): Promise<string>;

  /**
   * Query the LLM with vision capabilities
   */
  queryWithVision(prompt: string, imageBase64: string, systemPrompt?: string): Promise<string>;

  /**
   * Generate an action based on UI state and instruction
   */
  generateAction(
    uiState: UIState,
    instruction: string,
    history: string[],
  ): Promise<LLMActionResponse>;

  /**
   * Generate an action using vision with numeric tagging
   */
  generateActionWithVisionTagging(
    uiState: UIState,
    instruction: string,
    history: string[],
  ): Promise<LLMActionResponse>;

  /**
   * Generate an action using vision with grid overlay
   */
  generateActionWithGridOverlay(
    uiState: UIState,
    instruction: string,
    history: string[],
  ): Promise<LLMActionResponse>;

  /**
   * Generate an action using pure vision (no overlays)
   */
  generateActionWithPureVision(
    screenshotBase64: string,
    instruction: string,
    screenSize: { width: number; height: number },
    history: string[],
  ): Promise<LLMActionResponse>;

  /**
   * Verify a condition against the current UI state
   */
  verifyCondition(
    uiState: UIState,
    condition: string,
    history: string[],
  ): Promise<LLMVerificationResponse>;
}

/**
 * Base class with helper methods
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract query(prompt: string, systemPrompt?: string): Promise<string>;
  abstract queryWithVision(
    prompt: string,
    imageBase64: string,
    systemPrompt?: string,
  ): Promise<string>;

  async generateAction(
    uiState: UIState,
    instruction: string,
    history: string[],
  ): Promise<LLMActionResponse> {
    const prompt = this.buildActionPrompt(uiState, instruction, history);
    const response = await this.query(prompt);
    try {
      const parsed = parseJsonLoose(response);
      return {
        action: parsed.action || "error",
        elementId: parsed.element_id || parsed.elementId,
        parameters: parsed.parameters || {},
        reasoning: parsed.reasoning || "",
        confidence: parsed.confidence, // Propagate confidence from LLM
        method: VisionMethod.HIERARCHY,
      };
    } catch (_error) {
      return {
        action: "error",
        reasoning: `Failed to parse LLM response: ${response}`,
        confidence: 0, // Set to 0 on parse error
        method: VisionMethod.HIERARCHY,
      };
    }
  }

  async verifyCondition(
    uiState: UIState,
    condition: string,
    history: string[],
  ): Promise<LLMVerificationResponse> {
    const prompt = this.buildVerificationPrompt(uiState, condition, history);
    const response = await this.query(prompt);
    try {
      const parsed = parseJsonLoose(response);
      return {
        passed: parsed.passed || false,
        assertions: parsed.assertions || [],
        issues: parsed.issues || [],
        confidence: parsed.confidence || 0,
      };
    } catch (_error) {
      return {
        passed: false,
        issues: [`Failed to parse LLM response: ${response}`],
        confidence: 0,
      };
    }
  }

  async generateActionWithVisionTagging(
    uiState: UIState,
    instruction: string,
    history: string[],
  ): Promise<LLMActionResponse> {
    if (!uiState.screenshotBase64 || !uiState.tagMapping) {
      throw new Error("Tagged screenshot not available for vision-based approach");
    }

    const prompt = this.buildVisionTaggingPrompt(uiState.tagMapping, instruction, history);
    const response = await this.queryWithVision(prompt, uiState.screenshotBase64);
    try {
      const parsed = parseJsonLoose(response);
      const tagId = parsed.tag_id || parsed.tagId;
      const targetElement = uiState.tagMapping.get(tagId);

      if (!targetElement) {
        throw new Error(`Tag ID ${tagId} not found in mapping`);
      }

      const coordinates = targetElement.bounds
        ? {
            x: Math.floor((targetElement.bounds.x1 + targetElement.bounds.x2) / 2),
            y: Math.floor((targetElement.bounds.y1 + targetElement.bounds.y2) / 2),
          }
        : undefined;

      return {
        action: parsed.action || "error",
        elementId: targetElement.elementId,
        coordinates,
        parameters: parsed.parameters || {},
        reasoning: parsed.reasoning || "",
        confidence: parsed.confidence || 0.8,
        method: VisionMethod.VISION_TAGGING,
        tagId,
      };
    } catch (error: any) {
      return {
        action: "error",
        reasoning: `Failed to parse vision tagging response: ${error.message}`,
        confidence: 0,
        method: VisionMethod.VISION_TAGGING,
      };
    }
  }

  async generateActionWithGridOverlay(
    uiState: UIState,
    instruction: string,
    history: string[],
  ): Promise<LLMActionResponse> {
    if (!uiState.screenshotBase64 || !uiState.gridMap) {
      throw new Error("Grid overlay screenshot not available");
    }

    const prompt = this.buildGridOverlayPrompt(uiState.gridMap, instruction, history);
    const response = await this.queryWithVision(prompt, uiState.screenshotBase64);
    try {
      const parsed = parseJsonLoose(response);
      const gridPosition = parsed.grid_position || parsed.gridPosition;
      const coordinates = uiState.gridMap.get(gridPosition);

      if (!coordinates) {
        throw new Error(`Grid position ${gridPosition} not found in grid map`);
      }

      return {
        action: parsed.action || "error",
        coordinates,
        parameters: parsed.parameters || {},
        reasoning: parsed.reasoning || "",
        confidence: parsed.confidence || 0.7,
        method: VisionMethod.GRID_OVERLAY,
        gridPosition,
      };
    } catch (error: any) {
      return {
        action: "error",
        reasoning: `Failed to parse grid overlay response: ${error.message}`,
        confidence: 0,
        method: VisionMethod.GRID_OVERLAY,
      };
    }
  }

  async generateActionWithPureVision(
    screenshotBase64: string,
    instruction: string,
    screenSize: { width: number; height: number },
    history: string[],
  ): Promise<LLMActionResponse> {
    const prompt = this.buildPureVisionPrompt(instruction, screenSize, history);
    const response = await this.queryWithVision(prompt, screenshotBase64);
    try {
      const parsed = parseJsonLoose(response);
      const location = parsed.location || parsed.position;

      if (
        !location ||
        typeof location.x_percent !== "number" ||
        typeof location.y_percent !== "number"
      ) {
        throw new Error("Invalid location format in pure vision response");
      }

      // Convert percentage to actual coordinates
      const x = Math.floor(screenSize.width * (location.x_percent / 100));
      const y = Math.floor(screenSize.height * (location.y_percent / 100));

      return {
        action: parsed.action || "error",
        coordinates: { x, y },
        location,
        element: parsed.element || "",
        parameters: parsed.parameters || {},
        reasoning: parsed.reasoning || "",
        confidence: parsed.confidence || 0.6,
        method: VisionMethod.PURE_VISION,
      };
    } catch (error: any) {
      return {
        action: "error",
        reasoning: `Failed to parse pure vision response: ${error.message}`,
        confidence: 0,
        method: VisionMethod.PURE_VISION,
      };
    }
  }

  private buildActionPrompt(uiState: UIState, instruction: string, history: string[]): string {
    const elementsDesc = uiState.elements
      .filter((e) => e.clickable && e.visible)
      .map((e) => {
        const bounds = e.bounds
          ? ` @ (${e.bounds.x1},${e.bounds.y1})-(${e.bounds.x2},${e.bounds.y2})`
          : "";
        return `  [${e.elementId}] ${e.elementType}: text='${e.text}' resource_id='${e.resourceId || ""}'${bounds}`;
      })
      .join("\n");

    const historyDesc = history.length > 0 ? `\nPrevious actions:\n${history.join("\n")}` : "";

    return `You are an expert mobile app testing agent. Analyze the following task and current UI state, then generate the next action to take.

Task: ${instruction}
${historyDesc}

Current UI State:
Activity: ${uiState.activity}
Device: ${uiState.deviceInfo.platform || "Unknown"}

Interactive Elements:
${elementsDesc}

Respond with a JSON object containing:
- "action": the action type (click, type_text, swipe, scroll, etc.)
- "element_id": the target element ID from the list above
- "parameters": any action parameters (e.g., {"text": "hello"} for type_text)
- "reasoning": brief explanation of why this action
- "confidence": confidence score between 0 and 1 (0 = not confident, 1 = very confident)

Example response:
{
  "action": "click",
  "element_id": "element_123",
  "parameters": {},
  "reasoning": "Clicking on the settings button to access settings",
  "confidence": 0.95
}`;
  }

  private buildVerificationPrompt(uiState: UIState, condition: string, history: string[]): string {
    const elementsDesc = uiState.elements
      .filter((e) => e.visible)
      .slice(0, 50) // Limit to first 50 visible elements
      .map(
        (e) =>
          `  [${e.elementId}] ${e.elementType}: text='${e.text}' resource_id='${e.resourceId || ""}'`,
      )
      .join("\n");

    const historyDesc = history.length > 0 ? `\nActions taken:\n${history.join("\n")}` : "";

    return `You are an expert mobile app testing agent. Verify if the following condition is met based on the current UI state.

Condition to verify: ${condition}
${historyDesc}

Current UI State:
Activity: ${uiState.activity}

Visible Elements:
${elementsDesc}

Respond with a JSON object containing:
- "passed": boolean indicating if the condition is met
- "assertions": array of assertion objects with description and passed status
- "issues": array of strings describing any issues found
- "confidence": confidence score (0-1)

Example response:
{
  "passed": true,
  "assertions": [
    {"description": "Settings page is visible", "passed": true}
  ],
  "issues": [],
  "confidence": 0.95
}`;
  }

  private buildVisionTaggingPrompt(
    tagMapping: Map<number, UIElement>,
    instruction: string,
    history: string[],
  ): string {
    const taggedElements = Array.from(tagMapping.entries())
      .map(([id, elem]) => {
        const label = elem.text || elem.contentDesc || elem.elementType;
        return `[${id}] ${label}`;
      })
      .join("\n");

    const historyDesc = history.length > 0 ? `\nPrevious actions:\n${history.join("\n")}` : "";

    return `You are an expert mobile app testing agent with vision capabilities.

The screenshot shows numbered tags on interactive elements.

Task: ${instruction}
${historyDesc}

Tagged Elements:
${taggedElements}

Analyze the screenshot and respond with JSON:
{
  "action": "click",
  "tag_id": 3,
  "parameters": {},
  "reasoning": "Clicking element [3] to open settings",
  "confidence": 0.95
}

Available actions: click, type_text, swipe, scroll, long_press
For type_text, include {"text": "..."} in parameters.
For swipe/scroll, include {"direction": "up/down/left/right"} in parameters.`;
  }

  private buildGridOverlayPrompt(
    gridMap: Map<string, { x: number; y: number }>,
    instruction: string,
    history: string[],
  ): string {
    const gridSize = Math.sqrt(gridMap.size);
    const historyDesc = history.length > 0 ? `\nPrevious actions:\n${history.join("\n")}` : "";

    return `You are an expert mobile app testing agent with vision capabilities.

The screenshot has a grid overlay (${gridSize}x${gridSize}). Grid cells are labeled like A1, B2, C3, etc.
Columns are labeled A-Z (left to right).
Rows are labeled 1-N (top to bottom).

Task: ${instruction}
${historyDesc}

Analyze the screenshot and identify which grid cell to interact with.

Respond with JSON:
{
  "action": "click",
  "grid_position": "C5",
  "parameters": {},
  "reasoning": "The login button is at grid position C5",
  "confidence": 0.85
}

Available actions: click, type_text, swipe, scroll, long_press
For type_text, include {"text": "..."} in parameters.
For swipe/scroll, include {"direction": "up/down/left/right"} in parameters.`;
  }

  private buildPureVisionPrompt(
    instruction: string,
    screenSize: { width: number; height: number },
    history: string[],
  ): string {
    const historyDesc = history.length > 0 ? `\nPrevious actions:\n${history.join("\n")}` : "";

    return `You are an expert mobile app testing agent with advanced vision capabilities.

Analyze this mobile app screenshot and complete the following task: "${instruction}"
${historyDesc}

Screen dimensions: ${screenSize.width}x${screenSize.height}

Your task is to:
1. Identify the UI element you need to interact with to complete the task
2. Determine its location as a percentage of the screen (0-100%)
3. Choose the appropriate action

IMPORTANT: 
- Focus on GENERAL functions, not specific content
- x_percent: 0 is left edge, 100 is right edge
- y_percent: 0 is top edge, 100 is bottom edge
- For centered elements, use approximately 50%

Respond with JSON in this exact format:
{
  "element": "Brief description of the element (e.g., 'Login button', 'Email input field')",
  "location": {
    "x_percent": 50,
    "y_percent": 85
  },
  "action": "click",
  "parameters": {},
  "reasoning": "Explain why you chose this element and location",
  "confidence": 0.75
}

Available actions: click, type_text, swipe, scroll, long_press
For type_text, include {"text": "..."} in parameters.
For swipe/scroll, include {"direction": "up/down/left/right"} in parameters.

Examples:
- Button at bottom center: {"x_percent": 50, "y_percent": 90}
- Input field at top left: {"x_percent": 20, "y_percent": 15}
- Icon in top right corner: {"x_percent": 90, "y_percent": 10}`;
  }
}
