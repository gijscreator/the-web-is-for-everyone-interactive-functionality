const back = document.querySelector('.back');

if (back) {
    back.addEventListener('click', (event) => {
        event.preventDefault();
        if (window.history.length > 1) {
            window.history.back();
        }
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