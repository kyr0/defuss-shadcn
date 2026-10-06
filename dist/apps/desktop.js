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
var SHARED_ABI = "0.9.6";
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

// src/components/calendar/calendar.ts
var df$3 = defussGlobals();
var dfDollar3 = defussQuery();
var calSeq = 0;
var calendarStates = ["default"];
function applyMarkup3(el, config) {
  const now = new Date;
  el._calState = {
    year: config?.year ?? now.getFullYear(),
    month: config?.month ?? now.getMonth(),
    selected: config?.selected ?? config?.day ?? null,
    minDate: config?.minDate ?? null,
    maxDate: config?.maxDate ?? null
  };
  renderCalendar(el, el._calState.year, el._calState.month, el._calState.selected);
}
function triggerStateChange3(cal, stateName, config) {
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
    state.selected = config?.day ?? config?.selected ?? null;
  }
  renderCalendar(cal, state.year, state.month, state.selected);
}
var isoDate = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
var calendarApi = Object.assign(componentState({
  component: "calendar",
  states: calendarStates,
  apply: (cal, state) => triggerStateChange3(cal, state.name, state.config),
  read: (cal, current) => {
    const view = cal._calState ?? {};
    return {
      name: cal.dataset.stateName || "default",
      config: {
        ...current.config,
        year: view.year,
        month: view.month,
        selected: view.selected,
        minDate: view.minDate ?? null,
        maxDate: view.maxDate ?? null,
        view: cal.dataset.view || "days",
        ...rangeOwnerOf(cal) ? { rangeStart: rangeState(rangeOwnerOf(cal)).start, rangeEnd: rangeState(rangeOwnerOf(cal)).end } : {}
      }
    };
  },
  markup: (el, state) => applyMarkup3(el, state.config)
}), {
  setDays(cal, days, options = {}) {
    const holder = dayHolderOf(cal);
    holder._calDays = options.merge ? { ...holder._calDays, ...days } : { ...days };
    rerender(cal);
  }
});
df$3.calendarApi = calendarApi;
df$3.calendarStates = calendarStates;
var nameSets = new Map;
function names(el) {
  const locale = textLocale(el);
  if (!nameSets.has(locale)) {
    nameSets.set(locale, {
      days: Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, i))),
      months: Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(2024, i, 1))),
      full: new Intl.DateTimeFormat(locale, { dateStyle: "full" })
    });
  }
  return nameSets.get(locale);
}
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
  return Array.from(dfDollar3(owner).find(".calendar").toArray()).filter((c) => c.closest(".calendar-range") === owner);
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
  dfDollar3(owner).find("input[data-range-input]").toArray().forEach((input) => {
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
function dayHolderOf(cal) {
  const owner = rangeOwnerOf(cal);
  return owner && owner.classList.contains("calendar-range") ? owner : cal;
}
function daysOf(cal) {
  const holder = dayHolderOf(cal);
  if (holder._calDays)
    return holder._calDays;
  const script = Array.from(dfDollar3(holder).find("script.calendar-days").toArray()).find((el) => el.parentElement === holder);
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
function dayData(days, iso, full) {
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
  const aria = ` aria-label="${esc([full.format(isoToDate(iso)), d.label, note].filter(Boolean).join(", "))}"`;
  return { attrs, note: note ? `<span class="calendar-day-note">${esc(note)}</span>` : "", aria, blocked: d.disabled === true };
}
var YEARS_PER_PAGE = 12;
var pageStart = (year) => year - (year % YEARS_PER_PAGE + YEARS_PER_PAGE) % YEARS_PER_PAGE;
var pad2 = (n) => String(n).padStart(2, "0");
var monthOff = (y, m, min, max) => !isoInRange(`${y}-${pad2(m + 1)}-${pad2(daysInMonth(y, m))}`, min, null) || !isoInRange(`${y}-${pad2(m + 1)}-01`, null, max);
var yearOff = (y, min, max) => !isoInRange(`${y}-12-31`, min, null) || !isoInRange(`${y}-01-01`, null, max);
function renderPicker(el) {
  const st = el._calState;
  const panel = dfDollar3(el).find(".calendar-picker").get(0);
  if (!st || !panel)
    return;
  const now = new Date;
  let html = "";
  if (el.dataset.view === "months") {
    const y = st.pickYear;
    html = names(el).months.map((name, m) => {
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
  dfDollar3(panel).morph(html);
}
function renderHeader(el) {
  const st = el._calState;
  if (!st)
    return;
  const view = el.dataset.view || "days";
  const heading = dfDollar3(el).find(".calendar-heading").get(0);
  if (heading) {
    const text = view === "months" ? String(st.pickYear) : view === "years" ? `${st.pickPage} – ${st.pickPage + YEARS_PER_PAGE - 1}` : `${names(el).months[st.month]} ${st.year}`;
    dfDollar3(heading).text(text);
    if (heading.tagName === "BUTTON") {
      dfDollar3(heading).attr("aria-label", view === "months" ? `${text}, choose a year` : view === "years" ? `Years ${text}, back to the days` : `${text}, choose a month and year`);
      dfDollar3(heading).attr("aria-expanded", String(view !== "days"));
    }
  }
  const labels = view === "months" ? ["Previous year", "Next year"] : view === "years" ? ["Previous years", "Next years"] : ["Previous month", "Next month"];
  dfDollar3(el).find('.calendar-nav[data-action="prev-month"]').attr("aria-label", labels[0]);
  dfDollar3(el).find('.calendar-nav[data-action="next-month"]').attr("aria-label", labels[1]);
  const monthSel = dfDollar3(el).find('.calendar-select[data-part="month"]').get(0);
  const yearSel = dfDollar3(el).find('.calendar-select[data-part="year"]').get(0);
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
  dfDollar3(select).html(html);
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
  const grid = dfDollar3(el).find(".calendar-grid").get(0);
  const panel = dfDollar3(el).find(".calendar-picker").get(0);
  if (!st || !panel)
    return;
  if (view !== "days" && (el.dataset.view || "days") === "days" && grid) {
    dfDollar3(panel).css("minHeight", `${grid.offsetHeight}px`).css("width", `${grid.offsetWidth}px`);
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
    const pick = dfDollar3(el).find(".calendar-day[data-selected] button").get(0) ?? dfDollar3(el).find(".calendar-day[data-today]:not([data-outside]) button").get(0) ?? dfDollar3(el).find(".calendar-day:not([data-outside]):not([data-disabled]) button").get(0);
    pick?.focus();
  } else {
    const pick = dfDollar3(panel).find(".calendar-pick[aria-current]:not([disabled])").get(0) ?? dfDollar3(panel).find(".calendar-pick:not([disabled])").get(0);
    pick?.focus();
  }
  el.dispatchEvent(new CustomEvent("calendar:view", { bubbles: true, detail: { view, year: st.year, month: st.month } }));
}
var renderGrid = (year, month, selectedDay, calId, minDate, maxDate, range, days, locale = names(null)) => {
  const full = locale.full;
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
    html += `<th class="calendar-day-label" scope="col">${locale.days[d]}</th>`;
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
        const dd = dayData(days, iso, full);
        const off = !isoInRange(iso, minDate, maxDate) || dd.blocked ? " data-disabled" : "";
        html += `<td class="calendar-day" data-outside${off}${dd.attrs} id="${calId}-${iso}" data-cal-date="${iso}"><button tabindex="-1" data-day="${prevDay}" data-outside="prev"${dd.aria}>${prevDay}${dd.note}</button></td>`;
      } else if (dayNum > total) {
        const iso = isoDate(new Date(year, month + 1, nextDayNum));
        const dd = dayData(days, iso, full);
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
        const dd = dayData(days, iso, full);
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
  const grid = dfDollar3(el).find(".calendar-grid").get(0);
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
  const active = el.ownerDocument.activeElement;
  const focusKey = active && el.contains(active) ? active.closest(".calendar-day")?.getAttribute("data-cal-date") : null;
  const owner = rangeOwnerOf(el);
  const r = owner ? rangeState(owner) : null;
  const range = r ? { start: r.start, end: r.end, preview: !r.end && r.start && r.hover && r.hover >= r.start ? r.hover : null } : null;
  const days = daysOf(el);
  el.toggleAttribute("data-notes", Object.values(days).some((d) => d && d.note != null && d.note !== ""));
  dfDollar3(grid).morph(renderGrid(year, month, selectedDay, el.dataset.calId || "", st.minDate, st.maxDate, range, days, names(el)));
  if (focusKey)
    dfDollar3(grid).find(`[data-cal-date="${focusKey}"] button`).get(0)?.focus();
  const selDate = dfDollar3(el).find(".calendar-day[data-selected]").get(0)?.getAttribute("data-cal-date");
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
function init3() {
  dfDollar3(".calendar:not([data-init])").toArray().forEach((cal) => {
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
    bindComponent(cal, calendarApi);
    Object.assign(cal.api, {
      setDays: (days, options) => calendarApi.setDays(cal, days, options)
    });
    const header = dfDollar3(cal).find(".calendar-header").get(0);
    let heading = dfDollar3(cal).find(".calendar-heading").get(0);
    if (cal.dataset.caption === "dropdown" && header) {
      if (heading)
        dfDollar3(heading).attr("hidden", "");
      const caption = document.createElement("span");
      caption.className = "calendar-caption";
      dfDollar3(caption).html(`<select class="calendar-select" data-part="month" aria-label="Month">${names(cal).months.map((n, m) => `<option value="${m}">${esc(n)}</option>`).join("")}</select>` + `<select class="calendar-select" data-part="year" aria-label="Year"></select>`);
      if (heading)
        dfDollar3(heading).after(caption);
      else
        dfDollar3(header).append(caption);
      fillYears(cal, dfDollar3(caption).find('[data-part="year"]').get(0));
      caption.addEventListener("change", (e) => {
        const sel = e.target;
        const m = Number(dfDollar3(caption).find('[data-part="month"]').get(0).value);
        const y = Number(dfDollar3(caption).find('[data-part="year"]').get(0).value);
        jumpTo(cal, y, m);
        sel.focus();
      });
    } else if (heading && heading.tagName !== "BUTTON") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = heading.className;
      button.setAttribute("aria-live", heading.getAttribute("aria-live") || "polite");
      dfDollar3(heading).replaceWith(button);
      heading = button;
    }
    if (heading && heading.tagName === "BUTTON") {
      dfDollar3(heading).attr("aria-haspopup", "grid");
      if (!dfDollar3(cal).find(".calendar-picker").get(0)) {
        const panel = document.createElement("div");
        panel.className = "calendar-picker";
        panel.setAttribute("role", "group");
        const grid = dfDollar3(cal).find(".calendar-grid").get(0);
        if (grid)
          dfDollar3(grid).after(panel);
        else
          dfDollar3(cal).append(panel);
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
        const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: 4, ArrowUp: -4 }[e.key];
        if (pickBtn && step) {
          e.preventDefault();
          const picks = Array.from(dfDollar3(cal).find(".calendar-pick").toArray());
          picks[picks.indexOf(pickBtn) + step]?.focus();
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
        const target = dfDollar3(keyOwner).find(`.calendar-day:not([data-outside])[data-cal-date="${isoDate(from)}"] button`).get(0);
        target?.focus();
        return;
      }
      const allBtns = Array.from(dfDollar3(cal).find(".calendar-day button").toArray());
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
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// src/components/context-menu/context-menu.ts
var df$4 = defussGlobals();
var dfDollar4 = defussQuery();
var contextMenuStates = ["default", "open"];
function keepInView(menu, x, y) {
  const fit = () => {
    const { offsetWidth: w, offsetHeight: h } = menu;
    const vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    if (x + w > vw - 4)
      menu.style.left = `${Math.max(4, Math.min(x - w, vw - w - 4))}px`;
    if (y + h > vh - 4)
      menu.style.top = `${Math.max(4, Math.min(y - h, vh - h - 4))}px`;
  };
  if (menu.matches(":popover-open"))
    fit();
  else
    menu.addEventListener("toggle", (e) => {
      if (e.newState === "open")
        fit();
    }, { once: true });
}
function applyMarkup4(_el, _stateName) {}
function triggerStateChange4(menu, stateName, config) {
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
      keepInView(menu, x, y);
      break;
    }
  }
}
var contextMenuApi = componentState({
  component: "context-menu",
  states: contextMenuStates,
  apply: (menu, state) => triggerStateChange4(menu, state.name, state.config),
  read: (menu, state) => {
    return {
      name: menu.matches(":popover-open") ? "open" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup4(el, state.name)
});
df$4.contextMenuApi = contextMenuApi;
df$4.contextMenuStates = contextMenuStates;
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
  keepInView(menu, x, y);
  menu.dataset.stateName = "open";
}
function init4() {
  dfDollar4("[data-context-menu]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const menu = dfDollar4("#" + CSS.escape(trigger.dataset.contextMenu)).get(0);
    if (!menu)
      return;
    bindComponent(menu, contextMenuApi);
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
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// src/components/dialog/dialog.ts
var df$5 = defussGlobals();
var dfDollar5 = defussQuery();
var dialogStates = ["default", "open"];
function applyMarkup5(dialog, stateName) {
  dfDollar5(dialog).attr("open", stateName === "open" ? "" : null);
}
function triggerStateChange5(dialog, stateName, _config) {
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
  apply: (dialog, state) => triggerStateChange5(dialog, state.name, state.config),
  markup: (el, state) => applyMarkup5(el, state.name)
});
df$5.dialogApi = dialogApi;
df$5.dialogStates = dialogStates;
function init5() {
  dfDollar5("[data-dialog-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar5("#" + CSS.escape(trigger.dataset.dialogTrigger)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog._trigger = trigger;
      dialog.showModal();
    });
  });
  dfDollar5("dialog:not(.alert-dialog):not(.sheet):not(.command):not(.window):not(.cookie-consent-dialog):not([data-init])").toArray().forEach((dialog) => {
    dfDollar5(dialog).data("init", "");
    bindComponent(dialog, dialogApi);
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog)
        dialog.close();
    });
    dfDollar5(dialog).find("[data-dialog-close]").toArray().forEach((btn) => {
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
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// src/components/dropdown/dropdown.ts
var df$6 = defussGlobals();
var dfDollar6 = defussQuery();
var dropdownStates = ["default", "open"];
var ITEM = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
var isDisabled = (el) => el.disabled || el.getAttribute("aria-disabled") === "true";
var itemsOf = (menu) => Array.from(dfDollar6(menu).find(ITEM).toArray()).filter((i) => i.closest('[role="menu"]') === menu && !isDisabled(i));
var subOf = (trigger) => dfDollar6(trigger).closest(".dropdown-sub").children(".dropdown-sub-content").get(0) ?? null;
var rootOf2 = (menu) => {
  let m = menu;
  while (m?.parentElement?.closest(".dropdown-content[popover]"))
    m = m.parentElement.closest(".dropdown-content[popover]");
  return m;
};
var HOVER_OPEN = 120;
var HOVER_CLOSE = 220;
function applyMarkup6(_el, _stateName) {}
function triggerStateChange6(menu, stateName, _config) {
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
  apply: (menu, state) => triggerStateChange6(menu, state.name, state.config),
  markup: (el, state) => applyMarkup6(el, state.name)
});
df$6.dropdownApi = dropdownApi;
df$6.dropdownStates = dropdownStates;
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
    dfDollar6(group).find('[role="menuitemradio"]').toArray().forEach((r) => {
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
  const openSubs = () => Array.from(dfDollar6(menu).find(".dropdown-sub-content").toArray()).filter((s) => s.parentElement.closest('[role="menu"]') === menu && s.matches(":popover-open"));
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
  const trigger = dfDollar6(wrap).find(":scope > .dropdown-sub-trigger").get(0);
  const sub = dfDollar6(wrap).find(":scope > .dropdown-sub-content").get(0);
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
function init6() {
  dfDollar6("[data-dropdown-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const menu = dfDollar6("#" + CSS.escape(trigger.dataset.dropdownTrigger)).get(0);
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
        const otherOpen = other ? dfDollar6("#" + CSS.escape(other.getAttribute("data-dropdown-trigger"))).get(0)?.matches(":popover-open") : false;
        if (!otherOpen && (!active || active === document.body || menu.contains(active) || other))
          trigger.focus({ preventScroll: true });
      }
    });
    wireMenu(menu);
    dfDollar6(menu).find(".dropdown-sub").toArray().forEach(wireSub);
  });
  dfDollar6(".dropdown-sub").toArray().forEach(wireSub);
  dfDollar6(".dropdown-content[popover]:not(.dropdown-sub-content):not([data-init])").toArray().forEach((menu) => {
    menu.dataset.init = "";
    bindComponent(menu, dropdownApi);
  });
}
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// src/components/menubar/menubar.ts
var df$7 = defussGlobals();
var dfDollar7 = defussQuery();
var menubarStates = ["default", "open"];
var triggersOf = (bar) => Array.from(dfDollar7(bar).find(".menubar-trigger").toArray()).filter((t) => t.closest(".menubar") === bar && !t.disabled && t.getAttribute("aria-disabled") !== "true");
var menuOf = (trigger) => dfDollar7("#" + CSS.escape(trigger.dataset.dropdownTrigger || trigger.getAttribute("popovertarget") || "")).get(0);
var openMenuOf = (bar) => triggersOf(bar).map(menuOf).find((m) => m?.matches(":popover-open")) ?? null;
function setRoving(bar, active) {
  triggersOf(bar).forEach((t) => t.setAttribute("tabindex", t === active ? "0" : "-1"));
}
function openMenu(bar, trigger, quiet = false) {
  const menu = menuOf(trigger);
  if (!menu)
    return;
  setRoving(bar, trigger);
  if (menu.matches(":popover-open")) {
    if (!quiet)
      focusItem(menu);
    return;
  }
  menu._noFocus = quiet;
  if (quiet)
    trigger.focus({ preventScroll: true });
  safeShowPopover(menu);
}
function focusItem(menu, last = false) {
  const own = Array.from(dfDollar7(menu).find('[role^="menuitem"]').toArray()).filter((x) => x.closest('[role="menu"]') === menu && !x.disabled && x.getAttribute("aria-disabled") !== "true");
  own.forEach((x) => x.removeAttribute("data-highlighted"));
  const item = last ? own.at(-1) : own[0];
  item?.setAttribute("data-highlighted", "");
  item?.focus({ preventScroll: true });
}
function applyMarkup7(_el, _stateName) {}
function triggerStateChange7(bar, stateName, config) {
  switch (stateName) {
    case "default": {
      const open = openMenuOf(bar);
      if (open) {
        try {
          open.hidePopover();
        } catch {}
      }
      break;
    }
    case "open": {
      const ts = triggersOf(bar);
      const t = typeof config.menu === "number" ? ts[config.menu] : config.menu ? ts.find((x) => x.dataset.dropdownTrigger === config.menu) : ts[0];
      if (t)
        openMenu(bar, t);
      break;
    }
  }
}
var menubarApi = componentState({
  component: "menubar",
  states: menubarStates,
  apply: (bar, state) => {
    bar.dataset.stateName = state.name;
    triggerStateChange7(bar, state.name, state.config);
  },
  read: (bar, state) => {
    const open = openMenuOf(bar);
    return { name: open ? "open" : "default", config: { ...state.config, menu: open?.id ?? null } };
  },
  markup: (el, state) => applyMarkup7(el, state.name)
});
df$7.menubarApi = menubarApi;
df$7.menubarStates = menubarStates;
function init7() {
  dfDollar7(".menubar:not([data-init])").toArray().forEach((bar) => {
    bar.dataset.init = "";
    if (!bar.hasAttribute("role"))
      bar.setAttribute("role", "menubar");
    bindComponent(bar, menubarApi);
    const triggers = triggersOf(bar);
    triggers.forEach((t) => {
      if (!t.hasAttribute("role"))
        t.setAttribute("role", "menuitem");
    });
    setRoving(bar, triggers[0]);
    triggers.forEach((t) => {
      menuOf(t)?.addEventListener("toggle", () => {
        bar.dataset.stateName = openMenuOf(bar) ? "open" : "default";
      });
    });
    bar.addEventListener("pointerover", (e) => {
      const t = e.target instanceof Element ? e.target.closest(".menubar-trigger") : null;
      if (!t || t.closest(".menubar") !== bar || !triggersOf(bar).includes(t))
        return;
      const open = openMenuOf(bar);
      if (open && menuOf(t) !== open)
        openMenu(bar, t, true);
    });
    bar.addEventListener("keydown", (e) => {
      const ts = triggersOf(bar);
      const rtl = getComputedStyle(bar).direction === "rtl";
      const next = rtl ? "ArrowLeft" : "ArrowRight";
      const prev = rtl ? "ArrowRight" : "ArrowLeft";
      const onTrigger = e.target instanceof Element && e.target.classList.contains("menubar-trigger");
      const openMenuEl = openMenuOf(bar);
      const i = onTrigger ? ts.indexOf(e.target) : ts.findIndex((t) => menuOf(t) === openMenuEl);
      if (i < 0)
        return;
      const step = (d) => ts[(i + d + ts.length) % ts.length];
      if (onTrigger) {
        const moveTo = (t) => {
          if (openMenuEl)
            openMenu(bar, t);
          else {
            setRoving(bar, t);
            t.focus();
          }
        };
        switch (e.key) {
          case next:
            e.preventDefault();
            moveTo(step(1));
            break;
          case prev:
            e.preventDefault();
            moveTo(step(-1));
            break;
          case "Home":
            e.preventDefault();
            setRoving(bar, ts[0]);
            ts[0].focus();
            break;
          case "End":
            e.preventDefault();
            setRoving(bar, ts[ts.length - 1]);
            ts[ts.length - 1].focus();
            break;
          case "ArrowDown":
          case "Enter":
          case " ":
            e.preventDefault();
            openMenu(bar, ts[i]);
            break;
          case "ArrowUp": {
            e.preventDefault();
            const menu = menuOf(ts[i]);
            if (menu && !menu.matches(":popover-open")) {
              menu.addEventListener("toggle", (ev) => {
                if (ev.newState === "open")
                  focusItem(menu, true);
              }, { once: true });
              openMenu(bar, ts[i]);
            } else {
              openMenu(bar, ts[i]);
              if (menu)
                focusItem(menu, true);
            }
            break;
          }
        }
        return;
      }
      if (e.defaultPrevented)
        return;
      if (e.key === next) {
        e.preventDefault();
        openMenu(bar, step(1));
      } else if (e.key === prev) {
        e.preventDefault();
        openMenu(bar, step(-1));
      }
    });
  });
}
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

// src/components/navigation-menu/navigation-menu.ts
var df$8 = defussGlobals();
var dfDollar8 = defussQuery();
var navigationMenuStates = ["default", "open"];
function applyMarkup8(_el, _stateName) {}
function triggerStateChange8(content, stateName, _config) {
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
var navigationMenuApi = componentState({
  component: "navigation-menu",
  states: navigationMenuStates,
  apply: (content, state) => triggerStateChange8(content, state.name, state.config),
  markup: (el, state) => applyMarkup8(el, state.name)
});
df$8.navigationMenuApi = navigationMenuApi;
df$8.navigationMenuStates = navigationMenuStates;
function init8() {
  dfDollar8(".nav-menu-trigger[popovertarget]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const content = dfDollar8("#" + CSS.escape(trigger.getAttribute("popovertarget"))).get(0);
    if (!content)
      return;
    const anchorId = `--nav-menu-${content.id}`;
    trigger.style.anchorName = anchorId;
    content.style.positionAnchor = anchorId;
  });
  dfDollar8(".nav-menu-content[popover]:not([data-init])").toArray().forEach((content) => {
    content.dataset.init = "";
    bindComponent(content, navigationMenuApi);
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

// src/components/sheet/sheet.ts
var df$10 = defussGlobals();
var dfDollar10 = defussQuery();
var sheetStates = ["default", "open"];
function applyMarkup10(el, stateName) {
  dfDollar10(el).attr("open", stateName === "open" ? "" : null);
}
function triggerStateChange10(sheet, stateName, _config) {
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
  apply: (sheet, state) => triggerStateChange10(sheet, state.name, state.config),
  markup: (el, state) => applyMarkup10(el, state.name)
});
df$10.sheetApi = sheetApi;
df$10.sheetStates = sheetStates;
function init10() {
  dfDollar10("[data-sheet-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const sheet = dfDollar10("#" + CSS.escape(trigger.dataset.sheetTrigger)).get(0);
    if (!sheet)
      return;
    trigger.addEventListener("click", () => {
      sheet._trigger = trigger;
      sheet.showModal();
    });
  });
  dfDollar10("dialog.sheet:not([data-init])").toArray().forEach((sheet) => {
    sheet.dataset.init = "";
    bindComponent(sheet, sheetApi);
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet)
        sheet.close();
    });
    dfDollar10(sheet).find("[data-sheet-close]").toArray().forEach((btn) => {
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
init10();
new MutationObserver(init10).observe(document, { childList: true, subtree: true });

// src/components/slider/slider.ts
var df$11 = defussGlobals();
var dfDollar11 = defussQuery();
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
  return [...dfDollar11("output[for]").toArray()].filter((o) => o.htmlFor.contains(el.id));
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
var rangeInputs = (range) => [...dfDollar11(range).find(":scope > .slider").toArray()].slice(0, 2);
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
function applyMarkup11(el, stateName) {
  if (stateName === "disabled")
    dfDollar11(el).attr("disabled", "");
}
function triggerStateChange11(el, stateName, config) {
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
  apply: (el, state) => triggerStateChange11(el, state.name, state.config),
  read: (el, state) => {
    return {
      name: el.disabled ? "disabled" : "default",
      config: { ...state.config, value: el.value }
    };
  },
  markup: (el, state) => applyMarkup11(el, state.name)
});
df$11.sliderApi = sliderApi;
df$11.sliderStates = sliderStates;
function init11() {
  dfDollar11(".slider-range:not([data-init])").toArray().forEach((range) => {
    range.dataset.init = "";
    initRange(range);
  });
  dfDollar11(".slider:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    el._defaultDisabled = el.disabled;
    bindComponent(el, sliderApi);
    if (el.dataset.thumbEmoji && !el.dataset.thumb)
      el.dataset.thumb = "emoji";
    updateSliderValue(el);
    el.addEventListener("input", () => updateSliderValue(el));
  });
}
init11();
new MutationObserver(init11).observe(document, { childList: true, subtree: true });

// src/components/tabs/tabs.ts
var df$12 = defussGlobals();
var dfDollar12 = defussQuery();
var tabsStates = ["default", "active", "disabled"];
var ICON = ":scope > :is(svg, img, i, .tab-icon)";
var LUCIDE_NAME = /^[a-z][a-z0-9-]*$/;
var iconOf = (tab) => {
  const icon = dfDollar12(tab).find(ICON).get(0);
  if (!icon)
    return "";
  return icon.getAttribute("data-lucide") ?? icon.textContent.trim();
};
var labelOf = (tab) => {
  const label = dfDollar12(tab).find(":scope > .tab-label").get(0);
  if (label)
    return label.textContent.trim();
  return Array.from(tab.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim();
};
var setLabel = (tab, text) => {
  const label = dfDollar12(tab).find(":scope > .tab-label").get(0);
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
  dfDollar12(tab).find(ICON).get(0)?.remove();
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
var triggersOf2 = (el) => {
  const list = el.getAttribute("role") === "tablist" ? el : el.closest('[role="tablist"]');
  return Array.from(dfDollar12(list).find('[role="tab"]').toArray());
};
var activateTab = (tab, triggers) => {
  triggers.forEach((t) => {
    t.setAttribute("aria-selected", "false");
    t.setAttribute("tabindex", "-1");
    t.dataset.stateName = t.disabled ? "disabled" : "default";
    const panel = dfDollar12("#" + CSS.escape(t.getAttribute("aria-controls"))).get(0);
    if (panel)
      panel.hidden = true;
  });
  tab.setAttribute("aria-selected", "true");
  tab.removeAttribute("tabindex");
  tab.dataset.stateName = "active";
  const panel = dfDollar12("#" + CSS.escape(tab.getAttribute("aria-controls"))).get(0);
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
function triggerStateChange12(el, stateName, config) {
  const triggers = triggersOf2(el);
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
  triggers.forEach((t) => dfDollar12(t).attr("aria-selected", "false").attr("tabindex", "-1"));
  dfDollar12(tab).attr("aria-selected", "true").attr("tabindex", null);
};
var selectedOf = (t) => dfDollar12(t).attr("aria-selected") === "true";
var disabledOf = (t) => dfDollar12(t).attr("disabled") != null;
function listMarkup(list, stateName, config) {
  const triggers = dfDollar12(list).find('[role="tab"]').toArray();
  if (stateName === "default") {
    const tab = triggers.find(selectedOf) || triggers.find((t) => !disabledOf(t));
    if (tab)
      selectMarkup(tab, triggers);
  } else if (stateName === "disabled")
    triggers.forEach((t) => dfDollar12(t).attr("disabled", ""));
  const pick = typeof config?.index === "number" ? triggers[config.index] : typeof config?.id === "string" ? triggers.find((t) => t.id === config.id) : null;
  if (pick && !disabledOf(pick))
    selectMarkup(pick, triggers);
}
function tabMarkup(tab, stateName, config) {
  if (stateName === "active")
    dfDollar12(tab).attr("disabled", null).attr("aria-selected", "true").attr("tabindex", null);
  else
    dfDollar12(tab).attr("disabled", stateName === "disabled" ? "" : null);
  applyContent(tab, config ?? {});
}
var tabsApi = componentState({
  component: "tabs",
  states: tabsStates,
  apply: (el, state, _previous, incoming) => triggerStateChange12(el, state.name, incoming),
  read: (el, state) => {
    if (el.getAttribute("role") === "tablist") {
      const triggers = triggersOf2(el);
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
df$12.tabsApi = tabsApi;
df$12.tabsStates = tabsStates;
function init12() {
  dfDollar12('[role="tablist"]:not([data-init]):has(.tab-trigger)').toArray().forEach((tablist) => {
    tablist.dataset.init = "";
    const triggers = Array.from(dfDollar12(tablist).find('[role="tab"]').toArray());
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
init12();
new MutationObserver(init12).observe(document, { childList: true, subtree: true });

// src/components/toast/toast.ts
var df$13 = defussGlobals();
var dfDollar13 = defussQuery();
var toastStates = ["default"];
function applyMarkup12(_el, _stateName) {}
function triggerStateChange13(container, stateName, _config) {
  if (stateName !== "default")
    return;
  dfDollar13(container).find(".toast").toArray().forEach((el) => toastDismiss(el));
}
var toastApi = componentState({
  component: "toast",
  states: toastStates,
  apply: (container, state) => {
    triggerStateChange13(container, state.name, state.config);
  },
  read: (container, state) => {
    return {
      name: container.dataset.stateName || "default",
      config: { ...state.config, count: dfDollar13(container).find(".toast").toArray().length }
    };
  },
  markup: (el, state) => applyMarkup12(el, state.name)
});
df$13.toastApi = toastApi;
df$13.toastStates = toastStates;
var DURATION = 4000;
var MAX_VISIBLE = 3;
var toastCallbacks = new WeakMap;
var toastContainer = dfDollar13("#toast-container").get(0);
if (!toastContainer) {
  toastContainer = document.createElement("div");
  toastContainer.id = "toast-container";
  toastContainer.className = "toast-container";
  toastContainer.setAttribute("aria-label", "Notifications");
  toastContainer.setAttribute("data-position", "bottom-right");
  dfDollar13(document.body).append(toastContainer);
}
var stackToasts = (container) => {
  const toasts = [...dfDollar13(container).find(".toast:not([data-leaving])").toArray()];
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
      dfDollar13(el).remove();
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
    dfDollar13(el).remove();
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
    dfDollar13(contentEl).append(dfDollar13(icons[variant]));
  }
  const textDiv = document.createElement("div");
  textDiv.className = "toast-text";
  if (title) {
    const p = document.createElement("p");
    p.className = "toast-title";
    dfDollar13(p).text(title);
    dfDollar13(textDiv).append(p);
  }
  if (description) {
    const p = document.createElement("p");
    p.className = "toast-description";
    dfDollar13(p).text(description);
    dfDollar13(textDiv).append(p);
  }
  dfDollar13(contentEl).append(textDiv);
  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.dataset.toastClose = "";
  dfDollar13(closeBtn).html('<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>');
  dfDollar13(contentEl).append(closeBtn);
  let host = el;
  if (aura) {
    const style = aura === true ? "" : String(aura);
    el.classList.add("aura", "aura-md");
    if (style)
      el.classList.add(`aura-${style}`);
    el.dataset.aura = style || "default";
    host = document.createElement("div");
    host.className = "toast-surface";
    dfDollar13(el).append(host);
  }
  dfDollar13(host).append(contentEl);
  if (action) {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "toast-actions";
    const actionBtn = document.createElement("button");
    actionBtn.className = "btn";
    actionBtn.setAttribute("data-variant", "outline");
    actionBtn.setAttribute("data-size", "sm");
    actionBtn.dataset.toastAction = "";
    dfDollar13(actionBtn).text(action.label);
    dfDollar13(actionsDiv).append(actionBtn);
    dfDollar13(host).append(actionsDiv);
  }
  if (animation) {
    el._animation = typeof animation === "string" ? { in: animation } : animation;
    el.dataset.anim = "";
  }
  dfDollar13(toastContainer).append(el);
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
  const toasts = dfDollar13(toastContainer).find(".toast").toArray();
  if (toasts.length > (toastContainer.dataset.stack === "pile" ? 6 : MAX_VISIBLE))
    toastDismiss(toasts[0]);
  return el;
};
function init13() {
  dfDollar13("#toast-container:not([data-init])").toArray().forEach((container) => {
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
init13();
new MutationObserver(init13).observe(document.body, { childList: true, subtree: true });
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
    dfDollar13(toastContainer).find(".toast").toArray().forEach((el) => {
      toastDismiss(el);
    });
  }
};
df$13.toast = toastActions;

// src/components/toggle/toggle.ts
var df$14 = defussGlobals();
var dfDollar14 = defussQuery();
var toggleStates = ["default", "pressed"];
function applyMarkup13(toggle, stateName, defaultPressed) {
  dfDollar14(toggle).attr("aria-pressed", stateName === "pressed" ? "true" : defaultPressed);
}
function triggerStateChange14(toggle, stateName, _config) {
  applyMarkup13(toggle, stateName, toggle._defaultPressed ?? "false");
}
var toggleApi = componentState({
  component: "toggle",
  states: toggleStates,
  apply: (toggle, state) => triggerStateChange14(toggle, state.name, state.config),
  read: (toggle, state) => ({ name: dfDollar14(toggle).attr("aria-pressed") === "true" ? "pressed" : "default", config: state.config }),
  markup: (toggle, state) => {
    const authored = state.model.attrs.find(([name]) => name === "aria-pressed");
    applyMarkup13(toggle, state.name, authored ? authored[1] : "false");
  }
});
df$14.toggleApi = toggleApi;
df$14.toggleStates = toggleStates;
function init14() {
  dfDollar14(".toggle:not([data-init]):not(.toggle-group .toggle)").each((_i, toggle) => {
    dfDollar14(toggle).data("init", "");
    toggle._defaultPressed = dfDollar14(toggle).attr("aria-pressed") || "false";
    bindComponent(toggle, toggleApi, { name: toggle._defaultPressed === "true" ? "pressed" : "default", config: {} });
    dfDollar14(toggle).on("click", () => {
      dfDollar14(toggle).attr("aria-pressed", String(dfDollar14(toggle).attr("aria-pressed") !== "true"));
    });
  });
}
init14();
new MutationObserver(init14).observe(document, { childList: true, subtree: true });

// src/components/window/window.ts
var df$15 = defussGlobals();
var dfDollar15 = defussQuery();
var windowStates = ["default", "maximized", "minimized", "closed"];
var topZ = 10;
var KEEP = 48;
var resolve = (target) => typeof target === "string" ? dfDollar15("#" + CSS.escape(target)).get(0) ?? dfDollar15(target).get(0) : target;
var titleOf = (w) => dfDollar15(w).find(".window-title").get(0)?.textContent?.trim() ?? "";
var posOf = (w) => ({ x: w.offsetLeft, y: w.offsetTop });
function moveTo(w, x, y) {
  const parent = w.offsetParent;
  const bar = dfDollar15(w).find(".window-titlebar").get(0);
  if (parent) {
    const ctl = dfDollar15(w).find(".window-controls").get(0)?.offsetWidth ?? 0;
    const maxX = parent.clientWidth - KEEP - ctl;
    const minX = KEEP + ctl - w.offsetWidth;
    const maxY = parent.clientHeight - (bar?.offsetHeight ?? KEEP);
    x = Math.min(Math.max(x, minX), maxX);
    y = Math.min(Math.max(y, 0), Math.max(maxY, 0));
  }
  w.style.setProperty("--window-x", `${Math.round(x)}px`);
  w.style.setProperty("--window-y", `${Math.round(y)}px`);
  return { x: Math.round(x), y: Math.round(y) };
}
function raise(w) {
  if (!w.open)
    return;
  if (w.hasAttribute("data-active") && Number(w.style.zIndex) === topZ)
    return;
  topZ += 1;
  w.style.zIndex = String(topZ);
  dfDollar15(".window[data-active]").toArray().forEach((o) => {
    if (o !== w)
      o.removeAttribute("data-active");
  });
  w.setAttribute("data-active", "");
  w.dispatchEvent(new CustomEvent("window-focus", { bubbles: true, detail: { title: titleOf(w) } }));
}
function showQuietly(w) {
  const prev = document.activeElement;
  w.show();
  if (prev && prev !== document.body && prev.isConnected && prev.focus)
    prev.focus({ preventScroll: true });
  else if (w.contains(document.activeElement))
    document.activeElement.blur();
}
function activateTopmost() {
  const open = Array.from(dfDollar15(".window[open]").toArray());
  if (!open.length)
    return;
  const top = open.reduce((a, b) => Number(b.style.zIndex || 0) > Number(a.style.zIndex || 0) ? b : a);
  raise(top);
}
function stashSize(w) {
  if (w._stash)
    return;
  w._stash = { width: w.style.width, height: w.style.height };
  w.style.width = "";
  w.style.height = "";
}
function restoreSize(w) {
  if (!w._stash)
    return;
  w.style.width = w._stash.width;
  w.style.height = w._stash.height;
  w._stash = null;
}
function applyMarkup14(el, stateName) {
  const open = stateName !== "closed";
  dfDollar15(el).attr("open", open ? "" : null);
  dfDollar15(el).attr("data-maximized", stateName === "maximized" ? "" : null);
  dfDollar15(el).attr("data-minimized", stateName === "minimized" ? "" : null);
  dfDollar15(el).find(".window-maximize").attr("aria-label", stateName === "maximized" ? "Restore" : "Maximize");
  dfDollar15(el).find(".window-minimize").attr("aria-label", stateName === "minimized" ? "Restore" : "Minimize");
}
function triggerStateChange15(w, stateName, config) {
  const maxBtn = dfDollar15(w).find(".window-maximize").get(0);
  if (stateName !== "closed" && !w.open)
    showQuietly(w);
  switch (stateName) {
    case "default":
      w.removeAttribute("data-maximized");
      w.removeAttribute("data-minimized");
      restoreSize(w);
      if (config.x !== undefined && config.y !== undefined)
        moveTo(w, Number(config.x), Number(config.y));
      raise(w);
      break;
    case "maximized":
      w.removeAttribute("data-minimized");
      stashSize(w);
      w.setAttribute("data-maximized", "");
      raise(w);
      break;
    case "minimized":
      w.removeAttribute("data-maximized");
      stashSize(w);
      w.setAttribute("data-minimized", "");
      break;
    case "closed":
      if (w.open)
        w.close();
      w.removeAttribute("data-maximized");
      w.removeAttribute("data-minimized");
      break;
  }
  if (maxBtn)
    maxBtn.setAttribute("aria-label", stateName === "maximized" ? "Restore" : "Maximize");
  dfDollar15(w).find(".window-minimize").get(0)?.setAttribute("aria-label", stateName === "minimized" ? "Restore" : "Minimize");
}
var windowApi = componentState({
  component: "window",
  states: windowStates,
  apply: (w, state) => {
    w.dataset.stateName = state.name;
    triggerStateChange15(w, state.name, state.config);
  },
  read: (w, state) => {
    const name = !w.open ? "closed" : w.dataset.stateName || "default";
    return { name, config: name === "closed" ? {} : state.config };
  },
  markup: (el, state) => applyMarkup14(el, state.name)
});
df$15.windowApi = windowApi;
df$15.windowStates = windowStates;
function bindDrag(w, bar) {
  bar.addEventListener("pointerdown", (e) => {
    if (e.button !== 0 || e.target.closest("button, a, input, select, textarea"))
      return;
    raise(w);
    if (w.hasAttribute("data-maximized"))
      return;
    e.preventDefault();
    const start = posOf(w);
    const { clientX: sx, clientY: sy } = e;
    bar.setPointerCapture(e.pointerId);
    w.setAttribute("data-dragging", "");
    const onMove = (m) => moveTo(w, start.x + m.clientX - sx, start.y + m.clientY - sy);
    const onUp = () => {
      bar.removeEventListener("pointermove", onMove);
      bar.removeEventListener("pointerup", onUp);
      bar.removeEventListener("pointercancel", onUp);
      w.removeAttribute("data-dragging");
      w.dispatchEvent(new CustomEvent("window-move", { bubbles: true, detail: posOf(w) }));
    };
    bar.addEventListener("pointermove", onMove);
    bar.addEventListener("pointerup", onUp);
    bar.addEventListener("pointercancel", onUp);
  });
  bar.addEventListener("dblclick", (e) => {
    if (e.target.closest("button"))
      return;
    windowApi.setState(w, w.hasAttribute("data-maximized") ? "default" : "maximized", {});
  });
  bar.addEventListener("keydown", (e) => {
    const step = e.shiftKey ? 64 : 16;
    const d = { ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step] }[e.key];
    if (!d || w.hasAttribute("data-maximized") || e.target !== bar)
      return;
    e.preventDefault();
    const p = posOf(w);
    moveTo(w, p.x + d[0], p.y + d[1]);
    w.dispatchEvent(new CustomEvent("window-move", { bubbles: true, detail: posOf(w) }));
  });
}
function init15() {
  dfDollar15("dialog.window:not([data-init])").toArray().forEach((w) => {
    w.dataset.init = "";
    const bar = dfDollar15(w).find(":scope > .window-titlebar").get(0);
    if (bar) {
      if (!bar.hasAttribute("tabindex"))
        bar.tabIndex = 0;
      bindDrag(w, bar);
    }
    if (!w.hasAttribute("aria-labelledby") && !w.hasAttribute("aria-label")) {
      const title = dfDollar15(w).find(".window-title").get(0);
      if (title) {
        if (!title.id)
          title.id = `window-title-${Math.random().toString(36).slice(2, 8)}`;
        w.setAttribute("aria-labelledby", title.id);
      }
    }
    w.addEventListener("pointerdown", () => raise(w), true);
    w.addEventListener("focusin", () => raise(w));
    dfDollar15(w).find(".window-maximize").get(0)?.addEventListener("click", () => windowApi.setState(w, w.hasAttribute("data-maximized") ? "default" : "maximized", {}));
    dfDollar15(w).find(".window-close").get(0)?.addEventListener("click", (e) => {
      e.preventDefault();
      windowApi.setState(w, "closed", {});
    });
    dfDollar15(w).find(".window-minimize").get(0)?.addEventListener("click", () => windowApi.setState(w, w.hasAttribute("data-minimized") ? "default" : "minimized", {}));
    w.addEventListener("close", () => {
      if (w.open)
        return;
      w.dataset.stateName = "closed";
      w.removeAttribute("data-active");
      w.removeAttribute("data-maximized");
      w.removeAttribute("data-minimized");
      activateTopmost();
    });
    bindComponent(w, windowApi);
    const initial = !w.open ? "closed" : w.hasAttribute("data-maximized") ? "maximized" : w.hasAttribute("data-minimized") ? "minimized" : "default";
    w.dataset.stateName = initial;
    dfDollar15(w).find(".window-maximize").attr("aria-label", initial === "maximized" ? "Restore" : "Maximize");
    dfDollar15(w).find(".window-minimize").attr("aria-label", initial === "minimized" ? "Restore" : "Minimize");
    if (w.open) {
      w.style.zIndex = String(++topZ);
      dfDollar15(".window[data-active]").toArray().forEach((o) => o.removeAttribute("data-active"));
      w.setAttribute("data-active", "");
    }
  });
}
function create(options = {}) {
  const {
    title = "Untitled",
    icon,
    content,
    html,
    statusbar,
    id,
    x,
    y,
    width,
    height,
    chrome,
    resizable = true,
    parent,
    focus = true,
    flush = false
  } = options;
  const host = resolve(parent) ?? dfDollar15(".window-desktop").get(0) ?? document.body;
  const w = document.createElement("dialog");
  w.className = "window";
  if (id)
    w.id = id;
  if (chrome)
    w.dataset.chrome = chrome;
  if (resizable)
    w.setAttribute("data-resizable", "");
  const count = dfDollar15(host).find(":scope > .window").toArray().length;
  w.style.setProperty("--window-x", typeof x === "number" ? `${x}px` : x ?? `${24 + count % 8 * 28}px`);
  w.style.setProperty("--window-y", typeof y === "number" ? `${y}px` : y ?? `${24 + count % 8 * 28}px`);
  if (width !== undefined)
    w.style.setProperty("--window-w", typeof width === "number" ? `${width}px` : width);
  if (height !== undefined)
    w.style.setProperty("--window-h", typeof height === "number" ? `${height}px` : height);
  const bar = document.createElement("header");
  bar.className = "window-titlebar";
  if (icon) {
    const i = document.createElement("i");
    i.className = "window-icon";
    i.setAttribute("data-lucide", icon);
    bar.append(i);
  }
  const h = document.createElement("h2");
  h.className = "window-title";
  h.textContent = title;
  const controls = document.createElement("form");
  controls.method = "dialog";
  controls.className = "window-controls";
  for (const [cls, label, type] of [["window-minimize", "Minimize", "button"], ["window-maximize", "Maximize", "button"], ["window-close", "Close", "submit"]]) {
    const b = document.createElement("button");
    b.type = type;
    b.className = cls;
    b.setAttribute("aria-label", label);
    controls.append(b);
  }
  bar.append(h, controls);
  const body = document.createElement("div");
  body.className = "window-body";
  if (flush)
    body.setAttribute("data-flush", "");
  if (content instanceof Node)
    body.append(content);
  else if (typeof html === "string")
    body.append(document.createRange().createContextualFragment(html));
  else if (content !== undefined)
    body.textContent = String(content);
  w.append(bar, body);
  if (statusbar !== undefined) {
    const s = document.createElement("footer");
    s.className = "window-statusbar";
    s.textContent = String(statusbar);
    w.append(s);
  }
  host.append(w);
  init15();
  showQuietly(w);
  if (focus)
    windowApi.setState(w, "default", {});
  if (icon)
    globalThis.lucide?.createIcons?.();
  return w;
}
var list = (scope, all = false) => dfDollar15(resolve(scope) ?? document).find(all ? ".window" : ".window[open]").toArray();
function cascade(scope, step = 28) {
  list(scope).sort((a, b) => Number(a.style.zIndex || 0) - Number(b.style.zIndex || 0)).forEach((w, i) => {
    windowApi.setState(w, "default", {});
    moveTo(w, 16 + i * step, 16 + i * step);
  });
}
function tile(scope) {
  const wins = list(scope);
  if (!wins.length)
    return;
  const cols = Math.ceil(Math.sqrt(wins.length));
  const rows = Math.ceil(wins.length / cols);
  wins.forEach((w, i) => {
    windowApi.setState(w, "default", {});
    const p = w.offsetParent;
    if (!p)
      return;
    const cw = p.clientWidth / cols, ch = p.clientHeight / rows;
    w.style.width = "";
    w.style.height = "";
    w.style.setProperty("--window-w", `${Math.floor(cw)}px`);
    w.style.setProperty("--window-h", `${Math.floor(ch)}px`);
    moveTo(w, i % cols * cw, Math.floor(i / cols) * ch);
  });
}
var windowActions = {
  create,
  open: (target, config = {}) => {
    const w = resolve(target);
    if (w)
      windowApi.setState(w, "default", config);
    return w;
  },
  close: (target) => {
    const w = resolve(target);
    if (w)
      windowApi.setState(w, "closed", {});
    return w;
  },
  focus: (target) => {
    const w = resolve(target);
    if (w?.open)
      raise(w);
    return w;
  },
  move: (target, x, y) => {
    const w = resolve(target);
    return w ? moveTo(w, x, y) : null;
  },
  resize: (target, width, height) => {
    const w = resolve(target);
    if (!w)
      return null;
    w.style.width = "";
    w.style.height = "";
    w.style.setProperty("--window-w", typeof width === "number" ? `${width}px` : width);
    if (height !== undefined)
      w.style.setProperty("--window-h", typeof height === "number" ? `${height}px` : height);
    return w;
  },
  maximize: (target) => {
    const w = resolve(target);
    if (w)
      windowApi.setState(w, "maximized", {});
    return w;
  },
  minimize: (target) => {
    const w = resolve(target);
    if (w)
      windowApi.setState(w, "minimized", {});
    return w;
  },
  restore: (target) => {
    const w = resolve(target);
    if (w)
      windowApi.setState(w, "default", {});
    return w;
  },
  toggleMaximize: (target) => {
    const w = resolve(target);
    if (w)
      windowApi.setState(w, w.hasAttribute("data-maximized") ? "default" : "maximized", {});
    return w;
  },
  active: () => dfDollar15(".window[open][data-active]").get(0),
  list,
  cascade,
  tile
};
df$15.win = windowActions;
init15();
new MutationObserver(init15).observe(document, { childList: true, subtree: true });

//# debugId=805BA79A20D9DE6764756E2164756E21
/* defuss-shadcn v0.9.6 runtime provenance: bundles defuss-morph@0.2.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599) + defuss-query@0.2.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599); full notice: NOTICE.txt */
//# sourceMappingURL=desktop.js.map
