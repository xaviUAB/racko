import React, { useState } from 'react';
import { useGameSync } from '../hooks/useGameSync';
import GameLobby from './GameLobby';
import GameBoard from './GameBoard';
import Modal from './Modal';
import { Loader2, AlertTriangle } from 'lucide-react';
import DebugPanel from './DebugPanel';

interface GameProps {
    gameId: string;
    userId: string;
    onExit: () => void;
}

const Game: React.FC<GameProps> = ({ gameId, userId, onExit }) => {
    const { gameState, error, isHost } = useGameSync(gameId, userId, onExit);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '', onConfirm: undefined as (() => void) | undefined, confirmText: 'Confirmar' });

    const showModal = (title: string, message: string, onConfirm?: () => void, confirmText?: string) => {
        setModal({ isOpen: true, title, message, onConfirm, confirmText: confirmText || 'Confirmar' });
    };

    if (error) {
        return (
            <div className="text-center p-8 bg-red-100 border border-red-300 rounded-lg">
                <AlertTriangle className="w-10 h-10 text-red-600 mx-auto mb-4" />
                <p className="font-bold text-red-700">{error}</p>
            </div>
        );
    }

    if (!gameState) {
        return (
            <div className="text-center p-8">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-500" />
                <p className="mt-2 font-semibold">Carregant l'estat de la partida...</p>
            </div>
        );
    }

    return (
        <div className="relative">
            <Modal
                isOpen={modal.isOpen}
                title={modal.title}
                message={modal.message}
                onConfirm={modal.onConfirm}
                confirmText={modal.confirmText}
                cancelText="Cancel·lar"
                onClose={() => setModal({ ...modal, isOpen: false })}
            />
            
            <DebugPanel gameId={gameId} userId={userId} isHost={isHost} onExit={onExit} />
            
            {gameState.status === 'lobby' ? (
                <GameLobby gameState={gameState} userId={userId} gameId={gameId} isHost={isHost} />
            ) : (
                <GameBoard gameState={gameState} userId={userId} gameId={gameId} onExit={onExit} showModal={showModal} />
            )}
        </div>
    );
};

export default Game;