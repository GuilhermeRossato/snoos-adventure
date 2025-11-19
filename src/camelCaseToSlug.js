export function camelCaseToSlug(text) {
  return text.split('').map(a => a.charCodeAt(0)).map(c => c >= 65 && c <= 90 ? ` ${String.fromCharCode(c + 32)}` : (c === 45 || c === 32 || c === 10) ? ' ' : ((c >= 97 && c <= 122) || (c > 48 && c <= 58)) ? String.fromCharCode(c) : '').join('').replace(/\s\s+/g, ' ').trim().replace(/\s/g, '-');
}
