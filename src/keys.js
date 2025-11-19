import { camelCaseToSlug } from "./camelCaseToSlug.js";

const debug = true;

const keyLookup = {
  "ArrowUp": "up",
  "Space": "up",
  "87": "up",
  "W": "up",

  "ArrowLeft": "left",
  "65": "left",
  "A": "left",

  "ArrowRight": "right",
  "68": "right",
  "D": "right",

  "ArrowDown": "down",
  "83": "down",
  "S": "down",

  "Shift": "shift",
  "16": "shift",
  "Q": "shift",
}

export const keys = {
  states: {
    "up": false,
    "down": false,
    "left": false,
    "right": false,
    "shift": false,
    "ctrl": false,
  },
  _addKeyCallback: function (eventCode, key, callback) {
    debug && console.log(`Adding callback of type "${eventCode}" for key '${key}'`, this.states[key] === undefined ? '(custom key)' : '');
    if (this.states[key] === undefined) {
      const alt = keyLookup[key];
      if (alt && this.states[alt] !== undefined) {
        key = alt;
        debug && console.log(`Using existing key '${key}' for callback`);
      } else {
        const slug = camelCaseToSlug(key);
        const ident = `custom-${Object.keys(this.states).length}-${slug}`;
        debug && console.log(`Creating identifier '${ident}' for key '${key}' for callback`);
        this.states[ident] = false;
        keyLookup[key] = ident;
        if (key.startsWith('Key')) {
          const n = key.substring(3);
          keyLookup[n] = ident;
          if (n.length === 1) {
            keyLookup[String(n.charCodeAt(0))] = ident;
          }
        } else if (key.startsWith('Digit')) {
          const n = key.substring(5);
          keyLookup[n] = ident;
          if (n.length === 1) {
            keyLookup[String(n.charCodeAt(0))] = ident;
          }
        }
        key = ident;
      }
    }
    if (!this.callbacks[eventCode + key]) {
      this.callbacks[eventCode + key] = [];
    }
    this.callbacks[eventCode + key].push(callback);
  },

  _removeKeyCallback: function (eventCode, key, callback) {
    if (this.states[key] === undefined) {
      throw new Error(`Key '${key}' is not defined in states`);
    }
    if (!this.callbacks[eventCode + key]) {
      this.callbacks[eventCode + key] = [];
    }
    this.callbacks[eventCode + key] = this.callbacks[eventCode + key].filter(c => c !== callback);
  },

  onKeyToggle: function (key, callback) { this._addKeyCallback('T', key, callback); },
  onKeyDown: function (key, callback) { this._addKeyCallback('D', key, callback); },
  onKeyUp: function (key, callback) { this._addKeyCallback('U', key, callback); },
  offKeyToggle: function (key, callback) { this._removeKeyCallback('T', key, callback); },
  offKeyDown: function (key, callback) { this._removeKeyCallback('D', key, callback); },
  offKeyUp: function (key, callback) { this._removeKeyCallback('U', key, callback); },

  onMouseMove: function (callback) {
    if (!this.callbacks['move']) {
      this.callbacks['move'] = [];
    }
    this.callbacks['move'].push(callback);
  },
  onMouseToggle: function (button, callback) {
    if (typeof this.mouse[button] !== 'boolean') {
      throw new Error("Mouse button '" + button + "' is not defined in keys");
    }
    if (!this.callbacks['mT' + button]) {
      this.callbacks['mT' + button] = [];
    }
    this.callbacks['mT' + button].push(callback);
  },
  onMouseDown: function (button, callback) {
    if (typeof button === 'function' && callback === undefined) {
      callback = button;
      button = ['left', 'middle', 'right'];
    }
    if (button && button instanceof Array) {
      for (let b of button) {
        this.onMouseDown(b, callback);
      }
      return;
    }
    if (typeof this.mouse[button] !== 'boolean') {
      throw new Error("Mouse button '" + button + "' is not defined in keys");
    }
    if (!this.callbacks['mD' + button]) {
      this.callbacks['mD' + button] = [];
    }
    this.callbacks['mD' + button].push(callback);
  },
  onMouseUp: function (button, callback) {
    if (typeof button === 'function' && callback === undefined) {
      callback = button;
      button = ['left', 'middle', 'right'];
    }
    if (button && button instanceof Array) {
      for (let b of button) {
        this.onMouseUp(b, callback);
      }
      return;
    }
    if (typeof this.mouse[button] !== 'boolean') {
      throw new Error("Mouse button '" + button + "' is not defined in keys");
    }
    if (!this.callbacks['mU' + button]) {
      this.callbacks['mU' + button] = [];
    }
    this.callbacks['mU' + button].push(callback);
  },
  offMouseMove: function (callback) {
    if (!this.callbacks['move']) {
      this.callbacks['move'] = [];
    }
    this.callbacks['move'] = this.callbacks['move'].filter(c => c !== callback);
  },
  offMouseToggle: function (button, callback) {
    if (typeof button === 'function' && callback === undefined) {
      callback = button;
      button = ['left', 'middle', 'right'];
    }
    if (button && button instanceof Array) {
      for (let b of button) {
        this.offMouseToggle(b, callback);
      }
      return;
    }
    if (typeof this.mouse[button] !== 'boolean') {
      throw new Error("Mouse button '" + button + "' is not defined in keys");
    }
    if (!this.callbacks['mT' + button]) {
      this.callbacks['mT' + button] = [];
    }
    this.callbacks['mT' + button] = this.callbacks['mT' + button].filter(c => c !== callback);
  },
  offMouseDown: function (button, callback) {
    if (typeof button === 'function' && callback === undefined) {
      callback = button;
      button = ['left', 'middle', 'right'];
    }
    if (button && button instanceof Array) {
      for (let b of button) {
        this.offMouseDown(b, callback);
      }
      return;
    }
    if (typeof this.mouse[button] !== 'boolean') {
      throw new Error(`Mouse button '${button}' is not defined in keys`);
    }
    if (!this.callbacks['mD' + button]) {
      this.callbacks['mD' + button] = [];
    }
    this.callbacks['mD' + button] = this.callbacks['mD' + button].filter(c => c !== callback);
  },
  offMouseUp: function (button, callback) {
    if (typeof button === 'function' && callback === undefined) {
      callback = button;
      button = ['left', 'middle', 'right'];
    }
    if (button && button instanceof Array) {
      for (let b of button) {
        this.offMouseUp(b, callback);
      }
      return;
    }
    if (typeof this.mouse[button] !== 'boolean') {
      throw new Error(`Mouse button '${button}' is not defined in keys`);
    }
    if (!this.callbacks['mU' + button]) {
      this.callbacks['mU' + button] = [];
    }
    this.callbacks['mU' + button] = this.callbacks['mU' + button].filter(c => c !== callback);
  },
  emitKeyChange: function (key, down = true, shift = undefined, ctrl = undefined, time = undefined) {
    let result;
    if (this.states[key] === undefined) {
      throw new Error(`Key '${key}' is not defined in states`);
    }
    if (this.states[key] === down) {
      return;
    }
    if (shift === undefined) {
      shift = key === 'shift' ? down : this.states['shift'];
    }
    if (ctrl === undefined) {
      ctrl = key === 'ctrl' ? down : this.states['ctrl'];
    }
    if (time === undefined) {
      time = Date.now();
    }
    this.states[key] = down;
    this[down ? "fallen" : "risen"][key] = time;
    const obj = { key, down, shift, ctrl, time, risen: this.risen[key], fallen: this.fallen[key] };
    const list = [this.callbacks[(down ? 'D' : 'U') + key], this.callbacks['T' + key]];
    for (const callbacks of list) {
      if (!callbacks || !callbacks.length) {
        continue;
      }
      for (const callback of callbacks) {
        try {
          result = callback(obj);
        } catch (error) {
          console.error(`Error handling key '${key}' ${down ? "press" : "release"} callback:`, error);
          error.message = `Error handling key '${key}' ${down ? "press" : "release"} callback: ${error.message}`;
          throw error;
        }
        if (true === result || result === undefined) {
          continue;
        }
        if (false === result) {
          return;
        }
        if (result && typeof result === 'object' && result instanceof Promise) {
          throw new Error("Async key callbacks are not supported");
        }
      }
    }
    return result;
  },
  emitMouseMove: function (x, y) {
    let result;
    if (x && typeof x === 'object' && typeof x.clientX === 'number' && typeof x.clientY === 'number' && y === undefined) {
      y = x.clientY;
      x = x.clientX;
      if (!this.canvas) {
        this.canvas = document.querySelector('canvas');
      }
      if (this.canvas) {
        const rect = this.canvas.getBoundingClientRect();
        x = Math.floor(x - rect.left) / rect.width;
        y = Math.floor(y - rect.top) / rect.height;
      }
    } else if (x && typeof x === 'object' && typeof x.x === 'number' && typeof x.y === 'number' && y === undefined) {
      y = x.y;
      x = x.x;
      if (x > 10 || y > 10) {
        console.warn("Suspicious unit mouse coordinates:", x, y);
      }
    }
    this.mouse.x = x;
    this.mouse.y = y;
    const callbacks = this.callbacks['move'];
    if (!callbacks || !callbacks.length) {
      return;
    }
    for (const callback of callbacks) {
      try {
        result = callback(this.mouse);
      } catch (error) {
        console.error(`Error handling mouse move callback:`, error);
        error.message = `Error handling mouse move callback: ${error.message}`;
        throw error;
      }
      if (true === result || result === undefined) {
        continue;
      }
      if (false === result) {
        return;
      }
      if (result && typeof result === 'object' && result instanceof Promise) {
        throw new Error("Async mouse callbacks are not supported");
      }
    }
    return result;
  },
  emitMouseButton: function (button, isDown) {
    let result;
    if (button && typeof button === 'object' && typeof button.buttons === 'number' && isDown === undefined) {
      if (typeof button.clientX === 'number' && typeof button.clientY === 'number') {
        let cy = button.clientY;
        let cx = button.clientX;
        if (!this.canvas) {
          this.canvas = document.querySelector('canvas');
        }
        if (this.canvas) {
          const rect = this.canvas.getBoundingClientRect();
          cx = Math.floor(cx - rect.left) / rect.width;
          cy = Math.floor(cy - rect.top) / rect.height;
        }
        if (this.mouse.x !== cx || this.mouse.y !== cy) {
          this.emitMouseMove(cx, cy);
        }
      } else if (typeof button.x === 'number' && typeof button.y === 'number') {
        if (this.mouse.x !== button.x || this.mouse.y !== button.y) {
          this.emitMouseMove(button.x, button.y);
        }
      }
      isDown = button.down === true ? true : button.down === false ? false : button.type && String(button.type).includes('up') ? false : true;
      button = button.button;
    }
    if (typeof button === 'number' && button >= 0 && button <= 2) {
      button = ["left", 'middle', 'right'][button];
    }
    if (typeof this.mouse[button] !== 'boolean') {
      throw new Error("Mouse button '" + button + "' is not defined in states");
    }
    if (this.mouse[button] === isDown) {
      return;
    }
    this.mouse[button] = isDown;
    if (isDown) {
      this.mouse.sx = this.mouse.x;
      this.mouse.sy = this.mouse.y;
    } else {
      this.mouse.ex = this.mouse.x;
      this.mouse.ey = this.mouse.y;
    }
    const list = [this.callbacks[(isDown ? 'mD' : 'mU') + button], this.callbacks['mT' + button]];
    for (const callbacks of list) {
      if (!callbacks || !callbacks.length) {
        continue;
      }
      for (const callback of callbacks) {
        try {
          result = callback(this.mouse);
        } catch (error) {
          console.error(`Error handling key '${button}' ${isDown ? "press" : "release"} callback:`, error);
          error.message = `Error handling key '${button}' ${isDown ? "press" : "release"} callback: ${error.message}`;
          throw error;
        }
        if (true === result || result === undefined) {
          continue;
        }
        if (false === result) {
          return;
        }
        if (result && typeof result === 'object' && result instanceof Promise) {
          throw new Error("Async key callbacks are not supported");
        }
      }
    }
    return result;
  },
  callbacks: {},
  mouse: {
    x: NaN,
    y: NaN,
    get px() {
      return this.x * 480;
    },
    get py() {
      return this.y * 480;
    },
    left: false,
    middle: false,
    right: false,
  },
  risen: {
  },
  fallen: {
  },
};

const arrowLookup = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

function handleKey(ev) {
  if (arrowLookup.includes(String(ev.key))) {
    ev.preventDefault();
  }
  const prop = keyLookup[String(ev.key)] || keyLookup[String(ev.keyCode)] || keyLookup[String(ev.code)];
  if (!prop) {
    return;
  }
  const isDown = ev.type === 'keydown';
  if (prop !== 'shift' && typeof ev.shiftKey === 'boolean' && keys.states['shift'] === !ev.shiftKey) {
    debug && console.log("Updating 'shift' state due to", ev.type, "event with", ev.shiftKey, "as modifier");
    keys.emitKeyChange('shift', ev.shiftKey);
  }
  if (prop !== 'ctrl' && typeof ev.ctrlKey === 'boolean' && keys.states['ctrl'] === !ev.ctrlKey) {
    debug && console.log("Updating 'ctrl' state due to", ev.type, "event with", ev.ctrlKey, "as modifier");
    keys.emitKeyChange('ctrl', ev.ctrlKey);
  }
  keys.emitKeyChange(prop, isDown);
}

window.addEventListener('keydown', handleKey);
window.addEventListener('keyup', handleKey);

function handleMouseButton(ev) {
  keys.emitMouseButton(ev);
}
window.addEventListener('mousedown', handleMouseButton);
window.addEventListener('mouseup', handleMouseButton);

window.addEventListener('mousemove', (ev) => {
  keys.emitMouseMove(ev);
});

document.addEventListener('mousemove', (ev) => {
  keys.emitMouseMove(ev);
});

window['keys'] = keys;

