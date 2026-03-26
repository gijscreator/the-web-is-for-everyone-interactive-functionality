gsap.registerPlugin(MotionPathPlugin);

/* ------------ Animate plant in collection --------------- */

const collectForm = document.querySelector('.collectbutton');
const plant = document.querySelector('.plant-animated');
const plantIcon = document.querySelector('.collection-icon');

if (collectForm && plant && plantIcon) {
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
            visibility: "visible"
        });

        gsap.to(plant, {
            duration: 1.2, 
            opacity: 1,
            scale: 0.2,
            rotation: 45,
            ease: "power2.inOut",
            motionPath: {
                path: [{ x: window.innerWidth / 3, y: -100 }, { x: targetX, y: targetY }],
                curviness: 1.5
            },
            onComplete: () => {
                gsap.to(plantIcon, {
                    scale: 1.4, duration: 0.15, yoyo: true, repeat: 1, ease: "back.out(2)",
                    onComplete: () => collectForm.submit()
                });
            }
        });
    });
}

/* ------------ Animate plant in collection --------------- */



/* ------------ Animate leafes when quest is wrong --------------- */

window.addEventListener("load", () => {
    const canvas = document.getElementById("leafCanvas");
    const ctx = canvas.getContext("2d");
    const leafImg = new Image();
    leafImg.src = "/assets/images/leaf.webp";

    let width, height, leaves = [];
    const leafCount = 40;

    function resize() {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    }

    window.addEventListener("resize", resize);
    resize();

    leafImg.onload = () => {
        for (let i = 0; i < leafCount; i++) {
            const leaf = {
                x: Math.random() * width,
                y: Math.random() * -height,
                rotation: Math.random() * 360,
                scale: gsap.utils.random(0.4, 1),
                opacity: gsap.utils.random(0.3, 0.8),
                sideSway: Math.random() * 100
            };

            // Main Falling Animation
            gsap.to(leaf, {
                y: height + 100,
                duration: gsap.utils.random(4, 8),
                repeat: -1,
                ease: "none",
                delay: gsap.utils.random(0, 10)
            });

            // Swaying
            gsap.to(leaf, {
                sideSway: "+=50",
                rotation: "+=180",
                duration: gsap.utils.random(2, 4),
                repeat: -1,
                yoyo: true,
                ease: "sine.inOut"
            });

            leaves.push(leaf);
        }
        
        // Use GSAP's ticker to draw (it's synced with the browser's refresh rate)
        gsap.ticker.add(render);
    };

    function render() {
        ctx.clearRect(0, 0, width, height);
        
        leaves.forEach(leaf => {
            ctx.save();
            ctx.globalAlpha = leaf.opacity;
            ctx.translate(leaf.x + leaf.sideSway, leaf.y);
            ctx.rotate(leaf.rotation * Math.PI / 180);
            ctx.scale(leaf.scale, leaf.scale);
            ctx.drawImage(leafImg, -20, -20, 40, 40); // center the image draw
            ctx.restore();
        });
    }
});

/* ------------ Animate leafes when quest is wrong --------------- */

window.addEventListener("load", () => {
    // Check if the URL contains "correct"
    const url = window.location.search;
    
    if (url.includes("step=correct") && !url.includes("incorrect")) {
        
        const duration = 3 * 1000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        // Create a continuous "celebration" for 3 seconds
        const interval = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);
            
            // Trigger from left side
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 }
            });
            
            // Trigger from right side
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 }
            });
        }, 250);
    }
});

/* ------------ Animate confetti when quest is right --------------- */


