import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// --- Declaració de Variables Globals ---
// Aquestes variables són injectades per l'entorn d'execució de la plataforma.
declare var __firebase_config: string | undefined;
declare var __app_id: string | undefined;

// --- Lògica de Càrrega de Configuració ---
let firebaseConfig: any;
let appIdFromPlatform: string | undefined;
export let isPlatformEnvironment = false;

// 1. Intentem carregar la configuració des de l'entorn de la plataforma.
if (typeof __firebase_config !== 'undefined' && __firebase_config) {
  try {
    firebaseConfig = JSON.parse(__firebase_config);
    appIdFromPlatform = __app_id || firebaseConfig.projectId;
    isPlatformEnvironment = true;
    console.log("Configuració de Firebase carregada des de l'entorn de la plataforma.");
  } catch (e) {
    console.error("Error en analitzar la configuració de Firebase injectada:", e);
  }
}

// 2. Si no estem a la plataforma, utilitzem una configuració manual de fallback.
if (!firebaseConfig) {
  console.warn("ADVERTÈNCIA: No s'ha trobat la configuració de Firebase injectada. S'utilitzarà la configuració manual de fallback.");
  
  const FIREBASE_SETTINGS_FALLBACK = { 
      apiKey: "AIzaSyDQWCvBru356guXE3tAB6R2VjOsqaFHttY",
      authDomain: "rack-o-16931.firebaseapp.com",
      projectId: "rack-o-16931",
      storageBucket: "rack-o-16931.firebasestorage.app",
      messagingSenderId: "127219641303",
      appId: "1:127219641303:web:285e63d0bfecb9da4db992",
      measurementId: "G-1EQ8RBNL1J"
  };
  
  firebaseConfig = FIREBASE_SETTINGS_FALLBACK;
  appIdFromPlatform = FIREBASE_SETTINGS_FALLBACK.projectId;
}

// 3. Validació final.
if (!firebaseConfig || !firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error("Error crític: La configuració de Firebase no s'ha pogut carregar de cap font.");
}

// --- Inicialització Modular (v9+) ---
// Inicialitzem l'app una sola vegada i exportem els serveis per a ser utilitzats a tota l'aplicació.
const app: FirebaseApp = initializeApp(firebaseConfig);
export const auth: Auth = getAuth(app);
export const db: Firestore = getFirestore(app);
export const appId: string = appIdFromPlatform!;

// La lògica d'autenticació (signInAnonymously, etc.) ara es gestiona a App.tsx
// per acoblar-la millor a l'estat de la interfície d'usuari.
