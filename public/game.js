// ✅ Import Three.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';



const clock = new THREE.Clock(); // ✅ Define the clock at the top of your game.js



import { ejectMass, updateEjectedMass, checkEjectedMassCollision } from './js/ejectMass.js';


import { shootLaser, updateLasers, playerLasers } from './js/laserShots.js';




import { socket } from './multiplayer.js';



socket.on("updateScore", ({ id, score }) => {
    if (players[id]) {
        players[id].score = score;
    }
    updateHUD(); // 🔥 Ensure HUD updates when the score changes
});





socket.on("updateLeaderboard", (leaderboard) => {
    console.log("📊 Received leaderboard update:", leaderboard);

    let leaderboardElement = document.getElementById("leaderboard-list");
    leaderboardElement.innerHTML = ""; // ✅ Clear old leaderboard before updating

    leaderboard.forEach((player, index) => {
        console.log(`🔍 Player ${index + 1}:`, player); // ✅ Debugging to see name & score

        let listItem = document.createElement("li");

        // ✅ Ensure player has a name
        if (player.name && player.name.trim() !== "") {
            listItem.innerHTML = `#${index + 1}: <span class="player-name">${player.name}</span> - <span class="player-score">${Math.floor(player.score)}</span>`;
        } else {
            console.warn(`⚠️ Missing player name for index ${index}. Full player object:`, player);
            listItem.innerHTML = `#${index + 1}: <span class="player-name">UNKNOWN</span> - <span class="player-score">${Math.floor(player.score)}</span>`;
        }

        // ✅ Highlight the current player in GOLD
        if (player.id === socket.id) {
            listItem.classList.add("current-player");
        }

        leaderboardElement.appendChild(listItem);
    });

    console.log("✅ Leaderboard updated successfully!");
});

















// ✅ Create Scene
const scene = new THREE.Scene();
if (!scene) {
    console.error('❌ Scene konnte nicht erstellt werden!');
} else {
    console.log('✅ Scene erfolgreich erstellt!');
}

console.log('✅ THREE.js geladen:', THREE);
console.log('🔍 Scene Objects:', scene.children);

let players = [];
let foodProjectiles = [];
let splitCooldown = 10000; // 10 Sekunden Cooldown
let lastSplitTime = 0;
let canSplit = true; // Flag, um mehrfaches Splitten zu verhindern

console.log('📌 Existiert players?', typeof players !== 'undefined');
console.log('📌 Inhalt von players:', players);
console.log('📌 Anzahl der Spieler:', players?.length || 0);

// ✅ Lade die Textur für den Spieler

// ✅ 20-Minuten Timer setzen
let endTime = Date.now() + 20 * 60 * 1000; // 20 Minuten ab jetzt

console.log('Canvas gefunden:', document.querySelector('canvas'));

// ✅ Initialize WebGL Renderer
let renderer;  // 🌟 Globale Variable für Renderer

function initRenderer() {
    renderer = new THREE.WebGLRenderer({ 
        powerPreference: "high-performance", 
        antialias: false,
        alpha: false // ✅ Prevents unnecessary transparency issues
    });

    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.NoToneMapping; // Ensures uniform brightness
    renderer.toneMappingExposure = 1;  // Keep brightness natural

    document.body.appendChild(renderer.domElement);

}






// 🟢 Rufe die Funktion auf, um den Renderer zu initialisieren
initRenderer();

// ✅ Create Camera (Fixed Perspective)
const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 50000);
camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);

// ✅ Camera Rotation Variables
let cameraYaw = 0;  // Rotation angle in radians
const cameraRotateSpeed = 0.03; // Adjust this for faster/slower rotation
let rotatingLeft = false;
let rotatingRight = false;




console.log('✅ Kamera erfolgreich erstellt:', camera);

// ✅ Large Map (Fixed Grid Rendering)
const gridSize = 100000;

// Erstellt das Grid-Material mit Polygon Offset
const gridMaterial = new THREE.LineBasicMaterial({
    color: 0x001100,
    linewidth: 5,
    polygonOffset: true,  // **Vermeidet Flackern mit dem Boden**
    polygonOffsetFactor: -1,  // **Drückt es in der Rendering-Reihenfolge leicht nach vorne**
    polygonOffsetUnits: -1
});

// Erstellt das Grid mit dem optimierten Material
const gridHelper = new THREE.GridHelper(gridSize, 300);
gridHelper.material = gridMaterial;
gridHelper.position.y = -10;  // Leicht über die Boden-Textur anheben

// Stellt sicher, dass das Grid nach dem Boden gerendert wird
gridHelper.renderOrder = 1;
scene.add(gridHelper);

// ✅ Ambient Light



// ✅ Soft Ambient Light to Remove Extreme Shadows
// ✅ Restore Original Ambient Light (Soft & Even Lighting)
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6); // ✅ Adjust intensity if needed
scene.add(ambientLight);






// ✅ Load the Ground Texture
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load('textures/platform1.jpg', function(texture) {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(40, 40); // ✅ Texture tiling
    texture.colorSpace = THREE.SRGBColorSpace;
});

// ✅ Adjust Material to be Less Dark & More Realistic
const groundMaterial = new THREE.MeshStandardMaterial({
    map: groundTexture,
    side: THREE.DoubleSide,
    roughness: 20, // ✅ Reduce roughness to avoid extreme darkness
    metalness: 0.0, // ✅ No metallic reflections
    emissive: new THREE.Color(0x000000), // ✅ No glow effect
    emissiveIntensity: 0.0 // ✅ Ensure ground is not glowing
});


// ✅ Create Ground Plane
const groundGeometry = new THREE.PlaneGeometry(gridSize, gridSize);
const ground = new THREE.Mesh(groundGeometry, groundMaterial);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -35;
ground.receiveShadow = true; // ✅ Enable shadows but don't make it too dark
scene.add(ground);



// ✅ Lade die Textur für den Spieler
const playerTexture = textureLoader.load('textures/playerSkinredalien1.png', function(texture) {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, 1);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.flipY = false;
    texture.needsUpdate = true;

    // ✅ Set the center for rotation (MUST BE 0.5, 0.5)
    texture.center.set(0.5, 0.5);
});





scene.traverse((child) => {
    if (child.isMesh) {
        child.frustumCulled = true; // ✅ Hides objects outside the camera view
    }
});










// ✅ Create Player mit PNG-Skin
// ✅ Use InstancedMesh for Player Rendering Optimization
const playerGeometry = new THREE.PlaneGeometry(50, 50);
// ✅ Manually adjust UVs to fit the texture exactly
const uvs = playerGeometry.attributes.uv.array;
uvs[0] = 0.0; uvs[1] = 1.0; // Bottom-left
uvs[2] = 1.0; uvs[3] = 1.0; // Bottom-right
uvs[4] = 1.0; uvs[5] = 0.0; // Top-right
uvs[6] = 0.0; uvs[7] = 0.0; // Top-left

playerGeometry.attributes.uv.needsUpdate = true;

const playerMaterial = new THREE.MeshStandardMaterial({
    map: playerTexture,
    transparent: true,
    metalness: 0.0, // ✅ No metallic effect
    roughness: 0.3, // ✅ Keep some roughness to avoid over-reflections
    emissive: new THREE.Color(0x000000), // ✅ No glow effect
    emissiveIntensity: 0.0
});











const maxPlayers = 500; // ✅ Support up to 500 players efficiently
const playerMesh = new THREE.InstancedMesh(playerGeometry, playerMaterial, maxPlayers);

scene.add(playerMesh);

function updatePlayers() {
    let matrix = new THREE.Matrix4();
    
    players.forEach((player, index) => {
        matrix.setPosition(player.position.x, player.position.y, player.position.z);
        playerMesh.setMatrixAt(index, matrix);
    });

    playerMesh.instanceMatrix.needsUpdate = true;
}





function mergeMeshes(meshes) {
    let mergedGeometry = new THREE.BufferGeometry();
    let mergedMaterial = meshes[0].material;
    
    meshes.forEach(mesh => {
        mergedGeometry = BufferGeometryUtils.mergeBufferGeometries([mergedGeometry, mesh.geometry], true);
    });

    let mergedMesh = new THREE.Mesh(mergedGeometry, mergedMaterial);
    scene.add(mergedMesh);
}




scene.traverse((child) => {
    if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
    }
});



























// ✅ Food Particles with Black Hole Effect
// ✅ Ultimate High-Quality Food with Optimized Glow & Performance
const foodCount = 10000;  // 🔥 Reduce count for better performance but same visual density
const foodSize = 15; // Larger so it’s more noticeable
const foodHeight = -30; // Slightly above the ground

// ✅ Optimized Material with Glass, Reflection, and Glow
const foodMaterial = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(0.3, 0.9, 1), // Vibrant crystal blue
    roughness: 0.05,  // Super smooth reflections
    metalness: 0.6,  // Reflective shine
    transmission: 0.95,  // Crystal glass effect
    thickness: 8,  // Depth effect for realism
    clearcoat: 1,  // Enhances sharp reflections
    clearcoatRoughness: 0.05,  
    emissive: new THREE.Color(0.2, 0.5, 1), // Soft glowing effect
    emissiveIntensity: 0.8, // Balanced glow
});

// ✅ Custom Sphere with Smooth Edges
const foodGeometry = new THREE.IcosahedronGeometry(foodSize, 2);
const foodMesh = new THREE.InstancedMesh(foodGeometry, foodMaterial, foodCount);

let foodPositions = new Map();

function spawnFood() {
    for (let i = 0; i < foodCount; i++) {
        const pos = new THREE.Vector3(
    Math.random() * gridSize - gridSize / 2,
    foodHeight,  // ✅ Lower height applied
    Math.random() * gridSize - gridSize / 2
);


        foodPositions.set(i, pos);
        let matrix = new THREE.Matrix4().setPosition(pos);
        foodMesh.setMatrixAt(i, matrix);
    }

    foodMesh.instanceMatrix.needsUpdate = true;
    scene.add(foodMesh);
}

// ✅ Optimized Food Spawning with Delay to Avoid Lag
setTimeout(spawnFood, 1000);





// ✅ Movement Variables
let moveSpeed = 20;
let baseSpeed = 20;
let targetPosition = null; // No movement at start
let lastMouseTime = Date.now();
let mouseIsMoving = false;

// ✅ Mouse to World Position
function getMouseWorldPosition(event) {
    if (!renderer) return new THREE.Vector3();
    
    const rect = renderer.domElement.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const mouseVector = new THREE.Vector3(mouseX, mouseY, 0.5);
    
    mouseVector.unproject(camera);
    const dir = mouseVector.sub(camera.position).normalize();
    const distance = -camera.position.y / dir.y;
    
    return camera.position.clone().add(dir.multiplyScalar(distance));
}



// ✅ Stores the last movement direction (Default: Right)
let moveDirection = new THREE.Vector3(1, 0, 0); 

document.addEventListener('mousemove', (event) => {
    targetPosition = getMouseWorldPosition(event);
    lastMouseTime = Date.now();
    mouseIsMoving = true;

    // ✅ Update direction when mouse moves
    if (targetPosition) {
        moveDirection.copy(targetPosition.clone().sub(players[0].position).normalize());
    }
});



// ✅ Handle A/D Camera Rotation
document.addEventListener('keydown', (event) => {
    if (event.key === 'a' || event.key === 'A') {
        cameraYaw += cameraRotateSpeed; // Rotate left
    }
    if (event.key === 'd' || event.key === 'D') {
        cameraYaw -= cameraRotateSpeed; // Rotate right
    }
});




// ✅ Listen for Key Down (Start Rotation)
document.addEventListener('keydown', (event) => {
    if (event.key === 'a' || event.key === 'A') rotatingLeft = true;
    if (event.key === 'd' || event.key === 'D') rotatingRight = true;
});

// ✅ Listen for Key Up (Stop Rotation)
document.addEventListener('keyup', (event) => {
    if (event.key === 'a' || event.key === 'A') rotatingLeft = false;
    if (event.key === 'd' || event.key === 'D') rotatingRight = false;
});





// ✅ Smooth Growth & Camera Zoom
// ✅ Smooth Growth & Camera Zoom
// ✅ Smooth Growth & Camera Zoom
function updateGrowth() {
    for (let player of players) {
        // Scale the Player
       player.scale.setScalar(player.size / 40);  // ✅ Reduce scale factor

        let baseHeight = 500;   // Default camera height
        let zoomFactor = 50;     // Adjusted zoom factor (smaller than before)
        let maxZoomOut = 1500;  // Lower max limit to prevent extreme zoom-out

        // ✅ Adjust camera height dynamically, but prevent over-scaling
        let newHeight = baseHeight + Math.min(player.size * zoomFactor, maxZoomOut);
        camera.position.y = newHeight;

       // Recalculate the player's world position
        player.getWorldPosition(player.position);

        // Update camera position and lookAt
camera.position.copy(player.position).add(new THREE.Vector3(0, 1000, 1500)); // Adjust camera's relative position to the player
camera.lookAt(player.position);
        

    }
}




// ✅ Black Hole Magnetic Effect
function checkFoodCollision() {
    let updatedFoodPositions = new Map();

    for (let player of players) {
        foodPositions.forEach((foodPos, key) => {
            let distance = player.position.distanceTo(foodPos);
            let absorptionRadius = player.size * 3;

            if (distance < absorptionRadius) {
                foodPos.lerp(player.position, 0.5); // Pull food toward player

                if (distance < player.size * 1.3) {
                    let growthFactor = 1 / (1 + player.size * 0.01);
                    player.size += growthFactor;
                    moveSpeed = Math.max(3, baseSpeed - (player.size / 20));

                    // ✅ Remove the food first
                    foodMesh.setMatrixAt(key, new THREE.Matrix4().setPosition(99999, 99999, 99999)); 
                    foodMesh.instanceMatrix.needsUpdate = true;

                    // ✅ Simple 3-second respawn delay
                    setTimeout(() => {
                        let newFoodPos = new THREE.Vector3(
                            Math.random() * gridSize - gridSize / 2,
                            foodHeight,
                            Math.random() * gridSize - gridSize / 2
                        );

                        foodPositions.set(key, newFoodPos);
                        foodMesh.setMatrixAt(key, new THREE.Matrix4().setPosition(newFoodPos.x, newFoodPos.y, newFoodPos.z));
                        foodMesh.instanceMatrix.needsUpdate = true; // ✅ Update mesh
                    }, 10000);
                } else {
                    updatedFoodPositions.set(key, foodPos);
                }
            } else {
                updatedFoodPositions.set(key, foodPos);
            }
        });
    }

    foodMesh.instanceMatrix.needsUpdate = true;
    foodPositions = updatedFoodPositions;
}


// ✅ Split Function
function splitPlayer(player) {
    if (player.size <= 100 || player.isSplit) {
        console.log('Spieler kann sich nicht teilen!');
        return;
    }

    if (Date.now() - lastSplitTime < splitCooldown) {
        console.log('Cooldown noch nicht abgelaufen!');
        return;
    }

    lastSplitTime = Date.now();

    let newSize = player.size / 2;

    // Erstelle den neuen Spieler an der gleichen Position
    let newPlayer = createPlayer(newSize, player.position.clone(), true);

    // Aktualisiere den ursprünglichen Spieler
    player.size = newSize;
    player.isSplit = true;

    console.log('Spieler in zwei Teile geteilt!');
}

// ✅ Merge Function
function mergePlayers() {
    if (Date.now() - lastSplitTime < splitCooldown) {
        return; // Cooldown noch nicht abgelaufen
    }

    let mergedPlayers = [];
    for (let i = 0; i < players.length; i++) {
        if (players[i].isSplit) {
            for (let j = i + 1; j < players.length; j++) {
                if (players[j].isSplit && players[i].position.distanceTo(players[j].position) < 1) {
                    // Merge these players
                    players[i].size += players[j].size;
                    scene.remove(players[j]);
                    mergedPlayers.push(players[j]);
                    players[i].isSplit = false;
                    break;
                }
            }
        }
    }
    players = players.filter(p => !mergedPlayers.includes(p));
}




// ✅ Check Projectile Collision
function checkProjectileCollision() {
    for (let i = foodProjectiles.length - 1; i >= 0; i--) {
        let projectile = foodProjectiles[i];
        for (let player of players) {
            let distance = player.position.distanceTo(projectile.position);
            if (distance < player.size / 2 + projectile.userData.size / 2) {
                // Spieler isst das Projektil
                player.size += projectile.userData.size / 2;
                scene.remove(projectile);
                foodProjectiles.splice(i, 1);
                break;
            }
        }
    }
}







// ✅ Final Fix - Continuous Movement Without Stuttering
function updatePlayerMovement() {
    for (let player of players) {
        const currentTime = Date.now();
        const timeSinceLastMouseMove = currentTime - lastMouseTime;

        // ✅ Keep moving in the last direction, even if mouse stops
        if (timeSinceLastMouseMove > 100) {
            mouseIsMoving = false;
        }

        let speedFactor = moveSpeed * (player.size / 20);
        let newPosition = player.position.clone().add(moveDirection.clone().multiplyScalar(speedFactor));

        // ✅ Prevent movement outside map edges
        let halfGrid = gridSize / 2;
        newPosition.x = THREE.MathUtils.clamp(newPosition.x, -halfGrid, halfGrid);
        newPosition.z = THREE.MathUtils.clamp(newPosition.z, -halfGrid, halfGrid);

        player.position.copy(newPosition);
    }
}














// ✅ Animation Loop (mit HUD-Update)
// ✅ Animation Loop (No Movement Freeze)
function animate() {
    requestAnimationFrame(animate);

    if (!renderer) return;

    const delta = clock.getDelta();  // ✅ Correctly use clock
    const currentTime = clock.getElapsedTime(); // ✅ Correctly define currentTime

    updatePlayerMovement();   


    updateLasers(scene, players);


    
    updateEjectedMass(); // ✅ Move ejected food
    checkEjectedMassCollision(players, scene); // ✅ Check if players eat food
        


    

  
    updateGrowth();

      // ✅ Rotate ONLY the player skin (PNG)
    if (playerMaterial) {
        playerMaterial.map.rotation += 0.02; // Adjust speed for rotation
    }
    
    






    checkFoodCollision();
    updateGrowth();
    mergePlayers();
    checkProjectileCollision();

    // Bewege die abgeschossenen Futterpartikel
    for (let projectile of foodProjectiles) {
        if (projectile.userData && projectile.userData.direction) {
            projectile.position.add(projectile.userData.direction);
            projectile.userData.direction.multiplyScalar(0.95);
            if (projectile.userData.direction.length() < 0.1) {
                projectile.userData.direction.set(0, 0, 0);
            }
        }
    }

    checkProjectileCollision();

    // Kamera-Follow
// ✅ Smooth Camera Rotation Every Frame
// ✅ Increase Rotation Speed for Instant Response
// ✅ Increase Rotation Speed for Instant Response
let rotationSpeed = 0.08; // 🔥 Adjust this for even faster turning

// 🆕 Add variable for fixed pitch angle
let fixedPitchAngle = Math.PI / 6; // Adjust this value to change the camera angle (e.g., Math.PI/6 is 30 degrees)

// ✅ Handle A/D Rotation Outside of Camera Zoom Logic
if (rotatingLeft) cameraYaw += rotationSpeed;
if (rotatingRight) cameraYaw -= rotationSpeed;

if (players.length > 0) {
    let player = players[0];

    let baseDistance = 1000;  // 🔥 Closer default distance
    let maxDistance = 2000;   // 🔥 Adjusted zoom-out limit
    let scaleFactor = 2;      // 🔥 Zoom-out based on growth

    let newDistance = baseDistance + Math.min(player.size * scaleFactor, maxDistance);

    let tiltOffset = 1000; // 🔥 Move this UP (-) or DOWN (+) to tilt

    // ✅ Updated Camera Rotation with Fixed Pitch Angle
    let offsetX = Math.sin(cameraYaw) * newDistance * Math.cos(fixedPitchAngle);
    let offsetY = Math.sin(fixedPitchAngle) * newDistance;
    let offsetZ = Math.cos(cameraYaw) * newDistance * Math.cos(fixedPitchAngle);
    
    // ✅ APPLY CAMERA TILT OFFSET (Fixes the viewing angle)
    camera.position.set(
        player.position.x + offsetX,
        player.position.y + tiltOffset + offsetY,  // 🔥 This moves the tilt UP or DOWN
        player.position.z + offsetZ
    );

    let playerCenter = new THREE.Vector3(
        player.position.x, 
        player.position.y + (player.size / 2), 
        player.position.z
    );

    camera.lookAt(playerCenter);
}













function interpolatePlayerMovement(player, serverPosition) {
    player.position.lerp(serverPosition, 0.1); // ✅ Smoothly move towards real position
}




function updatePlayers() {
    let matrix = new THREE.Matrix4();

    players.forEach((player, index) => {
        matrix.setPosition(player.position.x, player.position.y, player.position.z);
        playerMesh.setMatrixAt(index, matrix);
    });

    playerMesh.instanceMatrix.needsUpdate = true;
}






let lastCameraPos = new THREE.Vector3();

function updateCamera() {
    if (lastCameraPos.equals(camera.position)) return; // ✅ Skip unnecessary updates
    lastCameraPos.copy(camera.position);
    camera.lookAt(players[0].position);
}








    // HUD-Updates
    if (players.length > 0) {
        document.getElementById('score').innerText = 'Score: ' + Math.floor(players[0].size);
    }

    let remainingTime = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    let minutes = Math.floor(remainingTime / 60);
    let seconds = remainingTime % 60;
    document.getElementById('timer').innerText = `Time: ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;

    let leaderboardElement = document.getElementById('leaderboard-list');
    if (leaderboardElement) {
        let sortedPlayers = players.slice().sort((a, b) => b.size - a.size).slice(0, 10);
        leaderboardElement.innerHTML = sortedPlayers.map((player, index) =>
            `<li>#${index + 1}: Score ${Math.floor(player.size)}</li>`
        ).join('');
    }





players.forEach(player => {
    let distance = camera.position.distanceTo(player.position);
    if (distance > 5000) {
        player.visible = false; // ✅ Hide distant players
    } else {
        player.visible = true; // ✅ Show nearby players
    }
    playerLasers.set(player, 3); // Give each player 3 shots at the start
});







    renderer.render(scene, camera);
}



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








import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@latest/examples/jsm/loaders/FBXLoader.js';
import { TextureLoader } from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';

const loader = new FBXLoader();


// ✅ Load Runestone Textures
const diffuseMap = textureLoader.load('textures/Diffuse_cristal.jpg');
const normalMap = textureLoader.load('textures/Normal_cristal.jpg');
const emissiveMap = textureLoader.load('textures/Emission_cristal.jpg');
const specularMap = textureLoader.load('textures/Specular_cristal.jpg');
const aoMap = textureLoader.load('textures/Occlusion_cristal.jpg');

// ✅ Load Stone Base Textures
const stoneDiffuse = textureLoader.load('textures/Diffuse_stone.jpg');
const stoneNormal = textureLoader.load('textures/Normal_stone.jpg');
const stoneAO = textureLoader.load('textures/Occlusion_stone.jpg');
const stoneEmission = textureLoader.load('textures/Emission_stone.jpg');

// ✅ Function to Load Object Models
function loadObject(path, scale, position, isRunestone = false) {
    loader.load(path, function (fbx) {
        fbx.scale.set(scale, scale, scale);
        fbx.position.copy(position);
        fbx.updateMatrixWorld(true);

        fbx.traverse((child) => {
            if (child.isMesh) {
                if (isRunestone) {
                    // 🟢 Special Runestone Material
                    if (child.name.toLowerCase().includes("crystal")) {
                        // 💎 Blue Glowing Crystal (Glass-like)
                        child.material = new THREE.MeshPhysicalMaterial({
                            map: diffuseMap,
                            normalMap: normalMap,
                            emissiveMap: emissiveMap,
                            emissive: new THREE.Color(0.3, 0.8, 1), // **Blue Glow**
                            emissiveIntensity: 50.0,
                            roughness: 0.1,
                            metalness: 0.2,
                            transmission: 10.9, // **Glass-like transparency**
                            thickness: 10,
                            clearcoat: 1,
                            clearcoatRoughness: 0.1,
                            transparent: true
                        });
                    } else {
                        // 🗿 Stone Base with Glowing Runes
                        child.material = new THREE.MeshStandardMaterial({
                            map: stoneDiffuse,
                            normalMap: stoneNormal,
                            aoMap: stoneAO,
                            emissiveMap: stoneEmission,
                            emissive: new THREE.Color(0.1, 0.4, 0.8), // **Soft blue glow**
                            emissiveIntensity: 10.5,
                            roughness: 0.8,
                            metalness: 0.3
                        });
                    }
                } else {
                    // 🔷 Normal Crystal Settings
                    child.material = new THREE.MeshStandardMaterial({
                        color: new THREE.Color(0.3, 0.9, 1), // **Same color as food**
                        roughness: 0.2,  
                        metalness: 0.1,  
                        emissive: new THREE.Color(0.3, 0.9, 1), // **Exact food color**
                        emissiveIntensity: 0.6 // 🔥 More visible glow
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

// ✅ Store object positions to avoid overlap
const objectPositions = [];
let objectsPlaced = false;

// ✅ **Load Runestone FIRST**
const runestonePosition = new THREE.Vector3(0, foodHeight, 0);
loadObject('models/Runestone.fbx', 100, runestonePosition, true);

// ✅ Define different object types with settings
const objectTypes = [
    { path: 'models/crystalBLUE.fbx', scale: 70, maxCount: 50, minDistance: 800 }, // 🔹 Normal Crystal
];

// ✅ Function to place static objects
function placeStaticObjects() {
    if (objectsPlaced) return; // Prevent duplicate spawning
    objectsPlaced = true;

    objectTypes.forEach((objType) => {
        let placedObjects = 0;

        while (placedObjects < objType.maxCount) {
            let randomX = (Math.random() - 0.5) * gridSize;
            let randomZ = (Math.random() - 0.5) * gridSize;
            
            let newPosition = new THREE.Vector3(randomX, foodHeight, randomZ);

            // Ensure objects don't spawn too close to each other
            let tooClose = objectPositions.some(pos => pos.distanceTo(newPosition) < objType.minDistance);
            if (!tooClose) {
                loadObject(objType.path, objType.scale, newPosition);
                objectPositions.push(newPosition);
                placedObjects++;
            }
        }
    });
}

// ✅ Call function once
placeStaticObjects();



















function createPlayer(size, position, isSplit = false, skin) {
  const materialOptions = {
    map: skin ? textureLoader.load(skin) : playerTexture,
    transparent: true,
    metalness: 0.1,
    roughness: 0.3,
    emissive: new THREE.Color(0, 0, 0),
    emissiveIntensity: 0,
    side: THREE.DoubleSide,
  };
  const playerMaterial = new THREE.MeshStandardMaterial(materialOptions);
  
  const scaleFactor = 2.5;
  const playerGeometry = new THREE.PlaneGeometry(size * scaleFactor, size * scaleFactor);
  playerGeometry.translate(0, size * 0.75, 0);
  
  const player = new THREE.Mesh(playerGeometry, playerMaterial);
  player.position.copy(position);
  player.position.y += 2;
  player.size = size;
  player.rotation.x = -Math.PI / 2;
  player.isSplit = isSplit;
  player.renderOrder = -1;
  
  scene.add(player);
  players.push(player);
  return player;
}




function updateHUD() {
    if (players[socket.id]) {
        document.getElementById("scoreCounter").innerText = Math.floor(players[socket.id].score);
    }
}

function checkGameEnd() {
    let remainingTime = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
    if (remainingTime === 0) {
        console.log("⏳ Game Over!");  
        socket.emit("gameOver"); // Inform server to stop tracking scores
        document.getElementById("hud").innerHTML = "<h1>Game Over</h1>";
    }
}
setInterval(checkGameEnd, 1000);



// ✅ Spieler wird NUR EINMAL erstellt, nicht in der Funktion selbst
function loadPlayersFromLobby() {
  const data = localStorage.getItem("gameData");
  if (!data) {
    console.error("No game data found. Cannot load players.");
    return;
  }
  const playersData = JSON.parse(data);
  // Clear existing players array:
  players = [];
  playersData.forEach((p) => {
    // Use the skin provided by the server.
    createPlayer(p.size || 40, new THREE.Vector3(p.x, 40, p.z), false, p.skin);
  });
}

// Call this function once the game page is loaded.
window.addEventListener("DOMContentLoaded", loadPlayersFromLobby);



// ✅ Fenster-Resize-Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();




