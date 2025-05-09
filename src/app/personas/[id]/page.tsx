
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PersonaProfileDisplay from '@/components/personas/PersonaProfileDisplay';
import ChatInterface from '@/components/chat/ChatInterface';
import type { Persona } from '@/lib/types';
import { getPersonaById } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';


export default function PersonaPage() {
  const { user, loadingAuth, userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  
  const [persona, setPersona] = useState<Persona | null | undefined>(undefined); // undefined for loading, null for not found
  const [pageLoading, setPageLoading] = useState(true);

  const personaIdParams = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
    }
  }, [user, loadingAuth, router]);

  useEffect(() => {
    if (userId && personaIdParams) {
      const fetchedPersona = getPersonaById(userId, personaIdParams);
      setPersona(fetchedPersona || null); 
      setPageLoading(false);
    } else if (!loadingAuth && !user) {
      setPageLoading(false);
    }
  }, [userId, personaIdParams, loadingAuth, user]);


  const handlePersonaUpdate = (updatedPersona: Persona) => {
    setPersona(updatedPersona); 
  };

  if (loadingAuth || pageLoading) {
    return (
      <div className="h-[calc(100vh-var(--header-height,0px)-2rem)] grid md:grid-cols-[350px_1fr] lg:grid-cols-[400px_1fr] gap-1 p-1">
        <Skeleton className="h-full w-full rounded-lg" />
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Redirecting to login...</p>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (persona === null) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Persona Not Found</h1>
        <p className="text-muted-foreground mb-4">The persona you are looking for does not exist or has been deleted.</p>
        <Button onClick={() => router.push('/')}>Go to Dashboard</Button>
      </div>
    );
  }
  
  if (persona === undefined) { 
     return (
      <div className="h-[calc(100vh-var(--header-height,0px)-2rem)] grid md:grid-cols-[350px_1fr] lg:grid-cols-[400px_1fr] gap-1 p-1">
        <Skeleton className="h-full w-full rounded-lg" />
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    );
  }

  // Chat-derived personas might not have all features available for direct chat if they are only for practice mode.
  // For now, ChatInterface will work, but specific UI adjustments might be needed if features differ.
  const isChatInterfaceDisabled = persona.originType === 'chat-derived' && !persona.personaDescription;


  return (
    <div className="h-[calc(100vh-var(--header-height,0px)-2rem)] md:h-[calc(100vh-2rem)] grid md:grid-cols-[350px_1fr] lg:grid-cols-[400px_1fr] gap-1 p-0 md:p-1 max-h-screen overflow-hidden">
      <style jsx global>{`
        :root {
          --header-height: 3.5rem; /* 56px, h-14 Tailwind class */
        }
      `}</style>
      <div className="hidden md:block h-full overflow-y-auto">
        <PersonaProfileDisplay persona={persona} onPersonaUpdate={handlePersonaUpdate} />
      </div>
      <div className="h-full">
        {isChatInterfaceDisabled ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-muted/50 rounded-lg">
                <Bot className="w-16 h-16 text-muted-foreground mb-4" />
                <h2 className="text-xl font-semibold mb-2">Practice Persona Not Ready</h2>
                <p className="text-muted-foreground">This AI persona is derived from a chat and needs to be generated or updated from the original chat screen.</p>
            </div>
        ) : (
            <ChatInterface persona={persona} />
        )}
      </div>
    </div>
  );
}
