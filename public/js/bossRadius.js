// Zeichnet einen halbtransparenten lila Kreis (Radius) auf das Spielfeld mit Three.js
// Kann im animate-Loop von game.js verwendet werden
import * as THREE from "three";

let bossRadiusMesh = null;

/**
 * Erstellt oder aktualisiert einen lila Radius-Kreis auf dem Spielfeld.
 * @param {THREE.Scene} scene - Die Three.js Szene.
 * @param {number} x - X-Position (Weltkoordinate).
 * @param {number} y - Y-Position (Weltkoordinate).
 * @param {number} radius - Radius des Kreises.
 */
export function showBossRadius(scene, x, y, radius) {
    // Falls schon ein Kreis existiert, entferne ihn
    if (bossRadiusMesh) {
        scene.remove(bossRadiusMesh);
        bossRadiusMesh.geometry.dispose();
        bossRadiusMesh.material.dispose();
        bossRadiusMesh = null;
    }
    // Erstelle einen transparenten lila Kreis (als flache Scheibe)
    const geometry = new THREE.CircleGeometry(radius, 64);
    const material = new THREE.MeshBasicMaterial({ color: 0x8a2be2, transparent: true, opacity: 0.25 }); // Dunkleres Lila, etwas weniger Opazität
    bossRadiusMesh = new THREE.Mesh(geometry, material);
    bossRadiusMesh.position.set(x, 0.5, y); // Etwas tiefer gelegt
    bossRadiusMesh.rotation.x = -Math.PI / 2; // Flach auf Boden legen
    scene.add(bossRadiusMesh);

    // Optional: Debugging-Marker setzen
    const marker = new THREE.Mesh(
        new THREE.SphereGeometry(10, 12, 12),
        new THREE.MeshBasicMaterial({ color: 0xff0000 })
    );
    marker.position.set(x, 2, y); // y = Welt-Z
    scene.add(marker);
}

/**
 * Entfernt den Radius-Kreis wieder aus der Szene.
 * @param {THREE.Scene} scene
 */
export function hideBossRadius(scene) {
    if (bossRadiusMesh) {
        scene.remove(bossRadiusMesh);
        bossRadiusMesh.geometry.dispose();
        bossRadiusMesh.material.dispose();
        bossRadiusMesh = null;
    }
}
