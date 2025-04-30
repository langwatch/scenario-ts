import { log } from './utils/logger';

export class TestingAgent {
  private model: string;

  constructor(model: string) {
    this.model = model;
  }

  async send(message: string, history: any[]): Promise<any> {
    log(`Sending message to ${this.model}:`, message);
    // This is a placeholder for the actual LLM client call
    // In a real implementation, you would use the OpenAI SDK or another client
    return {
      messages: [
        {
          role: 'assistant',
          content: 'This is a placeholder response from the LLM client.',
        },
      ],
    };
  }
} 