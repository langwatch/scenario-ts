import { generate } from "xksuid";
import { allAgentRoles, ScenarioAgentRole, ScenarioConfig } from "../domain";
import { ScenarioExecution } from "../scenario-execution";
import { proceed } from "../steps";

const generateThreadId = () => {
  return `thread_${generate()}`;
};

export function run(cfg: ScenarioConfig) {
  if (!cfg.name) {
    throw new Error("Scenario name is required");
  }
  if (!cfg.description) {
    throw new Error("Scenario description is required");
  }
  if ((cfg.maxTurns || 10) < 1) {
    throw new Error("Max turns must be at least 1");
  }
  if (cfg.agents.length === 0) {
    throw new Error("At least one agent is required");
  }
  if (!cfg.agents.find(agent => agent.roles.includes(ScenarioAgentRole.AGENT))) {
    throw new Error("At least one non-user/non-judge agent is required");
  }

  cfg.agents.forEach((agent, i) => {
    if (agent.roles.length === 0 || !agent.roles.some(role => allAgentRoles.includes(role))) {
      throw new Error(`Agent ${i} does not have valid roles.`);
    }
  });

  if (!cfg.threadId) {
    cfg.threadId = generateThreadId();
  }

  const steps = cfg.script || [proceed()];
  const execution = new ScenarioExecution(
    cfg,
    steps,
  );

  return execution.execute();
}
