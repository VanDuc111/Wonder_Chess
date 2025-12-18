// Mock Data for Thesis Demonstration
const OPENINGS_DATA = [
    {
        name: "Sicilian Defense",
        eco: "B20",
        moves: "1. e4 c5",
        fen: "rnbqkbnr/pp1ppppp/8/2p5/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        category: "e4",
        description: "Khai cuộc phổ biến nhất và hiếu chiến nhất chống lại 1.e4."
    },
    {
        name: "Ruy Lopez (Spanish Game)",
        eco: "C60",
        moves: "1. e4 e5 2. Nf3 Nc6 3. Bb5",
        fen: "r1bqkbnr/pppp1ppp/2n5/1B2p3/4P3/5N2/PPPP1PPP/RNBQK2R b KQkq - 3 3",
        category: "e4",
        description: "Một trong những khai cuộc cổ điển và phức tạp nhất."
    },
    {
        name: "Queen's Gambit",
        eco: "D06",
        moves: "1. d4 d5 2. c4",
        fen: "rnbqkbnr/ppp1pppp/8/3p4/2PP4/8/PP2PPPP/RNBQKBNR b KQkq - 0 2",
        category: "d4",
        description: "Chiến lược kiểm soát trung tâm bằng cách thí tốt cánh Hậu."
    },
    {
        name: "Caro-Kann Defense",
        eco: "B10",
        moves: "1. e4 c6",
        fen: "rnbqkbnr/pp1ppppp/2p5/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        category: "e4",
        description: "Lối chơi vững chắc, phòng thủ chặt chẽ cho Đen."
    },
    {
        name: "French Defense",
        eco: "C00",
        moves: "1. e4 e6",
        fen: "rnbqkbnr/pppp1ppp/4p3/8/4P3/8/PPPP1PPP/RNBQKBNR w KQkq - 0 2",
        category: "e4",
        description: "Phòng thủ phản công sắc bén nhưng không gian chật hẹp."
    },
    {
        name: "King's Indian Defense",
        eco: "E60",
        moves: "1. d4 Nf6 2. c4 g6",
        fen: "rnbqkb1r/pppppp1p/5np1/8/2PP4/8/PP2PPPP/RNBQKBNR w KQkq - 0 3",
        category: "d4",
        description: "Lựa chọn năng động cho Đen chống lại d4."
    },
    {
        name: "English Opening",
        eco: "A10",
        moves: "1. c4",
        fen: "rnbqkbnr/pppppppp/8/8/2P5/8/PP1PPPPP/RNBQKBNR b KQkq - 0 1",
        category: "flank",
        description: "Khai cuộc linh hoạt, chuyển đổi thành nhiều biến thể khác."
    },
    {
        name: "King's Gambit",
        eco: "C30",
        moves: "1. e4 e5 2. f4",
        fen: "rnbqkbnr/pppp1ppp/8/4p3/4PP2/8/PPPP2PP/RNBQKBNR b KQkq - 0 2",
        category: "gambit",
        description: "Khai cuộc lãng mạn và rủi ro cao từ thế kỷ 19."
    }
];

document.addEventListener('DOMContentLoaded', function () {
    const gridEl = document.getElementById('opening-grid');
    const searchInput = document.getElementById('opening-search');
    const filterBtns = document.querySelectorAll('.category-btn');
    const userDisplay = document.getElementById('user-display');
    
    // Hiển thị nickname từ localStorage
    const storedNickname = localStorage.getItem('userNickname');
    if (storedNickname && userDisplay) {
        userDisplay.textContent = `Chào, ${storedNickname}!`;
    }

    let currentFilter = 'all';
    let searchQuery = '';

    // Initialize all cards once
    function initAllCards() {
        gridEl.innerHTML = '';
        
        OPENINGS_DATA.forEach((op, index) => {
            const boardId = `board-${index}`;
            const cardHtml = `
                <div class="col-12 col-sm-6 col-md-4 col-lg-3 opening-card-col" data-index="${index}">
                    <div class="opening-card" onclick="alert('Tính năng chi tiết &quot;${op.name}&quot; đang phát triển cho khóa luận!')">
                        <div class="opening-board-container p-3">
                            <div id="${boardId}" style="width: 100%"></div>
                        </div>
                        <div class="opening-card-body pt-0">
                            <div class="d-flex justify-content-between align-items-center mb-2">
                                <span class="eco-badge">${op.eco}</span>
                            </div>
                            <h6 class="text-white fw-bold mb-1">${op.name}</h6>
                            <small class="text-white-50 d-block mb-2" style="font-family: monospace;">${op.moves}</small>
                            <p class="text-white-50 small mb-0" style="font-size: 0.8rem;">
                                <i class="bi bi-info-circle me-1"></i> ${op.description}
                            </p>
                        </div>
                    </div>
                </div>
            `;
            gridEl.insertAdjacentHTML('beforeend', cardHtml);

            // Initialize board immediately
            setTimeout(() => {
                if (document.getElementById(boardId)) {
                    Chessboard(boardId, {
                        position: op.fen,
                        showNotation: false,
                        draggable: false,
                        pieceTheme: 'static/img/chesspieces/wikipedia/{piece}.png'
                    });
                }
            }, 50);
        });
        
        // Add "No results" element hidden by default
        const noResultsHtml = `<div id="no-results-msg" class="col-12 text-center text-white-50 py-5 d-none">
            Không tìm thấy khai cuộc nào phù hợp.
        </div>`;
        gridEl.insertAdjacentHTML('beforeend', noResultsHtml);
    }

    function updateVisibility() {
        let visibleCount = 0;
        const cards = document.querySelectorAll('.opening-card-col');
        
        OPENINGS_DATA.forEach((op, index) => {
            const matchesFilter = currentFilter === 'all' || op.category === currentFilter;
            const matchesSearch = op.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  op.eco.toLowerCase().includes(searchQuery.toLowerCase());
            
            const cardCol = cards[index];
            if (matchesFilter && matchesSearch) {
                cardCol.classList.remove('d-none');
                cardCol.classList.add('fade-in-visible');
                visibleCount++;
            } else {
                cardCol.classList.add('d-none');
                cardCol.classList.remove('fade-in-visible');
            }
        });

        const noResultsMsg = document.getElementById('no-results-msg');
        if (visibleCount === 0) {
            noResultsMsg.classList.remove('d-none');
        } else {
            noResultsMsg.classList.add('d-none');
        }
    }

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        updateVisibility();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentFilter = btn.getAttribute('data-filter');
            updateVisibility();
        });
    });

    // Initial load
    initAllCards();
    updateVisibility();
});
