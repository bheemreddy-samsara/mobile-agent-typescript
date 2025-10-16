/**
 * OpenAI LLM Provider
 */

import OpenAI from 'openai';
import { BaseLLMProvider } from './LLMProvider';
import { logger } from '../utils/logger';

export class OpenAIProvider extends BaseLLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey: string, model: string = 'gpt-4o') {
    super();
    this.model = model;
    this.client = new OpenAI({ apiKey });
    logger.info(`Initialized OpenAI provider with model: ${model}`);
  }

  async query(prompt: string, systemPrompt?: string): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: prompt,
    });

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI response');
      }

      return content;
    } catch (error) {
      logger.error('OpenAI query failed:', error);
      throw error;
    }
  }

  async queryWithVision(prompt: string, imageBase64: string, systemPrompt?: string): Promise<string> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (systemPrompt) {
      messages.push({
        role: 'system',
        content: systemPrompt,
      });
    }

    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: prompt,
        },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${imageBase64}`,
          },
        },
      ],
    });

    try {
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 2000,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No content in OpenAI vision response');
      }

      return content;
    } catch (error) {
      logger.error('OpenAI vision query failed:', error);
      throw error;
    }
  }
}

