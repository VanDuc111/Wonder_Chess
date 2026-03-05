/**
 * @fileoverview Board Editor Module - Allows users to visually edit chess positions.
 * Handles piece placement, FEN parsing, and synchronization with the main game board.
 */

import { APP_CONST } from '../constants.js';

export class BoardEditor {
    constructor() {
        /** @type {Object|null} Chessboard.js instance */
        this.editorBoard = null;
        /** @type {string|null} Selected piece code (e.g., 'wK') */
        this.selectedPiece = null;
        /** @type {string|null} Active tool ('move', 'delete') */
        this.selectedTool = null;
        /** @type {Object} Position mapping (square -> pieceCode) */
        this.currentPosition = {};
        /** @type {string} Current turn ('w' or 'b') */
        this.currentTurn = 'w';
        /** @type {string} Castling rights string */
        this.currentCastling = APP_CONST?.EDITOR?.DEFAULT_CASTLING || 'KQkq';
        /** @type {HTMLElement|null} Modal container */
        this.modal = null;
        /** @type {boolean} Flag for AI reference image presence */
        this.hasDebugImage = false; 
        /** @type {boolean} Internal flag for AI-initiated opening */
        this._isOpeningWithAI = false;
        /** @type {boolean} Flag for overall initialization */
        this._initialized = false;
    }
    
    /**
     * Initializes the module by caching DOM and setting up listeners.
     */
    init() {
        if (this._initialized) return;
        const ids = APP_CONST?.IDS || {};
        this.modal = document.getElementById(ids.EDITOR_MODAL || 'boardEditorModal');
        if (!this.modal) return;
        
        this._initialized = true;
        
        this.modal.addEventListener('shown.bs.modal', () => this.onModalShown());
        
        this.setupPieceSelectors();
        this.setupToolButtons();
        this.setupControlButtons();
        this.setupSettingsListeners();
        this.setupDoneButton();
        this.setupLightbox();
        this._setupResize();
        this.addBoardClickHandler(); 
    }
    
    /**
     * Opens the editor with a specific FEN and optional AI debug image.
     * @param {string} fen
     * @param {string|null} debugImage Base64 string
     */
    openWithFen(fen, debugImage = null) {
        if (!this.modal) this.init();
        if (!this.modal) return;

        this._isOpeningWithAI = true;
        try {
            this._loadFenToState(fen);
        } catch (e) {
            this._loadFenToState(APP_CONST?.STARTING_FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        }

        const bsModal = new bootstrap.Modal(this.modal);
        bsModal.show();

        this._toggleAIPreview(debugImage);
        
        // Ensure UI is ready after modal transition
        setTimeout(() => this.recreateBoard(), APP_CONST?.EDITOR?.RECREATE_DELAY || 200);
    }
    
    /**
     * Updates the UI layout when an AI debug image is provided.
     * @private
     */
    _toggleAIPreview(debugImage) {
        const ids = APP_CONST?.IDS || {};
        const splitContainer = this.modal.querySelector('.board-editor-split');
        const rightPane = this.modal.querySelector('.editor-right-pane');
        const imgEl = document.getElementById(ids.EDITOR_REF_IMAGE || 'editor-reference-image');
        const placeholderEl = document.getElementById(ids.EDITOR_REF_PLACEHOLDER || 'editor-no-image-placeholder');
        
        if (!rightPane || !imgEl || !splitContainer) return;

        if (debugImage) {
            splitContainer.classList.add('has-image');
            rightPane.style.display = 'flex';
            imgEl.src = 'data:image/jpeg;base64,' + debugImage;
            imgEl.style.display = 'block';
            if (placeholderEl) placeholderEl.style.display = 'none';
            
            const dialog = this.modal.querySelector('.modal-dialog');
            dialog.classList.remove('modal-lg');
            dialog.classList.add('modal-xl');
            
            this.hasDebugImage = true;
        } else {
            splitContainer.classList.remove('has-image');
            rightPane.style.display = 'none';
            
            const dialog = this.modal.querySelector('.modal-dialog');
            dialog.classList.remove('modal-xl');
            dialog.classList.add('modal-lg');
            
            this.hasDebugImage = false;
        }
    }

    /**
     * Handler for Bootstrap modal 'shown' event.
     */
    onModalShown() {
        if (!this._isOpeningWithAI) {
            const mainGame = window.LOGIC_GAME?.game;
            if (mainGame) this._loadFenToState(mainGame.fen());
            this._toggleAIPreview(null); // Ensure AI pane is hidden for manual edit
        }
        
        this._isOpeningWithAI = false;
        this.selectedTool = null;
        
        // Use a short delay even in onModalShown to guarantee container dims
        setTimeout(() => this.recreateBoard(), APP_CONST?.EDITOR?.ON_SHOWN_DELAY || 50);
    }
    
    /**
     * Parses a FEN string into the editor's internal state.
     * @private
     */
    _loadFenToState(fen) {
        const parts = fen.split(' ');
        this.currentPosition = this.fenToPosition(parts[0]);
        this.currentTurn = parts[1] || 'w';
        this.currentCastling = parts[2] || '-';
    }

    /**
     * Setup listeners for side-to-move and castling rights.
     */
    setupSettingsListeners() {
        const ids = APP_CONST?.IDS || {};
        
        document.querySelectorAll('input[name="editor-turn"]').forEach(radio => {
            radio.addEventListener('change', () => {
                if (radio.checked) {
                    this.currentTurn = radio.value;
                    this.updateFENInput();
                }
            });
        });

        const checks = [
            { id: ids.EDITOR_CASTLE_WK || 'castling-wk', val: 'K' },
            { id: ids.EDITOR_CASTLE_WQ || 'castling-wq', val: 'Q' },
            { id: ids.EDITOR_CASTLE_BK || 'castling-bk', val: 'k' },
            { id: ids.EDITOR_CASTLE_BQ || 'castling-bq', val: 'q' }
        ];

        checks.forEach(c => {
            const el = document.getElementById(c.id);
            if (el) el.addEventListener('change', () => {
                this._updateCastlingStateFromUI();
                this.updateFENInput();
            });
        });
    }

    /**
     * Rebuilds the castling rights string from UI checkbox states.
     * @private
     */
    _updateCastlingStateFromUI() {
        const ids = APP_CONST?.IDS || {};
        let c = '';
        if (document.getElementById(ids.EDITOR_CASTLE_WK || 'castling-wk')?.checked) c += 'K';
        if (document.getElementById(ids.EDITOR_CASTLE_WQ || 'castling-wq')?.checked) c += 'Q';
        if (document.getElementById(ids.EDITOR_CASTLE_BK || 'castling-bk')?.checked) c += 'k';
        if (document.getElementById(ids.EDITOR_CASTLE_BQ || 'castling-bq')?.checked) c += 'q';
        this.currentCastling = c || '-';
    }

    /**
     * Re-creates the ChessboardJS instance with current draggability settings.
     */
    recreateBoard() {
        const ids = APP_CONST?.IDS || {};
        if (this.editorBoard) this.editorBoard.destroy();
        
        const isMoveMode = this.selectedTool === 'move';
        this.editorBoard = Chessboard(ids.EDITOR_BOARD || 'editorBoard', {
            position: this.currentPosition,
            draggable: isMoveMode,
            onDragStart: () => isMoveMode,
            onDrop: isMoveMode ? this.onPieceMove.bind(this) : undefined,
            dropOffBoard: isMoveMode ? 'trash' : 'snapback',
            pieceTheme: APP_CONST?.PATHS?.PIECE_THEME || 'static/img/chesspieces/wikipedia/{piece}.png'
        });

        this.updateSettingsUI();
        this.updateFENInput();
        
        // Multi-stage resize to handle CSS transitions
        const stages = APP_CONST?.EDITOR?.RESIZE_STAGES || [150, 400, 800];
        stages.forEach(d => setTimeout(() => this.editorBoard?.resize(), d));
    }

    /**
     * Updates the settings sidebar UI to match internal state.
     */
    updateSettingsUI() {
        const ids = APP_CONST?.IDS || {};
        const turnRadio = document.querySelector(`input[name="editor-turn"][value="${this.currentTurn}"]`);
        if (turnRadio) turnRadio.checked = true;

        const setC = (id, char) => {
            const el = document.getElementById(id);
            if (el) el.checked = this.currentCastling.includes(char);
        };
        setC(ids.EDITOR_CASTLE_WK || 'castling-wk', 'K');
        setC(ids.EDITOR_CASTLE_WQ || 'castling-wq', 'Q');
        setC(ids.EDITOR_CASTLE_BK || 'castling-bk', 'k');
        setC(ids.EDITOR_CASTLE_BQ || 'castling-bq', 'q');
    }

    /**
     * Internal resize management using ResizeObserver.
     * @private
     */
    _setupResize() {
        if (this._resizeInitialized) return;
        window.addEventListener('resize', () => {
            const delay = APP_CONST?.UI_CONFIG?.RESIZE_DEBOUNCE_MS || 150;
            setTimeout(() => this.editorBoard?.resize(), delay);
        });

        const observer = new ResizeObserver(() => this.editorBoard?.resize());
        const wrapper = document.querySelector('.editor-board-wrapper');
        if (wrapper) observer.observe(wrapper);
        this._resizeInitialized = true;
    }

    /**
     * Handler for piece movement within the editor board.
     */
    onPieceMove(source, target, piece) {
        if (target === 'offboard') {
            delete this.currentPosition[source];
        } else if (source !== target) {
            delete this.currentPosition[source];
            this.currentPosition[target] = piece;
        } else {
            return;
        }
        
        this.updateFENInput();
        this.validatePosition();
        setTimeout(() => this.updateBoardUI(), APP_CONST?.EDITOR?.SYNC_DELAY || 50);
    }
    
    /**
     * Attaches click and drag-drop listeners to the board container.
     */
    addBoardClickHandler() {
        const ids = APP_CONST?.IDS || {};
        const boardEl = document.getElementById(ids.EDITOR_BOARD || 'editorBoard');
        if (!boardEl || this._boardInteractionsInitialized) return;
        
        boardEl.addEventListener('click', (e) => {
            const sqSelector = APP_CONST?.EDITOR?.SQUARE_SELECTOR || '.square-55d63';
            const sq = e.target.closest(sqSelector)?.getAttribute('data-square');
            if (sq) this.handleSquareClick(sq);
        });
        
        boardEl.addEventListener('touchstart', (e) => {
            if ((this.selectedTool || this.selectedPiece) && e.target.closest('img') && e.cancelable) {
                e.preventDefault();
            }
        }, { passive: false });

        boardEl.addEventListener('dragover', (e) => e.preventDefault());
        boardEl.addEventListener('drop', (e) => {
            e.preventDefault();
            const p = e.dataTransfer.getData('piece');
            const sqSelector = APP_CONST?.EDITOR?.SQUARE_SELECTOR || '.square-55d63';
            const sq = e.target.closest(sqSelector)?.getAttribute('data-square');
            if (p && sq) {
                this.currentPosition[sq] = p;
                this._syncAll();
            }
        });

        this._boardInteractionsInitialized = true;
    }
    
    /**
     * Processes square selection when a tool or piece is active.
     */
    handleSquareClick(square) {
        if (this.selectedTool === 'delete') {
            delete this.currentPosition[square];
        } else if (this.selectedPiece) {
            this.currentPosition[square] = this.selectedPiece;
        } else {
            return; 
        }
        this._syncAll();
    }

    /**
     * Shorthand for full UI/State synchronization.
     * @private
     */
    _syncAll() {
        this.updateBoardUI();
        this.updateFENInput();
        this.validatePosition();
    }

    /**
     * Updates the visual board position without re-creating the instance.
     */
    updateBoardUI() {
        if (this.editorBoard) this.editorBoard.position(this.currentPosition, false);
        else this.recreateBoard();
    }
    
    /**
     * Setup piece palette listeners with touch-drag support.
     */
    setupPieceSelectors() {
        const btns = document.querySelectorAll('.btn-piece');
        btns.forEach(btn => {
            const code = btn.getAttribute('data-piece');
            btn.addEventListener('click', () => {
                btns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedPiece = code;
                this.selectedTool = null;
                this._clearToolSelection();
                this.recreateBoard(); 
            });

            const img = btn.querySelector('img');
            if (img) {
                img.addEventListener('dragstart', (e) => e.dataTransfer.setData('piece', code));
                this._setupTouchDrag(img, code);
            }
        });
    }

    /**
     * Clears visual 'active' states from toolbar buttons.
     * @private
     */
    _clearToolSelection() {
        document.querySelectorAll('.btn-editor-tool').forEach(b => {
            b.classList.remove('active', 'active-danger', 'active-success');
        });
    }

    /**
     * Touch-drag shim for mobile editing.
     * @private
     */
    _setupTouchDrag(imgEl, pieceCode) {
        let touchPiece = null;
        imgEl.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            touchPiece = document.createElement('img');
            touchPiece.src = imgEl.src;
            const size = APP_CONST?.EDITOR?.TOUCH_PIECE_SIZE || 45;
            const offset = APP_CONST?.EDITOR?.TOUCH_PIECE_OFFSET || 22;
            const zIndex = APP_CONST?.EDITOR?.TOUCH_PIECE_Z_INDEX || 10000;
            const opacity = APP_CONST?.EDITOR?.TOUCH_PIECE_OPACITY || 0.8;

            Object.assign(touchPiece.style, {
                position: 'fixed', 
                width: size + 'px', 
                height: size + 'px', 
                zIndex: zIndex,
                pointerEvents: 'none', 
                opacity: opacity,
                left: (touch.clientX - offset) + 'px', 
                top: (touch.clientY - offset) + 'px'
            });
            document.body.appendChild(touchPiece);
            if (e.cancelable) {
                e.preventDefault();
            }
        }, { passive: false });

        const move = (e) => {
            if (!touchPiece) return;
            const t = e.touches[0];
            const offset = APP_CONST?.EDITOR?.TOUCH_PIECE_OFFSET || 22;
            touchPiece.style.left = (t.clientX - offset) + 'px';
            touchPiece.style.top = (t.clientY - offset) + 'px';
            if (e.cancelable) {
                e.preventDefault();
            }
        };
        imgEl.addEventListener('touchmove', move, { passive: false });

        imgEl.addEventListener('touchend', (e) => {
            if (!touchPiece) return;
            const t = e.changedTouches[0];
            const sqSelector = APP_CONST?.EDITOR?.SQUARE_SELECTOR || '.square-55d63';
            const sq = document.elementFromPoint(t.clientX, t.clientY)?.closest(sqSelector)?.getAttribute('data-square');
            if (sq) {
                this.currentPosition[sq] = pieceCode;
                this._syncAll();
            }
            if (touchPiece.parentNode) touchPiece.parentNode.removeChild(touchPiece);
            touchPiece = null;
        }, { passive: false });
    }
    
    /**
     * Setup move (hand) and delete (trash) tools.
     */
    setupToolButtons() {
        const ids = APP_CONST?.IDS || {};
        const delBtn = document.getElementById(ids.EDITOR_DELETE_TOOL || 'editor-delete-piece');
        const handBtn = document.getElementById(ids.EDITOR_HAND_TOOL || 'editor-hand-tool');
        
        const toggle = (btn, tool, css) => {
            if (!btn) return;
            btn.addEventListener('click', () => {
                const active = btn.classList.contains(css);
                document.querySelectorAll('.btn-piece').forEach(b => b.classList.remove('active'));
                this._clearToolSelection();
                if (!active) {
                    btn.classList.add(css);
                    this.selectedTool = tool;
                    this.selectedPiece = null;
                } else {
                    this.selectedTool = null;
                }
                this.recreateBoard();
            });
        };

        toggle(delBtn, 'delete', 'active-danger');
        toggle(handBtn, 'move', 'active-success');
    }
    
    /**
     * Setup Board Control Buttons (Clear, Flip, Reset).
     */
    setupControlButtons() {
        const ids = APP_CONST?.IDS || {};
        const startFen = APP_CONST?.STARTING_FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

        const btn = (id, fn) => document.getElementById(id)?.addEventListener('click', fn);

        btn(ids.EDITOR_CLEAR_BTN || 'editor-clear-board', () => {
            this.currentPosition = {};
            this.currentTurn = 'w';
            this.currentCastling = '-';
            this.recreateBoard();
            this.hideValidationError();
        });
        
        btn(ids.EDITOR_FLIP_BTN || 'editor-flip-board', () => this.editorBoard?.flip());
        
        btn(ids.EDITOR_START_BTN || 'editor-start-position', () => {
            this._loadFenToState(startFen);
            this.recreateBoard();
        });
        
        btn(ids.EDITOR_APPLY_FEN_BTN || 'editor-apply-fen', () => {
            const input = document.getElementById(ids.EDITOR_FEN_INPUT || 'editor-fen-input');
            if (input) {
                try {
                     this._loadFenToState(input.value.trim());
                    this.recreateBoard();
                } catch (e) {
                    this.showValidationError(APP_CONST?.MESSAGES?.ERROR_INVALID_FEN || 'FEN không hợp lệ');
                }
            }
        });
    }
    
    /**
     * Setup main confirmation/done button.
     */
    setupDoneButton() {
        const ids = APP_CONST?.IDS || {};
        document.getElementById(ids.EDITOR_DONE_BTN || 'editor-done-btn')?.addEventListener('click', () => {
            if (this.validatePosition()) {
                this.applyPositionToMainBoard();
                bootstrap.Modal.getInstance(this.modal)?.hide();
            }
        });
    }
    
    /**
     * Validates the current board state (Kings requirement).
     * @returns {boolean}
     */
    validatePosition() {
        const p = Object.values(this.currentPosition);
        if (p.filter(x => x === 'wK').length !== 1 || p.filter(x => x === 'bK').length !== 1) {
            this.showValidationError(APP_CONST?.MESSAGES?.INVALID_FEN_KING || 'Mỗi bên phải có đúng 1 vua!');
            return false;
        }
        this.hideValidationError();
        return true;
    }
    
    /**
     * Shows a validation alert in the editor modal.
     */
    showValidationError(msg) {
        const ids = APP_CONST?.IDS || {};
        const errEl = document.getElementById(ids.EDITOR_VALIDATION_ERROR || 'editor-validation-error');
        const msgEl = document.getElementById(ids.EDITOR_ERROR_MSG || 'editor-error-message');
        if (errEl && msgEl) {
            msgEl.textContent = msg;
            errEl.classList.remove('d-none');
        }
    }
    
    /**
     * Hides the validation alert.
     */
    hideValidationError() {
        const ids = APP_CONST?.IDS || {};
        document.getElementById(ids.EDITOR_VALIDATION_ERROR || 'editor-validation-error')?.classList.add('d-none');
    }
    
    /**
     * Updates the FEN text input with the current editor state.
     */
    updateFENInput() {
        const ids = APP_CONST?.IDS || {};
        const el = document.getElementById(ids.EDITOR_FEN_INPUT || 'editor-fen-input');
        if (el) el.value = this.positionToFen(this.currentPosition);
    }
    
    /**
     * Utility: Converts FEN pieces-part to position object.
     */
    fenToPosition(fen) {
        const rows = fen.split(' ')[0].split('/');
        const pos = {};
        const files = APP_CONST?.CHESS_RULES?.BOARD_FILES || ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        rows.forEach((row, i) => {
            const rank = 8 - i;
            let fileIdx = 0;
            for (let char of row) {
                if (char >= '1' && char <= '8') fileIdx += parseInt(char);
                else {
                    pos[files[fileIdx] + rank] = (char === char.toUpperCase() ? 'w' : 'b') + char.toUpperCase();
                    fileIdx++;
                }
            }
        });
        return pos;
    }
    
    /**
     * Utility: Converts position object to complete FEN string.
     */
    positionToFen(pos) {
        const files = APP_CONST?.CHESS_RULES?.BOARD_FILES || ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        const rows = [];
        for (let r = 8; r >= 1; r--) {
            let row = '', empty = 0;
            for (let f of files) {
                const p = pos[f + r];
                if (p) {
                    if (empty > 0) { row += empty; empty = 0; }
                    row += p[0] === 'w' ? p[1] : p[1].toLowerCase();
                } else empty++;
            }
            if (empty > 0) row += empty;
            rows.push(row);
        }
        const startFen = APP_CONST?.STARTING_FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
        const suffix = startFen.split(' ').slice(3).join(' ');
        return `${rows.join('/')} ${this.currentTurn} ${this.currentCastling} ${suffix}`;
    }
    
    /**
     * Syncs the edited position back to the main LogicGame orchestrator.
     */
    applyPositionToMainBoard() {
        const fen = this.positionToFen(this.currentPosition);
        if (!window.LOGIC_GAME) return alert(APP_CONST?.MESSAGES?.SYSTEM_NOT_READY || 'Lỗi: Hệ thống chưa sẵn sàng.');
        
        try {
            const ids = APP_CONST?.IDS || {};
            const orientation = document.getElementById(ids.FLIP_BOARD_SWITCH || 'flip-board-switch')?.checked ? 'black' : 'white';
            window.LOGIC_GAME.initBoard(orientation, fen);
        } catch (e) {
            console.error('Apply Position Error:', e);
        }
    }

    /**
     * Setup Lightbox for full-screen analysis image preview.
     */
    setupLightbox() {
        const ids = APP_CONST?.IDS || {};
        const thumb = document.getElementById(ids.EDITOR_REF_IMAGE || 'editor-reference-image');
        const lb = document.getElementById(ids.EDITOR_LIGHTBOX || 'editor-image-lightbox');
        const lbImg = document.getElementById(ids.EDITOR_LIGHTBOX_IMG || 'lightbox-img');
        if (!thumb || !lb || !lbImg) return;

        thumb.addEventListener('click', () => {
            if (thumb.src && !thumb.src.endsWith('/')) {
                lbImg.src = thumb.src;
                lb.classList.remove('d-none');
            }
        });

        const close = () => { lb.classList.add('d-none'); lbImg.src = ''; };
        lb.addEventListener('click', (e) => { if (e.target === lb || e.target.closest('.lightbox-close-btn')) close(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }
}
