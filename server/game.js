const ROWS = 6;
const COLS = 7;

function createBoard() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(null));
}

function createGame() {
  return {
    board: createBoard(),
    currentPlayer: 1,
    status: "playing",
    winner: null,
    winningCells: [],
    moveCount: 0
  };
}

function getDropRow(board, column) {
  if (!Number.isInteger(column) || column < 0 || column >= COLS) return -1;
  for (let row = ROWS - 1; row >= 0; row -= 1) {
    if (board[row][column] === null) return row;
  }
  return -1;
}

function findWinningCells(board, player) {
  const directions = [[0, 1], [1, 0], [1, 1], [1, -1]];
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      if (board[row][col] !== player) continue;
      for (const [rowStep, colStep] of directions) {
        const cells = [];
        for (let step = 0; step < 4; step += 1) {
          const nextRow = row + rowStep * step;
          const nextCol = col + colStep * step;
          if (
            nextRow < 0 || nextRow >= ROWS ||
            nextCol < 0 || nextCol >= COLS ||
            board[nextRow][nextCol] !== player
          ) break;
          cells.push([nextRow, nextCol]);
        }
        if (cells.length === 4) return cells;
      }
    }
  }
  return [];
}

function makeMove(game, column, player) {
  if (game.status !== "playing") return { ok: false, error: "The game is over." };
  if (game.currentPlayer !== player) return { ok: false, error: "It is not your turn." };

  const row = getDropRow(game.board, column);
  if (row === -1) return { ok: false, error: "That column is full." };

  game.board[row][column] = player;
  game.moveCount += 1;

  const winningCells = findWinningCells(game.board, player);
  if (winningCells.length) {
    game.status = "won";
    game.winner = player;
    game.winningCells = winningCells;
  } else if (game.moveCount === ROWS * COLS) {
    game.status = "draw";
  } else {
    game.currentPlayer = player === 1 ? 2 : 1;
  }

  return { ok: true, row, column };
}

module.exports = {
  ROWS,
  COLS,
  createGame,
  createBoard,
  getDropRow,
  findWinningCells,
  makeMove
};
