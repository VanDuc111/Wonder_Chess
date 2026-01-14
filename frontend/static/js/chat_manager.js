/**
 * @fileoverview Chat management for Alice (Gemini AI Assistant).
 * Handles message rendering, streaming API calls, and markdown conversion.
 */

class AliceChat {
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
        this.history = JSON.parse(localStorage.getItem('alice_chat_history')) || [];
    }

    /**
     * Ensures mandatory DOM elements are cached.
     * @private
     */
    _ensureDom() {
        if (!this.dom.messages) this.dom.messages = document.getElementById(window.APP_CONST?.IDS?.CHATBOT_MESSAGES || 'chatbot-messages');
        if (!this.dom.input) this.dom.input = document.getElementById('chatbot-input');
        if (!this.dom.form) this.dom.form = document.getElementById('chatbot-form');
        if (!this.dom.sendBtn) this.dom.sendBtn = document.getElementById('send-chat-button');
        if (!this.dom.openingName) this.dom.openingName = document.getElementById('opening-name');
        if (!this.dom.resetBtn) this.dom.resetBtn = document.getElementById('reset-chat-btn');
        if (!this.dom.coachSwitch) this.dom.coachSwitch = document.getElementById('coach-mode-switch');
        
        // New UI Elements
        if (!this.dom.bodyWrapper) this.dom.bodyWrapper = document.querySelector('.chat-body-wrapper');
        if (!this.dom.resetOverlay) this.dom.resetOverlay = document.getElementById('chat-reset-overlay');
        if (!this.dom.confirmBtn) this.dom.confirmBtn = document.getElementById('confirm-reset-chat');
        if (!this.dom.cancelBtn) this.dom.cancelBtn = document.getElementById('cancel-reset-chat');
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
        // Áp dụng hiệu ứng làm mờ cho tin nhắn và form nhập
        this.dom.messages?.classList.add('blur-filter');
        this.dom.form?.classList.add('blur-filter');
        // Hiện overlay xác nhận
        this.dom.resetOverlay?.classList.remove('d-none');
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
        const userDisplay = document.getElementById('user-display');
        let nickname = 'bạn';
        if (userDisplay && userDisplay.textContent) {
            nickname = userDisplay.textContent.replace('Chào, ', '').replace('!', '').trim();
        }

        // Hiển thị lời chào mặc định sau khi xóa sạch
        setTimeout(() => {
            const welcomeMsg = window.APP_CONST?.MESSAGES?.WELCOME ? 
                window.APP_CONST.MESSAGES.WELCOME(nickname) : 
                `Chào bạn${nickname !== 'bạn' ? ', ' + nickname : ''}! Tôi là Alice. Tôi có thể giúp gì cho hành trình cờ vua của bạn?`;
            this.displayMessage(welcomeMsg, true, true);
        }, 300);
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
        this.dom.messages?.classList.remove('blur-filter');
        this.dom.form?.classList.remove('blur-filter');
        this.dom.resetOverlay?.classList.add('d-none');
    }

    /**
     * Loads chat history from localStorage.
     * @private
     */
    _loadHistory() {
        if (!this.dom.messages) return;
        this.dom.messages.innerHTML = '';
        this.history.forEach(msg => {
            if (msg.isHtml) {
                this.displayMessage(msg.text, msg.sender === 'Alice', false);
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
        localStorage.setItem('alice_chat_history', JSON.stringify(this.history));
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
            this.history.push({sender: isBot ? 'Alice' : 'user', text: text, isHtml: true});
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
        msgEl.classList.add(sender === 'user' ? 'user-message' : 'alice-message');
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
        msgEl.classList.add(sender === 'user' ? 'user-message' : 'alice-message');

        if (sender === 'Alice') {
            msgEl.innerHTML = `
                <div class="typing-indicator">
                    <img src="${window.APP_CONST?.ASSETS?.ALICE_LOADING_SVG || 'static/img/alice-loading.svg'}" alt="Alice is thinking..." class="alice-loading-svg">
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
        this._appendMessage('user', message);
        if (this.dom.input) this.dom.input.value = '';
        
        const aliceEl = this._createMessageElement('Alice');

        // Context data từ LOGIC_GAME đã đóng gói
        const curIdx = window.LOGIC_GAME?.getIndex() || 0;
        const historyArr = window.LOGIC_GAME?.getHistory() || [];
        const currentFen = historyArr[curIdx]?.fen || "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
        
        // Lấy PGN và nước đi cuối từ history array (ổn định hơn gameInstance)
        const lastMoveSan = historyArr[curIdx]?.san || 'N/A';
        
        // Reconstruct PGN up to the current index
        let pgn = "";
        for (let i = 1; i <= curIdx; i++) {
            if (i % 2 !== 0) pgn += `${Math.floor(i / 2) + 1}. `;
            pgn += `${historyArr[i].san} `;
        }
        pgn = pgn.trim();

        try {
            const apiUri = window.APP_CONST?.API?.CHAT_ANALYSIS || '/api/analysis/chat_analysis';
            const response = await fetch(apiUri, {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    user_question: message,
                    fen: currentFen,
                    current_score: historyArr[curIdx]?.score || "0.00",
                    prev_score: (curIdx > 0) ? (historyArr[curIdx - 1]?.score || "0.00") : "0.00",
                    opening_name: this.dom.openingName?.textContent || "N/A",
                    move_count: historyArr.length > 0 ? historyArr.length - 1 : 0,
                    pgn: pgn,
                    last_move_san: lastMoveSan,
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
            this.history.push({sender: 'Alice', text: aliceEl.innerHTML, isHtml: true});
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
        
        // 1. Trigger: Khai cuộc ở nước thứ 5 (Full move 5 = half-move 10)
        const openingName = this.dom.openingName?.textContent || "N/A";
        const defaultOpening = window.APP_CONST?.STRINGS?.OPENING_DEFAULT || "Khởi đầu";
        if (curIdx === 10 && openingName !== "N/A" && openingName !== defaultOpening) {
            this._handleCoachComment(window.APP_CONST?.MESSAGES?.COACH_COMMENT_OPENING || "phân tích khai cuộc này một cách chuyên sâu");
            return;
        }

        // 2. Trigger: Nước đi chất lượng đột biến (Blunder/Mistake/Brilliant/Great)
        if (currentMove.score !== null && prevMove.score !== null) {
            const curVal = this.parseScore(currentMove.score);
            const prevVal = this.parseScore(prevMove.score);
            const diff = (curIdx % 2 !== 0) ? (curVal - prevVal) : (prevVal - curVal);

            let triggerReason = "";
            const msg = window.APP_CONST?.MESSAGES;
            if (diff > 1.5) triggerReason = msg?.COACH_COMMENT_BRILLIANT || "khen ngợi nước đi thiên tài này";
            else if (diff > 0.8) triggerReason = msg?.COACH_COMMENT_GOOD || "nhận xét đây là một nước đi rất tốt";
            else if (diff < -1.5) triggerReason = msg?.COACH_COMMENT_BLUNDER || "phê bình sai lầm nghiêm trọng này";
            else if (diff < -0.7) triggerReason = msg?.COACH_COMMENT_MISTAKE || "chỉ ra đây là một sai lầm và tại sao";

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
        const aliceEl = this._createMessageElement('Alice');

        const curIdx = window.LOGIC_GAME?.getIndex() || 0;
        const historyArr = window.LOGIC_GAME?.getHistory() || [];
        const currentFen = historyArr[curIdx]?.fen || "";
        const lastMoveSan = historyArr[curIdx]?.san || 'N/A';
        
        let pgn = "";
        for (let i = 1; i <= curIdx; i++) {
            if (i % 2 !== 0) pgn += `${Math.floor(i / 2) + 1}. `;
            pgn += `${historyArr[i].san} `;
        }

        const coachQuestion = `Dưới vai trò huấn luyện viên, hãy ${specificInstruction} cho nước đi **${lastMoveSan}** vừa thực hiện.`;

        try {
            const apiUri = window.APP_CONST?.API?.CHAT_ANALYSIS || '/api/analysis/chat_analysis';
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
                    pgn: pgn.trim(),
                    last_move_san: lastMoveSan,
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
                this.history.push({sender: 'Alice', text: aliceEl.innerHTML, isHtml: true});
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
        if (!s) return 0;
        const str = s.toString();
        if (str.includes('M')) return str.includes('+') ? 100 : -100;
        return parseFloat(str) || 0;
    }

    /**
     * Simple Markdown to HTML converter.
     * @param {string} text 
     * @returns {string}
     */
    mdToHtml(text) {
        let html = text;
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/^(\s*)\* (.*?)$/gm, '<li style="margin-left: 20px;">$2</li>');
        html = html.replace(/\n/g, '<br>');
        html = html.replace(/<br><li/g, '<li');
        return html;
    }
}

// Global initialization
window.ALICE_CHAT = new AliceChat();

// Compatibility wrappers for main.js
window.displayChatbotMessage = (text, isBot) => window.ALICE_CHAT.displayMessage(text, isBot);
