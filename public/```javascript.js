```javascript
import * as THREE from 'three';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { TextureLoader } from 'three';

// ...existing code...

const fbxLoader = new FBXLoader();
const textureLoader = new TextureLoader();
let loadedBossModel = null;

export function preloadBoss() {
  return new Promise((resolve, reject) => {
    console.log('🔄 Starting to preload boss model and textures...');
    fbxLoader.load(
      'models/UFO2.fbx',
      (fbx) => {
        console.log('✅ Boss model loaded: UFO2.fbx');
        const texturesToLoad = {
          baseColor: 'textures/UFO2_BaseColor.png',
          normal: 'textures/UFO2_Normal.png',
          metallic: 'textures/UFO2_Metallic.png',
          roughness: 'textures/UFO2_Roughness.png',
        };

        const loadedTextures = {};
        let texturesLoaded = 0;

        // Preload all textures
        Object.entries(texturesToLoad).forEach(([key, texturePath]) => {
          textureLoader.load(
            texturePath,
            (texture) => {
              console.log(`✅ Texture loaded: ${texturePath}`);
              loadedTextures[key] = texture;
              texturesLoaded++;
              if (texturesLoaded === Object.keys(texturesToLoad).length) {
                // Apply preloaded textures to the model
                fbx.traverse((child) => {
                  if (child.isMesh) {
                    console.log(`🔄 Overriding textures for mesh: ${child.name}`);
                    child.material.map = loadedTextures.baseColor || null;
                    child.material.normalMap = loadedTextures.normal || null;
                    child.material.metalnessMap = loadedTextures.metallic || null;
                    child.material.roughnessMap = loadedTextures.roughness || null;

                    child.material.needsUpdate = true;
                  }
                });

                loadedBossModel = fbx;
                console.log('✅ All textures applied to boss model.');
                resolve(fbx); // Resolve only after all textures are applied
              }
            },
            undefined,
            (err) => {
              console.error(`❌ Error loading texture: ${texturePath}`, err);
              reject(err);
            }
          );
        });
      },
      undefined,
      (err) => {
        console.error('❌ Error loading boss model:', err);
        reject(err);
      }
    );
  });
}

// ...existing code...
```