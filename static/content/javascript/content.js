document.addEventListener("DOMContentLoaded", function() {
    var icons = Quill.import('ui/icons');
    icons['bold'] = '<i class="fa-solid fa-bold"></i>'; // Example SVG icon
    icons['italic'] = '<i class="fa-solid fa-italic"></i>'; // Custom HTML icon

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