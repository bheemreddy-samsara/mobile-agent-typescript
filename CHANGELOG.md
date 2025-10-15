# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2024-01-15

### Added

- Initial release of Mobile Agent SDK for TypeScript
- Natural language mobile app testing with Appium/WebDriverIO
- Support for OpenAI GPT-4 and Anthropic Claude models
- UI hierarchy-based element detection (XML parsing)
- Core API methods: `startSession()`, `execute()`, `assert()`, `stopSession()`
- Comprehensive type definitions with TypeScript
- Multiple action types: click, tap, type text, swipe, scroll, long press
- Natural language verification/assertions
- Complete test result tracking with steps, verifications, and metadata
- Examples for basic usage and test integration
- Full documentation and API reference

### Features

- **LLM Integration**
  - OpenAI provider with GPT-4o support
  - Anthropic provider with Claude 3.5 Sonnet
  - Pluggable LLM provider architecture

- **UI Observation**
  - XML hierarchy parsing
  - Element type inference
  - Bounds extraction
  - Activity detection

- **Action Execution**
  - Click/tap actions
  - Text input
  - Swipe gestures
  - Scroll actions
  - Long press

- **Verification**
  - Natural language assertions
  - LLM-powered condition checking
  - Detailed verification results

### Developer Experience

- Full TypeScript support with strict typing
- Comprehensive JSDoc documentation
- Clear error messages
- Verbose logging mode
- Simple integration with existing tests

[1.0.0]: https://github.com/yourusername/mobile-agent-typescript/releases/tag/v1.0.0

