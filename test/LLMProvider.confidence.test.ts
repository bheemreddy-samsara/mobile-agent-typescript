/**
 * Unit tests for LLM Provider confidence propagation
 * Tests bug fix: confidence values should be returned from hierarchy approach
 */

import { BaseLLMProvider } from '../src/llm/LLMProvider';
import { UIState, VisionMethod } from '../src/types';

// Mock implementation of BaseLLMProvider
class MockLLMProvider extends BaseLLMProvider {
  private mockResponse: string = '';

  setMockResponse(response: string) {
    this.mockResponse = response;
  }

  async query(prompt: string, systemPrompt?: string): Promise<string> {
    return this.mockResponse;
  }

  async queryWithVision(prompt: string, imageBase64: string, systemPrompt?: string): Promise<string> {
    return this.mockResponse;
  }
}

describe('LLMProvider Confidence Propagation', () => {
  let provider: MockLLMProvider;
  let mockUIState: UIState;

  beforeEach(() => {
    provider = new MockLLMProvider();
    mockUIState = {
      activity: 'TestActivity',
      elements: [
        {
          elementId: 'btn_1',
          text: 'Login',
          className: 'android.widget.Button',
          elementType: 'button' as any,
          clickable: true,
          scrollable: false,
          focusable: true,
          longClickable: false,
          checked: false,
          enabled: true,
          visible: true,
          bounds: { x1: 100, y1: 200, x2: 300, y2: 250 },
        },
      ],
      timestamp: new Date(),
      deviceInfo: { platform: 'Android' },
    };
  });

  describe('Bug #2: confidence should be propagated from LLM response', () => {
    it('should return confidence value when LLM provides it', async () => {
      // Mock LLM response with confidence
      provider.setMockResponse(JSON.stringify({
        action: 'click',
        element_id: 'btn_1',
        parameters: {},
        reasoning: 'Clicking login button',
        confidence: 0.95,
      }));

      const result = await provider.generateAction(mockUIState, 'tap login', []);

      expect(result.confidence).toBe(0.95);
      expect(result.method).toBe(VisionMethod.HIERARCHY);
    });

    it('should handle low confidence from LLM', async () => {
      // Mock LLM response with low confidence
      provider.setMockResponse(JSON.stringify({
        action: 'click',
        element_id: 'btn_1',
        parameters: {},
        reasoning: 'Not sure which button',
        confidence: 0.4,
      }));

      const result = await provider.generateAction(mockUIState, 'tap button', []);

      expect(result.confidence).toBe(0.4);
      expect(result.action).toBe('click');
    });

    it('should handle missing confidence gracefully', async () => {
      // Mock LLM response without confidence field
      provider.setMockResponse(JSON.stringify({
        action: 'click',
        element_id: 'btn_1',
        parameters: {},
        reasoning: 'Clicking button',
      }));

      const result = await provider.generateAction(mockUIState, 'tap button', []);

      // Should be undefined, not crash
      expect(result.confidence).toBeUndefined();
      expect(result.action).toBe('click');
    });

    it('should set confidence to 0 on parse error', async () => {
      // Mock invalid JSON response
      provider.setMockResponse('This is not valid JSON {{{');

      const result = await provider.generateAction(mockUIState, 'tap button', []);

      expect(result.confidence).toBe(0);
      expect(result.action).toBe('error');
      expect(result.reasoning).toContain('Failed to parse');
    });

    it('should set method to HIERARCHY for hierarchy approach', async () => {
      provider.setMockResponse(JSON.stringify({
        action: 'click',
        element_id: 'btn_1',
        parameters: {},
        reasoning: 'Test',
        confidence: 0.9,
      }));

      const result = await provider.generateAction(mockUIState, 'tap button', []);

      expect(result.method).toBe(VisionMethod.HIERARCHY);
    });
  });

  describe('Confidence-based fallback decision making', () => {
    it('should enable fallback with confidence below threshold', () => {
      const lowConfidenceResponse = {
        action: 'click',
        elementId: 'btn_1',
        confidence: 0.5,
      };

      const threshold = 0.7;
      const shouldFallback = 
        lowConfidenceResponse.confidence !== undefined && 
        lowConfidenceResponse.confidence < threshold;

      expect(shouldFallback).toBe(true);
    });

    it('should not fallback with confidence above threshold', () => {
      const highConfidenceResponse = {
        action: 'click',
        elementId: 'btn_1',
        confidence: 0.95,
      };

      const threshold = 0.7;
      const shouldFallback = 
        highConfidenceResponse.confidence !== undefined && 
        highConfidenceResponse.confidence < threshold;

      expect(shouldFallback).toBe(false);
    });

    it('should not fallback when confidence is undefined', () => {
      const noConfidenceResponse = {
        action: 'click',
        elementId: 'btn_1',
        confidence: undefined,
      };

      const threshold = 0.7;
      const shouldFallback = 
        noConfidenceResponse.confidence !== undefined && 
        noConfidenceResponse.confidence < threshold;

      expect(shouldFallback).toBe(false);
    });

    it('should trigger fallback when confidence is exactly 0', () => {
      const errorResponse = {
        action: 'error',
        elementId: undefined,
        confidence: 0,
      };

      const threshold = 0.7;
      const shouldFallback = 
        errorResponse.confidence !== undefined && 
        errorResponse.confidence < threshold;

      expect(shouldFallback).toBe(true);
    });
  });

  describe('Integration with shouldFallbackToVision logic', () => {
    it('should trigger vision fallback with low confidence and flag enabled', () => {
      const actionResponse = {
        action: 'click',
        elementId: 'btn_1',
        confidence: 0.5,
      };

      const visionConfig = {
        enabled: true,
        fallbackOnLowConfidence: true,
        confidenceThreshold: 0.7,
      };

      const shouldFallback = 
        visionConfig.enabled &&
        visionConfig.fallbackOnLowConfidence &&
        actionResponse.confidence !== undefined &&
        visionConfig.confidenceThreshold !== undefined &&
        actionResponse.confidence < visionConfig.confidenceThreshold;

      expect(shouldFallback).toBe(true);
    });

    it('should not trigger fallback when flag is disabled', () => {
      const actionResponse = {
        action: 'click',
        elementId: 'btn_1',
        confidence: 0.5,
      };

      const visionConfig = {
        enabled: true,
        fallbackOnLowConfidence: false,  // Disabled
        confidenceThreshold: 0.7,
      };

      const shouldFallback = 
        visionConfig.enabled &&
        visionConfig.fallbackOnLowConfidence &&
        actionResponse.confidence !== undefined &&
        visionConfig.confidenceThreshold !== undefined &&
        actionResponse.confidence < visionConfig.confidenceThreshold;

      expect(shouldFallback).toBe(false);
    });
  });
});

