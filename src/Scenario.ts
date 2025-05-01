import {
  type ScenarioConfig,
  type ScenarioResult,
  type RunOptions,
  ScenarioResultReason,
} from "./types";
import { ConversationRunner } from "./ConversationRunner";
import { ScenarioTestingAgent } from "./ScenarioTestingAgent";

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
    customTestingAgent,
    maxTurns = 10,
  }: RunOptions): Promise<ScenarioResult> {
    const testingAgent = customTestingAgent ?? this.scenarioTestingAgent;

    const runner = new ConversationRunner(agent, testingAgent);

    for (let turn = 0; turn < maxTurns; turn++) {
      const { criteria } = await runner.next();

      // Check failure criteria
      const failureMet = criteria.some((c) => c.met);

      if (failureMet) {
        return {
          success: false,
          history: runner.getHistory(),
          criteria,
          reason: ScenarioResultReason.FailureCriteriaMet,
        };
      }

      // Check success criteria
      const allSuccessMet = this.config.successCriteria.every(
        (criterion) => criteria.find((c) => c.criterion === criterion)?.met
      );

      if (allSuccessMet) {
        return {
          success: true,
          history: runner.getHistory(),
          criteria,
          reason: ScenarioResultReason.AllSuccessCriteriaMet,
        };
      }
    }

    return {
      success: false,
      history: runner.getHistory(),
      reason: ScenarioResultReason.MaxTurnsExceeded,
    };
  }
}
