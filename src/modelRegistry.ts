import { openai } from "@ai-sdk/openai";
import { createProviderRegistry } from "ai";

/**
 * ModelProvider - Centralized provider registry for managing different LLM providers and models
 *
 * This registry allows us to:
 * 1. Access models through simple string IDs with provider prefixes
 * 2. Pre-configure model settings for specific use cases
 * 3. Create aliases for models to make switching easier
 * 4. Limit available models to those we want to support
 */
export const modelRegistry = createProviderRegistry({
  openai,
});
