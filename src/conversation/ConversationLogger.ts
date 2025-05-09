import chalk from "chalk";

const agentChalk = chalk.green.bold;
const userChalk = chalk.blue.bold;
/**
 * ConversationLogger - Handles all logging and spinner UI for conversation flow.
 * Keeps UI/side-effects out of ConversationRunner.
 */
export class ConversationLogger {
  /** Start spinner for the user (testing agent) */
  startUserSpinner() {
    // this.userSpinner = ora({
    //   prefixText: userChalk("User: "),
    // }).start();
  }

  /** Stop spinner for the user */
  stopUserSpinner() {
    // this.userSpinner?.stop();
  }

  /** Print a message from the user (testing agent) */
  printUserMessage(message: string) {
    // You can customize this as needed
    // this.printMessage(userChalk("User: ") + message);
    console.log(userChalk("User: ") + message);
  }

  /** Start spinner for the agent (testable agent) */
  startAgentSpinner() {
    // this.agentSpinner = ora({
    //   prefixText: agentChalk("Agent: "),
    // }).start();
  }

  /** Stop spinner for the agent */
  stopAgentSpinner() {
    // this.agentSpinner?.stop();
  }

  /** Print a message from the agent (testable agent) */
  printAgentMessage(message: string) {
    // You can customize this as needed
    // this.printMessage(agentChalk("Agent: ") + message);
    console.log(agentChalk("Agent: ") + message);
  }

  private printMessage(message: string | typeof agentChalk | typeof userChalk) {
    console.log(message);
    // process.stdout.write(message + "\n");
  }
}
