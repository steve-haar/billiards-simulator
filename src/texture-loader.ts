import * as THREE from "three";

const textureLoader = new THREE.TextureLoader();

export function getDiffuseMaterial(file: string) {
  return new THREE.MeshStandardMaterial({
    map: textureLoader.load(`/textures/${file}`),
  });
}

export function getStandardMaterial(name: string, ext: string) {
  const textures = getTextures(name, ext);

  return new THREE.MeshStandardMaterial({
    aoMap: textures.ao,
    map: textures.diffuse,
    normalMap: textures.normal,
    roughnessMap: textures.roughness,
  });
}

function getTextures(name: string, ext: string) {
  return {
    ao: textureLoader.load(`/textures/${name}/ao.${ext}`),
    diffuse: textureLoader.load(`/textures/${name}/diffuse.${ext}`),
    normal: textureLoader.load(`/textures/${name}/normal.${ext}`),
    roughness: textureLoader.load(`/textures/${name}/roughness.${ext}`),
  };
}
