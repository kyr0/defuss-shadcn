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
  CAPTURE_ONLY_EVENTS: () => CAPTURE_ONLY_EVENTS,
  CLASS_ATTRIBUTE_NAME: () => CLASS_ATTRIBUTE_NAME,
  COMMENT_TYPE: () => COMMENT_TYPE,
  DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE: () => DANGEROUSLY_SET_INNER_HTML_ATTRIBUTE,
  DEFAULT_TRANSITION_CONFIG: () => DEFAULT_TRANSITION_CONFIG,
  FROM_DOM_MARKER: () => FROM_DOM_MARKER,
  REF_ATTRIBUTE_NAME: () => REF_ATTRIBUTE_NAME,
  XLINK_ATTRIBUTE_NAME: () => XLINK_ATTRIBUTE_NAME,
  XMLNS_ATTRIBUTE_NAME: () => XMLNS_ATTRIBUTE_NAME,
  applyStyles: () => applyStyles,
  areDomNodesEqual: () => areDomNodesEqual,
  clearDelegatedEvents: () => clearDelegatedEvents,
  clearDelegatedEventsDeep: () => clearDelegatedEventsDeep,
  domNodeToVNode: () => domNodeToVNode,
  getMimeType: () => getMimeType,
  getRegisteredEventKeys: () => getRegisteredEventKeys,
  getRegisteredEventTypes: () => getRegisteredEventTypes,
  getRenderer: () => getRenderer,
  getTransitionStyles: () => getTransitionStyles,
  handleLifecycleEventsForOnMount: () => handleLifecycleEventsForOnMount,
  htmlStringToVNodes: () => htmlStringToVNodes,
  isCommentVNode: () => isCommentVNode,
  isHTML: () => isHTML,
  isMarkup: () => isMarkup,
  isSVG: () => isSVG,
  morph: () => morph,
  nsMap: () => nsMap,
  observeUnmount: () => observeUnmount,
  onClearDelegatedEvents: () => onClearDelegatedEvents,
  parseDOM: () => parseDOM,
  parseEventPropName: () => parseEventPropName,
  performTransition: () => performTransition,
  queueCallback: () => queueCallback,
  registerDelegatedEvent: () => registerDelegatedEvent,
  removeDelegatedEvent: () => removeDelegatedEvent,
  removeDelegatedEventByKey: () => removeDelegatedEventByKey,
  renderMarkup: () => renderMarkup,
  replaceDomWithVdom: () => replaceDomWithVdom,
  resolveGlobals: () => resolveGlobals,
  updateDomWithVdom: () => updateDomWithVdom
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
var slotListeners = /* @__PURE__ */ new WeakMap;
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
var runSlot = (target, eventType, phase, event) => {
  const handler = elementHandlerMap.get(target)?.get(eventType)?.[phase];
  if (!handler)
    return;
  const dispatchKey = `${eventType}:${phase}`;
  let active = activeDispatches.get(target);
  if (active?.has(dispatchKey))
    return;
  if (!active) {
    active = /* @__PURE__ */ new Set;
    activeDispatches.set(target, active);
  }
  active.add(dispatchKey);
  try {
    handler.call(target, event);
  } finally {
    active.delete(dispatchKey);
  }
};
var setSlot = (target, eventType, phase, entry, handler) => {
  entry[phase] = handler;
  const key = `${eventType}:${phase}`;
  const capture = phase === "capture";
  let byKey = slotListeners.get(target);
  const installed = byKey?.get(key);
  if (handler && !installed) {
    if (!byKey) {
      byKey = /* @__PURE__ */ new Map;
      slotListeners.set(target, byKey);
    }
    const trampoline = (event) => runSlot(target, eventType, phase, event);
    byKey.set(key, trampoline);
    target.addEventListener(eventType, trampoline, capture);
  } else if (!handler && installed) {
    byKey.delete(key);
    target.removeEventListener(eventType, installed, capture);
  }
};
var clearPhase = (target, eventType, entry, phase) => {
  setSlot(target, eventType, phase, entry, undefined);
  const setKey = phase === "capture" ? "captureSet" : "bubbleSet";
  for (const handler of entry[setKey] ?? [])
    target.removeEventListener(eventType, handler, phase === "capture");
  entry[setKey] = undefined;
};
var registerDelegatedEvent = (element, eventType, handler, options = {}) => {
  const capture = options.capture || CAPTURE_ONLY_EVENTS.has(eventType);
  const phase = capture ? "capture" : "bubble";
  const byEvent = getOrCreateElementHandlers(element);
  const entry = byEvent.get(eventType) ?? {};
  byEvent.set(eventType, entry);
  if (options.multi) {
    const setKey = capture ? "captureSet" : "bubbleSet";
    const set = entry[setKey] ??= /* @__PURE__ */ new Set;
    if (!set.has(handler)) {
      set.add(handler);
      element.addEventListener(eventType, handler, capture);
    }
  } else {
    setSlot(element, eventType, phase, entry, handler);
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
    for (const phase of ["capture", "bubble"]) {
      const set = phase === "capture" ? entry.captureSet : entry.bubbleSet;
      if (set?.delete(handler))
        target.removeEventListener(eventType, handler, phase === "capture");
      if (entry[phase] === handler)
        setSlot(target, eventType, phase, entry, undefined);
    }
  } else {
    clearPhase(target, eventType, entry, "capture");
    clearPhase(target, eventType, entry, "bubble");
  }
  if (isEntryEmpty(entry)) {
    byEvent.delete(eventType);
  }
};
var clearHooks = /* @__PURE__ */ new Set;
var onClearDelegatedEvents = (hook) => {
  clearHooks.add(hook);
  return () => {
    clearHooks.delete(hook);
  };
};
var clearDelegatedEvents = (target) => {
  const byEvent = elementHandlerMap.get(target);
  if (byEvent) {
    for (const [eventType, entry] of byEvent) {
      clearPhase(target, eventType, entry, "capture");
      clearPhase(target, eventType, entry, "bubble");
    }
    byEvent.clear();
  }
  for (const hook of clearHooks)
    hook(target);
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
  clearPhase(element, eventType, entry, phase);
  if (isEntryEmpty(entry))
    byEvent.delete(eventType);
};
var FROM_DOM_MARKER = Symbol("defuss-morph.from-dom");
var COMMENT_TYPE = "#comment";
var isCommentVNode = (value) => !!value && typeof value === "object" && value.type === COMMENT_TYPE;
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
  if (node.nodeType === 8) {
    return { type: COMMENT_TYPE, value: node.nodeValue ?? "" };
  }
  return "";
}
var DOCUMENT_START = /^\s*(?:<!--[\s\S]*?-->\s*)*<(?:!doctype|html|head|body)[\s>/]/i;
function htmlStringToVNodes(html, Parser) {
  const parser = new Parser;
  const doc = parser.parseFromString(DOCUMENT_START.test(html) ? html : `<body>${html}`, "text/html");
  const vNodes = [];
  for (let i = 0;i < doc.body.childNodes.length; i++) {
    const vnode = domNodeToVNode(doc.body.childNodes[i]);
    if (vnode !== "") {
      vNodes.push(vnode);
    }
  }
  return vNodes;
}
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
      if (isCommentVNode(virtualNode)) {
        const comment = document2.createComment(virtualNode.value ?? "");
        parentDomElement?.appendChild(comment);
        return comment;
      }
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
  if (oldNode.nodeType === 3 || oldNode.nodeType === 8) {
    if (oldNode.nodeValue !== newNode.nodeValue)
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
  if (isCommentVNode(child))
    return domNode.nodeType === 8;
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
function replaceNode(old, next) {
  if (old.nodeType === 1)
    clearDelegatedEventsDeep(old);
  old.parentNode?.replaceChild(next, old);
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
    replaceNode(domNode, next);
    return next;
  }
  if (isCommentVNode(child)) {
    const data = child.value ?? "";
    if (domNode.nodeType === 8) {
      if (domNode.nodeValue !== data)
        domNode.nodeValue = data;
      return domNode;
    }
    const next = globals.window.document.createComment(data);
    replaceNode(domNode, next);
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
      replaceNode(el, first);
      handleLifecycleEventsForOnMount(first);
      return first;
    }
    patchElementInPlace(el, child, globals, mergeAttributes);
    return el;
  }
  if (domNode.nodeType === 1)
    clearDelegatedEventsDeep(domNode);
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
    if (isCommentVNode(item))
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
    const tag = /^\s*(?:<!--[\s\S]*?-->\s*)*<([a-z][\w:-]*)/i.exec(html)?.[1].toLowerCase();
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
      parent.insertBefore(node, anchor);
      if (isElement(node))
        api.handleLifecycleEventsForOnMount(node);
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
  function morph(target, content, options) {
    requireMorph();
    const snapshot = (item) => isNode(item) ? item.nodeType === 11 ? Array.from(item.childNodes, (child) => api.domNodeToVNode(child)) : api.domNodeToVNode(item) : Array.isArray(item) ? item.map(snapshot) : item;
    return api.morph(target, typeof content === "string" ? parse(content, target) : snapshot(content), options);
  }
  function text(target, value) {
    requireMorph();
    if (isElement(target))
      morph(target, [value]);
    else if (target.nodeType === 3 || target.nodeType === 4)
      target.nodeValue = value;
  }
  return { create: render, insert, replace, remove, morph, text };
}

// node_modules/defuss-query/dist/query.js
var _a;
var QUERY_VERSION = "0.2.0";
var brand = Symbol.for("defuss-query.factory");
var nativeListeners = new WeakMap;
var detachListeners = (target, names, handler) => {
  const entries = nativeListeners.get(target);
  if (!entries)
    return;
  const kept = entries.filter((entry) => {
    const match = (!names || names.includes(entry.type)) && (!handler || entry.handler === handler);
    if (match)
      target.removeEventListener(entry.type, entry.handler, entry.capture);
    return !match;
  });
  if (kept.length)
    nativeListeners.set(target, kept);
  else
    nativeListeners.delete(target);
};
var clearListeners = (target) => detachListeners(target);
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
      throw new TypeError("defuss-query: on() supports capture only; use native addEventListener for other options");
    const capture = typeof options === "boolean" ? options : !!options.capture;
    for (const target of this)
      for (const name of tokens(type)) {
        const listener = handler;
        if (isElement(target)) {
          if (typeof this.#runtime.api.registerDelegatedEvent !== "function")
            throw new Error("defuss-query: load defuss-morph before on()");
          this.#runtime.api.onClearDelegatedEvents?.(clearListeners);
        }
        target.addEventListener(name, listener, capture);
        const entries = nativeListeners.get(target) ?? [];
        if (!entries.some((entry) => entry.type === name && entry.handler === listener && entry.capture === capture))
          entries.push({ type: name, handler: listener, capture });
        nativeListeners.set(target, entries);
      }
    return this;
  }
  off(type, handler) {
    const names = type === undefined ? undefined : tokens(type);
    for (const target of this)
      detachListeners(target, names, handler);
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
function debounce(fn, wait) {
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
    timer = setTimeout(invoke, wait);
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
// src/shared/locale.ts
var DEFAULT_LOCALE = "en";
function valid(tag) {
  const t = tag?.trim();
  if (!t)
    return null;
  try {
    return Intl.getCanonicalLocales(t)[0] ?? null;
  } catch {
    return null;
  }
}
function textLocale(el) {
  return valid(el?.closest?.("[lang]")?.getAttribute("lang")) ?? valid(typeof document !== "undefined" ? document.documentElement?.getAttribute("lang") : null) ?? DEFAULT_LOCALE;
}
// src/shared/keys.ts
var handlers = new Map;
var listening = false;
var isEditable = (target) => target instanceof HTMLElement && (target.isContentEditable || target.closest('input, textarea, select, [contenteditable="true"]') !== null);
var isEditableTarget = (event) => isEditable(event.target);
function onKeydown(event) {
  const editable = isEditable(event.target);
  for (const [handler, opts] of handlers) {
    if (editable && !opts.editable)
      continue;
    if (handler(event) === true)
      break;
  }
}
function bindGlobalKeys(handler, options = {}) {
  handlers.set(handler, { ...options });
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
  "clearDelegatedEventsDeep",
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
  const fmt = opts.format ?? ((n) => new Intl.NumberFormat(textLocale(el), {
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
    let t0 = -1;
    const tick = (now) => {
      if (t0 < 0)
        t0 = now;
      const p = Math.min(1, Math.max(0, (now - t0) / duration));
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
  const mount = el?.closest(".presentation") ?? (typeof document !== "undefined" ? defussQuery()(".presentation").get(0) ?? null : null);
  if (!mount)
    throw new Error("ddf$: no .presentation element found");
  const slides = () => defussQuery()(mount).find(":scope > [data-slide]").toArray();
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
// src/shared/render.ts
var RUNTIME_ATTRS = ["data-init", "data-api", "data-state-name"];
var AUTHORED = new WeakMap;
var inert = null;
function captureAuthored(root) {
  inert ??= document.implementation.createHTMLDocument("");
  const copy = inert.importNode(root, true);
  const live = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  const twin = document.createTreeWalker(copy, NodeFilter.SHOW_ELEMENT);
  for (let a = live.currentNode, b = twin.currentNode;a && b; a = live.nextNode(), b = twin.nextNode())
    if (!AUTHORED.has(a))
      AUTHORED.set(a, b);
}
function elementModel(el, runtimeAttrs = []) {
  const skip = new Set([...RUNTIME_ATTRS, ...runtimeAttrs]);
  const src = AUTHORED.get(el) ?? el;
  return {
    tag: src.localName,
    attrs: Array.from(src.attributes).filter((a) => !skip.has(a.name)).map((a) => [a.name, a.value]),
    html: defussQuery()(src).html() ?? ""
  };
}
function renderModel(model, apply) {
  const $ = defussQuery();
  const node = $(`<${model.tag}></${model.tag}>`);
  for (const [name, value] of model.attrs)
    node.attr(name, value);
  node.html(model.html);
  const host = $("<div></div>").append(node);
  const el = node.get(0);
  if (el && apply)
    apply(el);
  return host.html() ?? "";
}
// node_modules/defuss-store/dist/internal-C4BA7RyW.js
var INTERNAL = /* @__PURE__ */ Symbol.for("defuss-store.internal.v1");
function installInternal(store, api) {
  Object.defineProperty(store, INTERNAL, { value: api });
}
function internalOf(store) {
  const api = store[INTERNAL];
  if (!api)
    throw new TypeError("Expected a defuss-store v1 protocol store");
  return api;
}
function reportError(error) {
  try {
    console.error(error);
  } catch {}
}
function isContainer(value) {
  return typeof value === "object" && value !== null && (Array.isArray(value) || Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null);
}

// node_modules/defuss-store/dist/index.js
var own = (value, key) => Object.hasOwn(value, key);
function parsePath(path) {
  if (typeof path !== "string" || !path)
    throw new TypeError("A nonempty path is required");
  const invalid = () => new TypeError(`Invalid path: ${path}`);
  const keys = [];
  for (let i = 0;i < path.length; ) {
    const bracket = path[i] === "[";
    const start = bracket ? ++i : i;
    let index = 0;
    let canonical = true;
    for (let code;i < path.length && (code = path.charCodeAt(i)) !== 46 && code !== 91 && code !== 93; i++) {
      canonical &&= code > 47 && code < 58 && (i === start || index > 0);
      index = index * 10 + code - 48;
    }
    if (i === start || bracket && (!canonical || path[i++] !== "]"))
      throw invalid();
    if (canonical) {
      if (index > 4294967294)
        throw new RangeError("Array index out of range");
      keys.push(index);
    } else {
      const key = path.slice(start, i);
      if (key === "__proto__" || key === "prototype" || key === "constructor")
        throw new TypeError(`Unsafe path segment: ${key}`);
      keys.push(key);
    }
    if (path[i] === ".") {
      if (++i === path.length || path[i] === "[")
        throw invalid();
    } else if (i < path.length && path[i] !== "[")
      throw invalid();
  }
  return keys;
}
function getByPath(value, path) {
  for (const key of parsePath(path)) {
    if (Object(value) !== value || !own(value, key))
      return;
    value = value[key];
  }
  return value;
}
function setByPath(root, path, next) {
  const keys = parsePath(path);
  const deleting = next === undefined;
  function visit(current, depth) {
    const key = keys[depth];
    if (!isContainer(current)) {
      if (current != null)
        throw new TypeError("Path updates require plain objects or arrays");
      if (deleting)
        return current;
      current = typeof key === "number" ? [] : {};
    }
    const source = current;
    const array = Array.isArray(source);
    if (array && typeof key !== "number")
      throw new TypeError("Array paths require nonnegative indices");
    const exists = own(source, key);
    if (!exists && deleting)
      return current;
    const old = exists ? source[key] : undefined;
    const leaf = depth === keys.length - 1;
    const updated = leaf ? next : visit(old, depth + 1);
    if (Object.is(old, updated) && (!deleting || !leaf))
      return current;
    const copy = array ? source.slice() : { ...source, [key]: updated };
    if (leaf && deleting) {
      if (array)
        copy.splice(key, 1);
      else
        delete copy[key];
    } else if (array) {
      if (exists)
        copy[key] = updated;
      else
        Object.defineProperty(copy, key, { value: updated, enumerable: true, configurable: true, writable: true });
    }
    return copy;
  }
  return visit(root, 0);
}
function createStore(initial, options = {}) {
  const equals = options.equals ?? Object.is;
  let value = initial;
  let destroyed = false;
  let revision = 0;
  let draining = false;
  const listeners = /* @__PURE__ */ new Set;
  let snapshot;
  const cleanups = /* @__PURE__ */ new Set;
  const queue = [];
  function alive() {
    if (destroyed)
      throw new Error("Store is destroyed");
  }
  function observe(listener) {
    alive();
    const registration = { listener, active: true };
    listeners.add(registration);
    snapshot = undefined;
    return () => {
      registration.active = false;
      if (listeners.delete(registration))
        snapshot = undefined;
    };
  }
  function commit(next, path, origin) {
    alive();
    if (equals(value, next))
      return;
    const previous = value;
    value = next;
    ++revision;
    if (!listeners.size)
      return;
    queue.push({ value, previous, path, origin, revision, listeners: snapshot ??= [...listeners] });
    if (draining)
      return;
    draining = true;
    const errors = [];
    try {
      for (let index = 0;index < queue.length; index++) {
        const entry = queue[index];
        for (const registration of entry.listeners) {
          if (!registration.active)
            continue;
          try {
            registration.listener(entry);
          } catch (error) {
            errors.push(error);
          }
        }
      }
    } finally {
      queue.length = 0;
      draining = false;
    }
    if (errors.length)
      throw new AggregateError(errors, "Store listeners failed after state committed");
  }
  function subscribe(select, listener, options2 = {}) {
    alive();
    if (typeof listener !== "function") {
      options2 = listener ?? {};
      listener = select;
      select = undefined;
    }
    const notify = listener;
    const compare = options2.equals ?? Object.is;
    let selected = select?.(value);
    const off = observe((change) => {
      let next = change.value;
      let old = change.previous;
      if (select) {
        next = select(change.value);
        if (compare(selected, next))
          return;
        old = selected;
        selected = next;
      }
      notify(next, old, change.path);
    });
    try {
      if (options2.immediate)
        notify(select ? selected : value, undefined, undefined);
    } catch (error) {
      off();
      throw error;
    }
    return off;
  }
  const store = {
    get value() {
      return value;
    },
    get destroyed() {
      return destroyed;
    },
    get: (path) => path ? getByPath(value, path) : value,
    getRaw: () => value,
    set(pathOrValue, next) {
      alive();
      if (arguments.length === 1)
        commit(pathOrValue);
      else if (arguments.length === 2 && typeof pathOrValue === "string")
        commit(setByPath(value, pathOrValue, next), pathOrValue);
      else
        throw new TypeError("set expects a value or a string path and value");
    },
    setRaw: (next) => commit(next),
    update(updater) {
      alive();
      commit(updater(value));
    },
    remove(path) {
      alive();
      commit(setByPath(value, path, undefined), path);
    },
    reset(next) {
      commit(arguments.length ? next : initial);
    },
    subscribe,
    onDestroy(cleanup) {
      alive();
      cleanups.add(cleanup);
      return () => {
        cleanups.delete(cleanup);
      };
    },
    destroy() {
      if (destroyed)
        return;
      destroyed = true;
      for (const registration of listeners)
        registration.active = false;
      listeners.clear();
      snapshot = undefined;
      const errors = [];
      for (const cleanup of cleanups) {
        cleanups.delete(cleanup);
        try {
          cleanup();
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length)
        throw new AggregateError(errors, "Store cleanup failed");
    }
  };
  installInternal(store, { set: (next, origin) => commit(next, undefined, origin), observe, revision: () => revision });
  return store;
}
function computed(inputs, project, options) {
  const sources = Array.isArray(inputs) ? inputs : [inputs];
  if (sources.some((source) => source.destroyed))
    throw new Error("Computed source is destroyed");
  const calculate = () => project(...sources.map((source) => source.value));
  const target = createStore(calculate(), options);
  const releases = [];
  target.onDestroy(() => {
    for (const release of releases.splice(0))
      release();
  });
  try {
    for (const source of new Set(sources)) {
      releases.push(source.subscribe(() => target.setRaw(calculate())));
      releases.push(source.onDestroy(() => target.destroy()));
    }
  } catch (error) {
    target.destroy();
    throw error;
  }
  return {
    get value() {
      return target.value;
    },
    get destroyed() {
      return target.destroyed;
    },
    get: target.get,
    getRaw: target.getRaw,
    subscribe: target.subscribe,
    onDestroy: target.onDestroy,
    destroy: target.destroy
  };
}
var jsonEquals = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// src/shared/component-state.ts
var entries = new WeakMap;
function sameState(a, b) {
  if (a === b)
    return true;
  if (!a || !b || a.name !== b.name)
    return false;
  try {
    return JSON.stringify(a.config) === JSON.stringify(b.config);
  } catch {
    return a.config === b.config;
  }
}
function entryOf(el, api) {
  const entry = entries.get(el);
  if (entry)
    return entry;
  bindComponent(el, api);
  return entries.get(el);
}
function quietly(entry, next) {
  entry.recorded.add(next);
  entry.store.set(next);
}
function applyAndRecord(el, entry, next, previous, incoming = next.config) {
  entry.observer?.takeRecords();
  const result = entry.spec.apply(el, next, previous, incoming);
  const named = entry.observer?.takeRecords().some((r) => r.attributeName === "data-state-name") && el.dataset.stateName;
  quietly(entry, named && entry.spec.states.includes(named) ? { name: named, config: next.config } : { ...next });
  if (result && typeof result.then === "function") {
    const pending = Promise.resolve(result).then(() => {
      if (entries.get(el) === entry)
        sync(el, entry);
    }, () => {
      if (entries.get(el) === entry)
        sync(el, entry);
    });
    entry.pending = pending;
  }
  return result;
}
function sync(el, entry) {
  const current = entry.store.value;
  const read = entry.spec.read ? entry.spec.read(el, current) : { name: el.dataset.stateName || current.name, config: current.config };
  if (!sameState(read, current))
    quietly(entry, read);
}
function componentState(spec) {
  const validate = (name) => {
    if (!spec.states.includes(name)) {
      throw new Error(`${spec.component}: unknown state "${name}" (supported: ${spec.states.join(", ")})`);
    }
  };
  const api = {
    setState(el, name, config = {}) {
      validate(name);
      const entry = entryOf(el, api);
      const previous = entry.store.value;
      const next = { name, config: spec.mergeConfig ? { ...previous.config, ...config } : config };
      const result = applyAndRecord(el, entry, next, previous, config);
      sync(el, entry);
      return result;
    },
    getState(el) {
      const entry = entryOf(el, api);
      sync(el, entry);
      return { ...entry.store.value, model: entry.model };
    },
    render(state) {
      return renderModel(state.model, (copy) => spec.markup?.(copy, state));
    },
    store(el) {
      return entryOf(el, api).store;
    },
    commit(el, name, config) {
      validate(name);
      const entry = entryOf(el, api);
      const next = { name, config: config ?? entry.store.value.config };
      if (!sameState(next, entry.store.value))
        quietly(entry, next);
    }
  };
  api.spec = spec;
  return api;
}
function unbindComponent(el) {
  const entry = entries.get(el);
  if (!entry)
    return;
  entries.delete(el);
  entry.observer?.disconnect();
  entry.unlisten?.();
  entry.store.destroy();
  const host = el;
  if (host.store === entry.store)
    delete host.store;
}
function bindComponent(el, api, initial) {
  const spec = api.spec;
  const known = entries.get(el);
  if (known?.bound)
    return known.bound;
  const start = initial ?? { name: el.dataset.stateName || "default", config: {} };
  const store = createStore(start, { equals: sameState });
  const entry = { store, model: elementModel(el), recorded: new WeakSet, spec, queued: false };
  entries.set(el, entry);
  const host = el;
  store.subscribe((next, previous) => {
    if (host.dataset.stateName !== next.name)
      host.dataset.stateName = next.name;
    if (!previous || entry.recorded.has(next))
      return;
    if (store.value !== next)
      return;
    if (!spec.states.includes(next.name))
      throw new Error(`${spec.component}: unknown state "${next.name}"`);
    applyAndRecord(host, entry, next, previous);
    sync(host, entry);
  }, { immediate: true });
  const later = () => {
    if (entry.queued)
      return;
    entry.queued = true;
    queueMicrotask(() => {
      entry.queued = false;
      if (entries.get(el) === entry && !store.destroyed)
        sync(host, entry);
    });
  };
  for (const type of spec.events ?? [])
    host.addEventListener(type, later);
  entry.unlisten = () => {
    for (const type of spec.events ?? [])
      host.removeEventListener(type, later);
  };
  entry.observer = new MutationObserver((records) => {
    if (records.some((r) => r.attributeName !== "data-init"))
      later();
  });
  entry.observer.observe(host, { attributes: true, subtree: true });
  const bound = {
    setState: (name, config) => api.setState(el, name, config),
    getState: () => api.getState(el),
    render: (state) => api.render(state ?? api.getState(el)),
    settled: async () => {
      let seen;
      while (entry.pending && entry.pending !== seen) {
        seen = entry.pending;
        await seen;
      }
    }
  };
  entry.bound = bound;
  Object.assign(el, { api: bound, store });
  return bound;
}
// node_modules/defuss-store/dist/codec-CUhpHYA_.js
function assertJsonValue(value) {
  const active = [];
  function visit(item) {
    if (item === null || typeof item === "string" || typeof item === "boolean")
      return;
    if (typeof item === "number" && Number.isFinite(item) && !Object.is(item, -0))
      return;
    if (typeof item !== "object")
      throw new TypeError("Value is not lossless JSON data");
    if (active.includes(item))
      throw new TypeError("Cyclic values cannot be persisted as JSON");
    if (!isContainer(item))
      throw new TypeError("JSON persistence requires plain objects or arrays");
    const array = Array.isArray(item);
    const keys = Reflect.ownKeys(item);
    if (array && keys.length !== item.length + 1)
      throw new TypeError("Sparse or extended arrays are not JSON data");
    let extra = false;
    active.push(item);
    for (const key of keys) {
      if (array && key === "length") {
        extra = true;
        continue;
      }
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (typeof key === "symbol" || !descriptor.enumerable || !("value" in descriptor)) {
        throw new TypeError("JSON data cannot contain symbols, accessors or hidden properties");
      }
      if (extra)
        throw new TypeError("Extended arrays are not JSON data");
      visit(descriptor.value);
    }
    active.pop();
  }
  visit(value);
}
var jsonCodec = {
  encode(value) {
    assertJsonValue(value);
    return JSON.stringify(value);
  },
  decode(serialized) {
    const value = JSON.parse(serialized);
    assertJsonValue(value);
    return value;
  }
};

// node_modules/defuss-store/dist/storage/index.js
function createMemoryStorage() {
  const cache = /* @__PURE__ */ new Map;
  return {
    get length() {
      return cache.size;
    },
    key(index) {
      return Number.isInteger(index) && index >= 0 ? [...cache.keys()][index] ?? null : null;
    },
    getItem: (key) => cache.get(String(key)) ?? null,
    setItem: (key, value) => {
      cache.set(String(key), String(value));
    },
    removeItem: (key) => {
      cache.delete(String(key));
    },
    clear: () => {
      cache.clear();
    }
  };
}
function createWebStorage(area, options = {}) {
  if (area !== "local" && area !== "session")
    throw new TypeError("Storage area must be local or session");
  let backend;
  let host;
  function resolve() {
    if (backend)
      return backend;
    try {
      const browser = globalThis.window;
      const storage = browser?.document && browser[`${area}Storage`];
      if (!storage)
        throw new Error("Browser Web Storage is unavailable");
      host = browser;
      backend = storage;
    } catch (error) {
      if (!options.fallback)
        throw error;
      backend = options.fallback;
      try {
        options.onUnavailable?.(error);
      } catch (reportingError) {
        reportError(reportingError);
      }
    }
    return backend;
  }
  return {
    getItem: (key) => resolve().getItem(key),
    setItem: (key, value) => resolve().setItem(key, value),
    removeItem: (key) => resolve().removeItem(key),
    subscribe(listener) {
      const storage = resolve();
      const browser = host;
      if (!browser) {
        if (!storage.subscribe)
          throw new Error("Selected fallback does not support storage synchronization");
        return storage.subscribe(listener);
      }
      const handle = (event) => {
        if (event.storageArea === storage)
          listener({ key: event.key });
      };
      browser.addEventListener("storage", handle);
      return () => browser.removeEventListener("storage", handle);
    }
  };
}

// node_modules/defuss-store/dist/persist/index.js
var format = "defuss-store";
var validVersion = (value) => Number.isSafeInteger(value) && value >= 0;
function attachPersistence(store, options) {
  const api = internalOf(store);
  if (store.destroyed)
    throw new Error("Store is destroyed");
  if (api.persistence)
    throw new Error("Store already has an attached persistence controller");
  if (typeof options.key !== "string" || !validVersion(options.version) || typeof options.validate !== "function") {
    throw new TypeError("Persistence requires a string key, nonnegative schema version and validator");
  }
  if (options.legacyVersion !== undefined && !validVersion(options.legacyVersion))
    throw new TypeError("Invalid legacyVersion");
  const mode = options.hydrate ?? "immediate";
  if (!["immediate", "manual", "skip"].includes(mode))
    throw new TypeError("Invalid hydration mode");
  if (options.sync && !options.storage.subscribe)
    throw new TypeError("Storage backend does not support synchronization");
  const codec = options.codec ?? jsonCodec;
  const origin = {};
  let phase = mode === "skip" ? "active" : "paused";
  let dirty = true;
  let hasStoredValue = false;
  let lastError;
  let acceptedBytes;
  const releases = [];
  const dead = () => phase === "destroyed";
  function alive() {
    if (dead())
      throw new Error("Persistence controller is destroyed");
  }
  function fail(operation, error, pause = false) {
    if (dead())
      return false;
    lastError = { operation, key: options.key, error };
    dirty = true;
    if (pause)
      phase = "paused";
    try {
      if (options.onError)
        options.onError(lastError);
      else
        reportError(lastError);
    } catch (reportingError) {
      reportError(reportingError);
    }
    return false;
  }
  function settle(bytes, stale) {
    acceptedBytes = bytes;
    hasStoredValue = bytes !== null;
    dirty = stale;
    lastError = undefined;
    phase = "active";
    return true;
  }
  function write() {
    alive();
    const value = store.value;
    const revision = api.revision();
    let step = "validate";
    let bytes;
    try {
      if (!options.validate(value))
        throw new TypeError("Current state failed persistence validation");
      step = "encode";
      const envelope = { format, formatVersion: 1, version: options.version, value };
      bytes = codec.encode(envelope);
      if (typeof bytes !== "string")
        throw new TypeError("Codec must encode to a string");
      if (api.revision() !== revision || dead())
        return false;
      step = "write";
      options.storage.setItem(options.key, bytes);
    } catch (error) {
      return fail(step, error);
    }
    return dead() || settle(bytes, api.revision() !== revision);
  }
  function read(remote = false) {
    alive();
    let step = "read";
    let raw;
    let value;
    let stale = false;
    try {
      raw = options.storage.getItem(options.key);
      if (dead())
        return false;
      if (raw === null)
        return settle(null, true);
      if (typeof raw !== "string")
        throw new TypeError("Storage getItem must return string or null");
      hasStoredValue = true;
      if (remote && raw === acceptedBytes && !dirty && phase === "active")
        return true;
      step = "decode";
      const decoded = codec.decode(raw);
      step = "version";
      let version;
      if (typeof decoded === "object" && decoded?.format === format && !Array.isArray(decoded)) {
        if (decoded.formatVersion !== 1 || !validVersion(decoded.version) || !Object.hasOwn(decoded, "value")) {
          throw new TypeError("Unsupported or malformed persistence envelope");
        }
        version = decoded.version;
        value = decoded.value;
      } else if (options.legacyVersion !== undefined) {
        stale = true;
        version = options.legacyVersion;
        value = decoded;
      } else
        throw new TypeError("Expected a defuss-store envelope; raw data needs legacyVersion");
      if (version > options.version)
        throw new Error("Stored schema is newer than this application");
      if (version !== options.version) {
        stale = true;
        step = "migrate";
        if (!options.migrate)
          throw new Error("Schema migration is required");
        value = options.migrate(value, version);
      }
      step = "validate";
      if (!options.validate(value))
        throw new TypeError("Stored state failed validation");
    } catch (error) {
      return fail(step, error, true);
    }
    if (dead())
      return false;
    const revision = api.revision();
    settle(raw, stale);
    try {
      api.set(value, origin);
    } catch (error) {
      return fail("notify", error);
    }
    if (acceptedBytes === raw && api.revision() <= revision + 1 && !Object.is(store.value, value))
      dirty = true;
    return true;
  }
  const controller = {
    rehydrate: () => read(),
    flush: () => write(),
    clear() {
      alive();
      try {
        options.storage.removeItem(options.key);
      } catch (error) {
        return fail("remove", error);
      }
      return dead() || settle(null, true);
    },
    status: () => ({ phase, dirty, hasStoredValue, ...lastError ? { lastError } : {} }),
    destroy() {
      if (dead())
        return;
      phase = "destroyed";
      if (api.persistence === controller)
        delete api.persistence;
      const errors = [];
      for (const release of releases.splice(0)) {
        try {
          release();
        } catch (error) {
          errors.push(error);
        }
      }
      if (errors.length)
        throw new AggregateError(errors, "Persistence cleanup failed");
    }
  };
  api.persistence = controller;
  try {
    releases.push(api.observe((change) => {
      if (change.origin === origin)
        return;
      dirty = true;
      if (phase === "active" && change.revision === api.revision())
        write();
    }));
    releases.push(store.onDestroy(() => controller.destroy()));
    if (options.sync)
      releases.push(options.storage.subscribe((change) => {
        if (!dead() && (mode !== "manual" || acceptedBytes !== undefined) && (change.key === null || change.key === options.key))
          read(true);
      }));
    if (mode === "immediate")
      read();
  } catch (error) {
    controller.destroy();
    throw error;
  }
  return controller;
}

// src/shared/store.ts
var areas = {};
var inMemory = new Set;
function storageOf(area) {
  return areas[area] ??= createWebStorage(area, { fallback: createMemoryStorage(), onUnavailable: () => inMemory.add(area) });
}
function sameShape(initial) {
  const check = (model, value) => {
    if (model === null)
      return value === null;
    if (Array.isArray(model))
      return Array.isArray(value);
    if (typeof model === "object") {
      if (typeof value !== "object" || value === null || Array.isArray(value))
        return false;
      return Object.keys(model).every((k) => (k in value) && check(model[k], value[k]));
    }
    return typeof value === typeof model;
  };
  return (value) => check(initial, value);
}
function adoptingCodec(legacyVersion) {
  return {
    encode: (value) => jsonCodec.encode(value),
    decode: (serialized) => {
      let parsed;
      try {
        parsed = jsonCodec.decode(serialized);
      } catch {
        return { format: "defuss-store", formatVersion: 1, version: legacyVersion, value: serialized };
      }
      const isEnvelope = typeof parsed === "object" && parsed !== null && parsed.format === "defuss-store";
      return isEnvelope ? parsed : { format: "defuss-store", formatVersion: 1, version: legacyVersion, value: parsed };
    }
  };
}
var WRITE_EVENT = "defuss-store-write";
var peerSeq = 0;
var controllers = new WeakMap;
var controllerOf = (store) => controllers.get(store);
function reload(store) {
  return controllerOf(store)?.rehydrate() ?? false;
}
function forget(store) {
  return controllerOf(store)?.clear() ?? false;
}
function persistOk(store) {
  const status = controllerOf(store)?.status();
  return !!status && status.phase === "active" && !status.lastError;
}
function persisted(key, initial, options = {}) {
  const store = createStore(initial, { equals: jsonEquals });
  const area = options.storage ? null : options.area ?? "local";
  const controller = attachPersistence(store, {
    key,
    storage: options.storage ?? storageOf(area),
    version: options.version ?? 1,
    validate: options.validate ?? sameShape(initial),
    sync: options.sync ?? false,
    codec: adoptingCodec(options.migrate ? 0 : options.version ?? 1),
    ...options.migrate ? { migrate: (old, from) => from === 0 ? options.migrate(old) : old } : {},
    onError: options.onError ?? (() => {})
  });
  controllers.set(store, controller);
  store.subscribe(() => {
    if (controller.status().phase === "paused")
      controller.flush();
  });
  const doc = globalThis.document;
  if (doc && area) {
    const id = ++peerSeq + ":" + Math.random();
    let reading = false;
    store.subscribe(() => {
      if (!reading)
        doc.dispatchEvent(new CustomEvent(WRITE_EVENT, { detail: { area, key, id } }));
    });
    const onPeerWrite = (e) => {
      const d = e.detail;
      if (!d || d.id === id || d.area !== area || d.key !== key || store.destroyed)
        return;
      reading = true;
      try {
        controller.rehydrate();
      } finally {
        reading = false;
      }
    };
    doc.addEventListener(WRITE_EVENT, onPeerWrite);
    store.onDestroy(() => doc.removeEventListener(WRITE_EVENT, onPeerWrite));
  }
  return store;
}
function viewPersistence(el, kind, fallbackId, config = {}) {
  const area = config.area ?? el.dataset.persist ?? "session";
  if (area === "none")
    return null;
  const path = globalThis.location?.pathname ?? "";
  const prefix = config.prefix ?? el.dataset.persistPrefix ?? `defuss-shadcn:${path}`;
  const key = config.key ?? el.dataset.persistKey ?? `${prefix}:${kind}:${el.id || fallbackId}`;
  return { area: area === "local" ? "local" : "session", key };
}
// node_modules/defuss-dataview/dist/index.mjs
var forbidden = /* @__PURE__ */ new Set(["__proto__", "prototype", "constructor"]);
function fieldParts(field) {
  if (typeof field !== "string" || !field)
    throw new TypeError("Dataview field must be a non-empty dot path.");
  const parts = field.split(".");
  if (parts.some((part) => !part || forbidden.has(part)))
    throw new TypeError(`Invalid or unsafe Dataview field: ${field}`);
  return parts;
}
function compileAccessor(field) {
  const parts = fieldParts(field);
  if (parts.length === 1)
    return (row) => typeof row === "object" && row !== null && Object.hasOwn(row, field) ? row[field] : undefined;
  return (row) => {
    let current = row;
    for (const part of parts) {
      if (typeof current !== "object" || current === null || !Object.hasOwn(current, part))
        return;
      current = current[part];
    }
    return current;
  };
}
function setField(row, field, value) {
  const parts = fieldParts(field);
  const ancestors = [];
  let current = row;
  for (const part of parts) {
    if (current === undefined || current === null)
      current = /^(0|[1-9]\d*)$/.test(part) ? [] : {};
    if (typeof current !== "object" || current !== row && !Array.isArray(current) && Object.getPrototypeOf(current) !== Object.prototype && Object.getPrototypeOf(current) !== null) {
      throw new TypeError("Parent paths require plain objects or arrays.");
    }
    if (Array.isArray(current) && (!/^(0|[1-9]\d*)$/.test(part) || Number(part) > 4294967294))
      throw new TypeError("Array paths require valid nonnegative indices.");
    const container = current;
    ancestors.push(container);
    current = Object.hasOwn(container, part) ? container[part] : undefined;
  }
  if (Object.is(current, value))
    return row;
  let next = value;
  for (let index = parts.length - 1;index >= 0; index--) {
    const original = ancestors[index];
    const copy = Array.isArray(original) ? original.slice() : { ...original };
    Object.defineProperty(copy, parts[index], { value: next, enumerable: true, configurable: true, writable: true });
    next = copy;
  }
  return next;
}
function idKey(value) {
  if (value === null || typeof value === "boolean" || typeof value === "string" || typeof value === "number" && Number.isFinite(value))
    return JSON.stringify(value);
  const active = /* @__PURE__ */ new Set;
  function encode(item) {
    if (item === null || typeof item === "boolean" || typeof item === "string")
      return JSON.stringify(item);
    if (typeof item === "number" && Number.isFinite(item))
      return JSON.stringify(item);
    if (typeof item !== "object" || item === null)
      throw new TypeError("Dataview identifiers must be finite JSON values.");
    if (active.has(item))
      throw new TypeError("Dataview identifiers cannot contain cycles.");
    const array = Array.isArray(item);
    if (!array && Object.getPrototypeOf(item) !== Object.prototype && Object.getPrototypeOf(item) !== null) {
      throw new TypeError("Dataview identifiers require plain JSON objects.");
    }
    const ownKeys = Reflect.ownKeys(item);
    if (array && ownKeys.length !== item.length + 1)
      throw new TypeError("Sparse or extended arrays are not JSON identifiers.");
    const values = /* @__PURE__ */ new Map;
    for (const key of ownKeys) {
      if (array && key === "length")
        continue;
      const descriptor = Object.getOwnPropertyDescriptor(item, key);
      if (typeof key !== "string" || !descriptor.enumerable || !("value" in descriptor))
        throw new TypeError("Invalid JSON identifier property.");
      if (array && (!/^(0|[1-9]\d*)$/.test(key) || Number(key) >= item.length))
        throw new TypeError("Invalid JSON identifier array index.");
      values.set(key, descriptor.value);
    }
    active.add(item);
    try {
      if (array)
        return "[" + Array.from({ length: item.length }, (_, index) => encode(values.get(String(index)))).join(",") + "]";
      return "{" + [...values.keys()].sort().map((key) => JSON.stringify(key) + ":" + encode(values.get(key))).join(",") + "}";
    } finally {
      active.delete(item);
    }
  }
  return encode(value);
}
function uniqueIds(values) {
  const seen = /* @__PURE__ */ new Set;
  const result = [];
  for (const value of values) {
    const key = idKey(value);
    if (!seen.has(key)) {
      seen.add(key);
      result.push(JSON.parse(key));
    }
  }
  return result;
}
var rowIdKey = (value) => value == null ? undefined : idKey(value);
function selectionKey(value) {
  try {
    return rowIdKey(value);
  } catch (error) {
    if (error instanceof TypeError)
      return;
    throw error;
  }
}
var invalid = (value) => value == null || typeof value === "number" && Number.isNaN(value) || value instanceof Date && Number.isNaN(value.getTime());
var rank = (value) => value == null ? 7 : invalid(value) ? 6 : typeof value === "boolean" ? 0 : typeof value === "number" ? 1 : typeof value === "bigint" ? 2 : typeof value === "string" ? 3 : value instanceof Date ? 4 : 5;
function compareValues(left, right) {
  if (Object.is(left, right) || left === right)
    return 0;
  if (typeof left === "number" && typeof right === "number") {
    if (Number.isNaN(left))
      return 1;
    if (Number.isNaN(right))
      return -1;
    return left < right ? -1 : 1;
  }
  if (typeof left === "string" && typeof right === "string")
    return left.localeCompare(right);
  if (typeof left === "boolean" && typeof right === "boolean")
    return left ? 1 : -1;
  const a = rank(left), b = rank(right);
  if (a !== b)
    return a - b;
  if (a >= 6)
    return 0;
  if (left instanceof Date && right instanceof Date)
    return Math.sign(left.getTime() - right.getTime());
  return String(left).localeCompare(String(right));
}
function testFilter(cell, filter) {
  const { op, value } = filter;
  switch (op) {
    case "eq":
      return cell === value;
    case "neq":
      return cell !== value;
    case "gt":
      return !invalid(cell) && !invalid(value) && compareValues(cell, value) > 0;
    case "gte":
      return !invalid(cell) && !invalid(value) && compareValues(cell, value) >= 0;
    case "lt":
      return !invalid(cell) && !invalid(value) && compareValues(cell, value) < 0;
    case "lte":
      return !invalid(cell) && !invalid(value) && compareValues(cell, value) <= 0;
    case "in":
      return Array.isArray(value) && value.some((item) => item === cell);
    case "contains":
      return typeof cell === "string" && typeof value === "string" ? cell.includes(value) : Array.isArray(cell) && cell.some((item) => item === value);
    case "startsWith":
      return typeof cell === "string" && typeof value === "string" && cell.startsWith(value);
    case "endsWith":
      return typeof cell === "string" && typeof value === "string" && cell.endsWith(value);
    default:
      return false;
  }
}
function compileQuery(view) {
  const filters = view.filters.map((filter) => {
    const get = compileAccessor(filter.field);
    if (filter.op === "in" && Array.isArray(filter.value) && filter.value.length > 16) {
      const values = new Set(filter.value);
      return (row) => {
        const value = get(row);
        return !Number.isNaN(value) && values.has(value);
      };
    }
    return (row) => testFilter(get(row), filter);
  });
  const sorters = view.sorters.map((sorter) => ({ get: compileAccessor(sorter.field), sign: sorter.direction === "desc" ? -1 : 1 }));
  return {
    matches: (row) => {
      for (const filter of filters)
        if (!filter(row))
          return false;
      return true;
    },
    compare: (left, right) => {
      for (const sorter of sorters) {
        const result = compareValues(sorter.get(left), sorter.get(right));
        if (result !== 0)
          return result * sorter.sign;
      }
      return 0;
    }
  };
}
function evaluateTree(rows, view) {
  const tree = view.tree;
  const getId = compileAccessor(tree.idField), getParent = compileAccessor(tree.parentIdField);
  const keys = rows.map((row) => rowIdKey(getId(row)));
  const parents = rows.map((row) => getParent(row));
  const byId = /* @__PURE__ */ new Map;
  for (let index = 0;index < rows.length; index++) {
    const key = keys[index];
    if (key !== undefined && !byId.has(key))
      byId.set(key, index);
  }
  const parentIndex = new Int32Array(rows.length);
  for (let index = 0;index < rows.length; index++) {
    const key = rowIdKey(parents[index]);
    const parent = key === undefined ? -1 : byId.get(key) ?? -1;
    parentIndex[index] = parent === index ? -1 : parent;
  }
  const color = new Uint8Array(rows.length);
  for (let start = 0;start < rows.length; start++) {
    if (color[start] !== 0)
      continue;
    const trail = [];
    let current = start;
    while (current !== -1 && color[current] === 0) {
      color[current] = 1;
      trail.push(current);
      current = parentIndex[current];
    }
    if (current !== -1 && color[current] === 1) {
      let root = current;
      for (let node = parentIndex[current];node !== current; node = parentIndex[node])
        root = Math.min(root, node);
      parentIndex[root] = -1;
    }
    for (const node of trail)
      color[node] = 2;
  }
  const children = Array.from({ length: rows.length });
  const roots = [];
  for (let index = 0;index < rows.length; index++) {
    const parent = parentIndex[index];
    if (parent === -1)
      roots.push(index);
    else
      (children[parent] ??= []).push(index);
  }
  const query = compileQuery(view);
  if (view.sorters.length) {
    const compare = (left, right) => query.compare(rows[left], rows[right]) || left - right;
    roots.sort(compare);
    for (const group of children)
      if (group && group.length > 1)
        group.sort(compare);
  }
  const matched = new Uint8Array(rows.length);
  let matchedRows = 0;
  for (let index = 0;index < rows.length; index++) {
    if (query.matches(rows[index])) {
      matched[index] = 1;
      matchedRows++;
    }
  }
  const included = matched.slice();
  if (tree.includeAncestors) {
    const done = new Uint8Array(rows.length);
    for (let index = 0;index < rows.length; index++) {
      if (!matched[index])
        continue;
      for (let parent = parentIndex[index];parent !== -1 && !done[parent]; parent = parentIndex[parent]) {
        done[parent] = 1;
        included[parent] = 1;
      }
    }
  }
  if (tree.includeDescendantsOfMatch) {
    const done = new Uint8Array(rows.length);
    const stack2 = [];
    for (let index = 0;index < rows.length; index++) {
      if (!matched[index] || done[index])
        continue;
      stack2.push(index);
      while (stack2.length) {
        const node = stack2.pop();
        if (done[node])
          continue;
        done[node] = 1;
        included[node] = 1;
        for (const child of children[node] ?? [])
          stack2.push(child);
      }
    }
  }
  const expanded = new Set(tree.expandedIds.map(idKey));
  const collapsed = new Set((tree.collapsedIds ?? []).map(idKey));
  const all = tree.expandAll ?? tree.expandedIds.length === 0;
  const selected = new Set(view.meta.selectedRowIds.map(idKey));
  const getSelectionId = compileAccessor(view.idField);
  const offset = view.pageSize ? view.page * view.pageSize : 0;
  const end = view.pageSize ? offset + view.pageSize : Infinity;
  const entries = [];
  let visibleRows = 0;
  const stack = [];
  for (let index = roots.length - 1;index >= 0; index--)
    stack.push({ index: roots[index], depth: 0 });
  while (stack.length) {
    const { index, depth } = stack.pop();
    const group = children[index];
    const hasChildren = !!group?.length;
    const key = keys[index];
    const isOpen = all ? key === undefined || !collapsed.has(key) : key !== undefined && expanded.has(key);
    const canDescend = isOpen && (tree.maxDepth === undefined || depth < tree.maxDepth);
    if (included[index]) {
      if (visibleRows >= offset && visibleRows < end) {
        const selectedKey = selected.size ? selectionKey(getSelectionId(rows[index])) : undefined;
        entries.push({ row: rows[index], meta: {
          depth,
          hasChildren,
          isExpanded: hasChildren && canDescend,
          isMatch: matched[index] === 1,
          isSelected: selectedKey !== undefined && selected.has(selectedKey),
          parentId: parents[index] ?? null
        } });
      }
      visibleRows++;
    }
    if (canDescend && group)
      for (let child = group.length - 1;child >= 0; child--)
        stack.push({ index: group[child], depth: depth + 1 });
  }
  return { entries, matchedRows, visibleRows };
}
var operators = ["eq", "neq", "gt", "gte", "lt", "lte", "in", "contains", "startsWith", "endsWith"];
var array = (value, name) => {
  if (!Array.isArray(value))
    throw new TypeError(`Dataview ${name} must be an array.`);
  return value;
};
function normalizeMeta(meta = {}) {
  return {
    selectedRowIds: uniqueIds(Array.isArray(meta.selectedRowIds) ? meta.selectedRowIds : []),
    lockedColumns: Array.isArray(meta.lockedColumns) ? [...new Set(meta.lockedColumns.filter((column) => typeof column === "string" && column.length > 0))] : []
  };
}
function createDataview(request = {}) {
  if (typeof request !== "object" || request === null || Array.isArray(request))
    throw new TypeError("Dataview request must be an object.");
  const filters = (request.filters === undefined ? [] : array(request.filters, "filters")).map((filter) => {
    fieldParts(filter?.field);
    if (!operators.includes(filter.op))
      throw new TypeError(`Dataview filter op '${String(filter.op)}' is not supported.`);
    return { field: filter.field, op: filter.op, value: filter.value };
  });
  const sorters = (request.sorters === undefined ? [] : array(request.sorters, "sorters")).map((sorter) => {
    fieldParts(sorter?.field);
    const raw = sorter.direction ?? sorter.dir ?? "asc";
    if (typeof raw !== "string" || !["asc", "desc"].includes(raw.toLowerCase()))
      throw new TypeError(`Dataview sorter direction '${String(raw)}' is not supported.`);
    return { field: sorter.field, direction: raw.toLowerCase() };
  });
  const page = request.page ?? 0, pageSize = request.pageSize;
  if (!Number.isSafeInteger(page) || page < 0)
    throw new RangeError("Dataview page must be a safe integer >= 0.");
  if (pageSize != null && (!Number.isSafeInteger(pageSize) || pageSize <= 0))
    throw new RangeError("Dataview pageSize must be a safe integer > 0.");
  if (pageSize != null && !Number.isSafeInteger(page * pageSize))
    throw new RangeError("Dataview page offset exceeds the safe integer range.");
  let tree;
  if (request.tree !== undefined) {
    const input = request.tree;
    if (typeof input !== "object" || input === null)
      throw new TypeError("Dataview tree must be an object.");
    fieldParts(input.idField);
    fieldParts(input.parentIdField);
    if (input.maxDepth != null && (!Number.isSafeInteger(input.maxDepth) || input.maxDepth < 0))
      throw new RangeError("Dataview tree maxDepth must be a safe integer >= 0.");
    for (const flag of ["includeAncestors", "includeDescendantsOfMatch", "expandAll"]) {
      if (input[flag] !== undefined && typeof input[flag] !== "boolean")
        throw new TypeError(`Dataview tree ${flag} must be boolean.`);
    }
    tree = {
      idField: input.idField,
      parentIdField: input.parentIdField,
      expandedIds: uniqueIds(input.expandedIds === undefined ? [] : array(input.expandedIds, "expandedIds")),
      expandAll: input.expandAll ?? input.expandedIds === undefined,
      collapsedIds: uniqueIds(input.collapsedIds === undefined ? [] : array(input.collapsedIds, "collapsedIds")),
      maxDepth: input.maxDepth,
      includeAncestors: input.includeAncestors ?? true,
      includeDescendantsOfMatch: input.includeDescendantsOfMatch ?? false
    };
  }
  const idField = request.idField ?? tree?.idField ?? "id";
  fieldParts(idField);
  return { filters, sorters, page, pageSize, idField, meta: normalizeMeta(request.meta), tree };
}
function evaluateFlat(rows, view) {
  const query = compileQuery(view);
  const selected = new Set(view.meta.selectedRowIds.map(idKey));
  const getId = compileAccessor(view.idField);
  const offset = view.pageSize ? view.page * view.pageSize : 0;
  const end = view.pageSize ? offset + view.pageSize : Infinity;
  const entries = [];
  let matchedRows = 0;
  function append(row) {
    if (matchedRows >= offset && matchedRows < end) {
      const key = selected.size ? selectionKey(getId(row)) : undefined;
      entries.push({ row, meta: {
        depth: 0,
        hasChildren: false,
        isExpanded: false,
        isMatch: true,
        isSelected: key !== undefined && selected.has(key),
        parentId: null
      } });
    }
    matchedRows++;
  }
  if (view.sorters.length || !view.filters.length) {
    const ordered = view.filters.length ? rows.filter(query.matches) : view.sorters.length ? [...rows] : rows;
    if (view.sorters.length)
      ordered.sort(query.compare);
    matchedRows = offset;
    for (let index = offset;index < Math.min(end, ordered.length); index++)
      append(ordered[index]);
    matchedRows = ordered.length;
  } else {
    for (const row of rows)
      if (query.matches(row))
        append(row);
  }
  return { entries, matchedRows, visibleRows: matchedRows };
}
function evaluateDataview(rows, view) {
  const result = view.tree ? evaluateTree(rows, view) : evaluateFlat(rows, view);
  const pageCount = view.pageSize ? Math.ceil(result.visibleRows / view.pageSize) : Number(result.visibleRows > 0);
  return {
    ...result,
    totalRows: rows.length,
    page: view.page,
    pageSize: view.pageSize,
    pageCount,
    hasPreviousPage: !!view.pageSize && view.page > 0 && pageCount > 0,
    hasNextPage: !!view.pageSize && view.page < pageCount - 1
  };
}
function updateRows(rows, ids, updates, idField = "id") {
  if (ids.length !== updates.length)
    throw new Error("updateRows expects ids and updates arrays with equal length.");
  const getId = compileAccessor(idField);
  if (!ids.length)
    return rows;
  const patches = /* @__PURE__ */ new Map;
  for (let index = 0;index < ids.length; index++) {
    const patch = updates[index];
    if (patch === null || typeof patch !== "object" || Array.isArray(patch))
      throw new TypeError("Row patches must be objects.");
    patches.set(idKey(ids[index]), patch);
  }
  let next;
  for (let index = 0;index < rows.length; index++) {
    const row = rows[index], value = getId(row);
    if (value === undefined)
      continue;
    const patch = patches.get(idKey(value));
    if (!patch)
      continue;
    const keys = Reflect.ownKeys(patch).filter((key) => Object.prototype.propertyIsEnumerable.call(patch, key));
    if (!keys.some((key) => !Object.hasOwn(row, key) || !Object.is(Reflect.get(row, key), Reflect.get(patch, key))))
      continue;
    next ??= rows.slice();
    next[index] = { ...row, ...patch };
  }
  return next ?? rows;
}
function addRows(rows, newRows, anchorId, position = "after", idField = "id") {
  const getId = compileAccessor(idField);
  if (position !== "before" && position !== "after")
    throw new TypeError("Row insertion position must be before or after.");
  if (!newRows.length)
    return rows;
  if (!rows.length || anchorId === undefined)
    return [...rows, ...newRows];
  const key = idKey(anchorId);
  const anchor = rows.findIndex((row) => {
    const id = getId(row);
    return id !== undefined && idKey(id) === key;
  });
  const index = anchor < 0 ? rows.length : anchor + Number(position === "after");
  return [...rows.slice(0, index), ...newRows, ...rows.slice(index)];
}
function removeRows(rows, ids, idField = "id") {
  const getId = compileAccessor(idField);
  if (!ids.length)
    return rows;
  const keys = new Set(ids.map(idKey));
  const result = rows.filter((row) => {
    const value = getId(row);
    return value === undefined || !keys.has(idKey(value));
  });
  return result.length === rows.length ? rows : result;
}
function setParent(rows, nodeId, parentId, idField = "id", parentIdField = "parentId") {
  const getId = compileAccessor(idField), getParent = compileAccessor(parentIdField);
  const node = idKey(nodeId), parent = rowIdKey(parentId);
  if (!rows.length)
    return rows;
  const byId = /* @__PURE__ */ new Map;
  const targets = [];
  for (let index = 0;index < rows.length; index++) {
    const key = rowIdKey(getId(rows[index]));
    if (key !== undefined && !byId.has(key))
      byId.set(key, rows[index]);
    if (key === node)
      targets.push(index);
  }
  if (!targets.length)
    return rows;
  const seen = /* @__PURE__ */ new Set;
  for (let key = parent;key !== undefined; ) {
    if (key === node || seen.has(key))
      throw new Error("setParent would create or attach to a parent cycle.");
    seen.add(key);
    const ancestor = byId.get(key);
    key = ancestor ? rowIdKey(getParent(ancestor)) : undefined;
  }
  let next;
  for (const index of targets) {
    if (rowIdKey(getParent(rows[index])) === parent)
      continue;
    next ??= rows.slice();
    next[index] = setField(rows[index], parentIdField, parentId);
  }
  return next ?? rows;
}

// src/shared/dataview.ts
var lower = (v) => (v == null ? "" : String(v)).toLowerCase();
function predicate(filter) {
  const { field, op, value } = filter;
  if (op === "in") {
    const set = new Set((Array.isArray(value) ? value : [value]).map((v) => typeof v === "string" ? v.toLowerCase() : v));
    return (row) => {
      const v = row[field];
      return set.has(typeof v === "string" ? v.toLowerCase() : v);
    };
  }
  if (typeof value === "string" && op !== "gt" && op !== "gte" && op !== "lt" && op !== "lte") {
    const needle = value.toLowerCase();
    switch (op) {
      case "contains":
        return (row) => lower(row[field]).includes(needle);
      case "startsWith":
        return (row) => lower(row[field]).startsWith(needle);
      case "endsWith":
        return (row) => lower(row[field]).endsWith(needle);
      case "neq":
        return (row) => lower(row[field]) !== needle;
      default:
        return (row) => lower(row[field]) === needle;
    }
  }
  return (row) => {
    const v = row[field];
    switch (op) {
      case "gt":
        return v != null && v > value;
      case "gte":
        return v != null && v >= value;
      case "lt":
        return v != null && v < value;
      case "lte":
        return v != null && v <= value;
      case "neq":
        return v !== value;
      default:
        return v === value;
    }
  };
}
function dataSource(rows, options = {}) {
  const idField = options.tree?.idField ?? options.idField ?? "id";
  let current = rows;
  let cacheKey = "";
  let cache = null;
  let matchKey = "";
  let matchIds = null;
  let branches = null;
  const matching = (filters) => {
    const key = JSON.stringify(filters);
    if (matchIds && key === matchKey)
      return matchIds;
    const tests = filters.map(predicate);
    const ids = [];
    for (const row of current)
      if (tests.every((t) => t(row)))
        ids.push(row[idField]);
    matchKey = key;
    matchIds = ids;
    return ids;
  };
  return {
    get rows() {
      return current;
    },
    idField,
    tree: options.tree,
    query(q = {}) {
      const key = JSON.stringify([q.filters ?? [], q.sorters ?? [], q.expanded ?? [], q.collapsed ?? []]);
      if (cache && key === cacheKey)
        return cache;
      const filters = (q.filters ?? []).filter((f) => f && f.field && f.value !== "" && f.value != null);
      const filtering = filters.length > 0;
      const view = createDataview({
        idField,
        sorters: q.sorters ?? [],
        filters: filtering ? [{ field: idField, op: "in", value: matching(filters) }] : [],
        tree: options.tree ? {
          ...options.tree,
          includeAncestors: true,
          ...filtering ? { expandAll: true, collapsedIds: q.collapsed ?? [] } : { expandedIds: q.expanded ?? [] }
        } : undefined
      });
      const result = evaluateDataview(current, view);
      cache = { entries: result.entries, totalRows: result.totalRows, matchedRows: result.matchedRows, visibleRows: result.visibleRows };
      cacheKey = key;
      return cache;
    },
    setRows(next) {
      current = next;
      cache = null;
      cacheKey = "";
      matchIds = null;
      branches = null;
    },
    branchIds() {
      if (!options.tree)
        return [];
      if (branches)
        return branches;
      const parents = new Set;
      for (const row of current) {
        const parent = row[options.tree.parentIdField];
        if (parent != null)
          parents.add(parent);
      }
      branches = current.filter((row) => parents.has(row[idField])).map((row) => row[idField]);
      return branches;
    }
  };
}
function parseFilter(field, text, kind = "text") {
  const raw = text.trim();
  if (!raw)
    return null;
  if (kind === "select")
    return { field, op: "eq", value: raw };
  if (kind === "number") {
    const m = /^(>=|<=|!=|>|<|=)?\s*(-?\d+(?:\.\d+)?)$/.exec(raw);
    if (!m)
      return null;
    const ops = { ">=": "gte", "<=": "lte", "!=": "neq", ">": "gt", "<": "lt", "=": "eq" };
    return { field, op: ops[m[1] ?? "="] ?? "eq", value: Number(m[2]) };
  }
  return { field, op: "contains", value: raw };
}
function filterText(filter) {
  if (!filter)
    return "";
  const sym = { gte: ">=", lte: "<=", neq: "!=", gt: ">", lt: "<" };
  return (sym[filter.op] ?? "") + String(filter.value ?? "");
}
function cycleSort(sorters = [], field, add = false) {
  const at = sorters.findIndex((s) => s.field === field);
  const dir = at < 0 ? undefined : sorters[at].direction ?? sorters[at].dir ?? "asc";
  const next = dir === undefined ? "asc" : dir === "asc" ? "desc" : null;
  if (!add)
    return next ? [{ field, direction: next }] : [];
  const kept = sorters.map((s) => ({ field: s.field, direction: s.direction ?? s.dir ?? "asc" }));
  if (at < 0)
    return [...kept, { field, direction: "asc" }];
  if (!next)
    return kept.filter((_, i) => i !== at);
  kept[at] = { field, direction: next };
  return kept;
}
// src/shared/virtual.ts
var MAX_SIZER_PX = 15000000;
var OVERSCAN = 4;
function sizerHeight(total, rowHeight) {
  return Math.min(total * rowHeight, MAX_SIZER_PX);
}
function realOffset(scrollTop, viewport, total, rowHeight) {
  const real = total * rowHeight - viewport;
  const capped = sizerHeight(total, rowHeight) - viewport;
  if (real <= 0 || capped <= 0)
    return 0;
  return scrollTop / capped * real;
}
function virtualWindow(scrollTop, viewport, rowHeight, total, overscan = OVERSCAN) {
  const visible = Math.ceil(viewport / rowHeight) + overscan * 2;
  const offset = realOffset(scrollTop, viewport, total, rowHeight);
  let first = Math.max(0, Math.floor(offset / rowHeight) - overscan);
  if (first + visible > total)
    first = Math.max(0, total - visible);
  return { first, count: Math.min(visible, total), shift: first * rowHeight - (offset - scrollTop) };
}
function scrollTopFor(index, viewport, rowHeight, total) {
  const real = Math.max(0, Math.min(total - 1, index)) * rowHeight;
  const span = total * rowHeight - viewport;
  return span > 0 ? real * ((sizerHeight(total, rowHeight) - viewport) / span) : 0;
}
function scrollIntoViewTop(index, scrollTop, viewport, rowHeight, total) {
  const top = scrollTopFor(index, viewport, rowHeight, total);
  const shown = realOffset(scrollTop, viewport, total, rowHeight);
  const row = index * rowHeight;
  if (row >= shown && row + rowHeight <= shown + viewport)
    return scrollTop;
  if (row < shown)
    return top;
  return scrollTopFor(index - Math.max(0, Math.floor(viewport / rowHeight) - 1), viewport, rowHeight, total);
}
// src/shared/theme-links.ts
var LINK_ATTR = "data-df-theme-link";
var inflight = new Map;
function themeJsonHref(id) {
  const $ = defussQuery();
  const tokens = $("#tokens-css").get(0) ?? $('link[href*="default-semantic-tokens.css"]').get(0);
  if (tokens)
    return new URL(`../${id}.json`, tokens.href).href;
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
  defussQuery()(`link[${LINK_ATTR}]`).remove();
}
function applyThemeLinks(themeId, links) {
  const $ = defussQuery();
  if (!$("#df-theme-links").get(0)) {
    const marker = document.createElement("template");
    marker.id = "df-theme-links";
    document.head.append(marker);
  }
  clearThemeLinks();
  for (const node of links) {
    const rel = node.attributes.rel ?? "";
    const href = node.attributes.href ?? "";
    const existing = $(`link[rel="${CSS.escape(rel)}"][href="${CSS.escape(href)}"]`).get(0);
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
var SHARED_ABI = "0.9.5";
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
  textLocale,
  animateCount,
  clampIndex,
  coerceIndex,
  presentationScope,
  revealAttr,
  entrance,
  draw,
  anim,
  bindGlobalKeys,
  isEditableTarget,
  loadTheme,
  elementModel,
  renderModel,
  componentState,
  bindComponent,
  unbindComponent,
  createStore,
  computed,
  persisted,
  reload,
  forget,
  persistOk,
  viewPersistence,
  dataSource,
  parseFilter,
  filterText,
  cycleSort,
  virtualWindow,
  sizerHeight,
  scrollTopFor,
  scrollIntoViewTop
};
Reflect.set(df, "store", { create: createStore, computed, persisted });
Reflect.set(df, "dataview", {
  source: dataSource,
  parseFilter,
  cycleSort,
  create: createDataview,
  evaluate: evaluateDataview,
  addRows,
  removeRows,
  updateRows,
  setParent
});
Reflect.set(df, "anim", anim);
if (typeof document !== "undefined") {
  const captureAll = () => {
    if (document.body)
      captureAuthored(document.body);
    new MutationObserver((records) => {
      for (const r of records)
        for (const n of r.addedNodes)
          if (n.nodeType === Node.ELEMENT_NODE)
            captureAuthored(n);
    }).observe(document, { childList: true, subtree: true });
  };
  if (document.body)
    captureAll();
  else
    document.addEventListener("DOMContentLoaded", captureAll, { once: true });
}
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
  isEditableTarget,
  loadTheme,
  clampIndex,
  coerceIndex
});

// src/components/alert-dialog/alert-dialog.ts
var df$ = defussGlobals();
var dfDollar = defussQuery();
var alertDialogStates = ["default", "open"];
function applyMarkup(el, stateName) {
  dfDollar(el).attr("open", stateName === "open" ? "" : null);
}
function triggerStateChange(dialog, stateName, _config) {
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
var alertDialogApi = componentState({
  component: "alert-dialog",
  states: alertDialogStates,
  apply: (dialog, state) => triggerStateChange(dialog, state.name, state.config),
  markup: (el, state) => applyMarkup(el, state.name)
});
df$.alertDialogApi = alertDialogApi;
df$.alertDialogStates = alertDialogStates;
function init() {
  dfDollar("[data-alert-dialog-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar("#" + CSS.escape(trigger.dataset.alertDialogTrigger)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog._trigger = trigger;
      dialog.showModal();
    });
  });
  dfDollar("dialog.alert-dialog:not([data-init])").toArray().forEach((dialog) => {
    dialog.dataset.init = "";
    bindComponent(dialog, alertDialogApi);
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
    });
    dfDollar(dialog).find("[data-alert-dialog-close]").toArray().forEach((btn) => {
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
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// src/components/avatar/avatar.ts
var df$2 = defussGlobals();
var dfDollar2 = defussQuery();
var avatarStates = ["default", "error"];
function applyMarkup2(el, stateName) {
  const img = dfDollar2(el).find(".avatar-image");
  if (stateName === "error")
    img.attr("data-error", "").css("display", "none");
  else
    img.attr("data-error", null).css("display", "");
}
function triggerStateChange2(wrapper, stateName, _config) {
  const img = dfDollar2(wrapper).find(".avatar-image").get(0);
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
var avatarApi = componentState({
  component: "avatar",
  states: avatarStates,
  apply: (wrapper, state) => triggerStateChange2(wrapper, state.name, state.config),
  read: (wrapper, state) => {
    const img = dfDollar2(wrapper).find(".avatar-image").get(0);
    const errored = img ? img.hasAttribute("data-error") : true;
    return {
      name: errored ? "error" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup2(el, state.name)
});
df$2.avatarApi = avatarApi;
df$2.avatarStates = avatarStates;
function init2() {
  dfDollar2(".avatar:not([data-init])").toArray().forEach((wrapper) => {
    wrapper.dataset.init = "";
    bindComponent(wrapper, avatarApi);
    const img = dfDollar2(wrapper).find(".avatar-image").get(0);
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
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// src/components/chart/chart.ts
var df$3 = defussGlobals();
var dfDollar3 = defussQuery();
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
var reducedMotion2 = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
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
  const reduce = reducedMotion2();
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
  return reducedMotion2() ? { ...option, animation: false } : option;
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
  let frame = 0;
  const ro = new ResizeObserver(() => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      if (!instance.isDisposed?.())
        instance.resize();
    });
  });
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
  if (reducedMotion2() || el.closest("[data-slide]") || typeof IntersectionObserver !== "function")
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
      const active = slide.hasAttribute("data-active");
      if (active && !wasActive) {
        for (const chartEl of set) {
          const i = instances2.get(chartEl);
          if (i && chartEl.isConnected)
            replay(chartEl, i);
        }
      }
      wasActive = active;
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
  const stage = dfDollar3(deck).find(":scope > .presentation-stage").get(0) ?? null;
  if (!stage)
    throw new Error('chart: chart.deck() needs a <div class="chart presentation-stage"> child of the .presentation');
  if (!isPlain(states) || Object.keys(states).length === 0)
    throw new Error("chart: chart.deck() needs at least one named state");
  const slides = Array.from(dfDollar3(deck).find(":scope > [data-slide]").toArray());
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
    const active = slides.find((s) => s.hasAttribute("data-active"));
    show(active?.dataset.chartState ?? null);
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
function applyMarkup3(_el, _stateName) {}
function triggerStateChange3(el, stateName, config = {}) {
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
var chartApi = componentState({
  component: "chart",
  states: chartStates,
  apply: (el, state) => triggerStateChange3(el, state.name, state.config),
  read: (el, state) => {
    return {
      name: el.dataset.stateName || "default",
      config: { ...state.config }
    };
  },
  markup: (el, state) => applyMarkup3(el, state.name)
});
df$3.chartApi = chartApi;
df$3.chartStates = chartStates;
df$3.chart = { mount, instance, theme: chartTheme, color: chartColor, deck: chartDeck };
df$3.chartStory = chartStory;
function init3() {
  dfDollar3(".chart:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent(el, chartApi);
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
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// src/components/command/command.ts
var df$4 = defussGlobals();
var dfDollar4 = defussQuery();
var commandStates = ["default", "open"];
function applyMarkup4(el, stateName) {
  dfDollar4(el).attr("open", stateName === "open" ? "" : null);
}
function triggerStateChange4(dialog, stateName, _config) {
  switch (stateName) {
    case "default":
      if (dialog.open)
        dialog.close();
      break;
    case "open":
      if (!dialog.open)
        dialog.showModal();
      {
        const input = dfDollar4(dialog).find(".command-input").get(0);
        if (input)
          input.focus();
      }
      break;
  }
}
var commandApi = componentState({
  component: "command",
  states: commandStates,
  apply: (dialog, state) => triggerStateChange4(dialog, state.name, state.config),
  markup: (el, state) => applyMarkup4(el, state.name)
});
df$4.commandApi = commandApi;
df$4.commandStates = commandStates;
bindGlobalKeys((e) => {
  if (!(e.metaKey || e.ctrlKey) || e.altKey || e.key.toLowerCase() !== "k")
    return;
  const dialog = dfDollar4("dialog.command").get(0);
  if (!dialog)
    return;
  e.preventDefault();
  if (dialog.open)
    dialog.close();
  else {
    dialog.showModal();
    const input = dfDollar4(dialog).find(".command-input").get(0);
    if (input)
      input.focus();
  }
  return true;
}, { editable: true });
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
function init4() {
  dfDollar4("dialog.command:not([data-init])").toArray().forEach((dialog) => {
    dialog.dataset.init = "";
    bindComponent(dialog, commandApi);
    const input = dfDollar4(dialog).find(".command-input").get(0);
    const list = dfDollar4(dialog).find(".command-list").get(0);
    const empty = dfDollar4(dialog).find(".command-empty").get(0);
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
  dfDollar4("[data-command-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar4("#" + CSS.escape(trigger.dataset.commandTrigger)).get(0);
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
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// src/components/data-grid/data-grid.ts
var df$5 = defussGlobals();
var dfDollar5 = defussQuery();
var dataGridStates = ["default", "loading", "empty"];
var SAVED_KEYS = ["filters", "sorters", "locked", "expanded"];
var numberFormat = new Map;
function format2(value, spec, el) {
  if (value == null)
    return "";
  if (!spec)
    return String(value);
  const locale = textLocale(el);
  if (spec === "date") {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString(locale);
  }
  const key = `${locale}|${spec}`;
  if (!numberFormat.has(key)) {
    const [style, currency] = spec.split(":");
    numberFormat.set(key, new Intl.NumberFormat(locale, style === "currency" ? { style, currency: currency || "USD" } : style === "percent" ? { style, maximumFractionDigits: 1 } : {}));
  }
  return typeof value === "number" ? numberFormat.get(key).format(value) : String(value);
}
var headerRowOf = (root) => dfDollar5(root).find(".data-grid-head > .data-grid-row").get(0);
var headersOf = (root) => {
  const row = headerRowOf(root);
  return row ? dfDollar5(row).children(".data-grid-header").toArray() : [];
};
function readColumns(grid) {
  return headersOf(grid).map((el) => ({
    el,
    field: el.dataset.field,
    filter: el.dataset.filter || "",
    type: el.dataset.type === "number" ? "number" : "text",
    format: el.hasAttribute("data-format") ? el.dataset.format : el.dataset.type === "number" ? "number" : "",
    width: el.dataset.width || "minmax(8rem, 1fr)",
    align: el.dataset.align || (el.dataset.type === "number" ? "end" : ""),
    sortable: el.dataset.sortable !== "false",
    sortField: el.dataset.sortField || el.dataset.field,
    options: el.dataset.options ? el.dataset.options.split(",").map((o) => o.trim()) : null
  }));
}
function attachPersistence2(grid, config) {
  grid._saved?.destroy();
  const where = viewPersistence(grid, "data-grid", String(dfDollar5(".data-grid").toArray().indexOf(grid)), config || {});
  grid._saved = where ? persisted(where.key, {}, { area: where.area, validate: (v) => typeof v === "object" && v !== null && !Array.isArray(v) }) : null;
  const kept = {};
  for (const k of SAVED_KEYS)
    if (Array.isArray(grid._saved?.value[k]))
      kept[k] = grid._saved.value[k];
  return kept;
}
var authoredSort = (grid) => grid._columns.filter((c) => c.el.dataset.sort === "asc" || c.el.dataset.sort === "desc").map((c) => ({ field: c.sortField, direction: c.el.dataset.sort }));
function ordered(items, locked, fieldOf) {
  const set = new Set(locked || []);
  return [...items.filter((i) => set.has(fieldOf(i))), ...items.filter((i) => !set.has(fieldOf(i)))];
}
function applyMarkup5(root, state) {
  const config = state.config || {};
  const headers = root._columns ? root._columns.map((c) => c.el) : headersOf(root);
  const row = headerRowOf(root);
  const locked = new Set(config.locked || []);
  const sorters = config.sorters || [];
  const order = ordered(headers, config.locked, (el) => el.dataset.field);
  if (row && order.some((el, i) => dfDollar5(row).children(".data-grid-header").get(i) !== el)) {
    order.forEach((el) => dfDollar5(row).append(el));
  }
  for (const el of headers) {
    const at = sorters.findIndex((s) => s.field === (el.dataset.sortField || el.dataset.field));
    const dir = at < 0 ? null : sorters[at].direction || sorters[at].dir || "asc";
    dfDollar5(el).attr("data-locked", locked.has(el.dataset.field) ? "" : null).attr("aria-sort", dir ? dir === "asc" ? "ascending" : "descending" : null).attr("data-sort-index", dir && sorters.length > 1 ? String(at + 1) : null);
  }
  dfDollar5(root).attr("data-state", state.name).attr("aria-busy", state.name === "loading" ? "true" : null);
}
var configOf = (grid) => grid._config ?? grid.store?.value.config ?? {};
var isTree = (grid) => !!grid._source?.tree;
var paging = (grid) => grid.dataset.paging || "virtual";
var pageSize = (grid) => Math.max(1, parseInt(grid.dataset.pageSize || "50", 10) || 50);
function evaluate(grid, config) {
  if (!grid._source)
    return grid._result = { entries: [], totalRows: 0, matchedRows: 0, visibleRows: 0 };
  return grid._result = grid._source.query({
    filters: config.filters,
    sorters: config.sorters,
    expanded: config.expanded,
    collapsed: config.collapsed
  });
}
function shown(grid, config) {
  const entries = grid._result?.entries ?? [];
  const mode = paging(grid);
  if (mode === "virtual")
    return entries;
  const size = pageSize(grid);
  const page = Math.max(0, config.page || 0);
  return mode === "pages" ? entries.slice(page * size, (page + 1) * size) : entries.slice(0, (page + 1) * size);
}
var pageCount = (grid) => Math.max(1, Math.ceil((grid._result?.entries.length ?? 0) / pageSize(grid)));
var parts = (grid) => grid._parts;
var rowHeight = (grid) => grid._rowHeight;
function layoutColumns(grid, config) {
  const columns = ordered(grid._columns, config.locked, (c) => c.field);
  grid._order = columns;
  grid.style.setProperty("--data-grid-template", columns.map((c) => c.width).join(" "));
  const locked = new Set(config.locked || []);
  let left = 0;
  grid._lockLeft = {};
  for (const column of columns) {
    if (!locked.has(column.field)) {
      column.el.style.removeProperty("inset-inline-start");
      continue;
    }
    grid._lockLeft[column.field] = left;
    column.el.style.insetInlineStart = `${left}px`;
    left += column.el.getBoundingClientRect().width;
  }
  grid.toggleAttribute("data-has-locked", locked.size > 0);
}
function buildFilters(grid) {
  if (!grid._columns.some((c) => c.filter) || grid._parts.filters)
    return;
  const row = document.createElement("div");
  row.className = "data-grid-row data-grid-filters";
  row.setAttribute("role", "row");
  grid._parts.filters = row;
  dfDollar5(grid._parts.head).append(row);
}
function syncFilters(grid, config) {
  const row = grid._parts.filters;
  if (!row)
    return;
  const filters = config.filters || [];
  const locked = new Set(config.locked || []);
  const key = grid._order.map((c) => c.field).join("|");
  if (row._key !== key) {
    row._key = key;
    row.textContent = "";
    for (const column of grid._order) {
      const cell = document.createElement("div");
      cell.className = "data-grid-filter-cell";
      cell.setAttribute("role", "gridcell");
      cell.dataset.field = column.field;
      if (column.filter) {
        const label = `Filter ${column.el.textContent.trim()}`;
        let input;
        if (column.filter === "select") {
          input = document.createElement("select");
          const options = column.options || distinct(grid, column.field);
          const all = document.createElement("option");
          all.value = "";
          all.textContent = "All";
          input.append(all, ...options.map((o) => Object.assign(document.createElement("option"), { value: o, textContent: o })));
        } else {
          input = document.createElement("input");
          input.type = "search";
          input.placeholder = column.type === "number" ? "> 100" : "Filter…";
          input.inputMode = column.type === "number" ? "decimal" : "search";
          input.autocomplete = "off";
        }
        input.className = "data-grid-filter";
        input.dataset.field = column.field;
        input.dataset.kind = column.filter === "select" ? "select" : column.type;
        input.setAttribute("aria-label", label);
        cell.append(input);
      }
      row.append(cell);
    }
  }
  for (const cell of dfDollar5(row).children(".data-grid-filter-cell").toArray()) {
    const field = cell.dataset.field;
    if (locked.has(field))
      cell.style.insetInlineStart = `${grid._lockLeft[field] ?? 0}px`;
    else
      cell.style.removeProperty("inset-inline-start");
    cell.toggleAttribute("data-locked", locked.has(field));
    const input = cell.firstElementChild;
    if (input && input !== document.activeElement)
      input.value = filterText(filters.find((f) => f.field === field));
  }
}
function distinct(grid, field) {
  const seen = new Set;
  for (const row of grid._source?.rows ?? []) {
    if (row[field] != null)
      seen.add(String(row[field]));
    if (seen.size >= 100)
      break;
  }
  return [...seen].sort();
}
function buildPins(grid) {
  for (const column of grid._columns) {
    if (column.el.dataset.lockable === "false" || dfDollar5(column.el).children(".data-grid-pin").get(0))
      continue;
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "data-grid-pin";
    pin.tabIndex = -1;
    pin.dataset.field = column.field;
    pin.setAttribute("aria-label", `Lock ${column.el.textContent.trim()}`);
    dfDollar5(column.el).append(pin);
  }
}
function fillCell(grid, cell, column, entry, first) {
  const record = entry.row;
  cell.dataset.field = column.field;
  cell.toggleAttribute("data-locked", column.field in grid._lockLeft);
  if (column.field in grid._lockLeft)
    cell.style.insetInlineStart = `${grid._lockLeft[column.field]}px`;
  else
    cell.style.removeProperty("inset-inline-start");
  if (column.align)
    cell.dataset.align = column.align;
  else
    delete cell.dataset.align;
  cell.textContent = "";
  if (first && isTree(grid)) {
    cell.style.setProperty("--depth", String(entry.meta.depth));
    const toggle = document.createElement("span");
    toggle.className = "data-grid-toggle";
    toggle.setAttribute("aria-hidden", "true");
    if (!entry.meta.hasChildren)
      toggle.dataset.leaf = "";
    cell.append(toggle);
  } else {
    cell.style.removeProperty("--depth");
  }
  const custom = grid._cells?.[column.field];
  if (custom) {
    const host = document.createElement("span");
    host.className = "data-grid-content";
    custom(host, record, entry.meta);
    cell.append(host);
  } else {
    const text = document.createElement("span");
    text.className = "data-grid-content";
    text.textContent = format2(record[column.field], column.format, grid);
    cell.append(text);
  }
}
function renderRows(grid) {
  const { viewport, body, pool } = parts(grid);
  if (!pool || !grid._order)
    return;
  const config = configOf(grid);
  const entries = grid._shown || [];
  const total = entries.length;
  const headH = grid._parts.head.offsetHeight;
  const view = Math.max(rowHeight(grid), viewport.clientHeight - headH);
  const win = virtualWindow(Math.max(0, viewport.scrollTop), view, rowHeight(grid), total);
  body.style.height = `${sizerHeight(total, rowHeight(grid))}px`;
  while (pool.children.length < win.count) {
    const row = document.createElement("div");
    row.className = "data-grid-row";
    row.setAttribute("role", "row");
    pool.append(row);
  }
  while (pool.children.length > win.count)
    pool.lastElementChild.remove();
  pool.style.translate = `0 ${win.shift}px`;
  const selected = grid._selected;
  const base = paging(grid) === "pages" ? Math.max(0, config.page || 0) * pageSize(grid) : 0;
  const headRows = grid._parts.filters ? 2 : 1;
  const focus = grid._focus;
  for (let i = 0;i < pool.children.length; i++) {
    const row = pool.children[i];
    const index = win.first + i;
    const entry = entries[index];
    const key = `${grid._gen}:${index}`;
    if (row._key !== key) {
      row._key = key;
      row._index = index;
      row.dataset.index = String(index);
      row.setAttribute("aria-rowindex", String(base + index + headRows + 1));
      while (row.children.length < grid._order.length) {
        const cell = document.createElement("div");
        cell.className = "data-grid-cell";
        cell.setAttribute("role", "gridcell");
        row.append(cell);
      }
      while (row.children.length > grid._order.length)
        row.lastElementChild.remove();
      grid._order.forEach((column, c) => {
        fillCell(grid, row.children[c], column, entry, c === 0);
        row.children[c].setAttribute("aria-colindex", String(c + 1));
      });
      if (isTree(grid)) {
        row.setAttribute("aria-level", String(entry.meta.depth + 1));
        if (entry.meta.hasChildren)
          row.setAttribute("aria-expanded", String(entry.meta.isExpanded));
        else
          row.removeAttribute("aria-expanded");
      }
    }
    const id = entry.row[grid._source.idField];
    if (grid.dataset.select)
      row.setAttribute("aria-selected", String(selected.has(id)));
    else
      row.removeAttribute("aria-selected");
    for (let c = 0;c < row.children.length; c++) {
      row.children[c].tabIndex = focus.row === index && focus.col === c ? 0 : -1;
    }
  }
}
function renderFooter(grid, config) {
  const count = (n) => format2(n, "number", grid);
  const footer = grid._parts.footer;
  if (!footer)
    return;
  const result = grid._result;
  const shownRows = grid._shown?.length ?? 0;
  const visible = result.entries.length;
  const filtered = (config.filters || []).length > 0;
  const mode = paging(grid);
  let text;
  if (isTree(grid)) {
    text = `${count(visible)} rows shown`;
    text += filtered ? ` · ${count(result.matchedRows)} of ${count(result.totalRows)} match` : ` of ${count(result.totalRows)}`;
  } else {
    text = filtered ? `${count(visible)} of ${count(result.totalRows)} rows match` : `${count(visible)} rows`;
  }
  if (mode === "pages" && visible) {
    const start = Math.max(0, config.page || 0) * pageSize(grid);
    text = `${count(start + 1)}–${count(start + shownRows)} of ${text}`;
  }
  if (mode === "infinite" && visible)
    text = `${count(shownRows)} loaded · ${text}`;
  if (grid._selected.size)
    text += ` · ${count(grid._selected.size)} selected`;
  if (!grid._parts.status) {
    const status = document.createElement("span");
    status.className = "data-grid-status";
    status.setAttribute("role", "status");
    footer.append(status);
    grid._parts.status = status;
  }
  grid._parts.status.textContent = text;
  if (mode !== "pages")
    return;
  if (!grid._parts.pager) {
    const pager = document.createElement("div");
    pager.className = "data-grid-pager";
    for (const [act, name] of [["first", "First page"], ["prev", "Previous page"], ["label"], ["next", "Next page"], ["last", "Last page"]]) {
      if (act === "label") {
        const label = document.createElement("span");
        label.className = "data-grid-page-label";
        pager.append(label);
        continue;
      }
      const button = document.createElement("button");
      button.type = "button";
      button.className = "data-grid-page-btn";
      button.dataset.page = act;
      button.setAttribute("aria-label", name);
      pager.append(button);
    }
    footer.append(pager);
    grid._parts.pager = pager;
  }
  const page = Math.max(0, config.page || 0);
  const pages = pageCount(grid);
  dfDollar5(grid._parts.pager).find(".data-grid-page-label").get(0).textContent = `Page ${count(page + 1)} of ${count(pages)}`;
  for (const button of dfDollar5(grid._parts.pager).find("[data-page]").toArray()) {
    const back = button.dataset.page === "first" || button.dataset.page === "prev";
    button.disabled = back ? page <= 0 : page >= pages - 1;
  }
}
function refresh(grid, config, previous) {
  grid._config = config;
  evaluate(grid, config);
  grid._selected = new Set(config.selected || []);
  grid._shown = shown(grid, config);
  layoutColumns(grid, config);
  syncFilters(grid, config);
  grid._gen = (grid._gen || 0) + 1;
  const prev = previous?.config || {};
  const moved = ["filters", "sorters", "page"].some((k) => JSON.stringify(prev[k] ?? null) !== JSON.stringify(config[k] ?? null));
  if (moved && paging(grid) !== "infinite")
    grid._parts.viewport.scrollTop = 0;
  if (moved)
    grid._focus = { row: grid._focus.row < 0 ? -1 : 0, col: grid._focus.col };
  grid.setAttribute("aria-rowcount", String((grid._result.entries.length || 0) + (grid._parts.filters ? 2 : 1)));
  grid.setAttribute("aria-colcount", String(grid._columns.length));
  renderRows(grid);
  renderFooter(grid, config);
  return grid._result.entries.length;
}
function triggerStateChange5(grid, state, previous) {
  grid._config = state.config;
  let name = state.name;
  if (name !== "loading" && grid._parts) {
    const rows = refresh(grid, state.config, previous);
    if (name === "default" && !rows)
      name = "empty";
  }
  applyMarkup5(grid, { name, config: state.config });
  grid.dataset.stateName = name;
  if (grid._saved) {
    const keep = {};
    for (const k of SAVED_KEYS)
      if (state.config[k] !== undefined)
        keep[k] = state.config[k];
    grid._saved.set(keep);
  }
}
var dataGridApi = componentState({
  component: "data-grid",
  states: dataGridStates,
  mergeConfig: true,
  apply: (grid, state, previous) => triggerStateChange5(grid, state, previous),
  markup: (el, state) => applyMarkup5(el, state)
});
df$5.dataGridApi = dataGridApi;
df$5.dataGridStates = dataGridStates;
var query = (grid, patch) => dataGridApi.setState(grid, grid.store.value.name === "loading" ? "loading" : "default", patch);
function toggleRow(grid, index, mode) {
  const entry = grid._shown[index];
  if (!entry || !grid.dataset.select)
    return;
  const id = entry.row[grid._source.idField];
  let next;
  if (grid.dataset.select === "single" || mode === "only")
    next = grid._selected.has(id) && grid._selected.size === 1 && mode !== "only" ? [] : [id];
  else if (mode === "range" && grid._anchor != null) {
    const from = Math.min(grid._anchor, index);
    const to = Math.max(grid._anchor, index);
    next = [...new Set([...grid._selected, ...grid._shown.slice(from, to + 1).map((e) => e.row[grid._source.idField])])];
  } else {
    next = grid._selected.has(id) ? [...grid._selected].filter((x) => x !== id) : [...grid._selected, id];
  }
  if (mode !== "range")
    grid._anchor = index;
  query(grid, { selected: next });
}
function selectAll(grid) {
  const idField = grid._source?.idField ?? "id";
  query(grid, { selected: (grid._result?.entries ?? []).map((e) => e.row[idField]) });
}
function toggleExpand(grid, index, open) {
  const entry = grid._shown[index];
  if (!entry?.meta.hasChildren)
    return;
  const id = entry.row[grid._source.idField];
  const want = open ?? !entry.meta.isExpanded;
  if (want === entry.meta.isExpanded)
    return;
  const config = configOf(grid);
  if ((config.filters || []).length) {
    const collapsed = new Set(config.collapsed || []);
    if (want)
      collapsed.delete(id);
    else
      collapsed.add(id);
    query(grid, { collapsed: [...collapsed] });
  } else {
    const expanded = new Set(config.expanded || []);
    if (want)
      expanded.add(id);
    else
      expanded.delete(id);
    query(grid, { expanded: [...expanded] });
  }
}
function focusCell(grid, row, col) {
  const total = grid._shown.length;
  row = Math.max(-1, Math.min(total - 1, row));
  col = Math.max(0, Math.min(grid._order.length - 1, col));
  grid._focus = { row, col };
  const { viewport } = parts(grid);
  if (row >= 0) {
    const view = viewport.clientHeight - grid._parts.head.offsetHeight;
    viewport.scrollTop = scrollIntoViewTop(row, viewport.scrollTop, view, rowHeight(grid), total);
  }
  renderRows(grid);
  for (const [c, header] of grid._order.entries())
    header.el.tabIndex = row === -1 && c === col ? 0 : -1;
  const target = row === -1 ? grid._order[col].el : dfDollar5(grid._parts.pool).children(".data-grid-row").toArray().find((r) => r._index === row)?.children[col];
  target?.focus({ preventScroll: row === -1 });
}
function onKeydown2(grid, e) {
  if (e.target.closest?.(".data-grid-filters, .data-grid-footer"))
    return;
  const { row, col } = grid._focus;
  const page = Math.max(1, Math.floor((grid._parts.viewport.clientHeight - grid._parts.head.offsetHeight) / rowHeight(grid)) - 1);
  const last = grid._shown.length - 1;
  const entry = row >= 0 ? grid._shown[row] : null;
  let next = null;
  switch (e.key) {
    case "ArrowDown":
      next = [Math.min(last, row + 1), col];
      break;
    case "ArrowUp":
      next = [Math.max(-1, row - 1), col];
      break;
    case "ArrowRight":
      if (isTree(grid) && entry && col === 0 && entry.meta.hasChildren && !entry.meta.isExpanded) {
        toggleExpand(grid, row, true);
        next = [row, 0];
      } else
        next = [row, col + 1];
      break;
    case "ArrowLeft":
      if (isTree(grid) && entry && col === 0) {
        if (entry.meta.hasChildren && entry.meta.isExpanded) {
          toggleExpand(grid, row, false);
          next = [row, 0];
        } else if (entry.meta.parentId != null) {
          const parent = grid._shown.findIndex((x) => x.row[grid._source.idField] === entry.meta.parentId);
          next = [parent >= 0 ? parent : row, 0];
        } else
          next = [row, 0];
      } else
        next = [row, col - 1];
      break;
    case "Home":
      next = e.ctrlKey || e.metaKey ? [Math.min(row, 0), col] : [row, 0];
      break;
    case "End":
      next = e.ctrlKey || e.metaKey ? [last, col] : [row, grid._order.length - 1];
      break;
    case "PageDown":
      next = [Math.min(last, Math.max(0, row) + page), col];
      break;
    case "PageUp":
      next = [Math.max(0, row - page), col];
      break;
    case " ":
      if (row >= 0) {
        toggleRow(grid, row, e.shiftKey ? "range" : "toggle");
        next = [row, col];
      }
      break;
    case "a":
    case "A":
      if (!(e.ctrlKey || e.metaKey) || grid.dataset.select !== "multiple")
        return;
      selectAll(grid);
      next = [row, col];
      break;
    case "Enter":
      if (row === -1) {
        const column = grid._order[col];
        if (column.sortable)
          query(grid, { sorters: cycleSort(configOf(grid).sorters, column.sortField, e.shiftKey), page: 0 });
        next = [-1, col];
      } else if (entry) {
        grid.dispatchEvent(new CustomEvent("data-grid-activate", { bubbles: true, detail: { record: entry.row, index: row } }));
      }
      break;
    default:
      return;
  }
  e.preventDefault();
  if (next)
    focusCell(grid, next[0], next[1]);
}
function onClick(grid, e) {
  const t = e.target;
  const pin = t.closest(".data-grid-pin");
  if (pin) {
    const locked = new Set(configOf(grid).locked || []);
    if (locked.has(pin.dataset.field))
      locked.delete(pin.dataset.field);
    else
      locked.add(pin.dataset.field);
    query(grid, { locked: grid._columns.map((c) => c.field).filter((f) => locked.has(f)) });
    return;
  }
  const pageButton = t.closest("[data-page]");
  if (pageButton && grid._parts.footer.contains(pageButton)) {
    const page = Math.max(0, configOf(grid).page || 0);
    const target = { first: 0, prev: page - 1, next: page + 1, last: pageCount(grid) - 1 }[pageButton.dataset.page];
    query(grid, { page: Math.max(0, Math.min(pageCount(grid) - 1, target)) });
    return;
  }
  const header = t.closest(".data-grid-header");
  if (header && grid.contains(header)) {
    const column = grid._columns.find((c) => c.el === header);
    if (column?.sortable)
      query(grid, { sorters: cycleSort(configOf(grid).sorters, column.sortField, e.shiftKey), page: 0 });
    grid._focus = { row: -1, col: grid._order.indexOf(column) };
    return;
  }
  const row = t.closest(".data-grid-row");
  if (!row || !grid._parts.pool.contains(row))
    return;
  const index = row._index;
  const cell = t.closest(".data-grid-cell");
  grid._focus = { row: index, col: Math.max(0, [...row.children].indexOf(cell)) };
  if (t.closest(".data-grid-toggle"))
    return toggleExpand(grid, index);
  if (t.closest("a, button, input, select, textarea, label"))
    return;
  toggleRow(grid, index, e.shiftKey ? "range" : e.ctrlKey || e.metaKey ? "toggle" : "only");
}
function onFilterInput(grid, e) {
  const input = e.target.closest?.(".data-grid-filter");
  if (!input)
    return;
  clearTimeout(grid._filterTimer);
  grid._filterTimer = setTimeout(() => {
    const filters = dfDollar5(grid._parts.filters).find(".data-grid-filter").toArray().map((el) => parseFilter(el.dataset.field, el.value, el.dataset.kind)).filter(Boolean);
    query(grid, { filters, page: 0, collapsed: [] });
  }, e.type === "change" ? 0 : 200);
}
async function onNearEnd(grid, force = false) {
  if (paging(grid) !== "infinite" || grid._loadingMore || !grid._source)
    return;
  const config = configOf(grid);
  const loaded = grid._source.rows.length > 0;
  const loadedRows = ((config.page || 0) + 1) * pageSize(grid);
  const { viewport } = parts(grid);
  if (!force && viewport.scrollTop + viewport.clientHeight < viewport.scrollHeight - rowHeight(grid) * 4)
    return;
  if (loadedRows < (grid._result?.entries.length ?? 0)) {
    query(grid, { page: (config.page || 0) + 1 });
    return;
  }
  if (!grid._load || grid._exhausted)
    return;
  grid._loadingMore = true;
  grid.setAttribute("data-loading-more", "");
  try {
    const more = await grid._load(grid._source.rows.length, pageSize(grid));
    if (!more?.length)
      grid._exhausted = true;
    else
      grid._source.setRows([...grid._source.rows, ...more]);
    dataGridApi.setState(grid, "default", loaded && more?.length ? { page: (config.page || 0) + 1 } : {});
  } finally {
    grid._loadingMore = false;
    grid.removeAttribute("data-loading-more");
  }
  if (!grid._exhausted && grid._parts.viewport.scrollHeight <= grid._parts.viewport.clientHeight)
    onNearEnd(grid, true);
}
var resolve = (target) => typeof target === "string" ? dfDollar5(target).get(0) : target;
df$5.dataGrid = {
  setSource(target, rows, options = {}) {
    const grid = resolve(target);
    grid._sourceOptions = options;
    const parentIdField = options.parentIdField || grid.dataset.parentField;
    const idField = options.idField || grid.dataset.idField || "id";
    grid._source = dataSource(rows, { idField, tree: parentIdField ? { idField, parentIdField } : undefined });
    grid._cells = options.cells || null;
    grid._load = options.load || null;
    grid._exhausted = false;
    grid.setAttribute("role", parentIdField ? "treegrid" : "grid");
    if (!grid.store)
      return;
    if (grid._parts.filters)
      grid._parts.filters._key = "";
    const patch = { ...options.query, ...options.persist ? attachPersistence2(grid, options.persist) : {} };
    if (grid._load && !rows.length) {
      dataGridApi.setState(grid, "loading", { ...patch, page: 0 });
      onNearEnd(grid, true);
      return;
    }
    dataGridApi.setState(grid, "default", patch);
  },
  query: (target, patch) => {
    query(resolve(target), patch);
  },
  rows: (target) => (resolve(target)._result?.entries ?? []).map((e) => e.row),
  selected(target) {
    const grid = resolve(target);
    const ids = grid._selected ?? new Set;
    return (grid._source?.rows ?? []).filter((r) => ids.has(r[grid._source.idField]));
  },
  selectAll: (target) => selectAll(resolve(target)),
  clearSelection: (target) => {
    query(resolve(target), { selected: [] });
  },
  expandAll(target) {
    const grid = resolve(target);
    query(grid, { expanded: grid._source.branchIds(), collapsed: [] });
  },
  collapseAll(target) {
    const grid = resolve(target);
    const filtering = (configOf(grid).filters || []).length > 0;
    query(grid, filtering ? { collapsed: grid._source.branchIds() } : { expanded: [] });
  }
};
function init5() {
  dfDollar5(".data-grid:not([data-init])").toArray().forEach((grid) => {
    grid.dataset.init = "";
    const viewport = dfDollar5(grid).children(".data-grid-viewport").get(0);
    const head = viewport && dfDollar5(viewport).children(".data-grid-head").get(0);
    const body = viewport && dfDollar5(viewport).children(".data-grid-body").get(0);
    if (!viewport || !head || !body)
      return;
    let footer = dfDollar5(grid).children(".data-grid-footer").get(0);
    if (!footer) {
      footer = document.createElement("div");
      footer.className = "data-grid-footer";
      dfDollar5(grid).append(footer);
    }
    body.dataset.emptyText = grid.dataset.emptyText || "No rows match.";
    const pool = document.createElement("div");
    pool.className = "data-grid-rows";
    pool.setAttribute("role", "presentation");
    dfDollar5(body).append(pool);
    grid._parts = { viewport, head, body, pool, footer };
    grid._columns = readColumns(grid);
    grid._focus = { row: 0, col: 0 };
    grid._selected = new Set;
    grid._rowHeight = parseFloat(getComputedStyle(grid).getPropertyValue("--data-grid-row-height")) || 36;
    if (!grid.hasAttribute("role"))
      grid.setAttribute("role", grid.dataset.parentField ? "treegrid" : "grid");
    if (grid.dataset.select === "multiple")
      grid.setAttribute("aria-multiselectable", "true");
    for (const column of grid._columns) {
      column.el.setAttribute("role", "columnheader");
      column.el.tabIndex = -1;
    }
    buildPins(grid);
    buildFilters(grid);
    const early = grid._sourceOptions || {};
    const config = {
      filters: [],
      sorters: authoredSort(grid),
      locked: grid._columns.filter((c) => c.el.hasAttribute("data-locked")).map((c) => c.field),
      page: 0,
      expanded: [],
      collapsed: [],
      selected: [],
      ...early.query,
      ...attachPersistence2(grid, early.persist)
    };
    let queued = false;
    viewport.addEventListener("scroll", () => {
      if (queued)
        return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        renderRows(grid);
        onNearEnd(grid);
      });
    }, { passive: true });
    new ResizeObserver(() => {
      if (!grid._order)
        return;
      layoutColumns(grid, configOf(grid));
      grid._gen++;
      renderRows(grid);
    }).observe(grid);
    grid.addEventListener("click", (e) => onClick(grid, e));
    grid.addEventListener("keydown", (e) => onKeydown2(grid, e));
    grid.addEventListener("input", (e) => onFilterInput(grid, e));
    grid.addEventListener("change", (e) => onFilterInput(grid, e));
    grid.addEventListener("focusin", (e) => {
      if (e.target === grid)
        focusCell(grid, grid._focus.row, grid._focus.col);
    });
    bindComponent(grid, dataGridApi, { name: grid._source ? "default" : "loading", config });
    dataGridApi.setState(grid, grid._source && !(grid._load && !grid._source.rows.length) ? "default" : "loading", config);
    if (grid._load && !grid._source.rows.length)
      onNearEnd(grid, true);
  });
}
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// src/components/dialog/dialog.ts
var df$6 = defussGlobals();
var dfDollar6 = defussQuery();
var dialogStates = ["default", "open"];
function applyMarkup6(dialog, stateName) {
  dfDollar6(dialog).attr("open", stateName === "open" ? "" : null);
}
function triggerStateChange6(dialog, stateName, _config) {
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
var dialogApi = componentState({
  component: "dialog",
  states: dialogStates,
  apply: (dialog, state) => triggerStateChange6(dialog, state.name, state.config),
  markup: (el, state) => applyMarkup6(el, state.name)
});
df$6.dialogApi = dialogApi;
df$6.dialogStates = dialogStates;
function init6() {
  dfDollar6("[data-dialog-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar6("#" + CSS.escape(trigger.dataset.dialogTrigger)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog._trigger = trigger;
      dialog.showModal();
    });
  });
  dfDollar6("dialog:not(.alert-dialog):not(.sheet):not(.command):not(.window):not(.cookie-consent-dialog):not([data-init])").toArray().forEach((dialog) => {
    dfDollar6(dialog).data("init", "");
    bindComponent(dialog, dialogApi);
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog)
        dialog.close();
    });
    dfDollar6(dialog).find("[data-dialog-close]").toArray().forEach((btn) => {
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
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// src/components/dropdown/dropdown.ts
var df$7 = defussGlobals();
var dfDollar7 = defussQuery();
var dropdownStates = ["default", "open"];
var ITEM = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
var isDisabled = (el) => el.disabled || el.getAttribute("aria-disabled") === "true";
var itemsOf = (menu) => Array.from(dfDollar7(menu).find(ITEM).toArray()).filter((i) => i.closest('[role="menu"]') === menu && !isDisabled(i));
var subOf = (trigger) => dfDollar7(trigger).closest(".dropdown-sub").children(".dropdown-sub-content").get(0) ?? null;
var rootOf2 = (menu) => {
  let m = menu;
  while (m?.parentElement?.closest(".dropdown-content[popover]"))
    m = m.parentElement.closest(".dropdown-content[popover]");
  return m;
};
var HOVER_OPEN = 120;
var HOVER_CLOSE = 220;
function applyMarkup7(_el, _stateName) {}
function triggerStateChange7(menu, stateName, _config) {
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
var dropdownApi = componentState({
  component: "dropdown",
  states: dropdownStates,
  apply: (menu, state) => triggerStateChange7(menu, state.name, state.config),
  markup: (el, state) => applyMarkup7(el, state.name)
});
df$7.dropdownApi = dropdownApi;
df$7.dropdownStates = dropdownStates;
var anchorSeq = 0;
function highlight(menu, item, focus = true) {
  itemsOf(menu).forEach((i) => {
    if (i !== item)
      i.removeAttribute("data-highlighted");
  });
  if (item) {
    item.setAttribute("data-highlighted", "");
    if (focus)
      item.focus({ preventScroll: true });
  }
}
function activate(menu, item) {
  if (isDisabled(item))
    return;
  const role = item.getAttribute("role");
  if (item.classList.contains("dropdown-sub-trigger")) {
    openSub(item, true);
    return;
  }
  if (role === "menuitemcheckbox") {
    const checked = item.getAttribute("aria-checked") !== "true";
    item.setAttribute("aria-checked", String(checked));
    item.dispatchEvent(new CustomEvent("dropdown:select", { bubbles: true, detail: { item, value: item.dataset.value ?? item.textContent.trim(), checked } }));
    return;
  }
  if (role === "menuitemradio") {
    const group = item.closest('[role="group"]') ?? menu;
    dfDollar7(group).find('[role="menuitemradio"]').toArray().forEach((r) => {
      if (r.closest('[role="menu"]') === menu)
        r.setAttribute("aria-checked", String(r === item));
    });
    item.dispatchEvent(new CustomEvent("dropdown:select", { bubbles: true, detail: { item, value: item.dataset.value ?? item.textContent.trim(), checked: true } }));
    return;
  }
  item.dispatchEvent(new CustomEvent("dropdown:select", { bubbles: true, detail: { item, value: item.dataset.value ?? item.textContent.trim() } }));
  try {
    rootOf2(menu).hidePopover();
  } catch {}
}
function openSub(trigger, focusFirst) {
  const sub = subOf(trigger);
  if (!sub || isDisabled(trigger))
    return;
  clearTimeout(sub._closeTimer);
  sub._focusFirst = focusFirst;
  if (!sub.matches(":popover-open")) {
    try {
      sub.showPopover();
    } catch {}
  } else if (focusFirst)
    highlight(sub, itemsOf(sub)[0]);
}
function closeSub(sub) {
  if (sub?.matches(":popover-open")) {
    try {
      sub.hidePopover();
    } catch {}
  }
}
function wireMenu(menu) {
  if (menu._wired)
    return;
  menu._wired = true;
  const own = (e) => e.target instanceof Element && e.target.closest('[role="menu"]') === menu;
  const openSubs = () => Array.from(dfDollar7(menu).find(".dropdown-sub-content").toArray()).filter((s) => s.parentElement.closest('[role="menu"]') === menu && s.matches(":popover-open"));
  menu.addEventListener("mousemove", (e) => {
    if (!own(e))
      return;
    const item = e.target.closest(ITEM);
    if (!item || isDisabled(item))
      return;
    if (!(item.hasAttribute("data-highlighted") && item === document.activeElement))
      highlight(menu, item);
    if (menu._hoverItem === item)
      return;
    menu._hoverItem = item;
    clearTimeout(menu._hoverTimer);
    const sub = item.classList.contains("dropdown-sub-trigger") ? subOf(item) : null;
    menu._hoverTimer = setTimeout(() => {
      openSubs().forEach((s) => {
        if (s !== sub)
          closeSub(s);
      });
      if (sub)
        openSub(item, false);
    }, sub ? HOVER_OPEN : HOVER_CLOSE);
  });
  menu.addEventListener("mouseleave", (e) => {
    clearTimeout(menu._hoverTimer);
    menu._hoverItem = null;
    const to = e.relatedTarget;
    if (to instanceof Element && to.closest(".dropdown-sub-content") && menu.contains(to))
      return;
    itemsOf(menu).forEach((i) => {
      if (!(i.classList.contains("dropdown-sub-trigger") && subOf(i)?.matches(":popover-open")))
        i.removeAttribute("data-highlighted");
    });
  });
  menu.addEventListener("mousedown", (e) => {
    if (!own(e))
      return;
    const hit = e.target instanceof Element ? e.target.closest(`${ITEM}, input, textarea, select`) : null;
    if (!hit || isDisabled(hit))
      e.preventDefault();
  });
  menu.addEventListener("click", (e) => {
    if (!own(e))
      return;
    const item = e.target.closest(ITEM);
    if (!item)
      return;
    activate(menu, item);
  });
  menu.addEventListener("keydown", (e) => {
    if (!own(e))
      return;
    const items = itemsOf(menu);
    const current = items.indexOf(document.activeElement);
    const isSub = menu.classList.contains("dropdown-sub-content");
    const rtl = getComputedStyle(menu).direction === "rtl";
    const inward = rtl ? "ArrowLeft" : "ArrowRight";
    const outward = rtl ? "ArrowRight" : "ArrowLeft";
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        highlight(menu, items[(current + 1) % items.length]);
        break;
      case "ArrowUp":
        e.preventDefault();
        highlight(menu, items[(current - 1 + items.length) % items.length]);
        break;
      case "Home":
        e.preventDefault();
        highlight(menu, items[0]);
        break;
      case "End":
        e.preventDefault();
        highlight(menu, items[items.length - 1]);
        break;
      case inward:
        if (document.activeElement?.classList.contains("dropdown-sub-trigger")) {
          e.preventDefault();
          openSub(document.activeElement, true);
        }
        break;
      case outward:
        if (isSub) {
          e.preventDefault();
          closeSub(menu);
        }
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        if (isSub)
          closeSub(menu);
        else
          menu.hidePopover();
        break;
      case "Tab":
        try {
          rootOf2(menu).hidePopover();
        } catch {}
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (document.activeElement?.matches(ITEM) && !isDisabled(document.activeElement))
          document.activeElement.click();
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
          const k = e.key.toLowerCase();
          const rest = items.slice(current + 1).concat(items.slice(0, current + 1));
          const match = rest.find((item) => item.textContent.trim().toLowerCase().startsWith(k));
          if (match)
            highlight(menu, match);
        }
    }
  });
}
function wireSub(wrap) {
  const trigger = dfDollar7(wrap).find(":scope > .dropdown-sub-trigger").get(0);
  const sub = dfDollar7(wrap).find(":scope > .dropdown-sub-content").get(0);
  if (!trigger || !sub || sub._subWired)
    return;
  sub._subWired = true;
  sub.dataset.init = "";
  if (!sub.hasAttribute("popover"))
    sub.setAttribute("popover", "auto");
  if (!sub.id)
    sub.id = `dropdown-sub-${++anchorSeq}`;
  const anchor = `--dropdown-sub-${anchorSeq}-${sub.id}`;
  trigger.style.anchorName = anchor;
  sub.style.positionAnchor = anchor;
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-expanded", "false");
  trigger.setAttribute("aria-controls", sub.id);
  wireMenu(sub);
  sub.addEventListener("toggle", (e) => {
    const open = e.newState === "open";
    trigger.setAttribute("aria-expanded", String(open));
    if (open) {
      trigger.setAttribute("data-highlighted", "");
      if (sub._focusFirst)
        highlight(sub, itemsOf(sub)[0]);
    } else {
      itemsOf(sub).forEach((i) => {
        i.removeAttribute("data-highlighted");
      });
      if (sub.contains(document.activeElement) || document.activeElement === document.body)
        trigger.focus({ preventScroll: true });
    }
  });
  sub.addEventListener("mouseenter", () => {
    const parent = trigger.closest('[role="menu"]');
    if (parent)
      clearTimeout(parent._hoverTimer);
    highlight(parent, trigger, false);
  });
}
function init7() {
  dfDollar7("[data-dropdown-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const menu = dfDollar7("#" + CSS.escape(trigger.dataset.dropdownTrigger)).get(0);
    if (!menu)
      return;
    const anchorId = `--dropdown-${menu.id}`;
    trigger.style.anchorName = anchorId;
    menu.style.positionAnchor = anchorId;
    if (!trigger.hasAttribute("aria-haspopup"))
      trigger.setAttribute("aria-haspopup", "menu");
    if (!trigger.hasAttribute("aria-controls"))
      trigger.setAttribute("aria-controls", menu.id);
    if (!trigger.hasAttribute("popovertarget"))
      trigger.setAttribute("popovertarget", menu.id);
    menu._trigger = trigger;
    menu.addEventListener("toggle", (e) => {
      if (e.target !== menu)
        return;
      const open = e.newState === "open";
      trigger.setAttribute("aria-expanded", String(open));
      if (open) {
        const first = itemsOf(menu)[0];
        if (first && !menu._noFocus)
          highlight(menu, first);
        menu._noFocus = false;
      } else {
        itemsOf(menu).forEach((i) => {
          i.removeAttribute("data-highlighted");
        });
        const active = document.activeElement;
        const other = active instanceof Element && active !== trigger ? active.closest("[data-dropdown-trigger]") : null;
        const otherOpen = other ? dfDollar7("#" + CSS.escape(other.getAttribute("data-dropdown-trigger"))).get(0)?.matches(":popover-open") : false;
        if (!otherOpen && (!active || active === document.body || menu.contains(active) || other))
          trigger.focus({ preventScroll: true });
      }
    });
    wireMenu(menu);
    dfDollar7(menu).find(".dropdown-sub").toArray().forEach(wireSub);
  });
  dfDollar7(".dropdown-sub").toArray().forEach(wireSub);
  dfDollar7(".dropdown-content[popover]:not(.dropdown-sub-content):not([data-init])").toArray().forEach((menu) => {
    menu.dataset.init = "";
    bindComponent(menu, dropdownApi);
  });
}
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

// src/components/number-input/number-input.ts
var df$8 = defussGlobals();
var dfDollar8 = defussQuery();
var numberInputStates = ["default"];
var getInput = (wrapper) => dfDollar8(wrapper).find('input:not([type="hidden"])').get(0);
function currencyConfig(wrapper) {
  const currency = String(wrapper.dataset.currency || "USD").toUpperCase();
  const locale = wrapper.dataset.locale || textLocale(wrapper);
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
  dfDollar8(wrapper).find("input[data-number-output]").toArray().forEach((out) => {
    if (out.value === value)
      return;
    out.value = value;
    out.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
function placeCurrencySymbol(wrapper, input, cfg) {
  let unit = dfDollar8(wrapper).find(".number-input-unit").get(0);
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
function applyMarkup8(_el, _stateName) {}
function triggerStateChange8(wrapper, config) {
  const input = getInput(wrapper);
  if (!input)
    return;
  if (wrapper._money) {
    const machine = config?.number !== undefined ? config.number : config?.value;
    if (machine === undefined)
      return;
    commitMoney(wrapper, input, wrapper._money, machine === "" ? "" : String(machine));
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
    return;
  }
  if (config?.value === undefined)
    return;
  input.value = String(config.value);
  formatDecimals(wrapper, input);
  input.dispatchEvent(new Event("input", { bubbles: true }));
  input.dispatchEvent(new Event("change", { bubbles: true }));
}
var numberInputApi = componentState({
  component: "number-input",
  states: numberInputStates,
  apply: (wrapper, state) => triggerStateChange8(wrapper, state.config),
  read: (wrapper, state) => {
    const input = getInput(wrapper);
    return {
      name: wrapper.dataset.stateName || "default",
      config: {
        ...state.config,
        value: input ? input.value : "",
        ...wrapper._money ? { number: wrapper.dataset.value ?? "", currency: wrapper._money.currency, locale: wrapper._money.locale } : {}
      }
    };
  },
  markup: (el, state) => applyMarkup8(el, state.name)
});
df$8.numberInputApi = numberInputApi;
df$8.numberInputStates = numberInputStates;
function init8() {
  dfDollar8(".number-input:not([data-init])").toArray().forEach((wrapper) => {
    wrapper.dataset.init = "";
    bindComponent(wrapper, numberInputApi);
    const input = getInput(wrapper);
    const decBtn = dfDollar8(wrapper).find('[data-action="decrement"]').get(0);
    const incBtn = dfDollar8(wrapper).find('[data-action="increment"]').get(0);
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
init8();
new MutationObserver(init8).observe(document, { childList: true, subtree: true });

// src/components/popover/popover.ts
var df$9 = defussGlobals();
var dfDollar9 = defussQuery();
var popoverStates = ["default", "open"];
function applyMarkup9(_el, _stateName) {}
function triggerStateChange9(popover, stateName, _config) {
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
var popoverApi = componentState({
  component: "popover",
  states: popoverStates,
  apply: (popover, state) => triggerStateChange9(popover, state.name, state.config),
  markup: (el, state) => applyMarkup9(el, state.name)
});
df$9.popoverApi = popoverApi;
df$9.popoverStates = popoverStates;
function init9() {
  dfDollar9("[popovertarget]:not([data-init])").toArray().forEach((trigger) => {
    const id = trigger.getAttribute("popovertarget");
    const popover = dfDollar9("#" + CSS.escape(id)).get(0);
    if (!popover || !popover.classList.contains("popover"))
      return;
    trigger.dataset.init = "";
    const anchorId = `--popover-${id}`;
    trigger.style.anchorName = anchorId;
    popover.style.positionAnchor = anchorId;
  });
  dfDollar9(".popover[popover]:not([data-init])").toArray().forEach((popover) => {
    popover.dataset.init = "";
    bindComponent(popover, popoverApi);
  });
}
init9();
new MutationObserver(init9).observe(document, { childList: true, subtree: true });

// src/components/progress/progress.ts
var df$10 = defussGlobals();
var dfDollar10 = defussQuery();
var progressStates = ["default", "indeterminate", "complete"];
var SELECTOR = "progress.progress";
var reducedMotion3 = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var maxOf = (el) => el.max || 1;
var clamp = (el, v) => Math.max(0, Math.min(maxOf(el), Number(v) || 0));
var round = (v) => Math.round(v * 10) / 10;
var formats = new Map;
var fmtFor = (node) => {
  const locale = textLocale(node);
  if (!formats.has(locale)) {
    formats.set(locale, {
      pct: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }),
      num: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
    });
  }
  return formats.get(locale);
};
function text(out, el) {
  const { pct: pctFmt, num: numFmt } = fmtFor(out);
  const v = el.position < 0 ? null : el.value;
  const max = maxOf(el);
  if (v == null)
    return out.dataset.indeterminate ?? "…";
  const pct = v / max;
  const tpl = out.dataset.template;
  if (tpl) {
    return tpl.replaceAll("{value}", numFmt.format(Math.round(v))).replaceAll("{max}", numFmt.format(max)).replaceAll("{percent}", pctFmt.format(pct));
  }
  switch (out.dataset.format) {
    case "fraction":
      return `${numFmt.format(Math.round(v))} / ${numFmt.format(max)}`;
    case "value":
      return numFmt.format(Math.round(v));
    default:
      return pctFmt.format(pct);
  }
}
function outputsOf(el) {
  const outs = new Set;
  if (el.id)
    dfDollar10(`output.progress-value[for~="${CSS.escape(el.id)}"]`).toArray().forEach((o) => outs.add(o));
  dfDollar10(el).closest(".progress-field").find(".progress-value").toArray().forEach((o) => {
    if (!o.htmlFor?.value || el.id && o.htmlFor.contains(el.id))
      outs.add(o);
  });
  return [...outs];
}
function paint(el) {
  const indeterminate = el.position < 0;
  const pct = indeterminate ? 0 : el.value / maxOf(el);
  el.dataset.level = pct < 0.34 ? "low" : pct < 0.67 ? "mid" : "high";
  el.toggleAttribute("data-complete", !indeterminate && el.value >= maxOf(el));
  let spoken = "";
  for (const out of outputsOf(el)) {
    const t = text(out, el);
    out.value = t;
    out.dataset.text = t;
    out.style.setProperty("--progress-pct", `${(pct * 100).toFixed(2)}%`);
    if (out.dataset.format === "fraction" || out.dataset.template)
      spoken ||= t;
  }
  if (spoken)
    el.setAttribute("aria-valuetext", spoken);
  else
    el.removeAttribute("aria-valuetext");
}
function stopTween(el) {
  if (el._raf)
    cancelAnimationFrame(el._raf);
  el._raf = 0;
}
function commit(el, v, emit = true) {
  const before = el.dataset.stateName;
  el.value = v;
  paint(el);
  const done = v >= maxOf(el);
  el.dataset.stateName = done ? "complete" : "default";
  if (emit)
    el.dispatchEvent(new CustomEvent("progress:change", { bubbles: true, detail: { value: el.value, max: el.max, percent: el.value / maxOf(el) } }));
  if (done && before !== "complete")
    el.dispatchEvent(new CustomEvent("progress:completed", { bubbles: true }));
}
function tween(el, to, duration) {
  stopTween(el);
  const from = el.position < 0 ? 0 : el.value;
  if (!(duration > 0) || reducedMotion3() || from === to)
    return commit(el, to);
  const t0 = performance.now();
  el.dataset.stateName = "default";
  el.toggleAttribute("data-running", true);
  const frame = (now) => {
    const k = Math.min(1, (now - t0) / duration);
    if (k < 1) {
      el.value = round(from + (to - from) * k);
      paint(el);
      el._raf = requestAnimationFrame(frame);
    } else {
      el._raf = 0;
      el.removeAttribute("data-running");
      commit(el, to);
    }
  };
  el._raf = requestAnimationFrame(frame);
}
var stepOf = (el) => parseFloat(el.dataset.step || "") || maxOf(el) / 10;
var durationOf = (el) => parseFloat(el.dataset.duration || "") || 3000;
function applyMarkup10(el, stateName, config) {
  const authored = el.position < 0 ? null : el.value;
  if (config?.max != null && Number(config.max) !== el.max)
    el.max = Number(config.max);
  if (stateName === "indeterminate")
    dfDollar10(el).attr("value", null);
  else
    el.value = stateName === "complete" ? maxOf(el) : clamp(el, config?.value != null ? config.value : authored ?? 0);
  const indeterminate = el.position < 0;
  const pct = indeterminate ? 0 : el.value / maxOf(el);
  dfDollar10(el).attr("data-level", pct < 0.34 ? "low" : pct < 0.67 ? "mid" : "high");
  dfDollar10(el).attr("data-complete", !indeterminate && el.value >= maxOf(el) ? "" : null);
  const live = el.id ? dfDollar10("#" + CSS.escape(el.id)).get(0) : null;
  const spoken = (live ? outputsOf(live) : []).filter((out) => out.dataset.format === "fraction" || out.dataset.template).map((out) => text(out, el))[0];
  dfDollar10(el).attr("aria-valuetext", spoken || null);
}
function triggerStateChange10(el, stateName, config) {
  switch (stateName) {
    case "default": {
      if (config.max != null && Number(config.max) !== el.max)
        el.max = Number(config.max);
      const to = config.value != null ? clamp(el, config.value) : clamp(el, el._authored ?? 0);
      if (config.duration > 0)
        tween(el, to, config.duration);
      else {
        stopTween(el);
        el.removeAttribute("data-running");
        commit(el, to);
      }
      break;
    }
    case "indeterminate":
      stopTween(el);
      el.removeAttribute("data-running");
      el.removeAttribute("value");
      paint(el);
      el.dataset.stateName = "indeterminate";
      break;
    case "complete":
      if (config.duration > 0)
        tween(el, maxOf(el), config.duration);
      else {
        stopTween(el);
        el.removeAttribute("data-running");
        commit(el, maxOf(el));
      }
      break;
  }
}
var progressApi = componentState({
  component: "progress",
  states: progressStates,
  apply: (el, state) => triggerStateChange10(el, state.name, state.config),
  read: (el, state) => {
    const indeterminate = el.position < 0;
    return {
      name: el.dataset.stateName || "default",
      config: { ...state.config, value: indeterminate ? null : el.value, max: el.max, percent: indeterminate ? null : el.value / maxOf(el) }
    };
  },
  markup: (el, state) => applyMarkup10(el, state.name, state.config)
});
df$10.progressApi = progressApi;
df$10.progressStates = progressStates;
function run(el, command) {
  const now = el.position < 0 ? 0 : el.value;
  switch (command) {
    case "reset":
      progressApi.setState(el, "default", { value: 0 });
      break;
    case "increment":
      progressApi.setState(el, "default", { value: now + stepOf(el) });
      break;
    case "decrement":
      progressApi.setState(el, "default", { value: now - stepOf(el) });
      break;
    case "complete":
      progressApi.setState(el, "complete");
      break;
    case "indeterminate":
      progressApi.setState(el, "indeterminate");
      break;
    case "play": {
      if (now >= maxOf(el))
        el.value = 0;
      const rest = 1 - (el.position < 0 ? 0 : el.value) / maxOf(el);
      progressApi.setState(el, "default", { value: maxOf(el), duration: durationOf(el) * rest });
      break;
    }
    case "pause":
      stopTween(el);
      el.removeAttribute("data-running");
      commit(el, el.value);
      break;
    default:
      return false;
  }
  return true;
}
var COMMANDS = ["reset", "increment", "decrement", "complete", "indeterminate", "play", "pause"];
function init10() {
  dfDollar10(`${SELECTOR}:not([data-init])`).toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent(el, progressApi);
    el._authored = el.position < 0 ? null : el.value;
    el.dataset.stateName = el.position < 0 ? "indeterminate" : el.value >= maxOf(el) ? "complete" : "default";
    el.addEventListener("command", (e) => {
      const c = String(e.command || "");
      if (c.startsWith("--"))
        run(el, c.slice(2));
    });
    for (const c of COMMANDS)
      el.addEventListener(`progress:${c}`, () => run(el, c));
    paint(el);
  });
}
if (!("commandForElement" in HTMLButtonElement.prototype) && !document.__progressCommandInit) {
  document.__progressCommandInit = true;
  document.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest('button[commandfor][command^="--"]') : null;
    const el = btn && dfDollar10("#" + CSS.escape(btn.getAttribute("commandfor"))).get(0);
    if (el?.matches(`${SELECTOR}[data-init]`))
      run(el, btn.getAttribute("command").slice(2));
  });
}
new MutationObserver((records) => {
  for (const r of records) {
    const el = r.target;
    if (el instanceof HTMLProgressElement && el.matches(`${SELECTOR}[data-init]`) && !el._raf) {
      paint(el);
      el.dataset.stateName = el.position < 0 ? "indeterminate" : el.value >= maxOf(el) ? "complete" : "default";
    }
  }
}).observe(document, { attributes: true, subtree: true, attributeFilter: ["value", "max"] });
init10();
new MutationObserver(init10).observe(document, { childList: true, subtree: true });

// src/components/sheet/sheet.ts
var df$11 = defussGlobals();
var dfDollar11 = defussQuery();
var sheetStates = ["default", "open"];
function applyMarkup11(el, stateName) {
  dfDollar11(el).attr("open", stateName === "open" ? "" : null);
}
function triggerStateChange11(sheet, stateName, _config) {
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
var sheetApi = componentState({
  component: "sheet",
  states: sheetStates,
  apply: (sheet, state) => triggerStateChange11(sheet, state.name, state.config),
  markup: (el, state) => applyMarkup11(el, state.name)
});
df$11.sheetApi = sheetApi;
df$11.sheetStates = sheetStates;
function init11() {
  dfDollar11("[data-sheet-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const sheet = dfDollar11("#" + CSS.escape(trigger.dataset.sheetTrigger)).get(0);
    if (!sheet)
      return;
    trigger.addEventListener("click", () => {
      sheet._trigger = trigger;
      sheet.showModal();
    });
  });
  dfDollar11("dialog.sheet:not([data-init])").toArray().forEach((sheet) => {
    sheet.dataset.init = "";
    bindComponent(sheet, sheetApi);
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet)
        sheet.close();
    });
    dfDollar11(sheet).find("[data-sheet-close]").toArray().forEach((btn) => {
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
init11();
new MutationObserver(init11).observe(document, { childList: true, subtree: true });

// src/components/sidebar/sidebar.ts
var df$12 = defussGlobals();
var dfDollar12 = defussQuery();
var sidebarStates = ["default", "collapsed"];
function applyMarkup12(el, stateName) {
  dfDollar12(el).attr("data-state", stateName === "collapsed" ? "collapsed" : el._authoredState ??= dfDollar12(el).attr("data-state") || "expanded");
}
function triggerStateChange12(sidebar, stateName, _config) {
  switch (stateName) {
    case "default":
      sidebar.dataset.state = sidebar._defaultState ?? "expanded";
      break;
    case "collapsed":
      sidebar.dataset.state = "collapsed";
      break;
  }
}
var sidebarApi = componentState({
  component: "sidebar",
  states: sidebarStates,
  apply: (sidebar, state) => {
    sidebar._pinned = true;
    triggerStateChange12(sidebar, state.name, state.config);
  },
  read: (sidebar, state) => {
    return {
      name: sidebar.dataset.state === "collapsed" ? "collapsed" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup12(el, state.name)
});
df$12.sidebarApi = sidebarApi;
df$12.sidebarStates = sidebarStates;
function init12() {
  dfDollar12(".app-sidebar:not([data-init])").toArray().forEach((sidebar) => {
    sidebar.dataset.init = "";
    sidebar._defaultState = sidebar.dataset.state || "expanded";
    sidebar._pinned = !!sidebar.dataset.stateName;
    bindComponent(sidebar, sidebarApi);
    const triggerId = sidebar.id ? `[data-sidebar-trigger="${sidebar.id}"]` : ".sidebar-trigger";
    dfDollar12(triggerId).toArray().forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const state = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
        sidebar.dataset.state = state;
        sidebar._pinned = true;
      });
    });
    document.__sidebarAutoRo?.observe(sidebar.parentElement ?? sidebar);
    autoCollapseSidebar(sidebar);
  });
  dfDollar12("[data-sidebar-mobile]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar12("#" + CSS.escape(trigger.dataset.sidebarMobile)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog.showModal();
    });
    dfDollar12(dialog).find(".sidebar-mobile-close").toArray().forEach((btn) => {
      btn.addEventListener("click", () => {
        dialog.close();
      });
    });
  });
}
var AUTO_COLLAPSE_BELOW = 24 * 16;
var AUTO_COLLAPSE_ABOVE = 28 * 16;
function autoCollapseSidebar(sidebar) {
  if (sidebar._pinned)
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
  const pending = new Set;
  let frame = 0;
  document.__sidebarAutoRo = new ResizeObserver((entries) => {
    for (const entry of entries) {
      if (entry.target.classList?.contains("app-sidebar"))
        pending.add(entry.target);
      entry.target.querySelectorAll?.(".app-sidebar").forEach((s) => pending.add(s));
    }
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      pending.forEach(autoCollapseSidebar);
      pending.clear();
    });
  });
}
init12();
new MutationObserver(init12).observe(document, { childList: true, subtree: true });
if (!document.__sidebarKbInit) {
  document.__sidebarKbInit = true;
  bindGlobalKeys((e) => {
    if (!(e.metaKey || e.ctrlKey) || e.key !== "b")
      return;
    const sidebar = dfDollar12(".app-sidebar").get(0);
    if (!sidebar)
      return;
    e.preventDefault();
    sidebar.dataset.state = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
    sidebar._pinned = true;
    return true;
  });
}

// src/components/table/table.ts
var df$13 = defussGlobals();
var dfDollar13 = defussQuery();
var tableStates = ["default", "sorted", "selected"];
var bodyOf = (table) => table.tBodies[0];
var bodyRows = (table) => [...bodyOf(table)?.rows ?? []];
var rowBox = (row) => dfDollar13(row).find(':scope > .table-select input[type="checkbox"]').get(0);
var headBox = (table) => dfDollar13(table.tHead).find('.table-select input[type="checkbox"]').get(0);
function enhanceHead(table) {
  dfDollar13(table.tHead).find(".table-sort").each((_i, btn) => {
    const th = btn.closest("th");
    if (th && !th.hasAttribute("aria-sort"))
      th.setAttribute("aria-sort", "none");
  });
}
function cellValue(row, col) {
  const cell = row.cells[col];
  if (!cell)
    return "";
  return cell.dataset.sortValue ?? cell.textContent.trim();
}
function sortBy(table, col, direction) {
  const body = bodyOf(table);
  if (!body)
    return;
  const lang = textLocale(table);
  const collator = new Intl.Collator(lang, { numeric: true, sensitivity: "base" });
  const dir = direction === "descending" ? -1 : 1;
  const rows = bodyRows(table);
  rows.sort((a, b) => {
    const x = cellValue(a, col);
    const y = cellValue(b, col);
    const nx = Number(x);
    const ny = Number(y);
    const c = x !== "" && y !== "" && Number.isFinite(nx) && Number.isFinite(ny) ? nx - ny : collator.compare(x, y);
    return c * dir;
  });
  body.append(...rows);
  [...table.tHead?.rows[0]?.cells ?? []].forEach((th, i) => {
    if (dfDollar13(th).find(".table-sort").get(0))
      th.setAttribute("aria-sort", i === col ? direction : "none");
  });
  table._sort = { column: col, direction };
}
function unsort(table) {
  const body = bodyOf(table);
  if (body && table._original)
    body.append(...table._original.filter((r) => r.parentElement === body));
  dfDollar13(table.tHead).find("[aria-sort]").attr("aria-sort", "none");
  table._sort = null;
}
function syncSelection(table, announce = true) {
  const rows = bodyRows(table);
  const boxes = rows.map(rowBox).filter(Boolean);
  rows.forEach((row) => {
    const box = rowBox(row);
    if (box)
      row.setAttribute("aria-selected", String(box.checked));
  });
  const head = headBox(table);
  if (head) {
    const on = boxes.filter((b) => b.checked).length;
    head.checked = boxes.length > 0 && on === boxes.length;
    head.indeterminate = on > 0 && on < boxes.length;
  }
  if (announce) {
    const selected = rows.filter((r) => r.getAttribute("aria-selected") === "true");
    table.dispatchEvent(new CustomEvent("table-select", { bubbles: true, detail: { rows: selected, count: selected.length } }));
  }
}
function selectRows(table, which) {
  const rows = bodyRows(table);
  rows.forEach((row, i) => {
    const on = which === "all" || Array.isArray(which) && which.includes(i);
    const box = rowBox(row);
    if (!box)
      return;
    box.checked = on;
    row.setAttribute("aria-selected", String(on));
  });
  syncSelection(table);
}
function announceMove(table, row) {
  table.dispatchEvent(new CustomEvent("table-reorder", { bubbles: true, detail: { row, index: bodyRows(table).indexOf(row) } }));
}
function moved(table, row) {
  dfDollar13(table.tHead).find("[aria-sort]").attr("aria-sort", "none");
  table._sort = null;
  announceMove(table, row);
}
function initReorder(table) {
  let dragged = null;
  const clear = () => dfDollar13(table).find("[data-drop]").toArray().forEach((r) => r.removeAttribute("data-drop"));
  table.addEventListener("pointerdown", (e) => {
    const handle = e.target.closest?.(".table-handle");
    if (handle)
      handle.closest("tr").draggable = true;
  });
  table.addEventListener("dragstart", (e) => {
    const row = e.target.closest?.("tbody > tr");
    if (!row || !row.draggable)
      return;
    dragged = row;
    row.dataset.dragging = "";
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", row.cells[1]?.textContent.trim() ?? "");
  });
  table.addEventListener("dragover", (e) => {
    const row = e.target.closest?.("tbody > tr");
    if (!dragged || !row || row === dragged)
      return;
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const r = row.getBoundingClientRect();
    const where = e.clientY - r.top < r.height / 2 ? "before" : "after";
    if (row.dataset.drop !== where) {
      clear();
      row.dataset.drop = where;
    }
  });
  table.addEventListener("drop", (e) => {
    const row = dfDollar13(table).find("tbody > tr[data-drop]").get(0);
    if (!dragged || !row)
      return;
    e.preventDefault();
    const ref = row.dataset.drop === "before" ? row : row.nextSibling;
    if (ref)
      dfDollar13(ref).before(dragged);
    else
      dfDollar13(row.parentElement).append(dragged);
    clear();
    moved(table, dragged);
  });
  table.addEventListener("dragend", () => {
    if (dragged) {
      delete dragged.dataset.dragging;
      dragged.draggable = false;
    }
    dragged = null;
    clear();
  });
  table.addEventListener("keydown", (e) => {
    if (!e.altKey || e.key !== "ArrowUp" && e.key !== "ArrowDown")
      return;
    const row = e.target.closest?.("tbody > tr");
    if (!row)
      return;
    e.preventDefault();
    const sib = e.key === "ArrowUp" ? row.previousElementSibling : row.nextElementSibling;
    if (!sib)
      return;
    const ref = e.key === "ArrowUp" ? sib : sib.nextSibling;
    if (ref)
      dfDollar13(ref).before(row);
    else
      dfDollar13(row.parentElement).append(row);
    e.target.focus();
    moved(table, row);
  });
}
function measureLocks(table) {
  const n = parseInt(table.dataset.lockStart || "0", 10);
  if (n < 2)
    return;
  const first = table.rows[0];
  if (!first)
    return;
  for (let i = 1;i < n; i++)
    table.style.setProperty(`--table-lock-${i}`, `${first.cells[i - 1]?.getBoundingClientRect().width ?? 0}px`);
}
function triggerStateChange13(table, stateName, config) {
  switch (stateName) {
    case "default":
      unsort(table);
      selectRows(table, []);
      break;
    case "sorted": {
      const sort = config?.sort ?? {};
      const direction = config?.direction ?? sort.direction;
      sortBy(table, config?.column ?? sort.column ?? 0, direction === "descending" ? "descending" : "ascending");
      if (Array.isArray(config?.selected))
        selectRows(table, config.selected);
      break;
    }
    case "selected":
      if (config && "sort" in config) {
        if (config.sort)
          sortBy(table, config.sort.column ?? 0, config.sort.direction === "descending" ? "descending" : "ascending");
        else
          unsort(table);
      }
      selectRows(table, config?.rows ?? config?.selected ?? [0]);
      break;
  }
}
var tableApi = componentState({
  component: "table",
  states: tableStates,
  apply: (table, state) => triggerStateChange13(table, state.name, state.config),
  read: (table, state) => {
    const selected = bodyRows(table).flatMap((r, i) => r.getAttribute("aria-selected") === "true" ? [i] : []);
    return { name: table.dataset.stateName || "default", config: { ...state.config, sort: table._sort ?? null, selected } };
  },
  markup: (el, state) => {
    enhanceHead(el);
    triggerStateChange13(el, state.name, state.config);
  }
});
df$13.tableApi = tableApi;
df$13.tableStates = tableStates;
function init13() {
  dfDollar13("table.table:not([data-init])").toArray().forEach((table) => {
    table.dataset.init = "";
    table.dataset.stateName = "default";
    table._original = bodyRows(table);
    table._sort = null;
    bindComponent(table, tableApi);
    enhanceHead(table);
    dfDollar13(table.tHead).find(".table-sort").toArray().forEach((btn) => {
      const th = btn.closest("th");
      btn.addEventListener("click", () => {
        const col = th.cellIndex;
        const now = th.getAttribute("aria-sort");
        const next = now === "ascending" ? "descending" : now === "descending" ? "none" : "ascending";
        if (next === "none")
          unsort(table);
        else
          sortBy(table, col, next);
        table.dataset.stateName = next === "none" ? "default" : "sorted";
        table.dispatchEvent(new CustomEvent("table-sort", { bubbles: true, detail: { column: col, direction: next } }));
      });
    });
    const pre = dfDollar13(table.tHead).find('th[aria-sort="ascending"], th[aria-sort="descending"]').get(0);
    if (pre)
      sortBy(table, pre.cellIndex, pre.getAttribute("aria-sort"));
    if (dfDollar13(table).find('.table-select input[type="checkbox"]').get(0)) {
      let last = null;
      table.addEventListener("click", (e) => {
        const box = e.target.closest?.('.table-select input[type="checkbox"]');
        if (!box)
          return;
        if (box === headBox(table)) {
          const on = box.checked;
          bodyRows(table).forEach((r) => {
            const b = rowBox(r);
            if (b && !b.disabled)
              b.checked = on;
          });
        } else {
          const rows = bodyRows(table);
          const row = box.closest("tr");
          if (e.shiftKey && last && rows.includes(last)) {
            const [a, b] = [rows.indexOf(last), rows.indexOf(row)].sort((x, y) => x - y);
            rows.slice(a, b + 1).forEach((r) => {
              const rb = rowBox(r);
              if (rb && !rb.disabled)
                rb.checked = box.checked;
            });
          }
          last = row;
        }
        syncSelection(table);
        table.dataset.stateName = bodyRows(table).some((r) => r.getAttribute("aria-selected") === "true") ? "selected" : "default";
      });
      syncSelection(table, false);
    }
    if (dfDollar13(table).find(".table-handle").get(0))
      initReorder(table);
    if (table.dataset.lockStart) {
      measureLocks(table);
      let frame = 0;
      new ResizeObserver(() => {
        cancelAnimationFrame(frame);
        frame = requestAnimationFrame(() => measureLocks(table));
      }).observe(table);
    }
  });
}
init13();
new MutationObserver(init13).observe(document, { childList: true, subtree: true });

// src/components/tabs/tabs.ts
var df$14 = defussGlobals();
var dfDollar14 = defussQuery();
var tabsStates = ["default", "active", "disabled"];
var ICON = ":scope > :is(svg, img, i, .tab-icon)";
var LUCIDE_NAME = /^[a-z][a-z0-9-]*$/;
var iconOf = (tab) => {
  const icon = dfDollar14(tab).find(ICON).get(0);
  if (!icon)
    return "";
  return icon.getAttribute("data-lucide") ?? icon.textContent.trim();
};
var labelOf = (tab) => {
  const label = dfDollar14(tab).find(":scope > .tab-label").get(0);
  if (label)
    return label.textContent.trim();
  return Array.from(tab.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim();
};
var setLabel = (tab, text) => {
  const label = dfDollar14(tab).find(":scope > .tab-label").get(0);
  if (label) {
    label.textContent = text;
    return;
  }
  Array.from(tab.childNodes).forEach((n) => {
    if (n.nodeType === Node.TEXT_NODE)
      n.remove();
  });
  tab.append(document.createTextNode(text));
};
var setIcon = (tab, icon) => {
  dfDollar14(tab).find(ICON).get(0)?.remove();
  if (!icon)
    return;
  const el = document.createElement(LUCIDE_NAME.test(icon) ? "i" : "span");
  el.className = "tab-icon";
  el.setAttribute("aria-hidden", "true");
  if (el.tagName === "I")
    el.setAttribute("data-lucide", icon);
  else
    el.textContent = icon;
  tab.prepend(el);
  if (el.tagName === "I")
    globalThis.lucide?.createIcons?.();
};
var applyContent = (tab, config) => {
  if (typeof config.label === "string" && config.label !== labelOf(tab))
    setLabel(tab, config.label);
  if (typeof config.icon === "string" && config.icon !== iconOf(tab))
    setIcon(tab, config.icon);
};
var triggersOf = (el) => {
  const list = el.getAttribute("role") === "tablist" ? el : el.closest('[role="tablist"]');
  return Array.from(dfDollar14(list).find('[role="tab"]').toArray());
};
var activateTab = (tab, triggers) => {
  triggers.forEach((t) => {
    t.setAttribute("aria-selected", "false");
    t.setAttribute("tabindex", "-1");
    t.dataset.stateName = t.disabled ? "disabled" : "default";
    const panel = dfDollar14("#" + CSS.escape(t.getAttribute("aria-controls"))).get(0);
    if (panel)
      panel.hidden = true;
  });
  tab.setAttribute("aria-selected", "true");
  tab.removeAttribute("tabindex");
  tab.dataset.stateName = "active";
  const panel = dfDollar14("#" + CSS.escape(tab.getAttribute("aria-controls"))).get(0);
  if (panel)
    panel.hidden = false;
};
var nextEnabled = (from, triggers) => {
  const i = triggers.indexOf(from);
  for (let k = 1;k <= triggers.length; k++) {
    const c = triggers[(i + k) % triggers.length];
    if (!c.disabled && c !== from)
      return c;
  }
  return null;
};
var tabName = (tab) => tab.disabled ? "disabled" : tab.getAttribute("aria-selected") === "true" ? "active" : "default";
var restoreTab = (tab) => {
  tab.disabled = tab._authored.disabled;
  if (labelOf(tab) !== tab._authored.label)
    setLabel(tab, tab._authored.label);
  if (iconOf(tab) !== tab._authored.icon)
    setIcon(tab, tab._authored.icon);
  tab.dataset.stateName = tabName(tab);
};
var authoredTab = (triggers) => triggers.find((t) => t._authored.selected) || triggers.find((t) => !t.disabled);
function triggerStateChange14(el, stateName, config) {
  const triggers = triggersOf(el);
  const isList = el.getAttribute("role") === "tablist";
  const reenter = Object.keys(config).length > 0 && tabsApi.getState(el).name === stateName;
  if (isList) {
    if (!reenter) {
      switch (stateName) {
        case "default": {
          triggers.forEach(restoreTab);
          const tab = authoredTab(triggers);
          if (tab)
            activateTab(tab, triggers);
          break;
        }
        case "active":
          triggers.forEach((t) => {
            if (t.disabled && !t._authored.disabled)
              t.disabled = false;
          });
          break;
        case "disabled":
          triggers.forEach((t) => {
            t.disabled = true;
            t.dataset.stateName = "disabled";
          });
          break;
      }
    }
    const pick = typeof config.index === "number" ? triggers[config.index] : typeof config.id === "string" ? triggers.find((t) => t.id === config.id) : null;
    if (pick && !pick.disabled)
      activateTab(pick, triggers);
    return;
  }
  const tab = el;
  if (!reenter) {
    switch (stateName) {
      case "default": {
        const wasSelected = tab.getAttribute("aria-selected") === "true";
        tab.disabled = false;
        if (tab._authored.selected)
          activateTab(tab, triggers);
        else if (wasSelected) {
          const other = authoredTab(triggers.filter((t) => t !== tab)) || nextEnabled(tab, triggers);
          if (other && other !== tab)
            activateTab(other, triggers);
          else
            tab.setAttribute("aria-selected", "false");
        }
        tab.dataset.stateName = tabName(tab);
        break;
      }
      case "active":
        if (!tab.disabled)
          activateTab(tab, triggers);
        break;
      case "disabled": {
        const wasSelected = tab.getAttribute("aria-selected") === "true";
        tab.disabled = true;
        tab.dataset.stateName = "disabled";
        if (wasSelected) {
          const other = nextEnabled(tab, triggers);
          if (other)
            activateTab(other, triggers);
          tab.dataset.stateName = "disabled";
        }
        break;
      }
    }
  }
  applyContent(tab, config);
}
var selectMarkup = (tab, triggers) => {
  triggers.forEach((t) => dfDollar14(t).attr("aria-selected", "false").attr("tabindex", "-1"));
  dfDollar14(tab).attr("aria-selected", "true").attr("tabindex", null);
};
var selectedOf = (t) => dfDollar14(t).attr("aria-selected") === "true";
var disabledOf = (t) => dfDollar14(t).attr("disabled") != null;
function listMarkup(list, stateName, config) {
  const triggers = dfDollar14(list).find('[role="tab"]').toArray();
  if (stateName === "default") {
    const tab = triggers.find(selectedOf) || triggers.find((t) => !disabledOf(t));
    if (tab)
      selectMarkup(tab, triggers);
  } else if (stateName === "disabled")
    triggers.forEach((t) => dfDollar14(t).attr("disabled", ""));
  const pick = typeof config?.index === "number" ? triggers[config.index] : typeof config?.id === "string" ? triggers.find((t) => t.id === config.id) : null;
  if (pick && !disabledOf(pick))
    selectMarkup(pick, triggers);
}
function tabMarkup(tab, stateName, config) {
  if (stateName === "active")
    dfDollar14(tab).attr("disabled", null).attr("aria-selected", "true").attr("tabindex", null);
  else
    dfDollar14(tab).attr("disabled", stateName === "disabled" ? "" : null);
  applyContent(tab, config ?? {});
}
var tabsApi = componentState({
  component: "tabs",
  states: tabsStates,
  apply: (el, state, _previous, incoming) => triggerStateChange14(el, state.name, incoming),
  read: (el, state) => {
    if (el.getAttribute("role") === "tablist") {
      const triggers = triggersOf(el);
      const selected = triggers.findIndex((t) => t.getAttribute("aria-selected") === "true");
      const authored = triggers.findIndex((t) => t._authored?.selected);
      const name = triggers.every((t) => t.disabled) ? "disabled" : selected === authored || authored < 0 && selected <= 0 ? "default" : "active";
      return { name, config: { ...state.config, index: selected, id: triggers[selected]?.id ?? "" } };
    }
    return {
      name: tabName(el),
      config: { ...state.config, label: labelOf(el), icon: iconOf(el) }
    };
  },
  markup: (el, state) => (el.getAttribute("role") === "tablist" ? listMarkup : tabMarkup)(el, state.name, state.config),
  mergeConfig: true
});
df$14.tabsApi = tabsApi;
df$14.tabsStates = tabsStates;
function init14() {
  dfDollar14('[role="tablist"]:not([data-init]):has(.tab-trigger)').toArray().forEach((tablist) => {
    tablist.dataset.init = "";
    const triggers = Array.from(dfDollar14(tablist).find('[role="tab"]').toArray());
    triggers.forEach((t) => {
      t._authored = {
        selected: t.getAttribute("aria-selected") === "true",
        disabled: t.disabled,
        label: labelOf(t),
        icon: iconOf(t)
      };
      bindComponent(t, tabsApi);
    });
    bindComponent(tablist, tabsApi);
    const side = tablist.closest(".tabs")?.getAttribute("data-side");
    if ((side === "left" || side === "right") && !tablist.hasAttribute("aria-orientation")) {
      tablist.setAttribute("aria-orientation", "vertical");
    }
    const vertical = () => {
      const now = tablist.closest(".tabs")?.getAttribute("data-side");
      if (now === "left" || now === "right")
        return true;
      if (now === "top" || now === "bottom")
        return false;
      return tablist.getAttribute("aria-orientation") === "vertical";
    };
    triggers.forEach((trigger) => {
      trigger.addEventListener("click", () => {
        activateTab(trigger, triggers);
      });
      trigger.addEventListener("keydown", (e) => {
        const current = triggers.indexOf(trigger);
        let next;
        const forward = vertical() ? "ArrowDown" : "ArrowRight";
        const backward = vertical() ? "ArrowUp" : "ArrowLeft";
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
init14();
new MutationObserver(init14).observe(document, { childList: true, subtree: true });

// src/components/toast/toast.ts
var df$15 = defussGlobals();
var dfDollar15 = defussQuery();
var toastStates = ["default"];
function applyMarkup13(_el, _stateName) {}
function triggerStateChange15(container, stateName, _config) {
  if (stateName !== "default")
    return;
  dfDollar15(container).find(".toast").toArray().forEach((el) => toastDismiss(el));
}
var toastApi = componentState({
  component: "toast",
  states: toastStates,
  apply: (container, state) => {
    triggerStateChange15(container, state.name, state.config);
  },
  read: (container, state) => {
    return {
      name: container.dataset.stateName || "default",
      config: { ...state.config, count: dfDollar15(container).find(".toast").toArray().length }
    };
  },
  markup: (el, state) => applyMarkup13(el, state.name)
});
df$15.toastApi = toastApi;
df$15.toastStates = toastStates;
var DURATION = 4000;
var MAX_VISIBLE = 3;
var toastCallbacks = new WeakMap;
var toastContainer = dfDollar15("#toast-container").get(0);
if (!toastContainer) {
  toastContainer = document.createElement("div");
  toastContainer.id = "toast-container";
  toastContainer.className = "toast-container";
  toastContainer.setAttribute("aria-label", "Notifications");
  toastContainer.setAttribute("data-position", "bottom-right");
  dfDollar15(document.body).append(toastContainer);
}
var stackToasts = (container) => {
  const toasts = [...dfDollar15(container).find(".toast:not([data-leaving])").toArray()];
  const piled = container.dataset.stack === "pile" && !container.hasAttribute("data-expanded") && toasts.length > 1;
  const top = (container.dataset.position || "").startsWith("top");
  const sheets = top ? "stack-bottom" : "stack-top";
  let offset = 0;
  const order = container.dataset.stack === "pile" ? [...toasts].reverse() : toasts;
  order.forEach((t, i) => {
    const newest = i === 0;
    t.style.setProperty("--toast-stack", `${piled ? 0 : offset}px`);
    t.toggleAttribute("data-piled", piled && !newest);
    t.classList.toggle(sheets, piled && newest);
    if (piled && newest)
      t.dataset.more = String(toasts.length - 1);
    else
      delete t.dataset.more;
    if (!piled)
      offset += t.getBoundingClientRect().height + 8;
  });
};
var toastDismiss = (el, callback) => {
  if (!el || !el.parentNode || el.hasAttribute("data-leaving"))
    return;
  const container = el.parentNode;
  const out = el._animation?.out;
  if (out && anim[out]) {
    el.setAttribute("data-leaving", "");
    stackToasts(container);
    anim[out].play(el, { duration: el._animation.duration ?? 350, direction: el._animation.direction }).finished.then(() => {
      try {
        el.hidePopover();
      } catch {}
      dfDollar15(el).remove();
      stackToasts(container);
      if (callback)
        callback();
    });
    return;
  }
  el.animate([{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(0.5rem)" }], { duration: 200, easing: "ease", fill: "forwards" }).finished.then(() => {
    try {
      el.hidePopover();
    } catch {}
    dfDollar15(el).remove();
    stackToasts(container);
    if (callback)
      callback();
  });
};
var toastCreate = (options) => {
  const o = typeof options === "string" ? { title: options } : options;
  const { title, description, variant, action, onDismiss, size, density, animation, aura } = o;
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
    dfDollar15(contentEl).append(dfDollar15(icons[variant]));
  }
  const textDiv = document.createElement("div");
  textDiv.className = "toast-text";
  if (title) {
    const p = document.createElement("p");
    p.className = "toast-title";
    dfDollar15(p).text(title);
    dfDollar15(textDiv).append(p);
  }
  if (description) {
    const p = document.createElement("p");
    p.className = "toast-description";
    dfDollar15(p).text(description);
    dfDollar15(textDiv).append(p);
  }
  dfDollar15(contentEl).append(textDiv);
  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.dataset.toastClose = "";
  dfDollar15(closeBtn).html('<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>');
  dfDollar15(contentEl).append(closeBtn);
  let host = el;
  if (aura) {
    const style = aura === true ? "" : String(aura);
    el.classList.add("aura", "aura-md");
    if (style)
      el.classList.add(`aura-${style}`);
    el.dataset.aura = style || "default";
    host = document.createElement("div");
    host.className = "toast-surface";
    dfDollar15(el).append(host);
  }
  dfDollar15(host).append(contentEl);
  if (action) {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "toast-actions";
    const actionBtn = document.createElement("button");
    actionBtn.className = "btn";
    actionBtn.setAttribute("data-variant", "outline");
    actionBtn.setAttribute("data-size", "sm");
    actionBtn.dataset.toastAction = "";
    dfDollar15(actionBtn).text(action.label);
    dfDollar15(actionsDiv).append(actionBtn);
    dfDollar15(host).append(actionsDiv);
  }
  if (animation) {
    el._animation = typeof animation === "string" ? { in: animation } : animation;
    el.dataset.anim = "";
  }
  dfDollar15(toastContainer).append(el);
  el.showPopover();
  stackToasts(toastContainer);
  const inName = el._animation?.in;
  if (inName && anim[inName])
    anim[inName].play(el, { duration: el._animation.duration ?? 450, direction: el._animation.direction });
  toastCallbacks.set(el, { onDismiss, action });
  if (duration !== Infinity)
    setTimeout(() => {
      toastDismiss(el, onDismiss);
    }, duration);
  const toasts = dfDollar15(toastContainer).find(".toast").toArray();
  if (toasts.length > (toastContainer.dataset.stack === "pile" ? 6 : MAX_VISIBLE))
    toastDismiss(toasts[0]);
  return el;
};
function init15() {
  dfDollar15("#toast-container:not([data-init])").toArray().forEach((container) => {
    container.dataset.init = "";
    bindComponent(container, toastApi);
    const expand = (on) => {
      if (container.dataset.stack !== "pile")
        return;
      clearTimeout(container._collapse);
      if (on) {
        if (!container.hasAttribute("data-expanded")) {
          container.setAttribute("data-expanded", "");
          stackToasts(container);
        }
      } else {
        container._collapse = setTimeout(() => {
          container.removeAttribute("data-expanded");
          stackToasts(container);
        }, 250);
      }
    };
    container.addEventListener("pointerover", (e) => {
      if (e.target.closest(".toast"))
        expand(true);
    });
    container.addEventListener("pointerout", (e) => {
      if (!e.relatedTarget?.closest?.(".toast"))
        expand(false);
    });
    container.addEventListener("focusin", () => expand(true));
    container.addEventListener("focusout", (e) => {
      if (!e.relatedTarget?.closest?.(".toast"))
        expand(false);
    });
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
init15();
new MutationObserver(init15).observe(document.body, { childList: true, subtree: true });
var toastConfigure = (opts = {}) => {
  if (opts.stack)
    toastContainer.dataset.stack = opts.stack;
  if (opts.position)
    toastContainer.setAttribute("data-position", opts.position);
  stackToasts(toastContainer);
  return { stack: toastContainer.dataset.stack || "list", position: toastContainer.dataset.position };
};
var toastActions = {
  configure: toastConfigure,
  show: toastCreate,
  success: (options) => toastCreate(Object.assign(typeof options === "string" ? { title: options } : options, { variant: "success" })),
  warning: (options) => toastCreate(Object.assign(typeof options === "string" ? { title: options } : options, { variant: "warning" })),
  info: (options) => toastCreate(Object.assign(typeof options === "string" ? { title: options } : options, { variant: "info" })),
  error: (options) => toastCreate(Object.assign(typeof options === "string" ? { title: options } : options, { variant: "destructive" })),
  dismiss: () => {
    dfDollar15(toastContainer).find(".toast").toArray().forEach((el) => {
      toastDismiss(el);
    });
  }
};
df$15.toast = toastActions;

// src/components/toggle/toggle.ts
var df$16 = defussGlobals();
var dfDollar16 = defussQuery();
var toggleStates = ["default", "pressed"];
function applyMarkup14(toggle, stateName, defaultPressed) {
  dfDollar16(toggle).attr("aria-pressed", stateName === "pressed" ? "true" : defaultPressed);
}
function triggerStateChange16(toggle, stateName, _config) {
  applyMarkup14(toggle, stateName, toggle._defaultPressed ?? "false");
}
var toggleApi = componentState({
  component: "toggle",
  states: toggleStates,
  apply: (toggle, state) => triggerStateChange16(toggle, state.name, state.config),
  read: (toggle, state) => ({ name: dfDollar16(toggle).attr("aria-pressed") === "true" ? "pressed" : "default", config: state.config }),
  markup: (toggle, state) => {
    const authored = state.model.attrs.find(([name]) => name === "aria-pressed");
    applyMarkup14(toggle, state.name, authored ? authored[1] : "false");
  }
});
df$16.toggleApi = toggleApi;
df$16.toggleStates = toggleStates;
function init16() {
  dfDollar16(".toggle:not([data-init]):not(.toggle-group .toggle)").each((_i, toggle) => {
    dfDollar16(toggle).data("init", "");
    toggle._defaultPressed = dfDollar16(toggle).attr("aria-pressed") || "false";
    bindComponent(toggle, toggleApi, { name: toggle._defaultPressed === "true" ? "pressed" : "default", config: {} });
    dfDollar16(toggle).on("click", () => {
      dfDollar16(toggle).attr("aria-pressed", String(dfDollar16(toggle).attr("aria-pressed") !== "true"));
    });
  });
}
init16();
new MutationObserver(init16).observe(document, { childList: true, subtree: true });

// src/components/toggle-group/toggle-group.ts
var df$17 = defussGlobals();
var dfDollar17 = defussQuery();
var toggleGroupStates = ["default", "disabled"];
function applyMarkup15(el, stateName) {
  dfDollar17(el).attr("data-disabled", stateName === "disabled" ? "" : null);
}
function triggerStateChange17(group, stateName, _config) {
  switch (stateName) {
    case "default":
      group.removeAttribute("data-disabled");
      break;
    case "disabled":
      group.setAttribute("data-disabled", "");
      break;
  }
}
var toggleGroupApi = componentState({
  component: "toggle-group",
  states: toggleGroupStates,
  apply: (group, state) => triggerStateChange17(group, state.name, state.config),
  read: (group, state) => {
    return {
      name: group.hasAttribute("data-disabled") ? "disabled" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup15(el, state.name)
});
df$17.toggleGroupApi = toggleGroupApi;
df$17.toggleGroupStates = toggleGroupStates;
function init17() {
  dfDollar17(".toggle-group:not([data-init])").toArray().forEach((group) => {
    group.dataset.init = "";
    bindComponent(group, toggleGroupApi);
    const type = group.getAttribute("data-type") || "single";
    const getToggles = () => Array.from(dfDollar17(group).find(".toggle:not(:disabled)").toArray());
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
init17();
new MutationObserver(init17).observe(document, { childList: true, subtree: true });

//# debugId=9F7E80AAEBB58ABE64756E2164756E21
/* defuss-shadcn v0.9.5 runtime provenance: bundles defuss-morph@0.2.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599) + defuss-query@0.2.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599); full notice: NOTICE.txt */
//# sourceMappingURL=admin-dashboard.js.map
