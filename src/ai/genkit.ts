import { genkit, type Genkit } from 'genkit';
import { googleAI } from '@genkit-ai/googleai';

let _ai: Genkit | null = null;

function getAI(): Genkit {
  if (!_ai) {
    _ai = genkit({
      plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_GENAI_API_KEY || process.env.GOOGLE_API_KEY })],
      model: 'googleai/gemini-2.0-flash',
    });
  }
  return _ai;
}

export const ai = new Proxy({} as Genkit, {
  get(_target, prop) {
    return (getAI() as unknown as Record<string | symbol, unknown>)[prop];
  },
});
