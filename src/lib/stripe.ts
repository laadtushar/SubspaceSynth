// src/lib/stripe.ts
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const nodeEnv = process.env.NODE_ENV;

// Enhanced logging for easier debugging by the user
console.log(`[Stripe Init] Attempting to initialize Stripe...`);
console.log(`[Stripe Init] NODE_ENV: ${nodeEnv}`);
if (stripeSecretKey && stripeSecretKey.length > 10) { // Basic check for presence and some length
    console.log(`[Stripe Init] STRIPE_SECRET_KEY found (actual key is hidden for security).`);
} else if (stripeSecretKey) {
    console.warn(`[Stripe Init] STRIPE_SECRET_KEY found but seems very short (length: ${stripeSecretKey.length}). Is it correct?`);
}
else {
    console.warn(`[Stripe Init] STRIPE_SECRET_KEY is NOT FOUND in environment variables.`);
}


let stripeInstance: Stripe | null = null;
let stripeEnabled = false;

if (stripeSecretKey && stripeSecretKey.startsWith('sk_')) {
  stripeInstance = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20', // Use a recent API version
    typescript: true,
  });
  stripeEnabled = true;
  console.log('[Stripe Init] Stripe initialized successfully with a secret key. Real payments ENABLED.');
} else {
  // Key is missing or invalid
  if (nodeEnv === 'production') {
    // In PRODUCTION, a missing or invalid secret key IS a critical issue.
    // It's better to fail fast than to run with broken payments.
    console.error(
      'CRITICAL PRODUCTION ERROR: STRIPE_SECRET_KEY is missing, invalid (must start with sk_...), or not loaded. ' +
      'Ensure STRIPE_SECRET_KEY is correctly set in your production environment variables. Payments will FAIL.'
    );
    // This error will stop the server if it occurs during module initialization in many setups,
    // or cause issues at runtime if Stripe functions are called.
    // Forcing a throw here makes the problem immediately obvious in production.
    throw new Error(
        'STRIPE_SECRET_KEY is not set or is invalid in the PRODUCTION environment. Payment processing cannot proceed.'
    );
    // stripeEnabled remains false, stripeInstance remains null
  } else {
    // In DEVELOPMENT or other non-production environments, warn and use simulation.
    console.warn(
      '[Stripe Init] STRIPE_SECRET_KEY is not set or is invalid (must start with sk_...). ' +
      'Real Stripe functionality will NOT work. The application will use SIMULATED payment processing. ' +
      'To enable real payments, set STRIPE_SECRET_KEY in your .env.local file and restart the server.'
    );
    stripeEnabled = false; // Explicitly set for simulation mode
  }
}

export const stripe = stripeInstance;
export const isStripeEnabled = stripeEnabled;

// Helper function to check if Stripe is configured before making calls, mostly for client-side.
// Server-side should rely on the `isStripeEnabled` flag.
export const checkStripeEnabled = (): boolean => {
  if (!isStripeEnabled) {
    // This warning is more for client-side checks where `isStripeEnabled` might be true
    // but publishable key is missing for Stripe.js.
    // Server-side, if isStripeEnabled is false, the above logs already cover it.
    // console.warn("Stripe is not fully configured for client-side operations.");
    return false;
  }
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY && nodeEnv !== 'production') {
     console.warn("[Stripe Check] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set. Stripe.js on client-side might fail or operate in test mode without a key.");
  }
  return true;
};
