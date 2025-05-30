document.addEventListener('DOMContentLoaded', function () {
    initializeQuestionDragAndDrop();
    getQuestionData();
});

// Loading all of the question data from the quiz using the UUID
async function getQuestionData() {
    const quizUUID = document.getElementById('quizUUID').value;

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
        return true;
    } else {
        console.error('Error:', result.error);
        return false;
    }
}

/* Displaying the questions and answers within the editing box on the right */
async function getAnswerData(questionId) {
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
        } else {
            console.error('Error loading question:', result.error);
        }
    } catch (error) {
        clearTimeout(loadingTimeout);
        hideLoadingContainer();
        console.error('Failed to fetch answer data:', error);
    }
}

function displayQuestionEditor(question) {
    const container = document.getElementById('questionEditor');
    container.dataset.questionId = question.id;
    container.style.display = 'flex';
    let questionIcon;
    let questionIconcolor;
    let questionType;

    if(question.type == 'MCQuestion'){
        questionIcon = '<i class="fa-regular fa-check-double"></i>';
        questionIconcolor = 'pastel-purple';
        questionType = 'Multiple Choice';
    }else if(question.type == 'TFQuestion'){
        questionIcon = '<i class="fa-regular fa-circle-half-stroke"></i>';
        questionIconcolor = 'pastel-blue';
        questionType = 'True/False';
    }else if(question.type == 'FITBQuestion'){
        questionIcon = '<i class="fa-regular fa-comment-dots"></i>';
        questionIconcolor = 'pastel-orange';
        questionType = 'Open Response';
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
                            <div class="question-item-dropdown-icon">
                                <i class="fa-regular fa-angle-down"></i>
                            </div>
                        </div>
                        <div class="quiz-builder-dropdown-options width-3">
                            <div onclick="createQuestion('multiple-choice')" class="quiz-builder-type-option">
                                <div class="question-item-icon pastel-purple">
                                    <i class="fa-regular fa-check-double"></i>
                                </div>
                                <span>Multiple Choice</span>
                            </div>
                            <div onclick="createQuestion('true-false')" class="quiz-builder-type-option">
                                <div class="question-item-icon pastel-blue">
                                    <i class="fa-regular fa-circle-half-stroke"></i>
                                </div>
                                <span>True/False</span>
                            </div>
                            <div onclick="createQuestion('open-response')" class="quiz-builder-type-option">
                                <div class="question-item-icon pastel-orange">
                                    <i class="fa-regular fa-comment-dots"></i>
                                </div>
                                <span>Open Response</span>
                            </div>
                        </div>
                    </div>               
                </div>
                <div class="question-editor-header-right">
                    <div class="quiz-builder-dropdown-container relative-container">
                        <div class="quiz-builder-dropdown-toggle tooltip" data-tooltip="Add Attachment">
                            <span class="tooltiptext">Add Attachment</span>
                            <div class="question-editor-action-icon">
                                <i class="fa-regular fa-folder-image"></i>
                            </div>
                        </div>
                        <div class="quiz-builder-dropdown-options width-3">
                            <div onclick="createQuestion('multiple-choice')" class="quiz-builder-type-option">
                                <div class="question-item-icon pastel-purple">
                                    <i class="fa-regular fa-arrow-up-from-bracket"></i>
                                </div>
                                <span>Upload Media</span>
                            </div>
                            <div onclick="createQuestion('true-false')" class="quiz-builder-type-option">
                                <div class="question-item-icon pastel-blue">
                                    <i class="fa-regular fa-folder-open"></i>
                                </div>
                                <span>File Library</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div class="question-editor-title">
                <label for="questionContent" class="question-editor-number">
                    <i class="fa-solid fa-circle-question"></i>
                    <span class="question-number"> Question ${question.number}</span>
                    <span class="required-asterisk">*</span>
                </label>
            </div>
            <div class="question-content-input">
                <textarea id="questionContent" max_length="1000">${question.content}</textarea>
            </div>
            <div class="answers-section">
                ${renderAnswers(question)}
            </div>
        </div>
    `;
    initializeDropdownMenus();
}

function hideQuestionEditor(){
    const questionEditor = document.getElementById('questionEditor');
    questionEditor.style.display = 'none';
}

function renderAnswers(question) {
    switch (question.type) {
        case 'MCQuestion':
            return `
                <div class="answers-option-section">
                    <div class="answers-option">
                        <label for="questionContent" class="question-editor-number">
                            <span class="question-number"> Choices </span>
                        </label>
                    </div>
                    <div class="answers-option">
                        <label class="edit-settings-label" for="random_order">Random Order</label>
                        <label class="toggle-switch" tabindex="0" role="switch">
                            <input class="toggle-hidden-settings-input" type="checkbox" id="random_order" name="random_order" aria-hidden="true">
                            <div class="toggle-switch-background">
                            <div class="toggle-switch-handle"></div>
                            </div>
                        </label>
                    </div>
                </div>
                <div id="answerList">
                    ${question.answers.map(ans => `
                        <div class="answer-item" data-answer-id="${ans.id}">
                            <input type="text" class="answer-text" value="${ans.text}">
                            <label>
                                <input type="checkbox" class="answer-correct" ${ans.is_correct ? 'checked' : ''}> Correct
                            </label>
                            <button onclick="removeAnswer(this)">❌</button>
                        </div>
                    `).join('')}
                </div>
                <button onclick="addMCAnswer()">+ Add Answer</button>
                <button onclick="saveQuestionDataAndAnswers(${question.id}, 'MCQuestion')">💾 Save Answers</button>
            `;

        case 'FITBQuestion':
            return `
                <div id="answerList">
                    ${question.answers.map(ans => `
                        <div class="answer-item" data-answer-id="${ans.id}">
                            <input type="text" class="answer-text" value="${ans.text}">
                            <button onclick="removeAnswer(this)">❌</button>
                        </div>
                    `).join('')}
                </div>
                <button onclick="addFITBAnswer()">+ Add Answer</button>
                <button onclick="saveQuestionDataAndAnswers(${question.id}, 'FITBQuestion')">💾 Save Answers</button>
            `;

        case 'TFQuestion':
            return `
                <label><input type="radio" name="tf-answer" value="true" ${question.answers[0].is_correct ? 'checked' : ''}> True</label>
                <label><input type="radio" name="tf-answer" value="false" ${question.answers[1].is_correct ? 'checked' : ''}> False</label>
                <button onclick="saveQuestionDataAndAnswers(${question.id}, 'TFQuestion')">💾 Save Answer</button>
            `;

        default:
            return '<p>No answers available.</p>';
    }
}

function addMCAnswer() {
    const list = document.getElementById('answerList');
    const div = document.createElement('div');
    div.classList.add('answer-item');
    div.innerHTML = `
        <input type="text" class="answer-text" value="">
        <label><input type="checkbox" class="answer-correct"> Correct</label>
        <button onclick="removeAnswer(this)">❌</button>
    `;
    list.appendChild(div);
}

function addFITBAnswer() {
    const list = document.getElementById('answerList');
    const div = document.createElement('div');
    div.classList.add('answer-item');
    div.innerHTML = `
        <input type="text" class="answer-text" value="">
        <button onclick="removeAnswer(this)">❌</button>
    `;
    list.appendChild(div);
}

function removeAnswer(button) {
    button.closest('.answer-item').remove();
}

async function saveQuestionDataAndAnswers(questionId, type) {
    const payload = {
        question_id: questionId,
        type: type,
        content: document.querySelector('#questionEditor textarea')?.value || '',
        explanation: document.querySelector('#questionEditor .explanation-textarea')?.value || '', // optional if present
    };

    if (type === 'MCQuestion' || type === 'FITBQuestion') {
        const answerElements = document.querySelectorAll('.answer-item');
        payload.answers = Array.from(answerElements).map(el => ({
            id: el.dataset.answerId || null,
            text: el.querySelector('.answer-text').value,
            is_correct: type === 'MCQuestion'
                ? el.querySelector('.answer-correct').checked
                : undefined
        }));
    } else if (type === 'TFQuestion') {
        const selected = document.querySelector('input[name="tf-answer"]:checked');
        payload.correct = selected ? selected.value === 'true' : null;
    }

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
        alert('Question saved successfully.');
    } else {
        alert('Error saving: ' + result.error);
    }
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
        console.error('Error creating question:', result.error);
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
        }else if(q.type == 'TFQuestion'){
            questionIcon = '<i class="fa-regular fa-circle-half-stroke"></i>';
            questionIconcolor = 'pastel-blue';
        }else if(q.type == 'FITBQuestion'){
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
        
            if (!isReordering && !clickedInsideDropdown) {
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
            alert('Error deleting question: ' + result.error);
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

function showNoQuestionsContainer(){
    const noQuestionsSelected = document.getElementById('noQuestionsSelected');
    noQuestionsSelected.style.display = 'flex';
}

function hideNoQuestionsContainer(){
    const noQuestionsSelected = document.getElementById('noQuestionsSelected');
    noQuestionsSelected.style.display = 'none';
}

function showLoadingContainer(){
    const loadingContainer = document.getElementById('loadingContainer');
    loadingContainer.style.display = 'flex';
}

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
let isReordering = false;

function initializeQuestionDragAndDrop() {
    const questionList = document.getElementById('questionList');

    Sortable.create(questionList, {
        animation: 200,
        handle: '.question-drag-icon',
        ghostClass: 'sortable-ghost',
        onStart: () => { 
            isReordering = true; 
        },
        onEnd: () => {
            updateQuestionNumbers();
            saveQuestionOrder();
            setTimeout(() => { isReordering = false; }, 100); // reset quickly
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