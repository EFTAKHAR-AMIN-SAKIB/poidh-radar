/* Minimal DOM shim — just enough to execute the shipped UI script in Node so
   runtime errors surface without a browser. Not a spec-compliant DOM. */

class ClassList {
  constructor(node) { this.node = node; }
  _list() { return (this.node.className || "").split(/\s+/).filter(Boolean); }
  add(...cs) { const l = this._list(); cs.forEach(c => { if (!l.includes(c)) l.push(c); }); this.node.className = l.join(" "); }
  remove(...cs) { this.node.className = this._list().filter(c => !cs.includes(c)).join(" "); }
  contains(c) { return this._list().includes(c); }
  toggle(c) { this.contains(c) ? this.remove(c) : this.add(c); }
}

class Node {
  constructor(tag) {
    this.tagName = (tag || "").toUpperCase();
    this.nodeName = this.tagName;
    this.children = [];
    this.parentNode = null;
    this.attributes = {};
    this.listeners = {};
    this.style = {};
    this.className = "";
    this.id = "";
    this._text = null;
    this.innerHTMLRaw = "";
    this.value = "";
    this.hidden = false;
    this.classList = new ClassList(this);
  }
  /* ---- tree ---- */
  appendChild(n) {
    if (!n) return n;
    if (n.isFragment) { n.children.slice().forEach(c => this.appendChild(c)); n.children = []; return n; }
    if (n.parentNode) n.parentNode.removeChild(n);
    n.parentNode = this; this.children.push(n); return n;
  }
  insertBefore(n, ref) {
    if (!ref) return this.appendChild(n);
    const i = this.children.indexOf(ref);
    if (i === -1) return this.appendChild(n);
    if (n.parentNode) n.parentNode.removeChild(n);
    n.parentNode = this; this.children.splice(i, 0, n); return n;
  }
  removeChild(n) { const i = this.children.indexOf(n); if (i !== -1) { this.children.splice(i, 1); n.parentNode = null; } return n; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  replaceChildren(...nodes) {
    this.children.forEach(c => { c.parentNode = null; });
    this.children = [];
    this._text = null;
    nodes.forEach(n => { if (n !== null && n !== undefined) this.appendChild(n); });
  }
  get firstChild() { return this.children[0] || null; }
  get firstElementChild() { return this.children.find(c => c.tagName) || null; }
  get childNodes() { return this.children; }

  /* ---- attrs ---- */
  setAttribute(k, v) {
    this.attributes[k] = String(v);
    if (k === "class") this.className = String(v);
    if (k === "id") this.id = String(v);
  }
  getAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k) ? this.attributes[k] : null; }
  hasAttribute(k) { return Object.prototype.hasOwnProperty.call(this.attributes, k); }
  removeAttribute(k) { delete this.attributes[k]; }

  /* Browsers reflect these between property and attribute; the app assigns
     img.src directly, so the attribute has to follow. */
  get src() { return this.attributes.src || ""; }
  set src(v) { this.attributes.src = String(v); }
  get href() { return this.attributes.href || ""; }
  set href(v) { this.attributes.href = String(v); }

  /* ---- text ---- */
  set textContent(v) {
    this.children.forEach(c => { c.parentNode = null; });
    this.children = []; this._text = String(v);
  }
  get textContent() {
    if (this._text !== null) return this._text;
    return this.children.map(c => c.textContent).join("");
  }
  set innerHTML(v) { this.innerHTMLRaw = String(v); this.children = []; this._text = null; }
  get innerHTML() { return this.innerHTMLRaw; }

  /* ---- events ---- */
  addEventListener(t, fn) { (this.listeners[t] = this.listeners[t] || []).push(fn); }
  removeEventListener(t, fn) { if (this.listeners[t]) this.listeners[t] = this.listeners[t].filter(f => f !== fn); }
  dispatchEvent(ev) {
    ev.target = ev.target || this;
    (this.listeners[ev.type] || []).slice().forEach(fn => fn.call(this, ev));
    return true;
  }
  click() { this.dispatchEvent({ type: "click", target: this }); }
  focus() { doc.activeElement = this; }
  blur() { if (doc.activeElement === this) doc.activeElement = doc.body; }
  select() {}

  /* ---- queries ---- */
  _walk(out) { this.children.forEach(c => { out.push(c); c._walk && c._walk(out); }); return out; }
  /* Supports comma lists and compound class selectors (".proof.accepted"),
     plus "tag.class". Enough for the assertions; not a full selector engine. */
  querySelectorAll(sel) {
    const nodes = this._walk([]);
    const groups = String(sel).split(",").map(s => s.trim()).filter(Boolean);
    const out = [];
    for (const g of groups) {
      const parts = g.match(/(^[a-zA-Z][\w-]*)|(\.[\w-]+)|(#[\w-]+)/g) || [];
      for (const n of nodes) {
        if (out.includes(n)) continue;
        const hit = parts.every(p => {
          if (p[0] === ".") return n.classList && n.classList.contains(p.slice(1));
          if (p[0] === "#") return n.id === p.slice(1);
          return n.tagName === p.toUpperCase();
        });
        if (hit && parts.length) out.push(n);
      }
    }
    return out;
  }
  querySelector(sel) { return this.querySelectorAll(sel)[0] || null; }
}

class TextNode {
  constructor(t) { this._t = String(t); this.parentNode = null; }
  get textContent() { return this._t; }
  set textContent(v) { this._t = String(v); }
  _walk(out) { return out; }
}

class Fragment extends Node {
  constructor() { super("#fragment"); this.isFragment = true; }
}

const doc = {
  readyState: "complete",
  createElement: t => new Node(t),
  createTextNode: t => new TextNode(t),
  createDocumentFragment: () => new Fragment(),
  getElementById: id => doc._byId[id] || null,
  addEventListener: (t, fn) => { (doc._l[t] = doc._l[t] || []).push(fn); },
  dispatchEvent: ev => { (doc._l[ev.type] || []).slice().forEach(fn => fn(ev)); },
  execCommand: () => true,
  _l: {},
  _byId: {},
  body: new Node("body"),
  documentElement: new Node("html"),
  activeElement: null
};
doc.activeElement = doc.body;

/** Register the ids the app expects to find. */
export function mountIds(ids) {
  ids.forEach(id => { const n = new Node("div"); n.id = id; doc._byId[id] = n; doc.body.appendChild(n); });
  // #loadbar needs an inner <i> like the real markup
  if (doc._byId.loadbar) doc._byId.loadbar.appendChild(new Node("i"));
}

const win = {
  addEventListener: (t, fn) => { (win._l[t] = win._l[t] || []).push(fn); },
  dispatchEvent: ev => { (win._l[ev.type] || []).slice().forEach(fn => fn(ev)); },
  _l: {},
  parent: null,
  postMessage: () => {}
};

const loc = { href: "http://localhost/", pathname: "/", search: "", hash: "", origin: "http://localhost" };
const hist = {
  replaceState: (a, b, url) => {
    if (typeof url !== "string") return;
    const hi = url.indexOf("#");
    loc.hash = hi === -1 ? "" : url.slice(hi);
    loc.href = "http://localhost" + url;
  },
  pushState: (a, b, url) => hist.replaceState(a, b, url)
};

/* Some of these (navigator) are getter-only on modern Node, so plain
   assignment throws. defineProperty works for both cases. */
function setGlobal(name, value) {
  Object.defineProperty(globalThis, name, { value, writable: true, configurable: true, enumerable: true });
}

export const clipboardWrites = [];

export function installGlobals() {
  setGlobal("document", doc);
  setGlobal("window", win);
  setGlobal("location", loc);
  setGlobal("history", hist);
  setGlobal("navigator", {
    clipboard: { writeText: t => { clipboardWrites.push(String(t)); return Promise.resolve(); } },
    userAgent: "node"
  });
  win.document = doc; win.location = loc; win.history = hist;
  win.parent = win;
  win.navigator = globalThis.navigator;
  return { doc, win, loc, hist };
}

export { doc, win, loc, hist, Node };
