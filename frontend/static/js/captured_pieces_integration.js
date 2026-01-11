/**
 * Integration helper for captured pieces
 * Call this function whenever the board position changes
 */

// Initialize captured pieces manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (window.CAPTURED_PIECES) {
        window.CAPTURED_PIECES.init();
    }
});

/**
 * Update captured pieces display
 * Should be called after every move or position change
 * @param {Chess} game - chess.js instance
 */
function updateCapturedPieces(game) {
    if (window.CAPTURED_PIECES && game) {
        try {
            window.CAPTURED_PIECES.update(game);
        } catch (error) {
            console.error('Error updating captured pieces:', error);
        }
    }
}

/**
 * Clear captured pieces display
 * Should be called when resetting the board
 */
function clearCapturedPieces() {
    if (window.CAPTURED_PIECES) {
        window.CAPTURED_PIECES.clear();
    }
}

// Make functions globally available
window.updateCapturedPieces = updateCapturedPieces;
window.clearCapturedPieces = clearCapturedPieces;
