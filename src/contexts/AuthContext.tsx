
'use client';

import type { ReactNode } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as FirebaseUser } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import type { AuthFormValues } from '@/components/auth/AuthForm';
import type { UserProfile } from '@/lib/types';
import { ref, set, get, serverTimestamp, update } from 'firebase/database';
import { USERS_PATH } from '@/lib/store'; // Import path constant

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  loadingAuth: boolean;
  loginWithEmail: (values: AuthFormValues) => Promise<FirebaseUser | null>;
  signupWithEmail: (values: AuthFormValues) => Promise<FirebaseUser | null>;
  logout: () => Promise<void>;
  userId: string | null; // This is firebaseUser.uid
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  const fetchOrCreateUserProfile = useCallback(async (firebaseUser: FirebaseUser): Promise<UserProfile | null> => {
    const userRefPath = `${USERS_PATH}/${firebaseUser.uid}`;
    const userNodeRef = ref(db, userRefPath);
    
    try {
      const snapshot = await get(userNodeRef);
      const now = new Date().toISOString();
      const emailNamePart = firebaseUser.email ? firebaseUser.email.split('@')[0] : `User${firebaseUser.uid.substring(0,5)}`;

      if (snapshot.exists()) {
        const profileData = snapshot.val() as UserProfile;
        // Update last login
        await update(userNodeRef, { lastLogin: now });
        const updatedProfile = { ...profileData, lastLogin: now };
        setUserProfile(updatedProfile);
        return updatedProfile;
      } else {
        // Create new user profile
        const newUserProfile: UserProfile = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || emailNamePart,
          avatarUrl: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
          createdAt: now,
          lastLogin: now,
        };
        await set(userNodeRef, newUserProfile);
        setUserProfile(newUserProfile);
        return newUserProfile;
      }
    } catch (error) {
      console.error("Error fetching or creating user profile in DB:", error);
      // Check if it's a permission error
      if ((error as any).code === 'PERMISSION_DENIED') {
        console.error(
          "Firebase Realtime Database permission denied. Please check your database rules. " +
          "Ensure authenticated users can read/write their own profile data under 'users/{uid}'. " +
          "Example rule for 'users/$uid': { '.read': 'auth.uid === $uid', '.write': 'auth.uid === $uid' }"
        );
      }
      return null;
    }
  }, []);


  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        // Fetch or create user profile in Realtime Database
        await fetchOrCreateUserProfile(firebaseUser);
      } else {
        setUser(null);
        setUserProfile(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, [fetchOrCreateUserProfile]);

  const loginWithEmail = async (values: AuthFormValues): Promise<FirebaseUser | null> => {
    setLoadingAuth(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      // User profile creation/fetch is handled by onAuthStateChanged listener
      router.push('/');
      return userCredential.user;
    } catch (error) {
      console.error("Login error", error);
      // Let the form handle error display
      throw error;
    } finally {
      setLoadingAuth(false);
    }
  };

  const signupWithEmail = async (values: AuthFormValues): Promise<FirebaseUser | null> => {
    setLoadingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      // User profile creation/fetch is handled by onAuthStateChanged listener
      router.push('/');
      return userCredential.user;
    } catch (error) {
      console.error("Signup error", error);
      // Let the form handle error display
      throw error;
    } finally {
      setLoadingAuth(false);
    }
  };
  
  const logout = async () => {
    setLoadingAuth(true);
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUserProfile(null);
      if (pathname !== '/login' && pathname !== '/signup') {
        router.push('/login');
      }
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      setLoadingAuth(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, userProfile, loadingAuth, loginWithEmail, signupWithEmail, logout, userId: user?.uid || null }}>
      {children}
    </AuthContext.Provider>
  );
};
