import { EventType, MessagesSnapshotEventSchema } from "@ag-ui/core";
import { z } from "zod";
import { safeParseXKsuid } from "../utils/ids";

// Scenario event type enum
export enum ScenarioEventType {
  RUN_STARTED = "SCENARIO_RUN_STARTED",
  RUN_FINISHED = "SCENARIO_RUN_FINISHED",
  MESSAGE_SNAPSHOT = "SCENARIO_MESSAGE_SNAPSHOT",
}

export enum ScenarioRunStatus {
  SUCCESS = "SUCCESS",
  ERROR = "ERROR",
  CANCELLED = "CANCELLED",
  IN_PROGRESS = "IN_PROGRESS",
  PENDING = "PENDING",
  FAILED = "FAILED",
}

// AG-UI Base Event Schema
const baseEventSchema = z.object({
  type: z.nativeEnum(EventType),
  timestamp: z.number().optional(),
  rawEvent: z.any().optional(),
});

// This is the scenario batch id schema
const batchRunIdSchema = z.string().refine(
  (val) => {
    const prefix = "scenario_batch_run_";
    if (!val.startsWith(prefix)) return false;
    const id = val.slice(prefix.length);
    return safeParseXKsuid(id);
  },
  {
    message:
      "ID must be a valid ksuid, with the resource 'scenario_batch_run_'",
  }
);

// This is the scenario run id schema
const scenarioRunIdSchema = z.string().refine(
  (val) => {
    const prefix = "scenario_run_";
    if (!val.startsWith(prefix)) return false;
    const id = val.slice(prefix.length);
    return safeParseXKsuid(id);
  },
  {
    message: "ID must be a valid ksuid, with the resource 'scenario_run_'",
  }
);

// This is the scenario id schema
const scenarioIdSchema = z.string().refine(
  (val) => {
    const prefix = "scenario_";
    if (!val.startsWith(prefix)) return false;
    const id = val.slice(prefix.length);
    return safeParseXKsuid(id);
  },
  {
    message: "ID must be a valid ksuid, with the resource 'scenario_'",
  }
);

// Base scenario event schema with common fields
const baseScenarioEventSchema = baseEventSchema.extend({
  batchRunId: batchRunIdSchema,
  scenarioId: scenarioIdSchema,
  scenarioRunId: scenarioRunIdSchema,
});

// Scenario Run Started Event
// TODO: Consider metadata
export const scenarioRunStartedSchema = baseScenarioEventSchema.extend({
  type: z.literal(ScenarioEventType.RUN_STARTED),
  metadata: z.object({
    name: z.string(),
    description: z.string().optional(),
    // config: z.record(z.unknown()).optional(),
  }),
});

// Scenario Run Finished Event
// TODO: Consider error, metrics
export const scenarioRunFinishedSchema = baseScenarioEventSchema.extend({
  type: z.literal(ScenarioEventType.RUN_FINISHED),
  status: z.nativeEnum(ScenarioRunStatus),
  //   error: z
  //     .object({
  //       message: z.string(),
  //       code: z.string().optional(),
  //       stack: z.string().optional(),
  //     })
  //     .optional(),
  //   metrics: z.record(z.number()).optional(),
});

// Scenario Message Snapshot Event
export const scenarioMessageSnapshotSchema = MessagesSnapshotEventSchema.merge(
  baseScenarioEventSchema.extend({
    type: z.literal(ScenarioEventType.MESSAGE_SNAPSHOT),
  })
);

// Union type for all scenario events
export const scenarioEventSchema = z.discriminatedUnion("type", [
  scenarioRunStartedSchema,
  scenarioRunFinishedSchema,
  scenarioMessageSnapshotSchema,
]);

// Type exports
export type ScenarioRunStartedEvent = z.infer<typeof scenarioRunStartedSchema>;
export type ScenarioRunFinishedEvent = z.infer<
  typeof scenarioRunFinishedSchema
>;
export type ScenarioMessageSnapshotEvent = z.infer<
  typeof scenarioMessageSnapshotSchema
>;
export type ScenarioEvent = z.infer<typeof scenarioEventSchema>;

// Define response schemas
const successSchema = z.object({ success: z.boolean() });
const errorSchema = z.object({ error: z.string() });
const stateSchema = z.object({
  state: z.object({
    messages: z.array(z.any()),
    status: z.string(),
  }),
});
const runsSchema = z.object({ runs: z.array(z.string()) });
const eventsSchema = z.object({ events: z.array(scenarioEventSchema) });

export const responseSchemas = {
  success: successSchema,
  error: errorSchema,
  state: stateSchema,
  runs: runsSchema,
  events: eventsSchema,
};
