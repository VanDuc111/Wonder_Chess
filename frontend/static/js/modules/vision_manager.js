/**
 * @fileoverview Vision management for WonderChess.
 * Handles webcam scanning, image analysis, and board recognition.
 */

import { APP_CONST } from '../constants.js';

export class VisionManager {
    constructor() {
        /** @type {MediaStream|null} Current webcam stream */
        this.currentWebcamStream = null;
        /** @type {number|null} ID of the active auto-scan timeout */
        this.autoScanInterval = null;
        /** @type {number} Delay between auto-scans in ms */
        this.autoScanDelay = (APP_CONST && APP_CONST.AUTO_SCAN && APP_CONST.AUTO_SCAN.DELAY_MS) 
            ? APP_CONST.AUTO_SCAN.DELAY_MS : 5000;

        /** @type {Object<string, HTMLElement|null>} DOM element cache */
        this.dom = {
            video: null,
            scanStatus: null,
            imageStatus: null,
            autoScanToggle: null,
            captureBtn: null,
            debugOverlay: null,
            // Drag & Drop
            dropZone: null,
            imageInput: null,
            filePreview: null,
            previewImg: null,
            fileName: null,
            fileSize: null,
            removeFileBtn: null,
            browseBtn: null,
            // Tabs
            liveScanTab: null,
            otherTabs: []
        };
    }

    /**
     * Ensures mandatory DOM elements are cached.
     * @private
     */
    _ensureDom() {
        if (this.dom.video) return;

        const ids = APP_CONST?.IDS || {};
        
        this.dom.video = document.getElementById(ids.WEBCAM_VIDEO || 'webcam-feed');
        this.dom.scanStatus = document.getElementById(ids.SCAN_STATUS || 'scan-status');
        this.dom.imageStatus = document.getElementById(ids.IMAGE_UPLOAD_STATUS || 'image-upload-status');
        this.dom.autoScanToggle = document.getElementById(ids.AUTO_SCAN_TOGGLE || 'auto-scan-toggle');
        this.dom.captureBtn = document.getElementById(ids.CAPTURE_BTN || 'capture-btn');
        this.dom.debugOverlay = document.getElementById(ids.DEBUG_OVERLAY || 'debug-overlay');
        
        // Drag & Drop elements
        this.dom.dropZone = document.getElementById(ids.DROP_ZONE || 'drop-zone');
        this.dom.imageInput = document.getElementById(ids.IMAGE_UPLOAD_INPUT || 'image-upload-input');
        this.dom.filePreview = document.getElementById(ids.FILE_PREVIEW || 'file-preview');
        this.dom.previewImg = document.getElementById(ids.PREVIEW_IMG || 'preview-img');
        this.dom.fileName = document.getElementById(ids.FILE_NAME || 'file-name');
        this.dom.fileSize = document.getElementById(ids.FILE_SIZE || 'file-size');
        this.dom.removeFileBtn = document.getElementById(ids.REMOVE_FILE_BTN || 'remove-file-btn');
        this.dom.browseBtn = document.getElementById(ids.BROWSE_BTN || 'browse-btn');

        // Tabs
        this.dom.liveScanTab = document.getElementById(ids.LIVE_SCAN_TAB || 'live-scan-tab');
        this.dom.otherTabs = ['pgn-tab', 'fen-tab', 'image-tab'] // Standard Bootstrap IDs
            .map(id => document.getElementById(id))
            .filter(el => el !== null);
    }

    /**
     * Initializes the vision manager and attaches event listeners.
     */
    init() {
        this._ensureDom();
        this._initTabListeners();
        this._initAutoScanListeners();
        this._initDragAndDropListeners();
        this._initModalListeners();
    }

    /**
     * Resets the entire Vision UI (previews, statuses, overlays).
     */
    resetUI() {
        this._ensureDom();
        
        // 1. Reset Live Scan tab
        if (this.dom.debugOverlay) {
            this.dom.debugOverlay.src = '';
            this.dom.debugOverlay.style.display = 'none';
        }
        if (this.dom.scanStatus) {
            this.dom.scanStatus.textContent = APP_CONST?.MESSAGES?.ALICE_IDLE || 'Sẵn sàng...';
            this.dom.scanStatus.style.color = '';
        }
        if (this.dom.autoScanToggle) {
            this.dom.autoScanToggle.checked = false;
        }
        if (this.autoScanInterval) {
            clearTimeout(this.autoScanInterval);
            this.autoScanInterval = null;
        }

        // 2. Reset Image Upload tab
        if (this.dom.imageInput) this.dom.imageInput.value = '';
        if (this.dom.previewImg) this.dom.previewImg.src = '';
        this.dom.filePreview?.classList.add('d-none');
        this.dom.dropZone?.classList.remove('has-file');
        if (this.dom.imageStatus) {
            this.dom.imageStatus.textContent = APP_CONST?.MESSAGES?.VISION_SUPPORTED_FORMATS || "Định dạng hỗ trợ: JPG, PNG. Ảnh rõ nét sẽ cho kết quả chính xác nhất.";
        }
    }

    /**
     * Listens for the parent Bootstrap modal events to manage camera and UI state.
     * @private
     */
    _initModalListeners() {
        const modalId = APP_CONST?.IDS?.LOAD_DATA_MODAL || 'loadDataModal';
        const modalEl = document.getElementById(modalId);
        if (!modalEl) return;

        // Reset and stop when hidden
        modalEl.addEventListener('hidden.bs.modal', () => {
            this.stopWebcam();
            this.resetUI();
        });

        // Auto-start if tab is active when shown
        modalEl.addEventListener('shown.bs.modal', () => {
            if (this.dom.liveScanTab && this.dom.liveScanTab.classList.contains('active')) {
                this.startWebcam();
            }
        });
    }

    /**
     * Initializes tab switch listeners to start/stop webcam.
     * @private
     */
    _initTabListeners() {
        if (this.dom.liveScanTab) {
            this.dom.liveScanTab.addEventListener('shown.bs.tab', () => this.startWebcam());
        }

        this.dom.otherTabs.forEach(tab => {
            tab.addEventListener('shown.bs.tab', () => this.stopWebcam());
        });
    }

    /**
     * Initializes listeners for auto-scan toggle and manual capture.
     * @private
     */
    _initAutoScanListeners() {
        if (this.dom.autoScanToggle) {
            this.dom.autoScanToggle.addEventListener('change', (e) => {
                const msg = APP_CONST?.MESSAGES || {};
                if (e.target.checked) {
                    if (this.dom.scanStatus) this.dom.scanStatus.textContent = msg.VISION_HANDS_FREE_ON || '🟢 Chế độ rảnh tay đã bật.';
                    this.performScan();
                } else {
                    if (this.autoScanInterval) {
                        clearTimeout(this.autoScanInterval);
                        this.autoScanInterval = null;
                    }
                    if (this.dom.scanStatus) this.dom.scanStatus.textContent = msg.VISION_HANDS_FREE_OFF || '🔴 Đã dừng quét tự động.';
                }
            });
        }

        if (this.dom.captureBtn) {
            this.dom.captureBtn.addEventListener('click', async () => {
                if (this.dom.autoScanToggle) this.dom.autoScanToggle.checked = false;
                if (this.autoScanInterval) {
                    clearTimeout(this.autoScanInterval);
                    this.autoScanInterval = null;
                }
                await this.performScan();
            });
        }
    }

    /**
     * Highlights and handles drag-and-drop for images.
     * @private
     */
    _initDragAndDropListeners() {
        if (!this.dom.dropZone || !this.dom.imageInput) return;

        if (this.dom.browseBtn) {
            this.dom.browseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dom.imageInput.click();
            });
        }

        this.dom.dropZone.addEventListener('click', (e) => {
            if (e.target !== this.dom.removeFileBtn && !this.dom.removeFileBtn?.contains(e.target)) {
                this.dom.imageInput.click();
            }
        });

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(ev => {
            this.dom.dropZone.addEventListener(ev, e => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        this.dom.dropZone.addEventListener('dragenter', () => this.dom.dropZone.classList.add('dragover'));
        this.dom.dropZone.addEventListener('dragover', () => this.dom.dropZone.classList.add('dragover'));
        this.dom.dropZone.addEventListener('dragleave', () => this.dom.dropZone.classList.remove('dragover'));
        this.dom.dropZone.addEventListener('drop', (e) => {
            this.dom.dropZone.classList.remove('dragover');
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.dom.imageInput.files = files;
                this._handleImageFiles(files[0]);
            }
        });

        this.dom.imageInput.addEventListener('change', (e) => {
            if (e.target.files.length > 0) this._handleImageFiles(e.target.files[0]);
        });

        if (this.dom.removeFileBtn) {
            this.dom.removeFileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.dom.imageInput.value = '';
                if (this.dom.previewImg) this.dom.previewImg.src = '';
                this.dom.filePreview?.classList.add('d-none');
                this.dom.dropZone?.classList.remove('has-file');
                if (this.dom.imageStatus) this.dom.imageStatus.textContent = APP_CONST?.MESSAGES?.VISION_SUPPORTED_FORMATS || "Định dạng hỗ trợ: JPG, PNG. Ảnh rõ nét sẽ cho kết quả chính xác nhất.";
            });
        }
    }

    /**
     * Handles image file selection and API upload
     * @param {File} file 
     * @private
     */
    async _handleImageFiles(file) {
        if (!file.type.startsWith('image/')) {
            alert(APP_CONST?.MESSAGES?.INVALID_IMAGE || "Vui lòng chọn file ảnh hợp lệ (JPG, PNG).");
            return;
        }

        // Show preview
        const reader = new FileReader();
        reader.onload = (e) => {
            if (this.dom.previewImg) this.dom.previewImg.src = e.target.result;
            if (this.dom.fileName) this.dom.fileName.textContent = file.name;
            if (this.dom.fileSize) this.dom.fileSize.textContent = this._formatBytes(file.size);
            
            this.dom.filePreview?.classList.remove('d-none');
            this.dom.dropZone?.classList.add('has-file');
            if (this.dom.imageStatus) this.dom.imageStatus.textContent = APP_CONST?.MESSAGES?.VISION_ANALYZING || "Đang tải lên và phân tích...";
        };
        reader.readAsDataURL(file);

        // Upload and Analyze
        try {
            const data = await this.analyzeUpload(file);
            
            if (data.success) {
                 if (this.dom.imageStatus) this.dom.imageStatus.textContent = APP_CONST?.MESSAGES?.VISION_ANALYZE_SUCCESS || "✅ Phân tích thành công!";
                 
                 // Close Modal & Open Editor
                const modalId = APP_CONST?.IDS?.LOAD_DATA_MODAL || 'loadDataModal';
                const loadDataModalEl = document.getElementById(modalId);
                if (loadDataModalEl && typeof bootstrap !== 'undefined' && bootstrap.Modal) {
                    const loadDataModal = bootstrap.Modal.getInstance(loadDataModalEl);
                    if (loadDataModal) {
                        loadDataModal.hide();
                    }
                }
                
                setTimeout(() => {
                    if (window.BOARD_EDITOR && typeof window.BOARD_EDITOR.openWithFen === 'function') {
                         window.BOARD_EDITOR.openWithFen(data.fen, data.debug_image);
                    }
                }, APP_CONST?.VISION?.MODAL_TRANSITION_MS || 300);

            } else {
                 if (this.dom.imageStatus) this.dom.imageStatus.textContent = (APP_CONST?.MESSAGES?.VISION_ANALYZE_ERROR || "❌ Lỗi: ") + data.error;
            }
        } catch (e) {
            console.error(e);
            if (this.dom.imageStatus) this.dom.imageStatus.textContent = APP_CONST?.MESSAGES?.VISION_SERVER_ERROR || "❌ Lỗi kết nối server.";
        }
    }

    /**
     * Formats bytes to human-readable string.
     * @param {number} bytes 
     * @private
     */
    _formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = APP_CONST?.VISION?.BYTES_K || 1024, dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }

    /**
     * Starts user webcam.
     */
    async startWebcam() {
        this._ensureDom();
        if (this.currentWebcamStream) this.stopWebcam();

        try {
            const constraints = (APP_CONST && APP_CONST.VIDEO_CONSTRAINTS) 
                ? APP_CONST.VIDEO_CONSTRAINTS : {video: {facingMode: 'environment'}};
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (this.dom.video) this.dom.video.srcObject = stream;
            this.currentWebcamStream = stream;
        } catch (err) {
            console.error("Lỗi bật webcam:", err);
            if (this.dom.scanStatus) this.dom.scanStatus.textContent = APP_CONST?.MESSAGES?.VISION_CAMERA_ERROR || 'Lỗi: Không thể truy cập camera.';
        }
    }

    /**
     * Stops current webcam stream.
     */
    stopWebcam() {
        if (this.currentWebcamStream) {
            this.currentWebcamStream.getTracks().forEach(track => track.stop());
            this.currentWebcamStream = null;
        }
    }

    /**
     * Performs a single scan from the webcam feed.
     * @async
     */
    async performScan() {
        this._ensureDom();
        if (!this.currentWebcamStream) {
            if (this.dom.scanStatus) this.dom.scanStatus.textContent = APP_CONST?.MESSAGES?.VISION_CAMERA_NOT_ON || '⚠️ Camera chưa bật!';
            if (this.dom.autoScanToggle) this.dom.autoScanToggle.checked = false;
            return;
        }

        if (this.dom.scanStatus) this.dom.scanStatus.textContent = APP_CONST?.MESSAGES?.VISION_SCANNING || '🔄 Đang quét...';

        try {
            const canvas = document.createElement('canvas');
            canvas.width = this.dom.video.videoWidth;
            canvas.height = this.dom.video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(this.dom.video, 0, 0, canvas.width, canvas.height);

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', APP_CONST?.VISION?.JPEG_QUALITY || 0.8));
            const formData = new FormData();
            formData.append('file', blob, 'capture.jpg');

            const apiUri = APP_CONST?.API?.IMAGE_ANALYZE || '/api/image/analyze_image';
            const response = await fetch(apiUri, { method: 'POST', body: formData });
            const data = await response.json();

            if (data.success) {
                if (this.dom.scanStatus) {
                    this.dom.scanStatus.textContent = APP_CONST?.MESSAGES?.VISION_SCAN_SUCCESS || '✅ Đã cập nhật thế cờ!';
                    this.dom.scanStatus.style.color = 'green';
                }
                
                // Show warped board confirmation if available
                if (data.warped_image) {
                     this._showWarpedConfirmation(data.warped_image);
                }

                if (data.debug_image && this.dom.debugOverlay) {
                    this.dom.debugOverlay.src = 'data:image/jpeg;base64,' + data.debug_image;
                    this.dom.debugOverlay.style.display = 'block';
                    setTimeout(() => { 
                        if (this.dom.debugOverlay) this.dom.debugOverlay.style.display = 'none'; 
                    }, APP_CONST?.VISION?.DEBUG_SHOW_DURATION_MS || 1500);
                }

                // --- NEW FLOW: Open Editor instead of direct apply ---
                const newFen = data.fen;
                
                // Close the Load Data Modal first to avoid stacking modals
                const modalId = APP_CONST?.IDS?.LOAD_DATA_MODAL || 'loadDataModal';
                const loadDataModalEl = document.getElementById(modalId);
                const loadDataModal = bootstrap.Modal.getInstance(loadDataModalEl);
                if (loadDataModal) {
                    loadDataModal.hide();
                }

                // Wait a bit for modal to close, then open Editor
                setTimeout(() => {
                    if (window.BOARD_EDITOR) {
                        window.BOARD_EDITOR.openWithFen(newFen, data.debug_image);
                    } else {
                        console.error('Board Editor not initialized!');
                        // Fallback
                        if (window.LOGIC_GAME && window.LOGIC_GAME.initBoard) window.LOGIC_GAME.initBoard('white', newFen);
                    }
                }, APP_CONST?.VISION?.MODAL_TRANSITION_MS || 300);
            } else {
                this.showFriendlyError(this.dom.scanStatus, data.error);
            }
        } catch (err) {
            console.error("Vision Scan Error:", err);
        }

        // Reschedule auto-scan
        if (this.dom.autoScanToggle?.checked) {
            this.autoScanInterval = setTimeout(() => this.performScan(), this.autoScanDelay);
        }
    }

    /**
     * Sends manual image file to server for analysis.
     * @param {File} file 
     * @returns {Promise<Object>}
     */
    async analyzeUpload(file) {
        const formData = new FormData();
        formData.append('file', file);

        const apiUri = APP_CONST?.API?.IMAGE_ANALYZE || '/api/image/analyze_image';
        const response = await fetch(apiUri, { method: 'POST', body: formData });
        return await response.json();
    }

    /**
     * Checks if FEN is logically valid (has kings, etc).
     * @param {string} fen 
     * @returns {boolean}
     */
    isValidFen(fen) {
        if (!fen || typeof fen !== 'string') return false;
        try {
            const testGame = new Chess(fen);
            const boardArr = testGame.board ? testGame.board() : null;
            if (Array.isArray(boardArr)) {
                let wK = false, bK = false;
                for (const row of boardArr) {
                    for (const cell of row) {
                        if (cell?.type === 'k') {
                            if (cell.color === 'w') wK = true;
                            if (cell.color === 'b') bK = true;
                        }
                    }
                }
                return wK && bK;
            }
            return true;
        } catch (err) { return false; }
    }

    /**
     * Shows a polished error UI for vision failures.
     * @param {HTMLElement} statusEl 
     * @param {string} rawError 
     */
    showFriendlyError(statusEl, rawError) {
        if (!statusEl) return;
        const msg = APP_CONST?.MESSAGES;
        let title = msg?.VISION_ERROR_LOST || "Ôi không! Alice bị lạc rồi...";
        let message = msg?.VISION_ERROR_LOST_DESC || "Kết nối tới máy chủ AI gặp chút trục trặc. Bạn hãy thử lại sau giây lát nhé.";
        
        if (rawError?.includes('timeout') || rawError?.includes(' Read timed out')) {
            title = msg?.VISION_ERROR_TIMEOUT || "Kết nối quá hạn (Timeout)";
            message = msg?.VISION_ERROR_TIMEOUT_DESC || "Alice đã cố gắng hết sức nhưng máy chủ phản hồi quá chậm.";
        }

        statusEl.innerHTML = `
            <div class=\"error-rabbit-container\">
                <img src=\"${APP_CONST?.ASSETS?.ALICE_ERROR_IMG || 'static/img/alice-error.webp'}\" class=\"error-rabbit-img\" alt=\"Sad Alice\">
                <div class=\"friendly-error-msg\">
                    <strong>${title}</strong><br>${message}
                </div>
            </div>
        `;
    }

    /**
     * Shows a warped board preview for user confirmation.
     * @param {string} base64 
     * @private
     */
    _showWarpedConfirmation(base64) {
        // Create or get confirmation element
        let confirmEl = document.getElementById('warped-confirm-container');
        if (!confirmEl) {
            confirmEl = document.createElement('div');
            confirmEl.id = 'warped-confirm-container';
            confirmEl.className = 'warped-confirm-overlay';
            confirmEl.innerHTML = `
                <div class="warped-preview-card">
                    <p class="small text-white mb-2">Alice nhìn thế này đúng chưa?</p>
                    <img src="" id="warped-preview-img" class="img-fluid rounded border border-success">
                </div>
            `;
            // Append to the modal body or near the scan status
            const scannerId = APP_CONST?.IDS?.LIVE_SCAN_PANE || 'live-scan-pane';
            const scannerPane = document.getElementById(scannerId);
            if (scannerPane) scannerPane.appendChild(confirmEl);
        }

        const warpedIds = APP_CONST?.IDS || {};
        const img = confirmEl.querySelector('#' + (warpedIds.WARPED_PREVIEW_IMG || 'warped-preview-img'));
        if (img) {
            img.src = 'data:image/jpeg;base64,' + base64;
            confirmEl.style.display = 'block';
            
            // Auto-hide after duration or on next scan
            if (this._warpedTimeout) clearTimeout(this._warpedTimeout);
            this._warpedTimeout = setTimeout(() => {
                confirmEl.style.display = 'none';
            }, APP_CONST?.VISION?.WARPED_PREVIEW_DURATION_MS || 3000);
        }
    }
}
