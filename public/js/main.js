const socket = io();

const lobby = document.querySelector('#lobby');
const gameScreen = document.querySelector('#game');
const gameOver = document.querySelector('#game-over');
const instructionsModal = document.querySelector('#instructions-modal');
const boardElement = document.querySelector('#board');
const nameInput = document.querySelector('#player-name');
const codeInput = document.querySelector('#room-code');
const toast = document.querySelector('#toast');
const roomCodeDisplay = document.querySelector('#room-code-display');
const playerOne = document.querySelector('#player-one');
const playerTwo = document.querySelector('#player-two');
const playerOneName = document.querySelector('#player-one-name');
const playerTwoName = document.querySelector('#player-two-name');
const turnStatus = document.querySelector('#turn-status');
const moveCounter = document.querySelector('#move-counter');
const leaderboard = document.querySelector('#leaderboard');
const resultTitle = document.querySelector('#result-title');
const resultSubtitle = document.querySelector('#result-subtitle');
const resultToken = document.querySelector('#result-token');

const boardCells = Array.from({ length: 42 }, (_, index) => {
  const cell = document.createElement('button');
  cell.type = 'button';
  cell.className = 'cell';
  cell.setAttribute('role', 'gridcell');
  cell.dataset.column = String(index % 7);
  cell.addEventListener('click', () =>
    socket.emit('make-move', { column: Number(cell.dataset.column) })
  );
  boardElement.appendChild(cell);
  return cell;
});

let playerName = '';
let roomCode = '';
let currentRoom = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add('hidden'), 2600);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Something went wrong.');
  return data;
}

async function createRoom() {
  playerName = nameInput.value.trim();
  if (!playerName) return showToast('Enter a player name.');
  try {
    const data = await api('/api/rooms', {
      method: 'POST',
      body: JSON.stringify({ name: playerName }),
    });
    roomCode = data.code;
    enterGame();
    socket.emit('join-room', { code: roomCode, name: playerName });
  } catch (error) {
    showToast(error.message);
  }
}

async function joinRoom() {
  playerName = nameInput.value.trim();
  roomCode = codeInput.value.trim().toUpperCase();
  if (!playerName) return showToast('Enter a player name.');
  if (!roomCode) return showToast('Enter a room code.');
  try {
    const data = await api(`/api/rooms/${encodeURIComponent(roomCode)}/join`, {
      method: 'POST',
      body: JSON.stringify({ name: playerName }),
    });
    roomCode = data.code;
    enterGame();
    socket.emit('join-room', { code: roomCode, name: playerName });
  } catch (error) {
    showToast(error.message);
  }
}

function enterGame() {
  lobby.classList.add('hidden');
  gameScreen.classList.remove('hidden');
  gameOver.classList.add('hidden');
  roomCodeDisplay.textContent = roomCode;
}

function leaveGame() {
  socket.emit('leave-room');
  currentRoom = null;
  gameOver.classList.add('hidden');
  gameScreen.classList.add('hidden');
  lobby.classList.remove('hidden');
  loadLeaderboard();
}

function renderRoom(room) {
  currentRoom = room;
  roomCode = room.code;
  roomCodeDisplay.textContent = room.code;

  const p1 = room.players.find((player) => player.playerNumber === 1);
  const p2 = room.players.find((player) => player.playerNumber === 2);
  playerOneName.textContent = p1 ? p1.name : 'Waiting...';
  playerTwoName.textContent = p2 ? p2.name : 'Waiting...';
  playerOne.classList.toggle(
    'active',
    room.game.currentPlayer === 1 && room.game.status === 'playing'
  );
  playerTwo.classList.toggle(
    'active',
    room.game.currentPlayer === 2 && room.game.status === 'playing'
  );

  renderBoard(room.game);
  updateTurnStatus(room);
  moveCounter.textContent = `Moves: ${room.game.moveCount}`;
  if (room.game.status !== 'playing') showGameOver(room);
  else gameOver.classList.add('hidden');
}

function renderBoard(game) {
  const winningCells = new Set(
    game.winningCells.map(([row, column]) => `${row}:${column}`)
  );

  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      const cell = boardCells[row * 7 + column];
      const value = game.board[row][column];
      cell.className = 'cell';
      if (value) {
        cell.classList.add(value === 1 ? 'red' : 'yellow');
      }
      if (winningCells.has(`${row}:${column}`)) {
        cell.classList.add('winning');
      }
    }
  }
}

function updateTurnStatus(room) {
  const p1 = room.players.find((player) => player.playerNumber === 1);
  const p2 = room.players.find((player) => player.playerNumber === 2);
  if (room.players.length < 2) {
    turnStatus.textContent = 'Waiting for Player 2...';
  } else if (room.game.status === 'playing') {
    const active = room.game.currentPlayer === 1 ? p1 : p2;
    turnStatus.textContent = active ? `${active.name}'s turn` : 'Your turn';
  }
}

function showGameOver(room) {
  if (room.game.status === 'draw') {
    resultTitle.textContent = "It's a draw!";
    resultSubtitle.textContent = 'That board was a perfect standoff.';
    resultToken.className = 'result-token draw';
  } else {
    const winner = room.players.find(
      (player) => player.playerNumber === room.game.winner
    );
    resultTitle.textContent = `${winner ? winner.name : 'Player'} wins!`;
    resultSubtitle.textContent = 'Four in a row. Nice work.';
    resultToken.className = `result-token ${
      room.game.winner === 1 ? 'red' : 'yellow'
    }`;
  }
  gameOver.classList.remove('hidden');
  loadLeaderboard();
}

async function loadLeaderboard() {
  try {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) throw new Error('Leaderboard unavailable.');
    const rows = await response.json();
    if (!rows.length) {
      leaderboard.innerHTML = '<p class="muted">No games played yet.</p>';
      return;
    }
    leaderboard.innerHTML = rows
      .map(
        (row, index) => `
      <div class="leaderboard-row">
        <span class="rank">${index + 1}</span>
        <strong>${escapeHtml(row.name)}</strong>
        <span>${row.wins} W <small>/ ${row.games} games</small></span>
      </div>
    `
      )
      .join('');
  } catch (_error) {
    leaderboard.innerHTML = '<p class="muted">Leaderboard unavailable.</p>';
  }
}

function escapeHtml(value) {
  const element = document.createElement('div');
  element.textContent = value;
  return element.innerHTML;
}
document.querySelector('#how-to-play').addEventListener('click', () => {
  instructionsModal.classList.remove('hidden');
});
document.querySelector('#how-to-play-game').addEventListener('click', () => {
  instructionsModal.classList.remove('hidden');
});
document.querySelector('#close-instructions').addEventListener('click', () => {
  instructionsModal.classList.add('hidden');
});
document.querySelector('#create-room').addEventListener('click', createRoom);
document.querySelector('#join-room').addEventListener('click', joinRoom);
document.querySelector('#leave-game').addEventListener('click', leaveGame);
document.querySelector('#return-lobby').addEventListener('click', leaveGame);
document.querySelector('#copy-code').addEventListener('click', async () => {
  await navigator.clipboard.writeText(roomCode);
  showToast('Room code copied.');
});
document.querySelector('#play-again').addEventListener('click', () => {
  socket.emit('play-again');
  gameOver.classList.add('hidden');
});
document.querySelector('#show-leaderboard').addEventListener('click', () => {
  lobby.classList.remove('hidden');
  gameScreen.classList.add('hidden');
  gameOver.classList.add('hidden');
  loadLeaderboard();
});

nameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') createRoom();
});
codeInput.addEventListener('input', () => {
  codeInput.value = codeInput.value.toUpperCase();
});
codeInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') joinRoom();
});

socket.on('room-update', renderRoom);
socket.on('game-start', renderRoom);
socket.on('game-update', renderRoom);
socket.on('room-error', (message) => showToast(message));
socket.on('move-error', (message) => showToast(message));

loadLeaderboard();
