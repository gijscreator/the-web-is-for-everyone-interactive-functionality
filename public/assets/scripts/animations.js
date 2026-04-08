document.addEventListener("DOMContentLoaded", () => {

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) return;

    const urlParams = new URLSearchParams(window.location.search);
    const isCorrect = urlParams.get('step') === 'correct' && !urlParams.get('step')?.includes('incorrect');
    const leafCanvas = document.getElementById("leafCanvas");
    const collectForm = document.querySelector('.collectbutton');

    if (isCorrect || leafCanvas || collectForm) {
        gsap.registerPlugin(MotionPathPlugin);
    }

    // 3. Conditional Initialization
    if (collectForm) {
        initCollectAnimation(collectForm);
    }

    if (isCorrect) {
        initConfetti();
    }

    if (leafCanvas) {
        initLeafFalling(leafCanvas);
    }
});


function initCollectAnimation(form) {
    const plant = document.querySelector('.plant-animated');
    const plantIcon = document.querySelector('.collection-icon');
    if (!plant || !plantIcon) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const iconRect = plantIcon.getBoundingClientRect();
        const plantRect = plant.getBoundingClientRect();
        const targetX = iconRect.left + (iconRect.width / 2) - (plantRect.width / 2);
        const targetY = iconRect.top + (iconRect.height / 2) - (plantRect.height / 2);

        gsap.set(plant, { 
            display: "block", position: "fixed", top: 0, left: 0,
            x: -plantRect.width - 50, y: window.innerHeight / 2, 
            opacity: .6, scale: 1.6, visibility: "visible"
        });

        gsap.to(plant, {
            duration: 1.2, opacity: 1, scale: 0.2, rotation: 45, ease: "power2.inOut",
            motionPath: {
                path: [{ x: window.innerWidth / 3, y: -100 }, { x: targetX, y: targetY }],
                curviness: 1.5
            },
            onComplete: () => {
                gsap.to(plantIcon, {
                    scale: 1.4, duration: 0.15, yoyo: true, repeat: 1, ease: "back.out(2)",
                    onComplete: () => form.submit()
                });
            }
        });
    });
}

function initLeafFalling(canvas) {
    const ctx = canvas.getContext("2d");
    const leafImg = new Image();
    leafImg.src = "/assets/images/leaf.webp"; 

    let width, height, leaves = [];
    const leafCount = 40;

    const resize = () => {
        width = canvas.width = window.innerWidth;
        height = canvas.height = window.innerHeight;
    };
    
    window.addEventListener("resize", resize, { passive: true });
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

            gsap.to(leaf, {
                y: height + 100, duration: gsap.utils.random(4, 8),
                repeat: -1, ease: "none", delay: gsap.utils.random(0, 0.5)
            });

            gsap.to(leaf, {
                sideSway: "+=50", rotation: "+=180", duration: gsap.utils.random(2, 4),
                repeat: -1, yoyo: true, ease: "sine.inOut"
            });

            leaves.push(leaf);
        }
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
            ctx.drawImage(leafImg, -20, -20, 40, 40);
            ctx.restore();
        });
    }
}

function initConfetti() {

    const duration = 3000;
    const animationEnd = Date.now() + duration;
    const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

    const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) return clearInterval(interval);

        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.2 + 0.1, y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.2 + 0.7, y: Math.random() - 0.2 } });
    }, 250);
}