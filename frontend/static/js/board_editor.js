/**
 * Board Editor - Allow users to edit chess positions
 * Manages the UI, board logic, and drag-and-drop operations for editing FEN strings.
 */

class BoardEditor {
    constructor() {
        /** @type {Object|null} Chessboard.js instance */
        this.editorBoard = null;
        /** @type {string|null} Current piece selected for placement (e.g., 'wK', 'bP') */
        this.selectedPiece = null;
        /** @type {string|null} Current active tool ('move', 'delete') */
        this.selectedTool = null;
        /** @type {Object} Current position mapping (square -> pieceCode) */
        this.currentPosition = {};
        /** @type {HTMLElement|null} The modal element */
        this.modal = null;
        /** @type {boolean} Whether the editor was opened with a reference debug image */
        this.hasDebugImage = false; 
        
        this.init();
    }
    
    /**
     * Initialize modal listeners and UI event handlers.
     */
    init() {
        const ids = window.APP_CONST?.IDS;
        this.modal = document.getElementById('boardEditorModal');
        if (!this.modal) return;
        
        // Initialize when modal is fully shown
        this.modal.addEventListener('shown.bs.modal', () => this.onModalShown());
        
        // Setup all functional modules
        this.setupPieceSelectors();
        this.setupToolButtons();
        this.setupControlButtons();
        this.setupDoneButton();
        this.setupLightbox();
        this._setupResize();
        this.addBoardClickHandler(); // Initialize board listeners ONCE on the container
    }
    
    /**
     * Open editor with specific FEN and optional Debug Image from AI analysis.
     * @param {string} fen - FEN string to load into the board.
     * @param {string} debugImage - Base64 encoded string of the reference image.
     */
    openWithFen(fen, debugImage = null) {
        if (!this.modal) {
            this.init(); 
            if (!this.modal) return;
        }

        // Set internal state from FEN
        try {
            this.currentPosition = this.fenToPosition(fen);
        } catch (e) {
            console.error("Invalid FEN provided to editor:", e);
            this.currentPosition = this.fenToPosition(window.APP_CONST?.STARTING_FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        }

        // Show Modal using Bootstrap API
        const bsModal = new bootstrap.Modal(this.modal);
        bsModal.show();

        // Responsive adjustment for AI reference image view
        const splitContainer = this.modal.querySelector('.board-editor-split');
        const rightPane = this.modal.querySelector('.editor-right-pane');
        const imgEl = document.getElementById('editor-reference-image');
        const placeholderEl = document.getElementById('editor-no-image-placeholder');
        
        if (rightPane && imgEl && splitContainer) {
            if (debugImage) {
                splitContainer.classList.add('has-image');
                rightPane.style.display = 'flex';
                imgEl.src = 'data:image/jpeg;base64,' + debugImage;
                imgEl.style.display = 'block';
                if (placeholderEl) placeholderEl.style.display = 'none';
                
                this.modal.querySelector('.modal-dialog').classList.remove('modal-lg');
                this.modal.querySelector('.modal-dialog').classList.add('modal-xl');
                this.hasDebugImage = true;
            } else {
                splitContainer.classList.remove('has-image');
                rightPane.style.display = 'none';
                
                this.modal.querySelector('.modal-dialog').classList.remove('modal-xl');
                this.modal.querySelector('.modal-dialog').classList.add('modal-lg');
                this.hasDebugImage = false;
            }
        }
        
        // Delay ensures container has correct dimensions before rendering
        setTimeout(() => {
            this.initializeEditorBoard();
            this.updateFENInput();
        }, 200);
    }
    
    /**
     * Handler for when the modal is fully visible. Loads current game state if empty.
     */
    onModalShown() {
        if (Object.keys(this.currentPosition).length === 0) {
             if (window.LOGIC_GAME && typeof window.LOGIC_GAME.getGame === 'function') {
                const chess = window.LOGIC_GAME.getGame();
                if (chess) {
                    this.currentPosition = this.fenToPosition(chess.fen());
                }
            } else {
                this.currentPosition = {};
            }
        }

        if (!this.hasDebugImage) {
            const splitContainer = this.modal.querySelector('.board-editor-split');
            const rightPane = this.modal.querySelector('.editor-right-pane');
            if (splitContainer) splitContainer.classList.remove('has-image');
            if (rightPane) rightPane.style.display = 'none';
            this.modal.querySelector('.modal-dialog').classList.remove('modal-xl');
            this.modal.querySelector('.modal-dialog').classList.add('modal-lg');
        }
        
        this.initializeEditorBoard();
        this.updateFENInput();
    }
    
    /**
     * Create or re-create the Chessboard.js instance in the editor.
     */
    initializeEditorBoard() {
        if (this.editorBoard) {
            this.editorBoard.destroy();
        }

        const isMoveMode = this.selectedTool === 'move';

        const config = {
            position: this.currentPosition,
            draggable: isMoveMode, 
            onDragStart: (source, piece) => {
                return isMoveMode; // Dragging only enabled in hand-tool mode
            },
            onDrop: isMoveMode ? this.onPieceMove.bind(this) : undefined,
            dropOffBoard: isMoveMode ? 'trash' : 'snapback',
            pieceTheme: window.APP_CONST?.PATHS?.PIECE_THEME || 'static/img/chesspieces/wikipedia/{piece}.png'
        };
        
        this.editorBoard = Chessboard('editorBoard', config);
        
        // Ensure board fills container after transitions
        [150, 400, 800].forEach(delay => {
            setTimeout(() => {
                if (this.editorBoard && typeof this.editorBoard.resize === 'function') {
                    this.editorBoard.resize();
                }
            }, delay);
        });
    }

    /**
     * Setup robust resizing logic using ResizeObserver and window listeners.
     */
    _setupResize() {
        if (this._resizeInitialized) return;

        // Trigger resize on window size changes
        window.addEventListener('resize', () => {
            [50, 250, 600].forEach(delay => {
                setTimeout(() => {
                    if (this.editorBoard && typeof this.editorBoard.resize === 'function') {
                        this.editorBoard.resize();
                    }
                }, delay);
            });
        });

        // Trigger resize when internal container shifts (e.g. Inspect Tool toggle)
        const observer = new ResizeObserver(() => {
            if (this.editorBoard && typeof this.editorBoard.resize === 'function') {
                this.editorBoard.resize();
            }
        });

        const wrapper = document.querySelector('.editor-board-wrapper');
        if (wrapper) {
            observer.observe(wrapper);
        }

        this._resizeInitialized = true;
    }

    /**
     * Callback when a piece is dragged and dropped within the board.
     */
    onPieceMove(source, target, piece, newPos, oldPos, orientation) {
        if (target === 'offboard') {
            delete this.currentPosition[source];
            this.updateFENInput();
            this.validatePosition();
            return;
        }

        if (source === target) return;
        
        delete this.currentPosition[source];
        this.currentPosition[target] = piece;
        
        this.updateFENInput();
        this.validatePosition();

        setTimeout(() => this.updateBoardUI(), 50);
    }
    
    /**
     * Add click and touch listeners to the board container.
     */
    addBoardClickHandler() {
        const boardEl = document.getElementById('editorBoard');
        if (!boardEl || this._boardInteractionsInitialized) return;
        
        const handleInteraction = (e) => {
            const squareEl = e.target.closest('.square-55d63');
            if (squareEl) {
                const squareId = squareEl.getAttribute('data-square');
                if (squareId) this.handleSquareClick(squareId);
            }
        };
        
        boardEl.addEventListener('click', handleInteraction);
        
        // Critical for touch devices: explicitly disable passive behavior to allow preventDefault
        boardEl.addEventListener('touchstart', (e) => {
            if (this.selectedTool || this.selectedPiece) {
                if (e.target.closest('img') && e.cancelable) {
                    e.preventDefault(); // Stop scrolling while dragging
                }
            }
        }, { passive: false });

        // HTML5 Drag-Drop for Sidebar Pieces
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

        this._boardInteractionsInitialized = true;
    }
    
    /**
     * Logic for clicking a square on the board (Add/Delete piece).
     * @param {string} square - Square ID (e.g. 'e4').
     */
    handleSquareClick(square) {
        if (this.selectedTool === 'delete') {
            delete this.currentPosition[square];
        } else if (this.selectedPiece) {
            this.currentPosition[square] = this.selectedPiece;
        } else {
            return; 
        }
        
        this.updateBoardUI();
        this.updateFENInput();
        this.validatePosition();
    }

    /**
     * Synchronize the visual state of the board with internal position object.
     */
    updateBoardUI() {
        if (this.editorBoard) {
            this.editorBoard.position(this.currentPosition, false);
        } else {
            this.recreateBoard();
        }
    }
    
    /**
     * Setup listeners for the piece selection sidebar (Laptop & Tablet).
     */
    setupPieceSelectors() {
        const pieceButtons = document.querySelectorAll('.btn-piece');
        
        pieceButtons.forEach(btn => {
            const pieceCode = btn.getAttribute('data-piece');
            
            btn.addEventListener('click', () => {
                pieceButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedPiece = pieceCode;
                this.selectedTool = null;
                document.querySelectorAll('.btn-editor-tool').forEach(b => {
                    b.classList.remove('active', 'active-danger', 'active-success');
                });
                this.recreateBoard(); 
            });

            const img = btn.querySelector('img');
            if (img) {
                // PC Drag
                img.addEventListener('dragstart', (e) => {
                    e.dataTransfer.setData('piece', pieceCode);
                    btn.classList.add('dragging');
                });
                img.addEventListener('dragend', () => {
                    btn.classList.remove('dragging');
                });

                // Mobile/Tablet Touch Drag Shim
                this._setupTouchDrag(img, pieceCode);
            }
        });
    }

    /**
     * Custom Touch Drag Shim to support piece dragging on mobile devices.
     * @param {HTMLElement} imgEl - The piece image element.
     * @param {string} pieceCode - The piece code (e.g. 'wK').
     */
    _setupTouchDrag(imgEl, pieceCode) {
        let touchPiece = null;
        
        imgEl.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            
            // Create a ghost piece to move around following the finger
            touchPiece = document.createElement('img');
            touchPiece.src = imgEl.src;
            touchPiece.style.position = 'fixed';
            touchPiece.style.width = '45px';
            touchPiece.style.height = '45px';
            touchPiece.style.zIndex = '10000';
            touchPiece.style.pointerEvents = 'none';
            touchPiece.style.opacity = '0.8';
            touchPiece.style.left = (touch.clientX - 22) + 'px';
            touchPiece.style.top = (touch.clientY - 22) + 'px';
            document.body.appendChild(touchPiece);
            
            if (e.cancelable) e.preventDefault();
        }, { passive: false });

        imgEl.addEventListener('touchmove', (e) => {
            if (!touchPiece) return;
            const touch = e.touches[0];
            touchPiece.style.left = (touch.clientX - 22) + 'px';
            touchPiece.style.top = (touch.clientY - 22) + 'px';
            if (e.cancelable) e.preventDefault();
        }, { passive: false });

        imgEl.addEventListener('touchend', (e) => {
            if (!touchPiece) return;
            
            const touch = e.changedTouches[0];
            const dropEl = document.elementFromPoint(touch.clientX, touch.clientY);
            const squareEl = dropEl?.closest('.square-55d63');
            const squareId = squareEl?.getAttribute('data-square');

            if (squareId) {
                this.currentPosition[squareId] = pieceCode;
                this.updateBoardUI();
                this.updateFENInput();
                this.validatePosition();
            }

            if (touchPiece.parentNode) document.body.removeChild(touchPiece);
            touchPiece = null;
        }, { passive: false });
    }
    
    /**
     * Setup move and delete tool buttons.
     */
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
                this.recreateBoard(); 
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
                this.recreateBoard(); 
            });
        }
    }
    
    /**
     * Setup Board Control Buttons (Clear, Flip, Reset).
     */
    setupControlButtons() {
        const clearBtn = document.getElementById('editor-clear-board');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.currentPosition = {};
                this.recreateBoard();
                this.updateFENInput();
                this.hideValidationError();
            });
        }
        
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
        
        // Manual FEN application
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
    
    /**
     * Complete destruction and re-creation of the board instance.
     * Needed when changing draggability settings.
     */
    recreateBoard() {
        if (this.editorBoard) {
            this.editorBoard.destroy();
        }
        
        const isMoveMode = this.selectedTool === 'move';

        const config = {
            position: this.currentPosition,
            draggable: isMoveMode,
            onDragStart: (source, piece) => isMoveMode,
            onDrop: isMoveMode ? this.onPieceMove.bind(this) : undefined,
            dropOffBoard: isMoveMode ? 'trash' : 'snapback',
            pieceTheme: window.APP_CONST?.PATHS?.PIECE_THEME || 'static/img/chesspieces/wikipedia/{piece}.png'
        };
        
        this.editorBoard = Chessboard('editorBoard', config);
        
        setTimeout(() => {
            if (this.editorBoard) this.editorBoard.resize();
        }, 100);
    }
    
    /**
     * Handle the main confirmation button.
     */
    setupDoneButton() {
        const doneBtn = document.getElementById('editor-done-btn');
        if (doneBtn) {
            doneBtn.addEventListener('click', () => {
                if (this.validatePosition()) {
                    this.applyPositionToMainBoard();
                    const modal = bootstrap.Modal.getInstance(this.modal);
                    if (modal) modal.hide();
                }
            });
        }
    }
    
    /**
     * Validate current position (Exactly one white king and one black king required).
     * @returns {boolean} True if valid.
     */
    validatePosition() {
        const pieces = Object.values(this.currentPosition);
        
        const whiteKings = pieces.filter(p => p === 'wK').length;
        const blackKings = pieces.filter(p => p === 'bK').length;
        
        if (whiteKings !== 1 || blackKings !== 1) {
            this.showValidationError('Mỗi bên phải có đúng 1 vua!');
            return false;
        }
        
        this.hideValidationError();
        return true;
    }
    
    /**
     * Show text alert message in the modal.
     * @param {string} message - Success or error text.
     */
    showValidationError(message) {
        const errorEl = document.getElementById('editor-validation-error');
        const messageEl = document.getElementById('editor-error-message');
        
        if (errorEl && messageEl) {
            messageEl.textContent = message;
            errorEl.classList.remove('d-none');
        }
    }
    
    /**
     * Hide validation alerts.
     */
    hideValidationError() {
        const errorEl = document.getElementById('editor-validation-error');
        if (errorEl) {
            errorEl.classList.add('d-none');
        }
    }
    
    /**
     * Update the text input field with the current FEN representation.
     */
    updateFENInput() {
        const fenInput = document.getElementById('editor-fen-input');
        if (fenInput) {
            fenInput.value = this.positionToFen(this.currentPosition);
        }
    }
    
    /**
     * Helper: Convert FEN string to internal position object.
     * @param {string} fen - FEN string.
     * @returns {Object} Position object.
     */
    fenToPosition(fen) {
        const parts = fen.split(' ');
        const rows = parts[0].split('/');
        const position = {};
        const files = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        
        rows.forEach((row, rowIndex) => {
            const rank = 8 - rowIndex;
            let fileIndex = 0;
            
            for (let char of row) {
                if (char >= '1' && char <= '8') {
                    fileIndex += parseInt(char);
                } else {
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
    
    /**
     * Helper: Convert internal position object to board-part FEN string.
     * @param {Object} position - Position object.
     * @returns {string} FEN string.
     */
    positionToFen(position) {
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
            if (emptyCount > 0) row += emptyCount;
            rows.push(row);
        }
        
        const startFen = window.APP_CONST?.STARTING_FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const suffix = startFen.split(' ').slice(1).join(' ');
        
        return rows.join('/') + ' ' + suffix;
    }
    
    /**
     * Apply the current editor position to the main game board.
     */
    applyPositionToMainBoard() {
        const fen = this.positionToFen(this.currentPosition);
        
        if (!window.LOGIC_GAME) {
            console.error('❌ No LOGIC_GAME found');
            alert('Không tìm thấy LOGIC_GAME. Vui lòng reload trang.');
            return;
        }
        
        try {
            if (typeof window.LOGIC_GAME.initChessboard === 'function') {
                const currentOrientation = document.getElementById('flip-board-switch')?.checked ? 'black' : 'white';
                window.LOGIC_GAME.initChessboard(currentOrientation, fen);
            } else {
                const chess = window.LOGIC_GAME.getGame();
                if (chess) chess.load(fen);
                if (typeof window.LOGIC_GAME.updateUI === 'function') window.LOGIC_GAME.updateUI();
            }
        } catch (e) {
            console.error('❌ Failed to apply position:', e);
            alert('Lỗi khi áp dụng vị trí: ' + e.message);
        }
    }

    /**
     * Setup Lightbox logic for full-screen viewing of AI reference image.
     */
    setupLightbox() {
        const thumbImg = document.getElementById('editor-reference-image');
        const lightbox = document.getElementById('editor-image-lightbox');
        const lightboxImg = document.getElementById('lightbox-img');
        const closeBtn = document.querySelector('.lightbox-close-btn');

        if (!thumbImg || !lightbox || !lightboxImg) return;

        thumbImg.addEventListener('click', () => {
            if (thumbImg.src && thumbImg.src !== window.location.href) {
                lightboxImg.src = thumbImg.src;
                lightbox.classList.remove('d-none');
            }
        });

        const closeLightbox = () => {
            lightbox.classList.add('d-none');
            lightboxImg.src = '';
        };

        if (closeBtn) closeBtn.addEventListener('click', closeLightbox);
        
        lightbox.addEventListener('click', (e) => {
            if (e.target === lightbox) closeLightbox();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && !lightbox.classList.contains('d-none')) {
                closeLightbox();
            }
        });
    }
}

// Global initialization
document.addEventListener('DOMContentLoaded', () => {
    window.BOARD_EDITOR = new BoardEditor();
});
