# Connect4-Online

A real-time two-player Connect 4 website built with Node.js, Express, Socket.IO, HTML, CSS, and JavaScript. Players can create a room, share a six-character code, and play together in their browsers.

## Features

- Real-time two-player gameplay
- Six-character room codes
- Red and yellow player pieces
- Horizontal, vertical, and diagonal win detection
- Draw detection and rematches
- Live leaderboard for wins, losses, and draws
- Copyable room codes

## Requirements

- Node.js
- npm

## Run locally

```bash
npm install
npm start
```

Open `http://localhost:3000` in two browser tabs or devices. Enter a player name, then create a room or join one with a room code.

For development with automatic server restarts:

```bash
npm run dev
```

## How to play

1. Player 1 creates a room and shares the room code.
2. Player 2 enters their name and the room code to join.
3. Players take turns choosing a column.
4. Pieces fall into the lowest available space.
5. The first player to connect four pieces horizontally, vertically, or diagonally wins.
6. The game is a draw if the board fills without a winner.

## Test

```bash
npm test
```

The tests cover board creation, piece placement, invalid moves, full columns, and win detection.

## Project structure

- `public/` — browser interface, styles, and client-side JavaScript
- `server/server.js` — Express server, API routes, rooms, and leaderboard
- `server/socketHandlers.js` — real-time room and game events
- `server/game.js` — board state and game rules
- `tests/game-test.js` — game logic tests

## Notes

Rooms and leaderboard scores are stored in memory and are reset when the server restarts.
