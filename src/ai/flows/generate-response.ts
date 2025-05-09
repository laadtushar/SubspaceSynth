'use server';
/**
 * @fileOverview This file defines a Genkit flow for generating responses from an AI persona based on user input and context.
 *
 * - generateResponse - A function that generates a response from the AI persona.
 * - GenerateResponseInput - The input type for the generateResponse function.
 * - GenerateResponseOutput - The return type for the generateResponse function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateResponseInputSchema = z.object({
  persona: z.string().describe('The AI persona to use for generating the response.'),
  input: z.string().describe('The user input to respond to.'),
  context: z.string().describe('The context or situation for the response.'),
});
export type GenerateResponseInput = z.infer<typeof GenerateResponseInputSchema>;

const GenerateResponseOutputSchema = z.object({
  response: z.string().describe('The AI persona generated response.'),
});
export type GenerateResponseOutput = z.infer<typeof GenerateResponseOutputSchema>;

export async function generateResponse(input: GenerateResponseInput): Promise<GenerateResponseOutput> {
  return generateResponseFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateResponsePrompt',
  input: {schema: GenerateResponseInputSchema},
  output: {schema: GenerateResponseOutputSchema},
  prompt: `You are an AI persona simulating a real person. Your persona is described as follows: {{{persona}}}.\n\nGiven the following input from the user: {{{input}}}.\n\nAnd the following context: {{{context}}}.\n\nGenerate a response as the AI persona would:`,
});

const generateResponseFlow = ai.defineFlow(
  {
    name: 'generateResponseFlow',
    inputSchema: GenerateResponseInputSchema,
    outputSchema: GenerateResponseOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
