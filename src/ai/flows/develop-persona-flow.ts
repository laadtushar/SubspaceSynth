'use server';
/**
 * @fileOverview This file defines a Genkit flow for developing and modifying an AI persona's personality.
 *
 * - developPersonaPersonality - A function that takes an existing persona and user prompts to generate a new persona description.
 * - DevelopPersonaPersonalityInput - The input type for the developPersonaPersonality function.
 * - DevelopPersonaPersonalityOutput - The return type for the developPersonaPersonality function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const DevelopPersonaPersonalityInputSchema = z.object({
  currentPersonaDescription: z
    .string()
    .describe('The current detailed description of the persona.'),
  developmentPrompts: z
    .string()
    .describe(
      'User-provided prompts and instructions on how to modify or evolve the persona.'
    ),
  name: z.string().optional().describe('The name of the persona (for context).'),
  mbtiType: z
    .string()
    .optional()
    .describe('The MBTI type of the persona (for context).'),
  age: z.number().optional().describe('The age of the persona (for context).'),
  gender: z.string().optional().describe('The gender of the persona (for context).'),
});
export type DevelopPersonaPersonalityInput = z.infer<typeof DevelopPersonaPersonalityInputSchema>;

const DevelopPersonaPersonalityOutputSchema = z.object({
  newPersonaDescription: z
    .string()
    .describe('The new, updated persona description after applying the development prompts.'),
});
export type DevelopPersonaPersonalityOutput = z.infer<typeof DevelopPersonaPersonalityOutputSchema>;

export async function developPersonaPersonality(
  input: DevelopPersonaPersonalityInput
): Promise<DevelopPersonaPersonalityOutput> {
  return developPersonaPersonalityFlow(input);
}

const prompt = ai.definePrompt({
  name: 'developPersonaPersonalityPrompt',
  input: {schema: DevelopPersonaPersonalityInputSchema},
  output: {schema: DevelopPersonaPersonalityOutputSchema},
  prompt: `You are an AI persona development assistant. You will be given an existing persona description and a set of instructions on how to modify or evolve that persona.
Your task is to rewrite the persona description based on these instructions, maintaining the core identity where appropriate, and incorporating the requested changes to its traits, communication style, or background.
Focus on generating a rich, detailed, and coherent new persona description.

Existing Persona Description:
"{{{currentPersonaDescription}}}"

User's Development Prompts:
"{{{developmentPrompts}}}"

{{#if name}}Persona Name (for context): {{{name}}}{{/if}}
{{#if mbtiType}}MBTI Type (for context): {{{mbtiType}}}{{/if}}
{{#if age}}Age (for context): {{{age}}}{{/if}}
{{#if gender}}Gender (for context): {{{gender}}}{{/if}}

Generate the new persona description:`,
});

const developPersonaPersonalityFlow = ai.defineFlow(
  {
    name: 'developPersonaPersonalityFlow',
    inputSchema: DevelopPersonaPersonalityInputSchema,
    outputSchema: DevelopPersonaPersonalityOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
