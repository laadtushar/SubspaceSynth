import type { AnalyzePersonaInsightsOutput } from '@/ai/flows/analyze-persona-insights';

export interface UserProfile {
  id: string; // Firebase UID
  email: string;
  name: string; // Display name
  avatarUrl?: string;
  lastLogin?: string; // ISO date string
  createdAt: string; // ISO date string
}

export interface Persona {
  id: string;
  name: string; 
  personaDescription?: string;
  createdAt: string; // ISO date string
  avatarUrl?: string; 

  originType: 'user-created' | 'chat-derived';

  chatHistory?: string; 
  mbti?: string;
  age?: number;
  gender?: string;
  personalityInsights?: AnalyzePersonaInsightsOutput; // Keep this structure

  // For 'chat-derived' personas
  derivedFromChatId?: string; 
  derivedRepresentingUserId?: string;  
  // sourceChatMessages might be too large to store directly in the persona object in Firebase.
  // Consider storing only a summary or reference, or fetching them on demand.
  // For now, let's assume it might be a smaller set or a reference.
  sourceChatMessagesCount?: number; // Example: store count instead of full messages
}

export interface ChatMessage { // For AI Persona chats
  id: string;
  // personaId: string; // No longer needed if messages are nested under personaId in DB
  sender: 'user' | 'ai';
  text: string;
  timestamp: string; // ISO date string
  context?: string; 
}

export interface UserChatMessage { // For User-to-User chats
  id: string; // Message ID
  // chatId is the parent key in DB: user_chat_messages/${chatId}/${messageId}
  senderUserId: string; 
  text: string;
  timestamp: string; // ISO date string
}

export interface UserContact { // Represents a user in another user's contact list
  id: string; // UID of the contact user
  name: string; // Name of the contact, denormalized for quick display
  avatarUrl?: string; // Avatar of the contact, denormalized
  addedAt: string; // ISO date string when contact was added
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
