'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Bot, BarChart2, Loader2, Sparkles, Edit3 } from 'lucide-react';
import type { Persona } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { analyzePersonaInsights } from '@/ai/flows/analyze-persona-insights';
import { savePersona } from '@/lib/store';
import { ScrollArea } from '@/components/ui/scroll-area';

interface PersonaProfileDisplayProps {
  persona: Persona;
  onPersonaUpdate: (updatedPersona: Persona) => void;
}

export default function PersonaProfileDisplay({ persona, onPersonaUpdate }: PersonaProfileDisplayProps) {
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
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
      onPersonaUpdate(updatedPersona); // Notify parent component

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
        {/* <Button variant="ghost" size="sm" className="absolute top-4 right-4" disabled> <Edit3 className="h-4 w-4 mr-1" /> Edit</Button> Coming soon */}
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="p-4 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-1 flex items-center">
              <Bot className="h-4 w-4 mr-2 text-primary" /> AI Persona Description
            </h3>
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
