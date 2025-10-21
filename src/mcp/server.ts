/**
 * MCP Server Implementation for Mobile Agent
 *
 * Exposes Mobile Agent SDK functionality via Model Context Protocol,
 * enabling agent-based workflows with Claude Desktop, Cursor, and other MCP clients.
 */

import * as fs from "node:fs";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import type { Browser } from "webdriverio";
import { remote } from "webdriverio";
import { MobileAgent } from "../MobileAgent.js";
import { logger } from "../utils/logger.js";
import { MOBILE_AGENT_TOOLS } from "./tools.js";

/**
 * MCP Server for Mobile Agent
 */
export class MobileAgentMCPServer {
  private server: Server;
  private agent: MobileAgent | null = null;
  private driver: Browser | null = null;
  private sessionActive = false;

  constructor() {
    this.server = new Server(
      {
        name: "mobile-agent",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
        },
      },
    );

    this.setupHandlers();
    this.setupErrorHandling();
  }

  /**
   * Setup request handlers
   */
  private setupHandlers(): void {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: MOBILE_AGENT_TOOLS.map((tool) => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
      })),
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "mobile_start_session":
            return await this.handleStartSession();

          case "mobile_stop_session":
            return await this.handleStopSession(args as { status: "success" | "failure" });

          case "mobile_execute":
            return await this.handleExecute(args as { instruction: string; visionMode?: string });

          case "mobile_assert":
            return await this.handleAssert(args as { condition: string });

          case "mobile_take_screenshot":
            return await this.handleTakeScreenshot(args as { saveToFile?: string });

          case "mobile_get_state":
            return await this.handleGetState(args as { includeScreenshot?: boolean });

          case "mobile_configure":
            return await this.handleConfigure(args as any);

          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error: any) {
        logger.error(`Tool execution failed: ${name}`, error);
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  /**
   * Setup error handling
   */
  private setupErrorHandling(): void {
    this.server.onerror = (error) => {
      logger.error("MCP Server error:", error);
    };

    process.on("SIGINT", async () => {
      await this.cleanup();
      process.exit(0);
    });
  }

  /**
   * Initialize WebDriverIO and Mobile Agent
   */
  private async initialize(): Promise<void> {
    if (this.driver && this.agent) {
      return; // Already initialized
    }

    // Get configuration from environment variables
    const platform = (process.env.MOBILE_PLATFORM || "Android") as "Android" | "iOS";
    const apiKey = process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;
    const llmProvider = process.env.LLM_PROVIDER || "openai";

    if (!apiKey) {
      throw new Error(
        "API key not found. Set OPENAI_API_KEY or ANTHROPIC_API_KEY environment variable.",
      );
    }

    // Build capabilities from env
    const caps: any = {
      platformName: platform,
      "appium:automationName":
        process.env.APPIUM_AUTOMATION_NAME || (platform === "iOS" ? "XCUITest" : "UiAutomator2"),
      "appium:noReset": process.env.APPIUM_NO_RESET === "true",
      "appium:newCommandTimeout": Number.parseInt(
        process.env.APPIUM_NEW_COMMAND_TIMEOUT || "120",
        10,
      ),
    };

    if (platform === "Android") {
      if (process.env.MOBILE_APP_PACKAGE)
        caps["appium:appPackage"] = process.env.MOBILE_APP_PACKAGE;
      if (process.env.MOBILE_APP_ACTIVITY)
        caps["appium:appActivity"] = process.env.MOBILE_APP_ACTIVITY;
      if (process.env.MOBILE_DEVICE_NAME)
        caps["appium:deviceName"] = process.env.MOBILE_DEVICE_NAME;
      if (process.env.MOBILE_UDID) caps["appium:udid"] = process.env.MOBILE_UDID;
    } else {
      if (process.env.MOBILE_BUNDLE_ID) caps["appium:bundleId"] = process.env.MOBILE_BUNDLE_ID;
      if (process.env.MOBILE_DEVICE_NAME)
        caps["appium:deviceName"] = process.env.MOBILE_DEVICE_NAME;
      if (process.env.MOBILE_UDID) caps["appium:udid"] = process.env.MOBILE_UDID;
      if (process.env.MOBILE_PLATFORM_VERSION)
        caps["appium:platformVersion"] = process.env.MOBILE_PLATFORM_VERSION;
    }

    // App path (optional; can be used for both Android and iOS)
    if (process.env.MOBILE_APP_PATH) caps["appium:app"] = process.env.MOBILE_APP_PATH;

    // Minimal validation: require either app id (package/bundleId) or app path
    const hasAppId =
      platform === "Android" ? !!caps["appium:appPackage"] : !!caps["appium:bundleId"];
    const hasAppPath = !!caps["appium:app"];
    if (!hasAppId && !hasAppPath) {
      throw new Error(
        platform === "Android"
          ? "Missing MOBILE_APP_PACKAGE or MOBILE_APP_PATH for Android."
          : "Missing MOBILE_BUNDLE_ID or MOBILE_APP_PATH for iOS.",
      );
    }

    // Initialize WebDriverIO
    this.driver = await remote({
      hostname: process.env.APPIUM_HOST || "localhost",
      port: Number.parseInt(process.env.APPIUM_PORT || "4723", 10),
      capabilities: caps,
    });

    // Initialize Mobile Agent
    this.agent = new MobileAgent({
      driver: this.driver,
      apiKey,
      llmProvider: llmProvider as "openai" | "anthropic",
      verbose: process.env.VERBOSE === "true",
    });

    logger.info("Mobile Agent MCP Server initialized");
  }

  /**
   * Handle mobile_start_session
   */
  private async handleStartSession() {
    await this.initialize();

    if (!this.agent) {
      throw new Error("Agent not initialized");
    }

    await this.agent.startSession();
    this.sessionActive = true;

    return {
      content: [
        {
          type: "text",
          text: "Mobile testing session started successfully",
        },
      ],
    };
  }

  /**
   * Handle mobile_stop_session
   */
  private async handleStopSession(args: { status: "success" | "failure" }) {
    if (!this.agent || !this.sessionActive) {
      throw new Error("No active session");
    }

    const result = await this.agent.stopSession(args.status);
    this.sessionActive = false;

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  }

  /**
   * Handle mobile_execute
   */
  private async handleExecute(args: { instruction: string; visionMode?: string }) {
    if (!this.agent || !this.sessionActive) {
      throw new Error("Session not started. Call mobile_start_session first.");
    }

    // Apply vision mode if specified
    if (args.visionMode === "pure-vision-only") {
      (this.agent as any).visionConfig.pureVisionOnly = true;
    } else if (args.visionMode === "auto") {
      (this.agent as any).visionConfig.pureVisionOnly = false;
    }

    await this.agent.execute(args.instruction);

    return {
      content: [
        {
          type: "text",
          text: `Successfully executed: "${args.instruction}"`,
        },
      ],
    };
  }

  /**
   * Handle mobile_assert
   */
  private async handleAssert(args: { condition: string }) {
    if (!this.agent || !this.sessionActive) {
      throw new Error("Session not started. Call mobile_start_session first.");
    }

    const passed = await this.agent.assert(args.condition);

    return {
      content: [
        {
          type: "text",
          text: passed
            ? `✅ Assertion passed: "${args.condition}"`
            : `❌ Assertion failed: "${args.condition}"`,
        },
      ],
    };
  }

  /**
   * Handle mobile_take_screenshot
   */
  private async handleTakeScreenshot(args: { saveToFile?: string }) {
    if (!this.driver) {
      throw new Error("Driver not initialized");
    }

    const screenshot = await this.driver.takeScreenshot();

    if (args.saveToFile) {
      const buffer = Buffer.from(screenshot, "base64");
      fs.writeFileSync(args.saveToFile, buffer);
      return {
        content: [
          {
            type: "text",
            text: `Screenshot saved to: ${args.saveToFile}`,
          },
        ],
      };
    }

    return {
      content: [
        {
          type: "image",
          data: screenshot,
          mimeType: "image/png",
        },
      ],
    };
  }

  /**
   * Handle mobile_get_state
   */
  private async handleGetState(args: { includeScreenshot?: boolean }) {
    if (!this.agent || !this.sessionActive) {
      throw new Error("Session not started");
    }

    const state = (this.agent as any).currentState;

    if (!state) {
      throw new Error("No current state available");
    }

    const stateInfo = {
      activity: state.activity,
      elementCount: state.elements.length,
      visibleElements: state.elements
        .filter((e: any) => e.visible)
        .map((e: any) => ({
          id: e.elementId,
          type: e.elementType,
          text: e.text,
          clickable: e.clickable,
        })),
    };

    const content: any[] = [
      {
        type: "text",
        text: JSON.stringify(stateInfo, null, 2),
      },
    ];

    if (args.includeScreenshot && state.screenshotBase64) {
      content.push({
        type: "image",
        data: state.screenshotBase64,
        mimeType: "image/png",
      });
    }

    return { content };
  }

  /**
   * Handle mobile_configure
   */
  private async handleConfigure(args: any) {
    if (!this.agent) {
      throw new Error("Agent not initialized");
    }

    // Update configuration
    const visionConfig = (this.agent as any).visionConfig;

    if (args.enableVisionFallback !== undefined) {
      visionConfig.enabled = args.enableVisionFallback;
    }

    if (args.confidenceThreshold !== undefined) {
      visionConfig.confidenceThreshold = args.confidenceThreshold;
    }

    if (args.pureVisionOnly !== undefined) {
      visionConfig.pureVisionOnly = args.pureVisionOnly;
    }

    if (args.gridSize !== undefined) {
      visionConfig.gridSize = args.gridSize;
    }

    return {
      content: [
        {
          type: "text",
          text: `Configuration updated: ${JSON.stringify(args, null, 2)}`,
        },
      ],
    };
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    try {
      if (this.sessionActive && this.agent) {
        await this.agent.stopSession("failure");
      }
      if (this.driver) {
        await this.driver.deleteSession();
      }
    } catch (error) {
      logger.error("Cleanup error:", error);
    }
  }

  /**
   * Run the MCP server
   */
  async run(): Promise<void> {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    logger.info("Mobile Agent MCP Server running on stdio");
  }
}

/**
 * Main entry point
 */
if (require.main === module) {
  const server = new MobileAgentMCPServer();
  server.run().catch((error) => {
    logger.error("Failed to start MCP server:", error);
    process.exit(1);
  });
}
