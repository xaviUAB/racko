
import { Card, GameState } from '../types';

export const CARD_DECK_SIZES = { 2: 40, 3: 50, 4: 60 };
export const NUM_CARDS_IN_RACK = 10;
export const RACKO_POINTS = 75;
export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export const createAndShuffleDeck = (maxCard: number): number[] => {
    let newDeck = Array.from({ length: maxCard }, (_, i) => i + 1);
    return shuffleArray(newDeck);
};

export const shuffleArray = <T,>(array: T[]): T[] => {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
};

export const checkAscendingOrder = (rack: Card[]): boolean => {
    if (rack.length !== NUM_CARDS_IN_RACK || rack.some(c => c === null)) return false;
    for (let i = 0; i < rack.length - 1; i++) {
        if (rack[i]! >= rack[i + 1]!) {
            return false;
        }
    }
    return true;
};

const checkForConsecutiveSequence = (rack: Card[]): boolean => {
    for (let i = 0; i <= rack.length - 3; i++) {
        if (rack[i]! + 1 === rack[i + 1]! && rack[i + 1]! + 1 === rack[i + 2]!) {
            return true;
        }
    }
    return false;
};

export const checkVictoryCondition = (game: GameState, playerRack: Card[]): boolean => {
    const isAscending = checkAscendingOrder(playerRack);
    if (!isAscending) return false;
    if (game.numPlayers > 2) return true;
    if (game.numPlayers === 2) return checkForConsecutiveSequence(playerRack);
    return false;
};

export const calculateSequenceScore = (rack: Card[]): number => {
    const SEQUENCE_POINTS_PER_CARD = 5;
    let score = 0;
    if (rack.length !== NUM_CARDS_IN_RACK || rack.some(c => c === null)) return 0;

    for (let i = 0; i < rack.length; i++) {
        if (i === 0 || rack[i]! > rack[i - 1]!) {
            score += SEQUENCE_POINTS_PER_CARD;
        } else {
            break;
        }
    }
    return score;
};

export const calculateRunBonus = (rack: Card[]): number => {
    if (!rack || rack.length !== NUM_CARDS_IN_RACK || rack.some(c => c === null)) return 0;

    let longestRun = 0;
    let currentRun = 1;
    for (let i = 1; i < rack.length; i++) {
        if (rack[i] === rack[i - 1]! + 1) {
            currentRun++;
        } else {
            longestRun = Math.max(longestRun, currentRun);
            currentRun = 1;
        }
    }
    longestRun = Math.max(longestRun, currentRun);

    if (longestRun >= 6) return 400;
    if (longestRun === 5) return 200;
    if (longestRun === 4) return 100;
    if (longestRun === 3) return 50;
    return 0;
};

export const getNextPlayerId = (game: GameState): string => {
    if (!game.turn) return game.playerIds[0];
    const currentIndex = game.playerIds.indexOf(game.turn);
    const nextIndex = (currentIndex + 1) % game.playerIds.length;
    return game.playerIds[nextIndex];
};

export const getCardBackgroundColor = (cardValue: number | null, maxCardValue: number): React.CSSProperties => {
    if (cardValue === null || !maxCardValue || maxCardValue <= 1) {
        return { backgroundColor: '#ffffff' };
    }
    const ratio = (cardValue - 1) / (maxCardValue - 1);
    const r1 = 255, g1 = 255, b1 = 255; // White
    const r2 = 250, g2 = 238, b2 = 196; // Vanilla
    const r = Math.round(r1 + (r2 - r1) * ratio);
    const g = Math.round(g1 + (g2 - g1) * ratio);
    const b = Math.round(b1 + (b2 - b1) * ratio);
    return { backgroundColor: `rgb(${r}, ${g}, ${b})` };
};
