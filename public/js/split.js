// ✅ Import dependencies
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@latest/build/three.module.js';
import { createPlayer } from './game.js'; 

export let lastSplitTime = 0;
export let splitCooldown = 10000; // 10 Sekunden Cooldown

export function splitPlayer(player, scene, players) {
    if (player.size <= 100) {
        console.log('❌ Spieler zu klein zum Teilen!');
        return;
    }

    if (Date.now() - lastSplitTime < splitCooldown) {
        console.log('⏳ Cooldown noch aktiv!');
        return;
    }

    lastSplitTime = Date.now();
    let newSize = player.size / 2;
    player.size = newSize; // ✅ Reduce original player size

    let direction = new THREE.Vector3(1, 0, 0).applyQuaternion(player.quaternion).normalize();
    let offsetDistance = player.size * 1.5; 

    let newPlayerPosition = player.position.clone().addScaledVector(direction, offsetDistance);

    let newPlayer = createPlayer(newSize, newPlayerPosition, true);
    newPlayer.velocity = direction.multiplyScalar(50); 

    players.push(newPlayer);
    scene.add(newPlayer);

    console.log('✅ Spieler wurde geteilt!');
}

export function updateSplitPlayers(players) {
    players.forEach(player => {
        if (player.velocity) {
            player.position.add(player.velocity);
            player.velocity.multiplyScalar(0.92); // ✅ Slow down over time
            if (player.velocity.length() < 0.1) {
                player.velocity.set(0, 0, 0);
            }
        }
    });
}

export function mergePlayers(players, scene) {
    let mergedPlayers = [];
    
    for (let i = 0; i < players.length; i++) {
        let p1 = players[i];
        for (let j = i + 1; j < players.length; j++) {
            let p2 = players[j];

            if (p1.isSplit && p2.isSplit && p1.position.distanceTo(p2.position) < 1) {
                p1.size += p2.size;
                scene.remove(p2);
                mergedPlayers.push(p2);
                p1.isSplit = false;
            }
        }
    }

    players = players.filter(p => !mergedPlayers.includes(p));
}
