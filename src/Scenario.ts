import {
  type ScenarioConfig,
  type ScenarioResult,
  type RunOptions,
} from "./types";
import { ConversationRunner } from "./ConversationRunner";
import { ScenarioTestingAgent } from "./testing-agent/ScenarioTestingAgent";

export class Scenario {
  private _scenarioTestingAgent!: ScenarioTestingAgent;

  constructor(public readonly config: ScenarioConfig) {}

  private get scenarioTestingAgent(): ScenarioTestingAgent {
    return (this._scenarioTestingAgent ??= new ScenarioTestingAgent(
      this.config
    ));
  }

  public async run({
    agent,
    maxTurns = 2,
    verbose = false,
  }: RunOptions): Promise<ScenarioResult> {
    const testingAgent = this.scenarioTestingAgent;

    const runner = new ConversationRunner({
      agent,
      testingAgent,
      maxTurns,
      verbose,
    });

    return await runner.run();
  }
}
