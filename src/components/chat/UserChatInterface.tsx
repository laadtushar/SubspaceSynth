
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Send, Loader2, Trash2, Bot, RefreshCw } from 'lucide-react';
import type { UserProfile, UserChatMessage, Persona as PersonaType } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { 
  getUserChatMessages, 
  saveUserChatMessage, 
  clearUserChatMessages,
  generateUserChatId,
  getChatDerivedPersona,
  savePersona,
  getPersonaById,
} from '@/lib/store';
import { createPersonaFromChat } from '@/ai/flows/create-persona-from-chat';
import { formatDistanceToNow } from 'date-fns';
import ChatInterface from './ChatInterface'; // Re-use for practice mode
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface UserChatInterfaceProps {
  contactUser: UserProfile;
  currentUser: UserProfile;
}

const MESSAGES_PER_PERSONA_UPDATE = 5; 

export default function UserChatInterface({ contactUser, currentUser }: UserChatInterfaceProps) {
  const [messages, setMessages] = useState<UserChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [chatDerivedPersona, setChatDerivedPersona] = useState<PersonaType | null>(null);
  
  const { toast } = useToast();
  const { userId } = useAuth(); // Should match currentUser.id
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  
  const chatId = currentUser?.id && contactUser?.id ? generateUserChatId(currentUser.id, contactUser.id) : null;

  useEffect(() => {
    let unsubscribeMessages: (() => void) | undefined;
    
    const loadData = async () => {
      if (userId && chatId) {
        unsubscribeMessages = getUserChatMessages(chatId, (fetchedMessages) => {
          setMessages(fetchedMessages);
        });

        const existingDerivedPersona = await getChatDerivedPersona(userId, chatId, contactUser.id);
        if (existingDerivedPersona) {
          setChatDerivedPersona(existingDerivedPersona);
        }
      }
    };
    loadData();

    return () => {
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
    };
  }, [chatId, userId, contactUser.id]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isPracticeMode]);

  const updateOrCreateChatDerivedPersona = useCallback(async () => {
    if (!userId || !chatId) return;
    
    const contactMessagesFromState = messages.filter(msg => msg.senderUserId === contactUser.id);
    if (contactMessagesFromState.length === 0) {
        toast({ title: "Info", description: `No messages from ${contactUser.name} to create/update persona.`});
        return;
    }

    setIsGeneratingPersona(true);
    try {
      const chatHistoryForPersona = contactMessagesFromState.map(msg => `${contactUser.name}: ${msg.text}`).join('\n');
      const aiResponse = await createPersonaFromChat({ chatHistory: chatHistoryForPersona });

      let personaToSave: PersonaType;
      const existingPersona = await getChatDerivedPersona(userId, chatId, contactUser.id);

      if (existingPersona) {
        personaToSave = {
          ...existingPersona,
          personaDescription: aiResponse.personaDescription,
          sourceChatMessagesCount: contactMessagesFromState.length,
          createdAt: existingPersona.createdAt, // Keep original creation, or use an updatedAt field
        };
      } else {
        personaToSave = {
          id: crypto.randomUUID(),
          name: `${contactUser.name}'s Chat Persona`,
          originType: 'chat-derived',
          derivedFromChatId: chatId,
          derivedRepresentingUserId: contactUser.id,
          personaDescription: aiResponse.personaDescription,
          sourceChatMessagesCount: contactMessagesFromState.length,
          createdAt: new Date().toISOString(),
          avatarUrl: contactUser.avatarUrl || `https://picsum.photos/seed/${contactUser.id}_persona/60/60`,
        };
      }
      
      await savePersona(userId, personaToSave);
      setChatDerivedPersona(personaToSave);
      toast({
        title: 'Persona Updated',
        description: `${contactUser.name}'s chat persona has been updated.`,
      });
    } catch (error) {
      console.error('Failed to update/create chat-derived persona:', error);
      toast({
        title: 'Persona Update Error',
        description: 'Could not update the chat-derived persona.',
        variant: 'destructive',
      });
    } finally {
      setIsGeneratingPersona(false);
    }
  }, [userId, chatId, contactUser.id, contactUser.name, contactUser.avatarUrl, messages, toast]);


  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!userInput.trim() || !userId || !chatId) return;

    setIsSendingMessage(true);
    const messageData: Omit<UserChatMessage, 'id' | 'timestamp'> = {
      senderUserId: currentUser.id,
      text: userInput,
    };

    try {
      await saveUserChatMessage(chatId, messageData);
      setUserInput('');
      
      const contactMessagesCount = messages.filter(msg => msg.senderUserId === contactUser.id).length;
      if (contactMessagesCount > 0 && (messages.length + 1) % MESSAGES_PER_PERSONA_UPDATE === 0) { // Check total messages now
         await updateOrCreateChatDerivedPersona();
      }

    } catch (error) {
      console.error("Error sending message:", error);
      toast({ title: "Send Error", description: "Could not send message.", variant: "destructive" });
    } finally {
      setIsSendingMessage(false);
    }
  };
  
  const handleClearChat = async () => {
    if (!userId || !chatId) return;
    try {
      await clearUserChatMessages(chatId);
      toast({title: "Chat Cleared", description: `The chat history with ${contactUser.name} has been cleared.`});
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast({ title: "Error", description: "Could not clear chat.", variant: "destructive" });
    }
  };
  
  const handlePracticeModeToggle = async (checked: boolean) => {
    if (checked) {
        let currentPersona = chatDerivedPersona;
        if (!currentPersona) {
            await updateOrCreateChatDerivedPersona();
            currentPersona = await getChatDerivedPersona(userId!, chatId!, contactUser.id); // Re-fetch
        }
        if (!currentPersona || !currentPersona.personaDescription) { // Also check if description exists
            toast({
                title: "Persona Not Ready",
                description: `A chat persona for ${contactUser.name} could not be generated or is incomplete. Send some messages or click "Update Persona" first.`,
                variant: "destructive",
            });
            setIsPracticeMode(false);
            return;
        }
    }
    setIsPracticeMode(checked);
  };

  const [personaForPractice, setPersonaForPractice] = useState<PersonaType | null>(null);

  useEffect(() => {
    const fetchPracticePersona = async () => {
      if (isPracticeMode && chatDerivedPersona && userId) {
        const fullPersona = await getPersonaById(userId, chatDerivedPersona.id);
        setPersonaForPractice(fullPersona);
      } else {
        setPersonaForPractice(null);
      }
    };
    fetchPracticePersona();
  }, [isPracticeMode, chatDerivedPersona, userId]);


  if (!userId || !chatId) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /> <p className="ml-2">Loading chat...</p></div>;
  }

  const formatTimestamp = (timestamp: string | number | undefined): string => {
    if (timestamp === undefined || timestamp === null) return 'sending...';
    try {
      // Firebase server timestamps are numbers (milliseconds since epoch)
      // ISO strings might also be used if client sets them before server does
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch (e) {
      return 'invalid date';
    }
  };

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-grow flex flex-col shadow-xl">
        <CardHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Image 
                src={contactUser.avatarUrl || `https://picsum.photos/seed/${contactUser.id}/40/40`} 
                alt={contactUser.name} 
                width={40} 
                height={40} 
                className="rounded-full border"
                data-ai-hint="profile avatar"
              />
              <CardTitle className="text-lg font-semibold">
                {isPracticeMode && personaForPractice ? `Practicing with ${personaForPractice.name}` : `Chat with ${contactUser.name}`}
              </CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={updateOrCreateChatDerivedPersona} 
                      disabled={isGeneratingPersona || messages.filter(msg => msg.senderUserId === contactUser.id).length === 0}
                      title="Update/Create Contact's AI Persona"
                    >
                      {isGeneratingPersona ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Update AI persona for {contactUser.name} based on chat.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex items-center space-x-2">
                <Switch
                  id="practice-mode-switch"
                  checked={isPracticeMode}
                  onCheckedChange={handlePracticeModeToggle}
                  disabled={isGeneratingPersona} 
                />
                <Label htmlFor="practice-mode-switch" className="text-sm flex items-center gap-1">
                  <Bot className="h-4 w-4" /> Practice
                </Label>
              </div>
               <Button variant="outline" size="sm" onClick={handleClearChat} title="Clear chat history">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {isPracticeMode && personaForPractice ? (
          <ChatInterface persona={personaForPractice} />
        ) : (
          <>
            <ScrollArea className="flex-grow p-4 bg-muted/30" ref={scrollAreaRef}>
              <div className="space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${
                      msg.senderUserId === currentUser.id ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.senderUserId === contactUser.id && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={contactUser.avatarUrl || `https://picsum.photos/seed/${contactUser.id}/32/32`} alt={contactUser.name} data-ai-hint="contact avatar" />
                        <AvatarFallback>{contactUser.name?.substring(0,1).toUpperCase() || 'C'}</AvatarFallback>
                      </Avatar>
                    )}
                    <div
                      className={`max-w-[70%] p-3 rounded-xl shadow ${
                        msg.senderUserId === currentUser.id
                          ? 'bg-primary text-primary-foreground rounded-br-none'
                          : 'bg-card text-card-foreground border rounded-bl-none'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                      <p className={`text-xs mt-1 ${msg.senderUserId === currentUser.id ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {formatTimestamp(msg.timestamp)}
                      </p>
                    </div>
                    {msg.senderUserId === currentUser.id && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser.avatarUrl || undefined} alt={currentUser.name} data-ai-hint="user avatar"/>
                        <AvatarFallback>{currentUser.name?.substring(0,1).toUpperCase() || 'U'}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <CardFooter className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="w-full flex gap-2">
                <Input
                  placeholder={`Message ${contactUser.name}...`}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="flex-grow"
                  disabled={isSendingMessage}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                />
                <Button type="submit" disabled={isSendingMessage || !userInput.trim()}>
                  {isSendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </form>
            </CardFooter>
          </>
        )}
      </Card>
    </div>
  );
}
