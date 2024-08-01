document.addEventListener("DOMContentLoaded", function() {
    var icons = Quill.import('ui/icons');
    icons['bold'] = '<i class="fa-solid fa-bold"></i>';
    icons['italic'] = '<i class="fa-solid fa-italic"></i>';
    icons['underline'] = '<i class="fa-solid fa-underline"></i>';
    icons['link'] = '<i class="fa-solid fa-link"></i>';
    icons['image'] = '<i class="fa-solid fa-image"></i>';

    var quill = new Quill('#editor-container', {
        theme: 'snow',
        modules: {
            toolbar: {
                container: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline'],
                    ['link', 'image']
                ],
                handlers: {
                    // Add custom handlers here
                }
            }
        }
    });
    console.log('sfsdfd');
});