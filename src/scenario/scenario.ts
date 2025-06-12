import { CoreMessage } from "ai";
import {
  ScenarioConfig,
  ScenarioResult,
  ScenarioAgentAdapter,
  ScriptStep,
  ScenarioConstructorOptions
} from "../domain";
import {
  ScenarioExecution,
} from "../scenario-execution/scenario-execution";
import { Logger } from "../utils/logger";

export class Scenario {
  public readonly name: string;
  public readonly description: string;
  public readonly criteria: string[];
  public readonly agents: ScenarioAgentAdapter[];
  public readonly maxTurns: number;
  public readonly verbose?: boolean | number;
  public readonly cacheKey?: string;
  public readonly debug?: boolean;

  private readonly logger: Logger;

  constructor(options: ScenarioConstructorOptions) {
    if (!options.name) {
      throw new Error("Scenario name cannot be empty");
    }
    if (!options.description) {
      throw new Error("Scenario description cannot be empty");
    }
    if ((options.maxTurns || 10) < 1) {
      throw new Error("maxTurns must be a positive integer");
    }

    this.logger = Logger.create(`Scenario:${options.name}`);

    this.name = options.name;
    this.description = options.description;
    this.criteria = options.criteria || [];

    if ("agent" in options) {
      this.logger.info("single agent configuration");
      this.agents = [
        options.agent,
        options.testingAgent
      ].filter((agent): agent is ScenarioAgentAdapter => agent !== void 0);
    } else {
      this.logger.info("multiple agents configuration");
      this.agents = options.agents || [];
    }

    this.maxTurns = options.maxTurns || 10;
    this.verbose = options.verbose;
    this.cacheKey = options.cacheKey;
    this.debug = options.debug;
  }

  public async run(context?: Record<string, unknown>): Promise<ScenarioResult> {
    return await this.runWithSteps(context, null);
  }

  public async script(steps: ScriptStep[], context?: Record<string, unknown>): Promise<ScenarioResult> {
    return await this.runWithSteps(context, steps);
  }

  private async runWithSteps(
    context?: Record<string, unknown>,
    script?: ScriptStep[] | null
  ): Promise<ScenarioResult> {
    const steps = script || [Scenario.proceed()];
    const execution = new ScenarioExecution(
      context ?? {},
      this.getExecutionConfig(),
      steps,
    );

    return execution.execute();
  }

  private getExecutionConfig(): ScenarioConfig {
    return {
      name: this.name,
      description: this.description,
      criteria: this.criteria,
      agents: this.agents,
      maxTurns: this.maxTurns,
      verbose: this.verbose,
      cacheKey: this.cacheKey,
      debug: this.debug,
    };
  }

  public static message(message: CoreMessage): ScriptStep {
    return (context) => {
      return context.message(message);
    };
  }

  public static agent(): ScriptStep {
    return (context) => {
      return context.agent();
    };
  }

  public static judge(): ScriptStep {
    return (context) => {
      return context.judge();
    };
  }

  public static user(): ScriptStep {
    return (context) => {
      return context.user();
    };
  }

  public static proceed(
    turns?: number,
    onTurn?: (executor: ScenarioExecution) => void | Promise<void>,
    onStep?: (executor: ScenarioExecution) => void | Promise<void>,
  ): ScriptStep {
    return (context) => {
      return context.proceed(turns, onTurn, onStep);
    };
  }

  public static succeed(): ScriptStep {
    return (context) => {
      return context.succeed();
    };
  }

  public static fail(): ScriptStep {
    return (context) => {
      return context.fail();
    };
  }
}
