// src/lib/constants.ts
export const FREE_PERSONA_LIMIT = 2;

// Stripe-related constants for a REAL integration (used conceptually in examples)
export const PAID_PERSONA_PRICE_POUNDS = 2; // Price in GBP
export const PERSONAS_PER_PURCHASE = 1; // Each purchase grants 1 additional persona slot
export const STRIPE_PRICE_ID_PERSONA_SLOT = 'price_xxxxxxxxxxxxxx'; // REPLACE with your actual Stripe Price ID
export const STRIPE_CURRENCY = 'gbp';

// Note: For a real application, NEXT_PUBLIC_APP_URL should be set in your environment variables
// to construct success and cancel URLs for Stripe Checkout.
// Example: NEXT_PUBLIC_APP_URL=http://localhost:3000 (for development)
// or NEXT_PUBLIC_APP_URL=https://yourdomain.com (for production)
