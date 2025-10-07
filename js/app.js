// js/app.js - Main application entry point (versió robusta)
import { initFirebase, authenticateUser } from './firebase.js';
import { initAudio, toggleSound, toggleVibration, getSoundState, getVibrationState } from './sound.js';
import { initUI, renderLobby, renderGame } from './ui.js';
import { gameFunctions, initGameLogic } from './game-logic.js';

let firebaseComponents = null;

const init = async () => {
    try {
        // Inicialitza Firebase
        firebaseComponents = await initFirebase();
        if (!firebaseComponents) throw new Error('No s\'ha pogut inicialitzar Firebase.');

        const { app, db, auth } = firebaseComponents;

        // Autentica l'usuari
        const userId = await authenticateUser(auth);
        if (!userId) throw new Error('No s\'ha pogut autenticar l\'usuari.');

        // Inicialitza UI i audio
        initAudio();
        initUI();

        // Defineix l'objecte global de funcions, incloent UI
        window.gameFunctions = {
            ...gameFunctions,
            renderLobby,
            renderGame,
        };

        // Mostra el lobby inicial
        renderLobby('Benvingut! Crea o uneix-te a una partida.');

        // Inicialitza la lògica del joc
        initGameLogic(db, app.options.projectId, userId);

        // Controls d'accessibilitat
        setupAccessibilityControls();

        // Helpers de debug (opcionales)
        window.debugRacko = {
            getUserId: () => userId,
            getFirebaseApp: () => app,
            showConfig: () => {
                console.log('Config:', app.options);
                console.log('UserId:', userId);
            }
        };
    } catch (error) {
        // Mostra error bonic
        document.getElementById('main-container').innerHTML = `
            <div class="p-8 bg-red-100 rounded-xl text-center">
                <h2 class="text-xl font-bold text-red-600 mb-4">Error d'Inicialització</h2>
                <p class="text-red-700 mb-4">${error.message}</p>
                <button onclick="location.reload()"
                        class="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 mt-2">Recarregar</button>
            </div>
        `;
        console.error('Failed to initialize application:', error);
    }
};

const setupAccessibilityControls = () => {
    // Toggle so
    const soundToggle = document.getElementById('toggle-sound');
    if (soundToggle)
        soundToggle.addEventListener('click', () => {
            const enabled = toggleSound();
            soundToggle.textContent = enabled ? '🔊 So' : '🔇 So';
            soundToggle.classList.toggle('bg-red-200', !enabled);
            soundToggle.classList.toggle('bg-gray-200', enabled);
        });

    // Toggle vibració
    const vibrationToggle = document.getElementById('toggle-vibration');
    if (vibrationToggle)
        vibrationToggle.addEventListener('click', () => {
            const enabled = toggleVibration();
            vibrationToggle.textContent = enabled ? '📳 Vibració' : '🚫 Vibració';
            vibrationToggle.classList.toggle('bg-red-200', !enabled);
            vibrationToggle.classList.toggle('bg-gray-200', enabled);
        });

    // Inicialitza els textos!
    if (soundToggle)
        soundToggle.textContent = getSoundState() ? '🔊 So' : '🔇 So';
    if (vibrationToggle)
        vibrationToggle.textContent = getVibrationState() ? '📳 Vibració' : '🚫 Vibració';
};

// Inicialitza el joc
init();

window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
    errorDiv.innerHTML = `
        <div class="flex items-center">
            <span>S'ha produït un error. Recarrega la pàgina.</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-red-500 hover:text-red-700">✕</button>
        </div>
    `;
    document.body.appendChild(errorDiv);
    setTimeout(() => { if (errorDiv.parentNode) errorDiv.remove(); }, 10000);
});

window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

