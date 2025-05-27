// game.js – Teil 1: Imports und Basisvariablen
import * as THREE from "three"; // Stelle sicher, dass THREE korrekt importiert ist

// Debugging-Log hinzufügen, um sicherzustellen, dass THREE verfügbar ist
console.log("🔍 THREE verfügbar:", THREE);

import { ejectMass, updateEjectedMass, checkEjectedMassCollision } from "./js/ejectMass.js";
import { shootLaser, updateLasers, playerLasers } from "./js/laserShots.js";
import { showBossRadius, hideBossRadius } from "./js/bossRadius.js";
import { updatePlayerPath } from './js/playerPath.js';
import { FBXLoader } from './js/FBXLoader.js';
import { preloadBoss, loadedBossModel, preloadAllGameData } from './js/assetLoader.js';

// --- ALLE GLOBALEN VARIABLEN OBEN DEKLARIEREN ---
let scene, renderer, camera, foodHeight, foodCount, foodMesh, foodPositions, players, gridSize, gridMaterial, gridHelper, ambientLight, textureLoader, metalTextures, glassTextures, groundTexture, playerTexture, foodMaterial, foodGeometry, foodPool, inactiveFoodIndices, bossUFO, bossCenter, bossRadius, bossSpawned, ufoTime, bossSpeed, preloadedAssets, endTime, cameraAngle, targetCameraAngle, START_SIZE, clock, loader, bossHP;

// Steuerungs- und Bewegungsvariablen initialisieren
let inputDirection = { x: 0, z: 0 };
let lastMoveDirection = null;
let mouseActive = false;
let mouseTarget = null;

// Kamera-Konstante ergänzen!
const CAMERA_ROTATE_SPEED = 0.08;

// Dummy-Funktion für Boss-VoiceLine, damit kein Fehler mehr kommt
function playRandomVoiceLine() {
  // Hier kannst du später echte Sounds abspielen
  console.log('🔊 (Dummy) Boss-VoiceLine!');
}

// --- SPIELER-ERSTELLUNG MUSS HIER STEHEN ---
function createPlayer(size, position, isSplit = false, skin, playerId) {
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
  const playerGeom = new THREE.PlaneGeometry(size, size);
  const mesh = new THREE.Mesh(playerGeom, dynamicMaterial);
  mesh.position.copy(position);
  mesh.position.y += 2;
  mesh.size = size;
  mesh.score = size;
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.y = 0;
  mesh.rotation.z = 0;
  mesh.playerId = playerId;
  mesh.scale.set(1, 1, 1); // Standardgröße
  scene.add(mesh);
  players.push(mesh);
  return mesh;
}

// --- DOMContentLoaded: EINZIGE Initialisierung! ---
window.addEventListener("DOMContentLoaded", async () => {
  // --- SZENE & RENDERER ---
  scene = new THREE.Scene();
  renderer = new THREE.WebGLRenderer({
    powerPreference: "high-performance",
    antialias: false,
    alpha: false
  });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setPixelRatio(1);
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.toneMappingExposure = 1;
  renderer.shadowMap.enabled = false;
  document.body.appendChild(renderer.domElement);

  // --- KAMERA ---
  camera = new THREE.PerspectiveCamera(80, window.innerWidth / window.innerHeight, 0.1, 50000);
  camera.position.set(0, 10, 10);
  camera.lookAt(0, 0, 0);

  // --- MAP & FOOD ---
  gridSize = 4000;
  foodCount = 4000;
  foodHeight = -9;
  foodMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 0.9, 1) });
  foodGeometry = new THREE.IcosahedronGeometry(1.2, 2);
  foodMesh = new THREE.InstancedMesh(foodGeometry, foodMaterial, foodCount);
  foodPositions = new Map();
  foodPool = Array.from({ length: foodCount }, (_, i) => ({ position: null }));
  inactiveFoodIndices = Array.from({ length: foodCount }, (_, i) => i);

  // --- GRID & LICHT ---
  gridMaterial = new THREE.LineBasicMaterial({
    color: 0x001100,
    linewidth: 5,
    polygonOffset: true,
    polygonOffsetFactor: -1,
    polygonOffsetUnits: -1
  });
  gridHelper = new THREE.GridHelper(gridSize, 300);
  gridHelper.material = gridMaterial;
  gridHelper.position.y = -10;
  scene.add(gridHelper);
  ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
  scene.add(ambientLight);

  // --- TEXTUREN ---
  textureLoader = new THREE.TextureLoader();
  metalTextures = {
    map: textureLoader.load("/textures/UFO2_Metal_BaseColor.png"),
    emissiveMap: textureLoader.load("/textures/UFO2_Metal_Emissive.png"),
    normalMap: textureLoader.load("/textures/UFO2_Metal_Normal.png"),
    roughnessMap: textureLoader.load("/textures/UFO2_Metal_Roughness.png"),
    metalnessMap: textureLoader.load("/textures/UFO2_Metal_Metallic.png")
  };
  glassTextures = {
    map: textureLoader.load("/textures/UFO2_Glass_BaseColor.png"),
    normalMap: textureLoader.load("/textures/UFO2_Glass_Normal.png"),
    roughnessMap: textureLoader.load("/textures/UFO2_Glass_Roughness.png")
  };
  groundTexture = textureLoader.load("textures/platform1.jpg", (texture) => {
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(40, 40);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    texture.needsUpdate = true;
  });
  playerTexture = textureLoader.load("textures/playerSkinredalien1.png", (texture) => {
    texture.wrapS = THREE.ClampToEdgeWrapping;
    texture.wrapT = THREE.ClampToEdgeWrapping;
    texture.repeat.set(1, 1);
    texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    texture.flipY = false;
    texture.needsUpdate = true;
    texture.center.set(0.5, 0.5);
  });

  // --- SPIELER ---
  players = [];
  START_SIZE = 10; // Standardgröße auf 10 setzen
  const defaultPlayer = {
    size: 10,
    x: 0,
    z: 0,
    skin: "textures/playerSkinredalien1.png",
    id: "local-player"
  };
  createPlayer(defaultPlayer.size, new THREE.Vector3(defaultPlayer.x, 40, defaultPlayer.z), false, defaultPlayer.skin, defaultPlayer.id);

  // --- FOOD SPAWNEN ---
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
  foodMesh.count = foodPositions.size;
  foodMesh.instanceMatrix.needsUpdate = true;
  if (!scene.children.includes(foodMesh)) scene.add(foodMesh);

  // --- BOSS-VARIABLEN ---
  bossUFO = null;
  bossCenter = new THREE.Vector3();
  bossRadius = 300;
  bossSpawned = false;
  ufoTime = 0;
  bossSpeed = 0.3;
  bossHP = 500;

  // --- TIMER & KAMERA ---
  endTime = Date.now() + 20 * 60 * 1000;
  cameraAngle = 0;
  targetCameraAngle = 0;
  clock = new THREE.Clock();

  // --- FBX LOADER ---
  loader = new FBXLoader();

  // --- PRELOADING ---
  preloadedAssets = await preloadAllGameData();
  setTimeout(() => {
    triggerBossEvent(preloadedAssets);
  }, 5000);

  // --- RENDER-LOOP STARTEN (nur einmal) ---
  if (typeof window._gameLoopStarted === 'undefined') {
    window._gameLoopStarted = true;
    animate();
  }

  // --- HUD SICHTBAR MACHEN ---
  const gameCanvas = document.getElementById("gameCanvas");
  if (gameCanvas) gameCanvas.style.display = "block";
  const hud = document.getElementById("hud");
  if (hud) hud.style.display = "block";

  // --- EVENT-HANDLER REGISTRIEREN (jetzt ist alles initialisiert!) ---
  window.addEventListener("mousemove", (e) => {
    const rect = renderer.domElement.getBoundingClientRect();
    window._lastMouseX = e.clientX - rect.left;
    window._lastMouseY = e.clientY - rect.top;
    const mouse = new THREE.Vector2(
      ((window._lastMouseX) / rect.width) * 2 - 1,
      -((window._lastMouseY) / rect.height) * 2 + 1
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    // Raycast auf Boden (Y=0)
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const intersect = new THREE.Vector3();
    if (raycaster.ray.intersectPlane(plane, intersect)) {
      mouseTarget = intersect;
    }
  });
  window.addEventListener("mouseleave", () => {
    mouseActive = false;
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "a") {
      targetCameraAngle += Math.PI / 72;
      e.preventDefault();
      return;
    }
    if (e.key === "d") {
      targetCameraAngle -= Math.PI / 72;
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowLeft") inputDirection.x = -1;
    if (e.key === "ArrowRight") inputDirection.x = 1;
    if (e.key === "w" || e.key === "ArrowUp") inputDirection.z = -1;
    if (e.key === "s" || e.key === "ArrowDown") inputDirection.z = 1;
    if (e.key === "q") {
      if (players.length > 0) ejectMass(players[0], scene, foodMaterial, foodPositions, foodMesh);
    }
    if (e.key === "e") {
      if (players.length > 0) {
        const rect = renderer.domElement.getBoundingClientRect();
        let mouseX = window._lastMouseX !== undefined ? window._lastMouseX : rect.width / 2;
        let mouseY = window._lastMouseY !== undefined ? window._lastMouseY : rect.height / 2;
        const mouse = new THREE.Vector2(
          ((mouseX) / rect.width) * 2 - 1,
          -((mouseY) / rect.height) * 2 + 1
        );
        shootLaser(players[0], scene, mouse, camera);
      }
    }
  });
  document.addEventListener("keyup", (e) => {
    if (["w", "ArrowUp", "s", "ArrowDown"].includes(e.key)) inputDirection.z = 0;
    if (["ArrowLeft", "ArrowRight"].includes(e.key)) inputDirection.x = 0;
  });
  window.addEventListener('resize', () => {
    renderer.setSize(window.innerWidth, window.innerHeight);
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
  });

  // Am Ende von DOMContentLoaded (nach HUD sichtbar machen):
  // Entferne alle Geister-UFOs
  scene.children = scene.children.filter(obj => {
    if (obj.name === "" && obj.type === "Group") {
      console.warn("🧹 Entferne Geister-UFO:", obj.position);
      return false;
    }
    return true;
  });
});

// --- Boss-Spawn-Logik: UFO exakt im Kreis, Kreis und Pfad anzeigen ---
export function triggerBossEvent(assets) {
  console.log('🟡 triggerBossEvent() gestartet');

  const x = Math.random() * gridSize - gridSize / 2;
  const z = Math.random() * gridSize - gridSize / 2;
  bossRadius = 400;

  bossCenter = new THREE.Vector3(x, 25, z);
  window.bossEvent = { x, y: z };

  playRandomVoiceLine();

  const music = document.getElementById("boss-music");
  if (music) {
    music.currentTime = 0;
    music.play().catch(e => console.warn("🔇 Bossmusik konnte nicht abgespielt werden:", e));
  }

  // ❌ Entferne ALLE alten UFOs aus Szene (auch die, die beim Laden still reingeladen wurden)
  scene.children = scene.children.filter(obj => {
    const isGeisterUFO =
      obj.name?.toLowerCase().includes("ufo") ||
      obj.name?.includes("Boss") ||
      obj.type === "Group" && obj.children?.some(c => c.name?.toLowerCase().includes("ufo"));
    if (isGeisterUFO) {
      console.warn("🧹 Entferne GEISTER-UFO:", obj);
      return false;
    }
    return true;
  });

  // ✅ Klone Modell & skaliere es korrekt
  bossUFO = assets.model.clone();
  bossUFO.name = "AnimatedBossUFO";
  bossUFO.scale.set(0.012, 0.012, 0.012);
  bossUFO.visible = true;
  bossUFO.position.copy(bossCenter);

  bossUFO.traverse(child => {
    if (child.isMesh) {
      child.visible = true;
      child.castShadow = false;
      child.receiveShadow = false;
    }
  });

  scene.add(bossUFO);
  bossSpawned = true;

  showBossRadius(scene, x, z, bossRadius);

  const indicator = document.getElementById("event-indicator");
  if (indicator) {
    indicator.textContent = "BOSS FIGHT";
    indicator.style.display = "block";
    indicator.style.color = "red";
    indicator.style.fontSize = "32px";
  }

  const bossUI = document.getElementById("boss-ui");
  if (bossUI) bossUI.style.display = "block";

  console.log("✅ BossUFO korrekt eingefügt:", bossUFO.position);
}

function endBossFight() {
  hideBossRadius(scene);
  const music = document.getElementById("boss-music");
  if (music) music.pause();
  const indicator = document.getElementById("event-indicator");
  if (indicator) indicator.style.display = "none";
}

function handleBossKilled() {
  console.log("🟡 Boss wurde getötet!");
  bossSpawned = false;
  ufoTime = 0;
  if (bossUFO) {
    scene.remove(bossUFO);
    bossUFO = null;
  }
  hideBossRadius(scene);
  const music = document.getElementById("boss-music");
  if (music) music.pause();
  const indicator = document.getElementById("event-indicator");
  if (indicator) {
    indicator.textContent = "BOSS KILLED";
    indicator.style.color = "yellow";
  }
  const bossUI = document.getElementById("boss-ui");
  if (bossUI) bossUI.style.display = "none";
}

// --- ANIMATE LOOP ---
function animate() {
  requestAnimationFrame(animate);
  if (!renderer) return;
  const delta = clock.getDelta();
  ufoTime += delta;
  console.log("🕓 ufoTime:", ufoTime.toFixed(2), "| angle:", (ufoTime * bossSpeed).toFixed(2));

  // --- BOSS UFO BEWEGUNG IM KREIS ---
  if (bossSpawned && bossUFO) {
    const angle = ufoTime * bossSpeed;
    const orbitRadius = bossRadius * 0.85;

    const x = bossCenter.x + Math.cos(angle) * orbitRadius;
    const z = bossCenter.z + Math.sin(angle) * orbitRadius;

    bossUFO.position.set(x, 25, z);
    bossUFO.rotation.y += delta * 0.5;

    bossUFO.visible = true;

    if (!scene.children.includes(bossUFO)) {
      scene.add(bossUFO); // failsafe
    }
  }

  updatePlayerMovement();
  updateLasers(scene, players);
  updateEjectedMass();
  checkEjectedMassCollision(players, scene, foodMesh);
  updateCamera();
  checkFoodCollision();
  checkProjectileCollision();

  // --- LILA PFAD ZUM BOSS-EVENT ---
  if (bossSpawned && players.length > 0) {
    updatePlayerPath(players[0], window.bossEvent, scene);
  }

  renderer.render(scene, camera);
  updateGameTimer();
}

function checkFoodCollision() {
  if (players.length === 0) return;
  const player = players[0];
  let absorbedAny = false;
  for (let i = 0; i < foodCount; i++) {
    const entry = foodPool[i];
    if (!entry.position) continue;
    const pos = entry.position;
    const dx = player.position.x - pos.x;
    const dz = player.position.z - pos.z;
    const dist = Math.sqrt(dx * dx + dz * dz);
    if (dist < player.size * 1.3 + foodSize) {
      // Absorb food: mark as inactive
      player.targetSize = (player.targetSize || player.size) + 0.13;
      player.score = Math.round(player.targetSize);
      entry.position = null;
      inactiveFoodIndices.push(i);
      // Move instance far away so it's not visible
      const matrix = new THREE.Matrix4().setPosition(99999, 99999, 99999);
      foodMesh.setMatrixAt(i, matrix);
      absorbedAny = true;
    }
  }
  if (absorbedAny) {
    foodMesh.instanceMatrix.needsUpdate = true;
  }
}

// --- PROJECTILE COLLISION (NOOP) ---
function checkProjectileCollision() {
  // Hier kann später Kollisionserkennung für Projektile ergänzt werden
}

// game.js – Teil 5: Kamera und Animation
function updateCamera() {
  if (players.length === 0) return;
  // Smoothes Interpolieren der Kamera-Rotation
  cameraAngle += (targetCameraAngle - cameraAngle) * CAMERA_ROTATE_SPEED;
  const player = players[0];
  const baseRadius = 18;
  const baseHeight = 18;
  const zoomFactor = Math.max(1, player.size / 40);
  const radius = baseRadius * zoomFactor;
  const height = baseHeight * zoomFactor;
  const camX = player.position.x + Math.sin(cameraAngle) * radius;
  const camZ = player.position.z + Math.cos(cameraAngle) * radius;
  const camY = player.position.y + height;
  camera.position.set(camX, camY, camZ);
  camera.lookAt(player.position.x, player.position.y, player.position.z);
}

// --- AGAR.IO-STYLE: Immer Bewegung Richtung Maus oder Kamera, kein Stottern ---
function updatePlayerMovement() {
  if (players.length === 0) return;
  const player = players[0];
  let dir = new THREE.Vector3(0, 0, 0);
  let usedInput = false;

  // WASD Richtung (jetzt relativ zur Kamera für 360°-Steuerung)
  if (inputDirection.x !== 0 || inputDirection.z !== 0) {
    // Drehe die Eingabe um den cameraAngle (Welt bleibt, Steuerung rotiert)
    const angle = cameraAngle;
    const forward = new THREE.Vector3(Math.sin(angle), 0, Math.cos(angle));
    const right = new THREE.Vector3(Math.sin(angle + Math.PI / 2), 0, Math.cos(angle + Math.PI / 2));
    dir.add(forward.multiplyScalar(inputDirection.z));
    dir.add(right.multiplyScalar(inputDirection.x));
    if (dir.length() > 0.01) dir.normalize();
    lastMoveDirection = dir.clone();
    usedInput = true;
  }

  // Maussteuerung (bleibt wie gehabt, Welt bleibt statisch)
  if (!usedInput && mouseTarget) {
    const mouseDir = mouseTarget.clone();
    mouseDir.y = player.position.y;
    let mouseMove = mouseDir.sub(player.position);
    mouseMove.y = 0;
    if (mouseMove.length() > 0.01) {
      mouseMove.normalize();
      dir.copy(mouseMove);
      lastMoveDirection = mouseMove.clone();
      usedInput = true;
    }
  }

  // Wenn keine Eingabe, laufe in die letzte Richtung weiter
  if (!usedInput && lastMoveDirection && lastMoveDirection.length() > 0.01) {
    dir.copy(lastMoveDirection);
  }

  if (dir.length() > 0.01) {
    dir.normalize();
    // Geschwindigkeit nimmt mit Größe ab, aber weniger stark (ähnlich Agar.io)
    const minSpeed = 1.2; // Minimalgeschwindigkeit
    const maxSpeed = 2.8; // Maximalgeschwindigkeit
    // Geschwindigkeit nimmt logarithmisch ab, nicht linear
    const speed = Math.max(minSpeed, maxSpeed - Math.log2(player.size / START_SIZE + 1) * 0.7);
    player.position.add(dir.multiplyScalar(speed));
  }

  // --- MAP-RAND-BEGRANZUNG ---
  const halfMap = gridSize / 2;
  const margin = player.size * 1.25;
  player.position.x = Math.max(-halfMap + margin, Math.min(halfMap - margin, player.position.x));
  player.position.z = Math.max(-halfMap + margin, Math.min(halfMap - margin, player.position.z));

  // Mausziel nur für einen Frame aktiv lassen
  mouseTarget = null;
}

// Debugging-Log hinzufügen, um sicherzustellen, dass die Szene korrekt initialisiert ist
console.log("🔍 Szene initialisiert:", scene);

function updateGameTimer() {
  const now = Date.now();
  const remaining = Math.max(0, endTime - now);
  const minutes = Math.floor(remaining / 60000).toString().padStart(2, '0');
  const seconds = Math.floor((remaining % 60000) / 1000).toString().padStart(2, '0');
  const timerElement = document.querySelector('#timer .hud-value');
  if (timerElement) timerElement.textContent = `${minutes}:${seconds}`;
}


