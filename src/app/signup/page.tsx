
'use client';

import Link from 'next/link';
import AuthForm from '@/components/auth/AuthForm';
import type { SignupAuthFormValues, AuthFormValues } from '@/components/auth/AuthForm';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function SignupPage() {
  const { signupWithEmail, user, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && user) {
      router.push('/');
    }
  }, [user, loadingAuth, router]);
  
  if (loadingAuth || user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleSignupSubmit = async (values: AuthFormValues) => {
    // Type guard to ensure values are of SignupAuthFormValues type
    if ('geminiApiKey' in values) {
      await signupWithEmail(values as SignupAuthFormValues);
    } else {
      // This case should ideally not happen if form validation is correct for signup mode
      console.error("Gemini API Key missing in signup form values");
      throw new Error("Gemini API Key is required for signup.");
    }
  };

  return (
    <AuthForm
      mode="signup"
      onSubmit={handleSignupSubmit}
      title="Create an Account"
      description="Sign up to start creating your AI personas."
      submitButtonText="Sign Up"
      alternateActionLink={
        <>
          Already have an account?{' '}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    />
  );
}
