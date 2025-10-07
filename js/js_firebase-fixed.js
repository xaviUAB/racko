// js/firebase.js - Firebase configuration and initialization (FIXED)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { 
    getAuth, 
    signInAnonymously, 
    signInWithCustomToken,
    onAuthStateChanged 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { 
    getFirestore,
    enableNetwork,
    connectFirestoreEmulator
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

// IMPORTANT: Replace this with your actual Firebase config for GitHub deployment
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

// Environment detection - Fixed logic
const isCanvasEnvironment = typeof window !== 'undefined' && 
                          typeof window.firebaseconfig !== 'undefined' && 
                          window.firebaseconfig !== null;

// Configuration selection with fallbacks
const getAppId = () => {
    if (isCanvasEnvironment && typeof window.appid !== 'undefined') {
        return window.appid;
    }
    return MANUAL_APP_ID_FOR_PATH;
};

const getFirebaseConfig = () => {
    if (isCanvasEnvironment && typeof window.firebaseconfig !== 'undefined') {
        try {
            return JSON.parse(window.firebaseconfig);
        } catch (e) {
            console.warn('Failed to parse firebaseconfig, using fallback');
        }
    }
    return FIREBASE_SETTINGS;
};

const getInitialAuthToken = () => {
    if (isCanvasEnvironment && typeof window.initialauthtoken !== 'undefined') {
        return window.initialauthtoken;
    }
    return null;
};

let app, db, auth;

export const initFirebase = async () => {
    const firebaseConfig = getFirebaseConfig();
    const appId = getAppId();
    
    // Validate configuration
    if (!firebaseConfig || !firebaseConfig.projectId || !firebaseConfig.apiKey) {
        console.error('Firebase config is invalid or missing.');
        document.getElementById('main-container').innerHTML = 
            `<div class="text-center p-8 bg-red-100 rounded-xl">
                <p class="text-red-600 font-bold">Error de configuració de Firebase</p>
                <p class="text-sm text-gray-600 mt-2">La configuració de Firebase no és vàlida. Comprova que has establert correctament FIREBASE_SETTINGS a js/firebase.js</p>
                <p class="text-xs text-gray-500 mt-2">ProjectId: ${firebaseConfig.projectId || 'MISSING'}</p>
            </div>`;
        return null;
    }

    try {
        console.log('🔥 Initializing Firebase with config:', {
            projectId: firebaseConfig.projectId,
            environment: isCanvasEnvironment ? 'Canvas' : 'GitHub/Standalone'
        });
        
        app = initializeApp(firebaseConfig, `rack-o-app-${Date.now()}`);
        
        // Initialize Firestore without offline persistence for GitHub deployment
        // (Offline persistence can cause issues in some hosting environments)
        db = getFirestore(app);
        
        // Ensure network is enabled
        await enableNetwork(db);
        
        auth = getAuth(app);
        
        console.log('✅ Firebase initialized successfully');
        return { app, db, auth, appId };
    } catch (error) {
        console.error('❌ Error initializing Firebase:', error);
        document.getElementById('main-container').innerHTML = 
            `<div class="text-center p-8 bg-red-100 rounded-xl">
                <p class="text-red-600 font-bold">Error inicialitzant Firebase</p>
                <p class="text-sm text-gray-600 mt-2">${error.message}</p>
                <p class="text-xs text-gray-500 mt-2">Comprova la configuració i les regles de seguretat a Firebase Console</p>
            </div>`;
        return null;
    }
};

export const authenticateUser = async () => {
    const auth = getAuth();
    const initialAuthToken = getInitialAuthToken();
    
    return new Promise((resolve, reject) => {
        console.log('🔐 Starting authentication...');
        
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            unsubscribe(); // Cleanup listener
            
            if (user) {
                console.log('✅ User already authenticated:', user.uid);
                resolve(user.uid);
            } else {
                try {
                    console.log('🔑 Authenticating user...');
                    
                    if (isCanvasEnvironment && initialAuthToken) {
                        console.log('📱 Using custom token authentication');
                        const userCredential = await signInWithCustomToken(auth, initialAuthToken);
                        resolve(userCredential.user.uid);
                    } else {
                        console.log('👤 Using anonymous authentication');
                        const userCredential = await signInAnonymously(auth);
                        console.log('✅ Anonymous user created:', userCredential.user.uid);
                        resolve(userCredential.user.uid);
                    }
                } catch (error) {
                    console.error('❌ Authentication failed:', error);
                    console.error('Error details:', {
                        code: error.code,
                        message: error.message
                    });
                    
                    // More specific error handling
                    if (error.code === 'auth/api-key-not-valid') {
                        reject(new Error('Clau API de Firebase no vàlida. Comprova la configuració.'));
                    } else if (error.code === 'auth/network-request-failed') {
                        reject(new Error('Error de xarxa. Comprova la connexió a internet.'));
                    } else {
                        reject(new Error(`Error d'autenticació: ${error.message}`));
                    }
                }
            }
        }, (error) => {
            console.error('❌ Auth state change error:', error);
            reject(error);
        });
        
        // Timeout after 10 seconds
        setTimeout(() => {
            unsubscribe();
            reject(new Error('Timeout en l\'autenticació. Intenta recarregar la pàgina.'));
        }, 10000);
    });
};