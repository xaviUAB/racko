// js/firebase.js - Firebase configuration and initialization
import { initializeApp } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

const FIREBASE_SETTINGS = {
    apiKey: "AIzaSyDQWCvBru356guXE3tAB6R2VjOsqaFHttY",
    authDomain: "rack-o-16931.firebaseapp.com",
    projectId: "rack-o-16931",
    storageBucket: "rack-o-16931.firebasestorage.app",
    messagingSenderId: "127219641303",
    appId: "1:127219641303:web:285e63d0bfecb9da4db992",
    measurementId: "G-1EQ8RBNL1J"
};

let app = null, db = null, auth = null;

export const initFirebase = async () => {
    if (!app) app = initializeApp(FIREBASE_SETTINGS);
    if (!db) db = getFirestore(app);
    if (!auth) auth = getAuth(app);
    return { app, db, auth };
};

export const authenticateUser = (auth) => new Promise((resolve, reject) => {
    onAuthStateChanged(auth, async (user) => {
        if (user) resolve(user.uid);
        else {
            try {
                let cred = await signInAnonymously(auth);
                resolve(cred.user.uid);
            } catch (e) {
                reject(e);
            }
        }
    });
});
