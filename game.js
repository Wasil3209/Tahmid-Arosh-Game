import * as THREE from 'three';

// Game state
let scene, camera, renderer;
let arosh, tahmid;
let gameRunning = false;
let score = 0;
let bestScore = localStorage.getItem('aroshBest') || 0;
let gameSpeed = 5;
let baseSpeed = 5;
let lane = 1; // 0=left, 1=middle, 2=right
let isJumping = false;
let isSliding = false;
let jumpVelocity = 0;
let jumpHeight = 0;
let slideTimer = 0;
let obstacles = [];
let powerups = [];
let lanePositions = [-2.5, 0, 2.5];
let roadLength = 100;
let roadSegments = [];
let animationId;
let particleSystem;
let scoreInterval;
let speedIncreaseInterval;

// Touch controls
let touchStartX = 0;
let touchStartY = 0;

// Colors
const colors = {
    arosh: 0x3498db,
    tahmid: 0xe74c3c,
    ground: 0x2c3e50,
    track: 0x34495e,
    obstacle: 0x8e44ad,
    powerup: 0xf1c40f
};

// Initialize Three.js scene
function init() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a2a);
    scene.fog = new THREE.FogExp2(0x0a0a2a, 0.008);
    
    // Camera
    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 1, 0);
    
    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);
    
    // Lighting
    setupLights();
    
    // Environment
    createEnvironment();
    
    // Create characters
    createArosh();
    createTahmid();
    
    // Create road
    createRoad();
    
    // Particle system for effects
    createParticleSystem();
    
    // Start animation
    animate();
    
    // Event listeners
    setupControls();
}

function setupLights() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x404040);
    scene.add(ambientLight);
    
    // Directional light (sun)
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 5);
    directionalLight.castShadow = true;
    directionalLight.receiveShadow = true;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
    
    // Fill light from below
    const fillLight = new THREE.PointLight(0x4466cc, 0.3);
    fillLight.position.set(0, -2, 0);
    scene.add(fillLight);
    
    // Back rim light
    const rimLight = new THREE.PointLight(0xffaa66, 0.5);
    rimLight.position.set(0, 3, -5);
    scene.add(rimLight);
}

function createEnvironment() {
    // Ground plane with grid
    const gridHelper = new THREE.GridHelper(200, 40, 0x88aaff, 0x335588);
    gridHelper.position.y = -0.5;
    gridHelper.material.transparent = true;
    gridHelper.material.opacity = 0.5;
    scene.add(gridHelper);
    
    // Create decorative pillars
    for (let i = -50; i <= 50; i += 8) {
        const pillarGeo = new THREE.BoxGeometry(0.5, 4, 0.5);
        const pillarMat = new THREE.MeshStandardMaterial({ color: 0x8e44ad, metalness: 0.7, roughness: 0.3 });
        const leftPillar = new THREE.Mesh(pillarGeo, pillarMat);
        leftPillar.position.set(-5, 1.5, i);
        leftPillar.castShadow = true;
        scene.add(leftPillar);
        
        const rightPillar = new THREE.Mesh(pillarGeo, pillarMat);
        rightPillar.position.set(5, 1.5, i);
        rightPillar.castShadow = true;
        scene.add(rightPillar);
    }
    
    // Add floating particles (dust)
    const particleCount = 200;
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesPositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount; i++) {
        particlesPositions[i*3] = (Math.random() - 0.5) * 30;
        particlesPositions[i*3+1] = Math.random() * 5;
        particlesPositions[i*3+2] = (Math.random() - 0.5) * 100;
    }
    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(particlesPositions, 3));
    const particlesMaterial = new THREE.PointsMaterial({ color: 0x88aaff, size: 0.05 });
    const particles = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particles);
}

function createArosh() {
    const group = new THREE.Group();
    
    // Body
    const bodyGeo = new THREE.BoxGeometry(0.8, 1.2, 0.6);
    const bodyMat = new THREE.MeshStandardMaterial({ color: colors.arosh, emissive: 0x0066aa, emissiveIntensity: 0.2 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.6;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const headGeo = new THREE.SphereGeometry(0.5);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xffaa88 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.2;
    head.castShadow = true;
    group.add(head);
    
    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.1);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.2, 1.35, 0.5);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.2, 1.35, 0.5);
    group.add(rightEye);
    
    // Pupils
    const pupilGeo = new THREE.SphereGeometry(0.05);
    const pupilMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftPupil = new THREE.Mesh(pupilGeo, pupilMat);
    leftPupil.position.set(-0.2, 1.34, 0.55);
    group.add(leftPupil);
    
    const rightPupil = new THREE.Mesh(pupilGeo, pupilMat);
    rightPupil.position.set(0.2, 1.34, 0.55);
    group.add(rightPupil);
    
    // Hair
    const hairGeo = new THREE.CylinderGeometry(0.55, 0.6, 0.2, 8);
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x2c3e50 });
    const hair = new THREE.Mesh(hairGeo, hairMat);
    hair.position.y = 1.5;
    group.add(hair);
    
    // Cape
    const capeGeo = new THREE.BoxGeometry(0.9, 0.8, 0.1);
    const capeMat = new THREE.MeshStandardMaterial({ color: 0xe74c3c });
    const cape = new THREE.Mesh(capeGeo, capeMat);
    cape.position.set(-0.4, 0.8, -0.3);
    group.add(cape);
    
    group.position.set(lanePositions[lane], 0, 0);
    arosh = group;
    scene.add(arosh);
}

function createTahmid() {
    const group = new THREE.Group();
    
    // Body (slightly larger and darker)
    const bodyGeo = new THREE.BoxGeometry(0.9, 1.3, 0.7);
    const bodyMat = new THREE.MeshStandardMaterial({ color: colors.tahmid, emissive: 0x330000, emissiveIntensity: 0.3 });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.65;
    body.castShadow = true;
    group.add(body);
    
    // Head
    const headGeo = new THREE.SphereGeometry(0.55);
    const headMat = new THREE.MeshStandardMaterial({ color: 0xcc8866 });
    const head = new THREE.Mesh(headGeo, headMat);
    head.position.y = 1.3;
    head.castShadow = true;
    group.add(head);
    
    // Angry eyebrows
    const eyebrowGeo = new THREE.BoxGeometry(0.25, 0.08, 0.1);
    const eyebrowMat = new THREE.MeshStandardMaterial({ color: 0x000000 });
    const leftEyebrow = new THREE.Mesh(eyebrowGeo, eyebrowMat);
    leftEyebrow.position.set(-0.25, 1.55, 0.55);
    leftEyebrow.rotation.z = -0.3;
    group.add(leftEyebrow);
    
    const rightEyebrow = new THREE.Mesh(eyebrowGeo, eyebrowMat);
    rightEyebrow.position.set(0.25, 1.55, 0.55);
    rightEyebrow.rotation.z = 0.3;
    group.add(rightEyebrow);
    
    // Eyes (red tint)
    const eyeGeo = new THREE.SphereGeometry(0.12);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff3333 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.25, 1.45, 0.55);
    group.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.25, 1.45, 0.55);
    group.add(rightEye);
    
    group.position.set(0, 0, -15);
    tahmid = group;
    scene.add(tahmid);
}

function createRoad() {
    const roadMat = new THREE.MeshStandardMaterial({ color: colors.ground, roughness: 0.8 });
    
    for (let i = -20; i < 100; i += 2) {
        const segment = new THREE.Mesh(new THREE.BoxGeometry(6, 0.2, 2), roadMat);
        segment.position.set(0, -0.4, i);
        segment.receiveShadow = true;
        scene.add(segment);
        roadSegments.push(segment);
        
        // Add lane markings
        const markingMat = new THREE.MeshStandardMaterial({ color: 0xffdd88 });
        for (let laneIdx = -1; laneIdx <= 1; laneIdx++) {
            const marking = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.1, 0.5), markingMat);
            marking.position.set(laneIdx * 2.5, -0.3, i);
            scene.add(marking);
        }
    }
}

function createParticleSystem() {
    const particleCount = 500;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i*3] = (Math.random() - 0.5) * 20;
        positions[i*3+1] = Math.random() * 3;
        positions[i*3+2] = (Math.random() - 0.5) * 50;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({ color: 0xffaa66, size: 0.08 });
    particleSystem = new THREE.Points(geometry, material);
    scene.add(particleSystem);
}

function createObstacle() {
    const types = [
        { color: 0x8e44ad, height: 1.2, width: 0.8, name: 'pillar' },
        { color: 0xc0392b, height: 0.8, width: 1.2, name: 'barrier' },
        { color: 0x2980b9, height: 1.5, width: 0.6, name: 'statue' }
    ];
    
    const type = types[Math.floor(Math.random() * types.length)];
    const geometry = new THREE.BoxGeometry(type.width, type.height, 0.8);
    const material = new THREE.MeshStandardMaterial({ color: type.color, metalness: 0.5 });
    const obstacle = new THREE.Mesh(geometry, material);
    
    const laneChoice = Math.floor(Math.random() * 3);
    obstacle.position.set(lanePositions[laneChoice], type.height / 2, -30);
    obstacle.castShadow = true;
    obstacle.userData = { lane: laneChoice, height: type.height };
    
    scene.add(obstacle);
    obstacles.push(obstacle);
}

function createPowerup() {
    const geometry = new THREE.SphereGeometry(0.4);
    const material = new THREE.MeshStandardMaterial({ color: colors.powerup, emissive: 0xf1c40f, emissiveIntensity: 0.5 });
    const powerup = new THREE.Mesh(geometry, material);
    
    const laneChoice = Math.floor(Math.random() * 3);
    powerup.position.set(lanePositions[laneChoice], 0.5, -30);
    powerup.castShadow = true;
    powerup.userData = { lane: laneChoice, type: 'speed' };
    
    scene.add(powerup);
    powerups.push(powerup);
}

function updateGame() {
    if (!gameRunning) return;
    
    // Move camera and world
    camera.position.z += gameSpeed * 0.016;
    
    // Update Arosh position based on lane
    arosh.position.x = lanePositions[lane];
    
    // Handle jumping
    if (isJumping) {
        jumpVelocity += 0.3;
        jumpHeight += jumpVelocity;
        arosh.position.y = jumpHeight;
        
        if (arosh.position.y <= 0) {
            arosh.position.y = 0;
            isJumping = false;
            jumpHeight = 0;
            jumpVelocity = 0;
        }
    }
    
    // Handle sliding
    if (isSliding) {
        slideTimer--;
        arosh.scale.y = 0.5;
        arosh.position.y = -0.3;
        if (slideTimer <= 0) {
            isSliding = false;
            arosh.scale.y = 1;
            arosh.position.y = 0;
        }
    }
    
    // Update Tahmid (chaser) - gets faster as score increases
    const tahmidSpeed = gameSpeed * 0.8;
    tahmid.position.z += tahmidSpeed * 0.016;
    
    // Check if Tahmid catches Arosh
    const distance = Math.abs(tahmid.position.z - arosh.position.z);
    if (distance < 1.5 && Math.abs(tahmid.position.x - arosh.position.x) < 1) {
        gameOver();
    }
    
    // Update obstacles
    for (let i = 0; i < obstacles.length; i++) {
        obstacles[i].position.z += gameSpeed * 0.016;
        
        // Check collision
        if (Math.abs(obstacles[i].position.z - arosh.position.z) < 1 &&
            obstacles[i].userData.lane === lane &&
            !isJumping && !isSliding) {
            gameOver();
            return;
        }
        
        // Remove off-screen obstacles
        if (obstacles[i].position.z > 15) {
            scene.remove(obstacles[i]);
            obstacles.splice(i, 1);
            i--;
        }
    }
    
    // Update powerups
    for (let i = 0; i < powerups.length; i++) {
        powerups[i].position.z += gameSpeed * 0.016;
        
        // Collect powerup
        if (Math.abs(powerups[i].position.z - arosh.position.z) < 0.8 &&
            powerups[i].userData.lane === lane) {
            scene.remove(powerups[i]);
            powerups.splice(i, 1);
            score += 100;
            updateScore();
            i--;
        } else if (powerups[i].position.z > 15) {
            scene.remove(powerups[i]);
            powerups.splice(i, 1);
            i--;
        }
    }
    
    // Spawn obstacles and powerups
    if (Math.random() < 0.02 + gameSpeed * 0.002) {
        createObstacle();
    }
    if (Math.random() < 0.01) {
        createPowerup();
    }
    
    // Update road segments
    roadSegments.forEach(segment => {
        segment.position.z += gameSpeed * 0.016;
        if (segment.position.z > 10) {
            segment.position.z -= 30;
        }
    });
    
    // Update particles
    particleSystem.rotation.y += 0.02;
    particleSystem.rotation.x += 0.01;
    
    // Increase difficulty over time
    gameSpeed = baseSpeed + (score / 2000);
    if (gameSpeed > 15) gameSpeed = 15;
    
    // Update UI
    document.getElementById('speed').textContent = gameSpeed.toFixed(1);
}

function updateScore() {
    document.getElementById('score').textContent = Math.floor(score);
}

function startGame() {
    gameRunning = true;
    score = 0;
    gameSpeed = baseSpeed;
    updateScore();
    
    // Clear existing obstacles and powerups
    obstacles.forEach(obs => scene.remove(obs));
    powerups.forEach(pow => scene.remove(pow));
    obstacles = [];
    powerups = [];
    
    // Reset positions
    arosh.position.set(lanePositions[lane], 0, 0);
    tahmid.position.set(0, 0, -15);
    camera.position.set(0, 3, 8);
    
    // Start intervals
    if (scoreInterval) clearInterval(scoreInterval);
    scoreInterval = setInterval(() => {
        if (gameRunning) {
            score += 10;
            updateScore();
        }
    }, 100);
    
    document.getElementById('startScreen').style.display = 'none';
    document.getElementById('gameOverScreen').style.display = 'none';
}

function gameOver() {
    gameRunning = false;
    
    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem('aroshBest', bestScore);
    }
    
    document.getElementById('finalScore').textContent = Math.floor(score);
    document.getElementById('bestScore').textContent = Math.floor(bestScore);
    document.getElementById('gameOverScreen').style.display = 'flex';
    
    if (scoreInterval) clearInterval(scoreInterval);
}

function setupControls() {
    // Keyboard controls
    document.addEventListener('keydown', (e) => {
        if (!gameRunning) return;
        
        switch(e.key) {
            case 'ArrowLeft':
                lane = Math.max(0, lane - 1);
                e.preventDefault();
                break;
            case 'ArrowRight':
                lane = Math.min(2, lane + 1);
                e.preventDefault();
                break;
            case 'ArrowUp':
                if (!isJumping && !isSliding) {
                    isJumping = true;
                    jumpVelocity = -5;
                }
                e.preventDefault();
                break;
            case 'ArrowDown':
                if (!isSliding && !isJumping) {
                    isSliding = true;
                    slideTimer = 20;
                }
                e.preventDefault();
                break;
        }
    });
    
    // Touch controls
    const canvas = renderer.domElement;
    canvas.addEventListener('touchstart', (e) => {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        e.preventDefault();
    });
    
    canvas.addEventListener('touchend', (e) => {
        if (!gameRunning) return;
        
        const endX = e.changedTouches[0].clientX;
        const endY = e.changedTouches[0].clientY;
        const dx = endX - touchStartX;
        const dy = endY - touchStartY;
        
        if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 30) {
            // Horizontal swipe
            if (dx > 0) lane = Math.min(2, lane + 1);
            else lane = Math.max(0, lane - 1);
        } else if (Math.abs(dy) > 30) {
            // Vertical swipe
            if (dy < 0 && !isJumping && !isSliding) {
                isJumping = true;
                jumpVelocity = -5;
            } else if (dy > 0 && !isSliding && !isJumping) {
                isSliding = true;
                slideTimer = 20;
            }
        }
        e.preventDefault();
    });
    
    // Button controls
    document.getElementById('leftBtn').addEventListener('click', () => {
        if (gameRunning) lane = Math.max(0, lane - 1);
    });
    document.getElementById('rightBtn').addEventListener('click', () => {
        if (gameRunning) lane = Math.min(2, lane + 1);
    });
    document.getElementById('jumpBtn').addEventListener('click', () => {
        if (gameRunning && !isJumping && !isSliding) {
            isJumping = true;
            jumpVelocity = -5;
        }
    });
    document.getElementById('slideBtn').addEventListener('click', () => {
        if (gameRunning && !isSliding && !isJumping) {
            isSliding = true;
            slideTimer = 20;
        }
    });
    
    // Start button
    document.getElementById('startBtn').addEventListener('click', startGame);
    document.getElementById('restartBtn').addEventListener('click', startGame);
}

function animate() {
    if (gameRunning) {
        updateGame();
    }
    
    // Animate Tahmid (chasing motion)
    if (tahmid) {
        const time = Date.now() * 0.008;
        tahmid.position.x = Math.sin(time) * 0.5;
        tahmid.rotation.z = Math.sin(time) * 0.2;
    }
    
    // Animate Arosh (running animation)
    if (arosh && gameRunning) {
        const bob = Math.sin(Date.now() * 0.02) * 0.05;
        arosh.position.y += bob;
    }
    
    // Update camera
    if (camera && arosh && gameRunning) {
        const targetX = arosh.position.x * 0.5;
        camera.position.x += (targetX - camera.position.x) * 0.1;
        camera.lookAt(arosh.position.x, 1, arosh.position.z + 3);
    }
    
    renderer.render(scene, camera);
    requestAnimationFrame(animate);
}

// Handle window resize
window.addEventListener('resize', onWindowResize, false);
function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Initialize game
init();
