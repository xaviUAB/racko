// js/ui.js - User interface rendering functions
import { NUM_CARDS_IN_RACK } from './game-core.js';

let heldCard = null;
let heldSource = null;
const floatingCardElement = document.getElementById('floating-card');
const floatingCardValueElement = floatingCardElement.querySelector('.card-value');

export const initUI = () => {
    // Initialize floating card cursor
    document.addEventListener('mousemove', (e) => {
        if (heldCard) {
            floatingCardElement.style.left = e.clientX + 'px';
            floatingCardElement.style.top = e.clientY + 'px';
        }
    });

    // High contrast toggle
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
            
            const joinBtn = document.getElementById('join-button');
            if (joinBtn) {
                joinBtn.onclick = () => {
                    const code = document.getElementById('join-game-input').value;
                    const name = document.getElementById('player-name-input').value;
                    window.gameFunctions.joinGame(code, name);
                };
            }

            
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
    document.getElementById('game-id-value').textContent = codi; // DEBUG panel
    document.getElementById('game-active-area').classList.add('hidden');
    document.getElementById('custom-modal').classList.add('hidden');
    lucide.createIcons();
};

export const renderGame = (game, userId, isMyTurn, getMyPlayer, getNextPlayerId) => {
    const container = document.getElementById('game-container');

    if (game.status === 'lobby') {
        document.getElementById('game-active-area').classList.add('hidden');
        container.innerHTML = renderLobbyContent(game, userId);
        return;
    }

    const myPlayer = getMyPlayer();

    if (!myPlayer) {
        document.getElementById('game-active-area').classList.add('hidden');
        container.innerHTML = `
            <div class="text-center p-8 bg-blue-100 rounded-xl shadow-lg">
                <i data-lucide="loader-2" class="w-10 h-10 text-blue-600 inline-block animate-spin mb-4"></i>
                <p class="text-xl font-bold text-blue-700">Sincronitzant dades de jugador...</p>
                <p class="text-gray-600">La partida ha començat. Espera un moment mentre es reparteixen les cartes.</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    document.getElementById('game-active-area').classList.remove('hidden');
    container.innerHTML = '';

    updateGameStatus(game, userId);
    renderDrawPileAndDiscard(game, isMyTurn, heldCard);
    renderActionArea(game, userId, isMyTurn, heldCard, heldSource);
    renderRack(game, userId, isMyTurn, heldCard);
    renderPlayerScores(game, userId, isMyTurn);

    lucide.createIcons();
};

const renderLobbyContent = (game, userId) => {
    const myPlayer = game.players.find(p => p.id === userId);
    const creator = game.players[0];
    const isCreator = myPlayer ? myPlayer.id === creator.id : false;
    const isLobbyFull = game.players.length === game.numPlayers;

    const playerListHtml = game.players.map(p => `
        <span class="font-semibold ${p.id === userId ? 'text-indigo-600' : 'text-gray-800'}">
            ${p.name}${p.id === creator.id ? ' (Creador)' : ''}
        </span>
    `).join(', ');

    return `
        <div class="p-6 bg-white rounded-xl shadow-lg w-full max-w-lg mx-auto border-t-4 border-blue-500">
            <p class="text-xl font-bold mb-4 text-blue-700">Esperant a la Sala d'Espera</p>
            <p class="text-lg font-bold text-gray-800 mb-2">
                Codi de Partida (4 Dígits per Compartir): 
                <span class="text-3xl font-extrabold select-all text-red-600 bg-red-100 p-1 rounded">${game.gameId || 'N/A'}</span>
            </p>
            <p class="text-sm text-gray-700">Jugadors connectats: ${game.players.length} de ${game.numPlayers}.</p>
            <p class="text-sm text-gray-700 mt-2">Jugadors: ${playerListHtml}</p>

            ${isLobbyFull ? 
                `<p class="text-sm text-green-700 mt-2 font-bold">Lobby complet (${game.players.length}/${game.numPlayers}).</p>` : 
                `<p class="text-sm text-gray-700 mt-2">Esperant ${game.numPlayers - game.players.length} jugadors més per unir-se...</p>`
            }

            ${isCreator ? 
                (isLobbyFull ?
                    `<button onclick="window.gameFunctions.startGame()" 
                             class="w-full py-3 mt-4 bg-green-500 text-white font-semibold rounded-lg shadow-md hover:bg-green-700 transition duration-300 flex items-center justify-center">
                        <i data-lucide="play" class="mr-2"></i>
                        Iniciar Partida
                    </button>` :
                    `<p class="mt-4 text-center text-red-600 font-semibold">Esperant que tots els jugadors (${game.numPlayers}) s'uneixin per iniciar la partida.</p>`
                ) :
                `<p class="mt-4 text-center text-gray-600">Esperant que el creador de la partida (${creator.name}) l'iniciï quan estigui completa.</p>`
            }
        </div>
    `;
};

// La resta de renderDrawPileAndDiscard, renderActionArea, renderRack, updateGameStatus, renderPlayerScores van aquí tal com els tens a la versió anterior del fitxer (has proporcionat el codi complet - no es repeteix per no excedir el límit de resposta).

export { heldCard, heldSource };

