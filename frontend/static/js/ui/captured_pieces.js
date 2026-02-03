/**
 * @fileoverview Captured Pieces Manager for WonderChess
 * Tracks and displays captured pieces with material advantage calculation
 */

import { APP_CONST } from '../constants.js';

export class CapturedPiecesManager {
    constructor() {
        this.dom = {
            capturedByWhite: null,
            capturedByBlack: null
        };
        this._lastStateKey = null;
    }
    
    /**
     * Initialize DOM references
     */
    init() {
        const ids = APP_CONST?.IDS || {};
        this.dom.capturedByWhite = document.getElementById(ids.CAPTURED_WHITE || 'captured-by-white');
        this.dom.capturedByBlack = document.getElementById(ids.CAPTURED_BLACK || 'captured-by-black');
    }
    
    /**
     * Calculate captured pieces from current position
     * @param {Chess} game - chess.js instance
     * @returns {Object} Captured pieces data
     */
    calculateCaptured(game) {
        if (!game) return { white: [], black: [], advantage: 0 };
        
        const startingPieces = APP_CONST?.CHESS_RULES?.STARTING_PIECES || {};
        const pieceValues = APP_CONST?.PIECE_VALUES || {};
        
        const currentPieces = {};
        Object.keys(startingPieces).forEach(p => currentPieces[p] = 0);
        
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
        const sortByValue = (a, b) => (pieceValues[b] || 0) - (pieceValues[a] || 0);
        capturedByWhite.sort(sortByValue);
        capturedByBlack.sort(sortByValue);
        
        // Calculate material advantage
        const whiteValue = capturedByWhite.reduce((sum, p) => sum + (pieceValues[p] || 0), 0);
        const blackValue = capturedByBlack.reduce((sum, p) => sum + (pieceValues[p] || 0), 0);
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
        
        // Cache state to avoid redundant renders and image re-requests
        const stateKey = JSON.stringify(captured);
        if (this._lastStateKey === stateKey) return;
        this._lastStateKey = stateKey;
        
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
        const pieceImages = APP_CONST?.PATHS?.PIECE_IMAGES || {};
        const staticPath = APP_CONST?.PATHS?.STATIC || '/static/';

        pieces.forEach(piece => {
            const img = document.createElement('div');
            img.className = 'captured-piece';
            if (pieceImages[piece]) {
                img.style.backgroundImage = `url('${staticPath}${pieceImages[piece]}')`;
            }
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
        return APP_CONST?.PIECE_NAMES_VN?.[piece] || '';
    }
    
    /**
     * Clear all captured pieces display
     */
    clear() {
        if (this.dom.capturedByWhite) this.dom.capturedByWhite.innerHTML = '';
        if (this.dom.capturedByBlack) this.dom.capturedByBlack.innerHTML = '';
    }
}
