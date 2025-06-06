export interface DeveloperMessage {
  content: string;
  role: "developer";
}

export interface SystemMessage {
  content: string;
  role: "system";
}

export interface UserMessage {
  content: string;
  role: "user";
}

export interface AssistantMessage {
  role: "assistant";
  content: undefined;
  refusal: undefined;
  toolCalls: undefined;
}

export interface AssistantMessageWithRefusal extends Omit<AssistantMessage, "refusal"> {
  refusal: string;
}

export interface AssistantMessageWithToolCalls extends Omit<AssistantMessage, "toolCalls"> {
  toolCalls: {
    function: {
      arguments: string;
      name: string;
    },
    id: string;
    type: "function";
  }[];
}

export interface AssistantMessageWithContent extends Omit<AssistantMessage, "content"> {
  content: string;
}

export type Message =
  | DeveloperMessage
  | SystemMessage
  | UserMessage
  | AssistantMessage
  | AssistantMessageWithRefusal
  | AssistantMessageWithToolCalls
  | AssistantMessageWithContent;

