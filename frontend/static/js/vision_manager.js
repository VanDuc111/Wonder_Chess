/**
 * @fileoverview Vision management for WonderChess.
 * Handles webcam scanning, image analysis, and board recognition.
 */

class VisionManager {
    constructor() {
        /** @type {MediaStream|null} Current webcam stream */
        this.currentWebcamStream = null;
        /** @type {number|null} ID of the active auto-scan timeout */
        this.autoScanInterval = null;
        /** @type {number} Delay between auto-scans in ms */
        this.autoScanDelay = (window.APP_CONST && window.APP_CONST.AUTO_SCAN && window.APP_CONST.AUTO_SCAN.DELAY_MS) 
            ? window.APP_CONST.AUTO_SCAN.DELAY_MS : 5000;

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
            otherTabs: [],
            // Modals
            invalidFenModal: null,
            invalidFenRetryBtn: null,
            invalidFenBody: null
        };
    }

    /**
     * Ensures mandatory DOM elements are cached.
     * @private
     */
    _ensureDom() {
        if (this.dom.video) return;

        const ids = window.APP_CONST?.IDS || {};
        
        this.dom.video = document.getElementById(ids.WEBCAM_VIDEO || 'webcam-feed');
        this.dom.scanStatus = document.getElementById('scan-status');
        this.dom.imageStatus = document.getElementById('image-upload-status');
        this.dom.autoScanToggle = document.getElementById('auto-scan-toggle');
        this.dom.captureBtn = document.getElementById('capture-btn');
        this.dom.debugOverlay = document.getElementById('debug-overlay');
        
        // Drag & Drop elements
        this.dom.dropZone = document.getElementById('drop-zone');
        this.dom.imageInput = document.getElementById('image-upload-input');
        this.dom.filePreview = document.getElementById('file-preview');
        this.dom.previewImg = document.getElementById('preview-img');
        this.dom.fileName = document.getElementById('file-name');
        this.dom.fileSize = document.getElementById('file-size');
        this.dom.removeFileBtn = document.getElementById('remove-file-btn');
        this.dom.browseBtn = document.getElementById('browse-btn');

        // Tabs
        this.dom.liveScanTab = document.getElementById('live-scan-tab');
        this.dom.otherTabs = ['pgn-tab', 'fen-tab', 'image-tab']
            .map(id => document.getElementById(id))
            .filter(el => el !== null);

        // Modal elements
        this.dom.invalidFenModal = document.getElementById('invalidFenModal');
        if (this.dom.invalidFenModal) {
            this.dom.invalidFenRetryBtn = this.dom.invalidFenModal.querySelector('#invalidFenModalRetry');
            this.dom.invalidFenBody = this.dom.invalidFenModal.querySelector('#invalidFenModalBody');
        }
    }

    /**
     * Initializes the vision manager and attaches event listeners.
     */
    init() {
        this._ensureDom();
        this._initTabListeners();
        this._initAutoScanListeners();
        this._initDragAndDropListeners();
        this._initInvalidFenModal();
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
            this.dom.scanStatus.textContent = 'Sẵn sàng...';
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
            this.dom.imageStatus.textContent = "Định dạng hỗ trợ: JPG, PNG. Ảnh rõ nét sẽ cho kết quả chính xác nhất.";
        }
    }

    /**
     * Listens for the parent Bootstrap modal events to manage camera and UI state.
     * @private
     */
    _initModalListeners() {
        const modalEl = document.getElementById('loadDataModal');
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
                if (e.target.checked) {
                    if (this.dom.scanStatus) this.dom.scanStatus.textContent = '🟢 Chế độ rảnh tay đã bật.';
                    this.performScan();
                } else {
                    if (this.autoScanInterval) {
                        clearTimeout(this.autoScanInterval);
                        this.autoScanInterval = null;
                    }
                    if (this.dom.scanStatus) this.dom.scanStatus.textContent = '🔴 Đã dừng quét tự động.';
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
                if (this.dom.imageStatus) this.dom.imageStatus.textContent = "Định dạng hỗ trợ: JPG, PNG. Ảnh rõ nét sẽ cho kết quả chính xác nhất.";
            });
        }
    }

    /**
     * Processes selected image for preview.
     * @param {File} file 
     * @private
     */
    _handleImageFiles(file) {
        if (!file.type.startsWith('image/')) {
            alert("Vui lòng chọn file ảnh hợp lệ (JPG, PNG).");
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            if (this.dom.previewImg) this.dom.previewImg.src = e.target.result;
            if (this.dom.fileName) this.dom.fileName.textContent = file.name;
            if (this.dom.fileSize) this.dom.fileSize.textContent = this._formatBytes(file.size);
            
            this.dom.filePreview?.classList.remove('d-none');
            this.dom.dropZone?.classList.add('has-file');
            if (this.dom.imageStatus) this.dom.imageStatus.textContent = "Sẵn sàng để phân tích!";
        };
        reader.readAsDataURL(file);
    }

    /**
     * Formats bytes to human-readable string.
     * @param {number} bytes 
     * @private
     */
    _formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024, dm = decimals < 0 ? 0 : decimals;
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
            const constraints = (window.APP_CONST && window.APP_CONST.VIDEO_CONSTRAINTS) 
                ? window.APP_CONST.VIDEO_CONSTRAINTS : {video: {facingMode: 'environment'}};
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            if (this.dom.video) this.dom.video.srcObject = stream;
            this.currentWebcamStream = stream;
        } catch (err) {
            console.error("Lỗi bật webcam:", err);
            if (this.dom.scanStatus) this.dom.scanStatus.textContent = 'Lỗi: Không thể truy cập camera.';
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
            if (this.dom.scanStatus) this.dom.scanStatus.textContent = '⚠️ Camera chưa bật!';
            if (this.dom.autoScanToggle) this.dom.autoScanToggle.checked = false;
            return;
        }

        if (this.dom.scanStatus) this.dom.scanStatus.textContent = '🔄 Đang quét...';

        try {
            const canvas = document.createElement('canvas');
            canvas.width = this.dom.video.videoWidth;
            canvas.height = this.dom.video.videoHeight;
            const context = canvas.getContext('2d');
            context.drawImage(this.dom.video, 0, 0, canvas.width, canvas.height);

            const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.8));
            const formData = new FormData();
            formData.append('file', blob, 'capture.jpg');

            const apiUri = window.APP_CONST?.API?.IMAGE_ANALYZE || '/api/image/analyze_image';
            const response = await fetch(apiUri, { method: 'POST', body: formData });
            const data = await response.json();

            if (data.success) {
                if (this.dom.scanStatus) {
                    this.dom.scanStatus.textContent = '✅ Đã cập nhật thế cờ!';
                    this.dom.scanStatus.style.color = 'green';
                }
                
                if (data.debug_image && this.dom.debugOverlay) {
                    this.dom.debugOverlay.src = 'data:image/jpeg;base64,' + data.debug_image;
                    this.dom.debugOverlay.style.display = 'block';
                    setTimeout(() => { if (this.dom.debugOverlay) this.dom.debugOverlay.style.display = 'none'; }, 1500);
                }

                const newFen = data.fen;
                const gameInst = window.LOGIC_GAME?.getGame();
                if (gameInst && gameInst.fen().split(' ')[0] !== newFen.split(' ')[0]) {
                    if (window.initChessboard) window.initChessboard(window.board?.orientation() || 'white', newFen);
                    if (window.updateUI) window.updateUI();
                }
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

        const apiUri = window.APP_CONST?.API?.IMAGE_ANALYZE || '/api/image/analyze_image';
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
        let title = "Ôi không! Alice bị lạc rồi...";
        let message = "Kết nối tới máy chủ AI gặp chút trục trặc. Bạn hãy thử lại sau giây lát nhé.";
        
        if (rawError?.includes('timeout') || rawError?.includes(' Read timed out')) {
            title = "Kết nối quá hạn (Timeout)";
            message = "Alice đã cố gắng hết sức nhưng máy chủ phản hồi quá chậm.";
        }

        statusEl.innerHTML = `
            <div class=\"error-rabbit-container\">
                <img src=\"static/img/alice-error.png\" class=\"error-rabbit-img\" alt=\"Sad Alice\">
                <div class=\"friendly-error-msg\">
                    <strong>${title}</strong><br>${message}
                </div>
            </div>
        `;
    }

    /**
     * Initializes the custom Invalid FEN modal.
     * @private
     */
    _initInvalidFenModal() {
        if (!this.dom.invalidFenModal) {
            window.showInvalidFenModal = (msg) => alert(msg || 'FEN không hợp lệ');
            return;
        }

        const modalInstance = new bootstrap.Modal(this.dom.invalidFenModal);
        
        if (this.dom.invalidFenRetryBtn) {
            this.dom.invalidFenRetryBtn.addEventListener('click', () => {
                modalInstance.hide();
                this.performScan();
            });
        }

        window.showInvalidFenModal = (message) => {
            if (this.dom.invalidFenBody && message) {
                this.dom.invalidFenBody.textContent = message;
            }
            modalInstance.show();
        };
    }
}

// Global initialization
window.VISION_MANAGER = new VisionManager();
document.addEventListener('DOMContentLoaded', () => window.VISION_MANAGER.init());

// Compatibility wrappers for main.js if needed
window.startWebcam = () => window.VISION_MANAGER.startWebcam();
window.stopWebcam = () => window.VISION_MANAGER.stopWebcam();
window.isValidFen = (f) => window.VISION_MANAGER.isValidFen(f);
window.showFriendlyError = (el, err) => window.VISION_MANAGER.showFriendlyError(el, err);
