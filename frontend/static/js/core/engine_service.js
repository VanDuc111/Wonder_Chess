/**
 * @fileoverview EngineService Module - Manages communication with chess engines.
 * Handles best move requests, deep evaluations, and score parsing.
 */

class ChessEngine {
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
        const apiUrl = window.APP_CONST?.API?.EVALUATE || '/api/game/evaluate';
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
        if (s === null || s === undefined) return 0;
        if (this.scoreCache.has(s)) return this.scoreCache.get(s);

        const scoreStr = String(s);
        let val = 0;
        
        // Handle Mate notation
        if (scoreStr.includes('M') || scoreStr.includes('#')) {
            val = scoreStr.includes('-') ? -100 : 100; // Normalized for bar
        } else {
            val = parseFloat(scoreStr) || 0;
        }

        this.scoreCache.set(s, val);
        return val;
    }
}
