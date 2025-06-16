import { z } from "zod";

export const scenarioProjectConfigSchema = z.object({
  defaultModel: z.string().optional(),
}).strict();

export type ScenarioProjectConfig = z.infer<typeof scenarioProjectConfigSchema>;

export function defineConfig(config: ScenarioProjectConfig): ScenarioProjectConfig {
  return config;
}
