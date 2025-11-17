export function dateCompare(date) {
  var i, then = date.split('.'), now = new Date(), n1, n2, n3;
  if (then.length >= 5) {
    now.setSeconds(0);
    now.setMilliseconds(0);
    then = new Date(then[0] + ' ' + then[1] + ' ' + then[2] + ',' + then[3] + ':' + then[4] + ':' + '00');
    if (!isNaN(then.getDate())) {
      if (then > now) {
        return 'from the future';
      } else {
        n3 = Math.round((now - then) / (1000 * 60));
        console.log('started as ', n3)
        var timeSpans = [1, 'minute', 60, 'hour', 24, 'day', 30.4375, 'month', 12, 'year', 5]
        if (n3 === 0) {
          return "a few seconds ago";
        } else if (n3 === 1) {
          return 'a minute ago';
        }
        for (i = 0; i < timeSpans.length; i += 2) {
          n3 = Math.floor(n3 / timeSpans[i]);
          console.log(n3)
          if (n3 === 0) {
            return (n3 + ' ' + timeSpans[i + 1] + ' ago')
          } else if (n3 < timeSpans[i + 2]) {
            return (n3 + ' ' + timeSpans[i + 1] + 's ago')
          } else {
            console.log(n3, ' > ', timeSpans[i]);
          }
        }
        return "some certain time ago";
      }
    } else {
      return 'some uncertain time ago';
    }
  } else {
    return 'data error :(';
  }
}
