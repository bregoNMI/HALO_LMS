document.addEventListener('DOMContentLoaded', function() {
    initializeAddWidgets();
    initializeWidgetReordering();
    checkBannerPosition();
    initializeSelectedIcon();
    initializeColorListeners()
    updateColorInfo('headerEditTextColor');
    updateColorInfo('headerEditSubtextColor');
    updateColorInfo('headerEditIconColor');
    updateColorInfo('headerEditIconBackgroundColor');
    initializeExternalLink();
    testTotalWidgetCards();
    // Call the function to initialize text color listeners
    initializeTextColorListeners();
});

function checkBannerPosition() {
    const headerBackgroundImage = checkBannerPositionItems;
    const matchingInput = document.querySelector(`input[name="position-selection"][data-position="${headerBackgroundImage}"]`);

    if (matchingInput) {
        matchingInput.checked = true;
    }
};

function initializeAddWidgets() {
    const saveWidgetButton = document.getElementById('save-widget');

    if (saveWidgetButton) {
        saveWidgetButton.addEventListener('click', function() {
            const dashboardIdInput = document.getElementById('dashboard-id');
            const type = document.querySelector('input[name="type-selection"]:checked').id;
            let widget_title;
            let widget_subtext;
            let widget_icon;
            let widget_icon_color;
            let widget_icon_background_color;
            let widget_external_link;
            if(type === 'resumeCourses'){
                widget_title = 'Course Name';
                widget_subtext = 'Resume';
                widget_icon = 'fa-solid fa-play';
                widget_icon_color = '#8a2be2';
                widget_icon_background_color = '#e5caff';
            }else if(type === 'myCourses'){
                widget_title ='My Courses';
                widget_subtext = 'See courses you are enrolled in';
                widget_icon = 'fa-solid fa-book-open-cover';
                widget_icon_color = '#dc6618';
                widget_icon_background_color = '#ffbf7c';
            }else if(type === 'enrollmentKey'){
                widget_title = 'Enrollment Key';
                widget_subtext = 'Have an Enrollment Key?';
                widget_icon = 'fa-solid fa-key';
                widget_icon_color = '#e03a59';
                widget_icon_background_color = '#ffc9d2';
            }else if(type === 'externalLink'){
                widget_title = 'External Link';
                widget_subtext = 'Link to an external source';
                widget_icon = 'fa-solid fa-link';
                widget_icon_color = '#1863dc';
                widget_icon_background_color = '#d0e0ff';
            } 
            let widget_title_color = '#333333'; 
            let widget_subtext_color = '#6b6b6b';

            if (dashboardIdInput && type) {  // Updated to include type check
                const dashboardId = dashboardIdInput.value;

                fetch(`/admin/templates/widgets/add/${dashboardId}/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken'),
                    },
                    body: JSON.stringify({
                        'widget_title': widget_title,
                        'widget_title_color': widget_title_color,
                        'widget_subtext': widget_subtext,
                        'widget_icon': widget_icon,
                        'widget_icon_color': widget_icon_color,
                        'widget_icon_background_color': widget_icon_background_color,
                        'widget_subtext_color': widget_subtext_color,
                        'widget_external_link': widget_external_link,
                        'type': type,
                    }),
                })
                .then(response => {
                    if (!response.ok) {
                        return response.text().then(text => { throw new Error(text); });
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.success) {
                        if(type === 'resumeCourses'){
                            appendResumeCoursesWidget(data);
                        }else if(type === 'myCourses'){
                            appendMyCoursesWidget(data);
                        }else if(type === 'enrollmentKey'){
                            appendEnrollmentKeyWidget(data);
                        }else if(type === 'externalLink'){
                            appendExternalLinkWidget(data);
                        }
                        
                        hideNoWidgetsContainer();
                        clearPopupInputs();
                    } else {
                        console.error('Failed to add widget:', data.error);
                    }
                })
                .catch(error => {
                    console.error('Fetch error:', error.message);
                });
            } else {
                alert('Both title and type are required.');
            }
        });
    }

    clearPopupInputs();
    function clearPopupInputs() {
        document.querySelectorAll('input[name="type-selection"]').forEach(function(input) {
            if(input.id === 'resumeCourses'){
                input.checked = true;
            }else{
                input.checked = false;
            }
        });
    }
}

function appendResumeCoursesWidget(data){
    // Add Resume Courses Widget to the DOM
    const widgetsContainer = document.getElementById('widgets-container');
    if (widgetsContainer) {
        const widgetDiv = document.createElement('div');
        widgetDiv.className = 'widget resume-course';
        widgetDiv.dataset.id = data.widget_id;
        widgetDiv.innerHTML = `
        <div class="widget-top">
            <div class="widget-drag-icon">
                <i class="fa-light fa-grip-dots-vertical"></i>
            </div>
            <div class="widget-inner-wrapper">
                <div class="widget-icon pastel-purple">
                    <i class="fa-solid fa-play"></i>
                </div>
                <div class="widget-inner-right">
                    <h3> Course Name</h3>
                    <div style="display: flex; gap: 0.3rem; align-items: baseline; color: {{ widget.widget_subtext_color }};">
                        <span id="resumeSubtext"> Resume </span><i id="resumeIcon" class="fa-solid fa-angle-right"></i>
                    </div>
                </div>   
            </div>
        </div>
        <div class="widget-bottom">
            <div class="progress-bar-container">
                <div class="progress-bar" style="width: 30%;"></div>
            </div>
            <span>30%</span>
        </div>
        <div class="widget-option-btns">
            <div onclick="openEditSidebar('${ data.widget_id }');" class="edit-widget tooltip" data-id="${ data.widget_id }" data-tooltip="Edit Widget">
                <span class="tooltiptext">Edit Widget</span>
                <i class="fa-regular fa-pen-to-square"></i>
            </div>
            <div onclick="deleteWidget('${ data.widget_id }'), openPopup('confirmWidgetDeletePopup');" class="delete-widget tooltip" data-id="${ data.widget_id }" data-tooltip="Delete Widget">
                <span class="tooltiptext">Delete Widget</span>
                <i class="fa-regular fa-trash"></i>
            </div>
        </div>           
        `;
        widgetsContainer.appendChild(widgetDiv);
    }
}

function appendMyCoursesWidget(data){
    // Add My Courses Widget to the DOM
    const widgetsContainer = document.getElementById('widgets-container');
    if (widgetsContainer) {
        const widgetDiv = document.createElement('div');
        widgetDiv.className = 'widget my-courses';
        widgetDiv.dataset.id = data.widget_id;
        widgetDiv.innerHTML = `
        <div class="widget-top">
            <div class="widget-drag-icon">
                <i class="fa-light fa-grip-dots-vertical"></i>
            </div>
            <div class="widget-inner-wrapper">
                <div class="widget-icon pastel-orange">
                    <i class="fa-solid fa-book-open-cover"></i>
                </div>
                <div class="widget-inner-right">
                    <h3> My Courses </h3>
                    <span id="resumeSubtext"> See courses you are enrolled in</span>
                    <p hidden>{{ widget.type }}</p>
                </div>   
            </div>
        </div>
        <div class="widget-option-btns">
            <div onclick="openEditSidebar('${ data.widget_id }');" class="edit-widget tooltip" data-id="${ data.widget_id }" data-tooltip="Edit Widget">
                <span class="tooltiptext">Edit Widget</span>
                <i class="fa-regular fa-pen-to-square"></i>
            </div>
            <div onclick="deleteWidget('${ data.widget_id }'), openPopup('confirmWidgetDeletePopup');" class="delete-widget tooltip" data-id="${ data.widget_id }" data-tooltip="Delete Widget">
                <span class="tooltiptext">Delete Widget</span>
                <i class="fa-regular fa-trash"></i>
            </div>
        </div>           
        `;
        widgetsContainer.appendChild(widgetDiv);
    }
}

function appendEnrollmentKeyWidget(data){
    // Add Enrollment Key Widget to the DOM
    const widgetsContainer = document.getElementById('widgets-container');
    if (widgetsContainer) {
        const widgetDiv = document.createElement('div');
        widgetDiv.className = 'widget my-courses';
        widgetDiv.dataset.id = data.widget_id;
        widgetDiv.innerHTML = `
        <div class="widget-top">
            <div class="widget-drag-icon">
                <i class="fa-light fa-grip-dots-vertical"></i>
            </div>
            <div class="widget-inner-wrapper">
                <div class="widget-icon pastel-pink">
                    <i class="fa-solid fa-key"></i>
                </div>
                <div class="widget-inner-right">
                    <h3> Enrollment Key</h3>
                    <span id="resumeSubtext"> Have an Enrollment Key? </span>
                    <p hidden>{{ widget.type }}</p>
                </div>   
            </div>
        </div>
        <div class="widget-option-btns">
            <div onclick="openEditSidebar('${ data.widget_id }');" class="edit-widget tooltip" data-id="${ data.widget_id }" data-tooltip="Edit Widget">
                <span class="tooltiptext">Edit Widget</span>
                <i class="fa-regular fa-pen-to-square"></i>
            </div>
            <div onclick="deleteWidget('${ data.widget_id }'), openPopup('confirmWidgetDeletePopup');" class="delete-widget tooltip" data-id="${ data.widget_id }" data-tooltip="Delete Widget">
                <span class="tooltiptext">Delete Widget</span>
                <i class="fa-regular fa-trash"></i>
            </div>
        </div>           
        `;
        widgetsContainer.appendChild(widgetDiv);
    }
}

function appendExternalLinkWidget(data){
    // Add Enrollment Key Widget to the DOM
    const widgetsContainer = document.getElementById('widgets-container');
    if (widgetsContainer) {
        const widgetDiv = document.createElement('div');
        widgetDiv.className = 'widget my-courses';
        widgetDiv.dataset.id = data.widget_id;
        widgetDiv.innerHTML = `
        <div class="widget-top">
            <div class="widget-drag-icon">
                <i class="fa-light fa-grip-dots-vertical"></i>
            </div>
            <div class="widget-inner-wrapper">
                <div class="widget-icon pastel-blue">
                    <i class="fa-solid fa-link"></i>
                </div>
                <div class="widget-inner-right">
                    <h3> External Link</h3>
                    <span id="resumeSubtext"> Link to an external source </span>
                    <p hidden>{{ widget.type }}</p>
                </div>   
            </div>
        </div>
        <div class="widget-option-btns">
            <div onclick="openEditSidebar('${ data.widget_id }');" class="edit-widget tooltip" data-id="${ data.widget_id }" data-tooltip="Edit Widget">
                <span class="tooltiptext">Edit Widget</span>
                <i class="fa-regular fa-pen-to-square"></i>
            </div>
            <div onclick="deleteWidget('${ data.widget_id }'), openPopup('confirmWidgetDeletePopup');" class="delete-widget tooltip" data-id="${ data.widget_id }" data-tooltip="Delete Widget">
                <span class="tooltiptext">Delete Widget</span>
                <i class="fa-regular fa-trash"></i>
            </div>
        </div>           
        `;
        widgetsContainer.appendChild(widgetDiv);
    }
}

function selectBannerTemplate() {
    // Get the selected banner's ID
    const banner = document.querySelector('input[name="banner-selection"]:checked');
    
    if (banner) {
        // Find the closest parent element with the class 'lesson-selection-item'
        const parentElement = banner.closest('.lesson-selection-item');
        const computedStyle = window.getComputedStyle(parentElement);
        const backgroundImage = computedStyle.backgroundImage;
        
        // Extract the URL from the backgroundImage string
        const imageUrl = backgroundImage.slice(5, -2); // Removes `url("` at the start and `")` at the end

        // Set the new background image to the element with id 'headerImage'
        document.getElementById('headerImage').style.backgroundImage = `url(${imageUrl})`;
        document.getElementById('dashboardURLInput').value = imageUrl;
        
    } else {
        console.log("No banner selected.");
    }
}

function deleteWidget(widgetId) {
    // Show the custom popup
    const popup = document.getElementById('confirmWidgetDeletePopup');
    const confirmButton = document.getElementById('confirmDelete');

    // Handle confirmation
    confirmButton.onclick = function() {
        fetch(`/admin/templates/widgets/delete/${widgetId}/`, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text); });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Remove the widget from the DOM
                const widgetDiv = document.querySelector(`.widget[data-id="${widgetId}"]`);
                if (widgetDiv) {
                    widgetDiv.remove();
                }
                // Hide the popup
                popup.style.display = 'none';
                closeEditSidebar();
                testTotalWidgetCards();
            } else {
                console.error('Failed to delete widget:', data.error);
                // Optionally, show an error message to the user
            }
        })
        .catch(error => {
            console.error('Fetch error:', error.message);
            // Optionally, show an error message to the user
        });
    };
}

function initializeWidgetReordering() {
    const sortableContainer = document.getElementById('widgets-container');
    if (sortableContainer) {
        Sortable.create(sortableContainer, {
            animation: 200, // Animation duration in milliseconds
            handle: '.widget-drag-icon', // Drag handle, if any
            ghostClass: 'sortable-ghost', // Class for the ghost element
            chosenClass: 'sortable-chosen', // Class added to the dragged element
            dragClass: 'sortable-drag', // Class added to the dragged element during sorting

            onStart: function (evt) {
                // Remove the sortable-drag class from all elements
                document.querySelectorAll('.widget').forEach(item => {
                    item.classList.remove('sortable-drag');
                });
            },

            onEnd: function (evt) {
                // Remove the sortable-chosen class after dragging ends
                document.querySelectorAll('.widget').forEach(item => {
                    item.classList.remove('sortable-chosen');
                });

                // Handle reordering logic after the drag ends
                const widgetIds = Array.from(sortableContainer.children).filter(widget => widget.id !== 'noWidgetsContainer').map(widget => widget.dataset.id);

                fetch('/admin/templates/widgets/reorder/', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRFToken': getCookie('csrftoken'),
                    },
                    body: JSON.stringify({ 'widget_ids': widgetIds }),
                })
                .then(response => response.json())
                .then(data => {
                    if (!data.success) {
                        console.error('Failed to reorder widgets:', data.error);
                    }
                })
                .catch(error => {
                    console.error('Fetch error:', error);
                });
            },

            onChoose: function (evt) {
                // Add a class when the item is picked up
                if (!evt.item.classList.contains('widget')) {
                    evt.item.classList.add('sortable-drag');
                }
            },

            onUnchoose: function (evt) {
                // Ensure the class is removed when the item is no longer chosen
                evt.item.classList.remove('sortable-drag');
            }
        });
    }
}

function saveWidgetChanges(widgetId) {
    const typeInput = document.getElementById('edit-widget-type');
    const widgetEditTitle = document.getElementById('widgetEditTitle');
    const widgetEditTitleColor = document.getElementById('widgetEditTextColorHex');
    const widgetEditSubtext = document.getElementById('widgetEditSubtext');
    const widgetEditSubtextColor = document.getElementById('widgetEditSubtextColorHex');
    const widgetEditIcon = document.getElementById('currentSelectedIconWidget').className;
    const widgetEditIconColor = document.getElementById('widgetEditIconColorHex');
    const widgetEditIconBackgroundColor = document.getElementById('widgetEditIconBackgroundColorHex');
    const widgetEditExternalLinkInput = document.getElementById('widgetEditExternalLinkInput');

    if (typeInput) {
        const type = typeInput.value;
        const widget_title = widgetEditTitle.value;
        const widget_title_color = widgetEditTitleColor.value;
        const widget_subtext = widgetEditSubtext.value;
        const widget_subtext_color = widgetEditSubtextColor.value;
        const widget_icon = widgetEditIcon;
        const widget_icon_color = widgetEditIconColor.value;
        const widget_icon_background_color = widgetEditIconBackgroundColor.value;
        const widget_external_link = widgetEditExternalLinkInput.value;

        console.log(widget_icon, widget_icon_color);

        fetch(`/admin/templates/widgets/edit/${widgetId}/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            },
            body: JSON.stringify({
                'type': type,
                'widget_title': widget_title,
                'widget_title_color': widget_title_color,
                'widget_subtext': widget_subtext,
                'widget_subtext_color': widget_subtext_color,
                'widget_icon': widget_icon,
                'widget_icon_color': widget_icon_color,
                'widget_icon_background_color': widget_icon_background_color,
                'widget_external_link': widget_external_link,
            }),
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text); });
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                // Update the widget in the DOM
                const widgetDiv = document.querySelector(`.widget[data-id="${widgetId}"]`);
                if (widgetDiv) {
                    widgetDiv.querySelector('h3').textContent = widget_title;
                    widgetDiv.querySelector('h3').style.color = widget_title_color;
                    widgetDiv.querySelector('span').textContent = widget_subtext;

                    if(widgetDiv.querySelector('#resumeIcon')){
                        widgetDiv.querySelector('#resumeIcon').style.color = widget_subtext_color;
                    }   widgetDiv.querySelector('#resumeSubtext').style.color = widget_subtext_color;               

                    widgetDiv.querySelector('.widget-icon i').className =  widget_icon;
                    widgetDiv.querySelector('.widget-icon i').style.color =  widget_icon_color;
                    widgetDiv.querySelector('.widget-icon').style.backgroundColor =  widget_icon_background_color;
                }
                displayValidationMessage('Widget updated successfully', true);
            } else {
                displayValidationMessage('Failed to update widget', false);
                console.error('Failed to update widget:', data.error);
            }
        })
        .catch(error => {
            displayValidationMessage('Something went wrong, please contact an administrator', false);
            console.error('Fetch error:', error.message);
        });
    } else {
        alert('Both title and content are required.');
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

const optionsSidebar = document.getElementById('optionsSidebar');
const widgetEditOptions = document.getElementById('widgetEditOptions');
const headerEditOptions = document.getElementById('headerEditOptions');
function openEditSidebar(widgetId) {
    // Open the sidebar
    optionsSidebar.classList.add('show-options-sidebar');

    if(widgetId){
        document.getElementById('optionsHeading').innerText = 'Edit Widget';
        widgetEditOptions.style.display = "block";
        headerEditOptions.style.display = "none";
        // Fetch the widget data
        fetch(`/admin/templates/widgets/${widgetId}/data/`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCookie('csrftoken'),
            }
        })
        .then(response => {
            if (!response.ok) {
                return response.text().then(text => { throw new Error(text); });
            }
            return response.json();
        })
        .then(data => {
            // Populate the sidebar with widget data
            populateSidebarWithWidgetData(data, widgetId);
        })
        .catch(error => {
            console.error('Fetch error:', error.message);
        });
    }else{
        document.getElementById('optionsHeading').innerText = 'Edit Banner';
        widgetEditOptions.style.display = "none";
        headerEditOptions.style.display = "block";
    }
    
}

function populateSidebarWithWidgetData(widgetData, widgetId) {
    const typeInput = document.getElementById('edit-widget-type');
    const widgetEditTitle = document.getElementById('widgetEditTitle');
    const widgetEditTitleColor = document.getElementById('widgetEditTextColor');
    const widgetEditTextColorSample = document.getElementById('widgetEditTextColorSample');
    const widgetEditTextColorHex = document.getElementById('widgetEditTextColorHex');
    const widgetEditSubtext = document.getElementById('widgetEditSubtext');
    const saveWidgetBtn = document.getElementById('saveWidgetBtn');
    const widgetEditSubtextColor = document.getElementById('widgetEditSubtextColor');
    const widgetEditSubtextColorHex = document.getElementById('widgetEditSubtextColorHex');
    const widgetEditSubtextColorSample = document.getElementById('widgetEditSubtextColorSample');
    const widgetEditIcon = document.getElementById('currentSelectedIconWidget');
    const widgetEditIconColor = document.getElementById('widgetEditIconColor');
    const widgetEditIconColorHex = document.getElementById('widgetEditIconColorHex');
    const widgetEditIconColorSample = document.getElementById('widgetEditIconColorSample');
    const widgetEditIconBackgroundColor = document.getElementById('widgetEditIconBackgroundColor'); 
    const widgetEditIconBackgroundColorHex = document.getElementById('widgetEditIconBackgroundColorHex');
    const widgetEditIconBackgroundColorSample = document.getElementById('widgetEditIconBackgroundColorSample');
    const widgetEditExternalLinkInput = document.getElementById('widgetEditExternalLinkInput');

    // Test if it needs to show the External Link Input
    if(widgetData.type === 'externalLink'){
        document.getElementById('externalLinkContainer').style.display = 'flex';
    }else{
        document.getElementById('externalLinkContainer').style.display = 'none';
    }
    
    if (typeInput) {
        typeInput.value = widgetData.type || '';
        widgetEditTitle.value = widgetData.widget_title || '';
        widgetEditTitleColor.value = widgetData.widget_title_color || '';
        widgetEditTextColorSample.style.backgroundColor = widgetData.widget_title_color || '';
        widgetEditTextColorHex.value = widgetData.widget_title_color || '';

        widgetEditSubtext.value = widgetData.widget_subtext || '';
        widgetEditSubtextColor.value = widgetData.widget_subtext_color || '';
        widgetEditSubtextColorSample.style.backgroundColor = widgetData.widget_subtext_color || '';
        widgetEditSubtextColorHex.value = widgetData.widget_subtext_color || '';

        widgetEditIcon.className = widgetData.widget_icon || ''; 
        widgetEditIconColor.value = widgetData.widget_icon_color || ''; 
        widgetEditIconColorSample.style.backgroundColor  = widgetData.widget_icon_color || ''; 
        widgetEditIconColorHex.value = widgetData.widget_icon_color || ''; 

        widgetEditIconBackgroundColor.value = widgetData.widget_icon_background_color || ''; 
        widgetEditIconBackgroundColorSample.style.backgroundColor  = widgetData.widget_icon_background_color || ''; 
        widgetEditIconBackgroundColorHex.value = widgetData.widget_icon_background_color || '';
        widgetEditExternalLinkInput.value = widgetData.widget_external_link || ''; 

        saveWidgetBtn.setAttribute('onclick', `saveWidgetChanges(${widgetId})`)
    }
}

function saveDashboardHeader(dashboardId) {
    const headerBackgroundImage = document.getElementById('dashboardURLInput').value;
    const selectedElement = document.querySelector('input[name="position-selection"]:checked');
    const headerBackgroundPosition = selectedElement.getAttribute('data-position');
    const headerTitle = document.getElementById('headerEditTitle').value;
    const headerSubtext = document.getElementById('headerEditSubtext').value;
    const headerIcon = document.getElementById('headerEditIcon').value;
    const headerIconColor = document.getElementById('headerEditIconColorHex').value;
    const headerIconBackgroundColor = document.getElementById('headerEditIconBackgroundColorHex').value;
    const headerTextColor = document.getElementById('headerEditTextColorHex').value;
    const headerSubtextColor = document.getElementById('headerEditSubtextColorHex').value;

    fetch(`/admin/templates/dashboard/${dashboardId}/edit-header/`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken'),
        },
        body: JSON.stringify({
            header_background_image: headerBackgroundImage,
            header_background_image_position: headerBackgroundPosition,
            header_title: headerTitle,
            header_subtext: headerSubtext,
            header_icon: headerIcon,
            header_icon_color: headerIconColor,
            header_icon_background_color: headerIconBackgroundColor,
            header_text_color: headerTextColor,
            header_subtext_color: headerSubtextColor,
        }),
    })
    .then(response => {
        if (!response.ok) {
            return response.text().then(text => { throw new Error(text); });
        }
        return response.json();
    })
    .then(data => {
        if (data.success) {
            // Update the DOM elements with the new values
            document.getElementById('headerImage').style.backgroundImage = `url(${headerBackgroundImage})`;
            document.getElementById('headerImage').style.backgroundPosition = headerBackgroundPosition;
            document.getElementById('headerTitle').innerText = headerTitle;
            document.getElementById('headerSubtext').innerText = headerSubtext;

            const iconWrapper = document.getElementById('headerIcon');
            iconWrapper.innerHTML = `<i style="color: ${headerIconColor};" class="${headerIcon}"></i>`;
            iconWrapper.style.backgroundColor = headerIconBackgroundColor;

            document.getElementById('headerTitle').style.color = headerTextColor;
            document.getElementById('headerSubtext').style.color = headerSubtextColor;

            displayValidationMessage('Dashboard updated successfully', true);
        } else {
            displayValidationMessage('Failed to update header', false);
        }
    })
    .catch(error => {
        displayValidationMessage('Something went wrong, please contact an administrator', false);
    });
}

function closeEditSidebar(){
    optionsSidebar.classList.remove('show-options-sidebar');
}


function updateColorInfo(inputId) {
    const colorInput = document.getElementById(inputId);
    const hexInput = document.getElementById(inputId + 'Hex');
    const colorSample = document.getElementById(inputId + 'Sample');

    // Update the hex input field and color sample
    hexInput.value = colorInput.value;
    colorSample.style.backgroundColor = colorInput.value;
    hexInput.classList.remove('form-error-field');
}


function initializeColorListeners(){
    // Attach event listeners to color inputs
    const colorInputs = document.querySelectorAll('input[type="color"]');
    colorInputs.forEach(input => {
        const inputId = input.id;
        const hexInputId = inputId + 'Hex';
        const sampleId = inputId + 'Sample';

        // Update color info when color input value changes
        input.addEventListener('input', () => {
            updateColorInfo(inputId);
        });

        // Initialize the color fields on page load
        updateColorInfo(inputId);
    });

    // Handle click on color sample to trigger color picker
    document.querySelectorAll('.course-content-input').forEach(inputContainer => {
        const colorSample = inputContainer.querySelector('label[id$="Sample"]');
        const colorInput = inputContainer.querySelector('input[type="color"]');

        if (colorSample && colorInput) {
            colorSample.addEventListener('click', () => {
                colorInput.click();
            });
        }
    });
}

function updateColorFromText(inputId) {
    const hexInput = document.getElementById(inputId);
    const colorInput = document.getElementById(inputId.replace('Hex', '')); // Assuming the id structure follows the pattern
    const colorSample = document.getElementById(inputId.replace('Hex', 'Sample'));

    // Update the color input and color sample if the hex is valid
    if (isValidHex(hexInput.value)) {
        colorInput.value = hexInput.value;
        colorSample.style.backgroundColor = hexInput.value;
        hexInput.classList.remove('form-error-field');
    }else{
        displayValidationMessage('Please enter a valid Hex value (e.g., #000000)', false);
        hexInput.classList.add('form-error-field');
    }
}

function initializeTextColorListeners() {
    // Attach event listeners to hex text inputs
    const hexInputs = document.querySelectorAll('input[type="text"][id$="Hex"]');

    hexInputs.forEach(hexInput => {
        hexInput.addEventListener('input', () => {
            updateColorFromText(hexInput.id);
        });

        // Initialize the color fields on page load
        updateColorFromText(hexInput.id);
    });
}

function isValidHex(hex) {
    // Check if the hex code matches the valid 6-digit hex pattern
    return /^#[0-9A-F]{6}$/i.test(hex);
}

function checkSelectedIcon(context) {
    const selectedIcon = document.querySelector('input[name="icon-selection"]:checked');

    if (selectedIcon) {
        const iconClass = selectedIcon.nextElementSibling.querySelector('i').className;

        // Determine the context (header or widget) and update accordingly
        if (context === 'headerIcon') {
            document.getElementById('headerEditIcon').value = iconClass;
            document.getElementById('currentSelectedIconHeader').className = iconClass;
        } else if (context === 'widgetIcon') {
            document.getElementById('widgetEditIcon').value = iconClass;
            document.getElementById('currentSelectedIconWidget').className = iconClass;
        }
    }
}

function initializeSelectedIcon(context) {
    let iconInputValue;
    let iconContainer;

    // Determine the context and select the appropriate elements
    if (context === 'headerIcon') {
        iconInputValue = document.getElementById('headerEditIcon').value.trim();
        iconContainer = document.querySelector('.icon-selection-container-header');
    } else if (context === 'widgetIcon') {
        iconInputValue = document.getElementById('widgetEditIcon').value.trim();
        iconContainer = document.querySelector('.icon-selection-container-widget');
    }

    if (!iconContainer) return;

    const icons = iconContainer.querySelectorAll('.icon-selection-icon i');

    icons.forEach((icon) => {
        if (icon.className === iconInputValue) {
            const parentLabel = icon.closest('label');
            const radioInput = parentLabel.querySelector('input[type="radio"]');
            radioInput.checked = true;
            parentLabel.classList.add('selected-icon');
        }
    });
}

function testIconSelection(context) {
    const iconSelectionBtn = document.getElementById('iconSelectionBtn');
    iconSelectionBtn.setAttribute('onclick', `closePopup('iconSelectionPopup'); checkSelectedIcon('${context}');`);

    // Get the current selected icon's class name
    let currentIconElement;
    if(context === 'headerIcon'){
        currentIconElement = document.getElementById('currentSelectedIconHeader');
    }else{
        currentIconElement = document.getElementById('currentSelectedIconWidget');
    }
      
    const currentIconClass = currentIconElement.className;

    // Get all icon options in the popup
    const iconOptions = document.querySelectorAll('.icon-selection-item');

    // Loop through each icon option to find the one that matches the current icon's class
    iconOptions.forEach(function(iconOption) {
        const iconClass = iconOption.querySelector('i').className;

        // Compare the class names
        if (iconClass === currentIconClass) {
            // Check the radio button if it matches
            iconOption.querySelector('input[type="radio"]').checked = true;
            console.log(`Icon with class ${iconClass} matches the current selected icon.`);
        }
    });
}

function initializeExternalLink(){
    const linkInput = document.getElementById('widgetEditExternalLinkInput');
    const visitLinkBtn = document.querySelector('.external-link-visit');

    // Function to handle link visit
    function visitExternalLink() {
        const url = linkInput.value.trim();

        // Check if the input is not empty and is a valid URL
        if (url) {
            // Open the link in a new tab
            window.open(url, '_blank');
        } else {
            displayValidationMessage('Please enter a valid URL', false);
        }
    }

    // Add event listener to the visit link button
    visitLinkBtn.addEventListener('click', visitExternalLink);
}

function hideNoWidgetsContainer(){
    const noWidgetsContainer = document.getElementById('noWidgetsContainer');
    noWidgetsContainer.style.display = 'none';
}

function showNoWidgetsContainer(){
    const noWidgetsContainer = document.getElementById('noWidgetsContainer');
    noWidgetsContainer.style.display = 'flex';
}

function testTotalWidgetCards(){
    const totalWidgets = document.querySelectorAll('.widget');
    console.log(totalWidgets.length);
    if(totalWidgets.length < 1){
        showNoWidgetsContainer();
    }else{
        hideNoWidgetsContainer();
    }
}