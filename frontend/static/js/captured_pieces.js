/**
 * @fileoverview Captured Pieces Manager for WonderChess
 * Tracks and displays captured pieces with material advantage calculation
 */

class CapturedPiecesManager {
    constructor() {
        this.pieceValues = window.APP_CONST?.PIECE_VALUES || {
            'p': 1, 'n': 3, 'b': 3, 'r': 5, 'q': 9,
            'P': 1, 'N': 3, 'B': 3, 'R': 5, 'Q': 9
        };
        
        this.pieceImages = window.APP_CONST?.PATHS?.PIECE_IMAGES || {
            'p': 'img/chesspieces/wikipedia/bP.png',
            'n': 'img/chesspieces/wikipedia/bN.png',
            'b': 'img/chesspieces/wikipedia/bB.png',
            'r': 'img/chesspieces/wikipedia/bR.png',
            'q': 'img/chesspieces/wikipedia/bQ.png',
            'P': 'img/chesspieces/wikipedia/wP.png',
            'N': 'img/chesspieces/wikipedia/wN.png',
            'B': 'img/chesspieces/wikipedia/wB.png',
            'R': 'img/chesspieces/wikipedia/wR.png',
            'Q': 'img/chesspieces/wikipedia/wQ.png'
        };
        
        this.dom = {
            capturedByWhite: null,
            capturedByBlack: null
        };
    }
    
    /**
     * Initialize DOM references
     */
    init() {
        const ids = window.APP_CONST?.IDS;
        this.dom.capturedByWhite = document.getElementById(ids?.TIMER_WHITE ? 'captured-by-white' : 'captured-by-white'); // Fix if ID differs
        this.dom.capturedByBlack = document.getElementById('captured-by-black');
        
        // Use generic Ids if available in constants later
        this.dom.capturedByWhite = document.getElementById('captured-by-white');
        this.dom.capturedByBlack = document.getElementById('captured-by-black');
    }
    
    /**
     * Calculate captured pieces from current position
     * @param {Chess} game - chess.js instance
     * @returns {Object} Captured pieces data
     */
    calculateCaptured(game) {
        if (!game) return { white: [], black: [], advantage: 0 };
        
        const startingPieces = window.APP_CONST?.CHESS_RULES?.STARTING_PIECES || {
            'p': 8, 'n': 2, 'b': 2, 'r': 2, 'q': 1, 'k': 1,
            'P': 8, 'N': 2, 'B': 2, 'R': 2, 'Q': 1, 'K': 1
        };
        
        const currentPieces = {
            'p': 0, 'n': 0, 'b': 0, 'r': 0, 'q': 0, 'k': 0,
            'P': 0, 'N': 0, 'B': 0, 'R': 0, 'Q': 0, 'K': 0
        };
        
        // Count current pieces on board
        const board = game.board();
        for (let row of board) {
            for (let square of row) {
                if (square) {
                    const piece = square.type;
                    const color = square.color;
                    const key = color === 'w' ? piece.toUpperCase() : piece.toLowerCase();
                    currentPieces[key]++;
                }
            }
        }
        
        // Calculate captured pieces
        const capturedByWhite = []; // Black pieces captured by white
        const capturedByBlack = []; // White pieces captured by black
        
        for (let piece in startingPieces) {
            const captured = startingPieces[piece] - currentPieces[piece];
            if (captured > 0 && piece !== 'k' && piece !== 'K') {
                const arr = piece === piece.toLowerCase() ? capturedByWhite : capturedByBlack;
                for (let i = 0; i < captured; i++) {
                    arr.push(piece);
                }
            }
        }
        
        // Sort by value (highest first)
        const sortByValue = (a, b) => this.pieceValues[b] - this.pieceValues[a];
        capturedByWhite.sort(sortByValue);
        capturedByBlack.sort(sortByValue);
        
        // Calculate material advantage
        const whiteValue = capturedByWhite.reduce((sum, p) => sum + this.pieceValues[p], 0);
        const blackValue = capturedByBlack.reduce((sum, p) => sum + this.pieceValues[p], 0);
        const advantage = whiteValue - blackValue;
        
        return {
            white: capturedByWhite,
            black: capturedByBlack,
            advantage: advantage
        };
    }
    
    /**
     * Update the captured pieces display
     * @param {Chess} game - chess.js instance
     */
    update(game) {
        if (!this.dom.capturedByWhite || !this.dom.capturedByBlack) {
            this.init();
        }
        
        const captured = this.calculateCaptured(game);
        
        // Update white's captures (black pieces)
        this.renderCaptured(this.dom.capturedByWhite, captured.white, captured.advantage > 0 ? captured.advantage : 0);
        
        // Update black's captures (white pieces)
        this.renderCaptured(this.dom.capturedByBlack, captured.black, captured.advantage < 0 ? Math.abs(captured.advantage) : 0);
    }
    
    /**
     * Render captured pieces in container
     * @param {HTMLElement} container - DOM container
     * @param {Array} pieces - Array of captured piece codes
     * @param {number} advantage - Material advantage to display
     */
    renderCaptured(container, pieces, advantage) {
        if (!container) return;
        
        container.innerHTML = '';
        
        // Add piece images
        pieces.forEach(piece => {
            const img = document.createElement('div');
            img.className = 'captured-piece';
            img.style.backgroundImage = `url('${window.APP_CONST?.PATHS?.STATIC || '/static/'}${this.pieceImages[piece]}')`;
            img.title = this.getPieceName(piece);
            container.appendChild(img);
        });
        
        // Add advantage indicator
        if (advantage > 0) {
            const advSpan = document.createElement('span');
            advSpan.className = 'material-advantage';
            advSpan.textContent = `+${advantage}`;
            container.appendChild(advSpan);
        }
    }
    
    /**
     * Get piece name for tooltip
     * @param {string} piece - Piece code
     * @returns {string} Piece name
     */
    getPieceName(piece) {
        if (window.APP_CONST?.PIECE_NAMES_VN) {
            return window.APP_CONST.PIECE_NAMES_VN[piece] || '';
        }
        const names = {
            'p': 'Tốt đen', 'n': 'Mã đen', 'b': 'Tượng đen', 
            'r': 'Xe đen', 'q': 'Hậu đen',
            'P': 'Tốt trắng', 'N': 'Mã trắng', 'B': 'Tượng trắng',
            'R': 'Xe trắng', 'Q': 'Hậu trắng'
        };
        return names[piece] || '';
    }
    
    /**
     * Clear all captured pieces display
     */
    clear() {
        if (this.dom.capturedByWhite) this.dom.capturedByWhite.innerHTML = '';
        if (this.dom.capturedByBlack) this.dom.capturedByBlack.innerHTML = '';
    }
}

// Initialize global instance
window.CAPTURED_PIECES = new CapturedPiecesManager();

/**
 * Integration helpers (Moved from captured_pieces_integration.js)
 */
document.addEventListener('DOMContentLoaded', () => {
    if (window.CAPTURED_PIECES) {
        window.CAPTURED_PIECES.init();
    }
});

window.updateCapturedPieces = function(game) {
    if (window.CAPTURED_PIECES && game) {
        try {
            window.CAPTURED_PIECES.update(game);
        } catch (error) {
            console.error('Error updating captured pieces:', error);
        }
    }
};

window.clearCapturedPieces = function() {
    if (window.CAPTURED_PIECES) {
        window.CAPTURED_PIECES.clear();
    }
};
