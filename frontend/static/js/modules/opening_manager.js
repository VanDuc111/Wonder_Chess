/**
 * @fileoverview OpeningManager Module - Handles chess opening detection and metadata.
 * Uses a pre-processed dictionary for high-performance matching against move history.
 */

class ChessOpening {
    /**
     * Create a ChessOpening instance.
     */
    constructor() {
        /** @type {Array|null} Pre-processed opening dictionary */
        this.preparedData = null;
    }

    /**
     * Pre-processes opening data for high-performance matching.
     * @returns {Array} List of processed opening objects.
     * @private
     */
    _prepareDictionary() {
        if (this.preparedData) return this.preparedData;
        
        // OPENINGS_DATA is expected to be loaded globally via opening_data.js
        let raw = null;
        try {
            if (typeof OPENINGS_DATA !== 'undefined') raw = OPENINGS_DATA;
        } catch(e) {}

        if (!raw) return [];
        
        this.preparedData = raw.map(op => ({
            ...op,
            // Clean move string for matching: "1. e4 e5" -> ["e4", "e5"]
            moveArray: op.moves.replace(/\s+/g, ' ').trim().replace(/\d+\.\s+/g, '').replace(/\d+\.\.\.\s+/g, '').split(' ')
        }));
        return this.preparedData;
    }

    /**
     * Detects opening from move history and updates the history metadata.
     * @param {Array} history - The app's moveHistory array.
     * @param {number} curIdx - Index to detect for.
     * @returns {Object} Result containing opening name and book status.
     */
    detectAndUpdate(history, curIdx) {
        const strings = window.APP_CONST?.STRINGS || {};
        if (!history || !history[curIdx]) return { name: strings.OPENING_NOT_STARTED || "Chưa bắt đầu", isBookMove: false };

        const dictionary = this._prepareDictionary();
        // Extract plain SAN moves from history up to current index
        const currentMoves = history.slice(1, curIdx + 1).map(h => h.san);
        
        if (currentMoves.length === 0) {
            history[curIdx].opening = strings.OPENING_NOT_STARTED || "Chưa bắt đầu";
            history[curIdx].isBookMove = false;
            return { name: strings.OPENING_NOT_STARTED || "Chưa bắt đầu", isBookMove: false };
        }

        let best = null, maxLen = -1;
        for (const op of dictionary) {
            const opMoves = op.moveArray;
            if (opMoves.length > currentMoves.length) continue;
            
            let match = true;
            for (let i = 0; i < opMoves.length; i++) {
                if (opMoves[i] !== currentMoves[i]) {
                    match = false;
                    break;
                }
            }
            
            if (match && opMoves.length > maxLen) {
                maxLen = opMoves.length;
                best = op;
            }
        }

        const isKnownBook = (best && maxLen === currentMoves.length);
        const threshold = window.APP_CONST?.OPENINGS?.BOOK_THRESHOLD || 2;
        const name = best ? best.name : (currentMoves.length <= threshold ? (strings.OPENING_DEVELOPING || "Đang khai triển...") : (strings.OPENING_UNKNOWN || "Khai cuộc không xác định"));

        // Attach metadata to the history item for later reference (PGN icons, etc.)
        history[curIdx].opening = name;
        history[curIdx].isBookMove = !!isKnownBook;

        return { name, isBookMove: !!isKnownBook };
    }
}
