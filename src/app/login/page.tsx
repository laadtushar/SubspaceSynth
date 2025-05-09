
'use client';

import Link from 'next/link';
import AuthForm from '@/components/auth/AuthForm';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';


export default function LoginPage() {
  const { loginWithEmail, user, loadingAuth } = useAuth();
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
      mode="login"
      onSubmit={loginWithEmail}
      title="Welcome Back!"
      description="Log in to continue to PersonaSim."
      submitButtonText="Log In"
      alternateActionLink={
        <>
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Sign up
          </Link>
        </>
      }
    />
  );
}
