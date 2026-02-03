/**
 * @fileoverview EngineService Module - Manages communication with chess engines.
 * Handles best move requests, deep evaluations, and score parsing.
 */

import { APP_CONST } from '../constants.js';

export class ChessEngine {
    /**
     * Create a ChessEngine instance.
     */
    constructor() {
        /** @type {Map<string|number, number>} Cache for parsed scores */
        this.scoreCache = new Map();
    }

    /**
     * Requests the best move for a given FEN.
     * @param {string} fen - Current board FEN.
     * @param {number} level - Bot skill level (1-20).
     * @param {number} time - Calculation time limit.
     * @returns {Promise<Object|null>} Best move data or null.
     * @async
     */
    async getBestMove(fen, level, time) {
        // Fallback to global BOT_MANAGER if available
        if (window.BOT_MANAGER && typeof window.BOT_MANAGER.getBestMove === 'function') {
            return await window.BOT_MANAGER.getBestMove(fen, level, time);
        }
        return null;
    }

    /**
     * Requests a deep position evaluation from the server.
     * @param {string} fen - FEN to evaluate.
     * @returns {Promise<Object>} API response JSON.
     * @async
     */
    async getDeepEval(fen) {
        const apiUrl = APP_CONST?.API?.EVALUATE || '/api/game/evaluate';
        try {
            const resp = await fetch(apiUrl, {
                method: 'POST', 
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ fen })
            });
            return await resp.json();
        } catch (e) {
            console.error("Deep Eval API Error:", e);
            throw e;
        }
    }

    /**
     * Safely parses engine score strings into numeric values.
     * @param {string|number} s - Input score (e.g., "+1.5", "-0.8", "M2").
     * @returns {number} Parsed numerical value (+100/-100 for mates).
     */
    parseScore(s) {
        const engineConst = APP_CONST?.ENGINE || {};
        const normScore = engineConst.NORMALIZED_SCORE || { MATE: 100, DEFAULT: 0 };
        
        if (s === null || s === undefined) return normScore.DEFAULT;
        if (this.scoreCache.has(s)) return this.scoreCache.get(s);

        const scoreStr = String(s);
        let val = normScore.DEFAULT;
        
        // Handle Mate notation
        const mateSymbols = engineConst.MATE_SYMBOLS || ['M', '#'];
        const isMate = mateSymbols.some(sym => scoreStr.includes(sym));

        if (isMate) {
            val = scoreStr.includes('-') ? -normScore.MATE : normScore.MATE; 
        } else {
            val = parseFloat(scoreStr) || normScore.DEFAULT;
        }

        this.scoreCache.set(s, val);
        return val;
    }
}
