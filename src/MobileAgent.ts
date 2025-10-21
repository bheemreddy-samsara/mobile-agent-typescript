/**
 * Mobile Agent - Main agent for natural language mobile app testing
 */

import * as fs from "node:fs";
import type { Browser } from "webdriverio";
import { AnthropicProvider } from "./llm/AnthropicProvider";
import type { LLMProvider } from "./llm/LLMProvider";
import { OpenAIProvider } from "./llm/OpenAIProvider";
import { UIObserver } from "./observer/UIObserver";
import {
  type ActionStep,
  ActionType,
  type MobileAgentConfig,
  type TestResult,
  type UIElement,
  type UIState,
  type VerificationPoint,
  VerificationStatus,
  type VisionFallbackConfig,
  VisionMethod,
} from "./types";
import { LogLevel, logger } from "./utils/logger";

export class MobileAgent {
  private driver: Browser;
  private llm: LLMProvider;
  private observer: UIObserver;
  private config: Required<MobileAgentConfig>;
  private visionConfig: VisionFallbackConfig;
  private testResult?: TestResult;
  private actionHistory: string[] = [];
  private currentState?: UIState;
  private screenshotCounter = 0;

  constructor(config: MobileAgentConfig) {
    const defaultVisionConfig: VisionFallbackConfig = {
      enabled: config.enableVisionFallback !== undefined ? config.enableVisionFallback : true,
      fallbackOnElementNotFound: true,
      fallbackOnLowConfidence: true,
      confidenceThreshold: 0.7,
      gridSize: 10,
      alwaysUseVision: false,
      preferredMethod: VisionMethod.HIERARCHY,
    };

    this.config = {
      driver: config.driver,
      apiKey: config.apiKey,
      llmProvider: config.llmProvider || "openai",
      model:
        config.model ||
        (config.llmProvider === "anthropic" ? "claude-3-5-sonnet-20241022" : "gpt-4o"),
      maxSteps: config.maxSteps || 20,
      timeoutSeconds: config.timeoutSeconds || 300,
      verbose: config.verbose !== undefined ? config.verbose : false,
      enableVisionFallback:
        config.enableVisionFallback !== undefined ? config.enableVisionFallback : true,
      visionConfig: { ...defaultVisionConfig, ...config.visionConfig },
    };

    // Set up vision fallback configuration
    // Honor visionConfig.enabled if explicitly provided, otherwise use enableVisionFallback
    const visionEnabled =
      config.visionConfig?.enabled !== undefined
        ? config.visionConfig.enabled
        : this.config.enableVisionFallback;

    this.visionConfig = {
      enabled: visionEnabled,
      fallbackOnElementNotFound:
        config.visionConfig?.fallbackOnElementNotFound !== undefined
          ? config.visionConfig.fallbackOnElementNotFound
          : true,
      fallbackOnLowConfidence:
        config.visionConfig?.fallbackOnLowConfidence !== undefined
          ? config.visionConfig.fallbackOnLowConfidence
          : true,
      confidenceThreshold: config.visionConfig?.confidenceThreshold || 0.7,
      gridSize: config.visionConfig?.gridSize || 10,
      alwaysUseVision: config.visionConfig?.alwaysUseVision || false,
      preferredMethod: config.visionConfig?.preferredMethod || VisionMethod.HIERARCHY,
      pureVisionOnly: config.visionConfig?.pureVisionOnly || false,
      pureVisionConfig: {
        enabled:
          config.visionConfig?.pureVisionConfig?.enabled !== undefined
            ? config.visionConfig.pureVisionConfig.enabled
            : true,
        minimumConfidence: config.visionConfig?.pureVisionConfig?.minimumConfidence || 0.5,
        usePercentageCoordinates:
          config.visionConfig?.pureVisionConfig?.usePercentageCoordinates !== undefined
            ? config.visionConfig.pureVisionConfig.usePercentageCoordinates
            : true,
      },
    };

    this.driver = config.driver;
    this.observer = new UIObserver();

    // Initialize LLM provider
    if (this.config.llmProvider === "openai") {
      this.llm = new OpenAIProvider(this.config.apiKey, this.config.model);
    } else if (this.config.llmProvider === "anthropic") {
      this.llm = new AnthropicProvider(this.config.apiKey, this.config.model);
    } else {
      throw new Error(`Unknown LLM provider: ${this.config.llmProvider}`);
    }

    if (this.config.verbose) {
      logger.level = LogLevel.DEBUG;
    }

    logger.info("MobileAgent initialized");
  }

  /**
   * Start a testing session
   */
  async startSession(): Promise<void> {
    logger.info("Starting test session");
    this.testResult = {
      success: false,
      task: "",
      steps: [],
      verificationResults: [],
      startTime: new Date(),
      durationSeconds: 0,
      screenshots: [],
      logs: [],
      metadata: {},
    };
    this.actionHistory = [];

    // Get initial state
    this.currentState = await this.observer.getUIState(this.driver);
    logger.info(`Session started on activity: ${this.currentState.activity}`);
  }

  /**
   * Execute a natural language instruction
   */
  async execute(instruction: string): Promise<void> {
    if (!this.testResult) {
      throw new Error("Session not started. Call startSession() first.");
    }

    logger.info(`Executing: ${instruction}`);
    this.testResult.task = instruction;

    let actionResponse: any;
    let targetElement: UIElement | undefined;
    let usedMethod: VisionMethod = VisionMethod.HIERARCHY;

    try {
      // Check if pure vision only mode is enabled
      if (this.visionConfig.pureVisionOnly) {
        logger.info("Pure vision only mode enabled, skipping hierarchy/tagging/grid");
        actionResponse = await this.tryPureVisionApproach(instruction);
        usedMethod = VisionMethod.PURE_VISION;

        // Re-resolve target element (though pure vision typically uses coordinates)
        if (actionResponse.elementId) {
          targetElement = this.currentState?.elements.find(
            (e) => e.elementId === actionResponse.elementId,
          );
        } else {
          targetElement = undefined; // Pure vision uses coordinates, not element IDs
        }

        logger.info("✓ Pure vision approach succeeded");
      } else {
        // Standard four-tier cascading fallback
        // Try Tier 1: Hierarchy-based approach
        actionResponse = await this.tryHierarchyApproach(instruction);
        usedMethod = VisionMethod.HIERARCHY;

        // Find target element
        if (actionResponse.elementId) {
          targetElement = this.currentState?.elements.find(
            (e) => e.elementId === actionResponse.elementId,
          );
        }

        // Check if we need to fallback to vision
        const shouldFallback = this.shouldFallbackToVision(actionResponse, targetElement);

        if (shouldFallback && this.visionConfig.enabled) {
          logger.warn("Hierarchy approach insufficient, falling back to vision methods");

          // Try Tier 2: Vision with numeric tagging
          try {
            actionResponse = await this.tryVisionTaggingApproach(instruction);
            usedMethod = VisionMethod.VISION_TAGGING;

            // Re-resolve target element after successful fallback
            if (actionResponse.elementId) {
              targetElement = this.currentState?.elements.find(
                (e) => e.elementId === actionResponse.elementId,
              );
            } else {
              targetElement = undefined; // Vision methods use coordinates, not element IDs
            }

            logger.info("✓ Vision tagging approach succeeded");
          } catch (error: any) {
            logger.warn(`Vision tagging failed: ${error.message}, trying grid overlay`);

            // Try Tier 3: Grid overlay
            try {
              actionResponse = await this.tryGridOverlayApproach(instruction);
              usedMethod = VisionMethod.GRID_OVERLAY;

              // Re-resolve target element after successful fallback
              if (actionResponse.elementId) {
                targetElement = this.currentState?.elements.find(
                  (e) => e.elementId === actionResponse.elementId,
                );
              } else {
                targetElement = undefined; // Grid uses coordinates, not element IDs
              }

              logger.info("✓ Grid overlay approach succeeded");
            } catch (gridError: any) {
              logger.warn(`Grid overlay failed: ${gridError.message}, trying pure vision`);

              // Try Tier 4: Pure vision (last resort)
              if (this.visionConfig.pureVisionConfig?.enabled) {
                actionResponse = await this.tryPureVisionApproach(instruction);
                usedMethod = VisionMethod.PURE_VISION;

                // Re-resolve target element after successful fallback
                if (actionResponse.elementId) {
                  targetElement = this.currentState?.elements.find(
                    (e) => e.elementId === actionResponse.elementId,
                  );
                } else {
                  targetElement = undefined; // Pure vision uses coordinates, not element IDs
                }

                logger.info("✓ Pure vision approach succeeded (Tier 4)");
              } else {
                throw gridError; // Rethrow grid error if pure vision disabled
              }
            }
          }
        }
      }

      logger.debug(`Action determined using ${usedMethod}: ${JSON.stringify(actionResponse)}`);

      // Execute the action
      const step = await this.executeAction(actionResponse.action as ActionType, targetElement, {
        ...(actionResponse.parameters || {}),
        coordinates: actionResponse.coordinates,
      });

      step.description = `[${usedMethod}] ${actionResponse.reasoning}`;
      this.testResult.steps.push(step);
      this.actionHistory.push(`${actionResponse.action} - ${actionResponse.reasoning}`);

      logger.info(`✓ Action executed successfully using ${usedMethod}`);
    } catch (error: any) {
      logger.error("Execution failed:", error);
      const failedStep: ActionStep = {
        actionType: ActionType.CLICK,
        parameters: {},
        description: instruction,
        timestamp: new Date(),
        success: false,
        error: error.message,
      };
      this.testResult.steps.push(failedStep);
      throw error;
    }
  }

  /**
   * Try hierarchy-based approach (Tier 1)
   */
  private async tryHierarchyApproach(instruction: string) {
    this.currentState = await this.observer.getUIState(this.driver, "none");
    const actionResponse = await this.llm.generateAction(
      this.currentState,
      instruction,
      this.actionHistory,
    );
    actionResponse.method = VisionMethod.HIERARCHY;
    return actionResponse;
  }

  /**
   * Try vision with numeric tagging (Tier 2)
   */
  private async tryVisionTaggingApproach(instruction: string) {
    this.currentState = await this.observer.getUIState(this.driver, "tagged");
    const actionResponse = await this.llm.generateActionWithVisionTagging(
      this.currentState,
      instruction,
      this.actionHistory,
    );
    return actionResponse;
  }

  /**
   * Try grid overlay approach (Tier 3)
   */
  private async tryGridOverlayApproach(instruction: string) {
    this.currentState = await this.observer.getUIState(
      this.driver,
      "grid",
      this.visionConfig.gridSize,
    );
    const actionResponse = await this.llm.generateActionWithGridOverlay(
      this.currentState,
      instruction,
      this.actionHistory,
    );
    return actionResponse;
  }

  private async tryPureVisionApproach(instruction: string) {
    // Update current state (for consistency with other tiers, even though pure vision doesn't use hierarchy)
    this.currentState = await this.observer.getUIState(this.driver, "screenshot");

    // Capture raw screenshot without overlays
    const screenshotBase64 =
      this.currentState.screenshotBase64 ||
      (await this.observer.captureScreenshotAsBase64(this.driver));
    const windowSize = await this.driver.getWindowSize();

    // Check minimum confidence requirement
    const minConfidence = this.visionConfig.pureVisionConfig?.minimumConfidence || 0.5;

    const actionResponse = await this.llm.generateActionWithPureVision(
      screenshotBase64,
      instruction,
      windowSize,
      this.actionHistory,
    );

    // Validate confidence
    if (actionResponse.confidence && actionResponse.confidence < minConfidence) {
      throw new Error(
        `Pure vision confidence too low: ${actionResponse.confidence} < ${minConfidence}`,
      );
    }

    logger.debug(
      `Pure vision located element "${actionResponse.element}" at ` +
        `${actionResponse.location?.x_percent}%, ${actionResponse.location?.y_percent}% ` +
        `(${actionResponse.coordinates?.x}, ${actionResponse.coordinates?.y})`,
    );

    return actionResponse;
  }

  /**
   * Determine if we should fallback to vision-based approach
   */
  private shouldFallbackToVision(actionResponse: any, targetElement?: UIElement): boolean {
    if (this.visionConfig.alwaysUseVision) {
      return true;
    }

    // Fallback if element not found
    if (this.visionConfig.fallbackOnElementNotFound && actionResponse.elementId && !targetElement) {
      logger.debug("Fallback triggered: Element not found");
      return true;
    }

    // Fallback if confidence is too low
    if (
      this.visionConfig.fallbackOnLowConfidence &&
      actionResponse.confidence !== undefined &&
      this.visionConfig.confidenceThreshold !== undefined
    ) {
      if (actionResponse.confidence < this.visionConfig.confidenceThreshold) {
        logger.debug(`Fallback triggered: Low confidence (${actionResponse.confidence})`);
        return true;
      }
    }

    // Fallback if action is error
    if (actionResponse.action === "error") {
      logger.debug("Fallback triggered: Error action");
      return true;
    }

    return false;
  }

  /**
   * Assert/verify a condition using natural language
   */
  async assert(condition: string): Promise<boolean> {
    if (!this.testResult) {
      throw new Error("Session not started. Call startSession() first.");
    }

    logger.info(`Verifying: ${condition}`);

    try {
      // Get current UI state
      this.currentState = await this.observer.getUIState(this.driver);

      // Query LLM for verification
      const verificationResponse = await this.llm.verifyCondition(
        this.currentState,
        condition,
        this.actionHistory,
      );

      logger.debug(`Verification result: ${JSON.stringify(verificationResponse)}`);

      const verification: VerificationPoint = {
        name: condition,
        description: condition,
        assertionType: "llm_verification",
        expectedValue: true,
        actualValue: verificationResponse.passed,
        status: verificationResponse.passed ? VerificationStatus.PASSED : VerificationStatus.FAILED,
        errorMessage: verificationResponse.issues?.join(", "),
      };

      this.testResult.verificationResults.push(verification);

      if (verificationResponse.passed) {
        logger.info(`✓ Assertion passed: ${condition}`);
      } else {
        logger.warn(`✗ Assertion failed: ${condition}`);
      }

      return verificationResponse.passed;
    } catch (error: any) {
      logger.error("Assertion failed:", error);
      const verification: VerificationPoint = {
        name: condition,
        description: condition,
        assertionType: "llm_verification",
        expectedValue: true,
        actualValue: false,
        status: VerificationStatus.ERROR,
        errorMessage: error.message,
      };
      this.testResult.verificationResults.push(verification);
      return false;
    }
  }

  /**
   * Verify a condition once without mutating the testResult (utility for waits)
   */
  private async verifyConditionOneShot(condition: string): Promise<boolean> {
    try {
      this.currentState = await this.observer.getUIState(this.driver);
      const res = await this.llm.verifyCondition(this.currentState, condition, this.actionHistory);
      return Boolean(res.passed);
    } catch {
      return false;
    }
  }

  /**
   * Wait until a verification condition passes (verification-as-a-wait).
   * Falls back to timebox expiry to avoid hangs.
   */
  async waitForCondition(condition: string, timeoutMs = 5000, pollMs = 800): Promise<boolean> {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const ok = await this.verifyConditionOneShot(condition);
      if (ok) return true;
      await this.driver.pause(pollMs);
    }
    return false;
  }

  /**
   * Execute an instruction, then block until a verification condition passes
   * or the timeout elapses. Returns whether the condition passed in time.
   */
  async executeAndWait(
    instruction: string,
    expectedCondition: string,
    options: { timeoutMs?: number; pollMs?: number } = {},
  ): Promise<boolean> {
    await this.execute(instruction);
    return await this.waitForCondition(
      expectedCondition,
      options.timeoutMs ?? 5000,
      options.pollMs ?? 800,
    );
  }

  /**
   * Stop the testing session
   */
  async stopSession(status: "success" | "failure"): Promise<TestResult> {
    if (!this.testResult) {
      throw new Error("Session not started. Call startSession() first.");
    }

    logger.info(`Stopping session with status: ${status}`);

    this.testResult.success = status === "success";
    this.testResult.endTime = new Date();
    this.testResult.durationSeconds =
      (this.testResult.endTime.getTime() - this.testResult.startTime.getTime()) / 1000;

    logger.info(`Session completed in ${this.testResult.durationSeconds.toFixed(1)}s`);
    logger.info(`Total steps: ${this.testResult.steps.length}`);
    logger.info(`Verifications: ${this.testResult.verificationResults.length}`);

    return this.testResult;
  }

  /**
   * Get current UI state
   */
  async getCurrentState(): Promise<UIState> {
    return await this.observer.getUIState(this.driver);
  }

  /**
   * Execute a specific action
   */
  private async executeAction(
    actionType: ActionType,
    targetElement?: UIElement,
    parameters: Record<string, any> = {},
  ): Promise<ActionStep> {
    const step: ActionStep = {
      actionType,
      targetElement,
      targetElementId: targetElement?.elementId,
      parameters,
      description: "",
      timestamp: new Date(),
      success: false,
    };

    try {
      // Capture pre-action screenshot
      try {
        const before = await this.observer.captureScreenshotAsBase64(this.driver);
        step.screenshotBefore = before;
        this.maybePersistScreenshot(before, "before");
      } catch {
        /* ignoring screenshot failure before action */
      }

      switch (actionType) {
        case ActionType.CLICK:
        case ActionType.TAP:
          await this.clickElement(targetElement, parameters.coordinates);
          break;

        case ActionType.TYPE_TEXT:
          await this.typeText(targetElement, parameters.text || "", parameters.coordinates);
          break;

        case ActionType.SWIPE:
          await this.swipe(parameters.direction || "up", parameters.distance || 0.5);
          break;

        case ActionType.SCROLL:
          await this.scroll(parameters.direction || "down");
          break;

        case ActionType.LONG_PRESS:
          await this.longPress(targetElement, parameters.coordinates);
          break;

        case ActionType.DOUBLE_TAP:
          await this.doubleTap(targetElement, parameters.coordinates);
          break;

        case ActionType.PINCH:
          await this.pinch(targetElement, parameters.coordinates);
          break;

        case ActionType.ZOOM:
          await this.zoom(targetElement, parameters.coordinates);
          break;

        default:
          throw new Error(`Unsupported action type: ${actionType}`);
      }

      // Capture post-action screenshot
      try {
        const after = await this.observer.captureScreenshotAsBase64(this.driver);
        step.screenshotAfter = after;
        this.maybePersistScreenshot(after, "after");
      } catch {
        /* ignoring screenshot failure after action */
      }

      step.success = true;
    } catch (error: any) {
      step.success = false;
      step.error = error.message;
      logger.error(`Action failed: ${error.message}`);
    }

    return step;
  }

  /**
   * Click on an element or coordinates
   */
  private async clickElement(
    element?: UIElement,
    coordinates?: { x: number; y: number },
  ): Promise<void> {
    let targetCoords = coordinates;

    // If no coordinates provided, get from element
    if (!targetCoords) {
      if (!element) {
        throw new Error("No element or coordinates to click");
      }

      const center = this.observer.getElementCenter(element);
      if (!center) {
        throw new Error("Element has no bounds");
      }
      targetCoords = center;
    }

    logger.debug(`Clicking at (${targetCoords.x}, ${targetCoords.y})`);
    await this.driver.touchAction({
      action: "tap",
      x: targetCoords.x,
      y: targetCoords.y,
    });

    // Wait for UI to settle rather than fixed sleep
    await this.waitForUiSettle(1200);
  }

  /**
   * Type text into an element
   */
  private async typeText(
    element?: UIElement,
    text = "",
    coordinates?: { x: number; y: number },
  ): Promise<void> {
    // Click to focus (using either element or coordinates)
    await this.clickElement(element, coordinates);

    // Type text
    logger.debug(`Typing text: ${text}`);
    await this.driver.keys(text.split(""));

    // Wait for keyboard/IME updates to settle
    await this.waitForUiSettle(1000);
  }

  /**
   * Swipe in a direction
   */
  private async swipe(direction: string, distance = 0.5): Promise<void> {
    const windowSize = await this.driver.getWindowSize();
    const centerX = Math.floor(windowSize.width / 2);
    const centerY = Math.floor(windowSize.height / 2);
    const delta = Math.floor(windowSize.height * distance);

    let startX = centerX;
    let startY = centerY;
    let endX = centerX;
    let endY = centerY;

    switch (direction.toLowerCase()) {
      case "up":
        startY = centerY + delta;
        endY = centerY - delta;
        break;
      case "down":
        startY = centerY - delta;
        endY = centerY + delta;
        break;
      case "left":
        startX = centerX + delta;
        endX = centerX - delta;
        break;
      case "right":
        startX = centerX - delta;
        endX = centerX + delta;
        break;
    }

    logger.debug(`Swiping ${direction}: (${startX},${startY}) -> (${endX},${endY})`);
    await this.driver.touchAction([
      { action: "press", x: startX, y: startY },
      { action: "wait", ms: 100 },
      { action: "moveTo", x: endX, y: endY },
      { action: "release" },
    ]);

    await this.waitForUiSettle(1000);
  }

  /**
   * Scroll in a direction
   */
  private async scroll(direction: string): Promise<void> {
    await this.swipe(direction, 0.3);
  }

  /**
   * Long press on an element or coordinates
   */
  private async longPress(
    element?: UIElement,
    coordinates?: { x: number; y: number },
  ): Promise<void> {
    let targetCoords = coordinates;

    // If no coordinates provided, get from element
    if (!targetCoords) {
      if (!element) {
        throw new Error("No element or coordinates to long press");
      }

      const center = this.observer.getElementCenter(element);
      if (!center) {
        throw new Error("Element has no bounds");
      }
      targetCoords = center;
    }

    logger.debug(`Long pressing at (${targetCoords.x}, ${targetCoords.y})`);
    await this.driver.touchAction([
      { action: "press", x: targetCoords.x, y: targetCoords.y },
      { action: "wait", ms: 1000 },
      { action: "release" },
    ]);

    await this.driver.pause(500);
  }

  /**
   * Double tap on an element or coordinates
   */
  private async doubleTap(
    element?: UIElement,
    coordinates?: { x: number; y: number },
  ): Promise<void> {
    let targetCoords = coordinates;
    if (!targetCoords) {
      if (!element) throw new Error("No element or coordinates to double tap");
      const center = this.observer.getElementCenter(element);
      if (!center) throw new Error("Element has no bounds");
      targetCoords = center;
    }

    await this.driver.touchAction({ action: "tap", x: targetCoords.x, y: targetCoords.y });
    await this.driver.pause(75);
    await this.driver.touchAction({ action: "tap", x: targetCoords.x, y: targetCoords.y });
    await this.waitForUiSettle(800);
  }

  /**
   * Pinch gesture around a target point (zoom out)
   */
  private async pinch(element?: UIElement, coordinates?: { x: number; y: number }): Promise<void> {
    const center = coordinates || (element ? this.observer.getElementCenter(element) : undefined);
    if (!center) throw new Error("No target for pinch gesture");

    const startOffset = 100; // pixels from center
    const duration = 250;

    const finger1Start = { x: center.x - startOffset, y: center.y };
    const finger1End = { x: center.x - 10, y: center.y };
    const finger2Start = { x: center.x + startOffset, y: center.y };
    const finger2End = { x: center.x + 10, y: center.y };

    await this.driver.performActions([
      {
        type: "pointer",
        id: "finger1",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: 0, x: finger1Start.x, y: finger1Start.y },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: 50 },
          { type: "pointerMove", duration, x: finger1End.x, y: finger1End.y },
          { type: "pointerUp", button: 0 },
        ],
      },
      {
        type: "pointer",
        id: "finger2",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: 0, x: finger2Start.x, y: finger2Start.y },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: 50 },
          { type: "pointerMove", duration, x: finger2End.x, y: finger2End.y },
          { type: "pointerUp", button: 0 },
        ],
      },
    ] as any);

    await this.driver.releaseActions();
    await this.waitForUiSettle(800);
  }

  /**
   * Zoom gesture around a target point (zoom in)
   */
  private async zoom(element?: UIElement, coordinates?: { x: number; y: number }): Promise<void> {
    const center = coordinates || (element ? this.observer.getElementCenter(element) : undefined);
    if (!center) throw new Error("No target for zoom gesture");

    const endOffset = 100; // pixels from center
    const duration = 250;

    const finger1Start = { x: center.x - 10, y: center.y };
    const finger1End = { x: center.x - endOffset, y: center.y };
    const finger2Start = { x: center.x + 10, y: center.y };
    const finger2End = { x: center.x + endOffset, y: center.y };

    await this.driver.performActions([
      {
        type: "pointer",
        id: "finger1",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: 0, x: finger1Start.x, y: finger1Start.y },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: 50 },
          { type: "pointerMove", duration, x: finger1End.x, y: finger1End.y },
          { type: "pointerUp", button: 0 },
        ],
      },
      {
        type: "pointer",
        id: "finger2",
        parameters: { pointerType: "touch" },
        actions: [
          { type: "pointerMove", duration: 0, x: finger2Start.x, y: finger2Start.y },
          { type: "pointerDown", button: 0 },
          { type: "pause", duration: 50 },
          { type: "pointerMove", duration, x: finger2End.x, y: finger2End.y },
          { type: "pointerUp", button: 0 },
        ],
      },
    ] as any);

    await this.driver.releaseActions();
    await this.waitForUiSettle(800);
  }

  /**
   * Wait until the UI appears stable by sampling page source over time.
   * This avoids brittle hard sleeps after actions.
   */
  private async waitForUiSettle(
    timeoutMs = 1200,
    stableIterations = 2,
    pollMs = 150,
  ): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    let lastSource: string | undefined;
    let stable = 0;

    while (Date.now() < deadline) {
      try {
        const src = await this.driver.getPageSource();
        if (lastSource !== undefined && src === lastSource) {
          stable++;
          if (stable >= stableIterations) return;
        } else {
          stable = 0;
          lastSource = src;
        }
      } catch {
        // If we can't fetch immediately, just continue polling
      }
      await this.driver.pause(pollMs);
    }
    // Timeboxed: proceed even if not strictly stabilized
  }

  /**
   * Persist screenshot to artifacts directory if configured.
   */
  private maybePersistScreenshot(base64: string, phase: "before" | "after") {
    try {
      const dir = process.env.ARTIFACTS_DIR;
      if (!dir) return;
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const idx = ++this.screenshotCounter;
      const filePath = `${dir}/step_${idx}_${phase}.png`;
      fs.writeFileSync(filePath, Buffer.from(base64, "base64"));
      this.testResult?.screenshots.push(filePath);
    } catch {
      /* ignoring artifact persistence failure */
    }
  }
}
