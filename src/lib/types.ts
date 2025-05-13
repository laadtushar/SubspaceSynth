import type { AnalyzePersonaInsightsOutput as OriginalAnalyzePersonaInsightsOutput } from '@/ai/flows/analyze-persona-insights';

export interface UserProfile {
  id: string; // Firebase UID
  email: string;
  name: string; // Display name
  avatarUrl?: string;
  lastLogin?: string; // ISO date string
  createdAt: string; // ISO date string
}

// Extended AnalyzePersonaInsightsOutput for feature #4
export interface InteractionStatsSchema {
  totalMessages: number;
  userMessagesCount: number;
  aiMessagesCount: number;
  averageMessagesPerDay?: number; // Optional, could be complex to calculate accurately
  firstMessageDate?: string; // ISO date string
  lastMessageDate?: string; // ISO date string
}

export interface LinguisticFeaturesSchema {
  wordCount: number;
  uniqueWordCount: number;
  averageSentenceLength: number;
  frequentPhrases?: string[]; // Top 3-5
}

export interface AnalyzePersonaInsightsOutput extends OriginalAnalyzePersonaInsightsOutput {
  linguisticFeatures?: LinguisticFeaturesSchema;
  interactionStats?: InteractionStatsSchema; // Primarily for AI chat logs, not seed history
}


export interface Persona {
  id: string;
  name: string; 
  personaDescription?: string;
  createdAt: string; // ISO date string
  avatarUrl?: string; 
  category?: string; // New field for grouping/folders

  originType: 'user-created' | 'chat-derived';

  // For 'user-created' personas (seed data)
  chatHistory?: string; 
  mbti?: string;
  age?: number;
  gender?: string;
  
  // This will store the enhanced analysis output
  personalityInsights?: AnalyzePersonaInsightsOutput; 

  // For 'chat-derived' personas
  derivedFromChatId?: string; 
  derivedRepresentingUserId?: string;  
  sourceChatMessagesCount?: number; 
}

export interface ChatMessage { // For AI Persona chats
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string; // ISO date string or number (Firebase server timestamp will be number)
  context?: string; 
}

export interface UserChatMessage { // For User-to-User chats
  id: string; 
  senderUserId: string; 
  text: string;
  timestamp: string | number; 
}

export interface UserContact { 
  id: string; 
  name: string; 
  avatarUrl?: string; 
  addedAt: string; 
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

// For feature #1: Export Persona
export interface ExportedPersonaData {
  personaDetails: Persona;
  chatMessagesWithAI?: ChatMessage[]; // Messages from AI chat interface
  // Seed chat history is part of personaDetails.chatHistory if originType is 'user-created'
}

