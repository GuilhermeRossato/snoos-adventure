export function execSafe(...args) {
  for (const arg of args) {
    try {
      arg();
    } catch (_err) {
      /* ignore */
    }
  }
}