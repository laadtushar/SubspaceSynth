
import type { Persona, ChatMessage, UserChatMessage, UserContact, UserProfile } from './types';
import { db } from './firebase';
import { 
  ref, 
  set, 
  get, 
  query, 
  orderByChild, 
  equalTo, 
  push, 
  remove, 
  serverTimestamp, 
  onValue, 
  off,
  orderByKey,
  limitToLast
} from 'firebase/database';

// Firebase Realtime Database Paths
export const USERS_PATH = 'users'; // Stores UserProfile objects, keyed by UID
const USER_CONTACTS_PATH_BASE = 'user_contacts'; // Stores UserContact objects: user_contacts/{currentUserId}/{contactUserId}
const PERSONAS_PATH_BASE = 'personas'; // Stores Persona objects: personas/{userId}/{personaId}
const AI_CHAT_MESSAGES_PATH_BASE = 'ai_chat_messages'; // Stores ChatMessage: ai_chat_messages/{userId}/{personaId}/{messageId}
const USER_CHAT_MESSAGES_PATH_BASE = 'user_chat_messages'; // Stores UserChatMessage: user_chat_messages/{chatId}/{messageId}


// --- User Profile Management (Primarily handled in AuthContext, helpers can be here) ---

export const getUserProfileById = async (userId: string): Promise<UserProfile | null> => {
  if (!userId) return null;
  const userRef = ref(db, `${USERS_PATH}/${userId}`);
  try {
    const snapshot = await get(userRef);
    return snapshot.exists() ? (snapshot.val() as UserProfile) : null;
  } catch (error) {
    console.error(`Error fetching user profile for ${userId}:`, error);
    return null;
  }
};

export const getRegisteredUserByEmailFromDB = async (email: string): Promise<UserProfile | null> => {
  // Firebase Realtime Database doesn't support querying by arbitrary fields like email directly without specific indexing rules.
  // A common approach is to fetch all users and filter, or create a separate index (e.g., emailToUid map).
  // For simplicity, if your rules allow reading the whole /users path:
  const usersRef = query(ref(db, USERS_PATH), orderByChild('email'), equalTo(email.toLowerCase()));
  try {
    const snapshot = await get(usersRef);
    if (snapshot.exists()) {
      const usersData = snapshot.val();
      // snapshot.val() returns an object where keys are UIDs and values are UserProfile objects
      const userId = Object.keys(usersData)[0]; // Get the first matching UID
      return usersData[userId] as UserProfile;
    }
    return null;
  } catch (error) {
    console.error(`Error fetching user by email ${email}:`, error);
     if ((error as any).code === 'PERMISSION_DENIED') {
        console.error(
          "Firebase Realtime Database permission denied for querying users by email. " +
          "Ensure your rules allow reading the 'users' path or specific indexes. " +
          "For querying by email, you'd need: rules > users > .indexOn: ['email']"
        );
      }
    return null;
  }
};


// --- User Contact Management ---

export const addContactByEmail = async (currentUserId: string, email: string): Promise<UserContact | null> => {
  if (!currentUserId || !email) return null;

  const contactUserToAdd = await getRegisteredUserByEmailFromDB(email);
  if (!contactUserToAdd) {
    throw new Error('User with that email not found in the system.');
  }
  if (contactUserToAdd.id === currentUserId) {
    throw new Error('You cannot add yourself as a contact.');
  }

  const currentUserContactsPath = `${USER_CONTACTS_PATH_BASE}/${currentUserId}`;
  const contactEntryRef = ref(db, `${currentUserContactsPath}/${contactUserToAdd.id}`);

  const snapshot = await get(contactEntryRef);
  if (snapshot.exists()) {
    throw new Error(`${contactUserToAdd.name || contactUserToAdd.email} is already in your contacts.`);
  }

  const newContact: UserContact = {
    id: contactUserToAdd.id,
    name: contactUserToAdd.name,
    avatarUrl: contactUserToAdd.avatarUrl,
    addedAt: new Date().toISOString(),
  };

  try {
    await set(contactEntryRef, newContact);
    // Optionally, add a reciprocal contact entry for the other user (or handle via friend requests)
    return newContact;
  } catch (error) {
    console.error(`Error adding contact ${email}:`, error);
    throw new Error('Could not add contact. Please try again.');
  }
};

export const getUserContacts = (currentUserId: string, callback: (contacts: UserContact[]) => void): (() => void) => {
  if (!currentUserId) {
    callback([]);
    return () => {};
  }
  const contactsRefPath = `${USER_CONTACTS_PATH_BASE}/${currentUserId}`;
  const contactsQuery = query(ref(db, contactsRefPath), orderByChild('name')); // Example: order by name

  const listener = onValue(contactsQuery, (snapshot) => {
    const contactsData = snapshot.val();
    if (contactsData) {
      const contactsList = Object.values(contactsData) as UserContact[];
      callback(contactsList);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Error fetching user contacts:", error);
    callback([]);
  });

  return () => off(contactsQuery, 'value', listener); // Detach listener
};


// --- AI Persona Management ---
export const savePersona = async (userId: string, persona: Persona): Promise<void> => {
  if (!userId) throw new Error("User ID is required to save a persona.");
  const personaRef = ref(db, `${PERSONAS_PATH_BASE}/${userId}/${persona.id}`);
  try {
    await set(personaRef, persona);
  } catch (error) {
    console.error(`Error saving persona ${persona.id}:`, error);
    throw error;
  }
};

export const getPersonas = (userId: string, callback: (personas: Persona[]) => void): (() => void) => {
  if (!userId) {
    callback([]);
    return () => {};
  }
  const personasRefPath = `${PERSONAS_PATH_BASE}/${userId}`;
  const personasQuery = query(ref(db, personasRefPath), orderByChild('createdAt'));

  const listener = onValue(personasQuery, (snapshot) => {
    const personasData = snapshot.val();
    if (personasData) {
      const personasList = Object.values(personasData) as Persona[];
      callback(personasList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Error fetching personas:", error);
    callback([]);
  });
  return () => off(personasQuery, 'value', listener);
};

export const getPersonaById = async (userId: string, personaId: string): Promise<Persona | null> => {
  if (!userId || !personaId) return null;
  const personaRef = ref(db, `${PERSONAS_PATH_BASE}/${userId}/${personaId}`);
  try {
    const snapshot = await get(personaRef);
    return snapshot.exists() ? (snapshot.val() as Persona) : null;
  } catch (error) {
    console.error(`Error fetching persona ${personaId}:`, error);
    return null;
  }
};

export const deletePersona = async (userId: string, personaId: string): Promise<void> => {
  if (!userId || !personaId) throw new Error("User ID and Persona ID are required.");
  
  const persona = await getPersonaById(userId, personaId); // Fetch to check originType

  const personaRef = ref(db, `${PERSONAS_PATH_BASE}/${userId}/${personaId}`);
  try {
    await remove(personaRef);
    // If it's a user-created persona, also delete its associated AI chats
    if (persona && persona.originType === 'user-created') {
      const aiChatMessagesRef = ref(db, `${AI_CHAT_MESSAGES_PATH_BASE}/${userId}/${personaId}`);
      await remove(aiChatMessagesRef);
    }
  } catch (error) {
    console.error(`Error deleting persona ${personaId}:`, error);
    throw error;
  }
};

// Specific function to get a chat-derived persona (used by UserChatInterface)
export const getChatDerivedPersona = async (userId: string, derivedFromChatId: string, derivedRepresentingUserId: string): Promise<Persona | null> => {
  if (!userId) return null;
  const personasRefPath = `${PERSONAS_PATH_BASE}/${userId}`;
  // Firebase RTDB query for multiple conditions is complex.
  // It's often easier to fetch and filter or structure data for direct lookup.
  // Querying by one field and filtering by others:
  const q = query(ref(db, personasRefPath), orderByChild('derivedFromChatId'), equalTo(derivedFromChatId));
  try {
    const snapshot = await get(q);
    if (snapshot.exists()) {
      const personasData = snapshot.val();
      const matchingPersona = Object.values(personasData as Record<string, Persona>).find(
        p => p.originType === 'chat-derived' && p.derivedRepresentingUserId === derivedRepresentingUserId
      );
      return matchingPersona || null;
    }
    return null;
  } catch (error) {
    console.error("Error fetching chat-derived persona:", error);
    return null;
  }
};


// --- AI Persona Chat Message Management (for ChatInterface.tsx) ---
export const saveChatMessage = async (userId: string, personaId: string, message: Omit<ChatMessage, 'id'>): Promise<string> => {
  if (!userId || !personaId) throw new Error("User ID and Persona ID are required.");
  const messagesRef = ref(db, `${AI_CHAT_MESSAGES_PATH_BASE}/${userId}/${personaId}`);
  const newMessageRef = push(messagesRef); // Generates a unique ID
  try {
    await set(newMessageRef, { ...message, timestamp: serverTimestamp() }); // Use serverTimestamp for consistency
    return newMessageRef.key!; // Return the generated message ID
  } catch (error) {
    console.error("Error saving AI chat message:", error);
    throw error;
  }
};

export const getChatMessages = (userId: string, personaId: string, callback: (messages: ChatMessage[]) => void, limit: number = 50): (() => void) => {
  if (!userId || !personaId) {
    callback([]);
    return () => {};
  }
  const messagesQuery = query(ref(db, `${AI_CHAT_MESSAGES_PATH_BASE}/${userId}/${personaId}`), orderByChild('timestamp'), limitToLast(limit));
  
  const listener = onValue(messagesQuery, (snapshot) => {
    const messagesData = snapshot.val();
    if (messagesData) {
      const messagesList = Object.entries(messagesData).map(([id, data]) => ({ id, ...(data as Omit<ChatMessage, 'id'>) }));
      callback(messagesList);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Error fetching AI chat messages:", error);
    callback([]);
  });
  return () => off(messagesQuery, 'value', listener);
};

export const clearChatMessages = async (userId: string, personaId: string): Promise<void> => {
  if (!userId || !personaId) return;
  const messagesRef = ref(db, `${AI_CHAT_MESSAGES_PATH_BASE}/${userId}/${personaId}`);
  try {
    await remove(messagesRef);
  } catch (error) {
    console.error("Error clearing AI chat messages:", error);
    throw error;
  }
};


// --- User-to-User Chat Message Management ---
export const generateUserChatId = (userId1: string, userId2: string): string => {
  return [userId1, userId2].sort().join('_');
};

export const saveUserChatMessage = async (chatId: string, message: Omit<UserChatMessage, 'id' | 'timestamp'> & { timestamp?: any }): Promise<string> => {
  if (!chatId) throw new Error("Chat ID is required.");
  const messagesRef = ref(db, `${USER_CHAT_MESSAGES_PATH_BASE}/${chatId}`);
  const newMessageRef = push(messagesRef);
  try {
    // Use serverTimestamp if timestamp isn't provided, otherwise use the provided one (ensure it's a string or number for RTDB)
    const messageToSave = {
      ...message,
      timestamp: message.timestamp || serverTimestamp(),
    };
    await set(newMessageRef, messageToSave);
    return newMessageRef.key!;
  } catch (error) {
    console.error("Error saving user chat message:", error);
    throw error;
  }
};

export const getUserChatMessages = (chatId: string, callback: (messages: UserChatMessage[]) => void, limit: number = 50): (() => void) => {
  if (!chatId) {
    callback([]);
    return () => {};
  }
  const messagesQuery = query(ref(db, `${USER_CHAT_MESSAGES_PATH_BASE}/${chatId}`), orderByChild('timestamp'), limitToLast(limit));
  
  const listener = onValue(messagesQuery, (snapshot) => {
    const messagesData = snapshot.val();
    if (messagesData) {
      const messagesList = Object.entries(messagesData).map(([id, data]) => ({ id, ...(data as Omit<UserChatMessage, 'id'>) }));
      callback(messagesList);
    } else {
      callback([]);
    }
  }, (error) => {
    console.error("Error fetching user chat messages:", error);
    callback([]);
  });
  return () => off(messagesQuery, 'value', listener);
};

export const clearUserChatMessages = async (chatId: string): Promise<void> => {
  if (!chatId) return;
  const messagesRef = ref(db, `${USER_CHAT_MESSAGES_PATH_BASE}/${chatId}`);
  try {
    await remove(messagesRef);
  } catch (error) {
    console.error("Error clearing user chat messages:", error);
    throw error;
  }
};
