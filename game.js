const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');

const MAP_SIZE = 16;
let currentLevel = 1;
let gameState = 'START_SCREEN'; // START_SCREEN, PLAYING, GAMEOVER, WIN

const baseMapLayout = [
    "1111111111111111",
    "1000000100000001",
    "1011010101111101",
    "1010010000000101",
    "1011110111100101",
    "1000000100000101",
    "1011110101111101",
    "1010000000000001",
    "1010111111111001",
    "1010100000001001",
    "1000101111001001",
    "1011101001011001",
    "1000001001000001",
    "1111001111011111",
    "1000000000000001",
    "1111111111111111"
];

let islandMap = [];
let player = { x: 1.5, y: 1.5, angle: 0.5, fov: Math.PI / 3, speed: 0.05, isShooting: false, weaponRecoil: 0, ammo: 7 };

// Andy config: Tailored as a tall, lanky 6th-grade boy
let andy = { x: 14.5, y: 14.5, speed: 0.024, state: 'hunting', stunTimer: 0, heightModifier: 1.45, widthModifier: 0.40 };
let batteries = [];
let keys = {};
let score = 0;

function initializeLevel(level) {
    score = 0;
    if(scoreEl) scoreEl.innerText = score;
    if(levelEl) levelEl.innerText = level;
    
    player.x = 1.5; player.y = 1.5; player.angle = 0.5; player.ammo = 7;
    andy.x = 14.5; andy.y = 14.5; andy.state = 'hunting';
    
    // PROGRESSIVE DIFFICULTY: Andy's chase speed gets faster every level!
    andy.speed = 0.022 + (level * 0.005); 

    islandMap = [];
    for(let r = 0; r < MAP_SIZE; r++) {
        let row = [];
        for(let c = 0; c < MAP_SIZE; c++) {
            row.push(parseInt(baseMapLayout[r][c]));
        }
        islandMap.push(row);
    }

    // RANDOM DIFFICULTY: Battery spawn coordinates change location every single level
    batteries = [];
    if (level === 1) {
        batteries = [{x: 1.5, y: 13.5, collected: false}, {x: 13.5, y: 1.5, collected: false}, {x: 8.5, y: 9.5, collected: false}];
    } else if (level === 2) {
        batteries = [{x: 6.5, y: 7.5, collected: false}, {x: 14.5, y: 7.5, collected: false}, {x: 1.5, y: 14.5, collected: false}];
    } else {
        let possiblePositions = [
            {x: 4.5, y: 9.5}, {x: 12.5, y: 13.5}, {x: 14.5, y: 3.5},
            {x: 6.5, y: 1.5}, {x: 1.5, y: 5.5}, {x: 9.5, y: 12.5}
        ];
        for(let i=0; i<3; i++) {
            let index = Math.floor(Math.random() * possiblePositions.length);
            let pos = possiblePositions.splice(index, 1)[0];
            batteries.push({x: pos.x, y: pos.y, collected: false});
        }
    }
}
initializeLevel(currentLevel);
canvas.addEventListener('click', () => {
    if (gameState !== 'PLAYING') return;
    canvas.focus();
    if (!document.pointerLockElement) {
        canvas.requestPointerLock();
    } else {
        if (player.isShooting || player.ammo <= 0) return;
        fireWeapon();
    }
});

document.addEventListener('mousemove', (e) => {
    if (document.pointerLockElement === canvas && gameState === 'PLAYING') {
        player.angle += e.movementX * 0.0025;
    }
});

window.addEventListener('keydown', e => {
    let pressedKey = e.key.toLowerCase();
    keys[pressedKey] = true;
    
    if (e.key === ' ' || e.code === 'Space') {
        e.preventDefault();
        if (gameState === 'START_SCREEN') {
            gameState = 'PLAYING';
            canvas.requestPointerLock();
        } else if (gameState === 'GAMEOVER') {
            currentLevel = 1;
            initializeLevel(currentLevel);
            gameState = 'PLAYING';
            canvas.requestPointerLock();
        } else if (gameState === 'WIN') {
            currentLevel++;
            initializeLevel(currentLevel);
            gameState = 'PLAYING';
            canvas.requestPointerLock();
        }
    }
});
window.addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; });

function fireWeapon() {
    player.isShooting = true;
    player.weaponRecoil = 40;
    player.ammo--;
    
    let dx = andy.x - player.x;
    let dy = andy.y - player.y;
    let angleToAndy = Math.atan2(dy, dx) - player.angle;
    
    while (angleToAndy < -Math.PI) angleToAndy += Math.PI * 2;
    while (angleToAndy > Math.PI) angleToAndy -= Math.PI * 2;
    
    let dist = Math.hypot(dx, dy);
    if (Math.abs(angleToAndy) < 0.15 && dist < 9 && andy.state !== 'stunned') {
        andy.state = 'stunned';
        andy.stunTimer = 150; 
    }
}
function update() {
    if (gameState !== 'PLAYING') return;

    let ax = player.x - andy.x, ay = player.y - andy.y;
    let distToAndy = Math.hypot(ax, ay);

    let activePlayerSpeed = player.speed;
    if (distToAndy < 2.5 && andy.state !== 'stunned') {
        activePlayerSpeed = player.speed * 0.65; // Fear slow-down modifier
    }

    let moveX = 0, moveY = 0;
    if (keys['w']) { moveX += Math.cos(player.angle) * activePlayerSpeed; moveY += Math.sin(player.angle) * activePlayerSpeed; }
    if (keys['s']) { moveX -= Math.cos(player.angle) * activePlayerSpeed; moveY -= Math.sin(player.angle) * activePlayerSpeed; }
    if (keys['a']) { moveX += Math.sin(player.angle) * activePlayerSpeed; moveY -= Math.cos(player.angle) * activePlayerSpeed; }
    if (keys['d']) { moveX -= Math.sin(player.angle) * activePlayerSpeed; moveY += Math.cos(player.angle) * activePlayerSpeed; }

    if (islandMap[Math.floor(player.y)][Math.floor(player.x + moveX)] === 0) player.x += moveX;
    if (islandMap[Math.floor(player.y + moveY)][Math.floor(player.x)] === 0) player.y += moveY;

    if (player.isShooting) {
        player.weaponRecoil -= 4;
        if (player.weaponRecoil <= 0) { player.weaponRecoil = 0; player.isShooting = false; }
    }

    for (let bat of batteries) {
        if (!bat.collected && Math.hypot(player.x - bat.x, player.y - bat.y) < 0.45) {
            bat.collected = true;
            score++;
            if(scoreEl) scoreEl.innerText = score;
            if (score === 3) {
                gameState = 'WIN';
                document.exitPointerLock();
                return;
            }
        }
    }

    if (andy.state === 'stunned') {
        andy.stunTimer--;
        if (andy.stunTimer <= 0) andy.state = 'hunting';
    } else {
        let activeAndySpeed = andy.speed;
        if (distToAndy < 2.5) activeAndySpeed = andy.speed * 1.60; // Behind you sprint velocity boost!

        let ang = Math.atan2(ay, ax);
        let nax = andy.x + Math.cos(ang) * activeAndySpeed;
        let nay = andy.y + Math.sin(ang) * activeAndySpeed;
        if (islandMap[Math.floor(andy.y)][Math.floor(nax)] === 0) andy.x = nax;
        if (islandMap[Math.floor(nay)][Math.floor(andy.x)] === 0) andy.y = nay;
    }

    if (distToAndy < 0.38) {
        gameState = 'GAMEOVER';
        document.exitPointerLock();
        return;
    }
}
function draw() {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (gameState === 'START_SCREEN') {
        ctx.fillStyle = '#100a05'; ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Custom 2D Illustration painting a lanky, tall 6th-grade kid shape
        ctx.fillStyle = '#050508'; ctx.fillRect(320, 150, 160, 300);
        ctx.fillStyle = '#e5cbbd'; ctx.fillRect(370, 180, 60, 60); 
        ctx.fillStyle = '#ffffff'; ctx.fillRect(385, 205, 6, 4); ctx.fillRect(410, 205, 6, 4); // Glowing eyes
        ctx.fillStyle = '#1a1a24'; ctx.fillRect(340, 240, 120, 210); // Tall hoodie frame build

        ctx.fillStyle = '#ff1111'; ctx.font = 'bold 36px Courier New'; ctx.textAlign = 'center';
        ctx.fillText("ANDY'S FACTORY", canvas.width / 2, 90);
        
        ctx.fillStyle = '#ffffff'; ctx.font = '14px Courier New';
        ctx.fillText("Andy is a tall, lanky 6th grader stalking the wooden corridors.", canvas.width / 2, 480);
        ctx.fillText("Find all 3 hidden batteries. When he screams right behind you, DON'T PANIC.", canvas.width / 2, 510);
        
        ctx.fillStyle = '#00ffff'; ctx.font = 'bold 18px Courier New';
        ctx.fillText("PRESS [SPACEBAR] TO DEPLOY TACTICAL OPERATOR", canvas.width / 2, 560);
        return;
    }

    if (gameState === 'GAMEOVER') {
        ctx.fillStyle = '#ff1111'; ctx.font = 'bold 36px Courier New'; ctx.textAlign = 'center';
        ctx.fillText("ANDY CAUGHT YOU", canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = '#ffffff'; ctx.font = '16px Courier New';
        ctx.fillText(`Failed on Escape Level ${currentLevel}`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText("PRESS [SPACEBAR] TO RESTART ENTIRE MISSION", canvas.width / 2, canvas.height / 2 + 60);
        return;
    }

    if (gameState === 'WIN') {
        ctx.fillStyle = '#00ff66'; ctx.font = 'bold 36px Courier New'; ctx.textAlign = 'center';
        ctx.fillText("FACTORY ESCAPED!", canvas.width / 2, canvas.height / 2 - 20);
        ctx.fillStyle = '#ffffff'; ctx.font = '16px Courier New';
        ctx.fillText(`Level ${currentLevel} cleared. Next deployment will be much harder.`, canvas.width / 2, canvas.height / 2 + 20);
        ctx.fillText("PRESS [SPACEBAR] FOR NEXT LOCATIONS LEVEL", canvas.width / 2, canvas.height / 2 + 60);
        return;
    }

    // --- 3D FIRST-PERSON GRAPHICS RENDERING SYSTEM ---
    ctx.fillStyle = '#050c05'; ctx.fillRect(0, 0, canvas.width, canvas.height / 2);
    ctx.fillStyle = '#140f0b'; ctx.fillRect(0, canvas.height / 2, canvas.width, canvas.height / 2);

    let depthBuffer = [];
    const numRays = canvas.width;
    for (let i = 0; i < numRays; i++) {
        let rayAngle = (player.angle - player.fov / 2) + (i / numRays) * player.fov;
        let distanceToWall = 0; let hitWall = false;
        let eyeX = Math.cos(rayAngle), eyeY = Math.sin(rayAngle);

        while (!hitWall && distanceToWall < 16) {
            distanceToWall += 0.035;
            let checkX = Math.floor(player.x + eyeX * distanceToWall);
            let checkY = Math.floor(player.y + eyeY * distanceToWall);
            if (checkX < 0 || checkX >= MAP_SIZE || checkY < 0 || checkY >= MAP_SIZE) {
                hitWall = true; distanceToWall = 16;
            } else if (islandMap[checkY][checkX] > 0) {
                hitWall = true;
            }
        }

        let correctedDist = distanceToWall * Math.cos(rayAngle - player.angle);
        depthBuffer.push(correctedDist);

        let ceiling = (canvas.height / 2) - (canvas.height / correctedDist);
        let floor = canvas.height - ceiling;
        let wallHeight = floor - ceiling;
        let brightness = Math.max(0, 1 - (correctedDist / 12));

        // Wood Texture Renderer
        ctx.fillStyle = `rgba(110, 65, 40, ${brightness})`; ctx.fillRect(i, ceiling, 1, wallHeight);
        ctx.fillStyle = `rgba(45, 25, 15, ${brightness * 1.3})`; if (i % 35 === 0) ctx.fillRect(i, ceiling, 1, wallHeight);
        if (Math.floor(ceiling + wallHeight) % 18 < 2) {
            ctx.fillStyle = `rgba(55, 30, 18, ${brightness * 0.7})`; ctx.fillRect(i, ceiling, 1, wallHeight);
        }
    }

    let sprites = [];
    for (let bat of batteries) { if (!bat.collected) sprites.push({ x: bat.x, y: bat.y, type: 'battery' }); }
    sprites.push({ x: andy.x, y: andy.y, type: 'andy' });
    sprites.sort((a, b) => Math.hypot(player.x - b.x, player.y - b.y) - Math.hypot(player.x - a.x, player.y - a.y));

    sprites.forEach(sprite => {
        let sx = sprite.x - player.x, sy = sprite.y - player.y;
        let spriteAngle = Math.atan2(sy, sx) - player.angle;
        while (spriteAngle < -Math.PI) spriteAngle += Math.PI * 2;
        while (spriteAngle > Math.PI) spriteAngle -= Math.PI * 2;
        let dist = Math.hypot(sx, sy);
        if (dist < 0.15 || Math.abs(spriteAngle) > player.fov) return;

        let spriteSize = Math.abs(canvas.height / dist);
        let spriteScreenX = (canvas.width / 2) + (Math.tan(spriteAngle) * (canvas.width / 2)) - (spriteSize / 2);
        let spriteScreenY = (canvas.height / 2) - (spriteSize / 2);
        let alpha = Math.max(0, 1 - (dist / 11));

        if (sprite.type === 'andy') {
            let tallHeight = spriteSize * andy.heightModifier;
            let narrowWidth = spriteSize * andy.widthModifier;
            let tallScreenY = (canvas.height / 2) - (tallHeight / 1.6);
            let adjustedScreenX = (canvas.width / 2) + (Math.tan(spriteAngle) * (canvas.width / 2)) - (narrowWidth / 2);

            for (let col = 0; col < narrowWidth; col++) {
                let pixelX = Math.floor(adjustedScreenX + col);
                if (pixelX >= 0 && pixelX < canvas.width && depthBuffer[pixelX] > dist) {
                    ctx.fillStyle = andy.state === 'stunned' ? `rgba(0, 180, 255, ${alpha * 0.8})` : `rgba(25, 25, 35, ${alpha})`;
                    ctx.fillRect(pixelX, tallScreenY, 1, tallHeight);
                    ctx.fillStyle = `rgba(215, 195, 185, ${alpha})`;
                    ctx.fillRect(adjustedScreenX + (narrowWidth * 0.35), tallScreenY + (tallHeight * 0.05), narrowWidth * 0.3, tallHeight * 0.15);
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(adjustedScreenX + (narrowWidth * 0.42), tallScreenY + (tallHeight * 0.09), narrowWidth * 0.06, tallHeight * 0.02);
                    ctx.fillRect(adjustedScreenX + (narrowWidth * 0.54), tallScreenY + (tallHeight * 0.09), narrowWidth * 0.06, tallHeight * 0.02);
                }
            }
        } else {
            for (let col = 0; col < spriteSize; col++) {
                let pixelX = Math.floor(spriteScreenX + col);
                if (pixelX >= 0 && pixelX < canvas.width && depthBuffer[pixelX] > dist) {
                    ctx.fillStyle = `rgba(240, 240, 10, ${alpha})`; ctx.fillRect(pixelX, spriteScreenY + (spriteSize * 0.35), 1, spriteSize * 0.35);
                }
            }
        }
    });

    let lightGrad = ctx.createRadialGradient(canvas.width / 2, canvas.height / 2, 20, canvas.width / 2, canvas.height / 2, 320);
    lightGrad.addColorStop(0, 'rgba(255,255,235,0.06)'); lightGrad.addColorStop(0.5, 'rgba(0,0,0,0.55)'); lightGrad.addColorStop(1, 'rgba(0,0,0,0.98)');
    ctx.fillStyle = lightGrad; ctx.fillRect(0, 0, canvas.width, canvas.height);

    let statsEl = document.getElementById('stats');
    let ax = player.x - andy.x, ay = player.y - andy.y;
    let distToAndy = Math.hypot(ax, ay);
    if (andy.state === 'stunned' && statsEl) {
        statsEl.innerHTML = `Batteries: <span id="score">${score}</span>/3 | <span style="color:#00ffff;">STUNNED!</span>`;
    } else if (distToAndy < 2.5 && statsEl) {
        statsEl.innerHTML = `Batteries: <span id="score">${score}</span>/3 | <span style="color:#ff1111; font-weight:bold;">HE'S BEHIND YOU!</span>`;
    } else if (statsEl) {
        statsEl.innerHTML = `Batteries: <span id="score">${score}</span>/3 | Escape Level: <span id="level">${currentLevel}</span>`;
    }

    ctx.fillStyle = 'rgba(0, 255, 100, 0.7)'; ctx.fillRect(canvas.width / 2 - 2, canvas.height / 2 - 2, 4, 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.2)'; ctx.lineWidth = 1.5; ctx.strokeRect(canvas.width / 2 - 12, canvas.height / 2 - 12, 24, 24);

    ctx.save();
    let gunX = canvas.width / 2 + 90; let gunY = canvas.height - 130 - player.weaponRecoil;
    ctx.fillStyle = '#141518'; ctx.fillRect(gunX, gunY, 40, 150);
    ctx.fillStyle = '#0a0a0d'; ctx.fillRect(gunX - 65, gunY + 5, 110, 32);
    if (player.isShooting && player.weaponRecoil > 25) {
        let flashGrad = ctx.createRadialGradient(gunX - 65, gunY + 21, 2, gunX - 65, gunY + 21, 55);
        flashGrad.addColorStop(0, '#ffffff'); flashGrad.addColorStop(0.2, '#ffaa00'); flashGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = flashGrad; ctx.beginPath(); ctx.arc(gunX - 65, gunY + 21, 55, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
}

function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();
