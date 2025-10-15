# Contributing to Mobile Agent SDK

Thank you for your interest in contributing! This document provides guidelines for contributing to the Mobile Agent SDK.

## 🚀 Getting Started

### Prerequisites

- Node.js >= 18.0.0
- npm or yarn
- Appium server (for testing)
- Android SDK or Xcode (for device testing)

### Setup Development Environment

```bash
# Clone the repository
git clone https://github.com/yourusername/mobile-agent-typescript.git
cd mobile-agent-typescript

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test
```

## 📝 Development Workflow

### 1. Create a Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

### 2. Make Changes

- Write clean, readable code
- Follow existing code style
- Add tests for new features
- Update documentation

### 3. Test Your Changes

```bash
# Run tests
npm test

# Run linter
npm run lint

# Build to check for TypeScript errors
npm run build
```

### 4. Commit Your Changes

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```bash
git commit -m "feat: add support for iOS gestures"
git commit -m "fix: resolve element parsing issue"
git commit -m "docs: update API reference"
```

### 5. Submit a Pull Request

- Push your branch to GitHub
- Create a Pull Request with a clear description
- Link any related issues
- Wait for review

## 🎯 Code Style

### TypeScript

- Use TypeScript strict mode
- Provide type annotations for public APIs
- Use interfaces for object shapes
- Use enums for fixed sets of values

### Formatting

- 2 spaces for indentation
- Use semicolons
- Single quotes for strings
- Trailing commas in multiline structures

### Naming Conventions

- `camelCase` for variables and functions
- `PascalCase` for classes and interfaces
- `UPPER_SNAKE_CASE` for constants
- Descriptive names (avoid abbreviations)

## 🧪 Testing Guidelines

### Unit Tests

- Test individual functions and classes
- Mock external dependencies
- Use descriptive test names

```typescript
describe('UIObserver', () => {
  it('should parse UI elements from XML', async () => {
    // Test implementation
  });
});
```

### Integration Tests

- Test component interactions
- Use real WebDriverIO instances where possible
- Clean up resources after tests

## 📚 Documentation

### Code Documentation

- Use JSDoc comments for public APIs
- Include examples in documentation
- Document parameters and return types

```typescript
/**
 * Execute a natural language instruction
 * 
 * @param instruction - The instruction to execute
 * @returns Promise that resolves when action is complete
 * @example
 * ```typescript
 * await agent.execute('tap on the login button');
 * ```
 */
async execute(instruction: string): Promise<void> {
  // Implementation
}
```

### README Updates

- Update README.md for new features
- Add examples for new functionality
- Keep API reference up to date

## 🐛 Bug Reports

When filing a bug report, please include:

- Clear description of the issue
- Steps to reproduce
- Expected vs actual behavior
- Environment details (OS, Node version, etc.)
- Code samples or screenshots

## 💡 Feature Requests

For feature requests, please provide:

- Clear description of the feature
- Use cases and motivation
- Possible implementation approach
- Examples of similar features elsewhere

## 🔍 Code Review Process

All submissions require review. We use GitHub pull requests for this:

1. Automated checks must pass (tests, linting)
2. At least one maintainer approval required
3. Address review feedback promptly
4. Keep PRs focused and reasonably sized

## 📦 Release Process

Maintainers will:

1. Update version in package.json
2. Update CHANGELOG.md
3. Create a git tag
4. Publish to npm
5. Create GitHub release

## 🤝 Community Guidelines

- Be respectful and constructive
- Help others when possible
- Follow the code of conduct
- Give credit where due

## 📧 Questions?

- Open a [GitHub Discussion](https://github.com/yourusername/mobile-agent-typescript/discussions)
- Check existing [Issues](https://github.com/yourusername/mobile-agent-typescript/issues)
- Read the [documentation](./README.md)

Thank you for contributing! 🎉

