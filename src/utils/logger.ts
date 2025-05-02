import debug from "debug";
import chalk from "chalk";

// Set up debug logging (for optional debug output)
process.env.DEBUG = "scenario-ts:*";
export const log = debug("scenario-ts:core");

/**
 * Pretty-prints a message from the Testing Agent (simulated user).
 * Uses blue color and a clear prefix.
 */
export function printTestingAgentMessage(message: string) {
  process.stdout.write(chalk.blue.bold("Testing Agent: ") + message + "\n");
}

/**
 * Pretty-prints a message from the Testable Agent (the assistant).
 * Uses green color and a clear prefix.
 */
export function printTestableAgentMessage(message: string) {
  process.stdout.write(chalk.green.bold("Agent: ") + message + "\n");
}
