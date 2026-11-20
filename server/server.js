const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const { createGame } = require("./game");
const { createSocketHandlers } = require("./socketHandlers");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const rooms = new Map();
const stats = new Map();

function makeRoomCode() {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code;
  do {
    code = Array.from({ length: 6 }, () =>
      characters[Math.floor(Math.random() * characters.length)]
    ).join("");
  } while (rooms.has(code));
  return code;
}

function getStats(name) {
  if (!stats.has(name)) {
    stats.set(name, { name, wins: 0, losses: 0, draws: 0, games: 0 });
  }
  return stats.get(name);
}

app.post("/api/rooms", (req, res) => {
  const name = String(req.body.name || "").trim().slice(0, 20);
  if (!name) return res.status(400).json({ error: "Enter a player name." });

  const code = makeRoomCode();
  const room = {
    code,
    players: [{ socketId: null, name, playerNumber: 1 }],
    game: createGame()
  };
  rooms.set(code, room);
  res.status(201).json({ code });
});

app.post("/api/rooms/:id/join", (req, res) => {
  const code = String(req.params.id).trim().toUpperCase();
  const name = String(req.body.name || "").trim().slice(0, 20);
  if (!name) return res.status(400).json({ error: "Enter a player name." });
  const room = rooms.get(code);
  if (!room) return res.status(404).json({ error: "Room not found." });
  if (room.players.length >= 2) return res.status(409).json({ error: "Room is full." });
  res.json({ code });
});

app.get("/api/leaderboard", (_req, res) => {
  const leaderboard = [...stats.values()]
    .sort((a, b) => b.wins - a.wins || b.games - a.games)
    .slice(0, 10);
  res.json(leaderboard);
});

io.on("connection", (socket) => {
  createSocketHandlers({ io, socket, rooms, stats, getStats });
});

const PORT = process.env.PORT || 3000;
if (require.main === module) {
  server.listen(PORT, () => {
    console.log(`Connect 4 server listening on http://localhost:${PORT}`);
  });
}

module.exports = { app, server, io, rooms, stats };
