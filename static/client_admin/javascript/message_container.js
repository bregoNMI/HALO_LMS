document.addEventListener('DOMContentLoaded', () => {
    // Assign once, globally
    window.validationMessageContainer = document.getElementById('validation-message-container');
    window.validationText = document.getElementById('validation-text');
});

function displayValidationMessage(message, isSuccess) {
    if (!window.validationMessageContainer) {
        console.warn('Validation message container not found');
        return;
    }

    const container = window.validationMessageContainer;
    container.style.display = 'flex';

    const messageWrapper = document.createElement('div');
    messageWrapper.className = isSuccess ? 'alert alert-success new-alert-container' : 'alert alert-error new-alert-container';

    setTimeout(() => {  
        messageWrapper.classList.add('animate-alert-container');
    }, 100);    

    const icon = document.createElement('i');
    icon.className = isSuccess ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation';

    const text = document.createElement('span');
    text.textContent = message;

    messageWrapper.appendChild(icon);
    messageWrapper.appendChild(text);
    container.appendChild(messageWrapper);

    setTimeout(() => {
        messageWrapper.classList.remove('animate-alert-container');

        setTimeout(() => {
            messageWrapper.remove();
            // Hide the container only if empty
            if (container.children.length === 0) {
                container.style.display = 'none';
            }
        }, 400);
    }, 10000);
}

function displayValidationText(message, isSuccess, extraContent = null) {
    if (!window.validationText) {
        console.warn('Validation message container not found');
        return;
    }

    const container = window.validationText;
    container.style.display = 'flex';
    container.innerHTML = ''; // Clear previous messages

    const messageWrapper = document.createElement('div');
    messageWrapper.className = isSuccess ? 'validation-text-success' : 'validation-text-error';

    const icon = document.createElement('i');
    icon.className = isSuccess ? 'fa-light fa-circle-check' : 'fa-light fa-triangle-exclamation';

    const text = document.createElement('span');
    text.textContent = message;

    messageWrapper.appendChild(icon);
    messageWrapper.appendChild(text);

    container.appendChild(messageWrapper);

    if (extraContent) {
        container.appendChild(extraContent);
    }
}