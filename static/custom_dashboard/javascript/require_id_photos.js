document.addEventListener('DOMContentLoaded', function() {
    const fileInputs = document.querySelectorAll('.custom-file');

    fileInputs.forEach(function(input) {
        input.addEventListener('change', function() {
            const file = input.files[0];
            const fileName = file ? file.name : "No file selected";
    
            const fileDisplayArea = input.closest('.custom-file-upload-container').querySelector('.file-name-display');
            fileDisplayArea.textContent = fileName;
    
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const base64 = e.target.result;

                    const inputId = input.getAttribute('id');
                    const previewId = inputId + '_preview';
                    const imgPreview = document.getElementById(previewId);

                    if (imgPreview) {
                        imgPreview.src = base64;
                        imgPreview.classList.remove('hidden');
                    }

                    // Check after preview updates
                    detectFileChanges();
                };
                reader.readAsDataURL(file);
            }
        });
    });
});

function detectFileChanges() {
    const passportphoto_preview = document.getElementById('passportphoto_preview');
    const photoid_preview = document.getElementById('photoid_preview');
    const submitBtn = document.querySelector('.learner-save-btns');

    const hasPassportPhoto = passportphoto_preview && passportphoto_preview.src && !passportphoto_preview.src.endsWith('/');
    const hasPhotoId = photoid_preview && photoid_preview.src && !photoid_preview.src.endsWith('/');

    if (hasPassportPhoto && hasPhotoId) {
        // Enable the button
        submitBtn.disabled = false;
        submitBtn.classList.remove('disabled');
    } else {
        // Disable it again if either is missing
        submitBtn.disabled = true;
        submitBtn.classList.add('disabled');
    }
}