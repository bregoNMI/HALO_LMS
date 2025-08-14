// Custom Select Box
document.addEventListener("DOMContentLoaded", function () {
    var customSelects = document.querySelectorAll('.custom-select');
    var sortButton = document.getElementById('sortButton');
    var sortForm = document.getElementById('sortForm');
    var sortByInput = document.getElementById('sort_by');

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
            if (selectItems.id === 'sortSelectItems') {
                item.addEventListener('click', function() {
                    var selectedValue = this.getAttribute('data-value');
                    sortByInput.value = selectedValue;
                    sortForm.submit();
                });
            } else {
                item.addEventListener('click', function() {
                    // Get the field name and value from data attributes
                    var fieldName = this.getAttribute('data-name');
                    var fieldValue = this.getAttribute('data-value');
                    console.log('fieldName:', fieldName, 'fieldValue:', fieldValue, 'this:', this, 'selectSelected.textContent:', selectSelected.textContent, 'this.textContent:', this.textContent);

                    // Update the select box text and field value input
                    selectSelected.textContent = this.textContent;
                    selectItems.querySelectorAll('div').forEach(function(el) {
                        el.classList.remove('same-as-selected');
                    });
                    this.classList.add('same-as-selected');
                    selectItems.style.display = 'none';

                    // Update the field name and value in the input
                    var fieldValueInput = document.getElementById(fieldName);
                    if (fieldName && fieldValueInput) {
                        fieldValueInput.name = fieldName;
                        fieldValueInput.value = fieldValue;
                    }
                });
            }
        });
    });

    // Open the sort dropdown when the sort button is clicked
    if(sortButton){
        sortButton.addEventListener('click', function() {
            // Close any open custom selects
            customSelects.forEach(function(customSelect) {
                customSelect.querySelector('.select-items').style.display = 'none';
                customSelect.querySelector('.select-selected').classList.remove('select-open');
            });

            // Toggle the sort dropdown
            sortSelectItems.style.display = sortSelectItems.style.display === 'block' ? 'none' : 'block';
        });
    }

    // Close the sort dropdown if the user clicks outside of it
    document.addEventListener('click', function(event) {
        var sortByParent = event.target.closest('[data-key="sort_by"]');
        if(sortButton){
            if (!sortButton.contains(event.target) && !sortSelectItems.contains(event.target) && !sortByParent) {
                sortSelectItems.style.display = 'none';
            }
        }
    });

    // Close the dropdown if the user clicks outside of it
    document.addEventListener('click', function(event) {
        customSelects.forEach(function(customSelect) {
            var selectItems = customSelect.querySelector('.select-items');
            var selectSelected = customSelect.querySelector('.select-selected');
            if (!customSelect.contains(event.target) && selectItems.id !== 'sortSelectItems') {
                selectItems.style.display = 'none';
                selectSelected.classList.remove('select-open');
            }
        });
    });

    const dateCustomSelects = document.querySelectorAll('.date-custom-select');

    dateCustomSelects.forEach(customSelect => {
        const selectSelected = customSelect.querySelector('.date-select-selected');
        const selectItems = customSelect.querySelector('.date-select-items');
        const selectOptions = selectItems.querySelectorAll('.select-item');

        // Toggle the dropdown open/close using your class
        customSelect.addEventListener('click', function (e) {
            e.stopPropagation();

            // Close any other open dropdowns
            dateCustomSelects.forEach(other => {
            if (other !== customSelect) {
                const otherItems = other.querySelector('.date-select-items');
                otherItems.classList.remove('animate-select-dropdown');
            }
            });

            // Toggle this one
            const isOpen = selectItems.classList.contains('animate-select-dropdown');
            if (isOpen) {
                selectItems.classList.remove('animate-select-dropdown');
            } else {
                // (optional) retrigger animation by removing/adding the same class
                selectItems.classList.remove('animate-select-dropdown');
                // void selectItems.offsetWidth; // force reflow if you need a re-anim
                selectItems.classList.add('animate-select-dropdown');
            }
        });

        // Handle selecting a value
        selectOptions.forEach(option => {
            option.addEventListener('click', function (e) {
            e.stopPropagation();

            const value = this.getAttribute('data-value');

            // Update selected class
            selectOptions.forEach(opt => opt.classList.remove('same-as-selected'));
            this.classList.add('same-as-selected');

            // Close dropdown
            selectItems.classList.remove('animate-select-dropdown');

            // Call function to detect date filter
            if (option.classList.contains('analytics-select-item')) {
                refreshCharts();
            } else {
                updateDateFilter(customSelect, value);
                selectSelected.setAttribute('value', value);
                selectSelected.textContent = value;
            }
            });
        });

        // Close dropdown if clicked outside
        document.addEventListener('click', function (e) {
            if (!customSelect.contains(e.target)) {
            selectItems.classList.remove('animate-select-dropdown');
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