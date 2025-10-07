// js/game-logic.js - Game state management and Firebase operations
import {
    doc, getDoc, setDoc, onSnapshot, collection, query,
    updateDoc, arrayUnion, runTransaction, getDocs, where, deleteDoc
} from 'https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js';

import { CARD_DECK_SIZES, NUM_CARDS_IN_RACK, createAndShuffleDeck, generate4DigitId } from './game-core.js';
import { playBeep, playWinMelody, vibrate, unlockAudio } from './sound.js';
import { updateFloatingCard, clearFloatingCard } from './ui.js';

let db, appId, userId;
let gameId = null, gameState = null, unsubscribeGame = null;

export const initGameLogic = (database, applicationId, userIdentifier) => {
    db = database;
    appId = applicationId;
    userId = userIdentifier;
    document.getElementById('user-id-display').textContent = `ID: ${userId}`;
    window.gameFunctions.renderLobby('Crea o uneix-te a una partida');
};

const getGameRef = (id) => doc(db, 'artifacts', appId, 'public', 'data', 'rackogames', id);

const validatePlayerName = (name) => {
    const trimmed = name?.trim() || '';
    if (trimmed.length < 2 || trimmed.length > 15) {
        showModal('Error Nom', 'Nom entre 2 i 15 caràcters');
        return null;
    }
    localStorage.setItem('racko-player-name', trimmed);
    return trimmed;
};

const createGame = async (numPlayers, rawPlayerName) => {
    await unlockAudio();
    const playerName = validatePlayerName(rawPlayerName);
    if (!playerName || numPlayers < 2 || numPlayers > 4) return;

    let uniqueId;
    for (let i = 0; i < 10; i++) {
        const potentialId = generate4DigitId();
        const snap = await getDoc(getGameRef(potentialId));
        if (!snap.exists()) {
            uniqueId = potentialId;
            break;
        }
    }
    if (!uniqueId) {
        showModal('Error', 'No s\'ha pogut generar ID');
        return;
    }
    gameId = uniqueId;
    // IMPORTANT: inclou el camp gameId explícit!
    const newGameData = {
        gameId: uniqueId,
        status: 'lobby',
        numPlayers,
        maxCardValue: CARD_DECK_SIZES[numPlayers],
        playerIds: [userId],
        players: [{
            id: userId,
            name: playerName,
            rack: Array(NUM_CARDS_IN_RACK).fill(null),
            score: 0,
            scoreHistory: []
        }],
        deck: createAndShuffleDeck(CARD_DECK_SIZES[numPlayers]),
        discardPile: [],
        turn: null,
        messages: [`${playerName} ha creat la partida.`],
        lastUpdate: Date.now(),
        beepTrigger: null
    };
    await setDoc(getGameRef(uniqueId), newGameData);
    startListeningToGame(uniqueId);
};

const startListeningToGame = (id) => {
    if (unsubscribeGame) unsubscribeGame();
    gameId = id;
    unsubscribeGame = onSnapshot(getGameRef(gameId), (doc) => {
        if (doc.exists()) {
            gameState = doc.data();
            window.gameFunctions.renderGame(gameState, userId, gameState.turn === userId, () => gameState.players.find(p => p.id === userId), () => null);
            document.getElementById('game-id-value').textContent = gameId; // DEBUG panel
        } else {
            resetLobbyState('Partida eliminada del servidor.');
        }
    }, (error) => {
        resetLobbyState('Error de connexió.');
    });
};

const resetLobbyState = (msg = '') => {
    if (unsubscribeGame) unsubscribeGame();
    gameId = null; gameState = null;
    clearFloatingCard();
    document.getElementById('game-id-value').textContent = 'N/A';
    window.gameFunctions.renderLobby(msg || 'Crea o uneix-te a una partida');
};

export const gameFunctions = {
    createGame, resetLobbyState,
    // Implementa joinGame, startGame, etc. com sempre...
    renderLobby: () => {}, renderGame: () => {}
};

// Modal helper
const showModal = (title, msg) => {
    alert(`${title}: ${msg}`); // Fes que apunti als teus modals!
};
