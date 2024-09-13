// Dynamically Opening Popups
function openPopup(popup){
    const currentPopup = document.getElementById(popup);
    const popupContent = currentPopup.querySelector('.popup-content');
    currentPopup.style.display = "flex";
    setTimeout(() => {
        popupContent.classList.add('animate-popup-content');
    }, 100);
}

function closePopup(popup){
    const currentPopup = document.getElementById(popup);
    const popupContent = currentPopup.querySelector('.popup-content');
    popupContent.classList.remove('animate-popup-content');
    setTimeout(() => {
        currentPopup.style.display = "none";
    }, 200);
}

function closeLibraryPopup(popup){
    const currentPopup = document.getElementById(popup);
    const popupContent = currentPopup.querySelector('.popup-content');
    currentPopup.style.display = "none";
    setTimeout(() => {        
        popupContent.classList.remove('animate-popup-content');       
    }, 200);
}

function openLibraryPopup(popup){
    const currentPopup = document.getElementById(popup);
    const popupContent = currentPopup.querySelector('.popup-content');

    const fileLibrary = document.getElementById('fileLibrary');
    fileLibrary.style.display = "none";
    currentPopup.style.display = "flex";
    setTimeout(() => {
        fileLibrary.classList.remove('animate-popup-content');    
        popupContent.classList.add('animate-popup-content');
    }, 100);
}