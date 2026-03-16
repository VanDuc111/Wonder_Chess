/**
 * @fileoverview ShareManager - Handles copying PGN/FEN and capturing board images.
 */

import { APP_CONST } from '../constants.js';

export class ShareManager {
    /**
     * @param {Object} gameCore - Reference to the ChessCore instance.
     */
    constructor(gameCore) {
        this.core = gameCore;
        this.initialized = false;
    }

    /**
     * Initializes event listeners for share buttons.
     */
    init() {
        if (this.initialized) return;
        
        // Modal Specific Listeners
        document.getElementById('copy-fen-modal-btn')?.addEventListener('click', () => this.copyFen());
        document.getElementById('copy-pgn-modal-btn')?.addEventListener('click', () => this.copyPgn());
        document.getElementById('generate-image-btn')?.addEventListener('click', () => this.captureBoard(true));
        
        // Listen for Image tab switch to auto-capture preview
        document.getElementById('share-image-tab')?.addEventListener('shown.bs.tab', () => {
            this.captureBoard(false); // Preview only, no download
        });

        // Listen for modal shown to auto-update text fields
        const shareModal = document.getElementById('shareDataModal');
        if (shareModal) {
            shareModal.addEventListener('shown.bs.modal', () => this.updateModalContent());
        }

        this.initialized = true;
    }

    /**
     * Updates modal fields with current game state.
     */
    updateModalContent() {
        const game = this.core.getGame();
        if (!game) return;

        const fenInput = document.getElementById('share-fen-content');
        const pgnTextarea = document.getElementById('share-pgn-content');

        if (fenInput) fenInput.value = game.fen();
        if (pgnTextarea) pgnTextarea.value = game.pgn() || 'Chưa có nước đi nào.';
        
        // Clear preview when modal opens
        const previewContainer = document.getElementById('board-preview-container');
        if (previewContainer) {
            previewContainer.innerHTML = `
                <div class="preview-placeholder">
                    <i class="bi bi-image" style="font-size: 3rem; opacity: 0.2;"></i>
                    <p class="mt-2 text-white-50 small">Nhấn nút bên dưới để tạo ảnh</p>
                </div>`;
        }
    }

    /**
     * Copies current FEN to clipboard.
     */
    async copyFen() {
        const fenInput = document.getElementById('share-fen-content');
        if (!fenInput) return;
        
        const fen = fenInput.value;
        try {
            await navigator.clipboard.writeText(fen);
            if (window.showToast) window.showToast('Đã sao chép FEN vào bộ nhớ tạm');
        } catch (err) {
            console.error('Failed to copy FEN:', err);
            if (window.showToast) window.showToast('Không thể sao chép FEN', 'error');
        }
    }

    /**
     * Copies full PGN to clipboard.
     */
    async copyPgn() {
        const pgnTextarea = document.getElementById('share-pgn-content');
        if (!pgnTextarea) return;
        
        const pgn = pgnTextarea.value;
        try {
            await navigator.clipboard.writeText(pgn);
            if (window.showToast) window.showToast('Đã sao chép PGN vào bộ nhớ tạm');
        } catch (err) {
            console.error('Failed to copy PGN:', err);
            if (window.showToast) window.showToast('Không thể sao chép PGN', 'error');
        }
    }

    /**
     * Generates a preview of the board and then downloads it.
     * @param {boolean} autoDownload - Whether to trigger a file download.
     */
    async captureBoard(autoDownload = true) {
        const ids = APP_CONST?.IDS || {};
        const classes = APP_CONST?.CLASSES || {};
        const boardEl = document.getElementById(ids.BOARD_ELEMENT || 'myBoard');
        const previewContainer = document.getElementById('board-preview-container');
        
        if (!boardEl || !this.core) return;

        try {
            if (autoDownload && window.showToast) {
                window.showToast('Alice đang vẽ lại bàn cờ...', 'warning', 'Đang xử lý');
            }
            
            if (typeof html2canvas === 'undefined') {
                throw new Error('html2canvas library not loaded');
            }

            // Ensure the board is at the CORRECT position (snap to FEN)
            const currentFen = this.core.game.fen();
            if (window.board && typeof window.board.position === 'function') {
                window.board.position(currentFen, false); // Force non-animated snap
            }

            // Brief delay to ensure DOM is settled after snap
            await new Promise(resolve => setTimeout(resolve, 100));

            const canvas = await html2canvas(boardEl, {
                useCORS: true,
                backgroundColor: '#1a1a2e',
                scale: 2,
                logging: false,
                onclone: (clonedDoc) => {
                    const clonedBoard = clonedDoc.getElementById(ids.BOARD_ELEMENT || 'myBoard');
                    if (clonedBoard) {
                        // 1. Completely remove SVG overlays (arrows, best moves)
                        clonedBoard.querySelectorAll('svg, #arrow-container, .best-move-glow').forEach(el => el.remove());

                        // 2. Clear highlighting by removing classes instead of hiding elements
                        const highlightSelectors = [
                            '.' + (classes.SQUARE_SELECTED || 'square-selected'),
                            '.' + (classes.HIGHLIGHT_MOVE || 'highlight-move'),
                            '.' + (classes.HIGHLIGHT_CHECK || 'highlight-check'),
                            '[class*="highlight-"]' 
                        ];
                        
                        highlightSelectors.forEach(sel => {
                            clonedBoard.querySelectorAll(sel).forEach(el => {
                                // Remove highlight specific styling but KEEP the square div
                                el.style.boxShadow = 'none';
                                el.style.background = '';
                                el.style.backgroundColor = '';
                                
                                // Strip classes so they don't trigger CSS highlight rules
                                el.classList.remove('square-selected', 'highlight-move', 'highlight-check');
                                Array.from(el.classList).forEach(cls => {
                                    if (cls.includes('highlight-')) el.classList.remove(cls);
                                });
                            });
                        });
                    }
                }
            });
            
            const imgData = canvas.toDataURL('image/png');
            
            // Show preview in modal
            if (previewContainer) {
                const img = new Image();
                img.src = imgData;
                img.className = 'img-fluid rounded animate__animated animate__fadeIn';
                img.style.maxHeight = '100%';
                img.style.width = '100%';
                img.style.objectFit = 'contain';
                previewContainer.innerHTML = '';
                previewContainer.appendChild(img);
            }

            if (autoDownload) {
                const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
                const fileName = `wonderchess_${timestamp}.png`;
                
                const link = document.createElement('a');
                link.download = fileName;
                link.href = imgData;
                link.click();
                
                if (window.showToast) window.showToast('Đã tải xuống ảnh bàn cờ');
            }
        } catch (err) {
            console.error('Failed to capture board:', err);
            if (window.showToast) window.showToast('Lỗi khi tạo ảnh', 'error');
        }
    }
}
