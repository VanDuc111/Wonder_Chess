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
        /** @type {Array|null} Raw detections from AI */
        this.allDetections = null;
        /** @type {number} Current piece confidence threshold */
        this.currentConf = 0.5;
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
        
        this.dom = {
            confControl: document.getElementById('editor-confidence-control'),
            confSlider: document.getElementById('conf-slider'),
            confVal: document.getElementById('conf-val'),
            detectionCanvas: document.getElementById('editor-detection-canvas'),
            lightboxCanvas: document.getElementById('editor-lightbox-canvas')
        };
        
        this._initialized = true;
        
        this.modal.addEventListener('hidden.bs.modal', () => {
             this.allDetections = null;
        });

        this.modal.addEventListener('shown.bs.modal', () => this.onModalShown());
        
        this.setupPieceSelectors();
        this.setupToolButtons();
        this.setupControlButtons();
        this.setupSettingsListeners();
        this.setupConfidenceSlider();
        this.setupDoneButton();
        this.setupLightbox();
        this._setupResize();
        this.addBoardClickHandler(); 
    }
    
    /**
     * Opens the editor with a specific FEN and optional AI debug image.
     * @param {string} fen
     * @param {string|null} mainImage Original or AI image
     * @param {Array|null} detections Optional raw detections
     * @param {string|null} debugImage Full debug image from backend (with boxes)
     */
    openWithFen(fen, mainImage = null, detections = null, debugImage = null) {
        if (!this.modal) this.init();
        if (!this.modal) return;

        this._isOpeningWithAI = true;
        this.allDetections = detections;
        this.debugBase64 = debugImage; // Keep for fallback
        this.currentConf = 0.5; // Reset to default

        try {
            this._loadFenToState(fen);
        } catch (e) {
            this._loadFenToState(APP_CONST?.STARTING_FEN || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1');
        }

        const bsModal = new bootstrap.Modal(this.modal);
        bsModal.show();

        this._toggleAIPreview(mainImage);
        this._updateConfidenceUI(mainImage !== null || this.debugBase64 !== null);
        
        // Ensure UI is ready after modal transition
        setTimeout(() => this.recreateBoard(), APP_CONST?.EDITOR?.RECREATE_DELAY || 200);
    }
    
    /**
     * Shows/hides confidence slider based on AI context.
     * @private
     */
    _updateConfidenceUI(show) {
        if (!this.dom.confControl) return;
        if (show && this.allDetections && this.allDetections.length > 0) {
            this.dom.confControl.classList.remove('d-none');
            if (this.dom.confSlider) this.dom.confSlider.value = this.currentConf;
            if (this.dom.confVal) this.dom.confVal.textContent = this.currentConf.toFixed(2);
            this.drawDetectionBoxes(this.currentConf);
        } else {
            this.dom.confControl.classList.add('d-none');
            this.clearDetectionCanvas();
        }
    }

    /**
     * Clears dynamic detection canvases.
     * @param {HTMLCanvasElement|null} specificCanvas 
     */
    clearDetectionCanvas(specificCanvas = null) {
        const canvases = specificCanvas ? [specificCanvas] : [this.dom.detectionCanvas, this.dom.lightboxCanvas];
        canvases.forEach(canvas => {
            if (!canvas) return;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        });
    }

    /**
     * Draws AI detection boxes on all overlay canvases.
     * @param {number} threshold 
     */
    drawDetectionBoxes(threshold) {
        if (!this.allDetections) return;

        // 1. Draw on preview thumbnail
        const previewImg = document.getElementById(APP_CONST?.IDS?.EDITOR_REF_IMAGE || 'editor-reference-image');
        this._renderBoxesOnCanvas(this.dom.detectionCanvas, previewImg, threshold);

        // 2. Draw on lightbox (if visible or initialized)
        const lightboxImg = document.getElementById(APP_CONST?.IDS?.EDITOR_LIGHTBOX_IMG || 'lightbox-img');
        this._renderBoxesOnCanvas(this.dom.lightboxCanvas, lightboxImg, threshold);
    }

    /**
     * Helper to draw boxes on a specific canvas overlaying a specific image.
     * @private
     */
    _renderBoxesOnCanvas(canvas, img, threshold) {
        if (!canvas || !img) return;
        
        // If image hasn't loaded yet, or has no dimensions, wait
        if (!img.complete || img.naturalWidth === 0) {
            if (img.src && !img.src.endsWith('base64,')) {
                img.onload = () => this._renderBoxesOnCanvas(canvas, img, threshold);
            }
            return;
        }

        const ctx = canvas.getContext('2d');
        const naturalW = img.naturalWidth;
        const naturalH = img.naturalHeight;
        
        if (naturalW === 0 || naturalH === 0) return;

        // Sync canvas size to displayed image size
        const rect = img.getBoundingClientRect();
        canvas.width = rect.width || img.clientWidth || img.width;
        canvas.height = rect.height || img.clientHeight || img.height;

        if (canvas.width === 0 || canvas.height === 0) {
            // Last fallback if everything is 0
            canvas.width = img.width;
            canvas.height = img.height;
        }

        canvas.style.display = 'block';
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        const scaleX = canvas.width / naturalW;
        const scaleY = canvas.height / naturalH;

        this.allDetections.forEach(det => {
            if (det.conf < threshold) return;

            const x = det.x * scaleX;
            const y = det.y * scaleY;
            const w = (det.w || 40) * scaleX;
            const h = (det.h || 50) * scaleY;

            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 2;
            ctx.strokeRect(x - w/2, y - h/2, w, h);

            ctx.fillStyle = '#00ff00';
            ctx.font = 'bold 12px Arial';
            ctx.fillText(det.class, x - w/2, y - h/2 - 5);
        });
    }

    /**
     * Initializes confidence slider listeners.
     */
    setupConfidenceSlider() {
        if (!this.dom.confSlider) return;
        this.dom.confSlider.addEventListener('input', (e) => {
            const val = parseFloat(e.target.value);
            this.currentConf = val;
            if (this.dom.confVal) this.dom.confVal.textContent = val.toFixed(2);
            this.updateFromDetections(val);
            this.drawDetectionBoxes(val);
        });
    }

    /**
     * Filters raw detections by threshold and updates board.
     * @param {number} threshold 
     */
    updateFromDetections(threshold) {
        if (!this.allDetections) return;
        
        const pos = {};
        // 1. Group by square, keep only those >= threshold
        const squareGroups = {};
        this.allDetections.forEach(det => {
            if (det.conf < threshold) return;
            const key = `${det.row},${det.col}`;
            if (!squareGroups[key] || det.conf > squareGroups[key].conf) {
                squareGroups[key] = det;
            }
        });

        // 2. King Guard: Chess logic often fails if we don't have kings. 
        // We'll trust the highest confidence kings.
        // (The backend already does some of this, but we're re-filtering)

        // 3. Map groups to board position
        const files = APP_CONST?.CHESS_RULES?.BOARD_FILES || ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
        Object.values(squareGroups).forEach(det => {
            if (det.row >= 0 && det.row < 8 && det.col >= 0 && det.col < 8) {
                const square = files[det.col] + (8 - det.row);
                // Convert FEN char ('P', 'k') to Piece Code ('wP', 'bK')
                const isWhite = det.char === det.char.toUpperCase();
                pos[square] = (isWhite ? 'w' : 'b') + det.char.toUpperCase();
            }
        });

        this.currentPosition = pos;
        this._syncAll();
    }

    /**
     * Updates the UI layout when an AI debug image is provided.
     * @private
     */
    _toggleAIPreview(currentImage) {
        const ids = APP_CONST?.IDS || {};
        const splitContainer = this.modal.querySelector('.board-editor-split');
        const rightPane = this.modal.querySelector('.editor-right-pane');
        const imgEl = document.getElementById(ids.EDITOR_REF_IMAGE || 'editor-reference-image');
        const placeholderEl = document.getElementById(ids.EDITOR_REF_PLACEHOLDER || 'editor-no-image-placeholder');
        
        if (!rightPane || !imgEl || !splitContainer) return;

        if (currentImage || this.debugBase64) {
            splitContainer.classList.add('has-image');
            rightPane.style.display = 'flex';
            
            // Fallback to full debug image if original is missing
            const imageSrc = currentImage || this.debugBase64;
            if (imageSrc) {
                imgEl.src = 'data:image/jpeg;base64,' + imageSrc;
                imgEl.style.display = 'block';
                if (placeholderEl) placeholderEl.style.display = 'none';
            } else {
                imgEl.style.display = 'none';
                if (placeholderEl) placeholderEl.style.display = 'block';
            }
            
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
     * Set up window resize listener to keep canvas in sync.
     * @private
     */
    _setupResize() {
        window.addEventListener('resize', () => {
            if (this.hasDebugImage) {
                this.drawDetectionBoxes(this.currentConf);
            }
        });
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
                // Allow layout engine to compute dimensions
                setTimeout(() => this.drawDetectionBoxes(this.currentConf), 50);
            }
        });

        const close = () => { 
            lb.classList.add('d-none'); 
            lbImg.src = ''; 
            this.clearDetectionCanvas(this.dom.lightboxCanvas);
        };
        lb.addEventListener('click', (e) => { if (e.target === lb || e.target.closest('.lightbox-close-btn')) close(); });
        document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
    }
}
