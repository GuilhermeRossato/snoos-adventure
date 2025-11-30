import { ctx, ld, w, h } from "./perf.js";

const pixelLookup5x3 = {
  " ": [
    0b000,
    0b000,
    0b000,
    0b000,
    0b000,
  ],
  ".": [
    0b000,
    0b000,
    0b000,
    0b010,
    0b000
  ],
  "0": [0b111,
    0b101,
    0b101,
    0b101,
    0b111],
  "1": [0b010,
    0b110,
    0b010,
    0b010,
    0b111],
  "2": [0b111,
    0b001,
    0b111,
    0b100,
    0b111],
  "3": [0b111,
    0b001,
    0b111,
    0b001,
    0b111],
  "4": [0b101,
    0b101,
    0b111,
    0b001,
    0b001],
  "5": [0b111,
    0b100,
    0b111,
    0b001,
    0b111],
  "6": [0b111,
    0b100,
    0b111,
    0b101,
    0b111],
  "7": [0b111,
    0b001,
    0b010,
    0b100,
    0b100],
  "8": [0b111,
    0b101,
    0b111,
    0b101,
    0b111],
  "9": [0b111,
    0b101,
    0b111,
    0b001,
    0b111],
  "M": [0b101,
    0b111,
    0b111,
    0b101,
    0b101],
  "m": [
    0b000,
    0b000,
    0b110,
    0b101,
    0b101
  ],
  "P": [0b110,
    0b101,
    0b110,
    0b100,
    0b100],
  "B": [0b110,
    0b101,
    0b110,
    0b101,
    0b110],
  "-": [0b000,
    0b000,
    0b111,
    0b000,
    0b000],
  'S': [
    0b111,
    0b100,
    0b111,
    0b001,
    0b111
  ]
};
export function draw5x3(x, y, text) {
  if ((typeof text === 'number' && (text < 0 || text > 9 || !Number.isInteger(text))) ||
    (typeof text === 'string' && text.length !== 1)) {
    text = text.toString();
    // console.log('draw5x3: drawing string:', JSON.stringify(text));
    for (let i = 0; i < text.length; i++) {
      x += draw5x3(x, y, text.charAt(i));
      ctx.putImageData(ld, 0, 0);
    }
    return x;
  }
  const pattern = pixelLookup5x3[text];
  if (!pattern) {
    throw new Error(`drawDigit5x3: Unknown character to draw: ${JSON.stringify(text)}`);
  }
  const ids = [];
  const bits = [];
  for (let yi = 0; yi < pattern.length; yi++) {
    for (let xi = 0; xi < 3; xi++) {
      const i = (y + yi) * w + (x + xi);
      if (i < 0 || i >= w * h || x + xi < 0 || x + xi >= w || y + yi < 0 || y + yi >= h) {
        // throw new Error(`drawDigit5x3: Out of bounds drawing character ${JSON.stringify(text)} at x:${x} y:${y}`);
        continue;
      }
      ids.push(i);
      bits.push((pattern[yi] >> (2 - xi)) & 0x1);
      // d.push({i, x, y: yi, bit: (pattern[yi] >> (2 - xi)) & 0x1});
    }
  }
  let [rfg, gfg, bfg, afg] = [0, 255, 0, 255];
  let [rbg, gbg, bbg, abg] = [0, 0, 0, 0];
  if (afg === undefined)
    afg = 255;
  if (abg === undefined)
    abg = 255;
  for (let i = 0; i < ids.length; i++) {
    const index = ids[i] * 4;
    const bit = bits[i];
    ld.data[index + 0] = bit ? rfg : rbg;
    ld.data[index + 1] = bit ? gfg : gbg;
    ld.data[index + 2] = bit ? bfg : bbg;
    ld.data[index + 3] = bit ? afg : abg;

  }
  return 4;
}
