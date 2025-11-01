

// FIX: Use Firebase v8 compat imports for app and auth to address missing export errors.
// This assumes a mixed environment where firestore might be v9 but auth/app are not.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { getFirestore } from 'firebase/firestore';

// IMPORTANT: In a real-world application, these values MUST be loaded from
// environment variables (e.g., process.env.REACT_APP_FIREBASE_API_KEY)
// and should NEVER be hardcoded in the source code for security reasons.
// This is a placeholder for demonstration purposes.
const FIREBASE_SETTINGS = {
  apiKey: "AIzaSyDQWCvBru356guXE3tAB6R2VjOsqaFHttY",
  authDomain: "rack-o-16931.firebaseapp.com",
  projectId: "rack-o-16931",
  storageBucket: "rack-o-16931.firebasestorage.app",
  messagingSenderId: "127219641303",
  appId: "1:127219641303:web:285e63d0bfecb9da4db992",
  measurementId: "G-1EQ8RBNL1J"
};

// FIX: Initialize app using the v8/compat API.
const app = firebase.initializeApp(FIREBASE_SETTINGS);
// FIX: Get auth instance using the v8/compat API.
export const auth = firebase.auth();
// Firestore is assumed to be v9, as no errors were reported for it.
export const db = getFirestore(app);

// Simple anonymous sign-in
// FIX: Use v8/compat syntax for anonymous sign-in.
auth.signInAnonymously().catch((error) => {
    console.error("Anonymous sign-in failed:", error);
});

// App ID for Firestore paths
export const appId = FIREBASE_SETTINGS.projectId;
