# Scenario TS

A TypeScript port of the Scenario library for testing agents.

## Installation

```bash
# Using pnpm
pnpm add scenario-ts

# Using npm
npm install scenario-ts

# Using yarn
yarn add scenario-ts
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
import { Scenario } from "scenario-ts";

const result = await Scenario.describe("User is looking for a dinner idea")
  .setConfig({ maxTurns: 5, debug: true })
  .addSuccessCriteria([
    "Recipe agent generates a vegetarian recipe",
    "Recipe includes a list of ingredients",
  ])
  .addFailureCriteria(["The recipe is not vegetarian or includes meat"])
  .run(agent);
```

## License

MIT
