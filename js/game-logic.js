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
    // No cridem renderLobby aquí, això ja es fa des d'app.js DESPRÉS de setup complet!
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

const joinGame = async (gameIdToJoin, rawPlayerName) => {
    await unlockAudio();
    const playerName = validatePlayerName(rawPlayerName);
    const trimmedId = (gameIdToJoin || '').trim();
    if (!playerName) return;
    if (!trimmedId || trimmedId.length !== 4 || isNaN(trimmedId)) {
        showModal('Error', 'Codi de partida invàlid.');
        return;
    }
    try {
        const gameRef = getGameRef(trimmedId);
        await runTransaction(db, async (transaction) => {
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists()) {
                throw new Error('La partida no existeix');
            }
            const game = gameDoc.data();
            if (game.playerIds && game.playerIds.includes(userId)) {
                // Ja ets dins, només escoltem!
                return;
            }
            if (game.status !== 'lobby') {
                throw new Error('La partida ja ha començat');
            }
            if (!game.playerIds || game.playerIds.length >= game.numPlayers) {
                throw new Error('La partida està plena');
            }
            // Comprova noms duplicats
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
            transaction.update(gameRef, {
                playerIds: arrayUnion(userId),
                players: updatedPlayers,
                messages: updatedMessages,
                lastUpdate: Date.now()
            });
        });
        startListeningToGame(trimmedId);
    } catch (error) {
        showModal('Error d\'Unió', error.message);
    }
};

const startGame = async () => {
    // Només el creador i si el lobby està complet poden iniciar la partida
    if (!gameState || gameState.status !== 'lobby') {
        showModal('Error', 'La partida ja ha començat o ja no està en estat de lobby.');
        return;
    }
    if (!gameState.players || gameState.players.length !== gameState.numPlayers) {
        showModal('Error', 'Encara falten jugadors per unir-se.');
        return;
    }
    // Només el primer jugador (creador) pot iniciar
    if (gameState.players[0].id !== userId) {
        showModal('Només el creador pot iniciar!', 'El teu compte no pot iniciar la partida.');
        return;
    }
    try {
        await runTransaction(db, async (transaction) => {
            const gameRef = getGameRef(gameId);
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists()) throw new Error('La partida ha estat eliminada.');
            const game = gameDoc.data();
            if (game.status !== 'lobby') throw new Error('La partida ja ha començat.');

            // Barat fem una còpia del deck
            const deck = [...game.deck];
            // Reparteix cartes a cada jugador
            const updatedPlayers = game.players.map(player => {
                const rack = [];
                for (let i = 0; i < NUM_CARDS_IN_RACK; i++) {
                    rack.push(deck.pop());
                }
                return { ...player, rack };
            });
            // Primer jugador comença el torn  
            const turn = game.playerIds[0];
            // Una carta al discard pile, la resta és deck
            const discard = [deck.pop()];

            transaction.update(gameRef, {
                status: 'playing',
                players: updatedPlayers,
                deck: deck,
                discardPile: discard,
                turn: turn,
                lastUpdate: Date.now(),
                messages: arrayUnion('La partida ha començat!')
            });
        });
    } catch (error) {
        showModal('Error', 'No s\'ha pogut iniciar la partida: ' + error.message);
    }
};


const startListeningToGame = (id) => {
    if (unsubscribeGame) unsubscribeGame();
    gameId = id;
    unsubscribeGame = onSnapshot(getGameRef(gameId), (doc) => {
        if (doc.exists()) {
            gameState = doc.data();
            if (typeof window.gameFunctions?.renderGame === 'function') {
                window.gameFunctions.renderGame(
                    gameState, userId, gameState.turn === userId,
                    () => gameState.players.find(p => p.id === userId), () => null
                );
            }
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
    if (typeof window.gameFunctions?.renderLobby === 'function') {
        window.gameFunctions.renderLobby(msg || 'Crea o uneix-te a una partida');
    }
};


const handleDrawCard = async (source) => {
    // source: "draw" o "discard"
    if (!gameState || gameState.status !== 'playing') return;
    if (gameState.turn !== userId) return;
    if (window.heldCard) return; // Ja tens carta agafada

    try {
        await runTransaction(db, async (transaction) => {
            const gameRef = getGameRef(gameId);
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists()) throw new Error("Partida no trobada");
            const game = gameDoc.data();

            let newHeldCard, newDeck = [...game.deck], newDiscardPile = [...game.discardPile];

            if (source === "draw") {
                if (newDeck.length === 0) throw new Error("El munt està buit");
                newHeldCard = newDeck.pop();
            } else if (source === "discard") {
                if (newDiscardPile.length === 0) throw new Error("No hi ha cartes a la pila de descarts");
                newHeldCard = newDiscardPile.pop();
            } else {
                throw new Error("Font incorrecta");
            }

            transaction.update(gameRef, {
                deck: newDeck,
                discardPile: newDiscardPile,
                heldCard: newHeldCard,
                heldCardSource: source,
                lastUpdate: Date.now()
            });
        });
    } catch (error) {
        showModal("Error en robar carta", error.message);
    }
};

const handleReplaceCard = async (slotIndex) => {
    // slotIndex: 0..9. Només si tens carta agafada des del draw o discard!
    if (!gameState || gameState.status !== 'playing') return;
    if (gameState.turn !== userId) return;
    const myPlayerIdx = gameState.players.findIndex(p => p.id === userId);
    if (myPlayerIdx < 0) return;

    try {
        await runTransaction(db, async (transaction) => {
            const gameRef = getGameRef(gameId);
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists()) throw new Error("Partida no trobada");
            const game = gameDoc.data();

            if (!game.heldCard) throw new Error("No tens carta agafada");
            // Reemplaça la carta al slot pel heldCard actual
            const updatedRack = [...game.players[myPlayerIdx].rack];
            const replacedCard = updatedRack[slotIndex];
            updatedRack[slotIndex] = game.heldCard;

            // Actualitza rack del jugador
            const updatedPlayers = [...game.players];
            updatedPlayers[myPlayerIdx] = {
                ...game.players[myPlayerIdx],
                rack: updatedRack
            };

            let newDiscardPile = [...game.discardPile];

            // Si la carta agafada era del discard, NO torna la carta reemplaçada al discard
            // Si la carta agafada era del draw, la carta reemplaçada VA al discard
            if (game.heldCardSource === 'draw' && replacedCard !== null) {
                newDiscardPile.push(replacedCard);
            }

            transaction.update(gameRef, {
                players: updatedPlayers,
                discardPile: newDiscardPile,
                heldCard: null,
                heldCardSource: null,
                lastUpdate: Date.now()
            });
        });
    } catch (error) {
        showModal("Error en reemplaçar carta", error.message);
    }
};

const handleDiscardHeldCard = async () => {
    if (!gameState || gameState.status !== 'playing') return;
    if (gameState.turn !== userId) return;
    try {
        await runTransaction(db, async (transaction) => {
            const gameRef = getGameRef(gameId);
            const gameDoc = await transaction.get(gameRef);
            if (!gameDoc.exists()) throw new Error("Partida no trobada");
            const game = gameDoc.data();

            if (!game.heldCard) throw new Error("No tens carta agafada");
            if (game.heldCardSource !== "draw") throw new Error("Només es pot descartar la carta del munt");

            let newDiscardPile = [...game.discardPile, game.heldCard];

            transaction.update(gameRef, {
                discardPile: newDiscardPile,
                heldCard: null,
                heldCardSource: null,
                lastUpdate: Date.now()
            });
        });
    } catch (error) {
        showModal("Error al descartar carta", error.message);
    }
};

export const gameFunctions = {
    createGame,
    joinGame,
    startGame,
    resetLobbyState,
    handleDrawCard,
    handleReplaceCard,
    handleDiscardHeldCard,
    // Altres funcions si cal
    renderLobby: () => {},
    renderGame: () => {}
};

const showModal = (title, msg) => {
    alert(`${title}: ${msg}`);
};
