// Dữ liệu OPENINGS_DATA hiện tại được lấy từ file opening_data.js

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
                    <div class="opening-card" onclick="alert('Tính năng chi tiết &quot;${op.name}&quot; đang được phát triển!')">
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
