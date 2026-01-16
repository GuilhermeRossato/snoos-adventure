export const tileMetadata = {};
export const tileTextures = {};

export const colorToTile = {
  '#000000': 'player',
  '#0000FF': 'water',
  '#FF0000': 'lava',
  '#ED1C24': 'lava',
  '#22B14C': 'enemy',
  "#B97A57": "moving-wood",
  "#C3C3C3": "exit",
};

/**
 * @type {Object<string,number[]>}
 */
export const colorValues = Object.fromEntries(
  Object.entries(colorToTile).map(([color]) => [color, [parseInt(color.substring(1, 3), 16), parseInt(color.substring(1 + 2, 3 + 2), 16), parseInt(color.substring(1 + 4, 3 + 4), 16)]])
);

export function registerTile(tileKey, obj) {
  if (!tileKey || typeof tileKey !== 'string') {
    throw new Error(`registerTile: invalid tileKey: ${JSON.stringify(tileKey)}`);
  }
  if (tileTextures[tileKey]) {
    throw new Error(`registerTile: tileKey already registered: ${JSON.stringify(tileKey)}`);
  }
  const textureArray = (typeof obj === 'string' || (typeof obj === 'object' && obj instanceof Array)) ? obj : (obj.texture || obj.textures || obj.image || obj.images || []);
  tileTextures[tileKey] = textureArray;
  if (typeof obj === 'object' && obj.color && typeof obj.color === 'string') {
    const color = obj.color.toUpperCase();
    colorToTile[color] = tileKey;
    const r = parseInt(color.substring(1, 3), 16);
    const g = parseInt(color.substring(1 + 2, 3 + 2), 16);
    const b = parseInt(color.substring(1 + 4, 3 + 4), 16);
    colorValues[color] = [r, g, b];
  }
  if (typeof obj === 'object' && obj.width && typeof obj.width === 'number') {
    (tileMetadata[tileKey] || (tileMetadata[tileKey] = {})).width = obj.width;
  }
  if (typeof obj === 'object' && obj.height && typeof obj.height === 'number') {
    (tileMetadata[tileKey] || (tileMetadata[tileKey] = {})).height = obj.height;
  }
}

registerTile("spike", {
  textures: ['./tiles/spike-0.png', './tiles/spike-1.png', './tiles/spike-2.png', './tiles/spike-3.png', './tiles/spike-4.png', './tiles/spike-5.png'],
});

registerTile("solid", {
  textures: "./tiles/solid.png",
  color: '#FF7F27',
  width: 16,
  height: 16,
});

registerTile("stone", {
  color: "#7F7F7F",
  texture: "./tiles/stone.png",
  width: 32,
  height: 16,
});

registerTile("ice", {
  texture: "./tiles/ice.png",
});

registerTile("lava", {
  color: "#ED1C24",
  texture: "./tiles/lava.png",
});

registerTile("moving-wood", {
  texture: "./tiles/wood.png",
  width: 32,
  height: 16,
});

registerTile("wood", {
  texture: "./tiles/wood.png"
});

