document.addEventListener('DOMContentLoaded', () => {
    const nameInput = document.getElementById('title');
    const createTemplateButtons = document.querySelectorAll('.create-template-btn');
    const editTemplateButtons = document.querySelectorAll('.edit-template-btn');

    nameInput.addEventListener('keyup', function () {
        createTemplateButtons.forEach(btn => {
            if (this.value.trim().length >= 1) {
                btn.classList.remove('disabled');
                btn.removeAttribute('disabled');
            } else {
                btn.classList.add('disabled');
                btn.setAttribute('disabled', true);
            }
        });
        editTemplateButtons.forEach(btn => {
            if (this.value.trim().length >= 1) {
                btn.classList.remove('disabled');
                btn.removeAttribute('disabled');
            } else {
                btn.classList.add('disabled');
                btn.setAttribute('disabled', true);
            }
        });
    });

    createTemplateButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const title = nameInput.value.trim();
            const description = getEditorContent('description');

            if (title) {
                createTemplate(title, description, templateSelections);

                createTemplateButtons.forEach(button => {
                    button.classList.add('disabled');
                    button.setAttribute('disabled', true);
                });

                setDisabledSaveBtns();
            } else {
                displayValidationMessage('Please enter a Template Name', false);
            }
        });
    });

    editTemplateButtons.forEach(btn => {
        btn.addEventListener('click', function () {
            const title = nameInput.value.trim();
            const description = getEditorContent('description');
            const templateId = btn.getAttribute('data-template-id');
    
            if (!title) {
                displayValidationMessage('Please enter a Template Name', false);
                return;
            }
    
            if (!templateId) {
                console.error('Missing template ID for update.');
                return;
            }
    
            setDisabledSaveBtns();
            saveTemplateEdits(templateId, title, description, templateSelections);
        });
    });    

    document.getElementById('resetCategorySelection').addEventListener('click', () => {
        const mainInput = document.getElementById('category');
    
        // Clear value and data-id
        mainInput.value = '';
        mainInput.removeAttribute('data-id');
    
        // Clear dropdown UI
        const dropdown = mainInput.parentElement.querySelector('.categoryList');
        if (dropdown) dropdown.innerHTML = '';
    
        // Manually trigger change to activate existing logic
        mainInput.dispatchEvent(new Event('change'));
    
        // Optional: remove selected styling from dropdown list if any
        const selected = mainInput.parentElement.querySelector('.dropdown-item.selected');
        if (selected) {
            selected.classList.remove('selected');
            const checkbox = selected.querySelector('.category-checkbox');
            if (checkbox) checkbox.checked = false;
        }

        updateSubCategoryContainerVisibility();
        // Refresh question count logic
        const selectedCategory = getDeepestSelectedCategory();
        if (selectedCategory?.id) {
            fetchQuestionCountForCategory(selectedCategory.id);
        } else {
            document.getElementById('questionCountInput').value = '';
            document.getElementById('availableQuestions').textContent = 'Total Available Questions: --';
        }
    });    

    initTemplateCategoryFlow();
    updateTotalQuestionsAdded();
    initializeSubcategoryDropdown("userDropdown2", null); // Main Category
    initializeSubcategoryDropdown("userDropdown3", document.getElementById("category"));       // Sub Category 1
    initializeSubcategoryDropdown("userDropdown4", document.getElementById("sub_category1"));  // Sub Category 2
    initializeSubcategoryDropdown("userDropdown5", document.getElementById("sub_category2"));
});

function createTemplate(title, description, selections) {
    const payload = {
        title,
        description,
        selections,  // [{ mainCategoryId, subCategoryId, questionCount }]
    };

    fetch('/requests/create-template/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            // displayValidationMessage('Template created!', true);
            // optionally redirect or reset UI
            location.href = '/admin/quiz-templates/';
        } else {
            displayValidationMessage(data.error || 'Failed to create template.', false);
        }
    })
    .catch(err => {
        console.error(err);
        displayValidationMessage('Error creating template.', false);
    });
}

function saveTemplateEdits(templateId, title, description, selections) {
    const payload = {
        title,
        description,
        selections
    };

    fetch(`/requests/update-template/${templateId}/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            displayValidationMessage('Template updated successfully!', true);
            location.href = '/admin/quiz-templates/';
        } else {
            displayValidationMessage(data.error || 'Failed to update template.', false);
        }
    })
    .catch(err => {
        console.error(err);
        displayValidationMessage('Error updating template.', false);
    });
}

const templateSelections = [];

function initTemplateCategoryFlow() {
    const allInputs = document.querySelectorAll('.categorySearch');

    allInputs.forEach(input => {
        input.addEventListener('change', () => {
            const value = input.value.trim();
            const hasSelection = input.getAttribute('data-id');
            const isMain = input.id === 'category';
        
            if (value === '') {
                clearChildDropdowns(input);
            }
        
            // Only show child container if a category was actually selected
            const childId = input.getAttribute('data-child-id');
            const childContainer = childId ? document.getElementById(childId) : null;
        
            if (hasSelection && childContainer) {
                childContainer.style.display = 'flex';
            } else if (childContainer) {
                childContainer.style.display = 'none';
            }
        
            if (isMain) {
                // only show #subCategoryContainer if something is selected
                document.getElementById('subCategoryContainer').style.display = hasSelection ? 'flex' : 'none';
            }
        });        
    });
}

function addCategorySelectionToTemplate() {
    const main = document.getElementById('category');
    const sub1 = document.getElementById('sub_category1');
    const sub2 = document.getElementById('sub_category2');
    const sub3 = document.getElementById('sub_category3');
    const questionCountInput = document.getElementById('questionCountInput');
    const questionCount = parseInt(questionCountInput?.value || 0);
    const max = parseInt(questionCountInput?.max || 0);

    if (!main.getAttribute('data-id') || questionCount <= 0) {
        displayValidationMessage('Please select a category and a valid number of questions.', false);
        return;
    }

    const selection = {
        mainCategoryId: main.getAttribute('data-id'),
        mainCategoryName: main.value,
        subCategory1Id: sub1.getAttribute('data-id'),
        subCategory1Name: sub1.value,
        subCategory2Id: sub2.getAttribute('data-id'),
        subCategory2Name: sub2.value,
        subCategory3Id: sub3.getAttribute('data-id'),
        subCategory3Name: sub3.value,
        questionCount: questionCount
    };

    const categoryKey = getCategoryKey(selection);
    const alreadySelected = getTotalSelectedQuestionsForCategory(categoryKey);

    if (alreadySelected + questionCount > max) {
        const remaining = Math.max(0, max - alreadySelected);
        const message = remaining === 0
            ? `You cannot add any more questions from this category (max ${max}).`
            : `You can only add ${remaining} more question${remaining === 1 ? '' : 's'} from this category (max ${max}).`;
    
        displayValidationMessage(message, false);
        return;
    }       

    templateSelections.push(selection);
    renderTemplateQuestionTable();
    updateTotalQuestionsAdded();
    // Refresh count
    const selected = getDeepestSelectedCategory();
    if (selected?.id) {
        fetchQuestionCountForCategory(selected.id);
    } else {
        document.getElementById('questionCountInput').value = '';
        document.getElementById('availableQuestions').textContent = 'Total Available Questions: --';
    }
}

function renderTemplateQuestionTable() {
    const tbody = document.querySelector('#templateQuestionTable tbody');
    tbody.innerHTML = '';

    templateSelections.forEach((sel, idx) => {
        const categoryPath = [
            sel.mainCategoryName,
            sel.subCategory1Name,
            sel.subCategory2Name,
            sel.subCategory3Name
        ].filter(Boolean).join('  <i class="fa-regular fa-arrow-right sub-category-divider"></i>  ');

        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="width: auto;">${categoryPath}</td>
            <td style="width: 160px;">${sel.questionCount}</td>
            <td style="width: 80px;""><button class="remove-table-icon" onclick="removeTemplateSelection(${idx})"><i class="fa-regular fa-trash-can"></i></button></td>
        `;
        tbody.appendChild(tr);
    });
}

function removeTemplateSelection(index) {
    const removed = templateSelections[index];
    templateSelections.splice(index, 1);

    renderTemplateQuestionTable();
    updateTotalQuestionsAdded();

    const categoryId = 
        removed.subCategory3Id || 
        removed.subCategory2Id || 
        removed.subCategory1Id || 
        removed.mainCategoryId;

    if (categoryId) {
        fetchQuestionCountForCategory(categoryId);
    }
}


function clearChildDropdowns(startingInput, visited = new Set()) {
    if (!startingInput || visited.has(startingInput.id)) return;
    visited.add(startingInput.id);

    const inputId = startingInput.id;
    const childId = startingInput.getAttribute('data-child-id');

    console.log('Clearing children of:', inputId);

    // Clear current input value and data-id
    startingInput.value = '';
    startingInput.removeAttribute('data-id');

    // Clear dropdown content
    const dropdown = startingInput.parentElement.querySelector('.categoryList');
    if (dropdown) dropdown.innerHTML = '';

    // Recurse on child input
    if (childId) {
        const childContainer = document.getElementById(childId);
        const childInput = childContainer?.querySelector('.categorySearch');

        if (childInput) {
            console.log('Clearing input for:', childInput.id);
            clearChildDropdowns(childInput, visited);
        }

        // Only hide containers *after* subCategory1
        if (childContainer && childContainer.id !== 'subCategory1') {
            childContainer.style.display = 'none';
        }
    }

    // Determine if subCategoryContainer should remain visible
    const mainInput = document.getElementById('category');
    const allSubInputs = ['sub_category1', 'sub_category2', 'sub_category3'].map(id =>
        document.getElementById(id)
    );
    const hasMain = mainInput && mainInput.value.trim() !== '';
    const hasAnySub = allSubInputs.some(input => input && input.value.trim() !== '');

    document.getElementById('subCategoryContainer').style.display = hasMain || hasAnySub ? 'flex' : 'none';
}

function getDeepestSelectedCategory() {
    const levels = ['sub_category3', 'sub_category2', 'sub_category1', 'category'];
    for (let id of levels) {
        const input = document.getElementById(id);
        if (input?.getAttribute('data-id')) {
            return {
                id: input.getAttribute('data-id'),
                name: input.value
            };
        }
    }
    return null;
}

function fetchQuestionCountForCategory(categoryId) {
    fetch(`/requests/${categoryId}/question-count/`)
        .then(res => res.json())
        .then(data => {
            if (data && typeof data.question_count === 'number') {
                const rawCount = data.question_count;

                // Adjust for already selected questions
                const adjustedCount = rawCount - getTotalSelectedQuestionsForCategory(categoryId);
                const displayCount = Math.max(0, adjustedCount); // prevent negatives

                document.getElementById('questionCountInput').max = displayCount;
                document.getElementById('questionCountInput').value = displayCount;
                document.getElementById('availableQuestions').textContent = `Total Available Questions: ${displayCount}`;
            } else {
                document.getElementById('availableQuestions').textContent = 'Error fetching count';
            }
        })
        .catch(err => {
            console.error(err);
            document.getElementById('availableQuestions').textContent = 'Error fetching count';
        });
}

function getCategoryKey(selection) {
    return [
        selection.mainCategoryId,
        selection.subCategory1Id,
        selection.subCategory2Id,
        selection.subCategory3Id
    ].filter(Boolean).join('|');
}

function getTotalSelectedQuestionsForCategory(categoryId) {
    const id = String(categoryId); // force string comparison

    return templateSelections.reduce((sum, sel) => {
        return [
            sel.mainCategoryId,
            sel.subCategory1Id,
            sel.subCategory2Id,
            sel.subCategory3Id
        ].map(String).includes(id) ? sum + sel.questionCount : sum;
    }, 0);
}

function updateTotalQuestionsAdded() {
    const total = templateSelections.reduce((sum, sel) => sum + sel.questionCount, 0);
    const display = document.getElementById('addedQuestions');
    if (display) {
        display.textContent = `Total Questions Added: ${total}`;
    }
}

function updateSubCategoryContainerVisibility() {
    const subInputs = ['sub_category1', 'sub_category2', 'sub_category3'].map(id => document.getElementById(id));
    const anySelected = subInputs.some(input => input && input.getAttribute('data-id'));

    const container = document.getElementById('subCategoryContainer');
    container.style.display = anySelected ? 'flex' : 'none';
}

function initializeSubcategoryDropdown(containerId, parentInput) {
    const container = document.getElementById(containerId);
    const clearBtn = container.querySelector('.dropdown-clear-input');
    const searchInput = container.querySelector('.categorySearch');
    const dropdownList = container.querySelector('.categoryList');
    const loading = container.querySelector('.loadingIndicator');
    const selectedDisplay = container.querySelector('.selectedCategories');
    const noResultsDisplay = container.querySelector('.no-results');

    let page = 1;
    let isLoading = false;
    let hasMore = true;

    if (noResultsDisplay) noResultsDisplay.style.display = 'none';

    function fetchSubcategories(searchTerm = '', reset = false) {
        if (isLoading || !hasMore) return;

        isLoading = true;
        if (loading) loading.style.display = 'block';

        const parentId = parentInput?.getAttribute('data-id') || '';
        fetch(`/requests/get-subcategories/?parent_id=${parentId}&search=${encodeURIComponent(searchTerm)}&page=${page}`, {
            headers: { 'X-Requested-With': 'XMLHttpRequest' }
        })
            .then(res => res.json())
            .then(data => {
                if (reset) {
                    dropdownList.innerHTML = '';
                    page = 1;
                }

                if (!data.categories.length) {
                    if (reset) dropdownList.innerHTML = '<div class="no-results">No subcategories found</div>';
                    hasMore = false;
                    return;
                }

                data.categories.forEach(cat => {
                    const item = document.createElement('div');
                    item.classList.add('dropdown-item');
                    item.innerHTML = `<div class="dropdown-item-inner"><h5>${cat.name}</h5></div>`;
                    item.dataset.categoryId = cat.id;

                    const checkboxWrap = document.createElement('div');
                    checkboxWrap.innerHTML = `
                        <label class="container">
                            <input value="${cat.id}" class="category-checkbox" type="checkbox">
                            <div class="checkmark"></div>
                        </label>
                    `;

                    const checkbox = checkboxWrap.querySelector('.category-checkbox');
                    item.prepend(checkboxWrap);

                    const selectedId = searchInput.getAttribute('data-id');
                    if (selectedId && selectedId === String(cat.id)) {
                        checkbox.checked = true;
                        item.classList.add('selected');
                    }

                    dropdownList.appendChild(item);

                    item.addEventListener('click', function () {
                        const checkboxes = dropdownList.querySelectorAll('.category-checkbox');
                        checkboxes.forEach(cb => {
                            if (cb !== checkbox) {
                                cb.checked = false;
                                cb.closest('.dropdown-item').classList.remove('selected');
                            }
                        });
                    
                        const alreadySelected = checkbox.checked;
                        checkbox.checked = !alreadySelected;
                    
                        if (!alreadySelected) {
                            searchInput.value = cat.name;
                            searchInput.setAttribute('data-id', cat.id);
                            item.classList.add('selected');

                            
                        } else {
                            searchInput.value = '';
                            searchInput.removeAttribute('data-id');
                            item.classList.remove('selected');

                            
                        }
                    
                        // Show child input if it exists
                        const childId = searchInput.dataset.childId;
                        const selectedId = searchInput.getAttribute('data-id');
                        if (childId && selectedId) {
                            const childContainer = document.getElementById(childId);
                            if (childContainer) childContainer.style.display = 'block';
                        }
                    
                        // Hide dropdown and restyle
                        dropdownList.style.display = 'none';
                        searchInput.style.borderRadius = '8px';
                        searchInput.style.border = '1px solid #ececf1';
                    
                        // Refresh count
                        const selected = getDeepestSelectedCategory();
                        if (selected?.id) {
                            fetchQuestionCountForCategory(selected.id);
                        } else {
                            document.getElementById('questionCountInput').value = '';
                            document.getElementById('availableQuestions').textContent = 'Total Available Questions: --';
                        }
                        updateSubCategoryContainerVisibility();
                    
                        // Trigger 'change' to keep category logic alive
                        searchInput.dispatchEvent(new Event('change'));
                    });                    

                    checkbox.addEventListener('click', e => e.stopPropagation());
                });

                hasMore = data.has_more;
            })
            .catch(err => {
                console.error('Error fetching subcategories:', err);
            })
            .finally(() => {
                isLoading = false;
                if (loading) loading.style.display = 'none';
                page += 1;
            });
    }

    dropdownList.addEventListener('scroll', function () {
        if (dropdownList.scrollTop + dropdownList.clientHeight >= dropdownList.scrollHeight) {
            fetchSubcategories(searchInput.value);
        }
    });

    searchInput.addEventListener('input', function () {
        page = 1;
        hasMore = true;
        fetchSubcategories(this.value, true);
    });

    searchInput.addEventListener('focus', function () {
        page = 1;
        hasMore = true;
        searchInput.style.borderRadius = '8px 8px 0 0';
        dropdownList.style.display = 'block';
        searchInput.style.border = '2px solid #c7c7db';
        fetchSubcategories(this.value, true);
    });

    document.addEventListener('click', function (e) {
        if (!container.contains(e.target)) {
            dropdownList.style.display = 'none';
            searchInput.style.borderRadius = '8px';
            searchInput.style.border = '1px solid #ececf1';
        }
    });

    if (clearBtn) {
        clearBtn.addEventListener('click', function () {
            // First: clear the input itself
            searchInput.value = '';
            searchInput.removeAttribute('data-id');
    
            // Clear the dropdown UI
            const selected = dropdownList.querySelector('.dropdown-item.selected');
            if (selected) {
                selected.classList.remove('selected');
                const checkbox = selected.querySelector('.category-checkbox');
                if (checkbox) checkbox.checked = false;
            }
    
            dropdownList.innerHTML = '';
            dropdownList.style.display = 'none';
            searchInput.style.borderRadius = '8px';
            searchInput.style.border = '1px solid #ececf1';
    
            // Now: clear any children
            clearChildDropdowns(searchInput);
    
            // Refresh question count logic
            const selectedCategory = getDeepestSelectedCategory();
            if (selectedCategory?.id) {
                fetchQuestionCountForCategory(selectedCategory.id);
            } else {
                document.getElementById('questionCountInput').value = '';
                document.getElementById('availableQuestions').textContent = 'Total Available Questions: --';
            }
    
            // Update subcategory container visibility
            updateSubCategoryContainerVisibility();
    
            // Trigger change event
            searchInput.dispatchEvent(new Event('change'));
        });
    }       

    fetchSubcategories(); // initial fetch
}