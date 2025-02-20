// ✅ Import THREE.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';

// ✅ Store all ejected food particles
export let foodProjectiles = new Map(); 

let foodIdCounter = 0; 
const MAX_TRAVEL_DISTANCE = 200; 
const SHOOT_SPEED = 20; 
const FOOD_SIZE = 5; // ✅ The real game size remains the same

export function ejectMass(player, scene, foodMaterial, foodPositions, foodMesh) {
    if (player.size <= 70) {
        console.log('❌ Player is too small to eject mass!');
        return;
    }

    player.size -= FOOD_SIZE;  

    // ✅ Create a food sphere with real size
    let projectileGeometry = new THREE.SphereGeometry(FOOD_SIZE, 16, 16);
    let projectileMesh = new THREE.Mesh(projectileGeometry, foodMaterial);

    // ✅ Scale it visually without affecting mechanics
    projectileMesh.scale.set(2, 2, 2); // 🔥 Makes it look 2x bigger, but keeps mechanics the same ✅

    // ✅ White outline (for visibility)
    let outlineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.BackSide });
    let outlineMesh = new THREE.Mesh(new THREE.SphereGeometry(FOOD_SIZE * 1.5, 16, 16), outlineMaterial);
    outlineMesh.scale.set(1, 1, 1); // 🔥 Make the outline bigger as well ✅
    projectileMesh.add(outlineMesh); 

    // ✅ Position the food slightly in front of the player
    let direction = new THREE.Vector3(0, 0, -1);
    if (player.targetPosition) {
        direction = player.targetPosition.clone().sub(player.position).normalize();
    }
    
    projectileMesh.position.copy(player.position).add(direction.multiplyScalar(15));
    scene.add(projectileMesh);

    // ✅ Assign unique ID and movement properties
    let foodId = foodIdCounter++;
    projectileMesh.userData = {
        id: foodId,
        direction: direction.multiplyScalar(SHOOT_SPEED),
        size: FOOD_SIZE, 
        traveledDistance: 0
    };

    foodProjectiles.set(foodId, projectileMesh);
}

// ✅ Move Ejected Mass and Stop After Certain Distance
export function updateEjectedMass() {
    foodProjectiles.forEach((projectile, id) => {
        if (projectile.userData && projectile.userData.direction) {
            let travelStep = projectile.userData.direction.clone();
            projectile.position.add(travelStep);
            projectile.userData.traveledDistance += travelStep.length();

            projectile.userData.direction.multiplyScalar(0.8);

            if (projectile.userData.traveledDistance >= MAX_TRAVEL_DISTANCE || projectile.userData.direction.length() < 0.5) {
                projectile.userData.direction.set(0, 0, 0); 
                console.log(`⏹️ Ejected mass ${id} stopped moving.`);
            }
        }
    });
}

// ✅ Check Collision with Players
export function checkEjectedMassCollision(players, scene, foodPositions, foodMesh) {
    foodProjectiles.forEach((food, foodId) => {
        players.forEach(player => {
            let distance = player.position.distanceTo(food.position);
            let absorptionRadius = player.size * 1.3;

            if (distance < absorptionRadius) {
                console.log(`✅ Player ate ejected mass ID: ${foodId}`);
                
                player.size += 1;  

                scene.remove(food);
                foodProjectiles.delete(foodId);

                setTimeout(() => {
                    let newFoodPos = new THREE.Vector3(
                        Math.random() * 5000 - 2500,
                        -30, 
                        Math.random() * 5000 - 2500
                    );

                    foodPositions.set(foodId, newFoodPos);
                    let matrix = new THREE.Matrix4().setPosition(newFoodPos.x, newFoodPos.y, newFoodPos.z);
                    foodMesh.setMatrixAt(foodId, matrix);
                    foodMesh.instanceMatrix.needsUpdate = true;
                }, 10000);
            }
        });
    });
}
