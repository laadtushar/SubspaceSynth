
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { MessageSquarePlus, Users, Loader2, Search } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getUserContacts } from '@/lib/store';
import type { UserContact } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function MessagesPage() {
  const { user, loadingAuth, userId } = useAuth();
  const router = useRouter();
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [pageLoading, setPageLoading] = useState(true);

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
    }
  }, [user, loadingAuth, router]);

  useEffect(() => {
    if (userId) {
      setContacts(getUserContacts(userId));
      setPageLoading(false);
    } else if (!loadingAuth && !user) {
      setPageLoading(false); // User not logged in, redirect handled
    }
  }, [userId, loadingAuth, user]);

  if (loadingAuth || pageLoading) {
    return (
      <div className="flex justify-center items-center h-[calc(100vh-var(--header-height,0px)-2rem)]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Redirecting to login...</p>
      </div>
    );
  }

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="container mx-auto py-8">
      <header className="mb-8 flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <Users className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Contacts</h1>
        </div>
        {/* Future: Add "Find Friends" or similar button */}
      </header>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search contacts..."
            className="pl-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredContacts.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContacts.map((contact) => (
            <Card key={contact.id} className="shadow-lg hover:shadow-xl transition-shadow">
              <CardHeader className="flex flex-row items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={contact.avatarUrl || `https://picsum.photos/seed/${contact.id}/60/60`} alt={contact.name} data-ai-hint="profile avatar"/>
                  <AvatarFallback>{contact.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-lg">{contact.name}</CardTitle>
                  <CardDescription>Start a conversation</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex justify-end">
                <Link href={`/messages/${contact.id}`} passHref>
                  <Button variant="outline">
                    <MessageSquarePlus className="mr-2 h-4 w-4" /> Chat
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Users className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold mb-2">No Contacts Found</h2>
          <p className="text-muted-foreground">
            {searchTerm ? `No contacts match your search for "${searchTerm}".` : "Your contact list is currently empty."}
          </p>
          {/* Future: Link to "Find Friends" page */}
        </div>
      )}
    </div>
  );
}
