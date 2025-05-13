
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import CreatePersonaForm from '@/components/personas/CreatePersonaForm';
import { Loader2 } from 'lucide-react';
import { getPersonas } from '@/lib/store'; 
import type { Persona } from '@/lib/types'; 
import { FREE_PERSONA_LIMIT } from '@/lib/constants'; 
import PaywallNotice from '@/components/billing/PaywallNotice'; 

export default function NewPersonaPage() {
  const { user, loadingAuth, userId } = useAuth();
  const router = useRouter();
  const [personasCount, setPersonasCount] = useState<number | null>(null);
  const [isLoadingPersonaCount, setIsLoadingPersonaCount] = useState(true);

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
    }
  }, [user, loadingAuth, router]);

  useEffect(() => {
    let unsubscribePersonas: (() => void) | undefined;

    if (userId) {
      setIsLoadingPersonaCount(true);
      // This listener will fetch personas. We take the length for the count.
      // It unsubscribes after the first data fetch to avoid continuous updates on this page for just the count.
      let firstFetchDone = false;
      unsubscribePersonas = getPersonas(userId, (fetchedPersonas: Persona[]) => {
        if (!firstFetchDone) {
          setPersonasCount(fetchedPersonas.length);
          setIsLoadingPersonaCount(false);
          firstFetchDone = true;
          if (unsubscribePersonas) {
            unsubscribePersonas(); // Unsubscribe after getting the count
          }
        }
      });
    } else if (!loadingAuth && !user) {
      // Not logged in, no personas to count, stop loading.
      setIsLoadingPersonaCount(false);
      setPersonasCount(0); 
    }
    
    return () => {
      // Ensure unsubscription on component unmount if it's still active
      if (unsubscribePersonas && !firstFetchDone) { 
        unsubscribePersonas();
      }
    };
  }, [userId, loadingAuth, user]);

  if (loadingAuth || isLoadingPersonaCount || personasCount === null) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,0px)-2rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) { // Should be caught by earlier redirect, but as a safeguard
     return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,0px)-2rem)]">
        <p>Redirecting to login...</p>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (personasCount >= FREE_PERSONA_LIMIT) {
    return (
        <div className="container mx-auto py-8">
            <PaywallNotice currentPersonaCount={personasCount} freePersonaLimit={FREE_PERSONA_LIMIT} />
        </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <CreatePersonaForm />
    </div>
  );
}

