
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import UserChatInterface from '@/components/chat/UserChatInterface';
import type { UserContact } from '@/lib/types';
import { getUserContactById } from '@/lib/store';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';

export default function UserChatPage() {
  const { user, loadingAuth, userId } = useAuth();
  const router = useRouter();
  const params = useParams();
  
  const [contact, setContact] = useState<UserContact | null | undefined>(undefined); // undefined for loading, null for not found
  const [pageLoading, setPageLoading] = useState(true);

  const contactIdParams = Array.isArray(params.contactId) ? params.contactId[0] : params.contactId;

  useEffect(() => {
    if (!loadingAuth && !user) {
      router.push('/login');
    }
  }, [user, loadingAuth, router]);

  useEffect(() => {
    if (userId && contactIdParams) {
      const fetchedContact = getUserContactById(contactIdParams);
      setContact(fetchedContact || null); 
      setPageLoading(false);
    } else if (!loadingAuth && !user) {
      setPageLoading(false);
    }
  }, [userId, contactIdParams, loadingAuth, user]);


  if (loadingAuth || pageLoading) {
    return (
      <div className="h-[calc(100vh-var(--header-height,0px)-2rem)] grid grid-cols-1 gap-1 p-1">
         {/* Simplified skeleton for chat page */}
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Redirecting to login...</p>
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (contact === null) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-center">
        <AlertTriangle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Contact Not Found</h1>
        <p className="text-muted-foreground mb-4">The contact you are looking for does not exist.</p>
        <Button onClick={() => router.push('/messages')}>Go to Messages</Button>
      </div>
    );
  }
  
  if (contact === undefined) { 
     return (
      <div className="h-[calc(100vh-var(--header-height,0px)-2rem)] grid grid-cols-1 gap-1 p-1">
        <Skeleton className="h-full w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-var(--header-height,0px)-2rem)] md:h-[calc(100vh-2rem)] max-h-screen overflow-hidden p-0 md:p-1">
      <style jsx global>{`
        :root {
          --header-height: 3.5rem; /* 56px, h-14 Tailwind class */
        }
      `}</style>
      <UserChatInterface contact={contact} currentUser={{id: userId, name: user.displayName || user.email || "You"}} />
    </div>
  );
}
