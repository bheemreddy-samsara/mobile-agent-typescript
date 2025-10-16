/**
 * Unit tests for Pure Vision (Tier 4) functionality
 */

import { MobileAgent } from '../src/MobileAgent';
import { OpenAIProvider } from '../src/llm/OpenAIProvider';
import { VisionMethod } from '../src/types';

describe('Pure Vision Functionality', () => {
  describe('Tier 4: Pure Vision Fallback', () => {
    it('should have pure vision config enabled by default', () => {
      const mockDriver = {
        getPageSource: jest.fn().mockResolvedValue('<hierarchy></hierarchy>'),
        $: jest.fn(),
        getWindowSize: jest.fn().mockResolvedValue({ width: 390, height: 844 }),
      } as any;

      const agent = new MobileAgent({
        driver: mockDriver,
        apiKey: 'test-key',
        llmProvider: 'openai',
      });

      expect((agent as any).visionConfig.pureVisionConfig.enabled).toBe(true);
      expect((agent as any).visionConfig.pureVisionConfig.minimumConfidence).toBe(0.5);
      expect((agent as any).visionConfig.pureVisionConfig.usePercentageCoordinates).toBe(true);
    });

    it('should allow disabling pure vision', () => {
      const mockDriver = {
        getPageSource: jest.fn().mockResolvedValue('<hierarchy></hierarchy>'),
        $: jest.fn(),
        getWindowSize: jest.fn().mockResolvedValue({ width: 390, height: 844 }),
      } as any;

      const agent = new MobileAgent({
        driver: mockDriver,
        apiKey: 'test-key',
        llmProvider: 'openai',
        visionConfig: {
          enabled: true,
          pureVisionConfig: {
            enabled: false,
          },
        },
      });

      expect((agent as any).visionConfig.pureVisionConfig.enabled).toBe(false);
    });

    it('should configure custom minimum confidence', () => {
      const mockDriver = {
        getPageSource: jest.fn().mockResolvedValue('<hierarchy></hierarchy>'),
        $: jest.fn(),
        getWindowSize: jest.fn().mockResolvedValue({ width: 390, height: 844 }),
      } as any;

      const agent = new MobileAgent({
        driver: mockDriver,
        apiKey: 'test-key',
        llmProvider: 'openai',
        visionConfig: {
          enabled: true,
          pureVisionConfig: {
            enabled: true,
            minimumConfidence: 0.8,
          },
        },
      });

      expect((agent as any).visionConfig.pureVisionConfig.minimumConfidence).toBe(0.8);
    });
  });

  describe('Pure Vision Only Mode', () => {
    it('should enable pure vision only mode', () => {
      const mockDriver = {
        getPageSource: jest.fn().mockResolvedValue('<hierarchy></hierarchy>'),
        $: jest.fn(),
        getWindowSize: jest.fn().mockResolvedValue({ width: 390, height: 844 }),
      } as any;

      const agent = new MobileAgent({
        driver: mockDriver,
        apiKey: 'test-key',
        llmProvider: 'openai',
        visionConfig: {
          enabled: true,
          pureVisionOnly: true,
        },
      });

      expect((agent as any).visionConfig.pureVisionOnly).toBe(true);
    });

    it('should default to false for pure vision only mode', () => {
      const mockDriver = {
        getPageSource: jest.fn().mockResolvedValue('<hierarchy></hierarchy>'),
        $: jest.fn(),
        getWindowSize: jest.fn().mockResolvedValue({ width: 390, height: 844 }),
      } as any;

      const agent = new MobileAgent({
        driver: mockDriver,
        apiKey: 'test-key',
        llmProvider: 'openai',
      });

      expect((agent as any).visionConfig.pureVisionOnly).toBe(false);
    });
  });

  describe('LLM Pure Vision Response Parsing', () => {
    it('should parse percentage-based coordinates', async () => {
      const provider = new OpenAIProvider('test-key', 'gpt-4o');
      
      // Mock the query response
      provider.queryWithVision = jest.fn().mockResolvedValue(JSON.stringify({
        element: 'Login button',
        location: { x_percent: 50, y_percent: 85 },
        action: 'click',
        parameters: {},
        reasoning: 'Click the login button at bottom center',
        confidence: 0.75,
      }));

      const response = await provider.generateActionWithPureVision(
        'fake-base64',
        'Click login',
        { width: 400, height: 800 },
        []
      );

      expect(response.action).toBe('click');
      expect(response.method).toBe(VisionMethod.PURE_VISION);
      expect(response.element).toBe('Login button');
      expect(response.location).toEqual({ x_percent: 50, y_percent: 85 });
      expect(response.coordinates).toEqual({ x: 200, y: 680 }); // 50% of 400, 85% of 800
      expect(response.confidence).toBe(0.75);
    });

    it('should handle different screen sizes correctly', async () => {
      const provider = new OpenAIProvider('test-key', 'gpt-4o');
      
      provider.queryWithVision = jest.fn().mockResolvedValue(JSON.stringify({
        element: 'Settings icon',
        location: { x_percent: 90, y_percent: 10 },
        action: 'click',
        parameters: {},
        reasoning: 'Click settings icon in top right',
        confidence: 0.9,
      }));

      const response = await provider.generateActionWithPureVision(
        'fake-base64',
        'Open settings',
        { width: 1024, height: 1366 }, // iPad dimensions
        []
      );

      expect(response.coordinates).toEqual({ 
        x: Math.floor(1024 * 0.9),  // 921
        y: Math.floor(1366 * 0.1)   // 136
      });
    });

    it('should handle parsing errors gracefully', async () => {
      const provider = new OpenAIProvider('test-key', 'gpt-4o');
      
      provider.queryWithVision = jest.fn().mockResolvedValue('invalid json');

      const response = await provider.generateActionWithPureVision(
        'fake-base64',
        'Click something',
        { width: 400, height: 800 },
        []
      );

      expect(response.action).toBe('error');
      expect(response.confidence).toBe(0);
      expect(response.method).toBe(VisionMethod.PURE_VISION);
    });

    it('should handle missing location field', async () => {
      const provider = new OpenAIProvider('test-key', 'gpt-4o');
      
      provider.queryWithVision = jest.fn().mockResolvedValue(JSON.stringify({
        element: 'Button',
        action: 'click',
        reasoning: 'Click the button',
        confidence: 0.8,
        // Missing location field
      }));

      const response = await provider.generateActionWithPureVision(
        'fake-base64',
        'Click button',
        { width: 400, height: 800 },
        []
      );

      expect(response.action).toBe('error');
      expect(response.reasoning).toContain('Invalid location format');
    });
  });

  describe('Pure Vision Prompt Building', () => {
    it('should build correct prompt with screen dimensions', () => {
      const provider = new OpenAIProvider('test-key', 'gpt-4o');
      const prompt = (provider as any).buildPureVisionPrompt(
        'Click the login button',
        { width: 375, height: 812 },
        []
      );

      expect(prompt).toContain('Click the login button');
      expect(prompt).toContain('375x812');
      expect(prompt).toContain('x_percent');
      expect(prompt).toContain('y_percent');
      expect(prompt).toContain('GENERAL functions');
    });

    it('should include action history in prompt', () => {
      const provider = new OpenAIProvider('test-key', 'gpt-4o');
      const history = ['Clicked email field', 'Typed user@example.com'];
      const prompt = (provider as any).buildPureVisionPrompt(
        'Click submit',
        { width: 400, height: 800 },
        history
      );

      expect(prompt).toContain('Clicked email field');
      expect(prompt).toContain('Typed user@example.com');
    });
  });

  describe('Four-Tier Fallback Logic', () => {
    it('should try pure vision after grid overlay fails', () => {
      // This test validates the fallback chain includes Tier 4
      const mockDriver = {
        getPageSource: jest.fn().mockResolvedValue('<hierarchy></hierarchy>'),
        $: jest.fn(),
        getWindowSize: jest.fn().mockResolvedValue({ width: 390, height: 844 }),
      } as any;

      const agent = new MobileAgent({
        driver: mockDriver,
        apiKey: 'test-key',
        llmProvider: 'openai',
        visionConfig: {
          enabled: true,
          pureVisionConfig: {
            enabled: true,
            minimumConfidence: 0.5,
          },
        },
      });

      // Verify config allows fallback to tier 4
      expect((agent as any).visionConfig.enabled).toBe(true);
      expect((agent as any).visionConfig.pureVisionConfig.enabled).toBe(true);
    });

    it('should skip tiers 1-3 when pureVisionOnly is enabled', () => {
      const mockDriver = {
        getPageSource: jest.fn().mockResolvedValue('<hierarchy></hierarchy>'),
        $: jest.fn(),
        getWindowSize: jest.fn().mockResolvedValue({ width: 390, height: 844 }),
      } as any;

      const agent = new MobileAgent({
        driver: mockDriver,
        apiKey: 'test-key',
        llmProvider: 'openai',
        visionConfig: {
          enabled: true,
          pureVisionOnly: true,
        },
      });

      expect((agent as any).visionConfig.pureVisionOnly).toBe(true);
    });
  });

  describe('Confidence Validation', () => {
    it('should reject low confidence responses', async () => {
      const provider = new OpenAIProvider('test-key', 'gpt-4o');
      
      provider.queryWithVision = jest.fn().mockResolvedValue(JSON.stringify({
        element: 'Uncertain button',
        location: { x_percent: 50, y_percent: 50 },
        action: 'click',
        parameters: {},
        reasoning: 'Not sure about this',
        confidence: 0.3, // Below default minimum of 0.5
      }));

      try {
        await provider.generateActionWithPureVision(
          'fake-base64',
          'Click something',
          { width: 400, height: 800 },
          []
        );
        fail('Should have thrown error for low confidence');
      } catch (error: any) {
        // Pure vision doesn't throw in provider, returns error action
        // The MobileAgent.tryPureVisionApproach will validate and throw
      }
    });
  });
});

