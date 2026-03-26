gsap.registerPlugin(MotionPathPlugin);

const collectForm = document.querySelector('.collectbutton');
const plant = document.querySelector('.plant-animated');
const plantIcon = document.querySelector('.collection-icon');

collectForm.addEventListener('submit', function(event) {
    event.preventDefault();

    const iconRect = plantIcon.getBoundingClientRect();
    const plantRect = plant.getBoundingClientRect();

    const targetX = iconRect.left + (iconRect.width / 2) - (plantRect.width / 2);
    const targetY = iconRect.top + (iconRect.height / 2) - (plantRect.height / 2);

    gsap.set(plant, { 
        display: "block",
        position: "fixed",
        top: 0,
        left: 0,
        x: -plantRect.width - 50, 
        y: window.innerHeight / 2, 
        opacity: .6,
        scale: 1.6, 
        rotation: 0,
        visibility: "visible"
    });

    gsap.to(plant, {
        duration: 1.2, 
        opacity: 1,
        scale: 0.2,
        rotation: 45,
        ease: "power2.inOut",
        motionPath: {
            path: [
                { x: window.innerWidth / 3, y: -100 }, 
                { x: targetX, y: targetY } 
            ],
            curviness: 1.5
        },
        onComplete: () => {
            gsap.to(plantIcon, {
                scale: 1.4,
                duration: 0.15,
                yoyo: true,
                repeat: 1,
                ease: "back.out(2)",
                onComplete: () => {
                    collectForm.submit();
                }
            });
        }
    });
});