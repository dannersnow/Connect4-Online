const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createGame,
  createBoard,
  getDropRow,
  findWinningCells,
  makeMove
} = require("../server/game");

test("creates an empty 6 by 7 board", () => {
  const board = createBoard();
  assert.equal(board.length, 6);
  assert.ok(board.every((row) => row.length === 7));
  assert.ok(board.flat().every((cell) => cell === null));
});

test("drops pieces from the bottom of a column", () => {
  const game = createGame();
  makeMove(game, 3, 1);
  assert.equal(game.board[5][3], 1);
  makeMove(game, 3, 2);
  assert.equal(game.board[4][3], 2);
});

test("rejects moves outside turn and full columns", () => {
  const game = createGame();
  assert.equal(makeMove(game, 2, 2).ok, false);
  for (let index = 0; index < 6; index += 1) {
    const player = game.currentPlayer;
    makeMove(game, 0, player);
  }
  assert.equal(makeMove(game, 0, game.currentPlayer).ok, false);
  assert.equal(makeMove(game, 1, game.currentPlayer).ok, true);
});

test("detects a horizontal win", () => {
  const game = createGame();
  [0, 0, 1, 1, 2, 2, 3].forEach((column) => {
    makeMove(game, column, game.currentPlayer);
  });
  assert.equal(game.status, "won");
  assert.equal(game.winner, 1);
  assert.equal(findWinningCells(game.board, 1).length, 4);
});

test("detects a vertical win", () => {
  const game = createGame();
  [0, 1, 0, 1, 0, 1, 0].forEach((column) => {
    makeMove(game, column, game.currentPlayer);
  });
  assert.equal(game.status, "won");
  assert.equal(game.winner, 1);
});

test("returns no drop row for a full or invalid column", () => {
  const board = createBoard();
  assert.equal(getDropRow(board, 7), -1);
  assert.equal(getDropRow(board, -1), -1);
  for (let row = 0; row < 6; row += 1) board[row][2] = 1;
  assert.equal(getDropRow(board, 2), -1);
});
