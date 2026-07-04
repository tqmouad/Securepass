const PASSWORDS = [
    "vR8#kP!29Lm$Qa",
    "nZ4@Px8!Tb9%Kr",
    "R3^Lp7@XwQ9#Dn",
    "mF9!Qr2$Ty7@Js"
];

const STATUS = [
    "Initializing entropy...",
    "Mixing character sets...",
    "Generating password...",
    "AES-256 Ready ✓"
];

const password = document.getElementById("hero-password");
const status = document.getElementById("terminal-status");
const terminal = document.querySelector(".terminal");

if (password) start();

function sleep(ms){
    return new Promise(r=>setTimeout(r,ms));
}

async function type(text){

    password.textContent="";

    for(const ch of text){

        password.textContent+=ch;

        if("@#$%^&*!".includes(ch)){
            await sleep(130);
        }

        await sleep(45+Math.random()*45);

    }

}

async function erase(){

    while(password.textContent.length){

        password.textContent=password.textContent.slice(0,-1);

        await sleep(22);

    }

}

async function glow(){

    terminal.classList.add("success");

    await sleep(600);

    terminal.classList.remove("success");

}

async function animateStatus(){

    for(const s of STATUS){

        status.style.opacity=0;

        await sleep(180);

        status.textContent=s;

        status.style.opacity=1;

        await sleep(650);

    }

}

async function start(){

    let i=0;

    while(true){

        await animateStatus();

        await type(PASSWORDS[i]);

        await glow();

        await sleep(1600);

        await erase();

        status.textContent="Initializing entropy...";

        await sleep(350);

        i=(i+1)%PASSWORDS.length;

    }

}