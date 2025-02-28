// ===================== PART 1 =====================
// --- Imports ---
import * as THREE from "three";
import { ejectMass, updateEjectedMass, checkEjectedMassCollision } from "./js/ejectMass.js";
import { shootLaser, updateLasers, playerLasers } from "./js/laserShots.js";

// Globale Variablen & Clock
const clock = new THREE.Clock();
let players = []; // Array für individuelle Spieler-Meshes
let endTime = Date.now() + 20 * 60 * 1000; // 20 Minuten Timer

// updateState: Wird vom Colyseus-Raum-Event aufgerufen
export function updateState(state) {
  // state.players ist ein MapSchema: { sessionId: { ... }, ... }
  const statePlayers = state.players;
  // Aktualisiere vorhandene Spieler oder erstelle neue, falls nötig
  for (const id in statePlayers) {
    const data = statePlayers[id];
    let mesh = players.find(p => p.playerId === id);
    if (mesh) {
      mesh.position.set(data.x, 40, data.z);
      mesh.size = data.size;
      mesh.score = data.score;
    } else {
      // Erstelle neuen Spieler
      mesh = createPlayer(data.size || 40, new THREE.Vector3(data.x, 40, data.z), false, data.skin, id);
    }
  }
  // Optional: Entferne Spieler, die nicht mehr im state sind
  players = players.filter(p => statePlayers[p.playerId]);
}
// ===================== PART 2 =====================
// Szenen- und Renderer-Setup
const scene = new THREE.Scene();
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

// Kamera-Setup
const camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 50000);
camera.position.set(0, 10, 10);
camera.lookAt(0, 0, 0);


// ===================== PART 3 =====================
// Grid & Map
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
scene.add(gridHelper);

// Ambient Light
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

// Ground
const textureLoader = new THREE.TextureLoader();
const groundTexture = textureLoader.load("textures/platform1.jpg", (texture) => {
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

// Spieler-Textur
const playerTexture = textureLoader.load("textures/playerSkinredalien1.png", (texture) => {
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.repeat.set(1, 1);
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
  texture.flipY = false;
  texture.needsUpdate = true;
  texture.center.set(0.5, 0.5);
});


// ===================== PART 4 =====================
// Spieler-Erstellung als individuelle Meshes
export function createPlayer(size, position, isSplit = false, skin, playerId) {
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
  mesh.playerId = playerId;
  scene.add(mesh);
  players.push(mesh);
  return mesh;
}

// Food Particles Setup
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


// ===================== PART 5 =====================
// Update Camera: Nutzt den Durchschnitt aller Spielerpositionen
function updateCamera() {
  if (players.length === 0) return;
  const avgPosition = new THREE.Vector3(0, 0, 0);
  players.forEach(player => {
    avgPosition.add(player.position);
  });
  avgPosition.divideScalar(players.length);
  // Fester Offset, z.B. 800 Einheiten nach oben und hinten
  const offset = new THREE.Vector3(0, 800, 800);
  camera.position.copy(avgPosition).add(offset);
  camera.lookAt(avgPosition);
  console.log("Avg Position:", avgPosition, "Camera:", camera.position);
}

function updatePlayerMovement() {
  // Hier kannst du Eingaben verarbeiten und Bewegungsdaten ggf. an den Server senden
}

function checkFoodCollision() {
  // Implementiere Kollisionserkennung zwischen Spielern und Food
}

function checkProjectileCollision() {
  // Implementiere Kollisionserkennung für Projektile
}

function updateHUD() {
  const scoreElement = document.getElementById("scoreCounter");
  if (players.length > 0 && scoreElement) {
    scoreElement.innerText = Math.floor(players[0].size);
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (!renderer) return;
  const delta = clock.getDelta();
  
  updatePlayerMovement();
  updateLasers(scene, players);
  updateEjectedMass();
  checkEjectedMassCollision(players, scene);
  
  updateCamera();
  
  checkFoodCollision();
  checkProjectileCollision();
  
  let remainingTime = Math.max(0, Math.floor((endTime - Date.now()) / 1000));
  let minutes = Math.floor(remainingTime / 60);
  let seconds = remainingTime % 60;
  const timerElement = document.getElementById("timer");
  if (timerElement) {
    timerElement.innerText = `Time: ${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;
  }
  
  const leaderboardElement = document.getElementById("leaderboard-list");
  if (leaderboardElement) {
    let sortedPlayers = players.slice().sort((a, b) => b.size - a.size).slice(0, 10);
    leaderboardElement.innerHTML = sortedPlayers.map((p, i) =>
      `<li>#${i + 1}: Score ${Math.floor(p.size)}</li>`
    ).join("");
  }
  
  players.forEach(player => {
    let distanceToCamera = camera.position.distanceTo(player.position);
    player.visible = (distanceToCamera <= 10000);
    playerLasers.set(player, 3);
  });
  
  renderer.render(scene, camera);
}
animate();

document.addEventListener("keydown", (event) => {
  if (event.key === "e" && players.length > 0) {
    shootLaser(players[0], scene, targetPosition);
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "w" && players.length > 0) {
    ejectMass(players[0], scene, foodMaterial);
  }
});

// FBXLoader und Beispielobjekt laden
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
const loader = new FBXLoader();

function loadObject(path, scale, position, isRunestone = false) {
  loader.load(path, (fbx) => {
    fbx.scale.set(scale, scale, scale);
    fbx.position.copy(position);
    fbx.updateMatrixWorld(true);
    fbx.traverse((child) => {
      if (child.isMesh) {
        if (isRunestone && child.name.toLowerCase().includes("crystal")) {
          child.material = new THREE.MeshPhysicalMaterial({
            map: textureLoader.load("textures/Diffuse_cristal.jpg"),
            normalMap: textureLoader.load("textures/Normal_cristal.jpg"),
            emissiveMap: textureLoader.load("textures/Emission_cristal.jpg"),
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
  }, undefined, (error) => {
    console.error("❌ Error loading FBX:", error);
  });
}
