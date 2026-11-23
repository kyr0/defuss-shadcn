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
// src/shared/math.ts
var MAX_BYTES = 2097152;
var MAX_TEX = 65536;
function mathClone(value, maxBytes = MAX_BYTES) {
  let nodes = 0;
  const path = new Set;
  const visit = (v, depth) => {
    if (++nodes > 20000 || depth > 96)
      throw new Error("math data exceeds the node or depth limit");
    if (v === null || typeof v === "string" || typeof v === "boolean")
      return;
    if (typeof v === "number") {
      if (!Number.isFinite(v))
        throw new Error("math data holds a non-finite number");
      return;
    }
    if (typeof v !== "object" || path.has(v))
      throw new Error("math data must be acyclic JSON");
    const proto = Object.getPrototypeOf(v);
    if (!Array.isArray(v) && proto !== Object.prototype && proto !== null)
      throw new Error("math data must hold plain objects");
    path.add(v);
    for (const [k, x] of Object.entries(v)) {
      if (k === "__proto__" || k === "prototype" || k === "constructor")
        throw new Error(`math data key "${k}"`);
      visit(x, depth + 1);
    }
    path.delete(v);
  };
  visit(value, 0);
  if (new TextEncoder().encode(JSON.stringify(value)).length > maxBytes)
    throw new Error("math data exceeds the size limit");
  return structuredClone(value);
}
function mathText(value) {
  if (typeof value !== "string" || new TextEncoder().encode(value).length > MAX_TEX)
    throw new Error("TeX must be a string of at most 65,536 bytes");
  return value;
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

// src/shared/media.ts
var TEXT_KINDS = ["subtitles", "captions", "descriptions"];
var num = (v, fallback) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
};
var pad = (n) => String(n).padStart(2, "0");
var esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var put = (el, name, value) => {
  if (el.getAttribute(name) !== value)
    defussQuery()(el).attr(name, value);
};
function mediaTime(seconds, total = seconds) {
  const s = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds + 0.000001) : 0;
  const h = Math.floor(s / 3600);
  const m = Math.floor(s % 3600 / 60);
  return h > 0 || Number.isFinite(total) && total >= 3600 ? `${h}:${pad(m)}:${pad(s % 60)}` : `${m}:${pad(s % 60)}`;
}
function mediaOf(root) {
  if (!root)
    return null;
  if (root instanceof HTMLMediaElement)
    return root;
  return defussQuery()(root).find("video, audio").get(0) ?? null;
}
function controlsOf(root, prefix, inside = true) {
  const $ = defussQuery();
  const sel = `[data-${prefix}-action], [data-${prefix}-output]`;
  const out = inside ? $(root).find(sel).toArray() : [];
  if (root.id)
    for (const bound of $(`[data-${prefix}-for="${CSS.escape(root.id)}"]`).toArray()) {
      if (bound.matches(sel))
        out.push(bound);
      out.push(...$(bound).find(sel).toArray());
    }
  return out;
}
function playerOf(control, prefix) {
  const near = control.closest(`[data-${prefix}-for], .${prefix}`);
  if (!near)
    return null;
  const id = near.getAttribute(`data-${prefix}-for`);
  if (id === null)
    return near;
  return defussQuery()(`#${CSS.escape(id)}`).get(0) ?? null;
}
function mediaRead(root) {
  const m = mediaOf(root);
  return {
    playing: !!m && !m.paused && !m.ended,
    config: {
      time: m ? m.currentTime : 0,
      duration: m && Number.isFinite(m.duration) ? m.duration : 0,
      rate: m ? m.playbackRate : 1,
      volume: m ? m.volume : 1,
      muted: m ? m.muted : false,
      captions: m ? shownKey(root, m) : ""
    }
  };
}
function shownKey(root, m) {
  if (root._mediaCaptions === false || !root._mediaTrack)
    return "";
  return mediaTextList(m).find((e) => e.track === root._mediaTrack)?.key ?? "";
}
function mediaTextTracks(media, tracks, owner, replace = true) {
  if (typeof VTTCue === "undefined")
    return [];
  const reg = media._mediaTexts ??= new Map;
  const retired = media._mediaRetired ??= new WeakSet;
  const wanted = (Array.isArray(tracks) ? tracks : []).filter((t) => t && t.id != null && Array.isArray(t.items));
  const ids = new Set(wanted.map((t) => String(t.id)));
  const empty = (k) => {
    for (const cue of k.cues)
      k.track.removeCue(cue);
    k.cues = [];
    if (k.track.mode !== "disabled")
      k.track.mode = "disabled";
  };
  if (replace) {
    for (const [key, k] of reg)
      if (k.owner === owner && !k.retired && !ids.has(key)) {
        empty(k);
        k.retired = true;
      }
  }
  const before = mediaTextList(media).some((e) => e.track.mode !== "disabled");
  const fresh = [];
  for (const t of wanted) {
    const key = String(t.id);
    const kind = TEXT_KINDS.includes(String(t.kind)) ? String(t.kind) : "subtitles";
    let k = reg.get(key);
    if (k && k.kind !== kind) {
      empty(k);
      retired.add(k.track);
      reg.delete(key);
      k = undefined;
    }
    if (k?.retired) {
      k.retired = false;
      fresh.push({ k, first: !!t.default });
    }
    if (k)
      k.owner = owner;
    else {
      k = {
        track: media.addTextTrack(kind, String(t.label ?? key), String(t.lang ?? "")),
        owner,
        kind,
        label: "",
        lang: "",
        cues: []
      };
      k.track.mode = "disabled";
      reg.set(key, k);
      fresh.push({ k, first: !!t.default });
    }
    k.label = String(t.label ?? key);
    k.lang = String(t.lang ?? "");
    for (const cue of k.cues)
      k.track.removeCue(cue);
    k.cues = [];
    for (const item of t.items) {
      const start = num(item?.start, NaN);
      const end = num(item?.end, NaN);
      const text = String(item?.text ?? item?.label ?? "");
      if (Number.isFinite(start) && Number.isFinite(end) && end > start && text) {
        const cue = new VTTCue(start, end, text);
        k.track.addCue(cue);
        k.cues.push(cue);
      }
    }
  }
  if (!before && fresh.length)
    (fresh.find((f) => f.first) ?? fresh[0]).k.track.mode = "showing";
  return [...ids];
}
function mediaTextList(media) {
  const reg = media._mediaTexts ?? new Map;
  const retired = media._mediaRetired;
  const keyOf = new Map;
  for (const [key, k] of reg)
    keyOf.set(k.track, key);
  const seen = new Set(reg.keys());
  const out = [];
  Array.from(media.textTracks).forEach((t, i) => {
    if (!TEXT_KINDS.includes(t.kind) || retired?.has(t))
      return;
    const keyed = keyOf.get(t);
    if (keyed !== undefined) {
      const k = reg.get(keyed);
      if (!k.retired)
        out.push({ key: keyed, kind: t.kind, label: k.label, lang: k.lang, track: t });
      return;
    }
    const base = t.id || t.language || t.label || `track-${i + 1}`;
    let key = base;
    for (let n = 2;seen.has(key); n++)
      key = `${base}-${n}`;
    seen.add(key);
    out.push({ key, kind: t.kind, label: t.label || key, lang: t.language, track: t });
  });
  return out;
}
function mediaMarkup(root, prefix, name, config, controls = defussQuery()(root).find(`[data-${prefix}-action]`).toArray()) {
  const $ = defussQuery();
  const pressed = (el, on) => put(el, "aria-pressed", on ? "true" : "false");
  for (const el of controls) {
    const action = el.getAttribute(`data-${prefix}-action`);
    if (action === "toggle")
      pressed(el, name === "playing");
    else if (action === "mute" && config.muted !== undefined)
      pressed(el, !!config.muted);
    else if (action === "captions" && config.captions !== undefined)
      pressed(el, config.captions !== "" && config.captions !== false);
    else if (action === "volume" && config.volume !== undefined && el instanceof HTMLInputElement) {
      put(el, "value", String(config.volume));
      if (el.value !== String(config.volume))
        el.value = String(config.volume);
    } else if (action === "rate" && config.rate !== undefined) {
      if (el instanceof HTMLSelectElement)
        for (const option of Array.from(el.options)) {
          const on = num(option.value, NaN) === config.rate;
          put(option, "selected", on ? "" : null);
          if (on && el.value !== option.value)
            el.value = option.value;
        }
      else if (el.hasAttribute("data-value"))
        pressed(el, num(el.getAttribute("data-value"), NaN) === config.rate);
    }
  }
  const media = root instanceof HTMLMediaElement ? root : $(root).find("video, audio").get(0);
  if (media && config.muted !== undefined)
    put(media, "muted", config.muted ? "" : null);
}
function paintCaptions(root, prefix) {
  const overlay = defussQuery()(root).find(`.${prefix}-captions`);
  if (!overlay.length)
    return;
  const track = root._mediaTrack;
  const t = mediaOf(root)?.currentTime ?? 0;
  const text = root._mediaCaptions !== false && track?.cues ? Array.from(track.cues).filter((c) => c.startTime <= t && t < c.endTime).map((c) => (c.text ?? "").replace(/<[^>]+>/g, "")).join(`
`) : "";
  if (overlay.text() !== text)
    overlay.text(text);
}
function takeCaptions(root, prefix) {
  const m = mediaOf(root);
  if (!m)
    return;
  const list = mediaTextList(m);
  const asked = root._mediaWanted ? list.find((e) => e.key === root._mediaWanted) : undefined;
  if (asked)
    root._mediaWanted = undefined;
  const showing = list.filter((e) => e.track.mode === "showing").pop();
  const chosen = asked ?? showing ?? list.find((e) => e.track === root._mediaTrack) ?? list[0];
  root._mediaTrack = chosen?.track;
  for (const e of list) {
    const mode = e === chosen && root._mediaCaptions !== false ? "hidden" : "disabled";
    if (e.track.mode !== mode)
      e.track.mode = mode;
  }
  const track = root._mediaTrack;
  if (track && !(root._mediaCued ??= new WeakSet).has(track)) {
    root._mediaCued.add(track);
    track.addEventListener("cuechange", () => paintCaptions(root, prefix));
  }
  paintCaptions(root, prefix);
  captionsMenus(root, prefix, list);
}
var menuLabels = (root) => ({
  off: "Off",
  subtitles: "Subtitles",
  descriptions: "Video captions",
  ...root._mediaLabels
});
var menuItem = (key, text, extra = "") => `<button class="dropdown-item dropdown-radio" role="menuitemradio" aria-checked="false" tabindex="-1" data-value="${esc(key)}">${esc(text)}${extra}</button>`;
function captionsMenus(root, prefix, list) {
  const $ = defussQuery();
  const shown = root._mediaCaptions === false ? "" : list.find((e) => e.track === root._mediaTrack)?.key ?? "";
  const labels = menuLabels(root);
  const heard = list.filter((e) => e.kind !== "descriptions");
  const seen = list.filter((e) => e.kind === "descriptions");
  let items = menuItem("", labels.off);
  for (const [name, entries] of [
    [labels.subtitles, heard],
    [labels.descriptions, seen]
  ]) {
    if (!entries.length)
      continue;
    items += '<div class="dropdown-separator" role="separator"></div>';
    items += entries.length === 1 ? menuItem(entries[0].key, name, `<span class="dropdown-shortcut">${esc(entries[0].label)}</span>`) : `<div class="dropdown-sub"><button class="dropdown-item dropdown-sub-trigger" role="menuitem" tabindex="-1">${esc(name)}<span class="dropdown-shortcut" data-${prefix}-menu-current></span></button><div class="dropdown-content dropdown-sub-content" role="menu" popover aria-label="${esc(name)}" data-size="sm">${entries.map((e) => menuItem(e.key, e.label)).join("")}</div></div>`;
  }
  for (const control of controlsOf(root, prefix)) {
    if (control.getAttribute(`data-${prefix}-action`) !== "captions")
      continue;
    let menu = control._mediaMenu;
    if (list.length < 2) {
      if (menu)
        for (const name of ["popovertarget", "aria-haspopup", "aria-controls", "aria-expanded"])
          put(control, name, null);
      continue;
    }
    if (!menu) {
      let id = `${control.id || root.id || prefix}-captions-menu`;
      for (let n = 2;$(`#${CSS.escape(id)}`).length; n++)
        id = `${control.id || root.id || prefix}-captions-menu-${n}`;
      menu = $(`<div class="dropdown-content" role="menu" popover id="${esc(id)}" data-size="sm" data-align="end" aria-label="${esc(control.getAttribute("aria-label") ?? "Captions")}"></div>`).get(0);
      control._mediaMenu = menu;
      const choose = (item) => {
        if (!item || !item.hasAttribute("data-value") || !root.api)
          return;
        const m = mediaOf(root);
        root.api.setState(m && !m.paused && !m.ended ? "playing" : "default", {
          captions: item.getAttribute("data-value") ?? ""
        });
        if (menu.matches(":popover-open"))
          menu.hidePopover();
      };
      menu.addEventListener("click", (e) => choose(e.target.closest('[role="menuitemradio"]')));
      menu.addEventListener("dropdown:select", (e) => choose(e.detail?.item));
      put(control, "data-dropdown-trigger", id);
      if (root.contains(control))
        $(root).append(menu);
      else
        $(control).after(menu);
    }
    put(control, "popovertarget", menu.id);
    if (control.hasAttribute("data-init")) {
      put(control, "aria-haspopup", "menu");
      put(control, "aria-controls", menu.id);
    }
    if (menu._mediaItems !== items) {
      menu._mediaItems = items;
      $(menu).html(items);
    }
    for (const item of $(menu).find('[role="menuitemradio"]').toArray())
      put(item, "aria-checked", item.getAttribute("data-value") === shown ? "true" : "false");
    for (const current of $(menu).find(`[data-${prefix}-menu-current]`).toArray()) {
      const sub = current.closest(".dropdown-sub");
      const on = sub ? $(sub).find('[role="menuitemradio"][aria-checked="true"]').get(0) : undefined;
      const text = on ? $(on).text() : "";
      if ($(current).text() !== text)
        $(current).text(text);
    }
  }
}
function mediaPaint(root, prefix) {
  const $ = defussQuery();
  const { playing, config } = mediaRead(root);
  const controls = controlsOf(root, prefix);
  mediaMarkup(root, prefix, playing ? "playing" : "default", config, controls);
  const total = mediaTime(config.duration);
  for (const el of controls) {
    const action = el.getAttribute(`data-${prefix}-action`);
    const output = el.getAttribute(`data-${prefix}-output`);
    if (action === "seek" && el instanceof HTMLInputElement) {
      if (config.duration > 0)
        put(el, "max", String(config.duration));
      put(el, "aria-valuetext", `${mediaTime(config.time, config.duration)} of ${total}`);
      if (!el._mediaDragging && Math.abs(num(el.value, 0) - config.time) > 0.05) {
        const slider = el.api;
        if (slider?.setState)
          slider.setState("default", { value: config.time });
        else
          el.value = String(config.time);
      }
    } else if (action === "fullscreen") {
      put(el, "aria-pressed", document.fullscreenElement === root ? "true" : "false");
    }
    if (output) {
      const text = output === "duration" ? total : output === "remaining" ? `-${mediaTime(config.duration - config.time, config.duration)}` : mediaTime(config.time, config.duration);
      if ($(el).text() !== text)
        $(el).text(text);
    }
  }
  paintCaptions(root, prefix);
}
function mediaApply(root, prefix, name, config, incoming) {
  const m = mediaOf(root);
  if ("captions" in incoming) {
    const v = incoming.captions;
    root._mediaCaptions = !(v === false || v === "" || v === null);
    root._mediaWanted = typeof v === "string" && v !== "" ? v : undefined;
    takeCaptions(root, prefix);
  }
  if (m) {
    const rate = num(incoming.rate, 0);
    if (rate > 0 && m.playbackRate !== rate)
      m.playbackRate = rate;
    if ("volume" in incoming) {
      const v = Math.min(1, Math.max(0, num(incoming.volume, m.volume)));
      if (m.volume !== v)
        m.volume = v;
    }
    if ("muted" in incoming && m.muted !== !!incoming.muted)
      m.muted = !!incoming.muted;
    if ("time" in incoming) {
      const end = Number.isFinite(m.duration) ? m.duration : Infinity;
      const t = Math.min(end, Math.max(0, num(incoming.time, m.currentTime)));
      if (Math.abs(m.currentTime - t) > 0.001)
        m.currentTime = t;
    }
  }
  mediaMarkup(root, prefix, name, config, controlsOf(root, prefix));
  if (!m)
    return;
  if (name === "playing" && m.paused)
    return m.play().then(() => {
      return;
    }, () => {
      return;
    });
  if (name !== "playing" && !m.paused)
    m.pause();
  return;
}
function mediaTracks(root, prefix, tracks, replace = false) {
  const m = mediaOf(root);
  if (!m)
    return [];
  const keys = mediaTextTracks(m, tracks, root, replace);
  takeCaptions(root, prefix);
  return keys;
}
function drive(root, prefix, control, event) {
  const api = root.api;
  const m = mediaOf(root);
  if (!api || !m)
    return;
  const now = m.paused || m.ended ? "default" : "playing";
  const action = control.getAttribute(`data-${prefix}-action`);
  const value = control.value;
  if (event.type === "click") {
    if (control instanceof HTMLInputElement || control instanceof HTMLSelectElement)
      return;
    if (action === "toggle")
      api.setState(now === "playing" ? "default" : "playing");
    else if (action === "play")
      api.setState("playing");
    else if (action === "pause")
      api.setState("default");
    else if (action === "skip")
      api.setState(now, { time: m.currentTime + num(control.getAttribute("data-value"), 0) });
    else if (action === "mute")
      api.setState(now, { muted: !m.muted });
    else if (action === "captions") {
      takeCaptions(root, prefix);
      if (!control.hasAttribute("popovertarget"))
        api.setState(now, { captions: root._mediaCaptions === false || !root._mediaTrack ? true : "" });
    } else if (action === "rate" && control.hasAttribute("data-value"))
      api.setState(now, { rate: num(control.getAttribute("data-value"), 1) });
    else if (action === "fullscreen") {
      if (document.fullscreenElement === root)
        document.exitFullscreen?.().catch(() => {
          return;
        });
      else
        root.requestFullscreen?.().catch(() => {
          return;
        });
    }
    return;
  }
  if (action === "seek" && control instanceof HTMLInputElement)
    api.setState(now, { time: num(value, 0) });
  else if (action === "volume" && control instanceof HTMLInputElement) {
    const v = num(value, 1);
    api.setState(now, v > 0 && m.muted ? { volume: v, muted: false } : { volume: v });
  } else if (action === "rate" && control instanceof HTMLSelectElement)
    api.setState(now, { rate: num(value, 1) });
}
function delegate(prefix) {
  const flag = `__${prefix}MediaInit`;
  if (document[flag])
    return;
  document[flag] = true;
  const handle = (event) => {
    const control = event.target?.closest?.(`[data-${prefix}-action]`);
    const root = control && playerOf(control, prefix);
    if (control && root)
      drive(root, prefix, control, event);
  };
  document.addEventListener("click", handle);
  document.addEventListener("input", handle);
  document.addEventListener("change", (event) => {
    if (event.target instanceof HTMLInputElement)
      event.target._mediaDragging = false;
  });
  document.addEventListener("pointerdown", (event) => {
    const t = event.target?.closest?.(`input[data-${prefix}-action="seek"]`);
    if (t)
      t._mediaDragging = true;
  });
  document.addEventListener("pointerup", () => {
    for (const t of defussQuery()(`input[data-${prefix}-action="seek"]`).toArray())
      t._mediaDragging = false;
  });
}
function bindMedia(root, prefix, report) {
  const $ = defussQuery();
  const m = mediaOf(root);
  const own = $(root).find(`[data-${prefix}-action]`).toArray();
  const captions = own.find((el) => el.getAttribute(`data-${prefix}-action`) === "captions");
  root._mediaCaptions = captions ? captions.getAttribute("aria-pressed") !== "false" : true;
  const source = $(root).find(`script.${prefix}-tracks`).get(0);
  if (m && source) {
    let data = null;
    try {
      data = JSON.parse($(source).text() || "null");
    } catch {
      data = null;
    }
    if (data && typeof data === "object") {
      if (data.labels && typeof data.labels === "object")
        root._mediaLabels = { ...data.labels };
      mediaTextTracks(m, data.tracks ?? [], root);
    }
  }
  for (const el of controlsOf(root, prefix))
    if (el.getAttribute(`data-${prefix}-action`) === "fullscreen" && !document.fullscreenEnabled)
      put(el, "hidden", "");
  if (m) {
    const volume = own.find((el) => el.getAttribute(`data-${prefix}-action`) === "volume");
    if (volume)
      m.volume = Math.min(1, Math.max(0, num(volume.getAttribute("value"), 1)));
    const rate = own.find((el) => el instanceof HTMLSelectElement && el.getAttribute(`data-${prefix}-action`) === "rate");
    if (rate && num(rate.value, 0) > 0)
      m.playbackRate = num(rate.value, 1);
    const changed = () => {
      mediaPaint(root, prefix);
      report();
    };
    for (const type of [
      "play",
      "pause",
      "ended",
      "timeupdate",
      "seeking",
      "seeked",
      "volumechange",
      "ratechange",
      "loadedmetadata",
      "durationchange",
      "emptied"
    ])
      m.addEventListener(type, changed);
    m.textTracks.addEventListener("addtrack", () => takeCaptions(root, prefix));
    $(m).find("track").on("load", () => paintCaptions(root, prefix));
    m.textTracks.addEventListener("change", () => takeCaptions(root, prefix));
    takeCaptions(root, prefix);
    if (m instanceof HTMLVideoElement)
      m.addEventListener("click", () => {
        if (m.controls || !root.api)
          return;
        root.api.setState(m.paused || m.ended ? "playing" : "default");
      });
  }
  root.addEventListener("fullscreenchange", () => mediaPaint(root, prefix));
  delegate(prefix);
  mediaPaint(root, prefix);
}
// src/shared/editors.ts
var isObject = (v) => v !== null && typeof v === "object";
function valueType(value, rules) {
  if (rules?.type)
    return rules.type;
  if (rules?.options)
    return "enum";
  if (value === null)
    return "null";
  if (Array.isArray(value))
    return "array";
  if (typeof value === "object")
    return "object";
  if (typeof value === "boolean")
    return "boolean";
  if (typeof value === "number")
    return "number";
  if (typeof value === "string") {
    if (/^#[0-9a-f]{6}$/i.test(value))
      return "color";
    if (/^\d{4}-\d{2}-\d{2}$/.test(value))
      return "date";
    if (value.includes(`
`))
      return "text";
  }
  return "string";
}
function builtinEditor(type, value, rules, options = {}) {
  const dfDollar = defussQuery();
  const size = options.size ?? "xs";
  if (type === "boolean") {
    const el = document.createElement("input");
    el.type = "checkbox";
    el.className = "switch";
    el.setAttribute("role", "switch");
    el.checked = !!value;
    return { el, getValue: () => el.checked, immediate: true };
  }
  if (type === "enum") {
    const el = document.createElement("select");
    el.className = "select";
    el.dataset.size = size;
    const choices = rules?.options ?? [];
    for (const opt of choices) {
      const o = document.createElement("option");
      const [v, label] = isObject(opt) ? [opt.value, opt.label ?? opt.value] : [opt, opt];
      o.value = String(v);
      dfDollar(o).text(String(label));
      if (v === value)
        o.selected = true;
      el.append(o);
    }
    const values = choices.map((o) => isObject(o) ? o.value : o);
    return { el, getValue: () => values.find((v) => String(v) === el.value) ?? el.value, immediate: true };
  }
  if (type === "text" || type === "object" || type === "array" || type === "json") {
    const el = document.createElement("textarea");
    el.className = "textarea";
    el.rows = type === "text" ? 3 : 5;
    const json = type !== "text";
    el.value = json ? JSON.stringify(value, null, 2) : String(value ?? "");
    return {
      el,
      multiline: true,
      getValue: () => json ? JSON.parse(el.value) : el.value,
      validate: () => {
        if (!json)
          return "";
        try {
          JSON.parse(el.value);
          return "";
        } catch (error) {
          return String(error.message ?? error);
        }
      }
    };
  }
  const el = document.createElement("input");
  el.className = type === "color" ? options.colorClass ?? "" : "input";
  if (type !== "color")
    el.dataset.size = size;
  el.type = type === "number" ? "number" : type === "color" ? "color" : type === "date" ? "date" : "text";
  if (type === "number") {
    el.step = String(rules?.step ?? "any");
    if (rules?.min != null)
      el.min = String(rules.min);
    if (rules?.max != null)
      el.max = String(rules.max);
    el.inputMode = "decimal";
  }
  el.value = value == null ? "" : String(value);
  return {
    el,
    immediate: type === "color" || type === "date",
    getValue: () => type === "number" ? el.value === "" ? null : el.valueAsNumber : type === "null" && el.value === "" ? null : el.value,
    validate: () => type === "number" && el.value !== "" && Number.isNaN(el.valueAsNumber) ? "not a number" : el.validity && !el.validity.valid ? el.validationMessage : ""
  };
}
function asEditor(custom) {
  if (!custom)
    return null;
  if (custom instanceof HTMLElement) {
    const el = custom;
    return {
      el,
      immediate: el.type === "checkbox" || el.tagName === "SELECT",
      getValue: () => el.type === "checkbox" ? el.checked : el.type === "number" || el.type === "range" ? el.valueAsNumber : el.value
    };
  }
  if (isObject(custom) && custom.el instanceof HTMLElement && typeof custom.getValue === "function")
    return custom;
  return null;
}
function editorControl(editor) {
  const sel = "input, select, textarea, button, [tabindex]";
  return editor.el.matches?.(sel) ? editor.el : defussQuery()(editor.el).find(sel).get(0) ?? editor.el;
}
function focusEditor(editor) {
  const target = editorControl(editor);
  (editor.focus ?? (() => target.focus?.()))();
  if (target.select && !["checkbox", "color", "date", "range"].includes(target.type))
    target.select();
}
function editorProblem(rules, value) {
  if (!rules)
    return "";
  const say = (fallback) => rules.message || fallback;
  const empty = value === null || value === undefined || value === "" || Array.isArray(value) && !value.length;
  if (rules.required && empty)
    return say("Required");
  if (empty)
    return "";
  if (typeof value === "number") {
    if (Number.isNaN(value))
      return say("Not a number");
    if (rules.integer && !Number.isInteger(value))
      return say("Must be a whole number");
    if (rules.min != null && value < rules.min)
      return say(`Must be at least ${rules.min}`);
    if (rules.max != null && value > rules.max)
      return say(`Must be at most ${rules.max}`);
  }
  if (typeof value === "string") {
    if (rules.minLength != null && value.length < rules.minLength)
      return say(`At least ${rules.minLength} characters`);
    if (rules.maxLength != null && value.length > rules.maxLength)
      return say(`At most ${rules.maxLength} characters`);
    if (rules.pattern && !new RegExp(`^(?:${rules.pattern})$`).test(value))
      return say("Does not match the expected format");
  }
  if (Array.isArray(value)) {
    if (rules.minItems != null && value.length < rules.minItems)
      return say(`At least ${rules.minItems}`);
    if (rules.maxItems != null && value.length > rules.maxItems)
      return say(`At most ${rules.maxItems}`);
  }
  return "";
}
function editorKey(e, editor) {
  if (e.key === "Escape")
    return "cancel";
  if (e.key === "Enter" && (!(editor.multiline || editor.ownsEnter) || e.metaKey || e.ctrlKey))
    return "commit";
  if (e.key === "Tab")
    return e.shiftKey ? "prev" : "next";
  return null;
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
      return [{ clipPath: `circle(0% at ${origin})` }, { clipPath: `circle(150% at ${origin})` }];
    case "irisOut":
      return [{ clipPath: `circle(150% at ${origin})` }, { clipPath: `circle(0% at ${origin})` }];
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
function settleTemplates(root, markup) {
  if (!markup.includes("<template"))
    return;
  const $ = defussQuery();
  const parsed = $(new DOMParser().parseFromString(markup, "text/html").body).find("template").toArray();
  $(root).find("template").toArray().forEach((t, i) => {
    if (parsed[i])
      t.content.replaceChildren(document.importNode(parsed[i].content, true));
  });
}
function renderModel(model, apply) {
  const $ = defussQuery();
  const node = $(`<${model.tag}></${model.tag}>`);
  for (const [name, value] of model.attrs)
    node.attr(name, value);
  node.html(model.html);
  const host = $("<div></div>").append(node);
  const el = node.get(0);
  if (el)
    settleTemplates(el, model.html);
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
  return areas[area] ??= createWebStorage(area, {
    fallback: createMemoryStorage(),
    onUnavailable: () => inMemory.add(area)
  });
}
function storageAvailable(area = "local") {
  try {
    storageOf(area).getItem("defuss-store:probe");
  } catch {
    return false;
  }
  return !inMemory.has(area);
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
// node_modules/defuss-dataview/dist/query-B6HEkalB.mjs
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
  const own = (value, key) => typeof value === "object" && value !== null && Object.hasOwn(value, key) ? value[key] : undefined;
  const [a, b, c, d] = parts;
  if (parts.length === 2)
    return (row) => own(own(row, a), b);
  if (parts.length === 3)
    return (row) => own(own(own(row, a), b), c);
  if (parts.length === 4)
    return (row) => own(own(own(own(row, a), b), c), d);
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
var details = /* @__PURE__ */ new WeakMap;
function registerQueryDetails(query, value) {
  details.set(query, value);
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
function bytesOf(value) {
  if (value instanceof ArrayBuffer)
    return new Uint8Array(value);
  if (ArrayBuffer.isView(value))
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  return;
}
var invalidValue = (value) => value == null || typeof value === "number" && Number.isNaN(value) || value instanceof Date && Number.isNaN(value.getTime());
var rank = (v) => v == null ? 9 : invalidValue(v) ? 8 : typeof v === "boolean" ? 0 : typeof v === "number" ? 1 : typeof v === "bigint" ? 2 : typeof v === "string" ? 3 : v instanceof Date ? 4 : v instanceof ArrayBuffer || ArrayBuffer.isView(v) ? 5 : Array.isArray(v) ? 6 : 7;
var CYCLE = "An array that contains itself cannot be compared or used as a key.";
var open = [];
function enter(a, b) {
  if (open.includes(a) || open.includes(b))
    throw new TypeError(CYCLE);
  open.push(a, b);
}
function normalizeSemantics(options) {
  createValueOperations(options);
  const copy = {};
  if (options.equality !== undefined)
    copy.equality = options.equality;
  if (options.strings !== undefined)
    copy.strings = options.strings;
  if (options.locale !== undefined)
    copy.locale = Array.isArray(options.locale) ? Object.freeze([...options.locale]) : options.locale;
  if (options.collatorOptions !== undefined)
    copy.collatorOptions = Object.freeze({ ...options.collatorOptions });
  return Object.freeze(copy);
}
function createValueOperations(options = {}) {
  if (options === null || typeof options !== "object" || Array.isArray(options))
    throw new TypeError("semantics must be an object.");
  if (options.equality !== undefined && !["value", "identity"].includes(options.equality))
    throw new TypeError("Invalid equality semantics.");
  if (options.strings !== undefined && !["code-unit", "locale"].includes(options.strings))
    throw new TypeError("Invalid string semantics.");
  if (options.strings !== "locale" && (options.locale !== undefined || options.collatorOptions !== undefined))
    throw new TypeError("Locale options require strings: locale.");
  const collator = options.strings === "locale" ? new Intl.Collator(options.locale, options.collatorOptions) : undefined;
  const equality = options.equality ?? "value";
  const comparisonId = `dataview-order-v2:${collator ? JSON.stringify(collator.resolvedOptions()) : "code-unit"}`;
  function equal(a, b) {
    if (a === b || typeof a === "number" && typeof b === "number" && Number.isNaN(a) && Number.isNaN(b))
      return true;
    if (equality === "identity")
      return false;
    if (a instanceof Date && b instanceof Date)
      return Object.is(a.getTime(), b.getTime());
    if (Array.isArray(a))
      return Array.isArray(b) && a.length === b.length && equalLists(a, b);
    const ab = bytesOf(a), bb = bytesOf(b);
    if (!ab || !bb || ab.length !== bb.length)
      return false;
    for (let i = 0;i < ab.length; i++)
      if (ab[i] !== bb[i])
        return false;
    return true;
  }
  function compare(a, b) {
    if (a === b || Object.is(a, b))
      return 0;
    if (typeof a === "number" && typeof b === "number")
      return Number.isNaN(a) ? 1 : Number.isNaN(b) ? -1 : a < b ? -1 : 1;
    if (typeof a === "string" && typeof b === "string")
      return collator ? collator.compare(a, b) : a < b ? -1 : 1;
    if (typeof a === "bigint" && typeof b === "bigint")
      return a < b ? -1 : 1;
    const ar = rank(a), br = rank(b);
    if (ar !== br)
      return ar - br;
    if (ar >= 7)
      return 0;
    if (ar === 6)
      return compareLists(a, b);
    if (a instanceof Date && b instanceof Date)
      return a.getTime() < b.getTime() ? -1 : a.getTime() > b.getTime() ? 1 : 0;
    const ab = bytesOf(a), bb = bytesOf(b);
    if (ab && bb) {
      for (let i = 0;i < Math.min(ab.length, bb.length); i++)
        if (ab[i] !== bb[i])
          return ab[i] - bb[i];
      return ab.length - bb.length;
    }
    return a < b ? -1 : 1;
  }
  function equalLists(a, b) {
    enter(a, b);
    try {
      for (let i = 0;i < a.length; i++)
        if (!equal(a[i], b[i]))
          return false;
      return true;
    } finally {
      open.length -= 2;
    }
  }
  function compareLists(a, b) {
    enter(a, b);
    try {
      for (let i = 0, n = Math.min(a.length, b.length);i < n; i++) {
        const c = compare(a[i], b[i]);
        if (c)
          return c;
      }
      return Math.sign(a.length - b.length);
    } finally {
      open.length -= 2;
    }
  }
  return { equal, compare, comparisonId, equality };
}
var compareValues = createValueOperations().compare;
function snapshot(value, byValue, seen = []) {
  if (!byValue || typeof value !== "object" || value === null)
    return value;
  if (value instanceof Date)
    return new Date(value.getTime());
  const bytes = bytesOf(value);
  if (bytes)
    return bytes.slice();
  if (!Array.isArray(value))
    return value;
  if (seen.includes(value))
    throw new TypeError(CYCLE);
  seen.push(value);
  const copy = value.map((v) => snapshot(v, true, seen));
  seen.pop();
  return copy;
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
  return { filters, sorters, page, pageSize, idField, meta: normalizeMeta(request.meta), tree, semantics: request.semantics === undefined ? undefined : normalizeSemantics(request.semantics) };
}
var operand = snapshot;
function compileQuery(request = {}) {
  const view = createDataview({ filters: request.filters, sorters: request.sorters });
  const ops = createValueOperations(request.semantics);
  const captured = view.filters;
  const filters = view.filters.map((filter) => {
    const get = compileAccessor(filter.field), op = filter.op;
    const value = operand(filter.value, ops.equality === "value");
    const members = op === "in" && Array.isArray(value) ? value.map((v) => operand(v, ops.equality === "value")) : undefined;
    filter.value = value;
    if (op === "in")
      filter.members = members;
    const set = members && members.length > 16 && members.every((v) => v === null || typeof v !== "object") ? new Set(members) : undefined;
    const primitive = value === null || typeof value !== "object";
    const equal = primitive ? (cell) => cell === value || typeof value === "number" && Number.isNaN(value) && typeof cell === "number" && Number.isNaN(cell) : (cell) => ops.equal(cell, value);
    const valid = primitive ? !invalidValue(value) : undefined;
    const range = (cell) => {
      if (!(valid ?? !invalidValue(value)) || invalidValue(cell))
        return;
      return ops.compare(cell, value);
    };
    switch (op) {
      case "eq":
        return (row) => equal(get(row));
      case "neq":
        return (row) => !equal(get(row));
      case "gt":
        return (row) => {
          const c = range(get(row));
          return c !== undefined && c > 0;
        };
      case "gte":
        return (row) => {
          const c = range(get(row));
          return c !== undefined && c >= 0;
        };
      case "lt":
        return (row) => {
          const c = range(get(row));
          return c !== undefined && c < 0;
        };
      case "lte":
        return (row) => {
          const c = range(get(row));
          return c !== undefined && c <= 0;
        };
      case "in":
        return (row) => {
          const cell = get(row);
          return set ? set.has(cell) : members?.some((v) => ops.equal(cell, v)) ?? false;
        };
      case "contains":
        return (row) => {
          const cell = get(row);
          return typeof cell === "string" && typeof value === "string" ? cell.includes(value) : Array.isArray(cell) && cell.some((v) => ops.equal(v, value));
        };
      case "startsWith":
        return (row) => {
          const cell = get(row);
          return typeof cell === "string" && typeof value === "string" && cell.startsWith(value);
        };
      case "endsWith":
        return (row) => {
          const cell = get(row);
          return typeof cell === "string" && typeof value === "string" && cell.endsWith(value);
        };
    }
  });
  const sorters = view.sorters.map((s) => ({ get: compileAccessor(s.field), sign: s.direction === "desc" ? -1 : 1 }));
  const [f0, f1, f2, f3] = filters;
  const matches = filters.length === 1 ? f0 : filters.length === 2 ? (row) => f0(row) && f1(row) : filters.length === 3 ? (row) => f0(row) && f1(row) && f2(row) : filters.length === 4 ? (row) => f0(row) && f1(row) && f2(row) && f3(row) : (row) => {
    for (const f of filters)
      if (!f(row))
        return false;
    return true;
  };
  const comparisons = sorters.length >= 2 && sorters.length <= 4 ? sorters.map((s) => (left, right) => {
    const result = ops.compare(s.get(left), s.get(right));
    return result ? result * s.sign : 0;
  }) : [];
  const [c0, c1, c2, c3] = comparisons;
  const compare = sorters.length === 1 ? (a, b) => {
    const result = ops.compare(sorters[0].get(a), sorters[0].get(b));
    return result ? result * sorters[0].sign : 0;
  } : comparisons.length === 2 ? (a, b) => c0(a, b) || c1(a, b) : comparisons.length === 3 ? (a, b) => c0(a, b) || c1(a, b) || c2(a, b) : comparisons.length === 4 ? (a, b) => c0(a, b) || c1(a, b) || c2(a, b) || c3(a, b) : (a, b) => {
    for (const s of sorters) {
      const result = ops.compare(s.get(a), s.get(b));
      if (result)
        return result * s.sign;
    }
    return 0;
  };
  const compiled = Object.freeze({
    ordering: Object.freeze({ comparisonId: ops.comparisonId, sorters: Object.freeze(view.sorters.map((s) => Object.freeze({ field: s.field, direction: s.direction }))) }),
    hasFilters: filters.length > 0,
    matches,
    compare
  });
  registerQueryDetails(compiled, { compareValues: ops.compare, filters: captured });
  return compiled;
}
// node_modules/defuss-dataview/dist/heap-B_Bk5TE1.mjs
class TopK {
  constructor(capacity, compare) {
    this.capacity = capacity;
    this.compare = compare;
  }
  capacity;
  compare;
  items = [];
  addAccepted(value) {
    if (this.capacity === Infinity) {
      this.items.push(value);
      return;
    }
    if (this.items.length < this.capacity) {
      let index2 = this.items.length;
      this.items.push(value);
      while (index2 > 0) {
        const parent = Math.floor((index2 - 1) / 2);
        if (this.compare(this.items[parent], value) >= 0)
          break;
        this.items[index2] = this.items[parent];
        index2 = parent;
      }
      this.items[index2] = value;
      return;
    }
    const evicted = this.items[0];
    let index = 0;
    while (index * 2 + 1 < this.items.length) {
      let child = index * 2 + 1;
      if (child + 1 < this.items.length && this.compare(this.items[child + 1], this.items[child]) > 0)
        child++;
      if (this.compare(value, this.items[child]) >= 0)
        break;
      this.items[index] = this.items[child];
      index = child;
    }
    this.items[index] = value;
    return evicted;
  }
}

// node_modules/defuss-dataview/dist/index.mjs
function evaluateTree(rows, view) {
  const tree = view.tree;
  const getId = compileAccessor(tree.idField), getParent = compileAccessor(tree.parentIdField);
  const ids = rows.map((row) => getId(row));
  const keys = ids.map((id) => typeof id === "number" && Number.isFinite(id) ? undefined : rowIdKey(id));
  const keyAt = (index) => keys[index] ?? (typeof ids[index] === "number" ? JSON.stringify(ids[index]) : undefined);
  const parents = rows.map((row) => getParent(row));
  const byId = /* @__PURE__ */ new Map, byNumber = /* @__PURE__ */ new Map;
  for (let index = rows.length - 1;index >= 0; index--) {
    const id = ids[index];
    if (typeof id === "number")
      byNumber.set(id, index);
    else {
      const key = keys[index];
      if (key !== undefined)
        byId.set(key, index);
    }
  }
  const parentIndex = new Int32Array(rows.length);
  for (let index = 0;index < rows.length; index++) {
    const value = parents[index];
    let parent = -1;
    if (typeof value === "number" && Number.isFinite(value))
      parent = byNumber.get(value) ?? -1;
    else {
      const key = rowIdKey(value);
      if (key !== undefined)
        parent = byId.get(key) ?? -1;
    }
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
  const children = rows.map(() => {
    return;
  });
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
    const stack = [];
    for (let index = 0;index < rows.length; index++) {
      if (!matched[index] || done[index])
        continue;
      stack.push(index);
      while (stack.length) {
        const node = stack.pop();
        if (done[node])
          continue;
        done[node] = 1;
        included[node] = 1;
        for (const child of children[node] ?? [])
          stack.push(child);
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
  const stackIndex = new Int32Array(rows.length), stackDepth = new Int32Array(rows.length);
  let top = 0;
  for (let index = roots.length - 1;index >= 0; index--) {
    stackIndex[top] = roots[index];
    stackDepth[top++] = 0;
  }
  const anyCollapsed = collapsed.size > 0;
  while (top) {
    const index = stackIndex[--top], depth = stackDepth[top];
    const group = children[index];
    const hasChildren = !!group?.length;
    let isOpen = all;
    if (!all || anyCollapsed) {
      const key = keyAt(index);
      isOpen = all ? key === undefined || !collapsed.has(key) : key !== undefined && expanded.has(key);
    }
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
      for (let child = group.length - 1;child >= 0; child--) {
        stackIndex[top] = group[child];
        stackDepth[top++] = depth + 1;
      }
  }
  return { entries, matchedRows, visibleRows };
}
function flatPage(rows, query, end) {
  const sample = [];
  let next = 0, reverse = true, strict = false;
  while (next < rows.length && sample.length < 32) {
    const row = rows[next++];
    if (!query.matches(row))
      continue;
    if (sample.length) {
      const c = query.compare(sample[sample.length - 1], row);
      reverse &&= c >= 0;
      strict ||= c > 0;
    }
    sample.push(row);
  }
  if (reverse && strict) {
    for (;next < rows.length; next++)
      if (query.matches(rows[next]))
        sample.push(rows[next]);
    const total2 = sample.length;
    sample.sort(query.compare);
    return { rows: sample.slice(0, end), total: total2 };
  }
  const compare = (a, b) => query.compare(a.row, b.row) || a.ordinal - b.ordinal;
  const heap = new TopK(end, compare);
  let total = 0;
  const add = (row) => {
    const ordinal = total++;
    if (heap.items.length < end)
      heap.addAccepted({ row, ordinal });
    else if (query.compare(row, heap.items[0].row) < 0) {
      const candidate = heap.items[0];
      candidate.row = row;
      candidate.ordinal = ordinal;
      heap.addAccepted(candidate);
    }
  };
  for (const row of sample)
    add(row);
  for (;next < rows.length; next++)
    if (query.matches(rows[next]))
      add(rows[next]);
  heap.items.sort(compare);
  return { rows: heap.items.map((c) => c.row), total };
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
  if (view.sorters.length && rows.length >= 1024 && end <= rows.length / 16) {
    const result = flatPage(rows, query, end);
    matchedRows = offset;
    for (let i = offset;i < result.rows.length; i++)
      append(result.rows[i]);
    matchedRows = result.total;
  } else if (view.sorters.length || !view.filters.length) {
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
  let matchRows = [];
  let branches = null;
  let aggKey = "";
  let aggCache = null;
  const matching = (filters) => {
    const key = JSON.stringify(filters);
    if (matchIds && key === matchKey)
      return matchIds;
    const tests = filters.map(predicate);
    const ids = [];
    const hits = [];
    for (const row of current)
      if (tests.every((t) => t(row))) {
        ids.push(row[idField]);
        hits.push(row);
      }
    matchKey = key;
    matchIds = ids;
    matchRows = hits;
    return ids;
  };
  const activeFilters = (q = {}) => (q.filters ?? []).filter((f) => f && f.field && f.value !== "" && f.value != null);
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
      const filters = activeFilters(q);
      const filtering = filters.length > 0;
      const view = createDataview({
        idField,
        semantics: { strings: "locale" },
        sorters: q.sorters ?? [],
        filters: filtering ? [{ field: idField, op: "in", value: matching(filters) }] : [],
        tree: options.tree ? {
          ...options.tree,
          includeAncestors: true,
          ...filtering ? { expandAll: true, collapsedIds: q.collapsed ?? [] } : { expandedIds: q.expanded ?? [] }
        } : undefined
      });
      const result = evaluateDataview(current, view);
      cache = {
        entries: result.entries,
        totalRows: result.totalRows,
        matchedRows: result.matchedRows,
        visibleRows: result.visibleRows
      };
      cacheKey = key;
      return cache;
    },
    setRows(next) {
      current = next;
      cache = null;
      cacheKey = "";
      matchIds = null;
      matchRows = [];
      branches = null;
      aggCache = null;
      aggKey = "";
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
    },
    aggregate(q, spec) {
      const filters = activeFilters(q);
      const key = JSON.stringify([filters, spec]);
      if (aggCache && key === aggKey)
        return aggCache;
      let rows = current;
      if (filters.length) {
        matching(filters);
        rows = matchRows;
      }
      aggCache = { rows: aggregate(rows, spec), matchedRows: rows.length, totalRows: current.length };
      aggKey = key;
      return aggCache;
    }
  };
}
var UNIT_MS = { minute: 60000, hour: 3600000, day: 86400000, week: 604800000 };
function valueAt(row, path) {
  if (!path.includes("."))
    return Object.hasOwn(row, path) ? row[path] : undefined;
  let v = row;
  for (const part of path.split(".")) {
    if (v == null || typeof v !== "object" || !Object.hasOwn(v, part))
      return;
    v = v[part];
  }
  return v;
}
function timeOf(v) {
  if (typeof v === "number")
    return v;
  if (v instanceof Date)
    return v.getTime();
  if (typeof v === "string" && v)
    return Date.parse(v);
  return Number.NaN;
}
function unitStart(ms, unit) {
  const fixed = UNIT_MS[unit];
  if (unit === "week")
    return Math.floor((ms - 4 * 86400000) / fixed) * fixed + 4 * 86400000;
  if (fixed)
    return Math.floor(ms / fixed) * fixed;
  const d = new Date(ms);
  return unit === "month" ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), 1) : Date.UTC(d.getUTCFullYear(), 0, 1);
}
function unitNext(ms, unit) {
  const fixed = UNIT_MS[unit];
  if (fixed)
    return ms + fixed;
  const d = new Date(ms);
  return unit === "month" ? Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 1) : Date.UTC(d.getUTCFullYear() + 1, 0, 1);
}
function keyFn(group) {
  const { field, bucket } = group;
  if (bucket === undefined)
    return (row) => valueAt(row, field) ?? null;
  if (typeof bucket === "number") {
    if (!(bucket > 0))
      throw new RangeError("aggregate: a numeric bucket must be a positive width");
    return (row) => {
      const v = valueAt(row, field);
      return typeof v === "number" && Number.isFinite(v) ? Math.floor(v / bucket) * bucket : null;
    };
  }
  if (!["minute", "hour", "day", "week", "month", "year"].includes(bucket))
    throw new RangeError(`aggregate: unknown time bucket "${bucket}"`);
  return (row) => {
    const t = timeOf(valueAt(row, field));
    return Number.isFinite(t) ? unitStart(t, bucket) : null;
  };
}
var compare = (a, b) => {
  if (a === b)
    return 0;
  if (a == null)
    return 1;
  if (b == null)
    return -1;
  if (typeof a === "number" && typeof b === "number")
    return a - b;
  return String(a).localeCompare(String(b));
};
function aggregate(rows, spec = {}) {
  const groups = (spec.groupBy === undefined ? [] : Array.isArray(spec.groupBy) ? spec.groupBy : [spec.groupBy]).map((g) => typeof g === "string" ? { field: g } : g);
  const measures = spec.measures?.length ? spec.measures : [{ op: "count" }];
  for (const m of measures)
    if (m.op !== "count" && !m.field)
      throw new TypeError(`aggregate: the measure "${m.op}" needs a field`);
  const keyNames = groups.map((g) => g.as ?? g.field);
  const measureNames = measures.map((m) => m.as ?? (m.op === "count" ? "count" : m.op + "_" + m.field));
  const keys = groups.map(keyFn);
  const fresh = (k) => ({
    keys: k,
    count: 0,
    m: measures.map((m) => m.op === "distinct" ? new Set : [0, 0, Infinity, -Infinity])
  });
  const add = (acc, row) => {
    acc.count++;
    for (let j = 0;j < measures.length; j++) {
      const m = measures[j];
      if (m.op === "count")
        continue;
      const v = valueAt(row, m.field);
      const slot = acc.m[j];
      if (slot instanceof Set) {
        if (v != null)
          slot.add(v);
        continue;
      }
      if (typeof v !== "number" || !Number.isFinite(v))
        continue;
      slot[0] += v;
      slot[1]++;
      if (v < slot[2])
        slot[2] = v;
      if (v > slot[3])
        slot[3] = v;
    }
  };
  const map = new Map;
  const single = keys.length === 1 ? keys[0] : null;
  for (const row of rows) {
    let acc;
    if (single) {
      const k = single(row);
      acc = map.get(k);
      if (!acc)
        map.set(k, acc = fresh([k]));
    } else {
      const ks = keys.map((f) => f(row));
      const id = keys.length ? JSON.stringify(ks) : "";
      acc = map.get(id);
      if (!acc)
        map.set(id, acc = fresh(ks));
    }
    add(acc, row);
  }
  const g0 = groups[0];
  if (spec.fill && groups.length === 1 && g0.bucket !== undefined && map.size > 1) {
    const present = [...map.keys()].filter((k) => typeof k === "number");
    if (present.length) {
      const lo = Math.min(...present), hi = Math.max(...present);
      const step = (k) => typeof g0.bucket === "number" ? k + g0.bucket : unitNext(k, g0.bucket);
      let n = 0;
      for (let k = lo;k <= hi && n < 1e4; k = step(k), n++)
        if (!map.has(k))
          map.set(k, fresh([k]));
    }
  }
  let list = [...map.values()];
  const value = (acc, j) => {
    const m = measures[j];
    if (m.op === "count")
      return acc.count;
    const slot = acc.m[j];
    if (slot instanceof Set)
      return slot.size;
    if (m.op === "sum")
      return slot[0];
    if (!slot[1])
      return null;
    return m.op === "avg" ? slot[0] / slot[1] : m.op === "min" ? slot[2] : slot[3];
  };
  const sortBy = spec.sort?.by ?? (spec.limit !== undefined ? measureNames[0] : keyNames[0]);
  const dir = spec.sort?.direction ?? (spec.sort || spec.limit === undefined ? "asc" : "desc");
  if (sortBy !== undefined) {
    const ki = keyNames.indexOf(sortBy), mi = measureNames.indexOf(sortBy);
    if (ki < 0 && mi < 0)
      throw new RangeError(`aggregate: cannot sort by "${sortBy}" - not a key or a measure`);
    const pick = (a) => ki >= 0 ? a.keys[ki] : value(a, mi);
    list.sort((a, b) => (dir === "desc" ? -1 : 1) * compare(pick(a), pick(b)));
  }
  if (spec.limit !== undefined && list.length > spec.limit) {
    const rest = list.slice(spec.limit);
    list = list.slice(0, Math.max(0, spec.limit));
    if (spec.other !== undefined) {
      const other = fresh(keyNames.map((_, i) => i === 0 ? spec.other : null));
      for (const acc of rest) {
        other.count += acc.count;
        acc.m.forEach((slot, j) => {
          const into = other.m[j];
          if (slot instanceof Set)
            for (const v of slot)
              into.add(v);
          else {
            const t = into;
            t[0] += slot[0];
            t[1] += slot[1];
            t[2] = Math.min(t[2], slot[2]);
            t[3] = Math.max(t[3], slot[3]);
          }
        });
      }
      list.push(other);
    }
  }
  return list.map((acc) => {
    const out = {};
    keyNames.forEach((name, i) => out[name] = acc.keys[i]);
    measureNames.forEach((name, j) => out[name] = value(acc, j));
    return out;
  });
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
    const ops = {
      ">=": "gte",
      "<=": "lte",
      "!=": "neq",
      ">": "gt",
      "<": "lt",
      "=": "eq"
    };
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
// src/shared/sheet-url.ts
function sheetUrl(link) {
  return link.sheet?.href ?? link.href;
}

// src/shared/theme-links.ts
var LINK_ATTR = "data-df-theme-link";
var inflight = new Map;
function themeJsonHref(id) {
  const $ = defussQuery();
  const tokens = $("#tokens-css").get(0) ?? $('link[href*="default-semantic-tokens.css"]').get(0);
  if (tokens)
    return new URL(`../${id}.json`, sheetUrl(tokens)).href;
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
function loadTheme(id, href) {
  if (!id || id === "default") {
    clearThemeLinks();
    return Promise.resolve();
  }
  let pending = inflight.get(id);
  if (!pending) {
    pending = (async () => {
      try {
        const res = await fetch(href ?? themeJsonHref(id));
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
var SHARED_ABI = "0.10.0";
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
  sheetUrl,
  mathClone,
  mathText,
  asEditor,
  builtinEditor,
  editorControl,
  editorKey,
  editorProblem,
  focusEditor,
  valueType,
  bindMedia,
  mediaApply,
  mediaMarkup,
  mediaOf,
  mediaPaint,
  mediaRead,
  mediaTextTracks,
  mediaTime,
  mediaTracks,
  elementModel,
  renderModel,
  settleTemplates,
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
  aggregate,
  virtualWindow,
  sizerHeight,
  scrollTopFor,
  scrollIntoViewTop
};
Reflect.set(df, "store", { create: createStore, computed, persisted, available: storageAvailable });
Reflect.set(df, "dataview", {
  source: dataSource,
  aggregate,
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

// src/components/feedback-status/alert-dialog/alert-dialog.ts
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
var shown = (dialog) => dialog.open ? "open" : "default";
var alertDialogApi = componentState({
  component: "alert-dialog",
  states: alertDialogStates,
  apply: (dialog, state) => triggerStateChange(dialog, state.name, state.config),
  read: (dialog, state) => ({ name: shown(dialog), config: state.config }),
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
    bindComponent(dialog, alertDialogApi, { name: shown(dialog), config: {} });
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
      if (dialog._trigger)
        dialog._trigger.focus();
    });
  });
}
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// src/components/multimedia/audio/audio.ts
var df$2 = defussGlobals();
var dfDollar2 = defussQuery();
var audioStates = ["default", "playing"];
function applyMarkup2(el, stateName, config) {
  mediaMarkup(el, "audio", stateName, config);
}
function triggerStateChange2(el, stateName, config, incoming) {
  return mediaApply(el, "audio", stateName, config, incoming);
}
var audioApi = componentState({
  component: "audio",
  states: audioStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange2(el, state.name, state.config, incoming),
  read: (el) => {
    const { playing, config } = mediaRead(el);
    const { time, duration, rate, volume, muted, captions } = config;
    return { name: playing ? "playing" : "default", config: { time, duration, rate, volume, muted, captions } };
  },
  markup: (el, state) => applyMarkup2(el, state.name, state.config)
});
df$2.audioApi = audioApi;
df$2.audioStates = audioStates;
function init2() {
  dfDollar2(".audio:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent(el, audioApi);
    bindMedia(el, "audio", () => audioApi.getState(el));
  });
}
var resolve = (target) => typeof target === "string" ? dfDollar2(target).get(0) : target;
var now = (el) => mediaRead(el).playing ? "playing" : "default";
df$2.audio = {
  play: async (target) => {
    const el = resolve(target);
    if (el?.api)
      await el.api.setState("playing");
  },
  pause: (target) => {
    resolve(target)?.api?.setState("default");
  },
  toggle: (target) => {
    const el = resolve(target);
    if (!el?.api)
      return false;
    const next = now(el) === "playing" ? "default" : "playing";
    el.api.setState(next);
    return next === "playing";
  },
  seek: (target, time) => {
    const el = resolve(target);
    if (el?.api)
      el.api.setState(now(el), { time });
  },
  skip: (target, seconds) => {
    const el = resolve(target);
    if (el?.api)
      el.api.setState(now(el), { time: mediaRead(el).config.time + seconds });
  },
  mute: (target, muted) => {
    const el = resolve(target);
    if (el?.api)
      el.api.setState(now(el), { muted: muted ?? !mediaRead(el).config.muted });
  },
  volume: (target, volume) => {
    const el = resolve(target);
    if (el?.api)
      el.api.setState(now(el), { volume });
  },
  rate: (target, rate) => {
    const el = resolve(target);
    if (el?.api)
      el.api.setState(now(el), { rate });
  },
  captions: (target, key) => {
    const el = resolve(target);
    if (el?.api)
      el.api.setState(now(el), { captions: key ?? (mediaRead(el).config.captions ? "" : true) });
  },
  tracks: (target, tracks, replace) => {
    const el = resolve(target);
    return el?.api ? mediaTracks(el, "audio", tracks, replace) : [];
  }
};
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// src/components/data-display/avatar/avatar.ts
var df$3 = defussGlobals();
var dfDollar3 = defussQuery();
var avatarStates = ["default", "error"];
function applyMarkup3(el, stateName) {
  const img = dfDollar3(el).find(".avatar-image");
  if (stateName === "error")
    img.attr("data-error", "").css("display", "none");
  else
    img.attr("data-error", null).css("display", "");
}
function triggerStateChange3(wrapper, stateName, _config) {
  const img = dfDollar3(wrapper).find(".avatar-image").get(0);
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
  apply: (wrapper, state) => triggerStateChange3(wrapper, state.name, state.config),
  read: (wrapper, state) => {
    const img = dfDollar3(wrapper).find(".avatar-image").get(0);
    const errored = img ? img.hasAttribute("data-error") : true;
    return {
      name: errored ? "error" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup3(el, state.name)
});
df$3.avatarApi = avatarApi;
df$3.avatarStates = avatarStates;
function init3() {
  dfDollar3(".avatar:not([data-init])").toArray().forEach((wrapper) => {
    wrapper.dataset.init = "";
    bindComponent(wrapper, avatarApi);
    const img = dfDollar3(wrapper).find(".avatar-image").get(0);
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

// src/components/chat/chat-components/chat-components.ts
var df$4 = defussGlobals();
var dfDollar4 = defussQuery();
var FENCE = "ui::component-schema";
var FIELD_TYPES = [
  "input",
  "textarea",
  "number",
  "currency",
  "select",
  "radio",
  "checkbox",
  "switch",
  "slider",
  "rating",
  "date"
];
var CONTENT_TYPES = ["text", "list", "table", "facts", "plan", "alert", "divider"];
var NODE_TYPES = [...CONTENT_TYPES, ...FIELD_TYPES, "questionnaire"];
var NAME_RE = /^[A-Za-z][\w-]*$/;
var NODE_KEYS = new Set([
  "type",
  "name",
  "label",
  "hint",
  "text",
  "title",
  "tone",
  "items",
  "ordered",
  "columns",
  "rows",
  "facts",
  "steps",
  "required",
  "default",
  "placeholder",
  "inputType",
  "min",
  "max",
  "step",
  "unit",
  "currency",
  "locale",
  "minLength",
  "maxLength",
  "pattern",
  "lines",
  "options",
  "other",
  "branches",
  "autoAdvance",
  "review"
]);
var isField = (n) => FIELD_TYPES.includes(n?.type) || n?.type === "plan" && !!n.name;
function validate(spec) {
  const out = [];
  const err = (path, message) => out.push({ path, message, level: "error" });
  const warn = (path, message) => out.push({ path, message, level: "warning" });
  if (!spec || typeof spec !== "object" || Array.isArray(spec)) {
    err("", "a Component Schema document is a JSON object");
    return out;
  }
  if (spec.schema !== undefined && spec.schema !== "component-schema")
    err("schema", 'must be "component-schema"');
  if (spec.version === undefined)
    warn("version", "missing - read as 1");
  else if (spec.version !== 1)
    err("version", `version ${JSON.stringify(spec.version)} is not supported (1)`);
  for (const k of ["id", "title", "description"])
    if (spec[k] !== undefined && typeof spec[k] !== "string")
      err(k, "must be a string");
  for (const k of Object.keys(spec))
    if (!["schema", "version", "id", "title", "description", "body", "actions"].includes(k))
      warn(k, "unknown key, ignored");
  const names = new Set;
  const body = spec.body ?? [];
  if (!Array.isArray(body))
    err("body", "must be a list of nodes");
  else {
    const steps = new Set;
    const nodeCheck = (n, path, inStep = false, stepIds = null) => {
      if (!n || typeof n !== "object" || Array.isArray(n))
        return err(path, "a node is an object");
      if (!NODE_TYPES.includes(n.type))
        return err(`${path}.type`, `unknown type ${JSON.stringify(n.type)}`);
      for (const k of Object.keys(n))
        if (!NODE_KEYS.has(k))
          warn(`${path}.${k}`, "unknown key, ignored");
      if (inStep && !isField(n) && n.type !== "text")
        err(`${path}.type`, "a questionnaire step holds fields and text");
      if (isField(n)) {
        if (typeof n.name !== "string" || !NAME_RE.test(n.name))
          err(`${path}.name`, "a field needs a name (letters, digits, - and _, starting with a letter)");
        else if (names.has(n.name))
          err(`${path}.name`, `the name "${n.name}" is used twice`);
        else
          names.add(n.name);
        if (n.label !== undefined && typeof n.label !== "string")
          err(`${path}.label`, "must be a string");
      }
      const str = (k) => n[k] !== undefined && typeof n[k] !== "string" && err(`${path}.${k}`, "must be a string");
      ["text", "title", "hint", "placeholder", "unit", "other", "pattern", "review"].forEach(str);
      if ((n.type === "text" || n.type === "alert") && typeof n.text !== "string" && typeof n.title !== "string")
        err(`${path}.text`, "missing");
      if (n.type === "list" && (!Array.isArray(n.items) || !n.items.length))
        err(`${path}.items`, "a list of texts");
      if (n.type === "table") {
        if (!Array.isArray(n.columns) || !n.columns.length)
          err(`${path}.columns`, "a list of headings");
        if (!Array.isArray(n.rows))
          err(`${path}.rows`, "a list of rows");
        else
          n.rows.forEach((r, i) => {
            if (!Array.isArray(r))
              err(`${path}.rows[${i}]`, "a row is a list of cells");
          });
      }
      if (n.type === "facts" && (!Array.isArray(n.facts) || !n.facts.length))
        err(`${path}.facts`, "a list of { label, value }");
      if (n.type === "plan" && (!Array.isArray(n.steps) || !n.steps.length))
        err(`${path}.steps`, "a list of steps");
      if (n.type === "plan" && Array.isArray(n.steps))
        n.steps.forEach((s, i) => {
          if (!s || typeof s.title !== "string")
            err(`${path}.steps[${i}].title`, "missing");
        });
      if (["select", "radio"].includes(n.type) && (!Array.isArray(n.options) || !n.options.length))
        err(`${path}.options`, "a list of choices");
      if (n.options !== undefined) {
        if (!Array.isArray(n.options))
          err(`${path}.options`, "a list of choices");
        else {
          const seen = new Set;
          n.options.forEach((o, i) => {
            const v = typeof o === "string" ? o : o?.value;
            if (typeof v !== "string" || !v)
              err(`${path}.options[${i}]`, "a choice is a text or { value, label }");
            else if (seen.has(v))
              err(`${path}.options[${i}].value`, `"${v}" twice`);
            else
              seen.add(v);
            if (o && typeof o === "object" && o.goto !== undefined && stepIds && !stepIds.has(o.goto))
              err(`${path}.options[${i}].goto`, `no step "${o.goto}"`);
          });
        }
      }
      if (n.type === "currency" && (typeof n.currency !== "string" || !/^[A-Z]{3}$/.test(n.currency)))
        err(`${path}.currency`, "an ISO 4217 code such as EUR");
      if (n.inputType !== undefined && !["text", "email", "url", "tel", "time"].includes(n.inputType))
        err(`${path}.inputType`, "text, email, url, tel or time");
      if (n.tone !== undefined && !["default", "destructive"].includes(n.tone))
        err(`${path}.tone`, "default or destructive");
      if (typeof n.min === "number" && typeof n.max === "number" && n.min > n.max)
        err(`${path}.min`, "above max");
      if (n.pattern !== undefined)
        try {
          new RegExp(n.pattern);
        } catch {
          err(`${path}.pattern`, "not a regular expression");
        }
      if (n.type === "questionnaire") {
        if (inStep)
          return err(path, "a questionnaire does not nest");
        if (!Array.isArray(n.steps) || !n.steps.length)
          return err(`${path}.steps`, "a list of steps");
        const ids = new Set;
        n.steps.forEach((s, i) => {
          if (!s || typeof s.id !== "string" || !NAME_RE.test(s.id))
            err(`${path}.steps[${i}].id`, "a step needs an id");
          else if (ids.has(s.id) || s.id === "review")
            err(`${path}.steps[${i}].id`, `"${s.id}" twice or reserved`);
          else
            ids.add(s.id);
        });
        n.steps.forEach((s, i) => {
          const sp = `${path}.steps[${i}]`;
          if (!s)
            return;
          if (typeof s.title !== "string")
            err(`${sp}.title`, "missing");
          if (s.next !== undefined && !ids.has(s.next) && s.next !== "review")
            err(`${sp}.next`, `no step "${s.next}"`);
          if (!Array.isArray(s.fields) || !s.fields.some(isField))
            err(`${sp}.fields`, "a step asks with fields");
          else
            s.fields.forEach((f, j) => nodeCheck(f, `${sp}.fields[${j}]`, true, ids));
        });
        if (n.branches !== undefined) {
          if (typeof n.branches !== "object" || Array.isArray(n.branches))
            err(`${path}.branches`, "an object by step id");
          else
            for (const [id, list] of Object.entries(n.branches)) {
              if (!ids.has(id))
                err(`${path}.branches.${id}`, `no step "${id}"`);
              if (!Array.isArray(list))
                err(`${path}.branches.${id}`, "a list of { when, goto }");
              else
                list.forEach((b, i) => {
                  if (!b || b.when === undefined)
                    err(`${path}.branches.${id}[${i}].when`, "missing");
                  if (!b || !ids.has(b.goto) && b.goto !== "review")
                    err(`${path}.branches.${id}[${i}].goto`, `no step "${b?.goto}"`);
                });
            }
        }
        for (const s of n.steps)
          steps.add(s?.id);
      }
    };
    body.forEach((n, i) => nodeCheck(n, `body[${i}]`));
    const q = body.filter((n) => n?.type === "questionnaire");
    if (q.length > 1)
      err("body", "one questionnaire per card");
    if (q.length && body.some(isField))
      err("body", "a card with a questionnaire asks only through it");
  }
  if (spec.actions !== undefined) {
    if (!Array.isArray(spec.actions))
      err("actions", "a list of { id, label }");
    else {
      const ids = new Set;
      spec.actions.forEach((a, i) => {
        const p = `actions[${i}]`;
        if (!a || typeof a !== "object")
          return err(p, "an action is { id, label }");
        if (typeof a.id !== "string" || !a.id)
          err(`${p}.id`, "missing");
        else if (ids.has(a.id))
          err(`${p}.id`, `"${a.id}" twice`);
        else
          ids.add(a.id);
        if (typeof a.label !== "string" || !a.label)
          err(`${p}.label`, "missing");
        if (a.reply !== undefined && typeof a.reply !== "string")
          err(`${p}.reply`, "must be a string");
        if (a.variant !== undefined && !["default", "secondary", "outline", "ghost", "destructive"].includes(a.variant))
          err(`${p}.variant`, "a Button variant");
      });
    }
  }
  return out;
}
var esc2 = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
var inline = (v) => esc2(v).replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
var attr = (name, v) => v === undefined || v === null || v === false ? "" : v === true ? ` ${name}` : ` ${name}="${esc2(v)}"`;
var optionsOf = (n) => (n.options ?? []).map((o) => typeof o === "string" ? { value: o, label: o } : { ...o, label: o.label ?? o.value });
var actionsOf = (spec) => spec.actions?.length ? spec.actions : (spec.body ?? []).some((n) => isField(n) || n?.type === "questionnaire") ? [{ id: "submit", label: "Send", submit: true }] : [];
var scriptJson = (v) => JSON.stringify(v).replace(/</g, "\\u003c");
function hintOf(n, id) {
  return n.hint ? `<p class="chat-components-hint" id="${id}-hint">${inline(n.hint)}</p>` : "";
}
var described = (n, id) => n.hint ? ` aria-describedby="${id}-hint"` : "";
function choices(n, id, kind, inStep) {
  const list = optionsOf(n);
  const def = n.default;
  const checked = (v) => Array.isArray(def) ? def.includes(v) : def === v;
  const cls = kind === "radio" ? 'class="radio"' : 'class="checkbox"';
  const rows = list.map((o, i) => {
    const cid = `${id}-${i}`;
    const own = `type="${kind}" name="${esc2(n.name)}" value="${esc2(o.value)}"${attr("checked", checked(o.value))}${attr("required", kind === "radio" && n.required && i === 0)}`;
    if (inStep)
      return `<label class="questionnaire-choice"><input ${own}${attr("data-goto", o.goto)}><span class="questionnaire-choice-label">${esc2(o.label)}</span></label>`;
    const text = `<span class="chat-components-choice-label">${esc2(o.label)}</span>${o.description ? `<span class="chat-components-choice-description">${esc2(o.description)}</span>` : ""}`;
    return `<div class="chat-components-choice"><input ${cls} id="${cid}" ${own}><label for="${cid}">${text}</label></div>`;
  });
  if (n.other) {
    const cid = `${id}-other`;
    const otherName = `${n.name}Other`;
    rows.push(inStep ? `<label class="questionnaire-choice"><input type="${kind}" name="${esc2(n.name)}" value="other"><span class="questionnaire-choice-label">${esc2(n.other)}</span><input class="questionnaire-other" name="${esc2(otherName)}" aria-label="${esc2(n.other)}"></label>` : `<div class="chat-components-choice" data-other><input ${cls} type="${kind}" name="${esc2(n.name)}" id="${cid}" value="other"><label for="${cid}"><span class="chat-components-choice-label">${esc2(n.other)}</span></label><input class="input chat-components-other" data-size="sm" name="${esc2(otherName)}" aria-label="${esc2(n.other)}"></div>`);
  }
  if (inStep)
    return `<div class="questionnaire-choices">${rows.join("")}</div>${hintOf(n, id)}`;
  return `<fieldset class="chat-components-group" data-field="${esc2(n.name)}"${described(n, id)}><legend class="label">${esc2(n.label ?? n.name)}</legend>${rows.join("")}${hintOf(n, id)}</fieldset>`;
}
function fieldMarkup(n, prefix, inStep = false) {
  const id = `${prefix}-${n.name}`;
  const label = `<label class="label" for="${id}">${esc2(n.label ?? n.name)}</label>`;
  const wrap = (control) => `<div class="${inStep ? "questionnaire-field" : "chat-components-field"}" data-field="${esc2(n.name)}">${label}${control}${hintOf(n, id)}</div>`;
  const def = n.default ?? undefined;
  const common = `id="${id}" name="${esc2(n.name)}"${attr("required", n.required)}${described(n, id)}`;
  switch (n.type) {
    case "input":
      return wrap(`<input class="input" type="${n.inputType ?? "text"}" ${common}${attr("placeholder", n.placeholder)}${attr("value", def)}${attr("minlength", n.minLength)}${attr("maxlength", n.maxLength)}${attr("pattern", n.pattern)}>`);
    case "textarea":
      return wrap(`<textarea class="textarea" rows="${Number(n.lines) || 3}" ${common}${attr("placeholder", n.placeholder)}${attr("minlength", n.minLength)}${attr("maxlength", n.maxLength)}>${esc2(def ?? "")}</textarea>`);
    case "date":
      return wrap(`<input class="input" type="date" ${common}${attr("min", n.min)}${attr("max", n.max)}${attr("value", def)}>`);
    case "number":
      return wrap(`<div class="number-input"><button type="button" data-action="decrement" aria-label="Decrease">−</button><input type="number" ${common}${attr("min", n.min)}${attr("max", n.max)}${attr("step", n.step)}${attr("value", def)}${attr("placeholder", n.placeholder)}>${n.unit ? `<label class="number-input-unit" for="${id}">${esc2(n.unit)}</label>` : ""}<button type="button" data-action="increment" aria-label="Increase">+</button></div>`);
    case "currency":
      return wrap(`<div class="number-input" data-currency="${esc2(n.currency)}"${attr("data-locale", n.locale)}${attr("data-min", n.min)}${attr("data-max", n.max)}><input type="text" id="${id}"${attr("required", n.required)}${described(n, id)}${attr("value", def)}${attr("placeholder", n.placeholder)}><input type="hidden" name="${esc2(n.name)}" data-number-output data-answer></div>`);
    case "select":
      return wrap(`<select class="select" ${common}><option value=""${attr("selected", def === undefined)}>${esc2(n.placeholder ?? "Choose ...")}</option>${optionsOf(n).map((o) => `<option value="${esc2(o.value)}"${attr("selected", def === o.value)}${attr("data-goto", inStep ? o.goto : undefined)}>${esc2(o.label)}</option>`).join("")}</select>`);
    case "radio":
      return choices(n, id, "radio", inStep);
    case "checkbox":
      if (n.options)
        return choices(n, id, "checkbox", inStep);
      return `<div class="chat-components-choice" data-field="${esc2(n.name)}"><input class="checkbox" type="checkbox" ${common}${attr("checked", def === true)}><label for="${id}"><span class="chat-components-choice-label">${esc2(n.label ?? n.name)}</span></label>${hintOf(n, id)}</div>`;
    case "switch":
      return `<div class="switch-item chat-components-switch" data-field="${esc2(n.name)}"><input class="switch" type="checkbox" role="switch" ${common}${attr("checked", def === true)}><label for="${id}">${esc2(n.label ?? n.name)}</label>${hintOf(n, id)}</div>`;
    case "slider": {
      const min = n.min ?? 0;
      const max = n.max ?? 100;
      const value = def ?? min;
      return wrap(`<div class="chat-components-slider"><input class="slider" type="range" ${common}${attr("min", min)}${attr("max", max)}${attr("step", n.step)}${attr("data-unit", n.unit)} value="${esc2(value)}"><output for="${id}" class="chat-components-output">${esc2(value)}</output></div>`);
    }
    case "rating": {
      const stars = Math.max(1, Math.min(10, Number(n.max) || 5));
      const items = Array.from({ length: stars }, (_, i) => {
        const v = i + 1;
        return `<label class="rating-item"><input class="rating-input" type="radio" name="${esc2(n.name)}" value="${v}" aria-label="${v} ${v === 1 ? "star" : "stars"}"${attr("checked", def === v)}${attr("required", n.required && i === 0)}></label>`;
      }).join("");
      if (inStep)
        return `<div class="rating" role="radiogroup" aria-label="${esc2(n.label ?? n.name)}">${items}</div>${hintOf(n, id)}`;
      return `<fieldset class="chat-components-group" data-field="${esc2(n.name)}"><legend class="label">${esc2(n.label ?? n.name)}</legend><div class="rating" role="radiogroup" aria-label="${esc2(n.label ?? n.name)}">${items}</div>${hintOf(n, id)}</fieldset>`;
    }
    default:
      return "";
  }
}
function contentMarkup(n, prefix) {
  switch (n.type) {
    case "text":
      return `<p class="chat-components-text">${n.title ? `<strong>${esc2(n.title)}</strong> ` : ""}${inline(n.text ?? "")}</p>`;
    case "list": {
      const tag = n.ordered ? "ol" : "ul";
      return `<${tag} class="chat-components-list">${n.items.map((i) => `<li>${inline(i)}</li>`).join("")}</${tag}>`;
    }
    case "table":
      return `<div class="table-container"><table class="table">${n.label ? `<caption class="table-caption">${esc2(n.label)}</caption>` : ""}<thead><tr class="table-row">${n.columns.map((c) => `<th class="table-head">${esc2(c)}</th>`).join("")}</tr></thead><tbody>${n.rows.map((r) => `<tr class="table-row">${r.map((c) => `<td class="table-cell"${typeof c === "number" ? " data-numeric" : ""}>${esc2(c)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    case "facts":
      return `<dl class="chat-components-facts">${n.facts.map((f) => `<div><dt>${esc2(f.label)}</dt><dd>${esc2(f.value)}</dd></div>`).join("")}</dl>`;
    case "plan": {
      const rows = n.steps.map((s, i) => {
        const text = `<span class="chat-components-plan-title">${inline(s.title)}</span>${s.description ? `<span class="chat-components-plan-description">${inline(s.description)}</span>` : ""}`;
        if (!n.name)
          return `<li>${text}</li>`;
        const cid = `${prefix}-${n.name}-${i}`;
        const value = s.id ?? String(i + 1);
        const on = Array.isArray(n.default) ? n.default.includes(value) : true;
        return `<li><input class="checkbox" type="checkbox" name="${esc2(n.name)}" id="${cid}" value="${esc2(value)}"${attr("checked", on)}><label for="${cid}">${text}</label></li>`;
      });
      return `<ol class="chat-components-plan"${n.name ? ` data-field="${esc2(n.name)}" data-checkable` : ""}${n.label ? ` aria-label="${esc2(n.label)}"` : ""}>${rows.join("")}</ol>`;
    }
    case "alert":
      return `<div class="alert"${n.tone === "destructive" ? ' data-variant="destructive"' : ""}><div class="alert-content">${n.title ? `<h5 class="alert-title">${esc2(n.title)}</h5>` : ""}${n.text ? `<p class="alert-description">${inline(n.text)}</p>` : ""}</div></div>`;
    case "divider":
      return '<hr class="separator">';
    default:
      return "";
  }
}
function questionnaireMarkup(n, prefix, submitLabel) {
  const q = `${prefix}-q`;
  const steps = n.steps.map((s) => {
    const fields = (s.fields ?? []).map((f) => f.type === "text" ? contentMarkup(f, q) : fieldMarkup(f, q, true)).join("");
    return `<fieldset class="questionnaire-step" data-step="${esc2(s.id)}"${attr("data-next", s.next)}${attr("data-optional", !!s.optional)}><legend class="questionnaire-title">${esc2(s.title)}</legend>${s.description ? `<p class="questionnaire-description">${inline(s.description)}</p>` : ""}${fields}</fieldset>`;
  }).join("");
  const validate = {};
  for (const s of n.steps)
    for (const f of s.fields ?? [])
      if (f.type === "currency" && f.required)
        (validate[s.id] ??= []).push({
          assert: [{ field: f.name, op: "answered" }],
          message: "Enter an amount.",
          field: f.name
        });
  const rules = { branches: n.branches ?? {}, validate };
  return `<form class="questionnaire chat-components-questionnaire" id="${q}" aria-label="${esc2(n.title ?? "Questions")}" data-persist="none"${attr("data-auto-advance", !!n.autoAdvance)}><div class="questionnaire-progress"></div>${steps}<fieldset class="questionnaire-step" data-step="review" data-end><legend class="questionnaire-title">${esc2(n.review ?? "Check your answers")}</legend><div class="questionnaire-summary"></div></fieldset><div class="questionnaire-actions"><button class="btn" data-variant="ghost" type="button" data-questionnaire="back">Back</button><button class="btn" data-variant="outline" type="submit" data-questionnaire="skip">Skip</button><button class="btn" type="submit" data-questionnaire="next">Continue</button><button class="btn" type="submit" data-questionnaire="submit">${esc2(submitLabel)}</button></div><script type="application/json" class="questionnaire-rules">${scriptJson(rules)}</script></form>`;
}
function cardMarkup(spec, prefix) {
  const body = spec.body ?? [];
  const q = body.find((n) => n.type === "questionnaire");
  const actions = actionsOf(spec);
  const submit = actions.find((a) => a.submit);
  const header = spec.title || spec.description ? `<div class="card-header">${spec.title ? `<h3 class="card-title">${esc2(spec.title)}</h3>` : ""}${spec.description ? `<p class="card-description">${inline(spec.description)}</p>` : ""}</div>` : "";
  const content = body.map((n) => n.type === "questionnaire" ? questionnaireMarkup(n, prefix, submit?.label ?? "Send") : isField(n) && n.type !== "plan" ? fieldMarkup(n, prefix) : contentMarkup(n, prefix)).join("");
  const shown = q ? actions.filter((a) => !a.submit) : actions;
  const buttons = shown.map((a) => `<button class="btn" type="${a.submit ? "submit" : "button"}" data-chat-action="${esc2(a.id)}"${a.variant && a.variant !== "default" ? ` data-variant="${esc2(a.variant)}"` : ""}>${esc2(a.label)}</button>`).join("");
  const footer = buttons ? `<div class="card-footer chat-components-actions">${buttons}</div>` : "";
  const answers = `<dl class="chat-components-facts chat-components-answers" hidden></dl>`;
  const tag = q ? "div" : "form";
  return `<${tag} class="card chat-components-card" data-size="sm"${spec.title ? ` aria-labelledby="${prefix}-title"` : ""}>${header.replace('class="card-title"', `class="card-title" id="${prefix}-title"`)}<div class="card-content chat-components-content">${content}${answers}</div>${footer}</${tag}>`;
}
function markup(spec, { id = "", answers = null } = {}) {
  const ident = id || `cc-${Math.random().toString(36).slice(2, 8)}`;
  const label = typeof spec?.title === "string" ? ` aria-label="${esc2(spec.title)}"` : "";
  const answered = answers ? `<script type="application/json" class="chat-components-answers">${scriptJson(answers)}</script>` : "";
  return `<div class="chat-components" id="${esc2(ident)}"${label}><script type="application/json" class="chat-components-schema">${scriptJson(spec)}</script>${answered}</div>`;
}
function fieldsOf(spec) {
  const out = new Map;
  const walk = (list) => {
    for (const n of list ?? []) {
      if (n?.type === "questionnaire")
        for (const s of n.steps ?? [])
          walk(s.fields);
      else if (isField(n))
        out.set(n.name, n);
    }
  };
  walk(spec?.body);
  return out;
}
var toNumber = (v) => v === "" || v === null || v === undefined || Number.isNaN(Number(v)) ? null : Number(v);
function typed(n, v) {
  if (v === undefined)
    return null;
  switch (n.type) {
    case "number":
    case "currency":
    case "slider":
    case "rating":
      return Array.isArray(v) ? null : toNumber(v);
    case "switch":
      return v === true || v === "on" || v === "true";
    case "checkbox":
      if (!n.options)
        return v === true || v === "on" || v === "true";
      return Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];
    case "plan":
      return Array.isArray(v) ? v.map(String) : v ? [String(v)] : [];
    default:
      return v === "" || v === null ? null : Array.isArray(v) ? v.map(String) : String(v);
  }
}
function readAnswers(root) {
  const spec = root._spec;
  const out = {};
  const body = root._body;
  const controls = (name) => dfDollar4(body).find(`[name="${CSS.escape(name)}"]`).toArray();
  for (const [name, n] of fieldsOf(spec)) {
    const list = controls(name);
    if (!list.length)
      continue;
    let v;
    const first = list[0];
    if (first.type === "radio")
      v = list.find((c) => c.checked)?.value ?? null;
    else if (first.type === "checkbox")
      v = n.options || n.type === "plan" ? list.filter((c) => c.checked).map((c) => c.value) : first.checked;
    else
      v = first.value;
    out[name] = typed(n, v);
    if (n.other) {
      const text = controls(`${name}Other`)[0]?.value ?? "";
      const picked = Array.isArray(out[name]) ? out[name].includes("other") : out[name] === "other";
      if (picked)
        out[`${name}Other`] = text || null;
    }
  }
  return out;
}
function writeAnswers(root, answers) {
  const body = root._body;
  for (const [name, n] of fieldsOf(root._spec)) {
    if (!(name in answers))
      continue;
    const v = answers[name];
    const list = dfDollar4(body).find(`[name="${CSS.escape(name)}"]`).toArray();
    for (const c of list) {
      if (c.type === "radio")
        c.checked = String(v) === c.value;
      else if (c.type === "checkbox")
        c.checked = Array.isArray(v) ? v.includes(c.value) : v === true;
      else if (n.type === "currency") {
        const wrapper = c.closest(".number-input");
        if (wrapper?.api)
          wrapper.api.setState("default", { value: v });
        else
          c.value = v == null ? "" : String(v);
      } else if (String(c.value) !== String(v ?? ""))
        c.value = v == null ? "" : String(v);
    }
    if (n.other && answers[`${name}Other`] != null) {
      const other = dfDollar4(body).find(`[name="${CSS.escape(name + "Other")}"]`).get(0);
      if (other)
        other.value = String(answers[`${name}Other`]);
    }
    if (n.type === "slider")
      dfDollar4(body).find(`input[name="${CSS.escape(name)}"]`).get(0)?.dispatchEvent(new Event("input", { bubbles: true }));
  }
}
function answerText(n, v, answers) {
  if (v === null || v === undefined || Array.isArray(v) && !v.length)
    return "-";
  const label = (x) => x === "other" && n.other ? answers[`${n.name}Other`] || n.other : n.type === "plan" ? n.steps.find((s, i) => (s.id ?? String(i + 1)) === x)?.title ?? x : optionsOf(n).find((o) => o.value === x)?.label ?? x;
  switch (n.type) {
    case "currency":
      try {
        return new Intl.NumberFormat(n.locale || undefined, { style: "currency", currency: n.currency }).format(v);
      } catch {
        return `${v} ${n.currency}`;
      }
    case "switch":
      return v ? "Yes" : "No";
    case "checkbox":
      return n.options ? v.map(label).join(", ") : v ? "Yes" : "No";
    case "rating":
      return `${v} of ${Number(n.max) || 5}`;
    case "number":
    case "slider":
      return `${v}${n.unit ? ` ${n.unit}` : ""}`;
    case "select":
    case "radio":
      return label(v);
    case "plan":
      return v.map(label).join(", ");
    default:
      return String(v);
  }
}
function summary(spec, answers, action = "") {
  const fields = fieldsOf(spec);
  const parts = [];
  for (const [name, n] of fields) {
    if (!(name in answers))
      continue;
    parts.push(`${n.label ?? name}: ${answerText(n, answers[name], answers)}`);
  }
  const act = actionsOf(spec ?? {}).find((a) => a.id === action);
  if (!parts.length)
    return act?.reply ?? act?.label ?? action;
  return parts.join("; ");
}
function answersMarkup(spec, answers) {
  const rows = [];
  for (const [name, n] of fieldsOf(spec))
    if (name in answers)
      rows.push(`<div><dt>${esc2(n.label ?? name)}</dt><dd>${esc2(answerText(n, answers[name], answers))}</dd></div>`);
  return rows.join("");
}
var chatComponentsStates = ["default", "answered", "cancelled"];
function applyMarkup4(root, name) {
  dfDollar4(root).attr("data-answered", name === "default" ? null : name);
}
function triggerStateChange4(root, name, config = {}) {
  applyMarkup4(root, name);
  const body = root._body;
  if (!body || root._invalid)
    return;
  const open = name === "default";
  if (name === "answered" && config.answers)
    writeAnswers(root, config.answers);
  for (const c of dfDollar4(body).find("input, select, textarea, button").toArray()) {
    if (c.closest(".questionnaire-actions") && !open)
      continue;
    c.disabled = !open && !c.matches("[data-chat-action]");
  }
  for (const b of dfDollar4(body).find("[data-chat-action]").toArray()) {
    const chosen = !open && b.dataset.chatAction === config.action;
    b.toggleAttribute("data-chosen", chosen);
    b.disabled = !open;
    if (chosen)
      b.setAttribute("aria-pressed", "true");
    else
      b.removeAttribute("aria-pressed");
  }
  const q = dfDollar4(body).find(".chat-components-questionnaire").get(0);
  const list = dfDollar4(body).find(".chat-components-answers").get(0);
  if (q)
    q.hidden = !open;
  if (list) {
    const rows = name === "answered" && q ? answersMarkup(root._spec, config.answers ?? {}) : "";
    dfDollar4(list).html(rows);
    list.hidden = !rows;
  }
}
var chatComponentsApi = componentState({
  component: "chat-components",
  states: chatComponentsStates,
  apply: (root, state) => triggerStateChange4(root, state.name, state.config),
  markup: (root, state) => applyMarkup4(root, state.name)
});
df$4.chatComponentsApi = chatComponentsApi;
df$4.chatComponentsStates = chatComponentsStates;
function scriptOf(root, cls) {
  const s = dfDollar4(root).children(`script.${cls}`).get(0);
  if (!s)
    return;
  try {
    return JSON.parse(s.textContent || "null");
  } catch (error) {
    return { __parseError: String(error.message ?? error) };
  }
}
function finish(root, action, answers) {
  const spec = root._spec;
  const result = action.cancel ? { action: action.id } : { action: action.id, answers };
  root.api.setState(action.cancel ? "cancelled" : "answered", result);
  const detail = {
    id: spec.id ?? "",
    action: action.id,
    answers: action.cancel ? {} : answers,
    reply: action.reply ?? null,
    summary: action.cancel || action.reply ? action.reply ?? action.label : summary(spec, answers, action.id)
  };
  root.dispatchEvent(new CustomEvent("chat-components-answer", { bubbles: true, detail }));
}
function build(root) {
  const spec = scriptOf(root, "chat-components-schema");
  root._spec = spec && !spec.__parseError ? spec : null;
  const problems = spec?.__parseError ? [{ path: "", message: `the JSON does not parse: ${spec.__parseError}`, level: "error" }] : validate(spec);
  root._problems = problems;
  const errors = problems.filter((p) => p.level === "error");
  root._invalid = errors.length > 0;
  root.toggleAttribute("data-invalid", root._invalid);
  let body = dfDollar4(root).children(".chat-components-body").get(0);
  if (!body) {
    body = document.createElement("div");
    body.className = "chat-components-body";
    root.append(body);
  }
  root._body = body;
  if (root._invalid) {
    dfDollar4(body).html(`<div class="alert" data-variant="destructive" role="alert"><div class="alert-content"><h5 class="alert-title">This card cannot be shown</h5><p class="alert-description">${errors.slice(0, 4).map((e) => esc2(`${e.path || "document"}: ${e.message}`)).join("<br>")}</p></div></div>`);
    return;
  }
  root._uid ??= root.id || `cc-${Math.random().toString(36).slice(2, 8)}`;
  dfDollar4(body).html(cardMarkup(spec, root._uid));
}
function init4() {
  dfDollar4(".chat-components:not([data-init])").each((_i, root) => {
    dfDollar4(root).data("init", "");
    build(root);
    const answered = scriptOf(root, "chat-components-answers");
    const start = answered && !answered.__parseError ? { name: answered.answers || !answered.action ? "answered" : "cancelled", config: answered } : { name: "default", config: {} };
    if (start.name !== "default")
      triggerStateChange4(root, start.name, start.config);
    bindComponent(root, chatComponentsApi, start);
    dfDollar4(root).on("submit", (e) => {
      const form = e.target.closest("form");
      if (!form?.classList.contains("chat-components-card"))
        return;
      e.preventDefault();
      const id = e.submitter?.dataset.chatAction;
      const action = actionsOf(root._spec).find((a) => a.id === id) ?? actionsOf(root._spec).find((a) => a.submit);
      if (action)
        finish(root, action, readAnswers(root));
    });
    dfDollar4(root).on("click", (e) => {
      const b = e.target.closest?.("button[data-chat-action]");
      if (!b || b.type === "submit" || !root.contains(b))
        return;
      const action = actionsOf(root._spec).find((a) => a.id === b.dataset.chatAction);
      if (action)
        finish(root, action, action.cancel || action.reply ? {} : readAnswers(root));
    });
    dfDollar4(root).on("questionnaire-submit", (e) => {
      const action = actionsOf(root._spec).find((a) => a.submit) ?? { id: "submit", label: "Send", submit: true };
      const raw = e.detail?.answers ?? {};
      const answers = {};
      for (const [name, n] of fieldsOf(root._spec)) {
        if (name in raw)
          answers[name] = typed(n, raw[name]);
        if (n.other && raw[`${name}Other`])
          answers[`${name}Other`] = String(raw[`${name}Other`]);
      }
      finish(root, action, answers);
    });
    dfDollar4(root).on("input", (e) => {
      const t = e.target;
      if (t.classList?.contains("chat-components-other") && t.value) {
        const choice = dfDollar4(t).closest("[data-other]").find('input[value="other"]').get(0);
        if (choice)
          choice.checked = true;
      }
    });
  });
}
var resolve2 = (target) => typeof target === "string" ? dfDollar4(target).get(0) : target;
function jsonSchema() {
  const str = { type: "string" };
  const option = {
    anyOf: [
      str,
      {
        type: "object",
        required: ["value"],
        properties: { value: str, label: str, description: str, goto: str }
      }
    ]
  };
  const node = {
    type: "object",
    required: ["type"],
    properties: {
      type: { enum: NODE_TYPES },
      name: { type: "string", pattern: NAME_RE.source },
      label: str,
      hint: str,
      text: str,
      title: str,
      tone: { enum: ["default", "destructive"] },
      items: { type: "array", items: str },
      ordered: { type: "boolean" },
      columns: { type: "array", items: str },
      rows: { type: "array", items: { type: "array", items: { type: ["string", "number"] } } },
      facts: {
        type: "array",
        items: {
          type: "object",
          required: ["label", "value"],
          properties: { label: str, value: { type: ["string", "number"] } }
        }
      },
      steps: {
        type: "array",
        items: {
          type: "object",
          required: ["title"],
          properties: {
            id: str,
            title: str,
            description: str,
            fields: { type: "array", items: { $ref: "#/$defs/node" } },
            optional: { type: "boolean" },
            next: str
          }
        }
      },
      required: { type: "boolean" },
      default: { type: ["string", "number", "boolean", "array", "null"] },
      placeholder: str,
      inputType: { enum: ["text", "email", "url", "tel", "time"] },
      min: { type: ["number", "string"] },
      max: { type: ["number", "string"] },
      step: { type: "number" },
      unit: str,
      currency: { type: "string", pattern: "^[A-Z]{3}$" },
      locale: str,
      minLength: { type: "integer" },
      maxLength: { type: "integer" },
      pattern: str,
      lines: { type: "integer" },
      options: { type: "array", items: option },
      other: str,
      branches: {
        type: "object",
        additionalProperties: {
          type: "array",
          items: { type: "object", required: ["when", "goto"], properties: { when: {}, goto: str } }
        }
      },
      autoAdvance: { type: "boolean" },
      review: str
    }
  };
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "Component Schema",
    description: "A card a chat shows with the system components: content (text, list, table, facts, plan, alert, divider), fields (input, textarea, number, currency, select, radio, checkbox, switch, slider, rating, date) or one multi-step questionnaire, and actions or quick replies. Every text is plain text with inline **bold**, *emphasis* and `code`.",
    type: "object",
    required: ["version"],
    properties: {
      schema: { const: "component-schema" },
      version: { const: 1 },
      id: str,
      title: str,
      description: str,
      body: { type: "array", items: { $ref: "#/$defs/node" } },
      actions: {
        type: "array",
        items: {
          type: "object",
          required: ["id", "label"],
          properties: {
            id: str,
            label: str,
            variant: { enum: ["default", "secondary", "outline", "ghost", "destructive"] },
            submit: { type: "boolean" },
            reply: str,
            cancel: { type: "boolean" }
          }
        }
      }
    },
    $defs: { node }
  };
}
function fences(markdown) {
  const out = [];
  const re = /^([ \t]*)(`{3,}|~{3,})[ \t]*ui::component-schema[ \t]*$/gm;
  let m;
  while (m = re.exec(markdown)) {
    const start = m.index;
    const fence = m[2];
    const from = m.index + m[0].length + 1;
    const close = new RegExp(`^[ \\t]*${fence[0] === "`" ? "`" : "~"}{${fence.length},}[ \\t]*$`, "m");
    const rest = markdown.slice(from);
    const c = close.exec(rest);
    const source = c ? rest.slice(0, c.index) : rest;
    const end = c ? from + c.index + c[0].length : markdown.length;
    let spec = null;
    let error = "";
    if (c)
      try {
        spec = JSON.parse(source);
      } catch (e) {
        error = String(e.message ?? e);
      }
    out.push({
      start,
      end: Math.min(end + (markdown[end] === `
` ? 1 : 0), markdown.length),
      source,
      spec,
      closed: !!c,
      error
    });
    re.lastIndex = end;
  }
  return out;
}
df$4.chatComponents = {
  fence: FENCE,
  validate: (spec) => validate(spec),
  markup: (spec, options) => markup(spec, options ?? {}),
  mount(target, spec) {
    const root = resolve2(target);
    const script = dfDollar4(root).children("script.chat-components-schema").get(0);
    if (script)
      dfDollar4(script).text(JSON.stringify(spec));
    build(root);
    root.api?.setState("default", {});
  },
  answers: (target) => readAnswers(resolve2(target)),
  summary: (spec, answers, action) => summary(spec, answers ?? {}, action ?? ""),
  jsonSchema: () => jsonSchema(),
  tool: (name) => ({
    type: "function",
    function: {
      name: name || "show_components",
      description: "Show the user a card in the chat: content, fields to answer (text, numbers, money, choices, dates, ratings), a multi-step questionnaire, or buttons and quick replies. The answers come back as the next user message.",
      parameters: jsonSchema()
    }
  }),
  fences: (markdown) => fences(String(markdown ?? ""))
};
var fill = (text, answers) => String(text ?? "").replace(/\{\{\s*([\w-]+)\s*\}\}/g, (_m, k) => answers[k] == null ? "" : Array.isArray(answers[k]) ? answers[k].join(", ") : String(answers[k]));
var wait2 = (ms) => new Promise((r) => setTimeout(r, ms));
var reducedMotion2 = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
function testWhen(when, answers) {
  const q = df$4.questionnaire;
  if (!q?.test)
    throw new Error("chat-script: branches need the Questionnaire (df$.shadcn.questionnaire.test)");
  return q.test(when, answers);
}
function createRun(script, hooks = {}, saved, delay = true) {
  const st = saved ? structuredClone(saved) : { node: script.start, answers: {}, history: [], waiting: "busy", rows: 0, marks: [] };
  const emit = (fn, ...args) => {
    if (fn === "say" || fn === "ask" || fn === "user")
      st.rows++;
    hooks[fn]?.(...args);
  };
  const pause = async (text) => {
    if (!delay || reducedMotion2())
      return;
    emit("typing", true);
    await wait2(Math.min(1400, 350 + String(text).length * 12));
    emit("typing", false);
  };
  const nextOf = (node) => {
    for (const b of node.branches ?? [])
      if (testWhen(b.when, st.answers))
        return b.goto;
    return node.next ?? null;
  };
  async function enter(id) {
    const node = id ? script.nodes[id] : null;
    if (!id || !node) {
      st.waiting = "end";
      emit("end", { ...st.answers }, [...st.history]);
      return;
    }
    st.node = id;
    st.history.push(id);
    st.marks.push({ rows: st.rows, answers: { ...st.answers } });
    st.waiting = "busy";
    emit("step", id, { ...st.answers });
    const lines = node.say === undefined ? [] : Array.isArray(node.say) ? node.say : [node.say];
    for (const line of lines) {
      await pause(line);
      emit("say", fill(line, st.answers), id);
    }
    if (node.ask) {
      await pause("");
      emit("ask", node.ask, id);
      st.waiting = "components";
    } else if (node.input)
      st.waiting = "text";
    else if (node.end) {
      st.waiting = "end";
      emit("end", { ...st.answers }, [...st.history]);
    } else
      await enter(nextOf(node));
  }
  const routed = (node, text) => node.match?.find((m) => m.pattern === undefined ? true : new RegExp(m.pattern, "i").test(text))?.goto ?? null;
  const run = {
    start: async () => {
      if (saved && st.history.length)
        return;
      await enter(script.start);
    },
    reply: async (text) => {
      const node = script.nodes[st.node];
      const value = String(text ?? "").trim();
      if (!value || !node || st.waiting === "busy" || st.waiting === "end")
        return;
      emit("user", value, st.node);
      const route = routed(node, value);
      if (st.waiting === "text") {
        st.answers[node.input] = value;
        await enter(route ?? nextOf(node));
      } else if (route)
        await enter(route);
      else {
        await pause("");
        emit("say", script.fallback ?? "Please answer with the card above.", st.node);
      }
    },
    answer: async (detail) => {
      const node = script.nodes[st.node];
      if (!node || st.waiting !== "components")
        return;
      emit("user", detail.summary, st.node);
      Object.assign(st.answers, detail.answers ?? {});
      st.answers[node.ask?.id || st.node] = detail.action;
      await enter(nextOf(node));
    },
    back: async () => {
      if (st.waiting === "busy")
        return false;
      const asks = (id) => !!(script.nodes[id]?.ask || script.nodes[id]?.input);
      let i = st.history.length - 1;
      if (st.waiting !== "end")
        i--;
      while (i >= 0 && !asks(st.history[i]))
        i--;
      if (i < 0)
        return false;
      const id = st.history[i];
      const mark = st.marks[i];
      st.history = st.history.slice(0, i);
      st.marks = st.marks.slice(0, i);
      st.answers = { ...mark.answers };
      st.rows = mark.rows;
      hooks.rewind?.(mark.rows);
      await enter(id);
      return true;
    },
    restart: async () => {
      st.answers = {};
      st.history = [];
      st.marks = [];
      st.rows = 0;
      hooks.rewind?.(0);
      await enter(script.start);
    },
    state: () => structuredClone(st)
  };
  return run;
}
function botRow(html, bot, row = true) {
  return `<div class="message${row ? " chat-script-row" : ""}"><div class="message-avatar"><span class="avatar" data-size="sm"><span class="avatar-fallback">${esc2(bot.initials ?? "B")}</span></span></div><div class="message-content">${html}</div></div>`;
}
var bubble = (text, variant = "secondary") => `<div class="bubble"${variant ? ` data-variant="${variant}"` : ""}><div class="bubble-content">${inline(text)}</div></div>`;
function runInSession(target, script, options = {}) {
  const session = resolve2(target);
  const S = df$4.session;
  const bot = { name: "Bot", initials: "B", ...options.bot };
  const log = [];
  const stored = options.persist ? persisted(options.persist, null, {
    validate: (v) => v === null || typeof v === "object" && Array.isArray(v.log)
  }) : null;
  const save = () => queueMicrotask(() => stored?.set({ log: structuredClone(log), state: run.state() }));
  let typingRow = null;
  let cards = 0;
  const write = (entry) => {
    let html = "";
    if (entry.kind === "say")
      html = botRow(bubble(entry.text), bot);
    else if (entry.kind === "user")
      html = `<div class="message chat-script-row" data-align="end"><div class="message-content">${bubble(entry.text, "")}</div></div>`;
    else if (entry.kind === "ask")
      html = botRow(markup(entry.spec, { id: `${session.id || "chat"}-card-${++cards}`, answers: entry.result ?? null }), bot);
    const item = S.append(session, html);
    const row = dfDollar4(item).find(".chat-script-row").get(0) ?? item;
    row._chatScript = entry;
    return row;
  };
  const rows = () => dfDollar4(session).find(".chat-script-row").toArray();
  const hooks = {
    say: (text, node) => {
      const e = { kind: "say", text, node };
      log.push(e);
      write(e);
      save();
    },
    user: (text, node) => {
      const e = { kind: "user", text, node };
      log.push(e);
      write(e);
      save();
    },
    ask: (spec, node) => {
      const e = { kind: "ask", spec, node };
      log.push(e);
      write(e);
      save();
    },
    typing: (on) => {
      if (on && !typingRow)
        typingRow = S.append(session, botRow(`<div class="bubble" data-variant="secondary"><div class="bubble-content" role="status" aria-label="${esc2(bot.name)} is typing"><span class="bubble-typing" aria-hidden="true"><span></span><span></span><span></span></span></div></div>`, bot, false));
      else if (!on && typingRow) {
        (typingRow.closest(".session-item") ?? typingRow).remove();
        typingRow = null;
      }
    },
    rewind: (n) => {
      log.length = n;
      rows().slice(n).forEach((r) => (r.closest(".session-item") ?? r).remove());
      save();
    },
    step: (node, answers) => options.on?.step?.(node, answers),
    end: (answers, history) => {
      save();
      options.on?.end?.(answers, history);
    }
  };
  const saved = stored?.value;
  if (saved?.log?.length) {
    log.push(...saved.log);
    for (const e of saved.log)
      write(e);
  }
  const run = createRun(script, hooks, saved?.state ?? null, options.delay !== false);
  const onAnswer = (e) => {
    const detail = e.detail;
    const card = e.target.closest(".chat-components");
    const entry = card?.closest(".chat-script-row")?._chatScript;
    if (!entry || entry !== [...log].reverse().find((x) => x.kind === "ask"))
      return;
    entry.result = card.api?.getState().config ?? null;
    run.answer(detail);
  };
  session.addEventListener("chat-components-answer", onAnswer);
  const composer = options.composer ? resolve2(options.composer) : null;
  if (composer) {
    const field = dfDollar4(composer).find('textarea, input[type="text"]').get(0);
    composer.addEventListener("submit", (e) => {
      e.preventDefault();
      const text = field?.value ?? "";
      if (!text.trim())
        return;
      field.value = "";
      run.reply(text);
    });
    field?.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing) {
        e.preventDefault();
        composer.requestSubmit?.();
      }
    });
  }
  run.start();
  return run;
}
df$4.chatScript = {
  create: (script, hooks, state) => createRun(script, hooks ?? {}, state ?? null),
  run: (target, script, options) => runInSession(target, script, options ?? {}),
  validate(script) {
    const out = [];
    const err = (path, message) => out.push({ path, message, level: "error" });
    if (!script || typeof script !== "object")
      return [{ path: "", message: "a script is an object", level: "error" }];
    const nodes = script.nodes ?? {};
    if (!nodes[script.start])
      err("start", `no node "${script.start}"`);
    for (const [id, n] of Object.entries(nodes)) {
      const p = `nodes.${id}`;
      for (const to of [n.next, ...(n.branches ?? []).map((b) => b.goto), ...(n.match ?? []).map((m) => m.goto)])
        if (to !== undefined && !nodes[to])
          err(p, `leads to "${to}", which does not exist`);
      if (!n.ask && !n.input && !n.end && !n.next && !n.branches?.length)
        err(p, "leads nowhere: next, branches or end");
      if (n.ask)
        for (const q of validate(n.ask))
          out.push({ ...q, path: `${p}.ask${q.path ? "." + q.path : ""}` });
      for (const [i, m] of (n.match ?? []).entries())
        if (m.pattern !== undefined)
          try {
            new RegExp(m.pattern, "i");
          } catch {
            err(`${p}.match[${i}].pattern`, "not a regular expression");
          }
    }
    return out;
  }
};
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// src/components/forms-inputs/combobox/combobox.ts
var df$5 = defussGlobals();
var dfDollar5 = defussQuery();
var comboboxStates = ["default", "open"];
function applyMarkup5(_el, _stateName) {}
function triggerStateChange5(popover, stateName, _config) {
  switch (stateName) {
    case "default":
      popover._close?.();
      break;
    case "open":
      popover._open?.();
      break;
  }
}
var comboboxApi = componentState({
  component: "combobox",
  states: comboboxStates,
  apply: (popover, state) => triggerStateChange5(popover, state.name, state.config),
  read: (popover, state) => {
    const selected = Array.from(dfDollar5(popover).find('[role="option"][aria-selected="true"]').toArray());
    const labels = selected.map((o) => o.textContent?.trim() ?? "");
    return {
      name: popover.matches(":popover-open") ? "open" : "default",
      config: {
        ...state.config,
        value: labels.join(", "),
        values: selected.map((o) => o.dataset.value ?? o.textContent?.trim() ?? ""),
        labels
      }
    };
  },
  markup: (el, state) => applyMarkup5(el, state.name)
});
df$5.comboboxApi = comboboxApi;
df$5.comboboxStates = comboboxStates;
var esc3 = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var idPart = (t) => t.replace(/[^\w-]/g, "_");
var comboSeq = 0;
function hideEmptyGroups(listbox) {
  dfDollar5(listbox).find(".combobox-group-label").each((_i, label) => {
    let next = label.nextElementSibling;
    let groupHasVisible = false;
    while (next && !next.classList.contains("combobox-group-label") && !next.classList.contains("combobox-separator")) {
      if (next.getAttribute("role") === "option" && !next.hidden && !next.classList.contains("combobox-create"))
        groupHasVisible = true;
      next = next.nextElementSibling;
    }
    dfDollar5(label).prop("hidden", !groupHasVisible);
  });
  dfDollar5(listbox).find(".combobox-separator").each((_i, sep) => {
    const prev = sep.previousElementSibling;
    const next = sep.nextElementSibling;
    dfDollar5(sep).prop("hidden", Boolean(prev && prev.hidden || next && next.hidden));
  });
}
function initTags(wrapper) {
  const field = dfDollar5(wrapper).find(".combobox-field").get(0);
  const input = dfDollar5(wrapper).find(".combobox-field-input").get(0);
  const popover = dfDollar5(wrapper).find(".combobox-content").get(0);
  const listbox = dfDollar5(wrapper).find('[role="listbox"]').get(0);
  if (!field || !input || !popover || !listbox)
    return;
  const empty = dfDollar5(wrapper).find(".combobox-empty").get(0);
  const creatable = wrapper.hasAttribute("data-creatable");
  const uid = wrapper.id || popover.id || `dfcb-${++comboSeq}`;
  const options = () => Array.from(dfDollar5(listbox).find('[role="option"]:not(.combobox-create)').toArray());
  const valueOf = (o) => o.dataset.value ?? o.textContent.trim();
  const labelOf = (o) => o.textContent.trim();
  dfDollar5(listbox).attr("aria-multiselectable", "true");
  const anchorId = `--combobox-${uid}`;
  dfDollar5(field).css("anchorName", anchorId);
  dfDollar5(popover).css("positionAnchor", anchorId);
  const tags = document.createElement("span");
  tags.className = "combobox-tags";
  dfDollar5(input).before(tags);
  let createRow = null;
  if (creatable) {
    createRow = document.createElement("div");
    createRow.className = "combobox-item combobox-create";
    createRow.id = `${uid}-create`;
    createRow.setAttribute("role", "option");
    createRow.setAttribute("aria-selected", "false");
    createRow.hidden = true;
    dfDollar5(listbox).prepend(createRow);
  }
  let highlighted = null;
  const highlight = (el) => {
    if (highlighted)
      dfDollar5(highlighted).data("highlighted", null);
    highlighted = el;
    if (el) {
      dfDollar5(el).data("highlighted", "");
      el.scrollIntoView({ block: "nearest" });
      dfDollar5(input).attr("aria-activedescendant", el.id);
    } else
      dfDollar5(input).attr("aria-activedescendant", null);
  };
  const visible = () => dfDollar5(listbox).find('[role="option"]').toArray().filter((o) => !o.hidden && o.getAttribute("aria-disabled") !== "true");
  const isOpen = () => popover.matches(":popover-open");
  const open = () => {
    if (!isOpen())
      safeShowPopover(popover);
    dfDollar5(input).attr("aria-expanded", "true");
  };
  const close = () => {
    if (isOpen())
      popover.hidePopover();
    dfDollar5(input).attr("aria-expanded", "false");
    highlight(null);
  };
  popover._open = () => {
    open();
    filter();
  };
  popover._close = close;
  bindComponent(popover, comboboxApi);
  const filter = () => {
    const text = input.value.trim();
    const q = text.toLowerCase();
    let exact = null;
    let any = false;
    for (const o of options()) {
      const match = !q || labelOf(o).toLowerCase().includes(q);
      dfDollar5(o).prop("hidden", !match);
      if (match)
        any = true;
      if (q && labelOf(o).toLowerCase() === q)
        exact = o;
    }
    if (createRow) {
      const showCreate = !!text && !exact;
      dfDollar5(createRow).prop("hidden", !showCreate);
      if (showCreate)
        dfDollar5(createRow).text(`Create "${text}"`);
    }
    hideEmptyGroups(listbox);
    if (empty)
      dfDollar5(empty).prop("hidden", any || !!createRow && !createRow.hidden);
    highlight(exact ?? (createRow && !createRow.hidden ? createRow : !creatable ? visible()[0] ?? null : null));
  };
  const render = (announce = true, created = null) => {
    const chosen = options().filter((o) => o.getAttribute("aria-selected") === "true");
    const labels = chosen.map(labelOf);
    const values = chosen.map(valueOf);
    const name = wrapper.dataset.name;
    dfDollar5(tags).morph(labels.map((label, i) => `<span class="combobox-tag" id="${uid}-tag-${idPart(values[i])}">${esc3(label)}<button type="button" class="combobox-tag-remove" data-value="${esc3(values[i])}" aria-label="Remove ${esc3(label)}" tabindex="-1"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>`).join("") + (name ? values.map((v) => `<input type="hidden" name="${esc3(name)}" value="${esc3(v)}" id="${uid}-input-${idPart(v)}">`).join("") : ""));
    if (input.dataset.placeholder === undefined)
      input.dataset.placeholder = input.placeholder;
    input.placeholder = labels.length ? "" : input.dataset.placeholder;
    if (announce)
      wrapper.dispatchEvent(new CustomEvent("combobox:change", {
        bubbles: true,
        detail: { values, labels, created }
      }));
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
        dfDollar5(option).text(text);
        const firstGroup = dfDollar5(listbox).find(".combobox-group-label").get(0);
        if (firstGroup)
          dfDollar5(firstGroup).before(option);
        else
          dfDollar5(listbox).append(option);
        row = option;
        created = text;
      }
      dfDollar5(row).attr("aria-selected", "true");
    } else if (row) {
      if (row.getAttribute("aria-disabled") === "true")
        return;
      const on = row.getAttribute("aria-selected") === "true";
      dfDollar5(row).attr("aria-selected", on && !text ? "false" : "true");
    } else
      return;
    dfDollar5(input).val("");
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
      dfDollar5(option).attr("aria-selected", "false");
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
        dfDollar5(last).attr("aria-selected", "false");
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
  popover.addEventListener("toggle", () => {
    dfDollar5(input).attr("aria-expanded", String(isOpen()));
  });
}
function init5() {
  dfDollar5(".combobox:not([data-init])").toArray().forEach((wrapper) => {
    wrapper.dataset.init = "";
    if (wrapper.hasAttribute("data-tags")) {
      initTags(wrapper);
      return;
    }
    const $wrapper = dfDollar5(wrapper);
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
    dfDollar5(clearBtn).html('<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>');
    dfDollar5(clearBtn).css("positionAnchor", anchorId);
    $trigger.after(clearBtn);
    const multiple = wrapper.hasAttribute("data-multiple");
    const uid = wrapper.id || popover.id || `dfcb-${++comboSeq}`;
    let tags = null;
    if (multiple) {
      $listbox.attr("aria-multiselectable", "true");
      tags = document.createElement("div");
      tags.className = "combobox-tags";
      tags.setAttribute("role", "list");
      tags.setAttribute("aria-label", `Selected ${trigger.getAttribute("aria-label") || dfDollar5("#" + CSS.escape(trigger.getAttribute("aria-labelledby") || "")).get(0)?.textContent?.trim() || "options"}`);
      dfDollar5(clearBtn).after(tags);
      tags.addEventListener("click", (e) => {
        const btn = e.target.closest(".combobox-tag-remove");
        if (!btn)
          return;
        const option = Array.from(allItems).find((o) => (o.dataset.value ?? o.textContent.trim()) === btn.dataset.value);
        const all = dfDollar5(tags).find(".combobox-tag-remove").toArray();
        const at = all.indexOf(btn);
        if (option)
          dfDollar5(option).attr("aria-selected", "false");
        renderSelection();
        const rest = dfDollar5(tags).find(".combobox-tag-remove").toArray();
        (rest[Math.min(at, rest.length - 1)] ?? trigger).focus();
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
        dfDollar5(tags).morph(labels.map((label, i) => `<span class="combobox-tag" role="listitem" id="${uid}-tag-${idPart(values[i])}">${esc3(label)}<button type="button" class="combobox-tag-remove" data-value="${esc3(values[i])}" aria-label="Remove ${esc3(label)}"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>`).join("") + (name ? values.map((v) => `<input type="hidden" name="${esc3(name)}" value="${esc3(v)}" id="${uid}-input-${idPart(v)}">`).join("") : ""));
      }
      if (announce)
        wrapper.dispatchEvent(new CustomEvent("combobox:change", { bubbles: true, detail: { values, labels } }));
    };
    if (multiple)
      renderSelection(false);
    clearBtn.addEventListener("click", () => {
      allItems.attr("aria-selected", "false");
      renderSelection();
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
    bindComponent(popover, comboboxApi);
    const isOpen = () => popover.matches(":popover-open");
    const filter = (query) => {
      const q = query.toLowerCase();
      let hasVisible = false;
      allItems.forEach((item) => {
        const match = !q || item.textContent.trim().toLowerCase().includes(q);
        dfDollar5(item).prop("hidden", !match);
        if (match)
          hasVisible = true;
      });
      if (listbox)
        hideEmptyGroups(listbox);
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
      dfDollar5(items[index]).data("highlighted", "");
      items[index].scrollIntoView({ block: "nearest" });
      $search.attr("aria-activedescendant", items[index].id);
    };
    const selectItem = (item) => {
      if (item.getAttribute("aria-disabled") === "true")
        return;
      if (multiple) {
        dfDollar5(item).attr("aria-selected", item.getAttribute("aria-selected") === "true" ? "false" : "true");
        renderSelection();
        searchInput.focus();
        return;
      }
      allItems.attr("aria-selected", "false");
      dfDollar5(item).attr("aria-selected", "true");
      renderSelection();
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
        case "Backspace": {
          if (!multiple || searchInput.value !== "")
            break;
          const chosen = Array.from(allItems).filter((o) => o.getAttribute("aria-selected") === "true");
          const last = chosen[chosen.length - 1];
          if (!last)
            break;
          e.preventDefault();
          dfDollar5(last).attr("aria-selected", "false");
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
    popover.addEventListener("toggle", () => {
      const nowOpen = popover.matches(":popover-open");
      $trigger.attr("aria-expanded", String(nowOpen));
      if (!nowOpen)
        clearHighlight();
    });
  });
}
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// src/components/overlays/dialog/dialog.ts
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
var shown2 = (dialog) => dialog.open ? "open" : "default";
var dialogApi = componentState({
  component: "dialog",
  states: dialogStates,
  apply: (dialog, state) => triggerStateChange6(dialog, state.name, state.config),
  read: (dialog, state) => ({ name: shown2(dialog), config: state.config }),
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
    bindComponent(dialog, dialogApi, { name: shown2(dialog), config: {} });
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
      if (dialog._trigger)
        dialog._trigger.focus();
    });
  });
}
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// src/components/navigation/dropdown/dropdown.ts
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
    item.dispatchEvent(new CustomEvent("dropdown:select", {
      bubbles: true,
      detail: { item, value: item.dataset.value ?? item.textContent.trim(), checked }
    }));
    return;
  }
  if (role === "menuitemradio") {
    const group = item.closest('[role="group"]') ?? menu;
    dfDollar7(group).find('[role="menuitemradio"]').toArray().forEach((r) => {
      if (r.closest('[role="menu"]') === menu)
        r.setAttribute("aria-checked", String(r === item));
    });
    item.dispatchEvent(new CustomEvent("dropdown:select", {
      bubbles: true,
      detail: { item, value: item.dataset.value ?? item.textContent.trim(), checked: true }
    }));
    return;
  }
  item.dispatchEvent(new CustomEvent("dropdown:select", {
    bubbles: true,
    detail: { item, value: item.dataset.value ?? item.textContent.trim() }
  }));
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

// src/components/forms-inputs/file-input/file-input.ts
var df$8 = defussGlobals();
var dfDollar8 = defussQuery();
var fileInputStates = ["default", "dragover", "selected", "error"];
var inputOf = (el) => dfDollar8(el).find(".file-drop-input").get(0);
function accepts(input, file) {
  const list = (input.accept || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!list.length)
    return true;
  const name = file.name.toLowerCase();
  const type = (file.type || "").toLowerCase();
  return list.some((a) => a.startsWith(".") ? name.endsWith(a) : a.endsWith("/*") ? type.startsWith(a.slice(0, -1)) : type === a);
}
var lang = (el) => textLocale(el);
function formatSize(el, bytes) {
  const units = ["byte", "kilobyte", "megabyte", "gigabyte"];
  let i = 0;
  let n = bytes;
  while (n >= 1000 && i < units.length - 1) {
    n /= 1000;
    i++;
  }
  return new Intl.NumberFormat(lang(el), {
    style: "unit",
    unit: units[i],
    unitDisplay: "short",
    maximumFractionDigits: i ? 1 : 0
  }).format(n);
}
var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
function setFiles(input, files) {
  const dt = new DataTransfer;
  for (const f of files)
    dt.items.add(f);
  input.files = dt.files;
}
function renderList(el) {
  const input = inputOf(el);
  const list = dfDollar8(el).find(".file-drop-list").get(0);
  if (!list)
    return;
  (el._urls || []).forEach((u) => URL.revokeObjectURL(u));
  el._urls = [];
  dfDollar8(list).empty().append([...input.files].map((file, i) => {
    const li = document.createElement("li");
    li.className = "file-drop-item";
    const thumb = document.createElement("span");
    thumb.className = "file-drop-thumb";
    thumb.setAttribute("aria-hidden", "true");
    if (file.type.startsWith("image/")) {
      const img = document.createElement("img");
      img.alt = "";
      img.src = URL.createObjectURL(file);
      el._urls.push(img.src);
      thumb.append(img);
    } else {
      thumb.textContent = (file.name.split(".").pop() || "file").slice(0, 4);
    }
    const name = document.createElement("div");
    name.className = "file-drop-name";
    name.textContent = file.name;
    const meta = document.createElement("span");
    meta.className = "file-drop-meta";
    meta.textContent = formatSize(el, file.size);
    name.append(meta);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "file-drop-remove";
    dfDollar8(remove).html(ICON_X);
    remove.setAttribute("aria-label", `Remove ${file.name}`);
    remove.addEventListener("click", () => {
      setFiles(input, [...input.files].filter((_, k) => k !== i));
      el._kept = [...input.files];
      apply(el, [], true);
      el._removing = true;
      input.dispatchEvent(new Event("change", { bubbles: true }));
      el._removing = false;
    });
    li.append(thumb, name, remove);
    return li;
  }));
}
function apply(el, rejected, quiet = false) {
  const input = inputOf(el);
  const err = dfDollar8(el).find(".file-drop-error").get(0);
  const message = rejected.length ? `Not added: ${rejected.map((r) => `${r.file.name} (${r.why})`).join(", ")}` : "";
  if (err) {
    err.textContent = message;
    err.setAttribute("role", "alert");
  }
  el.dataset.stateName = rejected.length ? "error" : input.files.length ? "selected" : "default";
  renderList(el);
  if (!quiet && rejected.length)
    el.dispatchEvent(new CustomEvent("file-drop:rejected", {
      bubbles: true,
      detail: { files: rejected.map((r) => r.file), message }
    }));
}
function onPick(el) {
  const input = inputOf(el);
  const incoming = [...input.files];
  const kept = input.multiple ? el._kept || [] : [];
  const maxSize = parseFloat(el.dataset.maxSize || "Infinity");
  const maxFiles = input.multiple ? parseFloat(el.dataset.maxFiles || "Infinity") : 1;
  const key = (f) => `${f.name}|${f.size}|${f.lastModified}`;
  const seen = new Set(kept.map(key));
  const out = [...kept];
  const rejected = [];
  for (const file of incoming) {
    if (seen.has(key(file)))
      continue;
    if (!accepts(input, file))
      rejected.push({ file, why: "type" });
    else if (file.size > maxSize)
      rejected.push({ file, why: `over ${formatSize(el, maxSize)}` });
    else if (out.length >= maxFiles)
      rejected.push({ file, why: `max ${maxFiles}` });
    else {
      out.push(file);
      seen.add(key(file));
    }
  }
  setFiles(input, out);
  el._kept = out;
  apply(el, rejected);
}
function applyMarkup8(el, stateName, config) {
  const err = dfDollar8(el).find(".file-drop-error").first();
  if (!err.get(0))
    return;
  err.attr("role", "alert");
  if (stateName === "error")
    err.text(config?.message || "Not added: archive.zip (type)");
  else if (stateName !== "dragover")
    err.text("");
}
function triggerStateChange8(el, stateName, config) {
  const input = inputOf(el);
  switch (stateName) {
    case "default":
      setFiles(input, []);
      el._kept = [];
      apply(el, [], true);
      break;
    case "dragover":
      el.dataset.stateName = "dragover";
      break;
    case "selected": {
      const files = (config?.files || [{ name: "report.pdf", size: 248000, type: "application/pdf" }]).map((f) => typeof f === "string" ? { name: f } : f).map((f) => new File([new Uint8Array(Math.min(f.size ?? 0, 5000000))], f.name, { type: f.type || "" }));
      setFiles(input, files);
      el._kept = [...input.files];
      apply(el, [], true);
      break;
    }
    case "error": {
      const err = dfDollar8(el).find(".file-drop-error").get(0);
      if (err)
        err.textContent = config?.message || "Not added: archive.zip (type)";
      el.dataset.stateName = "error";
      break;
    }
  }
}
var fileInputApi = componentState({
  component: "file-input",
  states: fileInputStates,
  apply: (el, state) => triggerStateChange8(el, state.name, state.config),
  read: (el, state) => {
    const input = inputOf(el);
    return {
      name: el.dataset.stateName || "default",
      config: {
        ...state.config,
        count: input.files.length,
        files: [...input.files].map((f) => f.name),
        ...el.dataset.stateName === "error" ? { message: dfDollar8(el).find(".file-drop-error").text() } : {}
      }
    };
  },
  markup: (el, state) => applyMarkup8(el, state.name, state.config)
});
df$8.fileInputApi = fileInputApi;
df$8.fileInputStates = fileInputStates;
function init8() {
  dfDollar8(".file-drop:not([data-init])").toArray().forEach((el) => {
    const input = inputOf(el);
    if (!input)
      return;
    el.dataset.init = "";
    el.dataset.stateName = "default";
    el._kept = [];
    dfDollar8(el).find(".file-drop-error").attr("role", "alert");
    bindComponent(el, fileInputApi);
    const zone = dfDollar8(el).find(".file-drop-zone").get(0) || el;
    let depth = 0;
    zone.addEventListener("dragenter", (e) => {
      if (!e.dataTransfer?.types.includes("Files") || input.disabled)
        return;
      depth++;
      el._before = el.dataset.stateName === "dragover" ? el._before : el.dataset.stateName;
      el.dataset.stateName = "dragover";
    });
    zone.addEventListener("dragleave", () => {
      depth = Math.max(0, depth - 1);
      if (!depth && el.dataset.stateName === "dragover")
        el.dataset.stateName = el._before || "default";
    });
    zone.addEventListener("drop", () => {
      depth = 0;
      if (el.dataset.stateName === "dragover")
        el.dataset.stateName = el._before || "default";
    });
    input.addEventListener("change", () => {
      if (!el._removing)
        onPick(el);
    });
  });
}
init8();
new MutationObserver(init8).observe(document, { childList: true, subtree: true });

// src/components/navigation/language-switcher/language-switcher.ts
var df$9 = defussGlobals();
var dfDollar9 = defussQuery();
var languageSwitcherStates = ["default", "open"];
var SEED = `af Afrikaans|Afrikaans|za
am Amharic|አማርኛ|et
ar Arabic|العربية|sa
bg Bulgarian|български|bg
bg-Latn Bulgarian (Latin)|bulgarski|bg
bn Bangla|বাংলা|bd
bs Bosnian|bosanski|ba
ca Catalan|català|es-ct
ceb Cebuano|Binisaya|ph
co Corsican|corsu|fr
cs Czech|čeština|cz
cy Welsh|Cymraeg|gb-wls
da Danish|dansk|dk
de German|Deutsch|de
el Greek|Ελληνικά|gr
el-Latn Greek (Latin)|Ellinika|gr
en English|English|gb
eo Esperanto|Esperanto|
es Spanish|español|es
et Estonian|eesti|ee
eu Basque|euskara|es-pv
fa Persian|فارسی|ir
fi Finnish|suomi|fi
fil Filipino|Filipino|ph
fr French|français|fr
fy Western Frisian|Frysk|nl
ga Irish|Gaeilge|ie
gd Scottish Gaelic|Gàidhlig|gb-sct
gl Galician|galego|es-ga
gu Gujarati|ગુજરાતી|in
ha Hausa|Hausa|ng
haw Hawaiian|ʻŌlelo Hawaiʻi|us
hi Hindi|हिन्दी|in
hi-Latn Hindi (Latin)|Hindi|in
hmn Hmong|Hmoob|la
hr Croatian|hrvatski|hr
ht Haitian Creole|Kreyòl ayisyen|ht
hu Hungarian|magyar|hu
hy Armenian|հայերեն|am
id Indonesian|Bahasa Indonesia|id
ig Igbo|Asụsụ Igbo|ng
is Icelandic|íslenska|is
it Italian|italiano|it
iw Hebrew|עברית|il
ja Japanese|日本語|jp
ja-Latn Japanese (Latin)|Nihongo|jp
jv Javanese|Basa Jawa|id
ka Georgian|ქართული|ge
kk Kazakh|қазақ тілі|kz
km Khmer|ខ្មែរ|kh
kn Kannada|ಕನ್ನಡ|in
ko Korean|한국어|kr
ku Kurdish|Kurdî|iq
ky Kyrgyz|кыргызча|kg
la Latin|Latina|va
lb Luxembourgish|Lëtzebuergesch|lu
lo Lao|ລາວ|la
lt Lithuanian|lietuvių|lt
lv Latvian|latviešu|lv
mg Malagasy|Malagasy|mg
mi Māori|Māori|nz
mk Macedonian|македонски|mk
ml Malayalam|മലയാളം|in
mn Mongolian|монгол|mn
mr Marathi|मराठी|in
ms Malay|Bahasa Melayu|my
mt Maltese|Malti|mt
my Burmese|မြန်မာ|mm
ne Nepali|नेपाली|np
nl Dutch|Nederlands|nl
no Norwegian|norsk|no
ny Nyanja|Chichewa|mw
pa Punjabi|ਪੰਜਾਬੀ|in
pl Polish|polski|pl
ps Pashto|پښتو|af
pt Portuguese|português|pt
ro Romanian|română|ro
ru Russian|русский|ru
ru-Latn Russian (Latin)|Russkiy|ru
sd Sindhi|سنڌي|pk
si Sinhala|සිංහල|lk
sk Slovak|slovenčina|sk
sl Slovenian|slovenščina|si
sm Samoan|Gagana Sāmoa|ws
sn Shona|chiShona|zw
so Somali|Soomaali|so
sq Albanian|shqip|al
sr Serbian|српски|rs
st Southern Sotho|Sesotho|ls
su Sundanese|Basa Sunda|id
sv Swedish|svenska|se
sw Swahili|Kiswahili|tz
ta Tamil|தமிழ்|in
te Telugu|తెలుగు|in
tg Tajik|тоҷикӣ|tj
th Thai|ไทย|th
tr Turkish|Türkçe|tr
uk Ukrainian|українська|ua
ur Urdu|اردو|pk
uz Uzbek|oʻzbekcha|uz
vi Vietnamese|Tiếng Việt|vn
xh Xhosa|isiXhosa|za
yi Yiddish|ייִדיש|il
yo Yoruba|Èdè Yorùbá|ng
zh Chinese|中文|cn
zh-Latn Chinese (Pinyin)|Zhōngwén|cn
zu Zulu|isiZulu|za`;
var RTL = new Set(["ar", "fa", "iw", "he", "ps", "sd", "ur", "yi"]);
var LANGUAGES = SEED.split(`
`).map((line) => {
  const sp = line.indexOf(" ");
  const code = line.slice(0, sp);
  const [english, native, region] = line.slice(sp + 1).split("|");
  return { code, english, native, region, dir: RTL.has(code) ? "rtl" : "ltr" };
});
var BY_CODE = new Map(LANGUAGES.map((l) => [l.code.toLowerCase(), l]));
var ALIAS = { he: "iw", nb: "no", tl: "fil" };
var settings = {
  flags: "https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/{shape}/{region}.svg"
};
var resolve3 = (t) => typeof t === "string" ? dfDollar9("#" + CSS.escape(t)).get(0) ?? dfDollar9(t).get(0) : t;
var esc4 = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
function partsOf(tag) {
  try {
    const l = new Intl.Locale(tag);
    return { language: l.language, script: l.script ?? "", region: (l.region ?? "").toLowerCase() };
  } catch {
    const [language = "", ...rest] = tag.split(/[-_]/);
    return {
      language: language.toLowerCase(),
      script: rest.find((p) => p.length === 4) ?? "",
      region: (rest.find((p) => p.length === 2) ?? "").toLowerCase()
    };
  }
}
function seedOf(tag) {
  const { language, script } = partsOf(tag);
  const lang = ALIAS[language] ?? language;
  return BY_CODE.get(tag.toLowerCase()) ?? (script ? BY_CODE.get(`${lang}-${script}`.toLowerCase()) : undefined) ?? BY_CODE.get(lang);
}
var capitalize = (name, locale) => {
  if (!name)
    return name;
  let first;
  try {
    first = name.charAt(0).toLocaleUpperCase(locale);
  } catch {
    first = name.charAt(0).toUpperCase();
  }
  return first + name.slice(1);
};
var displayCache = new Map;
function displayNames(locale, type) {
  const key = `${type}:${locale}`;
  if (!displayCache.has(key)) {
    let d = null;
    try {
      d = new Intl.DisplayNames([locale], { type, fallback: "none" });
      if (new Intl.Locale(d.resolvedOptions().locale).language !== partsOf(locale).language)
        d = null;
    } catch {
      d = null;
    }
    displayCache.set(key, d);
  }
  return displayCache.get(key) ?? null;
}
function cldrName(locale, type, code) {
  try {
    return displayNames(locale, type)?.of(code);
  } catch {
    return;
  }
}
function nameIn(tag, locale) {
  const seed = seedOf(tag);
  const { region } = partsOf(tag);
  const self = partsOf(locale).language === partsOf(tag).language;
  if (seed && !region && seed.code.toLowerCase() === tag.toLowerCase().replace(/^he$/, "iw")) {
    if (self)
      return capitalize(seed.native, tag);
    if (partsOf(locale).language === "en")
      return seed.english;
  }
  const n = cldrName(locale, "language", tag.replace(/^iw\b/, "he"));
  if (n && n.toLowerCase() !== tag.toLowerCase())
    return capitalize(n, locale);
  const base = seed ? self ? capitalize(seed.native, tag) : seed.english : tag;
  if (!region)
    return base;
  const regionName = cldrName(locale, "region", region.toUpperCase()) ?? region.toUpperCase();
  return `${base} (${regionName})`;
}
function regionFor(el, tag) {
  for (const pair of (el.dataset.flags || "").split(/\s+/).filter(Boolean)) {
    const [t, r] = pair.split(":");
    if (t && t.toLowerCase() === tag.toLowerCase())
      return (r || "").toLowerCase().replace(/[^a-z0-9-]/g, "");
  }
  return (partsOf(tag).region || seedOf(tag)?.region || "").replace(/[^a-z0-9-]/g, "");
}
var languagesOf = (el) => {
  const list = (el.dataset.languages || "en").split(/[\s,]+/).filter(Boolean);
  return list.length ? list : ["en"];
};
var valueOf = (el, languages = languagesOf(el)) => {
  const v = (el.dataset.value || "").toLowerCase();
  return languages.find((l) => l.toLowerCase() === v) ?? languages[0];
};
var nextOf = (el, tag) => {
  const languages = languagesOf(el);
  return languages[(languages.indexOf(tag) + 1) % languages.length];
};
var codeLabel = (tag) => {
  const { language, region } = partsOf(tag);
  return (region ? `${language}-${region}` : language).toUpperCase();
};
var dirOf = (tag) => RTL.has(partsOf(tag).language) ? "rtl" : "ltr";
var idPart2 = (tag) => tag.toLowerCase().replace(/[^a-z0-9-]/g, "-");
function flagHtml(el, tag) {
  if (el.dataset.flag === "none")
    return "";
  const region = regionFor(el, tag);
  const shape = ["square", "circle", "squircle"].includes(el.dataset.flagShape || "") ? "1x1" : "4x3";
  const url = region ? settings.flags.replace("{shape}", shape).replace("{region}", region) : "";
  const image = region ? ` data-region="${esc4(region)}" style="--language-switcher-flag: url('${esc4(url)}')"` : "";
  return `<span class="language-switcher-flag" data-code="${esc4(partsOf(tag).language.toUpperCase())}"${image} aria-hidden="true"></span>`;
}
var GLOBE = '<svg class="language-switcher-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>';
var CHEVRON = '<svg class="combobox-chevron" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>';
function faceHtml(el, tag) {
  const display = el.dataset.display || "label";
  const flag = flagHtml(el, tag) || (display === "icon" ? GLOBE : "");
  const text = display === "icon" ? "" : display === "code" ? codeLabel(tag) : el.dataset.names === "ui" ? nameIn(tag, valueOf(el)) : nameIn(tag, tag);
  return `${flag}${text ? `<span class="language-switcher-label" lang="${esc4(tag)}" dir="${dirOf(tag)}">${esc4(text)}</span>` : ""}`;
}
var labelOf = (el) => el.dataset.label || el.getAttribute("aria-label") || "Language";
var ariaOf = (el, tag) => `${labelOf(el)}: ${nameIn(tag, tag)}`;
function namesOf(el, tag, ui) {
  const own = nameIn(tag, tag), shown = nameIn(tag, ui);
  if (el.dataset.names === "native")
    return { name: own, lang: tag, alt: "", altLang: tag };
  if (el.dataset.names === "ui")
    return { name: shown, lang: ui, alt: shown === own ? "" : own, altLang: tag };
  return { name: own, lang: tag, alt: shown === own ? "" : shown, altLang: ui };
}
var optionInner = (el, tag, ui) => {
  const n = namesOf(el, tag, ui);
  return `${flagHtml(el, tag)}<span class="language-switcher-name" lang="${esc4(n.lang)}" dir="${dirOf(n.lang)}">${esc4(n.name)}</span><span class="language-switcher-alt" lang="${esc4(n.altLang)}" dir="${dirOf(n.altLang)}"${n.alt ? "" : " hidden"}>${esc4(n.alt)}</span>`;
};
function comboboxHtml(el, uid) {
  const languages = languagesOf(el);
  const value = valueOf(el, languages);
  const search = el.dataset.search || "Search languages...";
  const options = languages.map((tag) => `<div role="option" id="${uid}-${idPart2(tag)}" class="combobox-item language-switcher-option" data-value="${esc4(tag)}" aria-selected="${tag === value}">${optionInner(el, tag, value)}</div>`).join("");
  const icon = (el.dataset.display || "label") === "icon";
  return `<div class="combobox language-switcher-combobox" data-ce-chrome${el.dataset.size ? ` data-size="${esc4(el.dataset.size)}"` : ""}>
<button type="button" class="btn combobox-trigger" data-variant="${esc4(el.dataset.buttonVariant || "ghost")}"${icon ? ' data-size="icon"' : ""} aria-haspopup="listbox" aria-expanded="false" aria-label="${esc4(ariaOf(el, value))}" aria-controls="${uid}-popover"><span class="combobox-value">${faceHtml(el, value)}</span>${icon ? "" : CHEVRON}</button>
<div id="${uid}-popover" class="combobox-content language-switcher-content" popover>
<div class="combobox-search"${languages.length > 7 ? "" : " data-quiet"}><input class="combobox-search-input" type="text" role="combobox" autocomplete="off" aria-expanded="true" aria-controls="${uid}-listbox" aria-activedescendant="" aria-autocomplete="list" placeholder="${esc4(search)}" aria-label="${esc4(search)}"></div>
<div id="${uid}-listbox" role="listbox" class="combobox-listbox" aria-label="${esc4(labelOf(el))}"><div class="combobox-empty" hidden>${esc4(el.dataset.empty || "No language found.")}</div>${options}</div>
</div>
</div>`;
}
function swapHtml(el) {
  const value = valueOf(el);
  return `<label class="swap language-switcher-swap"${el.dataset.swap === "fade" ? "" : ` data-variant="${esc4(el.dataset.swap || "flip")}"`} data-ce-chrome${el.dataset.size ? ` data-size="${esc4(el.dataset.size)}"` : ""}>
<input type="checkbox" role="button" aria-label="${esc4(swapLabel(el, value))}">
<span class="swap-off">${faceHtml(el, value)}</span>
<span class="swap-on">${faceHtml(el, nextOf(el, value))}</span>
</label>`;
}
function menuHtml(el) {
  const value = valueOf(el);
  return `<div class="language-switcher-menu" data-ce-chrome>${languagesOf(el).map((tag) => `<button type="button" class="dropdown-item dropdown-radio language-switcher-item" role="menuitemradio" tabindex="-1" aria-checked="${tag === value}" data-value="${esc4(tag)}">${optionInner(el, tag, value)}</button>`).join("")}</div>`;
}
var swapLabel = (el, value) => {
  const next = nextOf(el, value);
  return `${ariaOf(el, value)} - ${el.dataset.next || "next"}: ${nameIn(next, next)}`;
};
var STRUCTURE = [
  "languages",
  "variant",
  "display",
  "names",
  "flag",
  "flags",
  "flagShape",
  "size",
  "buttonVariant",
  "search",
  "empty",
  "next",
  "swap"
];
var structureOf = (el) => STRUCTURE.map((k) => el.dataset[k] ?? "").join("|");
var chromeOf = (el) => dfDollar9(el).children("[data-ce-chrome]").get(0);
function draw2(el) {
  const uid = el.id ? `${el.id}-ls` : el._lsId ??= `language-switcher-${++sequence}`;
  const focused = el.contains(document.activeElement);
  dfDollar9(el).children("[data-ce-chrome]").remove();
  const variant = el.dataset.variant;
  dfDollar9(el).append(dfDollar9(variant === "swap" ? swapHtml(el) : variant === "menu" ? menuHtml(el) : comboboxHtml(el, uid)));
  el._lsStructure = structureOf(el);
  el._lsValue = valueOf(el);
  if (focused)
    dfDollar9(el).find('.combobox-trigger, .swap > input, .language-switcher-item[aria-checked="true"]').get(0)?.focus();
}
var sequence = 0;
function update(el) {
  if (el._lsStructure !== structureOf(el) || !chromeOf(el))
    return draw2(el);
  const value = valueOf(el);
  const changed = el._lsValue !== value;
  el._lsValue = value;
  const chrome = dfDollar9(chromeOf(el));
  if (el.dataset.variant === "swap") {
    const input = chrome.find(":scope > input").get(0);
    if (changed) {
      const [shown, hidden] = input.checked ? [".swap-on", ".swap-off"] : [".swap-off", ".swap-on"];
      chrome.find(`:scope > ${shown}`).html(faceHtml(el, value));
      chrome.find(`:scope > ${hidden}`).html(faceHtml(el, nextOf(el, value)));
    }
    dfDollar9(input).attr("aria-label", swapLabel(el, value));
    return;
  }
  if (el.dataset.variant === "menu") {
    if (!changed)
      return;
    chrome.find(".language-switcher-item").each((_i, item) => {
      const tag = item.dataset.value || "";
      dfDollar9(item).attr("aria-checked", String(tag === value)).html(optionInner(el, tag, value));
    });
    return;
  }
  chrome.find(".combobox-trigger").attr("aria-label", ariaOf(el, value));
  chrome.find('[role="listbox"]').attr("aria-label", labelOf(el));
  if (!changed)
    return;
  chrome.find(".combobox-value").html(faceHtml(el, value)).attr("data-placeholder", null);
  chrome.find(".language-switcher-option").each((_i, option) => {
    const tag = option.dataset.value || "";
    dfDollar9(option).attr("aria-selected", String(tag === value)).html(optionInner(el, tag, value));
  });
}
function choose(el, tag, announce = true) {
  const languages = languagesOf(el);
  const next = languages.find((l) => l.toLowerCase() === String(tag).toLowerCase());
  if (!next)
    return false;
  const previous = valueOf(el, languages);
  if (el.dataset.value !== next)
    dfDollar9(el).attr("data-value", next);
  update(el);
  if (announce && next !== previous)
    el.dispatchEvent(new CustomEvent("language-change", {
      bubbles: true,
      detail: { value: next, previous, name: nameIn(next, next), dir: dirOf(next) }
    }));
  return true;
}
var popoverOf = (el) => dfDollar9(el).find(":scope > .language-switcher-combobox > .combobox-content").get(0);
var isOpen = (el) => {
  try {
    return !!popoverOf(el)?.matches(":popover-open");
  } catch {
    return false;
  }
};
function applyMarkup9(el, _name, config) {
  const languages = languagesOf(el);
  const value = languages.find((l) => l.toLowerCase() === String(config?.value ?? "").toLowerCase());
  if (value)
    dfDollar9(el).attr("data-value", value);
}
function triggerStateChange9(el, name, config) {
  if (config?.value)
    choose(el, config.value, false);
  const popover = popoverOf(el);
  if (!popover)
    return;
  if (name === "open" && !isOpen(el))
    dfDollar9(el).find(".combobox-trigger").get(0)?.click();
  else if (name !== "open" && isOpen(el))
    popover.hidePopover();
}
var languageSwitcherApi = componentState({
  component: "language-switcher",
  states: languageSwitcherStates,
  mergeConfig: true,
  apply: (el, state) => triggerStateChange9(el, state.name, state.config),
  read: (el) => ({ name: isOpen(el) ? "open" : "default", config: { value: valueOf(el) } }),
  markup: (el, state) => applyMarkup9(el, state.name, state.config)
});
df$9.languageSwitcherApi = languageSwitcherApi;
df$9.languageSwitcherStates = languageSwitcherStates;
function init9() {
  dfDollar9(".language-switcher:not([data-init])").each((_i, el) => {
    el.dataset.init = "";
    if (!el.dataset.value || valueOf(el) !== el.dataset.value)
      dfDollar9(el).attr("data-value", valueOf(el));
    draw2(el);
    dfDollar9(el).on("combobox:change", (e) => {
      const value = e.detail?.values?.[0];
      el._lsValue = "";
      if (!value || !choose(el, value))
        update(el);
      languageSwitcherApi.commit(el, isOpen(el) ? "open" : "default", { value: valueOf(el) });
    });
    dfDollar9(el).on("change", (e) => {
      const input = e.target;
      if (!input.matches(".language-switcher-swap > input") || input.closest(".language-switcher") !== el)
        return;
      choose(el, nextOf(el, valueOf(el)));
      languageSwitcherApi.commit(el, "default", { value: valueOf(el) });
    });
    const pick = (item) => {
      const it = item;
      if (!it?.matches?.(".language-switcher-item") || it.closest(".language-switcher") !== el)
        return;
      el._lsValue = "";
      if (!choose(el, it.dataset.value || ""))
        update(el);
      languageSwitcherApi.commit(el, "default", { value: valueOf(el) });
    };
    dfDollar9(el).on("dropdown:select", (e) => pick(e.detail?.item));
    dfDollar9(el).on("click", (e) => {
      const item = e.target?.closest?.(".language-switcher-item");
      if (item && !item.closest('[role="menu"]'))
        pick(item);
    });
    dfDollar9(el).on("keydown", (e) => {
      const input = e.target;
      if (e.key !== "Enter" || !input.matches?.(".language-switcher-swap > input"))
        return;
      e.preventDefault();
      input.click();
    });
    el.addEventListener("toggle", () => languageSwitcherApi.commit(el, isOpen(el) ? "open" : "default", { value: valueOf(el) }), true);
    new MutationObserver(() => update(el)).observe(el, { attributes: true, attributeFilter: OBSERVED });
    bindComponent(el, languageSwitcherApi, { name: "default", config: { value: valueOf(el) } });
  });
}
var OBSERVED = [
  "data-value",
  "data-label",
  "aria-label",
  ...STRUCTURE.map((k) => "data-" + k.replace(/[A-Z]/g, (c) => "-" + c.toLowerCase()))
];
df$9.languageSwitcher = {
  languages: () => LANGUAGES.map((l) => ({ ...l })),
  name: (tag, locale) => nameIn(tag, locale ?? tag),
  region: (tag) => partsOf(tag).region || seedOf(tag)?.region || "",
  choose: (target, tag) => {
    const el = resolve3(target);
    if (!el || !choose(el, tag))
      return false;
    languageSwitcherApi.commit(el, isOpen(el) ? "open" : "default", { value: valueOf(el) });
    return true;
  },
  bind: (target, i18n) => {
    const el = resolve3(target);
    if (!el || !i18n)
      return () => {};
    const follow = (locale) => {
      if (locale && locale.toLowerCase() !== valueOf(el).toLowerCase() && choose(el, locale, false))
        languageSwitcherApi.commit(el, isOpen(el) ? "open" : "default", { value: valueOf(el) });
    };
    follow(i18n.locale);
    const onChange = (e) => {
      const value = e.detail.value;
      if (value !== i18n.locale)
        i18n.setLocale(value);
    };
    el.addEventListener("language-change", onChange);
    const stop = i18n.subscribe?.((snapshot) => follow(snapshot.locale));
    return () => {
      el.removeEventListener("language-change", onChange);
      stop?.();
    };
  },
  configure: (options) => {
    if (options?.flags)
      settings.flags = options.flags;
  }
};
init9();
new MutationObserver(init9).observe(document, { childList: true, subtree: true });

// src/components/forms-inputs/number-input/number-input.ts
var df$10 = defussGlobals();
var dfDollar10 = defussQuery();
var numberInputStates = ["default"];
var getInput = (wrapper) => dfDollar10(wrapper).find('input:not([type="hidden"])').get(0);
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
  dfDollar10(wrapper).find("input[data-number-output]").toArray().forEach((out) => {
    if (out.value === value)
      return;
    out.value = value;
    out.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
function placeCurrencySymbol(wrapper, input, cfg) {
  let unit = dfDollar10(wrapper).find(".number-input-unit").get(0);
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
function applyMarkup10(_el, _stateName) {}
function triggerStateChange10(wrapper, config) {
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
  apply: (wrapper, state) => triggerStateChange10(wrapper, state.config),
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
  markup: (el, state) => applyMarkup10(el, state.name)
});
df$10.numberInputApi = numberInputApi;
df$10.numberInputStates = numberInputStates;
function init10() {
  dfDollar10(".number-input:not([data-init])").toArray().forEach((wrapper) => {
    wrapper.dataset.init = "";
    bindComponent(wrapper, numberInputApi);
    const input = getInput(wrapper);
    const decBtn = dfDollar10(wrapper).find('[data-action="decrement"]').get(0);
    const incBtn = dfDollar10(wrapper).find('[data-action="increment"]').get(0);
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
      }).observe(wrapper, {
        attributes: true,
        attributeFilter: ["data-locale", "data-currency", "data-currency-display"]
      });
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
init10();
new MutationObserver(init10).observe(document, { childList: true, subtree: true });

// src/components/questionnaire/questionnaire/questionnaire.ts
var df$11 = defussGlobals();
var dfDollar11 = defussQuery();
var questionnaireStates = ["default", "answering", "review", "submitted"];
var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var stepsOf = (root) => dfDollar11(root).find(".questionnaire-step[data-step]").toArray();
var stepById = (root, id) => root._flow?.byId.get(id) ?? null;
var titleOf = (step) => (dfDollar11(step).find(".questionnaire-title").get(0)?.textContent ?? step.dataset.step).trim();
var controlsOf2 = (step) => dfDollar11(step).find("input[name], select[name], textarea[name]").toArray().filter((c) => c.type !== "hidden" || c.dataset.answer !== undefined);
var isEnd = (step) => !!step && step.hasAttribute("data-end");
function rulesOf(root) {
  let authored = {};
  const script = dfDollar11(root).find("script.questionnaire-rules").get(0);
  if (script) {
    try {
      authored = JSON.parse(script.textContent || "{}");
    } catch (error) {
      console.warn(`questionnaire #${root.id}: the rules are not JSON -`, error);
    }
  }
  const config = root._config || {};
  return {
    branches: { ...authored.branches, ...config.branches },
    validate: { ...authored.validate, ...config.validate }
  };
}
function readFlow(root) {
  const steps = stepsOf(root);
  const byId = new Map(steps.map((s) => [s.dataset.step, s]));
  const blocks = [];
  for (const step of steps) {
    const block = step.closest(".questionnaire-block");
    const id = block?.dataset.block || "";
    if (!blocks.some((b) => b.id === id))
      blocks.push({ id, title: block?.dataset.title || "", el: block });
  }
  root._flow = { steps, byId, blocks, rules: rulesOf(root), start: root.dataset.start || steps[0]?.dataset.step };
}
var operand2 = (value, answers) => value && typeof value === "object" && !Array.isArray(value) && ("field" in value) ? answers[value.field] : value;
var lower2 = (v) => String(v ?? "").toLowerCase();
function compare2(a, b) {
  const na = typeof a === "number" ? a : a === "" || a == null ? NaN : Number(a);
  const nb = typeof b === "number" ? b : b === "" || b == null ? NaN : Number(b);
  if (!Number.isNaN(na) && !Number.isNaN(nb))
    return na - nb;
  const sa = String(a);
  const sb = String(b);
  return sa < sb ? -1 : sa > sb ? 1 : 0;
}
var isEmpty = (v) => v === undefined || v === null || v === "" || Array.isArray(v) && v.length === 0;
function holds(cond, answers) {
  const v = answers[cond.field];
  const target = operand2(cond.value, answers);
  switch (cond.op) {
    case "answered":
      return !isEmpty(v);
    case "empty":
      return isEmpty(v);
    case "neq":
      return Array.isArray(v) ? !v.includes(target) : lower2(v) !== lower2(target);
    case "gt":
      return !isEmpty(v) && !isEmpty(target) && compare2(v, target) > 0;
    case "gte":
      return !isEmpty(v) && !isEmpty(target) && compare2(v, target) >= 0;
    case "lt":
      return !isEmpty(v) && !isEmpty(target) && compare2(v, target) < 0;
    case "lte":
      return !isEmpty(v) && !isEmpty(target) && compare2(v, target) <= 0;
    case "in":
      return (Array.isArray(target) ? target : [target]).some((t) => Array.isArray(v) ? v.includes(t) : lower2(v) === lower2(t));
    case "includes":
      return Array.isArray(v) ? v.includes(target) : lower2(v).includes(lower2(target));
    case "contains":
      return lower2(v).includes(lower2(target));
    case "startsWith":
      return lower2(v).startsWith(lower2(target));
    case "endsWith":
      return lower2(v).endsWith(lower2(target));
    default:
      return Array.isArray(v) ? v.includes(target) : lower2(v) === lower2(target);
  }
}
function when(rule, answers) {
  const w = rule.when ?? [];
  if (Array.isArray(w))
    return w.every((c) => holds(c, answers));
  if (Array.isArray(w.any))
    return w.any.some((c) => holds(c, answers));
  if (Array.isArray(w.all))
    return w.all.every((c) => holds(c, answers));
  return holds(w, answers);
}
function gotoOf(step, answers) {
  for (const control of controlsOf2(step)) {
    if ((control.type === "radio" || control.type === "checkbox") && control.dataset.goto) {
      const v = answers[control.name];
      if (Array.isArray(v) ? v.includes(control.value) : v === control.value || control.type === "checkbox" && v === true)
        return control.dataset.goto;
    }
    if (control.tagName === "SELECT") {
      const option = [...control.options].find((o) => o.value === answers[control.name] && o.dataset.goto);
      if (option)
        return option.dataset.goto;
    }
  }
  return null;
}
function nextOf2(root, stepId, answers) {
  const step = stepById(root, stepId);
  if (!step || isEnd(step))
    return null;
  const picked = gotoOf(step, answers);
  if (picked)
    return picked;
  for (const rule of root._flow.rules.branches[stepId] ?? [])
    if (when(rule, answers))
      return rule.goto;
  return defaultNext(root, step);
}
function defaultNext(root, step) {
  if (step.dataset.next)
    return step.dataset.next;
  const steps = root._flow.steps;
  return steps[steps.indexOf(step) + 1]?.dataset.step ?? null;
}
function edgesOf(root, step) {
  const out = [];
  const seen = new Set;
  const add = (to, label, kind) => {
    if (!to || seen.has(to))
      return;
    seen.add(to);
    out.push({ to, label, kind });
  };
  if (isEnd(step))
    return out;
  let exhaustive = false;
  const radios = controlsOf2(step).filter((c) => c.type === "radio");
  for (const c of controlsOf2(step)) {
    if ((c.type === "radio" || c.type === "checkbox") && c.dataset.goto)
      add(c.dataset.goto, choiceText(c), "choice");
    if (c.tagName === "SELECT") {
      for (const o of c.options)
        if (o.dataset.goto)
          add(o.dataset.goto, o.textContent.trim(), "choice");
    }
  }
  if (radios.length && radios.every((r) => r.dataset.goto) && radios.some((r) => r.required))
    exhaustive = true;
  for (const rule of root._flow.rules.branches[step.dataset.step] ?? [])
    add(rule.goto, ruleText(rule), "rule");
  if (!exhaustive)
    add(defaultNext(root, step), "", "next");
  return out;
}
var ruleText = (rule) => {
  const w = rule.when ?? [];
  const list = Array.isArray(w) ? w : w.any ?? w.all ?? [w];
  return list.map((c) => `${c.field} ${c.op ?? "eq"}${c.value === undefined ? "" : " " + (typeof c.value === "object" && c.value && "field" in c.value ? c.value.field : JSON.stringify(c.value))}`).join(Array.isArray(w) || w.all ? " and " : " or ");
};
function choiceText(control) {
  const label = control.closest("label") || control.id && dfDollar11(`label[for="${CSS.escape(control.id)}"]`).get(0);
  if (!label)
    return control.value;
  const own = dfDollar11(label).find(".questionnaire-choice-label").get(0);
  return (own ?? label).textContent.trim() || control.getAttribute("aria-label") || control.value;
}
function reachable(root, answers, skipped) {
  const seen = new Set;
  const stack = [root._flow.start];
  while (stack.length) {
    const id = stack.pop();
    if (!id || seen.has(id))
      continue;
    seen.add(id);
    const step = stepById(root, id);
    if (!step || isEnd(step))
      continue;
    if (skipped.includes(id))
      stack.push(defaultNext(root, step));
    else if (answeredStep(step, answers))
      stack.push(nextOf2(root, id, answers));
    else
      for (const e of edgesOf(root, step))
        stack.push(e.to);
  }
  return seen;
}
var answeredStep = (step, answers) => {
  const names = [...new Set(controlsOf2(step).map((c) => c.name))];
  return names.length === 0 || names.some((n) => !isEmpty(answers[n]));
};
function readStep(step) {
  const out = {};
  const groups = new Map;
  for (const c of controlsOf2(step)) {
    if (!groups.has(c.name))
      groups.set(c.name, []);
    groups.get(c.name).push(c);
  }
  for (const [name, list] of groups) {
    const first = list[0];
    let value;
    if (first.type === "radio")
      value = list.find((c) => c.checked)?.value ?? null;
    else if (first.type === "checkbox")
      value = list.length > 1 || first.dataset.multiple !== undefined ? list.filter((c) => c.checked).map((c) => c.value) : first.checked;
    else if (first.tagName === "SELECT" && first.multiple)
      value = [...first.selectedOptions].map((o) => o.value);
    else if (first.type === "number" || first.type === "range")
      value = first.value === "" ? null : Number(first.value);
    else
      value = first.value;
    out[name] = value;
  }
  return out;
}
function writeStep(step, answers) {
  for (const c of controlsOf2(step)) {
    const v = answers[c.name];
    if (c.type === "radio")
      c.checked = v === c.value;
    else if (c.type === "checkbox")
      c.checked = Array.isArray(v) ? v.includes(c.value) : v === true;
    else if (c.tagName === "SELECT" && c.multiple)
      for (const o of c.options)
        o.selected = Array.isArray(v) && v.includes(o.value);
    else
      c.value = v == null ? "" : String(v);
  }
}
function mergeAnswers(answers, stepAnswers) {
  const next = { ...answers };
  for (const [k, v] of Object.entries(stepAnswers)) {
    if (isEmpty(v) || v === false)
      delete next[k];
    else
      next[k] = v;
  }
  return next;
}
function clearStep(step, answers) {
  const next = { ...answers };
  for (const c of controlsOf2(step))
    delete next[c.name];
  writeStep(step, next);
  return next;
}
function invalidOf(root, step, answers) {
  for (const c of controlsOf2(step)) {
    if (!c.checkValidity())
      return { control: c, message: c.validationMessage };
  }
  const boxes = controlsOf2(step).filter((c) => c.type === "checkbox");
  const min = Number(step.dataset.min || 0);
  const max = Number(step.dataset.max || Infinity);
  if (boxes.length && (min || Number.isFinite(max))) {
    const n = boxes.filter((c) => c.checked).length;
    if (n < min)
      return { control: boxes[0], message: min === 1 ? "Choose at least one." : `Choose at least ${min}.` };
    if (n > max)
      return { control: boxes[0], message: `Choose at most ${max}.` };
  }
  const id = step.dataset.step;
  const rules = root._flow.rules.validate[id];
  if (Array.isArray(rules)) {
    for (const rule of rules) {
      const asserts = rule.assert ?? [];
      const ok = Array.isArray(asserts) ? asserts.every((c) => holds(c, answers)) : when({ when: asserts }, answers);
      if (!ok)
        return {
          control: rule.field ? controlsOf2(step).find((c) => c.name === rule.field) : null,
          message: rule.message || "Check this answer."
        };
    }
  } else if (typeof rules === "function") {
    const message = rules(answers, readStep(step));
    if (message)
      return { control: null, message: String(message) };
  }
  return null;
}
function errorEl(step) {
  let el = dfDollar11(step).find(".questionnaire-error").get(0);
  if (!el) {
    el = document.createElement("p");
    el.className = "questionnaire-error";
    el.id = `${step.closest(".questionnaire").id || "questionnaire"}-${step.dataset.step}-error`;
    el.setAttribute("role", "alert");
    el.hidden = true;
    dfDollar11(step).append(el);
  }
  return el;
}
function showInvalid(step, problem) {
  const el = errorEl(step);
  el.textContent = problem.message;
  el.hidden = false;
  step.setAttribute("aria-invalid", "true");
  step.setAttribute("aria-describedby", el.id);
  const target = problem.control || controlsOf2(step)[0];
  if (target) {
    target.setAttribute("aria-invalid", "true");
    target.focus({ preventScroll: false });
  }
}
function clearInvalid(step) {
  const el = dfDollar11(step).find(".questionnaire-error").get(0);
  if (el) {
    el.hidden = true;
    el.textContent = "";
  }
  step.removeAttribute("aria-invalid");
  for (const c of controlsOf2(step))
    c.removeAttribute("aria-invalid");
}
var cfgOf = (root) => root._walk;
function landed(root, walk) {
  if (walk.submitted)
    return "submitted";
  if (isEnd(stepById(root, walk.step)))
    return "review";
  return walk.index === 0 && walk.step === root._flow.start ? "default" : "answering";
}
function applyMarkup11(root, state) {
  const config = state.config || {};
  const steps = stepsOf(root);
  const start = root.dataset.start || steps[0]?.dataset.step;
  let current = config.step || start;
  if (state.name === "default")
    current = start;
  if (state.name === "review" && !isEnd(steps.find((s) => s.dataset.step === current)))
    current = steps.find((s) => s.hasAttribute("data-end"))?.dataset.step ?? current;
  const submitted = state.name === "submitted";
  const step = steps.find((s) => s.dataset.step === current);
  for (const s of steps)
    dfDollar11(s).attr("hidden", !submitted && s === step ? null : "");
  for (const block of dfDollar11(root).find(".questionnaire-block").toArray()) {
    dfDollar11(block).attr("hidden", !submitted && step && block.contains(step) ? null : "");
  }
  const button = (name) => dfDollar11(root).find(`[data-questionnaire="${name}"]`).toArray();
  const end = isEnd(step);
  for (const b of button("back"))
    dfDollar11(b).attr("hidden", submitted || state.name === "default" ? "" : null);
  for (const b of button("next"))
    dfDollar11(b).attr("hidden", submitted || end ? "" : null);
  for (const b of button("submit"))
    dfDollar11(b).attr("hidden", submitted || !end ? "" : null);
  for (const b of button("skip"))
    dfDollar11(b).attr("hidden", submitted || !step?.hasAttribute("data-optional") ? "" : null);
  for (const n of dfDollar11(root).find(".questionnaire-actions").toArray())
    dfDollar11(n).attr("hidden", submitted ? "" : null);
  for (const c of dfDollar11(root).find(".questionnaire-complete").toArray())
    dfDollar11(c).attr("hidden", submitted ? null : "");
  dfDollar11(root).attr("data-state", state.name);
}
function remainingFrom(root, id) {
  const queue = [[id, 0]];
  const seen = new Set([id]);
  while (queue.length) {
    const [at, d] = queue.shift();
    const step = stepById(root, at);
    if (!step || isEnd(step))
      return d;
    for (const e of edgesOf(root, step)) {
      if (!seen.has(e.to)) {
        seen.add(e.to);
        queue.push([e.to, d + 1]);
      }
    }
  }
  return 0;
}
function remainingBranches(root, id) {
  const seen = new Set;
  const stack = [id];
  while (stack.length) {
    const at = stack.pop();
    if (seen.has(at))
      continue;
    seen.add(at);
    const step = stepById(root, at);
    if (!step)
      continue;
    const out = edgesOf(root, step);
    if (out.length > 1)
      return true;
    for (const e of out)
      stack.push(e.to);
  }
  return false;
}
function renderProgress(root) {
  const host = dfDollar11(root).find(".questionnaire-progress").get(0);
  if (!host)
    return;
  const walk = cfgOf(root);
  if (!host._built) {
    host._built = true;
    const bar = document.createElement("progress");
    bar.className = "questionnaire-bar";
    bar.max = 100;
    const label = document.createElement("span");
    label.className = "questionnaire-progress-label";
    const blocks = document.createElement("ol");
    blocks.className = "questionnaire-blocks";
    for (const b of root._flow.blocks) {
      if (!b.title)
        continue;
      const li = document.createElement("li");
      li.className = "questionnaire-block-chip";
      li.dataset.block = b.id;
      li.textContent = b.title;
      blocks.append(li);
    }
    host.append(label, bar);
    if (blocks.children.length)
      host.append(blocks);
  }
  const done = walk.submitted ? walk.history.length : walk.index;
  const remaining = walk.submitted ? 0 : remainingFrom(root, walk.step);
  const endNow = isEnd(stepById(root, walk.step));
  const total = Math.max(1, done + remaining);
  const percent = walk.submitted || endNow ? 100 : Math.round(done / total * 100);
  const bar = dfDollar11(host).find(".questionnaire-bar").get(0);
  bar.value = percent;
  bar.setAttribute("aria-label", `${percent}% done`);
  const label = dfDollar11(host).find(".questionnaire-progress-label").get(0);
  const branchy = remainingBranches(root, walk.step);
  label.textContent = walk.submitted ? "Done" : endNow ? "Review your answers" : `Question ${done + 1} of ${branchy ? "about " : ""}${total}`;
  const currentBlock = stepById(root, walk.step)?.closest(".questionnaire-block")?.dataset.block;
  const visitedBlocks = new Set(walk.history.slice(0, walk.index).map((id) => stepById(root, id)?.closest(".questionnaire-block")?.dataset.block));
  for (const chip of dfDollar11(host).find(".questionnaire-block-chip").toArray()) {
    const id = chip.dataset.block;
    const status = walk.submitted ? "done" : id === currentBlock ? "current" : visitedBlocks.has(id) ? "done" : "upcoming";
    chip.dataset.status = status;
    if (status === "current")
      chip.setAttribute("aria-current", "step");
    else
      chip.removeAttribute("aria-current");
  }
}
function renderTrail(root) {
  const host = dfDollar11(root).find(".questionnaire-trail").get(0) || root.id && dfDollar11(`.questionnaire-trail[data-for="${CSS.escape(root.id)}"]`).get(0);
  if (!host)
    return;
  if (!root.contains(host) && !host._wired) {
    host._wired = true;
    host.addEventListener("click", (e) => {
      const go = e.target.closest?.("[data-questionnaire-go]")?.dataset.questionnaireGo;
      if (go)
        goTo(root, go);
    });
  }
  const walk = cfgOf(root);
  host.textContent = "";
  const list = document.createElement("ol");
  list.className = "questionnaire-trail-list";
  walk.history.forEach((id, i) => {
    const step = stepById(root, id);
    if (!step || isEnd(step))
      return;
    const li = document.createElement("li");
    li.dataset.status = i < walk.index ? "done" : i === walk.index ? "current" : "ahead";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "questionnaire-trail-item";
    button.dataset.questionnaireGo = id;
    if (i === walk.index)
      button.setAttribute("aria-current", "step");
    const q = document.createElement("span");
    q.className = "questionnaire-trail-question";
    q.textContent = titleOf(step);
    const a = document.createElement("span");
    a.className = "questionnaire-trail-answer";
    a.textContent = answerText2(root, step, walk.answers) || (walk.skipped.includes(id) ? "Skipped" : "—");
    button.append(q, a);
    li.append(button);
    list.append(li);
  });
  host.append(list);
}
function answerText2(root, step, answers) {
  const parts = [];
  const names = [...new Set(controlsOf2(step).map((c) => c.name))];
  for (const name of names) {
    const v = answers[name];
    if (isEmpty(v))
      continue;
    const controls = controlsOf2(step).filter((c) => c.name === name);
    const first = controls[0];
    if (first.type === "radio" || first.type === "checkbox") {
      const picked = controls.filter((c) => Array.isArray(v) ? v.includes(c.value) : v === c.value || v === true);
      parts.push(picked.map(choiceText).join(", "));
    } else if (first.tagName === "SELECT") {
      const values = Array.isArray(v) ? v : [v];
      parts.push([...first.options].filter((o) => values.includes(o.value)).map((o) => o.textContent.trim()).join(", "));
    } else
      parts.push(String(v));
  }
  return parts.filter(Boolean).join(" · ");
}
function renderSummary(root) {
  const walk = cfgOf(root);
  const step = stepById(root, walk.step);
  const host = step && dfDollar11(step).find(".questionnaire-summary").get(0);
  if (!host)
    return;
  host.textContent = "";
  const list = document.createElement("dl");
  list.className = "questionnaire-summary-list";
  for (const id of walk.history.slice(0, walk.index)) {
    const s = stepById(root, id);
    if (!s || isEnd(s) || !controlsOf2(s).length)
      continue;
    const row = document.createElement("div");
    row.className = "questionnaire-summary-row";
    const dt = document.createElement("dt");
    dt.textContent = titleOf(s);
    const dd = document.createElement("dd");
    const text = document.createElement("span");
    text.textContent = answerText2(root, s, walk.answers) || "Skipped";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "questionnaire-edit";
    edit.dataset.questionnaireGo = id;
    edit.textContent = "Edit";
    edit.setAttribute("aria-label", `Edit: ${titleOf(s)}`);
    dd.append(text, edit);
    row.append(dt, dd);
    list.append(row);
  }
  host.append(list);
}
function notify(root, text, action) {
  let host = dfDollar11(root).find(".questionnaire-notice").get(0);
  if (!host) {
    host = document.createElement("div");
    host.className = "questionnaire-notice";
    host.setAttribute("role", "status");
    const first = dfDollar11(root).find(".questionnaire-block, .questionnaire-step").get(0);
    if (first)
      dfDollar11(first).before(host);
    else
      dfDollar11(root).append(host);
  }
  host.textContent = "";
  if (!text) {
    host.hidden = true;
    return;
  }
  host.hidden = false;
  const span = document.createElement("span");
  span.textContent = text;
  host.append(span);
  if (action) {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "questionnaire-notice-action";
    b.dataset.questionnaire = action.name;
    b.textContent = action.label;
    host.append(b);
  }
}
function keyHints(root) {
  if (root.dataset.shortcuts === "none")
    return;
  for (const step of root._flow.steps) {
    const choices = dfDollar11(step).find(".questionnaire-choice").toArray();
    choices.forEach((choice, i) => {
      if (!choice.dataset.key)
        choice.dataset.key = root.dataset.shortcuts === "digits" ? String(i + 1) : LETTERS[i] ?? "";
    });
  }
}
function paint(root) {
  renderProgress(root);
  renderTrail(root);
  renderSummary(root);
}
function record(root, name) {
  const walk = cfgOf(root);
  const config = {
    step: walk.step,
    answers: walk.answers,
    history: walk.history,
    index: walk.index,
    skipped: walk.skipped
  };
  if (root.store)
    questionnaireApi.commit(root, name ?? landed(root, walk), config);
  if (root._draft)
    root._draft.set(walk.submitted ? null : config);
}
function show(root, id, focus = true) {
  const walk = cfgOf(root);
  const step = stepById(root, id);
  if (!step)
    return;
  walk.step = id;
  walk.entered = readStep(step);
  const name = landed(root, walk);
  applyMarkup11(root, { name, config: { step: id } });
  root.dataset.stateName = name;
  clearInvalid(step);
  paint(root);
  if (focus) {
    const target = controlsOf2(step).find((c) => c.type !== "radio" || c.checked) || controlsOf2(step)[0] || dfDollar11(root).find('[data-questionnaire="submit"]').get(0);
    target?.focus({ preventScroll: true });
    step.scrollIntoView?.({ block: "nearest" });
  }
}
function advance(root, { skip = false } = {}) {
  const walk = cfgOf(root);
  const step = stepById(root, walk.step);
  if (!step || isEnd(step))
    return false;
  const before = walk.answers;
  const mine = readStep(step);
  let answers = skip ? clearStep(step, before) : mergeAnswers(before, mine);
  if (!skip) {
    const problem = invalidOf(root, step, answers);
    if (problem) {
      showInvalid(step, problem);
      root.dispatchEvent(new CustomEvent("questionnaire-invalid", {
        bubbles: true,
        detail: { step: walk.step, message: problem.message }
      }));
      return false;
    }
  }
  clearInvalid(step);
  const skipped = skip ? [...new Set([...walk.skipped, walk.step])] : walk.skipped.filter((s) => s !== walk.step);
  const was = mergeAnswers({}, walk.entered || {});
  const now = mergeAnswers({}, skip ? {} : mine);
  const changed = Object.keys({ ...was, ...now }).filter((k) => JSON.stringify(was[k]) !== JSON.stringify(now[k]));
  const to = skip ? defaultNext(root, step) : nextOf2(root, walk.step, answers);
  if (!to || !stepById(root, to)) {
    console.warn(`questionnaire #${root.id}: step "${walk.step}" leads nowhere (${to ?? "no next step"})`);
    return false;
  }
  const ahead = walk.history[walk.index + 1];
  let history = walk.history;
  if (ahead !== to || changed.length)
    history = [...walk.history.slice(0, walk.index + 1), to];
  const cleared = [];
  if (changed.length) {
    for (const s of root._flow.steps) {
      const deps = (s.dataset.dependsOn || "").split(",").map((x) => x.trim()).filter(Boolean);
      if (s !== step && deps.some((d) => changed.includes(d)) && answeredStep(s, answers) && controlsOf2(s).length) {
        answers = clearStep(s, answers);
        cleared.push(s.dataset.step);
      }
    }
    const path = reachable(root, answers, skipped);
    for (const s of root._flow.steps) {
      const id = s.dataset.step;
      if (path.has(id) || !controlsOf2(s).length || !answeredStep(s, answers) || cleared.includes(id))
        continue;
      answers = clearStep(s, answers);
      cleared.push(id);
    }
  }
  walk.answers = answers;
  walk.skipped = skipped.filter((s) => !cleared.includes(s));
  walk.history = history;
  walk.index += 1;
  if (cleared.length) {
    notify(root, `${cleared.length === 1 ? "1 later answer was" : cleared.length + " later answers were"} cleared - they depended on "${titleOf(step)}".`);
    root.dispatchEvent(new CustomEvent("questionnaire-invalidate", {
      bubbles: true,
      detail: { cause: walk.step, changed, cleared }
    }));
  } else
    notify(root, "");
  show(root, to);
  record(root);
  root.dispatchEvent(new CustomEvent("questionnaire-step", {
    bubbles: true,
    detail: { step: to, from: history[walk.index - 1], answers }
  }));
  return true;
}
function back(root) {
  const walk = cfgOf(root);
  if (walk.index <= 0)
    return false;
  const step = stepById(root, walk.step);
  if (step && !isEnd(step))
    walk.answers = mergeAnswers(walk.answers, readStep(step));
  walk.index -= 1;
  show(root, walk.history[walk.index]);
  record(root);
  return true;
}
function goTo(root, id) {
  const walk = cfgOf(root);
  const at = walk.history.indexOf(id);
  if (at < 0)
    return false;
  walk.index = at;
  show(root, id);
  record(root);
  return true;
}
function restart(root) {
  const walk = cfgOf(root);
  for (const s of root._flow.steps)
    writeStep(s, {});
  walk.answers = {};
  walk.history = [root._flow.start];
  walk.index = 0;
  walk.skipped = [];
  walk.submitted = false;
  notify(root, "");
  show(root, root._flow.start);
  record(root, "default");
}
async function submit(root) {
  const walk = cfgOf(root);
  if (!isEnd(stepById(root, walk.step)))
    return advance(root);
  const path = new Set(walk.history.slice(0, walk.index + 1));
  const names = new Set(root._flow.steps.filter((s) => path.has(s.dataset.step)).flatMap((s) => controlsOf2(s).map((c) => c.name)));
  const answers = Object.fromEntries(Object.entries(walk.answers).filter(([k]) => names.has(k)));
  const onSubmit = root._config?.onSubmit;
  root.toggleAttribute("data-busy", true);
  try {
    if (onSubmit)
      await onSubmit(answers, { history: walk.history.slice(0, walk.index + 1) });
  } catch (error) {
    root.removeAttribute("data-busy");
    notify(root, `Could not send: ${error?.message || error}`);
    return false;
  }
  root.removeAttribute("data-busy");
  walk.submitted = true;
  applyMarkup11(root, { name: "submitted", config: { step: walk.step } });
  root.dataset.stateName = "submitted";
  notify(root, "");
  paint(root);
  record(root, "submitted");
  root.dispatchEvent(new CustomEvent("questionnaire-submit", {
    bubbles: true,
    detail: { answers, history: walk.history.slice(0, walk.index + 1) }
  }));
  return true;
}
function triggerStateChange11(root, state, incoming) {
  const walk = cfgOf(root);
  if (!walk)
    return;
  if (incoming.answers && typeof incoming.answers === "object") {
    walk.answers = { ...incoming.answers };
    for (const s of root._flow.steps)
      writeStep(s, walk.answers);
  }
  walk.submitted = false;
  const go = (id) => {
    if (!stepById(root, id))
      return;
    const at = walk.history.indexOf(id);
    if (at >= 0)
      walk.index = at;
    else {
      walk.history = [...walk.history.slice(0, walk.index + 1), id];
      walk.index = walk.history.length - 1;
    }
    walk.step = id;
  };
  switch (state.name) {
    case "default":
      walk.index = 0;
      walk.history = walk.history.length ? walk.history : [root._flow.start];
      walk.step = walk.history[0];
      break;
    case "answering":
      if (incoming.step)
        go(incoming.step);
      else if (walk.index === 0)
        go(nextOf2(root, walk.step, walk.answers) || defaultNext(root, stepById(root, walk.step)));
      break;
    case "review": {
      const end = incoming.step && isEnd(stepById(root, incoming.step)) ? incoming.step : root._flow.steps.find(isEnd)?.dataset.step;
      if (end)
        go(end);
      break;
    }
    case "submitted":
      walk.submitted = true;
      break;
  }
  const name = landed(root, walk);
  applyMarkup11(root, { name, config: { step: walk.step } });
  root.dataset.stateName = name;
  paint(root);
  if (root._draft)
    root._draft.set(walk.submitted ? null : { step: walk.step, answers: walk.answers, history: walk.history, index: walk.index, skipped: walk.skipped });
}
var questionnaireApi = componentState({
  component: "questionnaire",
  states: questionnaireStates,
  mergeConfig: true,
  apply: (root, state, _previous, incoming) => triggerStateChange11(root, state, incoming),
  read: (root, state) => {
    const walk = cfgOf(root);
    if (!walk)
      return state;
    return {
      name: landed(root, walk),
      config: {
        ...state.config,
        step: walk.step,
        answers: walk.answers,
        history: walk.history,
        index: walk.index,
        skipped: walk.skipped
      }
    };
  },
  markup: (el, state) => applyMarkup11(el, state)
});
df$11.questionnaireApi = questionnaireApi;
df$11.questionnaireStates = questionnaireStates;
function analyze(root) {
  const errors = [];
  const warnings = [];
  const steps = root._flow.steps;
  const ids = new Set(steps.map((s) => s.dataset.step));
  const edges = new Map(steps.map((s) => [s.dataset.step, edgesOf(root, s)]));
  const start = root._flow.start;
  if (!ids.has(start))
    errors.push(`the start step "${start}" does not exist`);
  for (const [from, list] of edges)
    for (const e of list)
      if (!ids.has(e.to))
        errors.push(`"${from}" leads to "${e.to}", which does not exist`);
  for (const s of steps)
    if (!isEnd(s) && !(edges.get(s.dataset.step) || []).length)
      errors.push(`"${s.dataset.step}" is a dead end - give it a next step or data-end`);
  if (!steps.some(isEnd))
    errors.push("no step is an end (data-end)");
  const color = new Map;
  const stack = [];
  const visit = (id) => {
    color.set(id, 1);
    stack.push(id);
    for (const e of edges.get(id) || []) {
      if (!ids.has(e.to))
        continue;
      if (color.get(e.to) === 1)
        errors.push(`a cycle: ${[...stack.slice(stack.indexOf(e.to)), e.to].join(" → ")}`);
      else if (!color.get(e.to))
        visit(e.to);
    }
    stack.pop();
    color.set(id, 2);
  };
  if (ids.has(start))
    visit(start);
  for (const s of steps)
    if (!color.get(s.dataset.step))
      warnings.push(`"${s.dataset.step}" is unreachable from "${start}"`);
  if (ids.has(start) && ![...color.keys()].some((id) => isEnd(stepById(root, id))))
    errors.push(`no end can be reached from "${start}"`);
  const fieldOwner = new Map;
  for (const s of steps)
    for (const c of controlsOf2(s))
      fieldOwner.set(c.name, s.dataset.step);
  const fieldsIn = (w) => (Array.isArray(w) ? w : w?.any ?? w?.all ?? (w ? [w] : [])).flatMap((c) => [c.field, c.value && typeof c.value === "object" && "field" in c.value ? c.value.field : null]).filter(Boolean);
  for (const [id, rules] of Object.entries(root._flow.rules.branches)) {
    if (!ids.has(id))
      errors.push(`branches for "${id}", which does not exist`);
    for (const rule of rules)
      for (const f of fieldsIn(rule.when))
        if (!fieldOwner.has(f))
          errors.push(`a branch on "${id}" reads "${f}", which no step asks`);
  }
  for (const [id, rules] of Object.entries(root._flow.rules.validate)) {
    if (!ids.has(id))
      errors.push(`validation for "${id}", which does not exist`);
    if (Array.isArray(rules)) {
      for (const rule of rules)
        for (const f of fieldsIn(rule.assert))
          if (!fieldOwner.has(f))
            errors.push(`an assertion on "${id}" reads "${f}", which no step asks`);
    }
  }
  for (const s of steps)
    for (const d of (s.dataset.dependsOn || "").split(",").map((x) => x.trim()).filter(Boolean)) {
      if (!fieldOwner.has(d))
        errors.push(`"${s.dataset.step}" depends on "${d}", which no step asks`);
    }
  {
    const reach = [...color.keys()];
    const preds = new Map(reach.map((id) => [id, []]));
    for (const id of reach)
      for (const e of edges.get(id) || [])
        if (preds.has(e.to))
          preds.get(e.to).push(id);
    const all = new Set(reach);
    const dom = new Map(reach.map((id) => [id, id === start ? new Set([start]) : new Set(all)]));
    for (let changed = true;changed; ) {
      changed = false;
      for (const id of reach) {
        if (id === start)
          continue;
        const ps = preds.get(id);
        const inter = new Set(ps.length ? ps.map((p) => dom.get(p)).reduce((a, b) => new Set([...a].filter((x) => b.has(x)))) : []);
        inter.add(id);
        if (inter.size !== dom.get(id).size) {
          dom.set(id, inter);
          changed = true;
        }
      }
    }
    const required = (id) => controlsOf2(stepById(root, id)).filter((c) => c.required).map((c) => c.name);
    const guaranteed = (id) => new Set([...dom.get(id) ?? []].filter((d) => d !== id).flatMap(required));
    const reads = (id, field, what) => {
      if (fieldOwner.has(field) && fieldOwner.get(field) !== id && dom.has(id) && !guaranteed(id).has(field))
        warnings.push(`${what} on "${id}" reads "${field}" - a path can reach "${id}" without it`);
    };
    for (const [id, rules] of Object.entries(root._flow.rules.branches))
      for (const rule of rules)
        for (const f of fieldsIn(rule.when))
          reads(id, f, "a branch");
    for (const [id, rules] of Object.entries(root._flow.rules.validate))
      if (Array.isArray(rules))
        for (const rule of rules)
          for (const f of fieldsIn(rule.assert))
            reads(id, f, "an assertion");
  }
  const nodes = steps.map((s) => ({
    id: s.dataset.step,
    title: titleOf(s),
    end: isEnd(s),
    block: s.closest(".questionnaire-block")?.dataset.block || ""
  }));
  const list = [...edges].flatMap(([from, l]) => l.map((e) => ({ from, ...e })));
  return {
    ok: errors.length === 0,
    errors: [...new Set(errors)],
    warnings: [...new Set(warnings)],
    nodes,
    edges: list
  };
}
function toMermaid(root) {
  const { nodes, edges } = analyze(root);
  const walk = cfgOf(root);
  const visited = new Set(walk ? walk.history.slice(0, walk.index + 1) : []);
  const safe = (id) => "q_" + id.replace(/[^A-Za-z0-9_]/g, "_");
  const text = (t) => t.replace(/["\n]/g, " ").slice(0, 48);
  const lines = ["flowchart TD"];
  for (const n of nodes)
    lines.push(`  ${safe(n.id)}${n.end ? `(["${text(n.title)}"])` : `["${text(n.title)}"]`}`);
  const styled = [];
  edges.forEach((e, i) => {
    lines.push(`  ${safe(e.from)} -->${e.label ? `|"${text(e.label)}"|` : ""} ${safe(e.to)}`);
    const a = walk?.history.indexOf(e.from) ?? -1;
    if (a >= 0 && a < (walk?.index ?? 0) && walk.history[a + 1] === e.to)
      styled.push(i);
  });
  lines.push("  classDef visited stroke-width:2px;");
  lines.push("  classDef current stroke-width:3px,stroke-dasharray:4 2;");
  const done = [...visited].filter((id) => id !== walk?.step);
  if (done.length)
    lines.push(`  class ${done.map(safe).join(",")} visited;`);
  if (walk)
    lines.push(`  class ${safe(walk.step)} current;`);
  if (styled.length)
    lines.push(`  linkStyle ${styled.join(",")} stroke-width:3px;`);
  return lines.join(`
`);
}
function toDiagram(root, { title = "" } = {}) {
  const { nodes, edges } = analyze(root);
  const walk = cfgOf(root);
  const start = root._flow.start;
  const rank = new Map([[start, 0]]);
  for (let pass = 0;pass <= nodes.length; pass++) {
    let moved = false;
    for (const e of edges) {
      if (!rank.has(e.from))
        continue;
      const r = rank.get(e.from) + 1;
      if ((rank.get(e.to) ?? -1) < r) {
        rank.set(e.to, r);
        moved = true;
      }
    }
    if (!moved)
      break;
  }
  let bottom = Math.max(0, ...rank.values());
  for (const n of nodes)
    if (!rank.has(n.id))
      rank.set(n.id, ++bottom);
  const rows = new Map;
  for (const n of nodes) {
    const r = rank.get(n.id);
    if (!rows.has(r))
      rows.set(r, []);
    rows.get(r).push(n.id);
  }
  const cols = Math.max(1, ...[...rows.values()].map((ids) => ids.length));
  const col = new Map;
  for (const ids of rows.values())
    ids.forEach((id, i) => col.set(id, Math.floor((cols - ids.length) / 2) + i + 1));
  const taken = walk ? walk.history.slice(0, walk.index + 1) : [];
  const walked = new Set(taken.slice(1).map((to, i) => `${taken[i]}->${to}`));
  const last = taken.length > 1 ? `${taken[taken.length - 2]}->${taken[taken.length - 1]}` : "";
  return {
    type: "flow",
    ...title ? { title } : {},
    cols,
    interactive: true,
    nodes: nodes.map((n) => ({
      id: n.id,
      name: n.title || n.id,
      ...n.id === start ? { eyebrow: "Start" } : n.end ? { eyebrow: "End" } : {},
      col: col.get(n.id),
      row: rank.get(n.id) + 1,
      ...n.end ? { shape: "pill" } : {},
      ...walk && n.id === walk.step ? { tone: "accent" } : taken.includes(n.id) ? { tone: "muted" } : {}
    })),
    edges: edges.map((e) => {
      const ref = `${e.from}->${e.to}`;
      return {
        from: e.from,
        to: e.to,
        ...e.label ? { label: e.label } : {},
        ...rank.get(e.to) - rank.get(e.from) > 1 && col.get(e.to) === col.get(e.from) ? { curve: "around" } : {},
        ...walked.has(ref) ? { tone: "accent" } : { line: "dashed" },
        ...ref === last ? { flow: true } : {}
      };
    })
  };
}
function linkDiagram(root, figure) {
  const diagram = df$11.diagram;
  if (!diagram?.build)
    throw new Error("questionnaire.linkDiagram: the diagram component is not loaded (df$.shadcn.diagram)");
  figure._questionnaireUnlink?.();
  let syncing = false;
  let drawn = "";
  const focus = () => {
    syncing = true;
    try {
      if (figure.api?.getState().name === "active")
        figure.api.setState("default");
    } finally {
      syncing = false;
    }
  };
  const draw = () => {
    const walk = cfgOf(root);
    if (!walk)
      return;
    const key = `${walk.step}|${walk.history.join(",")}|${walk.index}`;
    if (key === drawn)
      return;
    drawn = key;
    diagram.build(figure, toDiagram(root, { title: figure.getAttribute("aria-label") || "" }));
    focus();
  };
  const refuse = (to, reason) => {
    const walk = cfgOf(root);
    focus();
    const step = stepById(root, walk.step);
    const target = stepById(root, to);
    if (reason === "unreached")
      notify(root, `"${target ? titleOf(target) : to}" is not reachable yet - answer "${step ? titleOf(step) : walk.step}" first.`);
    root.dispatchEvent(new CustomEvent("questionnaire-jump-refused", {
      bubbles: true,
      detail: { to, step: walk.step, reason }
    }));
  };
  const onActivate = (e) => {
    if (syncing)
      return;
    const walk = cfgOf(root);
    const to = e.detail?.kind === "node" ? e.detail.ref : null;
    if (!walk || !to || to === walk.step)
      return void focus();
    if (walk.history.includes(to))
      return void goTo(root, to);
    const step = stepById(root, walk.step);
    const answers = step && !isEnd(step) ? mergeAnswers(walk.answers, readStep(step)) : walk.answers;
    if (to === nextOf2(root, walk.step, answers)) {
      if (!advance(root))
        refuse(to, "invalid");
      return;
    }
    refuse(to, "unreached");
  };
  dfDollar11(figure).on("diagram-activate", onActivate);
  const off = root.store.subscribe(draw);
  draw();
  const unlink = () => {
    off?.();
    dfDollar11(figure).off("diagram-activate", onActivate);
    delete figure._questionnaireUnlink;
  };
  figure._questionnaireUnlink = unlink;
  return unlink;
}
var resolve4 = (target) => typeof target === "string" ? dfDollar11(target).get(0) : target;
df$11.questionnaire = {
  configure(target, config = {}) {
    const root = resolve4(target);
    root._config = { ...root._config, ...config };
    if (root._flow)
      root._flow.rules = rulesOf(root);
    if (config.persist && root._walk)
      attachDraft(root, config.persist);
  },
  next: (target) => advance(resolve4(target)),
  test: (condition, answers) => when({ when: condition }, answers ?? {}),
  back: (target) => back(resolve4(target)),
  skip: (target) => advance(resolve4(target), { skip: true }),
  goTo: (target, id) => goTo(resolve4(target), id),
  restart: (target) => restart(resolve4(target)),
  submit: (target) => submit(resolve4(target)),
  answers: (target) => ({ ...cfgOf(resolve4(target))?.answers }),
  history: (target) => {
    const walk = cfgOf(resolve4(target));
    return walk ? walk.history.slice(0, walk.index + 1) : [];
  },
  nextOf: (target, stepId, answers) => nextOf2(resolve4(target), stepId, answers ?? cfgOf(resolve4(target)).answers),
  analyze: (target) => analyze(resolve4(target)),
  toMermaid: (target) => toMermaid(resolve4(target)),
  toDiagram: (target, options) => toDiagram(resolve4(target), options),
  linkDiagram: (target, figure) => linkDiagram(resolve4(target), resolve4(figure))
};
function attachDraft(root, config) {
  root._draft?.destroy();
  const where = viewPersistence(root, "questionnaire", String(dfDollar11(".questionnaire").toArray().indexOf(root)), config || {});
  root._draft = where ? persisted(where.key, null, {
    area: where.area,
    validate: (v) => v === null || typeof v === "object" && !Array.isArray(v)
  }) : null;
  return root._draft?.value ?? null;
}
var lastActive = null;
var TYPING = 'input[type="text"], input[type="email"], input[type="number"], input[type="search"], input[type="url"], input[type="tel"], input[type="password"], input[type="date"], input:not([type]), textarea, select, [contenteditable]';
function onKey(e) {
  if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || e.isComposing)
    return;
  const t = e.target;
  let root = t.closest?.(".questionnaire");
  const onPage = !root && (t === document.body || t === document.documentElement || t === document);
  if (!root && !onPage)
    return;
  if (!root) {
    const live = dfDollar11(".questionnaire[data-init]").toArray().filter((q) => q._walk && !q._walk.submitted && q.checkVisibility());
    root = live.includes(lastActive) ? lastActive : live.length === 1 ? live[0] : null;
  }
  if (!root?._walk || root._walk.submitted || t.matches?.(TYPING))
    return;
  const step = stepById(root, root._walk.step);
  if (!step)
    return;
  if (e.key === "Enter" && onPage) {
    e.preventDefault();
    if (isEnd(step))
      submit(root);
    else
      advance(root);
    return;
  }
  if (root.dataset.shortcuts === "none" || e.key.length !== 1)
    return;
  const key = e.key.toLowerCase();
  let input = null;
  const choice = dfDollar11(step).find(".questionnaire-choice").toArray().find((c) => c.dataset.key?.toLowerCase() === key);
  if (choice)
    input = dfDollar11(choice).find('input[type="radio"], input[type="checkbox"]').get(0);
  else if (/^[1-9]$/.test(key) && !dfDollar11(step).find(".questionnaire-choice").get(0)) {
    input = dfDollar11(step).find('input[type="radio"]').toArray()[Number(key) - 1] ?? null;
  }
  if (!input || input.disabled)
    return;
  e.preventDefault();
  lastActive = root;
  input.click();
  input.focus({ preventScroll: true });
}
if (!document.__questionnaireKeys) {
  document.__questionnaireKeys = true;
  document.addEventListener("keydown", onKey);
}
function init11() {
  dfDollar11(".questionnaire:not([data-init])").toArray().forEach((root) => {
    root.dataset.init = "";
    readFlow(root);
    if (!root._flow.steps.length)
      return;
    root.setAttribute("novalidate", "");
    keyHints(root);
    root._walk = {
      step: root._flow.start,
      answers: {},
      history: [root._flow.start],
      index: 0,
      skipped: [],
      submitted: false
    };
    const draft = attachDraft(root, root._config?.persist);
    let restored = false;
    if (draft && draft.history?.length && stepById(root, draft.step)) {
      const walk = root._walk;
      walk.answers = draft.answers || {};
      walk.history = draft.history.filter((id) => stepById(root, id));
      walk.index = Math.min(Math.max(0, draft.index ?? 0), walk.history.length - 1);
      walk.step = walk.history[walk.index];
      walk.skipped = draft.skipped || [];
      for (const s of root._flow.steps)
        writeStep(s, walk.answers);
      restored = walk.index > 0 || Object.keys(walk.answers).length > 0;
    }
    const analysis = analyze(root);
    if (!analysis.ok)
      console.warn(`questionnaire #${root.id || "?"}: the flow has problems -`, analysis.errors);
    root.toggleAttribute("data-flow-invalid", !analysis.ok);
    root.addEventListener("submit", (e) => {
      e.preventDefault();
      const action = e.submitter?.dataset.questionnaire;
      if (action === "skip")
        advance(root, { skip: true });
      else if (action === "back")
        back(root);
      else if (isEnd(stepById(root, cfgOf(root).step)))
        submit(root);
      else
        advance(root);
    });
    root.addEventListener("click", (e) => {
      const action = e.target.closest?.("[data-questionnaire]")?.dataset.questionnaire;
      const go = e.target.closest?.("[data-questionnaire-go]")?.dataset.questionnaireGo;
      if (go)
        return goTo(root, go);
      if (e.target.closest?.('button[type="submit"], input[type="submit"]'))
        return;
      if (action === "back")
        back(root);
      else if (action === "next")
        advance(root);
      else if (action === "skip")
        advance(root, { skip: true });
      else if (action === "restart")
        restart(root);
      else if (action === "dismiss")
        notify(root, "");
    });
    const keep = (e) => {
      const step = e.target.closest?.(".questionnaire-step");
      if (!step || step.dataset.step !== cfgOf(root).step)
        return;
      if (e.target.classList?.contains("questionnaire-other") && e.target.value) {
        const holder = e.target.closest(".questionnaire-choice");
        const choice = holder && dfDollar11(holder).find('input[type="radio"], input[type="checkbox"]').get(0);
        if (choice)
          choice.checked = true;
      }
      cfgOf(root).answers = mergeAnswers(cfgOf(root).answers, readStep(step));
      clearInvalid(step);
      record(root);
      if (e.type === "change" && e.target.type === "radio" && root.hasAttribute("data-auto-advance") && controlsOf2(step).every((c) => c.type === "radio")) {
        clearTimeout(root._auto);
        root._auto = setTimeout(() => advance(root), 280);
      }
    };
    root.addEventListener("input", keep);
    root.addEventListener("change", keep);
    root.addEventListener("focusin", () => {
      lastActive = root;
    });
    root.addEventListener("pointerdown", () => {
      lastActive = root;
    });
    bindComponent(root, questionnaireApi, {
      name: "default",
      config: { step: root._flow.start, answers: {}, history: [root._flow.start], index: 0, skipped: [] }
    });
    show(root, root._walk.step, false);
    record(root);
    if (restored)
      notify(root, "Your answers from earlier are back.", { name: "restart", label: "Start over" });
  });
}
init11();
new MutationObserver(init11).observe(document, { childList: true, subtree: true });

// src/components/chat/session/session.ts
var df$12 = defussGlobals();
var dfDollar12 = defussQuery();
var sessionStates = ["default", "detached", "streaming"];
var num2 = (el, key, fallback) => {
  const v = parseFloat(el.dataset[key]);
  return Number.isFinite(v) ? v : fallback;
};
var reduced = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var resolve5 = (t) => typeof t === "string" ? dfDollar12("#" + CSS.escape(t)).get(0) ?? dfDollar12(t).get(0) : t;
var parts = (s) => ({
  viewport: dfDollar12(s).find(":scope > .session-viewport").get(0),
  content: dfDollar12(s).find(":scope > .session-viewport > .session-content").get(0)
});
var fromEnd = (v) => v.scrollHeight - v.scrollTop - v.clientHeight;
function scrollViewport(s, top, smooth) {
  const { viewport } = s._parts;
  s.setAttribute("data-autoscrolling", "");
  viewport.scrollTo({ top, behavior: smooth && !reduced() ? "smooth" : "instant" });
  clearTimeout(s._settle);
  s._settle = setTimeout(() => settle(s), smooth ? 700 : 50);
}
function settle(s) {
  clearTimeout(s._settle);
  s.removeAttribute("data-autoscrolling");
  measure(s);
}
function measure(s) {
  const { viewport } = s._parts;
  if (!viewport)
    return;
  const threshold = num2(s, "threshold", 48);
  const start = viewport.scrollTop > 1;
  const end = fromEnd(viewport) > 1;
  const tokens = [start && "start", end && "end"].filter(Boolean).join(" ");
  if (tokens)
    s.setAttribute("data-scrollable", tokens);
  else
    s.removeAttribute("data-scrollable");
  dfDollar12(s).find(".session-scroll-button").toArray().forEach((b) => {
    const active = b.dataset.to === "start" ? start : end;
    b.dataset.active = String(active);
    b.inert = !active;
  });
  s._height = viewport.scrollHeight;
  if (!s.hasAttribute("data-autoscrolling")) {
    const reserved = parseFloat(s._parts.content.style.paddingBlockEnd) > 0;
    const stick = fromEnd(viewport) <= threshold && !reserved;
    setStick(s, stick);
  }
  track(s);
}
function setStick(s, stick) {
  s.toggleAttribute("data-stick", stick);
  const name = s.dataset.stateName;
  if (name === "streaming")
    return;
  const next = stick ? "default" : "detached";
  if (name !== next)
    sessionApi.commit(s, next, {});
}
function hold(s, target, ms) {
  s._opening = target;
  clearTimeout(s._holdTimer);
  s._holdTimer = setTimeout(() => {
    s._opening = null;
  }, ms);
}
function anchorSpace(s) {
  const a = s._anchor;
  const { viewport, content } = s._parts;
  if (!a || !content.contains(a)) {
    if (content.style.paddingBlockEnd)
      content.style.paddingBlockEnd = "";
    s._anchor = null;
    return;
  }
  const pad = parseFloat(content.style.paddingBlockEnd) || 0;
  const vpPad = parseFloat(getComputedStyle(viewport).paddingBlockEnd) || 0;
  const below = content.offsetTop + content.offsetHeight - pad - a.offsetTop;
  const need = Math.max(0, Math.round(viewport.clientHeight - vpPad - num2(s, "peek", 48) - below));
  if (need !== Math.round(pad))
    content.style.paddingBlockEnd = need ? `${need}px` : "";
  if (need) {
    const short = anchorTop(s, a) - (viewport.scrollHeight - viewport.clientHeight);
    if (short > 0)
      content.style.paddingBlockEnd = `${need + Math.ceil(short)}px`;
  }
}
var anchorTop = (s, item) => item.offsetTop - num2(s, "peek", 48);
function endHold(s) {
  clearTimeout(s._holdTimer);
  s._opening = null;
}
function scrollToEnd(s, { smooth = true } = {}) {
  endHold(s);
  s.setAttribute("data-stick", "");
  scrollViewport(s, s._parts.viewport.scrollHeight, smooth);
}
function scrollToStart(s, { smooth = true } = {}) {
  endHold(s);
  s.removeAttribute("data-stick");
  scrollViewport(s, 0, smooth);
}
function scrollToMessage(s, id, { smooth = true } = {}) {
  const item = dfDollar12(s._parts.content).find(`.session-item[data-message-id="${CSS.escape(id)}"]`).get(0);
  if (!item)
    return false;
  s.removeAttribute("data-stick");
  scrollViewport(s, anchorTop(s, item), smooth);
  hold(s, () => anchorTop(s, item), smooth ? 900 : 400);
  return true;
}
function applyMarkup12(el, stateName) {
  const { content } = parts(el);
  if (content)
    dfDollar12(content).attr("aria-busy", stateName === "streaming" ? "true" : null);
}
function triggerStateChange12(s, stateName, config) {
  const { content } = s._parts;
  if (stateName === "streaming")
    content.setAttribute("aria-busy", "true");
  else
    content.removeAttribute("aria-busy");
  switch (stateName) {
    case "default":
      scrollToEnd(s, { smooth: config.smooth !== false });
      break;
    case "detached":
      s.removeAttribute("data-stick");
      if (config.to === "start")
        scrollToStart(s);
      else if (typeof config.to === "string")
        scrollToMessage(s, config.to);
      break;
    case "streaming":
      if (s.hasAttribute("data-stick"))
        scrollToEnd(s, { smooth: false });
      break;
  }
}
var sessionApi = componentState({
  component: "session",
  states: sessionStates,
  apply: (s, state) => {
    s.dataset.stateName = state.name;
    triggerStateChange12(s, state.name, state.config);
  },
  markup: (el, state) => applyMarkup12(el, state.name)
});
df$12.sessionApi = sessionApi;
df$12.sessionStates = sessionStates;
function onItems(s, records) {
  const { viewport } = s._parts;
  if (s._anchor && records.some((r) => r.removedNodes.length)) {
    const top = s._top ?? viewport.scrollTop;
    anchorSpace(s);
    if (s._anchor && Math.abs(viewport.scrollTop - top) > 1)
      scrollViewport(s, top, false);
  }
  const before = s._height ?? viewport.scrollHeight;
  let prepended = false;
  let appended = false;
  let anchored = null;
  for (const r of records) {
    if (!r.addedNodes.length)
      continue;
    if (r.nextSibling === null) {
      appended = true;
      for (const node of r.addedNodes)
        if (node.nodeType === 1 && node.matches(".session-item[data-anchor]"))
          anchored = node;
    } else if (r.previousSibling === null)
      prepended = true;
  }
  if (prepended && !appended) {
    const added = records.flatMap((r) => [...r.addedNodes]).filter((n) => n.nodeType === 1);
    added.forEach((n) => {
      n.style.contentVisibility = "visible";
    });
    s.setAttribute("data-autoscrolling", "");
    viewport.scrollTop += viewport.scrollHeight - before;
    added.forEach((n) => {
      n.style.contentVisibility = "";
    });
    settle(s);
    return;
  }
  if (appended) {
    const added = records.filter((r) => r.nextSibling === null).flatMap((r) => [...r.addedNodes]).filter((n) => n.nodeType === 1);
    added.forEach((n) => {
      n.style.contentVisibility = "visible";
    });
    requestAnimationFrame(() => requestAnimationFrame(() => added.forEach((n) => {
      n.style.contentVisibility = "";
      if (!n.getAttribute("style"))
        n.removeAttribute("style");
    })));
  }
  if (anchored) {
    s._anchor = anchored;
    anchorSpace(s);
    s.removeAttribute("data-stick");
    scrollViewport(s, anchorTop(s, anchored), true);
    hold(s, () => anchorTop(s, anchored), 900);
    if (s.dataset.stateName !== "streaming")
      sessionApi.commit(s, "detached", {});
    return;
  }
  if (appended && s.hasAttribute("data-stick"))
    scrollViewport(s, viewport.scrollHeight, s.dataset.stateName !== "streaming");
  else
    measure(s);
}
function onResize(s) {
  const { viewport } = s._parts;
  anchorSpace(s);
  if (s._opening) {
    s.setAttribute("data-autoscrolling", "");
    viewport.scrollTop = s._opening();
    settle(s);
    return;
  }
  if (s.hasAttribute("data-stick") && fromEnd(viewport) > 1) {
    s.setAttribute("data-autoscrolling", "");
    viewport.scrollTop = viewport.scrollHeight;
    settle(s);
  } else
    measure(s);
}
function track(s) {
  if (!s.hasAttribute("data-track"))
    return;
  const { viewport, content } = s._parts;
  const top = viewport.getBoundingClientRect().top;
  const bottom = top + viewport.clientHeight;
  const items = Array.from(dfDollar12(content).find(":scope > .session-item").toArray());
  const visible = items.filter((it) => {
    const r = it.getBoundingClientRect();
    return r.bottom > top && r.top < bottom;
  });
  const line = top + viewport.clientHeight / 3;
  let current = null;
  for (const it of items) {
    if (!it.hasAttribute("data-anchor"))
      continue;
    if (it.getBoundingClientRect().top <= line)
      current = it;
    else
      break;
  }
  current ??= items.find((it) => it.hasAttribute("data-anchor")) ?? null;
  const ids = visible.map((it) => it.dataset.messageId).filter(Boolean);
  const currentId = current?.dataset.messageId ?? null;
  if (currentId === s._currentId && ids.join() === s._visibleIds)
    return;
  s._currentId = currentId;
  s._visibleIds = ids.join();
  items.forEach((it) => it.toggleAttribute("data-current", it === current));
  s.dispatchEvent(new CustomEvent("session-visibility", {
    bubbles: true,
    detail: { currentAnchorId: currentId, visibleMessageIds: ids }
  }));
}
function bindDrop(s) {
  const hasFiles = (e) => [...e.dataTransfer?.types ?? []].includes("Files");
  if (!s.dataset.dropLabel)
    s.dataset.dropLabel = "Drop files to attach";
  const accept = (s.dataset.dropAccept || "").split(",").map((a) => a.trim()).filter(Boolean);
  const ok = (file) => !accept.length || accept.some((a) => a.endsWith("/*") ? file.type.startsWith(a.slice(0, -1)) : a.startsWith(".") ? file.name.toLowerCase().endsWith(a.toLowerCase()) : file.type === a);
  s.addEventListener("dragenter", (e) => {
    if (hasFiles(e)) {
      e.preventDefault();
      s.setAttribute("data-drop-active", "");
    }
  });
  s.addEventListener("dragover", (e) => {
    if (hasFiles(e)) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
    }
  });
  s.addEventListener("dragleave", (e) => {
    if (!s.contains(e.relatedTarget))
      s.removeAttribute("data-drop-active");
  });
  s.addEventListener("drop", (e) => {
    if (!hasFiles(e))
      return;
    e.preventDefault();
    s.removeAttribute("data-drop-active");
    const files = [...e.dataTransfer.files].filter(ok);
    if (files.length)
      s.dispatchEvent(new CustomEvent("session-drop", { bubbles: true, detail: { files } }));
  });
}
function follow(s, options = {}) {
  if (s.dataset.stateName === "streaming")
    scrollToEnd(s, options);
  else
    sessionApi.setState(s, "default", options);
}
function init12() {
  dfDollar12(".session:not([data-init])").toArray().forEach((s) => {
    const p = parts(s);
    if (!p.viewport || !p.content)
      return;
    s.dataset.init = "";
    s._parts = p;
    const { viewport, content } = p;
    if (!viewport.hasAttribute("role"))
      viewport.setAttribute("role", "region");
    if (!viewport.hasAttribute("aria-label"))
      viewport.setAttribute("aria-label", "Messages");
    if (!viewport.hasAttribute("tabindex"))
      viewport.tabIndex = 0;
    if (!content.hasAttribute("role"))
      content.setAttribute("role", "log");
    if (!content.hasAttribute("aria-relevant"))
      content.setAttribute("aria-relevant", "additions");
    viewport.addEventListener("scroll", () => {
      s._top = viewport.scrollTop;
      if (s.hasAttribute("data-autoscrolling"))
        return track(s);
      s._opening = null;
      measure(s);
    }, { passive: true });
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach((type) => viewport.addEventListener(type, () => {
      s._opening = null;
    }, { passive: true }));
    viewport.addEventListener("scrollend", () => settle(s));
    new MutationObserver((records) => onItems(s, records)).observe(content, { childList: true });
    new ResizeObserver(() => onResize(s)).observe(content);
    new ResizeObserver(() => measure(s)).observe(viewport);
    dfDollar12(s).find(".session-scroll-button").toArray().forEach((b) => {
      b.addEventListener("click", () => b.dataset.to === "start" ? scrollToStart(s) : follow(s));
    });
    if (s.hasAttribute("data-drop"))
      bindDrop(s);
    bindComponent(s, sessionApi);
    s.setAttribute("data-pending-scroll", "");
    s.dataset.stateName = "default";
    const where = s.dataset.defaultPosition || "end";
    const last = [...dfDollar12(content).find(":scope > .session-item[data-anchor]").toArray()].pop();
    if (where === "start")
      s._opening = () => 0;
    else if (where === "last-anchor" && last)
      s._opening = () => anchorTop(s, last);
    if (s._opening) {
      scrollViewport(s, s._opening(), false);
      hold(s, s._opening, 1000);
    } else {
      s.setAttribute("data-stick", "");
      scrollViewport(s, viewport.scrollHeight, false);
    }
    s.removeAttribute("data-pending-scroll");
  });
}
function toItem(content, { id, anchor } = {}) {
  let node = content;
  if (typeof content === "string")
    node = document.createRange().createContextualFragment(content);
  const single = node instanceof Element && node.classList.contains("session-item");
  const item = single ? node : document.createElement("div");
  if (!single) {
    item.className = "session-item";
    item.append(node);
  }
  if (id)
    item.dataset.messageId = id;
  if (anchor)
    item.setAttribute("data-anchor", "");
  return item;
}
df$12.session = {
  append(target, content, options) {
    const s = resolve5(target);
    const item = toItem(content, options);
    s?._parts?.content.append(item);
    return item;
  },
  prepend(target, content, options) {
    const s = resolve5(target);
    const items = (Array.isArray(content) ? content : [content]).map((c) => toItem(c, options));
    s?._parts?.content.prepend(...items);
    return items;
  },
  scrollToEnd: (target, options) => {
    const s = resolve5(target);
    if (s)
      follow(s, options);
  },
  scrollToStart: (target, options) => {
    const s = resolve5(target);
    if (s)
      scrollToStart(s, options);
  },
  scrollToMessage: (target, id, options) => {
    const s = resolve5(target);
    return s ? scrollToMessage(s, id, options) : false;
  },
  isAtEnd: (target) => {
    const s = resolve5(target);
    return !!s && fromEnd(s._parts.viewport) <= num2(s, "threshold", 48);
  }
};
init12();
new MutationObserver(init12).observe(document, { childList: true, subtree: true });

// src/components/application/sidebar/sidebar.ts
var df$13 = defussGlobals();
var dfDollar13 = defussQuery();
var sidebarStates = ["default", "collapsed"];
function applyMarkup13(el, stateName) {
  dfDollar13(el).attr("data-state", stateName === "collapsed" ? "collapsed" : "expanded");
}
function triggerStateChange13(sidebar, stateName, _config) {
  switch (stateName) {
    case "default":
      sidebar.dataset.state = "expanded";
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
    triggerStateChange13(sidebar, state.name, state.config);
  },
  read: (sidebar, state) => {
    return {
      name: sidebar.dataset.state === "collapsed" ? "collapsed" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup13(el, state.name)
});
df$13.sidebarApi = sidebarApi;
df$13.sidebarStates = sidebarStates;
function init13() {
  dfDollar13(".app-sidebar:not([data-init])").toArray().forEach((sidebar) => {
    sidebar.dataset.init = "";
    sidebar._defaultState = sidebar.dataset.state || "expanded";
    sidebar._pinned = !!sidebar.dataset.stateName;
    bindComponent(sidebar, sidebarApi);
    const triggerId = sidebar.id ? `[data-sidebar-trigger="${sidebar.id}"]` : ".sidebar-trigger";
    dfDollar13(triggerId).toArray().forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const state = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
        sidebar.dataset.state = state;
        sidebar._pinned = true;
      });
    });
    document.__sidebarAutoRo?.observe(sidebar.parentElement ?? sidebar);
    autoCollapseSidebar(sidebar);
  });
  dfDollar13("[data-sidebar-mobile]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar13("#" + CSS.escape(trigger.dataset.sidebarMobile)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog.showModal();
    });
    dfDollar13(dialog).find(".sidebar-mobile-close").toArray().forEach((btn) => {
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
init13();
new MutationObserver(init13).observe(document, { childList: true, subtree: true });
if (!document.__sidebarKbInit) {
  document.__sidebarKbInit = true;
  bindGlobalKeys((e) => {
    if (!(e.metaKey || e.ctrlKey) || e.key !== "b")
      return;
    const sidebar = dfDollar13(".app-sidebar").get(0);
    if (!sidebar)
      return;
    e.preventDefault();
    sidebar.dataset.state = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
    sidebar._pinned = true;
    return true;
  });
}

// src/components/forms-inputs/slider/slider.ts
var df$14 = defussGlobals();
var dfDollar14 = defussQuery();
var sliderStates = ["default", "disabled"];
function percentOf(el) {
  const min = parseFloat(el.min || 0);
  const max = parseFloat(el.max || 100);
  return max === min ? 0 : (parseFloat(el.value) - min) / (max - min) * 100;
}
function formatterOf(el) {
  const host = el.closest(".slider-range") ?? el;
  const d = { ...host.dataset, ...el.dataset };
  const step = el.step && el.step !== "any" ? el.step : "1";
  const digits = step.includes(".") ? step.split(".")[1].length : 0;
  const opts = { maximumFractionDigits: digits, minimumFractionDigits: 0 };
  if (d.currency)
    Object.assign(opts, { style: "currency", currency: d.currency });
  else if (d.unit)
    Object.assign(opts, { style: "unit", unit: d.unit, unitDisplay: d.unitDisplay || "short" });
  const lang = textLocale(el);
  try {
    return new Intl.NumberFormat(lang, opts);
  } catch {
    return new Intl.NumberFormat(lang, { maximumFractionDigits: digits });
  }
}
var hasFormat = (el) => {
  const host = el.closest(".slider-range") ?? el;
  return !!(el.dataset.unit || el.dataset.currency || host.dataset.unit || host.dataset.currency);
};
function outputsOf(el) {
  if (!el.id)
    return [];
  return [...dfDollar14("output[for]").toArray()].filter((o) => o.htmlFor.contains(el.id));
}
function emojiThumb(el) {
  const list = (el.dataset.thumbEmoji || "").trim().split(/\s+/).filter(Boolean);
  if (!list.length)
    return;
  const i = Math.min(list.length - 1, Math.floor(percentOf(el) / 100 * list.length));
  const emoji = list[i];
  if (el._emoji === emoji)
    return;
  el._emoji = emoji;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><text x="16" y="17" font-size="26" text-anchor="middle" dominant-baseline="central">${emoji}</text></svg>`;
  el.style.setProperty("--slider-thumb-image", `url("data:image/svg+xml,${encodeURIComponent(svg)}")`);
}
function updateSliderValue(el) {
  el.style.setProperty("--slider-value", `${percentOf(el)}%`);
  if (el.dataset.thumbEmoji)
    emojiThumb(el);
  const range = el.closest(".slider-range");
  if (range)
    paintRange(range);
  const fmt = hasFormat(el) ? formatterOf(el) : null;
  if (fmt)
    el.setAttribute("aria-valuetext", fmt.format(parseFloat(el.value)));
  for (const out of outputsOf(el)) {
    const pair = range ? rangeInputs(range) : null;
    const f = fmt ?? formatterOf(el);
    if (pair && out.htmlFor.contains(pair[0].id) && out.htmlFor.contains(pair[1].id)) {
      const a = parseFloat(pair[0].value);
      const b = parseFloat(pair[1].value);
      out.value = a === b ? f.format(a) : f.formatRange(a, b);
    } else {
      out.value = f.format(parseFloat(el.value));
    }
  }
}
var rangeInputs = (range) => [...dfDollar14(range).find(":scope > .slider").toArray()].slice(0, 2);
function paintRange(range) {
  const [lo, hi] = rangeInputs(range);
  if (!lo || !hi)
    return;
  range.style.setProperty("--range-from", `${percentOf(lo)}%`);
  range.style.setProperty("--range-to", `${percentOf(hi)}%`);
}
function initRange(range) {
  const [lo, hi] = rangeInputs(range);
  if (!lo || !hi)
    return;
  const gap = parseFloat(range.dataset.minGap || "0");
  const clamp = (moved) => {
    const a = parseFloat(lo.value);
    const b = parseFloat(hi.value);
    if (b - a < gap || a > b) {
      if (moved === lo)
        lo.value = String(b - gap);
      else
        hi.value = String(a + gap);
    }
    lo.toggleAttribute("data-active", moved === lo);
    hi.toggleAttribute("data-active", moved === hi);
    updateSliderValue(lo);
    updateSliderValue(hi);
  };
  lo.addEventListener("input", () => clamp(lo));
  hi.addEventListener("input", () => clamp(hi));
  for (const s of [lo, hi])
    s.addEventListener("pointerdown", () => {
      lo.toggleAttribute("data-active", s === lo);
      hi.toggleAttribute("data-active", s === hi);
    });
  paintRange(range);
}
function applyMarkup14(el, stateName) {
  if (stateName === "disabled")
    dfDollar14(el).attr("disabled", "");
}
function triggerStateChange14(el, stateName, config) {
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
var sliderApi = componentState({
  component: "slider",
  states: sliderStates,
  apply: (el, state) => triggerStateChange14(el, state.name, state.config),
  read: (el, state) => {
    return {
      name: el.disabled ? "disabled" : "default",
      config: { ...state.config, value: el.value }
    };
  },
  markup: (el, state) => applyMarkup14(el, state.name)
});
df$14.sliderApi = sliderApi;
df$14.sliderStates = sliderStates;
function init14() {
  dfDollar14(".slider-range:not([data-init])").toArray().forEach((range) => {
    range.dataset.init = "";
    initRange(range);
  });
  dfDollar14(".slider:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    el._defaultDisabled = el.disabled;
    bindComponent(el, sliderApi);
    if (el.dataset.thumbEmoji && !el.dataset.thumb)
      el.dataset.thumb = "emoji";
    updateSliderValue(el);
    el.addEventListener("input", () => updateSliderValue(el));
  });
}
init14();
new MutationObserver(init14).observe(document, { childList: true, subtree: true });

// src/components/data-display/table/table.ts
var df$15 = defussGlobals();
var dfDollar15 = defussQuery();
var tableStates = ["default", "sorted", "selected"];
var bodyOf = (table) => table.tBodies[0];
var bodyRows = (table) => [...bodyOf(table)?.rows ?? []];
var rowBox = (row) => dfDollar15(row).find(':scope > .table-select input[type="checkbox"]').get(0);
var headBox = (table) => dfDollar15(table.tHead).find('.table-select input[type="checkbox"]').get(0);
function enhanceHead(table) {
  dfDollar15(table.tHead).find(".table-sort").each((_i, btn) => {
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
    if (dfDollar15(th).find(".table-sort").get(0))
      th.setAttribute("aria-sort", i === col ? direction : "none");
  });
  table._sort = { column: col, direction };
}
function unsort(table) {
  const body = bodyOf(table);
  if (body && table._original)
    body.append(...table._original.filter((r) => r.parentElement === body));
  dfDollar15(table.tHead).find("[aria-sort]").attr("aria-sort", "none");
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
    table.dispatchEvent(new CustomEvent("table-select", {
      bubbles: true,
      detail: { rows: selected, count: selected.length }
    }));
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
  table.dispatchEvent(new CustomEvent("table-reorder", {
    bubbles: true,
    detail: { row, index: bodyRows(table).indexOf(row) }
  }));
}
function moved(table, row) {
  dfDollar15(table.tHead).find("[aria-sort]").attr("aria-sort", "none");
  table._sort = null;
  announceMove(table, row);
}
function initReorder(table) {
  let dragged = null;
  const clear = () => dfDollar15(table).find("[data-drop]").toArray().forEach((r) => r.removeAttribute("data-drop"));
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
    const row = dfDollar15(table).find("tbody > tr[data-drop]").get(0);
    if (!dragged || !row)
      return;
    e.preventDefault();
    const ref = row.dataset.drop === "before" ? row : row.nextSibling;
    if (ref)
      dfDollar15(ref).before(dragged);
    else
      dfDollar15(row.parentElement).append(dragged);
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
      dfDollar15(ref).before(row);
    else
      dfDollar15(row.parentElement).append(row);
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
function triggerStateChange15(table, stateName, config) {
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
  apply: (table, state) => triggerStateChange15(table, state.name, state.config),
  read: (table, state) => {
    const selected = bodyRows(table).flatMap((r, i) => r.getAttribute("aria-selected") === "true" ? [i] : []);
    return {
      name: table.dataset.stateName || "default",
      config: { ...state.config, sort: table._sort ?? null, selected }
    };
  },
  markup: (el, state) => {
    enhanceHead(el);
    triggerStateChange15(el, state.name, state.config);
  }
});
df$15.tableApi = tableApi;
df$15.tableStates = tableStates;
function init15() {
  dfDollar15("table.table:not([data-init])").toArray().forEach((table) => {
    table.dataset.init = "";
    table.dataset.stateName = "default";
    table._original = bodyRows(table);
    table._sort = null;
    bindComponent(table, tableApi);
    enhanceHead(table);
    dfDollar15(table.tHead).find(".table-sort").toArray().forEach((btn) => {
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
        table.dispatchEvent(new CustomEvent("table-sort", {
          bubbles: true,
          detail: { column: col, direction: next }
        }));
      });
    });
    const pre = dfDollar15(table.tHead).find('th[aria-sort="ascending"], th[aria-sort="descending"]').get(0);
    if (pre)
      sortBy(table, pre.cellIndex, pre.getAttribute("aria-sort"));
    if (dfDollar15(table).find('.table-select input[type="checkbox"]').get(0)) {
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
    if (dfDollar15(table).find(".table-handle").get(0))
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
init15();
new MutationObserver(init15).observe(document, { childList: true, subtree: true });

// src/components/feedback-status/toast/toast.ts
var df$16 = defussGlobals();
var dfDollar16 = defussQuery();
var toastStates = ["default"];
function applyMarkup15(_el, _stateName) {}
function triggerStateChange16(container, stateName, _config) {
  if (stateName !== "default")
    return;
  dfDollar16(container).find(".toast").toArray().forEach((el) => toastDismiss(el));
}
var toastApi = componentState({
  component: "toast",
  states: toastStates,
  apply: (container, state) => {
    triggerStateChange16(container, state.name, state.config);
  },
  read: (container, state) => {
    return {
      name: container.dataset.stateName || "default",
      config: { ...state.config, count: dfDollar16(container).find(".toast").toArray().length }
    };
  },
  markup: (el, state) => applyMarkup15(el, state.name)
});
df$16.toastApi = toastApi;
df$16.toastStates = toastStates;
var DURATION = 4000;
var MAX_VISIBLE = 3;
var toastCallbacks = new WeakMap;
var toastContainer = dfDollar16("#toast-container").get(0);
if (!toastContainer) {
  toastContainer = document.createElement("div");
  toastContainer.id = "toast-container";
  toastContainer.className = "toast-container";
  toastContainer.setAttribute("aria-label", "Notifications");
  toastContainer.setAttribute("data-position", "bottom-right");
  dfDollar16(document.body).append(toastContainer);
}
var stackToasts = (container) => {
  const toasts = [...dfDollar16(container).find(".toast:not([data-leaving])").toArray()];
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
      dfDollar16(el).remove();
      stackToasts(container);
      if (callback)
        callback();
    });
    return;
  }
  el.animate([
    { opacity: 1, transform: "translateY(0)" },
    { opacity: 0, transform: "translateY(0.5rem)" }
  ], { duration: 200, easing: "ease", fill: "forwards" }).finished.then(() => {
    try {
      el.hidePopover();
    } catch {}
    dfDollar16(el).remove();
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
    dfDollar16(contentEl).append(dfDollar16(icons[variant]));
  }
  const textDiv = document.createElement("div");
  textDiv.className = "toast-text";
  if (title) {
    const p = document.createElement("p");
    p.className = "toast-title";
    dfDollar16(p).text(title);
    dfDollar16(textDiv).append(p);
  }
  if (description) {
    const p = document.createElement("p");
    p.className = "toast-description";
    dfDollar16(p).text(description);
    dfDollar16(textDiv).append(p);
  }
  dfDollar16(contentEl).append(textDiv);
  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.dataset.toastClose = "";
  dfDollar16(closeBtn).html('<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>');
  dfDollar16(contentEl).append(closeBtn);
  let host = el;
  if (aura) {
    const style = aura === true ? "" : String(aura);
    el.classList.add("aura", "aura-md");
    if (style)
      el.classList.add(`aura-${style}`);
    el.dataset.aura = style || "default";
    host = document.createElement("div");
    host.className = "toast-surface";
    dfDollar16(el).append(host);
  }
  dfDollar16(host).append(contentEl);
  if (action) {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "toast-actions";
    const actionBtn = document.createElement("button");
    actionBtn.className = "btn";
    actionBtn.setAttribute("data-variant", "outline");
    actionBtn.setAttribute("data-size", "sm");
    actionBtn.dataset.toastAction = "";
    dfDollar16(actionBtn).text(action.label);
    dfDollar16(actionsDiv).append(actionBtn);
    dfDollar16(host).append(actionsDiv);
  }
  if (animation) {
    el._animation = typeof animation === "string" ? { in: animation } : animation;
    el.dataset.anim = "";
  }
  dfDollar16(toastContainer).append(el);
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
  const toasts = dfDollar16(toastContainer).find(".toast").toArray();
  if (toasts.length > (toastContainer.dataset.stack === "pile" ? 6 : MAX_VISIBLE))
    toastDismiss(toasts[0]);
  return el;
};
function init16() {
  dfDollar16("#toast-container:not([data-init])").toArray().forEach((container) => {
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
init16();
new MutationObserver(init16).observe(document.body, { childList: true, subtree: true });
var toastConfigure = (opts = {}) => {
  if (opts.stack)
    toastContainer.dataset.stack = opts.stack;
  if (opts.position)
    toastContainer.setAttribute("data-position", opts.position);
  stackToasts(toastContainer);
  return {
    stack: toastContainer.dataset.stack || "list",
    position: toastContainer.dataset.position
  };
};
var toastActions = {
  configure: toastConfigure,
  show: toastCreate,
  success: (options) => toastCreate(Object.assign(typeof options === "string" ? { title: options } : options, { variant: "success" })),
  warning: (options) => toastCreate(Object.assign(typeof options === "string" ? { title: options } : options, { variant: "warning" })),
  info: (options) => toastCreate(Object.assign(typeof options === "string" ? { title: options } : options, { variant: "info" })),
  error: (options) => toastCreate(Object.assign(typeof options === "string" ? { title: options } : options, { variant: "destructive" })),
  dismiss: () => {
    dfDollar16(toastContainer).find(".toast").toArray().forEach((el) => {
      toastDismiss(el);
    });
  }
};
df$16.toast = toastActions;

// src/components/actions/toggle/toggle.ts
var df$17 = defussGlobals();
var dfDollar17 = defussQuery();
var toggleStates = ["default", "pressed"];
function applyMarkup16(toggle, stateName, defaultPressed) {
  dfDollar17(toggle).attr("aria-pressed", stateName === "pressed" ? "true" : defaultPressed);
}
function triggerStateChange17(toggle, stateName, _config) {
  applyMarkup16(toggle, stateName, toggle._defaultPressed ?? "false");
}
var toggleApi = componentState({
  component: "toggle",
  states: toggleStates,
  apply: (toggle, state) => triggerStateChange17(toggle, state.name, state.config),
  read: (toggle, state) => ({
    name: dfDollar17(toggle).attr("aria-pressed") === "true" ? "pressed" : "default",
    config: state.config
  }),
  markup: (toggle, state) => {
    const authored = state.model.attrs.find(([name]) => name === "aria-pressed");
    applyMarkup16(toggle, state.name, authored ? authored[1] : "false");
  }
});
df$17.toggleApi = toggleApi;
df$17.toggleStates = toggleStates;
function init17() {
  dfDollar17(".toggle:not([data-init]):not(.toggle-group .toggle)").each((_i, toggle) => {
    dfDollar17(toggle).data("init", "");
    toggle._defaultPressed = dfDollar17(toggle).attr("aria-pressed") || "false";
    bindComponent(toggle, toggleApi, { name: toggle._defaultPressed === "true" ? "pressed" : "default", config: {} });
    dfDollar17(toggle).on("click", () => {
      dfDollar17(toggle).attr("aria-pressed", String(dfDollar17(toggle).attr("aria-pressed") !== "true"));
    });
  });
}
init17();
new MutationObserver(init17).observe(document, { childList: true, subtree: true });

// src/components/multimedia/video/video.ts
var df$18 = defussGlobals();
var dfDollar18 = defussQuery();
var videoStates = ["default", "playing"];
function applyMarkup17(el, stateName, config) {
  mediaMarkup(el, "video", stateName, config);
}
function triggerStateChange18(el, stateName, config, incoming) {
  return mediaApply(el, "video", stateName, config, incoming);
}
var videoApi = componentState({
  component: "video",
  states: videoStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange18(el, state.name, state.config, incoming),
  read: (el) => {
    const { playing, config } = mediaRead(el);
    const { time, duration, rate, volume, muted, captions } = config;
    return { name: playing ? "playing" : "default", config: { time, duration, rate, volume, muted, captions } };
  },
  markup: (el, state) => applyMarkup17(el, state.name, state.config)
});
df$18.videoApi = videoApi;
df$18.videoStates = videoStates;
function init18() {
  dfDollar18(".video:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent(el, videoApi);
    bindMedia(el, "video", () => videoApi.getState(el));
  });
}
var resolve6 = (target) => typeof target === "string" ? dfDollar18(target).get(0) : target;
var now2 = (el) => mediaRead(el).playing ? "playing" : "default";
df$18.video = {
  play: async (target) => {
    const el = resolve6(target);
    if (el?.api)
      await el.api.setState("playing");
  },
  pause: (target) => {
    resolve6(target)?.api?.setState("default");
  },
  toggle: (target) => {
    const el = resolve6(target);
    if (!el?.api)
      return false;
    const next = now2(el) === "playing" ? "default" : "playing";
    el.api.setState(next);
    return next === "playing";
  },
  seek: (target, time) => {
    const el = resolve6(target);
    if (el?.api)
      el.api.setState(now2(el), { time });
  },
  skip: (target, seconds) => {
    const el = resolve6(target);
    if (el?.api)
      el.api.setState(now2(el), { time: mediaRead(el).config.time + seconds });
  },
  mute: (target, muted) => {
    const el = resolve6(target);
    if (el?.api)
      el.api.setState(now2(el), { muted: muted ?? !mediaRead(el).config.muted });
  },
  volume: (target, volume) => {
    const el = resolve6(target);
    if (el?.api)
      el.api.setState(now2(el), { volume });
  },
  rate: (target, rate) => {
    const el = resolve6(target);
    if (el?.api)
      el.api.setState(now2(el), { rate });
  },
  captions: (target, key) => {
    const el = resolve6(target);
    if (el?.api)
      el.api.setState(now2(el), { captions: key ?? (mediaRead(el).config.captions ? "" : true) });
  },
  tracks: (target, tracks, replace) => {
    const el = resolve6(target);
    return el?.api ? mediaTracks(el, "video", tracks, replace) : [];
  },
  fullscreen: async (target) => {
    const el = resolve6(target);
    if (!el)
      return;
    if (document.fullscreenElement === el)
      await document.exitFullscreen().catch(() => {
        return;
      });
    else
      await el.requestFullscreen().catch(() => {
        return;
      });
  }
};
init18();
new MutationObserver(init18).observe(document, { childList: true, subtree: true });

//# debugId=3918B9EAB89EE86964756E2164756E21
/* defuss-shadcn v0.10.0 runtime provenance: bundles defuss-morph@0.2.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599) + defuss-query@0.2.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599); full notice: NOTICE.txt */
//# sourceMappingURL=ai-chat.js.map
