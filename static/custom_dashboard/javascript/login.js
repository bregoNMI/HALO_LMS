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

            loginFormButton.innerHTML = `<i class="fa-light fa-loader fa-spin"></i>`;
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

    flatpickr(".date-picker", {
        altInput: true,
        altFormat: "F j, Y",  // Display format (e.g., "July 27, 1986")
        dateFormat: flatpickr_format,   // Format used for submission (e.g., "1986-07-27")
        allowInput: true       // Allow manual input
    });
});
