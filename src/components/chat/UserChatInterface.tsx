
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Send, Loader2, Trash2, Bot, RefreshCw, Users } from 'lucide-react';
import type { UserContact, UserChatMessage, Persona as PersonaType, ChatMessage as AiChatMessage } from '@/lib/types';
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
  clearUserChatMessages as clearUserChatMessagesFromStore,
  generateUserChatId,
  getChatDerivedPersona,
  savePersona,
  getPersonaById, // To fetch the persona object for ChatInterface
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
  contact: UserContact;
  currentUser: UserContact; // Simplified representation of current user
}

const MESSAGES_PER_PERSONA_UPDATE = 5; // Update persona every 5 messages from contact

export default function UserChatInterface({ contact, currentUser }: UserChatInterfaceProps) {
  const [messages, setMessages] = useState<UserChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPersona, setIsGeneratingPersona] = useState(false);
  const [isPracticeMode, setIsPracticeMode] = useState(false);
  const [chatDerivedPersona, setChatDerivedPersona] = useState<PersonaType | null>(null);
  
  const { toast } = useToast();
  const { userId } = useAuth(); // Should match currentUser.id
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const chatId = generateUserChatId(currentUser.id, contact.id);

  const contactMessagesCountRef = useRef(0);

  // Load initial messages and derived persona
  useEffect(() => {
    if (userId) {
      setMessages(getUserChatMessages(chatId));
      const existingDerivedPersona = getChatDerivedPersona(userId, chatId, contact.id);
      if (existingDerivedPersona) {
        setChatDerivedPersona(existingDerivedPersona);
      } else {
        // Optionally, generate persona on first load if some messages exist
        // For now, we'll wait for new messages or explicit generation
      }
    }
  }, [chatId, userId, contact.id]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages, isPracticeMode]);

  const updateOrCreateChatDerivedPersona = useCallback(async () => {
    if (!userId) return;
    
    const contactMessages = messages.filter(msg => msg.senderUserId === contact.id);
    if (contactMessages.length === 0) {
        // console.log("No messages from contact to create/update persona.");
        return;
    }

    setIsGeneratingPersona(true);
    try {
      const chatHistoryForPersona = contactMessages.map(msg => `${contact.name}: ${msg.text}`).join('\n');
      const aiResponse = await createPersonaFromChat({ chatHistory: chatHistoryForPersona });

      let personaToSave: PersonaType;
      const existingPersona = getChatDerivedPersona(userId, chatId, contact.id);

      if (existingPersona) {
        personaToSave = {
          ...existingPersona,
          personaDescription: aiResponse.personaDescription,
          sourceChatMessages: contactMessages, // Update with latest messages
          createdAt: new Date().toISOString(), // Or update an 'updatedAt' field
        };
      } else {
        personaToSave = {
          id: crypto.randomUUID(),
          name: `${contact.name}'s Chat Persona`,
          originType: 'chat-derived',
          derivedFromChatId: chatId,
          derivedRepresentingUserId: contact.id,
          personaDescription: aiResponse.personaDescription,
          sourceChatMessages: contactMessages,
          createdAt: new Date().toISOString(),
          avatarUrl: contact.avatarUrl || `https://picsum.photos/seed/${contact.id}_persona/60/60`,
        };
      }
      
      savePersona(userId, personaToSave);
      setChatDerivedPersona(personaToSave);
      toast({
        title: 'Persona Updated',
        description: `${contact.name}'s chat persona has been updated based on the conversation.`,
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
  }, [userId, chatId, contact.id, contact.name, contact.avatarUrl, messages, toast]);


  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!userInput.trim() || !userId) return;

    const newMessage: UserChatMessage = {
      id: crypto.randomUUID(),
      chatId: chatId,
      senderUserId: currentUser.id,
      text: userInput,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, newMessage];
    setMessages(updatedMessages);
    saveUserChatMessage(chatId, newMessage);
    setUserInput('');

    // Check if it's time to update the persona (if the contact sent a message)
    // This logic is simplified: we update after current user sends, based on *contact's* total messages.
    // A more robust way would be to count messages *from the contact* since last update.
    
    // This will be triggered by the contact's messages, but for now, let's use current user's send action
    // to check if contact's message count warrants an update.
    const contactMessageObjects = updatedMessages.filter(msg => msg.senderUserId === contact.id);
    if (contactMessageObjects.length > 0 && contactMessageObjects.length % MESSAGES_PER_PERSONA_UPDATE === 0) {
       // If new message is from current user, and contact's messages hit threshold.
       // Or, if new message is from contact, and it's their Nth message.
       // For simplicity, we'll just call it. In a real scenario with websockets, this would be cleaner.
       await updateOrCreateChatDerivedPersona();
    }
  };
  
  const clearChat = () => {
    if (!userId) return;
    clearUserChatMessagesFromStore(chatId);
    setMessages([]);
    // Optionally delete the derived persona as well, or keep it.
    // For now, let's keep it, it might still be useful or can be manually refreshed.
    // if (chatDerivedPersona) { deletePersona(userId, chatDerivedPersona.id); setChatDerivedPersona(null); }
    toast({title: "Chat Cleared", description: `The chat history with ${contact.name} has been cleared.`});
  };
  
  const handlePracticeModeToggle = (checked: boolean) => {
    if (checked && !chatDerivedPersona) {
      toast({
        title: "Persona Not Ready",
        description: `A chat persona for ${contact.name} hasn't been generated yet. Send some messages or click "Update Persona" first.`,
        variant: "destructive",
      });
      setIsPracticeMode(false); // Ensure switch reflects actual state
      return;
    }
    setIsPracticeMode(checked);
  };

  if (!userId) {
    return <div className="flex justify-center items-center h-full"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  // Fetch the full persona object for ChatInterface if in practice mode
  const personaForPractice = isPracticeMode && chatDerivedPersona && userId ? getPersonaById(userId, chatDerivedPersona.id) : null;

  return (
    <div className="h-full flex flex-col">
      <Card className="flex-grow flex flex-col shadow-xl">
        <CardHeader className="p-4 border-b">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <Image 
                src={contact.avatarUrl || `https://picsum.photos/seed/${contact.id}/40/40`} 
                alt={contact.name} 
                width={40} 
                height={40} 
                className="rounded-full border"
                data-ai-hint="profile avatar"
              />
              <CardTitle className="text-lg font-semibold">
                {isPracticeMode && chatDerivedPersona ? `Practicing with ${chatDerivedPersona.name}` : `Chat with ${contact.name}`}
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
                      disabled={isGeneratingPersona || messages.filter(msg => msg.senderUserId === contact.id).length === 0}
                      title="Update/Create Contact's AI Persona"
                    >
                      {isGeneratingPersona ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Update AI persona for {contact.name} based on chat.</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className="flex items-center space-x-2">
                <Switch
                  id="practice-mode-switch"
                  checked={isPracticeMode}
                  onCheckedChange={handlePracticeModeToggle}
                  disabled={!chatDerivedPersona && !isPracticeMode} 
                />
                <Label htmlFor="practice-mode-switch" className="text-sm flex items-center gap-1">
                  <Bot className="h-4 w-4" /> Practice
                </Label>
              </div>
               <Button variant="outline" size="sm" onClick={clearChat} title="Clear chat history">
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
                    {msg.senderUserId === contact.id && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={contact.avatarUrl || `https://picsum.photos/seed/${contact.id}/32/32`} alt={contact.name} data-ai-hint="contact avatar" />
                        <AvatarFallback>{contact.name.substring(0,1).toUpperCase()}</AvatarFallback>
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
                        {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                    {msg.senderUserId === currentUser.id && (
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={currentUser.avatarUrl || undefined} alt={currentUser.name} data-ai-hint="user avatar"/>
                        <AvatarFallback>{currentUser.name.substring(0,1).toUpperCase()}</AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>

            <CardFooter className="p-4 border-t">
              <form onSubmit={handleSendMessage} className="w-full flex gap-2">
                <Input
                  placeholder={`Message ${contact.name}...`}
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  className="flex-grow"
                  disabled={isLoading}
                />
                <Button type="submit" disabled={isLoading || !userInput.trim()}>
                  {isLoading ? (
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
