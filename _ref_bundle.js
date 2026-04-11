const Ux = () => Promise.resolve().then(() => Wx), { Fragment: Cr, jsx: n, jsxs: s } = globalThis.__GLOBALS__.ReactJSXRuntime;
"use" in globalThis.__GLOBALS__.React || (globalThis.__GLOBALS__.React.use = () => {
  throw new Error("`use` is not available in this version of React. Make currently only supports React 18, but `use` is only available in React 19+.");
});
function fl(e) {
  const t = e?.props?._fgT, r = typeof t == "function" || typeof t == "string" || typeof t == "object" && t !== null && "$$typeof" in t;
  return globalThis.__GLOBALS__.React.isValidElement(e) && r;
}
function $n(e) {
  return globalThis.__GLOBALS__.React.isValidElement(e) && e.type === "fg-txt";
}
function pl(e) {
  const { _fgT: t, _fgS: r, _fgB: a, _fgD: i, ...o } = e.props;
  return globalThis.__GLOBALS__.React.createElement(t, {
    ...o,
    key: e.key
  }, o.children);
}
function xa(e) {
  return fl(e) ? pl(e) : $n(e) ? e.props.children : e;
}
const Rn = globalThis.__GLOBALS__.React.Children, Vt = {
  map(e, t, r) {
    return Rn.map(e, (a, i) => {
      const o = xa(a);
      return $n(a) ? null : t.call(r, o, i);
    });
  },
  forEach(e, t, r) {
    Rn.forEach(e, (a, i) => {
      if ($n(a))
        return;
      const o = xa(a);
      t.call(r, o, i);
    });
  },
  count(e) {
    let t = 0;
    return Rn.forEach(e, (r) => {
      $n(r) || t++;
    }), t;
  },
  toArray(e) {
    const t = [];
    return Rn.forEach(e, (r) => {
      $n(r) || t.push(xa(r));
    }), t;
  },
  only(e) {
    const t = Rn.only(e);
    return xa(t);
  }
}, bo = [
  "_fgT",
  "_fgS",
  "_fgB",
  "_fgD"
];
function Tu(e) {
  if (e == null || typeof e != "object") return e;
  const t = Object.keys(e);
  let r = !1;
  for (let i = 0; i < bo.length; i++)
    if (bo[i] in e) {
      r = !0;
      break;
    }
  if (!r) return e;
  const a = {};
  for (let i = 0; i < t.length; i++) {
    const o = t[i];
    bo.indexOf(o) === -1 && (a[o] = e[o]);
  }
  return a;
}
const Ji = globalThis.__GLOBALS__.React.cloneElement, mn = (e, ...t) => {
  if (fl(e)) {
    const r = pl(e), a = t[0];
    return a != null && typeof a == "object" && (t = [
      Tu(a),
      ...t.slice(1)
    ]), Ji(r, ...t);
  }
  return Ji(e, ...t);
}, B = {
  ...globalThis.__GLOBALS__.React,
  Children: Vt,
  cloneElement: mn
}, { Component: gl, createContext: et, createElement: me, createFactory: Au, createRef: Du, forwardRef: Q, Fragment: ar, isValidElement: Vn, lazy: Mu, memo: di, Profiler: Iu, PureComponent: Ou, startTransition: Hn, StrictMode: $u, Suspense: Lu, use: _u, useCallback: Ae, useContext: ke, useDebugValue: Bu, useDeferredValue: Fu, useEffect: xe, useId: zu, useImperativeHandle: ju, useInsertionEffect: Wu, useLayoutEffect: hn, useMemo: He, useReducer: vl, useRef: ve, useState: j, useSyncExternalStore: Uu, useTransition: Vu, version: Hu, __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: Gu } = globalThis.__GLOBALS__.React, bl = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  Children: Vt,
  Component: gl,
  Fragment: ar,
  Profiler: Iu,
  PureComponent: Ou,
  StrictMode: $u,
  Suspense: Lu,
  __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: Gu,
  cloneElement: mn,
  createContext: et,
  createElement: me,
  createFactory: Au,
  createRef: Du,
  default: B,
  forwardRef: Q,
  isValidElement: Vn,
  lazy: Mu,
  memo: di,
  startTransition: Hn,
  use: _u,
  useCallback: Ae,
  useContext: ke,
  useDebugValue: Bu,
  useDeferredValue: Fu,
  useEffect: xe,
  useId: zu,
  useImperativeHandle: ju,
  useInsertionEffect: Wu,
  useLayoutEffect: hn,
  useMemo: He,
  useReducer: vl,
  useRef: ve,
  useState: j,
  useSyncExternalStore: Uu,
  useTransition: Vu,
  version: Hu
}, Symbol.toStringTag, { value: "Module" }));
/**
 * react-router v7.13.0
 *
 * Copyright (c) Remix Software Inc.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE.md file in the root directory of this source tree.
 *
 * @license MIT
 */
var yl = (e) => {
  throw TypeError(e);
}, Ku = (e, t, r) => t.has(e) || yl("Cannot " + r), yo = (e, t, r) => (Ku(e, t, "read from private field"), r ? r.call(e) : t.get(e)), Yu = (e, t, r) => t.has(e) ? yl("Cannot add the same private member more than once") : t instanceof WeakSet ? t.add(e) : t.set(e, r), Zi = "popstate";
function qu(e = {}) {
  function t(a, i) {
    let { pathname: o, search: l, hash: u } = a.location;
    return Gn(
      "",
      { pathname: o, search: l, hash: u },
      // state defaults to `null` because `window.history.state` does
      i.state && i.state.usr || null,
      i.state && i.state.key || "default"
    );
  }
  function r(a, i) {
    return typeof i == "string" ? i : Kt(i);
  }
  return Qu(
    t,
    r,
    null,
    e
  );
}
function Pe(e, t) {
  if (e === !1 || e === null || typeof e > "u")
    throw new Error(t);
}
function Ze(e, t) {
  if (!e) {
    typeof console < "u" && console.warn(t);
    try {
      throw new Error(t);
    } catch {
    }
  }
}
function Xu() {
  return Math.random().toString(36).substring(2, 10);
}
function es(e, t) {
  return {
    usr: e.state,
    key: e.key,
    idx: t
  };
}
function Gn(e, t, r = null, a) {
  return {
    pathname: typeof e == "string" ? e : e.pathname,
    search: "",
    hash: "",
    ...typeof t == "string" ? Tr(t) : t,
    state: r,
    // TODO: This could be cleaned up.  push/replace should probably just take
    // full Locations now and avoid the need to run through this flow at all
    // But that's a pretty big refactor to the current test suite so going to
    // keep as is for the time being and just let any incoming keys take precedence
    key: t && t.key || a || Xu()
  };
}
function Kt({
  pathname: e = "/",
  search: t = "",
  hash: r = ""
}) {
  return t && t !== "?" && (e += t.charAt(0) === "?" ? t : "?" + t), r && r !== "#" && (e += r.charAt(0) === "#" ? r : "#" + r), e;
}
function Tr(e) {
  let t = {};
  if (e) {
    let r = e.indexOf("#");
    r >= 0 && (t.hash = e.substring(r), e = e.substring(0, r));
    let a = e.indexOf("?");
    a >= 0 && (t.search = e.substring(a), e = e.substring(0, a)), e && (t.pathname = e);
  }
  return t;
}
function Qu(e, t, r, a = {}) {
  let { window: i = document.defaultView, v5Compat: o = !1 } = a, l = i.history, u = "POP", c = null, d = h();
  d == null && (d = 0, l.replaceState({ ...l.state, idx: d }, ""));
  function h() {
    return (l.state || { idx: null }).idx;
  }
  function m() {
    u = "POP";
    let b = h(), w = b == null ? null : b - d;
    d = b, c && c({ action: u, location: v.location, delta: w });
  }
  function f(b, w) {
    u = "PUSH";
    let y = Gn(v.location, b, w);
    d = h() + 1;
    let k = es(y, d), N = v.createHref(y);
    try {
      l.pushState(k, "", N);
    } catch (T) {
      if (T instanceof DOMException && T.name === "DataCloneError")
        throw T;
      i.location.assign(N);
    }
    o && c && c({ action: u, location: v.location, delta: 1 });
  }
  function g(b, w) {
    u = "REPLACE";
    let y = Gn(v.location, b, w);
    d = h();
    let k = es(y, d), N = v.createHref(y);
    l.replaceState(k, "", N), o && c && c({ action: u, location: v.location, delta: 0 });
  }
  function p(b) {
    return xl(b);
  }
  let v = {
    get action() {
      return u;
    },
    get location() {
      return e(i, l);
    },
    listen(b) {
      if (c)
        throw new Error("A history only accepts one active listener");
      return i.addEventListener(Zi, m), c = b, () => {
        i.removeEventListener(Zi, m), c = null;
      };
    },
    createHref(b) {
      return t(i, b);
    },
    createURL: p,
    encodeLocation(b) {
      let w = p(b);
      return {
        pathname: w.pathname,
        search: w.search,
        hash: w.hash
      };
    },
    push: f,
    replace: g,
    go(b) {
      return l.go(b);
    }
  };
  return v;
}
function xl(e, t = !1) {
  let r = "http://localhost";
  typeof window < "u" && (r = window.location.origin !== "null" ? window.location.origin : window.location.href), Pe(r, "No window.location.(origin|href) available to create URL");
  let a = typeof e == "string" ? e : Kt(e);
  return a = a.replace(/ $/, "%20"), !t && a.startsWith("//") && (a = r + a), new URL(a, r);
}
var Ln, ts = class {
  /**
   * Create a new `RouterContextProvider` instance
   * @param init An optional initial context map to populate the provider with
   */
  constructor(e) {
    if (Yu(this, Ln, /* @__PURE__ */ new Map()), e)
      for (let [t, r] of e)
        this.set(t, r);
  }
  /**
   * Access a value from the context. If no value has been set for the context,
   * it will return the context's `defaultValue` if provided, or throw an error
   * if no `defaultValue` was set.
   * @param context The context to get the value for
   * @returns The value for the context, or the context's `defaultValue` if no
   * value was set
   */
  get(e) {
    if (yo(this, Ln).has(e))
      return yo(this, Ln).get(e);
    if (e.defaultValue !== void 0)
      return e.defaultValue;
    throw new Error("No value found for context");
  }
  /**
   * Set a value for the context. If the context already has a value set, this
   * will overwrite it.
   *
   * @param context The context to set the value for
   * @param value The value to set for the context
   * @returns {void}
   */
  set(e, t) {
    yo(this, Ln).set(e, t);
  }
};
Ln = /* @__PURE__ */ new WeakMap();
var Ju = /* @__PURE__ */ new Set([
  "lazy",
  "caseSensitive",
  "path",
  "id",
  "index",
  "children"
]);
function Zu(e) {
  return Ju.has(
    e
  );
}
var em = /* @__PURE__ */ new Set([
  "lazy",
  "caseSensitive",
  "path",
  "id",
  "index",
  "middleware",
  "children"
]);
function tm(e) {
  return em.has(
    e
  );
}
function rm(e) {
  return e.index === !0;
}
function Kn(e, t, r = [], a = {}, i = !1) {
  return e.map((o, l) => {
    let u = [...r, String(l)], c = typeof o.id == "string" ? o.id : u.join("-");
    if (Pe(
      o.index !== !0 || !o.children,
      "Cannot specify children on an index route"
    ), Pe(
      i || !a[c],
      `Found a route id collision on id "${c}".  Route id's must be globally unique within Data Router usages`
    ), rm(o)) {
      let d = {
        ...o,
        id: c
      };
      return a[c] = rs(
        d,
        t(d)
      ), d;
    } else {
      let d = {
        ...o,
        id: c,
        children: void 0
      };
      return a[c] = rs(
        d,
        t(d)
      ), o.children && (d.children = Kn(
        o.children,
        t,
        u,
        a,
        i
      )), d;
    }
  });
}
function rs(e, t) {
  return Object.assign(e, {
    ...t,
    ...typeof t.lazy == "object" && t.lazy != null ? {
      lazy: {
        ...e.lazy,
        ...t.lazy
      }
    } : {}
  });
}
function fr(e, t, r = "/") {
  return _n(e, t, r, !1);
}
function _n(e, t, r, a) {
  let i = typeof t == "string" ? Tr(t) : t, o = Rt(i.pathname || "/", r);
  if (o == null)
    return null;
  let l = wl(e);
  am(l);
  let u = null;
  for (let c = 0; u == null && c < l.length; ++c) {
    let d = pm(o);
    u = hm(
      l[c],
      d,
      a
    );
  }
  return u;
}
function nm(e, t) {
  let { route: r, pathname: a, params: i } = e;
  return {
    id: r.id,
    pathname: a,
    params: i,
    data: t[r.id],
    loaderData: t[r.id],
    handle: r.handle
  };
}
function wl(e, t = [], r = [], a = "", i = !1) {
  let o = (l, u, c = i, d) => {
    let h = {
      relativePath: d === void 0 ? l.path || "" : d,
      caseSensitive: l.caseSensitive === !0,
      childrenIndex: u,
      route: l
    };
    if (h.relativePath.startsWith("/")) {
      if (!h.relativePath.startsWith(a) && c)
        return;
      Pe(
        h.relativePath.startsWith(a),
        `Absolute route path "${h.relativePath}" nested under path "${a}" is not valid. An absolute child route path must start with the combined path of all its parent routes.`
      ), h.relativePath = h.relativePath.slice(a.length);
    }
    let m = Ht([a, h.relativePath]), f = r.concat(h);
    l.children && l.children.length > 0 && (Pe(
      // Our types know better, but runtime JS may not!
      // @ts-expect-error
      l.index !== !0,
      `Index routes must not have child routes. Please remove all child routes from route path "${m}".`
    ), wl(
      l.children,
      t,
      f,
      m,
      c
    )), !(l.path == null && !l.index) && t.push({
      path: m,
      score: um(m, l.index),
      routesMeta: f
    });
  };
  return e.forEach((l, u) => {
    if (l.path === "" || !l.path?.includes("?"))
      o(l, u);
    else
      for (let c of Nl(l.path))
        o(l, u, !0, c);
  }), t;
}
function Nl(e) {
  let t = e.split("/");
  if (t.length === 0) return [];
  let [r, ...a] = t, i = r.endsWith("?"), o = r.replace(/\?$/, "");
  if (a.length === 0)
    return i ? [o, ""] : [o];
  let l = Nl(a.join("/")), u = [];
  return u.push(
    ...l.map(
      (c) => c === "" ? o : [o, c].join("/")
    )
  ), i && u.push(...l), u.map(
    (c) => e.startsWith("/") && c === "" ? "/" : c
  );
}
function am(e) {
  e.sort(
    (t, r) => t.score !== r.score ? r.score - t.score : mm(
      t.routesMeta.map((a) => a.childrenIndex),
      r.routesMeta.map((a) => a.childrenIndex)
    )
  );
}
var om = /^:[\w-]+$/, im = 3, sm = 2, lm = 1, cm = 10, dm = -2, ns = (e) => e === "*";
function um(e, t) {
  let r = e.split("/"), a = r.length;
  return r.some(ns) && (a += dm), t && (a += sm), r.filter((i) => !ns(i)).reduce(
    (i, o) => i + (om.test(o) ? im : o === "" ? lm : cm),
    a
  );
}
function mm(e, t) {
  return e.length === t.length && e.slice(0, -1).every((a, i) => a === t[i]) ? (
    // If two routes are siblings, we should try to match the earlier sibling
    // first. This allows people to have fine-grained control over the matching
    // behavior by simply putting routes with identical paths in the order they
    // want them tried.
    e[e.length - 1] - t[t.length - 1]
  ) : (
    // Otherwise, it doesn't really make sense to rank non-siblings by index,
    // so they sort equally.
    0
  );
}
function hm(e, t, r = !1) {
  let { routesMeta: a } = e, i = {}, o = "/", l = [];
  for (let u = 0; u < a.length; ++u) {
    let c = a[u], d = u === a.length - 1, h = o === "/" ? t : t.slice(o.length) || "/", m = Ua(
      { path: c.relativePath, caseSensitive: c.caseSensitive, end: d },
      h
    ), f = c.route;
    if (!m && d && r && !a[a.length - 1].route.index && (m = Ua(
      {
        path: c.relativePath,
        caseSensitive: c.caseSensitive,
        end: !1
      },
      h
    )), !m)
      return null;
    Object.assign(i, m.params), l.push({
      // TODO: Can this as be avoided?
      params: i,
      pathname: Ht([o, m.pathname]),
      pathnameBase: bm(
        Ht([o, m.pathnameBase])
      ),
      route: f
    }), m.pathnameBase !== "/" && (o = Ht([o, m.pathnameBase]));
  }
  return l;
}
function Ua(e, t) {
  typeof e == "string" && (e = { path: e, caseSensitive: !1, end: !0 });
  let [r, a] = fm(
    e.path,
    e.caseSensitive,
    e.end
  ), i = t.match(r);
  if (!i) return null;
  let o = i[0], l = o.replace(/(.)\/+$/, "$1"), u = i.slice(1);
  return {
    params: a.reduce(
      (d, { paramName: h, isOptional: m }, f) => {
        if (h === "*") {
          let p = u[f] || "";
          l = o.slice(0, o.length - p.length).replace(/(.)\/+$/, "$1");
        }
        const g = u[f];
        return m && !g ? d[h] = void 0 : d[h] = (g || "").replace(/%2F/g, "/"), d;
      },
      {}
    ),
    pathname: o,
    pathnameBase: l,
    pattern: e
  };
}
function fm(e, t = !1, r = !0) {
  Ze(
    e === "*" || !e.endsWith("*") || e.endsWith("/*"),
    `Route path "${e}" will be treated as if it were "${e.replace(/\*$/, "/*")}" because the \`*\` character must always follow a \`/\` in the pattern. To get rid of this warning, please change the route path to "${e.replace(/\*$/, "/*")}".`
  );
  let a = [], i = "^" + e.replace(/\/*\*?$/, "").replace(/^\/*/, "/").replace(/[\\.*+^${}|()[\]]/g, "\\$&").replace(
    /\/:([\w-]+)(\?)?/g,
    (l, u, c) => (a.push({ paramName: u, isOptional: c != null }), c ? "/?([^\\/]+)?" : "/([^\\/]+)")
  ).replace(/\/([\w-]+)\?(\/|$)/g, "(/$1)?$2");
  return e.endsWith("*") ? (a.push({ paramName: "*" }), i += e === "*" || e === "/*" ? "(.*)$" : "(?:\\/(.+)|\\/*)$") : r ? i += "\\/*$" : e !== "" && e !== "/" && (i += "(?:(?=\\/|$))"), [new RegExp(i, t ? void 0 : "i"), a];
}
function pm(e) {
  try {
    return e.split("/").map((t) => decodeURIComponent(t).replace(/\//g, "%2F")).join("/");
  } catch (t) {
    return Ze(
      !1,
      `The URL path "${e}" could not be decoded because it is a malformed URL segment. This is probably due to a bad percent encoding (${t}).`
    ), e;
  }
}
function Rt(e, t) {
  if (t === "/") return e;
  if (!e.toLowerCase().startsWith(t.toLowerCase()))
    return null;
  let r = t.endsWith("/") ? t.length - 1 : t.length, a = e.charAt(r);
  return a && a !== "/" ? null : e.slice(r) || "/";
}
function gm({
  basename: e,
  pathname: t
}) {
  return t === "/" ? e : Ht([e, t]);
}
var Cl = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i, ui = (e) => Cl.test(e);
function vm(e, t = "/") {
  let {
    pathname: r,
    search: a = "",
    hash: i = ""
  } = typeof e == "string" ? Tr(e) : e, o;
  return r ? (r = r.replace(/\/\/+/g, "/"), r.startsWith("/") ? o = as(r.substring(1), "/") : o = as(r, t)) : o = t, {
    pathname: o,
    search: ym(a),
    hash: xm(i)
  };
}
function as(e, t) {
  let r = t.replace(/\/+$/, "").split("/");
  return e.split("/").forEach((i) => {
    i === ".." ? r.length > 1 && r.pop() : i !== "." && r.push(i);
  }), r.length > 1 ? r.join("/") : "/";
}
function xo(e, t, r, a) {
  return `Cannot include a '${e}' character in a manually specified \`to.${t}\` field [${JSON.stringify(
    a
  )}].  Please separate it out to the \`to.${r}\` field. Alternatively you may provide the full path as a string in <Link to="..."> and the router will parse it for you.`;
}
function kl(e) {
  return e.filter(
    (t, r) => r === 0 || t.route.path && t.route.path.length > 0
  );
}
function mi(e) {
  let t = kl(e);
  return t.map(
    (r, a) => a === t.length - 1 ? r.pathname : r.pathnameBase
  );
}
function hi(e, t, r, a = !1) {
  let i;
  typeof e == "string" ? i = Tr(e) : (i = { ...e }, Pe(
    !i.pathname || !i.pathname.includes("?"),
    xo("?", "pathname", "search", i)
  ), Pe(
    !i.pathname || !i.pathname.includes("#"),
    xo("#", "pathname", "hash", i)
  ), Pe(
    !i.search || !i.search.includes("#"),
    xo("#", "search", "hash", i)
  ));
  let o = e === "" || i.pathname === "", l = o ? "/" : i.pathname, u;
  if (l == null)
    u = r;
  else {
    let m = t.length - 1;
    if (!a && l.startsWith("..")) {
      let f = l.split("/");
      for (; f[0] === ".."; )
        f.shift(), m -= 1;
      i.pathname = f.join("/");
    }
    u = m >= 0 ? t[m] : "/";
  }
  let c = vm(i, u), d = l && l !== "/" && l.endsWith("/"), h = (o || l === ".") && r.endsWith("/");
  return !c.pathname.endsWith("/") && (d || h) && (c.pathname += "/"), c;
}
var Ht = (e) => e.join("/").replace(/\/\/+/g, "/"), bm = (e) => e.replace(/\/+$/, "").replace(/^\/*/, "/"), ym = (e) => !e || e === "?" ? "" : e.startsWith("?") ? e : "?" + e, xm = (e) => !e || e === "#" ? "" : e.startsWith("#") ? e : "#" + e, na = class {
  constructor(e, t, r, a = !1) {
    this.status = e, this.statusText = t || "", this.internal = a, r instanceof Error ? (this.data = r.toString(), this.error = r) : this.data = r;
  }
};
function Yn(e) {
  return e != null && typeof e.status == "number" && typeof e.statusText == "string" && typeof e.internal == "boolean" && "data" in e;
}
function aa(e) {
  return e.map((t) => t.route.path).filter(Boolean).join("/").replace(/\/\/*/g, "/") || "/";
}
var Sl = typeof window < "u" && typeof window.document < "u" && typeof window.document.createElement < "u";
function El(e, t) {
  let r = e;
  if (typeof r != "string" || !Cl.test(r))
    return {
      absoluteURL: void 0,
      isExternal: !1,
      to: r
    };
  let a = r, i = !1;
  if (Sl)
    try {
      let o = new URL(window.location.href), l = r.startsWith("//") ? new URL(o.protocol + r) : new URL(r), u = Rt(l.pathname, t);
      l.origin === o.origin && u != null ? r = u + l.search + l.hash : i = !0;
    } catch {
      Ze(
        !1,
        `<Link to="${r}"> contains an invalid URL which will probably break when clicked - please update to a valid URL path.`
      );
    }
  return {
    absoluteURL: a,
    isExternal: i,
    to: r
  };
}
var xr = Symbol("Uninstrumented");
function wm(e, t) {
  let r = {
    lazy: [],
    "lazy.loader": [],
    "lazy.action": [],
    "lazy.middleware": [],
    middleware: [],
    loader: [],
    action: []
  };
  e.forEach(
    (i) => i({
      id: t.id,
      index: t.index,
      path: t.path,
      instrument(o) {
        let l = Object.keys(r);
        for (let u of l)
          o[u] && r[u].push(o[u]);
      }
    })
  );
  let a = {};
  if (typeof t.lazy == "function" && r.lazy.length > 0) {
    let i = an(r.lazy, t.lazy, () => {
    });
    i && (a.lazy = i);
  }
  if (typeof t.lazy == "object") {
    let i = t.lazy;
    ["middleware", "loader", "action"].forEach((o) => {
      let l = i[o], u = r[`lazy.${o}`];
      if (typeof l == "function" && u.length > 0) {
        let c = an(u, l, () => {
        });
        c && (a.lazy = Object.assign(a.lazy || {}, {
          [o]: c
        }));
      }
    });
  }
  return ["loader", "action"].forEach((i) => {
    let o = t[i];
    if (typeof o == "function" && r[i].length > 0) {
      let l = o[xr] ?? o, u = an(
        r[i],
        l,
        (...c) => os(c[0])
      );
      u && (i === "loader" && l.hydrate === !0 && (u.hydrate = !0), u[xr] = l, a[i] = u);
    }
  }), t.middleware && t.middleware.length > 0 && r.middleware.length > 0 && (a.middleware = t.middleware.map((i) => {
    let o = i[xr] ?? i, l = an(
      r.middleware,
      o,
      (...u) => os(u[0])
    );
    return l ? (l[xr] = o, l) : i;
  })), a;
}
function Nm(e, t) {
  let r = {
    navigate: [],
    fetch: []
  };
  if (t.forEach(
    (a) => a({
      instrument(i) {
        let o = Object.keys(i);
        for (let l of o)
          i[l] && r[l].push(i[l]);
      }
    })
  ), r.navigate.length > 0) {
    let a = e.navigate[xr] ?? e.navigate, i = an(
      r.navigate,
      a,
      (...o) => {
        let [l, u] = o;
        return {
          to: typeof l == "number" || typeof l == "string" ? l : l ? Kt(l) : ".",
          ...is(e, u ?? {})
        };
      }
    );
    i && (i[xr] = a, e.navigate = i);
  }
  if (r.fetch.length > 0) {
    let a = e.fetch[xr] ?? e.fetch, i = an(r.fetch, a, (...o) => {
      let [l, , u, c] = o;
      return {
        href: u ?? ".",
        fetcherKey: l,
        ...is(e, c ?? {})
      };
    });
    i && (i[xr] = a, e.fetch = i);
  }
  return e;
}
function an(e, t, r) {
  return e.length === 0 ? null : async (...a) => {
    let i = await Pl(
      e,
      r(...a),
      () => t(...a),
      e.length - 1
    );
    if (i.type === "error")
      throw i.value;
    return i.value;
  };
}
async function Pl(e, t, r, a) {
  let i = e[a], o;
  if (i) {
    let l, u = async () => (l ? console.error("You cannot call instrumented handlers more than once") : l = Pl(e, t, r, a - 1), o = await l, Pe(o, "Expected a result"), o.type === "error" && o.value instanceof Error ? { status: "error", error: o.value } : { status: "success", error: void 0 });
    try {
      await i(u, t);
    } catch (c) {
      console.error("An instrumentation function threw an error:", c);
    }
    l || await u(), await l;
  } else
    try {
      o = { type: "success", value: await r() };
    } catch (l) {
      o = { type: "error", value: l };
    }
  return o || {
    type: "error",
    value: new Error("No result assigned in instrumentation chain.")
  };
}
function os(e) {
  let { request: t, context: r, params: a, unstable_pattern: i } = e;
  return {
    request: Cm(t),
    params: { ...a },
    unstable_pattern: i,
    context: km(r)
  };
}
function is(e, t) {
  return {
    currentUrl: Kt(e.state.location),
    ..."formMethod" in t ? { formMethod: t.formMethod } : {},
    ..."formEncType" in t ? { formEncType: t.formEncType } : {},
    ..."formData" in t ? { formData: t.formData } : {},
    ..."body" in t ? { body: t.body } : {}
  };
}
function Cm(e) {
  return {
    method: e.method,
    url: e.url,
    headers: {
      get: (...t) => e.headers.get(...t)
    }
  };
}
function km(e) {
  if (Em(e)) {
    let t = { ...e };
    return Object.freeze(t), t;
  } else
    return {
      get: (t) => e.get(t)
    };
}
var Sm = Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function Em(e) {
  if (e === null || typeof e != "object")
    return !1;
  const t = Object.getPrototypeOf(e);
  return t === Object.prototype || t === null || Object.getOwnPropertyNames(t).sort().join("\0") === Sm;
}
var Rl = [
  "POST",
  "PUT",
  "PATCH",
  "DELETE"
], Pm = new Set(
  Rl
), Rm = [
  "GET",
  ...Rl
], Tm = new Set(Rm), Tl = /* @__PURE__ */ new Set([301, 302, 303, 307, 308]), Am = /* @__PURE__ */ new Set([307, 308]), wo = {
  state: "idle",
  location: void 0,
  formMethod: void 0,
  formAction: void 0,
  formEncType: void 0,
  formData: void 0,
  json: void 0,
  text: void 0
}, Dm = {
  state: "idle",
  data: void 0,
  formMethod: void 0,
  formAction: void 0,
  formEncType: void 0,
  formData: void 0,
  json: void 0,
  text: void 0
}, Tn = {
  state: "unblocked",
  proceed: void 0,
  reset: void 0,
  location: void 0
}, Mm = (e) => ({
  hasErrorBoundary: !!e.hasErrorBoundary
}), Al = "remix-router-transitions", Dl = Symbol("ResetLoaderData");
function Im(e) {
  const t = e.window ? e.window : typeof window < "u" ? window : void 0, r = typeof t < "u" && typeof t.document < "u" && typeof t.document.createElement < "u";
  Pe(
    e.routes.length > 0,
    "You must provide a non-empty routes array to createRouter"
  );
  let a = e.hydrationRouteProperties || [], i = e.mapRouteProperties || Mm, o = i;
  if (e.unstable_instrumentations) {
    let C = e.unstable_instrumentations;
    o = (P) => ({
      ...i(P),
      ...wm(
        C.map((M) => M.route).filter(Boolean),
        P
      )
    });
  }
  let l = {}, u = Kn(
    e.routes,
    o,
    void 0,
    l
  ), c, d = e.basename || "/";
  d.startsWith("/") || (d = `/${d}`);
  let h = e.dataStrategy || Bm, m = {
    ...e.future
  }, f = null, g = /* @__PURE__ */ new Set(), p = null, v = null, b = null, w = e.hydrationData != null, y = fr(u, e.history.location, d), k = !1, N = null, T;
  if (y == null && !e.patchRoutesOnNavigation) {
    let C = Et(404, {
      pathname: e.history.location.pathname
    }), { matches: P, route: M } = wa(u);
    T = !0, y = P, N = { [M.id]: C };
  } else if (y && !e.hydrationData && nt(
    y,
    u,
    e.history.location.pathname
  ).active && (y = null), y)
    if (y.some((C) => C.route.lazy))
      T = !1;
    else if (!y.some((C) => fi(C.route)))
      T = !0;
    else {
      let C = e.hydrationData ? e.hydrationData.loaderData : null, P = e.hydrationData ? e.hydrationData.errors : null;
      if (P) {
        let M = y.findIndex(
          (z) => P[z.route.id] !== void 0
        );
        T = y.slice(0, M + 1).every(
          (z) => !zo(z.route, C, P)
        );
      } else
        T = y.every(
          (M) => !zo(M.route, C, P)
        );
    }
  else {
    T = !1, y = [];
    let C = nt(
      null,
      u,
      e.history.location.pathname
    );
    C.active && C.matches && (k = !0, y = C.matches);
  }
  let _, x = {
    historyAction: e.history.action,
    location: e.history.location,
    matches: y,
    initialized: T,
    navigation: wo,
    // Don't restore on initial updateState() if we were SSR'd
    restoreScrollPosition: e.hydrationData != null ? !1 : null,
    preventScrollReset: !1,
    revalidation: "idle",
    loaderData: e.hydrationData && e.hydrationData.loaderData || {},
    actionData: e.hydrationData && e.hydrationData.actionData || null,
    errors: e.hydrationData && e.hydrationData.errors || N,
    fetchers: /* @__PURE__ */ new Map(),
    blockers: /* @__PURE__ */ new Map()
  }, R = "POP", F = null, V = !1, E, S = !1, $ = /* @__PURE__ */ new Map(), A = null, U = !1, I = !1, Y = /* @__PURE__ */ new Set(), D = /* @__PURE__ */ new Map(), J = 0, we = -1, he = /* @__PURE__ */ new Map(), be = /* @__PURE__ */ new Set(), re = /* @__PURE__ */ new Map(), pe = /* @__PURE__ */ new Map(), Me = /* @__PURE__ */ new Set(), Ne = /* @__PURE__ */ new Map(), K, ge = null;
  function L() {
    if (f = e.history.listen(
      ({ action: C, location: P, delta: M }) => {
        if (K) {
          K(), K = void 0;
          return;
        }
        Ze(
          Ne.size === 0 || M != null,
          "You are trying to use a blocker on a POP navigation to a location that was not created by @remix-run/router. This will fail silently in production. This can happen if you are navigating outside the router via `window.history.pushState`/`window.location.hash` instead of using router navigation APIs.  This can also happen if you are using createHashRouter and the user manually changes the URL."
        );
        let z = pa({
          currentLocation: x.location,
          nextLocation: P,
          historyAction: C
        });
        if (z && M != null) {
          let H = new Promise((ie) => {
            K = ie;
          });
          e.history.go(M * -1), Yr(z, {
            state: "blocked",
            location: P,
            proceed() {
              Yr(z, {
                state: "proceeding",
                proceed: void 0,
                reset: void 0,
                location: P
              }), H.then(() => e.history.go(M));
            },
            reset() {
              let ie = new Map(x.blockers);
              ie.set(z, Tn), ne({ blockers: ie });
            }
          }), F?.resolve(), F = null;
          return;
        }
        return st(C, P);
      }
    ), r) {
      rh(t, $);
      let C = () => nh(t, $);
      t.addEventListener("pagehide", C), A = () => t.removeEventListener("pagehide", C);
    }
    return x.initialized || st("POP", x.location, {
      initialHydration: !0
    }), _;
  }
  function G() {
    f && f(), A && A(), g.clear(), E && E.abort(), x.fetchers.forEach((C, P) => _t(P)), x.blockers.forEach((C, P) => Mt(P));
  }
  function oe(C) {
    return g.add(C), () => g.delete(C);
  }
  function ne(C, P = {}) {
    C.matches && (C.matches = C.matches.map((H) => {
      let ie = l[H.route.id], Z = H.route;
      return Z.element !== ie.element || Z.errorElement !== ie.errorElement || Z.hydrateFallbackElement !== ie.hydrateFallbackElement ? {
        ...H,
        route: ie
      } : H;
    })), x = {
      ...x,
      ...C
    };
    let M = [], z = [];
    x.fetchers.forEach((H, ie) => {
      H.state === "idle" && (Me.has(ie) ? M.push(ie) : z.push(ie));
    }), Me.forEach((H) => {
      !x.fetchers.has(H) && !D.has(H) && M.push(H);
    }), [...g].forEach(
      (H) => H(x, {
        deletedFetchers: M,
        newErrors: C.errors ?? null,
        viewTransitionOpts: P.viewTransitionOpts,
        flushSync: P.flushSync === !0
      })
    ), M.forEach((H) => _t(H)), z.forEach((H) => x.fetchers.delete(H));
  }
  function Ge(C, P, { flushSync: M } = {}) {
    let z = x.actionData != null && x.navigation.formMethod != null && ct(x.navigation.formMethod) && x.navigation.state === "loading" && C.state?._isRedirect !== !0, H;
    P.actionData ? Object.keys(P.actionData).length > 0 ? H = P.actionData : H = null : z ? H = x.actionData : H = null;
    let ie = P.loaderData ? gs(
      x.loaderData,
      P.loaderData,
      P.matches || [],
      P.errors
    ) : x.loaderData, Z = x.blockers;
    Z.size > 0 && (Z = new Map(Z), Z.forEach((ye, ce) => Z.set(ce, Tn)));
    let ae = U ? !1 : tt(C, P.matches || x.matches), se = V === !0 || x.navigation.formMethod != null && ct(x.navigation.formMethod) && C.state?._isRedirect !== !0;
    c && (u = c, c = void 0), U || R === "POP" || (R === "PUSH" ? e.history.push(C, C.state) : R === "REPLACE" && e.history.replace(C, C.state));
    let fe;
    if (R === "POP") {
      let ye = $.get(x.location.pathname);
      ye && ye.has(C.pathname) ? fe = {
        currentLocation: x.location,
        nextLocation: C
      } : $.has(C.pathname) && (fe = {
        currentLocation: C,
        nextLocation: x.location
      });
    } else if (S) {
      let ye = $.get(x.location.pathname);
      ye ? ye.add(C.pathname) : (ye = /* @__PURE__ */ new Set([C.pathname]), $.set(x.location.pathname, ye)), fe = {
        currentLocation: x.location,
        nextLocation: C
      };
    }
    ne(
      {
        ...P,
        // matches, errors, fetchers go through as-is
        actionData: H,
        loaderData: ie,
        historyAction: R,
        location: C,
        initialized: !0,
        navigation: wo,
        revalidation: "idle",
        restoreScrollPosition: ae,
        preventScrollReset: se,
        blockers: Z
      },
      {
        viewTransitionOpts: fe,
        flushSync: M === !0
      }
    ), R = "POP", V = !1, S = !1, U = !1, I = !1, F?.resolve(), F = null, ge?.resolve(), ge = null;
  }
  async function O(C, P) {
    if (F?.resolve(), F = null, typeof C == "number") {
      F || (F = xs());
      let Fe = F.promise;
      return e.history.go(C), Fe;
    }
    let M = Fo(
      x.location,
      x.matches,
      d,
      C,
      P?.fromRouteId,
      P?.relative
    ), { path: z, submission: H, error: ie } = ss(
      !1,
      M,
      P
    ), Z = x.location, ae = Gn(x.location, z, P && P.state);
    ae = {
      ...ae,
      ...e.history.encodeLocation(ae)
    };
    let se = P && P.replace != null ? P.replace : void 0, fe = "PUSH";
    se === !0 ? fe = "REPLACE" : se === !1 || H != null && ct(H.formMethod) && H.formAction === x.location.pathname + x.location.search && (fe = "REPLACE");
    let ye = P && "preventScrollReset" in P ? P.preventScrollReset === !0 : void 0, ce = (P && P.flushSync) === !0, Be = pa({
      currentLocation: Z,
      nextLocation: ae,
      historyAction: fe
    });
    if (Be) {
      Yr(Be, {
        state: "blocked",
        location: ae,
        proceed() {
          Yr(Be, {
            state: "proceeding",
            proceed: void 0,
            reset: void 0,
            location: ae
          }), O(C, P);
        },
        reset() {
          let Fe = new Map(x.blockers);
          Fe.set(Be, Tn), ne({ blockers: Fe });
        }
      });
      return;
    }
    await st(fe, ae, {
      submission: H,
      // Send through the formData serialization error if we have one so we can
      // render at the right error boundary after we match routes
      pendingError: ie,
      preventScrollReset: ye,
      replace: P && P.replace,
      enableViewTransition: P && P.viewTransition,
      flushSync: ce,
      callSiteDefaultShouldRevalidate: P && P.unstable_defaultShouldRevalidate
    });
  }
  function We() {
    ge || (ge = xs()), Nn(), ne({ revalidation: "loading" });
    let C = ge.promise;
    return x.navigation.state === "submitting" ? C : x.navigation.state === "idle" ? (st(x.historyAction, x.location, {
      startUninterruptedRevalidation: !0
    }), C) : (st(
      R || x.historyAction,
      x.navigation.location,
      {
        overrideNavigation: x.navigation,
        // Proxy through any rending view transition
        enableViewTransition: S === !0
      }
    ), C);
  }
  async function st(C, P, M) {
    E && E.abort(), E = null, R = C, U = (M && M.startUninterruptedRevalidation) === !0, Qe(x.location, x.matches), V = (M && M.preventScrollReset) === !0, S = (M && M.enableViewTransition) === !0;
    let z = c || u, H = M && M.overrideNavigation, ie = M?.initialHydration && x.matches && x.matches.length > 0 && !k ? (
      // `matchRoutes()` has already been called if we're in here via `router.initialize()`
      x.matches
    ) : fr(z, P, d), Z = (M && M.flushSync) === !0;
    if (ie && x.initialized && !I && Gm(x.location, P) && !(M && M.submission && ct(M.submission.formMethod))) {
      Ge(P, { matches: ie }, { flushSync: Z });
      return;
    }
    let ae = nt(ie, z, P.pathname);
    if (ae.active && ae.matches && (ie = ae.matches), !ie) {
      let { error: at, notFoundMatches: ut, route: Ue } = qr(
        P.pathname
      );
      Ge(
        P,
        {
          matches: ut,
          loaderData: {},
          errors: {
            [Ue.id]: at
          }
        },
        { flushSync: Z }
      );
      return;
    }
    E = new AbortController();
    let se = nn(
      e.history,
      P,
      E.signal,
      M && M.submission
    ), fe = e.getContext ? await e.getContext() : new ts(), ye;
    if (M && M.pendingError)
      ye = [
        pr(ie).route.id,
        { type: "error", error: M.pendingError }
      ];
    else if (M && M.submission && ct(M.submission.formMethod)) {
      let at = await At(
        se,
        P,
        M.submission,
        ie,
        fe,
        ae.active,
        M && M.initialHydration === !0,
        { replace: M.replace, flushSync: Z }
      );
      if (at.shortCircuited)
        return;
      if (at.pendingActionResult) {
        let [ut, Ue] = at.pendingActionResult;
        if (xt(Ue) && Yn(Ue.error) && Ue.error.status === 404) {
          E = null, Ge(P, {
            matches: at.matches,
            loaderData: {},
            errors: {
              [ut]: Ue.error
            }
          });
          return;
        }
      }
      ie = at.matches || ie, ye = at.pendingActionResult, H = No(P, M.submission), Z = !1, ae.active = !1, se = nn(
        e.history,
        se.url,
        se.signal
      );
    }
    let {
      shortCircuited: ce,
      matches: Be,
      loaderData: Fe,
      errors: ot
    } = await ma(
      se,
      P,
      ie,
      fe,
      ae.active,
      H,
      M && M.submission,
      M && M.fetcherSubmission,
      M && M.replace,
      M && M.initialHydration === !0,
      Z,
      ye,
      M && M.callSiteDefaultShouldRevalidate
    );
    ce || (E = null, Ge(P, {
      matches: Be || ie,
      ...vs(ye),
      loaderData: Fe,
      errors: ot
    }));
  }
  async function At(C, P, M, z, H, ie, Z, ae = {}) {
    Nn();
    let se = eh(P, M);
    if (ne({ navigation: se }, { flushSync: ae.flushSync === !0 }), ie) {
      let ce = await er(
        z,
        P.pathname,
        C.signal
      );
      if (ce.type === "aborted")
        return { shortCircuited: !0 };
      if (ce.type === "error") {
        if (ce.partialMatches.length === 0) {
          let { matches: Fe, route: ot } = wa(u);
          return {
            matches: Fe,
            pendingActionResult: [
              ot.id,
              {
                type: "error",
                error: ce.error
              }
            ]
          };
        }
        let Be = pr(ce.partialMatches).route.id;
        return {
          matches: ce.partialMatches,
          pendingActionResult: [
            Be,
            {
              type: "error",
              error: ce.error
            }
          ]
        };
      } else if (ce.matches)
        z = ce.matches;
      else {
        let { notFoundMatches: Be, error: Fe, route: ot } = qr(
          P.pathname
        );
        return {
          matches: Be,
          pendingActionResult: [
            ot.id,
            {
              type: "error",
              error: Fe
            }
          ]
        };
      }
    }
    let fe, ye = $a(z, P);
    if (!ye.route.action && !ye.route.lazy)
      fe = {
        type: "error",
        error: Et(405, {
          method: C.method,
          pathname: P.pathname,
          routeId: ye.route.id
        })
      };
    else {
      let ce = sn(
        o,
        l,
        C,
        z,
        ye,
        Z ? [] : a,
        H
      ), Be = await Mr(
        C,
        ce,
        H,
        null
      );
      if (fe = Be[ye.route.id], !fe) {
        for (let Fe of z)
          if (Be[Fe.route.id]) {
            fe = Be[Fe.route.id];
            break;
          }
      }
      if (C.signal.aborted)
        return { shortCircuited: !0 };
    }
    if (Br(fe)) {
      let ce;
      return ae && ae.replace != null ? ce = ae.replace : ce = hs(
        fe.response.headers.get("Location"),
        new URL(C.url),
        d,
        e.history
      ) === x.location.pathname + x.location.search, await Jt(C, fe, !0, {
        submission: M,
        replace: ce
      }), { shortCircuited: !0 };
    }
    if (xt(fe)) {
      let ce = pr(z, ye.route.id);
      return (ae && ae.replace) !== !0 && (R = "PUSH"), {
        matches: z,
        pendingActionResult: [
          ce.route.id,
          fe,
          ye.route.id
        ]
      };
    }
    return {
      matches: z,
      pendingActionResult: [ye.route.id, fe]
    };
  }
  async function ma(C, P, M, z, H, ie, Z, ae, se, fe, ye, ce, Be) {
    let Fe = ie || No(P, Z), ot = Z || ae || ys(Fe), at = !U && !fe;
    if (H) {
      if (at) {
        let lt = Ct(ce);
        ne(
          {
            navigation: Fe,
            ...lt !== void 0 ? { actionData: lt } : {}
          },
          {
            flushSync: ye
          }
        );
      }
      let Le = await er(
        M,
        P.pathname,
        C.signal
      );
      if (Le.type === "aborted")
        return { shortCircuited: !0 };
      if (Le.type === "error") {
        if (Le.partialMatches.length === 0) {
          let { matches: Qr, route: Lr } = wa(u);
          return {
            matches: Qr,
            loaderData: {},
            errors: {
              [Lr.id]: Le.error
            }
          };
        }
        let lt = pr(Le.partialMatches).route.id;
        return {
          matches: Le.partialMatches,
          loaderData: {},
          errors: {
            [lt]: Le.error
          }
        };
      } else if (Le.matches)
        M = Le.matches;
      else {
        let { error: lt, notFoundMatches: Qr, route: Lr } = qr(
          P.pathname
        );
        return {
          matches: Qr,
          loaderData: {},
          errors: {
            [Lr.id]: lt
          }
        };
      }
    }
    let ut = c || u, { dsMatches: Ue, revalidatingFetchers: St } = ls(
      C,
      z,
      o,
      l,
      e.history,
      x,
      M,
      ot,
      P,
      fe ? [] : a,
      fe === !0,
      I,
      Y,
      Me,
      re,
      be,
      ut,
      d,
      e.patchRoutesOnNavigation != null,
      ce,
      Be
    );
    if (we = ++J, !e.dataStrategy && !Ue.some((Le) => Le.shouldLoad) && !Ue.some(
      (Le) => Le.route.middleware && Le.route.middleware.length > 0
    ) && St.length === 0) {
      let Le = kn();
      return Ge(
        P,
        {
          matches: M,
          loaderData: {},
          // Commit pending error if we're short circuiting
          errors: ce && xt(ce[1]) ? { [ce[0]]: ce[1].error } : null,
          ...vs(ce),
          ...Le ? { fetchers: new Map(x.fetchers) } : {}
        },
        { flushSync: ye }
      ), { shortCircuited: !0 };
    }
    if (at) {
      let Le = {};
      if (!H) {
        Le.navigation = Fe;
        let lt = Ct(ce);
        lt !== void 0 && (Le.actionData = lt);
      }
      St.length > 0 && (Le.fetchers = fo(St)), ne(Le, { flushSync: ye });
    }
    St.forEach((Le) => {
      Dt(Le.key), Le.controller && D.set(Le.key, Le.controller);
    });
    let Or = () => St.forEach((Le) => Dt(Le.key));
    E && E.signal.addEventListener(
      "abort",
      Or
    );
    let { loaderResults: En, fetcherResults: dr } = await Ir(
      Ue,
      St,
      C,
      z
    );
    if (C.signal.aborted)
      return { shortCircuited: !0 };
    E && E.signal.removeEventListener(
      "abort",
      Or
    ), St.forEach((Le) => D.delete(Le.key));
    let Bt = Na(En);
    if (Bt)
      return await Jt(C, Bt.result, !0, {
        replace: se
      }), { shortCircuited: !0 };
    if (Bt = Na(dr), Bt)
      return be.add(Bt.key), await Jt(C, Bt.result, !0, {
        replace: se
      }), { shortCircuited: !0 };
    let { loaderData: vo, errors: Pn } = ps(
      x,
      M,
      En,
      ce,
      St,
      dr
    );
    fe && x.errors && (Pn = { ...x.errors, ...Pn });
    let $r = kn(), va = fa(we), ba = $r || va || St.length > 0;
    return {
      matches: M,
      loaderData: vo,
      errors: Pn,
      ...ba ? { fetchers: new Map(x.fetchers) } : {}
    };
  }
  function Ct(C) {
    if (C && !xt(C[1]))
      return {
        [C[0]]: C[1].data
      };
    if (x.actionData)
      return Object.keys(x.actionData).length === 0 ? null : x.actionData;
  }
  function fo(C) {
    return C.forEach((P) => {
      let M = x.fetchers.get(P.key), z = An(
        void 0,
        M ? M.data : void 0
      );
      x.fetchers.set(P.key, z);
    }), new Map(x.fetchers);
  }
  async function po(C, P, M, z) {
    Dt(C);
    let H = (z && z.flushSync) === !0, ie = c || u, Z = Fo(
      x.location,
      x.matches,
      d,
      M,
      P,
      z?.relative
    ), ae = fr(ie, Z, d), se = nt(ae, ie, Z);
    if (se.active && se.matches && (ae = se.matches), !ae) {
      vt(
        C,
        P,
        Et(404, { pathname: Z }),
        { flushSync: H }
      );
      return;
    }
    let { path: fe, submission: ye, error: ce } = ss(
      !0,
      Z,
      z
    );
    if (ce) {
      vt(C, P, ce, { flushSync: H });
      return;
    }
    let Be = e.getContext ? await e.getContext() : new ts(), Fe = (z && z.preventScrollReset) === !0;
    if (ye && ct(ye.formMethod)) {
      await dt(
        C,
        P,
        fe,
        ae,
        Be,
        se.active,
        H,
        Fe,
        ye,
        z && z.unstable_defaultShouldRevalidate
      );
      return;
    }
    re.set(C, { routeId: P, path: fe }), await cr(
      C,
      P,
      fe,
      ae,
      Be,
      se.active,
      H,
      Fe,
      ye
    );
  }
  async function dt(C, P, M, z, H, ie, Z, ae, se, fe) {
    Nn(), re.delete(C);
    let ye = x.fetchers.get(C);
    kt(C, th(se, ye), {
      flushSync: Z
    });
    let ce = new AbortController(), Be = nn(
      e.history,
      M,
      ce.signal,
      se
    );
    if (ie) {
      let Ye = await er(
        z,
        new URL(Be.url).pathname,
        Be.signal,
        C
      );
      if (Ye.type === "aborted")
        return;
      if (Ye.type === "error") {
        vt(C, P, Ye.error, { flushSync: Z });
        return;
      } else if (Ye.matches)
        z = Ye.matches;
      else {
        vt(
          C,
          P,
          Et(404, { pathname: M }),
          { flushSync: Z }
        );
        return;
      }
    }
    let Fe = $a(z, M);
    if (!Fe.route.action && !Fe.route.lazy) {
      let Ye = Et(405, {
        method: se.formMethod,
        pathname: M,
        routeId: P
      });
      vt(C, P, Ye, { flushSync: Z });
      return;
    }
    D.set(C, ce);
    let ot = J, at = sn(
      o,
      l,
      Be,
      z,
      Fe,
      a,
      H
    ), ut = await Mr(
      Be,
      at,
      H,
      C
    ), Ue = ut[Fe.route.id];
    if (!Ue) {
      for (let Ye of at)
        if (ut[Ye.route.id]) {
          Ue = ut[Ye.route.id];
          break;
        }
    }
    if (Be.signal.aborted) {
      D.get(C) === ce && D.delete(C);
      return;
    }
    if (Me.has(C)) {
      if (Br(Ue) || xt(Ue)) {
        kt(C, rr(void 0));
        return;
      }
    } else {
      if (Br(Ue))
        if (D.delete(C), we > ot) {
          kt(C, rr(void 0));
          return;
        } else
          return be.add(C), kt(C, An(se)), Jt(Be, Ue, !1, {
            fetcherSubmission: se,
            preventScrollReset: ae
          });
      if (xt(Ue)) {
        vt(C, P, Ue.error);
        return;
      }
    }
    let St = x.navigation.location || x.location, Or = nn(
      e.history,
      St,
      ce.signal
    ), En = c || u, dr = x.navigation.state !== "idle" ? fr(En, x.navigation.location, d) : x.matches;
    Pe(dr, "Didn't find any matches after fetcher action");
    let Bt = ++J;
    he.set(C, Bt);
    let vo = An(se, Ue.data);
    x.fetchers.set(C, vo);
    let { dsMatches: Pn, revalidatingFetchers: $r } = ls(
      Or,
      H,
      o,
      l,
      e.history,
      x,
      dr,
      se,
      St,
      a,
      !1,
      I,
      Y,
      Me,
      re,
      be,
      En,
      d,
      e.patchRoutesOnNavigation != null,
      [Fe.route.id, Ue],
      fe
    );
    $r.filter((Ye) => Ye.key !== C).forEach((Ye) => {
      let ya = Ye.key, Qi = x.fetchers.get(ya), Ru = An(
        void 0,
        Qi ? Qi.data : void 0
      );
      x.fetchers.set(ya, Ru), Dt(ya), Ye.controller && D.set(ya, Ye.controller);
    }), ne({ fetchers: new Map(x.fetchers) });
    let va = () => $r.forEach((Ye) => Dt(Ye.key));
    ce.signal.addEventListener(
      "abort",
      va
    );
    let { loaderResults: ba, fetcherResults: Le } = await Ir(
      Pn,
      $r,
      Or,
      H
    );
    if (ce.signal.aborted)
      return;
    if (ce.signal.removeEventListener(
      "abort",
      va
    ), he.delete(C), D.delete(C), $r.forEach((Ye) => D.delete(Ye.key)), x.fetchers.has(C)) {
      let Ye = rr(Ue.data);
      x.fetchers.set(C, Ye);
    }
    let lt = Na(ba);
    if (lt)
      return Jt(
        Or,
        lt.result,
        !1,
        { preventScrollReset: ae }
      );
    if (lt = Na(Le), lt)
      return be.add(lt.key), Jt(
        Or,
        lt.result,
        !1,
        { preventScrollReset: ae }
      );
    let { loaderData: Qr, errors: Lr } = ps(
      x,
      dr,
      ba,
      void 0,
      $r,
      Le
    );
    fa(Bt), x.navigation.state === "loading" && Bt > we ? (Pe(R, "Expected pending action"), E && E.abort(), Ge(x.navigation.location, {
      matches: dr,
      loaderData: Qr,
      errors: Lr,
      fetchers: new Map(x.fetchers)
    })) : (ne({
      errors: Lr,
      loaderData: gs(
        x.loaderData,
        Qr,
        dr,
        Lr
      ),
      fetchers: new Map(x.fetchers)
    }), I = !1);
  }
  async function cr(C, P, M, z, H, ie, Z, ae, se) {
    let fe = x.fetchers.get(C);
    kt(
      C,
      An(
        se,
        fe ? fe.data : void 0
      ),
      { flushSync: Z }
    );
    let ye = new AbortController(), ce = nn(
      e.history,
      M,
      ye.signal
    );
    if (ie) {
      let Ue = await er(
        z,
        new URL(ce.url).pathname,
        ce.signal,
        C
      );
      if (Ue.type === "aborted")
        return;
      if (Ue.type === "error") {
        vt(C, P, Ue.error, { flushSync: Z });
        return;
      } else if (Ue.matches)
        z = Ue.matches;
      else {
        vt(
          C,
          P,
          Et(404, { pathname: M }),
          { flushSync: Z }
        );
        return;
      }
    }
    let Be = $a(z, M);
    D.set(C, ye);
    let Fe = J, ot = sn(
      o,
      l,
      ce,
      z,
      Be,
      a,
      H
    ), ut = (await Mr(
      ce,
      ot,
      H,
      C
    ))[Be.route.id];
    if (D.get(C) === ye && D.delete(C), !ce.signal.aborted) {
      if (Me.has(C)) {
        kt(C, rr(void 0));
        return;
      }
      if (Br(ut))
        if (we > Fe) {
          kt(C, rr(void 0));
          return;
        } else {
          be.add(C), await Jt(ce, ut, !1, {
            preventScrollReset: ae
          });
          return;
        }
      if (xt(ut)) {
        vt(C, P, ut.error);
        return;
      }
      kt(C, rr(ut.data));
    }
  }
  async function Jt(C, P, M, {
    submission: z,
    fetcherSubmission: H,
    preventScrollReset: ie,
    replace: Z
  } = {}) {
    M || (F?.resolve(), F = null), P.response.headers.has("X-Remix-Revalidate") && (I = !0);
    let ae = P.response.headers.get("Location");
    Pe(ae, "Expected a Location header on the redirect Response"), ae = hs(
      ae,
      new URL(C.url),
      d,
      e.history
    );
    let se = Gn(x.location, ae, {
      _isRedirect: !0
    });
    if (r) {
      let ot = !1;
      if (P.response.headers.has("X-Remix-Reload-Document"))
        ot = !0;
      else if (ui(ae)) {
        const at = xl(ae, !0);
        ot = // Hard reload if it's an absolute URL to a new origin
        at.origin !== t.location.origin || // Hard reload if it's an absolute URL that does not match our basename
        Rt(at.pathname, d) == null;
      }
      if (ot) {
        Z ? t.location.replace(ae) : t.location.assign(ae);
        return;
      }
    }
    E = null;
    let fe = Z === !0 || P.response.headers.has("X-Remix-Replace") ? "REPLACE" : "PUSH", { formMethod: ye, formAction: ce, formEncType: Be } = x.navigation;
    !z && !H && ye && ce && Be && (z = ys(x.navigation));
    let Fe = z || H;
    if (Am.has(P.response.status) && Fe && ct(Fe.formMethod))
      await st(fe, se, {
        submission: {
          ...Fe,
          formAction: ae
        },
        // Preserve these flags across redirects
        preventScrollReset: ie || V,
        enableViewTransition: M ? S : void 0
      });
    else {
      let ot = No(
        se,
        z
      );
      await st(fe, se, {
        overrideNavigation: ot,
        // Send fetcher submissions through for shouldRevalidate
        fetcherSubmission: H,
        // Preserve these flags across redirects
        preventScrollReset: ie || V,
        enableViewTransition: M ? S : void 0
      });
    }
  }
  async function Mr(C, P, M, z) {
    let H, ie = {};
    try {
      H = await zm(
        h,
        C,
        P,
        z,
        M,
        !1
      );
    } catch (Z) {
      return P.filter((ae) => ae.shouldLoad).forEach((ae) => {
        ie[ae.route.id] = {
          type: "error",
          error: Z
        };
      }), ie;
    }
    if (C.signal.aborted)
      return ie;
    if (!ct(C.method))
      for (let Z of P) {
        if (H[Z.route.id]?.type === "error")
          break;
        !H.hasOwnProperty(Z.route.id) && !x.loaderData.hasOwnProperty(Z.route.id) && (!x.errors || !x.errors.hasOwnProperty(Z.route.id)) && Z.shouldCallHandler() && (H[Z.route.id] = {
          type: "error",
          result: new Error(
            `No result returned from dataStrategy for route ${Z.route.id}`
          )
        });
      }
    for (let [Z, ae] of Object.entries(H))
      if (Xm(ae)) {
        let se = ae.result;
        ie[Z] = {
          type: "redirect",
          response: Vm(
            se,
            C,
            Z,
            P,
            d
          )
        };
      } else
        ie[Z] = await Um(ae);
    return ie;
  }
  async function Ir(C, P, M, z) {
    let H = Mr(
      M,
      C,
      z,
      null
    ), ie = Promise.all(
      P.map(async (se) => {
        if (se.matches && se.match && se.request && se.controller) {
          let ye = (await Mr(
            se.request,
            se.matches,
            z,
            se.key
          ))[se.match.route.id];
          return { [se.key]: ye };
        } else
          return Promise.resolve({
            [se.key]: {
              type: "error",
              error: Et(404, {
                pathname: se.path
              })
            }
          });
      })
    ), Z = await H, ae = (await ie).reduce(
      (se, fe) => Object.assign(se, fe),
      {}
    );
    return {
      loaderResults: Z,
      fetcherResults: ae
    };
  }
  function Nn() {
    I = !0, re.forEach((C, P) => {
      D.has(P) && Y.add(P), Dt(P);
    });
  }
  function kt(C, P, M = {}) {
    x.fetchers.set(C, P), ne(
      { fetchers: new Map(x.fetchers) },
      { flushSync: (M && M.flushSync) === !0 }
    );
  }
  function vt(C, P, M, z = {}) {
    let H = pr(x.matches, P);
    _t(C), ne(
      {
        errors: {
          [H.route.id]: M
        },
        fetchers: new Map(x.fetchers)
      },
      { flushSync: (z && z.flushSync) === !0 }
    );
  }
  function Zt(C) {
    return pe.set(C, (pe.get(C) || 0) + 1), Me.has(C) && Me.delete(C), x.fetchers.get(C) || Dm;
  }
  function ha(C, P) {
    Dt(C, P?.reason), kt(C, rr(null));
  }
  function _t(C) {
    let P = x.fetchers.get(C);
    D.has(C) && !(P && P.state === "loading" && he.has(C)) && Dt(C), re.delete(C), he.delete(C), be.delete(C), Me.delete(C), Y.delete(C), x.fetchers.delete(C);
  }
  function go(C) {
    let P = (pe.get(C) || 0) - 1;
    P <= 0 ? (pe.delete(C), Me.add(C)) : pe.set(C, P), ne({ fetchers: new Map(x.fetchers) });
  }
  function Dt(C, P) {
    let M = D.get(C);
    M && (M.abort(P), D.delete(C));
  }
  function Cn(C) {
    for (let P of C) {
      let M = Zt(P), z = rr(M.data);
      x.fetchers.set(P, z);
    }
  }
  function kn() {
    let C = [], P = !1;
    for (let M of be) {
      let z = x.fetchers.get(M);
      Pe(z, `Expected fetcher: ${M}`), z.state === "loading" && (be.delete(M), C.push(M), P = !0);
    }
    return Cn(C), P;
  }
  function fa(C) {
    let P = [];
    for (let [M, z] of he)
      if (z < C) {
        let H = x.fetchers.get(M);
        Pe(H, `Expected fetcher: ${M}`), H.state === "loading" && (Dt(M), he.delete(M), P.push(M));
      }
    return Cn(P), P.length > 0;
  }
  function Sn(C, P) {
    let M = x.blockers.get(C) || Tn;
    return Ne.get(C) !== P && Ne.set(C, P), M;
  }
  function Mt(C) {
    x.blockers.delete(C), Ne.delete(C);
  }
  function Yr(C, P) {
    let M = x.blockers.get(C) || Tn;
    Pe(
      M.state === "unblocked" && P.state === "blocked" || M.state === "blocked" && P.state === "blocked" || M.state === "blocked" && P.state === "proceeding" || M.state === "blocked" && P.state === "unblocked" || M.state === "proceeding" && P.state === "unblocked",
      `Invalid blocker state transition: ${M.state} -> ${P.state}`
    );
    let z = new Map(x.blockers);
    z.set(C, P), ne({ blockers: z });
  }
  function pa({
    currentLocation: C,
    nextLocation: P,
    historyAction: M
  }) {
    if (Ne.size === 0)
      return;
    Ne.size > 1 && Ze(!1, "A router only supports one blocker at a time");
    let z = Array.from(Ne.entries()), [H, ie] = z[z.length - 1], Z = x.blockers.get(H);
    if (!(Z && Z.state === "proceeding") && ie({ currentLocation: C, nextLocation: P, historyAction: M }))
      return H;
  }
  function qr(C) {
    let P = Et(404, { pathname: C }), M = c || u, { matches: z, route: H } = wa(M);
    return { notFoundMatches: z, route: H, error: P };
  }
  function ga(C, P, M) {
    if (p = C, b = P, v = M || null, !w && x.navigation === wo) {
      w = !0;
      let z = tt(x.location, x.matches);
      z != null && ne({ restoreScrollPosition: z });
    }
    return () => {
      p = null, b = null, v = null;
    };
  }
  function Ce(C, P) {
    return v && v(
      C,
      P.map((z) => nm(z, x.loaderData))
    ) || C.key;
  }
  function Qe(C, P) {
    if (p && b) {
      let M = Ce(C, P);
      p[M] = b();
    }
  }
  function tt(C, P) {
    if (p) {
      let M = Ce(C, P), z = p[M];
      if (typeof z == "number")
        return z;
    }
    return null;
  }
  function nt(C, P, M) {
    if (e.patchRoutesOnNavigation)
      if (C) {
        if (Object.keys(C[0].params).length > 0)
          return { active: !0, matches: _n(
            P,
            M,
            d,
            !0
          ) };
      } else
        return { active: !0, matches: _n(
          P,
          M,
          d,
          !0
        ) || [] };
    return { active: !1, matches: null };
  }
  async function er(C, P, M, z) {
    if (!e.patchRoutesOnNavigation)
      return { type: "success", matches: C };
    let H = C;
    for (; ; ) {
      let ie = c == null, Z = c || u, ae = l;
      try {
        await e.patchRoutesOnNavigation({
          signal: M,
          path: P,
          matches: H,
          fetcherKey: z,
          patch: (ye, ce) => {
            M.aborted || cs(
              ye,
              ce,
              Z,
              ae,
              o,
              !1
            );
          }
        });
      } catch (ye) {
        return { type: "error", error: ye, partialMatches: H };
      } finally {
        ie && !M.aborted && (u = [...u]);
      }
      if (M.aborted)
        return { type: "aborted" };
      let se = fr(Z, P, d), fe = null;
      if (se) {
        if (Object.keys(se[0].params).length === 0)
          return { type: "success", matches: se };
        if (fe = _n(
          Z,
          P,
          d,
          !0
        ), !(fe && H.length < fe.length && Je(
          H,
          fe.slice(0, H.length)
        )))
          return { type: "success", matches: se };
      }
      if (fe || (fe = _n(
        Z,
        P,
        d,
        !0
      )), !fe || Je(H, fe))
        return { type: "success", matches: null };
      H = fe;
    }
  }
  function Je(C, P) {
    return C.length === P.length && C.every((M, z) => M.route.id === P[z].route.id);
  }
  function pt(C) {
    l = {}, c = Kn(
      C,
      o,
      void 0,
      l
    );
  }
  function Xr(C, P, M = !1) {
    let z = c == null;
    cs(
      C,
      P,
      c || u,
      l,
      o,
      M
    ), z && (u = [...u], ne({}));
  }
  return _ = {
    get basename() {
      return d;
    },
    get future() {
      return m;
    },
    get state() {
      return x;
    },
    get routes() {
      return u;
    },
    get window() {
      return t;
    },
    initialize: L,
    subscribe: oe,
    enableScrollRestoration: ga,
    navigate: O,
    fetch: po,
    revalidate: We,
    // Passthrough to history-aware createHref used by useHref so we get proper
    // hash-aware URLs in DOM paths
    createHref: (C) => e.history.createHref(C),
    encodeLocation: (C) => e.history.encodeLocation(C),
    getFetcher: Zt,
    resetFetcher: ha,
    deleteFetcher: go,
    dispose: G,
    getBlocker: Sn,
    deleteBlocker: Mt,
    patchRoutes: Xr,
    _internalFetchControllers: D,
    // TODO: Remove setRoutes, it's temporary to avoid dealing with
    // updating the tree while validating the update algorithm.
    _internalSetRoutes: pt,
    _internalSetStateDoNotUseOrYouWillBreakYourApp(C) {
      ne(C);
    }
  }, e.unstable_instrumentations && (_ = Nm(
    _,
    e.unstable_instrumentations.map((C) => C.router).filter(Boolean)
  )), _;
}
function Om(e) {
  return e != null && ("formData" in e && e.formData != null || "body" in e && e.body !== void 0);
}
function Fo(e, t, r, a, i, o) {
  let l, u;
  if (i) {
    l = [];
    for (let d of t)
      if (l.push(d), d.route.id === i) {
        u = d;
        break;
      }
  } else
    l = t, u = t[t.length - 1];
  let c = hi(
    a || ".",
    mi(l),
    Rt(e.pathname, r) || e.pathname,
    o === "path"
  );
  if (a == null && (c.search = e.search, c.hash = e.hash), (a == null || a === "" || a === ".") && u) {
    let d = gi(c.search);
    if (u.route.index && !d)
      c.search = c.search ? c.search.replace(/^\?/, "?index&") : "?index";
    else if (!u.route.index && d) {
      let h = new URLSearchParams(c.search), m = h.getAll("index");
      h.delete("index"), m.filter((g) => g).forEach((g) => h.append("index", g));
      let f = h.toString();
      c.search = f ? `?${f}` : "";
    }
  }
  return r !== "/" && (c.pathname = gm({ basename: r, pathname: c.pathname })), Kt(c);
}
function ss(e, t, r) {
  if (!r || !Om(r))
    return { path: t };
  if (r.formMethod && !Zm(r.formMethod))
    return {
      path: t,
      error: Et(405, { method: r.formMethod })
    };
  let a = () => ({
    path: t,
    error: Et(400, { type: "invalid-body" })
  }), o = (r.formMethod || "get").toUpperCase(), l = _l(t);
  if (r.body !== void 0) {
    if (r.formEncType === "text/plain") {
      if (!ct(o))
        return a();
      let m = typeof r.body == "string" ? r.body : r.body instanceof FormData || r.body instanceof URLSearchParams ? (
        // https://html.spec.whatwg.org/multipage/form-control-infrastructure.html#plain-text-form-data
        Array.from(r.body.entries()).reduce(
          (f, [g, p]) => `${f}${g}=${p}
`,
          ""
        )
      ) : String(r.body);
      return {
        path: t,
        submission: {
          formMethod: o,
          formAction: l,
          formEncType: r.formEncType,
          formData: void 0,
          json: void 0,
          text: m
        }
      };
    } else if (r.formEncType === "application/json") {
      if (!ct(o))
        return a();
      try {
        let m = typeof r.body == "string" ? JSON.parse(r.body) : r.body;
        return {
          path: t,
          submission: {
            formMethod: o,
            formAction: l,
            formEncType: r.formEncType,
            formData: void 0,
            json: m,
            text: void 0
          }
        };
      } catch {
        return a();
      }
    }
  }
  Pe(
    typeof FormData == "function",
    "FormData is not available in this environment"
  );
  let u, c;
  if (r.formData)
    u = Wo(r.formData), c = r.formData;
  else if (r.body instanceof FormData)
    u = Wo(r.body), c = r.body;
  else if (r.body instanceof URLSearchParams)
    u = r.body, c = fs(u);
  else if (r.body == null)
    u = new URLSearchParams(), c = new FormData();
  else
    try {
      u = new URLSearchParams(r.body), c = fs(u);
    } catch {
      return a();
    }
  let d = {
    formMethod: o,
    formAction: l,
    formEncType: r && r.formEncType || "application/x-www-form-urlencoded",
    formData: c,
    json: void 0,
    text: void 0
  };
  if (ct(d.formMethod))
    return { path: t, submission: d };
  let h = Tr(t);
  return e && h.search && gi(h.search) && u.append("index", ""), h.search = `?${u}`, { path: Kt(h), submission: d };
}
function ls(e, t, r, a, i, o, l, u, c, d, h, m, f, g, p, v, b, w, y, k, N) {
  let T = k ? xt(k[1]) ? k[1].error : k[1].data : void 0, _ = i.createURL(o.location), x = i.createURL(c), R;
  if (h && o.errors) {
    let U = Object.keys(o.errors)[0];
    R = l.findIndex((I) => I.route.id === U);
  } else if (k && xt(k[1])) {
    let U = k[0];
    R = l.findIndex((I) => I.route.id === U) - 1;
  }
  let F = k ? k[1].statusCode : void 0, V = F && F >= 400, E = {
    currentUrl: _,
    currentParams: o.matches[0]?.params || {},
    nextUrl: x,
    nextParams: l[0].params,
    ...u,
    actionResult: T,
    actionStatus: F
  }, S = aa(l), $ = l.map((U, I) => {
    let { route: Y } = U, D = null;
    if (R != null && I > R ? D = !1 : Y.lazy ? D = !0 : fi(Y) ? h ? D = zo(
      Y,
      o.loaderData,
      o.errors
    ) : $m(o.loaderData, o.matches[I], U) && (D = !0) : D = !1, D !== null)
      return jo(
        r,
        a,
        e,
        S,
        U,
        d,
        t,
        D
      );
    let J = !1;
    typeof N == "boolean" ? J = N : V ? J = !1 : (m || _.pathname + _.search === x.pathname + x.search || _.search !== x.search || Lm(o.matches[I], U)) && (J = !0);
    let we = {
      ...E,
      defaultShouldRevalidate: J
    }, he = Fn(U, we);
    return jo(
      r,
      a,
      e,
      S,
      U,
      d,
      t,
      he,
      we,
      N
    );
  }), A = [];
  return p.forEach((U, I) => {
    if (h || !l.some((pe) => pe.route.id === U.routeId) || g.has(I))
      return;
    let Y = o.fetchers.get(I), D = Y && Y.state !== "idle" && Y.data === void 0, J = fr(b, U.path, w);
    if (!J) {
      if (y && D)
        return;
      A.push({
        key: I,
        routeId: U.routeId,
        path: U.path,
        matches: null,
        match: null,
        request: null,
        controller: null
      });
      return;
    }
    if (v.has(I))
      return;
    let we = $a(J, U.path), he = new AbortController(), be = nn(
      i,
      U.path,
      he.signal
    ), re = null;
    if (f.has(I))
      f.delete(I), re = sn(
        r,
        a,
        be,
        J,
        we,
        d,
        t
      );
    else if (D)
      m && (re = sn(
        r,
        a,
        be,
        J,
        we,
        d,
        t
      ));
    else {
      let pe;
      typeof N == "boolean" ? pe = N : V ? pe = !1 : pe = m;
      let Me = {
        ...E,
        defaultShouldRevalidate: pe
      };
      Fn(we, Me) && (re = sn(
        r,
        a,
        be,
        J,
        we,
        d,
        t,
        Me
      ));
    }
    re && A.push({
      key: I,
      routeId: U.routeId,
      path: U.path,
      matches: re,
      match: we,
      request: be,
      controller: he
    });
  }), { dsMatches: $, revalidatingFetchers: A };
}
function fi(e) {
  return e.loader != null || e.middleware != null && e.middleware.length > 0;
}
function zo(e, t, r) {
  if (e.lazy)
    return !0;
  if (!fi(e))
    return !1;
  let a = t != null && e.id in t, i = r != null && r[e.id] !== void 0;
  return !a && i ? !1 : typeof e.loader == "function" && e.loader.hydrate === !0 ? !0 : !a && !i;
}
function $m(e, t, r) {
  let a = (
    // [a] -> [a, b]
    !t || // [a, b] -> [a, c]
    r.route.id !== t.route.id
  ), i = !e.hasOwnProperty(r.route.id);
  return a || i;
}
function Lm(e, t) {
  let r = e.route.path;
  return (
    // param change for this match, /users/123 -> /users/456
    e.pathname !== t.pathname || // splat param changed, which is not present in match.path
    // e.g. /files/images/avatar.jpg -> files/finances.xls
    r != null && r.endsWith("*") && e.params["*"] !== t.params["*"]
  );
}
function Fn(e, t) {
  if (e.route.shouldRevalidate) {
    let r = e.route.shouldRevalidate(t);
    if (typeof r == "boolean")
      return r;
  }
  return t.defaultShouldRevalidate;
}
function cs(e, t, r, a, i, o) {
  let l;
  if (e) {
    let d = a[e];
    Pe(
      d,
      `No route found to patch children into: routeId = ${e}`
    ), d.children || (d.children = []), l = d.children;
  } else
    l = r;
  let u = [], c = [];
  if (t.forEach((d) => {
    let h = l.find(
      (m) => Ml(d, m)
    );
    h ? c.push({ existingRoute: h, newRoute: d }) : u.push(d);
  }), u.length > 0) {
    let d = Kn(
      u,
      i,
      [e || "_", "patch", String(l?.length || "0")],
      a
    );
    l.push(...d);
  }
  if (o && c.length > 0)
    for (let d = 0; d < c.length; d++) {
      let { existingRoute: h, newRoute: m } = c[d], f = h, [g] = Kn(
        [m],
        i,
        [],
        // Doesn't matter for mutated routes since they already have an id
        {},
        // Don't touch the manifest here since we're updating in place
        !0
      );
      Object.assign(f, {
        element: g.element ? g.element : f.element,
        errorElement: g.errorElement ? g.errorElement : f.errorElement,
        hydrateFallbackElement: g.hydrateFallbackElement ? g.hydrateFallbackElement : f.hydrateFallbackElement
      });
    }
}
function Ml(e, t) {
  return "id" in e && "id" in t && e.id === t.id ? !0 : e.index === t.index && e.path === t.path && e.caseSensitive === t.caseSensitive ? (!e.children || e.children.length === 0) && (!t.children || t.children.length === 0) ? !0 : e.children.every(
    (r, a) => t.children?.some((i) => Ml(r, i))
  ) : !1;
}
var ds = /* @__PURE__ */ new WeakMap(), Il = ({
  key: e,
  route: t,
  manifest: r,
  mapRouteProperties: a
}) => {
  let i = r[t.id];
  if (Pe(i, "No route found in manifest"), !i.lazy || typeof i.lazy != "object")
    return;
  let o = i.lazy[e];
  if (!o)
    return;
  let l = ds.get(i);
  l || (l = {}, ds.set(i, l));
  let u = l[e];
  if (u)
    return u;
  let c = (async () => {
    let d = Zu(e), m = i[e] !== void 0 && e !== "hasErrorBoundary";
    if (d)
      Ze(
        !d,
        "Route property " + e + " is not a supported lazy route property. This property will be ignored."
      ), l[e] = Promise.resolve();
    else if (m)
      Ze(
        !1,
        `Route "${i.id}" has a static property "${e}" defined. The lazy property will be ignored.`
      );
    else {
      let f = await o();
      f != null && (Object.assign(i, { [e]: f }), Object.assign(i, a(i)));
    }
    typeof i.lazy == "object" && (i.lazy[e] = void 0, Object.values(i.lazy).every((f) => f === void 0) && (i.lazy = void 0));
  })();
  return l[e] = c, c;
}, us = /* @__PURE__ */ new WeakMap();
function _m(e, t, r, a, i) {
  let o = r[e.id];
  if (Pe(o, "No route found in manifest"), !e.lazy)
    return {
      lazyRoutePromise: void 0,
      lazyHandlerPromise: void 0
    };
  if (typeof e.lazy == "function") {
    let h = us.get(o);
    if (h)
      return {
        lazyRoutePromise: h,
        lazyHandlerPromise: h
      };
    let m = (async () => {
      Pe(
        typeof e.lazy == "function",
        "No lazy route function found"
      );
      let f = await e.lazy(), g = {};
      for (let p in f) {
        let v = f[p];
        if (v === void 0)
          continue;
        let b = tm(p), y = o[p] !== void 0 && // This property isn't static since it should always be updated based
        // on the route updates
        p !== "hasErrorBoundary";
        b ? Ze(
          !b,
          "Route property " + p + " is not a supported property to be returned from a lazy route function. This property will be ignored."
        ) : y ? Ze(
          !y,
          `Route "${o.id}" has a static property "${p}" defined but its lazy function is also returning a value for this property. The lazy route property "${p}" will be ignored.`
        ) : g[p] = v;
      }
      Object.assign(o, g), Object.assign(o, {
        // To keep things framework agnostic, we use the provided `mapRouteProperties`
        // function to set the framework-aware properties (`element`/`hasErrorBoundary`)
        // since the logic will differ between frameworks.
        ...a(o),
        lazy: void 0
      });
    })();
    return us.set(o, m), m.catch(() => {
    }), {
      lazyRoutePromise: m,
      lazyHandlerPromise: m
    };
  }
  let l = Object.keys(e.lazy), u = [], c;
  for (let h of l) {
    if (i && i.includes(h))
      continue;
    let m = Il({
      key: h,
      route: e,
      manifest: r,
      mapRouteProperties: a
    });
    m && (u.push(m), h === t && (c = m));
  }
  let d = u.length > 0 ? Promise.all(u).then(() => {
  }) : void 0;
  return d?.catch(() => {
  }), c?.catch(() => {
  }), {
    lazyRoutePromise: d,
    lazyHandlerPromise: c
  };
}
async function ms(e) {
  let t = e.matches.filter((i) => i.shouldLoad), r = {};
  return (await Promise.all(t.map((i) => i.resolve()))).forEach((i, o) => {
    r[t[o].route.id] = i;
  }), r;
}
async function Bm(e) {
  return e.matches.some((t) => t.route.middleware) ? Ol(e, () => ms(e)) : ms(e);
}
function Ol(e, t) {
  return Fm(
    e,
    t,
    (a) => {
      if (Jm(a))
        throw a;
      return a;
    },
    Ym,
    r
  );
  function r(a, i, o) {
    if (o)
      return Promise.resolve(
        Object.assign(o.value, {
          [i]: { type: "error", result: a }
        })
      );
    {
      let { matches: l } = e, u = Math.min(
        // Throwing route
        Math.max(
          l.findIndex((d) => d.route.id === i),
          0
        ),
        // or the shallowest route that needs to load data
        Math.max(
          l.findIndex((d) => d.shouldCallHandler()),
          0
        )
      ), c = pr(
        l,
        l[u].route.id
      ).route.id;
      return Promise.resolve({
        [c]: { type: "error", result: a }
      });
    }
  }
}
async function Fm(e, t, r, a, i) {
  let { matches: o, request: l, params: u, context: c, unstable_pattern: d } = e, h = o.flatMap(
    (f) => f.route.middleware ? f.route.middleware.map((g) => [f.route.id, g]) : []
  );
  return await $l(
    {
      request: l,
      params: u,
      context: c,
      unstable_pattern: d
    },
    h,
    t,
    r,
    a,
    i
  );
}
async function $l(e, t, r, a, i, o, l = 0) {
  let { request: u } = e;
  if (u.signal.aborted)
    throw u.signal.reason ?? new Error(`Request aborted: ${u.method} ${u.url}`);
  let c = t[l];
  if (!c)
    return await r();
  let [d, h] = c, m, f = async () => {
    if (m)
      throw new Error("You may only call `next()` once per middleware");
    try {
      return m = { value: await $l(
        e,
        t,
        r,
        a,
        i,
        o,
        l + 1
      ) }, m.value;
    } catch (g) {
      return m = { value: await o(g, d, m) }, m.value;
    }
  };
  try {
    let g = await h(e, f), p = g != null ? a(g) : void 0;
    return i(p) ? p : m ? p ?? m.value : (m = { value: await f() }, m.value);
  } catch (g) {
    return await o(g, d, m);
  }
}
function Ll(e, t, r, a, i) {
  let o = Il({
    key: "middleware",
    route: a.route,
    manifest: t,
    mapRouteProperties: e
  }), l = _m(
    a.route,
    ct(r.method) ? "action" : "loader",
    t,
    e,
    i
  );
  return {
    middleware: o,
    route: l.lazyRoutePromise,
    handler: l.lazyHandlerPromise
  };
}
function jo(e, t, r, a, i, o, l, u, c = null, d) {
  let h = !1, m = Ll(
    e,
    t,
    r,
    i,
    o
  );
  return {
    ...i,
    _lazyPromises: m,
    shouldLoad: u,
    shouldRevalidateArgs: c,
    shouldCallHandler(f) {
      return h = !0, c ? typeof d == "boolean" ? Fn(i, {
        ...c,
        defaultShouldRevalidate: d
      }) : typeof f == "boolean" ? Fn(i, {
        ...c,
        defaultShouldRevalidate: f
      }) : Fn(i, c) : u;
    },
    resolve(f) {
      let { lazy: g, loader: p, middleware: v } = i.route, b = h || u || f && !ct(r.method) && (g || p), w = v && v.length > 0 && !p && !g;
      return b && (ct(r.method) || !w) ? jm({
        request: r,
        unstable_pattern: a,
        match: i,
        lazyHandlerPromise: m?.handler,
        lazyRoutePromise: m?.route,
        handlerOverride: f,
        scopedContext: l
      }) : Promise.resolve({ type: "data", result: void 0 });
    }
  };
}
function sn(e, t, r, a, i, o, l, u = null) {
  return a.map((c) => c.route.id !== i.route.id ? {
    ...c,
    shouldLoad: !1,
    shouldRevalidateArgs: u,
    shouldCallHandler: () => !1,
    _lazyPromises: Ll(
      e,
      t,
      r,
      c,
      o
    ),
    resolve: () => Promise.resolve({ type: "data", result: void 0 })
  } : jo(
    e,
    t,
    r,
    aa(a),
    c,
    o,
    l,
    !0,
    u
  ));
}
async function zm(e, t, r, a, i, o) {
  r.some((d) => d._lazyPromises?.middleware) && await Promise.all(r.map((d) => d._lazyPromises?.middleware));
  let l = {
    request: t,
    unstable_pattern: aa(r),
    params: r[0].params,
    context: i,
    matches: r
  }, c = await e({
    ...l,
    fetcherKey: a,
    runClientMiddleware: (d) => {
      let h = l;
      return Ol(h, () => d({
        ...h,
        fetcherKey: a,
        runClientMiddleware: () => {
          throw new Error(
            "Cannot call `runClientMiddleware()` from within an `runClientMiddleware` handler"
          );
        }
      }));
    }
  });
  try {
    await Promise.all(
      r.flatMap((d) => [
        d._lazyPromises?.handler,
        d._lazyPromises?.route
      ])
    );
  } catch {
  }
  return c;
}
async function jm({
  request: e,
  unstable_pattern: t,
  match: r,
  lazyHandlerPromise: a,
  lazyRoutePromise: i,
  handlerOverride: o,
  scopedContext: l
}) {
  let u, c, d = ct(e.method), h = d ? "action" : "loader", m = (f) => {
    let g, p = new Promise((w, y) => g = y);
    c = () => g(), e.signal.addEventListener("abort", c);
    let v = (w) => typeof f != "function" ? Promise.reject(
      new Error(
        `You cannot call the handler for a route which defines a boolean "${h}" [routeId: ${r.route.id}]`
      )
    ) : f(
      {
        request: e,
        unstable_pattern: t,
        params: r.params,
        context: l
      },
      ...w !== void 0 ? [w] : []
    ), b = (async () => {
      try {
        return { type: "data", result: await (o ? o((y) => v(y)) : v()) };
      } catch (w) {
        return { type: "error", result: w };
      }
    })();
    return Promise.race([b, p]);
  };
  try {
    let f = d ? r.route.action : r.route.loader;
    if (a || i)
      if (f) {
        let g, [p] = await Promise.all([
          // If the handler throws, don't let it immediately bubble out,
          // since we need to let the lazy() execution finish so we know if this
          // route has a boundary that can handle the error
          m(f).catch((v) => {
            g = v;
          }),
          // Ensure all lazy route promises are resolved before continuing
          a,
          i
        ]);
        if (g !== void 0)
          throw g;
        u = p;
      } else {
        await a;
        let g = d ? r.route.action : r.route.loader;
        if (g)
          [u] = await Promise.all([m(g), i]);
        else if (h === "action") {
          let p = new URL(e.url), v = p.pathname + p.search;
          throw Et(405, {
            method: e.method,
            pathname: v,
            routeId: r.route.id
          });
        } else
          return { type: "data", result: void 0 };
      }
    else if (f)
      u = await m(f);
    else {
      let g = new URL(e.url), p = g.pathname + g.search;
      throw Et(404, {
        pathname: p
      });
    }
  } catch (f) {
    return { type: "error", result: f };
  } finally {
    c && e.signal.removeEventListener("abort", c);
  }
  return u;
}
async function Wm(e) {
  let t = e.headers.get("Content-Type");
  return t && /\bapplication\/json\b/.test(t) ? e.body == null ? null : e.json() : e.text();
}
async function Um(e) {
  let { result: t, type: r } = e;
  if (pi(t)) {
    let a;
    try {
      a = await Wm(t);
    } catch (i) {
      return { type: "error", error: i };
    }
    return r === "error" ? {
      type: "error",
      error: new na(t.status, t.statusText, a),
      statusCode: t.status,
      headers: t.headers
    } : {
      type: "data",
      data: a,
      statusCode: t.status,
      headers: t.headers
    };
  }
  return r === "error" ? bs(t) ? t.data instanceof Error ? {
    type: "error",
    error: t.data,
    statusCode: t.init?.status,
    headers: t.init?.headers ? new Headers(t.init.headers) : void 0
  } : {
    type: "error",
    error: Km(t),
    statusCode: Yn(t) ? t.status : void 0,
    headers: t.init?.headers ? new Headers(t.init.headers) : void 0
  } : {
    type: "error",
    error: t,
    statusCode: Yn(t) ? t.status : void 0
  } : bs(t) ? {
    type: "data",
    data: t.data,
    statusCode: t.init?.status,
    headers: t.init?.headers ? new Headers(t.init.headers) : void 0
  } : { type: "data", data: t };
}
function Vm(e, t, r, a, i) {
  let o = e.headers.get("Location");
  if (Pe(
    o,
    "Redirects returned/thrown from loaders/actions must have a Location header"
  ), !ui(o)) {
    let l = a.slice(
      0,
      a.findIndex((u) => u.route.id === r) + 1
    );
    o = Fo(
      new URL(t.url),
      l,
      i,
      o
    ), e.headers.set("Location", o);
  }
  return e;
}
function hs(e, t, r, a) {
  let i = [
    "about:",
    "blob:",
    "chrome:",
    "chrome-untrusted:",
    "content:",
    "data:",
    "devtools:",
    "file:",
    "filesystem:",
    // eslint-disable-next-line no-script-url
    "javascript:"
  ];
  if (ui(e)) {
    let o = e, l = o.startsWith("//") ? new URL(t.protocol + o) : new URL(o);
    if (i.includes(l.protocol))
      throw new Error("Invalid redirect location");
    let u = Rt(l.pathname, r) != null;
    if (l.origin === t.origin && u)
      return l.pathname + l.search + l.hash;
  }
  try {
    let o = a.createURL(e);
    if (i.includes(o.protocol))
      throw new Error("Invalid redirect location");
  } catch {
  }
  return e;
}
function nn(e, t, r, a) {
  let i = e.createURL(_l(t)).toString(), o = { signal: r };
  if (a && ct(a.formMethod)) {
    let { formMethod: l, formEncType: u } = a;
    o.method = l.toUpperCase(), u === "application/json" ? (o.headers = new Headers({ "Content-Type": u }), o.body = JSON.stringify(a.json)) : u === "text/plain" ? o.body = a.text : u === "application/x-www-form-urlencoded" && a.formData ? o.body = Wo(a.formData) : o.body = a.formData;
  }
  return new Request(i, o);
}
function Wo(e) {
  let t = new URLSearchParams();
  for (let [r, a] of e.entries())
    t.append(r, typeof a == "string" ? a : a.name);
  return t;
}
function fs(e) {
  let t = new FormData();
  for (let [r, a] of e.entries())
    t.append(r, a);
  return t;
}
function Hm(e, t, r, a = !1, i = !1) {
  let o = {}, l = null, u, c = !1, d = {}, h = r && xt(r[1]) ? r[1].error : void 0;
  return e.forEach((m) => {
    if (!(m.route.id in t))
      return;
    let f = m.route.id, g = t[f];
    if (Pe(
      !Br(g),
      "Cannot handle redirect results in processLoaderData"
    ), xt(g)) {
      let p = g.error;
      if (h !== void 0 && (p = h, h = void 0), l = l || {}, i)
        l[f] = p;
      else {
        let v = pr(e, f);
        l[v.route.id] == null && (l[v.route.id] = p);
      }
      a || (o[f] = Dl), c || (c = !0, u = Yn(g.error) ? g.error.status : 500), g.headers && (d[f] = g.headers);
    } else
      o[f] = g.data, g.statusCode && g.statusCode !== 200 && !c && (u = g.statusCode), g.headers && (d[f] = g.headers);
  }), h !== void 0 && r && (l = { [r[0]]: h }, r[2] && (o[r[2]] = void 0)), {
    loaderData: o,
    errors: l,
    statusCode: u || 200,
    loaderHeaders: d
  };
}
function ps(e, t, r, a, i, o) {
  let { loaderData: l, errors: u } = Hm(
    t,
    r,
    a
  );
  return i.filter((c) => !c.matches || c.matches.some((d) => d.shouldLoad)).forEach((c) => {
    let { key: d, match: h, controller: m } = c;
    if (m && m.signal.aborted)
      return;
    let f = o[d];
    if (Pe(f, "Did not find corresponding fetcher result"), xt(f)) {
      let g = pr(e.matches, h?.route.id);
      u && u[g.route.id] || (u = {
        ...u,
        [g.route.id]: f.error
      }), e.fetchers.delete(d);
    } else if (Br(f))
      Pe(!1, "Unhandled fetcher revalidation redirect");
    else {
      let g = rr(f.data);
      e.fetchers.set(d, g);
    }
  }), { loaderData: l, errors: u };
}
function gs(e, t, r, a) {
  let i = Object.entries(t).filter(([, o]) => o !== Dl).reduce((o, [l, u]) => (o[l] = u, o), {});
  for (let o of r) {
    let l = o.route.id;
    if (!t.hasOwnProperty(l) && e.hasOwnProperty(l) && o.route.loader && (i[l] = e[l]), a && a.hasOwnProperty(l))
      break;
  }
  return i;
}
function vs(e) {
  return e ? xt(e[1]) ? {
    // Clear out prior actionData on errors
    actionData: {}
  } : {
    actionData: {
      [e[0]]: e[1].data
    }
  } : {};
}
function pr(e, t) {
  return (t ? e.slice(0, e.findIndex((a) => a.route.id === t) + 1) : [...e]).reverse().find((a) => a.route.hasErrorBoundary === !0) || e[0];
}
function wa(e) {
  let t = e.length === 1 ? e[0] : e.find((r) => r.index || !r.path || r.path === "/") || {
    id: "__shim-error-route__"
  };
  return {
    matches: [
      {
        params: {},
        pathname: "",
        pathnameBase: "",
        route: t
      }
    ],
    route: t
  };
}
function Et(e, {
  pathname: t,
  routeId: r,
  method: a,
  type: i,
  message: o
} = {}) {
  let l = "Unknown Server Error", u = "Unknown @remix-run/router error";
  return e === 400 ? (l = "Bad Request", a && t && r ? u = `You made a ${a} request to "${t}" but did not provide a \`loader\` for route "${r}", so there is no way to handle the request.` : i === "invalid-body" && (u = "Unable to encode submission body")) : e === 403 ? (l = "Forbidden", u = `Route "${r}" does not match URL "${t}"`) : e === 404 ? (l = "Not Found", u = `No route matches URL "${t}"`) : e === 405 && (l = "Method Not Allowed", a && t && r ? u = `You made a ${a.toUpperCase()} request to "${t}" but did not provide an \`action\` for route "${r}", so there is no way to handle the request.` : a && (u = `Invalid request method "${a.toUpperCase()}"`)), new na(
    e || 500,
    l,
    new Error(u),
    !0
  );
}
function Na(e) {
  let t = Object.entries(e);
  for (let r = t.length - 1; r >= 0; r--) {
    let [a, i] = t[r];
    if (Br(i))
      return { key: a, result: i };
  }
}
function _l(e) {
  let t = typeof e == "string" ? Tr(e) : e;
  return Kt({ ...t, hash: "" });
}
function Gm(e, t) {
  return e.pathname !== t.pathname || e.search !== t.search ? !1 : e.hash === "" ? t.hash !== "" : e.hash === t.hash ? !0 : t.hash !== "";
}
function Km(e) {
  return new na(
    e.init?.status ?? 500,
    e.init?.statusText ?? "Internal Server Error",
    e.data
  );
}
function Ym(e) {
  return e != null && typeof e == "object" && Object.entries(e).every(
    ([t, r]) => typeof t == "string" && qm(r)
  );
}
function qm(e) {
  return e != null && typeof e == "object" && "type" in e && "result" in e && (e.type === "data" || e.type === "error");
}
function Xm(e) {
  return pi(e.result) && Tl.has(e.result.status);
}
function xt(e) {
  return e.type === "error";
}
function Br(e) {
  return (e && e.type) === "redirect";
}
function bs(e) {
  return typeof e == "object" && e != null && "type" in e && "data" in e && "init" in e && e.type === "DataWithResponseInit";
}
function pi(e) {
  return e != null && typeof e.status == "number" && typeof e.statusText == "string" && typeof e.headers == "object" && typeof e.body < "u";
}
function Qm(e) {
  return Tl.has(e);
}
function Jm(e) {
  return pi(e) && Qm(e.status) && e.headers.has("Location");
}
function Zm(e) {
  return Tm.has(e.toUpperCase());
}
function ct(e) {
  return Pm.has(e.toUpperCase());
}
function gi(e) {
  return new URLSearchParams(e).getAll("index").some((t) => t === "");
}
function $a(e, t) {
  let r = typeof t == "string" ? Tr(t).search : t.search;
  if (e[e.length - 1].route.index && gi(r || ""))
    return e[e.length - 1];
  let a = kl(e);
  return a[a.length - 1];
}
function ys(e) {
  let { formMethod: t, formAction: r, formEncType: a, text: i, formData: o, json: l } = e;
  if (!(!t || !r || !a)) {
    if (i != null)
      return {
        formMethod: t,
        formAction: r,
        formEncType: a,
        formData: void 0,
        json: void 0,
        text: i
      };
    if (o != null)
      return {
        formMethod: t,
        formAction: r,
        formEncType: a,
        formData: o,
        json: void 0,
        text: void 0
      };
    if (l !== void 0)
      return {
        formMethod: t,
        formAction: r,
        formEncType: a,
        formData: void 0,
        json: l,
        text: void 0
      };
  }
}
function No(e, t) {
  return t ? {
    state: "loading",
    location: e,
    formMethod: t.formMethod,
    formAction: t.formAction,
    formEncType: t.formEncType,
    formData: t.formData,
    json: t.json,
    text: t.text
  } : {
    state: "loading",
    location: e,
    formMethod: void 0,
    formAction: void 0,
    formEncType: void 0,
    formData: void 0,
    json: void 0,
    text: void 0
  };
}
function eh(e, t) {
  return {
    state: "submitting",
    location: e,
    formMethod: t.formMethod,
    formAction: t.formAction,
    formEncType: t.formEncType,
    formData: t.formData,
    json: t.json,
    text: t.text
  };
}
function An(e, t) {
  return e ? {
    state: "loading",
    formMethod: e.formMethod,
    formAction: e.formAction,
    formEncType: e.formEncType,
    formData: e.formData,
    json: e.json,
    text: e.text,
    data: t
  } : {
    state: "loading",
    formMethod: void 0,
    formAction: void 0,
    formEncType: void 0,
    formData: void 0,
    json: void 0,
    text: void 0,
    data: t
  };
}
function th(e, t) {
  return {
    state: "submitting",
    formMethod: e.formMethod,
    formAction: e.formAction,
    formEncType: e.formEncType,
    formData: e.formData,
    json: e.json,
    text: e.text,
    data: t ? t.data : void 0
  };
}
function rr(e) {
  return {
    state: "idle",
    formMethod: void 0,
    formAction: void 0,
    formEncType: void 0,
    formData: void 0,
    json: void 0,
    text: void 0,
    data: e
  };
}
function rh(e, t) {
  try {
    let r = e.sessionStorage.getItem(
      Al
    );
    if (r) {
      let a = JSON.parse(r);
      for (let [i, o] of Object.entries(a || {}))
        o && Array.isArray(o) && t.set(i, new Set(o || []));
    }
  } catch {
  }
}
function nh(e, t) {
  if (t.size > 0) {
    let r = {};
    for (let [a, i] of t)
      r[a] = [...i];
    try {
      e.sessionStorage.setItem(
        Al,
        JSON.stringify(r)
      );
    } catch (a) {
      Ze(
        !1,
        `Failed to save applied view transitions in sessionStorage (${a}).`
      );
    }
  }
}
function xs() {
  let e, t, r = new Promise((a, i) => {
    e = async (o) => {
      a(o);
      try {
        await r;
      } catch {
      }
    }, t = async (o) => {
      i(o);
      try {
        await r;
      } catch {
      }
    };
  });
  return {
    promise: r,
    //@ts-ignore
    resolve: e,
    //@ts-ignore
    reject: t
  };
}
var Hr = et(null);
Hr.displayName = "DataRouter";
var oa = et(null);
oa.displayName = "DataRouterState";
var Bl = et(!1);
function ah() {
  return ke(Bl);
}
var vi = et({
  isTransitioning: !1
});
vi.displayName = "ViewTransition";
var Fl = et(
  /* @__PURE__ */ new Map()
);
Fl.displayName = "Fetchers";
var oh = et(null);
oh.displayName = "Await";
var Tt = et(
  null
);
Tt.displayName = "Navigation";
var eo = et(
  null
);
eo.displayName = "Location";
var Xt = et({
  outlet: null,
  matches: [],
  isDataRoute: !1
});
Xt.displayName = "Route";
var bi = et(null);
bi.displayName = "RouteError";
var zl = "REACT_ROUTER_ERROR", ih = "REDIRECT", sh = "ROUTE_ERROR_RESPONSE";
function lh(e) {
  if (e.startsWith(`${zl}:${ih}:{`))
    try {
      let t = JSON.parse(e.slice(28));
      if (typeof t == "object" && t && typeof t.status == "number" && typeof t.statusText == "string" && typeof t.location == "string" && typeof t.reloadDocument == "boolean" && typeof t.replace == "boolean")
        return t;
    } catch {
    }
}
function ch(e) {
  if (e.startsWith(
    `${zl}:${sh}:{`
  ))
    try {
      let t = JSON.parse(e.slice(40));
      if (typeof t == "object" && t && typeof t.status == "number" && typeof t.statusText == "string")
        return new na(
          t.status,
          t.statusText,
          t.data
        );
    } catch {
    }
}
function dh(e, { relative: t } = {}) {
  Pe(
    ia(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    "useHref() may be used only in the context of a <Router> component."
  );
  let { basename: r, navigator: a } = ke(Tt), { hash: i, pathname: o, search: l } = la(e, { relative: t }), u = o;
  return r !== "/" && (u = o === "/" ? r : Ht([r, o])), a.createHref({ pathname: u, search: l, hash: i });
}
function ia() {
  return ke(eo) != null;
}
function Gr() {
  return Pe(
    ia(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    "useLocation() may be used only in the context of a <Router> component."
  ), ke(eo).location;
}
var jl = "You should call navigate() in a React.useEffect(), not when your component is first rendered.";
function Wl(e) {
  ke(Tt).static || hn(e);
}
function sa() {
  let { isDataRoute: e } = ke(Xt);
  return e ? Ch() : uh();
}
function uh() {
  Pe(
    ia(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    "useNavigate() may be used only in the context of a <Router> component."
  );
  let e = ke(Hr), { basename: t, navigator: r } = ke(Tt), { matches: a } = ke(Xt), { pathname: i } = Gr(), o = JSON.stringify(mi(a)), l = ve(!1);
  return Wl(() => {
    l.current = !0;
  }), Ae(
    (c, d = {}) => {
      if (Ze(l.current, jl), !l.current) return;
      if (typeof c == "number") {
        r.go(c);
        return;
      }
      let h = hi(
        c,
        JSON.parse(o),
        i,
        d.relative === "path"
      );
      e == null && t !== "/" && (h.pathname = h.pathname === "/" ? t : Ht([t, h.pathname])), (d.replace ? r.replace : r.push)(
        h,
        d.state,
        d
      );
    },
    [
      t,
      r,
      o,
      i,
      e
    ]
  );
}
et(null);
function fn() {
  let { matches: e } = ke(Xt), t = e[e.length - 1];
  return t ? t.params : {};
}
function la(e, { relative: t } = {}) {
  let { matches: r } = ke(Xt), { pathname: a } = Gr(), i = JSON.stringify(mi(r));
  return He(
    () => hi(
      e,
      JSON.parse(i),
      a,
      t === "path"
    ),
    [e, i, a, t]
  );
}
function mh(e, t, r, a, i) {
  Pe(
    ia(),
    // TODO: This error is probably because they somehow have 2 versions of the
    // router loaded. We can help them understand how to avoid that.
    "useRoutes() may be used only in the context of a <Router> component."
  );
  let { navigator: o } = ke(Tt), { matches: l } = ke(Xt), u = l[l.length - 1], c = u ? u.params : {}, d = u ? u.pathname : "/", h = u ? u.pathnameBase : "/", m = u && u.route;
  {
    let y = m && m.path || "";
    Vl(
      d,
      !m || y.endsWith("*") || y.endsWith("*?"),
      `You rendered descendant <Routes> (or called \`useRoutes()\`) at "${d}" (under <Route path="${y}">) but the parent route path has no trailing "*". This means if you navigate deeper, the parent won't match anymore and therefore the child routes will never render.

Please change the parent <Route path="${y}"> to <Route path="${y === "/" ? "*" : `${y}/*`}">.`
    );
  }
  let f = Gr(), g;
  g = f;
  let p = g.pathname || "/", v = p;
  if (h !== "/") {
    let y = h.replace(/^\//, "").split("/");
    v = "/" + p.replace(/^\//, "").split("/").slice(y.length).join("/");
  }
  let b = fr(e, { pathname: v });
  return Ze(
    m || b != null,
    `No routes matched location "${g.pathname}${g.search}${g.hash}" `
  ), Ze(
    b == null || b[b.length - 1].route.element !== void 0 || b[b.length - 1].route.Component !== void 0 || b[b.length - 1].route.lazy !== void 0,
    `Matched leaf route at location "${g.pathname}${g.search}${g.hash}" does not have an element or Component. This means it will render an <Outlet /> with a null value by default resulting in an "empty" page.`
  ), vh(
    b && b.map(
      (y) => Object.assign({}, y, {
        params: Object.assign({}, c, y.params),
        pathname: Ht([
          h,
          // Re-encode pathnames that were decoded inside matchRoutes.
          // Pre-encode `?` and `#` ahead of `encodeLocation` because it uses
          // `new URL()` internally and we need to prevent it from treating
          // them as separators
          o.encodeLocation ? o.encodeLocation(
            y.pathname.replace(/\?/g, "%3F").replace(/#/g, "%23")
          ).pathname : y.pathname
        ]),
        pathnameBase: y.pathnameBase === "/" ? h : Ht([
          h,
          // Re-encode pathnames that were decoded inside matchRoutes
          // Pre-encode `?` and `#` ahead of `encodeLocation` because it uses
          // `new URL()` internally and we need to prevent it from treating
          // them as separators
          o.encodeLocation ? o.encodeLocation(
            y.pathnameBase.replace(/\?/g, "%3F").replace(/#/g, "%23")
          ).pathname : y.pathnameBase
        ])
      })
    ),
    l,
    r,
    a,
    i
  );
}
function hh() {
  let e = Nh(), t = Yn(e) ? `${e.status} ${e.statusText}` : e instanceof Error ? e.message : JSON.stringify(e), r = e instanceof Error ? e.stack : null, a = "rgba(200,200,200, 0.5)", i = { padding: "0.5rem", backgroundColor: a }, o = { padding: "2px 4px", backgroundColor: a }, l = null;
  return console.error(
    "Error handled by React Router default ErrorBoundary:",
    e
  ), l = /* @__PURE__ */ me(ar, null, /* @__PURE__ */ me("p", null, "💿 Hey developer 👋"), /* @__PURE__ */ me("p", null, "You can provide a way better UX than this when your app throws errors by providing your own ", /* @__PURE__ */ me("code", { style: o }, "ErrorBoundary"), " or", " ", /* @__PURE__ */ me("code", { style: o }, "errorElement"), " prop on your route.")), /* @__PURE__ */ me(ar, null, /* @__PURE__ */ me("h2", null, "Unexpected Application Error!"), /* @__PURE__ */ me("h3", { style: { fontStyle: "italic" } }, t), r ? /* @__PURE__ */ me("pre", { style: i }, r) : null, l);
}
var fh = /* @__PURE__ */ me(hh, null), Ul = class extends gl {
  constructor(e) {
    super(e), this.state = {
      location: e.location,
      revalidation: e.revalidation,
      error: e.error
    };
  }
  static getDerivedStateFromError(e) {
    return { error: e };
  }
  static getDerivedStateFromProps(e, t) {
    return t.location !== e.location || t.revalidation !== "idle" && e.revalidation === "idle" ? {
      error: e.error,
      location: e.location,
      revalidation: e.revalidation
    } : {
      error: e.error !== void 0 ? e.error : t.error,
      location: t.location,
      revalidation: e.revalidation || t.revalidation
    };
  }
  componentDidCatch(e, t) {
    this.props.onError ? this.props.onError(e, t) : console.error(
      "React Router caught the following error during render",
      e
    );
  }
  render() {
    let e = this.state.error;
    if (this.context && typeof e == "object" && e && "digest" in e && typeof e.digest == "string") {
      const r = ch(e.digest);
      r && (e = r);
    }
    let t = e !== void 0 ? /* @__PURE__ */ me(Xt.Provider, { value: this.props.routeContext }, /* @__PURE__ */ me(
      bi.Provider,
      {
        value: e,
        children: this.props.component
      }
    )) : this.props.children;
    return this.context ? /* @__PURE__ */ me(ph, { error: e }, t) : t;
  }
};
Ul.contextType = Bl;
var Co = /* @__PURE__ */ new WeakMap();
function ph({
  children: e,
  error: t
}) {
  let { basename: r } = ke(Tt);
  if (typeof t == "object" && t && "digest" in t && typeof t.digest == "string") {
    let a = lh(t.digest);
    if (a) {
      let i = Co.get(t);
      if (i) throw i;
      let o = El(a.location, r);
      if (Sl && !Co.get(t))
        if (o.isExternal || a.reloadDocument)
          window.location.href = o.absoluteURL || o.to;
        else {
          const l = Promise.resolve().then(
            () => window.__reactRouterDataRouter.navigate(o.to, {
              replace: a.replace
            })
          );
          throw Co.set(t, l), l;
        }
      return /* @__PURE__ */ me(
        "meta",
        {
          httpEquiv: "refresh",
          content: `0;url=${o.absoluteURL || o.to}`
        }
      );
    }
  }
  return e;
}
function gh({ routeContext: e, match: t, children: r }) {
  let a = ke(Hr);
  return a && a.static && a.staticContext && (t.route.errorElement || t.route.ErrorBoundary) && (a.staticContext._deepestRenderedBoundaryId = t.route.id), /* @__PURE__ */ me(Xt.Provider, { value: e }, r);
}
function vh(e, t = [], r = null, a = null, i = null) {
  if (e == null) {
    if (!r)
      return null;
    if (r.errors)
      e = r.matches;
    else if (t.length === 0 && !r.initialized && r.matches.length > 0)
      e = r.matches;
    else
      return null;
  }
  let o = e, l = r?.errors;
  if (l != null) {
    let h = o.findIndex(
      (m) => m.route.id && l?.[m.route.id] !== void 0
    );
    Pe(
      h >= 0,
      `Could not find a matching route for errors on route IDs: ${Object.keys(
        l
      ).join(",")}`
    ), o = o.slice(
      0,
      Math.min(o.length, h + 1)
    );
  }
  let u = !1, c = -1;
  if (r)
    for (let h = 0; h < o.length; h++) {
      let m = o[h];
      if ((m.route.HydrateFallback || m.route.hydrateFallbackElement) && (c = h), m.route.id) {
        let { loaderData: f, errors: g } = r, p = m.route.loader && !f.hasOwnProperty(m.route.id) && (!g || g[m.route.id] === void 0);
        if (m.route.lazy || p) {
          u = !0, c >= 0 ? o = o.slice(0, c + 1) : o = [o[0]];
          break;
        }
      }
    }
  let d = r && a ? (h, m) => {
    a(h, {
      location: r.location,
      params: r.matches?.[0]?.params ?? {},
      unstable_pattern: aa(r.matches),
      errorInfo: m
    });
  } : void 0;
  return o.reduceRight(
    (h, m, f) => {
      let g, p = !1, v = null, b = null;
      r && (g = l && m.route.id ? l[m.route.id] : void 0, v = m.route.errorElement || fh, u && (c < 0 && f === 0 ? (Vl(
        "route-fallback",
        !1,
        "No `HydrateFallback` element provided to render during initial hydration"
      ), p = !0, b = null) : c === f && (p = !0, b = m.route.hydrateFallbackElement || null)));
      let w = t.concat(o.slice(0, f + 1)), y = () => {
        let k;
        return g ? k = v : p ? k = b : m.route.Component ? k = /* @__PURE__ */ me(m.route.Component, null) : m.route.element ? k = m.route.element : k = h, /* @__PURE__ */ me(
          gh,
          {
            match: m,
            routeContext: {
              outlet: h,
              matches: w,
              isDataRoute: r != null
            },
            children: k
          }
        );
      };
      return r && (m.route.ErrorBoundary || m.route.errorElement || f === 0) ? /* @__PURE__ */ me(
        Ul,
        {
          location: r.location,
          revalidation: r.revalidation,
          component: v,
          error: g,
          children: y(),
          routeContext: { outlet: null, matches: w, isDataRoute: !0 },
          onError: d
        }
      ) : y();
    },
    null
  );
}
function yi(e) {
  return `${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function bh(e) {
  let t = ke(Hr);
  return Pe(t, yi(e)), t;
}
function yh(e) {
  let t = ke(oa);
  return Pe(t, yi(e)), t;
}
function xh(e) {
  let t = ke(Xt);
  return Pe(t, yi(e)), t;
}
function xi(e) {
  let t = xh(e), r = t.matches[t.matches.length - 1];
  return Pe(
    r.route.id,
    `${e} can only be used on routes that contain a unique "id"`
  ), r.route.id;
}
function wh() {
  return xi(
    "useRouteId"
    /* UseRouteId */
  );
}
function Nh() {
  let e = ke(bi), t = yh(
    "useRouteError"
    /* UseRouteError */
  ), r = xi(
    "useRouteError"
    /* UseRouteError */
  );
  return e !== void 0 ? e : t.errors?.[r];
}
function Ch() {
  let { router: e } = bh(
    "useNavigate"
    /* UseNavigateStable */
  ), t = xi(
    "useNavigate"
    /* UseNavigateStable */
  ), r = ve(!1);
  return Wl(() => {
    r.current = !0;
  }), Ae(
    async (i, o = {}) => {
      Ze(r.current, jl), r.current && (typeof i == "number" ? await e.navigate(i) : await e.navigate(i, { fromRouteId: t, ...o }));
    },
    [e, t]
  );
}
var ws = {};
function Vl(e, t, r) {
  !t && !ws[e] && (ws[e] = !0, Ze(!1, r));
}
var Ns = {};
function Cs(e, t) {
  !e && !Ns[t] && (Ns[t] = !0, console.warn(t));
}
var kh = "useOptimistic", ks = bl[kh], Sh = () => {
};
function Eh(e) {
  return ks ? ks(e) : [e, Sh];
}
function Ph(e) {
  let t = {
    // Note: this check also occurs in createRoutesFromChildren so update
    // there if you change this -- please and thank you!
    hasErrorBoundary: e.hasErrorBoundary || e.ErrorBoundary != null || e.errorElement != null
  };
  return e.Component && (e.element && Ze(
    !1,
    "You should not include both `Component` and `element` on your route - `Component` will be used."
  ), Object.assign(t, {
    element: me(e.Component),
    Component: void 0
  })), e.HydrateFallback && (e.hydrateFallbackElement && Ze(
    !1,
    "You should not include both `HydrateFallback` and `hydrateFallbackElement` on your route - `HydrateFallback` will be used."
  ), Object.assign(t, {
    hydrateFallbackElement: me(e.HydrateFallback),
    HydrateFallback: void 0
  })), e.ErrorBoundary && (e.errorElement && Ze(
    !1,
    "You should not include both `ErrorBoundary` and `errorElement` on your route - `ErrorBoundary` will be used."
  ), Object.assign(t, {
    errorElement: me(e.ErrorBoundary),
    ErrorBoundary: void 0
  })), t;
}
var Rh = [
  "HydrateFallback",
  "hydrateFallbackElement"
], Th = class {
  constructor() {
    this.status = "pending", this.promise = new Promise((e, t) => {
      this.resolve = (r) => {
        this.status === "pending" && (this.status = "resolved", e(r));
      }, this.reject = (r) => {
        this.status === "pending" && (this.status = "rejected", t(r));
      };
    });
  }
};
function Ah({
  router: e,
  flushSync: t,
  onError: r,
  unstable_useTransitions: a
}) {
  a = ah() || a;
  let [o, l] = j(e.state), [u, c] = Eh(o), [d, h] = j(), [m, f] = j({
    isTransitioning: !1
  }), [g, p] = j(), [v, b] = j(), [w, y] = j(), k = ve(/* @__PURE__ */ new Map()), N = Ae(
    (R, { deletedFetchers: F, newErrors: V, flushSync: E, viewTransitionOpts: S }) => {
      V && r && Object.values(V).forEach(
        (A) => r(A, {
          location: R.location,
          params: R.matches[0]?.params ?? {},
          unstable_pattern: aa(R.matches)
        })
      ), R.fetchers.forEach((A, U) => {
        A.data !== void 0 && k.current.set(U, A.data);
      }), F.forEach((A) => k.current.delete(A)), Cs(
        E === !1 || t != null,
        'You provided the `flushSync` option to a router update, but you are not using the `<RouterProvider>` from `react-router/dom` so `ReactDOM.flushSync()` is unavailable.  Please update your app to `import { RouterProvider } from "react-router/dom"` and ensure you have `react-dom` installed as a dependency to use the `flushSync` option.'
      );
      let $ = e.window != null && e.window.document != null && typeof e.window.document.startViewTransition == "function";
      if (Cs(
        S == null || $,
        "You provided the `viewTransition` option to a router update, but you do not appear to be running in a DOM environment as `window.startViewTransition` is not available."
      ), !S || !$) {
        t && E ? t(() => l(R)) : a === !1 ? l(R) : Hn(() => {
          a === !0 && c((A) => Ss(A, R)), l(R);
        });
        return;
      }
      if (t && E) {
        t(() => {
          v && (g?.resolve(), v.skipTransition()), f({
            isTransitioning: !0,
            flushSync: !0,
            currentLocation: S.currentLocation,
            nextLocation: S.nextLocation
          });
        });
        let A = e.window.document.startViewTransition(() => {
          t(() => l(R));
        });
        A.finished.finally(() => {
          t(() => {
            p(void 0), b(void 0), h(void 0), f({ isTransitioning: !1 });
          });
        }), t(() => b(A));
        return;
      }
      v ? (g?.resolve(), v.skipTransition(), y({
        state: R,
        currentLocation: S.currentLocation,
        nextLocation: S.nextLocation
      })) : (h(R), f({
        isTransitioning: !0,
        flushSync: !1,
        currentLocation: S.currentLocation,
        nextLocation: S.nextLocation
      }));
    },
    [
      e.window,
      t,
      v,
      g,
      a,
      c,
      r
    ]
  );
  hn(() => e.subscribe(N), [e, N]), xe(() => {
    m.isTransitioning && !m.flushSync && p(new Th());
  }, [m]), xe(() => {
    if (g && d && e.window) {
      let R = d, F = g.promise, V = e.window.document.startViewTransition(async () => {
        a === !1 ? l(R) : Hn(() => {
          a === !0 && c((E) => Ss(E, R)), l(R);
        }), await F;
      });
      V.finished.finally(() => {
        p(void 0), b(void 0), h(void 0), f({ isTransitioning: !1 });
      }), b(V);
    }
  }, [
    d,
    g,
    e.window,
    a,
    c
  ]), xe(() => {
    g && d && u.location.key === d.location.key && g.resolve();
  }, [g, v, u.location, d]), xe(() => {
    !m.isTransitioning && w && (h(w.state), f({
      isTransitioning: !0,
      flushSync: !1,
      currentLocation: w.currentLocation,
      nextLocation: w.nextLocation
    }), y(void 0));
  }, [m.isTransitioning, w]);
  let T = He(() => ({
    createHref: e.createHref,
    encodeLocation: e.encodeLocation,
    go: (R) => e.navigate(R),
    push: (R, F, V) => e.navigate(R, {
      state: F,
      preventScrollReset: V?.preventScrollReset
    }),
    replace: (R, F, V) => e.navigate(R, {
      replace: !0,
      state: F,
      preventScrollReset: V?.preventScrollReset
    })
  }), [e]), _ = e.basename || "/", x = He(
    () => ({
      router: e,
      navigator: T,
      static: !1,
      basename: _,
      onError: r
    }),
    [e, T, _, r]
  );
  return /* @__PURE__ */ me(ar, null, /* @__PURE__ */ me(Hr.Provider, { value: x }, /* @__PURE__ */ me(oa.Provider, { value: u }, /* @__PURE__ */ me(Fl.Provider, { value: k.current }, /* @__PURE__ */ me(vi.Provider, { value: m }, /* @__PURE__ */ me(
    Ih,
    {
      basename: _,
      location: u.location,
      navigationType: u.historyAction,
      navigator: T,
      unstable_useTransitions: a
    },
    /* @__PURE__ */ me(
      Dh,
      {
        routes: e.routes,
        future: e.future,
        state: u,
        onError: r
      }
    )
  ))))), null);
}
function Ss(e, t) {
  return {
    // Don't surface "current location specific" stuff mid-navigation
    // (historyAction, location, matches, loaderData, errors, initialized,
    // restoreScroll, preventScrollReset, blockers, etc.)
    ...e,
    // Only surface "pending/in-flight stuff"
    // (navigation, revalidation, actionData, fetchers, )
    navigation: t.navigation.state !== "idle" ? t.navigation : e.navigation,
    revalidation: t.revalidation !== "idle" ? t.revalidation : e.revalidation,
    actionData: t.navigation.state !== "submitting" ? t.actionData : e.actionData,
    fetchers: t.fetchers
  };
}
var Dh = di(Mh);
function Mh({
  routes: e,
  future: t,
  state: r,
  onError: a
}) {
  return mh(e, void 0, r, a, t);
}
function Ih({
  basename: e = "/",
  children: t = null,
  location: r,
  navigationType: a = "POP",
  navigator: i,
  static: o = !1,
  unstable_useTransitions: l
}) {
  Pe(
    !ia(),
    "You cannot render a <Router> inside another <Router>. You should never have more than one in your app."
  );
  let u = e.replace(/^\/*/, "/"), c = He(
    () => ({
      basename: u,
      navigator: i,
      static: o,
      unstable_useTransitions: l,
      future: {}
    }),
    [u, i, o, l]
  );
  typeof r == "string" && (r = Tr(r));
  let {
    pathname: d = "/",
    search: h = "",
    hash: m = "",
    state: f = null,
    key: g = "default"
  } = r, p = He(() => {
    let v = Rt(d, u);
    return v == null ? null : {
      location: {
        pathname: v,
        search: h,
        hash: m,
        state: f,
        key: g
      },
      navigationType: a
    };
  }, [u, d, h, m, f, g, a]);
  return Ze(
    p != null,
    `<Router basename="${u}"> is not able to match the URL "${d}${h}${m}" because it does not start with the basename, so the <Router> won't render anything.`
  ), p == null ? null : /* @__PURE__ */ me(Tt.Provider, { value: c }, /* @__PURE__ */ me(eo.Provider, { children: t, value: p }));
}
var La = "get", _a = "application/x-www-form-urlencoded";
function to(e) {
  return typeof HTMLElement < "u" && e instanceof HTMLElement;
}
function Oh(e) {
  return to(e) && e.tagName.toLowerCase() === "button";
}
function $h(e) {
  return to(e) && e.tagName.toLowerCase() === "form";
}
function Lh(e) {
  return to(e) && e.tagName.toLowerCase() === "input";
}
function _h(e) {
  return !!(e.metaKey || e.altKey || e.ctrlKey || e.shiftKey);
}
function Bh(e, t) {
  return e.button === 0 && // Ignore everything but left clicks
  (!t || t === "_self") && // Let browser handle "target=_blank" etc.
  !_h(e);
}
var Ca = null;
function Fh() {
  if (Ca === null)
    try {
      new FormData(
        document.createElement("form"),
        // @ts-expect-error if FormData supports the submitter parameter, this will throw
        0
      ), Ca = !1;
    } catch {
      Ca = !0;
    }
  return Ca;
}
var zh = /* @__PURE__ */ new Set([
  "application/x-www-form-urlencoded",
  "multipart/form-data",
  "text/plain"
]);
function ko(e) {
  return e != null && !zh.has(e) ? (Ze(
    !1,
    `"${e}" is not a valid \`encType\` for \`<Form>\`/\`<fetcher.Form>\` and will default to "${_a}"`
  ), null) : e;
}
function jh(e, t) {
  let r, a, i, o, l;
  if ($h(e)) {
    let u = e.getAttribute("action");
    a = u ? Rt(u, t) : null, r = e.getAttribute("method") || La, i = ko(e.getAttribute("enctype")) || _a, o = new FormData(e);
  } else if (Oh(e) || Lh(e) && (e.type === "submit" || e.type === "image")) {
    let u = e.form;
    if (u == null)
      throw new Error(
        'Cannot submit a <button> or <input type="submit"> without a <form>'
      );
    let c = e.getAttribute("formaction") || u.getAttribute("action");
    if (a = c ? Rt(c, t) : null, r = e.getAttribute("formmethod") || u.getAttribute("method") || La, i = ko(e.getAttribute("formenctype")) || ko(u.getAttribute("enctype")) || _a, o = new FormData(u, e), !Fh()) {
      let { name: d, type: h, value: m } = e;
      if (h === "image") {
        let f = d ? `${d}.` : "";
        o.append(`${f}x`, "0"), o.append(`${f}y`, "0");
      } else d && o.append(d, m);
    }
  } else {
    if (to(e))
      throw new Error(
        'Cannot submit element that is not <form>, <button>, or <input type="submit|image">'
      );
    r = La, a = null, i = _a, l = e;
  }
  return o && i === "text/plain" && (l = o, o = void 0), { action: a, method: r.toLowerCase(), encType: i, formData: o, body: l };
}
Object.getOwnPropertyNames(Object.prototype).sort().join("\0");
function wi(e, t) {
  if (e === !1 || e === null || typeof e > "u")
    throw new Error(t);
}
function Wh(e, t, r, a) {
  let i = typeof e == "string" ? new URL(
    e,
    // This can be called during the SSR flow via PrefetchPageLinksImpl so
    // don't assume window is available
    typeof window > "u" ? "server://singlefetch/" : window.location.origin
  ) : e;
  return r ? i.pathname.endsWith("/") ? i.pathname = `${i.pathname}_.${a}` : i.pathname = `${i.pathname}.${a}` : i.pathname === "/" ? i.pathname = `_root.${a}` : t && Rt(i.pathname, t) === "/" ? i.pathname = `${t.replace(/\/$/, "")}/_root.${a}` : i.pathname = `${i.pathname.replace(/\/$/, "")}.${a}`, i;
}
async function Uh(e, t) {
  if (e.id in t)
    return t[e.id];
  try {
    let r = await import(
      /* @vite-ignore */
      /* webpackIgnore: true */
      e.module
    );
    return t[e.id] = r, r;
  } catch (r) {
    return console.error(
      `Error loading route module \`${e.module}\`, reloading page...`
    ), console.error(r), window.__reactRouterContext && window.__reactRouterContext.isSpaMode, window.location.reload(), new Promise(() => {
    });
  }
}
function Vh(e) {
  return e == null ? !1 : e.href == null ? e.rel === "preload" && typeof e.imageSrcSet == "string" && typeof e.imageSizes == "string" : typeof e.rel == "string" && typeof e.href == "string";
}
async function Hh(e, t, r) {
  let a = await Promise.all(
    e.map(async (i) => {
      let o = t.routes[i.route.id];
      if (o) {
        let l = await Uh(o, r);
        return l.links ? l.links() : [];
      }
      return [];
    })
  );
  return qh(
    a.flat(1).filter(Vh).filter((i) => i.rel === "stylesheet" || i.rel === "preload").map(
      (i) => i.rel === "stylesheet" ? { ...i, rel: "prefetch", as: "style" } : { ...i, rel: "prefetch" }
    )
  );
}
function Es(e, t, r, a, i, o) {
  let l = (c, d) => r[d] ? c.route.id !== r[d].route.id : !0, u = (c, d) => (
    // param change, /users/123 -> /users/456
    r[d].pathname !== c.pathname || // splat param changed, which is not present in match.path
    // e.g. /files/images/avatar.jpg -> files/finances.xls
    r[d].route.path?.endsWith("*") && r[d].params["*"] !== c.params["*"]
  );
  return o === "assets" ? t.filter(
    (c, d) => l(c, d) || u(c, d)
  ) : o === "data" ? t.filter((c, d) => {
    let h = a.routes[c.route.id];
    if (!h || !h.hasLoader)
      return !1;
    if (l(c, d) || u(c, d))
      return !0;
    if (c.route.shouldRevalidate) {
      let m = c.route.shouldRevalidate({
        currentUrl: new URL(
          i.pathname + i.search + i.hash,
          window.origin
        ),
        currentParams: r[0]?.params || {},
        nextUrl: new URL(e, window.origin),
        nextParams: c.params,
        defaultShouldRevalidate: !0
      });
      if (typeof m == "boolean")
        return m;
    }
    return !0;
  }) : [];
}
function Gh(e, t, { includeHydrateFallback: r } = {}) {
  return Kh(
    e.map((a) => {
      let i = t.routes[a.route.id];
      if (!i) return [];
      let o = [i.module];
      return i.clientActionModule && (o = o.concat(i.clientActionModule)), i.clientLoaderModule && (o = o.concat(i.clientLoaderModule)), r && i.hydrateFallbackModule && (o = o.concat(i.hydrateFallbackModule)), i.imports && (o = o.concat(i.imports)), o;
    }).flat(1)
  );
}
function Kh(e) {
  return [...new Set(e)];
}
function Yh(e) {
  let t = {}, r = Object.keys(e).sort();
  for (let a of r)
    t[a] = e[a];
  return t;
}
function qh(e, t) {
  let r = /* @__PURE__ */ new Set();
  return new Set(t), e.reduce((a, i) => {
    let o = JSON.stringify(Yh(i));
    return r.has(o) || (r.add(o), a.push({ key: o, link: i })), a;
  }, []);
}
function Hl() {
  let e = ke(Hr);
  return wi(
    e,
    "You must render this element inside a <DataRouterContext.Provider> element"
  ), e;
}
function Xh() {
  let e = ke(oa);
  return wi(
    e,
    "You must render this element inside a <DataRouterStateContext.Provider> element"
  ), e;
}
var Ni = et(void 0);
Ni.displayName = "FrameworkContext";
function Gl() {
  let e = ke(Ni);
  return wi(
    e,
    "You must render this element inside a <HydratedRouter> element"
  ), e;
}
function Qh(e, t) {
  let r = ke(Ni), [a, i] = j(!1), [o, l] = j(!1), { onFocus: u, onBlur: c, onMouseEnter: d, onMouseLeave: h, onTouchStart: m } = t, f = ve(null);
  xe(() => {
    if (e === "render" && l(!0), e === "viewport") {
      let v = (w) => {
        w.forEach((y) => {
          l(y.isIntersecting);
        });
      }, b = new IntersectionObserver(v, { threshold: 0.5 });
      return f.current && b.observe(f.current), () => {
        b.disconnect();
      };
    }
  }, [e]), xe(() => {
    if (a) {
      let v = setTimeout(() => {
        l(!0);
      }, 100);
      return () => {
        clearTimeout(v);
      };
    }
  }, [a]);
  let g = () => {
    i(!0);
  }, p = () => {
    i(!1), l(!1);
  };
  return r ? e !== "intent" ? [o, f, {}] : [
    o,
    f,
    {
      onFocus: Dn(u, g),
      onBlur: Dn(c, p),
      onMouseEnter: Dn(d, g),
      onMouseLeave: Dn(h, p),
      onTouchStart: Dn(m, g)
    }
  ] : [!1, f, {}];
}
function Dn(e, t) {
  return (r) => {
    e && e(r), r.defaultPrevented || t(r);
  };
}
function Jh({ page: e, ...t }) {
  let { router: r } = Hl(), a = He(
    () => fr(r.routes, e, r.basename),
    [r.routes, e, r.basename]
  );
  return a ? /* @__PURE__ */ me(ef, { page: e, matches: a, ...t }) : null;
}
function Zh(e) {
  let { manifest: t, routeModules: r } = Gl(), [a, i] = j([]);
  return xe(() => {
    let o = !1;
    return Hh(e, t, r).then(
      (l) => {
        o || i(l);
      }
    ), () => {
      o = !0;
    };
  }, [e, t, r]), a;
}
function ef({
  page: e,
  matches: t,
  ...r
}) {
  let a = Gr(), { future: i, manifest: o, routeModules: l } = Gl(), { basename: u } = Hl(), { loaderData: c, matches: d } = Xh(), h = He(
    () => Es(
      e,
      t,
      d,
      o,
      a,
      "data"
    ),
    [e, t, d, o, a]
  ), m = He(
    () => Es(
      e,
      t,
      d,
      o,
      a,
      "assets"
    ),
    [e, t, d, o, a]
  ), f = He(() => {
    if (e === a.pathname + a.search + a.hash)
      return [];
    let v = /* @__PURE__ */ new Set(), b = !1;
    if (t.forEach((y) => {
      let k = o.routes[y.route.id];
      !k || !k.hasLoader || (!h.some((N) => N.route.id === y.route.id) && y.route.id in c && l[y.route.id]?.shouldRevalidate || k.hasClientLoader ? b = !0 : v.add(y.route.id));
    }), v.size === 0)
      return [];
    let w = Wh(
      e,
      u,
      i.unstable_trailingSlashAwareDataRequests,
      "data"
    );
    return b && v.size > 0 && w.searchParams.set(
      "_routes",
      t.filter((y) => v.has(y.route.id)).map((y) => y.route.id).join(",")
    ), [w.pathname + w.search];
  }, [
    u,
    i.unstable_trailingSlashAwareDataRequests,
    c,
    a,
    o,
    h,
    t,
    e,
    l
  ]), g = He(
    () => Gh(m, o),
    [m, o]
  ), p = Zh(m);
  return /* @__PURE__ */ me(ar, null, f.map((v) => /* @__PURE__ */ me("link", { key: v, rel: "prefetch", as: "fetch", href: v, ...r })), g.map((v) => /* @__PURE__ */ me("link", { key: v, rel: "modulepreload", href: v, ...r })), p.map(({ key: v, link: b }) => (
    // these don't spread `linkProps` because they are full link descriptors
    // already with their own props
    /* @__PURE__ */ me(
      "link",
      {
        key: v,
        nonce: r.nonce,
        ...b,
        crossOrigin: b.crossOrigin ?? r.crossOrigin
      }
    )
  )));
}
function tf(...e) {
  return (t) => {
    e.forEach((r) => {
      typeof r == "function" ? r(t) : r != null && (r.current = t);
    });
  };
}
var rf = typeof window < "u" && typeof window.document < "u" && typeof window.document.createElement < "u";
try {
  rf && (window.__reactRouterVersion = // @ts-expect-error
  "7.13.0");
} catch {
}
function nf(e, t) {
  return Im({
    basename: t?.basename,
    getContext: t?.getContext,
    future: t?.future,
    history: qu({ window: t?.window }),
    hydrationData: af(),
    routes: e,
    mapRouteProperties: Ph,
    hydrationRouteProperties: Rh,
    dataStrategy: t?.dataStrategy,
    patchRoutesOnNavigation: t?.patchRoutesOnNavigation,
    window: t?.window,
    unstable_instrumentations: t?.unstable_instrumentations
  }).initialize();
}
function af() {
  let e = window?.__staticRouterHydrationData;
  return e && e.errors && (e = {
    ...e,
    errors: of(e.errors)
  }), e;
}
function of(e) {
  if (!e) return null;
  let t = Object.entries(e), r = {};
  for (let [a, i] of t)
    if (i && i.__type === "RouteErrorResponse")
      r[a] = new na(
        i.status,
        i.statusText,
        i.data,
        i.internal === !0
      );
    else if (i && i.__type === "Error") {
      if (i.__subType) {
        let o = window[i.__subType];
        if (typeof o == "function")
          try {
            let l = new o(i.message);
            l.stack = "", r[a] = l;
          } catch {
          }
      }
      if (r[a] == null) {
        let o = new Error(i.message);
        o.stack = "", r[a] = o;
      }
    } else
      r[a] = i;
  return r;
}
var Kl = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i, Ve = Q(
  function({
    onClick: t,
    discover: r = "render",
    prefetch: a = "none",
    relative: i,
    reloadDocument: o,
    replace: l,
    state: u,
    target: c,
    to: d,
    preventScrollReset: h,
    viewTransition: m,
    unstable_defaultShouldRevalidate: f,
    ...g
  }, p) {
    let { basename: v, unstable_useTransitions: b } = ke(Tt), w = typeof d == "string" && Kl.test(d), y = El(d, v);
    d = y.to;
    let k = dh(d, { relative: i }), [N, T, _] = Qh(
      a,
      g
    ), x = df(d, {
      replace: l,
      state: u,
      target: c,
      preventScrollReset: h,
      relative: i,
      viewTransition: m,
      unstable_defaultShouldRevalidate: f,
      unstable_useTransitions: b
    });
    function R(V) {
      t && t(V), V.defaultPrevented || x(V);
    }
    let F = (
      // eslint-disable-next-line jsx-a11y/anchor-has-content
      /* @__PURE__ */ me(
        "a",
        {
          ...g,
          ..._,
          href: y.absoluteURL || k,
          onClick: y.isExternal || o ? t : R,
          ref: tf(p, T),
          target: c,
          "data-discover": !w && r === "render" ? "true" : void 0
        }
      )
    );
    return N && !w ? /* @__PURE__ */ me(ar, null, F, /* @__PURE__ */ me(Jh, { page: k })) : F;
  }
);
Ve.displayName = "Link";
var sf = Q(
  function({
    "aria-current": t = "page",
    caseSensitive: r = !1,
    className: a = "",
    end: i = !1,
    style: o,
    to: l,
    viewTransition: u,
    children: c,
    ...d
  }, h) {
    let m = la(l, { relative: d.relative }), f = Gr(), g = ke(oa), { navigator: p, basename: v } = ke(Tt), b = g != null && // Conditional usage is OK here because the usage of a data router is static
    // eslint-disable-next-line react-hooks/rules-of-hooks
    pf(m) && u === !0, w = p.encodeLocation ? p.encodeLocation(m).pathname : m.pathname, y = f.pathname, k = g && g.navigation && g.navigation.location ? g.navigation.location.pathname : null;
    r || (y = y.toLowerCase(), k = k ? k.toLowerCase() : null, w = w.toLowerCase()), k && v && (k = Rt(k, v) || k);
    const N = w !== "/" && w.endsWith("/") ? w.length - 1 : w.length;
    let T = y === w || !i && y.startsWith(w) && y.charAt(N) === "/", _ = k != null && (k === w || !i && k.startsWith(w) && k.charAt(w.length) === "/"), x = {
      isActive: T,
      isPending: _,
      isTransitioning: b
    }, R = T ? t : void 0, F;
    typeof a == "function" ? F = a(x) : F = [
      a,
      T ? "active" : null,
      _ ? "pending" : null,
      b ? "transitioning" : null
    ].filter(Boolean).join(" ");
    let V = typeof o == "function" ? o(x) : o;
    return /* @__PURE__ */ me(
      Ve,
      {
        ...d,
        "aria-current": R,
        className: F,
        ref: h,
        style: V,
        to: l,
        viewTransition: u
      },
      typeof c == "function" ? c(x) : c
    );
  }
);
sf.displayName = "NavLink";
var lf = Q(
  ({
    discover: e = "render",
    fetcherKey: t,
    navigate: r,
    reloadDocument: a,
    replace: i,
    state: o,
    method: l = La,
    action: u,
    onSubmit: c,
    relative: d,
    preventScrollReset: h,
    viewTransition: m,
    unstable_defaultShouldRevalidate: f,
    ...g
  }, p) => {
    let { unstable_useTransitions: v } = ke(Tt), b = hf(), w = ff(u, { relative: d }), y = l.toLowerCase() === "get" ? "get" : "post", k = typeof u == "string" && Kl.test(u);
    return /* @__PURE__ */ me(
      "form",
      {
        ref: p,
        method: y,
        action: w,
        onSubmit: a ? c : (T) => {
          if (c && c(T), T.defaultPrevented) return;
          T.preventDefault();
          let _ = T.nativeEvent.submitter, x = _?.getAttribute("formmethod") || l, R = () => b(_ || T.currentTarget, {
            fetcherKey: t,
            method: x,
            navigate: r,
            replace: i,
            state: o,
            relative: d,
            preventScrollReset: h,
            viewTransition: m,
            unstable_defaultShouldRevalidate: f
          });
          v && r !== !1 ? Hn(() => R()) : R();
        },
        ...g,
        "data-discover": !k && e === "render" ? "true" : void 0
      }
    );
  }
);
lf.displayName = "Form";
function cf(e) {
  return `${e} must be used within a data router.  See https://reactrouter.com/en/main/routers/picking-a-router.`;
}
function Yl(e) {
  let t = ke(Hr);
  return Pe(t, cf(e)), t;
}
function df(e, {
  target: t,
  replace: r,
  state: a,
  preventScrollReset: i,
  relative: o,
  viewTransition: l,
  unstable_defaultShouldRevalidate: u,
  unstable_useTransitions: c
} = {}) {
  let d = sa(), h = Gr(), m = la(e, { relative: o });
  return Ae(
    (f) => {
      if (Bh(f, t)) {
        f.preventDefault();
        let g = r !== void 0 ? r : Kt(h) === Kt(m), p = () => d(e, {
          replace: g,
          state: a,
          preventScrollReset: i,
          relative: o,
          viewTransition: l,
          unstable_defaultShouldRevalidate: u
        });
        c ? Hn(() => p()) : p();
      }
    },
    [
      h,
      d,
      m,
      r,
      a,
      t,
      e,
      i,
      o,
      l,
      u,
      c
    ]
  );
}
var uf = 0, mf = () => `__${String(++uf)}__`;
function hf() {
  let { router: e } = Yl(
    "useSubmit"
    /* UseSubmit */
  ), { basename: t } = ke(Tt), r = wh(), a = e.fetch, i = e.navigate;
  return Ae(
    async (o, l = {}) => {
      let { action: u, method: c, encType: d, formData: h, body: m } = jh(
        o,
        t
      );
      if (l.navigate === !1) {
        let f = l.fetcherKey || mf();
        await a(f, r, l.action || u, {
          unstable_defaultShouldRevalidate: l.unstable_defaultShouldRevalidate,
          preventScrollReset: l.preventScrollReset,
          formData: h,
          body: m,
          formMethod: l.method || c,
          formEncType: l.encType || d,
          flushSync: l.flushSync
        });
      } else
        await i(l.action || u, {
          unstable_defaultShouldRevalidate: l.unstable_defaultShouldRevalidate,
          preventScrollReset: l.preventScrollReset,
          formData: h,
          body: m,
          formMethod: l.method || c,
          formEncType: l.encType || d,
          replace: l.replace,
          state: l.state,
          fromRouteId: r,
          flushSync: l.flushSync,
          viewTransition: l.viewTransition
        });
    },
    [a, i, t, r]
  );
}
function ff(e, { relative: t } = {}) {
  let { basename: r } = ke(Tt), a = ke(Xt);
  Pe(a, "useFormAction must be used inside a RouteContext");
  let [i] = a.matches.slice(-1), o = { ...la(e || ".", { relative: t }) }, l = Gr();
  if (e == null) {
    o.search = l.search;
    let u = new URLSearchParams(o.search), c = u.getAll("index");
    if (c.some((h) => h === "")) {
      u.delete("index"), c.filter((m) => m).forEach((m) => u.append("index", m));
      let h = u.toString();
      o.search = h ? `?${h}` : "";
    }
  }
  return (!e || e === ".") && i.route.index && (o.search = o.search ? o.search.replace(/^\?/, "?index&") : "?index"), r !== "/" && (o.pathname = o.pathname === "/" ? r : Ht([r, o.pathname])), Kt(o);
}
function pf(e, { relative: t } = {}) {
  let r = ke(vi);
  Pe(
    r != null,
    "`useViewTransitionState` must be used within `react-router-dom`'s `RouterProvider`.  Did you accidentally import `RouterProvider` from `react-router`?"
  );
  let { basename: a } = Yl(
    "useViewTransitionState"
    /* useViewTransitionState */
  ), i = la(e, { relative: t });
  if (!r.isTransitioning)
    return !1;
  let o = Rt(r.currentLocation.pathname, a) || r.currentLocation.pathname, l = Rt(r.nextLocation.pathname, a) || r.nextLocation.pathname;
  return Ua(i.pathname, l) != null || Ua(i.pathname, o) != null;
}
function Ps(e, t) {
  if (typeof e == "function")
    return e(t);
  e != null && (e.current = t);
}
function ql(...e) {
  return (t) => {
    let r = !1;
    const a = e.map((i) => {
      const o = Ps(i, t);
      return !r && typeof o == "function" && (r = !0), o;
    });
    if (r)
      return () => {
        for (let i = 0; i < a.length; i++) {
          const o = a[i];
          typeof o == "function" ? o() : Ps(e[i], null);
        }
      };
  };
}
function Ke(...e) {
  return Ae(ql(...e), e);
}
var kr = Q((e, t) => {
  const { children: r, ...a } = e, i = Vt.toArray(r), o = i.find(vf);
  if (o) {
    const l = o.props.children, u = i.map((c) => c === o ? Vt.count(l) > 1 ? Vt.only(null) : Vn(l) ? l.props.children : null : c);
    return /* @__PURE__ */ n(Uo, { ...a, ref: t, children: Vn(l) ? mn(l, void 0, u) : null });
  }
  return /* @__PURE__ */ n(Uo, { ...a, ref: t, children: r });
});
kr.displayName = "Slot";
var Uo = Q((e, t) => {
  const { children: r, ...a } = e;
  if (Vn(r)) {
    const i = yf(r), o = bf(a, r.props);
    return r.type !== ar && (o.ref = t ? ql(t, i) : i), mn(r, o);
  }
  return Vt.count(r) > 1 ? Vt.only(null) : null;
});
Uo.displayName = "SlotClone";
var gf = ({ children: e }) => /* @__PURE__ */ n(Cr, { children: e });
function vf(e) {
  return Vn(e) && e.type === gf;
}
function bf(e, t) {
  const r = { ...t };
  for (const a in t) {
    const i = e[a], o = t[a];
    /^on[A-Z]/.test(a) ? i && o ? r[a] = (...u) => {
      o(...u), i(...u);
    } : i && (r[a] = i) : a === "style" ? r[a] = { ...i, ...o } : a === "className" && (r[a] = [i, o].filter(Boolean).join(" "));
  }
  return { ...e, ...r };
}
function yf(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, r = t && "isReactWarning" in t && t.isReactWarning;
  return r ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, r = t && "isReactWarning" in t && t.isReactWarning, r ? e.props.ref : e.props.ref || e.ref);
}
function Xl(e) {
  var t, r, a = "";
  if (typeof e == "string" || typeof e == "number") a += e;
  else if (typeof e == "object") if (Array.isArray(e)) {
    var i = e.length;
    for (t = 0; t < i; t++) e[t] && (r = Xl(e[t])) && (a && (a += " "), a += r);
  } else for (r in e) e[r] && (a && (a += " "), a += r);
  return a;
}
function Ql() {
  for (var e, t, r = 0, a = "", i = arguments.length; r < i; r++) (e = arguments[r]) && (t = Xl(e)) && (a && (a += " "), a += t);
  return a;
}
const Rs = (e) => typeof e == "boolean" ? `${e}` : e === 0 ? "0" : e, Ts = Ql, Jl = (e, t) => (r) => {
  var a;
  if (t?.variants == null) return Ts(e, r?.class, r?.className);
  const { variants: i, defaultVariants: o } = t, l = Object.keys(i).map((d) => {
    const h = r?.[d], m = o?.[d];
    if (h === null) return null;
    const f = Rs(h) || Rs(m);
    return i[d][f];
  }), u = r && Object.entries(r).reduce((d, h) => {
    let [m, f] = h;
    return f === void 0 || (d[m] = f), d;
  }, {}), c = t == null || (a = t.compoundVariants) === null || a === void 0 ? void 0 : a.reduce((d, h) => {
    let { class: m, className: f, ...g } = h;
    return Object.entries(g).every((p) => {
      let [v, b] = p;
      return Array.isArray(b) ? b.includes({
        ...o,
        ...u
      }[v]) : {
        ...o,
        ...u
      }[v] === b;
    }) ? [
      ...d,
      m,
      f
    ] : d;
  }, []);
  return Ts(e, l, c, r?.class, r?.className);
}, Ci = "-", xf = (e) => {
  const t = Nf(e), {
    conflictingClassGroups: r,
    conflictingClassGroupModifiers: a
  } = e;
  return {
    getClassGroupId: (l) => {
      const u = l.split(Ci);
      return u[0] === "" && u.length !== 1 && u.shift(), Zl(u, t) || wf(l);
    },
    getConflictingClassGroupIds: (l, u) => {
      const c = r[l] || [];
      return u && a[l] ? [...c, ...a[l]] : c;
    }
  };
}, Zl = (e, t) => {
  if (e.length === 0)
    return t.classGroupId;
  const r = e[0], a = t.nextPart.get(r), i = a ? Zl(e.slice(1), a) : void 0;
  if (i)
    return i;
  if (t.validators.length === 0)
    return;
  const o = e.join(Ci);
  return t.validators.find(({
    validator: l
  }) => l(o))?.classGroupId;
}, As = /^\[(.+)\]$/, wf = (e) => {
  if (As.test(e)) {
    const t = As.exec(e)[1], r = t?.substring(0, t.indexOf(":"));
    if (r)
      return "arbitrary.." + r;
  }
}, Nf = (e) => {
  const {
    theme: t,
    classGroups: r
  } = e, a = {
    nextPart: /* @__PURE__ */ new Map(),
    validators: []
  };
  for (const i in r)
    Vo(r[i], a, i, t);
  return a;
}, Vo = (e, t, r, a) => {
  e.forEach((i) => {
    if (typeof i == "string") {
      const o = i === "" ? t : Ds(t, i);
      o.classGroupId = r;
      return;
    }
    if (typeof i == "function") {
      if (Cf(i)) {
        Vo(i(a), t, r, a);
        return;
      }
      t.validators.push({
        validator: i,
        classGroupId: r
      });
      return;
    }
    Object.entries(i).forEach(([o, l]) => {
      Vo(l, Ds(t, o), r, a);
    });
  });
}, Ds = (e, t) => {
  let r = e;
  return t.split(Ci).forEach((a) => {
    r.nextPart.has(a) || r.nextPart.set(a, {
      nextPart: /* @__PURE__ */ new Map(),
      validators: []
    }), r = r.nextPart.get(a);
  }), r;
}, Cf = (e) => e.isThemeGetter, kf = (e) => {
  if (e < 1)
    return {
      get: () => {
      },
      set: () => {
      }
    };
  let t = 0, r = /* @__PURE__ */ new Map(), a = /* @__PURE__ */ new Map();
  const i = (o, l) => {
    r.set(o, l), t++, t > e && (t = 0, a = r, r = /* @__PURE__ */ new Map());
  };
  return {
    get(o) {
      let l = r.get(o);
      if (l !== void 0)
        return l;
      if ((l = a.get(o)) !== void 0)
        return i(o, l), l;
    },
    set(o, l) {
      r.has(o) ? r.set(o, l) : i(o, l);
    }
  };
}, Ho = "!", Go = ":", Sf = Go.length, Ef = (e) => {
  const {
    prefix: t,
    experimentalParseClassName: r
  } = e;
  let a = (i) => {
    const o = [];
    let l = 0, u = 0, c = 0, d;
    for (let p = 0; p < i.length; p++) {
      let v = i[p];
      if (l === 0 && u === 0) {
        if (v === Go) {
          o.push(i.slice(c, p)), c = p + Sf;
          continue;
        }
        if (v === "/") {
          d = p;
          continue;
        }
      }
      v === "[" ? l++ : v === "]" ? l-- : v === "(" ? u++ : v === ")" && u--;
    }
    const h = o.length === 0 ? i : i.substring(c), m = Pf(h), f = m !== h, g = d && d > c ? d - c : void 0;
    return {
      modifiers: o,
      hasImportantModifier: f,
      baseClassName: m,
      maybePostfixModifierPosition: g
    };
  };
  if (t) {
    const i = t + Go, o = a;
    a = (l) => l.startsWith(i) ? o(l.substring(i.length)) : {
      isExternal: !0,
      modifiers: [],
      hasImportantModifier: !1,
      baseClassName: l,
      maybePostfixModifierPosition: void 0
    };
  }
  if (r) {
    const i = a;
    a = (o) => r({
      className: o,
      parseClassName: i
    });
  }
  return a;
}, Pf = (e) => e.endsWith(Ho) ? e.substring(0, e.length - 1) : e.startsWith(Ho) ? e.substring(1) : e, Rf = (e) => {
  const t = Object.fromEntries(e.orderSensitiveModifiers.map((a) => [a, !0]));
  return (a) => {
    if (a.length <= 1)
      return a;
    const i = [];
    let o = [];
    return a.forEach((l) => {
      l[0] === "[" || t[l] ? (i.push(...o.sort(), l), o = []) : o.push(l);
    }), i.push(...o.sort()), i;
  };
}, Tf = (e) => ({
  cache: kf(e.cacheSize),
  parseClassName: Ef(e),
  sortModifiers: Rf(e),
  ...xf(e)
}), Af = /\s+/, Df = (e, t) => {
  const {
    parseClassName: r,
    getClassGroupId: a,
    getConflictingClassGroupIds: i,
    sortModifiers: o
  } = t, l = [], u = e.trim().split(Af);
  let c = "";
  for (let d = u.length - 1; d >= 0; d -= 1) {
    const h = u[d], {
      isExternal: m,
      modifiers: f,
      hasImportantModifier: g,
      baseClassName: p,
      maybePostfixModifierPosition: v
    } = r(h);
    if (m) {
      c = h + (c.length > 0 ? " " + c : c);
      continue;
    }
    let b = !!v, w = a(b ? p.substring(0, v) : p);
    if (!w) {
      if (!b) {
        c = h + (c.length > 0 ? " " + c : c);
        continue;
      }
      if (w = a(p), !w) {
        c = h + (c.length > 0 ? " " + c : c);
        continue;
      }
      b = !1;
    }
    const y = o(f).join(":"), k = g ? y + Ho : y, N = k + w;
    if (l.includes(N))
      continue;
    l.push(N);
    const T = i(w, b);
    for (let _ = 0; _ < T.length; ++_) {
      const x = T[_];
      l.push(k + x);
    }
    c = h + (c.length > 0 ? " " + c : c);
  }
  return c;
};
function Mf() {
  let e = 0, t, r, a = "";
  for (; e < arguments.length; )
    (t = arguments[e++]) && (r = ec(t)) && (a && (a += " "), a += r);
  return a;
}
const ec = (e) => {
  if (typeof e == "string")
    return e;
  let t, r = "";
  for (let a = 0; a < e.length; a++)
    e[a] && (t = ec(e[a])) && (r && (r += " "), r += t);
  return r;
};
function If(e, ...t) {
  let r, a, i, o = l;
  function l(c) {
    const d = t.reduce((h, m) => m(h), e());
    return r = Tf(d), a = r.cache.get, i = r.cache.set, o = u, u(c);
  }
  function u(c) {
    const d = a(c);
    if (d)
      return d;
    const h = Df(c, r);
    return i(c, h), h;
  }
  return function() {
    return o(Mf.apply(null, arguments));
  };
}
const rt = (e) => {
  const t = (r) => r[e] || [];
  return t.isThemeGetter = !0, t;
}, tc = /^\[(?:(\w[\w-]*):)?(.+)\]$/i, rc = /^\((?:(\w[\w-]*):)?(.+)\)$/i, Of = /^\d+\/\d+$/, $f = /^(\d+(\.\d+)?)?(xs|sm|md|lg|xl)$/, Lf = /\d+(%|px|r?em|[sdl]?v([hwib]|min|max)|pt|pc|in|cm|mm|cap|ch|ex|r?lh|cq(w|h|i|b|min|max))|\b(calc|min|max|clamp)\(.+\)|^0$/, _f = /^(rgba?|hsla?|hwb|(ok)?(lab|lch))\(.+\)$/, Bf = /^(inset_)?-?((\d+)?\.?(\d+)[a-z]+|0)_-?((\d+)?\.?(\d+)[a-z]+|0)/, Ff = /^(url|image|image-set|cross-fade|element|(repeating-)?(linear|radial|conic)-gradient)\(.+\)$/, Jr = (e) => Of.test(e), Se = (e) => !!e && !Number.isNaN(Number(e)), ur = (e) => !!e && Number.isInteger(Number(e)), So = (e) => e.endsWith("%") && Se(e.slice(0, -1)), tr = (e) => $f.test(e), zf = () => !0, jf = (e) => (
  // `colorFunctionRegex` check is necessary because color functions can have percentages in them which which would be incorrectly classified as lengths.
  // For example, `hsl(0 0% 0%)` would be classified as a length without this check.
  // I could also use lookbehind assertion in `lengthUnitRegex` but that isn't supported widely enough.
  Lf.test(e) && !_f.test(e)
), nc = () => !1, Wf = (e) => Bf.test(e), Uf = (e) => Ff.test(e), Vf = (e) => !ee(e) && !te(e), Hf = (e) => pn(e, ic, nc), ee = (e) => tc.test(e), _r = (e) => pn(e, sc, jf), Eo = (e) => pn(e, Xf, Se), Ms = (e) => pn(e, ac, nc), Gf = (e) => pn(e, oc, Uf), ka = (e) => pn(e, lc, Wf), te = (e) => rc.test(e), Mn = (e) => gn(e, sc), Kf = (e) => gn(e, Qf), Is = (e) => gn(e, ac), Yf = (e) => gn(e, ic), qf = (e) => gn(e, oc), Sa = (e) => gn(e, lc, !0), pn = (e, t, r) => {
  const a = tc.exec(e);
  return a ? a[1] ? t(a[1]) : r(a[2]) : !1;
}, gn = (e, t, r = !1) => {
  const a = rc.exec(e);
  return a ? a[1] ? t(a[1]) : r : !1;
}, ac = (e) => e === "position" || e === "percentage", oc = (e) => e === "image" || e === "url", ic = (e) => e === "length" || e === "size" || e === "bg-size", sc = (e) => e === "length", Xf = (e) => e === "number", Qf = (e) => e === "family-name", lc = (e) => e === "shadow", Jf = () => {
  const e = rt("color"), t = rt("font"), r = rt("text"), a = rt("font-weight"), i = rt("tracking"), o = rt("leading"), l = rt("breakpoint"), u = rt("container"), c = rt("spacing"), d = rt("radius"), h = rt("shadow"), m = rt("inset-shadow"), f = rt("text-shadow"), g = rt("drop-shadow"), p = rt("blur"), v = rt("perspective"), b = rt("aspect"), w = rt("ease"), y = rt("animate"), k = () => ["auto", "avoid", "all", "avoid-page", "page", "left", "right", "column"], N = () => [
    "center",
    "top",
    "bottom",
    "left",
    "right",
    "top-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-top",
    "top-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-top",
    "bottom-right",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "right-bottom",
    "bottom-left",
    // Deprecated since Tailwind CSS v4.1.0, see https://github.com/tailwindlabs/tailwindcss/pull/17378
    "left-bottom"
  ], T = () => [...N(), te, ee], _ = () => ["auto", "hidden", "clip", "visible", "scroll"], x = () => ["auto", "contain", "none"], R = () => [te, ee, c], F = () => [Jr, "full", "auto", ...R()], V = () => [ur, "none", "subgrid", te, ee], E = () => ["auto", {
    span: ["full", ur, te, ee]
  }, ur, te, ee], S = () => [ur, "auto", te, ee], $ = () => ["auto", "min", "max", "fr", te, ee], A = () => ["start", "end", "center", "between", "around", "evenly", "stretch", "baseline", "center-safe", "end-safe"], U = () => ["start", "end", "center", "stretch", "center-safe", "end-safe"], I = () => ["auto", ...R()], Y = () => [Jr, "auto", "full", "dvw", "dvh", "lvw", "lvh", "svw", "svh", "min", "max", "fit", ...R()], D = () => [e, te, ee], J = () => [...N(), Is, Ms, {
    position: [te, ee]
  }], we = () => ["no-repeat", {
    repeat: ["", "x", "y", "space", "round"]
  }], he = () => ["auto", "cover", "contain", Yf, Hf, {
    size: [te, ee]
  }], be = () => [So, Mn, _r], re = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    "full",
    d,
    te,
    ee
  ], pe = () => ["", Se, Mn, _r], Me = () => ["solid", "dashed", "dotted", "double"], Ne = () => ["normal", "multiply", "screen", "overlay", "darken", "lighten", "color-dodge", "color-burn", "hard-light", "soft-light", "difference", "exclusion", "hue", "saturation", "color", "luminosity"], K = () => [Se, So, Is, Ms], ge = () => [
    // Deprecated since Tailwind CSS v4.0.0
    "",
    "none",
    p,
    te,
    ee
  ], L = () => ["none", Se, te, ee], G = () => ["none", Se, te, ee], oe = () => [Se, te, ee], ne = () => [Jr, "full", ...R()];
  return {
    cacheSize: 500,
    theme: {
      animate: ["spin", "ping", "pulse", "bounce"],
      aspect: ["video"],
      blur: [tr],
      breakpoint: [tr],
      color: [zf],
      container: [tr],
      "drop-shadow": [tr],
      ease: ["in", "out", "in-out"],
      font: [Vf],
      "font-weight": ["thin", "extralight", "light", "normal", "medium", "semibold", "bold", "extrabold", "black"],
      "inset-shadow": [tr],
      leading: ["none", "tight", "snug", "normal", "relaxed", "loose"],
      perspective: ["dramatic", "near", "normal", "midrange", "distant", "none"],
      radius: [tr],
      shadow: [tr],
      spacing: ["px", Se],
      text: [tr],
      "text-shadow": [tr],
      tracking: ["tighter", "tight", "normal", "wide", "wider", "widest"]
    },
    classGroups: {
      // --------------
      // --- Layout ---
      // --------------
      /**
       * Aspect Ratio
       * @see https://tailwindcss.com/docs/aspect-ratio
       */
      aspect: [{
        aspect: ["auto", "square", Jr, ee, te, b]
      }],
      /**
       * Container
       * @see https://tailwindcss.com/docs/container
       * @deprecated since Tailwind CSS v4.0.0
       */
      container: ["container"],
      /**
       * Columns
       * @see https://tailwindcss.com/docs/columns
       */
      columns: [{
        columns: [Se, ee, te, u]
      }],
      /**
       * Break After
       * @see https://tailwindcss.com/docs/break-after
       */
      "break-after": [{
        "break-after": k()
      }],
      /**
       * Break Before
       * @see https://tailwindcss.com/docs/break-before
       */
      "break-before": [{
        "break-before": k()
      }],
      /**
       * Break Inside
       * @see https://tailwindcss.com/docs/break-inside
       */
      "break-inside": [{
        "break-inside": ["auto", "avoid", "avoid-page", "avoid-column"]
      }],
      /**
       * Box Decoration Break
       * @see https://tailwindcss.com/docs/box-decoration-break
       */
      "box-decoration": [{
        "box-decoration": ["slice", "clone"]
      }],
      /**
       * Box Sizing
       * @see https://tailwindcss.com/docs/box-sizing
       */
      box: [{
        box: ["border", "content"]
      }],
      /**
       * Display
       * @see https://tailwindcss.com/docs/display
       */
      display: ["block", "inline-block", "inline", "flex", "inline-flex", "table", "inline-table", "table-caption", "table-cell", "table-column", "table-column-group", "table-footer-group", "table-header-group", "table-row-group", "table-row", "flow-root", "grid", "inline-grid", "contents", "list-item", "hidden"],
      /**
       * Screen Reader Only
       * @see https://tailwindcss.com/docs/display#screen-reader-only
       */
      sr: ["sr-only", "not-sr-only"],
      /**
       * Floats
       * @see https://tailwindcss.com/docs/float
       */
      float: [{
        float: ["right", "left", "none", "start", "end"]
      }],
      /**
       * Clear
       * @see https://tailwindcss.com/docs/clear
       */
      clear: [{
        clear: ["left", "right", "both", "none", "start", "end"]
      }],
      /**
       * Isolation
       * @see https://tailwindcss.com/docs/isolation
       */
      isolation: ["isolate", "isolation-auto"],
      /**
       * Object Fit
       * @see https://tailwindcss.com/docs/object-fit
       */
      "object-fit": [{
        object: ["contain", "cover", "fill", "none", "scale-down"]
      }],
      /**
       * Object Position
       * @see https://tailwindcss.com/docs/object-position
       */
      "object-position": [{
        object: T()
      }],
      /**
       * Overflow
       * @see https://tailwindcss.com/docs/overflow
       */
      overflow: [{
        overflow: _()
      }],
      /**
       * Overflow X
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-x": [{
        "overflow-x": _()
      }],
      /**
       * Overflow Y
       * @see https://tailwindcss.com/docs/overflow
       */
      "overflow-y": [{
        "overflow-y": _()
      }],
      /**
       * Overscroll Behavior
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      overscroll: [{
        overscroll: x()
      }],
      /**
       * Overscroll Behavior X
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-x": [{
        "overscroll-x": x()
      }],
      /**
       * Overscroll Behavior Y
       * @see https://tailwindcss.com/docs/overscroll-behavior
       */
      "overscroll-y": [{
        "overscroll-y": x()
      }],
      /**
       * Position
       * @see https://tailwindcss.com/docs/position
       */
      position: ["static", "fixed", "absolute", "relative", "sticky"],
      /**
       * Top / Right / Bottom / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      inset: [{
        inset: F()
      }],
      /**
       * Right / Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-x": [{
        "inset-x": F()
      }],
      /**
       * Top / Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      "inset-y": [{
        "inset-y": F()
      }],
      /**
       * Start
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      start: [{
        start: F()
      }],
      /**
       * End
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      end: [{
        end: F()
      }],
      /**
       * Top
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      top: [{
        top: F()
      }],
      /**
       * Right
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      right: [{
        right: F()
      }],
      /**
       * Bottom
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      bottom: [{
        bottom: F()
      }],
      /**
       * Left
       * @see https://tailwindcss.com/docs/top-right-bottom-left
       */
      left: [{
        left: F()
      }],
      /**
       * Visibility
       * @see https://tailwindcss.com/docs/visibility
       */
      visibility: ["visible", "invisible", "collapse"],
      /**
       * Z-Index
       * @see https://tailwindcss.com/docs/z-index
       */
      z: [{
        z: [ur, "auto", te, ee]
      }],
      // ------------------------
      // --- Flexbox and Grid ---
      // ------------------------
      /**
       * Flex Basis
       * @see https://tailwindcss.com/docs/flex-basis
       */
      basis: [{
        basis: [Jr, "full", "auto", u, ...R()]
      }],
      /**
       * Flex Direction
       * @see https://tailwindcss.com/docs/flex-direction
       */
      "flex-direction": [{
        flex: ["row", "row-reverse", "col", "col-reverse"]
      }],
      /**
       * Flex Wrap
       * @see https://tailwindcss.com/docs/flex-wrap
       */
      "flex-wrap": [{
        flex: ["nowrap", "wrap", "wrap-reverse"]
      }],
      /**
       * Flex
       * @see https://tailwindcss.com/docs/flex
       */
      flex: [{
        flex: [Se, Jr, "auto", "initial", "none", ee]
      }],
      /**
       * Flex Grow
       * @see https://tailwindcss.com/docs/flex-grow
       */
      grow: [{
        grow: ["", Se, te, ee]
      }],
      /**
       * Flex Shrink
       * @see https://tailwindcss.com/docs/flex-shrink
       */
      shrink: [{
        shrink: ["", Se, te, ee]
      }],
      /**
       * Order
       * @see https://tailwindcss.com/docs/order
       */
      order: [{
        order: [ur, "first", "last", "none", te, ee]
      }],
      /**
       * Grid Template Columns
       * @see https://tailwindcss.com/docs/grid-template-columns
       */
      "grid-cols": [{
        "grid-cols": V()
      }],
      /**
       * Grid Column Start / End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start-end": [{
        col: E()
      }],
      /**
       * Grid Column Start
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-start": [{
        "col-start": S()
      }],
      /**
       * Grid Column End
       * @see https://tailwindcss.com/docs/grid-column
       */
      "col-end": [{
        "col-end": S()
      }],
      /**
       * Grid Template Rows
       * @see https://tailwindcss.com/docs/grid-template-rows
       */
      "grid-rows": [{
        "grid-rows": V()
      }],
      /**
       * Grid Row Start / End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start-end": [{
        row: E()
      }],
      /**
       * Grid Row Start
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-start": [{
        "row-start": S()
      }],
      /**
       * Grid Row End
       * @see https://tailwindcss.com/docs/grid-row
       */
      "row-end": [{
        "row-end": S()
      }],
      /**
       * Grid Auto Flow
       * @see https://tailwindcss.com/docs/grid-auto-flow
       */
      "grid-flow": [{
        "grid-flow": ["row", "col", "dense", "row-dense", "col-dense"]
      }],
      /**
       * Grid Auto Columns
       * @see https://tailwindcss.com/docs/grid-auto-columns
       */
      "auto-cols": [{
        "auto-cols": $()
      }],
      /**
       * Grid Auto Rows
       * @see https://tailwindcss.com/docs/grid-auto-rows
       */
      "auto-rows": [{
        "auto-rows": $()
      }],
      /**
       * Gap
       * @see https://tailwindcss.com/docs/gap
       */
      gap: [{
        gap: R()
      }],
      /**
       * Gap X
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-x": [{
        "gap-x": R()
      }],
      /**
       * Gap Y
       * @see https://tailwindcss.com/docs/gap
       */
      "gap-y": [{
        "gap-y": R()
      }],
      /**
       * Justify Content
       * @see https://tailwindcss.com/docs/justify-content
       */
      "justify-content": [{
        justify: [...A(), "normal"]
      }],
      /**
       * Justify Items
       * @see https://tailwindcss.com/docs/justify-items
       */
      "justify-items": [{
        "justify-items": [...U(), "normal"]
      }],
      /**
       * Justify Self
       * @see https://tailwindcss.com/docs/justify-self
       */
      "justify-self": [{
        "justify-self": ["auto", ...U()]
      }],
      /**
       * Align Content
       * @see https://tailwindcss.com/docs/align-content
       */
      "align-content": [{
        content: ["normal", ...A()]
      }],
      /**
       * Align Items
       * @see https://tailwindcss.com/docs/align-items
       */
      "align-items": [{
        items: [...U(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Align Self
       * @see https://tailwindcss.com/docs/align-self
       */
      "align-self": [{
        self: ["auto", ...U(), {
          baseline: ["", "last"]
        }]
      }],
      /**
       * Place Content
       * @see https://tailwindcss.com/docs/place-content
       */
      "place-content": [{
        "place-content": A()
      }],
      /**
       * Place Items
       * @see https://tailwindcss.com/docs/place-items
       */
      "place-items": [{
        "place-items": [...U(), "baseline"]
      }],
      /**
       * Place Self
       * @see https://tailwindcss.com/docs/place-self
       */
      "place-self": [{
        "place-self": ["auto", ...U()]
      }],
      // Spacing
      /**
       * Padding
       * @see https://tailwindcss.com/docs/padding
       */
      p: [{
        p: R()
      }],
      /**
       * Padding X
       * @see https://tailwindcss.com/docs/padding
       */
      px: [{
        px: R()
      }],
      /**
       * Padding Y
       * @see https://tailwindcss.com/docs/padding
       */
      py: [{
        py: R()
      }],
      /**
       * Padding Start
       * @see https://tailwindcss.com/docs/padding
       */
      ps: [{
        ps: R()
      }],
      /**
       * Padding End
       * @see https://tailwindcss.com/docs/padding
       */
      pe: [{
        pe: R()
      }],
      /**
       * Padding Top
       * @see https://tailwindcss.com/docs/padding
       */
      pt: [{
        pt: R()
      }],
      /**
       * Padding Right
       * @see https://tailwindcss.com/docs/padding
       */
      pr: [{
        pr: R()
      }],
      /**
       * Padding Bottom
       * @see https://tailwindcss.com/docs/padding
       */
      pb: [{
        pb: R()
      }],
      /**
       * Padding Left
       * @see https://tailwindcss.com/docs/padding
       */
      pl: [{
        pl: R()
      }],
      /**
       * Margin
       * @see https://tailwindcss.com/docs/margin
       */
      m: [{
        m: I()
      }],
      /**
       * Margin X
       * @see https://tailwindcss.com/docs/margin
       */
      mx: [{
        mx: I()
      }],
      /**
       * Margin Y
       * @see https://tailwindcss.com/docs/margin
       */
      my: [{
        my: I()
      }],
      /**
       * Margin Start
       * @see https://tailwindcss.com/docs/margin
       */
      ms: [{
        ms: I()
      }],
      /**
       * Margin End
       * @see https://tailwindcss.com/docs/margin
       */
      me: [{
        me: I()
      }],
      /**
       * Margin Top
       * @see https://tailwindcss.com/docs/margin
       */
      mt: [{
        mt: I()
      }],
      /**
       * Margin Right
       * @see https://tailwindcss.com/docs/margin
       */
      mr: [{
        mr: I()
      }],
      /**
       * Margin Bottom
       * @see https://tailwindcss.com/docs/margin
       */
      mb: [{
        mb: I()
      }],
      /**
       * Margin Left
       * @see https://tailwindcss.com/docs/margin
       */
      ml: [{
        ml: I()
      }],
      /**
       * Space Between X
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x": [{
        "space-x": R()
      }],
      /**
       * Space Between X Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-x-reverse": ["space-x-reverse"],
      /**
       * Space Between Y
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y": [{
        "space-y": R()
      }],
      /**
       * Space Between Y Reverse
       * @see https://tailwindcss.com/docs/margin#adding-space-between-children
       */
      "space-y-reverse": ["space-y-reverse"],
      // --------------
      // --- Sizing ---
      // --------------
      /**
       * Size
       * @see https://tailwindcss.com/docs/width#setting-both-width-and-height
       */
      size: [{
        size: Y()
      }],
      /**
       * Width
       * @see https://tailwindcss.com/docs/width
       */
      w: [{
        w: [u, "screen", ...Y()]
      }],
      /**
       * Min-Width
       * @see https://tailwindcss.com/docs/min-width
       */
      "min-w": [{
        "min-w": [
          u,
          "screen",
          /** Deprecated. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "none",
          ...Y()
        ]
      }],
      /**
       * Max-Width
       * @see https://tailwindcss.com/docs/max-width
       */
      "max-w": [{
        "max-w": [
          u,
          "screen",
          "none",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          "prose",
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          {
            screen: [l]
          },
          ...Y()
        ]
      }],
      /**
       * Height
       * @see https://tailwindcss.com/docs/height
       */
      h: [{
        h: ["screen", ...Y()]
      }],
      /**
       * Min-Height
       * @see https://tailwindcss.com/docs/min-height
       */
      "min-h": [{
        "min-h": ["screen", "none", ...Y()]
      }],
      /**
       * Max-Height
       * @see https://tailwindcss.com/docs/max-height
       */
      "max-h": [{
        "max-h": ["screen", ...Y()]
      }],
      // ------------------
      // --- Typography ---
      // ------------------
      /**
       * Font Size
       * @see https://tailwindcss.com/docs/font-size
       */
      "font-size": [{
        text: ["base", r, Mn, _r]
      }],
      /**
       * Font Smoothing
       * @see https://tailwindcss.com/docs/font-smoothing
       */
      "font-smoothing": ["antialiased", "subpixel-antialiased"],
      /**
       * Font Style
       * @see https://tailwindcss.com/docs/font-style
       */
      "font-style": ["italic", "not-italic"],
      /**
       * Font Weight
       * @see https://tailwindcss.com/docs/font-weight
       */
      "font-weight": [{
        font: [a, te, Eo]
      }],
      /**
       * Font Stretch
       * @see https://tailwindcss.com/docs/font-stretch
       */
      "font-stretch": [{
        "font-stretch": ["ultra-condensed", "extra-condensed", "condensed", "semi-condensed", "normal", "semi-expanded", "expanded", "extra-expanded", "ultra-expanded", So, ee]
      }],
      /**
       * Font Family
       * @see https://tailwindcss.com/docs/font-family
       */
      "font-family": [{
        font: [Kf, ee, t]
      }],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-normal": ["normal-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-ordinal": ["ordinal"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-slashed-zero": ["slashed-zero"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-figure": ["lining-nums", "oldstyle-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-spacing": ["proportional-nums", "tabular-nums"],
      /**
       * Font Variant Numeric
       * @see https://tailwindcss.com/docs/font-variant-numeric
       */
      "fvn-fraction": ["diagonal-fractions", "stacked-fractions"],
      /**
       * Letter Spacing
       * @see https://tailwindcss.com/docs/letter-spacing
       */
      tracking: [{
        tracking: [i, te, ee]
      }],
      /**
       * Line Clamp
       * @see https://tailwindcss.com/docs/line-clamp
       */
      "line-clamp": [{
        "line-clamp": [Se, "none", te, Eo]
      }],
      /**
       * Line Height
       * @see https://tailwindcss.com/docs/line-height
       */
      leading: [{
        leading: [
          /** Deprecated since Tailwind CSS v4.0.0. @see https://github.com/tailwindlabs/tailwindcss.com/issues/2027#issuecomment-2620152757 */
          o,
          ...R()
        ]
      }],
      /**
       * List Style Image
       * @see https://tailwindcss.com/docs/list-style-image
       */
      "list-image": [{
        "list-image": ["none", te, ee]
      }],
      /**
       * List Style Position
       * @see https://tailwindcss.com/docs/list-style-position
       */
      "list-style-position": [{
        list: ["inside", "outside"]
      }],
      /**
       * List Style Type
       * @see https://tailwindcss.com/docs/list-style-type
       */
      "list-style-type": [{
        list: ["disc", "decimal", "none", te, ee]
      }],
      /**
       * Text Alignment
       * @see https://tailwindcss.com/docs/text-align
       */
      "text-alignment": [{
        text: ["left", "center", "right", "justify", "start", "end"]
      }],
      /**
       * Placeholder Color
       * @deprecated since Tailwind CSS v3.0.0
       * @see https://v3.tailwindcss.com/docs/placeholder-color
       */
      "placeholder-color": [{
        placeholder: D()
      }],
      /**
       * Text Color
       * @see https://tailwindcss.com/docs/text-color
       */
      "text-color": [{
        text: D()
      }],
      /**
       * Text Decoration
       * @see https://tailwindcss.com/docs/text-decoration
       */
      "text-decoration": ["underline", "overline", "line-through", "no-underline"],
      /**
       * Text Decoration Style
       * @see https://tailwindcss.com/docs/text-decoration-style
       */
      "text-decoration-style": [{
        decoration: [...Me(), "wavy"]
      }],
      /**
       * Text Decoration Thickness
       * @see https://tailwindcss.com/docs/text-decoration-thickness
       */
      "text-decoration-thickness": [{
        decoration: [Se, "from-font", "auto", te, _r]
      }],
      /**
       * Text Decoration Color
       * @see https://tailwindcss.com/docs/text-decoration-color
       */
      "text-decoration-color": [{
        decoration: D()
      }],
      /**
       * Text Underline Offset
       * @see https://tailwindcss.com/docs/text-underline-offset
       */
      "underline-offset": [{
        "underline-offset": [Se, "auto", te, ee]
      }],
      /**
       * Text Transform
       * @see https://tailwindcss.com/docs/text-transform
       */
      "text-transform": ["uppercase", "lowercase", "capitalize", "normal-case"],
      /**
       * Text Overflow
       * @see https://tailwindcss.com/docs/text-overflow
       */
      "text-overflow": ["truncate", "text-ellipsis", "text-clip"],
      /**
       * Text Wrap
       * @see https://tailwindcss.com/docs/text-wrap
       */
      "text-wrap": [{
        text: ["wrap", "nowrap", "balance", "pretty"]
      }],
      /**
       * Text Indent
       * @see https://tailwindcss.com/docs/text-indent
       */
      indent: [{
        indent: R()
      }],
      /**
       * Vertical Alignment
       * @see https://tailwindcss.com/docs/vertical-align
       */
      "vertical-align": [{
        align: ["baseline", "top", "middle", "bottom", "text-top", "text-bottom", "sub", "super", te, ee]
      }],
      /**
       * Whitespace
       * @see https://tailwindcss.com/docs/whitespace
       */
      whitespace: [{
        whitespace: ["normal", "nowrap", "pre", "pre-line", "pre-wrap", "break-spaces"]
      }],
      /**
       * Word Break
       * @see https://tailwindcss.com/docs/word-break
       */
      break: [{
        break: ["normal", "words", "all", "keep"]
      }],
      /**
       * Overflow Wrap
       * @see https://tailwindcss.com/docs/overflow-wrap
       */
      wrap: [{
        wrap: ["break-word", "anywhere", "normal"]
      }],
      /**
       * Hyphens
       * @see https://tailwindcss.com/docs/hyphens
       */
      hyphens: [{
        hyphens: ["none", "manual", "auto"]
      }],
      /**
       * Content
       * @see https://tailwindcss.com/docs/content
       */
      content: [{
        content: ["none", te, ee]
      }],
      // -------------------
      // --- Backgrounds ---
      // -------------------
      /**
       * Background Attachment
       * @see https://tailwindcss.com/docs/background-attachment
       */
      "bg-attachment": [{
        bg: ["fixed", "local", "scroll"]
      }],
      /**
       * Background Clip
       * @see https://tailwindcss.com/docs/background-clip
       */
      "bg-clip": [{
        "bg-clip": ["border", "padding", "content", "text"]
      }],
      /**
       * Background Origin
       * @see https://tailwindcss.com/docs/background-origin
       */
      "bg-origin": [{
        "bg-origin": ["border", "padding", "content"]
      }],
      /**
       * Background Position
       * @see https://tailwindcss.com/docs/background-position
       */
      "bg-position": [{
        bg: J()
      }],
      /**
       * Background Repeat
       * @see https://tailwindcss.com/docs/background-repeat
       */
      "bg-repeat": [{
        bg: we()
      }],
      /**
       * Background Size
       * @see https://tailwindcss.com/docs/background-size
       */
      "bg-size": [{
        bg: he()
      }],
      /**
       * Background Image
       * @see https://tailwindcss.com/docs/background-image
       */
      "bg-image": [{
        bg: ["none", {
          linear: [{
            to: ["t", "tr", "r", "br", "b", "bl", "l", "tl"]
          }, ur, te, ee],
          radial: ["", te, ee],
          conic: [ur, te, ee]
        }, qf, Gf]
      }],
      /**
       * Background Color
       * @see https://tailwindcss.com/docs/background-color
       */
      "bg-color": [{
        bg: D()
      }],
      /**
       * Gradient Color Stops From Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from-pos": [{
        from: be()
      }],
      /**
       * Gradient Color Stops Via Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via-pos": [{
        via: be()
      }],
      /**
       * Gradient Color Stops To Position
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to-pos": [{
        to: be()
      }],
      /**
       * Gradient Color Stops From
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-from": [{
        from: D()
      }],
      /**
       * Gradient Color Stops Via
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-via": [{
        via: D()
      }],
      /**
       * Gradient Color Stops To
       * @see https://tailwindcss.com/docs/gradient-color-stops
       */
      "gradient-to": [{
        to: D()
      }],
      // ---------------
      // --- Borders ---
      // ---------------
      /**
       * Border Radius
       * @see https://tailwindcss.com/docs/border-radius
       */
      rounded: [{
        rounded: re()
      }],
      /**
       * Border Radius Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-s": [{
        "rounded-s": re()
      }],
      /**
       * Border Radius End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-e": [{
        "rounded-e": re()
      }],
      /**
       * Border Radius Top
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-t": [{
        "rounded-t": re()
      }],
      /**
       * Border Radius Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-r": [{
        "rounded-r": re()
      }],
      /**
       * Border Radius Bottom
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-b": [{
        "rounded-b": re()
      }],
      /**
       * Border Radius Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-l": [{
        "rounded-l": re()
      }],
      /**
       * Border Radius Start Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ss": [{
        "rounded-ss": re()
      }],
      /**
       * Border Radius Start End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-se": [{
        "rounded-se": re()
      }],
      /**
       * Border Radius End End
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-ee": [{
        "rounded-ee": re()
      }],
      /**
       * Border Radius End Start
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-es": [{
        "rounded-es": re()
      }],
      /**
       * Border Radius Top Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tl": [{
        "rounded-tl": re()
      }],
      /**
       * Border Radius Top Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-tr": [{
        "rounded-tr": re()
      }],
      /**
       * Border Radius Bottom Right
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-br": [{
        "rounded-br": re()
      }],
      /**
       * Border Radius Bottom Left
       * @see https://tailwindcss.com/docs/border-radius
       */
      "rounded-bl": [{
        "rounded-bl": re()
      }],
      /**
       * Border Width
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w": [{
        border: pe()
      }],
      /**
       * Border Width X
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-x": [{
        "border-x": pe()
      }],
      /**
       * Border Width Y
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-y": [{
        "border-y": pe()
      }],
      /**
       * Border Width Start
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-s": [{
        "border-s": pe()
      }],
      /**
       * Border Width End
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-e": [{
        "border-e": pe()
      }],
      /**
       * Border Width Top
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-t": [{
        "border-t": pe()
      }],
      /**
       * Border Width Right
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-r": [{
        "border-r": pe()
      }],
      /**
       * Border Width Bottom
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-b": [{
        "border-b": pe()
      }],
      /**
       * Border Width Left
       * @see https://tailwindcss.com/docs/border-width
       */
      "border-w-l": [{
        "border-l": pe()
      }],
      /**
       * Divide Width X
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x": [{
        "divide-x": pe()
      }],
      /**
       * Divide Width X Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-x-reverse": ["divide-x-reverse"],
      /**
       * Divide Width Y
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y": [{
        "divide-y": pe()
      }],
      /**
       * Divide Width Y Reverse
       * @see https://tailwindcss.com/docs/border-width#between-children
       */
      "divide-y-reverse": ["divide-y-reverse"],
      /**
       * Border Style
       * @see https://tailwindcss.com/docs/border-style
       */
      "border-style": [{
        border: [...Me(), "hidden", "none"]
      }],
      /**
       * Divide Style
       * @see https://tailwindcss.com/docs/border-style#setting-the-divider-style
       */
      "divide-style": [{
        divide: [...Me(), "hidden", "none"]
      }],
      /**
       * Border Color
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color": [{
        border: D()
      }],
      /**
       * Border Color X
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-x": [{
        "border-x": D()
      }],
      /**
       * Border Color Y
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-y": [{
        "border-y": D()
      }],
      /**
       * Border Color S
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-s": [{
        "border-s": D()
      }],
      /**
       * Border Color E
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-e": [{
        "border-e": D()
      }],
      /**
       * Border Color Top
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-t": [{
        "border-t": D()
      }],
      /**
       * Border Color Right
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-r": [{
        "border-r": D()
      }],
      /**
       * Border Color Bottom
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-b": [{
        "border-b": D()
      }],
      /**
       * Border Color Left
       * @see https://tailwindcss.com/docs/border-color
       */
      "border-color-l": [{
        "border-l": D()
      }],
      /**
       * Divide Color
       * @see https://tailwindcss.com/docs/divide-color
       */
      "divide-color": [{
        divide: D()
      }],
      /**
       * Outline Style
       * @see https://tailwindcss.com/docs/outline-style
       */
      "outline-style": [{
        outline: [...Me(), "none", "hidden"]
      }],
      /**
       * Outline Offset
       * @see https://tailwindcss.com/docs/outline-offset
       */
      "outline-offset": [{
        "outline-offset": [Se, te, ee]
      }],
      /**
       * Outline Width
       * @see https://tailwindcss.com/docs/outline-width
       */
      "outline-w": [{
        outline: ["", Se, Mn, _r]
      }],
      /**
       * Outline Color
       * @see https://tailwindcss.com/docs/outline-color
       */
      "outline-color": [{
        outline: D()
      }],
      // ---------------
      // --- Effects ---
      // ---------------
      /**
       * Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow
       */
      shadow: [{
        shadow: [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          h,
          Sa,
          ka
        ]
      }],
      /**
       * Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-shadow-color
       */
      "shadow-color": [{
        shadow: D()
      }],
      /**
       * Inset Box Shadow
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-shadow
       */
      "inset-shadow": [{
        "inset-shadow": ["none", m, Sa, ka]
      }],
      /**
       * Inset Box Shadow Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-shadow-color
       */
      "inset-shadow-color": [{
        "inset-shadow": D()
      }],
      /**
       * Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-a-ring
       */
      "ring-w": [{
        ring: pe()
      }],
      /**
       * Ring Width Inset
       * @see https://v3.tailwindcss.com/docs/ring-width#inset-rings
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-w-inset": ["ring-inset"],
      /**
       * Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-ring-color
       */
      "ring-color": [{
        ring: D()
      }],
      /**
       * Ring Offset Width
       * @see https://v3.tailwindcss.com/docs/ring-offset-width
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-w": [{
        "ring-offset": [Se, _r]
      }],
      /**
       * Ring Offset Color
       * @see https://v3.tailwindcss.com/docs/ring-offset-color
       * @deprecated since Tailwind CSS v4.0.0
       * @see https://github.com/tailwindlabs/tailwindcss/blob/v4.0.0/packages/tailwindcss/src/utilities.ts#L4158
       */
      "ring-offset-color": [{
        "ring-offset": D()
      }],
      /**
       * Inset Ring Width
       * @see https://tailwindcss.com/docs/box-shadow#adding-an-inset-ring
       */
      "inset-ring-w": [{
        "inset-ring": pe()
      }],
      /**
       * Inset Ring Color
       * @see https://tailwindcss.com/docs/box-shadow#setting-the-inset-ring-color
       */
      "inset-ring-color": [{
        "inset-ring": D()
      }],
      /**
       * Text Shadow
       * @see https://tailwindcss.com/docs/text-shadow
       */
      "text-shadow": [{
        "text-shadow": ["none", f, Sa, ka]
      }],
      /**
       * Text Shadow Color
       * @see https://tailwindcss.com/docs/text-shadow#setting-the-shadow-color
       */
      "text-shadow-color": [{
        "text-shadow": D()
      }],
      /**
       * Opacity
       * @see https://tailwindcss.com/docs/opacity
       */
      opacity: [{
        opacity: [Se, te, ee]
      }],
      /**
       * Mix Blend Mode
       * @see https://tailwindcss.com/docs/mix-blend-mode
       */
      "mix-blend": [{
        "mix-blend": [...Ne(), "plus-darker", "plus-lighter"]
      }],
      /**
       * Background Blend Mode
       * @see https://tailwindcss.com/docs/background-blend-mode
       */
      "bg-blend": [{
        "bg-blend": Ne()
      }],
      /**
       * Mask Clip
       * @see https://tailwindcss.com/docs/mask-clip
       */
      "mask-clip": [{
        "mask-clip": ["border", "padding", "content", "fill", "stroke", "view"]
      }, "mask-no-clip"],
      /**
       * Mask Composite
       * @see https://tailwindcss.com/docs/mask-composite
       */
      "mask-composite": [{
        mask: ["add", "subtract", "intersect", "exclude"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image-linear-pos": [{
        "mask-linear": [Se]
      }],
      "mask-image-linear-from-pos": [{
        "mask-linear-from": K()
      }],
      "mask-image-linear-to-pos": [{
        "mask-linear-to": K()
      }],
      "mask-image-linear-from-color": [{
        "mask-linear-from": D()
      }],
      "mask-image-linear-to-color": [{
        "mask-linear-to": D()
      }],
      "mask-image-t-from-pos": [{
        "mask-t-from": K()
      }],
      "mask-image-t-to-pos": [{
        "mask-t-to": K()
      }],
      "mask-image-t-from-color": [{
        "mask-t-from": D()
      }],
      "mask-image-t-to-color": [{
        "mask-t-to": D()
      }],
      "mask-image-r-from-pos": [{
        "mask-r-from": K()
      }],
      "mask-image-r-to-pos": [{
        "mask-r-to": K()
      }],
      "mask-image-r-from-color": [{
        "mask-r-from": D()
      }],
      "mask-image-r-to-color": [{
        "mask-r-to": D()
      }],
      "mask-image-b-from-pos": [{
        "mask-b-from": K()
      }],
      "mask-image-b-to-pos": [{
        "mask-b-to": K()
      }],
      "mask-image-b-from-color": [{
        "mask-b-from": D()
      }],
      "mask-image-b-to-color": [{
        "mask-b-to": D()
      }],
      "mask-image-l-from-pos": [{
        "mask-l-from": K()
      }],
      "mask-image-l-to-pos": [{
        "mask-l-to": K()
      }],
      "mask-image-l-from-color": [{
        "mask-l-from": D()
      }],
      "mask-image-l-to-color": [{
        "mask-l-to": D()
      }],
      "mask-image-x-from-pos": [{
        "mask-x-from": K()
      }],
      "mask-image-x-to-pos": [{
        "mask-x-to": K()
      }],
      "mask-image-x-from-color": [{
        "mask-x-from": D()
      }],
      "mask-image-x-to-color": [{
        "mask-x-to": D()
      }],
      "mask-image-y-from-pos": [{
        "mask-y-from": K()
      }],
      "mask-image-y-to-pos": [{
        "mask-y-to": K()
      }],
      "mask-image-y-from-color": [{
        "mask-y-from": D()
      }],
      "mask-image-y-to-color": [{
        "mask-y-to": D()
      }],
      "mask-image-radial": [{
        "mask-radial": [te, ee]
      }],
      "mask-image-radial-from-pos": [{
        "mask-radial-from": K()
      }],
      "mask-image-radial-to-pos": [{
        "mask-radial-to": K()
      }],
      "mask-image-radial-from-color": [{
        "mask-radial-from": D()
      }],
      "mask-image-radial-to-color": [{
        "mask-radial-to": D()
      }],
      "mask-image-radial-shape": [{
        "mask-radial": ["circle", "ellipse"]
      }],
      "mask-image-radial-size": [{
        "mask-radial": [{
          closest: ["side", "corner"],
          farthest: ["side", "corner"]
        }]
      }],
      "mask-image-radial-pos": [{
        "mask-radial-at": N()
      }],
      "mask-image-conic-pos": [{
        "mask-conic": [Se]
      }],
      "mask-image-conic-from-pos": [{
        "mask-conic-from": K()
      }],
      "mask-image-conic-to-pos": [{
        "mask-conic-to": K()
      }],
      "mask-image-conic-from-color": [{
        "mask-conic-from": D()
      }],
      "mask-image-conic-to-color": [{
        "mask-conic-to": D()
      }],
      /**
       * Mask Mode
       * @see https://tailwindcss.com/docs/mask-mode
       */
      "mask-mode": [{
        mask: ["alpha", "luminance", "match"]
      }],
      /**
       * Mask Origin
       * @see https://tailwindcss.com/docs/mask-origin
       */
      "mask-origin": [{
        "mask-origin": ["border", "padding", "content", "fill", "stroke", "view"]
      }],
      /**
       * Mask Position
       * @see https://tailwindcss.com/docs/mask-position
       */
      "mask-position": [{
        mask: J()
      }],
      /**
       * Mask Repeat
       * @see https://tailwindcss.com/docs/mask-repeat
       */
      "mask-repeat": [{
        mask: we()
      }],
      /**
       * Mask Size
       * @see https://tailwindcss.com/docs/mask-size
       */
      "mask-size": [{
        mask: he()
      }],
      /**
       * Mask Type
       * @see https://tailwindcss.com/docs/mask-type
       */
      "mask-type": [{
        "mask-type": ["alpha", "luminance"]
      }],
      /**
       * Mask Image
       * @see https://tailwindcss.com/docs/mask-image
       */
      "mask-image": [{
        mask: ["none", te, ee]
      }],
      // ---------------
      // --- Filters ---
      // ---------------
      /**
       * Filter
       * @see https://tailwindcss.com/docs/filter
       */
      filter: [{
        filter: [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          te,
          ee
        ]
      }],
      /**
       * Blur
       * @see https://tailwindcss.com/docs/blur
       */
      blur: [{
        blur: ge()
      }],
      /**
       * Brightness
       * @see https://tailwindcss.com/docs/brightness
       */
      brightness: [{
        brightness: [Se, te, ee]
      }],
      /**
       * Contrast
       * @see https://tailwindcss.com/docs/contrast
       */
      contrast: [{
        contrast: [Se, te, ee]
      }],
      /**
       * Drop Shadow
       * @see https://tailwindcss.com/docs/drop-shadow
       */
      "drop-shadow": [{
        "drop-shadow": [
          // Deprecated since Tailwind CSS v4.0.0
          "",
          "none",
          g,
          Sa,
          ka
        ]
      }],
      /**
       * Drop Shadow Color
       * @see https://tailwindcss.com/docs/filter-drop-shadow#setting-the-shadow-color
       */
      "drop-shadow-color": [{
        "drop-shadow": D()
      }],
      /**
       * Grayscale
       * @see https://tailwindcss.com/docs/grayscale
       */
      grayscale: [{
        grayscale: ["", Se, te, ee]
      }],
      /**
       * Hue Rotate
       * @see https://tailwindcss.com/docs/hue-rotate
       */
      "hue-rotate": [{
        "hue-rotate": [Se, te, ee]
      }],
      /**
       * Invert
       * @see https://tailwindcss.com/docs/invert
       */
      invert: [{
        invert: ["", Se, te, ee]
      }],
      /**
       * Saturate
       * @see https://tailwindcss.com/docs/saturate
       */
      saturate: [{
        saturate: [Se, te, ee]
      }],
      /**
       * Sepia
       * @see https://tailwindcss.com/docs/sepia
       */
      sepia: [{
        sepia: ["", Se, te, ee]
      }],
      /**
       * Backdrop Filter
       * @see https://tailwindcss.com/docs/backdrop-filter
       */
      "backdrop-filter": [{
        "backdrop-filter": [
          // Deprecated since Tailwind CSS v3.0.0
          "",
          "none",
          te,
          ee
        ]
      }],
      /**
       * Backdrop Blur
       * @see https://tailwindcss.com/docs/backdrop-blur
       */
      "backdrop-blur": [{
        "backdrop-blur": ge()
      }],
      /**
       * Backdrop Brightness
       * @see https://tailwindcss.com/docs/backdrop-brightness
       */
      "backdrop-brightness": [{
        "backdrop-brightness": [Se, te, ee]
      }],
      /**
       * Backdrop Contrast
       * @see https://tailwindcss.com/docs/backdrop-contrast
       */
      "backdrop-contrast": [{
        "backdrop-contrast": [Se, te, ee]
      }],
      /**
       * Backdrop Grayscale
       * @see https://tailwindcss.com/docs/backdrop-grayscale
       */
      "backdrop-grayscale": [{
        "backdrop-grayscale": ["", Se, te, ee]
      }],
      /**
       * Backdrop Hue Rotate
       * @see https://tailwindcss.com/docs/backdrop-hue-rotate
       */
      "backdrop-hue-rotate": [{
        "backdrop-hue-rotate": [Se, te, ee]
      }],
      /**
       * Backdrop Invert
       * @see https://tailwindcss.com/docs/backdrop-invert
       */
      "backdrop-invert": [{
        "backdrop-invert": ["", Se, te, ee]
      }],
      /**
       * Backdrop Opacity
       * @see https://tailwindcss.com/docs/backdrop-opacity
       */
      "backdrop-opacity": [{
        "backdrop-opacity": [Se, te, ee]
      }],
      /**
       * Backdrop Saturate
       * @see https://tailwindcss.com/docs/backdrop-saturate
       */
      "backdrop-saturate": [{
        "backdrop-saturate": [Se, te, ee]
      }],
      /**
       * Backdrop Sepia
       * @see https://tailwindcss.com/docs/backdrop-sepia
       */
      "backdrop-sepia": [{
        "backdrop-sepia": ["", Se, te, ee]
      }],
      // --------------
      // --- Tables ---
      // --------------
      /**
       * Border Collapse
       * @see https://tailwindcss.com/docs/border-collapse
       */
      "border-collapse": [{
        border: ["collapse", "separate"]
      }],
      /**
       * Border Spacing
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing": [{
        "border-spacing": R()
      }],
      /**
       * Border Spacing X
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-x": [{
        "border-spacing-x": R()
      }],
      /**
       * Border Spacing Y
       * @see https://tailwindcss.com/docs/border-spacing
       */
      "border-spacing-y": [{
        "border-spacing-y": R()
      }],
      /**
       * Table Layout
       * @see https://tailwindcss.com/docs/table-layout
       */
      "table-layout": [{
        table: ["auto", "fixed"]
      }],
      /**
       * Caption Side
       * @see https://tailwindcss.com/docs/caption-side
       */
      caption: [{
        caption: ["top", "bottom"]
      }],
      // ---------------------------------
      // --- Transitions and Animation ---
      // ---------------------------------
      /**
       * Transition Property
       * @see https://tailwindcss.com/docs/transition-property
       */
      transition: [{
        transition: ["", "all", "colors", "opacity", "shadow", "transform", "none", te, ee]
      }],
      /**
       * Transition Behavior
       * @see https://tailwindcss.com/docs/transition-behavior
       */
      "transition-behavior": [{
        transition: ["normal", "discrete"]
      }],
      /**
       * Transition Duration
       * @see https://tailwindcss.com/docs/transition-duration
       */
      duration: [{
        duration: [Se, "initial", te, ee]
      }],
      /**
       * Transition Timing Function
       * @see https://tailwindcss.com/docs/transition-timing-function
       */
      ease: [{
        ease: ["linear", "initial", w, te, ee]
      }],
      /**
       * Transition Delay
       * @see https://tailwindcss.com/docs/transition-delay
       */
      delay: [{
        delay: [Se, te, ee]
      }],
      /**
       * Animation
       * @see https://tailwindcss.com/docs/animation
       */
      animate: [{
        animate: ["none", y, te, ee]
      }],
      // ------------------
      // --- Transforms ---
      // ------------------
      /**
       * Backface Visibility
       * @see https://tailwindcss.com/docs/backface-visibility
       */
      backface: [{
        backface: ["hidden", "visible"]
      }],
      /**
       * Perspective
       * @see https://tailwindcss.com/docs/perspective
       */
      perspective: [{
        perspective: [v, te, ee]
      }],
      /**
       * Perspective Origin
       * @see https://tailwindcss.com/docs/perspective-origin
       */
      "perspective-origin": [{
        "perspective-origin": T()
      }],
      /**
       * Rotate
       * @see https://tailwindcss.com/docs/rotate
       */
      rotate: [{
        rotate: L()
      }],
      /**
       * Rotate X
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-x": [{
        "rotate-x": L()
      }],
      /**
       * Rotate Y
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-y": [{
        "rotate-y": L()
      }],
      /**
       * Rotate Z
       * @see https://tailwindcss.com/docs/rotate
       */
      "rotate-z": [{
        "rotate-z": L()
      }],
      /**
       * Scale
       * @see https://tailwindcss.com/docs/scale
       */
      scale: [{
        scale: G()
      }],
      /**
       * Scale X
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-x": [{
        "scale-x": G()
      }],
      /**
       * Scale Y
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-y": [{
        "scale-y": G()
      }],
      /**
       * Scale Z
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-z": [{
        "scale-z": G()
      }],
      /**
       * Scale 3D
       * @see https://tailwindcss.com/docs/scale
       */
      "scale-3d": ["scale-3d"],
      /**
       * Skew
       * @see https://tailwindcss.com/docs/skew
       */
      skew: [{
        skew: oe()
      }],
      /**
       * Skew X
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-x": [{
        "skew-x": oe()
      }],
      /**
       * Skew Y
       * @see https://tailwindcss.com/docs/skew
       */
      "skew-y": [{
        "skew-y": oe()
      }],
      /**
       * Transform
       * @see https://tailwindcss.com/docs/transform
       */
      transform: [{
        transform: [te, ee, "", "none", "gpu", "cpu"]
      }],
      /**
       * Transform Origin
       * @see https://tailwindcss.com/docs/transform-origin
       */
      "transform-origin": [{
        origin: T()
      }],
      /**
       * Transform Style
       * @see https://tailwindcss.com/docs/transform-style
       */
      "transform-style": [{
        transform: ["3d", "flat"]
      }],
      /**
       * Translate
       * @see https://tailwindcss.com/docs/translate
       */
      translate: [{
        translate: ne()
      }],
      /**
       * Translate X
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-x": [{
        "translate-x": ne()
      }],
      /**
       * Translate Y
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-y": [{
        "translate-y": ne()
      }],
      /**
       * Translate Z
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-z": [{
        "translate-z": ne()
      }],
      /**
       * Translate None
       * @see https://tailwindcss.com/docs/translate
       */
      "translate-none": ["translate-none"],
      // ---------------------
      // --- Interactivity ---
      // ---------------------
      /**
       * Accent Color
       * @see https://tailwindcss.com/docs/accent-color
       */
      accent: [{
        accent: D()
      }],
      /**
       * Appearance
       * @see https://tailwindcss.com/docs/appearance
       */
      appearance: [{
        appearance: ["none", "auto"]
      }],
      /**
       * Caret Color
       * @see https://tailwindcss.com/docs/just-in-time-mode#caret-color-utilities
       */
      "caret-color": [{
        caret: D()
      }],
      /**
       * Color Scheme
       * @see https://tailwindcss.com/docs/color-scheme
       */
      "color-scheme": [{
        scheme: ["normal", "dark", "light", "light-dark", "only-dark", "only-light"]
      }],
      /**
       * Cursor
       * @see https://tailwindcss.com/docs/cursor
       */
      cursor: [{
        cursor: ["auto", "default", "pointer", "wait", "text", "move", "help", "not-allowed", "none", "context-menu", "progress", "cell", "crosshair", "vertical-text", "alias", "copy", "no-drop", "grab", "grabbing", "all-scroll", "col-resize", "row-resize", "n-resize", "e-resize", "s-resize", "w-resize", "ne-resize", "nw-resize", "se-resize", "sw-resize", "ew-resize", "ns-resize", "nesw-resize", "nwse-resize", "zoom-in", "zoom-out", te, ee]
      }],
      /**
       * Field Sizing
       * @see https://tailwindcss.com/docs/field-sizing
       */
      "field-sizing": [{
        "field-sizing": ["fixed", "content"]
      }],
      /**
       * Pointer Events
       * @see https://tailwindcss.com/docs/pointer-events
       */
      "pointer-events": [{
        "pointer-events": ["auto", "none"]
      }],
      /**
       * Resize
       * @see https://tailwindcss.com/docs/resize
       */
      resize: [{
        resize: ["none", "", "y", "x"]
      }],
      /**
       * Scroll Behavior
       * @see https://tailwindcss.com/docs/scroll-behavior
       */
      "scroll-behavior": [{
        scroll: ["auto", "smooth"]
      }],
      /**
       * Scroll Margin
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-m": [{
        "scroll-m": R()
      }],
      /**
       * Scroll Margin X
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mx": [{
        "scroll-mx": R()
      }],
      /**
       * Scroll Margin Y
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-my": [{
        "scroll-my": R()
      }],
      /**
       * Scroll Margin Start
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ms": [{
        "scroll-ms": R()
      }],
      /**
       * Scroll Margin End
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-me": [{
        "scroll-me": R()
      }],
      /**
       * Scroll Margin Top
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mt": [{
        "scroll-mt": R()
      }],
      /**
       * Scroll Margin Right
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mr": [{
        "scroll-mr": R()
      }],
      /**
       * Scroll Margin Bottom
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-mb": [{
        "scroll-mb": R()
      }],
      /**
       * Scroll Margin Left
       * @see https://tailwindcss.com/docs/scroll-margin
       */
      "scroll-ml": [{
        "scroll-ml": R()
      }],
      /**
       * Scroll Padding
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-p": [{
        "scroll-p": R()
      }],
      /**
       * Scroll Padding X
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-px": [{
        "scroll-px": R()
      }],
      /**
       * Scroll Padding Y
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-py": [{
        "scroll-py": R()
      }],
      /**
       * Scroll Padding Start
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-ps": [{
        "scroll-ps": R()
      }],
      /**
       * Scroll Padding End
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pe": [{
        "scroll-pe": R()
      }],
      /**
       * Scroll Padding Top
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pt": [{
        "scroll-pt": R()
      }],
      /**
       * Scroll Padding Right
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pr": [{
        "scroll-pr": R()
      }],
      /**
       * Scroll Padding Bottom
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pb": [{
        "scroll-pb": R()
      }],
      /**
       * Scroll Padding Left
       * @see https://tailwindcss.com/docs/scroll-padding
       */
      "scroll-pl": [{
        "scroll-pl": R()
      }],
      /**
       * Scroll Snap Align
       * @see https://tailwindcss.com/docs/scroll-snap-align
       */
      "snap-align": [{
        snap: ["start", "end", "center", "align-none"]
      }],
      /**
       * Scroll Snap Stop
       * @see https://tailwindcss.com/docs/scroll-snap-stop
       */
      "snap-stop": [{
        snap: ["normal", "always"]
      }],
      /**
       * Scroll Snap Type
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-type": [{
        snap: ["none", "x", "y", "both"]
      }],
      /**
       * Scroll Snap Type Strictness
       * @see https://tailwindcss.com/docs/scroll-snap-type
       */
      "snap-strictness": [{
        snap: ["mandatory", "proximity"]
      }],
      /**
       * Touch Action
       * @see https://tailwindcss.com/docs/touch-action
       */
      touch: [{
        touch: ["auto", "none", "manipulation"]
      }],
      /**
       * Touch Action X
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-x": [{
        "touch-pan": ["x", "left", "right"]
      }],
      /**
       * Touch Action Y
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-y": [{
        "touch-pan": ["y", "up", "down"]
      }],
      /**
       * Touch Action Pinch Zoom
       * @see https://tailwindcss.com/docs/touch-action
       */
      "touch-pz": ["touch-pinch-zoom"],
      /**
       * User Select
       * @see https://tailwindcss.com/docs/user-select
       */
      select: [{
        select: ["none", "text", "all", "auto"]
      }],
      /**
       * Will Change
       * @see https://tailwindcss.com/docs/will-change
       */
      "will-change": [{
        "will-change": ["auto", "scroll", "contents", "transform", te, ee]
      }],
      // -----------
      // --- SVG ---
      // -----------
      /**
       * Fill
       * @see https://tailwindcss.com/docs/fill
       */
      fill: [{
        fill: ["none", ...D()]
      }],
      /**
       * Stroke Width
       * @see https://tailwindcss.com/docs/stroke-width
       */
      "stroke-w": [{
        stroke: [Se, Mn, _r, Eo]
      }],
      /**
       * Stroke
       * @see https://tailwindcss.com/docs/stroke
       */
      stroke: [{
        stroke: ["none", ...D()]
      }],
      // ---------------------
      // --- Accessibility ---
      // ---------------------
      /**
       * Forced Color Adjust
       * @see https://tailwindcss.com/docs/forced-color-adjust
       */
      "forced-color-adjust": [{
        "forced-color-adjust": ["auto", "none"]
      }]
    },
    conflictingClassGroups: {
      overflow: ["overflow-x", "overflow-y"],
      overscroll: ["overscroll-x", "overscroll-y"],
      inset: ["inset-x", "inset-y", "start", "end", "top", "right", "bottom", "left"],
      "inset-x": ["right", "left"],
      "inset-y": ["top", "bottom"],
      flex: ["basis", "grow", "shrink"],
      gap: ["gap-x", "gap-y"],
      p: ["px", "py", "ps", "pe", "pt", "pr", "pb", "pl"],
      px: ["pr", "pl"],
      py: ["pt", "pb"],
      m: ["mx", "my", "ms", "me", "mt", "mr", "mb", "ml"],
      mx: ["mr", "ml"],
      my: ["mt", "mb"],
      size: ["w", "h"],
      "font-size": ["leading"],
      "fvn-normal": ["fvn-ordinal", "fvn-slashed-zero", "fvn-figure", "fvn-spacing", "fvn-fraction"],
      "fvn-ordinal": ["fvn-normal"],
      "fvn-slashed-zero": ["fvn-normal"],
      "fvn-figure": ["fvn-normal"],
      "fvn-spacing": ["fvn-normal"],
      "fvn-fraction": ["fvn-normal"],
      "line-clamp": ["display", "overflow"],
      rounded: ["rounded-s", "rounded-e", "rounded-t", "rounded-r", "rounded-b", "rounded-l", "rounded-ss", "rounded-se", "rounded-ee", "rounded-es", "rounded-tl", "rounded-tr", "rounded-br", "rounded-bl"],
      "rounded-s": ["rounded-ss", "rounded-es"],
      "rounded-e": ["rounded-se", "rounded-ee"],
      "rounded-t": ["rounded-tl", "rounded-tr"],
      "rounded-r": ["rounded-tr", "rounded-br"],
      "rounded-b": ["rounded-br", "rounded-bl"],
      "rounded-l": ["rounded-tl", "rounded-bl"],
      "border-spacing": ["border-spacing-x", "border-spacing-y"],
      "border-w": ["border-w-x", "border-w-y", "border-w-s", "border-w-e", "border-w-t", "border-w-r", "border-w-b", "border-w-l"],
      "border-w-x": ["border-w-r", "border-w-l"],
      "border-w-y": ["border-w-t", "border-w-b"],
      "border-color": ["border-color-x", "border-color-y", "border-color-s", "border-color-e", "border-color-t", "border-color-r", "border-color-b", "border-color-l"],
      "border-color-x": ["border-color-r", "border-color-l"],
      "border-color-y": ["border-color-t", "border-color-b"],
      translate: ["translate-x", "translate-y", "translate-none"],
      "translate-none": ["translate", "translate-x", "translate-y", "translate-z"],
      "scroll-m": ["scroll-mx", "scroll-my", "scroll-ms", "scroll-me", "scroll-mt", "scroll-mr", "scroll-mb", "scroll-ml"],
      "scroll-mx": ["scroll-mr", "scroll-ml"],
      "scroll-my": ["scroll-mt", "scroll-mb"],
      "scroll-p": ["scroll-px", "scroll-py", "scroll-ps", "scroll-pe", "scroll-pt", "scroll-pr", "scroll-pb", "scroll-pl"],
      "scroll-px": ["scroll-pr", "scroll-pl"],
      "scroll-py": ["scroll-pt", "scroll-pb"],
      touch: ["touch-x", "touch-y", "touch-pz"],
      "touch-x": ["touch"],
      "touch-y": ["touch"],
      "touch-pz": ["touch"]
    },
    conflictingClassGroupModifiers: {
      "font-size": ["leading"]
    },
    orderSensitiveModifiers: ["*", "**", "after", "backdrop", "before", "details-content", "file", "first-letter", "first-line", "marker", "placeholder", "selection"]
  };
}, Zf = /* @__PURE__ */ If(Jf);
function Oe(...e) {
  return Zf(Ql(e));
}
const ep = Jl(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "border bg-background text-foreground hover:bg-accent hover:text-accent-foreground dark:bg-input/30 dark:border-input dark:hover:bg-input/50",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline"
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9 rounded-md"
      }
    },
    defaultVariants: {
      variant: "default",
      size: "default"
    }
  }
), W = Q(({ className: e, variant: t, size: r, asChild: a = !1, ...i }, o) => /* @__PURE__ */ n(
  a ? kr : "button",
  {
    ref: o,
    "data-slot": "button",
    className: Oe(ep({ variant: t, size: r, className: e })),
    ...i
  }
));
W.displayName = "Button";
const ue = Q(
  ({ className: e, ...t }, r) => /* @__PURE__ */ n(
    "div",
    {
      ref: r,
      "data-slot": "card",
      className: Oe(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border",
        e
      ),
      ...t
    }
  )
);
ue.displayName = "Card";
const ze = Q(
  ({ className: e, ...t }, r) => /* @__PURE__ */ n(
    "div",
    {
      ref: r,
      "data-slot": "card-header",
      className: Oe(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 pt-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        e
      ),
      ...t
    }
  )
);
ze.displayName = "CardHeader";
const je = Q(
  ({ className: e, ...t }, r) => /* @__PURE__ */ n(
    "h4",
    {
      ref: r,
      "data-slot": "card-title",
      className: Oe("leading-none", e),
      ...t
    }
  )
);
je.displayName = "CardTitle";
const Xe = Q(
  ({ className: e, ...t }, r) => /* @__PURE__ */ n(
    "p",
    {
      ref: r,
      "data-slot": "card-description",
      className: Oe("text-muted-foreground", e),
      ...t
    }
  )
);
Xe.displayName = "CardDescription";
const tp = Q(
  ({ className: e, ...t }, r) => /* @__PURE__ */ n(
    "div",
    {
      ref: r,
      "data-slot": "card-action",
      className: Oe(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        e
      ),
      ...t
    }
  )
);
tp.displayName = "CardAction";
const Ee = Q(
  ({ className: e, ...t }, r) => /* @__PURE__ */ n(
    "div",
    {
      ref: r,
      "data-slot": "card-content",
      className: Oe("px-6 [&:last-child]:pb-6", e),
      ...t
    }
  )
);
Ee.displayName = "CardContent";
const rp = Q(
  ({ className: e, ...t }, r) => /* @__PURE__ */ n(
    "div",
    {
      ref: r,
      "data-slot": "card-footer",
      className: Oe("flex items-center px-6 pb-6 [.border-t]:pt-6", e),
      ...t
    }
  )
);
rp.displayName = "CardFooter";
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const np = (e) => e.replace(/([a-z0-9])([A-Z])/g, "$1-$2").toLowerCase(), ap = (e) => e.replace(
  /^([A-Z])|[\s-_]+(\w)/g,
  (t, r, a) => a ? a.toUpperCase() : r.toLowerCase()
), Os = (e) => {
  const t = ap(e);
  return t.charAt(0).toUpperCase() + t.slice(1);
}, cc = (...e) => e.filter((t, r, a) => !!t && t.trim() !== "" && a.indexOf(t) === r).join(" ").trim();
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
var op = {
  xmlns: "http://www.w3.org/2000/svg",
  width: 24,
  height: 24,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round",
  strokeLinejoin: "round"
};
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ip = Q(
  ({
    color: e = "currentColor",
    size: t = 24,
    strokeWidth: r = 2,
    absoluteStrokeWidth: a,
    className: i = "",
    children: o,
    iconNode: l,
    ...u
  }, c) => me(
    "svg",
    {
      ref: c,
      ...op,
      width: t,
      height: t,
      stroke: e,
      strokeWidth: a ? Number(r) * 24 / Number(t) : r,
      className: cc("lucide", i),
      ...u
    },
    [
      ...l.map(([d, h]) => me(d, h)),
      ...Array.isArray(o) ? o : [o]
    ]
  )
);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const le = (e, t) => {
  const r = Q(
    ({ className: a, ...i }, o) => me(ip, {
      ref: o,
      iconNode: t,
      className: cc(
        `lucide-${np(Os(e))}`,
        `lucide-${e}`,
        a
      ),
      ...i
    })
  );
  return r.displayName = Os(e), r;
};
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const sp = [
  ["path", { d: "m12 19-7-7 7-7", key: "1l729n" }],
  ["path", { d: "M19 12H5", key: "x3x0zl" }]
], sr = le("arrow-left", sp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const lp = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "m12 5 7 7-7 7", key: "xquz4c" }]
], Po = le("arrow-right", lp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const cp = [
  [
    "path",
    {
      d: "m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526",
      key: "1yiouv"
    }
  ],
  ["circle", { cx: "12", cy: "8", r: "6", key: "1vp47v" }]
], dc = le("award", cp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const dp = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m4.9 4.9 14.2 14.2", key: "1m5liu" }]
], up = le("ban", dp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const mp = [
  ["path", { d: "M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z", key: "1b4qmf" }],
  ["path", { d: "M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2", key: "i71pzd" }],
  ["path", { d: "M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2", key: "10jefs" }],
  ["path", { d: "M10 6h4", key: "1itunk" }],
  ["path", { d: "M10 10h4", key: "tcdvrf" }],
  ["path", { d: "M10 14h4", key: "kelpxr" }],
  ["path", { d: "M10 18h4", key: "1ulq68" }]
], Wt = le("building-2", mp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const hp = [
  ["path", { d: "M8 2v4", key: "1cmpym" }],
  ["path", { d: "M16 2v4", key: "4m81vk" }],
  ["rect", { width: "18", height: "18", x: "3", y: "4", rx: "2", key: "1hopcy" }],
  ["path", { d: "M3 10h18", key: "8toen8" }]
], Ko = le("calendar", hp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const fp = [
  [
    "path",
    {
      d: "M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2",
      key: "5owen"
    }
  ],
  ["circle", { cx: "7", cy: "17", r: "2", key: "u2ysq9" }],
  ["path", { d: "M9 17h6", key: "r8uit2" }],
  ["circle", { cx: "17", cy: "17", r: "2", key: "axvx0g" }]
], _e = le("car", fp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const pp = [["path", { d: "M20 6 9 17l-5-5", key: "1gmf2c" }]], bt = le("check", pp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const gp = [["path", { d: "m6 9 6 6 6-6", key: "qrunsl" }]], ki = le("chevron-down", gp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const vp = [["path", { d: "m9 18 6-6-6-6", key: "mthhwq" }]], bp = le("chevron-right", vp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const yp = [["path", { d: "m18 15-6-6-6 6", key: "153udz" }]], xp = le("chevron-up", yp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const wp = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m16 12-4-4-4 4", key: "177agl" }],
  ["path", { d: "M12 16V8", key: "1sbj14" }]
], Np = le("circle-arrow-up", wp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Cp = [
  ["path", { d: "M21.801 10A10 10 0 1 1 17 3.335", key: "yps3ct" }],
  ["path", { d: "m9 11 3 3L22 4", key: "1pflzl" }]
], $s = le("circle-check-big", Cp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const kp = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m9 12 2 2 4-4", key: "dzmm74" }]
], Ba = le("circle-check", kp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Sp = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3", key: "1u773s" }],
  ["path", { d: "M12 17h.01", key: "p32p05" }]
], Ep = le("circle-help", Sp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Pp = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "m15 9-6 6", key: "1uzhvr" }],
  ["path", { d: "m9 9 6 6", key: "z0biqf" }]
], Rp = le("circle-x", Pp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Tp = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["polyline", { points: "12 6 12 12 16 14", key: "68esgv" }]
], Si = le("clock", Tp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Ap = [
  ["rect", { width: "20", height: "14", x: "2", y: "5", rx: "2", key: "ynyp8z" }],
  ["line", { x1: "2", x2: "22", y1: "10", y2: "10", key: "1b3vmo" }]
], Va = le("credit-card", Ap);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Dp = [
  [
    "path",
    {
      d: "M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z",
      key: "1vdc57"
    }
  ],
  ["path", { d: "M5 21h14", key: "11awu3" }]
], Mp = le("crown", Dp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Ip = [
  ["line", { x1: "12", x2: "12", y1: "2", y2: "22", key: "7eqyqh" }],
  ["path", { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6", key: "1b0p4s" }]
], uc = le("dollar-sign", Ip);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Op = [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "7 10 12 15 17 10", key: "2ggqvy" }],
  ["line", { x1: "12", x2: "12", y1: "15", y2: "3", key: "1vk2je" }]
], qn = le("download", Op);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const $p = [
  ["path", { d: "M15 3h6v6", key: "1q9fwt" }],
  ["path", { d: "M10 14 21 3", key: "gplh6r" }],
  ["path", { d: "M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6", key: "a6xqqp" }]
], Ei = le("external-link", $p);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Lp = [
  [
    "path",
    {
      d: "M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0",
      key: "1nclc0"
    }
  ],
  ["circle", { cx: "12", cy: "12", r: "3", key: "1v7zrd" }]
], Sr = le("eye", Lp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const _p = [
  ["path", { d: "M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z", key: "1rqfz7" }],
  ["path", { d: "M14 2v4a2 2 0 0 0 2 2h4", key: "tnqrlb" }],
  ["path", { d: "M10 9H8", key: "b1mrlr" }],
  ["path", { d: "M16 13H8", key: "t4e002" }],
  ["path", { d: "M16 17H8", key: "z1uh3a" }]
], Ha = le("file-text", _p);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Bp = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20", key: "13o1zl" }],
  ["path", { d: "M2 12h20", key: "9i4pu4" }]
], ro = le("globe", Bp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Fp = [
  ["path", { d: "M16 5h6", key: "1vod17" }],
  ["path", { d: "M19 2v6", key: "4bpg5p" }],
  ["path", { d: "M21 11.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h7.5", key: "1ue2ih" }],
  ["path", { d: "m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21", key: "1xmnt7" }],
  ["circle", { cx: "9", cy: "9", r: "2", key: "af1f0g" }]
], Ro = le("image-plus", Fp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const zp = [
  ["circle", { cx: "12", cy: "12", r: "10", key: "1mglay" }],
  ["path", { d: "M12 16v-4", key: "1dtifu" }],
  ["path", { d: "M12 8h.01", key: "e9boi3" }]
], Ls = le("info", zp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const jp = [
  ["path", { d: "M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4", key: "1uf3rs" }],
  ["polyline", { points: "16 17 21 12 16 7", key: "1gabdz" }],
  ["line", { x1: "21", x2: "9", y1: "12", y2: "12", key: "1uyos4" }]
], mc = le("log-out", jp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Wp = [
  [
    "path",
    { d: "M6 20a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2", key: "1m57jg" }
  ],
  ["path", { d: "M8 18V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v14", key: "1l99gc" }],
  ["path", { d: "M10 20h4", key: "ni2waw" }],
  ["circle", { cx: "16", cy: "20", r: "2", key: "1vifvg" }],
  ["circle", { cx: "8", cy: "20", r: "2", key: "ckkr5m" }]
], Up = le("luggage", Wp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Vp = [
  ["rect", { width: "20", height: "16", x: "2", y: "4", rx: "2", key: "18n3k1" }],
  ["path", { d: "m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7", key: "1ocrg3" }]
], Er = le("mail", Vp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Hp = [
  [
    "path",
    {
      d: "M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0",
      key: "1r0f0z"
    }
  ],
  ["circle", { cx: "12", cy: "10", r: "3", key: "ilqhr7" }]
], Pt = le("map-pin", Hp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Gp = [
  [
    "path",
    {
      d: "M18 8c0 3.613-3.869 7.429-5.393 8.795a1 1 0 0 1-1.214 0C9.87 15.429 6 11.613 6 8a6 6 0 0 1 12 0",
      key: "11u0oz"
    }
  ],
  ["circle", { cx: "12", cy: "8", r: "2", key: "1822b1" }],
  [
    "path",
    {
      d: "M8.714 14h-3.71a1 1 0 0 0-.948.683l-2.004 6A1 1 0 0 0 3 22h18a1 1 0 0 0 .948-1.316l-2-6a1 1 0 0 0-.949-.684h-3.712",
      key: "q8zwxj"
    }
  ]
], Kp = le("map-pinned", Gp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Yp = [
  ["path", { d: "M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z", key: "1lielz" }]
], no = le("message-square", Yp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const qp = [
  ["path", { d: "M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z", key: "a7tn18" }]
], Xp = le("moon", qp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Qp = [
  ["circle", { cx: "13.5", cy: "6.5", r: ".5", fill: "currentColor", key: "1okk4w" }],
  ["circle", { cx: "17.5", cy: "10.5", r: ".5", fill: "currentColor", key: "f64h9f" }],
  ["circle", { cx: "8.5", cy: "7.5", r: ".5", fill: "currentColor", key: "fotxhn" }],
  ["circle", { cx: "6.5", cy: "12.5", r: ".5", fill: "currentColor", key: "qy21gx" }],
  [
    "path",
    {
      d: "M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z",
      key: "12rzf8"
    }
  ]
], hc = le("palette", Qp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Jp = [
  [
    "path",
    {
      d: "M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z",
      key: "1a8usu"
    }
  ]
], mr = le("pen", Jp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Zp = [
  [
    "path",
    {
      d: "M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z",
      key: "foiqr5"
    }
  ]
], ca = le("phone", Zp);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const eg = [["polygon", { points: "6 3 20 12 6 21 6 3", key: "1oa8hb" }]], tg = le("play", eg);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const rg = [
  ["path", { d: "M5 12h14", key: "1ays0h" }],
  ["path", { d: "M12 5v14", key: "s699le" }]
], Ea = le("plus", rg);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ng = [
  [
    "path",
    {
      d: "M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2",
      key: "143wyd"
    }
  ],
  ["path", { d: "M6 9V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v6", key: "1itne7" }],
  ["rect", { x: "6", y: "14", width: "12", height: "8", rx: "1", key: "1ue0tg" }]
], fc = le("printer", ng);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ag = [
  ["rect", { width: "5", height: "5", x: "3", y: "3", rx: "1", key: "1tu5fj" }],
  ["rect", { width: "5", height: "5", x: "16", y: "3", rx: "1", key: "1v8r4q" }],
  ["rect", { width: "5", height: "5", x: "3", y: "16", rx: "1", key: "1x03jg" }],
  ["path", { d: "M21 16h-3a2 2 0 0 0-2 2v3", key: "177gqh" }],
  ["path", { d: "M21 21v.01", key: "ents32" }],
  ["path", { d: "M12 7v3a2 2 0 0 1-2 2H7", key: "8crl2c" }],
  ["path", { d: "M3 12h.01", key: "nlz23k" }],
  ["path", { d: "M12 3h.01", key: "n36tog" }],
  ["path", { d: "M12 16v.01", key: "133mhm" }],
  ["path", { d: "M16 12h1", key: "1slzba" }],
  ["path", { d: "M21 12v.01", key: "1lwtk9" }],
  ["path", { d: "M12 21v-1", key: "1880an" }]
], Fr = le("qr-code", ag);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const og = [
  [
    "path",
    {
      d: "M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z",
      key: "1c8476"
    }
  ],
  ["path", { d: "M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7", key: "1ydtos" }],
  ["path", { d: "M7 3v4a1 1 0 0 0 1 1h7", key: "t51u73" }]
], ig = le("save", og);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const sg = [
  ["circle", { cx: "11", cy: "11", r: "8", key: "4ej97u" }],
  ["path", { d: "m21 21-4.3-4.3", key: "1qie3q" }]
], Yo = le("search", sg);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const lg = [
  [
    "path",
    {
      d: "M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z",
      key: "1ffxy3"
    }
  ],
  ["path", { d: "m21.854 2.147-10.94 10.939", key: "12cjpa" }]
], Pa = le("send", lg);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const cg = [
  ["circle", { cx: "18", cy: "5", r: "3", key: "gq8acd" }],
  ["circle", { cx: "6", cy: "12", r: "3", key: "w7nqdw" }],
  ["circle", { cx: "18", cy: "19", r: "3", key: "1xt0gg" }],
  ["line", { x1: "8.59", x2: "15.42", y1: "13.51", y2: "17.49", key: "47mynk" }],
  ["line", { x1: "15.41", x2: "8.59", y1: "6.51", y2: "10.49", key: "1n3mei" }]
], pc = le("share-2", cg);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const dg = [
  [
    "path",
    {
      d: "M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",
      key: "oel41y"
    }
  ]
], zr = le("shield", dg);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const ug = [
  [
    "path",
    {
      d: "M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z",
      key: "4pj2yx"
    }
  ],
  ["path", { d: "M20 3v4", key: "1olli1" }],
  ["path", { d: "M22 5h-4", key: "1gvqau" }],
  ["path", { d: "M4 17v2", key: "vumght" }],
  ["path", { d: "M5 18H3", key: "zchphs" }]
], Pi = le("sparkles", ug);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const mg = [
  [
    "path",
    {
      d: "M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z",
      key: "r04s7s"
    }
  ]
], hg = le("star", mg);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const fg = [
  ["circle", { cx: "12", cy: "12", r: "4", key: "4exip2" }],
  ["path", { d: "M12 2v2", key: "tus03m" }],
  ["path", { d: "M12 20v2", key: "1lh1kg" }],
  ["path", { d: "m4.93 4.93 1.41 1.41", key: "149t6j" }],
  ["path", { d: "m17.66 17.66 1.41 1.41", key: "ptbguv" }],
  ["path", { d: "M2 12h2", key: "1t8f8n" }],
  ["path", { d: "M20 12h2", key: "1q8mjw" }],
  ["path", { d: "m6.34 17.66-1.41 1.41", key: "1m8zz5" }],
  ["path", { d: "m19.07 4.93-1.41 1.41", key: "1shlcs" }]
], pg = le("sun", fg);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const gg = [
  ["line", { x1: "10", x2: "14", y1: "2", y2: "2", key: "14vaq8" }],
  ["line", { x1: "12", x2: "15", y1: "14", y2: "11", key: "17fdiu" }],
  ["circle", { cx: "12", cy: "14", r: "8", key: "1e1u0o" }]
], vg = le("timer", gg);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const bg = [
  ["polyline", { points: "22 7 13.5 15.5 8.5 10.5 2 17", key: "126l90" }],
  ["polyline", { points: "16 7 22 7 22 13", key: "kwv8wd" }]
], yg = le("trending-up", bg);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const xg = [
  ["path", { d: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4", key: "ih7n3h" }],
  ["polyline", { points: "17 8 12 3 7 8", key: "t8dd8p" }],
  ["line", { x1: "12", x2: "12", y1: "3", y2: "15", key: "widbto" }]
], Fa = le("upload", xg);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const wg = [
  ["path", { d: "M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2", key: "975kel" }],
  ["circle", { cx: "12", cy: "7", r: "4", key: "17ys0d" }]
], _s = le("user", wg);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Ng = [
  ["path", { d: "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", key: "1yyitq" }],
  ["circle", { cx: "9", cy: "7", r: "4", key: "nufk8" }],
  ["path", { d: "M22 21v-2a4 4 0 0 0-3-3.87", key: "kshegd" }],
  ["path", { d: "M16 3.13a4 4 0 0 1 0 7.75", key: "1da9ce" }]
], Xn = le("users", Ng);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const Cg = [
  ["path", { d: "M18 6 6 18", key: "1bl5f8" }],
  ["path", { d: "m6 6 12 12", key: "d8bk6v" }]
], yt = le("x", Cg);
/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */
const kg = [
  [
    "path",
    {
      d: "M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z",
      key: "1xq2db"
    }
  ]
], Sg = le("zap", kg), gc = et(void 0);
function Eg({ children: e }) {
  const [t, r] = j(() => localStorage.getItem("language") || "en"), [a, i] = j(() => localStorage.getItem("darkMode") === "true");
  return xe(() => {
    localStorage.setItem("language", t);
  }, [t]), xe(() => {
    localStorage.setItem("darkMode", String(a));
  }, [a]), /* @__PURE__ */ n(gc.Provider, { value: { language: t, setLanguage: r, darkMode: a, setDarkMode: i }, children: e });
}
function lr() {
  const e = ke(gc);
  if (e === void 0)
    throw new Error("useLanguage must be used within a LanguageProvider");
  return e;
}
function vn() {
  const { language: e, setLanguage: t, darkMode: r, setDarkMode: a } = lr();
  return /* @__PURE__ */ s("div", { className: "fixed top-4 right-4 z-50 flex gap-2", children: [
    /* @__PURE__ */ n(
      "button",
      {
        onClick: () => a(!r),
        className: `p-3 rounded-full shadow-lg transition-all ${r ? "bg-slate-800 text-gray-300 hover:bg-slate-700" : "bg-white text-gray-600 hover:bg-gray-100"}`,
        "aria-label": "Toggle dark mode",
        children: r ? /* @__PURE__ */ n(pg, { className: "w-5 h-5" }) : /* @__PURE__ */ n(Xp, { className: "w-5 h-5" })
      }
    ),
    /* @__PURE__ */ s("div", { className: `rounded-full shadow-lg p-1 flex gap-1 ${r ? "bg-slate-800" : "bg-white"}`, children: [
      /* @__PURE__ */ n(
        "button",
        {
          onClick: () => t("en"),
          className: `px-3 py-2 rounded-full text-sm font-semibold transition-all ${e === "en" ? "bg-gray-900 text-white" : r ? "text-gray-400 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-100"}`,
          children: "EN"
        }
      ),
      /* @__PURE__ */ n(
        "button",
        {
          onClick: () => t("fr"),
          className: `px-3 py-2 rounded-full text-sm font-semibold transition-all ${e === "fr" ? "bg-gray-900 text-white" : r ? "text-gray-400 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-100"}`,
          children: "FR"
        }
      ),
      /* @__PURE__ */ n(
        "button",
        {
          onClick: () => t("nl"),
          className: `px-3 py-2 rounded-full text-sm font-semibold transition-all ${e === "nl" ? "bg-gray-900 text-white" : r ? "text-gray-400 hover:bg-slate-700" : "text-gray-600 hover:bg-gray-100"}`,
          children: "NL"
        }
      )
    ] })
  ] });
}
function Pg() {
  const { language: e, darkMode: t } = lr(), [r, a] = j(!1), o = {
    en: {
      title: "TAXIO",
      tagline: "Your Taxi Smart Business Card",
      subtitle: "Your Price • Your Website • No Commission",
      registerCard: {
        title: "Register Your Company",
        desc: "Get your website in few steps",
        button: "Start for Free"
      },
      loginCard: {
        title: "Company Login",
        desc: "Manage your business",
        button: "Login"
      },
      demoCard: {
        title: "What Your Customers See",
        desc: "Preview booking page demo",
        button: "View Demo"
      },
      lookingTaxi: "Looking for a Taxi?",
      browseTaxis: "Browse Taxi Companies",
      whyChoose: "Why Choose TAXIO?",
      hideDetails: "Hide Details",
      // Detailed content
      problemTitle: "Tired of Losing Money to Commission Fees?",
      problemDesc: "Traditional ride-hailing platforms take 20-30% of every ride. That's YOUR money going to big corporations. There's a better way.",
      solutionTitle: "Introducing TAXIO",
      solutionDesc: "Your own professional website where customers book directly with YOU. No middleman, no commissions, just your business growing.",
      howItWorksTitle: "How It Works",
      howItWorks: [
        {
          step: "1",
          title: "Register in 5 Minutes",
          desc: "Sign up, add your company details, set your prices"
        },
        {
          step: "2",
          title: "Get Your Website",
          desc: "Instantly receive yourcompany.taxio.be"
        },
        {
          step: "3",
          title: "Start Earning More",
          desc: "Customers book via WhatsApp/Email. You keep 100%"
        }
      ],
      comparisonTitle: "TAXIO vs Traditional Platforms",
      comparison: {
        commission: "Commission per Ride",
        taxora: "€0 (100% yours)",
        others: "€5-10 (20-30%)",
        website: "Own Website",
        pricing: "Set Your Prices",
        contact: "Direct Contact",
        cost: "Monthly Cost"
      },
      featuresTitle: "Everything You Need to Succeed",
      features: [
        {
          icon: "globe",
          title: "Professional Website",
          desc: "Get yourcompany.taxio.be - Modern, mobile-friendly"
        },
        {
          icon: "credit",
          title: "Zero Commission",
          desc: "Keep 100% of your earnings. Only small subscription fee"
        },
        {
          icon: "price",
          title: "Full Pricing Control",
          desc: "Set your own prices - your business, your rules"
        },
        {
          icon: "qr",
          title: "Smart Website",
          desc: "Share your web QR code then customer book, calculate trip cost and time & request a ride via WhatsApp or mail instantly"
        },
        {
          icon: "dashboard",
          title: "Driver Dashboard",
          desc: "Manage your fleet and track bookings"
        },
        {
          icon: "support",
          title: "Direct Customer Contact",
          desc: "Build direct relationships with your customers"
        }
      ],
      pricingTitle: "Simple, Transparent Pricing",
      pricingDesc: "No hidden fees. No commission. Just one simple monthly subscription.",
      pricingBasic: {
        name: "Basic",
        price: "Subscription Fee",
        period: "/month",
        badge: "1st Month FREE",
        features: [
          "Your own branded website",
          "Unlimited bookings",
          "QR code generator",
          "Price calculator",
          "WhatsApp integration",
          "Email notifications",
          "Basic support"
        ],
        notIncluded: [
          "Driver management",
          "Priority support"
        ]
      },
      pricingPremium: {
        name: "Premium",
        price: "Subscription Fee",
        period: "/month",
        badge: "Most Popular",
        features: [
          "Everything in Basic",
          "Driver management",
          "Multi-vehicle fleet",
          "Advanced analytics",
          "Priority support 24/7",
          "Custom branding",
          "Google Ads campagne setup",
          "API access",
          "Dedicated account manager"
        ]
      },
      stats: {
        companies: "150+ Companies",
        rides: "50K+ Rides Monthly",
        savings: "€2M+ Saved"
      },
      copyright: "© 2026 TAXIO. All rights reserved.",
      admin: "Admin"
    },
    fr: {
      title: "TAXIO",
      tagline: "Votre Carte de Visite de Taxi Intelligente",
      subtitle: "Votre Prix • Votre Site Web • Aucune Commission",
      registerCard: {
        title: "Enregistrez Votre Compagnie",
        desc: "Obtenez votre site web en quelques étapes",
        button: "Commencer Gratuitement"
      },
      loginCard: {
        title: "Connexion Compagnie",
        desc: "Gérez votre entreprise",
        button: "Se Connecter"
      },
      demoCard: {
        title: "Ce Que Vos Clients Voient",
        desc: "Aperçu de la page de réservation",
        button: "Voir Démo"
      },
      lookingTaxi: "Cherchez un Taxi?",
      browseTaxis: "Parcourir les Compagnies",
      whyChoose: "Pourquoi Choisir TAXIO?",
      hideDetails: "Masquer les Détails",
      problemTitle: "Fatigué de Perdre de l'Argent en Commissions?",
      problemDesc: "Les plateformes traditionnelles prennent 20-30% de chaque course. C'est VOTRE argent. Il y a une meilleure solution.",
      solutionTitle: "Découvrez TAXIO",
      solutionDesc: "Votre propre site web où les clients réservent directement avec VOUS. Pas d'intermédiaire.",
      howItWorksTitle: "Comment Ça Marche",
      howItWorks: [
        {
          step: "1",
          title: "Inscription en 5 Minutes",
          desc: "Inscrivez-vous, ajoutez vos détails, définissez vos prix"
        },
        {
          step: "2",
          title: "Obtenez Votre Site",
          desc: "Recevez instantanément votrecompagnie.taxio.be"
        },
        {
          step: "3",
          title: "Gagnez Plus",
          desc: "Les clients réservent par WhatsApp. Vous gardez 100%"
        }
      ],
      comparisonTitle: "TAXIO vs Plateformes Traditionnelles",
      comparison: {
        commission: "Commission par Course",
        taxora: "€0 (100% à vous)",
        others: "€5-10 (20-30%)",
        website: "Propre Site Web",
        pricing: "Fixez Vos Prix",
        contact: "Contact Direct",
        cost: "Coût Mensuel"
      },
      featuresTitle: "Tout Ce Dont Vous Avez Besoin",
      features: [
        {
          icon: "globe",
          title: "Site Web Professionnel",
          desc: "Obtenez votrecompagnie.taxio.be - Moderne, mobile"
        },
        {
          icon: "credit",
          title: "Zéro Commission",
          desc: "Gardez 100% de vos revenus. Seulement un petit frais d'abonnement"
        },
        {
          icon: "price",
          title: "Contrôle Total des Prix",
          desc: "Définissez vos prix - vos règles"
        },
        {
          icon: "qr",
          title: "Site Web Intelligent",
          desc: "Partagez votre code QR web puis le client réserve, calcule le coût et le temps du trajet et demande une course via WhatsApp ou email instantanément"
        },
        {
          icon: "dashboard",
          title: "Tableau de Bord",
          desc: "Gérez votre flotte et suivez les réservations"
        },
        {
          icon: "support",
          title: "Contact Client Direct",
          desc: "Construisez des relations directes"
        }
      ],
      pricingTitle: "Tarification Simple et Transparente",
      pricingDesc: "Pas de frais cachés. Pas de commission. Un simple abonnement mensuel.",
      pricingBasic: {
        name: "Basic",
        price: "Frais d'Abonnement",
        period: "/mois",
        badge: "1er Mois GRATUIT",
        features: [
          "Votre site web personnalisé",
          "Réservations illimitées",
          "Générateur de code QR",
          "Calculateur de prix",
          "Intégration WhatsApp",
          "Notifications email",
          "Support de base"
        ],
        notIncluded: [
          "Gestion des chauffeurs",
          "Support prioritaire"
        ]
      },
      pricingPremium: {
        name: "Premium",
        price: "Frais d'Abonnement",
        period: "/mois",
        badge: "Le Plus Populaire",
        features: [
          "Tout dans Basic",
          "Gestion des chauffeurs",
          "Flotte multi-véhicules",
          "Analyse avancée",
          "Support prioritaire 24/7",
          "Branding personnalisé",
          "Google Ads campagne setup",
          "Accès API",
          "Gestionnaire de compte dédié"
        ]
      },
      stats: {
        companies: "150+ Compagnies",
        rides: "50K+ Courses/mois",
        savings: "€2M+ Économisés"
      },
      copyright: "© 2026 TAXIO. Tous droits réservés.",
      admin: "Admin"
    },
    nl: {
      title: "TAXIO",
      tagline: "Uw Taxi Slim Visitekaartje",
      subtitle: "Uw Prijs • Uw Website • Geen Commissie",
      registerCard: {
        title: "Registreer Uw Bedrijf",
        desc: "Krijg uw website in een paar stappen",
        button: "Gratis Beginnen"
      },
      loginCard: {
        title: "Bedrijf Login",
        desc: "Beheer uw bedrijf",
        button: "Inloggen"
      },
      demoCard: {
        title: "Wat Uw Klanten Zien",
        desc: "Voorbeeld boekingspagina",
        button: "Bekijk Demo"
      },
      lookingTaxi: "Op Zoek naar een Taxi?",
      browseTaxis: "Blader Door Bedrijven",
      whyChoose: "Waarom Kiezen voor TAXIO?",
      hideDetails: "Verberg Details",
      problemTitle: "Moe van Geld Verliezen aan Commissies?",
      problemDesc: "Traditionele platforms nemen 20-30% van elke rit. Dat is UW geld. Er is een betere manier.",
      solutionTitle: "Maak Kennis met TAXIO",
      solutionDesc: "Uw eigen website waar klanten direct bij U boeken. Geen tussenpersoon.",
      howItWorksTitle: "Hoe Het Werkt",
      howItWorks: [
        {
          step: "1",
          title: "Registreer in 5 Minuten",
          desc: "Meld u aan, voeg uw gegevens toe, stel prijzen in"
        },
        {
          step: "2",
          title: "Ontvang Uw Website",
          desc: "Ontvang direct uwbedrijf.taxio.be"
        },
        {
          step: "3",
          title: "Verdien Meer",
          desc: "Klanten boeken via WhatsApp. U houdt 100%"
        }
      ],
      comparisonTitle: "TAXIO vs Traditionele Platforms",
      comparison: {
        commission: "Commissie per Rit",
        taxora: "€0 (100% van u)",
        others: "€5-10 (20-30%)",
        website: "Eigen Website",
        pricing: "Stel Uw Prijzen In",
        contact: "Direct Contact",
        cost: "Maandelijkse Kosten"
      },
      featuresTitle: "Alles Wat U Nodig Heeft",
      features: [
        {
          icon: "globe",
          title: "Professionele Website",
          desc: "Krijg uwbedrijf.taxio.be - Modern, mobiel"
        },
        {
          icon: "credit",
          title: "Geen Commissie",
          desc: "Houd 100% van uw inkomsten. Slechts een kleine abonnementsvergoeding"
        },
        {
          icon: "price",
          title: "Volledige Prijscontrole",
          desc: "Stel uw eigen prijzen in - uw regels"
        },
        {
          icon: "qr",
          title: "Slimme Website",
          desc: "Deel uw web QR-code dan boekt klant, berekent ritkosten en tijd en vraagt een rit aan via WhatsApp of mail direct"
        },
        {
          icon: "dashboard",
          title: "Chauffeursdashboard",
          desc: "Beheer uw vloot en volg boekingen"
        },
        {
          icon: "support",
          title: "Direct Klantcontact",
          desc: "Bouw directe relaties op"
        }
      ],
      pricingTitle: "Eenvoudige, Transparante Prijzen",
      pricingDesc: "Geen verborgen kosten. Geen commissie. Slechts één eenvoudig abonnement.",
      pricingBasic: {
        name: "Basic",
        price: "Abonnementskosten",
        period: "/maand",
        badge: "1e Maand GRATIS",
        features: [
          "Uw eigen merkwebsite",
          "Onbeperkte boekingen",
          "QR-code generator",
          "Prijscalculator",
          "WhatsApp integratie",
          "E-mailmeldingen",
          "Basisondersteuning"
        ],
        notIncluded: [
          "Chauffeursbeheer",
          "Prioritaire ondersteuning"
        ]
      },
      pricingPremium: {
        name: "Premium",
        price: "Abonnementskosten",
        period: "/maand",
        badge: "Meest Populair",
        features: [
          "Alles in Basic",
          "Chauffeursbeheer",
          "Multi-voertuig vloot",
          "Geavanceerde analyses",
          "Prioritaire ondersteuning 24/7",
          "Aangepaste branding",
          "Google Ads campagne setup",
          "API-toegang",
          "Toegewijzen accountmanager"
        ]
      },
      stats: {
        companies: "150+ Bedrijven",
        rides: "50K+ Ritten/maand",
        savings: "€2M+ Bespaard"
      },
      copyright: "© 2026 TAXIO. Alle rechten voorbehouden.",
      admin: "Admin"
    }
  }[e];
  return /* @__PURE__ */ s("div", { className: `min-h-screen transition-colors duration-300 ${t ? "bg-slate-900" : "bg-white"}`, children: [
    /* @__PURE__ */ n(vn, {}),
    /* @__PURE__ */ n("div", { className: "absolute top-4 left-4 z-50", children: /* @__PURE__ */ n(Ve, { to: "/login/admin", children: /* @__PURE__ */ s(W, { variant: "ghost", size: "sm", className: `transition-colors ${t ? "text-gray-400 hover:text-gray-200" : "text-gray-600 hover:text-gray-900"}`, children: [
      /* @__PURE__ */ n(zr, { className: "w-3 h-3 mr-1" }),
      o.admin
    ] }) }) }),
    /* @__PURE__ */ n("section", { className: `pt-32 pb-20 px-4 ${t ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900" : "bg-gradient-to-br from-gray-50 via-white to-gray-50"}`, children: /* @__PURE__ */ s("div", { className: "container mx-auto max-w-4xl", children: [
      /* @__PURE__ */ s("div", { className: "text-center mb-16", children: [
        /* @__PURE__ */ s("div", { className: "flex flex-col items-center gap-4 mb-6", children: [
          /* @__PURE__ */ s("div", { className: "relative w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl bg-gradient-to-br from-yellow-400 to-yellow-500", children: [
            /* @__PURE__ */ n(_e, { className: "w-10 h-10 text-slate-900", strokeWidth: 2.5 }),
            /* @__PURE__ */ n("div", { className: "absolute -top-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-3 border-white flex items-center justify-center", children: /* @__PURE__ */ n(Sg, { className: "w-3 h-3 text-white" }) })
          ] }),
          /* @__PURE__ */ n("h1", { className: `text-6xl font-black tracking-tight ${t ? "text-white" : "text-slate-900"}`, children: "TAXIO" })
        ] }),
        /* @__PURE__ */ n("p", { className: `text-2xl mb-3 font-medium ${t ? "text-gray-300" : "text-gray-700"}`, children: o.tagline }),
        /* @__PURE__ */ n("p", { className: `text-lg font-bold ${t ? "text-yellow-400" : "text-yellow-600"}`, children: o.subtitle })
      ] }),
      /* @__PURE__ */ s("div", { className: "grid md:grid-cols-3 gap-6 mb-12", children: [
        /* @__PURE__ */ s(ue, { className: `hover:shadow-2xl transition-all hover:scale-105 border-2 ${t ? "bg-slate-800 border-slate-700 hover:border-yellow-400" : "bg-white border-gray-200 hover:border-yellow-400"}`, children: [
          /* @__PURE__ */ s(ze, { className: "text-center pb-4", children: [
            /* @__PURE__ */ n("div", { className: "w-16 h-16 bg-yellow-400 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg", children: /* @__PURE__ */ n(Wt, { className: "w-8 h-8 text-gray-900" }) }),
            /* @__PURE__ */ n(je, { className: `text-xl mb-2 ${t ? "text-white" : "text-gray-900"}`, children: o.registerCard.title }),
            /* @__PURE__ */ n(Xe, { className: `text-sm ${t ? "text-gray-400" : "text-gray-600"}`, children: o.registerCard.desc })
          ] }),
          /* @__PURE__ */ n(Ee, { children: /* @__PURE__ */ n(Ve, { to: "/register", children: /* @__PURE__ */ n(W, { className: "w-full h-12 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold shadow-md", size: "lg", children: o.registerCard.button }) }) })
        ] }),
        /* @__PURE__ */ s(ue, { className: `hover:shadow-2xl transition-all hover:scale-105 border-2 ${t ? "bg-slate-800 border-slate-700 hover:border-yellow-400" : "bg-white border-gray-200 hover:border-yellow-400"}`, children: [
          /* @__PURE__ */ s(ze, { className: "text-center pb-4", children: [
            /* @__PURE__ */ n("div", { className: `w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg ${t ? "bg-slate-700" : "bg-gray-900"}`, children: /* @__PURE__ */ n(_e, { className: "w-8 h-8 text-white" }) }),
            /* @__PURE__ */ n(je, { className: `text-xl mb-2 ${t ? "text-white" : "text-gray-900"}`, children: o.loginCard.title }),
            /* @__PURE__ */ n(Xe, { className: `text-sm ${t ? "text-gray-400" : "text-gray-600"}`, children: o.loginCard.desc })
          ] }),
          /* @__PURE__ */ n(Ee, { children: /* @__PURE__ */ n(Ve, { to: "/login/company", children: /* @__PURE__ */ n(W, { className: `w-full h-12 shadow-md font-semibold ${t ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-900 hover:bg-gray-800 text-white"}`, size: "lg", children: o.loginCard.button }) }) })
        ] }),
        /* @__PURE__ */ s(ue, { className: `hover:shadow-2xl transition-all hover:scale-105 border-2 ${t ? "bg-slate-800 border-slate-700 hover:border-yellow-400" : "bg-white border-gray-200 hover:border-yellow-400"}`, children: [
          /* @__PURE__ */ s(ze, { className: "text-center pb-4", children: [
            /* @__PURE__ */ n("div", { className: `w-16 h-16 rounded-2xl flex items-center justify-center mb-4 mx-auto shadow-lg ${t ? "bg-slate-700" : "bg-gray-100"}`, children: /* @__PURE__ */ n(Sr, { className: `w-8 h-8 ${t ? "text-yellow-400" : "text-yellow-600"}` }) }),
            /* @__PURE__ */ n(je, { className: `text-xl mb-2 ${t ? "text-white" : "text-gray-900"}`, children: o.demoCard.title }),
            /* @__PURE__ */ n(Xe, { className: `text-sm ${t ? "text-gray-400" : "text-gray-600"}`, children: o.demoCard.desc })
          ] }),
          /* @__PURE__ */ n(Ee, { children: /* @__PURE__ */ n(Ve, { to: "/book/democompany", children: /* @__PURE__ */ n(W, { variant: "outline", className: `w-full h-12 font-semibold border-2 ${t ? "border-gray-600 text-gray-300 hover:bg-slate-700" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`, size: "lg", children: o.demoCard.button }) }) })
        ] })
      ] }),
      /* @__PURE__ */ s("div", { className: "flex flex-col sm:flex-row gap-4 justify-center items-center", children: [
        /* @__PURE__ */ n(Ve, { to: "/browse-companies", className: "w-full sm:w-auto", children: /* @__PURE__ */ s(W, { size: "lg", className: `w-full sm:w-auto text-lg px-8 py-6 shadow-lg transition-all ${t ? "bg-slate-700 hover:bg-slate-600 text-white" : "bg-gray-900 hover:bg-gray-800 text-white"}`, children: [
          /* @__PURE__ */ n(Yo, { className: "mr-2 w-5 h-5" }),
          o.lookingTaxi
        ] }) }),
        /* @__PURE__ */ s(
          W,
          {
            size: "lg",
            onClick: () => a(!r),
            className: `w-full sm:w-auto text-lg px-8 py-6 shadow-lg transition-all ${r ? "bg-yellow-500 hover:bg-yellow-600" : "bg-yellow-400 hover:bg-yellow-500"} text-gray-900 font-semibold`,
            children: [
              r ? o.hideDetails : o.whyChoose,
              /* @__PURE__ */ n(ki, { className: `ml-2 w-5 h-5 transition-transform ${r ? "rotate-180" : ""}` })
            ]
          }
        )
      ] })
    ] }) }),
    r && /* @__PURE__ */ s(Cr, { children: [
      /* @__PURE__ */ n("section", { className: `py-20 px-4 ${t ? "bg-slate-800" : "bg-gray-50"}`, children: /* @__PURE__ */ n("div", { className: "container mx-auto max-w-6xl", children: /* @__PURE__ */ s("div", { className: "grid md:grid-cols-2 gap-12 items-center", children: [
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ n("div", { className: "inline-block px-4 py-2 bg-red-500/10 text-red-500 rounded-full text-sm font-semibold mb-4", children: "The Problem" }),
          /* @__PURE__ */ n("h2", { className: `text-3xl font-bold mb-4 ${t ? "text-white" : "text-gray-900"}`, children: o.problemTitle }),
          /* @__PURE__ */ n("p", { className: `text-lg mb-6 ${t ? "text-gray-300" : "text-gray-600"}`, children: o.problemDesc }),
          /* @__PURE__ */ s("div", { className: "space-y-3", children: [
            /* @__PURE__ */ s("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ n(yt, { className: "w-5 h-5 text-red-500" }),
              /* @__PURE__ */ n("span", { className: t ? "text-gray-300" : "text-gray-700", children: "25% commission on EVERY ride" })
            ] }),
            /* @__PURE__ */ s("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ n(yt, { className: "w-5 h-5 text-red-500" }),
              /* @__PURE__ */ n("span", { className: t ? "text-gray-300" : "text-gray-700", children: "No control over pricing" })
            ] }),
            /* @__PURE__ */ s("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ n(yt, { className: "w-5 h-5 text-red-500" }),
              /* @__PURE__ */ n("span", { className: t ? "text-gray-300" : "text-gray-700", children: "No direct customer relationship" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ n("div", { className: "inline-block px-4 py-2 bg-green-500/10 text-green-500 rounded-full text-sm font-semibold mb-4", children: "The Solution" }),
          /* @__PURE__ */ n("h2", { className: `text-3xl font-bold mb-4 ${t ? "text-white" : "text-gray-900"}`, children: o.solutionTitle }),
          /* @__PURE__ */ n("p", { className: `text-lg mb-6 ${t ? "text-gray-300" : "text-gray-600"}`, children: o.solutionDesc }),
          /* @__PURE__ */ s("div", { className: "space-y-3", children: [
            /* @__PURE__ */ s("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ n(bt, { className: "w-5 h-5 text-green-500" }),
              /* @__PURE__ */ n("span", { className: t ? "text-gray-300" : "text-gray-700", children: "0% commission - Keep 100%" })
            ] }),
            /* @__PURE__ */ s("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ n(bt, { className: "w-5 h-5 text-green-500" }),
              /* @__PURE__ */ n("span", { className: t ? "text-gray-300" : "text-gray-700", children: "Full pricing control" })
            ] }),
            /* @__PURE__ */ s("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ n(bt, { className: "w-5 h-5 text-green-500" }),
              /* @__PURE__ */ n("span", { className: t ? "text-gray-300" : "text-gray-700", children: "Direct WhatsApp contact" })
            ] })
          ] })
        ] })
      ] }) }) }),
      /* @__PURE__ */ n("section", { className: `py-20 px-4 ${t ? "bg-slate-900" : "bg-white"}`, children: /* @__PURE__ */ s("div", { className: "container mx-auto max-w-6xl", children: [
        /* @__PURE__ */ n("div", { className: "text-center mb-16", children: /* @__PURE__ */ n("h2", { className: `text-4xl font-bold mb-4 ${t ? "text-white" : "text-gray-900"}`, children: o.howItWorksTitle }) }),
        /* @__PURE__ */ n("div", { className: "grid md:grid-cols-3 gap-8", children: o.howItWorks.map((l, u) => /* @__PURE__ */ s("div", { className: "text-center", children: [
          /* @__PURE__ */ s("div", { className: "relative mb-6", children: [
            /* @__PURE__ */ n("div", { className: "w-20 h-20 mx-auto bg-yellow-400 rounded-full flex items-center justify-center text-3xl font-bold text-gray-900 shadow-lg", children: l.step }),
            u < o.howItWorks.length - 1 && /* @__PURE__ */ n(Po, { className: `hidden md:block absolute top-1/2 -right-12 transform -translate-y-1/2 w-8 h-8 ${t ? "text-gray-600" : "text-gray-300"}` })
          ] }),
          /* @__PURE__ */ n("h3", { className: `text-xl font-bold mb-3 ${t ? "text-white" : "text-gray-900"}`, children: l.title }),
          /* @__PURE__ */ n("p", { className: t ? "text-gray-400" : "text-gray-600", children: l.desc })
        ] }, u)) })
      ] }) }),
      /* @__PURE__ */ n("section", { className: `py-20 px-4 ${t ? "bg-slate-800" : "bg-gray-50"}`, children: /* @__PURE__ */ s("div", { className: "container mx-auto max-w-5xl", children: [
        /* @__PURE__ */ n("div", { className: "text-center mb-12", children: /* @__PURE__ */ n("h2", { className: `text-4xl font-bold mb-4 ${t ? "text-white" : "text-gray-900"}`, children: o.comparisonTitle }) }),
        /* @__PURE__ */ n("div", { className: `rounded-2xl overflow-hidden shadow-2xl ${t ? "bg-slate-900" : "bg-white"}`, children: /* @__PURE__ */ s("table", { className: "w-full", children: [
          /* @__PURE__ */ n("thead", { className: t ? "bg-slate-700" : "bg-gray-100", children: /* @__PURE__ */ s("tr", { children: [
            /* @__PURE__ */ n("th", { className: `p-4 text-left ${t ? "text-gray-300" : "text-gray-700"}` }),
            /* @__PURE__ */ n("th", { className: "p-4 text-center", children: /* @__PURE__ */ n("div", { className: "inline-block px-4 py-2 bg-yellow-400 text-gray-900 rounded-lg font-bold", children: "TAXIO" }) }),
            /* @__PURE__ */ n("th", { className: `p-4 text-center ${t ? "text-gray-400" : "text-gray-600"}`, children: "Other Platforms" })
          ] }) }),
          /* @__PURE__ */ s("tbody", { children: [
            /* @__PURE__ */ s("tr", { className: t ? "border-b border-gray-700" : "border-b border-gray-200", children: [
              /* @__PURE__ */ n("td", { className: `p-4 font-semibold ${t ? "text-gray-300" : "text-gray-700"}`, children: o.comparison.commission }),
              /* @__PURE__ */ n("td", { className: "p-4 text-center", children: /* @__PURE__ */ s("div", { className: "flex items-center justify-center gap-2", children: [
                /* @__PURE__ */ n(bt, { className: "w-5 h-5 text-green-500" }),
                /* @__PURE__ */ n("span", { className: `font-bold ${t ? "text-green-400" : "text-green-600"}`, children: o.comparison.taxora })
              ] }) }),
              /* @__PURE__ */ n("td", { className: "p-4 text-center", children: /* @__PURE__ */ s("div", { className: "flex items-center justify-center gap-2", children: [
                /* @__PURE__ */ n(yt, { className: "w-5 h-5 text-red-500" }),
                /* @__PURE__ */ n("span", { className: `${t ? "text-gray-400" : "text-gray-600"}`, children: o.comparison.others })
              ] }) })
            ] }),
            /* @__PURE__ */ s("tr", { className: t ? "border-b border-gray-700" : "border-b border-gray-200", children: [
              /* @__PURE__ */ n("td", { className: `p-4 font-semibold ${t ? "text-gray-300" : "text-gray-700"}`, children: o.comparison.website }),
              /* @__PURE__ */ n("td", { className: "p-4 text-center", children: /* @__PURE__ */ n(bt, { className: "w-6 h-6 mx-auto text-green-500" }) }),
              /* @__PURE__ */ n("td", { className: "p-4 text-center", children: /* @__PURE__ */ n(yt, { className: "w-6 h-6 mx-auto text-red-500" }) })
            ] }),
            /* @__PURE__ */ s("tr", { className: t ? "border-b border-gray-700" : "border-b border-gray-200", children: [
              /* @__PURE__ */ n("td", { className: `p-4 font-semibold ${t ? "text-gray-300" : "text-gray-700"}`, children: o.comparison.pricing }),
              /* @__PURE__ */ n("td", { className: "p-4 text-center", children: /* @__PURE__ */ n(bt, { className: "w-6 h-6 mx-auto text-green-500" }) }),
              /* @__PURE__ */ n("td", { className: "p-4 text-center", children: /* @__PURE__ */ n(yt, { className: "w-6 h-6 mx-auto text-red-500" }) })
            ] }),
            /* @__PURE__ */ s("tr", { className: t ? "border-b border-gray-700" : "border-b border-gray-200", children: [
              /* @__PURE__ */ n("td", { className: `p-4 font-semibold ${t ? "text-gray-300" : "text-gray-700"}`, children: o.comparison.contact }),
              /* @__PURE__ */ n("td", { className: "p-4 text-center", children: /* @__PURE__ */ n(bt, { className: "w-6 h-6 mx-auto text-green-500" }) }),
              /* @__PURE__ */ n("td", { className: "p-4 text-center", children: /* @__PURE__ */ n(yt, { className: "w-6 h-6 mx-auto text-red-500" }) })
            ] }),
            /* @__PURE__ */ s("tr", { children: [
              /* @__PURE__ */ n("td", { className: `p-4 font-semibold ${t ? "text-gray-300" : "text-gray-700"}`, children: o.comparison.cost }),
              /* @__PURE__ */ n("td", { className: "p-4 text-center", children: /* @__PURE__ */ n("span", { className: `font-bold ${t ? "text-yellow-400" : "text-yellow-600"}`, children: "€29/month" }) }),
              /* @__PURE__ */ n("td", { className: "p-4 text-center", children: /* @__PURE__ */ n("span", { className: `${t ? "text-gray-400" : "text-gray-600"}`, children: "€0 + 25% commission" }) })
            ] })
          ] })
        ] }) })
      ] }) }),
      /* @__PURE__ */ n("section", { className: `py-20 px-4 ${t ? "bg-slate-900" : "bg-white"}`, children: /* @__PURE__ */ s("div", { className: "container mx-auto max-w-6xl", children: [
        /* @__PURE__ */ n("div", { className: "text-center mb-16", children: /* @__PURE__ */ n("h2", { className: `text-4xl font-bold mb-4 ${t ? "text-white" : "text-gray-900"}`, children: o.featuresTitle }) }),
        /* @__PURE__ */ n("div", { className: "grid md:grid-cols-3 gap-8", children: o.features.map((l, u) => /* @__PURE__ */ n(ue, { className: `border-2 hover:border-yellow-400 transition-all ${t ? "bg-slate-800 border-slate-700" : "bg-white border-gray-200"}`, children: /* @__PURE__ */ s(Ee, { className: "pt-6", children: [
          /* @__PURE__ */ s("div", { className: "w-14 h-14 bg-yellow-400 rounded-xl flex items-center justify-center mb-4", children: [
            l.icon === "globe" && /* @__PURE__ */ n(ro, { className: "w-7 h-7 text-gray-900" }),
            l.icon === "credit" && /* @__PURE__ */ n(Va, { className: "w-7 h-7 text-gray-900" }),
            l.icon === "price" && /* @__PURE__ */ n(yg, { className: "w-7 h-7 text-gray-900" }),
            l.icon === "qr" && /* @__PURE__ */ n(Pi, { className: "w-7 h-7 text-gray-900" }),
            l.icon === "dashboard" && /* @__PURE__ */ n(_e, { className: "w-7 h-7 text-gray-900" }),
            l.icon === "support" && /* @__PURE__ */ n(Xn, { className: "w-7 h-7 text-gray-900" })
          ] }),
          /* @__PURE__ */ n("h3", { className: `text-xl font-bold mb-2 ${t ? "text-white" : "text-gray-900"}`, children: l.title }),
          /* @__PURE__ */ n("p", { className: t ? "text-gray-400" : "text-gray-600", children: l.desc })
        ] }) }, u)) })
      ] }) }),
      /* @__PURE__ */ n("section", { className: `py-20 px-4 ${t ? "bg-slate-800" : "bg-gray-50"}`, children: /* @__PURE__ */ s("div", { className: "container mx-auto max-w-6xl", children: [
        /* @__PURE__ */ s("div", { className: "text-center mb-12", children: [
          /* @__PURE__ */ n("h2", { className: `text-4xl font-bold mb-4 ${t ? "text-white" : "text-gray-900"}`, children: o.pricingTitle }),
          /* @__PURE__ */ n("p", { className: `text-xl ${t ? "text-gray-300" : "text-gray-600"}`, children: o.pricingDesc })
        ] }),
        /* @__PURE__ */ s("div", { className: "grid md:grid-cols-2 gap-8 max-w-5xl mx-auto", children: [
          /* @__PURE__ */ n(ue, { className: `border-2 shadow-xl transition-all hover:scale-105 ${t ? "bg-slate-900 border-slate-700" : "bg-white border-gray-200"}`, children: /* @__PURE__ */ s(Ee, { className: "pt-8 pb-8", children: [
            /* @__PURE__ */ s("div", { className: "text-center mb-6", children: [
              /* @__PURE__ */ n("div", { className: "inline-block px-4 py-2 bg-blue-500/10 text-blue-500 rounded-full font-bold text-sm mb-4", children: o.pricingBasic.badge }),
              /* @__PURE__ */ n("h3", { className: `text-3xl font-bold mb-2 ${t ? "text-white" : "text-gray-900"}`, children: o.pricingBasic.name }),
              /* @__PURE__ */ n("div", { className: `text-4xl font-bold mb-1 ${t ? "text-white" : "text-gray-900"}`, children: o.pricingBasic.price }),
              /* @__PURE__ */ n("p", { className: `text-sm ${t ? "text-gray-400" : "text-gray-600"}`, children: o.pricingBasic.period })
            ] }),
            /* @__PURE__ */ s("div", { className: "space-y-3 mb-6", children: [
              o.pricingBasic.features.map((l, u) => /* @__PURE__ */ s("div", { className: "flex items-center gap-3", children: [
                /* @__PURE__ */ n(bt, { className: "w-5 h-5 text-green-500 flex-shrink-0" }),
                /* @__PURE__ */ n("span", { className: t ? "text-gray-300" : "text-gray-700", children: l })
              ] }, u)),
              o.pricingBasic.notIncluded.map((l, u) => /* @__PURE__ */ s("div", { className: "flex items-center gap-3 opacity-50", children: [
                /* @__PURE__ */ n(yt, { className: "w-5 h-5 text-gray-400 flex-shrink-0" }),
                /* @__PURE__ */ n("span", { className: t ? "text-gray-400" : "text-gray-500", children: l })
              ] }, u))
            ] }),
            /* @__PURE__ */ n(Ve, { to: "/register", className: "block", children: /* @__PURE__ */ s(W, { size: "lg", variant: "outline", className: `w-full text-lg py-6 font-semibold border-2 ${t ? "border-gray-600 text-gray-300 hover:bg-slate-800" : "border-gray-300 text-gray-700 hover:bg-gray-50"}`, children: [
              o.registerCard.button,
              /* @__PURE__ */ n(Po, { className: "ml-2 w-5 h-5" })
            ] }) })
          ] }) }),
          /* @__PURE__ */ n(ue, { className: `border-4 border-yellow-400 shadow-2xl transition-all hover:scale-105 relative ${t ? "bg-slate-900" : "bg-white"}`, children: /* @__PURE__ */ s(Ee, { className: "pt-8 pb-8", children: [
            /* @__PURE__ */ s("div", { className: "text-center mb-6", children: [
              /* @__PURE__ */ n("div", { className: "inline-block px-4 py-2 bg-yellow-400 text-gray-900 rounded-full font-bold text-sm mb-4", children: o.pricingPremium.badge }),
              /* @__PURE__ */ n("h3", { className: `text-3xl font-bold mb-2 ${t ? "text-white" : "text-gray-900"}`, children: o.pricingPremium.name }),
              /* @__PURE__ */ n("div", { className: `text-4xl font-bold mb-1 ${t ? "text-white" : "text-gray-900"}`, children: o.pricingPremium.price }),
              /* @__PURE__ */ n("p", { className: `text-sm ${t ? "text-gray-400" : "text-gray-600"}`, children: o.pricingPremium.period })
            ] }),
            /* @__PURE__ */ n("div", { className: "space-y-3 mb-6", children: o.pricingPremium.features.map((l, u) => /* @__PURE__ */ s("div", { className: "flex items-center gap-3", children: [
              /* @__PURE__ */ n(bt, { className: "w-5 h-5 text-green-500 flex-shrink-0" }),
              /* @__PURE__ */ n("span", { className: t ? "text-gray-300" : "text-gray-700", children: l })
            ] }, u)) }),
            /* @__PURE__ */ n(Ve, { to: "/register", className: "block", children: /* @__PURE__ */ s(W, { size: "lg", className: "w-full text-lg py-6 bg-yellow-400 hover:bg-yellow-500 text-gray-900 font-semibold shadow-lg", children: [
              o.registerCard.button,
              /* @__PURE__ */ n(Po, { className: "ml-2 w-5 h-5" })
            ] }) })
          ] }) })
        ] })
      ] }) })
    ] }),
    /* @__PURE__ */ n("footer", { className: `py-8 px-4 ${t ? "bg-slate-950" : "bg-gray-900"}`, children: /* @__PURE__ */ n("div", { className: "container mx-auto max-w-6xl text-center", children: /* @__PURE__ */ n("p", { className: "text-gray-400 text-sm", children: o.copyright }) }) })
  ] });
}
function q({ className: e, type: t, ...r }) {
  return /* @__PURE__ */ n(
    "input",
    {
      type: t,
      "data-slot": "input",
      className: Oe(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input flex h-9 w-full min-w-0 rounded-md border px-3 py-1 text-base bg-input-background transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        e
      ),
      ...r
    }
  );
}
const vc = globalThis.__GLOBALS__.ReactDOM, { createPortal: bc, findDOMNode: Vx, flushSync: yc, hydrate: Hx, render: Gx, unmountComponentAtNode: Kx, unstable_batchedUpdates: Yx, unstable_renderSubtreeIntoContainer: qx, version: Xx } = globalThis.__GLOBALS__.ReactDOM;
var Rg = [
  "a",
  "button",
  "div",
  "form",
  "h2",
  "h3",
  "img",
  "input",
  "label",
  "li",
  "nav",
  "ol",
  "p",
  "span",
  "svg",
  "ul"
], $e = Rg.reduce((e, t) => {
  const r = Q((a, i) => {
    const { asChild: o, ...l } = a, u = o ? kr : t;
    return typeof window < "u" && (window[Symbol.for("radix-ui")] = !0), /* @__PURE__ */ n(u, { ...l, ref: i });
  });
  return r.displayName = `Primitive.${t}`, { ...e, [t]: r };
}, {});
function Tg(e, t) {
  e && yc(() => e.dispatchEvent(t));
}
var Ag = "Label", xc = Q((e, t) => /* @__PURE__ */ n(
  $e.label,
  {
    ...e,
    ref: t,
    onMouseDown: (r) => {
      r.target.closest("button, input, select, textarea") || (e.onMouseDown?.(r), !r.defaultPrevented && r.detail > 1 && r.preventDefault());
    }
  }
));
xc.displayName = Ag;
var Dg = xc;
function X({
  className: e,
  ...t
}) {
  return /* @__PURE__ */ n(
    Dg,
    {
      "data-slot": "label",
      className: Oe(
        "flex items-center gap-2 text-sm leading-none font-medium select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        e
      ),
      ...t
    }
  );
}
function Mg(e, t) {
  const r = et(t), a = (o) => {
    const { children: l, ...u } = o, c = He(() => u, Object.values(u));
    return /* @__PURE__ */ n(r.Provider, { value: c, children: l });
  };
  a.displayName = e + "Provider";
  function i(o) {
    const l = ke(r);
    if (l) return l;
    if (t !== void 0) return t;
    throw new Error(`\`${o}\` must be used within \`${e}\``);
  }
  return [a, i];
}
function Kr(e, t = []) {
  let r = [];
  function a(o, l) {
    const u = et(l), c = r.length;
    r = [...r, l];
    const d = (m) => {
      const { scope: f, children: g, ...p } = m, v = f?.[e]?.[c] || u, b = He(() => p, Object.values(p));
      return /* @__PURE__ */ n(v.Provider, { value: b, children: g });
    };
    d.displayName = o + "Provider";
    function h(m, f) {
      const g = f?.[e]?.[c] || u, p = ke(g);
      if (p) return p;
      if (l !== void 0) return l;
      throw new Error(`\`${m}\` must be used within \`${o}\``);
    }
    return [d, h];
  }
  const i = () => {
    const o = r.map((l) => et(l));
    return function(u) {
      const c = u?.[e] || o;
      return He(
        () => ({ [`__scope${e}`]: { ...u, [e]: c } }),
        [u, c]
      );
    };
  };
  return i.scopeName = e, [a, Ig(i, ...t)];
}
function Ig(...e) {
  const t = e[0];
  if (e.length === 1) return t;
  const r = () => {
    const a = e.map((i) => ({
      useScope: i(),
      scopeName: i.scopeName
    }));
    return function(o) {
      const l = a.reduce((u, { useScope: c, scopeName: d }) => {
        const m = c(o)[`__scope${d}`];
        return { ...u, ...m };
      }, {});
      return He(() => ({ [`__scope${t.scopeName}`]: l }), [l]);
    };
  };
  return r.scopeName = t.scopeName, r;
}
function De(e, t, { checkForDefaultPrevented: r = !0 } = {}) {
  return function(i) {
    if (e?.(i), r === !1 || !i.defaultPrevented)
      return t?.(i);
  };
}
function Yt(e) {
  const t = ve(e);
  return xe(() => {
    t.current = e;
  }), He(() => (...r) => t.current?.(...r), []);
}
function dn({
  prop: e,
  defaultProp: t,
  onChange: r = () => {
  }
}) {
  const [a, i] = Og({ defaultProp: t, onChange: r }), o = e !== void 0, l = o ? e : a, u = Yt(r), c = Ae(
    (d) => {
      if (o) {
        const m = typeof d == "function" ? d(e) : d;
        m !== e && u(m);
      } else
        i(d);
    },
    [o, e, i, u]
  );
  return [l, c];
}
function Og({
  defaultProp: e,
  onChange: t
}) {
  const r = j(e), [a] = r, i = ve(a), o = Yt(t);
  return xe(() => {
    i.current !== a && (o(a), i.current = a);
  }, [a, i, o]), r;
}
function wc(e) {
  const t = ve({ value: e, previous: e });
  return He(() => (t.current.value !== e && (t.current.previous = t.current.value, t.current.value = e), t.current.previous), [e]);
}
var ft = globalThis?.document ? hn : () => {
};
function Nc(e) {
  const [t, r] = j(void 0);
  return ft(() => {
    if (e) {
      r({ width: e.offsetWidth, height: e.offsetHeight });
      const a = new ResizeObserver((i) => {
        if (!Array.isArray(i) || !i.length)
          return;
        const o = i[0];
        let l, u;
        if ("borderBoxSize" in o) {
          const c = o.borderBoxSize, d = Array.isArray(c) ? c[0] : c;
          l = d.inlineSize, u = d.blockSize;
        } else
          l = e.offsetWidth, u = e.offsetHeight;
        r({ width: l, height: u });
      });
      return a.observe(e, { box: "border-box" }), () => a.unobserve(e);
    } else
      r(void 0);
  }, [e]), t;
}
function $g(e, t) {
  return vl((r, a) => t[r][a] ?? r, e);
}
var bn = (e) => {
  const { present: t, children: r } = e, a = Lg(t), i = typeof r == "function" ? r({ present: a.isPresent }) : Vt.only(r), o = Ke(a.ref, _g(i));
  return typeof r == "function" || a.isPresent ? mn(i, { ref: o }) : null;
};
bn.displayName = "Presence";
function Lg(e) {
  const [t, r] = j(), a = ve({}), i = ve(e), o = ve("none"), l = e ? "mounted" : "unmounted", [u, c] = $g(l, {
    mounted: {
      UNMOUNT: "unmounted",
      ANIMATION_OUT: "unmountSuspended"
    },
    unmountSuspended: {
      MOUNT: "mounted",
      ANIMATION_END: "unmounted"
    },
    unmounted: {
      MOUNT: "mounted"
    }
  });
  return xe(() => {
    const d = Ra(a.current);
    o.current = u === "mounted" ? d : "none";
  }, [u]), ft(() => {
    const d = a.current, h = i.current;
    if (h !== e) {
      const f = o.current, g = Ra(d);
      e ? c("MOUNT") : g === "none" || d?.display === "none" ? c("UNMOUNT") : c(h && f !== g ? "ANIMATION_OUT" : "UNMOUNT"), i.current = e;
    }
  }, [e, c]), ft(() => {
    if (t) {
      let d;
      const h = t.ownerDocument.defaultView ?? window, m = (g) => {
        const v = Ra(a.current).includes(g.animationName);
        if (g.target === t && v && (c("ANIMATION_END"), !i.current)) {
          const b = t.style.animationFillMode;
          t.style.animationFillMode = "forwards", d = h.setTimeout(() => {
            t.style.animationFillMode === "forwards" && (t.style.animationFillMode = b);
          });
        }
      }, f = (g) => {
        g.target === t && (o.current = Ra(a.current));
      };
      return t.addEventListener("animationstart", f), t.addEventListener("animationcancel", m), t.addEventListener("animationend", m), () => {
        h.clearTimeout(d), t.removeEventListener("animationstart", f), t.removeEventListener("animationcancel", m), t.removeEventListener("animationend", m);
      };
    } else
      c("ANIMATION_END");
  }, [t, c]), {
    isPresent: ["mounted", "unmountSuspended"].includes(u),
    ref: Ae((d) => {
      d && (a.current = getComputedStyle(d)), r(d);
    }, [])
  };
}
function Ra(e) {
  return e?.animationName || "none";
}
function _g(e) {
  let t = Object.getOwnPropertyDescriptor(e.props, "ref")?.get, r = t && "isReactWarning" in t && t.isReactWarning;
  return r ? e.ref : (t = Object.getOwnPropertyDescriptor(e, "ref")?.get, r = t && "isReactWarning" in t && t.isReactWarning, r ? e.props.ref : e.props.ref || e.ref);
}
var Ri = "Checkbox", [Bg] = Kr(Ri), [Fg, zg] = Bg(Ri), Cc = Q(
  (e, t) => {
    const {
      __scopeCheckbox: r,
      name: a,
      checked: i,
      defaultChecked: o,
      required: l,
      disabled: u,
      value: c = "on",
      onCheckedChange: d,
      form: h,
      ...m
    } = e, [f, g] = j(null), p = Ke(t, (N) => g(N)), v = ve(!1), b = f ? h || !!f.closest("form") : !0, [w = !1, y] = dn({
      prop: i,
      defaultProp: o,
      onChange: d
    }), k = ve(w);
    return xe(() => {
      const N = f?.form;
      if (N) {
        const T = () => y(k.current);
        return N.addEventListener("reset", T), () => N.removeEventListener("reset", T);
      }
    }, [f, y]), /* @__PURE__ */ s(Fg, { scope: r, state: w, disabled: u, children: [
      /* @__PURE__ */ n(
        $e.button,
        {
          type: "button",
          role: "checkbox",
          "aria-checked": wr(w) ? "mixed" : w,
          "aria-required": l,
          "data-state": Ec(w),
          "data-disabled": u ? "" : void 0,
          disabled: u,
          value: c,
          ...m,
          ref: p,
          onKeyDown: De(e.onKeyDown, (N) => {
            N.key === "Enter" && N.preventDefault();
          }),
          onClick: De(e.onClick, (N) => {
            y((T) => wr(T) ? !0 : !T), b && (v.current = N.isPropagationStopped(), v.current || N.stopPropagation());
          })
        }
      ),
      b && /* @__PURE__ */ n(
        jg,
        {
          control: f,
          bubbles: !v.current,
          name: a,
          value: c,
          checked: w,
          required: l,
          disabled: u,
          form: h,
          style: { transform: "translateX(-100%)" },
          defaultChecked: wr(o) ? !1 : o
        }
      )
    ] });
  }
);
Cc.displayName = Ri;
var kc = "CheckboxIndicator", Sc = Q(
  (e, t) => {
    const { __scopeCheckbox: r, forceMount: a, ...i } = e, o = zg(kc, r);
    return /* @__PURE__ */ n(bn, { present: a || wr(o.state) || o.state === !0, children: /* @__PURE__ */ n(
      $e.span,
      {
        "data-state": Ec(o.state),
        "data-disabled": o.disabled ? "" : void 0,
        ...i,
        ref: t,
        style: { pointerEvents: "none", ...e.style }
      }
    ) });
  }
);
Sc.displayName = kc;
var jg = (e) => {
  const { control: t, checked: r, bubbles: a = !0, defaultChecked: i, ...o } = e, l = ve(null), u = wc(r), c = Nc(t);
  xe(() => {
    const h = l.current, m = window.HTMLInputElement.prototype, g = Object.getOwnPropertyDescriptor(m, "checked").set;
    if (u !== r && g) {
      const p = new Event("click", { bubbles: a });
      h.indeterminate = wr(r), g.call(h, wr(r) ? !1 : r), h.dispatchEvent(p);
    }
  }, [u, r, a]);
  const d = ve(wr(r) ? !1 : r);
  return /* @__PURE__ */ n(
    "input",
    {
      type: "checkbox",
      "aria-hidden": !0,
      defaultChecked: i ?? d.current,
      ...o,
      tabIndex: -1,
      ref: l,
      style: {
        ...e.style,
        ...c,
        position: "absolute",
        pointerEvents: "none",
        opacity: 0,
        margin: 0
      }
    }
  );
};
function wr(e) {
  return e === "indeterminate";
}
function Ec(e) {
  return wr(e) ? "indeterminate" : e ? "checked" : "unchecked";
}
var Wg = Cc, Ug = Sc;
function Pc({
  className: e,
  ...t
}) {
  return /* @__PURE__ */ n(
    Wg,
    {
      "data-slot": "checkbox",
      className: Oe(
        "peer border bg-input-background dark:bg-input/30 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground dark:data-[state=checked]:bg-primary data-[state=checked]:border-primary focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive size-4 shrink-0 rounded-[4px] border shadow-xs transition-shadow outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50",
        e
      ),
      ...t,
      children: /* @__PURE__ */ n(
        Ug,
        {
          "data-slot": "checkbox-indicator",
          className: "flex items-center justify-center text-current transition-none",
          children: /* @__PURE__ */ n(bt, { className: "size-3.5" })
        }
      )
    }
  );
}
function Vg(e) {
  if (typeof document > "u") return;
  let t = document.head || document.getElementsByTagName("head")[0], r = document.createElement("style");
  r.type = "text/css", t.appendChild(r), r.styleSheet ? r.styleSheet.cssText = e : r.appendChild(document.createTextNode(e));
}
const Hg = (e) => {
  switch (e) {
    case "success":
      return Yg;
    case "info":
      return Xg;
    case "warning":
      return qg;
    case "error":
      return Qg;
    default:
      return null;
  }
}, Gg = Array(12).fill(0), Kg = ({ visible: e, className: t }) => /* @__PURE__ */ B.createElement("div", {
  className: [
    "sonner-loading-wrapper",
    t
  ].filter(Boolean).join(" "),
  "data-visible": e
}, /* @__PURE__ */ B.createElement("div", {
  className: "sonner-spinner"
}, Gg.map((r, a) => /* @__PURE__ */ B.createElement("div", {
  className: "sonner-loading-bar",
  key: `spinner-bar-${a}`
})))), Yg = /* @__PURE__ */ B.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 20 20",
  fill: "currentColor",
  height: "20",
  width: "20"
}, /* @__PURE__ */ B.createElement("path", {
  fillRule: "evenodd",
  d: "M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z",
  clipRule: "evenodd"
})), qg = /* @__PURE__ */ B.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "currentColor",
  height: "20",
  width: "20"
}, /* @__PURE__ */ B.createElement("path", {
  fillRule: "evenodd",
  d: "M9.401 3.003c1.155-2 4.043-2 5.197 0l7.355 12.748c1.154 2-.29 4.5-2.599 4.5H4.645c-2.309 0-3.752-2.5-2.598-4.5L9.4 3.003zM12 8.25a.75.75 0 01.75.75v3.75a.75.75 0 01-1.5 0V9a.75.75 0 01.75-.75zm0 8.25a.75.75 0 100-1.5.75.75 0 000 1.5z",
  clipRule: "evenodd"
})), Xg = /* @__PURE__ */ B.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 20 20",
  fill: "currentColor",
  height: "20",
  width: "20"
}, /* @__PURE__ */ B.createElement("path", {
  fillRule: "evenodd",
  d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z",
  clipRule: "evenodd"
})), Qg = /* @__PURE__ */ B.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 20 20",
  fill: "currentColor",
  height: "20",
  width: "20"
}, /* @__PURE__ */ B.createElement("path", {
  fillRule: "evenodd",
  d: "M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-5a.75.75 0 01.75.75v4.5a.75.75 0 01-1.5 0v-4.5A.75.75 0 0110 5zm0 10a1 1 0 100-2 1 1 0 000 2z",
  clipRule: "evenodd"
})), Jg = /* @__PURE__ */ B.createElement("svg", {
  xmlns: "http://www.w3.org/2000/svg",
  width: "12",
  height: "12",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: "1.5",
  strokeLinecap: "round",
  strokeLinejoin: "round"
}, /* @__PURE__ */ B.createElement("line", {
  x1: "18",
  y1: "6",
  x2: "6",
  y2: "18"
}), /* @__PURE__ */ B.createElement("line", {
  x1: "6",
  y1: "6",
  x2: "18",
  y2: "18"
})), Zg = () => {
  const [e, t] = B.useState(document.hidden);
  return B.useEffect(() => {
    const r = () => {
      t(document.hidden);
    };
    return document.addEventListener("visibilitychange", r), () => window.removeEventListener("visibilitychange", r);
  }, []), e;
};
let qo = 1;
class e0 {
  constructor() {
    this.subscribe = (t) => (this.subscribers.push(t), () => {
      const r = this.subscribers.indexOf(t);
      this.subscribers.splice(r, 1);
    }), this.publish = (t) => {
      this.subscribers.forEach((r) => r(t));
    }, this.addToast = (t) => {
      this.publish(t), this.toasts = [
        ...this.toasts,
        t
      ];
    }, this.create = (t) => {
      var r;
      const { message: a, ...i } = t, o = typeof t?.id == "number" || ((r = t.id) == null ? void 0 : r.length) > 0 ? t.id : qo++, l = this.toasts.find((c) => c.id === o), u = t.dismissible === void 0 ? !0 : t.dismissible;
      return this.dismissedToasts.has(o) && this.dismissedToasts.delete(o), l ? this.toasts = this.toasts.map((c) => c.id === o ? (this.publish({
        ...c,
        ...t,
        id: o,
        title: a
      }), {
        ...c,
        ...t,
        id: o,
        dismissible: u,
        title: a
      }) : c) : this.addToast({
        title: a,
        ...i,
        dismissible: u,
        id: o
      }), o;
    }, this.dismiss = (t) => (t ? (this.dismissedToasts.add(t), requestAnimationFrame(() => this.subscribers.forEach((r) => r({
      id: t,
      dismiss: !0
    })))) : this.toasts.forEach((r) => {
      this.subscribers.forEach((a) => a({
        id: r.id,
        dismiss: !0
      }));
    }), t), this.message = (t, r) => this.create({
      ...r,
      message: t
    }), this.error = (t, r) => this.create({
      ...r,
      message: t,
      type: "error"
    }), this.success = (t, r) => this.create({
      ...r,
      type: "success",
      message: t
    }), this.info = (t, r) => this.create({
      ...r,
      type: "info",
      message: t
    }), this.warning = (t, r) => this.create({
      ...r,
      type: "warning",
      message: t
    }), this.loading = (t, r) => this.create({
      ...r,
      type: "loading",
      message: t
    }), this.promise = (t, r) => {
      if (!r)
        return;
      let a;
      r.loading !== void 0 && (a = this.create({
        ...r,
        promise: t,
        type: "loading",
        message: r.loading,
        description: typeof r.description != "function" ? r.description : void 0
      }));
      const i = Promise.resolve(t instanceof Function ? t() : t);
      let o = a !== void 0, l;
      const u = i.then(async (d) => {
        if (l = [
          "resolve",
          d
        ], B.isValidElement(d))
          o = !1, this.create({
            id: a,
            type: "default",
            message: d
          });
        else if (r0(d) && !d.ok) {
          o = !1;
          const m = typeof r.error == "function" ? await r.error(`HTTP error! status: ${d.status}`) : r.error, f = typeof r.description == "function" ? await r.description(`HTTP error! status: ${d.status}`) : r.description, p = typeof m == "object" && !B.isValidElement(m) ? m : {
            message: m
          };
          this.create({
            id: a,
            type: "error",
            description: f,
            ...p
          });
        } else if (d instanceof Error) {
          o = !1;
          const m = typeof r.error == "function" ? await r.error(d) : r.error, f = typeof r.description == "function" ? await r.description(d) : r.description, p = typeof m == "object" && !B.isValidElement(m) ? m : {
            message: m
          };
          this.create({
            id: a,
            type: "error",
            description: f,
            ...p
          });
        } else if (r.success !== void 0) {
          o = !1;
          const m = typeof r.success == "function" ? await r.success(d) : r.success, f = typeof r.description == "function" ? await r.description(d) : r.description, p = typeof m == "object" && !B.isValidElement(m) ? m : {
            message: m
          };
          this.create({
            id: a,
            type: "success",
            description: f,
            ...p
          });
        }
      }).catch(async (d) => {
        if (l = [
          "reject",
          d
        ], r.error !== void 0) {
          o = !1;
          const h = typeof r.error == "function" ? await r.error(d) : r.error, m = typeof r.description == "function" ? await r.description(d) : r.description, g = typeof h == "object" && !B.isValidElement(h) ? h : {
            message: h
          };
          this.create({
            id: a,
            type: "error",
            description: m,
            ...g
          });
        }
      }).finally(() => {
        o && (this.dismiss(a), a = void 0), r.finally == null || r.finally.call(r);
      }), c = () => new Promise((d, h) => u.then(() => l[0] === "reject" ? h(l[1]) : d(l[1])).catch(h));
      return typeof a != "string" && typeof a != "number" ? {
        unwrap: c
      } : Object.assign(a, {
        unwrap: c
      });
    }, this.custom = (t, r) => {
      const a = r?.id || qo++;
      return this.create({
        jsx: t(a),
        id: a,
        ...r
      }), a;
    }, this.getActiveToasts = () => this.toasts.filter((t) => !this.dismissedToasts.has(t.id)), this.subscribers = [], this.toasts = [], this.dismissedToasts = /* @__PURE__ */ new Set();
  }
}
const gt = new e0(), t0 = (e, t) => {
  const r = t?.id || qo++;
  return gt.addToast({
    title: e,
    ...t,
    id: r
  }), r;
}, r0 = (e) => e && typeof e == "object" && "ok" in e && typeof e.ok == "boolean" && "status" in e && typeof e.status == "number", n0 = t0, a0 = () => gt.toasts, o0 = () => gt.getActiveToasts(), de = Object.assign(n0, {
  success: gt.success,
  info: gt.info,
  warning: gt.warning,
  error: gt.error,
  custom: gt.custom,
  message: gt.message,
  promise: gt.promise,
  dismiss: gt.dismiss,
  loading: gt.loading
}, {
  getHistory: a0,
  getToasts: o0
});
Vg("[data-sonner-toaster][dir=ltr],html[dir=ltr]{--toast-icon-margin-start:-3px;--toast-icon-margin-end:4px;--toast-svg-margin-start:-1px;--toast-svg-margin-end:0px;--toast-button-margin-start:auto;--toast-button-margin-end:0;--toast-close-button-start:0;--toast-close-button-end:unset;--toast-close-button-transform:translate(-35%, -35%)}[data-sonner-toaster][dir=rtl],html[dir=rtl]{--toast-icon-margin-start:4px;--toast-icon-margin-end:-3px;--toast-svg-margin-start:0px;--toast-svg-margin-end:-1px;--toast-button-margin-start:0;--toast-button-margin-end:auto;--toast-close-button-start:unset;--toast-close-button-end:0;--toast-close-button-transform:translate(35%, -35%)}[data-sonner-toaster]{position:fixed;width:var(--width);font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica Neue,Arial,Noto Sans,sans-serif,Apple Color Emoji,Segoe UI Emoji,Segoe UI Symbol,Noto Color Emoji;--gray1:hsl(0, 0%, 99%);--gray2:hsl(0, 0%, 97.3%);--gray3:hsl(0, 0%, 95.1%);--gray4:hsl(0, 0%, 93%);--gray5:hsl(0, 0%, 90.9%);--gray6:hsl(0, 0%, 88.7%);--gray7:hsl(0, 0%, 85.8%);--gray8:hsl(0, 0%, 78%);--gray9:hsl(0, 0%, 56.1%);--gray10:hsl(0, 0%, 52.3%);--gray11:hsl(0, 0%, 43.5%);--gray12:hsl(0, 0%, 9%);--border-radius:8px;box-sizing:border-box;padding:0;margin:0;list-style:none;outline:0;z-index:999999999;transition:transform .4s ease}[data-sonner-toaster][data-lifted=true]{transform:translateY(-8px)}@media (hover:none) and (pointer:coarse){[data-sonner-toaster][data-lifted=true]{transform:none}}[data-sonner-toaster][data-x-position=right]{right:var(--offset-right)}[data-sonner-toaster][data-x-position=left]{left:var(--offset-left)}[data-sonner-toaster][data-x-position=center]{left:50%;transform:translateX(-50%)}[data-sonner-toaster][data-y-position=top]{top:var(--offset-top)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--offset-bottom)}[data-sonner-toast]{--y:translateY(100%);--lift-amount:calc(var(--lift) * var(--gap));z-index:var(--z-index);position:absolute;opacity:0;transform:var(--y);touch-action:none;transition:transform .4s,opacity .4s,height .4s,box-shadow .2s;box-sizing:border-box;outline:0;overflow-wrap:anywhere}[data-sonner-toast][data-styled=true]{padding:16px;background:var(--normal-bg);border:1px solid var(--normal-border);color:var(--normal-text);border-radius:var(--border-radius);box-shadow:0 4px 12px rgba(0,0,0,.1);width:var(--width);font-size:13px;display:flex;align-items:center;gap:6px}[data-sonner-toast]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-y-position=top]{top:0;--y:translateY(-100%);--lift:1;--lift-amount:calc(1 * var(--gap))}[data-sonner-toast][data-y-position=bottom]{bottom:0;--y:translateY(100%);--lift:-1;--lift-amount:calc(var(--lift) * var(--gap))}[data-sonner-toast][data-styled=true] [data-description]{font-weight:400;line-height:1.4;color:#3f3f3f}[data-rich-colors=true][data-sonner-toast][data-styled=true] [data-description]{color:inherit}[data-sonner-toaster][data-sonner-theme=dark] [data-description]{color:#e8e8e8}[data-sonner-toast][data-styled=true] [data-title]{font-weight:500;line-height:1.5;color:inherit}[data-sonner-toast][data-styled=true] [data-icon]{display:flex;height:16px;width:16px;position:relative;justify-content:flex-start;align-items:center;flex-shrink:0;margin-left:var(--toast-icon-margin-start);margin-right:var(--toast-icon-margin-end)}[data-sonner-toast][data-promise=true] [data-icon]>svg{opacity:0;transform:scale(.8);transform-origin:center;animation:sonner-fade-in .3s ease forwards}[data-sonner-toast][data-styled=true] [data-icon]>*{flex-shrink:0}[data-sonner-toast][data-styled=true] [data-icon] svg{margin-left:var(--toast-svg-margin-start);margin-right:var(--toast-svg-margin-end)}[data-sonner-toast][data-styled=true] [data-content]{display:flex;flex-direction:column;gap:2px}[data-sonner-toast][data-styled=true] [data-button]{border-radius:4px;padding-left:8px;padding-right:8px;height:24px;font-size:12px;color:var(--normal-bg);background:var(--normal-text);margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end);border:none;font-weight:500;cursor:pointer;outline:0;display:flex;align-items:center;flex-shrink:0;transition:opacity .4s,box-shadow .2s}[data-sonner-toast][data-styled=true] [data-button]:focus-visible{box-shadow:0 0 0 2px rgba(0,0,0,.4)}[data-sonner-toast][data-styled=true] [data-button]:first-of-type{margin-left:var(--toast-button-margin-start);margin-right:var(--toast-button-margin-end)}[data-sonner-toast][data-styled=true] [data-cancel]{color:var(--normal-text);background:rgba(0,0,0,.08)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-styled=true] [data-cancel]{background:rgba(255,255,255,.3)}[data-sonner-toast][data-styled=true] [data-close-button]{position:absolute;left:var(--toast-close-button-start);right:var(--toast-close-button-end);top:0;height:20px;width:20px;display:flex;justify-content:center;align-items:center;padding:0;color:var(--gray12);background:var(--normal-bg);border:1px solid var(--gray4);transform:var(--toast-close-button-transform);border-radius:50%;cursor:pointer;z-index:1;transition:opacity .1s,background .2s,border-color .2s}[data-sonner-toast][data-styled=true] [data-close-button]:focus-visible{box-shadow:0 4px 12px rgba(0,0,0,.1),0 0 0 2px rgba(0,0,0,.2)}[data-sonner-toast][data-styled=true] [data-disabled=true]{cursor:not-allowed}[data-sonner-toast][data-styled=true]:hover [data-close-button]:hover{background:var(--gray2);border-color:var(--gray5)}[data-sonner-toast][data-swiping=true]::before{content:'';position:absolute;left:-100%;right:-100%;height:100%;z-index:-1}[data-sonner-toast][data-y-position=top][data-swiping=true]::before{bottom:50%;transform:scaleY(3) translateY(50%)}[data-sonner-toast][data-y-position=bottom][data-swiping=true]::before{top:50%;transform:scaleY(3) translateY(-50%)}[data-sonner-toast][data-swiping=false][data-removed=true]::before{content:'';position:absolute;inset:0;transform:scaleY(2)}[data-sonner-toast][data-expanded=true]::after{content:'';position:absolute;left:0;height:calc(var(--gap) + 1px);bottom:100%;width:100%}[data-sonner-toast][data-mounted=true]{--y:translateY(0);opacity:1}[data-sonner-toast][data-expanded=false][data-front=false]{--scale:var(--toasts-before) * 0.05 + 1;--y:translateY(calc(var(--lift-amount) * var(--toasts-before))) scale(calc(-1 * var(--scale)));height:var(--front-toast-height)}[data-sonner-toast]>*{transition:opacity .4s}[data-sonner-toast][data-x-position=right]{right:0}[data-sonner-toast][data-x-position=left]{left:0}[data-sonner-toast][data-expanded=false][data-front=false][data-styled=true]>*{opacity:0}[data-sonner-toast][data-visible=false]{opacity:0;pointer-events:none}[data-sonner-toast][data-mounted=true][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset)));height:var(--initial-height)}[data-sonner-toast][data-removed=true][data-front=true][data-swipe-out=false]{--y:translateY(calc(var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=true]{--y:translateY(calc(var(--lift) * var(--offset) + var(--lift) * -100%));opacity:0}[data-sonner-toast][data-removed=true][data-front=false][data-swipe-out=false][data-expanded=false]{--y:translateY(40%);opacity:0;transition:transform .5s,opacity .2s}[data-sonner-toast][data-removed=true][data-front=false]::before{height:calc(var(--initial-height) + 20%)}[data-sonner-toast][data-swiping=true]{transform:var(--y) translateY(var(--swipe-amount-y,0)) translateX(var(--swipe-amount-x,0));transition:none}[data-sonner-toast][data-swiped=true]{user-select:none}[data-sonner-toast][data-swipe-out=true][data-y-position=bottom],[data-sonner-toast][data-swipe-out=true][data-y-position=top]{animation-duration:.2s;animation-timing-function:ease-out;animation-fill-mode:forwards}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=left]{animation-name:swipe-out-left}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=right]{animation-name:swipe-out-right}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=up]{animation-name:swipe-out-up}[data-sonner-toast][data-swipe-out=true][data-swipe-direction=down]{animation-name:swipe-out-down}@keyframes swipe-out-left{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) - 100%));opacity:0}}@keyframes swipe-out-right{from{transform:var(--y) translateX(var(--swipe-amount-x));opacity:1}to{transform:var(--y) translateX(calc(var(--swipe-amount-x) + 100%));opacity:0}}@keyframes swipe-out-up{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) - 100%));opacity:0}}@keyframes swipe-out-down{from{transform:var(--y) translateY(var(--swipe-amount-y));opacity:1}to{transform:var(--y) translateY(calc(var(--swipe-amount-y) + 100%));opacity:0}}@media (max-width:600px){[data-sonner-toaster]{position:fixed;right:var(--mobile-offset-right);left:var(--mobile-offset-left);width:100%}[data-sonner-toaster][dir=rtl]{left:calc(var(--mobile-offset-left) * -1)}[data-sonner-toaster] [data-sonner-toast]{left:0;right:0;width:calc(100% - var(--mobile-offset-left) * 2)}[data-sonner-toaster][data-x-position=left]{left:var(--mobile-offset-left)}[data-sonner-toaster][data-y-position=bottom]{bottom:var(--mobile-offset-bottom)}[data-sonner-toaster][data-y-position=top]{top:var(--mobile-offset-top)}[data-sonner-toaster][data-x-position=center]{left:var(--mobile-offset-left);right:var(--mobile-offset-right);transform:none}}[data-sonner-toaster][data-sonner-theme=light]{--normal-bg:#fff;--normal-border:var(--gray4);--normal-text:var(--gray12);--success-bg:hsl(143, 85%, 96%);--success-border:hsl(145, 92%, 87%);--success-text:hsl(140, 100%, 27%);--info-bg:hsl(208, 100%, 97%);--info-border:hsl(221, 91%, 93%);--info-text:hsl(210, 92%, 45%);--warning-bg:hsl(49, 100%, 97%);--warning-border:hsl(49, 91%, 84%);--warning-text:hsl(31, 92%, 45%);--error-bg:hsl(359, 100%, 97%);--error-border:hsl(359, 100%, 94%);--error-text:hsl(360, 100%, 45%)}[data-sonner-toaster][data-sonner-theme=light] [data-sonner-toast][data-invert=true]{--normal-bg:#000;--normal-border:hsl(0, 0%, 20%);--normal-text:var(--gray1)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast][data-invert=true]{--normal-bg:#fff;--normal-border:var(--gray3);--normal-text:var(--gray12)}[data-sonner-toaster][data-sonner-theme=dark]{--normal-bg:#000;--normal-bg-hover:hsl(0, 0%, 12%);--normal-border:hsl(0, 0%, 20%);--normal-border-hover:hsl(0, 0%, 25%);--normal-text:var(--gray1);--success-bg:hsl(150, 100%, 6%);--success-border:hsl(147, 100%, 12%);--success-text:hsl(150, 86%, 65%);--info-bg:hsl(215, 100%, 6%);--info-border:hsl(223, 43%, 17%);--info-text:hsl(216, 87%, 65%);--warning-bg:hsl(64, 100%, 6%);--warning-border:hsl(60, 100%, 9%);--warning-text:hsl(46, 87%, 65%);--error-bg:hsl(358, 76%, 10%);--error-border:hsl(357, 89%, 16%);--error-text:hsl(358, 100%, 81%)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]{background:var(--normal-bg);border-color:var(--normal-border);color:var(--normal-text)}[data-sonner-toaster][data-sonner-theme=dark] [data-sonner-toast] [data-close-button]:hover{background:var(--normal-bg-hover);border-color:var(--normal-border-hover)}[data-rich-colors=true][data-sonner-toast][data-type=success]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=success] [data-close-button]{background:var(--success-bg);border-color:var(--success-border);color:var(--success-text)}[data-rich-colors=true][data-sonner-toast][data-type=info]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=info] [data-close-button]{background:var(--info-bg);border-color:var(--info-border);color:var(--info-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=warning] [data-close-button]{background:var(--warning-bg);border-color:var(--warning-border);color:var(--warning-text)}[data-rich-colors=true][data-sonner-toast][data-type=error]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}[data-rich-colors=true][data-sonner-toast][data-type=error] [data-close-button]{background:var(--error-bg);border-color:var(--error-border);color:var(--error-text)}.sonner-loading-wrapper{--size:16px;height:var(--size);width:var(--size);position:absolute;inset:0;z-index:10}.sonner-loading-wrapper[data-visible=false]{transform-origin:center;animation:sonner-fade-out .2s ease forwards}.sonner-spinner{position:relative;top:50%;left:50%;height:var(--size);width:var(--size)}.sonner-loading-bar{animation:sonner-spin 1.2s linear infinite;background:var(--gray11);border-radius:6px;height:8%;left:-10%;position:absolute;top:-3.9%;width:24%}.sonner-loading-bar:first-child{animation-delay:-1.2s;transform:rotate(.0001deg) translate(146%)}.sonner-loading-bar:nth-child(2){animation-delay:-1.1s;transform:rotate(30deg) translate(146%)}.sonner-loading-bar:nth-child(3){animation-delay:-1s;transform:rotate(60deg) translate(146%)}.sonner-loading-bar:nth-child(4){animation-delay:-.9s;transform:rotate(90deg) translate(146%)}.sonner-loading-bar:nth-child(5){animation-delay:-.8s;transform:rotate(120deg) translate(146%)}.sonner-loading-bar:nth-child(6){animation-delay:-.7s;transform:rotate(150deg) translate(146%)}.sonner-loading-bar:nth-child(7){animation-delay:-.6s;transform:rotate(180deg) translate(146%)}.sonner-loading-bar:nth-child(8){animation-delay:-.5s;transform:rotate(210deg) translate(146%)}.sonner-loading-bar:nth-child(9){animation-delay:-.4s;transform:rotate(240deg) translate(146%)}.sonner-loading-bar:nth-child(10){animation-delay:-.3s;transform:rotate(270deg) translate(146%)}.sonner-loading-bar:nth-child(11){animation-delay:-.2s;transform:rotate(300deg) translate(146%)}.sonner-loading-bar:nth-child(12){animation-delay:-.1s;transform:rotate(330deg) translate(146%)}@keyframes sonner-fade-in{0%{opacity:0;transform:scale(.8)}100%{opacity:1;transform:scale(1)}}@keyframes sonner-fade-out{0%{opacity:1;transform:scale(1)}100%{opacity:0;transform:scale(.8)}}@keyframes sonner-spin{0%{opacity:1}100%{opacity:.15}}@media (prefers-reduced-motion){.sonner-loading-bar,[data-sonner-toast],[data-sonner-toast]>*{transition:none!important;animation:none!important}}.sonner-loader{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);transform-origin:center;transition:opacity .2s,transform .2s}.sonner-loader[data-visible=false]{opacity:0;transform:scale(.8) translate(-50%,-50%)}");
function Ta(e) {
  return e.label !== void 0;
}
const i0 = 3, s0 = "24px", l0 = "16px", Bs = 4e3, c0 = 356, d0 = 14, u0 = 45, m0 = 200;
function Ft(...e) {
  return e.filter(Boolean).join(" ");
}
function h0(e) {
  const [t, r] = e.split("-"), a = [];
  return t && a.push(t), r && a.push(r), a;
}
const f0 = (e) => {
  var t, r, a, i, o, l, u, c, d;
  const { invert: h, toast: m, unstyled: f, interacting: g, setHeights: p, visibleToasts: v, heights: b, index: w, toasts: y, expanded: k, removeToast: N, defaultRichColors: T, closeButton: _, style: x, cancelButtonStyle: R, actionButtonStyle: F, className: V = "", descriptionClassName: E = "", duration: S, position: $, gap: A, expandByDefault: U, classNames: I, icons: Y, closeButtonAriaLabel: D = "Close toast" } = e, [J, we] = B.useState(null), [he, be] = B.useState(null), [re, pe] = B.useState(!1), [Me, Ne] = B.useState(!1), [K, ge] = B.useState(!1), [L, G] = B.useState(!1), [oe, ne] = B.useState(!1), [Ge, O] = B.useState(0), [We, st] = B.useState(0), At = B.useRef(m.duration || S || Bs), ma = B.useRef(null), Ct = B.useRef(null), fo = w === 0, po = w + 1 <= v, dt = m.type, cr = m.dismissible !== !1, Jt = m.className || "", Mr = m.descriptionClassName || "", Ir = B.useMemo(() => b.findIndex((Ce) => Ce.toastId === m.id) || 0, [
    b,
    m.id
  ]), Nn = B.useMemo(() => {
    var Ce;
    return (Ce = m.closeButton) != null ? Ce : _;
  }, [
    m.closeButton,
    _
  ]), kt = B.useMemo(() => m.duration || S || Bs, [
    m.duration,
    S
  ]), vt = B.useRef(0), Zt = B.useRef(0), ha = B.useRef(0), _t = B.useRef(null), [go, Dt] = $.split("-"), Cn = B.useMemo(() => b.reduce((Ce, Qe, tt) => tt >= Ir ? Ce : Ce + Qe.height, 0), [
    b,
    Ir
  ]), kn = Zg(), fa = m.invert || h, Sn = dt === "loading";
  Zt.current = B.useMemo(() => Ir * A + Cn, [
    Ir,
    Cn
  ]), B.useEffect(() => {
    At.current = kt;
  }, [
    kt
  ]), B.useEffect(() => {
    pe(!0);
  }, []), B.useEffect(() => {
    const Ce = Ct.current;
    if (Ce) {
      const Qe = Ce.getBoundingClientRect().height;
      return st(Qe), p((tt) => [
        {
          toastId: m.id,
          height: Qe,
          position: m.position
        },
        ...tt
      ]), () => p((tt) => tt.filter((nt) => nt.toastId !== m.id));
    }
  }, [
    p,
    m.id
  ]), B.useLayoutEffect(() => {
    if (!re) return;
    const Ce = Ct.current, Qe = Ce.style.height;
    Ce.style.height = "auto";
    const tt = Ce.getBoundingClientRect().height;
    Ce.style.height = Qe, st(tt), p((nt) => nt.find((Je) => Je.toastId === m.id) ? nt.map((Je) => Je.toastId === m.id ? {
      ...Je,
      height: tt
    } : Je) : [
      {
        toastId: m.id,
        height: tt,
        position: m.position
      },
      ...nt
    ]);
  }, [
    re,
    m.title,
    m.description,
    p,
    m.id
  ]);
  const Mt = B.useCallback(() => {
    Ne(!0), O(Zt.current), p((Ce) => Ce.filter((Qe) => Qe.toastId !== m.id)), setTimeout(() => {
      N(m);
    }, m0);
  }, [
    m,
    N,
    p,
    Zt
  ]);
  B.useEffect(() => {
    if (m.promise && dt === "loading" || m.duration === 1 / 0 || m.type === "loading") return;
    let Ce;
    return k || g || kn ? (() => {
      if (ha.current < vt.current) {
        const nt = (/* @__PURE__ */ new Date()).getTime() - vt.current;
        At.current = At.current - nt;
      }
      ha.current = (/* @__PURE__ */ new Date()).getTime();
    })() : (() => {
      At.current !== 1 / 0 && (vt.current = (/* @__PURE__ */ new Date()).getTime(), Ce = setTimeout(() => {
        m.onAutoClose == null || m.onAutoClose.call(m, m), Mt();
      }, At.current));
    })(), () => clearTimeout(Ce);
  }, [
    k,
    g,
    m,
    dt,
    kn,
    Mt
  ]), B.useEffect(() => {
    m.delete && Mt();
  }, [
    Mt,
    m.delete
  ]);
  function Yr() {
    var Ce;
    if (Y?.loading) {
      var Qe;
      return /* @__PURE__ */ B.createElement("div", {
        className: Ft(I?.loader, m == null || (Qe = m.classNames) == null ? void 0 : Qe.loader, "sonner-loader"),
        "data-visible": dt === "loading"
      }, Y.loading);
    }
    return /* @__PURE__ */ B.createElement(Kg, {
      className: Ft(I?.loader, m == null || (Ce = m.classNames) == null ? void 0 : Ce.loader),
      visible: dt === "loading"
    });
  }
  const pa = m.icon || Y?.[dt] || Hg(dt);
  var qr, ga;
  return /* @__PURE__ */ B.createElement("li", {
    tabIndex: 0,
    ref: Ct,
    className: Ft(V, Jt, I?.toast, m == null || (t = m.classNames) == null ? void 0 : t.toast, I?.default, I?.[dt], m == null || (r = m.classNames) == null ? void 0 : r[dt]),
    "data-sonner-toast": "",
    "data-rich-colors": (qr = m.richColors) != null ? qr : T,
    "data-styled": !(m.jsx || m.unstyled || f),
    "data-mounted": re,
    "data-promise": !!m.promise,
    "data-swiped": oe,
    "data-removed": Me,
    "data-visible": po,
    "data-y-position": go,
    "data-x-position": Dt,
    "data-index": w,
    "data-front": fo,
    "data-swiping": K,
    "data-dismissible": cr,
    "data-type": dt,
    "data-invert": fa,
    "data-swipe-out": L,
    "data-swipe-direction": he,
    "data-expanded": !!(k || U && re),
    style: {
      "--index": w,
      "--toasts-before": w,
      "--z-index": y.length - w,
      "--offset": `${Me ? Ge : Zt.current}px`,
      "--initial-height": U ? "auto" : `${We}px`,
      ...x,
      ...m.style
    },
    onDragEnd: () => {
      ge(!1), we(null), _t.current = null;
    },
    onPointerDown: (Ce) => {
      Sn || !cr || (ma.current = /* @__PURE__ */ new Date(), O(Zt.current), Ce.target.setPointerCapture(Ce.pointerId), Ce.target.tagName !== "BUTTON" && (ge(!0), _t.current = {
        x: Ce.clientX,
        y: Ce.clientY
      }));
    },
    onPointerUp: () => {
      var Ce, Qe, tt;
      if (L || !cr) return;
      _t.current = null;
      const nt = Number(((Ce = Ct.current) == null ? void 0 : Ce.style.getPropertyValue("--swipe-amount-x").replace("px", "")) || 0), er = Number(((Qe = Ct.current) == null ? void 0 : Qe.style.getPropertyValue("--swipe-amount-y").replace("px", "")) || 0), Je = (/* @__PURE__ */ new Date()).getTime() - ((tt = ma.current) == null ? void 0 : tt.getTime()), pt = J === "x" ? nt : er, Xr = Math.abs(pt) / Je;
      if (Math.abs(pt) >= u0 || Xr > 0.11) {
        O(Zt.current), m.onDismiss == null || m.onDismiss.call(m, m), be(J === "x" ? nt > 0 ? "right" : "left" : er > 0 ? "down" : "up"), Mt(), G(!0);
        return;
      } else {
        var C, P;
        (C = Ct.current) == null || C.style.setProperty("--swipe-amount-x", "0px"), (P = Ct.current) == null || P.style.setProperty("--swipe-amount-y", "0px");
      }
      ne(!1), ge(!1), we(null);
    },
    onPointerMove: (Ce) => {
      var Qe, tt, nt;
      if (!_t.current || !cr || ((Qe = window.getSelection()) == null ? void 0 : Qe.toString().length) > 0) return;
      const Je = Ce.clientY - _t.current.y, pt = Ce.clientX - _t.current.x;
      var Xr;
      const C = (Xr = e.swipeDirections) != null ? Xr : h0($);
      !J && (Math.abs(pt) > 1 || Math.abs(Je) > 1) && we(Math.abs(pt) > Math.abs(Je) ? "x" : "y");
      let P = {
        x: 0,
        y: 0
      };
      const M = (z) => 1 / (1.5 + Math.abs(z) / 20);
      if (J === "y") {
        if (C.includes("top") || C.includes("bottom"))
          if (C.includes("top") && Je < 0 || C.includes("bottom") && Je > 0)
            P.y = Je;
          else {
            const z = Je * M(Je);
            P.y = Math.abs(z) < Math.abs(Je) ? z : Je;
          }
      } else if (J === "x" && (C.includes("left") || C.includes("right")))
        if (C.includes("left") && pt < 0 || C.includes("right") && pt > 0)
          P.x = pt;
        else {
          const z = pt * M(pt);
          P.x = Math.abs(z) < Math.abs(pt) ? z : pt;
        }
      (Math.abs(P.x) > 0 || Math.abs(P.y) > 0) && ne(!0), (tt = Ct.current) == null || tt.style.setProperty("--swipe-amount-x", `${P.x}px`), (nt = Ct.current) == null || nt.style.setProperty("--swipe-amount-y", `${P.y}px`);
    }
  }, Nn && !m.jsx && dt !== "loading" ? /* @__PURE__ */ B.createElement("button", {
    "aria-label": D,
    "data-disabled": Sn,
    "data-close-button": !0,
    onClick: Sn || !cr ? () => {
    } : () => {
      Mt(), m.onDismiss == null || m.onDismiss.call(m, m);
    },
    className: Ft(I?.closeButton, m == null || (a = m.classNames) == null ? void 0 : a.closeButton)
  }, (ga = Y?.close) != null ? ga : Jg) : null, (dt || m.icon || m.promise) && m.icon !== null && (Y?.[dt] !== null || m.icon) ? /* @__PURE__ */ B.createElement("div", {
    "data-icon": "",
    className: Ft(I?.icon, m == null || (i = m.classNames) == null ? void 0 : i.icon)
  }, m.promise || m.type === "loading" && !m.icon ? m.icon || Yr() : null, m.type !== "loading" ? pa : null) : null, /* @__PURE__ */ B.createElement("div", {
    "data-content": "",
    className: Ft(I?.content, m == null || (o = m.classNames) == null ? void 0 : o.content)
  }, /* @__PURE__ */ B.createElement("div", {
    "data-title": "",
    className: Ft(I?.title, m == null || (l = m.classNames) == null ? void 0 : l.title)
  }, m.jsx ? m.jsx : typeof m.title == "function" ? m.title() : m.title), m.description ? /* @__PURE__ */ B.createElement("div", {
    "data-description": "",
    className: Ft(E, Mr, I?.description, m == null || (u = m.classNames) == null ? void 0 : u.description)
  }, typeof m.description == "function" ? m.description() : m.description) : null), /* @__PURE__ */ B.isValidElement(m.cancel) ? m.cancel : m.cancel && Ta(m.cancel) ? /* @__PURE__ */ B.createElement("button", {
    "data-button": !0,
    "data-cancel": !0,
    style: m.cancelButtonStyle || R,
    onClick: (Ce) => {
      Ta(m.cancel) && cr && (m.cancel.onClick == null || m.cancel.onClick.call(m.cancel, Ce), Mt());
    },
    className: Ft(I?.cancelButton, m == null || (c = m.classNames) == null ? void 0 : c.cancelButton)
  }, m.cancel.label) : null, /* @__PURE__ */ B.isValidElement(m.action) ? m.action : m.action && Ta(m.action) ? /* @__PURE__ */ B.createElement("button", {
    "data-button": !0,
    "data-action": !0,
    style: m.actionButtonStyle || F,
    onClick: (Ce) => {
      Ta(m.action) && (m.action.onClick == null || m.action.onClick.call(m.action, Ce), !Ce.defaultPrevented && Mt());
    },
    className: Ft(I?.actionButton, m == null || (d = m.classNames) == null ? void 0 : d.actionButton)
  }, m.action.label) : null);
};
function Fs() {
  if (typeof window > "u" || typeof document > "u") return "ltr";
  const e = document.documentElement.getAttribute("dir");
  return e === "auto" || !e ? window.getComputedStyle(document.documentElement).direction : e;
}
function p0(e, t) {
  const r = {};
  return [
    e,
    t
  ].forEach((a, i) => {
    const o = i === 1, l = o ? "--mobile-offset" : "--offset", u = o ? l0 : s0;
    function c(d) {
      [
        "top",
        "right",
        "bottom",
        "left"
      ].forEach((h) => {
        r[`${l}-${h}`] = typeof d == "number" ? `${d}px` : d;
      });
    }
    typeof a == "number" || typeof a == "string" ? c(a) : typeof a == "object" ? [
      "top",
      "right",
      "bottom",
      "left"
    ].forEach((d) => {
      a[d] === void 0 ? r[`${l}-${d}`] = u : r[`${l}-${d}`] = typeof a[d] == "number" ? `${a[d]}px` : a[d];
    }) : c(u);
  }), r;
}
const g0 = /* @__PURE__ */ B.forwardRef(function(t, r) {
  const { invert: a, position: i = "bottom-right", hotkey: o = [
    "altKey",
    "KeyT"
  ], expand: l, closeButton: u, className: c, offset: d, mobileOffset: h, theme: m = "light", richColors: f, duration: g, style: p, visibleToasts: v = i0, toastOptions: b, dir: w = Fs(), gap: y = d0, icons: k, containerAriaLabel: N = "Notifications" } = t, [T, _] = B.useState([]), x = B.useMemo(() => Array.from(new Set([
    i
  ].concat(T.filter((he) => he.position).map((he) => he.position)))), [
    T,
    i
  ]), [R, F] = B.useState([]), [V, E] = B.useState(!1), [S, $] = B.useState(!1), [A, U] = B.useState(m !== "system" ? m : typeof window < "u" && window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"), I = B.useRef(null), Y = o.join("+").replace(/Key/g, "").replace(/Digit/g, ""), D = B.useRef(null), J = B.useRef(!1), we = B.useCallback((he) => {
    _((be) => {
      var re;
      return (re = be.find((pe) => pe.id === he.id)) != null && re.delete || gt.dismiss(he.id), be.filter(({ id: pe }) => pe !== he.id);
    });
  }, []);
  return B.useEffect(() => gt.subscribe((he) => {
    if (he.dismiss) {
      requestAnimationFrame(() => {
        _((be) => be.map((re) => re.id === he.id ? {
          ...re,
          delete: !0
        } : re));
      });
      return;
    }
    setTimeout(() => {
      vc.flushSync(() => {
        _((be) => {
          const re = be.findIndex((pe) => pe.id === he.id);
          return re !== -1 ? [
            ...be.slice(0, re),
            {
              ...be[re],
              ...he
            },
            ...be.slice(re + 1)
          ] : [
            he,
            ...be
          ];
        });
      });
    });
  }), [
    T
  ]), B.useEffect(() => {
    if (m !== "system") {
      U(m);
      return;
    }
    if (m === "system" && (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? U("dark") : U("light")), typeof window > "u") return;
    const he = window.matchMedia("(prefers-color-scheme: dark)");
    try {
      he.addEventListener("change", ({ matches: be }) => {
        U(be ? "dark" : "light");
      });
    } catch {
      he.addListener(({ matches: re }) => {
        try {
          U(re ? "dark" : "light");
        } catch (pe) {
          console.error(pe);
        }
      });
    }
  }, [
    m
  ]), B.useEffect(() => {
    T.length <= 1 && E(!1);
  }, [
    T
  ]), B.useEffect(() => {
    const he = (be) => {
      var re;
      if (o.every((Ne) => be[Ne] || be.code === Ne)) {
        var Me;
        E(!0), (Me = I.current) == null || Me.focus();
      }
      be.code === "Escape" && (document.activeElement === I.current || (re = I.current) != null && re.contains(document.activeElement)) && E(!1);
    };
    return document.addEventListener("keydown", he), () => document.removeEventListener("keydown", he);
  }, [
    o
  ]), B.useEffect(() => {
    if (I.current)
      return () => {
        D.current && (D.current.focus({
          preventScroll: !0
        }), D.current = null, J.current = !1);
      };
  }, [
    I.current
  ]), // Remove item from normal navigation flow, only available via hotkey
  /* @__PURE__ */ B.createElement("section", {
    ref: r,
    "aria-label": `${N} ${Y}`,
    tabIndex: -1,
    "aria-live": "polite",
    "aria-relevant": "additions text",
    "aria-atomic": "false",
    suppressHydrationWarning: !0
  }, x.map((he, be) => {
    var re;
    const [pe, Me] = he.split("-");
    return T.length ? /* @__PURE__ */ B.createElement("ol", {
      key: he,
      dir: w === "auto" ? Fs() : w,
      tabIndex: -1,
      ref: I,
      className: c,
      "data-sonner-toaster": !0,
      "data-sonner-theme": A,
      "data-y-position": pe,
      "data-lifted": V && T.length > 1 && !l,
      "data-x-position": Me,
      style: {
        "--front-toast-height": `${((re = R[0]) == null ? void 0 : re.height) || 0}px`,
        "--width": `${c0}px`,
        "--gap": `${y}px`,
        ...p,
        ...p0(d, h)
      },
      onBlur: (Ne) => {
        J.current && !Ne.currentTarget.contains(Ne.relatedTarget) && (J.current = !1, D.current && (D.current.focus({
          preventScroll: !0
        }), D.current = null));
      },
      onFocus: (Ne) => {
        Ne.target instanceof HTMLElement && Ne.target.dataset.dismissible === "false" || J.current || (J.current = !0, D.current = Ne.relatedTarget);
      },
      onMouseEnter: () => E(!0),
      onMouseMove: () => E(!0),
      onMouseLeave: () => {
        S || E(!1);
      },
      onDragEnd: () => E(!1),
      onPointerDown: (Ne) => {
        Ne.target instanceof HTMLElement && Ne.target.dataset.dismissible === "false" || $(!0);
      },
      onPointerUp: () => $(!1)
    }, T.filter((Ne) => !Ne.position && be === 0 || Ne.position === he).map((Ne, K) => {
      var ge, L;
      return /* @__PURE__ */ B.createElement(f0, {
        key: Ne.id,
        icons: k,
        index: K,
        toast: Ne,
        defaultRichColors: f,
        duration: (ge = b?.duration) != null ? ge : g,
        className: b?.className,
        descriptionClassName: b?.descriptionClassName,
        invert: a,
        visibleToasts: v,
        closeButton: (L = b?.closeButton) != null ? L : u,
        interacting: S,
        position: he,
        style: b?.style,
        unstyled: b?.unstyled,
        classNames: b?.classNames,
        cancelButtonStyle: b?.cancelButtonStyle,
        actionButtonStyle: b?.actionButtonStyle,
        closeButtonAriaLabel: b?.closeButtonAriaLabel,
        removeToast: we,
        toasts: T.filter((G) => G.position == Ne.position),
        heights: R.filter((G) => G.position == Ne.position),
        setHeights: F,
        expandByDefault: l,
        gap: y,
        expanded: V,
        swipeDirections: t.swipeDirections
      });
    })) : null;
  }));
});
var v0 = bl.useId || (() => {
}), b0 = 0;
function Nr(e) {
  const [t, r] = j(v0());
  return ft(() => {
    r((a) => a ?? String(b0++));
  }, [e]), e || (t ? `radix-${t}` : "");
}
function y0(e, t = globalThis?.document) {
  const r = Yt(e);
  xe(() => {
    const a = (i) => {
      i.key === "Escape" && r(i);
    };
    return t.addEventListener("keydown", a, { capture: !0 }), () => t.removeEventListener("keydown", a, { capture: !0 });
  }, [r, t]);
}
var x0 = "DismissableLayer", Xo = "dismissableLayer.update", w0 = "dismissableLayer.pointerDownOutside", N0 = "dismissableLayer.focusOutside", zs, Rc = et({
  layers: /* @__PURE__ */ new Set(),
  layersWithOutsidePointerEventsDisabled: /* @__PURE__ */ new Set(),
  branches: /* @__PURE__ */ new Set()
}), Ti = Q(
  (e, t) => {
    const {
      disableOutsidePointerEvents: r = !1,
      onEscapeKeyDown: a,
      onPointerDownOutside: i,
      onFocusOutside: o,
      onInteractOutside: l,
      onDismiss: u,
      ...c
    } = e, d = ke(Rc), [h, m] = j(null), f = h?.ownerDocument ?? globalThis?.document, [, g] = j({}), p = Ke(t, (x) => m(x)), v = Array.from(d.layers), [b] = [...d.layersWithOutsidePointerEventsDisabled].slice(-1), w = v.indexOf(b), y = h ? v.indexOf(h) : -1, k = d.layersWithOutsidePointerEventsDisabled.size > 0, N = y >= w, T = S0((x) => {
      const R = x.target, F = [...d.branches].some((V) => V.contains(R));
      !N || F || (i?.(x), l?.(x), x.defaultPrevented || u?.());
    }, f), _ = E0((x) => {
      const R = x.target;
      [...d.branches].some((V) => V.contains(R)) || (o?.(x), l?.(x), x.defaultPrevented || u?.());
    }, f);
    return y0((x) => {
      y === d.layers.size - 1 && (a?.(x), !x.defaultPrevented && u && (x.preventDefault(), u()));
    }, f), xe(() => {
      if (h)
        return r && (d.layersWithOutsidePointerEventsDisabled.size === 0 && (zs = f.body.style.pointerEvents, f.body.style.pointerEvents = "none"), d.layersWithOutsidePointerEventsDisabled.add(h)), d.layers.add(h), js(), () => {
          r && d.layersWithOutsidePointerEventsDisabled.size === 1 && (f.body.style.pointerEvents = zs);
        };
    }, [h, f, r, d]), xe(() => () => {
      h && (d.layers.delete(h), d.layersWithOutsidePointerEventsDisabled.delete(h), js());
    }, [h, d]), xe(() => {
      const x = () => g({});
      return document.addEventListener(Xo, x), () => document.removeEventListener(Xo, x);
    }, []), /* @__PURE__ */ n(
      $e.div,
      {
        ...c,
        ref: p,
        style: {
          pointerEvents: k ? N ? "auto" : "none" : void 0,
          ...e.style
        },
        onFocusCapture: De(e.onFocusCapture, _.onFocusCapture),
        onBlurCapture: De(e.onBlurCapture, _.onBlurCapture),
        onPointerDownCapture: De(
          e.onPointerDownCapture,
          T.onPointerDownCapture
        )
      }
    );
  }
);
Ti.displayName = x0;
var C0 = "DismissableLayerBranch", k0 = Q((e, t) => {
  const r = ke(Rc), a = ve(null), i = Ke(t, a);
  return xe(() => {
    const o = a.current;
    if (o)
      return r.branches.add(o), () => {
        r.branches.delete(o);
      };
  }, [r.branches]), /* @__PURE__ */ n($e.div, { ...e, ref: i });
});
k0.displayName = C0;
function S0(e, t = globalThis?.document) {
  const r = Yt(e), a = ve(!1), i = ve(() => {
  });
  return xe(() => {
    const o = (u) => {
      if (u.target && !a.current) {
        let c = function() {
          Tc(
            w0,
            r,
            d,
            { discrete: !0 }
          );
        };
        const d = { originalEvent: u };
        u.pointerType === "touch" ? (t.removeEventListener("click", i.current), i.current = c, t.addEventListener("click", i.current, { once: !0 })) : c();
      } else
        t.removeEventListener("click", i.current);
      a.current = !1;
    }, l = window.setTimeout(() => {
      t.addEventListener("pointerdown", o);
    }, 0);
    return () => {
      window.clearTimeout(l), t.removeEventListener("pointerdown", o), t.removeEventListener("click", i.current);
    };
  }, [t, r]), {
    // ensures we check React component tree (not just DOM tree)
    onPointerDownCapture: () => a.current = !0
  };
}
function E0(e, t = globalThis?.document) {
  const r = Yt(e), a = ve(!1);
  return xe(() => {
    const i = (o) => {
      o.target && !a.current && Tc(N0, r, { originalEvent: o }, {
        discrete: !1
      });
    };
    return t.addEventListener("focusin", i), () => t.removeEventListener("focusin", i);
  }, [t, r]), {
    onFocusCapture: () => a.current = !0,
    onBlurCapture: () => a.current = !1
  };
}
function js() {
  const e = new CustomEvent(Xo);
  document.dispatchEvent(e);
}
function Tc(e, t, r, { discrete: a }) {
  const i = r.originalEvent.target, o = new CustomEvent(e, { bubbles: !1, cancelable: !0, detail: r });
  t && i.addEventListener(e, t, { once: !0 }), a ? Tg(i, o) : i.dispatchEvent(o);
}
var To = "focusScope.autoFocusOnMount", Ao = "focusScope.autoFocusOnUnmount", Ws = { bubbles: !1, cancelable: !0 }, P0 = "FocusScope", Ai = Q((e, t) => {
  const {
    loop: r = !1,
    trapped: a = !1,
    onMountAutoFocus: i,
    onUnmountAutoFocus: o,
    ...l
  } = e, [u, c] = j(null), d = Yt(i), h = Yt(o), m = ve(null), f = Ke(t, (v) => c(v)), g = ve({
    paused: !1,
    pause() {
      this.paused = !0;
    },
    resume() {
      this.paused = !1;
    }
  }).current;
  xe(() => {
    if (a) {
      let v = function(k) {
        if (g.paused || !u) return;
        const N = k.target;
        u.contains(N) ? m.current = N : hr(m.current, { select: !0 });
      }, b = function(k) {
        if (g.paused || !u) return;
        const N = k.relatedTarget;
        N !== null && (u.contains(N) || hr(m.current, { select: !0 }));
      }, w = function(k) {
        if (document.activeElement === document.body)
          for (const T of k)
            T.removedNodes.length > 0 && hr(u);
      };
      document.addEventListener("focusin", v), document.addEventListener("focusout", b);
      const y = new MutationObserver(w);
      return u && y.observe(u, { childList: !0, subtree: !0 }), () => {
        document.removeEventListener("focusin", v), document.removeEventListener("focusout", b), y.disconnect();
      };
    }
  }, [a, u, g.paused]), xe(() => {
    if (u) {
      Vs.add(g);
      const v = document.activeElement;
      if (!u.contains(v)) {
        const w = new CustomEvent(To, Ws);
        u.addEventListener(To, d), u.dispatchEvent(w), w.defaultPrevented || (R0(I0(Ac(u)), { select: !0 }), document.activeElement === v && hr(u));
      }
      return () => {
        u.removeEventListener(To, d), setTimeout(() => {
          const w = new CustomEvent(Ao, Ws);
          u.addEventListener(Ao, h), u.dispatchEvent(w), w.defaultPrevented || hr(v ?? document.body, { select: !0 }), u.removeEventListener(Ao, h), Vs.remove(g);
        }, 0);
      };
    }
  }, [u, d, h, g]);
  const p = Ae(
    (v) => {
      if (!r && !a || g.paused) return;
      const b = v.key === "Tab" && !v.altKey && !v.ctrlKey && !v.metaKey, w = document.activeElement;
      if (b && w) {
        const y = v.currentTarget, [k, N] = T0(y);
        k && N ? !v.shiftKey && w === N ? (v.preventDefault(), r && hr(k, { select: !0 })) : v.shiftKey && w === k && (v.preventDefault(), r && hr(N, { select: !0 })) : w === y && v.preventDefault();
      }
    },
    [r, a, g.paused]
  );
  return /* @__PURE__ */ n($e.div, { tabIndex: -1, ...l, ref: f, onKeyDown: p });
});
Ai.displayName = P0;
function R0(e, { select: t = !1 } = {}) {
  const r = document.activeElement;
  for (const a of e)
    if (hr(a, { select: t }), document.activeElement !== r) return;
}
function T0(e) {
  const t = Ac(e), r = Us(t, e), a = Us(t.reverse(), e);
  return [r, a];
}
function Ac(e) {
  const t = [], r = document.createTreeWalker(e, NodeFilter.SHOW_ELEMENT, {
    acceptNode: (a) => {
      const i = a.tagName === "INPUT" && a.type === "hidden";
      return a.disabled || a.hidden || i ? NodeFilter.FILTER_SKIP : a.tabIndex >= 0 ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_SKIP;
    }
  });
  for (; r.nextNode(); ) t.push(r.currentNode);
  return t;
}
function Us(e, t) {
  for (const r of e)
    if (!A0(r, { upTo: t })) return r;
}
function A0(e, { upTo: t }) {
  if (getComputedStyle(e).visibility === "hidden") return !0;
  for (; e; ) {
    if (t !== void 0 && e === t) return !1;
    if (getComputedStyle(e).display === "none") return !0;
    e = e.parentElement;
  }
  return !1;
}
function D0(e) {
  return e instanceof HTMLInputElement && "select" in e;
}
function hr(e, { select: t = !1 } = {}) {
  if (e && e.focus) {
    const r = document.activeElement;
    e.focus({ preventScroll: !0 }), e !== r && D0(e) && t && e.select();
  }
}
var Vs = M0();
function M0() {
  let e = [];
  return {
    add(t) {
      const r = e[0];
      t !== r && r?.pause(), e = Hs(e, t), e.unshift(t);
    },
    remove(t) {
      e = Hs(e, t), e[0]?.resume();
    }
  };
}
function Hs(e, t) {
  const r = [...e], a = r.indexOf(t);
  return a !== -1 && r.splice(a, 1), r;
}
function I0(e) {
  return e.filter((t) => t.tagName !== "A");
}
var O0 = "Portal", Di = Q((e, t) => {
  const { container: r, ...a } = e, [i, o] = j(!1);
  ft(() => o(!0), []);
  const l = r || i && globalThis?.document?.body;
  return l ? vc.createPortal(/* @__PURE__ */ n($e.div, { ...a, ref: t }), l) : null;
});
Di.displayName = O0;
var Do = 0;
function Dc() {
  xe(() => {
    const e = document.querySelectorAll("[data-radix-focus-guard]");
    return document.body.insertAdjacentElement("afterbegin", e[0] ?? Gs()), document.body.insertAdjacentElement("beforeend", e[1] ?? Gs()), Do++, () => {
      Do === 1 && document.querySelectorAll("[data-radix-focus-guard]").forEach((t) => t.remove()), Do--;
    };
  }, []);
}
function Gs() {
  const e = document.createElement("span");
  return e.setAttribute("data-radix-focus-guard", ""), e.tabIndex = 0, e.style.outline = "none", e.style.opacity = "0", e.style.position = "fixed", e.style.pointerEvents = "none", e;
}
var jt = function() {
  return jt = Object.assign || function(t) {
    for (var r, a = 1, i = arguments.length; a < i; a++) {
      r = arguments[a];
      for (var o in r) Object.prototype.hasOwnProperty.call(r, o) && (t[o] = r[o]);
    }
    return t;
  }, jt.apply(this, arguments);
};
function Mc(e, t) {
  var r = {};
  for (var a in e) Object.prototype.hasOwnProperty.call(e, a) && t.indexOf(a) < 0 && (r[a] = e[a]);
  if (e != null && typeof Object.getOwnPropertySymbols == "function")
    for (var i = 0, a = Object.getOwnPropertySymbols(e); i < a.length; i++)
      t.indexOf(a[i]) < 0 && Object.prototype.propertyIsEnumerable.call(e, a[i]) && (r[a[i]] = e[a[i]]);
  return r;
}
function $0(e, t, r) {
  if (r || arguments.length === 2) for (var a = 0, i = t.length, o; a < i; a++)
    (o || !(a in t)) && (o || (o = Array.prototype.slice.call(t, 0, a)), o[a] = t[a]);
  return e.concat(o || Array.prototype.slice.call(t));
}
var za = "right-scroll-bar-position", ja = "width-before-scroll-bar", L0 = "with-scroll-bars-hidden", _0 = "--removed-body-scroll-bar-size";
function Mo(e, t) {
  return typeof e == "function" ? e(t) : e && (e.current = t), e;
}
function B0(e, t) {
  var r = j(function() {
    return {
      // value
      value: e,
      // last callback
      callback: t,
      // "memoized" public interface
      facade: {
        get current() {
          return r.value;
        },
        set current(a) {
          var i = r.value;
          i !== a && (r.value = a, r.callback(a, i));
        }
      }
    };
  })[0];
  return r.callback = t, r.facade;
}
var F0 = typeof window < "u" ? hn : xe, Ks = /* @__PURE__ */ new WeakMap();
function z0(e, t) {
  var r = B0(null, function(a) {
    return e.forEach(function(i) {
      return Mo(i, a);
    });
  });
  return F0(function() {
    var a = Ks.get(r);
    if (a) {
      var i = new Set(a), o = new Set(e), l = r.current;
      i.forEach(function(u) {
        o.has(u) || Mo(u, null);
      }), o.forEach(function(u) {
        i.has(u) || Mo(u, l);
      });
    }
    Ks.set(r, e);
  }, [e]), r;
}
function j0(e) {
  return e;
}
function W0(e, t) {
  t === void 0 && (t = j0);
  var r = [], a = !1, i = {
    read: function() {
      if (a)
        throw new Error("Sidecar: could not `read` from an `assigned` medium. `read` could be used only with `useMedium`.");
      return r.length ? r[r.length - 1] : e;
    },
    useMedium: function(o) {
      var l = t(o, a);
      return r.push(l), function() {
        r = r.filter(function(u) {
          return u !== l;
        });
      };
    },
    assignSyncMedium: function(o) {
      for (a = !0; r.length; ) {
        var l = r;
        r = [], l.forEach(o);
      }
      r = {
        push: function(u) {
          return o(u);
        },
        filter: function() {
          return r;
        }
      };
    },
    assignMedium: function(o) {
      a = !0;
      var l = [];
      if (r.length) {
        var u = r;
        r = [], u.forEach(o), l = r;
      }
      var c = function() {
        var h = l;
        l = [], h.forEach(o);
      }, d = function() {
        return Promise.resolve().then(c);
      };
      d(), r = {
        push: function(h) {
          l.push(h), d();
        },
        filter: function(h) {
          return l = l.filter(h), r;
        }
      };
    }
  };
  return i;
}
function U0(e) {
  e === void 0 && (e = {});
  var t = W0(null);
  return t.options = jt({ async: !0, ssr: !1 }, e), t;
}
var Ic = function(e) {
  var t = e.sideCar, r = Mc(e, ["sideCar"]);
  if (!t)
    throw new Error("Sidecar: please provide `sideCar` property to import the right car");
  var a = t.read();
  if (!a)
    throw new Error("Sidecar medium not found");
  return me(a, jt({}, r));
};
Ic.isSideCarExport = !0;
function V0(e, t) {
  return e.useMedium(t), Ic;
}
var Oc = U0(), Io = function() {
}, ao = Q(function(e, t) {
  var r = ve(null), a = j({
    onScrollCapture: Io,
    onWheelCapture: Io,
    onTouchMoveCapture: Io
  }), i = a[0], o = a[1], l = e.forwardProps, u = e.children, c = e.className, d = e.removeScrollBar, h = e.enabled, m = e.shards, f = e.sideCar, g = e.noRelative, p = e.noIsolation, v = e.inert, b = e.allowPinchZoom, w = e.as, y = w === void 0 ? "div" : w, k = e.gapMode, N = Mc(e, ["forwardProps", "children", "className", "removeScrollBar", "enabled", "shards", "sideCar", "noRelative", "noIsolation", "inert", "allowPinchZoom", "as", "gapMode"]), T = f, _ = z0([r, t]), x = jt(jt({}, N), i);
  return me(
    ar,
    null,
    h && me(T, { sideCar: Oc, removeScrollBar: d, shards: m, noRelative: g, noIsolation: p, inert: v, setCallbacks: o, allowPinchZoom: !!b, lockRef: r, gapMode: k }),
    l ? mn(Vt.only(u), jt(jt({}, x), { ref: _ })) : me(y, jt({}, x, { className: c, ref: _ }), u)
  );
});
ao.defaultProps = {
  enabled: !0,
  removeScrollBar: !0,
  inert: !1
};
ao.classNames = {
  fullWidth: ja,
  zeroRight: za
};
var H0 = function() {
  if (typeof __webpack_nonce__ < "u")
    return __webpack_nonce__;
};
function G0() {
  if (!document)
    return null;
  var e = document.createElement("style");
  e.type = "text/css";
  var t = H0();
  return t && e.setAttribute("nonce", t), e;
}
function K0(e, t) {
  e.styleSheet ? e.styleSheet.cssText = t : e.appendChild(document.createTextNode(t));
}
function Y0(e) {
  var t = document.head || document.getElementsByTagName("head")[0];
  t.appendChild(e);
}
var q0 = function() {
  var e = 0, t = null;
  return {
    add: function(r) {
      e == 0 && (t = G0()) && (K0(t, r), Y0(t)), e++;
    },
    remove: function() {
      e--, !e && t && (t.parentNode && t.parentNode.removeChild(t), t = null);
    }
  };
}, X0 = function() {
  var e = q0();
  return function(t, r) {
    xe(function() {
      return e.add(t), function() {
        e.remove();
      };
    }, [t && r]);
  };
}, $c = function() {
  var e = X0(), t = function(r) {
    var a = r.styles, i = r.dynamic;
    return e(a, i), null;
  };
  return t;
}, Q0 = {
  left: 0,
  top: 0,
  right: 0,
  gap: 0
}, Oo = function(e) {
  return parseInt(e || "", 10) || 0;
}, J0 = function(e) {
  var t = window.getComputedStyle(document.body), r = t[e === "padding" ? "paddingLeft" : "marginLeft"], a = t[e === "padding" ? "paddingTop" : "marginTop"], i = t[e === "padding" ? "paddingRight" : "marginRight"];
  return [Oo(r), Oo(a), Oo(i)];
}, Z0 = function(e) {
  if (e === void 0 && (e = "margin"), typeof window > "u")
    return Q0;
  var t = J0(e), r = document.documentElement.clientWidth, a = window.innerWidth;
  return {
    left: t[0],
    top: t[1],
    right: t[2],
    gap: Math.max(0, a - r + t[2] - t[0])
  };
}, ev = $c(), ln = "data-scroll-locked", tv = function(e, t, r, a) {
  var i = e.left, o = e.top, l = e.right, u = e.gap;
  return r === void 0 && (r = "margin"), `
  .`.concat(L0, ` {
   overflow: hidden `).concat(a, `;
   padding-right: `).concat(u, "px ").concat(a, `;
  }
  body[`).concat(ln, `] {
    overflow: hidden `).concat(a, `;
    overscroll-behavior: contain;
    `).concat([
    t && "position: relative ".concat(a, ";"),
    r === "margin" && `
    padding-left: `.concat(i, `px;
    padding-top: `).concat(o, `px;
    padding-right: `).concat(l, `px;
    margin-left:0;
    margin-top:0;
    margin-right: `).concat(u, "px ").concat(a, `;
    `),
    r === "padding" && "padding-right: ".concat(u, "px ").concat(a, ";")
  ].filter(Boolean).join(""), `
  }
  
  .`).concat(za, ` {
    right: `).concat(u, "px ").concat(a, `;
  }
  
  .`).concat(ja, ` {
    margin-right: `).concat(u, "px ").concat(a, `;
  }
  
  .`).concat(za, " .").concat(za, ` {
    right: 0 `).concat(a, `;
  }
  
  .`).concat(ja, " .").concat(ja, ` {
    margin-right: 0 `).concat(a, `;
  }
  
  body[`).concat(ln, `] {
    `).concat(_0, ": ").concat(u, `px;
  }
`);
}, Ys = function() {
  var e = parseInt(document.body.getAttribute(ln) || "0", 10);
  return isFinite(e) ? e : 0;
}, rv = function() {
  xe(function() {
    return document.body.setAttribute(ln, (Ys() + 1).toString()), function() {
      var e = Ys() - 1;
      e <= 0 ? document.body.removeAttribute(ln) : document.body.setAttribute(ln, e.toString());
    };
  }, []);
}, nv = function(e) {
  var t = e.noRelative, r = e.noImportant, a = e.gapMode, i = a === void 0 ? "margin" : a;
  rv();
  var o = He(function() {
    return Z0(i);
  }, [i]);
  return me(ev, { styles: tv(o, !t, i, r ? "" : "!important") });
}, Qo = !1;
if (typeof window < "u")
  try {
    var Aa = Object.defineProperty({}, "passive", {
      get: function() {
        return Qo = !0, !0;
      }
    });
    window.addEventListener("test", Aa, Aa), window.removeEventListener("test", Aa, Aa);
  } catch {
    Qo = !1;
  }
var Zr = Qo ? { passive: !1 } : !1, av = function(e) {
  return e.tagName === "TEXTAREA";
}, Lc = function(e, t) {
  if (!(e instanceof Element))
    return !1;
  var r = window.getComputedStyle(e);
  return (
    // not-not-scrollable
    r[t] !== "hidden" && // contains scroll inside self
    !(r.overflowY === r.overflowX && !av(e) && r[t] === "visible")
  );
}, ov = function(e) {
  return Lc(e, "overflowY");
}, iv = function(e) {
  return Lc(e, "overflowX");
}, qs = function(e, t) {
  var r = t.ownerDocument, a = t;
  do {
    typeof ShadowRoot < "u" && a instanceof ShadowRoot && (a = a.host);
    var i = _c(e, a);
    if (i) {
      var o = Bc(e, a), l = o[1], u = o[2];
      if (l > u)
        return !0;
    }
    a = a.parentNode;
  } while (a && a !== r.body);
  return !1;
}, sv = function(e) {
  var t = e.scrollTop, r = e.scrollHeight, a = e.clientHeight;
  return [
    t,
    r,
    a
  ];
}, lv = function(e) {
  var t = e.scrollLeft, r = e.scrollWidth, a = e.clientWidth;
  return [
    t,
    r,
    a
  ];
}, _c = function(e, t) {
  return e === "v" ? ov(t) : iv(t);
}, Bc = function(e, t) {
  return e === "v" ? sv(t) : lv(t);
}, cv = function(e, t) {
  return e === "h" && t === "rtl" ? -1 : 1;
}, dv = function(e, t, r, a, i) {
  var o = cv(e, window.getComputedStyle(t).direction), l = o * a, u = r.target, c = t.contains(u), d = !1, h = l > 0, m = 0, f = 0;
  do {
    if (!u)
      break;
    var g = Bc(e, u), p = g[0], v = g[1], b = g[2], w = v - b - o * p;
    (p || w) && _c(e, u) && (m += w, f += p);
    var y = u.parentNode;
    u = y && y.nodeType === Node.DOCUMENT_FRAGMENT_NODE ? y.host : y;
  } while (
    // portaled content
    !c && u !== document.body || // self content
    c && (t.contains(u) || t === u)
  );
  return (h && Math.abs(m) < 1 || !h && Math.abs(f) < 1) && (d = !0), d;
}, Da = function(e) {
  return "changedTouches" in e ? [e.changedTouches[0].clientX, e.changedTouches[0].clientY] : [0, 0];
}, Xs = function(e) {
  return [e.deltaX, e.deltaY];
}, Qs = function(e) {
  return e && "current" in e ? e.current : e;
}, uv = function(e, t) {
  return e[0] === t[0] && e[1] === t[1];
}, mv = function(e) {
  return `
  .block-interactivity-`.concat(e, ` {pointer-events: none;}
  .allow-interactivity-`).concat(e, ` {pointer-events: all;}
`);
}, hv = 0, en = [];
function fv(e) {
  var t = ve([]), r = ve([0, 0]), a = ve(), i = j(hv++)[0], o = j($c)[0], l = ve(e);
  xe(function() {
    l.current = e;
  }, [e]), xe(function() {
    if (e.inert) {
      document.body.classList.add("block-interactivity-".concat(i));
      var v = $0([e.lockRef.current], (e.shards || []).map(Qs), !0).filter(Boolean);
      return v.forEach(function(b) {
        return b.classList.add("allow-interactivity-".concat(i));
      }), function() {
        document.body.classList.remove("block-interactivity-".concat(i)), v.forEach(function(b) {
          return b.classList.remove("allow-interactivity-".concat(i));
        });
      };
    }
  }, [e.inert, e.lockRef.current, e.shards]);
  var u = Ae(function(v, b) {
    if ("touches" in v && v.touches.length === 2 || v.type === "wheel" && v.ctrlKey)
      return !l.current.allowPinchZoom;
    var w = Da(v), y = r.current, k = "deltaX" in v ? v.deltaX : y[0] - w[0], N = "deltaY" in v ? v.deltaY : y[1] - w[1], T, _ = v.target, x = Math.abs(k) > Math.abs(N) ? "h" : "v";
    if ("touches" in v && x === "h" && _.type === "range")
      return !1;
    var R = qs(x, _);
    if (!R)
      return !0;
    if (R ? T = x : (T = x === "v" ? "h" : "v", R = qs(x, _)), !R)
      return !1;
    if (!a.current && "changedTouches" in v && (k || N) && (a.current = T), !T)
      return !0;
    var F = a.current || T;
    return dv(F, b, v, F === "h" ? k : N);
  }, []), c = Ae(function(v) {
    var b = v;
    if (!(!en.length || en[en.length - 1] !== o)) {
      var w = "deltaY" in b ? Xs(b) : Da(b), y = t.current.filter(function(T) {
        return T.name === b.type && (T.target === b.target || b.target === T.shadowParent) && uv(T.delta, w);
      })[0];
      if (y && y.should) {
        b.cancelable && b.preventDefault();
        return;
      }
      if (!y) {
        var k = (l.current.shards || []).map(Qs).filter(Boolean).filter(function(T) {
          return T.contains(b.target);
        }), N = k.length > 0 ? u(b, k[0]) : !l.current.noIsolation;
        N && b.cancelable && b.preventDefault();
      }
    }
  }, []), d = Ae(function(v, b, w, y) {
    var k = { name: v, delta: b, target: w, should: y, shadowParent: pv(w) };
    t.current.push(k), setTimeout(function() {
      t.current = t.current.filter(function(N) {
        return N !== k;
      });
    }, 1);
  }, []), h = Ae(function(v) {
    r.current = Da(v), a.current = void 0;
  }, []), m = Ae(function(v) {
    d(v.type, Xs(v), v.target, u(v, e.lockRef.current));
  }, []), f = Ae(function(v) {
    d(v.type, Da(v), v.target, u(v, e.lockRef.current));
  }, []);
  xe(function() {
    return en.push(o), e.setCallbacks({
      onScrollCapture: m,
      onWheelCapture: m,
      onTouchMoveCapture: f
    }), document.addEventListener("wheel", c, Zr), document.addEventListener("touchmove", c, Zr), document.addEventListener("touchstart", h, Zr), function() {
      en = en.filter(function(v) {
        return v !== o;
      }), document.removeEventListener("wheel", c, Zr), document.removeEventListener("touchmove", c, Zr), document.removeEventListener("touchstart", h, Zr);
    };
  }, []);
  var g = e.removeScrollBar, p = e.inert;
  return me(
    ar,
    null,
    p ? me(o, { styles: mv(i) }) : null,
    g ? me(nv, { noRelative: e.noRelative, gapMode: e.gapMode }) : null
  );
}
function pv(e) {
  for (var t = null; e !== null; )
    e instanceof ShadowRoot && (t = e.host, e = e.host), e = e.parentNode;
  return t;
}
const gv = V0(Oc, fv);
var Mi = Q(function(e, t) {
  return me(ao, jt({}, e, { ref: t, sideCar: gv }));
});
Mi.classNames = ao.classNames;
var vv = function(e) {
  if (typeof document > "u")
    return null;
  var t = Array.isArray(e) ? e[0] : e;
  return t.ownerDocument.body;
}, tn = /* @__PURE__ */ new WeakMap(), Ma = /* @__PURE__ */ new WeakMap(), Ia = {}, $o = 0, Fc = function(e) {
  return e && (e.host || Fc(e.parentNode));
}, bv = function(e, t) {
  return t.map(function(r) {
    if (e.contains(r))
      return r;
    var a = Fc(r);
    return a && e.contains(a) ? a : (console.error("aria-hidden", r, "in not contained inside", e, ". Doing nothing"), null);
  }).filter(function(r) {
    return !!r;
  });
}, yv = function(e, t, r, a) {
  var i = bv(t, Array.isArray(e) ? e : [e]);
  Ia[r] || (Ia[r] = /* @__PURE__ */ new WeakMap());
  var o = Ia[r], l = [], u = /* @__PURE__ */ new Set(), c = new Set(i), d = function(m) {
    !m || u.has(m) || (u.add(m), d(m.parentNode));
  };
  i.forEach(d);
  var h = function(m) {
    !m || c.has(m) || Array.prototype.forEach.call(m.children, function(f) {
      if (u.has(f))
        h(f);
      else
        try {
          var g = f.getAttribute(a), p = g !== null && g !== "false", v = (tn.get(f) || 0) + 1, b = (o.get(f) || 0) + 1;
          tn.set(f, v), o.set(f, b), l.push(f), v === 1 && p && Ma.set(f, !0), b === 1 && f.setAttribute(r, "true"), p || f.setAttribute(a, "true");
        } catch (w) {
          console.error("aria-hidden: cannot operate on ", f, w);
        }
    });
  };
  return h(t), u.clear(), $o++, function() {
    l.forEach(function(m) {
      var f = tn.get(m) - 1, g = o.get(m) - 1;
      tn.set(m, f), o.set(m, g), f || (Ma.has(m) || m.removeAttribute(a), Ma.delete(m)), g || m.removeAttribute(r);
    }), $o--, $o || (tn = /* @__PURE__ */ new WeakMap(), tn = /* @__PURE__ */ new WeakMap(), Ma = /* @__PURE__ */ new WeakMap(), Ia = {});
  };
}, zc = function(e, t, r) {
  r === void 0 && (r = "data-aria-hidden");
  var a = Array.from(Array.isArray(e) ? e : [e]), i = vv(e);
  return i ? (a.push.apply(a, Array.from(i.querySelectorAll("[aria-live], script"))), yv(a, i, r, "aria-hidden")) : function() {
    return null;
  };
}, Ii = "Dialog", [jc] = Kr(Ii), [xv, Lt] = jc(Ii), Wc = (e) => {
  const {
    __scopeDialog: t,
    children: r,
    open: a,
    defaultOpen: i,
    onOpenChange: o,
    modal: l = !0
  } = e, u = ve(null), c = ve(null), [d = !1, h] = dn({
    prop: a,
    defaultProp: i,
    onChange: o
  });
  return /* @__PURE__ */ n(
    xv,
    {
      scope: t,
      triggerRef: u,
      contentRef: c,
      contentId: Nr(),
      titleId: Nr(),
      descriptionId: Nr(),
      open: d,
      onOpenChange: h,
      onOpenToggle: Ae(() => h((m) => !m), [h]),
      modal: l,
      children: r
    }
  );
};
Wc.displayName = Ii;
var Uc = "DialogTrigger", Vc = Q(
  (e, t) => {
    const { __scopeDialog: r, ...a } = e, i = Lt(Uc, r), o = Ke(t, i.triggerRef);
    return /* @__PURE__ */ n(
      $e.button,
      {
        type: "button",
        "aria-haspopup": "dialog",
        "aria-expanded": i.open,
        "aria-controls": i.contentId,
        "data-state": Li(i.open),
        ...a,
        ref: o,
        onClick: De(e.onClick, i.onOpenToggle)
      }
    );
  }
);
Vc.displayName = Uc;
var Oi = "DialogPortal", [wv, Hc] = jc(Oi, {
  forceMount: void 0
}), Gc = (e) => {
  const { __scopeDialog: t, forceMount: r, children: a, container: i } = e, o = Lt(Oi, t);
  return /* @__PURE__ */ n(wv, { scope: t, forceMount: r, children: Vt.map(a, (l) => /* @__PURE__ */ n(bn, { present: r || o.open, children: /* @__PURE__ */ n(Di, { asChild: !0, container: i, children: l }) })) });
};
Gc.displayName = Oi;
var Ga = "DialogOverlay", Kc = Q(
  (e, t) => {
    const r = Hc(Ga, e.__scopeDialog), { forceMount: a = r.forceMount, ...i } = e, o = Lt(Ga, e.__scopeDialog);
    return o.modal ? /* @__PURE__ */ n(bn, { present: a || o.open, children: /* @__PURE__ */ n(Nv, { ...i, ref: t }) }) : null;
  }
);
Kc.displayName = Ga;
var Nv = Q(
  (e, t) => {
    const { __scopeDialog: r, ...a } = e, i = Lt(Ga, r);
    return (
      // Make sure `Content` is scrollable even when it doesn't live inside `RemoveScroll`
      // ie. when `Overlay` and `Content` are siblings
      /* @__PURE__ */ n(Mi, { as: kr, allowPinchZoom: !0, shards: [i.contentRef], children: /* @__PURE__ */ n(
        $e.div,
        {
          "data-state": Li(i.open),
          ...a,
          ref: t,
          style: { pointerEvents: "auto", ...a.style }
        }
      ) })
    );
  }
), jr = "DialogContent", Yc = Q(
  (e, t) => {
    const r = Hc(jr, e.__scopeDialog), { forceMount: a = r.forceMount, ...i } = e, o = Lt(jr, e.__scopeDialog);
    return /* @__PURE__ */ n(bn, { present: a || o.open, children: o.modal ? /* @__PURE__ */ n(Cv, { ...i, ref: t }) : /* @__PURE__ */ n(kv, { ...i, ref: t }) });
  }
);
Yc.displayName = jr;
var Cv = Q(
  (e, t) => {
    const r = Lt(jr, e.__scopeDialog), a = ve(null), i = Ke(t, r.contentRef, a);
    return xe(() => {
      const o = a.current;
      if (o) return zc(o);
    }, []), /* @__PURE__ */ n(
      qc,
      {
        ...e,
        ref: i,
        trapFocus: r.open,
        disableOutsidePointerEvents: !0,
        onCloseAutoFocus: De(e.onCloseAutoFocus, (o) => {
          o.preventDefault(), r.triggerRef.current?.focus();
        }),
        onPointerDownOutside: De(e.onPointerDownOutside, (o) => {
          const l = o.detail.originalEvent, u = l.button === 0 && l.ctrlKey === !0;
          (l.button === 2 || u) && o.preventDefault();
        }),
        onFocusOutside: De(
          e.onFocusOutside,
          (o) => o.preventDefault()
        )
      }
    );
  }
), kv = Q(
  (e, t) => {
    const r = Lt(jr, e.__scopeDialog), a = ve(!1), i = ve(!1);
    return /* @__PURE__ */ n(
      qc,
      {
        ...e,
        ref: t,
        trapFocus: !1,
        disableOutsidePointerEvents: !1,
        onCloseAutoFocus: (o) => {
          e.onCloseAutoFocus?.(o), o.defaultPrevented || (a.current || r.triggerRef.current?.focus(), o.preventDefault()), a.current = !1, i.current = !1;
        },
        onInteractOutside: (o) => {
          e.onInteractOutside?.(o), o.defaultPrevented || (a.current = !0, o.detail.originalEvent.type === "pointerdown" && (i.current = !0));
          const l = o.target;
          r.triggerRef.current?.contains(l) && o.preventDefault(), o.detail.originalEvent.type === "focusin" && i.current && o.preventDefault();
        }
      }
    );
  }
), qc = Q(
  (e, t) => {
    const { __scopeDialog: r, trapFocus: a, onOpenAutoFocus: i, onCloseAutoFocus: o, ...l } = e, u = Lt(jr, r), c = ve(null), d = Ke(t, c);
    return Dc(), /* @__PURE__ */ s(Cr, { children: [
      /* @__PURE__ */ n(
        Ai,
        {
          asChild: !0,
          loop: !0,
          trapped: a,
          onMountAutoFocus: i,
          onUnmountAutoFocus: o,
          children: /* @__PURE__ */ n(
            Ti,
            {
              role: "dialog",
              id: u.contentId,
              "aria-describedby": u.descriptionId,
              "aria-labelledby": u.titleId,
              "data-state": Li(u.open),
              ...l,
              ref: d,
              onDismiss: () => u.onOpenChange(!1)
            }
          )
        }
      ),
      /* @__PURE__ */ s(Cr, { children: [
        /* @__PURE__ */ n(Sv, { titleId: u.titleId }),
        /* @__PURE__ */ n(Pv, { contentRef: c, descriptionId: u.descriptionId })
      ] })
    ] });
  }
), $i = "DialogTitle", Xc = Q(
  (e, t) => {
    const { __scopeDialog: r, ...a } = e, i = Lt($i, r);
    return /* @__PURE__ */ n($e.h2, { id: i.titleId, ...a, ref: t });
  }
);
Xc.displayName = $i;
var Qc = "DialogDescription", Jc = Q(
  (e, t) => {
    const { __scopeDialog: r, ...a } = e, i = Lt(Qc, r);
    return /* @__PURE__ */ n($e.p, { id: i.descriptionId, ...a, ref: t });
  }
);
Jc.displayName = Qc;
var Zc = "DialogClose", ed = Q(
  (e, t) => {
    const { __scopeDialog: r, ...a } = e, i = Lt(Zc, r);
    return /* @__PURE__ */ n(
      $e.button,
      {
        type: "button",
        ...a,
        ref: t,
        onClick: De(e.onClick, () => i.onOpenChange(!1))
      }
    );
  }
);
ed.displayName = Zc;
function Li(e) {
  return e ? "open" : "closed";
}
var td = "DialogTitleWarning", [Qx, rd] = Mg(td, {
  contentName: jr,
  titleName: $i,
  docsSlug: "dialog"
}), Sv = ({ titleId: e }) => {
  const t = rd(td), r = `\`${t.contentName}\` requires a \`${t.titleName}\` for the component to be accessible for screen reader users.

If you want to hide the \`${t.titleName}\`, you can wrap it with our VisuallyHidden component.

For more information, see https://radix-ui.com/primitives/docs/components/${t.docsSlug}`;
  return xe(() => {
    e && (document.getElementById(e) || console.error(r));
  }, [r, e]), null;
}, Ev = "DialogDescriptionWarning", Pv = ({ contentRef: e, descriptionId: t }) => {
  const a = `Warning: Missing \`Description\` or \`aria-describedby={undefined}\` for {${rd(Ev).contentName}}.`;
  return xe(() => {
    const i = e.current?.getAttribute("aria-describedby");
    t && i && (document.getElementById(t) || console.warn(a));
  }, [a, e, t]), null;
}, Rv = Wc, Tv = Vc, Av = Gc, nd = Kc, Dv = Yc, Mv = Xc, Iv = Jc, Ov = ed;
function gr({
  ...e
}) {
  return /* @__PURE__ */ n(Rv, { "data-slot": "dialog", ...e });
}
function In({
  ...e
}) {
  return /* @__PURE__ */ n(Tv, { "data-slot": "dialog-trigger", ...e });
}
function $v({
  ...e
}) {
  return /* @__PURE__ */ n(Av, { "data-slot": "dialog-portal", ...e });
}
const ad = Q(({ className: e, ...t }, r) => /* @__PURE__ */ n(
  nd,
  {
    ref: r,
    "data-slot": "dialog-overlay",
    className: Oe(
      "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 fixed inset-0 z-50 bg-black/50",
      e
    ),
    ...t
  }
));
ad.displayName = nd.displayName;
function vr({
  className: e,
  children: t,
  ...r
}) {
  return /* @__PURE__ */ s($v, { "data-slot": "dialog-portal", children: [
    /* @__PURE__ */ n(ad, {}),
    /* @__PURE__ */ s(
      Dv,
      {
        "data-slot": "dialog-content",
        className: Oe(
          "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border p-6 shadow-lg duration-200 sm:max-w-lg",
          e
        ),
        ...r,
        children: [
          t,
          /* @__PURE__ */ s(Ov, { className: "ring-offset-background focus:ring-ring data-[state=open]:bg-accent data-[state=open]:text-muted-foreground absolute top-4 right-4 rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:ring-2 focus:ring-offset-2 focus:outline-hidden disabled:pointer-events-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4", children: [
            /* @__PURE__ */ n(yt, {}),
            /* @__PURE__ */ n("span", { className: "sr-only", children: "Close" })
          ] })
        ]
      }
    )
  ] });
}
function br({ className: e, ...t }) {
  return /* @__PURE__ */ n(
    "div",
    {
      "data-slot": "dialog-header",
      className: Oe("flex flex-col gap-2 text-center sm:text-left", e),
      ...t
    }
  );
}
function yr({
  className: e,
  ...t
}) {
  return /* @__PURE__ */ n(
    Mv,
    {
      "data-slot": "dialog-title",
      className: Oe("text-lg leading-none font-semibold", e),
      ...t
    }
  );
}
function zn({
  className: e,
  ...t
}) {
  return /* @__PURE__ */ n(
    Iv,
    {
      "data-slot": "dialog-description",
      className: Oe("text-muted-foreground text-sm", e),
      ...t
    }
  );
}
function Js(e, [t, r]) {
  return Math.min(r, Math.max(t, e));
}
function od(e) {
  const t = e + "CollectionProvider", [r, a] = Kr(t), [i, o] = r(
    t,
    { collectionRef: { current: null }, itemMap: /* @__PURE__ */ new Map() }
  ), l = (g) => {
    const { scope: p, children: v } = g, b = B.useRef(null), w = B.useRef(/* @__PURE__ */ new Map()).current;
    return /* @__PURE__ */ n(i, { scope: p, itemMap: w, collectionRef: b, children: v });
  };
  l.displayName = t;
  const u = e + "CollectionSlot", c = B.forwardRef(
    (g, p) => {
      const { scope: v, children: b } = g, w = o(u, v), y = Ke(p, w.collectionRef);
      return /* @__PURE__ */ n(kr, { ref: y, children: b });
    }
  );
  c.displayName = u;
  const d = e + "CollectionItemSlot", h = "data-radix-collection-item", m = B.forwardRef(
    (g, p) => {
      const { scope: v, children: b, ...w } = g, y = B.useRef(null), k = Ke(p, y), N = o(d, v);
      return B.useEffect(() => (N.itemMap.set(y, { ref: y, ...w }), () => void N.itemMap.delete(y))), /* @__PURE__ */ n(kr, { [h]: "", ref: k, children: b });
    }
  );
  m.displayName = d;
  function f(g) {
    const p = o(e + "CollectionConsumer", g);
    return B.useCallback(() => {
      const b = p.collectionRef.current;
      if (!b) return [];
      const w = Array.from(b.querySelectorAll(`[${h}]`));
      return Array.from(p.itemMap.values()).sort(
        (N, T) => w.indexOf(N.ref.current) - w.indexOf(T.ref.current)
      );
    }, [p.collectionRef, p.itemMap]);
  }
  return [
    { Provider: l, Slot: c, ItemSlot: m },
    f,
    a
  ];
}
var Lv = et(void 0);
function _i(e) {
  const t = ke(Lv);
  return e || t || "ltr";
}
const _v = ["top", "right", "bottom", "left"], Pr = Math.min, wt = Math.max, Ka = Math.round, Oa = Math.floor, Gt = (e) => ({
  x: e,
  y: e
}), Bv = {
  left: "right",
  right: "left",
  bottom: "top",
  top: "bottom"
}, Fv = {
  start: "end",
  end: "start"
};
function Jo(e, t, r) {
  return wt(e, Pr(t, r));
}
function or(e, t) {
  return typeof e == "function" ? e(t) : e;
}
function ir(e) {
  return e.split("-")[0];
}
function yn(e) {
  return e.split("-")[1];
}
function Bi(e) {
  return e === "x" ? "y" : "x";
}
function Fi(e) {
  return e === "y" ? "height" : "width";
}
const zv = /* @__PURE__ */ new Set(["top", "bottom"]);
function Ut(e) {
  return zv.has(ir(e)) ? "y" : "x";
}
function zi(e) {
  return Bi(Ut(e));
}
function jv(e, t, r) {
  r === void 0 && (r = !1);
  const a = yn(e), i = zi(e), o = Fi(i);
  let l = i === "x" ? a === (r ? "end" : "start") ? "right" : "left" : a === "start" ? "bottom" : "top";
  return t.reference[o] > t.floating[o] && (l = Ya(l)), [l, Ya(l)];
}
function Wv(e) {
  const t = Ya(e);
  return [Zo(e), t, Zo(t)];
}
function Zo(e) {
  return e.replace(/start|end/g, (t) => Fv[t]);
}
const Zs = ["left", "right"], el = ["right", "left"], Uv = ["top", "bottom"], Vv = ["bottom", "top"];
function Hv(e, t, r) {
  switch (e) {
    case "top":
    case "bottom":
      return r ? t ? el : Zs : t ? Zs : el;
    case "left":
    case "right":
      return t ? Uv : Vv;
    default:
      return [];
  }
}
function Gv(e, t, r, a) {
  const i = yn(e);
  let o = Hv(ir(e), r === "start", a);
  return i && (o = o.map((l) => l + "-" + i), t && (o = o.concat(o.map(Zo)))), o;
}
function Ya(e) {
  return e.replace(/left|right|bottom|top/g, (t) => Bv[t]);
}
function Kv(e) {
  return {
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    ...e
  };
}
function id(e) {
  return typeof e != "number" ? Kv(e) : {
    top: e,
    right: e,
    bottom: e,
    left: e
  };
}
function qa(e) {
  const {
    x: t,
    y: r,
    width: a,
    height: i
  } = e;
  return {
    width: a,
    height: i,
    top: r,
    left: t,
    right: t + a,
    bottom: r + i,
    x: t,
    y: r
  };
}
function tl(e, t, r) {
  let {
    reference: a,
    floating: i
  } = e;
  const o = Ut(t), l = zi(t), u = Fi(l), c = ir(t), d = o === "y", h = a.x + a.width / 2 - i.width / 2, m = a.y + a.height / 2 - i.height / 2, f = a[u] / 2 - i[u] / 2;
  let g;
  switch (c) {
    case "top":
      g = {
        x: h,
        y: a.y - i.height
      };
      break;
    case "bottom":
      g = {
        x: h,
        y: a.y + a.height
      };
      break;
    case "right":
      g = {
        x: a.x + a.width,
        y: m
      };
      break;
    case "left":
      g = {
        x: a.x - i.width,
        y: m
      };
      break;
    default:
      g = {
        x: a.x,
        y: a.y
      };
  }
  switch (yn(t)) {
    case "start":
      g[l] -= f * (r && d ? -1 : 1);
      break;
    case "end":
      g[l] += f * (r && d ? -1 : 1);
      break;
  }
  return g;
}
const Yv = async (e, t, r) => {
  const {
    placement: a = "bottom",
    strategy: i = "absolute",
    middleware: o = [],
    platform: l
  } = r, u = o.filter(Boolean), c = await (l.isRTL == null ? void 0 : l.isRTL(t));
  let d = await l.getElementRects({
    reference: e,
    floating: t,
    strategy: i
  }), {
    x: h,
    y: m
  } = tl(d, a, c), f = a, g = {}, p = 0;
  for (let v = 0; v < u.length; v++) {
    const {
      name: b,
      fn: w
    } = u[v], {
      x: y,
      y: k,
      data: N,
      reset: T
    } = await w({
      x: h,
      y: m,
      initialPlacement: a,
      placement: f,
      strategy: i,
      middlewareData: g,
      rects: d,
      platform: l,
      elements: {
        reference: e,
        floating: t
      }
    });
    h = y ?? h, m = k ?? m, g = {
      ...g,
      [b]: {
        ...g[b],
        ...N
      }
    }, T && p <= 50 && (p++, typeof T == "object" && (T.placement && (f = T.placement), T.rects && (d = T.rects === !0 ? await l.getElementRects({
      reference: e,
      floating: t,
      strategy: i
    }) : T.rects), {
      x: h,
      y: m
    } = tl(d, f, c)), v = -1);
  }
  return {
    x: h,
    y: m,
    placement: f,
    strategy: i,
    middlewareData: g
  };
};
async function Qn(e, t) {
  var r;
  t === void 0 && (t = {});
  const {
    x: a,
    y: i,
    platform: o,
    rects: l,
    elements: u,
    strategy: c
  } = e, {
    boundary: d = "clippingAncestors",
    rootBoundary: h = "viewport",
    elementContext: m = "floating",
    altBoundary: f = !1,
    padding: g = 0
  } = or(t, e), p = id(g), b = u[f ? m === "floating" ? "reference" : "floating" : m], w = qa(await o.getClippingRect({
    element: (r = await (o.isElement == null ? void 0 : o.isElement(b))) == null || r ? b : b.contextElement || await (o.getDocumentElement == null ? void 0 : o.getDocumentElement(u.floating)),
    boundary: d,
    rootBoundary: h,
    strategy: c
  })), y = m === "floating" ? {
    x: a,
    y: i,
    width: l.floating.width,
    height: l.floating.height
  } : l.reference, k = await (o.getOffsetParent == null ? void 0 : o.getOffsetParent(u.floating)), N = await (o.isElement == null ? void 0 : o.isElement(k)) ? await (o.getScale == null ? void 0 : o.getScale(k)) || {
    x: 1,
    y: 1
  } : {
    x: 1,
    y: 1
  }, T = qa(o.convertOffsetParentRelativeRectToViewportRelativeRect ? await o.convertOffsetParentRelativeRectToViewportRelativeRect({
    elements: u,
    rect: y,
    offsetParent: k,
    strategy: c
  }) : y);
  return {
    top: (w.top - T.top + p.top) / N.y,
    bottom: (T.bottom - w.bottom + p.bottom) / N.y,
    left: (w.left - T.left + p.left) / N.x,
    right: (T.right - w.right + p.right) / N.x
  };
}
const qv = (e) => ({
  name: "arrow",
  options: e,
  async fn(t) {
    const {
      x: r,
      y: a,
      placement: i,
      rects: o,
      platform: l,
      elements: u,
      middlewareData: c
    } = t, {
      element: d,
      padding: h = 0
    } = or(e, t) || {};
    if (d == null)
      return {};
    const m = id(h), f = {
      x: r,
      y: a
    }, g = zi(i), p = Fi(g), v = await l.getDimensions(d), b = g === "y", w = b ? "top" : "left", y = b ? "bottom" : "right", k = b ? "clientHeight" : "clientWidth", N = o.reference[p] + o.reference[g] - f[g] - o.floating[p], T = f[g] - o.reference[g], _ = await (l.getOffsetParent == null ? void 0 : l.getOffsetParent(d));
    let x = _ ? _[k] : 0;
    (!x || !await (l.isElement == null ? void 0 : l.isElement(_))) && (x = u.floating[k] || o.floating[p]);
    const R = N / 2 - T / 2, F = x / 2 - v[p] / 2 - 1, V = Pr(m[w], F), E = Pr(m[y], F), S = V, $ = x - v[p] - E, A = x / 2 - v[p] / 2 + R, U = Jo(S, A, $), I = !c.arrow && yn(i) != null && A !== U && o.reference[p] / 2 - (A < S ? V : E) - v[p] / 2 < 0, Y = I ? A < S ? A - S : A - $ : 0;
    return {
      [g]: f[g] + Y,
      data: {
        [g]: U,
        centerOffset: A - U - Y,
        ...I && {
          alignmentOffset: Y
        }
      },
      reset: I
    };
  }
}), Xv = function(e) {
  return e === void 0 && (e = {}), {
    name: "flip",
    options: e,
    async fn(t) {
      var r, a;
      const {
        placement: i,
        middlewareData: o,
        rects: l,
        initialPlacement: u,
        platform: c,
        elements: d
      } = t, {
        mainAxis: h = !0,
        crossAxis: m = !0,
        fallbackPlacements: f,
        fallbackStrategy: g = "bestFit",
        fallbackAxisSideDirection: p = "none",
        flipAlignment: v = !0,
        ...b
      } = or(e, t);
      if ((r = o.arrow) != null && r.alignmentOffset)
        return {};
      const w = ir(i), y = Ut(u), k = ir(u) === u, N = await (c.isRTL == null ? void 0 : c.isRTL(d.floating)), T = f || (k || !v ? [Ya(u)] : Wv(u)), _ = p !== "none";
      !f && _ && T.push(...Gv(u, v, p, N));
      const x = [u, ...T], R = await Qn(t, b), F = [];
      let V = ((a = o.flip) == null ? void 0 : a.overflows) || [];
      if (h && F.push(R[w]), m) {
        const A = jv(i, l, N);
        F.push(R[A[0]], R[A[1]]);
      }
      if (V = [...V, {
        placement: i,
        overflows: F
      }], !F.every((A) => A <= 0)) {
        var E, S;
        const A = (((E = o.flip) == null ? void 0 : E.index) || 0) + 1, U = x[A];
        if (U && (!(m === "alignment" ? y !== Ut(U) : !1) || // We leave the current main axis only if every placement on that axis
        // overflows the main axis.
        V.every((D) => Ut(D.placement) === y ? D.overflows[0] > 0 : !0)))
          return {
            data: {
              index: A,
              overflows: V
            },
            reset: {
              placement: U
            }
          };
        let I = (S = V.filter((Y) => Y.overflows[0] <= 0).sort((Y, D) => Y.overflows[1] - D.overflows[1])[0]) == null ? void 0 : S.placement;
        if (!I)
          switch (g) {
            case "bestFit": {
              var $;
              const Y = ($ = V.filter((D) => {
                if (_) {
                  const J = Ut(D.placement);
                  return J === y || // Create a bias to the `y` side axis due to horizontal
                  // reading directions favoring greater width.
                  J === "y";
                }
                return !0;
              }).map((D) => [D.placement, D.overflows.filter((J) => J > 0).reduce((J, we) => J + we, 0)]).sort((D, J) => D[1] - J[1])[0]) == null ? void 0 : $[0];
              Y && (I = Y);
              break;
            }
            case "initialPlacement":
              I = u;
              break;
          }
        if (i !== I)
          return {
            reset: {
              placement: I
            }
          };
      }
      return {};
    }
  };
};
function rl(e, t) {
  return {
    top: e.top - t.height,
    right: e.right - t.width,
    bottom: e.bottom - t.height,
    left: e.left - t.width
  };
}
function nl(e) {
  return _v.some((t) => e[t] >= 0);
}
const Qv = function(e) {
  return e === void 0 && (e = {}), {
    name: "hide",
    options: e,
    async fn(t) {
      const {
        rects: r
      } = t, {
        strategy: a = "referenceHidden",
        ...i
      } = or(e, t);
      switch (a) {
        case "referenceHidden": {
          const o = await Qn(t, {
            ...i,
            elementContext: "reference"
          }), l = rl(o, r.reference);
          return {
            data: {
              referenceHiddenOffsets: l,
              referenceHidden: nl(l)
            }
          };
        }
        case "escaped": {
          const o = await Qn(t, {
            ...i,
            altBoundary: !0
          }), l = rl(o, r.floating);
          return {
            data: {
              escapedOffsets: l,
              escaped: nl(l)
            }
          };
        }
        default:
          return {};
      }
    }
  };
}, sd = /* @__PURE__ */ new Set(["left", "top"]);
async function Jv(e, t) {
  const {
    placement: r,
    platform: a,
    elements: i
  } = e, o = await (a.isRTL == null ? void 0 : a.isRTL(i.floating)), l = ir(r), u = yn(r), c = Ut(r) === "y", d = sd.has(l) ? -1 : 1, h = o && c ? -1 : 1, m = or(t, e);
  let {
    mainAxis: f,
    crossAxis: g,
    alignmentAxis: p
  } = typeof m == "number" ? {
    mainAxis: m,
    crossAxis: 0,
    alignmentAxis: null
  } : {
    mainAxis: m.mainAxis || 0,
    crossAxis: m.crossAxis || 0,
    alignmentAxis: m.alignmentAxis
  };
  return u && typeof p == "number" && (g = u === "end" ? p * -1 : p), c ? {
    x: g * h,
    y: f * d
  } : {
    x: f * d,
    y: g * h
  };
}
const Zv = function(e) {
  return e === void 0 && (e = 0), {
    name: "offset",
    options: e,
    async fn(t) {
      var r, a;
      const {
        x: i,
        y: o,
        placement: l,
        middlewareData: u
      } = t, c = await Jv(t, e);
      return l === ((r = u.offset) == null ? void 0 : r.placement) && (a = u.arrow) != null && a.alignmentOffset ? {} : {
        x: i + c.x,
        y: o + c.y,
        data: {
          ...c,
          placement: l
        }
      };
    }
  };
}, eb = function(e) {
  return e === void 0 && (e = {}), {
    name: "shift",
    options: e,
    async fn(t) {
      const {
        x: r,
        y: a,
        placement: i
      } = t, {
        mainAxis: o = !0,
        crossAxis: l = !1,
        limiter: u = {
          fn: (b) => {
            let {
              x: w,
              y
            } = b;
            return {
              x: w,
              y
            };
          }
        },
        ...c
      } = or(e, t), d = {
        x: r,
        y: a
      }, h = await Qn(t, c), m = Ut(ir(i)), f = Bi(m);
      let g = d[f], p = d[m];
      if (o) {
        const b = f === "y" ? "top" : "left", w = f === "y" ? "bottom" : "right", y = g + h[b], k = g - h[w];
        g = Jo(y, g, k);
      }
      if (l) {
        const b = m === "y" ? "top" : "left", w = m === "y" ? "bottom" : "right", y = p + h[b], k = p - h[w];
        p = Jo(y, p, k);
      }
      const v = u.fn({
        ...t,
        [f]: g,
        [m]: p
      });
      return {
        ...v,
        data: {
          x: v.x - r,
          y: v.y - a,
          enabled: {
            [f]: o,
            [m]: l
          }
        }
      };
    }
  };
}, tb = function(e) {
  return e === void 0 && (e = {}), {
    options: e,
    fn(t) {
      const {
        x: r,
        y: a,
        placement: i,
        rects: o,
        middlewareData: l
      } = t, {
        offset: u = 0,
        mainAxis: c = !0,
        crossAxis: d = !0
      } = or(e, t), h = {
        x: r,
        y: a
      }, m = Ut(i), f = Bi(m);
      let g = h[f], p = h[m];
      const v = or(u, t), b = typeof v == "number" ? {
        mainAxis: v,
        crossAxis: 0
      } : {
        mainAxis: 0,
        crossAxis: 0,
        ...v
      };
      if (c) {
        const k = f === "y" ? "height" : "width", N = o.reference[f] - o.floating[k] + b.mainAxis, T = o.reference[f] + o.reference[k] - b.mainAxis;
        g < N ? g = N : g > T && (g = T);
      }
      if (d) {
        var w, y;
        const k = f === "y" ? "width" : "height", N = sd.has(ir(i)), T = o.reference[m] - o.floating[k] + (N && ((w = l.offset) == null ? void 0 : w[m]) || 0) + (N ? 0 : b.crossAxis), _ = o.reference[m] + o.reference[k] + (N ? 0 : ((y = l.offset) == null ? void 0 : y[m]) || 0) - (N ? b.crossAxis : 0);
        p < T ? p = T : p > _ && (p = _);
      }
      return {
        [f]: g,
        [m]: p
      };
    }
  };
}, rb = function(e) {
  return e === void 0 && (e = {}), {
    name: "size",
    options: e,
    async fn(t) {
      var r, a;
      const {
        placement: i,
        rects: o,
        platform: l,
        elements: u
      } = t, {
        apply: c = () => {
        },
        ...d
      } = or(e, t), h = await Qn(t, d), m = ir(i), f = yn(i), g = Ut(i) === "y", {
        width: p,
        height: v
      } = o.floating;
      let b, w;
      m === "top" || m === "bottom" ? (b = m, w = f === (await (l.isRTL == null ? void 0 : l.isRTL(u.floating)) ? "start" : "end") ? "left" : "right") : (w = m, b = f === "end" ? "top" : "bottom");
      const y = v - h.top - h.bottom, k = p - h.left - h.right, N = Pr(v - h[b], y), T = Pr(p - h[w], k), _ = !t.middlewareData.shift;
      let x = N, R = T;
      if ((r = t.middlewareData.shift) != null && r.enabled.x && (R = k), (a = t.middlewareData.shift) != null && a.enabled.y && (x = y), _ && !f) {
        const V = wt(h.left, 0), E = wt(h.right, 0), S = wt(h.top, 0), $ = wt(h.bottom, 0);
        g ? R = p - 2 * (V !== 0 || E !== 0 ? V + E : wt(h.left, h.right)) : x = v - 2 * (S !== 0 || $ !== 0 ? S + $ : wt(h.top, h.bottom));
      }
      await c({
        ...t,
        availableWidth: R,
        availableHeight: x
      });
      const F = await l.getDimensions(u.floating);
      return p !== F.width || v !== F.height ? {
        reset: {
          rects: !0
        }
      } : {};
    }
  };
};
function oo() {
  return typeof window < "u";
}
function xn(e) {
  return ld(e) ? (e.nodeName || "").toLowerCase() : "#document";
}
function Nt(e) {
  var t;
  return (e == null || (t = e.ownerDocument) == null ? void 0 : t.defaultView) || window;
}
function Qt(e) {
  var t;
  return (t = (ld(e) ? e.ownerDocument : e.document) || window.document) == null ? void 0 : t.documentElement;
}
function ld(e) {
  return oo() ? e instanceof Node || e instanceof Nt(e).Node : !1;
}
function Ot(e) {
  return oo() ? e instanceof Element || e instanceof Nt(e).Element : !1;
}
function qt(e) {
  return oo() ? e instanceof HTMLElement || e instanceof Nt(e).HTMLElement : !1;
}
function al(e) {
  return !oo() || typeof ShadowRoot > "u" ? !1 : e instanceof ShadowRoot || e instanceof Nt(e).ShadowRoot;
}
const nb = /* @__PURE__ */ new Set(["inline", "contents"]);
function da(e) {
  const {
    overflow: t,
    overflowX: r,
    overflowY: a,
    display: i
  } = $t(e);
  return /auto|scroll|overlay|hidden|clip/.test(t + a + r) && !nb.has(i);
}
const ab = /* @__PURE__ */ new Set(["table", "td", "th"]);
function ob(e) {
  return ab.has(xn(e));
}
const ib = [":popover-open", ":modal"];
function io(e) {
  return ib.some((t) => {
    try {
      return e.matches(t);
    } catch {
      return !1;
    }
  });
}
const sb = ["transform", "translate", "scale", "rotate", "perspective"], lb = ["transform", "translate", "scale", "rotate", "perspective", "filter"], cb = ["paint", "layout", "strict", "content"];
function ji(e) {
  const t = Wi(), r = Ot(e) ? $t(e) : e;
  return sb.some((a) => r[a] ? r[a] !== "none" : !1) || (r.containerType ? r.containerType !== "normal" : !1) || !t && (r.backdropFilter ? r.backdropFilter !== "none" : !1) || !t && (r.filter ? r.filter !== "none" : !1) || lb.some((a) => (r.willChange || "").includes(a)) || cb.some((a) => (r.contain || "").includes(a));
}
function db(e) {
  let t = Rr(e);
  for (; qt(t) && !un(t); ) {
    if (ji(t))
      return t;
    if (io(t))
      return null;
    t = Rr(t);
  }
  return null;
}
function Wi() {
  return typeof CSS > "u" || !CSS.supports ? !1 : CSS.supports("-webkit-backdrop-filter", "none");
}
const ub = /* @__PURE__ */ new Set(["html", "body", "#document"]);
function un(e) {
  return ub.has(xn(e));
}
function $t(e) {
  return Nt(e).getComputedStyle(e);
}
function so(e) {
  return Ot(e) ? {
    scrollLeft: e.scrollLeft,
    scrollTop: e.scrollTop
  } : {
    scrollLeft: e.scrollX,
    scrollTop: e.scrollY
  };
}
function Rr(e) {
  if (xn(e) === "html")
    return e;
  const t = (
    // Step into the shadow DOM of the parent of a slotted node.
    e.assignedSlot || // DOM Element detected.
    e.parentNode || // ShadowRoot detected.
    al(e) && e.host || // Fallback.
    Qt(e)
  );
  return al(t) ? t.host : t;
}
function cd(e) {
  const t = Rr(e);
  return un(t) ? e.ownerDocument ? e.ownerDocument.body : e.body : qt(t) && da(t) ? t : cd(t);
}
function Jn(e, t, r) {
  var a;
  t === void 0 && (t = []), r === void 0 && (r = !0);
  const i = cd(e), o = i === ((a = e.ownerDocument) == null ? void 0 : a.body), l = Nt(i);
  if (o) {
    const u = ei(l);
    return t.concat(l, l.visualViewport || [], da(i) ? i : [], u && r ? Jn(u) : []);
  }
  return t.concat(i, Jn(i, [], r));
}
function ei(e) {
  return e.parent && Object.getPrototypeOf(e.parent) ? e.frameElement : null;
}
function dd(e) {
  const t = $t(e);
  let r = parseFloat(t.width) || 0, a = parseFloat(t.height) || 0;
  const i = qt(e), o = i ? e.offsetWidth : r, l = i ? e.offsetHeight : a, u = Ka(r) !== o || Ka(a) !== l;
  return u && (r = o, a = l), {
    width: r,
    height: a,
    $: u
  };
}
function Ui(e) {
  return Ot(e) ? e : e.contextElement;
}
function cn(e) {
  const t = Ui(e);
  if (!qt(t))
    return Gt(1);
  const r = t.getBoundingClientRect(), {
    width: a,
    height: i,
    $: o
  } = dd(t);
  let l = (o ? Ka(r.width) : r.width) / a, u = (o ? Ka(r.height) : r.height) / i;
  return (!l || !Number.isFinite(l)) && (l = 1), (!u || !Number.isFinite(u)) && (u = 1), {
    x: l,
    y: u
  };
}
const mb = /* @__PURE__ */ Gt(0);
function ud(e) {
  const t = Nt(e);
  return !Wi() || !t.visualViewport ? mb : {
    x: t.visualViewport.offsetLeft,
    y: t.visualViewport.offsetTop
  };
}
function hb(e, t, r) {
  return t === void 0 && (t = !1), !r || t && r !== Nt(e) ? !1 : t;
}
function Wr(e, t, r, a) {
  t === void 0 && (t = !1), r === void 0 && (r = !1);
  const i = e.getBoundingClientRect(), o = Ui(e);
  let l = Gt(1);
  t && (a ? Ot(a) && (l = cn(a)) : l = cn(e));
  const u = hb(o, r, a) ? ud(o) : Gt(0);
  let c = (i.left + u.x) / l.x, d = (i.top + u.y) / l.y, h = i.width / l.x, m = i.height / l.y;
  if (o) {
    const f = Nt(o), g = a && Ot(a) ? Nt(a) : a;
    let p = f, v = ei(p);
    for (; v && a && g !== p; ) {
      const b = cn(v), w = v.getBoundingClientRect(), y = $t(v), k = w.left + (v.clientLeft + parseFloat(y.paddingLeft)) * b.x, N = w.top + (v.clientTop + parseFloat(y.paddingTop)) * b.y;
      c *= b.x, d *= b.y, h *= b.x, m *= b.y, c += k, d += N, p = Nt(v), v = ei(p);
    }
  }
  return qa({
    width: h,
    height: m,
    x: c,
    y: d
  });
}
function lo(e, t) {
  const r = so(e).scrollLeft;
  return t ? t.left + r : Wr(Qt(e)).left + r;
}
function md(e, t) {
  const r = e.getBoundingClientRect(), a = r.left + t.scrollLeft - lo(e, r), i = r.top + t.scrollTop;
  return {
    x: a,
    y: i
  };
}
function fb(e) {
  let {
    elements: t,
    rect: r,
    offsetParent: a,
    strategy: i
  } = e;
  const o = i === "fixed", l = Qt(a), u = t ? io(t.floating) : !1;
  if (a === l || u && o)
    return r;
  let c = {
    scrollLeft: 0,
    scrollTop: 0
  }, d = Gt(1);
  const h = Gt(0), m = qt(a);
  if ((m || !m && !o) && ((xn(a) !== "body" || da(l)) && (c = so(a)), qt(a))) {
    const g = Wr(a);
    d = cn(a), h.x = g.x + a.clientLeft, h.y = g.y + a.clientTop;
  }
  const f = l && !m && !o ? md(l, c) : Gt(0);
  return {
    width: r.width * d.x,
    height: r.height * d.y,
    x: r.x * d.x - c.scrollLeft * d.x + h.x + f.x,
    y: r.y * d.y - c.scrollTop * d.y + h.y + f.y
  };
}
function pb(e) {
  return Array.from(e.getClientRects());
}
function gb(e) {
  const t = Qt(e), r = so(e), a = e.ownerDocument.body, i = wt(t.scrollWidth, t.clientWidth, a.scrollWidth, a.clientWidth), o = wt(t.scrollHeight, t.clientHeight, a.scrollHeight, a.clientHeight);
  let l = -r.scrollLeft + lo(e);
  const u = -r.scrollTop;
  return $t(a).direction === "rtl" && (l += wt(t.clientWidth, a.clientWidth) - i), {
    width: i,
    height: o,
    x: l,
    y: u
  };
}
const ol = 25;
function vb(e, t) {
  const r = Nt(e), a = Qt(e), i = r.visualViewport;
  let o = a.clientWidth, l = a.clientHeight, u = 0, c = 0;
  if (i) {
    o = i.width, l = i.height;
    const h = Wi();
    (!h || h && t === "fixed") && (u = i.offsetLeft, c = i.offsetTop);
  }
  const d = lo(a);
  if (d <= 0) {
    const h = a.ownerDocument, m = h.body, f = getComputedStyle(m), g = h.compatMode === "CSS1Compat" && parseFloat(f.marginLeft) + parseFloat(f.marginRight) || 0, p = Math.abs(a.clientWidth - m.clientWidth - g);
    p <= ol && (o -= p);
  } else d <= ol && (o += d);
  return {
    width: o,
    height: l,
    x: u,
    y: c
  };
}
const bb = /* @__PURE__ */ new Set(["absolute", "fixed"]);
function yb(e, t) {
  const r = Wr(e, !0, t === "fixed"), a = r.top + e.clientTop, i = r.left + e.clientLeft, o = qt(e) ? cn(e) : Gt(1), l = e.clientWidth * o.x, u = e.clientHeight * o.y, c = i * o.x, d = a * o.y;
  return {
    width: l,
    height: u,
    x: c,
    y: d
  };
}
function il(e, t, r) {
  let a;
  if (t === "viewport")
    a = vb(e, r);
  else if (t === "document")
    a = gb(Qt(e));
  else if (Ot(t))
    a = yb(t, r);
  else {
    const i = ud(e);
    a = {
      x: t.x - i.x,
      y: t.y - i.y,
      width: t.width,
      height: t.height
    };
  }
  return qa(a);
}
function hd(e, t) {
  const r = Rr(e);
  return r === t || !Ot(r) || un(r) ? !1 : $t(r).position === "fixed" || hd(r, t);
}
function xb(e, t) {
  const r = t.get(e);
  if (r)
    return r;
  let a = Jn(e, [], !1).filter((u) => Ot(u) && xn(u) !== "body"), i = null;
  const o = $t(e).position === "fixed";
  let l = o ? Rr(e) : e;
  for (; Ot(l) && !un(l); ) {
    const u = $t(l), c = ji(l);
    !c && u.position === "fixed" && (i = null), (o ? !c && !i : !c && u.position === "static" && !!i && bb.has(i.position) || da(l) && !c && hd(e, l)) ? a = a.filter((h) => h !== l) : i = u, l = Rr(l);
  }
  return t.set(e, a), a;
}
function wb(e) {
  let {
    element: t,
    boundary: r,
    rootBoundary: a,
    strategy: i
  } = e;
  const l = [...r === "clippingAncestors" ? io(t) ? [] : xb(t, this._c) : [].concat(r), a], u = l[0], c = l.reduce((d, h) => {
    const m = il(t, h, i);
    return d.top = wt(m.top, d.top), d.right = Pr(m.right, d.right), d.bottom = Pr(m.bottom, d.bottom), d.left = wt(m.left, d.left), d;
  }, il(t, u, i));
  return {
    width: c.right - c.left,
    height: c.bottom - c.top,
    x: c.left,
    y: c.top
  };
}
function Nb(e) {
  const {
    width: t,
    height: r
  } = dd(e);
  return {
    width: t,
    height: r
  };
}
function Cb(e, t, r) {
  const a = qt(t), i = Qt(t), o = r === "fixed", l = Wr(e, !0, o, t);
  let u = {
    scrollLeft: 0,
    scrollTop: 0
  };
  const c = Gt(0);
  function d() {
    c.x = lo(i);
  }
  if (a || !a && !o)
    if ((xn(t) !== "body" || da(i)) && (u = so(t)), a) {
      const g = Wr(t, !0, o, t);
      c.x = g.x + t.clientLeft, c.y = g.y + t.clientTop;
    } else i && d();
  o && !a && i && d();
  const h = i && !a && !o ? md(i, u) : Gt(0), m = l.left + u.scrollLeft - c.x - h.x, f = l.top + u.scrollTop - c.y - h.y;
  return {
    x: m,
    y: f,
    width: l.width,
    height: l.height
  };
}
function Lo(e) {
  return $t(e).position === "static";
}
function sl(e, t) {
  if (!qt(e) || $t(e).position === "fixed")
    return null;
  if (t)
    return t(e);
  let r = e.offsetParent;
  return Qt(e) === r && (r = r.ownerDocument.body), r;
}
function fd(e, t) {
  const r = Nt(e);
  if (io(e))
    return r;
  if (!qt(e)) {
    let i = Rr(e);
    for (; i && !un(i); ) {
      if (Ot(i) && !Lo(i))
        return i;
      i = Rr(i);
    }
    return r;
  }
  let a = sl(e, t);
  for (; a && ob(a) && Lo(a); )
    a = sl(a, t);
  return a && un(a) && Lo(a) && !ji(a) ? r : a || db(e) || r;
}
const kb = async function(e) {
  const t = this.getOffsetParent || fd, r = this.getDimensions, a = await r(e.floating);
  return {
    reference: Cb(e.reference, await t(e.floating), e.strategy),
    floating: {
      x: 0,
      y: 0,
      width: a.width,
      height: a.height
    }
  };
};
function Sb(e) {
  return $t(e).direction === "rtl";
}
const Eb = {
  convertOffsetParentRelativeRectToViewportRelativeRect: fb,
  getDocumentElement: Qt,
  getClippingRect: wb,
  getOffsetParent: fd,
  getElementRects: kb,
  getClientRects: pb,
  getDimensions: Nb,
  getScale: cn,
  isElement: Ot,
  isRTL: Sb
};
function pd(e, t) {
  return e.x === t.x && e.y === t.y && e.width === t.width && e.height === t.height;
}
function Pb(e, t) {
  let r = null, a;
  const i = Qt(e);
  function o() {
    var u;
    clearTimeout(a), (u = r) == null || u.disconnect(), r = null;
  }
  function l(u, c) {
    u === void 0 && (u = !1), c === void 0 && (c = 1), o();
    const d = e.getBoundingClientRect(), {
      left: h,
      top: m,
      width: f,
      height: g
    } = d;
    if (u || t(), !f || !g)
      return;
    const p = Oa(m), v = Oa(i.clientWidth - (h + f)), b = Oa(i.clientHeight - (m + g)), w = Oa(h), k = {
      rootMargin: -p + "px " + -v + "px " + -b + "px " + -w + "px",
      threshold: wt(0, Pr(1, c)) || 1
    };
    let N = !0;
    function T(_) {
      const x = _[0].intersectionRatio;
      if (x !== c) {
        if (!N)
          return l();
        x ? l(!1, x) : a = setTimeout(() => {
          l(!1, 1e-7);
        }, 1e3);
      }
      x === 1 && !pd(d, e.getBoundingClientRect()) && l(), N = !1;
    }
    try {
      r = new IntersectionObserver(T, {
        ...k,
        // Handle <iframe>s
        root: i.ownerDocument
      });
    } catch {
      r = new IntersectionObserver(T, k);
    }
    r.observe(e);
  }
  return l(!0), o;
}
function Rb(e, t, r, a) {
  a === void 0 && (a = {});
  const {
    ancestorScroll: i = !0,
    ancestorResize: o = !0,
    elementResize: l = typeof ResizeObserver == "function",
    layoutShift: u = typeof IntersectionObserver == "function",
    animationFrame: c = !1
  } = a, d = Ui(e), h = i || o ? [...d ? Jn(d) : [], ...Jn(t)] : [];
  h.forEach((w) => {
    i && w.addEventListener("scroll", r, {
      passive: !0
    }), o && w.addEventListener("resize", r);
  });
  const m = d && u ? Pb(d, r) : null;
  let f = -1, g = null;
  l && (g = new ResizeObserver((w) => {
    let [y] = w;
    y && y.target === d && g && (g.unobserve(t), cancelAnimationFrame(f), f = requestAnimationFrame(() => {
      var k;
      (k = g) == null || k.observe(t);
    })), r();
  }), d && !c && g.observe(d), g.observe(t));
  let p, v = c ? Wr(e) : null;
  c && b();
  function b() {
    const w = Wr(e);
    v && !pd(v, w) && r(), v = w, p = requestAnimationFrame(b);
  }
  return r(), () => {
    var w;
    h.forEach((y) => {
      i && y.removeEventListener("scroll", r), o && y.removeEventListener("resize", r);
    }), m?.(), (w = g) == null || w.disconnect(), g = null, c && cancelAnimationFrame(p);
  };
}
const Tb = Zv, Ab = eb, Db = Xv, Mb = rb, Ib = Qv, ll = qv, Ob = tb, $b = (e, t, r) => {
  const a = /* @__PURE__ */ new Map(), i = {
    platform: Eb,
    ...r
  }, o = {
    ...i.platform,
    _c: a
  };
  return Yv(e, t, {
    ...i,
    platform: o
  });
};
var Lb = typeof document < "u", _b = function() {
}, Wa = Lb ? hn : _b;
function Xa(e, t) {
  if (e === t)
    return !0;
  if (typeof e != typeof t)
    return !1;
  if (typeof e == "function" && e.toString() === t.toString())
    return !0;
  let r, a, i;
  if (e && t && typeof e == "object") {
    if (Array.isArray(e)) {
      if (r = e.length, r !== t.length) return !1;
      for (a = r; a-- !== 0; )
        if (!Xa(e[a], t[a]))
          return !1;
      return !0;
    }
    if (i = Object.keys(e), r = i.length, r !== Object.keys(t).length)
      return !1;
    for (a = r; a-- !== 0; )
      if (!{}.hasOwnProperty.call(t, i[a]))
        return !1;
    for (a = r; a-- !== 0; ) {
      const o = i[a];
      if (!(o === "_owner" && e.$$typeof) && !Xa(e[o], t[o]))
        return !1;
    }
    return !0;
  }
  return e !== e && t !== t;
}
function gd(e) {
  return typeof window > "u" ? 1 : (e.ownerDocument.defaultView || window).devicePixelRatio || 1;
}
function cl(e, t) {
  const r = gd(e);
  return Math.round(t * r) / r;
}
function _o(e) {
  const t = ve(e);
  return Wa(() => {
    t.current = e;
  }), t;
}
function Bb(e) {
  e === void 0 && (e = {});
  const {
    placement: t = "bottom",
    strategy: r = "absolute",
    middleware: a = [],
    platform: i,
    elements: {
      reference: o,
      floating: l
    } = {},
    transform: u = !0,
    whileElementsMounted: c,
    open: d
  } = e, [h, m] = j({
    x: 0,
    y: 0,
    strategy: r,
    placement: t,
    middlewareData: {},
    isPositioned: !1
  }), [f, g] = j(a);
  Xa(f, a) || g(a);
  const [p, v] = j(null), [b, w] = j(null), y = Ae((D) => {
    D !== _.current && (_.current = D, v(D));
  }, []), k = Ae((D) => {
    D !== x.current && (x.current = D, w(D));
  }, []), N = o || p, T = l || b, _ = ve(null), x = ve(null), R = ve(h), F = c != null, V = _o(c), E = _o(i), S = _o(d), $ = Ae(() => {
    if (!_.current || !x.current)
      return;
    const D = {
      placement: t,
      strategy: r,
      middleware: f
    };
    E.current && (D.platform = E.current), $b(_.current, x.current, D).then((J) => {
      const we = {
        ...J,
        // The floating element's position may be recomputed while it's closed
        // but still mounted (such as when transitioning out). To ensure
        // `isPositioned` will be `false` initially on the next open, avoid
        // setting it to `true` when `open === false` (must be specified).
        isPositioned: S.current !== !1
      };
      A.current && !Xa(R.current, we) && (R.current = we, yc(() => {
        m(we);
      }));
    });
  }, [f, t, r, E, S]);
  Wa(() => {
    d === !1 && R.current.isPositioned && (R.current.isPositioned = !1, m((D) => ({
      ...D,
      isPositioned: !1
    })));
  }, [d]);
  const A = ve(!1);
  Wa(() => (A.current = !0, () => {
    A.current = !1;
  }), []), Wa(() => {
    if (N && (_.current = N), T && (x.current = T), N && T) {
      if (V.current)
        return V.current(N, T, $);
      $();
    }
  }, [N, T, $, V, F]);
  const U = He(() => ({
    reference: _,
    floating: x,
    setReference: y,
    setFloating: k
  }), [y, k]), I = He(() => ({
    reference: N,
    floating: T
  }), [N, T]), Y = He(() => {
    const D = {
      position: r,
      left: 0,
      top: 0
    };
    if (!I.floating)
      return D;
    const J = cl(I.floating, h.x), we = cl(I.floating, h.y);
    return u ? {
      ...D,
      transform: "translate(" + J + "px, " + we + "px)",
      ...gd(I.floating) >= 1.5 && {
        willChange: "transform"
      }
    } : {
      position: r,
      left: J,
      top: we
    };
  }, [r, u, I.floating, h.x, h.y]);
  return He(() => ({
    ...h,
    update: $,
    refs: U,
    elements: I,
    floatingStyles: Y
  }), [h, $, U, I, Y]);
}
const Fb = (e) => {
  function t(r) {
    return {}.hasOwnProperty.call(r, "current");
  }
  return {
    name: "arrow",
    options: e,
    fn(r) {
      const {
        element: a,
        padding: i
      } = typeof e == "function" ? e(r) : e;
      return a && t(a) ? a.current != null ? ll({
        element: a.current,
        padding: i
      }).fn(r) : {} : a ? ll({
        element: a,
        padding: i
      }).fn(r) : {};
    }
  };
}, zb = (e, t) => ({
  ...Tb(e),
  options: [e, t]
}), jb = (e, t) => ({
  ...Ab(e),
  options: [e, t]
}), Wb = (e, t) => ({
  ...Ob(e),
  options: [e, t]
}), Ub = (e, t) => ({
  ...Db(e),
  options: [e, t]
}), Vb = (e, t) => ({
  ...Mb(e),
  options: [e, t]
}), Hb = (e, t) => ({
  ...Ib(e),
  options: [e, t]
}), Gb = (e, t) => ({
  ...Fb(e),
  options: [e, t]
});
var Kb = "Arrow", vd = Q((e, t) => {
  const { children: r, width: a = 10, height: i = 5, ...o } = e;
  return /* @__PURE__ */ n(
    $e.svg,
    {
      ...o,
      ref: t,
      width: a,
      height: i,
      viewBox: "0 0 30 10",
      preserveAspectRatio: "none",
      children: e.asChild ? r : /* @__PURE__ */ n("polygon", { points: "0,0 30,0 15,10" })
    }
  );
});
vd.displayName = Kb;
var Yb = vd, Vi = "Popper", [bd, yd] = Kr(Vi), [qb, xd] = bd(Vi), wd = (e) => {
  const { __scopePopper: t, children: r } = e, [a, i] = j(null);
  return /* @__PURE__ */ n(qb, { scope: t, anchor: a, onAnchorChange: i, children: r });
};
wd.displayName = Vi;
var Nd = "PopperAnchor", Cd = Q(
  (e, t) => {
    const { __scopePopper: r, virtualRef: a, ...i } = e, o = xd(Nd, r), l = ve(null), u = Ke(t, l);
    return xe(() => {
      o.onAnchorChange(a?.current || l.current);
    }), a ? null : /* @__PURE__ */ n($e.div, { ...i, ref: u });
  }
);
Cd.displayName = Nd;
var Hi = "PopperContent", [Xb, Qb] = bd(Hi), kd = Q(
  (e, t) => {
    const {
      __scopePopper: r,
      side: a = "bottom",
      sideOffset: i = 0,
      align: o = "center",
      alignOffset: l = 0,
      arrowPadding: u = 0,
      avoidCollisions: c = !0,
      collisionBoundary: d = [],
      collisionPadding: h = 0,
      sticky: m = "partial",
      hideWhenDetached: f = !1,
      updatePositionStrategy: g = "optimized",
      onPlaced: p,
      ...v
    } = e, b = xd(Hi, r), [w, y] = j(null), k = Ke(t, (K) => y(K)), [N, T] = j(null), _ = Nc(N), x = _?.width ?? 0, R = _?.height ?? 0, F = a + (o !== "center" ? "-" + o : ""), V = typeof h == "number" ? h : { top: 0, right: 0, bottom: 0, left: 0, ...h }, E = Array.isArray(d) ? d : [d], S = E.length > 0, $ = {
      padding: V,
      boundary: E.filter(Zb),
      // with `strategy: 'fixed'`, this is the only way to get it to respect boundaries
      altBoundary: S
    }, { refs: A, floatingStyles: U, placement: I, isPositioned: Y, middlewareData: D } = Bb({
      // default to `fixed` strategy so users don't have to pick and we also avoid focus scroll issues
      strategy: "fixed",
      placement: F,
      whileElementsMounted: (...K) => Rb(...K, {
        animationFrame: g === "always"
      }),
      elements: {
        reference: b.anchor
      },
      middleware: [
        zb({ mainAxis: i + R, alignmentAxis: l }),
        c && jb({
          mainAxis: !0,
          crossAxis: !1,
          limiter: m === "partial" ? Wb() : void 0,
          ...$
        }),
        c && Ub({ ...$ }),
        Vb({
          ...$,
          apply: ({ elements: K, rects: ge, availableWidth: L, availableHeight: G }) => {
            const { width: oe, height: ne } = ge.reference, Ge = K.floating.style;
            Ge.setProperty("--radix-popper-available-width", `${L}px`), Ge.setProperty("--radix-popper-available-height", `${G}px`), Ge.setProperty("--radix-popper-anchor-width", `${oe}px`), Ge.setProperty("--radix-popper-anchor-height", `${ne}px`);
          }
        }),
        N && Gb({ element: N, padding: u }),
        ey({ arrowWidth: x, arrowHeight: R }),
        f && Hb({ strategy: "referenceHidden", ...$ })
      ]
    }), [J, we] = Pd(I), he = Yt(p);
    ft(() => {
      Y && he?.();
    }, [Y, he]);
    const be = D.arrow?.x, re = D.arrow?.y, pe = D.arrow?.centerOffset !== 0, [Me, Ne] = j();
    return ft(() => {
      w && Ne(window.getComputedStyle(w).zIndex);
    }, [w]), /* @__PURE__ */ n(
      "div",
      {
        ref: A.setFloating,
        "data-radix-popper-content-wrapper": "",
        style: {
          ...U,
          transform: Y ? U.transform : "translate(0, -200%)",
          // keep off the page when measuring
          minWidth: "max-content",
          zIndex: Me,
          "--radix-popper-transform-origin": [
            D.transformOrigin?.x,
            D.transformOrigin?.y
          ].join(" "),
          // hide the content if using the hide middleware and should be hidden
          // set visibility to hidden and disable pointer events so the UI behaves
          // as if the PopperContent isn't there at all
          ...D.hide?.referenceHidden && {
            visibility: "hidden",
            pointerEvents: "none"
          }
        },
        dir: e.dir,
        children: /* @__PURE__ */ n(
          Xb,
          {
            scope: r,
            placedSide: J,
            onArrowChange: T,
            arrowX: be,
            arrowY: re,
            shouldHideArrow: pe,
            children: /* @__PURE__ */ n(
              $e.div,
              {
                "data-side": J,
                "data-align": we,
                ...v,
                ref: k,
                style: {
                  ...v.style,
                  // if the PopperContent hasn't been placed yet (not all measurements done)
                  // we prevent animations so that users's animation don't kick in too early referring wrong sides
                  animation: Y ? void 0 : "none"
                }
              }
            )
          }
        )
      }
    );
  }
);
kd.displayName = Hi;
var Sd = "PopperArrow", Jb = {
  top: "bottom",
  right: "left",
  bottom: "top",
  left: "right"
}, Ed = Q(function(t, r) {
  const { __scopePopper: a, ...i } = t, o = Qb(Sd, a), l = Jb[o.placedSide];
  return (
    // we have to use an extra wrapper because `ResizeObserver` (used by `useSize`)
    // doesn't report size as we'd expect on SVG elements.
    // it reports their bounding box which is effectively the largest path inside the SVG.
    /* @__PURE__ */ n(
      "span",
      {
        ref: o.onArrowChange,
        style: {
          position: "absolute",
          left: o.arrowX,
          top: o.arrowY,
          [l]: 0,
          transformOrigin: {
            top: "",
            right: "0 0",
            bottom: "center 0",
            left: "100% 0"
          }[o.placedSide],
          transform: {
            top: "translateY(100%)",
            right: "translateY(50%) rotate(90deg) translateX(-50%)",
            bottom: "rotate(180deg)",
            left: "translateY(50%) rotate(-90deg) translateX(50%)"
          }[o.placedSide],
          visibility: o.shouldHideArrow ? "hidden" : void 0
        },
        children: /* @__PURE__ */ n(
          Yb,
          {
            ...i,
            ref: r,
            style: {
              ...i.style,
              // ensures the element can be measured correctly (mostly for if SVG)
              display: "block"
            }
          }
        )
      }
    )
  );
});
Ed.displayName = Sd;
function Zb(e) {
  return e !== null;
}
var ey = (e) => ({
  name: "transformOrigin",
  options: e,
  fn(t) {
    const { placement: r, rects: a, middlewareData: i } = t, l = i.arrow?.centerOffset !== 0, u = l ? 0 : e.arrowWidth, c = l ? 0 : e.arrowHeight, [d, h] = Pd(r), m = { start: "0%", center: "50%", end: "100%" }[h], f = (i.arrow?.x ?? 0) + u / 2, g = (i.arrow?.y ?? 0) + c / 2;
    let p = "", v = "";
    return d === "bottom" ? (p = l ? m : `${f}px`, v = `${-c}px`) : d === "top" ? (p = l ? m : `${f}px`, v = `${a.floating.height + c}px`) : d === "right" ? (p = `${-c}px`, v = l ? m : `${g}px`) : d === "left" && (p = `${a.floating.width + c}px`, v = l ? m : `${g}px`), { data: { x: p, y: v } };
  }
});
function Pd(e) {
  const [t, r = "center"] = e.split("-");
  return [t, r];
}
var ty = wd, ry = Cd, ny = kd, ay = Ed, oy = "VisuallyHidden", Rd = Q(
  (e, t) => /* @__PURE__ */ n(
    $e.span,
    {
      ...e,
      ref: t,
      style: {
        // See: https://github.com/twbs/bootstrap/blob/main/scss/mixins/_visually-hidden.scss
        position: "absolute",
        border: 0,
        width: 1,
        height: 1,
        padding: 0,
        margin: -1,
        overflow: "hidden",
        clip: "rect(0, 0, 0, 0)",
        whiteSpace: "nowrap",
        wordWrap: "normal",
        ...e.style
      }
    }
  )
);
Rd.displayName = oy;
var iy = [" ", "Enter", "ArrowUp", "ArrowDown"], sy = [" ", "Enter"], ua = "Select", [co, uo, ly] = od(ua), [wn] = Kr(ua, [
  ly,
  yd
]), mo = yd(), [cy, Ar] = wn(ua), [dy, uy] = wn(ua), Td = (e) => {
  const {
    __scopeSelect: t,
    children: r,
    open: a,
    defaultOpen: i,
    onOpenChange: o,
    value: l,
    defaultValue: u,
    onValueChange: c,
    dir: d,
    name: h,
    autoComplete: m,
    disabled: f,
    required: g,
    form: p
  } = e, v = mo(t), [b, w] = j(null), [y, k] = j(null), [N, T] = j(!1), _ = _i(d), [x = !1, R] = dn({
    prop: a,
    defaultProp: i,
    onChange: o
  }), [F, V] = dn({
    prop: l,
    defaultProp: u,
    onChange: c
  }), E = ve(null), S = b ? p || !!b.closest("form") : !0, [$, A] = j(/* @__PURE__ */ new Set()), U = Array.from($).map((I) => I.props.value).join(";");
  return /* @__PURE__ */ n(ty, { ...v, children: /* @__PURE__ */ s(
    cy,
    {
      required: g,
      scope: t,
      trigger: b,
      onTriggerChange: w,
      valueNode: y,
      onValueNodeChange: k,
      valueNodeHasChildren: N,
      onValueNodeHasChildrenChange: T,
      contentId: Nr(),
      value: F,
      onValueChange: V,
      open: x,
      onOpenChange: R,
      dir: _,
      triggerPointerDownPosRef: E,
      disabled: f,
      children: [
        /* @__PURE__ */ n(co.Provider, { scope: t, children: /* @__PURE__ */ n(
          dy,
          {
            scope: e.__scopeSelect,
            onNativeOptionAdd: Ae((I) => {
              A((Y) => new Set(Y).add(I));
            }, []),
            onNativeOptionRemove: Ae((I) => {
              A((Y) => {
                const D = new Set(Y);
                return D.delete(I), D;
              });
            }, []),
            children: r
          }
        ) }),
        S ? /* @__PURE__ */ s(
          Jd,
          {
            "aria-hidden": !0,
            required: g,
            tabIndex: -1,
            name: h,
            autoComplete: m,
            value: F,
            onChange: (I) => V(I.target.value),
            disabled: f,
            form: p,
            children: [
              F === void 0 ? /* @__PURE__ */ n("option", { value: "" }) : null,
              Array.from($)
            ]
          },
          U
        ) : null
      ]
    }
  ) });
};
Td.displayName = ua;
var Ad = "SelectTrigger", Dd = Q(
  (e, t) => {
    const { __scopeSelect: r, disabled: a = !1, ...i } = e, o = mo(r), l = Ar(Ad, r), u = l.disabled || a, c = Ke(t, l.onTriggerChange), d = uo(r), h = ve("touch"), [m, f, g] = Zd((v) => {
      const b = d().filter((k) => !k.disabled), w = b.find((k) => k.value === l.value), y = eu(b, v, w);
      y !== void 0 && l.onValueChange(y.value);
    }), p = (v) => {
      u || (l.onOpenChange(!0), g()), v && (l.triggerPointerDownPosRef.current = {
        x: Math.round(v.pageX),
        y: Math.round(v.pageY)
      });
    };
    return /* @__PURE__ */ n(ry, { asChild: !0, ...o, children: /* @__PURE__ */ n(
      $e.button,
      {
        type: "button",
        role: "combobox",
        "aria-controls": l.contentId,
        "aria-expanded": l.open,
        "aria-required": l.required,
        "aria-autocomplete": "none",
        dir: l.dir,
        "data-state": l.open ? "open" : "closed",
        disabled: u,
        "data-disabled": u ? "" : void 0,
        "data-placeholder": Qd(l.value) ? "" : void 0,
        ...i,
        ref: c,
        onClick: De(i.onClick, (v) => {
          v.currentTarget.focus(), h.current !== "mouse" && p(v);
        }),
        onPointerDown: De(i.onPointerDown, (v) => {
          h.current = v.pointerType;
          const b = v.target;
          b.hasPointerCapture(v.pointerId) && b.releasePointerCapture(v.pointerId), v.button === 0 && v.ctrlKey === !1 && v.pointerType === "mouse" && (p(v), v.preventDefault());
        }),
        onKeyDown: De(i.onKeyDown, (v) => {
          const b = m.current !== "";
          !(v.ctrlKey || v.altKey || v.metaKey) && v.key.length === 1 && f(v.key), !(b && v.key === " ") && iy.includes(v.key) && (p(), v.preventDefault());
        })
      }
    ) });
  }
);
Dd.displayName = Ad;
var Md = "SelectValue", Id = Q(
  (e, t) => {
    const { __scopeSelect: r, className: a, style: i, children: o, placeholder: l = "", ...u } = e, c = Ar(Md, r), { onValueNodeHasChildrenChange: d } = c, h = o !== void 0, m = Ke(t, c.onValueNodeChange);
    return ft(() => {
      d(h);
    }, [d, h]), /* @__PURE__ */ n(
      $e.span,
      {
        ...u,
        ref: m,
        style: { pointerEvents: "none" },
        children: Qd(c.value) ? /* @__PURE__ */ n(Cr, { children: l }) : o
      }
    );
  }
);
Id.displayName = Md;
var my = "SelectIcon", Od = Q(
  (e, t) => {
    const { __scopeSelect: r, children: a, ...i } = e;
    return /* @__PURE__ */ n($e.span, { "aria-hidden": !0, ...i, ref: t, children: a || "▼" });
  }
);
Od.displayName = my;
var hy = "SelectPortal", $d = (e) => /* @__PURE__ */ n(Di, { asChild: !0, ...e });
$d.displayName = hy;
var Ur = "SelectContent", Ld = Q(
  (e, t) => {
    const r = Ar(Ur, e.__scopeSelect), [a, i] = j();
    if (ft(() => {
      i(new DocumentFragment());
    }, []), !r.open) {
      const o = a;
      return o ? bc(
        /* @__PURE__ */ n(_d, { scope: e.__scopeSelect, children: /* @__PURE__ */ n(co.Slot, { scope: e.__scopeSelect, children: /* @__PURE__ */ n("div", { children: e.children }) }) }),
        o
      ) : null;
    }
    return /* @__PURE__ */ n(Bd, { ...e, ref: t });
  }
);
Ld.displayName = Ur;
var It = 10, [_d, Dr] = wn(Ur), fy = "SelectContentImpl", Bd = Q(
  (e, t) => {
    const {
      __scopeSelect: r,
      position: a = "item-aligned",
      onCloseAutoFocus: i,
      onEscapeKeyDown: o,
      onPointerDownOutside: l,
      //
      // PopperContent props
      side: u,
      sideOffset: c,
      align: d,
      alignOffset: h,
      arrowPadding: m,
      collisionBoundary: f,
      collisionPadding: g,
      sticky: p,
      hideWhenDetached: v,
      avoidCollisions: b,
      //
      ...w
    } = e, y = Ar(Ur, r), [k, N] = j(null), [T, _] = j(null), x = Ke(t, (K) => N(K)), [R, F] = j(null), [V, E] = j(
      null
    ), S = uo(r), [$, A] = j(!1), U = ve(!1);
    xe(() => {
      if (k) return zc(k);
    }, [k]), Dc();
    const I = Ae(
      (K) => {
        const [ge, ...L] = S().map((ne) => ne.ref.current), [G] = L.slice(-1), oe = document.activeElement;
        for (const ne of K)
          if (ne === oe || (ne?.scrollIntoView({ block: "nearest" }), ne === ge && T && (T.scrollTop = 0), ne === G && T && (T.scrollTop = T.scrollHeight), ne?.focus(), document.activeElement !== oe)) return;
      },
      [S, T]
    ), Y = Ae(
      () => I([R, k]),
      [I, R, k]
    );
    xe(() => {
      $ && Y();
    }, [$, Y]);
    const { onOpenChange: D, triggerPointerDownPosRef: J } = y;
    xe(() => {
      if (k) {
        let K = { x: 0, y: 0 };
        const ge = (G) => {
          K = {
            x: Math.abs(Math.round(G.pageX) - (J.current?.x ?? 0)),
            y: Math.abs(Math.round(G.pageY) - (J.current?.y ?? 0))
          };
        }, L = (G) => {
          K.x <= 10 && K.y <= 10 ? G.preventDefault() : k.contains(G.target) || D(!1), document.removeEventListener("pointermove", ge), J.current = null;
        };
        return J.current !== null && (document.addEventListener("pointermove", ge), document.addEventListener("pointerup", L, { capture: !0, once: !0 })), () => {
          document.removeEventListener("pointermove", ge), document.removeEventListener("pointerup", L, { capture: !0 });
        };
      }
    }, [k, D, J]), xe(() => {
      const K = () => D(!1);
      return window.addEventListener("blur", K), window.addEventListener("resize", K), () => {
        window.removeEventListener("blur", K), window.removeEventListener("resize", K);
      };
    }, [D]);
    const [we, he] = Zd((K) => {
      const ge = S().filter((oe) => !oe.disabled), L = ge.find((oe) => oe.ref.current === document.activeElement), G = eu(ge, K, L);
      G && setTimeout(() => G.ref.current.focus());
    }), be = Ae(
      (K, ge, L) => {
        const G = !U.current && !L;
        (y.value !== void 0 && y.value === ge || G) && (F(K), G && (U.current = !0));
      },
      [y.value]
    ), re = Ae(() => k?.focus(), [k]), pe = Ae(
      (K, ge, L) => {
        const G = !U.current && !L;
        (y.value !== void 0 && y.value === ge || G) && E(K);
      },
      [y.value]
    ), Me = a === "popper" ? ti : Fd, Ne = Me === ti ? {
      side: u,
      sideOffset: c,
      align: d,
      alignOffset: h,
      arrowPadding: m,
      collisionBoundary: f,
      collisionPadding: g,
      sticky: p,
      hideWhenDetached: v,
      avoidCollisions: b
    } : {};
    return /* @__PURE__ */ n(
      _d,
      {
        scope: r,
        content: k,
        viewport: T,
        onViewportChange: _,
        itemRefCallback: be,
        selectedItem: R,
        onItemLeave: re,
        itemTextRefCallback: pe,
        focusSelectedItem: Y,
        selectedItemText: V,
        position: a,
        isPositioned: $,
        searchRef: we,
        children: /* @__PURE__ */ n(Mi, { as: kr, allowPinchZoom: !0, children: /* @__PURE__ */ n(
          Ai,
          {
            asChild: !0,
            trapped: y.open,
            onMountAutoFocus: (K) => {
              K.preventDefault();
            },
            onUnmountAutoFocus: De(i, (K) => {
              y.trigger?.focus({ preventScroll: !0 }), K.preventDefault();
            }),
            children: /* @__PURE__ */ n(
              Ti,
              {
                asChild: !0,
                disableOutsidePointerEvents: !0,
                onEscapeKeyDown: o,
                onPointerDownOutside: l,
                onFocusOutside: (K) => K.preventDefault(),
                onDismiss: () => y.onOpenChange(!1),
                children: /* @__PURE__ */ n(
                  Me,
                  {
                    role: "listbox",
                    id: y.contentId,
                    "data-state": y.open ? "open" : "closed",
                    dir: y.dir,
                    onContextMenu: (K) => K.preventDefault(),
                    ...w,
                    ...Ne,
                    onPlaced: () => A(!0),
                    ref: x,
                    style: {
                      // flex layout so we can place the scroll buttons properly
                      display: "flex",
                      flexDirection: "column",
                      // reset the outline by default as the content MAY get focused
                      outline: "none",
                      ...w.style
                    },
                    onKeyDown: De(w.onKeyDown, (K) => {
                      const ge = K.ctrlKey || K.altKey || K.metaKey;
                      if (K.key === "Tab" && K.preventDefault(), !ge && K.key.length === 1 && he(K.key), ["ArrowUp", "ArrowDown", "Home", "End"].includes(K.key)) {
                        let G = S().filter((oe) => !oe.disabled).map((oe) => oe.ref.current);
                        if (["ArrowUp", "End"].includes(K.key) && (G = G.slice().reverse()), ["ArrowUp", "ArrowDown"].includes(K.key)) {
                          const oe = K.target, ne = G.indexOf(oe);
                          G = G.slice(ne + 1);
                        }
                        setTimeout(() => I(G)), K.preventDefault();
                      }
                    })
                  }
                )
              }
            )
          }
        ) })
      }
    );
  }
);
Bd.displayName = fy;
var py = "SelectItemAlignedPosition", Fd = Q((e, t) => {
  const { __scopeSelect: r, onPlaced: a, ...i } = e, o = Ar(Ur, r), l = Dr(Ur, r), [u, c] = j(null), [d, h] = j(null), m = Ke(t, (x) => h(x)), f = uo(r), g = ve(!1), p = ve(!0), { viewport: v, selectedItem: b, selectedItemText: w, focusSelectedItem: y } = l, k = Ae(() => {
    if (o.trigger && o.valueNode && u && d && v && b && w) {
      const x = o.trigger.getBoundingClientRect(), R = d.getBoundingClientRect(), F = o.valueNode.getBoundingClientRect(), V = w.getBoundingClientRect();
      if (o.dir !== "rtl") {
        const oe = V.left - R.left, ne = F.left - oe, Ge = x.left - ne, O = x.width + Ge, We = Math.max(O, R.width), st = window.innerWidth - It, At = Js(ne, [
          It,
          // Prevents the content from going off the starting edge of the
          // viewport. It may still go off the ending edge, but this can be
          // controlled by the user since they may want to manage overflow in a
          // specific way.
          // https://github.com/radix-ui/primitives/issues/2049
          Math.max(It, st - We)
        ]);
        u.style.minWidth = O + "px", u.style.left = At + "px";
      } else {
        const oe = R.right - V.right, ne = window.innerWidth - F.right - oe, Ge = window.innerWidth - x.right - ne, O = x.width + Ge, We = Math.max(O, R.width), st = window.innerWidth - It, At = Js(ne, [
          It,
          Math.max(It, st - We)
        ]);
        u.style.minWidth = O + "px", u.style.right = At + "px";
      }
      const E = f(), S = window.innerHeight - It * 2, $ = v.scrollHeight, A = window.getComputedStyle(d), U = parseInt(A.borderTopWidth, 10), I = parseInt(A.paddingTop, 10), Y = parseInt(A.borderBottomWidth, 10), D = parseInt(A.paddingBottom, 10), J = U + I + $ + D + Y, we = Math.min(b.offsetHeight * 5, J), he = window.getComputedStyle(v), be = parseInt(he.paddingTop, 10), re = parseInt(he.paddingBottom, 10), pe = x.top + x.height / 2 - It, Me = S - pe, Ne = b.offsetHeight / 2, K = b.offsetTop + Ne, ge = U + I + K, L = J - ge;
      if (ge <= pe) {
        const oe = E.length > 0 && b === E[E.length - 1].ref.current;
        u.style.bottom = "0px";
        const ne = d.clientHeight - v.offsetTop - v.offsetHeight, Ge = Math.max(
          Me,
          Ne + // viewport might have padding bottom, include it to avoid a scrollable viewport
          (oe ? re : 0) + ne + Y
        ), O = ge + Ge;
        u.style.height = O + "px";
      } else {
        const oe = E.length > 0 && b === E[0].ref.current;
        u.style.top = "0px";
        const Ge = Math.max(
          pe,
          U + v.offsetTop + // viewport might have padding top, include it to avoid a scrollable viewport
          (oe ? be : 0) + Ne
        ) + L;
        u.style.height = Ge + "px", v.scrollTop = ge - pe + v.offsetTop;
      }
      u.style.margin = `${It}px 0`, u.style.minHeight = we + "px", u.style.maxHeight = S + "px", a?.(), requestAnimationFrame(() => g.current = !0);
    }
  }, [
    f,
    o.trigger,
    o.valueNode,
    u,
    d,
    v,
    b,
    w,
    o.dir,
    a
  ]);
  ft(() => k(), [k]);
  const [N, T] = j();
  ft(() => {
    d && T(window.getComputedStyle(d).zIndex);
  }, [d]);
  const _ = Ae(
    (x) => {
      x && p.current === !0 && (k(), y?.(), p.current = !1);
    },
    [k, y]
  );
  return /* @__PURE__ */ n(
    vy,
    {
      scope: r,
      contentWrapper: u,
      shouldExpandOnScrollRef: g,
      onScrollButtonChange: _,
      children: /* @__PURE__ */ n(
        "div",
        {
          ref: c,
          style: {
            display: "flex",
            flexDirection: "column",
            position: "fixed",
            zIndex: N
          },
          children: /* @__PURE__ */ n(
            $e.div,
            {
              ...i,
              ref: m,
              style: {
                // When we get the height of the content, it includes borders. If we were to set
                // the height without having `boxSizing: 'border-box'` it would be too big.
                boxSizing: "border-box",
                // We need to ensure the content doesn't get taller than the wrapper
                maxHeight: "100%",
                ...i.style
              }
            }
          )
        }
      )
    }
  );
});
Fd.displayName = py;
var gy = "SelectPopperPosition", ti = Q((e, t) => {
  const {
    __scopeSelect: r,
    align: a = "start",
    collisionPadding: i = It,
    ...o
  } = e, l = mo(r);
  return /* @__PURE__ */ n(
    ny,
    {
      ...l,
      ...o,
      ref: t,
      align: a,
      collisionPadding: i,
      style: {
        // Ensure border-box for floating-ui calculations
        boxSizing: "border-box",
        ...o.style,
        "--radix-select-content-transform-origin": "var(--radix-popper-transform-origin)",
        "--radix-select-content-available-width": "var(--radix-popper-available-width)",
        "--radix-select-content-available-height": "var(--radix-popper-available-height)",
        "--radix-select-trigger-width": "var(--radix-popper-anchor-width)",
        "--radix-select-trigger-height": "var(--radix-popper-anchor-height)"
      }
    }
  );
});
ti.displayName = gy;
var [vy, Gi] = wn(Ur, {}), ri = "SelectViewport", zd = Q(
  (e, t) => {
    const { __scopeSelect: r, nonce: a, ...i } = e, o = Dr(ri, r), l = Gi(ri, r), u = Ke(t, o.onViewportChange), c = ve(0);
    return /* @__PURE__ */ s(Cr, { children: [
      /* @__PURE__ */ n(
        "style",
        {
          dangerouslySetInnerHTML: {
            __html: "[data-radix-select-viewport]{scrollbar-width:none;-ms-overflow-style:none;-webkit-overflow-scrolling:touch;}[data-radix-select-viewport]::-webkit-scrollbar{display:none}"
          },
          nonce: a
        }
      ),
      /* @__PURE__ */ n(co.Slot, { scope: r, children: /* @__PURE__ */ n(
        $e.div,
        {
          "data-radix-select-viewport": "",
          role: "presentation",
          ...i,
          ref: u,
          style: {
            // we use position: 'relative' here on the `viewport` so that when we call
            // `selectedItem.offsetTop` in calculations, the offset is relative to the viewport
            // (independent of the scrollUpButton).
            position: "relative",
            flex: 1,
            // Viewport should only be scrollable in the vertical direction.
            // This won't work in vertical writing modes, so we'll need to
            // revisit this if/when that is supported
            // https://developer.chrome.com/blog/vertical-form-controls
            overflow: "hidden auto",
            ...i.style
          },
          onScroll: De(i.onScroll, (d) => {
            const h = d.currentTarget, { contentWrapper: m, shouldExpandOnScrollRef: f } = l;
            if (f?.current && m) {
              const g = Math.abs(c.current - h.scrollTop);
              if (g > 0) {
                const p = window.innerHeight - It * 2, v = parseFloat(m.style.minHeight), b = parseFloat(m.style.height), w = Math.max(v, b);
                if (w < p) {
                  const y = w + g, k = Math.min(p, y), N = y - k;
                  m.style.height = k + "px", m.style.bottom === "0px" && (h.scrollTop = N > 0 ? N : 0, m.style.justifyContent = "flex-end");
                }
              }
            }
            c.current = h.scrollTop;
          })
        }
      ) })
    ] });
  }
);
zd.displayName = ri;
var jd = "SelectGroup", [by, yy] = wn(jd), xy = Q(
  (e, t) => {
    const { __scopeSelect: r, ...a } = e, i = Nr();
    return /* @__PURE__ */ n(by, { scope: r, id: i, children: /* @__PURE__ */ n($e.div, { role: "group", "aria-labelledby": i, ...a, ref: t }) });
  }
);
xy.displayName = jd;
var Wd = "SelectLabel", wy = Q(
  (e, t) => {
    const { __scopeSelect: r, ...a } = e, i = yy(Wd, r);
    return /* @__PURE__ */ n($e.div, { id: i.id, ...a, ref: t });
  }
);
wy.displayName = Wd;
var Qa = "SelectItem", [Ny, Ud] = wn(Qa), Vd = Q(
  (e, t) => {
    const {
      __scopeSelect: r,
      value: a,
      disabled: i = !1,
      textValue: o,
      ...l
    } = e, u = Ar(Qa, r), c = Dr(Qa, r), d = u.value === a, [h, m] = j(o ?? ""), [f, g] = j(!1), p = Ke(
      t,
      (y) => c.itemRefCallback?.(y, a, i)
    ), v = Nr(), b = ve("touch"), w = () => {
      i || (u.onValueChange(a), u.onOpenChange(!1));
    };
    if (a === "")
      throw new Error(
        "A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder."
      );
    return /* @__PURE__ */ n(
      Ny,
      {
        scope: r,
        value: a,
        disabled: i,
        textId: v,
        isSelected: d,
        onItemTextChange: Ae((y) => {
          m((k) => k || (y?.textContent ?? "").trim());
        }, []),
        children: /* @__PURE__ */ n(
          co.ItemSlot,
          {
            scope: r,
            value: a,
            disabled: i,
            textValue: h,
            children: /* @__PURE__ */ n(
              $e.div,
              {
                role: "option",
                "aria-labelledby": v,
                "data-highlighted": f ? "" : void 0,
                "aria-selected": d && f,
                "data-state": d ? "checked" : "unchecked",
                "aria-disabled": i || void 0,
                "data-disabled": i ? "" : void 0,
                tabIndex: i ? void 0 : -1,
                ...l,
                ref: p,
                onFocus: De(l.onFocus, () => g(!0)),
                onBlur: De(l.onBlur, () => g(!1)),
                onClick: De(l.onClick, () => {
                  b.current !== "mouse" && w();
                }),
                onPointerUp: De(l.onPointerUp, () => {
                  b.current === "mouse" && w();
                }),
                onPointerDown: De(l.onPointerDown, (y) => {
                  b.current = y.pointerType;
                }),
                onPointerMove: De(l.onPointerMove, (y) => {
                  b.current = y.pointerType, i ? c.onItemLeave?.() : b.current === "mouse" && y.currentTarget.focus({ preventScroll: !0 });
                }),
                onPointerLeave: De(l.onPointerLeave, (y) => {
                  y.currentTarget === document.activeElement && c.onItemLeave?.();
                }),
                onKeyDown: De(l.onKeyDown, (y) => {
                  c.searchRef?.current !== "" && y.key === " " || (sy.includes(y.key) && w(), y.key === " " && y.preventDefault());
                })
              }
            )
          }
        )
      }
    );
  }
);
Vd.displayName = Qa;
var Bn = "SelectItemText", Hd = Q(
  (e, t) => {
    const { __scopeSelect: r, className: a, style: i, ...o } = e, l = Ar(Bn, r), u = Dr(Bn, r), c = Ud(Bn, r), d = uy(Bn, r), [h, m] = j(null), f = Ke(
      t,
      (w) => m(w),
      c.onItemTextChange,
      (w) => u.itemTextRefCallback?.(w, c.value, c.disabled)
    ), g = h?.textContent, p = He(
      () => /* @__PURE__ */ n("option", { value: c.value, disabled: c.disabled, children: g }, c.value),
      [c.disabled, c.value, g]
    ), { onNativeOptionAdd: v, onNativeOptionRemove: b } = d;
    return ft(() => (v(p), () => b(p)), [v, b, p]), /* @__PURE__ */ s(Cr, { children: [
      /* @__PURE__ */ n($e.span, { id: c.textId, ...o, ref: f }),
      c.isSelected && l.valueNode && !l.valueNodeHasChildren ? bc(o.children, l.valueNode) : null
    ] });
  }
);
Hd.displayName = Bn;
var Gd = "SelectItemIndicator", Kd = Q(
  (e, t) => {
    const { __scopeSelect: r, ...a } = e;
    return Ud(Gd, r).isSelected ? /* @__PURE__ */ n($e.span, { "aria-hidden": !0, ...a, ref: t }) : null;
  }
);
Kd.displayName = Gd;
var ni = "SelectScrollUpButton", Yd = Q((e, t) => {
  const r = Dr(ni, e.__scopeSelect), a = Gi(ni, e.__scopeSelect), [i, o] = j(!1), l = Ke(t, a.onScrollButtonChange);
  return ft(() => {
    if (r.viewport && r.isPositioned) {
      let u = function() {
        const d = c.scrollTop > 0;
        o(d);
      };
      const c = r.viewport;
      return u(), c.addEventListener("scroll", u), () => c.removeEventListener("scroll", u);
    }
  }, [r.viewport, r.isPositioned]), i ? /* @__PURE__ */ n(
    Xd,
    {
      ...e,
      ref: l,
      onAutoScroll: () => {
        const { viewport: u, selectedItem: c } = r;
        u && c && (u.scrollTop = u.scrollTop - c.offsetHeight);
      }
    }
  ) : null;
});
Yd.displayName = ni;
var ai = "SelectScrollDownButton", qd = Q((e, t) => {
  const r = Dr(ai, e.__scopeSelect), a = Gi(ai, e.__scopeSelect), [i, o] = j(!1), l = Ke(t, a.onScrollButtonChange);
  return ft(() => {
    if (r.viewport && r.isPositioned) {
      let u = function() {
        const d = c.scrollHeight - c.clientHeight, h = Math.ceil(c.scrollTop) < d;
        o(h);
      };
      const c = r.viewport;
      return u(), c.addEventListener("scroll", u), () => c.removeEventListener("scroll", u);
    }
  }, [r.viewport, r.isPositioned]), i ? /* @__PURE__ */ n(
    Xd,
    {
      ...e,
      ref: l,
      onAutoScroll: () => {
        const { viewport: u, selectedItem: c } = r;
        u && c && (u.scrollTop = u.scrollTop + c.offsetHeight);
      }
    }
  ) : null;
});
qd.displayName = ai;
var Xd = Q((e, t) => {
  const { __scopeSelect: r, onAutoScroll: a, ...i } = e, o = Dr("SelectScrollButton", r), l = ve(null), u = uo(r), c = Ae(() => {
    l.current !== null && (window.clearInterval(l.current), l.current = null);
  }, []);
  return xe(() => () => c(), [c]), ft(() => {
    u().find((h) => h.ref.current === document.activeElement)?.ref.current?.scrollIntoView({ block: "nearest" });
  }, [u]), /* @__PURE__ */ n(
    $e.div,
    {
      "aria-hidden": !0,
      ...i,
      ref: t,
      style: { flexShrink: 0, ...i.style },
      onPointerDown: De(i.onPointerDown, () => {
        l.current === null && (l.current = window.setInterval(a, 50));
      }),
      onPointerMove: De(i.onPointerMove, () => {
        o.onItemLeave?.(), l.current === null && (l.current = window.setInterval(a, 50));
      }),
      onPointerLeave: De(i.onPointerLeave, () => {
        c();
      })
    }
  );
}), Cy = "SelectSeparator", ky = Q(
  (e, t) => {
    const { __scopeSelect: r, ...a } = e;
    return /* @__PURE__ */ n($e.div, { "aria-hidden": !0, ...a, ref: t });
  }
);
ky.displayName = Cy;
var oi = "SelectArrow", Sy = Q(
  (e, t) => {
    const { __scopeSelect: r, ...a } = e, i = mo(r), o = Ar(oi, r), l = Dr(oi, r);
    return o.open && l.position === "popper" ? /* @__PURE__ */ n(ay, { ...i, ...a, ref: t }) : null;
  }
);
Sy.displayName = oi;
function Qd(e) {
  return e === "" || e === void 0;
}
var Jd = Q(
  (e, t) => {
    const { value: r, ...a } = e, i = ve(null), o = Ke(t, i), l = wc(r);
    return xe(() => {
      const u = i.current, c = window.HTMLSelectElement.prototype, h = Object.getOwnPropertyDescriptor(
        c,
        "value"
      ).set;
      if (l !== r && h) {
        const m = new Event("change", { bubbles: !0 });
        h.call(u, r), u.dispatchEvent(m);
      }
    }, [l, r]), /* @__PURE__ */ n(Rd, { asChild: !0, children: /* @__PURE__ */ n("select", { ...a, ref: o, defaultValue: r }) });
  }
);
Jd.displayName = "BubbleSelect";
function Zd(e) {
  const t = Yt(e), r = ve(""), a = ve(0), i = Ae(
    (l) => {
      const u = r.current + l;
      t(u), (function c(d) {
        r.current = d, window.clearTimeout(a.current), d !== "" && (a.current = window.setTimeout(() => c(""), 1e3));
      })(u);
    },
    [t]
  ), o = Ae(() => {
    r.current = "", window.clearTimeout(a.current);
  }, []);
  return xe(() => () => window.clearTimeout(a.current), []), [r, i, o];
}
function eu(e, t, r) {
  const i = t.length > 1 && Array.from(t).every((d) => d === t[0]) ? t[0] : t, o = r ? e.indexOf(r) : -1;
  let l = Ey(e, Math.max(o, 0));
  i.length === 1 && (l = l.filter((d) => d !== r));
  const c = l.find(
    (d) => d.textValue.toLowerCase().startsWith(i.toLowerCase())
  );
  return c !== r ? c : void 0;
}
function Ey(e, t) {
  return e.map((r, a) => e[(t + a) % e.length]);
}
var Py = Td, Ry = Dd, Ty = Id, Ay = Od, Dy = $d, My = Ld, Iy = zd, Oy = Vd, $y = Hd, Ly = Kd, _y = Yd, By = qd;
function Zn({
  ...e
}) {
  return /* @__PURE__ */ n(Py, { "data-slot": "select", ...e });
}
function ea({
  ...e
}) {
  return /* @__PURE__ */ n(Ty, { "data-slot": "select-value", ...e });
}
function ta({
  className: e,
  size: t = "default",
  children: r,
  ...a
}) {
  return /* @__PURE__ */ s(
    Ry,
    {
      "data-slot": "select-trigger",
      "data-size": t,
      className: Oe(
        "border-input data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 flex w-full items-center justify-between gap-2 rounded-md border bg-input-background px-3 py-2 text-sm whitespace-nowrap transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-2 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        e
      ),
      ...a,
      children: [
        r,
        /* @__PURE__ */ n(Ay, { asChild: !0, children: /* @__PURE__ */ n(ki, { className: "size-4 opacity-50" }) })
      ]
    }
  );
}
function ra({
  className: e,
  children: t,
  position: r = "popper",
  ...a
}) {
  return /* @__PURE__ */ n(Dy, { children: /* @__PURE__ */ s(
    My,
    {
      "data-slot": "select-content",
      className: Oe(
        "bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-(--radix-select-content-available-height) min-w-[8rem] origin-(--radix-select-content-transform-origin) overflow-x-hidden overflow-y-auto rounded-md border shadow-md",
        r === "popper" && "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        e
      ),
      position: r,
      ...a,
      children: [
        /* @__PURE__ */ n(Fy, {}),
        /* @__PURE__ */ n(
          Iy,
          {
            className: Oe(
              "p-1",
              r === "popper" && "h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)] scroll-my-1"
            ),
            children: t
          }
        ),
        /* @__PURE__ */ n(zy, {})
      ]
    }
  ) });
}
function nr({
  className: e,
  children: t,
  ...r
}) {
  return /* @__PURE__ */ s(
    Oy,
    {
      "data-slot": "select-item",
      className: Oe(
        "focus:bg-accent focus:text-accent-foreground [&_svg:not([class*='text-'])]:text-muted-foreground relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pr-8 pl-2 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        e
      ),
      ...r,
      children: [
        /* @__PURE__ */ n("span", { className: "absolute right-2 flex size-3.5 items-center justify-center", children: /* @__PURE__ */ n(Ly, { children: /* @__PURE__ */ n(bt, { className: "size-4" }) }) }),
        /* @__PURE__ */ n($y, { children: t })
      ]
    }
  );
}
function Fy({
  className: e,
  ...t
}) {
  return /* @__PURE__ */ n(
    _y,
    {
      "data-slot": "select-scroll-up-button",
      className: Oe(
        "flex cursor-default items-center justify-center py-1",
        e
      ),
      ...t,
      children: /* @__PURE__ */ n(xp, { className: "size-4" })
    }
  );
}
function zy({
  className: e,
  ...t
}) {
  return /* @__PURE__ */ n(
    By,
    {
      "data-slot": "select-scroll-down-button",
      className: Oe(
        "flex cursor-default items-center justify-center py-1",
        e
      ),
      ...t,
      children: /* @__PURE__ */ n(ki, { className: "size-4" })
    }
  );
}
const On = [
  { code: "en", name: "English", flag: "🇬🇧" },
  { code: "fr", name: "Français", flag: "🇫🇷" },
  { code: "nl", name: "Nederlands", flag: "🇳🇱" },
  { code: "de", name: "Deutsch", flag: "🇩🇪" },
  { code: "es", name: "Español", flag: "🇪🇸" }
];
function Ki({ variant: e = "default" }) {
  const [t, r] = j("en"), a = (i) => {
    r(i);
  };
  return e === "minimal" ? /* @__PURE__ */ s(Zn, { value: t, onValueChange: a, children: [
    /* @__PURE__ */ n(ta, { className: "w-[70px] h-9", children: /* @__PURE__ */ n(ea, { children: /* @__PURE__ */ n("span", { className: "text-lg", children: On.find((i) => i.code === t)?.flag }) }) }),
    /* @__PURE__ */ n(ra, { children: On.map((i) => /* @__PURE__ */ n(nr, { value: i.code, children: /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ n("span", { className: "text-lg", children: i.flag }),
      /* @__PURE__ */ n("span", { children: i.name })
    ] }) }, i.code)) })
  ] }) : /* @__PURE__ */ s(Zn, { value: t, onValueChange: a, children: [
    /* @__PURE__ */ n(ta, { className: "w-[160px]", children: /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ n(ro, { className: "w-4 h-4" }),
      /* @__PURE__ */ n(ea, { children: /* @__PURE__ */ s("span", { children: [
        On.find((i) => i.code === t)?.flag,
        " ",
        On.find((i) => i.code === t)?.name
      ] }) })
    ] }) }),
    /* @__PURE__ */ n(ra, { children: On.map((i) => /* @__PURE__ */ n(nr, { value: i.code, children: /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
      /* @__PURE__ */ n("span", { className: "text-lg", children: i.flag }),
      /* @__PURE__ */ n("span", { children: i.name })
    ] }) }, i.code)) })
  ] });
}
function jy() {
  const e = sa(), { darkMode: t } = lr(), [r, a] = j({
    companyName: "",
    vatNumber: "",
    phone: "",
    email: "",
    city: ""
  }), [i, o] = j(!1), [l, u] = j(!1), [c, d] = j(!1), [h, m] = j(""), [f, g] = j(!1), p = (R) => {
    a({
      ...r,
      [R.target.name]: R.target.value
    });
  }, v = () => {
    o(!0);
  }, b = async (R) => {
    if (R.preventDefault(), !l) {
      de.error("Please accept the terms and conditions to continue.");
      return;
    }
    g(!0);
    try {
      const V = `${r.companyName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")}.taxio.be`;
      m(V), d(!0), de.success("Registration submitted successfully!");
    } catch (F) {
      console.error("Error during registration:", F), d(!0), de.success("Registration submitted successfully!");
    } finally {
      g(!1);
    }
  }, w = () => {
    d(!1), e("/");
  }, y = t ? "bg-slate-900" : "bg-gradient-to-br from-blue-50 to-indigo-100", k = t ? "bg-slate-800 border-slate-700" : "bg-white", N = t ? "text-white" : "text-slate-900", T = t ? "text-gray-400" : "text-gray-600", _ = t ? "bg-slate-700 border-slate-600 text-white placeholder:text-gray-400" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500", x = t ? "bg-slate-700 border-slate-600" : "bg-blue-50 border-blue-200";
  return /* @__PURE__ */ s("div", { className: `min-h-screen ${y} py-8 md:py-12 px-4`, children: [
    /* @__PURE__ */ s("div", { className: "container mx-auto max-w-4xl", children: [
      /* @__PURE__ */ s("div", { className: "flex justify-between items-center mb-6", children: [
        /* @__PURE__ */ n(Ve, { to: "/", children: /* @__PURE__ */ s(W, { variant: "ghost", className: t ? "text-white hover:bg-slate-700" : "", children: [
          /* @__PURE__ */ n(sr, { className: "w-4 h-4 mr-2" }),
          "Back to Home"
        ] }) }),
        /* @__PURE__ */ n(Ki, { variant: "minimal" })
      ] }),
      /* @__PURE__ */ n("div", { className: "max-w-2xl mx-auto", children: /* @__PURE__ */ s(ue, { className: `${k} shadow-2xl`, children: [
        /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ s("div", { className: "flex flex-col md:flex-row md:items-center gap-4 mb-2", children: [
          /* @__PURE__ */ n("div", { className: `w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg ${t ? "bg-yellow-400" : "bg-gradient-to-br from-blue-500 to-indigo-600"}`, children: /* @__PURE__ */ n(Wt, { className: `w-7 h-7 ${t ? "text-slate-900" : "text-white"}` }) }),
          /* @__PURE__ */ s("div", { className: "flex-1", children: [
            /* @__PURE__ */ n(je, { className: `text-2xl md:text-3xl ${N}`, children: "Taxi Company Registration" }),
            /* @__PURE__ */ n(Xe, { className: `mt-1 ${T}`, children: "Register your company to get started with our platform" })
          ] })
        ] }) }),
        /* @__PURE__ */ n(Ee, { children: /* @__PURE__ */ s("form", { onSubmit: b, className: "space-y-5", children: [
          /* @__PURE__ */ s("div", { className: "space-y-2", children: [
            /* @__PURE__ */ n(X, { htmlFor: "companyName", className: N, children: "Company Name *" }),
            /* @__PURE__ */ n(
              q,
              {
                id: "companyName",
                name: "companyName",
                value: r.companyName,
                onChange: p,
                placeholder: "Enter company name",
                className: _,
                required: !0
              }
            )
          ] }),
          /* @__PURE__ */ s("div", { className: "space-y-2", children: [
            /* @__PURE__ */ n(X, { htmlFor: "vatNumber", className: N, children: "VAT Number *" }),
            /* @__PURE__ */ n(
              q,
              {
                id: "vatNumber",
                name: "vatNumber",
                value: r.vatNumber,
                onChange: p,
                placeholder: "BE0123456789",
                className: _,
                required: !0
              }
            )
          ] }),
          /* @__PURE__ */ s("div", { className: "space-y-2", children: [
            /* @__PURE__ */ n(X, { htmlFor: "phone", className: N, children: "Phone Number *" }),
            /* @__PURE__ */ n(
              q,
              {
                id: "phone",
                name: "phone",
                type: "tel",
                value: r.phone,
                onChange: p,
                placeholder: "+32 123 45 67 89",
                className: _,
                required: !0
              }
            )
          ] }),
          /* @__PURE__ */ s("div", { className: "space-y-2", children: [
            /* @__PURE__ */ n(X, { htmlFor: "email", className: N, children: "Email Address *" }),
            /* @__PURE__ */ n(
              q,
              {
                id: "email",
                name: "email",
                type: "email",
                value: r.email,
                onChange: p,
                placeholder: "company@example.com",
                className: _,
                required: !0
              }
            )
          ] }),
          /* @__PURE__ */ s("div", { className: "space-y-2", children: [
            /* @__PURE__ */ n(X, { htmlFor: "city", className: N, children: "City *" }),
            /* @__PURE__ */ n(
              q,
              {
                id: "city",
                name: "city",
                value: r.city,
                onChange: p,
                placeholder: "Brussels",
                className: _,
                required: !0
              }
            )
          ] }),
          i && /* @__PURE__ */ s("div", { className: `p-4 rounded-lg border ${x} animate-in fade-in slide-in-from-top-2 duration-300`, children: [
            /* @__PURE__ */ s("h3", { className: `font-semibold mb-3 flex items-center ${N}`, children: [
              /* @__PURE__ */ n(Sr, { className: "w-4 h-4 mr-2" }),
              "Preview"
            ] }),
            /* @__PURE__ */ s("div", { className: `space-y-2 text-sm ${T}`, children: [
              /* @__PURE__ */ s("p", { children: [
                /* @__PURE__ */ n("strong", { className: N, children: "Company:" }),
                " ",
                r.companyName || "N/A"
              ] }),
              /* @__PURE__ */ s("p", { children: [
                /* @__PURE__ */ n("strong", { className: N, children: "VAT:" }),
                " ",
                r.vatNumber || "N/A"
              ] }),
              /* @__PURE__ */ s("p", { children: [
                /* @__PURE__ */ n("strong", { className: N, children: "Phone:" }),
                " ",
                r.phone || "N/A"
              ] }),
              /* @__PURE__ */ s("p", { children: [
                /* @__PURE__ */ n("strong", { className: N, children: "Email:" }),
                " ",
                r.email || "N/A"
              ] }),
              /* @__PURE__ */ s("p", { children: [
                /* @__PURE__ */ n("strong", { className: N, children: "City:" }),
                " ",
                r.city || "N/A"
              ] }),
              /* @__PURE__ */ s("p", { className: `mt-3 pt-3 border-t ${t ? "border-slate-600" : "border-blue-300"}`, children: [
                /* @__PURE__ */ n("strong", { className: N, children: "Generated Subdomain:" }),
                " ",
                /* @__PURE__ */ n("span", { className: `font-mono font-semibold ${t ? "text-yellow-400" : "text-blue-600"}`, children: r.companyName ? `${r.companyName.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "")}.taxio.be` : "companyname.taxio.be" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { className: `flex items-start gap-3 p-4 rounded-lg border-2 transition-all duration-300 ${l ? t ? "border-yellow-400 bg-yellow-400/10" : "border-blue-400 bg-blue-50" : t ? "border-slate-600 bg-slate-700/50" : "border-gray-200 bg-gray-50"}`, children: [
            /* @__PURE__ */ n(
              Pc,
              {
                id: "terms",
                checked: l,
                onCheckedChange: (R) => u(!!R),
                className: "mt-0.5"
              }
            ),
            /* @__PURE__ */ s(
              "label",
              {
                htmlFor: "terms",
                className: `text-sm cursor-pointer leading-relaxed ${T}`,
                children: [
                  "I accept the",
                  " ",
                  /* @__PURE__ */ n(
                    "a",
                    {
                      href: "/terms",
                      target: "_blank",
                      className: `font-semibold hover:underline ${t ? "text-yellow-400 hover:text-yellow-300" : "text-blue-600 hover:text-blue-700"}`,
                      onClick: (R) => R.stopPropagation(),
                      children: "terms and conditions"
                    }
                  ),
                  " ",
                  "and",
                  " ",
                  /* @__PURE__ */ n(
                    "a",
                    {
                      href: "/privacy",
                      target: "_blank",
                      className: `font-semibold hover:underline ${t ? "text-yellow-400 hover:text-yellow-300" : "text-blue-600 hover:text-blue-700"}`,
                      onClick: (R) => R.stopPropagation(),
                      children: "privacy policy"
                    }
                  )
                ]
              }
            )
          ] }),
          /* @__PURE__ */ s("div", { className: "flex flex-col sm:flex-row gap-3 pt-4", children: [
            /* @__PURE__ */ s(
              W,
              {
                type: "button",
                variant: "outline",
                onClick: v,
                className: `flex-1 ${t ? "border-slate-600 text-white hover:bg-slate-700" : ""}`,
                children: [
                  /* @__PURE__ */ n(Sr, { className: "w-4 h-4 mr-2" }),
                  "Preview"
                ]
              }
            ),
            /* @__PURE__ */ n(
              W,
              {
                type: "submit",
                className: `flex-1 ${t ? "bg-yellow-400 hover:bg-yellow-500 text-slate-900" : "bg-blue-600 hover:bg-blue-700 text-white"}`,
                disabled: !l || f,
                children: f ? "Submitting..." : "Submit Registration"
              }
            )
          ] })
        ] }) })
      ] }) })
    ] }),
    /* @__PURE__ */ n(gr, { open: c, onOpenChange: d, children: /* @__PURE__ */ s(vr, { className: `sm:max-w-[600px] ${t ? "bg-slate-800 border-slate-700" : "bg-white"}`, children: [
      /* @__PURE__ */ s(br, { children: [
        /* @__PURE__ */ n("div", { className: "flex justify-center mb-4", children: /* @__PURE__ */ n("div", { className: `w-20 h-20 rounded-full flex items-center justify-center shadow-xl ${t ? "bg-green-400/20" : "bg-green-100"}`, children: /* @__PURE__ */ n(Ba, { className: `w-12 h-12 ${t ? "text-green-400" : "text-green-600"}` }) }) }),
        /* @__PURE__ */ n(yr, { className: `text-3xl font-bold text-center mb-2 ${t ? "text-yellow-400" : "text-green-600"}`, children: "Registration Request Submitted!" }),
        /* @__PURE__ */ s(zn, { className: `text-center space-y-4 pt-4 ${T}`, children: [
          /* @__PURE__ */ s("p", { className: `text-lg ${N}`, children: [
            "Thank you for registering with ",
            /* @__PURE__ */ n("strong", { className: t ? "text-yellow-400" : "text-blue-600", children: "TAXIO" }),
            "!"
          ] }),
          /* @__PURE__ */ n("p", { className: "text-sm", children: "Your registration request has been received and is now pending approval from our admin team." }),
          /* @__PURE__ */ s("div", { className: `border rounded-lg p-4 my-4 ${t ? "bg-slate-700 border-slate-600" : "bg-blue-50 border-blue-200"}`, children: [
            /* @__PURE__ */ n("p", { className: `text-sm font-semibold mb-2 ${N}`, children: "Your Website Address:" }),
            /* @__PURE__ */ n("p", { className: `text-lg font-bold font-mono break-all ${t ? "text-yellow-400" : "text-blue-600"}`, children: h })
          ] }),
          /* @__PURE__ */ s("div", { className: `border rounded-lg p-4 text-left ${t ? "bg-amber-900/20 border-amber-700" : "bg-yellow-50 border-yellow-200"}`, children: [
            /* @__PURE__ */ n("p", { className: `text-sm font-semibold mb-3 ${t ? "text-amber-300" : "text-yellow-900"}`, children: "⏳ What happens next?" }),
            /* @__PURE__ */ s("ul", { className: `text-sm space-y-2 list-disc list-inside ${T}`, children: [
              /* @__PURE__ */ n("li", { children: "Our admin team will review your registration request" }),
              /* @__PURE__ */ s("li", { children: [
                "Once approved, you will receive via email at ",
                /* @__PURE__ */ n("strong", { className: t ? "text-yellow-400" : "text-blue-600", children: r.email }),
                ":"
              ] }),
              /* @__PURE__ */ s("ul", { className: "ml-6 mt-1 space-y-1 list-circle", children: [
                /* @__PURE__ */ s("li", { children: [
                  "✅ Your ",
                  /* @__PURE__ */ n("strong", { children: "website link" }),
                  " to share with customers"
                ] }),
                /* @__PURE__ */ s("li", { children: [
                  "📱 A ",
                  /* @__PURE__ */ n("strong", { children: "QR code" }),
                  " for easy sharing"
                ] }),
                /* @__PURE__ */ s("li", { children: [
                  "🔐 Your ",
                  /* @__PURE__ */ n("strong", { children: "login credentials" }),
                  " (username & temporary password)"
                ] }),
                /* @__PURE__ */ s("li", { children: [
                  "🔗 Your ",
                  /* @__PURE__ */ n("strong", { children: "admin login page" }),
                  " link"
                ] })
              ] }),
              /* @__PURE__ */ n("li", { className: "pt-2", children: "You can change your password on first login for security" }),
              /* @__PURE__ */ n("li", { children: "Once approved, start sharing your website to get bookings!" }),
              /* @__PURE__ */ n("li", { className: T, children: "⏱️ This process typically takes 1-2 business days" })
            ] })
          ] }),
          /* @__PURE__ */ n("p", { className: "text-xs pt-2", children: "Please check your email inbox (and spam folder) for your login credentials." })
        ] })
      ] }),
      /* @__PURE__ */ n("div", { className: "mt-6 flex justify-center", children: /* @__PURE__ */ n(
        W,
        {
          onClick: w,
          className: `px-8 ${t ? "bg-yellow-400 hover:bg-yellow-500 text-slate-900" : "bg-green-600 hover:bg-green-700 text-white"}`,
          size: "lg",
          children: "Got it!"
        }
      ) })
    ] }) })
  ] });
}
function Wy() {
  const e = sa(), [t, r] = j(""), [a, i] = j("");
  return /* @__PURE__ */ n("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center px-4", children: /* @__PURE__ */ s("div", { className: "w-full max-w-md", children: [
    /* @__PURE__ */ n(Ve, { to: "/", children: /* @__PURE__ */ s(W, { variant: "ghost", className: "mb-6", children: [
      /* @__PURE__ */ n(sr, { className: "w-4 h-4 mr-2" }),
      "Back to Home"
    ] }) }),
    /* @__PURE__ */ s(ue, { children: [
      /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ s("div", { className: "flex items-center mb-2", children: [
        /* @__PURE__ */ n("div", { className: "w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4", children: /* @__PURE__ */ n(_e, { className: "w-6 h-6 text-green-600" }) }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ n(je, { className: "text-2xl", children: "Company Login" }),
          /* @__PURE__ */ n(Xe, { children: "Access your taxi company dashboard" })
        ] })
      ] }) }),
      /* @__PURE__ */ n(Ee, { children: /* @__PURE__ */ s("form", { onSubmit: (l) => {
        l.preventDefault(), de.success("Login successful!"), setTimeout(() => {
          e("/dashboard/company/democompany");
        }, 1e3);
      }, className: "space-y-4", children: [
        /* @__PURE__ */ s("div", { className: "space-y-2", children: [
          /* @__PURE__ */ n(X, { htmlFor: "email", children: "Email Address" }),
          /* @__PURE__ */ n(
            q,
            {
              id: "email",
              type: "email",
              value: t,
              onChange: (l) => r(l.target.value),
              placeholder: "company@example.com",
              required: !0
            }
          )
        ] }),
        /* @__PURE__ */ s("div", { className: "space-y-2", children: [
          /* @__PURE__ */ n(X, { htmlFor: "password", children: "Password" }),
          /* @__PURE__ */ n(
            q,
            {
              id: "password",
              type: "password",
              value: a,
              onChange: (l) => i(l.target.value),
              placeholder: "Enter your password",
              required: !0
            }
          )
        ] }),
        /* @__PURE__ */ n(W, { type: "submit", className: "w-full", children: "Login" }),
        /* @__PURE__ */ s("div", { className: "text-center text-sm text-gray-600 mt-4", children: [
          "Don't have an account?",
          " ",
          /* @__PURE__ */ n(Ve, { to: "/register", className: "text-blue-600 hover:underline", children: "Register here" })
        ] })
      ] }) })
    ] })
  ] }) });
}
function Uy() {
  const e = sa(), [t, r] = j(""), [a, i] = j("");
  return /* @__PURE__ */ n("div", { className: "min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 flex items-center justify-center px-4", children: /* @__PURE__ */ s("div", { className: "w-full max-w-md", children: [
    /* @__PURE__ */ n(Ve, { to: "/", children: /* @__PURE__ */ s(W, { variant: "ghost", className: "mb-6", children: [
      /* @__PURE__ */ n(sr, { className: "w-4 h-4 mr-2" }),
      "Back to Home"
    ] }) }),
    /* @__PURE__ */ s(ue, { children: [
      /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ s("div", { className: "flex items-center mb-2", children: [
        /* @__PURE__ */ n("div", { className: "w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mr-4", children: /* @__PURE__ */ n(zr, { className: "w-6 h-6 text-purple-600" }) }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ n(je, { className: "text-2xl", children: "Platform Admin" }),
          /* @__PURE__ */ n(Xe, { children: "Administrative access for platform management" })
        ] })
      ] }) }),
      /* @__PURE__ */ s(Ee, { children: [
        /* @__PURE__ */ s("form", { onSubmit: (l) => {
          l.preventDefault(), de.success("Admin login successful!"), setTimeout(() => {
            e("/dashboard/admin");
          }, 1e3);
        }, className: "space-y-4", children: [
          /* @__PURE__ */ s("div", { className: "space-y-2", children: [
            /* @__PURE__ */ n(X, { htmlFor: "email", children: "Admin Email" }),
            /* @__PURE__ */ n(
              q,
              {
                id: "email",
                type: "email",
                value: t,
                onChange: (l) => r(l.target.value),
                placeholder: "admin@taxio.be",
                required: !0
              }
            )
          ] }),
          /* @__PURE__ */ s("div", { className: "space-y-2", children: [
            /* @__PURE__ */ n(X, { htmlFor: "password", children: "Admin Password" }),
            /* @__PURE__ */ n(
              q,
              {
                id: "password",
                type: "password",
                value: a,
                onChange: (l) => i(l.target.value),
                placeholder: "Enter admin password",
                required: !0
              }
            )
          ] }),
          /* @__PURE__ */ n(W, { type: "submit", className: "w-full", children: "Login as Admin" })
        ] }),
        /* @__PURE__ */ s("div", { className: "mt-6 pt-6 border-t", children: [
          /* @__PURE__ */ n("p", { className: "text-sm text-gray-600 mb-3 text-center", children: "Show taxi companies what their website will look like:" }),
          /* @__PURE__ */ n(Ve, { to: "/book/democompany", children: /* @__PURE__ */ s(W, { variant: "outline", className: "w-full", size: "lg", children: [
            /* @__PURE__ */ n(_e, { className: "w-4 h-4 mr-2" }),
            "View Demo Booking Page",
            /* @__PURE__ */ n(Ei, { className: "w-4 h-4 ml-2" })
          ] }) }),
          /* @__PURE__ */ n("p", { className: "text-xs text-gray-500 mt-2 text-center", children: "(This is how each company's subdomain will work)" })
        ] })
      ] })
    ] })
  ] }) });
}
function jn({ className: e, ...t }) {
  return /* @__PURE__ */ n(
    "div",
    {
      "data-slot": "table-container",
      className: "relative w-full overflow-x-auto",
      children: /* @__PURE__ */ n(
        "table",
        {
          "data-slot": "table",
          className: Oe("w-full caption-bottom text-sm", e),
          ...t
        }
      )
    }
  );
}
function Wn({ className: e, ...t }) {
  return /* @__PURE__ */ n(
    "thead",
    {
      "data-slot": "table-header",
      className: Oe("[&_tr]:border-b", e),
      ...t
    }
  );
}
function Un({ className: e, ...t }) {
  return /* @__PURE__ */ n(
    "tbody",
    {
      "data-slot": "table-body",
      className: Oe("[&_tr:last-child]:border-0", e),
      ...t
    }
  );
}
function zt({ className: e, ...t }) {
  return /* @__PURE__ */ n(
    "tr",
    {
      "data-slot": "table-row",
      className: Oe(
        "hover:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors",
        e
      ),
      ...t
    }
  );
}
function Ie({ className: e, ...t }) {
  return /* @__PURE__ */ n(
    "th",
    {
      "data-slot": "table-head",
      className: Oe(
        "text-foreground h-10 px-2 text-left align-middle font-medium whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        e
      ),
      ...t
    }
  );
}
function Te({ className: e, ...t }) {
  return /* @__PURE__ */ n(
    "td",
    {
      "data-slot": "table-cell",
      className: Oe(
        "p-2 align-middle whitespace-nowrap [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px]",
        e
      ),
      ...t
    }
  );
}
var Bo = "rovingFocusGroup.onEntryFocus", Vy = { bubbles: !1, cancelable: !0 }, ho = "RovingFocusGroup", [ii, tu, Hy] = od(ho), [Gy, ru] = Kr(
  ho,
  [Hy]
), [Ky, Yy] = Gy(ho), nu = Q(
  (e, t) => /* @__PURE__ */ n(ii.Provider, { scope: e.__scopeRovingFocusGroup, children: /* @__PURE__ */ n(ii.Slot, { scope: e.__scopeRovingFocusGroup, children: /* @__PURE__ */ n(qy, { ...e, ref: t }) }) })
);
nu.displayName = ho;
var qy = Q((e, t) => {
  const {
    __scopeRovingFocusGroup: r,
    orientation: a,
    loop: i = !1,
    dir: o,
    currentTabStopId: l,
    defaultCurrentTabStopId: u,
    onCurrentTabStopIdChange: c,
    onEntryFocus: d,
    preventScrollOnEntryFocus: h = !1,
    ...m
  } = e, f = ve(null), g = Ke(t, f), p = _i(o), [v = null, b] = dn({
    prop: l,
    defaultProp: u,
    onChange: c
  }), [w, y] = j(!1), k = Yt(d), N = tu(r), T = ve(!1), [_, x] = j(0);
  return xe(() => {
    const R = f.current;
    if (R)
      return R.addEventListener(Bo, k), () => R.removeEventListener(Bo, k);
  }, [k]), /* @__PURE__ */ n(
    Ky,
    {
      scope: r,
      orientation: a,
      dir: p,
      loop: i,
      currentTabStopId: v,
      onItemFocus: Ae(
        (R) => b(R),
        [b]
      ),
      onItemShiftTab: Ae(() => y(!0), []),
      onFocusableItemAdd: Ae(
        () => x((R) => R + 1),
        []
      ),
      onFocusableItemRemove: Ae(
        () => x((R) => R - 1),
        []
      ),
      children: /* @__PURE__ */ n(
        $e.div,
        {
          tabIndex: w || _ === 0 ? -1 : 0,
          "data-orientation": a,
          ...m,
          ref: g,
          style: { outline: "none", ...e.style },
          onMouseDown: De(e.onMouseDown, () => {
            T.current = !0;
          }),
          onFocus: De(e.onFocus, (R) => {
            const F = !T.current;
            if (R.target === R.currentTarget && F && !w) {
              const V = new CustomEvent(Bo, Vy);
              if (R.currentTarget.dispatchEvent(V), !V.defaultPrevented) {
                const E = N().filter((I) => I.focusable), S = E.find((I) => I.active), $ = E.find((I) => I.id === v), U = [S, $, ...E].filter(
                  Boolean
                ).map((I) => I.ref.current);
                iu(U, h);
              }
            }
            T.current = !1;
          }),
          onBlur: De(e.onBlur, () => y(!1))
        }
      )
    }
  );
}), au = "RovingFocusGroupItem", ou = Q(
  (e, t) => {
    const {
      __scopeRovingFocusGroup: r,
      focusable: a = !0,
      active: i = !1,
      tabStopId: o,
      ...l
    } = e, u = Nr(), c = o || u, d = Yy(au, r), h = d.currentTabStopId === c, m = tu(r), { onFocusableItemAdd: f, onFocusableItemRemove: g } = d;
    return xe(() => {
      if (a)
        return f(), () => g();
    }, [a, f, g]), /* @__PURE__ */ n(
      ii.ItemSlot,
      {
        scope: r,
        id: c,
        focusable: a,
        active: i,
        children: /* @__PURE__ */ n(
          $e.span,
          {
            tabIndex: h ? 0 : -1,
            "data-orientation": d.orientation,
            ...l,
            ref: t,
            onMouseDown: De(e.onMouseDown, (p) => {
              a ? d.onItemFocus(c) : p.preventDefault();
            }),
            onFocus: De(e.onFocus, () => d.onItemFocus(c)),
            onKeyDown: De(e.onKeyDown, (p) => {
              if (p.key === "Tab" && p.shiftKey) {
                d.onItemShiftTab();
                return;
              }
              if (p.target !== p.currentTarget) return;
              const v = Jy(p, d.orientation, d.dir);
              if (v !== void 0) {
                if (p.metaKey || p.ctrlKey || p.altKey || p.shiftKey) return;
                p.preventDefault();
                let w = m().filter((y) => y.focusable).map((y) => y.ref.current);
                if (v === "last") w.reverse();
                else if (v === "prev" || v === "next") {
                  v === "prev" && w.reverse();
                  const y = w.indexOf(p.currentTarget);
                  w = d.loop ? Zy(w, y + 1) : w.slice(y + 1);
                }
                setTimeout(() => iu(w));
              }
            })
          }
        )
      }
    );
  }
);
ou.displayName = au;
var Xy = {
  ArrowLeft: "prev",
  ArrowUp: "prev",
  ArrowRight: "next",
  ArrowDown: "next",
  PageUp: "first",
  Home: "first",
  PageDown: "last",
  End: "last"
};
function Qy(e, t) {
  return t !== "rtl" ? e : e === "ArrowLeft" ? "ArrowRight" : e === "ArrowRight" ? "ArrowLeft" : e;
}
function Jy(e, t, r) {
  const a = Qy(e.key, r);
  if (!(t === "vertical" && ["ArrowLeft", "ArrowRight"].includes(a)) && !(t === "horizontal" && ["ArrowUp", "ArrowDown"].includes(a)))
    return Xy[a];
}
function iu(e, t = !1) {
  const r = document.activeElement;
  for (const a of e)
    if (a === r || (a.focus({ preventScroll: t }), document.activeElement !== r)) return;
}
function Zy(e, t) {
  return e.map((r, a) => e[(t + a) % e.length]);
}
var ex = nu, tx = ou, Yi = "Tabs", [rx] = Kr(Yi, [
  ru
]), su = ru(), [nx, qi] = rx(Yi), lu = Q(
  (e, t) => {
    const {
      __scopeTabs: r,
      value: a,
      onValueChange: i,
      defaultValue: o,
      orientation: l = "horizontal",
      dir: u,
      activationMode: c = "automatic",
      ...d
    } = e, h = _i(u), [m, f] = dn({
      prop: a,
      onChange: i,
      defaultProp: o
    });
    return /* @__PURE__ */ n(
      nx,
      {
        scope: r,
        baseId: Nr(),
        value: m,
        onValueChange: f,
        orientation: l,
        dir: h,
        activationMode: c,
        children: /* @__PURE__ */ n(
          $e.div,
          {
            dir: h,
            "data-orientation": l,
            ...d,
            ref: t
          }
        )
      }
    );
  }
);
lu.displayName = Yi;
var cu = "TabsList", du = Q(
  (e, t) => {
    const { __scopeTabs: r, loop: a = !0, ...i } = e, o = qi(cu, r), l = su(r);
    return /* @__PURE__ */ n(
      ex,
      {
        asChild: !0,
        ...l,
        orientation: o.orientation,
        dir: o.dir,
        loop: a,
        children: /* @__PURE__ */ n(
          $e.div,
          {
            role: "tablist",
            "aria-orientation": o.orientation,
            ...i,
            ref: t
          }
        )
      }
    );
  }
);
du.displayName = cu;
var uu = "TabsTrigger", mu = Q(
  (e, t) => {
    const { __scopeTabs: r, value: a, disabled: i = !1, ...o } = e, l = qi(uu, r), u = su(r), c = pu(l.baseId, a), d = gu(l.baseId, a), h = a === l.value;
    return /* @__PURE__ */ n(
      tx,
      {
        asChild: !0,
        ...u,
        focusable: !i,
        active: h,
        children: /* @__PURE__ */ n(
          $e.button,
          {
            type: "button",
            role: "tab",
            "aria-selected": h,
            "aria-controls": d,
            "data-state": h ? "active" : "inactive",
            "data-disabled": i ? "" : void 0,
            disabled: i,
            id: c,
            ...o,
            ref: t,
            onMouseDown: De(e.onMouseDown, (m) => {
              !i && m.button === 0 && m.ctrlKey === !1 ? l.onValueChange(a) : m.preventDefault();
            }),
            onKeyDown: De(e.onKeyDown, (m) => {
              [" ", "Enter"].includes(m.key) && l.onValueChange(a);
            }),
            onFocus: De(e.onFocus, () => {
              const m = l.activationMode !== "manual";
              !h && !i && m && l.onValueChange(a);
            })
          }
        )
      }
    );
  }
);
mu.displayName = uu;
var hu = "TabsContent", fu = Q(
  (e, t) => {
    const { __scopeTabs: r, value: a, forceMount: i, children: o, ...l } = e, u = qi(hu, r), c = pu(u.baseId, a), d = gu(u.baseId, a), h = a === u.value, m = ve(h);
    return xe(() => {
      const f = requestAnimationFrame(() => m.current = !1);
      return () => cancelAnimationFrame(f);
    }, []), /* @__PURE__ */ n(bn, { present: i || h, children: ({ present: f }) => /* @__PURE__ */ n(
      $e.div,
      {
        "data-state": h ? "active" : "inactive",
        "data-orientation": u.orientation,
        role: "tabpanel",
        "aria-labelledby": c,
        hidden: !f,
        id: d,
        tabIndex: 0,
        ...l,
        ref: t,
        style: {
          ...e.style,
          animationDuration: m.current ? "0s" : void 0
        },
        children: f && o
      }
    ) });
  }
);
fu.displayName = hu;
function pu(e, t) {
  return `${e}-trigger-${t}`;
}
function gu(e, t) {
  return `${e}-content-${t}`;
}
var ax = lu, ox = du, ix = mu, sx = fu;
function Xi({
  className: e,
  ...t
}) {
  return /* @__PURE__ */ n(
    ax,
    {
      "data-slot": "tabs",
      className: Oe("flex flex-col gap-2", e),
      ...t
    }
  );
}
function Ja({
  className: e,
  ...t
}) {
  return /* @__PURE__ */ n(
    ox,
    {
      "data-slot": "tabs-list",
      className: Oe(
        "bg-muted text-muted-foreground inline-flex h-9 w-fit items-center justify-center rounded-xl p-[3px] flex",
        e
      ),
      ...t
    }
  );
}
function mt({
  className: e,
  ...t
}) {
  return /* @__PURE__ */ n(
    ix,
    {
      "data-slot": "tabs-trigger",
      className: Oe(
        "data-[state=active]:bg-card dark:data-[state=active]:text-foreground focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:outline-ring dark:data-[state=active]:border-input dark:data-[state=active]:bg-input/30 text-foreground dark:text-muted-foreground inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-xl border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap transition-[color,box-shadow] focus-visible:ring-[3px] focus-visible:outline-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        e
      ),
      ...t
    }
  );
}
function ht({
  className: e,
  ...t
}) {
  return /* @__PURE__ */ n(
    sx,
    {
      "data-slot": "tabs-content",
      className: Oe("flex-1 outline-none", e),
      ...t
    }
  );
}
const lx = Jl(
  "inline-flex items-center justify-center rounded-md border px-2 py-0.5 text-xs font-medium w-fit whitespace-nowrap shrink-0 [&>svg]:size-3 gap-1 [&>svg]:pointer-events-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive transition-[color,box-shadow] overflow-hidden",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground [a&]:hover:bg-primary/90",
        secondary: "border-transparent bg-secondary text-secondary-foreground [a&]:hover:bg-secondary/90",
        destructive: "border-transparent bg-destructive text-white [a&]:hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline: "text-foreground [a&]:hover:bg-accent [a&]:hover:text-accent-foreground"
      }
    },
    defaultVariants: {
      variant: "default"
    }
  }
);
function it({
  className: e,
  variant: t,
  asChild: r = !1,
  ...a
}) {
  return /* @__PURE__ */ n(
    r ? kr : "span",
    {
      "data-slot": "badge",
      className: Oe(lx({ variant: t }), e),
      ...a
    }
  );
}
const cx = [
  { id: 1, name: "John Doe", phone: "+32 123 456 789", status: "Active", email: "john@example.com", available: !0 },
  { id: 2, name: "Jane Smith", phone: "+32 987 654 321", status: "Active", email: "jane@example.com", available: !1 }
], dx = [
  { id: 1, model: "Mercedes E-Class", plate: "1-ABC-123", year: 2022, driver: "John Doe" },
  { id: 2, model: "BMW 5 Series", plate: "1-DEF-456", year: 2021, driver: "Jane Smith" }
], ux = [
  { id: 1, name: "Jan Peeters", from: "Brussels Airport", to: "Brussels Central", date: "2026-02-24", time: "14:00", price: "€45.00", contact: "+32 470 123 456" },
  { id: 2, name: "Marie Dubois", from: "Antwerp Station", to: "Brussels", date: "2026-02-25", time: "09:30", price: "€65.00", contact: "customer@email.com" },
  { id: 3, name: "Tom Janssens", from: "Ghent Center", to: "Brussels Airport", date: "2026-02-26", time: "15:00", price: "€55.00", contact: "+32 495 789 123" }
];
function mx() {
  const { companyId: e } = fn(), t = sa(), { language: r, darkMode: a } = lr(), [i, o] = j(!1), [l, u] = j(!1), [c, d] = j(!1), [h, m] = j(!1), [f, g] = j(!1), [p, v] = j(""), [b, w] = j({ model: "", plate: "", year: "", driver: "", class: "Standard" }), [y, k] = j({ name: "", phone: "", email: "", licenseDoc: null }), [N, T] = j({
    standardStart: "5.00",
    standardPerKm: "2.00",
    standardInitialKm: "3",
    vanStart: "8.00",
    vanPerKm: "3.00",
    vanInitialKm: "3",
    luxuryStart: "10.00",
    luxuryPerKm: "4.00",
    luxuryInitialKm: "3"
  }), [_, x] = j(cx), R = (O) => O ? O.split(/[-_]/).map(
    (We) => We.charAt(0).toUpperCase() + We.slice(1).toLowerCase()
  ).join(" ") : "DemoCompany", [F, V] = j({
    name: R(e),
    subdomain: e || "democompany",
    slogan: "Fast & Reliable Service",
    btw: "BE 0123.456.789",
    phone: "+32 470 123 456",
    email: "contact@company.be",
    city: "Brussels",
    status: "available",
    carTypes: ["standard", "van", "luxury"]
  }), [E, S] = j(F), A = {
    en: {
      dashboard: "Dashboard",
      overview: "Overview",
      drivers: "Drivers",
      cars: "Cars",
      requests: "Ride Requests",
      addCar: "Add Car",
      setPricing: "Set Pricing",
      customizePage: "Customize Page",
      essentialInfo: "Essential Information",
      yourBookingPage: "Your Booking Page",
      carTypesOffered: "Car Types",
      profileCompletion: "Profile",
      viewLive: "View Live",
      shareQR: "QR Code",
      bookingUrl: "Booking URL",
      companyName: "Company Name",
      slogan: "Slogan",
      btwNumber: "BTW Number",
      phoneNumber: "Phone",
      emailAddress: "Email",
      city: "City",
      availabilityStatus: "Status",
      available: "Available",
      busy: "Busy",
      offline: "Offline",
      standard: "Standard",
      van: "Van",
      luxury: "Luxury",
      saveChanges: "Save",
      cancel: "Cancel",
      logout: "Logout",
      complete: "Complete",
      requestHelp: "Help"
    },
    fr: {
      dashboard: "Tableau de Bord",
      overview: "Aperçu",
      drivers: "Chauffeurs",
      cars: "Voitures",
      requests: "Demandes",
      addCar: "Ajouter Voiture",
      setPricing: "Tarification",
      customizePage: "Personnaliser",
      essentialInfo: "Informations Essentielles",
      yourBookingPage: "Page de Réservation",
      carTypesOffered: "Types de Voitures",
      profileCompletion: "Profil",
      viewLive: "Voir en Direct",
      shareQR: "QR Code",
      bookingUrl: "URL",
      companyName: "Nom",
      slogan: "Slogan",
      btwNumber: "TVA",
      phoneNumber: "Téléphone",
      emailAddress: "Email",
      city: "Ville",
      availabilityStatus: "Statut",
      available: "Disponible",
      busy: "Occupé",
      offline: "Hors ligne",
      standard: "Standard",
      van: "Van",
      luxury: "Luxe",
      saveChanges: "Sauvegarder",
      cancel: "Annuler",
      logout: "Déconnexion",
      complete: "Complet",
      requestHelp: "Aide"
    },
    nl: {
      dashboard: "Dashboard",
      overview: "Overzicht",
      drivers: "Chauffeurs",
      cars: "Auto's",
      requests: "Aanvragen",
      addCar: "Auto Toevoegen",
      setPricing: "Prijzen",
      customizePage: "Aanpassen",
      essentialInfo: "Essentiële Info",
      yourBookingPage: "Boekingspagina",
      carTypesOffered: "Autotypes",
      profileCompletion: "Profiel",
      viewLive: "Bekijk Live",
      shareQR: "QR Code",
      bookingUrl: "URL",
      companyName: "Naam",
      slogan: "Slogan",
      btwNumber: "BTW",
      phoneNumber: "Telefoon",
      emailAddress: "Email",
      city: "Stad",
      availabilityStatus: "Status",
      available: "Beschikbaar",
      busy: "Bezet",
      offline: "Offline",
      standard: "Standaard",
      van: "Van",
      luxury: "Luxe",
      saveChanges: "Opslaan",
      cancel: "Annuleren",
      logout: "Uitloggen",
      complete: "Compleet",
      requestHelp: "Help"
    }
  }[r], U = He(() => {
    const O = [
      !!(E.name && E.slogan && E.btw),
      !!(E.phone && E.email && E.city),
      E.carTypes.length > 0,
      E.status === "available"
    ], We = O.filter(Boolean).length;
    return Math.round(We / O.length * 100);
  }, [E]), I = () => {
    de.success("Car added successfully!"), o(!1);
  }, Y = () => {
    de.success("Pricing updated successfully!"), u(!1);
  }, D = () => {
    V(E), d(!1), m(!1), de.success("Saved successfully!");
  }, J = (O) => {
    S((We) => ({
      ...We,
      carTypes: We.carTypes.includes(O) ? We.carTypes.filter((st) => st !== O) : [...We.carTypes, O]
    }));
  }, we = (O) => {
    de.success("WhatsApp message prepared");
  }, he = (O) => {
    de.success(`Email sent for ride request #${O.id}`);
  }, be = (O) => {
    x(_.map(
      (We) => We.id === O ? { ...We, available: !We.available } : We
    ));
  }, re = () => {
    if (!y.name || !y.phone || !y.email) {
      de.error("Please fill all driver details");
      return;
    }
    de.success("Driver added successfully!"), k({ name: "", phone: "", email: "", licenseDoc: null }), g(!1);
  }, pe = (O) => {
    const We = O.target.files?.[0];
    We && (k({ ...y, licenseDoc: We }), de.success(`Document "${We.name}" uploaded`));
  }, Me = He(() => ux.filter(
    (O) => O.from.toLowerCase().includes(p.toLowerCase()) || O.to.toLowerCase().includes(p.toLowerCase()) || O.contact.toLowerCase().includes(p.toLowerCase()) || O.date.includes(p)
  ), [p]), Ne = () => {
    de.success("Exporting ride requests to Excel...");
  }, K = a ? "bg-slate-900" : "bg-gray-50", ge = a ? "bg-slate-800" : "bg-white", L = a ? "text-white" : "text-slate-900", G = a ? "text-gray-400" : "text-gray-600", oe = a ? "bg-slate-700 border-slate-600 text-white placeholder:text-gray-400" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500", ne = a ? "border-slate-700" : "border-gray-200", Ge = {
    available: { color: "bg-green-500", label: A.available },
    busy: { color: "bg-yellow-500", label: A.busy },
    offline: { color: "bg-gray-500", label: A.offline }
  };
  return /* @__PURE__ */ s("div", { className: `min-h-screen ${K}`, children: [
    /* @__PURE__ */ n("div", { className: `${ge} shadow-sm border-b ${ne}`, children: /* @__PURE__ */ n("div", { className: "container mx-auto px-4 py-4", children: /* @__PURE__ */ s("div", { className: "flex flex-col gap-2", children: [
      /* @__PURE__ */ s("div", { className: "flex justify-between items-center", children: [
        /* @__PURE__ */ s("div", { className: "flex items-center gap-3", children: [
          /* @__PURE__ */ n("div", { className: "w-10 h-10 rounded-xl bg-yellow-400 flex items-center justify-center shadow-md", children: /* @__PURE__ */ n(_e, { className: "w-5 h-5 text-slate-900" }) }),
          /* @__PURE__ */ n("h1", { className: `text-lg font-bold ${L}`, children: E.name })
        ] }),
        /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ s("div", { className: "relative group cursor-pointer", title: A.profileCompletion, children: [
            /* @__PURE__ */ s("svg", { className: "w-10 h-10 -rotate-90", children: [
              /* @__PURE__ */ n("circle", { cx: "20", cy: "20", r: "16", stroke: a ? "#334155" : "#e5e7eb", strokeWidth: "3", fill: "none" }),
              /* @__PURE__ */ n(
                "circle",
                {
                  cx: "20",
                  cy: "20",
                  r: "16",
                  stroke: U === 100 ? "#10b981" : "#facc15",
                  strokeWidth: "3",
                  fill: "none",
                  strokeDasharray: `${2 * Math.PI * 16}`,
                  strokeDashoffset: `${2 * Math.PI * 16 * (1 - U / 100)}`,
                  className: "transition-all duration-500"
                }
              )
            ] }),
            /* @__PURE__ */ s("span", { className: `absolute inset-0 flex items-center justify-center text-[10px] font-bold ${U === 100 ? "text-green-500" : a ? "text-yellow-400" : "text-yellow-600"}`, children: [
              U,
              "%"
            ] })
          ] }),
          /* @__PURE__ */ s(
            W,
            {
              onClick: () => de.info("Support team will contact you soon!"),
              variant: "outline",
              size: "sm",
              className: `${a ? "border-yellow-400 text-yellow-400 hover:bg-yellow-400 hover:text-slate-900" : "border-gray-300 hover:bg-gray-50"}`,
              children: [
                /* @__PURE__ */ n(Ep, { className: "w-4 h-4 md:mr-2" }),
                /* @__PURE__ */ n("span", { className: "hidden md:inline", children: A.requestHelp })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ s("div", { className: "flex justify-between items-center", children: [
        /* @__PURE__ */ n("p", { className: `text-xs ${G} ml-[52px]`, children: A.dashboard }),
        /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ n(Ki, { variant: "minimal" }),
          /* @__PURE__ */ s(
            W,
            {
              onClick: () => t("/"),
              variant: "outline",
              size: "sm",
              className: `${a ? "border-red-400 text-red-400 hover:bg-red-400 hover:text-white" : "border-gray-300 hover:bg-gray-50"}`,
              children: [
                /* @__PURE__ */ n(mc, { className: "w-4 h-4 md:mr-2" }),
                /* @__PURE__ */ n("span", { className: "hidden md:inline", children: A.logout })
              ]
            }
          )
        ] })
      ] }),
      /* @__PURE__ */ n("div", { className: `h-px w-full ${a ? "bg-slate-700" : "bg-gray-200"}` }),
      /* @__PURE__ */ s("div", { className: "flex justify-between items-center", children: [
        /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
          /* @__PURE__ */ n("span", { className: `text-xs font-semibold ${G}`, children: "MY BTW" }),
          /* @__PURE__ */ n("span", { className: `text-xs font-bold ${L}`, children: E.btw })
        ] }),
        /* @__PURE__ */ s(Zn, { value: E.status, onValueChange: (O) => S({ ...E, status: O }), children: [
          /* @__PURE__ */ n(ta, { className: `w-[140px] ${oe}`, children: /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
            /* @__PURE__ */ n("div", { className: `w-2 h-2 rounded-full ${Ge[E.status].color}` }),
            /* @__PURE__ */ n(ea, {})
          ] }) }),
          /* @__PURE__ */ s(ra, { children: [
            /* @__PURE__ */ n(nr, { value: "available", children: /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ n("div", { className: "w-2 h-2 rounded-full bg-green-500" }),
              A.available
            ] }) }),
            /* @__PURE__ */ n(nr, { value: "busy", children: /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ n("div", { className: "w-2 h-2 rounded-full bg-yellow-500" }),
              A.busy
            ] }) }),
            /* @__PURE__ */ n(nr, { value: "offline", children: /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ n("div", { className: "w-2 h-2 rounded-full bg-gray-500" }),
              A.offline
            ] }) })
          ] })
        ] })
      ] })
    ] }) }) }),
    /* @__PURE__ */ s("div", { className: "container mx-auto px-4 py-8", children: [
      /* @__PURE__ */ s(Xi, { defaultValue: "overview", className: "space-y-6", children: [
        /* @__PURE__ */ s(Ja, { className: `w-full grid grid-cols-2 md:grid-cols-4 gap-2 ${a ? "bg-slate-800" : "bg-white"}`, children: [
          /* @__PURE__ */ n(mt, { value: "overview", className: a ? "data-[state=active]:bg-yellow-400 data-[state=active]:text-slate-900" : "", children: A.overview }),
          /* @__PURE__ */ n(mt, { value: "cars", className: a ? "data-[state=active]:bg-yellow-400 data-[state=active]:text-slate-900" : "", children: A.cars }),
          /* @__PURE__ */ n(mt, { value: "pricing", className: a ? "data-[state=active]:bg-yellow-400 data-[state=active]:text-slate-900" : "", children: "Set Pricing" }),
          /* @__PURE__ */ n(mt, { value: "info", className: a ? "data-[state=active]:bg-yellow-400 data-[state=active]:text-slate-900" : "", children: "Essential Info" })
        ] }),
        /* @__PURE__ */ s(Ja, { className: `w-full grid grid-cols-3 gap-2 ${a ? "bg-slate-800" : "bg-white"}`, children: [
          /* @__PURE__ */ n(mt, { value: "drivers", className: a ? "data-[state=active]:bg-yellow-400 data-[state=active]:text-slate-900" : "", children: A.drivers }),
          /* @__PURE__ */ n(mt, { value: "requests", className: a ? "data-[state=active]:bg-yellow-400 data-[state=active]:text-slate-900" : "", children: A.requests }),
          /* @__PURE__ */ n(mt, { value: "license", className: a ? "data-[state=active]:bg-yellow-400 data-[state=active]:text-slate-900" : "", children: "License Plan" })
        ] }),
        /* @__PURE__ */ n(ht, { value: "overview", className: "space-y-4", children: /* @__PURE__ */ s("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-4", children: [
          /* @__PURE__ */ s(gr, { open: i, onOpenChange: o, children: [
            /* @__PURE__ */ n(In, { asChild: !0, children: /* @__PURE__ */ n(ue, { className: `${ge} border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer`, children: /* @__PURE__ */ s("div", { className: "p-6 flex flex-col items-center justify-center text-center", children: [
              /* @__PURE__ */ n("div", { className: "w-14 h-14 bg-blue-100 dark:bg-blue-400/20 rounded-full flex items-center justify-center mb-3", children: /* @__PURE__ */ n(Ea, { className: "w-7 h-7 text-blue-600 dark:text-blue-400" }) }),
              /* @__PURE__ */ n("h3", { className: `font-bold text-base ${L}`, children: A.addCar })
            ] }) }) }),
            /* @__PURE__ */ s(vr, { className: a ? "bg-slate-800 text-white" : "", children: [
              /* @__PURE__ */ s(br, { children: [
                /* @__PURE__ */ n(yr, { className: L, children: A.addCar }),
                /* @__PURE__ */ n(zn, { className: G, children: "Add a new vehicle to your fleet" })
              ] }),
              /* @__PURE__ */ s("div", { className: "space-y-4", children: [
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n(X, { className: L, children: "Model" }),
                  /* @__PURE__ */ n(q, { placeholder: "Mercedes E-Class", value: b.model, onChange: (O) => w({ ...b, model: O.target.value }), className: oe })
                ] }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n(X, { className: L, children: "License Plate" }),
                  /* @__PURE__ */ n(q, { placeholder: "1-ABC-123", value: b.plate, onChange: (O) => w({ ...b, plate: O.target.value }), className: oe })
                ] }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n(X, { className: L, children: "Year" }),
                  /* @__PURE__ */ n(q, { placeholder: "2022", value: b.year, onChange: (O) => w({ ...b, year: O.target.value }), className: oe })
                ] }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n(X, { className: L, children: "Car Type *" }),
                  /* @__PURE__ */ s(Zn, { value: b.class, onValueChange: (O) => w({ ...b, class: O }), children: [
                    /* @__PURE__ */ n(ta, { className: oe, children: /* @__PURE__ */ n(ea, { placeholder: "Select car type" }) }),
                    /* @__PURE__ */ s(ra, { children: [
                      /* @__PURE__ */ n(nr, { value: "Standard", children: /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
                        /* @__PURE__ */ n(_e, { className: "w-4 h-4" }),
                        A.standard
                      ] }) }),
                      /* @__PURE__ */ n(nr, { value: "Van", children: /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
                        /* @__PURE__ */ n(_e, { className: "w-4 h-4" }),
                        A.van
                      ] }) }),
                      /* @__PURE__ */ n(nr, { value: "Luxury", children: /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
                        /* @__PURE__ */ n(_e, { className: "w-4 h-4" }),
                        A.luxury
                      ] }) })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ s(W, { onClick: I, className: "w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900", children: [
                  /* @__PURE__ */ n(Ea, { className: "w-4 h-4 mr-2" }),
                  "Add Car"
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ s(gr, { open: l, onOpenChange: u, children: [
            /* @__PURE__ */ n(In, { asChild: !0, children: /* @__PURE__ */ n(ue, { className: `${ge} border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer`, children: /* @__PURE__ */ s("div", { className: "p-6 flex flex-col items-center justify-center text-center", children: [
              /* @__PURE__ */ n("div", { className: "w-14 h-14 bg-purple-100 dark:bg-purple-400/20 rounded-full flex items-center justify-center mb-3", children: /* @__PURE__ */ n(uc, { className: "w-7 h-7 text-purple-600 dark:text-purple-400" }) }),
              /* @__PURE__ */ n("h3", { className: `font-bold text-base ${L}`, children: A.setPricing })
            ] }) }) }),
            /* @__PURE__ */ s(vr, { className: `max-w-2xl ${a ? "bg-slate-800 text-white" : ""}`, children: [
              /* @__PURE__ */ s(br, { children: [
                /* @__PURE__ */ n(yr, { className: L, children: A.setPricing }),
                /* @__PURE__ */ n(zn, { className: G, children: "Configure pricing for all vehicle types" })
              ] }),
              /* @__PURE__ */ s("div", { className: "space-y-4", children: [
                /* @__PURE__ */ s("div", { className: `p-4 border rounded-lg ${a ? "bg-slate-700" : "bg-gray-50"}`, children: [
                  /* @__PURE__ */ n("h3", { className: `font-bold mb-3 ${L}`, children: "Standard" }),
                  /* @__PURE__ */ s("div", { className: "grid grid-cols-3 gap-3", children: [
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ n(X, { className: L, children: "Start" }),
                      /* @__PURE__ */ n(q, { type: "number", value: N.standardStart, onChange: (O) => T({ ...N, standardStart: O.target.value }), className: oe })
                    ] }),
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ n(X, { className: L, children: "Per Km" }),
                      /* @__PURE__ */ n(q, { type: "number", value: N.standardPerKm, onChange: (O) => T({ ...N, standardPerKm: O.target.value }), className: oe })
                    ] }),
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ n(X, { className: L, children: "Initial Km" }),
                      /* @__PURE__ */ n(q, { type: "number", value: N.standardInitialKm, onChange: (O) => T({ ...N, standardInitialKm: O.target.value }), className: oe })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ s("div", { className: `p-4 border rounded-lg ${a ? "bg-slate-700" : "bg-gray-50"}`, children: [
                  /* @__PURE__ */ n("h3", { className: `font-bold mb-3 ${L}`, children: "Van" }),
                  /* @__PURE__ */ s("div", { className: "grid grid-cols-3 gap-3", children: [
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ n(X, { className: L, children: "Start" }),
                      /* @__PURE__ */ n(q, { type: "number", value: N.vanStart, onChange: (O) => T({ ...N, vanStart: O.target.value }), className: oe })
                    ] }),
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ n(X, { className: L, children: "Per Km" }),
                      /* @__PURE__ */ n(q, { type: "number", value: N.vanPerKm, onChange: (O) => T({ ...N, vanPerKm: O.target.value }), className: oe })
                    ] }),
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ n(X, { className: L, children: "Initial Km" }),
                      /* @__PURE__ */ n(q, { type: "number", value: N.vanInitialKm, onChange: (O) => T({ ...N, vanInitialKm: O.target.value }), className: oe })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ s("div", { className: `p-4 border rounded-lg ${a ? "bg-slate-700" : "bg-gray-50"}`, children: [
                  /* @__PURE__ */ n("h3", { className: `font-bold mb-3 ${L}`, children: "Luxury" }),
                  /* @__PURE__ */ s("div", { className: "grid grid-cols-3 gap-3", children: [
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ n(X, { className: L, children: "Start" }),
                      /* @__PURE__ */ n(q, { type: "number", value: N.luxuryStart, onChange: (O) => T({ ...N, luxuryStart: O.target.value }), className: oe })
                    ] }),
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ n(X, { className: L, children: "Per Km" }),
                      /* @__PURE__ */ n(q, { type: "number", value: N.luxuryPerKm, onChange: (O) => T({ ...N, luxuryPerKm: O.target.value }), className: oe })
                    ] }),
                    /* @__PURE__ */ s("div", { children: [
                      /* @__PURE__ */ n(X, { className: L, children: "Initial Km" }),
                      /* @__PURE__ */ n(q, { type: "number", value: N.luxuryInitialKm, onChange: (O) => T({ ...N, luxuryInitialKm: O.target.value }), className: oe })
                    ] })
                  ] })
                ] }),
                /* @__PURE__ */ n(W, { onClick: Y, className: "w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900", children: "Save Pricing" })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ n(Ve, { to: `/customize/${e}`, children: /* @__PURE__ */ n(ue, { className: `${ge} border-0 shadow-lg hover:shadow-xl transition-all h-full cursor-pointer`, children: /* @__PURE__ */ s("div", { className: "p-6 flex flex-col items-center justify-center text-center", children: [
            /* @__PURE__ */ n("div", { className: "w-14 h-14 bg-yellow-100 dark:bg-yellow-400/20 rounded-full flex items-center justify-center mb-3", children: /* @__PURE__ */ n(hc, { className: "w-7 h-7 text-yellow-600 dark:text-yellow-400" }) }),
            /* @__PURE__ */ n("h3", { className: `font-bold text-base ${L}`, children: A.customizePage })
          ] }) }) }),
          /* @__PURE__ */ s(gr, { open: c, onOpenChange: d, children: [
            /* @__PURE__ */ n(In, { asChild: !0, children: /* @__PURE__ */ n(ue, { className: `${ge} border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer`, children: /* @__PURE__ */ s("div", { className: "p-6 flex flex-col items-center justify-center text-center", children: [
              /* @__PURE__ */ n("div", { className: "w-14 h-14 bg-green-100 dark:bg-green-400/20 rounded-full flex items-center justify-center mb-3", children: /* @__PURE__ */ n(Ls, { className: "w-7 h-7 text-green-600 dark:text-green-400" }) }),
              /* @__PURE__ */ n("h3", { className: `font-bold text-base ${L}`, children: A.essentialInfo })
            ] }) }) }),
            /* @__PURE__ */ s(vr, { className: `max-w-2xl ${a ? "bg-slate-800 text-white" : ""}`, children: [
              /* @__PURE__ */ n(br, { children: /* @__PURE__ */ n(yr, { className: L, children: A.essentialInfo }) }),
              /* @__PURE__ */ s("div", { className: "space-y-4", children: [
                /* @__PURE__ */ s("div", { className: "grid grid-cols-2 gap-4", children: [
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ n(X, { className: L, children: A.companyName }),
                    /* @__PURE__ */ n(q, { value: E.name, onChange: (O) => S({ ...E, name: O.target.value }), className: oe })
                  ] }),
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ n(X, { className: L, children: A.slogan }),
                    /* @__PURE__ */ n(q, { value: E.slogan, onChange: (O) => S({ ...E, slogan: O.target.value }), className: oe })
                  ] }),
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ n(X, { className: L, children: A.btwNumber }),
                    /* @__PURE__ */ n(q, { value: E.btw, onChange: (O) => S({ ...E, btw: O.target.value }), className: oe })
                  ] }),
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ n(X, { className: L, children: A.phoneNumber }),
                    /* @__PURE__ */ n(q, { value: E.phone, onChange: (O) => S({ ...E, phone: O.target.value }), className: oe })
                  ] }),
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ n(X, { className: L, children: A.emailAddress }),
                    /* @__PURE__ */ n(q, { value: E.email, onChange: (O) => S({ ...E, email: O.target.value }), type: "email", className: oe })
                  ] }),
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ n(X, { className: L, children: A.city }),
                    /* @__PURE__ */ n(q, { value: E.city, onChange: (O) => S({ ...E, city: O.target.value }), className: oe })
                  ] })
                ] }),
                /* @__PURE__ */ s(W, { onClick: D, className: "w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900", children: [
                  /* @__PURE__ */ n(Ba, { className: "w-4 h-4 mr-2" }),
                  A.saveChanges
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ n(ue, { className: `${ge} border-0 shadow-lg`, children: /* @__PURE__ */ s("div", { className: "p-6", children: [
            /* @__PURE__ */ s("div", { className: "flex items-center gap-2 mb-4", children: [
              /* @__PURE__ */ n(Sr, { className: "w-5 h-5 text-blue-600 dark:text-blue-400" }),
              /* @__PURE__ */ n("h3", { className: `font-bold text-base ${L}`, children: A.yourBookingPage })
            ] }),
            /* @__PURE__ */ s("div", { className: "space-y-2", children: [
              /* @__PURE__ */ s(W, { onClick: () => window.open(`/book/${E.subdomain}`, "_blank"), size: "sm", className: "w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900", children: [
                /* @__PURE__ */ n(Sr, { className: "w-4 h-4 mr-2" }),
                A.viewLive
              ] }),
              /* @__PURE__ */ s(W, { onClick: () => t(`/qr-codes/${E.subdomain}`), size: "sm", variant: "outline", className: `w-full ${a ? "border-slate-600 text-white" : ""}`, children: [
                /* @__PURE__ */ n(Fr, { className: "w-4 h-4 mr-2" }),
                A.shareQR
              ] })
            ] })
          ] }) }),
          /* @__PURE__ */ s(gr, { open: h, onOpenChange: m, children: [
            /* @__PURE__ */ n(In, { asChild: !0, children: /* @__PURE__ */ n(ue, { className: `${ge} border-0 shadow-lg hover:shadow-xl transition-all cursor-pointer`, children: /* @__PURE__ */ s("div", { className: "p-6 flex flex-col items-center justify-center text-center", children: [
              /* @__PURE__ */ n("div", { className: "w-14 h-14 bg-orange-100 dark:bg-orange-400/20 rounded-full flex items-center justify-center mb-3", children: /* @__PURE__ */ n(_e, { className: "w-7 h-7 text-orange-600 dark:text-orange-400" }) }),
              /* @__PURE__ */ n("h3", { className: `font-bold text-base ${L}`, children: A.carTypesOffered })
            ] }) }) }),
            /* @__PURE__ */ s(vr, { className: a ? "bg-slate-800 text-white" : "", children: [
              /* @__PURE__ */ n(br, { children: /* @__PURE__ */ n(yr, { className: L, children: A.carTypesOffered }) }),
              /* @__PURE__ */ s("div", { className: "space-y-4", children: [
                /* @__PURE__ */ n("div", { className: "grid grid-cols-3 gap-3", children: ["standard", "van", "luxury"].map((O) => /* @__PURE__ */ s(
                  "button",
                  {
                    onClick: () => J(O),
                    className: `p-4 rounded-lg border-2 transition-all ${E.carTypes.includes(O) ? "bg-yellow-400 border-yellow-400 text-slate-900" : a ? "bg-slate-700 border-slate-600 text-white hover:border-yellow-400" : "bg-white border-gray-300 text-gray-900 hover:border-yellow-400"}`,
                    children: [
                      /* @__PURE__ */ n(_e, { className: "w-6 h-6 mx-auto mb-2" }),
                      /* @__PURE__ */ n("p", { className: "text-sm font-bold capitalize", children: O === "standard" ? A.standard : O === "van" ? A.van : A.luxury })
                    ]
                  },
                  O
                )) }),
                /* @__PURE__ */ s(W, { onClick: D, className: "w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900", children: [
                  /* @__PURE__ */ n(Ba, { className: "w-4 h-4 mr-2" }),
                  A.saveChanges
                ] })
              ] })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ n(ht, { value: "cars", children: /* @__PURE__ */ s(ue, { className: `${ge} border-0 shadow-lg`, children: [
          /* @__PURE__ */ s(ze, { children: [
            /* @__PURE__ */ n(je, { className: L, children: "Registered Cars" }),
            /* @__PURE__ */ n(Xe, { className: G, children: "All vehicles with their types" })
          ] }),
          /* @__PURE__ */ n(Ee, { children: /* @__PURE__ */ s("div", { className: "space-y-3", children: [
            dx.map((O) => /* @__PURE__ */ s("div", { className: `p-4 rounded-lg border ${ne} flex items-center justify-between`, children: [
              /* @__PURE__ */ s("div", { className: "flex items-center gap-4", children: [
                /* @__PURE__ */ n("div", { className: "w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-400/20 flex items-center justify-center", children: /* @__PURE__ */ n(_e, { className: "w-6 h-6 text-blue-600 dark:text-blue-400" }) }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n("h4", { className: `font-bold ${L}`, children: O.model }),
                  /* @__PURE__ */ s("div", { className: "flex gap-4 text-sm", children: [
                    /* @__PURE__ */ s("span", { className: G, children: [
                      "Plate: ",
                      O.plate
                    ] }),
                    /* @__PURE__ */ s("span", { className: G, children: [
                      "Year: ",
                      O.year
                    ] }),
                    /* @__PURE__ */ s("span", { className: G, children: [
                      "Driver: ",
                      O.driver
                    ] }),
                    /* @__PURE__ */ n(it, { className: "bg-yellow-400 text-slate-900", children: "Standard" })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ s(W, { size: "sm", variant: "outline", onClick: () => o(!0), children: [
                /* @__PURE__ */ n(mr, { className: "w-4 h-4 mr-1" }),
                "Edit"
              ] })
            ] }, O.id)),
            /* @__PURE__ */ s(W, { onClick: () => o(!0), className: "w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900", children: [
              /* @__PURE__ */ n(Ea, { className: "w-4 h-4 mr-2" }),
              "Add New Car"
            ] })
          ] }) })
        ] }) }),
        /* @__PURE__ */ n(ht, { value: "pricing", children: /* @__PURE__ */ s(ue, { className: `${ge} border-0 shadow-lg`, children: [
          /* @__PURE__ */ s(ze, { children: [
            /* @__PURE__ */ n(je, { className: L, children: "Pricing Configuration" }),
            /* @__PURE__ */ n(Xe, { className: G, children: "All pricing set for vehicle types" })
          ] }),
          /* @__PURE__ */ n(Ee, { children: /* @__PURE__ */ s("div", { className: "space-y-3", children: [
            /* @__PURE__ */ s("div", { className: `p-4 rounded-lg border ${ne} flex items-center justify-between`, children: [
              /* @__PURE__ */ s("div", { className: "flex items-center gap-4", children: [
                /* @__PURE__ */ n("div", { className: "w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-400/20 flex items-center justify-center", children: /* @__PURE__ */ n(_e, { className: "w-6 h-6 text-purple-600 dark:text-purple-400" }) }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n("h4", { className: `font-bold ${L}`, children: "Standard Vehicle" }),
                  /* @__PURE__ */ s("div", { className: "flex gap-4 text-sm", children: [
                    /* @__PURE__ */ s("span", { className: G, children: [
                      "Start: €",
                      N.standardStart
                    ] }),
                    /* @__PURE__ */ s("span", { className: G, children: [
                      "Per Km: €",
                      N.standardPerKm
                    ] }),
                    /* @__PURE__ */ s("span", { className: G, children: [
                      "Initial: ",
                      N.standardInitialKm,
                      " km"
                    ] })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ s(W, { size: "sm", variant: "outline", onClick: () => u(!0), children: [
                /* @__PURE__ */ n(mr, { className: "w-4 h-4 mr-1" }),
                "Edit"
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: `p-4 rounded-lg border ${ne} flex items-center justify-between`, children: [
              /* @__PURE__ */ s("div", { className: "flex items-center gap-4", children: [
                /* @__PURE__ */ n("div", { className: "w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-400/20 flex items-center justify-center", children: /* @__PURE__ */ n(_e, { className: "w-6 h-6 text-purple-600 dark:text-purple-400" }) }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n("h4", { className: `font-bold ${L}`, children: "Van" }),
                  /* @__PURE__ */ s("div", { className: "flex gap-4 text-sm", children: [
                    /* @__PURE__ */ s("span", { className: G, children: [
                      "Start: €",
                      N.vanStart
                    ] }),
                    /* @__PURE__ */ s("span", { className: G, children: [
                      "Per Km: €",
                      N.vanPerKm
                    ] }),
                    /* @__PURE__ */ s("span", { className: G, children: [
                      "Initial: ",
                      N.vanInitialKm,
                      " km"
                    ] })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ s(W, { size: "sm", variant: "outline", onClick: () => u(!0), children: [
                /* @__PURE__ */ n(mr, { className: "w-4 h-4 mr-1" }),
                "Edit"
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: `p-4 rounded-lg border ${ne} flex items-center justify-between`, children: [
              /* @__PURE__ */ s("div", { className: "flex items-center gap-4", children: [
                /* @__PURE__ */ n("div", { className: "w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-400/20 flex items-center justify-center", children: /* @__PURE__ */ n(_e, { className: "w-6 h-6 text-purple-600 dark:text-purple-400" }) }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n("h4", { className: `font-bold ${L}`, children: "Luxury Vehicle" }),
                  /* @__PURE__ */ s("div", { className: "flex gap-4 text-sm", children: [
                    /* @__PURE__ */ s("span", { className: G, children: [
                      "Start: €",
                      N.luxuryStart
                    ] }),
                    /* @__PURE__ */ s("span", { className: G, children: [
                      "Per Km: €",
                      N.luxuryPerKm
                    ] }),
                    /* @__PURE__ */ s("span", { className: G, children: [
                      "Initial: ",
                      N.luxuryInitialKm,
                      " km"
                    ] })
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ s(W, { size: "sm", variant: "outline", onClick: () => u(!0), children: [
                /* @__PURE__ */ n(mr, { className: "w-4 h-4 mr-1" }),
                "Edit"
              ] })
            ] })
          ] }) })
        ] }) }),
        /* @__PURE__ */ n(ht, { value: "info", children: /* @__PURE__ */ s(ue, { className: `${ge} border-0 shadow-lg`, children: [
          /* @__PURE__ */ s(ze, { children: [
            /* @__PURE__ */ n(je, { className: L, children: "Company Information" }),
            /* @__PURE__ */ n(Xe, { className: G, children: "All essential business details" })
          ] }),
          /* @__PURE__ */ n(Ee, { children: /* @__PURE__ */ s("div", { className: "space-y-3", children: [
            /* @__PURE__ */ s("div", { className: `p-4 rounded-lg border ${ne} flex items-center justify-between`, children: [
              /* @__PURE__ */ s("div", { className: "flex items-center gap-4", children: [
                /* @__PURE__ */ n("div", { className: "w-12 h-12 rounded-lg bg-green-100 dark:bg-green-400/20 flex items-center justify-center", children: /* @__PURE__ */ n(Ls, { className: "w-6 h-6 text-green-600 dark:text-green-400" }) }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n("p", { className: `text-xs ${G} mb-1`, children: A.companyName }),
                  /* @__PURE__ */ n("h4", { className: `font-bold ${L}`, children: E.name })
                ] })
              ] }),
              /* @__PURE__ */ s(W, { size: "sm", variant: "outline", onClick: () => d(!0), children: [
                /* @__PURE__ */ n(mr, { className: "w-4 h-4 mr-1" }),
                "Edit"
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: `p-4 rounded-lg border ${ne} flex items-center justify-between`, children: [
              /* @__PURE__ */ s("div", { className: "flex-1", children: [
                /* @__PURE__ */ n("p", { className: `text-xs ${G} mb-1`, children: A.slogan }),
                /* @__PURE__ */ n("h4", { className: `font-bold ${L}`, children: E.slogan })
              ] }),
              /* @__PURE__ */ s(W, { size: "sm", variant: "outline", onClick: () => d(!0), children: [
                /* @__PURE__ */ n(mr, { className: "w-4 h-4 mr-1" }),
                "Edit"
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: "grid grid-cols-1 md:grid-cols-3 gap-3", children: [
              /* @__PURE__ */ s("div", { className: `p-4 rounded-lg border ${ne}`, children: [
                /* @__PURE__ */ n("p", { className: `text-xs ${G} mb-1`, children: A.phoneNumber }),
                /* @__PURE__ */ n("h4", { className: `font-bold ${L}`, children: E.phone })
              ] }),
              /* @__PURE__ */ s("div", { className: `p-4 rounded-lg border ${ne}`, children: [
                /* @__PURE__ */ n("p", { className: `text-xs ${G} mb-1`, children: A.emailAddress }),
                /* @__PURE__ */ n("h4", { className: `font-bold ${L}`, children: E.email })
              ] }),
              /* @__PURE__ */ s("div", { className: `p-4 rounded-lg border ${ne}`, children: [
                /* @__PURE__ */ n("p", { className: `text-xs ${G} mb-1`, children: A.city }),
                /* @__PURE__ */ n("h4", { className: `font-bold ${L}`, children: E.city })
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: `p-4 rounded-lg border ${ne} flex items-center justify-between`, children: [
              /* @__PURE__ */ s("div", { className: "flex-1", children: [
                /* @__PURE__ */ n("p", { className: `text-xs ${G} mb-1`, children: A.btwNumber }),
                /* @__PURE__ */ n("h4", { className: `font-bold ${L}`, children: E.btw })
              ] }),
              /* @__PURE__ */ s(W, { size: "sm", variant: "outline", onClick: () => d(!0), children: [
                /* @__PURE__ */ n(mr, { className: "w-4 h-4 mr-1" }),
                "Edit"
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: `p-4 rounded-lg border ${ne} flex items-center justify-between`, children: [
              /* @__PURE__ */ s("div", { className: "flex-1", children: [
                /* @__PURE__ */ n("p", { className: `text-xs ${G} mb-2`, children: A.carTypesOffered }),
                /* @__PURE__ */ n("div", { className: "flex gap-2", children: E.carTypes.map((O) => /* @__PURE__ */ n(it, { className: "bg-yellow-400 text-slate-900 hover:bg-yellow-500", children: O === "standard" ? A.standard : O === "van" ? A.van : A.luxury }, O)) })
              ] }),
              /* @__PURE__ */ s(W, { size: "sm", variant: "outline", onClick: () => m(!0), children: [
                /* @__PURE__ */ n(mr, { className: "w-4 h-4 mr-1" }),
                "Edit"
              ] })
            ] })
          ] }) })
        ] }) }),
        /* @__PURE__ */ n(ht, { value: "drivers", children: /* @__PURE__ */ s(ue, { className: `${ge} border-0 shadow-lg`, children: [
          /* @__PURE__ */ s(ze, { children: [
            /* @__PURE__ */ n(je, { className: L, children: "Drivers" }),
            /* @__PURE__ */ n(Xe, { className: G, children: "Manage all drivers" })
          ] }),
          /* @__PURE__ */ s(Ee, { children: [
            /* @__PURE__ */ n("div", { className: "overflow-x-auto", children: /* @__PURE__ */ s(jn, { children: [
              /* @__PURE__ */ n(Wn, { children: /* @__PURE__ */ s(zt, { children: [
                /* @__PURE__ */ n(Ie, { className: L, children: "Name" }),
                /* @__PURE__ */ n(Ie, { className: L, children: "Phone" }),
                /* @__PURE__ */ n(Ie, { className: L, children: "Email" }),
                /* @__PURE__ */ n(Ie, { className: L, children: "Status" }),
                /* @__PURE__ */ n(Ie, { className: L, children: "Availability" }),
                /* @__PURE__ */ n(Ie, { className: L, children: "Actions" })
              ] }) }),
              /* @__PURE__ */ n(Un, { children: _.map((O) => /* @__PURE__ */ s(zt, { children: [
                /* @__PURE__ */ n(Te, { className: `font-medium ${L}`, children: O.name }),
                /* @__PURE__ */ n(Te, { className: L, children: O.phone }),
                /* @__PURE__ */ n(Te, { className: L, children: O.email }),
                /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ n(it, { variant: "default", children: O.status }) }),
                /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ n(it, { variant: O.available ? "default" : "secondary", className: O.available ? "bg-green-500 hover:bg-green-600" : "bg-gray-400 hover:bg-gray-500", children: O.available ? "Online" : "Offline" }) }),
                /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ n(W, { size: "sm", variant: "outline", onClick: () => be(O.id), children: O.available ? "Set Offline" : "Set Online" }) })
              ] }, O.id)) })
            ] }) }),
            /* @__PURE__ */ s(gr, { open: f, onOpenChange: g, children: [
              /* @__PURE__ */ n(In, { asChild: !0, children: /* @__PURE__ */ s(W, { className: "w-full mt-4 bg-yellow-400 hover:bg-yellow-500 text-slate-900", children: [
                /* @__PURE__ */ n(Ea, { className: "w-4 h-4 mr-2" }),
                "Add New Driver"
              ] }) }),
              /* @__PURE__ */ s(vr, { className: a ? "bg-slate-800 text-white" : "", children: [
                /* @__PURE__ */ s(br, { children: [
                  /* @__PURE__ */ n(yr, { className: L, children: "Add New Driver" }),
                  /* @__PURE__ */ n(zn, { className: G, children: "Enter driver details and upload license document" })
                ] }),
                /* @__PURE__ */ s("div", { className: "space-y-4", children: [
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ n(X, { className: L, children: "Driver Name *" }),
                    /* @__PURE__ */ n(
                      q,
                      {
                        placeholder: "John Doe",
                        value: y.name,
                        onChange: (O) => k({ ...y, name: O.target.value }),
                        className: oe
                      }
                    )
                  ] }),
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ n(X, { className: L, children: "Phone Number *" }),
                    /* @__PURE__ */ n(
                      q,
                      {
                        placeholder: "+32 470 123 456",
                        value: y.phone,
                        onChange: (O) => k({ ...y, phone: O.target.value }),
                        className: oe
                      }
                    )
                  ] }),
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ n(X, { className: L, children: "Email Address *" }),
                    /* @__PURE__ */ n(
                      q,
                      {
                        type: "email",
                        placeholder: "driver@example.com",
                        value: y.email,
                        onChange: (O) => k({ ...y, email: O.target.value }),
                        className: oe
                      }
                    )
                  ] }),
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ n(X, { className: L, children: "Driver License Document" }),
                    /* @__PURE__ */ s("div", { className: `border-2 border-dashed rounded-lg p-6 text-center ${a ? "border-slate-600" : "border-gray-300"}`, children: [
                      /* @__PURE__ */ n(Fa, { className: `w-8 h-8 mx-auto mb-2 ${G}` }),
                      /* @__PURE__ */ n(
                        "input",
                        {
                          type: "file",
                          onChange: pe,
                          accept: ".pdf,.jpg,.jpeg,.png",
                          className: "hidden",
                          id: "license-upload"
                        }
                      ),
                      /* @__PURE__ */ s("label", { htmlFor: "license-upload", className: "cursor-pointer", children: [
                        /* @__PURE__ */ n("span", { className: `text-sm ${a ? "text-yellow-400" : "text-blue-600"} font-semibold hover:underline`, children: "Click to upload" }),
                        /* @__PURE__ */ n("span", { className: `text-sm ${G}`, children: " or drag and drop" })
                      ] }),
                      /* @__PURE__ */ n("p", { className: `text-xs mt-1 ${G}`, children: "PDF, PNG, JPG up to 10MB" }),
                      y.licenseDoc && /* @__PURE__ */ s(it, { className: "mt-2 bg-green-500 text-white", children: [
                        "✓ ",
                        y.licenseDoc.name
                      ] })
                    ] })
                  ] }),
                  /* @__PURE__ */ s(W, { onClick: re, className: "w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900", children: [
                    /* @__PURE__ */ n(Xn, { className: "w-4 h-4 mr-2" }),
                    "Add Driver"
                  ] })
                ] })
              ] })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ n(ht, { value: "requests", children: /* @__PURE__ */ s(ue, { className: `${ge} border-0 shadow-lg`, children: [
          /* @__PURE__ */ s(ze, { children: [
            /* @__PURE__ */ n(je, { className: L, children: "Ride Requests" }),
            /* @__PURE__ */ n(Xe, { className: G, children: "View and respond to requests" })
          ] }),
          /* @__PURE__ */ s(Ee, { children: [
            /* @__PURE__ */ s("div", { className: "flex items-center gap-4 mb-4", children: [
              /* @__PURE__ */ n(
                q,
                {
                  placeholder: "Search by location, contact, or date",
                  value: p,
                  onChange: (O) => v(O.target.value),
                  className: oe
                }
              ),
              /* @__PURE__ */ s(W, { size: "sm", variant: "outline", onClick: Ne, children: [
                /* @__PURE__ */ n(qn, { className: "w-4 h-4 mr-1" }),
                "Export to Excel"
              ] })
            ] }),
            /* @__PURE__ */ s(jn, { children: [
              /* @__PURE__ */ n(Wn, { children: /* @__PURE__ */ s(zt, { children: [
                /* @__PURE__ */ n(Ie, { className: L, children: "Passenger" }),
                /* @__PURE__ */ n(Ie, { className: L, children: "From" }),
                /* @__PURE__ */ n(Ie, { className: L, children: "To" }),
                /* @__PURE__ */ n(Ie, { className: L, children: "Date & Time" }),
                /* @__PURE__ */ n(Ie, { className: L, children: "Actions" })
              ] }) }),
              /* @__PURE__ */ n(Un, { children: Me.map((O) => /* @__PURE__ */ s(zt, { children: [
                /* @__PURE__ */ n(Te, { className: `font-medium ${L}`, children: O.name }),
                /* @__PURE__ */ n(Te, { className: L, children: O.from }),
                /* @__PURE__ */ n(Te, { className: L, children: O.to }),
                /* @__PURE__ */ s(Te, { className: L, children: [
                  O.date,
                  " at ",
                  O.time
                ] }),
                /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ s("div", { className: "flex gap-2", children: [
                  /* @__PURE__ */ s(W, { size: "sm", variant: "outline", onClick: () => we(), children: [
                    /* @__PURE__ */ n(no, { className: "w-4 h-4 mr-1" }),
                    "WhatsApp"
                  ] }),
                  /* @__PURE__ */ s(W, { size: "sm", variant: "outline", onClick: () => he(O), children: [
                    /* @__PURE__ */ n(Er, { className: "w-4 h-4 mr-1" }),
                    "Email"
                  ] })
                ] }) })
              ] }, O.id)) })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ n(ht, { value: "license", children: /* @__PURE__ */ s(ue, { className: `${ge} border-0 shadow-lg`, children: [
          /* @__PURE__ */ s(ze, { children: [
            /* @__PURE__ */ n(je, { className: L, children: "License & Subscription Plan" }),
            /* @__PURE__ */ n(Xe, { className: G, children: "Manage your TAXIO subscription" })
          ] }),
          /* @__PURE__ */ n(Ee, { children: /* @__PURE__ */ s("div", { className: "space-y-6", children: [
            /* @__PURE__ */ s("div", { className: `p-6 rounded-lg border-2 border-yellow-400 ${a ? "bg-slate-700" : "bg-yellow-50"}`, children: [
              /* @__PURE__ */ s("div", { className: "flex items-center justify-between mb-4", children: [
                /* @__PURE__ */ s("div", { className: "flex items-center gap-3", children: [
                  /* @__PURE__ */ n("div", { className: "w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center", children: /* @__PURE__ */ n(Mp, { className: "w-6 h-6 text-slate-900" }) }),
                  /* @__PURE__ */ s("div", { children: [
                    /* @__PURE__ */ n("h3", { className: `font-bold text-lg ${L}`, children: "Professional Plan" }),
                    /* @__PURE__ */ n("p", { className: `text-sm ${G}`, children: "Active subscription" })
                  ] })
                ] }),
                /* @__PURE__ */ n(it, { className: "bg-green-500 text-white hover:bg-green-600", children: "Active" })
              ] }),
              /* @__PURE__ */ s("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: [
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n("p", { className: `text-xs ${G}`, children: "Monthly Cost" }),
                  /* @__PURE__ */ n("p", { className: `font-bold ${L}`, children: "€29.99" })
                ] }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n("p", { className: `text-xs ${G}`, children: "Next Billing" }),
                  /* @__PURE__ */ n("p", { className: `font-bold ${L}`, children: "Mar 26, 2026" })
                ] }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n("p", { className: `text-xs ${G}`, children: "Commission" }),
                  /* @__PURE__ */ n("p", { className: "font-bold text-green-500", children: "0% Forever" })
                ] }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n("p", { className: `text-xs ${G}`, children: "Status" }),
                  /* @__PURE__ */ n("p", { className: "font-bold text-green-500", children: "✓ Paid" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ n("h4", { className: `font-bold mb-3 ${L}`, children: "Your Plan Includes:" }),
              /* @__PURE__ */ n("div", { className: "grid grid-cols-1 md:grid-cols-2 gap-3", children: [
                "Unlimited ride bookings",
                "Custom branded website",
                "QR code generation",
                "Driver management",
                "Pricing control",
                "24/7 support access",
                "Analytics dashboard",
                "Mobile-optimized pages"
              ].map((O, We) => /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
                /* @__PURE__ */ n(Ba, { className: "w-5 h-5 text-green-500" }),
                /* @__PURE__ */ n("span", { className: L, children: O })
              ] }, We)) })
            ] }),
            /* @__PURE__ */ s("div", { className: `p-4 rounded-lg border ${ne}`, children: [
              /* @__PURE__ */ n("h4", { className: `font-bold mb-3 ${L}`, children: "This Month's Activity" }),
              /* @__PURE__ */ s("div", { className: "grid grid-cols-3 gap-4", children: [
                /* @__PURE__ */ s("div", { className: "text-center", children: [
                  /* @__PURE__ */ n("p", { className: `text-2xl font-bold ${L}`, children: "47" }),
                  /* @__PURE__ */ n("p", { className: `text-xs ${G}`, children: "Total Bookings" })
                ] }),
                /* @__PURE__ */ s("div", { className: "text-center", children: [
                  /* @__PURE__ */ n("p", { className: `text-2xl font-bold ${L}`, children: "€2,340" }),
                  /* @__PURE__ */ n("p", { className: `text-xs ${G}`, children: "Revenue (100% yours)" })
                ] }),
                /* @__PURE__ */ s("div", { className: "text-center", children: [
                  /* @__PURE__ */ n("p", { className: "text-2xl font-bold text-yellow-500", children: "€29.99" }),
                  /* @__PURE__ */ n("p", { className: `text-xs ${G}`, children: "Platform Cost" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: "flex gap-3", children: [
              /* @__PURE__ */ s(
                W,
                {
                  className: "flex-1 bg-yellow-400 hover:bg-yellow-500 text-slate-900",
                  onClick: () => de.info("Payment portal opening..."),
                  children: [
                    /* @__PURE__ */ n(Va, { className: "w-4 h-4 mr-2" }),
                    "Manage Billing"
                  ]
                }
              ),
              /* @__PURE__ */ s(
                W,
                {
                  variant: "outline",
                  className: "flex-1",
                  onClick: () => de.info("Downloading invoice..."),
                  children: [
                    /* @__PURE__ */ n(Ha, { className: "w-4 h-4 mr-2" }),
                    "Download Invoice"
                  ]
                }
              )
            ] }),
            /* @__PURE__ */ n("div", { className: `p-4 rounded-lg ${a ? "bg-slate-700" : "bg-blue-50"} border ${ne}`, children: /* @__PURE__ */ s("div", { className: "flex items-start gap-3", children: [
              /* @__PURE__ */ n(Np, { className: "w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n("h4", { className: `font-bold mb-1 ${L}`, children: "Need More Features?" }),
                /* @__PURE__ */ n("p", { className: `text-sm ${G} mb-3`, children: "Upgrade to Enterprise for advanced analytics, priority support, and custom integrations." }),
                /* @__PURE__ */ n(W, { size: "sm", variant: "outline", children: "View Enterprise Plan" })
              ] })
            ] }) })
          ] }) })
        ] }) })
      ] }),
      /* @__PURE__ */ s("div", { className: "text-center mt-8 space-y-1", children: [
        /* @__PURE__ */ s("p", { className: `text-xs ${G}`, children: [
          "© ",
          (/* @__PURE__ */ new Date()).getFullYear(),
          " TAXIO. All rights reserved."
        ] }),
        /* @__PURE__ */ n(
          "button",
          {
            onClick: () => t("/companies"),
            className: `text-xs font-semibold transition-colors ${a ? "text-yellow-400 hover:text-yellow-300" : "text-yellow-600 hover:text-yellow-700"}`,
            children: "Powered by TAXIO"
          }
        )
      ] })
    ] })
  ] });
}
function hx() {
  const { companySubdomain: e } = fn(), [t, r] = j({
    name: "",
    phone: "",
    from: "",
    to: "",
    date: "",
    time: "",
    passengers: "1",
    notes: ""
  }), a = (l) => {
    r({
      ...t,
      [l.target.name]: l.target.value
    });
  }, i = () => {
    const l = `Ride Request:
Name: ${t.name}
Phone: ${t.phone}
From: ${t.from}
To: ${t.to}
Date: ${t.date}
Time: ${t.time}
Passengers: ${t.passengers}
Notes: ${t.notes}`;
    de.success("WhatsApp message prepared!"), console.log("WhatsApp Message:", l);
  }, o = () => {
    de.success("Email sent successfully!"), console.log("Email Data:", t);
  };
  return /* @__PURE__ */ n("div", { className: "min-h-screen bg-gradient-to-br from-green-50 to-blue-100 py-12", children: /* @__PURE__ */ s("div", { className: "container mx-auto px-4", children: [
    /* @__PURE__ */ n(Ve, { to: "/", children: /* @__PURE__ */ s(W, { variant: "ghost", className: "mb-6", children: [
      /* @__PURE__ */ n(sr, { className: "w-4 h-4 mr-2" }),
      "Back to Home"
    ] }) }),
    /* @__PURE__ */ n("div", { className: "max-w-2xl mx-auto", children: /* @__PURE__ */ s(ue, { children: [
      /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ s("div", { className: "flex items-center mb-2", children: [
        /* @__PURE__ */ n("div", { className: "w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4", children: /* @__PURE__ */ n(_e, { className: "w-6 h-6 text-green-600" }) }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ n(je, { className: "text-2xl", children: "Request a Ride" }),
          /* @__PURE__ */ n(Xe, { children: e ? `Book with ${e.toUpperCase()} Taxi` : "Book your taxi ride" })
        ] })
      ] }) }),
      /* @__PURE__ */ n(Ee, { children: /* @__PURE__ */ s("div", { className: "space-y-6", children: [
        /* @__PURE__ */ s("div", { className: "space-y-4", children: [
          /* @__PURE__ */ n("h3", { className: "font-semibold text-lg", children: "Passenger Information" }),
          /* @__PURE__ */ s("div", { className: "space-y-2", children: [
            /* @__PURE__ */ n(X, { htmlFor: "name", children: "Full Name *" }),
            /* @__PURE__ */ n(
              q,
              {
                id: "name",
                name: "name",
                value: t.name,
                onChange: a,
                placeholder: "John Doe",
                required: !0
              }
            )
          ] }),
          /* @__PURE__ */ s("div", { className: "space-y-2", children: [
            /* @__PURE__ */ n(X, { htmlFor: "phone", children: "Phone Number *" }),
            /* @__PURE__ */ n(
              q,
              {
                id: "phone",
                name: "phone",
                type: "tel",
                value: t.phone,
                onChange: a,
                placeholder: "+32 123 456 789",
                required: !0
              }
            )
          ] }),
          /* @__PURE__ */ s("div", { className: "space-y-2", children: [
            /* @__PURE__ */ n(X, { htmlFor: "passengers", children: "Number of Passengers" }),
            /* @__PURE__ */ n(
              q,
              {
                id: "passengers",
                name: "passengers",
                type: "number",
                min: "1",
                max: "8",
                value: t.passengers,
                onChange: a
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: "space-y-4 pt-4 border-t", children: [
          /* @__PURE__ */ n("h3", { className: "font-semibold text-lg", children: "Trip Details" }),
          /* @__PURE__ */ s("div", { className: "space-y-2", children: [
            /* @__PURE__ */ s(X, { htmlFor: "from", className: "flex items-center", children: [
              /* @__PURE__ */ n(Pt, { className: "w-4 h-4 mr-2 text-green-600" }),
              "From Location *"
            ] }),
            /* @__PURE__ */ n(
              q,
              {
                id: "from",
                name: "from",
                value: t.from,
                onChange: a,
                placeholder: "Brussels Airport",
                required: !0
              }
            )
          ] }),
          /* @__PURE__ */ s("div", { className: "space-y-2", children: [
            /* @__PURE__ */ s(X, { htmlFor: "to", className: "flex items-center", children: [
              /* @__PURE__ */ n(Pt, { className: "w-4 h-4 mr-2 text-red-600" }),
              "To Location *"
            ] }),
            /* @__PURE__ */ n(
              q,
              {
                id: "to",
                name: "to",
                value: t.to,
                onChange: a,
                placeholder: "Brussels Central Station",
                required: !0
              }
            )
          ] }),
          /* @__PURE__ */ s("div", { className: "grid md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ s("div", { className: "space-y-2", children: [
              /* @__PURE__ */ s(X, { htmlFor: "date", className: "flex items-center", children: [
                /* @__PURE__ */ n(Ko, { className: "w-4 h-4 mr-2" }),
                "Date *"
              ] }),
              /* @__PURE__ */ n(
                q,
                {
                  id: "date",
                  name: "date",
                  type: "date",
                  value: t.date,
                  onChange: a,
                  required: !0
                }
              )
            ] }),
            /* @__PURE__ */ s("div", { className: "space-y-2", children: [
              /* @__PURE__ */ s(X, { htmlFor: "time", className: "flex items-center", children: [
                /* @__PURE__ */ n(Si, { className: "w-4 h-4 mr-2" }),
                "Time *"
              ] }),
              /* @__PURE__ */ n(
                q,
                {
                  id: "time",
                  name: "time",
                  type: "time",
                  value: t.time,
                  onChange: a,
                  required: !0
                }
              )
            ] })
          ] }),
          /* @__PURE__ */ s("div", { className: "space-y-2", children: [
            /* @__PURE__ */ n(X, { htmlFor: "notes", children: "Additional Notes" }),
            /* @__PURE__ */ n(
              "textarea",
              {
                id: "notes",
                name: "notes",
                value: t.notes,
                onChange: a,
                placeholder: "Any special requirements or instructions...",
                className: "w-full min-h-[80px] px-3 py-2 border rounded-md"
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: "p-4 bg-blue-50 rounded-lg border border-blue-200", children: [
          /* @__PURE__ */ n("h4", { className: "font-semibold mb-2", children: "Pricing Information" }),
          /* @__PURE__ */ s("p", { className: "text-sm text-gray-700", children: [
            "Start price (first 3 km): ",
            /* @__PURE__ */ n("strong", { children: "€15.00" })
          ] }),
          /* @__PURE__ */ s("p", { className: "text-sm text-gray-700", children: [
            "Price per km after: ",
            /* @__PURE__ */ n("strong", { children: "€2.50/km" })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: "flex gap-3 pt-4", children: [
          /* @__PURE__ */ s(
            W,
            {
              onClick: i,
              className: "flex-1",
              size: "lg",
              children: [
                /* @__PURE__ */ n(no, { className: "w-4 h-4 mr-2" }),
                "Submit via WhatsApp"
              ]
            }
          ),
          /* @__PURE__ */ s(
            W,
            {
              onClick: o,
              variant: "outline",
              className: "flex-1",
              size: "lg",
              children: [
                /* @__PURE__ */ n(Er, { className: "w-4 h-4 mr-2" }),
                "Submit via Email"
              ]
            }
          )
        ] })
      ] }) })
    ] }) })
  ] }) });
}
function fx() {
  const { companySubdomain: e } = fn(), { language: t, darkMode: r } = lr(), [a, i] = j({
    from: "",
    to: "",
    dateTime: "",
    carType: "standard",
    rideType: "now"
  }), [o, l] = j(!1), [u, c] = j(!1), h = {
    name: e ? e.charAt(0).toUpperCase() + e.slice(1) : "DemoCompany",
    slogan: "Your Ride, Your Way, Anytime!",
    btw: "BE 0123.456.789",
    phone: "+32 470 123 456",
    email: "contact@democompany.be",
    bookingUrl: `${window.location.origin}/book/${e || "democompany"}`,
    status: "available"
    // This will come from backend
  }, m = [
    { id: "standard", name: "Standard", icon: _e, base: 5, perKm: 2, seats: "1-4" },
    { id: "van", name: "Van", icon: Xn, base: 8, perKm: 3, seats: "1-7" },
    { id: "luxury", name: "Luxury", icon: Pi, base: 10, perKm: 4, seats: "1-3" }
  ], f = m.find((I) => I.id === a.carType), g = 15, p = 18, v = f ? f.base + g * f.perKm : 0, b = a.from.trim() !== "" && a.to.trim() !== "", w = a.to.trim() !== "", y = m.length > 1, N = {
    en: {
      bookRide: "Book Your Ride",
      pickup: "Pick-up Location",
      dropoff: "Drop-off Location",
      whenDoYouNeed: "When do you need the ride?",
      rideNow: "Ride Now",
      schedule: "Schedule",
      selectCar: "Select Car Type",
      tripEstimate: "Trip Estimate",
      basePrice: "Base",
      perKm: "per km",
      distance: "Distance",
      duration: "Duration",
      price: "Price",
      bookNow: "Book with WhatsApp",
      bookEmail: "Email",
      call: "Call",
      shareQR: "Share QR Code",
      downloadQR: "Download QR",
      printQR: "Print QR",
      scanToBook: "Scan to Book",
      mins: "mins",
      statusAvailable: "Available",
      statusBusy: "Busy",
      statusOffline: "Offline",
      acceptTerms: "I accept the terms and conditions",
      mustAcceptTerms: "Please accept the terms and conditions to proceed"
    },
    fr: {
      bookRide: "Réservez Votre Course",
      pickup: "Lieu de Départ",
      dropoff: "Lieu d'Arrivée",
      whenDoYouNeed: "Quand avez-vous besoin du trajet?",
      rideNow: "Maintenant",
      schedule: "Planifier",
      selectCar: "Type de Voiture",
      tripEstimate: "Estimation du Trajet",
      basePrice: "Base",
      perKm: "par km",
      distance: "Distance",
      duration: "Durée",
      price: "Prix",
      bookNow: "Réserver avec WhatsApp",
      bookEmail: "Email",
      call: "Appeler",
      shareQR: "Partager QR",
      downloadQR: "Télécharger QR",
      printQR: "Imprimer QR",
      scanToBook: "Scanner pour Réserver",
      mins: "mins",
      statusAvailable: "Disponible",
      statusBusy: "Occupé",
      statusOffline: "Hors ligne",
      acceptTerms: "J'accepte les termes et conditions",
      mustAcceptTerms: "Veuillez accepter les termes et conditions pour continuer"
    },
    nl: {
      bookRide: "Boek Uw Rit",
      pickup: "Ophaallocatie",
      dropoff: "Afleverlocatie",
      whenDoYouNeed: "Wanneer heeft u de rit nodig?",
      rideNow: "Nu Rijden",
      schedule: "Plannen",
      selectCar: "Type Auto",
      tripEstimate: "Ritschatting",
      basePrice: "Basis",
      perKm: "per km",
      distance: "Afstand",
      duration: "Duur",
      price: "Prijs",
      bookNow: "Boeken met WhatsApp",
      bookEmail: "Email",
      call: "Bellen",
      shareQR: "Deel QR",
      downloadQR: "Download QR",
      printQR: "Print QR",
      scanToBook: "Scan om te Boeken",
      mins: "min",
      statusAvailable: "Beschikbaar",
      statusBusy: "Bezet",
      statusOffline: "Offline",
      acceptTerms: "Ik accepteer de algemene voorwaarden",
      mustAcceptTerms: "Accepteer de algemene voorwaarden om door te gaan"
    }
  }[t], _ = ((I) => ({
    available: {
      color: "bg-green-500",
      ringColor: "ring-green-500/30",
      textColor: r ? "text-green-400" : "text-green-600",
      label: N.statusAvailable
    },
    busy: {
      color: "bg-red-500",
      ringColor: "ring-red-500/30",
      textColor: r ? "text-red-400" : "text-red-600",
      label: N.statusBusy
    },
    offline: {
      color: "bg-gray-500",
      ringColor: "ring-gray-500/30",
      textColor: r ? "text-gray-400" : "text-gray-600",
      label: N.statusOffline
    }
  })[I])(h.status), x = (I) => {
    if (!a.from || !a.to) {
      de.error("Please fill all fields");
      return;
    }
    if (a.rideType === "schedule" && !a.dateTime) {
      de.error("Please select date and time");
      return;
    }
    if (!u) {
      de.error(N.mustAcceptTerms);
      return;
    }
    const Y = a.rideType === "now" ? "ASAP (As soon as possible)" : a.dateTime, D = `🚕 TAXI BOOKING

Company: ${h.name}

📍 From: ${a.from}
📍 To: ${a.to}
📅 When: ${Y}
🚗 Car: ${f?.name}
💰 Estimate: €${v} (~${g}km, ${p}min)

Contact: ${h.phone}`;
    I === "whatsapp" ? (window.open(`https://wa.me/${h.phone.replace(/\s/g, "")}?text=${encodeURIComponent(D)}`, "_blank"), de.success("Opening WhatsApp...")) : (window.location.href = `mailto:${h.email}?subject=Taxi Booking&body=${encodeURIComponent(D)}`, de.success("Opening Email..."));
  }, R = () => {
    const I = document.createElement("a");
    I.href = `https://api.qrserver.com/v1/create-qr-code/?size=1000x1000&data=${encodeURIComponent(h.bookingUrl)}`, I.download = `${h.name}-booking-qr.png`, document.body.appendChild(I), I.click(), document.body.removeChild(I), de.success("QR Code downloaded!");
  }, F = () => {
    window.print(), de.success("Opening print dialog...");
  }, V = r ? "bg-slate-900" : "bg-gray-50", E = r ? "bg-slate-800" : "bg-white", S = r ? "text-white" : "text-slate-900", $ = r ? "text-gray-400" : "text-gray-600", A = r ? "bg-slate-700 border-slate-600 text-white placeholder:text-gray-400" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500", U = (I) => I ? r ? "bg-yellow-500 border-yellow-500 text-slate-900" : "bg-yellow-400 border-yellow-400 text-slate-900" : r ? "bg-slate-700 border-slate-600 text-white hover:border-yellow-500" : "bg-white border-gray-300 text-gray-900 hover:border-yellow-500";
  return /* @__PURE__ */ s("div", { className: `min-h-screen flex items-center justify-center p-4 ${V}`, children: [
    /* @__PURE__ */ n(vn, {}),
    /* @__PURE__ */ s("div", { className: "w-full max-w-lg", children: [
      /* @__PURE__ */ n(ue, { className: `${E} shadow-lg border-0 p-6 mb-4`, children: /* @__PURE__ */ s("div", { className: "flex items-start justify-between", children: [
        /* @__PURE__ */ s("div", { className: "flex items-start gap-4", children: [
          /* @__PURE__ */ n("div", { className: "w-14 h-14 rounded-xl bg-yellow-400 flex items-center justify-center shadow-md flex-shrink-0", children: /* @__PURE__ */ n(_e, { className: "w-7 h-7 text-slate-900" }) }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ n("h1", { className: `text-2xl font-bold mb-1 ${S}`, children: h.name }),
            /* @__PURE__ */ n("p", { className: `text-sm italic mb-2 ${r ? "text-yellow-400" : "text-yellow-600"}`, children: h.slogan }),
            /* @__PURE__ */ s("div", { className: `text-xs ${$} space-y-0.5`, children: [
              /* @__PURE__ */ s("p", { children: [
                "BTW: ",
                h.btw
              ] }),
              /* @__PURE__ */ n("p", { children: h.phone })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: "flex flex-col items-end gap-2", children: [
          /* @__PURE__ */ n(
            "button",
            {
              onClick: () => l(!0),
              className: `p-2 rounded-lg transition-colors ${r ? "hover:bg-slate-700 text-yellow-400" : "hover:bg-gray-100 text-yellow-600"}`,
              children: /* @__PURE__ */ n(Fr, { className: "w-6 h-6" })
            }
          ),
          /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5", children: [
            /* @__PURE__ */ s("div", { className: "relative", children: [
              /* @__PURE__ */ n("div", { className: `w-2.5 h-2.5 rounded-full ${_.color} animate-pulse` }),
              /* @__PURE__ */ n("div", { className: `absolute inset-0 w-2.5 h-2.5 rounded-full ${_.color} ring-2 ${_.ringColor} animate-ping` })
            ] }),
            /* @__PURE__ */ n("span", { className: `text-xs font-semibold ${_.textColor}`, children: _.label })
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ n(ue, { className: `${E} shadow-2xl border-0 p-6`, children: /* @__PURE__ */ s("div", { className: "space-y-4", children: [
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ n("label", { className: `text-sm font-semibold mb-2 block ${S}`, children: N.pickup }),
          /* @__PURE__ */ s("div", { className: "relative", children: [
            /* @__PURE__ */ n(Pt, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-green-500" }),
            /* @__PURE__ */ n(
              q,
              {
                value: a.from,
                onChange: (I) => i({ ...a, from: I.target.value }),
                placeholder: "Enter pick-up address",
                className: `h-12 pl-11 ${A}`
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ n("label", { className: `text-sm font-semibold mb-2 block ${S}`, children: N.dropoff }),
          /* @__PURE__ */ s("div", { className: "relative", children: [
            /* @__PURE__ */ n(Pt, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-red-500" }),
            /* @__PURE__ */ n(
              q,
              {
                value: a.to,
                onChange: (I) => i({ ...a, to: I.target.value }),
                placeholder: "Enter drop-off address",
                className: `h-12 pl-11 ${A}`
              }
            )
          ] })
        ] }),
        y && /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ n("label", { className: `text-sm font-semibold mb-2 block ${S}`, children: N.selectCar }),
          /* @__PURE__ */ n("div", { className: "grid grid-cols-3 gap-2", children: m.map((I) => {
            const Y = I.icon, D = a.carType === I.id;
            return /* @__PURE__ */ s(
              "button",
              {
                onClick: () => i({ ...a, carType: I.id }),
                className: `p-3 rounded-lg border-2 transition-all ${U(D)}`,
                children: [
                  /* @__PURE__ */ n(Y, { className: `w-6 h-6 mx-auto mb-1 ${D ? "text-slate-900" : "text-yellow-500"}` }),
                  /* @__PURE__ */ n("p", { className: "text-xs font-bold", children: I.name }),
                  /* @__PURE__ */ n("p", { className: `text-xs ${D ? "text-slate-700" : $}`, children: I.seats })
                ]
              },
              I.id
            );
          }) })
        ] }),
        b && /* @__PURE__ */ s("div", { className: `p-4 rounded-xl border-2 ${r ? "bg-gradient-to-br from-slate-700 to-slate-800 border-yellow-500/30" : "bg-gradient-to-br from-yellow-50 to-white border-yellow-400/40"} animate-in slide-in-from-top-2 duration-300`, children: [
          /* @__PURE__ */ n("h3", { className: `text-sm font-bold mb-3 ${r ? "text-yellow-400" : "text-yellow-700"}`, children: N.tripEstimate }),
          /* @__PURE__ */ s("div", { className: "grid grid-cols-3 gap-3", children: [
            /* @__PURE__ */ s("div", { className: "text-center", children: [
              /* @__PURE__ */ n("div", { className: `flex items-center justify-center w-10 h-10 rounded-lg mx-auto mb-2 ${r ? "bg-slate-600" : "bg-white"}`, children: /* @__PURE__ */ n(Kp, { className: `w-5 h-5 ${r ? "text-yellow-400" : "text-yellow-600"}` }) }),
              /* @__PURE__ */ s("p", { className: `text-lg font-bold ${S}`, children: [
                g,
                " km"
              ] }),
              /* @__PURE__ */ n("p", { className: `text-xs ${$}`, children: N.distance })
            ] }),
            /* @__PURE__ */ s("div", { className: "text-center", children: [
              /* @__PURE__ */ n("div", { className: `flex items-center justify-center w-10 h-10 rounded-lg mx-auto mb-2 ${r ? "bg-slate-600" : "bg-white"}`, children: /* @__PURE__ */ n(vg, { className: `w-5 h-5 ${r ? "text-yellow-400" : "text-yellow-600"}` }) }),
              /* @__PURE__ */ s("p", { className: `text-lg font-bold ${S}`, children: [
                p,
                " ",
                N.mins
              ] }),
              /* @__PURE__ */ n("p", { className: `text-xs ${$}`, children: N.duration })
            ] }),
            /* @__PURE__ */ s("div", { className: "text-center", children: [
              /* @__PURE__ */ n("div", { className: `flex items-center justify-center w-10 h-10 rounded-lg mx-auto mb-2 ${r ? "bg-slate-600" : "bg-white"}`, children: /* @__PURE__ */ n("span", { className: "text-xl font-bold text-green-500", children: "€" }) }),
              /* @__PURE__ */ s("p", { className: `text-lg font-bold ${r ? "text-green-400" : "text-green-600"}`, children: [
                "€",
                v
              ] }),
              /* @__PURE__ */ n("p", { className: `text-xs ${$}`, children: N.price })
            ] })
          ] }),
          /* @__PURE__ */ n("div", { className: `mt-3 pt-3 border-t ${r ? "border-slate-600" : "border-yellow-200"}`, children: /* @__PURE__ */ s("p", { className: `text-xs text-center ${$}`, children: [
            "€",
            f?.base,
            " ",
            N.basePrice,
            " + €",
            f?.perKm,
            " ",
            N.perKm
          ] }) })
        ] }),
        w && /* @__PURE__ */ s("div", { className: "animate-in slide-in-from-top-2 duration-300", children: [
          /* @__PURE__ */ n("label", { className: `text-sm font-semibold mb-2 block ${S}`, children: N.whenDoYouNeed }),
          /* @__PURE__ */ s("div", { className: "grid grid-cols-2 gap-2 mb-3", children: [
            /* @__PURE__ */ s(
              "button",
              {
                onClick: () => i({ ...a, rideType: "now", dateTime: "" }),
                className: `h-12 rounded-lg border-2 font-semibold transition-all flex items-center justify-center gap-2 ${a.rideType === "now" ? r ? "bg-yellow-500 border-yellow-500 text-slate-900" : "bg-yellow-400 border-yellow-400 text-slate-900" : r ? "bg-slate-700 border-slate-600 text-white hover:border-yellow-500" : "bg-white border-gray-300 text-gray-900 hover:border-yellow-500"}`,
                children: [
                  /* @__PURE__ */ n(Si, { className: "w-5 h-5" }),
                  N.rideNow
                ]
              }
            ),
            /* @__PURE__ */ s(
              "button",
              {
                onClick: () => i({ ...a, rideType: "schedule" }),
                className: `h-12 rounded-lg border-2 font-semibold transition-all flex items-center justify-center gap-2 ${a.rideType === "schedule" ? r ? "bg-yellow-500 border-yellow-500 text-slate-900" : "bg-yellow-400 border-yellow-400 text-slate-900" : r ? "bg-slate-700 border-slate-600 text-white hover:border-yellow-500" : "bg-white border-gray-300 text-gray-900 hover:border-yellow-500"}`,
                children: [
                  /* @__PURE__ */ n(Ko, { className: "w-5 h-5" }),
                  N.schedule
                ]
              }
            )
          ] }),
          a.rideType === "schedule" && /* @__PURE__ */ s("div", { className: "relative animate-in slide-in-from-top-2 duration-300", children: [
            /* @__PURE__ */ n(Ko, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500 pointer-events-none z-10" }),
            /* @__PURE__ */ n(
              "input",
              {
                type: "datetime-local",
                value: a.dateTime,
                onChange: (I) => i({ ...a, dateTime: I.target.value }),
                min: (/* @__PURE__ */ new Date()).toISOString().slice(0, 16),
                className: `w-full h-12 pl-11 pr-3 rounded-lg border-2 ${A}`
              }
            )
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: `flex items-start gap-2 p-3 rounded-lg ${r ? "bg-slate-700" : "bg-gray-50"}`, children: [
          /* @__PURE__ */ n(
            Pc,
            {
              id: "terms",
              checked: u,
              onCheckedChange: (I) => c(!!I),
              className: "mt-0.5"
            }
          ),
          /* @__PURE__ */ n("label", { htmlFor: "terms", className: `text-sm cursor-pointer ${S}`, children: N.acceptTerms })
        ] }),
        /* @__PURE__ */ s("div", { className: "space-y-2 pt-2", children: [
          /* @__PURE__ */ s(
            W,
            {
              onClick: () => x("whatsapp"),
              disabled: !u,
              className: `w-full h-14 font-bold text-base ${u ? "bg-green-600 hover:bg-green-700 text-white" : "bg-gray-400 cursor-not-allowed text-gray-200"}`,
              children: [
                /* @__PURE__ */ n(no, { className: "w-5 h-5 mr-2" }),
                N.bookNow
              ]
            }
          ),
          /* @__PURE__ */ s("div", { className: "grid grid-cols-2 gap-2", children: [
            /* @__PURE__ */ s(
              W,
              {
                onClick: () => x("email"),
                disabled: !u,
                variant: "outline",
                className: `h-11 ${r ? "bg-slate-700 border-slate-600 text-white hover:bg-slate-600" : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"} ${!u && "opacity-50 cursor-not-allowed"}`,
                children: [
                  /* @__PURE__ */ n(Er, { className: "w-4 h-4 mr-2" }),
                  N.bookEmail
                ]
              }
            ),
            /* @__PURE__ */ s(
              W,
              {
                onClick: () => window.open(`tel:${h.phone}`, "_self"),
                variant: "outline",
                className: `h-11 ${r ? "bg-slate-700 border-slate-600 text-white hover:bg-slate-600" : "bg-white border-gray-300 text-gray-900 hover:bg-gray-50"}`,
                children: [
                  /* @__PURE__ */ n(ca, { className: "w-4 h-4 mr-2" }),
                  N.call
                ]
              }
            )
          ] })
        ] })
      ] }) }),
      /* @__PURE__ */ s("div", { className: "text-center mt-6 space-y-1", children: [
        /* @__PURE__ */ s("p", { className: `text-xs ${$}`, children: [
          "© ",
          (/* @__PURE__ */ new Date()).getFullYear(),
          " TAXIO. All rights reserved."
        ] }),
        /* @__PURE__ */ n(
          "button",
          {
            onClick: () => window.location.href = "/companies",
            className: `text-xs font-semibold transition-colors ${r ? "text-yellow-400 hover:text-yellow-300" : "text-yellow-600 hover:text-yellow-700"}`,
            children: "Powered by TAXIO 🚕"
          }
        )
      ] })
    ] }),
    o && /* @__PURE__ */ n(
      "div",
      {
        className: "fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200",
        onClick: () => l(!1),
        children: /* @__PURE__ */ s(
          ue,
          {
            className: `${E} max-w-sm w-full p-6 animate-in zoom-in-95 duration-200`,
            onClick: (I) => I.stopPropagation(),
            children: [
              /* @__PURE__ */ s("div", { className: "flex items-center justify-between mb-4", children: [
                /* @__PURE__ */ n("h2", { className: `text-xl font-bold ${S}`, children: N.shareQR }),
                /* @__PURE__ */ n(
                  "button",
                  {
                    onClick: () => l(!1),
                    className: `p-1 rounded-lg hover:bg-gray-100 ${r ? "hover:bg-slate-700" : ""}`,
                    children: /* @__PURE__ */ n(yt, { className: `w-5 h-5 ${S}` })
                  }
                )
              ] }),
              /* @__PURE__ */ s("div", { className: "bg-white p-6 rounded-xl mb-4 flex flex-col items-center", children: [
                /* @__PURE__ */ n(
                  "div",
                  {
                    dangerouslySetInnerHTML: {
                      __html: `<img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(h.bookingUrl)}" alt="QR Code" class="w-full h-auto" />`
                    }
                  }
                ),
                /* @__PURE__ */ n("p", { className: "text-slate-900 text-center mt-3 font-semibold text-sm", children: h.name }),
                /* @__PURE__ */ n("p", { className: "text-slate-600 text-xs text-center", children: N.scanToBook })
              ] }),
              /* @__PURE__ */ s("div", { className: "space-y-2", children: [
                /* @__PURE__ */ s(
                  W,
                  {
                    onClick: R,
                    className: "w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold",
                    children: [
                      /* @__PURE__ */ n(qn, { className: "w-4 h-4 mr-2" }),
                      N.downloadQR
                    ]
                  }
                ),
                /* @__PURE__ */ s("div", { className: "grid grid-cols-2 gap-2", children: [
                  /* @__PURE__ */ s(
                    W,
                    {
                      onClick: () => {
                        navigator.share?.({ url: h.bookingUrl, title: h.name }) || de.info("Share feature not supported");
                      },
                      variant: "outline",
                      className: r ? "bg-slate-700 border-slate-600 text-white" : "",
                      children: [
                        /* @__PURE__ */ n(pc, { className: "w-4 h-4 mr-2" }),
                        "Share"
                      ]
                    }
                  ),
                  /* @__PURE__ */ s(
                    W,
                    {
                      onClick: F,
                      variant: "outline",
                      className: r ? "bg-slate-700 border-slate-600 text-white" : "",
                      children: [
                        /* @__PURE__ */ n(fc, { className: "w-4 h-4 mr-2" }),
                        N.printQR
                      ]
                    }
                  )
                ] })
              ] })
            ]
          }
        )
      }
    )
  ] });
}
function dl() {
  const { companySubdomain: e } = fn(), { language: t, darkMode: r } = lr(), [a, i] = j(1), [o, l] = j({
    from: "",
    to: "",
    carType: "standard",
    date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    time: "",
    passengers: 1
  }), c = {
    name: e ? e.charAt(0).toUpperCase() + e.slice(1) : "DemoCompany",
    tagline: "Professional taxi service you can trust",
    phone: "+32 470 123 456",
    email: "contact@democompany.be",
    rating: 4.9,
    totalRides: 2847,
    yearsActive: 12
  }, d = [
    {
      id: "standard",
      name: "Standard",
      vehicle: "Mercedes E-Class",
      icon: _e,
      passengers: "1-4",
      luggage: "2-3",
      basePrice: 5,
      perKm: 2,
      description: "Perfect for city rides",
      features: ["Comfortable seats", "AC", "Music"]
    },
    {
      id: "van",
      name: "Van",
      vehicle: "Mercedes V-Class",
      icon: Xn,
      passengers: "1-7",
      luggage: "4-6",
      basePrice: 8,
      perKm: 3,
      description: "Ideal for groups & families",
      features: ["Spacious", "Extra luggage", "Group travel"]
    },
    {
      id: "luxury",
      name: "Luxury",
      vehicle: "Mercedes S-Class",
      icon: Pi,
      passengers: "1-3",
      luggage: "2-3",
      basePrice: 10,
      perKm: 4,
      description: "Premium experience",
      features: ["Leather seats", "Premium sound", "VIP service"]
    }
  ], h = [
    "Brussels Airport (BRU)",
    "Charleroi Airport (CRL)",
    "Brussels City Center",
    "Antwerp Central",
    "Ghent Station",
    "Bruges Center"
  ], f = {
    en: {
      bookYourRide: "Book Your Ride",
      step: "Step",
      of: "of",
      whereAreYou: "Where are you?",
      whereToGo: "Where do you want to go?",
      pickupLocation: "Pick-up Location",
      dropoffLocation: "Drop-off Location",
      selectVehicle: "Select Your Vehicle",
      whenDoYouNeed: "When do you need the ride?",
      selectDate: "Select Date",
      selectTime: "Select Time",
      passengers: "Passengers",
      summary: "Booking Summary",
      bookWithWhatsApp: "Book with WhatsApp",
      bookWithEmail: "Book with Email",
      popularDestinations: "Popular Destinations",
      priceEstimate: "Price Estimate",
      perKm: "per km",
      about: "About",
      totalRides: "Total Rides",
      yearsActive: "Years Active",
      rating: "Rating",
      next: "Next",
      back: "Back",
      basePrice: "Base Price"
    },
    fr: {
      bookYourRide: "Réservez Votre Course",
      step: "Étape",
      of: "de",
      whereAreYou: "Où êtes-vous?",
      whereToGo: "Où voulez-vous aller?",
      pickupLocation: "Lieu de Prise en Charge",
      dropoffLocation: "Lieu de Dépose",
      selectVehicle: "Sélectionnez Votre Véhicule",
      whenDoYouNeed: "Quand avez-vous besoin du trajet?",
      selectDate: "Sélectionner la Date",
      selectTime: "Sélectionner l'Heure",
      passengers: "Passagers",
      summary: "Résumé de Réservation",
      bookWithWhatsApp: "Réserver avec WhatsApp",
      bookWithEmail: "Réserver avec Email",
      popularDestinations: "Destinations Populaires",
      priceEstimate: "Estimation du Prix",
      perKm: "par km",
      about: "À propos",
      totalRides: "Total de Courses",
      yearsActive: "Années Actives",
      rating: "Évaluation",
      next: "Suivant",
      back: "Retour",
      basePrice: "Prix de Base"
    },
    nl: {
      bookYourRide: "Boek Uw Rit",
      step: "Stap",
      of: "van",
      whereAreYou: "Waar bent u?",
      whereToGo: "Waar wilt u naartoe?",
      pickupLocation: "Ophaallocatie",
      dropoffLocation: "Afleverlocatie",
      selectVehicle: "Selecteer Uw Voertuig",
      whenDoYouNeed: "Wanneer heeft u de rit nodig?",
      selectDate: "Selecteer Datum",
      selectTime: "Selecteer Tijd",
      passengers: "Passagiers",
      summary: "Boekingsoverzicht",
      bookWithWhatsApp: "Boeken met WhatsApp",
      bookWithEmail: "Boeken met Email",
      popularDestinations: "Populaire Bestemmingen",
      priceEstimate: "Prijsschatting",
      perKm: "per km",
      about: "Over",
      totalRides: "Totaal Ritten",
      yearsActive: "Jaren Actief",
      rating: "Beoordeling",
      next: "Volgende",
      back: "Terug",
      basePrice: "Basisprijs"
    }
  }[t], g = async () => {
    if (navigator.share)
      try {
        await navigator.share({
          title: c.name,
          text: `Book your taxi with ${c.name}`,
          url: window.location.href
        }), de.success("Shared successfully!");
      } catch (x) {
        console.log("Error sharing:", x);
      }
    else
      navigator.clipboard.writeText(window.location.href), de.success("Link copied to clipboard!");
  }, p = (x) => {
    const R = d.find((V) => V.id === o.carType), F = `🚕 TAXI BOOKING REQUEST

Company: ${c.name}
━━━━━━━━━━━━━━━━━━━━
📍 From: ${o.from}
📍 To: ${o.to}
📅 Date: ${o.date}
🕐 Time: ${o.time}
🚗 Vehicle: ${R?.vehicle} (${R?.name})
👥 Passengers: ${o.passengers}

💰 Rate: €${R?.basePrice} base + €${R?.perKm}/km

Thank you for choosing ${c.name}!`;
    x === "whatsapp" ? (window.open(`https://wa.me/${c.phone.replace(/\s/g, "")}?text=${encodeURIComponent(F)}`, "_blank"), de.success("Opening WhatsApp...")) : (window.location.href = `mailto:${c.email}?subject=Taxi Booking Request&body=${encodeURIComponent(F)}`, de.success("Opening Email..."));
  }, v = () => a === 1 ? o.from && o.to : a === 2 ? o.carType : a === 3 ? o.date && o.time : !0, b = r ? "bg-slate-900" : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50", w = r ? "bg-slate-800" : "bg-white", y = r ? "text-white" : "text-slate-900", k = r ? "text-gray-300" : "text-gray-700", N = r ? "text-gray-400" : "text-gray-500", T = r ? "border-slate-700" : "border-gray-200", _ = r ? "bg-slate-700 border-slate-600 text-white placeholder:text-gray-400 focus:border-yellow-500" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-400 focus:border-yellow-500";
  return /* @__PURE__ */ s("div", { className: `min-h-screen ${b} transition-colors duration-300`, children: [
    /* @__PURE__ */ n(vn, {}),
    /* @__PURE__ */ s("div", { className: "container mx-auto px-4 py-8 max-w-4xl", children: [
      /* @__PURE__ */ n(ue, { className: `mb-6 ${w} border-0 shadow-2xl overflow-hidden`, children: /* @__PURE__ */ n("div", { className: "bg-gradient-to-r from-slate-800 via-slate-900 to-black p-6", children: /* @__PURE__ */ s("div", { className: "flex items-start justify-between gap-4", children: [
        /* @__PURE__ */ s("div", { className: "flex items-start gap-4 flex-1", children: [
          /* @__PURE__ */ s("div", { className: "relative", children: [
            /* @__PURE__ */ n("div", { className: "w-16 h-16 rounded-2xl bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center shadow-2xl", children: /* @__PURE__ */ n(_e, { className: "w-8 h-8 text-slate-900" }) }),
            /* @__PURE__ */ n("div", { className: "absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-green-500 border-2 border-slate-900 flex items-center justify-center", children: /* @__PURE__ */ n(bt, { className: "w-3 h-3 text-white font-bold" }) })
          ] }),
          /* @__PURE__ */ s("div", { className: "flex-1", children: [
            /* @__PURE__ */ n("h1", { className: "text-3xl font-bold text-white mb-2 tracking-tight", children: c.name }),
            /* @__PURE__ */ n("p", { className: "text-gray-300 text-sm mb-3", children: c.tagline }),
            /* @__PURE__ */ s("div", { className: "flex flex-wrap gap-3", children: [
              /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5 px-3 py-1 rounded-full bg-yellow-400 text-slate-900 text-xs font-bold", children: [
                /* @__PURE__ */ n(hg, { className: "w-3 h-3 fill-slate-900" }),
                c.rating,
                " (",
                c.totalRides,
                "+ rides)"
              ] }),
              /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold", children: [
                /* @__PURE__ */ n(dc, { className: "w-3 h-3" }),
                c.yearsActive,
                " years"
              ] }),
              /* @__PURE__ */ s("div", { className: "flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500 text-white text-xs font-semibold", children: [
                /* @__PURE__ */ n(zr, { className: "w-3 h-3" }),
                "Verified"
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s(
          W,
          {
            onClick: g,
            variant: "outline",
            size: "sm",
            className: "bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-sm",
            children: [
              /* @__PURE__ */ n(pc, { className: "w-4 h-4 mr-2" }),
              "Share"
            ]
          }
        )
      ] }) }) }),
      /* @__PURE__ */ s("div", { className: `mb-6 ${w} rounded-2xl p-4 shadow-lg border ${T}`, children: [
        /* @__PURE__ */ s("div", { className: "flex items-center justify-between mb-2", children: [
          /* @__PURE__ */ s("span", { className: `text-sm font-semibold ${k}`, children: [
            f.step,
            " ",
            a,
            " ",
            f.of,
            " 4"
          ] }),
          /* @__PURE__ */ s("span", { className: `text-xs ${N}`, children: [
            a === 1 && f.whereAreYou,
            a === 2 && f.selectVehicle,
            a === 3 && f.whenDoYouNeed,
            a === 4 && f.summary
          ] })
        ] }),
        /* @__PURE__ */ n("div", { className: "flex gap-2", children: [1, 2, 3, 4].map((x) => /* @__PURE__ */ n(
          "div",
          {
            className: `h-2 flex-1 rounded-full transition-all duration-300 ${x <= a ? "bg-gradient-to-r from-yellow-400 to-yellow-500" : r ? "bg-slate-700" : "bg-gray-200"}`
          },
          x
        )) })
      ] }),
      /* @__PURE__ */ n(ue, { className: `${w} shadow-2xl border-0`, children: /* @__PURE__ */ s(Ee, { className: "p-6", children: [
        a === 1 && /* @__PURE__ */ s("div", { className: "space-y-6", children: [
          /* @__PURE__ */ s("div", { className: "text-center mb-6", children: [
            /* @__PURE__ */ n("h2", { className: `text-2xl font-bold ${y} mb-2`, children: f.whereAreYou }),
            /* @__PURE__ */ n("p", { className: `${N}`, children: "Enter your journey details" })
          ] }),
          /* @__PURE__ */ s("div", { className: "space-y-4", children: [
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ n("label", { className: `text-sm font-semibold mb-2 block ${k}`, children: f.pickupLocation }),
              /* @__PURE__ */ s("div", { className: "relative", children: [
                /* @__PURE__ */ n(Pt, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-yellow-500" }),
                /* @__PURE__ */ n(
                  q,
                  {
                    value: o.from,
                    onChange: (x) => l({ ...o, from: x.target.value }),
                    placeholder: "e.g., Brussels Airport",
                    className: `h-12 pl-11 text-base ${_}`
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ n("label", { className: `text-sm font-semibold mb-2 block ${k}`, children: f.dropoffLocation }),
              /* @__PURE__ */ s("div", { className: "relative", children: [
                /* @__PURE__ */ n(Pt, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-yellow-500" }),
                /* @__PURE__ */ n(
                  q,
                  {
                    value: o.to,
                    onChange: (x) => l({ ...o, to: x.target.value }),
                    placeholder: "e.g., Brussels City Center",
                    className: `h-12 pl-11 text-base ${_}`
                  }
                )
              ] })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ n("p", { className: `text-sm font-semibold mb-3 ${k}`, children: f.popularDestinations }),
            /* @__PURE__ */ n("div", { className: "grid grid-cols-2 gap-2", children: h.map((x, R) => /* @__PURE__ */ s(
              "button",
              {
                onClick: () => l({ ...o, to: x }),
                className: `p-2 rounded-lg text-left text-sm transition-all hover:scale-105 ${r ? "bg-slate-700 hover:bg-slate-600 text-gray-300" : "bg-gray-100 hover:bg-yellow-100 text-gray-700"}`,
                children: [
                  "📍 ",
                  x
                ]
              },
              R
            )) })
          ] })
        ] }),
        a === 2 && /* @__PURE__ */ s("div", { className: "space-y-6", children: [
          /* @__PURE__ */ s("div", { className: "text-center mb-6", children: [
            /* @__PURE__ */ n("h2", { className: `text-2xl font-bold ${y} mb-2`, children: f.selectVehicle }),
            /* @__PURE__ */ n("p", { className: `${N}`, children: "Choose the perfect vehicle for your journey" })
          ] }),
          /* @__PURE__ */ n("div", { className: "space-y-3", children: d.map((x) => {
            const R = x.icon, F = o.carType === x.id;
            return /* @__PURE__ */ n(
              "button",
              {
                onClick: () => l({ ...o, carType: x.id }),
                className: `w-full p-4 rounded-xl border-2 transition-all duration-300 text-left ${F ? "border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20 shadow-lg scale-105" : r ? "border-slate-700 bg-slate-700/50 hover:border-slate-600" : "border-gray-200 bg-gray-50 hover:border-gray-300"}`,
                children: /* @__PURE__ */ s("div", { className: "flex items-start gap-4", children: [
                  /* @__PURE__ */ n("div", { className: `w-12 h-12 rounded-xl flex items-center justify-center ${F ? "bg-yellow-500" : r ? "bg-slate-600" : "bg-gray-200"}`, children: /* @__PURE__ */ n(R, { className: `w-6 h-6 ${F ? "text-white" : "text-gray-600"}` }) }),
                  /* @__PURE__ */ s("div", { className: "flex-1", children: [
                    /* @__PURE__ */ s("div", { className: "flex items-center justify-between mb-1", children: [
                      /* @__PURE__ */ n("h3", { className: `font-bold ${y}`, children: x.name }),
                      F && /* @__PURE__ */ n("div", { className: "w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center", children: /* @__PURE__ */ n(bt, { className: "w-4 h-4 text-white" }) })
                    ] }),
                    /* @__PURE__ */ n("p", { className: `text-sm ${N} mb-2`, children: x.vehicle }),
                    /* @__PURE__ */ n("p", { className: `text-xs ${k} mb-3`, children: x.description }),
                    /* @__PURE__ */ s("div", { className: "flex items-center gap-4 mb-3", children: [
                      /* @__PURE__ */ s("div", { className: "flex items-center gap-1", children: [
                        /* @__PURE__ */ n(Xn, { className: "w-4 h-4 text-yellow-500" }),
                        /* @__PURE__ */ n("span", { className: `text-xs ${k}`, children: x.passengers })
                      ] }),
                      /* @__PURE__ */ s("div", { className: "flex items-center gap-1", children: [
                        /* @__PURE__ */ n(Up, { className: "w-4 h-4 text-yellow-500" }),
                        /* @__PURE__ */ n("span", { className: `text-xs ${k}`, children: x.luggage })
                      ] })
                    ] }),
                    /* @__PURE__ */ s("div", { className: `text-sm font-semibold ${y}`, children: [
                      "€",
                      x.basePrice.toFixed(2),
                      " ",
                      f.basePrice,
                      " + €",
                      x.perKm.toFixed(2),
                      "/",
                      f.perKm
                    ] })
                  ] })
                ] })
              },
              x.id
            );
          }) })
        ] }),
        a === 3 && /* @__PURE__ */ s("div", { className: "space-y-6", children: [
          /* @__PURE__ */ s("div", { className: "text-center mb-6", children: [
            /* @__PURE__ */ n("h2", { className: `text-2xl font-bold ${y} mb-2`, children: f.whenDoYouNeed }),
            /* @__PURE__ */ n("p", { className: `${N}`, children: "Select your preferred date and time" })
          ] }),
          /* @__PURE__ */ s("div", { className: "space-y-4", children: [
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ n("label", { className: `text-sm font-semibold mb-2 block ${k}`, children: f.selectDate }),
              /* @__PURE__ */ n("div", { className: "relative", children: /* @__PURE__ */ n(
                "input",
                {
                  type: "date",
                  value: o.date,
                  onChange: (x) => l({ ...o, date: x.target.value }),
                  className: `w-full h-12 px-4 text-base rounded-lg border-2 ${_}`,
                  min: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
                }
              ) })
            ] }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ n("label", { className: `text-sm font-semibold mb-2 block ${k}`, children: f.selectTime }),
              /* @__PURE__ */ s("div", { className: "relative", children: [
                /* @__PURE__ */ n(Si, { className: "absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-yellow-500" }),
                /* @__PURE__ */ s(
                  "select",
                  {
                    value: o.time,
                    onChange: (x) => l({ ...o, time: x.target.value }),
                    className: `w-full h-12 pl-11 pr-4 text-base rounded-lg border-2 appearance-none ${_}`,
                    children: [
                      /* @__PURE__ */ n("option", { value: "", children: "Select time..." }),
                      Array.from({ length: 24 }, (x, R) => {
                        const F = R.toString().padStart(2, "0");
                        return /* @__PURE__ */ s("option", { value: `${F}:00`, children: [
                          F,
                          ":00"
                        ] }, F);
                      })
                    ]
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ n("label", { className: `text-sm font-semibold mb-2 block ${k}`, children: f.passengers }),
              /* @__PURE__ */ n("div", { className: "flex gap-2", children: [1, 2, 3, 4, 5, 6, 7].map((x) => /* @__PURE__ */ n(
                "button",
                {
                  onClick: () => l({ ...o, passengers: x }),
                  className: `w-12 h-12 rounded-lg font-bold transition-all ${o.passengers === x ? "bg-yellow-500 text-white shadow-lg scale-110" : r ? "bg-slate-700 text-gray-300 hover:bg-slate-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`,
                  children: x
                },
                x
              )) })
            ] })
          ] })
        ] }),
        a === 4 && /* @__PURE__ */ s("div", { className: "space-y-6", children: [
          /* @__PURE__ */ s("div", { className: "text-center mb-6", children: [
            /* @__PURE__ */ n("h2", { className: `text-2xl font-bold ${y} mb-2`, children: f.summary }),
            /* @__PURE__ */ n("p", { className: `${N}`, children: "Review and confirm your booking" })
          ] }),
          /* @__PURE__ */ n("div", { className: `p-6 rounded-xl ${r ? "bg-slate-700" : "bg-gray-50"}`, children: /* @__PURE__ */ s("div", { className: "space-y-4", children: [
            /* @__PURE__ */ s("div", { className: "flex items-start gap-3", children: [
              /* @__PURE__ */ n(Pt, { className: "w-5 h-5 text-yellow-500 mt-0.5" }),
              /* @__PURE__ */ s("div", { className: "flex-1", children: [
                /* @__PURE__ */ n("p", { className: `text-xs font-semibold ${N} mb-1`, children: "Pick-up" }),
                /* @__PURE__ */ n("p", { className: `${y}`, children: o.from })
              ] })
            ] }),
            /* @__PURE__ */ n("div", { className: "border-l-2 border-yellow-500 h-8 ml-2" }),
            /* @__PURE__ */ s("div", { className: "flex items-start gap-3", children: [
              /* @__PURE__ */ n(Pt, { className: "w-5 h-5 text-yellow-500 mt-0.5" }),
              /* @__PURE__ */ s("div", { className: "flex-1", children: [
                /* @__PURE__ */ n("p", { className: `text-xs font-semibold ${N} mb-1`, children: "Drop-off" }),
                /* @__PURE__ */ n("p", { className: `${y}`, children: o.to })
              ] })
            ] }),
            /* @__PURE__ */ n("div", { className: `border-t ${T} pt-4 mt-4`, children: /* @__PURE__ */ s("div", { className: "grid grid-cols-2 gap-4", children: [
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n("p", { className: `text-xs font-semibold ${N} mb-1`, children: "Vehicle" }),
                /* @__PURE__ */ n("p", { className: `${y} font-semibold`, children: d.find((x) => x.id === o.carType)?.name })
              ] }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n("p", { className: `text-xs font-semibold ${N} mb-1`, children: "Passengers" }),
                /* @__PURE__ */ n("p", { className: `${y} font-semibold`, children: o.passengers })
              ] }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n("p", { className: `text-xs font-semibold ${N} mb-1`, children: "Date" }),
                /* @__PURE__ */ n("p", { className: `${y} font-semibold`, children: o.date })
              ] }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n("p", { className: `text-xs font-semibold ${N} mb-1`, children: "Time" }),
                /* @__PURE__ */ n("p", { className: `${y} font-semibold`, children: o.time })
              ] })
            ] }) })
          ] }) }),
          /* @__PURE__ */ s("div", { className: "space-y-3", children: [
            /* @__PURE__ */ s(
              W,
              {
                onClick: () => p("whatsapp"),
                className: "w-full h-14 bg-green-600 hover:bg-green-700 text-white text-lg font-bold shadow-lg",
                children: [
                  /* @__PURE__ */ n(no, { className: "w-5 h-5 mr-2" }),
                  f.bookWithWhatsApp
                ]
              }
            ),
            /* @__PURE__ */ s(
              W,
              {
                onClick: () => p("email"),
                variant: "outline",
                className: `w-full h-14 text-lg font-bold ${r ? "bg-slate-700 hover:bg-slate-600 text-white border-slate-600" : "bg-white hover:bg-gray-50 text-gray-900 border-gray-300"}`,
                children: [
                  /* @__PURE__ */ n(Er, { className: "w-5 h-5 mr-2" }),
                  f.bookWithEmail
                ]
              }
            )
          ] }),
          /* @__PURE__ */ s("div", { className: `p-4 rounded-lg ${r ? "bg-slate-700/50" : "bg-blue-50"}`, children: [
            /* @__PURE__ */ n("p", { className: `text-xs ${N} mb-2`, children: "Quick Contact" }),
            /* @__PURE__ */ s("div", { className: "flex items-center gap-4", children: [
              /* @__PURE__ */ s(
                "a",
                {
                  href: `tel:${c.phone}`,
                  className: `flex items-center gap-2 text-sm font-semibold ${ul} hover:underline`,
                  children: [
                    /* @__PURE__ */ n(ca, { className: "w-4 h-4" }),
                    c.phone
                  ]
                }
              ),
              /* @__PURE__ */ s(
                "a",
                {
                  href: `mailto:${c.email}`,
                  className: `flex items-center gap-2 text-sm font-semibold ${ul} hover:underline`,
                  children: [
                    /* @__PURE__ */ n(Er, { className: "w-4 h-4" }),
                    "Email"
                  ]
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: "flex gap-3 mt-8 pt-6 border-t border-gray-200 dark:border-slate-700", children: [
          a > 1 && /* @__PURE__ */ n(
            W,
            {
              onClick: () => i(a - 1),
              variant: "outline",
              className: `flex-1 h-12 ${r ? "bg-slate-700 hover:bg-slate-600 text-white border-slate-600" : "bg-white hover:bg-gray-50 text-gray-900 border-gray-300"}`,
              children: f.back
            }
          ),
          a < 4 && /* @__PURE__ */ s(
            W,
            {
              onClick: () => {
                v() ? i(a + 1) : de.error("Please fill in all required fields");
              },
              disabled: !v(),
              className: `flex-1 h-12 bg-gradient-to-r from-yellow-400 to-yellow-500 hover:from-yellow-500 hover:to-yellow-600 text-slate-900 font-bold shadow-lg ${v() ? "" : "opacity-50 cursor-not-allowed"}`,
              children: [
                f.next,
                /* @__PURE__ */ n(bp, { className: "w-5 h-5 ml-2" })
              ]
            }
          )
        ] })
      ] }) }),
      /* @__PURE__ */ s("div", { className: `mt-6 p-4 rounded-xl text-center ${r ? "bg-slate-800" : "bg-white"} shadow-lg border ${T}`, children: [
        /* @__PURE__ */ s("div", { className: "flex items-center justify-center gap-2 mb-2", children: [
          /* @__PURE__ */ n(zr, { className: "w-5 h-5 text-yellow-500" }),
          /* @__PURE__ */ n("p", { className: `font-bold ${y}`, children: "Safety First" })
        ] }),
        /* @__PURE__ */ n("p", { className: `text-sm ${N}`, children: "Professional drivers • Licensed & insured • Available 24/7" })
      ] })
    ] })
  ] });
}
const ul = "text-blue-600 dark:text-blue-400";
var px = Object.defineProperty, Za = Object.getOwnPropertySymbols, vu = Object.prototype.hasOwnProperty, bu = Object.prototype.propertyIsEnumerable, ml = (e, t, r) => t in e ? px(e, t, { enumerable: !0, configurable: !0, writable: !0, value: r }) : e[t] = r, si = (e, t) => {
  for (var r in t || (t = {}))
    vu.call(t, r) && ml(e, r, t[r]);
  if (Za)
    for (var r of Za(t))
      bu.call(t, r) && ml(e, r, t[r]);
  return e;
}, li = (e, t) => {
  var r = {};
  for (var a in e)
    vu.call(e, a) && t.indexOf(a) < 0 && (r[a] = e[a]);
  if (e != null && Za)
    for (var a of Za(e))
      t.indexOf(a) < 0 && bu.call(e, a) && (r[a] = e[a]);
  return r;
};
/**
 * @license QR Code generator library (TypeScript)
 * Copyright (c) Project Nayuki.
 * SPDX-License-Identifier: MIT
 */
var Vr;
((e) => {
  const t = class Re {
    /*-- Constructor (low level) and fields --*/
    // Creates a new QR Code with the given version number,
    // error correction level, data codeword bytes, and mask number.
    // This is a low-level API that most users should not use directly.
    // A mid-level API is the encodeSegments() function.
    constructor(c, d, h, m) {
      if (this.version = c, this.errorCorrectionLevel = d, this.modules = [], this.isFunction = [], c < Re.MIN_VERSION || c > Re.MAX_VERSION)
        throw new RangeError("Version value out of range");
      if (m < -1 || m > 7)
        throw new RangeError("Mask value out of range");
      this.size = c * 4 + 17;
      let f = [];
      for (let p = 0; p < this.size; p++)
        f.push(!1);
      for (let p = 0; p < this.size; p++)
        this.modules.push(f.slice()), this.isFunction.push(f.slice());
      this.drawFunctionPatterns();
      const g = this.addEccAndInterleave(h);
      if (this.drawCodewords(g), m == -1) {
        let p = 1e9;
        for (let v = 0; v < 8; v++) {
          this.applyMask(v), this.drawFormatBits(v);
          const b = this.getPenaltyScore();
          b < p && (m = v, p = b), this.applyMask(v);
        }
      }
      i(0 <= m && m <= 7), this.mask = m, this.applyMask(m), this.drawFormatBits(m), this.isFunction = [];
    }
    /*-- Static factory functions (high level) --*/
    // Returns a QR Code representing the given Unicode text string at the given error correction level.
    // As a conservative upper bound, this function is guaranteed to succeed for strings that have 738 or fewer
    // Unicode code points (not UTF-16 code units) if the low error correction level is used. The smallest possible
    // QR Code version is automatically chosen for the output. The ECC level of the result may be higher than the
    // ecl argument if it can be done without increasing the version.
    static encodeText(c, d) {
      const h = e.QrSegment.makeSegments(c);
      return Re.encodeSegments(h, d);
    }
    // Returns a QR Code representing the given binary data at the given error correction level.
    // This function always encodes using the binary segment mode, not any text mode. The maximum number of
    // bytes allowed is 2953. The smallest possible QR Code version is automatically chosen for the output.
    // The ECC level of the result may be higher than the ecl argument if it can be done without increasing the version.
    static encodeBinary(c, d) {
      const h = e.QrSegment.makeBytes(c);
      return Re.encodeSegments([h], d);
    }
    /*-- Static factory functions (mid level) --*/
    // Returns a QR Code representing the given segments with the given encoding parameters.
    // The smallest possible QR Code version within the given range is automatically
    // chosen for the output. Iff boostEcl is true, then the ECC level of the result
    // may be higher than the ecl argument if it can be done without increasing the
    // version. The mask number is either between 0 to 7 (inclusive) to force that
    // mask, or -1 to automatically choose an appropriate mask (which may be slow).
    // This function allows the user to create a custom sequence of segments that switches
    // between modes (such as alphanumeric and byte) to encode text in less space.
    // This is a mid-level API; the high-level API is encodeText() and encodeBinary().
    static encodeSegments(c, d, h = 1, m = 40, f = -1, g = !0) {
      if (!(Re.MIN_VERSION <= h && h <= m && m <= Re.MAX_VERSION) || f < -1 || f > 7)
        throw new RangeError("Invalid value");
      let p, v;
      for (p = h; ; p++) {
        const k = Re.getNumDataCodewords(p, d) * 8, N = l.getTotalBits(c, p);
        if (N <= k) {
          v = N;
          break;
        }
        if (p >= m)
          throw new RangeError("Data too long");
      }
      for (const k of [Re.Ecc.MEDIUM, Re.Ecc.QUARTILE, Re.Ecc.HIGH])
        g && v <= Re.getNumDataCodewords(p, k) * 8 && (d = k);
      let b = [];
      for (const k of c) {
        r(k.mode.modeBits, 4, b), r(k.numChars, k.mode.numCharCountBits(p), b);
        for (const N of k.getData())
          b.push(N);
      }
      i(b.length == v);
      const w = Re.getNumDataCodewords(p, d) * 8;
      i(b.length <= w), r(0, Math.min(4, w - b.length), b), r(0, (8 - b.length % 8) % 8, b), i(b.length % 8 == 0);
      for (let k = 236; b.length < w; k ^= 253)
        r(k, 8, b);
      let y = [];
      for (; y.length * 8 < b.length; )
        y.push(0);
      return b.forEach((k, N) => y[N >>> 3] |= k << 7 - (N & 7)), new Re(p, d, y, f);
    }
    /*-- Accessor methods --*/
    // Returns the color of the module (pixel) at the given coordinates, which is false
    // for light or true for dark. The top left corner has the coordinates (x=0, y=0).
    // If the given coordinates are out of bounds, then false (light) is returned.
    getModule(c, d) {
      return 0 <= c && c < this.size && 0 <= d && d < this.size && this.modules[d][c];
    }
    // Modified to expose modules for easy access
    getModules() {
      return this.modules;
    }
    /*-- Private helper methods for constructor: Drawing function modules --*/
    // Reads this object's version field, and draws and marks all function modules.
    drawFunctionPatterns() {
      for (let h = 0; h < this.size; h++)
        this.setFunctionModule(6, h, h % 2 == 0), this.setFunctionModule(h, 6, h % 2 == 0);
      this.drawFinderPattern(3, 3), this.drawFinderPattern(this.size - 4, 3), this.drawFinderPattern(3, this.size - 4);
      const c = this.getAlignmentPatternPositions(), d = c.length;
      for (let h = 0; h < d; h++)
        for (let m = 0; m < d; m++)
          h == 0 && m == 0 || h == 0 && m == d - 1 || h == d - 1 && m == 0 || this.drawAlignmentPattern(c[h], c[m]);
      this.drawFormatBits(0), this.drawVersion();
    }
    // Draws two copies of the format bits (with its own error correction code)
    // based on the given mask and this object's error correction level field.
    drawFormatBits(c) {
      const d = this.errorCorrectionLevel.formatBits << 3 | c;
      let h = d;
      for (let f = 0; f < 10; f++)
        h = h << 1 ^ (h >>> 9) * 1335;
      const m = (d << 10 | h) ^ 21522;
      i(m >>> 15 == 0);
      for (let f = 0; f <= 5; f++)
        this.setFunctionModule(8, f, a(m, f));
      this.setFunctionModule(8, 7, a(m, 6)), this.setFunctionModule(8, 8, a(m, 7)), this.setFunctionModule(7, 8, a(m, 8));
      for (let f = 9; f < 15; f++)
        this.setFunctionModule(14 - f, 8, a(m, f));
      for (let f = 0; f < 8; f++)
        this.setFunctionModule(this.size - 1 - f, 8, a(m, f));
      for (let f = 8; f < 15; f++)
        this.setFunctionModule(8, this.size - 15 + f, a(m, f));
      this.setFunctionModule(8, this.size - 8, !0);
    }
    // Draws two copies of the version bits (with its own error correction code),
    // based on this object's version field, iff 7 <= version <= 40.
    drawVersion() {
      if (this.version < 7)
        return;
      let c = this.version;
      for (let h = 0; h < 12; h++)
        c = c << 1 ^ (c >>> 11) * 7973;
      const d = this.version << 12 | c;
      i(d >>> 18 == 0);
      for (let h = 0; h < 18; h++) {
        const m = a(d, h), f = this.size - 11 + h % 3, g = Math.floor(h / 3);
        this.setFunctionModule(f, g, m), this.setFunctionModule(g, f, m);
      }
    }
    // Draws a 9*9 finder pattern including the border separator,
    // with the center module at (x, y). Modules can be out of bounds.
    drawFinderPattern(c, d) {
      for (let h = -4; h <= 4; h++)
        for (let m = -4; m <= 4; m++) {
          const f = Math.max(Math.abs(m), Math.abs(h)), g = c + m, p = d + h;
          0 <= g && g < this.size && 0 <= p && p < this.size && this.setFunctionModule(g, p, f != 2 && f != 4);
        }
    }
    // Draws a 5*5 alignment pattern, with the center module
    // at (x, y). All modules must be in bounds.
    drawAlignmentPattern(c, d) {
      for (let h = -2; h <= 2; h++)
        for (let m = -2; m <= 2; m++)
          this.setFunctionModule(c + m, d + h, Math.max(Math.abs(m), Math.abs(h)) != 1);
    }
    // Sets the color of a module and marks it as a function module.
    // Only used by the constructor. Coordinates must be in bounds.
    setFunctionModule(c, d, h) {
      this.modules[d][c] = h, this.isFunction[d][c] = !0;
    }
    /*-- Private helper methods for constructor: Codewords and masking --*/
    // Returns a new byte string representing the given data with the appropriate error correction
    // codewords appended to it, based on this object's version and error correction level.
    addEccAndInterleave(c) {
      const d = this.version, h = this.errorCorrectionLevel;
      if (c.length != Re.getNumDataCodewords(d, h))
        throw new RangeError("Invalid argument");
      const m = Re.NUM_ERROR_CORRECTION_BLOCKS[h.ordinal][d], f = Re.ECC_CODEWORDS_PER_BLOCK[h.ordinal][d], g = Math.floor(Re.getNumRawDataModules(d) / 8), p = m - g % m, v = Math.floor(g / m);
      let b = [];
      const w = Re.reedSolomonComputeDivisor(f);
      for (let k = 0, N = 0; k < m; k++) {
        let T = c.slice(N, N + v - f + (k < p ? 0 : 1));
        N += T.length;
        const _ = Re.reedSolomonComputeRemainder(T, w);
        k < p && T.push(0), b.push(T.concat(_));
      }
      let y = [];
      for (let k = 0; k < b[0].length; k++)
        b.forEach((N, T) => {
          (k != v - f || T >= p) && y.push(N[k]);
        });
      return i(y.length == g), y;
    }
    // Draws the given sequence of 8-bit codewords (data and error correction) onto the entire
    // data area of this QR Code. Function modules need to be marked off before this is called.
    drawCodewords(c) {
      if (c.length != Math.floor(Re.getNumRawDataModules(this.version) / 8))
        throw new RangeError("Invalid argument");
      let d = 0;
      for (let h = this.size - 1; h >= 1; h -= 2) {
        h == 6 && (h = 5);
        for (let m = 0; m < this.size; m++)
          for (let f = 0; f < 2; f++) {
            const g = h - f, v = (h + 1 & 2) == 0 ? this.size - 1 - m : m;
            !this.isFunction[v][g] && d < c.length * 8 && (this.modules[v][g] = a(c[d >>> 3], 7 - (d & 7)), d++);
          }
      }
      i(d == c.length * 8);
    }
    // XORs the codeword modules in this QR Code with the given mask pattern.
    // The function modules must be marked and the codeword bits must be drawn
    // before masking. Due to the arithmetic of XOR, calling applyMask() with
    // the same mask value a second time will undo the mask. A final well-formed
    // QR Code needs exactly one (not zero, two, etc.) mask applied.
    applyMask(c) {
      if (c < 0 || c > 7)
        throw new RangeError("Mask value out of range");
      for (let d = 0; d < this.size; d++)
        for (let h = 0; h < this.size; h++) {
          let m;
          switch (c) {
            case 0:
              m = (h + d) % 2 == 0;
              break;
            case 1:
              m = d % 2 == 0;
              break;
            case 2:
              m = h % 3 == 0;
              break;
            case 3:
              m = (h + d) % 3 == 0;
              break;
            case 4:
              m = (Math.floor(h / 3) + Math.floor(d / 2)) % 2 == 0;
              break;
            case 5:
              m = h * d % 2 + h * d % 3 == 0;
              break;
            case 6:
              m = (h * d % 2 + h * d % 3) % 2 == 0;
              break;
            case 7:
              m = ((h + d) % 2 + h * d % 3) % 2 == 0;
              break;
            default:
              throw new Error("Unreachable");
          }
          !this.isFunction[d][h] && m && (this.modules[d][h] = !this.modules[d][h]);
        }
    }
    // Calculates and returns the penalty score based on state of this QR Code's current modules.
    // This is used by the automatic mask choice algorithm to find the mask pattern that yields the lowest score.
    getPenaltyScore() {
      let c = 0;
      for (let f = 0; f < this.size; f++) {
        let g = !1, p = 0, v = [0, 0, 0, 0, 0, 0, 0];
        for (let b = 0; b < this.size; b++)
          this.modules[f][b] == g ? (p++, p == 5 ? c += Re.PENALTY_N1 : p > 5 && c++) : (this.finderPenaltyAddHistory(p, v), g || (c += this.finderPenaltyCountPatterns(v) * Re.PENALTY_N3), g = this.modules[f][b], p = 1);
        c += this.finderPenaltyTerminateAndCount(g, p, v) * Re.PENALTY_N3;
      }
      for (let f = 0; f < this.size; f++) {
        let g = !1, p = 0, v = [0, 0, 0, 0, 0, 0, 0];
        for (let b = 0; b < this.size; b++)
          this.modules[b][f] == g ? (p++, p == 5 ? c += Re.PENALTY_N1 : p > 5 && c++) : (this.finderPenaltyAddHistory(p, v), g || (c += this.finderPenaltyCountPatterns(v) * Re.PENALTY_N3), g = this.modules[b][f], p = 1);
        c += this.finderPenaltyTerminateAndCount(g, p, v) * Re.PENALTY_N3;
      }
      for (let f = 0; f < this.size - 1; f++)
        for (let g = 0; g < this.size - 1; g++) {
          const p = this.modules[f][g];
          p == this.modules[f][g + 1] && p == this.modules[f + 1][g] && p == this.modules[f + 1][g + 1] && (c += Re.PENALTY_N2);
        }
      let d = 0;
      for (const f of this.modules)
        d = f.reduce((g, p) => g + (p ? 1 : 0), d);
      const h = this.size * this.size, m = Math.ceil(Math.abs(d * 20 - h * 10) / h) - 1;
      return i(0 <= m && m <= 9), c += m * Re.PENALTY_N4, i(0 <= c && c <= 2568888), c;
    }
    /*-- Private helper functions --*/
    // Returns an ascending list of positions of alignment patterns for this version number.
    // Each position is in the range [0,177), and are used on both the x and y axes.
    // This could be implemented as lookup table of 40 variable-length lists of integers.
    getAlignmentPatternPositions() {
      if (this.version == 1)
        return [];
      {
        const c = Math.floor(this.version / 7) + 2, d = this.version == 32 ? 26 : Math.ceil((this.version * 4 + 4) / (c * 2 - 2)) * 2;
        let h = [6];
        for (let m = this.size - 7; h.length < c; m -= d)
          h.splice(1, 0, m);
        return h;
      }
    }
    // Returns the number of data bits that can be stored in a QR Code of the given version number, after
    // all function modules are excluded. This includes remainder bits, so it might not be a multiple of 8.
    // The result is in the range [208, 29648]. This could be implemented as a 40-entry lookup table.
    static getNumRawDataModules(c) {
      if (c < Re.MIN_VERSION || c > Re.MAX_VERSION)
        throw new RangeError("Version number out of range");
      let d = (16 * c + 128) * c + 64;
      if (c >= 2) {
        const h = Math.floor(c / 7) + 2;
        d -= (25 * h - 10) * h - 55, c >= 7 && (d -= 36);
      }
      return i(208 <= d && d <= 29648), d;
    }
    // Returns the number of 8-bit data (i.e. not error correction) codewords contained in any
    // QR Code of the given version number and error correction level, with remainder bits discarded.
    // This stateless pure function could be implemented as a (40*4)-cell lookup table.
    static getNumDataCodewords(c, d) {
      return Math.floor(Re.getNumRawDataModules(c) / 8) - Re.ECC_CODEWORDS_PER_BLOCK[d.ordinal][c] * Re.NUM_ERROR_CORRECTION_BLOCKS[d.ordinal][c];
    }
    // Returns a Reed-Solomon ECC generator polynomial for the given degree. This could be
    // implemented as a lookup table over all possible parameter values, instead of as an algorithm.
    static reedSolomonComputeDivisor(c) {
      if (c < 1 || c > 255)
        throw new RangeError("Degree out of range");
      let d = [];
      for (let m = 0; m < c - 1; m++)
        d.push(0);
      d.push(1);
      let h = 1;
      for (let m = 0; m < c; m++) {
        for (let f = 0; f < d.length; f++)
          d[f] = Re.reedSolomonMultiply(d[f], h), f + 1 < d.length && (d[f] ^= d[f + 1]);
        h = Re.reedSolomonMultiply(h, 2);
      }
      return d;
    }
    // Returns the Reed-Solomon error correction codeword for the given data and divisor polynomials.
    static reedSolomonComputeRemainder(c, d) {
      let h = d.map((m) => 0);
      for (const m of c) {
        const f = m ^ h.shift();
        h.push(0), d.forEach((g, p) => h[p] ^= Re.reedSolomonMultiply(g, f));
      }
      return h;
    }
    // Returns the product of the two given field elements modulo GF(2^8/0x11D). The arguments and result
    // are unsigned 8-bit integers. This could be implemented as a lookup table of 256*256 entries of uint8.
    static reedSolomonMultiply(c, d) {
      if (c >>> 8 || d >>> 8)
        throw new RangeError("Byte out of range");
      let h = 0;
      for (let m = 7; m >= 0; m--)
        h = h << 1 ^ (h >>> 7) * 285, h ^= (d >>> m & 1) * c;
      return i(h >>> 8 == 0), h;
    }
    // Can only be called immediately after a light run is added, and
    // returns either 0, 1, or 2. A helper function for getPenaltyScore().
    finderPenaltyCountPatterns(c) {
      const d = c[1];
      i(d <= this.size * 3);
      const h = d > 0 && c[2] == d && c[3] == d * 3 && c[4] == d && c[5] == d;
      return (h && c[0] >= d * 4 && c[6] >= d ? 1 : 0) + (h && c[6] >= d * 4 && c[0] >= d ? 1 : 0);
    }
    // Must be called at the end of a line (row or column) of modules. A helper function for getPenaltyScore().
    finderPenaltyTerminateAndCount(c, d, h) {
      return c && (this.finderPenaltyAddHistory(d, h), d = 0), d += this.size, this.finderPenaltyAddHistory(d, h), this.finderPenaltyCountPatterns(h);
    }
    // Pushes the given value to the front and drops the last value. A helper function for getPenaltyScore().
    finderPenaltyAddHistory(c, d) {
      d[0] == 0 && (c += this.size), d.pop(), d.unshift(c);
    }
  };
  t.MIN_VERSION = 1, t.MAX_VERSION = 40, t.PENALTY_N1 = 3, t.PENALTY_N2 = 3, t.PENALTY_N3 = 40, t.PENALTY_N4 = 10, t.ECC_CODEWORDS_PER_BLOCK = [
    // Version: (note that index 0 is for padding, and is set to an illegal value)
    //0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    // Low
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    // Medium
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    // Quartile
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
    // High
  ], t.NUM_ERROR_CORRECTION_BLOCKS = [
    // Version: (note that index 0 is for padding, and is set to an illegal value)
    //0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    // Low
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    // Medium
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    // Quartile
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
    // High
  ], e.QrCode = t;
  function r(u, c, d) {
    if (c < 0 || c > 31 || u >>> c)
      throw new RangeError("Value out of range");
    for (let h = c - 1; h >= 0; h--)
      d.push(u >>> h & 1);
  }
  function a(u, c) {
    return (u >>> c & 1) != 0;
  }
  function i(u) {
    if (!u)
      throw new Error("Assertion error");
  }
  const o = class qe {
    /*-- Constructor (low level) and fields --*/
    // Creates a new QR Code segment with the given attributes and data.
    // The character count (numChars) must agree with the mode and the bit buffer length,
    // but the constraint isn't checked. The given bit buffer is cloned and stored.
    constructor(c, d, h) {
      if (this.mode = c, this.numChars = d, this.bitData = h, d < 0)
        throw new RangeError("Invalid argument");
      this.bitData = h.slice();
    }
    /*-- Static factory functions (mid level) --*/
    // Returns a segment representing the given binary data encoded in
    // byte mode. All input byte arrays are acceptable. Any text string
    // can be converted to UTF-8 bytes and encoded as a byte mode segment.
    static makeBytes(c) {
      let d = [];
      for (const h of c)
        r(h, 8, d);
      return new qe(qe.Mode.BYTE, c.length, d);
    }
    // Returns a segment representing the given string of decimal digits encoded in numeric mode.
    static makeNumeric(c) {
      if (!qe.isNumeric(c))
        throw new RangeError("String contains non-numeric characters");
      let d = [];
      for (let h = 0; h < c.length; ) {
        const m = Math.min(c.length - h, 3);
        r(parseInt(c.substring(h, h + m), 10), m * 3 + 1, d), h += m;
      }
      return new qe(qe.Mode.NUMERIC, c.length, d);
    }
    // Returns a segment representing the given text string encoded in alphanumeric mode.
    // The characters allowed are: 0 to 9, A to Z (uppercase only), space,
    // dollar, percent, asterisk, plus, hyphen, period, slash, colon.
    static makeAlphanumeric(c) {
      if (!qe.isAlphanumeric(c))
        throw new RangeError("String contains unencodable characters in alphanumeric mode");
      let d = [], h;
      for (h = 0; h + 2 <= c.length; h += 2) {
        let m = qe.ALPHANUMERIC_CHARSET.indexOf(c.charAt(h)) * 45;
        m += qe.ALPHANUMERIC_CHARSET.indexOf(c.charAt(h + 1)), r(m, 11, d);
      }
      return h < c.length && r(qe.ALPHANUMERIC_CHARSET.indexOf(c.charAt(h)), 6, d), new qe(qe.Mode.ALPHANUMERIC, c.length, d);
    }
    // Returns a new mutable list of zero or more segments to represent the given Unicode text string.
    // The result may use various segment modes and switch modes to optimize the length of the bit stream.
    static makeSegments(c) {
      return c == "" ? [] : qe.isNumeric(c) ? [qe.makeNumeric(c)] : qe.isAlphanumeric(c) ? [qe.makeAlphanumeric(c)] : [qe.makeBytes(qe.toUtf8ByteArray(c))];
    }
    // Returns a segment representing an Extended Channel Interpretation
    // (ECI) designator with the given assignment value.
    static makeEci(c) {
      let d = [];
      if (c < 0)
        throw new RangeError("ECI assignment value out of range");
      if (c < 128)
        r(c, 8, d);
      else if (c < 16384)
        r(2, 2, d), r(c, 14, d);
      else if (c < 1e6)
        r(6, 3, d), r(c, 21, d);
      else
        throw new RangeError("ECI assignment value out of range");
      return new qe(qe.Mode.ECI, 0, d);
    }
    // Tests whether the given string can be encoded as a segment in numeric mode.
    // A string is encodable iff each character is in the range 0 to 9.
    static isNumeric(c) {
      return qe.NUMERIC_REGEX.test(c);
    }
    // Tests whether the given string can be encoded as a segment in alphanumeric mode.
    // A string is encodable iff each character is in the following set: 0 to 9, A to Z
    // (uppercase only), space, dollar, percent, asterisk, plus, hyphen, period, slash, colon.
    static isAlphanumeric(c) {
      return qe.ALPHANUMERIC_REGEX.test(c);
    }
    /*-- Methods --*/
    // Returns a new copy of the data bits of this segment.
    getData() {
      return this.bitData.slice();
    }
    // (Package-private) Calculates and returns the number of bits needed to encode the given segments at
    // the given version. The result is infinity if a segment has too many characters to fit its length field.
    static getTotalBits(c, d) {
      let h = 0;
      for (const m of c) {
        const f = m.mode.numCharCountBits(d);
        if (m.numChars >= 1 << f)
          return 1 / 0;
        h += 4 + f + m.bitData.length;
      }
      return h;
    }
    // Returns a new array of bytes representing the given string encoded in UTF-8.
    static toUtf8ByteArray(c) {
      c = encodeURI(c);
      let d = [];
      for (let h = 0; h < c.length; h++)
        c.charAt(h) != "%" ? d.push(c.charCodeAt(h)) : (d.push(parseInt(c.substring(h + 1, h + 3), 16)), h += 2);
      return d;
    }
  };
  o.NUMERIC_REGEX = /^[0-9]*$/, o.ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+.\/:-]*$/, o.ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
  let l = o;
  e.QrSegment = o;
})(Vr || (Vr = {}));
((e) => {
  ((t) => {
    const r = class {
      // The QR Code can tolerate about 30% erroneous codewords
      /*-- Constructor and fields --*/
      constructor(i, o) {
        this.ordinal = i, this.formatBits = o;
      }
    };
    r.LOW = new r(0, 1), r.MEDIUM = new r(1, 0), r.QUARTILE = new r(2, 3), r.HIGH = new r(3, 2), t.Ecc = r;
  })(e.QrCode || (e.QrCode = {}));
})(Vr || (Vr = {}));
((e) => {
  ((t) => {
    const r = class {
      /*-- Constructor and fields --*/
      constructor(i, o) {
        this.modeBits = i, this.numBitsCharCount = o;
      }
      /*-- Method --*/
      // (Package-private) Returns the bit width of the character count field for a segment in
      // this mode in a QR Code at the given version number. The result is in the range [0, 16].
      numCharCountBits(i) {
        return this.numBitsCharCount[Math.floor((i + 7) / 17)];
      }
    };
    r.NUMERIC = new r(1, [10, 12, 14]), r.ALPHANUMERIC = new r(2, [9, 11, 13]), r.BYTE = new r(4, [8, 16, 16]), r.KANJI = new r(8, [8, 10, 12]), r.ECI = new r(7, [0, 0, 0]), t.Mode = r;
  })(e.QrSegment || (e.QrSegment = {}));
})(Vr || (Vr = {}));
var on = Vr;
/**
 * @license qrcode.react
 * Copyright (c) Paul O'Shannessy
 * SPDX-License-Identifier: ISC
 */
var gx = {
  L: on.QrCode.Ecc.LOW,
  M: on.QrCode.Ecc.MEDIUM,
  Q: on.QrCode.Ecc.QUARTILE,
  H: on.QrCode.Ecc.HIGH
}, yu = 128, xu = "L", wu = "#FFFFFF", Nu = "#000000", Cu = !1, ku = 1, vx = 4, bx = 0, yx = 0.1;
function Su(e, t = 0) {
  const r = [];
  return e.forEach(function(a, i) {
    let o = null;
    a.forEach(function(l, u) {
      if (!l && o !== null) {
        r.push(
          `M${o + t} ${i + t}h${u - o}v1H${o + t}z`
        ), o = null;
        return;
      }
      if (u === a.length - 1) {
        if (!l)
          return;
        o === null ? r.push(`M${u + t},${i + t} h1v1H${u + t}z`) : r.push(
          `M${o + t},${i + t} h${u + 1 - o}v1H${o + t}z`
        );
        return;
      }
      l && o === null && (o = u);
    });
  }), r.join("");
}
function Eu(e, t) {
  return e.slice().map((r, a) => a < t.y || a >= t.y + t.h ? r : r.map((i, o) => o < t.x || o >= t.x + t.w ? i : !1));
}
function xx(e, t, r, a) {
  if (a == null)
    return null;
  const i = e.length + r * 2, o = Math.floor(t * yx), l = i / t, u = (a.width || o) * l, c = (a.height || o) * l, d = a.x == null ? e.length / 2 - u / 2 : a.x * l, h = a.y == null ? e.length / 2 - c / 2 : a.y * l, m = a.opacity == null ? 1 : a.opacity;
  let f = null;
  if (a.excavate) {
    let p = Math.floor(d), v = Math.floor(h), b = Math.ceil(u + d - p), w = Math.ceil(c + h - v);
    f = { x: p, y: v, w: b, h: w };
  }
  const g = a.crossOrigin;
  return { x: d, y: h, h: c, w: u, excavation: f, opacity: m, crossOrigin: g };
}
function wx(e, t) {
  return t != null ? Math.max(Math.floor(t), 0) : e ? vx : bx;
}
function Pu({
  value: e,
  level: t,
  minVersion: r,
  includeMargin: a,
  marginSize: i,
  imageSettings: o,
  size: l,
  boostLevel: u
}) {
  let c = B.useMemo(() => {
    const p = (Array.isArray(e) ? e : [e]).reduce((v, b) => (v.push(...on.QrSegment.makeSegments(b)), v), []);
    return on.QrCode.encodeSegments(
      p,
      gx[t],
      r,
      void 0,
      void 0,
      u
    );
  }, [e, t, r, u]);
  const { cells: d, margin: h, numCells: m, calculatedImageSettings: f } = B.useMemo(() => {
    let g = c.getModules();
    const p = wx(a, i), v = g.length + p * 2, b = xx(
      g,
      l,
      p,
      o
    );
    return {
      cells: g,
      margin: p,
      numCells: v,
      calculatedImageSettings: b
    };
  }, [c, l, o, a, i]);
  return {
    qrcode: c,
    margin: h,
    cells: d,
    numCells: m,
    calculatedImageSettings: f
  };
}
var Nx = (function() {
  try {
    new Path2D().addPath(new Path2D());
  } catch {
    return !1;
  }
  return !0;
})(), Cx = B.forwardRef(
  function(t, r) {
    const a = t, {
      value: i,
      size: o = yu,
      level: l = xu,
      bgColor: u = wu,
      fgColor: c = Nu,
      includeMargin: d = Cu,
      minVersion: h = ku,
      boostLevel: m,
      marginSize: f,
      imageSettings: g
    } = a, v = li(a, [
      "value",
      "size",
      "level",
      "bgColor",
      "fgColor",
      "includeMargin",
      "minVersion",
      "boostLevel",
      "marginSize",
      "imageSettings"
    ]), { style: b } = v, w = li(v, ["style"]), y = g?.src, k = B.useRef(null), N = B.useRef(null), T = B.useCallback(
      (A) => {
        k.current = A, typeof r == "function" ? r(A) : r && (r.current = A);
      },
      [r]
    ), [_, x] = B.useState(!1), { margin: R, cells: F, numCells: V, calculatedImageSettings: E } = Pu({
      value: i,
      level: l,
      minVersion: h,
      boostLevel: m,
      includeMargin: d,
      marginSize: f,
      imageSettings: g,
      size: o
    });
    B.useEffect(() => {
      if (k.current != null) {
        const A = k.current, U = A.getContext("2d");
        if (!U)
          return;
        let I = F;
        const Y = N.current, D = E != null && Y !== null && Y.complete && Y.naturalHeight !== 0 && Y.naturalWidth !== 0;
        D && E.excavation != null && (I = Eu(
          F,
          E.excavation
        ));
        const J = window.devicePixelRatio || 1;
        A.height = A.width = o * J;
        const we = o / V * J;
        U.scale(we, we), U.fillStyle = u, U.fillRect(0, 0, V, V), U.fillStyle = c, Nx ? U.fill(new Path2D(Su(I, R))) : F.forEach(function(he, be) {
          he.forEach(function(re, pe) {
            re && U.fillRect(pe + R, be + R, 1, 1);
          });
        }), E && (U.globalAlpha = E.opacity), D && U.drawImage(
          Y,
          E.x + R,
          E.y + R,
          E.w,
          E.h
        );
      }
    }), B.useEffect(() => {
      x(!1);
    }, [y]);
    const S = si({ height: o, width: o }, b);
    let $ = null;
    return y != null && ($ = /* @__PURE__ */ B.createElement(
      "img",
      {
        src: y,
        key: y,
        style: { display: "none" },
        onLoad: () => {
          x(!0);
        },
        ref: N,
        crossOrigin: E?.crossOrigin
      }
    )), /* @__PURE__ */ B.createElement(B.Fragment, null, /* @__PURE__ */ B.createElement(
      "canvas",
      si({
        style: S,
        height: o,
        width: o,
        ref: T,
        role: "img"
      }, w)
    ), $);
  }
);
Cx.displayName = "QRCodeCanvas";
var ci = B.forwardRef(
  function(t, r) {
    const a = t, {
      value: i,
      size: o = yu,
      level: l = xu,
      bgColor: u = wu,
      fgColor: c = Nu,
      includeMargin: d = Cu,
      minVersion: h = ku,
      boostLevel: m,
      title: f,
      marginSize: g,
      imageSettings: p
    } = a, v = li(a, [
      "value",
      "size",
      "level",
      "bgColor",
      "fgColor",
      "includeMargin",
      "minVersion",
      "boostLevel",
      "title",
      "marginSize",
      "imageSettings"
    ]), { margin: b, cells: w, numCells: y, calculatedImageSettings: k } = Pu({
      value: i,
      level: l,
      minVersion: h,
      boostLevel: m,
      includeMargin: d,
      marginSize: g,
      imageSettings: p,
      size: o
    });
    let N = w, T = null;
    p != null && k != null && (k.excavation != null && (N = Eu(
      w,
      k.excavation
    )), T = /* @__PURE__ */ B.createElement(
      "image",
      {
        href: p.src,
        height: k.h,
        width: k.w,
        x: k.x + b,
        y: k.y + b,
        preserveAspectRatio: "none",
        opacity: k.opacity,
        crossOrigin: k.crossOrigin
      }
    ));
    const _ = Su(N, b);
    return /* @__PURE__ */ B.createElement(
      "svg",
      si({
        height: o,
        width: o,
        viewBox: `0 0 ${y} ${y}`,
        ref: r,
        role: "img"
      }, v),
      !!f && /* @__PURE__ */ B.createElement("title", null, f),
      /* @__PURE__ */ B.createElement(
        "path",
        {
          fill: u,
          d: `M0,0 h${y}v${y}H0z`,
          shapeRendering: "crispEdges"
        }
      ),
      /* @__PURE__ */ B.createElement("path", { fill: c, d: _, shapeRendering: "crispEdges" }),
      T
    );
  }
);
ci.displayName = "QRCodeSVG";
const kx = "ayjigsnuwpivozwlblsl", Sx = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF5amlnc251d3Bpdm96d2xibHNsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMwMzE4OTksImV4cCI6MjA4ODYwNzg5OX0.u2qVC7WRdVu4Py1jaaW5nS4h6HYWKTzZMvF0B2invnQ", Ex = [
  {
    id: 1,
    companyName: "Brussels Taxi Co",
    vat: "BE0123456789",
    email: "contact@brusselstaxicom",
    city: "Brussels",
    numberOfCars: 8,
    status: "Pending",
    requestDate: "2026-02-20"
  },
  {
    id: 2,
    companyName: "Antwerp Cabs",
    vat: "BE0987654321",
    email: "info@antwerpcabs.be",
    city: "Antwerp",
    numberOfCars: 5,
    status: "Pending",
    requestDate: "2026-02-21"
  }
], rn = [
  {
    id: 1,
    name: "Demo Company",
    subdomain: "democompany.taxio.be",
    city: "Brussels",
    numberOfCars: 8,
    subscription: "Premium",
    subscriptionExpiry: "2026-12-31",
    monthlyFee: 50,
    carFee: 5,
    totalFee: 90,
    // 50 + (8 * 5)
    status: "Active",
    email: "contact@democompany.be",
    totalTrips: 342,
    nextInvoiceDate: "2026-03-05"
  },
  {
    id: 2,
    name: "City Taxi",
    subdomain: "citytaxi.taxio.be",
    city: "Antwerp",
    numberOfCars: 3,
    subscription: "Basic",
    subscriptionExpiry: "2026-06-30",
    monthlyFee: 30,
    carFee: 5,
    totalFee: 45,
    // 30 + (3 * 5)
    status: "Active",
    email: "info@citytaxi.be",
    totalTrips: 128,
    nextInvoiceDate: "2026-03-03"
  }
];
function Px() {
  const [e, t] = j(Ex), [r, a] = j(rn), [i, o] = j(!1), [l, u] = j(!1), [c, d] = j(null), [h, m] = j({ username: "", password: "" }), [f, g] = j(!1), [p, v] = j({
    baseFee: 0,
    numberOfCars: 0,
    carFee: 5,
    totalAmount: 0,
    invoiceDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
    dueDate: ""
  }), b = (S) => S.toLowerCase().replace(/\s+/g, "").replace(/[^a-z0-9]/g, "") + "_admin", w = () => {
    const S = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%";
    let $ = "";
    for (let A = 0; A < 12; A++)
      $ += S.charAt(Math.floor(Math.random() * S.length));
    return $;
  }, y = async (S, $) => {
    g(!0);
    try {
      const U = `https://${b(S.companyName).replace("_admin", "")}.taxio.be`, I = `${U}/login`, D = await (await fetch(
        `https://${kx}.supabase.co/functions/v1/make-server-1531e043/email/send-approval`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${Sx}`
          },
          body: JSON.stringify({
            companyName: S.companyName,
            companyEmail: S.email,
            websiteUrl: U,
            username: $.username,
            password: $.password,
            loginUrl: I
          })
        }
      )).json();
      if (D.success)
        de.success(`✅ Complete package sent to ${S.email}!`, {
          description: "Website URL, QR code, and login credentials delivered successfully",
          duration: 5e3
        }), u(!1);
      else
        throw new Error(D.error || "Failed to send email");
    } catch (A) {
      console.error("Error sending approval email:", A), de.error("Failed to send approval email", {
        description: A.message || "Please try again or contact support",
        duration: 5e3
      });
    } finally {
      g(!1);
    }
  }, k = (S) => {
    const $ = b(S.companyName), A = w();
    m({ username: $, password: A }), d(S), u(!0), t(e.map(
      (U) => U.id === S.id ? { ...U, status: "Approved" } : U
    )), de.success("Company request approved!");
  }, N = (S) => {
    t(e.map(
      ($) => $.id === S ? { ...$, status: "Rejected" } : $
    )), de.error("Company request rejected!");
  }, T = (S) => {
    a(r.map(
      (A) => A.id === S ? { ...A, status: "Suspended" } : A
    ));
    const $ = r.find((A) => A.id === S);
    de.error(`${$?.name} has been suspended due to non-compliance!`, {
      description: "All services have been disabled for this company.",
      duration: 5e3
    });
  }, _ = (S) => {
    a(r.map(
      (A) => A.id === S ? { ...A, status: "Active" } : A
    ));
    const $ = r.find((A) => A.id === S);
    de.success(`${$?.name} has been reactivated!`, {
      description: "All services are now available again.",
      duration: 5e3
    });
  }, x = (S) => {
    const $ = `https://www.google.com/maps/search/${encodeURIComponent(S)}`;
    de.success(`Opening Google Maps for: ${S}`), console.log("Google Maps URL:", $);
  }, R = (S) => {
    d(S), v({
      baseFee: S.monthlyFee,
      numberOfCars: S.numberOfCars,
      carFee: S.carFee,
      totalAmount: S.totalFee,
      invoiceDate: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      dueDate: S.nextInvoiceDate
    }), o(!0);
  }, F = () => {
    const S = p.baseFee + p.numberOfCars * p.carFee;
    v({ ...p, totalAmount: S }), de.success("Invoice updated successfully!");
  }, V = (S) => {
    de.success(`Invoice sent to ${S.email}!`);
  }, E = rn.reduce((S, $) => S + $.totalFee, 0);
  return /* @__PURE__ */ s("div", { className: "min-h-screen bg-gray-50", children: [
    /* @__PURE__ */ n("div", { className: "bg-gradient-to-r from-purple-600 to-indigo-600 text-white", children: /* @__PURE__ */ n("div", { className: "container mx-auto px-4 py-6", children: /* @__PURE__ */ s("div", { className: "flex justify-between items-center", children: [
      /* @__PURE__ */ s("div", { className: "flex items-center", children: [
        /* @__PURE__ */ n(zr, { className: "w-10 h-10 mr-3" }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ n("h1", { className: "text-3xl font-bold", children: "Platform Admin Dashboard" }),
          /* @__PURE__ */ n("p", { className: "text-purple-100", children: "Subscription & company management" })
        ] })
      ] }),
      /* @__PURE__ */ s("div", { className: "flex gap-3", children: [
        /* @__PURE__ */ n(Ve, { to: "/qr-codes", children: /* @__PURE__ */ s(W, { variant: "secondary", children: [
          /* @__PURE__ */ n(Fr, { className: "w-4 h-4 mr-2" }),
          "QR Codes"
        ] }) }),
        /* @__PURE__ */ n(Ve, { to: "/", children: /* @__PURE__ */ s(W, { variant: "secondary", children: [
          /* @__PURE__ */ n(mc, { className: "w-4 h-4 mr-2" }),
          "Logout"
        ] }) })
      ] })
    ] }) }) }),
    /* @__PURE__ */ s("div", { className: "container mx-auto px-4 py-8", children: [
      /* @__PURE__ */ s("div", { className: "grid md:grid-cols-4 gap-6 mb-8", children: [
        /* @__PURE__ */ n(ue, { children: /* @__PURE__ */ n(Ee, { className: "pt-6", children: /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ n("p", { className: "text-sm text-gray-600", children: "Pending Requests" }),
            /* @__PURE__ */ n("p", { className: "text-3xl font-bold text-blue-600", children: e.filter((S) => S.status === "Pending").length })
          ] }),
          /* @__PURE__ */ n(Wt, { className: "w-10 h-10 text-blue-600 opacity-20" })
        ] }) }) }),
        /* @__PURE__ */ n(ue, { children: /* @__PURE__ */ n(Ee, { className: "pt-6", children: /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ n("p", { className: "text-sm text-gray-600", children: "Active Companies" }),
            /* @__PURE__ */ n("p", { className: "text-3xl font-bold text-green-600", children: r.filter((S) => S.status === "Active").length })
          ] }),
          /* @__PURE__ */ n(Wt, { className: "w-10 h-10 text-green-600 opacity-20" })
        ] }) }) }),
        /* @__PURE__ */ n(ue, { children: /* @__PURE__ */ n(Ee, { className: "pt-6", children: /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ n("p", { className: "text-sm text-gray-600", children: "Total Cars" }),
            /* @__PURE__ */ n("p", { className: "text-3xl font-bold text-orange-600", children: r.reduce((S, $) => S + $.numberOfCars, 0) })
          ] }),
          /* @__PURE__ */ n(_e, { className: "w-10 h-10 text-orange-600 opacity-20" })
        ] }) }) }),
        /* @__PURE__ */ n(ue, { children: /* @__PURE__ */ n(Ee, { className: "pt-6", children: /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ n("p", { className: "text-sm text-gray-600", children: "Monthly Revenue" }),
            /* @__PURE__ */ s("p", { className: "text-3xl font-bold text-purple-600", children: [
              "€",
              E
            ] })
          ] }),
          /* @__PURE__ */ n(Va, { className: "w-10 h-10 text-purple-600 opacity-20" })
        ] }) }) })
      ] }),
      /* @__PURE__ */ s(Xi, { defaultValue: "company-requests", className: "space-y-4", children: [
        /* @__PURE__ */ s(Ja, { className: "grid w-full grid-cols-3", children: [
          /* @__PURE__ */ n(mt, { value: "company-requests", children: "Company Requests" }),
          /* @__PURE__ */ n(mt, { value: "companies", children: "Active Companies" }),
          /* @__PURE__ */ n(mt, { value: "subscriptions", children: "Subscriptions & Revenue" })
        ] }),
        /* @__PURE__ */ n(ht, { value: "company-requests", children: /* @__PURE__ */ s(ue, { children: [
          /* @__PURE__ */ s(ze, { children: [
            /* @__PURE__ */ n(je, { children: "New Company Requests" }),
            /* @__PURE__ */ n(Xe, { children: "Review and approve company registration requests" })
          ] }),
          /* @__PURE__ */ n(Ee, { children: /* @__PURE__ */ s(jn, { children: [
            /* @__PURE__ */ n(Wn, { children: /* @__PURE__ */ s(zt, { children: [
              /* @__PURE__ */ n(Ie, { children: "Company Name" }),
              /* @__PURE__ */ n(Ie, { children: "VAT Number" }),
              /* @__PURE__ */ n(Ie, { children: "Email" }),
              /* @__PURE__ */ n(Ie, { children: "City" }),
              /* @__PURE__ */ n(Ie, { children: "Number of Cars" }),
              /* @__PURE__ */ n(Ie, { children: "Request Date" }),
              /* @__PURE__ */ n(Ie, { children: "Status" }),
              /* @__PURE__ */ n(Ie, { children: "Actions" })
            ] }) }),
            /* @__PURE__ */ n(Un, { children: e.map((S) => /* @__PURE__ */ s(zt, { children: [
              /* @__PURE__ */ n(Te, { className: "font-medium", children: S.companyName }),
              /* @__PURE__ */ n(Te, { children: S.vat }),
              /* @__PURE__ */ n(Te, { children: S.email }),
              /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ s(
                W,
                {
                  variant: "link",
                  size: "sm",
                  onClick: () => x(S.city),
                  className: "p-0 h-auto",
                  children: [
                    /* @__PURE__ */ n(Pt, { className: "w-4 h-4 mr-1" }),
                    S.city
                  ]
                }
              ) }),
              /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ s(it, { variant: "outline", children: [
                /* @__PURE__ */ n(_e, { className: "w-3 h-3 mr-1" }),
                S.numberOfCars
              ] }) }),
              /* @__PURE__ */ n(Te, { children: S.requestDate }),
              /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ n(
                it,
                {
                  variant: S.status === "Approved" ? "default" : S.status === "Rejected" ? "destructive" : "secondary",
                  children: S.status
                }
              ) }),
              /* @__PURE__ */ n(Te, { children: S.status === "Pending" && /* @__PURE__ */ s("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ s(
                  W,
                  {
                    size: "sm",
                    onClick: () => k(S),
                    children: [
                      /* @__PURE__ */ n($s, { className: "w-4 h-4 mr-1" }),
                      "Approve"
                    ]
                  }
                ),
                /* @__PURE__ */ s(
                  W,
                  {
                    size: "sm",
                    variant: "destructive",
                    onClick: () => N(S.id),
                    children: [
                      /* @__PURE__ */ n(Rp, { className: "w-4 h-4 mr-1" }),
                      "Reject"
                    ]
                  }
                )
              ] }) })
            ] }, S.id)) })
          ] }) })
        ] }) }),
        /* @__PURE__ */ n(ht, { value: "companies", children: /* @__PURE__ */ s(ue, { children: [
          /* @__PURE__ */ s(ze, { children: [
            /* @__PURE__ */ n(je, { children: "Active Companies" }),
            /* @__PURE__ */ n(Xe, { children: "Overview of all registered taxi companies" })
          ] }),
          /* @__PURE__ */ n(Ee, { children: /* @__PURE__ */ s(jn, { children: [
            /* @__PURE__ */ n(Wn, { children: /* @__PURE__ */ s(zt, { children: [
              /* @__PURE__ */ n(Ie, { children: "Company Name" }),
              /* @__PURE__ */ n(Ie, { children: "Subdomain" }),
              /* @__PURE__ */ n(Ie, { children: "City" }),
              /* @__PURE__ */ n(Ie, { children: "Number of Cars" }),
              /* @__PURE__ */ n(Ie, { children: "Subscription" }),
              /* @__PURE__ */ n(Ie, { children: "Status" }),
              /* @__PURE__ */ n(Ie, { children: "Actions" })
            ] }) }),
            /* @__PURE__ */ n(Un, { children: r.map((S) => /* @__PURE__ */ s(zt, { className: S.status === "Suspended" ? "bg-red-50" : "", children: [
              /* @__PURE__ */ s(Te, { className: "font-medium", children: [
                S.name,
                S.status === "Suspended" && /* @__PURE__ */ n(it, { variant: "destructive", className: "ml-2 text-xs", children: "SUSPENDED" })
              ] }),
              /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ n(it, { variant: S.subscription === "Premium" ? "default" : "secondary", children: S.subscription }) }),
              /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ s(it, { variant: "outline", children: [
                /* @__PURE__ */ n(_e, { className: "w-3 h-3 mr-1" }),
                S.numberOfCars
              ] }) }),
              /* @__PURE__ */ s(Te, { children: [
                "€",
                S.monthlyFee
              ] }),
              /* @__PURE__ */ s(Te, { children: [
                "€",
                S.numberOfCars * S.carFee,
                /* @__PURE__ */ s("span", { className: "text-xs text-gray-500 ml-1", children: [
                  "(",
                  S.numberOfCars,
                  " × €",
                  S.carFee,
                  ")"
                ] })
              ] }),
              /* @__PURE__ */ s(Te, { className: "font-bold text-green-600", children: [
                "€",
                S.totalFee
              ] }),
              /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ s(it, { variant: "outline", className: "bg-blue-50", children: [
                S.totalTrips,
                " trips"
              ] }) }),
              /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ n("span", { className: "text-sm text-gray-600", children: S.nextInvoiceDate }) }),
              /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ s("div", { className: "flex gap-2 flex-wrap", children: [
                /* @__PURE__ */ s(
                  W,
                  {
                    size: "sm",
                    variant: "outline",
                    onClick: () => R(S),
                    children: [
                      /* @__PURE__ */ n(Ha, { className: "w-4 h-4 mr-1" }),
                      "View/Edit"
                    ]
                  }
                ),
                /* @__PURE__ */ s(
                  W,
                  {
                    size: "sm",
                    onClick: () => V(S),
                    className: "bg-green-600 hover:bg-green-700 text-white",
                    children: [
                      /* @__PURE__ */ n(Pa, { className: "w-4 h-4 mr-1" }),
                      "Send"
                    ]
                  }
                ),
                S.status === "Active" ? /* @__PURE__ */ s(
                  W,
                  {
                    size: "sm",
                    variant: "destructive",
                    onClick: () => T(S.id),
                    children: [
                      /* @__PURE__ */ n(up, { className: "w-4 h-4 mr-1" }),
                      "Suspend"
                    ]
                  }
                ) : /* @__PURE__ */ s(
                  W,
                  {
                    size: "sm",
                    variant: "default",
                    onClick: () => _(S.id),
                    className: "bg-green-600 hover:bg-green-700",
                    children: [
                      /* @__PURE__ */ n(tg, { className: "w-4 h-4 mr-1" }),
                      "Reactivate"
                    ]
                  }
                )
              ] }) })
            ] }, S.id)) })
          ] }) })
        ] }) }),
        /* @__PURE__ */ n(ht, { value: "subscriptions", children: /* @__PURE__ */ s(ue, { children: [
          /* @__PURE__ */ s(ze, { children: [
            /* @__PURE__ */ n(je, { children: "Subscription Status & Revenue" }),
            /* @__PURE__ */ n(Xe, { children: "Monitor company subscriptions and calculate fees" })
          ] }),
          /* @__PURE__ */ s(Ee, { children: [
            /* @__PURE__ */ s(jn, { children: [
              /* @__PURE__ */ n(Wn, { children: /* @__PURE__ */ s(zt, { children: [
                /* @__PURE__ */ n(Ie, { children: "Company Name" }),
                /* @__PURE__ */ n(Ie, { children: "Subscription Plan" }),
                /* @__PURE__ */ n(Ie, { children: "Number of Cars" }),
                /* @__PURE__ */ n(Ie, { children: "Base Fee" }),
                /* @__PURE__ */ n(Ie, { children: "Car Fee (€5/car)" }),
                /* @__PURE__ */ n(Ie, { children: "Total Monthly" }),
                /* @__PURE__ */ n(Ie, { children: "Total Trips" }),
                /* @__PURE__ */ n(Ie, { children: "Next Invoice Date" }),
                /* @__PURE__ */ n(Ie, { children: "Actions" })
              ] }) }),
              /* @__PURE__ */ n(Un, { children: rn.map((S) => /* @__PURE__ */ s(zt, { children: [
                /* @__PURE__ */ n(Te, { className: "font-medium", children: S.name }),
                /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ n(it, { variant: S.subscription === "Premium" ? "default" : "secondary", children: S.subscription }) }),
                /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ s(it, { variant: "outline", children: [
                  /* @__PURE__ */ n(_e, { className: "w-3 h-3 mr-1" }),
                  S.numberOfCars
                ] }) }),
                /* @__PURE__ */ s(Te, { children: [
                  "€",
                  S.monthlyFee
                ] }),
                /* @__PURE__ */ s(Te, { children: [
                  "€",
                  S.numberOfCars * S.carFee,
                  /* @__PURE__ */ s("span", { className: "text-xs text-gray-500 ml-1", children: [
                    "(",
                    S.numberOfCars,
                    " × €",
                    S.carFee,
                    ")"
                  ] })
                ] }),
                /* @__PURE__ */ s(Te, { className: "font-bold text-green-600", children: [
                  "€",
                  S.totalFee
                ] }),
                /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ s(it, { variant: "outline", className: "bg-blue-50", children: [
                  S.totalTrips,
                  " trips"
                ] }) }),
                /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ n("span", { className: "text-sm text-gray-600", children: S.nextInvoiceDate }) }),
                /* @__PURE__ */ n(Te, { children: /* @__PURE__ */ s("div", { className: "flex gap-2", children: [
                  /* @__PURE__ */ s(
                    W,
                    {
                      size: "sm",
                      variant: "outline",
                      onClick: () => R(S),
                      children: [
                        /* @__PURE__ */ n(Ha, { className: "w-4 h-4 mr-1" }),
                        "View/Edit"
                      ]
                    }
                  ),
                  /* @__PURE__ */ s(
                    W,
                    {
                      size: "sm",
                      onClick: () => V(S),
                      className: "bg-green-600 hover:bg-green-700 text-white",
                      children: [
                        /* @__PURE__ */ n(Pa, { className: "w-4 h-4 mr-1" }),
                        "Send"
                      ]
                    }
                  )
                ] }) })
              ] }, S.id)) })
            ] }),
            /* @__PURE__ */ s("div", { className: "mt-6 grid md:grid-cols-4 gap-4", children: [
              /* @__PURE__ */ s("div", { className: "p-4 bg-blue-50 rounded-lg border border-blue-200", children: [
                /* @__PURE__ */ n("h4", { className: "font-semibold text-blue-900 mb-2", children: "Premium Plans" }),
                /* @__PURE__ */ n("p", { className: "text-2xl font-bold text-blue-600", children: rn.filter((S) => S.subscription === "Premium").length }),
                /* @__PURE__ */ n("p", { className: "text-sm text-blue-700", children: "Companies" })
              ] }),
              /* @__PURE__ */ s("div", { className: "p-4 bg-green-50 rounded-lg border border-green-200", children: [
                /* @__PURE__ */ n("h4", { className: "font-semibold text-green-900 mb-2", children: "Basic Plans" }),
                /* @__PURE__ */ n("p", { className: "text-2xl font-bold text-green-600", children: rn.filter((S) => S.subscription === "Basic").length }),
                /* @__PURE__ */ n("p", { className: "text-sm text-green-700", children: "Companies" })
              ] }),
              /* @__PURE__ */ s("div", { className: "p-4 bg-orange-50 rounded-lg border border-orange-200", children: [
                /* @__PURE__ */ n("h4", { className: "font-semibold text-orange-900 mb-2", children: "Total Cars" }),
                /* @__PURE__ */ n("p", { className: "text-2xl font-bold text-orange-600", children: rn.reduce((S, $) => S + $.numberOfCars, 0) }),
                /* @__PURE__ */ n("p", { className: "text-sm text-orange-700", children: "Fleet Size" })
              ] }),
              /* @__PURE__ */ s("div", { className: "p-4 bg-purple-50 rounded-lg border border-purple-200", children: [
                /* @__PURE__ */ n("h4", { className: "font-semibold text-purple-900 mb-2", children: "Total Revenue" }),
                /* @__PURE__ */ s("p", { className: "text-2xl font-bold text-purple-600", children: [
                  "€",
                  E
                ] }),
                /* @__PURE__ */ n("p", { className: "text-sm text-purple-700", children: "Per Month" })
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: "mt-6 p-4 bg-gray-50 rounded-lg border", children: [
              /* @__PURE__ */ n("h4", { className: "font-semibold mb-3", children: "Pricing Structure" }),
              /* @__PURE__ */ s("div", { className: "space-y-2 text-sm", children: [
                /* @__PURE__ */ s("p", { children: [
                  /* @__PURE__ */ n("strong", { children: "Basic Plan:" }),
                  " €30/month (base fee)"
                ] }),
                /* @__PURE__ */ s("p", { children: [
                  /* @__PURE__ */ n("strong", { children: "Premium Plan:" }),
                  " €50/month (base fee)"
                ] }),
                /* @__PURE__ */ s("p", { children: [
                  /* @__PURE__ */ n("strong", { children: "Additional Cars:" }),
                  " €5 per car per month"
                ] }),
                /* @__PURE__ */ s("p", { className: "text-gray-600 mt-3 pt-3 border-t", children: [
                  /* @__PURE__ */ n("strong", { children: "Example:" }),
                  " Premium plan with 8 cars = €50 + (8 × €5) = €90/month"
                ] })
              ] })
            ] })
          ] })
        ] }) })
      ] })
    ] }),
    /* @__PURE__ */ n(gr, { open: i, onOpenChange: o, children: /* @__PURE__ */ s(vr, { className: "max-w-4xl max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ n(br, { children: /* @__PURE__ */ n(yr, { className: "sr-only", children: "Invoice" }) }),
      /* @__PURE__ */ s("div", { className: "bg-white p-8 rounded-lg", id: "invoice-content", children: [
        /* @__PURE__ */ s("div", { className: "flex justify-between items-start mb-8 pb-6 border-b-2 border-gray-200", children: [
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ s("div", { className: "flex items-center gap-3 mb-2", children: [
              /* @__PURE__ */ n("div", { className: "w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-400 to-yellow-500 flex items-center justify-center", children: /* @__PURE__ */ n(_e, { className: "w-6 h-6 text-slate-900" }) }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n("h1", { className: "text-3xl font-bold text-slate-900", children: "TAXIO" }),
                /* @__PURE__ */ n("p", { className: "text-sm text-gray-600", children: "Taxi Management Platform" })
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: "text-sm text-gray-600 mt-3", children: [
              /* @__PURE__ */ n("p", { className: "font-semibold", children: "TAXIO Platform" }),
              /* @__PURE__ */ n("p", { children: "VAT: BE0123456789" }),
              /* @__PURE__ */ n("p", { children: "Brussels, Belgium" }),
              /* @__PURE__ */ n("p", { children: "Email: billing@taxio.com" }),
              /* @__PURE__ */ n("p", { children: "Phone: +32 2 123 45 67" })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { className: "text-right", children: [
            /* @__PURE__ */ n("h2", { className: "text-2xl font-bold text-slate-900 mb-2", children: "INVOICE" }),
            /* @__PURE__ */ s("div", { className: "text-sm text-gray-600", children: [
              /* @__PURE__ */ s("p", { className: "font-semibold", children: [
                "Invoice #: INV-",
                c?.id,
                "-",
                (/* @__PURE__ */ new Date()).getFullYear()
              ] }),
              /* @__PURE__ */ s("p", { children: [
                "Date: ",
                p.invoiceDate
              ] }),
              /* @__PURE__ */ s("p", { children: [
                "Due Date: ",
                p.dueDate
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: "mb-8", children: [
          /* @__PURE__ */ n("h3", { className: "text-sm font-bold text-gray-700 uppercase mb-3", children: "Bill To:" }),
          /* @__PURE__ */ s("div", { className: "bg-gray-50 p-4 rounded-lg", children: [
            /* @__PURE__ */ n("p", { className: "font-bold text-lg text-slate-900", children: c?.name }),
            /* @__PURE__ */ s("p", { className: "text-sm text-gray-600", children: [
              "VAT: ",
              c?.id === 1 ? "BE0987654321" : "BE0456789123"
            ] }),
            /* @__PURE__ */ s("p", { className: "text-sm text-gray-600", children: [
              c?.city,
              ", Belgium"
            ] }),
            /* @__PURE__ */ s("p", { className: "text-sm text-gray-600", children: [
              "Email: ",
              c?.email
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: "mb-8", children: [
          /* @__PURE__ */ s("table", { className: "w-full", children: [
            /* @__PURE__ */ n("thead", { className: "bg-slate-900 text-white", children: /* @__PURE__ */ s("tr", { children: [
              /* @__PURE__ */ n("th", { className: "text-left py-3 px-4", children: "Description" }),
              /* @__PURE__ */ n("th", { className: "text-right py-3 px-4", children: "Quantity" }),
              /* @__PURE__ */ n("th", { className: "text-right py-3 px-4", children: "Unit Price" }),
              /* @__PURE__ */ n("th", { className: "text-right py-3 px-4", children: "Amount" })
            ] }) }),
            /* @__PURE__ */ s("tbody", { children: [
              /* @__PURE__ */ s("tr", { className: "border-b border-gray-200", children: [
                /* @__PURE__ */ n("td", { className: "py-4 px-4", children: /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ s("p", { className: "font-semibold", children: [
                    c?.subscription,
                    " Subscription Plan"
                  ] }),
                  /* @__PURE__ */ n("p", { className: "text-sm text-gray-600", children: "Monthly platform access" })
                ] }) }),
                /* @__PURE__ */ n("td", { className: "text-right py-4 px-4", children: /* @__PURE__ */ n(
                  q,
                  {
                    type: "number",
                    value: 1,
                    readOnly: !0,
                    className: "w-20 text-right"
                  }
                ) }),
                /* @__PURE__ */ n("td", { className: "text-right py-4 px-4", children: /* @__PURE__ */ s("div", { className: "flex items-center justify-end gap-1", children: [
                  /* @__PURE__ */ n("span", { children: "€" }),
                  /* @__PURE__ */ n(
                    q,
                    {
                      type: "number",
                      value: p.baseFee,
                      onChange: (S) => v({ ...p, baseFee: parseFloat(S.target.value) }),
                      className: "w-24 text-right"
                    }
                  )
                ] }) }),
                /* @__PURE__ */ s("td", { className: "text-right py-4 px-4 font-semibold", children: [
                  "€",
                  p.baseFee.toFixed(2)
                ] })
              ] }),
              /* @__PURE__ */ s("tr", { className: "border-b border-gray-200", children: [
                /* @__PURE__ */ n("td", { className: "py-4 px-4", children: /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n("p", { className: "font-semibold", children: "Vehicle Management Fee" }),
                  /* @__PURE__ */ n("p", { className: "text-sm text-gray-600", children: "Per vehicle per month" })
                ] }) }),
                /* @__PURE__ */ n("td", { className: "text-right py-4 px-4", children: /* @__PURE__ */ n(
                  q,
                  {
                    type: "number",
                    value: p.numberOfCars,
                    onChange: (S) => v({ ...p, numberOfCars: parseInt(S.target.value) }),
                    className: "w-20 text-right"
                  }
                ) }),
                /* @__PURE__ */ n("td", { className: "text-right py-4 px-4", children: /* @__PURE__ */ s("div", { className: "flex items-center justify-end gap-1", children: [
                  /* @__PURE__ */ n("span", { children: "€" }),
                  /* @__PURE__ */ n(
                    q,
                    {
                      type: "number",
                      value: p.carFee,
                      onChange: (S) => v({ ...p, carFee: parseFloat(S.target.value) }),
                      className: "w-24 text-right"
                    }
                  )
                ] }) }),
                /* @__PURE__ */ s("td", { className: "text-right py-4 px-4 font-semibold", children: [
                  "€",
                  (p.numberOfCars * p.carFee).toFixed(2)
                ] })
              ] })
            ] })
          ] }),
          /* @__PURE__ */ n("div", { className: "flex justify-end mt-6", children: /* @__PURE__ */ s("div", { className: "w-64", children: [
            /* @__PURE__ */ s("div", { className: "flex justify-between py-2 text-gray-700", children: [
              /* @__PURE__ */ n("span", { children: "Subtotal:" }),
              /* @__PURE__ */ s("span", { children: [
                "€",
                (p.baseFee + p.numberOfCars * p.carFee).toFixed(2)
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: "flex justify-between py-2 text-gray-700", children: [
              /* @__PURE__ */ n("span", { children: "VAT (21%):" }),
              /* @__PURE__ */ s("span", { children: [
                "€",
                ((p.baseFee + p.numberOfCars * p.carFee) * 0.21).toFixed(2)
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: "flex justify-between py-3 border-t-2 border-gray-300 font-bold text-lg", children: [
              /* @__PURE__ */ n("span", { children: "Total:" }),
              /* @__PURE__ */ s("span", { className: "text-green-600", children: [
                "€",
                ((p.baseFee + p.numberOfCars * p.carFee) * 1.21).toFixed(2)
              ] })
            ] })
          ] }) })
        ] }),
        /* @__PURE__ */ s("div", { className: "grid md:grid-cols-2 gap-6 mb-6", children: [
          /* @__PURE__ */ s("div", { className: "bg-blue-50 p-6 rounded-lg border border-blue-200", children: [
            /* @__PURE__ */ s("h3", { className: "font-bold text-slate-900 mb-4 flex items-center gap-2", children: [
              /* @__PURE__ */ n(Va, { className: "w-5 h-5 text-blue-600" }),
              "Payment Details"
            ] }),
            /* @__PURE__ */ s("div", { className: "space-y-2 text-sm", children: [
              /* @__PURE__ */ s("p", { children: [
                /* @__PURE__ */ n("strong", { children: "Bank:" }),
                " KBC Bank"
              ] }),
              /* @__PURE__ */ s("p", { children: [
                /* @__PURE__ */ n("strong", { children: "Account Name:" }),
                " TAXIO BVBA"
              ] }),
              /* @__PURE__ */ s("p", { children: [
                /* @__PURE__ */ n("strong", { children: "IBAN:" }),
                " BE68 5390 0754 7034"
              ] }),
              /* @__PURE__ */ s("p", { children: [
                /* @__PURE__ */ n("strong", { children: "BIC/SWIFT:" }),
                " KREDBEBB"
              ] }),
              /* @__PURE__ */ s("p", { className: "pt-2 text-xs text-gray-600", children: [
                "Reference: INV-",
                c?.id,
                "-",
                (/* @__PURE__ */ new Date()).getFullYear()
              ] })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { className: "bg-gray-50 p-6 rounded-lg border border-gray-200 flex flex-col items-center justify-center", children: [
            /* @__PURE__ */ n("h3", { className: "font-bold text-slate-900 mb-4 text-center", children: "Scan to Pay" }),
            /* @__PURE__ */ n("div", { className: "bg-white p-4 rounded-lg shadow-sm", children: /* @__PURE__ */ n(
              ci,
              {
                value: `BCD
001
1
SCT
KREDBEBB
TAXIO BVBA
BE68539007547034
EUR${((p.baseFee + p.numberOfCars * p.carFee) * 1.21).toFixed(2)}


INV-${c?.id}-${(/* @__PURE__ */ new Date()).getFullYear()}`,
                size: 140,
                level: "M",
                includeMargin: !1
              }
            ) }),
            /* @__PURE__ */ n("p", { className: "text-xs text-gray-600 mt-3 text-center", children: "European Payment QR Code" })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: "bg-gray-50 p-4 rounded-lg border border-gray-200 mb-6", children: [
          /* @__PURE__ */ n("h3", { className: "font-bold text-slate-900 mb-2 text-sm", children: "Payment Terms:" }),
          /* @__PURE__ */ n("p", { className: "text-xs text-gray-600", children: "Payment is due within 30 days from the invoice date. Late payments may incur a 2% monthly interest charge. Services may be suspended for accounts overdue by more than 15 days." })
        ] }),
        /* @__PURE__ */ s("div", { className: "text-center text-xs text-gray-500 pt-6 border-t border-gray-200", children: [
          /* @__PURE__ */ n("p", { children: "Thank you for your business!" }),
          /* @__PURE__ */ n("p", { className: "mt-1", children: "TAXIO Platform - Empowering Taxi Companies | www.taxio.com" })
        ] })
      ] }),
      /* @__PURE__ */ s("div", { className: "flex justify-between items-center gap-3 mt-6 pt-4 border-t", children: [
        /* @__PURE__ */ s("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ s(
            W,
            {
              type: "button",
              variant: "outline",
              size: "sm",
              onClick: () => window.print(),
              children: [
                /* @__PURE__ */ n(fc, { className: "w-4 h-4 mr-2" }),
                "Print"
              ]
            }
          ),
          /* @__PURE__ */ s(
            W,
            {
              type: "button",
              variant: "outline",
              size: "sm",
              onClick: () => de.success("Invoice downloaded!"),
              children: [
                /* @__PURE__ */ n(qn, { className: "w-4 h-4 mr-2" }),
                "Download PDF"
              ]
            }
          )
        ] }),
        /* @__PURE__ */ s("div", { className: "flex gap-2", children: [
          /* @__PURE__ */ n(
            W,
            {
              type: "button",
              variant: "outline",
              onClick: () => {
                F();
              },
              children: "Save Changes"
            }
          ),
          /* @__PURE__ */ s(
            W,
            {
              type: "button",
              className: "bg-green-600 hover:bg-green-700 text-white",
              onClick: () => {
                V(c), o(!1);
              },
              children: [
                /* @__PURE__ */ n(Pa, { className: "w-4 h-4 mr-2" }),
                "Send Invoice"
              ]
            }
          )
        ] })
      ] })
    ] }) }),
    /* @__PURE__ */ n(gr, { open: l, onOpenChange: u, children: /* @__PURE__ */ s(vr, { className: "sm:max-w-[700px] max-h-[90vh] overflow-y-auto", children: [
      /* @__PURE__ */ s(br, { children: [
        /* @__PURE__ */ n("div", { className: "flex justify-center mb-4", children: /* @__PURE__ */ n("div", { className: "w-16 h-16 bg-green-100 rounded-full flex items-center justify-center", children: /* @__PURE__ */ n($s, { className: "w-10 h-10 text-green-600" }) }) }),
        /* @__PURE__ */ n(yr, { className: "text-2xl font-bold text-center", children: "Company Approved!" }),
        /* @__PURE__ */ s(zn, { className: "text-center space-y-4 pt-4", children: [
          /* @__PURE__ */ s("p", { className: "text-base", children: [
            /* @__PURE__ */ n("strong", { children: c?.companyName }),
            " has been approved successfully!"
          ] }),
          /* @__PURE__ */ n("p", { className: "text-sm text-gray-600", children: "Login credentials and website link have been generated. Share everything below with the company owner." })
        ] })
      ] }),
      /* @__PURE__ */ s("div", { className: "space-y-6 mt-6", children: [
        /* @__PURE__ */ s("div", { className: "bg-blue-50 border border-blue-200 rounded-lg p-4", children: [
          /* @__PURE__ */ n("h3", { className: "font-semibold text-blue-900 mb-3", children: "Company Details" }),
          /* @__PURE__ */ s("div", { className: "space-y-2 text-sm", children: [
            /* @__PURE__ */ s("p", { children: [
              /* @__PURE__ */ n("strong", { children: "Company:" }),
              " ",
              c?.companyName
            ] }),
            /* @__PURE__ */ s("p", { children: [
              /* @__PURE__ */ n("strong", { children: "Email:" }),
              " ",
              c?.email
            ] }),
            /* @__PURE__ */ s("p", { children: [
              /* @__PURE__ */ n("strong", { children: "VAT:" }),
              " ",
              c?.vat
            ] }),
            /* @__PURE__ */ s("p", { children: [
              /* @__PURE__ */ n("strong", { children: "City:" }),
              " ",
              c?.city
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: "bg-gradient-to-br from-yellow-50 to-orange-50 border-2 border-yellow-300 rounded-lg p-5", children: [
          /* @__PURE__ */ n("h3", { className: "font-semibold text-yellow-900 mb-3 flex items-center gap-2", children: "🌐 Your Website is Ready!" }),
          /* @__PURE__ */ s("div", { className: "grid md:grid-cols-2 gap-4", children: [
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ n(X, { className: "text-sm font-medium text-gray-700 mb-2 block", children: "Website URL" }),
              /* @__PURE__ */ s("div", { className: "flex gap-2", children: [
                /* @__PURE__ */ n(
                  q,
                  {
                    type: "text",
                    value: `https://${b(c?.companyName || "").replace("_admin", "")}.taxio.be`,
                    readOnly: !0,
                    className: "font-mono bg-white text-blue-600 font-semibold"
                  }
                ),
                /* @__PURE__ */ n(
                  W,
                  {
                    type: "button",
                    variant: "outline",
                    size: "sm",
                    onClick: () => {
                      navigator.clipboard.writeText(`https://${b(c?.companyName || "").replace("_admin", "")}.taxio.be`), de.success("Website URL copied to clipboard!");
                    },
                    children: "Copy"
                  }
                )
              ] }),
              /* @__PURE__ */ s("p", { className: "text-xs text-gray-600 mt-3 leading-relaxed", children: [
                "✨ ",
                /* @__PURE__ */ n("strong", { children: "Share this website with your customers!" }),
                " They can book rides directly through your branded page."
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: "flex flex-col items-center justify-center bg-white p-4 rounded-lg border-2 border-yellow-200", children: [
              /* @__PURE__ */ n("p", { className: "text-xs font-semibold text-gray-700 mb-2", children: "Scan to Visit Website" }),
              /* @__PURE__ */ n("div", { className: "bg-white p-3 rounded-lg shadow-sm", children: /* @__PURE__ */ n(
                ci,
                {
                  value: `https://${b(c?.companyName || "").replace("_admin", "")}.taxio.be`,
                  size: 120,
                  level: "H",
                  includeMargin: !1
                }
              ) }),
              /* @__PURE__ */ n("p", { className: "text-xs text-gray-500 mt-2 text-center", children: "Share this QR code with customers" })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: "bg-green-50 border border-green-200 rounded-lg p-4", children: [
          /* @__PURE__ */ n("h3", { className: "font-semibold text-green-900 mb-3", children: "🔐 Login Credentials (Admin Access)" }),
          /* @__PURE__ */ s("div", { className: "space-y-4", children: [
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ n(X, { className: "text-sm font-medium text-gray-700", children: "Username" }),
              /* @__PURE__ */ s("div", { className: "flex gap-2 mt-1", children: [
                /* @__PURE__ */ n(
                  q,
                  {
                    type: "text",
                    value: h.username,
                    readOnly: !0,
                    className: "font-mono bg-white"
                  }
                ),
                /* @__PURE__ */ n(
                  W,
                  {
                    type: "button",
                    variant: "outline",
                    size: "sm",
                    onClick: () => {
                      navigator.clipboard.writeText(h.username), de.success("Username copied to clipboard!");
                    },
                    children: "Copy"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ n(X, { className: "text-sm font-medium text-gray-700", children: "Password (Temporary)" }),
              /* @__PURE__ */ s("div", { className: "flex gap-2 mt-1", children: [
                /* @__PURE__ */ n(
                  q,
                  {
                    type: "text",
                    value: h.password,
                    readOnly: !0,
                    className: "font-mono bg-white"
                  }
                ),
                /* @__PURE__ */ n(
                  W,
                  {
                    type: "button",
                    variant: "outline",
                    size: "sm",
                    onClick: () => {
                      navigator.clipboard.writeText(h.password), de.success("Password copied to clipboard!");
                    },
                    children: "Copy"
                  }
                )
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: "pt-2", children: [
              /* @__PURE__ */ n(X, { className: "text-sm font-medium text-gray-700", children: "Login Page" }),
              /* @__PURE__ */ s("div", { className: "flex gap-2 mt-1", children: [
                /* @__PURE__ */ n(
                  q,
                  {
                    type: "text",
                    value: `https://${b(c?.companyName || "").replace("_admin", "")}.taxio.be/login`,
                    readOnly: !0,
                    className: "font-mono bg-white text-sm"
                  }
                ),
                /* @__PURE__ */ n(
                  W,
                  {
                    type: "button",
                    variant: "outline",
                    size: "sm",
                    onClick: () => {
                      navigator.clipboard.writeText(`https://${b(c?.companyName || "").replace("_admin", "")}.taxio.be/login`), de.success("Login URL copied!");
                    },
                    children: "Copy"
                  }
                )
              ] })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: "bg-purple-50 border border-purple-200 rounded-lg p-4", children: [
          /* @__PURE__ */ s("h3", { className: "font-semibold text-purple-900 mb-2 flex items-center gap-2", children: [
            /* @__PURE__ */ n(Sr, { className: "w-4 h-4" }),
            "What to Send to the Company"
          ] }),
          /* @__PURE__ */ s("ul", { className: "text-sm text-gray-700 space-y-2 list-disc list-inside", children: [
            /* @__PURE__ */ s("li", { children: [
              /* @__PURE__ */ n("strong", { children: "Website URL" }),
              " - Their branded page for customers to book rides"
            ] }),
            /* @__PURE__ */ s("li", { children: [
              /* @__PURE__ */ n("strong", { children: "QR Code" }),
              " - For easy sharing on social media, business cards, etc."
            ] }),
            /* @__PURE__ */ s("li", { children: [
              /* @__PURE__ */ n("strong", { children: "Login credentials" }),
              " - Username and temporary password for admin access"
            ] }),
            /* @__PURE__ */ s("li", { children: [
              /* @__PURE__ */ n("strong", { children: "Login page link" }),
              " - Where they access their dashboard"
            ] }),
            /* @__PURE__ */ s("li", { className: "pt-2 border-t border-purple-200 mt-2", children: [
              "💡 Encourage them to ",
              /* @__PURE__ */ n("strong", { children: "start sharing their website" }),
              " to get bookings!"
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: "bg-yellow-50 border border-yellow-200 rounded-lg p-4", children: [
          /* @__PURE__ */ n("h3", { className: "font-semibold text-yellow-900 mb-2 flex items-center gap-2", children: "🔒 Security Information" }),
          /* @__PURE__ */ s("ul", { className: "text-sm text-gray-700 space-y-2 list-disc list-inside", children: [
            /* @__PURE__ */ s("li", { children: [
              "These credentials will be sent to ",
              /* @__PURE__ */ n("strong", { className: "text-blue-600", children: c?.email })
            ] }),
            /* @__PURE__ */ s("li", { children: [
              "The company owner ",
              /* @__PURE__ */ n("strong", { children: "must change their password" }),
              " on first login"
            ] }),
            /* @__PURE__ */ s("li", { children: [
              "This is a ",
              /* @__PURE__ */ n("strong", { children: "temporary password" }),
              " for security purposes"
            ] }),
            /* @__PURE__ */ n("li", { children: "The website is live and ready to accept bookings immediately" })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ s("div", { className: "mt-6 flex justify-center gap-3", children: [
        /* @__PURE__ */ n(
          W,
          {
            variant: "outline",
            onClick: () => u(!1),
            children: "Close"
          }
        ),
        /* @__PURE__ */ s(
          W,
          {
            className: "bg-green-600 hover:bg-green-700 text-white",
            onClick: () => {
              y(c, h);
            },
            disabled: f,
            children: [
              /* @__PURE__ */ n(Pa, { className: "w-4 h-4 mr-2" }),
              f ? "Sending..." : "Send Complete Package via Email"
            ]
          }
        )
      ] })
    ] }) })
  ] });
}
const hl = [
  {
    id: 1,
    name: "Brussels Express Taxi",
    subdomain: "brusselsexpress",
    city: "Brussels",
    phone: "+32 123 456 789",
    email: "contact@brusselsexpress.be",
    numberOfCars: 8,
    status: "Active",
    description: "Professional taxi service in Brussels area"
  },
  {
    id: 2,
    name: "Antwerp City Cabs",
    subdomain: "antwerpcabs",
    city: "Antwerp",
    phone: "+32 234 567 890",
    email: "info@antwerpcabs.be",
    numberOfCars: 5,
    status: "Active",
    description: "Reliable taxi service in Antwerp"
  },
  {
    id: 3,
    name: "Ghent Taxi Services",
    subdomain: "ghenttaxi",
    city: "Ghent",
    phone: "+32 345 678 901",
    email: "hello@ghenttaxi.be",
    numberOfCars: 6,
    status: "Active",
    description: "24/7 taxi service in Ghent"
  },
  {
    id: 4,
    name: "Liège Transport",
    subdomain: "liegetransport",
    city: "Liège",
    phone: "+32 456 789 012",
    email: "contact@liegetransport.be",
    numberOfCars: 4,
    status: "Active",
    description: "Fast and reliable taxi in Liège"
  },
  {
    id: 5,
    name: "Bruges Premium Taxi",
    subdomain: "brugespremium",
    city: "Bruges",
    phone: "+32 567 890 123",
    email: "info@brugespremium.be",
    numberOfCars: 3,
    status: "Active",
    description: "Premium taxi service in Bruges"
  }
];
function Rx() {
  const [e, t] = j(""), [r, a] = j("all"), i = ["all", ...new Set(hl.map((l) => l.city))], o = hl.filter((l) => {
    const u = l.name.toLowerCase().includes(e.toLowerCase()) || l.city.toLowerCase().includes(e.toLowerCase()), c = r === "all" || l.city === r;
    return u && c;
  });
  return /* @__PURE__ */ n("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100", children: /* @__PURE__ */ s("div", { className: "container mx-auto px-4 py-12", children: [
    /* @__PURE__ */ n(Ve, { to: "/", children: /* @__PURE__ */ s(W, { variant: "ghost", className: "mb-6", children: [
      /* @__PURE__ */ n(sr, { className: "w-4 h-4 mr-2" }),
      "Back to Home"
    ] }) }),
    /* @__PURE__ */ s("div", { className: "text-center mb-12", children: [
      /* @__PURE__ */ n("h1", { className: "text-4xl font-bold text-gray-900 mb-4", children: "Browse Taxi Companies" }),
      /* @__PURE__ */ n("p", { className: "text-lg text-gray-600", children: "Find a reliable taxi service in your area" })
    ] }),
    /* @__PURE__ */ n("div", { className: "max-w-4xl mx-auto mb-8", children: /* @__PURE__ */ n(ue, { children: /* @__PURE__ */ n(Ee, { className: "pt-6", children: /* @__PURE__ */ s("div", { className: "grid md:grid-cols-2 gap-4", children: [
      /* @__PURE__ */ n("div", { children: /* @__PURE__ */ n(
        q,
        {
          placeholder: "Search by company name or city...",
          value: e,
          onChange: (l) => t(l.target.value),
          className: "w-full"
        }
      ) }),
      /* @__PURE__ */ n("div", { children: /* @__PURE__ */ s(Zn, { value: r, onValueChange: a, children: [
        /* @__PURE__ */ n(ta, { children: /* @__PURE__ */ n(ea, { placeholder: "Filter by city" }) }),
        /* @__PURE__ */ n(ra, { children: i.map((l) => /* @__PURE__ */ n(nr, { value: l, children: l === "all" ? "All Cities" : l }, l)) })
      ] }) })
    ] }) }) }) }),
    /* @__PURE__ */ s("div", { className: "max-w-5xl mx-auto", children: [
      /* @__PURE__ */ s("div", { className: "mb-4 text-gray-600", children: [
        "Showing ",
        o.length,
        " ",
        o.length === 1 ? "company" : "companies"
      ] }),
      /* @__PURE__ */ n("div", { className: "grid gap-6", children: o.map((l) => /* @__PURE__ */ s(ue, { className: "hover:shadow-lg transition-shadow", children: [
        /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ n("div", { className: "flex justify-between items-start", children: /* @__PURE__ */ s("div", { className: "flex items-start gap-4", children: [
          /* @__PURE__ */ n("div", { className: "w-14 h-14 bg-blue-600 rounded-full flex items-center justify-center", children: /* @__PURE__ */ n(_e, { className: "w-7 h-7 text-white" }) }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ n(je, { className: "text-2xl mb-1", children: l.name }),
            /* @__PURE__ */ n(Xe, { className: "text-base mb-2", children: l.description }),
            /* @__PURE__ */ s("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ n(it, { variant: "default", children: l.status }),
              /* @__PURE__ */ s(it, { variant: "outline", children: [
                l.numberOfCars,
                " Cars"
              ] })
            ] })
          ] })
        ] }) }) }),
        /* @__PURE__ */ s(Ee, { children: [
          /* @__PURE__ */ s("div", { className: "grid md:grid-cols-2 gap-4 mb-4", children: [
            /* @__PURE__ */ s("div", { className: "flex items-center text-gray-700", children: [
              /* @__PURE__ */ n(Pt, { className: "w-4 h-4 mr-2 text-blue-600" }),
              /* @__PURE__ */ s("span", { children: [
                l.city,
                ", Belgium"
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: "flex items-center text-gray-700", children: [
              /* @__PURE__ */ n(ca, { className: "w-4 h-4 mr-2 text-green-600" }),
              /* @__PURE__ */ n("span", { children: l.phone })
            ] }),
            /* @__PURE__ */ s("div", { className: "flex items-center text-gray-700", children: [
              /* @__PURE__ */ n(Er, { className: "w-4 h-4 mr-2 text-orange-600" }),
              /* @__PURE__ */ n("span", { children: l.email })
            ] }),
            /* @__PURE__ */ s("div", { className: "flex items-center text-gray-700", children: [
              /* @__PURE__ */ n(Ei, { className: "w-4 h-4 mr-2 text-purple-600" }),
              /* @__PURE__ */ s("span", { className: "font-mono text-sm", children: [
                l.subdomain,
                ".taxio.be"
              ] })
            ] })
          ] }),
          /* @__PURE__ */ n(Ve, { to: `/book/${l.subdomain}`, children: /* @__PURE__ */ s(W, { className: "w-full", size: "lg", children: [
            /* @__PURE__ */ n(_e, { className: "w-4 h-4 mr-2" }),
            "Book a Ride"
          ] }) })
        ] })
      ] }, l.id)) }),
      o.length === 0 && /* @__PURE__ */ n("div", { className: "text-center py-12", children: /* @__PURE__ */ n("p", { className: "text-gray-600 text-lg", children: "No companies found matching your criteria" }) })
    ] })
  ] }) });
}
function Tx() {
  const { companySubdomain: e } = fn(), t = `${window.location.origin}/register`, r = e ? `${window.location.origin}/book/${e}` : null, a = e ? e.charAt(0).toUpperCase() + e.slice(1) : null, i = (l) => {
    de.success(`Downloading ${l} QR code...`);
  }, o = (l) => {
    navigator.clipboard.writeText(l), de.success("URL copied to clipboard!");
  };
  return /* @__PURE__ */ n("div", { className: "min-h-screen bg-gradient-to-br from-purple-50 to-indigo-100 py-12", children: /* @__PURE__ */ s("div", { className: "container mx-auto px-4", children: [
    /* @__PURE__ */ n(Ve, { to: "/dashboard/admin", children: /* @__PURE__ */ s(W, { variant: "ghost", className: "mb-6", children: [
      /* @__PURE__ */ n(sr, { className: "w-4 h-4 mr-2" }),
      "Back to Admin Dashboard"
    ] }) }),
    /* @__PURE__ */ s("div", { className: "max-w-5xl mx-auto", children: [
      /* @__PURE__ */ s("div", { className: "text-center mb-12", children: [
        /* @__PURE__ */ n(Fr, { className: "w-16 h-16 mx-auto mb-4 text-purple-600" }),
        /* @__PURE__ */ n("h1", { className: "text-4xl font-bold text-gray-900 mb-4", children: "QR Code Generator" }),
        /* @__PURE__ */ n("p", { className: "text-lg text-gray-600", children: "Generate QR codes for company registration and booking pages" })
      ] }),
      /* @__PURE__ */ s("div", { className: "grid md:grid-cols-2 gap-8", children: [
        /* @__PURE__ */ s(ue, { className: "hover:shadow-lg transition-shadow", children: [
          /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ s("div", { className: "flex items-center mb-2", children: [
            /* @__PURE__ */ n("div", { className: "w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4", children: /* @__PURE__ */ n(Wt, { className: "w-6 h-6 text-blue-600" }) }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ n(je, { children: "Company Registration" }),
              /* @__PURE__ */ n(Xe, { children: "For taxi companies to register" })
            ] })
          ] }) }),
          /* @__PURE__ */ s(Ee, { children: [
            /* @__PURE__ */ n("div", { className: "bg-white border-4 border-gray-300 rounded-lg p-8 mb-4", children: /* @__PURE__ */ n("div", { className: "aspect-square bg-gradient-to-br from-blue-100 to-blue-200 rounded flex items-center justify-center", children: /* @__PURE__ */ s("div", { className: "text-center", children: [
              /* @__PURE__ */ n(Fr, { className: "w-32 h-32 mx-auto mb-4 text-blue-600" }),
              /* @__PURE__ */ n("p", { className: "text-sm text-gray-600", children: "Platform Registration" }),
              /* @__PURE__ */ n("p", { className: "text-xs text-gray-500 mt-2", children: "QR Code Preview" })
            ] }) }) }),
            /* @__PURE__ */ s("div", { className: "mb-4 p-3 bg-gray-50 rounded border", children: [
              /* @__PURE__ */ n("p", { className: "text-xs text-gray-600 mb-1", children: "Registration URL:" }),
              /* @__PURE__ */ n("p", { className: "text-sm font-mono text-gray-900 break-all", children: t })
            ] }),
            /* @__PURE__ */ n("div", { className: "mb-4 p-3 bg-blue-50 rounded border border-blue-200", children: /* @__PURE__ */ s("p", { className: "text-sm text-blue-900", children: [
              /* @__PURE__ */ n("strong", { children: "Usage:" }),
              " Share this QR code with taxi companies so they can scan and register on your platform. Perfect for marketing materials, business cards, and promotional events."
            ] }) }),
            /* @__PURE__ */ s("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ s(
                W,
                {
                  onClick: () => i("Platform Registration"),
                  className: "flex-1",
                  children: [
                    /* @__PURE__ */ n(qn, { className: "w-4 h-4 mr-2" }),
                    "Download QR"
                  ]
                }
              ),
              /* @__PURE__ */ n(
                W,
                {
                  onClick: () => o(t),
                  variant: "outline",
                  className: "flex-1",
                  children: "Copy URL"
                }
              )
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s(ue, { className: "hover:shadow-lg transition-shadow", children: [
          /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ s("div", { className: "flex items-center mb-2", children: [
            /* @__PURE__ */ n("div", { className: "w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4", children: /* @__PURE__ */ n(_e, { className: "w-6 h-6 text-green-600" }) }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ n(je, { children: "Booking Page" }),
              /* @__PURE__ */ n(Xe, { children: a ? `For ${a} customers` : "For company customers" })
            ] })
          ] }) }),
          /* @__PURE__ */ n(Ee, { children: r ? /* @__PURE__ */ s(Cr, { children: [
            /* @__PURE__ */ n("div", { className: "bg-white border-4 border-gray-300 rounded-lg p-8 mb-4", children: /* @__PURE__ */ n("div", { className: "aspect-square bg-gradient-to-br from-green-100 to-green-200 rounded flex items-center justify-center", children: /* @__PURE__ */ s("div", { className: "text-center", children: [
              /* @__PURE__ */ n(Fr, { className: "w-32 h-32 mx-auto mb-4 text-green-600" }),
              /* @__PURE__ */ s("p", { className: "text-sm text-gray-600", children: [
                a,
                " Booking"
              ] }),
              /* @__PURE__ */ n("p", { className: "text-xs text-gray-500 mt-2", children: "QR Code Preview" })
            ] }) }) }),
            /* @__PURE__ */ s("div", { className: "mb-4 p-3 bg-gray-50 rounded border", children: [
              /* @__PURE__ */ n("p", { className: "text-xs text-gray-600 mb-1", children: "Booking URL:" }),
              /* @__PURE__ */ n("p", { className: "text-sm font-mono text-gray-900 break-all", children: r })
            ] }),
            /* @__PURE__ */ n("div", { className: "mb-4 p-3 bg-green-50 rounded border border-green-200", children: /* @__PURE__ */ s("p", { className: "text-sm text-green-900", children: [
              /* @__PURE__ */ n("strong", { children: "Usage:" }),
              " Share this QR code with ",
              a,
              "'s drivers to display in their vehicles. Customers can scan it to instantly book a ride with this company."
            ] }) }),
            /* @__PURE__ */ s("div", { className: "flex gap-2", children: [
              /* @__PURE__ */ s(
                W,
                {
                  onClick: () => i(`${a} Booking`),
                  className: "flex-1",
                  children: [
                    /* @__PURE__ */ n(qn, { className: "w-4 h-4 mr-2" }),
                    "Download QR"
                  ]
                }
              ),
              /* @__PURE__ */ n(
                W,
                {
                  onClick: () => o(r),
                  variant: "outline",
                  className: "flex-1",
                  children: "Copy URL"
                }
              )
            ] })
          ] }) : /* @__PURE__ */ s("div", { className: "text-center py-12", children: [
            /* @__PURE__ */ n(Fr, { className: "w-16 h-16 mx-auto mb-4 text-gray-400" }),
            /* @__PURE__ */ n("p", { className: "text-gray-600 mb-4", children: "Select a company from the admin dashboard to generate their booking QR code" }),
            /* @__PURE__ */ n(Ve, { to: "/dashboard/admin", children: /* @__PURE__ */ n(W, { variant: "outline", children: "Go to Admin Dashboard" }) })
          ] }) })
        ] })
      ] }),
      !e && /* @__PURE__ */ s(ue, { className: "mt-8", children: [
        /* @__PURE__ */ s(ze, { children: [
          /* @__PURE__ */ n(je, { children: "Generate QR for Specific Company" }),
          /* @__PURE__ */ n(Xe, { children: "Select a company to generate their booking QR code" })
        ] }),
        /* @__PURE__ */ n(Ee, { children: /* @__PURE__ */ s("div", { className: "grid md:grid-cols-3 gap-4", children: [
          /* @__PURE__ */ n(Ve, { to: "/qr-codes/democompany", children: /* @__PURE__ */ s(W, { variant: "outline", className: "w-full", children: [
            /* @__PURE__ */ n(Wt, { className: "w-4 h-4 mr-2" }),
            "Demo Company"
          ] }) }),
          /* @__PURE__ */ n(Ve, { to: "/qr-codes/brusselsexpress", children: /* @__PURE__ */ s(W, { variant: "outline", className: "w-full", children: [
            /* @__PURE__ */ n(Wt, { className: "w-4 h-4 mr-2" }),
            "Brussels Express"
          ] }) }),
          /* @__PURE__ */ n(Ve, { to: "/qr-codes/antwerpcabs", children: /* @__PURE__ */ s(W, { variant: "outline", className: "w-full", children: [
            /* @__PURE__ */ n(Wt, { className: "w-4 h-4 mr-2" }),
            "Antwerp Cabs"
          ] }) })
        ] }) })
      ] }),
      /* @__PURE__ */ s(ue, { className: "mt-8 bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200", children: [
        /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ n(je, { children: "How to Use QR Codes" }) }),
        /* @__PURE__ */ s(Ee, { className: "space-y-4", children: [
          /* @__PURE__ */ s("div", { className: "flex gap-3", children: [
            /* @__PURE__ */ n("div", { className: "w-8 h-8 bg-purple-600 text-white rounded-full flex items-center justify-center flex-shrink-0", children: "1" }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ n("h4", { className: "font-semibold mb-1", children: "Platform Registration QR" }),
              /* @__PURE__ */ n("p", { className: "text-sm text-gray-600", children: "Print this QR code on marketing materials, flyers, or business cards. Taxi companies can scan it to register their business on your platform." })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { className: "flex gap-3", children: [
            /* @__PURE__ */ n("div", { className: "w-8 h-8 bg-green-600 text-white rounded-full flex items-center justify-center flex-shrink-0", children: "2" }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ n("h4", { className: "font-semibold mb-1", children: "Company Booking QR" }),
              /* @__PURE__ */ n("p", { className: "text-sm text-gray-600", children: "Each registered company gets a unique booking QR code. Drivers can display it in their vehicles so customers can scan and book rides instantly." })
            ] })
          ] }),
          /* @__PURE__ */ s("div", { className: "flex gap-3", children: [
            /* @__PURE__ */ n("div", { className: "w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center flex-shrink-0", children: "3" }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ n("h4", { className: "font-semibold mb-1", children: "Download & Share" }),
              /* @__PURE__ */ n("p", { className: "text-sm text-gray-600", children: "Download QR codes in high resolution for printing. Share URLs digitally via email, social media, or messaging apps." })
            ] })
          ] })
        ] })
      ] })
    ] })
  ] }) });
}
function Ax({ className: e, ...t }) {
  return /* @__PURE__ */ n(
    "textarea",
    {
      "data-slot": "textarea",
      className: Oe(
        "resize-none border-input placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 flex field-sizing-content min-h-16 w-full rounded-md border bg-input-background px-3 py-2 text-base transition-[color,box-shadow] outline-none focus-visible:ring-[3px] disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        e
      ),
      ...t
    }
  );
}
function Dx() {
  const { companyId: e } = fn(), [t, r] = j(!1), [a, i] = j(null), [o, l] = j(null), [u, c] = j({
    1: null,
    2: null,
    3: null
  }), [d, h] = j({
    name: "DemoCompany",
    tagline: "Smart booking, punctual service, and fair pricing | a modern taxi experience built around your convenience",
    phone: "+32 470 123 456",
    email: "contact@democompany.be",
    website: "democompany.taxio.be",
    businessNumber: "BE0123.456.789",
    // Set during registration, cannot be changed
    rating: "4.9",
    // Calculated from reviews, not editable
    reviews: "2,847",
    yearsInBusiness: "12"
  }), [m, f] = j({
    name: "Michael Anderson",
    experience: "8 years",
    languages: "EN, FR, NL",
    rating: "4.9"
  }), [g, p] = j([
    { id: 1, type: "Standard", name: "Mercedes E-Class", passengers: "1-4", luggage: "2-3" },
    { id: 2, type: "Van", name: "Mercedes V-Class", passengers: "1-7", luggage: "4-6" },
    { id: 3, type: "Luxury", name: "Mercedes S-Class", passengers: "1-3", luggage: "2-3" }
  ]), [v, b] = j({
    standardStart: "€5.00",
    standardPerKm: "€2.00",
    standardInitialKm: "3",
    vanStart: "€8.00",
    vanPerKm: "€3.00",
    vanInitialKm: "3",
    luxuryStart: "€10.00",
    luxuryPerKm: "€4.00",
    luxuryInitialKm: "3"
  }), [w, y] = j([
    { id: 1, name: "Primary Color", color: "#0F172A", description: "Main brand color (header, buttons)" },
    { id: 2, name: "Accent Color", color: "#FACC15", description: "Call-to-action buttons, highlights" },
    { id: 3, name: "Background Color", color: "#F8FAFC", description: "Page background" }
  ]), k = () => {
    de.success("Changes saved successfully! Your booking page has been updated.");
  }, N = () => {
    window.open(`/book/${e}`, "_blank");
  }, T = (E) => {
    const S = E.target.files?.[0];
    if (S) {
      const $ = new FileReader();
      $.onloadend = () => {
        i($.result), de.success("Logo uploaded successfully!");
      }, $.readAsDataURL(S);
    }
  }, _ = (E) => {
    const S = E.target.files?.[0];
    if (S) {
      const $ = new FileReader();
      $.onloadend = () => {
        l($.result), de.success("Driver photo uploaded successfully!");
      }, $.readAsDataURL(S);
    }
  }, x = (E, S) => {
    const $ = S.target.files?.[0];
    if ($) {
      const A = new FileReader();
      A.onloadend = () => {
        c({ ...u, [E]: A.result }), de.success("Vehicle photo uploaded successfully!");
      }, A.readAsDataURL($);
    }
  }, R = () => {
    i(null), de.success("Logo removed");
  }, F = () => {
    l(null), de.success("Driver photo removed");
  }, V = (E) => {
    c({ ...u, [E]: null }), de.success("Vehicle photo removed");
  };
  return /* @__PURE__ */ s("div", { className: "min-h-screen bg-gray-50", children: [
    /* @__PURE__ */ n("div", { className: "bg-white border-b sticky top-0 z-50 shadow-sm", children: /* @__PURE__ */ n("div", { className: "container mx-auto px-4 py-4", children: /* @__PURE__ */ s("div", { className: "flex flex-col gap-4 lg:flex-row lg:justify-between lg:items-center", children: [
      /* @__PURE__ */ s("div", { className: "flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4", children: [
        /* @__PURE__ */ n(Ve, { to: `/dashboard/company/${e}`, children: /* @__PURE__ */ s(W, { variant: "outline", size: "sm", className: "w-full sm:w-auto", children: [
          /* @__PURE__ */ n(sr, { className: "w-4 h-4 mr-2" }),
          "Back to Dashboard"
        ] }) }),
        /* @__PURE__ */ s("div", { children: [
          /* @__PURE__ */ n("h1", { className: "text-xl sm:text-2xl font-bold text-gray-900", children: "Customize Your Booking Page" }),
          /* @__PURE__ */ n("p", { className: "text-xs sm:text-sm text-gray-600", children: "Edit your company information and preview changes" })
        ] })
      ] }),
      /* @__PURE__ */ s("div", { className: "flex flex-col sm:flex-row gap-2", children: [
        /* @__PURE__ */ n(Ki, { variant: "minimal" }),
        /* @__PURE__ */ s(W, { variant: "outline", onClick: N, className: "w-full sm:w-auto", children: [
          /* @__PURE__ */ n(Sr, { className: "w-4 h-4 mr-2" }),
          "Preview Live Page"
        ] }),
        /* @__PURE__ */ s(W, { onClick: k, className: "w-full sm:w-auto bg-gradient-to-r from-yellow-400 to-yellow-500 text-slate-900 hover:from-yellow-500 hover:to-yellow-600", children: [
          /* @__PURE__ */ n(ig, { className: "w-4 h-4 mr-2" }),
          "Save Changes"
        ] })
      ] })
    ] }) }) }),
    /* @__PURE__ */ s("div", { className: "container mx-auto px-4 py-8", children: [
      /* @__PURE__ */ s(Xi, { defaultValue: "company", className: "w-full", children: [
        /* @__PURE__ */ n("div", { className: "overflow-x-auto -mx-4 px-4 mb-6", children: /* @__PURE__ */ s(Ja, { className: "inline-flex w-auto min-w-full", children: [
          /* @__PURE__ */ s(mt, { value: "company", className: "flex-shrink-0", children: [
            /* @__PURE__ */ n(Wt, { className: "w-4 h-4 sm:mr-2" }),
            /* @__PURE__ */ n("span", { className: "hidden sm:inline", children: "Company Info" }),
            /* @__PURE__ */ n("span", { className: "sm:hidden", children: "Company" })
          ] }),
          /* @__PURE__ */ s(mt, { value: "driver", className: "flex-shrink-0", children: [
            /* @__PURE__ */ n(_s, { className: "w-4 h-4 sm:mr-2" }),
            /* @__PURE__ */ n("span", { className: "hidden sm:inline", children: "Driver Info" }),
            /* @__PURE__ */ n("span", { className: "sm:hidden", children: "Driver" })
          ] }),
          /* @__PURE__ */ s(mt, { value: "vehicles", className: "flex-shrink-0", children: [
            /* @__PURE__ */ n(_e, { className: "w-4 h-4 sm:mr-2" }),
            /* @__PURE__ */ n("span", { className: "hidden sm:inline", children: "Vehicles" }),
            /* @__PURE__ */ n("span", { className: "sm:hidden", children: "Cars" })
          ] }),
          /* @__PURE__ */ s(mt, { value: "pricing", className: "flex-shrink-0", children: [
            /* @__PURE__ */ n(uc, { className: "w-4 h-4 sm:mr-2" }),
            /* @__PURE__ */ n("span", { className: "hidden sm:inline", children: "Pricing" }),
            /* @__PURE__ */ n("span", { className: "sm:hidden", children: "Price" })
          ] }),
          /* @__PURE__ */ s(mt, { value: "colors", className: "flex-shrink-0", children: [
            /* @__PURE__ */ n(hc, { className: "w-4 h-4 sm:mr-2" }),
            /* @__PURE__ */ n("span", { className: "hidden sm:inline", children: "Brand Colors" }),
            /* @__PURE__ */ n("span", { className: "sm:hidden", children: "Colors" })
          ] })
        ] }) }),
        /* @__PURE__ */ n(ht, { value: "company", children: /* @__PURE__ */ s("div", { className: "grid lg:grid-cols-2 gap-6", children: [
          /* @__PURE__ */ s(ue, { className: "lg:col-span-2", children: [
            /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ s(je, { className: "flex items-center gap-2", children: [
              /* @__PURE__ */ n(Ro, { className: "w-5 h-5 text-yellow-500" }),
              "Company Logo"
            ] }) }),
            /* @__PURE__ */ n(Ee, { children: /* @__PURE__ */ s("div", { className: "flex flex-col md:flex-row gap-6 items-start", children: [
              /* @__PURE__ */ n("div", { className: "flex-shrink-0", children: a ? /* @__PURE__ */ s("div", { className: "relative", children: [
                /* @__PURE__ */ n(
                  "img",
                  {
                    src: a,
                    alt: "Company Logo",
                    className: "w-32 h-32 object-contain border-2 border-gray-300 rounded-lg bg-white p-2"
                  }
                ),
                /* @__PURE__ */ n(
                  W,
                  {
                    size: "sm",
                    variant: "destructive",
                    className: "absolute -top-2 -right-2 rounded-full w-8 h-8 p-0",
                    onClick: R,
                    children: /* @__PURE__ */ n(yt, { className: "w-4 h-4" })
                  }
                )
              ] }) : /* @__PURE__ */ n("div", { className: "w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50", children: /* @__PURE__ */ n(Wt, { className: "w-12 h-12 text-gray-400" }) }) }),
              /* @__PURE__ */ s("div", { className: "flex-1", children: [
                /* @__PURE__ */ n(X, { htmlFor: "logo-upload", className: "cursor-pointer", children: /* @__PURE__ */ n("div", { className: "border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-yellow-400 transition-colors", children: /* @__PURE__ */ s("div", { className: "flex flex-col items-center text-center", children: [
                  /* @__PURE__ */ n(Fa, { className: "w-8 h-8 text-gray-400 mb-2" }),
                  /* @__PURE__ */ n("p", { className: "text-sm font-semibold text-gray-700 mb-1", children: "Click to upload company logo" }),
                  /* @__PURE__ */ n("p", { className: "text-xs text-gray-500", children: "PNG, JPG or SVG (MAX. 2MB)" })
                ] }) }) }),
                /* @__PURE__ */ n(
                  "input",
                  {
                    id: "logo-upload",
                    type: "file",
                    accept: "image/*",
                    className: "hidden",
                    onChange: T
                  }
                ),
                /* @__PURE__ */ n("p", { className: "text-xs text-gray-500 mt-2", children: "Your logo will appear in the header of your booking page" })
              ] })
            ] }) })
          ] }),
          /* @__PURE__ */ s(ue, { children: [
            /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ n(je, { children: "Basic Information" }) }),
            /* @__PURE__ */ s(Ee, { className: "space-y-4", children: [
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n(X, { htmlFor: "companyName", children: "Company Name" }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: "companyName",
                    value: d.name,
                    onChange: (E) => h({ ...d, name: E.target.value }),
                    placeholder: "Your Company Name"
                  }
                )
              ] }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n(X, { htmlFor: "tagline", children: "Tagline" }),
                /* @__PURE__ */ n(
                  Ax,
                  {
                    id: "tagline",
                    value: d.tagline,
                    onChange: (E) => h({ ...d, tagline: E.target.value }),
                    placeholder: "Your company tagline",
                    rows: 3
                  }
                )
              ] }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n(X, { htmlFor: "reviews", children: "Total Reviews" }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: "reviews",
                    value: d.reviews,
                    onChange: (E) => h({ ...d, reviews: E.target.value }),
                    placeholder: "2,847"
                  }
                )
              ] }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ s(X, { htmlFor: "yearsInBusiness", className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ n(dc, { className: "w-4 h-4 text-yellow-500" }),
                  "Years in Business"
                ] }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: "yearsInBusiness",
                    value: d.yearsInBusiness,
                    onChange: (E) => h({ ...d, yearsInBusiness: E.target.value }),
                    placeholder: "12"
                  }
                )
              ] })
            ] })
          ] }),
          /* @__PURE__ */ s(ue, { children: [
            /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ n(je, { children: "Contact Information" }) }),
            /* @__PURE__ */ s(Ee, { className: "space-y-4", children: [
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ s(X, { htmlFor: "phone", className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ n(ca, { className: "w-4 h-4 text-yellow-500" }),
                  "Phone Number"
                ] }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: "phone",
                    value: d.phone,
                    onChange: (E) => h({ ...d, phone: E.target.value }),
                    placeholder: "+32 470 123 456"
                  }
                )
              ] }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ s(X, { htmlFor: "email", className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ n(Er, { className: "w-4 h-4 text-yellow-500" }),
                  "Email Address"
                ] }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: "email",
                    type: "email",
                    value: d.email,
                    onChange: (E) => h({ ...d, email: E.target.value }),
                    placeholder: "contact@company.be"
                  }
                )
              ] }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ s(X, { htmlFor: "website", className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ n(ro, { className: "w-4 h-4 text-yellow-500" }),
                  "Website"
                ] }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: "website",
                    value: d.website,
                    onChange: (E) => h({ ...d, website: E.target.value }),
                    placeholder: "company.taxio.be"
                  }
                )
              ] }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ s(X, { htmlFor: "businessNumber", className: "flex items-center gap-2", children: [
                  "Business Number",
                  /* @__PURE__ */ n("span", { className: "text-xs text-gray-500", children: "(Set during registration)" })
                ] }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: "businessNumber",
                    value: d.businessNumber,
                    readOnly: !0,
                    disabled: !0,
                    className: "bg-gray-100 cursor-not-allowed text-gray-600",
                    placeholder: "BE0123.456.789"
                  }
                ),
                /* @__PURE__ */ n("p", { className: "text-xs text-gray-500 mt-1", children: "Business number cannot be changed after approval" })
              ] })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ n(ht, { value: "driver", children: /* @__PURE__ */ s(ue, { children: [
          /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ n(je, { children: "Featured Driver Information" }) }),
          /* @__PURE__ */ s(Ee, { className: "space-y-6", children: [
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ s(X, { className: "flex items-center gap-2 mb-3", children: [
                /* @__PURE__ */ n(Ro, { className: "w-5 h-5 text-yellow-500" }),
                "Driver Photo"
              ] }),
              /* @__PURE__ */ s("div", { className: "flex flex-col md:flex-row gap-6 items-start", children: [
                /* @__PURE__ */ n("div", { className: "flex-shrink-0", children: o ? /* @__PURE__ */ s("div", { className: "relative", children: [
                  /* @__PURE__ */ n(
                    "img",
                    {
                      src: o,
                      alt: "Driver",
                      className: "w-32 h-32 object-cover rounded-full border-4 border-yellow-400 shadow-lg"
                    }
                  ),
                  /* @__PURE__ */ n(
                    W,
                    {
                      size: "sm",
                      variant: "destructive",
                      className: "absolute -top-2 -right-2 rounded-full w-8 h-8 p-0",
                      onClick: F,
                      children: /* @__PURE__ */ n(yt, { className: "w-4 h-4" })
                    }
                  )
                ] }) : /* @__PURE__ */ n("div", { className: "w-32 h-32 border-4 border-dashed border-gray-300 rounded-full flex items-center justify-center bg-gray-50", children: /* @__PURE__ */ n(_s, { className: "w-12 h-12 text-gray-400" }) }) }),
                /* @__PURE__ */ s("div", { className: "flex-1", children: [
                  /* @__PURE__ */ n(X, { htmlFor: "driver-photo-upload", className: "cursor-pointer", children: /* @__PURE__ */ n("div", { className: "border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-yellow-400 transition-colors", children: /* @__PURE__ */ s("div", { className: "flex flex-col items-center text-center", children: [
                    /* @__PURE__ */ n(Fa, { className: "w-8 h-8 text-gray-400 mb-2" }),
                    /* @__PURE__ */ n("p", { className: "text-sm font-semibold text-gray-700 mb-1", children: "Click to upload driver photo" }),
                    /* @__PURE__ */ n("p", { className: "text-xs text-gray-500", children: "PNG or JPG (MAX. 2MB)" })
                  ] }) }) }),
                  /* @__PURE__ */ n(
                    "input",
                    {
                      id: "driver-photo-upload",
                      type: "file",
                      accept: "image/*",
                      className: "hidden",
                      onChange: _
                    }
                  ),
                  /* @__PURE__ */ n("p", { className: "text-xs text-gray-500 mt-2", children: "Professional photo of your featured driver for the booking page" })
                ] })
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: "grid md:grid-cols-2 gap-4", children: [
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n(X, { htmlFor: "driverName", children: "Driver Name" }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: "driverName",
                    value: m.name,
                    onChange: (E) => f({ ...m, name: E.target.value }),
                    placeholder: "Michael Anderson"
                  }
                )
              ] }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n(X, { htmlFor: "experience", children: "Experience" }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: "experience",
                    value: m.experience,
                    onChange: (E) => f({ ...m, experience: E.target.value }),
                    placeholder: "8 years"
                  }
                )
              ] }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n(X, { htmlFor: "languages", children: "Languages" }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: "languages",
                    value: m.languages,
                    onChange: (E) => f({ ...m, languages: E.target.value }),
                    placeholder: "EN, FR, NL"
                  }
                )
              ] }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ s(X, { htmlFor: "driverRating", className: "flex items-center gap-2", children: [
                  "Driver Rating",
                  /* @__PURE__ */ n("span", { className: "text-xs text-gray-500", children: "(Auto-calculated)" })
                ] }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: "driverRating",
                    value: m.rating,
                    readOnly: !0,
                    disabled: !0,
                    className: "bg-gray-100 cursor-not-allowed text-gray-600",
                    placeholder: "4.9"
                  }
                )
              ] })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ n(ht, { value: "vehicles", children: /* @__PURE__ */ s(ue, { children: [
          /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ n(je, { children: "Fleet Information" }) }),
          /* @__PURE__ */ n(Ee, { className: "space-y-6", children: g.map((E, S) => /* @__PURE__ */ s("div", { className: "p-4 border-2 rounded-lg space-y-4 bg-white shadow-sm", children: [
            /* @__PURE__ */ s("h3", { className: "font-bold text-lg text-gray-900 flex items-center gap-2", children: [
              /* @__PURE__ */ n(_e, { className: "w-5 h-5 text-yellow-500" }),
              E.type
            ] }),
            /* @__PURE__ */ s("div", { children: [
              /* @__PURE__ */ s(X, { className: "flex items-center gap-2 mb-3", children: [
                /* @__PURE__ */ n(Ro, { className: "w-4 h-4 text-yellow-500" }),
                "Vehicle Photo"
              ] }),
              /* @__PURE__ */ s("div", { className: "flex flex-col md:flex-row gap-4 items-start", children: [
                /* @__PURE__ */ n("div", { className: "flex-shrink-0", children: u[E.id] ? /* @__PURE__ */ s("div", { className: "relative", children: [
                  /* @__PURE__ */ n(
                    "img",
                    {
                      src: u[E.id],
                      alt: E.type,
                      className: "w-40 h-28 object-cover rounded-lg border-2 border-gray-300 shadow-md"
                    }
                  ),
                  /* @__PURE__ */ n(
                    W,
                    {
                      size: "sm",
                      variant: "destructive",
                      className: "absolute -top-2 -right-2 rounded-full w-7 h-7 p-0",
                      onClick: () => V(E.id),
                      children: /* @__PURE__ */ n(yt, { className: "w-4 h-4" })
                    }
                  )
                ] }) : /* @__PURE__ */ n("div", { className: "w-40 h-28 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50", children: /* @__PURE__ */ n(_e, { className: "w-10 h-10 text-gray-400" }) }) }),
                /* @__PURE__ */ s("div", { className: "flex-1", children: [
                  /* @__PURE__ */ n(X, { htmlFor: `vehicle-photo-${E.id}`, className: "cursor-pointer", children: /* @__PURE__ */ n("div", { className: "border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-yellow-400 transition-colors", children: /* @__PURE__ */ s("div", { className: "flex flex-col items-center text-center", children: [
                    /* @__PURE__ */ n(Fa, { className: "w-6 h-6 text-gray-400 mb-1" }),
                    /* @__PURE__ */ s("p", { className: "text-xs font-semibold text-gray-700", children: [
                      "Upload ",
                      E.type,
                      " photo"
                    ] }),
                    /* @__PURE__ */ n("p", { className: "text-xs text-gray-500", children: "PNG or JPG" })
                  ] }) }) }),
                  /* @__PURE__ */ n(
                    "input",
                    {
                      id: `vehicle-photo-${E.id}`,
                      type: "file",
                      accept: "image/*",
                      className: "hidden",
                      onChange: ($) => x(E.id, $)
                    }
                  )
                ] })
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: "grid md:grid-cols-3 gap-4", children: [
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n(X, { htmlFor: `vehicleName${S}`, children: "Vehicle Model" }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: `vehicleName${S}`,
                    value: E.name,
                    onChange: ($) => {
                      const A = [...g];
                      A[S].name = $.target.value, p(A);
                    },
                    placeholder: "Mercedes E-Class"
                  }
                )
              ] }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n(X, { htmlFor: `passengers${S}`, children: "Passengers" }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: `passengers${S}`,
                    value: E.passengers,
                    onChange: ($) => {
                      const A = [...g];
                      A[S].passengers = $.target.value, p(A);
                    },
                    placeholder: "1-4"
                  }
                )
              ] }),
              /* @__PURE__ */ s("div", { children: [
                /* @__PURE__ */ n(X, { htmlFor: `luggage${S}`, children: "Luggage Capacity" }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: `luggage${S}`,
                    value: E.luggage,
                    onChange: ($) => {
                      const A = [...g];
                      A[S].luggage = $.target.value, p(A);
                    },
                    placeholder: "2-3"
                  }
                )
              ] })
            ] })
          ] }, E.id)) })
        ] }) }),
        /* @__PURE__ */ n(ht, { value: "pricing", children: /* @__PURE__ */ s(ue, { children: [
          /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ n(je, { children: "Pricing Structure" }) }),
          /* @__PURE__ */ s(Ee, { className: "space-y-6", children: [
            /* @__PURE__ */ s("div", { className: "p-4 border rounded-lg space-y-3 bg-gray-50", children: [
              /* @__PURE__ */ n("h3", { className: "font-bold text-lg", children: "Standard Vehicle" }),
              /* @__PURE__ */ s("div", { className: "grid md:grid-cols-2 gap-4", children: [
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n(X, { htmlFor: "standardStart", children: "Start Price" }),
                  /* @__PURE__ */ n(
                    q,
                    {
                      id: "standardStart",
                      value: v.standardStart,
                      onChange: (E) => b({ ...v, standardStart: E.target.value }),
                      placeholder: "€5.00"
                    }
                  )
                ] }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n(X, { htmlFor: "standardPerKm", children: "Price per Kilometer" }),
                  /* @__PURE__ */ n(
                    q,
                    {
                      id: "standardPerKm",
                      value: v.standardPerKm,
                      onChange: (E) => b({ ...v, standardPerKm: E.target.value }),
                      placeholder: "€2.00"
                    }
                  )
                ] }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n(X, { htmlFor: "standardInitialKm", children: "Initial Kilometers" }),
                  /* @__PURE__ */ n(
                    q,
                    {
                      id: "standardInitialKm",
                      value: v.standardInitialKm,
                      onChange: (E) => b({ ...v, standardInitialKm: E.target.value }),
                      placeholder: "3"
                    }
                  )
                ] })
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: "p-4 border rounded-lg space-y-3 bg-gray-50", children: [
              /* @__PURE__ */ n("h3", { className: "font-bold text-lg", children: "Van" }),
              /* @__PURE__ */ s("div", { className: "grid md:grid-cols-2 gap-4", children: [
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n(X, { htmlFor: "vanStart", children: "Start Price" }),
                  /* @__PURE__ */ n(
                    q,
                    {
                      id: "vanStart",
                      value: v.vanStart,
                      onChange: (E) => b({ ...v, vanStart: E.target.value }),
                      placeholder: "€8.00"
                    }
                  )
                ] }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n(X, { htmlFor: "vanPerKm", children: "Price per Kilometer" }),
                  /* @__PURE__ */ n(
                    q,
                    {
                      id: "vanPerKm",
                      value: v.vanPerKm,
                      onChange: (E) => b({ ...v, vanPerKm: E.target.value }),
                      placeholder: "€3.00"
                    }
                  )
                ] }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n(X, { htmlFor: "vanInitialKm", children: "Initial Kilometers" }),
                  /* @__PURE__ */ n(
                    q,
                    {
                      id: "vanInitialKm",
                      value: v.vanInitialKm,
                      onChange: (E) => b({ ...v, vanInitialKm: E.target.value }),
                      placeholder: "3"
                    }
                  )
                ] })
              ] })
            ] }),
            /* @__PURE__ */ s("div", { className: "p-4 border rounded-lg space-y-3 bg-gray-50", children: [
              /* @__PURE__ */ n("h3", { className: "font-bold text-lg", children: "Luxury Vehicle" }),
              /* @__PURE__ */ s("div", { className: "grid md:grid-cols-2 gap-4", children: [
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n(X, { htmlFor: "luxuryStart", children: "Start Price" }),
                  /* @__PURE__ */ n(
                    q,
                    {
                      id: "luxuryStart",
                      value: v.luxuryStart,
                      onChange: (E) => b({ ...v, luxuryStart: E.target.value }),
                      placeholder: "€10.00"
                    }
                  )
                ] }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n(X, { htmlFor: "luxuryPerKm", children: "Price per Kilometer" }),
                  /* @__PURE__ */ n(
                    q,
                    {
                      id: "luxuryPerKm",
                      value: v.luxuryPerKm,
                      onChange: (E) => b({ ...v, luxuryPerKm: E.target.value }),
                      placeholder: "€4.00"
                    }
                  )
                ] }),
                /* @__PURE__ */ s("div", { children: [
                  /* @__PURE__ */ n(X, { htmlFor: "luxuryInitialKm", children: "Initial Kilometers" }),
                  /* @__PURE__ */ n(
                    q,
                    {
                      id: "luxuryInitialKm",
                      value: v.luxuryInitialKm,
                      onChange: (E) => b({ ...v, luxuryInitialKm: E.target.value }),
                      placeholder: "3"
                    }
                  )
                ] })
              ] })
            ] })
          ] })
        ] }) }),
        /* @__PURE__ */ n(ht, { value: "colors", children: /* @__PURE__ */ s(ue, { children: [
          /* @__PURE__ */ n(ze, { children: /* @__PURE__ */ n(je, { children: "Brand Color Customization" }) }),
          /* @__PURE__ */ s(Ee, { children: [
            /* @__PURE__ */ n("div", { className: "hidden lg:block overflow-x-auto", children: /* @__PURE__ */ s("table", { className: "w-full border-collapse", children: [
              /* @__PURE__ */ n("thead", { children: /* @__PURE__ */ s("tr", { className: "border-b-2 border-gray-300", children: [
                /* @__PURE__ */ n("th", { className: "text-left py-3 px-4 font-bold text-gray-700", children: "Color Name" }),
                /* @__PURE__ */ n("th", { className: "text-left py-3 px-4 font-bold text-gray-700", children: "Preview" }),
                /* @__PURE__ */ n("th", { className: "text-left py-3 px-4 font-bold text-gray-700", children: "Hex Code" }),
                /* @__PURE__ */ n("th", { className: "text-left py-3 px-4 font-bold text-gray-700", children: "Usage" }),
                /* @__PURE__ */ n("th", { className: "text-left py-3 px-4 font-bold text-gray-700", children: "Color Picker" })
              ] }) }),
              /* @__PURE__ */ n("tbody", { children: w.map((E) => /* @__PURE__ */ s("tr", { className: "border-b border-gray-200 hover:bg-gray-50", children: [
                /* @__PURE__ */ n("td", { className: "py-4 px-4", children: /* @__PURE__ */ n("span", { className: "font-semibold text-gray-900", children: E.name }) }),
                /* @__PURE__ */ n("td", { className: "py-4 px-4", children: /* @__PURE__ */ n(
                  "div",
                  {
                    className: "w-16 h-10 rounded-md border-2 border-gray-300 shadow-sm",
                    style: { backgroundColor: E.color }
                  }
                ) }),
                /* @__PURE__ */ n("td", { className: "py-4 px-4", children: /* @__PURE__ */ n(
                  q,
                  {
                    value: E.color,
                    onChange: (S) => {
                      const $ = [...w];
                      $[E.id - 1].color = S.target.value, y($);
                    },
                    placeholder: "#0F172A",
                    className: "font-mono w-32"
                  }
                ) }),
                /* @__PURE__ */ n("td", { className: "py-4 px-4", children: /* @__PURE__ */ n("p", { className: "text-sm text-gray-600", children: E.description }) }),
                /* @__PURE__ */ n("td", { className: "py-4 px-4", children: /* @__PURE__ */ n(
                  "input",
                  {
                    type: "color",
                    value: E.color,
                    onChange: (S) => {
                      const $ = [...w];
                      $[E.id - 1].color = S.target.value, y($);
                    },
                    className: "w-12 h-10 rounded border-2 border-gray-300 cursor-pointer"
                  }
                ) })
              ] }, E.id)) })
            ] }) }),
            /* @__PURE__ */ n("div", { className: "lg:hidden space-y-4", children: w.map((E) => /* @__PURE__ */ s("div", { className: "p-4 border-2 rounded-lg bg-white shadow-sm space-y-3", children: [
              /* @__PURE__ */ s("div", { className: "flex items-center justify-between", children: [
                /* @__PURE__ */ n("h3", { className: "font-bold text-gray-900", children: E.name }),
                /* @__PURE__ */ n(
                  "div",
                  {
                    className: "w-12 h-12 rounded-md border-2 border-gray-300 shadow-sm",
                    style: { backgroundColor: E.color }
                  }
                )
              ] }),
              /* @__PURE__ */ n("p", { className: "text-sm text-gray-600", children: E.description }),
              /* @__PURE__ */ s("div", { className: "space-y-2", children: [
                /* @__PURE__ */ n(X, { htmlFor: `color-hex-${E.id}`, children: "Hex Code" }),
                /* @__PURE__ */ n(
                  q,
                  {
                    id: `color-hex-${E.id}`,
                    value: E.color,
                    onChange: (S) => {
                      const $ = [...w];
                      $[E.id - 1].color = S.target.value, y($);
                    },
                    placeholder: "#0F172A",
                    className: "font-mono"
                  }
                )
              ] }),
              /* @__PURE__ */ s("div", { className: "space-y-2", children: [
                /* @__PURE__ */ n(X, { htmlFor: `color-picker-${E.id}`, children: "Color Picker" }),
                /* @__PURE__ */ n(
                  "input",
                  {
                    id: `color-picker-${E.id}`,
                    type: "color",
                    value: E.color,
                    onChange: (S) => {
                      const $ = [...w];
                      $[E.id - 1].color = S.target.value, y($);
                    },
                    className: "w-full h-12 rounded border-2 border-gray-300 cursor-pointer"
                  }
                )
              ] })
            ] }, E.id)) }),
            /* @__PURE__ */ s("div", { className: "mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg", children: [
              /* @__PURE__ */ n("h4", { className: "font-bold text-blue-900 mb-2", children: "Color Guidelines" }),
              /* @__PURE__ */ s("ul", { className: "text-sm text-blue-800 space-y-1", children: [
                /* @__PURE__ */ s("li", { children: [
                  "• ",
                  /* @__PURE__ */ n("strong", { children: "Primary Color:" }),
                  " Used for headers, main navigation, and primary buttons"
                ] }),
                /* @__PURE__ */ s("li", { children: [
                  "• ",
                  /* @__PURE__ */ n("strong", { children: "Accent Color:" }),
                  " Used for call-to-action buttons, highlights, and important elements"
                ] }),
                /* @__PURE__ */ s("li", { children: [
                  "• ",
                  /* @__PURE__ */ n("strong", { children: "Background Color:" }),
                  " Main page background and card backgrounds"
                ] })
              ] })
            ] })
          ] })
        ] }) })
      ] }),
      /* @__PURE__ */ n(ue, { className: "mt-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200", children: /* @__PURE__ */ n(Ee, { className: "p-4 sm:p-6", children: /* @__PURE__ */ s("div", { className: "flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4", children: [
        /* @__PURE__ */ s("div", { className: "flex items-center gap-3 sm:gap-4", children: [
          /* @__PURE__ */ n("div", { className: "w-10 h-10 sm:w-12 sm:h-12 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ n(Pt, { className: "w-5 h-5 sm:w-6 sm:h-6 text-white" }) }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ n("h3", { className: "text-base sm:text-lg font-bold text-gray-900", children: "Your Booking Page" }),
            /* @__PURE__ */ s("p", { className: "text-xs sm:text-sm text-gray-600", children: [
              "Live at: ",
              /* @__PURE__ */ n("span", { className: "font-mono font-semibold text-blue-600 text-xs sm:text-sm break-all", children: d.website })
            ] })
          ] })
        ] }),
        /* @__PURE__ */ s(W, { onClick: N, size: "lg", className: "w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white flex-shrink-0", children: [
          /* @__PURE__ */ n(Sr, { className: "w-5 h-5 mr-2" }),
          "Open Preview"
        ] })
      ] }) }) })
    ] })
  ] });
}
function Mx() {
  const { language: e, darkMode: t } = lr(), [r, a] = j(""), i = [
    {
      id: 1,
      name: "Brussels Taxi Pro",
      subdomain: "brusselstaxipro",
      slogan: "Fast & Reliable Service",
      btw: "BE 0123.456.789",
      phone: "+32 470 123 456",
      email: "contact@brusselstaxipro.be",
      city: "Brussels",
      status: "available",
      verified: !0
    },
    {
      id: 2,
      name: "Antwerp Express Taxi",
      subdomain: "antwerpexpress",
      slogan: "Your Premium Ride Partner",
      btw: "BE 0987.654.321",
      phone: "+32 471 234 567",
      email: "info@antwerpexpress.be",
      city: "Antwerp",
      status: "busy",
      verified: !0
    },
    {
      id: 3,
      name: "Ghent City Cabs",
      subdomain: "ghentcitycabs",
      slogan: "24/7 Service",
      btw: "BE 0555.777.999",
      phone: "+32 472 345 678",
      email: "hello@ghentcitycabs.be",
      city: "Ghent",
      status: "available",
      verified: !0
    },
    {
      id: 4,
      name: "Liège Taxi Service",
      subdomain: "liegetaxi",
      slogan: "Professional Drivers",
      btw: "BE 0444.888.222",
      phone: "+32 473 456 789",
      email: "contact@liegetaxi.be",
      city: "Liège",
      status: "offline",
      verified: !1
    }
  ], l = {
    en: {
      title: "Our network of registered taxi.",
      subtitle: "Find and book with professional taxi companies across Belgium",
      searchPlaceholder: "Search by name or city",
      companiesCount: "companies found",
      noResults: "No companies found",
      verified: "Verified",
      available: "Available",
      busy: "Busy",
      offline: "Offline",
      viewBooking: "View Booking"
    },
    fr: {
      title: "Notre réseau de taxi enregistrés.",
      subtitle: "Trouvez et réservez avec des compagnies de taxi professionnelles en Belgique",
      searchPlaceholder: "Recherchez par nom ou ville",
      companiesCount: "compagnies trouvées",
      noResults: "Aucune compagnie trouvée",
      verified: "Vérifié",
      available: "Disponible",
      busy: "Occupé",
      offline: "Hors ligne",
      viewBooking: "Voir la réservation"
    },
    nl: {
      title: "Ons netwerk van geregistreerde taxi.",
      subtitle: "Vind en boek bij professionele taxibedrijven in België",
      searchPlaceholder: "Zoek op naam of stad",
      companiesCount: "bedrijven gevonden",
      noResults: "Geen bedrijven gevonden",
      verified: "Geverifieerd",
      available: "Beschikbaar",
      busy: "Bezig",
      offline: "Offline",
      viewBooking: "Boeking bekijken"
    }
  }[e], u = i.filter(
    (p) => p.name.toLowerCase().includes(r.toLowerCase()) || p.city.toLowerCase().includes(r.toLowerCase())
  ), c = (p) => ({
    available: {
      color: "bg-green-500",
      textColor: t ? "text-green-400" : "text-green-600",
      label: l.available
    },
    busy: {
      color: "bg-red-500",
      textColor: t ? "text-red-400" : "text-red-600",
      label: l.busy
    },
    offline: {
      color: "bg-gray-500",
      textColor: t ? "text-gray-400" : "text-gray-600",
      label: l.offline
    }
  })[p], d = t ? "bg-slate-900" : "bg-gray-50", h = t ? "bg-slate-800" : "bg-white", m = t ? "text-white" : "text-slate-900", f = t ? "text-gray-400" : "text-gray-600", g = t ? "bg-slate-700 border-slate-600 text-white placeholder:text-gray-400" : "bg-white border-gray-300 text-gray-900 placeholder:text-gray-500";
  return /* @__PURE__ */ s("div", { className: `min-h-screen ${d} py-12 px-4`, children: [
    /* @__PURE__ */ n(vn, {}),
    /* @__PURE__ */ s("div", { className: "max-w-6xl mx-auto", children: [
      /* @__PURE__ */ s("div", { className: "text-center mb-8", children: [
        /* @__PURE__ */ s("div", { className: "flex items-center justify-center gap-3 mb-4", children: [
          /* @__PURE__ */ n("div", { className: "w-16 h-16 rounded-2xl bg-yellow-400 flex items-center justify-center shadow-lg", children: /* @__PURE__ */ n(_e, { className: "w-8 h-8 text-slate-900" }) }),
          /* @__PURE__ */ n("h1", { className: `text-4xl font-bold ${m}`, children: "TAXIO" })
        ] }),
        /* @__PURE__ */ n("h2", { className: `text-2xl font-bold mb-2 ${m}`, children: l.title }),
        /* @__PURE__ */ n("p", { className: `text-sm ${f} max-w-2xl mx-auto`, children: l.subtitle })
      ] }),
      /* @__PURE__ */ s(ue, { className: `${h} border-0 shadow-lg p-4 mb-8`, children: [
        /* @__PURE__ */ s("div", { className: "relative", children: [
          /* @__PURE__ */ n(Yo, { className: "absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-yellow-500" }),
          /* @__PURE__ */ n(
            q,
            {
              value: r,
              onChange: (p) => a(p.target.value),
              placeholder: l.searchPlaceholder,
              className: `h-12 pl-11 ${g}`
            }
          )
        ] }),
        /* @__PURE__ */ s("p", { className: `text-xs mt-2 ${f}`, children: [
          u.length,
          " ",
          l.companiesCount
        ] })
      ] }),
      u.length === 0 ? /* @__PURE__ */ s(ue, { className: `${h} border-0 shadow-lg p-12 text-center`, children: [
        /* @__PURE__ */ n(Yo, { className: `w-16 h-16 mx-auto mb-4 ${f}` }),
        /* @__PURE__ */ n("p", { className: `text-lg ${f}`, children: l.noResults })
      ] }) : /* @__PURE__ */ n("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6", children: u.map((p) => {
        const v = c(p.status);
        return /* @__PURE__ */ s(
          ue,
          {
            className: `${h} border-0 shadow-lg p-6 hover:shadow-xl transition-shadow`,
            children: [
              /* @__PURE__ */ n("div", { className: "flex items-start justify-between mb-4", children: /* @__PURE__ */ s("div", { className: "flex items-start gap-3", children: [
                /* @__PURE__ */ n("div", { className: "w-12 h-12 rounded-lg bg-yellow-400 flex items-center justify-center flex-shrink-0", children: /* @__PURE__ */ n(_e, { className: "w-6 h-6 text-slate-900" }) }),
                /* @__PURE__ */ s("div", { className: "flex-1", children: [
                  /* @__PURE__ */ s("div", { className: "flex items-center gap-2 mb-1", children: [
                    /* @__PURE__ */ n("h3", { className: `font-bold ${m} leading-tight`, children: p.name }),
                    p.verified && /* @__PURE__ */ n(
                      "div",
                      {
                        className: "w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0",
                        title: l.verified,
                        children: /* @__PURE__ */ n("svg", { className: "w-3 h-3 text-white", fill: "currentColor", viewBox: "0 0 20 20", children: /* @__PURE__ */ n("path", { fillRule: "evenodd", d: "M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z", clipRule: "evenodd" }) })
                      }
                    )
                  ] }),
                  /* @__PURE__ */ n("p", { className: `text-xs italic ${t ? "text-yellow-400" : "text-yellow-600"}`, children: p.slogan })
                ] })
              ] }) }),
              /* @__PURE__ */ s("div", { className: "flex items-center gap-2 mb-4", children: [
                /* @__PURE__ */ n("div", { className: `w-2 h-2 rounded-full ${v.color} animate-pulse` }),
                /* @__PURE__ */ n("span", { className: `text-xs font-semibold ${v.textColor}`, children: v.label })
              ] }),
              /* @__PURE__ */ s("div", { className: `text-xs ${f} space-y-2 mb-4`, children: [
                /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ n(Pt, { className: "w-3.5 h-3.5" }),
                  /* @__PURE__ */ n("span", { children: p.city })
                ] }),
                /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ n(ca, { className: "w-3.5 h-3.5" }),
                  /* @__PURE__ */ n("span", { children: p.phone })
                ] }),
                /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ n(Er, { className: "w-3.5 h-3.5" }),
                  /* @__PURE__ */ n("span", { className: "truncate", children: p.email })
                ] }),
                /* @__PURE__ */ s("div", { className: "flex items-center gap-2", children: [
                  /* @__PURE__ */ n(ro, { className: "w-3.5 h-3.5" }),
                  /* @__PURE__ */ s("span", { children: [
                    "BTW: ",
                    p.btw
                  ] })
                ] })
              ] }),
              /* @__PURE__ */ s(
                W,
                {
                  onClick: () => window.location.href = `/book/${p.subdomain}`,
                  className: "w-full bg-yellow-400 hover:bg-yellow-500 text-slate-900 font-semibold",
                  children: [
                    /* @__PURE__ */ n(Ei, { className: "w-4 h-4 mr-2" }),
                    l.viewBooking
                  ]
                }
              )
            ]
          },
          p.id
        );
      }) }),
      /* @__PURE__ */ s("div", { className: "text-center mt-12 space-y-2", children: [
        /* @__PURE__ */ s("p", { className: `text-xs ${f}`, children: [
          "© ",
          (/* @__PURE__ */ new Date()).getFullYear(),
          " TAXIO. All rights reserved."
        ] }),
        /* @__PURE__ */ n("p", { className: `text-xs font-semibold ${t ? "text-yellow-400" : "text-yellow-600"}`, children: "Powered by TAXIO" })
      ] })
    ] })
  ] });
}
function Ix() {
  const { language: e, darkMode: t } = lr(), r = t ? "bg-slate-900" : "bg-gray-50", a = t ? "bg-slate-800" : "bg-white", i = t ? "text-white" : "text-slate-900", o = t ? "text-gray-400" : "text-gray-600", u = {
    en: {
      title: "Terms and Conditions",
      lastUpdated: "Last Updated: April 1, 2026",
      sections: [
        {
          title: "1. Introduction",
          content: "Welcome to TAXIO. These Terms and Conditions govern your use of our platform. By accessing or using TAXIO, you agree to be bound by these terms."
        },
        {
          title: "2. Service Description",
          content: "TAXIO provides a hosting platform for taxi companies to create their own branded websites. We are a technology provider and do NOT operate as a taxi service or ride-hailing platform. Each taxi company is an independent business responsible for their own services."
        },
        {
          title: "3. No Commission Model",
          content: "TAXIO does NOT charge commission on rides. We operate on a subscription-based model. Taxi companies pay a fixed monthly fee (€29.99 for Professional Plan) and keep 100% of their ride earnings."
        },
        {
          title: "4. Booking Process",
          content: "All bookings are handled directly between customers and taxi companies via WhatsApp or Email. TAXIO does NOT process, store, or manage any passenger personal data. We only provide the technology platform for companies to receive booking requests."
        },
        {
          title: "5. Data & Privacy",
          content: "TAXIO only stores taxi company business information (company name, BTW number, contact details). We DO NOT store customer/passenger data. All passenger information is communicated directly to the taxi company via external channels (WhatsApp/Email), making us GDPR-compliant as a hosting provider only."
        },
        {
          title: "6. Payment & Subscriptions",
          content: "Subscription fees are billed monthly in advance. You can cancel anytime with 30 days notice. Refunds are not provided for partial months. Payment is processed securely through our payment provider (Mollie/Stripe)."
        },
        {
          title: "7. Account Responsibilities",
          content: "Taxi companies are responsible for: (a) maintaining accurate business information, (b) responding to customer booking requests, (c) complying with all local taxi regulations, (d) maintaining valid insurance and licenses, (e) setting fair and transparent pricing."
        },
        {
          title: "8. Prohibited Activities",
          content: "You may NOT: (a) use the platform for illegal activities, (b) impersonate another company, (c) share your account credentials, (d) attempt to hack or disrupt the service, (e) violate any local taxi regulations."
        },
        {
          title: "9. Limitation of Liability",
          content: "TAXIO is a technology platform only. We are NOT responsible for: (a) taxi service quality, (b) driver behavior, (c) accidents or incidents during rides, (d) disputes between companies and passengers, (e) payment disputes for rides. The taxi company is solely responsible for all aspects of their service delivery."
        },
        {
          title: "10. Service Availability",
          content: "We strive for 99.9% uptime but cannot guarantee uninterrupted service. We may perform maintenance that temporarily affects availability. We are not liable for any losses due to service interruptions."
        },
        {
          title: "11. Termination",
          content: "We reserve the right to suspend or terminate accounts that violate these terms. Upon termination, your website will be deactivated and data will be deleted after 30 days."
        },
        {
          title: "12. Changes to Terms",
          content: "We may update these terms with 30 days notice via email. Continued use of the platform after changes constitutes acceptance of new terms."
        },
        {
          title: "13. Governing Law",
          content: "These terms are governed by Belgian law. Disputes shall be resolved in the courts of Belgium."
        },
        {
          title: "14. Contact",
          content: "For questions about these terms, contact us at: legal@taxio.be"
        }
      ]
    },
    fr: {
      title: "Conditions Générales",
      lastUpdated: "Dernière mise à jour : 1er avril 2026",
      sections: [
        {
          title: "1. Introduction",
          content: "Bienvenue sur TAXIO. Ces conditions générales régissent votre utilisation de notre plateforme. En accédant ou en utilisant TAXIO, vous acceptez d'être lié par ces conditions."
        },
        {
          title: "2. Description du Service",
          content: "TAXIO fournit une plateforme d'hébergement pour les compagnies de taxi afin de créer leurs propres sites web de marque. Nous sommes un fournisseur de technologie et n'exploitons PAS de service de taxi ou de plateforme de covoiturage. Chaque compagnie de taxi est une entreprise indépendante responsable de ses propres services."
        },
        {
          title: "3. Modèle Sans Commission",
          content: "TAXIO ne facture PAS de commission sur les courses. Nous fonctionnons sur un modèle d'abonnement. Les compagnies de taxi paient des frais mensuels fixes (29,99 € pour le Plan Professionnel) et conservent 100 % de leurs revenus."
        },
        {
          title: "4. Processus de Réservation",
          content: "Toutes les réservations sont traitées directement entre les clients et les compagnies de taxi via WhatsApp ou Email. TAXIO ne traite, ne stocke ni ne gère aucune donnée personnelle des passagers. Nous fournissons uniquement la plateforme technologique permettant aux entreprises de recevoir des demandes de réservation."
        },
        {
          title: "5. Données et Confidentialité",
          content: "TAXIO ne stocke que les informations commerciales des compagnies de taxi (nom de l'entreprise, numéro de TVA, coordonnées). Nous ne stockons PAS les données des clients/passagers. Toutes les informations sur les passagers sont communiquées directement à la compagnie de taxi via des canaux externes (WhatsApp/Email), ce qui nous rend conformes au RGPD en tant que simple fournisseur d'hébergement."
        },
        {
          title: "6. Paiement et Abonnements",
          content: "Les frais d'abonnement sont facturés mensuellement à l'avance. Vous pouvez annuler à tout moment avec un préavis de 30 jours. Les remboursements ne sont pas prévus pour les mois partiels. Le paiement est traité en toute sécurité via notre fournisseur de paiement (Mollie/Stripe)."
        },
        {
          title: "7. Responsabilités du Compte",
          content: "Les compagnies de taxi sont responsables de : (a) maintenir des informations commerciales exactes, (b) répondre aux demandes de réservation des clients, (c) se conformer à toutes les réglementations locales sur les taxis, (d) maintenir une assurance et des licences valides, (e) fixer des prix équitables et transparents."
        },
        {
          title: "8. Activités Interdites",
          content: "Vous ne pouvez PAS : (a) utiliser la plateforme pour des activités illégales, (b) usurper l'identité d'une autre entreprise, (c) partager vos identifiants de compte, (d) tenter de pirater ou de perturber le service, (e) violer les réglementations locales sur les taxis."
        },
        {
          title: "9. Limitation de Responsabilité",
          content: "TAXIO est uniquement une plateforme technologique. Nous ne sommes PAS responsables de : (a) la qualité du service de taxi, (b) le comportement du conducteur, (c) les accidents ou incidents pendant les trajets, (d) les litiges entre les entreprises et les passagers, (e) les litiges de paiement pour les courses. La compagnie de taxi est seule responsable de tous les aspects de la prestation de services."
        },
        {
          title: "10. Disponibilité du Service",
          content: "Nous visons un temps de disponibilité de 99,9 % mais ne pouvons pas garantir un service ininterrompu. Nous pouvons effectuer une maintenance qui affecte temporairement la disponibilité. Nous ne sommes pas responsables des pertes dues aux interruptions de service."
        },
        {
          title: "11. Résiliation",
          content: "Nous nous réservons le droit de suspendre ou de résilier les comptes qui violent ces conditions. Lors de la résiliation, votre site web sera désactivé et les données seront supprimées après 30 jours."
        },
        {
          title: "12. Modifications des Conditions",
          content: "Nous pouvons mettre à jour ces conditions avec un préavis de 30 jours par email. L'utilisation continue de la plateforme après les modifications constitue l'acceptation des nouvelles conditions."
        },
        {
          title: "13. Loi Applicable",
          content: "Ces conditions sont régies par le droit belge. Les litiges seront résolus devant les tribunaux de Belgique."
        },
        {
          title: "14. Contact",
          content: "Pour toute question concernant ces conditions, contactez-nous à : legal@taxio.be"
        }
      ]
    },
    nl: {
      title: "Algemene Voorwaarden",
      lastUpdated: "Laatst bijgewerkt: 1 april 2026",
      sections: [
        {
          title: "1. Introductie",
          content: "Welkom bij TAXIO. Deze Algemene Voorwaarden regelen uw gebruik van ons platform. Door TAXIO te openen of te gebruiken, gaat u akkoord met deze voorwaarden."
        },
        {
          title: "2. Servicebeschrijving",
          content: "TAXIO biedt een hostingplatform voor taxibedrijven om hun eigen merkwebsites te maken. We zijn een technologieleverancier en werken NIET als taxidienst of ride-hailing platform. Elk taxibedrijf is een onafhankelijk bedrijf dat verantwoordelijk is voor zijn eigen diensten."
        },
        {
          title: "3. Geen Commissiemodel",
          content: "TAXIO rekent GEEN commissie op ritten. We werken met een abonnementsmodel. Taxibedrijven betalen een vast maandelijks bedrag (€29,99 voor Professioneel Abonnement) en houden 100% van hun inkomsten."
        },
        {
          title: "4. Boekingsproces",
          content: "Alle boekingen worden rechtstreeks afgehandeld tussen klanten en taxibedrijven via WhatsApp of Email. TAXIO verwerkt, bewaart of beheert GEEN persoonlijke gegevens van passagiers. We bieden alleen het technologieplatform voor bedrijven om boekingsverzoeken te ontvangen."
        },
        {
          title: "5. Gegevens en Privacy",
          content: "TAXIO slaat alleen bedrijfsinformatie van taxibedrijven op (bedrijfsnaam, BTW-nummer, contactgegevens). We bewaren GEEN klant-/passagiersgegevens. Alle passagiersinformatie wordt rechtstreeks aan het taxibedrijf gecommuniceerd via externe kanalen (WhatsApp/Email), waardoor we AVG-compliant zijn als alleen hostingprovider."
        },
        {
          title: "6. Betaling en Abonnementen",
          content: "Abonnementskosten worden maandelijks vooraf gefactureerd. U kunt op elk moment opzeggen met een opzegtermijn van 30 dagen. Terugbetalingen worden niet verstrekt voor gedeeltelijke maanden. Betaling wordt veilig verwerkt via onze betalingsprovider (Mollie/Stripe)."
        },
        {
          title: "7. Accountverantwoordelijkheden",
          content: "Taxibedrijven zijn verantwoordelijk voor: (a) het bijhouden van nauwkeurige bedrijfsinformatie, (b) het reageren op boekingsverzoeken van klanten, (c) het naleven van alle lokale taxiregels, (d) het onderhouden van geldige verzekeringen en licenties, (e) het vaststellen van eerlijke en transparante prijzen."
        },
        {
          title: "8. Verboden Activiteiten",
          content: "U mag NIET: (a) het platform gebruiken voor illegale activiteiten, (b) zich voordoen als een ander bedrijf, (c) uw accountgegevens delen, (d) proberen te hacken of de service te verstoren, (e) lokale taxiregels overtreden."
        },
        {
          title: "9. Beperking van Aansprakelijkheid",
          content: "TAXIO is alleen een technologieplatform. We zijn NIET verantwoordelijk voor: (a) taxidienst kwaliteit, (b) chauffeur gedrag, (c) ongevallen of incidenten tijdens ritten, (d) geschillen tussen bedrijven en passagiers, (e) betalingsgeschillen voor ritten. Het taxibedrijf is als enige verantwoordelijk voor alle aspecten van hun dienstverlening."
        },
        {
          title: "10. Servicebeschikbaarheid",
          content: "We streven naar 99,9% uptime maar kunnen geen ononderbroken service garanderen. We kunnen onderhoud uitvoeren dat tijdelijk de beschikbaarheid beïnvloedt. We zijn niet aansprakelijk voor verliezen door serviceonderbrekingen."
        },
        {
          title: "11. Beëindiging",
          content: "We behouden ons het recht voor om accounts op te schorten of te beëindigen die deze voorwaarden schenden. Bij beëindiging wordt uw website gedeactiveerd en worden gegevens na 30 dagen verwijderd."
        },
        {
          title: "12. Wijzigingen in Voorwaarden",
          content: "We kunnen deze voorwaarden bijwerken met 30 dagen kennisgeving via e-mail. Voortgezet gebruik van het platform na wijzigingen vormt acceptatie van nieuwe voorwaarden."
        },
        {
          title: "13. Toepasselijk Recht",
          content: "Deze voorwaarden worden beheerst door Belgisch recht. Geschillen worden beslecht door de rechtbanken van België."
        },
        {
          title: "14. Contact",
          content: "Voor vragen over deze voorwaarden, neem contact met ons op via: legal@taxio.be"
        }
      ]
    }
  }[e];
  return /* @__PURE__ */ s("div", { className: `min-h-screen ${r}`, children: [
    /* @__PURE__ */ n(vn, {}),
    /* @__PURE__ */ s("div", { className: "max-w-4xl mx-auto px-4 py-8", children: [
      /* @__PURE__ */ s("div", { className: "mb-8", children: [
        /* @__PURE__ */ n(Ve, { to: "/", children: /* @__PURE__ */ s(W, { variant: "ghost", className: `mb-4 ${i}`, children: [
          /* @__PURE__ */ n(sr, { className: "w-4 h-4 mr-2" }),
          "Back to Home"
        ] }) }),
        /* @__PURE__ */ s("div", { className: "flex items-center gap-3 mb-2", children: [
          /* @__PURE__ */ n("div", { className: "w-12 h-12 rounded-full bg-yellow-400 flex items-center justify-center", children: /* @__PURE__ */ n(Ha, { className: "w-6 h-6 text-slate-900" }) }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ n("h1", { className: `text-3xl font-bold ${i}`, children: u.title }),
            /* @__PURE__ */ n("p", { className: `text-sm ${o}`, children: u.lastUpdated })
          ] })
        ] })
      ] }),
      /* @__PURE__ */ n(ue, { className: `${a} p-6 md:p-8 space-y-6`, children: u.sections.map((c, d) => /* @__PURE__ */ s("div", { children: [
        /* @__PURE__ */ n("h2", { className: `text-xl font-bold mb-2 ${i}`, children: c.title }),
        /* @__PURE__ */ n("p", { className: `${o} leading-relaxed`, children: c.content })
      ] }, d)) }),
      /* @__PURE__ */ n("div", { className: "text-center mt-8", children: /* @__PURE__ */ s("p", { className: `text-sm ${o}`, children: [
        "© ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " TAXIO. All rights reserved."
      ] }) })
    ] })
  ] });
}
function Ox() {
  const { language: e, darkMode: t } = lr(), r = t ? "bg-slate-900" : "bg-gray-50", a = t ? "bg-slate-800" : "bg-white", i = t ? "text-white" : "text-slate-900", o = t ? "text-gray-400" : "text-gray-600", u = {
    en: {
      title: "Privacy Policy",
      lastUpdated: "Last Updated: April 1, 2026",
      gdprCompliant: "GDPR Compliant - We respect your privacy",
      sections: [
        {
          title: "1. Who We Are",
          content: "TAXIO is a technology platform that provides hosting services for taxi companies in Belgium. We are NOT a taxi service provider. We are a hosting provider only. Our registered office is in Belgium and we comply with EU GDPR regulations."
        },
        {
          title: "2. What Data We DON'T Collect (Most Important!)",
          content: "🔒 WE DO NOT COLLECT OR STORE ANY PASSENGER/CUSTOMER DATA. When someone books a taxi through a company's TAXIO website, that booking information goes directly to the taxi company via WhatsApp or Email. We never see, store, or process any passenger personal data. This makes us GDPR-compliant as a pure hosting provider."
        },
        {
          title: "3. What Data We DO Collect",
          content: `We ONLY collect data from taxi companies who subscribe to our platform:

• Company Information: Business name, BTW number, address, city
• Contact Details: Business phone, business email
• Account Credentials: Email and encrypted password for login
• Subscription Data: Payment information (processed by Mollie/Stripe, not stored by us)
• Driver Information: Names, phone numbers, email addresses (entered by the company owner)
• Vehicle Information: Car models, license plates, types
• Pricing Settings: The rates set by the company`
        },
        {
          title: "4. How We Use Data",
          content: `Company data is used to:
• Provide the TAXIO platform service
• Display company information on their branded website
• Process subscription payments
• Send service notifications and updates
• Provide customer support
• Improve our platform`
        },
        {
          title: "5. Data Sharing",
          content: `We DO NOT sell or share your data with third parties, except:
• Payment processors (Mollie/Stripe) - for subscription billing only
• Email service (Resend) - for sending account notifications
• Hosting provider (Supabase) - for secure data storage
• Law enforcement - only if legally required`
        },
        {
          title: "6. Data Storage & Security",
          content: `• All data is stored securely in Supabase (EU servers)
• Data is encrypted in transit (HTTPS/SSL)
• Passwords are encrypted using industry-standard hashing
• We use Row Level Security (RLS) policies
• Regular security audits are performed
• Backups are encrypted and stored securely`
        },
        {
          title: "7. Your Rights (GDPR)",
          content: `As a company owner, you have the right to:
• Access your data (view in dashboard)
• Correct your data (edit in dashboard)
• Delete your data (cancel subscription)
• Export your data (download from dashboard)
• Object to processing
• Withdraw consent

To exercise these rights, contact us at: info@taxio.be`
        },
        {
          title: "8. Data Retention",
          content: `• Active accounts: Data stored as long as subscription is active
• Cancelled accounts: Data deleted 30 days after cancellation
• Backup data: Deleted from backups within 90 days
• Legal obligations: Some data may be retained longer if required by law`
        },
        {
          title: "9. Cookies",
          content: `We use minimal cookies:
• Essential cookies: For login and session management (required)
• Preference cookies: To remember your language and dark mode settings
• NO tracking cookies
• NO advertising cookies
• NO third-party analytics cookies

You can disable non-essential cookies in your browser settings.`
        },
        {
          title: "10. Children's Privacy",
          content: "TAXIO is a business platform. We do not knowingly collect data from anyone under 18 years old. Our service is only for registered businesses."
        },
        {
          title: "11. International Data Transfers",
          content: "Your data is stored in EU servers (Supabase EU region). We do not transfer data outside the EU except to trusted service providers who are GDPR-compliant."
        },
        {
          title: "12. Changes to Privacy Policy",
          content: "We may update this policy with 30 days email notice. Continued use after changes means you accept the new policy."
        },
        {
          title: "13. Contact Us",
          content: `For privacy questions or to exercise your GDPR rights:

Email: info@taxio.be
Data Protection Officer: dpo@taxio.be
Address: TAXIO Privacy Team, Belgium

Response time: Within 30 days as required by GDPR`
        },
        {
          title: "14. Complaints",
          content: `If you believe we are not handling your data properly, you have the right to lodge a complaint with:

Belgian Data Protection Authority (APD/GBA)
Website: www.dataprotectionauthority.be`
        }
      ]
    },
    fr: {
      title: "Politique de Confidentialité",
      lastUpdated: "Dernière mise à jour : 1er avril 2026",
      gdprCompliant: "Conforme RGPD - Nous respectons votre vie privée",
      sections: [
        {
          title: "1. Qui Sommes-Nous",
          content: "TAXIO est une plateforme technologique qui fournit des services d'hébergement pour les compagnies de taxi en Belgique. Nous ne sommes PAS un fournisseur de services de taxi. Nous sommes uniquement un fournisseur d'hébergement. Notre siège social est en Belgique et nous nous conformons aux réglementations RGPD de l'UE."
        },
        {
          title: "2. Quelles Données Nous NE Collectons PAS (Le Plus Important !)",
          content: "🔒 NOUS NE COLLECTONS NI NE STOCKONS AUCUNE DONNÉE DE PASSAGER/CLIENT. Lorsque quelqu'un réserve un taxi via le site web TAXIO d'une entreprise, ces informations de réservation vont directement à la compagnie de taxi via WhatsApp ou Email. Nous ne voyons, ne stockons ni ne traitons jamais les données personnelles des passagers. Cela nous rend conformes au RGPD en tant que pur fournisseur d'hébergement."
        },
        {
          title: "3. Quelles Données Nous Collectons",
          content: `Nous collectons UNIQUEMENT des données des compagnies de taxi abonnées à notre plateforme :

• Informations sur l'entreprise : Nom commercial, numéro de TVA, adresse, ville
• Coordonnées : Téléphone professionnel, email professionnel
• Identifiants de compte : Email et mot de passe crypté pour la connexion
• Données d'abonnement : Informations de paiement (traitées par Mollie/Stripe, non stockées par nous)
• Informations sur les chauffeurs : Noms, numéros de téléphone, adresses email (saisis par le propriétaire de l'entreprise)
• Informations sur les véhicules : Modèles de voiture, plaques d'immatriculation, types
• Paramètres de tarification : Les tarifs fixés par l'entreprise`
        },
        {
          title: "4. Comment Nous Utilisons les Données",
          content: `Les données de l'entreprise sont utilisées pour :
• Fournir le service de la plateforme TAXIO
• Afficher les informations de l'entreprise sur leur site web de marque
• Traiter les paiements d'abonnement
• Envoyer des notifications et mises à jour du service
• Fournir un support client
• Améliorer notre plateforme`
        },
        {
          title: "5. Partage des Données",
          content: `Nous ne vendons ni ne partageons vos données avec des tiers, sauf :
• Processeurs de paiement (Mollie/Stripe) - pour la facturation de l'abonnement uniquement
• Service d'email (Resend) - pour l'envoi de notifications de compte
• Fournisseur d'hébergement (Supabase) - pour le stockage sécurisé des données
• Forces de l'ordre - seulement si légalement requis`
        },
        {
          title: "6. Stockage et Sécurité des Données",
          content: `• Toutes les données sont stockées en toute sécurité dans Supabase (serveurs UE)
• Les données sont cryptées en transit (HTTPS/SSL)
• Les mots de passe sont cryptés à l'aide d'un hachage standard
• Nous utilisons des politiques de sécurité au niveau des lignes (RLS)
• Des audits de sécurité réguliers sont effectués
• Les sauvegardes sont cryptées et stockées en toute sécurité`
        },
        {
          title: "7. Vos Droits (RGPD)",
          content: `En tant que propriétaire d'entreprise, vous avez le droit de :
• Accéder à vos données (voir dans le tableau de bord)
• Corriger vos données (modifier dans le tableau de bord)
• Supprimer vos données (annuler l'abonnement)
• Exporter vos données (télécharger depuis le tableau de bord)
• Vous opposer au traitement
• Retirer votre consentement

Pour exercer ces droits, contactez-nous à : info@taxio.be`
        },
        {
          title: "8. Conservation des Données",
          content: `• Comptes actifs : Données stockées tant que l'abonnement est actif
• Comptes annulés : Données supprimées 30 jours après l'annulation
• Données de sauvegarde : Supprimées des sauvegardes dans les 90 jours
• Obligations légales : Certaines données peuvent être conservées plus longtemps si la loi l'exige`
        },
        {
          title: "9. Cookies",
          content: `Nous utilisons un minimum de cookies :
• Cookies essentiels : Pour la connexion et la gestion de session (requis)
• Cookies de préférence : Pour mémoriser vos paramètres de langue et de mode sombre
• AUCUN cookie de suivi
• AUCUN cookie publicitaire
• AUCUN cookie d'analyse tiers

Vous pouvez désactiver les cookies non essentiels dans les paramètres de votre navigateur.`
        },
        {
          title: "10. Confidentialité des Enfants",
          content: "TAXIO est une plateforme commerciale. Nous ne collectons pas sciemment de données de personnes de moins de 18 ans. Notre service est uniquement destiné aux entreprises enregistrées."
        },
        {
          title: "11. Transferts Internationaux de Données",
          content: "Vos données sont stockées sur des serveurs de l'UE (région UE de Supabase). Nous ne transférons pas de données en dehors de l'UE, sauf vers des fournisseurs de services de confiance conformes au RGPD."
        },
        {
          title: "12. Modifications de la Politique de Confidentialité",
          content: "Nous pouvons mettre à jour cette politique avec un préavis de 30 jours par email. L'utilisation continue après les modifications signifie que vous acceptez la nouvelle politique."
        },
        {
          title: "13. Nous Contacter",
          content: `Pour les questions de confidentialité ou pour exercer vos droits RGPD :

Email : info@taxio.be
Délégué à la protection des données : dpo@taxio.be
Adresse : TAXIO Privacy Team, Belgique

Délai de réponse : Dans les 30 jours comme requis par le RGPD`
        },
        {
          title: "14. Plaintes",
          content: `Si vous pensez que nous ne traitons pas correctement vos données, vous avez le droit de déposer une plainte auprès de :

Autorité belge de protection des données (APD/GBA)
Site web : www.dataprotectionauthority.be`
        }
      ]
    },
    nl: {
      title: "Privacybeleid",
      lastUpdated: "Laatst bijgewerkt: 1 april 2026",
      gdprCompliant: "AVG-conform - We respecteren uw privacy",
      sections: [
        {
          title: "1. Wie Wij Zijn",
          content: "TAXIO is een technologieplatform dat hostingdiensten biedt voor taxibedrijven in België. Wij zijn GEEN taxidienstverlener. Wij zijn alleen een hostingprovider. Ons geregistreerde kantoor is in België en we voldoen aan de EU AVG-regelgeving."
        },
        {
          title: "2. Welke Gegevens Wij NIET Verzamelen (Meest Belangrijk!)",
          content: "🔒 WIJ VERZAMELEN OF BEWAREN GEEN PASSAGIERS-/KLANTGEGEVENS. Wanneer iemand een taxi boekt via de TAXIO-website van een bedrijf, gaan die boekingsgegevens rechtstreeks naar het taxibedrijf via WhatsApp of Email. We zien, bewaren of verwerken nooit persoonlijke gegevens van passagiers. Dit maakt ons AVG-conform als pure hostingprovider."
        },
        {
          title: "3. Welke Gegevens Wij WEL Verzamelen",
          content: `We verzamelen ALLEEN gegevens van taxibedrijven die zich abonneren op ons platform:

• Bedrijfsinformatie: Bedrijfsnaam, BTW-nummer, adres, stad
• Contactgegevens: Zakelijke telefoon, zakelijke e-mail
• Accountgegevens: E-mail en versleuteld wachtwoord voor inloggen
• Abonnementsgegevens: Betalingsinformatie (verwerkt door Mollie/Stripe, niet opgeslagen door ons)
• Chauffeursinformatie: Namen, telefoonnummers, e-mailadressen (ingevoerd door de bedrijfseigenaar)
• Voertuiginformatie: Automodellen, kentekens, typen
• Prijsinstellingen: De tarieven vastgesteld door het bedrijf`
        },
        {
          title: "4. Hoe We Gegevens Gebruiken",
          content: `Bedrijfsgegevens worden gebruikt om:
• De TAXIO-platformservice te leveren
• Bedrijfsinformatie weer te geven op hun merkwebsite
• Abonnementsbetalingen te verwerken
• Servicemeldingen en updates te verzenden
• Klantenondersteuning te bieden
• Ons platform te verbeteren`
        },
        {
          title: "5. Gegevensdeling",
          content: `We verkopen of delen uw gegevens NIET met derden, behalve:
• Betalingsverwerkers (Mollie/Stripe) - alleen voor abonnementsfacturering
• E-mailservice (Resend) - voor het verzenden van accountmeldingen
• Hostingprovider (Supabase) - voor veilige gegevensopslag
• Wetshandhaving - alleen indien wettelijk vereist`
        },
        {
          title: "6. Gegevensopslag en Beveiliging",
          content: `• Alle gegevens worden veilig opgeslagen in Supabase (EU-servers)
• Gegevens zijn versleuteld tijdens verzending (HTTPS/SSL)
• Wachtwoorden zijn versleuteld met industriestandaard hashing
• We gebruiken Row Level Security (RLS) beleid
• Regelmatige beveiligingsaudits worden uitgevoerd
• Back-ups zijn versleuteld en veilig opgeslagen`
        },
        {
          title: "7. Uw Rechten (AVG)",
          content: `Als bedrijfseigenaar heeft u het recht om:
• Toegang tot uw gegevens (bekijk in dashboard)
• Uw gegevens te corrigeren (bewerk in dashboard)
• Uw gegevens te verwijderen (abonnement annuleren)
• Uw gegevens te exporteren (download van dashboard)
• Bezwaar te maken tegen verwerking
• Toestemming in te trekken

Om deze rechten uit te oefenen, neem contact met ons op via: info@taxio.be`
        },
        {
          title: "8. Gegevensbewaring",
          content: `• Actieve accounts: Gegevens opgeslagen zolang abonnement actief is
• Geannuleerde accounts: Gegevens verwijderd 30 dagen na annulering
• Back-upgegevens: Verwijderd uit back-ups binnen 90 dagen
• Wettelijke verplichtingen: Sommige gegevens kunnen langer bewaard worden indien wettelijk vereist`
        },
        {
          title: "9. Cookies",
          content: `We gebruiken minimale cookies:
• Essentiële cookies: Voor inloggen en sessiebeheer (vereist)
• Voorkeurscookies: Om uw taal- en donkere modus-instellingen te onthouden
• GEEN trackingcookies
• GEEN advertentiecookies
• GEEN analytics cookies van derden

U kunt niet-essentiële cookies uitschakelen in uw browserinstellingen.`
        },
        {
          title: "10. Privacy van Kinderen",
          content: "TAXIO is een zakelijk platform. We verzamelen niet bewust gegevens van personen jonger dan 18 jaar. Onze service is alleen voor geregistreerde bedrijven."
        },
        {
          title: "11. Internationale Gegevensoverdracht",
          content: "Uw gegevens worden opgeslagen op EU-servers (Supabase EU-regio). We dragen geen gegevens over buiten de EU, behalve aan vertrouwde dienstverleners die AVG-conform zijn."
        },
        {
          title: "12. Wijzigingen in Privacybeleid",
          content: "We kunnen dit beleid bijwerken met 30 dagen kennisgeving via e-mail. Voortgezet gebruik na wijzigingen betekent dat u het nieuwe beleid accepteert."
        },
        {
          title: "13. Contact Opnemen",
          content: `Voor privacyvragen of om uw AVG-rechten uit te oefenen:

E-mail: info@taxio.be
Functionaris Gegevensbescherming: dpo@taxio.be
Adres: TAXIO Privacy Team, België

Reactietijd: Binnen 30 dagen zoals vereist door AVG`
        },
        {
          title: "14. Klachten",
          content: `Als u denkt dat we uw gegevens niet correct behandelen, heeft u het recht om een klacht in te dienen bij:

Belgische Gegevensbeschermingsautoriteit (APD/GBA)
Website: www.dataprotectionauthority.be`
        }
      ]
    }
  }[e];
  return /* @__PURE__ */ s("div", { className: `min-h-screen ${r}`, children: [
    /* @__PURE__ */ n(vn, {}),
    /* @__PURE__ */ s("div", { className: "max-w-4xl mx-auto px-4 py-8", children: [
      /* @__PURE__ */ s("div", { className: "mb-8", children: [
        /* @__PURE__ */ n(Ve, { to: "/", children: /* @__PURE__ */ s(W, { variant: "ghost", className: `mb-4 ${i}`, children: [
          /* @__PURE__ */ n(sr, { className: "w-4 h-4 mr-2" }),
          "Back to Home"
        ] }) }),
        /* @__PURE__ */ s("div", { className: "flex items-center gap-3 mb-2", children: [
          /* @__PURE__ */ n("div", { className: "w-12 h-12 rounded-full bg-green-500 flex items-center justify-center", children: /* @__PURE__ */ n(zr, { className: "w-6 h-6 text-white" }) }),
          /* @__PURE__ */ s("div", { children: [
            /* @__PURE__ */ n("h1", { className: `text-3xl font-bold ${i}`, children: u.title }),
            /* @__PURE__ */ n("p", { className: `text-sm ${o}`, children: u.lastUpdated })
          ] })
        ] }),
        /* @__PURE__ */ s("div", { className: `inline-flex items-center gap-2 px-3 py-1 rounded-full ${t ? "bg-green-500/20 text-green-400" : "bg-green-100 text-green-700"}`, children: [
          /* @__PURE__ */ n(zr, { className: "w-4 h-4" }),
          /* @__PURE__ */ n("span", { className: "text-xs font-semibold", children: u.gdprCompliant })
        ] })
      ] }),
      /* @__PURE__ */ n(ue, { className: `${a} p-6 md:p-8 space-y-6`, children: u.sections.map((c, d) => /* @__PURE__ */ s("div", { children: [
        /* @__PURE__ */ n("h2", { className: `text-xl font-bold mb-2 ${i}`, children: c.title }),
        /* @__PURE__ */ n("p", { className: `${o} leading-relaxed whitespace-pre-line`, children: c.content })
      ] }, d)) }),
      /* @__PURE__ */ n("div", { className: "text-center mt-8", children: /* @__PURE__ */ s("p", { className: `text-sm ${o}`, children: [
        "© ",
        (/* @__PURE__ */ new Date()).getFullYear(),
        " TAXIO. All rights reserved."
      ] }) })
    ] })
  ] });
}
const $x = nf([
  {
    path: "/",
    element: /* @__PURE__ */ n(Pg, {})
  },
  {
    path: "/companies",
    element: /* @__PURE__ */ n(Mx, {})
  },
  {
    path: "/browse-companies",
    element: /* @__PURE__ */ n(Rx, {})
  },
  {
    path: "/register",
    element: /* @__PURE__ */ n(jy, {})
  },
  {
    path: "/login/company",
    element: /* @__PURE__ */ n(Wy, {})
  },
  {
    path: "/login/admin",
    element: /* @__PURE__ */ n(Uy, {})
  },
  {
    path: "/dashboard/company/:companyId",
    element: /* @__PURE__ */ n(mx, {})
  },
  {
    path: "/customize/:companyId",
    element: /* @__PURE__ */ n(Dx, {})
  },
  {
    path: "/ride-request/:companySubdomain?",
    element: /* @__PURE__ */ n(hx, {})
  },
  {
    path: "/book/:companySubdomain",
    element: /* @__PURE__ */ n(fx, {})
  },
  {
    path: "/demo",
    element: /* @__PURE__ */ n(dl, {})
  },
  {
    path: "/demo/:companySubdomain",
    element: /* @__PURE__ */ n(dl, {})
  },
  {
    path: "/dashboard/admin",
    element: /* @__PURE__ */ n(Px, {})
  },
  {
    path: "/qr-codes/:companySubdomain?",
    element: /* @__PURE__ */ n(Tx, {})
  },
  {
    path: "/terms",
    element: /* @__PURE__ */ n(Ix, {})
  },
  {
    path: "/privacy",
    element: /* @__PURE__ */ n(Ox, {})
  }
]);
var Lx = (e, t, r, a, i, o, l, u) => {
  let c = document.documentElement, d = ["light", "dark"];
  function h(g) {
    (Array.isArray(e) ? e : [e]).forEach((p) => {
      let v = p === "class", b = v && o ? i.map((w) => o[w] || w) : i;
      v ? (c.classList.remove(...b), c.classList.add(o && o[g] ? o[g] : g)) : c.setAttribute(p, g);
    }), m(g);
  }
  function m(g) {
    u && d.includes(g) && (c.style.colorScheme = g);
  }
  function f() {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  if (a) h(a);
  else try {
    let g = localStorage.getItem(t) || r, p = l && g === "system" ? f() : g;
    h(p);
  } catch {
  }
}, _x = et(void 0), Bx = { setTheme: (e) => {
}, themes: [] }, Fx = () => {
  var e;
  return (e = ke(_x)) != null ? e : Bx;
};
di(({ forcedTheme: e, storageKey: t, attribute: r, enableSystem: a, enableColorScheme: i, defaultTheme: o, value: l, themes: u, nonce: c, scriptProps: d }) => {
  let h = JSON.stringify([r, t, o, e, u, l, a, i]).slice(1, -1);
  return me("script", { ...d, suppressHydrationWarning: !0, nonce: typeof window > "u" ? c : "", dangerouslySetInnerHTML: { __html: `(${Lx.toString()})(${h})` } });
});
const zx = ({ ...e }) => {
  const { theme: t = "system" } = Fx();
  return /* @__PURE__ */ n(
    g0,
    {
      theme: t,
      className: "toaster group",
      style: {
        "--normal-bg": "var(--popover)",
        "--normal-text": "var(--popover-foreground)",
        "--normal-border": "var(--border)"
      },
      ...e
    }
  );
};
function jx() {
  return /* @__PURE__ */ s(Eg, { children: [
    /* @__PURE__ */ n(Ah, { router: $x }),
    /* @__PURE__ */ n(zx, {})
  ] });
}
const Wx = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  default: jx
}, Symbol.toStringTag, { value: "Module" }));
export {
  Ux as Code0_8
};
