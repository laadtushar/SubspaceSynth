
const functions = require('firebase-functions');
// const admin = require('firebase-admin'); // Uncomment if you need Firebase Admin SDK
// if (!admin.apps.length) {
//   admin.initializeApp();
// }

/**
 * A simple Hello World Firebase Function.
 */
exports.helloWorld = functions.https.onRequest((request, response) => {
  functions.logger.info("Hello logs!", {structuredData: true});
  response.send("Hello from Firebase!");
});

/**
 * An illustrative Firebase Function to show how environment variables
 * and Firebase Functions config are accessed.
 *
 * To set Firebase Functions config, use the Firebase CLI:
 * firebase functions:config:set stripe.secret="sk_your_stripe_secret_key"
 * firebase functions:config:set googleai.apikey="your_google_ai_api_key"
 * firebase functions:config:set some.service_key="some_value"
 *
 * Then deploy your functions:
 * firebase deploy --only functions
 */
exports.showEnvironmentAndConfig = functions.https.onRequest(async (req, res) => {
  let responseMessage = "Illustrative Environment and Firebase Functions Configuration:\n\n";

  // 1. Accessing standard Node.js environment variables (like process.env.STRIPE_SECRET_KEY)
  //    These are typically set by your hosting environment or .env files for Next.js.
  //    If a Firebase Function is running a Next.js app, these might be populated by the
  //    Firebase Function environment or explicitly set before starting the Next.js server.
  responseMessage += "--- Standard process.env Variables (as seen by this Firebase Function) ---\n";
  const stripeSecretFromProcessEnv = process.env.STRIPE_SECRET_KEY;
  if (stripeSecretFromProcessEnv) {
    responseMessage += `process.env.STRIPE_SECRET_KEY: Loaded (length: ${stripeSecretFromProcessEnv.length})\n`;
  } else {
    responseMessage += "process.env.STRIPE_SECRET_KEY: NOT FOUND in this Firebase Function's process.env\n";
  }

  const googleApiKeyFromProcessEnv = process.env.GOOGLE_API_KEY || process.env.GOOGLEAI_APIKEY; // Common names
  if (googleApiKeyFromProcessEnv) {
    responseMessage += `process.env.GOOGLE_API_KEY/GOOGLEAI_APIKEY: Loaded (length: ${googleApiKeyFromProcessEnv.length})\n`;
  } else {
    responseMessage += "process.env.GOOGLE_API_KEY/GOOGLEAI_APIKEY: NOT FOUND in this Firebase Function's process.env\n";
  }
  responseMessage += "\n";

  // 2. Accessing Firebase Functions specific configuration
  //    These are set using `firebase functions:config:set service.key="value"`
  responseMessage += "--- Firebase functions.config() Variables ---\n";
  try {
    const stripeConfig = functions.config().stripe;
    if (stripeConfig && stripeConfig.secret) {
      responseMessage += `functions.config().stripe.secret: Loaded (length: ${stripeConfig.secret.length})\n`;
    } else {
      responseMessage += "functions.config().stripe.secret: NOT FOUND in Firebase Functions config.\n";
    }

    const googleAiConfig = functions.config().googleai;
    if (googleAiConfig && googleAiConfig.apikey) {
      responseMessage += `functions.config().googleai.apikey: Loaded (length: ${googleAiConfig.apikey.length})\n`;
    } else {
      responseMessage += "functions.config().googleai.apikey: NOT FOUND in Firebase Functions config.\n";
    }

    const someServiceConfig = functions.config().some;
    if (someServiceConfig && someServiceConfig.service_key) {
        responseMessage += `functions.config().some.service_key: Loaded (value: ${someServiceConfig.service_key})\n`;
    } else {
        responseMessage += "functions.config().some.service_key: NOT FOUND in Firebase Functions config.\n";
    }

  } catch (error) {
    responseMessage += `Error accessing functions.config(): ${error.message}\n`;
    functions.logger.error("Error accessing functions.config():", error);
  }
  responseMessage += "\n";

  responseMessage += "--- Notes for Next.js Integration ---\n";
  responseMessage += "If you deploy your Next.js application's server-side logic (SSR, API Routes) using Firebase Functions,\n";
  responseMessage += "you would typically load secrets from 'functions.config()' within your Firebase Function's entry point.\n";
  responseMessage += "Then, you would make these secrets available to your Next.js application, often by setting\n";
  responseMessage += "'process.env' variables *before* your Next.js server request handler is initialized or called.\n";
  responseMessage += "For example: process.env.STRIPE_SECRET_KEY = functions.config().stripe.secret;\n";

  functions.logger.info(responseMessage.replace(/\n/g, ' || '), { structuredData: true });
  res.set('Content-Type', 'text/plain');
  res.status(200).send(responseMessage);
});


// --- Example for serving a Next.js app (Highly Simplified) ---
// This is a conceptual example and requires a proper Next.js build and more setup.
// const next = require('next');
//
// const dev = process.env.NODE_ENV !== 'production';
// const nextApp = next({
//   dev,
//   conf: { distDir: '.next' }, // Assumes Next.js build is in '.next' directory relative to 'functions' folder
// });
// const nextHandle = nextApp.getRequestHandler();
//
// exports.myNextApp = functions.https.onRequest(async (req, res) => {
//   // IMPORTANT: Populate process.env for the Next.js app BEFORE preparing or handling requests.
//   const stripeSecret = functions.config().stripe?.secret;
//   if (stripeSecret) {
//     process.env.STRIPE_SECRET_KEY = stripeSecret;
//     console.log("[Firebase Function] STRIPE_SECRET_KEY set in process.env for Next.js app.");
//   } else {
//     console.warn("[Firebase Function] STRIPE_SECRET_KEY not found in functions.config(). Next.js app might not have it.");
//   }
//
//   // Similarly for other secrets like Google AI API Key
//   const googleAiKey = functions.config().googleai?.apikey;
//   if (googleAiKey) {
//     process.env.GOOGLE_API_KEY = googleAiKey; // Or the specific name Genkit expects
//     console.log("[Firebase Function] GOOGLE_API_KEY set in process.env for Next.js app.");
//   }
//
//   try {
//     await nextApp.prepare(); // Prepares the Next.js app
//     return nextHandle(req, res); // Handles the request using Next.js
//   } catch (error) {
//     console.error("Error handling Next.js request:", error);
//     res.status(500).send("Internal Server Error handling Next.js request.");
//   }
// });
