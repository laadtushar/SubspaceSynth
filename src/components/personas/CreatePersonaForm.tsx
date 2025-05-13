
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Bot, Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

import type { Persona } from '@/lib/types';
import { MBTI_TYPES, GENDERS } from '@/lib/types';
import { savePersona as savePersonaToDB } from '@/lib/store'; 
import { createPersonaFromChat } from '@/ai/flows/create-persona-from-chat';

const personaFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50),
  chatHistory: z.string().min(50, { message: "Chat history must be at least 50 characters." }),
  mbti: z.enum(MBTI_TYPES).optional(),
  age: z.coerce.number().int().positive().min(1).max(120).optional(),
  gender: z.enum(GENDERS).optional(),
  category: z.string().max(50, {message: "Category name cannot exceed 50 characters."}).optional().or(z.literal('')),
});

type PersonaFormValues = z.infer<typeof personaFormSchema>;

export default function CreatePersonaForm() {
  const router = useRouter();
  const { toast } = useToast();
  const { userId } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PersonaFormValues>({
    resolver: zodResolver(personaFormSchema),
    defaultValues: {
      name: '',
      chatHistory: '',
      category: '',
    },
  });

  async function onSubmit(data: PersonaFormValues) {
    if (!userId) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a persona.',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      const aiResponse = await createPersonaFromChat({ chatHistory: data.chatHistory });
      
      const newPersona: Persona = {
        id: crypto.randomUUID(), 
        name: data.name,
        originType: 'user-created',
        chatHistory: data.chatHistory,
        mbti: data.mbti,
        age: data.age,
        gender: data.gender,
        category: data.category || undefined, // Store as undefined if empty string
        personaDescription: aiResponse.personaDescription,
        createdAt: new Date().toISOString(),
        avatarUrl: `https://picsum.photos/seed/${data.name + Date.now()}/200/200`
      };

      await savePersonaToDB(userId, newPersona); 
      toast({
        title: 'Persona Created!',
        description: `${data.name} has been successfully created and analyzed.`,
      });
      router.push(`/personas/${newPersona.id}`);
    } catch (error) {
      console.error('Failed to create persona:', error);
      toast({
        title: 'Error',
        description: 'Failed to create persona. The AI might be unavailable or an error occurred.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-8 w-8 text-primary" />
          <CardTitle className="text-2xl font-bold">Create New Persona</CardTitle>
        </div>
        <CardDescription>
          Input chat history and optional attributes to generate an AI persona.
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona Name</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Supportive Colleague" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="chatHistory"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chat History (Seed)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste chat history here... (min 50 characters)"
                      className="min-h-[150px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    This chat history will be used as the initial basis for the persona's AI generation.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category (Optional)</FormLabel>
                  <FormControl>
                    <Input placeholder="E.g., Work, Friends, Creative Writing" {...field} />
                  </FormControl>
                  <FormDescription>
                    Group your personas by assigning them to a category.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />


            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FormField
                control={form.control}
                name="mbti"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>MBTI Type (Optional)</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select MBTI" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MBTI_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="age"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Age (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="E.g., 30"
                        {...field}
                        value={field.value ?? ''}
                        onChange={event => {
                          const val = event.target.value;
                          field.onChange(val === "" ? undefined : Number(val)); 
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Gender (Optional)</FormLabel>
                     <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select Gender" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {GENDERS.map((gender) => (
                          <SelectItem key={gender} value={gender}>
                            {gender}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
          <CardFooter className="border-t pt-6">
            <Button type="submit" className="w-full sm:w-auto" disabled={isLoading || !userId}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Create Persona
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}

