
// src/lib/stripe.ts
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const nodeEnv = process.env.NODE_ENV;

console.log(`[Stripe Init] Attempting to initialize Stripe...`);
console.log(`[Stripe Init] NODE_ENV: ${nodeEnv}`);

if (stripeSecretKey) {
    if (stripeSecretKey.startsWith('sk_test_') || stripeSecretKey.startsWith('sk_live_')) {
        console.log(`[Stripe Init] STRIPE_SECRET_KEY found via process.env and appears structurally valid (actual key hidden for security).`);
    } else {
        console.warn(`[Stripe Init] STRIPE_SECRET_KEY found via process.env but seems invalid (length: ${stripeSecretKey.length}, does not start with sk_test_ or sk_live_). Server-side payments will likely fail or simulate.`);
    }
} else {
    console.warn(`[Stripe Init] STRIPE_SECRET_KEY is NOT FOUND in process.env. Server-side payments will use simulation or fail.`);
}

if (stripePublishableKey) {
    if (stripePublishableKey.startsWith('pk_test_') || stripePublishableKey.startsWith('pk_live_')) {
        console.log(`[Stripe Init] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY found and appears valid (actual key hidden for security). Client-side Stripe should function.`);
    } else {
        console.warn(`[Stripe Init] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY found but seems invalid (length: ${stripePublishableKey.length}, does not start with pk_test_ or pk_live_). Client-side Stripe will FAIL.`);
    }
} else {
    console.warn(`[Stripe Init] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is NOT FOUND in environment variables. Client-side Stripe will FAIL.`);
}


let stripeInstance: Stripe | null = null;
let stripeServerEnabled = false;

if (nodeEnv === 'production') {
    if (!stripeSecretKey || !(stripeSecretKey.startsWith('sk_test_') || stripeSecretKey.startsWith('sk_live_'))) {
        // In production, if the secret key is missing or invalid from process.env, this is a critical issue.
        console.error(
            'CRITICAL PRODUCTION ERROR: STRIPE_SECRET_KEY is missing from process.env or is invalid. It must start with "sk_test_" or "sk_live_". Real Stripe functionality will NOT work. Ensure this variable is set in your production hosting environment.'
        );
        // We don't throw an error here to allow the app to potentially start and show diagnostics,
        // but real payment operations will fail or simulate based on subsequent checks.
        stripeServerEnabled = false;
    } else {
        // Key is present in process.env and seems structurally valid for production.
        stripeInstance = new Stripe(stripeSecretKey, {
            apiVersion: '2024-06-20',
            typescript: true,
        });
        stripeServerEnabled = true;
        console.log('[Stripe Init] Stripe SERVER-SIDE initialized successfully for PRODUCTION environment using key from process.env. Real payments ENABLED.');
    }

    if (!stripePublishableKey || !(stripePublishableKey.startsWith('pk_test_') || stripePublishableKey.startsWith('pk_live_'))) {
       console.error(
           'CRITICAL PRODUCTION CLIENT-SIDE SETUP ERROR: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing or invalid. Client-side Stripe (redirect to checkout) will FAIL.'
       );
    }

} else { // Development or other non-production environments
    if (!stripeSecretKey || !(stripeSecretKey.startsWith('sk_test_') || stripeSecretKey.startsWith('sk_live_'))) {
        console.warn(
            '[Stripe Init] STRIPE_SECRET_KEY (from process.env) is not set or is invalid for DEVELOPMENT/OTHER. Server-side Stripe operations will use SIMULATION or fail if attempted directly.'
        );
        stripeServerEnabled = false;
        stripeInstance = null;
    } else {
        stripeInstance = new Stripe(stripeSecretKey, {
            apiVersion: '2024-06-20',
            typescript: true,
        });
        stripeServerEnabled = true;
        console.log('[Stripe Init] Stripe SERVER-SIDE initialized successfully in DEVELOPMENT/OTHER using key from process.env. Real server payments ENABLED.');
    }
    if (!stripePublishableKey || !(stripePublishableKey.startsWith('pk_test_') || stripePublishableKey.startsWith('pk_live_'))) {
        console.warn(
            '[Stripe Init] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set or is invalid for DEVELOPMENT/OTHER. Client-side Stripe will fail.'
        );
    }
}

export const stripe = stripeInstance;
export const isStripeEnabled = stripeServerEnabled; // Reflects if server-side Stripe SDK is ready for real operations.

export const isStripeClientEnabled = (): boolean => {
    const pubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!pubKey || !(pubKey.startsWith('pk_test_') || pubKey.startsWith('pk_live_'))) {
        if (process.env.NODE_ENV !== 'production') { // Show more verbose warnings in dev
            console.warn("[Stripe Check] Client-side: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing or invalid. Stripe.js will fail to initialize.");
        }
        return false;
    }
    return true;
};

console.log(`[Stripe Init] Final status: isStripeEnabled (server-side real payments): ${isStripeEnabled}`);
console.log(`[Stripe Init] Final status: isStripeClientEnabled (client-side Stripe.js init): ${isStripeClientEnabled()}`);
