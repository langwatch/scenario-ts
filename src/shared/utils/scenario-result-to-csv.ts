import { stringify } from "csv-stringify/sync";
import {
  ScenarioConfig,
  TestingAgentConfig,
  ScenarioResult,
  Verdict,
} from "../types";

/**
 * Converts a scenario result to CSV format for reporting and analysis
 *
 * @param result - Combined result object containing test outcome, configuration, and agent details
 * @returns Formatted CSV string with headers and properly escaped values
 */
export function resultToCSV(
  result: ScenarioResult &
    ScenarioConfig &
    TestingAgentConfig & {
      forceFinishTestMessage: string;
    }
): string {
  // Create a record with all relevant test data
  const records = [
    {
      Success: result.verdict === Verdict.Success,
      DesiredVerdict: Verdict.Success,
      Verdict: result.verdict,
      Reasoning: result.reasoning || "",
      "Met Criteria": JSON.stringify(result.metCriteria),
      "Unmet Criteria": JSON.stringify(result.unmetCriteria),
      "Triggered Failures": JSON.stringify(result.triggeredFailures),
      "Conversation Length": result.conversation.length,
      Conversation: JSON.stringify(result.conversation),
      ConversationWithoutForceFinishTestMessage: JSON.stringify(
        result.conversation.filter(
          (message) => message.content !== result.forceFinishTestMessage
        )
      ),
      "Force Finish Test Message": result.forceFinishTestMessage,
      "Scenario Description": result.description,
      "Scenario Strategy": result.strategy,
      "Scenario Success Criteria": JSON.stringify(result.successCriteria),
      "Scenario Failure Criteria": JSON.stringify(result.failureCriteria),
      "Testing Agent Prompt": result.systemPrompt,
      "Testing Agent Model": result.modelId,
      "Testing Agent Temperature": result.temperature,
      "Testing Agent Max Tokens": result.maxTokens,
    },
  ];

  // Convert to CSV with proper escaping and formatting
  return stringify(records, {
    header: true,
    columns: {
      Success: "Success",
      DesiredVerdict: "Desired Verdict",
      Verdict: "Verdict",
      Reasoning: "Reasoning",
      "Met Criteria": "Met Criteria",
      "Unmet Criteria": "Unmet Criteria",
      "Triggered Failures": "Triggered Failures",
      "Conversation Length": "Conversation Length",
      Conversation: "Conversation",
      ConversationWithoutForceFinishTestMessage:
        "Conversation Without Force Finish Test Message",
      "Force Finish Test Message": "Force Finish Test Message",
      "Scenario Description": "Scenario Description",
      "Scenario Strategy": "Scenario Strategy",
      "Scenario Success Criteria": "Scenario Success Criteria",
      "Scenario Failure Criteria": "Scenario Failure Criteria",
      "Testing Agent Prompt": "Testing Agent Prompt",
      "Testing Agent Model": "Testing Agent Model",
      "Testing Agent Temperature": "Testing Agent Temperature",
      "Testing Agent Max Tokens": "Testing Agent Max Tokens",
    },
  });
}
