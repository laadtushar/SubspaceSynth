
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
  limitToLast,
  update,
} from 'firebase/database';

// Firebase Realtime Database Paths
export const USERS_PATH = 'users'; // Stores UserProfile objects, keyed by UID
const USER_CONTACTS_PATH_BASE = 'user_contacts'; // Stores UserContact objects: user_contacts/{currentUserId}/{contactUserId}
const PERSONAS_PATH_BASE = 'personas'; // Stores Persona objects: personas/{userId}/{personaId}
const AI_CHAT_MESSAGES_PATH_BASE = 'ai_chat_messages'; // Stores ChatMessage: ai_chat_messages/{userId}/{personaId}/{messageId}
const USER_CHAT_MESSAGES_PATH_BASE = 'user_chat_messages'; // Stores UserChatMessage: user_chat_messages/{chatId}/{messageId}


// --- User Profile Management ---

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

export const updateUserProfileInDB = async (userId: string, updates: Partial<UserProfile>): Promise<void> => {
  if (!userId) throw new Error("User ID is required to update a profile.");
  const userRef = ref(db, `${USERS_PATH}/${userId}`);
  try {
    // Filter out undefined values to avoid writing them to Firebase,
    // which could unintentionally delete fields if not handled carefully by rules.
    const validUpdates: Partial<UserProfile> = {};
    for (const key in updates) {
      if (updates[key as keyof UserProfile] !== undefined) {
        validUpdates[key as keyof UserProfile] = updates[key as keyof UserProfile];
      }
    }
    if (Object.keys(validUpdates).length > 0) {
      await update(userRef, validUpdates);
    }
  } catch (error) {
    console.error(`Error updating user profile for ${userId}:`, error);
    throw error;
  }
};


export const getRegisteredUserByEmailFromDB = async (email: string): Promise<UserProfile | null> => {
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
  } catch (error: any) {
    console.error(`Error fetching user by email ${email}:`, error.message);

    if (error.message && typeof error.message === 'string' && error.message.includes("Index not defined")) {
      console.error(
        "\n===================================================================================\n" +
        "IMPORTANT: Firebase Realtime Database Configuration Required\n" +
        "===================================================================================\n" +
        "The query to find a user by email failed because an index is not defined for the 'email' field on the '/users' path.\n\n" +
        "To fix this, you MUST update your Firebase Realtime Database rules.\n" +
        "Add the following .indexOn rule to your '/users' path in the Firebase console:\n\n" +
        "{\n" +
        '  "rules": {\n' +
        '    "users": {\n' +
        '      ".indexOn": ["email"]\n' +
        '      // ... any other rules you have for /users ...\n' +
        '    }\n' +
        '    // ... other top-level rules ...\n' +
        '  }\n' +
        "}\n\n" +
        "After adding this rule, publish your changes in the Firebase console.\n" +
        "Refer to Firebase documentation on indexing data: https://firebase.google.com/docs/database/security/indexing-data\n" +
        "===================================================================================\n"
      );
    } else if (error.code === 'PERMISSION_DENIED') {
        console.error(
          "Firebase Realtime Database permission denied for querying users by email. " +
          "Ensure your rules allow reading the 'users' path or specific indexes. " +
          "For querying by email, you'd typically need rules like: \n" +
          `{
            "rules": {
              "users": {
                "$uid": {
                  ".read": "auth != null && auth.uid == $uid", 
                  ".write": "auth != null && auth.uid == $uid"
                },
                ".read": "auth != null", // Required for query by email
                ".indexOn": ["email"]
              }
            }
          }`
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
    throw new Error('User with that email not found in the system. They may need to log in once to be registered, or the email is incorrect.');
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
  const contactsQuery = query(ref(db, contactsRefPath), orderByChild('name')); 

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

  return () => off(contactsQuery, 'value', listener); 
};


// --- AI Persona Management ---
export const savePersona = async (userId: string, personaData: Persona): Promise<void> => {
  if (!userId) throw new Error("User ID is required to save a persona.");
  const personaRef = ref(db, `${PERSONAS_PATH_BASE}/${userId}/${personaData.id}`);
  
  // Firebase does not allow 'undefined' values.
  // JSON.stringify will remove keys with 'undefined' values.
  // JSON.parse will then reconstruct the object without these keys.
  const cleanedPersona = JSON.parse(JSON.stringify(personaData));

  try {
    await set(personaRef, cleanedPersona);
  } catch (error) {
    console.error(`Error saving persona ${personaData.id}:`, error);
    console.error('Original persona data:', JSON.stringify(personaData, null, 2));
    console.error('Cleaned persona data for Firebase:', JSON.stringify(cleanedPersona, null, 2));
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
  
  const persona = await getPersonaById(userId, personaId); 

  const personaRef = ref(db, `${PERSONAS_PATH_BASE}/${userId}/${personaId}`);
  try {
    await remove(personaRef);
    if (persona && persona.originType === 'user-created') {
      const aiChatMessagesRef = ref(db, `${AI_CHAT_MESSAGES_PATH_BASE}/${userId}/${personaId}`);
      await remove(aiChatMessagesRef);
    }
  } catch (error) {
    console.error(`Error deleting persona ${personaId}:`, error);
    throw error;
  }
};

export const getChatDerivedPersona = async (userId: string, derivedFromChatId: string, derivedRepresentingUserId: string): Promise<Persona | null> => {
  if (!userId) return null;
  const personasRefPath = `${PERSONAS_PATH_BASE}/${userId}`;
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
export const saveChatMessage = async (userId: string, personaId: string, message: Omit<ChatMessage, 'id' | 'timestamp'>): Promise<string> => {
  if (!userId || !personaId) throw new Error("User ID and Persona ID are required.");
  const messagesRef = ref(db, `${AI_CHAT_MESSAGES_PATH_BASE}/${userId}/${personaId}`);
  const newMessageRef = push(messagesRef); 
  try {
    await set(newMessageRef, { ...message, timestamp: serverTimestamp() }); 
    return newMessageRef.key!; 
  } catch (error) {
    console.error("Error saving AI chat message:", error);
    throw error;
  }
};

export const getChatMessages = (
  userId: string, 
  personaId: string, 
  callback: (messages: ChatMessage[]) => void, 
  limit: number | null = 50 // null limit fetches all messages
): (() => void) => {
  if (!userId || !personaId) {
    callback([]);
    return () => {};
  }
  
  let messagesQuery;
  const path = `${AI_CHAT_MESSAGES_PATH_BASE}/${userId}/${personaId}`;
  if (limit === null) {
    messagesQuery = query(ref(db, path), orderByChild('timestamp'));
  } else {
    messagesQuery = query(ref(db, path), orderByChild('timestamp'), limitToLast(limit));
  }
  
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

// New function for persona export: Fetches ALL messages for a persona
export const getAllChatMessagesForPersona = async (userId: string, personaId: string): Promise<ChatMessage[]> => {
  if (!userId || !personaId) return [];
  
  const messagesRef = ref(db, `${AI_CHAT_MESSAGES_PATH_BASE}/${userId}/${personaId}`);
  const messagesQuery = query(messagesRef, orderByChild('timestamp'));
  
  try {
    const snapshot = await get(messagesQuery);
    if (snapshot.exists()) {
      const messagesData = snapshot.val();
      return Object.entries(messagesData).map(([id, data]) => ({ id, ...(data as Omit<ChatMessage, 'id'>) }));
    }
    return [];
  } catch (error) {
    console.error("Error fetching all AI chat messages for persona:", error);
    return [];
  }
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
