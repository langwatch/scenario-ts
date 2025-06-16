import { AgentInput, ScenarioAgentRole, UserSimulatorAgentAdapter } from "../domain";

export const userSimulatorAgent = () => {
  return {
    roles: [ScenarioAgentRole.USER],

    call: async (input: AgentInput) => {
      return input;
    },
  } satisfies UserSimulatorAgentAdapter;
};
