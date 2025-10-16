#!/usr/bin/env node

/**
 * Standalone executable for Mobile Agent MCP Server
 * 
 * This script can be run directly to start the MCP server:
 *   npx @mobile-agent-typescript/mcp-server
 */

const { MobileAgentMCPServer } = require('../dist/mcp/server.js');

const server = new MobileAgentMCPServer();
server.run().catch((error) => {
  console.error('Failed to start MCP server:', error);
  process.exit(1);
});

