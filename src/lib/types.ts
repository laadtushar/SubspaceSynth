import type { AnalyzePersonaInsightsOutput } from '@/ai/flows/analyze-persona-insights';

export interface Persona {
  id: string;
  name: string;
  chatHistory: string;
  mbti?: string;
  age?: number;
  gender?: string;
  personaDescription?: string;
  personalityInsights?: AnalyzePersonaInsightsOutput; // Updated from string
  createdAt: string; // ISO date string
  avatarUrl?: string; // Placeholder for avatar image
}

export interface ChatMessage {
  id: string;
  personaId: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string; // ISO date string
  context?: string; 
}

export const MBTI_TYPES = [
  "ISTJ", "ISFJ", "INFJ", "INTJ",
  "ISTP", "ISFP", "INFP", "INTP",
  "ESTP", "ESFP", "ENFP", "ENTP",
  "ESTJ", "ESFJ", "ENFJ", "ENTJ"
] as const;

export type MBTIType = typeof MBTI_TYPES[number];

export const GENDERS = ["Male", "Female", "Non-binary", "Other", "Prefer not to say"] as const;
export type Gender = typeof GENDERS[number];