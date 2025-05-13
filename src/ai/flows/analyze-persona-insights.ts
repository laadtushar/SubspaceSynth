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
    .describe('The chat history of the persona to be analyzed. This could be seed data or an actual conversation log.'),
  mbtiType: z
    .string()
    .optional()
    .describe('The MBTI type of the persona, if known.'),
  age: z.number().optional().describe('The age of the persona, if known.'),
  gender: z.string().optional().describe('The gender of the persona, if known.'),
  // Indicate if the chat history is a direct conversation with an AI or seed data
  analysisContext: z.enum(['seed-data', 'ai-interaction-log']) 
    .optional()
    .default('seed-data')
    .describe('Context of the chat history: "seed-data" for initial persona creation, "ai-interaction-log" for analyzing chats with an AI persona.')
});
export type AnalyzePersonaInsightsInput = z.infer<typeof AnalyzePersonaInsightsInputSchema>;

const SentimentSchema = z.object({
  positive: z.number().min(0).max(100).describe('Percentage of positive sentiment (0-100).'),
  negative: z.number().min(0).max(100).describe('Percentage of negative sentiment (0-100).'),
  neutral: z.number().min(0).max(100).describe('Percentage of neutral sentiment (0-100).'),
}).describe('Sentiment analysis of the chat history.');

const CommunicationStyleSchema = z.object({
  averageMessageLength: z.number().min(0).describe('Average length of messages in words. If seed data, this is average length of paragraphs/entries.'),
  questionRate: z.number().min(0).max(100).describe('Percentage of messages/entries that are questions (0-100).'),
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

const LinguisticFeaturesSchema = z.object({
    wordCount: z.number().min(0).describe('Total word count in the provided chat history.'),
    uniqueWordCount: z.number().min(0).describe('Number of unique words used.'),
    averageSentenceLength: z.number().min(0).describe('Average number of words per sentence.'),
    // frequentPhrases: z.array(z.string()).max(5).optional().describe('Commonly used phrases or collocations (max 5).'),
}).describe('Linguistic features derived from the chat history.');

const InteractionStatsSchema = z.object({
    totalMessages: z.number().min(0).optional().describe('Total number of messages in the log (if applicable).'),
    userMessagesCount: z.number().min(0).optional().describe('Number of messages sent by the user (if applicable).'),
    aiMessagesCount: z.number().min(0).optional().describe('Number of messages sent by the AI (if applicable).'),
    // firstMessageDate: z.string().optional().describe('Date of the first message in ISO format (if available from context).'),
    // lastMessageDate: z.string().optional().describe('Date of the last message in ISO format (if available from context).'),
}).describe('Statistics about the interaction (applicable if chat history is a conversation log).');


const AnalyzePersonaInsightsOutputSchema = z.object({
  summary: z
    .string()
    .describe('A brief textual summary of the persona\'s overall personality and communication style based on the analysis.'),
  sentiment: SentimentSchema,
  communicationStyle: CommunicationStyleSchema,
  topKeywords: z.array(KeywordSchema).max(10).describe('Top 5-10 keywords and their frequency or importance score.'),
  mbtiInsights: MbtiInsightsSchema.optional(),
  linguisticFeatures: LinguisticFeaturesSchema.optional(),
  interactionStats: InteractionStatsSchema.optional().describe('Only populated if analysisContext is "ai-interaction-log" and data is sufficient.'),
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
The analysis context is: {{{analysisContext}}}. If it's "seed-data", the chat history is likely a monologue or user-provided text. If it's "ai-interaction-log", it's a conversation.

Provide a structured analysis including:
1.  A summary of overall personality and communication style.
2.  Sentiment breakdown (positive, negative, neutral percentages).
3.  Communication style metrics (average message/entry length in words, question rate, emoji usage score).
4.  Linguistic features (total word count, unique word count, average sentence length).
5.  Top 5-10 keywords and their frequency/importance.
6.  If MBTI type is provided, MBTI-specific insights (observed traits, compatibility notes).
7.  If analysisContext is "ai-interaction-log" and the chat history appears to be a dialogue, attempt to provide interactionStats (total messages, user messages, AI messages). Otherwise, this field can be omitted or set to null.

Chat History:
"{{{chatHistory}}}"

{{#if mbtiType}}MBTI Type (if known): {{{mbtiType}}}{{/if}}
{{#if age}}Age (if known): {{{age}}}{{/if}}
{{#if gender}}Gender (if known): {{{gender}}}{{/if}}

Your analysis MUST conform to the following JSON structure. Ensure all numerical values are actual numbers, not strings.
{
  "summary": "string (A brief textual summary...)",
  "sentiment": {
    "positive": "number (Percentage 0-100)",
    "negative": "number (Percentage 0-100)",
    "neutral": "number (Percentage 0-100)"
  },
  "communicationStyle": {
    "averageMessageLength": "number (Average words per message/entry)",
    "questionRate": "number (Percentage of messages/entries that are questions 0-100)",
    "useOfEmojis": "number (Emoji usage frequency score 0-100)"
  },
  "linguisticFeatures": {
    "wordCount": "number (Total word count)",
    "uniqueWordCount": "number (Unique word count)",
    "averageSentenceLength": "number (Average words per sentence)"
  },
  "topKeywords": [
    { "keyword": "string", "frequency": "number (Frequency or importance score)" }
  ],
  {{#if mbtiType}}
  "mbtiInsights": {
    "observedTraits": ["string (Observed trait 1)", "string (Observed trait 2)", ...],
    "compatibilityNotes": "string (Brief notes on communication compatibility based on MBTI type: {{{mbtiType}}})"
  }{{else}}
  "mbtiInsights": null{{/if}},
  {{#ifEquals analysisContext "ai-interaction-log"}}
  "interactionStats": {
    "totalMessages": "number (Total messages, optional)",
    "userMessagesCount": "number (User messages, optional)",
    "aiMessagesCount": "number (AI messages, optional)"
  }
  {{else}}
  "interactionStats": null
  {{/ifEquals}}
}

Ensure all percentages sum to 100 for sentiment. Provide top 5-10 keywords.
If MBTI type is not provided, mbtiInsights field should be omitted or null.
If interactionStats are not applicable for "seed-data" or cannot be reliably determined, omit the field or set it to null.

Analysis:`,
});

const analyzePersonaInsightsFlow = ai.defineFlow(
  {
    name: 'analyzePersonaInsightsFlow',
    inputSchema: AnalyzePersonaInsightsInputSchema,
    outputSchema: AnalyzePersonaInsightsOutputSchema,
  },
  async (input: AnalyzePersonaInsightsInput) : Promise<AnalyzePersonaInsightsOutput> => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error('AI failed to return analysis output.');
    }
    // Ensure sentiment percentages sum to 100 or are reasonable
    if (output.sentiment) {
      const { positive, negative, neutral } = output.sentiment;
      let totalSentiment = positive + negative + neutral;
      // Check for NaN or Infinity before arithmetic operations
      if (isNaN(totalSentiment) || !isFinite(totalSentiment)) {
          console.warn(`Invalid sentiment values received: P:${positive}, N:${negative}, Neu:${neutral}. Resetting to neutral.`);
          output.sentiment.positive = 0;
          output.sentiment.negative = 0;
          output.sentiment.neutral = 100;
          totalSentiment = 100;
      }


      if (Math.abs(totalSentiment - 100) > 5 && totalSentiment > 0) { 
        console.warn(`Sentiment percentages (${positive}, ${negative}, ${neutral}) do not sum to 100. Total: ${totalSentiment}. Normalizing.`);
        output.sentiment.positive = parseFloat(((positive / totalSentiment) * 100).toFixed(1));
        output.sentiment.negative = parseFloat(((negative / totalSentiment) * 100).toFixed(1));
        output.sentiment.neutral = Math.max(0, parseFloat((100 - output.sentiment.positive - output.sentiment.negative).toFixed(1)));
      } else if (totalSentiment === 0 && (positive > 0 || negative > 0 || neutral > 0)) {
         console.warn(`Sentiment percentages are non-zero but sum to 0. Resetting neutral to 100.`);
         output.sentiment.neutral = 100;
         output.sentiment.positive = 0;
         output.sentiment.negative = 0;
      } else if (totalSentiment < 95 && totalSentiment !== 0) { // If sum is low but not zero, distribute remainder to neutral
        console.warn(`Sentiment percentages sum to ${totalSentiment}, distributing remainder to neutral.`);
        output.sentiment.neutral = parseFloat((output.sentiment.neutral + (100 - totalSentiment)).toFixed(1));
      }
      
      output.sentiment.positive = Math.max(0, Math.min(100, isNaN(output.sentiment.positive) ? 0 : output.sentiment.positive));
      output.sentiment.negative = Math.max(0, Math.min(100, isNaN(output.sentiment.negative) ? 0 : output.sentiment.negative));
      output.sentiment.neutral = Math.max(0, Math.min(100, isNaN(output.sentiment.neutral) ? 0 : output.sentiment.neutral));

      // Final normalization pass to ensure sum is exactly 100 if small floating point errors occurred
      const finalTotal = output.sentiment.positive + output.sentiment.negative + output.sentiment.neutral;
      if (finalTotal !== 100 && finalTotal > 0) {
        const diff = 100 - finalTotal;
        output.sentiment.neutral = parseFloat((output.sentiment.neutral + diff).toFixed(1));
        // clamp again
        output.sentiment.neutral = Math.max(0, Math.min(100, output.sentiment.neutral));
         if (output.sentiment.positive + output.sentiment.negative + output.sentiment.neutral !== 100) {
           // if still not 100, adjust largest component
            const sentiments = ['positive', 'negative', 'neutral'] as const;
            let maxKey: typeof sentiments[number] = 'neutral';
            let maxVal = output.sentiment.neutral;
            if (output.sentiment.positive > maxVal) { maxKey = 'positive'; maxVal = output.sentiment.positive; }
            if (output.sentiment.negative > maxVal) { maxKey = 'negative'; }
            
            const finalDiff = 100 - (output.sentiment.positive + output.sentiment.negative + output.sentiment.neutral);
            output.sentiment[maxKey] = parseFloat((output.sentiment[maxKey] + finalDiff).toFixed(1));
         }

      } else if (finalTotal === 0 && !(output.sentiment.positive === 0 && output.sentiment.negative === 0 && output.sentiment.neutral === 0)) {
        // if all were meant to be 0, but sum is 0. E.g. if all are very small.
        output.sentiment.neutral = 100; // Default to neutral
        output.sentiment.positive = 0;
        output.sentiment.negative = 0;
      }

    }

    // Validate interactionStats if present
    if (input.analysisContext !== 'ai-interaction-log' || !output.interactionStats) {
        output.interactionStats = undefined; // Ensure it's undefined if not applicable
    } else if (output.interactionStats) {
        const stats = output.interactionStats;
        if (stats.totalMessages === undefined && stats.userMessagesCount !== undefined && stats.aiMessagesCount !== undefined) {
            stats.totalMessages = stats.userMessagesCount + stats.aiMessagesCount;
        }
    }
    
    return output;
  }
);
