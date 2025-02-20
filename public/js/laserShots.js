import * as THREE from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';

const laserSpeed = 4550;
const laserLifeTime = 3000; // Laser disappears after 3 seconds
export let playerLasers = new Map(); // Stores remaining laser shots

let activeLasers = new Map(); // Tracks active lasers per player

export function shootLaser(player, scene, mouseTarget) {
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

    // 🔥 Laser Geometry & Material (Glow Effect)
    const laserGeometry = new THREE.CylinderGeometry(2, 2, 250, 16); // Thin laser beam
    const laserMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xff0000,  // 🔥 Red laser
    });

    const laser = new THREE.Mesh(laserGeometry, laserMaterial);
    
    // ✅ Position the laser correctly (same height as food)
    const laserStartPos = player.position.clone();
    laserStartPos.y = -30; // 🚀 Set laser to the food height
    laser.position.copy(laserStartPos);

    // ✅ Calculate direction towards the mouse
    let direction = new THREE.Vector3().subVectors(mouseTarget, laserStartPos).normalize();
    
    // ✅ Set the laser rotation towards the direction
    laser.lookAt(mouseTarget);

    laser.userData = { direction, lifeTime: laserLifeTime, shooter: player };
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
