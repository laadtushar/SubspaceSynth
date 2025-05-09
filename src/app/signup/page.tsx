
'use client';

import Link from 'next/link';
import AuthForm from '@/components/auth/AuthForm';
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

  return (
    <AuthForm
      mode="signup"
      onSubmit={signupWithEmail}
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
