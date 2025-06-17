import process from "node:process";
import { openai } from "@ai-sdk/openai";
import { defineConfig } from "@langwatch/scenario-ts";

export default defineConfig({
  defaultModel: {
    model: openai("gpt-4o-mini", {
      apiKey: process.env.OPENAI_API_KEY,
    }),
  },
});
