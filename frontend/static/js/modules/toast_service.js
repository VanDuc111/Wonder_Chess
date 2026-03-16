/**
 * @fileoverview Toast service for modern, non-blocking UI notifications.
 * Uses Bootstrap Toasts with Wonderland aesthetics.
 */

import { APP_CONST } from '../constants.js';

export const showToast = (message, type = 'success', title = null) => {
    const ids = APP_CONST?.IDS || {};
    const container = document.getElementById(ids.TOAST_CONTAINER || 'toast-container');
    if (!container) return;

    // Create a robust unique ID
    const randomSuffix = Math.random().toString(36).substring(2, 7);
    const toastId = `toast-${Date.now()}-${randomSuffix}`;
    
    // Icon and class configuration
    const config = {
        success: { icon: 'bi-check-circle-fill', className: 'toast-success', title: 'Thành công' },
        error: { icon: 'bi-exclamation-triangle-fill', className: 'toast-error', title: 'Lỗi' },
        warning: { icon: 'bi-exclamation-circle-fill', className: 'toast-warning', title: 'Cảnh báo' },
        info: { icon: 'bi-info-circle-fill', className: 'toast-info', title: 'Thông tin' }
    };

    const { icon, className, title: defaultTitle } = config[type] || config.success;
    const finalTitle = title || defaultTitle;

    const toastHtml = `
      <div id="${toastId}" class="toast wonder-toast fade ${className}" role="alert" aria-live="assertive" aria-atomic="true" data-bs-delay="4000">
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

    // Add to DOM
    container.insertAdjacentHTML('beforeend', toastHtml);

    const toastEl = document.getElementById(toastId);
    if (toastEl && typeof bootstrap !== 'undefined') {
        const toast = bootstrap.Toast.getOrCreateInstance(toastEl, {
            delay: 4000,
            autohide: true
        });
        
        toast.show();

        // Cleanup after the toast is fully hidden and transition finished
        toastEl.addEventListener('hidden.bs.toast', () => {
            toastEl.remove();
        }, { once: true });
    }
};

// Also attach to window for easy access from everywhere
window.showToast = showToast;
