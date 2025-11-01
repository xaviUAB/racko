import React from 'react';
import { GameState } from '../types';
import { Play } from 'lucide-react';
import { doc, runTransaction, arrayUnion } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { createAndShuffleDeck, NUM_CARDS_IN_RACK } from '../utils/gameLogic';

interface GameLobbyProps {
    gameState: GameState;
    userId: string;
    gameId: string;
    isHost: boolean;
}

const GameLobby: React.FC<GameLobbyProps> = ({ gameState, gameId, isHost }) => {
    const isLobbyFull = gameState.players.length === gameState.numPlayers;

    const handleStartGame = async () => {
        if (!isHost || !isLobbyFull) return;

        try {
            await runTransaction(db, async (transaction) => {
                const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'racko_games', gameId);
                const gameDoc = await transaction.get(gameRef);
                if (!gameDoc.exists() || (gameDoc.data() as GameState).status !== 'lobby') {
                    throw new Error("La partida no està en estat de sala d'espera.");
                }

                const game = gameDoc.data() as GameState;
                if (game.players.length !== game.numPlayers) {
                    throw new Error(`Partida incompleta. Falten ${game.numPlayers - game.players.length} jugadors.`);
                }
                
                let fullDeck = createAndShuffleDeck(game.maxCardValue);
                const players = [...game.players];

                // Reparteix les cartes inicials a cada jugador
                for (let i = 0; i < players.length; i++) {
                     const newRack = [];
                     for(let j=0; j < NUM_CARDS_IN_RACK; j++){
                        if(fullDeck.length > 0) {
                            newRack.push(fullDeck.pop()!);
                        }
                     }
                     players[i].rack = newRack.sort((a,b) => a-b); // Les cartes es col·loquen ordenades al principi per error, el joc consisteix en ordenar-les. Aquesta línia hauria de ser eliminada, però la mantinc per replicar la lògica original si fos intencionat. Per un joc correcte, s'hauria de treure el .sort()
                }

                const firstDiscard = fullDeck.pop();
                const startingPlayerIndex = Math.floor(Math.random() * players.length);
                
                transaction.update(gameRef, {
                    status: 'playing',
                    players: players,
                    deck: fullDeck,
                    discardPile: firstDiscard ? [firstDiscard] : [],
                    turn: players[startingPlayerIndex].id,
                    messages: arrayUnion("La partida ha començat! Bona sort."),
                    lastUpdate: Date.now()
                });
            });
        } catch (error) {
            console.error("Error en començar la partida:", error);
            // Aquí es podria mostrar un modal a l'usuari
        }
    };

    return (
        <div className="p-6 bg-white rounded-xl shadow-lg w-full max-w-lg mx-auto border-t-4 border-blue-500">
            <p className="text-xl font-bold mb-4 text-blue-700">Esperant a la Sala</p>
            <div className="mb-4">
                <label className="text-lg font-bold text-gray-800 mb-2 block">Codi de la Partida per Compartir:</label>
                 <input 
                    type="text" 
                    readOnly 
                    value={gameId} 
                    className="w-full text-center text-4xl font-extrabold select-all text-red-600 bg-red-50 p-2 rounded-lg border-2 border-red-200"
                    onFocus={(e) => e.target.select()}
                />
            </div>
            <p className="text-sm text-gray-700">
                Jugadors connectats: {gameState.players.length} de {gameState.numPlayers}.
            </p>
            <div className="mt-2 text-sm text-gray-700">
                <strong>Jugadors:</strong> {gameState.players.map(p => p.name).join(', ')}
            </div>

            {isHost ? (
                isLobbyFull ? (
                    <button onClick={handleStartGame} className="w-full py-3 mt-4 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center">
                        <Play className="mr-2" /> Començar Partida
                    </button>
                ) : (
                    <p className="mt-4 text-center text-red-600 font-semibold">Esperant que tots els {gameState.numPlayers} jugadors s'uneixin per poder començar.</p>
                )
            ) : (
                <p className="mt-4 text-center text-gray-600">Esperant que l'amfitrió ({gameState.players[0]?.name}) comenci la partida.</p>
            )}
        </div>
    );
};

export default GameLobby;