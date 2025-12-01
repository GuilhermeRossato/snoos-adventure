class Tile {
  constructor(rect) {
    this.pos = [rect.x, rect.y]
    this.size = [rect?.width ?? 16, rect?.height ?? 16];
    this.texPos = [0, 0]
    this.texSize = [1, 1];
    this.texture = null;
    this.solid = true;
  }
}

class Ice extends Tile {
  constructor() {

  }
}