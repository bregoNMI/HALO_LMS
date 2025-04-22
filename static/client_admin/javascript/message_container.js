const validationMessageContainer = document.getElementById('validation-message-container');

function displayValidationMessage(message, isSuccess) {
    console.log(validationMessageContainer);
    validationMessageContainer.style.display = 'flex';

    const messageWrapper = document.createElement('div');
    messageWrapper.className = isSuccess ? 'alert alert-success alert-container' : 'alert alert-error alert-container';
    setTimeout(() => {  
        messageWrapper.classList.add('animate-alert-container');
    }, 100);    
    
    const icon = document.createElement('i');
    icon.className = isSuccess ? 'fa-solid fa-circle-check' : 'fa-solid fa-triangle-exclamation';

    const text = document.createElement('span');
    text.textContent = message;

    messageWrapper.appendChild(icon);
    messageWrapper.appendChild(text);

    validationMessageContainer.appendChild(messageWrapper);

    setTimeout(() => {
        messageWrapper.classList.remove('animate-alert-container');
        
        if (validationMessageContainer.children.length === 0) {
            validationMessageContainer.style.display = 'none';
        }
        setTimeout(() => {
            messageWrapper.remove();
        }, 400);
    }, 10000);
}