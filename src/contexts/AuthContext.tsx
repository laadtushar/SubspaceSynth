
'use client';

import type { PropsWithChildren } from 'react';
import React, { createContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import {
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, set, get, update, serverTimestamp } from 'firebase/database';
import type { UserProfile } from '@/lib/types';
import type { AuthFormValues } from '@/components/auth/AuthForm';
import { USERS_PATH } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: FirebaseUser | null;
  userId: string | null;
  userProfile: UserProfile | null;
  loadingAuth: boolean;
  loginWithEmail: (values: AuthFormValues) => Promise<void>;
  signupWithEmail: (values: AuthFormValues) => Promise<void>;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const fetchOrCreateUserProfile = useCallback(async (firebaseUser: FirebaseUser) => {
    if (!firebaseUser) {
      setUserProfile(null);
      setUserId(null);
      return;
    }

    const userNodeRef = ref(db, `${USERS_PATH}/${firebaseUser.uid}`);
    
    try {
      const snapshot = await get(userNodeRef);
      const now = new Date().toISOString();
      const emailNamePart = firebaseUser.email ? firebaseUser.email.split('@')[0] : `User${firebaseUser.uid.substring(0,5)}`;
      
      if (snapshot.exists()) {
        // User exists, update lastLogin and set profile
        const existingProfile = snapshot.val() as UserProfile;
        const updatedProfileData = {
          ...existingProfile,
          lastLogin: now,
          // Ensure email and name are updated if they somehow changed or were missing
          email: firebaseUser.email || existingProfile.email || '',
          name: existingProfile.name || firebaseUser.displayName || emailNamePart,
        };
        await update(userNodeRef, { lastLogin: now, email: updatedProfileData.email, name: updatedProfileData.name });
        setUserProfile(updatedProfileData);
      } else {
        // User does not exist, create new profile
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
      }
      setUserId(firebaseUser.uid);
    } catch (error: any) {
      console.error('Error fetching or creating user profile:', error);
      toast({
        title: 'Profile Error',
        description: `Failed to load or create user profile: ${error.message}`,
        variant: 'destructive',
      });
      // Fallback if DB operations fail
      setUserProfile({
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || emailNamePart,
        createdAt: new Date().toISOString(), // Placeholder
        lastLogin: new Date().toISOString(), // Placeholder
      });
      setUserId(firebaseUser.uid);
    }
  }, [toast]);

  useEffect(() => {
    setLoadingAuth(true);
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        await fetchOrCreateUserProfile(firebaseUser);
      } else {
        setUser(null);
        setUserId(null);
        setUserProfile(null);
        // Redirect to login if not on a public page and not already there
        if (pathname !== '/login' && pathname !== '/signup') {
           // router.push('/login'); // Commented out for now, can be re-enabled if strict redirect is needed
        }
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [fetchOrCreateUserProfile, router, pathname]);


  const signupWithEmail = async (values: AuthFormValues) => {
    setLoadingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      // User profile creation/update is handled by onAuthStateChanged listener calling fetchOrCreateUserProfile
      toast({
        title: 'Signup Successful',
        description: 'Welcome! Your account has been created.',
      });
      router.push('/');
    } catch (error: any) {
      console.error("Signup error:", error);
      toast({
        title: 'Signup Failed',
        description: error.message || 'Could not create account. Please try again.',
        variant: 'destructive',
      });
      setLoadingAuth(false); 
      throw error; 
    }
  };

  const loginWithEmail = async (values: AuthFormValues) => {
    setLoadingAuth(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      // User profile update (lastLogin) is handled by onAuthStateChanged listener calling fetchOrCreateUserProfile
      toast({
        title: 'Login Successful',
        description: 'Welcome back!',
      });
      router.push('/');
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: 'Login Failed',
        description: error.message || 'Invalid credentials or user not found. Please try again.',
        variant: 'destructive',
      });
      setLoadingAuth(false); 
      throw error; 
    }
  };

  const logout = async () => {
    setLoadingAuth(true);
    try {
      await signOut(auth);
      // State updates (setUser, setUserId, setUserProfile) will be handled by the onAuthStateChanged listener
      router.push('/login');
      toast({
        title: 'Logged Out',
        description: 'You have been successfully logged out.',
      });
    } catch (error: any) {
      console.error("Logout error:", error);
      toast({
        title: 'Logout Failed',
        description: error.message || 'Could not log out. Please try again.',
        variant: 'destructive',
      });
    } finally {
      // setLoadingAuth(false) will be handled by onAuthStateChanged listener after signOut triggers it
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        userId,
        userProfile,
        loadingAuth,
        loginWithEmail,
        signupWithEmail,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
