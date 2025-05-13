
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
  updateCurrentProfile: (updates: { name?: string; avatarUrl?: string }) => Promise<void>;
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
          id: firebaseUser.uid, // Ensure ID is from FirebaseUser
          email: firebaseUser.email || existingProfile.email || '',
          name: existingProfile.name || firebaseUser.displayName || emailNamePart,
          avatarUrl: existingProfile.avatarUrl || firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
          lastLogin: now,
        };
        await update(userNodeRef, { 
          lastLogin: now, 
          email: profileData.email, 
          name: profileData.name,
          avatarUrl: profileData.avatarUrl, // ensure avatarUrl from Google is saved
        });
      } else {
        profileData = {
          id: firebaseUser.uid,
          email: firebaseUser.email || '',
          name: firebaseUser.displayName || emailNamePart,
          avatarUrl: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
          createdAt: now,
          lastLogin: now,
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
      // Fallback if DB operations fail (should be rare if rules are correct)
      const fallbackProfile: UserProfile = {
        id: firebaseUser.uid,
        email: firebaseUser.email || '',
        name: firebaseUser.displayName || (firebaseUser.email ? firebaseUser.email.split('@')[0] : `User...`),
        createdAt: new Date().toISOString(), 
        lastLogin: new Date().toISOString(),
        avatarUrl: firebaseUser.photoURL || `https://picsum.photos/seed/${firebaseUser.uid}/100/100`,
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
      // fetchOrCreateUserProfile will be called by onAuthStateChanged
      
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
      router.push('/'); // fetchOrCreateUserProfile will handle profile state
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
    // setLoadingAuth(false) will be handled by onAuthStateChanged
  };

  const loginWithEmail = async (values: AuthFormValues) => {
    setLoadingAuth(true);
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      // fetchOrCreateUserProfile will be called by onAuthStateChanged
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
    // setLoadingAuth(false) will be handled by onAuthStateChanged
  };

  const signInWithGoogle = async () => {
    setLoadingAuth(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      // fetchOrCreateUserProfile will be called by onAuthStateChanged
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
    // setLoadingAuth(false) will be handled by onAuthStateChanged
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
    } finally {
      // setLoadingAuth(false) will be handled by onAuthStateChanged after signOut triggers it
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

  const updateCurrentProfile = async (updates: { name?: string; avatarUrl?: string }) => {
    if (!userId || !userProfile) {
      toast({ title: 'Error', description: 'No user profile found to update.', variant: 'destructive' });
      return;
    }
    setLoadingAuth(true); // Indicate activity
    try {
      // Ensure only valid fields are passed and handle undefined for avatarUrl if empty string
      const profileUpdates: Partial<UserProfile> = {};
      if (updates.name !== undefined) profileUpdates.name = updates.name;
      if (updates.avatarUrl !== undefined) { // Check for undefined explicitly
        profileUpdates.avatarUrl = updates.avatarUrl === '' ? `https://picsum.photos/seed/${userId}/100/100` : updates.avatarUrl;
      }
      
      await updateUserProfileInDBStore(userId, profileUpdates);
      
      // Update local state optimistically or after confirmation
      setUserProfile(prev => ({ ...prev!, ...profileUpdates } as UserProfile));
      
      toast({ title: 'Profile Updated', description: 'Your profile has been successfully updated.' });
      router.push('/profile'); // Navigate back to profile page
    } catch (error: any) {
      console.error("Error updating profile:", error);
      toast({ title: 'Update Failed', description: error.message || 'Could not update profile.', variant: 'destructive' });
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
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

    