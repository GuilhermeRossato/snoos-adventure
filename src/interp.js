const gen = (tag, props) => {
  const e = tag instanceof HTMLElement ? tag : document.createElement(tag);
  if (typeof props === 'string' || (props && props instanceof Array && props.length > 0 && props.every(p => typeof p === 'string' || typeof p === 'number'))) {
    e.textContent = props;
    return e;
  }
  for (const k in props) {
    const prop = props[k];
    if (k === 'parent') {
      prop.appendChild(e);
      continue;
    }
    if (prop === null || prop === undefined) {
      continue;
    }
    if (k === 'text' || k === 'textContent') {
      e.textContent = prop;
      continue;
    }
    if (k === 'html' || k === 'innerHTML') {
      e.innerHTML = prop;
      continue;
    }
    if (k === 'children' && prop instanceof Array) {
      for (const child of prop) {
        if (child === null || child === undefined) {
          continue;
        }
        e.appendChild(child instanceof HTMLElement ? child : (typeof child === 'string' ? document.createTextNode(child) : gen(child.tag, child.props || {})));
      }
      continue;
    }
    e.setAttribute(k, prop instanceof Array ? (k === 'style' ? prop.join(';').replace(/\s\;\s/g, ';').replace(/\s/g, ' ').replace(/\s\s+/g, ' ').trim().replace(/\;\;+/g, ';') : prop.join(' ')) : prop);
  }
  return e;
}

const r = {
  btnClose: 'interpolation-button-close',
  btnMove: 'interpolation-button-move',
  btnElements: 'interpolation-button-elements',
  btnStyles: 'interpolation-button-styles',
  btnStartWidth: 'interpolation-button-start-width',
  btnEndWidth: 'interpolation-button-end-width',
  wrapper: 'interpolation-wrapper',
  header: 'interpolation-header',
  content: 'interpolation-content',
}

async function startProcessingInterpolation() {
  const next = createStyleMaps(window['interpolation-elements']);
  const newMaps = deltaStyleMaps(window['interpolation-maps'], next);
  const changed = newMaps.flatMap((map, i) => map.size === 0 ? [] : [{
    el: window['interpolation-elements'][i],
    changes: map
  }]);
  if (changed.length === 0) {
    return
  }
  console.log('Processing interpolation styles for selected elements');

  const entries = {};
  for (const { el, changes } of changed) {
    const tag = el.tagName.toLowerCase();
    const id = el.id ? `#${el.id}` : '';
    const cls = el.classList ? `.${Array.from(el.classList).join('.')}` : '';
    const key = `${tag}${id}${cls}`;
    changes.forEach((prevNextObj, prop) => {
      if (!entries[key]) {
        entries[key] = { el, props: {} };
      }
      entries[key].props[prop] = prevNextObj;
    });
  }
  finder(r.btnStyles).forEach(btn => {
    btn.textContent = `Styles (${Object.keys(entries).length}/${window['interpolation-maps'].reduce((acc, map) => acc + map.size, 0)})`;
  });
  if (Object.keys(entries).length === 0) {
    return;
  }
  if (!window['interpolation-changed']) {
    console.log('Changes detected in styles');
    window['interpolation-changed'] = true;
  }

  let c = finder(r.content).pop();
  if (!c) {
    const wrapper = finder(r.wrapper)[0];
    c = gen('div', {
      class: r.content,
      parent: wrapper,
      style: [
        'margin-top: 8px;',
        'font-family: monospace;',
        'font-size: 12px;'
      ]
    });
  }
  applyChangesToContent(c, Object.entries(entries).map(([key, value]) => ({ key, ...value })));
}

const finder = (className) => Array.from(document.querySelectorAll((r[className] ? '.' + r[className] : '') || (className.startsWith('.') ? className : '.' + className)));
const is = (e, className) => e instanceof Array && e.length === 0 ? false : (e instanceof HTMLElement ? e : e instanceof Array ? e[0] : e.target).classList.contains(className);
const handleClick = (e) => {
  return;
  if (e && typeof e === 'object' && typeof e.length === 'number') {
    if (e.length === 0) {
      console.log('Array of 0 passed to handleClick, ignoring', e);
      return;
    }
    if (e[0] && e[0] instanceof HTMLElement) {
      for (let i = 0; i < e.length; i++) {
        handleClick(e[i]);
      }
      return;
    } else if (e[0] && e instanceof Map) {
    }
    return;
  }
  if (e && e instanceof HTMLElement && e.tagName.toLowerCase() === 'button') {
    const btn = e;
    console.log('Updating button:', btn.className);

    if (is(e, r.btnElements)) {
      const btn = e;
      if (!window['interpolation-mouse']) {
        btn.textContent = `Elements (/)`;
        return;
      }
      if (!window['interpolation-elements'] || !window['interpolation-elements'].length) {
        const x = window['interpolation-mouse'] ? window['interpolation-mouse'].x : null;
        const y = window['interpolation-mouse'] ? window['interpolation-mouse'].y : null;
        const elements = Array.from(document.elementsFromPoint(x, y)).filter(el => el !== document.documentElement && !(el instanceof Text) && typeof el.computedStyleMap === 'function');
        btn.textContent = `Hovering ${elements.length} elements at ${x},${y}...`;
      } else {
        btn.textContent = `Elements (${window['interpolation-elements'].length} at ${window['interpolation-elements-click'] ? `${window['interpolation-elements-click'].x},${window['interpolation-elements-click'].y}` : 'N/A'})`;
      }
      return;
    }
    if (is(e, r.btnStyles)) {
      if (!window['interpolation-elements'] || !window['interpolation-elements'].length) {
        btn.textContent = `Styles (/)`;
        return;
      }
      if (!window['interpolation-maps']) {
        btn.textContent = `Styles (0)`;
        return;
      }
      const newMaps = deltaStyleMaps(window['interpolation-maps'], createStyleMaps(window['interpolation-elements']));
      const previousCount = window['interpolation-maps'].reduce((acc, map) => acc + (map.size > 0 ? 1 : 0), 0);
      const changedCount = newMaps.reduce((acc, map) => acc + (map.size > 0 ? 1 : 0), 0);
      btn.textContent = `Styles (${changedCount}/${previousCount})`;
      handleClick(newMaps);
      return;
    }
    if (is(e, r.btnStartWidth)) {
      let width = window['interpolation-width'] && window['interpolation-width'][0] ? window['interpolation-width'][0] : document.documentElement.clientWidth;
      if (isNaN(Number(width))) {
        width = window.innerWidth;
      }
      btn.textContent = `Start width (${width})`;
      return;
    }
    if (is(e, r.btnEndWidth)) {
      let width = (window['interpolation-width'] ? window['interpolation-width'][1] : NaN) || document.documentElement.clientWidth;
      if (isNaN(Number(width))) {
        width = window.innerWidth;
      }
      btn.textContent = `End width (${width})`;
      return;
    }
    throw new Error('Unreachable code reached in handleClick');
  }
  if (!e || !e.target || !e.target.tagName || !e.target.tagName.toLowerCase) { return; }
  if (is(e, r.btnClose)) {
    console.log('Closing');
    finder(r.wrapper).map(w => w.remove());
    updateInterpolationElements(false);
    window['interpolation-elements'] = null;
    window['interpolation-maps'] = null;
    if (window['interpolation-timer']) {
      clearInterval(window['interpolation-timer']);
      window['interpolation-timer'] = null;
    }
    return;
  }
  if (is(e, r.btnStartWidth)) {
    window['interpolation-width'] = window['interpolation-width'] || [];
    window['interpolation-width'][0] = String(document.documentElement.clientWidth);
    handleClick(e.target);
    return;
  }
  if (is(e, r.btnEndWidth)) {
    window['interpolation-width'] = window['interpolation-width'] || [];
    window['interpolation-width'][1] = String(document.documentElement.clientWidth);
    handleClick(e.target);
    return;
  }
  if (is(e, r.btnMove)) {
    console.log('Move initiated');
    if (!window['interpolation-mouse']) {
      window['interpolation-mouse'] = { x: e.clientX, y: e.clientY, dragging: false };
    }
    window['interpolation-mouse'].dragging = true;
    finder(r.wrapper).forEach(w => [w.style.right = 'auto',w.style.bottom = 'auto']);
  }
  if (is(e, r.btnElements)) {
    console.log('Elements button clicked');
    updateInterpolationElements(false);
    window['interpolation-elements'] = null;
    window['interpolation-maps'] = null;
    handleClick(e.target);
    return;
  }
  if (is(e, r.btnStyles)) {
    console.log('Styles button clicked');
    window['interpolation-maps'] = null;
    handleClick(e.target);
    return;
  }
  if (!window['interpolation-wrapper']) {
    window['interpolation-wrapper'] = finder(r.wrapper)[0];
  }
  if (!window['interpolation-wrapper']) {
    console.log('Creating wrapper at', e.clientX, e.clientY);
    window['interpolation-wrapper'] = gen('div', {
      class: r.wrapper,
      style: [
        'position: fixed;',
        `${e.clientY > window.innerHeight * 0.33 ? "top" : "top"}: 0px;`,
        `${e.clientX > window.innerWidth * 0.66 ? "left" : "right"}: 0px;`,
        'border: 4px solid #fff;',
        'background-color: rgba(0,0,0,0.7);',
        'color: #fff;',
        'padding: 8px;',
        'z-index: 10000;',
        'max-height: 100vh;',
        'overflow-y: auto;'
      ],
      parent: document.body,
      children: [
        gen('div', {
          class: r.header,
          style: [
            'display: flex;',
            'justify-content: space-between;',
            'align-items: center;',
            'flex-wrap: wrap;'
          ],
          children: ['Close', 'Move', 'Elements', 'Styles', 'Start width', 'End width'].map(text => {
            const cl = `interpolation-button-${text.toLowerCase().replace(/\s/g, '-')}`;
            if (!Object.values(r).includes(cl)) {
              throw new Error(`Button class "${cl}" not found in registry: ${JSON.stringify(Object.values(r))}`);
            }
            return gen('button', {
              type: 'button',
              role: 'button',
              text,
              class: cl,
              style: [
                'flex-basis: 33%;'
              ]
            });
          })
        })]
    });
  }
  if (!window['interpolation-handler-attached']) {
    window['interpolation-handler-attached'] = true;
    document.addEventListener('mousemove', (e) => {
      if (!window['interpolation-mouse']) {
        return;
      }
      if (window['interpolation-mouse'].dragging) {
        const dx = e.clientX - window['interpolation-mouse'].x;
        const dy = e.clientY - window['interpolation-mouse'].y;

        finder(r.wrapper).forEach(w => {
          const x = (w.style.top || "0px").replace('px', '');
          const y = (w.style.left || "0px").replace('px', '');
          w.style.left = `${(x + dx * 0.75).toFixed(3)}px`;
          w.style.top = `${(y + dy * 0.75).toFixed(3)}px`;
        });
      }
      window['interpolation-mouse'].x = e.clientX;
      window['interpolation-mouse'].y = e.clientY;

    });
    document.addEventListener('mouseup', (e) => {
      if (!window['interpolation-mouse']) {
        return;
      }
      window['interpolation-mouse'].dragging = false;
    });
    const updateSize = () => {
      finder(r.btnStartWidth).forEach(btn => handleClick(btn));
      finder(r.btnEndWidth).forEach(btn => handleClick(btn));
    };
    window.addEventListener('resize', updateSize);
    const handleKey = (event) => {
      if (event.key === 'Escape') {
        console.log('Closed via Escape key');
        finder(r.wrapper).map(w => w.remove());
        updateInterpolationElements(false);
        window['interpolation-elements'] = null;
        window['interpolation-maps'] = null;
        return;
      }
    };
    window.addEventListener('keyup', handleKey);
  }
  if (!window['interpolation-timer']) {
    window['interpolation-counter'] = 0;
    window['interpolation-timer'] = setInterval(() => {
      const wrapper = document.querySelector('.interpolation-wrapper');
      if (!wrapper) {
        return;
      }
      window['interpolation-counter'] = (window['interpolation-counter'] || 0) + 1;
      if (!window['interpolation-elements'] || !window['interpolation-elements'].length) {
        console.log('No elements selected, resetting state');
        window['interpolation-width'] = [];
        handleClick(finder(r.btnStartWidth));
        handleClick(finder(r.btnEndWidth));
        handleClick(finder(r.btnElements));
        if (window['interpolation-maps']) {
          window['interpolation-maps'] = null;
          handleClick(finder(r.btnStyles));
        }
        return;
      }
      const missingMaps = !window['interpolation-maps'] || !window['interpolation-maps'].length;
      if (missingMaps && window['interpolation-elements'] && window['interpolation-elements'].length) {
        console.log('Creating initial style maps for elements');
        window['interpolation-maps'] = createStyleMaps(window['interpolation-elements']);
        handleClick(finder(r.btnElements));
        handleClick(finder(r.btnStyles));
        return;
      }
      if (missingMaps) {
        return;
      }
      if (window['interpolation-is-processing']) {
        if (window['interpolation-counter'] < 10 && window['interpolation-counter'] % 3 === 0) {
          console.log('Interpolation processing already in progress, skipping this interval', Date.now() - window['interpolation-is-processing'], 'ms since start');
        }
        return;
      }
      window['interpolation-is-processing'] = Date.now();
      startProcessingInterpolation().catch(err => {
        console.error('Error during interpolation processing:', err);
      }).finally(() => {
        if (Date.now() - window['interpolation-is-processing'] < 500) {
          window['interpolation-counter'] < 10 && console.log('Processing took less than 1 second, delaying next process to avoid thrashing');
          setTimeout(() => {
            window['interpolation-is-processing'] = null;
          }, 500);
          return;
        }
        window['interpolation-is-processing'] = null;
      });
    }, 100);
  }
  if (!window['interpolation-elements']) {
    console.log('Collecting elements at', e.clientX, e.clientY);
    window['interpolation-mouse'] = window['interpolation-mouse'] || { x: e.clientX, y: e.clientY, dragging: false };
    window['interpolation-mouse'].x = e.clientX;
    window['interpolation-mouse'].y = e.clientY;
    window['interpolation-elements-click'] = { x: e.clientX, y: e.clientY };
    const x = window['interpolation-mouse'].x;
    const y = window['interpolation-mouse'].y;
    updateInterpolationElements(false);
    window['interpolation-width'] = [document.documentElement.clientWidth];
    window['interpolation-elements'] = Array.from(document.elementsFromPoint(x, y)).filter(el => el !== document.documentElement && !(el instanceof Text) && typeof el.computedStyleMap === 'function');
    window['interpolation-changed'] = false;
    updateInterpolationElements(true);
    window['interpolation-maps'] = null;
    handleClick(finder(r.btnElements));
    handleClick(finder(r.btnStartWidth));
    handleClick(finder(r.btnEndWidth));
    handleClick(finder(r.btnStyles));
    return;
  }
}


function updateInterpolationElements(add) {
  if (!add && !window['interpolation-elements']) {
    return;
  }
  const elements = window['interpolation-elements'] || [];
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    if (add) {
      el.setAttribute('data-interpolation-selected', String(i));
    } else {
      el.removeAttribute('data-interpolation-selected');
    }
  }
}

function getOriginalStyle(el, prop) {
  if (!el || !prop) {
    return null;
  }
  let value = null;
  try {
    value = el.style.getPropertyValue(prop);
    if (value) {
      return value;
    }
    const attrValue = el.getAttribute('style');
    if (attrValue) {
      const regex = new RegExp(`${prop}\\s*:\\s*([^;]+)`, 'i');
      const match = attrValue.match(regex);
      if (match) {
        value = match[1].trim();
        return value;
      }
    }
    // Not found inline, check stylesheets
    for (const sheet of Array.from(document.styleSheets)) {
      let rules;
      try {
        rules = sheet.cssRules || sheet.rules;
      } catch (err) {
        console.log(`[getOriginalStyle] Failed to access rules for stylesheet: ${sheet.href ? `"${sheet.href}"` : '[inline]'}, error=${err}`);
        continue;
      }
      for (const rule of Array.from(rules)) {
        // @ts-ignore
        if (rule.selectorText && el.matches(rule.selectorText)) {
          // @ts-ignore
          const styleValue = rule.style.getPropertyValue(prop);
          if (styleValue) {
            //console.log(`[getOriginalStyle] Found stylesheet rule for prop=${JSON.stringify(String(prop).slice(0, 16))}, length=${String(prop).length}: value=${JSON.stringify(String(styleValue).slice(0, 16))}, length=${String(styleValue).length}, selector="${rule.selectorText}"`);
            return styleValue;
          }
        }
      }
    }
    return null;
  } catch (err) {
    console.log(`[getOriginalStyle] Exception for prop=${JSON.stringify(String(prop).slice(0, 16))}, length=${String(prop).length}: error=${err}`);
    return null;
  }
}

window.addEventListener('click', handleClick)


function createStyleMaps(filtered) {
  return filtered.map((el) => {
    const map = new Map();
    el.computedStyleMap().forEach((value, prop) => {
      let v;
      try {
        if (value.toString().match(/\d/)) {
          v = getOriginalStyle(el, prop);
        } else {
          v = value.toString();
        }
      } catch (error) {
        v = value.toString();
      }
      map.set(prop, {orig: v, comp: value.toString()});
    });
    return map;
  });
}

function deltaStyleMaps(previous, next) {
  return next.map((newMap, idx) => {
    const oldMap = previous[idx];
    const diffs = new Map();
    newMap.forEach(({orig: newValue, comp: nextComp}, prop) => {
      const {orig, comp} = oldMap.get(prop);
      if (newValue !== orig) {
        diffs.set(prop, { prev: orig, next: newValue, prevComp: comp, nextComp });
      }
    });
    return diffs;
  });
}
/**
 * 
 * @param {HTMLElement} element 
 * @param {{el?: HTMLElement, key?: string, props: Record<string, {prev: string, next: string, prevComp: string, nextComp: string}>}[]} list 
 */
function applyChangesToContent(element, list) {
  for (const { el, key, props } of list) {
    let entry = Array.from(element.children).find(child => {
      if (!child.querySelector) return false;
      const strong = child.querySelector('strong');
      return strong && strong.textContent === key;
    });
    if (!entry) {
      entry = gen('div', {
        'data-key': key,
        'data-props': String(Object.keys(props).join(',')),
        style: [
          'margin-bottom: 8px;'
        ],
        children: [
          gen('strong', { text: key }),
          gen('br'),
        ]
      });
      element.appendChild(entry);
    }
    const propList = Object.keys(props).sort();

    while (entry.children.length > 2) {
      entry.removeChild(entry.lastChild);
    }
    while (entry.children.length - 2 < propList.length) {
      entry.appendChild(gen('div', {
        style: [
          'margin-left: 16px;'
        ],
        'data-prop': '',
        children: [
          gen('span', { text: `: ` }),
          gen('span', {
            class: 'prev',
            style: [
              'text-decoration: line-through;',
              'color: rgb(200, 0, 0);'
            ],
            text: '-',
          }),
          gen('span', { text: ' → ' }),
          gen('span', {
            class: 'next',
            style: [
              'color: rgb(0,200,0);'
            ],
            text: '-',
          }),
          gen('span', { text: ' / ' }),
          gen('span', {
            class: 'prev',
            style: [
              'text-decoration: line-through;',
              'color: rgb(200, 0, 0);'
            ],
            text: '-',
          }),
          gen('span', { text: ' → ' }),
          gen('span', {
            class: 'next',
            style: [
              'color: rgb(0,200,0);'
            ],
            text: '-',
          }),
          gen('pre', {
            class: 'expression',
            style: [
              'color: gray;',
              'font-size: 10px;',
              'font-family: monospace;',
              'margin-top: 4px;',
              'margin-bottom: 4px;',
            ],
            text: '-',
          })
        ]
      }));
    }
    for (let i = 0; i < propList.length; i++) {
      const prop = propList[i];
      const change = props[prop];
      const propEntry = entry.children[i + 2];
      propEntry.setAttribute('data-prop', prop);
      propEntry.children[0].textContent = prop + ': ';
      propEntry.children[1].textContent = change.prev !== null && change.prev !== undefined ? String(change.prev) : 'null';
      propEntry.children[3].textContent = change.next !== null && change.next !== undefined ? String(change.next) : 'null';
      propEntry.children[5].textContent = change.prevComp !== null && change.prevComp !== undefined ? String(change.prevComp) : 'null';
      propEntry.children[7].textContent = change.nextComp !== null && change.nextComp !== undefined ? String(change.nextComp) : 'null';

      if (!change.prev && change.next && typeof change.next === 'string' && change.next.match(/\d/)) {
        let unit = change.next.replace(/[\d\.\-]/g, '').trim();
        if (change.next.endsWith('vw'))
          unit = 'vw';
        else if (change.next.endsWith('px'))
          unit = 'px';
        else if (change.next.endsWith('rem'))
          unit = 'rem';
        change.prev = `0${unit}`;
        change.prevComp = `0px`;
      }
      const el = propEntry.children[propEntry.children.length - 1];
      if (!(change.next && change.prev && typeof change.next === 'string' && typeof change.prev === 'string' && change.next.match(/\d/) && change.prev.match(/\d/)) ){
        el.textContent = change.next||'?';
        return;
      }
      function getChangeExpression(el, prop, change) {
        
          let exp = '';
          const y0 = parseFloat(String(change.prevComp));
          const y1 = parseFloat(String(change.nextComp));
          const w = document.documentElement.clientWidth||window.innerWidth;
          const x0 = parseFloat(String(window['interpolation-width'] ? window['interpolation-width'][0] : w));
          const x1 = parseFloat(String(window['interpolation-width']&&window['interpolation-width'][1] ? window['interpolation-width'][1] : w));
          const when_width_is_y0 = x0;
          const when_width_is_y1 = x1;
          const dy = y1 - y0;
          const dx = x1 - x0;
          if (dx === 0) {
            exp += `${y1.toFixed(2)}px`;
            return exp;
          }
           const mult = -100 * (y0 - y1) / dx;
        const sum = -(x0 * y1 - x1 * y0) / dx;
        const vw = ((mult.toString().length < mult.toFixed(3).length) ? mult.toString() : mult.toFixed(2)) + "vw";
        const px = ((sum.toString().length < sum.toFixed(1).length) ? sum.toString() : sum.toFixed(1)) + "px";
        if (isNaN(mult)||isNaN(sum)) {
            return "?";
        };
        return (mult > 0) ? "calc(" + vw + " " + px + ")" : "calc(" + px + " " + vw + ")"
      }
      const exp = getChangeExpression(el, prop, change)||`b(${String(change.prevComp).replace('px', '')}, ${String(change.nextComp).replace('px', '')}, ib(${window['interpolation-width'][0]}, ${window['interpolation-width'][1]}))`;

      el.textContent = exp;
    }
  }
}
