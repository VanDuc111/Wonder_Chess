/* auth_manager.js */

document.addEventListener('DOMContentLoaded', () => {
    const signInForm = document.getElementById('signin-form');
    const signUpForm = document.getElementById('signup-form');
    const logoutBtn = document.getElementById('btn-logout');

    // Utility to show/hide loading state on buttons
    const setBtnLoading = (form, isLoading) => {
        const btn = form.querySelector('.btn-auth-submit');
        const spinner = btn.querySelector('.spinner-border');
        const text = btn.querySelector('span');

        if (isLoading) {
            btn.disabled = true;
            spinner.classList.remove('d-none');
            text.classList.add('d-none');
        } else {
            btn.disabled = false;
            spinner.classList.add('d-none');
            text.classList.remove('d-none');
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
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    window.location.reload(); // Reload to update navbar state
                } else {
                    alert(result.message || 'Đăng nhập không thành công.');
                }
            } catch (error) {
                console.error('Login Error:', error);
                alert('Có lỗi xảy ra, vui lòng thử lại.');
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
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                const result = await response.json();

                if (result.success) {
                    window.location.reload();
                } else {
                    alert(result.message || 'Đăng ký không thành công.');
                }
            } catch (error) {
                console.error('Signup Error:', error);
                alert('Có lỗi xảy ra, vui lòng thử lại.');
            } finally {
                setBtnLoading(signUpForm, false);
            }
        });
    }

    // Logout logic is handled by standard anchor tag, 
    // but we can add a confirmation if needed.
    // The link already goes to /api/auth/logout which redirects back.
    // In our auth_routes.py /logout returns JSON, so we might need a small fix there 
    // if we want it to redirect. Let's make it a fetch call for better UX.

    if (logoutBtn) {
        logoutBtn.addEventListener('click', async (e) => {
            e.preventDefault();
            const response = await fetch('/api/auth/logout');
            const result = await response.json();
            if (result.success) {
                window.location.reload();
            }
        });
    }
});
