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
    let displayedCount = 20;
    const itemsPerLoad = 20;
    let filteredData = [];

    // Filter data based on current state
    function filterData() {
        filteredData = OPENINGS_DATA.filter(op => {
            const matchesFilter = currentFilter === 'all' || op.category === currentFilter;
            const matchesSearch = op.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  op.eco.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });
        displayedCount = itemsPerLoad;
    }

    // Render a slice of the filtered data
    function renderOpenings(append = false) {
        if (!append) {
            gridEl.innerHTML = '';
        }
        
        const start = append ? displayedCount - itemsPerLoad : 0;
        const end = Math.min(displayedCount, filteredData.length);
        const fragment = document.createDocumentFragment();
        
        for (let i = start; i < end; i++) {
            const op = filteredData[i];
            const boardId = `board-${i}`;
            const cardCol = document.createElement('div');
            cardCol.className = 'col-12 col-sm-6 col-md-4 col-lg-3 opening-card-col fade-in-visible';
            cardCol.innerHTML = `
                <div class="opening-card js-opening-card" data-fen="${op.fen}" data-name="${op.name}" data-eco="${op.eco}">
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
            `;
            fragment.appendChild(cardCol);

            // Initialize board in next tick
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
        }
        
        gridEl.appendChild(fragment);

        // Update "No results" message
        if (filteredData.length === 0) {
            if (!document.getElementById('no-results-msg')) {
                gridEl.insertAdjacentHTML('beforeend', `<div id="no-results-msg" class="col-12 text-center text-white-50 py-5">
                    Không tìm thấy khai cuộc nào phù hợp.
                </div>`);
            }
        } else {
            const msg = document.getElementById('no-results-msg');
            if (msg) msg.remove();
        }

        // Add "Load More" button if needed
        const existingLoadMore = document.getElementById('load-more-btn');
        if (existingLoadMore) existingLoadMore.remove();

        if (displayedCount < filteredData.length) {
            const loadMoreBtn = document.createElement('div');
            loadMoreBtn.id = 'load-more-btn';
            loadMoreBtn.className = 'col-12 text-center py-4';
            loadMoreBtn.innerHTML = `<button class="btn btn-outline-light px-5 btn-lg rounded-pill" style="border-color: rgba(255,255,255,0.2)">Xem thêm</button>`;
            loadMoreBtn.onclick = () => {
                displayedCount += itemsPerLoad;
                renderOpenings(true);
            };
            gridEl.appendChild(loadMoreBtn);
        }
    }

    // Event Listeners
    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        filterData();
        renderOpenings();
    });

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentFilter = btn.getAttribute('data-filter');
            filterData();
            renderOpenings();
        });
    });

    // Delegate click event for opening cards
    gridEl.addEventListener('click', function(e) {
        const card = e.target.closest('.js-opening-card');
        if (card) {
            const name = card.getAttribute('data-name');
            const slug = name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/(^-|-$)+/g, '');
            
            triggerRabbitHole(slug, card);
        }
    });

    function triggerRabbitHole(slug, cardElement) {
        const overlay = document.getElementById('rabbit-hole-overlay');
        cardElement.classList.add('sucking-in');
        overlay.classList.add('active');
        
        const pieces = ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'];
        for(let i=0; i<20; i++) {
            const span = document.createElement('span');
            span.classList.add('floating-piece');
            span.textContent = pieces[Math.floor(Math.random() * pieces.length)];
            span.style.left = `${Math.random() * 100}vw`;
            span.style.top = `${Math.random() * 100}vh`;
            span.style.animationDelay = `${Math.random() * 0.5}s`;
            span.style.fontSize = `${2 + Math.random() * 4}rem`;
            overlay.appendChild(span);
        }

        setTimeout(() => {
            window.location.href = `/?op=${slug}`;
        }, 1800); 
    }

    // Initial load
    filterData();
    renderOpenings();
});
