
'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Trash2, Info } from 'lucide-react';
import type { Persona, ChatMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { getChatMessages, saveChatMessage, clearChatMessages as clearChatMessagesFromStore } from '@/lib/store';
import { generateResponse } from '@/ai/flows/generate-response';
import { formatDistanceToNow } from 'date-fns';
import Image from 'next/image';

interface ChatInterfaceProps {
  persona: Persona;
}

export default function ChatInterface({ persona }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userInput, setUserInput] = useState('');
  const [contextInput, setContextInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { userId } = useAuth();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let unsubscribeMessages: (() => void) | undefined;
    if (userId) {
      // Fetch initial messages, limit to 50 for performance.
      // For "interaction stats", we might need all messages or a different mechanism.
      unsubscribeMessages = getChatMessages(userId, persona.id, (fetchedMessages) => {
        setMessages(fetchedMessages);
      }, 50); // Limit initial load
    }
    return () => {
      if (unsubscribeMessages) {
        unsubscribeMessages();
      }
    };
  }, [persona.id, userId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!userInput.trim() || !userId) return;

    const userMessageData: Omit<ChatMessage, 'id' | 'timestamp'> = { // timestamp will be server-generated
      sender: 'user',
      text: userInput,
      context: contextInput,
    };

    setUserInput('');
    setIsLoading(true);

    try {
      await saveChatMessage(userId, persona.id, userMessageData);

      const aiResponse = await generateResponse({
        persona: persona.personaDescription || `A persona named ${persona.name}`,
        input: userMessageData.text,
        context: contextInput || 'General conversation',
      });

      const aiMessageData: Omit<ChatMessage, 'id' | 'timestamp'> = {
        sender: 'ai',
        text: aiResponse?.response ?? "I couldn't generate a response. Please try again.",
        context: contextInput,
      };
      await saveChatMessage(userId, persona.id, aiMessageData);
    } catch (error) {
      console.error('Failed to get AI response or save message:', error);
      toast({
        title: 'Error',
        description: 'AI failed to respond or save message. Please try again.',
        variant: 'destructive',
      });
      const errorAiMessageData: Omit<ChatMessage, 'id' | 'timestamp'> = {
        sender: 'ai',
        text: "I'm sorry, I encountered an error and couldn't respond. Please try again.",
      };
      if (userId) await saveChatMessage(userId, persona.id, errorAiMessageData);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearChat = async () => {
    if (!userId) return;
    try {
      await clearChatMessagesFromStore(userId, persona.id);
      toast({ title: "Chat Cleared", description: "The chat history for this persona has been cleared." });
    } catch (error) {
      console.error("Error clearing chat:", error);
      toast({ title: "Error", description: "Could not clear chat.", variant: "destructive" });
    }
  };

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
    <Card className="h-full flex flex-col shadow-xl">
      <CardHeader className="p-4 border-b flex flex-row justify-between items-center">
        <div className="flex items-center gap-3">
          <Image
            src={persona.avatarUrl || `https://picsum.photos/seed/${persona.id}/40/40`}
            alt={persona.name}
            width={40}
            height={40}
            className="rounded-full border"
            data-ai-hint="profile avatar"
          />
          <CardTitle className="text-lg font-semibold">Chat with {persona.name}</CardTitle>
        </div>
        <Button variant="outline" size="sm" onClick={handleClearChat} title="Clear chat history" disabled={!userId || messages.length === 0}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>

      <ScrollArea className="flex-grow p-4 bg-muted/30" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
            >
              {msg.sender === 'ai' && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={persona.avatarUrl || `https://picsum.photos/seed/${persona.id}/32/32`} alt={persona.name} data-ai-hint="ai avatar" />
                  <AvatarFallback>{persona.name.substring(0, 1).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[70%] p-3 rounded-xl shadow ${msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-card text-card-foreground border rounded-bl-none'
                  }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                  {formatTimestamp(msg.timestamp)}
                </p>
              </div>
              {msg.sender === 'user' && (
                <Avatar className="h-8 w-8">
                  {/* Current user avatar could be fetched from useAuth().userProfile if needed */}
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length - 1]?.sender === 'user' && (
            <div className="flex items-end gap-2 justify-start">
              <Avatar className="h-8 w-8">
                <AvatarImage src={persona.avatarUrl || `https://picsum.photos/seed/${persona.id}/32/32`} alt={persona.name} data-ai-hint="ai avatar" />
                <AvatarFallback>{persona.name.substring(0, 1).toUpperCase()}</AvatarFallback>
              </Avatar>
              <div className="max-w-[70%] p-3 rounded-xl shadow bg-card text-card-foreground border rounded-bl-none">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      <CardFooter className="p-4 border-t">
        <form onSubmit={handleSendMessage} className="w-full space-y-3">
          <div className="flex items-center gap-2">
            <Textarea
              placeholder="Context (Optional): e.g., 'Discussing project deadline'"
              value={contextInput}
              onChange={(e) => setContextInput(e.target.value)}
              className="min-h-[40px] max-h-[100px] text-sm resize-none flex-grow"
              rows={1}
              disabled={!userId}
            />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setContextInput('')} title="Clear context" disabled={!userId || !contextInput}>
                    <Info className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">Provide situational context for more tailored AI responses. This context will apply to subsequent messages until cleared or changed.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="flex gap-2">
            <Input
              placeholder={`Message ${persona.name}...`}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              className="flex-grow"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              disabled={!userId}
            />
            <Button type="submit" disabled={isLoading || !userInput.trim() || !userId}>
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        </form>
      </CardFooter>
    </Card>
  );
}
