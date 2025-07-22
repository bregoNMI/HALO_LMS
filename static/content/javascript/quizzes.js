document.addEventListener('DOMContentLoaded', function () {
    initializeQuestionDragAndDrop();
    getQuestionData();
    initializeEmbedCodeListener();
    initializeCreateCategory();
    loadQuizReferences();

    // Get all checkboxes with the 'on_login_course' class or a unique selector
    const onLoginCourseCheckboxes = document.querySelectorAll('.toggle-hidden-settings-input');
    
    // Function to toggle the visibility of the corresponding hidden input
    function toggleHiddenInput(checkbox) {
        const hiddenSettingsInput = checkbox.closest('.edit-settings-input').nextElementSibling;

        if (checkbox.checked) {
            hiddenSettingsInput.style.display = 'block';
        } else {
            hiddenSettingsInput.style.display = 'none';
        }
    }

    // Run on page load and add event listeners for all checkboxes
    onLoginCourseCheckboxes.forEach(function (checkbox) {
        toggleHiddenInput(checkbox);  // Run this on page load in case any checkbox is pre-checked
        
        // Add event listener to toggle the hidden input when the checkbox changes
        checkbox.addEventListener('change', function () {
            toggleHiddenInput(checkbox);
        });
    });
});

// Loading all of the question data from the quiz using the UUID
async function getQuestionData() {
    const quizUUID = document.getElementById('quizUUID').value;
    const activeItem = document.querySelector('.question-item.active');
    const activeQuestionId = activeItem ? activeItem.dataset.questionId : null;

    const response = await fetch('/requests/get-quiz-data/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: new URLSearchParams({ uuid: quizUUID }),
    });

    const result = await response.json();

    if (result.success) {
        renderQuestions(result.questions);
        initializeQuestionDragAndDrop();
        initializeDropdownMenus();
        if (activeQuestionId) {
            document.querySelectorAll('.question-item').forEach((item, index) => {
                if (item.dataset.questionId === String(activeQuestionId)) {
                    item.classList.add('active');
                }
            });
        }
        return true;
    } else {
        displayValidationMessage(result.error, false);
        return false;
    }
}

/* Displaying the questions and answers within the editing box on the right */
async function getAnswerData(questionId, force = false) {
    const activeItem = document.querySelector('.question-item.active');
    const activeQuestionId = activeItem ? activeItem.dataset.questionId : null;
    if (!force && String(activeQuestionId) === String(questionId)) {
        return;
    }    
    let loadingTimeout;

    try {
        let activeIndex = 0;
        hideNoQuestionsContainer();       

        loadingTimeout = setTimeout(() => {
            showLoadingContainer();
            hideQuestionEditor();
        }, 1000);

        document.querySelectorAll('.question-item').forEach((item, index) => {
            item.classList.remove('active');
            if (item.dataset.questionId === String(questionId)) {
                item.classList.add('active');
                activeIndex = index + 1;
            }
        });

        const response = await fetch('/requests/get-answer-data/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({ question_id: questionId }),
        });

        const result = await response.json();

        clearTimeout(loadingTimeout);
        hideLoadingContainer();

        if (result.success) {
            result.question.number = activeIndex;
            displayQuestionEditor(result.question);
            removeDisabledSaveBtns();
        } else {
            removeDisabledSaveBtns();
            console.error(result.error);
            displayValidationMessage(`Could not load question. It may have been deleted.`, false);
        }
    } catch (error) {
        clearTimeout(loadingTimeout);
        hideLoadingContainer();
        displayValidationMessage(error, false);
    }
}

function displayQuestionEditor(question) {
    const container = document.getElementById('questionEditor');
    container.dataset.questionId = question.id;
    container.dataset.questionType = question.type;
    container.style.display = 'flex';
    let questionIcon;
    let questionIconcolor;
    let questionType;

    if(question.type == 'MCQuestion'){
        questionIcon = '<i class="fa-regular fa-check-double"></i>';
        questionIconcolor = 'pastel-purple';
        questionType = 'Multiple Choice';
    }else if (question.type === 'MRQuestion') {
        questionIcon = '<i class="fa-regular fa-square-check"></i>';
        questionIconcolor = 'pastel-green';
        questionType = 'Multiple Response';
    }else if(question.type == 'TFQuestion'){
        questionIcon = '<i class="fa-regular fa-circle-half-stroke"></i>';
        questionIconcolor = 'pastel-blue';
        questionType = 'True/False';
    }else if(question.type == 'FITBQuestion'){
        questionIcon = '<i class="fa-regular fa-pen-line"></i>';
        questionIconcolor = 'pastel-pink';
        questionType = 'Fill In The Blank';
    }else if(question.type == 'EssayQuestion'){
        questionIcon = '<i class="fa-regular fa-comment-dots"></i>';
        questionIconcolor = 'pastel-orange';
        questionType = 'Open Response';
        fillEssayOptions(question);
    }

    if ((question.type === 'MCQuestion' || question.type === 'MRQuestion') && (!question.answers || question.answers.length === 0)) {
        question.answers = Array.from({ length: 4 }, () => ({
            id: null,
            text: '',
            is_correct: false
        }));
    }

    container.innerHTML = `
        <div class="question-editor">
            <div class="question-editor-header">
                <div class="question-editor-header-left">
                    <div class="quiz-builder-dropdown-container relative-container">
                        <div class="quiz-builder-dropdown-toggle question-editor-header-dropdown">
                            <div class="question-item-icon ${questionIconcolor}">
                                ${questionIcon}
                            </div>
                            <div class="question-type-text">
                                <span>${questionType}</span>
                            </div>
                            ${question.type == 'MCQuestion' || question.type == 'MRQuestion' ? `
                                <div class="question-item-dropdown-icon">
                                    <i class="fa-regular fa-angle-down"></i>
                                </div>` 
                            : ''}                            
                        </div>
                        ${question.type == 'MCQuestion' || question.type == 'MRQuestion' ? `
                            <div class="quiz-builder-dropdown-options width-2">
                                <div onclick="changeQuestionType('${question.type}')" class="quiz-builder-type-option">
                                    <div class="question-item-icon pastel-purple">
                                        <i class="fa-regular fa-check-double"></i>
                                    </div>
                                    <span>Multiple Choice</span>
                                </div>
                                <div onclick="changeQuestionType('${question.type}')" class="quiz-builder-type-option">
                                    <div class="question-item-icon pastel-green">
                                        <i class="fa-regular fa-square-check"></i>
                                    </div>
                                    <span>Multiple Response</span>
                                </div>
                            </div>` 
                        : ''}                    
                    </div>               
                </div>
                <div class="question-editor-header-right">
                    <div onclick="openPopup('assignCategory')" id="categoryDisplayLabel" class="question-editor-label pastel-gray tooltip" data-tooltip="Category">
                        <div id="categoryDisplayName" class="question-editor-label-text">${question.category_name}</div>
                        <span class="tooltiptext">Category</span>
                    </div>
                    ${question.type == 'EssayQuestion' ? `
                        <div onclick="openPopup('editQuestionInstructions')" class="question-editor-option tooltip" data-tooltip="Instructions">
                            <span class="tooltiptext">Instructions</span>
                            <div class="question-editor-action-icon">
                                <i class="fa-light fa-memo-circle-info"></i>
                            </div>
                        </div>
                        <div onclick="openPopup('editQuestionRubric')" class="question-editor-option tooltip" data-tooltip="Rubric">
                            <span class="tooltiptext">Rubric</span>
                            <div class="question-editor-action-icon">
                                <i class="fa-light fa-scroll"></i>
                            </div>
                        </div>`
                    : ''}
                    <div class="quiz-builder-dropdown-container relative-container">
                        <div class="quiz-builder-dropdown-toggle tooltip" data-tooltip="Category">
                            <span class="tooltiptext">Add Category</span>
                            <div class="question-editor-action-icon">
                                <i class="fa-light fa-grid-2"></i>
                            </div>
                        </div>
                        <div class="quiz-builder-dropdown-options width-2">
                            <div onclick="openPopup('assignCategory')" class="quiz-builder-type-option">
                                <div class="question-item-icon pastel-gray">
                                    <i class="fa-regular fa-grid-2"></i>
                                </div>
                                <span>Assign Category</span>
                            </div>
                            <div onclick="openPopup('createCategory')" class="quiz-builder-type-option">
                                <div class="question-item-icon pastel-gray">
                                    <i class="fa-regular fa-grid-2-plus"></i>
                                </div>
                                <span>Create Category</span>
                            </div>
                        </div>
                    </div>
                    <div class="quiz-builder-dropdown-container relative-container">
                        <div class="quiz-builder-dropdown-toggle tooltip" data-tooltip="Add Media">
                            <span class="tooltiptext">Add Media</span>
                            <div class="question-editor-action-icon">
                                <i class="fa-light fa-folder-image"></i>
                            </div>
                        </div>
                        <div class="quiz-builder-dropdown-options width-3">
                            <div onclick="addMedia('upload-media')" class="quiz-builder-type-option">
                                <div class="question-item-icon pastel-gray">
                                    <i class="fa-regular fa-arrow-up-from-bracket"></i>
                                </div>
                                <span>Upload Media</span>
                            </div>
                            <div onclick="addMedia('file-library')" class="quiz-builder-type-option">
                                <div class="question-item-icon pastel-gray">
                                    <i class="fa-regular fa-folder-open"></i>
                                </div>
                                <span>File Library</span>
                            </div>
                            <div onclick="addMedia('embed')" class="quiz-builder-type-option">
                                <div class="question-item-icon pastel-gray">
                                    <i class="fa-regular fa-code"></i>
                                </div>
                                <span>Embed</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>           
            <div class="question-content-container">
                <div class="question-content-input">
                    <div class="question-editor-title">
                        <label for="questionContent" class="question-editor-number">
                            <i class="fa-solid fa-circle-question"></i>
                            <span class="question-number"> Question ${question.number}</span>
                            <span class="required-asterisk">*</span>
                        </label>
                        <div class="quill-character-counter">
                            <div class="quill-current-counter">0</div>
                            <span>/</span>
                            <div class="quill-max-counter">1000</div>
                        </div>
                    </div>
                    <textarea class="scrollable-content" id="questionContent" max_length="1000" placeholder="Enter question content here...">${question.content}</textarea>
                </div>
                <div id="questionMediaContainer" class="question-media-gallery"></div>
            </div>
            <div id="questionEmbedContainer" class="question-embed-container" style="display: none;"></div>
            <div class="answers-section">
                ${renderAnswers(question)}
            </div>
        </div>
    `;
    initializeDropdownMenus();
    initializeAnswerDragAndDrop();
    detectCharacterCounters();
    initializeTextareaResize();
    renderQuestionMedia(question);
    const embedInput = document.getElementById('embedCodeInput');
    embedInput.value = '';
    fillCategory(question);   
}

function hideQuestionEditor(){
    const questionEditor = document.getElementById('questionEditor');
    questionEditor.style.display = 'none';
}

function fillEssayOptions(question) {
    const instructionsEditorId = 'questionInstructions';
    const instructionsEditor = quillEditors[instructionsEditorId];

    const rubricEditorId = 'questionRubric';
    const rubricEditor = quillEditors[rubricEditorId];

    if (rubricEditor) {
        rubricEditor.clipboard.dangerouslyPasteHTML(question.rubric || '');
    } else {
        console.warn(`Editor with ID "${rubricEditorId}" not found`);
    }

    if (instructionsEditor) {
        instructionsEditor.clipboard.dangerouslyPasteHTML(question.instructions || '');
    } else {
        console.warn(`Editor with ID "${instructionsEditorId}" not found`);
    }
}

function fillCategory(question) {
    const assignCategoryName = document.getElementById('assignCategoryName');
    assignCategoryName.setAttribute('data-id', question.category_id ?? '');
    assignCategoryName.value = question.category_name ?? '';

    displayCategory(question.category_id, question.category_name);
}

function displayCategory(id, name) {
    const categoryDisplayLabel = document.getElementById('categoryDisplayLabel');
    const categoryDisplayName = document.getElementById('categoryDisplayName');
    
    if (!categoryDisplayLabel || !categoryDisplayName) return;

    if (id) {
        categoryDisplayLabel.style.display = 'flex';
        categoryDisplayName.textContent = name;
    } else {
        categoryDisplayLabel.style.display = 'none';
        categoryDisplayName.textContent = '';
    }
}

function showAssignedCategory(){
    const assignCategoryName = document.getElementById('assignCategoryName');
    let rawCategory = assignCategoryName?.getAttribute('data-id');
    const category = rawCategory && rawCategory !== 'null' ? parseInt(rawCategory) : null;

    displayCategory(category, assignCategoryName.value);
}

function renderAnswers(question) {
    const isMultipleResponse = question.allows_multiple === true;

    switch (question.type) {
        case 'MRQuestion':
        case 'MCQuestion':
            return `
                <div class="answers-option-section">
                    <div class="answers-option">
                        <label class="question-editor-number">
                            <span class="question-number"> Choices </span>
                        </label>
                    </div>
                    <div class="answers-option secondary-answers-option">
                        <label class="edit-settings-label" for="random_order">Randomize Order</label>
                        <label class="toggle-switch" tabindex="0" role="switch">
                            <input class="toggle-hidden-settings-input" type="checkbox" id="random_order" name="random_order" aria-hidden="true" ${question.randomize_answer_order ? 'checked' : ''}>
                            <div class="toggle-switch-background">
                            <div class="toggle-switch-handle"></div>
                            </div>
                        </label>
                    </div>
                </div>
                <div class="answers-container" id="answerList">
                    ${question.answers.map(ans => `
                        <div class="answer-item" data-answer-id="${ans.id != null ? ans.id : ''}">
                            <div class="answer-item-drag">
                                <i class="fa-solid fa-grip-dots-vertical answer-drag-icon"></i>
                            </div>
                            <label class="${isMultipleResponse ? 'container answer-item-checkbox' : 'custom-radio'}">
                                <input class="${isMultipleResponse ? 'checkbox-option' : 'radio-option'} answer-correct" 
                                       type="${isMultipleResponse ? 'checkbox' : 'radio'}" 
                                       name="multiple_choice" 
                                       ${ans.is_correct ? 'checked' : ''}>
                                ${isMultipleResponse ? '<div class="checkmark"></div>': ''}
                                <span class="${isMultipleResponse ? 'custom-checkbox-button' : 'custom-radio-button'}"></span>
                            </label>
                            <input type="text" class="answer-text" value="${ans.text}" placeholder="Enter choice text...">                     
                            <button class="remove-answer-item tooltip" onclick="removeAnswer(this)" data-tooltip="Remove Choice">
                                <i class="fa-light fa-trash-can"></i>
                                <span class="tooltiptext">Remove Choice</span>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <button class="action-button-border add-answer-btn" onclick="addMCAnswer('${question.type}')">+ Add Choice</button>
                <div class="answer-section-footer">
                    <div class="answer-section-footer-left"></div>
                    <div class="answer-section-footer-right">
                        <button onclick="discardChanges()" class="action-button-border discard-btn quiz-save-btns">
                            <i class="fa-regular fa-rotate"></i>
                            <span>Undo Changes</span>
                        </button>
                        <button class="action-button-primary quiz-save-btns" onclick="saveQuestionDataAndAnswers(${question.id}, 'MCQuestion')">
                            <i class="fa-regular fa-floppy-disk"></i>
                            <span>Save Changes</span> 
                        </button>
                    </div>
                </div>
            `;

        case 'FITBQuestion':
            return `
                <div class="answers-option-section">
                    <div class="answers-option">
                        <label class="question-editor-number">
                            <span class="question-number"> Acceptable Answers </span>
                        </label>
                    </div>
                    <div class="answers-option secondary-answers-option">
                        <label class="edit-settings-label" for="case_sensitive">Case Sensitive</label>
                        <label class="toggle-switch" tabindex="0" role="switch">
                            <input class="toggle-hidden-settings-input" type="checkbox" id="case_sensitive" name="case_sensitive" aria-hidden="true" ${question.case_sensitive ? 'checked' : ''}>
                            <div class="toggle-switch-background">
                            <div class="toggle-switch-handle"></div>
                            </div>
                        </label>
                    </div>
                    <div class="answers-option secondary-answers-option">
                        <label class="edit-settings-label" for="strip_whitespace">Strip Whitespace</label>
                        <label class="toggle-switch" tabindex="0" role="switch">
                            <input class="toggle-hidden-settings-input" type="checkbox" id="strip_whitespace" name="strip_whitespace" aria-hidden="true" ${question.strip_whitespace ? 'checked' : ''}>
                            <div class="toggle-switch-background">
                            <div class="toggle-switch-handle"></div>
                            </div>
                        </label>
                    </div>
                </div>
                <div class="answers-container fitb-answers" id="answerList">
                    ${question.answers.map(ans => `
                        <div class="answer-item" data-answer-id="${ans.id != null ? ans.id : ''}">
                            <input type="text" class="answer-text" value="${ans.text}" placeholder="Enter acceptable answer text...">                     
                            <button class="remove-answer-item tooltip" onclick="removeAnswer(this)" data-tooltip="Remove Answer">
                                <i class="fa-light fa-trash-can"></i>
                                <span class="tooltiptext">Remove Answer</span>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <button class="action-button-border fitb-answers add-answer-btn" onclick="addFITBAnswer()">+ Add Acceptable Answer</button>
                <div class="answer-section-footer">
                    <div class="answer-section-footer-left"></div>
                    <div class="answer-section-footer-right">
                        <button onclick="discardChanges()" class="action-button-border discard-btn quiz-save-btns">
                            <i class="fa-regular fa-rotate"></i>
                            <span>Undo Changes</span>
                        </button>
                        <button class="action-button-primary quiz-save-btns" onclick="saveQuestionDataAndAnswers(${question.id}, 'FITBQuestion')">
                            <i class="fa-regular fa-floppy-disk"></i>
                            <span>Save Changes</span> 
                        </button>
                    </div>
                </div>
            `;

        case 'TFQuestion':
            return `
                <div class="answers-option-section">
                    <div class="answers-option">
                        <label class="question-editor-number">
                            <span class="question-number"> Choices </span>
                        </label>
                    </div>
                </div>
                <div class="answers-container true-false-answers" id="answerList">
                    <div class="answer-item">
                       <label class="container true-false-checkbox">
                            <input class="checkbox-option" type="radio" name="tf-answer" value="true" ${question.answers[0].is_correct ? 'checked' : ''}>
                            <span class="true-false-text"> True </span>
                            <div class="checkmark"></div>
                            <span class="custom-checkbox-button"></span>
                        </label> 
                    </div>
                    <div class="answer-item">
                        <label class="container true-false-checkbox">
                            <input class="checkbox-option" type="radio" name="tf-answer" value="false" ${question.answers[1].is_correct ? 'checked' : ''}>
                            <span class="true-false-text"> False </span>
                            <div class="checkmark"></div>
                            <span class="custom-checkbox-button"></span>
                        </label>
                    </div>
                </div>              
                <div class="answer-section-footer">
                    <div class="answer-section-footer-left"></div>
                    <div class="answer-section-footer-right">
                        <button onclick="discardChanges()" class="action-button-border discard-btn quiz-save-btns">
                            <i class="fa-regular fa-rotate"></i>
                            <span>Undo Changes</span>
                        </button>
                        <button class="action-button-primary quiz-save-btns" onclick="saveQuestionDataAndAnswers(${question.id}, 'TFQuestion')">
                            <i class="fa-regular fa-floppy-disk"></i>
                            <span>Save Changes</span> 
                        </button>
                    </div>
                </div>
            `;
        case 'EssayQuestion':
            return `
                <div class="answers-option-section">
                    <div class="answers-option">
                        <label class="question-editor-number">
                            <span class="question-number">  Sub-Prompts </span>
                        </label>
                    </div>
                </div>
                <div class="answers-container essay-prompts" id="answerList">
                    <div id="noPromptsMessage" class="no-prompts-message" style="display: ${question.answers.length === 0 ? 'block' : 'none'};">Learner will give an answer in their own words. Add a sub-prompt to allow the learner to give multiple targeted responses(Optional).</div>
                    ${question.answers.map((ans, index) => `
                        <div class="answer-item" data-answer-id="${ans.id != null ? ans.id : ''}">
                            <div class="answer-item-drag">
                                <i class="fa-solid fa-grip-dots-vertical answer-drag-icon"></i>
                            </div>
                            <div class='essay-answer-item'>
                                <div class='essay-answer-item-header'>
                                    <span class="essay-answer-number">Prompt ${index + 1}</span>
                                    <div onclick="openPromptRubricPopup(this)" class="question-editor-action-icon tooltip" data-tooltip="Prompt Rubric" style="height: 31.39px;">
                                        <span class="tooltiptext"> Prompt Rubric </span>
                                        <i class="fa-light fa-scroll" aria-hidden="true"></i>
                                    </div>
                                </div>
                                <div class='essay-answer-item-body'>
                                    <textarea class="answer-text scrollable-content" placeholder="Prompt text...">${ans.text}</textarea>
                                    <textarea class="answer-rubric" placeholder="Rubric (optional)..." hidden>${ans.rubric || ''}</textarea>
                                </div>
                            </div>
                            <button class="remove-answer-item tooltip" onclick="removeAnswer(this)" data-tooltip="Remove Prompt">
                                <i class="fa-light fa-trash-can"></i>
                                <span class="tooltiptext">Remove Prompt</span>
                            </button>
                        </div>
                    `).join('')}
                </div>
                <button class="action-button-border add-answer-btn" onclick="addEssayPrompt(${question.id})">+ Add Sub-Prompt</button>
                <div class="answer-section-footer">
                    <div class="answer-section-footer-left"></div>
                    <div class="answer-section-footer-right">
                        <button onclick="discardChanges()" class="action-button-border discard-btn quiz-save-btns">
                            <i class="fa-regular fa-rotate"></i>
                            <span>Undo Changes</span>
                        </button>
                        <button class="action-button-primary quiz-save-btns" onclick="saveQuestionDataAndAnswers(${question.id}, 'EssayQuestion')">
                            <i class="fa-regular fa-floppy-disk"></i>
                            <span>Save Changes</span>
                        </button>
                    </div>
                </div>
            `;          

        default:
            return '<p>No answers available.</p>';
    }
}

function addMCAnswer(type) {
    const list = document.getElementById('answerList');
    const div = document.createElement('div');
    div.classList.add('answer-item');
    if(type == 'MCQuestion'){
        div.innerHTML = `
            <div class="answer-item-drag">
                <i class="fa-solid fa-grip-dots-vertical answer-drag-icon"></i>
            </div>
            <label class="custom-radio">
                <input class="radio-option answer-correct" type="radio" name="multiple_choice">
                <span class="custom-radio-button"></span>
            </label>
            <input type="text" class="answer-text" placeholder="Enter choice text...">                     
            <button class="remove-answer-item tooltip" onclick="removeAnswer(this)" data-tooltip="Remove Answer">
                <i class="fa-light fa-trash-can"></i>
                <span class="tooltiptext">Remove Answer</span>
            </button>
        `;
    }else if(type == 'MRQuestion'){
        div.innerHTML = `
            <div class="answer-item-drag">
                <i class="fa-solid fa-grip-dots-vertical answer-drag-icon"></i>
            </div>
            <label class="container">
                <input class="checkbox-option answer-correct" type="checkbox" name="multiple_choice">
                <div class="checkmark"></div>
                <span class="custom-checkbox-button"></span>
            </label>
            <input type="text" class="answer-text" placeholder="Enter choice text...">                     
            <button class="remove-answer-item tooltip" onclick="removeAnswer(this)" data-tooltip="Remove Answer">
                <i class="fa-light fa-trash-can"></i>
                <span class="tooltiptext">Remove Answer</span>
            </button>
        `;
    }
    
    list.appendChild(div);
}

function addFITBAnswer() {
    const list = document.getElementById('answerList');
    const div = document.createElement('div');
    div.classList.add('answer-item');
    div.innerHTML = `
        <input type="text" class="answer-text" placeholder="Enter acceptable answer text...">                     
        <button class="remove-answer-item tooltip" onclick="removeAnswer(this)" data-tooltip="Remove Answer">
            <i class="fa-light fa-trash-can"></i>
            <span class="tooltiptext">Remove Answer</span>
        </button>
    `;
    list.appendChild(div);
}

function addEssayPrompt() {
    const list = document.getElementById('answerList');
    const div = document.createElement('div');
    div.classList.add('answer-item');
    div.innerHTML = `
        <div class="answer-item-drag">
            <i class="fa-solid fa-grip-dots-vertical answer-drag-icon"></i>
        </div>
        <div class='essay-answer-item'>
            <div class='essay-answer-item-header'>
                <span class="essay-answer-number">Prompt</span>
                <div onclick="openPromptRubricPopup(this)" class="question-editor-action-icon tooltip" data-tooltip="Prompt Rubric" style="height: 31.39px;">
                    <span class="tooltiptext"> Prompt Rubric </span>
                    <i class="fa-light fa-scroll" aria-hidden="true"></i>
                </div>
            </div>
            <div class='essay-answer-item-body'>
                <textarea class="answer-text scrollable-content" placeholder="Prompt text..."></textarea>
                <textarea class="answer-rubric" placeholder="Rubric (optional)..." hidden></textarea>
            </div>
        </div>
        <button class="remove-answer-item tooltip" onclick="removeAnswer(this)" data-tooltip="Remove Prompt">
            <i class="fa-light fa-trash-can"></i>
            <span class="tooltiptext">Remove Prompt</span>
        </button>`
    ;
    list.appendChild(div);

    updatePromptVisibility();
    updatePromptNumbers();
    initializeTextareaResize();
}

function removeAnswer(button) {
    button.closest('.answer-item').remove();
    updatePromptVisibility();
    updatePromptNumbers();
}

function updatePromptVisibility() {
    const list = document.getElementById('answerList');
    const message = document.getElementById('noPromptsMessage');
    const hasAnswers = list.querySelectorAll('.answer-item').length > 0;

    if (message) {
        message.style.display = hasAnswers ? 'none' : 'block';
    }
}

function updatePromptNumbers() {
    const promptItems = document.querySelectorAll('#answerList .answer-item');
    promptItems.forEach((item, index) => {
        const label = item.querySelector('.essay-answer-number');
        if (label) label.textContent = `Prompt ${index + 1}`;
    });
}

async function saveQuestionDataAndAnswers(questionId, type) {
    setDisabledSaveBtns();
    const randomize_order_checkbox = document.getElementById('random_order');
    const case_sensitive_checkbox = document.getElementById('case_sensitive');
    const strip_whitespace_checkbox = document.getElementById('strip_whitespace');
    let rawCategory = document.getElementById('assignCategoryName')?.getAttribute('data-id');
    const category = rawCategory && rawCategory !== 'null' ? parseInt(rawCategory) : null;

    const payload = {
        question_id: questionId,
        type: type,
        content: document.querySelector('#questionContent')?.value || '',
        randomize_answer_order: randomize_order_checkbox ? randomize_order_checkbox.checked : false,
        explanation: document.querySelector('#questionEditor .explanation-textarea')?.value || '', // optional if present
        case_sensitive: case_sensitive_checkbox ? case_sensitive_checkbox.checked : false,
        strip_whitespace: strip_whitespace_checkbox ? strip_whitespace_checkbox.checked : false,
        media_items: collectMediaItems(),
        category: category
    };

    console.log(payload);

    if (type === 'MCQuestion' || type === 'FITBQuestion') {
        const answerElements = document.querySelectorAll('.answer-item');
        payload.answers = Array.from(answerElements).map((el, index) => ({
            id: el.dataset.answerId && el.dataset.answerId !== 'null' && el.dataset.answerId !== '' ? parseInt(el.dataset.answerId) : null,
            text: el.querySelector('.answer-text').value,
            is_correct: type === 'MCQuestion'
                ? el.querySelector('.answer-correct').checked
                : undefined,
            order: index
        }));
    } else if (type === 'TFQuestion') {
        const selected = document.querySelector('input[name="tf-answer"]:checked');
        payload.correct = selected ? selected.value === 'true' : null;
    }else if (type === 'EssayQuestion') {
        const answerElements = document.querySelectorAll('.answer-item');
        payload.instructions = getEditorContent('questionInstructions');
        payload.rubric = getEditorContent('questionRubric');
        payload.answers = Array.from(answerElements).map((el, index) => ({
            id: el.dataset.answerId && el.dataset.answerId !== 'null' && el.dataset.answerId !== '' ? parseInt(el.dataset.answerId) : null,
            text: el.querySelector('.answer-text').value,
            rubric: el.querySelector('.answer-rubric')?.value || '',
            order: index
        }));
    }
    
    console.log(payload, payload.media_items);

    const response = await fetch('/requests/save-question-data/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (result.success) {
        removeDisabledSaveBtns();
        getQuestionData();
        displayValidationMessage('Question saved successfully.', true);
        // saveAnswerOrder();
    } else {
        displayValidationMessage(result.error, false);
    }
}

function collectMediaItems() {
    const mediaElements = document.querySelectorAll('.question-media-item');
    const media = [];

    mediaElements.forEach(el => {
        const sourceType = el.dataset.sourceType;
        const baseMediaPath = "https://halolmstestbucket.s3.amazonaws.com/media/default/";

        let selectedFileURL = el.dataset.url || '';  // or however you're getting the file

        // Debug before fix
        console.log("Original selectedFileURL:", selectedFileURL);

        // ✅ Fix the path
        const cleanedFileURL = selectedFileURL.replace("/tenant/", "/default/media/");

        // Debug after fix
        console.log("✔️ Cleaned File URL:", cleanedFileURL);

        // Optionally extract just the file name/path if needed
        const fileNameOnly = cleanedFileURL.split("/default/media/")[1] || '';

        console.log("📁 File name to save:", fileNameOnly);


        if (sourceType === 'embed') {
            const embedWrapper = el.querySelector('.embed-media-wrapper');
            const embedItem = {
                id: el.dataset.mediaId || null,
                source_type: 'embed',
                title: el.dataset.title || '',
                embed_code: decodeURIComponent(embedWrapper?.dataset.rawCode || ''),
                input_type: embedWrapper?.dataset.inputType || 'url',
                file_name: '',
                url_from_library: '',
                type_from_library: ''
            };
            console.log("📎 Collected embed media:", embedItem);
            media.push(embedItem);
        } else {
            const fileName = el.dataset.fileName || '';
            const fullUrl = baseMediaPath + fileName;
            const fileItem = {
                id: el.dataset.mediaId || null,
                source_type: sourceType,
                title: el.dataset.title || '',
                embed_code: '',
                file_name: fileNameOnly,
                full_url: cleanedFileURL,
                url_from_library: el.dataset.urlFromLibrary || '',
                type_from_library: el.dataset.typeFromLibrary || ''
            };
            console.log("📁 Collected file media:", fileItem);
            media.push(fileItem);
        }
    });

    console.log("📦 All collected media items:", media);
    return media;
}


async function createQuestion(type) {
    const quizUUID = document.getElementById('quizUUID').value;

    hideQuestionDropdown();

    const response = await fetch('/requests/create-question/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({ type: type, quiz_uuid: quizUUID }),
    });

    const result = await response.json();

    if (result.success) {
        const loaded = await getQuestionData(); // wait for rendering
        if (loaded) {
            getAnswerData(result.question_id); // now safe to activate
        }
    } else {
        displayValidationMessage(result.error, false);
    }
}

let quizQuestionIdToDelete = null;

function renderQuestions(questions) {
    const container = document.getElementById('questionList');
    container.innerHTML = ''; // Clear previous items

    if (questions.length === 0) {
        displayNoQuestions();
        return;
    }

    questions.forEach((q, index) => {
        const questionItem = document.createElement('div');
        questionItem.classList.add('question-item');
        questionItem.dataset.questionId = q.id;
        let questionIcon;
        let questionIconcolor;

        if(q.type == 'MCQuestion'){
            questionIcon = '<i class="fa-regular fa-check-double"></i>';
            questionIconcolor = 'pastel-purple';
        }else if(q.type == 'MRQuestion'){
            questionIcon = '<i class="fa-regular fa-square-check"></i>';
            questionIconcolor = 'pastel-green';
        }else if(q.type == 'TFQuestion'){
            questionIcon = '<i class="fa-regular fa-circle-half-stroke"></i>';
            questionIconcolor = 'pastel-blue';
        }else if(q.type == 'FITBQuestion'){
            questionIcon = '<i class="fa-regular fa-pen-line"></i>';
            questionIconcolor = 'pastel-pink';
        }else if(q.type == 'EssayQuestion'){
            questionIcon = '<i class="fa-regular fa-comment-dots"></i>';
            questionIconcolor = 'pastel-orange';
        }

        questionItem.innerHTML = `
            <div class="quiz-builder-question-item">
                <div class="question-item-drag">
                    <i class="fa-solid fa-grip-dots-vertical question-drag-icon"></i>
                </div>
                <div class="question-item-number">
                    ${index + 1}
                </div>
                <div class="question-item-icon ${questionIconcolor}">
                    ${questionIcon}
                </div>
                <div class="question-item-text">
                    <span>${q.content}</span>
                </div>
                <div class="quiz-builder-dropdown-container">
                    <div class="question-item-more quiz-builder-dropdown-toggle">
                        <i class="fa-solid fa-ellipsis"></i>
                    </div>
                    <div class="quiz-builder-dropdown-options">
                        <div id="initiializeQuestionToDelete" class="quiz-builder-dropdown-option">
                            <i class="fa-regular fa-trash-can"></i>
                            <span>Delete</span>
                        </div>
                    </div>
                </div>
            </div>
        `;

        container.appendChild(questionItem);

        // Add click listener to fetch answers and display them
        questionItem.addEventListener('click', (e) => {
            const clickedInsideDropdown = e.target.closest('.quiz-builder-dropdown-container');
        
            if (!isQuestionReordering && !clickedInsideDropdown) {
                getAnswerData(q.id);
            }
        });
        const deleteTrigger = questionItem.querySelector('.quiz-builder-dropdown-option');
        deleteTrigger.addEventListener('click', (e) => {
            quizQuestionIdToDelete = q.id;
            openPopup('quizQuestionDeleteConfirmation');
        });              
    });
} 

async function changeQuestionType(currentType) {
    const container = document.getElementById('questionEditor');
    const questionId = container.dataset.questionId;

    if (!questionId || !(currentType === 'MCQuestion' || currentType === 'MRQuestion')) return;

    const newType = currentType === 'MCQuestion' ? 'MRQuestion' : 'MCQuestion';

    try {
        const response = await fetch('/requests/change-question-type/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({
                question_id: questionId,
                new_type: newType
            })
        });

        const result = await response.json();

        if (result.success) {
            console.log(`🔁 Question type changed to ${newType}`);
            getAnswerData(questionId, true);  // refresh the editor with updated type
            getQuestionData();
        } else {
            displayValidationMessage(result.error, false);
        }
    } catch (error) {
        console.error('❌ Error changing question type:', error);
    }
}

async function saveQuestionOrder() {
    const quizUUID = document.getElementById('quizUUID').value;
    const questionElements = document.querySelectorAll('.question-item');
    const orderedIds = Array.from(questionElements).map(el => el.dataset.questionId);

    await fetch('/requests/update-question-order/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
            quiz_uuid: quizUUID,
            ordered_ids: orderedIds,
        }),
    });
}

async function saveAnswerOrder() {
    const answerItems = document.querySelectorAll('#answerList .answer-item');
    const orderedIds = Array.from(answerItems).map(el => el.dataset.answerId);
    const type = document.getElementById('questionEditor').dataset.questionType;

    // Update visible prompt numbers if EssayQuestion
    if (type === 'EssayQuestion') {
        answerItems.forEach((item, index) => {
            const label = item.querySelector('.essay-answer-number');
            if (label) {
                label.textContent = `Prompt ${index + 1}`;
            }
        });
    }

    // await fetch('/requests/update-answer-order/', {
    //     method: 'POST',
    //     headers: {
    //         'Content-Type': 'application/json',
    //         'X-CSRFToken': getCookie('csrftoken'),
    //     },
    //     body: JSON.stringify({ 
    //         ordered_ids: orderedIds,
    //         question_type: type
    //     }),
    // });
}

async function deleteQuizQuestion() {
    if (!quizQuestionIdToDelete) return;

    try {
        const response = await fetch('/requests/delete-question/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({ question_id: quizQuestionIdToDelete }),
        });

        const result = await response.json();

        if (result.success) {
            closePopup('quizQuestionDeleteConfirmation');

            const currentEditor = document.getElementById('questionEditor');
            const activeId = currentEditor.dataset.questionId;
            if (activeId === String(quizQuestionIdToDelete)) {
                hideQuestionEditor()
                showNoQuestionsContainer();
            }

            getQuestionData(); // Re-fetch question list
        } else {
            displayValidationMessage(result.error, false);
        }
    } catch (err) {
        console.error('Deletion failed', err);
    } finally {
        quizQuestionIdToDelete = null; // reset
    }
}


function updateQuestionNumbers() {
    const numberElements = document.querySelectorAll('.question-item-number');
    numberElements.forEach((el, index) => {
        el.textContent = index + 1;
    });
}

function displayNoQuestions(){
    const container = document.getElementById('questionList');
    container.innerHTML = `
        <div class="no-questions-message">
            <span>No questions added yet. Click the plus above to add a question.</span>
        </div>
    `;
}

function discardChanges() {
    setDisabledSaveBtns();

    // Deactivate question items
    document.querySelectorAll('.question-item').forEach(item => {
        item.classList.remove('active');
    });

    // Hide editor and show fallback
    // hideQuestionEditor();
    // showNoQuestionsContainer();

    // Reload current question to reset data
    const questionId = document.getElementById('questionEditor')?.dataset?.questionId;
    if (questionId) {
        getAnswerData(questionId); // Pull clean data from backend
    }

    // ONLY remove prompt-related rubric popups
    document.querySelectorAll('.popup-background.prompt-rubric-popup').forEach(popup => popup.remove());

    // Clear any stored Quill instances for those popups
    if (window.quillPopupEditors) {
        for (const [key, editor] of Object.entries(window.quillPopupEditors)) {
            if (key.startsWith('rubricPopup-')) {
                editor?.destroy?.();
                delete window.quillPopupEditors[key];
            }
        }
    }
}


/* This is the main container in the center that shows when no questions are selected */
function showNoQuestionsContainer(){
    const noQuestionsSelected = document.getElementById('noQuestionsSelected');
    noQuestionsSelected.style.display = 'flex';
}

function hideNoQuestionsContainer(){
    const noQuestionsSelected = document.getElementById('noQuestionsSelected');
    noQuestionsSelected.style.display = 'none';
}

/* This is a loading symbol that appears if a question takes longer than a second to load */
function showLoadingContainer(){
    const loadingContainer = document.getElementById('loadingContainer');
    loadingContainer.style.display = 'flex';
}

/* This shows in the sidebar if no questions are added to the quiz */
function hideLoadingContainer(){
    const loadingContainer = document.getElementById('loadingContainer');
    loadingContainer.style.display = 'none';
}

function hideQuestionDropdown(){
    const questionDropdown= document.getElementById('questionDropdown');
    questionDropdown.classList.remove('visible');
}

function hideToolTips(){
    const toolTips = document.querySelectorAll('.tooltiptext');
    toolTips.forEach(tooltip => {
        tooltip.classList.add('hidden');
    });
}

function showToolTips(){
    const toolTips = document.querySelectorAll('.tooltiptext');
    toolTips.forEach(tooltip => {
        tooltip.classList.remove('hidden');
    });
}

// Function to initialize Question drag and drop
let isQuestionReordering = false;

function initializeQuestionDragAndDrop() {
    const questionList = document.getElementById('questionList');

    Sortable.create(questionList, {
        animation: 200,
        handle: '.question-drag-icon',
        ghostClass: 'sortable-ghost',
        onStart: () => { 
            isQuestionReordering = true; 
        },
        onEnd: () => {
            updateQuestionNumbers();
            saveQuestionOrder();
            setTimeout(() => { isQuestionReordering = false; }, 100); // reset quickly
        }
    });
}

// Function to initialize Answer drag and drop
let isAnswerReordering = false;

function initializeAnswerDragAndDrop() {
    const answerList = document.getElementById('answerList');
    if (!answerList) return;

    Sortable.create(answerList, {
        animation: 200,
        handle: '.answer-drag-icon',
        ghostClass: 'sortable-ghost',
        onStart: () => { isAnswerReordering = true; },
        onEnd: () => {
            saveAnswerOrder();
            setTimeout(() => { isAnswerReordering = false; }, 100);
        }
    });
}

function initializeDropdownMenus() {
    const dropdownToggles = document.querySelectorAll('.quiz-builder-dropdown-toggle');

    dropdownToggles.forEach(toggle => {
        if (toggle.dataset.dropdownInitialized === 'true') return;

        toggle.addEventListener('click', function (e) {
            e.stopPropagation(); // Prevent bubbling to document

            const container = toggle.closest('.quiz-builder-dropdown-container');
            
            if(container){
                const dropdown = container.querySelector('.quiz-builder-dropdown-options');
                dropdown.classList.toggle('visible');

                // Close other open dropdowns
                document.querySelectorAll('.quiz-builder-dropdown-options.visible').forEach(other => {
                    if (other !== dropdown) {
                        other.classList.remove('visible');
                        showToolTips();
                    }
                });
                hideToolTips();
            }          
        });

        toggle.dataset.dropdownInitialized = 'true'; // Mark as initialized
    });

    // Ensure only one global click listener is attached
    if (!document.body.dataset.globalDropdownListenerAttached) {
        document.addEventListener('click', function (e) {
            document.querySelectorAll('.quiz-builder-dropdown-options.visible').forEach(dropdown => {
                if (!dropdown.closest('.quiz-builder-dropdown-container').contains(e.target)) {
                    dropdown.classList.remove('visible');
                    showToolTips();
                }
            });
        });

        document.body.dataset.globalDropdownListenerAttached = 'true';
    }
}

function setDisabledSaveBtns() {
    const courseSaveBtns = document.querySelectorAll('.quiz-save-btns');
    for (const btn of courseSaveBtns) {
        setTimeout(() => {
            btn.setAttribute('disabled', true);
        }, 100);
        btn.classList.add('disabled');

        if (!btn.dataset.originalHtml) {
            btn.dataset.originalHtml = btn.innerHTML;
        }

        const savedWidth = btn.offsetWidth + "px";
        const savedHeight = btn.offsetHeight + "px";

        btn.style.width = savedWidth;
        btn.style.height = savedHeight;

        btn.innerHTML = `<i class="fa-regular fa-spinner-third fa-spin" style="--fa-animation-duration: 1s;">`;
    }
}

function removeDisabledSaveBtns() {
    setTimeout(() => {
        const courseSaveBtns = document.querySelectorAll('.quiz-save-btns');
        for (const btn of courseSaveBtns) {
            btn.classList.remove('disabled');
            btn.removeAttribute('disabled');

            if (btn.dataset.originalHtml) {
                btn.innerHTML = btn.dataset.originalHtml;
                delete btn.dataset.originalHtml;
            }

            btn.style.width = "";
            btn.style.height = "";
        }
    }, 400);
}

function openPromptRubricPopup(triggerElement) {
    const answerItem = triggerElement.closest('.answer-item');
    const rubricTextarea = answerItem.querySelector('.answer-rubric');
    const answerId = answerItem.dataset.answerId || `temp-${[...document.querySelectorAll('.answer-item')].indexOf(answerItem)}`;
    const popupId = `rubricPopup-${answerId}`;

    // If popup already exists, just show it
    if (document.getElementById(popupId)) {
        openPopup(popupId);
        return;
    }

    const existingRubric = rubricTextarea.value || '';

    const popupHTML = `
        <div id="${popupId}" class="popup-background prompt-rubric-popup">
            <div class="popup-content max-width-6">
                <div class="popup-header">
                    <h3>Prompt Rubric</h3>
                    <div onclick="closePopup('${popupId}')" class="close-popup-icon">
                        <i class="fa-solid fa-xmark"></i>
                    </div>
                </div>
                <div class="popup-body scrollable-content">
                    <div class="course-content-input">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <label class="edit-user-label">Rubric</label>
                            <div class="quill-character-counter">
                                <div class="quill-current-counter">0</div>
                                <span>/</span>
                                <div class="quill-max-counter">5000</div>
                            </div>
                        </div>
                        <div class="editor-container rubric-quill-editor scrollable-content" id="quillEditor-${popupId}"></div>
                    </div>
                    <span class="course-content-input-subtext">
                        Provide a rubric that will be viewed when grading this prompt. This rubric will not be visible to Learners. If AI Grading is enabled for this quiz, this rubric will be utilized for AI grading.
                    </span>
                </div>
                <div class="popup-footer">
                    <div class="spacer"></div>
                    <div class="popup-btns">
                        <button type="button" onclick="syncRubricBack('${popupId}', '${answerId}')" class="popup-btn close-popup-btn">Back</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    const wrapper = document.createElement('div');
    wrapper.innerHTML = popupHTML;
    document.body.appendChild(wrapper);

    // Initialize Quill with content
    const quill = new Quill(`#quillEditor-${popupId}`, {
        theme: 'snow',
        modules: {
            toolbar: [
                [{ 'header': [1, 2, false] }],
                ['bold', 'italic', 'underline'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                ['link']
            ]
        }
    });
    quill.root.innerHTML = existingRubric;

    // Track this instance
    if (!window.quillPopupEditors) window.quillPopupEditors = {};
    window.quillPopupEditors[popupId] = quill;

    detectCharacterCounters();
    openPopup(popupId);
}

function syncRubricBack(popupId, answerId) {
    const quill = window.quillPopupEditors?.[popupId];
    if (!quill) return;

    const updatedHtml = quill.root.innerHTML;

    const targetItem = document.querySelector(`.answer-item[data-answer-id="${answerId}"]`);
    if (targetItem) {
        const rubricField = targetItem.querySelector('.answer-rubric');
        rubricField.value = updatedHtml;
    }

    closePopup(popupId);
}

function initializeTextareaResize() {
    requestAnimationFrame(() => {
        document.querySelectorAll('textarea').forEach(textarea => {
            autoResizeTextarea(textarea);

            if (!textarea.dataset.listenerBound) {
                textarea.addEventListener('input', () => autoResizeTextarea(textarea));
                textarea.dataset.listenerBound = 'true';
            }
        });
    });
}

function autoResizeTextarea(textarea) {
    if (!textarea.offsetParent) return; // Element is hidden or not rendered yet

    const mediaContainer = document.getElementById('questionMediaContainer');
    const hasMedia = mediaContainer && mediaContainer.querySelectorAll('.question-media-item').length > 0;

    if (hasMedia) {
        if (textarea.style.height !== '100%') {
            textarea.style.height = '100%';
        }
        return;
    }

    // Use a temporary clone to measure without affecting layout
    const clone = textarea.cloneNode();
    clone.style.visibility = 'hidden';
    clone.style.position = 'absolute';
    clone.style.height = 'auto';
    clone.style.maxHeight = '200px';
    clone.value = textarea.value;
    textarea.parentNode.appendChild(clone);

    const targetHeight = `${clone.scrollHeight}px`;
    textarea.parentNode.removeChild(clone);

    if (textarea.style.height !== targetHeight) {
        textarea.style.height = targetHeight;
    }
}

function addMedia(type) {
    if (type === 'upload-media') {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'image/*';
        fileInput.multiple = true;
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', async (event) => {
            const files = event.target.files;
            for (let file of files) {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/requests/upload-media/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken'),
                    },
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    displayMediaThumbnail(result.file_url, 'upload', {
                        id: result.id,
                        file_name: result.file_name,
                    });
                    setTimeout(() => {
                        document.querySelectorAll('textarea').forEach(textarea => {
                            autoResizeTextarea(textarea);
                        });
                        updateQuestionContentLayout();
                    }, 50);
                    
                } else {
                    console.error('Media upload failed:', result.error);
                }
            }
        });

        document.body.appendChild(fileInput);
        fileInput.click();
    } else if (type === 'file-library') {
        openFileLibrary('quizQuestionMedia');
    }else if(type === 'embed'){
        openPopup('embedMediaModal');
    }
}

function displayMediaThumbnail(src, type, file = null) {
    const mediaContainer = document.getElementById('questionMediaContainer');
    mediaContainer.style.display = 'flex';

    const wrapper = document.createElement('div');
    wrapper.classList.add('media-thumb', 'question-media-item', 'thumbnail-inner-thumbnail');

    // Always set required dataset attributes
    wrapper.dataset.sourceType = type;

    // Handle optional attributes from file object
    if (file) {
        if (file.id) wrapper.dataset.mediaId = file.id;
        if (file.file_name) wrapper.dataset.fileName = file.file_name;
        if (file.name) wrapper.dataset.fileName = file.name; // fallback
        if (file.title) wrapper.dataset.title = file.title;
        if (file.url_from_library) wrapper.dataset.urlFromLibrary = file.url_from_library;
        if (file.type_from_library) wrapper.dataset.typeFromLibrary = file.type_from_library;
        if (file.embed_code) wrapper.dataset.embedCode = file.embed_code;
    }

    let mediaPreviewItem;
    let mediaExpandItem;
    if(file.type_from_library == 'pdf'){
        mediaPreviewItem = `<i class="fa-light fa-file-pdf"></i>`;
        wrapper.classList.add('placeholder-media-item');
        mediaExpandItem = `
        <button onclick="expandMediaItem(this, 'pdf')" class="expand-media-btn table-filter-item-small">
            <i class="fa-regular fa-expand"></i>
        </button>`;
    }else if(file.type_from_library == 'video'){
        mediaPreviewItem = `<i class="fa-light fa-film"></i>`;
        wrapper.classList.add('placeholder-media-item');
        mediaExpandItem = `
        <button onclick="expandMediaItem(this, 'video')" class="expand-media-btn table-filter-item-small">
            <i class="fa-regular fa-expand"></i>
        </button>`;
    }else if (file.type_from_library === 'document') {
        mediaPreviewItem = `<i class="fa-light fa-file-doc"></i>`;
        wrapper.classList.add('placeholder-media-item');
    
        mediaExpandItem = `
            <a href="${file.url_from_library}" download="${file.title || file.file_name || 'document'}"
               class="expand-media-btn table-filter-item-small" target="_blank" rel="noopener noreferrer">
                <i class="fa-light fa-arrow-down-to-line"></i>
            </a>`;
    }else if(file.type_from_library == 'audio'){
        mediaPreviewItem = `<i class="fa-light fa-volume"></i>`;
        wrapper.classList.add('placeholder-media-item');
        mediaExpandItem = `
        <button onclick="expandMediaItem(this, 'audio')" class="expand-media-btn table-filter-item-small">
            <i class="fa-regular fa-expand"></i>
        </button>`;
    }else{
        mediaPreviewItem = `<img src="${src}" class="media-preview">`;
        mediaExpandItem = `
        <button onclick="expandMediaItem(this, 'image')" class="expand-media-btn table-filter-item-small">
            <i class="fa-regular fa-expand"></i>
        </button>`;
    }

    wrapper.innerHTML = `
        <button onclick="removeMediaItem(this)" class="remove-media-btn table-filter-item-small thumbnail-delete">
            <i class="fa-regular fa-trash-can"></i>
        </button>
        ${mediaExpandItem}
        ${mediaPreviewItem}
    `;

    mediaContainer.appendChild(wrapper);
    updateQuestionContentLayout();
}

function renderQuestionMedia(question) {
    const mediaContainer = document.getElementById('questionMediaContainer');
    const embedContainer = document.getElementById('questionEmbedContainer');
    if (!mediaContainer || !embedContainer) return;

    mediaContainer.innerHTML = '';
    embedContainer.innerHTML = '';

    const mediaItems = question.media_items || [];
    let hasVisibleMedia = false;
    let hasEmbedMedia = false;

    mediaItems.forEach(media => {
        if (media.source_type === 'upload') {
            hasVisibleMedia = true;
            displayMediaThumbnail(media.file_url, media.source_type, {
                id: media.id,
                file_name: media.file_name
            });
        } else if (media.source_type === 'library') {
            hasVisibleMedia = true;
            displayMediaThumbnail(media.url_from_library, media.source_type, {
                id: media.id,
                file_name: media.file_name || '',
                title: media.title || '',
                url_from_library: media.url_from_library,
                type_from_library: media.type_from_library
            });
        } else if (media.source_type === 'embed' && media.embed_code) {
            hasEmbedMedia = true;
            renderEmbedMediaItem(media, embedContainer);
        }
    });

    mediaContainer.style.display = hasVisibleMedia ? 'flex' : 'none';
    embedContainer.style.display = hasEmbedMedia ? 'flex' : 'none';
    updateQuestionContentLayout();
}

function extractEmbedSrc(embedCode) {
    const iframeMatch = embedCode.match(/<iframe[^>]+src=["']([^"']+)["']/i);
    if (iframeMatch) return iframeMatch[1];

    const embedMatch = embedCode.match(/<embed[^>]+src=["']([^"']+)["']/i);
    if (embedMatch) return embedMatch[1];

    // Plain URL fallback
    try {
        const url = new URL(embedCode);
        return url.href;
    } catch {
        return null;
    }
}


function submitEmbedMedia() {
    const embedCode = document.getElementById('embedCodeInput').value.trim();
    const feedbackEl = document.getElementById('embedCodeFeedback');
    feedbackEl.textContent = '';
    feedbackEl.classList.remove('error-feedback', 'success-feedback');

    if (!validateEmbedInput(embedCode)) {
        return;  // Stop if not valid
    }

    const embedContainer = document.getElementById('questionEmbedContainer');
    embedContainer.innerHTML = '';
    embedContainer.style.display = 'flex';

    const wrapper = document.createElement('div');
    wrapper.classList.add('embed-media-item', 'question-media-item', 'thumbnail-inner-thumbnail', 'iframe-media-item');
    wrapper.dataset.sourceType = 'embed';
    wrapper.dataset.embedCode = embedCode;
    const inputType = isFullEmbedCode(embedCode) ? 'iframe' : 'url';
    wrapper.dataset.originalInputType = inputType;

    let src = extractEmbedSrc(embedCode);
    if (!src) {
        try {
            const url = new URL(embedCode);
            src = url.href;
        } catch {
            src = null;
        }
    }

    if (src && inputType === 'iframe') {
        wrapper.innerHTML = `
            <div class="embed-media-wrapper" data-raw-code="${encodeURIComponent(embedCode)}" data-input-type="iframe">
                <iframe src="${src}" class="embed-iframe" frameborder="0" allowfullscreen sandbox="allow-same-origin allow-scripts allow-popups"></iframe>
            </div>
            <button onclick="removeMediaItem(this)" class="remove-media-btn table-filter-item-small thumbnail-delete">
                <i class="fa-regular fa-trash-can"></i>
            </button>
            <button onclick="editEmbedItem(this)" class="expand-media-btn table-filter-item-small">
                <i class="fa-regular fa-pen"></i>
            </button>
        `;
    } else if (src && inputType === 'url') {
        wrapper.innerHTML = `
            <div class="embed-media-wrapper" data-raw-code="${encodeURIComponent(embedCode)}" data-input-type="url">
                <div class="embed-fallback">
                    <a href="${src}" target="_blank" rel="noopener noreferrer">${src}</a>
                </div>
            </div>
            <button onclick="removeMediaItem(this)" class="remove-media-btn table-filter-item-small thumbnail-delete">
                <i class="fa-regular fa-trash-can"></i>
            </button>
            <button onclick="editEmbedItem(this)" class="expand-media-btn table-filter-item-small">
                <i class="fa-regular fa-pen"></i>
            </button>
        `;
    } else {
        feedbackEl.textContent = 'Could not parse a valid embed source.';
        feedbackEl.classList.add('error-feedback');
        return;
    }

    embedContainer.appendChild(wrapper);
    closePopup('embedMediaModal');
    updateQuestionContentLayout();
}

function isFullEmbedCode(input) {
    return /<(iframe|embed)[^>]*>/i.test(input);
}

function renderEmbedMediaItem(media, container) {
    const embedCode = media.embed_code.trim();
    const inputType = media.input_type || 'url';  // explicitly stored on save

    const wrapper = document.createElement('div');
    wrapper.classList.add('embed-media-item', 'question-media-item', 'thumbnail-inner-thumbnail');
    wrapper.classList.remove('iframe-media-item');
    wrapper.dataset.sourceType = 'embed';
    wrapper.dataset.mediaId = media.id || '';
    wrapper.dataset.embedCode = embedCode;
    wrapper.dataset.originalInputType = inputType;

    const content = document.createElement('div');
    content.classList.add('embed-media-wrapper');
    content.dataset.rawCode = encodeURIComponent(embedCode);
    content.dataset.inputType = inputType;

    let src = extractEmbedSrc(embedCode);

    if (!src) {
        try {
            const url = new URL(embedCode);
            src = url.href;
        } catch {
            src = null;
        }
    }

    console.log('Rendering embed:', { src, embedCode, inputType });

    if (src && inputType === 'iframe') {
        const iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.classList.add('embed-iframe');
        iframe.setAttribute('frameborder', '0');
        iframe.setAttribute('allowfullscreen', '');
        iframe.setAttribute('sandbox', 'allow-same-origin allow-scripts allow-popups');
        content.appendChild(iframe);
        wrapper.classList.add('iframe-media-item');

        iframe.onload = function () {
            try {
                const doc = iframe.contentWindow.document;
                const height = doc.body.scrollHeight;
                iframe.style.height = height + 'px';
            } catch (e) {
                console.warn('Cross-origin iframe cannot be resized automatically.');
            }
        };        
    }else if (src && inputType === 'url') {
        content.innerHTML = `
            <div class="embed-fallback">
                <a href="${src}" target="_blank" rel="noopener noreferrer">${src}</a>
            </div>
        `;
        wrapper.classList.remove('iframe-media-item');
    } else {
        content.innerHTML = `<div class="embed-error">Invalid embed code</div>`;
        wrapper.classList.remove('iframe-media-item');
    }

    wrapper.appendChild(content);

    wrapper.innerHTML += `
        <button onclick="removeMediaItem(this)" class="remove-media-btn table-filter-item-small thumbnail-delete">
            <i class="fa-regular fa-trash-can"></i>
        </button>
        <button onclick="editEmbedItem(this)" class="expand-media-btn table-filter-item-small">
            <i class="fa-regular fa-pen"></i>
        </button>
    `;

    container.appendChild(wrapper);
}

function editEmbedItem(button) { 
    const wrapper = button.closest('.embed-media-item');
    if (!wrapper) return;

    const rawEmbedCode = (wrapper.dataset.embedCode || '').trim();
    const inputType = wrapper.dataset.originalInputType || 'url';
    const input = document.getElementById('embedCodeInput');

    if (inputType === 'iframe') {
        input.value = rawEmbedCode;  // Show full iframe
    } else {
        const srcOnly = extractEmbedSrc(rawEmbedCode);
        input.value = srcOnly || rawEmbedCode;  // Show URL only
    }

    validateEmbedInput(input.value.trim());
    openPopup('embedMediaModal');
}

function removeMediaItem(button) {
    const wrapper = button.closest('.question-media-item');
    if (!wrapper) return;

    wrapper.remove();

    const mediaContainer = document.getElementById('questionMediaContainer');
    const embedContainer = document.getElementById('questionEmbedContainer');

    const remainingMedia = mediaContainer.querySelectorAll('.question-media-item');
    const remainingEmbed = embedContainer.querySelectorAll('.question-media-item');

    if (mediaContainer && remainingMedia.length === 0) {
        mediaContainer.style.display = 'none';
    }

    if (embedContainer && remainingEmbed.length === 0) {
        embedContainer.style.display = 'none';
    }

    updateQuestionContentLayout();
}

function expandMediaItem(button, type) {
    const wrapper = button.closest('.media-thumb, .quiz-reference-item');
    if (!wrapper) return;

    const mediaUrl = wrapper.dataset.urlFromLibrary || wrapper.querySelector('img')?.src;
    const mediaTitle = wrapper.dataset.title || 'Media Preview';

    const modal = document.getElementById('mediaModal');
    const modalContent = modal.querySelector('.media-modal-content');
    const modalHeader = modal.querySelector('.media-modal-header-title');

    modalHeader.textContent = mediaTitle;
    modalContent.innerHTML = ''; // Clear previous content

    if (type === 'pdf') {
        modalContent.innerHTML = `
            <iframe src="${mediaUrl}" width="100%" height="600px" style="border: none;"></iframe>
        `;
    } else if (type === 'video') {
        modalContent.innerHTML = `
            <video controls style="max-width: 100%; height: auto;">
                <source src="${mediaUrl}" type="video/mp4">
                Your browser does not support the video tag.
            </video>
        `;
    } else if (type === 'audio') {
        modalContent.innerHTML = `
            <audio controls style="width: 100%;">
                <source src="${mediaUrl}" type="audio/mpeg">
                Your browser does not support the audio element.
            </audio>
        `;
    } else if (type === 'document') {
        modalContent.innerHTML = `
            <div class="media-doc-preview">
                <p>This document cannot be previewed directly. You can download it below:</p>
                <a href="${mediaUrl}" download class="action-button-border" target="_blank">
                    <i class="fa-light fa-file-arrow-down"></i> Download Document
                </a>
            </div>
        `;
    } else {
        modalContent.innerHTML = `
            <img src="${mediaUrl}" alt="${mediaTitle}" style="max-width: 100%; height: auto;" />
        `;
    }

    openPopup('mediaModal');
}

function updateQuestionContentLayout() {
    const container = document.querySelector('.question-content-container');
    const mediaContainer = document.getElementById('questionMediaContainer');
    const mediaCount = mediaContainer?.querySelectorAll('.question-media-item').length || 0;

    if (!container) return;

    container.style.flexDirection = mediaCount >= 6 ? 'column' : 'row';
}

function validateEmbedInput(input) {
    const embedSubmitBtn = document.getElementById('embedSubmitBtn');
    const feedbackEl = document.getElementById('embedCodeFeedback');

    embedSubmitBtn.removeAttribute('disabled');
    embedSubmitBtn.classList.remove('disabled');
    feedbackEl.textContent = '';
    feedbackEl.classList.remove('error-feedback', 'success-feedback');

    const trimmed = input.trim();

    if (!trimmed) {
        feedbackEl.textContent = 'Embed input cannot be empty.';
        feedbackEl.classList.add('error-feedback');
        embedSubmitBtn.setAttribute('disabled', true);
        embedSubmitBtn.classList.add('disabled');
        return false;
    }

    const containsIframe = /<iframe[^>]*>/i.test(trimmed);
    const containsURLLike = /\bhttps?:\/\/\S+/i.test(trimmed);
    if (containsIframe && containsURLLike && !trimmed.startsWith('<iframe')) {
        feedbackEl.textContent = 'Please enter either a full iframe *or* a plain URL, not both.';
        feedbackEl.classList.add('error-feedback');
        embedSubmitBtn.setAttribute('disabled', true);
        embedSubmitBtn.classList.add('disabled');
        return false;
    }

    const isIframe = isFullEmbedCode(trimmed);
    const src = extractEmbedSrc(trimmed);
    if (isIframe && src) {
        return true;
    }

    try {
        const url = new URL(trimmed);
        return true;
    } catch {
        feedbackEl.textContent = 'Please enter a valid iframe or full URL.';
        feedbackEl.classList.add('error-feedback');
        embedSubmitBtn.setAttribute('disabled', true);
        embedSubmitBtn.classList.add('disabled');
        return false;
    }
}

function initializeEmbedCodeListener(){
    const embedInput = document.getElementById('embedCodeInput');
    embedInput.addEventListener('input', () => {
        validateEmbedInput(embedInput.value);
    });
}

function initializeCreateCategory(){
    document.getElementById('newCategoryName').addEventListener('keyup', function() {
        const createCategoryButton = document.getElementById('createCategoryButton');
        if(this.value.length >= 1){
            createCategoryButton.classList.remove('disabled');
            createCategoryButton.removeAttribute('disabled');
        }else{
            createCategoryButton.classList.add('disabled');
            createCategoryButton.setAttribute('disabled', true);
        }
    });

    document.getElementById('createCategoryButton').addEventListener('click', function() {
        const parentCategory = document.getElementById('parentCategory').getAttribute('data-id');
        console.log(parentCategory);
        const categoryName = document.getElementById('newCategoryName').value.trim();
        const categoryDescription = getEditorContent('categoryDescription');
        if (categoryName) {
            createCategory(parentCategory, categoryName, categoryDescription, false);
    
            document.getElementById('newCategoryName').value = ''; // Clear input field
            document.getElementById('parentCategory').setAttribute('data-id', '');
            document.getElementById('parentCategory').value = '';
            closePopup('createCategory');       
    
            const createCategoryButton = document.getElementById('createCategoryButton');
            createCategoryButton.classList.add('disabled');
            createCategoryButton.setAttribute('disabled', true);
        } else {
            displayValidationMessage('Please enter a category name.', false);
        }
    });
}

function openQuizSettings(){
    const quizBuilderHeader = document.getElementById('quizBuilderHeader');
    const quizBuilderContent = document.getElementById('quizBuilderContent');
    const quizSettingsHeader = document.getElementById('quizSettingsHeader');
    const quizSettingsContent= document.getElementById('quizSettingsContent');

    quizBuilderHeader.style.display = 'none';
    quizBuilderContent.style.display = 'none';
    quizSettingsHeader.style.display = 'flex';
    quizSettingsContent.style.display = 'flex';
}

function closeQuizSettings(){
    const quizBuilderHeader = document.getElementById('quizBuilderHeader');
    const quizBuilderContent = document.getElementById('quizBuilderContent');
    const quizSettingsHeader = document.getElementById('quizSettingsHeader');
    const quizSettingsContent= document.getElementById('quizSettingsContent');

    quizBuilderHeader.style.display = 'flex';
    quizBuilderContent.style.display = 'flex';
    quizSettingsHeader.style.display = 'none';
    quizSettingsContent.style.display = 'none';
}

async function saveQuizSettings(uuid) {
    setDisabledSaveBtns();
    const quizTitleInput = document.getElementById('quiz_title');
    let rawCategory = document.getElementById('quiz_category')?.getAttribute('data-id');
    const category_id = rawCategory && rawCategory !== 'null' ? parseInt(rawCategory) : null;
    const ai_grade_essay = document.getElementById('ai_grade_essay').checked;

    const payload = {
        uuid: uuid,
        title: quizTitleInput ? quizTitleInput.value : '',
        description: getEditorContent('quiz_description'),
        category_id: category_id,
        success_text: getEditorContent('success_text'),
        fail_text: getEditorContent('fail_text'),
        quiz_material: getEditorContent('quiz_material'),
        references: collectReferenceItems(),
        singular_quiz_rules: getEditorContent('singular_quiz_rules'),
        ai_grade_essay: ai_grade_essay,
        ai_grade_rubric: getEditorContent('ai_grade_rubric')
    };

    try {
        const response = await fetch('/requests/save-quiz-settings/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (result.success) {
            displayValidationMessage('Quiz settings saved.', true);
            document.getElementById('quizMainTitle').innerText = result.title;
        } else {
            displayValidationMessage(result.error || 'Failed to save settings.', false);
        }
    } catch (error) {
        console.error('Error saving quiz settings:', error);
        displayValidationMessage('An error occurred while saving.', false);
    } finally {
        removeDisabledSaveBtns();
    }
}

function addReference(type) {
    const quizUUID = document.getElementById('quizUUID').value;

    if (type === 'upload-media') {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = 'application/pdf,image/*';
        fileInput.multiple = true;
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', async (event) => {
            const files = event.target.files;
            for (let file of files) {
                const formData = new FormData();
                formData.append('file', file);
                formData.append('quiz_uuid', quizUUID);

                const response = await fetch('/requests/upload-reference/', {
                    method: 'POST',
                    headers: {
                        'X-CSRFToken': getCookie('csrftoken'),
                    },
                    body: formData
                });

                const result = await response.json();

                if (result.success) {
                    displayReferenceItem(result.file_url, {
                        id: result.id,
                        name: result.name || result.file_name,
                        type_from_library: result.type || '',
                        source_type: 'upload',
                        url_from_library: result.file_url
                    });
                }else {
                    console.error('Reference upload failed:', result.error);
                }
            }
        });

        document.body.appendChild(fileInput);
        fileInput.click();
    } else if (type === 'file-library') {
        openFileLibrary('quizReferences');
    }
}

function displayReferenceItem(src, file) {
    const container = document.getElementById('quizReferenceContainer');
    container.style.display = 'flex';

    const wrapper = document.createElement('div');
    wrapper.classList.add('reference-thumb', 'quiz-reference-item', 'thumbnail-inner-thumbnail');

    // Ensure all required attributes are preserved
    wrapper.dataset.referenceId = file.id || '';
    wrapper.dataset.fileName = file.name || '';
    wrapper.dataset.urlFromLibrary = file.url_from_library || src || '';
    wrapper.dataset.typeFromLibrary = file.type_from_library || '';
    wrapper.dataset.sourceType = file.source_type || 'upload'; 
    wrapper.dataset.title = file.title || file.name || 'Media Preview';

    let icon;
    let mediaExpandItem = '';

    if (file.type_from_library === 'pdf') {
        icon = '<i class="fa-light fa-file-pdf"></i>';
        wrapper.classList.add('placeholder-media-item');
        mediaExpandItem = `
            <button onclick="expandMediaItem(this, 'pdf')" class="expand-media-btn table-filter-item-small">
                <i class="fa-regular fa-expand"></i>
            </button>`;
    } else if (file.type_from_library === 'image') {
        icon = `<img src="${src}" class="media-preview">`;
        mediaExpandItem = `
            <button onclick="expandMediaItem(this, 'image')" class="expand-media-btn table-filter-item-small">
                <i class="fa-regular fa-expand"></i>
            </button>`;
    } else if (file.type_from_library === 'audio') {
        icon = '<i class="fa-light fa-volume"></i>';
        wrapper.classList.add('placeholder-media-item');
        mediaExpandItem = `
            <button onclick="expandMediaItem(this, 'audio')" class="expand-media-btn table-filter-item-small">
                <i class="fa-regular fa-expand"></i>
            </button>`;
    } else {
        icon = '<i class="fa-light fa-file-lines"></i>';
        wrapper.classList.add('placeholder-media-item');
    }

    const fileLabel = file.name || 'Reference File';

    wrapper.innerHTML = `
        <button onclick="removeReferenceItem(this)" class="remove-media-btn table-filter-item-small thumbnail-delete">
            <i class="fa-regular fa-trash-can"></i>
        </button>
        ${mediaExpandItem}
        <a href="${src}" download="${fileLabel}" target="_blank" class="expand-media-btn table-filter-item-small third-filter-icon">
            <i class="fa-light fa-arrow-down-to-line"></i>
        </a>
        ${icon}
    `;

    container.appendChild(wrapper);
    updateQuestionContentLayout();
}

function collectReferenceItems() {
    const refs = document.querySelectorAll('.quiz-reference-item');
    return Array.from(refs).map(el => ({
        id: el.dataset.referenceId || null,
        title: el.dataset.fileName || '',
        url_from_library: el.dataset.urlFromLibrary || '',
        type_from_library: el.dataset.typeFromLibrary || '',
        source_type: el.dataset.sourceType || 'upload',
    }));
}

function removeReferenceItem(button) {
    const wrapper = button.closest('.quiz-reference-item');
    if (!wrapper) return;

    wrapper.remove();

    const quizReferenceContainer = document.getElementById('quizReferenceContainer');
    const remainingReferences = quizReferenceContainer.querySelectorAll('.quiz-reference-item');

    if(quizReferenceContainer && remainingReferences.length === 0){
        quizReferenceContainer.style.display = 'none';
    }

    updateQuestionContentLayout();
}

async function loadQuizReferences() {
    const quizUUID = document.getElementById('quizUUID').value;
    try {
        const response = await fetch(`/requests/get-quiz-references/${quizUUID}/`);
        const result = await response.json();

        if (result.success && Array.isArray(result.references)) {
            const container = document.getElementById('quizReferenceContainer');
            container.innerHTML = '';
            container.style.display = result.references.length ? 'flex' : 'none';

            result.references.forEach(ref => {
                displayReferenceItem(ref.url_from_library, {
                    id: ref.id,
                    name: ref.title,
                    url_from_library: ref.url_from_library,
                    type_from_library: ref.type_from_library,
                    source_type: ref.source_type
                });
            });
        } else {
            console.warn('No references found or quiz missing.');
        }
    } catch (error) {
        console.error('Error loading quiz references:', error);
    }
}


function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}