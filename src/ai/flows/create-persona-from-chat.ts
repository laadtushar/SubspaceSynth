'use server';

/**
 * @fileOverview Creates an AI persona from a chat history.
 *
 * - createPersonaFromChat - A function that handles the creation of an AI persona from chat history.
 * - CreatePersonaFromChatInput - The input type for the createPersonaFromChat function.
 * - CreatePersonaFromChatOutput - The return type for the createPersonaFromChat function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const CreatePersonaFromChatInputSchema = z.object({
  chatHistory: z
    .string()
    .describe('The chat history to analyze, as a single string.'),
});
export type CreatePersonaFromChatInput = z.infer<typeof CreatePersonaFromChatInputSchema>;

const CreatePersonaFromChatOutputSchema = z.object({
  personaDescription: z
    .string()
    .describe(
      'A detailed description of the persona, including communication style, tone, and common phrases.'
    ),
});
export type CreatePersonaFromChatOutput = z.infer<typeof CreatePersonaFromChatOutputSchema>;

export async function createPersonaFromChat(
  input: CreatePersonaFromChatInput
): Promise<CreatePersonaFromChatOutput> {
  return createPersonaFromChatFlow(input);
}

const prompt = ai.definePrompt({
  name: 'createPersonaFromChatPrompt',
  input: { schema: CreatePersonaFromChatInputSchema },
  output: { schema: CreatePersonaFromChatOutputSchema },
  prompt: `You are an expert in analyzing communication styles from chat histories.

  Analyze the following chat history and create a detailed description of the persona, including their communication style, tone, common phrases, and any other relevant characteristics.

  Chat History: {{{chatHistory}}}`,
});

const createPersonaFromChatFlow = ai.defineFlow(
  {
    name: 'createPersonaFromChatFlow',
    inputSchema: CreatePersonaFromChatInputSchema,
    outputSchema: CreatePersonaFromChatOutputSchema,
  },
  async input => {
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI model returned no output. Please try again.');
    }
    return output;
  }
);
