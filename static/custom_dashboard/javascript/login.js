document.addEventListener('DOMContentLoaded', function() {

    const loginFormButton = document.getElementById('loginFormButton');
    // Adding hover colors to login Button
    if(loginFormButton){
        loginFormButton.addEventListener('mouseover', () => {
            loginFormButton.style.backgroundColor = buttonBackgroundHover;
            loginFormButton.style.color = buttonColorHover;
            loginFormButton.style.borderColor = buttonBorderHover;
        });
        loginFormButton.addEventListener('mouseout', () => {
            loginFormButton.style.backgroundColor = buttonBackground;
            loginFormButton.style.color = buttonColor;
            loginFormButton.style.borderColor = buttonBorder;
        });
        loginFormButton.addEventListener('click', () => {
            loginFormButton.classList.add('disabled');
            setTimeout(() => {
                loginFormButton.setAttribute('disabled', true);
            }, 100);

            if (!loginFormButton.dataset.originalHtml) {
                loginFormButton.dataset.originalHtml = loginFormButton.innerHTML;
            }

            const savedWidth = loginFormButton.offsetWidth + "px";
            const savedHeight = loginFormButton.offsetHeight + "px";

            loginFormButton.style.width = savedWidth;
            loginFormButton.style.height = savedHeight;

            loginFormButton.innerHTML = `<i class="fa-regular fa-spinner-third fa-spin" style="--fa-animation-duration: 1s;">`;
        })
    }

    const nextBtn = document.getElementById('nextBtn');
    // Adding hover colors to next Button
    if(nextBtn){
        nextBtn.addEventListener('mouseover', () => {
            nextBtn.style.backgroundColor = buttonBackgroundHover;
            nextBtn.style.color = buttonColorHover;
            nextBtn.style.borderColor = buttonBorderHover;
        });
        nextBtn.addEventListener('mouseout', () => {
            nextBtn.style.backgroundColor = buttonBackground;
            nextBtn.style.color = buttonColor;
            nextBtn.style.borderColor = buttonBorder;
        });
    }

    const loginFormForgetButton = document.getElementById('loginFormForgetButton');
    // Adding hover colors to forgot password
    if(loginFormForgetButton){
        loginFormForgetButton.addEventListener('mouseover', () => {
            loginFormForgetButton.style.color = forgetColorHover;
            loginFormForgetButton.style.textDecoration = forgotTextDecorationHover;
        });
        loginFormForgetButton.addEventListener('mouseout', () => {
            loginFormForgetButton.style.color = forgetColor;
            loginFormForgetButton.style.textDecoration = forgotTextDecoration;
        });
    }


    const loginFormSignupButton = document.getElementById('loginFormRegisterButton');
    // Adding hover colors to Sign Up
    if(loginFormSignupButton){
        loginFormSignupButton.addEventListener('mouseover', () => {
            loginFormSignupButton.style.color = signupColorHover;
            loginFormSignupButton.style.textDecoration = signupTextDecorationHover;
        });
        loginFormSignupButton.addEventListener('mouseout', () => {
            loginFormSignupButton.style.color = signupColor;
            loginFormSignupButton.style.textDecoration = signupTextDecoration;
        });
    }

    const scanFaceBtn = document.getElementById('scanFaceBtn');
    // Adding hover colors to scan face Button
    if(scanFaceBtn){
        scanFaceBtn.addEventListener('mouseover', () => {
            scanFaceBtn.style.backgroundColor = buttonBackgroundHover;
            scanFaceBtn.style.color = buttonColorHover;
            scanFaceBtn.style.borderColor = buttonBorderHover;
        });
        scanFaceBtn.addEventListener('mouseout', () => {
            scanFaceBtn.style.backgroundColor = buttonBackground;
            scanFaceBtn.style.color = buttonColor;
            scanFaceBtn.style.borderColor = buttonBorder;
        });
    }

    flatpickr(".date-picker", {
        altInput: true,
        altFormat: flatpickr_format,
        dateFormat: "Y-m-d",
    });
});


(function () {
    function togglePassword(toggleEl) {
        const fieldWrap = toggleEl.closest('.login-form-field');
        if (!fieldWrap) return;

        const input = fieldWrap.querySelector('input[name="password"]') || fieldWrap.querySelector('input[type="password"], input[type="text"]');
        if (!input) return;

        const icon = toggleEl.querySelector('i');
        const showing = input.type === 'text';

        let start = null, end = null, hadFocus = document.activeElement === input;
        if (hadFocus && typeof input.selectionStart === 'number') {
            start = input.selectionStart;
            end   = input.selectionEnd;
        }

        input.type = showing ? 'password' : 'text';

        if (hadFocus) {
            input.focus();
            if (start !== null && end !== null && typeof input.setSelectionRange === 'function') {
                input.setSelectionRange(start, end);
            }
        }

        if (icon) {
            icon.classList.toggle('fa-eye',  showing);
            icon.classList.toggle('fa-eye-slash', !showing);
        }

        toggleEl.setAttribute('aria-label', showing ? 'Show password' : 'Hide password');
        toggleEl.setAttribute('aria-pressed', (!showing).toString());
    }

    // Click
    document.addEventListener('click', (e) => {
        const t = e.target.closest('.toggle-password-icon');
        if (t) togglePassword(t);
    });

    // Keyboard (Enter/Space)
    document.addEventListener('keydown', (e) => {
        const el = e.target;
        if (!el.classList || !el.classList.contains('toggle-password-icon')) return;
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            togglePassword(el);
        }
    });
})();