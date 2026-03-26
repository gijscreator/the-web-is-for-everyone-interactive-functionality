const back = document.querySelector('.back');

if (back) {
    back.addEventListener('click', (event) => {
        event.preventDefault();
        if (window.history.length > 1) {
            window.history.back();
        }
    });
}

const collectionIcon = document.querySelector('.collection-icon');
const formSubmit = document.querySelector('.collectbutton'); 
const plantImage = document.querySelector('.plant-animated');

if (formSubmit) {
    formSubmit.addEventListener('submit', function(event) {
        event.preventDefault();

        if (plantImage) plantImage.classList.add('active');
        if (collectionIcon) collectionIcon.classList.add('active');

        setTimeout(() => {
            this.submit(); 
        }, 1200); 
    });
}

const popovers = document.querySelectorAll('.opdracht-popover');
if (popovers.length > 0) {
    popovers.forEach(popover => {
        popover.addEventListener('toggle', (event) => {
            if (event.newState === 'closed') {
                history.replaceState(null, document.title, window.location.pathname + window.location.search);
                
                const list = popover.querySelector('ul');
                if (list) {
                    list.scrollTo({ left: 0 });
                }
            }
        });
    });
}