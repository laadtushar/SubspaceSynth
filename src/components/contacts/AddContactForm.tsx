
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { addContactByEmail } from '@/lib/store';
import { Loader2, UserPlus } from 'lucide-react';

const addContactSchema = z.object({
  email: z.string().email({ message: 'Invalid email address.' }),
});

type AddContactFormValues = z.infer<typeof addContactSchema>;

interface AddContactFormProps {
  currentUserId: string;
  onContactAdded: () => void; // Callback to close dialog or refresh list
}

export default function AddContactForm({ currentUserId, onContactAdded }: AddContactFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<AddContactFormValues>({
    resolver: zodResolver(addContactSchema),
    defaultValues: {
      email: '',
    },
  });

  const handleAddContact = async (values: AddContactFormValues) => {
    setIsLoading(true);
    try {
      const newContact = await addContactByEmail(currentUserId, values.email);
      if (newContact) {
        toast({
          title: 'Contact Added',
          description: `${newContact.name || newContact.id} has been added to your contacts.`,
        });
        onContactAdded(); // Close dialog or refresh
        form.reset();
      }
    } catch (error: any) {
      toast({
        title: 'Error Adding Contact',
        description: error.message || 'An unexpected error occurred. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleAddContact)} className="space-y-6">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact&apos;s Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="contact@example.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          Add Contact
        </Button>
      </form>
    </Form>
  );
}
