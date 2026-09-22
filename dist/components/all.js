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
var SHARED_ABI = "0.9.0";
// src/core/index.ts
var existing = Reflect.get(globalThis, "df$");
if (existing !== undefined) {
  throw new Error("defuss-shadcn core: globalThis.df$ is already defined — load core OR all, never both and never twice");
}
var df = createDf$(exports_dist);
Reflect.set(globalThis, "df$", df);
var shadcn = df.shadcn ??= {};
shadcn.shared = { abi: SHARED_ABI, defussGlobals, safeShowPopover, defussQuery };

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
  document.querySelectorAll("[data-alert-dialog-trigger]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = document.getElementById(trigger.dataset.alertDialogTrigger);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog._trigger = trigger;
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

// src/components/avatar/avatar.ts
var df$3 = defussGlobals();
var avatarStates = ["default", "error"];
function triggerStateChange3(wrapper, stateName, _config) {
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
    triggerStateChange3(wrapper, stateName, config);
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
df$3.avatarApi = avatarApi;
df$3.avatarStates = avatarStates;
function init3() {
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
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// src/components/calendar/calendar.ts
var df$4 = defussGlobals();
var dfDollar = defussQuery();
var calSeq = 0;
var calendarStates = ["default"];
function triggerStateChange4(cal, stateName, config) {
  const state = cal._calState;
  if (!state || stateName !== "default")
    return;
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
    triggerStateChange4(cal, stateName, config);
    cal.dataset.stateName = stateName;
    cal._stateConfig = config;
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
        maxDate: state.maxDate ?? null
      }
    };
  }
};
df$4.calendarApi = calendarApi;
df$4.calendarStates = calendarStates;
var DAYS = Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(new Date(2024, 0, i)));
var MONTHS = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(undefined, { month: "long" }).format(new Date(2024, i, 1)));
var daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
var firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();
var isToday = (year, month, day) => {
  const now = new Date;
  return now.getFullYear() === year && now.getMonth() === month && now.getDate() === day;
};
var isoInRange = (iso, min, max) => (!min || iso >= min) && (!max || iso <= max);
var renderGrid = (year, month, selectedDay, calId, minDate, maxDate) => {
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
        const off = !isoInRange(iso, minDate, maxDate) ? " data-disabled" : "";
        html += `<td class="calendar-day" data-outside${off} id="${calId}-${iso}" data-cal-date="${iso}"><button tabindex="-1" data-day="${prevDay}" data-outside="prev">${prevDay}</button></td>`;
      } else if (dayNum > total) {
        const iso = isoDate(new Date(year, month + 1, nextDayNum));
        const off = !isoInRange(iso, minDate, maxDate) ? " data-disabled" : "";
        html += `<td class="calendar-day" data-outside${off} id="${calId}-${iso}" data-cal-date="${iso}"><button tabindex="-1" data-day="${nextDayNum}" data-outside="next">${nextDayNum}</button></td>`;
        nextDayNum++;
      } else {
        let attrs = "";
        if (isToday(year, month, dayNum))
          attrs += " data-today";
        if (dayNum === selectedDay)
          attrs += " data-selected";
        const iso = isoDate(new Date(year, month, dayNum));
        if (!isoInRange(iso, minDate, maxDate))
          attrs += " data-disabled";
        html += `<td class="calendar-day"${attrs} id="${calId}-${iso}" data-cal-date="${iso}"><button data-day="${dayNum}">${dayNum}</button></td>`;
        dayNum++;
      }
    }
    html += "</tr>";
  }
  html += "</tbody>";
  return html;
};
var renderCalendar = (el, year, month, selectedDay) => {
  const heading = el.querySelector(".calendar-heading");
  if (heading)
    heading.textContent = `${MONTHS[month]} ${year}`;
  const grid = el.querySelector(".calendar-grid");
  if (!grid)
    return;
  const st = el._calState ?? {};
  el.dataset.currentDate = selectedDay ? isoDate(new Date(year, month, selectedDay)) : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  if (st.minDate)
    el.dataset.minDate = st.minDate;
  else
    el.removeAttribute("data-min-date");
  if (st.maxDate)
    el.dataset.maxDate = st.maxDate;
  else
    el.removeAttribute("data-max-date");
  const active = el.ownerDocument.activeElement;
  const focusKey = active && el.contains(active) ? active.closest(".calendar-day")?.getAttribute("data-cal-date") : null;
  dfDollar(grid).morph(renderGrid(year, month, selectedDay, el.dataset.calId || "", st.minDate, st.maxDate));
  if (focusKey)
    grid.querySelector(`[data-cal-date="${focusKey}"] button`)?.focus();
  const selDate = el.querySelector(".calendar-day[data-selected]")?.getAttribute("data-cal-date");
  if (selDate)
    grid.setAttribute("data-selected-date", selDate);
  else
    grid.removeAttribute("data-selected-date");
};
function init4() {
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
      getState: () => calendarApi.getState(cal)
    };
    renderCalendar(cal, state.year, state.month, state.selected);
    cal.addEventListener("click", (e) => {
      const nav = e.target.closest(".calendar-nav");
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
      const dayBtn = e.target.closest(".calendar-day button");
      if (!dayBtn)
        return;
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
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// src/components/carousel/carousel.ts
var df$5 = defussGlobals();
var dfDollar2 = defussQuery();
var carSeq = 0;
var carouselStates = ["default"];
function triggerStateChange5(carousel, config) {
  const index = Number(config?.index ?? 0);
  if (typeof carousel._goTo === "function")
    carousel._goTo(index);
}
var carouselApi = {
  setState(carousel, stateName, config = {}) {
    if (!carouselStates.includes(stateName)) {
      throw new Error(`carousel: unknown state "${stateName}" (supported: ${carouselStates.join(", ")})`);
    }
    triggerStateChange5(carousel, config);
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
df$5.carouselApi = carouselApi;
df$5.carouselStates = carouselStates;
function init5() {
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
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const behavior = reducedMotion ? "auto" : "smooth";
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
          dfDollar2(prevBtn).prop("disabled", currentIndex <= 0);
        if (nextBtn)
          dfDollar2(nextBtn).prop("disabled", currentIndex >= allSlides.length - 1);
      }
      if (dotsContainer)
        dfDollar2(dotsContainer).find(".carousel-dot").each(function(i) {
          dfDollar2(this).attr("aria-current", i === currentIndex ? "true" : "false");
        });
      if (counter)
        dfDollar2(counter).text(`Slide ${currentIndex + 1} of ${allSlides.length}`);
      allSlides.forEach((slide, i) => {
        dfDollar2(slide).attr("aria-label", `${i + 1} of ${allSlides.length}`);
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
      dfDollar2(dotsContainer).morph(html);
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
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// src/components/color-picker/color-picker.ts
var df$6 = defussGlobals();
var colorPickerStates = ["default"];
var getInput = (picker) => picker.querySelector('input[type="color"]');
function triggerStateChange6(picker, config) {
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
    triggerStateChange6(picker, config);
    picker.dataset.stateName = stateName;
    picker._stateConfig = config;
  },
  getState(picker) {
    const input = getInput(picker);
    return {
      name: picker.dataset.stateName || "default",
      config: { ...picker._stateConfig, value: input ? input.value : "" }
    };
  }
};
df$6.colorPickerApi = colorPickerApi;
df$6.colorPickerStates = colorPickerStates;
function init6() {
  document.querySelectorAll(".color-picker:not([data-init])").forEach((picker) => {
    picker.dataset.init = "";
    picker.api = {
      setState: (stateName, config) => colorPickerApi.setState(picker, stateName, config),
      getState: () => colorPickerApi.getState(picker)
    };
    const input = picker.querySelector('input[type="color"]');
    const display = picker.querySelector(".color-picker-value");
    if (!input || !display)
      return;
    display.textContent = input.value;
    input.addEventListener("input", () => {
      display.textContent = input.value;
    });
  });
}
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// src/components/combobox/combobox.ts
var df$7 = defussGlobals();
var dfDollar3 = defussQuery();
var comboboxStates = ["default", "open"];
function triggerStateChange7(popover, stateName, _config) {
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
    triggerStateChange7(popover, stateName, config);
    popover.dataset.stateName = stateName;
    popover._stateConfig = config;
  },
  getState(popover) {
    const selected = popover.querySelector('[role="option"][aria-selected="true"]');
    return {
      name: popover.matches(":popover-open") ? "open" : "default",
      config: { ...popover._stateConfig, value: selected?.textContent?.trim() ?? "" }
    };
  }
};
df$7.comboboxApi = comboboxApi;
df$7.comboboxStates = comboboxStates;
function init7() {
  document.querySelectorAll(".combobox:not([data-init])").forEach((wrapper) => {
    wrapper.dataset.init = "";
    const $wrapper = dfDollar3(wrapper);
    const $trigger = $wrapper.find(".combobox-trigger");
    const $value = $wrapper.find(".combobox-value");
    const $popover = $wrapper.find(".combobox-content");
    const $search = $wrapper.find(".combobox-search-input");
    const $listbox = $wrapper.find('[role="listbox"]');
    const $empty = $wrapper.find(".combobox-empty");
    const trigger = $trigger[0];
    const popover = $popover[0];
    const searchInput = $search[0];
    const listbox = $listbox[0];
    if (!trigger || !popover || !searchInput || !listbox)
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
    dfDollar3(clearBtn).html('<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>');
    dfDollar3(clearBtn).css("positionAnchor", anchorId);
    $trigger.after(clearBtn);
    clearBtn.addEventListener("click", () => {
      allItems.attr("aria-selected", "false");
      $value.text(placeholder).attr("data-placeholder", placeholder);
      trigger.focus();
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
      trigger.focus();
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
        dfDollar3(item).prop("hidden", !match);
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
        dfDollar3(label).prop("hidden", !groupHasVisible);
      });
      $listbox.find(".combobox-separator").each(function() {
        const sep = this;
        const prev = sep.previousElementSibling;
        const next = sep.nextElementSibling;
        dfDollar3(sep).prop("hidden", Boolean(prev && prev.hidden || next && next.hidden));
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
      dfDollar3(items[index]).data("highlighted", "");
      items[index].scrollIntoView({ block: "nearest" });
      $search.attr("aria-activedescendant", items[index].id);
    };
    const selectItem = (item) => {
      if (item.getAttribute("aria-disabled") === "true")
        return;
      allItems.attr("aria-selected", "false");
      dfDollar3(item).attr("aria-selected", "true");
      $value.text(item.textContent.trim()).attr("data-placeholder", null);
      close();
    };
    trigger.addEventListener("click", () => {
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
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

// src/components/command/command.ts
var df$8 = defussGlobals();
var dfDollar4 = defussQuery();
var commandStates = ["default", "open"];
function triggerStateChange8(dialog, stateName, _config) {
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
    triggerStateChange8(dialog, stateName, config);
    dialog.dataset.stateName = stateName;
    dialog._stateConfig = config;
  },
  getState(dialog) {
    return { name: dialog.dataset.stateName || "default", config: dialog._stateConfig ?? {} };
  }
};
df$8.commandApi = commandApi;
df$8.commandStates = commandStates;
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
  return Array.from(dfDollar4(list).find('.command-item:not([hidden]):not([aria-disabled="true"])'));
}
function highlightItem(list, index) {
  const visible = getVisibleItems(list);
  dfDollar4(list).find(".command-item[data-highlighted]").data("highlighted", null);
  if (visible.length === 0)
    return -1;
  const clamped = (index % visible.length + visible.length) % visible.length;
  dfDollar4(visible[clamped]).data("highlighted", "");
  visible[clamped].scrollIntoView({ block: "nearest" });
  return clamped;
}
function init8() {
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
      const $items = dfDollar4(list).find(".command-item");
      $items.each(function() {
        const match = !query || this.textContent.toLowerCase().includes(query);
        dfDollar4(this).prop("hidden", !match);
        if (match)
          hasVisible = true;
      });
      dfDollar4(list).find(".command-group").each(function() {
        dfDollar4(this).prop("hidden", dfDollar4(this).find(".command-item:not([hidden])").length === 0);
      });
      dfDollar4(list).find(".command-separator").prop("hidden", !!query);
      if (empty)
        dfDollar4(empty).prop("hidden", hasVisible);
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
      dfDollar4(input).val("");
      filter("");
      dfDollar4(list).find(".command-item[data-highlighted]").data("highlighted", null);
      highlightIndex = -1;
    });
  });
  document.querySelectorAll("[data-command-trigger]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = document.getElementById(trigger.dataset.commandTrigger);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog.showModal();
      const input = dfDollar4(dialog).find(".command-input")[0];
      if (input)
        input.focus();
    });
  });
}
init8();
new MutationObserver(init8).observe(document, { childList: true, subtree: true });

// src/components/context-menu/context-menu.ts
var df$9 = defussGlobals();
var contextMenuStates = ["default", "open"];
function triggerStateChange9(menu, stateName, config) {
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
    triggerStateChange9(menu, stateName, config);
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
df$9.contextMenuApi = contextMenuApi;
df$9.contextMenuStates = contextMenuStates;
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
function init9() {
  document.querySelectorAll("[data-context-menu]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const menu = document.getElementById(trigger.dataset.contextMenu);
    if (!menu)
      return;
    menu.api = {
      setState: (stateName, config) => contextMenuApi.setState(menu, stateName, config),
      getState: () => contextMenuApi.getState(menu)
    };
    trigger.addEventListener("contextmenu", (e) => {
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
init9();
new MutationObserver(init9).observe(document, { childList: true, subtree: true });

// src/components/dialog/dialog.ts
var df$10 = defussGlobals();
var dialogStates = ["default", "open"];
function triggerStateChange10(dialog, stateName, _config) {
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
    triggerStateChange10(dialog, stateName, config);
    dialog.dataset.stateName = stateName;
    dialog._stateConfig = config;
  },
  getState(dialog) {
    return { name: dialog.dataset.stateName || "default", config: dialog._stateConfig ?? {} };
  }
};
df$10.dialogApi = dialogApi;
df$10.dialogStates = dialogStates;
function init10() {
  document.querySelectorAll("[data-dialog-trigger]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = document.getElementById(trigger.dataset.dialogTrigger);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog._trigger = trigger;
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
init10();
new MutationObserver(init10).observe(document, { childList: true, subtree: true });

// src/components/dropdown/dropdown.ts
var df$11 = defussGlobals();
var dropdownStates = ["default", "open"];
function triggerStateChange11(menu, stateName, _config) {
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
    triggerStateChange11(menu, stateName, config);
    menu.dataset.stateName = stateName;
    menu._stateConfig = config;
  },
  getState(menu) {
    return { name: menu.dataset.stateName || "default", config: menu._stateConfig ?? {} };
  }
};
df$11.dropdownApi = dropdownApi;
df$11.dropdownStates = dropdownStates;
function init11() {
  document.querySelectorAll("[data-dropdown-trigger]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const menu = document.getElementById(trigger.dataset.dropdownTrigger);
    if (!menu)
      return;
    const anchorId = `--dropdown-${menu.id}`;
    trigger.style.anchorName = anchorId;
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
    if (!trigger.hasAttribute("popovertarget"))
      trigger.setAttribute("popovertarget", menu.id);
    menu.addEventListener("toggle", (e) => {
      const open = e.newState === "open";
      trigger.setAttribute("aria-expanded", open);
      if (open) {
        const first = getItems()[0];
        if (first)
          highlight(first);
      } else {
        getItems().forEach((i) => {
          i.removeAttribute("data-highlighted");
        });
        trigger.focus();
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
init11();
new MutationObserver(init11).observe(document, { childList: true, subtree: true });

// src/components/image/image.ts
var df$12 = defussGlobals();
var dfDollar5 = defussQuery();
var imageStates = ["default", "error"];
function triggerStateChange12(figure, stateName, _config) {
  const img = dfDollar5(figure).find("img")[0];
  if (!img)
    return;
  switch (stateName) {
    case "default":
      dfDollar5(img).data("error", null);
      break;
    case "error":
      dfDollar5(img).data("error", "");
      break;
  }
}
var imageApi = {
  setState(figure, stateName, config = {}) {
    if (!imageStates.includes(stateName)) {
      throw new Error(`image: unknown state "${stateName}" (supported: ${imageStates.join(", ")})`);
    }
    triggerStateChange12(figure, stateName, config);
    figure.dataset.stateName = stateName;
    figure._stateConfig = config;
  },
  getState(figure) {
    const img = dfDollar5(figure).find("img")[0];
    return {
      name: img && dfDollar5(img).data("error") !== undefined ? "error" : "default",
      config: figure._stateConfig ?? {}
    };
  }
};
df$12.imageApi = imageApi;
df$12.imageStates = imageStates;
function init12() {
  document.querySelectorAll(".image:not([data-init])").forEach((figure) => {
    figure.dataset.init = "";
    figure.api = {
      setState: (stateName, config) => imageApi.setState(figure, stateName, config),
      getState: () => imageApi.getState(figure)
    };
    const img = dfDollar5(figure).find("img")[0];
    if (!img)
      return;
    if (img.complete && img.naturalWidth === 0) {
      dfDollar5(img).data("error", "");
    }
    img.addEventListener("error", () => {
      dfDollar5(img).data("error", "");
      figure.dataset.stateName = "error";
    });
    img.addEventListener("load", () => {
      dfDollar5(img).data("error", null);
      figure.dataset.stateName = "default";
    });
  });
}
init12();
new MutationObserver(init12).observe(document, { childList: true, subtree: true });
var lightbox = null;
var lightboxImg = null;
var zoom = 1;
var rotation = 0;
function getLightbox() {
  if (lightbox)
    return lightbox;
  lightbox = document.createElement("dialog");
  lightbox.className = "image-lightbox";
  lightbox.setAttribute("aria-label", "Image preview");
  dfDollar5(lightbox).html(`
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
  lightboxImg = dfDollar5(lightbox).find(".image-lightbox-content > img")[0];
  dfDollar5(lightbox).find(".image-lightbox-toolbar")[0].addEventListener("click", (e) => {
    const btn = e.target.closest("[data-action]");
    if (!btn)
      return;
    const action = btn.dataset.action;
    if (action === "zoom-in")
      zoom = Math.min(zoom + 0.25, 5);
    else if (action === "zoom-out")
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
  dfDollar5(document.body).append(lightbox);
  return lightbox;
}
function applyTransform() {
  if (lightboxImg) {
    dfDollar5(lightboxImg).css("transform", `scale(${zoom}) rotate(${rotation}deg)`);
  }
}
function openLightbox(src, alt) {
  const lb = getLightbox();
  zoom = 1;
  rotation = 0;
  const $img = dfDollar5(lightboxImg);
  $img.attr("src", src).attr("alt", alt || "").css("transform", null);
  lb.showModal();
}
if (!document.__imagePreviewInit) {
  document.__imagePreviewInit = true;
  document.addEventListener("click", (e) => {
    const figure = e.target.closest(".image[data-preview]");
    if (!figure)
      return;
    const img = dfDollar5(figure).find("img")[0];
    if (!img || dfDollar5(img).data("error") !== undefined)
      return;
    openLightbox(img.src, img.alt);
  });
}

// src/components/navigation-menu/navigation-menu.ts
var df$13 = defussGlobals();
var navigationMenuStates = ["default", "open"];
function triggerStateChange13(content, stateName, _config) {
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
    triggerStateChange13(content, stateName, config);
    content.dataset.stateName = stateName;
    content._stateConfig = config;
  },
  getState(content) {
    return { name: content.dataset.stateName || "default", config: content._stateConfig ?? {} };
  }
};
df$13.navigationMenuApi = navigationMenuApi;
df$13.navigationMenuStates = navigationMenuStates;
function init13() {
  document.querySelectorAll(".nav-menu-trigger[popovertarget]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const content = document.getElementById(trigger.getAttribute("popovertarget"));
    if (!content)
      return;
    const anchorId = `--nav-menu-${content.id}`;
    trigger.style.anchorName = anchorId;
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
init13();
new MutationObserver(init13).observe(document, { childList: true, subtree: true });

// src/components/number-input/number-input.ts
var df$14 = defussGlobals();
var numberInputStates = ["default"];
var getInput2 = (wrapper) => wrapper.querySelector('input[type="number"]');
function triggerStateChange14(wrapper, config) {
  const input = getInput2(wrapper);
  if (!input || config?.value === undefined)
    return;
  input.value = String(config.value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
var numberInputApi = {
  setState(wrapper, stateName, config = {}) {
    if (!numberInputStates.includes(stateName)) {
      throw new Error(`number-input: unknown state "${stateName}" (supported: ${numberInputStates.join(", ")})`);
    }
    triggerStateChange14(wrapper, config);
    wrapper.dataset.stateName = stateName;
    wrapper._stateConfig = config;
  },
  getState(wrapper) {
    const input = getInput2(wrapper);
    return {
      name: wrapper.dataset.stateName || "default",
      config: { ...wrapper._stateConfig, value: input ? input.value : "" }
    };
  }
};
df$14.numberInputApi = numberInputApi;
df$14.numberInputStates = numberInputStates;
function init14() {
  document.querySelectorAll(".number-input:not([data-init])").forEach((wrapper) => {
    wrapper.dataset.init = "";
    wrapper.api = {
      setState: (stateName, config) => numberInputApi.setState(wrapper, stateName, config),
      getState: () => numberInputApi.getState(wrapper)
    };
    const input = wrapper.querySelector('input[type="number"]');
    const decBtn = wrapper.querySelector('[data-action="decrement"]');
    const incBtn = wrapper.querySelector('[data-action="increment"]');
    if (!input)
      return;
    const update = (direction) => {
      try {
        if (direction > 0)
          input.stepUp();
        else
          input.stepDown();
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
init14();
new MutationObserver(init14).observe(document, { childList: true, subtree: true });

// src/components/pagination/pagination.ts
var df$15 = defussGlobals();
var dfDollar6 = defussQuery();
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
  const active = Math.min(max, Math.max(min, numAttr(nav, "activePage", min)));
  dfDollar6(prev).attr("aria-disabled", active <= min ? "true" : null);
  dfDollar6(next).attr("aria-disabled", active >= max ? "true" : null);
  if (!nav.hasAttribute("data-active-page"))
    return;
  const count = Math.max(1, numAttr(nav, "pageDisplayCount", 5));
  if (nav.dataset.activePage !== String(active))
    nav.dataset.activePage = String(active);
  const start = Math.max(min, Math.min(active - Math.floor((count - 1) / 2), max - count + 1));
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
  for (const node of windowNodes(start, end, min, max, active, survivors))
    dfDollar6(nextLi).before(node);
}
function windowNodes(start, end, min, max, active, survivors) {
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
    a.className = "pagination-link" + (p === active ? " pagination-active" : "");
    a.href = "#";
    a.dataset.page = String(p);
    if (p === active)
      a.setAttribute("aria-current", "page");
    a.textContent = String(p);
    li.append(a);
    return li;
  };
  if (start > min)
    out.push(ellipsis());
  for (let p = start;p <= end; p++) {
    if (p === active || !survivors.has(p))
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
function triggerStateChange15(nav, stateName, config = {}) {
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
    triggerStateChange15(nav, stateName, config);
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
df$15.paginationApi = paginationApi;
df$15.paginationStates = paginationStates;
function init15() {
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
init15();
new MutationObserver(init15).observe(document, { childList: true, subtree: true });

// src/components/popover/popover.ts
var df$16 = defussGlobals();
var popoverStates = ["default", "open"];
function triggerStateChange16(popover, stateName, _config) {
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
    triggerStateChange16(popover, stateName, config);
    popover.dataset.stateName = stateName;
    popover._stateConfig = config;
  },
  getState(popover) {
    return { name: popover.dataset.stateName || "default", config: popover._stateConfig ?? {} };
  }
};
df$16.popoverApi = popoverApi;
df$16.popoverStates = popoverStates;
function init16() {
  document.querySelectorAll("[popovertarget]:not([data-init])").forEach((trigger) => {
    const id = trigger.getAttribute("popovertarget");
    const popover = document.getElementById(id);
    if (!popover || !popover.classList.contains("popover"))
      return;
    trigger.dataset.init = "";
    const anchorId = `--popover-${id}`;
    trigger.style.anchorName = anchorId;
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
init16();
new MutationObserver(init16).observe(document, { childList: true, subtree: true });

// src/components/product-showcase/product-showcase.ts
var df$17 = defussGlobals();
var productShowcaseStates = ["default", "playing"];
function triggerStateChange17(showcase, stateName, _config) {
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
    triggerStateChange17(showcase, stateName, config);
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
df$17.productShowcaseApi = productShowcaseApi;
df$17.productShowcaseStates = productShowcaseStates;
function init17() {
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
init17();
new MutationObserver(init17).observe(document, { childList: true, subtree: true });

// src/components/resizer/resizer.ts
var df$18 = defussGlobals();
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
  const owned = new Set(ladder);
  for (const cls of Array.from(el.classList))
    if (owned.has(cls) && cls !== token)
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
function triggerStateChange18(wrapper, stateName, config = {}) {
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
    triggerStateChange18(wrapper, stateName, config);
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
df$18.resizerApi = resizerApi;
df$18.resizerStates = resizerStates;
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
  const onMove = (e) => {
    if (dx !== 0 && axis !== "h")
      applySize(wrapper, "w", startW + dx * (e.clientX - startX) / z);
    if (dy !== 0 && axis !== "w")
      applySize(wrapper, "h", startH + dy * (e.clientY - startY) / z);
  };
  const onUp = () => {
    delete wrapper.dataset.resizing;
    handle.removeEventListener("pointermove", onMove);
    handle.removeEventListener("pointerup", onUp);
    handle.removeEventListener("pointercancel", onUp);
  };
  handle.addEventListener("pointermove", onMove);
  handle.addEventListener("pointerup", onUp);
  handle.addEventListener("pointercancel", onUp);
}
function init18() {
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
init18();
new MutationObserver(init18).observe(document, { childList: true, subtree: true });

// src/components/sheet/sheet.ts
var df$19 = defussGlobals();
var sheetStates = ["default", "open"];
function triggerStateChange19(sheet, stateName, _config) {
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
    triggerStateChange19(sheet, stateName, config);
    sheet.dataset.stateName = stateName;
    sheet._stateConfig = config;
  },
  getState(sheet) {
    return { name: sheet.dataset.stateName || "default", config: sheet._stateConfig ?? {} };
  }
};
df$19.sheetApi = sheetApi;
df$19.sheetStates = sheetStates;
function init19() {
  document.querySelectorAll("[data-sheet-trigger]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const sheet = document.getElementById(trigger.dataset.sheetTrigger);
    if (!sheet)
      return;
    trigger.addEventListener("click", () => {
      sheet._trigger = trigger;
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
init19();
new MutationObserver(init19).observe(document, { childList: true, subtree: true });

// src/components/sidebar/sidebar.ts
var df$20 = defussGlobals();
var sidebarStates = ["default", "collapsed"];
function triggerStateChange20(sidebar, stateName, _config) {
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
    triggerStateChange20(sidebar, stateName, config);
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
df$20.sidebarApi = sidebarApi;
df$20.sidebarStates = sidebarStates;
function init20() {
  document.querySelectorAll(".app-sidebar:not([data-init])").forEach((sidebar) => {
    sidebar.dataset.init = "";
    sidebar._defaultState = sidebar.dataset.state || "expanded";
    sidebar.api = {
      setState: (stateName, config) => sidebarApi.setState(sidebar, stateName, config),
      getState: () => sidebarApi.getState(sidebar)
    };
    const triggerId = sidebar.id ? `[data-sidebar-trigger="${sidebar.id}"]` : ".sidebar-trigger";
    document.querySelectorAll(triggerId).forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const state = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
        sidebar.dataset.state = state;
        sidebar.dataset.stateName = state === "collapsed" ? "collapsed" : "default";
      });
    });
    document.__sidebarAutoRo?.observe(sidebar.parentElement ?? sidebar);
    autoCollapseSidebar(sidebar);
  });
  document.querySelectorAll("[data-sidebar-mobile]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = document.getElementById(trigger.dataset.sidebarMobile);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
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
init20();
new MutationObserver(init20).observe(document, { childList: true, subtree: true });
if (!document.__sidebarKbInit) {
  document.__sidebarKbInit = true;
  document.addEventListener("keydown", (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "b") {
      e.preventDefault();
      const sidebar = document.querySelector(".app-sidebar");
      if (sidebar) {
        sidebar.dataset.state = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
        sidebar.dataset.stateName = sidebar.dataset.state === "collapsed" ? "collapsed" : "default";
      }
    }
  });
}

// src/components/slider/slider.ts
var df$21 = defussGlobals();
var sliderStates = ["default", "disabled"];
function updateSliderValue(el) {
  const min = parseFloat(el.min || 0);
  const max = parseFloat(el.max || 100);
  const value = parseFloat(el.value);
  const percent = max === min ? 0 : (value - min) / (max - min) * 100;
  el.style.setProperty("--slider-value", `${percent}%`);
}
function triggerStateChange21(el, stateName, config) {
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
    triggerStateChange21(el, stateName, config);
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
df$21.sliderApi = sliderApi;
df$21.sliderStates = sliderStates;
function init21() {
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
init21();
new MutationObserver(init21).observe(document, { childList: true, subtree: true });

// src/components/sortable/sortable.ts
var df$22 = defussGlobals();
var dfDollar7 = defussQuery();
var sortableStates = ["default"];
var sortableLabels = (list) => dfDollar7(list).find(".sortable-item").map((item) => dfDollar7(item).find("span:not(.sortable-handle)").text().trim());
function triggerStateChange22(list, stateName, config) {
  if (stateName !== "default")
    return;
  dfDollar7(list).append(list._defaultOrder ?? []);
  if (config?.index !== undefined) {
    const item = dfDollar7(list).find(".sortable-item")[Number(config.index)];
    list._setActive?.(item);
  }
}
var sortableApi = {
  setState(list, stateName, config = {}) {
    if (!sortableStates.includes(stateName)) {
      throw new Error(`sortable: unknown state "${stateName}" (supported: ${sortableStates.join(", ")})`);
    }
    triggerStateChange22(list, stateName, config);
    list.dataset.stateName = stateName;
    list._stateConfig = config;
  },
  getState(list) {
    const items = Array.from(dfDollar7(list).find(".sortable-item"));
    const active = dfDollar7(list).find(".sortable-item[data-active]")[0];
    return {
      name: list.dataset.stateName || "default",
      config: {
        ...list._stateConfig,
        order: sortableLabels(list),
        activeIndex: active ? items.indexOf(active) : -1
      }
    };
  }
};
df$22.sortableApi = sortableApi;
df$22.sortableStates = sortableStates;
function init22() {
  document.querySelectorAll(".sortable:not([data-init])").forEach((list) => {
    list.dataset.init = "";
    list.api = {
      setState: (stateName, config) => sortableApi.setState(list, stateName, config),
      getState: () => sortableApi.getState(list)
    };
    const isHorizontal = list.dataset.orientation === "horizontal";
    const NEXT_KEY = isHorizontal ? "ArrowRight" : "ArrowDown";
    const PREV_KEY = isHorizontal ? "ArrowLeft" : "ArrowUp";
    let liveRegion = list.nextElementSibling;
    if (!liveRegion || !liveRegion.classList.contains("sortable-live")) {
      liveRegion = document.createElement("span");
      liveRegion.className = "sortable-live";
      liveRegion.setAttribute("aria-live", "assertive");
      liveRegion.setAttribute("role", "status");
      dfDollar7(list).after(liveRegion);
    }
    function announce(msg) {
      dfDollar7(liveRegion).text("");
      requestAnimationFrame(() => {
        dfDollar7(liveRegion).text(msg);
      });
    }
    function getItems() {
      return Array.from(dfDollar7(list).find('.sortable-item:not([aria-disabled="true"])'));
    }
    function getAllItems() {
      return Array.from(dfDollar7(list).find(".sortable-item"));
    }
    function getActiveItem() {
      return dfDollar7(list).find(".sortable-item[data-active]")[0];
    }
    function setActive(item) {
      getAllItems().forEach((el) => {
        dfDollar7(el).data("active", null).attr("tabindex", "-1");
      });
      if (item) {
        dfDollar7(item).data("active", "").attr("tabindex", "0");
        list.dataset.activeIndex = String(getItems().indexOf(item));
        item.focus();
      } else {
        list.removeAttribute("data-active-index");
      }
    }
    list._setActive = setActive;
    list._defaultOrder = getAllItems();
    function getItemLabel(item) {
      const handle = item.querySelector(".sortable-handle");
      const clone = item.cloneNode(true);
      if (handle) {
        const handleClone = clone.querySelector(".sortable-handle");
        if (handleClone)
          handleClone.remove();
      }
      return clone.textContent.trim();
    }
    const allItems = getAllItems();
    allItems.forEach((item, i) => {
      dfDollar7(item).attr("tabindex", i === 0 ? "0" : "-1");
    });
    let dragged = null;
    dfDollar7(list).find(".sortable-item").each(function() {
      const item = this;
      if (item.getAttribute("aria-disabled") === "true")
        return;
      item.addEventListener("dragstart", (e) => {
        dragged = item;
        dfDollar7(item).data("dragging", "");
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", "");
      });
      item.addEventListener("dragend", () => {
        dfDollar7(item).data("dragging", null);
        dfDollar7(list).find("[data-over]").data("over", null);
        dragged = null;
      });
      item.addEventListener("dragover", (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
        if (!dragged || dragged === item)
          return;
        const rect = item.getBoundingClientRect();
        const midpoint = isHorizontal ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
        const pos = isHorizontal ? e.clientX : e.clientY;
        dfDollar7(list).find("[data-over]").each(function() {
          if (this !== item)
            dfDollar7(this).data("over", null);
        });
        dfDollar7(item).data("over", pos < midpoint ? "before" : "after");
      });
      item.addEventListener("dragleave", () => {
        dfDollar7(item).data("over", null);
      });
      item.addEventListener("drop", (e) => {
        e.preventDefault();
        const position = dfDollar7(item).data("over");
        dfDollar7(item).data("over", null);
        if (!dragged || dragged === item)
          return;
        if (position === "before") {
          dfDollar7(item).before(dragged);
        } else {
          dfDollar7(item).after(dragged);
        }
        const items = getItems();
        const newIndex = items.indexOf(dragged);
        announce(`${getItemLabel(dragged)}, moved to position ${newIndex + 1} of ${items.length}`);
        setActive(dragged);
        list.dispatchEvent(new CustomEvent("sortable-change", {
          bubbles: true,
          detail: { item: dragged, index: newIndex }
        }));
      });
    });
    list.addEventListener("keydown", (e) => {
      const active = getActiveItem() || dfDollar7(list).find('.sortable-item[tabindex="0"]')[0];
      if (!active)
        return;
      const items = getItems();
      const idx = items.indexOf(active);
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
      } else if (e.key === NEXT_KEY && e.altKey) {
        e.preventDefault();
        if (idx < items.length - 1) {
          const sibling = items[idx + 1];
          dfDollar7(sibling).after(active);
          const newItems = getItems();
          const newIdx = newItems.indexOf(active);
          announce(`${getItemLabel(active)}, moved to position ${newIdx + 1} of ${newItems.length}`);
          setActive(active);
          list.dispatchEvent(new CustomEvent("sortable-change", {
            bubbles: true,
            detail: { item: active, index: newIdx }
          }));
        }
      } else if (e.key === PREV_KEY && e.altKey) {
        e.preventDefault();
        if (idx > 0) {
          const sibling = items[idx - 1];
          dfDollar7(sibling).before(active);
          const newItems = getItems();
          const newIdx = newItems.indexOf(active);
          announce(`${getItemLabel(active)}, moved to position ${newIdx + 1} of ${newItems.length}`);
          setActive(active);
          list.dispatchEvent(new CustomEvent("sortable-change", {
            bubbles: true,
            detail: { item: active, index: newIdx }
          }));
        }
      }
    });
    list.addEventListener("focusin", (e) => {
      const item = e.target.closest(".sortable-item");
      if (item && list.contains(item))
        setActive(item);
    });
  });
}
init22();
new MutationObserver(init22).observe(document, { childList: true, subtree: true });

// src/components/steps/steps.ts
var df$23 = defussGlobals();
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
  const active = Math.min(total, Math.max(1, numAttr3(ol, "activeStep", 1)));
  const raw = ol.dataset.errorStep ?? "";
  const error = raw === "true" ? active : parseInt(raw, 10) || 0;
  if (ol.dataset.activeStep !== String(active))
    ol.dataset.activeStep = String(active);
  items.forEach((item, i) => {
    const n = i + 1;
    const status = n === error ? "error" : n < active ? "complete" : n === active ? "current" : null;
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
function triggerStateChange23(ol, stateName, config = {}) {
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
    triggerStateChange23(ol, stateName, config);
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
df$23.stepsApi = stepsApi;
df$23.stepsStates = stepsStates;
function init23() {
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
init23();
new MutationObserver(init23).observe(document, { childList: true, subtree: true });

// src/components/tabs/tabs.ts
var df$24 = defussGlobals();
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
function triggerStateChange24(tab, triggers, stateName, _config) {
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
    triggerStateChange24(tab, triggers, stateName, config);
    tab._stateConfig = config;
  },
  getState(tab) {
    return {
      name: tab.getAttribute("aria-selected") === "true" ? "active" : "default",
      config: tab._stateConfig ?? {}
    };
  }
};
df$24.tabsApi = tabsApi;
df$24.tabsStates = tabsStates;
function init24() {
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
    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        activateTab(trigger, triggers);
      });
      trigger.addEventListener("keydown", (e) => {
        const current = triggers.indexOf(trigger);
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
init24();
new MutationObserver(init24).observe(document, { childList: true, subtree: true });

// src/components/theme-switcher/theme-switcher.ts
var df$25 = defussGlobals();
var dfDollar8 = defussQuery();
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
    dfDollar8(tokens2).after(link);
  else
    dfDollar8(document.head).append(link);
  syncTrigger(root, id);
  document.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { id } }));
}
function syncTrigger(root, id) {
  const $root = dfDollar8(root);
  const trigger = $root.find(".theme-switcher-trigger")[0];
  const items = Array.from($root.find(".theme-switcher-item"));
  const active = items.find((i) => i.dataset.themeId === id);
  items.forEach((i) => dfDollar8(i).attr("aria-checked", i === active ? "true" : "false"));
  if (!trigger)
    return;
  const dot = dfDollar8(trigger).find(".theme-switcher-dot")[0];
  const label = dfDollar8(trigger).find(".theme-switcher-label")[0];
  const first = active?.dataset.themeColors?.split(",")[0]?.trim();
  if (dot)
    dfDollar8(dot).css("background", first || "");
  if (label && (active || id === "default"))
    dfDollar8(label).text(active?.dataset.themeLabel || "Default");
  root.dataset.themeId = id;
}
function triggerStateChange25(menu, stateName, _config) {
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
    triggerStateChange25(menu, stateName, config);
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
df$25.themeSwitcherApi = themeSwitcherApi;
df$25.themeSwitcherStates = themeSwitcherStates;
function init25() {
  document.querySelectorAll(".theme-switcher-menu:not([data-init])").forEach((menu) => {
    menu.dataset.init = "";
    const root = menu.closest(".theme-switcher");
    const trigger = root?.querySelector(".theme-switcher-trigger") ?? (menu.id && document.querySelector(`[popovertarget="${menu.id}"]`));
    const getItems = () => Array.from(menu.querySelectorAll(".theme-switcher-item"));
    if (trigger) {
      const anchorId = `--theme-switcher-${menu.id || "menu"}`;
      dfDollar8(trigger).css("anchorName", anchorId);
      dfDollar8(menu).css("positionAnchor", anchorId);
    }
    menu.addEventListener("toggle", () => {
      if (trigger)
        dfDollar8(trigger).attr("aria-expanded", menu.matches(":popover-open") ? "true" : "false");
      if (menu.matches(":popover-open")) {
        const first = getItems()[0];
        first?.focus();
        if (first)
          requestAnimationFrame(() => {
            if (menu.matches(":popover-open") && document.activeElement === trigger)
              first.focus();
          });
      }
    });
    getItems().forEach((item) => {
      const holder = item.querySelector(".theme-switcher-dots");
      if (holder && !holder.childElementCount) {
        const spans = (item.dataset.themeColors || "").split(",").slice(0, 5).map((c) => c.trim()).filter(Boolean).map((c) => `<span style="background:${c}"></span>`).join("");
        dfDollar8(holder).html(spans);
      }
    });
    menu.addEventListener("click", (e) => {
      const item = e.target.closest(".theme-switcher-item");
      if (!item || !root)
        return;
      applyThemeId(root, item.dataset.themeId || "default");
      menu.hidePopover();
      trigger?.focus();
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
init25();
new MutationObserver(init25).observe(document, { childList: true, subtree: true });

// src/components/toast/toast.ts
var df$26 = defussGlobals();
var dfDollar9 = defussQuery();
var toastStates = ["default"];
function triggerStateChange26(container, stateName, _config) {
  if (stateName !== "default")
    return;
  container.querySelectorAll(".toast").forEach((el) => toastDismiss(el));
}
var toastApi = {
  setState(container, stateName, config = {}) {
    if (!toastStates.includes(stateName)) {
      throw new Error(`toast: unknown state "${stateName}" (supported: ${toastStates.join(", ")})`);
    }
    triggerStateChange26(container, stateName, config);
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
df$26.toastApi = toastApi;
df$26.toastStates = toastStates;
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
  dfDollar9(document.body).append(toastContainer);
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
    dfDollar9(el).remove();
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
    dfDollar9(contentEl).append(dfDollar9(icons[variant]));
  }
  const textDiv = document.createElement("div");
  textDiv.className = "toast-text";
  if (title) {
    const p = document.createElement("p");
    p.className = "toast-title";
    dfDollar9(p).text(title);
    dfDollar9(textDiv).append(p);
  }
  if (description) {
    const p = document.createElement("p");
    p.className = "toast-description";
    dfDollar9(p).text(description);
    dfDollar9(textDiv).append(p);
  }
  dfDollar9(contentEl).append(textDiv);
  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.dataset.toastClose = "";
  dfDollar9(closeBtn).html('<svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>');
  dfDollar9(contentEl).append(closeBtn);
  dfDollar9(el).append(contentEl);
  if (action) {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "toast-actions";
    const actionBtn = document.createElement("button");
    actionBtn.className = "btn";
    actionBtn.setAttribute("data-variant", "outline");
    actionBtn.setAttribute("data-size", "sm");
    actionBtn.dataset.toastAction = "";
    dfDollar9(actionBtn).text(action.label);
    dfDollar9(actionsDiv).append(actionBtn);
    dfDollar9(el).append(actionsDiv);
  }
  dfDollar9(toastContainer).append(el);
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
function init26() {
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
init26();
new MutationObserver(init26).observe(document.body, { childList: true, subtree: true });
df$26.toast = {
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
var df$27 = defussGlobals();
var toggleStates = ["default", "pressed"];
function triggerStateChange27(toggle, stateName, _config) {
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
    triggerStateChange27(toggle, stateName, config);
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
df$27.toggleApi = toggleApi;
df$27.toggleStates = toggleStates;
function init27() {
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
init27();
new MutationObserver(init27).observe(document, { childList: true, subtree: true });

// src/components/toggle-group/toggle-group.ts
var df$28 = defussGlobals();
var toggleGroupStates = ["default", "disabled"];
function triggerStateChange28(group, stateName, _config) {
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
    triggerStateChange28(group, stateName, config);
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
df$28.toggleGroupApi = toggleGroupApi;
df$28.toggleGroupStates = toggleGroupStates;
function init28() {
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
      const active = pressed || toggles[0];
      toggles.forEach((t) => {
        t.setAttribute("tabindex", t === active ? "0" : "-1");
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
init28();
new MutationObserver(init28).observe(document, { childList: true, subtree: true });

// src/components/toolbar/toolbar.ts
var df$29 = defussGlobals();
var toolbarStates = ["default"];
function triggerStateChange29(toolbar, items, stateName, config) {
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
    triggerStateChange29(toolbar, items, stateName, config);
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
df$29.toolbarApi = toolbarApi;
df$29.toolbarStates = toolbarStates;
var toolbarItems = (toolbar) => Array.from(toolbar.querySelectorAll('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])'));
function init29() {
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
init29();
new MutationObserver(init29).observe(document, { childList: true, subtree: true });

// src/components/tooltip/tooltip.ts
var df$30 = defussGlobals();
var tooltipStates = ["default", "visible"];
function triggerStateChange30(tip, stateName, _config) {
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
    triggerStateChange30(tip, stateName, config);
    tip.dataset.stateName = stateName;
    tip._stateConfig = config;
  },
  getState(tip) {
    return { name: tip.dataset.stateName || "default", config: tip._stateConfig ?? {} };
  }
};
df$30.tooltipApi = tooltipApi;
df$30.tooltipStates = tooltipStates;
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
function init30() {
  document.querySelectorAll("[data-tooltip-trigger]:not([data-init])").forEach((trigger) => {
    trigger.dataset.init = "";
    const tip = document.getElementById(trigger.dataset.tooltipTrigger);
    if (!tip)
      return;
    const anchorId = `--tooltip-${tip.id}`;
    trigger.style.anchorName = anchorId;
    tip.style.positionAnchor = anchorId;
    trigger.setAttribute("aria-describedby", tip.id);
    const delay = Number(trigger.dataset.delay ?? DELAY_DEFAULT);
    const closeDelay = Number(trigger.dataset.closeDelay ?? CLOSE_DELAY_DEFAULT);
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
    trigger.addEventListener("mouseenter", show);
    trigger.addEventListener("mouseleave", hide);
    trigger.addEventListener("focus", show);
    trigger.addEventListener("blur", hide);
  });
  document.querySelectorAll(".tooltip[popover]:not([data-init])").forEach((tip) => {
    tip.dataset.init = "";
    tip.api = {
      setState: (stateName, config) => tooltipApi.setState(tip, stateName, config),
      getState: () => tooltipApi.getState(tip)
    };
  });
}
init30();
new MutationObserver(init30).observe(document, { childList: true, subtree: true });
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
var df$31 = defussGlobals();
var treeViewStates = ["default", "expanded"];
function triggerStateChange31(details, stateName, _config) {
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
    triggerStateChange31(details, stateName, config);
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
df$31.treeViewApi = treeViewApi;
df$31.treeViewStates = treeViewStates;
function init31() {
  document.querySelectorAll('.tree[role="tree"]:not([data-init])').forEach((tree) => {
    tree.dataset.init = "";
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
            if (detailsR && !detailsR.open)
              detailsR.open = true;
          }
          break;
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
init31();
new MutationObserver(init31).observe(document, { childList: true, subtree: true });

//# debugId=A14EE0D03B71940D64756E2164756E21
/* defuss-shadcn v0.9.0 runtime provenance: bundles defuss-morph@0.1.1 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599) + defuss-query@0.1.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599); full notice: NOTICE.txt */
//# sourceMappingURL=all.js.map
