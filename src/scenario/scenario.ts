import {
  ScenarioExecution,
  ScenarioExecutionContext,
  ScenarioExecutionResult,
  ScenarioExecutionStep,

} from "./scenario-execution";
import { ScenarioConfig } from "../shared/types";

export interface ScenarioConfig {
  name: string;
  description: string;
  criteria: string[];
  agent: MessageAdapterAgent<unknown> | StringAdapterAgent<unknown>;
  defaults?: {
    maxTurns?: number;
  };
}

interface ExecutableScript {
  run: (ctx?: ScenarioExecutionContext) => Promise<ScenarioExecutionResult>;
}

export class Scenario {
  constructor(public readonly config: ScenarioConfig) { }

  public async run(ctx?: ScenarioExecutionContext) {
    const execution = new ScenarioExecution(ctx ?? {}, this.config, [
      // Run is just syntactic sugar for a script with only a single `simulate` step
      Scenario.simulate(),
    ]);

    return execution.execute();
  }

  public script(steps: ScenarioExecutionStep[]): ExecutableScript {
    return {
      run: async (ctx?: ScenarioExecutionContext) => {
        const execution = new ScenarioExecution(ctx ?? {}, this.config, steps);

        return execution.execute();
      },
    };
  }

  public static message(message: string): ScenarioExecutionStep {
    return state => state.appendMessage("user", message);
  }

  public static agent(): ScenarioExecutionStep {
    return () => { };
  }

  public static judge(): ScenarioExecutionStep {
    return () => { };
  }

  public static user(): ScenarioExecutionStep {
    return () => { };
  }

  public static simulate(turns?: number): ScenarioExecutionStep {
    return () => { };
  }
}
