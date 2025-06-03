import { randomUUID } from "crypto";

/**
 * Gets the batch UUID for a scenario run. The batch UUID should be
 * the same for the current process, and should be unique across processes.
 *
 * @returns A string representing the batch UUID.
 */
export const getBatchId = (): string => {
  if (!process.env.LANGWATCH_BATCH_ID) {
    process.env.LANGWATCH_BATCH_ID = `batch-run-${randomUUID()}`;
  }

  return process.env.LANGWATCH_BATCH_ID;
};
