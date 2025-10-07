// js/game-logic.js - Game state management and Firebase operations
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
    
    // Update debug panel
    document.getElementById('user-id-display').innerHTML = 
        `ID d'Usuari: <span class="font-mono text-xs">${userId}</span>`;
    
    loadLastGame();
};

const getGameRef = (gameId) => doc(db, 'artifacts', appId, 'public', 'data', 'rackogames', gameId);

const validatePlayerName = (name) => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 15) {
        showModal('Error de Nom', 'Introdueix un nom vàlid d\'entre 2 i 15 caràcters.');
        return null;
    }
    localStorage.setItem('racko-player-name', trimmedName);
    return trimmedName;
};

const loadLastGame = async () => {
    if (!userId || gameId) return;
    
    const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'rackogames'),
        where('playerIds', 'array-contains', userId)
    );
    
    try {
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            gameId = snapshot.docs[0].id;
            console.log('LOAD: Reconnecting to existing game ID:', gameId);
            startListeningToGame(gameId);
        } else {
            console.log('LOAD: No active game found for this user. Rendering lobby.');
            window.gameFunctions.renderLobby();
        }
    } catch (error) {
        console.error('Error loading last game:', error);
        window.gameFunctions.renderLobby('Error carregant l\'última partida. Problema de Permisos/Connexió. Intenta crear-ne una de nova.');
    }
};

const startListeningToGame = (id) => {
    if (unsubscribeGame) unsubscribeGame();
    
    gameId = id;
    document.getElementById('game-id-value').textContent = gameId;
    
    unsubscribeGame = onSnapshot(getGameRef(gameId), (doc) => {
        if (doc.exists()) {
            gameState = doc.data();
            
            // Inactivity detection
            const lastUpdate = gameState.lastUpdate || 0;
            const timeElapsed = Date.now() - lastUpdate;
            
            if (timeElapsed > INACTIVITY_TIMEOUT_MS) {
                console.log('INACTIVITY: Game', gameId, 'inactive for', Math.floor(timeElapsed / 1000) + 's. Attempting to delete.');
                deleteGameAndReset(false);
                return;
            }
            
            console.log('SNAPSHOT: Game state updated for ID', gameId, 'Status:', gameState.status);
            handleGameStateUpdate(gameState);
        } else {
            console.error('SNAPSHOT ERROR: Game', gameId, 'no longer exists. Returning to Lobby.');
            resetLobbyState('La partida ha estat eliminada del servidor Firestore.');
        }
    }, (error) => {
        console.error('Error in onSnapshot:', error);
        resetLobbyState('Error de connexió en temps real. Torna a intentar d\'unir-te.');
    });
};

const handleGameStateUpdate = (game) => {
    // Data integrity check
    if (!game.playerIds.includes(userId)) {
        syncErrorCount++;
        console.warn('SYNC WARNING: User ID', userId, 'not in playerIds', game.playerIds, '. Consecutive errors:', syncErrorCount);
        
        if (syncErrorCount > 1) {
            if (gameId) {
                resetLobbyState('Error de Sincronització: El teu ID no es troba a la llista de jugadors.');
                return;
            }
        }
        return;
    }
    syncErrorCount = 0;

    // Handle sound and vibration notifications
    handleNotifications(game);
    
    // Render the game
    window.gameFunctions.renderGame(game, userId, game.turn === userId, 
        () => game.players.find(p => p.id === userId),
        (game) => {
            const playerIds = game.playerIds;
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
    console.log('LOBBY: Resetting local state.');
    
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
    
    // Unsubscribe first
    if (unsubscribeGame) {
        unsubscribeGame();
        unsubscribeGame = null;
    }
    
    try {
        console.log('RESET: Deleting game document', currentId);
        await deleteDoc(getGameRef(currentId));
        
        resetLobbyState(isManual ? 
            'La partida ha estat reiniciada correctament per l\'amfitrió.' : 
            'La partida ha estat reiniciada automàticament per inactivitat (5 minuts).'
        );
    } catch (error) {
        console.warn('Error deleting game document:', error);
        resetLobbyState(isManual ? 
            'La partida ha estat reiniciada correctament per l\'amfitrió.' : 
            'La partida ha estat reiniciada automàticament per inactivitat (5 minuts).'
        );
    }
};

const createGame = async (numPlayers, rawPlayerName) => {
    await unlockAudio(); // Unlock audio on user interaction
    
    const createButton = event.currentTarget;
    const originalText = createButton.innerHTML;
    const playerName = validatePlayerName(rawPlayerName);
    
    if (!playerName || numPlayers < 2 || numPlayers > 4) return;
    
    createButton.disabled = true;
    createButton.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Creant...';
    
    let uniqueId = null;
    let maxRetries = 10;
    
    for (let i = 0; i < maxRetries; i++) {
        const potentialId = generate4DigitId();
        const gameRef = getGameRef(potentialId);
        const docSnap = await getDoc(gameRef);
        
        if (!docSnap.exists()) {
            uniqueId = potentialId;
            break;
        }
    }
    
    if (!uniqueId) {
        showModal('Error', 'No s\'ha pogut generar una ID única de 4 dígits. Torna a intentar-ho.');
        createButton.disabled = false;
        createButton.innerHTML = originalText;
        return;
    }
    
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
    
    try {
        const newGameRef = getGameRef(uniqueId);
        await setDoc(newGameRef, newGameData);
        console.log('CREATE: Game', uniqueId, 'created successfully.');
        startListeningToGame(uniqueId);
    } catch (error) {
        console.error('Error creating game:', error);
        showModal('Error', 'No s\'ha pogut crear la partida. Assegura\'t de tenir connexió a internet.');
        resetLobbyState();
    } finally {
        if (!gameId) {
            createButton.disabled = false;
            createButton.innerHTML = originalText;
        }
    }
};

const joinGame = async (gameIdToJoin, rawPlayerName) => {
    await unlockAudio(); // Unlock audio on user interaction
    
    const joinButton = document.getElementById('join-button');
    const playerName = validatePlayerName(rawPlayerName);
    const trimmedId = gameIdToJoin.trim();
    
    if (!playerName || !trimmedId || trimmedId.length !== 4 || isNaN(trimmedId)) {
        if (!playerName) showModal('Error', 'Introdueix una ID de partida vàlida de 4 dígits.');
        return;
    }
    
    joinButton.disabled = true;
    joinButton.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 mr-2 animate-spin"></i> Carregant...';
    
    const gameRef = getGameRef(trimmedId);
    
    try {
        const gameDoc = await getDoc(gameRef);
        if (!gameDoc.exists()) {
            throw new Error('La partida no existeix (Codi incorrecte).');
        }
        
        const game = gameDoc.data();
        if (game.playerIds.includes(userId)) {
            startListeningToGame(trimmedId);
            return;
        }
        
        await runTransaction(db, async (transaction) => {
            const gameDocInTx = await transaction.get(gameRef);
            const gameInTx = gameDocInTx.data();
            
            if (gameInTx.status !== 'lobby') {
                throw new Error('La partida ja ha començat.');
            }
            
            if (gameInTx.playerIds.length >= gameInTx.numPlayers) {
                throw new Error('La partida està plena.');
            }
            
            const newPlayer = {
                id: userId,
                name: playerName,
                rack: Array(NUM_CARDS_IN_RACK).fill(null),
                score: 0,
                scoreHistory: []
            };
            
            if (gameInTx.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
                throw new Error('Aquest nom ja està en ús en aquesta partida.');
            }
            
            const updatedPlayers = [...gameInTx.players, newPlayer];
            
            transaction.update(gameRef, {
                playerIds: arrayUnion(userId),
                players: updatedPlayers,
                messages: arrayUnion(`${newPlayer.name} s'ha unit.`),
                lastUpdate: Date.now()
            });
        });
        
        startListeningToGame(trimmedId);
    } catch (error) {
        console.error('Error joining game:', error);
        let msg = error.message.includes('document does not exist') ? 
            'La partida no existeix (Codi incorrecte).' : error.message;
        
        if (error.code === 'permission-denied' || error.message.includes('permissions')) {
            msg = 'Permisos Insuficients: Assegura\'t que has publicat les regles de seguretat més recents a Firebase!';
        }
        
        showModal('Error d\'Unió', `No s'ha pogut unir a la partida: ${msg}.`);
        resetLobbyState();
    } finally {
        if (!gameId) {
            joinButton.disabled = false;
            joinButton.innerHTML = 'Unir-se';
        }
    }
};

// Export all game functions
export const gameFunctions = {
    createGame,
    joinGame,
    resetLobbyState,
    deleteGameAndReset: () => deleteGameAndReset(true),
    confirmReset: () => showModal('Confirmació de Reinici', 
        'Estàs segur que vols eliminar permanentment aquesta partida? Aquesta acció és irreversible.',
        () => deleteGameAndReset(true)
    ),
    closeModal: () => document.getElementById('custom-modal').classList.add('hidden'),
    
    // Game actions (these would need full implementation)
    startGame: async () => { /* Implementation needed */ },
    handleDrawCard: async (source) => { /* Implementation needed */ },
    handleReplaceCard: async (slotIndex) => { /* Implementation needed */ },
    handleDiscardHeldCard: async () => { /* Implementation needed */ },
    handleReshuffle: async () => { /* Implementation needed */ },
    endHandAndScore: async () => { /* Implementation needed */ },
    triggerRemoteBeep: async (targetId) => { /* Implementation needed */ },
    
    // UI functions
    renderLobby: window.gameFunctions?.renderLobby || (() => {}),
    renderGame: window.gameFunctions?.renderGame || (() => {})
};

// Modal function
const showModal = (title, message, onConfirm = null) => {
    const modal = document.getElementById('custom-modal');
    const confirmBtn = document.getElementById('modal-confirm-btn');
    const closeBtn = document.getElementById('modal-close-btn');
    
    document.getElementById('modal-title').innerHTML = title;
    document.getElementById('modal-message').innerHTML = message;
    
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