export const textures = ['spike-0.png', 'spike-1.png', 'spike-2.png', 'spike-3.png', 'spike-4.png', 'spike-5.png'];

export function processTick(tiles, dt, time) {
  // Cyclicly animate spike tiles
  const spikeFrame = Math.floor((time / 150) % textures.length);
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y].length; x++) {
      const tile = tiles[y][x];
      if (tile&&tile.type==='spike') {
        tile.texture = textures[spikeFrame];
      }
    }
  }
}