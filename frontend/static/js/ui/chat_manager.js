/**
 * @fileoverview Chat management for Alice (Gemini AI Assistant).
 * Handles message rendering, streaming API calls, and markdown conversion.
 */

import { APP_CONST } from '../constants.js';

export class AliceChat {
    constructor() {
        /** @type {Object<string, HTMLElement|null>} DOM element cache */
        this.dom = {
            messages: null,
            input: null,
            form: null,
            sendBtn: null,
            openingName: null
        };
        /** @type {Array<{sender: string, text: string, isHtml: boolean}>} Chat history */
        const historyKey = APP_CONST?.STORAGE?.CHAT_HISTORY || 'alice_chat_history';
        this.history = JSON.parse(localStorage.getItem(historyKey)) || [];
    }

    /**
     * Ensures mandatory DOM elements are cached.
     * @private
     */
    _ensureDom() {
        const ids = APP_CONST?.IDS || {};
        if (!this.dom.messages) this.dom.messages = document.getElementById(ids.CHATBOT_MESSAGES || 'chatbot-messages');
        if (!this.dom.input) this.dom.input = document.getElementById(ids.CHAT_INPUT || 'chatbot-input');
        if (!this.dom.form) this.dom.form = document.getElementById(ids.CHAT_FORM || 'chatbot-form');
        if (!this.dom.sendBtn) this.dom.sendBtn = document.getElementById(ids.CHAT_SEND_BTN || 'send-chat-button');
        if (!this.dom.openingName) this.dom.openingName = document.getElementById(ids.OPENING_NAME_DISPLAY || 'opening-name');
        if (!this.dom.resetBtn) this.dom.resetBtn = document.getElementById(ids.CHAT_RESET_BTN || 'reset-chat-btn');
        if (!this.dom.coachSwitch) this.dom.coachSwitch = document.getElementById(ids.CHAT_COACH_SWITCH || 'coach-mode-switch');
        
        // New UI Elements
        if (!this.dom.bodyWrapper) this.dom.bodyWrapper = document.querySelector('.chat-body-wrapper');
        if (!this.dom.resetOverlay) this.dom.resetOverlay = document.getElementById(ids.CHAT_RESET_OVERLAY || 'chat-reset-overlay');
        if (!this.dom.confirmBtn) this.dom.confirmBtn = document.getElementById(ids.CHAT_CONFIRM_RESET || 'confirm-reset-chat');
        if (!this.dom.cancelBtn) this.dom.cancelBtn = document.getElementById(ids.CHAT_CANCEL_RESET || 'cancel-reset-chat');
    }

    /**
     * Initializes the chat manager and attaches event listeners.
     */
    init() {
        this._ensureDom();
        if (this.dom.form) {
            this.dom.form.addEventListener('submit', (e) => this._handleSubmit(e));
        }
        if (this.dom.resetBtn) {
            this.dom.resetBtn.addEventListener('click', () => this.clearChat());
        }
        
        // Custom Overlay Listeners
        if (this.dom.confirmBtn) {
            this.dom.confirmBtn.addEventListener('click', () => this._handleResetConfirmed());
        }
        if (this.dom.cancelBtn) {
            this.dom.cancelBtn.addEventListener('click', () => this._handleResetCancelled());
        }

        this._loadHistory();
    }

    /**
     * Shows the custom reset confirmation overlay with blur effect.
     */
    clearChat() {
        this._ensureDom();
        const blurClass = APP_CONST?.CLASSES?.BLUR_FILTER || 'blur-filter';
        const hiddenClass = APP_CONST?.CLASSES?.HIDDEN || 'd-none';

        // Áp dụng hiệu ứng làm mờ cho tin nhắn và form nhập
        this.dom.messages?.classList.add(blurClass);
        this.dom.form?.classList.add(blurClass);
        // Hiện overlay xác nhận
        this.dom.resetOverlay?.classList.remove(hiddenClass);
    }

    /**
     * Actual reset logic after user confirms.
     * @private
     */
    _handleResetConfirmed() {
        this.history = [];
        this._saveHistory();
        if (this.dom.messages) {
            this.dom.messages.innerHTML = '';
        }
        this._hideResetUI();

        // Get nickname from UI if available
        const ids = APP_CONST?.IDS || {};
        const chatConst = APP_CONST?.CHAT || {};
        const msgs = APP_CONST?.MESSAGES || {};

        const userDisplay = document.getElementById(ids.USER_DISPLAY || 'user-display');
        let nickname = chatConst.DEFAULT_NICKNAME || 'bạn';
        if (userDisplay && userDisplay.textContent) {
            nickname = userDisplay.textContent.replace('Chào, ', '').replace('!', '').trim();
        }

        // Hiển thị lời chào mặc định sau khi xóa sạch
        setTimeout(() => {
            const welcomeMsg = typeof msgs.WELCOME === 'function' ? 
                msgs.WELCOME(nickname) : 
                `Chào ${nickname === 'bạn' ? 'bạn' : 'bạn ' + nickname}! Tôi là Alice. Tôi có thể giúp gì cho hành trình cờ vua của bạn?`;
            this.displayMessage(welcomeMsg, true, true);
        }, chatConst.WELCOME_DELAY_MS || 300);
    }

    /**
     * Cancels reset and restores UI.
     * @private
     */
    _handleResetCancelled() {
        this._hideResetUI();
    }

    /**
     * Common helper to clean up reset UI.
     * @private
     */
    _hideResetUI() {
        const classes = APP_CONST?.CLASSES || {};
        const blurClass = classes.BLUR_FILTER || 'blur-filter';
        const hiddenClass = classes.HIDDEN || 'd-none';

        this.dom.messages?.classList.remove(blurClass);
        this.dom.form?.classList.remove(blurClass);
        this.dom.resetOverlay?.classList.add(hiddenClass);
    }

    /**
     * Loads chat history from localStorage.
     * @private
     */
    _loadHistory() {
        if (!this.dom.messages) return;
        this.dom.messages.innerHTML = '';
        const chatConst = APP_CONST?.CHAT || {};
        const aliceSender = chatConst.SENDER_ALICE || 'Alice';

        this.history.forEach(msg => {
            const isAlice = (msg.sender === aliceSender);
            if (msg.isHtml) {
                this.displayMessage(msg.text, isAlice, false);
            } else {
                this._appendMessage(msg.sender, msg.text, false);
            }
        });
    }

    /**
     * Saves current history to localStorage.
     * @private
     */
    _saveHistory() {
        const historyKey = APP_CONST?.STORAGE?.CHAT_HISTORY || 'alice_chat_history';
        localStorage.setItem(historyKey, JSON.stringify(this.history));
    }

    /**
     * Renders a message in the chat window.
     * @param {string} text - Message content (HTML allowed).
     * @param {boolean} [isBot=true] - Whether the message is from Alice.
     * @param {boolean} [shouldSave=true] - Whether to save to history.
     */
    displayMessage(text, isBot = true, shouldSave = true) {
        this._ensureDom();
        if (!this.dom.messages) return;

        const msgEl = document.createElement('div');
        msgEl.classList.add(isBot ? 'alice-message' : 'user-message');
        msgEl.innerHTML = text;
        
        this.dom.messages.appendChild(msgEl);
        this.dom.messages.scrollTop = this.dom.messages.scrollHeight;

        if (shouldSave) {
            const sender = isBot ? (APP_CONST?.CHAT?.SENDER_ALICE || 'Alice') : (APP_CONST?.CHAT?.SENDER_USER || 'user');
            this.history.push({sender: sender, text: text, isHtml: true});
            this._saveHistory();
        }
    }

    /**
     * Internal helper to append a plain text message.
     * @param {'user'|'Alice'} sender 
     * @param {string} text 
     * @param {boolean} [shouldSave=true]
     * @private
     */
    _appendMessage(sender, text, shouldSave = true) {
        this._ensureDom();
        const msgEl = document.createElement('div');
        const userSenderName = APP_CONST?.CHAT?.SENDER_USER || 'user';
        msgEl.classList.add(sender === userSenderName ? 'user-message' : 'alice-message');
        msgEl.textContent = text;
        
        this.dom.messages?.appendChild(msgEl);
        if (this.dom.messages) this.dom.messages.scrollTop = this.dom.messages.scrollHeight;

        if (shouldSave) {
            this.history.push({sender: sender, text: text, isHtml: false});
            this._saveHistory();
        }
    }

    /**
     * Creates a new message bubble (with loading state for Alice).
     * @param {'user'|'Alice'} sender 
     * @returns {HTMLElement}
     * @private
     */
    _createMessageElement(sender) {
        this._ensureDom();
        const msgEl = document.createElement('div');
        const userSenderName = APP_CONST?.CHAT?.SENDER_USER || 'user';
        const aliceSenderName = APP_CONST?.CHAT?.SENDER_ALICE || 'Alice';
        
        msgEl.classList.add(sender === userSenderName ? 'user-message' : 'alice-message');

        if (sender === aliceSenderName) {
            msgEl.innerHTML = `
                <div class="typing-indicator">
                    <img src="${APP_CONST?.ASSETS?.ALICE_LOADING_SVG || 'static/img/alice-loading.svg'}" alt="Alice is thinking..." class="alice-loading-svg">
                </div>
            `;
        } else {
            msgEl.textContent = '';
        }

        this.dom.messages?.appendChild(msgEl);
        if (this.dom.messages) this.dom.messages.scrollTop = this.dom.messages.scrollHeight;
        return msgEl;
    }

    /**
     * Handles the form submission and coordinates API interaction.
     * @param {Event} e 
     * @private
     */
    async _handleSubmit(e) {
        e.preventDefault();
        this._ensureDom();

        const message = this.dom.input?.value.trim();
        if (!message || this.dom.input?.disabled) return;

        // Lock UI
        this._setLoading(true);

        const isFirst = (this.dom.messages?.children.length === 1);
        const chatConst = APP_CONST?.CHAT || {};
        const userSenderName = chatConst.SENDER_USER || 'user';
        const aliceSenderName = chatConst.SENDER_ALICE || 'Alice';

        this._appendMessage(userSenderName, message);
        if (this.dom.input) this.dom.input.value = '';
        
        const aliceEl = this._createMessageElement(aliceSenderName);

        // Context data từ LOGIC_GAME đã đóng gói
        const curIdx = window.LOGIC_GAME?.getIndex() || 0;
        const historyArr = window.LOGIC_GAME?.getHistory() || [];
        const currentFen = historyArr[curIdx]?.fen || APP_CONST?.STARTING_FEN || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        const lastMoveSan = historyArr[curIdx]?.san || 'N/A';
        const pgn = this._reconstructPgn(historyArr, curIdx);

        try {
            const apiUri = APP_CONST?.API?.CHAT_ANALYSIS || '/api/analysis/chat_analysis';
            const response = await fetch(apiUri, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    user_question: message,
                    fen: currentFen,
                    current_score: historyArr[curIdx]?.score || "0.00",
                    prev_score: (curIdx > 0) ? (historyArr[curIdx - 1]?.score || "0.00") : "0.00",
                    prev_fen: (curIdx > 0) ? historyArr[curIdx - 1]?.fen : null,
                    missed_best_move_uci: (curIdx > 0) ? historyArr[curIdx - 1]?.bestMove : null,
                    opening_name: this.dom.openingName?.textContent || "N/A",
                    move_count: historyArr.length > 0 ? historyArr.length - 1 : 0,
                    pgn: pgn,
                    last_move_san: lastMoveSan,
                    last_move_uci: historyArr[curIdx]?.uci || 'N/A',
                    is_first_message: isFirst
                })
            });

            if (!response.ok) throw new Error(`HTTP Error: ${response.status}`);

            // Streaming
            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullText = "";
            let isFirstChunk = true;

            while (true) {
                const {value, done} = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, {stream: true});
                for (const char of chunk) {
                    if (isFirstChunk) {
                        aliceEl.innerHTML = '';
                        isFirstChunk = false;
                    }
                    aliceEl.textContent += char;
                    fullText += char;
                    // Auto scroll
                    this.dom.messages.scrollTop = this.dom.messages.scrollHeight;
                }
            }

            aliceEl.innerHTML = this.mdToHtml(fullText);
            
            // Lưu câu trả lời hoàn chỉnh của Alice vào history
            this.history.push({sender: aliceSenderName, text: aliceEl.innerHTML, isHtml: true});
            this._saveHistory();

        } catch (err) {
            console.error('Alice Chat Error:', err);
            aliceEl.textContent += ` [Error: ${err.message}]`;
        } finally {
            this._setLoading(false);
            this.dom.input?.focus();
        }
    }

    /**
     * Utility to enable/disable UI during processing.
     * @param {boolean} isLoading 
     * @private
     */
    _setLoading(isLoading) {
        if (this.dom.input) this.dom.input.disabled = isLoading;
        if (this.dom.sendBtn) this.dom.sendBtn.disabled = isLoading;
    }

    /**
     * Checks if Alice should proactively comment based on current game state.
     * Triggered by logic_game.js after evaluation update.
     */
    checkCoachComment() {
        this._ensureDom();
        if (!this.dom.coachSwitch?.checked) return;

        const curIdx = window.LOGIC_GAME?.getIndex() || 0;
        const historyArr = window.LOGIC_GAME?.getHistory() || [];
        if (curIdx === 0 || !historyArr[curIdx]) return;

        const currentMove = historyArr[curIdx];
        const prevMove = historyArr[curIdx - 1];
        
        // 1. Trigger: Khai cuộc ở cột mốc quy định
        const openingName = this.dom.openingName?.textContent || "N/A";
        const strings = APP_CONST?.STRINGS || {};
        const chatConst = APP_CONST?.CHAT || {};
        const coachTriggerHalfMove = chatConst.COACH_TRIGGER_HALF_MOVE || 10;
        const defaultOpening = strings.OPENING_DEFAULT || "Khởi đầu";

        if (curIdx === coachTriggerHalfMove && openingName !== "N/A" && openingName !== defaultOpening) {
            this._handleCoachComment(APP_CONST?.MESSAGES?.COACH_COMMENT_OPENING || "phân tích khai cuộc này một cách chuyên sâu");
            return;
        }

        // 2. Trigger: Nước đi chất lượng đột biến (Blunder/Mistake/Brilliant/Great)
        if (currentMove.score !== null && prevMove.score !== null) {
            const curVal = this.parseScore(currentMove.score);
            const prevVal = this.parseScore(prevMove.score);
            const diff = (curIdx % 2 !== 0) ? (curVal - prevVal) : (prevVal - curVal);

            let triggerReason = "";
            const msgs = APP_CONST?.MESSAGES || {};
            const threshold = APP_CONST?.QUALITY_THRESHOLDS || {};
            
            if (diff > (threshold.BRILLIANT || 1.5)) triggerReason = msgs.COACH_COMMENT_BRILLIANT || "khen ngợi nước đi thiên tài này";
            else if (diff > (threshold.GREAT || 0.8)) triggerReason = msgs.COACH_COMMENT_GREAT || "nhận xét đây là một nước đi rất tốt";
            else if (diff < (threshold.BLUNDER || -1.5)) triggerReason = msgs.COACH_COMMENT_BLUNDER || "phê bình sai lầm nghiêm trọng này";
            else if (diff < (threshold.MISTAKE || -0.7)) triggerReason = msgs.COACH_COMMENT_MISTAKE || "chỉ ra đây là một sai lầm và tại sao";

            if (triggerReason) {
                this._handleCoachComment(triggerReason);
            }
        }
    }

    /**
     * Special API call for proactive coach comments.
     * @param {string} specificInstruction - What Alice should focus on.
     * @private
     */
    async _handleCoachComment(specificInstruction) {
        if (this.dom.input?.disabled) return; // Tránh gọi chồng chéo khi đang phân tích

        this._setLoading(true);
        const chatConst = APP_CONST?.CHAT || {};
        const aliceSenderName = chatConst.SENDER_ALICE || 'Alice';
        const aliceEl = this._createMessageElement(aliceSenderName);

        const curIdx = window.LOGIC_GAME?.getIndex() || 0;
        const historyArr = window.LOGIC_GAME?.getHistory() || [];
        const currentFen = historyArr[curIdx]?.fen || "";
        const lastMoveSan = historyArr[curIdx]?.san || 'N/A';
        const pgn = this._reconstructPgn(historyArr, curIdx);

        const coachQuestion = `Dưới vai trò huấn luyện viên, hãy ${specificInstruction} cho nước đi **${lastMoveSan}** vừa thực hiện.`;

        try {
            const apiUri = APP_CONST?.API?.CHAT_ANALYSIS || '/api/analysis/chat_analysis';
            const response = await fetch(apiUri, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    user_question: coachQuestion,
                    fen: currentFen,
                    current_score: historyArr[curIdx]?.score || "0.00",
                    prev_score: (curIdx > 0) ? (historyArr[curIdx - 1]?.score || "0.00") : "0.00",
                    opening_name: this.dom.openingName?.textContent || "N/A",
                    move_count: curIdx,
                    pgn: pgn,
                    last_move_san: lastMoveSan,
                    last_move_uci: historyArr[curIdx]?.uci || 'N/A',
                    is_first_message: false
                })
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let fullText = "", isFirstChunk = true;

            while (true) {
                const {value, done} = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, {stream: true});
                if (!chunk) continue;

                for (const char of chunk) {
                    if (isFirstChunk) { aliceEl.innerHTML = ''; isFirstChunk = false; }
                    aliceEl.textContent += char;
                    fullText += char;
                    this.dom.messages.scrollTop = this.dom.messages.scrollHeight;
                }
            }

            if (!fullText) {
                aliceEl.remove();
            } else {
                aliceEl.innerHTML = this.mdToHtml(fullText);
                this.history.push({sender: aliceSenderName, text: aliceEl.innerHTML, isHtml: true});
                this._saveHistory();
            }

        } catch (err) {
            console.error('Coach Comment Error:', err);
            if (aliceEl) aliceEl.remove(); // Xóa message lỗi nếu là auto-comment để không gây rác
        } finally {
            this._setLoading(false);
        }
    }

    /**
     * Helper to parse score string (e.g., "+0.50", "M2").
     */
    parseScore(s) {
        if (window.LOGIC_GAME && window.LOGIC_GAME.engine && typeof window.LOGIC_GAME.engine.parseScore === 'function') {
            return window.LOGIC_GAME.engine.parseScore(s);
        }
        
        // Fallback nội bộ nếu LogicGame chưa sẵn sàng
        const engineConst = APP_CONST?.ENGINE || {};
        const normScore = engineConst.NORMALIZED_SCORE || { MATE: 100, DEFAULT: 0 };
        
        if (!s) return normScore.DEFAULT;
        const str = s.toString();
        const mateSymbols = engineConst.MATE_SYMBOLS || ['M', '#'];
        const isMate = mateSymbols.some(sym => str.includes(sym));

        if (isMate) return str.includes('-') ? -normScore.MATE : normScore.MATE;
        return parseFloat(str) || normScore.DEFAULT;
    }

    /**
     * Reconstructs PGN string up to a specific index.
     * @param {Array<Object>} history 
     * @param {number} curIdx 
     * @returns {string}
     * @private
     */
    _reconstructPgn(history, curIdx) {
        if (!history || history.length === 0) return "";
        let pgn = "";
        for (let i = 1; i <= curIdx; i++) {
            if (i % 2 !== 0) pgn += `${Math.floor(i / 2) + 1}. `;
            pgn += `${history[i].san} `;
        }
        return pgn.trim();
    }

    /**
     * Simple Markdown to HTML converter.
     * @param {string} text 
     * @returns {string}
     */
    mdToHtml(text) {
        const mdStyle = APP_CONST?.CHAT?.MD_STYLE || { LI_MARGIN: '20px' };
        let html = text;
        html = html.replace(/\*\?(.*?)\*\*/g, '<strong>$1</strong>'); // Fixed regex partially
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/^(\s*)\* (.*?)$/gm, `<li style="margin-left: ${mdStyle.LI_MARGIN};">$2</li>`);
        html = html.replace(/\n/g, '<br>');
        html = html.replace(/<br><li/g, '<li');
        return html;
    }
}
