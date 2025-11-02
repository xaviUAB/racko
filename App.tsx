import React, { useState, useEffect } from 'react';
import { auth, isPlatformEnvironment } from './services/firebase';
import { onAuthStateChanged, signInAnonymously, signInWithCustomToken, User } from 'firebase/auth';
import Lobby from './components/Lobby';
import Game from './components/Game';
import { Loader2 } from 'lucide-react';

// Aquesta variable global és proporcionada per l'entorn de la plataforma.
declare var __initial_auth_token: string | undefined;

const App: React.FC = () => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [gameId, setGameId] = useState<string | null>(null);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
            if (currentUser) {
                // Si ja hi ha un usuari, actualitzem l'estat i deixem de carregar.
                setUser(currentUser);
                setLoading(false);
            } else {
                // Si no hi ha usuari, intentem iniciar sessió.
                try {
                    if (isPlatformEnvironment && typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                        await signInWithCustomToken(auth, __initial_auth_token);
                    } else {
                        await signInAnonymously(auth);
                    }
                    // Després de l'intent d'inici de sessió, onAuthStateChanged es tornarà a executar
                    // amb el nou usuari, i actualitzarà l'estat en aquell moment.
                } catch (error) {
                    console.error("Error durant l'inici de sessió inicial:", error);
                    setLoading(false); // Aturem la càrrega per evitar un bucle infinit en cas d'error.
                }
            }
        });
        return () => unsubscribe();
    }, []);

    const handleEnterGame = (id: string) => {
        setGameId(id);
    };

    const handleExitGame = () => {
        setGameId(null);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <Loader2 className="w-12 h-12 mx-auto animate-spin text-indigo-600" />
                    <p className="mt-4 text-lg font-semibold text-gray-700">Connectant al servidor...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto p-4 sm:p-6 bg-white rounded-xl shadow-2xl border border-gray-200">
            <header className="mb-4 flex flex-col sm:flex-row justify-between items-center pb-4 border-b">
                <h1 className="text-3xl font-extrabold text-gray-900 mb-2 sm:mb-0">
                    Rack-O <span className="text-indigo-600 text-base">v. Multijugador</span>
                </h1>
                <div id="game-status-container" className="text-sm font-semibold h-10 flex items-center"></div>
            </header>
            
            {user ? (
                gameId ? (
                    <Game gameId={gameId} userId={user.uid} onExit={handleExitGame} />
                ) : (
                    <Lobby userId={user.uid} onEnterGame={handleEnterGame} />
                )
            ) : (
                <p className="text-center font-semibold text-gray-600">Autenticant...</p>
            )}
        </div>
    );
};

export default App;
