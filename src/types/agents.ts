import { Message } from "./messages";

export abstract class StringAdapterAgent<T> {
  constructor(private context: T) { }

  abstract invoke(message: string): Promise<string>;
}

export abstract class MessageAdapterAgent<T> {
  constructor(private history: Message[], private context: T) { }

  abstract invoke(message: Message): Promise<Message[]>;
}
