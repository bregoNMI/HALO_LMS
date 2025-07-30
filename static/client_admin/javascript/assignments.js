document.addEventListener('DOMContentLoaded', () => {
    const manageAssignmentBtns = document.querySelectorAll('.manage-assignment-btns');
    // Click handlers for creating enrollment key
    manageAssignmentBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const assignmentId = document.getElementById('assignmentId').value;
            const reviewNotes = document.getElementById('review_notes').value.trim();
            const assignmentStatus = document.querySelector('input[name="assignment_status"]:checked')?.value;

            if (btn.id === 'manageAssignmentBtn') {
                manageAssignment(assignmentId, assignmentStatus, reviewNotes, true);
            }

            setDisabledSaveBtns();
        });
    });
    
});

function expandMediaItem(buttonEl, fileType = null) {
    const mediaUrl = buttonEl.closest('.media-thumb').querySelector('.assignment-preview-item').getAttribute('src');
    const modalContent = document.getElementById('mediaModalContent');

    const ext = mediaUrl.split('.').pop().toLowerCase();

    let contentHtml = '';

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
        contentHtml = `<img src="${mediaUrl}" style="max-width: 100%; height: auto;">`;
    } else if (['pdf'].includes(ext)) {
        contentHtml = `<iframe src="${mediaUrl}" style="width: 100%; height: 600px;" frameborder="0"></iframe>`;
    } else if (['mp4', 'mov', 'webm', 'avi'].includes(ext)) {
        contentHtml = `<video src="${mediaUrl}" controls style="max-width: 100%; height: auto;"></video>`;
    } else if (['mp3', 'wav', 'ogg'].includes(ext)) {
        contentHtml = `<audio src="${mediaUrl}" controls></audio>`;
    } else {
        contentHtml = `
            <a target="_blank" rel="noopener noreferrer" href="${mediaUrl}" class="file-icon-preview" style="flex-direction: column;">
                <i class="fa-light fa-arrow-down-to-bracket"></i>
                <p>Download assignment</p>
            </a>`;
    }

    modalContent.innerHTML = `
        ${contentHtml}
    `;

    openPopup('assignmentMedia');
}