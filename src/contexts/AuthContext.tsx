
'use client';

import type { ReactNode, Dispatch, SetStateAction } from 'react';
import React, { createContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { User as FirebaseUser, IdTokenResult } from 'firebase/auth';
import { onAuthStateChanged, signOut as firebaseSignOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import type { AuthFormValues } from '@/components/auth/AuthForm'; // Will create this type

interface AuthContextType {
  user: FirebaseUser | null;
  loadingAuth: boolean;
  loginWithEmail: (values: AuthFormValues) => Promise<FirebaseUser | null>;
  signupWithEmail: (values: AuthFormValues) => Promise<FirebaseUser | null>;
  logout: () => Promise<void>;
  userId: string | null;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setUserId(firebaseUser.uid);
      } else {
        setUser(null);
        setUserId(null);
      }
      setLoadingAuth(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (values: AuthFormValues): Promise<FirebaseUser | null> => {
    setLoadingAuth(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      setUser(userCredential.user);
      setUserId(userCredential.user.uid);
      router.push('/');
      return userCredential.user;
    } catch (error) {
      console.error("Login error", error);
      setUser(null);
      setUserId(null);
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
      setUser(userCredential.user);
      setUserId(userCredential.user.uid);
      router.push('/');
      return userCredential.user;
    } catch (error) {
      console.error("Signup error", error);
      setUser(null);
      setUserId(null);
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
      setUserId(null);
      // Redirect to login only if not already on a public page like login/signup
      if (pathname !== '/login' && pathname !== '/signup') {
        router.push('/login');
      }
    } catch (error) {
      console.error("Logout error", error);
      // Handle logout error appropriately, maybe a toast
    } finally {
      setLoadingAuth(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loadingAuth, loginWithEmail, signupWithEmail, logout, userId }}>
      {children}
    </AuthContext.Provider>
  );
};
