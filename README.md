# Scenario TS

A TypeScript library for testing AI agents using scenarios.

## Installation

```bash
# Using pnpm (recommended)
pnpm add @langwatch/scenario-ts

# Using npm
npm install @langwatch/scenario-ts

# Using yarn
yarn add @langwatch/scenario-ts
```

## Development

This project uses pnpm for package management.

```bash
# Install dependencies
pnpm install

# Build the project
pnpm run build

# Run tests
pnpm test

# Run linter
pnpm run lint

# Format code
pnpm run format
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

## License

MIT
