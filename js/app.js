// js/app.js - Main application entry point
import { initFirebase, authenticateUser } from './firebase.js';
import { initAudio, toggleSound, toggleVibration, getSoundState, getVibrationState } from './sound.js';
import { initUI, renderLobby, renderGame, heldCard, heldSource } from './ui.js';
import { initGameLogic, gameFunctions } from './game-logic.js';

// Application state
let firebaseComponents = null;

const init = async () => {
    console.log('🎮 Initializing Rack-O Multiplayer Game');
    
    // Initialize Firebase
    firebaseComponents = await initFirebase();
    if (!firebaseComponents) {
        console.error('Failed to initialize Firebase');
        return;
    }
    
    const { app, db, auth, appId } = firebaseComponents;
    
    // Authenticate user
    const userId = await authenticateUser(auth, 
        typeof firebaseconfig !== 'undefined', 
        typeof initialauthtoken !== 'undefined' ? initialauthtoken : null
    );
    
    if (!userId) {
        console.error('Failed to authenticate user');
        return;
    }
    
    console.log('✅ User authenticated:', userId);
    
    // Initialize game components
    initAudio();
    initUI();
    initGameLogic(db, appId, userId);
    
    // Setup accessibility controls
    setupAccessibilityControls();
    
    // Export game functions globally for HTML onclick handlers
    window.gameFunctions = {
        ...gameFunctions,
        renderLobby,
        renderGame: (game, userId, isMyTurn, getMyPlayer, getNextPlayerId) => {
            renderGame(game, userId, isMyTurn, getMyPlayer, getNextPlayerId);
        }
    };
    
    console.log('🚀 Application initialized successfully');
};

const setupAccessibilityControls = () => {
    // Sound toggle
    const soundToggle = document.getElementById('toggle-sound');
    soundToggle.addEventListener('click', () => {
        const enabled = toggleSound();
        soundToggle.textContent = enabled ? '🔊 So' : '🔇 So';
        soundToggle.classList.toggle('bg-red-200', !enabled);
        soundToggle.classList.toggle('bg-gray-200', enabled);
    });
    
    // Vibration toggle
    const vibrationToggle = document.getElementById('toggle-vibration');
    vibrationToggle.addEventListener('click', () => {
        const enabled = toggleVibration();
        vibrationToggle.textContent = enabled ? '📳 Vibració' : '🚫 Vibració';
        vibrationToggle.classList.toggle('bg-red-200', !enabled);
        vibrationToggle.classList.toggle('bg-gray-200', enabled);
    });
    
    // Set initial states
    soundToggle.textContent = getSoundState() ? '🔊 So' : '🔇 So';
    vibrationToggle.textContent = getVibrationState() ? '📳 Vibració' : '🚫 Vibració';
};

// Error handling
window.addEventListener('error', (event) => {
    console.error('Global error:', event.error);
    
    // Show user-friendly error message
    const errorDiv = document.createElement('div');
    errorDiv.className = 'fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50';
    errorDiv.innerHTML = `
        <div class="flex items-center">
            <i data-lucide="alert-triangle" class="w-4 h-4 mr-2"></i>
            <span>S'ha produït un error. Recarrega la pàgina si els problemes persisteixen.</span>
            <button onclick="this.parentElement.parentElement.remove()" class="ml-4 text-red-500 hover:text-red-700">✕</button>
        </div>
    `;
    document.body.appendChild(errorDiv);
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 10000);
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('Unhandled promise rejection:', event.reason);
    event.preventDefault();
});

// Initialize the application
init().catch(error => {
    console.error('Failed to initialize application:', error);
    document.getElementById('main-container').innerHTML = 
        '<div class="text-center p-8 bg-red-100 rounded-xl"><p class="text-red-600 font-bold">Error inicialitzant l\'aplicació. Recarrega la pàgina.</p></div>';
});
