// Custom Select Box
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

            // Update the select box text and field value input
            selectSelected.value = fieldValue;
            selectItems.querySelectorAll('div').forEach(function(el) {
                el.classList.remove('same-as-selected');
            });
            this.classList.add('same-as-selected');
            selectItems.style.display = 'none';
        });
    });
});