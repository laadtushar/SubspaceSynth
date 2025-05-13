
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Info, ShoppingCart, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { PAID_PERSONA_PRICE_POUNDS, PERSONAS_PER_PURCHASE } from '@/lib/constants';
import { createCheckoutSessionAction } from '@/app/actions/stripe/create-checkout-session.action';
import { isStripeEnabled } from '@/lib/stripe'; // Import isStripeEnabled
import { loadStripe } from '@stripe/stripe-js';

interface PaywallNoticeProps {
  currentPersonaCount: number;
  currentQuota: number;
}

export default function PaywallNotice({ currentPersonaCount, currentQuota }: PaywallNoticeProps) {
  const { userId, userProfile, loadingAuth: authLoading } = useAuth();
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
    
    const result = await createCheckoutSessionAction(userId);

    if (result.success) {
      if (isStripeEnabled && result.redirectUrl && result.sessionId) {
        // Real Stripe: Redirect to Checkout
        const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
        if (!stripePublishableKey) {
          toast({
            title: "Configuration Error",
            description: "Stripe publishable key is not configured. Cannot redirect to payment.",
            variant: "destructive",
          });
          setIsProcessingPayment(false);
          return;
        }
        try {
          const stripe = await loadStripe(stripePublishableKey);
          if (!stripe) {
            throw new Error("Stripe.js failed to load.");
          }
          const { error } = await stripe.redirectToCheckout({ sessionId: result.sessionId });
          if (error) {
            throw error;
          }
          // Redirect will happen, no further processing here if successful.
          // If redirectToCheckout fails, error is caught below.
        } catch (stripeError: any) {
          console.error("Stripe redirection error:", stripeError);
          toast({
            title: "Payment Error",
            description: stripeError.message || "Could not redirect to Stripe Checkout. Please try again.",
            variant: "destructive",
          });
          setIsProcessingPayment(false);
        }
        // No setIsProcessingPayment(false) here as user is redirected or error is handled.
      } else if (!isStripeEnabled && result.newQuota !== undefined) {
        // Simulation: Show success toast (server action already updated quota)
        toast({
          title: "Payment Processed (Simulated)",
          description: result.message,
        });
        setIsProcessingPayment(false);
      } else {
        // Fallback or unexpected scenario from server action
         toast({
          title: "Notice",
          description: result.message || "Payment status unclear.",
          variant: "default",
        });
        setIsProcessingPayment(false);
      }
    } else {
      // Payment failed (either real Stripe setup issue or simulation failure)
      toast({
        title: "Payment Failed",
        description: result.message || "An unexpected error occurred during payment processing.",
        variant: "destructive",
      });
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
              <p className="text-xs text-green-500 dark:text-green-500">One-time payment{isStripeEnabled ? "" : " (Simulated)"}</p>
            </div>
          </div>
           <p className="text-xs text-center text-muted-foreground/80 mt-2">
            <Info className="inline h-3 w-3 mr-1" />
            {isStripeEnabled 
              ? "You will be redirected to Stripe to complete your purchase securely." 
              : "This is a simulated payment flow. Clicking the button below will not process a real transaction but will update your persona quota for demo purposes."
            }
          </p>
           {!isStripeEnabled && (
             <p className="text-xs text-center text-muted-foreground/80 mt-1">
                For a real integration, ensure Stripe API keys, product, price ID, and webhook are correctly configured in your environment.
             </p>
           )}
        </CardContent>
        <CardFooter className="flex flex-col gap-3 pt-6">
          <Button 
            className="w-full" 
            size="lg" 
            onClick={handlePayment} 
            disabled={authLoading || isProcessingPayment}
          >
            {isProcessingPayment ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <ShoppingCart className="mr-2 h-5 w-5" />}
            {isStripeEnabled ? `Pay £${PAID_PERSONA_PRICE_POUNDS} via Stripe` : `Pay £${PAID_PERSONA_PRICE_POUNDS} (Simulated)`}
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
