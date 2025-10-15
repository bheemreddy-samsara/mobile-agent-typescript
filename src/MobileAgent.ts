/**
 * Mobile Agent - Main agent for natural language mobile app testing
 */

import type { Browser } from 'webdriverio';
import { LLMProvider } from './llm/LLMProvider';
import { OpenAIProvider } from './llm/OpenAIProvider';
import { AnthropicProvider } from './llm/AnthropicProvider';
import { UIObserver } from './observer/UIObserver';
import {
  MobileAgentConfig,
  TestResult,
  ActionStep,
  ActionType,
  VerificationPoint,
  VerificationStatus,
  UIState,
  UIElement,
} from './types';
import { logger, LogLevel } from './utils/logger';

export class MobileAgent {
  private driver: Browser;
  private llm: LLMProvider;
  private observer: UIObserver;
  private config: Required<MobileAgentConfig>;
  private testResult?: TestResult;
  private actionHistory: string[] = [];
  private currentState?: UIState;

  constructor(config: MobileAgentConfig) {
    this.config = {
      driver: config.driver,
      apiKey: config.apiKey,
      llmProvider: config.llmProvider || 'openai',
      model: config.model || (config.llmProvider === 'anthropic' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o'),
      maxSteps: config.maxSteps || 20,
      timeoutSeconds: config.timeoutSeconds || 300,
      verbose: config.verbose !== undefined ? config.verbose : false,
    };

    this.driver = config.driver;
    this.observer = new UIObserver();

    // Initialize LLM provider
    if (this.config.llmProvider === 'openai') {
      this.llm = new OpenAIProvider(this.config.apiKey, this.config.model);
    } else if (this.config.llmProvider === 'anthropic') {
      this.llm = new AnthropicProvider(this.config.apiKey, this.config.model);
    } else {
      throw new Error(`Unknown LLM provider: ${this.config.llmProvider}`);
    }

    if (this.config.verbose) {
      logger.level = LogLevel.DEBUG;
    }

    logger.info('MobileAgent initialized');
  }

  /**
   * Start a testing session
   */
  async startSession(): Promise<void> {
    logger.info('Starting test session');
    this.testResult = {
      success: false,
      task: '',
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
      throw new Error('Session not started. Call startSession() first.');
    }

    logger.info(`Executing: ${instruction}`);
    this.testResult.task = instruction;

    try {
      // Get current UI state
      this.currentState = await this.observer.getUIState(this.driver);

      // Query LLM for action
      const actionResponse = await this.llm.generateAction(
        this.currentState,
        instruction,
        this.actionHistory
      );

      logger.debug(`LLM suggested action: ${JSON.stringify(actionResponse)}`);

      // Find target element
      const targetElement = this.currentState.elements.find(
        (e) => e.elementId === actionResponse.elementId
      );

      if (!targetElement && actionResponse.elementId) {
        throw new Error(`Element not found: ${actionResponse.elementId}`);
      }

      // Execute the action
      const step = await this.executeAction(
        actionResponse.action as ActionType,
        targetElement,
        actionResponse.parameters || {}
      );

      step.description = actionResponse.reasoning;
      this.testResult.steps.push(step);
      this.actionHistory.push(`${actionResponse.action} on ${targetElement?.text || 'element'}`);

      logger.info(`Action executed: ${actionResponse.reasoning}`);
    } catch (error: any) {
      logger.error('Execution failed:', error);
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
   * Assert/verify a condition using natural language
   */
  async assert(condition: string): Promise<boolean> {
    if (!this.testResult) {
      throw new Error('Session not started. Call startSession() first.');
    }

    logger.info(`Verifying: ${condition}`);

    try {
      // Get current UI state
      this.currentState = await this.observer.getUIState(this.driver);

      // Query LLM for verification
      const verificationResponse = await this.llm.verifyCondition(
        this.currentState,
        condition,
        this.actionHistory
      );

      logger.debug(`Verification result: ${JSON.stringify(verificationResponse)}`);

      const verification: VerificationPoint = {
        name: condition,
        description: condition,
        assertionType: 'llm_verification',
        expectedValue: true,
        actualValue: verificationResponse.passed,
        status: verificationResponse.passed ? VerificationStatus.PASSED : VerificationStatus.FAILED,
        errorMessage: verificationResponse.issues?.join(', '),
      };

      this.testResult.verificationResults.push(verification);

      if (verificationResponse.passed) {
        logger.info(`✓ Assertion passed: ${condition}`);
      } else {
        logger.warn(`✗ Assertion failed: ${condition}`);
      }

      return verificationResponse.passed;
    } catch (error: any) {
      logger.error('Assertion failed:', error);
      const verification: VerificationPoint = {
        name: condition,
        description: condition,
        assertionType: 'llm_verification',
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
   * Stop the testing session
   */
  async stopSession(status: 'success' | 'failure'): Promise<TestResult> {
    if (!this.testResult) {
      throw new Error('Session not started. Call startSession() first.');
    }

    logger.info(`Stopping session with status: ${status}`);

    this.testResult.success = status === 'success';
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
    parameters: Record<string, any> = {}
  ): Promise<ActionStep> {
    const step: ActionStep = {
      actionType,
      targetElement,
      targetElementId: targetElement?.elementId,
      parameters,
      description: '',
      timestamp: new Date(),
      success: false,
    };

    try {
      switch (actionType) {
        case ActionType.CLICK:
        case ActionType.TAP:
          await this.clickElement(targetElement);
          break;

        case ActionType.TYPE_TEXT:
          await this.typeText(targetElement, parameters.text || '');
          break;

        case ActionType.SWIPE:
          await this.swipe(
            parameters.direction || 'up',
            parameters.distance || 0.5
          );
          break;

        case ActionType.SCROLL:
          await this.scroll(parameters.direction || 'down');
          break;

        case ActionType.LONG_PRESS:
          await this.longPress(targetElement);
          break;

        default:
          throw new Error(`Unsupported action type: ${actionType}`);
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
   * Click on an element
   */
  private async clickElement(element?: UIElement): Promise<void> {
    if (!element) {
      throw new Error('No element to click');
    }

    const center = this.observer.getElementCenter(element);
    if (!center) {
      throw new Error('Element has no bounds');
    }

    logger.debug(`Clicking at (${center.x}, ${center.y})`);
    await this.driver.touchAction({
      action: 'tap',
      x: center.x,
      y: center.y,
    });

    // Wait a bit for UI to settle
    await this.driver.pause(500);
  }

  /**
   * Type text into an element
   */
  private async typeText(element?: UIElement, text: string = ''): Promise<void> {
    if (!element) {
      throw new Error('No element to type into');
    }

    // Click to focus
    await this.clickElement(element);

    // Type text
    logger.debug(`Typing text: ${text}`);
    await this.driver.keys(text.split(''));

    // Wait a bit
    await this.driver.pause(500);
  }

  /**
   * Swipe in a direction
   */
  private async swipe(direction: string, distance: number = 0.5): Promise<void> {
    const windowSize = await this.driver.getWindowSize();
    const centerX = Math.floor(windowSize.width / 2);
    const centerY = Math.floor(windowSize.height / 2);
    const delta = Math.floor(windowSize.height * distance);

    let startX = centerX;
    let startY = centerY;
    let endX = centerX;
    let endY = centerY;

    switch (direction.toLowerCase()) {
      case 'up':
        startY = centerY + delta;
        endY = centerY - delta;
        break;
      case 'down':
        startY = centerY - delta;
        endY = centerY + delta;
        break;
      case 'left':
        startX = centerX + delta;
        endX = centerX - delta;
        break;
      case 'right':
        startX = centerX - delta;
        endX = centerX + delta;
        break;
    }

    logger.debug(`Swiping ${direction}: (${startX},${startY}) -> (${endX},${endY})`);
    await this.driver.touchAction([
      { action: 'press', x: startX, y: startY },
      { action: 'wait', ms: 100 },
      { action: 'moveTo', x: endX, y: endY },
      { action: 'release' },
    ]);

    await this.driver.pause(500);
  }

  /**
   * Scroll in a direction
   */
  private async scroll(direction: string): Promise<void> {
    await this.swipe(direction, 0.3);
  }

  /**
   * Long press on an element
   */
  private async longPress(element?: UIElement): Promise<void> {
    if (!element) {
      throw new Error('No element to long press');
    }

    const center = this.observer.getElementCenter(element);
    if (!center) {
      throw new Error('Element has no bounds');
    }

    logger.debug(`Long pressing at (${center.x}, ${center.y})`);
    await this.driver.touchAction([
      { action: 'press', x: center.x, y: center.y },
      { action: 'wait', ms: 1000 },
      { action: 'release' },
    ]);

    await this.driver.pause(500);
  }
}

