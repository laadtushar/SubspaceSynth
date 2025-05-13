
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import EditProfileForm from '@/components/profile/EditProfileForm';
import { Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function EditProfilePage() {
  const { user, userProfile, loadingAuth } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
    }
  }, [user, loadingAuth, router]);

  if (loadingAuth) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,0px)-2rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !userProfile) {
    // This case should ideally be handled by the redirect in useEffect,
    // but as a fallback or if there's a delay in profile loading.
    return (
      <div className="flex flex-col justify-center items-center h-[calc(100vh-var(--header-height,0px)-2rem)] text-center p-4">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h1 className="text-xl font-semibold mb-2">Access Denied</h1>
        <p className="text-muted-foreground mb-4">You must be logged in to edit your profile. Redirecting to login...</p>
        <Button onClick={() => router.push('/login')} variant="outline">Go to Login</Button>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8">
      <EditProfileForm userProfile={userProfile} />
    </div>
  );
}

    