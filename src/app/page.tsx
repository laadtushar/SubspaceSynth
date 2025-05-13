
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Search, Users, Loader2, Folder } from 'lucide-react';
import PersonaCard from '@/components/personas/PersonaCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Persona } from '@/lib/types';
import { getPersonas, deletePersona as deletePersonaFromStore } from '@/lib/store';
import { useToast } from "@/hooks/use-toast";
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from '@/components/ui/badge';

interface GroupedPersonas {
  [category: string]: Persona[];
}

export default function DashboardPage() {
  const { user, loadingAuth, userId } = useAuth();
  const router = useRouter();
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [groupedPersonas, setGroupedPersonas] = useState<GroupedPersonas>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [pageLoading, setPageLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
      setPageLoading(false); 
    }
  }, [user, loadingAuth, router]);

  const groupPersonasByCategory = (personasToList: Persona[], term: string): GroupedPersonas => {
    const filtered = personasToList.filter(persona =>
      persona.name.toLowerCase().includes(term.toLowerCase()) ||
      (persona.category && persona.category.toLowerCase().includes(term.toLowerCase()))
    );

    const grouped: GroupedPersonas = {};
    filtered.forEach(persona => {
      const category = persona.category || 'Uncategorized';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(persona);
    });
    
    // Sort categories: Uncategorized last, others alphabetically
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      if (a === 'Uncategorized') return 1;
      if (b === 'Uncategorized') return -1;
      return a.localeCompare(b);
    });
    
    const result: GroupedPersonas = {};
    for (const category of sortedCategories) {
      result[category] = grouped[category];
    }
    return result;
  };

  useEffect(() => {
    let unsubscribePersonas: (() => void) | undefined;

    if (userId) {
      setPageLoading(true);
      unsubscribePersonas = getPersonas(userId, (fetchedPersonas) => {
        setPersonas(fetchedPersonas);
        setGroupedPersonas(groupPersonasByCategory(fetchedPersonas, searchTerm));
        setPageLoading(false);
      });
    } else if (!loadingAuth && !user) {
       setPageLoading(false);
    }
    
    return () => {
      if (unsubscribePersonas) {
        unsubscribePersonas();
      }
    };
  }, [userId, loadingAuth, user]); // searchTerm dependency removed here, handled by search input change

  useEffect(() => {
    setGroupedPersonas(groupPersonasByCategory(personas, searchTerm));
  }, [searchTerm, personas]);


  const handleDeletePersona = async (personaId: string) => {
    if (!userId) return;
    try {
      await deletePersonaFromStore(userId, personaId);
      // Personas state will be updated by the onValue listener from getPersonas
      toast({
        title: "Persona Deleted",
        description: "The persona has been successfully deleted.",
      });
    } catch (error) {
      console.error("Error deleting persona:", error);
      toast({
        title: "Error Deleting Persona",
        description: (error as Error).message || "Could not delete persona.",
        variant: "destructive",
      });
    }
  };

  if (loadingAuth || pageLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,0px)-2rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
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

  const totalFilteredPersonasCount = Object.values(groupedPersonas).reduce((sum, arr) => sum + arr.length, 0);

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">My Personas</h1>
        </div>
        <Link href="/personas/new" passHref>
          <Button>
            <PlusCircle className="mr-2 h-5 w-5" /> Create New Persona
          </Button>
        </Link>
      </header>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search personas by name or category..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {totalFilteredPersonasCount > 0 ? (
        <Accordion type="multiple" defaultValue={Object.keys(groupedPersonas)} className="w-full">
          {Object.entries(groupedPersonas).map(([category, personaList]) => (
            <AccordionItem value={category} key={category}>
              <AccordionTrigger className="text-lg font-medium hover:no-underline">
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-primary" />
                  {category} 
                  <Badge variant="secondary" className="ml-2">{personaList.length}</Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent>
                {personaList.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
                    {personaList.map((persona) => (
                      <PersonaCard key={persona.id} persona={persona} onDelete={handleDeletePersona} />
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground p-4 text-sm">
                    No personas in this category match your search.
                  </p>
                )}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      ) : (
        <div className="text-center py-12">
          <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">
            {searchTerm ? "No Personas Found" : "No Personas Yet"}
          </h2>
          <p className="text-muted-foreground mb-4">
            {searchTerm ? `No personas match your search for "${searchTerm}".` : "Get started by creating your first AI persona."}
          </p>
          {!searchTerm && (
            <Link href="/personas/new" passHref>
              <Button variant="outline">
                <PlusCircle className="mr-2 h-5 w-5" /> Create Persona
              </Button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
