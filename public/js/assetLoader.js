import { FBXLoader } from './FBXLoader.js';
import * as THREE from 'three';

const loadingManager = new THREE.LoadingManager();
const textureLoader = new THREE.TextureLoader(loadingManager);
const fbxLoader = new FBXLoader(loadingManager);

// Speicherort für geladenen Boss
export let loadedBossModel = null;

export class AssetLoader {
    constructor() {
        this.textures = {};
        this.model = null;
    }

    async preloadTextures() {
        const textureLoader = new THREE.TextureLoader();
        const texturePaths = [
            "/textures/UFO2_Metal_BaseColor.png",
            "/textures/UFO2_Metal_Emissive.png",
            "/textures/UFO2_Metal_Normal.png",
            "/textures/UFO2_Metal_Roughness.png",
            "/textures/UFO2_Metal_Metallic.png",
            "/textures/UFO2_Glass_BaseColor.png",
            "/textures/UFO2_Glass_Normal.png",
            "/textures/UFO2_Glass_Roughness.png"
        ];

        for (const path of texturePaths) {
            if (!this.textures[path]) {
                this.textures[path] = await new Promise((resolve, reject) => {
                    textureLoader.load(
                        path,
                        (texture) => resolve(texture),
                        undefined,
                        (error) => reject(`Fehler beim Laden der Textur: ${path}`)
                    );
                });
            }
        }
    }

    async preloadModel() {
        const loader = new FBXLoader();
        if (!this.model) {
            this.model = await new Promise((resolve, reject) => {
                loader.load(
                    "/models/UFO2.fbx",
                    (fbx) => resolve(fbx),
                    undefined,
                    (error) => reject("Fehler beim Laden des Modells UFO2.fbx")
                );
            });
        }
    }

    async preloadAll() {
        await Promise.all([this.preloadTextures(), this.preloadModel()]);
    }
}

// Ladeanzeige
loadingManager.onStart = () => {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) loadingIndicator.style.display = 'block';
};

loadingManager.onLoad = () => {
  const loadingIndicator = document.getElementById('loading-indicator');
  if (loadingIndicator) loadingIndicator.style.display = 'none';

  // Starte Spiel erst jetzt!
  if (typeof window.startGame === 'function') {
    window.startGame();
  }
};

// Aktualisiere die Texturen für UFO2.fbx
export function preloadBoss() {
  return new Promise((resolve, reject) => {
    fbxLoader.load(
      'models/UFO2.fbx',
      (fbx) => {
        fbx.traverse((child) => {
          if (child.isMesh) {
            // Debug: Logge alle Material- und Texturpfade
            console.log('Mesh:', child.name);
            if (child.material) {
              console.log('  Material:', child.material.name || '(kein Name)');
              if (child.material.map) console.log('  map:', child.material.map.name || child.material.map);
              if (child.material.normalMap) console.log('  normalMap:', child.material.normalMap.name || child.material.normalMap);
              if (child.material.roughnessMap) console.log('  roughnessMap:', child.material.roughnessMap.name || child.material.roughnessMap);
              if (child.material.metalnessMap) console.log('  metalnessMap:', child.material.metalnessMap.name || child.material.metalnessMap);
              if (child.material.emissiveMap) console.log('  emissiveMap:', child.material.emissiveMap.name || child.material.emissiveMap);
            }

            child.material.map = textureLoader.load('/textures/UFO2_Metal_BaseColor.png');
            child.material.emissiveMap = textureLoader.load('/textures/UFO2_Metal_Emissive.png');
            child.material.normalMap = textureLoader.load('/textures/UFO2_Metal_Normal.png');
            child.material.roughnessMap = textureLoader.load('/textures/UFO2_Metal_Roughness.png');
            child.material.metalnessMap = textureLoader.load('/textures/UFO2_Metal_Metallic.png');

            if (child.name.toLowerCase().includes('glass')) {
              child.material.map = textureLoader.load('/textures/UFO2_Glass_BaseColor.png');
              child.material.normalMap = textureLoader.load('/textures/UFO2_Glass_Normal.png');
              child.material.roughnessMap = textureLoader.load('/textures/UFO2_Glass_Roughness.png');
            }

            child.material.needsUpdate = true;

            // Debug: Logge UV-Attribute
            console.log('Mesh:', child.name, 'UVs:', child.geometry.attributes.uv);
          }
        });

        loadedBossModel = fbx;
        resolve(fbx);
      },
      undefined,
      (err) => {
        console.error('Fehler beim Laden des Boss-FBX:', err);
        reject(err);
      }
    );
  });
}

// Nur noch das neue Modell laden, keine Texturen mehr
export async function preloadAllGameData() {
  const loadedAssets = { model: null };
  const modelPromise = new Promise((resolve, reject) => {
    fbxLoader.load(
      '/models/UFO11.fbx',
      (fbx) => {
        loadedAssets.model = fbx;
        resolve(fbx);
      },
      undefined,
      (err) => reject(err)
    );
  });
  await modelPromise;
  return loadedAssets;
}