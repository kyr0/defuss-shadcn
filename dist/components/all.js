var __defProp = Object.defineProperty;
var __returnValue = (v) => v;
function __exportSetter(name, newValue) {
  this[name] = __returnValue.bind(null, newValue);
}
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, {
      get: all[name],
      enumerable: true,
      configurable: true,
      set: __exportSetter.bind(all, name)
    });
};

// node_modules/defuss-morph/dist/index.mjs
var exports_dist = {};
__export(exports_dist, {
  updateDomWithVdom: () => updateDomWithVdom,
  resolveGlobals: () => resolveGlobals,
  replaceDomWithVdom: () => replaceDomWithVdom,
  renderMarkup: () => renderMarkup,
  removeDelegatedEventByKey: () => removeDelegatedEventByKey,
  removeDelegatedEvent: () => removeDelegatedEvent,
  registerDelegatedEvent: () => registerDelegatedEvent,
  queueCallback: () => queueCallback,
  performTransition: () => performTransition,
  parseEventPropName: () => parseEventPropName,
  parseDOM: () => parseDOM,
  observeUnmount: () => observeUnmount,
  nsMap: () => nsMap,
  morph: () => morph,
  isSVG: () => isSVG,
  isMarkup: () => isMarkup,
  isHTML: () => isHTML,
  htmlStringToVNodes: () => htmlStringToVNodes,
  handleLifecycleEventsForOnMount: () => handleLifecycleEventsForOnMount,
  getTransitionStyles: () => getTransitionStyles,
  getRenderer: () => getRenderer,
  getRegisteredEventTypes: () => getRegisteredEventTypes,
  getRegisteredEventKeys: () => getRegisteredEventKeys,
  getMimeType: () => getMimeType,
  domNodeToVNode: () => domNodeToVNode,
  clearDelegatedEventsDeep: () => clearDelegatedEventsDeep,
  clearDelegatedEvents: () => clearDelegatedEvents,
  areDomNodesEqual: () => areDomNodesEqual,
  applyStyles: () => applyStyles,
  XMLNS_ATTRIBUTE_NAME: () => XMLNS_ATTRIBUTE_NAME,
  XLINK_ATTRIBUTE_NAME: () => XLINK_ATTRIBUTE_NAME,
  REF_ATTRIBUTE_NAME: () => REF_ATTRIBUTE_NAME,
  FROM_DOM_MARKER: () => FROM_DOM_MARKER,
  DEFAULT_TRANSITION_CONFIG: () => DEFAULT_TRANSITION_CONFIG,
  DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE: () => DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE,
  CLASS_ATTRIBUTE_NAME: () => CLASS_ATTRIBUTE_NAME,
  CAPTURE_ONLY_EVENTS: () => CAPTURE_ONLY_EVENTS
});
var queueCallback = (cb) => (...args) => queueMicrotask(() => cb(...args));
var CAPTURE_ONLY_EVENTS = /* @__PURE__ */ new Set([
  "focus",
  "blur",
  "scroll",
  "mouseenter",
  "mouseleave"
]);
var elementHandlerMap = /* @__PURE__ */ new WeakMap;
var bubbleDispatched = /* @__PURE__ */ new WeakMap;
var captureDispatched = /* @__PURE__ */ new WeakMap;
var activeDispatches = /* @__PURE__ */ new WeakMap;
var parseEventPropName = (propName) => {
  if (!propName.startsWith("on"))
    return null;
  const raw = propName.slice(2);
  if (!raw)
    return null;
  const lower = raw.toLowerCase();
  const isCapture = lower.endsWith("capture");
  const eventType = isCapture ? lower.slice(0, -"capture".length) : lower;
  if (!eventType)
    return null;
  return { eventType, capture: isCapture };
};
var getOrCreateElementHandlers = (el) => {
  const existing = elementHandlerMap.get(el);
  if (existing)
    return existing;
  const created = /* @__PURE__ */ new Map;
  elementHandlerMap.set(el, created);
  return created;
};
var getEventPath = (event) => {
  const composedPath = event.composedPath?.();
  if (composedPath && composedPath.length > 0)
    return composedPath;
  const path = [];
  let node = event.target;
  while (node) {
    path.push(node);
    const maybeNode = node;
    if (typeof maybeNode === "object" && maybeNode && "parentNode" in maybeNode) {
      node = maybeNode.parentNode;
      continue;
    }
    break;
  }
  const doc = event.target?.ownerDocument;
  if (doc && path[path.length - 1] !== doc)
    path.push(doc);
  const win = doc?.defaultView;
  if (win && path[path.length - 1] !== win)
    path.push(win);
  return path;
};
var createPhaseHandler = (eventType, phase) => {
  const dispatched = phase === "capture" ? captureDispatched : bubbleDispatched;
  return (event) => {
    const path = getEventPath(event).filter((t) => typeof t === "object" && t !== null && t.nodeType === 1);
    const ordered = phase === "capture" ? [...path].reverse() : path;
    for (const target of ordered) {
      const handlersByEvent = elementHandlerMap.get(target);
      if (!handlersByEvent)
        continue;
      const entry = handlersByEvent.get(eventType);
      if (!entry)
        continue;
      let targets = dispatched.get(event);
      if (targets?.has(target))
        continue;
      if (!targets) {
        targets = /* @__PURE__ */ new WeakSet;
        dispatched.set(event, targets);
      }
      targets.add(target);
      const dispatchKey = `${eventType}:${phase}`;
      let activeSet = activeDispatches.get(target);
      if (activeSet?.has(dispatchKey))
        continue;
      if (!activeSet) {
        activeSet = /* @__PURE__ */ new Set;
        activeDispatches.set(target, activeSet);
      }
      activeSet.add(dispatchKey);
      try {
        if (phase === "capture") {
          if (entry.capture) {
            entry.capture.call(target, event);
            if (event.cancelBubble)
              return;
          }
          if (entry.captureSet) {
            for (const handler of entry.captureSet) {
              handler.call(target, event);
              if (event.cancelBubble)
                return;
            }
          }
        } else {
          if (entry.bubble) {
            entry.bubble.call(target, event);
            if (event.cancelBubble)
              return;
          }
          if (entry.bubbleSet) {
            for (const handler of entry.bubbleSet) {
              handler.call(target, event);
              if (event.cancelBubble)
                return;
            }
          }
        }
      } finally {
        activeSet.delete(dispatchKey);
      }
    }
  };
};
var installedRootListeners = /* @__PURE__ */ new WeakMap;
var ensureRootListener = (root, eventType) => {
  const installed = installedRootListeners.get(root) ?? /* @__PURE__ */ new Set;
  installedRootListeners.set(root, installed);
  const captureKey = `${eventType}:capture`;
  if (!installed.has(captureKey)) {
    root.addEventListener(eventType, createPhaseHandler(eventType, "capture"), true);
    installed.add(captureKey);
  }
  const bubbleKey = `${eventType}:bubble`;
  if (!installed.has(bubbleKey)) {
    root.addEventListener(eventType, createPhaseHandler(eventType, "bubble"), false);
    installed.add(bubbleKey);
  }
};
var getEventRoot = (element) => {
  const root = element.getRootNode();
  if (root && root.nodeType === 9) {
    return root;
  }
  if (root && root.nodeType === 11 && "host" in root) {
    return root;
  }
  return null;
};
var registerDelegatedEvent = (element, eventType, handler, options = {}) => {
  const root = getEventRoot(element);
  const capture = options.capture || CAPTURE_ONLY_EVENTS.has(eventType);
  if (root) {
    ensureRootListener(root, eventType);
  } else if (element.ownerDocument) {
    ensureRootListener(element.ownerDocument, eventType);
  } else {
    element.addEventListener(eventType, handler, capture);
  }
  const byEvent = getOrCreateElementHandlers(element);
  const entry = byEvent.get(eventType) ?? {};
  byEvent.set(eventType, entry);
  if (options.multi) {
    if (capture) {
      if (!entry.captureSet)
        entry.captureSet = /* @__PURE__ */ new Set;
      entry.captureSet.add(handler);
    } else {
      if (!entry.bubbleSet)
        entry.bubbleSet = /* @__PURE__ */ new Set;
      entry.bubbleSet.add(handler);
    }
  } else {
    if (capture) {
      entry.capture = handler;
    } else {
      entry.bubble = handler;
    }
  }
};
var isEntryEmpty = (entry) => !entry.capture && !entry.bubble && (!entry.captureSet || entry.captureSet.size === 0) && (!entry.bubbleSet || entry.bubbleSet.size === 0);
var removeDelegatedEvent = (target, eventType, handler, _options = {}) => {
  const byEvent = elementHandlerMap.get(target);
  if (!byEvent)
    return;
  const entry = byEvent.get(eventType);
  if (!entry)
    return;
  if (handler) {
    if (entry.captureSet) {
      entry.captureSet.delete(handler);
    }
    if (entry.bubbleSet) {
      entry.bubbleSet.delete(handler);
    }
    if (entry.capture === handler) {
      entry.capture = undefined;
    }
    if (entry.bubble === handler) {
      entry.bubble = undefined;
    }
    target.removeEventListener(eventType, handler, true);
    target.removeEventListener(eventType, handler, false);
  } else {
    entry.capture = undefined;
    entry.bubble = undefined;
    entry.captureSet = undefined;
    entry.bubbleSet = undefined;
  }
  if (isEntryEmpty(entry)) {
    byEvent.delete(eventType);
  }
};
var clearDelegatedEvents = (target) => {
  const byEvent = elementHandlerMap.get(target);
  if (!byEvent)
    return;
  byEvent.clear();
};
var clearDelegatedEventsDeep = (root) => {
  clearDelegatedEvents(root);
  const doc = root.ownerDocument;
  if (!doc)
    return;
  const walker = doc.createTreeWalker(root, 1);
  let node = walker.nextNode();
  while (node) {
    clearDelegatedEvents(node);
    node = walker.nextNode();
  }
};
var getRegisteredEventTypes = (element) => {
  const byEvent = elementHandlerMap.get(element);
  if (!byEvent)
    return /* @__PURE__ */ new Set;
  return new Set(byEvent.keys());
};
var getRegisteredEventKeys = (element) => {
  const byEvent = elementHandlerMap.get(element);
  if (!byEvent)
    return /* @__PURE__ */ new Set;
  const keys = /* @__PURE__ */ new Set;
  for (const [eventType, entry] of byEvent) {
    if (entry.bubble || entry.bubbleSet?.size)
      keys.add(`${eventType}:bubble`);
    if (entry.capture || entry.captureSet?.size)
      keys.add(`${eventType}:capture`);
  }
  return keys;
};
var removeDelegatedEventByKey = (element, eventType, phase) => {
  const byEvent = elementHandlerMap.get(element);
  if (!byEvent)
    return;
  const entry = byEvent.get(eventType);
  if (!entry)
    return;
  if (phase === "capture") {
    entry.capture = undefined;
    entry.captureSet = undefined;
  } else {
    entry.bubble = undefined;
    entry.bubbleSet = undefined;
  }
  if (isEntryEmpty(entry))
    byEvent.delete(eventType);
};
var CLASS_ATTRIBUTE_NAME = "class";
var XLINK_ATTRIBUTE_NAME = "xlink";
var XMLNS_ATTRIBUTE_NAME = "xmlns";
var REF_ATTRIBUTE_NAME = "ref";
var DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE = "dangerouslySetInnerHTML";
var nsMap = {
  [XMLNS_ATTRIBUTE_NAME]: "http://www.w3.org/2000/xmlns/",
  [XLINK_ATTRIBUTE_NAME]: "http://www.w3.org/1999/xlink",
  svg: "http://www.w3.org/2000/svg"
};
var observeUnmount = (domNode, onUnmount) => {
  if (!domNode || typeof onUnmount !== "function") {
    throw new Error("Invalid arguments. Ensure domNode and onUnmount are valid.");
  }
  if (typeof MutationObserver === "undefined") {
    return;
  }
  let parentNode = domNode.parentNode;
  if (!parentNode) {
    throw new Error("The provided domNode does not have a parentNode.");
  }
  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.removedNodes.length > 0) {
        for (const removedNode of mutation.removedNodes) {
          if (removedNode === domNode) {
            queueMicrotask(() => {
              if (!domNode.isConnected) {
                onUnmount();
                observer.disconnect();
                return;
              }
              const newParent = domNode.parentNode;
              if (newParent && newParent !== parentNode) {
                parentNode = newParent;
                observer.disconnect();
                observer.observe(parentNode, { childList: true });
              }
            });
            return;
          }
        }
      }
    }
  });
  observer.observe(parentNode, { childList: true });
};
var handleLifecycleEventsForOnMount = (newEl) => {
  if (typeof newEl?.$onMount === "function") {
    newEl.$onMount(newEl);
    newEl.$onMount = null;
  }
  if (typeof newEl?.$onUnmount === "function") {
    observeUnmount(newEl, newEl.$onUnmount);
  }
};
var getRenderer = (document2) => {
  const renderer = {
    hasElNamespace: (domElement) => domElement.namespaceURI === nsMap.svg,
    hasSvgNamespace: (parentElement, type) => renderer.hasElNamespace(parentElement) && type !== "STYLE" && type !== "SCRIPT",
    createElementOrElements: (virtualNode, parentDomElement) => {
      if (Array.isArray(virtualNode)) {
        return renderer.createChildElements(virtualNode, parentDomElement);
      }
      if (typeof virtualNode !== "undefined") {
        return renderer.createElement(virtualNode, parentDomElement);
      }
      return renderer.createTextNode("", parentDomElement);
    },
    createElement: (virtualNode, parentDomElement) => {
      let newEl;
      try {
        if (typeof virtualNode === "function" && virtualNode.constructor.name === "AsyncFunction") {
          newEl = document2.createElement("div");
        } else if (typeof virtualNode === "object" && virtualNode !== null && "type" in virtualNode) {
          const vNode = virtualNode;
          if (typeof vNode.type === "function") {
            newEl = document2.createElement("div");
            newEl.innerText = `FATAL ERROR: ${vNode.type._error}`;
          } else if (typeof vNode.type === "string" && vNode.type.toUpperCase() === "SVG" || parentDomElement && renderer.hasSvgNamespace(parentDomElement, typeof vNode.type === "string" ? vNode.type.toUpperCase() : "")) {
            newEl = document2.createElementNS(nsMap.svg, vNode.type);
          } else {
            newEl = document2.createElement(vNode.type);
          }
          if (vNode.attributes) {
            renderer.setAttributes(vNode, newEl);
            if (vNode.attributes.dangerouslySetInnerHTML) {
              newEl.innerHTML = vNode.attributes.dangerouslySetInnerHTML.__html;
            }
          }
          if (vNode.children && !vNode.attributes?.dangerouslySetInnerHTML) {
            renderer.createChildElements(vNode.children, newEl);
          }
        } else {
          if (typeof virtualNode === "string" || typeof virtualNode === "number") {
            newEl = document2.createElement(String(virtualNode));
          }
        }
        if (newEl && parentDomElement) {
          parentDomElement.appendChild(newEl);
          handleLifecycleEventsForOnMount(newEl);
        }
      } catch (e) {
        console.error("Fatal error! Error happend while rendering the VDOM!", e, virtualNode);
        throw e;
      }
      return newEl;
    },
    createTextNode: (text, domElement) => {
      const node = document2.createTextNode(text.toString());
      if (domElement) {
        domElement.appendChild(node);
      }
      return node;
    },
    createChildElements: (virtualChildren, domElement) => {
      const children = [];
      for (let i = 0;i < virtualChildren.length; i++) {
        const virtualChild = virtualChildren[i];
        if (typeof virtualChild === "boolean") {
          continue;
        }
        if (virtualChild === null || typeof virtualChild !== "object" && typeof virtualChild !== "function") {
          children.push(renderer.createTextNode((typeof virtualChild === "undefined" || virtualChild === null ? "" : virtualChild).toString(), domElement));
        } else {
          children.push(renderer.createElement(virtualChild, domElement));
        }
      }
      return children;
    },
    setAttribute: (name, value, domElement) => {
      if (typeof value === "undefined")
        return;
      if (name === DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE)
        return;
      if (name === "key") {
        domElement._defussKey = String(value);
        return;
      }
      if (name === REF_ATTRIBUTE_NAME && typeof value !== "function") {
        const ref = value;
        ref.current = domElement;
        domElement._defussRef = value;
        domElement.$onUnmount = queueCallback(() => {});
        if (domElement.parentNode) {
          observeUnmount(domElement, domElement.$onUnmount);
        } else {
          queueMicrotask(() => {
            if (domElement.parentNode) {
              observeUnmount(domElement, domElement.$onUnmount);
            }
          });
        }
        return;
      }
      const parsed = parseEventPropName(name);
      if (parsed && typeof value === "function") {
        const { eventType, capture } = parsed;
        if (eventType === "mount") {
          domElement.$onMount = queueCallback(value);
          return;
        }
        if (eventType === "unmount") {
          if (domElement.$onUnmount) {
            const existingUnmount = domElement.$onUnmount;
            domElement.$onUnmount = () => {
              existingUnmount();
              value();
            };
          } else {
            domElement.$onUnmount = queueCallback(value);
          }
          return;
        }
        registerDelegatedEvent(domElement, eventType, value, { capture });
        return;
      }
      if (name === "className") {
        name = CLASS_ATTRIBUTE_NAME;
      }
      if (name === CLASS_ATTRIBUTE_NAME && Array.isArray(value)) {
        value = value.filter((val) => !!val).join(" ");
      }
      const nsEndIndex = name.match(/[A-Z]/)?.index;
      if (renderer.hasElNamespace(domElement) && nsEndIndex) {
        const ns = name.substring(0, nsEndIndex).toLowerCase();
        const attrName = name.substring(nsEndIndex, name.length).toLowerCase();
        const namespace = nsMap[ns] || null;
        domElement.setAttributeNS(namespace, ns === XLINK_ATTRIBUTE_NAME || ns === XMLNS_ATTRIBUTE_NAME ? `${ns}:${attrName}` : name, String(value));
      } else if (name === "style" && typeof value !== "string") {
        const styleObj = value;
        for (const prop of Object.keys(styleObj)) {
          domElement.style[prop] = String(styleObj[prop]);
        }
      } else if (typeof value === "boolean") {
        domElement[name] = value;
        if (value) {
          domElement.setAttribute(name, "");
        } else {
          domElement.removeAttribute(name);
        }
      } else if ((name === "value" || name === "checked" || name === "selectedIndex") && (domElement.nodeName === "INPUT" || domElement.nodeName === "TEXTAREA" || domElement.nodeName === "SELECT")) {
        domElement[name] = value;
        if (name === "checked") {
          if (value) {
            domElement.setAttribute("checked", "");
          } else {
            domElement.removeAttribute("checked");
          }
        } else if (name === "value") {
          domElement.setAttribute("value", String(value));
        }
      } else {
        domElement.setAttribute(name, String(value));
      }
    },
    setAttributes: (virtualNode, domElement) => {
      const attrNames = Object.keys(virtualNode.attributes ?? {});
      for (let i = 0;i < attrNames.length; i++) {
        renderer.setAttribute(attrNames[i], virtualNode.attributes[attrNames[i]], domElement);
      }
    }
  };
  return renderer;
};
var FROM_DOM_MARKER = Symbol("defuss-morph.from-dom");
var HTML_BOOLEAN_ATTRIBUTES = /* @__PURE__ */ new Set([
  "allowfullscreen",
  "async",
  "autofocus",
  "autoplay",
  "checked",
  "controls",
  "default",
  "defer",
  "disabled",
  "formnovalidate",
  "hidden",
  "inert",
  "ismap",
  "itemscope",
  "loop",
  "multiple",
  "muted",
  "nomodule",
  "novalidate",
  "open",
  "playsinline",
  "readonly",
  "required",
  "reversed",
  "selected"
]);
var domAttributeToVNodeValue = (attr) => HTML_BOOLEAN_ATTRIBUTES.has(attr.name.toLowerCase()) ? true : attr.value;
function parseDOM(input, type, Parser) {
  return new Parser().parseFromString(input, type);
}
function isSVG(input, Parser) {
  const doc = parseDOM(input, "image/svg+xml", Parser);
  if (!doc.documentElement)
    return false;
  return doc.documentElement.nodeName.toLowerCase() === "svg";
}
function isHTML(input, Parser) {
  const doc = parseDOM(input, "text/html", Parser);
  return doc.documentElement.querySelectorAll("*").length > 2;
}
var isMarkup = (input, Parser) => input.indexOf("<") > -1 && input.indexOf(">") > -1 && (isHTML(input, Parser) || isSVG(input, Parser));
function renderMarkup(markup, Parser, doc) {
  const parsed = doc ? doc : parseDOM(markup, getMimeType(markup, Parser), Parser);
  if (parsed.body)
    return Array.from(parsed.body.childNodes);
  return parsed.documentElement ? [parsed.documentElement] : [];
}
function getMimeType(input, Parser) {
  if (isSVG(input, Parser)) {
    return "image/svg+xml";
  }
  return "text/html";
}
function domNodeToVNode(node) {
  if (node.nodeType === 3) {
    return node.textContent || "";
  }
  if (node.nodeType === 1) {
    const element = node;
    const attributes = {};
    for (let i = 0;i < element.attributes.length; i++) {
      const attr = element.attributes[i];
      attributes[attr.name] = domAttributeToVNodeValue(attr);
    }
    const children = [];
    for (let i = 0;i < element.childNodes.length; i++) {
      const childVNode = domNodeToVNode(element.childNodes[i]);
      children.push(childVNode);
    }
    return {
      type: element.tagName.toLowerCase(),
      attributes: { ...attributes, [FROM_DOM_MARKER]: true },
      children
    };
  }
  return "";
}
function htmlStringToVNodes(html, Parser) {
  const parser = new Parser;
  const doc = parser.parseFromString(html, "text/html");
  const vNodes = [];
  for (let i = 0;i < doc.body.childNodes.length; i++) {
    const vnode = domNodeToVNode(doc.body.childNodes[i]);
    if (vnode !== "") {
      vNodes.push(vnode);
    }
  }
  return vNodes;
}
var areDomNodesEqual = (oldNode, newNode) => {
  if (oldNode === newNode)
    return true;
  if (oldNode.nodeType !== newNode.nodeType)
    return false;
  if (oldNode.nodeType === 1) {
    const oldElement = oldNode;
    const newElement = newNode;
    if (oldElement.tagName !== newElement.tagName)
      return false;
    const oldAttrs = oldElement.attributes;
    const newAttrs = newElement.attributes;
    if (oldAttrs.length !== newAttrs.length)
      return false;
    for (let i = 0;i < oldAttrs.length; i++) {
      const oldAttr = oldAttrs[i];
      const newAttrValue = newElement.getAttribute(oldAttr.name);
      if (oldAttr.value !== newAttrValue)
        return false;
    }
  }
  if (oldNode.nodeType === 3) {
    if (oldNode.textContent !== newNode.textContent)
      return false;
  }
  return true;
};
function isTextLike(value) {
  return typeof value === "string" || typeof value === "number" || typeof value === "boolean";
}
function isVNode(value) {
  return Boolean(value && typeof value === "object" && "type" in value);
}
function toValidChild(child, lenient = false) {
  if (child == null)
    return child;
  if (isTextLike(child))
    return child;
  if (isVNode(child))
    return child;
  if (lenient && child && typeof child === "object" && "attributes" in child)
    return child;
  return;
}
function normalizeChildren(input, lenient = false) {
  const raw = [];
  const pushChild = (child) => {
    if (Array.isArray(child)) {
      child.forEach(pushChild);
      return;
    }
    const valid = toValidChild(child, lenient);
    if (typeof valid === "undefined")
      return;
    if (isVNode(valid) && (valid.type === "fragment" || valid.type === "Fragment")) {
      const nested = Array.isArray(valid.children) ? valid.children : [];
      nested.forEach(pushChild);
      return;
    }
    if (valid === null || typeof valid === "undefined" || typeof valid === "boolean")
      return;
    raw.push(valid);
  };
  pushChild(input);
  const fused = [];
  let buffer = null;
  const flush = () => {
    if (buffer !== null && buffer.length > 0)
      fused.push(buffer);
    buffer = null;
  };
  for (const child of raw) {
    if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
      buffer = (buffer ?? "") + String(child);
      continue;
    }
    flush();
    fused.push(child);
  }
  flush();
  return fused;
}
function getVNodeMatchKey(child) {
  if (!child || typeof child !== "object")
    return null;
  const key = child.attributes?.key;
  if (typeof key === "string" || typeof key === "number")
    return `k:${String(key)}`;
  const id = child.attributes?.id;
  if (typeof id === "string" && id.length > 0)
    return `id:${id}`;
  return null;
}
function describePatchItem(child) {
  if (child && typeof child === "object") {
    return `<${typeof child.type === "string" ? child.type : "component"}>`;
  }
  return "plain text";
}
function getDomMatchKeys(node) {
  if (node.nodeType !== 1)
    return [];
  const el = node;
  const keys = [];
  const internalKey = el._defussKey;
  if (internalKey)
    keys.push(`k:${internalKey}`);
  const attrKey = el.getAttribute("key");
  if (attrKey)
    keys.push(`k:${attrKey}`);
  const id = el.id;
  if (id)
    keys.push(`id:${id}`);
  return keys;
}
function areNodeAndChildMatching(domNode, child) {
  if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
    return domNode.nodeType === 3;
  }
  if (child && typeof child === "object") {
    if (domNode.nodeType !== 1)
      return false;
    const el = domNode;
    const oldTag = el.tagName.toLowerCase();
    const newTag = typeof child.type === "string" ? child.type.toLowerCase() : "";
    if (!newTag || oldTag !== newTag)
      return false;
    return true;
  }
  return false;
}
function createDomFromChild(child, globals) {
  const renderer = getRenderer(globals.window.document);
  if (child == null)
    return;
  if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
    return [globals.window.document.createTextNode(String(child))];
  }
  const created = renderer.createElementOrElements(child);
  if (!created)
    return;
  const nodes = Array.isArray(created) ? created : [created];
  return nodes.filter(Boolean);
}
function shouldPreserveFormStateAttribute(el, attrName, vnode) {
  const tag = el.tagName.toLowerCase();
  const hasExplicit = Object.hasOwn(vnode.attributes ?? {}, attrName);
  if (hasExplicit)
    return false;
  if (tag === "input")
    return attrName === "value" || attrName === "checked";
  if (tag === "textarea")
    return attrName === "value";
  if (tag === "select")
    return attrName === "value";
  return false;
}
function patchElementInPlace(el, vnode, globals, mergeAttributes = false) {
  const renderer = getRenderer(globals.window.document);
  const existingAttrs = mergeAttributes ? [] : Array.from(el.attributes);
  const nextAttrs = vnode.attributes ?? {};
  for (const attr of existingAttrs) {
    const { name } = attr;
    if (name === "key")
      continue;
    if (name.startsWith("on"))
      continue;
    if (name === "class" && (Object.hasOwn(nextAttrs, "class") || Object.hasOwn(nextAttrs, "className"))) {
      continue;
    }
    if (!Object.hasOwn(nextAttrs, name)) {
      if (shouldPreserveFormStateAttribute(el, name, vnode))
        continue;
      el.removeAttribute(name);
    }
  }
  const preserveDelegatedHandlers = mergeAttributes || Boolean(nextAttrs[FROM_DOM_MARKER]);
  if (!preserveDelegatedHandlers) {
    const registeredKeys = getRegisteredEventKeys(el);
    const nextEventKeys = /* @__PURE__ */ new Set;
    for (const propName of Object.keys(nextAttrs)) {
      const parsed = parseEventPropName(propName);
      if (parsed) {
        const phase = parsed.capture ? "capture" : "bubble";
        nextEventKeys.add(`${parsed.eventType}:${phase}`);
      }
    }
    for (const key of registeredKeys) {
      if (!nextEventKeys.has(key)) {
        const [eventType, phase] = key.split(":");
        removeDelegatedEventByKey(el, eventType, phase);
      }
    }
  }
  renderer.setAttributes(vnode, el);
  handleLifecycleEventsForOnMount(el);
  const d = vnode.attributes?.dangerouslySetInnerHTML;
  if (d && typeof d === "object" && typeof d.__html === "string") {
    el.innerHTML = d.__html;
    return;
  }
  const tag = el.tagName.toLowerCase();
  if (tag === "textarea") {
    const isControlled = Object.hasOwn(nextAttrs, "value");
    const isActive = el.ownerDocument?.activeElement === el;
    if (isActive && !isControlled)
      return;
  }
  if (mergeAttributes && (vnode.children === undefined || vnode.children.length === 0 && nextAttrs[FROM_DOM_MARKER]))
    return;
  morphDomDirect(el, vnode.children ?? [], globals);
}
function morphNode(domNode, child, globals, mergeAttributes = false) {
  if (typeof child === "string" || typeof child === "number" || typeof child === "boolean") {
    const text = String(child);
    if (domNode.nodeType === 3) {
      if (domNode.nodeValue !== text)
        domNode.nodeValue = text;
      return domNode;
    }
    const next = globals.window.document.createTextNode(text);
    domNode.parentNode?.replaceChild(next, domNode);
    return next;
  }
  if (child && typeof child === "object") {
    const newType = typeof child.type === "string" ? child.type : null;
    if (!newType)
      return domNode;
    if (domNode.nodeType !== 1) {
      const created = createDomFromChild(child, globals);
      const first = Array.isArray(created) ? created[0] : created;
      if (!first)
        return null;
      domNode.parentNode?.replaceChild(first, domNode);
      handleLifecycleEventsForOnMount(first);
      return first;
    }
    const el = domNode;
    const oldTag = el.tagName.toLowerCase();
    const newTag = newType.toLowerCase();
    if (oldTag !== newTag) {
      const created = createDomFromChild(child, globals);
      const first = Array.isArray(created) ? created[0] : created;
      if (!first)
        return null;
      el.parentNode?.replaceChild(first, el);
      handleLifecycleEventsForOnMount(first);
      return first;
    }
    patchElementInPlace(el, child, globals, mergeAttributes);
    return el;
  }
  domNode.parentNode?.removeChild(domNode);
  return null;
}
var renderingNodes = /* @__PURE__ */ new WeakSet;
var pendingMorphs = /* @__PURE__ */ new Map;
var resolveGlobals = (el, globals) => {
  if (globals)
    return globals;
  const win = el?.ownerDocument?.defaultView ?? globalThis;
  return { window: win };
};
function isAncestorRendering(el) {
  let current = el.parentElement;
  while (current) {
    if (renderingNodes.has(current))
      return true;
    current = current.parentElement;
  }
  return false;
}
function flushPendingMorphs() {
  if (pendingMorphs.size === 0)
    return;
  const snapshot = [...pendingMorphs.entries()];
  pendingMorphs.clear();
  for (const [el, { vdom, globals, mode }] of snapshot) {
    if (!el.isConnected)
      continue;
    updateDomWithVdom(el, vdom, globals, mode);
  }
}
function updateDomWithVdom(parentElement, newVDOM, globals, mode = "replace") {
  const resolvedGlobals = resolveGlobals(parentElement, globals);
  if (renderingNodes.has(parentElement) || isAncestorRendering(parentElement)) {
    pendingMorphs.set(parentElement, {
      vdom: newVDOM,
      globals: resolvedGlobals,
      mode
    });
    return;
  }
  renderingNodes.add(parentElement);
  try {
    morphDomDirect(parentElement, newVDOM, resolvedGlobals, mode);
  } finally {
    renderingNodes.delete(parentElement);
  }
  flushPendingMorphs();
}
function morphDiff(targetRoot, patchItems, globals) {
  const keyedPool = /* @__PURE__ */ new Map;
  for (const node of Array.from(targetRoot.childNodes)) {
    for (const k of getDomMatchKeys(node)) {
      if (!keyedPool.has(k))
        keyedPool.set(k, node);
    }
  }
  for (const item of patchItems) {
    if (typeof item === "string" && item.trim() === "")
      continue;
    const key = getVNodeMatchKey(item);
    if (!key) {
      throw new Error(`morph diff: patch items must be elements with a key or id attribute (got ${describePatchItem(item)})`);
    }
    const match = keyedPool.get(key);
    if (match) {
      const patchItem = item && typeof item === "object" && !item.type ? { ...item, type: match.tagName.toLowerCase() } : item;
      morphNode(match, patchItem, globals, true);
      continue;
    }
    if (!item?.type) {
      throw new Error(`morph diff: new (unmatched) patch items must declare a tag (type), got key/id "${key}"`);
    }
    const created = createDomFromChild(item, globals) ?? [];
    for (const node of created) {
      targetRoot.appendChild(node);
      handleLifecycleEventsForOnMount(node);
    }
  }
}
function morphDomDirect(parentElement, newVDOM, globals, mode = "replace") {
  const el = parentElement;
  const isCustomElement = el.tagName.includes("-");
  const targetRoot = el.shadowRoot && !isCustomElement ? el.shadowRoot : parentElement;
  const nextChildren = normalizeChildren(newVDOM, mode === "diff");
  if (mode === "diff") {
    morphDiff(targetRoot, nextChildren, globals);
    return;
  }
  const existing = Array.from(targetRoot.childNodes);
  const keyedPool = /* @__PURE__ */ new Map;
  const nodeKeys = /* @__PURE__ */ new WeakMap;
  const unkeyedPool = [];
  for (const node of existing) {
    const keys = getDomMatchKeys(node);
    if (keys.length > 0) {
      nodeKeys.set(node, keys);
      let addedToKeyedPool = false;
      for (const k of keys) {
        if (!keyedPool.has(k)) {
          keyedPool.set(k, node);
          addedToKeyedPool = true;
        }
      }
      if (!addedToKeyedPool) {
        unkeyedPool.push(node);
      }
    } else {
      unkeyedPool.push(node);
    }
  }
  const consumeKeyedNode = (node) => {
    const keys = nodeKeys.get(node) ?? [];
    for (const k of keys)
      keyedPool.delete(k);
  };
  const takeUnkeyedMatch = (child) => {
    for (let i = 0;i < unkeyedPool.length; i++) {
      const candidate = unkeyedPool[i];
      if (areNodeAndChildMatching(candidate, child)) {
        unkeyedPool.splice(i, 1);
        return candidate;
      }
    }
    return;
  };
  let domIndex = 0;
  for (const child of nextChildren) {
    const key = getVNodeMatchKey(child);
    let match;
    if (key) {
      match = keyedPool.get(key);
      if (match)
        consumeKeyedNode(match);
    } else {
      match = takeUnkeyedMatch(child);
    }
    const anchor = targetRoot.childNodes[domIndex] ?? null;
    if (match) {
      if (match !== anchor) {
        targetRoot.insertBefore(match, anchor);
      }
      morphNode(match, child, globals);
      domIndex++;
      continue;
    }
    const created = createDomFromChild(child, globals);
    if (!created || Array.isArray(created) && created.length === 0)
      continue;
    const nodes = Array.isArray(created) ? created : [created];
    for (const node of nodes) {
      targetRoot.insertBefore(node, anchor);
      handleLifecycleEventsForOnMount(node);
      domIndex++;
    }
  }
  const remaining = /* @__PURE__ */ new Set;
  for (const node of unkeyedPool)
    remaining.add(node);
  for (const node of keyedPool.values())
    remaining.add(node);
  for (const node of remaining) {
    if (node.parentNode === targetRoot) {
      if (node.nodeType === 1) {
        clearDelegatedEventsDeep(node);
      }
      targetRoot.removeChild(node);
    }
  }
}
function replaceDomWithVdom(parentElement, newVDOM, globals) {
  const resolvedGlobals = resolveGlobals(parentElement, globals);
  while (parentElement.firstChild) {
    parentElement.removeChild(parentElement.firstChild);
  }
  const renderer = getRenderer(resolvedGlobals.window.document);
  const newDom = renderer.createElementOrElements(newVDOM);
  if (Array.isArray(newDom)) {
    for (const node of newDom) {
      if (node) {
        parentElement.appendChild(node);
        handleLifecycleEventsForOnMount(node);
      }
    }
  } else if (newDom) {
    parentElement.appendChild(newDom);
    handleLifecycleEventsForOnMount(newDom);
  }
}
var injectShakeKeyframes = (doc) => {
  if (!doc)
    return;
  if (!doc.getElementById("defuss-shake")) {
    const style = doc.createElement("style");
    style.id = "defuss-shake";
    style.textContent = "@keyframes shake{0%,100%{transform:translate3d(0,0,0)}10%,30%,50%,70%,90%{transform:translate3d(-10px,0,0)}20%,40%,60%,80%{transform:translate3d(10px,0,0)}}";
    doc.head.appendChild(style);
  }
};
var getTransitionStyles = (type, duration, easing = "ease-in-out") => {
  const t = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
  const styles = {
    fade: {
      enter: { opacity: "0", transition: t, transform: "translate3d(0,0,0)" },
      enterActive: { opacity: "1" },
      exit: { opacity: "1", transition: t, transform: "translate3d(0,0,0)" },
      exitActive: { opacity: "0" }
    },
    "slide-left": {
      enter: {
        transform: "translate3d(100%,0,0)",
        opacity: "0.5",
        transition: t
      },
      enterActive: { transform: "translate3d(0,0,0)", opacity: "1" },
      exit: { transform: "translate3d(0,0,0)", opacity: "1", transition: t },
      exitActive: { transform: "translate3d(-100%,0,0)", opacity: "0.5" }
    },
    "slide-right": {
      enter: {
        transform: "translate3d(-100%,0,0)",
        opacity: "0.5",
        transition: t
      },
      enterActive: { transform: "translate3d(0,0,0)", opacity: "1" },
      exit: { transform: "translate3d(0,0,0)", opacity: "1", transition: t },
      exitActive: { transform: "translate3d(100%,0,0)", opacity: "0.5" }
    },
    shake: (() => {
      injectShakeKeyframes(typeof document !== "undefined" ? document : undefined);
      return {
        enter: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          transition: "none"
        },
        enterActive: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          animation: `shake ${duration}ms cubic-bezier(0.36,0.07,0.19,0.97)`
        },
        exit: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          transition: "none"
        },
        exitActive: {
          transform: "translate3d(0,0,0)",
          opacity: "1",
          animation: `shake ${duration}ms cubic-bezier(0.36,0.07,0.19,0.97)`
        }
      };
    })()
  };
  return styles[type] || { enter: {}, enterActive: {}, exit: {}, exitActive: {} };
};
var applyStyles = (el, styles) => Object.entries(styles).forEach(([k, v]) => el.style.setProperty(k, String(v)));
var DEFAULT_TRANSITION_CONFIG = {
  type: "fade",
  duration: 300,
  easing: "ease-in-out",
  delay: 0,
  target: "parent"
};
var wait = (ms) => new Promise((r) => setTimeout(r, ms));
var performCrossfade = async (element, updateCallback, duration, easing) => {
  const originalStyle = element.style.cssText;
  const snapshot = element.cloneNode(true);
  const doc = element.ownerDocument;
  try {
    const rect = element.getBoundingClientRect();
    snapshot.style.cssText = `position:absolute;top:${rect.top}px;left:${rect.left}px;width:${rect.width}px;height:${rect.height}px;opacity:1;transition:opacity ${duration}ms ${easing};z-index:1000;`;
    element.style.opacity = "0";
    element.style.transition = `opacity ${duration}ms ${easing}`;
    doc.body.appendChild(snapshot);
    await updateCallback();
    element.offsetHeight;
    snapshot.style.opacity = "0";
    element.style.opacity = "1";
    await wait(duration);
    doc.body.removeChild(snapshot);
  } catch (error) {
    if (snapshot.parentElement)
      doc.body.removeChild(snapshot);
    throw error;
  } finally {
    element.style.cssText = originalStyle;
  }
};
var performTransition = async (element, updateCallback, config = {}) => {
  const {
    type = "fade",
    duration = 300,
    easing = "ease-in-out",
    delay = 0
  } = { ...DEFAULT_TRANSITION_CONFIG, ...config };
  if (type === "none") {
    await updateCallback();
    return;
  }
  if (delay > 0)
    await wait(delay);
  if (type === "fade") {
    await performCrossfade(element, updateCallback, duration, easing);
    return;
  }
  const styles = config.styles || getTransitionStyles(type, duration, easing);
  const originalTransition = element.style.transition;
  const originalAnimation = element.style.animation;
  try {
    if (type === "shake") {
      element.style.animation = "none";
      element.offsetHeight;
    }
    applyStyles(element, styles.exit);
    element.offsetHeight;
    applyStyles(element, styles.exitActive);
    await wait(duration);
    await updateCallback();
    applyStyles(element, styles.enter);
    element.offsetHeight;
    applyStyles(element, styles.enterActive);
    await wait(duration);
    element.style.transition = originalTransition;
    element.style.animation = originalAnimation;
  } catch (error) {
    element.style.transition = originalTransition;
    element.style.animation = originalAnimation;
    throw error;
  }
};
var inflightTransitions = /* @__PURE__ */ new WeakMap;
var morph = (el, newContent, options = {}) => {
  const globals = resolveGlobals(el);
  const win = globals.window;
  const mode = options.diff ? "diff" : "replace";
  const apply = (content) => updateDomWithVdom(el, typeof content === "string" ? htmlStringToVNodes(content, win.DOMParser) : content, globals, mode);
  const transition = options.transition;
  if (transition && transition.type !== "none") {
    const config = { ...DEFAULT_TRANSITION_CONFIG, ...transition };
    const transitionTarget = config.target === "self" ? el : el.parentElement;
    if (!transitionTarget) {
      apply(newContent);
      return;
    }
    const slot2 = { content: newContent };
    inflightTransitions.set(el, slot2);
    return performTransition(transitionTarget, async () => {
      if (inflightTransitions.get(el) === slot2)
        apply(slot2.content);
    }, config).finally(() => {
      if (inflightTransitions.get(el) === slot2)
        inflightTransitions.delete(el);
    });
  }
  const slot = inflightTransitions.get(el);
  if (slot)
    slot.content = newContent;
  apply(newContent);
};

// node_modules/defuss-query/dist/dom.js
var isNode = (value) => !!value && typeof value === "object" && typeof value.nodeType === "number";
var isElement = (value) => isNode(value) && value.nodeType === 1;
var isTarget = (value) => !!value && typeof value.addEventListener === "function";
var documentOf = (value) => {
  const doc = value?.document ?? (isNode(value) ? value.nodeType === 9 ? value : value.ownerDocument : undefined) ?? globalThis.document;
  if (!doc)
    throw new Error("defuss-query: a DOM document or explicit context is required");
  return doc;
};
var elements = (items) => Array.from(items).filter(isElement);
var tokens = (input) => (typeof input === "string" ? input : input.join(" ")).split(/\s+/).filter(Boolean);
var rootOf = (el) => !el.localName.includes("-") && el.shadowRoot ? el.shadowRoot : el;
function createDomAdapter(api) {
  const requireMorph = () => {
    if (typeof api.morph !== "function" || typeof api.getRenderer !== "function")
      throw new Error("defuss-query: load defuss-morph before creating or mutating DOM");
  };
  function parse(html, context) {
    requireMorph();
    const doc = documentOf(context);
    const Parser = doc.defaultView?.DOMParser;
    if (!Parser)
      throw new Error("defuss-query: context document has no DOMParser");
    const tag = /^\s*<([a-z][\w:-]*)/i.exec(html)?.[1].toLowerCase();
    const wrappers = {
      tr: ["table", "tbody"],
      td: ["table", "tbody", "tr"],
      th: ["table", "tbody", "tr"],
      tbody: ["table"],
      thead: ["table"],
      tfoot: ["table"],
      caption: ["table"],
      colgroup: ["table"],
      col: ["table", "colgroup"],
      option: ["select"],
      optgroup: ["select"]
    };
    const tags = wrappers[tag ?? ""] ?? [];
    let input = html;
    for (let i = tags.length - 1;i >= 0; i--)
      input = `<${tags[i]}>${input}</${tags[i]}>`;
    let result = api.htmlStringToVNodes(`<body>${input}</body>`, Parser);
    for (const wrapper of tags) {
      const node = result.find((item) => !!item && typeof item === "object" && item.type === wrapper);
      result = node?.children ?? [];
    }
    return result;
  }
  function render(content, context, clone = false) {
    requireMorph();
    if (isNode(content)) {
      if (content.nodeType === 11)
        return Array.from(content.childNodes).flatMap((node) => render(node, context, clone));
      return [clone ? content.cloneNode(true) : content];
    }
    if (typeof content === "string")
      return parse(content, context).flatMap((item) => renderValue(item, context));
    if (content && typeof content === "object" && !("type" in content) && ((Symbol.iterator in content) || ("length" in content))) {
      return Array.from(content).flatMap((item) => render(item, context, clone));
    }
    return renderValue(content, context);
  }
  function renderValue(content, context) {
    if (content == null || typeof content === "boolean")
      return [];
    if (Array.isArray(content))
      return content.flatMap((item) => renderValue(item, context));
    const renderer = api.getRenderer(documentOf(context));
    if (typeof content === "string" || typeof content === "number")
      return [renderer.createTextNode(String(content))];
    const vnode = content;
    if (vnode.type === "fragment" || vnode.type === "Fragment")
      return renderValue(vnode.children ?? [], context);
    if (typeof vnode.type !== "string")
      throw new TypeError("defuss-query: expected an intrinsic VNode with a string type");
    if (isElement(context) && context.namespaceURI === "http://www.w3.org/2000/svg" && vnode.type !== "svg") {
      const holder = renderer.createElement({ type: "svg" });
      return [renderer.createElement(vnode, holder)];
    }
    return [renderer.createElement(vnode)];
  }
  function remove(node) {
    requireMorph();
    if (isElement(node))
      api.clearDelegatedEventsDeep(node);
    node.parentNode?.removeChild(node);
  }
  function insert(target, content, position = "beforeend", clone = false) {
    requireMorph();
    const inside = position === "afterbegin" || position === "beforeend";
    const parent = inside ? isElement(target) ? rootOf(target) : target : target.parentNode;
    if (!parent)
      return [];
    const anchor = position === "afterbegin" ? parent.firstChild : position === "beforebegin" ? target : position === "afterend" ? target.nextSibling : null;
    const created = render(content, isElement(parent) || parent.nodeType === 11 ? parent : documentOf(parent), clone);
    for (const node of created)
      if (node === parent || node.contains(parent))
        throw new DOMException("Cannot insert an ancestor into its descendant", "HierarchyRequestError");
    for (const node of created) {
      const previousRoot = node.getRootNode();
      parent.insertBefore(node, anchor);
      if (isElement(node)) {
        if (previousRoot !== node.getRootNode()) {
          const noop = () => {};
          for (const el of [node, ...node.querySelectorAll("*")])
            for (const type of api.getRegisteredEventTypes(el)) {
              api.registerDelegatedEvent(el, type, noop, {
                multi: true
              });
              api.removeDelegatedEvent(el, type, noop);
            }
        }
        api.handleLifecycleEventsForOnMount(node);
      }
    }
    return created;
  }
  function replace(target, content, clone = false) {
    if (!target.parentNode)
      return [];
    const nodes = render(content, target.parentNode, clone);
    if (nodes.includes(target)) {
      if (nodes.length === 1)
        return nodes;
      throw new TypeError("defuss-query: replacement containing its target must contain only that target");
    }
    const inserted = insert(target, nodes, "beforebegin");
    remove(target);
    return inserted;
  }
  function morph2(target, content, options) {
    requireMorph();
    const snapshot = (item) => isNode(item) ? item.nodeType === 11 ? Array.from(item.childNodes, (child) => api.domNodeToVNode(child)) : api.domNodeToVNode(item) : Array.isArray(item) ? item.map(snapshot) : item;
    return api.morph(target, typeof content === "string" ? parse(content, target) : snapshot(content), options);
  }
  function text(target, value) {
    requireMorph();
    if (isElement(target))
      morph2(target, [value]);
    else if (target.nodeType === 3 || target.nodeType === 4)
      target.nodeValue = value;
  }
  return { create: render, insert, replace, remove, morph: morph2, text };
}

// node_modules/defuss-query/dist/query.js
var _a;
var QUERY_VERSION = "0.1.0";
var brand = Symbol.for("defuss-query.factory");
var nativeListeners = new WeakMap;
var styleName = (name) => name.startsWith("--") ? name : name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
var propRecord = (target) => target;

class DfQuery extends Array {
  static get [Symbol.species]() {
    return Array;
  }
  #runtime;
  constructor(runtime, items = []) {
    super();
    this.#runtime = runtime;
    for (const item of new Set(Array.from(items)))
      this.push(item);
  }
  #wrap(items) {
    return new _a(this.#runtime, items);
  }
  #walk(fn) {
    return this.#wrap(elements(this).flatMap((el) => Array.from(fn(el)).filter(isElement)));
  }
  #first() {
    return isElement(this[0]) ? this[0] : undefined;
  }
  get(index) {
    return index === undefined ? Array.from(this) : this.at(index);
  }
  toArray() {
    return Array.from(this);
  }
  eq(index) {
    const item = this.at(index);
    return this.#wrap(item === undefined ? [] : [item]);
  }
  first() {
    return this.eq(0);
  }
  last() {
    return this.eq(-1);
  }
  each(callback) {
    for (let i = 0;i < this.length; i++)
      if (callback.call(this[i], i, this[i]) === false)
        break;
    return this;
  }
  find(input, thisArg) {
    if (typeof input === "function")
      return super.find(input, thisArg);
    return this.#wrap(Array.from(this).flatMap((target) => ("querySelectorAll" in target) ? Array.from(target.querySelectorAll(input)) : []));
  }
  filter(input, thisArg) {
    return this.#wrap(super.filter(typeof input === "string" ? (value) => isElement(value) && value.matches(input) : input, thisArg));
  }
  is(selector) {
    return this.some((el) => isElement(el) && el.matches(selector));
  }
  parent() {
    return this.#walk((el) => [el.parentElement]);
  }
  children(selector) {
    const result = this.#wrap(Array.from(this).flatMap((el) => ("children" in el) ? Array.from(el.children) : []));
    return selector === undefined ? result : result.filter(selector);
  }
  closest(selector) {
    return this.#walk((el) => [el.closest(selector)]);
  }
  next() {
    return this.#walk((el) => [el.nextElementSibling]);
  }
  prev() {
    return this.#walk((el) => [el.previousElementSibling]);
  }
  attr(name, value) {
    if (arguments.length === 1)
      return this.#first()?.getAttribute(name);
    for (const el of elements(this))
      value === null ? el.removeAttribute(name) : el.setAttribute(name, String(value));
    return this;
  }
  prop(name, value) {
    if (arguments.length === 1)
      return this[0] ? propRecord(this[0])[name] : undefined;
    if (["innerHTML", "outerHTML", "textContent", "innerText"].includes(name))
      throw new TypeError("defuss-query: use html(), text(), or replaceWith() for structural writes");
    for (const el of this)
      propRecord(el)[name] = value;
    return this;
  }
  data(name, value) {
    const first = this.#first();
    if (arguments.length === 1)
      return first?.dataset && Object.hasOwn(first.dataset, name) ? first.dataset[name] : undefined;
    for (const el of elements(this)) {
      if (el.dataset)
        value === null ? delete el.dataset[name] : el.dataset[name] = String(value);
    }
    return this;
  }
  css(name, value) {
    if (typeof name === "string" && arguments.length === 1) {
      const el = this.#first();
      return el ? el.ownerDocument.defaultView?.getComputedStyle(el).getPropertyValue(styleName(name)) : undefined;
    }
    const entries = typeof name === "string" ? [[name, value]] : Object.entries(name);
    for (const el of elements(this))
      for (const [key, val] of entries) {
        if (el.style)
          val === null ? el.style.removeProperty(styleName(key)) : el.style.setProperty(styleName(key), String(val));
      }
    return this;
  }
  addClass(names) {
    const list = tokens(names);
    for (const el of elements(this))
      el.classList.add(...list);
    return this;
  }
  removeClass(names) {
    const list = names === undefined ? undefined : tokens(names);
    for (const el of elements(this))
      list ? el.classList.remove(...list) : el.removeAttribute("class");
    return this;
  }
  toggleClass(names, force) {
    const list = tokens(names);
    for (const el of elements(this))
      for (const name of list)
        force === undefined ? el.classList.toggle(name) : el.classList.toggle(name, force);
    return this;
  }
  hasClass(name) {
    return elements(this).some((el) => el.classList.contains(name));
  }
  val(value) {
    const controls = elements(this).filter((el) => ("value" in el));
    if (arguments.length === 0) {
      const el = controls[0];
      return el?.localName === "select" && el.multiple ? Array.from(el.selectedOptions, (option) => option.value) : el?.value;
    }
    for (const el of controls) {
      if (el.localName === "select" && el.multiple) {
        const values = new Set(Array.isArray(value) ? value : value == null ? [] : [String(value)]);
        for (const option of el.options)
          option.selected = values.has(option.value);
      } else if (el.localName === "input" && ["checkbox", "radio"].includes(el.type) && Array.isArray(value)) {
        el.checked = value.includes(el.value);
      } else
        el.value = Array.isArray(value) ? value[0] ?? "" : value == null ? "" : String(value);
    }
    return this;
  }
  form(submitter) {
    if (this.length !== 1 || !isElement(this[0]) || this[0].localName !== "form")
      throw new TypeError("defuss-query: form() requires exactly one form element");
    const form = this[0];
    const Ctor = form.ownerDocument.defaultView?.FormData;
    if (!Ctor)
      throw new Error("defuss-query: form document has no FormData");
    return new Ctor(form, submitter);
  }
  serialize(submitter) {
    const params = new URLSearchParams;
    for (const [name, value] of this.form(submitter))
      if (typeof value === "string")
        params.append(name, value);
    return params.toString();
  }
  morph(content, options) {
    if (options?.transition !== undefined)
      return Promise.all(elements(this).map(async (el) => {
        await this.#runtime.dom.morph(el, content, options);
      })).then(() => this);
    for (const el of elements(this))
      this.#runtime.dom.morph(el, content, options);
    return this;
  }
  html(content, options) {
    if (arguments.length === 0) {
      const el = this.#first();
      return el ? rootOf(el).innerHTML : undefined;
    }
    return this.morph(content, options);
  }
  text(value) {
    if (arguments.length === 0)
      return Array.from(this, (el) => isNode(el) ? (isElement(el) ? rootOf(el) : el).textContent ?? "" : "").join("");
    for (const node of this)
      if (isNode(node))
        this.#runtime.dom.text(node, value == null ? "" : String(value));
    return this;
  }
  empty() {
    return this.morph([]);
  }
  #insert(content, position, replace = false) {
    const input = isNode(content) && content.nodeType === 11 ? Array.from(content.childNodes) : content && typeof content === "object" && !isNode(content) && !("type" in content) && ((Symbol.iterator in content) || ("length" in content)) ? Array.from(content) : content;
    const targets = Array.from(this).filter((item) => isNode(item)).filter((node) => position === "afterbegin" || position === "beforeend" ? node.nodeType === 1 || node.nodeType === 11 : !!node.parentNode);
    return targets.flatMap((node, index) => replace ? this.#runtime.dom.replace(node, input, index !== targets.length - 1) : this.#runtime.dom.insert(node, input, position, index !== targets.length - 1));
  }
  append(content) {
    this.#insert(content, "beforeend");
    return this;
  }
  prepend(content) {
    this.#insert(content, "afterbegin");
    return this;
  }
  before(content) {
    this.#insert(content, "beforebegin");
    return this;
  }
  after(content) {
    this.#insert(content, "afterend");
    return this;
  }
  replaceWith(content) {
    this.#insert(content, "beforebegin", true);
    return this;
  }
  appendTo(target) {
    const selection = typeof target === "string" ? this.#runtime.api(target, documentOf(this[0])) : this.#runtime.api(target);
    return this.#wrap(selection.#insert(this, "beforeend"));
  }
  remove() {
    for (const node of Array.from(this).filter((item) => isNode(item)))
      this.#runtime.dom.remove(node);
    return this;
  }
  on(type, handler, options = {}) {
    if (typeof handler !== "function")
      throw new TypeError("defuss-query: on() requires a function");
    if (typeof options === "object" && Object.keys(options).some((key) => key !== "capture"))
      throw new TypeError("defuss-query: delegated on() supports capture only; use native addEventListener for other options");
    const capture = typeof options === "boolean" ? options : !!options.capture;
    for (const target of this)
      for (const name of tokens(type)) {
        const listener = handler;
        if (isElement(target)) {
          if (typeof this.#runtime.api.registerDelegatedEvent !== "function")
            throw new Error("defuss-query: load defuss-morph before on()");
          this.#runtime.api.registerDelegatedEvent(target, name, listener, { multi: true, capture });
        } else {
          target.addEventListener(name, listener, capture);
          const entries = nativeListeners.get(target) ?? [];
          if (!entries.some((entry) => entry.type === name && entry.handler === listener && entry.capture === capture))
            entries.push({ type: name, handler: listener, capture });
          nativeListeners.set(target, entries);
        }
      }
    return this;
  }
  off(type, handler) {
    const names = type === undefined ? undefined : tokens(type);
    for (const target of this) {
      if (isElement(target)) {
        if (!names)
          this.#runtime.api.clearDelegatedEvents(target);
        else
          for (const name of names)
            this.#runtime.api.removeDelegatedEvent(target, name, handler);
      } else {
        const entries = nativeListeners.get(target) ?? [];
        nativeListeners.set(target, entries.filter((entry) => {
          if ((!names || names.includes(entry.type)) && (!handler || entry.handler === handler)) {
            target.removeEventListener(entry.type, entry.handler, entry.capture);
            return false;
          }
          return true;
        }));
      }
    }
    return this;
  }
  trigger(type, detail) {
    for (const target of this) {
      const realm = isNode(target) ? documentOf(target).defaultView : target.window === target ? target : globalThis;
      const Ctor = realm?.CustomEvent ?? globalThis.CustomEvent;
      target.dispatchEvent(new Ctor(type, { detail, bubbles: true, cancelable: true }));
    }
    return this;
  }
}
_a = DfQuery;
function createDf$(morphApi) {
  const dollar = function(input, context) {
    if (input == null || input === "")
      return new DfQuery(runtime);
    if (typeof input === "function") {
      const doc = documentOf(context);
      const invoke = () => input(dollar);
      doc.readyState === "loading" ? doc.addEventListener("DOMContentLoaded", invoke, { once: true }) : queueMicrotask(invoke);
      return new DfQuery(runtime, [doc]);
    }
    if (typeof input === "string") {
      const root = context ?? documentOf();
      return new DfQuery(runtime, input.trimStart().startsWith("<") ? runtime.dom.create(input, root) : root.querySelectorAll(input));
    }
    if (isTarget(input))
      return new DfQuery(runtime, [input]);
    if (typeof input === "object" && "type" in input)
      return new DfQuery(runtime, runtime.dom.create(input, context ?? documentOf()));
    if (typeof input === "object" && ((Symbol.iterator in input) || ("length" in input))) {
      const items = Array.from(input);
      if (!items.every(isTarget))
        throw new TypeError("defuss-query: collections must contain EventTargets");
      return new DfQuery(runtime, items);
    }
    throw new TypeError("defuss-query: expected selector, markup, VNode, EventTarget, or target collection");
  };
  for (const key of Reflect.ownKeys(morphApi)) {
    if ([
      "name",
      "length",
      "prototype",
      "caller",
      "arguments",
      "fn",
      "dom",
      "queryVersion"
    ].includes(String(key)))
      continue;
    Object.defineProperty(dollar, key, {
      value: Reflect.get(morphApi, key),
      writable: true,
      enumerable: true,
      configurable: true
    });
  }
  const runtime = { api: dollar, dom: createDomAdapter(dollar) };
  Object.defineProperties(dollar, {
    fn: { value: DfQuery.prototype },
    dom: { value: runtime.dom },
    queryVersion: { value: QUERY_VERSION },
    [brand]: { value: true }
  });
  return dollar;
}

// src/shared/debounce.ts
function debounce(fn, wait2) {
  let timer;
  let lastArgs;
  const invoke = () => {
    timer = undefined;
    const args = lastArgs;
    lastArgs = undefined;
    if (args)
      fn(...args);
  };
  const wrapped = (...args) => {
    lastArgs = args;
    if (timer !== undefined)
      clearTimeout(timer);
    timer = setTimeout(invoke, wait2);
  };
  wrapped.flush = () => {
    if (timer === undefined)
      return;
    clearTimeout(timer);
    invoke();
  };
  wrapped.cancel = () => {
    if (timer === undefined)
      return;
    clearTimeout(timer);
    timer = undefined;
    lastArgs = undefined;
  };
  return wrapped;
}
// src/shared/keys.ts
var handlers = new Set;
var listening = false;
var isEditable = (target) => target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]') !== null);
function onKeydown(event) {
  if (isEditable(event.target))
    return;
  for (const handler of handlers) {
    if (handler(event) === true)
      break;
  }
}
function bindGlobalKeys(handler) {
  handlers.add(handler);
  if (!listening && typeof document !== "undefined") {
    listening = true;
    document.addEventListener("keydown", onKeydown);
  }
  return () => {
    handlers.delete(handler);
    if (handlers.size === 0 && listening) {
      listening = false;
      document.removeEventListener("keydown", onKeydown);
    }
  };
}
// src/shared/query.ts
var MORPH_METHODS = [
  "morph",
  "getRenderer",
  "htmlStringToVNodes",
  "renderMarkup",
  "domNodeToVNode",
  "registerDelegatedEvent",
  "removeDelegatedEvent",
  "getRegisteredEventTypes",
  "clearDelegatedEventsDeep",
  "clearDelegatedEvents",
  "handleLifecycleEventsForOnMount"
];
var RUNTIME_INCOMPLETE = "defuss-shadcn: runtime incomplete; load core before component scripts, or load all alone";
function defussQuery() {
  const candidate = Reflect.get(globalThis, "df$");
  if (typeof candidate === "function") {
    const prototype = Reflect.get(candidate, "fn");
    if (typeof Reflect.get(candidate, "queryVersion") === "string" && typeof prototype === "object" && prototype !== null && typeof Reflect.get(prototype, "morph") === "function" && MORPH_METHODS.every((name) => typeof Reflect.get(candidate, name) === "function")) {
      return candidate;
    }
  }
  throw new Error(RUNTIME_INCOMPLETE);
}
// src/shared/motion.ts
var ENTRANCES = [
  "up",
  "down",
  "left",
  "right",
  "zoom",
  "zoom-out",
  "pop",
  "spin",
  "flip",
  "skew",
  "blur",
  "wipe",
  "wipe-up",
  "iris",
  "fade"
];
var active = new WeakMap;
var owned = (el, prefix) => el.getAnimations({ subtree: false }).filter((a) => typeof a.animationName === "string" && a.animationName.startsWith(prefix));
function trigger(el, attr, effect, prefix, options = {}) {
  const style = el.style;
  if (effect !== undefined)
    el.setAttribute(attr, effect);
  const animations = owned(el, prefix);
  for (const animation of animations)
    animation.cancel();
  style.setProperty("--df-motion-base-opacity", getComputedStyle(el).opacity);
  if (options.duration !== undefined)
    style.setProperty("--df-motion-duration", `${options.duration}ms`);
  if (options.delay !== undefined)
    style.setProperty("--df-motion-delay", `${options.delay}ms`);
  if (options.easing !== undefined)
    style.setProperty("--df-motion-ease", options.easing);
  if (options.distance !== undefined)
    style.setProperty("--df-motion-distance", options.distance);
  for (const animation of animations)
    animation.play();
  active.set(el, animations);
  const finished = Promise.all(animations.map((a) => a.finished.catch(() => {
    return;
  }))).then(() => {
    if (active.get(el) !== animations)
      return;
    active.delete(el);
  });
  return {
    finished,
    cancel() {
      if (active.get(el) !== animations)
        return;
      animations.forEach((a) => a.cancel());
      active.delete(el);
      el.removeAttribute(attr);
    }
  };
}
function entrance(element, effect, options = {}) {
  const current = element.getAttribute("data-df-entrance") ?? undefined;
  const target = effect ?? current;
  if (target !== undefined && !ENTRANCES.includes(target)) {
    throw new Error(`motion: unknown entrance "${target}" (supported: ${ENTRANCES.join(", ")})`);
  }
  return trigger(element, "data-df-entrance", target, "df-enter-", options);
}
function draw(element, options = {}) {
  return trigger(element, "data-df-draw", undefined, "df-draw", options);
}
function revealAttr(direction, delay) {
  const dir = ENTRANCES.includes(String(direction)) ? String(direction) : "up";
  const ms = delay === undefined ? -1 : Math.max(0, Number(delay) || 0);
  const attrs = { "data-df-entrance": dir };
  if (ms > 0)
    attrs.style = `--df-motion-delay:${ms}ms`;
  return attrs;
}

// src/shared/presentation.ts
function coerceIndex(raw, fallback) {
  const n = typeof raw === "number" ? raw : parseInt(String(raw), 10);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}
function clampIndex(raw, count) {
  if (count <= 0)
    return 0;
  return Math.min(count - 1, Math.max(0, coerceIndex(raw, 0)));
}
var COUNT_KEY = "_presentationCount";
function animateCount(el, opts = {}) {
  const num = (raw, fallback) => {
    const n = typeof raw === "number" ? raw : Number(raw);
    return Number.isFinite(n) ? n : fallback;
  };
  const to = opts.to ?? num(el.dataset.count, 0);
  const from = opts.from ?? num(el.dataset.countFrom, 0);
  const duration = Math.max(0, opts.duration ?? num(el.dataset.countDuration, 1200));
  const delay = Math.max(0, opts.delay ?? num(el.dataset.countDelay, 0));
  const decimals = opts.decimals ?? num(el.dataset.countDecimals, String(to).split(".")[1]?.length ?? 0);
  const fmt = opts.format ?? ((n) => new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  }).format(n));
  const stop = el[COUNT_KEY];
  if (typeof stop === "function")
    stop();
  let raf = 0;
  let timer = 0;
  const settle = () => {
    el.textContent = fmt(to);
  };
  const reduced = typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const start = () => {
    if (reduced || duration === 0 || from === to) {
      settle();
      return;
    }
    const t0 = performance.now();
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration);
      const eased = 1 - (1 - p) ** 3;
      el.textContent = p >= 1 ? fmt(to) : fmt(from + (to - from) * eased);
      if (p < 1)
        raf = requestAnimationFrame(tick);
    };
    el.textContent = fmt(from);
    raf = requestAnimationFrame(tick);
  };
  const cancel = () => {
    cancelAnimationFrame(raf);
    clearTimeout(timer);
    if (el[COUNT_KEY] === cancel)
      delete el[COUNT_KEY];
  };
  el[COUNT_KEY] = cancel;
  if (delay > 0)
    timer = setTimeout(start, delay);
  else
    start();
  return cancel;
}
var PRESENTATION_NOT_INITIALIZED = "ddf$: presentation element is not initialized - load dist/components/presentation/presentation.js (or all.js) first";
function presentationScope(el) {
  const mount = el?.closest(".presentation") ?? (typeof document !== "undefined" ? document.querySelector(".presentation") : null);
  if (!mount)
    throw new Error("ddf$: no .presentation element found");
  const slides = () => Array.from(mount.querySelectorAll(":scope > [data-slide]"));
  const apply = (index) => {
    const api = mount.api;
    if (!api)
      throw new Error(PRESENTATION_NOT_INITIALIZED);
    api.setState("default", { index });
    return coerceIndex(mount.dataset.currentSlide, index);
  };
  return {
    el: mount,
    slides,
    count: () => slides().length,
    index: () => coerceIndex(mount.dataset.currentSlide, 0),
    goTo: (index) => apply(clampIndex(index, slides().length)),
    next: () => apply(Math.min(slides().length - 1, coerceIndex(mount.dataset.currentSlide, 0) + 1)),
    prev: () => apply(Math.max(0, coerceIndex(mount.dataset.currentSlide, 0) - 1)),
    first: () => apply(0),
    last: () => apply(slides().length - 1),
    fullscreen: () => mount.hasAttribute("data-fullscreen"),
    toggleFullscreen: (on) => {
      const api = mount.api;
      if (!api)
        throw new Error(PRESENTATION_NOT_INITIALIZED);
      const want = on ?? !mount.hasAttribute("data-fullscreen");
      api.setState("fullscreen", { value: want });
      return want;
    }
  };
}
function installDdf(namespace) {
  const existing = Reflect.get(globalThis, "ddf$");
  if (existing !== undefined) {
    throw new Error("defuss-shadcn: globalThis.ddf$ is already defined - core installs the shared library exactly once");
  }
  Reflect.set(globalThis, "ddf$", namespace);
  return namespace;
}
// src/shared/anim.ts
var ANIM_NAMES = [
  "fadeIn",
  "fadeOut",
  "slideIn",
  "slideOut",
  "zoomIn",
  "zoomOut",
  "popIn",
  "popOut",
  "spinIn",
  "spinOut",
  "flipIn",
  "flipOut",
  "skewIn",
  "skewOut",
  "blurIn",
  "blurOut",
  "wipeIn",
  "wipeOut",
  "irisIn",
  "irisOut",
  "blocksIn",
  "blocksOut"
];
var DEFAULT_DURATION = 1500;
var DEFAULT_EASING = "cubic-bezier(0.16, 1, 0.3, 1)";
var DEFAULT_DISTANCE = "24px";
var DEFAULT_BLUR = "12px";
var DEFAULT_ANGLE = "12deg";
var DEFAULT_SPIN = "0.5turn";
var DEFAULT_ZOOM_SCALE = 0.8;
var DEFAULT_ORIGIN = "50% 50%";
var DEFAULT_BLOCKS = 5;
var DEFAULT_STAGGER = 90;
var DIRECTIONS = ["north", "south", "east", "west"];
function coerceDirection(value, fallback) {
  return DIRECTIONS.includes(value) ? value : fallback;
}
function offsetFor(direction, distance) {
  switch (direction) {
    case "north":
      return `translate(0px, calc(-1 * ${distance}))`;
    case "south":
      return `translate(0px, ${distance})`;
    case "west":
      return `translate(calc(-1 * ${distance}), 0px)`;
    case "east":
      return `translate(${distance}, 0px)`;
  }
}
function insetFor(direction) {
  switch (direction) {
    case "north":
      return "inset(0px 0px 100% 0px)";
    case "south":
      return "inset(100% 0px 0px 0px)";
    case "west":
      return "inset(0px 100% 0px 0px)";
    case "east":
      return "inset(0px 0px 0px 100%)";
  }
}
function animKeyframes(name, opts = {}, ctx = { baseOpacity: 1 }) {
  const direction = coerceDirection(opts.direction, "north");
  const distance = opts.distance ?? DEFAULT_DISTANCE;
  const origin = opts.origin ?? DEFAULT_ORIGIN;
  const base = ctx.baseOpacity;
  switch (name) {
    case "fadeIn":
      return [{ opacity: 0 }, { opacity: base }];
    case "fadeOut":
      return [{ opacity: base }, { opacity: 0 }];
    case "slideIn":
      return [
        { transform: offsetFor(direction, distance), opacity: 0 },
        { transform: "translate(0px, 0px)", opacity: base }
      ];
    case "slideOut":
      return [
        { transform: "translate(0px, 0px)", opacity: base },
        { transform: offsetFor(direction, distance), opacity: 0 }
      ];
    case "zoomIn":
      return [
        { transform: `scale(${opts.scale ?? DEFAULT_ZOOM_SCALE})`, opacity: 0, transformOrigin: origin },
        { transform: "scale(1)", opacity: base, transformOrigin: origin }
      ];
    case "zoomOut":
      return [
        { transform: "scale(1)", opacity: base, transformOrigin: origin },
        { transform: `scale(${opts.scale ?? DEFAULT_ZOOM_SCALE})`, opacity: 0, transformOrigin: origin }
      ];
    case "popIn":
      return [
        { transform: "scale(0.65)", opacity: 0, offset: 0 },
        { transform: "scale(1.07)", opacity: base, offset: 0.65 },
        { transform: "scale(1)", opacity: base, offset: 1 }
      ];
    case "popOut":
      return [
        { transform: "scale(1)", opacity: base, offset: 0 },
        { transform: "scale(1.07)", opacity: base, offset: 0.35 },
        { transform: "scale(0.65)", opacity: 0, offset: 1 }
      ];
    case "spinIn":
      return [
        { transform: `rotate(-${DEFAULT_SPIN})`, opacity: 0 },
        { transform: "rotate(0deg)", opacity: base }
      ];
    case "spinOut":
      return [
        { transform: "rotate(0deg)", opacity: base },
        { transform: `rotate(${DEFAULT_SPIN})`, opacity: 0 }
      ];
    case "flipIn": {
      const axis = direction === "north" || direction === "south" ? "rotateX" : "rotateY";
      const sign = direction === "north" || direction === "west" ? 1 : -1;
      return [
        { transform: `perspective(900px) ${axis}(${sign * 70}deg)`, opacity: 0 },
        { transform: `perspective(900px) ${axis}(0deg)`, opacity: base }
      ];
    }
    case "flipOut": {
      const axis = direction === "north" || direction === "south" ? "rotateX" : "rotateY";
      const sign = direction === "north" || direction === "west" ? -1 : 1;
      return [
        { transform: `perspective(900px) ${axis}(0deg)`, opacity: base },
        { transform: `perspective(900px) ${axis}(${sign * 70}deg)`, opacity: 0 }
      ];
    }
    case "skewIn": {
      const horizontal = direction === "east" || direction === "west";
      const axis = horizontal ? "skewX" : "skewY";
      const sign = direction === "west" || direction === "south" ? 1 : -1;
      return [
        { transform: `${axis}(calc(${sign} * ${DEFAULT_ANGLE}))`, opacity: 0 },
        { transform: `${axis}(0deg)`, opacity: base }
      ];
    }
    case "skewOut": {
      const horizontal = direction === "east" || direction === "west";
      const axis = horizontal ? "skewX" : "skewY";
      const sign = direction === "west" || direction === "south" ? -1 : 1;
      return [
        { transform: `${axis}(0deg)`, opacity: base },
        { transform: `${axis}(calc(${sign} * ${DEFAULT_ANGLE}))`, opacity: 0 }
      ];
    }
    case "blurIn":
      return [
        { filter: `blur(${DEFAULT_BLUR})`, opacity: 0 },
        { filter: "blur(0px)", opacity: base }
      ];
    case "blurOut":
      return [
        { filter: "blur(0px)", opacity: base },
        { filter: `blur(${DEFAULT_BLUR})`, opacity: 0 }
      ];
    case "wipeIn":
      return [{ clipPath: insetFor(direction) }, { clipPath: "inset(0px 0px 0px 0px)" }];
    case "wipeOut":
      return [{ clipPath: "inset(0px 0px 0px 0px)" }, { clipPath: insetFor(direction) }];
    case "irisIn":
      return [
        { clipPath: `circle(0% at ${origin})` },
        { clipPath: `circle(150% at ${origin})` }
      ];
    case "irisOut":
      return [
        { clipPath: `circle(150% at ${origin})` },
        { clipPath: `circle(0% at ${origin})` }
      ];
    default:
      throw new Error(`anim: "${name}" is composite - it has no element keyframes`);
  }
}
var instances = new WeakMap;
var instanceFor = (el, name) => instances.get(el)?.get(name);
var reducedMotion = () => typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
function dropInstance(el, name) {
  const map = instances.get(el);
  if (!map)
    return;
  map.delete(name);
  if (map.size === 0)
    instances.delete(el);
}
function storeInstance(el, name, instance) {
  let map = instances.get(el);
  if (!map) {
    map = new Map;
    instances.set(el, map);
  }
  map.set(name, instance);
}
function deriveState(animations) {
  if (animations.length === 0)
    return "idle";
  const states = animations.map((a) => a.playState);
  if (states.every((s) => s === "finished"))
    return "finished";
  if (states.every((s) => s === "paused"))
    return "paused";
  if (states.some((s) => s === "running" || s === "pending"))
    return "running";
  return "idle";
}
function bindScroll(animations, scroll, totalMs) {
  const axis = scroll.axis ?? "y";
  const target = scroll.target ?? "viewport";
  const [rangeFrom, rangeTo] = scroll.range ?? [0, 1];
  const supportsTimeline = !scroll.forceFallback && typeof globalThis.ScrollTimeline === "function";
  if (supportsTimeline) {
    const source = target === "viewport" ? document.scrollingElement ?? document.documentElement : target;
    const TimelineCtor = globalThis.ScrollTimeline;
    const timeline = new TimelineCtor({ source, axis: axis === "x" ? "inline" : "block" });
    for (const animation of animations) {
      animation.pause();
      animation.timeline = timeline;
      animation.play();
    }
    return () => {
      for (const animation of animations)
        animation.timeline = document.timeline;
    };
  }
  for (const animation of animations)
    animation.pause();
  const progress = () => {
    let p;
    if (target === "viewport") {
      const doc = document.documentElement;
      p = axis === "y" ? doc.scrollTop / Math.max(1, doc.scrollHeight - doc.clientHeight) : doc.scrollLeft / Math.max(1, doc.scrollWidth - doc.clientWidth);
    } else {
      p = axis === "y" ? target.scrollTop / Math.max(1, target.scrollHeight - target.clientHeight) : target.scrollLeft / Math.max(1, target.scrollWidth - target.clientWidth);
    }
    return rangeFrom + Math.min(1, Math.max(0, p)) * (rangeTo - rangeFrom);
  };
  const apply = () => {
    const time = progress() * totalMs;
    for (const animation of animations)
      animation.currentTime = time;
  };
  let queued = false;
  const onScroll = () => {
    if (queued)
      return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      apply();
    });
  };
  const listenTarget = target === "viewport" ? globalThis : target;
  listenTarget.addEventListener("scroll", onScroll, { passive: true });
  apply();
  return () => listenTarget.removeEventListener("scroll", onScroll);
}
function timingFor(opts, durationOverride) {
  return {
    duration: durationOverride ?? (reducedMotion() ? 1 : opts.duration ?? DEFAULT_DURATION),
    delay: reducedMotion() ? 0 : opts.delay ?? 0,
    easing: opts.easing ?? DEFAULT_EASING,
    fill: "both"
  };
}
function playBlocks(el, name, opts) {
  const host = el;
  const direction = coerceDirection(opts.direction, "north");
  const count = Math.max(1, Math.round(opts.blocks ?? DEFAULT_BLOCKS));
  const stagger = Math.max(0, opts.stagger ?? DEFAULT_STAGGER);
  const timing = timingFor(opts);
  const duration = timing.duration;
  const horizontal = direction === "east" || direction === "west";
  const authoredPosition = host.style.position;
  if (getComputedStyle(host).position === "static")
    host.style.position = "relative";
  const overlay = document.createElement("div");
  overlay.setAttribute("data-df-anim-blocks", "");
  overlay.setAttribute("aria-hidden", "true");
  Object.assign(overlay.style, {
    position: "absolute",
    inset: "0",
    display: "flex",
    flexDirection: horizontal ? "row" : "column",
    pointerEvents: "none",
    zIndex: "1",
    overflow: "hidden"
  });
  const animations = [];
  for (let i = 0;i < count; i++) {
    const block = document.createElement("div");
    Object.assign(block.style, {
      flex: "1 1 0%",
      background: opts.color ?? "currentColor",
      outline: `1px solid ${opts.color ?? "currentColor"}`,
      transformOrigin: horizontal ? direction === "west" ? "left" : "right" : direction === "north" ? "top" : "bottom"
    });
    overlay.append(block);
    const axis = horizontal ? "scaleX" : "scaleY";
    const index = name === "blocksIn" ? i : count - 1 - i;
    const keyframes = name === "blocksIn" ? [{ transform: `${axis}(0)` }, { transform: `${axis}(1)` }] : [{ transform: `${axis}(1)` }, { transform: `${axis}(0)` }];
    animations.push(block.animate(keyframes, { ...timing, delay: timing.delay + index * stagger }));
  }
  host.append(overlay);
  const cleanup = () => {
    overlay.remove();
    host.style.position = authoredPosition;
  };
  if (name === "blocksOut") {
    Promise.all(animations.map((a) => a.finished.catch(() => {
      return;
    }))).then(() => {
      if (instanceFor(el, name)?.cleanup)
        cleanup();
    });
  }
  return {
    animations,
    cleanup,
    totalMs: timing.delay + (count - 1) * stagger + duration
  };
}
function playAnim(name, el, opts = {}) {
  if (!ANIM_NAMES.includes(name)) {
    throw new Error(`anim: unknown animation "${name}" (supported: ${ANIM_NAMES.join(", ")})`);
  }
  resetAnim(name, el);
  const composite = name === "blocksIn" || name === "blocksOut";
  const timing = timingFor(opts);
  let animations;
  let cleanup = null;
  let totalMs;
  if (composite) {
    const built = playBlocks(el, name, opts);
    animations = built.animations;
    cleanup = built.cleanup;
    totalMs = built.totalMs;
  } else {
    const ctx = { baseOpacity: Number(getComputedStyle(el).opacity) || 1 };
    animations = [el.animate(animKeyframes(name, opts, ctx), timing)];
    totalMs = timing.delay + timing.duration;
  }
  let unbind = null;
  if (opts.scroll)
    unbind = bindScroll(animations, opts.scroll, totalMs);
  const instance = {
    animations,
    unbind,
    cleanup,
    finished: Promise.all(animations.map((a) => a.finished.catch(() => {
      return;
    }))).then(() => {
      return;
    })
  };
  storeInstance(el, name, instance);
  return {
    finished: instance.finished,
    pause: () => animations.forEach((a) => a.pause()),
    resume: () => animations.forEach((a) => a.play()),
    finish: () => animations.forEach((a) => a.finish()),
    reset: () => resetAnim(name, el),
    state: () => deriveState(animations)
  };
}
function resetAnim(name, el) {
  const instance = instanceFor(el, name);
  if (!instance)
    return;
  for (const animation of instance.animations)
    animation.cancel();
  instance.unbind?.();
  instance.cleanup?.();
  dropInstance(el, name);
}
function channelFor(name) {
  return {
    play: (el, opts) => playAnim(name, el, opts),
    pause: (el) => instanceFor(el, name)?.animations.forEach((a) => a.pause()),
    resume: (el) => instanceFor(el, name)?.animations.forEach((a) => a.play()),
    finish: (el) => instanceFor(el, name)?.animations.forEach((a) => a.finish()),
    reset: (el) => resetAnim(name, el),
    state: (el) => {
      const instance = instanceFor(el, name);
      return instance ? deriveState(instance.animations) : "idle";
    }
  };
}
var anim = Object.freeze(Object.assign(Object.fromEntries(ANIM_NAMES.map((name) => [name, channelFor(name)])), { names: ANIM_NAMES }));
// src/shared/theme-links.ts
var LINK_ATTR = "data-df-theme-link";
var inflight = new Map;
function themeJsonHref(id) {
  const tokens2 = document.getElementById("tokens-css") ?? document.querySelector('link[href*="default-semantic-tokens.css"]');
  if (tokens2)
    return new URL(`../${id}.json`, tokens2.href).href;
  return `${id}.json`;
}
function parseThemeLinks(text) {
  let raw;
  try {
    raw = JSON.parse(text);
  } catch (e) {
    throw new Error(`theme links: invalid JSON - ${e instanceof Error ? e.message : e}`);
  }
  const file = raw;
  if (!file || file.schema !== "v1")
    throw new Error('theme links: $.schema must be "v1"');
  if (!Array.isArray(file.links))
    throw new Error("theme links: $.links must be an array");
  for (const [i, node] of file.links.entries()) {
    if (!node || node.type !== "link")
      throw new Error(`theme links: $.links[${i}].type must be "link" (got ${JSON.stringify(node && node.type)})`);
    if (!node.attributes || typeof node.attributes !== "object")
      throw new Error(`theme links: $.links[${i}].attributes must be an object`);
  }
  return { schema: "v1", links: file.links };
}
function clearThemeLinks() {
  document.querySelectorAll(`link[${LINK_ATTR}]`).forEach((el) => el.remove());
}
function applyThemeLinks(themeId, links) {
  if (!document.getElementById("df-theme-links")) {
    const marker = document.createElement("template");
    marker.id = "df-theme-links";
    document.head.append(marker);
  }
  clearThemeLinks();
  for (const node of links) {
    const rel = node.attributes.rel ?? "";
    const href = node.attributes.href ?? "";
    const existing = document.querySelector(`link[rel="${CSS.escape(rel)}"][href="${CSS.escape(href)}"]`);
    if (existing)
      continue;
    const link = document.createElement("link");
    for (const [name, value] of Object.entries(node.attributes))
      link.setAttribute(name, String(value));
    link.setAttribute(LINK_ATTR, themeId);
    document.head.append(link);
  }
}
function loadTheme(id) {
  if (!id || id === "default") {
    clearThemeLinks();
    return Promise.resolve();
  }
  let pending = inflight.get(id);
  if (!pending) {
    pending = (async () => {
      try {
        const res = await fetch(themeJsonHref(id));
        return res.ok ? parseThemeLinks(await res.text()) : null;
      } catch (e) {
        if (e instanceof SyntaxError || e instanceof Error && e.message.startsWith("theme links"))
          throw e;
        return null;
      }
    })();
    inflight.set(id, pending);
  }
  return pending.then((file) => {
    if (file)
      applyThemeLinks(id, file.links);
    else
      clearThemeLinks();
  });
}

// src/shared/state-api.ts
function defussGlobals() {
  const runtime = defussQuery();
  const registry = runtime.shadcn ??= {};
  if (typeof globalThis.$ !== "function")
    globalThis.$ = document.querySelector.bind(document);
  return registry;
}
function safeShowPopover(el) {
  const show = () => {
    try {
      el.showPopover();
    } catch {}
  };
  const displayed = () => getComputedStyle(el).display !== "none";
  if (!displayed()) {
    show();
    return;
  }
  const deadline = performance.now() + 500;
  const tick = () => {
    if (!displayed() || performance.now() > deadline)
      show();
    else
      requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
// src/shared/version.ts
var SHARED_ABI = "0.9.1";
// src/core/index.ts
var existing = Reflect.get(globalThis, "df$");
if (existing !== undefined) {
  throw new Error("defuss-shadcn core: globalThis.df$ is already defined - load core OR all, never both and never twice");
}
var df = createDf$(exports_dist);
Reflect.set(globalThis, "df$", df);
var shadcn = df.shadcn ??= {};
shadcn.shared = {
  abi: SHARED_ABI,
  defussGlobals,
  safeShowPopover,
  defussQuery,
  debounce,
  animateCount,
  clampIndex,
  coerceIndex,
  presentationScope,
  revealAttr,
  entrance,
  draw,
  anim,
  bindGlobalKeys,
  loadTheme
};
Reflect.set(df, "anim", anim);
shadcn.anim = anim;
installDdf({
  abi: SHARED_ABI,
  defussGlobals,
  safeShowPopover,
  defussQuery,
  debounce,
  presentation: presentationScope,
  animateCount,
  revealAttr,
  entrance,
  draw,
  anim,
  bindGlobalKeys,
  loadTheme,
  clampIndex,
  coerceIndex
});

// src/components/accordion/accordion.ts
var df$ = defussGlobals();
var accordionStates = ["default", "all-open", "all-closed"];
function triggerStateChange(accordion, stateName, _config) {
  const items = Array.from(accordion.querySelectorAll(".accordion-item"));
  const gen = (accordion._applyGen ?? 0) + 1;
  accordion._applyGen = gen;
  accordion._applying = true;
  switch (stateName) {
    case "default":
      items.forEach((item, i) => {
        item.open = (accordion._defaultOpen ?? [])[i] ?? item.open;
      });
      break;
    case "all-open":
      items.forEach((item) => {
        item.open = true;
      });
      break;
    case "all-closed":
      items.forEach((item) => {
        item.open = false;
      });
      break;
  }
  setTimeout(() => {
    if (accordion._applyGen === gen)
      accordion._applying = false;
  }, 0);
}
var accordionApi = {
  setState(accordion, stateName, config = {}) {
    if (!accordionStates.includes(stateName)) {
      throw new Error(`accordion: unknown state "${stateName}" (supported: ${accordionStates.join(", ")})`);
    }
    triggerStateChange(accordion, stateName, config);
    accordion.dataset.stateName = stateName;
    accordion._stateConfig = config;
  },
  getState(accordion) {
    return { name: accordion.dataset.stateName || "default", config: accordion._stateConfig ?? {} };
  }
};
df$.accordionApi = accordionApi;
df$.accordionStates = accordionStates;
function init() {
  document.querySelectorAll(".accordion:not([data-api])").forEach((accordion) => {
    accordion.dataset.api = "";
    const items = accordion.querySelectorAll(".accordion-item");
    accordion._defaultOpen = Array.from(items).map((item) => item.open);
    accordion.api = {
      setState: (stateName, config) => accordionApi.setState(accordion, stateName, config),
      getState: () => accordionApi.getState(accordion)
    };
  });
  document.querySelectorAll('.accordion[data-type="single"]:not([data-init])').forEach((accordion) => {
    accordion.dataset.init = "";
    const items = accordion.querySelectorAll(".accordion-item");
    const collapsible = accordion.hasAttribute("data-collapsible");
    items.forEach((item) => {
      item.addEventListener("beforetoggle", (e) => {
        if (accordion._applying)
          return;
        if (e.newState !== "closed" || collapsible)
          return;
        if (!Array.from(items).some((i) => i !== item && i.open))
          e.preventDefault();
      });
      item.addEventListener("toggle", () => {
        if (accordion._applying)
          return;
        if (item.open) {
          items.forEach((sibling) => {
            if (sibling !== item && sibling.open)
              sibling.open = false;
          });
        } else if (!collapsible) {
          const anyOpen = Array.from(items).some((i) => i.open);
          if (!anyOpen)
            item.open = true;
        }
      });
    });
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// src/components/alert-dialog/alert-dialog.ts
var df$2 = defussGlobals();
var alertDialogStates = ["default", "open"];
function triggerStateChange2(dialog, stateName, _config) {
  switch (stateName) {
    case "default":
      if (dialog.open)
        dialog.close();
      break;
    case "open":
      if (!dialog.open)
        dialog.showModal();
      break;
  }
}
var alertDialogApi = {
  setState(dialog, stateName, config = {}) {
    if (!alertDialogStates.includes(stateName)) {
      throw new Error(`alert-dialog: unknown state "${stateName}" (supported: ${alertDialogStates.join(", ")})`);
    }
    triggerStateChange2(dialog, stateName, config);
    dialog.dataset.stateName = stateName;
    dialog._stateConfig = config;
  },
  getState(dialog) {
    return { name: dialog.dataset.stateName || "default", config: dialog._stateConfig ?? {} };
  }
};
df$2.alertDialogApi = alertDialogApi;
df$2.alertDialogStates = alertDialogStates;
function init2() {
  document.querySelectorAll("[data-alert-dialog-trigger]:not([data-init])").forEach((trigger2) => {
    trigger2.dataset.init = "";
    const dialog = document.getElementById(trigger2.dataset.alertDialogTrigger);
    if (!dialog)
      return;
    trigger2.addEventListener("click", () => {
      dialog._trigger = trigger2;
      dialog.showModal();
    });
  });
  document.querySelectorAll("dialog.alert-dialog:not([data-init])").forEach((dialog) => {
    dialog.dataset.init = "";
    dialog.api = {
      setState: (stateName, config) => alertDialogApi.setState(dialog, stateName, config),
      getState: () => alertDialogApi.getState(dialog)
    };
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
    });
    dialog.querySelectorAll("[data-alert-dialog-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        dialog.close();
      });
    });
    dialog.addEventListener("close", () => {
      if (dialog.open)
        return;
      dialog.dataset.stateName = "default";
      if (dialog._trigger)
        dialog._trigger.focus();
    });
  });
}
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// src/components/anim-canvas/anim-canvas.ts
var df$3 = defussGlobals();
var dfDollar = defussQuery();
var animCanvasStates = ["default", "overview"];
var DIRS = {
  east: [1, 0],
  west: [-1, 0],
  south: [0, 1],
  north: [0, -1]
};
function channelFor2(name) {
  if (!anim.names.includes(name)) {
    throw new Error(`anim-canvas: unknown animation "${name}" (supported: ${anim.names.join(", ")})`);
  }
  return anim[name];
}
function animNameFor(slide) {
  return slide.dataset.animIn || "slideIn";
}
function animOptsFor(slide, travel) {
  const d = slide.dataset;
  const p = "animIn";
  const opts = { direction: d[`${p}Direction`] ?? travel };
  const duration = parseFloat(d[`${p}Duration`] ?? "");
  if (Number.isFinite(duration))
    opts.duration = duration;
  const delay = parseFloat(d[`${p}Delay`] ?? "");
  if (Number.isFinite(delay))
    opts.delay = delay;
  if (d[`${p}Easing`])
    opts.easing = d[`${p}Easing`];
  if (d[`${p}Origin`])
    opts.origin = d[`${p}Origin`];
  if (d[`${p}Distance`])
    opts.distance = d[`${p}Distance`];
  const blocks = parseInt(d[`${p}Blocks`] ?? "", 10);
  if (Number.isFinite(blocks))
    opts.blocks = blocks;
  const stagger = parseFloat(d[`${p}Stagger`] ?? "");
  if (Number.isFinite(stagger))
    opts.stagger = stagger;
  if (d[`${p}Color`])
    opts.color = d[`${p}Color`];
  return opts;
}
var transformFor = (v) => `translate(${v.tx}px, ${v.ty}px) scale(${v.s})`;
var reducedMotion2 = () => typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
function panDuration(root) {
  if (reducedMotion2())
    return 1;
  const v = parseFloat(root.dataset.panDuration ?? "");
  return Number.isFinite(v) ? v : 1500;
}
function focusView(root, ctx, slide) {
  const box = root.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0)
    return null;
  const p = ctx.pos.get(slide) ?? { x: 0, y: 0 };
  const s = Math.min(box.width / ctx.w, box.height / ctx.h);
  return {
    s,
    tx: (box.width - ctx.w * s) / 2 - p.x * (ctx.w + ctx.gap) * s,
    ty: (box.height - ctx.h * s) / 2 - p.y * (ctx.h + ctx.gap) * s
  };
}
function overviewView(root, ctx) {
  const box = root.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0)
    return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of ctx.pos.values()) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  const bw = (maxX - minX + 1) * (ctx.w + ctx.gap) - ctx.gap;
  const bh = (maxY - minY + 1) * (ctx.h + ctx.gap) - ctx.gap;
  const s = Math.min(box.width / bw, box.height / bh) * 0.92;
  return {
    s,
    tx: (box.width - bw * s) / 2 - minX * (ctx.w + ctx.gap) * s,
    ty: (box.height - bh * s) / 2 - minY * (ctx.h + ctx.gap) * s
  };
}
function panTo(root, ctx, view, animate = true) {
  if (!view)
    return Promise.resolve();
  ctx.pan?.cancel();
  ctx.pan = null;
  const to = transformFor(view);
  const from = ctx.view ? transformFor(ctx.view) : null;
  ctx.view = view;
  if (!animate || !from || from === to || panDuration(root) <= 1) {
    ctx.board.style.transform = to;
    return Promise.resolve();
  }
  const flight = ctx.board.animate([{ transform: from }, { transform: to }], {
    duration: panDuration(root),
    easing: "cubic-bezier(0.16, 1, 0.3, 1)",
    fill: "both"
  });
  ctx.pan = flight;
  return flight.finished.catch(() => {
    return;
  }).then(() => {
    if (ctx.pan === flight) {
      ctx.board.style.transform = to;
      flight.cancel();
      ctx.pan = null;
    }
  });
}
function applySlideState(root, ctx) {
  const overview = root.hasAttribute("data-overview");
  for (const s of ctx.slides) {
    const on = overview || s === ctx.active;
    s.inert = !on;
    if (on)
      s.removeAttribute("aria-hidden");
    else
      s.setAttribute("aria-hidden", "true");
  }
  root.querySelectorAll("[data-anim-canvas-go]").forEach((el) => {
    const dir = el.getAttribute("data-anim-canvas-go");
    if (dir === "overview" || !(el instanceof HTMLButtonElement))
      return;
    el.disabled = !ctx.active.dataset[dir];
  });
}
function activate(root, ctx, slide) {
  ctx.active = slide;
  for (const s of ctx.slides)
    s.toggleAttribute("data-active", s === slide);
  root.dataset.currentSlide = slide.id;
  applySlideState(root, ctx);
}
function arrivalLead(root) {
  return reducedMotion2() ? 0 : Math.round(panDuration(root) * 0.35);
}
var CONTENT_LAG = 280;
function cssMs(v) {
  const first = (v || "").split(",")[0].trim();
  const n = parseFloat(first);
  if (!Number.isFinite(n))
    return 0;
  return first.endsWith("ms") ? n : n * 1000;
}
function replayContent(slide, offset) {
  const withOffset = (el) => {
    const d = el.dataset;
    if (d.animCanvasBaseDelay === undefined)
      d.animCanvasBaseDelay = String(cssMs(getComputedStyle(el).animationDelay));
    return parseFloat(d.animCanvasBaseDelay) + offset;
  };
  slide.querySelectorAll("[data-df-entrance]").forEach((el) => {
    entrance(el, undefined, { delay: withOffset(el) });
  });
  slide.querySelectorAll("[data-df-draw]").forEach((el) => {
    draw(el, { delay: withOffset(el) });
  });
  slide.querySelectorAll("[data-count]").forEach((el) => {
    animateCount(el, { delay: offset });
  });
}
function settle(slide) {
  for (const a of slide.getAnimations({ subtree: true })) {
    try {
      a.finish();
    } catch {
      a.cancel();
    }
  }
}
function arrive(root, target, travel) {
  const lead = arrivalLead(root);
  const inName = animNameFor(target);
  const opts = animOptsFor(target, travel);
  if (opts.delay === undefined)
    opts.delay = lead;
  channelFor2(inName === "blocksIn" ? "blocksOut" : inName).play(target, opts);
  replayContent(target, (opts.delay ?? lead) + (reducedMotion2() ? 0 : CONTENT_LAG));
}
async function goTo(root, ctx, id) {
  const target = ctx.byId.get(id);
  if (!target) {
    console.error(`anim-canvas: goTo("${id}") - no .anim-canvas-slide with that id in this canvas`);
    return;
  }
  if (ctx.busy)
    return;
  if (target === ctx.active && !root.hasAttribute("data-overview"))
    return;
  ctx.busy = true;
  try {
    if (root.hasAttribute("data-overview")) {
      root.removeAttribute("data-overview");
      activate(root, ctx, target);
      replayContent(target, reducedMotion2() ? 0 : Math.round(panDuration(root) * 0.5));
      await panTo(root, ctx, focusView(root, ctx, target));
      return;
    }
    const from = ctx.pos.get(ctx.active) ?? { x: 0, y: 0 };
    const to = ctx.pos.get(target) ?? from;
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const travel = dx > 0 ? "east" : dx < 0 ? "west" : dy > 0 ? "south" : dy < 0 ? "north" : "east";
    settle(ctx.active);
    activate(root, ctx, target);
    const pan = panTo(root, ctx, focusView(root, ctx, target));
    arrive(root, target, travel);
    await pan;
  } finally {
    ctx.busy = false;
  }
}
function enterOverview(root, ctx) {
  if (root.hasAttribute("data-overview"))
    return;
  ctx.busy = true;
  root.setAttribute("data-overview", "");
  applySlideState(root, ctx);
  panTo(root, ctx, overviewView(root, ctx)).then(() => {
    ctx.busy = false;
  });
}
function exitOverview(root, ctx, focus) {
  if (!root.hasAttribute("data-overview"))
    return;
  ctx.busy = true;
  root.removeAttribute("data-overview");
  if (focus && ctx.byId.get(focus.id) === focus) {
    activate(root, ctx, focus);
    replayContent(focus, reducedMotion2() ? 0 : Math.round(panDuration(root) * 0.5));
  } else
    applySlideState(root, ctx);
  panTo(root, ctx, focusView(root, ctx, ctx.active)).then(() => {
    ctx.busy = false;
  });
}
function toggleOverview(root, ctx) {
  if (root.hasAttribute("data-overview"))
    exitOverview(root, ctx);
  else
    enterOverview(root, ctx);
}
function triggerStateChange3(root, stateName, config = {}) {
  if (!animCanvasStates.includes(stateName)) {
    throw new Error(`anim-canvas: unknown state "${stateName}" (supported: ${animCanvasStates.join(", ")})`);
  }
  const ctx = root._animCanvas;
  if (!ctx)
    return;
  if (stateName === "overview") {
    if (config.value === false)
      exitOverview(root, ctx);
    else
      enterOverview(root, ctx);
    return;
  }
  if (typeof config.slide === "string")
    goTo(root, ctx, config.slide);
  else if (root.hasAttribute("data-overview"))
    exitOverview(root, ctx);
  else
    panTo(root, ctx, focusView(root, ctx, ctx.active));
}
var animCanvasApi = {
  setState(root, stateName, config = {}) {
    triggerStateChange3(root, stateName, config);
    root.dataset.stateName = stateName;
    root._stateConfig = config;
  },
  getState(root) {
    const ctx = root._animCanvas;
    return {
      name: root.dataset.stateName || "default",
      config: {
        ...root._stateConfig,
        slide: ctx?.active.id,
        overview: root.hasAttribute("data-overview")
      }
    };
  }
};
df$3.animCanvasApi = animCanvasApi;
df$3.animCanvasStates = animCanvasStates;
function pickCanvas(target) {
  const focused = target instanceof HTMLElement ? target.closest(".anim-canvas") : null;
  if (focused)
    return focused;
  const all = Array.from(document.querySelectorAll(".anim-canvas"));
  return all.find((r) => {
    const b = r.getBoundingClientRect();
    return b.bottom > 0 && b.top < globalThis.innerHeight && b.right > 0 && b.left < globalThis.innerWidth;
  }) ?? all[0] ?? null;
}
var keysBound = false;
function bindKeys() {
  if (keysBound)
    return;
  keysBound = true;
  bindGlobalKeys((e) => {
    const key = e.key;
    const dir = key === "ArrowRight" ? "east" : key === "ArrowLeft" ? "west" : key === "ArrowDown" ? "south" : key === "ArrowUp" ? "north" : null;
    const toggle = key === "o" || key === "O" || key === "Escape";
    if (!dir && !toggle)
      return;
    const root = pickCanvas(e.target);
    const ctx = root?._animCanvas;
    if (!root || !ctx)
      return;
    if (dir && !ctx.active.dataset[dir])
      return;
    e.preventDefault();
    if (dir)
      goTo(root, ctx, ctx.active.dataset[dir]);
    else
      toggleOverview(root, ctx);
    return true;
  });
}
function init3() {
  document.querySelectorAll(".anim-canvas:not([data-init])").forEach((root) => {
    root.dataset.init = "";
    root.api = {
      setState: (stateName, config) => animCanvasApi.setState(root, stateName, config),
      getState: () => animCanvasApi.getState(root)
    };
    let board = root.querySelector(":scope > .anim-canvas-board");
    if (!board) {
      board = document.createElement("div");
      board.className = "anim-canvas-board";
      for (const slide of Array.from(root.querySelectorAll(":scope > .anim-canvas-slide"))) {
        dfDollar(board).append(slide);
      }
      root.prepend(board);
    }
    const slides = dfDollar(board).find(".anim-canvas-slide");
    if (slides.length === 0)
      return;
    const cs = getComputedStyle(root);
    const w = parseFloat(cs.getPropertyValue("--anim-canvas-width")) || 1280;
    const h = parseFloat(cs.getPropertyValue("--anim-canvas-height")) || 720;
    const gapRaw = parseFloat(cs.getPropertyValue("--anim-canvas-gap"));
    const gap = Number.isFinite(gapRaw) && gapRaw >= 0 ? gapRaw : 80;
    const byId = new Map;
    for (const s of slides) {
      if (!s.id) {
        console.error("anim-canvas: every .anim-canvas-slide needs an id - the data-east/west/north/south relation map references slides by id");
        continue;
      }
      byId.set(s.id, s);
    }
    const start = slides.find((s) => s.hasAttribute("data-active")) ?? slides[0];
    const pos = new Map([[start, { x: 0, y: 0 }]]);
    const queue = [start];
    for (let qi = 0;qi < queue.length; qi++) {
      const cur = queue[qi];
      const p = pos.get(cur);
      for (const dir of Object.keys(DIRS)) {
        const ref = cur.dataset[dir];
        if (!ref)
          continue;
        const neighbor = byId.get(ref);
        if (!neighbor) {
          console.error(`anim-canvas: #${cur.id || "(unnamed)"} declares data-${dir}="${ref}" but no .anim-canvas-slide with id="${ref}" exists in this canvas - dangling id ref`);
          continue;
        }
        const np = { x: p.x + DIRS[dir][0], y: p.y + DIRS[dir][1] };
        const existing2 = pos.get(neighbor);
        if (existing2) {
          if (existing2.x !== np.x || existing2.y !== np.y) {
            console.error(`anim-canvas: conflicting position for #${ref} - reached as (${np.x},${np.y}) from #${cur.id}, already placed at (${existing2.x},${existing2.y}); the relation map must be consistent`);
          }
          continue;
        }
        pos.set(neighbor, np);
        queue.push(neighbor);
      }
    }
    const unreachable = slides.filter((s) => !pos.has(s));
    if (unreachable.length) {
      console.error(`anim-canvas: ${unreachable.map((s) => `#${s.id || "(unnamed)"}`).join(", ")} unreachable from #${start.id || "(the first slide)"} - wire them into the data-east/west/north/south relation map`);
      let fx = Math.max(...Array.from(pos.values()).map((p) => p.x)) + 1;
      for (const s of unreachable)
        pos.set(s, { x: fx++, y: 0 });
    }
    const taken = new Map;
    for (const [s, p] of pos) {
      const k = `${p.x},${p.y}`;
      const other = taken.get(k);
      if (other) {
        console.error(`anim-canvas: #${s.id || "(unnamed)"} and #${other.id || "(unnamed)"} both land on board cell (${k}) - the relation map must give every slide its own cell`);
      } else
        taken.set(k, s);
    }
    for (const [s, p] of pos) {
      s.style.left = `${p.x * (w + gap)}px`;
      s.style.top = `${p.y * (h + gap)}px`;
      s.style.width = `${w}px`;
      s.style.height = `${h}px`;
    }
    for (const s of slides) {
      if (s.dataset.animIn)
        channelFor2(s.dataset.animIn);
      if (s.dataset.animOut) {
        console.warn(`anim-canvas: #${s.id || "(unnamed)"} declares data-anim-out="${s.dataset.animOut}" - ignored: only the ARRIVING slide animates (declare its data-anim-in)`);
      }
    }
    const ctx = { board, slides, byId, pos, w, h, gap, active: start, busy: false, view: null, pan: null };
    root._animCanvas = ctx;
    root.addEventListener("click", (e) => {
      const c = root._animCanvas;
      if (!c)
        return;
      const t = e.target;
      const control = t?.closest?.("[data-anim-canvas-go]");
      if (control && root.contains(control)) {
        const dir = control.getAttribute("data-anim-canvas-go");
        if (dir === "overview")
          toggleOverview(root, c);
        else {
          const id = c.active.dataset[dir];
          if (id)
            goTo(root, c, id);
        }
        return;
      }
      if (!root.hasAttribute("data-overview"))
        return;
      const tile = t?.closest?.(".anim-canvas-slide");
      if (tile && c.slides.includes(tile))
        exitOverview(root, c, tile);
    });
    const frame = () => {
      const c = root._animCanvas;
      if (!c)
        return;
      panTo(root, c, root.hasAttribute("data-overview") ? overviewView(root, c) : focusView(root, c, c.active), false);
    };
    new ResizeObserver(frame).observe(root);
    activate(root, ctx, start);
    frame();
    start.querySelectorAll("[data-count]").forEach((el) => {
      animateCount(el);
    });
  });
}
bindKeys();
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// src/components/avatar/avatar.ts
var df$4 = defussGlobals();
var avatarStates = ["default", "error"];
function triggerStateChange4(wrapper, stateName, _config) {
  const img = wrapper.querySelector(".avatar-image");
  if (!img)
    return;
  switch (stateName) {
    case "default":
      img.removeAttribute("data-error");
      img.style.display = "";
      break;
    case "error":
      img.setAttribute("data-error", "");
      img.style.display = "none";
      break;
  }
}
var avatarApi = {
  setState(wrapper, stateName, config = {}) {
    if (!avatarStates.includes(stateName)) {
      throw new Error(`avatar: unknown state "${stateName}" (supported: ${avatarStates.join(", ")})`);
    }
    triggerStateChange4(wrapper, stateName, config);
    wrapper.dataset.stateName = stateName;
    wrapper._stateConfig = config;
  },
  getState(wrapper) {
    const img = wrapper.querySelector(".avatar-image");
    const errored = img ? img.hasAttribute("data-error") : true;
    return {
      name: errored ? "error" : "default",
      config: wrapper._stateConfig ?? {}
    };
  }
};
df$4.avatarApi = avatarApi;
df$4.avatarStates = avatarStates;
function init4() {
  document.querySelectorAll(".avatar:not([data-init])").forEach((wrapper) => {
    wrapper.dataset.init = "";
    wrapper.api = {
      setState: (stateName, config) => avatarApi.setState(wrapper, stateName, config),
      getState: () => avatarApi.getState(wrapper)
    };
    const img = wrapper.querySelector(".avatar-image");
    if (!img)
      return;
    img.dataset.init = "";
    if (img.complete && img.naturalWidth === 0)
      applyError();
    img.addEventListener("error", applyError);
    function applyError() {
      img.setAttribute("data-error", "");
      img.style.display = "none";
      wrapper.dataset.stateName = "error";
    }
  });
}
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// src/components/calendar/calendar.ts
var df$5 = defussGlobals();
var dfDollar2 = defussQuery();
var calSeq = 0;
var calendarStates = ["default"];
function triggerStateChange5(cal, stateName, config) {
  const state = cal._calState;
  if (!state || stateName !== "default")
    return;
  const owner = rangeOwnerOf(cal);
  if (owner && (("start" in (config ?? {})) || ("end" in (config ?? {})))) {
    const r = rangeState(owner);
    const iso = (v) => typeof v === "string" && ISO_DAY.test(v) ? v : null;
    r.start = iso(config.start);
    r.end = r.start ? iso(config.end) : null;
    if (r.end && r.end < r.start)
      r.end = null;
    r.hover = null;
    if (r.start) {
      const [y, m] = r.start.split("-").map(Number);
      r.year = y;
      r.month = m - 1;
    }
    syncRange(owner);
    return;
  }
  const now = new Date;
  if (typeof config?.minDate === "string")
    state.minDate = config.minDate || null;
  if (typeof config?.maxDate === "string")
    state.maxDate = config.maxDate || null;
  if (typeof config?.date === "string" && /^\d{4}(-\d{2}(-\d{2})?)?$/.test(config.date)) {
    const [y, m, d] = config.date.split("-").map(Number);
    state.year = y;
    state.month = (m ?? now.getMonth() + 1) - 1;
    state.selected = d ?? null;
  } else {
    state.year = config?.year ?? now.getFullYear();
    state.month = config?.month ?? now.getMonth();
    state.selected = config?.day ?? null;
  }
  renderCalendar(cal, state.year, state.month, state.selected);
}
var isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
var calendarApi = {
  setState(cal, stateName, config = {}) {
    if (!calendarStates.includes(stateName)) {
      throw new Error(`calendar: unknown state "${stateName}" (supported: ${calendarStates.join(", ")})`);
    }
    triggerStateChange5(cal, stateName, config);
    cal.dataset.stateName = stateName;
    cal._stateConfig = config;
  },
  setDays(cal, days, options = {}) {
    const holder = dayHolderOf(cal);
    holder._calDays = options.merge ? { ...holder._calDays, ...days } : { ...days };
    rerender(cal);
  },
  getState(cal) {
    const state = cal._calState ?? {};
    return {
      name: cal.dataset.stateName || "default",
      config: {
        ...cal._stateConfig,
        year: state.year,
        month: state.month,
        selected: state.selected,
        minDate: state.minDate ?? null,
        maxDate: state.maxDate ?? null,
        view: cal.dataset.view || "days",
        ...rangeOwnerOf(cal) ? { rangeStart: rangeState(rangeOwnerOf(cal)).start, rangeEnd: rangeState(rangeOwnerOf(cal)).end } : {}
      }
    };
  }
};
df$5.calendarApi = calendarApi;
df$5.calendarStates = calendarStates;
var DAYS = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(2024, 0, i)));
var MONTHS = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2024, i, 1)));
var daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
var firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
var isToday = (year, month, day) => {
  const now = new Date;
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
};
var isoInRange = (iso, min, max) => (!min || iso >= min) && (!max || iso <= max);
var ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
function rangeOwnerOf(cal) {
  return cal.closest(".calendar-range") ?? (cal.dataset.mode === "range" ? cal : null);
}
function calendarsOf(owner) {
  if (!owner.classList.contains("calendar-range"))
    return [owner];
  return Array.from(owner.querySelectorAll(".calendar")).filter((c) => c.closest(".calendar-range") === owner);
}
function rangeState(owner) {
  if (owner._range)
    return owner._range;
  const start = ISO_DAY.test(owner.dataset.rangeStart ?? "") ? owner.dataset.rangeStart : null;
  let end = ISO_DAY.test(owner.dataset.rangeEnd ?? "") ? owner.dataset.rangeEnd : null;
  if (end && (!start || end < start))
    end = null;
  const anchor = start ?? (/^\d{4}-\d{2}/.test(owner.dataset.currentDate ?? "") ? owner.dataset.currentDate : isoDate(new Date));
  const [y, m] = anchor.split("-").map(Number);
  owner._range = { start, end, hover: null, year: y, month: m - 1 };
  return owner._range;
}
var monthAt = (year, month, index) => {
  const d = new Date(year, month + index, 1);
  return { year: d.getFullYear(), month: d.getMonth() };
};
var isoToDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
};
function renderRange(owner) {
  const r = rangeState(owner);
  calendarsOf(owner).forEach((cal, i) => {
    const state = cal._calState;
    if (!state)
      return;
    const { year, month } = monthAt(r.year, r.month, i);
    state.year = year;
    state.month = month;
    state.selected = null;
    renderCalendar(cal, year, month, null);
  });
}
function syncRange(owner) {
  const r = rangeState(owner);
  for (const [key, value] of [["rangeStart", r.start], ["rangeEnd", r.end]]) {
    if (value)
      owner.dataset[key] = value;
    else
      delete owner.dataset[key];
  }
  owner.querySelectorAll("input[data-range-input]").forEach((input) => {
    const value = (input.dataset.rangeInput === "end" ? r.end : r.start) ?? "";
    if (input.value === value)
      return;
    input.value = value;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  renderRange(owner);
}
var esc = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var MARK = /^[a-z][a-z0-9-]*$/;
var FULL_DATE = new Intl.DateTimeFormat(undefined, { dateStyle: "full" });
function dayHolderOf(cal) {
  const owner = rangeOwnerOf(cal);
  return owner && owner.classList.contains("calendar-range") ? owner : cal;
}
function daysOf(cal) {
  const holder = dayHolderOf(cal);
  if (holder._calDays)
    return holder._calDays;
  const script = Array.from(holder.querySelectorAll("script.calendar-days")).find((el) => el.parentElement === holder);
  let days = {};
  if (script) {
    try {
      days = JSON.parse(script.textContent || "{}") ?? {};
    } catch {
      days = {};
    }
  }
  holder._calDays = days;
  return days;
}
function rerender(cal) {
  const owner = rangeOwnerOf(cal);
  if (owner)
    renderRange(owner);
  else {
    const st = cal._calState;
    if (st)
      renderCalendar(cal, st.year, st.month, st.selected);
  }
}
function dayData(days, iso) {
  const d = days?.[iso];
  if (!d || typeof d !== "object")
    return { attrs: "", note: "", aria: "", blocked: false };
  let attrs = "";
  if (typeof d.mark === "string" && MARK.test(d.mark))
    attrs += ` data-mark="${d.mark}"`;
  const note = d.note != null && d.note !== "" ? String(d.note) : "";
  if (note)
    attrs += " data-note";
  if (d.label)
    attrs += ` title="${esc(d.label)}"`;
  const aria = ` aria-label="${esc([FULL_DATE.format(isoToDate(iso)), d.label, note].filter(Boolean).join(", "))}"`;
  return { attrs, note: note ? `<span class="calendar-day-note">${esc(note)}</span>` : "", aria, blocked: d.disabled === true };
}
var YEARS_PER_PAGE = 12;
var pageStart = (year) => year - (year % YEARS_PER_PAGE + YEARS_PER_PAGE) % YEARS_PER_PAGE;
var pad2 = (n) => String(n).padStart(2, "0");
var monthOff = (y, m, min, max) => !isoInRange(`${y}-${pad2(m + 1)}-${pad2(daysInMonth(y, m))}`, min, null) || !isoInRange(`${y}-${pad2(m + 1)}-01`, null, max);
var yearOff = (y, min, max) => !isoInRange(`${y}-12-31`, min, null) || !isoInRange(`${y}-01-01`, null, max);
function renderPicker(el) {
  const st = el._calState;
  const panel = el.querySelector(".calendar-picker");
  if (!st || !panel)
    return;
  const now = new Date;
  let html = "";
  if (el.dataset.view === "months") {
    const y = st.pickYear;
    html = MONTHS.map((name, m) => {
      const current = y === st.year && m === st.month ? ' aria-current="true"' : "";
      const today = y === now.getFullYear() && m === now.getMonth() ? " data-today" : "";
      const off = monthOff(y, m, st.minDate, st.maxDate) ? " disabled" : "";
      return `<button type="button" class="calendar-pick" data-month="${m}" id="${el.dataset.calId}-m${m}"${current}${today}${off}>${esc(name.slice(0, 3))}</button>`;
    }).join("");
  } else {
    const start = st.pickPage;
    for (let y = start;y < start + YEARS_PER_PAGE; y++) {
      const current = y === st.year ? ' aria-current="true"' : "";
      const today = y === now.getFullYear() ? " data-today" : "";
      const off = yearOff(y, st.minDate, st.maxDate) ? " disabled" : "";
      html += `<button type="button" class="calendar-pick" data-year="${y}" id="${el.dataset.calId}-y${y}"${current}${today}${off}>${y}</button>`;
    }
  }
  dfDollar2(panel).morph(html);
}
function renderHeader(el) {
  const st = el._calState;
  if (!st)
    return;
  const view = el.dataset.view || "days";
  const heading = el.querySelector(".calendar-heading");
  if (heading) {
    const text = view === "months" ? String(st.pickYear) : view === "years" ? `${st.pickPage} – ${st.pickPage + YEARS_PER_PAGE - 1}` : `${MONTHS[st.month]} ${st.year}`;
    dfDollar2(heading).text(text);
    if (heading.tagName === "BUTTON") {
      dfDollar2(heading).attr("aria-label", view === "months" ? `${text}, choose a year` : view === "years" ? `Years ${text}, back to the days` : `${text}, choose a month and year`);
      dfDollar2(heading).attr("aria-expanded", String(view !== "days"));
    }
  }
  const labels = view === "months" ? ["Previous year", "Next year"] : view === "years" ? ["Previous years", "Next years"] : ["Previous month", "Next month"];
  dfDollar2(el).find('.calendar-nav[data-action="prev-month"]').attr("aria-label", labels[0]);
  dfDollar2(el).find('.calendar-nav[data-action="next-month"]').attr("aria-label", labels[1]);
  const monthSel = el.querySelector('.calendar-select[data-part="month"]');
  const yearSel = el.querySelector('.calendar-select[data-part="year"]');
  if (yearSel) {
    if (!Array.from(yearSel.options).some((o) => Number(o.value) === st.year))
      fillYears(el, yearSel);
    yearSel.value = String(st.year);
  }
  if (monthSel) {
    Array.from(monthSel.options).forEach((o, m) => {
      o.disabled = monthOff(st.year, m, st.minDate, st.maxDate);
    });
    monthSel.value = String(st.month);
  }
}
function fillYears(el, select) {
  const st = el._calState;
  const now = new Date().getFullYear();
  const bound = (attr, date, fallback) => {
    const v = Number(el.dataset[attr]);
    if (Number.isInteger(v) && v > 0)
      return v;
    const fromDate = date ? Number(String(date).slice(0, 4)) : NaN;
    return Number.isInteger(fromDate) ? fromDate : fallback;
  };
  let from = bound("yearFrom", st.minDate, now - 100);
  let to = bound("yearTo", st.maxDate, now + 10);
  from = Math.min(from, st.year);
  to = Math.max(to, st.year);
  let html = "";
  for (let y = to;y >= from; y--)
    html += `<option value="${y}">${y}</option>`;
  dfDollar2(select).html(html);
}
function jumpTo(el, year, month) {
  const st = el._calState;
  const owner = rangeOwnerOf(el);
  if (owner) {
    const rs = rangeState(owner);
    const first = monthAt(year, month, -calendarsOf(owner).indexOf(el));
    rs.year = first.year;
    rs.month = first.month;
    renderRange(owner);
    return;
  }
  st.year = year;
  st.month = month;
  st.selected = null;
  renderCalendar(el, year, month, null);
}
function setView(el, view) {
  const st = el._calState;
  const grid = el.querySelector(".calendar-grid");
  const panel = el.querySelector(".calendar-picker");
  if (!st || !panel)
    return;
  if (view !== "days" && (el.dataset.view || "days") === "days" && grid) {
    dfDollar2(panel).css("minHeight", `${grid.offsetHeight}px`).css("width", `${grid.offsetWidth}px`);
  }
  if (view === "months" && st.pickYear == null)
    st.pickYear = st.year;
  if (view === "years")
    st.pickPage = pageStart(st.pickYear ?? st.year);
  if (view === "days") {
    delete el.dataset.view;
    st.pickYear = null;
  } else
    el.dataset.view = view;
  if (view !== "days")
    renderPicker(el);
  renderHeader(el);
  if (view === "days") {
    const pick = el.querySelector(".calendar-day[data-selected] button") ?? el.querySelector(".calendar-day[data-today]:not([data-outside]) button") ?? el.querySelector(".calendar-day:not([data-outside]):not([data-disabled]) button");
    pick?.focus();
  } else {
    const pick = panel.querySelector(".calendar-pick[aria-current]:not([disabled])") ?? panel.querySelector(".calendar-pick:not([disabled])");
    pick?.focus();
  }
  el.dispatchEvent(new CustomEvent("calendar:view", { bubbles: true, detail: { view, year: st.year, month: st.month } }));
}
var renderGrid = (year, month, selectedDay, calId, minDate, maxDate, range, days) => {
  const rangeAttrs = (iso) => {
    if (!range || !range.start)
      return "";
    const end = range.end ?? range.preview;
    let a = "";
    const span = end && end !== range.start ? " data-range-span" : "";
    if (iso === range.start)
      a += ' data-range-start aria-selected="true"' + span;
    if (range.end && iso === range.end && iso !== range.start)
      a += ' data-range-end aria-selected="true"' + span;
    else if (range.end && iso === range.end)
      a += " data-range-end";
    else if (!range.end && end && iso === end && iso !== range.start)
      a += " data-range-end data-range-preview" + span;
    if (end && iso > range.start && iso < end)
      a += range.end ? ' data-in-range aria-selected="true"' : " data-in-range data-range-preview";
    return a;
  };
  const total = daysInMonth(year, month);
  const startDay = firstDayOfMonth(year, month);
  const prevTotal = daysInMonth(year, month - 1);
  let html = "<thead><tr>";
  for (let d = 0;d < 7; d++) {
    html += `<th class="calendar-day-label" scope="col">${DAYS[d]}</th>`;
  }
  html += "</tr></thead><tbody>";
  let dayNum = 1;
  let nextDayNum = 1;
  const rows = Math.ceil((startDay + total) / 7);
  for (let r = 0;r < rows; r++) {
    html += "<tr>";
    for (let c = 0;c < 7; c++) {
      const cellIndex = r * 7 + c;
      if (cellIndex < startDay) {
        const prevDay = prevTotal - startDay + cellIndex + 1;
        const iso = isoDate(new Date(year, month - 1, prevDay));
        const dd = dayData(days, iso);
        const off = !isoInRange(iso, minDate, maxDate) || dd.blocked ? " data-disabled" : "";
        html += `<td class="calendar-day" data-outside${off}${dd.attrs} id="${calId}-${iso}" data-cal-date="${iso}"><button tabindex="-1" data-day="${prevDay}" data-outside="prev"${dd.aria}>${prevDay}${dd.note}</button></td>`;
      } else if (dayNum > total) {
        const iso = isoDate(new Date(year, month + 1, nextDayNum));
        const dd = dayData(days, iso);
        const off = !isoInRange(iso, minDate, maxDate) || dd.blocked ? " data-disabled" : "";
        html += `<td class="calendar-day" data-outside${off}${dd.attrs} id="${calId}-${iso}" data-cal-date="${iso}"><button tabindex="-1" data-day="${nextDayNum}" data-outside="next"${dd.aria}>${nextDayNum}${dd.note}</button></td>`;
        nextDayNum++;
      } else {
        let attrs = "";
        if (isToday(year, month, dayNum))
          attrs += " data-today";
        if (dayNum === selectedDay)
          attrs += ' data-selected aria-selected="true"';
        const iso = isoDate(new Date(year, month, dayNum));
        const dd = dayData(days, iso);
        if (!isoInRange(iso, minDate, maxDate) || dd.blocked)
          attrs += " data-disabled";
        attrs += rangeAttrs(iso) + dd.attrs;
        html += `<td class="calendar-day"${attrs} id="${calId}-${iso}" data-cal-date="${iso}"><button data-day="${dayNum}"${dd.aria}>${dayNum}${dd.note}</button></td>`;
        dayNum++;
      }
    }
    html += "</tr>";
  }
  html += "</tbody>";
  return html;
};
var renderCalendar = (el, year, month, selectedDay) => {
  const grid = el.querySelector(".calendar-grid");
  if (!grid)
    return;
  const st = el._calState ?? {};
  if (el.dataset.view && (st.year !== year || st.month !== month))
    delete el.dataset.view;
  if (st.year !== undefined) {
    st.year = year;
    st.month = month;
  }
  renderHeader(el);
  el.dataset.currentDate = selectedDay ? isoDate(new Date(year, month, selectedDay)) : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  if (st.minDate)
    el.dataset.minDate = st.minDate;
  else
    el.removeAttribute("data-min-date");
  if (st.maxDate)
    el.dataset.maxDate = st.maxDate;
  else
    el.removeAttribute("data-max-date");
  const active2 = el.ownerDocument.activeElement;
  const focusKey = active2 && el.contains(active2) ? active2.closest(".calendar-day")?.getAttribute("data-cal-date") : null;
  const owner = rangeOwnerOf(el);
  const r = owner ? rangeState(owner) : null;
  const range = r ? { start: r.start, end: r.end, preview: !r.end && r.start && r.hover && r.hover >= r.start ? r.hover : null } : null;
  const days = daysOf(el);
  el.toggleAttribute("data-notes", Object.values(days).some((d) => d && d.note != null && d.note !== ""));
  dfDollar2(grid).morph(renderGrid(year, month, selectedDay, el.dataset.calId || "", st.minDate, st.maxDate, range, days));
  if (focusKey)
    grid.querySelector(`[data-cal-date="${focusKey}"] button`)?.focus();
  const selDate = el.querySelector(".calendar-day[data-selected]")?.getAttribute("data-cal-date");
  if (selDate)
    grid.setAttribute("data-selected-date", selDate);
  else
    grid.removeAttribute("data-selected-date");
  const viewKey = `${year}-${month}`;
  if (el._viewKey !== viewKey) {
    el._viewKey = viewKey;
    el.dispatchEvent(new CustomEvent("calendar:view", { bubbles: true, detail: { view: "days", year, month } }));
  }
};
function init5() {
  document.querySelectorAll(".calendar:not([data-init])").forEach((cal) => {
    cal.dataset.init = "";
    cal.dataset.calId = cal.id || `dfsc-${++calSeq}`;
    const now = new Date;
    const state = cal._calState = {
      year: now.getFullYear(),
      month: now.getMonth(),
      selected: null,
      minDate: cal.dataset.minDate || null,
      maxDate: cal.dataset.maxDate || null
    };
    if (/^\d{4}(-\d{2}(-\d{2})?)?$/.test(cal.dataset.currentDate ?? "")) {
      const [y, m, d] = cal.dataset.currentDate.split("-").map(Number);
      state.year = y;
      state.month = (m ?? now.getMonth() + 1) - 1;
      state.selected = d ?? null;
    }
    cal.api = {
      setState: (stateName, config) => calendarApi.setState(cal, stateName, config),
      getState: () => calendarApi.getState(cal),
      setDays: (days, options) => calendarApi.setDays(cal, days, options)
    };
    const header = cal.querySelector(".calendar-header");
    let heading = cal.querySelector(".calendar-heading");
    if (cal.dataset.caption === "dropdown" && header) {
      if (heading)
        dfDollar2(heading).attr("hidden", "");
      const caption = document.createElement("span");
      caption.className = "calendar-caption";
      dfDollar2(caption).html(`<select class="calendar-select" data-part="month" aria-label="Month">${MONTHS.map((n, m) => `<option value="${m}">${esc(n)}</option>`).join("")}</select>` + `<select class="calendar-select" data-part="year" aria-label="Year"></select>`);
      if (heading)
        dfDollar2(heading).after(caption);
      else
        dfDollar2(header).append(caption);
      fillYears(cal, caption.querySelector('[data-part="year"]'));
      caption.addEventListener("change", (e) => {
        const sel = e.target;
        const m = Number(caption.querySelector('[data-part="month"]').value);
        const y = Number(caption.querySelector('[data-part="year"]').value);
        jumpTo(cal, y, m);
        sel.focus();
      });
    } else if (heading && heading.tagName !== "BUTTON") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = heading.className;
      button.setAttribute("aria-live", heading.getAttribute("aria-live") || "polite");
      dfDollar2(heading).replaceWith(button);
      heading = button;
    }
    if (heading && heading.tagName === "BUTTON") {
      dfDollar2(heading).attr("aria-haspopup", "grid");
      if (!cal.querySelector(".calendar-picker")) {
        const panel = document.createElement("div");
        panel.className = "calendar-picker";
        panel.setAttribute("role", "group");
        const grid = cal.querySelector(".calendar-grid");
        if (grid)
          dfDollar2(grid).after(panel);
        else
          dfDollar2(cal).append(panel);
      }
      heading.addEventListener("click", () => {
        const view = cal.dataset.view || "days";
        setView(cal, view === "days" ? "months" : view === "months" ? "years" : "days");
      });
    }
    const owner = rangeOwnerOf(cal);
    if (owner) {
      const r = rangeState(owner);
      const { year, month } = monthAt(r.year, r.month, calendarsOf(owner).indexOf(cal));
      state.year = year;
      state.month = month;
      state.selected = null;
      syncRange(owner);
      if (!owner._rangeWired) {
        owner._rangeWired = true;
        owner.addEventListener("mouseleave", () => {
          const rs = rangeState(owner);
          if (!rs.hover)
            return;
          rs.hover = null;
          renderRange(owner);
        });
      }
    } else {
      renderCalendar(cal, state.year, state.month, state.selected);
    }
    const preview = (e) => {
      const o = rangeOwnerOf(cal);
      if (!o)
        return;
      const rs = rangeState(o);
      if (!rs.start || rs.end)
        return;
      const cell = e.target.closest?.(".calendar-day:not([data-outside]):not([data-disabled])");
      const iso = cell?.getAttribute("data-cal-date") ?? null;
      if (!iso || iso === rs.hover)
        return;
      rs.hover = iso;
      renderRange(o);
    };
    cal.addEventListener("mouseover", preview);
    cal.addEventListener("focusin", preview);
    cal.addEventListener("click", (e) => {
      const nav = e.target.closest(".calendar-nav");
      const view = cal.dataset.view;
      if (view && nav) {
        const dir = nav.dataset.action === "prev-month" ? -1 : 1;
        if (view === "months")
          state.pickYear += dir;
        else
          state.pickPage += dir * YEARS_PER_PAGE;
        renderPicker(cal);
        renderHeader(cal);
        return;
      }
      const pick = e.target.closest(".calendar-pick");
      if (pick && !pick.disabled) {
        if (pick.dataset.year !== undefined) {
          state.pickYear = Number(pick.dataset.year);
          setView(cal, "months");
        } else {
          jumpTo(cal, state.pickYear, Number(pick.dataset.month));
          setView(cal, "days");
        }
        return;
      }
      const rangeOwner = rangeOwnerOf(cal);
      if (nav && rangeOwner) {
        const rs = rangeState(rangeOwner);
        const { year, month } = monthAt(rs.year, rs.month, nav.dataset.action === "prev-month" ? -1 : 1);
        rs.year = year;
        rs.month = month;
        renderRange(rangeOwner);
        return;
      }
      const rangeBtn = rangeOwner && e.target.closest(".calendar-day button");
      if (rangeBtn) {
        const cell = rangeBtn.closest(".calendar-day");
        if (cell.hasAttribute("data-outside") || cell.hasAttribute("data-disabled"))
          return;
        const iso = cell.getAttribute("data-cal-date");
        const rs = rangeState(rangeOwner);
        if (!rs.start || rs.end || iso < rs.start) {
          rs.start = iso;
          rs.end = null;
        } else {
          rs.end = iso;
        }
        rs.hover = null;
        syncRange(rangeOwner);
        rangeOwner.dispatchEvent(new CustomEvent("calendar:range", {
          detail: {
            start: rs.start ? isoToDate(rs.start) : null,
            end: rs.end ? isoToDate(rs.end) : null,
            startIso: rs.start,
            endIso: rs.end
          },
          bubbles: true
        }));
        return;
      }
      if (nav) {
        const action = nav.dataset.action;
        if (action === "prev-month") {
          state.month--;
          if (state.month < 0) {
            state.month = 11;
            state.year--;
          }
          state.selected = null;
        } else if (action === "next-month") {
          state.month++;
          if (state.month > 11) {
            state.month = 0;
            state.year++;
          }
          state.selected = null;
        }
        renderCalendar(cal, state.year, state.month, state.selected);
        return;
      }
      const dayBtn = e.target.closest(".calendar-day button");
      if (dayBtn && !dayBtn.closest("[data-disabled]")) {
        const day = parseInt(dayBtn.dataset.day, 10);
        const outside = dayBtn.dataset.outside;
        if (outside === "prev") {
          state.month--;
          if (state.month < 0) {
            state.month = 11;
            state.year--;
          }
          state.selected = day;
        } else if (outside === "next") {
          state.month++;
          if (state.month > 11) {
            state.month = 0;
            state.year++;
          }
          state.selected = day;
        } else {
          state.selected = day;
        }
        renderCalendar(cal, state.year, state.month, state.selected);
        cal.dispatchEvent(new CustomEvent("calendar:select", {
          detail: { date: new Date(state.year, state.month, state.selected) },
          bubbles: true
        }));
      }
    });
    cal.addEventListener("keydown", (e) => {
      if (cal.dataset.view) {
        if (e.key === "Escape") {
          e.preventDefault();
          setView(cal, "days");
          return;
        }
        const pickBtn = e.target.closest(".calendar-pick");
        const step2 = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 }[e.key];
        if (pickBtn && step2) {
          e.preventDefault();
          const picks = Array.from(cal.querySelectorAll(".calendar-pick"));
          picks[picks.indexOf(pickBtn) + step2]?.focus();
        }
        return;
      }
      const dayBtn = e.target.closest(".calendar-day button");
      if (!dayBtn)
        return;
      const keyOwner = rangeOwnerOf(cal);
      const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 7, ArrowUp: -7 }[e.key];
      if (keyOwner && step) {
        e.preventDefault();
        const from = isoToDate(dayBtn.closest(".calendar-day").getAttribute("data-cal-date"));
        from.setDate(from.getDate() + step);
        const target = keyOwner.querySelector(`.calendar-day:not([data-outside])[data-cal-date="${isoDate(from)}"] button`);
        target?.focus();
        return;
      }
      const allBtns = Array.from(cal.querySelectorAll(".calendar-day button"));
      const idx = allBtns.indexOf(dayBtn);
      let next = null;
      switch (e.key) {
        case "ArrowRight":
          e.preventDefault();
          next = allBtns[idx + 1];
          break;
        case "ArrowLeft":
          e.preventDefault();
          next = allBtns[idx - 1];
          break;
        case "ArrowDown":
          e.preventDefault();
          next = allBtns[idx + 7];
          break;
        case "ArrowUp":
          e.preventDefault();
          next = allBtns[idx - 7];
          break;
      }
      if (next)
        next.focus();
    });
  });
}
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// src/components/carousel/carousel.ts
var df$6 = defussGlobals();
var dfDollar3 = defussQuery();
var carSeq = 0;
var carouselStates = ["default"];
function triggerStateChange6(carousel, config) {
  const index = Number(config?.index ?? 0);
  if (typeof carousel._goTo === "function")
    carousel._goTo(index);
}
var carouselApi = {
  setState(carousel, stateName, config = {}) {
    if (!carouselStates.includes(stateName)) {
      throw new Error(`carousel: unknown state "${stateName}" (supported: ${carouselStates.join(", ")})`);
    }
    triggerStateChange6(carousel, config);
    carousel.dataset.stateName = stateName;
    carousel._stateConfig = config;
  },
  getState(carousel) {
    return {
      name: carousel.dataset.stateName || "default",
      config: { ...carousel._stateConfig, index: Number(carousel.dataset.currentIndex || 0) }
    };
  }
};
df$6.carouselApi = carouselApi;
df$6.carouselStates = carouselStates;
function init6() {
  document.querySelectorAll(".carousel:not([data-init])").forEach((carousel) => {
    carousel.dataset.init = "";
    carousel.api = {
      setState: (stateName, config) => carouselApi.setState(carousel, stateName, config),
      getState: () => carouselApi.getState(carousel)
    };
    const viewport = carousel.querySelector(".carousel-viewport");
    const prevBtn = carousel.querySelector(".carousel-prev");
    const nextBtn = carousel.querySelector(".carousel-next");
    const dotsContainer = carousel.querySelector(".carousel-dots");
    const counter = carousel.querySelector(".carousel-counter");
    if (!viewport)
      return;
    const slides = () => Array.from(viewport.querySelectorAll(".carousel-slide"));
    const isVertical = carousel.dataset.orientation === "vertical";
    const isLoop = carousel.hasAttribute("data-loop");
    const autoplayDelay = carousel.dataset.autoplay ? parseInt(carousel.dataset.autoplay, 10) : 0;
    const reducedMotion3 = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = reducedMotion3 ? "auto" : "smooth";
    let currentIndex = 0;
    let autoplayTimer = null;
    if (!carousel.hasAttribute("role"))
      carousel.setAttribute("role", "region");
    carousel.setAttribute("aria-roledescription", "carousel");
    if (!carousel.hasAttribute("aria-label"))
      carousel.setAttribute("aria-label", "Carousel");
    slides().forEach((slide, i) => {
      slide.setAttribute("role", "group");
      slide.setAttribute("aria-roledescription", "slide");
      if (!slide.hasAttribute("aria-label")) {
        slide.setAttribute("aria-label", `${i + 1} of ${slides().length}`);
      }
    });
    const scrollToIndex = (index) => {
      const allSlides = slides();
      if (!allSlides.length)
        return;
      let target = index;
      if (isLoop) {
        target = (index % allSlides.length + allSlides.length) % allSlides.length;
      } else {
        target = Math.max(0, Math.min(index, allSlides.length - 1));
      }
      const slide = allSlides[target];
      if (isVertical) {
        viewport.scrollTo({ top: slide.offsetTop - viewport.offsetTop, behavior });
      } else {
        viewport.scrollTo({ left: slide.offsetLeft - viewport.offsetLeft, behavior });
      }
    };
    const updateState = (index) => {
      const allSlides = slides();
      if (!allSlides.length)
        return;
      currentIndex = index;
      carousel.dataset.currentIndex = String(index);
      if (!isLoop) {
        if (prevBtn)
          dfDollar3(prevBtn).prop("disabled", currentIndex <= 0);
        if (nextBtn)
          dfDollar3(nextBtn).prop("disabled", currentIndex >= allSlides.length - 1);
      }
      if (dotsContainer)
        dfDollar3(dotsContainer).find(".carousel-dot").each(function(i) {
          dfDollar3(this).attr("aria-current", i === currentIndex ? "true" : "false");
        });
      if (counter)
        dfDollar3(counter).text(`Slide ${currentIndex + 1} of ${allSlides.length}`);
      allSlides.forEach((slide, i) => {
        dfDollar3(slide).attr("aria-label", `${i + 1} of ${allSlides.length}`);
      });
    };
    const observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const idx = slides().indexOf(entry.target);
          if (idx !== -1)
            updateState(idx);
        }
      }
    }, { root: viewport, threshold: 0.5 });
    slides().forEach((slide) => observer.observe(slide));
    const goNext = () => scrollToIndex(currentIndex + 1);
    const goPrev = () => scrollToIndex(currentIndex - 1);
    if (prevBtn)
      prevBtn.addEventListener("click", goPrev);
    if (nextBtn)
      nextBtn.addEventListener("click", goNext);
    carousel._goTo = scrollToIndex;
    const carId = carousel.dataset.carouselId ||= carousel.id || `dfsc-${++carSeq}`;
    let dotCount = -1;
    const renderDots = () => {
      if (!dotsContainer)
        return;
      const n = slides().length;
      if (dotCount === -1 && dotsContainer.children.length) {
        dotCount = n;
        return;
      }
      if (n === dotCount)
        return;
      dotCount = n;
      const html = Array.from({ length: n }, (_, i) => `<button id="${carId}-dot-${i}" class="carousel-dot" aria-label="Go to slide ${i + 1}" aria-current="${i === currentIndex ? "true" : "false"}"></button>`).join("");
      dfDollar3(dotsContainer).morph(html);
    };
    if (dotsContainer) {
      renderDots();
      dotsContainer.addEventListener("click", (e) => {
        const dot = e.target.closest(".carousel-dot");
        if (!dot)
          return;
        const idx = Array.from(dotsContainer.querySelectorAll(".carousel-dot")).indexOf(dot);
        if (idx !== -1)
          scrollToIndex(idx);
      });
    }
    let lastSlideCount = slides().length;
    const syncObserver = new MutationObserver(() => {
      const n = slides().length;
      if (n !== lastSlideCount) {
        lastSlideCount = n;
        renderDots();
        observer.disconnect();
        slides().forEach((slide) => observer.observe(slide));
        updateState(Math.min(currentIndex, Math.max(0, n - 1)));
      }
    });
    if (viewport)
      syncObserver.observe(viewport, { childList: true });
    carousel.addEventListener("keydown", (e) => {
      const prevKey = isVertical ? "ArrowUp" : "ArrowLeft";
      const nextKey = isVertical ? "ArrowDown" : "ArrowRight";
      if (e.key === prevKey) {
        e.preventDefault();
        goPrev();
      }
      if (e.key === nextKey) {
        e.preventDefault();
        goNext();
      }
      if (e.key === "Home") {
        e.preventDefault();
        scrollToIndex(0);
      }
      if (e.key === "End") {
        e.preventDefault();
        scrollToIndex(slides().length - 1);
      }
    });
    if (!carousel.hasAttribute("tabindex")) {
      carousel.setAttribute("tabindex", "0");
    }
    const startAutoplay = () => {
      if (!autoplayDelay)
        return;
      stopAutoplay();
      autoplayTimer = setInterval(goNext, autoplayDelay);
      viewport.setAttribute("aria-live", "off");
    };
    const stopAutoplay = () => {
      if (autoplayTimer) {
        clearInterval(autoplayTimer);
        autoplayTimer = null;
      }
      viewport.setAttribute("aria-live", "polite");
    };
    if (autoplayDelay) {
      startAutoplay();
      carousel.addEventListener("mouseenter", stopAutoplay);
      carousel.addEventListener("mouseleave", startAutoplay);
      carousel.addEventListener("focusin", stopAutoplay);
      carousel.addEventListener("focusout", startAutoplay);
    } else {
      viewport.setAttribute("aria-live", "polite");
    }
    updateState(0);
  });
}
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// src/components/chart/chart.ts
var df$7 = defussGlobals();
var chartStates = ["default"];
var ECHARTS_NOT_LOADED = 'chart: echarts is not loaded - add <script src="https://cdn.jsdelivr.net/npm/echarts@6.1.0/dist/echarts.min.js"></script> before chart.js';
function echartsRuntime() {
  const echarts = globalThis.echarts;
  if (!echarts)
    throw new Error(ECHARTS_NOT_LOADED);
  return echarts;
}
var isPlain = (v) => typeof v === "object" && v !== null && !Array.isArray(v);
function deepMerge(base, over) {
  const out = { ...base };
  for (const [key, value] of Object.entries(over)) {
    out[key] = isPlain(value) && isPlain(out[key]) ? deepMerge(out[key], value) : value;
  }
  return out;
}
var reducedMotion3 = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
var probe = null;
function rgba(css) {
  if (!css || css === "none")
    return null;
  probe ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe)
    return null;
  probe.clearRect(0, 0, 1, 1);
  probe.fillStyle = "rgba(1, 2, 3, 0.5)";
  probe.fillStyle = css;
  if (probe.fillStyle === "rgba(1, 2, 3, 0.5)")
    return null;
  probe.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}
function toRgb(css, alpha = 1) {
  const c = rgba(css);
  if (!c)
    return "";
  const a = +(c[3] * alpha).toFixed(3);
  return a >= 1 ? `rgb(${c[0]}, ${c[1]}, ${c[2]})` : `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;
}
function chartColor(el, value, alpha = 1) {
  const css = value.startsWith("--") ? getComputedStyle(el).getPropertyValue(value).trim() : value;
  return toRgb(css, alpha);
}
function surfaceOf(el) {
  for (let node = el;node; node = node.parentElement) {
    const c = rgba(getComputedStyle(node).backgroundColor);
    if (c && c[3] > 0.5)
      return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
  }
  return toRgb(getComputedStyle(document.documentElement).getPropertyValue("--background").trim()) || "#ffffff";
}
function chartTheme(el) {
  const cs = getComputedStyle(el);
  const tok = (name) => cs.getPropertyValue(name).trim();
  const fs = parseFloat(tok("--chart-font-size")) || 13;
  const k = fs / 13;
  const px = (n) => Math.round(n * k * 10) / 10;
  const fg = toRgb(cs.color) || toRgb(tok("--foreground")) || "#111111";
  const muted = toRgb(cs.color, 0.62) || fg;
  const axis = toRgb(cs.color, 0.28) || fg;
  const grid = toRgb(cs.color, 0.1) || fg;
  const surface = surfaceOf(el);
  const palette = [1, 2, 3, 4, 5].map((n) => toRgb(tok(`--chart-${n}`))).filter(Boolean);
  const font = cs.fontFamily || tok("--font-sans") || "system-ui, sans-serif";
  const label = { color: muted, fontSize: fs, fontFamily: font };
  const reduce = reducedMotion3();
  const axisBase = {
    nameTextStyle: { ...label },
    nameGap: px(14),
    axisLabel: { ...label, margin: px(10) },
    axisTick: { show: false },
    splitArea: { show: false }
  };
  return {
    ...palette.length > 0 ? { color: palette } : {},
    backgroundColor: "transparent",
    aria: { enabled: true },
    animation: !reduce,
    animationDuration: reduce ? 0 : 750,
    animationEasing: "cubicOut",
    animationDurationUpdate: reduce ? 0 : 900,
    animationEasingUpdate: "cubicInOut",
    textStyle: { fontFamily: font, color: fg, fontSize: fs },
    title: {
      textStyle: { color: fg, fontSize: px(16), fontWeight: 600, fontFamily: font },
      subtextStyle: { ...label }
    },
    grid: { left: px(8), right: px(20), top: px(40), bottom: px(14) },
    legend: {
      top: 0,
      icon: "roundRect",
      itemWidth: px(12),
      itemHeight: px(12),
      itemGap: px(18),
      textStyle: { color: muted, fontSize: fs, fontFamily: font },
      inactiveColor: grid,
      pageTextStyle: { color: muted }
    },
    tooltip: {
      ...toRgb(tok("--popover")) ? { backgroundColor: toRgb(tok("--popover")) } : {},
      borderColor: toRgb(tok("--border")) || axis,
      borderWidth: 1,
      padding: [px(8), px(12)],
      textStyle: { color: toRgb(tok("--popover-foreground")) || fg, fontSize: fs, fontFamily: font },
      extraCssText: "border-radius: var(--radius-md, 8px); box-shadow: var(--shadow-md, 0 6px 16px rgba(0,0,0,.12));",
      axisPointer: {
        lineStyle: { color: axis, width: 1 },
        crossStyle: { color: axis },
        shadowStyle: { color: toRgb(cs.color, 0.05) },
        label: { backgroundColor: fg, color: surface, fontSize: fs }
      }
    },
    categoryAxis: {
      ...axisBase,
      axisLine: { show: true, lineStyle: { color: axis, width: 1 } },
      splitLine: { show: false }
    },
    valueAxis: {
      ...axisBase,
      axisLine: { show: false },
      splitLine: { show: true, lineStyle: { color: grid, width: 1 } }
    },
    logAxis: {
      ...axisBase,
      axisLine: { show: false },
      splitLine: { show: true, lineStyle: { color: grid, width: 1 } }
    },
    timeAxis: {
      ...axisBase,
      axisLine: { show: true, lineStyle: { color: axis, width: 1 } },
      splitLine: { show: false }
    },
    bar: {
      barMaxWidth: px(56),
      itemStyle: { borderRadius: px(4) },
      label: { color: fg, fontSize: fs, fontFamily: font }
    },
    line: {
      symbol: "circle",
      symbolSize: px(7),
      lineStyle: { width: px(2.5), cap: "round", join: "round" },
      label: { color: fg, fontSize: fs, fontFamily: font, textBorderWidth: 0 },
      endLabel: { color: fg, fontSize: fs, fontFamily: font, textBorderWidth: 0 }
    },
    scatter: { symbolSize: px(12), label: { color: fg, fontSize: fs, fontFamily: font } },
    pie: {
      itemStyle: { borderColor: surface, borderWidth: px(2), borderRadius: px(4) },
      label: { color: fg, fontSize: fs, fontFamily: font },
      labelLine: { lineStyle: { color: axis } }
    },
    sunburst: { itemStyle: { borderColor: surface, borderWidth: px(1.5) }, label: { fontSize: fs } },
    treemap: {
      itemStyle: { borderColor: surface, borderWidth: px(2), gapWidth: px(2) },
      label: { fontSize: fs },
      breadcrumb: { show: false }
    },
    sankey: { label: { color: fg, fontSize: fs }, lineStyle: { opacity: 0.35 } },
    radar: { axisName: { color: muted, fontSize: fs } },
    visualMap: { textStyle: { color: muted, fontSize: fs, fontFamily: font } }
  };
}
var instances2 = new WeakMap;
var observers = new WeakMap;
var live = new Set;
function withMotion(option) {
  return reducedMotion3() ? { ...option, animation: false } : option;
}
var CSS_COLOR = /var\(--|^\s*(?:oklch|oklab|lch|lab|hwb|color-mix|color)\(/;
function resolveColors(el, value, cs) {
  if (typeof value === "string") {
    if (!CSS_COLOR.test(value))
      return value;
    const style = cs ?? getComputedStyle(el);
    const css = value.replace(/var\((--[\w-]+)\s*(?:,\s*([^()]*))?\)/g, (_m, name, fallback) => style.getPropertyValue(name).trim() || (fallback ?? "").trim());
    return toRgb(css) || value;
  }
  if (Array.isArray(value)) {
    const style = cs ?? getComputedStyle(el);
    return value.map((v) => resolveColors(el, v, style));
  }
  if (isPlain(value)) {
    const style = cs ?? getComputedStyle(el);
    const out = {};
    for (const [k, v] of Object.entries(value))
      out[k] = resolveColors(el, v, style);
    return out;
  }
  return value;
}
var journals = new WeakMap;
var JOURNAL_CAP = 64;
var isNotMerge = (arg) => arg === true || isPlain(arg) && arg.notMerge === true;
function wrapSetOption(el, inst) {
  const raw = inst.setOption.bind(inst);
  const journal = { ops: [], overflow: false };
  journals.set(el, journal);
  inst._rawSetOption = raw;
  inst.setOption = (option, arg, lazy) => {
    if (isNotMerge(arg)) {
      journal.ops = [];
      journal.overflow = false;
    }
    if (journal.ops.length < JOURNAL_CAP)
      journal.ops.push([option, arg, lazy]);
    else
      journal.overflow = true;
    raw(withMotion(resolveColors(el, option)), arg, lazy);
  };
}
function mount(el, option = {}) {
  const echarts = echartsRuntime();
  observers.get(el)?.disconnect();
  instances2.get(el)?.dispose();
  const instance = echarts.init(el, chartTheme(el), { renderer: "svg" });
  wrapSetOption(el, instance);
  instances2.set(el, instance);
  live.add(el);
  watchTheme();
  instance.setOption(option, true);
  const ro = new ResizeObserver(() => instance.resize());
  ro.observe(el);
  observers.set(el, ro);
  replayOnSlide(el);
  replayOnView(el);
  return {
    instance,
    setOption: (opt, notMerge = false) => instance.setOption(opt, notMerge),
    dispose: () => {
      viewObserver?.unobserve(el);
      ro.disconnect();
      observers.delete(el);
      instances2.delete(el);
      live.delete(el);
      instance.dispose();
    }
  };
}
function instance(el) {
  return instances2.get(el);
}
function replay(el, inst) {
  const journal = journals.get(el);
  const raw = inst._rawSetOption;
  if (!journal || !raw || journal.overflow || journal.ops.length === 0)
    return;
  const ops = journal.ops.slice();
  inst.clear?.();
  journal.ops = ops;
  journal.overflow = false;
  for (const [option, arg, lazy] of ops)
    raw(withMotion(resolveColors(el, option)), arg, lazy);
}
var viewObserver;
function replayOnView(el) {
  if (reducedMotion3() || el.closest("[data-slide]") || typeof IntersectionObserver !== "function")
    return;
  viewObserver ??= new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting)
        continue;
      const chartEl = entry.target;
      viewObserver?.unobserve(chartEl);
      const i = instances2.get(chartEl);
      if (i && chartEl.isConnected && !i.isDisposed?.())
        replay(chartEl, i);
    }
  }, { threshold: 0.3 });
  viewObserver.observe(el);
}
var slideCharts = new WeakMap;
function replayOnSlide(el) {
  if (el.classList.contains("presentation-stage"))
    return;
  const slide = el.closest("[data-slide]");
  if (!slide)
    return;
  let charts = slideCharts.get(slide);
  if (!charts) {
    charts = new Set;
    slideCharts.set(slide, charts);
    const set = charts;
    let wasActive = slide.hasAttribute("data-active");
    new MutationObserver(() => {
      const active2 = slide.hasAttribute("data-active");
      if (active2 && !wasActive) {
        for (const chartEl of set) {
          const i = instances2.get(chartEl);
          if (i && chartEl.isConnected)
            replay(chartEl, i);
        }
      }
      wasActive = active2;
    }).observe(slide, { attributes: true, attributeFilter: ["data-active"] });
  }
  charts.add(el);
}
function retheme(el, inst) {
  inst.setTheme?.(chartTheme(el));
  const journal = journals.get(el);
  const raw = inst._rawSetOption;
  if (!journal || !raw || journal.overflow)
    return;
  for (const [option, arg, lazy] of journal.ops)
    raw(withMotion(resolveColors(el, option)), arg, lazy);
}
var themeWatched = false;
function watchTheme() {
  if (themeWatched)
    return;
  themeWatched = true;
  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      for (const el of live) {
        const inst = instances2.get(el);
        if (!el.isConnected || !inst || inst.isDisposed?.()) {
          live.delete(el);
          continue;
        }
        retheme(el, inst);
      }
    }, 60);
  };
  const mo = new MutationObserver(schedule);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
  if (document.head)
    mo.observe(document.head, { childList: true, subtree: true, characterData: true });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", schedule);
}
function morphable(option) {
  const series = option.series;
  if (series === undefined)
    return option;
  const list = Array.isArray(series) ? series : [series];
  return {
    ...option,
    series: list.map((s) => s.universalTransition === undefined && s.type !== "custom" ? { ...s, universalTransition: { enabled: true } } : s)
  };
}
function chartStory(el, states, { loop = false } = {}) {
  if (!Array.isArray(states) || states.length === 0) {
    throw new Error("chart: chartStory needs at least one option state");
  }
  if (!instances2.has(el))
    mount(el, morphable(states[0]));
  let i = 0;
  const go = (n) => {
    i = loop ? (n % states.length + states.length) % states.length : Math.min(Math.max(n, 0), states.length - 1);
    instances2.get(el)?.setOption(morphable(states[i]), true);
    return i;
  };
  return { next: () => go(i + 1), prev: () => go(i - 1), go, index: () => i };
}
var DECK_TEMPO = { animationDuration: 1500, animationEasing: "cubicOut", animationDurationUpdate: 1500, animationEasingUpdate: "cubicInOut" };
function chartDeck(deck, { base = {}, states }) {
  const stage = deck.querySelector(":scope > .presentation-stage");
  if (!stage)
    throw new Error('chart: chart.deck() needs a <div class="chart presentation-stage"> child of the .presentation');
  if (!isPlain(states) || Object.keys(states).length === 0)
    throw new Error("chart: chart.deck() needs at least one named state");
  const slides = Array.from(deck.querySelectorAll(":scope > [data-slide]"));
  let current = null;
  let last = null;
  const show = (name) => {
    if (name === null || !(name in states)) {
      stage.removeAttribute("data-visible");
      current = null;
      return;
    }
    const slide = slides.find((s) => s.dataset.chartState === name);
    if (!instances2.has(stage) && slide)
      stage.style.color = getComputedStyle(slide).color;
    stage.setAttribute("data-visible", "");
    if (name === current)
      return;
    const returning = current === null && name === last;
    current = name;
    last = name;
    const option = morphable(deepMerge(deepMerge(DECK_TEMPO, base), states[name]));
    const inst = instances2.get(stage);
    if (!inst)
      mount(stage, option);
    else if (returning) {
      inst.clear?.();
      inst.setOption(option, true);
    } else
      inst.setOption(option, true);
  };
  const sync = () => {
    const active2 = slides.find((s) => s.hasAttribute("data-active"));
    show(active2?.dataset.chartState ?? null);
  };
  const mo = new MutationObserver(sync);
  slides.forEach((s) => mo.observe(s, { attributes: true, attributeFilter: ["data-active"] }));
  sync();
  return {
    show,
    state: () => current,
    dispose: () => {
      mo.disconnect();
      observers.get(stage)?.disconnect();
      instances2.get(stage)?.dispose();
      instances2.delete(stage);
      live.delete(stage);
      stage.removeAttribute("data-visible");
    }
  };
}
function triggerStateChange7(el, stateName, config = {}) {
  if (!chartStates.includes(stateName)) {
    throw new Error(`chart: unknown state "${stateName}" (supported: ${chartStates.join(", ")})`);
  }
  if (isPlain(config.option)) {
    const current = instances2.get(el);
    if (current)
      current.setOption(config.option, true);
    else
      mount(el, config.option);
  }
}
var chartApi = {
  setState(el, stateName, config = {}) {
    triggerStateChange7(el, stateName, config);
    el.dataset.stateName = stateName;
    el._stateConfig = config;
  },
  getState(el) {
    return {
      name: el.dataset.stateName || "default",
      config: { ...el._stateConfig }
    };
  }
};
df$7.chartApi = chartApi;
df$7.chartStates = chartStates;
df$7.chart = { mount, instance, theme: chartTheme, color: chartColor, deck: chartDeck };
df$7.chartStory = chartStory;
function init7() {
  document.querySelectorAll(".chart:not([data-init])").forEach((el) => {
    el.dataset.init = "";
    el.api = {
      setState: (stateName, config) => chartApi.setState(el, stateName, config),
      getState: () => chartApi.getState(el)
    };
    const boot = () => {
      if (instances2.has(el))
        return;
      const raw = el.getAttribute("data-chart");
      if (!raw)
        return;
      const box = el.getBoundingClientRect();
      if (box.width === 0 || box.height === 0)
        return;
      let option;
      try {
        option = JSON.parse(raw);
      } catch (err) {
        throw new Error(`chart: invalid JSON in data-chart - ${err instanceof Error ? err.message : err}`);
      }
      mount(el, option);
    };
    new ResizeObserver(boot).observe(el);
    boot();
  });
}
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

// src/components/color-picker/color-picker.ts
var df$8 = defussGlobals();
var colorPickerStates = ["default"];
var getInput = (picker) => picker.querySelector('input[type="color"]');
var COLOR_FORMATS = ["hex", "rgb", "hsl", "oklch"];
var num = (n, digits) => String(Number(n.toFixed(digits)));
function formatColor(hex, format) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m)
    return hex;
  const int = parseInt(m[1], 16);
  const [r, g, b] = [int >> 16 & 255, int >> 8 & 255, int & 255];
  switch (format) {
    case "rgb":
      return `rgb(${r} ${g} ${b})`;
    case "hsl": {
      const [rn, gn, bn] = [r / 255, g / 255, b / 255];
      const max = Math.max(rn, gn, bn);
      const min = Math.min(rn, gn, bn);
      const l = (max + min) / 2;
      const d = max - min;
      let h = 0;
      let sat = 0;
      if (d) {
        sat = d / (1 - Math.abs(2 * l - 1));
        h = max === rn ? (gn - bn) / d % 6 : max === gn ? (bn - rn) / d + 2 : (rn - gn) / d + 4;
        h = (h * 60 + 360) % 360;
      }
      return `hsl(${num(h, 1)} ${num(sat * 100, 1)}% ${num(l * 100, 1)}%)`;
    }
    case "oklch": {
      const lin = (c) => {
        const v = c / 255;
        return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
      };
      const [lr, lg, lb] = [lin(r), lin(g), lin(b)];
      const l_ = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
      const m_ = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
      const s_ = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
      const L = 0.2104542553 * l_ + 0.793617785 * m_ - 0.0040720468 * s_;
      const A = 1.9779984951 * l_ - 2.428592205 * m_ + 0.4505937099 * s_;
      const B = 0.0259040371 * l_ + 0.7827717662 * m_ - 0.808675766 * s_;
      const C = Math.hypot(A, B);
      if (C < 0.00005)
        return `oklch(${num(L, 4)} 0 0)`;
      const H = (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
      return `oklch(${num(L, 4)} ${num(C, 4)} ${num(H, 2)})`;
    }
    default:
      return `#${m[1].toLowerCase()}`;
  }
}
var formatOf = (picker) => COLOR_FORMATS.includes(picker.dataset.format) ? picker.dataset.format : "hex";
function syncValue(picker) {
  const input = getInput(picker);
  if (!input)
    return;
  const format = formatOf(picker);
  const text = formatColor(input.value, format);
  const display = picker.querySelector(".color-picker-value");
  if (display && display.textContent !== text)
    display.textContent = text;
  picker.querySelectorAll("input[data-color-output]").forEach((out) => {
    if (out.value === text)
      return;
    out.value = text;
    out.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const switcher = picker.querySelector("select.color-picker-format");
  if (switcher && switcher.value !== format)
    switcher.value = format;
}
function triggerStateChange8(picker, config) {
  if (typeof config?.format === "string" && COLOR_FORMATS.includes(config.format)) {
    picker.dataset.format = config.format;
    syncValue(picker);
  }
  const input = getInput(picker);
  if (!input || config?.value === undefined)
    return;
  input.value = String(config.value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
var colorPickerApi = {
  setState(picker, stateName, config = {}) {
    if (!colorPickerStates.includes(stateName)) {
      throw new Error(`color-picker: unknown state "${stateName}" (supported: ${colorPickerStates.join(", ")})`);
    }
    triggerStateChange8(picker, config);
    picker.dataset.stateName = stateName;
    picker._stateConfig = config;
  },
  getState(picker) {
    const input = getInput(picker);
    return {
      name: picker.dataset.stateName || "default",
      config: {
        ...picker._stateConfig,
        value: input ? input.value : "",
        format: formatOf(picker),
        formatted: input ? formatColor(input.value, formatOf(picker)) : ""
      }
    };
  }
};
df$8.colorPickerApi = colorPickerApi;
df$8.colorPickerStates = colorPickerStates;
function init8() {
  document.querySelectorAll(".color-picker:not([data-init])").forEach((picker) => {
    picker.dataset.init = "";
    picker.api = {
      setState: (stateName, config) => colorPickerApi.setState(picker, stateName, config),
      getState: () => colorPickerApi.getState(picker)
    };
    const input = picker.querySelector('input[type="color"]');
    if (!input)
      return;
    syncValue(picker);
    input.addEventListener("input", () => {
      syncValue(picker);
    });
    picker.querySelector("select.color-picker-format")?.addEventListener("change", (e) => {
      picker.dataset.format = e.target.value;
      syncValue(picker);
    });
    new MutationObserver(() => syncValue(picker)).observe(picker, { attributes: true, attributeFilter: ["data-format"] });
  });
}
init8();
new MutationObserver(init8).observe(document, { childList: true, subtree: true });

// src/components/combobox/combobox.ts
var df$9 = defussGlobals();
var dfDollar4 = defussQuery();
var comboboxStates = ["default", "open"];
function triggerStateChange9(popover, stateName, _config) {
  switch (stateName) {
    case "default":
      popover._close?.();
      break;
    case "open":
      popover._open?.();
      break;
  }
}
var comboboxApi = {
  setState(popover, stateName, config = {}) {
    if (!comboboxStates.includes(stateName)) {
      throw new Error(`combobox: unknown state "${stateName}" (supported: ${comboboxStates.join(", ")})`);
    }
    triggerStateChange9(popover, stateName, config);
    popover.dataset.stateName = stateName;
    popover._stateConfig = config;
  },
  getState(popover) {
    const selected = Array.from(popover.querySelectorAll('[role="option"][aria-selected="true"]'));
    const labels = selected.map((o) => o.textContent?.trim() ?? "");
    return {
      name: popover.matches(":popover-open") ? "open" : "default",
      config: {
        ...popover._stateConfig,
        value: labels.join(", "),
        values: selected.map((o) => o.dataset.value ?? o.textContent?.trim() ?? ""),
        labels
      }
    };
  }
};
df$9.comboboxApi = comboboxApi;
df$9.comboboxStates = comboboxStates;
var esc2 = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var idPart = (t) => t.replace(/[^\w-]/g, "_");
var comboSeq = 0;
function initTags(wrapper) {
  const field = wrapper.querySelector(".combobox-field");
  const input = wrapper.querySelector(".combobox-field-input");
  const popover = wrapper.querySelector(".combobox-content");
  const listbox = wrapper.querySelector('[role="listbox"]');
  if (!field || !input || !popover || !listbox)
    return;
  const empty = wrapper.querySelector(".combobox-empty");
  const creatable = wrapper.hasAttribute("data-creatable");
  const uid = wrapper.id || popover.id || `dfcb-${++comboSeq}`;
  const options = () => Array.from(listbox.querySelectorAll('[role="option"]:not(.combobox-create)'));
  const valueOf = (o) => o.dataset.value ?? o.textContent.trim();
  const labelOf = (o) => o.textContent.trim();
  dfDollar4(listbox).attr("aria-multiselectable", "true");
  const anchorId = `--combobox-${uid}`;
  dfDollar4(field).css("anchorName", anchorId);
  dfDollar4(popover).css("positionAnchor", anchorId);
  const tags = document.createElement("span");
  tags.className = "combobox-tags";
  dfDollar4(input).before(tags);
  let createRow = null;
  if (creatable) {
    createRow = document.createElement("div");
    createRow.className = "combobox-item combobox-create";
    createRow.id = `${uid}-create`;
    createRow.setAttribute("role", "option");
    createRow.setAttribute("aria-selected", "false");
    createRow.hidden = true;
    dfDollar4(listbox).append(createRow);
  }
  let highlighted = null;
  const highlight = (el) => {
    if (highlighted)
      dfDollar4(highlighted).data("highlighted", null);
    highlighted = el;
    if (el) {
      dfDollar4(el).data("highlighted", "");
      el.scrollIntoView({ block: "nearest" });
      dfDollar4(input).attr("aria-activedescendant", el.id);
    } else
      dfDollar4(input).attr("aria-activedescendant", null);
  };
  const visible = () => [...options(), ...createRow ? [createRow] : []].filter((o) => !o.hidden && o.getAttribute("aria-disabled") !== "true");
  const isOpen = () => popover.matches(":popover-open");
  const open = () => {
    if (isOpen())
      return;
    safeShowPopover(popover);
    dfDollar4(input).attr("aria-expanded", "true");
  };
  const close = () => {
    if (isOpen())
      popover.hidePopover();
    dfDollar4(input).attr("aria-expanded", "false");
    highlight(null);
  };
  const filter = () => {
    const text = input.value.trim();
    const q = text.toLowerCase();
    let exact = null;
    let any = false;
    for (const o of options()) {
      const match = !q || labelOf(o).toLowerCase().includes(q);
      dfDollar4(o).prop("hidden", !match);
      if (match)
        any = true;
      if (q && labelOf(o).toLowerCase() === q)
        exact = o;
    }
    if (createRow) {
      const showCreate = !!text && !exact;
      dfDollar4(createRow).prop("hidden", !showCreate);
      if (showCreate)
        dfDollar4(createRow).text(`Create "${text}"`);
    }
    if (empty)
      dfDollar4(empty).prop("hidden", any || !!createRow && !createRow.hidden);
    highlight(exact ?? (createRow && !createRow.hidden ? createRow : !creatable ? visible()[0] ?? null : null));
  };
  const render = (announce = true, created = null) => {
    const chosen = options().filter((o) => o.getAttribute("aria-selected") === "true");
    const labels = chosen.map(labelOf);
    const values = chosen.map(valueOf);
    const name = wrapper.dataset.name;
    dfDollar4(tags).morph(labels.map((label, i) => `<span class="combobox-tag" id="${uid}-tag-${idPart(values[i])}">${esc2(label)}<button type="button" class="combobox-tag-remove" data-value="${esc2(values[i])}" aria-label="Remove ${esc2(label)}" tabindex="-1"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>`).join("") + (name ? values.map((v) => `<input type="hidden" name="${esc2(name)}" value="${esc2(v)}" id="${uid}-input-${idPart(v)}">`).join("") : ""));
    if (input.dataset.placeholder === undefined)
      input.dataset.placeholder = input.placeholder;
    input.placeholder = labels.length ? "" : input.dataset.placeholder;
    if (announce)
      wrapper.dispatchEvent(new CustomEvent("combobox:change", { bubbles: true, detail: { values, labels, created } }));
  };
  const commit = (row) => {
    const text = input.value.trim();
    let created = null;
    if (createRow && row === createRow || !row && creatable && text) {
      if (!text)
        return;
      const exact = options().find((o) => labelOf(o).toLowerCase() === text.toLowerCase());
      if (exact)
        row = exact;
      else {
        const option = document.createElement("div");
        option.className = "combobox-item";
        option.setAttribute("role", "option");
        option.dataset.value = text;
        option.dataset.created = "";
        option.id = `${uid}-opt-${idPart(text)}-${options().length}`;
        dfDollar4(option).text(text);
        if (createRow)
          dfDollar4(createRow).before(option);
        else
          dfDollar4(listbox).append(option);
        row = option;
        created = text;
      }
      dfDollar4(row).attr("aria-selected", "true");
    } else if (row) {
      if (row.getAttribute("aria-disabled") === "true")
        return;
      const on = row.getAttribute("aria-selected") === "true";
      dfDollar4(row).attr("aria-selected", on && !text ? "false" : "true");
    } else
      return;
    dfDollar4(input).val("");
    render(true, created);
    filter();
    input.focus();
  };
  render(false);
  filter();
  field.addEventListener("mousedown", (e) => {
    if (!e.target.closest("button, input")) {
      e.preventDefault();
      input.focus();
    }
  });
  tags.addEventListener("click", (e) => {
    const btn = e.target.closest(".combobox-tag-remove");
    if (!btn)
      return;
    const option = options().find((o) => valueOf(o) === btn.dataset.value);
    if (option)
      dfDollar4(option).attr("aria-selected", "false");
    render();
    filter();
    input.focus();
  });
  input.addEventListener("focus", () => {
    open();
    filter();
  });
  input.addEventListener("input", () => {
    open();
    filter();
  });
  input.addEventListener("keydown", (e) => {
    const rows = visible();
    const at = highlighted ? rows.indexOf(highlighted) : -1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        open();
        highlight(rows[Math.min(at + 1, rows.length - 1)] ?? null);
        break;
      case "ArrowUp":
        e.preventDefault();
        highlight(rows[Math.max(at - 1, 0)] ?? null);
        break;
      case "Enter":
        e.preventDefault();
        commit(highlighted);
        break;
      case ",":
        if (input.value.trim()) {
          e.preventDefault();
          commit(highlighted);
        }
        break;
      case "Backspace": {
        if (input.value !== "")
          break;
        const chosen = options().filter((o) => o.getAttribute("aria-selected") === "true");
        const last = chosen[chosen.length - 1];
        if (!last)
          break;
        e.preventDefault();
        dfDollar4(last).attr("aria-selected", "false");
        render();
        filter();
        break;
      }
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        close();
        break;
    }
  });
  listbox.addEventListener("mousedown", (e) => e.preventDefault());
  listbox.addEventListener("click", (e) => {
    const row = e.target.closest('[role="option"]');
    if (row && !row.hidden)
      commit(row);
  });
  listbox.addEventListener("mousemove", (e) => {
    const row = e.target.closest('[role="option"]');
    if (row && !row.hidden && row !== highlighted)
      highlight(row);
  });
  wrapper.addEventListener("focusout", (e) => {
    if (!wrapper.contains(e.relatedTarget) && !popover.contains(e.relatedTarget))
      close();
  });
  popover.addEventListener("toggle", (e) => {
    if (e.newState === "closed")
      dfDollar4(input).attr("aria-expanded", "false");
  });
}
function init9() {
  document.querySelectorAll(".combobox:not([data-init])").forEach((wrapper) => {
    wrapper.dataset.init = "";
    if (wrapper.hasAttribute("data-tags")) {
      initTags(wrapper);
      return;
    }
    const $wrapper = dfDollar4(wrapper);
    const $trigger = $wrapper.find(".combobox-trigger");
    const $value = $wrapper.find(".combobox-value");
    const $popover = $wrapper.find(".combobox-content");
    const $search = $wrapper.find(".combobox-search-input");
    const $listbox = $wrapper.find('[role="listbox"]');
    const $empty = $wrapper.find(".combobox-empty");
    const trigger2 = $trigger[0];
    const popover = $popover[0];
    const searchInput = $search[0];
    const listbox = $listbox[0];
    if (!trigger2 || !popover || !searchInput || !listbox)
      return;
    const allItems = $listbox.find('[role="option"]');
    let highlighted = -1;
    const anchorId = `--combobox-${popover.id}`;
    $trigger.css("anchorName", anchorId);
    $popover.css("positionAnchor", anchorId);
    const placeholder = $value.data("placeholder") ?? "";
    const clearBtn = document.createElement("button");
    clearBtn.type = "button";
    clearBtn.className = "combobox-clear";
    clearBtn.setAttribute("aria-label", "Clear selection");
    dfDollar4(clearBtn).html('<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>');
    dfDollar4(clearBtn).css("positionAnchor", anchorId);
    $trigger.after(clearBtn);
    const multiple = wrapper.hasAttribute("data-multiple");
    const uid = wrapper.id || popover.id || `dfcb-${++comboSeq}`;
    let tags = null;
    if (multiple) {
      $listbox.attr("aria-multiselectable", "true");
      tags = document.createElement("div");
      tags.className = "combobox-tags";
      tags.setAttribute("role", "list");
      tags.setAttribute("aria-label", `Selected ${trigger2.getAttribute("aria-label") || document.getElementById(trigger2.getAttribute("aria-labelledby") || "")?.textContent?.trim() || "options"}`);
      dfDollar4(clearBtn).after(tags);
      tags.addEventListener("click", (e) => {
        const btn = e.target.closest(".combobox-tag-remove");
        if (!btn)
          return;
        const option = Array.from(allItems).find((o) => (o.dataset.value ?? o.textContent.trim()) === btn.dataset.value);
        const all = Array.from(tags.querySelectorAll(".combobox-tag-remove"));
        const at = all.indexOf(btn);
        if (option)
          dfDollar4(option).attr("aria-selected", "false");
        renderSelection();
        const rest = Array.from(tags.querySelectorAll(".combobox-tag-remove"));
        (rest[Math.min(at, rest.length - 1)] ?? trigger2).focus();
      });
    }
    const renderSelection = (announce = true) => {
      const chosen = Array.from(allItems).filter((o) => o.getAttribute("aria-selected") === "true");
      const labels = chosen.map((o) => o.textContent.trim());
      const values = chosen.map((o) => o.dataset.value ?? o.textContent.trim());
      const summary = multiple && labels.length > 1 ? ($value.data("selectedLabel") ?? "{n} selected").replace("{n}", String(labels.length)) : labels.join(", ");
      if (labels.length)
        $value.text(summary).attr("data-placeholder", null);
      else
        $value.text(placeholder).attr("data-placeholder", placeholder);
      if (tags) {
        const name = wrapper.dataset.name;
        dfDollar4(tags).morph(labels.map((label, i) => `<span class="combobox-tag" role="listitem" id="${uid}-tag-${idPart(values[i])}">${esc2(label)}<button type="button" class="combobox-tag-remove" data-value="${esc2(values[i])}" aria-label="Remove ${esc2(label)}"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>`).join("") + (name ? values.map((v) => `<input type="hidden" name="${esc2(name)}" value="${esc2(v)}" id="${uid}-input-${idPart(v)}">`).join("") : ""));
      }
      if (announce)
        wrapper.dispatchEvent(new CustomEvent("combobox:change", { bubbles: true, detail: { values, labels } }));
    };
    if (multiple)
      renderSelection(false);
    clearBtn.addEventListener("click", () => {
      allItems.attr("aria-selected", "false");
      renderSelection();
      trigger2.focus();
    });
    const getVisibleItems = () => allItems.filter((item) => !item.hidden && item.getAttribute("aria-disabled") !== "true");
    const open = () => {
      safeShowPopover(popover);
      $trigger.attr("aria-expanded", "true");
      $search.val("");
      filter("");
      searchInput.focus();
    };
    const close = () => {
      popover.hidePopover();
      $trigger.attr("aria-expanded", "false");
      $search.attr("aria-activedescendant", "");
      clearHighlight();
      trigger2.focus();
    };
    popover._open = open;
    popover._close = close;
    popover.api = {
      setState: (stateName, config) => comboboxApi.setState(popover, stateName, config),
      getState: () => comboboxApi.getState(popover)
    };
    const isOpen = () => popover.matches(":popover-open");
    const filter = (query) => {
      const q = query.toLowerCase();
      let hasVisible = false;
      allItems.forEach((item) => {
        const match = !q || item.textContent.trim().toLowerCase().includes(q);
        dfDollar4(item).prop("hidden", !match);
        if (match)
          hasVisible = true;
      });
      $listbox.find(".combobox-group-label").each(function() {
        const label = this;
        let next = label.nextElementSibling;
        let groupHasVisible = false;
        while (next && !next.classList.contains("combobox-group-label") && !next.classList.contains("combobox-separator")) {
          if (next.getAttribute("role") === "option" && !next.hidden)
            groupHasVisible = true;
          next = next.nextElementSibling;
        }
        dfDollar4(label).prop("hidden", !groupHasVisible);
      });
      $listbox.find(".combobox-separator").each(function() {
        const sep = this;
        const prev = sep.previousElementSibling;
        const next = sep.nextElementSibling;
        dfDollar4(sep).prop("hidden", Boolean(prev && prev.hidden || next && next.hidden));
      });
      if ($empty.length)
        $empty.prop("hidden", hasVisible);
    };
    const clearHighlight = () => {
      allItems.data("highlighted", null);
      highlighted = -1;
    };
    const doHighlight = (index) => {
      const items = getVisibleItems();
      clearHighlight();
      if (index < 0 || index >= items.length)
        return;
      highlighted = index;
      dfDollar4(items[index]).data("highlighted", "");
      items[index].scrollIntoView({ block: "nearest" });
      $search.attr("aria-activedescendant", items[index].id);
    };
    const selectItem = (item) => {
      if (item.getAttribute("aria-disabled") === "true")
        return;
      if (multiple) {
        dfDollar4(item).attr("aria-selected", item.getAttribute("aria-selected") === "true" ? "false" : "true");
        renderSelection();
        searchInput.focus();
        return;
      }
      allItems.attr("aria-selected", "false");
      dfDollar4(item).attr("aria-selected", "true");
      renderSelection();
      close();
    };
    trigger2.addEventListener("click", () => {
      if (isOpen()) {
        close();
      } else {
        open();
      }
    });
    searchInput.addEventListener("input", () => {
      filter(searchInput.value);
      doHighlight(0);
    });
    searchInput.addEventListener("keydown", (e) => {
      const items = getVisibleItems();
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          doHighlight(Math.min(highlighted + 1, items.length - 1));
          break;
        case "ArrowUp":
          e.preventDefault();
          doHighlight(Math.max(highlighted - 1, 0));
          break;
        case "Home":
          e.preventDefault();
          doHighlight(0);
          break;
        case "End":
          e.preventDefault();
          doHighlight(items.length - 1);
          break;
        case "Enter":
          e.preventDefault();
          if (highlighted >= 0 && items[highlighted])
            selectItem(items[highlighted]);
          break;
        case "Escape":
          e.preventDefault();
          close();
          break;
        case "Tab":
          close();
          break;
        case "Backspace": {
          if (!multiple || searchInput.value !== "")
            break;
          const chosen = Array.from(allItems).filter((o) => o.getAttribute("aria-selected") === "true");
          const last = chosen[chosen.length - 1];
          if (!last)
            break;
          e.preventDefault();
          dfDollar4(last).attr("aria-selected", "false");
          renderSelection();
          break;
        }
      }
    });
    listbox.addEventListener("click", (e) => {
      const item = e.target.closest('[role="option"]');
      if (item && !item.hidden && item.getAttribute("aria-disabled") !== "true")
        selectItem(item);
    });
    listbox.addEventListener("mousemove", (e) => {
      const item = e.target.closest('[role="option"]');
      if (item && !item.hidden) {
        const items = getVisibleItems();
        doHighlight(items.indexOf(item));
      }
    });
    popover.addEventListener("toggle", (e) => {
      if (e.newState === "closed") {
        $trigger.attr("aria-expanded", "false");
        clearHighlight();
      }
    });
  });
}
init9();
new MutationObserver(init9).observe(document, { childList: true, subtree: true });

// src/components/command/command.ts
var df$10 = defussGlobals();
var dfDollar5 = defussQuery();
var commandStates = ["default", "open"];
function triggerStateChange10(dialog, stateName, _config) {
  switch (stateName) {
    case "default":
      if (dialog.open)
        dialog.close();
      break;
    case "open":
      if (!dialog.open)
        dialog.showModal();
      {
        const input = dialog.querySelector(".command-input");
        if (input)
          input.focus();
      }
      break;
  }
}
var commandApi = {
  setState(dialog, stateName, config = {}) {
    if (!commandStates.includes(stateName)) {
      throw new Error(`command: unknown state "${stateName}" (supported: ${commandStates.join(", ")})`);
    }
    triggerStateChange10(dialog, stateName, config);
    dialog.dataset.stateName = stateName;
    dialog._stateConfig = config;
  },
  getState(dialog) {
    return { name: dialog.dataset.stateName || "default", config: dialog._stateConfig ?? {} };
  }
};
df$10.commandApi = commandApi;
df$10.commandStates = commandStates;
var commandKeydownAdded = false;
if (!commandKeydownAdded) {
  commandKeydownAdded = true;
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      const dialog = document.querySelector("dialog.command");
      if (!dialog)
        return;
      e.preventDefault();
      if (dialog.open) {
        dialog.close();
      } else {
        dialog.showModal();
        const input = dialog.querySelector(".command-input");
        if (input)
          input.focus();
      }
    }
  });
}
function getVisibleItems(list) {
  return Array.from(dfDollar5(list).find('.command-item:not([hidden]):not([aria-disabled="true"])'));
}
function highlightItem(list, index) {
  const visible = getVisibleItems(list);
  dfDollar5(list).find(".command-item[data-highlighted]").data("highlighted", null);
  if (visible.length === 0)
    return -1;
  const clamped = (index % visible.length + visible.length) % visible.length;
  dfDollar5(visible[clamped]).data("highlighted", "");
  visible[clamped].scrollIntoView({ block: "nearest" });
  return clamped;
}
function init10() {
  document.querySelectorAll("dialog.command:not([data-init])").forEach((dialog) => {
    dialog.dataset.init = "";
    dialog.api = {
      setState: (stateName, config) => commandApi.setState(dialog, stateName, config),
      getState: () => commandApi.getState(dialog)
    };
    const input = dialog.querySelector(".command-input");
    const list = dialog.querySelector(".command-list");
    const empty = dialog.querySelector(".command-empty");
    if (!input || !list)
      return;
    let highlightIndex = -1;
    const filter = (q) => {
      const query = q.toLowerCase();
      let hasVisible = false;
      const $items = dfDollar5(list).find(".command-item");
      $items.each(function() {
        const match = !query || this.textContent.toLowerCase().includes(query);
        dfDollar5(this).prop("hidden", !match);
        if (match)
          hasVisible = true;
      });
      dfDollar5(list).find(".command-group").each(function() {
        dfDollar5(this).prop("hidden", dfDollar5(this).find(".command-item:not([hidden])").length === 0);
      });
      dfDollar5(list).find(".command-separator").prop("hidden", !!query);
      if (empty)
        dfDollar5(empty).prop("hidden", hasVisible);
      highlightIndex = highlightItem(list, 0);
    };
    input.addEventListener("input", () => {
      filter(input.value);
    });
    input.addEventListener("keydown", (e) => {
      const visible = getVisibleItems(list);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        highlightIndex = highlightItem(list, highlightIndex + 1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        highlightIndex = highlightItem(list, highlightIndex - 1);
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (visible[highlightIndex]) {
          visible[highlightIndex].click();
        }
      } else if (e.key === "Home") {
        e.preventDefault();
        highlightIndex = highlightItem(list, 0);
      } else if (e.key === "End") {
        e.preventDefault();
        highlightIndex = highlightItem(list, visible.length - 1);
      }
    });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog)
        dialog.close();
      if (e.target.closest(".command-item"))
        dialog.close();
    });
    dialog.addEventListener("close", () => {
      if (dialog.open)
        return;
      dialog.dataset.stateName = "default";
      dfDollar5(input).val("");
      filter("");
      dfDollar5(list).find(".command-item[data-highlighted]").data("highlighted", null);
      highlightIndex = -1;
    });
  });
  document.querySelectorAll("[data-command-trigger]:not([data-init])").forEach((trigger2) => {
    trigger2.dataset.init = "";
    const dialog = document.getElementById(trigger2.dataset.commandTrigger);
    if (!dialog)
      return;
    trigger2.addEventListener("click", () => {
      dialog.showModal();
      const input = dfDollar5(dialog).find(".command-input")[0];
      if (input)
        input.focus();
    });
  });
}
init10();
new MutationObserver(init10).observe(document, { childList: true, subtree: true });

// src/components/context-menu/context-menu.ts
var df$11 = defussGlobals();
var contextMenuStates = ["default", "open"];
function triggerStateChange11(menu, stateName, config) {
  switch (stateName) {
    case "default":
      menu.hidePopover();
      break;
    case "open": {
      const x = Number(config?.x ?? 8);
      const y = Number(config?.y ?? 8);
      menu.style.position = "fixed";
      menu.style.top = `${y}px`;
      menu.style.left = `${x}px`;
      safeShowPopover(menu);
      break;
    }
  }
}
var contextMenuApi = {
  setState(menu, stateName, config = {}) {
    if (!contextMenuStates.includes(stateName)) {
      throw new Error(`context-menu: unknown state "${stateName}" (supported: ${contextMenuStates.join(", ")})`);
    }
    triggerStateChange11(menu, stateName, config);
    menu.dataset.stateName = stateName;
    menu._stateConfig = config;
  },
  getState(menu) {
    return {
      name: menu.matches(":popover-open") ? "open" : "default",
      config: menu._stateConfig ?? {}
    };
  }
};
df$11.contextMenuApi = contextMenuApi;
df$11.contextMenuStates = contextMenuStates;
var pendingOpen = null;
var lastRightUp = 0;
if (!document.__ctxMenuReleaseInit) {
  document.__ctxMenuReleaseInit = true;
  document.addEventListener("pointerup", (e) => {
    if (e.button !== 2)
      return;
    lastRightUp = performance.now();
    if (!pendingOpen)
      return;
    const { menu, x, y } = pendingOpen;
    pendingOpen = null;
    openMenuAt(menu, x, y);
  });
  document.addEventListener("pointercancel", () => {
    pendingOpen = null;
  });
}
function openMenuAt(menu, x, y) {
  menu.style.position = "fixed";
  menu.style.top = `${y}px`;
  menu.style.left = `${x}px`;
  safeShowPopover(menu);
  menu.dataset.stateName = "open";
}
function init11() {
  document.querySelectorAll("[data-context-menu]:not([data-init])").forEach((trigger2) => {
    trigger2.dataset.init = "";
    const menu = document.getElementById(trigger2.dataset.contextMenu);
    if (!menu)
      return;
    menu.api = {
      setState: (stateName, config) => contextMenuApi.setState(menu, stateName, config),
      getState: () => contextMenuApi.getState(menu)
    };
    trigger2.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      if (e.pointerId === undefined || e.pointerId < 0) {
        requestAnimationFrame(() => openMenuAt(menu, e.clientX, e.clientY));
        return;
      }
      if (lastRightUp > 0 && performance.now() - lastRightUp < 100) {
        openMenuAt(menu, e.clientX, e.clientY);
        return;
      }
      pendingOpen = { menu, x: e.clientX, y: e.clientY };
    });
    menu.addEventListener("click", (e) => {
      if (e.target.closest(".context-menu-item")) {
        menu.hidePopover();
        menu.dataset.stateName = "default";
      }
    });
    menu.addEventListener("toggle", (e) => {
      if (e.newState === "closed")
        menu.dataset.stateName = "default";
    });
  });
}
init11();
new MutationObserver(init11).observe(document, { childList: true, subtree: true });

// src/components/dialog/dialog.ts
var df$12 = defussGlobals();
var dialogStates = ["default", "open"];
function triggerStateChange12(dialog, stateName, _config) {
  switch (stateName) {
    case "default":
      if (dialog.open)
        dialog.close();
      break;
    case "open":
      if (!dialog.open)
        dialog.showModal();
      break;
  }
}
var dialogApi = {
  setState(dialog, stateName, config = {}) {
    if (!dialogStates.includes(stateName)) {
      throw new Error(`dialog: unknown state "${stateName}" (supported: ${dialogStates.join(", ")})`);
    }
    triggerStateChange12(dialog, stateName, config);
    dialog.dataset.stateName = stateName;
    dialog._stateConfig = config;
  },
  getState(dialog) {
    return { name: dialog.dataset.stateName || "default", config: dialog._stateConfig ?? {} };
  }
};
df$12.dialogApi = dialogApi;
df$12.dialogStates = dialogStates;
function init12() {
  document.querySelectorAll("[data-dialog-trigger]:not([data-init])").forEach((trigger2) => {
    trigger2.dataset.init = "";
    const dialog = document.getElementById(trigger2.dataset.dialogTrigger);
    if (!dialog)
      return;
    trigger2.addEventListener("click", () => {
      dialog._trigger = trigger2;
      dialog.showModal();
    });
  });
  document.querySelectorAll("dialog:not(.alert-dialog):not(.sheet):not(.command):not([data-init])").forEach((dialog) => {
    dialog.dataset.init = "";
    dialog.api = {
      setState: (stateName, config) => dialogApi.setState(dialog, stateName, config),
      getState: () => dialogApi.getState(dialog)
    };
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog)
        dialog.close();
    });
    dialog.querySelectorAll("[data-dialog-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        dialog.close();
      });
    });
    dialog.addEventListener("close", () => {
      if (dialog.open)
        return;
      dialog.dataset.stateName = "default";
      if (dialog._trigger)
        dialog._trigger.focus();
    });
  });
}
init12();
new MutationObserver(init12).observe(document, { childList: true, subtree: true });

// src/components/dropdown/dropdown.ts
var df$13 = defussGlobals();
var dropdownStates = ["default", "open"];
function triggerStateChange13(menu, stateName, _config) {
  switch (stateName) {
    case "default":
      try {
        menu.hidePopover();
      } catch {}
      break;
    case "open":
      safeShowPopover(menu);
      break;
  }
}
var dropdownApi = {
  setState(menu, stateName, config = {}) {
    if (!dropdownStates.includes(stateName)) {
      throw new Error(`dropdown: unknown state "${stateName}" (supported: ${dropdownStates.join(", ")})`);
    }
    triggerStateChange13(menu, stateName, config);
    menu.dataset.stateName = stateName;
    menu._stateConfig = config;
  },
  getState(menu) {
    return { name: menu.dataset.stateName || "default", config: menu._stateConfig ?? {} };
  }
};
df$13.dropdownApi = dropdownApi;
df$13.dropdownStates = dropdownStates;
function init13() {
  document.querySelectorAll("[data-dropdown-trigger]:not([data-init])").forEach((trigger2) => {
    trigger2.dataset.init = "";
    const menu = document.getElementById(trigger2.dataset.dropdownTrigger);
    if (!menu)
      return;
    const anchorId = `--dropdown-${menu.id}`;
    trigger2.style.anchorName = anchorId;
    menu.style.positionAnchor = anchorId;
    const getItems = () => {
      return Array.from(menu.querySelectorAll('[role="menuitem"]:not(:disabled), [role="menuitemcheckbox"]:not(:disabled), [role="menuitemradio"]:not(:disabled)'));
    };
    const highlight = (item) => {
      getItems().forEach((i) => {
        i.removeAttribute("data-highlighted");
      });
      if (item) {
        item.setAttribute("data-highlighted", "");
        item.focus();
      }
    };
    if (!trigger2.hasAttribute("popovertarget"))
      trigger2.setAttribute("popovertarget", menu.id);
    menu.addEventListener("toggle", (e) => {
      const open = e.newState === "open";
      trigger2.setAttribute("aria-expanded", open);
      if (open) {
        const first = getItems()[0];
        if (first)
          highlight(first);
      } else {
        getItems().forEach((i) => {
          i.removeAttribute("data-highlighted");
        });
        trigger2.focus();
      }
    });
    menu.addEventListener("mousemove", (e) => {
      const item = e.target.closest('[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]');
      if (item && !item.disabled)
        highlight(item);
    });
    menu.addEventListener("mouseleave", () => {
      getItems().forEach((i) => {
        i.removeAttribute("data-highlighted");
      });
    });
    menu.addEventListener("keydown", (e) => {
      const items = getItems();
      const current = items.indexOf(document.activeElement);
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          highlight(items[(current + 1) % items.length]);
          break;
        case "ArrowUp":
          e.preventDefault();
          highlight(items[(current - 1 + items.length) % items.length]);
          break;
        case "Home":
          e.preventDefault();
          highlight(items[0]);
          break;
        case "End":
          e.preventDefault();
          highlight(items[items.length - 1]);
          break;
        case "Escape":
          menu.hidePopover();
          break;
        case "Enter":
        case " ":
          e.preventDefault();
          if (document.activeElement) {
            const role = document.activeElement.getAttribute("role");
            if (role === "menuitemcheckbox") {
              const checked = document.activeElement.getAttribute("aria-checked") === "true";
              document.activeElement.setAttribute("aria-checked", !checked);
            } else if (role === "menuitemradio") {
              const group = document.activeElement.closest('[role="group"]');
              if (group)
                group.querySelectorAll('[role="menuitemradio"]').forEach((r) => {
                  r.setAttribute("aria-checked", "false");
                });
              document.activeElement.setAttribute("aria-checked", "true");
            } else {
              document.activeElement.click();
              menu.hidePopover();
            }
          }
          break;
        default:
          if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
            const match = items.find((item) => item.textContent.trim().toLowerCase().startsWith(e.key.toLowerCase()));
            if (match)
              highlight(match);
          }
      }
    });
  });
  document.querySelectorAll(".dropdown-content[popover]:not([data-init])").forEach((menu) => {
    menu.dataset.init = "";
    menu.api = {
      setState: (stateName, config) => dropdownApi.setState(menu, stateName, config),
      getState: () => dropdownApi.getState(menu)
    };
  });
}
init13();
new MutationObserver(init13).observe(document, { childList: true, subtree: true });

// src/components/image/image.ts
var df$14 = defussGlobals();
var dfDollar6 = defussQuery();
var imageStates = ["default", "error"];
function triggerStateChange14(figure, stateName, _config) {
  const img = dfDollar6(figure).find("img")[0];
  if (!img)
    return;
  switch (stateName) {
    case "default":
      dfDollar6(img).data("error", null);
      break;
    case "error":
      dfDollar6(img).data("error", "");
      break;
  }
}
var imageApi = {
  setState(figure, stateName, config = {}) {
    if (!imageStates.includes(stateName)) {
      throw new Error(`image: unknown state "${stateName}" (supported: ${imageStates.join(", ")})`);
    }
    triggerStateChange14(figure, stateName, config);
    figure.dataset.stateName = stateName;
    figure._stateConfig = config;
  },
  getState(figure) {
    const img = dfDollar6(figure).find("img")[0];
    return {
      name: img && dfDollar6(img).data("error") !== undefined ? "error" : "default",
      config: figure._stateConfig ?? {}
    };
  }
};
df$14.imageApi = imageApi;
df$14.imageStates = imageStates;
function init14() {
  document.querySelectorAll(".image:not([data-init])").forEach((figure) => {
    figure.dataset.init = "";
    figure.api = {
      setState: (stateName, config) => imageApi.setState(figure, stateName, config),
      getState: () => imageApi.getState(figure)
    };
    const img = dfDollar6(figure).find("img")[0];
    if (!img)
      return;
    if (img.complete && img.naturalWidth === 0) {
      dfDollar6(img).data("error", "");
    }
    img.addEventListener("error", () => {
      dfDollar6(img).data("error", "");
      figure.dataset.stateName = "error";
    });
    img.addEventListener("load", () => {
      dfDollar6(img).data("error", null);
      figure.dataset.stateName = "default";
    });
    const srcLow = img.dataset.srcLow;
    const srcHigh = img.dataset.srcHigh;
    if (srcLow || srcHigh) {
      const retina = !!srcHigh && globalThis.matchMedia("(min-resolution: 2dppx)").matches;
      const finalSrc = retina ? srcHigh : img.getAttribute("src");
      if (retina)
        img.dataset.srcHighLoaded = "";
      if (srcLow && finalSrc) {
        dfDollar6(img).data("loading", "");
        img.src = srcLow;
        const preload = new Image;
        preload.onload = preload.onerror = () => {
          img.src = finalSrc;
          dfDollar6(img).data("loading", null);
        };
        preload.src = finalSrc;
      } else if (retina) {
        img.src = srcHigh;
      }
    }
  });
}
init14();
new MutationObserver(init14).observe(document, { childList: true, subtree: true });
var lightbox = null;
var lightboxImg = null;
var lightboxFigure = null;
var zoom = 1;
var rotation = 0;
function getLightbox() {
  if (lightbox)
    return lightbox;
  lightbox = document.createElement("dialog");
  lightbox.className = "image-lightbox";
  lightbox.setAttribute("aria-label", "Image preview");
  dfDollar6(lightbox).html(`
    <div class="image-lightbox-content">
      <img src="" alt="" />
    </div>
    <div class="image-lightbox-toolbar">
      <button class="image-lightbox-btn" data-action="zoom-in" aria-label="Zoom in">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>
      <button class="image-lightbox-btn" data-action="zoom-out" aria-label="Zoom out">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="8" y1="11" x2="14" y2="11"/></svg>
      </button>
      <button class="image-lightbox-btn" data-action="rotate-left" aria-label="Rotate left">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2.5 2v6h6"/><path d="M2.66 15.57a10 10 0 1 0 .57-8.38"/></svg>
      </button>
      <button class="image-lightbox-btn" data-action="rotate-right" aria-label="Rotate right">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 1 1-.57-8.38"/></svg>
      </button>
      <button class="image-lightbox-btn" data-action="reset" aria-label="Reset">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
      </button>
      <button class="image-lightbox-btn" data-action="close" aria-label="Close">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
      </button>
    </div>`);
  lightboxImg = dfDollar6(lightbox).find(".image-lightbox-content > img")[0];
  dfDollar6(lightbox).find(".image-lightbox-toolbar")[0].addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn)
      return;
    const action = btn.dataset.action;
    if (action === "zoom-in") {
      zoom = Math.min(zoom + 0.25, 5);
      upgradeLightboxToHigh();
    } else if (action === "zoom-out")
      zoom = Math.max(zoom - 0.25, 0.25);
    else if (action === "rotate-left")
      rotation -= 90;
    else if (action === "rotate-right")
      rotation += 90;
    else if (action === "reset") {
      zoom = 1;
      rotation = 0;
    } else if (action === "close") {
      lightbox.close();
      return;
    }
    applyTransform();
  });
  lightbox.addEventListener("click", (e) => {
    if (e.target === lightbox)
      lightbox.close();
  });
  dfDollar6(document.body).append(lightbox);
  return lightbox;
}
function upgradeLightboxToHigh() {
  if (!lightboxFigure)
    return;
  const img = dfDollar6(lightboxFigure).find("img")[0];
  if (img && img.dataset.srcFull)
    return;
  const srcHigh = img && img.dataset.srcHigh;
  if (!srcHigh || img.dataset.srcHighLoaded !== undefined)
    return;
  img.dataset.srcHighLoaded = "";
  img.src = srcHigh;
  if (lightboxImg)
    lightboxImg.src = srcHigh;
}
function applyTransform() {
  if (lightboxImg) {
    dfDollar6(lightboxImg).css("transform", `scale(${zoom}) rotate(${rotation}deg)`);
  }
}
function openLightbox(figure) {
  const lb = getLightbox();
  zoom = 1;
  rotation = 0;
  const img = dfDollar6(figure).find("img")[0];
  lightboxFigure = figure;
  const $img = dfDollar6(lightboxImg);
  $img.attr("src", img.src).attr("alt", img.alt || "").css("transform", null).css("width", null);
  const srcFull = img.dataset.srcFull;
  if (srcFull) {
    const ratio = img.naturalWidth && img.naturalHeight ? img.naturalWidth / img.naturalHeight : 0;
    if (ratio)
      $img.css("width", `min(90vw, calc(85vh * ${ratio.toFixed(4)}))`);
    const full = new Image;
    full.onload = () => {
      if (lightboxFigure !== figure || !lb.open)
        return;
      $img.attr("src", srcFull).css("width", null);
    };
    full.src = srcFull;
  }
  lb.showModal();
}
if (!document.__imagePreviewInit) {
  document.__imagePreviewInit = true;
  document.addEventListener("click", (e) => {
    const figure = e.target.closest(".image[data-preview]");
    if (!figure)
      return;
    const img = dfDollar6(figure).find("img")[0];
    if (!img || dfDollar6(img).data("error") !== undefined)
      return;
    openLightbox(figure);
  });
}

// src/components/navigation-menu/navigation-menu.ts
var df$15 = defussGlobals();
var navigationMenuStates = ["default", "open"];
function triggerStateChange15(content, stateName, _config) {
  switch (stateName) {
    case "default":
      try {
        content.hidePopover();
      } catch {}
      break;
    case "open":
      safeShowPopover(content);
      break;
  }
}
var navigationMenuApi = {
  setState(content, stateName, config = {}) {
    if (!navigationMenuStates.includes(stateName)) {
      throw new Error(`navigation-menu: unknown state "${stateName}" (supported: ${navigationMenuStates.join(", ")})`);
    }
    triggerStateChange15(content, stateName, config);
    content.dataset.stateName = stateName;
    content._stateConfig = config;
  },
  getState(content) {
    return { name: content.dataset.stateName || "default", config: content._stateConfig ?? {} };
  }
};
df$15.navigationMenuApi = navigationMenuApi;
df$15.navigationMenuStates = navigationMenuStates;
function init15() {
  document.querySelectorAll(".nav-menu-trigger[popovertarget]:not([data-init])").forEach((trigger2) => {
    trigger2.dataset.init = "";
    const content = document.getElementById(trigger2.getAttribute("popovertarget"));
    if (!content)
      return;
    const anchorId = `--nav-menu-${content.id}`;
    trigger2.style.anchorName = anchorId;
    content.style.positionAnchor = anchorId;
  });
  document.querySelectorAll(".nav-menu-content[popover]:not([data-init])").forEach((content) => {
    content.dataset.init = "";
    content.api = {
      setState: (stateName, config) => navigationMenuApi.setState(content, stateName, config),
      getState: () => navigationMenuApi.getState(content)
    };
  });
}
init15();
new MutationObserver(init15).observe(document, { childList: true, subtree: true });

// src/components/number-input/number-input.ts
var df$16 = defussGlobals();
var numberInputStates = ["default"];
var getInput2 = (wrapper) => wrapper.querySelector('input:not([type="hidden"])');
function currencyConfig(wrapper) {
  const currency = String(wrapper.dataset.currency || "USD").toUpperCase();
  const locale = wrapper.dataset.locale || wrapper.closest("[lang]")?.getAttribute("lang") || navigator.language;
  const currencyDisplay = wrapper.dataset.currencyDisplay || "symbol";
  const money = new Intl.NumberFormat(locale, { style: "currency", currency, currencyDisplay });
  const parts = money.formatToParts(1234567.5);
  const index = (type) => parts.findIndex((p) => p.type === type);
  const fraction = money.resolvedOptions().maximumFractionDigits ?? 2;
  return {
    locale,
    currency,
    fraction,
    decimal: parts.find((p) => p.type === "decimal")?.value ?? ".",
    symbol: parts.find((p) => p.type === "currency")?.value ?? currency,
    prefix: index("currency") < index("integer"),
    grouping: new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }),
    fixed: new Intl.NumberFormat(locale, { minimumFractionDigits: fraction, maximumFractionDigits: fraction })
  };
}
function parseMoney(text, cfg) {
  let dec = text.lastIndexOf(cfg.decimal);
  if (dec < 0 && cfg.fraction > 0) {
    const alt = cfg.decimal === "," ? "." : ",";
    const i = text.lastIndexOf(alt);
    if (i >= 0 && /^\d*$/.test(text.slice(i + 1)) && text.length - i - 1 <= cfg.fraction)
      dec = i;
  }
  if (cfg.fraction === 0)
    dec = -1;
  const int = (dec < 0 ? text : text.slice(0, dec)).replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  const frac = dec < 0 ? null : text.slice(dec + 1).replace(/\D/g, "").slice(0, cfg.fraction);
  return { int, frac };
}
var moneyText = (int, frac, cfg) => (int ? cfg.grouping.format(BigInt(int)) : frac !== null ? "0" : "") + (frac !== null ? cfg.decimal + frac : "");
var moneyValue = ({ int, frac }) => {
  if (!int && !frac)
    return "";
  const f = (frac ?? "").replace(/0+$/, "");
  return `${int || "0"}${f ? "." + f : ""}`;
};
function maskMoney(wrapper, input, cfg) {
  const raw = input.value;
  const caret = input.selectionStart ?? raw.length;
  const digitsBefore = raw.slice(0, caret).replace(/\D/g, "").length;
  const parsed = parseMoney(raw, cfg);
  const text = moneyText(parsed.int, parsed.frac, cfg);
  if (text !== raw) {
    input.value = text;
    let pos = 0;
    for (let seen = 0;pos < text.length && seen < digitsBefore; pos++)
      if (/\d/.test(text[pos]))
        seen++;
    if (text[pos] === cfg.decimal && raw.slice(0, caret).match(/[.,]$/))
      pos++;
    input.setSelectionRange(pos, pos);
  }
  wrapper._moneyExact = moneyValue(parsed);
  writeMoneyOutput(wrapper, wrapper._moneyExact);
}
function commitMoney(wrapper, input, cfg, number = null, remember = true) {
  const value = number ?? moneyValue(parseMoney(input.value, cfg));
  if (remember)
    wrapper._moneyExact = value === "" || !Number.isFinite(Number(value)) ? "" : String(Number(value));
  if (value === "" || !Number.isFinite(Number(value))) {
    input.value = "";
    writeMoneyOutput(wrapper, "");
    return;
  }
  input.value = cfg.fixed.format(Number(value));
  writeMoneyOutput(wrapper, moneyValue(parseMoney(input.value, cfg)));
}
function writeMoneyOutput(wrapper, value) {
  wrapper.dataset.value = value;
  wrapper.querySelectorAll("input[data-number-output]").forEach((out) => {
    if (out.value === value)
      return;
    out.value = value;
    out.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
function placeCurrencySymbol(wrapper, input, cfg) {
  let unit = wrapper.querySelector(".number-input-unit");
  if (!unit) {
    unit = document.createElement("label");
    unit.className = "number-input-unit";
    if (input.id)
      unit.htmlFor = input.id;
  }
  unit.textContent = cfg.symbol;
  if (cfg.prefix && unit.nextElementSibling !== input)
    input.before(unit);
  if (!cfg.prefix && input.nextElementSibling !== unit)
    input.after(unit);
}
function setupCurrency(wrapper, input) {
  const cfg = currencyConfig(wrapper);
  wrapper._money = cfg;
  placeCurrencySymbol(wrapper, input, cfg);
  input.setAttribute("inputmode", cfg.fraction > 0 ? "decimal" : "numeric");
  if (wrapper._moneyExact !== undefined) {
    commitMoney(wrapper, input, cfg, wrapper._moneyExact, false);
    return;
  }
  const authored = (input.getAttribute("value") ?? "").trim();
  const machine = /^\d+(\.\d+)?$/.test(authored) ? authored : moneyValue(parseMoney(authored, cfg));
  commitMoney(wrapper, input, cfg, machine === "" ? "" : machine);
}
function formatDecimals(wrapper, input) {
  const d = parseInt(wrapper.dataset.decimals ?? "", 10);
  if (!Number.isFinite(d) || d < 0 || input.value === "")
    return;
  const n = input.valueAsNumber;
  if (!Number.isFinite(n))
    return;
  const fixed = n.toFixed(d);
  if (input.value !== fixed)
    input.value = fixed;
}
function triggerStateChange16(wrapper, config) {
  const input = getInput2(wrapper);
  if (!input || config?.value === undefined)
    return;
  if (wrapper._money) {
    commitMoney(wrapper, input, wrapper._money, config.value === "" ? "" : String(config.value));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  input.value = String(config.value);
  formatDecimals(wrapper, input);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
var numberInputApi = {
  setState(wrapper, stateName, config = {}) {
    if (!numberInputStates.includes(stateName)) {
      throw new Error(`number-input: unknown state "${stateName}" (supported: ${numberInputStates.join(", ")})`);
    }
    triggerStateChange16(wrapper, config);
    wrapper.dataset.stateName = stateName;
    wrapper._stateConfig = config;
  },
  getState(wrapper) {
    const input = getInput2(wrapper);
    return {
      name: wrapper.dataset.stateName || "default",
      config: {
        ...wrapper._stateConfig,
        value: input ? input.value : "",
        ...wrapper._money ? { number: wrapper.dataset.value ?? "", currency: wrapper._money.currency, locale: wrapper._money.locale } : {}
      }
    };
  }
};
df$16.numberInputApi = numberInputApi;
df$16.numberInputStates = numberInputStates;
function init16() {
  document.querySelectorAll(".number-input:not([data-init])").forEach((wrapper) => {
    wrapper.dataset.init = "";
    wrapper.api = {
      setState: (stateName, config) => numberInputApi.setState(wrapper, stateName, config),
      getState: () => numberInputApi.getState(wrapper)
    };
    const input = getInput2(wrapper);
    const decBtn = wrapper.querySelector('[data-action="decrement"]');
    const incBtn = wrapper.querySelector('[data-action="increment"]');
    if (!input)
      return;
    if (wrapper.hasAttribute("data-currency")) {
      setupCurrency(wrapper, input);
      input.addEventListener("input", (e) => {
        if (e.isComposing)
          return;
        maskMoney(wrapper, input, wrapper._money);
      });
      input.addEventListener("blur", () => {
        commitMoney(wrapper, input, wrapper._money);
      });
      const nudge = (direction) => {
        const step = Number(input.dataset.step || 1);
        const min = input.dataset.min === undefined ? -Infinity : Number(input.dataset.min);
        const max = input.dataset.max === undefined ? Infinity : Number(input.dataset.max);
        const current = Number(moneyValue(parseMoney(input.value, wrapper._money)) || 0);
        const next = Math.min(max, Math.max(min, Math.round((current + direction * step) * 1e6) / 1e6));
        commitMoney(wrapper, input, wrapper._money, String(next));
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      };
      input.addEventListener("keydown", (e) => {
        if (e.key === "ArrowUp" || e.key === "ArrowDown") {
          e.preventDefault();
          nudge(e.key === "ArrowUp" ? 1 : -1);
        }
      });
      if (decBtn)
        decBtn.addEventListener("click", () => {
          nudge(-1);
        });
      if (incBtn)
        incBtn.addEventListener("click", () => {
          nudge(1);
        });
      new MutationObserver(() => {
        setupCurrency(wrapper, input);
      }).observe(wrapper, { attributes: true, attributeFilter: ["data-locale", "data-currency", "data-currency-display"] });
      return;
    }
    formatDecimals(wrapper, input);
    input.addEventListener("change", () => {
      formatDecimals(wrapper, input);
    });
    const update = (direction) => {
      try {
        if (direction > 0)
          input.stepUp();
        else
          input.stepDown();
        formatDecimals(wrapper, input);
        input.dispatchEvent(new Event("input", { bubbles: true }));
        input.dispatchEvent(new Event("change", { bubbles: true }));
      } catch {}
    };
    if (decBtn)
      decBtn.addEventListener("click", () => {
        update(-1);
      });
    if (incBtn)
      incBtn.addEventListener("click", () => {
        update(1);
      });
  });
}
init16();
new MutationObserver(init16).observe(document, { childList: true, subtree: true });

// src/components/pagination/pagination.ts
var df$17 = defussGlobals();
var dfDollar7 = defussQuery();
var paginationStates = ["default"];
var numAttr = (el, key, fallback) => {
  const v = parseInt(el.dataset[key] ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
};
function renderWindow(nav) {
  const list = nav.querySelector(".pagination-list");
  const prev = nav.querySelector(".pagination-prev");
  const next = nav.querySelector(".pagination-next");
  const prevLi = prev?.closest("li") ?? null;
  const nextLi = next?.closest("li") ?? null;
  if (!list || !prev || !next || !prevLi || !nextLi)
    return;
  const min = Math.max(1, numAttr(nav, "minPage", 1));
  const max = Math.max(min, numAttr(nav, "maxPage", 1));
  const active2 = Math.min(max, Math.max(min, numAttr(nav, "activePage", min)));
  dfDollar7(prev).attr("aria-disabled", active2 <= min ? "true" : null);
  dfDollar7(next).attr("aria-disabled", active2 >= max ? "true" : null);
  if (!nav.hasAttribute("data-active-page"))
    return;
  const count = Math.max(1, numAttr(nav, "pageDisplayCount", 5));
  if (nav.dataset.activePage !== String(active2))
    nav.dataset.activePage = String(active2);
  const start = Math.max(min, Math.min(active2 - Math.floor((count - 1) / 2), max - count + 1));
  const end = Math.min(max, start + count - 1);
  const survivors = new Map;
  let n = prevLi.nextSibling;
  while (n && n !== nextLi) {
    const node = n;
    n = n.nextSibling;
    const page = node.querySelector?.(".pagination-link[data-page]")?.getAttribute("data-page");
    const p = page ? parseInt(page, 10) : NaN;
    if (Number.isFinite(p) && p >= start && p <= end) {
      node.remove();
      survivors.set(p, node);
    } else
      node.remove();
  }
  for (const node of windowNodes(start, end, min, max, active2, survivors))
    dfDollar7(nextLi).before(node);
}
function windowNodes(start, end, min, max, active2, survivors) {
  const out = [];
  const ellipsis = () => {
    const li = document.createElement("li");
    const s = document.createElement("span");
    s.className = "pagination-ellipsis";
    s.setAttribute("aria-hidden", "true");
    s.textContent = "…";
    li.append(s);
    return li;
  };
  const pageLink = (p) => {
    const li = document.createElement("li");
    const a = document.createElement("a");
    a.className = "pagination-link" + (p === active2 ? " pagination-active" : "");
    a.href = "#";
    a.dataset.page = String(p);
    if (p === active2)
      a.setAttribute("aria-current", "page");
    a.textContent = String(p);
    li.append(a);
    return li;
  };
  if (start > min)
    out.push(ellipsis());
  for (let p = start;p <= end; p++) {
    if (p === active2 || !survivors.has(p))
      out.push(pageLink(p));
    else {
      const node = survivors.get(p);
      const a = node.querySelector("a");
      a?.classList.remove("pagination-active");
      a?.removeAttribute("aria-current");
      out.push(node);
    }
  }
  if (end < max)
    out.push(ellipsis());
  return out;
}
function setPage(nav, page) {
  const min = Math.max(1, numAttr(nav, "minPage", 1));
  const max = Math.max(min, numAttr(nav, "maxPage", 1));
  const next = Math.min(max, Math.max(min, page));
  if (next === numAttr(nav, "activePage", min))
    return;
  nav.dataset.activePage = String(next);
  nav.dispatchEvent(new CustomEvent("pagination-change", { bubbles: true, detail: { page: next } }));
}
function triggerStateChange17(nav, stateName, config = {}) {
  if (stateName !== "default")
    return;
  const a = config.activePage ?? config.page;
  if (a !== undefined)
    nav.dataset.activePage = String(a);
  if (config.minPage !== undefined)
    nav.dataset.minPage = String(config.minPage);
  if (config.maxPage !== undefined)
    nav.dataset.maxPage = String(config.maxPage);
  if (config.pageDisplayCount !== undefined)
    nav.dataset.pageDisplayCount = String(config.pageDisplayCount);
  renderWindow(nav);
}
var paginationApi = {
  setState(nav, stateName, config = {}) {
    if (!paginationStates.includes(stateName)) {
      throw new Error(`pagination: unknown state "${stateName}" (supported: ${paginationStates.join(", ")})`);
    }
    triggerStateChange17(nav, stateName, config);
    nav.dataset.stateName = stateName;
    nav._stateConfig = config;
  },
  getState(nav) {
    return {
      name: nav.dataset.stateName || "default",
      config: {
        ...nav._stateConfig,
        activePage: numAttr(nav, "activePage", 1),
        minPage: numAttr(nav, "minPage", 1),
        maxPage: numAttr(nav, "maxPage", 1),
        pageDisplayCount: numAttr(nav, "pageDisplayCount", 5)
      }
    };
  }
};
df$17.paginationApi = paginationApi;
df$17.paginationStates = paginationStates;
function init17() {
  document.querySelectorAll(".pagination:not([data-init])").forEach((nav) => {
    nav.dataset.init = "";
    nav.api = {
      setState: (stateName, config) => paginationApi.setState(nav, stateName, config),
      getState: () => paginationApi.getState(nav)
    };
    if (nav.hasAttribute("data-active-page"))
      renderWindow(nav);
    new MutationObserver(() => {
      if (nav.hasAttribute("data-active-page"))
        renderWindow(nav);
    }).observe(nav, {
      attributes: true,
      attributeFilter: ["data-active-page", "data-min-page", "data-max-page", "data-page-display-count", "data-size"]
    });
    nav.addEventListener("click", (e) => {
      const link = e.target.closest(".pagination-link[data-page], .pagination-prev, .pagination-next");
      if (!link)
        return;
      e.preventDefault();
      if (link.classList.contains("pagination-link")) {
        setPage(nav, parseInt(link.dataset.page ?? "1", 10));
      } else if (link.classList.contains("pagination-prev")) {
        setPage(nav, numAttr(nav, "activePage", 1) - 1);
      } else {
        setPage(nav, numAttr(nav, "activePage", 1) + 1);
      }
    });
    nav.addEventListener("pagination-next", () => setPage(nav, numAttr(nav, "activePage", 1) + 1));
    nav.addEventListener("pagination-prev", () => setPage(nav, numAttr(nav, "activePage", 1) - 1));
  });
}
init17();
new MutationObserver(init17).observe(document, { childList: true, subtree: true });

// src/components/popover/popover.ts
var df$18 = defussGlobals();
var popoverStates = ["default", "open"];
function triggerStateChange18(popover, stateName, _config) {
  switch (stateName) {
    case "default":
      try {
        popover.hidePopover();
      } catch {}
      break;
    case "open":
      safeShowPopover(popover);
      break;
  }
}
var popoverApi = {
  setState(popover, stateName, config = {}) {
    if (!popoverStates.includes(stateName)) {
      throw new Error(`popover: unknown state "${stateName}" (supported: ${popoverStates.join(", ")})`);
    }
    triggerStateChange18(popover, stateName, config);
    popover.dataset.stateName = stateName;
    popover._stateConfig = config;
  },
  getState(popover) {
    return { name: popover.dataset.stateName || "default", config: popover._stateConfig ?? {} };
  }
};
df$18.popoverApi = popoverApi;
df$18.popoverStates = popoverStates;
function init18() {
  document.querySelectorAll("[popovertarget]:not([data-init])").forEach((trigger2) => {
    const id = trigger2.getAttribute("popovertarget");
    const popover = document.getElementById(id);
    if (!popover || !popover.classList.contains("popover"))
      return;
    trigger2.dataset.init = "";
    const anchorId = `--popover-${id}`;
    trigger2.style.anchorName = anchorId;
    popover.style.positionAnchor = anchorId;
  });
  document.querySelectorAll(".popover[popover]:not([data-init])").forEach((popover) => {
    popover.dataset.init = "";
    popover.api = {
      setState: (stateName, config) => popoverApi.setState(popover, stateName, config),
      getState: () => popoverApi.getState(popover)
    };
  });
}
init18();
new MutationObserver(init18).observe(document, { childList: true, subtree: true });

// src/components/presentation/presentation.ts
var df$19 = defussGlobals();
var presentationStates = ["default", "notes", "fullscreen"];
var DEFAULT_IN = "fadeIn";
var DEFAULT_OUT = "fadeOut";
function channelFor3(name) {
  if (!anim.names.includes(name)) {
    throw new Error(`presentation: unknown animation "${name}" (supported: ${anim.names.join(", ")})`);
  }
  return anim[name];
}
function animSpec(root, slide, phase, forward) {
  const p = phase === "in" ? "animIn" : "animOut";
  const pick = (suffix = "") => slide.dataset[p + suffix] ?? root.dataset[p + suffix];
  const travel = phase === "in" ? forward ? "east" : "west" : forward ? "west" : "east";
  const opts = { direction: pick("Direction") ?? travel };
  const num2 = (suffix) => {
    const n = parseFloat(pick(suffix) ?? "");
    return Number.isFinite(n) ? n : undefined;
  };
  if (num2("Duration") !== undefined)
    opts.duration = num2("Duration");
  if (num2("Scale") !== undefined)
    opts.scale = num2("Scale");
  if (num2("Blocks") !== undefined)
    opts.blocks = Math.round(num2("Blocks"));
  if (num2("Stagger") !== undefined)
    opts.stagger = num2("Stagger");
  if (pick("Easing"))
    opts.easing = pick("Easing");
  if (pick("Origin"))
    opts.origin = pick("Origin");
  if (pick("Distance"))
    opts.distance = pick("Distance");
  if (pick("Color"))
    opts.color = pick("Color");
  return { name: pick() || (phase === "in" ? DEFAULT_IN : DEFAULT_OUT), opts };
}
var probe2 = null;
function rgbOf(css) {
  if (!css || typeof document === "undefined")
    return null;
  probe2 ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe2)
    return null;
  probe2.clearRect(0, 0, 1, 1);
  probe2.fillStyle = "rgba(1, 2, 3, 0.5)";
  probe2.fillStyle = css;
  if (probe2.fillStyle === "rgba(1, 2, 3, 0.5)")
    return null;
  probe2.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe2.getImageData(0, 0, 1, 1).data;
  return [r, g, b, a / 255];
}
function contrast(a, b) {
  const lum = (c) => {
    const [r, g, bl] = c.slice(0, 3).map((v) => {
      const s = v / 255;
      return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}
function curtainColor(root, from, to, declared) {
  const surfaces = [from, to].map((s) => rgbOf(getComputedStyle(s).backgroundColor)).filter((c) => !!c && c[3] > 0.5);
  const cs = getComputedStyle(root);
  const candidates = [
    declared,
    cs.getPropertyValue("--presentation-accent").trim(),
    getComputedStyle(from).color,
    cs.getPropertyValue("--presentation-ink").trim(),
    cs.getPropertyValue("--presentation-paper").trim()
  ];
  for (const c of candidates) {
    if (!c)
      continue;
    const rgb = rgbOf(c);
    if (rgb && surfaces.every((bg) => contrast(rgb, bg) >= 1.6))
      return c;
  }
  return getComputedStyle(from).color;
}
var slidesOf = (root) => Array.from(root.querySelectorAll(":scope > [data-slide]"));
var indexOf = (root) => coerceIndex(root.dataset.currentSlide, 0);
var nativeDeck = null;
function enterFullscreen(root) {
  const host = root;
  if (typeof host.requestFullscreen === "function") {
    host.requestFullscreen().then(() => {
      nativeDeck = root;
    }, () => {
      root.dataset.fullscreen = "";
    });
    return;
  }
  host.webkitRequestFullscreen?.();
  nativeDeck = root;
  root.dataset.fullscreen = "";
}
function exitFullscreen(root) {
  delete root.dataset.fullscreen;
  const doc = document;
  if ((doc.fullscreenElement ?? doc.webkitFullscreenElement) === root) {
    try {
      (doc.exitFullscreen?.bind(doc) ?? doc.webkitExitFullscreen?.bind(doc))?.();
    } catch {}
  }
  if (nativeDeck === root)
    nativeDeck = null;
}
function triggerStateChange19(root, stateName, config = {}) {
  if (!presentationStates.includes(stateName)) {
    throw new Error(`presentation: unknown state "${stateName}" (supported: ${presentationStates.join(", ")})`);
  }
  if (stateName === "default") {
    if (config.index !== undefined)
      root._presentationActivate?.(clampIndex(config.index, slidesOf(root).length));
    if (config.index === undefined && config.notes === undefined && config.fullscreen === undefined) {
      delete root.dataset.notes;
      exitFullscreen(root);
    }
    return;
  }
  if (stateName === "notes") {
    root.toggleAttribute("data-notes", config.value !== false);
    return;
  }
  if (config.value === false)
    exitFullscreen(root);
  else
    enterFullscreen(root);
}
var presentationApi = {
  setState(root, stateName, config = {}) {
    triggerStateChange19(root, stateName, config);
    root.dataset.stateName = stateName;
    root._stateConfig = config;
  },
  getState(root) {
    return {
      name: root.dataset.stateName || "default",
      config: {
        ...root._stateConfig,
        slide: indexOf(root),
        notes: root.hasAttribute("data-notes"),
        fullscreen: root.hasAttribute("data-fullscreen")
      }
    };
  }
};
df$19.presentationApi = presentationApi;
df$19.presentationStates = presentationStates;
var keysBound2 = false;
function bindKeyboard() {
  if (keysBound2)
    return;
  keysBound2 = true;
  bindGlobalKeys((e) => {
    const target = e.target;
    const root = target?.closest(".presentation") ?? document.querySelector(".presentation");
    if (!root)
      return;
    if (e.key === " " && target?.closest('button, a, [role="button"]'))
      return;
    const total = slidesOf(root).length;
    const go = (index, forward) => root._presentationActivate?.(index, forward);
    const step = (delta) => {
      const next = indexOf(root) + delta;
      if (root.hasAttribute("data-loop") && total > 1)
        go((next + total) % total, delta > 0);
      else
        go(next, delta > 0);
    };
    let handled = true;
    switch (e.key) {
      case "ArrowRight":
      case "PageDown":
      case " ":
        step(1);
        break;
      case "ArrowLeft":
      case "PageUp":
        step(-1);
        break;
      case "Home":
        go(0);
        break;
      case "End":
        go(total - 1);
        break;
      case "n":
      case "N":
        root.toggleAttribute("data-notes");
        break;
      case "f":
      case "F":
        triggerStateChange19(root, "fullscreen", { value: !root.hasAttribute("data-fullscreen") });
        break;
      default:
        handled = false;
    }
    if (!handled)
      return;
    e.preventDefault();
    return true;
  });
}
var hashBound = false;
function bindHash() {
  if (hashBound)
    return;
  hashBound = true;
  addEventListener("hashchange", () => {
    const id = decodeURIComponent(location.hash.slice(1));
    if (!id)
      return;
    const slide = document.getElementById(id);
    const root = slide?.closest(".presentation");
    if (root && slide)
      root._presentationActivate?.(slidesOf(root).indexOf(slide));
  });
}
var fullscreenBound = false;
function bindFullscreen() {
  if (fullscreenBound)
    return;
  fullscreenBound = true;
  document.addEventListener("fullscreenchange", () => {
    const el = document.fullscreenElement;
    if (el?.classList.contains("presentation"))
      el.dataset.fullscreen = "";
    if (!el && nativeDeck) {
      delete nativeDeck.dataset.fullscreen;
      nativeDeck = null;
    }
  });
}
function init19() {
  document.querySelectorAll(".presentation:not([data-init])").forEach((root) => {
    root.dataset.init = "";
    root.api = {
      setState: (stateName, config) => presentationApi.setState(root, stateName, config),
      getState: () => presentationApi.getState(root)
    };
    const enter = (target) => {
      const slides = slidesOf(root);
      slides.forEach((slide) => {
        const on = slide === target;
        slide.toggleAttribute("data-active", on);
        slide.inert = !on;
        slide.setAttribute("aria-hidden", String(!on));
        slide.querySelectorAll("video[autoplay]").forEach((video) => {
          if (on) {
            video.currentTime = 0;
            video.play()?.catch(() => {});
          } else
            video.pause();
        });
      });
      target.querySelectorAll("[data-count]").forEach((el) => animateCount(el));
      target.querySelectorAll("[data-df-entrance]").forEach((el) => {
        entrance(el);
      });
      target.querySelectorAll("[data-df-draw]").forEach((el) => {
        draw(el);
      });
    };
    const transition = (from, to, forward) => {
      root._presentationSettle?.();
      root._presentationSettle = undefined;
      const inSpec = animSpec(root, to, "in", forward);
      if (!from || from === to) {
        enter(to);
        channelFor3(inSpec.name === "blocksIn" ? "fadeIn" : inSpec.name).play(to, inSpec.opts);
        return;
      }
      if (inSpec.name === "blocksIn") {
        const cfg = {
          ...inSpec.opts,
          duration: (inSpec.opts.duration ?? 1500) / 2,
          color: curtainColor(root, from, to, inSpec.opts.color)
        };
        root.setAttribute("data-curtain", "");
        const cover = channelFor3("blocksIn").play(from, cfg);
        let flipped = false;
        const flip = () => {
          if (flipped)
            return;
          flipped = true;
          cover.reset();
          enter(to);
          root.removeAttribute("data-curtain");
          const reveal = channelFor3("blocksOut").play(to, cfg);
          root._presentationSettle = () => reveal.finish();
        };
        root._presentationSettle = () => {
          cover.finish();
          flip();
        };
        cover.finished.then(flip);
        return;
      }
      const outSpec = animSpec(root, from, "out", forward);
      from.setAttribute("data-leaving", "");
      enter(to);
      const arriving = channelFor3(inSpec.name).play(to, inSpec.opts);
      const leaving = channelFor3(outSpec.name === "blocksOut" ? DEFAULT_OUT : outSpec.name).play(from, outSpec.opts);
      let done = false;
      const cleanup = () => {
        if (done)
          return;
        done = true;
        from.removeAttribute("data-leaving");
        leaving.reset();
      };
      leaving.finished.then(cleanup);
      root._presentationSettle = () => {
        arriving.finish();
        cleanup();
      };
    };
    let booted = false;
    const activate2 = (index, forward) => {
      const slides = slidesOf(root);
      if (slides.length === 0)
        return;
      const clamped = clampIndex(index, slides.length);
      const previous = booted ? slides.find((s) => s.hasAttribute("data-active")) : undefined;
      const fromIndex = previous ? slides.indexOf(previous) : -1;
      if (booted && previous === slides[clamped])
        return;
      booted = true;
      transition(previous, slides[clamped], forward ?? clamped >= fromIndex);
      root.dataset.currentSlide = String(clamped);
      const counter = root.querySelector(".presentation-counter");
      if (counter)
        counter.textContent = `${clamped + 1} / ${slides.length}`;
      const progress = root.querySelector("progress.presentation-progress");
      if (progress) {
        progress.setAttribute("max", String(slides.length));
        progress.setAttribute("value", String(clamped + 1));
      }
      const loop = root.hasAttribute("data-loop");
      const prev = root.querySelector('[data-presentation-action="prev"]');
      const next = root.querySelector('[data-presentation-action="next"]');
      if (prev)
        prev.disabled = clamped === 0 && !loop;
      if (next)
        next.disabled = clamped === slides.length - 1 && !loop;
      const pad = (n) => String(n).padStart(2, "0");
      const number = slides[clamped].querySelector(".presentation-slide-number");
      if (number)
        number.textContent = `${pad(clamped + 1)}⁄${pad(slides.length)}`;
    };
    root._presentationActivate = activate2;
    const applyScale = () => {
      const cs = getComputedStyle(root);
      const w = parseFloat(cs.getPropertyValue("--presentation-width")) || 1600;
      const h = parseFloat(cs.getPropertyValue("--presentation-height")) || 900;
      const box = root.getBoundingClientRect();
      const scale = Math.min(box.width / w, box.height / h);
      if (Number.isFinite(scale) && scale > 0)
        root.style.setProperty("--presentation-scale", String(scale));
    };
    new ResizeObserver(applyScale).observe(root);
    root.addEventListener("click", (e) => {
      const btn = e.target?.closest?.("[data-presentation-action]");
      if (!btn || !root.contains(btn))
        return;
      const total = slidesOf(root).length;
      const at = indexOf(root);
      switch (btn.getAttribute("data-presentation-action")) {
        case "next":
          activate2(root.hasAttribute("data-loop") ? (at + 1) % total : at + 1, true);
          break;
        case "prev":
          activate2(root.hasAttribute("data-loop") && at === 0 ? total - 1 : at - 1, false);
          break;
        case "first":
          activate2(0);
          break;
        case "last":
          activate2(total - 1);
          break;
        case "notes":
          root.toggleAttribute("data-notes");
          break;
        case "fullscreen":
          triggerStateChange19(root, "fullscreen", { value: !root.hasAttribute("data-fullscreen") });
          break;
      }
    });
    bindKeyboard();
    bindHash();
    bindFullscreen();
    const hashId = decodeURIComponent(location.hash.slice(1));
    const hashIndex = hashId ? slidesOf(root).findIndex((s) => s.id === hashId) : -1;
    activate2(hashIndex >= 0 ? hashIndex : coerceIndex(root.dataset.currentSlide, 0));
    applyScale();
  });
}
init19();
new MutationObserver(init19).observe(document, { childList: true, subtree: true });

// src/components/product-showcase/product-showcase.ts
var df$20 = defussGlobals();
var productShowcaseStates = ["default", "playing"];
function triggerStateChange20(showcase, stateName, _config) {
  const video = showcase.querySelector("video");
  switch (stateName) {
    case "default":
      if (video) {
        video.pause();
        video.currentTime = 0;
      }
      showcase.dataset.state = "default";
      break;
    case "playing":
      showcase.dataset.state = "playing";
      if (video) {
        video.muted = true;
        video.play().catch(() => {});
      }
      break;
  }
}
var productShowcaseApi = {
  setState(showcase, stateName, config = {}) {
    if (!productShowcaseStates.includes(stateName)) {
      throw new Error(`product-showcase: unknown state "${stateName}" (supported: ${productShowcaseStates.join(", ")})`);
    }
    triggerStateChange20(showcase, stateName, config);
    showcase.dataset.stateName = stateName;
    showcase._stateConfig = config;
  },
  getState(showcase) {
    const playing = showcase.dataset.state === "playing";
    return {
      name: showcase.dataset.stateName || (playing ? "playing" : "default"),
      config: showcase._stateConfig ?? {}
    };
  }
};
df$20.productShowcaseApi = productShowcaseApi;
df$20.productShowcaseStates = productShowcaseStates;
function init20() {
  document.querySelectorAll(".mk-showcase:not([data-init])").forEach((showcase) => {
    showcase.dataset.init = "";
    showcase.dataset.state = "default";
    showcase.api = {
      setState: (stateName, config) => productShowcaseApi.setState(showcase, stateName, config),
      getState: () => productShowcaseApi.getState(showcase)
    };
    showcase.querySelector(".mk-showcase-play")?.addEventListener("click", () => {
      productShowcaseApi.setState(showcase, "playing");
    });
    showcase.querySelector("video")?.addEventListener("pause", () => {
      if (showcase.dataset.state === "playing")
        productShowcaseApi.setState(showcase, "default");
    });
  });
}
init20();
new MutationObserver(init20).observe(document, { childList: true, subtree: true });

// src/components/resizer/resizer.ts
var df$21 = defussGlobals();
var resizerStates = ["default"];
var HANDLES = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];
var CLASS_NUMBERS = Array.from({ length: 81 }, (_, i) => i + 16);
var clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
var numAttr2 = (el, key, fallback) => {
  const v = parseFloat(el.dataset[key] ?? "");
  return Number.isFinite(v) ? v : fallback;
};
function targetOf(wrapper) {
  for (const el of Array.from(wrapper.children)) {
    if (!el.hasAttribute("data-handle"))
      return el;
  }
  return null;
}
function handleSet(wrapper) {
  const spec = (wrapper.dataset.handles || "se").trim();
  const requested = spec === "all" ? [...HANDLES] : spec.split(/[\s,]+/).filter((h) => HANDLES.includes(h));
  const axis = wrapper.dataset.axis || "both";
  if (axis === "both")
    return requested;
  const moves = (h) => axis === "w" ? /e|w/.test(h) : /n|s/.test(h);
  return requested.filter(moves);
}
function ladderTokens(wrapper, axis) {
  const custom = axis === "w" ? wrapper.dataset.wClasses : wrapper.dataset.hClasses;
  if (custom)
    return custom.trim().split(/\s+/);
  return CLASS_NUMBERS.map((n) => `${axis}-${n}`);
}
var LADDER_PX = new Map;
function tokenPx(wrapper, token, axis) {
  const key = axis + token;
  let px = LADDER_PX.get(key);
  if (px !== undefined)
    return px;
  const target = targetOf(wrapper);
  const had = Array.from(target.classList).filter((c) => /^[wh]-[\d.]+$/.test(c));
  had.forEach((c) => target.classList.remove(c));
  target.classList.add(token);
  const box = target.getBoundingClientRect();
  px = (axis === "w" ? box.width : box.height) / zoomOf(wrapper);
  target.classList.remove(token);
  had.forEach((c) => target.classList.add(c));
  LADDER_PX.set(key, px);
  return px;
}
function nearestToken(wrapper, ladder, wantedPx, axis) {
  let best = ladder[0];
  let bestD = Infinity;
  for (const token of ladder) {
    const d = Math.abs(tokenPx(wrapper, token, axis) - wantedPx);
    if (d < bestD) {
      bestD = d;
      best = token;
    }
  }
  return best;
}
function setClassSize(el, token, ladder) {
  const owned2 = new Set(ladder);
  for (const cls of Array.from(el.classList))
    if (owned2.has(cls) && cls !== token)
      el.classList.remove(cls);
  if (!el.classList.contains(token))
    el.classList.add(token);
}
function setPxSize(el, axis, px) {
  const prop = axis === "w" ? "width" : "height";
  const value = `${Math.round(px)}px`;
  if (el.style.getPropertyValue(prop) !== value)
    el.style.setProperty(prop, value);
}
function bounds(wrapper, axis) {
  const min = numAttr2(wrapper, axis === "w" ? "minW" : "minH", numAttr2(wrapper, "min", 80));
  const max = numAttr2(wrapper, axis === "w" ? "maxW" : "maxH", numAttr2(wrapper, "max", 2000));
  return [min, max];
}
function zoomOf(el) {
  const zs = getComputedStyle(el).zoom || "1";
  const z = zs.includes("%") ? parseFloat(zs) / 100 : parseFloat(zs);
  return Number.isFinite(z) && z > 0 ? z : 1;
}
function currentPx(wrapper, axis) {
  const target = targetOf(wrapper);
  if (!target)
    return 0;
  const box = target.getBoundingClientRect();
  const raw = axis === "w" ? box.width : box.height;
  return Math.round(raw / zoomOf(wrapper));
}
function applySize(wrapper, axis, px) {
  const target = targetOf(wrapper);
  if (!target)
    return;
  const mode = wrapper.dataset.resizeMode || "px";
  const [min, max] = bounds(wrapper, axis);
  const wanted = clamp(px, min, max);
  let resolved = wanted;
  if (mode === "classes") {
    const ladder = ladderTokens(wrapper, axis);
    setClassSize(target, nearestToken(wrapper, ladder, wanted, axis), ladder);
    resolved = currentPx(wrapper, axis);
  } else if (mode !== "controlled") {
    const step = Math.max(1, numAttr2(wrapper, "step", 1));
    resolved = Math.round(wanted / step) * step;
    setPxSize(target, axis, resolved);
  }
  if (mode !== "controlled") {
    const key = axis === "w" ? "width" : "height";
    const value = String(Math.round(resolved));
    if (wrapper.dataset[key] !== value)
      wrapper.dataset[key] = value;
  }
  wrapper.dispatchEvent(new CustomEvent("resizer-resize", {
    bubbles: true,
    detail: {
      axis,
      width: axis === "w" ? mode === "controlled" ? Math.round(wanted) : currentPx(wrapper, "w") : currentPx(wrapper, "w"),
      height: axis === "h" ? mode === "controlled" ? Math.round(wanted) : currentPx(wrapper, "h") : currentPx(wrapper, "h")
    }
  }));
}
function triggerStateChange21(wrapper, stateName, config = {}) {
  if (stateName !== "default")
    return;
  if (config.width !== undefined || wrapper._defaultSize)
    applySize(wrapper, "w", Number(config.width ?? wrapper._defaultSize?.[0]));
  if (config.height !== undefined || wrapper._defaultSize)
    applySize(wrapper, "h", Number(config.height ?? wrapper._defaultSize?.[1]));
}
var resizerApi = {
  setState(wrapper, stateName, config = {}) {
    if (!resizerStates.includes(stateName)) {
      throw new Error(`resizer: unknown state "${stateName}" (supported: ${resizerStates.join(", ")})`);
    }
    triggerStateChange21(wrapper, stateName, config);
    wrapper.dataset.stateName = stateName;
    wrapper._stateConfig = config;
  },
  getState(wrapper) {
    return {
      name: wrapper.dataset.stateName || "default",
      config: {
        ...wrapper._stateConfig,
        width: currentPx(wrapper, "w"),
        height: currentPx(wrapper, "h"),
        mode: wrapper.dataset.resizeMode || "px"
      }
    };
  }
};
df$21.resizerApi = resizerApi;
df$21.resizerStates = resizerStates;
var HANDLE_LABEL = {
  n: "top edge",
  s: "bottom edge",
  e: "right edge",
  w: "left edge",
  ne: "top-right corner",
  nw: "top-left corner",
  se: "bottom-right corner",
  sw: "bottom-left corner"
};
function makeHandle(wrapper, h) {
  const el = document.createElement("span");
  el.className = "resizer-handle";
  el.dataset.handle = h;
  el.setAttribute("role", "separator");
  el.setAttribute("tabindex", "0");
  if (h.length === 1)
    el.setAttribute("aria-orientation", h === "n" || h === "s" ? "horizontal" : "vertical");
  el.setAttribute("aria-label", `Resize ${HANDLE_LABEL[h]}`);
  el.setAttribute("data-ce-chrome", "");
  el.addEventListener("pointerdown", (ev) => startDrag(wrapper, el, ev));
  el.addEventListener("keydown", (ev) => handleKeys(wrapper, el, ev));
  return el;
}
function syncHandles(wrapper) {
  const want = handleSet(wrapper);
  for (const el of Array.from(wrapper.querySelectorAll(":scope > .resizer-handle"))) {
    if (!want.includes(el.dataset.handle))
      el.remove();
  }
  for (const h of want) {
    if (!wrapper.querySelector(`:scope > .resizer-handle[data-handle="${h}"]`))
      wrapper.appendChild(makeHandle(wrapper, h));
  }
}
function handleKeys(wrapper, handle, ev) {
  const sides = handle.dataset.handle;
  if (!sides)
    return;
  const dir = ev.key === "ArrowRight" || ev.key === "ArrowUp" ? 1 : ev.key === "ArrowLeft" || ev.key === "ArrowDown" ? -1 : 0;
  if (dir === 0 && ev.key !== "Home" && ev.key !== "End")
    return;
  ev.preventDefault();
  const step = (numAttr2(wrapper, "stepKey", 10) || 10) * (ev.shiftKey ? 10 : 1);
  const apply = (axis) => {
    const [min, max] = bounds(wrapper, axis);
    const cur = currentPx(wrapper, axis);
    applySize(wrapper, axis, ev.key === "Home" ? min : ev.key === "End" ? max : cur + dir * step);
  };
  if (sides.includes("e") || sides.includes("w"))
    apply("w");
  if (sides.includes("n") || sides.includes("s"))
    apply("h");
}
function startDrag(wrapper, handle, ev) {
  if (ev.button !== 0)
    return;
  ev.preventDefault();
  handle.setPointerCapture(ev.pointerId);
  const side = handle.dataset.handle || "se";
  const axis = wrapper.dataset.axis || "both";
  const startX = ev.clientX;
  const startY = ev.clientY;
  const startW = currentPx(wrapper, "w");
  const startH = currentPx(wrapper, "h");
  const z = zoomOf(wrapper);
  const dx = side.includes("w") ? -1 : side.includes("e") ? 1 : 0;
  const dy = side.includes("n") ? -1 : side.includes("s") ? 1 : 0;
  wrapper.dataset.resizing = side;
  const onUp = () => {
    delete wrapper.dataset.resizing;
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onUp);
    handle.removeEventListener("pointercancel", onUp);
    handle.removeEventListener("lostpointercapture", onUp);
    document.removeEventListener("pointercancel", onUp);
  };
  document.addEventListener("pointercancel", onUp);
  const onMove = (e) => {
    if (e.buttons === 0) {
      onUp();
      return;
    }
    if (dx !== 0 && axis !== "h")
      applySize(wrapper, "w", startW + dx * (e.clientX - startX) / z);
    if (dy !== 0 && axis !== "w")
      applySize(wrapper, "h", startH + dy * (e.clientY - startY) / z);
  };
  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onUp);
  handle.addEventListener("pointercancel", onUp);
  handle.addEventListener("lostpointercapture", onUp);
}
function init21() {
  document.querySelectorAll(".resizer:not([data-init])").forEach((wrapper) => {
    wrapper.dataset.init = "";
    if (!targetOf(wrapper))
      return;
    wrapper._defaultSize = [currentPx(wrapper, "w"), currentPx(wrapper, "h")];
    wrapper.api = {
      setState: (stateName, config) => resizerApi.setState(wrapper, stateName, config),
      getState: () => resizerApi.getState(wrapper)
    };
    syncHandles(wrapper);
    const target = targetOf(wrapper);
    target?.style.setProperty("resize", "none");
    new MutationObserver((records) => {
      for (const r of records) {
        if (r.attributeName === "data-handles" || r.attributeName === "data-axis") {
          syncHandles(wrapper);
          continue;
        }
        const axis = r.attributeName === "data-width" ? "w" : "h";
        const v = parseFloat(wrapper.dataset[axis === "w" ? "width" : "height"] ?? "");
        if (Number.isFinite(v) && Math.abs(currentPx(wrapper, axis) - v) > 0.5)
          applySize(wrapper, axis, v);
      }
    }).observe(wrapper, { attributes: true, attributeFilter: ["data-width", "data-height", "data-handles", "data-axis"] });
    wrapper.addEventListener("resizer-reset", () => resizerApi.setState(wrapper, "default"));
  });
}
init21();
new MutationObserver(init21).observe(document, { childList: true, subtree: true });

// src/components/sheet/sheet.ts
var df$22 = defussGlobals();
var sheetStates = ["default", "open"];
function triggerStateChange22(sheet, stateName, _config) {
  switch (stateName) {
    case "default":
      if (sheet.open)
        sheet.close();
      break;
    case "open":
      if (!sheet.open)
        sheet.showModal();
      break;
  }
}
var sheetApi = {
  setState(sheet, stateName, config = {}) {
    if (!sheetStates.includes(stateName)) {
      throw new Error(`sheet: unknown state "${stateName}" (supported: ${sheetStates.join(", ")})`);
    }
    triggerStateChange22(sheet, stateName, config);
    sheet.dataset.stateName = stateName;
    sheet._stateConfig = config;
  },
  getState(sheet) {
    return { name: sheet.dataset.stateName || "default", config: sheet._stateConfig ?? {} };
  }
};
df$22.sheetApi = sheetApi;
df$22.sheetStates = sheetStates;
function init22() {
  document.querySelectorAll("[data-sheet-trigger]:not([data-init])").forEach((trigger2) => {
    trigger2.dataset.init = "";
    const sheet = document.getElementById(trigger2.dataset.sheetTrigger);
    if (!sheet)
      return;
    trigger2.addEventListener("click", () => {
      sheet._trigger = trigger2;
      sheet.showModal();
    });
  });
  document.querySelectorAll("dialog.sheet:not([data-init])").forEach((sheet) => {
    sheet.dataset.init = "";
    sheet.api = {
      setState: (stateName, config) => sheetApi.setState(sheet, stateName, config),
      getState: () => sheetApi.getState(sheet)
    };
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet)
        sheet.close();
    });
    sheet.querySelectorAll("[data-sheet-close]").forEach((btn) => {
      btn.addEventListener("click", () => {
        sheet.close();
      });
    });
    sheet.addEventListener("close", () => {
      if (sheet.open)
        return;
      sheet.dataset.stateName = "default";
      if (sheet._trigger)
        sheet._trigger.focus();
    });
  });
}
init22();
new MutationObserver(init22).observe(document, { childList: true, subtree: true });

// src/components/sidebar/sidebar.ts
var df$23 = defussGlobals();
var sidebarStates = ["default", "collapsed"];
function triggerStateChange23(sidebar, stateName, _config) {
  switch (stateName) {
    case "default":
      sidebar.dataset.state = sidebar._defaultState ?? "expanded";
      break;
    case "collapsed":
      sidebar.dataset.state = "collapsed";
      break;
  }
}
var sidebarApi = {
  setState(sidebar, stateName, config = {}) {
    if (!sidebarStates.includes(stateName)) {
      throw new Error(`sidebar: unknown state "${stateName}" (supported: ${sidebarStates.join(", ")})`);
    }
    triggerStateChange23(sidebar, stateName, config);
    sidebar.dataset.stateName = stateName;
    sidebar._stateConfig = config;
  },
  getState(sidebar) {
    return {
      name: sidebar.dataset.state === "collapsed" ? "collapsed" : "default",
      config: sidebar._stateConfig ?? {}
    };
  }
};
df$23.sidebarApi = sidebarApi;
df$23.sidebarStates = sidebarStates;
function init23() {
  document.querySelectorAll(".app-sidebar:not([data-init])").forEach((sidebar) => {
    sidebar.dataset.init = "";
    sidebar._defaultState = sidebar.dataset.state || "expanded";
    sidebar.api = {
      setState: (stateName, config) => sidebarApi.setState(sidebar, stateName, config),
      getState: () => sidebarApi.getState(sidebar)
    };
    const triggerId = sidebar.id ? `[data-sidebar-trigger="${sidebar.id}"]` : ".sidebar-trigger";
    document.querySelectorAll(triggerId).forEach((trigger2) => {
      trigger2.addEventListener("click", () => {
        const state = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
        sidebar.dataset.state = state;
        sidebar.dataset.stateName = state === "collapsed" ? "collapsed" : "default";
      });
    });
    document.__sidebarAutoRo?.observe(sidebar.parentElement ?? sidebar);
    autoCollapseSidebar(sidebar);
  });
  document.querySelectorAll("[data-sidebar-mobile]:not([data-init])").forEach((trigger2) => {
    trigger2.dataset.init = "";
    const dialog = document.getElementById(trigger2.dataset.sidebarMobile);
    if (!dialog)
      return;
    trigger2.addEventListener("click", () => {
      dialog.showModal();
    });
    dialog.querySelectorAll(".sidebar-mobile-close").forEach((btn) => {
      btn.addEventListener("click", () => {
        dialog.close();
      });
    });
  });
}
var AUTO_COLLAPSE_BELOW = 24 * 16;
var AUTO_COLLAPSE_ABOVE = 28 * 16;
function autoCollapseSidebar(sidebar) {
  if (sidebar.dataset.stateName)
    return;
  const avail = (sidebar.parentElement ?? document.body).clientWidth || window.innerWidth;
  const collapsed = sidebar.dataset.state === "collapsed";
  if (!collapsed && avail < AUTO_COLLAPSE_BELOW)
    sidebar.dataset.state = "collapsed";
  else if (collapsed && avail >= AUTO_COLLAPSE_ABOVE) {
    sidebar.dataset.state = sidebar._defaultState ?? "expanded";
  }
}
if (typeof ResizeObserver !== "undefined" && !document.__sidebarAutoRo) {
  document.__sidebarAutoRo = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target.classList?.contains("app-sidebar"))
        autoCollapseSidebar(entry.target);
      entry.target.querySelectorAll?.(".app-sidebar").forEach(autoCollapseSidebar);
    }
  });
}
init23();
new MutationObserver(init23).observe(document, { childList: true, subtree: true });
if (!document.__sidebarKbInit) {
  document.__sidebarKbInit = true;
  bindGlobalKeys((e) => {
    if (!(e.metaKey || e.ctrlKey) || e.key !== "b")
      return;
    const sidebar = document.querySelector(".app-sidebar");
    if (!sidebar)
      return;
    e.preventDefault();
    sidebar.dataset.state = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
    sidebar.dataset.stateName = sidebar.dataset.state === "collapsed" ? "collapsed" : "default";
    return true;
  });
}

// src/components/slider/slider.ts
var df$24 = defussGlobals();
var sliderStates = ["default", "disabled"];
function updateSliderValue(el) {
  const min = parseFloat(el.min || 0);
  const max = parseFloat(el.max || 100);
  const value = parseFloat(el.value);
  const percent = max === min ? 0 : (value - min) / (max - min) * 100;
  el.style.setProperty("--slider-value", `${percent}%`);
}
function triggerStateChange24(el, stateName, config) {
  switch (stateName) {
    case "default":
      el.disabled = el._defaultDisabled ?? false;
      if (config?.value !== undefined)
        el.value = String(config.value);
      updateSliderValue(el);
      break;
    case "disabled":
      el.disabled = true;
      break;
  }
}
var sliderApi = {
  setState(el, stateName, config = {}) {
    if (!sliderStates.includes(stateName)) {
      throw new Error(`slider: unknown state "${stateName}" (supported: ${sliderStates.join(", ")})`);
    }
    triggerStateChange24(el, stateName, config);
    el.dataset.stateName = stateName;
    el._stateConfig = config;
  },
  getState(el) {
    return {
      name: el.disabled ? "disabled" : "default",
      config: { ...el._stateConfig, value: el.value }
    };
  }
};
df$24.sliderApi = sliderApi;
df$24.sliderStates = sliderStates;
function init24() {
  document.querySelectorAll(".slider:not([data-init])").forEach((el) => {
    el.dataset.init = "";
    el._defaultDisabled = el.disabled;
    el.api = {
      setState: (stateName, config) => sliderApi.setState(el, stateName, config),
      getState: () => sliderApi.getState(el)
    };
    updateSliderValue(el);
    el.addEventListener("input", () => updateSliderValue(el));
  });
}
init24();
new MutationObserver(init24).observe(document, { childList: true, subtree: true });

// src/components/sortable/sortable.ts
var df$25 = defussGlobals();
var dfDollar8 = defussQuery();
var sortableStates = ["default"];
var drag = null;
var sortableLabels = (list) => dfDollar8(list).find(".sortable-item").map((item) => dfDollar8(item).find("span:not(.sortable-handle):not(.sortable-moves)").text().trim());
function triggerStateChange25(list, stateName, config) {
  if (stateName !== "default")
    return;
  dfDollar8(list).append(list._defaultOrder ?? []);
  list._syncMoves?.();
  if (config?.index !== undefined) {
    const item = dfDollar8(list).find(".sortable-item")[Number(config.index)];
    list._setActive?.(item);
  }
}
var sortableApi = {
  setState(list, stateName, config = {}) {
    if (!sortableStates.includes(stateName)) {
      throw new Error(`sortable: unknown state "${stateName}" (supported: ${sortableStates.join(", ")})`);
    }
    triggerStateChange25(list, stateName, config);
    list.dataset.stateName = stateName;
    list._stateConfig = config;
  },
  getState(list) {
    const items = Array.from(dfDollar8(list).find(".sortable-item"));
    const active2 = dfDollar8(list).find(".sortable-item[data-active]")[0];
    return {
      name: list.dataset.stateName || "default",
      config: {
        ...list._stateConfig,
        order: sortableLabels(list),
        activeIndex: active2 ? items.indexOf(active2) : -1
      }
    };
  }
};
df$25.sortableApi = sortableApi;
df$25.sortableStates = sortableStates;
function init25() {
  document.querySelectorAll(".sortable:not([data-init])").forEach((list) => {
    list.dataset.init = "";
    list.api = {
      setState: (stateName, config) => sortableApi.setState(list, stateName, config),
      getState: () => sortableApi.getState(list)
    };
    const isHorizontal = list.dataset.orientation === "horizontal";
    const NEXT_KEY = isHorizontal ? "ArrowRight" : "ArrowDown";
    const PREV_KEY = isHorizontal ? "ArrowLeft" : "ArrowUp";
    const NEXT_LIST_KEY = isHorizontal ? "ArrowDown" : "ArrowRight";
    const PREV_LIST_KEY = isHorizontal ? "ArrowUp" : "ArrowLeft";
    let liveRegion = list.nextElementSibling;
    if (!liveRegion || !liveRegion.classList.contains("sortable-live")) {
      liveRegion = document.createElement("span");
      liveRegion.className = "sortable-live";
      liveRegion.setAttribute("aria-live", "assertive");
      liveRegion.setAttribute("role", "status");
      dfDollar8(list).after(liveRegion);
    }
    function announce(msg) {
      dfDollar8(liveRegion).text("");
      requestAnimationFrame(() => {
        dfDollar8(liveRegion).text(msg);
      });
    }
    function getItems() {
      return Array.from(dfDollar8(list).find('.sortable-item:not([aria-disabled="true"])'));
    }
    function getAllItems() {
      return Array.from(dfDollar8(list).find(".sortable-item"));
    }
    const isLocked = (el) => el.getAttribute("aria-disabled") === "true";
    const listName = () => list.getAttribute("aria-label") || "the list";
    function place(item, target) {
      const all = getAllItems();
      const from = all.indexOf(item);
      const n = all.length;
      const fixed = all.map(isLocked);
      const t = Math.max(0, Math.min(n - 1, target));
      const dir = t < from ? -1 : 1;
      let slot = t;
      while (slot >= 0 && slot < n && fixed[slot])
        slot += dir;
      if (slot < 0 || slot >= n) {
        slot = t;
        while (slot >= 0 && slot < n && fixed[slot])
          slot -= dir;
      }
      if (slot < 0 || slot >= n || slot === from)
        return -1;
      const movable = all.filter((el) => !isLocked(el) && el !== item);
      const k = fixed.slice(0, slot).filter((f) => !f).length;
      movable.splice(k, 0, item);
      let m = 0;
      dfDollar8(list).append(all.map((el, i) => fixed[i] ? el : movable[m++]));
      return slot;
    }
    function syncMoves() {
      const all = getAllItems();
      const free = all.map((el) => !isLocked(el));
      all.forEach((item, i) => {
        const label = getItemLabel(item);
        dfDollar8(item).find(".sortable-move").each(function() {
          const up = this.dataset.move === "up";
          const room = up ? free.slice(0, i).some(Boolean) : free.slice(i + 1).some(Boolean);
          dfDollar8(this).prop("disabled", isLocked(item) || !room);
          if (!this.hasAttribute("aria-label") || this.dataset.autoLabel !== undefined) {
            dfDollar8(this).attr("aria-label", `Move ${label} ${up ? "up" : "down"}`).data("autoLabel", "");
          }
        });
      });
    }
    list._syncMoves = syncMoves;
    function moved(item, slot, focus = true) {
      const n = getAllItems().length;
      announce(`${getItemLabel(item)}, moved to position ${slot + 1} of ${n}`);
      setActive(item, focus);
      syncMoves();
      list.dispatchEvent(new CustomEvent("sortable-change", {
        bubbles: true,
        detail: { item, index: slot }
      }));
    }
    function receive(item, index, from, focus = true) {
      const all = getAllItems();
      const before = all[Math.max(0, index)];
      if (before)
        dfDollar8(before).before(item);
      else
        dfDollar8(list).append(item);
      const slot = getAllItems().indexOf(item);
      announce(`${getItemLabel(item)}, moved to ${listName()}, position ${slot + 1} of ${getAllItems().length}`);
      setActive(item, focus);
      syncMoves();
      from._released?.(item);
      list.dispatchEvent(new CustomEvent("sortable-change", {
        bubbles: true,
        detail: { item, index: slot, from }
      }));
    }
    list._receive = receive;
    list._released = (item) => {
      const items = getItems();
      if (items.length && !items.some((el) => el.getAttribute("tabindex") === "0")) {
        dfDollar8(items[0]).attr("tabindex", "0");
      }
      if (!items.length)
        list.removeAttribute("data-active-index");
      syncMoves();
      list.dispatchEvent(new CustomEvent("sortable-change", {
        bubbles: true,
        detail: { item, index: -1, to: item.closest(".sortable") }
      }));
    };
    const groupLists = () => {
      const group = list.dataset.group;
      return group ? Array.from(document.querySelectorAll(".sortable[data-group]")).filter((l) => l.dataset.group === group) : [list];
    };
    function getActiveItem() {
      return dfDollar8(list).find(".sortable-item[data-active]")[0];
    }
    function setActive(item, focus = true) {
      getAllItems().forEach((el) => {
        dfDollar8(el).data("active", null).attr("tabindex", "-1");
      });
      if (item) {
        dfDollar8(item).data("active", "").attr("tabindex", "0");
        list.dataset.activeIndex = String(getItems().indexOf(item));
        if (focus)
          item.focus();
      } else {
        list.removeAttribute("data-active-index");
      }
    }
    list._setActive = setActive;
    list._defaultOrder = getAllItems();
    function getItemLabel(item) {
      const clone = item.cloneNode(true);
      clone.querySelectorAll(".sortable-handle, .sortable-moves, .sortable-move").forEach((el) => el.remove());
      return clone.textContent.trim();
    }
    const allItems = getAllItems();
    allItems.forEach((item, i) => {
      dfDollar8(item).attr("tabindex", i === 0 ? "0" : "-1");
    });
    syncMoves();
    const accepts = () => !!drag && (drag.from === list || !!list.dataset.group && list.dataset.group === drag.from.dataset.group);
    const clearOver = () => {
      dfDollar8(list).find("[data-over]").data("over", null);
      dfDollar8(list).data("over", null);
    };
    list.addEventListener("dragstart", (e) => {
      const item = e.target.closest?.(".sortable-item");
      if (!item || !list.contains(item) || isLocked(item))
        return;
      drag = { item, from: list };
      dfDollar8(item).data("dragging", "");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");
    });
    list.addEventListener("dragend", () => {
      if (drag)
        dfDollar8(drag.item).data("dragging", null);
      groupLists().forEach((l) => {
        dfDollar8(l).data("over", null);
        dfDollar8(l).find("[data-over]").data("over", null);
      });
      drag = null;
    });
    list.addEventListener("dragover", (e) => {
      if (!accepts())
        return;
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const item = e.target.closest?.(".sortable-item");
      clearOver();
      if (item && list.contains(item)) {
        if (item === drag.item)
          return;
        const rect = item.getBoundingClientRect();
        const midpoint = isHorizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
        const pos = isHorizontal ? e.clientX : e.clientY;
        dfDollar8(item).data("over", pos < midpoint ? "before" : "after");
      } else {
        dfDollar8(list).data("over", "end");
      }
    });
    list.addEventListener("dragleave", (e) => {
      if (!list.contains(e.relatedTarget))
        clearOver();
    });
    list.addEventListener("drop", (e) => {
      if (!accepts())
        return;
      e.preventDefault();
      const target = dfDollar8(list).find(".sortable-item[data-over]")[0];
      const position = target ? dfDollar8(target).data("over") : "end";
      clearOver();
      const { item: dragged, from } = drag;
      const all = getAllItems();
      if (from !== list) {
        const index = target ? all.indexOf(target) + (position === "before" ? 0 : 1) : all.length;
        receive(dragged, index, from);
        return;
      }
      if (target === dragged)
        return;
      const fromIndex = all.indexOf(dragged);
      let slotTarget = target ? all.indexOf(target) + (position === "before" ? 0 : 1) : all.length;
      if (fromIndex < slotTarget)
        slotTarget -= 1;
      const slot = place(dragged, slotTarget);
      if (slot >= 0)
        moved(dragged, slot);
    });
    list.addEventListener("click", (e) => {
      const button = e.target.closest?.(".sortable-move");
      if (!button || button.disabled || !list.contains(button))
        return;
      const item = button.closest(".sortable-item");
      const from = getAllItems().indexOf(item);
      const slot = place(item, from + (button.dataset.move === "up" ? -1 : 1));
      if (slot < 0)
        return;
      moved(item, slot, false);
      const target = button.disabled ? item.querySelector(`.sortable-move[data-move="${button.dataset.move === "up" ? "down" : "up"}"]`) : button;
      target?.focus();
    });
    list.addEventListener("keydown", (e) => {
      if (e.target.closest?.(".sortable-move"))
        return;
      const active2 = getActiveItem() || dfDollar8(list).find('.sortable-item[tabindex="0"]')[0];
      if (!active2)
        return;
      const items = getItems();
      const idx = items.indexOf(active2);
      if (e.key === NEXT_KEY && !e.altKey) {
        e.preventDefault();
        const next = items[idx + 1];
        if (next)
          setActive(next);
      } else if (e.key === PREV_KEY && !e.altKey) {
        e.preventDefault();
        const prev = items[idx - 1];
        if (prev)
          setActive(prev);
      } else if (e.key === "Home") {
        e.preventDefault();
        if (items.length)
          setActive(items[0]);
      } else if (e.key === "End") {
        e.preventDefault();
        if (items.length)
          setActive(items[items.length - 1]);
      } else if ((e.key === NEXT_KEY || e.key === PREV_KEY) && e.altKey) {
        e.preventDefault();
        const from = getAllItems().indexOf(active2);
        const slot = place(active2, from + (e.key === NEXT_KEY ? 1 : -1));
        if (slot >= 0)
          moved(active2, slot);
      } else if ((e.key === NEXT_LIST_KEY || e.key === PREV_LIST_KEY) && e.altKey && list.dataset.group) {
        e.preventDefault();
        const lists = groupLists();
        const other = lists[lists.indexOf(list) + (e.key === NEXT_LIST_KEY ? 1 : -1)];
        if (!other?._receive)
          return;
        other._receive(active2, getAllItems().indexOf(active2), list);
      }
    });
    list.addEventListener("focusin", (e) => {
      const target = e.target;
      const item = target.closest(".sortable-item");
      if (!item || !list.contains(item))
        return;
      setActive(item, target === item);
    });
  });
}
init25();
new MutationObserver(init25).observe(document, { childList: true, subtree: true });

// src/components/steps/steps.ts
var df$26 = defussGlobals();
var stepsStates = ["default"];
var numAttr3 = (el, key, fallback) => {
  const v = parseInt(el.dataset[key] ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
};
function renderSteps(ol) {
  const items = Array.from(ol.querySelectorAll(".step"));
  if (items.length === 0)
    return;
  const total = items.length;
  const active2 = Math.min(total, Math.max(1, numAttr3(ol, "activeStep", 1)));
  const raw = ol.dataset.errorStep ?? "";
  const error = raw === "true" ? active2 : parseInt(raw, 10) || 0;
  if (ol.dataset.activeStep !== String(active2))
    ol.dataset.activeStep = String(active2);
  items.forEach((item, i) => {
    const n = i + 1;
    const status = n === error ? "error" : n < active2 ? "complete" : n === active2 ? "current" : null;
    if (status)
      item.dataset.status = status;
    else
      delete item.dataset.status;
    if (status === "current")
      item.setAttribute("aria-current", "step");
    else
      item.removeAttribute("aria-current");
  });
}
function triggerStateChange26(ol, stateName, config = {}) {
  if (stateName !== "default")
    return;
  const a = config.activeStep ?? config.step ?? config.page;
  if (a !== undefined)
    ol.dataset.activeStep = String(a);
  if (config.errorStep !== undefined)
    ol.dataset.errorStep = String(config.errorStep);
  else if (config.activeStepError === true)
    ol.dataset.errorStep = ol.dataset.activeStep ?? "1";
  else if (config.activeStepError === false)
    delete ol.dataset.errorStep;
  if (config.size !== undefined)
    ol.dataset.size = String(config.size);
  renderSteps(ol);
}
var stepsApi = {
  setState(ol, stateName, config = {}) {
    if (!stepsStates.includes(stateName)) {
      throw new Error(`steps: unknown state "${stateName}" (supported: ${stepsStates.join(", ")})`);
    }
    triggerStateChange26(ol, stateName, config);
    ol.dataset.stateName = stateName;
    ol._stateConfig = config;
  },
  getState(ol) {
    return {
      name: ol.dataset.stateName || "default",
      config: {
        ...ol._stateConfig,
        activeStep: numAttr3(ol, "activeStep", 1),
        activeStepError: numAttr3(ol, "errorStep", 0) === numAttr3(ol, "activeStep", 1) && numAttr3(ol, "errorStep", 0) !== 0,
        errorStep: numAttr3(ol, "errorStep", 0),
        size: ol.dataset.size ?? "md"
      }
    };
  }
};
df$26.stepsApi = stepsApi;
df$26.stepsStates = stepsStates;
function init26() {
  document.querySelectorAll(".steps:not([data-init])").forEach((ol) => {
    ol.dataset.init = "";
    ol.api = {
      setState: (stateName, config) => stepsApi.setState(ol, stateName, config),
      getState: () => stepsApi.getState(ol)
    };
    if (ol.hasAttribute("data-active-step"))
      renderSteps(ol);
    new MutationObserver(() => {
      if (ol.hasAttribute("data-active-step"))
        renderSteps(ol);
    }).observe(ol, {
      attributes: true,
      attributeFilter: ["data-active-step", "data-error-step", "data-size"]
    });
    ol.addEventListener("click", (e) => {
      const item = e.target.closest(".step[data-clickable]");
      if (!item || !ol.contains(item))
        return;
      const items = Array.from(ol.querySelectorAll(".step"));
      ol.dataset.activeStep = String(items.indexOf(item) + 1);
      delete ol.dataset.errorStep;
    });
    ol.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ")
        return;
      const ind = e.target.closest(".step[data-clickable] .step-indicator");
      if (!ind)
        return;
      e.preventDefault();
      ind.click();
    });
  });
}
init26();
new MutationObserver(init26).observe(document, { childList: true, subtree: true });

// src/components/tabs/tabs.ts
var df$27 = defussGlobals();
var tabsStates = ["default", "active"];
var activateTab = (tab, triggers) => {
  triggers.forEach((t) => {
    t.setAttribute("aria-selected", "false");
    t.setAttribute("tabindex", "-1");
    t.dataset.stateName = "default";
    const panel2 = document.getElementById(t.getAttribute("aria-controls"));
    if (panel2)
      panel2.hidden = true;
  });
  tab.setAttribute("aria-selected", "true");
  tab.removeAttribute("tabindex");
  tab.dataset.stateName = "active";
  const panel = document.getElementById(tab.getAttribute("aria-controls"));
  if (panel)
    panel.hidden = false;
};
function triggerStateChange27(tab, triggers, stateName, _config) {
  switch (stateName) {
    case "default":
      if (tab._defaultSelected)
        activateTab(tab, triggers);
      else
        activateTab(triggers.find((t) => t._defaultSelected) || triggers[0], triggers);
      break;
    case "active":
      if (!tab.disabled)
        activateTab(tab, triggers);
      break;
  }
}
var tabsApi = {
  setState(tab, stateName, config = {}) {
    if (!tabsStates.includes(stateName)) {
      throw new Error(`tabs: unknown state "${stateName}" (supported: ${tabsStates.join(", ")})`);
    }
    const triggers = Array.from(tab.closest('[role="tablist"]').querySelectorAll('[role="tab"]'));
    triggerStateChange27(tab, triggers, stateName, config);
    tab._stateConfig = config;
  },
  getState(tab) {
    return {
      name: tab.getAttribute("aria-selected") === "true" ? "active" : "default",
      config: tab._stateConfig ?? {}
    };
  }
};
df$27.tabsApi = tabsApi;
df$27.tabsStates = tabsStates;
function init27() {
  document.querySelectorAll('[role="tablist"]:not([data-init])').forEach((tablist) => {
    tablist.dataset.init = "";
    if (!tablist.querySelector(".tab-trigger"))
      return;
    const triggers = Array.from(tablist.querySelectorAll('[role="tab"]'));
    triggers.forEach((t) => {
      t._defaultSelected = t.getAttribute("aria-selected") === "true";
      t.api = {
        setState: (stateName, config) => tabsApi.setState(t, stateName, config),
        getState: () => tabsApi.getState(t)
      };
    });
    const orientation = tablist.getAttribute("aria-orientation") || "horizontal";
    triggers.forEach((trigger2) => {
      trigger2.addEventListener("click", () => {
        activateTab(trigger2, triggers);
      });
      trigger2.addEventListener("keydown", (e) => {
        const current = triggers.indexOf(trigger2);
        let next;
        const forward = orientation === "horizontal" ? "ArrowRight" : "ArrowDown";
        const backward = orientation === "horizontal" ? "ArrowLeft" : "ArrowUp";
        switch (e.key) {
          case forward:
            e.preventDefault();
            for (let i = 1;i <= triggers.length; i++) {
              const c = triggers[(current + i) % triggers.length];
              if (!c.disabled) {
                next = c;
                break;
              }
            }
            break;
          case backward:
            e.preventDefault();
            for (let i = 1;i <= triggers.length; i++) {
              const c = triggers[(current - i + triggers.length) % triggers.length];
              if (!c.disabled) {
                next = c;
                break;
              }
            }
            break;
          case "Home":
            e.preventDefault();
            next = triggers.find((t) => !t.disabled);
            break;
          case "End":
            e.preventDefault();
            next = triggers.slice().reverse().find((t) => !t.disabled);
            break;
        }
        if (next && !next.disabled) {
          activateTab(next, triggers);
          next.focus();
        }
      });
    });
  });
}
init27();
new MutationObserver(init27).observe(document, { childList: true, subtree: true });

// src/components/theme-switcher/theme-switcher.ts
var df$28 = defussGlobals();
var dfDollar9 = defussQuery();
var themeSwitcherStates = ["default", "open"];
var STORAGE_KEY = "defuss-shadcn-color-theme";
var LINK_ID = "theme-css";
var THEME_EVENT = "defuss-theme-change";
function store(key, value) {
  try {
    if (key === undefined)
      return localStorage.getItem(STORAGE_KEY);
    if (value === null)
      localStorage.removeItem(key);
    else
      localStorage.setItem(key, value);
  } catch {}
}
function themeHref(root, id) {
  if (root.dataset.themeBase)
    return `${root.dataset.themeBase}/${id}.css`;
  const tokens2 = document.getElementById("tokens-css") || document.querySelector('link[href*="default-semantic-tokens.css"]');
  if (tokens2)
    return new URL(`../${id}.css`, tokens2.href).href;
  return `${id}.css`;
}
function applyThemeId(root, id) {
  let link = document.getElementById(LINK_ID);
  if (!id || id === "default") {
    link?.remove();
    store(STORAGE_KEY, null);
    loadTheme("default").catch(() => {
      return;
    });
    syncTrigger(root, "default");
    document.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { id: "default" } }));
    return;
  }
  store(STORAGE_KEY, id);
  if (link && link.dataset.themeId === id) {
    syncTrigger(root, id);
    return;
  }
  link?.remove();
  link = document.createElement("link");
  link.id = LINK_ID;
  link.rel = "stylesheet";
  link.dataset.themeId = id;
  link.href = themeHref(root, id);
  const tokens2 = document.getElementById("tokens-css") || document.querySelector('link[href*="default-semantic-tokens.css"]');
  if (tokens2)
    dfDollar9(tokens2).after(link);
  else
    dfDollar9(document.head).append(link);
  loadTheme(id).catch(() => {
    return;
  });
  syncTrigger(root, id);
  document.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { id } }));
}
function syncTrigger(root, id) {
  const $root = dfDollar9(root);
  const trigger2 = $root.find(".theme-switcher-trigger")[0];
  const items = Array.from($root.find(".theme-switcher-item"));
  const active2 = items.find((i) => i.dataset.themeId === id);
  items.forEach((i) => dfDollar9(i).attr("aria-checked", i === active2 ? "true" : "false"));
  if (!trigger2)
    return;
  const dot = dfDollar9(trigger2).find(".theme-switcher-dot")[0];
  const label = dfDollar9(trigger2).find(".theme-switcher-label")[0];
  const first = active2?.dataset.themeColors?.split(",")[0]?.trim();
  if (dot)
    dfDollar9(dot).css("background", first || "");
  if (label && (active2 || id === "default"))
    dfDollar9(label).text(active2?.dataset.themeLabel || "Default");
  root.dataset.themeId = id;
}
function triggerStateChange28(menu, stateName, _config) {
  switch (stateName) {
    case "default":
      try {
        menu.hidePopover();
      } catch {}
      break;
    case "open":
      safeShowPopover(menu);
      break;
  }
}
var themeSwitcherApi = {
  setState(menu, stateName, config = {}) {
    if (!themeSwitcherStates.includes(stateName)) {
      throw new Error(`theme-switcher: unknown state "${stateName}" (supported: ${themeSwitcherStates.join(", ")})`);
    }
    triggerStateChange28(menu, stateName, config);
    menu.dataset.stateName = stateName;
    menu._stateConfig = config;
  },
  getState(menu) {
    return { name: menu.dataset.stateName || "default", config: menu._stateConfig ?? {} };
  },
  select(menu, id) {
    const root = menu.closest(".theme-switcher");
    if (!root)
      throw new Error("theme-switcher: menu is not inside a .theme-switcher root");
    applyThemeId(root, id);
  }
};
df$28.themeSwitcherApi = themeSwitcherApi;
df$28.themeSwitcherStates = themeSwitcherStates;
function init28() {
  document.querySelectorAll(".theme-switcher-menu:not([data-init])").forEach((menu) => {
    menu.dataset.init = "";
    const root = menu.closest(".theme-switcher");
    const trigger2 = root?.querySelector(".theme-switcher-trigger") ?? (menu.id && document.querySelector(`[popovertarget="${menu.id}"]`));
    const getItems = () => Array.from(menu.querySelectorAll(".theme-switcher-item"));
    if (trigger2) {
      const anchorId = `--theme-switcher-${menu.id || "menu"}`;
      dfDollar9(trigger2).css("anchorName", anchorId);
      dfDollar9(menu).css("positionAnchor", anchorId);
    }
    menu.addEventListener("toggle", () => {
      if (trigger2)
        dfDollar9(trigger2).attr("aria-expanded", menu.matches(":popover-open") ? "true" : "false");
      if (menu.matches(":popover-open")) {
        const first = getItems()[0];
        first?.focus();
        if (first)
          requestAnimationFrame(() => {
            if (menu.matches(":popover-open") && document.activeElement === trigger2)
              first.focus();
          });
      }
    });
    getItems().forEach((item) => {
      const holder = item.querySelector(".theme-switcher-dots");
      if (holder && !holder.childElementCount) {
        const spans = (item.dataset.themeColors || "").split(",").slice(0, 5).map((c) => c.trim()).filter(Boolean).map((c) => `<span style="background:${c}"></span>`).join("");
        dfDollar9(holder).html(spans);
      }
    });
    menu.addEventListener("click", (e) => {
      const item = e.target.closest(".theme-switcher-item");
      if (!item || !root)
        return;
      applyThemeId(root, item.dataset.themeId || "default");
      menu.hidePopover();
      trigger2?.focus();
    });
    menu.addEventListener("keydown", (e) => {
      const items = getItems();
      const idx = items.indexOf(document.activeElement);
      let next = -1;
      if (e.key === "ArrowDown")
        next = idx < 0 ? 0 : (idx + 1) % items.length;
      else if (e.key === "ArrowUp")
        next = idx < 0 ? 0 : (idx - 1 + items.length) % items.length;
      else if (e.key === "Home")
        next = 0;
      else if (e.key === "End")
        next = items.length - 1;
      if (next >= 0) {
        e.preventDefault();
        items[next].focus();
      }
    });
    menu.api = {
      setState: (stateName, config) => themeSwitcherApi.setState(menu, stateName, config),
      getState: () => themeSwitcherApi.getState(menu)
    };
    if (root) {
      const initial = document.getElementById(LINK_ID)?.dataset.themeId || store() || "default";
      if (initial !== "default" || document.getElementById(LINK_ID))
        syncTrigger(root, initial);
    }
  });
}
document.addEventListener(THEME_EVENT, (e) => {
  const id = e.detail?.id || "default";
  document.querySelectorAll(".theme-switcher").forEach((root) => syncTrigger(root, id));
});
init28();
new MutationObserver(init28).observe(document, { childList: true, subtree: true });

// src/components/toast/toast.ts
var df$29 = defussGlobals();
var dfDollar10 = defussQuery();
var toastStates = ["default"];
function triggerStateChange29(container, stateName, _config) {
  if (stateName !== "default")
    return;
  container.querySelectorAll(".toast").forEach((el) => toastDismiss(el));
}
var toastApi = {
  setState(container, stateName, config = {}) {
    if (!toastStates.includes(stateName)) {
      throw new Error(`toast: unknown state "${stateName}" (supported: ${toastStates.join(", ")})`);
    }
    triggerStateChange29(container, stateName, config);
    container.dataset.stateName = stateName;
    container._stateConfig = config;
  },
  getState(container) {
    return {
      name: container.dataset.stateName || "default",
      config: { ...container._stateConfig, count: container.querySelectorAll(".toast").length }
    };
  }
};
df$29.toastApi = toastApi;
df$29.toastStates = toastStates;
var DURATION = 4000;
var MAX_VISIBLE = 3;
var toastCallbacks = new WeakMap;
var toastContainer = document.getElementById("toast-container");
if (!toastContainer) {
  toastContainer = document.createElement("div");
  toastContainer.id = "toast-container";
  toastContainer.className = "toast-container";
  toastContainer.setAttribute("aria-label", "Notifications");
  toastContainer.setAttribute("data-position", "bottom-right");
  dfDollar10(document.body).append(toastContainer);
}
var stackToasts = (container) => {
  let offset = 0;
  for (const t of container.querySelectorAll(".toast")) {
    t.style.setProperty("--toast-stack", `${offset}px`);
    offset += t.getBoundingClientRect().height + 8;
  }
};
var toastDismiss = (el, callback) => {
  if (!el || !el.parentNode)
    return;
  const container = el.parentNode;
  el.animate([{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(0.5rem)" }], { duration: 200, easing: "ease", fill: "forwards" }).finished.then(() => {
    try {
      el.hidePopover();
    } catch {}
    dfDollar10(el).remove();
    stackToasts(container);
    if (callback)
      callback();
  });
};
var toastCreate = (options) => {
  const o = typeof options === "string" ? { title: options } : options;
  const { title, description, variant, action, onDismiss, size, density } = o;
  const duration = o.duration != null ? o.duration : DURATION;
  const el = document.createElement("div");
  el.className = "toast";
  el.setAttribute("role", variant === "destructive" ? "alert" : "status");
  el.setAttribute("aria-live", variant === "destructive" ? "assertive" : "polite");
  el.setAttribute("aria-atomic", "true");
  el.setAttribute("popover", "manual");
  if (variant)
    el.setAttribute("data-variant", variant);
  if (size)
    el.setAttribute("data-size", size);
  if (density)
    el.setAttribute("data-density", density);
  const icons = {
    success: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/></svg>',
    warning: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>',
    info: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
    destructive: '<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>'
  };
  const contentEl = document.createElement("div");
  contentEl.className = "toast-content";
  if (variant && icons[variant]) {
    dfDollar10(contentEl).append(dfDollar10(icons[variant]));
  }
  const textDiv = document.createElement("div");
  textDiv.className = "toast-text";
  if (title) {
    const p = document.createElement("p");
    p.className = "toast-title";
    dfDollar10(p).text(title);
    dfDollar10(textDiv).append(p);
  }
  if (description) {
    const p = document.createElement("p");
    p.className = "toast-description";
    dfDollar10(p).text(description);
    dfDollar10(textDiv).append(p);
  }
  dfDollar10(contentEl).append(textDiv);
  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.dataset.toastClose = "";
  dfDollar10(closeBtn).html('<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>');
  dfDollar10(contentEl).append(closeBtn);
  dfDollar10(el).append(contentEl);
  if (action) {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "toast-actions";
    const actionBtn = document.createElement("button");
    actionBtn.className = "btn";
    actionBtn.setAttribute("data-variant", "outline");
    actionBtn.setAttribute("data-size", "sm");
    actionBtn.dataset.toastAction = "";
    dfDollar10(actionBtn).text(action.label);
    dfDollar10(actionsDiv).append(actionBtn);
    dfDollar10(el).append(actionsDiv);
  }
  dfDollar10(toastContainer).append(el);
  el.showPopover();
  stackToasts(toastContainer);
  toastCallbacks.set(el, { onDismiss, action });
  if (duration !== Infinity)
    setTimeout(() => {
      toastDismiss(el, onDismiss);
    }, duration);
  const toasts = toastContainer.querySelectorAll(".toast");
  if (toasts.length > MAX_VISIBLE)
    toastDismiss(toasts[0]);
  return el;
};
function init29() {
  document.querySelectorAll("#toast-container:not([data-init])").forEach((container) => {
    container.dataset.init = "";
    container.api = {
      setState: (stateName, config) => toastApi.setState(container, stateName, config),
      getState: () => toastApi.getState(container)
    };
    container.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-toast-close],[data-toast-action]");
      if (!btn)
        return;
      const toast = btn.closest(".toast");
      if (!toast)
        return;
      const cb = toastCallbacks.get(toast) ?? {};
      if (btn.hasAttribute("data-toast-action")) {
        if (cb.action)
          cb.action.onClick();
        toastDismiss(toast);
      } else
        toastDismiss(toast, cb.onDismiss);
    });
  });
}
init29();
new MutationObserver(init29).observe(document.body, { childList: true, subtree: true });
df$29.toast = {
  show: toastCreate,
  success: (o) => toastCreate(Object.assign(typeof o === "string" ? { title: o } : o, { variant: "success" })),
  warning: (o) => toastCreate(Object.assign(typeof o === "string" ? { title: o } : o, { variant: "warning" })),
  info: (o) => toastCreate(Object.assign(typeof o === "string" ? { title: o } : o, { variant: "info" })),
  error: (o) => toastCreate(Object.assign(typeof o === "string" ? { title: o } : o, { variant: "destructive" })),
  dismiss: () => {
    toastContainer.querySelectorAll(".toast").forEach((el) => {
      toastDismiss(el);
    });
  }
};

// src/components/toggle/toggle.ts
var df$30 = defussGlobals();
var toggleStates = ["default", "pressed"];
function triggerStateChange30(toggle, stateName, _config) {
  switch (stateName) {
    case "default":
      toggle.setAttribute("aria-pressed", toggle._defaultPressed ?? "false");
      break;
    case "pressed":
      toggle.setAttribute("aria-pressed", "true");
      break;
  }
}
var toggleApi = {
  setState(toggle, stateName, config = {}) {
    if (!toggleStates.includes(stateName)) {
      throw new Error(`toggle: unknown state "${stateName}" (supported: ${toggleStates.join(", ")})`);
    }
    triggerStateChange30(toggle, stateName, config);
    toggle.dataset.stateName = stateName;
    toggle._stateConfig = config;
  },
  getState(toggle) {
    const pressed = toggle.getAttribute("aria-pressed") === "true";
    return {
      name: toggle.dataset.stateName || (pressed ? "pressed" : "default"),
      config: toggle._stateConfig ?? {}
    };
  }
};
df$30.toggleApi = toggleApi;
df$30.toggleStates = toggleStates;
function init30() {
  document.querySelectorAll(".toggle:not([data-init]):not(.toggle-group .toggle)").forEach((toggle) => {
    toggle.dataset.init = "";
    toggle._defaultPressed = toggle.getAttribute("aria-pressed") || "false";
    toggle.api = {
      setState: (stateName, config) => toggleApi.setState(toggle, stateName, config),
      getState: () => toggleApi.getState(toggle)
    };
    toggle.addEventListener("click", () => {
      const pressed = toggle.getAttribute("aria-pressed") === "true";
      toggle.setAttribute("aria-pressed", !pressed);
      toggle.dataset.stateName = !pressed ? "pressed" : "default";
    });
  });
}
init30();
new MutationObserver(init30).observe(document, { childList: true, subtree: true });

// src/components/toggle-group/toggle-group.ts
var df$31 = defussGlobals();
var toggleGroupStates = ["default", "disabled"];
function triggerStateChange31(group, stateName, _config) {
  switch (stateName) {
    case "default":
      group.removeAttribute("data-disabled");
      break;
    case "disabled":
      group.setAttribute("data-disabled", "");
      break;
  }
}
var toggleGroupApi = {
  setState(group, stateName, config = {}) {
    if (!toggleGroupStates.includes(stateName)) {
      throw new Error(`toggle-group: unknown state "${stateName}" (supported: ${toggleGroupStates.join(", ")})`);
    }
    triggerStateChange31(group, stateName, config);
    group.dataset.stateName = stateName;
    group._stateConfig = config;
  },
  getState(group) {
    return {
      name: group.hasAttribute("data-disabled") ? "disabled" : "default",
      config: group._stateConfig ?? {}
    };
  }
};
df$31.toggleGroupApi = toggleGroupApi;
df$31.toggleGroupStates = toggleGroupStates;
function init31() {
  document.querySelectorAll(".toggle-group:not([data-init])").forEach((group) => {
    group.dataset.init = "";
    group.api = {
      setState: (stateName, config) => toggleGroupApi.setState(group, stateName, config),
      getState: () => toggleGroupApi.getState(group)
    };
    const type = group.getAttribute("data-type") || "single";
    const getToggles = () => Array.from(group.querySelectorAll(".toggle:not(:disabled)"));
    const initTabindex = () => {
      const toggles = getToggles();
      if (toggles.length === 0)
        return;
      const pressed = toggles.find((t) => t.getAttribute("aria-pressed") === "true");
      const active2 = pressed || toggles[0];
      toggles.forEach((t) => {
        t.setAttribute("tabindex", t === active2 ? "0" : "-1");
      });
    };
    initTabindex();
    group.addEventListener("click", (e) => {
      const toggle = e.target.closest(".toggle");
      if (!toggle || toggle.disabled || group.hasAttribute("data-disabled"))
        return;
      const toggles = getToggles();
      const pressed = toggle.getAttribute("aria-pressed") === "true";
      if (type === "single") {
        toggles.forEach((t) => t.setAttribute("aria-pressed", "false"));
        if (!pressed)
          toggle.setAttribute("aria-pressed", "true");
      } else {
        toggle.setAttribute("aria-pressed", String(!pressed));
      }
      toggles.forEach((t) => t.setAttribute("tabindex", t === toggle ? "0" : "-1"));
    });
    group.addEventListener("keydown", (e) => {
      const toggle = e.target.closest(".toggle");
      if (!toggle || group.hasAttribute("data-disabled"))
        return;
      const toggles = getToggles();
      const idx = toggles.indexOf(toggle);
      if (idx === -1)
        return;
      const vertical = group.getAttribute("data-orientation") === "vertical";
      const fwd = vertical ? "ArrowDown" : "ArrowRight";
      const bwd = vertical ? "ArrowUp" : "ArrowLeft";
      let next;
      if (e.key === fwd) {
        e.preventDefault();
        next = (idx + 1) % toggles.length;
      } else if (e.key === bwd) {
        e.preventDefault();
        next = (idx - 1 + toggles.length) % toggles.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        next = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        next = toggles.length - 1;
      }
      if (next !== undefined) {
        toggles[idx].setAttribute("tabindex", "-1");
        toggles[next].setAttribute("tabindex", "0");
        toggles[next].focus();
      }
    });
  });
}
init31();
new MutationObserver(init31).observe(document, { childList: true, subtree: true });

// src/components/toolbar/toolbar.ts
var df$32 = defussGlobals();
var toolbarStates = ["default"];
function triggerStateChange32(toolbar, items, stateName, config) {
  if (stateName !== "default" || items.length === 0)
    return;
  const target = items[Math.min(Number(config?.focus ?? 0), items.length - 1)] || items[0];
  items.forEach((item) => item.setAttribute("tabindex", item === target ? "0" : "-1"));
  if (toolbar.contains(document.activeElement))
    target.focus();
}
var toolbarApi = {
  setState(toolbar, stateName, config = {}) {
    if (!toolbarStates.includes(stateName)) {
      throw new Error(`toolbar: unknown state "${stateName}" (supported: ${toolbarStates.join(", ")})`);
    }
    const items = toolbarItems(toolbar);
    triggerStateChange32(toolbar, items, stateName, config);
    toolbar.dataset.stateName = stateName;
    toolbar._stateConfig = config;
  },
  getState(toolbar) {
    const items = toolbarItems(toolbar);
    const idx = items.findIndex((item) => item.getAttribute("tabindex") === "0");
    return {
      name: toolbar.dataset.stateName || "default",
      config: { ...toolbar._stateConfig, rovingIndex: idx }
    };
  }
};
df$32.toolbarApi = toolbarApi;
df$32.toolbarStates = toolbarStates;
var toolbarItems = (toolbar) => Array.from(toolbar.querySelectorAll('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'));
function init32() {
  document.querySelectorAll('.toolbar[role="toolbar"]:not([data-init])').forEach((toolbar) => {
    toolbar.dataset.init = "";
    toolbar.api = {
      setState: (stateName, config) => toolbarApi.setState(toolbar, stateName, config),
      getState: () => toolbarApi.getState(toolbar)
    };
    const items = toolbarItems(toolbar);
    if (items.length === 0)
      return;
    items.forEach((item, i) => {
      item.setAttribute("tabindex", i === 0 ? "0" : "-1");
    });
    toolbar.addEventListener("keydown", (e) => {
      const current = items.indexOf(document.activeElement);
      if (current === -1)
        return;
      const vertical = toolbar.getAttribute("aria-orientation") === "vertical";
      const fwd = vertical ? "ArrowDown" : "ArrowRight";
      const bwd = vertical ? "ArrowUp" : "ArrowLeft";
      let next;
      if (e.key === fwd) {
        e.preventDefault();
        next = (current + 1) % items.length;
      } else if (e.key === bwd) {
        e.preventDefault();
        next = (current - 1 + items.length) % items.length;
      } else if (e.key === "Home") {
        e.preventDefault();
        next = 0;
      } else if (e.key === "End") {
        e.preventDefault();
        next = items.length - 1;
      }
      if (next !== undefined) {
        items[current].setAttribute("tabindex", "-1");
        items[next].setAttribute("tabindex", "0");
        items[next].focus();
      }
    });
  });
}
init32();
new MutationObserver(init32).observe(document, { childList: true, subtree: true });

// src/components/tooltip/tooltip.ts
var df$33 = defussGlobals();
var tooltipStates = ["default", "visible"];
function triggerStateChange33(tip, stateName, _config) {
  switch (stateName) {
    case "default":
      try {
        tip.hidePopover();
      } catch {}
      break;
    case "visible":
      safeShowPopover(tip);
      markGroupOpen();
      break;
  }
}
var tooltipApi = {
  setState(tip, stateName, config = {}) {
    if (!tooltipStates.includes(stateName)) {
      throw new Error(`tooltip: unknown state "${stateName}" (supported: ${tooltipStates.join(", ")})`);
    }
    triggerStateChange33(tip, stateName, config);
    tip.dataset.stateName = stateName;
    tip._stateConfig = config;
  },
  getState(tip) {
    return { name: tip.dataset.stateName || "default", config: tip._stateConfig ?? {} };
  }
};
df$33.tooltipApi = tooltipApi;
df$33.tooltipStates = tooltipStates;
var DELAY_DEFAULT = 700;
var CLOSE_DELAY_DEFAULT = 0;
var GROUP_TIMEOUT = 400;
var groupOpen = false;
var groupTimer = null;
function markGroupOpen() {
  groupOpen = true;
  clearTimeout(groupTimer);
}
function scheduleGroupReset() {
  clearTimeout(groupTimer);
  groupTimer = setTimeout(() => {
    groupOpen = false;
  }, GROUP_TIMEOUT);
}
function init33() {
  document.querySelectorAll("[data-tooltip-trigger]:not([data-init])").forEach((trigger2) => {
    trigger2.dataset.init = "";
    const tip = document.getElementById(trigger2.dataset.tooltipTrigger);
    if (!tip)
      return;
    const anchorId = `--tooltip-${tip.id}`;
    trigger2.style.anchorName = anchorId;
    tip.style.positionAnchor = anchorId;
    trigger2.setAttribute("aria-describedby", tip.id);
    const delay = Number(trigger2.dataset.delay ?? DELAY_DEFAULT);
    const closeDelay = Number(trigger2.dataset.closeDelay ?? CLOSE_DELAY_DEFAULT);
    let openTimer = null;
    let closeTimer = null;
    function show() {
      clearTimeout(closeTimer);
      clearTimeout(openTimer);
      const wait2 = groupOpen ? 0 : delay;
      openTimer = setTimeout(() => {
        try {
          tip.showPopover();
        } catch {}
        markGroupOpen();
      }, wait2);
    }
    function hide() {
      clearTimeout(openTimer);
      clearTimeout(closeTimer);
      closeTimer = setTimeout(() => {
        try {
          tip.hidePopover();
        } catch {}
        scheduleGroupReset();
      }, closeDelay);
    }
    trigger2.addEventListener("mouseenter", show);
    trigger2.addEventListener("mouseleave", hide);
    trigger2.addEventListener("focus", show);
    trigger2.addEventListener("blur", hide);
  });
  document.querySelectorAll(".tooltip[popover]:not([data-init])").forEach((tip) => {
    tip.dataset.init = "";
    tip.api = {
      setState: (stateName, config) => tooltipApi.setState(tip, stateName, config),
      getState: () => tooltipApi.getState(tip)
    };
  });
}
init33();
new MutationObserver(init33).observe(document, { childList: true, subtree: true });
if (!document.__tooltipScrollInit) {
  document.__tooltipScrollInit = true;
  document.addEventListener("scroll", () => {
    document.querySelectorAll(".tooltip:popover-open").forEach((tip) => {
      try {
        tip.hidePopover();
      } catch {}
    });
  }, { passive: true, capture: true });
}

// src/components/tree-view/tree-view.ts
var df$34 = defussGlobals();
var treeViewStates = ["default", "expanded"];
function triggerStateChange34(details, stateName, _config) {
  switch (stateName) {
    case "default":
      details.open = details._defaultOpen ?? false;
      break;
    case "expanded":
      details.open = true;
      break;
  }
}
var treeViewApi = {
  setState(details, stateName, config = {}) {
    if (!treeViewStates.includes(stateName)) {
      throw new Error(`tree-view: unknown state "${stateName}" (supported: ${treeViewStates.join(", ")})`);
    }
    triggerStateChange34(details, stateName, config);
    details.dataset.stateName = stateName;
    details._stateConfig = config;
  },
  getState(details) {
    return {
      name: details.open ? "expanded" : "default",
      config: details._stateConfig ?? {}
    };
  }
};
df$34.treeViewApi = treeViewApi;
df$34.treeViewStates = treeViewStates;
var itemOf = (row) => row.closest('[role="treeitem"]');
var isDisabled = (item) => item?.getAttribute("aria-disabled") === "true";
function selectItem(tree, item) {
  if (!item || isDisabled(item) || item.getAttribute("aria-selected") === "true")
    return;
  tree.querySelectorAll('[role="treeitem"][aria-selected="true"]').forEach((other) => other.setAttribute("aria-selected", "false"));
  item.setAttribute("aria-selected", "true");
  tree.dispatchEvent(new CustomEvent("tree-select", { bubbles: true, detail: { item } }));
}
function init34() {
  document.querySelectorAll('.tree[role="tree"]:not([data-init])').forEach((tree) => {
    tree.dataset.init = "";
    const selectable = tree.hasAttribute("data-selectable");
    if (selectable) {
      tree.querySelectorAll('[role="treeitem"]').forEach((item) => {
        if (!isDisabled(item) && !item.hasAttribute("aria-selected"))
          item.setAttribute("aria-selected", "false");
      });
    }
    tree.addEventListener("click", (e) => {
      const row = e.target.closest(".tree-branch-trigger, .tree-leaf");
      if (!row || !tree.contains(row))
        return;
      const item = itemOf(row);
      if (isDisabled(item)) {
        e.preventDefault();
        return;
      }
      if (selectable)
        selectItem(tree, item);
    });
    tree.querySelectorAll(".tree-branch").forEach((details) => {
      const treeitem = details.closest('[role="treeitem"]');
      if (!treeitem)
        return;
      details._defaultOpen = details.open;
      details.api = {
        setState: (stateName, config) => treeViewApi.setState(details, stateName, config),
        getState: () => treeViewApi.getState(details)
      };
      details.addEventListener("toggle", () => {
        treeitem.setAttribute("aria-expanded", String(details.open));
        details.dataset.stateName = details.open ? "expanded" : "default";
      });
    });
    tree.addEventListener("keydown", (e) => {
      const target = e.target.closest(".tree-branch-trigger, .tree-leaf");
      if (!target)
        return;
      const allItems = Array.from(tree.querySelectorAll(".tree-branch-trigger, .tree-leaf"));
      const visibleItems = allItems.filter((item) => item.checkVisibility());
      const index = visibleItems.indexOf(target);
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (index < visibleItems.length - 1)
            visibleItems[index + 1].focus();
          break;
        case "ArrowUp":
          e.preventDefault();
          if (index > 0)
            visibleItems[index - 1].focus();
          break;
        case "ArrowRight":
          e.preventDefault();
          {
            const detailsR = target.closest("details.tree-branch");
            if (detailsR && !detailsR.open && !isDisabled(itemOf(target)))
              detailsR.open = true;
          }
          break;
        case "Enter":
        case " ": {
          const item = itemOf(target);
          if (isDisabled(item)) {
            e.preventDefault();
            break;
          }
          if (!selectable)
            break;
          if (target.matches("span.tree-leaf"))
            e.preventDefault();
          selectItem(tree, item);
          break;
        }
        case "ArrowLeft":
          e.preventDefault();
          {
            const detailsL = target.closest("details.tree-branch");
            if (detailsL && detailsL.open)
              detailsL.open = false;
          }
          break;
        case "Home":
          e.preventDefault();
          if (visibleItems.length)
            visibleItems[0].focus();
          break;
        case "End":
          e.preventDefault();
          if (visibleItems.length)
            visibleItems[visibleItems.length - 1].focus();
          break;
      }
    });
  });
}
init34();
new MutationObserver(init34).observe(document, { childList: true, subtree: true });

//# debugId=F344EA09707B747264756E2164756E21
/* defuss-shadcn v0.9.1 runtime provenance: bundles defuss-morph@0.1.1 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599) + defuss-query@0.1.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599); full notice: NOTICE.txt */
//# sourceMappingURL=all.js.map
