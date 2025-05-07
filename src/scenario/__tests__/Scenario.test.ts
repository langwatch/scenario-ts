import { describe, it, expect, vi, beforeEach } from "vitest";
import { Scenario } from "../Scenario";
import {
  ScenarioConfig,
  Verdict,
  TestingAgentResponseType,
  ScenarioResult,
  TestableAgent,
  RunOptions,
} from "../../shared/types";

// Prepare mock result
const mockResult: ScenarioResult = {
  type: TestingAgentResponseType.FinishTest,
  verdict: Verdict.Success,
  reasoning: "Test passed",
  metCriteria: ["Success criterion"],
  unmetCriteria: [],
  triggeredFailures: [],
};

// Mock dependencies before importing the actual modules
vi.mock("../../testing-agent", () => ({
  ScenarioTestingAgent: vi.fn().mockImplementation(() => ({
    invoke: vi.fn().mockResolvedValue(mockResult),
  })),
}));

// Setup mock function to track calls
const mockRunFn = vi.fn().mockResolvedValue(mockResult);

// Create a mock instance
const mockConversationRunnerInstance = {
  run: mockRunFn,
};

// Mock the conversation module
vi.mock("../../conversation", () => ({
  ConversationRunner: vi
    .fn()
    .mockImplementation(() => mockConversationRunnerInstance),
}));

// Mock logging utilities
vi.mock("../../shared/utils/logging", () => ({
  formatScenarioResult: vi.fn(),
}));

process.env.OPENAI_API_KEY = "test";

// Import modules after mocking them
import { ScenarioTestingAgent } from "../../testing-agent";
import { ConversationRunner } from "../../conversation";
import { formatScenarioResult } from "../../shared/utils/logging";

describe("Scenario", () => {
  const validConfig: ScenarioConfig = {
    description: "Test scenario",
    strategy: "Test strategy",
    successCriteria: ["Success criterion"],
    failureCriteria: ["Failure criterion"],
  };

  // Simple mock agent that fulfills the TestableAgent interface
  class MockAgent implements TestableAgent {
    async invoke(prompt: string): Promise<{ message: string }> {
      return { message: `Response to: ${prompt}` };
    }
  }

  let scenario: Scenario;
  let mockAgent: MockAgent;

  beforeEach(() => {
    vi.clearAllMocks();
    scenario = new Scenario(validConfig);
    mockAgent = new MockAgent();
  });

  describe("constructor", () => {
    it("should initialize with valid config", () => {
      expect(scenario).toBeInstanceOf(Scenario);
      expect(scenario.config).toEqual(validConfig);
    });
  });

  describe("run", () => {
    it("should create a ScenarioTestingAgent with the config", async () => {
      await scenario.run({ agent: mockAgent });

      expect(ScenarioTestingAgent).toHaveBeenCalledWith(validConfig);
    });

    it("should create a ConversationRunner with the correct options", async () => {
      const options: RunOptions = {
        agent: mockAgent,
        maxTurns: 5,
        verbose: true,
      };

      await scenario.run(options);

      expect(ConversationRunner).toHaveBeenCalledWith(
        expect.objectContaining({
          agent: mockAgent,
          maxTurns: 5,
          verbose: true,
        })
      );
    });

    it("should call run on the ConversationRunner", async () => {
      await scenario.run({ agent: mockAgent });

      expect(mockRunFn).toHaveBeenCalled();
    });

    it("should return the result from the ConversationRunner", async () => {
      const expected: ScenarioResult = mockResult;

      const result = await scenario.run({ agent: mockAgent });

      expect(result).toEqual(expected);
    });

    it("should call formatScenarioResult when verbose is true", async () => {
      await scenario.run({ agent: mockAgent, verbose: true });

      expect(formatScenarioResult).toHaveBeenCalled();
    });

    it("should not call formatScenarioResult when verbose is false", async () => {
      await scenario.run({ agent: mockAgent, verbose: false });

      expect(formatScenarioResult).not.toHaveBeenCalled();
    });

    it("should use default maxTurns value when not provided", async () => {
      await scenario.run({ agent: mockAgent });

      expect(ConversationRunner).toHaveBeenCalledWith(
        expect.objectContaining({ maxTurns: 2 })
      );
    });

    it("should reuse the ScenarioTestingAgent when maxTurns is the same", async () => {
      // First run
      await scenario.run({ agent: mockAgent });
      const firstCallCount = vi.mocked(ScenarioTestingAgent).mock.calls.length;

      // Second run
      await scenario.run({ agent: mockAgent });
      const secondCallCount = vi.mocked(ScenarioTestingAgent).mock.calls.length;

      // The ScenarioTestingAgent should be created only once
      expect(secondCallCount).toBe(firstCallCount);
    });
  });
});
