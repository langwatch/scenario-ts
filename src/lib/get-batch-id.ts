import { randomUUID } from "crypto";

const PROCESS_BATCH_ID = `batch-run-${randomUUID()}`;

/**
 * Gets the batch UUID for a scenario run. The batch UUID should be
 * the same for the current process, and should be unique across processes.
 *
 * @returns A string representing the batch UUID.
 */
export const getBatchId = (): string => {
  return PROCESS_BATCH_ID;
};
