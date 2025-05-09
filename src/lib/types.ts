import type { AnalyzePersonaInsightsOutput } from '@/ai/flows/analyze-persona-insights';

export interface Persona {
  id: string;
  name: string; 
  personaDescription?: string;
  createdAt: string; // ISO date string
  avatarUrl?: string; 

  // Differentiates the origin and type of persona
  originType: 'user-created' | 'chat-derived';

  // --- Fields for 'user-created' personas ---
  chatHistory?: string; // The seed history for user-created personas
  mbti?: string;
  age?: number;
  gender?: string;
  personalityInsights?: AnalyzePersonaInsightsOutput;

  // --- Fields for 'chat-derived' personas ---
  // ID of the user-to-user chat (e.g., sorted "userId1-userId2") it's derived from
  derivedFromChatId?: string; 
  // The user ID this persona represents in the chat (the contact user's ID)
  derivedRepresentingUserId?: string;  
  // Actual messages from the represented user used to derive/update this persona
  sourceChatMessages?: UserChatMessage[]; 
}

export interface ChatMessage {
  id: string;
  personaId: string; // ID of the Persona (user-created or chat-derived in practice mode)
  sender: 'user' | 'ai';
  text: string;
  timestamp: string; // ISO date string
  context?: string; 
}

export interface UserChatMessage {
  id: string;
  chatId: string; // Composite key like "userId1-userId2" (sorted)
  senderUserId: string; // UID of the message sender
  // receiverUserId: string; // UID of the message receiver - not strictly needed if chatId implies participants
  text: string;
  timestamp: string; // ISO date string
}

export interface UserContact {
  id: string; // User's UID
  name: string;
  avatarUrl?: string;
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
