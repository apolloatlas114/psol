import * as THREE from 'three';

let playerPath = null;

export function updatePlayerPath(player, bossEvent, scene) {
    console.log("🔍 Debugging player object:", player);
    console.log("🔍 Debugging bossEvent object:", bossEvent);

    if (!player || !player.position || !(player.position instanceof THREE.Object3D || player.position instanceof THREE.Vector3)) {
        console.warn("❌ Invalid player object or position:", player);
        return;
    }

    const playerPosition = player.position instanceof THREE.Vector3 ? player.position : player.position.clone();

    let bossEventPosition;
    if (bossEvent.isObject3D && bossEvent.position) {
        bossEventPosition = bossEvent.position;
    } else if (typeof bossEvent.x === "number" && typeof bossEvent.y === "number") {
        bossEventPosition = new THREE.Vector3(bossEvent.x, 0, bossEvent.y);
    } else {
        console.warn("❌ Invalid bossEvent object or coordinates:", bossEvent);
        return;
    }

    const yHeight = 5;
    const start = new THREE.Vector3(playerPosition.x, yHeight, playerPosition.z);
    const end = new THREE.Vector3(bossEventPosition.x, yHeight, bossEventPosition.z); // Achtung: .y = Z!

    const direction = new THREE.Vector3().subVectors(end, start).normalize();
    const offset = direction.clone().multiplyScalar(player.size * 0.55 || 5); // fallback wenn keine size
    start.add(offset);

    const length = start.distanceTo(end);
    if (isNaN(length)) {
        console.warn("❌ Länge des Pfads ist NaN – überprüfe Start/End:", start, end);
        return;
    }

    const mid = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);
    const quaternion = new THREE.Quaternion().setFromUnitVectors(
        new THREE.Vector3(0, 1, 0),
        direction
    );

    const playerPos = new THREE.Vector3(playerPosition.x, 0, playerPosition.z);
    const eventPos = new THREE.Vector3(bossEventPosition.x, 0, bossEventPosition.z);
    const distance = playerPos.distanceTo(eventPos);

    if (distance < 350) {
        // Pfad entfernen, falls vorhanden
        if (playerPath && scene.children.includes(playerPath)) {
            scene.remove(playerPath);
            playerPath.geometry.dispose();
            playerPath.material.dispose();
            playerPath = null;
        }
        return; // ⛔ Pfad NICHT neu erzeugen
    }

    // Überprüfung, ob die Szene korrekt definiert ist
    if (!scene || !scene.children) {
        console.error("❌ Scene ist nicht definiert oder hat keine Kinder:", scene);
        return;
    }

    // Falls der Pfad noch nicht existiert, erstelle ihn...
    if (!playerPath) {
        const geometry = new THREE.CylinderGeometry(0.3, 0.3, length, 12); // vorher: 1,1
        const material = new THREE.MeshBasicMaterial({
            color: 0xff00ff,
            transparent: true,
            opacity: 0.5
        });
        playerPath = new THREE.Mesh(geometry, material);
        scene.add(playerPath);
    } else {
        playerPath.geometry.dispose();
        playerPath.geometry = new THREE.CylinderGeometry(0.3, 0.3, length, 12);
    }

    playerPath.position.copy(mid);
    playerPath.setRotationFromQuaternion(quaternion);

    console.log("🔄 Player path updated:", { mid, quaternion, length });
}