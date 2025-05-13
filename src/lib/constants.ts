// src/lib/constants.ts
export const FREE_PERSONA_LIMIT = 2;

// Stripe-related constants
export const PAID_PERSONA_PRICE_POUNDS = 2; // Price in GBP
export const PERSONAS_PER_PURCHASE = 1; // Each purchase grants this many additional persona slots
export const STRIPE_CURRENCY = 'gbp';

// Stripe Price ID for the Persona Slot Product. 
// THIS MUST MATCH THE PRICE ID IN YOUR STRIPE DASHBOARD AND .env.
// It's defined here for potential client-side use if needed, but primarily configured via .env for server-side.
export const STRIPE_PRICE_ID_PERSONA_SLOT = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID_PERSONA_SLOT || 'price_YOUR_STRIPE_PRICE_ID_HERE';

// Stripe Publishable Key - required for client-side Stripe.js
// THIS MUST MATCH THE KEY IN YOUR .env FILE.
export const NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '';


// Note: NEXT_PUBLIC_APP_URL must be set in your environment variables (.env.local or server environment)
// It is used to construct success and cancel URLs for Stripe Checkout.
// Example: NEXT_PUBLIC_APP_URL=http://localhost:3000 (for development)
// or NEXT_PUBLIC_APP_URL=https://yourdomain.com (for production)
