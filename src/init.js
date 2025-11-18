import { b, bc, ib } from "../utils/bezier.js";


document.querySelectorAll('.header-image').forEach(e => (e.style.marginLeft = `-20vw`));
const latest = [0, 0, 0, 0];
function handler(t) {
  latest.shift();
  latest.push(t);
  for (let i = 1; i < latest.length; i++) {
    if (!(latest[i] - latest[i - 1] <= 66)) {
      break;
    }
    if (i === latest.length - 1) {
      window.sessionStorage.setItem('firstLoad', String(Date.now()));
      document.querySelectorAll('.header-image').forEach(e => (e.style.marginLeft = `-0vw`));
      return;
    }
  }
  requestAnimationFrame(handler)
}
requestAnimationFrame(handler)

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
        e.appendChild(child instanceof HTMLElement ? child : (typeof child === 'string' ? document.createTextNode(child) : gen(child.tag, child.props || {})));
      }
      continue;
    }
    e.setAttribute(k, prop instanceof Array ? (k === 'style' ? prop.join(';').replace(/\s\;\s/g, ';').replace(/\s/g, ' ').replace(/\s\s+/g, ' ').trim().replace(/\;\;+/g, ';') : prop.join(' ')) : prop);
  }
  return e;
}
const updateButton = (btn, clicked = false) => {
  if (!btn) {
    return;
  }
  const cl = btn.className;
  if (cl === 'interpolation-button-start-width') {
    if (clicked || !window['interpolation-elements'] || !window['interpolation-elements'].length) {
      window['interpolation-width'] = window['interpolation-width'] || [];
      window['interpolation-width'][0] = String(document.documentElement.clientWidth);
    }
    btn.textContent = `Start width (${window['interpolation-width'] ? window['interpolation-width'][0] : 'N/A'})`;
  }
  if (cl === 'interpolation-button-end-width') {
    if (clicked) {
      window['interpolation-width'] = window['interpolation-width'] || [];
      window['interpolation-width'][1] = String(document.documentElement.clientWidth);
    }
    btn.textContent = `End width (${(window['interpolation-width'] ? String(window['interpolation-width'][1]) : '') || String(document.documentElement.clientWidth)})`;
  }
  if (cl === 'interpolation-button-elements') {
    if (clicked) {
      window['interpolation-elements'] = null;
      window['interpolation-maps'] = null;
    }
    if (!window['interpolation-elements'] || !window['interpolation-elements'].length) {
      const x = window['interpolation-mouse'] ? window['interpolation-mouse'].x : null;
      const y = window['interpolation-mouse'] ? window['interpolation-mouse'].y : null;
      const elements = Array.from(document.elementsFromPoint(x, y)).filter(el => el !== document.documentElement && !(el instanceof Text) && typeof el.computedStyleMap === 'function');
      btn.textContent = `Selecting ${elements.length}...`;
    } else {
      btn.textContent = `Elements (${window['interpolation-elements'].length})`;
    }
  }

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
}

const finder = (className) => Array.from(document.querySelectorAll((r[className] ? '.' + r[className] : '') || (className.startsWith('.') ? className : '.' + className)));
const is = (e, className) => e instanceof Array && e.length === 0 ? false : (e instanceof HTMLElement ? e : e instanceof Array ? e[0] : e.target).classList.contains(className);
const handleClick = (e) => {
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
      const width = window['interpolation-width'] ? window['interpolation-elements'][0] : document.documentElement.clientWidth;
      btn.textContent = `Start width (${width})`;
      return;
    }
    if (is(e, r.btnEndWidth)) {
      const width = (window['interpolation-width'] ? window['interpolation-elements'][1] : NaN) || document.documentElement.clientWidth;
      btn.textContent = `End width (${width})`;
      return;
    }
    throw new Error('Unreachable code reached in handleClick');
  }
  if (!e || !e.target || !e.target.tagName || !e.target.tagName.toLowerCase) { return; }
  if (is(e, r.btnClose)) {
    console.log('Closed');
    finder(r.wrapper).map(w => w.remove());
    window['interpolation-elements'] = null;
    window['interpolation-maps'] = null;
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
          finder(r.wrapper).forEach(w=>(w.style.right = 'auto'));
  }
  if (is(e, r.btnElements)) {
    console.log('Elements button clicked');
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
    window['interpolation-wrapper'] = gen('div', {
      class: r.wrapper,
      style: [
        'position: fixed;',
        'top: 0px;',
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
  if (!window['interpolation-timer']) {
    document.addEventListener('mousemove', (e) => {
      if (!window['interpolation-mouse']) {
        return;
      }
      if (window['interpolation-mouse'].dragging) {
        const dx = e.clientX - window['interpolation-mouse'].x;
        const dy = e.clientY - window['interpolation-mouse'].y;

        finder(r.wrapper).forEach(w => {
          const x = (w.style.top||"0px").replace('px','');
          const y = (w.style.left||"0px").replace('px','');
          w.style.left = `${(x+dx*0.75).toFixed(3)}px`;
          w.style.top = `${(y+dy*0.75).toFixed(3)}px`;
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
    window['interpolation-timer'] = setInterval(() => {
      const wrapper = document.querySelector('.interpolation-wrapper');
      if (!wrapper) {
        return;
      }
        if (!window['interpolation-elements'] || !window['interpolation-elements'].length) {
          const cl = `interpolation-button-elements`;
          handleClick(document.querySelector(`.${cl}`));
          return;
        }
        if ((!window['interpolation-maps'] || !window['interpolation-maps'].length) && window['interpolation-elements'] && window['interpolation-elements'].length) {
          window['interpolation-maps'] = createStyleMaps(window['interpolation-elements']);
          const cl = `interpolation-button-styles`;
          handleClick(document.querySelector(`.${cl}`));
          return;
        }
        if (!window['interpolation-maps'] || !window['interpolation-maps'].length) {
          return;
        }
        const next = createStyleMaps(window['interpolation-elements']);
        const newMaps = deltaStyleMaps(window['interpolation-maps'], next);
        const changed = newMaps.flatMap((map, i) => map.size > 0 ? [{ el: window['interpolation-elements'][i], changes: map }] : []);
        const entries = {};
        changed.forEach(({ el, changes }) => {
          const tag = el.tagName.toLowerCase();
          const id = el.id ? `#${el.id}` : '';
          const cls = el.classList ? `.${Array.from(el.classList).join('.')}` : '';
          changes.forEach((value, prop) => {
            let orig = null;
            try {
              orig = getOriginalStyle(el, prop);
            } catch (error) {
              orig = error.message;
            }
            const key = `${tag}${id}${cls}`;
            if (!entries[key]) {
              entries[key] = { el, list: [] };
              return;
            }
            entries[key].list[prop] = orig;
          });
        });
        finder(r.btnStyles).forEach(btn => {
          btn.textContent = `Styles (${Object.keys(entries).length}/${window['interpolation-maps'].reduce((acc, map) => acc + (map.size > 0 ? 1 : 0), 0)})`;
        });
    }, 500);
  }
  if (!window['interpolation-elements']) {
    console.log('Collecting elements at', e.clientX, e.clientY);
    window['interpolation-mouse'] = window['interpolation-mouse'] || { x: e.clientX, y: e.clientY, dragging: false };
    window['interpolation-mouse'].x = e.clientX;
    window['interpolation-mouse'].y = e.clientY;
    window['interpolation-elements-click'] = { x: e.clientX, y: e.clientY };
    const x = window['interpolation-mouse'].x;
    const y = window['interpolation-mouse'].y;
    window['interpolation-elements'] = Array.from(document.elementsFromPoint(x, y)).filter(el => el !== document.documentElement && !(el instanceof Text) && typeof el.computedStyleMap === 'function');
    window['interpolation-maps'] = null;
    handleClick(finder(r.btnElements));
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
        if (rule.selectorText && el.matches(rule.selectorText)) {
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


const updateSize = () => {

};

window.addEventListener('resize', updateSize)
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
      map.set(prop, v);
    });
    return map;
  });
}

function deltaStyleMaps(previous, next) {
  return next.map((newMap, idx) => {
    const oldMap = previous[idx];
    const diffs = new Map();
    newMap.forEach((newValue, prop) => {
      const oldValue = oldMap.get(prop);
      if (newValue !== oldValue) {
        diffs.set(prop, { old: oldValue, new: newValue });
      }
    });
    return diffs;
  });
}

