export class ScenarioExecutionState {
  private _history: unknown[] = [];
  private _turn: number = 0;

  constructor() {

  }

  appendMessage(role: "user" | "assistant" | "system" | "developer", message: string): void {
    this._history.push({ role, message });
  }

  get history(): unknown[] {
    return this._history;
  }

  get turn(): number {
    return this._turn;
  }
}
