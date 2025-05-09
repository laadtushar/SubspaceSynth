
import type { Persona, ChatMessage, UserChatMessage, UserContact } from './types';

const PERSONAS_KEY_BASE = 'personaSim_personas';
const CHATS_KEY_PREFIX_BASE = 'personaSim_chats_'; // For persona chats
const USER_CHATS_KEY_PREFIX_BASE = 'personaSim_userchats_'; // For user-to-user chats

// Helper to safely access localStorage
const getLocalStorageItem = (key: string): string | null => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(key);
  }
  return null;
};

const setLocalStorageItem = (key: string, value: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, value);
  }
};

const removeLocalStorageItem = (key: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(key);
  }
}

const getPersonasKey = (userId: string) => `${PERSONAS_KEY_BASE}_${userId}`;
// Key for persona (AI) chat messages
const getPersonaChatKey = (userId: string, personaId: string) => `${CHATS_KEY_PREFIX_BASE}${userId}_${personaId}`;
// Key for user-to-user chat messages
const getUserChatKey = (chatId: string) => `${USER_CHATS_KEY_PREFIX_BASE}${chatId}`;


// --- User Contact Management (Mocked) ---
const MOCK_USER_CONTACTS: UserContact[] = [
  { id: 'user2_mock_id_alex', name: 'Alex Smith', avatarUrl: 'https://picsum.photos/seed/alex/60/60' },
  { id: 'user3_mock_id_maria', name: 'Maria Garcia', avatarUrl: 'https://picsum.photos/seed/maria/60/60' },
  { id: 'user4_mock_id_sam', name: 'Sam Lee', avatarUrl: 'https://picsum.photos/seed/sam/60/60' },
];

export const getUserContacts = (currentUserId: string): UserContact[] => {
  // In a real app, this would fetch from a backend.
  // We filter out the current user from the list of contacts.
  return MOCK_USER_CONTACTS.filter(contact => contact.id !== currentUserId);
};

export const getUserContactById = (contactId: string): UserContact | undefined => {
  // Also include current user if their ID is passed, for fetching their own details if needed
  const allUsers = [...MOCK_USER_CONTACTS, /* potentially add self if not in MOCK_USER_CONTACTS */];
  return allUsers.find(contact => contact.id === contactId);
};


// --- Persona Management (Handles both user-created and chat-derived) ---
export const getPersonas = (userId: string): Persona[] => {
  if (!userId) return [];
  const personasKey = getPersonasKey(userId);
  const personasJson = getLocalStorageItem(personasKey);
  return personasJson ? JSON.parse(personasJson) : [];
};

export const getPersonaById = (userId: string, id: string): Persona | undefined => {
  if (!userId) return undefined;
  const personas = getPersonas(userId);
  return personas.find(p => p.id === id);
};

// Specific function to get a chat-derived persona
export const getChatDerivedPersona = (userId: string, derivedFromChatId: string, derivedRepresentingUserId: string): Persona | undefined => {
  if (!userId) return undefined;
  const personas = getPersonas(userId);
  return personas.find(p => 
    p.originType === 'chat-derived' && 
    p.derivedFromChatId === derivedFromChatId &&
    p.derivedRepresentingUserId === derivedRepresentingUserId
  );
};

export const savePersona = (userId: string, persona: Persona): void => {
  if (!userId) return;
  const personasKey = getPersonasKey(userId);
  const personas = getPersonas(userId); 
  const existingIndex = personas.findIndex(p => p.id === persona.id);
  if (existingIndex > -1) {
    personas[existingIndex] = persona;
  } else {
    personas.push(persona);
  }
  setLocalStorageItem(personasKey, JSON.stringify(personas));
};

export const deletePersona = (userId: string, personaId: string): void => {
  if (!userId) return;
  const personasKey = getPersonasKey(userId);
  let personas = getPersonas(userId);
  const personaToDelete = personas.find(p => p.id === personaId);
  
  personas = personas.filter(p => p.id !== personaId);
  setLocalStorageItem(personasKey, JSON.stringify(personas));
  
  // If it's a user-created persona, also delete its associated AI chats
  if (personaToDelete && personaToDelete.originType === 'user-created') {
    const chatKey = getPersonaChatKey(userId, personaId);
    removeLocalStorageItem(chatKey);
  }
  // Chat-derived personas don't have their own separate chat logs in the same way; their 'chats' are the user-to-user messages.
};


// --- AI Persona Chat Management (for ChatInterface.tsx) ---
export const getChatMessages = (userId: string, personaId: string): ChatMessage[] => {
  if (!userId) return [];
  const chatKey = getPersonaChatKey(userId, personaId);
  const messagesJson = getLocalStorageItem(chatKey);
  return messagesJson ? JSON.parse(messagesJson) : [];
};

export const saveChatMessage = (userId: string, personaId: string, message: ChatMessage): void => {
  if (!userId) return;
  const chatKey = getPersonaChatKey(userId, personaId);
  const messages = getChatMessages(userId, personaId);
  messages.push(message);
  setLocalStorageItem(chatKey, JSON.stringify(messages));
};

export const clearChatMessages = (userId: string, personaId: string): void => {
  if (!userId) return;
  const chatKey = getPersonaChatKey(userId, personaId);
  removeLocalStorageItem(chatKey);
};


// --- User-to-User Chat Management ---
export const getUserChatMessages = (chatId: string): UserChatMessage[] => {
  const chatKey = getUserChatKey(chatId);
  const messagesJson = getLocalStorageItem(chatKey);
  return messagesJson ? JSON.parse(messagesJson) : [];
};

export const saveUserChatMessage = (chatId: string, message: UserChatMessage): void => {
  const chatKey = getUserChatKey(chatId);
  const messages = getUserChatMessages(chatId);
  messages.push(message);
  setLocalStorageItem(chatKey, JSON.stringify(messages));
};

export const clearUserChatMessages = (chatId: string): void => {
  const chatKey = getUserChatKey(chatId);
  removeLocalStorageItem(chatKey);
};

// Helper to generate a consistent chatId for two users
export const generateUserChatId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_');
};
