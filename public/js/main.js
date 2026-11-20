const socket = io();

const lobby = document.querySelector("#lobby");
const gameScreen = document.querySelector("#game");
const gameOver = document.querySelector("#game-over");
const boardElement = document.querySelector("#board");
const nameInput = document.querySelector("#player-name");
const codeInput = document.querySelector("#room-code");
const toast = document.querySelector("#toast");

let playerName = "";
let roomCode = "";
let currentRoom = null;

function showToast(message) {
  toast.textContent = message;
  toast.classList.remove("hidden");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add("hidden"), 2600);
}

async function api(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...options.headers }
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong.");
  return data;
}

async function createRoom() {
  playerName = nameInput.value.trim();
  if (!playerName) return showToast("Enter a player name.");
  try {
    const data = await api("/api/rooms", {
      method: "POST",
      body: JSON.stringify({ name: playerName })
    });
    roomCode = data.code;
    enterGame();
    socket.emit("join-room", { code: roomCode, name: playerName });
  } catch (error) {
    showToast(error.message);
  }
}

async function joinRoom() {
  playerName = nameInput.value.trim();
  roomCode = codeInput.value.trim().toUpperCase();
  if (!playerName) return showToast("Enter a player name.");
  if (!roomCode) return showToast("Enter a room code.");
  try {
    const data = await api(`/api/rooms/${encodeURIComponent(roomCode)}/join`, {
      method: "POST",
      body: JSON.stringify({ name: playerName })
    });
    roomCode = data.code;
    enterGame();
    socket.emit("join-room", { code: roomCode, name: playerName });
  } catch (error) {
    showToast(error.message);
  }
}

function enterGame() {
  lobby.classList.add("hidden");
  gameScreen.classList.remove("hidden");
  gameOver.classList.add("hidden");
  document.querySelector("#room-code-display").textContent = roomCode;
}

function leaveGame() {
  socket.emit("leave-room");
  currentRoom = null;
  gameOver.classList.add("hidden");
  gameScreen.classList.add("hidden");
  lobby.classList.remove("hidden");
  loadLeaderboard();
}

function renderRoom(room) {
  currentRoom = room;
  roomCode = room.code;
  document.querySelector("#room-code-display").textContent = room.code;

  const p1 = room.players.find((player) => player.playerNumber === 1);
  const p2 = room.players.find((player) => player.playerNumber === 2);
  document.querySelector("#player-one-name").textContent = p1 ? p1.name : "Waiting...";
  document.querySelector("#player-two-name").textContent = p2 ? p2.name : "Waiting...";
  document.querySelector("#player-one").classList.toggle("active", room.game.currentPlayer === 1 && room.game.status === "playing");
  document.querySelector("#player-two").classList.toggle("active", room.game.currentPlayer === 2 && room.game.status === "playing");

  renderBoard(room.game);
  updateTurnStatus(room);
  if (room.game.status !== "playing") showGameOver(room);
  else gameOver.classList.add("hidden");
}

function renderBoard(game) {
  boardElement.innerHTML = "";
  for (let row = 0; row < 6; row += 1) {
    for (let column = 0; column < 7; column += 1) {
      const cell = document.createElement("button");
      const value = game.board[row][column];
      cell.type = "button";
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.column = column;
      if (value) {
        cell.classList.add(value === 1 ? "red" : "yellow");
      }
      if (game.winningCells.some(([winRow, winColumn]) => winRow === row && winColumn === column)) {
        cell.classList.add("winning");
      }
      cell.addEventListener("click", () => socket.emit("make-move", { column }));
      boardElement.appendChild(cell);
    }
  }
}

function updateTurnStatus(room) {
  const status = document.querySelector("#turn-status");
  const p1 = room.players.find((player) => player.playerNumber === 1);
  const p2 = room.players.find((player) => player.playerNumber === 2);
  if (room.players.length < 2) {
    status.textContent = "Waiting for Player 2...";
  } else if (room.game.status === "playing") {
    const active = room.game.currentPlayer === 1 ? p1 : p2;
    status.textContent = active ? `${active.name}'s turn` : "Your turn";
  }
}

function showGameOver(room) {
  const title = document.querySelector("#result-title");
  const subtitle = document.querySelector("#result-subtitle");
  const token = document.querySelector("#result-token");
  if (room.game.status === "draw") {
    title.textContent = "It's a draw!";
    subtitle.textContent = "That board was a perfect standoff.";
    token.className = "result-token draw";
  } else {
    const winner = room.players.find((player) => player.playerNumber === room.game.winner);
    title.textContent = `${winner ? winner.name : "Player"} wins!`;
    subtitle.textContent = "Four in a row. Nice work.";
    token.className = `result-token ${room.game.winner === 1 ? "red" : "yellow"}`;
  }
  gameOver.classList.remove("hidden");
  loadLeaderboard();
}

async function loadLeaderboard() {
  try {
    const rows = await fetch("/api/leaderboard").then((response) => response.json());
    const leaderboard = document.querySelector("#leaderboard");
    if (!rows.length) {
      leaderboard.innerHTML = '<p class="muted">No games played yet.</p>';
      return;
    }
    leaderboard.innerHTML = rows.map((row, index) => `
      <div class="leaderboard-row">
        <span class="rank">${index + 1}</span>
        <strong>${escapeHtml(row.name)}</strong>
        <span>${row.wins} W <small>/ ${row.games} games</small></span>
      </div>
    `).join("");
  } catch (_error) {
    document.querySelector("#leaderboard").innerHTML = '<p class="muted">Leaderboard unavailable.</p>';
  }
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = value;
  return element.innerHTML;
}

document.querySelector("#create-room").addEventListener("click", createRoom);
document.querySelector("#join-room").addEventListener("click", joinRoom);
document.querySelector("#leave-game").addEventListener("click", leaveGame);
document.querySelector("#return-lobby").addEventListener("click", leaveGame);
document.querySelector("#copy-code").addEventListener("click", async () => {
  await navigator.clipboard.writeText(roomCode);
  showToast("Room code copied.");
});
document.querySelector("#play-again").addEventListener("click", () => {
  socket.emit("play-again");
  gameOver.classList.add("hidden");
});
document.querySelector("#show-leaderboard").addEventListener("click", () => {
  lobby.classList.remove("hidden");
  gameScreen.classList.add("hidden");
  gameOver.classList.add("hidden");
  loadLeaderboard();
});

nameInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") createRoom();
});
codeInput.addEventListener("input", () => {
  codeInput.value = codeInput.value.toUpperCase();
});
codeInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") joinRoom();
});

socket.on("room-update", renderRoom);
socket.on("game-start", renderRoom);
socket.on("game-update", renderRoom);
socket.on("room-error", (message) => showToast(message));
socket.on("move-error", (message) => showToast(message));

loadLeaderboard();
