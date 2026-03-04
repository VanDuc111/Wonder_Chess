/**
 * @fileoverview Toast service for modern, non-blocking UI notifications.
 * Uses Bootstrap Toasts with Wonderland aesthetics.
 */

import { APP_CONST } from '../constants.js';

export const showToast = (message, type = 'success', title = null) => {
    const ids = APP_CONST?.IDS || {};
    const container = document.getElementById(ids.TOAST_CONTAINER || 'toast-container');
    if (!container) return;

    // Create unique ID for this toast
    const toastId = `toast-${Date.now()}`;
    
    // Choose icon based on type
    let icon = 'bi-check-circle-fill';
    let typeClass = 'toast-success';
    let defaultTitle = 'Thành công';

    if (type === 'error') {
        icon = 'bi-exclamation-triangle-fill';
        typeClass = 'toast-error';
        defaultTitle = 'Lỗi';
    } else if (type === 'warning') {
        icon = 'bi-exclamation-circle-fill';
        typeClass = 'toast-warning';
        defaultTitle = 'Cảnh báo';
    }

    const finalTitle = title || defaultTitle;

    const toastHtml = `
      <div id="${toastId}" class="toast wonder-toast ${typeClass}" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="5000">
        <div class="toast-header">
          <i class="bi ${icon} me-2 ${type === 'success' ? 'text-success' : (type === 'error' ? 'text-danger' : 'text-warning')}"></i>
          <strong class="me-auto">${finalTitle}</strong>
          <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
        <div class="toast-body">
          ${message}
        </div>
      </div>
    `;

    // Append to container
    container.insertAdjacentHTML('beforeend', toastHtml);

    // Initialize and show
    const toastEl = document.getElementById(toastId);
    if (toastEl && typeof bootstrap !== 'undefined') {
        const toast = new bootstrap.Toast(toastEl);
        toast.show();

        // Self-cleanup after hide
        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        });
    }
};

// Also attach to window for easy access from everywhere
window.showToast = showToast;
