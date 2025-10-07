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

export { heldCard, heldSource };

function renderLobbyContent(game, userId) {
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
}

function updateGameStatus(game, userId) {
    let statusText, statusColor;
    const isFinishedGame = game.status === 'finished';
    const isFinishedHand = game.status === 'finishedhand';
    const isMyTurn = game.turn === userId;
    if (isFinishedGame) {
        const finalWinner = game.players.find(p => p.id === game.winnerId);
        statusText = `JOC FINALITZAT! Guanyador: ${finalWinner?.name || 'Desconegut'} amb ${finalWinner?.score} punts.`;
        statusColor = 'bg-yellow-500 text-gray-900';
    } else if (isFinishedHand) {
        const winnerName = game.players.find(p => p.id === game.winnerId)?.name || 'Algú';
        statusText = `MÀ GUANYADA! ${winnerName} ha fet Rack-O!`;
        statusColor = 'bg-green-500 text-white';
    } else {
        const turnPlayer = game.players.find(p => p.id === game.turn);
        statusText = `Torn de ${turnPlayer?.name || 'Desconegut'}`;
        statusColor = isMyTurn ? 'bg-green-600 text-white' : 'bg-red-600 text-white';
    }
    document.getElementById('game-status').innerHTML = 
        `<span class="px-4 py-2 rounded-full font-bold ${statusColor} text-sm">${statusText}</span>`;
}

function renderDrawPileAndDiscard(game, isMyTurn, heldCard) {
    const isDeckEmpty = game.deck.length === 0;
    const drawPileElement = document.getElementById('draw-pile');
    let deckContent, drawPileClickAction, drawPileClickableClass = 'cursor-default';

    if (isDeckEmpty && isMyTurn && game.discardPile.length > 1) {
        deckContent = `
            <button onclick="window.gameFunctions.handleReshuffle()" 
                    class="w-full h-full bg-yellow-500 hover:bg-yellow-600 text-gray-900 font-bold text-sm p-1 rounded-lg flex flex-col items-center justify-center transition duration-200">
                <i data-lucide="shuffle" class="w-5 h-5 mb-1"></i>
                Barrejar Descartades
            </button>
        `;
        drawPileClickableClass = 'border-yellow-500 ring-2 ring-yellow-300';
    } else if (isDeckEmpty) {
        deckContent = '<div class="flex items-center justify-center w-full h-full text-sm text-gray-500 font-semibold">MUNT BUIT</div>';
        drawPileClickableClass = 'border-gray-400';
    } else {
        drawPileClickAction = isMyTurn && !heldCard ? 'window.gameFunctions.handleDrawCard(\"draw\")' : '';
        drawPileClickableClass = isMyTurn && !heldCard ? 'cursor-pointer hover:border-indigo-600' : 'cursor-default';
        deckContent = `
            <div class="card-back flex items-center justify-center rounded-lg w-full h-full text-2xl" 
                 ${drawPileClickAction ? `onclick="${drawPileClickAction}"` : ''}>
                <i data-lucide="layers"></i>
            </div>
        `;
    }
    drawPileElement.innerHTML = deckContent;
    drawPileElement.className = `w-20 h-32 border-4 rounded-lg transition duration-200 ${drawPileClickableClass}`;

    const discardCard = game.discardPile[game.discardPile.length - 1];
    const canDrawFromDiscard = isMyTurn && !heldCard && discardCard !== undefined;
    const canDiscardHeldCard = isMyTurn && heldCard && heldSource === 'draw' && game.status === 'playing';
    let discardClickAction, discardClickableClass;
    if (canDrawFromDiscard) {
        discardClickAction = 'window.gameFunctions.handleDrawCard(\"discard\")';
        discardClickableClass = 'cursor-pointer hover:border-green-600';
    } else if (canDiscardHeldCard) {
        discardClickAction = 'window.gameFunctions.handleDiscardHeldCard()';
        discardClickableClass = 'cursor-pointer hover:border-red-600 ring-4 ring-red-400';
    } else {
        discardClickableClass = 'cursor-default';
    }
    const discardContent = discardCard !== undefined ? 
        `<div class="card-value w-full h-full flex items-center justify-center text-4xl text-red-600">${discardCard}</div>` :
        '<div class="flex items-center justify-center w-full h-full text-lg text-gray-500">Buit</div>';
    const discardPileElement = document.getElementById('discard-pile');
    discardPileElement.innerHTML = discardContent;
    discardPileElement.className = `w-20 h-32 border-4 border-gray-400 rounded-lg transition duration-200 ${discardClickableClass}`;
    discardPileElement.setAttribute('onclick', discardClickAction || '');
    document.getElementById('draw-pile-count').textContent = game.deck.length;
}

function renderActionArea(game, userId, isMyTurn, heldCard, heldSource) {
    const isFinishedHand = game.status === 'finishedhand';
    const isFinishedGame = game.status === 'finished';
    const isCurrentTurn = isMyTurn && !isFinishedHand && !isFinishedGame;
    let actionHtml;
    if (isFinishedHand && game.winnerId === userId) {
        actionHtml = `
            <button onclick="window.gameFunctions.endHandAndScore()" 
                    class="w-full py-3 bg-yellow-500 text-gray-900 font-semibold rounded-lg shadow-md hover:bg-yellow-600 transition duration-300 flex items-center justify-center">
                <i data-lucide="trophy" class="mr-2"></i>
                Puntuar i Començar Nova Mà
            </button>
        `;
    } else if (isFinishedHand) {
        const winnerName = game.players.find(p => p.id === game.winnerId)?.name;
        actionHtml = `<p class="text-green-700 font-semibold p-2">Esperant que el guanyador (${winnerName}) puntuï la mà.</p>`;
    } else if (isFinishedGame) {
        actionHtml = `
            <button onclick="window.gameFunctions.resetLobbyState()" 
                    class="w-full py-3 bg-indigo-500 text-white font-semibold rounded-lg shadow-md hover:bg-indigo-700 transition duration-300 flex items-center justify-center">
                <i data-lucide="refresh-cw" class="mr-2"></i>
                Tornar al Lobby
            </button>
        `;
    } else if (isCurrentTurn && heldCard) {
        if (heldSource === 'draw') {
            actionHtml = `
                <div class="p-2 border border-blue-200 rounded-lg bg-blue-50">
                    <p class="text-base font-semibold text-blue-700">Has agafat la carta <span class="text-xl text-red-600 font-extrabold">${heldCard}</span> del munt.</p>
                    <p class="text-sm text-blue-800 font-bold mt-1">OPCIONS: 1. Clica la Pila de Descarts per descartar, O 2. Clica una ranura per reemplaçar.</p>
                </div>
            `;
        } else {
            actionHtml = `
                <div class="p-2 border border-blue-200 rounded-lg bg-blue-50">
                    <p class="text-base font-semibold text-blue-700">Has agafat la carta <span class="text-xl text-red-600 font-extrabold">${heldCard}</span> del descart.</p>
                    <p class="text-sm text-red-800 font-bold mt-1">ACCIÓ REQUERIDA: Has de reemplaçar una ranura del teu atril.</p>
                </div>
            `;
        }
    } else if (isCurrentTurn) {
        actionHtml = `
            <p class="text-lg font-bold text-green-700 p-2 border border-green-200 rounded-lg bg-green-100">
                <i data-lucide="bell" class="w-5 h-5 inline mr-1 animate-pulse"></i>
                És el teu torn! Tria del munt o del descart.
            </p>
        `;
    } else {
        const turnPlayerName = game.players.find(p => p.id === game.turn)?.name || 'Algú';
        actionHtml = `
            <p class="text-lg font-bold text-orange-700 p-2 border border-orange-200 rounded-lg bg-orange-50">
                <i data-lucide="loader-2" class="w-5 h-5 inline mr-1 animate-spin"></i>
                Esperant el torn de ${turnPlayerName}...
            </p>
        `;
    }
    document.getElementById('action-area').innerHTML = actionHtml;
}

function renderRack(game, userId, isMyTurn, heldCard) {
    const myPlayer = game.players.find(p => p.id === userId);
    if (!myPlayer) return;
    const rackElement = document.getElementById('my-rack');
    const isCurrentTurn = isMyTurn && game.status === 'playing';
    rackElement.innerHTML = myPlayer.rack.map((card, index) => {
        const isPlayableSlot = isCurrentTurn && heldCard && card !== null && game.status === 'playing';
        const slotNumber = index + 1;
        const isSlotCorrect = index === 0 ? 
            (card !== null) : 
            (index === 0 || (card !== null && (myPlayer.rack[index - 1] !== null && card > myPlayer.rack[index - 1])));
        const slotNumberColorClass = isSlotCorrect ? 'text-green-600' : 'text-red-600';
        let cardHtml;
        if (card === null) {
            cardHtml = `<div class="card-slot not-playable">${slotNumber}</div>`;
        } else {
            cardHtml = `
                <div class="card-slot has-card ${isPlayableSlot ? 'can-replace' : ''} transition-all duration-300" 
                     ${isPlayableSlot ? `onclick="window.gameFunctions.handleReplaceCard(${index})"` : ''}>
                    <div class="card-value text-3xl">${card}</div>
                </div>
            `;
        }
        return `
            <div class="flex items-center space-x-2">
                <span class="text-sm font-bold w-6 text-right ${slotNumberColorClass}">${slotNumber}</span>
                <div class="flex-1">${cardHtml}</div>
            </div>
        `;
    }).join('');
}

function renderPlayerScores(game, userId, isMyTurn) {
    document.getElementById('all-players-score').innerHTML = game.players.map(p => {
        const isLocalPlayer = p.id === userId;
        const isPlayerTurn = p.id === game.turn;
        const cardClasses = isLocalPlayer ? 'bg-indigo-100 border-indigo-500' : 'bg-gray-100 border-gray-300';
        const canRemoteBeep = isPlayerTurn && !isLocalPlayer;
        const turnRing = isPlayerTurn ? 'ring-4 ring-yellow-500' : '';
        const clickClasses = canRemoteBeep ? 'hover:ring-8 transition duration-150 cursor-pointer' : 'cursor-default';
        const clickAction = canRemoteBeep ? `onclick="window.gameFunctions.triggerRemoteBeep('${p.id}')"` : '';
        return `
            <div class="p-3 rounded-xl border-2 shadow-sm ${cardClasses} ${turnRing} ${clickClasses}" ${clickAction}>
                <p class="font-bold text-lg flex items-center">
                    ${p.name}${isLocalPlayer ? ' (Tu)' : ''}
                    ${canRemoteBeep ? '<i data-lucide="volume-2" class="w-4 h-4 ml-2 text-yellow-600"></i>' : ''}
                    ${isPlayerTurn ? '<i data-lucide="star" class="w-4 h-4 ml-2 text-yellow-600 fill-yellow-400"></i>' : ''}
                </p>
                <p class="text-sm text-gray-800 font-semibold">
                    Puntuació Total: <span class="text-xl text-indigo-700">${p.score}</span>
                </p>
                <p class="text-xs text-gray-500">
                    Última Puntuació: ${p.scoreHistory[p.scoreHistory.length - 1] || 0}
                </p>
            </div>
        `;
    }).join('');
}
