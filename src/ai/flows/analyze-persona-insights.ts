'use server';

/**
 * @fileOverview This file defines a Genkit flow for analyzing persona insights based on chat history.
 *
 * - analyzePersonaInsights - A function that analyzes the communication patterns of a persona and provides personality insights and statistics.
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

const SentimentSchema = z.object({
  positive: z.number().min(0).max(100).describe('Percentage of positive sentiment (0-100).'),
  negative: z.number().min(0).max(100).describe('Percentage of negative sentiment (0-100).'),
  neutral: z.number().min(0).max(100).describe('Percentage of neutral sentiment (0-100).'),
}).describe('Sentiment analysis of the chat history.');

const CommunicationStyleSchema = z.object({
  averageMessageLength: z.number().min(0).describe('Average length of messages in words.'),
  questionRate: z.number().min(0).max(100).describe('Percentage of messages that are questions (0-100).'),
  useOfEmojis: z.number().min(0).max(100).describe('Frequency of emoji usage (0-100 scale, 0 none, 100 very high).'),
}).describe('Analysis of communication style.');

const KeywordSchema = z.object({
  keyword: z.string().describe('The keyword.'),
  frequency: z.number().min(0).describe('Frequency or importance score of the keyword.'),
});

const MbtiInsightsSchema = z.object({
  observedTraits: z.array(z.string()).describe('Key traits observed related to the MBTI type.'),
  compatibilityNotes: z.string().optional().describe('Brief notes on communication compatibility based on MBTI type.')
}).describe('Insights related to the MBTI type, if provided.');


export const AnalyzePersonaInsightsOutputSchema = z.object({
  summary: z
    .string()
    .describe('A brief textual summary of the persona\'s overall personality and communication style based on the analysis.'),
  sentiment: SentimentSchema,
  communicationStyle: CommunicationStyleSchema,
  topKeywords: z.array(KeywordSchema).max(10).describe('Top 5-10 keywords and their frequency or importance score.'),
  mbtiInsights: MbtiInsightsSchema.optional(),
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
  prompt: `You are an AI persona analyst. Analyze the communication patterns of the following persona based on their chat history and optional attributes.
Provide a structured analysis including a summary, sentiment breakdown, communication style metrics, top keywords, and MBTI-specific insights if an MBTI type is provided.

Chat History:
"{{{chatHistory}}}"

{{#if mbtiType}}MBTI Type (if known): {{{mbtiType}}}{{/if}}
{{#if age}}Age (if known): {{{age}}}{{/if}}
{{#if gender}}Gender (if known): {{{gender}}}{{/if}}

Your analysis MUST conform to the following JSON structure:
{
  "summary": "string (A brief textual summary...)",
  "sentiment": {
    "positive": "number (Percentage 0-100)",
    "negative": "number (Percentage 0-100)",
    "neutral": "number (Percentage 0-100)"
  },
  "communicationStyle": {
    "averageMessageLength": "number (Average words per message)",
    "questionRate": "number (Percentage of messages that are questions 0-100)",
    "useOfEmojis": "number (Emoji usage frequency score 0-100)"
  },
  "topKeywords": [
    { "keyword": "string", "frequency": "number (Frequency or importance score)" }
  ],
  {{#if mbtiType}}
  "mbtiInsights": {
    "observedTraits": ["string (Observed trait 1)", "string (Observed trait 2)", ...],
    "compatibilityNotes": "string (Brief notes on communication compatibility based on MBTI type: {{{mbtiType}}})"
  }
  {{else}}
  "mbtiInsights": null
  {{/if}}
}

Ensure all percentages are numerical values between 0 and 100. For sentiment, the sum of positive, negative, and neutral should ideally be close to 100.
Provide the top 5-10 keywords.
If MBTI type is not provided, mbtiInsights field should be omitted or null.

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
    if (!output) {
      throw new Error('AI failed to return analysis output.');
    }
    // Ensure sentiment percentages sum to 100 or are reasonable
    if (output.sentiment) {
      const { positive, negative, neutral } = output.sentiment;
      const totalSentiment = positive + negative + neutral;
      if (Math.abs(totalSentiment - 100) > 5 && totalSentiment > 0) { // Allow some leeway, handle if all are 0
        // Normalize if significantly off, or log warning
        console.warn(`Sentiment percentages (${positive}, ${negative}, ${neutral}) do not sum to 100. Total: ${totalSentiment}`);
        // Simple normalization if total is not zero
        if (totalSentiment > 0) {
            output.sentiment.positive = parseFloat(((positive / totalSentiment) * 100).toFixed(1));
            output.sentiment.negative = parseFloat(((negative / totalSentiment) * 100).toFixed(1));
            // Adjust neutral to make it sum to 100, ensuring no negative values
            output.sentiment.neutral = Math.max(0, parseFloat((100 - output.sentiment.positive - output.sentiment.negative).toFixed(1)));
        }
      } else if (totalSentiment === 0 && (positive > 0 || negative > 0 || neutral > 0)) {
        // Edge case if numbers are extremely small leading to sum 0 but individual non-zero
         console.warn(`Sentiment percentages are non-zero but sum to 0. Resetting neutral to 100.`);
         output.sentiment.neutral = 100;
         output.sentiment.positive = 0;
         output.sentiment.negative = 0;
      }
       // Ensure no single sentiment value is > 100 or < 0 after potential normalization
      output.sentiment.positive = Math.max(0, Math.min(100, output.sentiment.positive));
      output.sentiment.negative = Math.max(0, Math.min(100, output.sentiment.negative));
      output.sentiment.neutral = Math.max(0, Math.min(100, output.sentiment.neutral));
    }


    return output;
  }
);