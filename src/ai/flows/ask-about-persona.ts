'use server';
/**
 * @fileOverview This file defines a Genkit flow for answering questions about an AI persona.
 *
 * - askAboutPersona - A function that takes a persona description and a question, and returns an AI-generated answer.
 * - AskAboutPersonaInput - The input type for the askAboutPersona function.
 * - AskAboutPersonaOutput - The return type for the askAboutPersona function.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

const AskAboutPersonaInputSchema = z.object({
  personaDescription: z
    .string()
    .describe('The detailed description of the AI persona.'),
  question: z.string().describe('The question being asked about the persona.'),
});
export type AskAboutPersonaInput = z.infer<typeof AskAboutPersonaInputSchema>;

const AskAboutPersonaOutputSchema = z.object({
  answer: z
    .string()
    .describe('The AI-generated answer to the question about the persona.'),
});
export type AskAboutPersonaOutput = z.infer<typeof AskAboutPersonaOutputSchema>;

export async function askAboutPersona(
  input: AskAboutPersonaInput
): Promise<AskAboutPersonaOutput> {
  return askAboutPersonaFlow(input);
}

const prompt = ai.definePrompt({
  name: 'askAboutPersonaPrompt',
  input: { schema: AskAboutPersonaInputSchema },
  output: { schema: AskAboutPersonaOutputSchema },
  prompt: `You are an insightful AI assistant. You have been provided with a description of an AI persona and a question about that persona.
Your task is to provide a thoughtful and relevant answer to the question based *only* on the provided persona description.
Do not invent information not present in the description. If the question cannot be answered from the description, state that.

Persona Description:
"{{{personaDescription}}}"

Question:
"{{{question}}}"

Answer:`,
});

const askAboutPersonaFlow = ai.defineFlow(
  {
    name: 'askAboutPersonaFlow',
    inputSchema: AskAboutPersonaInputSchema,
    outputSchema: AskAboutPersonaOutputSchema,
  },
  async input => {
    if (!input.personaDescription || input.personaDescription.trim() === '') {
      return { answer: "The persona description is missing or empty, so I cannot answer questions about it." };
    }
    const { output } = await prompt(input);
    if (!output) {
      throw new Error('AI model returned no output. Please try again.');
    }
    return output;
  }
);
