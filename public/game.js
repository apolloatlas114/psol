// ===================== PART 1 =====================
// --- Imports ---
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';
import { ejectMass, updateEjectedMass, checkEjectedMassCollision } from './js/ejectMass.js';
import { shootLaser, updateLasers, playerLasers } from './js/laserShots.js';
import { socket } from './multiplayer.js';

// --- Global Variables & Clock ---
const clock = new THREE.Clock();
let players = [];         // Array to hold player meshes
let foodProjectiles = [];
let splitCooldown = 10000; // in ms
let lastSplitTime = 0;
let canSplit = true;
let endTime = Date.now() + 20 * 60 * 1000; // 20-minute timer

// Movement variables
let moveSpeed = 20;
let baseSpeed = 20;
let targetPosition = null;
let lastMouseTime = Date.now();
let mouseIsMoving = false;
let moveDirection = new THREE.Vector3(1, 0, 0);

// --- Socket Listeners ---
socket.on("updateScore", ({ id, score }) => {
    if (players[id]) {
        players[id].score = score;
    }
    updateHUD();
});

socket.on("updateLeaderboard", (leaderboard) => {
    console.log("📊 Received leaderboard update:", leaderboard);
    const leaderboardElement = document.getElementById("leaderboard-list");
    leaderboardElement.innerHTML = "";
    leaderboard.forEach((player, index) => {
        const listItem = document.createElement("li");
        if (player.name && player.name.trim() !== "") {
            listItem.innerHTML = `#${index + 1}: <span class="player-name">${player.name}</span> - <span class="player-score">${Math.floor(player.score)}</span>`;
        } else {
            listItem.innerHTML = `#${index + 1}: <span class="player-name">UNKNOWN</span> - <span class="player-score">${Math.floor(player.score)}</span>`;
        }
        if (player.id === socket.id) {
            listItem.classList.add("current-player");
        }
        leaderboardElement.appendChild(listItem);
    });
    console.log("✅ Leaderboard updated successfully!");
});

// ===================== PART 2 =====================
// --- Scene & Renderer Setup ---
const scene = new THREE.Scene();
console.log('✅ Scene successfully created!');
console.log('✅ THREE.js loaded:', THREE);

let renderer;
function initRenderer() {
    renderer = new THREE.WebGLRenderer({ 
        powerPreference: "high-performance", 
        antialias: false,
        alpha: false
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.toneMappingExposure = 1;
    document.body.appendChild(renderer.domElement);
}
initRenderer();

// --- Camera Setup ---
const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 50000);
camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);
console.log('✅ Camera created:', camera);

// --- Camera Rotation Variables ---
let cameraYaw = 0;
const cameraRotateSpeed = 0.03;
let rotatingLeft = false;
let rotatingRight = false;


// ===================== PART 3 =====================
// --- Grid & Map ---
const gridSize = 100000;
const gridMaterial = new THREE.LineBasicMaterial({
    color: 0x001100,
    linewidth: 5,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
});
const gridHelper = new THREE.GridHelper(gridSize, 300);
gridHelper.material = gridMaterial;
gridHelper.position.y = -10;
gridHelper.renderOrder = 1;
scene.add(gridHelper);

// --- Ambient Light ---
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// --- Ground Texture & Material ---
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load('textures/platform1.jpg', (texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(40, 40);
    texture.colorSpace = THREE.SRGBColorSpace;
});
const groundMaterial = new THREE.MeshStandardMaterial({
    map: groundTexture,
    side: THREE.DoubleSide,
    roughness: 20,
    metalness: 0.0,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0.0
});
const groundGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -35;
ground.receiveShadow = true;
scene.add(ground);

// --- Player Texture ---
const playerTexture = textureLoader.load('textures/playerSkinredalien1.png', (texture) => {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, 1);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.flipY = false;
    texture.needsUpdate = true;
    texture.center.set(0.5, 0.5);
});

// --- Scene Traverse ---
scene.traverse((child) => {
    if (child.isMesh) {
        child.frustumCulled = true;
    }
});

// ===================== PART 4 =====================
// --- InstancedMesh for Players ---
const playerGeometry = new THREE.PlaneGeometry(50, 50);
const uvs = playerGeometry.attributes.uv.array;
uvs[0] = 0.0; uvs[1] = 1.0;
uvs[2] = 1.0; uvs[3] = 1.0;
uvs[4] = 1.0; uvs[5] = 0.0;
uvs[6] = 0.0; uvs[7] = 0.0;
playerGeometry.attributes.uv.needsUpdate = true;

const playerMaterial = new THREE.MeshStandardMaterial({
    map: playerTexture,
    transparent: true,
    metalness: 0.0,
    roughness: 0.3,
    emissive: new THREE.Color(0x000000),
    emissiveIntensity: 0.0
});

const maxPlayers = 500;
const playerMesh = new THREE.InstancedMesh(playerGeometry, playerMaterial, maxPlayers);
scene.add(playerMesh);

function updatePlayers() {
    const matrix = new THREE.Matrix4();
    players.forEach((player, index) => {
        matrix.setPosition(player.position.x, player.position.y, player.position.z);
        playerMesh.setMatrixAt(index, matrix);
    });
    playerMesh.instanceMatrix.needsUpdate = true;
}

// --- createPlayer Function (with optional skin) ---
export function createPlayer(size, position, isSplit = false, skin) {
    const materialOptions = {
        map: skin ? textureLoader.load(skin) : playerTexture,
        transparent: true,
        metalness: 0.1,
        roughness: 0.3,
        emissive: new THREE.Color(0, 0, 0),
        emissiveIntensity: 0,
        side: THREE.DoubleSide,
    };
    const dynamicMaterial = new THREE.MeshStandardMaterial(materialOptions);
    
    const scaleFactor = 2.5;
    const playerGeom = new THREE.PlaneGeometry(size * scaleFactor, size * scaleFactor);
    playerGeom.translate(0, size * 0.75, 0);
    
    const mesh = new THREE.Mesh(playerGeom, dynamicMaterial);
    mesh.position.copy(position);
    mesh.position.y += 2;
    mesh.size = size;
    mesh.rotation.x = -Math.PI / 2;
    mesh.isSplit = isSplit;
    mesh.renderOrder = -1;
    
    scene.add(mesh);
    players.push(mesh);
    return mesh;
}

// --- Food Particles Setup ---
const foodCount = 10000;
const foodSize = 15;
const foodHeight = -30;
const foodMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0.3, 0.9, 1),
    roughness: 0.05,
    metalness: 0.6,
    transmission: 0.95,
    thickness: 8,
    clearcoat: 1,
    clearcoatRoughness: 0.05,
    emissive: new THREE.Color(0.2, 0.5, 1),
    emissiveIntensity: 0.8,
});
const foodGeometry = new THREE.IcosahedronGeometry(foodSize, 2);
const foodMesh = new THREE.InstancedMesh(foodGeometry, foodMaterial, foodCount);
let foodPositions = new Map();

function spawnFood() {
    for (let i = 0; i < foodCount; i++) {
        const pos = new THREE.Vector3(
            Math.random() * gridSize - gridSize / 2,
            foodHeight,
            Math.random() * gridSize - gridSize / 2
        );
        foodPositions.set(i, pos);
        const matrix = new THREE.Matrix4().setPosition(pos);
        foodMesh.setMatrixAt(i, matrix);
    }
    foodMesh.instanceMatrix.needsUpdate = true;
    scene.add(foodMesh);
}
setTimeout(spawnFood, 1000);

// --- Load Players from Lobby Data ---
function loadPlayersFromLobby() {
    const data = localStorage.getItem("gameData");
    if (!data) {
        console.error("No game data found. Cannot load players.");
        return;
    }
    try {
        const gameData = JSON.parse(data);
        const playersData = gameData.players;
        players = [];
        playersData.forEach((p) => {
            // Create a player using the data (size, x, and skin)
            createPlayer(p.size || 40, new THREE.Vector3(p.x, 40, p.z), false, p.skin);
        });
    } catch (err) {
        console.error("Error parsing gameData:", err);
    }
}
window.addEventListener("DOMContentLoaded", loadPlayersFromLobby);


// ===================== PART 5 =====================
// --- Update Growth & Camera ---
function updateGrowth() {
    for (let player of players) {
        player.scale.setScalar(player.size / 40);
        let baseHeight = 500;
        let zoomFactor = 50;
        let maxZoomOut = 1500;
        let newHeight = baseHeight + Math.min(player.size * zoomFactor, maxZoomOut);
        camera.position.y = newHeight;
        // Recalculate player's world position
        player.getWorldPosition(player.position);
        camera.position.copy(player.position).add(new THREE.Vector3(0, 1000, 1500));
        camera.lookAt(player.position);
    }
}

// --- Placeholder Functions ---
// Define basic versions for missing functions

function updatePlayerMovement() {
    // TODO: Implement your player movement logic here.
    // For now, we'll simply log that the function is called.
    // You can update player positions based on input or physics.
    // Example: players[0].position.x += moveSpeed * clock.getDelta();
}

function checkFoodCollision() {
    // TODO: Implement collision detection between players and food particles.
    // Placeholder: log collision check.
    // You might iterate over players and check distances to food positions.
}

function checkProjectileCollision() {
    // TODO: Implement collision detection for projectiles.
    // Placeholder: log projectile collision check.
}

function updateHUD() {
    // Update the HUD elements, e.g., score and timer.
    const scoreElement = document.getElementById('scoreCounter');
    if (players.length > 0 && scoreElement) {
        scoreElement.innerText = Math.floor(players[0].size);
    }
}

// --- Main Animate Loop ---
function animate() {
    requestAnimationFrame(animate);
    if (!renderer) return;

    const delta = clock.getDelta();

    updatePlayerMovement();
    updateLasers(scene, players);
    updateEjectedMass();
    checkEjectedMassCollision(players, scene);
    updateGrowth();

    if (playerMaterial) {
        playerMaterial.map.rotation += 0.02;
    }

    checkFoodCollision();
    // Removed mergePlayers() as per your instruction.
    checkProjectileCollision();

    // HUD & Leaderboard Updates
    let remainingTime = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    let minutes = Math.floor(remainingTime / 60);
    let seconds = remainingTime % 60;
    const timerElement = document.getElementById('timer');
    if (timerElement) {
        timerElement.innerText = `Time: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    }

    // Update leaderboard based on players' sizes
    const leaderboardElement = document.getElementById('leaderboard-list');
    if (leaderboardElement) {
        let sortedPlayers = players.slice().sort((a, b) => b.size - a.size).slice(0, 10);
        leaderboardElement.innerHTML = sortedPlayers.map((p, i) =>
            `<li>#${i + 1}: Score ${Math.floor(p.size)}</li>`
        ).join('');
    }

    players.forEach(player => {
        let distance = camera.position.distanceTo(player.position);
        player.visible = (distance <= 5000);
        playerLasers.set(player, 3);
    });

    renderer.render(scene, camera);
}
animate();

// --- Keydown Event Listeners ---
document.addEventListener('keydown', (event) => {
    if (event.key === 'e' && players.length > 0) {
        shootLaser(players[0], scene, targetPosition);
    }
});
document.addEventListener('keydown', (event) => {
    if (event.key === 'w' && players.length > 0) {
        ejectMass(players[0], scene, foodMaterial);
    }
});

// --- FBXLoader Import and Example Model Loading ---
import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@latest/examples/jsm/loaders/FBXLoader.js';
const loader = new FBXLoader();

// Example loadObject function (adjust paths and settings as needed)
function loadObject(path, scale, position, isRunestone = false) {
    loader.load(path, function (fbx) {
        fbx.scale.set(scale, scale, scale);
        fbx.position.copy(position);
        fbx.updateMatrixWorld(true);
        fbx.traverse((child) => {
            if (child.isMesh) {
                if (isRunestone && child.name.toLowerCase().includes("crystal")) {
                    child.material = new THREE.MeshPhysicalMaterial({
                        map: textureLoader.load('textures/Diffuse_cristal.jpg'),
                        normalMap: textureLoader.load('textures/Normal_cristal.jpg'),
                        emissiveMap: textureLoader.load('textures/Emission_cristal.jpg'),
                        emissive: new THREE.Color(0.3, 0.8, 1),
                        emissiveIntensity: 50.0,
                        roughness: 0.1,
                        metalness: 0.2,
                        transmission: 10.9,
                        thickness: 10,
                        clearcoat: 1,
                        clearcoatRoughness: 0.1,
                        transparent: true
                    });
                } else {
                    child.material = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(0.3, 0.9, 1),
                        roughness: 0.2,
                        metalness: 0.1,
                        emissive: new THREE.Color(0.3, 0.9, 1),
                        emissiveIntensity: 0.6
                    });
                }
                child.castShadow = true;
                child.receiveShadow = true;
            }
        });
        scene.add(fbx);
        console.log(`✅ Object Loaded: ${path} at`, fbx.position);
    }, undefined, function (error) {
        console.error('❌ Error loading FBX:', error);
    });
}

// Uncomment to call placeStaticObjects if desired
// placeStaticObjects();


