'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing persona insights based on chat history.
 *
 * - analyzePersonaInsights - A function that analyzes the communication patterns of a persona and provides personality insights.
 * - AnalyzePersonaInsightsInput - The input type for the analyzePersonaInsights function.
 * - AnalyzePersonaInsightsOutput - The return type for the analyzePersonaInsights function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const AnalyzePersonaInsightsInputSchema = z.object({
  chatHistory: z
    .string()
    .describe('The chat history of the persona to be analyzed.'),
  mbtiType: z
    .string()
    .optional()
    .describe('The MBTI type of the persona, if known.'),
  age: z.number().optional().describe('The age of the persona, if known.'),
  gender: z.string().optional().describe('The gender of the persona, if known.'),
});
export type AnalyzePersonaInsightsInput = z.infer<typeof AnalyzePersonaInsightsInputSchema>;

const AnalyzePersonaInsightsOutputSchema = z.object({
  personalityInsights: z
    .string()
    .describe('The analyzed personality insights and statistics of the persona.'),
});
export type AnalyzePersonaInsightsOutput = z.infer<typeof AnalyzePersonaInsightsOutputSchema>;

export async function analyzePersonaInsights(
  input: AnalyzePersonaInsightsInput
): Promise<AnalyzePersonaInsightsOutput> {
  return analyzePersonaInsightsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzePersonaInsightsPrompt',
  input: {schema: AnalyzePersonaInsightsInputSchema},
  output: {schema: AnalyzePersonaInsightsOutputSchema},
  prompt: `You are an AI persona analyst. Analyze the communication patterns of the following persona based on their chat history and optional attributes, and provide personality insights and statistics. Present the insights in a way that can be visualized.

Chat History:
{{{chatHistory}}}

MBTI Type (if known): {{{mbtiType}}}
Age (if known): {{{age}}}
Gender (if known): {{{gender}}}

Analysis:`,
});

const analyzePersonaInsightsFlow = ai.defineFlow(
  {
    name: 'analyzePersonaInsightsFlow',
    inputSchema: AnalyzePersonaInsightsInputSchema,
    outputSchema: AnalyzePersonaInsightsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
