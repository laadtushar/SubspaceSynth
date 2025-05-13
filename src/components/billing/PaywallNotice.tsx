
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Info, ShoppingCart, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PAID_PERSONA_PRICE_POUNDS, PERSONAS_PER_PURCHASE, STRIPE_PRICE_ID_PERSONA_SLOT } from '@/lib/constants';
import { createCheckoutSessionAction } from '@/app/actions/stripe/create-checkout-session.action'; // New Server Action

interface PaywallNoticeProps {
  currentPersonaCount: number;
  currentQuota: number;
}

export default function PaywallNotice({ currentPersonaCount, currentQuota }: PaywallNoticeProps) {
  const { userId, userProfile, loadingAuth: authLoading } = useAuth(); // userProfile needed for quota updates
  const { toast } = useToast();
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const handlePayment = async () => {
    if (!userId || !userProfile) {
      toast({
        title: "Error",
        description: "You must be logged in to make a purchase.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessingPayment(true);
    
    // Call the Server Action
    const result = await createCheckoutSessionAction(userId);

    if (result.success) {
      toast({
        title: "Payment Processed (Simulated)",
        description: result.message, // Message from server action, includes new quota details
      });
      // AuthContext will refresh userProfile with the new quota through its listeners
      // or the page displaying the quota will re-fetch/re-render.
      // No explicit redirect to Stripe here, as it's a full simulation within the server action.
    } else {
      toast({
        title: "Payment Failed (Simulated)",
        description: result.message || "An unexpected error occurred.",
        variant: "destructive",
      });
    }
    setIsProcessingPayment(false);
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
              <p className="text-xs text-green-500 dark:text-green-500">One-time payment (Simulated)</p>
            </div>
          </div>
           <p className="text-xs text-center text-muted-foreground/80 mt-2">
            <Info className="inline h-3 w-3 mr-1" />
            <strong>This is a simulated payment flow.</strong> Clicking the button below will not process a real transaction 
            but will update your persona quota for demo purposes by calling a server action that mimics a successful payment.
            A real Stripe integration would redirect you to Stripe Checkout.
          </p>
           <p className="text-xs text-center text-muted-foreground/80 mt-1">
            For a real integration, you would need to set up Stripe API keys, products, prices, and webhooks.
            You would also need to install the <code>stripe</code> and <code>@stripe/stripe-js</code> packages.
          </p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-6">
          <Button 
            className="w-full" 
            size="lg" 
            onClick={handlePayment} 
            disabled={authLoading || isProcessingPayment}
          >
            {isProcessingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
            Pay £{PAID_PERSONA_PRICE_POUNDS} (Simulated)
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
