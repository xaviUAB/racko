// js/game-core.js - Core game logic
export const CARD_DECK_SIZES = { 2: 40, 3: 50, 4: 60 };
export const NUM_CARDS_IN_RACK = 10;
export const RACK_O_POINTS = 75;

// Fisher-Yates shuffle algorithm
export const shuffleArray = (array) => {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
};

export const createAndShuffleDeck = (maxCard) => {
    let newDeck = Array.from({ length: maxCard }, (_, i) => i + 1);
    return shuffleArray(newDeck);
};

export const checkAscendingOrder = (rack) => {
    if (rack.length !== NUM_CARDS_IN_RACK || rack.includes(null)) return false;
    
    for (let i = 0; i < rack.length - 1; i++) {
        if (rack[i] >= rack[i + 1]) return false;
    }
    return true;
};

export const checkForConsecutiveSequence = (rack) => {
    for (let i = 0; i < rack.length - 2; i++) {
        if (rack[i] + 1 === rack[i + 1] && rack[i] + 2 === rack[i + 2]) {
            return true;
        }
    }
    return false;
};

export const checkVictoryCondition = (game, playerRack) => {
    const isAscending = checkAscendingOrder(playerRack);
    if (!isAscending) return false;
    
    if (game.numPlayers !== 2) return true;
    
    // 2-player rule: must have a sequence of 3 to win with Rack-O
    return checkForConsecutiveSequence(playerRack);
};

export const calculateSequenceScore = (rack) => {
    const SEQUENCE_POINTS_PER_CARD = 5;
    let score = 0;
    
    if (rack.length !== NUM_CARDS_IN_RACK || rack.includes(null)) return 0;
    
    for (let i = 0; i < rack.length; i++) {
        if (i === 0 || rack[i] > rack[i - 1]) {
            score += SEQUENCE_POINTS_PER_CARD;
        } else {
            break;
        }
    }
    return score;
};

export const calculateRunBonus = (rack) => {
    if (!rack || rack.length !== NUM_CARDS_IN_RACK || rack.includes(null)) return 0;
    
    let longestRun = 0;
    let currentRun = 1;
    
    for (let i = 1; i < rack.length; i++) {
        if (rack[i] === rack[i - 1] + 1) {
            currentRun++;
        } else {
            longestRun = Math.max(longestRun, currentRun);
            currentRun = 1;
        }
    }
    longestRun = Math.max(longestRun, currentRun);
    
    if (longestRun >= 6) return 400;
    if (longestRun >= 5) return 200;
    if (longestRun >= 4) return 100;
    if (longestRun >= 3) return 50;
    return 0;
};

export const generate4DigitId = () => {
    return String(Math.floor(1000 + Math.random() * 9000));
};