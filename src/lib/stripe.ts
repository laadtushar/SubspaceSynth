
// src/lib/stripe.ts
import Stripe from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripePublishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const nodeEnv = process.env.NODE_ENV;

console.log(`[Stripe Init] Attempting to initialize Stripe...`);
console.log(`[Stripe Init] NODE_ENV: ${nodeEnv}`);

if (stripeSecretKey) {
    if (stripeSecretKey.startsWith('sk_test_') || stripeSecretKey.startsWith('sk_live_')) {
        console.log(`[Stripe Init] STRIPE_SECRET_KEY found and appears structurally valid (actual key hidden for security).`);
    } else {
        console.warn(`[Stripe Init] STRIPE_SECRET_KEY found but seems invalid (length: ${stripeSecretKey.length}, does not start with sk_test_ or sk_live_). Server-side payments will likely fail or simulate.`);
    }
} else {
    console.warn(`[Stripe Init] STRIPE_SECRET_KEY is NOT FOUND in server environment variables. Server-side payments will use simulation or fail if attempted directly.`);
}

if (stripePublishableKey) {
    if (stripePublishableKey.startsWith('pk_test_') || stripePublishableKey.startsWith('pk_live_')) {
        console.log(`[Stripe Init] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY found and appears structurally valid (actual key hidden for security). Client-side Stripe should function.`);
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
        // In production, if the secret key is missing or invalid, throw an error to halt server startup or first use.
        // This makes misconfiguration in production immediately obvious.
        throw new Error(
            'CRITICAL PRODUCTION SETUP ERROR: STRIPE_SECRET_KEY is missing, invalid, or not loaded into the server environment. It must start with "sk_test_" or "sk_live_". Real Stripe functionality will NOT work. Please set this environment variable correctly on your production server.'
        );
    }
    // If we reach here, the key is present and seems structurally valid for production.
    stripeInstance = new Stripe(stripeSecretKey, {
        apiVersion: '2024-06-20',
        typescript: true,
    });
    stripeServerEnabled = true;
    console.log('[Stripe Init] Stripe SERVER-SIDE initialized successfully for PRODUCTION environment. Real payments ENABLED.');

    // Also check publishable key for production client-side integrity
    if (!stripePublishableKey || !(stripePublishableKey.startsWith('pk_test_') || stripePublishableKey.startsWith('pk_live_'))) {
       console.error( // This is a console error as client-side might still partially work, but checkout will fail.
           'CRITICAL PRODUCTION CLIENT-SIDE SETUP ERROR: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing or invalid. Client-side Stripe (redirect to checkout) will FAIL even if server-side is okay.'
       );
    }

} else { // Development or other non-production environments
    if (!stripeSecretKey || !(stripeSecretKey.startsWith('sk_test_') || stripeSecretKey.startsWith('sk_live_'))) {
        console.warn(
            '[Stripe Init] STRIPE_SECRET_KEY is not set or is invalid for DEVELOPMENT/OTHER (must start with sk_test_ or sk_live_). Server-side Stripe operations will use SIMULATION or fail if attempted directly.'
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
    if (!stripePublishableKey || !(stripePublishableKey.startsWith('pk_test_') || stripePublishableKey.startsWith('pk_live_'))) {
        console.warn(
            '[Stripe Init] NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is not set or is invalid for DEVELOPMENT/OTHER. Client-side Stripe will fail.'
        );
    }
}

export const stripe = stripeInstance;
export const isStripeEnabled = stripeServerEnabled;

export const isStripeClientEnabled = (): boolean => {
    const pubKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
    if (!pubKey || !(pubKey.startsWith('pk_test_') || pubKey.startsWith('pk_live_'))) {
        if (process.env.NODE_ENV !== 'production') {
            console.warn("[Stripe Check] Client-side: NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY is missing or invalid. Stripe.js will fail to initialize.");
        }
        return false;
    }
    return true;
};
