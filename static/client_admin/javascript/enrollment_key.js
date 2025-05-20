document.addEventListener('DOMContentLoaded', () => {
    const requiredFields   = document.querySelectorAll('input[required]');
    const createKeyButtons = document.querySelectorAll('.create-key-btn');
    let hasTriedSubmit     = false;
  
    function validateField(field) {
        const val = field.value.trim();
        let hasError = false;
    
        if (val === '') {
            hasError = true;
        }
    
        // extra rule for key_name
        if (field.id === 'key_name' && val.length < 8) {
            hasError = true;
            displayValidationMessage('Key Name must be atleast 8 Characters.', false);
        }
    
        field.classList.toggle('form-error-field', hasError);
        return !hasError;
    }
  
    requiredFields.forEach(field => {
        const debouncedValidate = debounce(() => {
            if (hasTriedSubmit) validateField(field);
        });
      
        field.addEventListener('input', () => {
            debouncedValidate();
            updateCreateKeyButtons();
        });
    });
      
    updateCreateKeyButtons();
  
    // Click handlers for creating enrollment key
    createKeyButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            hasTriedSubmit = true;
    
            const allValid = Array.from(requiredFields)
            .map(validateField)
            .every(v => v);
    
            updateCreateKeyButtons();
    
            if (!allValid) return;
    
            const name = document.getElementById('name').value.trim();
            const keyName = document.getElementById('key_name').value.trim();
            const selectedCourses = document.querySelectorAll('.selectedCourses .selected-course');
            const courseIds = Array.from(selectedCourses).map(c => c.dataset.courseId);
            const active = document.getElementById('active').checked;
            const maxUsesInput = document.getElementById('max_uses');
            let maxUses = maxUsesInput.value.trim();

            // Empty/null-safe default
            if (!maxUses || maxUses === 'null') {
                maxUses = '';
            }

            // Validate maxUses upper limit
            if (maxUses && parseInt(maxUses) > 999999999) {
                displayValidationMessage('Max Uses cannot exceed 999,999,999.', false);
                maxUsesInput.classList.add('form-error-field');
                return;
            } else {
                maxUsesInput.classList.remove('form-error-field');
            }           
    
            if (name && keyName) {
                if(btn.id == 'editKeyBtn'){
                    const id = document.getElementById('keyId').value;
                    editEnrollmentKey(id, name, keyName, courseIds, active, maxUses, true); 
                }else{
                    createEnrollmentKey(name, keyName, courseIds, active, maxUses, true);
                }
        
                createKeyButtons.forEach(button => {
                    button.classList.add('disabled');
                    button.setAttribute('disabled', true);
                });
        
                setDisabledSaveBtns();
            } else {
                alert('Please enter a category name.');
            }
        });
    });
});

// Enable/disable create buttons based on all required fields non-empty
function updateCreateKeyButtons() {
    const requiredFields   = document.querySelectorAll('input[required]');
    const createKeyButtons = document.querySelectorAll('.create-key-btn');
    
    const allFilled = Array.from(requiredFields)
        .every(f => f.value.trim().length > 0);
    createKeyButtons.forEach(btn => {
        btn.disabled = !allFilled;
        btn.classList.toggle('disabled', !allFilled);
    });
}

function functionGenerateRandomKey() {
    const keyName = document.getElementById('key_name');
    if (!keyName) return;
  
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const numbers = '0123456789';
    const symbols = '!@#$%^&*';
    const allChars = letters + numbers + symbols;
  
    let result = [];
  
    // Ensure at least one symbol is included
    result.push(symbols[Math.floor(Math.random() * symbols.length)]);
  
    // Fill the rest of the 19 characters
    for (let i = 0; i < 19; i++) {
      result.push(allChars[Math.floor(Math.random() * allChars.length)]);
    }
  
    // Shuffle to randomize symbol position
    result = result.sort(() => 0.5 - Math.random());
  
    // Set the value in the input
    keyName.value = result.join('');
    updateCreateKeyButtons();
}
  
  
// Debounce function
function debounce(fn, delay = 300) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
}
  