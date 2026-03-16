// URL Cleanup logic for the Popover API
document.querySelectorAll('.opdracht-popover').forEach(popover => {
    popover.addEventListener('toggle', (event) => {
        if (event.newState === 'closed') {
            // Removes the #hash from the URL when the user closes the popover
            history.replaceState(null, document.title, window.location.pathname + window.location.search);
            
            // OPTIONAL: Reset the slider to the first question when closed
            popover.querySelector('ul').scrollTo({ left: 0 });
        }
    });
});


