
'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Bot, BarChart2, Loader2, Sparkles, BrainCircuit, MessageSquare, Zap } from 'lucide-react';
import type { Persona } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { analyzePersonaInsights, type AnalyzePersonaInsightsOutput } from '@/ai/flows/analyze-persona-insights';
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
  DialogFooter as ShadDialogFooter, // Renamed to avoid conflict if any
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, Bar, XAxis, YAxis, CartesianGrid, BarChart } from 'recharts';
import type { ChartConfig } from '@/components/ui/chart'; // Assuming ChartConfig is defined and exportable

interface PersonaProfileDisplayProps {
  persona: Persona;
  onPersonaUpdate: (updatedPersona: Persona) => void;
}

// Helper to check if insights are in the new structured format
const isStructuredInsights = (insights: any): insights is AnalyzePersonaInsightsOutput => {
  return typeof insights === 'object' && insights !== null && 'summary' in insights && 'sentiment' in insights;
};


export default function PersonaProfileDisplay({ persona, onPersonaUpdate }: PersonaProfileDisplayProps) {
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isDevelopingPersonality, setIsDevelopingPersonality] = useState(false);
  const [developmentPrompts, setDevelopmentPrompts] = useState('');
  const [isDevelopDialogValpromptd, setIsDevelopDialogValpromptd] = useState(false);
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

      const updatedPersona = { ...persona, personalityInsights: insightsResponse };
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
        description: 'Failed to analyze personality insights. The AI may have returned an unexpected format or an error occurred.',
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
      setDevelopmentPrompts(''); 
      setIsDevelopDialogValpromptd(false);
      // Manually find and click the close button if possible, or manage open state
      document.getElementById(`develop-dialog-close-${persona.id}`)?.click();

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
    setIsDevelopDialogValpromptd(value.trim().length > 0);
  };

  const currentInsights = persona.personalityInsights;
  const displayableInsights = isStructuredInsights(currentInsights) ? currentInsights : null;

  const sentimentData = displayableInsights?.sentiment ? [
    { name: 'Positive', value: displayableInsights.sentiment.positive, fill: 'hsl(var(--chart-1))' },
    { name: 'Neutral', value: displayableInsights.sentiment.neutral, fill: 'hsl(var(--chart-2))' },
    { name: 'Negative', value: displayableInsights.sentiment.negative, fill: 'hsl(var(--chart-3))' },
  ].filter(item => item.value > 0) : [];

  const keywordData = displayableInsights?.topKeywords?.map(kw => ({
    name: kw.keyword,
    Frequency: kw.frequency,
  })) || [];
  
  const chartTooltipProps = {
    contentStyle: { backgroundColor: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', borderRadius: 'var(--radius)' },
    itemStyle: { color: 'hsl(var(--foreground))' },
    cursor: { fill: 'hsl(var(--muted))' }
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
        <CardContent className="p-4 space-y-6">
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
                  <ShadDialogFooter>
                    <DialogClose asChild>
                       <Button type="button" variant="outline" id={`develop-dialog-close-${persona.id}`}>Cancel</Button>
                    </DialogClose>
                    <Button 
                      type="button" 
                      onClick={handleDevelopPersonality}
                      disabled={isDevelopingPersonality || !isDevelopDialogValpromptd}
                    >
                      {isDevelopingPersonality ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4"/>}
                      Update Personality
                    </Button>
                  </ShadDialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            <p className="text-sm bg-muted p-3 rounded-md leading-relaxed">
              {persona.personaDescription || 'No description generated yet.'}
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-semibold text-muted-foreground flex items-center">
                <Zap className="h-4 w-4 mr-2 text-primary" /> Personality Insights & Stats
              </h3>
              <Button onClick={handleAnalyzeInsights} disabled={isLoadingInsights} size="sm" variant="outline">
                {isLoadingInsights ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="mr-2 h-4 w-4" />
                )}
                {displayableInsights ? 'Refresh Insights' : 'Generate Insights'}
              </Button>
            </div>

            {!displayableInsights && typeof currentInsights === 'string' && (
                <p className="text-sm bg-amber-100 dark:bg-amber-900/30 p-3 rounded-md text-amber-700 dark:text-amber-400">
                  Previous insights are in an old format. Click "Refresh Insights" to generate new detailed statistics and visualizations.
                </p>
            )}

            {displayableInsights ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader><CardTitle className="text-base">Summary</CardTitle></CardHeader>
                  <CardContent><p className="text-sm">{displayableInsights.summary}</p></CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-4">
                  {sentimentData.length > 0 && (
                    <Card>
                      <CardHeader><CardTitle className="text-base">Sentiment Analysis</CardTitle></CardHeader>
                      <CardContent className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <RechartsTooltip {...chartTooltipProps} />
                            <Legend iconSize={10} wrapperStyle={{fontSize: "12px"}}/>
                            <Pie data={sentimentData} cx="50%" cy="50%" labelLine={false} outerRadius={60} dataKey="value" nameKey="name"
                              label={({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
                                const RADIAN = Math.PI / 180;
                                const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
                                const x = cx + radius * Math.cos(-midAngle * RADIAN);
                                const y = cy + radius * Math.sin(-midAngle * RADIAN);
                                if (percent < 0.05) return null; // Don't render label for very small slices
                                return (
                                  <text x={x} y={y} fill="hsl(var(--primary-foreground))" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize="10px">
                                    {`${(percent * 100).toFixed(0)}%`}
                                  </text>
                                );
                              }}
                            >
                              {sentimentData.map((entry, index) => (<Cell key={`cell-${index}`} fill={entry.fill} stroke={entry.fill} /> ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}

                  {keywordData.length > 0 && (
                     <Card>
                      <CardHeader><CardTitle className="text-base">Top Keywords</CardTitle></CardHeader>
                      <CardContent className="h-[200px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                           <BarChart data={keywordData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                            <XAxis type="number" stroke="hsl(var(--foreground))" fontSize={10} />
                            <YAxis dataKey="name" type="category" stroke="hsl(var(--foreground))" width={60} fontSize={10} interval={0} />
                            <RechartsTooltip {...chartTooltipProps} />
                            <Bar dataKey="Frequency" fill="hsl(var(--chart-4))" barSize={15} radius={[0, 4, 4, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </CardContent>
                    </Card>
                  )}
                </div>
                
                <Card>
                  <CardHeader><CardTitle className="text-base">Communication Style</CardTitle></CardHeader>
                  <CardContent className="space-y-1 text-sm">
                    <p>Avg. Message Length: <strong>{displayableInsights.communicationStyle.averageMessageLength.toFixed(1)} words</strong></p>
                    <p>Question Rate: <strong>{displayableInsights.communicationStyle.questionRate.toFixed(1)}%</strong></p>
                    <p>Emoji Usage Score: <strong>{displayableInsights.communicationStyle.useOfEmojis.toFixed(0)}/100</strong></p>
                  </CardContent>
                </Card>

                {displayableInsights.mbtiInsights && persona.mbti && (
                  <Card>
                    <CardHeader><CardTitle className="text-base">MBTI Insights ({persona.mbti})</CardTitle></CardHeader>
                    <CardContent className="space-y-2 text-sm">
                      <p><strong>Observed Traits:</strong></p>
                      <div className="flex flex-wrap gap-2">
                        {displayableInsights.mbtiInsights.observedTraits.map(trait => <Badge key={trait} variant="secondary">{trait}</Badge>)}
                      </div>
                      {displayableInsights.mbtiInsights.compatibilityNotes && (
                        <div>
                          <p className="mt-2"><strong>Communication Notes:</strong></p>
                          <p>{displayableInsights.mbtiInsights.compatibilityNotes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

              </div>
            ) : (
              !isLoadingInsights && (
                <div className="text-center p-4 border border-dashed rounded-md">
                  <p className="text-sm text-muted-foreground">No detailed insights generated yet or insights are in an old format.</p>
                  <p className="text-xs text-muted-foreground mb-2">Click "Generate Insights" to analyze and visualize persona statistics.</p>
                </div>
              )
            )}
             {isLoadingInsights && (
              <div className="flex justify-center items-center p-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="ml-2 text-muted-foreground">Generating insights...</p>
              </div>
            )}
          </div>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}
