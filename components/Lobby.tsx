import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { createGame, joinGame, findUserGame } from '../services/gameService';
import Modal from './Modal';
import { initAudio } from '../utils/audio';

interface LobbyProps {
    userId: string;
    onEnterGame: (gameId: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ userId, onEnterGame }) => {
    const [playerName, setPlayerName] = useState('');
    const [joinGameId, setJoinGameId] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isReconnecting, setIsReconnecting] = useState(true);
    const [modal, setModal] = useState({ isOpen: false, title: '', message: '' });

    useEffect(() => {
        const savedName = localStorage.getItem('racko_player_name') || '';
        setPlayerName(savedName);

        const reconnect = async () => {
            const lastGameId = await findUserGame(userId);
            if (lastGameId) {
                onEnterGame(lastGameId);
            } else {
                setIsReconnecting(false);
            }
        };
        reconnect();
    }, [userId, onEnterGame]);

    const handlePlayerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setPlayerName(e.target.value);
    };

    const validateAndSaveName = () => {
        const trimmedName = playerName.trim();
        if (trimmedName.length < 2 || trimmedName.length > 15) {
            setModal({ isOpen: true, title: "Nom Invàlid", message: "Si us plau, introdueix un nom vàlid d'entre 2 i 15 caràcters." });
            return null;
        }
        localStorage.setItem('racko_player_name', trimmedName);
        return trimmedName;
    };

    const handleCreateGame = async (numPlayers: 2 | 3 | 4) => {
        initAudio();
        const name = validateAndSaveName();
        if (!name) return;
        setIsLoading(true);
        try {
            const newGameId = await createGame(numPlayers, name, userId);
            onEnterGame(newGameId);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Ha ocorregut un error desconegut.";
            setModal({ isOpen: true, title: "Error en Crear la Partida", message: errorMessage });
            setIsLoading(false);
        }
    };

    const handleJoinGame = async () => {
        initAudio();
        const name = validateAndSaveName();
        const id = joinGameId.trim();
        if (!name || !id || id.length !== 4 || isNaN(parseInt(id))) {
            if (name) setModal({ isOpen: true, title: "ID Invàlida", message: "Si us plau, introdueix una ID de partida vàlida de 4 dígits." });
            return;
        }
        setIsLoading(true);
        try {
            await joinGame(id, name, userId);
            onEnterGame(id);
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Ha ocorregut un error desconegut.";
            setModal({ isOpen: true, title: "Error en Unir-se a la Partida", message: errorMessage });
            setIsLoading(false);
        }
    };

    if (isReconnecting) {
        return (
            <div className="text-center p-8">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-indigo-500" />
                <p className="mt-2 font-semibold">Buscant partides actives...</p>
            </div>
        );
    }

    return (
        <>
            <Modal {...modal} onClose={() => setModal({ ...modal, isOpen: false })} />
            <div className="p-2 sm:p-6 bg-gray-50 rounded-xl w-full max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h3 className="text-xl font-bold mb-4 text-indigo-600">El Teu Nom</h3>
                    <p className="mb-2 text-sm text-gray-700">Com vols que et vegin els altres jugadors (2-15 caràcters)?</p>
                    <input
                        type="text"
                        value={playerName}
                        onChange={handlePlayerNameChange}
                        maxLength={15}
                        placeholder="Escriu el teu nom de jugador"
                        className="w-full max-w-sm mx-auto p-3 border-2 border-indigo-200 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 text-center text-xl font-semibold transition duration-200"
                        disabled={isLoading}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Unir-se a una partida */}
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                        <h3 className="text-2xl font-bold mb-4 text-indigo-600">Unir-se a una Partida</h3>
                        <p className="mb-3 text-sm text-gray-700">Introdueix el codi de <strong>4 dígits</strong> d'una partida existent.</p>
                        <input
                            type="text"
                            value={joinGameId}
                            onChange={(e) => setJoinGameId(e.target.value)}
                            maxLength={4}
                            placeholder="Codi de 4 dígits"
                            className="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-indigo-500 focus:border-indigo-500 text-center text-2xl font-mono tracking-widest"
                            disabled={isLoading}
                        />
                        <button
                            onClick={handleJoinGame}
                            disabled={isLoading}
                            className="w-full py-3 bg-indigo-500 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition-all duration-300 transform hover:-translate-y-1 flex items-center justify-center disabled:bg-indigo-300 disabled:transform-none"
                        >
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "Unir-se a la Partida"}
                        </button>
                    </div>

                    {/* Crear una partida */}
                    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
                        <h3 className="text-2xl font-bold mb-4 text-purple-600">Crear una Partida</h3>
                        <p className="mb-4 text-gray-700">Selecciona el nombre de jugadors. Es generarà un codi de <strong>4 dígits</strong>.</p>
                        <div className="flex flex-col space-y-3">
                            {[2, 3, 4].map(n => (
                                <button
                                    key={n}
                                    onClick={() => handleCreateGame(n as 2 | 3 | 4)}
                                    disabled={isLoading}
                                    className="w-full py-3 px-4 bg-purple-500 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition-all duration-300 transform hover:-translate-y-1 disabled:bg-purple-300 disabled:transform-none"
                                >
                                    {n} Jugadors
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default Lobby;