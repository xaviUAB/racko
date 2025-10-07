// js/firebase.js - Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { 
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager,
    doc,
    setLogLevel
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// Configuration for GitHub deployment
const FIREBASE_SETTINGS = {
    apiKey: "AIzaSyDQWCvBru356guXE3tAB6R2VjOsqaFHttY",
    authDomain: "rack-o-16931.firebaseapp.com",
    projectId: "rack-o-16931",
    storageBucket: "rack-o-16931.firebasestorage.app",
    messagingSenderId: "127219641303",
    appId: "1:127219641303:web:285e63d0bfecb9da4db992",
    measurementId: "G-1EQ8RBNL1J"
};

const MANUAL_APP_ID_FOR_PATH = 'rack-o-16931';

// Environment detection
const isCanvasEnvironment = typeof firebaseconfig !== 'undefined';

// Configuration selection
const appId = isCanvasEnvironment ? 
    (typeof appid !== 'undefined' ? appid : 'default-app-id') : 
    MANUAL_APP_ID_FOR_PATH;

const firebaseConfig = isCanvasEnvironment ? 
    JSON.parse(firebaseconfig) : 
    FIREBASE_SETTINGS;

const initialAuthToken = isCanvasEnvironment ? 
    (typeof initialauthtoken !== 'undefined' ? initialauthtoken : null) : 
    null;

let app, db, auth;

export const initFirebase = async () => {
    if (Object.keys(firebaseConfig).length === 0 && !isCanvasEnvironment) {
        console.error('Firebase config is missing. Please set FIREBASE_SETTINGS for GitHub execution.');
        document.getElementById('main-container').innerHTML = 
            '<p class="text-red-600">Error: La configuració de Firebase no està disponible. Si ho executes des de GitHub, has d\'establir la variable FIREBASE_SETTINGS al codi font amb la teva clau.</p>';
        return null;
    }

    try {
        setLogLevel('error'); // Reduce verbose logging in production
        
        app = initializeApp(firebaseConfig);
        
        // Initialize Firestore with offline persistence and multi-tab support
        db = initializeFirestore(app, {
            localCache: persistentLocalCache({
                tabManager: persistentMultipleTabManager()
            })
        });
        
        auth = getAuth(app);
        
        return { app, db, auth, appId };
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        document.getElementById('main-container').innerHTML = 
            '<p class="text-red-600">Error en la inicialització de l\'aplicació. Comprova la configuració de FIREBASE_SETTINGS si no ets a Canvas.</p>';
        return null;
    }
};

export const authenticateUser = async (auth, isCanvasEnvironment, initialAuthToken) => {
    return new Promise((resolve) => {
        onAuthStateChanged(auth, async (user) => {
            if (user) {
                resolve(user.uid);
            } else {
                try {
                    if (isCanvasEnvironment && initialAuthToken) {
                        await signInWithCustomToken(auth, initialAuthToken);
                    } else {
                        await signInAnonymously(auth);
                    }
                } catch (error) {
                    console.error('Error authenticating:', error);
                    resolve(null);
                }
            }
        });
    });
};