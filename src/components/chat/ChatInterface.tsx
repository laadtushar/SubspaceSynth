
'use client';

import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Trash2, Info } from 'lucide-react';
import type { Persona, ChatMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
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
    if (userId) {
      setMessages(getChatMessages(userId, persona.id));
    }
  }, [persona.id, userId]);

  useEffect(() => {
    if (scrollAreaRef.current) {
      scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e?: React.FormEvent<HTMLFormElement>) => {
    e?.preventDefault();
    if (!userInput.trim() || !userId) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      personaId: persona.id, // This is fine, as personaId is part of the message data
      sender: 'user',
      text: userInput,
      timestamp: new Date().toISOString(),
      context: contextInput, 
    };

    setMessages((prev) => [...prev, userMessage]);
    saveChatMessage(userId, persona.id, userMessage);
    setUserInput('');
    // contextInput is intentionally kept

    setIsLoading(true);
    try {
      const aiResponse = await generateResponse({
        persona: persona.personaDescription || `A persona named ${persona.name}`,
        input: userMessage.text,
        context: contextInput || 'General conversation',
      });

      const aiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        personaId: persona.id,
        sender: 'ai',
        text: aiResponse.response,
        timestamp: new Date().toISOString(),
        context: contextInput,
      };
      setMessages((prev) => [...prev, aiMessage]);
      saveChatMessage(userId, persona.id, aiMessage);
    } catch (error) {
      console.error('Failed to get AI response:', error);
      toast({
        title: 'Error',
        description: 'AI failed to respond. Please try again.',
        variant: 'destructive',
      });
       const errorAiMessage: ChatMessage = {
        id: crypto.randomUUID(),
        personaId: persona.id,
        sender: 'ai',
        text: "I'm sorry, I encountered an error and couldn't respond. Please try again.",
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorAiMessage]);
      if (userId) saveChatMessage(userId, persona.id, errorAiMessage);
    } finally {
      setIsLoading(false);
    }
  };
  
  const clearChat = () => {
    if (!userId) return;
    clearChatMessagesFromStore(userId, persona.id);
    setMessages([]);
    toast({title: "Chat Cleared", description: "The chat history for this persona has been cleared."});
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
        <Button variant="outline" size="sm" onClick={clearChat} title="Clear chat history" disabled={!userId}>
          <Trash2 className="h-4 w-4" />
        </Button>
      </CardHeader>

      <ScrollArea className="flex-grow p-4 bg-muted/30" ref={scrollAreaRef}>
        <div className="space-y-4">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-end gap-2 ${
                msg.sender === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {msg.sender === 'ai' && (
                <Avatar className="h-8 w-8">
                  <AvatarImage src={persona.avatarUrl || `https://picsum.photos/seed/${persona.id}/32/32`} alt={persona.name} data-ai-hint="ai avatar" />
                  <AvatarFallback>{persona.name.substring(0,1).toUpperCase()}</AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[70%] p-3 rounded-xl shadow ${
                  msg.sender === 'user'
                    ? 'bg-primary text-primary-foreground rounded-br-none'
                    : 'bg-card text-card-foreground border rounded-bl-none'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                <p className={`text-xs mt-1 ${msg.sender === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                   {formatDistanceToNow(new Date(msg.timestamp), { addSuffix: true })}
                </p>
              </div>
              {msg.sender === 'user' && (
                <Avatar className="h-8 w-8">
                  {/* User avatar can be customized if user profiles have images */}
                  <AvatarFallback>U</AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {isLoading && messages[messages.length -1]?.sender === 'user' && (
             <div className="flex items-end gap-2 justify-start">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={persona.avatarUrl || `https://picsum.photos/seed/${persona.id}/32/32`} alt={persona.name} data-ai-hint="ai avatar" />
                  <AvatarFallback>{persona.name.substring(0,1).toUpperCase()}</AvatarFallback>
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
                  <Button type="button" variant="ghost" size="icon" className="shrink-0" onClick={() => setContextInput('')} title="Clear context" disabled={!userId}>
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
