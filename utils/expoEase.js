export function expoEase(t) {
  if (t * 2 < 1) {
    return Math.pow(2, 10 * (t * 2 - 1)) / 2;
  }
  return (-Math.pow(2, -10 * (t * 2 - 1)) + 2) / 2;
}
