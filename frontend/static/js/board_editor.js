/**
 * Board Editor - Allow users to edit chess positions
 */

class BoardEditor {
    constructor() {
        this.editorBoard = null;
        this.selectedPiece = null;
        this.selectedTool = null;
        this.currentPosition = {};
        this.modal = null;
        this.hasDebugImage = false; // Flag to track if opened with image
        
        this.init();
    }
    
    init() {
        const ids = window.APP_CONST?.IDS;
        this.modal = document.getElementById(ids?.BOT_SETTINGS_MODAL ? 'boardEditorModal' : 'boardEditorModal'); // Use actual ID from constants if mapped
        this.modal = document.getElementById('boardEditorModal'); // Keep specific if not in constants
        if (!this.modal) return;
        
        // Initialize when modal is shown
        this.modal.addEventListener('shown.bs.modal', () => this.onModalShown());
        
        // Setup event listeners
        this.setupPieceSelectors();
        this.setupToolButtons();
        this.setupControlButtons();
        this.setupDoneButton();
        this.setupLightbox();
    }
    
    /**
     * Open editor with specific FEN and optional Debug Image
     * @param {string} fen - FEN string to load
     * @param {string} debugImage - Base64 string of debug image (optional)
     */
    openWithFen(fen, debugImage = null) {
        if (!this.modal) {
            // Re-init if modal wasn't found initially
            this.init(); 
            if (!this.modal) return;
        }

        // Set internal state
        try {
            this.currentPosition = this.fenToPosition(fen);
        } catch (e) {
            console.error("Invalid FEN provided to editor:", e);
            this.currentPosition = this.fenToPosition(window.APP_CONST?.STARTING_FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        }

        // Open Modal
        const bsModal = new bootstrap.Modal(this.modal);
        bsModal.show();

        const splitContainer = this.modal.querySelector('.board-editor-split');
        const rightPane = this.modal.querySelector('.editor-right-pane');
        const imgEl = document.getElementById('editor-reference-image');
        const placeholderEl = document.getElementById('editor-no-image-placeholder');
        
        if (rightPane && imgEl && splitContainer) {
            if (debugImage) {
                // HAS IMAGE: Show right pane, set image
                splitContainer.classList.add('has-image');
                rightPane.style.display = 'flex';
                imgEl.src = 'data:image/jpeg;base64,' + debugImage;
                imgEl.style.display = 'block';
                if (placeholderEl) placeholderEl.style.display = 'none';
                
                // Set Modal size larger for split view
                this.modal.querySelector('.modal-dialog').classList.remove('modal-lg');
                this.modal.querySelector('.modal-dialog').classList.add('modal-xl');
                this.hasDebugImage = true;
            } else {
                // NO IMAGE: Hide right pane completely
                splitContainer.classList.remove('has-image');
                rightPane.style.display = 'none';
                
                // Use large modal for single-column editor
                this.modal.querySelector('.modal-dialog').classList.remove('modal-xl');
                this.modal.querySelector('.modal-dialog').classList.add('modal-lg');
                this.hasDebugImage = false;
            }
        }
        
        // Wait for modal transition then render board
        setTimeout(() => {
            this.initializeEditorBoard();
            this.updateFENInput();
        }, 200);
    }
    
    onModalShown() {
        // If currentPosition is empty (user opened manually), load from main game
        if (Object.keys(this.currentPosition).length === 0) {
             if (window.LOGIC_GAME && typeof window.LOGIC_GAME.getGame === 'function') {
                const chess = window.LOGIC_GAME.getGame();
                if (chess) {
                    this.currentPosition = this.fenToPosition(chess.fen());
                }
            } else {
                 // Start with empty board if manual open and no game state
                this.currentPosition = {};
            }
        }

        // Check if we need to hide the right pane (Manual Open case)
        if (!this.hasDebugImage) {
            const splitContainer = this.modal.querySelector('.board-editor-split');
            const rightPane = this.modal.querySelector('.editor-right-pane');
            if (splitContainer) splitContainer.classList.remove('has-image');
            if (rightPane) rightPane.style.display = 'none';
            this.modal.querySelector('.modal-dialog').classList.remove('modal-xl');
            this.modal.querySelector('.modal-dialog').classList.add('modal-lg');
        }
        
        // Initialize editor board
        this.initializeEditorBoard();
        
        // Update FEN input
        this.updateFENInput();
    }
    
    initializeEditorBoard() {
        if (this.editorBoard) {
            this.editorBoard.destroy();
        }

        const isMoveMode = this.selectedTool === 'move';

        const config = {
            position: this.currentPosition,
            draggable: isMoveMode, 
            onDrop: isMoveMode ? this.onPieceMove.bind(this) : undefined,
            dropOffBoard: isMoveMode ? 'trash' : 'snapback',
            pieceTheme: window.APP_CONST?.PATHS?.PIECE_THEME || 'static/img/chesspieces/wikipedia/{piece}.png'
        };
        
        this.editorBoard = Chessboard('editorBoard', config);
        
        // Force resize after a short delay to handle modal transition
        setTimeout(() => {
            if (this.editorBoard) {
                this.editorBoard.resize();
                // Add click handler to board squares AFTER rendering
                this.addBoardClickHandler();
            }
        }, 150);
    }

    onPieceMove(source, target, piece, newPos, oldPos, orientation) {
        // If piece was dropped off-board (trash mode)
        if (target === 'offboard') {
            delete this.currentPosition[source];
            this.updateFENInput();
            this.validatePosition();
            return;
        }

        if (source === target) return;
        
        // Update local position
        delete this.currentPosition[source];
        this.currentPosition[target] = piece;
        
        // Sync with input
        this.updateFENInput();
        this.validatePosition();

        // Ensure internal state consistency
        setTimeout(() => this.updateBoardUI(), 50);
    }
    
    addBoardClickHandler() {
        const boardEl = document.getElementById('editorBoard');
        if (!boardEl) return;
        
        // Remove existing listener to prevent duplicates
        if (this._boardClickListener) {
            boardEl.removeEventListener('click', this._boardClickListener);
        }
        
        this._boardClickListener = (e) => {
            const squareEl = e.target.closest('.square-55d63');
            if (!squareEl) return;
            
            const squareId = squareEl.getAttribute('data-square');
            if (!squareId) return;
            
            this.handleSquareClick(squareId);
        };
        
        boardEl.addEventListener('click', this._boardClickListener);

        // Setup HTML5 Drag-Drop Listeners for Sidebar Pieces
        boardEl.addEventListener('dragover', (e) => e.preventDefault());
        boardEl.addEventListener('drop', (e) => {
            e.preventDefault();
            const piece = e.dataTransfer.getData('piece');
            const squareEl = e.target.closest('.square-55d63');
            const squareId = squareEl?.getAttribute('data-square');
            
            if (piece && squareId) {
                this.currentPosition[squareId] = piece;
                this.updateBoardUI();
                this.updateFENInput();
                this.validatePosition();
            }
        });
    }
    
    handleSquareClick(square) {
        if (this.selectedTool === 'delete') {
            delete this.currentPosition[square];
        } else if (this.selectedPiece) {
            this.currentPosition[square] = this.selectedPiece;
        } else {
            return; // Nothing to do
        }
        
        this.updateBoardUI();
        this.updateFENInput();
        this.validatePosition();
    }

    updateBoardUI() {
        if (this.editorBoard) {
            // position() is better than recreateBoard because it doesn't destroy the DOM/listeners
            this.editorBoard.position(this.currentPosition, false);
        } else {
            this.recreateBoard();
        }
    }
    
    setupPieceSelectors() {
        const pieceButtons = document.querySelectorAll('.btn-piece');
        
        pieceButtons.forEach(btn => {
            // Handle Click
            btn.addEventListener('click', () => {
                pieceButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedPiece = btn.getAttribute('data-piece');
                this.selectedTool = null;
                document.querySelectorAll('.btn-editor-tool').forEach(b => {
                    b.classList.remove('active', 'active-danger', 'active-success');
                });
                // When a piece is selected, ensure board isn't internally draggable
                this.recreateBoard(); 
            });

            // Handle Drag Start
            const img = btn.querySelector('img');
            if (img) {
                img.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('piece', btn.getAttribute('data-piece'));
                    // Visual feedback
                    btn.classList.add('dragging');
                });
                img.addEventListener('dragend', () => {
                    btn.classList.remove('dragging');
                });
            }
        });
    }
    
    setupToolButtons() {
        const deleteBtn = document.getElementById('editor-delete-piece');
        const handBtn = document.getElementById('editor-hand-tool');
        
        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                const isActive = deleteBtn.classList.contains('active-danger');
                document.querySelectorAll('.btn-piece').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.btn-editor-tool').forEach(b => b.classList.remove('active', 'active-danger', 'active-success'));
                
                if (!isActive) {
                    deleteBtn.classList.add('active-danger');
                    this.selectedTool = 'delete';
                    this.selectedPiece = null;
                } else {
                    this.selectedTool = null;
                }
                this.recreateBoard(); // Toggle draggability
            });
        }
        
        if (handBtn) {
            handBtn.addEventListener('click', () => {
                const isActive = handBtn.classList.contains('active-success');
                document.querySelectorAll('.btn-piece').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.btn-editor-tool').forEach(b => b.classList.remove('active', 'active-danger', 'active-success'));
                
                if (!isActive) {
                    handBtn.classList.add('active-success');
                    this.selectedTool = 'move';
                    this.selectedPiece = null;
                } else {
                    this.selectedTool = null;
                }
                this.recreateBoard(); // Toggle draggability
            });
        }
    }
    
    setupControlButtons() {
        // Clear board
        const clearBtn = document.getElementById('editor-clear-board');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.currentPosition = {};
                this.recreateBoard();
                this.updateFENInput();
                this.hideValidationError();
            });
        }
        
        // Flip board
        const flipBtn = document.getElementById('editor-flip-board');
        if (flipBtn) {
            flipBtn.addEventListener('click', () => {
                if (this.editorBoard) {
                    this.editorBoard.flip();
                }
            });
        }
        
        const startBtn = document.getElementById('editor-start-position');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                const startFen = window.APP_CONST?.STARTING_FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
                this.currentPosition = this.fenToPosition(startFen);
                this.recreateBoard();
                this.updateFENInput();
                this.validatePosition();
            });
        }
        
        // Apply FEN
        const applyFenBtn = document.getElementById('editor-apply-fen');
        if (applyFenBtn) {
            applyFenBtn.addEventListener('click', () => {
                const fenInput = document.getElementById('editor-fen-input');
                if (fenInput) {
                    try {
                        const fen = fenInput.value.trim();
                        this.currentPosition = this.fenToPosition(fen);
                        this.recreateBoard();
                        this.validatePosition();
                    } catch (e) {
                        this.showValidationError('FEN không hợp lệ');
                    }
                }
            });
        }
    }
    
    recreateBoard() {
        // Destroy old board
        if (this.editorBoard) {
            this.editorBoard.destroy();
        }
        
        const isMoveMode = this.selectedTool === 'move';

        // Create new board
        const config = {
            position: this.currentPosition,
            draggable: isMoveMode,
            onDrop: isMoveMode ? this.onPieceMove.bind(this) : undefined,
            dropOffBoard: isMoveMode ? 'trash' : 'snapback',
            pieceTheme: window.APP_CONST?.PATHS?.PIECE_THEME || 'static/img/chesspieces/wikipedia/{piece}.png'
        };
        
        this.editorBoard = Chessboard('editorBoard', config);
        
        // Re-add click handlers
        setTimeout(() => {
            this.addBoardClickHandler();
            if (this.editorBoard) this.editorBoard.resize();
        }, 100);
    }
    
    setupDoneButton() {
        const doneBtn = document.getElementById('editor-done-btn');
        if (doneBtn) {
            doneBtn.addEventListener('click', () => {
                if (this.validatePosition()) {
                    // Apply position to main board
                    this.applyPositionToMainBoard();
                    
                    // Close modal
                    const modal = bootstrap.Modal.getInstance(this.modal);
                    if (modal) modal.hide();
                }
            });
        }
    }
    
    validatePosition() {
        const pieces = Object.values(this.currentPosition);
        
        // Count kings
        const whiteKings = pieces.filter(p => p === 'wK').length;
        const blackKings = pieces.filter(p => p === 'bK').length;
        
        if (whiteKings !== 1 || blackKings !== 1) {
            this.showValidationError('Mỗi bên phải có đúng 1 vua!');
            return false;
        }
        
        this.hideValidationError();
        return true;
    }
    
    showValidationError(message) {
        const errorEl = document.getElementById('editor-validation-error');
        const messageEl = document.getElementById('editor-error-message');
        
        if (errorEl && messageEl) {
            messageEl.textContent = message;
            errorEl.classList.remove('d-none');
        }
    }
    
    hideValidationError() {
        const errorEl = document.getElementById('editor-validation-error');
        if (errorEl) {
            errorEl.classList.add('d-none');
        }
    }
    
    updateFENInput() {
        const fenInput = document.getElementById('editor-fen-input');
        if (fenInput) {
            fenInput.value = this.positionToFen(this.currentPosition);
        }
    }
    
    fenToPosition(fen) {
        // Convert FEN string to position object
        const parts = fen.split(' ');
        const rows = parts[0].split('/');
        const position = {};
        
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        
        rows.forEach((row, rowIndex) => {
            const rank = 8 - rowIndex;
            let fileIndex = 0;
            
            for (let char of row) {
                if (char >= '1' && char <= '8') {
                    // Empty squares
                    fileIndex += parseInt(char);
                } else {
                    // Piece
                    const square = files[fileIndex] + rank;
                    const color = char === char.toUpperCase() ? 'w' : 'b';
                    const piece = char.toUpperCase();
                    position[square] = color + piece;
                    fileIndex++;
                }
            }
        });
        
        return position;
    }
    
    positionToFen(position) {
        // Convert position object to FEN string (board part only)
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const rows = [];
        
        for (let rank = 8; rank >= 1; rank--) {
            let row = '';
            let emptyCount = 0;
            
            for (let file of files) {
                const square = file + rank;
                const piece = position[square];
                
                if (piece) {
                    if (emptyCount > 0) {
                        row += emptyCount;
                        emptyCount = 0;
                    }
                    
                    const color = piece[0];
                    const pieceType = piece[1];
                    row += color === 'w' ? pieceType : pieceType.toLowerCase();
                } else {
                    emptyCount++;
                }
            }
            
            if (emptyCount > 0) {
                row += emptyCount;
            }
            
            rows.push(row);
        }
        
        const startFen = window.APP_CONST?.STARTING_FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const suffix = startFen.split(' ').slice(1).join(' ');
        
        return rows.join('/') + ' ' + suffix;
    }
    
    applyPositionToMainBoard() {
        const fen = this.positionToFen(this.currentPosition);
        console.log('🎯 Applying position:', fen);
        
        // Check if LOGIC_GAME exists
        if (!window.LOGIC_GAME) {
            console.error('❌ No LOGIC_GAME found');
            alert('Không tìm thấy LOGIC_GAME. Vui lòng reload trang.');
            return;
        }
        
        try {
            // Use initChessboard to load new position
            // This properly updates history and board
            if (typeof window.LOGIC_GAME.initChessboard === 'function') {
                // Get current orientation
                const currentOrientation = document.getElementById('flip-board-switch')?.checked ? 'black' : 'white';
                
                // Initialize with new FEN
                window.LOGIC_GAME.initChessboard(currentOrientation, fen);
                console.log('✅ Board initialized with new position');
            } else {
                // Fallback: manually update
                const chess = window.LOGIC_GAME.getGame();
                if (chess) {
                    chess.load(fen);
                    console.log('✅ Chess.js loaded FEN');
                }
                
                // Force UI update
                if (typeof window.LOGIC_GAME.updateUI === 'function') {
                    window.LOGIC_GAME.updateUI();
                    console.log('✅ UI updated');
                }
            }
            
            console.log('✅ Position applied successfully:', fen);
        } catch (e) {
            console.error('❌ Failed to apply position:', e);
            alert('Lỗi khi áp dụng vị trí: ' + e.message);
        }
    }

    setupLightbox() {
        const thumbImg = document.getElementById('editor-reference-image');
        const lightbox = document.getElementById('editor-image-lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const closeBtn = document.querySelector('.lightbox-close-btn');

        if (!thumbImg || !lightbox || !lightboxImg) return;

        // Open Lightbox
        thumbImg.addEventListener('click', () => {
            if (thumbImg.src && thumbImg.src !== window.location.href) {
                lightboxImg.src = thumbImg.src;
                lightbox.classList.remove('d-none');
            }
        });

        // Close functions
        const closeLightbox = () => {
            lightbox.classList.add('d-none');
            lightboxImg.src = '';
        };

        if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
        
        // Close on background click
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });

        // Close on ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !lightbox.classList.contains('d-none')) {
                closeLightbox();
            }
        });
    }
}



// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.BOARD_EDITOR = new BoardEditor();
});
