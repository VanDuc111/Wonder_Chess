/**
 * StockfishManager: Quản lý engine Stockfish chạy tại Frontend (WASM)
 */
const StockfishManager = (function() {
    let engine = null;
    let isReady = false;
    const STOCKFISH_URL = "https://cdn.jsdelivr.net/npm/stockfish.js@10.0.2/stockfish.min.js";

    async function init() {
        if (engine) return;

        try {
            // Tải script từ CDN và tạo một Worker qua Blob để tránh lỗi CORS
            const response = await fetch(STOCKFISH_URL);
            const script = await response.text();
            const blob = new Blob([script], { type: 'application/javascript' });
            const workerUrl = URL.createObjectURL(blob);
            
            engine = new Worker(workerUrl);
            
            engine.onmessage = function(event) {
            };

            engine.postMessage("uci");
            engine.postMessage("isready");
            isReady = true;
            console.log("Stockfish WASM Worker Initialized via Blob");
        } catch (error) {
            console.error("Failed to initialize Stockfish Worker:", error);
        }
    }

    function getBestMove(fen, skillLevel, timeLimitMs) {
        return new Promise(async (resolve, reject) => {
            if (!engine) {
                await init();
            }

            if (!engine) {
                reject("Engine could not be initialized");
                return;
            }

            let lastScore = "0.00";

            // Thiết lập Skill Level
            engine.postMessage(`setoption name Skill Level value ${skillLevel}`);
            engine.postMessage(`position fen ${fen}`);
            
            // Xác định quân đến lượt đi từ FEN để chuẩn hóa điểm số về phía Trắng
            const sideToMove = fen.split(' ')[1]; // 'w' hoặc 'b'

            // Lắng nghe kết quả
            const onMsg = (event) => {
                const line = event.data;
                
                // Bắt điểm số từ dòng info (ví dụ: info depth 10 score cp 15 ...)
                if (typeof line === 'string' && line.includes("score")) {
                    const scoreMatch = line.match(/score\s(cp|mate)\s(-?\d+)/);
                    if (scoreMatch) {
                        const type = scoreMatch[1];
                        const value = parseInt(scoreMatch[2]);
                        
                        // UCI trả về điểm số dựa trên quân đến lượt (side to move). 
                        // Chúng ta cần chuyển về góc nhìn của quân Trắng để UI không bị nhảy.
                        let normalizedValue = (sideToMove === 'w') ? value : -value;

                        if (type === 'cp') {
                            lastScore = (normalizedValue / 100).toFixed(2);
                            if (normalizedValue > 0) lastScore = "+" + lastScore;
                        } else if (type === 'mate') {
                            lastScore = normalizedValue > 0 ? `+M${Math.abs(normalizedValue)}` : `-M${Math.abs(normalizedValue)}`;
                        }
                    }
                }

                if (typeof line === 'string' && line.startsWith("bestmove")) {
                    const match = line.match(/bestmove\s([a-h][1-8][a-h][1-8][qrbn]?)/);
                    if (match) {
                        engine.removeEventListener('message', onMsg);
                        resolve({
                            move: match[1],
                            score: lastScore
                        });
                    }
                }
            };

            engine.addEventListener('message', onMsg);
            engine.postMessage(`go movetime ${timeLimitMs}`);
        });
    }

    // Tự động init sau khi trang load
    window.addEventListener('load', () => {
        setTimeout(init, 2000);
    });

    return {
        getBestMove: getBestMove
    };
})();

window.SF_MANAGER = StockfishManager;
