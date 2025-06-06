import { ScenarioExecutionState } from "./scenario-execution-state";
import { ScenarioConfig } from "../shared/types";

export interface ScenarioExecutionResult {
  success: boolean;
}

export interface ScenarioExecutionContext {
  threadId?: string;
}

export interface ScenarioExecutionStep {
  (state: ScenarioExecutionState, ctx: ScenarioExecutionContext): void;
}


export class ScenarioExecution {
  private state: ScenarioExecutionState = new ScenarioExecutionState();

  constructor(
    public readonly ctx: ScenarioExecutionContext,
    public readonly config: ScenarioConfig,
    public readonly steps: ScenarioExecutionStep[],
  ) {
    steps.pop();
  }

  async execute(): Promise<ScenarioExecutionResult> {
    const defaults = this.config.defaults ?? { };
    const { maxTurns = 10 } = defaults;
    let turn = 0;

    // Execute any scripted steps before
    for (const step of this.steps) {
      step(this.state, this.ctx);
    }

    while (turn < maxTurns) {


      turn++;
    }

    return { success: false };
  }
}
