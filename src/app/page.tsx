'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { PlusCircle, Search, Users } from 'lucide-react';
import PersonaCard from '@/components/personas/PersonaCard';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Persona } from '@/lib/types';
import { getPersonas, deletePersona as deletePersonaFromStore } from '@/lib/store';
import { useToast } from "@/hooks/use-toast";

export default function DashboardPage() {
  const [personas, setPersonas] = useState<Persona[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setPersonas(getPersonas());
  }, []);

  const handleDeletePersona = (id: string) => {
    deletePersonaFromStore(id);
    setPersonas(prevPersonas => prevPersonas.filter(p => p.id !== id));
    toast({
      title: "Persona Deleted",
      description: "The persona has been successfully deleted.",
    });
  };

  const filteredPersonas = personas.filter(persona =>
    persona.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            placeholder="Search personas..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredPersonas.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPersonas.map((persona) => (
            <PersonaCard key={persona.id} persona={persona} onDelete={handleDeletePersona} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Personas Yet</h2>
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
