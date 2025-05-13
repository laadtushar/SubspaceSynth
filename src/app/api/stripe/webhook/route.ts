
// src/app/api/stripe/webhook/route.ts
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { stripe, isStripeEnabled } from '@/lib/stripe';
import { updateUserProfileInDB, getUserProfileById } from '@/lib/store';
import { FREE_PERSONA_LIMIT, PERSONAS_PER_PURCHASE } from '@/lib/constants';

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!isStripeEnabled || !stripe || !webhookSecret) {
    console.warn('Stripe SDK, Stripe instance, or webhook secret is not configured. Webhook processing skipped. This might be due to simulation mode.');
    // If Stripe is not enabled, we assume simulation, so webhook calls are not expected or are ignored.
    return NextResponse.json({ received: true, message: 'Webhook processing skipped (Stripe not fully configured).' });
  }

  const sigHeader = req.headers.get('stripe-signature');
  if (!sigHeader) {
    console.error('Webhook error: Missing Stripe signature.');
    return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await req.text(); // Need raw body for signature verification
    event = stripe.webhooks.constructEvent(rawBody, sigHeader, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return NextResponse.json({ error: `Webhook error: ${err.message}` }, { status: 400 });
  }

  // Handle the 'checkout.session.completed' event
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;

    // Retrieve userId from client_reference_id or metadata
    const userId = session.client_reference_id || session.metadata?.userId;

    if (!userId) {
      console.error('Webhook error: checkout.session.completed received without userId in client_reference_id or metadata.', session);
      return NextResponse.json({ error: 'User ID not found in session.' }, { status: 400 });
    }

    console.log(`Webhook: Payment successful for user ${userId}, session ${session.id}`);

    // Fulfill the purchase (e.g., increment persona quota)
    try {
      const userProfile = await getUserProfileById(userId);
      if (!userProfile) {
        console.error(`Webhook error: User profile for userId ${userId} not found during payment fulfillment for session ${session.id}. Stripe will retry.`);
        // Return a 500 error to tell Stripe to retry the webhook.
        // This can help if there's a slight delay in profile creation after signup.
        return NextResponse.json({ error: 'User profile not found, fulfillment postponed. Stripe will retry.' }, { status: 500 });
      }

      // Determine how many persona slots were purchased from metadata or line items
      const purchasedUnitsString = session.metadata?.purchaseUnits;
      let purchasedUnits = PERSONAS_PER_PURCHASE; // Default
      
      if (purchasedUnitsString) {
        const parsedUnits = parseInt(purchasedUnitsString, 10);
        if (!isNaN(parsedUnits) && parsedUnits > 0) {
          purchasedUnits = parsedUnits;
        } else {
          console.warn(`Webhook: Invalid purchaseUnits ('${purchasedUnitsString}') in metadata for session ${session.id}. Defaulting to ${PERSONAS_PER_PURCHASE}.`);
        }
      } else {
        console.warn(`Webhook: purchaseUnits missing in metadata for session ${session.id}. Defaulting to ${PERSONAS_PER_PURCHASE}.`);
      }


      const currentQuota = userProfile.personaQuota === undefined ? FREE_PERSONA_LIMIT : userProfile.personaQuota;
      const newQuota = currentQuota + purchasedUnits;
      
      await updateUserProfileInDB(userId, { personaQuota: newQuota });
      console.log(`Webhook: User ${userId} persona quota updated to ${newQuota}.`);

    } catch (dbError: any) {
      console.error(`Webhook error: Database error fulfilling purchase for user ${userId} in session ${session.id}: ${dbError.message}`);
      // Implement retry logic or alert system if critical
      return NextResponse.json({ error: 'Database error fulfilling purchase.' }, { status: 500 });
    }
  } else if (event.type === 'payment_intent.succeeded') {
    const paymentIntent = event.data.object as Stripe.PaymentIntent;
    console.log(`Webhook: PaymentIntent ${paymentIntent.id} succeeded.`);
    // You might handle other payment-related events here if necessary
  } else {
    console.log(`Webhook: Received unhandled event type ${event.type}`);
  }

  return NextResponse.json({ received: true });
}

// Required for Next.js Edge Functions if you were to deploy there with raw body parsing
// export const config = {
//   api: {
//     bodyParser: false,
//   },
// };
    
