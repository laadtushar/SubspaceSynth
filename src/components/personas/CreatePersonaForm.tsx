'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import { Bot, Loader2, Save } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';

import type { Persona } from '@/lib/types';
import { MBTI_TYPES, GENDERS } from '@/lib/types';
import { savePersona } from '@/lib/store';
import { createPersonaFromChat } from '@/ai/flows/create-persona-from-chat';

const personaFormSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50),
  chatHistory: z.string().min(50, { message: "Chat history must be at least 50 characters." }),
  mbti: z.enum(MBTI_TYPES).optional(),
  age: z.coerce.number().int().positive().min(1).max(120).optional(),
  gender: z.enum(GENDERS).optional(),
});

type PersonaFormValues = z.infer<typeof personaFormSchema>;

export default function CreatePersonaForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PersonaFormValues>({
    resolver: zodResolver(personaFormSchema),
    defaultValues: {
      name: '',
      chatHistory: '',
      // mbti, age, gender will be undefined by default
    },
  });

  async function onSubmit(data: PersonaFormValues) {
    setIsLoading(true);
    try {
      const aiResponse = await createPersonaFromChat({ chatHistory: data.chatHistory });
      
      const newPersona: Persona = {
        id: crypto.randomUUID(),
        name: data.name,
        chatHistory: data.chatHistory,
        mbti: data.mbti,
        age: data.age,
        gender: data.gender,
        personaDescription: aiResponse.personaDescription,
        createdAt: new Date().toISOString(),
        avatarUrl: `https://picsum.photos/seed/${data.name + Date.now()}/200/200` // Generate random avatar
      };

      savePersona(newPersona);
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
                  <FormLabel>Chat History</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste chat history here... (min 50 characters)"
                      className="min-h-[150px] resize-y"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The more representative the chat history, the better the persona simulation.
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
                        value={field.value ?? ''} // Ensure controlled input, use '' for undefined
                        onChange={event => {
                          const val = event.target.value;
                          // For optional numeric fields, an empty input should typically mean 'undefined'
                          // Pass the raw string to Zod for coercion, or undefined if empty
                          field.onChange(val === "" ? undefined : val);
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
            <Button type="submit" className="w-full sm:w-auto" disabled={isLoading}>
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
