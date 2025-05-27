// Custom Select Box
document.addEventListener("DOMContentLoaded", function () {
    var customSelects = document.querySelectorAll('.custom-select');

    customSelects.forEach(function(customSelect) {
        var selectSelected = customSelect.querySelector('.select-selected');
        var selectItems = customSelect.querySelector('.select-items');

        // Toggle the dropdown
        selectSelected.addEventListener('click', function() {
            // Close any open dropdowns
            customSelects.forEach(function(otherSelect) {
                if (otherSelect !== customSelect) {
                    otherSelect.querySelector('.select-items').style.display = 'none';
                    otherSelect.querySelector('.select-selected').classList.remove('select-open');
                }
            });
            selectSelected.classList.toggle('select-open');
            selectItems.style.display = selectItems.style.display === 'block' ? 'none' : 'block';
        });

        // Close the dropdown if the user clicks outside of it
        document.addEventListener('click', function(event) {
            if (!customSelect.contains(event.target) && selectItems.id != 'sortSelectItems') {
                selectItems.style.display = 'none';
                selectSelected.classList.remove('select-open');
            }
        });

        // Handle item selection
        selectItems.querySelectorAll('div').forEach(function(item) {
            item.addEventListener('click', function() {
                // Get the field name and value from data attributes
                var fieldName = this.getAttribute('data-name');
                var fieldValue = this.getAttribute('data-value');

                console.log('selected');

                // Update the select box text and field value input
                selectSelected.setAttribute('value', fieldValue);
                selectItems.querySelectorAll('div').forEach(function(el) {
                    el.classList.remove('same-as-selected');
                });
                this.classList.add('same-as-selected');
                selectItems.style.display = 'none';
            });
        });
    });

    const dateCustomSelects = document.querySelectorAll('.date-custom-select');
    
        dateCustomSelects.forEach(customSelect => {
            const selectSelected = customSelect.querySelector('.date-select-selected');
            const selectItems = customSelect.querySelector('.date-select-items');
            const selectOptions = selectItems.querySelectorAll('.select-item');
    
            // Toggle the dropdown open/close
            customSelect.addEventListener('click', function (e) {
                e.stopPropagation();
    
                // Close any other open dropdowns
                dateCustomSelects.forEach(other => {
                    if (other !== customSelect) {
                        other.querySelector('.date-select-items').style.display = 'none';
                    }
                });
    
                const isOpen = selectItems.style.display === 'block';
                selectItems.style.display = isOpen ? 'none' : 'block';
            });
    
            // Handle selecting a value
            selectOptions.forEach(option => {
                option.addEventListener('click', function (e) {
                    e.stopPropagation();
    
                    const value = this.getAttribute('data-value');
    
                    // Update the visible label
                    selectSelected.textContent = value;
                    selectSelected.setAttribute('value', value);
    
                    // Update selected class
                    selectOptions.forEach(opt => opt.classList.remove('same-as-selected'));
                    this.classList.add('same-as-selected');
    
                    // Close dropdown
                    selectItems.style.display = 'none';

                    // Call function to detect date filter
                    updateDateFilter(customSelect, value);
                });
            });
    
            // Close dropdown if clicked outside
            document.addEventListener('click', function (e) {
                if (!customSelect.contains(e.target)) {
                    selectItems.style.display = 'none';
                }
            });
        });
    
});

// Dynamically Opening Popups
function openPopup(popup){
    const currentPopup = document.getElementById(popup);
    const popupContent = currentPopup.querySelector('.popup-content');
    currentPopup.style.display = "flex";
    setTimeout(() => {
        popupContent.classList.add('animate-popup-content');
    }, 100);
}

function closePopup(popup){
    const currentPopup = document.getElementById(popup);
    const popupContent = currentPopup.querySelector('.popup-content');
    popupContent.classList.remove('animate-popup-content');
    setTimeout(() => {
        currentPopup.style.display = "none";
    }, 200);
}