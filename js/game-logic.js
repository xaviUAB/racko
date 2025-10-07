// js/game-logic.js - Game state management and Firebase operations (FIXED)
import { 
    doc, getDoc, setDoc, onSnapshot, collection, query, 
    updateDoc, arrayRemove, arrayUnion, runTransaction, 
    getDocs, where, deleteDoc 
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

import {
    CARD_DECK_SIZES, NUM_CARDS_IN_RACK, RACK_O_POINTS,
    createAndShuffleDeck, checkVictoryCondition, 
    calculateSequenceScore, calculateRunBonus, generate4DigitId
} from './game-core.js';

import { playBeep, playWinMelody, vibrate, unlockAudio } from './sound.js';
import { updateFloatingCard, clearFloatingCard } from './ui.js';

const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

// Game state variables
let db, appId, userId;
let gameId = null;
let gameState = null;
let unsubscribeGame = null;
let syncErrorCount = 0;
let isDrawingCard = false;
let lastTurnProcessed = null;
let lastWinProcessed = null;

export const initGameLogic = (database, applicationId, userIdentifier) => {
    db = database;
    appId = applicationId;
    userId = userIdentifier;
    
    console.log('🎮 Game logic initialized with:', { appId, userId: userId?.substring(0, 8) + '...' });
    
    // Update debug panel
    document.getElementById('user-id-display').innerHTML = 
        `ID d'Usuari: <span class="font-mono text-xs">${userId?.substring(0, 12)}...</span>`;
    
    // Don't automatically load last game - let user choose
    console.log('🎯 Ready to create or join games');
    window.gameFunctions.renderLobby('Benvingut! Crea una nova partida o uneix-te a una existent amb un codi de 4 dígits.');
};

// Fixed path to match Firestore structure
const getGameRef = (gameId) => {
    const path = `artifacts/${appId}/public/data/rackogames/${gameId}`;
    console.log('📁 Game reference path:', path);
    return doc(db, 'artifacts', appId, 'public', 'data', 'rackogames', gameId);
};

const validatePlayerName = (name) => {
    const trimmedName = name?.trim() || '';
    if (trimmedName.length < 2 || trimmedName.length > 15) {
        showModal('Error de Nom', 'Introdueix un nom vàlid d\'entre 2 i 15 caràcters.');
        return null;
    }
    localStorage.setItem('racko-player-name', trimmedName);
    return trimmedName;
};

const loadLastGame = async () => {
    console.log('🔍 Checking for existing games...');
    if (!userId || gameId) return;
    
    try {
        const q = query(
            collection(db, 'artifacts', appId, 'public', 'data', 'rackogames'),
            where('playerIds', 'array-contains', userId)
        );
        
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const gameDoc = snapshot.docs[0];
            const game = gameDoc.data();
            
            // Check if game is still active (not too old)
            const lastUpdate = game.lastUpdate || 0;
            const timeElapsed = Date.now() - lastUpdate;
            
            if (timeElapsed > INACTIVITY_TIMEOUT_MS) {
                console.log('⏰ Found old game, cleaning up...');
                await deleteDoc(gameDoc.ref);
                window.gameFunctions.renderLobby('Partida anterior caducada. Crea\'n una de nova.');
            } else {
                gameId = gameDoc.id;
                console.log('🔄 Reconnecting to existing game:', gameId);
                startListeningToGame(gameId);
            }
        } else {
            console.log('🆕 No active game found');
            window.gameFunctions.renderLobby('Cap partida activa trobada. Crea una nova partida o uneix-te a una existent.');
        }
    } catch (error) {
        console.error('❌ Error loading last game:', error);
        window.gameFunctions.renderLobby('Error carregant l\'última partida. Crea una nova partida.');
    }
};

const startListeningToGame = (id) => {
    if (unsubscribeGame) {
        unsubscribeGame();
    }
    
    gameId = id;
    document.getElementById('game-id-value').textContent = gameId;
    
    console.log('👂 Starting to listen to game:', gameId);
    
    const gameRef = getGameRef(gameId);
    unsubscribeGame = onSnapshot(gameRef, (doc) => {
        if (doc.exists()) {
            gameState = doc.data();
            console.log('📊 Game state updated:', {
                status: gameState.status,
                players: gameState.players?.length || 0,
                turn: gameState.turn
            });
            handleGameStateUpdate(gameState);
        } else {
            console.error('❌ Game document does not exist:', gameId);
            resetLobbyState('La partida ja no existeix al servidor.');
        }
    }, (error) => {
        console.error('❌ Error in game listener:', error);
        if (error.code === 'permission-denied') {
            resetLobbyState('Permisos insuficients. Comprova les regles de Firestore.');
        } else {
            resetLobbyState('Error de connexió. Torna a intentar-ho.');
        }
    });
};

const handleGameStateUpdate = (game) => {
    // Data integrity check
    if (!game.playerIds || !game.playerIds.includes(userId)) {
        syncErrorCount++;
        console.warn('⚠️ User not in playerIds:', { 
            userId, 
            playerIds: game.playerIds, 
            errors: syncErrorCount 
        });
        
        if (syncErrorCount > 2) {
            resetLobbyState('Error de sincronització: no es troba el teu usuari a la partida.');
            return;
        }
        return;
    }
    syncErrorCount = 0;

    // Handle notifications
    handleNotifications(game);
    
    // Render the game
    window.gameFunctions.renderGame(game, userId, game.turn === userId, 
        () => game.players?.find(p => p.id === userId),
        (game) => {
            const playerIds = game.playerIds || [];
            const currentIndex = playerIds.indexOf(game.turn);
            const nextIndex = (currentIndex + 1) % playerIds.length;
            return playerIds[nextIndex];
        }
    );
};

const handleNotifications = (game) => {
    // Remote beep trigger
    if (game.beepTrigger && game.beepTrigger.targetId === userId) {
        const triggerTime = game.beepTrigger.timestamp;
        if (Date.now() - triggerTime < 2000) {
            playBeep();
            vibrate([100, 50, 100]);
            
            // Clear the trigger
            updateDoc(getGameRef(gameId), { beepTrigger: null }).catch(err => 
                console.error('Error clearing beepTrigger:', err)
            );
        }
    }
    
    // Turn notification
    const isMyTurn = game.turn === userId;
    const isPlaying = game.status === 'playing';
    
    if (isMyTurn && isPlaying && game.turn !== lastTurnProcessed) {
        playBeep();
        vibrate([300, 100, 300]);
        lastTurnProcessed = game.turn;
    } else if (!isMyTurn && game.turn !== lastTurnProcessed) {
        lastTurnProcessed = game.turn;
    }
    
    // Victory/end game notification
    const isFinished = game.status === 'finishedhand' || game.status === 'finished';
    if (isFinished && game.status !== lastWinProcessed) {
        playWinMelody();
        vibrate([500, 200, 500]);
        lastWinProcessed = game.status;
    } else if (!isFinished && game.status !== lastWinProcessed) {
        lastWinProcessed = game.status;
    }
};

const resetLobbyState = (message = 'L\'estat de connexió s\'ha netejat. Torna a unir-te o crea una nova partida.') => {
    console.log('🏠 Resetting to lobby:', message);
    
    if (unsubscribeGame) {
        unsubscribeGame();
        unsubscribeGame = null;
    }
    
    gameId = null;
    gameState = null;
    clearFloatingCard();
    document.getElementById('game-id-value').textContent = 'N/A';
    
    lastTurnProcessed = null;
    lastWinProcessed = null;
    
    window.gameFunctions.renderLobby(message);
};

const deleteGameAndReset = async (isManual = false) => {
    if (!gameId) return;
    
    const currentId = gameId;
    console.log('🗑️ Deleting game:', currentId);
    
    // Unsubscribe first
    if (unsubscribeGame) {
        unsubscribeGame();
        unsubscribeGame = null;
    }
    
    try {
        await deleteDoc(getGameRef(currentId));
        resetLobbyState(isManual ? 
            'Partida reiniciada correctament.' : 
            'Partida reiniciada per inactivitat.'
        );
    } catch (error) {
        console.warn('⚠️ Error deleting game:', error);
        resetLobbyState(isManual ? 
            'Partida reiniciada.' : 
            'Partida reiniciada per inactivitat.'
        );
    }
};

const createGame = async (numPlayers, rawPlayerName) => {
    await unlockAudio(); // Unlock audio on user interaction
    
    console.log('🎯 Creating game with:', { numPlayers, playerName: rawPlayerName });
    
    const playerName = validatePlayerName(rawPlayerName);
    if (!playerName || numPlayers < 2 || numPlayers > 4) {
        console.error('❌ Invalid parameters for createGame');
        return;
    }
    
    // Show loading state
    const createButtons = document.querySelectorAll('button[onclick*="createGame"]');
    createButtons.forEach(btn => {
        btn.disabled = true;
        btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin inline"></i> Creant...';
    });
    
    try {
        // Generate unique game ID
        let uniqueId = null;
        let maxRetries = 10;
        
        for (let i = 0; i < maxRetries; i++) {
            const potentialId = generate4DigitId();
            const gameRef = getGameRef(potentialId);
            const docSnap = await getDoc(gameRef);
            
            if (!docSnap.exists()) {
                uniqueId = potentialId;
                console.log('✨ Generated unique game ID:', uniqueId);
                break;
            }
            console.log('🔄 ID collision, retrying...', potentialId);
        }
        
        if (!uniqueId) {
            throw new Error('No s\'ha pogut generar una ID única');
        }
        
        // Create game data
        const maxCardValue = CARD_DECK_SIZES[numPlayers];
        const fullDeck = createAndShuffleDeck(maxCardValue);
        const newPlayer = {
            id: userId,
            name: playerName,
            rack: Array(NUM_CARDS_IN_RACK).fill(null),
            score: 0,
            scoreHistory: []
        };
        
        const newGameData = {
            gameId: uniqueId, // Add explicit gameId field
            status: 'lobby',
            numPlayers: numPlayers,
            maxCardValue: maxCardValue,
            playerIds: [userId],
            players: [newPlayer],
            deck: fullDeck,
            discardPile: [],
            turn: null,
            messages: [`${newPlayer.name} ha creat la partida.`],
            lastUpdate: Date.now(),
            beepTrigger: null
        };
        
        console.log('💾 Saving game data:', {
            gameId: uniqueId,
            status: newGameData.status,
            numPlayers,
            playerName
        });
        
        const newGameRef = getGameRef(uniqueId);
        await setDoc(newGameRef, newGameData);
        
        console.log('✅ Game created successfully:', uniqueId);
        startListeningToGame(uniqueId);
        
    } catch (error) {
        console.error('❌ Error creating game:', error);
        showModal('Error', `No s'ha pogut crear la partida: ${error.message}`);
        
        // Reset buttons
        createButtons.forEach(btn => {
            btn.disabled = false;
            const playersText = btn.textContent.includes('2') ? '2' : 
                              btn.textContent.includes('3') ? '3' : '4';
            const cardsText = playersText === '2' ? '40' : playersText === '3' ? '50' : '60';
            btn.innerHTML = `${playersText} Jugadors<br><small>(Cartes 1-${cardsText})</small>`;
        });
    }
};

const joinGame = async (gameIdToJoin, rawPlayerName) => {
    await unlockAudio(); // Unlock audio on user interaction
    
    console.log('🤝 Joining game:', { gameId: gameIdToJoin, playerName: rawPlayerName });
    
    const joinButton = document.getElementById('join-button');
    const playerName = validatePlayerName(rawPlayerName);
    const trimmedId = gameIdToJoin?.trim() || '';
    
    if (!playerName) return; // Error already shown in validatePlayerName
    
    if (!trimmedId || trimmedId.length !== 4 || isNaN(trimmedId)) {
        showModal('Error', 'Introdueix un codi vàlid de 4 dígits.');
        return;
    }
    
    joinButton.disabled = true;
    joinButton.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 inline animate-spin"></i> Unint-se...';
    
    try {
        const gameRef = getGameRef(trimmedId);
        
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            
            if (!gameDoc.exists()) {
                throw new Error('La partida no existeix');
            }
            
            const game = gameDoc.data();
            
            // Check if user is already in game
            if (game.playerIds && game.playerIds.includes(userId)) {
                console.log('🔄 User already in game, reconnecting...');
                return; // Just reconnect, don't add again
            }
            
            if (game.status !== 'lobby') {
                throw new Error('La partida ja ha començat');
            }
            
            if (!game.playerIds) {
                throw new Error('Dades de partida corrompudes');
            }
            
            if (game.playerIds.length >= game.numPlayers) {
                throw new Error('La partida està plena');
            }
            
            // Check for duplicate names
            if (game.players && game.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
                throw new Error('Aquest nom ja està en ús');
            }
            
            const newPlayer = {
                id: userId,
                name: playerName,
                rack: Array(NUM_CARDS_IN_RACK).fill(null),
                score: 0,
                scoreHistory: []
            };
            
            const updatedPlayers = [...(game.players || []), newPlayer];
            const updatedMessages = [...(game.messages || []), `${newPlayer.name} s'ha unit.`];
            
            console.log('📝 Adding player to game:', {
                newPlayer: newPlayer.name,
                totalPlayers: updatedPlayers.length,
                maxPlayers: game.numPlayers
            });
            
            transaction.update(gameRef, {
                playerIds: arrayUnion(userId),
                players: updatedPlayers,
                messages: updatedMessages,
                lastUpdate: Date.now()
            });
        });
        
        console.log('✅ Successfully joined game:', trimmedId);
        startListeningToGame(trimmedId);
        
    } catch (error) {
        console.error('❌ Error joining game:', error);
        
        let errorMessage = error.message;
        if (error.code === 'permission-denied') {
            errorMessage = 'Permisos insuficients. Comprova les regles de Firestore.';
        } else if (error.code === 'not-found') {
            errorMessage = 'La partida no existeix.';
        }
        
        showModal('Error d\'Unió', `No s'ha pogut unir a la partida: ${errorMessage}`);
        
        joinButton.disabled = false;
        joinButton.innerHTML = 'Unir-se';
    }
};

const startGame = async () => {
    if (!gameState || gameState.status !== 'lobby') return;
    
    console.log('🚀 Starting game...');
    
    try {
        await runTransaction(db, async (transaction) => {
            const gameRef = getGameRef(gameId);
            const gameDoc = await transaction.get(gameRef);
            const game = gameDoc.data();
            
            if (game.status !== 'lobby') {
                throw new Error('La partida ja ha començat');
            }
            
            // Deal cards to players
            const deck = [...game.deck];
            const updatedPlayers = game.players.map(player => {
                const rack = [];
                for (let i = 0; i < NUM_CARDS_IN_RACK; i++) {
                    rack.push(deck.pop());
                }
                return { ...player, rack };
            });
            
            // Put one card in discard pile
            const discardPile = [deck.pop()];
            
            transaction.update(gameRef, {
                status: 'playing',
                players: updatedPlayers,
                deck: deck,
                discardPile: discardPile,
                turn: game.playerIds[0], // First player starts
                lastUpdate: Date.now(),
                messages: arrayUnion('La partida ha començat!')
            });
        });
        
        console.log('✅ Game started successfully');
    } catch (error) {
        console.error('❌ Error starting game:', error);
        showModal('Error', `No s'ha pogut iniciar la partida: ${error.message}`);
    }
};

// Export all game functions
export const gameFunctions = {
    createGame,
    joinGame,
    startGame,
    resetLobbyState,
    deleteGameAndReset: () => deleteGameAndReset(true),
    confirmReset: () => showModal('Confirmació de Reinici', 
        'Estàs segur que vols eliminar permanentment aquesta partida? Aquesta acció és irreversible.',
        () => deleteGameAndReset(true)
    ),
    closeModal: () => document.getElementById('custom-modal').classList.add('hidden'),
    
    // Placeholder game actions (need full implementation)
    handleDrawCard: async (source) => {
        console.log('🎴 Drawing card from:', source);
        // TODO: Implement
    },
    handleReplaceCard: async (slotIndex) => {
        console.log('🔄 Replacing card at slot:', slotIndex);
        // TODO: Implement
    },
    handleDiscardHeldCard: async () => {
        console.log('🗑️ Discarding held card');
        // TODO: Implement
    },
    handleReshuffle: async () => {
        console.log('🔀 Reshuffling deck');
        // TODO: Implement
    },
    endHandAndScore: async () => {
        console.log('🏆 Ending hand and scoring');
        // TODO: Implement
    },
    triggerRemoteBeep: async (targetId) => {
        console.log('📢 Triggering remote beep for:', targetId);
        // TODO: Implement
    },
    
    // UI functions (will be set by app.js)
    renderLobby: () => console.log('renderLobby not set yet'),
    renderGame: () => console.log('renderGame not set yet')
};

// Modal function
const showModal = (title, message, onConfirm = null) => {
    const modal = document.getElementById('custom-modal');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const closeBtn = document.getElementById('modal-close-btn');
    
    if (!modal) {
        console.error('Modal element not found');
        alert(`${title}: ${message}`);
        return;
    }
    
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-message').textContent = message;
    
    if (onConfirm) {
        confirmBtn.classList.remove('hidden');
        confirmBtn.onclick = () => {
            gameFunctions.closeModal();
            onConfirm();
        };
        closeBtn.textContent = 'Cancel·lar';
        document.getElementById('modal-title').classList.add('text-red-600');
    } else {
        confirmBtn.classList.add('hidden');
        closeBtn.textContent = 'Entès';
        document.getElementById('modal-title').classList.remove('text-red-600');
    }
    
    modal.classList.remove('hidden');
};
