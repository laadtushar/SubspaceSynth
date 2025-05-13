
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Info, ShoppingCart, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PAID_PERSONA_PRICE_POUNDS, PERSONAS_PER_PURCHASE } from '@/lib/constants';

interface PaywallNoticeProps {
  currentPersonaCount: number;
  currentQuota: number;
}

export default function PaywallNotice({ currentPersonaCount, currentQuota }: PaywallNoticeProps) {
  const { incrementPersonaQuota, loadingAuth: authLoading } = useAuth();
  const { toast } = useToast();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handleSimulatedPayment = async () => {
    setIsProcessingPayment(true);
    // Simulate Stripe payment process (e.g., redirect to Stripe Checkout, handle webhooks)
    // For this demo, we'll just simulate a delay and success.
    await new Promise(resolve => setTimeout(resolve, 1500)); 
    
    try {
      await incrementPersonaQuota(PERSONAS_PER_PURCHASE);
      toast({
        title: "Payment Successful (Simulated)",
        description: `You can now create ${PERSONAS_PER_PURCHASE} more persona(s). Your new limit is ${currentQuota + PERSONAS_PER_PURCHASE}.`,
      });
      // Optional: Could navigate or refresh, but AuthContext update should re-render dependent components
    } catch (error) {
      // Error toast is handled by incrementPersonaQuota in AuthContext
    } finally {
      setIsProcessingPayment(false);
    }
  };

  return (
    <div className="flex items-center justify-center py-12">
      <Card className="w-full max-w-md shadow-xl bg-card">
        <CardHeader className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-4">
            <ShoppingCart className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">Upgrade to Create More Personas</CardTitle>
          <CardDescription>
            You've used {currentPersonaCount} of your {currentQuota} available persona slots.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-center text-muted-foreground">
            To create additional personas, please purchase more slots. 
            Each purchase grants {PERSONAS_PER_PURCHASE} additional persona slot(s).
          </p>
          <div className="flex items-center justify-center p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg">
            <DollarSign className="h-8 w-8 text-green-600 dark:text-green-400 mr-3" />
            <div>
              <p className="font-semibold text-lg text-green-700 dark:text-green-300">
                Unlock {PERSONAS_PER_PURCHASE} Persona Slot for £{PAID_PERSONA_PRICE_POUNDS}
              </p>
              <p className="text-xs text-green-500 dark:text-green-500">One-time payment via Stripe (Simulated)</p>
            </div>
          </div>
           <p className="text-xs text-center text-muted-foreground/80 mt-2">
            <Info className="inline h-3 w-3 mr-1" />
            This is a simulated payment. Clicking the button below will not process a real transaction but will update your quota for demo purposes.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-6">
          <Button 
            className="w-full" 
            size="lg" 
            onClick={handleSimulatedPayment} 
            disabled={authLoading || isProcessingPayment}
          >
            {isProcessingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
            Pay £{PAID_PERSONA_PRICE_POUNDS} with Stripe (Simulated)
          </Button>
          <Link href="/" passHref className="w-full">
            <Button variant="outline" className="w-full">
              Back to Dashboard
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
