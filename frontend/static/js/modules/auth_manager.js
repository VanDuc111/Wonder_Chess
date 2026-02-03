/* auth_manager.js */

document.addEventListener('DOMContentLoaded', () => {
    const ids = window.APP_CONST?.IDS || {};
    const api = window.APP_CONST?.API || {};
    const msgs = window.APP_CONST?.MESSAGES || {};

    const signInForm = document.getElementById(ids.SIGNIN_FORM || 'signin-form');
    const signUpForm = document.getElementById(ids.SIGNUP_FORM || 'signup-form');
    const logoutBtn = document.getElementById(ids.LOGOUT_BTN || 'btn-logout');

    // Utility to show/hide loading state on buttons
    const setBtnLoading = (form, isLoading) => {
        const authSubmitSelector = ids.BTN_AUTH_SUBMIT || '.btn-auth-submit';
        const btn = form.querySelector(authSubmitSelector);
        if (!btn) return;

        const spinner = btn.querySelector('.spinner-border');
        const text = btn.querySelector('span');

        if (isLoading) {
            btn.disabled = true;
            if (spinner) spinner.classList.remove('d-none');
            if (text) text.classList.add('d-none');
        } else {
            btn.disabled = false;
            if (spinner) spinner.classList.add('d-none');
            if (text) text.classList.remove('d-none');
        }
    };

    // Handle Sign In
    if (signInForm) {
        signInForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setBtnLoading(signInForm, true);

            const formData = new FormData(signInForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch(api.AUTH_LOGIN || '/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    window.location.reload(); 
                } else {
                    alert(result.message || msgs.AUTH_LOGIN_ERROR || 'Đăng nhập không thành công.');
                }
            } catch (error) {
                console.error('Login Error:', error);
                alert(msgs.AUTH_SYSTEM_ERROR || 'Có lỗi xảy ra, vui lòng thử lại.');
            } finally {
                setBtnLoading(signInForm, false);
            }
        });
    }

    // Handle Sign Up
    if (signUpForm) {
        signUpForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            setBtnLoading(signUpForm, true);

            const formData = new FormData(signUpForm);
            const data = Object.fromEntries(formData.entries());

            try {
                const response = await fetch(api.AUTH_SIGNUP || '/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    window.location.reload();
                } else {
                    alert(result.message || msgs.AUTH_SIGNUP_ERROR || 'Đăng ký không thành công.');
                }
            } catch (error) {
                console.error('Signup Error:', error);
                alert(msgs.AUTH_SYSTEM_ERROR || 'Có lỗi xảy ra, vui lòng thử lại.');
            } finally {
                setBtnLoading(signUpForm, false);
            }
        });
    }

    // Handle Logout
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            try {
                const response = await fetch(api.AUTH_LOGOUT || '/api/auth/logout');
                const result = await response.json();
                if (result.success) {
                    window.location.reload();
                }
            } catch (err) {
                console.error('Logout Error:', err);
                window.location.reload(); // Fallback reload
            }
        });
    }
});
