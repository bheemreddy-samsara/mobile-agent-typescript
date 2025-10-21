/**
 * Unit tests for MobileAgent configuration
 * Tests bug fixes and configuration handling
 */

import { MobileAgent } from "../src/MobileAgent";
import { VisionMethod } from "../src/types";

// Mock WebDriverIO Browser
const mockDriver: any = {
  getPageSource: jest.fn().mockResolvedValue("<hierarchy></hierarchy>"),
  getCurrentActivity: jest.fn().mockResolvedValue("MainActivity"),
  capabilities: {
    platformName: "Android",
  },
  getWindowSize: jest.fn().mockResolvedValue({ width: 1080, height: 1920 }),
};

describe("MobileAgent Configuration", () => {
  describe("Bug #1: visionConfig.enabled should be honored", () => {
    it("should respect visionConfig.enabled when explicitly set to false", () => {
      const agent = new MobileAgent({
        driver: mockDriver,
        apiKey: "test-key",
        visionConfig: {
          enabled: false,
        },
      });

      // Access private property for testing
      const visionConfig = (agent as any).visionConfig;

      expect(visionConfig.enabled).toBe(false);
    });

    it("should respect visionConfig.enabled when explicitly set to true", () => {
      const agent = new MobileAgent({
        driver: mockDriver,
        apiKey: "test-key",
        visionConfig: {
          enabled: true,
        },
      });

      const visionConfig = (agent as any).visionConfig;

      expect(visionConfig.enabled).toBe(true);
    });

    it("should use enableVisionFallback when visionConfig.enabled is not set", () => {
      const agent = new MobileAgent({
        driver: mockDriver,
        apiKey: "test-key",
        enableVisionFallback: false,
      });

      const visionConfig = (agent as any).visionConfig;

      expect(visionConfig.enabled).toBe(false);
    });

    it("should prioritize visionConfig.enabled over enableVisionFallback", () => {
      // This is the key test: nested config should win
      const agent = new MobileAgent({
        driver: mockDriver,
        apiKey: "test-key",
        enableVisionFallback: true, // Top-level says enable
        visionConfig: {
          enabled: false, // But nested says disable
        },
      });

      const visionConfig = (agent as any).visionConfig;

      // Nested config should take priority
      expect(visionConfig.enabled).toBe(false);
    });

    it("should default to true when neither is set", () => {
      const agent = new MobileAgent({
        driver: mockDriver,
        apiKey: "test-key",
      });

      const visionConfig = (agent as any).visionConfig;

      expect(visionConfig.enabled).toBe(true);
    });
  });

  describe("Bug #2: visionConfig should merge with defaults correctly", () => {
    it("should merge partial visionConfig with defaults", () => {
      const agent = new MobileAgent({
        driver: mockDriver,
        apiKey: "test-key",
        visionConfig: {
          enabled: true,
          gridSize: 15, // Custom value
          // Other values should use defaults
        },
      });

      const visionConfig = (agent as any).visionConfig;

      expect(visionConfig.enabled).toBe(true);
      expect(visionConfig.gridSize).toBe(15);
      expect(visionConfig.fallbackOnElementNotFound).toBe(true); // Default
      expect(visionConfig.fallbackOnLowConfidence).toBe(true); // Default
      expect(visionConfig.confidenceThreshold).toBe(0.7); // Default
    });

    it("should allow overriding all config values", () => {
      const agent = new MobileAgent({
        driver: mockDriver,
        apiKey: "test-key",
        visionConfig: {
          enabled: false,
          fallbackOnElementNotFound: false,
          fallbackOnLowConfidence: false,
          confidenceThreshold: 0.9,
          gridSize: 20,
          alwaysUseVision: true,
          preferredMethod: VisionMethod.VISION_TAGGING,
        },
      });

      const visionConfig = (agent as any).visionConfig;

      expect(visionConfig.enabled).toBe(false);
      expect(visionConfig.fallbackOnElementNotFound).toBe(false);
      expect(visionConfig.fallbackOnLowConfidence).toBe(false);
      expect(visionConfig.confidenceThreshold).toBe(0.9);
      expect(visionConfig.gridSize).toBe(20);
      expect(visionConfig.alwaysUseVision).toBe(true);
      expect(visionConfig.preferredMethod).toBe(VisionMethod.VISION_TAGGING);
    });
  });
});
