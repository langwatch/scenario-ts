# Scenario TS

A TypeScript library for testing AI agents using scenarios.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Documentation](#documentation)
  - [Architecture Decision Record](./docs/ADR-001-scenario-architecture.md)
  - [Style Guide](./docs/STYLE_GUIDE.md)
  - [Contributing Guide](./docs/CONTRIBUTING.md)
  - [Testing Guide](./docs/TESTING.md)
- [Development](#development)
  - [Getting Started](#getting-started)
  - [Working with Examples](#working-with-examples)
  - [Project Rules](#project-rules)
- [License](#license)

## Installation

```bash
# Using pnpm (recommended)
pnpm add @langwatch/scenario-ts

# Using npm
npm install @langwatch/scenario-ts

# Using yarn
yarn add @langwatch/scenario-ts
```

## Usage

```typescript
import { Scenario, TestableAgent, Verdict } from "@langwatch/scenario-ts";

// Define your agent implementation
class MyAgent implements TestableAgent {
  async invoke(message: string): Promise<{ message: string }> {
    // Your agent implementation here
    return { message: "Response from the agent" };
  }
}

// Create a scenario to test your agent
const scenario = new Scenario({
  description: "User is looking for a dinner idea",
  strategy: "Ask for a vegetarian recipe and evaluate the response",
  successCriteria: [
    "Recipe agent generates a vegetarian recipe",
    "Recipe includes a list of ingredients",
  ],
  failureCriteria: ["The recipe is not vegetarian or includes meat"],
});

// Create your agent
const agent = new MyAgent();

// Run the test with configuration options
const result = await scenario.run({
  agent,
  maxTurns: 5, // Maximum conversation turns (default: 2)
  verbose: true, // Enable detailed logging (default: false)
});

// Check the result
if (result.verdict === Verdict.Success) {
  console.log("Test passed!");
} else {
  console.log("Test failed:", result.reasoning);
}
```

For more detailed examples, see the [examples directory](./examples/).

## Documentation

- [Architecture Decision Record](./docs/ADR-001-scenario-architecture.md) - Overview of the library's architecture and design decisions
- [Style Guide](./docs/STYLE_GUIDE.md) - Coding standards and file structure patterns
- [Contributing Guide](./docs/CONTRIBUTING.md) - How to contribute to this project
- [Testing Guide](./docs/TESTING.md) - Testing approach, conventions, and best practices

## Development

This project uses pnpm for package management.

### Getting Started

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Create a local package for testing
pnpm run buildpack

# Run tests
pnpm test

# Run example tests (requires buildpack step first)
pnpm run examples:vitest:run test
```

### Working with Examples

The examples in the `examples/` directory use the local package as a dependency. Before running these examples, you must:

1. Build the project: `pnpm run build`
2. Create a local package: `pnpm run buildpack`

This creates a `.tgz` file in the root directory that the examples use as their dependency source.

```bash
# Complete workflow to update and test examples
pnpm run build      # Build the library
pnpm run buildpack  # Package it for local use
pnpm run examples:vitest:run test # Run the example tests
```

### Project Rules

This project follows these key development rules:

- Always use pnpm (never npm/yarn)
- Package is published as @langwatch/scenario-ts
- Build both CommonJS and ESM modules
- Examples must use @langwatch/scenario-ts import
- Keep dist/ in .gitignore

## License

MIT
