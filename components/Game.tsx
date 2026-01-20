// components/Game.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { sdk } from '@farcaster/miniapp-sdk';
import styles from './Game.module.css';

const GRID_SIZE = 8;
const CRYSTAL_TYPES = ['💎', '⭐', '🔶', '💠', '🌟', '🔷'];
const INITIAL_MOVES = 30;
const POINTS_PER_MATCH = 10;

type Cell = string | null;
type Grid = Cell[][];

interface GameState {
  grid: Grid;
  score: number;
  moves: number;
  level: number;
  selectedCell: { row: number; col: number } | null;
  combo: number;
  gameOver: boolean;
  animatingCells: Set<string>;
  fallingCells: Map<string, number>; // key: "row,col", value: fallDistance
  matchedCells: Set<string>; // ячейки которые исчезают
  swappingCells: Map<string, { fromRow: number; fromCol: number; toRow: number; toCol: number }>; // анимация свапа
}

export default function Game() {
  const [gameState, setGameState] = useState<GameState>({
    grid: [],
    score: 0,
    moves: INITIAL_MOVES,
    level: 1,
    selectedCell: null,
    combo: 0,
    gameOver: false,
    animatingCells: new Set(),
    fallingCells: new Map(),
    matchedCells: new Set(),
    swappingCells: new Map(),
  });

  const [showCombo, setShowCombo] = useState<number>(0);

  const getRandomCrystal = (): string => {
    return CRYSTAL_TYPES[Math.floor(Math.random() * CRYSTAL_TYPES.length)];
  };

  const createInitialGrid = useCallback((): Grid => {
    const grid: Grid = [];
    for (let row = 0; row < GRID_SIZE; row++) {
      grid[row] = [];
      for (let col = 0; col < GRID_SIZE; col++) {
        grid[row][col] = getRandomCrystal();
      }
    }
    return grid;
  }, []);

  const checkMatches = useCallback((grid: Grid): Array<{ row: number; col: number; type: string; length: number }> => {
    const matches: Array<{ row: number; col: number; type: string; length: number }> = [];

    // Horizontal matches
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE - 2; col++) {
        const crystal = grid[row][col];
        if (crystal && crystal === grid[row][col + 1] && crystal === grid[row][col + 2]) {
          let length = 3;
          while (col + length < GRID_SIZE && grid[row][col + length] === crystal) {
            length++;
          }
          matches.push({ row, col, type: 'horizontal', length });
        }
      }
    }

    // Vertical matches
    for (let col = 0; col < GRID_SIZE; col++) {
      for (let row = 0; row < GRID_SIZE - 2; row++) {
        const crystal = grid[row][col];
        if (crystal && crystal === grid[row + 1][col] && crystal === grid[row + 2][col]) {
          let length = 3;
          while (row + length < GRID_SIZE && grid[row + length][col] === crystal) {
            length++;
          }
          matches.push({ row, col, type: 'vertical', length });
        }
      }
    }

    return matches;
  }, []);

  const removeMatches = useCallback((grid: Grid, matches: Array<{ row: number; col: number; type: string; length: number }>): Grid => {
    const newGrid = grid.map(row => [...row]);
    const cellsToRemove = new Set<string>();

    matches.forEach(match => {
      if (match.type === 'horizontal') {
        for (let i = 0; i < match.length; i++) {
          cellsToRemove.add(`${match.row},${match.col + i}`);
        }
      } else {
        for (let i = 0; i < match.length; i++) {
          cellsToRemove.add(`${match.row + i},${match.col}`);
        }
      }
    });

    cellsToRemove.forEach(key => {
      const [row, col] = key.split(',').map(Number);
      newGrid[row][col] = null;
    });

    return newGrid;
  }, []);

  const fillGrid = useCallback((grid: Grid): { newGrid: Grid; falling: Map<string, number> } => {
    const newGrid = grid.map(row => [...row]);
    const falling = new Map<string, number>();

    // Drop existing crystals and track falling distance
    for (let col = 0; col < GRID_SIZE; col++) {
      let emptyRow = GRID_SIZE - 1;
      for (let row = GRID_SIZE - 1; row >= 0; row--) {
        if (newGrid[row][col]) {
          if (row !== emptyRow) {
            const fallDistance = emptyRow - row;
            falling.set(`${emptyRow},${col}`, fallDistance);
            newGrid[emptyRow][col] = newGrid[row][col];
            newGrid[row][col] = null;
          }
          emptyRow--;
        }
      }
    }

    // Fill empty spaces from top
    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        if (!newGrid[row][col]) {
          newGrid[row][col] = getRandomCrystal();
          falling.set(`${row},${col}`, row + 1); // падает с верха
        }
      }
    }

    return { newGrid, falling };
  }, []);

  const initGame = useCallback(() => {
    let grid = createInitialGrid();
    
    // Remove initial matches
    let matches = checkMatches(grid);
    while (matches.length > 0) {
      grid = removeMatches(grid, matches);
      const result = fillGrid(grid);
      grid = result.newGrid;
      matches = checkMatches(grid);
    }

    setGameState({
      grid,
      score: 0,
      moves: INITIAL_MOVES,
      level: 1,
      selectedCell: null,
      combo: 0,
      gameOver: false,
      animatingCells: new Set(),
      fallingCells: new Map(),
      matchedCells: new Set(),
      swappingCells: new Map(),
    });
  }, [createInitialGrid, checkMatches, removeMatches, fillGrid]);

  useEffect(() => {
    initGame();
  }, [initGame]);

  const handleCellClick = (row: number, col: number) => {
    if (gameState.moves <= 0 || gameState.gameOver) return;

    if (!gameState.selectedCell) {
      setGameState(prev => ({ ...prev, selectedCell: { row, col } }));
    } else {
      const { row: r1, col: c1 } = gameState.selectedCell;
      const isAdjacent =
        (Math.abs(row - r1) === 1 && col === c1) ||
        (Math.abs(col - c1) === 1 && row === r1);

      if (isAdjacent) {
        swapCells(r1, c1, row, col);
      }
      setGameState(prev => ({ ...prev, selectedCell: null }));
    }
  };

  const swapCells = (r1: number, c1: number, r2: number, c2: number) => {
    // Сначала проверяем будет ли валидный матч
    const testGrid = gameState.grid.map(row => [...row]);
    const temp = testGrid[r1][c1];
    testGrid[r1][c1] = testGrid[r2][c2];
    testGrid[r2][c2] = temp;
    const matches = checkMatches(testGrid);

    // Фаза 1: Анимация перемещения ВПЕРЕД (grid НЕ меняется)
    const swappingForward = new Map<string, { fromRow: number; fromCol: number; toRow: number; toCol: number }>();
    swappingForward.set(`${r1},${c1}`, { fromRow: r1, fromCol: c1, toRow: r2, toCol: c2 });
    swappingForward.set(`${r2},${c2}`, { fromRow: r2, fromCol: c2, toRow: r1, toCol: c1 });

    setGameState(prev => ({ 
      ...prev, 
      swappingCells: swappingForward,
    }));

    // После анимации вперед
    setTimeout(() => {
      if (matches.length > 0) {
        // ✅ ВАЛИДНЫЙ ХОД
        // Применяем изменения в grid и убираем анимацию
        setGameState(prev => ({ 
          ...prev, 
          grid: testGrid, // Теперь grid действительно изменен
          swappingCells: new Map(),
          moves: prev.moves - 1, 
          combo: 0 
        }));
        
        setTimeout(() => {
          processMatches(testGrid, matches);
        }, 50);
        
      } else {
        // ❌ НЕВАЛИДНЫЙ ХОД
        // Фаза 2: Анимация возврата НАЗАД
        // Grid все еще в исходном состоянии, но визуально фигуры "на других местах"
        // Поэтому анимируем возврат обратно
        const swappingBackward = new Map<string, { fromRow: number; fromCol: number; toRow: number; toCol: number }>();
        // Возвращаем: r1 идет из позиции r2 обратно на r1
        swappingBackward.set(`${r1},${c1}`, { fromRow: r2, fromCol: c2, toRow: r1, toCol: c1 });
        // Возвращаем: r2 идет из позиции r1 обратно на r2
        swappingBackward.set(`${r2},${c2}`, { fromRow: r1, fromCol: c1, toRow: r2, toCol: c2 });
        
        setGameState(prev => ({ ...prev, swappingCells: swappingBackward }));
        
        // После анимации возврата
        setTimeout(() => {
          // Убираем анимацию, grid остается в исходном состоянии
          setGameState(prev => ({ ...prev, swappingCells: new Map() }));
        }, 400);
      }
    }, 400);
  };

  const processMatches = (grid: Grid, matches: Array<{ row: number; col: number; type: string; length: number }>) => {
    // Определяем какие ячейки исчезают
    const cellsToRemove = new Set<string>();
    matches.forEach(match => {
      if (match.type === 'horizontal') {
        for (let i = 0; i < match.length; i++) {
          cellsToRemove.add(`${match.row},${match.col + i}`);
        }
      } else {
        for (let i = 0; i < match.length; i++) {
          cellsToRemove.add(`${match.row + i},${match.col}`);
        }
      }
    });

    // Показываем анимацию исчезновения
    setGameState(prev => ({ ...prev, matchedCells: cellsToRemove }));

    // Убираем кристаллы после анимации
    setTimeout(() => {
      let newGrid = removeMatches(grid, matches);
      
      setTimeout(() => {
        const { newGrid: filledGrid, falling } = fillGrid(newGrid);
        
        const points = matches.reduce((sum, match) => sum + match.length, 0) * POINTS_PER_MATCH;
        const newCombo = gameState.combo + 1;
        const comboBonus = newCombo > 1 ? newCombo * 5 : 0;
        
        setGameState(prev => ({
          ...prev,
          grid: filledGrid,
          score: prev.score + points + comboBonus,
          combo: newCombo,
          fallingCells: falling,
          matchedCells: new Set(),
        }));

        if (newCombo > 1) {
          setShowCombo(newCombo);
          setTimeout(() => setShowCombo(0), 1000);
        }

        // Убираем анимацию падения и проверяем новые матчи
        setTimeout(() => {
          setGameState(prev => ({ ...prev, fallingCells: new Map() }));
          
          setTimeout(() => {
            const newMatches = checkMatches(filledGrid);
            if (newMatches.length > 0) {
              processMatches(filledGrid, newMatches);
            } else {
              setGameState(prev => {
                const isGameOver = prev.moves <= 0;
                return { ...prev, combo: 0, gameOver: isGameOver };
              });
            }
          }, 100);
        }, 400); // длительность анимации падения
      }, 100);
    }, 500); // длительность анимации исчезновения
  };

  const resetGame = () => {
    initGame();
  };

  const shareScore = async () => {
    try {
      await sdk.actions.openUrl(
        `https://warpcast.com/~/compose?text=I scored ${gameState.score} points in Crystal Quest on Base! 💎🎮 Can you beat my score?`
      );
    } catch (error) {
      alert(`Your score: ${gameState.score} points! Share it with friends!`);
    }
  };

  return (
    <div className={styles.container}>
      {/* Animated Background */}
      <div className={styles.bgGrid}></div>

      {/* Header */}
      <div className={styles.header}>
        <h1 className={styles.title}>💎 CRYSTAL QUEST</h1>
        <div className={styles.subtitle}>Match 3 on Base Chain</div>
      </div>

      {/* Score Panel */}
      <div className={styles.scorePanel}>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Score</div>
          <div className={styles.statValue}>{gameState.score}</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Moves</div>
          <div className={styles.statValue}>{gameState.moves}</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statLabel}>Level</div>
          <div className={styles.statValue}>{gameState.level}</div>
        </div>
      </div>

      {/* Game Board */}
      <div className={styles.gameBoard}>
        <div className={styles.grid}>
          {gameState.grid.map((row, rowIndex) =>
            row.map((crystal, colIndex) => {
              const key = `${rowIndex},${colIndex}`;
              const isSelected = gameState.selectedCell?.row === rowIndex &&
                                gameState.selectedCell?.col === colIndex;
              const isAnimating = gameState.animatingCells.has(key);
              const isMatched = gameState.matchedCells.has(key);
              const fallDistance = gameState.fallingCells.get(key) || 0;
              
              // Проверяем анимацию свапа
              const swapData = gameState.swappingCells.get(key);
              const isSwapping = swapData !== undefined;
              const offsetX = isSwapping ? (swapData.toCol - swapData.fromCol) * 100 : 0;
              const offsetY = isSwapping ? (swapData.toRow - swapData.fromRow) * 100 : 0;
              
              return (
                <div
                  key={key}
                  className={`${styles.cell} ${
                    isSelected ? styles.selected : ''
                  } ${isAnimating ? styles.swapping : ''} ${
                    isMatched ? styles.matched : ''
                  } ${
                    fallDistance > 0 ? styles.falling : ''
                  } ${
                    isSwapping ? styles.moving : ''
                  }`}
                  style={{
                    '--fall-distance': `${fallDistance * 60}px`,
                    '--swap-x': `${offsetX}%`,
                    '--swap-y': `${offsetY}%`,
                  } as React.CSSProperties}
                  onClick={() => handleCellClick(rowIndex, colIndex)}
                >
                  <span className={styles.crystal}>{crystal}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className={styles.actions}>
        <button onClick={resetGame} className={styles.button}>
          <span>🔄 Reset</span>
        </button>
        <button onClick={() => alert('HOW TO PLAY:\n\n1. Click two adjacent crystals to swap\n2. Match 3+ of the same crystal\n3. Build combos for bonus points!\n4. Complete matches before running out of moves\n\nBuilt on Base Chain 🚀')} className={styles.button}>
          <span>❓ Help</span>
        </button>
        <button onClick={shareScore} className={`${styles.button} ${styles.primaryBtn}`}>
          <span>🚀 Share on Base</span>
        </button>
      </div>

      {/* Combo Display */}
      {showCombo > 1 && (
        <div className={styles.comboDisplay}>
          {showCombo}x COMBO!
        </div>
      )}

      {/* Game Over Modal */}
      {gameState.gameOver && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            <h2 className={styles.modalTitle}>🎮 GAME OVER</h2>
            <div className={styles.finalScore}>{gameState.score}</div>
            <p className={styles.modalText}>
              Amazing play! Your score has been recorded on Base Chain.
            </p>
            <button onClick={resetGame} className={`${styles.button} ${styles.primaryBtn}`}>
              <span>Play Again</span>
            </button>
            <button onClick={shareScore} className={styles.button} style={{ marginTop: '10px' }}>
              <span>Share Score</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}