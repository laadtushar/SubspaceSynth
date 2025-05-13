
'use server';

/**
 * @fileOverview Server Action to create a Stripe Checkout session or simulate payment.
 * If Stripe is configured, it creates a real Checkout session.
 * Otherwise, it simulates a successful payment and updates the user's quota directly.
 */

import { auth } from '@/lib/firebase'; 
import { updateUserProfileInDB, getUserProfileById } from '@/lib/store';
import { FREE_PERSONA_LIMIT, PERSONAS_PER_PURCHASE, STRIPE_CURRENCY } from '@/lib/constants';
import { stripe, isStripeEnabled } from '@/lib/stripe'; // isStripeEnabled here refers to server-side SDK readiness

interface CheckoutSessionResult {
  success: boolean;
  message: string;
  sessionId?: string; 
  redirectUrl?: string; 
  newQuota?: number; // Only for simulation
}

export async function createCheckoutSessionAction(
  userId: string
): Promise<CheckoutSessionResult> {
  if (!userId) {
    return { success: false, message: 'User not authenticated.' };
  }

  const userProfile = await getUserProfileById(userId);
  if (!userProfile) {
    return { success: false, message: 'User profile not found.' };
  }

  const stripePriceId = process.env.STRIPE_PRICE_ID_PERSONA_SLOT;

  if (isStripeEnabled && stripe && stripePriceId) {
    // --- REAL STRIPE CHECKOUT CREATION ---
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL;
      if (!appUrl) {
        console.error('CRITICAL: NEXT_PUBLIC_APP_URL is not set. Stripe success/cancel URLs will be incorrect.');
        return { success: false, message: 'Application URL is not configured on the server. Cannot create Stripe session.' };
      }

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: stripePriceId,
            quantity: 1, 
          },
        ],
        mode: 'payment',
        success_url: `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${appUrl}/payment/cancel`,
        client_reference_id: userId, 
        metadata: {
          userId: userId,
          item: `Purchase of ${PERSONAS_PER_PURCHASE} persona slot(s)`,
          purchaseUnits: PERSONAS_PER_PURCHASE.toString(), 
        }
      });

      if (!session.url) {
        return { success: false, message: 'Stripe session created but no redirect URL was returned.' };
      }

      return { 
        success: true, 
        message: 'Stripe Checkout session created successfully.', 
        sessionId: session.id, 
        redirectUrl: session.url 
      };

    } catch (error: any) {
      console.error('Stripe session creation error:', error);
      return { success: false, message: `Stripe error: ${error.message}` };
    }
  } else {
    // --- SIMULATED PAYMENT LOGIC (Stripe not enabled or configured for server-side) ---
    let simulationMessage = 'Stripe not configured. Simulating payment.';
    if (!isStripeEnabled) simulationMessage = 'Stripe server-side SDK not enabled. Simulating payment.';
    else if (!stripe) simulationMessage = 'Stripe instance not available. Simulating payment.';
    else if (!stripePriceId) simulationMessage = 'Stripe Price ID not configured. Simulating payment.';
    
    console.log(`${simulationMessage} User: ${userId}.`);

    try {
      const currentQuota = userProfile.personaQuota === undefined ? FREE_PERSONA_LIMIT : userProfile.personaQuota;
      const newQuota = currentQuota + PERSONAS_PER_PURCHASE;
      
      await updateUserProfileInDB(userId, { personaQuota: newQuota });
      
      console.log(`User ${userId} quota updated to ${newQuota} (simulated payment).`);
      return {
        success: true,
        message: `Payment successful (Simulated). ${PERSONAS_PER_PURCHASE} persona slot(s) added. New quota: ${newQuota}.`,
        newQuota: newQuota,
      };
    } catch (error: any) {
      console.error('Error updating persona quota during simulation:', error);
      return { success: false, message: `Failed to update quota (simulation): ${error.message}` };
    }
  }
}
