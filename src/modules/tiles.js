export const tileTextures = {};

export function registerTile(tileKey, obj) {
  if (!tileKey || typeof tileKey !== 'string') {
    throw new Error(`registerTile: invalid tileKey: ${JSON.stringify(tileKey)}`);
  }
  if (tileTextures[tileKey]) {
    throw new Error(`registerTile: tileKey already registered: ${JSON.stringify(tileKey)}`);
  }
  const textureArray = (typeof obj === 'string' || (typeof obj === 'object' && obj instanceof Array)) ? obj : (obj.texture || obj.textures || obj.image || obj.images || []);
  tileTextures[tileKey] = textureArray;
}

registerTile("spike", {
  textures: ['./tiles/spike-0.png', './tiles/spike-1.png', './tiles/spike-2.png', './tiles/spike-3.png', './tiles/spike-4.png', './tiles/spike-5.png'],
});

registerTile("stone", {
  texture: "./tiles/stone.png",
});

registerTile("ice", {
  texture: "./tiles/ice.png",
});

registerTile("moving-wood", {
  texture: "./tiles/wood.png",
  width: 32,
  height: 16,
});

registerTile("wood", {
  texture: "./tiles/wood.png"
});

