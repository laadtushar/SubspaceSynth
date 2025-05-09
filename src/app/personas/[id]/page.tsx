'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import PersonaProfileDisplay from '@/components/personas/PersonaProfileDisplay';
import ChatInterface from '@/components/chat/ChatInterface';
import type { Persona } from '@/lib/types';
import { getPersonaById } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle } from 'lucide-react';

export default function PersonaPage() {
  const params = useParams();
  const router = useRouter();
  const [persona, setPersona] = useState<Persona | null | undefined>(undefined); // undefined for loading, null for not found

  const personaId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (personaId) {
      const fetchedPersona = getPersonaById(personaId);
      if (fetchedPersona) {
        setPersona(fetchedPersona);
      } else {
        setPersona(null); // Persona not found
      }
    }
  }, [personaId]);

  const handlePersonaUpdate = (updatedPersona: Persona) => {
    setPersona(updatedPersona);
  };

  if (persona === undefined) {
    return (
      <div className="h-screen grid md:grid-cols-[350px_1fr] lg:grid-cols-[400px_1fr] gap-1 p-1">
        <Skeleton className="h-full w-full rounded-lg" />
        <Skeleton className="h-full w-full rounded-lg" />
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

  return (
    <div className="h-[calc(100vh-var(--header-height,0px)-2rem)] md:h-[calc(100vh-2rem)] grid md:grid-cols-[350px_1fr] lg:grid-cols-[400px_1fr] gap-1 p-0 md:p-1 max-h-screen overflow-hidden">
      {/* CSS variable for header height on mobile is needed if header is fixed */}
      <style jsx global>{`
        :root {
          --header-height: 3.5rem; /* 56px, h-14 Tailwind class */
        }
      `}</style>
      <div className="hidden md:block h-full overflow-y-auto">
        <PersonaProfileDisplay persona={persona} onPersonaUpdate={handlePersonaUpdate} />
      </div>
      <div className="h-full">
        <ChatInterface persona={persona} />
      </div>
      {/* Drawer/Sheet for profile on mobile - Future enhancement */}
    </div>
  );
}
