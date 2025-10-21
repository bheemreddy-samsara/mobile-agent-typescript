/**
 * Type definitions for Mobile Agent SDK
 */

import type { Browser } from "webdriverio";

/**
 * Types of actions that can be performed on UI
 */
export enum ActionType {
  CLICK = "click",
  LONG_PRESS = "long_press",
  SWIPE = "swipe",
  SCROLL = "scroll",
  TYPE_TEXT = "type_text",
  TAP = "tap",
  DOUBLE_TAP = "double_tap",
  PINCH = "pinch",
  ZOOM = "zoom",
}

/**
 * Vision-based detection methods
 */
export enum VisionMethod {
  HIERARCHY = "hierarchy",
  VISION_TAGGING = "vision-tagging",
  GRID_OVERLAY = "grid-overlay",
  PURE_VISION = "pure-vision",
}

/**
 * Types of UI elements
 */
export enum UIElementType {
  BUTTON = "button",
  TEXT_VIEW = "text_view",
  EDIT_TEXT = "edit_text",
  IMAGE_VIEW = "image_view",
  LIST_VIEW = "list_view",
  RECYCLER_VIEW = "recycler_view",
  WEBVIEW = "webview",
  DIALOG = "dialog",
  TOGGLE = "toggle",
  SPINNER = "spinner",
  UNKNOWN = "unknown",
}

/**
 * Verification result statuses
 */
export enum VerificationStatus {
  PASSED = "passed",
  FAILED = "failed",
  SKIPPED = "skipped",
  ERROR = "error",
}

/**
 * Represents a UI element on the screen
 */
export interface UIElement {
  elementId: string;
  text: string;
  resourceId?: string;
  className?: string;
  contentDesc?: string;
  bounds?: {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
  };
  elementType: UIElementType;
  clickable: boolean;
  scrollable: boolean;
  focusable: boolean;
  longClickable: boolean;
  checked: boolean;
  enabled: boolean;
  visible: boolean;
  metadata?: Record<string, any>;
}

/**
 * Represents a single action step
 */
export interface ActionStep {
  actionType: ActionType;
  targetElement?: UIElement;
  targetElementId?: string;
  parameters: Record<string, any>;
  description: string;
  timestamp: Date;
  success: boolean;
  error?: string;
  screenshotBefore?: string;
  screenshotAfter?: string;
}

/**
 * Represents a verification point/assertion
 */
export interface VerificationPoint {
  name: string;
  description: string;
  assertionType: string;
  expectedValue: any;
  actualValue?: any;
  status: VerificationStatus;
  errorMessage?: string;
}

/**
 * Complete test execution result
 */
export interface TestResult {
  success: boolean;
  task: string;
  steps: ActionStep[];
  verificationResults: VerificationPoint[];
  errorMessage?: string;
  startTime: Date;
  endTime?: Date;
  durationSeconds: number;
  screenshots: string[];
  logs: string[];
  metadata: Record<string, any>;
}

/**
 * Represents the current UI state
 */
export interface UIState {
  activity: string;
  elements: UIElement[];
  screenshotPath?: string;
  screenshotBase64?: string;
  tagMapping?: Map<number, UIElement>;
  gridMap?: Map<string, { x: number; y: number }>;
  xmlSource?: string;
  timestamp: Date;
  deviceInfo: Record<string, any>;
}

/**
 * Configuration for pure vision approach
 */
export interface PureVisionConfig {
  enabled: boolean;
  minimumConfidence?: number;
  usePercentageCoordinates?: boolean;
}

/**
 * Configuration for vision fallback behavior
 */
export interface VisionFallbackConfig {
  enabled: boolean;
  fallbackOnElementNotFound?: boolean;
  fallbackOnLowConfidence?: boolean;
  confidenceThreshold?: number;
  gridSize?: number;
  alwaysUseVision?: boolean;
  preferredMethod?: VisionMethod;
  pureVisionConfig?: PureVisionConfig;
  pureVisionOnly?: boolean; // Skip tiers 1-3, use only pure vision
}

/**
 * Configuration for MobileAgent
 */
export interface MobileAgentConfig {
  driver: Browser;
  apiKey: string;
  llmProvider?: "openai" | "anthropic";
  model?: string;
  maxSteps?: number;
  timeoutSeconds?: number;
  verbose?: boolean;
  enableVisionFallback?: boolean;
  visionConfig?: VisionFallbackConfig;
}

/**
 * LLM response for action generation
 */
export interface LLMActionResponse {
  action: string;
  elementId?: string;
  coordinates?: { x: number; y: number };
  location?: { x_percent: number; y_percent: number }; // For pure vision percentage-based coords
  parameters?: Record<string, any>;
  reasoning: string;
  confidence?: number;
  method?: VisionMethod;
  tagId?: number;
  gridPosition?: string;
  element?: string; // Element description for pure vision
}

/**
 * LLM response for verification
 */
export interface LLMVerificationResponse {
  passed: boolean;
  assertions?: Array<{
    description: string;
    passed: boolean;
  }>;
  issues?: string[];
  confidence: number;
}
