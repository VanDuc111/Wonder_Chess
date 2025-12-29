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

    // Delegate click event for opening cards
    gridEl.addEventListener('click', function(e) {
        const card = e.target.closest('.js-opening-card');
        if (card) {
            const name = card.getAttribute('data-name');
            // Create URL-friendly slug from name
            const slug = name.toLowerCase()
                .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric chars with hyphens
                .replace(/(^-|-$)+/g, '');   // Remove leading/trailing hyphens
            
            triggerRabbitHole(slug, card);
        }
    });

    function triggerRabbitHole(slug, cardElement) {
        const overlay = document.getElementById('rabbit-hole-overlay');
        
        // Visual feedback on the card immediately
        cardElement.classList.add('sucking-in');
        
        // Activate overlay
        overlay.classList.add('active');
        
        // Add random floating chess pieces for effect
        const pieces = ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'];
        for(let i=0; i<20; i++) {
            const span = document.createElement('span');
            span.classList.add('floating-piece');
            span.textContent = pieces[Math.floor(Math.random() * pieces.length)];
            
            // Random positioning
            span.style.left = `${Math.random() * 100}vw`;
            span.style.top = `${Math.random() * 100}vh`;
            span.style.animationDelay = `${Math.random() * 0.5}s`;
            span.style.fontSize = `${2 + Math.random() * 4}rem`;
            
            overlay.appendChild(span);
        }

        // Redirect after animation with clean slug URL
        setTimeout(() => {
            window.location.href = `/?op=${slug}`;
        }, 1800); 
    }

    // Initial load
    initAllCards();
    updateVisibility();
});
