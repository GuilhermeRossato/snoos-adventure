import { createMapSpriteMetadata } from "../modules/maps.js";

const offsets = [
  [-1, -1],// nw
  [0, -1], // north
  [1, -1], // ne
  [-1, 0], // west
  [1, 0],  // east
  [-1, 1],  // sw
  [0, 1],  // south
  [1, 1],  // se
];

/**
 * 
 * @param {*} x 
 * @param {*} y 
 * @param {*} spritePosMap 
 * @param {ReturnType<createMapSpriteMetadata>} spriteMetadata 
 * @returns 
 */
export function getTexturePosition(x, y, spritePosMap, spriteMetadata) {
  try {
    if (typeof x !== 'number' || typeof y !== 'number') {
      console.log('invalid coordinates', { x, y, typeX: typeof x, typeY: typeof y });
      return;
    }
    if (!spritePosMap) {
      console.log('spritePosMap is falsy', { x, y, spritePosMap });
      return;
    }
    const n = offsets.map(([dx, dy]) => spritePosMap.get(`${x + dx},${y + dy}`)).map(tile => (tile === 'solid' ? 1 : 0)).join('');
    const plus = [n[6], n[4], n[3], n[1]].map(v => v === '1' ? 1 : 0).join('');
    spriteMetadata.set(x, y, 'full', n);
    spriteMetadata.set(x, y, 'plus', plus);
    if (plus === '0100') {
      // Horizontal opening right
      return { x: 3 * 16, y: 3 * 16 };
    }
    if (n === "10011110") {
      // top right corner
      return { x: 4 * 16, y: 1 * 16 };
    }
    if (n === "00110000") {
      // none but left
      return { x: 5 * 16, y: 3 * 16 };
    }
    if (n === "11101001") {
      // bottom left corner
      return { x: 2 * 16, y: 2 * 16 };
    }
    if (n === "11001011") {
      // vertical
      return { x: 1 * 16, y: 2 * 16 };
    }
    if (n === "01101100") {
      // vertical bottom end
      return { x: 0 * 16, y: 3 * 16 };
    }
    if (n === "01111011") {
      // all but top left and bottom left
      return { x: 6 * 16, y: 4 * 16 };
    }
    if (n === "00101111") {
      // top left corner
      return { x: 2 * 16, y: 1 * 16 };
    }
    if (n === "10010110") {
      // top right corner
      return { x: 4 * 16, y: 1 * 16 };
    }
    if (n === "11010100") {
      // bottom right corner
      return { x: 4 * 16, y: 2 * 16 };
    }
    if (n === "11101111") {
      return { x: 5 * 16, y: 1 * 16 };
    }
    if (n === "11000100") {
      // Horizontal opening left
      return { x: 5 * 16, y: 2 * 16 };
    }
    if (plus === '0001' && n !== "11000100") {
      // Horizontal opening left
      return { x: 3 * 16, y: 2 * 16 };
    }
    if (plus === '1000') {
      // Vertical opening down
      return { x: 0 * 16, y: 2 * 16 };
    }
    if (plus === '0010') {
      // Vertical opening up
      return { x: 0 * 16, y: 2 * 16 };
    }
    if (plus === '1001') {
      // Vertical
      return { x: 1 * 16, y: 2 * 16 };
    }
    if (plus === '0110') {
      // Horizontal
      return { x: 4 * 16, y: 3 * 16 };
    }
    if (plus === '1110') {
      return { x: 3 * 16, y: 1 * 16 };
    }
    const known = {
      "00000000": { x: 2 * 16, y: 0 * 16 },
      "11111111": { x: 6 * 16, y: 1 * 16 },
      "11011111": { x: 6 * 16, y: 0 * 16 },
      '11111000': { x: 3 * 16, y: 2 * 16 },
      '00011111': { x: 3 * 16, y: 1 * 16 },
      '11010110': { x: 5 * 16, y: 0 * 16 },
      '00001011': { x: 2 * 16, y: 1 * 16 },
      '01101011': { x: 5 * 16, y: 1 * 16 },
      '00010110': { x: 4 * 16, y: 1 * 16 },
      '10011111': { x: 3 * 16, y: 1 * 16 },
      '11111100': { x: 3 * 16, y: 2 * 16 },
      '01010110': { x: 6 * 16, y: 5 * 16 },
      '11010000': { x: 4 * 16, y: 2 * 16 },
      '01001011': { x: 5 * 16, y: 1 * 16 },
      '01101000': { x: 2 * 16, y: 2 * 16 },
      '10001111': { x: 2 * 16, y: 1 * 16 },
      '00010111': { x: 4 * 16, y: 1 * 16 },
      '00110111': { x: 4 * 16, y: 1 * 16 },
      '00001111': { x: 2 * 16, y: 1 * 16 },
      '01111111': { x: 6 * 16, y: 4 * 16 },
      '00110011': { x: 1 * 16, y: 0 * 16 },
      '10110011': { x: 1 * 16, y: 0 * 16 },
      '11001101': { x: 0 * 16, y: 1 * 16 },
      '10110111': { x: 4 * 16, y: 1 * 16 },
      '11011000': { x: 3 * 16, y: 2 * 16 },
      '11110000': { x: 4 * 16, y: 2 * 16 },
      '11111110': { x: 4 * 16, y: 4 * 16 },
      '01110001': { x: 1 * 16, y: 1 * 16 },
      '11001110': { x: 2 * 16, y: 4 * 16 },
      '00010010': { x: 4 * 16, y: 1 * 16 },
      '11111001': { x: 3 * 16, y: 2 * 16 },
      '01111000': { x: 3 * 16, y: 2 * 16 },
      '01111110': { x: 6 * 16, y: 4 * 16 },
    }
    if (known[n]) {
      return known[n];
    }
    if (plus === '1111') {
      return { x: 6 * 16, y: 1 * 16 }
    }
    if (plus === '1011') {
      return { x: 5 * 16, y: 0 }
    }
    if (plus === '0001') {
      return { x: 1 * 16, y: 2 * 16 }
    }
    if (plus === '0000') {
      return { x: 2 * 16, y: 0 * 16 }
    }
    console.log('getTexturePosition', { x, y, n, code: parseInt(n, 2) });
    return { x: 6 * 16, y: 6 * 16 }
  } catch (err) {
    console.log('getTexturePosition error:', err, { x, y });
  }
}