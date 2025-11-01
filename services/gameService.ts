
import { 
    doc, getDoc, setDoc, updateDoc, arrayUnion, runTransaction, 
    collection, query, where, getDocs, deleteDoc 
} from 'firebase/firestore';
import { db, appId } from './firebase';
import { GameState, Player } from '../types';
import { createAndShuffleDeck, shuffleArray, CARD_DECK_SIZES, NUM_CARDS_IN_RACK } from '../utils/gameLogic';

const getGameRef = (gameId: string) => doc(db, 'artifacts', appId, 'public', 'data', 'racko_games', gameId);

export const findUserGame = async (userId: string): Promise<string | null> => {
    const q = query(
        collection(db, 'artifacts', appId, 'public', 'data', 'racko_games'),
        where('playerIds', 'array-contains', userId)
    );
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
        return snapshot.docs[0].id;
    }
    return null;
};

export const createGame = async (numPlayers: 2 | 3 | 4, playerName: string, userId: string): Promise<string> => {
    let uniqueId = '';
    for (let i = 0; i < 10; i++) { // Retry 10 times
        const potentialId = String(Math.floor(1000 + Math.random() * 9000));
        const gameRef = getGameRef(potentialId);
        const docSnap = await getDoc(gameRef);
        if (!docSnap.exists()) {
            uniqueId = potentialId;
            break;
        }
    }
    if (!uniqueId) throw new Error("Could not generate a unique game ID.");

    const maxCardValue = CARD_DECK_SIZES[numPlayers];
    const newPlayer: Player = {
        id: userId,
        name: playerName,
        rack: Array(NUM_CARDS_IN_RACK).fill(null),
        score: 0,
        scoreHistory: []
    };
    const newGameData: GameState = {
        status: 'lobby',
        numPlayers,
        maxCardValue,
        playerIds: [userId],
        players: [newPlayer],
        deck: createAndShuffleDeck(maxCardValue),
        discardPile: [],
        turn: null,
        messages: [`${playerName} has created the game.`],
        lastUpdate: Date.now(),
        beepTrigger: null,
    };

    await setDoc(getGameRef(uniqueId), newGameData);
    return uniqueId;
};

export const joinGame = async (gameId: string, playerName: string, userId: string): Promise<void> => {
    const gameRef = getGameRef(gameId);
    await runTransaction(db, async (transaction) => {
        const gameDoc = await transaction.get(gameRef);
        if (!gameDoc.exists()) throw new Error("Game does not exist.");

        const game = gameDoc.data() as GameState;
        if (game.status !== 'lobby') throw new Error("Game has already started.");
        if (game.playerIds.length >= game.numPlayers) throw new Error("Game is full.");
        if (game.players.some(p => p.name.toLowerCase() === playerName.toLowerCase())) {
             throw new Error("This name is already in use in this game.");
        }

        const newPlayer: Player = {
            id: userId,
            name: playerName,
            rack: Array(NUM_CARDS_IN_RACK).fill(null),
            score: 0,
            scoreHistory: []
        };

        transaction.update(gameRef, {
            playerIds: arrayUnion(userId),
            players: arrayUnion(newPlayer),
            messages: arrayUnion(`${playerName} has joined.`),
            lastUpdate: Date.now()
        });
    });
};

export const deleteGame = async (gameId: string): Promise<void> => {
    await deleteDoc(getGameRef(gameId));
};

export const updateBeepTrigger = async (gameId: string, targetId: string | null) => {
    const gameRef = getGameRef(gameId);
    if (targetId) {
        await updateDoc(gameRef, {
            beepTrigger: { targetId, timestamp: Date.now() },
            lastUpdate: Date.now()
        });
    } else {
        await updateDoc(gameRef, { beepTrigger: null });
    }
};
