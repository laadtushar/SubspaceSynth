
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
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { ref, set, get, update } from 'firebase/database';
import type { UserProfile } from '@/lib/types';
import type { AuthFormValues } from '@/components/auth/AuthForm';
import { USERS_PATH, updateUserProfileInDB as updateUserProfileInDBStore } from '@/lib/store';
import { useToast } from '@/hooks/use-toast';
import { FREE_PERSONA_LIMIT } from '@/lib/constants';

interface AuthContextType {
  user: FirebaseUser | null;
  userId: string | null;
  userProfile: UserProfile | null;
  isEmailVerified: boolean;
  loadingAuth: boolean;
  loginWithEmail: (values: AuthFormValues) => Promise<void>;
  signupWithEmail: (values: AuthFormValues) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  updateCurrentProfile: (updates: { name?: string; avatarUrl?: string; geminiApiKey?: string }) => Promise<void>;
  incrementPersonaQuota: (amount: number) => Promise<void>;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: PropsWithChildren) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isEmailVerified, setIsEmailVerified] = useState<boolean>(false);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const fetchOrCreateUserProfile = useCallback(async (firebaseUser: FirebaseUser | null) => {
    if (!firebaseUser) {
      setUserProfile(null);
      setUserId(null);
      setIsEmailVerified(false);
      return;
    }

    setIsEmailVerified(firebaseUser.emailVerified);
    const userNodeRef = ref(db, `${USERS_PATH}/${firebaseUser.uid}`);
    
    try {
      const snapshot = await get(userNodeRef);
      const now = new Date().toISOString();
      const emailNamePart = firebaseUser.email ? firebaseUser.email.split('@')[0] : `User${firebaseUser.uid.substring(0,5)}`;
      
      let profileData: UserProfile;

      if (snapshot.exists()) {
        const existingProfile = snapshot.val() as UserProfile;
        profileData = {
          ...existingProfile,
          id: firebaseUser.uid, 
          email: firebaseUser.email || existingProfile.email || '',
          name: existingProfile.name || firebaseUser.displayName || emailNamePart,
          avatarUrl: existingProfile.avatarUrl || firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
          lastLogin: now,
          geminiApiKey: existingProfile.geminiApiKey || '',
          personaQuota: existingProfile.personaQuota === undefined ? FREE_PERSONA_LIMIT : existingProfile.personaQuota,
        };
        // Ensure all fields, including new ones, are updated if user logs in
        await update(userNodeRef, { 
          lastLogin: now, 
          email: profileData.email, 
          name: profileData.name,
          avatarUrl: profileData.avatarUrl,
          geminiApiKey: profileData.geminiApiKey,
          personaQuota: profileData.personaQuota,
        });
      } else {
        profileData = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || emailNamePart,
          avatarUrl: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
          createdAt: now,
          lastLogin: now,
          geminiApiKey: '', 
          personaQuota: FREE_PERSONA_LIMIT,
        };
        await set(userNodeRef, profileData);
      }
      setUserProfile(profileData);
      setUserId(firebaseUser.uid);
    } catch (error: any) {
      console.error('Error fetching or creating user profile:', error);
      toast({
        title: 'Profile Error',
        description: `Failed to load or create user profile: ${error.message}`,
        variant: 'destructive',
      });
      const fallbackProfile: UserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : `User...`),
        createdAt: new Date().toISOString(), 
        lastLogin: new Date().toISOString(),
        avatarUrl: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
        geminiApiKey: '',
        personaQuota: FREE_PERSONA_LIMIT,
      };
      setUserProfile(fallbackProfile);
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
        setIsEmailVerified(false);
      }
      setLoadingAuth(false);
    });
    return () => unsubscribe();
  }, [fetchOrCreateUserProfile]);


  const signupWithEmail = async (values: AuthFormValues) => {
    setLoadingAuth(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, values.email, values.password);
      
      try {
        await sendEmailVerification(userCredential.user);
        toast({
          title: 'Verification Email Sent',
          description: 'Please check your inbox to verify your email address.',
        });
      } catch (verificationError: any) {
        console.error("Email verification sending error:", verificationError);
        toast({
          title: 'Verification Email Not Sent',
          description: 'Could not send verification email. You can request it again from your profile.',
          variant: 'destructive',
        });
      }

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
      await signInWithEmailAndPassword(auth, values.email, values.password);
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

  const signInWithGoogle = async () => {
    setLoadingAuth(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      toast({
        title: 'Signed In with Google',
        description: 'Welcome!',
      });
      router.push('/');
    } catch (error: any) {
      console.error("Google Sign-In error:", error);
      toast({
        title: 'Google Sign-In Failed',
        description: error.message || 'Could not sign in with Google. Please try again.',
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
    } 
  };

  const resendVerificationEmail = async () => {
    if (!user) {
      toast({ title: 'Error', description: 'You are not logged in.', variant: 'destructive' });
      return;
    }
    if (user.emailVerified) {
      toast({ title: 'Already Verified', description: 'Your email is already verified.' });
      return;
    }
    try {
      await sendEmailVerification(user);
      toast({
        title: 'Verification Email Sent',
        description: 'Please check your inbox to verify your email address.',
      });
    } catch (error: any) {
      console.error("Resend verification email error:", error);
      toast({
        title: 'Error Sending Email',
        description: error.message || 'Could not resend verification email.',
        variant: 'destructive',
      });
    }
  };

  const updateCurrentProfile = async (updates: { name?: string; avatarUrl?: string; geminiApiKey?: string }) => {
    if (!userId || !userProfile) {
      toast({ title: 'Error', description: 'No user profile found to update.', variant: 'destructive' });
      return;
    }
    setLoadingAuth(true); 
    try {
      const profileUpdates: Partial<UserProfile> = {};
      if (updates.name !== undefined) profileUpdates.name = updates.name;
      if (updates.avatarUrl !== undefined) { 
        profileUpdates.avatarUrl = updates.avatarUrl === '' ? `https://picsum.photos/seed/${userId}/100/100` : updates.avatarUrl;
      }
      if (updates.geminiApiKey !== undefined) profileUpdates.geminiApiKey = updates.geminiApiKey;
      
      await updateUserProfileInDBStore(userId, profileUpdates);
      
      setUserProfile(prev => ({ ...prev!, ...profileUpdates } as UserProfile));
      
      toast({ title: 'Profile Updated', description: 'Your profile has been successfully updated.' });
      router.push('/profile'); 
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: 'Update Failed', description: error.message || 'Could not update profile.', variant: 'destructive' });
    } finally {
      setLoadingAuth(false);
    }
  };

  const incrementPersonaQuota = async (amount: number) => {
    if (!userId || !userProfile) {
      toast({ title: 'Error', description: 'No user profile found to update quota.', variant: 'destructive' });
      return;
    }
    setLoadingAuth(true);
    try {
      const currentQuota = userProfile.personaQuota === undefined ? FREE_PERSONA_LIMIT : userProfile.personaQuota;
      const newQuota = currentQuota + amount;
      await updateUserProfileInDBStore(userId, { personaQuota: newQuota });
      setUserProfile(prev => ({ ...prev!, personaQuota: newQuota } as UserProfile));
      // Toast is handled by PaywallNotice for successful payment simulation
    } catch (error: any) {
      console.error("Error incrementing persona quota:", error);
      toast({ title: 'Quota Update Failed', description: error.message || 'Could not update persona quota.', variant: 'destructive' });
      throw error; // Re-throw for PaywallNotice to handle
    } finally {
      setLoadingAuth(false);
    }
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        userId,
        userProfile,
        isEmailVerified,
        loadingAuth,
        loginWithEmail,
        signupWithEmail,
        signInWithGoogle,
        logout,
        resendVerificationEmail,
        updateCurrentProfile,
        incrementPersonaQuota,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
