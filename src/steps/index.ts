import { CoreMessage } from "ai";
import { ScriptStep } from "../domain";
import { ScenarioExecution } from "../scenario-execution";

export const message = (message: CoreMessage): ScriptStep => {
  return ctx => ctx.message(message);
}

export const agent = (): ScriptStep => {
  return ctx => ctx.agent();
}

export const judge = (): ScriptStep => {
  return ctx => ctx.judge();
}

export const user = (): ScriptStep => {
  return ctx => ctx.user();
}

export const proceed = (
  turns?: number,
  onTurn?: (executor: ScenarioExecution) => void | Promise<void>,
  onStep?: (executor: ScenarioExecution) => void | Promise<void>,
): ScriptStep => {
  return ctx => ctx.proceed(turns, onTurn, onStep);
}

export const succeed = (): ScriptStep => {
  return ctx => ctx.succeed();
}

export const fail = (): ScriptStep => {
  return ctx => ctx.fail();
}
