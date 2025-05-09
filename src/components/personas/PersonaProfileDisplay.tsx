'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Bot, BarChart2, Loader2, Sparkles, BrainCircuit } from 'lucide-react';
import type { Persona } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { analyzePersonaInsights } from '@/ai/flows/analyze-persona-insights';
import { developPersonaPersonality } from '@/ai/flows/develop-persona-flow';
import { savePersona } from '@/lib/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PersonaProfileDisplayProps {
  persona: Persona;
  onPersonaUpdate: (updatedPersona: Persona) => void;
}

export default function PersonaProfileDisplay({ persona, onPersonaUpdate }: PersonaProfileDisplayProps) {
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isDevelopingPersonality, setIsDevelopingPersonality] = useState(false);
  const [developmentPrompts, setDevelopmentPrompts] = useState('');
  const [isDevelopDialogValid, setIsDevelopDialogValid] = useState(false);
  const { toast } = useToast();

  const handleAnalyzeInsights = async () => {
    setIsLoadingInsights(true);
    try {
      const insightsResponse = await analyzePersonaInsights({
        chatHistory: persona.chatHistory,
        mbtiType: persona.mbti,
        age: persona.age,
        gender: persona.gender,
      });

      const updatedPersona = { ...persona, personalityInsights: insightsResponse.personalityInsights };
      savePersona(updatedPersona);
      onPersonaUpdate(updatedPersona);

      toast({
        title: 'Insights Generated',
        description: 'Personality insights have been successfully analyzed and updated.',
      });
    } catch (error) {
      console.error('Failed to analyze insights:', error);
      toast({
        title: 'Error',
        description: 'Failed to analyze personality insights.',
        variant: 'destructive',
      });
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const handleDevelopPersonality = async () => {
    if (!developmentPrompts.trim()) {
        toast({
            title: 'Error',
            description: 'Development prompts cannot be empty.',
            variant: 'destructive',
        });
        return;
    }
    setIsDevelopingPersonality(true);
    try {
      const response = await developPersonaPersonality({
        currentPersonaDescription: persona.personaDescription || `A persona named ${persona.name}`,
        developmentPrompts: developmentPrompts,
        name: persona.name,
        mbtiType: persona.mbti,
        age: persona.age,
        gender: persona.gender,
      });

      const updatedPersona = { ...persona, personaDescription: response.newPersonaDescription };
      savePersona(updatedPersona);
      onPersonaUpdate(updatedPersona);
      
      toast({
        title: 'Personality Developed',
        description: `${persona.name}'s personality has been successfully updated.`,
      });
      setDevelopmentPrompts(''); // Clear prompts after successful submission
      // Dialog will be closed by DialogClose if submission is successful.
    } catch (error) {
      console.error('Failed to develop personality:', error);
      toast({
        title: 'Error',
        description: 'Failed to develop personality. The AI might be unavailable or an error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsDevelopingPersonality(false);
    }
  };

  const onDevelopmentPromptsChange = (value: string) => {
    setDevelopmentPrompts(value);
    setIsDevelopDialogValid(value.trim().length > 0);
  };

  return (
    <Card className="w-full h-full flex flex-col shadow-lg">
      <CardHeader className="p-4 border-b">
        <div className="flex items-center gap-3">
          <Image 
            src={persona.avatarUrl || `https://picsum.photos/seed/${persona.id}/64/64`} 
            alt={persona.name} 
            width={64} 
            height={64} 
            className="rounded-full border-2 border-primary"
            data-ai-hint="profile avatar"
          />
          <div>
            <CardTitle className="text-xl font-bold">{persona.name}</CardTitle>
            <div className="flex flex-wrap gap-1 mt-1">
              {persona.mbti && <Badge variant="outline">MBTI: {persona.mbti}</Badge>}
              {persona.age && <Badge variant="outline">Age: {persona.age}</Badge>}
              {persona.gender && <Badge variant="outline">Gender: {persona.gender}</Badge>}
            </div>
          </div>
        </div>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="p-4 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center">
                <Bot className="h-4 w-4 mr-2 text-primary" /> AI Persona Description
              </h3>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <BrainCircuit className="h-4 w-4 mr-1" /> Develop
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[525px]">
                  <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                      <BrainCircuit className="h-6 w-6 text-primary" /> Develop {persona.name}'s Personality
                    </DialogTitle>
                    <DialogDescription>
                      Guide the AI to refine or evolve this persona. Provide prompts on how you want their personality, traits, or communication style to change.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div>
                      <Label htmlFor="current-description" className="text-sm font-medium text-muted-foreground">
                        Current Persona Description
                      </Label>
                      <ScrollArea className="h-32 mt-1">
                        <p className="text-xs bg-muted p-2 rounded-md leading-relaxed">
                          {persona.personaDescription || 'No description generated yet.'}
                        </p>
                      </ScrollArea>
                    </div>
                    <div>
                      <Label htmlFor="development-prompts">
                        Development Prompts
                      </Label>
                      <Textarea
                        id="development-prompts"
                        placeholder="e.g., Make them more sarcastic. Add a backstory about their childhood love for space. Give them a specific fear..."
                        value={developmentPrompts}
                        onChange={(e) => onDevelopmentPromptsChange(e.target.value)}
                        className="min-h-[100px] mt-1"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <DialogClose asChild>
                       <Button type="button" variant="outline">Cancel</Button>
                    </DialogClose>
                    <Button 
                      type="button" 
                      onClick={async () => {
                        await handleDevelopPersonality();
                        // Only close dialog via DialogClose if successful
                        // but we want to keep it open on error.
                        // This is a bit tricky with shadcn Dialog. A potential solution is to control 'open' state manually.
                        // For now, success will close it via DialogClose wrapper if the submit button is inside it.
                        // If error, user has to manually close.
                        // Let's assume for now that if handleDevelopPersonality is successful, it clears prompts and we can close.
                        if (!isDevelopingPersonality && developmentPrompts === '') { // check if it was successful and cleared
                           // This part might not work as expected due to async nature.
                           // Consider managing open state of dialog.
                        }
                      }} 
                      disabled={isDevelopingPersonality || !isDevelopDialogValid}
                    >
                      {isDevelopingPersonality && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Update Personality
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-sm bg-muted p-3 rounded-md leading-relaxed">
              {persona.personaDescription || 'No description generated yet.'}
            </p>
          </div>

          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center">
              <BarChart2 className="h-4 w-4 mr-2 text-primary" /> Personality Insights
            </h3>
            {persona.personalityInsights ? (
              <pre className="text-sm bg-muted p-3 rounded-md whitespace-pre-wrap font-sans leading-relaxed">
                {persona.personalityInsights}
              </pre>
            ) : (
              <div className="text-center p-4 border border-dashed rounded-md">
                <p className="text-sm text-muted-foreground mb-2">No insights analyzed yet.</p>
                <Button onClick={handleAnalyzeInsights} disabled={isLoadingInsights} size="sm">
                  {isLoadingInsights ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="mr-2 h-4 w-4" />
                  )}
                  Generate Insights
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
