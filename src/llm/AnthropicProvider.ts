/**
 * Anthropic Claude LLM Provider
 */

import Anthropic from '@anthropic-ai/sdk';
import { BaseLLMProvider } from './LLMProvider';
import { logger } from '../utils/logger';

export class AnthropicProvider extends BaseLLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model: string = 'claude-3-5-sonnet-20241022') {
    super();
    this.model = model;
    this.client = new Anthropic({ apiKey });
    logger.info(`Initialized Anthropic provider with model: ${model}`);
  }

  async query(prompt: string, systemPrompt?: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        system: systemPrompt || '',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected content type from Anthropic');
      }

      return content.text;
    } catch (error) {
      logger.error('Anthropic query failed:', error);
      throw error;
    }
  }
}
