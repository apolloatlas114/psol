import * as THREE from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';

const laserSpeed = 3200; // noch schneller
const laserLifeTime = 70; // verschwindet extrem schnell (0.07 Sekunden)
export let playerLasers = new Map(); // Stores remaining laser shots

let activeLasers = new Map(); // Tracks active lasers per player

// mouse: THREE.Vector2 (NDC), camera: THREE.Camera müssen übergeben werden!
export function shootLaser(player, scene, mouse, camera) {
    if (!playerLasers.has(player)) {
        playerLasers.set(player, 3); // ✅ Each player starts with 3 lasers
    }

    let remainingLasers = playerLasers.get(player);
    if (remainingLasers <= 0) {
        console.log("❌ No lasers left!");
        return; // 🚫 Player can't shoot more lasers
    }

    // ✅ Track active lasers per player
    if (!activeLasers.has(player)) {
        activeLasers.set(player, []);
    }
    let playerLaserList = activeLasers.get(player);

    if (playerLaserList.length >= 3) {
        console.log("🚫 Player already has 3 active lasers!");
        return; // 🚫 Prevent shooting more than 3 at once
    }

    playerLasers.set(player, remainingLasers - 1);
    console.log(`🔥 Laser fired by ${player.id}! Lasers left: ${remainingLasers - 1}`);

    // 🔥 Laser Geometry & Material (kleiner, dünner, kürzer, schneller)
    const laserRadius = 0.7; // dünner
    const laserLength = 60;  // kürzer
    const laserGeometry = new THREE.CylinderGeometry(laserRadius, laserRadius, laserLength, 16);
    const laserMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,  // 🔥 Red laser
    });

    const laser = new THREE.Mesh(laserGeometry, laserMaterial);

    // --- Raycasting von Kamera durch Maus auf Map-Ebene (foodHeight) ---
    const foodHeight = -9; // Muss identisch mit foodHeight in game.js sein!
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(mouse, camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -foodHeight);
    const laserTarget = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, laserTarget);

    // Startposition: Spielerposition auf foodHeight
    const laserStartPos = player.position.clone();
    laserStartPos.y = foodHeight;
    // Laser direkt vor die Spielfigur setzen (damit er "aus dem PNG" austritt)
    // Annahme: PNG/Spielfigur hat etwa Größe player.size, also Offset in Schussrichtung
    const spawnOffset = (player.size * 0.5) + (laserLength * 0.5); // vor die Figur
    // Richtung wird unten berechnet, daher erst mal nur Position setzen
    laser.position.copy(laserStartPos);

    // Richtung: Von Spieler zu Zielpunkt (wo die Maus auf die Map zeigt)
    let direction = new THREE.Vector3().subVectors(laserTarget, laserStartPos);
    if (direction.lengthSq() === 0) direction.set(0, 0, 1);
    else direction.normalize();

    // Zylinder exakt entlang der Richtung ausrichten (nur Quaternion, kein rotateX!)
    laser.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

    // Laser direkt vor die Spielfigur setzen (aus dem PNG austreten lassen)
    laser.position.add(direction.clone().multiplyScalar(spawnOffset));

    // Die Bewegungsrichtung exakt speichern (wichtig für updateLasers!)
    laser.userData = { direction: direction.clone(), lifeTime: laserLifeTime, shooter: player };
    laser.active = true;
    if (!player.userData.lasers) player.userData.lasers = [];
    player.userData.lasers.push(laser);
    scene.add(laser);
    playerLaserList.push(laser);
}

// ✅ Update laser movement
export function updateLasers(scene, players) {
    const delta = 16; // Approx. 60 FPS (adjust as needed)

    for (let [player, laserList] of activeLasers) {
        for (let i = laserList.length - 1; i >= 0; i--) {
            const laser = laserList[i];

            // ✅ Move laser towards the calculated direction
            laser.position.add(laser.userData.direction.clone().multiplyScalar(laserSpeed * (delta / 1000)));

            // ✅ Check collisions
            for (let targetPlayer of players) {
                if (targetPlayer !== laser.userData.shooter) { // Don't hit the shooter
                    const distance = laser.position.distanceTo(targetPlayer.position);
                    if (distance < targetPlayer.size * 0.5) {
                        console.log("💥 Player hit by laser!");
                        targetPlayer.size *= 0.95; // 🚀 Reduce size by 5%
                        scene.remove(laser);
                        laserList.splice(i, 1);
                        break;
                    }
                }
            }

            // ✅ Remove old lasers
            laser.userData.lifeTime -= delta;
            if (laser.userData.lifeTime <= 0) {
                scene.remove(laser);
                laserList.splice(i, 1);
            }
        }
    }
}
