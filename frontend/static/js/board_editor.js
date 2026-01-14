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
        
        this.init();
    }
    
    init() {
        this.modal = document.getElementById('boardEditorModal');
        if (!this.modal) return;
        
        // Initialize when modal is shown
        this.modal.addEventListener('shown.bs.modal', () => this.onModalShown());
        
        // Setup event listeners
        this.setupPieceSelectors();
        this.setupToolButtons();
        this.setupControlButtons();
        this.setupDoneButton();
    }
    
    onModalShown() {
        // Get current position from main board via LOGIC_GAME
        if (window.LOGIC_GAME && typeof window.LOGIC_GAME.getGame === 'function') {
            const chess = window.LOGIC_GAME.getGame();
            if (chess) {
                this.currentPosition = this.fenToPosition(chess.fen());
            } else {
                this.currentPosition = {};
            }
        } else {
            // Start with empty board
            this.currentPosition = {};
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
            pieceTheme: 'static/img/chesspieces/wikipedia/{piece}.png'
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
        
        // Start position
        const startBtn = document.getElementById('editor-start-position');
        if (startBtn) {
            startBtn.addEventListener('click', () => {
                this.currentPosition = this.fenToPosition('rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
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
            pieceTheme: 'static/img/chesspieces/wikipedia/{piece}.png'
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
        
        return rows.join('/') + ' w KQkq - 0 1';
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.boardEditor = new BoardEditor();
});
