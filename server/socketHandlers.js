const { makeMove, createGame } = require("./game");

function publicRoom(room) {
  return {
    code: room.code,
    players: room.players.map(({ name, playerNumber }) => ({ name, playerNumber })),
    game: room.game
  };
}

function updateStats(room, stats, getStats) {
  const playerNames = room.players.map((player) => player.name);
  const p1 = getStats(playerNames[0]);
  const p2 = playerNames[1] ? getStats(playerNames[1]) : null;

  if (!p1 || room.game.status === "playing") return;

  if (room.game.status === "draw") {
    p1.draws += 1;
    p1.games += 1;
    if (p2) {
      p2.draws += 1;
      p2.games += 1;
    }
  } else {
    const winner = room.game.winner === 1 ? p1 : p2;
    const loser = room.game.winner === 1 ? p2 : p1;
    if (winner) {
      winner.wins += 1;
      winner.games += 1;
    }
    if (loser) {
      loser.losses += 1;
      loser.games += 1;
    }
  }
}

function createSocketHandlers({ io, socket, rooms, stats, getStats }) {
  socket.on("join-room", ({ code, name }) => {
    const roomCode = String(code || "").trim().toUpperCase();
    const room = rooms.get(roomCode);
    const playerName = String(name || "").trim().slice(0, 20);
    if (!room || !playerName) {
      socket.emit("room-error", "Room or player name is invalid.");
      return;
    }

    let player = room.players.find((entry) => entry.name === playerName);
    if (!player) {
      if (room.players.length >= 2) {
        socket.emit("room-error", "Room is full.");
        return;
      }
      player = { socketId: socket.id, name: playerName, playerNumber: 2 };
      room.players.push(player);
    } else if (!player.socketId) {
      player.socketId = socket.id;
    } else if (player.socketId !== socket.id) {
      socket.emit("room-error", "That player name is already in this room.");
      return;
    }

    socket.join(roomCode);
    socket.data.roomCode = roomCode;
    socket.data.playerName = playerName;
    socket.data.playerNumber = player.playerNumber;
    io.to(roomCode).emit("room-update", publicRoom(room));

    if (room.players.length === 2) {
      io.to(roomCode).emit("game-start", publicRoom(room));
    }
  });

  socket.on("make-move", ({ column }) => {
    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room) return;

    const result = makeMove(room.game, Number(column), socket.data.playerNumber);
    if (!result.ok) {
      socket.emit("move-error", result.error);
      return;
    }

    if (room.game.status !== "playing") {
      updateStats(room, stats, getStats);
    }
    io.to(roomCode).emit("game-update", publicRoom(room));
  });

  socket.on("play-again", () => {
    const roomCode = socket.data.roomCode;
    const room = rooms.get(roomCode);
    if (!room) return;
    room.game = createGame();
    io.to(roomCode).emit("game-update", publicRoom(room));
  });

  socket.on("leave-room", () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    socket.leave(roomCode);
    const room = rooms.get(roomCode);
    if (room) {
      const player = room.players.find((entry) => entry.name === socket.data.playerName);
      if (player) player.socketId = null;
      io.to(roomCode).emit("room-update", publicRoom(room));
    }
  });

  socket.on("disconnect", () => {
    const roomCode = socket.data.roomCode;
    if (!roomCode) return;
    const room = rooms.get(roomCode);
    if (!room) return;
    const player = room.players.find((entry) => entry.name === socket.data.playerName);
    if (player) player.socketId = null;
    io.to(roomCode).emit("room-update", publicRoom(room));
  });
}

module.exports = { createSocketHandlers, publicRoom };
