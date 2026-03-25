const back = document.querySelector('.back');

back.addEventListener('click', (event) => {

    event.preventDefault();

    if (window.history.length > 1) {
        window.history.back();
    }
});

const collectionIcon = document.querySelector('.collection-icon');
const formSumbit = document.querySelector('.collectbutton');
const plantImage = document.querySelector('.plant-animated');

formSumbit.addEventListener('submit', function(event) {
    
    event.preventDefault();

    plantImage.classList.toggle('active');
    collectionIcon.classList.toggle('active');

    setTimeout(() => {
        this.submit(); 
    }, 1200); 
});

document.querySelectorAll('.opdracht-popover').forEach(popover => {
    popover.addEventListener('toggle', (event) => {
        if (event.newState === 'closed') {
        
            history.replaceState(null, document.title, window.location.pathname + window.location.search);
            
            popover.querySelector('ul').scrollTo({ left: 0 });
        }
    });
});

