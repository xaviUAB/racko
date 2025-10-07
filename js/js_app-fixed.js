// js/app.js - Main application entry point (FIXED)
import { initFirebase, authenticateUser } from './firebase.js';
import { initAudio, toggleSound, toggleVibration, getSoundState, getVibrationState } from './sound.js';
import { initUI, renderLobby, renderGame } from './ui.js';
import { initGameLogic, gameFunctions } from './game-logic.js';

// Application state
let firebaseComponents = null;

const init = async () => {
    console.log('🎮 Initializing Rack-O Multiplayer Game');
    
    try {
        // Initialize Firebase
        firebaseComponents = await initFirebase();
        if (!firebaseComponents) {
            console.error('❌ Failed to initialize Firebase');
            return;
        }
        
        const { app, db, auth, appId } = firebaseComponents;
        console.log('✅ Firebase components initialized:', { 
            projectId: app.options.projectId,
            appId 
        });
        
        // Authenticate user
        const userId = await authenticateUser();
        
        if (!userId) {
            console.error('❌ Failed to authenticate user');
            document.getElementById('main-container').innerHTML = 
                '<div class="text-center p-8 bg-red-100 rounded-xl"><p class="text-red-600 font-bold">Error d\'autenticació. Recarrega la pàgina.</p></div>';
            return;
        }
        
        console.log('✅ User authenticated:', userId.substring(0, 8) + '...');
        
        // Initialize game components
        initAudio();
        initUI();
        
        // Setup accessibility controls before initializing game logic
        setupAccessibilityControls();
        
        // Export game functions globally for HTML onclick handlers BEFORE initializing game logic
        window.gameFunctions = {
            ...gameFunctions,
            renderLobby: (message) => {
                console.log('🏠 Rendering lobby:', message);
                renderLobby(message);
            },
            renderGame: (game, userId, isMyTurn, getMyPlayer, getNextPlayerId) => {
                console.log('🎮 Rendering game:', { 
                    status: game?.status, 
                    players: game?.players?.length,
                    isMyTurn 
                });
                renderGame(game, userId, isMyTurn, getMyPlayer, getNextPlayerId);
            }
        };
        
        // Initialize game logic (this will call renderLobby)
        initGameLogic(db, appId, userId);
        
        console.log('🚀 Application initialized successfully');
        
    } catch (error) {
        console.error('❌ Error during initialization:', error);
        
        // Show detailed error to user
        const errorContainer = document.getElementById('main-container');
        if (errorContainer) {
            errorContainer.innerHTML = `
                <div class="text-center p-8 bg-red-100 rounded-xl shadow-lg max-w-2xl mx-auto">
                    <div class="flex items-center justify-center mb-4">
                        <i data-lucide="alert-triangle" class="w-8 h-8 text-red-600 mr-2"></i>
                        <h2 class="text-xl font-bold text-red-600">Error d'Inicialització</h2>
                    </div>
                    <p class="text-red-700 mb-4">${error.message}</p>
                    <div class="bg-red-50 p-4 rounded-lg text-left text-sm text-red-600 mb-4">
                        <p><strong>Possibles solucions:</strong></p>
                        <ul class="list-disc list-inside mt-2 space-y-1">
                            <li>Comprova que la configuració de Firebase a <code>js/firebase.js</code> és correcta</li>
                            <li>Verifica que les regles de seguretat de Firestore estan publicades</li>
                            <li>Assegura't que Authentication està activat a Firebase Console</li>
                            <li>Comprova la connexió a internet</li>
                        </ul>
                    </div>
                    <button onclick="location.reload()" 
                            class="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition duration-200">
                        Recarregar Pàgina
                    </button>
                </div>
            `;
            
            // Initialize Lucide icons for the error message
            if (typeof lucide !== 'undefined') {
                lucide.createIcons();
            }
        }
    }
};

const setupAccessibilityControls = () => {
    console.log('♿ Setting up accessibility controls');
    
    try {
        // Sound toggle
        const soundToggle = document.getElementById('toggle-sound');
        if (soundToggle) {
            soundToggle.addEventListener('click', () => {
                const enabled = toggleSound();
                soundToggle.textContent = enabled ? '🔊 So' : '🔇 So';
                soundToggle.classList.toggle('bg-red-200', !enabled);
                soundToggle.classList.toggle('bg-gray-200', enabled);
                console.log('🔊 Sound toggled:', enabled);
            });
        }
        
        // Vibration toggle
        const vibrationToggle = document.getElementById('toggle-vibration');
        if (vibrationToggle) {
            vibrationToggle.addEventListener('click', () => {
                const enabled = toggleVibration();
                vibrationToggle.textContent = enabled ? '📳 Vibració' : '🚫 Vibració';
                vibrationToggle.classList.toggle('bg-red-200', !enabled);
                vibrationToggle.classList.toggle('bg-gray-200', enabled);
                console.log('📳 Vibration toggled:', enabled);
            });
        }
        
        // Set initial states
        if (soundToggle) {
            soundToggle.textContent = getSoundState() ? '🔊 So' : '🔇 So';
        }
        if (vibrationToggle) {
            vibrationToggle.textContent = getVibrationState() ? '📳 Vibració' : '🚫 Vibració';
        }
        
        console.log('✅ Accessibility controls set up');
    } catch (error) {
        console.warn('⚠️ Error setting up accessibility controls:', error);
    }
};

// Enhanced error handling
window.addEventListener('error', (event) => {
    console.error('💥 Global error:', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error
    });
    
    // Show user-friendly error message
    showErrorNotification('S\'ha produït un error. Recarrega la pàgina si els problemes persisteixen.');
});

// Handle unhandled promise rejections
window.addEventListener('unhandledrejection', (event) => {
    console.error('🚫 Unhandled promise rejection:', event.reason);
    event.preventDefault();
    
    showErrorNotification('Error de connexió. Comprova la teva connexió a internet.');
});

const showErrorNotification = (message) => {
    // Remove existing error notifications
    document.querySelectorAll('.error-notification').forEach(el => el.remove());
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-notification fixed top-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded z-50 max-w-sm shadow-lg';
    errorDiv.innerHTML = `
        <div class="flex items-center">
            <i data-lucide="alert-triangle" class="w-4 h-4 mr-2 flex-shrink-0"></i>
            <span class="text-sm">${message}</span>
            <button onclick="this.parentElement.parentElement.remove()" 
                    class="ml-4 text-red-500 hover:text-red-700 flex-shrink-0">✕</button>
        </div>
    `;
    document.body.appendChild(errorDiv);
    
    // Initialize Lucide icons for the error notification
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
    
    // Auto-remove after 10 seconds
    setTimeout(() => {
        if (errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 10000);
};

// Debugging helper
window.debugRacko = {
    getGameState: () => window.gameFunctions?.gameState,
    getUserId: () => firebaseComponents?.userId,
    getFirebaseApp: () => firebaseComponents?.app,
    showConfig: () => {
        console.log('Firebase Config:', firebaseComponents?.app?.options);
        console.log('User ID:', firebaseComponents?.userId);
        console.log('Game Functions:', Object.keys(window.gameFunctions || {}));
    }
};

// Initialize the application
console.log('🚀 Starting application initialization...');
init();

// Also initialize when DOM is fully loaded (fallback)
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM loaded, ensuring initialization...');
        if (!firebaseComponents) {
            init();
        }
    });
}