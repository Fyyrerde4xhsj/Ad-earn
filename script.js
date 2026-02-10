/**
 * SUDOKU PRO AI - FULL CORE ENGINE & UI CONTROLLER
 * Author: Senior Game Developer Portfolio
 * License: Production Ready
 */

class SudokuEngine {
    constructor() {
        this.board = Array(81).fill(0);
    }

    // Check if placing num at index is valid
    isValid(board, index, num) {
        const row = Math.floor(index / 9);
        const col = index % 9;
        const boxRow = Math.floor(row / 3) * 3;
        const boxCol = Math.floor(col / 3) * 3;

        for (let i = 0; i < 9; i++) {
            if (board[row * 9 + i] === num) return false;
            if (board[i * 9 + col] === num) return false;
            if (board[(boxRow + Math.floor(i / 3)) * 9 + (boxCol + i % 3)] === num) return false;
        }
        return true;
    }

    // Solve using Backtracking
    solve(board) {
        for (let i = 0; i < 81; i++) {
            if (board[i] === 0) {
                const nums = [1, 2, 3, 4, 5, 6, 7, 8, 9].sort(() => Math.random() - 0.5);
                for (let num of nums) {
                    if (this.isValid(board, i, num)) {
                        board[i] = num;
                        if (this.solve(board)) return true;
                        board[i] = 0;
                    }
                }
                return false;
            }
        }
        return true;
    }

    // Generate puzzle based on difficulty
    generatePuzzle(level) {
        const fullBoard = Array(81).fill(0);
        this.solve(fullBoard);
        
        const puzzle = [...fullBoard];
        const difficultyMap = {
            'easy': 35,    // 46 pre-filled
            'medium': 45,  // 36 pre-filled
            'hard': 52,    // 29 pre-filled
            'expert': 58   // 23 pre-filled
        };
        
        let holes = difficultyMap[level] || 35;
        let attempts = 0;
        while (attempts < holes) {
            let idx = Math.floor(Math.random() * 81);
            if (puzzle[idx] !== 0) {
                puzzle[idx] = 0;
                attempts++;
            }
        }
        return { puzzle, solution: fullBoard };
    }
}

const Game = {
    grid: [],
    solution: [],
    initialGrid: [], // To keep track of "Given" numbers
    history: [],
    selectedIdx: null,
    mistakes: 0,
    maxMistakes: 3,
    hints: 3,
    timer: 0,
    timerInterval: null,
    difficulty: 'medium',
    engine: new SudokuEngine(),

    init() {
        this.cacheDOM();
        this.setupEventListeners();
        this.loadSettings();
        this.showLevelSelect();
    },

    cacheDOM() {
        this.gridEl = document.getElementById('sudoku-grid');
        this.timerEl = document.getElementById('game-timer');
        this.mistakeEl = document.getElementById('mistake-container');
        this.hintCountEl = document.getElementById('hint-count');
        this.overlay = document.getElementById('modal-overlay');
        this.levelModal = document.getElementById('level-modal');
        this.winModal = document.getElementById('win-modal');
        this.adModal = document.getElementById('ad-modal');
    },

    setupEventListeners() {
        // Cell selection
        this.gridEl.addEventListener('click', (e) => {
            const cell = e.target.closest('.cell');
            if (cell) this.selectCell(parseInt(cell.dataset.index));
        });

        // Numpad
        document.querySelectorAll('.num-key').forEach(btn => {
            btn.addEventListener('click', () => this.handleInput(parseInt(btn.innerText)));
        });

        // Tools
        document.getElementById('undo-btn').addEventListener('click', () => this.undo());
        document.getElementById('erase-btn').addEventListener('click', () => this.erase());
        document.getElementById('hint-btn').addEventListener('click', () => this.useHint());
        document.getElementById('theme-toggle').addEventListener('click', () => this.toggleTheme());

        // Difficulty buttons
        document.querySelectorAll('.diff-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.difficulty = btn.dataset.level;
                this.startNewGame();
            });
        });

        // Ad Close
        document.getElementById('close-ad-btn').addEventListener('click', () => {
            this.adModal.classList.add('hidden');
            this.showLevelSelect();
        });

        // Keyboard Support
        document.addEventListener('keydown', (e) => {
            if (e.key >= 1 && e.key <= 9) this.handleInput(parseInt(e.key));
            if (e.key === 'Backspace' || e.key === 'Delete') this.erase();
            if (e.ctrlKey && e.key === 'z') this.undo();
        });
    },

    startNewGame() {
        const { puzzle, solution } = this.engine.generatePuzzle(this.difficulty);
        this.grid = [...puzzle];
        this.initialGrid = [...puzzle];
        this.solution = solution;
        this.history = [];
        this.mistakes = 0;
        this.hints = 3;
        this.timer = 0;
        this.selectedIdx = null;

        // Reset UI
        this.overlay.classList.add('hidden');
        this.levelModal.classList.add('hidden');
        this.winModal.classList.add('hidden');
        this.updateMistakeUI();
        this.hintCountEl.innerText = this.hints;
        document.getElementById('difficulty-label').innerText = this.difficulty;
        
        this.renderGrid();
        this.startTimer();
        this.saveState();
    },

    renderGrid() {
        this.gridEl.innerHTML = '';
        for (let i = 0; i < 81; i++) {
            const cell = document.createElement('div');
            cell.classList.add('cell');
            cell.dataset.index = i;
            
            if (this.grid[i] !== 0) {
                cell.innerText = this.grid[i];
                if (this.initialGrid[i] !== 0) cell.classList.add('pre-filled');
            }
            this.gridEl.appendChild(cell);
        }
    },

    selectCell(idx) {
        this.selectedIdx = idx;
        const cells = document.querySelectorAll('.cell');
        const val = this.grid[idx];

        cells.forEach((cell, i) => {
            cell.classList.remove('selected', 'highlighted', 'same-number');
            
            // Highlight Related (Row, Col, Box)
            if (this.isRelated(idx, i)) cell.classList.add('highlighted');
            
            // Highlight Same Numbers
            if (val !== 0 && this.grid[i] === val) cell.classList.add('same-number');
        });

        cells[idx].classList.add('selected');
    },

    isRelated(idx1, idx2) {
        const r1 = Math.floor(idx1 / 9), c1 = idx1 % 9;
        const r2 = Math.floor(idx2 / 9), c2 = idx2 % 9;
        const b1 = Math.floor(r1 / 3) * 3 + Math.floor(c1 / 3);
        const b2 = Math.floor(r2 / 3) * 3 + Math.floor(c2 / 3);
        return r1 === r2 || c1 === c2 || b1 === b2;
    },

    handleInput(num) {
        if (this.selectedIdx === null || this.initialGrid[this.selectedIdx] !== 0) return;

        // Save for Undo
        this.history.push([...this.grid]);

        if (this.solution[this.selectedIdx] === num) {
            this.grid[this.selectedIdx] = num;
            const cell = document.querySelectorAll('.cell')[this.selectedIdx];
            cell.innerText = num;
            cell.classList.remove('error-pulse');
            this.selectCell(this.selectedIdx); // Refresh highlights
            this.checkWin();
        } else {
            this.mistakes++;
            this.updateMistakeUI();
            const cell = document.querySelectorAll('.cell')[this.selectedIdx];
            cell.classList.add('error-pulse');
            setTimeout(() => cell.classList.remove('error-pulse'), 400);
            
            if (this.mistakes >= this.maxMistakes) this.endGame(false);
        }
        this.saveState();
    },

    undo() {
        if (this.history.length > 0) {
            this.grid = this.history.pop();
            this.renderGrid();
            if (this.selectedIdx !== null) this.selectCell(this.selectedIdx);
        }
    },

    erase() {
        if (this.selectedIdx !== null && this.initialGrid[this.selectedIdx] === 0) {
            this.history.push([...this.grid]);
            this.grid[this.selectedIdx] = 0;
            this.renderGrid();
            this.selectCell(this.selectedIdx);
        }
    },

    useHint() {
        if (this.hints > 0 && this.selectedIdx !== null && this.grid[this.selectedIdx] === 0) {
            const correctVal = this.solution[this.selectedIdx];
            this.handleInput(correctVal);
            this.hints--;
            this.hintCountEl.innerText = this.hints;
        }
    },

    updateMistakeUI() {
        const hearts = "❤️".repeat(this.maxMistakes - this.mistakes);
        const broken = "🖤".repeat(this.mistakes);
        this.mistakeEl.innerHTML = hearts + broken;
    },

    startTimer() {
        clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.timer++;
            const m = Math.floor(this.timer / 60).toString().padStart(2, '0');
            const s = (this.timer % 60).toString().padStart(2, '0');
            this.timerEl.innerText = `${m}:${s}`;
        }, 1000);
    },

    toggleTheme() {
        const isDark = document.body.classList.toggle('dark-theme');
        localStorage.setItem('sudoku_theme', isDark ? 'dark' : 'light');
    },

    loadSettings() {
        if (localStorage.getItem('sudoku_theme') === 'dark') {
            document.body.classList.add('dark-theme');
        }
    },

    saveState() {
        const data = {
            grid: this.grid,
            initial: this.initialGrid,
            solution: this.solution,
            mistakes: this.mistakes,
            timer: this.timer,
            diff: this.difficulty
        };
        localStorage.setItem('sudoku_current_game', JSON.stringify(data));
    },

    checkWin() {
        if (!this.grid.includes(0)) {
            this.endGame(true);
        }
    },

    endGame(isWin) {
        clearInterval(this.timerInterval);
        if (isWin) {
            document.getElementById('final-time').innerText = this.timerEl.innerText;
            document.getElementById('final-diff').innerText = this.difficulty;
            this.winModal.classList.remove('hidden');
            this.overlay.classList.remove('hidden');
        } else {
            alert("Game Over! Too many mistakes.");
            this.showAdModal();
        }
    },

    showAdModal() {
        this.adModal.classList.remove('hidden');
        // Trigger AdSense
        try {
            (adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.log("AdSense not loaded yet");
        }
    },

    showLevelSelect() {
        this.overlay.classList.remove('hidden');
        this.levelModal.classList.remove('hidden');
        this.winModal.classList.add('hidden');
    },

    showAdAndRestart() {
        // Logic for "Collect Rewards" or "Next Level"
        this.winModal.classList.add('hidden');
        this.showAdModal();
    }
};

// Global entry point
window.addEventListener('DOMContentLoaded', () => {
    Game.init();
});