/**
 * Sudoku Utility Functions
 */

export type Difficulty = 'Beginner' | 'Veteran' | 'Expert' | 'Insane' | 'Hell';

export const DIFFICULTY_LEVELS: Record<Difficulty, number> = {
  'Beginner': 35, // Numbers to remove
  'Veteran': 45,
  'Expert': 52,
  'Insane': 58,
  'Hell': 64
};

export type SudokuGrid = (number | null)[][];

/**
 * Generates a full 9x9 Sudoku grid
 */
export function generateFullGrid(): number[][] {
  const grid: number[][] = Array.from({ length: 9 }, () => Array(9).fill(0));
  
  function isValid(row: number, col: number, num: number): boolean {
    for (let x = 0; x < 9; x++) {
      if (grid[row][x] === num || grid[x][col] === num) return false;
    }
    
    const startRow = row - (row % 3);
    const startCol = col - (col % 3);
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 3; j++) {
        if (grid[i + startRow][j + startCol] === num) return false;
      }
    }
    return true;
  }

  function solve(): boolean {
    for (let row = 0; row < 9; row++) {
      for (let col = 0; col < 9; col++) {
        if (grid[row][col] === 0) {
          const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
          for (const num of nums) {
            if (isValid(row, col, num)) {
              grid[row][col] = num;
              if (solve()) return true;
              grid[row][col] = 0;
            }
          }
          return false;
        }
      }
    }
    return true;
  }

  solve();
  return grid;
}

/**
 * Creates a puzzle by removing numbers from a full grid
 */
export function createPuzzle(fullGrid: number[][], difficulty: Difficulty): SudokuGrid {
  const puzzle: SudokuGrid = fullGrid.map(row => [...row]);
  let attempts = DIFFICULTY_LEVELS[difficulty];
  
  while (attempts > 0) {
    const row = Math.floor(Math.random() * 9);
    const col = Math.floor(Math.random() * 9);
    if (puzzle[row][col] !== null) {
      puzzle[row][col] = null;
      attempts--;
    }
  }
  
  return puzzle;
}

/**
 * Checks if a value is valid in a given position
 */
export function isMoveValid(grid: SudokuGrid, row: number, col: number, num: number): boolean {
  // Check row
  for (let x = 0; x < 9; x++) {
    if (grid[row][x] === num) return false;
  }
  
  // Check column
  for (let x = 0; x < 9; x++) {
    if (grid[x][col] === num) return false;
  }
  
  // Check 3x3 box
  const startRow = row - (row % 3);
  const startCol = col - (col % 3);
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      if (grid[i + startRow][j + startCol] === num) return false;
    }
  }
  
  return true;
}
