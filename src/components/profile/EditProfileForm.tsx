
'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Loader2, Save, UserCircle, KeyRound } from 'lucide-react';
import type { UserProfile } from '@/lib/types';

const editProfileSchema = z.object({
  name: z.string().min(2, { message: "Name must be at least 2 characters." }).max(50, "Name must be 50 characters or less."),
  avatarUrl: z.string().url({ message: "Please enter a valid URL for your avatar." }).optional().or(z.literal('')),
  geminiApiKey: z.string().optional().or(z.literal('')),
});

type EditProfileFormValues = z.infer<typeof editProfileSchema>;

interface EditProfileFormProps {
  userProfile: UserProfile;
}

export default function EditProfileForm({ userProfile }: EditProfileFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { updateCurrentProfile } = useAuth();

  const form = useForm<EditProfileFormValues>({
    resolver: zodResolver(editProfileSchema),
    defaultValues: {
      name: userProfile?.name || '',
      avatarUrl: userProfile?.avatarUrl || '',
      geminiApiKey: userProfile?.geminiApiKey || '',
    },
  });

  useEffect(() => {
    if (userProfile) {
      form.reset({
        name: userProfile.name || '',
        avatarUrl: userProfile.avatarUrl || '',
        geminiApiKey: userProfile.geminiApiKey || '',
      });
    }
  }, [userProfile, form]);

  const handleFormSubmit = async (values: EditProfileFormValues) => {
    setIsLoading(true);
    try {
      await updateCurrentProfile({ 
        name: values.name, 
        avatarUrl: values.avatarUrl,
        geminiApiKey: values.geminiApiKey,
      });
    } catch (error: any) {
      // Error toast handled by AuthContext
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-lg mx-auto shadow-xl">
      <CardHeader>
        <div className="flex items-center gap-2">
            <UserCircle className="h-8 w-8 text-primary" />
            <CardTitle className="text-2xl font-bold">Edit Your Profile</CardTitle>
        </div>
        <CardDescription>Update your display name, avatar, and API settings.</CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFormSubmit)}>
          <CardContent className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Display Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your Name" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="avatarUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Avatar URL (Optional)</FormLabel>
                  <FormControl>
                    <Input type="url" placeholder="https://example.com/avatar.png" {...field} />
                  </FormControl>
                  <FormDescription>
                    Enter a URL to an image for your avatar. Leave blank to use a default.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="geminiApiKey"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="flex items-center gap-1">
                    <KeyRound className="h-4 w-4" /> Gemini API Key (Optional)
                  </FormLabel>
                  <FormControl>
                    <Input type="password" placeholder="Enter your Gemini API Key" {...field} />
                  </FormControl>
                  <FormDescription>
                    Provide your own Google AI Gemini API key. This key will be used for generating AI responses. 
                    (Note: For this demo, API keys are stored directly. In a production environment, ensure robust encryption and secure management practices.)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save Changes
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
