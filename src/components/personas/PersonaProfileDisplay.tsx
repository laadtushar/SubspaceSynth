
'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Bot, BarChart2, Loader2, Sparkles, BrainCircuit, Zap, Download, MessageCircleQuestion, FileText, Edit } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import type { Persona, ChatMessage, ExportedPersonaData, AnalyzePersonaInsightsOutput, LinguisticFeaturesSchema, InteractionStatsSchema } from '@/lib/types';
import { MBTI_TYPES, GENDERS, type MBTIType, type Gender } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { analyzePersonaInsights } from '@/ai/flows/analyze-persona-insights';
import { developPersonaPersonality } from '@/ai/flows/develop-persona-flow';
import { askAboutPersona } from '@/ai/flows/ask-about-persona';
import { savePersona as savePersonaToDB, getAllChatMessagesForPersona } from '@/lib/store';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart as RechartsBarChart, XAxis, YAxis, CartesianGrid, Bar } from 'recharts';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";


interface PersonaProfileDisplayProps {
  persona: Persona;
  onPersonaUpdate: (updatedPersona: Persona) => void; 
}

const isStructuredInsights = (insights: any): insights is AnalyzePersonaInsightsOutput => {
  return typeof insights === 'object' && insights !== null && 'summary' in insights && 'sentiment' in insights;
};

const SELECT_NONE_VALUE = "__NONE__"; // Special value for "None" selection

const editPersonaFormSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50),
  mbti: z.union([z.enum(MBTI_TYPES), z.literal(SELECT_NONE_VALUE)]),
  age: z.coerce.number().int().positive().min(1).max(120).optional(),
  gender: z.union([z.enum(GENDERS), z.literal(SELECT_NONE_VALUE)]),
  category: z.string().max(50).optional().or(z.literal('')),
});
type EditPersonaFormValues = z.infer<typeof editPersonaFormSchema>;


export default function PersonaProfileDisplay({ persona, onPersonaUpdate }: PersonaProfileDisplayProps) {
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isDevelopingPersonality, setIsDevelopingPersonality] = useState(false);
  const [developmentPrompts, setDevelopmentPrompts] = useState('');
  const [isDevelopDialogActive, setIsDevelopDialogActive] = useState(false); 
  const [isEditDialogActive, setIsEditDialogActive] = useState(false);
  const [userQuestion, setUserQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState('');
  const [isAskingQuestion, setIsAskingQuestion] = useState(false);

  const { toast } = useToast();
  const { userId } = useAuth();

  const isChatDerived = persona.originType === 'chat-derived';

  const editForm = useForm<EditPersonaFormValues>({
    resolver: zodResolver(editPersonaFormSchema),
    defaultValues: {
      name: persona.name,
      mbti: persona.mbti || SELECT_NONE_VALUE,
      age: persona.age,
      gender: persona.gender || SELECT_NONE_VALUE,
      category: persona.category || '',
    },
  });

  useEffect(() => {
    if (persona) {
      editForm.reset({
        name: persona.name,
        mbti: persona.mbti || SELECT_NONE_VALUE,
        age: persona.age,
        gender: persona.gender || SELECT_NONE_VALUE,
        category: persona.category || '',
      });
    }
  }, [persona, editForm, isEditDialogActive]);


  const handleAnalyzeInsights = async () => {
    if (!userId) {
        toast({ title: 'Error', description: 'User not logged in.', variant: 'destructive' });
        return;
    }
    
    const sourceHistoryForAnalysis = persona.originType === 'user-created' 
      ? persona.chatHistory
      : null; 

    if (!sourceHistoryForAnalysis && persona.originType === 'user-created') {
        toast({
            title: 'Cannot Analyze',
            description: 'Seed chat history is missing for this user-created persona.',
            variant: 'destructive'
        });
        return;
    }
    if (persona.originType === 'chat-derived') {
         toast({
            title: 'Analysis Context',
            description: 'Insights for chat-derived personas are typically generated from the source chat. This button primarily re-analyzes seed data for user-created personas.',
            variant: 'default'
        });
        return; 
    }

    setIsLoadingInsights(true);
    try {
      const insightsResponse = await analyzePersonaInsights({
        chatHistory: sourceHistoryForAnalysis!, 
        mbtiType: persona.mbti,
        age: persona.age,
        gender: persona.gender,
        analysisContext: 'seed-data', 
      });

      const updatedPersona = { ...persona, personalityInsights: insightsResponse };
      await savePersonaToDB(userId, updatedPersona); 
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
    if (!userId || !developmentPrompts.trim() || isChatDerived) { 
        toast({
            title: 'Error',
            description: !userId ? 'You must be logged in.' : isChatDerived ? 'Cannot develop personality for chat-derived personas.' : 'Development prompts cannot be empty.',
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
      await savePersonaToDB(userId, updatedPersona); 
      onPersonaUpdate(updatedPersona); 
      
      toast({
        title: 'Personality Developed',
        description: `${persona.name}'s personality has been successfully updated.`,
      });
      setDevelopmentPrompts(''); 
      setIsDevelopDialogActive(false); 

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

  const handleEditPersonaDetails = async (data: EditPersonaFormValues) => {
    if (!userId) {
      toast({ title: 'Error', description: 'User not logged in.', variant: 'destructive' });
      return;
    }
    try {
      const updatedPersona: Persona = {
        ...persona,
        name: data.name,
        mbti: data.mbti === SELECT_NONE_VALUE ? undefined : data.mbti as MBTIType,
        age: data.age || undefined,
        gender: data.gender === SELECT_NONE_VALUE ? undefined : data.gender as Gender,
        category: data.category || undefined,
      };
      await savePersonaToDB(userId, updatedPersona);
      onPersonaUpdate(updatedPersona);
      toast({ title: 'Persona Updated', description: `${persona.name}'s details have been updated.` });
      setIsEditDialogActive(false);
    } catch (error) {
      console.error('Failed to update persona details:', error);
      toast({ title: 'Error', description: 'Could not update persona details.', variant: 'destructive' });
    }
  };

  const handleAskQuestion = async (question?: string) => {
    const finalQuestion = question || userQuestion;
    if (!finalQuestion.trim()) {
        toast({ title: 'Question Required', description: 'Please enter a question.', variant: 'destructive'});
        return;
    }
    if (!persona.personaDescription) {
        toast({ title: 'Persona Incomplete', description: 'Persona description is missing. Cannot answer questions yet.', variant: 'destructive'});
        return;
    }
    setIsAskingQuestion(true);
    setAiAnswer('');
    try {
        const response = await askAboutPersona({
            personaDescription: persona.personaDescription,
            question: finalQuestion,
        });
        setAiAnswer(response.answer);
        if(!question) setUserQuestion(''); 
    } catch (error) {
        console.error("Error asking question about persona:", error);
        toast({ title: 'Error', description: 'Could not get an answer from the AI.', variant: 'destructive'});
        setAiAnswer('Sorry, I encountered an error trying to answer that.');
    } finally {
        setIsAskingQuestion(false);
    }
  };

  const handleExportPersona = async () => {
    if(!userId) return;
    try {
      const chatMessagesWithAI = await getAllChatMessagesForPersona(userId, persona.id);
      const exportedData: ExportedPersonaData = {
        personaDetails: persona,
        chatMessagesWithAI: chatMessagesWithAI,
      };
      const jsonString = JSON.stringify(exportedData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${persona.name.replace(/\s+/g, '_')}_export.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'Export Successful', description: 'Persona data has been exported.'});
    } catch (error) {
      console.error("Error exporting persona:", error);
      toast({ title: 'Export Failed', description: 'Could not export persona data.', variant: 'destructive'});
    }
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

  const suggestedQuestions = [
    `What are ${persona.name}'s key personality traits?`,
    `How does ${persona.name} typically communicate?`,
    `What might motivate ${persona.name}?`,
  ];


  return (
    <Card className="w-full h-full flex flex-col shadow-lg">
      <CardHeader className="p-4 border-b">
        <div className="flex items-start gap-3">
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
            {isChatDerived && <Badge variant="outline" className="mt-1">Chat-Derived Persona</Badge>}
             {persona.category && <Badge variant="secondary" className="mt-1">Category: {persona.category}</Badge>}
            <div className="flex flex-wrap gap-1 mt-1">
              {persona.mbti && <Badge variant="outline">MBTI: {persona.mbti}</Badge>}
              {persona.age && <Badge variant="outline">Age: {persona.age}</Badge>}
              {persona.gender && <Badge variant="outline">Gender: {persona.gender}</Badge>}
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-2">
            <Dialog open={isEditDialogActive} onOpenChange={setIsEditDialogActive}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" disabled={!userId || isChatDerived}>
                  <Edit className="h-4 w-4 mr-1" /> Edit Details
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[525px]">
                <DialogHeader>
                  <DialogTitle>Edit {persona.name}'s Details</DialogTitle>
                  <DialogDescription>Update the basic information for this persona.</DialogDescription>
                </DialogHeader>
                <Form {...editForm}>
                  <form onSubmit={editForm.handleSubmit(handleEditPersonaDetails)} className="space-y-4 py-4">
                    <FormField
                      control={editForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Persona Name</FormLabel>
                          <FormControl><Input {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={editForm.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category</FormLabel>
                          <FormControl><Input placeholder="Uncategorized" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       <FormField
                          control={editForm.control}
                          name="mbti"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>MBTI Type</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select MBTI" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value={SELECT_NONE_VALUE}><em>None</em></SelectItem>
                                  {MBTI_TYPES.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="age"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Age</FormLabel>
                              <FormControl>
                                <Input type="number" placeholder="e.g. 30" {...field} value={field.value ?? ''} 
                                onChange={e => field.onChange(e.target.value === '' ? undefined : Number(e.target.value))} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={editForm.control}
                          name="gender"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Gender</FormLabel>
                              <Select onValueChange={field.onChange} value={field.value}>
                                <FormControl><SelectTrigger><SelectValue placeholder="Select Gender" /></SelectTrigger></FormControl>
                                <SelectContent>
                                  <SelectItem value={SELECT_NONE_VALUE}><em>None</em></SelectItem>
                                  {GENDERS.map(type => <SelectItem key={type} value={type}>{type}</SelectItem>)}
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                    </div>
                    <DialogFooter>
                      <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                      <Button type="submit" disabled={editForm.formState.isSubmitting}>
                        {editForm.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} Save Changes
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>

            <Button variant="outline" size="sm" onClick={handleExportPersona} disabled={!userId}>
                <Download className="h-4 w-4 mr-2" /> Export
            </Button>
        </div>
      </CardHeader>
      <ScrollArea className="flex-grow">
        <CardContent className="p-4 space-y-6">
          <Accordion type="single" collapsible className="w-full" defaultValue="persona-description">
            {/* AI Persona Description Section */}
            <AccordionItem value="persona-description">
              <AccordionTrigger>
                <h3 className="text-sm font-semibold text-muted-foreground flex items-center">
                  <Bot className="h-4 w-4 mr-2 text-primary" /> AI Persona Description
                </h3>
              </AccordionTrigger>
              <AccordionContent className="space-y-2">
                <p className="text-sm bg-muted p-3 rounded-md leading-relaxed">
                  {persona.personaDescription || 'No description generated yet.'}
                </p>
                {!isChatDerived && (
                  <Dialog open={isDevelopDialogActive} onOpenChange={setIsDevelopDialogActive}>
                    <DialogTrigger asChild>
                      <Button variant="outline" size="sm" disabled={!userId || isChatDerived} className="mt-2">
                        <BrainCircuit className="h-4 w-4 mr-1" /> Develop Further
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
                            onChange={(e) => setDevelopmentPrompts(e.target.value)}
                            className="min-h-[100px] mt-1"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <DialogClose asChild>
                           <Button type="button" variant="outline" onClick={() => { setIsDevelopDialogActive(false); setDevelopmentPrompts('');}}>Cancel</Button>
                        </DialogClose>
                        <Button 
                          type="button" 
                          onClick={handleDevelopPersonality}
                          disabled={isDevelopingPersonality || !developmentPrompts.trim()}
                        >
                          {isDevelopingPersonality ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4"/>}
                          Update Personality
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                )}
              </AccordionContent>
            </AccordionItem>

            {/* Seed Chat History Section */}
            {persona.originType === 'user-created' && persona.chatHistory && (
                 <AccordionItem value="seed-history">
                    <AccordionTrigger>
                        <h3 className="text-sm font-semibold text-muted-foreground flex items-center">
                            <FileText className="h-4 w-4 mr-2 text-primary" /> Original Seed Data
                        </h3>
                    </AccordionTrigger>
                    <AccordionContent>
                        <ScrollArea className="h-40 max-h-60">
                             <p className="text-sm bg-muted p-3 rounded-md leading-relaxed whitespace-pre-wrap">
                                {persona.chatHistory}
                            </p>
                        </ScrollArea>
                    </AccordionContent>
                 </AccordionItem>
            )}

            {/* Ask Questions About Persona Section */}
            <AccordionItem value="ask-questions">
                <AccordionTrigger>
                    <h3 className="text-sm font-semibold text-muted-foreground flex items-center">
                        <MessageCircleQuestion className="h-4 w-4 mr-2 text-primary" /> Ask About Persona
                    </h3>
                </AccordionTrigger>
                <AccordionContent className="space-y-3">
                    <div className="space-y-1">
                        <Label htmlFor="persona-question">Your Question:</Label>
                        <Input 
                            id="persona-question"
                            value={userQuestion}
                            onChange={(e) => setUserQuestion(e.target.value)}
                            placeholder="e.g., How would they react to stress?"
                            disabled={isAskingQuestion || !persona.personaDescription}
                        />
                    </div>
                    <Button onClick={() => handleAskQuestion()} disabled={isAskingQuestion || !userQuestion.trim() || !persona.personaDescription}>
                        {isAskingQuestion ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                        Ask AI
                    </Button>
                    <p className="text-xs text-muted-foreground">Suggested questions:</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestedQuestions.map((q, i) => (
                            <Button key={i} variant="outline" size="sm" onClick={() => handleAskQuestion(q)} disabled={isAskingQuestion || !persona.personaDescription}>
                                {q}
                            </Button>
                        ))}
                    </div>
                    {aiAnswer && (
                        <div className="mt-3 p-3 bg-muted rounded-md">
                            <p className="text-sm font-semibold mb-1">AI's Answer:</p>
                            <p className="text-sm whitespace-pre-wrap">{aiAnswer}</p>
                        </div>
                    )}
                    {!persona.personaDescription && (
                        <p className="text-xs text-destructive">Persona description is not available. Cannot ask questions.</p>
                    )}
                </AccordionContent>
            </AccordionItem>

            {/* Personality Insights & Stats Section */}
            <AccordionItem value="insights-stats">
                 <AccordionTrigger>
                     <h3 className="text-sm font-semibold text-muted-foreground flex items-center">
                        <Zap className="h-4 w-4 mr-2 text-primary" /> Personality Insights & Stats
                    </h3>
                 </AccordionTrigger>
                 <AccordionContent className="space-y-4">
                    {(persona.originType === 'user-created' || (persona.originType === 'chat-derived' && displayableInsights)) && (
                    <div className="flex justify-end">
                        <Button 
                            onClick={handleAnalyzeInsights} 
                            disabled={isLoadingInsights || !userId || (persona.originType === 'user-created' && !persona.chatHistory)} 
                            size="sm" 
                            variant="outline"
                        >
                            {isLoadingInsights ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
                            {displayableInsights ? 'Refresh Insights' : 'Generate Insights'}
                        </Button>
                    </div>
                    )}

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
                                        if (percent < 0.05) return null;
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
                                <RechartsBarChart data={keywordData} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                                    <XAxis type="number" stroke="hsl(var(--foreground))" fontSize={10} />
                                    <YAxis dataKey="name" type="category" stroke="hsl(var(--foreground))" width={60} fontSize={10} interval={0} tick={{width: 55, textOverflow: 'ellipsis', overflow:'hidden'}} />
                                    <RechartsTooltip {...chartTooltipProps} />
                                    <Bar dataKey="Frequency" fill="hsl(var(--chart-4))" barSize={15} radius={[0, 4, 4, 0]} />
                                </RechartsBarChart>
                                </ResponsiveContainer>
                            </CardContent>
                            </Card>
                        )}
                        </div>
                        
                        <Card>
                        <CardHeader><CardTitle className="text-base">Communication Style</CardTitle></CardHeader>
                        <CardContent className="space-y-1 text-sm">
                            <p>Avg. Message/Entry Length: <strong>{displayableInsights.communicationStyle.averageMessageLength.toFixed(1)} words</strong></p>
                            <p>Question Rate: <strong>{displayableInsights.communicationStyle.questionRate.toFixed(1)}%</strong></p>
                            <p>Emoji Usage Score: <strong>{displayableInsights.communicationStyle.useOfEmojis.toFixed(0)}/100</strong></p>
                        </CardContent>
                        </Card>

                        {displayableInsights.linguisticFeatures && (
                            <Card>
                                <CardHeader><CardTitle className="text-base">Linguistic Features (from seed data)</CardTitle></CardHeader>
                                <CardContent className="space-y-1 text-sm">
                                    <p>Total Word Count: <strong>{displayableInsights.linguisticFeatures.wordCount}</strong></p>
                                    <p>Unique Word Count: <strong>{displayableInsights.linguisticFeatures.uniqueWordCount}</strong></p>
                                    <p>Avg. Sentence Length: <strong>{displayableInsights.linguisticFeatures.averageSentenceLength.toFixed(1)} words</strong></p>
                                </CardContent>
                            </Card>
                        )}
                        
                        {displayableInsights.interactionStats && (persona.originType === 'chat-derived' || displayableInsights.interactionStats.totalMessages) && (
                             <Card>
                                <CardHeader><CardTitle className="text-base">Interaction Stats (if applicable)</CardTitle></CardHeader>
                                <CardContent className="space-y-1 text-sm">
                                    {typeof displayableInsights.interactionStats.totalMessages === 'number' && <p>Total Messages: <strong>{displayableInsights.interactionStats.totalMessages}</strong></p>}
                                    {typeof displayableInsights.interactionStats.userMessagesCount === 'number' && <p>User Messages: <strong>{displayableInsights.interactionStats.userMessagesCount}</strong></p>}
                                    {typeof displayableInsights.interactionStats.aiMessagesCount === 'number' && <p>AI Messages: <strong>{displayableInsights.interactionStats.aiMessagesCount}</strong></p>}
                                </CardContent>
                            </Card>
                        )}


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
                        <p className="text-sm text-muted-foreground">
                            {persona.originType === 'user-created' 
                                ? 'No detailed insights generated yet or insights are in an old format.'
                                : 'Detailed insights for chat-derived personas are based on their source chat interactions.'
                            }
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">
                            {persona.originType === 'user-created' 
                                ? 'Click "Refresh/Generate Insights" to analyze and visualize persona statistics from seed data.'
                                : 'Interact with the original contact to update this persona\'s insights.'
                            }
                        </p>
                        </div>
                    )
                    )}
                    {isLoadingInsights && (
                    <div className="flex justify-center items-center p-6">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="ml-2 text-muted-foreground">Generating insights...</p>
                    </div>
                    )}
                 </AccordionContent>
            </AccordionItem>

          </Accordion>
        </CardContent>
      </ScrollArea>
    </Card>
  );
}

