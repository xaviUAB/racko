import React, { useState, useEffect } from 'react';
import { GameState, Card } from '../types';
import { Layers, Trash2, Trophy, Bell, Loader2 } from 'lucide-react';
import { getCardBackgroundColor, checkVictoryCondition, getNextPlayerId, calculateRunBonus, RACKO_POINTS, calculateSequenceScore, createAndShuffleDeck, NUM_CARDS_IN_RACK } from '../utils/gameLogic';
import PlayerRack from './PlayerRack';
import Scoreboard from './Scoreboard';
import { doc, runTransaction, arrayUnion } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import FloatingCard from './FloatingCard';

interface GameBoardProps {
    gameState: GameState;
    userId: string;
    gameId: string;
    onExit: () => void;
    showModal: (title: string, message: string, onConfirm?: () => void) => void;
}

const GameBoard: React.FC<GameBoardProps> = ({ gameState, userId, gameId, onExit, showModal }) => {
    const [heldCard, setHeldCard] = useState<Card>(null);
    const [heldSource, setHeldSource] = useState<'draw' | 'discard' | null>(null);
    const [isActionInProgress, setIsActionInProgress] = useState(false);
    const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

    const myPlayer = gameState.players.find(p => p.id === userId);
    const isMyTurn = gameState.turn === userId;
    const isGameActive = gameState.status === 'playing';

    useEffect(() => {
        const handleMouseMove = (event: MouseEvent) => {
            setMousePosition({ x: event.clientX, y: event.clientY });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
        };
    }, []);

    useEffect(() => {
        if (!isMyTurn) {
            setHeldCard(null);
            setHeldSource(null);
        }
    }, [gameState.turn, isMyTurn]);

    const handleAction = async (action: () => Promise<void>) => {
        if (isActionInProgress) return;
        setIsActionInProgress(true);
        try {
            await action();
        } catch (error) {
            const msg = error instanceof Error ? error.message : "Ha ocorregut un error desconegut.";
            showModal("Acció Fallida", msg);
        } finally {
            setIsActionInProgress(false);
        }
    };
    
    const drawCard = (source: 'draw' | 'discard') => handleAction(async () => {
        if (!isMyTurn || heldCard || !isGameActive) return;
        if (source === 'discard' && gameState.discardPile.length === 0) return;
        if (source === 'draw' && gameState.deck.length === 0) return;

        let cardValue: number | undefined;
        await runTransaction(db, async tx => {
            const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'racko_games', gameId);
            const gameDoc = await tx.get(gameRef);
            if (!gameDoc.exists()) throw new Error("La partida no s'ha trobat.");
            const game = gameDoc.data() as GameState;
            if (game.turn !== userId) throw new Error("No és el teu torn.");
            
            const newDeck = [...game.deck];
            const newDiscard = [...game.discardPile];

            if (source === 'draw') {
                cardValue = newDeck.pop();
            } else {
                cardValue = newDiscard.pop();
            }
            if (cardValue === undefined) throw new Error("La pila està buida.");

            tx.update(gameRef, { deck: newDeck, discardPile: newDiscard, lastUpdate: Date.now() });
        });
        setHeldCard(cardValue!);
        setHeldSource(source);
    });

    const discardHeldCard = () => handleAction(async () => {
        if (!isMyTurn || !heldCard || heldSource !== 'draw' || !isGameActive) return;

        await runTransaction(db, async tx => {
            const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'racko_games', gameId);
            const gameDoc = await tx.get(gameRef);
            const game = gameDoc.data() as GameState;

            tx.update(gameRef, {
                discardPile: arrayUnion(heldCard),
                turn: getNextPlayerId(game),
                messages: arrayUnion(`${myPlayer?.name} ha descartat un ${heldCard}.`),
                lastUpdate: Date.now()
            });
        });
        setHeldCard(null);
        setHeldSource(null);
    });

    const replaceCard = (slotIndex: number) => handleAction(async () => {
        if (!isMyTurn || !heldCard || !myPlayer || !isGameActive) return;

        await runTransaction(db, async tx => {
            const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'racko_games', gameId);
            const gameDoc = await tx.get(gameRef);
            const game = gameDoc.data() as GameState;
            
            const cardToDiscard = myPlayer.rack[slotIndex];
            const players = game.players.map(p => p.id === userId ? { ...p } : p);
            const pIndex = players.findIndex(p => p.id === userId);
            
            const newRack = [...players[pIndex].rack];
            newRack[slotIndex] = heldCard;
            players[pIndex].rack = newRack;

            let status: GameState['status'] = game.status;
            let winnerId: string | null = null;
            let winMessage = '';

            if (checkVictoryCondition(game, newRack)) {
                status = 'finished_hand';
                winnerId = userId;
                winMessage = `${myPlayer.name} crida Rack-O i guanya la mà!`;
            }

            tx.update(gameRef, {
                players: players,
                discardPile: arrayUnion(cardToDiscard),
                turn: status === 'finished_hand' ? game.turn : getNextPlayerId(game),
                status: status,
                winnerId: winnerId || game.winnerId || null,
                messages: arrayUnion(winMessage, `${myPlayer.name} ha reemplaçat la ranura ${slotIndex + 1} amb un ${heldCard}.`),
                lastUpdate: Date.now()
            });
        });
        setHeldCard(null);
        setHeldSource(null);
    });
    
    const endHandAndScore = () => handleAction(async () => {
        if (gameState.status !== 'finished_hand' || gameState.winnerId !== userId) return;

        await runTransaction(db, async tx => {
            const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'racko_games', gameId);
            const gameDoc = await tx.get(gameRef);
            const game = gameDoc.data() as GameState;
            
            const newScores = game.players.map(p => {
                let score = 0;
                if (p.id === game.winnerId) {
                    const bonus = game.numPlayers > 2 ? calculateRunBonus(p.rack) : 0;
                    score = RACKO_POINTS + bonus;
                } else {
                    score = calculateSequenceScore(p.rack);
                }
                const newTotalScore = p.score + score;
                return { ...p, score: newTotalScore, scoreHistory: [...p.scoreHistory, score] };
            });

            const gameWinner = newScores.find(p => p.score >= 500);
            
            let deck = createAndShuffleDeck(game.maxCardValue);
            const playersForNextHand = newScores.map(p => ({
                ...p,
                rack: deck.splice(0, NUM_CARDS_IN_RACK)
            }));
            const newDiscardPile = deck.length > 0 ? [deck.pop()!] : [];

            tx.update(gameRef, {
                status: gameWinner ? 'finished' : 'playing',
                players: playersForNextHand,
                deck: deck,
                discardPile: newDiscardPile,
                turn: game.winnerId, // El guanyador comença la següent mà
                winnerId: gameWinner ? gameWinner.id : null,
                messages: arrayUnion(`Mà puntuada. Començant nova ronda.`),
                lastUpdate: Date.now()
            });
        });
    });

    const topDiscard = gameState.discardPile[gameState.discardPile.length - 1];

    const getActionArea = () => {
        if (gameState.status === 'finished_hand') {
            const winner = gameState.players.find(p => p.id === gameState.winnerId);
            if (gameState.winnerId === userId) {
                return <button onClick={endHandAndScore} className="w-full py-3 bg-yellow-500 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center"><Trophy className="mr-2" /> Puntuar Mà i Començar Nova Ronda</button>;
            }
            return <p className="text-green-700 font-semibold p-2">Esperant que {winner?.name} puntuï la mà.</p>;
        }
        if (gameState.status === 'finished') {
             const winner = gameState.players.find(p => p.id === gameState.winnerId);
             return <div className="text-center"><p className="text-2xl font-bold text-yellow-600">🏆 {winner?.name} ha guanyat la partida amb {winner?.score} punts! 🏆</p><button onClick={onExit} className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-lg">Tornar a la Sala</button></div>;
        }
        if (isMyTurn && heldCard) {
            const sourceText = heldSource === 'draw' ? 'del munt de robar' : 'de la pila de descarts';
            return <div className="p-2 border border-blue-200 rounded-lg bg-blue-50"><p className="text-base font-semibold text-blue-700">Tens la carta <span className="text-xl text-red-600 font-extrabold">{heldCard}</span> {sourceText}.</p><p className="text-sm text-blue-800 font-bold mt-1">Ara, reemplaça una carta del teu faristol o descarta-la (si l'has agafat del munt).</p></div>;
        }
        if (isMyTurn) {
            return <p className="text-lg font-bold text-green-700 p-2 border border-green-200 rounded-lg bg-green-50"><Bell className="w-5 h-5 inline mr-1 animate-pulse" /> És el teu torn! Tria una carta del munt de robar o de la pila de descarts.</p>;
        }
        const turnPlayer = gameState.players.find(p => p.id === gameState.turn);
        return <p className="text-lg font-bold text-orange-700 p-2 border border-orange-200 rounded-lg bg-orange-50"><Loader2 className="w-5 h-5 inline mr-1 animate-spin" /> Esperant a {turnPlayer?.name}...</p>;
    };

    return (
        <div className="mt-6">
            <FloatingCard cardValue={heldCard} maxCardValue={gameState.maxCardValue} position={mousePosition} />
            <div className="flex justify-center space-x-8 mb-6 p-4 bg-gray-50 rounded-lg shadow-inner">
                <div className="flex flex-col items-center">
                    <h4 className="font-bold text-gray-700 mb-2 flex items-center"><Layers className="w-4 h-4 mr-1" /> Munt de Robar ({gameState.deck.length})</h4>
                    <div onClick={() => drawCard('draw')} className={`w-24 h-36 border-4 rounded-lg flex items-center justify-center transition-all duration-200 ${isMyTurn && !heldCard && gameState.deck.length > 0 ? 'cursor-pointer hover:border-indigo-500 hover:-translate-y-1' : 'cursor-default border-gray-400'}`}>
                        {gameState.deck.length > 0 ? 
                            <div className="card-back flex items-center justify-center rounded-lg w-full h-full text-3xl"><Layers /></div> :
                            <span className="text-sm text-gray-500 font-semibold p-1">Buida</span>
                        }
                    </div>
                </div>
                <div className="flex flex-col items-center">
                    <h4 className="font-bold text-gray-700 mb-2 flex items-center"><Trash2 className="w-4 h-4 mr-1" /> Pila de Descarts</h4>
                    <div onClick={() => {
                        if (isMyTurn && !heldCard && topDiscard) drawCard('discard');
                        if (isMyTurn && heldCard && heldSource === 'draw') discardHeldCard();
                    }} className={`w-24 h-36 border-4 rounded-lg transition-all duration-200 ${(isMyTurn && !heldCard && topDiscard) ? 'cursor-pointer hover:border-green-500 hover:-translate-y-1' : (isMyTurn && heldCard && heldSource === 'draw') ? 'cursor-pointer border-red-400 ring-4 ring-red-300 hover:-translate-y-1' : 'cursor-default border-gray-400'}`}>
                        {topDiscard ? 
                            <div className="card-value w-full h-full flex items-center justify-center text-4xl" style={getCardBackgroundColor(topDiscard, gameState.maxCardValue)}>{topDiscard}</div> :
                             <div className="flex items-center justify-center w-full h-full text-lg text-gray-500">Buida</div>
                        }
                    </div>
                </div>
            </div>

            <div className="mb-6 p-3 rounded-xl text-center min-h-[72px] flex items-center justify-center">{getActionArea()}</div>

            {myPlayer && <PlayerRack player={myPlayer} isMyTurn={isMyTurn} heldCard={heldCard} onReplace={replaceCard} maxCardValue={gameState.maxCardValue} />}

            <Scoreboard players={gameState.players} currentTurnId={gameState.turn} userId={userId} gameId={gameId} />
        </div>
    );
};

export default GameBoard;