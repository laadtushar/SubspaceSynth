
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import CreatePersonaForm from '@/components/personas/CreatePersonaForm';
import { Loader2 } from 'lucide-react';
import { getPersonasCount } from '@/lib/store'; 
import { FREE_PERSONA_LIMIT } from '@/lib/constants'; 
import PaywallNotice from '@/components/billing/PaywallNotice'; 

export default function NewPersonaPage() {
  const { user, userProfile, loadingAuth, userId } = useAuth(); // Added userProfile
  const router = useRouter();
  const [personasCount, setPersonasCount] = useState<number | null>(null);
  const [isLoadingPersonaCount, setIsLoadingPersonaCount] = useState(true);

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
    }
  }, [user, loadingAuth, router]);

  useEffect(() => {
    if (userId) {
      setIsLoadingPersonaCount(true);
      getPersonasCount(userId)
        .then(count => {
          setPersonasCount(count);
          setIsLoadingPersonaCount(false);
        })
        .catch(error => {
          console.error("Failed to fetch persona count:", error);
          setPersonasCount(0); // Fallback
          setIsLoadingPersonaCount(false);
        });
    } else if (!loadingAuth && !user) {
      setIsLoadingPersonaCount(false);
      setPersonasCount(0); 
    }
  }, [userId, loadingAuth, user]);

  if (loadingAuth || isLoadingPersonaCount || personasCount === null || !userProfile) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,0px)-2rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) { 
     return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,0px)-2rem)]">
        <p>Redirecting to login...</p>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const currentQuota = userProfile.personaQuota === undefined ? FREE_PERSONA_LIMIT : userProfile.personaQuota;

  if (personasCount >= currentQuota) {
    return (
        <div className="container mx-auto py-8">
            <PaywallNotice 
              currentPersonaCount={personasCount} 
              currentQuota={currentQuota} 
            />
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <CreatePersonaForm currentPersonaCount={personasCount} currentQuota={currentQuota} />
    </div>
  );
}
