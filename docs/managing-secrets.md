
# Managing Secrets and Environment Variables in Your Next.js PersonaSim App

Properly managing environment variables, especially secrets like API keys, is crucial for security and proper application function across different environments (local development, staging, production).

## Next.js Environment Variables Basics

Next.js has built-in support for environment variables. Here are the key concepts:

1.  **`.env` Files:**
    *   Next.js loads environment variables from `.env` files in the root of your project.
    *   **`.env.local`**: This is the primary file for local development. It's **ignored by Git by default** and should contain your sensitive keys for local testing. Variables here override those in `.env`.
    *   `.env.development`: For development-specific variables.
    *   `.env.production`: For production-specific variables.
    *   `.env`: For default variables (usually non-sensitive).

2.  **Client-Side Exposure (`NEXT_PUBLIC_`):**
    *   To expose a variable to the browser (client-side JavaScript), you **must** prefix it with `NEXT_PUBLIC_`.
    *   Example: `NEXT_PUBLIC_FIREBASE_API_KEY="your_firebase_api_key"`
    *   **Never prefix sensitive secrets like `STRIPE_SECRET_KEY` or server-side AI keys with `NEXT_PUBLIC_`.** These should only be accessible on the server.

3.  **Server-Side Access:**
    *   Variables *without* the `NEXT_PUBLIC_` prefix are only available in the Node.js environment (server-side code like API routes, Server Components, Server Actions, `getServerSideProps`, `getStaticProps`).
    *   They are accessed via `process.env.YOUR_VARIABLE_NAME`.
    *   Example: `const stripeKey = process.env.STRIPE_SECRET_KEY;`

## Setting Up `STRIPE_SECRET_KEY` and `GOOGLE_API_KEY`

### 1. Local Development

*   Create a file named `.env.local` in the root of your project (if it doesn't exist).
*   Add your keys:
    ```env
    # .env.local (This file should be in your .gitignore)

    # Stripe Secret Key (NEVER prefix with NEXT_PUBLIC_)
    STRIPE_SECRET_KEY="sk_test_your_stripe_secret_key_here" 
    # Use your test key for development

    # Google AI API Key for Genkit (NEVER prefix with NEXT_PUBLIC_ if used server-side only)
    # Genkit might also look for GOOGLE_APPLICATION_CREDENTIALS for service accounts.
    # If you have a general Google AI API key for server-side use by Genkit:
    GOOGLE_API_KEY="your_google_ai_api_key_here" 
    # Or, if Genkit is configured to use the user-provided key from their profile, this might not be needed here.

    # Public Keys (Safe for client-side)
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_your_stripe_publishable_key_here"
    NEXT_PUBLIC_APP_URL="http://localhost:3000" # Or your local port

    # Firebase Public Config (already handled by your src/lib/firebase.ts)
    # NEXT_PUBLIC_FIREBASE_API_KEY="..."
    # ... other Firebase public keys
    ```
*   **Restart your Next.js development server** for these changes to take effect.

### 2. Production Deployment

How you set server-side environment variables in production depends on your hosting provider:

*   **Vercel:** Go to your Project Settings -> Environment Variables. Add `STRIPE_SECRET_KEY` and `GOOGLE_API_KEY` there.
*   **Netlify:** Go to Site settings -> Build & deploy -> Environment -> Environment variables.
*   **Firebase Hosting (with Cloud Functions for SSR/API):** See the section below.
*   **Other Platforms (AWS, DigitalOcean, etc.):** Consult your provider's documentation for setting environment variables for your Node.js application.

**Crucially, `STRIPE_SECRET_KEY` and server-side `GOOGLE_API_KEY` must be set in your production environment for the application to function correctly.** The error "STRIPE_SECRET_KEY is NOT FOUND in environment variables" means it's not set or not accessible in the environment where your server-side code is running.

## Using Firebase Functions Configuration (Advanced / Specific Deployment)

If you deploy your Next.js application's server-side components (like API routes or full Server-Side Rendering) as Firebase Functions, you can use Firebase Functions' built-in configuration management for your secrets.

**Steps:**

1.  **Set Configuration from your Terminal:**
    Use the Firebase CLI to set your secrets. These are stored securely by Firebase.
    ```bash
    firebase functions:config:set stripe.secret="sk_your_actual_stripe_secret_key"
    firebase functions:config:set googleai.apikey="your_actual_google_ai_key"
    # Add other secrets as needed, e.g., some.service.key="value"
    ```
    You can view current config with `firebase functions:config:get`.
    **Deploy your functions** after setting or updating config: `firebase deploy --only functions`

2.  **Access Configuration in your Firebase Function:**
    Inside the Firebase Function that handles your Next.js app's server-side requests, you would access this configuration and make it available to your Next.js code, typically by populating `process.env` before the Next.js request handler is invoked.

    See the `functions/index.js` file in this project for an illustrative `showEnvironmentAndConfig` function that demonstrates reading `functions.config()`.

    A simplified conceptual example of how you might pass it to a Next.js app running in a Firebase Function:

    ```javascript
    // functions/index.js (conceptual snippet)
    const functions = require('firebase-functions');
    const next = require('next'); // Assuming 'next' package is available

    // --- Function to serve Next.js app ---
    // const nextServer = next({ dev: false, conf: { distDir: '.next' } });
    // const nextRequestHandler = nextServer.getRequestHandler();

    // exports.myNextApp = functions.https.onRequest(async (req, res) => {
    //   // Load secrets from Firebase Functions config
    //   const stripeSecretFromFuncConfig = functions.config().stripe?.secret;
    //   const googleAIKeyFromFuncConfig = functions.config().googleai?.apikey;

    //   // Set them as process.env variables for the Next.js app
    //   if (stripeSecretFromFuncConfig) {
    //     process.env.STRIPE_SECRET_KEY = stripeSecretFromFuncConfig;
    //   }
    //   if (googleAIKeyFromFuncConfig) {
    //     process.env.GOOGLE_API_KEY = googleAIKeyFromFuncConfig; // Or the specific var Genkit expects
    //   }

    //   // Now, when your Next.js code (e.g., src/lib/stripe.ts) reads process.env.STRIPE_SECRET_KEY,
    //   // it will get the value from Firebase Functions config.

    //   await nextServer.prepare();
    //   return nextRequestHandler(req, res);
    // });
    ```

**Important Considerations for Firebase Functions Deployment:**
*   This method is specific to deploying your Next.js app's server-side aspects (or the entire app via SSR) using Firebase Functions.
*   If you're only using Firebase for Database/Auth/Static Hosting and deploying your Next.js server elsewhere (e.g., Vercel), then Vercel's (or your provider's) environment variable system is what you'd use for server-side secrets.
*   Ensure your `firebase-functions` and `firebase-admin` (if used) dependencies are correctly managed in your `functions/package.json`.

By understanding these mechanisms, you can securely and effectively manage the necessary configurations for your PersonaSim application. The key is to ensure that `process.env.STRIPE_SECRET_KEY` (and other server-side keys) are correctly populated in the Node.js environment where your Next.js server code executes.
