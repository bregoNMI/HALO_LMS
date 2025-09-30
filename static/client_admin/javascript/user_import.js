const IMPORT_SCOPE = document.getElementById('userImportMap');
const dropzone = document.getElementById('userImportCSVDropzone');
const dropzoneText = document.getElementById('dropzoneText');
const dropzoneIcon = document.getElementById('dropzoneIcon');
const fileInput = document.getElementById('userImportCSVFile');
const fileUploadSubmit = document.getElementById('userImportSubmit');

let userImportPreview = null;
let userImportMapping = {};
let additionalFieldPolicies = {};

// Fields you allow mapping to (User + Profile). `value` is what backend will expect.
const MAPPING_OPTIONS = [
    { group: 'Profile', label: 'Email', value: 'profile.email' },
    { group: 'Profile', label: 'First Name', value: 'profile.first_name' },
    { group: 'Profile', label: 'Last Name', value: 'profile.last_name' },
    { group: 'Profile', label: 'Associate School', value: 'profile.associate_school' },
    { group: 'Profile', label: 'Role', value: 'profile.role' },
    { group: 'Profile', label: 'Date of Birth', value: 'profile.birth_date' },
    { group: 'Profile', label: 'Address 1', value: 'profile.address_1' },
    { group: 'Profile', label: 'Address 2', value: 'profile.address_2' },
    { group: 'Profile', label: 'City', value: 'profile.city' },
    { group: 'Profile', label: 'State/Province', value: 'profile.state' },
    { group: 'Profile', label: 'Postal Code', value: 'profile.code' },
    { group: 'Profile', label: 'Country', value: 'profile.country' },
    { group: 'Profile', label: 'Citizenship', value: 'profile.citizenship' },
    { group: 'Profile', label: 'Phone', value: 'profile.phone' },
    { group: 'Profile', label: 'Sex', value: 'profile.sex' },
    { group: 'Profile', label: 'Referral', value: 'profile.referral' },
    { group: 'Profile', label: 'Archived', value: 'profile.archived' },
];

const optionsWithPassword = [
  ...getProfileMappingOptions(),
  { group: 'User', label: 'Password (CSV Column)', value: 'user.password' },
];

function handleFileReady() {
    const fileDisplayContainer = document.getElementById('userImportCSVFileDisplayContainer');
    const submitBtn = document.getElementById('userImportSubmit');
    const f = fileInput.files && fileInput.files[0];

    // Reset UI
    fileDisplayContainer.innerHTML = '';
    fileDisplayContainer.classList.remove('show-assignment-upload-file');
    submitBtn.classList.add('disabled');
    submitBtn.disabled = true;

    if (!f) return;

    // Enforce CSV
    if (!/\.csv$/i.test(f.name)) {
        displayValidationMessage('Please select a .csv file.', false);
        fileInput.value = '';
        return;
    }

    // Build preview chip
    const fileType = getFileTypeFromName(f.name);
    const previewURL = URL.createObjectURL(f);
    const fileIcon = getFileTypeIcon(fileType, previewURL);

    const display = document.createElement('div');
    display.className = 'uploaded-file-preview';
    display.innerHTML = `
        <div class="file-preview-left">
        <span class="file-icon">${fileIcon}</span>
        <span id="liveFileNamePreview" class="file-name">${f.name}</span>
        </div>
        <div class="file-preview-right">
        <button type="button" class="remove-file-btn tooltip" aria-label="Remove File">
            <i class="fa-light fa-trash-can"></i>
            <span class="tooltiptext"> Remove File</span>
        </button>
        </div>
    `;

    fileDisplayContainer.appendChild(display);
    fileDisplayContainer.classList.add('show-assignment-upload-file');

    // Enable submit now that we have a valid CSV
    submitBtn.classList.remove('disabled');
    submitBtn.disabled = false;

    // Remove handler: reset everything
    const removeBtn = display.querySelector('.remove-file-btn');
    removeBtn.addEventListener('click', () => {
        // Revoke blob url if we created one for images (safe to call regardless)
        try { URL.revokeObjectURL(previewURL); } catch (_) {}

        fileInput.value = '';
        fileDisplayContainer.innerHTML = '';
        fileDisplayContainer.classList.remove('show-assignment-upload-file');
        submitBtn.classList.add('disabled');
        submitBtn.disabled = true;
    });
}

// --- Utility: figure out file type from extension
function getFileTypeFromName(fileName) {
    const extension = fileName.split('.').pop().toLowerCase();
    if (['pdf'].includes(extension)) return 'pdf';
    if (['mp3', 'wav', 'ogg'].includes(extension)) return 'audio';
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension)) return 'image';
    if (['mp4', 'mov', 'avi', 'webm'].includes(extension)) return 'video';
    if (['doc', 'docx', 'txt', 'rtf'].includes(extension)) return 'document';
    if (['csv'].includes(extension)) return 'csv';
    return 'default';
}

// --- Utility: return an icon or preview based on type
function getFileTypeIcon(fileType, fileURL) {
    switch (fileType) {
    case 'pdf':
        return '<i class="fa-light fa-file-pdf"></i>';
    case 'audio':
        return '<i class="fa-light fa-volume"></i>';
    case 'image':
        return `<div class="file-image-display"><img src="${fileURL}" alt="Preview" loading="lazy"></div>`;
    case 'video':
        return '<i class="fa-light fa-film"></i>';
    case 'document':
        return '<i class="fa-light fa-file-doc"></i>';
    case 'csv':
        return '<i style="color:#18aa18;" class="fa-solid fa-file-spreadsheet"></i>';
    default:
        return '<i class="fa-light fa-file"></i>';
    }
}

function addUploadLoading(){
    const loadingSymbols = document.querySelectorAll('.loading-symbol-blue-sm');
    // Showing the loading symbol
    for (const symbol of loadingSymbols) {
        symbol.style.display = 'flex'; // Show each loading symbol
    }
    // Blocking all of the inputs and buttons
    const popupBtns = document.querySelectorAll('.popup-btn');
    for (const btn of popupBtns) {
        btn.classList.add('disabled');
        btn.setAttribute('disabled', true);
    }
    const closePopupIcon = document.querySelectorAll('.close-popup-icon');
    for (const btn of closePopupIcon) {
        btn.classList.add('disabled');
        btn.setAttribute('disabled', true);
    }
}

// Enforce CSV on change
fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    if (!f) return;
    const extOk = /\.csv$/i.test(f.name);
    if (!extOk) {
        displayValidationMessage('Please select a .csv file.', false);
        fileInput.value = '';
        return;
    }
    handleFileReady();
});

// Drag&drop UI
['dragenter','dragover'].forEach(evt => dropzone.addEventListener(evt, (e)=>{
    e.preventDefault();
    dropzone.classList.add('drag-over');
    dropzoneIcon.className = 'fa-light fa-arrow-down-to-bracket';
    dropzoneText.textContent = 'Drop File';
}));

['dragleave','drop'].forEach(evt => dropzone.addEventListener(evt, (e)=>{
    e.preventDefault();
    dropzone.classList.remove('drag-over');
    dropzoneIcon.className = 'fa-light fa-cloud-arrow-up';
    dropzoneText.innerHTML = 'Drag & drop your csv file here or <u>click to browse</u>';
}));

dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files[0]) {
        if (!/\.csv$/i.test(files[0].name)) {
        displayValidationMessage('Please drop a .csv file.', false);
        return;
        }
        fileInput.files = files;
        handleFileReady();
    }
});

// Submit → PREVIEW
document.getElementById('userImportForm').addEventListener('submit', function (event) {
    event.preventDefault();
    if (!fileInput.files.length) return;
    addUploadLoading();

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/requests/user-import/preview/', true);
    xhr.setRequestHeader('X-CSRFToken', getCookie('csrftoken'));

    xhr.onload = function () {
        try {
        const response = JSON.parse(xhr.responseText);
        if (xhr.status === 200 && response.success) {
            // Save preview + build mapping table
            userImportPreview = response;
            buildMappingTable(response);
            closePopup('userImportCSV');
            openPopup('userImportMap');
        } else {
            displayValidationMessage(response.message || 'Upload failed. Please try again.', false);
        }
        } catch (err) {
            console.error(err);
            displayValidationMessage('Could not parse preview response.', false);
        } finally {
            removeUploadLoading(fileInput, { value: '' }, { innerHTML: '' }, { value: '' });
        }
    };

    xhr.onerror = function () {
        displayValidationMessage('An unexpected error occurred. Please try again later.', false);
        removeUploadLoading(fileInput, { value: '' }, { innerHTML: '' }, { value: '' });
    };

    xhr.send(formData);
});

// Removing the loading symbol from file upload popup and others
function removeUploadLoading(fileInput, customFileName, fileDisplayContainer, fileName){
    const loadingSymbols = document.querySelectorAll('.loading-symbol-blue-sm');
    // Showing the loading symbol
    for(const symbol of loadingSymbols){
        symbol.style.display = 'none';
    }

    // Unblocking all of the inputs and buttons
    const popupBtns = document.querySelectorAll('.popup-btn');
    for (const btn of popupBtns) {
        btn.classList.remove('disabled');
        btn.removeAttribute('disabled');
    }
    const closePopupIcon = document.querySelectorAll('.close-popup-icon');
    for (const btn of closePopupIcon) {
        btn.classList.remove('disabled');
        btn.removeAttribute('disabled');
    }

    // const rmBtn = document.getElementById('userImportCSV').querySelector('.remove-file-btn');
    // if (rmBtn) rmBtn.click();
    // fileInput.value = '';
    // customFileName.value = '';
    // fileName.value = '';
    // fileDisplayContainer.innerHTML = ``;
}

function renderUsernameSelect(headers) {
    const slot = document.getElementById('usernameColumnSelectSlot');
    if (!slot) return;

    // Build options: CSV headers + synthetic option
    const options = [
        ...headers.map(h => ({ label: h, value: h })),
        { label: 'FirstName.LastName', value: '__FIRST_LAST__' },   // NEW
    ];

    slot.innerHTML = `
        <div class="custom-select margin-0 import-select" id="usernameColumnSelectWrap">
        <i class="fa-light fa-angles-up-down"></i>
        <input class="select-selected" type="text" id="usernameColumnSelect" readonly placeholder="Select...">
        <div class="select-items scrollable-content" style="display:none;"></div>
        </div>
    `;

    buildCustomSelect({
        wrapId: 'usernameColumnSelectWrap',
        inputId: 'usernameColumnSelect',
        name: 'username_column',
        options,
        selectedValue: (function guess() {
        return headers.find(h => /^(username|user_name|user)$/i.test(h)) ||
                headers.find(h => /name/i.test(h)) || '';
        })(),
        onChange: validateMapping
    });
}

// Build a custom select (your pattern) inside a container
function buildCustomSelect({wrapId, inputId, name, options, selectedValue = '', onChange}) {
    const wrap = document.getElementById(wrapId);
    if (!wrap) return;

    // Prevent double-binding when UI is rebuilt
    if (wrap.dataset.csInit === '1') {
        // still refresh the options list and selected value though:
        const items = wrap.querySelector('.select-items');
        const input = wrap.querySelector('.select-selected');
        items.innerHTML = '';
        input.value = '';
        input.dataset.value = '';
        // (rebuild options – same as below)
    } else {
        wrap.dataset.csInit = '1';
    }

    const items = wrap.querySelector('.select-items');
    const input = wrap.querySelector('.select-selected');

    input.readOnly = true;
    input.setAttribute('placeholder', 'Select...');
    items.innerHTML = '';

    options.forEach(opt => {
        const div = document.createElement('div');
        div.className = 'select-item';
        div.setAttribute('data-name', name);
        div.setAttribute('data-value', opt.value);
        div.textContent = opt.label;
        if (selectedValue && selectedValue === opt.value) {
        div.classList.add('same-as-selected');
        input.value = opt.label;
        input.dataset.value = opt.value;
        }
        // Use pointerdown to beat document “click” closers
        div.addEventListener('pointerdown', function (e) {
        e.preventDefault(); // prevents focus steal; keeps event from bubbling to document
        e.stopPropagation();

        items.querySelectorAll('.select-item').forEach(el => el.classList.remove('same-as-selected'));
        this.classList.add('same-as-selected');

        input.value = this.textContent;
        input.dataset.value = this.getAttribute('data-value');

        items.style.display = 'none';
        input.classList.remove('select-open');

        if (typeof onChange === 'function') {
            onChange({
            name: this.getAttribute('data-name'),
            value: this.getAttribute('data-value'),
            label: this.textContent,
            inputEl: input,
            itemsEl: items,
            });
        }
        });
        div.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
        items.appendChild(div);
    });

    // Open/close (use pointerdown + stopPropagation)
    input.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        e.stopPropagation();

        // Close other import selects only (scoped)
        IMPORT_SCOPE.querySelectorAll('.custom-select .select-items').forEach(el => {
            if (el !== items) el.style.display = 'none';
        });
        IMPORT_SCOPE.querySelectorAll('.custom-select .select-selected').forEach(el => {
            if (el !== input) el.classList.remove('select-open');
        });

        const isOpen = items.style.display === 'block';
        input.classList.toggle('select-open', !isOpen);
        items.style.display = isOpen ? 'none' : 'block';
    });

    input.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
    });

    // Make the caret act like the input
    const caret = wrap.querySelector('i.fa-angles-up-down');
        if (caret && !caret.dataset.bound) {
        caret.dataset.bound = '1';
        caret.addEventListener('pointerdown', function (e) {
            e.preventDefault();
            e.stopPropagation();
            input.dispatchEvent(new PointerEvent('pointerdown', {bubbles: true}));
        });
        caret.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
        });
    }
}

document.addEventListener('pointerdown', function (e) {
    if (!IMPORT_SCOPE) return;

    // If the press is inside any import custom-select, do nothing.
    const inside = e.target.closest('#userImportMap .custom-select');
    if (inside) return;

    // Otherwise, close all import selects.
    IMPORT_SCOPE.querySelectorAll('.custom-select .select-items').forEach(el => el.style.display = 'none');
    IMPORT_SCOPE.querySelectorAll('.custom-select .select-selected').forEach(el => el.classList.remove('select-open'));
});

// Utility: turn an array of strings into label/value pairs
function toOptionListFromStrings(arr) {
  return arr.map(h => ({ label: h, value: h }));
}

// Options for Profile-only mapping selects (from your constant)
function getProfileMappingOptions() {
  return MAPPING_OPTIONS.map(o => ({ label: o.label, value: o.value }));
}

function onMappingChanged(e) {
    const col = e.target.dataset.column;
    const value = e.target.value;

    // enforce unique target mapping: if chosen elsewhere, clear old
    if (value) {
        const allSelects = document.querySelectorAll('#userImportMappingTable select');
        allSelects.forEach(sel => {
        if (sel !== e.target && sel.value === value) {
            sel.value = '';
        }
        });
    }

    if (value) userImportMapping[col] = value; else delete userImportMapping[col];
    validateMapping();
}

function buildMappingTable(preview) {
  const { headers = [], rows_preview = [] } = preview;

  renderUsernameSelect(headers);

  // 2.2 — Build mapping rows with custom selects
  const tbody = document.querySelector('#userImportMappingTable tbody');
  tbody.innerHTML = '';
  userImportMapping = {}; // reset

  headers.forEach((colName, rowIdx) => {
    const samples = collectSamplesForColumn(colName, headers, rows_preview, 5);
    const tr = document.createElement('tr');
    tr.style.backgroundColor = '#ffffff';
    tr.style.cursor = 'default';

    const tdCol = document.createElement('td');
    const tdColIcon = document.createElement('div');
    tdColIcon.innerHTML = `<span class="file-icon"><i style="color:#18aa18;" class="fa-solid fa-file-spreadsheet"></i></span><span class="csv-column-title">${colName}</span>`;
    tdColIcon.className = 'csv-column-container';

    const tdSample = document.createElement('td');
    tdSample.innerHTML = samples.length ? samples.map(escapeHtml).join(', ') : '<em>(empty)</em>';

    const tdSelect = document.createElement('td');

    // Insert your custom-select shell
    const wrapId = `mapSelectWrap_${rowIdx}`;
    tdSelect.innerHTML = `
      <div class="custom-select margin-0 mapping-select" id="${wrapId}">
        <i class="fa-light fa-angles-up-down"></i>
        <input class="select-selected" type="text" readonly>
        <div class="select-items scrollable-content" style="display:none;"></div>
      </div>
    `;

    tdCol.appendChild(tdColIcon);
    tr.appendChild(tdCol);
    tr.appendChild(tdSample);
    tr.appendChild(tdSelect);
    tbody.appendChild(tr);

    buildCustomSelect({
        wrapId,
        inputId: '',
        name: colName,
        options: optionsWithPassword,
        selectedValue: '',
        onChange: ({ name, value, inputEl }) => {
            if (value) {
                document.querySelectorAll('.mapping-select .select-selected').forEach(otherInput => {
                    if (otherInput !== inputEl && otherInput.dataset.value === value) {
                        otherInput.value = 'Select...';
                        otherInput.dataset.value = '';
                        const itemsEl = otherInput.parentElement.querySelector('.select-items');
                        itemsEl.querySelectorAll('.select-item').forEach(el => el.classList.remove('same-as-selected'));
                    }
                });
                userImportMapping[name] = value;
            } else {
                delete userImportMapping[name];
            }
            validateMapping();
        }
    });
  });

  // 2.3 — Summary unchanged
  const summary = document.getElementById('userImportColumns');
  summary.style.display = 'flex';
  summary.innerText = `Detected columns: ${headers.length}`;

  renderAdditionalFieldsTable();
  validateMapping();
}

function renderAdditionalFieldsTable() {
    const tbody = document.querySelector('#userImportAdditionalFields tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Required fields you do NOT show here
    const REQUIRED_TARGETS = new Set([
        'profile.first_name',
        'profile.last_name',
        'profile.email',
    ]);

    // Build a row for every mappable target except required ones
    MAPPING_OPTIONS.forEach(opt => {
        if (REQUIRED_TARGETS.has(opt.value)) return;

        const tr = document.createElement('tr');
        tr.style.backgroundColor = '#ffffff';
        tr.style.cursor = 'default';

        // Overwrite checkbox
        const tdOverwrite = document.createElement('td');
        tdOverwrite.innerHTML = `
            <div class="af-overwrite-container">
                <label class="container">
                    <input type="checkbox" class="af-overwrite" data-target="${opt.value}">
                    <div class="checkmark"></div>
                    <span>Overwrite</span>
                </label>
            </div>
        `;

        const tdLabel = document.createElement('td');
        tdLabel.textContent = opt.label;

        const tdDefault = document.createElement('td');
        let defaultInputHtml = '';

        if (opt.value === 'profile.birth_date') {
            defaultInputHtml = `
                <div class="course-content-input">
                    <div class="edit-user-input">
                        <input type="text" class="date-picker standard-input af-default"
                            data-target="${opt.value}" readonly>
                        <span class="input-group-addon">
                            <i class="fa-regular fa-calendar-lines"></i>
                        </span>
                    </div>
                </div>
            `;
        } else if (opt.value === 'profile.role') {
            const safeKey = opt.value.replace(/[^\w-]/g, '_'); // "profile.role" -> "profile_role"
            const wrapId  = `afRoleSelect_${safeKey}`;

            defaultInputHtml = `
                <div class="custom-select margin-0" id="${wrapId}">
                <i class="fa-light fa-angles-up-down"></i>
                <input class="select-selected af-default" type="text"
                        placeholder="Select role..."
                        data-target="${opt.value}" readonly>
                <div class="select-items scrollable-content" style="display:none;"></div>
                </div>
            `;

            setTimeout(() => {
                const roleOptions = [
                { label: 'Student',   value: 'Student' },
                { label: 'Auditor',   value: 'Auditor' },
                { label: 'Instructor',value: 'Instructor' },
                { label: 'Admin',     value: 'Admin' },
                ];

                buildCustomSelect({
                wrapId,
                inputId: '',
                name: opt.value,             // keep original target with dot
                options: roleOptions,
                selectedValue: 'Student',    // default selection
                onChange: ({ name, value }) => {
                    const wrapEl = document.getElementById(wrapId);
                    if (!wrapEl) return;
                    const row = wrapEl.closest('tr');
                    if (!row) return;

                    const overwrite = !!row.querySelector('.af-overwrite')?.checked;
                    additionalFieldPolicies[name] = { overwrite, default: value };
                    if (!overwrite && !value) delete additionalFieldPolicies[name];
                },
                });

                const wrapEl = document.getElementById(wrapId);
                if (wrapEl) {
                const row = wrapEl.closest('tr');
                const overwrite = !!row?.querySelector('.af-overwrite')?.checked;
                additionalFieldPolicies[opt.value] = { overwrite, default: 'Student' };
                }
            });
        } else if (opt.value === 'profile.country') {
            const safeKey = opt.value.replace(/[^\w-]/g, '_');
            const wrapId  = `afCountrySelect_${safeKey}`;

            defaultInputHtml = `
                <div class="custom-select margin-0" id="${wrapId}">
                <i class="fa-light fa-angles-up-down"></i>
                <input class="select-selected af-default" type="text"
                        placeholder="Select country..."
                        data-target="${opt.value}" readonly>
                <div class="select-items scrollable-content" style="display:none; max-height:240px;"></div>
                </div>
            `;

            setTimeout(() => {
                const countryOptions = optionsFromTemplate('countryOptionsTemplate');

                buildCustomSelect({
                    wrapId,
                    inputId: '',
                    name: opt.value,
                    options: countryOptions,
                    onChange: ({ name, value }) => {
                        const wrapEl = document.getElementById(wrapId);
                        if (!wrapEl) return;
                        const row = wrapEl.closest('tr');
                        if (!row) return;

                        const overwrite = !!row.querySelector('.af-overwrite')?.checked;
                        additionalFieldPolicies[name] = { overwrite, default: value };
                        if (!overwrite && !value) delete additionalFieldPolicies[name];
                    },
                });

                const wrapEl = document.getElementById(wrapId);
                if (wrapEl) {
                    const row = wrapEl.closest('tr');
                    const overwrite = !!row?.querySelector('.af-overwrite')?.checked;
                    additionalFieldPolicies[opt.value] = { overwrite, default: 'United States' };
                }
            });
        }  else if (opt.value === 'profile.citizenship') {
            const safeKey = opt.value.replace(/[^\w-]/g, '_');
            const wrapId  = `afCitizenshipSelect_${safeKey}`;

            defaultInputHtml = `
                <div class="custom-select margin-0" id="${wrapId}">
                <i class="fa-light fa-angles-up-down"></i>
                <input class="select-selected af-default" type="text"
                        placeholder="Select citizenship..."
                        data-target="${opt.value}" readonly>
                <div class="select-items scrollable-content" style="display:none; max-height:240px;"></div>
                </div>
            `;

            setTimeout(() => {
                const citizenshipOptions = optionsFromTemplate('citizenshipOptionsTemplate');

                buildCustomSelect({
                    wrapId,
                    inputId: '',
                    name: opt.value,
                    options: citizenshipOptions,
                    onChange: ({ name, value }) => {
                        const wrapEl = document.getElementById(wrapId);
                        if (!wrapEl) return;
                        const row = wrapEl.closest('tr');
                        if (!row) return;

                        const overwrite = !!row.querySelector('.af-overwrite')?.checked;
                        additionalFieldPolicies[name] = { overwrite, default: value };
                        if (!overwrite && !value) delete additionalFieldPolicies[name];
                    },
                });

                const wrapEl = document.getElementById(wrapId);
                if (wrapEl) {
                    const row = wrapEl.closest('tr');
                    const overwrite = !!row?.querySelector('.af-overwrite')?.checked;
                    additionalFieldPolicies[opt.value] = { overwrite, default: 'United States' };
                }
            });
        } else if (opt.value === 'profile.archived') {
            defaultInputHtml = `
                <label class="toggle-switch" tabindex="0" role="switch" aria-checked="false">
                    <input class="toggle-hidden-settings-input af-default" type="checkbox" data-target="${opt.value}">
                    <div class="toggle-switch-background">
                    <div class="toggle-switch-handle"></div>
                    </div>
                </label>
            `;
        } else {
            defaultInputHtml = `
                <div class="course-content-input">
                    <input type="text" class="standard-input af-default" data-target="${opt.value}">
                </div>
            `;
        }

        tdDefault.innerHTML = `
            ${defaultInputHtml}
        `;

        tr.appendChild(tdOverwrite);
        tr.appendChild(tdLabel);
        tr.appendChild(tdDefault);
        tbody.appendChild(tr);
        initializeFlatpickrDateElements();
    });

    additionalFieldPolicies = {};
    tbody.querySelectorAll('.af-overwrite, .af-default').forEach(el => {
        el.addEventListener('input', () => {
            const target = el.dataset.target;
            const row = el.closest('tr');
            const overwrite = !!row.querySelector('.af-overwrite').checked;
            const defVal = (row.querySelector('.af-default').value || '').trim();
            additionalFieldPolicies[target] = { overwrite, default: defVal };

            if (!overwrite && !defVal) delete additionalFieldPolicies[target];
        });
    });
}

function optionsFromTemplate(templateId) {
    const tpl = document.getElementById(templateId);
    if (!tpl) return [];
    const frag = tpl.content ? tpl.content.cloneNode(true) : (() => {
        const d = document.createElement('div');
        d.innerHTML = tpl.innerHTML;
        return d;
    })();

    return [...frag.querySelectorAll('.select-item')].map(el => ({
        label: el.textContent.trim(),                      // e.g. "United States of America"
        value: el.getAttribute('data-value') || el.textContent.trim(), // e.g. "United States"
    }));
}

function validateMapping() {
  const unameInput = document.querySelector('#usernameColumnSelectWrap .select-selected');
  const unameMode = unameInput?.dataset?.value || ''; // '__FIRST_LAST__' or a real CSV header

  const chosenTargets = Object.values(userImportMapping);
  const hasFirst = chosenTargets.includes('profile.first_name');
  const hasLast  = chosenTargets.includes('profile.last_name');
  const hasEmail = chosenTargets.includes('profile.email');

  // username is required either by real header or FirstName.LastName
  const hasUsername = !!unameMode;

  const ok = hasUsername && hasFirst && hasLast && hasEmail;

  const btn = document.getElementById('startUserImportBtn');
  btn.classList.toggle('disabled', !ok);
  btn.disabled = !ok;

  const req = document.getElementById('userImportRequiredChecklist');
  if (req) {
    req.innerHTML = `
      <div class="import-required-fields">
        ${hasUsername ? 
            `<div class="required-field complete"><i class="fa-solid fa-circle-check"></i><span>Username</span></div>` 
        : `<div class="required-field incomplete"><i class="fa-duotone fa-regular fa-circle" style="--fa-primary-color: #dddddd; --fa-secondary-color: #ffffff; --fa-secondary-opacity: 1;"></i><span>Username</span></div>`}
        ${hasFirst ? 
            `<div class="required-field complete"><i class="fa-solid fa-circle-check"></i><span>First Name</span></div>` 
        : `<div class="required-field incomplete"><i class="fa-duotone fa-regular fa-circle" style="--fa-primary-color: #dddddd; --fa-secondary-color: #ffffff; --fa-secondary-opacity: 1;"></i><span>First Name</span></div>`}
        ${hasLast ? 
            `<div class="required-field complete"><i class="fa-solid fa-circle-check"></i><span>Last Name</span></div>` 
        : `<div class="required-field incomplete"><i class="fa-duotone fa-regular fa-circle" style="--fa-primary-color: #dddddd; --fa-secondary-color: #ffffff; --fa-secondary-opacity: 1;"></i><span>Last Name</span></div>`}
        ${hasEmail ? 
            `<div class="required-field complete"><i class="fa-solid fa-circle-check"></i><span>Email</span></div>` 
        : `<div class="required-field incomplete"><i class="fa-duotone fa-regular fa-circle" style="--fa-primary-color: #dddddd; --fa-secondary-color: #ffffff; --fa-secondary-opacity: 1;"></i><span>Email</span></div>`}
      </div>
    `;
  }
}

// Small sample collector
function collectSamplesForColumn(colName, headers, rows, maxN) {
    const idx = headers.indexOf(colName);
    if (idx === -1) return [];
    const vals = [];
    for (const row of rows) {
        const v = row[idx];
        if (v !== undefined && v !== null && String(v).trim() !== '') {
        vals.push(String(v));
        }
        if (vals.length >= maxN) break;
    }
    return vals;
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g,'&amp;')
    .replace(/</g,'&lt;')
    .replace(/>/g,'&gt;');
}

// START IMPORT
document.getElementById('startUserImportBtn').addEventListener('click', () => {
    if (!fileInput.files.length) return;

    const unameInput = document.querySelector('#usernameColumnSelectWrap .select-selected');
    const unameCol = unameInput?.dataset?.value || '';
    if (!unameCol) {
        displayValidationMessage('Please select the Username column.', false);
        return;
    }

    const formData = new FormData();
    formData.append('file', fileInput.files[0]);
    formData.append('mapping', JSON.stringify(userImportMapping));
    formData.append('username_column', unameCol);
    formData.append('additional_policies', JSON.stringify(additionalFieldPolicies));

    const defaultPassword = (document.getElementById('defaultPasswordInput')?.value || '').trim();
    if (defaultPassword) formData.append('default_password', defaultPassword);

    for (const [k, v] of formData.entries()) {
        if (k === 'file' && v && v.name) {
            console.log('commit formData:', k, v.name, v.size);
        } else {
            console.log('commit formData:', k, v);
        }
    }

    const el = document.getElementById('userImportMapBody');
    if (el) {el.scrollTo({top: el.scrollHeight, behavior: 'smooth'});}
    addUploadLoading();
    fetch('/requests/user-import/commit/', {
        method: 'POST',
        headers: { 'X-CSRFToken': getCookie('csrftoken') },
        body: formData
    })
    .then(r => r.json())
    .then(data => {
        if (data.success) {
            const notes = `${data.notices.join('\n- ')}`;
            
            // displayValidationMessage(msg, true);
            if (data.audit) console.table(data.audit);
            closePopup('userImportMap');
            displayUserImportSummary(data, notes, data.errors);
        } else {
            displayValidationMessage(data.message || 'Import failed.', false);
        }
    })
    .catch(err => {
        console.error(err);
        displayValidationMessage('Unexpected error during import.', false);
    })
    .finally(() => {
        removeUploadLoading(fileInput, { value: '' }, document.getElementById('userImportCSVFileDisplayContainer'), { value: '' });
    });
});

// Helper function to get CSRF token from cookies
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

function initializeFlatpickrDateElements(){
    flatpickr(".date-picker", {
        altInput: true,
        altFormat: flatpickr_format,
        dateFormat: "Y-m-d",
    });

    // When clicking on the flatpickr icon, trigger the input click to open the picker
    const flatpickrIcons = document.querySelectorAll('.input-group-addon');
    flatpickrIcons.forEach(icon => {
        icon.addEventListener("click", function () {
            const input = icon.previousElementSibling || icon.parentElement.querySelector('input');
            if (input) input.click();
        });
    });

    // Adding X icon to remove value inside flatpickr fields
    const flatPickrInputs = document.querySelectorAll('.flatpickr-input, .time-picker');

    flatPickrInputs.forEach(input => {
        const container = input.parentElement;

        if (container) {
            // Create clear button
            const clearBtn = document.createElement('div');
            clearBtn.className = 'flatpickr-clear-input';
            clearBtn.innerHTML = `<i class="fa-solid fa-xmark"></i>`;
            container.appendChild(clearBtn);

            // Basic styling
            clearBtn.style.cursor = 'pointer';
            clearBtn.style.visibility = 'hidden';
            clearBtn.style.opacity = '0';
            clearBtn.style.transition = 'opacity 0.2s ease';

            // Hover show/hide behavior
            container.addEventListener('mouseenter', () => {
                clearBtn.style.visibility = 'visible';
                clearBtn.style.opacity = '1';
            });

            container.addEventListener('mouseleave', () => {
                clearBtn.style.visibility = 'hidden';
                clearBtn.style.opacity = '0';
            });

            // Clear button click handler
            clearBtn.addEventListener('click', () => {
                if (input._flatpickr) {
                    input._flatpickr.clear();
                    input.value = '';             
                } else {
                    input.value = '';
                    input.previousElementSibling.value = '';
                }
            });
        }
    });
}

function displayUserImportSummary(data, notes, errors){
    openPopup('userImportSummary');

    // Building and displaying the Users Updated block
    const importSummaryItemUpdated = document.getElementById('importSummaryItemUpdated');
    importSummaryItemUpdated.innerHTML = `
        <div class="import-summary-item-icon pastel-orange">
            <i class="fa-light fa-arrows-rotate"></i>
        </div>
        <div class="import-summary-item-text">
            <h4>Users Updated</h4>
            <span>${data.stats.updated}</span>
        </div>`;
    setTimeout(() => {       
        fadeIn('importSummaryItemUpdated');
    }, 300);

    // Building and displaying the Users Created block
    const importSummaryItemCreated = document.getElementById('importSummaryItemCreated');
    importSummaryItemCreated.innerHTML = `
        <div class="import-summary-item-icon pastel-blue">
            <i class="fa-light fa-users-medical"></i>
        </div>
        <div class="import-summary-item-text">
            <h4>Users Created</h4>
            <span>${data.stats.created}</span>
        </div>`;
    setTimeout(() => {        
        fadeIn('importSummaryItemCreated');
    }, 900);

    // Building and displaying the Users Skipped block
    const importSummaryItemSkipped = document.getElementById('importSummaryItemSkipped');
    importSummaryItemSkipped.innerHTML = `
        <div class="import-summary-item-icon pastel-green">
            <i class="fa-light fa-ban"></i>
        </div>
        <div class="import-summary-item-text">
            <h4>Rows Skipped</h4>
            <span>${data.stats.skipped}</span>
        </div>`;
    setTimeout(() => {        
        fadeIn('importSummaryItemSkipped');
    }, 1300);

    const importSummaryNotesContainer = document.getElementById('importSummaryNotesContainer');
    const importSummaryNotes = document.getElementById('importSummaryNotes');
    const importSummaryTitleBadge = document.getElementById('importSummaryTitleBadge');
    const importSummaryTop = document.getElementById('importSummaryTop');

    let summaryText = "";

    if (notes && notes.length) {
        summaryText += `<h4>Notes</h4><ul>`;
        notes.split("\n").forEach(n => {
            summaryText += `<li>${n}</li>`;
        });
        summaryText += `</ul>`;
    }

    if (errors && errors.length) {
        summaryText += `<h4 style="color:#cc0202;">Errors</h4><ul>`;
        errors.forEach(err => {
            summaryText += `<li>${err}</li>`;
        });
        summaryText += `</ul>`;
        importSummaryTop.style.display = 'none';
        importSummaryNotesContainer.style.marginTop = '2rem';
        importSummaryNotesContainer.style.backgroundColor = '#f8d7da';
        importSummaryNotesContainer.style.borderColor = '#f5c6cb';
        importSummaryTitleBadge.classList.remove('pastel-gray');
        importSummaryTitleBadge.classList.add('pastel-red');
        importSummaryTitleBadge.style.boxShadow = '#e16868 0px 1px 1px 2px';
        importSummaryTitleBadge.innerText = 'Import Error';

        setTimeout(() => {      
            fadeIn('importSummaryNotesContainer');
        }, 300);
    }else{
        setTimeout(() => {      
            fadeIn('importSummaryNotesContainer');
        }, 1700);
    }

    importSummaryNotes.innerHTML = summaryText || "<p>No notes or errors.</p>";   
}

function finishUserImport(){
    setTimeout(() => {
        window.location.reload();
    }, 300);
}

function fadeIn(container) {
    if (typeof container === 'string') {
        container = document.getElementById(container);
    }
    if (!container) return;

    container.classList.remove('hidden');
    container.style.opacity = '0';
    container.style.transform = 'scale(0.9)';
    container.style.transition = 'opacity 0.4s ease, transform 0.4s ease';

    setTimeout(() => {
        requestAnimationFrame(() => {
            container.style.opacity = '1';
            container.style.transform = 'scale(1)';
        });
    }, 100);

    setTimeout(() => {
        container.style.opacity = '';
        container.style.transform = '';
        container.style.transition = '';
    }, 1000);
}