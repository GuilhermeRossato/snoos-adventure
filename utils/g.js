const debug = true;

export function g(name, value) {
  if (typeof name !== 'string') {
    const a = value;
    value = name;
    name = a;
  }
  if (typeof window === 'undefined') {
    if (typeof global !== 'undefined'&&global[name]===undefined) {
      if (value instanceof Array) {
        debug&&console.log('[g] Adding array', name, ' with', value.length, 'items');
        debug&&console.log(`\n\tglobal["${name}"]\n`);
      } else if (value instanceof Buffer) {
        debug&&console.log('[g] Adding buffer', name, ' with', value.byteLength, 'bytes');
        debug&&console.log(`\n\tglobal["${name}"]\n`);
      } else if (typeof value === 'object' && value !== null && Object.keys(value).length > 0) {
        debug&&console.log('[g] Adding object', name, ' with', Object.keys(value).length, 'keys');
        debug&&console.log(`\n\tglobal["${name}"]\n`);
      }
    }
  }
  if (value === undefined) {
    if (typeof window !== 'undefined' && window[name] !== undefined) {
      return window[name];
    }
    if (typeof global !== 'undefined' && global[name] !== undefined) {
      return global[name];
    }
    if (typeof globalThis !== 'undefined' && globalThis[name] !== undefined) {
      return globalThis[name];
    }
    throw new Error(`Global variable "${name}" is not defined.`);
  }
  if (typeof window !== 'undefined') {
    window[name] = value;
  }
  if (typeof global !== 'undefined') {
    global[name] = value;
  }
  if (typeof globalThis !== 'undefined') {
    globalThis[name] = value;
  }
  return value;
}