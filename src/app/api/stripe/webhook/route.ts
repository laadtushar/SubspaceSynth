
// src/app/api/stripe/webhook/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, isStripeEnabled } from '@/lib/stripe';
import { updateUserProfileInDB, getUserProfileById } from '@/lib/store';
import { FREE_PERSONA_LIMIT, PERSONAS_PER_PURCHASE } from '@/lib/constants';

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let skipReason = "";

  if (!isStripeEnabled || !stripe) {
    // This case implies STRIPE_SECRET_KEY was not properly set for the server.
    skipReason = "Stripe server-side SDK (STRIPE_SECRET_KEY) is not configured or failed to initialize.";
  } else if (!webhookSecret) {
    skipReason = "STRIPE_WEBHOOK_SECRET is not configured in the server environment.";
  }

  if (skipReason) {
    console.warn(`Stripe Webhook: Processing skipped. Reason: ${skipReason}. Ensure relevant environment variables are set on the server and the server is restarted if changes were made.`);
    // It's important to still return a 200 to Stripe for skippable issues to prevent retries for config errors.
    // For critical init failures of Stripe SDK itself, Stripe might not even be able to send here, or this endpoint might not run.
    return NextResponse.json({ received: true, message: `Webhook processing skipped: ${skipReason}` });
  }

  // At this point, stripe and webhookSecret should be valid.
  const sigHeader = req.headers.get('stripe-signature');
  if (!sigHeader) {
    console.error('Stripe Webhook: Missing Stripe signature header.');
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text(); 
    event = stripe!.webhooks.constructEvent(rawBody, sigHeader, webhookSecret!); // stripe and webhookSecret are now guaranteed to be non-null
  } catch (err: any) {
    console.error(`Stripe Webhook: Signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  // Handle the 'checkout.session.completed' event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    const userId = session.client_reference_id || session.metadata?.userId;

    if (!userId) {
      console.error('Stripe Webhook: checkout.session.completed received without userId in client_reference_id or metadata.', session);
      return NextResponse.json({ error: 'User ID not found in session.' }, { status: 400 });
    }

    console.log(`Stripe Webhook: Payment successful for user ${userId}, session ${session.id}`);

    try {
      const userProfile = await getUserProfileById(userId);
      if (!userProfile) {
        console.error(`Stripe Webhook: User profile for userId ${userId} not found during payment fulfillment for session ${session.id}. Stripe will retry.`);
        return NextResponse.json({ error: 'User profile not found, fulfillment postponed. Stripe will retry.' }, { status: 500 });
      }

      const purchasedUnitsString = session.metadata?.purchaseUnits;
      let purchasedUnits = PERSONAS_PER_PURCHASE; 
      
      if (purchasedUnitsString) {
        const parsedUnits = parseInt(purchasedUnitsString, 10);
        if (!isNaN(parsedUnits) && parsedUnits > 0) {
          purchasedUnits = parsedUnits;
        } else {
          console.warn(`Stripe Webhook: Invalid purchaseUnits ('${purchasedUnitsString}') in metadata for session ${session.id}. Defaulting to ${PERSONAS_PER_PURCHASE}.`);
        }
      } else {
        console.warn(`Stripe Webhook: purchaseUnits missing in metadata for session ${session.id}. Defaulting to ${PERSONAS_PER_PURCHASE}.`);
      }

      const currentQuota = userProfile.personaQuota === undefined ? FREE_PERSONA_LIMIT : userProfile.personaQuota;
      const newQuota = currentQuota + purchasedUnits;
      
      await updateUserProfileInDB(userId, { personaQuota: newQuota });
      console.log(`Stripe Webhook: User ${userId} persona quota updated to ${newQuota}.`);

    } catch (dbError: any) {
      console.error(`Stripe Webhook: Database error fulfilling purchase for user ${userId} in session ${session.id}: ${dbError.message}`);
      return NextResponse.json({ error: 'Database error fulfilling purchase.' }, { status: 500 });
    }
  } else if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log(`Stripe Webhook: PaymentIntent ${paymentIntent.id} succeeded.`);
  } else {
    console.log(`Stripe Webhook: Received unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}
