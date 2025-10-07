// js/ui.js - User interface rendering functions
import { NUM_CARDS_IN_RACK } from './game-core.js';

let heldCard = null;
let heldSource = null;
const floatingCardElement = document.getElementById('floating-card');
const floatingCardValueElement = floatingCardElement.querySelector('.card-value');

export const initUI = () => {
    document.addEventListener('mousemove', (e) => {
        if (heldCard) {
            floatingCardElement.style.left = e.clientX + 'px';
            floatingCardElement.style.top = e.clientY + 'px';
        }
    });
    document.getElementById('toggle-contrast').addEventListener('click', () => {
        document.body.classList.toggle('high-contrast');
    });
};

export const updateFloatingCard = (cardValue, source) => {
    heldCard = cardValue;
    heldSource = source;
    if (cardValue) {
        floatingCardValueElement.textContent = cardValue;
        floatingCardElement.classList.add('active');
    } else {
        floatingCardElement.classList.remove('active');
    }
};

export const clearFloatingCard = () => {
    updateFloatingCard(null, null);
};

export const renderLobby = (message = '') => {
    const codi = window.gameFunctions?.gameId || 'N/A';
    const savedName = localStorage.getItem('racko-player-name') || '';
    document.getElementById('game-status').innerHTML = '<span class="text-xl font-bold text-gray-800">Sala d\'Espera</span>';

    document.getElementById('game-container').innerHTML = `
        <div>Codi de Partida (4 Dígits per Compartir): <span>${codi}</span></div>
        ${message ? `<div>${message}</div>` : ''}
        <div class="p-6 bg-white rounded-xl shadow-lg w-full max-w-lg mx-auto">
            <h3 class="text-xl font-bold mb-4 text-indigo-600">El Teu Nom</h3>
            <p class="mb-2 text-sm text-gray-700">Com vols que et vegin els altres jugadors? (2-15 caràcters)</p>
            <input type="text" id="player-name-input" maxlength="15" placeholder="Escriu el teu nom de jugador"
                   value="${savedName}"
                   class="w-full p-3 border-2 border-indigo-300 rounded-lg mb-6 focus:ring-indigo-500 focus:border-indigo-500 text-center text-xl font-semibold">
            <h3 class="text-2xl font-bold mb-4 text-indigo-600">Unir-se a Partida</h3>
            <p class="mb-2 text-sm text-gray-700">Introdueix el codi numèric de <span class="font-bold">4 dígits</span> de la partida existent.</p>
            <input type="text" id="join-game-input" maxlength="4" placeholder="Codi de 4 dígits (Ex: 1234)"
                   class="w-full p-3 border border-gray-300 rounded-lg mb-4 focus:ring-indigo-500 focus:border-indigo-500 text-center text-xl font-mono tracking-widest">
            <button id="join-button" class="w-full py-3 bg-indigo-500 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-300 mb-8">
                Unir-se
            </button>
            <h3 class="text-2xl font-bold mb-4 text-indigo-600">Crear Partida</h3>
            <p class="mb-4 text-gray-700">Selecciona el nombre de jugadors per començar. Es generarà un codi de <span class="font-bold text-red-600">4 dígits</span>.</p>
            <div class="flex justify-around space-x-4">
                ${[2, 3, 4].map(n => `
                    <button onclick="window.gameFunctions.createGame(${n}, document.getElementById('player-name-input').value)"
                            class="flex-1 py-3 px-4 bg-purple-500 text-white font-semibold rounded-lg shadow-md hover:bg-purple-700 transition duration-300">
                        ${n} Jugadors<br><small>(Cartes 1-${n === 2 ? 40 : n === 3 ? 50 : 60})</small>
                    </button>
                `).join('')}
            </div>
            ${message ? `<p class="mt-4 text-sm text-red-600 font-semibold">${message}</p>` : ''}
            <div class="mt-6 border-t pt-4">
                <button onclick="window.gameFunctions.resetLobbyState()"
                        class="w-full py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg shadow-md hover:bg-gray-300 transition duration-300 flex items-center justify-center">
                    <i data-lucide="rotate-ccw" class="w-4 h-4 mr-2"></i>
                    Reiniciar Connexió Local
                </button>
            </div>
        </div>
    `;
    document.getElementById('game-id-value').textContent = codi;
    const joinBtn = document.getElementById('join-button');
    if (joinBtn) {
        joinBtn.onclick = () => {
            if (typeof window.gameFunctions?.joinGame === 'function') {
                const code = document.getElementById('join-game-input').value;
                const name = document.getElementById('player-name-input').value;
                window.gameFunctions.joinGame(code, name);
            } else {
                alert('Error intern: la funció unió no està disponible (recarrega la pàgina o actualitza el codi de game-logic.js)');
                console.error('window.gameFunctions:', window.gameFunctions);
            }
        };
    }
    document.getElementById('game-active-area').classList.add('hidden');
    document.getElementById('custom-modal').classList.add('hidden');
    lucide.createIcons();
};

export const renderGame = (game, userId, isMyTurn, getMyPlayer, getNextPlayerId) => {
    // No buidis el game-active-area, només mostra/actualitza!
    if (game.status === 'lobby') {
        document.getElementById('game-active-area').classList.add('hidden');
        document.getElementById('game-container').innerHTML = renderLobbyContent(game, userId);
        return;
    }
    document.getElementById('game-active-area').classList.remove('hidden');
    updateGameStatus(game, userId);
    renderDrawPileAndDiscard(game, isMyTurn, heldCard);
    renderActionArea(game, userId, isMyTurn, heldCard, heldSource);
    renderRack(game, userId, isMyTurn, heldCard);
    renderPlayerScores(game, userId, isMyTurn);
    lucide.createIcons();
};

// La resta de helpers originals (updateGameStatus, renderDrawPileAndDiscard, renderActionArea, renderRack, renderPlayerScores).
// ... no s'han de modificar si ja et funcionaven/eren correctes.

export { heldCard, heldSource };
