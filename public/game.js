// ✅ Import Three.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';

const mixers = [];  // ✅ Stores animation mixers for monsters

const clock = new THREE.Clock(); // ✅ Define the clock at the top of your game.js





import { socket } from './multiplayer.js';



socket.on("updateScore", ({ id, score }) => {
    if (players[id]) {
        players[id].score = score;
    }
    updateHUD(); // 🔥 Ensure HUD updates when the score changes
});






socket.on("updateLeaderboard", (leaderboard) => {
    console.log("📊 Updating Leaderboard from Multiplayer:", leaderboard);

    let leaderboardElement = document.getElementById("leaderboard-list");
    if (!leaderboardElement) return;

    leaderboardElement.innerHTML = leaderboard
        .map((player, index) => `<li>#${index + 1}: ${player.name} - ${Math.floor(player.score)}</li>`)
        .join("");

    // Show the player's own rank if they are not in the top 10
    if (!leaderboard.some(p => p.id === socket.id)) {
        let currentPlayer = players[socket.id];
        if (currentPlayer) {
            let playerRank = leaderboard.length + 1;
            leaderboardElement.innerHTML += `<li>#${playerRank}: ${currentPlayer.name} - ${Math.floor(currentPlayer.score)}</li>`;
        }
    }
});






const monsters = []; // ✅ Stores all loaded monster models


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
const ambientLight = new THREE.AmbientLight(0xffffff, 0.4); // ✅ Adjust intensity if needed
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








import { FBXLoader } from 'https://cdn.jsdelivr.net/npm/three@latest/examples/jsm/loaders/FBXLoader.js';

const loader = new FBXLoader();

function loadMonster(path, scale, heightOffset) {
    const randomX = (Math.random() - 0.5) * 5000; // ✅ Random range -2500 to 2500
    const randomZ = (Math.random() - 0.5) * 5000; // ✅ Random range -2500 to 2500
    const randomY = heightOffset;  // ✅ Maintain height control

    loader.load(path, function (fbx) {
        fbx.scale.set(scale, scale, scale);
        fbx.position.set(randomX, randomY, randomZ); // ✅ Randomized position
        fbx.updateMatrixWorld(true);
        scene.add(fbx);

        console.log(`✅ FBX Loaded: ${path} at`, fbx.position);

        if (fbx.animations.length > 0) {
            console.log('🎥 Animations found:', fbx.animations);
            const mixer = new THREE.AnimationMixer(fbx);
            const action = mixer.clipAction(fbx.animations[0]);
            action.play();
            mixers.push(mixer);
        } else {
            console.warn(`⚠️ No animations found in ${path}`);
        }

        // ✅ Fix Glow & Materials
      fbx.traverse((child) => {
    if (child.isMesh) {
        child.material.transparent = false;  // ✅ Disable transparency
        child.material.opacity = 1;         // ✅ Fully visible
        child.material.alphaTest = 0.1;     // ✅ Ensures no weird cutoffs
        child.material.depthWrite = true;   // ✅ Fix depth rendering issues
        child.material.depthTest = true;    // ✅ Proper Z-buffering
        child.material.blending = THREE.NormalBlending;  // ✅ Remove unwanted additive blending

        // ✅ Fix lighting & reflections
        child.material.roughness = 1;  // ✅ Prevents over-reflective surfaces
        child.material.metalness = 0;  // ✅ Remove weird metallic effects
        child.material.emissiveIntensity = 0;  // ✅ No self-glowing textures
        child.material.side = THREE.DoubleSide; // ✅ Ensures both sides render

        child.material.needsUpdate = true;  // ✅ Apply changes
    }
});


        // ✅ Store monster & add spawn time
        monsters.push({
            model: fbx,
            spawnTime: Date.now(), // ✅ Track time of spawn
            canDamage: false // ✅ Initially can't damage player
        });

        console.log(`🛸 Monster spawned at:`, fbx.position);

        // ✅ Allow monster to deal damage after 10 seconds
        setTimeout(() => {
            monsters.forEach(monster => {
                monster.canDamage = true;
            });
            console.log("🛡️ Monsters can now deal damage!");
        }, 10000);
    }, undefined, function (error) {
        console.error('❌ Error loading FBX:', error);
    });
}





// ✅ Load Each Monster With Different Sizes & Heights
// ✅ Proper positioning

loadMonster('models/UFO.fbx', 3, 10); // ✅ Large flying enemy









// ✅ Monster Movement
function moveMonsters() {
    if (players.length === 0) return; // ✅ Prevent errors if no players exist

    const speed = 3;
    const player = players[0]; // ✅ Assume first player is the target

    monsters.forEach((monster, index) => {
        if (!monster.model) return;



        const direction = new THREE.Vector3().subVectors(player.position, monster.model.position).normalize();
        monster.model.position.addScaledVector(direction, speed);
        monster.model.lookAt(player.position);

       
    });
}



setTimeout(() => {
    monsters.forEach((monster, index) => {
        console.log(`⏳ 5-SEC CHECK: Monster #${index} final position:`, monster.model.position);
    });
}, 5000);





// ✅ Check if Monsters are Near Player
function checkMonsterProximity(player) {
    monsters.forEach(monsterObj => {
        const monster = monsterObj.model; // ✅ Get actual FBX model
        if (!monster || !player.position) return;

        const distance = monster.position.distanceTo(player.position);

        if (distance < 5) { 
            console.log("⚠️ Monster is close to the player!");

            if (distance < 2) {
                console.log("💥 Monster ATTACKS!");
            }
        }
    });
}


// ✅ Damage Player on Touch
function checkMonsterCollision() {
    if (players.length === 0) return;
    const player = players[0];

    monsters.forEach(monster => {
        const distance = player.position.distanceTo(monster.model.position);
        const playerRadius = player.size * 0.5;
        const monsterRadius = 5;

        if (distance < (playerRadius + monsterRadius)) {
            if (!monster.canDamage) {
                console.log("🛡️ Monster can't hurt the player yet (First 10 sec)");
                return;
            }

            if (!player.isHit) {
                player.size *= 0.7;
                player.isHit = true;
                
                console.log("⚠️ Player was hit! New size:", player.size);
                
                setTimeout(() => {
                    player.isHit = false;
                }, 3000);
            }
        }
    });
}



function updateMonsterAnimations() {
    const player = players[0];

    mixers.forEach((mixer, index) => {
        const monster = activeMonsters[index];
        if (player.position.distanceTo(monster.position) < 2000) {
            mixer.update(clock.getDelta()); // ✅ Only update animations for nearby monsters
        }
    });
}




function mergeMonsters() {
    const mergedGeometry = new THREE.BufferGeometry();
    const mergedMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    
    let positions = [];
    
    let lastHitTime = 0;


    
    mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const mergedMesh = new THREE.Mesh(mergedGeometry, mergedMaterial);
    scene.add(mergedMesh);
}




function moveOptimizedMonsters() {
    if (players.length === 0) return;
    const player = players[0];

    activeMonsters.forEach(monster => {
        const distance = player.position.distanceTo(monster.position);
        
        if (distance > 2000) return; // ✅ Don't move monsters too far away

        const speed = 0.5; // ✅ Lower speed = fewer physics updates
        const direction = new THREE.Vector3().subVectors(player.position, monster.position).normalize();
        monster.position.addScaledVector(direction, speed);
        monster.lookAt(player.position);
    });
}






function removeFarMonsters() {
    const player = players[0];

    for (let i = activeMonsters.length - 1; i >= 0; i--) {
        if (player.position.distanceTo(activeMonsters[i].position) > 3000) {
            scene.remove(activeMonsters[i]);
            activeMonsters.splice(i, 1);
            console.log("🗑️ Removed distant monster to save performance!");
        }
    }
}








const activeMonsters = [];

function loadOptimizedMonster(path, scale, heightOffset) {
    loader.load(path, function (fbx) {
        fbx.scale.set(scale, scale, scale);
        fbx.position.set(
            (Math.random() - 0.5) * 5000,
            heightOffset,
            (Math.random() - 0.5) * 5000
        );

        scene.add(fbx);
        activeMonsters.push(fbx);

        // ✅ Play only one animation instead of all
        if (fbx.animations.length > 0) {
            const mixer = new THREE.AnimationMixer(fbx);
            const action = mixer.clipAction(fbx.animations[0]);
            action.play();
            mixers.push(mixer);
        }

        // ✅ Limit number of active monsters
        if (activeMonsters.length > 10) {
            let removed = activeMonsters.shift();
            scene.remove(removed);
        }
    });
}









const monsterGeometry = new THREE.SphereGeometry(5, 16, 16); // ✅ Simple shape for monsters
const monsterMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const maxMonsters = 10; // ✅ Limit number of active monsters
const monsterMesh = new THREE.InstancedMesh(monsterGeometry, monsterMaterial, maxMonsters);
scene.add(monsterMesh);

let monsterPositions = [];

function spawnOptimizedMonsters() {
    for (let i = 0; i < maxMonsters; i++) {
        const randomX = (Math.random() - 0.5) * 5000;
        const randomZ = (Math.random() - 0.5) * 5000;
        const randomY = 5;
        monsterPositions.push(new THREE.Vector3(randomX, randomY, randomZ));

        let matrix = new THREE.Matrix4();
        matrix.setPosition(randomX, randomY, randomZ);
        monsterMesh.setMatrixAt(i, matrix);
    }
    monsterMesh.instanceMatrix.needsUpdate = true;
}
spawnOptimizedMonsters();
















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

// ✅ Update targetPosition only when the mouse moves
document.addEventListener('mousemove', (event) => {
    targetPosition = getMouseWorldPosition(event);
    lastMouseTime = Date.now();
    mouseIsMoving = true;
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
                foodPos.lerp(player.position, 0.5);

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
                    }, 10000); // ✅ 10 seconds delay
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

// ✅ Food Shooting Function
function shootFood(player) {
    if (player.size <= 70) {
        console.log('Spieler muss größer als 70 sein, um Essen zu schießen!');
        return;
    }

    let foodSize = 5;  // doppelte Größe des normalen Futters

    player.size -= foodSize / 2;  // Reduziere die Spielergröße

    const projectileMaterial = new THREE.MeshBasicMaterial({
        map: playerTexture,
        transparent: true,
    });

    let projectileGeometry = new THREE.PlaneGeometry(foodSize, foodSize);
    let projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);

    projectileMesh.position.copy(player.position);
    projectileMesh.rotation.x = -Math.PI / 2;  // Flach auf der Karte liegend
    projectileMesh.renderOrder = 1; // Projektile werden nach dem Grid gerendert
    scene.add(projectileMesh);

    // Berechne die Abschussrichtung
    let direction = targetPosition.clone().sub(player.position).normalize();
    const shootSpeed = 50;
    direction.multiplyScalar(shootSpeed);

    // Speichere Richtung, Geschwindigkeit und Größe im Mesh
    projectileMesh.userData = {
        direction: direction,
        initialSpeed: shootSpeed,
        size: foodSize
    };

    foodProjectiles.push(projectileMesh);

    console.log('Essen geschossen!');
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

// ✅ Animation Loop (mit HUD-Update)
// ✅ Animation Loop (No Movement Freeze)
function animate() {
    requestAnimationFrame(animate);

    if (!renderer) return;

    const delta = clock.getDelta();  // ✅ Correctly use clock
    const currentTime = clock.getElapsedTime(); // ✅ Correctly define currentTime

    // ✅ Update animations
    mixers.forEach(mixer => mixer.update(delta));


    if (monsters.length > 0) {  // ✅ Only move monsters if they exist
        moveMonsters();
        checkMonsterProximity(players[0]);
    }


    // ✅ Move monsters
    moveMonsters();
    checkMonsterProximity(players[0]); // Make sure players[0] exists before calling
    
    checkMonsterCollision(); // ✅ Checks every frame
    moveOptimizedMonsters();
    removeFarMonsters();

    updateGrowth();

      // ✅ Rotate ONLY the player skin (PNG)
    if (playerMaterial) {
        playerMaterial.map.rotation += 0.02; // Adjust speed for rotation
    }
    
    // ✅ Stop movement if no mouse movement for 500ms
    if (currentTime - lastMouseTime > 500) {
        mouseIsMoving = false;
    }

 for (let player of players) {
    

    const currentTime = Date.now();
    const timeSinceLastMouseMove = currentTime - lastMouseTime;

    if (mouseIsMoving && targetPosition) {
        let slowDownFactor = Math.max(0.1, 1 - (timeSinceLastMouseMove / 2000)); // ✅ Always a small movement
        const direction = targetPosition.clone().sub(player.position).normalize();
        player.position.add(direction.multiplyScalar(moveSpeed * (player.size / 20) * slowDownFactor));
    }

    // ✅ Completely stop movement if idle for 3 seconds
    if (timeSinceLastMouseMove > 3000) {
        mouseIsMoving = false;
    }
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
});







    renderer.render(scene, camera);
}





// ✅ Key Event Listener
document.addEventListener('keydown', (event) => {
    if (event.key === ' ' && players.length > 0) {
        splitPlayer(players[0]);
    }
    if (event.key === 'w' && players.length > 0) {
        shootFood(players[0]);
    }
});




function createPlayer(size, position, isSplit = false) {
    console.log('📌 Erstelle Spieler mit Position:', position);

    const playerMaterial = new THREE.MeshStandardMaterial({
        map: playerTexture,
        transparent: true,
        metalness: 0.1,  // ✅ Lower metallic effect to keep texture original
        roughness: 0.3,  // ✅ Balanced shine
        emissive: new THREE.Color(0, 0, 0), // ✅ No blue tint
        emissiveIntensity: 0, // ✅ Remove unwanted glow
        side: THREE.DoubleSide, // Ensure both sides of the plane are visible
    });

    const scaleFactor = 2.5;
    const playerGeometry = new THREE.PlaneGeometry(size * scaleFactor, size * scaleFactor);

    // ✅ Center the geometry based on the image's perceived center
    // Assuming your image's center is at (0, size * 0.75)
    // You might need to adjust 0.75 to match your specific image
    playerGeometry.translate(0, size * 0.75, 0); // Adjust this value

    const player = new THREE.Mesh(playerGeometry, playerMaterial);

    player.position.copy(position);
    player.position.y += 2; // ✅ Move player slightly up to avoid clipping

    player.size = size;
    player.rotation.x = -Math.PI / 2;

    //  // ✅ Ensures player always faces the camera
    

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
createPlayer(40, new THREE.Vector3(0, 40, 0));

// ✅ Fenster-Resize-Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();


