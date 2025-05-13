// src/lib/stripe.ts
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

let stripeInstance: Stripe | null = null;
let stripeEnabled = false;

if (stripeSecretKey) {
  stripeInstance = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20', // Use a recent API version
    typescript: true,
  });
  stripeEnabled = true;
} else {
  if (process.env.NODE_ENV === 'production') {
    // In production, a missing secret key is a critical error.
    throw new Error('STRIPE_SECRET_KEY is not set in environment variables for production. Payment processing will fail.');
  } else {
    // In development, warn that Stripe is not configured and will run in simulation mode.
    console.warn(
      'STRIPE_SECRET_KEY is not set. Real Stripe functionality will not work. ' +
      'The application will use simulated payment processing. ' +
      'For actual Stripe integration, set STRIPE_SECRET_KEY in your .env file and restart the server.'
    );
  }
}

export const stripe = stripeInstance;
export const isStripeEnabled = stripeEnabled;

// Helper function to check if Stripe is configured before making calls, mostly for client-side.
// Server-side should rely on the `isStripeEnabled` flag.
export const checkStripeEnabled = (): boolean => {
  if (!isStripeEnabled) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn("Stripe is not configured. Operations will be simulated if possible.");
    }
    return false;
  }
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && process.env.NODE_ENV !== 'production') {
     console.warn("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Stripe.js on client-side might fail.");
  }
  return true;
};
