import Link from 'next/link';
import Image from 'next/image';
import { Bot, MessageSquare, Edit3, Trash2, BarChart2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Persona } from '@/lib/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PersonaCardProps {
  persona: Persona;
  onDelete: (id: string) => void;
}

export default function PersonaCard({ persona, onDelete }: PersonaCardProps) {
  const handleDelete = () => {
    onDelete(persona.id);
  };
  
  return (
    <Card className="flex flex-col overflow-hidden shadow-lg hover:shadow-xl transition-shadow duration-300">
      <CardHeader className="flex flex-row items-start gap-4 p-4">
        <Image 
          src={persona.avatarUrl || `https://picsum.photos/seed/${persona.id}/80/80`} 
          alt={persona.name} 
          width={80} 
          height={80} 
          className="rounded-full border-2 border-primary"
          data-ai-hint="profile avatar" 
        />
        <div className="flex-1">
          <CardTitle className="text-xl font-bold">{persona.name}</CardTitle>
          <CardDescription className="text-sm line-clamp-2 h-10">
            {persona.personaDescription || 'No description yet. Interact to build personality.'}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="p-4 flex-grow">
        <div className="space-y-2">
          {persona.mbti && <Badge variant="secondary">MBTI: {persona.mbti}</Badge>}
          {persona.age && <Badge variant="secondary">Age: {persona.age}</Badge>}
          {persona.gender && <Badge variant="secondary">Gender: {persona.gender}</Badge>}
        </div>
        {persona.personalityInsights && (
           <p className="mt-3 text-xs text-muted-foreground line-clamp-3">
             <BarChart2 className="inline-block mr-1 h-3 w-3" />
             {persona.personalityInsights}
           </p>
        )}
      </CardContent>
      <CardFooter className="p-4 bg-muted/50 border-t flex justify-end gap-2">
        <Link href={`/personas/${persona.id}`} passHref>
          <Button variant="outline" size="sm">
            <MessageSquare className="mr-2 h-4 w-4" /> Chat
          </Button>
        </Link>
        {/* <Button variant="outline" size="sm" disabled> Edit functionality coming soon
          <Edit3 className="mr-2 h-4 w-4" /> Edit
        </Button> */}
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the persona
                "{persona.name}" and all associated chat history.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardFooter>
    </Card>
  );
}
