import { describe, it, expect, vi, beforeEach } from "vitest";
import { ScenarioTestingAgent } from "../ScenarioTestingAgent";
import {
  ScenarioConfig,
  Verdict,
  TestingAgentResponseType,
  ModelConfig,
} from "../../shared/types";
import { CoreMessage } from "ai";

// Mock dependencies directly with vi.mock
vi.mock("../../modelRegistry", () => ({
  modelRegistry: {
    languageModel: vi.fn(() => ({})),
  },
}));

// Mock the generateText function with TypeScript types
vi.mock("ai", () => {
  return {
    generateText: vi.fn(),
    CoreMessage: {},
  };
});

vi.mock("../tools", () => ({
  ToolDefinitionProvider: {
    getFinishTestTool: vi.fn(() => ({
      tool: { name: "finishTest" },
      schema: { parse: (args: any) => args },
    })),
  },
}));

// Import mocks after they've been defined
import { generateText } from "ai";
import { modelRegistry } from "../../modelRegistry";

describe("ScenarioTestingAgent", () => {
  // Sample valid config for testing
  const validConfig: ScenarioConfig = {
    description: "Test scenario",
    strategy: "Test strategy",
    successCriteria: ["Success criterion 1"],
    failureCriteria: ["Failure criterion 1"],
  };

  let agent: ScenarioTestingAgent;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("constructor", () => {
    it("should initialize with valid config", () => {
      expect(() => new ScenarioTestingAgent(validConfig)).not.toThrow();
    });

    it("should throw error when no criteria provided", () => {
      const invalidConfig = {
        ...validConfig,
        successCriteria: [],
        failureCriteria: [],
      };

      expect(() => new ScenarioTestingAgent(invalidConfig)).toThrow(
        "At least one success or failure criterion is required"
      );
    });

    it("should apply model config overrides", () => {
      const customModelConfig: Partial<ModelConfig> = {
        modelId: "openai:custom-model",
        temperature: 0.5,
        maxTokens: 500,
      };

      // Create the agent with custom config
      new ScenarioTestingAgent(validConfig, {
        modelConfig: customModelConfig,
      });

      // Verify the model was created with the custom model ID
      expect(modelRegistry.languageModel).toHaveBeenCalledWith(
        customModelConfig.modelId
      );
    });
  });

  describe("invoke", () => {
    beforeEach(() => {
      agent = new ScenarioTestingAgent(validConfig);

      // Reset the mock implementation for each test with type assertions
      vi.mocked(generateText).mockResolvedValue({
        text: "Test response",
      } as any);
    });

    it("should add system prompt to conversation", async () => {
      const messages: CoreMessage[] = [
        {
          role: "user",
          content: "Hello",
        },
      ];

      await agent.invoke(messages);

      // Check that generateText was called with a conversation that includes
      // a system message followed by the flipped user message
      expect(generateText).toHaveBeenCalled();

      const mockCall = vi.mocked(generateText).mock.calls[0][0];
      expect(mockCall.messages?.length).toBe(2);
      expect(mockCall.messages?.[0].role).toBe("system");
      expect(mockCall.messages?.[1].role).toBe("assistant");
      expect(mockCall.messages?.[1].content).toBe("Hello");
    });

    it("should correctly flip message roles", async () => {
      const messages: CoreMessage[] = [
        { role: "user", content: "User message" },
        { role: "assistant", content: "Assistant message" },
        { role: "system", content: "System message" },
      ];

      await agent.invoke(messages);

      const mockCall = vi.mocked(generateText).mock.calls[0][0];

      // System message from invoke + 3 input messages
      expect(mockCall.messages?.length).toBe(4);

      // Check that the roles were flipped correctly
      expect(mockCall.messages?.[1].role).toBe("assistant"); // user -> assistant
      expect(mockCall.messages?.[1].content).toBe("User message");

      expect(mockCall.messages?.[2].role).toBe("user"); // assistant -> user
      expect(mockCall.messages?.[2].content).toBe("Assistant message");

      // System messages should not be flipped
      expect(mockCall.messages?.[3].role).toBe("system");
      expect(mockCall.messages?.[3].content).toBe("System message");
    });

    it("should return message response from generateText", async () => {
      const messages: CoreMessage[] = [
        {
          role: "user",
          content: "Hello",
        },
      ];

      const response = await agent.invoke(messages);

      expect(response).toEqual({
        type: TestingAgentResponseType.Message,
        message: "Test response",
      });
    });

    it("should handle finishTest tool calls", async () => {
      // Setup mock for this specific test
      vi.mocked(generateText).mockResolvedValueOnce({
        toolCalls: [
          {
            toolName: "finishTest",
            args: {
              verdict: Verdict.Success,
              reasoning: "Test passed",
              details: {
                metCriteria: ["Success criterion 1"],
                unmetCriteria: [],
                triggeredFailures: [],
              },
            },
          },
        ],
      } as any);

      const messages: CoreMessage[] = [
        {
          role: "user",
          content: "Hello",
        },
      ];

      const response = await agent.invoke(messages);

      expect(response).toEqual({
        type: TestingAgentResponseType.FinishTest,
        verdict: Verdict.Success,
        reasoning: "Test passed",
        metCriteria: ["Success criterion 1"],
        unmetCriteria: [],
        triggeredFailures: [],
      });
    });
  });
});
