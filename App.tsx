
import React, { useState, useEffect } from 'react';
// FIX: Use Firebase v8 compat imports for auth, as the environment seems to be using an older version which lacks the expected v9 exports.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { auth } from './services/firebase';
import Lobby from './components/Lobby';
import Game from './components/Game';
import { Loader2 } from 'lucide-react';

const App: React.FC = () => {
    // FIX: Use firebase.User type from the compat import.
    const [user, setUser] = useState<firebase.User | null>(null);
    const [loading, setLoading] = useState(true);
    const [gameId, setGameId] = useState<string | null>(null);

    useEffect(() => {
        // FIX: Use auth.onAuthStateChanged (v8/compat syntax) instead of the modular onAuthStateChanged(auth, ...) (v9 syntax).
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            setLoading(false);
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
