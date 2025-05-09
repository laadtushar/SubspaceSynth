import type { Persona, ChatMessage } from './types';

const PERSONAS_KEY = 'personaSim_personas';
const CHATS_KEY_PREFIX = 'personaSim_chats_';

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

// Persona Management
export const getPersonas = (): Persona[] => {
  const personasJson = getLocalStorageItem(PERSONAS_KEY);
  return personasJson ? JSON.parse(personasJson) : [];
};

export const getPersonaById = (id: string): Persona | undefined => {
  const personas = getPersonas();
  return personas.find(p => p.id === id);
};

export const savePersona = (persona: Persona): void => {
  const personas = getPersonas();
  const existingIndex = personas.findIndex(p => p.id === persona.id);
  if (existingIndex > -1) {
    personas[existingIndex] = persona;
  } else {
    personas.push(persona);
  }
  setLocalStorageItem(PERSONAS_KEY, JSON.stringify(personas));
};

export const deletePersona = (id: string): void => {
  let personas = getPersonas();
  personas = personas.filter(p => p.id !== id);
  setLocalStorageItem(PERSONAS_KEY, JSON.stringify(personas));
  // Also delete associated chats
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${CHATS_KEY_PREFIX}${id}`);
  }
};

// Chat Management
export const getChatMessages = (personaId: string): ChatMessage[] => {
  const messagesJson = getLocalStorageItem(`${CHATS_KEY_PREFIX}${personaId}`);
  return messagesJson ? JSON.parse(messagesJson) : [];
};

export const saveChatMessage = (personaId: string, message: ChatMessage): void => {
  const messages = getChatMessages(personaId);
  messages.push(message);
  setLocalStorageItem(`${CHATS_KEY_PREFIX}${personaId}`, JSON.stringify(messages));
};

export const clearChatMessages = (personaId: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(`${CHATS_KEY_PREFIX}${personaId}`);
  }
};
