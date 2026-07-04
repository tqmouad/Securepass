/**
 * ============================================================================
 * SecurePass - Cyber Background
 * Lightweight Canvas Network
 * ============================================================================
 */

const canvas = document.getElementById("cyber-bg");

if (!canvas) {
    throw new Error("Canvas #cyber-bg not found.");
}

const ctx = canvas.getContext("2d");

const prefersReducedMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
).matches;

if (prefersReducedMotion) {
    canvas.style.display = "none";
} else {

    // Everything else goes here

}

let width;
let height;

const mouse = {
    x: null,
    y: null,
    radius: 140
};

const NODE_COUNT = 55;
const MAX_DISTANCE = 140;

const nodes = [];

resize();

window.addEventListener("resize", resize);

window.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
});

window.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
});

document.addEventListener("visibilitychange", () => {
    if (!document.hidden) animate();
});

class Node {

    constructor() {

        this.x = Math.random() * width;
        this.y = Math.random() * height;

        this.vx = (Math.random() - 0.5) * 0.25;
        this.vy = (Math.random() - 0.5) * 0.25;

        this.radius = 2 + Math.random() * 1.5;

    }

    update() {

        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        if (mouse.x !== null) {

            const dx = this.x - mouse.x;
            const dy = this.y - mouse.y;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < mouse.radius) {

                this.x += dx * 0.01;
                this.y += dy * 0.01;

            }

        }

    }

    draw() {

        ctx.beginPath();

        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        ctx.fillStyle = "rgba(79,142,247,.85)";

        ctx.fill();

    }

}

function resize() {

    width = window.innerWidth;
    height = window.innerHeight;

    canvas.width = width * devicePixelRatio;
    canvas.height = height * devicePixelRatio;

    canvas.style.width = width + "px";
    canvas.style.height = height + "px";

    ctx.setTransform(devicePixelRatio,0,0,devicePixelRatio,0,0);

}

function createNodes() {

    nodes.length = 0;

    for (let i = 0; i < NODE_COUNT; i++) {

        nodes.push(new Node());

    }

}

function connectNodes() {

    for (let i = 0; i < nodes.length; i++) {

        for (let j = i + 1; j < nodes.length; j++) {

            const dx = nodes[i].x - nodes[j].x;
            const dy = nodes[i].y - nodes[j].y;

            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < MAX_DISTANCE) {

                const opacity = 1 - distance / MAX_DISTANCE;

                ctx.beginPath();

                ctx.moveTo(nodes[i].x, nodes[i].y);

                ctx.lineTo(nodes[j].x, nodes[j].y);

                ctx.strokeStyle = `rgba(79,142,247,${opacity * 0.18})`;

                ctx.lineWidth = 1;

                ctx.stroke();

            }

        }

    }

}

let animationFrame;

function animate() {

    cancelAnimationFrame(animationFrame);

    ctx.clearRect(0,0,width,height);

    nodes.forEach(node => {

        node.update();

        node.draw();

    });

    connectNodes();

    animationFrame = requestAnimationFrame(animate);

}

createNodes();

animate();