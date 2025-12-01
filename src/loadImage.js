
export function loadImage(filePath) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      console.log('loadImage: success', 'file:', JSON.stringify(filePath).slice(0, 20), 'len:', filePath.length);
      resolve(img);
    };
    img.onerror = (ev) => {
      console.error('loadImage: error', 'file:', JSON.stringify(filePath).slice(0, 20), 'len:', filePath.length, 'event:', ev && ev["type"]);
      reject(new Error(`Could not load asset "${filePath}"`));
    };
    img.src = filePath;
  });
}
