/**
 * @fileoverview Openings Library Module
 * Handles searching, filtering, and displaying the chess opening museum.
 */

import { APP_CONST } from '../constants.js';
import { OPENINGS_DATA } from '../data/opening_data.js';

document.addEventListener('DOMContentLoaded', function () {
    const ids = APP_CONST?.IDS || {};
    const config = APP_CONST?.OPENINGS || {};
    const msgs = APP_CONST?.MESSAGES || {};

    const gridEl = document.getElementById(ids.OPENING_GRID || 'opening-grid');
    const searchInput = document.getElementById(ids.OPENING_SEARCH || 'opening-search');
    const filterBtns = document.querySelectorAll('.category-btn');

    let currentFilter = 'all';
    let searchQuery = '';
    const itemsPerLoad = config.ITEMS_PER_PAGE || 20;
    let displayedCount = itemsPerLoad;
    let filteredData = [];

    /**
     * Filter data based on current UI state (category + search query)
     */
    function filterData() {
        filteredData = (OPENINGS_DATA || []).filter(op => {
            const matchesFilter = currentFilter === 'all' || op.category === currentFilter;
            const matchesSearch = op.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                                  op.eco.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesFilter && matchesSearch;
        });
        displayedCount = itemsPerLoad;
    }

    /**
     * Render a slice of the filtered data into the grid
     * @param {boolean} [append=false] - Whether to append to existing cards or replace them
     */
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

            // Initialize board in next tick to ensure DOM is ready
            setTimeout(() => {
                const boardDiv = document.getElementById(boardId);
                if (boardDiv) {
                    Chessboard(boardId, {
                        position: op.fen,
                        showNotation: false,
                        draggable: false,
                        pieceTheme: APP_CONST?.PATHS?.PIECE_THEME || 'static/img/chesspieces/wikipedia/{piece}.png'
                    });
                }
            }, config.BOARD_INIT_DELAY_MS || 50);
        }
        
        gridEl.appendChild(fragment);

        // Update "No results" message display
        const noResultsId = ids.OPENING_NO_RESULTS || 'no-results-msg';
        if (filteredData.length === 0) {
            if (!document.getElementById(noResultsId)) {
                gridEl.insertAdjacentHTML('beforeend', `<div id="${noResultsId}" class="col-12 text-center text-white-50 py-5">
                    ${msgs.OPENING_SEARCH_EMPTY || "Không tìm thấy khai cuộc nào phù hợp."}
                </div>`);
            }
        } else {
            const msg = document.getElementById(noResultsId);
            if (msg) msg.remove();
        }

        // Add "Load More" button if more items remain
        const loadMoreId = ids.OPENING_LOAD_MORE || 'load-more-btn';
        const existingLoadMore = document.getElementById(loadMoreId);
        if (existingLoadMore) existingLoadMore.remove();

        if (displayedCount < filteredData.length) {
            const loadMoreBtn = document.createElement('div');
            loadMoreBtn.id = loadMoreId;
            loadMoreBtn.className = 'col-12 text-center py-4';
            loadMoreBtn.innerHTML = `<button class="btn btn-outline-light px-5 btn-lg rounded-pill" style="border-color: rgba(255,255,255,0.2)">${msgs.OPENING_LOAD_MORE || "Xem thêm"}</button>`;
            loadMoreBtn.onclick = () => {
                displayedCount += itemsPerLoad;
                renderOpenings(true);
            };
            gridEl.appendChild(loadMoreBtn);
        }
    }

    // --- Interactive Listeners ---

    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            searchQuery = e.target.value;
            filterData();
            renderOpenings();
        });
    }

    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            currentFilter = btn.getAttribute('data-filter') || 'all';
            filterData();
            renderOpenings();
        });
    });

    /**
     * Delegate click event for opening cards (Redirect to home with ?op=slug)
     */
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

    /**
     * Visual effect before navigation
     */
    function triggerRabbitHole(slug, cardElement) {
        const overlayId = ids.RABBIT_HOLE_OVERLAY || 'rabbit-hole-overlay';
        const overlay = document.getElementById(overlayId);
        if (!overlay) {
            window.location.href = `/?op=${slug}`;
            return;
        }

        cardElement.classList.add('sucking-in');
        overlay.classList.add('active');
        
        const animConfig = config.ANIMATION || {};
        const pieces = animConfig.PIECE_SYMBOLS || ['♔', '♕', '♖', '♗', '♘', '♙', '♚', '♛', '♜', '♝', '♞', '♟'];
        const pieceCount = animConfig.FLOATING_PIECE_COUNT || 20;

        for(let i=0; i < pieceCount; i++) {
            const span = document.createElement('span');
            span.classList.add('floating-piece');
            span.textContent = pieces[Math.floor(Math.random() * pieces.length)];
            span.style.left = `${Math.random() * 100}vw`;
            span.style.top = `${Math.random() * 100}vh`;
            span.style.animationDelay = `${Math.random() * 0.5}s`;
            span.style.fontSize = `${2 + Math.random() * 4}rem`;
            overlay.appendChild(span);
        }

        const transitionTime = config.TRANSITION_MS || 1800;
        setTimeout(() => {
            window.location.href = `/?op=${slug}`;
        }, transitionTime); 
    }

    // Initial Render
    filterData();
    renderOpenings();
});
