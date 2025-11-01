import React from 'react';
import { Player, Card } from '../types';
import { getCardBackgroundColor } from '../utils/gameLogic';
import { Replace } from 'lucide-react';

interface PlayerRackProps {
    player: Player;
    isMyTurn: boolean;
    heldCard: Card;
    onReplace: (slotIndex: number) => void;
    maxCardValue: number;
}

const PlayerRack: React.FC<PlayerRackProps> = ({ player, isMyTurn, heldCard, onReplace, maxCardValue }) => {
    let sequenceBroken = false;

    return (
        <div className="bg-indigo-50 p-4 rounded-xl shadow-inner mb-4">
            <h3 className="text-xl font-bold text-indigo-700 mb-3">El Teu Faristol</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
                {player.rack.map((card, index) => {
                    const isPlayableSlot = isMyTurn && heldCard !== null && card !== null;
                    const slotNumber = index + 1;

                    let isSlotCorrect = false;
                    if (!sequenceBroken && card !== null) {
                        isSlotCorrect = (index === 0) || (player.rack[index - 1] !== null && card > player.rack[index - 1]!);
                        if (!isSlotCorrect) {
                            sequenceBroken = true;
                        }
                    }
                    const slotNumberColorClass = card === null ? 'text-gray-400' : (isSlotCorrect ? 'text-green-600' : 'text-red-600');

                    return (
                        <div key={index} className="flex items-center space-x-2">
                            <span className={`text-sm font-bold w-6 text-right ${slotNumberColorClass}`}>{slotNumber}:</span>
                            <div className="flex-1">
                                <div
                                    onClick={() => isPlayableSlot && onReplace(index)}
                                    className={`card-slot group relative ${
                                        isPlayableSlot 
                                        ? 'border-dashed border-green-500 bg-green-50 hover:bg-green-100 hover:scale-105 cursor-pointer shadow-lg' 
                                        : 'cursor-default'
                                    } ${
                                        card === null ? 'bg-gray-200 border-dashed border-gray-400' : ''
                                    }`}
                                >
                                    {card !== null ? (
                                        <div className="card-value text-3xl" style={getCardBackgroundColor(card, maxCardValue)}>
                                            {card}
                                        </div>
                                    ) : (
                                        <span className="text-gray-400 text-lg">{slotNumber}</span>
                                    )}
                                    {isPlayableSlot && (
                                        <div className="absolute inset-0 bg-green-500 bg-opacity-0 group-hover:bg-opacity-80 flex items-center justify-center rounded-lg transition-all duration-300">
                                            <Replace className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transform scale-50 group-hover:scale-100 transition-all duration-300" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PlayerRack;