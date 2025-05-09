
import type { Persona, ChatMessage } from './types';

const PERSONAS_KEY_BASE = 'personaSim_personas';
const CHATS_KEY_PREFIX_BASE = 'personaSim_chats_';

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
const getChatKey = (userId: string, personaId: string) => `${CHATS_KEY_PREFIX_BASE}${userId}_${personaId}`;

// Persona Management
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

export const savePersona = (userId: string, persona: Persona): void => {
  if (!userId) return;
  const personasKey = getPersonasKey(userId);
  const personas = getPersonas(userId); // Ensures we're operating on the correct user's data
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
  personas = personas.filter(p => p.id !== personaId);
  setLocalStorageItem(personasKey, JSON.stringify(personas));
  
  // Also delete associated chats for that user and persona
  const chatKey = getChatKey(userId, personaId);
  removeLocalStorageItem(chatKey);
};

// Chat Management
export const getChatMessages = (userId: string, personaId: string): ChatMessage[] => {
  if (!userId) return [];
  const chatKey = getChatKey(userId, personaId);
  const messagesJson = getLocalStorageItem(chatKey);
  return messagesJson ? JSON.parse(messagesJson) : [];
};

export const saveChatMessage = (userId: string, personaId: string, message: ChatMessage): void => {
  if (!userId) return;
  const chatKey = getChatKey(userId, personaId);
  const messages = getChatMessages(userId, personaId);
  messages.push(message);
  setLocalStorageItem(chatKey, JSON.stringify(messages));
};

export const clearChatMessages = (userId: string, personaId: string): void => {
  if (!userId) return;
  const chatKey = getChatKey(userId, personaId);
  removeLocalStorageItem(chatKey);
};
