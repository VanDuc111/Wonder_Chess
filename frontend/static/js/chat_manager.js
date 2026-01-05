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
    }

    /**
     * Initializes the chat manager and attaches event listeners.
     */
    init() {
        this._ensureDom();
        if (this.dom.form) {
            this.dom.form.addEventListener('submit', (e) => this._handleSubmit(e));
        }
        this._loadHistory();
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
                    <img src="static/img/alice-loading.svg" alt="Alice is thinking..." class="alice-loading-svg">
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
