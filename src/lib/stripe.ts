
// src/lib/stripe.ts
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const nodeEnv = process.env.NODE_ENV;

// Initial console logs to trace variable loading
console.log(`[Stripe Init] Attempting to initialize Stripe...`);
console.log(`[Stripe Init] NODE_ENV: ${nodeEnv}`);

if (stripeSecretKey && stripeSecretKey.length > 10 && stripeSecretKey.startsWith('sk_')) {
    console.log(`[Stripe Init] STRIPE_SECRET_KEY found and appears valid (actual key hidden for security).`);
} else if (stripeSecretKey) {
    console.warn(`[Stripe Init] STRIPE_SECRET_KEY found but seems invalid (length: ${stripeSecretKey.length}, does not start with sk_). Server-side payments will likely fail or simulate.`);
} else {
    console.warn(`[Stripe Init] STRIPE_SECRET_KEY is NOT FOUND in environment variables. Server-side payments will use simulation or fail.`);
}

if (stripePublishableKey && stripePublishableKey.length > 10 && stripePublishableKey.startsWith('pk_')) {
    console.log(`[Stripe Init] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY found and appears valid (actual key hidden for security). Client-side Stripe should function.`);
} else if (stripePublishableKey) {
    console.warn(`[Stripe Init] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY found but seems invalid (length: ${stripePublishableKey.length}, does not start with pk_). Client-side Stripe will FAIL.`);
} else {
    console.warn(`[Stripe Init] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is NOT FOUND in environment variables. Client-side Stripe will FAIL.`);
}

let stripeInstance: Stripe | null = null;
let stripeServerEnabled = false; // Renamed for clarity

if (nodeEnv === 'production') {
    if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) {
        console.error(
            'CRITICAL PRODUCTION ERROR: STRIPE_SECRET_KEY is missing or invalid. Real server-side Stripe operations (like webhook validation, session creation) will FAIL. The application will fall back to SIMULATED payment processing where possible, but this is not a complete solution for a production environment.'
        );
        stripeServerEnabled = false;
        stripeInstance = null;
    } else {
        // Secret key is present and seems valid for production server-side.
        stripeInstance = new Stripe(stripeSecretKey, {
            apiVersion: '2024-06-20',
            typescript: true,
        });
        stripeServerEnabled = true;
        console.log('[Stripe Init] Stripe SERVER-SIDE initialized successfully in PRODUCTION. Real server payments ENABLED.');
        
        // Also check publishable key for production client-side integrity
        if (!stripePublishableKey || !stripePublishableKey.startsWith('pk_')) {
            console.error(
               'CRITICAL PRODUCTION ERROR: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing or invalid. Client-side Stripe (redirect to checkout) will FAIL even if server-side is okay.'
           );
        }
    }
} else {
    // Development or other non-production environments
    if (!stripeSecretKey || !stripeSecretKey.startsWith('sk_')) {
        console.warn(
            '[Stripe Init] STRIPE_SECRET_KEY is not set or is invalid for DEVELOPMENT/OTHER. Server-side Stripe operations will use SIMULATION or fail if attempted directly.'
        );
        stripeServerEnabled = false;
        stripeInstance = null;
    } else {
        stripeInstance = new Stripe(stripeSecretKey, {
            apiVersion: '2024-06-20',
            typescript: true,
        });
        stripeServerEnabled = true;
        console.log('[Stripe Init] Stripe SERVER-SIDE initialized successfully in DEVELOPMENT/OTHER. Real server payments ENABLED.');
    }
    // Log publishable key status for dev/other envs too
    if (!stripePublishableKey || !stripePublishableKey.startsWith('pk_')) {
        console.warn(
            '[Stripe Init] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set or is invalid for DEVELOPMENT/OTHER. Client-side Stripe will fail.'
        );
    }
}

export const stripe = stripeInstance;
export const isStripeEnabled = stripeServerEnabled; // This flag indicates if the server-side Stripe SDK is initialized

// Specific check for client-side Stripe.js readiness
export const isStripeClientEnabled = (): boolean => {
    const pubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!pubKey || !pubKey.startsWith('pk_')) {
        // Log this warning only if not in production, as production errors are handled above
        if (process.env.NODE_ENV !== 'production') {
            console.warn("[Stripe Check] Client-side: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing or invalid. Stripe.js will fail to initialize.");
        }
        return false;
    }
    return true;
};
