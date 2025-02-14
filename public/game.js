// ✅ Import Three.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';

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

console.log('📌 Existiert players?', typeof players !== 'undefined');
console.log('📌 Inhalt von players:', players);
console.log('📌 Anzahl der Spieler:', players?.length || 0);

// ✅ Lade die Textur für den Spieler
const textureLoader = new THREE.TextureLoader();
const playerTexture = textureLoader.load('textures/playerSkinhell1.png'); // RELATIVER PFAD

// ✅ 20-Minuten Timer setzen
let endTime = Date.now() + 20 * 60 * 1000; // 20 Minuten ab jetzt

console.log('Canvas gefunden:', document.querySelector('canvas'));

// ✅ Initialize WebGL Renderer
let renderer;  // 🌟 Globale Variable für Renderer

function initRenderer() {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.body.appendChild(renderer.domElement);
}

// 🟢 Rufe die Funktion auf, um den Renderer zu initialisieren
initRenderer();

// ✅ Create Camera (Fixed Perspective)
const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 1, 50000);
camera.position.set(0, 2000, 200);
camera.lookAt(0, 10, 0);
console.log('✅ Kamera erfolgreich erstellt:', camera);

// ✅ Large Map (Fixed Grid Rendering)
const gridSize = 100000;
const gridHelper = new THREE.GridHelper(gridSize, 300, 0x001100, 0x001100);
gridHelper.position.y = 0;
scene.add(gridHelper);

// ✅ Ambient Light
const light = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(light);

// ✅ Create Player mit PNG-Skin
function createPlayer(size, position, isSplit = false) {
    console.log('📌 Erstelle Spieler mit Position:', position); // Debug

    if (!position || isNaN(position.x) || isNaN(position.y) || isNaN(position.z)) {
        console.error('❌ Ungültige Position! Standardwert wird gesetzt.');
        position = new THREE.Vector3(0, 40, 0); // **Fallback auf sichere Standard-Position**
    }

    const playerMaterial = new THREE.MeshBasicMaterial({
        map: playerTexture,
        transparent: true,
    });

    const scaleFactor = 2.5; // 🔥 Erhöhe diesen Wert für größere Darstellung
    const playerGeometry = new THREE.PlaneGeometry(size * scaleFactor, size * scaleFactor);

    const player = new THREE.Mesh(playerGeometry, playerMaterial);

    player.position.copy(position); // **Sichere Position setzen**
    player.size = size;
    player.rotation.x = -Math.PI / 2; // 🔥 Liegt flach auf der Map
    player.lookAt(camera.position);  // 🔥 Richtet sich zur Kamera aus
    player.isSplit = isSplit;

    scene.add(player);
    players.push(player);

    console.log('✅ Spieler erfolgreich erstellt:', player);
    return player;
}

// ✅ Food Particles with Black Hole Effect
const foodCount = 40000;
const foodGeometry = new THREE.SphereGeometry(13, 16, 16);
const foodMaterial = new THREE.MeshStandardMaterial();
const foodMesh = new THREE.InstancedMesh(foodGeometry, foodMaterial, foodCount);

let foodPositions = new Map();
for (let i = 0; i < foodCount; i++) {
    const pos = new THREE.Vector3(
        Math.random() * gridSize - gridSize / 2,
        3,
        Math.random() * gridSize - gridSize / 2
    );
    foodPositions.set(i, pos);
    let matrix = new THREE.Matrix4().setPosition(pos);
    foodMesh.setMatrixAt(i, matrix);
    foodMesh.setColorAt(i, new THREE.Color(Math.random(), Math.random(), Math.random()));
}

foodMesh.instanceColor.needsUpdate = true;
scene.add(foodMesh);

// ✅ Movement Variables
let moveSpeed = 20;
let baseSpeed = 20;
let targetPosition = new THREE.Vector3();

// ✅ Mouse to World Position
function getMouseWorldPosition(event) {
    if (!renderer) {
        console.error('❌ Renderer wurde nicht richtig initialisiert!');
        return new THREE.Vector3();
    }

    const rect = renderer.domElement.getBoundingClientRect();
    const mouseX = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    const mouseY = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    const mouseVector = new THREE.Vector3(mouseX, mouseY, 0.5);
    mouseVector.unproject(camera);
    const dir = mouseVector.sub(camera.position).normalize();
    const distance = -camera.position.y / dir.y;
    return camera.position.clone().add(dir.multiplyScalar(distance));
}

document.addEventListener('mousemove', (event) => {
    targetPosition = getMouseWorldPosition(event);
});

// ✅ Smooth Growth & Camera Zoom
function updateGrowth() {
    for (let player of players) {
        player.scale.setScalar(player.size / 20);
        let baseHeight = 1000;
        let zoomFactor = 10;
        let maxZoomOut = 10000;

        if (player.size < 500) {
            camera.position.y = baseHeight + player.size * zoomFactor;
        } else {
            camera.position.y = baseHeight + (500 * zoomFactor) + ((player.size - 500) * 2);
        }

        camera.position.y = Math.min(maxZoomOut, camera.position.y);
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

                    let newFoodPos = new THREE.Vector3(
                        Math.random() * gridSize - gridSize / 2,
                        3,
                        Math.random() * gridSize - gridSize / 2
                    );
                    foodPositions.set(key, newFoodPos);
                    foodMesh.setMatrixAt(key, new THREE.Matrix4().setPosition(newFoodPos));
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

    let foodSize = 26;  // doppelte Größe des normalen Futters

    player.size -= foodSize / 2;  // Reduziere die Spielergröße

    const projectileMaterial = new THREE.MeshBasicMaterial({
        map: playerTexture,
        transparent: true,
    });

    let projectileGeometry = new THREE.PlaneGeometry(foodSize, foodSize);
    let projectileMesh = new THREE.Mesh(projectileGeometry, projectileMaterial);

    projectileMesh.position.copy(player.position);
    projectileMesh.rotation.x = -Math.PI / 2;  // Flach auf der Karte liegend
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
function animate() {
    requestAnimationFrame(animate);

    if (!renderer) {
        console.error('❌ Renderer wurde nicht richtig initialisiert!');
        return;
    }

    for (let player of players) {
        player.lookAt(camera.position);
    }

    for (let player of players) {
        const direction = targetPosition.clone().sub(player.position).normalize();
        player.position.add(direction.multiplyScalar(moveSpeed * (player.size / 20)));
        player.position.x = Math.max(-gridSize / 2, Math.min(gridSize / 2, player.position.x));
        player.position.z = Math.max(-gridSize / 2, Math.min(gridSize / 2, player.position.z));
    }

    checkFoodCollision();
    updateGrowth();
    mergePlayers();

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
    if (players.length > 0) {
        camera.position.x += (players[0].position.x - camera.position.x) * 0.1;
        camera.position.y = players[0].position.y + 2500;
        camera.position.z = players[0].position.z + 1100;
        camera.lookAt(players[0].position.x, players[0].position.y, players[0].position.z);
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

// ✅ Spieler wird NUR EINMAL erstellt, nicht in der Funktion selbst
createPlayer(40, new THREE.Vector3(0, 40, 0));

// ✅ Fenster-Resize-Handler
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

animate();

