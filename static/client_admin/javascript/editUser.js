document.getElementById('editUserForm').addEventListener('submit', function(event) {
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm_password').value;
    const passwordError = document.getElementById('password-error');

    if (password !== confirmPassword) {
        event.preventDefault(); // Prevent form submission
        passwordError.style.display = 'block'; // Show error message
    } else {
        passwordError.style.display = 'none'; // Hide error message
    }
});
