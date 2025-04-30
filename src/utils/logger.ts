import debug from "debug";

process.env.DEBUG = "scenario-ts:*";

export const log = debug("scenario-ts:core");
