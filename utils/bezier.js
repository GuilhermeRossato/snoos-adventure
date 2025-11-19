export function b(i, j, k) {
  if (
    typeof i !== "number" ||
    isNaN(i) ||
    typeof j !== "number" ||
    isNaN(j) ||
    typeof k !== "number" ||
    isNaN(k)
  ) {
    throw new Error(`Invalid parameters: ${JSON.stringify({ i, j, k })}`);
  }
  return i + (j - i) * k;
}

/**
 * Clamped bezier linear transformation method.
 * @param {number} i Start value (when k is 0) which is also the minimum return value
 * @param {number} j End value (when k is 1) which is also the maximum return value
 * @param {number} k 
 * @returns {number}
 */
export function bc(i, j, k) {
  if (
    typeof i !== "number" ||
    isNaN(i) ||
    typeof j !== "number" ||
    isNaN(j) ||
    typeof k !== "number" ||
    isNaN(k)
  ) {
    throw new Error(`Got invalid parameters: ${JSON.stringify({ i, j, k })}`);
  }
  return Math.max(i, Math.min(j, i + (j - i) * k));
}

export function ib(i, j, k) {
  if (typeof i !== "number" ||
    isNaN(i) ||
    typeof j !== "number" ||
    isNaN(j) ||
    typeof k !== "number" ||
    isNaN(k)) {
    throw new Error(`Invalid parameters: ${JSON.stringify({ i, j, k })}`);
  }
  if (j === i) {
    return 0;
  }
  return (k - i) / (j - i);
}



export function ibc(i, j, k) {
  if (k < i || j === i) { return 0; }
  if (k > j) { return 1; }
  return (k - i) / (j - i);
}

