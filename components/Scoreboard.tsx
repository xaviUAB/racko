import React from 'react';
import { Player } from '../types';
import { updateBeepTrigger } from '../services/gameService';
import { Star, Volume2 } from 'lucide-react';

interface ScoreboardProps {
    players: Player[];
    currentTurnId: string | null;
    userId: string;
    gameId: string;
}

const Scoreboard: React.FC<ScoreboardProps> = ({ players, currentTurnId, userId, gameId }) => {
    
    const handleRemoteBeep = (targetId: string) => {
        updateBeepTrigger(gameId, targetId);
    };

    return (
        <div className="mt-6">
            <h3 className="text-xl font-bold text-gray-700 mb-3">Puntuació Global</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {players.map(player => {
                    const isLocalPlayer = player.id === userId;
                    const isPlayerTurn = player.id === currentTurnId;
                    const canRemoteBeep = isPlayerTurn && !isLocalPlayer;

                    return (
                        <div
                            key={player.id}
                            onClick={() => canRemoteBeep && handleRemoteBeep(player.id)}
                            className={`p-3 rounded-xl border-2 shadow-sm transition-all duration-200
                                ${isLocalPlayer ? 'bg-indigo-50 border-indigo-400' : 'bg-gray-50 border-gray-200'}
                                ${isPlayerTurn ? 'ring-4 ring-yellow-400' : ''}
                                ${canRemoteBeep ? 'cursor-pointer hover:bg-yellow-100 hover:border-yellow-400' : ''}
                            `}
                        >
                            <p className="font-bold text-lg flex items-center justify-between">
                                <span className="truncate">{player.name} {isLocalPlayer && '(Tu)'}</span>
                                {isPlayerTurn && (
                                    <span className={`flex items-center text-yellow-600 ${canRemoteBeep ? 'animate-pulse' : ''}`}>
                                        {canRemoteBeep ? <Volume2 size={16} /> : <Star size={16} className="fill-yellow-400" />}
                                    </span>
                                )}
                            </p>
                            <div className="mt-1">
                                <span className="text-xs text-gray-600 font-semibold">Puntuació Total:</span>
                                <p className="text-3xl font-bold text-indigo-700 leading-tight">{player.score}</p>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                Última Ronda: +{player.scoreHistory[player.scoreHistory.length - 1] || 0}
                            </p>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default Scoreboard;