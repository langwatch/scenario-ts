import { stringify } from "csv-stringify/sync";
import { ScenarioResult, Verdict } from "../types";

export function resultToCSV(result: ScenarioResult): string {
  // Create headers
  const records = [
    {
      DesiredVerdict: Verdict.Success,
      Verdict: result.verdict,
      Reasoning: result.reasoning || "",
      "Met Criteria": JSON.stringify(result.metCriteria),
      "Unmet Criteria": JSON.stringify(result.unmetCriteria),
      "Triggered Failures": JSON.stringify(result.triggeredFailures),
      "Conversation Length": result.conversation.length,
      Conversation: JSON.stringify(result.conversation),
    },
  ];

  // Convert to CSV with proper escaping and formatting
  return stringify(records, {
    header: true,
    columns: {
      DesiredVerdict: "Desired Verdict",
      Verdict: "Verdict",
      Reasoning: "Reasoning",
      "Met Criteria": "Met Criteria",
      "Unmet Criteria": "Unmet Criteria",
      "Triggered Failures": "Triggered Failures",
      "Conversation Length": "Conversation Length",
      Conversation: "Conversation",
    },
  });
}
