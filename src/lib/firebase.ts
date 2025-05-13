
import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import { getDatabase, type Database } from 'firebase/database';

const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const databaseURL = process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL;

if (!apiKey) {
  throw new Error(
    'Firebase API Key (NEXT_PUBLIC_FIREBASE_API_KEY) is missing or undefined in your environment variables. ' +
    'This is critical for Firebase initialization. Please ensure that your .env file (or .env.local) is correctly ' +
    'set up in the root of your project with all necessary Firebase configuration values. For example:\n\n' +
    'NEXT_PUBLIC_FIREBASE_API_KEY=YOUR_API_KEY\n' +
    'NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT_ID.firebaseapp.com\n' +
    'NEXT_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID\n' +
    'NEXT_PUBLIC_FIREBASE_DATABASE_URL=YOUR_DATABASE_URL\n' + // Added this line
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_PROJECT_ID.appspot.com\n' +
    'NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID\n' +
    'NEXT_PUBLIC_FIREBASE_APP_ID=YOUR_APP_ID\n\n' +
    'Refer to your Firebase project settings (Project settings > General > Your apps > SDK setup and configuration) to get these values.'
  );
}

if (!databaseURL) {
    console.warn(
    'Firebase Database URL (NEXT_PUBLIC_FIREBASE_DATABASE_URL) is not set in environment variables. ' +
    'Realtime Database functionalities will fail.'
  );
}


// Optional warnings for other potentially missing critical variables
if (!authDomain) {
  console.warn(
    'Firebase Auth Domain (NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) is not set in environment variables. ' +
    'Authentication functionalities might be affected or fail.'
  );
}
if (!projectId) {
  console.warn(
    'Firebase Project ID (NEXT_PUBLIC_FIREBASE_PROJECT_ID) is not set in environment variables. ' +
    'This might affect various Firebase services or cause them to fail.'
  );
}


const firebaseConfig = {
  apiKey: apiKey,
  authDomain: authDomain,
  projectId: projectId,
  storageBucket: storageBucket,
  messagingSenderId: messagingSenderId,
  appId: appId,
  databaseURL: databaseURL,
};

let app: FirebaseApp;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApp();
}

const auth: Auth = getAuth(app);
const db: Database = getDatabase(app);

export { app, auth, db };

