
export type Card = number | null;

export interface Player {
    id: string;
    name: string;
    rack: Card[];
    score: number;
    scoreHistory: number[];
}

export type GameStatus = 'lobby' | 'playing' | 'finished_hand' | 'finished';

export interface BeepTrigger {
    targetId: string;
    timestamp: number;
}

export interface GameState {
    status: GameStatus;
    numPlayers: number;
    maxCardValue: number;
    playerIds: string[];
    players: Player[];
    deck: number[];
    discardPile: number[];
    turn: string | null;
    messages: string[];
    lastUpdate: number;
    winnerId?: string | null;
    beepTrigger: BeepTrigger | null;
}
