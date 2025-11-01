import { useState, useEffect, useRef } from 'react';
// FIX: Import `updateDoc` from `firebase/firestore` to resolve reference error.
import { onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db, appId } from '../services/firebase';
import { GameState } from '../types';
import { INACTIVITY_TIMEOUT_MS } from '../utils/gameLogic';
import { deleteGame } from '../services/gameService';
import { playBeep, playWinMelody, vibrate } from '../utils/audio';

export const useGameSync = (gameId: string, userId: string, onExit: () => void) => {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isHost, setIsHost] = useState(false);

    const lastTurnProcessed = useRef<string | null>(null);
    const lastWinProcessed = useRef<string | null>(null);

    useEffect(() => {
        const gameRef = doc(db, 'artifacts', appId, 'public', 'data', 'racko_games', gameId);

        const unsubscribe = onSnapshot(gameRef, (doc) => {
            if (doc.exists()) {
                const data = doc.data() as GameState;

                if (!data.playerIds.includes(userId)) {
                    setError("Error de Sincronització: Has estat eliminat de la partida.");
                    setTimeout(() => onExit(), 3000);
                    return;
                }

                const timeElapsed = Date.now() - data.lastUpdate;
                if (timeElapsed > INACTIVITY_TIMEOUT_MS) {
                    console.warn(`Partida inactiva per ${timeElapsed}ms. S'està eliminant.`);
                    if(isHost) deleteGame(gameId); // Només l'amfitrió elimina per evitar conflictes
                    // Tots els clients rebran l'error 'no existeix' i sortiran.
                    return;
                }

                setGameState(data);
                setIsHost(data.players[0]?.id === userId);
                setError(null);
                
                // Efectes de so i vibració
                const isMyTurn = data.turn === userId && data.status === 'playing';
                if (isMyTurn && data.turn !== lastTurnProcessed.current) {
                    playBeep();
                    vibrate([300, 100, 300]);
                }
                lastTurnProcessed.current = data.turn;

                const isFinished = data.status === 'finished_hand' || data.status === 'finished';
                if (isFinished && data.status !== lastWinProcessed.current) {
                    playWinMelody();
                    vibrate([500, 200, 500]);
                }
                lastWinProcessed.current = data.status;

                // Trigger de so remot
                if (data.beepTrigger && data.beepTrigger.targetId === userId) {
                    playBeep();
                    vibrate([100, 50, 100]);
                    updateDoc(gameRef, { beepTrigger: null }); // Neteja el trigger
                }

            } else {
                setError("Aquesta partida ja no existeix. Tornant a la sala d'espera.");
                setTimeout(() => onExit(), 3000);
            }
        }, (err) => {
            console.error("Error en onSnapshot:", err);
            setError("S'ha perdut la connexió. Tornant a la sala d'espera.");
            setTimeout(() => onExit(), 3000);
        });

        return () => unsubscribe();
    }, [gameId, userId, onExit, isHost]);

    return { gameState, error, isHost };
};