/**
 * Anthropic Claude LLM Provider
 */

import Anthropic from "@anthropic-ai/sdk";
import { logger } from "../utils/logger";
import { BaseLLMProvider } from "./LLMProvider";

export class AnthropicProvider extends BaseLLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(apiKey: string, model = "claude-3-5-sonnet-20241022") {
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
        system: systemPrompt || "",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected content type from Anthropic");
      }

      return content.text;
    } catch (error) {
      logger.error("Anthropic query failed:", error);
      throw error;
    }
  }

  async queryWithVision(
    prompt: string,
    imageBase64: string,
    systemPrompt?: string,
  ): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: 2000,
        system: systemPrompt || "",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: prompt,
              },
              {
                type: "image" as any,
                source: {
                  type: "base64",
                  media_type: "image/png",
                  data: imageBase64,
                } as any,
              } as any,
            ],
          },
        ],
      });

      const content = response.content[0];
      if (content.type !== "text") {
        throw new Error("Unexpected content type from Anthropic vision response");
      }

      return content.text;
    } catch (error) {
      logger.error("Anthropic vision query failed:", error);
      throw error;
    }
  }
}
