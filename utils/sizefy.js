export function sizefy(stf, b) {
  var str = stf.toString();
  if ((typeof (b) === 'number') && (b > 0)) {
    while (str.length < b) {
      str = '0' + str;
    }
    while (str.length > b) {
      str.substring(0, str.length - 1);
    }
    return str;
  }
}
