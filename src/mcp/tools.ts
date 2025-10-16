/**
 * MCP Tool Definitions for Mobile Agent
 * 
 * These tools expose the Mobile Agent SDK functionality via Model Context Protocol,
 * enabling agent-based workflows with Claude Desktop, Cursor, and other MCP clients.
 */

export const MOBILE_AGENT_TOOLS = [
  {
    name: 'mobile_execute',
    description: 
      'Execute a natural language instruction on a mobile device using four-tier fallback system:\n' +
      '1. Hierarchy (XML) - Fast, accurate\n' +
      '2. Vision + Numeric Tags - When hierarchy fails\n' +
      '3. Vision + Grid Overlay - Universal fallback\n' +
      '4. Pure Vision - Last resort\n\n' +
      'Automatically selects the best approach for each action.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        instruction: {
          type: 'string',
          description: 'Natural language instruction (e.g., "Click the login button", "Type email@example.com in the email field")',
        },
        visionMode: {
          type: 'string',
          enum: ['auto', 'pure-vision-only'],
          description: 'Vision mode: "auto" uses four-tier fallback (recommended), "pure-vision-only" skips to pure vision',
          default: 'auto',
        },
      },
      required: ['instruction'],
    },
  },
  {
    name: 'mobile_assert',
    description: 
      'Verify a condition on the mobile screen using LLM-based verification.\n' +
      'Checks if the current UI state matches the expected condition.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        condition: {
          type: 'string',
          description: 'Condition to verify (e.g., "Login successful", "User is logged in", "Settings page is displayed")',
        },
      },
      required: ['condition'],
    },
  },
  {
    name: 'mobile_take_screenshot',
    description: 
      'Capture the current screen state as a screenshot.\n' +
      'Returns base64-encoded image for analysis or debugging.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        saveToFile: {
          type: 'string',
          description: 'Optional file path to save screenshot (e.g., "./screenshot.png")',
        },
      },
    },
  },
  {
    name: 'mobile_get_state',
    description: 
      'Get the current UI state including activity name, visible elements, and screen hierarchy.\n' +
      'Useful for understanding what\'s currently on screen.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        includeScreenshot: {
          type: 'boolean',
          description: 'Include screenshot in the response',
          default: false,
        },
      },
    },
  },
  {
    name: 'mobile_start_session',
    description: 
      'Start a new testing session.\n' +
      'Must be called before executing any actions.',
    inputSchema: {
      type: 'object' as const,
      properties: {},
    },
  },
  {
    name: 'mobile_stop_session',
    description: 
      'Stop the current testing session and return results.\n' +
      'Returns session summary with all executed steps and verifications.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        status: {
          type: 'string',
          enum: ['success', 'failure'],
          description: 'Final status of the session',
          default: 'success',
        },
      },
      required: ['status'],
    },
  },
  {
    name: 'mobile_configure',
    description: 
      'Configure mobile agent settings including vision fallback, confidence thresholds, and LLM provider.',
    inputSchema: {
      type: 'object' as const,
      properties: {
        enableVisionFallback: {
          type: 'boolean',
          description: 'Enable vision-based fallback when hierarchy fails',
        },
        confidenceThreshold: {
          type: 'number',
          description: 'Minimum confidence threshold (0-1) for triggering fallback',
          minimum: 0,
          maximum: 1,
        },
        pureVisionOnly: {
          type: 'boolean',
          description: 'Skip hierarchy/tags/grid and use only pure vision mode',
        },
        gridSize: {
          type: 'number',
          description: 'Grid size for grid overlay fallback (e.g., 10 for 10x10 grid)',
          minimum: 5,
          maximum: 20,
        },
      },
    },
  },
] as const;

export type MobileAgentTool = typeof MOBILE_AGENT_TOOLS[number];

