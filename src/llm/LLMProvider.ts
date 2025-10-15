/**
 * Abstract LLM Provider interface
 */

import { UIState, LLMActionResponse, LLMVerificationResponse } from '../types';

export interface LLMProvider {
  /**
   * Query the LLM with a prompt
   */
  query(prompt: string, systemPrompt?: string): Promise<string>;

  /**
   * Generate an action based on UI state and instruction
   */
  generateAction(uiState: UIState, instruction: string, history: string[]): Promise<LLMActionResponse>;

  /**
   * Verify a condition against the current UI state
   */
  verifyCondition(uiState: UIState, condition: string, history: string[]): Promise<LLMVerificationResponse>;
}

/**
 * Base class with helper methods
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract query(prompt: string, systemPrompt?: string): Promise<string>;

  async generateAction(
    uiState: UIState,
    instruction: string,
    history: string[]
  ): Promise<LLMActionResponse> {
    const prompt = this.buildActionPrompt(uiState, instruction, history);
    const response = await this.query(prompt);
    
    try {
      const parsed = JSON.parse(response);
      return {
        action: parsed.action || 'error',
        elementId: parsed.element_id || parsed.elementId,
        parameters: parsed.parameters || {},
        reasoning: parsed.reasoning || '',
      };
    } catch (error) {
      return {
        action: 'error',
        reasoning: `Failed to parse LLM response: ${response}`,
      };
    }
  }

  async verifyCondition(
    uiState: UIState,
    condition: string,
    history: string[]
  ): Promise<LLMVerificationResponse> {
    const prompt = this.buildVerificationPrompt(uiState, condition, history);
    const response = await this.query(prompt);
    
    try {
      const parsed = JSON.parse(response);
      return {
        passed: parsed.passed || false,
        assertions: parsed.assertions || [],
        issues: parsed.issues || [],
        confidence: parsed.confidence || 0,
      };
    } catch (error) {
      return {
        passed: false,
        issues: [`Failed to parse LLM response: ${response}`],
        confidence: 0,
      };
    }
  }

  private buildActionPrompt(uiState: UIState, instruction: string, history: string[]): string {
    const elementsDesc = uiState.elements
      .filter((e) => e.clickable && e.visible)
      .map((e) => {
        const bounds = e.bounds
          ? ` @ (${e.bounds.x1},${e.bounds.y1})-(${e.bounds.x2},${e.bounds.y2})`
          : '';
        return `  [${e.elementId}] ${e.elementType}: text='${e.text}' resource_id='${e.resourceId || ''}'${bounds}`;
      })
      .join('\n');

    const historyDesc = history.length > 0 ? `\nPrevious actions:\n${history.join('\n')}` : '';

    return `You are an expert mobile app testing agent. Analyze the following task and current UI state, then generate the next action to take.

Task: ${instruction}
${historyDesc}

Current UI State:
Activity: ${uiState.activity}
Device: ${uiState.deviceInfo.platform || 'Unknown'}

Interactive Elements:
${elementsDesc}

Respond with a JSON object containing:
- "action": the action type (click, type_text, swipe, scroll, etc.)
- "element_id": the target element ID from the list above
- "parameters": any action parameters (e.g., {"text": "hello"} for type_text)
- "reasoning": brief explanation of why this action

Example response:
{
  "action": "click",
  "element_id": "element_123",
  "parameters": {},
  "reasoning": "Clicking on the settings button to access settings"
}`;
  }

  private buildVerificationPrompt(uiState: UIState, condition: string, history: string[]): string {
    const elementsDesc = uiState.elements
      .filter((e) => e.visible)
      .slice(0, 50) // Limit to first 50 visible elements
      .map((e) => `  [${e.elementId}] ${e.elementType}: text='${e.text}' resource_id='${e.resourceId || ''}'`)
      .join('\n');

    const historyDesc = history.length > 0 ? `\nActions taken:\n${history.join('\n')}` : '';

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
}

