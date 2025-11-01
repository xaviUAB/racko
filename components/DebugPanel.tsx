import React, { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { deleteGame } from '../services/gameService';
import Modal from './Modal';

interface DebugPanelProps {
    gameId: string;
    userId: string;
    isHost: boolean;
    onExit: () => void;
}

const DebugPanel: React.FC<DebugPanelProps> = ({ gameId, userId, isHost, onExit }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);

    const handleResetConfirm = async () => {
        try {
            await deleteGame(gameId);
            onExit();
        } catch (error) {
            console.error("Error en eliminar la partida:", error);
        }
    };
    
    return (
        <>
            <Modal 
                isOpen={isModalOpen}
                title="Confirmar Reinici"
                message="Estàs segur que vols eliminar permanentment aquesta partida? Aquesta acció és irreversible i afectarà a tots els jugadors."
                onConfirm={handleResetConfirm}
                confirmText="Sí, elimina la partida"
                cancelText="Cancel·lar"
                onClose={() => setIsModalOpen(false)}
            />
            <div className="text-xs p-2 mb-4 bg-yellow-50 rounded-lg border border-yellow-200 flex flex-col sm:flex-row justify-between items-center">
                <div className="mb-2 sm:mb-0">
                    <h4 className="font-bold text-yellow-800 mb-1">Panell de Diagnòstic</h4>
                    <span className="block text-gray-600">ID d'Usuari: <span className="font-mono text-xs">{userId}</span></span>
                    <span className="block text-gray-600">ID de Partida Activa: <span className="font-bold text-red-600">{gameId}</span></span>
                </div>
                {isHost && (
                    <div className="mt-2 sm:mt-0 w-full sm:w-auto">
                        <button onClick={() => setIsModalOpen(true)} className="w-full py-2 px-3 bg-red-500 text-white font-semibold rounded-lg shadow-md hover:bg-red-700 transition duration-300 flex items-center justify-center text-xs whitespace-nowrap transform hover:-translate-y-0.5">
                            <AlertTriangle className="w-3 h-3 mr-1" /> Reiniciar Partida (Amfitrió)
                        </button>
                    </div>
                )}
            </div>
        </>
    );
};

export default DebugPanel;