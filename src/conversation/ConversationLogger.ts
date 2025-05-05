import ora, { Ora } from "ora";
import chalk from "chalk";

/**
 * ConversationLogger - Handles all logging and spinner UI for conversation flow.
 * Keeps UI/side-effects out of ConversationRunner.
 */
export class ConversationLogger {
  private userSpinner?: Ora;
  private agentSpinner?: Ora;

  /** Start spinner for the user (testing agent) */
  startUserSpinner() {
    this.userSpinner = ora({
      prefixText: chalk.blue.bold("User: "),
    }).start();
  }

  /** Stop spinner for the user */
  stopUserSpinner() {
    this.userSpinner?.stop();
  }

  /** Print a message from the user (testing agent) */
  printUserMessage(message: string) {
    // You can customize this as needed
    console.log(chalk.blue.bold("User: ") + message);
  }

  /** Start spinner for the agent (testable agent) */
  startAgentSpinner() {
    this.agentSpinner = ora({
      prefixText: chalk.green.bold("Agent: "),
    }).start();
  }

  /** Stop spinner for the agent */
  stopAgentSpinner() {
    this.agentSpinner?.stop();
  }

  /** Print a message from the agent (testable agent) */
  printAgentMessage(message: string) {
    // You can customize this as needed
    console.log(chalk.green.bold("Agent: ") + message);
  }
}
