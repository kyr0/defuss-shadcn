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
var SHARED_ABI = "0.9.18";
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

// src/components/data-display/avatar/avatar.ts
var df$ = defussGlobals();
var dfDollar = defussQuery();
var avatarStates = ["default", "error"];
function applyMarkup(el, stateName) {
  const img = dfDollar(el).find(".avatar-image");
  if (stateName === "error")
    img.attr("data-error", "").css("display", "none");
  else
    img.attr("data-error", null).css("display", "");
}
function triggerStateChange(wrapper, stateName, _config) {
  const img = dfDollar(wrapper).find(".avatar-image").get(0);
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
  apply: (wrapper, state) => triggerStateChange(wrapper, state.name, state.config),
  read: (wrapper, state) => {
    const img = dfDollar(wrapper).find(".avatar-image").get(0);
    const errored = img ? img.hasAttribute("data-error") : true;
    return {
      name: errored ? "error" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup(el, state.name)
});
df$.avatarApi = avatarApi;
df$.avatarStates = avatarStates;
function init() {
  dfDollar(".avatar:not([data-init])").toArray().forEach((wrapper) => {
    wrapper.dataset.init = "";
    bindComponent(wrapper, avatarApi);
    const img = dfDollar(wrapper).find(".avatar-image").get(0);
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
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// src/components/application/border-layout/border-layout.ts
var df$2 = defussGlobals();
var dfDollar2 = defussQuery();
var borderLayoutStates = ["default", "collapsed"];
var SIDES = {
  north: { handle: "s", axis: "h", size: "height" },
  south: { handle: "n", axis: "h", size: "height" },
  west: { handle: "e", axis: "w", size: "width" },
  east: { handle: "w", axis: "w", size: "width" }
};
var REGIONS = Object.keys(SIDES);
var num2 = (v, fallback) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};
var resolve = (t) => typeof t === "string" ? dfDollar2("#" + CSS.escape(t)).get(0) ?? dfDollar2(t).get(0) : t;
var regionOf = (layout, side) => dfDollar2(layout).find(`:scope > .border-layout-${side}`).get(0);
var paneOf = (region) => region.classList.contains("resizer") ? Array.from(region.children).find((c) => !c.classList.contains("resizer-handle")) : region;
var sizeOf = (region, side) => {
  if (region.hasAttribute("data-collapsed"))
    return 0;
  const box = region.getBoundingClientRect();
  return Math.round(SIDES[side].axis === "w" ? box.width : box.height);
};
function setSize(region, side, px) {
  const { size } = SIDES[side];
  const pane = paneOf(region);
  if (!pane)
    return;
  const value = String(Math.round(px));
  if (region.hasAttribute("data-init") && region.api)
    region.dataset[size] = value;
  else
    pane.style[size] = `${value}px`;
}
function clamp(layout) {
  const centerMin = num2(layout.dataset.centerMin, 120);
  const style = getComputedStyle(layout);
  const gapW = num2(style.columnGap, 0) * 2;
  const gapH = num2(style.rowGap, 0) * 2;
  const pad = (a, b) => num2(style[a], 0) + num2(style[b], 0);
  const innerW = layout.clientWidth - pad("paddingLeft", "paddingRight") - gapW;
  const innerH = layout.clientHeight - pad("paddingTop", "paddingBottom") - gapH;
  const OPPOSITE = { north: "south", south: "north", west: "east", east: "west" };
  for (const side of REGIONS) {
    const region = regionOf(layout, side);
    if (!region?.classList.contains("resizer"))
      continue;
    const other = regionOf(layout, OPPOSITE[side]);
    const taken = other ? sizeOf(other, OPPOSITE[side]) : 0;
    const room = (SIDES[side].axis === "w" ? innerW : innerH) - taken - centerMin;
    const authoredMax = num2(region.dataset.maxAuthored, Infinity);
    const max = Math.max(num2(region.dataset.min, 48), Math.min(room, authoredMax));
    region.dataset[SIDES[side].axis === "w" ? "maxW" : "maxH"] = String(Math.round(max));
    if (!region.hasAttribute("data-collapsed") && sizeOf(region, side) > max + 1)
      setSize(region, side, max);
  }
}
function aria(layout) {
  for (const side of REGIONS) {
    const region = regionOf(layout, side);
    const handle = region ? dfDollar2(region).children(".resizer-handle").get(0) : null;
    if (!handle)
      continue;
    const pane = paneOf(region);
    if (pane && !pane.id)
      pane.id = `${layout.id || "border-layout"}-${side}-${Math.random().toString(36).slice(2, 7)}`;
    if (pane)
      handle.setAttribute("aria-controls", pane.id);
    const name = region.getAttribute("aria-label") || pane?.getAttribute("aria-label") || side;
    handle.setAttribute("aria-label", `Resize ${name}`);
    handle.setAttribute("aria-valuenow", String(sizeOf(region, side)));
    handle.setAttribute("aria-valuemin", String(region.hasAttribute("data-collapsible") || layout.hasAttribute("data-collapsible") ? 0 : num2(region.dataset.min, 48)));
    handle.setAttribute("aria-valuemax", String(num2(region.dataset[SIDES[side].axis === "w" ? "maxW" : "maxH"], 2000)));
  }
}
var collapsible = (layout, region) => region.hasAttribute("data-collapsible") || layout.hasAttribute("data-collapsible");
function collapse(layout, side, collapsed) {
  const region = regionOf(layout, side);
  if (!region)
    return;
  const was = region.hasAttribute("data-collapsed");
  if (was === collapsed)
    return;
  region.toggleAttribute("data-collapsed", collapsed);
  aria(layout);
  save(layout);
  layout.dispatchEvent(new CustomEvent("border-layout-collapse", {
    bubbles: true,
    detail: { region: side, collapsed }
  }));
  syncState(layout);
}
function syncState(layout) {
  const folded = REGIONS.filter((s) => regionOf(layout, s)?.hasAttribute("data-collapsed"));
  const name = folded.length ? "collapsed" : "default";
  if (layout.store)
    borderLayoutApi.commit(layout, name, folded.length ? { regions: folded } : {});
  else
    layout.dataset.stateName = name;
}
var stackOf = (region) => {
  const pane = region && paneOf(region);
  return pane?.classList.contains("border-layout-stack") ? pane : null;
};
var panelsOf = (stack) => Array.from(stack.children).filter((c) => c.classList.contains("panel"));
var isRow = (stack, side) => stack.dataset.direction === "row" || stack.dataset.direction !== "column" && (side === "north" || side === "south");
var extent = (panel, row) => {
  const box = panel.getBoundingClientRect();
  return row ? box.width : box.height;
};
var minOf = (panel) => {
  const bar = dfDollar2(panel).children(".panel-header").get(0)?.getBoundingClientRect().height ?? 40;
  return num2(panel.dataset.min, Math.round(bar + 32));
};
var open2 = (panel) => !panel.hidden && !panel.hasAttribute("data-minimized");
var titleOf = (panel) => dfDollar2(panel).find(":scope > .panel-header .panel-title").text().trim() || panel.getAttribute("aria-label") || "";
var keepOf = (stack) => stack.hasAttribute("data-exclusive") ? 1 : Math.max(0, Math.floor(num2(stack.dataset.keep, 0)));
function keepOpen(stack, again) {
  const n = keepOf(stack);
  if (!n)
    return;
  const opened = panelsOf(stack).filter(open2);
  const order = (stack._order ?? []).filter((p) => opened.includes(p));
  for (const p of opened)
    if (!order.includes(p))
      order.push(p);
  stack._order = order;
  const keep = new Set(order.slice(-n));
  for (const p of opened) {
    if (keep.has(p))
      continue;
    if (p.api)
      p.api.setState("minimized");
    else if ((stack._waits = (stack._waits ?? 0) + 1) < 50)
      setTimeout(again);
  }
}
var levelsOf = (stack) => stack.hasAttribute("data-levels");
function drill(stack, panels) {
  const was = stack._wasOpen;
  stack._wasOpen = new Set(panels.filter(open2));
  if (!was || !stack.hasAttribute("data-drill"))
    return;
  const reopened = panels.find((p) => open2(p) && !was.has(p) && stack._seen?.has(p));
  stack._seen = new Set(panels);
  if (reopened)
    dropAfter(stack, reopened);
}
function dropAfter(stack, panel) {
  const panels = panelsOf(stack);
  for (const p of panels.slice(panels.indexOf(panel) + 1)) {
    const d = p.previousElementSibling;
    if (d?.classList.contains("border-layout-stack-divider"))
      d.remove();
    p.remove();
  }
}
function report(stack, panels) {
  const detail = { panels, open: panels.filter(open2) };
  const was = stack._reported;
  stack._reported = detail;
  const same = (a, b) => a.length === b.length && a.every((p, i) => p === b[i]);
  if (!was || same(was.panels, detail.panels) && same(was.open, detail.open))
    return;
  stack.dispatchEvent(new CustomEvent("border-layout-stack-change", { bubbles: true, detail }));
}
function syncStack(layout, side, region, stack) {
  keepOpen(stack, () => syncStack(layout, side, region, stack));
  drill(stack, panelsOf(stack));
  const row = isRow(stack, side);
  const panels = panelsOf(stack);
  if (!stack._seen)
    stack._seen = new Set(panels);
  for (const p of panels)
    stack._seen.add(p);
  for (const panel of panels.slice(1)) {
    const prev = panel.previousElementSibling;
    if (prev?.classList.contains("border-layout-stack-divider"))
      continue;
    dfDollar2(panel).before(dfDollar2(`<div class="border-layout-stack-divider" role="separator" aria-orientation="${row ? "vertical" : "horizontal"}" data-ce-chrome></div>`));
  }
  let last = null, pending = null;
  for (const child of Array.from(stack.children)) {
    if (child.classList.contains("border-layout-stack-divider")) {
      child._prev = child._next = null;
      if (last && !pending)
        pending = child;
      else if (!child.hidden)
        child.hidden = true;
    } else if (child.classList.contains("panel") && !child.hidden) {
      if (pending) {
        if (pending.hidden)
          pending.hidden = false;
        pending._prev = last;
        pending._next = child;
        pending = null;
      }
      last = child;
    }
  }
  if (pending && !pending.hidden)
    pending.hidden = true;
  for (const d of dfDollar2(stack).children(".border-layout-stack-divider").toArray())
    if (!d.nextElementSibling?.classList.contains("panel"))
      d.remove();
  const levels = levelsOf(stack);
  for (const d of dfDollar2(stack).children(".border-layout-stack-divider").toArray()) {
    const live = !d.hidden && open2(d._prev) && (levels || open2(d._next));
    d.setAttribute("aria-disabled", String(!live));
    d.tabIndex = live ? 0 : -1;
    if (!d._prev)
      continue;
    if (!d._prev.id)
      d._prev.id = `${stack.id || layout.id || "stack"}-${Math.random().toString(36).slice(2, 7)}`;
    d.setAttribute("aria-controls", d._prev.id);
    d.setAttribute("aria-label", `Resize ${titleOf(d._prev) || "panel"}`);
    if (live && levels) {
      d.setAttribute("aria-valuenow", String(Math.round(extent(d._prev, row))));
      d.setAttribute("aria-valuemin", String(minOf(d._prev)));
      d.setAttribute("aria-valuemax", String(maxLevel(d._prev)));
    } else if (live) {
      const both = extent(d._prev, row) + extent(d._next, row);
      d.setAttribute("aria-valuenow", String(Math.round(extent(d._prev, row))));
      d.setAttribute("aria-valuemin", String(minOf(d._prev)));
      d.setAttribute("aria-valuemax", String(Math.round(both - minOf(d._next))));
    }
  }
  if (stack.hasAttribute("data-drill"))
    for (const p of panels) {
      const header = dfDollar2(p).children(".panel-header").get(0);
      if (!header)
        continue;
      const crumb = p.hasAttribute("data-minimized");
      if (crumb) {
        header.tabIndex = 0;
        header.setAttribute("role", "button");
        header.setAttribute("aria-label", `Back to ${titleOf(p) || "this level"}`);
      } else if (header.getAttribute("role") === "button") {
        header.removeAttribute("tabindex");
        header.removeAttribute("role");
        header.removeAttribute("aria-label");
      }
    }
  const shown = panels.filter((p) => !p.hidden);
  const folded = shown.length > 0 && shown.every((p) => p.hasAttribute("data-minimized"));
  region.toggleAttribute("data-panel-minimized", folded);
  region.toggleAttribute("data-stack-closed", panels.length > 0 && !shown.length);
  const handle = region.classList.contains("resizer") ? dfDollar2(region).children(".resizer-handle").get(0) : null;
  if (handle)
    handle.inert = folded || !shown.length;
  report(stack, panels);
}
var maxLevel = (panel) => num2(panel.dataset.max, 640);
function moveDivider(layout, side, divider, delta) {
  const { _prev: a, _next: b } = divider;
  const stack = divider.parentElement;
  if (a && levelsOf(stack)) {
    if (!open2(a))
      return;
    const px = extent(a, true) + (side === "east" ? -delta : delta);
    a.style.setProperty("--panel-size", `${Math.round(Math.min(Math.max(px, minOf(a)), maxLevel(a)))}px`);
    return;
  }
  if (!a || !b || !open2(a) || !open2(b))
    return;
  const sizes = new Map(panelsOf(stack).filter(open2).map((p) => [p, extent(p, isRow(stack, side))]));
  const both = sizes.get(a) + sizes.get(b);
  const next = Math.min(Math.max(sizes.get(a) + delta, minOf(a)), both - minOf(b));
  sizes.set(a, next);
  sizes.set(b, both - next);
  for (const [p, px] of sizes)
    p.style.setProperty("--border-layout-share", String(Math.round(px)));
}
function initStacks(layout) {
  for (const side of REGIONS) {
    const region = regionOf(layout, side);
    const stack = stackOf(region);
    if (!stack || stack._stackInit)
      continue;
    stack._stackInit = true;
    const sync = () => syncStack(layout, side, region, stack);
    sync();
    new MutationObserver((records) => {
      const panel = (r) => r.target.parentElement === stack && r.target.classList.contains("panel");
      if (records.some((r) => r.type === "childList" && r.target === stack || r.type === "attributes" && panel(r)))
        sync();
    }).observe(stack, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["data-minimized", "hidden"]
    });
    queueMicrotask(sync);
    stack.addEventListener("pointerdown", (e) => {
      const divider = e.target.closest?.(".border-layout-stack-divider");
      if (!divider || divider.parentElement !== stack || divider.getAttribute("aria-disabled") === "true")
        return;
      e.preventDefault();
      divider.setPointerCapture(e.pointerId);
      divider.setAttribute("data-resizing", "");
      let at = isRow(stack, side) ? e.clientX : e.clientY;
      const move = (ev) => {
        const pos = isRow(stack, side) ? ev.clientX : ev.clientY;
        moveDivider(layout, side, divider, pos - at);
        at = pos;
        sync();
      };
      const end = () => {
        divider.removeAttribute("data-resizing");
        divider.removeEventListener("pointermove", move);
        divider.removeEventListener("pointerup", end);
        divider.removeEventListener("pointercancel", end);
        save(layout);
      };
      divider.addEventListener("pointermove", move);
      divider.addEventListener("pointerup", end);
      divider.addEventListener("pointercancel", end);
    });
    const bar = (e) => {
      if (!stack.hasAttribute("data-drill"))
        return null;
      const header = e.target.closest?.(".panel-header");
      const panel = header?.parentElement;
      if (!panel || panel.parentElement !== stack || !panel.hasAttribute("data-minimized"))
        return null;
      if (e.target.closest(".panel-tools"))
        return null;
      return panel;
    };
    stack.addEventListener("click", (e) => bar(e)?.api?.setState("default"));
    stack.addEventListener("keydown", (e) => {
      if (e.key !== "Enter" && e.key !== " ")
        return;
      const panel = bar(e);
      if (!panel)
        return;
      e.preventDefault();
      panel.api?.setState("default");
    });
    stack.addEventListener("keydown", (e) => {
      const divider = e.target.closest?.(".border-layout-stack-divider");
      if (!divider || divider.parentElement !== stack || divider.getAttribute("aria-disabled") === "true")
        return;
      const step = e.shiftKey ? 100 : 10;
      const back = isRow(stack, side) ? "ArrowLeft" : "ArrowUp", fwd = isRow(stack, side) ? "ArrowRight" : "ArrowDown";
      let delta = e.key === back ? -step : e.key === fwd ? step : e.key === "Home" ? -1e6 : e.key === "End" ? 1e6 : 0;
      if (!delta)
        return;
      if (levelsOf(stack) && side === "east" && (e.key === "Home" || e.key === "End"))
        delta = -delta;
      e.preventDefault();
      moveDivider(layout, side, divider, delta);
      sync();
      save(layout);
    });
  }
}
var saved = new Map;
var savedFor = (layout) => {
  const key = `defuss-shadcn:border-layout:${layout.dataset.save}`;
  if (!saved.has(key)) {
    saved.set(key, persisted(key, {}, {
      validate: (v) => typeof v === "object" && v !== null && !Array.isArray(v)
    }));
  }
  return saved.get(key);
};
function save(layout) {
  if (!layout.dataset.save || layout._restoring)
    return;
  const data = {};
  for (const side of REGIONS) {
    const region = regionOf(layout, side);
    const stack = stackOf(region);
    const weights = stack ? panelsOf(stack).map((p) => num2(p.style.getPropertyValue("--border-layout-share"), 0) || null) : null;
    if (!region?.classList.contains("resizer")) {
      if (weights)
        data[side] = { stack: weights };
      continue;
    }
    const pane = paneOf(region);
    const px = Math.round(num2(pane?.style[SIDES[side].size], NaN));
    data[side] = { size: Number.isFinite(px) ? px : null, collapsed: region.hasAttribute("data-collapsed") };
    if (weights)
      data[side].stack = weights;
  }
  savedFor(layout).set(data);
}
function restore(layout) {
  if (!layout.dataset.save)
    return;
  const data = savedFor(layout).value;
  if (!Object.keys(data).length)
    return;
  layout._restoring = true;
  for (const side of REGIONS) {
    const region = regionOf(layout, side);
    const saved = data[side];
    if (!region || !saved)
      continue;
    if (saved.size)
      setSize(region, side, saved.size);
    if (region.classList.contains("resizer"))
      region.toggleAttribute("data-collapsed", !!saved.collapsed);
    const stack = stackOf(region);
    if (stack && Array.isArray(saved.stack))
      panelsOf(stack).forEach((p, i) => {
        if (saved.stack[i])
          p.style.setProperty("--border-layout-share", String(saved.stack[i]));
      });
  }
  layout._restoring = false;
}
function applyMarkup2(el, stateName, config) {
  const want = new Set(stateName === "collapsed" ? config?.regions ?? (config?.region ? [config.region] : []) : []);
  for (const side of REGIONS) {
    const region = regionOf(el, side);
    if (region)
      dfDollar2(region).attr("data-collapsed", want.has(side) ? "" : null);
  }
}
function triggerStateChange2(layout, stateName, config) {
  if (stateName === "default") {
    for (const side of REGIONS) {
      const region = regionOf(layout, side);
      if (!region)
        continue;
      region.removeAttribute("data-collapsed");
      if (!region._authored)
        continue;
      region.dataset[SIDES[side].axis === "w" ? "maxW" : "maxH"] = region.dataset.maxAuthored ?? "2000";
      setSize(region, side, region._authored);
    }
    clamp(layout);
  } else {
    const want = new Set(config.regions ?? (config.region ? [config.region] : []));
    for (const side of REGIONS) {
      const region = regionOf(layout, side);
      if (region)
        region.toggleAttribute("data-collapsed", want.has(side));
    }
  }
  aria(layout);
  save(layout);
}
var borderLayoutApi = componentState({
  component: "border-layout",
  states: borderLayoutStates,
  apply: (layout, state) => {
    triggerStateChange2(layout, state.name, state.config);
    syncState(layout);
  },
  markup: (el, state) => applyMarkup2(el, state.name, state.config)
});
df$2.borderLayoutApi = borderLayoutApi;
df$2.borderLayoutStates = borderLayoutStates;
function init2() {
  dfDollar2(".border-layout:not([data-init])").toArray().forEach((layout) => {
    layout.dataset.init = "";
    for (const side of REGIONS) {
      const region = regionOf(layout, side);
      if (!region?.classList.contains("resizer"))
        continue;
      const d = region.dataset;
      d.handles ??= SIDES[side].handle;
      d.axis ??= SIDES[side].axis;
      d.keys ??= "edge";
      d.min ??= "48";
      if (d.max)
        d.maxAuthored = d.max;
      const pane = paneOf(region);
      const prop = SIDES[side].size;
      const authored = pane?.style[prop] ?? "";
      if (authored.endsWith("%")) {
        const inner = prop === "width" ? layout.clientWidth : layout.clientHeight;
        pane.style[prop] = `${Math.round(parseFloat(authored) / 100 * inner)}px`;
      }
      region._authored = sizeOf(region, side) || null;
    }
    restore(layout);
    initStacks(layout);
    const before = (e) => {
      const handle = e.target.closest?.(".resizer-handle");
      if (!handle || handle.parentElement?.parentElement !== layout)
        return;
      clamp(layout);
      const side = REGIONS.find((s) => handle.parentElement.classList.contains(`border-layout-${s}`));
      if (e.type === "pointerdown" && side && handle.parentElement.hasAttribute("data-collapsed"))
        collapse(layout, side, false);
    };
    layout.addEventListener("pointerdown", before, true);
    layout.addEventListener("keydown", before, true);
    layout.addEventListener("focusin", (e) => {
      before(e);
      aria(layout);
    });
    const toggle = (handle) => {
      const region = handle.parentElement;
      const side = REGIONS.find((s) => region.classList.contains(`border-layout-${s}`));
      if (!side || !collapsible(layout, region))
        return;
      collapse(layout, side, !region.hasAttribute("data-collapsed"));
    };
    layout.addEventListener("dblclick", (e) => {
      const handle = e.target.closest(".resizer-handle");
      if (handle && handle.parentElement?.parentElement === layout)
        toggle(handle);
    });
    layout.addEventListener("keydown", (e) => {
      const handle = e.target.closest?.(".resizer-handle");
      if (e.key === "Enter" && handle && handle.parentElement?.parentElement === layout) {
        e.preventDefault();
        toggle(handle);
      }
    });
    layout.addEventListener("resizer-resize", (e) => {
      if (e.target.parentElement !== layout)
        return;
      aria(layout);
      save(layout);
    });
    new ResizeObserver(() => {
      clamp(layout);
      aria(layout);
    }).observe(layout);
    bindComponent(layout, borderLayoutApi);
    syncState(layout);
    queueMicrotask(() => {
      clamp(layout);
      aria(layout);
    });
  });
}
var resolveStack = (target) => {
  const el = typeof target === "string" ? dfDollar2(`#${CSS.escape(target)}`).get(0) ?? dfDollar2(target).get(0) : target;
  return el?.classList.contains("border-layout-stack") ? el : null;
};
df$2.borderLayout = {
  collapse: (target, side) => {
    const l = resolve(target);
    if (l)
      collapse(l, side, true);
  },
  expand: (target, side) => {
    const l = resolve(target);
    if (l)
      collapse(l, side, false);
  },
  toggle: (target, side) => {
    const l = resolve(target);
    const region = l && regionOf(l, side);
    if (!region)
      return false;
    collapse(l, side, !region.hasAttribute("data-collapsed"));
    return region.hasAttribute("data-collapsed");
  },
  resize: (target, side, px) => {
    const l = resolve(target);
    const r = l && regionOf(l, side);
    if (r) {
      clamp(l);
      setSize(r, side, px);
    }
  },
  push: (stack, panel) => {
    const st = resolveStack(stack);
    if (!st)
      return null;
    const el = typeof panel === "string" ? dfDollar2(panel).get(0) : panel;
    if (!el)
      return null;
    el.removeAttribute("data-minimized");
    dfDollar2(st).append(el);
    return el;
  },
  pop: (stack, panel) => {
    const st = resolveStack(stack);
    if (!st)
      return null;
    const panels = panelsOf(st);
    const el = typeof panel === "number" ? panels[panel] : typeof panel === "string" ? panels.find((p) => p.id === panel) : panels.includes(panel) ? panel : undefined;
    if (!el)
      return null;
    dropAfter(st, el);
    const api = el.api;
    if (api)
      api.setState("default");
    else
      el.removeAttribute("data-minimized");
    return el;
  },
  levels: (stack) => {
    const st = resolveStack(stack);
    const panels = st ? panelsOf(st) : [];
    return { panels, open: panels.filter(open2) };
  },
  sizes: (target) => {
    const l = resolve(target);
    const out = {};
    if (l)
      for (const side of REGIONS) {
        const r = regionOf(l, side);
        if (r)
          out[side] = sizeOf(r, side);
      }
    return out;
  }
};
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// src/components/charts/chart/chart.ts
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
matchMedia("print").addEventListener("change", () => {
  for (const el of live) {
    const inst = instances2.get(el);
    if (!el.isConnected || !inst || inst.isDisposed?.())
      continue;
    inst.resize({ animation: { duration: 0 } });
    inst.getZr?.().flush();
  }
});
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
function followedFilters(el) {
  const config = el.store?.value?.config;
  return Array.isArray(config?.filters) ? config.filters : [];
}
function bind(el, options) {
  const opts = { ...options };
  let query = { filters: opts.query?.filters ?? [] };
  let rows = [];
  let handle = null;
  let disposed = false;
  let pending = false;
  let wait = null;
  let unsubscribe = null;
  let ready = () => {};
  const mounted = new Promise((resolve) => ready = resolve);
  const start = (option) => {
    handle = mount(el, option);
    ready(handle.instance);
  };
  const build = () => {
    const t0 = performance.now();
    const result = opts.source.aggregate(query, opts.aggregate);
    rows = result.rows;
    const info = {
      rows,
      matched: result.matchedRows,
      total: result.totalRows,
      ms: Math.round((performance.now() - t0) * 10) / 10
    };
    const option = typeof opts.option === "function" ? opts.option(rows, info) : deepMerge(opts.option ?? {}, { dataset: { source: rows } });
    el.dispatchEvent(new CustomEvent("chart-data", {
      detail: { rows: info.rows, matched: info.matched, total: info.total, ms: info.ms },
      bubbles: true
    }));
    return option;
  };
  const draw = () => {
    if (disposed)
      return;
    if (handle) {
      handle.setOption(build());
      return;
    }
    const box = el.getBoundingClientRect();
    if (box.width && box.height) {
      start(build());
      return;
    }
    if (!wait) {
      wait = new ResizeObserver(() => {
        const b = el.getBoundingClientRect();
        if (!b.width || !b.height || handle || disposed)
          return;
        wait?.disconnect();
        wait = null;
        start(build());
      });
      wait.observe(el);
    }
  };
  const schedule = () => {
    if (pending)
      return;
    pending = true;
    queueMicrotask(() => {
      pending = false;
      draw();
    });
  };
  const follow = () => {
    const target = opts.follow;
    if (!target || disposed || unsubscribe)
      return;
    if (!target.store)
      return;
    query = { filters: followedFilters(target) };
    let seen = JSON.stringify(query.filters);
    unsubscribe = target.store.subscribe(() => {
      const filters = followedFilters(target);
      const key = JSON.stringify(filters);
      if (key === seen)
        return;
      seen = key;
      query = { filters };
      schedule();
    });
  };
  follow();
  draw();
  if (opts.follow && !unsubscribe)
    queueMicrotask(() => {
      follow();
      if (unsubscribe)
        schedule();
    });
  return {
    rows: () => rows,
    query: (q) => {
      query = { filters: q?.filters ?? [] };
      draw();
    },
    refresh: () => draw(),
    update: (next) => {
      if (next.aggregate)
        opts.aggregate = next.aggregate;
      if (next.option !== undefined)
        opts.option = next.option;
      if (handle && next.option !== undefined) {
        handle.setOption(build(), true);
        return;
      }
      draw();
    },
    mounted,
    dispose: () => {
      disposed = true;
      unsubscribe?.();
      wait?.disconnect();
      handle?.dispose();
      handle = null;
    }
  };
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
var DECK_TEMPO = {
  animationDuration: 1500,
  animationEasing: "cubicOut",
  animationDurationUpdate: 1500,
  animationEasingUpdate: "cubicInOut"
};
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
df$3.chart = { mount, instance, theme: chartTheme, color: chartColor, deck: chartDeck, bind };
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

// src/components/forms-inputs/combobox/combobox.ts
var df$4 = defussGlobals();
var dfDollar4 = defussQuery();
var comboboxStates = ["default", "open"];
function applyMarkup4(_el, _stateName) {}
function triggerStateChange4(popover, stateName, _config) {
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
  apply: (popover, state) => triggerStateChange4(popover, state.name, state.config),
  read: (popover, state) => {
    const selected = Array.from(dfDollar4(popover).find('[role="option"][aria-selected="true"]').toArray());
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
  markup: (el, state) => applyMarkup4(el, state.name)
});
df$4.comboboxApi = comboboxApi;
df$4.comboboxStates = comboboxStates;
var esc2 = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var idPart = (t) => t.replace(/[^\w-]/g, "_");
var comboSeq = 0;
function hideEmptyGroups(listbox) {
  dfDollar4(listbox).find(".combobox-group-label").each((_i, label) => {
    let next = label.nextElementSibling;
    let groupHasVisible = false;
    while (next && !next.classList.contains("combobox-group-label") && !next.classList.contains("combobox-separator")) {
      if (next.getAttribute("role") === "option" && !next.hidden && !next.classList.contains("combobox-create"))
        groupHasVisible = true;
      next = next.nextElementSibling;
    }
    dfDollar4(label).prop("hidden", !groupHasVisible);
  });
  dfDollar4(listbox).find(".combobox-separator").each((_i, sep) => {
    const prev = sep.previousElementSibling;
    const next = sep.nextElementSibling;
    dfDollar4(sep).prop("hidden", Boolean(prev && prev.hidden || next && next.hidden));
  });
}
function initTags(wrapper) {
  const field = dfDollar4(wrapper).find(".combobox-field").get(0);
  const input = dfDollar4(wrapper).find(".combobox-field-input").get(0);
  const popover = dfDollar4(wrapper).find(".combobox-content").get(0);
  const listbox = dfDollar4(wrapper).find('[role="listbox"]').get(0);
  if (!field || !input || !popover || !listbox)
    return;
  const empty = dfDollar4(wrapper).find(".combobox-empty").get(0);
  const creatable = wrapper.hasAttribute("data-creatable");
  const uid = wrapper.id || popover.id || `dfcb-${++comboSeq}`;
  const options = () => Array.from(dfDollar4(listbox).find('[role="option"]:not(.combobox-create)').toArray());
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
    dfDollar4(listbox).prepend(createRow);
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
  const visible = () => dfDollar4(listbox).find('[role="option"]').toArray().filter((o) => !o.hidden && o.getAttribute("aria-disabled") !== "true");
  const isOpen = () => popover.matches(":popover-open");
  const open = () => {
    if (!isOpen())
      safeShowPopover(popover);
    dfDollar4(input).attr("aria-expanded", "true");
  };
  const close = () => {
    if (isOpen())
      popover.hidePopover();
    dfDollar4(input).attr("aria-expanded", "false");
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
    hideEmptyGroups(listbox);
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
        dfDollar4(option).text(text);
        const firstGroup = dfDollar4(listbox).find(".combobox-group-label").get(0);
        if (firstGroup)
          dfDollar4(firstGroup).before(option);
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
  popover.addEventListener("toggle", () => {
    dfDollar4(input).attr("aria-expanded", String(isOpen()));
  });
}
function init4() {
  dfDollar4(".combobox:not([data-init])").toArray().forEach((wrapper) => {
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
      tags.setAttribute("aria-label", `Selected ${trigger.getAttribute("aria-label") || dfDollar4("#" + CSS.escape(trigger.getAttribute("aria-labelledby") || "")).get(0)?.textContent?.trim() || "options"}`);
      dfDollar4(clearBtn).after(tags);
      tags.addEventListener("click", (e) => {
        const btn = e.target.closest(".combobox-tag-remove");
        if (!btn)
          return;
        const option = Array.from(allItems).find((o) => (o.dataset.value ?? o.textContent.trim()) === btn.dataset.value);
        const all = dfDollar4(tags).find(".combobox-tag-remove").toArray();
        const at = all.indexOf(btn);
        if (option)
          dfDollar4(option).attr("aria-selected", "false");
        renderSelection();
        const rest = dfDollar4(tags).find(".combobox-tag-remove").toArray();
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
        dfDollar4(item).prop("hidden", !match);
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
    popover.addEventListener("toggle", () => {
      const nowOpen = popover.matches(":popover-open");
      $trigger.attr("aria-expanded", String(nowOpen));
      if (!nowOpen)
        clearHighlight();
    });
  });
}
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// src/components/overlays/command/command.ts
var df$5 = defussGlobals();
var dfDollar5 = defussQuery();
var commandStates = ["default", "open"];
function applyMarkup5(el, stateName) {
  dfDollar5(el).attr("open", stateName === "open" ? "" : null);
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
      {
        const input = dfDollar5(dialog).find(".command-input").get(0);
        if (input)
          input.focus();
      }
      break;
  }
}
var shown = (dialog) => dialog.open ? "open" : "default";
var commandApi = componentState({
  component: "command",
  states: commandStates,
  apply: (dialog, state) => triggerStateChange5(dialog, state.name, state.config),
  read: (dialog, state) => ({ name: shown(dialog), config: state.config }),
  markup: (el, state) => applyMarkup5(el, state.name)
});
df$5.commandApi = commandApi;
df$5.commandStates = commandStates;
bindGlobalKeys((e) => {
  if (!(e.metaKey || e.ctrlKey) || e.altKey || e.key.toLowerCase() !== "k")
    return;
  const dialog = dfDollar5("dialog.command").get(0);
  if (!dialog)
    return;
  e.preventDefault();
  if (dialog.open)
    dialog.close();
  else {
    dialog.showModal();
    const input = dfDollar5(dialog).find(".command-input").get(0);
    if (input)
      input.focus();
  }
  return true;
}, { editable: true });
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
function init5() {
  dfDollar5("dialog.command:not([data-init])").toArray().forEach((dialog) => {
    dialog.dataset.init = "";
    bindComponent(dialog, commandApi, { name: shown(dialog), config: {} });
    const input = dfDollar5(dialog).find(".command-input").get(0);
    const list = dfDollar5(dialog).find(".command-list").get(0);
    const empty = dfDollar5(dialog).find(".command-empty").get(0);
    if (!input || !list)
      return;
    let highlightIndex = -1;
    const filter = (q) => {
      const query = q.toLowerCase();
      const external = dialog.dataset.filter === "none";
      let hasVisible = false;
      const $items = dfDollar5(list).find(".command-item");
      $items.each(function() {
        const match = external ? !this.hidden : !query || this.textContent.toLowerCase().includes(query);
        if (!external)
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
    new MutationObserver(() => filter(input.value)).observe(list, { childList: true, subtree: true });
    new MutationObserver(() => filter(input.value)).observe(dialog, {
      attributes: true,
      attributeFilter: ["data-filter"]
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
      dfDollar5(input).val("");
      filter("");
      dfDollar5(list).find(".command-item[data-highlighted]").data("highlighted", null);
      highlightIndex = -1;
    });
  });
  dfDollar5("[data-command-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar5("#" + CSS.escape(trigger.dataset.commandTrigger)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog.showModal();
      const input = dfDollar5(dialog).find(".command-input")[0];
      if (input)
        input.focus();
    });
  });
}
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// src/components/big-data/data-grid/data-grid.ts
var df$6 = defussGlobals();
var dfDollar6 = defussQuery();
var dataGridStates = ["default", "loading", "empty"];
var SAVED_KEYS = ["filters", "sorters", "locked", "columns", "hidden", "widths", "expanded"];
var keepable = (key, value) => key === "widths" ? typeof value === "object" && value !== null && !Array.isArray(value) && Object.values(value).every((w) => typeof w === "number" && w > 0) : Array.isArray(value);
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
var headerRowOf = (root) => dfDollar6(root).find(".data-grid-head > .data-grid-row").get(0);
var headersOf = (root) => {
  const row = headerRowOf(root);
  return row ? dfDollar6(row).children(".data-grid-header").toArray() : [];
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
    lockable: el.dataset.lockable !== "false",
    hideable: el.dataset.hideable !== "false",
    resizable: el.dataset.resizable !== "false",
    movable: el.dataset.movable !== "false",
    lockedAtStart: el.hasAttribute("data-locked"),
    hiddenAtStart: el.hidden,
    sortField: el.dataset.sortField || el.dataset.field,
    options: el.dataset.options ? el.dataset.options.split(",").map((o) => o.trim()) : null,
    editable: el.hasAttribute("data-editable"),
    editor: el.dataset.editor || "",
    rules: columnRules(el)
  }));
}
function columnRules(el) {
  const num = (name) => el.dataset[name] != null && el.dataset[name] !== "" ? Number(el.dataset[name]) : undefined;
  const rules = {};
  if (el.hasAttribute("data-required"))
    rules.required = true;
  if (el.hasAttribute("data-integer"))
    rules.integer = true;
  if (num("min") != null)
    rules.min = num("min");
  if (num("max") != null)
    rules.max = num("max");
  if (el.dataset.step)
    rules.step = el.dataset.step;
  if (num("minLength") != null)
    rules.minLength = num("minLength");
  if (num("maxLength") != null)
    rules.maxLength = num("maxLength");
  if (el.dataset.pattern)
    rules.pattern = el.dataset.pattern;
  if (el.dataset.message)
    rules.message = el.dataset.message;
  return rules;
}
function attachPersistence2(grid, config) {
  grid._saved?.destroy();
  const where = viewPersistence(grid, "data-grid", String(dfDollar6(".data-grid").toArray().indexOf(grid)), config || {});
  grid._saved = where ? persisted(where.key, {}, {
    area: where.area,
    validate: (v) => typeof v === "object" && v !== null && !Array.isArray(v)
  }) : null;
  const kept = {};
  for (const k of SAVED_KEYS)
    if (keepable(k, grid._saved?.value[k]))
      kept[k] = grid._saved.value[k];
  return kept;
}
var authoredSort = (grid) => grid._columns.filter((c) => c.el.dataset.sort === "asc" || c.el.dataset.sort === "desc").map((c) => ({ field: c.sortField, direction: c.el.dataset.sort }));
function ordered(items, locked, fieldOf) {
  const set = new Set(locked || []);
  return [...items.filter((i) => set.has(fieldOf(i))), ...items.filter((i) => !set.has(fieldOf(i)))];
}
function inColumnOrder(items, config, fieldOf) {
  const rank = new Map((config.columns || []).map((f, i) => [f, i]));
  const at = (item, i) => rank.get(fieldOf(item)) ?? rank.size + i;
  return items.map((item, i) => [at(item, i), item]).sort((a, b) => a[0] - b[0]).map((p) => p[1]);
}
var arrange = (items, config, fieldOf) => ordered(inColumnOrder(items, config, fieldOf), config.locked, fieldOf);
function applyMarkup6(root, state) {
  const config = state.config || {};
  const headers = root._columns ? root._columns.map((c) => c.el) : headersOf(root);
  const row = headerRowOf(root);
  const locked = new Set(config.locked || []);
  const sorters = config.sorters || [];
  const hidden = new Set(config.hidden || []);
  if (headers.every((el) => hidden.has(el.dataset.field)))
    hidden.clear();
  const order = arrange(headers, config, (el) => el.dataset.field);
  if (row && order.some((el, i) => dfDollar6(row).children(".data-grid-header").get(i) !== el)) {
    order.forEach((el) => dfDollar6(row).append(el));
  }
  for (const el of headers) {
    const at = sorters.findIndex((s) => s.field === (el.dataset.sortField || el.dataset.field));
    const dir = at < 0 ? null : sorters[at].direction || sorters[at].dir || "asc";
    dfDollar6(el).attr("data-locked", locked.has(el.dataset.field) ? "" : null).attr("hidden", hidden.has(el.dataset.field) ? "" : null).attr("aria-sort", dir ? dir === "asc" ? "ascending" : "descending" : null).attr("data-sort-index", dir && sorters.length > 1 ? String(at + 1) : null);
  }
  dfDollar6(root).attr("data-state", state.name).attr("aria-busy", state.name === "loading" ? "true" : null);
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
function shown2(grid, config) {
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
  const all = arrange(grid._columns, config, (c) => c.field);
  const hidden = new Set(config.hidden || []);
  const visible = all.filter((c) => !hidden.has(c.field));
  const columns = visible.length ? visible : all;
  grid._order = columns;
  const widths = config.widths || {};
  grid.style.setProperty("--data-grid-template", columns.map((c) => widths[c.field] > 0 ? `${widths[c.field]}px` : c.width).join(" "));
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
  dfDollar6(grid._parts.head).append(row);
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
  for (const cell of dfDollar6(row).children(".data-grid-filter-cell").toArray()) {
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
var labelOf = (column) => column.el.textContent.trim();
function buildHeaderTools(grid) {
  for (const column of grid._columns) {
    const label = labelOf(column);
    if (!dfDollar6(column.el).children(".data-grid-menu-button").get(0)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "data-grid-menu-button";
      button.tabIndex = -1;
      button.dataset.field = column.field;
      button.setAttribute("aria-haspopup", "menu");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", `${label} column menu`);
      dfDollar6(column.el).append(button);
    }
    if (column.resizable && !dfDollar6(column.el).children(".data-grid-resizer").get(0)) {
      const handle = document.createElement("span");
      handle.className = "data-grid-resizer";
      handle.dataset.field = column.field;
      handle.setAttribute("role", "separator");
      handle.setAttribute("aria-orientation", "vertical");
      handle.setAttribute("aria-label", `Resize ${label}`);
      dfDollar6(column.el).append(handle);
    }
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
  cell.toggleAttribute("data-editable", !!column.editable && !grid.hasAttribute("data-readonly"));
  delete cell.dataset.editing;
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
  let edShown = false;
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
    const ed = grid._editor;
    if (ed && ed.id === id) {
      edShown = true;
      if (!row.contains(ed.wrap)) {
        const focused = ed.wrap.contains(document.activeElement) || !document.activeElement || document.activeElement === document.body;
        ed.rowEl = row;
        placeEditor(grid, ed);
        if (focused)
          editorControl(ed.editor).focus({ preventScroll: true });
      }
    }
    if (grid.dataset.select)
      row.setAttribute("aria-selected", String(selected.has(id)));
    else
      row.removeAttribute("aria-selected");
    for (let c = 0;c < row.children.length; c++) {
      row.children[c].tabIndex = focus.row === index && focus.col === c ? 0 : -1;
    }
  }
  if (grid._editor && !edShown && !grid._writing)
    queueMicrotask(() => {
      if (grid._editor && !commitEdit(grid, "none"))
        cancelEdit(grid, false);
    });
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
    for (const [act, name] of [
      ["first", "First page"],
      ["prev", "Previous page"],
      ["label"],
      ["next", "Next page"],
      ["last", "Last page"]
    ]) {
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
  dfDollar6(grid._parts.pager).find(".data-grid-page-label").get(0).textContent = `Page ${count(page + 1)} of ${count(pages)}`;
  for (const button of dfDollar6(grid._parts.pager).find("[data-page]").toArray()) {
    const back = button.dataset.page === "first" || button.dataset.page === "prev";
    button.disabled = back ? page <= 0 : page >= pages - 1;
  }
}
function refresh(grid, config, previous) {
  grid._config = config;
  if (grid._editor && !grid._writing) {
    grid._writing = true;
    if (!commitEdit(grid, "none"))
      grid._editor = null;
    grid._writing = false;
  }
  evaluate(grid, config);
  grid._selected = new Set(config.selected || []);
  grid._shown = shown2(grid, config);
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
  grid.setAttribute("aria-colcount", String(grid._order.length));
  if (grid._focus.col >= grid._order.length)
    grid._focus = { ...grid._focus, col: Math.max(0, grid._order.length - 1) };
  renderRows(grid);
  renderFooter(grid, config);
  return grid._result.entries.length;
}
function triggerStateChange6(grid, state, previous) {
  grid._config = state.config;
  let name = state.name;
  if (name !== "loading" && grid._parts) {
    const rows = refresh(grid, state.config, previous);
    if (name === "default" && !rows)
      name = "empty";
  }
  applyMarkup6(grid, { name, config: state.config });
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
  apply: (grid, state, previous) => triggerStateChange6(grid, state, previous),
  markup: (el, state) => applyMarkup6(el, state)
});
df$6.dataGridApi = dataGridApi;
df$6.dataGridStates = dataGridStates;
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
    next = [
      ...new Set([...grid._selected, ...grid._shown.slice(from, to + 1).map((e) => e.row[grid._source.idField])])
    ];
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
  const target = row === -1 ? grid._order[col].el : dfDollar6(grid._parts.pool).children(".data-grid-row").toArray().find((r) => r._index === row)?.children[col];
  target?.focus({ preventScroll: row === -1 });
}
var editableColumn = (grid, col) => {
  const column = grid._order?.[col];
  return column?.editable ? column : null;
};
var editContext = (grid, record, column) => ({
  record,
  field: column.field,
  type: column.editor || (column.type === "number" ? "number" : valueType(record[column.field], column.options ? { options: column.options } : null)),
  rules: { ...column.rules, ...column.options ? { options: column.options } : {} },
  grid
});
var rowElOf = (grid, id) => dfDollar6(grid._parts.pool).children(".data-grid-row").toArray().find((r) => grid._shown[r._index]?.row[grid._source.idField] === id);
function placeEditor(grid, ed) {
  const col = grid._order.findIndex((c) => c.field === ed.field);
  const cell = ed.rowEl?.children[col];
  if (!cell)
    return;
  ed.cell = cell;
  cell.dataset.editing = "";
  const content = dfDollar6(cell).children(".data-grid-content").get(0);
  if (content && content !== ed.wrap)
    content.replaceWith(ed.wrap);
  else if (!cell.contains(ed.wrap))
    dfDollar6(cell).append(ed.wrap);
}
function openEdit(grid, row, col) {
  const column = editableColumn(grid, col);
  const entry = grid._shown?.[row];
  if (!column || !entry || grid.hasAttribute("data-readonly"))
    return false;
  if (grid._editor && !commitEdit(grid, "none"))
    return false;
  const record = entry.row;
  const value = record[column.field];
  const ctx = editContext(grid, record, column);
  const custom = grid._sourceOptions?.getEditorFn?.(column.field, value, ctx);
  if (custom === false)
    return false;
  const editor = asEditor(custom) ?? builtinEditor(ctx.type, value, ctx.rules, { colorClass: "data-grid-color-input" });
  focusCell(grid, row, col);
  const id = record[grid._source.idField];
  const wrap = document.createElement("span");
  wrap.className = "data-grid-editor data-grid-content";
  dfDollar6(wrap).append(editor.el);
  const ed = { id, field: column.field, column, editor, wrap, value, record, rowEl: rowElOf(grid, id), cell: null };
  grid._editor = ed;
  placeEditor(grid, ed);
  wrap.addEventListener("keydown", (e) => {
    const act = editorKey(e, editor);
    if (!act)
      return;
    if (act === "cancel") {
      e.preventDefault();
      e.stopPropagation();
      cancelEdit(grid);
      return;
    }
    e.preventDefault();
    e.stopPropagation();
    commitEdit(grid, act === "commit" ? "stay" : act);
  });
  wrap.addEventListener("change", () => {
    if (editor.immediate)
      commitEdit(grid, "stay");
  });
  wrap.addEventListener("focusout", (e) => {
    if (wrap.contains(e.relatedTarget))
      return;
    setTimeout(() => {
      if (grid._editor === ed && !wrap.contains(document.activeElement))
        commitEdit(grid, "none");
    }, 0);
  });
  focusEditor(editor);
  return true;
}
function cancelEdit(grid, focus = true) {
  const ed = grid._editor;
  if (!ed)
    return;
  grid._editor = null;
  grid._gen++;
  renderRows(grid);
  if (focus)
    focusRecord(grid, ed.id, ed.field);
}
function focusRecord(grid, id, field, by = 0) {
  const row = grid._shown.findIndex((x) => x.row[grid._source.idField] === id);
  const col = grid._order.findIndex((c) => c.field === field);
  if (row < 0 || col < 0)
    return;
  if (!by)
    return focusCell(grid, row, col);
  const editable = grid._order.map((c, i) => c.editable ? i : -1).filter((i) => i >= 0);
  let at = editable.indexOf(col) + by;
  let r = row;
  if (at >= editable.length)
    [at, r] = [0, row + 1];
  if (at < 0)
    [at, r] = [editable.length - 1, row - 1];
  if (r < 0 || r >= grid._shown.length)
    return focusCell(grid, row, col);
  openEdit(grid, r, editable[at]);
}
function showEditProblem(ed, problem) {
  const control = editorControl(ed.editor);
  control.setAttribute("aria-invalid", "true");
  let note = dfDollar6(ed.wrap).children(".data-grid-error").get(0);
  if (!note) {
    note = document.createElement("span");
    note.className = "data-grid-error";
    note.setAttribute("role", "alert");
    note.id = `dg-error-${Math.random().toString(36).slice(2, 8)}`;
    dfDollar6(ed.wrap).append(note);
    control.setAttribute("aria-describedby", note.id);
  }
  dfDollar6(note).text(problem);
}
function writeRecord(grid, id, patch) {
  const idField = grid._source.idField;
  const rows = grid._source.rows;
  const at = rows.findIndex((r) => r[idField] === id);
  if (at < 0)
    return null;
  const record = { ...rows[at], ...patch };
  const next = rows.slice();
  next[at] = record;
  grid._source.setRows(next);
  grid._writing = true;
  triggerStateChange6(grid, grid.store.value, grid.store.value);
  grid._writing = false;
  return record;
}
function commitEdit(grid, then = "stay") {
  const ed = grid._editor;
  if (!ed)
    return true;
  let problem = ed.editor.validate?.() ?? "";
  let value;
  if (!problem) {
    try {
      value = ed.editor.getValue();
    } catch (error) {
      problem = String(error.message ?? error);
    }
  }
  const ctx = editContext(grid, ed.record, ed.column);
  if (!problem)
    problem = editorProblem(ctx.rules, value);
  if (!problem) {
    const answer = grid._sourceOptions?.validateFn?.(ed.field, value, ctx);
    if (typeof answer === "string" && answer)
      problem = answer;
    else if (answer === false)
      problem = "Invalid value";
  }
  if (problem) {
    showEditProblem(ed, problem);
    return false;
  }
  grid._editor = null;
  const oldValue = ed.value;
  const before = new CustomEvent("data-grid-beforeedit", {
    bubbles: true,
    cancelable: true,
    detail: { record: ed.record, field: ed.field, value, oldValue }
  });
  const same = JSON.stringify(value) === JSON.stringify(oldValue) && !ed.editor.patch;
  if (same || !grid.dispatchEvent(before)) {
    grid._gen++;
    renderRows(grid);
  } else {
    const record = writeRecord(grid, ed.id, { ...ed.editor.patch?.(), [ed.field]: value });
    grid.dispatchEvent(new CustomEvent("data-grid-edit", {
      bubbles: true,
      detail: { record, field: ed.field, value, oldValue }
    }));
  }
  if (then === "stay")
    focusRecord(grid, ed.id, ed.field);
  else if (then === "next" || then === "prev")
    focusRecord(grid, ed.id, ed.field, then === "next" ? 1 : -1);
  return true;
}
function onKeydown2(grid, e) {
  if (e.target.closest?.(".data-grid-filters, .data-grid-footer, .data-grid-menu, .data-grid-editor"))
    return;
  if (e.target.closest?.(".data-grid-row :is(a, button, input, select, textarea, label, [contenteditable])"))
    return;
  const { row, col } = grid._focus;
  const page = Math.max(1, Math.floor((grid._parts.viewport.clientHeight - grid._parts.head.offsetHeight) / rowHeight(grid)) - 1);
  const last = grid._shown.length - 1;
  const entry = row >= 0 ? grid._shown[row] : null;
  const header = row === -1 ? grid._order[col] : null;
  if (header && e.altKey && !e.ctrlKey && !e.metaKey) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      openMenu(grid, header);
      return;
    }
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const later = e.key === "ArrowRight";
      if (e.shiftKey) {
        if (header.movable)
          dropColumn(grid, header.field, later ? col + 2 : col - 1);
        focusCell(grid, -1, grid._order.indexOf(header));
      } else if (header.resizable) {
        const width = Math.round(header.el.getBoundingClientRect().width) + (later ? KEY_STEP : -KEY_STEP);
        query(grid, { widths: { ...configOf(grid).widths, [header.field]: Math.max(MIN_WIDTH, width) } });
        focusCell(grid, -1, col);
      }
      return;
    }
  }
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
    case "F2":
      if (row < 0 || !openEdit(grid, row, col))
        return;
      e.preventDefault();
      return;
    case "Enter":
      if (row >= 0 && !e.shiftKey && editableColumn(grid, col) && openEdit(grid, row, col)) {
        e.preventDefault();
        return;
      }
      if (row === -1) {
        const column = grid._order[col];
        if (column.sortable)
          query(grid, { sorters: cycleSort(configOf(grid).sorters, column.sortField, e.shiftKey), page: 0 });
        next = [-1, col];
      } else if (entry) {
        grid.dispatchEvent(new CustomEvent("data-grid-activate", {
          bubbles: true,
          detail: { record: entry.row, index: row }
        }));
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
  if (grid._suppressClick || t.closest(".data-grid-menu, .data-grid-resizer, .data-grid-editor"))
    return;
  const menuButton = t.closest(".data-grid-menu-button");
  if (menuButton) {
    const column = grid._columns.find((c) => c.field === menuButton.dataset.field);
    if (grid._menuClosedBy !== menuButton && column)
      openMenu(grid, column);
    grid._menuClosedBy = null;
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
    const filters = dfDollar6(grid._parts.filters).find(".data-grid-filter").toArray().map((el) => parseFilter(el.dataset.field, el.value, el.dataset.kind)).filter(Boolean);
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
var MIN_WIDTH = 48;
var KEY_STEP = 16;
var LONG_PRESS_MS = 450;
var DRAG_SLOP = 6;
var TOUCH_SLOP = 10;
var anchorPositioning = typeof CSS !== "undefined" && CSS.supports("anchor-name: --a");
var menuSeq = 0;
var columnFields = (grid, config) => inColumnOrder(grid._columns, config, (c) => c.field).map((c) => c.field);
function setLocked(grid, field, on) {
  const config = configOf(grid);
  const locked = new Set(config.locked || []);
  if (on)
    locked.add(field);
  else
    locked.delete(field);
  query(grid, { locked: columnFields(grid, config).filter((f) => locked.has(f)) });
}
function setHidden(grid, field, on) {
  const config = configOf(grid);
  const hidden = new Set(config.hidden || []);
  if (on)
    hidden.add(field);
  else
    hidden.delete(field);
  if (grid._columns.every((c) => hidden.has(c.field)))
    return;
  query(grid, { hidden: grid._columns.map((c) => c.field).filter((f) => hidden.has(f)) });
}
function dropColumn(grid, field, gap) {
  const config = configOf(grid);
  const shownFields = grid._order.map((c) => c.field);
  const from = shownFields.indexOf(field);
  const column = grid._columns.find((c) => c.field === field);
  if (from < 0 || !column)
    return;
  gap = Math.max(0, Math.min(shownFields.length, gap));
  if (gap === from || gap === from + 1)
    return;
  const locked = new Set(config.locked || []);
  const rest = shownFields.filter((f) => f !== field);
  const lockedCount = rest.filter((f) => locked.has(f)).length;
  let at = gap > from ? gap - 1 : gap;
  if (at < lockedCount && !column.lockable)
    at = lockedCount;
  if (at < lockedCount)
    locked.add(field);
  else if (at > lockedCount)
    locked.delete(field);
  rest.splice(at, 0, field);
  const before = arrange(grid._columns, config, (c) => c.field).map((c) => c.field);
  const hidden = new Set(config.hidden || []);
  before.forEach((f, i) => {
    if (!hidden.has(f))
      return;
    const after = rest.indexOf(before[i - 1]);
    rest.splice(after + 1, 0, f);
  });
  query(grid, { columns: rest, locked: rest.filter((f) => locked.has(f)) });
}
function resetColumns(grid) {
  query(grid, {
    columns: grid._columns.map((c) => c.field),
    locked: grid._columns.filter((c) => c.lockedAtStart).map((c) => c.field),
    hidden: grid._columns.filter((c) => c.hiddenAtStart).map((c) => c.field),
    widths: {}
  });
}
function menuOf(grid) {
  if (grid._menu)
    return grid._menu;
  const menu = document.createElement("div");
  menu.className = "data-grid-menu";
  menu.id = `data-grid-menu-${++menuSeq}`;
  menu.setAttribute("popover", "auto");
  menu.setAttribute("role", "menu");
  dfDollar6(grid).append(menu);
  menu.addEventListener("click", (e) => onMenuClick(grid, e));
  menu.addEventListener("keydown", (e) => onMenuKey(grid, e));
  menu.addEventListener("toggle", (e) => {
    const open = e.newState === "open";
    const button = grid._menuButton;
    button?.setAttribute("aria-expanded", String(open));
    if (open)
      return;
    const inside = menu.contains(document.activeElement) || document.activeElement === document.body;
    const column = grid._columns.find((c) => c.field === grid._menuField);
    grid._menuField = null;
    if (inside && column) {
      const at = grid._order.indexOf(column);
      focusCell(grid, -1, at >= 0 ? at : Math.min(grid._focus.col, grid._order.length - 1));
    }
  });
  grid._menu = menu;
  return menu;
}
function menuItem2(role, action, text, checked, disabled, field) {
  const item = document.createElement("button");
  item.type = "button";
  item.className = "data-grid-menu-item";
  item.tabIndex = -1;
  item.setAttribute("role", role);
  item.dataset.action = action;
  if (field)
    item.dataset.field = field;
  if (checked !== null)
    item.setAttribute("aria-checked", String(checked));
  item.disabled = disabled;
  item.textContent = text;
  return item;
}
function menuPart(className, role) {
  const el = document.createElement("div");
  el.className = className;
  el.setAttribute("role", role);
  return el;
}
function fillMenu(grid) {
  const menu = grid._menu;
  const column = grid._columns.find((c) => c.field === grid._menuField);
  if (!menu || !column)
    return;
  const config = configOf(grid);
  const sorter = (config.sorters || []).find((x) => x.field === column.sortField);
  const dir = sorter ? sorter.direction || sorter.dir || "asc" : null;
  const locked = new Set(config.locked || []);
  const hidden = new Set(config.hidden || []);
  const shownCount = grid._columns.filter((c) => !hidden.has(c.field)).length;
  menu.setAttribute("aria-label", `${labelOf(column)} column`);
  const group = menuPart("data-grid-menu-group", "group");
  group.setAttribute("aria-label", "Columns");
  const title = document.createElement("div");
  title.className = "data-grid-menu-label";
  title.setAttribute("aria-hidden", "true");
  title.textContent = "Columns";
  group.append(title, ...arrange(grid._columns, config, (c) => c.field).map((c) => {
    const isShown = !hidden.has(c.field);
    return menuItem2("menuitemcheckbox", "show", labelOf(c), isShown, !c.hideable || isShown && shownCount === 1, c.field);
  }));
  menu.textContent = "";
  menu.append(menuItem2("menuitemradio", "asc", "Sort ascending", dir === "asc", !column.sortable), menuItem2("menuitemradio", "desc", "Sort descending", dir === "desc", !column.sortable), menuPart("data-grid-menu-separator", "separator"), menuItem2("menuitemcheckbox", "lock", "Lock column", locked.has(column.field), !column.lockable), menuPart("data-grid-menu-separator", "separator"), group, menuPart("data-grid-menu-separator", "separator"), menuItem2("menuitem", "reset", "Reset columns", null, false));
}
var menuItems = (grid) => dfDollar6(grid._menu).find(".data-grid-menu-item").toArray().filter((b) => !b.disabled);
function openMenu(grid, column) {
  const menu = menuOf(grid);
  const button = dfDollar6(column.el).children(".data-grid-menu-button").get(0);
  if (!button || column.el.hidden)
    return;
  if (grid._menuButton && grid._menuButton !== button) {
    grid._menuButton.style.removeProperty("anchor-name");
    grid._menuButton.setAttribute("aria-expanded", "false");
  }
  grid._menuButton = button;
  button.setAttribute("aria-expanded", "true");
  grid._menuField = column.field;
  const anchor = `--${menu.id}`;
  button.style.setProperty("anchor-name", anchor);
  menu.style.setProperty("position-anchor", anchor);
  fillMenu(grid);
  if (!menu.matches(":popover-open"))
    menu.showPopover();
  if (!anchorPositioning) {
    const box = button.getBoundingClientRect();
    menu.style.top = `${Math.min(box.bottom + 4, innerHeight - menu.offsetHeight - 8)}px`;
    menu.style.left = `${Math.max(8, Math.min(box.right - menu.offsetWidth, innerWidth - menu.offsetWidth - 8))}px`;
  }
  menuItems(grid)[0]?.focus({ preventScroll: true });
}
function onMenuClick(grid, e) {
  const item = e.target.closest(".data-grid-menu-item");
  const column = grid._columns.find((c) => c.field === grid._menuField);
  if (!item || item.disabled || !column)
    return;
  const action = item.dataset.action;
  if (action === "asc" || action === "desc") {
    query(grid, { sorters: [{ field: column.sortField, direction: action }], page: 0 });
    grid._menu.hidePopover();
    return;
  }
  if (action === "reset") {
    resetColumns(grid);
    grid._menu.hidePopover();
    return;
  }
  if (action === "lock")
    setLocked(grid, column.field, item.getAttribute("aria-checked") !== "true");
  if (action === "show") {
    const hide = item.getAttribute("aria-checked") === "true";
    setHidden(grid, item.dataset.field, hide);
    if (hide && item.dataset.field === column.field) {
      grid._menu.hidePopover();
      return;
    }
  }
  fillMenu(grid);
  const again = menuItems(grid).find((b) => b.dataset.action === action && (b.dataset.field ?? "") === (item.dataset.field ?? ""));
  again?.focus({ preventScroll: true });
}
function onMenuKey(grid, e) {
  const items = menuItems(grid);
  const at = items.indexOf(document.activeElement);
  let next = -1;
  if (e.key === "ArrowDown")
    next = (at + 1) % items.length;
  else if (e.key === "ArrowUp")
    next = (at - 1 + items.length) % items.length;
  else if (e.key === "Home")
    next = 0;
  else if (e.key === "End")
    next = items.length - 1;
  else if (e.key === "Tab") {
    e.preventDefault();
    grid._menu.hidePopover();
    return;
  } else
    return;
  e.preventDefault();
  items[next]?.focus({ preventScroll: true });
}
var isRtl = (grid) => getComputedStyle(grid).direction === "rtl";
function onPointerDown(grid, e) {
  if (e.button !== 0 || !e.isPrimary)
    return;
  const t = e.target;
  const header = t.closest(".data-grid-header");
  if (!header || !grid._parts.head.contains(header))
    return;
  const column = grid._columns.find((c) => c.el === header);
  if (!column)
    return;
  const menuButton = t.closest(".data-grid-menu-button");
  if (menuButton) {
    grid._menuClosedBy = grid._menu?.matches(":popover-open") && grid._menuButton === menuButton ? menuButton : null;
    return;
  }
  const handle = t.closest(".data-grid-resizer");
  if (handle) {
    if (!column.resizable)
      return;
    e.preventDefault();
    try {
      handle.setPointerCapture(e.pointerId);
    } catch {}
    grid._press = {
      id: e.pointerId,
      column,
      x: e.clientX,
      resize: true,
      handle,
      start: header.getBoundingClientRect().width,
      width: 0,
      rtl: isRtl(grid)
    };
    handle.setAttribute("data-active", "");
    grid.setAttribute("data-resizing", "");
    return;
  }
  const press = {
    id: e.pointerId,
    column,
    x: e.clientX,
    y: e.clientY,
    touch: e.pointerType === "touch",
    long: false,
    dragging: false,
    timer: 0,
    gap: -1,
    tx: 0,
    lastX: e.clientX,
    edge: 0
  };
  grid._press = press;
  if (press.touch)
    press.timer = setTimeout(() => {
      press.long = true;
      header.setAttribute("data-pressed", "");
      if (navigator.userActivation?.hasBeenActive)
        navigator.vibrate?.(10);
    }, LONG_PRESS_MS);
}
function onPointerMove(grid, e) {
  const press = grid._press;
  if (!press || e.pointerId !== press.id)
    return;
  if (!press.touch && !press.dragging && !press.resize && !e.buttons) {
    endPress(grid);
    return;
  }
  if (press.resize) {
    const dx = (e.clientX - press.x) * (press.rtl ? -1 : 1);
    press.width = Math.max(MIN_WIDTH, Math.round(press.start + dx));
    if (!press.frame)
      press.frame = requestAnimationFrame(() => {
        press.frame = 0;
        showWidths(grid, { ...configOf(grid).widths, [press.column.field]: press.width });
      });
    return;
  }
  const dx = e.clientX - press.x;
  const dy = e.clientY - press.y;
  if (!press.dragging) {
    if (press.touch && !press.long) {
      if (Math.hypot(dx, dy) > TOUCH_SLOP)
        endPress(grid);
      return;
    }
    if (Math.abs(dx) < DRAG_SLOP || !press.column.movable)
      return;
    beginDrag(grid, e);
  }
  press.lastX = e.clientX;
  dragTo(grid);
}
function showWidths(grid, widths) {
  const config = { ...configOf(grid), widths };
  layoutColumns(grid, config);
  syncFilters(grid, config);
  grid._gen++;
  renderRows(grid);
}
function beginDrag(grid, e) {
  const press = grid._press;
  const header = press.column.el;
  press.dragging = true;
  press.grab = e.clientX - header.getBoundingClientRect().left;
  try {
    header.setPointerCapture(e.pointerId);
  } catch {}
  if (grid._menu?.matches(":popover-open"))
    grid._menu.hidePopover();
  header.setAttribute("data-dragging", "");
  grid.setAttribute("data-dragging", "");
  const marker = document.createElement("div");
  marker.className = "data-grid-drop-marker";
  marker.setAttribute("aria-hidden", "true");
  dfDollar6(grid._parts.head).append(marker);
  press.marker = marker;
}
function dragTo(grid) {
  const press = grid._press;
  if (!press?.dragging)
    return;
  const header = press.column.el;
  const rtl = isRtl(grid);
  const rects = grid._order.map((c) => {
    const r = c.el.getBoundingClientRect();
    return c === press.column ? { left: r.left - press.tx, right: r.right - press.tx, width: r.width } : r;
  });
  const own = rects[grid._order.indexOf(press.column)];
  press.tx = press.lastX - press.grab - own.left;
  header.style.translate = `${press.tx}px 0`;
  const mid = (r) => r.left + r.width / 2;
  let gap = rects.filter((r) => rtl ? mid(r) > press.lastX : mid(r) < press.lastX).length;
  gap = Math.max(0, Math.min(rects.length, gap));
  press.gap = gap;
  const head = grid._parts.head.getBoundingClientRect();
  const edge = gap < rects.length ? rtl ? rects[gap].right : rects[gap].left : rtl ? rects[gap - 1].left : rects[gap - 1].right;
  press.marker.style.left = `${edge - head.left}px`;
  const from = grid._order.indexOf(press.column);
  press.marker.hidden = gap === from || gap === from + 1;
  const view = grid._parts.viewport.getBoundingClientRect();
  press.edge = press.lastX < view.left + 32 ? -1 : press.lastX > view.right - 32 ? 1 : 0;
  if (press.edge && !press.scrolling) {
    press.scrolling = true;
    const step = () => {
      if (grid._press !== press || !press.edge) {
        press.scrolling = false;
        return;
      }
      grid._parts.viewport.scrollLeft += press.edge * 12;
      dragTo(grid);
      requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
}
function onPointerUp(grid, e) {
  const press = grid._press;
  if (!press || e.pointerId !== press.id)
    return;
  if (press.resize) {
    if (press.width)
      query(grid, { widths: { ...configOf(grid).widths, [press.column.field]: press.width } });
    endPress(grid, true);
    return;
  }
  if (press.dragging) {
    const { column, gap } = press;
    endPress(grid, true);
    if (gap >= 0)
      dropColumn(grid, column.field, gap);
    focusCell(grid, -1, grid._order.indexOf(column));
    return;
  }
  const long = press.long;
  endPress(grid, long);
  if (long)
    openMenu(grid, press.column);
}
function endPress(grid, swallowClick = false) {
  const press = grid._press;
  if (!press)
    return;
  grid._press = null;
  clearTimeout(press.timer);
  cancelAnimationFrame(press.frame);
  press.column.el.removeAttribute("data-pressed");
  press.column.el.removeAttribute("data-dragging");
  press.column.el.style.removeProperty("translate");
  press.marker?.remove();
  press.handle?.removeAttribute("data-active");
  grid.removeAttribute("data-dragging");
  grid.removeAttribute("data-resizing");
  if (swallowClick) {
    grid._suppressClick = true;
    setTimeout(() => {
      grid._suppressClick = false;
    });
  }
}
var resolve2 = (target) => typeof target === "string" ? dfDollar6(target).get(0) : target;
df$6.dataGrid = {
  setSource(target, rows, options = {}) {
    const grid = resolve2(target);
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
    query(resolve2(target), patch);
  },
  rows: (target) => (resolve2(target)._result?.entries ?? []).map((e) => e.row),
  source: (target) => resolve2(target)._source,
  selected(target) {
    const grid = resolve2(target);
    const ids = grid._selected ?? new Set;
    return (grid._source?.rows ?? []).filter((r) => ids.has(r[grid._source.idField]));
  },
  selectAll: (target) => selectAll(resolve2(target)),
  clearSelection: (target) => {
    query(resolve2(target), { selected: [] });
  },
  expandAll(target) {
    const grid = resolve2(target);
    query(grid, { expanded: grid._source.branchIds(), collapsed: [] });
  },
  collapseAll(target) {
    const grid = resolve2(target);
    const filtering = (configOf(grid).filters || []).length > 0;
    query(grid, filtering ? { collapsed: grid._source.branchIds() } : { expanded: [] });
  },
  resetColumns: (target) => resetColumns(resolve2(target)),
  edit(target, id, field) {
    const grid = resolve2(target);
    const row = grid._shown.findIndex((x) => x.row[grid._source.idField] === id);
    const col = grid._order.findIndex((c) => c.field === field);
    if (row < 0 || col < 0)
      return false;
    focusCell(grid, row, col);
    return openEdit(grid, row, col);
  },
  commit: (target) => commitEdit(resolve2(target)),
  cancel: (target) => cancelEdit(resolve2(target)),
  update(target, id, patch) {
    const grid = resolve2(target);
    const old = grid._source.rows.find((r) => r[grid._source.idField] === id);
    if (!old)
      return null;
    const record = writeRecord(grid, id, patch);
    for (const field of Object.keys(patch))
      grid.dispatchEvent(new CustomEvent("data-grid-edit", {
        bubbles: true,
        detail: { record, field, value: patch[field], oldValue: old[field] }
      }));
    return record;
  }
};
function init6() {
  dfDollar6(".data-grid:not([data-init])").toArray().forEach((grid) => {
    grid.dataset.init = "";
    const viewport = dfDollar6(grid).children(".data-grid-viewport").get(0);
    const head = viewport && dfDollar6(viewport).children(".data-grid-head").get(0);
    const body = viewport && dfDollar6(viewport).children(".data-grid-body").get(0);
    if (!viewport || !head || !body)
      return;
    let footer = dfDollar6(grid).children(".data-grid-footer").get(0);
    if (!footer) {
      footer = document.createElement("div");
      footer.className = "data-grid-footer";
      dfDollar6(grid).append(footer);
    }
    body.dataset.emptyText = grid.dataset.emptyText || "No rows match.";
    const pool = document.createElement("div");
    pool.className = "data-grid-rows";
    pool.setAttribute("role", "presentation");
    dfDollar6(body).append(pool);
    grid._parts = { viewport, head, body, pool, footer };
    grid._columns = readColumns(grid);
    grid._order = grid._columns;
    grid._shown = [];
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
    buildHeaderTools(grid);
    buildFilters(grid);
    const early = grid._sourceOptions || {};
    const config = {
      filters: [],
      sorters: authoredSort(grid),
      locked: grid._columns.filter((c) => c.lockedAtStart).map((c) => c.field),
      columns: grid._columns.map((c) => c.field),
      hidden: grid._columns.filter((c) => c.hiddenAtStart).map((c) => c.field),
      widths: {},
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
    head.addEventListener("pointerdown", (e) => onPointerDown(grid, e));
    grid.addEventListener("pointermove", (e) => onPointerMove(grid, e));
    grid.addEventListener("pointerup", (e) => onPointerUp(grid, e));
    grid.addEventListener("pointercancel", () => endPress(grid));
    head.addEventListener("touchmove", (e) => {
      if (grid._press && (grid._press.long || grid._press.dragging || grid._press.resize))
        e.preventDefault();
    }, { passive: false });
    head.addEventListener("contextmenu", (e) => {
      const header = e.target.closest(".data-grid-header");
      const column = grid._columns.find((c) => c.el === header);
      if (!column)
        return;
      e.preventDefault();
      if (grid._press?.touch)
        grid._press.long = true;
      else
        openMenu(grid, column);
    });
    grid.addEventListener("dblclick", (e) => {
      const cell = e.target.closest(".data-grid-cell");
      const rowEl = cell?.closest(".data-grid-row");
      if (cell && rowEl && grid._parts.pool.contains(rowEl) && !cell.hasAttribute("data-editing")) {
        if (openEdit(grid, rowEl._index, [...rowEl.children].indexOf(cell)))
          e.preventDefault();
        return;
      }
      const handle = e.target.closest(".data-grid-resizer");
      if (!handle)
        return;
      const field = handle.dataset.field ?? "";
      const { [field]: _dropped, ...widths } = configOf(grid).widths || {};
      query(grid, { widths });
    });
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
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// src/components/overlays/dialog/dialog.ts
var df$7 = defussGlobals();
var dfDollar7 = defussQuery();
var dialogStates = ["default", "open"];
function applyMarkup7(dialog, stateName) {
  dfDollar7(dialog).attr("open", stateName === "open" ? "" : null);
}
function triggerStateChange7(dialog, stateName, _config) {
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
var shown3 = (dialog) => dialog.open ? "open" : "default";
var dialogApi = componentState({
  component: "dialog",
  states: dialogStates,
  apply: (dialog, state) => triggerStateChange7(dialog, state.name, state.config),
  read: (dialog, state) => ({ name: shown3(dialog), config: state.config }),
  markup: (el, state) => applyMarkup7(el, state.name)
});
df$7.dialogApi = dialogApi;
df$7.dialogStates = dialogStates;
function init7() {
  dfDollar7("[data-dialog-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar7("#" + CSS.escape(trigger.dataset.dialogTrigger)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog._trigger = trigger;
      dialog.showModal();
    });
  });
  dfDollar7("dialog:not(.alert-dialog):not(.sheet):not(.command):not(.window):not(.cookie-consent-dialog):not([data-init])").toArray().forEach((dialog) => {
    dfDollar7(dialog).data("init", "");
    bindComponent(dialog, dialogApi, { name: shown3(dialog), config: {} });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog)
        dialog.close();
    });
    dfDollar7(dialog).find("[data-dialog-close]").toArray().forEach((btn) => {
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
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

// src/components/navigation/dropdown/dropdown.ts
var df$8 = defussGlobals();
var dfDollar8 = defussQuery();
var dropdownStates = ["default", "open"];
var ITEM = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
var isDisabled = (el) => el.disabled || el.getAttribute("aria-disabled") === "true";
var itemsOf = (menu) => Array.from(dfDollar8(menu).find(ITEM).toArray()).filter((i) => i.closest('[role="menu"]') === menu && !isDisabled(i));
var subOf = (trigger) => dfDollar8(trigger).closest(".dropdown-sub").children(".dropdown-sub-content").get(0) ?? null;
var rootOf2 = (menu) => {
  let m = menu;
  while (m?.parentElement?.closest(".dropdown-content[popover]"))
    m = m.parentElement.closest(".dropdown-content[popover]");
  return m;
};
var HOVER_OPEN = 120;
var HOVER_CLOSE = 220;
function applyMarkup8(_el, _stateName) {}
function triggerStateChange8(menu, stateName, _config) {
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
  apply: (menu, state) => triggerStateChange8(menu, state.name, state.config),
  markup: (el, state) => applyMarkup8(el, state.name)
});
df$8.dropdownApi = dropdownApi;
df$8.dropdownStates = dropdownStates;
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
    dfDollar8(group).find('[role="menuitemradio"]').toArray().forEach((r) => {
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
  const openSubs = () => Array.from(dfDollar8(menu).find(".dropdown-sub-content").toArray()).filter((s) => s.parentElement.closest('[role="menu"]') === menu && s.matches(":popover-open"));
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
  const trigger = dfDollar8(wrap).find(":scope > .dropdown-sub-trigger").get(0);
  const sub = dfDollar8(wrap).find(":scope > .dropdown-sub-content").get(0);
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
function init8() {
  dfDollar8("[data-dropdown-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const menu = dfDollar8("#" + CSS.escape(trigger.dataset.dropdownTrigger)).get(0);
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
        const otherOpen = other ? dfDollar8("#" + CSS.escape(other.getAttribute("data-dropdown-trigger"))).get(0)?.matches(":popover-open") : false;
        if (!otherOpen && (!active || active === document.body || menu.contains(active) || other))
          trigger.focus({ preventScroll: true });
      }
    });
    wireMenu(menu);
    dfDollar8(menu).find(".dropdown-sub").toArray().forEach(wireSub);
  });
  dfDollar8(".dropdown-sub").toArray().forEach(wireSub);
  dfDollar8(".dropdown-content[popover]:not(.dropdown-sub-content):not([data-init])").toArray().forEach((menu) => {
    menu.dataset.init = "";
    bindComponent(menu, dropdownApi);
  });
}
init8();
new MutationObserver(init8).observe(document, { childList: true, subtree: true });

// src/components/geography/geo-map/geo-map.ts
var df$9 = defussGlobals();
var dfDollar9 = defussQuery();
var geoMapStates = ["default", "selected", "focused"];
var GEO_VENDOR_URLS = {
  d3Array: "https://cdn.jsdelivr.net/npm/d3-array@3.2.4/dist/d3-array.min.js",
  d3Geo: "https://cdn.jsdelivr.net/npm/d3-geo@3.1.1/dist/d3-geo.min.js",
  geodesic: "https://cdn.jsdelivr.net/npm/geographiclib-geodesic@2.2.0/geographiclib-geodesic.min.js",
  dson: "https://cdn.jsdelivr.net/npm/defuss-dson@1.1.2/dist/index.mjs"
};
var releaseData = () => `https://cdn.jsdelivr.net/npm/defuss-shadcn@${df$9.shared?.abi ?? "0.0.0"}/dist/components/geo-map/data/manifest.json`;
var engines = null;
var enginesPromise = null;
var settings = {
  data: "",
  urls: { ...GEO_VENDOR_URLS },
  views: {}
};
var LOAD_MS = 20000;
var metaContent = (name) => (dfDollar9(`meta[name="${name}"]`).get(0) ?? null)?.content ?? "";
function vendor(vendorUrl) {
  return Promise.resolve().then(() => import(/* @vite-ignore */ vendorUrl));
}
function load() {
  if (engines)
    return Promise.resolve();
  if (!enginesPromise) {
    const urls = settings.urls;
    const present = globalThis.d3;
    const d3 = present?.geoPath && present?.geoEqualEarth ? Promise.resolve() : vendor(urls.d3Array).then(() => vendor(urls.d3Geo));
    const pending = Promise.all([d3, vendor(urls.geodesic), vendor(urls.dson)]).then(([, , dson]) => {
      const g = globalThis;
      if (!g.d3?.geoPath)
        throw new Error("d3-geo did not install globalThis.d3");
      if (!g.geodesic?.Geodesic)
        throw new Error("GeographicLib did not install globalThis.geodesic");
      const DSON = dson?.DSON ?? dson?.default?.DSON;
      if (!DSON)
        throw new Error("defuss-dson exports no DSON");
      engines = { d3: g.d3, geodesic: g.geodesic, DSON };
      return engines;
    });
    pending.catch(() => {
      if (enginesPromise === pending)
        enginesPromise = null;
    });
    enginesPromise = pending;
  }
  let timer = 0;
  const deadline = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`the geography engines did not load within ${LOAD_MS / 1000} s`)), LOAD_MS);
  });
  return Promise.race([enginesPromise, deadline]).then(() => {
    return;
  }).finally(() => clearTimeout(timer));
}
var ready = () => {
  if (!engines)
    throw new Error("the geography engines are not loaded - await df$.shadcn.geo.load() first");
  return engines;
};
function configure(options) {
  if (options.data !== undefined)
    settings.data = String(options.data);
  if (options.urls)
    settings.urls = { ...settings.urls, ...options.urls };
  if (options.views)
    settings.views = { ...settings.views, ...options.views };
}
function assertLonLat(point) {
  const p = point;
  if (!Array.isArray(p) || p.length !== 2 || !p.every(Number.isFinite) || Math.abs(p[0]) > 180 || Math.abs(p[1]) > 90)
    throw new RangeError("expected [longitude, latitude] in [-180, 180] x [-90, 90] degrees");
}
function assertBounds(b) {
  if (!Array.isArray(b) || b.length !== 4)
    throw new RangeError("expected [west, south, east, north]");
  assertLonLat([b[0], b[1]]);
  assertLonLat([b[2], b[3]]);
  if (b[1] > b[3])
    throw new RangeError("south must not exceed north");
}
function inBounds(point, bounds) {
  return point[1] >= bounds[1] && point[1] <= bounds[3] && (bounds[0] <= bounds[2] ? point[0] >= bounds[0] && point[0] <= bounds[2] : point[0] >= bounds[0] || point[0] <= bounds[2]);
}
var wrapLon = (lon) => ((lon + 180) % 360 + 360) % 360 - 180;
var clampZoom = (z) => Math.max(1, Math.min(1024, z));
var clamp2 = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
var WGS84 = Object.freeze({ a: 6378137, f: 1 / 298.257223563 });
var solvers = new Map;
function solver(ellipsoid = WGS84) {
  const key = `${ellipsoid.a}/${ellipsoid.f}`;
  let s = solvers.get(key);
  if (!s) {
    if (!Number.isFinite(ellipsoid.a) || ellipsoid.a <= 0 || !Number.isFinite(ellipsoid.f) || ellipsoid.f < 0 || ellipsoid.f >= 1 / 50)
      throw new RangeError("an ellipsoid needs a > 0 and 0 <= f < 1/50");
    s = new (ready()).geodesic.Geodesic.Geodesic(ellipsoid.a, ellipsoid.f);
    solvers.set(key, s);
  }
  return s;
}
function inverse(a, b, ellipsoid) {
  assertLonLat(a);
  assertLonLat(b);
  const r = solver(ellipsoid).Inverse(a[1], a[0], b[1], b[0]);
  return { meters: r.s12, initialBearing: r.azi1, finalBearing: r.azi2 };
}
function direct(origin, bearing, meters, ellipsoid) {
  assertLonLat(origin);
  if (!Number.isFinite(bearing) || !Number.isFinite(meters))
    throw new RangeError("a finite bearing and distance");
  const p = solver(ellipsoid).Direct(origin[1], origin[0], bearing, meters);
  return [p.lon2, p.lat2];
}
function geodesicPath(a, b, maxStepMeters = 20000, ellipsoid) {
  if (!Number.isFinite(maxStepMeters) || maxStepMeters <= 0)
    throw new RangeError("maxStepMeters must be positive");
  const { meters } = inverse(a, b, ellipsoid);
  const n = Math.max(1, Math.ceil(meters / maxStepMeters));
  if (n > 1e5)
    throw new RangeError("too many geodesic samples (at most 100000 segments)");
  const line = solver(ellipsoid).InverseLine(a[1], a[0], b[1], b[0]);
  const points = [[a[0], a[1]]];
  for (let i = 1;i < n; i++) {
    const p = line.Position(meters * i / n);
    points.push([p.lon2, p.lat2]);
  }
  points.push([b[0], b[1]]);
  return points;
}
function polylineLength(points, ellipsoid) {
  let sum = 0;
  for (let i = 1;i < points.length; i++)
    sum += inverse(points[i - 1], points[i], ellipsoid).meters;
  return sum;
}
var S2_MAX = 2 ** 30;
var SWAP = 1;
var INVERT = 2;
var POS_TO_IJ = [
  [0, 1, 3, 2],
  [0, 2, 3, 1],
  [3, 2, 0, 1],
  [3, 1, 0, 2]
];
var POS_TO_ORIENTATION = [SWAP, 0, 0, INVERT | SWAP];
var LOOKUP_POS = new Int32Array(1024);
var LOOKUP_IJ = new Int32Array(1024);
function initLookup(level, i, j, orig, pos, orientation) {
  if (level === 4) {
    const ij = (i << 4) + j;
    LOOKUP_POS[(ij << 2) + orig] = (pos << 2) + orientation;
    LOOKUP_IJ[(pos << 2) + orig] = (ij << 2) + orientation;
    return;
  }
  const r = POS_TO_IJ[orientation];
  for (let k = 0;k < 4; k++)
    initLookup(level + 1, (i << 1) + (r[k] >> 1), (j << 1) + (r[k] & 1), orig, (pos << 2) + k, orientation ^ POS_TO_ORIENTATION[k]);
}
for (const o of [0, SWAP, INVERT, SWAP | INVERT])
  initLookup(0, 0, 0, o, 0, o);
var RAD = 180 / Math.PI;
function lonLatToXyz(p) {
  const phi = p[1] / RAD;
  const theta = p[0] / RAD;
  const c = Math.cos(phi);
  return [Math.cos(theta) * c, Math.sin(theta) * c, Math.sin(phi)];
}
function xyzToLonLat(x, y, z) {
  return [Math.atan2(y, x) * RAD, Math.atan2(z, Math.hypot(x, y)) * RAD];
}
function xyzToFaceUV(x, y, z) {
  const ax = Math.abs(x);
  const ay = Math.abs(y);
  const az = Math.abs(z);
  let f = ax > ay ? ax > az ? 0 : 2 : ay > az ? 1 : 2;
  if (f === 0 && x < 0 || f === 1 && y < 0 || f === 2 && z < 0)
    f += 3;
  switch (f) {
    case 0:
      return [0, y / x, z / x];
    case 1:
      return [1, -x / y, z / y];
    case 2:
      return [2, -x / z, -y / z];
    case 3:
      return [3, z / x, y / x];
    case 4:
      return [4, z / y, -x / y];
    default:
      return [5, -y / z, -x / z];
  }
}
function faceUVToXyz(f, u, v) {
  switch (f) {
    case 0:
      return [1, u, v];
    case 1:
      return [-u, 1, v];
    case 2:
      return [-u, -v, 1];
    case 3:
      return [-1, -v, -u];
    case 4:
      return [v, -1, -u];
    default:
      return [v, u, -1];
  }
}
var stToUV = (s) => s >= 0.5 ? (4 * s * s - 1) / 3 : (1 - 4 * (1 - s) * (1 - s)) / 3;
var uvToST = (u) => u >= 0 ? 0.5 * Math.sqrt(1 + 3 * u) : 1 - 0.5 * Math.sqrt(1 - 3 * u);
var stToIJ = (s) => clamp2(Math.floor(S2_MAX * s), 0, S2_MAX - 1);
function fromFaceIJ(f, i, j) {
  let n = BigInt(f) << 60n;
  let bits = f & SWAP;
  for (let k = 7;k >= 0; k--) {
    bits += (i >> k * 4 & 15) << 6;
    bits += (j >> k * 4 & 15) << 2;
    bits = LOOKUP_POS[bits];
    n |= BigInt(bits >> 2) << BigInt(k * 8);
    bits &= SWAP | INVERT;
  }
  return n * 2n + 1n;
}
function faceIJ(id) {
  const f = Number(id >> 61n);
  let orientation = f & SWAP;
  let i = 0;
  let j = 0;
  let nbits = 2;
  for (let k = 7;k >= 0; k--) {
    orientation += Number(id >> BigInt(k * 8 + 1) & BigInt((1 << 2 * nbits) - 1)) << 2;
    orientation = LOOKUP_IJ[orientation];
    i += (orientation >> 6) * 2 ** (k * 4);
    j += (orientation >> 2 & 15) * 2 ** (k * 4);
    orientation &= SWAP | INVERT;
    nbits = 4;
  }
  return [f, i, j];
}
var lsb = (id) => id & -id;
var lsbForLevel = (level) => 1n << BigInt(2 * (30 - level));
function levelOf(id) {
  let tz = 0;
  while (tz < 64 && (id >> BigInt(tz) & 1n) === 0n)
    tz++;
  return 30 - (tz >> 1);
}
var parentAt = (id, level) => {
  const l = lsbForLevel(level);
  return id & -l | l;
};
var tokenOf = (id) => id.toString(16).padStart(16, "0").replace(/0+$/, "") || "X";
function s2Id(cell) {
  if (typeof cell === "string" && !/^[0-9a-fA-F]{1,16}$/.test(cell))
    throw new RangeError("expected a 1-16 digit hexadecimal S2 token");
  const id = typeof cell === "bigint" ? cell : BigInt(`0x${cell.padEnd(16, "0")}`);
  if (id <= 0n || id >= 1n << 64n || Number(id >> 61n) > 5 || (lsb(id) & 0x1555555555555555n) === 0n)
    throw new RangeError("invalid S2 cell id");
  return id;
}
function s2Cell(point, level = 12) {
  assertLonLat(point);
  if (!Number.isInteger(level) || level < 0 || level > 30)
    throw new RangeError("an S2 level is 0 to 30");
  const [f, u, v] = xyzToFaceUV(...lonLatToXyz(point));
  const id = parentAt(fromFaceIJ(f, stToIJ(uvToST(u)), stToIJ(uvToST(v))), level);
  return { id, token: tokenOf(id), level };
}
function s2Token(cell) {
  return tokenOf(s2Id(cell));
}
function s2Level(cell) {
  return levelOf(s2Id(cell));
}
function cellSquare(id) {
  const [f, i, j] = faceIJ(id);
  const size = 2 ** (30 - levelOf(id));
  return [f, Math.floor(i / size) * size, Math.floor(j / size) * size, size];
}
function s2Center(cell) {
  const [f, i, j, size] = cellSquare(s2Id(cell));
  return xyzToLonLat(...faceUVToXyz(f, stToUV((i + size / 2) / S2_MAX), stToUV((j + size / 2) / S2_MAX)));
}
function s2Vertices(cell) {
  const [f, i, j, size] = cellSquare(s2Id(cell));
  const u0 = stToUV(i / S2_MAX);
  const u1 = stToUV((i + size) / S2_MAX);
  const v0 = stToUV(j / S2_MAX);
  const v1 = stToUV((j + size) / S2_MAX);
  return [
    [u0, v0],
    [u1, v0],
    [u1, v1],
    [u0, v1]
  ].map(([u, v]) => xyzToLonLat(...faceUVToXyz(f, u, v)));
}
function s2Polygon(cell) {
  const token = s2Token(cell);
  const ring = s2Vertices(cell).reverse();
  ring.push([ring[0][0], ring[0][1]]);
  return {
    type: "Feature",
    properties: { id: token, name: `S2 ${token}`, level: "state" },
    geometry: { type: "Polygon", coordinates: [ring] }
  };
}
function fromFaceIJWrap(f, i, j) {
  i = clamp2(i, -1, S2_MAX);
  j = clamp2(j, -1, S2_MAX);
  const limit = 1 + Number.EPSILON;
  const u = clamp2((2 * i + 1 - S2_MAX) / S2_MAX, -limit, limit);
  const v = clamp2((2 * j + 1 - S2_MAX) / S2_MAX, -limit, limit);
  const [g, u2, v2] = xyzToFaceUV(...faceUVToXyz(f, u, v));
  return fromFaceIJ(g, stToIJ(0.5 * (u2 + 1)), stToIJ(0.5 * (v2 + 1)));
}
function s2Neighbors(cell) {
  const id = s2Id(cell);
  const level = levelOf(id);
  const size = 2 ** (30 - level);
  const [f, i, j] = faceIJ(id);
  return [
    [i, j - size],
    [i + size, j],
    [i, j + size],
    [i - size, j]
  ].map(([a, b]) => tokenOf(parentAt(fromFaceIJWrap(f, a, b), level)));
}
function s2Children(cell) {
  const id = s2Id(cell);
  if (levelOf(id) === 30)
    return [];
  const low = lsb(id);
  const begin = id - low + (low >> 2n);
  const step = low >> 1n;
  return [0n, 1n, 2n, 3n].map((k) => tokenOf(begin + k * step));
}
function s2Parent(cell, level) {
  const id = s2Id(cell);
  const own = levelOf(id);
  const target = level ?? own - 1;
  if (!Number.isInteger(target) || target < 0 || target > own)
    throw new RangeError(`a parent level is 0 to ${own}`);
  return tokenOf(parentAt(id, target));
}
function resolvePosition(value) {
  if (Array.isArray(value)) {
    assertLonLat(value);
    return [value[0], value[1]];
  }
  return s2Center(value.s2);
}
function checkBits(bits) {
  if (!Number.isInteger(bits) || bits < 1 || bits > 26)
    throw new RangeError("Morton bits are 1 to 26");
}
function mortonEncode(x, y, bits = 16) {
  checkBits(bits);
  if (![x, y].every((v) => Number.isInteger(v) && v >= 0 && v < 2 ** bits))
    throw new RangeError("grid coordinate out of range");
  const bx = BigInt(x);
  const by = BigInt(y);
  let key = 0n;
  for (let b = 0;b < bits; b++) {
    const s = BigInt(b);
    key |= (bx >> s & 1n) << 2n * s | (by >> s & 1n) << 2n * s + 1n;
  }
  return key;
}
function mortonDecode(key, bits = 16) {
  checkBits(bits);
  if (key < 0n || key >= 1n << BigInt(2 * bits))
    throw new RangeError("Morton key out of range");
  let x = 0n;
  let y = 0n;
  for (let b = 0;b < bits; b++) {
    const s = BigInt(b);
    x |= (key >> 2n * s & 1n) << s;
    y |= (key >> 2n * s + 1n & 1n) << s;
  }
  return [Number(x), Number(y)];
}
function mortonGrid(p, bits) {
  const n = 2 ** bits;
  return [Math.min(n - 1, Math.floor((p[0] + 180) / 360 * n)), Math.min(n - 1, Math.floor((p[1] + 90) / 180 * n))];
}
function mortonKey(point, bits = 16) {
  assertLonLat(point);
  checkBits(bits);
  return mortonEncode(...mortonGrid(point, bits), bits);
}
function mortonIndex(items, position, bits = 16) {
  checkBits(bits);
  const entries = items.map((item) => {
    const point = position(item);
    assertLonLat(point);
    return { key: mortonKey(point, bits), point: [point[0], point[1]], item };
  }).sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
  const lowerBound = (key) => {
    let lo = 0;
    let hi = entries.length;
    while (lo < hi) {
      const m = lo + hi >>> 1;
      if (entries[m].key < key)
        lo = m + 1;
      else
        hi = m;
    }
    return lo;
  };
  const query = (bounds) => {
    assertBounds(bounds);
    if (bounds[0] > bounds[2])
      return [...query([bounds[0], bounds[1], 180, bounds[3]]), ...query([-180, bounds[1], bounds[2], bounds[3]])];
    const [x0, y0] = mortonGrid([bounds[0], bounds[1]], bits);
    const [x1, y1] = mortonGrid([bounds[2], bounds[3]], bits);
    const out = [];
    const walk = (x, y, size, depth, prefix) => {
      if (x > x1 || y > y1 || x + size - 1 < x0 || y + size - 1 < y0)
        return;
      const shift = BigInt(2 * (bits - depth));
      const begin = lowerBound(prefix << shift);
      const end = lowerBound(prefix + 1n << shift);
      if (begin === end)
        return;
      if (end - begin <= 32 || depth === bits || x >= x0 && y >= y0 && x + size - 1 <= x1 && y + size - 1 <= y1) {
        for (let i = begin;i < end; i++)
          if (inBounds(entries[i].point, bounds))
            out.push(entries[i].item);
        return;
      }
      const half = size / 2;
      for (let q = 0;q < 4; q++)
        walk(x + (q & 1) * half, y + (q >> 1) * half, half, depth + 1, prefix * 4n + BigInt(q));
    };
    walk(0, 0, 2 ** bits, 0, 0n);
    return out;
  };
  return { size: entries.length, ordered: () => entries.map((e) => e.item), query };
}

class Queue {
  values = [];
  push(value) {
    let i = this.values.length;
    this.values.push(value);
    while (i > 0) {
      const p = i - 1 >>> 1;
      if (this.values[p].cost <= value.cost)
        break;
      this.values[i] = this.values[p];
      i = p;
    }
    this.values[i] = value;
  }
  pop() {
    if (!this.values.length)
      return;
    const first = this.values[0];
    const last = this.values.pop();
    if (this.values.length) {
      let i = 0;
      while (i * 2 + 1 < this.values.length) {
        let c = i * 2 + 1;
        if (c + 1 < this.values.length && this.values[c + 1].cost < this.values[c].cost)
          c++;
        if (this.values[c].cost >= last.cost)
          break;
        this.values[i] = this.values[c];
        i = c;
      }
      this.values[i] = last;
    }
    return first;
  }
}
function pointOnLine(points, fraction) {
  if (fraction <= 0)
    return [points[0][0], points[0][1]];
  const last = points[points.length - 1];
  if (fraction >= 1)
    return [last[0], last[1]];
  const lengths = points.slice(1).map((p, i) => inverse(points[i], p).meters);
  const total = lengths.reduce((a, b) => a + b, 0);
  if (!total)
    return [points[0][0], points[0][1]];
  const target = total * fraction;
  let before = 0;
  for (let i = 0;i < lengths.length; i++) {
    if (before + lengths[i] >= target)
      return direct(points[i], inverse(points[i], points[i + 1]).initialBearing, target - before);
    before += lengths[i];
  }
  return [last[0], last[1]];
}
function sliceLine(points, from, to) {
  const total = polylineLength(points);
  const out = [pointOnLine(points, from)];
  let before = 0;
  for (let i = 1;i < points.length - 1; i++) {
    before += inverse(points[i - 1], points[i]).meters;
    const f = total ? before / total : 0;
    if (f > from && f < to)
      out.push([points[i][0], points[i][1]]);
  }
  out.push(pointOnLine(points, to));
  return out;
}
function routeGraph(nodes, segments) {
  const byId = new Map;
  const segs = new Map;
  const adjacency = new Map;
  for (const n of nodes) {
    if (!n.id || byId.has(n.id))
      throw new Error(`duplicate or empty node id: ${n.id}`);
    assertLonLat(n.position);
    byId.set(n.id, { ...n, position: [n.position[0], n.position[1]] });
    adjacency.set(n.id, []);
  }
  for (const edge of segments) {
    if (!edge.id || segs.has(edge.id))
      throw new Error(`duplicate or empty segment id: ${edge.id}`);
    if (!byId.has(edge.from) || !byId.has(edge.to))
      throw new Error(`unknown endpoint of segment ${edge.id}`);
    if (!Number.isFinite(edge.lengthMeters) || edge.lengthMeters < 0)
      throw new RangeError(`segment ${edge.id}: the length must be finite and >= 0`);
    const a = byId.get(edge.from).position;
    const b = byId.get(edge.to).position;
    const points = edge.coordinates?.map((p) => {
      assertLonLat(p);
      return [p[0], p[1]];
    }) ?? [a, b];
    const end = points[points.length - 1];
    if (points.length < 2 || points[0][0] !== a[0] || points[0][1] !== a[1] || end[0] !== b[0] || end[1] !== b[1])
      throw new Error(`segment ${edge.id}: its geometry must start and end at its nodes`);
    const segment = { ...edge, coordinates: points };
    segs.set(edge.id, segment);
    adjacency.get(edge.from).push({ to: edge.to, segment, reversed: false });
    if (edge.bidirectional)
      adjacency.get(edge.to).push({ to: edge.from, segment, reversed: true });
  }
  const index = mortonIndex([...byId.values()], (n) => n.position);
  const copy = (n) => ({ ...n, position: [n.position[0], n.position[1]] });
  const route = (from, to) => {
    if (!byId.has(from) || !byId.has(to))
      throw new Error("unknown route node");
    const costs = new Map([[from, 0]]);
    const previous = new Map;
    const queue = new Queue;
    queue.push({ id: from, cost: 0 });
    for (let current = queue.pop();current; current = queue.pop()) {
      if (current.cost !== costs.get(current.id))
        continue;
      if (current.id === to)
        break;
      for (const arc of adjacency.get(current.id)) {
        const cost = current.cost + arc.segment.lengthMeters;
        if (!Number.isFinite(cost))
          throw new RangeError("route cost overflow");
        if (cost < (costs.get(arc.to) ?? Infinity)) {
          costs.set(arc.to, cost);
          previous.set(arc.to, { from: current.id, arc });
          queue.push({ id: arc.to, cost });
        }
      }
    }
    if (!costs.has(to))
      return null;
    const steps = [];
    const ids = [to];
    for (let id = to;id !== from; ) {
      const p = previous.get(id);
      const coordinates = p.arc.segment.coordinates.map((q) => [q[0], q[1]]);
      if (p.arc.reversed)
        coordinates.reverse();
      steps.push({
        segment: p.arc.segment.id,
        from: p.from,
        to: id,
        reversed: p.arc.reversed,
        lengthMeters: p.arc.segment.lengthMeters,
        coordinates
      });
      id = p.from;
      ids.push(id);
    }
    steps.reverse();
    ids.reverse();
    const coordinates = steps.flatMap((step, i) => i ? step.coordinates.slice(1) : step.coordinates);
    if (!steps.length) {
      const p = byId.get(from).position;
      coordinates.push([p[0], p[1]], [p[0], p[1]]);
    }
    return { lengthMeters: costs.get(to), nodeIds: ids, steps, coordinates };
  };
  const routeAt = (from, to) => {
    const allNodes = [...byId.values()];
    const cuts = new Map;
    const originals = new Map;
    let sequence = 0;
    const unique = () => {
      let id;
      do
        id = `__geo_cut_${sequence++}`;
      while (byId.has(id) || segs.has(id));
      return id;
    };
    const resolve = (p) => {
      const edge = segs.get(p.segment);
      if (!edge)
        throw new Error(`unknown segment: ${p.segment}`);
      if (!Number.isFinite(p.fraction) || p.fraction < 0 || p.fraction > 1)
        throw new RangeError("a fraction is 0 to 1");
      if (p.fraction === 0)
        return edge.from;
      if (p.fraction === 1)
        return edge.to;
      if (!cuts.has(edge.id))
        cuts.set(edge.id, new Map);
      const map = cuts.get(edge.id);
      if (!map.has(p.fraction)) {
        const id = unique();
        map.set(p.fraction, id);
        allNodes.push({ id, position: pointOnLine(edge.coordinates, p.fraction) });
      }
      return map.get(p.fraction);
    };
    const a = resolve(from);
    const b = resolve(to);
    const positionOf = (id) => allNodes.find((n) => n.id === id).position;
    const split = [];
    for (const edge of segs.values()) {
      const map = cuts.get(edge.id);
      if (!map) {
        split.push(edge);
        continue;
      }
      const parts = [[0, edge.from], ...map.entries(), [1, edge.to]];
      parts.sort((x, y) => x[0] - y[0]);
      for (let i = 1;i < parts.length; i++) {
        const prev = parts[i - 1];
        const next = parts[i];
        const coordinates = sliceLine(edge.coordinates, prev[0], next[0]);
        coordinates[0] = [...positionOf(prev[1])];
        coordinates[coordinates.length - 1] = [...positionOf(next[1])];
        const id = unique();
        originals.set(id, edge.id);
        split.push({
          ...edge,
          id,
          from: prev[1],
          to: next[1],
          coordinates,
          lengthMeters: edge.lengthMeters * (next[0] - prev[0])
        });
      }
    }
    const result = routeGraph(allNodes, split).route(a, b);
    if (result)
      for (const step of result.steps)
        step.segment = originals.get(step.segment) ?? step.segment;
    return result;
  };
  const nearestNode = (position, bounds) => {
    assertLonLat(position);
    let best = null;
    for (const node of bounds ? index.query(bounds) : [...byId.values()]) {
      const meters = inverse(position, node.position).meters;
      if (!best || meters < best.meters)
        best = { node: copy(node), meters };
    }
    return best;
  };
  return {
    route,
    routeAt,
    nearestNode,
    nodesInBounds: (bounds) => index.query(bounds).map(copy),
    mortonOrder: () => index.ordered().map((n) => n.id)
  };
}
function positionAlongRoute(route, meters) {
  if (!Number.isFinite(meters) || meters < 0 || meters > route.lengthMeters)
    throw new RangeError("a distance on the route");
  let remaining = meters;
  for (const step of route.steps) {
    if (remaining <= step.lengthMeters && step.lengthMeters > 0)
      return pointOnLine(step.coordinates, remaining / step.lengthMeters);
    remaining -= step.lengthMeters;
  }
  const last = route.coordinates[route.coordinates.length - 1];
  return [last[0], last[1]];
}
var DGEO_HEADER = 20;
var DGEO_MAX = 256 * 1024 * 1024;
var MAX_ARCS = 2000000;
var utf8 = new TextDecoder("utf-8", { fatal: true });
function readVarint(data, cursor, end) {
  let value = 0;
  let scale = 1;
  for (let k = 0;k < 5; k++) {
    if (cursor.i >= end)
      throw new Error("DGEO: truncated varint");
    const b = data[cursor.i++];
    value += (b & 127) * scale;
    if (value > 4294967295)
      throw new Error("DGEO: varint overflow");
    if (b < 128) {
      if (k && b === 0)
        throw new Error("DGEO: noncanonical varint");
      return value;
    }
    scale *= 128;
  }
  throw new Error("DGEO: oversized varint");
}
function checkTopology(t, arcCount) {
  if (!t || t.type !== "Topology" || !t.objects || typeof t.objects !== "object")
    throw new Error("invalid topology");
  const tr = t.transform;
  if (!tr || tr.scale.length !== 2 || tr.translate.length !== 2 || ![...tr.scale, ...tr.translate].every(Number.isFinite))
    throw new Error("a quantized topology needs its transform");
  let refs = 0;
  const indices = (value, depth) => {
    if (depth > 8 || ++refs > 1e7)
      throw new Error("excessive arc references");
    if (Array.isArray(value)) {
      for (const x of value)
        indices(x, depth + 1);
      return;
    }
    if (!Number.isInteger(value) || (value < 0 ? -value - 1 : value) >= arcCount)
      throw new Error("arc reference out of range");
  };
  const visit = (o, depth) => {
    if (!o || depth > 32)
      throw new Error("invalid geometry tree");
    if (o.type === "GeometryCollection")
      (o.geometries ?? []).forEach((g) => visit(g, depth + 1));
    else if (["Polygon", "MultiPolygon", "LineString", "MultiLineString"].includes(o.type))
      indices(o.arcs, 0);
  };
  Object.values(t.objects).forEach((o) => visit(o, 0));
}
function decode(bytes) {
  if (bytes.length > DGEO_MAX)
    throw new Error("topology size limit exceeded");
  if (bytes[0] !== 68) {
    const t = JSON.parse(utf8.decode(bytes));
    if (!Array.isArray(t.arcs) || t.arcs.length > MAX_ARCS)
      throw new Error("invalid arcs");
    checkTopology(t, t.arcs.length);
    return t;
  }
  if (bytes.length < DGEO_HEADER || bytes[1] !== 71 || bytes[2] !== 69 || bytes[3] !== 79)
    throw new Error("invalid DGEO header");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (view.getUint16(4, true) !== 1 || view.getUint16(6, true) !== 0)
    throw new Error("unsupported DGEO version");
  const m = view.getUint32(8, true);
  const count = view.getUint32(12, true);
  const rawLength = view.getUint32(16, true);
  const base = DGEO_HEADER + m + (count + 1) * 4;
  if (m > 64 * 1024 * 1024 || count > MAX_ARCS || base + rawLength !== bytes.length)
    throw new Error("invalid DGEO lengths");
  const meta = ready().DSON.parse(utf8.decode(bytes.subarray(DGEO_HEADER, DGEO_HEADER + m)));
  checkTopology(meta, count);
  const offset = (k) => view.getUint32(DGEO_HEADER + m + k * 4, true);
  if (offset(0) !== 0 || offset(count) !== rawLength)
    throw new Error("invalid DGEO offset table");
  const arcs = [];
  for (let k = 0;k < count; k++) {
    const start = offset(k);
    const stop = offset(k + 1);
    if (stop < start || stop > rawLength)
      throw new Error("non-monotonic DGEO offsets");
    const cursor = { i: base + start };
    const end = base + stop;
    const arc = [];
    while (cursor.i < end) {
      const x = readVarint(bytes, cursor, end);
      const y = readVarint(bytes, cursor, end);
      arc.push([x % 2 ? -(x + 1) / 2 : x / 2, y % 2 ? -(y + 1) / 2 : y / 2]);
    }
    if (arc.length < 2)
      throw new Error("a DGEO arc needs two points");
    arcs.push(arc);
  }
  return { ...meta, arcs };
}
function features(topology, object) {
  const o = topology.objects[object];
  if (!o)
    throw new Error(`the topology has no object "${object}"`);
  const [kx, ky] = topology.transform?.scale ?? [1, 1];
  const [dx, dy] = topology.transform?.translate ?? [0, 0];
  const arcs = topology.arcs.map((arc) => {
    let x = 0;
    let y = 0;
    return arc.map((p) => {
      x += p[0];
      y += p[1];
      return [x * kx + dx, y * ky + dy];
    });
  });
  const line = (indices) => {
    const points = [];
    for (const i of indices) {
      if (points.length)
        points.pop();
      const start = points.length;
      for (const p of arcs[i < 0 ? ~i : i])
        points.push([p[0], p[1]]);
      if (i < 0) {
        const tail = points.splice(start).reverse();
        points.push(...tail);
      }
    }
    return points;
  };
  const ring = (indices) => {
    const points = line(indices);
    while (points.length < 4)
      points.push([points[0][0], points[0][1]]);
    return points;
  };
  const geometry = (g) => {
    switch (g.type) {
      case "Polygon":
        return { type: "Polygon", coordinates: g.arcs.map(ring) };
      case "MultiPolygon":
        return { type: "MultiPolygon", coordinates: g.arcs.map((p) => p.map(ring)) };
      case "LineString": {
        const points = line(g.arcs);
        if (points.length < 2)
          points.push([points[0][0], points[0][1]]);
        return { type: "LineString", coordinates: points };
      }
      case "MultiLineString":
        return { type: "MultiLineString", coordinates: g.arcs.map(line) };
      case "Point":
        return { type: "Point", coordinates: [g.coordinates[0] * kx + dx, g.coordinates[1] * ky + dy] };
      case "MultiPoint":
        return {
          type: "MultiPoint",
          coordinates: g.coordinates.map((c) => [c[0] * kx + dx, c[1] * ky + dy])
        };
      case "GeometryCollection":
        return { type: "GeometryCollection", geometries: g.geometries.map(geometry) };
      default:
        return null;
    }
  };
  const feature = (g) => ({
    type: "Feature",
    ...g.id != null ? { id: g.id } : {},
    properties: g.properties ?? {},
    geometry: geometry(g)
  });
  return o.type === "GeometryCollection" ? o.geometries.map(feature) : [feature(o)];
}
function rewind(region) {
  const { d3 } = ready();
  const g = region.geometry;
  if (!g || g.type !== "Polygon" && g.type !== "MultiPolygon")
    throw new Error("a region is a Polygon or MultiPolygon");
  const fix = (polygon) => polygon.map((ring, i) => {
    if (ring.length < 4)
      throw new Error("a ring needs four positions (closed)");
    ring.forEach(assertLonLat);
    const copy = ring.map((p) => [p[0], p[1]]);
    const big = d3.geoArea({ type: "Polygon", coordinates: [copy] }) > 2 * Math.PI;
    return (i === 0 ? big : !big) ? copy.reverse() : copy;
  });
  const coordinates = g.type === "Polygon" ? fix(g.coordinates) : g.coordinates.map(fix);
  return {
    type: "Feature",
    properties: { ...region.properties },
    geometry: { type: g.type, coordinates }
  };
}
function boundsProxy(id, bounds) {
  const [west, south, east, north] = bounds;
  const intervals = west > east ? [
    [west, 180],
    [-180, east]
  ] : [[west, east]];
  const polygons = [];
  const bottom = Math.max(-90, south - 0.1);
  const top = Math.min(90, north + 0.1);
  for (const [w, e] of intervals) {
    const count = Math.max(1, Math.ceil((e - w) / 60));
    for (let part = 0;part < count; part++) {
      const a = w + (e - w) * part / count;
      const b = w + (e - w) * (part + 1) / count;
      const steps = Math.max(1, Math.ceil((b - a) / 5));
      const ring = [
        [a, bottom],
        [a, top]
      ];
      for (let j = 1;j <= steps; j++)
        ring.push([a + (b - a) * j / steps, top]);
      ring.push([b, bottom]);
      for (let j = steps - 1;j >= 0; j--)
        ring.push([a + (b - a) * j / steps, bottom]);
      polygons.push([ring]);
    }
  }
  return {
    type: "Feature",
    properties: { id, name: id, level: "country" },
    geometry: { type: "MultiPolygon", coordinates: polygons }
  };
}
var datasets = new Map;
var CACHE_BYTES = 24 * 1024 * 1024;
var MAX_LOADS = 4;
var activeLoads = 0;
var loadQueue = [];
var keyOf = (r) => `${r.properties.level}:${r.properties.id}`;
async function fetchBytes(url) {
  const response = await fetch(url);
  if (!response.ok)
    throw new Error(`HTTP ${response.status} for ${url}`);
  return new Uint8Array(await response.arrayBuffer());
}
function index(ds, regions) {
  for (const r of regions)
    ds.byKey.set(keyOf(r), r);
}
function openDataset(url) {
  let known = datasets.get(url);
  if (!known) {
    known = (async () => {
      await load();
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`HTTP ${response.status} for ${url}`);
      const json = await response.json();
      const ds = {
        url,
        manifest: null,
        countries: [],
        continents: [],
        memoryStates: [],
        countryIds: new Set,
        proxies: new Map,
        byKey: new Map,
        chunks: new Map,
        loading: new Set,
        failed: new Map,
        bytes: 0,
        maps: new Set,
        names: null,
        parents: new Map
      };
      if (json?.type === "FeatureCollection") {
        const regions = json.features.map(rewind);
        ds.continents = regions.filter((r) => r.properties.level === "continent");
        ds.countries = regions.filter((r) => r.properties.level === "country");
        ds.memoryStates = regions.filter((r) => r.properties.level === "state");
        for (const s of ds.memoryStates)
          if (s.properties.parent)
            ds.parents.set(keyOf(s), s.properties.parent);
      } else {
        const manifest = json;
        if (manifest.version !== 1 || !manifest.initial || !manifest.details || !manifest.states)
          throw new Error(`${url} is no geo-map manifest (version 1)`);
        ds.manifest = manifest;
        const topology = decode(await fetchBytes(new URL(manifest.initial, url).href));
        ds.countries = features(topology, "countries");
        ds.continents = features(topology, "continents");
        for (const [id, b] of Object.entries(manifest.bounds ?? {}))
          ds.proxies.set(id, boundsProxy(id, b));
      }
      ds.countryIds = new Set(ds.countries.map((r) => r.properties.id));
      index(ds, ds.countries);
      index(ds, ds.continents);
      index(ds, ds.memoryStates);
      return ds;
    })();
    known.catch(() => {
      if (datasets.get(url) === known)
        datasets.delete(url);
    });
    datasets.set(url, known);
  }
  return known;
}
function chunk(ds, path, wanted) {
  wanted.add(path);
  const entry = ds.chunks.get(path);
  if (entry) {
    ds.chunks.delete(path);
    ds.chunks.set(path, entry);
    return entry.regions;
  }
  if (!ds.loading.has(path) && (ds.failed.get(path)?.until ?? 0) <= Date.now() && !loadQueue.some((q) => q.ds === ds && q.path === path))
    loadQueue.push({ ds, path });
  return;
}
function liveMaps(ds) {
  for (const el of ds.maps)
    if (!el.isConnected)
      ds.maps.delete(el);
  return [...ds.maps];
}
var wantedBySomeMap = (ds, path) => liveMaps(ds).some((el) => el._geo?.wanted.has(path));
function pump() {
  while (activeLoads < MAX_LOADS && loadQueue.length) {
    const next = loadQueue.pop();
    if (next.ds.chunks.has(next.path) || next.ds.loading.has(next.path) || !wantedBySomeMap(next.ds, next.path))
      continue;
    activeLoads++;
    next.ds.loading.add(next.path);
    loadChunk(next.ds, next.path);
  }
}
async function loadChunk(ds, path) {
  const url = new URL(path, ds.url).href;
  try {
    const bytes = await fetchBytes(url);
    const regions = features(decode(bytes), "regions");
    ds.chunks.set(path, { regions, bytes: bytes.length });
    ds.bytes += bytes.length;
    ds.failed.delete(path);
    index(ds, regions);
    for (const [key, entry] of ds.chunks) {
      if (ds.bytes <= CACHE_BYTES || ds.chunks.size <= 1)
        break;
      if (!wantedBySomeMap(ds, key)) {
        ds.chunks.delete(key);
        ds.bytes -= entry.bytes;
      }
    }
  } catch (err) {
    const attempts = (ds.failed.get(path)?.attempts ?? 0) + 1;
    ds.failed.set(path, { attempts, until: Date.now() + Math.min(60000, 1000 * 2 ** attempts) });
    for (const el of liveMaps(ds))
      reportError2(el, err, url);
  } finally {
    ds.loading.delete(path);
    activeLoads--;
    for (const el of liveMaps(ds))
      requestRender(el);
    pump();
  }
}
var normalize = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
function searchEntries(ds) {
  if (!ds.names) {
    const resident = [...ds.continents, ...ds.countries, ...ds.memoryStates].map((r) => {
      const parent = r.properties.parent ? ds.byKey.get(`country:${r.properties.parent}`)?.properties.name : "";
      const label = parent ? `${r.properties.name}, ${parent}` : r.properties.name;
      return { key: keyOf(r), name: r.properties.name, level: r.properties.level, label, norm: normalize(label) };
    });
    const namesPath = ds.manifest ? ds.manifest.names ?? "names.json" : "";
    const pending = !namesPath ? Promise.resolve(resident) : fetch(new URL(namesPath, ds.url).href).then((r) => r.ok ? r.json() : { states: [] }).catch(() => ({ states: [] })).then((json) => {
      const states = (json.states ?? []).map(([id, name, parent]) => {
        ds.parents.set(`state:${id}`, parent);
        const country = ds.byKey.get(`country:${parent}`)?.properties.name ?? parent;
        const label = `${name}, ${country}`;
        return { key: `state:${id}`, name, level: "state", label, norm: normalize(label) };
      });
      return [...resident, ...states];
    });
    ds.names = pending;
  }
  return ds.names;
}
function rank2(entries, query, limit) {
  const q = normalize(query);
  if (!q)
    return [];
  const order = ["continent", "country", "state"];
  const scored = [];
  for (const e of entries) {
    const name = normalize(e.name);
    const score = name === q || e.norm === q ? 0 : name.startsWith(q) ? 1 : name.split(/[\s-]+/).some((w) => w.startsWith(q)) ? 2 : e.norm.includes(q) ? 3 : -1;
    if (score >= 0)
      scored.push([score * 10 + order.indexOf(e.level), e]);
  }
  scored.sort((a, b) => a[0] - b[0] || a[1].label.localeCompare(b[1].label));
  return scored.slice(0, limit).map(([, e]) => ({ key: e.key, name: e.name, level: e.level, label: e.label }));
}
var PROJECTIONS = ["equalEarth", "equalArea", "mercator", "equirectangular", "orthographic"];
var LEVELS = ["auto", "continent", "country", "state"];
var PALETTES = ["atlas", "ocean", "forest", "sunset", "heat", "mono", "chart"];
var BORDERS = ["natural", "cased", "dashed", "none"];
var HOME = [0, 12];
function makeProjection(name, box, center, zoom, clip = true) {
  const { d3 } = ready();
  const make = {
    equalEarth: d3.geoEqualEarth,
    equalArea: d3.geoAzimuthalEqualArea,
    mercator: d3.geoMercator,
    equirectangular: d3.geoEquirectangular,
    orthographic: d3.geoOrthographic
  }[name];
  const p = make().precision(0.35);
  p.fitExtent([
    [box.x0 + 12, box.y0 + 12],
    [Math.max(box.x0 + 13, box.x1 - 12), Math.max(box.y0 + 13, box.y1 - 12)]
  ], { type: "Sphere" });
  const scale = p.scale();
  if (name === "orthographic")
    p.rotate([-center[0], -center[1], 0]).clipAngle(90);
  else if (name === "equalArea")
    p.rotate([-center[0], -center[1], 0]);
  else
    p.rotate([-center[0], 0, 0]).center([0, clamp2(center[1], -85, 85)]);
  p.scale(scale * zoom).translate([(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2]);
  if (clip && name !== "orthographic" && name !== "equalArea") {
    const [[, top], [, bottom]] = d3.geoPath(p).bounds({ type: "Sphere" });
    const dy = bottom - top <= box.y1 - box.y0 ? 0 : top > box.y0 ? box.y0 - top : bottom < box.y1 ? box.y1 - bottom : 0;
    if (dy)
      p.translate([(box.x0 + box.x1) / 2, (box.y0 + box.y1) / 2 + dy]);
  }
  if (clip)
    p.clipExtent([
      [box.x0, box.y0],
      [box.x1, box.y1]
    ]);
  return p;
}
var VIEWS = {
  "continent:Europe": [-25, 34, 45, 71],
  "continent:North America": [-168, 7, -20, 72],
  "continent:Oceania": [110, -48, -175, 5]
};
function mainBody(region) {
  const { d3 } = ready();
  const g = region.geometry;
  if (g.type !== "MultiPolygon" || g.coordinates.length < 2)
    return region;
  const parts = g.coordinates.map((coordinates) => {
    const poly = { type: "Polygon", coordinates };
    return { coordinates, area: d3.geoArea(poly), centroid: d3.geoCentroid(poly) };
  });
  parts.sort((a, b) => b.area - a.area);
  const included = [parts[0]];
  let rest = parts.slice(1);
  for (let changed = true;changed; ) {
    changed = false;
    const area = included.reduce((s, p) => s + p.area, 0);
    const center = d3.geoCentroid({ type: "MultiPolygon", coordinates: included.map((p) => p.coordinates) });
    const radius = Math.sqrt(area / Math.PI);
    const next = rest.filter((p) => {
      const near = d3.geoDistance(center, p.centroid) <= 2 * (radius + Math.sqrt(p.area / Math.PI)) + 0.02;
      if (near) {
        included.push(p);
        changed = true;
      }
      return !near;
    });
    rest = next;
  }
  return { ...region, geometry: { type: "MultiPolygon", coordinates: included.map((p) => p.coordinates) } };
}
function frame(target, box, projection) {
  const { d3 } = ready();
  const center = d3.geoCentroid(target);
  const c = [wrapLon(center[0]), clamp2(center[1], -85, 85)];
  const p = makeProjection(projection, box, c, 1, false);
  const b = d3.geoPath(p).bounds(target);
  const w = b[1][0] - b[0][0];
  const h = b[1][1] - b[0][1];
  const pad = 28;
  const zoom = clampZoom(Math.min((box.x1 - box.x0 - pad * 2) / Math.max(0.000000001, w), (box.y1 - box.y0 - pad * 2) / Math.max(0.000000001, h)));
  return { center: c, zoom: Number.isFinite(zoom) ? zoom : 1 };
}
var NS = "http://www.w3.org/2000/svg";
var nextId = 0;
function svgEl(tag, attrs = {}) {
  const el = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs))
    el.setAttribute(k, v);
  return el;
}
function setChildren(parent, nodes) {
  dfDollar9(parent).empty().append(nodes);
}
function layerPath(layer, d) {
  let p = layer.firstElementChild;
  if (!p) {
    p = svgEl("path");
    dfDollar9(layer).append(p);
  }
  if (p.getAttribute("d") !== d)
    p.setAttribute("d", d);
}
function hash(s) {
  let h = 2166136261;
  for (let i = 0;i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}
var reducedMotion3 = () => typeof globalThis.matchMedia === "function" && globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
function keyList(value) {
  const list = Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(/[\s,]+/) : [];
  return [...new Set(list.map((k) => k.trim()).filter(Boolean))];
}
function parseCenter(value) {
  if (!value)
    return null;
  const parts = value.split(",").map((v) => Number(v.trim()));
  if (parts.length !== 2 || !parts.every(Number.isFinite))
    return null;
  return [wrapLon(parts[0]), clamp2(parts[1], -85, 85)];
}
function viewFromAttributes(el, camera) {
  const d = el.dataset;
  const pick = (value, allowed, fallback) => allowed.includes(value) ? value : fallback;
  return {
    projection: pick(d.projection, PROJECTIONS, "equalEarth"),
    level: pick(d.level, LEVELS, "country"),
    palette: pick(d.palette, PALETTES, "atlas"),
    border: pick(d.border, BORDERS, "natural"),
    graticule: d.graticule !== "false",
    callouts: d.callouts !== undefined && d.callouts !== "false",
    selected: keyList(d.selected ?? ""),
    focus: d.focus || null,
    center: camera.center,
    zoom: camera.zoom
  };
}
var stateNameOf = (v) => v.focus ? "focused" : v.selected.length ? "selected" : "default";
function configOf2(geo) {
  const v = geo.view;
  const camera = geo.flight?.target ?? { center: v.center, zoom: v.zoom };
  return {
    projection: v.projection,
    level: v.level,
    palette: v.palette,
    border: v.border,
    graticule: v.graticule,
    callouts: v.callouts,
    selected: [...v.selected],
    focus: v.focus,
    center: [camera.center[0], camera.center[1]],
    zoom: camera.zoom
  };
}
function requestRender(el) {
  const geo = el._geo;
  if (!geo || geo.frameId)
    return;
  geo.frameId = requestAnimationFrame(() => {
    geo.frameId = 0;
    renderMap(el);
  });
}
function reportError2(el, err, url) {
  const message = err instanceof Error ? err.message : String(err);
  el.dispatchEvent(new CustomEvent("geo-map-error", { detail: { message, url }, bubbles: true }));
}
function levelFor(view) {
  return view.level === "auto" ? view.zoom >= 8 ? "state" : view.zoom >= 2 ? "country" : "continent" : view.level;
}
function cellFocus(view) {
  if (!view.focus?.startsWith("s2:"))
    return null;
  try {
    return s2Token(view.focus.slice(3));
  } catch {
    return null;
  }
}
function cellsDrawn(geo) {
  const token = cellFocus(geo.view);
  return token ? s2Children(token).map(s2Polygon) : geo.cellRegions;
}
function selectRegions(geo, path) {
  const ds = geo.ds;
  const v = geo.view;
  const m = ds.manifest;
  const zoom = v.zoom;
  geo.wanted = new Set;
  const visible = (r) => !!path(zoom >= 3 ? ds.proxies.get(r.properties.id) ?? r : r);
  const statesOf = (id) => {
    if (!m)
      return ds.memoryStates.filter((s) => s.properties.parent === id);
    const p = zoom >= 24 ? m.stateDetails?.[id] ?? m.states[id] : m.states[id];
    return p ? chunk(ds, p, geo.wanted) : [];
  };
  const countryShape = (r) => {
    const p = zoom >= 3 && m ? m.details[r.properties.id] : undefined;
    return p && chunk(ds, p, geo.wanted) || [r];
  };
  const focus = v.focus ? ds.byKey.get(v.focus) : undefined;
  const focusKey = v.focus;
  if (focusKey && !focusKey.startsWith("s2:")) {
    const [level, ...rest] = focusKey.split(":");
    const id = rest.join(":");
    const countries = ds.countries.filter(visible);
    if (level === "continent") {
      const inside = countries.filter((c) => c.properties.continent === id);
      return {
        regions: inside.flatMap(countryShape),
        context: countries.filter((c) => c.properties.continent !== id).flatMap(countryShape)
      };
    }
    const countryId = level === "country" ? id : focus?.properties.parent ?? ds.parents.get(focusKey) ?? "";
    const states = countryId ? statesOf(countryId) : undefined;
    const home = ds.byKey.get(`country:${countryId}`);
    return {
      regions: states?.length ? states : home ? countryShape(home) : [],
      context: countries.filter((c) => c.properties.id !== countryId).flatMap(countryShape)
    };
  }
  const level = levelFor(v);
  if (level === "continent")
    return { regions: ds.continents, context: [] };
  const regions = [];
  for (const c of ds.countries) {
    if (!visible(c))
      continue;
    if (level === "state" && zoom >= 3) {
      const states = statesOf(c.properties.id);
      regions.push(...states && states.length ? states : countryShape(c));
    } else
      regions.push(...countryShape(c));
  }
  if (level === "state" && zoom >= 3 && m)
    for (const id of Object.keys(m.states)) {
      if (ds.countryIds.has(id))
        continue;
      const proxy = ds.proxies.get(id);
      if (proxy && path(proxy))
        regions.push(...statesOf(id) ?? []);
    }
  return { regions, context: [] };
}
function anchorOf(path, projection, region) {
  const { d3 } = ready();
  const g = region.geometry;
  let largest = g;
  if (g.type === "MultiPolygon") {
    let best = -1;
    for (const coordinates of g.coordinates) {
      const poly = { type: "Polygon", coordinates };
      const a = path.area(poly);
      if (a > best) {
        best = a;
        largest = poly;
      }
    }
  }
  const c = path.centroid(largest);
  if (!c.every(Number.isFinite))
    return null;
  const inside = (pt) => {
    const ll = projection.invert?.(pt);
    return !!ll && d3.geoContains(largest, ll);
  };
  if (inside(c))
    return c;
  const [[x0, y0], [x1, y1]] = path.bounds(largest);
  let best = null;
  let dist = Infinity;
  for (let i = 1;i < 8; i++)
    for (let j = 1;j < 8; j++) {
      const pt = [x0 + (x1 - x0) * i / 8, y0 + (y1 - y0) * j / 8];
      const d = Math.hypot(pt[0] - c[0], pt[1] - c[1]);
      if (d < dist && inside(pt)) {
        best = pt;
        dist = d;
      }
    }
  return best ?? c;
}
function cssPx(el, name, fallback) {
  const raw = getComputedStyle(el).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n))
    return fallback;
  if (raw.endsWith("rem"))
    return n * parseFloat(getComputedStyle(document.documentElement).fontSize || "16");
  if (raw.endsWith("em"))
    return n * parseFloat(getComputedStyle(el).fontSize || "16");
  return n;
}
var gutterOf = (el) => cssPx(el, "--geo-map-callout-width", 160);
var measure;
function textWidth(text, font, size) {
  if (measure === undefined)
    measure = typeof OffscreenCanvas === "undefined" ? null : new OffscreenCanvas(1, 1).getContext("2d");
  if (!measure)
    return text.length * size * 0.58;
  measure.font = font;
  return measure.measureText(text).width;
}
function renderMap(el) {
  const geo = el._geo;
  if (!geo || geo.status !== "ready" || !geo.ds)
    return;
  const { d3 } = ready();
  const start = performance.now();
  const v = geo.view;
  const W = geo.width;
  const H = geo.height;
  const gutter = v.callouts ? Math.min(gutterOf(el), W / 3) : 0;
  geo.box = { x0: gutter, y0: 0, x1: W - gutter, y1: H };
  geo.svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
  geo.projection = makeProjection(v.projection, geo.box, v.center, v.zoom);
  if (!geo.flight && v.projection !== "orthographic" && v.projection !== "equalArea") {
    const seen = geo.projection.invert?.([(geo.box.x0 + geo.box.x1) / 2, (geo.box.y0 + geo.box.y1) / 2]);
    if (seen && Number.isFinite(seen[1]) && Math.abs(seen[1] - v.center[1]) > 0.000001)
      v.center = [v.center[0], clamp2(seen[1], -85, 85)];
  }
  const path = d3.geoPath(geo.projection);
  const { regions, context } = selectRegions(geo, path);
  geo.ds.maps.add(el);
  pump();
  const L = geo.layers;
  layerPath(L.sphere, path({ type: "Sphere" }) ?? "");
  layerPath(L.graticule, v.graticule ? path(d3.geoGraticule10()) ?? "" : "");
  const selected = new Set(v.selected);
  const styles = geo.layersData.styles;
  geo.drawn = new Map;
  let visibleRegions = 0;
  let contextRegions = 0;
  let visibleCells = 0;
  const reconcile = (layer, items, kind) => {
    const existing = new Map;
    for (const child of [...layer.children])
      existing.set(child.getAttribute("data-key") ?? "", child);
    const keep = new Set;
    for (const region of items) {
      const key = kind === "cell" ? `s2:${region.properties.id}` : keyOf(region);
      if (keep.has(key))
        continue;
      const d = path(region);
      if (!d)
        continue;
      keep.add(key);
      if (kind === "context")
        contextRegions++;
      else {
        geo.drawn.set(key, region);
        if (kind === "cell")
          visibleCells++;
        else
          visibleRegions++;
      }
      let p = existing.get(key);
      if (!p) {
        p = svgEl("path", {
          "data-key": key,
          class: kind === "cell" ? "geo-map-region geo-map-cell" : "geo-map-region"
        });
        if (kind !== "context") {
          p.setAttribute("role", "button");
          p.setAttribute("tabindex", "-1");
          p.setAttribute("aria-label", `${region.properties.name} (${kind === "cell" ? "S2 cell" : region.properties.level})`);
        }
        layer.append(p);
      }
      if (p.getAttribute("d") !== d)
        p.setAttribute("d", d);
      if (kind !== "cell")
        p.setAttribute("data-tone", String(hash(region.properties.id) % 7));
      if (kind !== "context")
        p.setAttribute("aria-pressed", selected.has(key) ? "true" : "false");
      const style = styles[key];
      p.removeAttribute("style");
      if (style) {
        if (style.fill !== undefined)
          p.style.fill = style.fill;
        if (style.stroke !== undefined)
          p.style.stroke = style.stroke;
        if (style.strokeWidth !== undefined)
          p.style.strokeWidth = String(style.strokeWidth);
        if (style.opacity !== undefined)
          p.style.opacity = String(style.opacity);
        if (style.dash !== undefined)
          p.style.strokeDasharray = style.dash;
      }
    }
    for (const [key, p] of existing)
      if (!keep.has(key))
        p.remove();
  };
  reconcile(L.context, context, "context");
  reconcile(L.regions, regions, "region");
  reconcile(L.cells, cellsDrawn(geo), "cell");
  const stops = [...L.regions.children, ...L.cells.children];
  const stop = stops.find((p) => p.getAttribute("data-key") === geo.roving) ?? stops.find((p) => p.getAttribute("aria-pressed") === "true") ?? stops[0];
  geo.roving = stop?.getAttribute("data-key") ?? null;
  for (const p of stops) {
    const t = p === stop ? "0" : "-1";
    if (p.getAttribute("tabindex") !== t)
      p.setAttribute("tabindex", t);
  }
  setChildren(L.lines, geo.layersData.lines.flatMap((line) => {
    let coordinates = line.coordinates;
    if (!coordinates && line.from && line.to)
      coordinates = geodesicPath(line.from, line.to);
    const d = coordinates ? path({ type: "LineString", coordinates }) : null;
    if (!d)
      return [];
    const p = svgEl("path", { d, class: "geo-map-line", "data-line": line.id });
    if (line.color)
      p.style.stroke = line.color;
    if (line.width !== undefined)
      p.style.strokeWidth = String(line.width);
    if (line.dash)
      p.style.strokeDasharray = line.dash;
    return [p];
  }));
  let visibleMarkers = 0;
  setChildren(L.markers, geo.layersData.markers.flatMap((marker) => {
    const pos = resolvePosition(marker.position);
    if (!path({ type: "Point", coordinates: pos }))
      return [];
    const xy = geo.projection(pos);
    visibleMarkers++;
    const g = svgEl("g", {
      class: "geo-map-marker",
      transform: `translate(${xy[0].toFixed(2)},${xy[1].toFixed(2)})`,
      "data-marker": marker.id,
      "data-shape": marker.shape ?? "circle",
      role: "img",
      "aria-label": marker.label ?? marker.id
    });
    const shape = marker.shape === "diamond" ? svgEl("path", { d: "M0,-7L7,0L0,7L-7,0Z" }) : marker.shape === "square" ? svgEl("rect", { x: "-5", y: "-5", width: "10", height: "10", rx: "2" }) : marker.shape === "pin" ? svgEl("path", { d: "M0,1C-18,-14 -5,-22 0,-22C5,-22 18,-14 0,1Z" }) : svgEl("circle", { r: "5" });
    if (marker.color)
      shape.style.fill = marker.color;
    g.append(shape);
    if (marker.label) {
      const text = svgEl("text", { x: "10", y: marker.shape === "pin" ? "-12" : "-6" });
      text.textContent = marker.label;
      g.append(text);
    }
    return [g];
  }));
  geo.anchors = new Map;
  const callable = [...geo.drawn].filter(([k]) => !k.startsWith("s2:"));
  if (callable.length <= 400)
    for (const [key, region] of callable) {
      const a = anchorOf(path, geo.projection, region);
      if (a && a[0] >= geo.box.x0 && a[0] <= geo.box.x1 && a[1] >= 0 && a[1] <= H)
        geo.anchors.set(key, a);
    }
  let calloutCount = 0;
  if (v.callouts)
    calloutCount = drawCallouts(el, geo, W, H, gutter, path);
  else
    setChildren(L.callouts, []);
  drawLift(geo);
  geo.stats = {
    visibleRegions,
    contextRegions,
    visibleCells,
    visibleMarkers,
    callouts: calloutCount,
    renderMs: performance.now() - start,
    cachedChunks: geo.ds.chunks.size,
    loadedBytes: geo.ds.bytes,
    loading: [...geo.wanted].filter((p) => !geo.ds.chunks.has(p) && !geo.ds.failed.has(p)).length
  };
  if (el.hasAttribute("aria-busy") !== geo.stats.loading > 0)
    dfDollar9(el).attr("aria-busy", geo.stats.loading ? "true" : null);
  if (geo.pendingFit && geo.ds.byKey.has(geo.pendingFit) && !geo.flight) {
    const key = geo.pendingFit;
    geo.pendingFit = null;
    flyTo(el, targetFor(geo, key), false);
  }
  writeOutputs(el);
  el.dispatchEvent(new CustomEvent("geo-map-render", { detail: { ...geo.stats } }));
}
function drawCallouts(el, geo, W, H, gutter, path) {
  const layer = geo.layers.callouts;
  const focus = geo.view.focus;
  const entries = [...geo.anchors].map(([key, anchor]) => {
    const region = geo.drawn.get(key);
    return { key, anchor, name: region.properties.name, area: path.area(region) };
  });
  const size = cssPx(el, "--geo-map-callout-size", 14);
  const row = Math.max(18, Math.round(size * 1.6));
  const font = `600 ${size}px ${getComputedStyle(el).fontFamily}`;
  const room = gutter - 12;
  const fit = (name) => {
    if (textWidth(name, font, size) <= room)
      return name;
    let n = name.length - 1;
    while (n > 1 && textWidth(`${name.slice(0, n)}…`, font, size) > room)
      n--;
    return `${name.slice(0, n).trimEnd()}…`;
  };
  const capacity = Math.max(1, Math.floor((H - 16) / row));
  const mid = (geo.box.x0 + geo.box.x1) / 2;
  const shown = entries.sort((a, b) => b.area - a.area).slice(0, capacity * 2);
  shown.sort((a, b) => a.anchor[0] - b.anchor[0]);
  const west = shown.filter((e) => e.anchor[0] < mid).length;
  const split = clamp2(west, shown.length - capacity, capacity);
  const sides = { left: shown.slice(0, split), right: shown.slice(split) };
  const groups = [];
  for (const side of ["left", "right"]) {
    const list = sides[side].sort((a, b) => a.anchor[1] - b.anchor[1]);
    const top = Math.round(size) + row;
    const bottom = H - 8;
    const ys = list.map((e) => clamp2(e.anchor[1], top, bottom));
    for (let i = 1;i < ys.length; i++)
      ys[i] = Math.max(ys[i], ys[i - 1] + row);
    if (ys.length && ys[ys.length - 1] > bottom) {
      ys[ys.length - 1] = bottom;
      for (let i = ys.length - 2;i >= 0; i--)
        ys[i] = Math.min(ys[i], ys[i + 1] - row);
    }
    list.forEach((e, i) => {
      const y = ys[i];
      const edge = side === "left" ? gutter : W - gutter;
      const outer = side === "left" ? 6 : W - 6;
      const g = svgEl("g", { class: "geo-map-callout", "data-key": e.key, "data-side": side });
      if (focus && e.key === focus)
        g.setAttribute("data-focus", "");
      g.append(svgEl("polyline", {
        class: "geo-map-callout-line",
        points: `${e.anchor[0].toFixed(1)},${e.anchor[1].toFixed(1)} ${edge.toFixed(1)},${y.toFixed(1)} ${outer.toFixed(1)},${y.toFixed(1)}`
      }), svgEl("circle", {
        class: "geo-map-callout-dot",
        cx: e.anchor[0].toFixed(1),
        cy: e.anchor[1].toFixed(1),
        r: "2.5"
      }));
      const text = svgEl("text", {
        class: "geo-map-callout-label",
        x: String(outer),
        y: (y - Math.max(4, Math.round(size * 0.3))).toFixed(1),
        "text-anchor": side === "left" ? "start" : "end"
      });
      text.textContent = fit(e.name);
      g.append(text);
      if (geo.view.selected.includes(e.key))
        g.setAttribute("data-selected", "");
      groups.push(g);
    });
  }
  setChildren(layer, groups);
  return groups.length;
}
function drawLift(geo) {
  const el = dfDollar9(geo.svg).closest(".geo-map").get(0);
  const keys = new Set;
  if (el?.dataset.highlight === "lift")
    for (const k of geo.view.selected)
      keys.add(k);
  if (geo.hover)
    keys.add(geo.hover);
  const existing = new Map;
  for (const c of [...geo.layers.lift.children])
    existing.set(c.getAttribute("data-key") ?? "", c);
  const keep = [];
  for (const key of keys) {
    const source = dfDollar9(geo.svg).find(`.geo-map-regions [data-key="${CSS.escape(key)}"], .geo-map-cells [data-key="${CSS.escape(key)}"]`).get(0) ?? null;
    if (!source)
      continue;
    let copy = existing.get(key);
    if (!copy)
      copy = svgEl("path", { "data-key": key, class: "geo-map-lifted" });
    copy.setAttribute("d", source.getAttribute("d") ?? "");
    for (const a of ["data-tone", "style", "aria-pressed"]) {
      const value = source.getAttribute(a);
      if (value === null)
        copy.removeAttribute(a);
      else
        copy.setAttribute(a, value);
    }
    if (key.startsWith("s2:"))
      copy.classList.add("geo-map-cell");
    keep.push(copy);
  }
  setChildren(geo.layers.lift, keep);
}
function targetFor(geo, key) {
  const box = geo.box.x1 > geo.box.x0 ? geo.box : { x0: 0, y0: 0, x1: geo.width, y1: geo.height };
  const bounds = settings.views[key] ?? VIEWS[key];
  if (bounds)
    return frame(boundsProxy(key, bounds), box, geo.view.projection);
  const cell = cellFocus({ ...geo.view, focus: key });
  if (cell)
    return frame(s2Polygon(cell), box, geo.view.projection);
  const region = geo.ds?.byKey.get(key);
  if (region)
    return frame(region.properties.level === "continent" ? region : mainBody(region), box, geo.view.projection);
  const parent = geo.ds?.parents.get(key);
  const home = parent ? geo.ds?.byKey.get(`country:${parent}`) : undefined;
  geo.pendingFit = key;
  return home ? frame(mainBody(home), box, geo.view.projection) : { center: geo.view.center, zoom: geo.view.zoom };
}
function flyTo(el, target, animate = true) {
  const geo = el._geo;
  const { d3 } = ready();
  cancelFlight(geo);
  const from = { center: geo.view.center, zoom: geo.view.zoom };
  const to = {
    center: [wrapLon(target.center[0]), clamp2(target.center[1], -85, 85)],
    zoom: clampZoom(target.zoom)
  };
  if (!animate || reducedMotion3() || !geo.width) {
    geo.view.center = to.center;
    geo.view.zoom = to.zoom;
    requestRender(el);
    announceView(el);
    return Promise.resolve();
  }
  const interpolate = d3.geoInterpolate(from.center, to.center);
  const distance = d3.geoDistance(from.center, to.center);
  const ms = clamp2(420 + distance * 260 + Math.abs(Math.log2(to.zoom / from.zoom)) * 90, 450, 1400);
  let t0 = -1;
  return new Promise((resolve) => {
    const step = (now) => {
      if (t0 < 0)
        t0 = now;
      const t = Math.min(1, (now - t0) / ms);
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      const c = interpolate(e);
      geo.view.center = [wrapLon(c[0]), clamp2(c[1], -85, 85)];
      geo.view.zoom = from.zoom * (to.zoom / from.zoom) ** e;
      renderMap(el);
      if (t < 1 && geo.flight) {
        geo.flight.id = requestAnimationFrame(step);
        return;
      }
      geo.view.center = to.center;
      geo.view.zoom = to.zoom;
      geo.flight = null;
      renderMap(el);
      announceView(el);
      resolve();
    };
    geo.flight = { id: requestAnimationFrame(step), target: to, done: resolve };
  });
}
function cancelFlight(geo) {
  if (!geo.flight)
    return;
  cancelAnimationFrame(geo.flight.id);
  const done = geo.flight.done;
  geo.flight = null;
  done();
}
function announceView(el) {
  const geo = el._geo;
  const v = geo.view;
  const key = `${v.center[0].toFixed(4)},${v.center[1].toFixed(4)},${v.zoom.toFixed(4)}`;
  if (key === geo.lastView)
    return;
  geo.lastView = key;
  el.dispatchEvent(new CustomEvent("geo-map-view", {
    detail: { center: [v.center[0], v.center[1]], zoom: v.zoom, level: levelFor(v) },
    bubbles: true
  }));
}
function reflect(el, name, value, fallback) {
  const current = el.getAttribute(name);
  if ((current ?? fallback) === (value ?? fallback))
    return;
  dfDollar9(el).attr(name, value === fallback && current === null ? null : value);
}
function applyMarkup9(el, name, config) {
  if (config.projection !== undefined)
    reflect(el, "data-projection", config.projection, "equalEarth");
  if (config.level !== undefined)
    reflect(el, "data-level", config.level, "country");
  if (config.palette !== undefined)
    reflect(el, "data-palette", config.palette, "atlas");
  if (config.border !== undefined)
    reflect(el, "data-border", config.border, "natural");
  if (config.graticule !== undefined)
    reflect(el, "data-graticule", config.graticule ? null : "false", null);
  if (config.callouts !== undefined)
    reflect(el, "data-callouts", config.callouts ? "true" : null, null);
  const selected = name === "default" ? [] : keyList(config.selected ?? "");
  const now = keyList(el.getAttribute("data-selected") ?? "");
  if (selected.join(" ") !== now.join(" "))
    dfDollar9(el).attr("data-selected", selected.length ? selected.join(" ") : null);
  const focus = name === "focused" ? config.focus || null : null;
  if ((el.getAttribute("data-focus") || null) !== focus)
    dfDollar9(el).attr("data-focus", focus);
}
function checkConfig(config) {
  if (config.projection !== undefined && !PROJECTIONS.includes(config.projection))
    throw new RangeError(`geo-map: unknown projection "${config.projection}" (${PROJECTIONS.join(", ")})`);
  if (config.level !== undefined && !LEVELS.includes(config.level))
    throw new RangeError(`geo-map: unknown level "${config.level}" (${LEVELS.join(", ")})`);
  if (config.palette !== undefined && !PALETTES.includes(config.palette))
    throw new RangeError(`geo-map: unknown palette "${config.palette}" (${PALETTES.join(", ")})`);
  if (config.border !== undefined && !BORDERS.includes(config.border))
    throw new RangeError(`geo-map: unknown border "${config.border}" (${BORDERS.join(", ")})`);
  if (config.center !== undefined)
    assertLonLat(config.center);
  if (config.zoom !== undefined && (!Number.isFinite(Number(config.zoom)) || Number(config.zoom) < 1 || Number(config.zoom) > 1024))
    throw new RangeError("geo-map: zoom is 1 to 1024");
}
function triggerStateChange9(el, name, config, incoming) {
  const geo = el._geo;
  checkConfig(config);
  if (incoming.focus?.startsWith("s2:"))
    s2Token(incoming.focus.slice(3));
  if (name === "focused" && !config.focus && geo.authored.focus)
    config = { ...config, focus: geo.authored.focus };
  if (name === "selected" && !keyList(config.selected ?? "").length)
    config = { ...config, selected: geo.authored.selected };
  let landed = name;
  if (name === "focused" && !config.focus)
    landed = keyList(config.selected ?? "").length ? "selected" : "default";
  if (name === "selected" && !keyList(config.selected ?? "").length)
    landed = "default";
  applyMarkup9(el, landed, config);
  if (landed !== name)
    el.dataset.stateName = landed;
  return geo.ready.then(() => {
    const before = geo.view.focus;
    syncView(el, false);
    if (geo.status !== "ready")
      return;
    const camera = incoming.center !== undefined || incoming.zoom !== undefined;
    if (camera)
      return flyTo(el, { center: incoming.center ?? geo.view.center, zoom: Number(incoming.zoom ?? geo.view.zoom) }, false);
    if (geo.view.focus && geo.view.focus !== before)
      return flyTo(el, targetFor(geo, geo.view.focus));
    requestRender(el);
    return;
  });
}
function syncView(el, fly) {
  const geo = el._geo;
  if (!geo)
    return;
  const previous = geo.view;
  const next = viewFromAttributes(el, { center: previous.center, zoom: previous.zoom });
  const changed = JSON.stringify({ ...next, center: 0, zoom: 0 }) !== JSON.stringify({ ...previous, center: 0, zoom: 0 });
  if (!changed)
    return;
  geo.view = next;
  if (next.selected.join(" ") !== previous.selected.join(" "))
    announceSelection(el);
  if (next.focus !== previous.focus) {
    announceFocus(el);
    if (fly && next.focus && geo.status === "ready")
      flyTo(el, targetFor(geo, next.focus));
  }
  requestRender(el);
}
function nameOfKey(geo, key) {
  return geo.ds?.byKey.get(key)?.properties.name ?? (key.startsWith("s2:") ? `S2 ${key.slice(3)}` : key);
}
function announceSelection(el) {
  const geo = el._geo;
  const keys = [...geo.view.selected];
  el.dispatchEvent(new CustomEvent("geo-map-select", {
    detail: { keys, names: keys.map((k) => nameOfKey(geo, k)) },
    bubbles: true
  }));
}
function announceFocus(el) {
  const geo = el._geo;
  const key = geo.view.focus;
  el.dispatchEvent(new CustomEvent("geo-map-focus", {
    detail: { key, name: key ? nameOfKey(geo, key) : null },
    bubbles: true
  }));
}
var geoMapApi = componentState({
  component: "geo-map",
  states: geoMapStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange9(el, state.name, state.config, incoming),
  read: (el) => {
    const geo = el._geo;
    if (!geo)
      return { name: el.dataset.stateName || "default", config: {} };
    const view = viewFromAttributes(el, { center: geo.view.center, zoom: geo.view.zoom });
    const config = configOf2({ ...geo, view: { ...view, center: geo.view.center, zoom: geo.view.zoom } });
    return { name: stateNameOf(view), config };
  },
  markup: (el, state) => applyMarkup9(el, state.name, state.config)
});
function userChange(el, patch) {
  const geo = el._geo;
  const config = { ...configOf2(geo), ...patch };
  const name = stateNameOf({ focus: config.focus ?? null, selected: keyList(config.selected) });
  if (patch.focus !== undefined && patch.focus !== geo.view.focus) {
    act(el, Promise.resolve(geoMapApi.setState(el, name, { selected: config.selected, focus: config.focus ?? null })));
    return;
  }
  applyMarkup9(el, name, config);
  syncView(el, true);
  geoMapApi.commit(el, name, configOf2(geo));
}
function pixelOf(geo, e) {
  const r = geo.svg.getBoundingClientRect();
  return [(e.clientX - r.left) * geo.width / (r.width || 1), (e.clientY - r.top) * geo.height / (r.height || 1)];
}
function unprojectVisible(projection, pixel) {
  const { d3 } = ready();
  const p = projection.invert?.(pixel);
  if (!p || !p.every(Number.isFinite) || Math.abs(p[1]) > 90)
    return null;
  if (!d3.geoPath(projection)({ type: "Point", coordinates: p }))
    return null;
  const back = projection(p);
  if (!back || Math.hypot(back[0] - pixel[0], back[1] - pixel[1]) > 0.1)
    return null;
  return [p[0], p[1]];
}
function pan(el, dx, dy) {
  const geo = el._geo;
  if (!geo.projection)
    return;
  cancelFlight(geo);
  const delta = RAD / geo.projection.scale();
  geo.view.center = [wrapLon(geo.view.center[0] - dx * delta), clamp2(geo.view.center[1] + dy * delta, -85, 85)];
  requestRender(el);
}
function zoomAt(el, factor, pixel) {
  const geo = el._geo;
  if (!geo.projection)
    return;
  cancelFlight(geo);
  const zoom = clampZoom(geo.view.zoom * factor);
  let center = [...geo.view.center];
  const before = pixel ? unprojectVisible(geo.projection, pixel) : null;
  for (let i = 0;pixel && before && i < 4; i++) {
    const after = unprojectVisible(makeProjection(geo.view.projection, geo.box, center, zoom), pixel);
    if (!after)
      break;
    const dLon = wrapLon(before[0] - after[0]);
    const dLat = before[1] - after[1];
    center = [wrapLon(center[0] + dLon), clamp2(center[1] + dLat, -85, 85)];
    if (Math.abs(dLon) + Math.abs(dLat) < 0.000001)
      break;
  }
  geo.view.center = center;
  geo.view.zoom = zoom;
  requestRender(el);
}
function settleSoon(el) {
  const geo = el._geo;
  clearTimeout(geo.restTimer);
  geo.restTimer = setTimeout(() => announceView(el), 160);
}
var keyAt = (target) => {
  if (!(target instanceof Element))
    return null;
  const hit = dfDollar9(target).closest("[data-key]").get(0);
  return hit && !dfDollar9(hit).closest(".geo-map-context").get(0) ? hit.getAttribute("data-key") : null;
};
function pick(el, key, additive) {
  const geo = el._geo;
  const mode = el.dataset.select ?? "single";
  if (mode === "none")
    return;
  const now = geo.view.selected;
  let next;
  if (mode === "multiple" || additive)
    next = now.includes(key) ? now.filter((k) => k !== key) : [...now, key];
  else
    next = now.length === 1 && now[0] === key ? [] : [key];
  geo.roving = key;
  userChange(el, { selected: next });
}
function showTooltip(geo, key, pixel) {
  const t = geo.tooltip;
  if (!key) {
    t.hidden = true;
    return;
  }
  const region = geo.drawn.get(key);
  if (!region)
    return;
  const parent = region.properties.parent ? geo.ds?.byKey.get(`country:${region.properties.parent}`)?.properties.name : "";
  dfDollar9(t).text(parent ? `${region.properties.name}, ${parent}` : region.properties.name);
  t.hidden = false;
  if (pixel) {
    t.style.left = `${Math.min(pixel[0] + 14, geo.width - 8)}px`;
    t.style.top = `${pixel[1] + 12}px`;
  }
}
function setHover(el, key) {
  const geo = el._geo;
  if (geo.hover === key)
    return;
  geo.hover = key;
  for (const c of dfDollar9(geo.svg).find(".geo-map-callout").toArray())
    c.toggleAttribute("data-hover", c.getAttribute("data-key") === key);
  drawLift(geo);
  writeOutputs(el);
}
function moveRoving(el, key, dir) {
  const geo = el._geo;
  const from = geo.anchors.get(key);
  if (!from)
    return;
  let best = null;
  let score = Infinity;
  for (const [k, a] of geo.anchors) {
    if (k === key)
      continue;
    const dx = a[0] - from[0];
    const dy = a[1] - from[1];
    const along = dx * dir[0] + dy * dir[1];
    if (along <= 0)
      continue;
    const across = Math.abs(dx * dir[1] - dy * dir[0]);
    const s = along + across * 2;
    if (s < score) {
      score = s;
      best = k;
    }
  }
  if (!best)
    return;
  geo.roving = best;
  renderMap(el);
  const target = dfDollar9(geo.svg).find(`[data-key="${CSS.escape(best)}"][role="button"]`).get(0);
  target?.focus();
}
function bindInteractions(el) {
  const geo = el._geo;
  const svg = geo.svg;
  const signal = geo.abort.signal;
  svg.addEventListener("pointerdown", (e) => {
    if (e.button !== 0)
      return;
    geo.pointers.set(e.pointerId, pixelOf(geo, e));
    geo.moved = false;
  }, { signal });
  svg.addEventListener("pointermove", (e) => {
    const next = pixelOf(geo, e);
    const previous = geo.pointers.get(e.pointerId);
    if (!previous) {
      const key = keyAt(e.target);
      setHover(el, key);
      showTooltip(geo, key, next);
      return;
    }
    if (Math.hypot(next[0] - previous[0], next[1] - previous[1]) < 0.5)
      return;
    if (!svg.hasPointerCapture(e.pointerId))
      svg.setPointerCapture(e.pointerId);
    const others = [...geo.pointers.entries()].filter(([id]) => id !== e.pointerId);
    if (others.length) {
      const other = others[0][1];
      const a = Math.hypot(previous[0] - other[0], previous[1] - other[1]);
      const b = Math.hypot(next[0] - other[0], next[1] - other[1]);
      if (a > 2 && b > 2)
        zoomAt(el, b / a);
    } else
      pan(el, next[0] - previous[0], next[1] - previous[1]);
    if (Math.hypot(next[0] - previous[0], next[1] - previous[1]) > 1)
      geo.moved = true;
    geo.pointers.set(e.pointerId, next);
    showTooltip(geo, null);
    settleSoon(el);
  }, { signal });
  const release = (e) => {
    geo.pointers.delete(e.pointerId);
  };
  svg.addEventListener("pointerup", release, { signal });
  svg.addEventListener("pointercancel", release, { signal });
  svg.addEventListener("lostpointercapture", release, { signal });
  svg.addEventListener("pointerleave", () => {
    setHover(el, null);
    showTooltip(geo, null);
  }, { signal });
  svg.addEventListener("click", (e) => {
    if (geo.moved)
      return;
    const key = keyAt(e.target);
    if (key)
      pick(el, key, e.shiftKey || e.metaKey || e.ctrlKey);
  }, { signal });
  svg.addEventListener("dblclick", (e) => {
    e.preventDefault();
    const key = keyAt(e.target);
    const drill = key && el.dataset.drill !== "none" && !key.startsWith("state:") && !(key.startsWith("s2:") && s2Level(key.slice(3)) === 30);
    if (drill)
      userChange(el, { focus: key, selected: [] });
    else
      zoomAt(el, 2, pixelOf(geo, e));
    settleSoon(el);
  }, { signal });
  svg.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY * (e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? geo.height : 1);
    zoomAt(el, Math.exp(-delta * 0.0015), pixelOf(geo, e));
    settleSoon(el);
  }, { signal, passive: false });
  svg.addEventListener("keydown", (e) => {
    const key = keyAt(e.target);
    const arrows = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    };
    if (key && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      pick(el, key, e.shiftKey);
      return;
    }
    if (key && arrows[e.key] && !e.shiftKey) {
      e.preventDefault();
      moveRoving(el, key, arrows[e.key]);
      return;
    }
    if (e.key === "Escape") {
      if (geo.view.selected.length)
        userChange(el, { selected: [] });
      else if (geo.view.focus)
        act(el, focusUp(el));
      return;
    }
    if (!["+", "=", "-", "Home", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key))
      return;
    e.preventDefault();
    if (e.key === "+" || e.key === "=")
      zoomAt(el, 1.5);
    else if (e.key === "-")
      zoomAt(el, 1 / 1.5);
    else if (e.key === "Home")
      act(el, reset(el));
    else {
      const [x, y] = arrows[e.key];
      pan(el, -x * 50, -y * 50);
    }
    settleSoon(el);
  }, { signal });
  svg.addEventListener("focusin", (e) => {
    const key = keyAt(e.target);
    if (key) {
      geo.roving = key;
      setHover(el, key);
    }
  }, { signal });
  svg.addEventListener("focusout", () => setHover(el, null), { signal });
}
function writeOutputs(el) {
  if (!el.id)
    return;
  const geo = el._geo;
  for (const out of dfDollar9(`output[data-geo-for="${CSS.escape(el.id)}"]`).toArray()) {
    const kind = out.dataset.geoOutput ?? "selection";
    const v = geo.view;
    const cell = cellFocus(v);
    const text = kind === "focus" ? v.focus ? nameOfKey(geo, v.focus) : "World" : kind === "zoom" ? `${v.zoom < 10 ? v.zoom.toFixed(1) : Math.round(v.zoom)}x` : kind === "level" ? v.focus ? v.focus.startsWith("s2:") ? cell ? `S2 level ${s2Level(cell) + 1}` : "" : v.focus.startsWith("continent:") ? "country" : "state" : levelFor(v) : kind === "hover" ? geo.hover ? nameOfKey(geo, geo.hover) : "" : kind === "center" ? `${v.center[1].toFixed(2)}°, ${v.center[0].toFixed(2)}°` : kind === "regions" ? String(geo.stats.visibleRegions) : v.selected.map((k) => nameOfKey(geo, k)).join(", ");
    if (out.textContent !== text)
      dfDollar9(out).text(text);
  }
}
var mapFor = (control) => {
  const id = control.getAttribute("data-geo-for") ?? "";
  const el = id ? dfDollar9(`#${CSS.escape(id)}`).get(0) : null;
  return el?.matches(".geo-map") && el._geo ? el : null;
};
async function suggest(input, el) {
  const hits = await search(el, input.value, 12);
  let list = input.list ?? null;
  if (!list) {
    list = document.createElement("datalist");
    list.id = `${el.id}-geo-names-${nextId++}`;
    list.setAttribute("data-ce-chrome", "");
    dfDollar9(input).after(list);
    input.setAttribute("list", list.id);
  }
  setChildren(list, hits.map((h) => {
    const o = document.createElement("option");
    o.value = h.label;
    return o;
  }));
  return hits;
}
async function runSearch(input, el) {
  const value = input.value.trim();
  if (!value)
    return;
  const hits = await search(el, value, 12);
  const hit = hits.find((h) => normalize(h.label) === normalize(value)) ?? hits[0];
  input.setCustomValidity(hit ? "" : `No region named "${value}"`);
  input.toggleAttribute("aria-invalid", !hit);
  if (!hit) {
    input.reportValidity();
    return;
  }
  await focusRegion(el, hit.key);
}
function act(el, action) {
  action.catch((err) => reportError2(el, err, ""));
}
function bindControls() {
  if (document.__geoMapInit)
    return;
  document.__geoMapInit = true;
  dfDollar9(document).on("click", (e) => {
    const control = e.target instanceof Element ? dfDollar9(e.target).closest("[data-geo-for][data-geo-action]").get(0) : undefined;
    if (!control || control.tagName === "INPUT")
      return;
    const el = mapFor(control);
    if (!el)
      return;
    const value = control.dataset.value ?? "";
    const geo = el._geo;
    switch (control.dataset.geoAction) {
      case "zoom-in":
        zoomAt(el, 1.6);
        settleSoon(el);
        break;
      case "zoom-out":
        zoomAt(el, 1 / 1.6);
        settleSoon(el);
        break;
      case "reset":
        act(el, reset(el));
        break;
      case "up":
        act(el, focusUp(el));
        break;
      case "focus":
        act(el, focusRegion(el, value || geo.view.selected[0] || null));
        break;
      case "select":
        act(el, select(el, keyList(value)));
        break;
      case "clear":
        act(el, select(el, []));
        break;
    }
  });
  dfDollar9(document).on("change", (e) => {
    const control = e.target instanceof HTMLElement ? e.target : null;
    if (!control?.matches("[data-geo-for]"))
      return;
    const el = mapFor(control);
    if (!el)
      return;
    if (control.matches('input[data-geo-action="search"]')) {
      act(el, runSearch(control, el));
      return;
    }
    const param = control.dataset.geoParam;
    if (!param)
      return;
    const value = control instanceof HTMLInputElement && control.type === "checkbox" ? control.checked : control.value;
    const current = el.api.getState();
    act(el, Promise.resolve(geoMapApi.setState(el, current.name, { [param]: value })));
  });
  dfDollar9(document).on("input", (e) => {
    const input = e.target instanceof HTMLInputElement ? e.target : null;
    if (!input?.matches('[data-geo-for][data-geo-action="search"]'))
      return;
    const el = mapFor(input);
    if (!el)
      return;
    input.setCustomValidity("");
    input.removeAttribute("aria-invalid");
    act(el, suggest(input, el));
  });
  dfDollar9(document).on("keydown", (e) => {
    const ev = e;
    const input = ev.target instanceof HTMLInputElement ? ev.target : null;
    if (ev.key !== "Enter" || !input?.matches('[data-geo-for][data-geo-action="search"]'))
      return;
    const el = mapFor(input);
    if (!el)
      return;
    ev.preventDefault();
    act(el, runSearch(input, el));
  });
}
var mapOf = (el) => {
  const node = typeof el === "string" ? dfDollar9(el).get(0) : el;
  if (!node?.matches?.(".geo-map") || !node._geo)
    throw new Error("not an initialized .geo-map");
  return node;
};
function select(el, keys) {
  const node = mapOf(el);
  const geo = node._geo;
  const name = geo.view.focus ? "focused" : keys.length ? "selected" : "default";
  return Promise.resolve(geoMapApi.setState(node, name, { selected: keys }));
}
async function focusRegion(el, region) {
  const node = mapOf(el);
  const geo = node._geo;
  await geo.ready;
  let key = region;
  if (key?.startsWith("s2:"))
    key = `s2:${s2Token(key.slice(3))}`;
  else if (key && !/^(continent|country|state):/.test(key))
    key = (await search(node, key, 1))[0]?.key ?? null;
  if (region && !key)
    throw new Error(`geo-map: no region named "${region}"`);
  if (key?.startsWith("state:") && geo.ds && !geo.ds.parents.has(key) && !geo.ds.byKey.has(key))
    await searchEntries(geo.ds);
  await geoMapApi.setState(node, key ? "focused" : "default", { focus: key, selected: [] });
}
async function focusUp(el) {
  const node = mapOf(el);
  const geo = node._geo;
  const key = geo.view.focus;
  if (!key)
    return reset(node);
  const cell = cellFocus(geo.view);
  if (cell)
    return s2Level(cell) ? focusRegion(node, `s2:${s2Parent(cell)}`) : reset(node);
  const region = geo.ds?.byKey.get(key);
  const parent = key.startsWith("state:") ? `country:${region?.properties.parent ?? geo.ds?.parents.get(key) ?? ""}` : key.startsWith("country:") && region?.properties.continent ? `continent:${region.properties.continent}` : null;
  if (parent && geo.ds?.byKey.has(parent))
    return focusRegion(node, parent);
  return reset(node);
}
async function reset(el) {
  const node = mapOf(el);
  const geo = node._geo;
  await geo.ready;
  await geoMapApi.setState(node, "default", {});
  if (geo.status === "ready")
    await flyTo(node, geo.home);
}
async function search(el, query, limit = 10) {
  const node = mapOf(el);
  const geo = node._geo;
  await geo.ready;
  if (!geo.ds)
    return [];
  return rank2(await searchEntries(geo.ds), query, limit);
}
function zoomBy(el, factor) {
  if (!Number.isFinite(factor) || factor <= 0)
    throw new RangeError("a positive zoom factor");
  const node = mapOf(el);
  zoomAt(node, factor);
  settleSoon(node);
}
async function setView(el, center, zoom, animate = true) {
  const node = mapOf(el);
  const geo = node._geo;
  assertLonLat(center);
  await geo.ready;
  await flyTo(node, { center, zoom: zoom ?? geo.view.zoom }, animate);
}
function setLayers(el, layers) {
  const node = mapOf(el);
  const geo = node._geo;
  const next = { ...geo.layersData };
  if (layers.markers) {
    for (const m of layers.markers)
      resolvePosition(m.position);
    next.markers = layers.markers.map((m) => ({ ...m }));
  }
  if (layers.lines) {
    for (const l of layers.lines) {
      if (l.coordinates) {
        if (l.coordinates.length < 2)
          throw new RangeError(`line ${l.id}: two positions at least`);
        l.coordinates.forEach(assertLonLat);
      } else if (!l.from || !l.to)
        throw new RangeError(`line ${l.id}: coordinates, or from and to`);
    }
    next.lines = layers.lines.map((l) => ({ ...l }));
  }
  if (layers.cells) {
    next.cells = layers.cells.map((c) => s2Token(c));
    geo.cellRegions = next.cells.map(s2Polygon);
  }
  if (layers.styles)
    next.styles = { ...layers.styles };
  geo.layersData = next;
  requestRender(node);
}
function visible(el) {
  const geo = mapOf(el)._geo;
  return [...geo.drawn].map(([key, r]) => ({
    key,
    name: r.properties.name,
    level: r.properties.level,
    anchor: geo.anchors.get(key) ?? null
  }));
}
function region(el, key) {
  return mapOf(el)._geo.ds?.byKey.get(key) ?? null;
}
function project(el, point) {
  const geo = mapOf(el)._geo;
  assertLonLat(point);
  if (!geo.projection || !ready().d3.geoPath(geo.projection)({ type: "Point", coordinates: point }))
    return null;
  return geo.projection(point);
}
function unproject(el, pixel) {
  const geo = mapOf(el)._geo;
  return geo.projection ? unprojectVisible(geo.projection, pixel) : null;
}
function stats(el) {
  return { ...mapOf(el)._geo.stats };
}
function hatch(el) {
  return mapOf(el)._geo.hatch;
}
df$9.geoMapApi = geoMapApi;
df$9.geoMapStates = geoMapStates;
df$9.geoMap = {
  select,
  focus: focusRegion,
  up: focusUp,
  reset,
  search,
  zoomBy,
  setView,
  setLayers,
  visible,
  region,
  project,
  unproject,
  stats,
  hatch
};
df$9.geo = {
  load,
  configure,
  urls: GEO_VENDOR_URLS,
  WGS84,
  inverse,
  direct,
  path: geodesicPath,
  length: polylineLength,
  s2Cell,
  s2Id,
  s2Token,
  s2Level,
  s2Center,
  s2Vertices,
  s2Polygon,
  s2Neighbors,
  s2Children,
  s2Parent,
  resolvePosition,
  inBounds,
  mortonEncode,
  mortonDecode,
  mortonKey,
  mortonIndex,
  routeGraph,
  positionAlongRoute,
  decode,
  features,
  rewind
};
function layersFrom(el) {
  const script = dfDollar9(el).children("script.geo-map-layers").get(0);
  const empty = { markers: [], lines: [], cells: [], styles: {} };
  if (!script)
    return empty;
  const json = JSON.parse(script.textContent || "{}");
  return { ...empty, ...json };
}
function dataUrl(el) {
  const raw = el.dataset.src || metaContent("geo-map-data") || settings.data || releaseData();
  return new URL(raw, document.baseURI).href;
}
function mount2(el) {
  const camera = {
    center: parseCenter(el.dataset.center) ?? HOME,
    zoom: clampZoom(Number(el.dataset.zoom) || 1)
  };
  const svg = svgEl("svg", {
    "data-ce-chrome": "",
    class: "geo-map-svg",
    role: "group",
    tabindex: "0",
    "aria-roledescription": "map",
    "aria-label": el.getAttribute("aria-label") || "Interactive map. Arrow keys pan, plus and minus zoom, Home resets."
  });
  const pattern = svgEl("pattern", {
    id: `geo-map-hatch-${nextId++}`,
    width: "8",
    height: "8",
    patternUnits: "userSpaceOnUse"
  });
  pattern.append(svgEl("path", { d: "M-2,2L2,-2M0,8L8,0M6,10L10,6", class: "geo-map-hatch" }));
  const defs = svgEl("defs");
  defs.append(pattern);
  svg.append(defs);
  const layers = {};
  for (const name of ["sphere", "graticule", "context", "regions", "cells", "lines", "lift", "markers", "callouts"]) {
    layers[name] = svgEl("g", { class: `geo-map-${name}` });
    if (["sphere", "graticule", "context", "lift", "lines"].includes(name))
      layers[name].setAttribute("aria-hidden", "true");
    svg.append(layers[name]);
  }
  const tooltip = document.createElement("output");
  tooltip.className = "geo-map-tooltip";
  tooltip.setAttribute("data-ce-chrome", "");
  tooltip.hidden = true;
  tooltip.setAttribute("aria-hidden", "true");
  let layersData;
  let layerError = "";
  try {
    layersData = layersFrom(el);
  } catch (err) {
    layersData = { markers: [], lines: [], cells: [], styles: {} };
    layerError = `script.geo-map-layers is no valid JSON: ${err instanceof Error ? err.message : err}`;
  }
  const geo = {
    view: viewFromAttributes(el, camera),
    ds: null,
    status: "loading",
    ready: Promise.resolve(),
    svg,
    layers,
    tooltip,
    hatch: `url(#${pattern.id})`,
    width: el.clientWidth || 800,
    height: el.clientHeight || 480,
    projection: null,
    box: { x0: 0, y0: 0, x1: 0, y1: 0 },
    frameId: 0,
    flight: null,
    pendingFit: null,
    pointers: new Map,
    moved: false,
    drawn: new Map,
    anchors: new Map,
    hover: null,
    roving: null,
    layersData,
    cellRegions: [],
    wanted: new Set,
    stats: {
      visibleRegions: 0,
      contextRegions: 0,
      visibleCells: 0,
      visibleMarkers: 0,
      callouts: 0,
      renderMs: 0,
      cachedChunks: 0,
      loadedBytes: 0,
      loading: 0
    },
    abort: new AbortController,
    resize: new ResizeObserver((entries) => {
      const r = entries[0].contentRect;
      if (r.width > 0 && r.height > 0 && (r.width !== geo.width || r.height !== geo.height)) {
        geo.width = r.width;
        geo.height = r.height;
        requestRender(el);
      }
    }),
    attrs: new MutationObserver(() => syncView(el, true)),
    lastView: "",
    home: camera,
    authored: { focus: el.dataset.focus || null, selected: keyList(el.dataset.selected ?? "") },
    restTimer: 0
  };
  el._geo = geo;
  dfDollar9(el).append(svg).append(tooltip);
  el.dataset.geoStatus = "loading";
  dfDollar9(el).attr("aria-busy", "true");
  geo.ready = (async () => {
    try {
      await load();
      try {
        layersData.cells = layersData.cells.map((c) => s2Token(c));
        geo.cellRegions = layersData.cells.map(s2Polygon);
        for (const m of layersData.markers)
          resolvePosition(m.position);
      } catch (err) {
        layersData.cells = [];
        layersData.markers = layersData.markers.filter((m) => {
          try {
            resolvePosition(m.position);
            return true;
          } catch {
            return false;
          }
        });
        layerError ||= `script.geo-map-layers: ${err instanceof Error ? err.message : err}`;
      }
      geo.ds = await openDataset(dataUrl(el));
      geo.ds.maps.add(el);
      geo.status = "ready";
      el.dataset.geoStatus = "ready";
      if (geo.view.focus && !el.dataset.center && !el.dataset.zoom) {
        geo.box = { x0: 0, y0: 0, x1: geo.width, y1: geo.height };
        const target = targetFor(geo, geo.view.focus);
        geo.view.center = target.center;
        geo.view.zoom = target.zoom;
      }
      renderMap(el);
      announceView(el);
      if (layerError) {
        dfDollar9(el).append(dfDollar9('<output class="geo-map-error" role="alert" data-ce-chrome></output>').text(layerError));
        reportError2(el, new Error(layerError), "");
      }
    } catch (err) {
      geo.status = "error";
      el.dataset.geoStatus = "error";
      dfDollar9(el).attr("aria-busy", null);
      const message = err instanceof Error ? err.message : String(err);
      dfDollar9(el).children(".geo-map-error").remove();
      dfDollar9(el).append(dfDollar9('<output class="geo-map-error" role="alert" data-ce-chrome></output>').text(`The map could not be loaded. ${message}`));
      reportError2(el, err, "");
    }
  })();
  geo.resize.observe(el);
  geo.attrs.observe(el, {
    attributes: true,
    attributeFilter: [
      "data-projection",
      "data-level",
      "data-palette",
      "data-border",
      "data-graticule",
      "data-callouts",
      "data-selected",
      "data-focus",
      "data-highlight"
    ]
  });
  bindInteractions(el);
}
function init9() {
  dfDollar9(".geo-map:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    bindControls();
    mount2(el);
    const geo = el._geo;
    const name = stateNameOf(geo.view);
    bindComponent(el, geoMapApi, { name, config: configOf2(geo) });
    geoMapApi.setState(el, name, {});
  });
}
init9();
new MutationObserver(init9).observe(document, { childList: true, subtree: true });

// src/components/graphs/graph-explorer/graph-explorer.ts
var df$10 = defussGlobals();
var dfDollar10 = defussQuery();
var morphRuntime = dfDollar10;
var parseVNodes = (markup) => [...new DOMParser().parseFromString(`<body>${markup}</body>`, "text/html").body.childNodes].map((n) => morphRuntime.domNodeToVNode(n));
var graphExplorerStates = ["default", "selected", "focused"];
var TONES = ["muted", "ink", "accent", "link", "ok", "warn", "danger"];
var reducedMotion4 = () => !!globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var clamp3 = (v, a, b) => Math.max(a, Math.min(b, v));
var fmt = (n) => Number(n).toLocaleString("en-US");
var smallCycle = (n) => n.scc > 1 && n.scc <= 12;
var live2 = new Set;
function keyList2(value) {
  const list = Array.isArray(value) ? value.map(String) : typeof value === "string" ? value.split(/[\s,]+/) : [];
  return [...new Set(list.map((k) => k.trim()).filter(Boolean))];
}
var SAFE = new WeakSet;
var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
var esc3 = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
var isSafe = (v) => !!v && typeof v === "object" && SAFE.has(v);
var part = (v) => isSafe(v) ? v.html : Array.isArray(v) ? v.map(part).join("") : esc3(v);
function html(strings, ...values) {
  let out = strings[0];
  for (let i = 0;i < values.length; i++)
    out += part(values[i]) + strings[i + 1];
  const safe = { html: out };
  SAFE.add(safe);
  return safe;
}
var BLOCKED = new Set([
  "script",
  "iframe",
  "object",
  "embed",
  "style",
  "link",
  "meta",
  "base",
  "form",
  "frame",
  "frameset"
]);
var URL_ATTRS = new Set(["href", "src", "xlink:href", "action", "formaction", "srcset", "poster", "background"]);
function sanitize(list) {
  const out = [];
  for (const n of list || []) {
    if (!n || typeof n !== "object") {
      out.push(n);
      continue;
    }
    if (n.type === "#comment" || BLOCKED.has(String(n.type).toLowerCase()))
      continue;
    const attrs = {};
    for (const [k, v] of Object.entries(n.attributes || {})) {
      const kl = k.toLowerCase();
      if (kl.startsWith("on") || typeof v === "function")
        continue;
      if (URL_ATTRS.has(kl) && /^\s*(javascript|data|vbscript):/i.test(String(v).replace(/[\s\0]+/g, "")))
        continue;
      attrs[k] = v;
    }
    out.push({ type: n.type, attributes: attrs, children: sanitize(n.children) });
  }
  return out;
}
function vnodesOf(safe) {
  if (!isSafe(safe))
    throw new TypeError("graph-explorer: renderers must return html`...` (SafeHtml); plain strings are rejected");
  return sanitize(parseVNodes(safe.html));
}
function vnodesBatch(list) {
  if (!list.length)
    return [];
  let src = "";
  list.forEach((s, k) => {
    if (!isSafe(s))
      throw new TypeError("graph-explorer: renderers must return html`...` (SafeHtml)");
    src += '<div data-job="' + k + '">' + s.html + "</div>";
  });
  const parsed = parseVNodes(src).filter((n) => n && typeof n === "object");
  return parsed.map((w) => sanitize(w.children));
}
var morph2 = (el, content) => morphRuntime.morph(el, Array.isArray(content) ? content : vnodesOf(content));
var ISLAND = "data-graph-explorer-island";
var SLOT = "data-graph-explorer-slot";
function island(key, content) {
  return html`<div class="graph-explorer-island" ${ISLAND}="${key}">${content}</div>`;
}
function morphKeeping(el, content, mounts) {
  const want = new Map;
  const slots = (list) => list.map((n) => {
    if (!n || typeof n !== "object" || !n.attributes)
      return n;
    const key = n.attributes[ISLAND];
    if (key != null) {
      want.set(String(key), n);
      return { type: "div", attributes: { [SLOT]: String(key) }, children: [] };
    }
    return { ...n, children: slots(n.children || []) };
  });
  const tree = slots(vnodesOf(content));
  const kept = new Map;
  for (const isl of dfDollar10(el).find(`[${ISLAND}]`).toArray()) {
    const key = isl.getAttribute(ISLAND) ?? "";
    if (kept.has(key))
      continue;
    kept.set(key, isl);
    dfDollar10(isl).replaceWith(dfDollar10(`<div ${SLOT}="${esc3(key)}"></div>`).get(0));
  }
  const drop = (isl) => {
    try {
      isl?._islandCleanup?.();
    } catch (err) {
      console.error("[graph-explorer] an island cleanup failed", err);
    }
    if (isl)
      isl._islandCleanup = null;
  };
  morphRuntime.morph(el, tree);
  for (const slot of dfDollar10(el).find(`[${SLOT}]`).toArray()) {
    const key = slot.getAttribute(SLOT) ?? "", vnode = want.get(key), sig = JSON.stringify(vnode ?? null);
    let node = kept.get(key);
    let made = false;
    if (!node || node._islandSig !== sig) {
      drop(node);
      const box = document.createElement("div");
      morphRuntime.morph(box, vnode ? [vnode] : []);
      node = box.firstElementChild;
      if (!node) {
        kept.delete(key);
        dfDollar10(slot).remove();
        continue;
      }
      node._islandSig = sig;
      made = true;
    }
    kept.delete(key);
    dfDollar10(slot).replaceWith(node);
    const mount = made ? mounts?.get(key) : undefined;
    if (mount)
      try {
        const cleanup = mount(node);
        if (typeof cleanup === "function")
          node._islandCleanup = cleanup;
      } catch (err) {
        console.error("[graph-explorer] an island mount failed", err);
      }
  }
  for (const isl of kept.values())
    drop(isl);
}
function dropIslands(el) {
  for (const isl of dfDollar10(el).find(`[${ISLAND}]`).toArray()) {
    try {
      isl._islandCleanup?.();
    } catch (err) {
      console.error("[graph-explorer] an island cleanup failed", err);
    }
    isl._islandCleanup = null;
  }
}
var ICON_NAME = /^[a-z0-9][a-z0-9-]{0,40}$/;
function icon(name, opts = {}) {
  const n = ICON_NAME.test(String(name)) ? String(name) : "circle";
  const label = opts.label ? html` role="img" aria-label="${opts.label}"` : html` aria-hidden="true"`;
  const tone = opts.tone && TONES.includes(opts.tone) ? html` data-tone="${opts.tone}"` : "";
  const size = opts.size ? html` data-size="${opts.size}"` : "";
  const type = opts.type != null ? html` data-type="${opts.type}"` : "";
  return html`<i
    class="graph-explorer-icon${opts.cls ? " " + opts.cls : ""}"
    data-icon="${n}"
    ${label}${tone}${size}${type}
  ></i>`;
}
var iconSheet = null;
function registerIcon(name, svg) {
  if (!ICON_NAME.test(name))
    throw new TypeError('graph-explorer: icon names are lowercase words joined by "-"');
  if (/<\s*(script|foreignObject|image|use|style)\b|\bon\w+\s*=|href\s*=/i.test(svg))
    throw new TypeError("graph-explorer: icon markup may only hold shapes");
  const doc = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'>${String(svg).replace(/"/g, "'")}</svg>`;
  if (!iconSheet) {
    iconSheet = dfDollar10("<style data-graph-explorer-icons></style>").get(0);
    dfDollar10(document.head).append(iconSheet);
  }
  iconSheet.append(`.graph-explorer-icon[data-icon="${name}"]{--graph-explorer-icon:url("data:image/svg+xml,${encodeURIComponent(doc)}")}
`);
}
var TYPE_ICON = {
  Domain: "boxes",
  API: "plug-zap",
  Worker: "cog",
  Store: "layers",
  Stream: "waves",
  Dataset: "database",
  Endpoint: "plug",
  Document: "file-text",
  Person: "user",
  Job: "timer",
  Topic: "radio"
};
var typeIcon = (n, opts = {}) => icon(TYPE_ICON[n.typeName] || "circle", { cls: "graph-explorer-type-icon", type: n.type, ...opts });
var EDGE_ICON = { calls: "zap", reads: "eye", owns: "key-round" };
var globalRegistry = {
  node: [],
  edge: [],
  detail: [],
  update: []
};
var DEFAULT_LABEL = {
  levels: { icon: 36, label: 110, full: 220 },
  sizes: { icon: [20, 20], label: [104, 22], full: [196, 24] },
  depths: null,
  budget: null
};
var LABEL_TIERS = ["icon", "label", "full"];
var LABEL_BUDGET = { icon: 160, label: 48, full: 16 };
var pluginOrder = 0;
function registryOf(scope) {
  if (scope === "global" || scope == null)
    return globalRegistry;
  const inst = resolveTarget(scope)?._graphExplorer;
  if (!inst)
    throw new Error('graph-explorer: register(scope) takes "global" or an initialized .graph-explorer element');
  return inst.registry;
}
function register(scope, plugin) {
  const kinds = ["node", "edge", "detail", "update"];
  if (!plugin || !kinds.includes(plugin.kind))
    throw new TypeError("graph-explorer: plugin.kind must be node, edge, detail or update");
  if (plugin.kind === "update" && typeof plugin.update?.render !== "function")
    throw new TypeError("graph-explorer: update plugins need update.render");
  if (plugin.kind === "node" && (typeof plugin.match !== "function" || typeof plugin.render !== "function" || !plugin.sizes))
    throw new TypeError("graph-explorer: node plugins need match, sizes and render");
  if (plugin.kind === "edge" && !Array.isArray(plugin.rules) && !plugin.label && !plugin.detail)
    throw new TypeError("graph-explorer: edge plugins need rules (plain data), a label renderer or a detail renderer");
  if (plugin.kind === "edge" && plugin.detail && typeof plugin.detail.render !== "function")
    throw new TypeError("graph-explorer: an edge detail renderer needs render");
  if (plugin.kind === "edge" && plugin.label && (typeof plugin.label.render !== "function" || typeof plugin.label.match !== "function"))
    throw new TypeError("graph-explorer: edge label renderers need match and render");
  if (plugin.layer != null && !/^[a-z0-9-]+$/.test(plugin.layer))
    throw new TypeError("graph-explorer: a layer is a lowercase word");
  if (plugin.kind === "node" && plugin.layer === "nodes")
    throw new TypeError("graph-explorer: a renderer of the nodes layer has no layer - it draws the node itself");
  if (plugin.kind === "detail" && (typeof plugin.match !== "function" || typeof plugin.render !== "function"))
    throw new TypeError("graph-explorer: detail plugins need match and render");
  if (plugin.kind === "edge")
    JSON.stringify(plugin.rules || []);
  const entry = { rules: [], ...plugin, _order: pluginOrder++, _scoped: scope !== "global" && scope != null };
  if (entry.label)
    entry.label = {
      ...DEFAULT_LABEL,
      ...entry.label,
      levels: { ...DEFAULT_LABEL.levels, ...entry.label.levels },
      sizes: { ...DEFAULT_LABEL.sizes, ...entry.label.sizes }
    };
  const reg = registryOf(scope);
  reg[plugin.kind].push(entry);
  pluginsChanged();
  return () => {
    const i = reg[plugin.kind].indexOf(entry);
    if (i >= 0)
      reg[plugin.kind].splice(i, 1);
    pluginsChanged();
  };
}
function pluginsChanged() {
  for (const inst of live2)
    inst.onPluginsChanged();
}
var drawR = (isCluster, rs) => isCluster ? Math.max(1.6, rs) : Math.min(6, Math.max(2.5, rs * 0.18));
function anchorBox(isCluster, tier, sx, sy, rs, bw, bh) {
  if (isCluster && tier === 2)
    return [sx - bw / 2, Math.max(sy - rs * 0.86 + 6, sy - rs + 4)];
  return [sx - bw / 2, sy - bh / 2];
}
function edgePath(ax, ay, ar, bx, by, br, st, bidir, w) {
  const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
  if (len < ar + br + 2)
    return null;
  const ux = dx / len, uy = dy / len, head = st.arrow === "none" ? 0 : 3.5 + w * 1.4;
  const f = (n) => n.toFixed(1);
  const tri = (x, y, vx, vy, s) => {
    const bx2 = x - vx * s, by2 = y - vy * s, px = -vy * s * 0.55, py = vx * s * 0.55;
    return `M${f(x + vx * s * 0.6)} ${f(y + vy * s * 0.6)}L${f(bx2 + px)} ${f(by2 + py)}L${f(bx2 - px)} ${f(by2 - py)}Z`;
  };
  if (st.route === "around") {
    const cx = (ax + bx) / 2 - uy * len * 0.22, cy = (ay + by) / 2 + ux * len * 0.22;
    const s0x = cx - ax, s0y = cy - ay, s0 = Math.hypot(s0x, s0y) || 1, e0x = cx - bx, e0y = cy - by, e0 = Math.hypot(e0x, e0y) || 1;
    const p0x = ax + s0x / s0 * ar, p0y = ay + s0y / s0 * ar, p2x = bx + e0x / e0 * (br + head * 0.6), p2y = by + e0y / e0 * (br + head * 0.6);
    const at = (t) => {
      const mt = 1 - t;
      return [mt * mt * p0x + 2 * mt * t * cx + t * t * p2x, mt * mt * p0y + 2 * mt * t * cy + t * t * p2y];
    };
    const poly = (t0, t1) => {
      let s = "";
      for (let k = 0;k <= 10; k++) {
        const p = at(t0 + (t1 - t0) * k / 10);
        s += (k ? "L" : "M") + f(p[0]) + " " + f(p[1]);
      }
      return s;
    };
    const d = st.gap && len > 40 ? poly(0, 0.44) + poly(0.56, 1) : poly(0, 1);
    const hx = p2x - cx, hy = p2y - cy, hl = Math.hypot(hx, hy) || 1;
    return { d, head: head ? tri(p2x, p2y, hx / hl, hy / hl, head) : "", mid: at(0.5) };
  }
  const off = bidir && head ? head * 0.6 : 0;
  const p0x = ax + ux * (ar + off), p0y = ay + uy * (ar + off), p2x = bx - ux * (br + head * 0.6), p2y = by - uy * (br + head * 0.6);
  const mx = (p0x + p2x) / 2, my = (p0y + p2y) / 2;
  const d = st.gap && len > 40 ? `M${f(p0x)} ${f(p0y)}L${f(mx - ux * 6)} ${f(my - uy * 6)}M${f(mx + ux * 6)} ${f(my + uy * 6)}L${f(p2x)} ${f(p2y)}` : `M${f(p0x)} ${f(p0y)}L${f(p2x)} ${f(p2y)}`;
  let h = head ? tri(p2x, p2y, ux, uy, head) : "";
  if (head && bidir)
    h += tri(p0x, p0y, -ux, -uy, head);
  return { d, head: h, mid: [mx, my] };
}
function zoomPath(p0, p1) {
  const rho = Math.SQRT2, rho2 = 2, rho4 = 4;
  const [ux0, uy0, w0] = p0, [ux1, uy1, w1] = p1, dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy;
  let S, at;
  if (d2 < 0.000000000001) {
    S = Math.log(w1 / w0) / rho;
    at = (t) => [ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(rho * t * S)];
  } else {
    const d1 = Math.sqrt(d2);
    const b0 = (w1 * w1 - w0 * w0 + rho4 * d2) / (2 * w0 * rho2 * d1), b1 = (w1 * w1 - w0 * w0 - rho4 * d2) / (2 * w1 * rho2 * d1);
    const r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1);
    S = (r1 - r0) / rho;
    at = (t) => {
      const s = t * S, c0 = Math.cosh(r0), u = w0 / (rho2 * d1) * (c0 * Math.tanh(rho * s + r0) - Math.sinh(r0));
      return [ux0 + u * dx, uy0 + u * dy, w0 * c0 / Math.cosh(rho * s + r0)];
    };
  }
  return { at, ms: clamp3(Math.abs(S) * 1000 * 0.3, 160, 460) };
}
var ease = (t) => t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
var STATE_LABEL = { closed: "closed", "half-open": "half-open", open: "open", cut: "cut" };
var expandBtn = (c, label) => !c.expandable ? "" : c.html`<button type="button" class="btn graph-explorer-card-expand" data-variant="ghost" data-size="icon-sm" data-graph-explorer-action="${c.action("expand")}" aria-label="Expand ${label}" title="Expand (E)">${c.icon("expand")}</button>`;
var cycleMark = (c, n) => smallCycle(n) ? c.html`<span class="graph-explorer-cycle" title="In a cycle of ${n.scc}">${c.icon("repeat-2", { size: "xs" })}</span>` : "";
var health = (n) => {
  const b = n.breakers || { open: 0, half: 0, cut: 0, total: 0 };
  const total = Math.max(1, b.total || 0), bad = b.open + b.half + b.cut;
  const tone = b.open / total >= 0.1 ? "danger" : bad / total >= 0.1 ? "warn" : "ok";
  return { ...b, total, closed: Math.max(0, total - bad), bad, tone };
};
var healthBar = (c, h) => c.html`<span class="graph-explorer-health" role="img" aria-label="${h.open} open, ${h.half} half-open, ${h.cut} cut of ${h.total} links"><span data-tone="danger" style="flex:${h.open}"></span><span data-tone="warn" style="flex:${h.half}"></span><span data-tone="ink" style="flex:${h.cut}"></span><span data-tone="ok" style="flex:${h.closed}"></span></span>`;
var breakerKey = (n) => n.breakers ? `${n.breakers.open}/${n.breakers.half}/${n.breakers.cut}` : "";
var freshness = (n) => {
  const f = n.attrs?.freshness ?? 0;
  return { f, tone: f > 24 ? "danger" : f > 12 ? "warn" : "ok" };
};
register("global", {
  kind: "node",
  name: "builtin-cluster",
  match: (n) => n.kind === "cluster" ? 0 : false,
  sizes: { chip: [132, 28], card: [236, 74] },
  render: (n, c) => {
    if (c.tier === "chip")
      return c.html`<span class="graph-explorer-chip" data-kind="cluster">${typeIcon(n)}<span class="graph-explorer-label">${n.label}</span>${c.parts}</span>`;
    return c.html`<article class="graph-explorer-card" data-kind="cluster">
        <header class="graph-explorer-card-head">${typeIcon(n)}<strong class="graph-explorer-label">${n.label}</strong>${expandBtn(c, n.label)}</header>
        ${c.parts}
        <footer class="graph-explorer-card-actions"><button type="button" class="btn graph-explorer-card-enter" data-variant="outline" data-size="xs" data-graph-explorer-action="${c.action("enter")}" title="Zoom into ${n.label}: its ${fmt(n.children)} children (Enter)">Zoom in ⏎</button></footer>
      </article>`;
  }
});
register("global", {
  kind: "node",
  name: "builtin-entity",
  match: (n) => n.kind === "entity" ? 0 : false,
  sizes: { chip: [128, 26], card: [220, 42] },
  render: (n, c) => {
    if (c.tier === "chip")
      return c.html`<span class="graph-explorer-chip" data-kind="entity">${typeIcon(n)}<span class="graph-explorer-label">${n.label}</span>${c.parts}</span>`;
    return c.html`<article class="graph-explorer-card" data-kind="entity">
        <header class="graph-explorer-card-head">${typeIcon(n)}<strong class="graph-explorer-label">${n.label}</strong>${expandBtn(c, n.label)}</header>
        ${c.parts}
      </article>`;
  }
});
register("global", {
  kind: "node",
  name: "builtin-relations",
  layer: "relations",
  match: () => 0,
  sizes: (n) => smallCycle(n) ? { chip: [22, 0], card: [0, 29] } : { card: [0, 29] },
  render: (n, c) => {
    if (c.tier === "chip")
      return c.html`${cycleMark(c, n)}`;
    return n.kind === "cluster" ? c.html`<p class="graph-explorer-card-meta">${cycleMark(c, n)}${fmt(n.degree)} links${smallCycle(n) ? c.html` · in a cycle of ${n.scc}` : ""}</p>` : c.html`<p class="graph-explorer-card-meta">${n.attrs?.out} out · ${n.attrs?.in} in</p>`;
  }
});
register("global", {
  kind: "node",
  name: "builtin-labels",
  layer: "labels",
  match: () => 0,
  sizes: { chip: [56, 0], card: [0, 29] },
  render: (n, c) => {
    if (c.tier === "chip")
      return c.html`<span class="graph-explorer-count">${n.kind === "cluster" ? fmt(n.members) : n.typeName}</span>`;
    return n.kind === "cluster" ? c.html`<p class="graph-explorer-card-meta">${n.typeName} · ${fmt(n.children)} children · ${fmt(n.members)} nodes</p>` : c.html`<p class="graph-explorer-card-meta">${n.typeName} · #${n.id.slice(1)}</p>`;
  }
});
register("global", {
  kind: "node",
  name: "builtin-health",
  layer: "health",
  match: () => 0,
  sizes: (n) => ({ chip: [52, 0], card: [0, n.kind === "cluster" ? 41 : 29] }),
  key: breakerKey,
  render: (n, c) => {
    if (n.kind === "cluster") {
      const h = health(n);
      if (c.tier === "chip")
        return c.html`<span data-health="${h.tone}">${healthBar(c, h)}</span>`;
      return c.html`<div data-health="${h.tone}">${healthBar(c, h)}<p class="graph-explorer-card-meta">${h.bad ? `${h.open} open · ${h.half} half-open · ${h.cut} cut` : "all links closed"} · of ${fmt(h.total)}</p></div>`;
    }
    const { f, tone } = freshness(n);
    if (c.tier === "chip")
      return c.html`<span class="graph-explorer-pill" data-tone="${tone}">${f} h</span>`;
    return c.html`<p class="graph-explorer-meter-row" data-health="${tone}"><span>Freshness</span><span class="graph-explorer-meter" data-tone="${tone}"><span style="width:${Math.min(100, Math.round(f / 48 * 100))}%"></span></span><span>${f} h</span></p>`;
  }
});
register("global", {
  kind: "edge",
  name: "builtin-edges",
  rules: [
    {
      when: [
        { field: "kind", equals: "leaf" },
        { field: "type", equals: "calls" }
      ],
      style: { tone: "muted", width: 1, arrow: "end" },
      priority: -10
    },
    {
      when: [
        { field: "kind", equals: "leaf" },
        { field: "type", equals: "reads" }
      ],
      style: { tone: "link", width: 1, arrow: "end", dash: [3, 3] },
      priority: -10
    },
    {
      when: [
        { field: "kind", equals: "leaf" },
        { field: "type", equals: "owns" }
      ],
      style: { tone: "ink", width: 1, arrow: "end" },
      priority: -10
    },
    { when: [{ field: "kind", equals: "agg" }], style: { tone: "muted", width: 1.25, arrow: "end" }, priority: -10 }
  ],
  label: {
    levels: { icon: 64, label: 150, full: 260 },
    budget: { icon: 40, label: 20, full: 8 },
    match: () => 0,
    priority: (e) => Math.log10(1 + e.count + e.count2),
    render: (e, c) => {
      if (e.kind === "leaf") {
        const ic = c.icon(EDGE_ICON[e.type] || "link", { tone: e.style?.tone });
        if (c.tier === "icon")
          return c.html`<span class="graph-explorer-edge-icon" title="${e.type}">${ic}</span>`;
        return c.html`<span class="graph-explorer-edge-pill">${ic}<span>${e.type}</span>${c.tier === "full" && e.bidir ? c.html`<span class="graph-explorer-muted">↔</span>` : ""}${c.tier === "full" && e.back ? c.icon("repeat-2", { size: "xs" }) : ""}</span>`;
      }
      const n = e.count + e.count2;
      if (c.tier === "icon")
        return c.html`<span class="graph-explorer-edge-count" title="${fmt(n)} links">${n > 999 ? Math.round(n / 1000) + "k" : n}</span>`;
      return c.html`<span class="graph-explorer-edge-pill">${c.icon("link-2")}<span>${fmt(n)} links</span>${c.tier === "full" && e.count2 ? c.html`<span class="graph-explorer-muted">${fmt(e.count)} → · ← ${fmt(e.count2)}</span>` : ""}</span>`;
    }
  }
});
var BREAKER_ICON = {
  open: "zap-off",
  "half-open": "circle-dashed",
  cut: "scissors",
  closed: "shield-check"
};
var BREAKER_TONE = { open: "danger", "half-open": "warn", cut: "ink", closed: "ok" };
var verdict = (b) => !b ? null : b.aggregate ? b.openShare >= 0.3 ? "critical" : b.badShare >= 0.15 ? "degraded" : null : b.state !== "closed" ? b.state : null;
var AGG = { field: "breaker.aggregate", equals: true };
register("global", {
  kind: "edge",
  name: "circuit-breaker",
  layer: "health",
  rules: [
    { when: [{ field: "breaker.state", equals: "closed" }], style: { tone: "muted", width: 1.25, arrow: "end" } },
    {
      when: [
        { field: "breaker.state", equals: "closed" },
        { field: "traffic", equals: true }
      ],
      priority: 2,
      style: { tone: "muted", width: 1.25, arrow: "end", flow: 1 }
    },
    {
      when: [{ field: "breaker.state", equals: "half-open" }],
      style: { tone: "warn", width: 1.5, arrow: "end", dash: [4, 4], pulse: true }
    },
    {
      when: [{ field: "breaker.state", equals: "open" }],
      style: { tone: "danger", width: 2, arrow: "end", gap: true }
    },
    { when: [{ field: "breaker.state", equals: "cut" }], style: { tone: "ink", width: 1.5, arrow: "none", gap: true } },
    { when: [AGG], priority: 10, style: { tone: "muted", width: 1.25, arrow: "end", flow: 1 } },
    {
      when: [AGG, { field: "breaker.badShare", gte: 0.15 }],
      priority: 11,
      style: { tone: "warn", width: 1.5, arrow: "end", dash: [5, 3] }
    },
    {
      when: [AGG, { field: "breaker.openShare", gte: 0.3 }],
      priority: 12,
      style: { tone: "danger", width: 2, arrow: "end", gap: true }
    }
  ],
  label: {
    levels: { icon: 30, label: 110, full: 200 },
    sizes: { icon: [22, 22], label: [118, 22], full: [210, 24] },
    match: (e) => verdict(e.breaker) ? 10 : false,
    priority: (e) => {
      const b = e.breaker;
      return b.aggregate ? 20 + b.openShare * 30 + b.badShare * 10 : { open: 30, cut: 25, "half-open": 22 }[b.state] || 0;
    },
    render: (e, c) => {
      const b = e.breaker, v = verdict(b);
      if (b.aggregate) {
        const tone = v === "critical" ? "danger" : "warn";
        const ic = c.icon("triangle-alert", { tone, label: v ?? "" });
        if (c.tier === "icon")
          return c.html`<span class="graph-explorer-edge-icon" data-tone="${tone}" title="${b.open + b.half + b.cut}/${b.members} breakers not closed">${ic}</span>`;
        const text = v === "critical" ? `${b.open}/${b.members} open` : `${b.open + b.half + b.cut}/${b.members} degraded`;
        return c.html`<span class="graph-explorer-edge-badge" data-tone="${tone}">${ic}<span>${text}</span>${c.tier === "full" ? c.html`<span class="graph-explorer-edge-sub">${b.half} half-open · ${b.cut} cut</span>` : ""}</span>`;
      }
      const tone = BREAKER_TONE[b.state], ic = c.icon(BREAKER_ICON[b.state], { tone, label: b.state });
      if (c.tier === "icon")
        return c.html`<span class="graph-explorer-edge-icon" data-tone="${tone}" title="breaker ${b.state}">${ic}</span>`;
      if (c.tier === "label")
        return c.html`<span class="graph-explorer-edge-badge" data-tone="${tone}">${ic}<span>${b.state}</span></span>`;
      const more = b.state === "half-open" ? `probing ${b.probesOk}/${b.probes}` : b.state === "open" ? `${b.trips} trips · ${b.since} min` : `cut by ${b.by}`;
      return c.html`<span class="graph-explorer-edge-badge" data-tone="${tone}">${ic}<span>${b.state}</span><span class="graph-explorer-edge-sub">${more}</span></span>`;
    }
  }
});
var stateBadge = (c, state) => c.html`<span class="badge graph-explorer-state" data-variant="${state === "closed" ? "secondary" : "outline"}" data-state="${state}">${c.icon(BREAKER_ICON[state] || "circle", { size: "xs" })}${STATE_LABEL[state] ?? state}</span>`;
var trail = (c, path, last = false) => c.html`<nav class="graph-explorer-trail" aria-label="Path">${(last ? path : path.slice(0, -1)).map((p, k) => c.html`${k ? c.html`<span class="graph-explorer-trail-sep" aria-hidden="true">›</span>` : ""}${p.id === "c0" ? c.html`<span>${p.label}</span>` : c.html`<button type="button" class="graph-explorer-link" data-graph-explorer-goto="${p.id}">${p.label}</button>`}`)}</nav>`;
var stats2 = (c, rows) => c.html`<dl class="graph-explorer-stats">${rows.map(([k, v, tone]) => c.html`<div class="graph-explorer-stat"${tone ? c.html` data-tone="${tone}"` : ""}><dt>${k}</dt><dd>${v}</dd></div>`)}</dl>`;
var section = (c, title, body, count) => c.html`<section class="graph-explorer-section"><h4 class="graph-explorer-section-title"><span>${title}</span>${count != null ? c.html`<span class="graph-explorer-section-count">${count}</span>` : ""}</h4>${body}</section>`;
var pageCard = (c, title, body, opts = {}) => c.html`<section class="card graph-explorer-page-card" data-size="sm"${opts.wide ? c.html` data-wide` : ""}><header class="card-header"><h3 class="card-title">${opts.icon ? c.icon(opts.icon, { size: "sm" }) : ""}${title}</h3>${opts.note ? c.html`<p class="card-description">${opts.note}</p>` : ""}</header><div class="card-content">${body}</div></section>`;
var kpi = (c, title, value, note, tone) => c.html`<div class="statistic graph-explorer-kpi"${tone ? c.html` data-tone="${tone}"` : ""}><p class="statistic-title">${title}</p><p class="statistic-value">${value}</p>${note != null ? c.html`<p class="statistic-description">${note}</p>` : ""}</div>`;
var shareBar = (c, part, whole, tone = "accent") => {
  const pct = whole > 0 ? Math.max(1, Math.round(part / whole * 100)) : 0;
  return c.html`<span class="graph-explorer-bar" data-tone="${tone}" role="img" aria-label="${pct} %"><span style="inline-size:${pct}%"></span></span>`;
};
var row = (c, r) => c.html`<li class="graph-explorer-row"><button type="button" class="graph-explorer-row-main" data-graph-explorer-goto="${r.id}">${r.icon ?? ""}<span class="graph-explorer-row-name">${r.label}</span>${r.meta != null ? c.html`<span class="graph-explorer-row-meta">${r.meta}</span>` : ""}</button>${r.bar ?? ""}${r.badge ?? ""}${r.edge ? c.html`<button type="button" class="graph-explorer-row-link" data-graph-explorer-edge="${r.edge}" title="Inspect the link" aria-label="Inspect the link to ${r.label}">${c.icon("link-2", { size: "sm" })}</button>` : ""}</li>`;
var rows = (c, list, more = 0) => c.html`<ul class="graph-explorer-rows">${list}</ul>${more > 0 ? c.html`<p class="graph-explorer-more">${fmt(more)} more in Relations</p>` : ""}`;
var detailHead = (c, tile, kicker, path) => c.html`<header class="graph-explorer-detail-head"><span class="graph-explorer-detail-tile">${tile}</span><div class="graph-explorer-detail-titles"><p class="graph-explorer-detail-kicker">${kicker}</p>${path}</div></header>`;
var pageHead = (c, tile, title, kicker, path, actions) => c.html`<header class="graph-explorer-page-head"><span class="graph-explorer-detail-tile" data-size="xl">${tile}</span><div class="graph-explorer-page-titles">${path}<h2 class="graph-explorer-page-title">${title}</h2><p class="graph-explorer-detail-kicker">${kicker}</p></div>${actions}</header>`;
var pageToggle = (c) => !c.expanded && !c.expandable ? "" : c.expanded ? c.html`<button type="button" class="btn" data-variant="outline" data-size="sm" data-graph-explorer-action="${c.action("collapse")}">${c.icon("shrink")} Back to graph</button>` : c.html`<button type="button" class="btn" data-variant="ghost" data-size="sm" data-graph-explorer-action="${c.action("expand")}" title="Expand (E)">${c.icon("expand")} Expand</button>`;
function relationsTable(c, item, d, tier = "label", limit = 60) {
  const rows = item.kind === "cluster" ? (d.relations ?? []).slice(0, limit).map((r) => ({
    id: r.id,
    label: r.label,
    where: "",
    out: r.out,
    in: r.in,
    link: item.id + ">" + r.id,
    edge: {
      kind: "agg",
      type: "calls",
      count: r.out || 0,
      count2: r.in || 0,
      bidir: !!(r.out && r.in),
      back: !!r.back,
      breaker: r.breaker || null,
      style: { tone: "muted" }
    }
  })) : (d.out ?? []).slice(0, limit).map((r) => ({
    id: r.id,
    label: r.label,
    where: r.same ? "" : r.system,
    out: 1,
    in: 0,
    link: r.same ? item.id + ">" + r.id : null,
    edge: {
      kind: "leaf",
      type: r.edge,
      count: 1,
      count2: 0,
      bidir: false,
      back: false,
      breaker: null,
      style: { tone: r.edge === "reads" ? "link" : r.edge === "owns" ? "ink" : "muted" }
    }
  }));
  if (!rows.length)
    return c.html`<p class="graph-explorer-muted graph-explorer-pad">No relations.</p>`;
  return c.html`<div class="table-container"><table class="table graph-explorer-rel-table"><thead><tr class="table-row">
      <th class="table-head" scope="col">Link</th><th class="table-head" scope="col">${item.kind === "cluster" ? "Cluster" : "Target"}</th>
      <th class="table-head" scope="col" style="text-align:right">Out</th><th class="table-head" scope="col" style="text-align:right">In</th></tr></thead>
    <tbody>${rows.map((r) => c.html`<tr class="table-row" data-graph-explorer-goto="${r.id}">
      <td class="table-cell graph-explorer-rel-edge">${r.link ? c.html`<button type="button" class="graph-explorer-edge-btn" data-graph-explorer-edge="${r.link}" title="Inspect the link">${c.edgeLabel(r.edge, tier)}</button>` : c.edgeLabel(r.edge, tier)}</td>
      <td class="table-cell"><button type="button" class="graph-explorer-link" data-graph-explorer-goto="${r.id}">${r.label}</button>${r.where ? c.html`<span class="graph-explorer-muted"> · ${r.where}</span>` : ""}</td>
      <td class="table-cell" style="text-align:right">${r.out ? fmt(r.out) : ""}</td><td class="table-cell" style="text-align:right">${r.in ? fmt(r.in) : ""}</td></tr>`)}</tbody></table></div>`;
}
function linksTable(c, d) {
  if (!d.samples.length)
    return c.html`<p class="graph-explorer-muted graph-explorer-pad">No single links.</p>`;
  return c.html`<div class="table-container"><table class="table graph-explorer-rel-table"><thead><tr class="table-row">
      <th class="table-head" scope="col">From</th><th class="table-head" scope="col">Relation</th><th class="table-head" scope="col">To</th><th class="table-head" scope="col">Systems</th></tr></thead>
    <tbody>${d.samples.map((x) => c.html`<tr class="table-row"><td class="table-cell"><button type="button" class="graph-explorer-link" data-graph-explorer-goto="${x.from.id}">${x.from.label}</button></td>
      <td class="table-cell"><span class="graph-explorer-rel-type">${c.icon(EDGE_ICON[x.type] || "link", { size: "xs" })}${x.type}${x.back ? c.html` <span class="graph-explorer-muted">back</span>` : ""}</span></td>
      <td class="table-cell"><button type="button" class="graph-explorer-link" data-graph-explorer-goto="${x.to.id}">${x.to.label}</button></td>
      <td class="table-cell graph-explorer-muted">${x.from.system === x.to.system ? x.from.system : `${x.from.system} → ${x.to.system}`}</td></tr>`)}</tbody></table></div>`;
}
function childrenTable(c, kids, limit = 40) {
  const cluster = kids[0]?.kind === "cluster";
  const value = (k) => cluster ? k.members : k.degree;
  const list = [...kids].sort((a, b) => value(b) - value(a)).slice(0, limit);
  const max = Math.max(1, ...list.map(value));
  return c.html`<div class="table-container"><table class="table graph-explorer-rel-table"><thead><tr class="table-row">
      <th class="table-head" scope="col">Name</th><th class="table-head" scope="col">Type</th>
      <th class="table-head" scope="col" style="text-align:right">${cluster ? "Nodes" : "Links"}</th><th class="table-head graph-explorer-bar-col" scope="col"><span class="sr-only">Share</span></th></tr></thead>
    <tbody>${list.map((k) => c.html`<tr class="table-row"><td class="table-cell"><button type="button" class="graph-explorer-link" data-graph-explorer-goto="${k.id}">${typeIcon(k, { size: "xs" })} ${k.label}</button></td>
      <td class="table-cell graph-explorer-muted">${k.typeName}</td><td class="table-cell" style="text-align:right">${fmt(value(k))}</td>
      <td class="table-cell graph-explorer-bar-col">${shareBar(c, value(k), max)}</td></tr>`)}</tbody></table></div>${kids.length > limit ? c.html`<p class="graph-explorer-more">the ${limit} largest of ${fmt(kids.length)}</p>` : ""}`;
}
var ENTITY_COLUMNS = [
  { field: "label", label: "Name", width: "14rem", filter: "text" },
  { field: "type", label: "Type", width: "8rem", filter: "select" },
  { field: "system", label: "System", width: "11rem", filter: "text" },
  { field: "owner", label: "Owner", width: "7rem", filter: "select" },
  { field: "out", label: "Out", width: "5rem", number: true, filter: "number" },
  { field: "in", label: "In", width: "5rem", number: true, filter: "number" },
  { field: "rows", label: "Rows (k)", width: "6.5rem", number: true, filter: "number" },
  { field: "freshness", label: "Age (h)", width: "6rem", number: true, filter: "number" }
];
var LINK_COLUMNS = [
  { field: "fromLabel", label: "From", width: "13rem", filter: "text" },
  { field: "relation", label: "Relation", width: "7rem", filter: "select" },
  { field: "toLabel", label: "To", width: "13rem", filter: "text" },
  { field: "direction", label: "Way", width: "6.5rem", filter: "select" },
  { field: "fromSystem", label: "From system", width: "11rem", filter: "text" },
  { field: "toSystem", label: "To system", width: "11rem", filter: "text" }
];
var ENTITY_SHARES = [
  { title: "By type", field: "type" },
  { title: "By owner", field: "owner" },
  { title: "Largest systems", field: "system", limit: 5 }
];
var LINK_SHARES = [
  { title: "By relation", field: "relation" },
  { title: "Way", field: "direction" },
  { title: "Busiest senders", field: "fromSystem", limit: 5 }
];
var gotoCell = (idField, labelField) => (el, record) => {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "graph-explorer-link";
  b.setAttribute("data-graph-explorer-goto", String(record[idField]));
  b.textContent = String(record[labelField]);
  el.append(b);
};
function rowsView(c, id, kind, label, fallback) {
  const grids = df$10.dataGrid;
  if (!grids?.source)
    return fallback();
  const cols = kind === "entities" ? ENTITY_COLUMNS : LINK_COLUMNS;
  const shares = kind === "entities" ? ENTITY_SHARES : LINK_SHARES;
  const noun = kind === "entities" ? "entities" : "links";
  const markup = c.html`<div class="graph-explorer-records">
    <p class="graph-explorer-records-count" aria-live="polite">Loading every row...</p>
    <div class="graph-explorer-records-shares"></div>
    <div class="data-grid graph-explorer-grid" aria-label="${label}" data-persist="none" data-empty-text="No row matches the filters." style="height: 24rem">
      <div class="data-grid-viewport"><div class="data-grid-head"><div class="data-grid-row">${cols.map((col) => c.html`<div class="data-grid-header" data-field="${col.field}" data-width="${col.width}"${col.number ? c.html` data-type="number"` : ""}${col.filter ? c.html` data-filter="${col.filter}"` : ""}>${col.label}</div>`)}</div></div><div class="data-grid-body"></div></div>
    </div></div>`;
  return c.island("rows:" + id, markup, (el) => {
    let alive = true, off = null;
    c.fetchRows(id).then((data) => {
      if (!alive)
        return;
      const grid = dfDollar10(el).find(".data-grid").get(0);
      const count = dfDollar10(el).find(".graph-explorer-records-count").get(0);
      const strip = dfDollar10(el).find(".graph-explorer-records-shares").get(0);
      grids.setSource(grid, data.rows, {
        cells: kind === "entities" ? { label: gotoCell("id", "label") } : { fromLabel: gotoCell("from", "fromLabel"), toLabel: gotoCell("to", "toLabel") }
      });
      const source = grids.source(grid);
      if (!source)
        return;
      let seen = "";
      const paint = () => {
        const filters = grid.store?.value?.config?.filters ?? [];
        const key = JSON.stringify(filters);
        if (key === seen)
          return;
        seen = key;
        const parts = shares.map((sh) => ({
          sh,
          r: source.aggregate({ filters }, {
            groupBy: sh.field,
            sort: { by: "count", direction: "desc" },
            ...sh.limit ? { limit: sh.limit, other: "the rest" } : {}
          })
        }));
        const matched = parts[0]?.r.matchedRows ?? source.rows.length;
        morph2(count, c.html`<strong>${fmt(matched)}</strong> of ${fmt(source.rows.length)} ${noun}${filters.length ? c.html` <span class="graph-explorer-muted">match the filters</span>` : ""}`);
        morph2(strip, c.html`${parts.map(({ sh, r }) => c.html`<section class="graph-explorer-records-share"><h4 class="graph-explorer-section-title"><span>${sh.title}</span></h4><ul class="graph-explorer-shares">${r.rows.map((g) => c.html`<li><span class="graph-explorer-share-name">${String(g[sh.field] ?? "-")}</span><span class="graph-explorer-share-value">${fmt(Number(g.count))}</span>${shareBar(c, Number(g.count), matched)}</li>`)}</ul></section>`)}`);
      };
      paint();
      off = grid.store?.subscribe(paint) ?? null;
    });
    return () => {
      alive = false;
      off?.();
    };
  });
}
function composition(c, kids, keyOf, weight) {
  const by = new Map;
  let total = 0;
  for (const k of kids) {
    const w = weight(k);
    by.set(keyOf(k), (by.get(keyOf(k)) || 0) + w);
    total += w;
  }
  const list = [...by.entries()].sort((a, b) => b[1] - a[1]);
  return c.html`<ul class="graph-explorer-shares">${list.map(([k, n]) => c.html`<li><span class="graph-explorer-share-name">${k}</span><span class="graph-explorer-share-value">${fmt(n)} · ${Math.round(n / Math.max(1, total) * 100)} %</span>${shareBar(c, n, total)}</li>`)}</ul>`;
}
var healthBlock = (c, h) => c.html`${healthBar(c, h)}<ul class="graph-explorer-legend"><li data-tone="danger">${fmt(h.open)} open</li><li data-tone="warn">${fmt(h.half)} half-open</li><li data-tone="ink">${fmt(h.cut)} cut</li><li data-tone="ok">${fmt(h.closed)} closed</li></ul>`;
var nodeActions = (c, item) => c.html`<div class="graph-explorer-detail-actions">${item.kind === "cluster" ? c.html`<button type="button" class="btn" data-variant="default" data-size="sm" data-graph-explorer-action="${c.action("enter")}" title="Zoom into ${item.label} and show its ${fmt(item.children)} children (Enter)">${c.icon("scan")} Zoom in</button>` : ""}${c.expanded ? "" : c.html`<button type="button" class="btn" data-variant="outline" data-size="sm" data-graph-explorer-action="${c.action("bring")}" title="Gather the busiest neighbours of ${item.label} around it and fly to the one you pick (B)">${c.icon("crosshair")} Jump to a neighbour</button>`}${pageToggle(c)}</div>`;
register("global", {
  kind: "detail",
  name: "builtin-detail",
  match: () => 0,
  title: (item) => item.label,
  render: (item, c) => {
    const d = c.request("details:" + item.id, () => c.fetchDetails(item.id));
    const cluster = item.kind === "cluster";
    const kicker = c.html`${item.typeName}${cluster ? c.html` · ${fmt(item.members)} nodes` : ""}${item.scc > 1 ? c.html` · <span class="graph-explorer-cycle-note">${c.icon("repeat-2", { size: "xs" })} cycle of ${item.scc}</span>` : ""}`;
    const tile = typeIcon(item, { size: c.expanded ? "xl" : "lg" });
    if (!d)
      return c.html`${detailHead(c, tile, kicker, "")}<p class="graph-explorer-muted">Loading details...</p>`;
    const h = health(item);
    const relations = d.relations ?? [];
    if (c.expanded) {
      const kids = c.request("view:" + item.id, () => cluster ? c.fetchView(item.id) : null);
      const head = pageHead(c, tile, item.label, kicker, trail(c, d.path), nodeActions(c, item));
      if (cluster) {
        const children = kids ? kids.children : [];
        const leaves = children.length > 0 && children[0].kind === "entity";
        const worst = relations.filter((r) => r.breaker && r.breaker.state !== "closed");
        return c.html`<div class="graph-explorer-page">${head}
          <section class="graph-explorer-kpis">
            ${kpi(c, "Nodes below", fmt(d.members ?? 0), `${fmt(d.children ?? 0)} children`)}
            ${kpi(c, "Relations", fmt(relations.length), "at this level")}
            ${kpi(c, "Links not closed", fmt(h.bad), `of ${fmt(h.total)} bundled`, h.bad ? h.tone : "ok")}
            ${kpi(c, "Cycle", item.scc > 1 ? `${item.scc} nodes` : "none", item.scc > 1 ? "reach each other" : "acyclic here")}
          </section>
          <div class="graph-explorer-page-grid">
            ${pageCard(c, leaves ? "Entity types" : "System kinds", kids ? composition(c, children, (k) => k.typeName, (k) => leaves ? 1 : k.members) : c.html`<p class="graph-explorer-muted">Loading...</p>`, { icon: "layers", note: leaves ? "entities by type" : "nodes below each kind" })}
            ${leaves && kids ? pageCard(c, "Owners", composition(c, children, (k) => k.attrs?.owner ?? "-", () => 1), { icon: "users", note: "who owns the entities" }) : pageCard(c, "Link health", c.html`${healthBlock(c, h)}${worst.length ? rows(c, worst.slice(0, 6).map((r) => row(c, {
          id: r.id,
          label: r.label,
          meta: `${fmt(r.out + r.in)} links`,
          badge: stateBadge(c, r.breaker.state),
          edge: item.id + ">" + r.id
        }))) : c.html`<p class="graph-explorer-muted">Every breaker is closed.</p>`}`, { icon: "shield-check", note: "the breakers its links bundle" })}
            ${leaves ? "" : pageCard(c, "Children", kids ? childrenTable(c, children) : c.html`<p class="graph-explorer-muted">Loading...</p>`, { wide: true, icon: "boxes", note: "pick one for its page" })}
            ${pageCard(c, "Every entity below", rowsView(c, item.id, "entities", `Every entity below ${item.label}`, () => kids ? childrenTable(c, children) : c.html`<p class="graph-explorer-muted">Loading...</p>`), { wide: true, icon: "database", note: "filter, sort, open one - the shares follow the filters" })}
            ${pageCard(c, "Relations at this level", relationsTable(c, item, d, "full"), {
          wide: true,
          icon: "link-2",
          note: "a name opens its page, a link its traffic"
        })}
          </div></div>`;
      }
      const a = item.attrs;
      const stale = (a?.freshness ?? 0) > 24;
      return c.html`<div class="graph-explorer-page">${head}
        <section class="graph-explorer-kpis">
          ${kpi(c, "Outgoing", fmt(d.outDeg ?? 0), "links it starts")}
          ${kpi(c, "Incoming", fmt(d.inDeg ?? 0), "links to it")}
          ${kpi(c, "Rows", fmt(a?.rows ?? 0) + "k")}
          ${kpi(c, "Freshness", `${a?.freshness ?? 0} h`, stale ? "stale" : "fresh", stale ? "warn" : "ok")}
        </section>
        <div class="graph-explorer-page-grid">
          ${pageCard(c, "Attributes", stats2(c, [
        ["Type", item.typeName],
        ["Owner", a?.owner ?? "-"],
        ["System", d.path.at(-2)?.label ?? "-"],
        ["Domain", d.path.at(-3)?.label ?? "-"],
        ["Id", item.id]
      ]), { icon: "info" })}
          ${pageCard(c, "Incoming", (d.in ?? []).length ? rows(c, (d.in ?? []).map((r) => row(c, {
        id: r.id,
        label: r.label,
        icon: c.icon(EDGE_ICON[r.edge] || "link", { size: "xs" }),
        meta: `${r.edge} · ${r.same ? "this system" : r.system}`,
        edge: r.same ? r.id + ">" + item.id : null
      }))) : c.html`<p class="graph-explorer-muted">Nothing links here.</p>`, { icon: "arrow-left", note: `${fmt(d.inDeg ?? 0)} in all` })}
          ${pageCard(c, "Outgoing", relationsTable(c, item, d, "full"), { wide: true, icon: "arrow-right", note: "a name opens its page, a link its details" })}
        </div></div>`;
    }
    const head = detailHead(c, tile, kicker, trail(c, d.path));
    if (cluster)
      return c.html`${head}${nodeActions(c, item)}
        ${stats2(c, [
        ["Nodes below", fmt(d.members ?? 0)],
        ["Children", fmt(d.children ?? 0)],
        ["Relations", fmt(relations.length)],
        ["Not closed", h.bad ? `${fmt(h.bad)} of ${fmt(h.total)}` : "none", h.bad ? h.tone : "ok"]
      ])}
        ${item.breakers && h.total > 1 ? section(c, "Link health", healthBlock(c, h)) : ""}
        ${section(c, "Relations", relations.length ? rows(c, relations.slice(0, 12).map((r) => row(c, {
        id: r.id,
        label: r.label,
        meta: c.html`${r.out ? c.html`<span>→ ${fmt(r.out)}</span>` : ""}${r.in ? c.html`<span>← ${fmt(r.in)}</span>` : ""}`,
        badge: r.breaker && r.breaker.state !== "closed" ? stateBadge(c, r.breaker.state) : "",
        edge: item.id + ">" + r.id
      })), relations.length - 12) : c.html`<p class="graph-explorer-muted">No relations at this level.</p>`, relations.length)}`;
    const a = item.attrs;
    const stale = (a?.freshness ?? 0) > 24;
    const linkRows = (list, incoming) => rows(c, list.slice(0, 8).map((r) => row(c, {
      id: r.id,
      label: r.label,
      icon: c.icon(EDGE_ICON[r.edge] || "link", { size: "xs" }),
      meta: `${r.edge} · ${r.same ? "here" : r.system}`,
      edge: r.same ? incoming ? r.id + ">" + item.id : item.id + ">" + r.id : null
    })), list.length - 8);
    return c.html`${head}${nodeActions(c, item)}
      ${stats2(c, [
      ["Owner", a?.owner ?? "-"],
      ["Rows", fmt(a?.rows ?? 0) + "k"],
      ["Freshness", `${a?.freshness ?? 0} h`, stale ? "warn" : "ok"],
      ["Links", `${fmt(d.outDeg ?? 0)} out · ${fmt(d.inDeg ?? 0)} in`]
    ])}
      ${section(c, "Outgoing", (d.out ?? []).length ? linkRows(d.out ?? [], false) : c.html`<p class="graph-explorer-muted">None.</p>`, d.outDeg)}
      ${section(c, "Incoming", (d.in ?? []).length ? linkRows(d.in ?? [], true) : c.html`<p class="graph-explorer-muted">None.</p>`, d.inDeg)}`;
  }
});
var endButton = (c, n) => c.html`<button type="button" class="graph-explorer-end" data-graph-explorer-goto="${n.id}">${typeIcon(n, { size: "sm" })}<span class="graph-explorer-end-name">${n.label}</span><span class="graph-explorer-end-type">${n.typeName}</span></button>`;
register("global", {
  kind: "edge",
  name: "builtin-edge-detail",
  detail: {
    match: () => 0,
    title: (item) => item.source.label + " → " + item.target.label,
    render: (item, c) => {
      const d = c.request("edge:" + item.id, () => c.fetchEdge(item.id));
      const e = item.edge;
      const kicker = c.html`${e.kind === "agg" ? "Links between clusters" : "A link"} · ${e.kind === "agg" ? fmt(e.count + e.count2) + " links" : e.type}${e.bidir ? " · both ways" : ""}`;
      const tile = c.icon(e.breaker && e.breaker.state !== "closed" ? BREAKER_ICON[e.breaker.state] : "link-2", {
        size: c.expanded ? "xl" : "lg"
      });
      const ends = c.html`<div class="graph-explorer-ends">${endButton(c, item.source)}<span class="graph-explorer-ends-arrow" aria-label="${e.bidir ? "both ways" : "to"}">${c.icon(e.bidir ? "arrow-left-right" : "arrow-right", { size: "sm" })}</span>${endButton(c, item.target)}</div>`;
      const actions = c.html`<div class="graph-explorer-detail-actions">${pageToggle(c)}</div>`;
      if (!d)
        return c.html`${detailHead(c, tile, kicker, "")}${ends}<p class="graph-explorer-muted">Loading the links...</p>`;
      const total = d.forward + d.backward;
      const types = Object.entries(d.byType).filter(([, n]) => n > 0);
      const byType = c.html`<ul class="graph-explorer-shares">${types.map(([t, n]) => c.html`<li><span class="graph-explorer-share-name">${c.icon(EDGE_ICON[t] || "link", { size: "xs" })} ${t}</span><span class="graph-explorer-share-value">${fmt(n)}</span>${shareBar(c, n, total)}</li>`)}</ul>`;
      const bad = d.pairs.filter((p) => p.state !== "closed");
      const pairRow = (p) => row(c, {
        id: p.from.id,
        label: p.from.label + " → " + p.to.label,
        meta: `${fmt(p.count)} · ${p.trips} trips`,
        badge: stateBadge(c, p.state)
      });
      const share = (list) => {
        const max = Math.max(1, ...list.map((x) => x.count));
        return rows(c, list.slice(0, 6).map((x) => row(c, { id: x.id, label: x.label, meta: fmt(x.count), bar: shareBar(c, x.count, max) })));
      };
      const dirs = `${item.source.label} → ${item.target.label}`;
      if (c.expanded)
        return c.html`<div class="graph-explorer-page">${pageHead(c, tile, dirs, kicker, trail(c, d.path, true), actions)}${ends}
          <section class="graph-explorer-kpis">
            ${kpi(c, "Forward", fmt(d.forward), `${item.source.label} → ${item.target.label}`)}
            ${kpi(c, "Back", fmt(d.backward), `${item.target.label} → ${item.source.label}`)}
            ${e.kind === "agg" ? kpi(c, "Breakers", fmt(d.pairs.length), `${fmt(bad.length)} not closed`, bad.length ? "warn" : "ok") : kpi(c, "Relation", e.type)}
            ${e.kind === "agg" ? kpi(c, "Trips", fmt(d.pairs.reduce((n, p) => n + p.trips, 0)), "since the last deploy") : ""}
          </section>
          <div class="graph-explorer-page-grid">
            ${pageCard(c, "By relation", byType, { icon: "workflow", note: "both directions" })}
            ${d.sources.length ? pageCard(c, "Top senders", share(d.sources), { icon: "send", note: `in ${item.source.label}` }) : ""}
            ${d.targets.length ? pageCard(c, "Top receivers", share(d.targets), { icon: "target", note: `in ${item.target.label}` }) : ""}
            ${d.pairs.length ? pageCard(c, "Circuit breakers", c.html`<div class="table-container"><table class="table graph-explorer-rel-table"><thead><tr class="table-row"><th class="table-head" scope="col">Caller</th><th class="table-head" scope="col">Callee</th><th class="table-head" scope="col" style="text-align:right">Links</th><th class="table-head" scope="col">State</th><th class="table-head" scope="col" style="text-align:right">Trips</th><th class="table-head" scope="col">Changed by</th></tr></thead><tbody>${d.pairs.map((p) => c.html`<tr class="table-row"><td class="table-cell"><button type="button" class="graph-explorer-link" data-graph-explorer-goto="${p.from.id}">${p.from.label}</button></td><td class="table-cell"><button type="button" class="graph-explorer-link" data-graph-explorer-goto="${p.to.id}">${p.to.label}</button></td><td class="table-cell" style="text-align:right">${fmt(p.count)}</td><td class="table-cell">${stateBadge(c, p.state)}</td><td class="table-cell" style="text-align:right">${p.trips}</td><td class="table-cell graph-explorer-muted">${p.by} · ${p.since} min ago</td></tr>`)}</tbody></table></div>`, { wide: true, icon: "shield-check", note: "the system pairs this link bundles, the worst first" }) : ""}
            ${pageCard(c, "Every single link", rowsView(c, item.id, "links", `Every link from ${item.source.label} to ${item.target.label}`, () => linksTable(c, d)), {
          wide: true,
          icon: "git-branch",
          note: "both ways - filter, sort, open an end - the shares follow the filters"
        })}
          </div></div>`;
      return c.html`${detailHead(c, tile, kicker, trail(c, d.path, true))}${ends}${actions}
        ${stats2(c, [
        ["Forward", fmt(d.forward)],
        ["Back", fmt(d.backward)],
        ["Breaker", e.breaker ? stateBadge(c, e.breaker.state) : "none"],
        [
          e.kind === "agg" ? "Pairs" : "Relation",
          e.kind === "agg" ? `${fmt(d.pairs.length)} · ${fmt(bad.length)} not closed` : e.type,
          bad.length ? "warn" : undefined
        ]
      ])}
        ${section(c, "By relation", byType)}
        ${bad.length ? section(c, "Breakers not closed", rows(c, bad.slice(0, 5).map(pairRow), bad.length - 5), bad.length) : ""}
        ${d.sources.length > 1 ? section(c, "Top senders", share(d.sources)) : ""}
        ${d.targets.length > 1 ? section(c, "Top receivers", share(d.targets)) : ""}`;
    }
  }
});
var FOR = "data-graph-explorer-for";
var OUTLETS = ["breadcrumb", "search", "outline", "details", "relations", "layers", "updates"];
var BUILTIN_LAYERS = [
  { name: "nodes", label: "Nodes", icon: "circle", base: true },
  { name: "relations", label: "Relations", icon: "network", base: true },
  { name: "labels", label: "Labels", icon: "tag", base: false },
  { name: "health", label: "Health", icon: "activity", base: false }
];
var BASE_LAYERS = ["nodes", "relations"];
function layerList(value) {
  const words = Array.isArray(value) ? value.map(String) : String(value ?? "").split(/\s+/);
  return [...new Set(words.map((w) => w.trim()).filter((w) => /^[a-z0-9-]+$/.test(w)))];
}
function layersOf(el) {
  return el.hasAttribute("data-layers") ? layerList(el.getAttribute("data-layers")) : [...BASE_LAYERS];
}
var sameLayers = (a, b) => a.length === b.length && [...a].sort().join(" ") === [...b].sort().join(" ");
function boundOf(el, sel) {
  if (!el.id)
    return [];
  const out = [];
  for (const bound of dfDollar10(`[${FOR}="${CSS.escape(el.id)}"]`).toArray()) {
    if (bound.matches(sel))
      out.push(bound);
    out.push(...dfDollar10(bound).find(sel).toArray());
  }
  return [...new Set(out)];
}
function outletChrome(outlet, kind, make) {
  let chrome = dfDollar10(outlet).children(`.graph-explorer-${kind}[data-ce-chrome]`).get(0);
  if (!chrome) {
    chrome = make();
    dfDollar10(outlet).append(chrome);
  }
  return chrome;
}
var resolveTarget = (target) => typeof target === "string" ? dfDollar10(target).get(0) : target;
function applyMarkup10(el, name, config) {
  if (config.layers !== undefined) {
    const want = layerList(config.layers);
    if (!sameLayers(want, layersOf(el)))
      dfDollar10(el).attr("data-layers", sameLayers(want, BASE_LAYERS) ? null : want.join(" "));
  }
  if (config.compact !== undefined && el.hasAttribute("data-compact") !== !!config.compact)
    dfDollar10(el).attr("data-compact", config.compact ? "" : null);
  const selected = name === "default" ? [] : keyList2(config.selected ?? "");
  if (selected.join(" ") !== keyList2(el.getAttribute("data-selected") ?? "").join(" "))
    dfDollar10(el).attr("data-selected", selected.length ? selected.join(" ") : null);
  const edge = name === "default" || selected.length ? null : edgeKey(config.edge);
  if ((el.getAttribute("data-selected-edge") || null) !== edge)
    dfDollar10(el).attr("data-selected-edge", edge);
  const focus = name === "focused" ? config.focus || null : null;
  if ((el.getAttribute("data-focus") || null) !== focus)
    dfDollar10(el).attr("data-focus", focus);
  const expanded = (selected.length > 0 || !!edge) && !!config.expanded;
  if (el.hasAttribute("data-expanded") !== expanded)
    dfDollar10(el).attr("data-expanded", expanded ? "" : null);
}
function edgeKey(value) {
  const v = typeof value === "string" ? value.trim() : "";
  return /^[cn]\d+>[cn]\d+$/.test(v) ? v : null;
}
function stateNameOf2(focus, selected, edge) {
  return focus ? "focused" : selected.length || edge ? "selected" : "default";
}
function configOf3(el) {
  return {
    focus: el.getAttribute("data-focus") || null,
    selected: keyList2(el.getAttribute("data-selected") ?? ""),
    layers: layersOf(el),
    compact: el.hasAttribute("data-compact"),
    expanded: el.hasAttribute("data-expanded"),
    edge: edgeKey(el.getAttribute("data-selected-edge"))
  };
}
function triggerStateChange10(el, name, config, incoming) {
  const inst = el._graphExplorer;
  const asked = name;
  if (incoming.focus && name !== "focused")
    name = "focused";
  else if (name === "default" && (keyList2(incoming.selected ?? "").length || edgeKey(incoming.edge)))
    name = "selected";
  if (edgeKey(incoming.edge) && !keyList2(incoming.selected ?? "").length)
    config = { ...config, selected: [] };
  else if (keyList2(incoming.selected ?? "").length)
    config = { ...config, edge: null };
  let landed = name;
  const selected = keyList2(config.selected ?? "");
  const edge = selected.length ? null : edgeKey(config.edge);
  if (name === "focused" && !config.focus)
    landed = selected.length || edge ? "selected" : "default";
  if (name === "selected" && !selected.length && !edge)
    landed = "default";
  applyMarkup10(el, landed, config);
  if (landed !== asked)
    el.dataset.stateName = landed;
  return inst ? inst.sync() : Promise.resolve();
}
var graphExplorerApi = componentState({
  component: "graph-explorer",
  states: graphExplorerStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange10(el, state.name, state.config, incoming),
  read: (el) => {
    const config = configOf3(el);
    return {
      name: stateNameOf2(config.focus, config.selected, config.edge),
      config
    };
  },
  markup: (el, state) => applyMarkup10(el, state.name, state.config)
});
df$10.graphExplorerApi = graphExplorerApi;
df$10.graphExplorerStates = graphExplorerStates;
var CHANGE_MS = 8000;
var TIME_FMT = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
var UPDATE_LIMIT = 1e4;
var UPDATE_ICONS = {
  deploy: "send",
  breaker: "zap",
  traffic: "activity",
  count: "hash"
};
register("global", {
  kind: "update",
  name: "builtin-update",
  update: {
    match: () => 0,
    render: (u, c) => c.html`<span class="indicator-dot" data-size="sm" ${u.tone ? c.html`data-tone="${u.tone}"` : ""} aria-hidden="true"></span>${c.icon(UPDATE_ICONS[u.type] ?? "circle", { size: "sm" })}<span class="graph-explorer-update-label">${u.label}</span><span class="graph-explorer-update-text">${u.text}</span><time class="graph-explorer-update-time" datetime="${new Date(u.time).toISOString()}">${c.time(u.time)}</time>`
  }
});
var HELP_ROWS = [
  ["←↑→↓", "move the focus to the nearest node in that direction"],
  ["Shift + arrows, drag", "pan (panning into a neighbour cluster moves you there)"],
  ["+ - / wheel, pinch", "zoom (zooming into a cluster enters it)"],
  ["Enter / double click", "zoom into a cluster: its children show; expand an entity"],
  ["E", "expand the focused node: its full page in the details outlet (Esc returns)"],
  ["Space / click", "select and show details (Shift adds)"],
  ["click a link", "select the link: its traffic, breakers and single links (E expands, Esc lets it go)"],
  ["] [", "focus the next / previous neighbour"],
  ["B / press and hold", "jump to a neighbour: the busiest ones gather around the node, pick one to fly there"],
  ["1 - 9", "show or hide a layer (Nodes, Relations, Labels, Health, ...)"],
  ["Esc", "close the topmost overlay, then move out"],
  ["Backspace", "move out"],
  ["0", "fit the view"],
  ["/", "search"],
  ["?", "this map"]
];

class Explorer {
  constructor(el) {
    this.el = el;
    this.registry = { node: [], edge: [], detail: [], update: [] };
    this.n = clamp3(parseInt(el.dataset.nodes || "1000000", 10) || 1e6, 2000, 4000000);
    this.seed = parseInt(el.dataset.seed || "7", 10) || 7;
    this.uid = el.id || "graph-explorer-" + Math.random().toString(36).slice(2, 8);
    this.views = new Map;
    this.view = null;
    this.cam = { cx: 0, cy: 0, z: 1 };
    this.bitmapCam = null;
    this.camSeq = 0;
    this.sent = null;
    this.sentAt = 0;
    this.inflight = 0;
    this.pendingBitmap = null;
    this.tiers = null;
    this.slots = new Map;
    this.free = [];
    this.selected = new Set;
    this.hover = -1;
    this.kbd = -1;
    this.dataRev = new Map;
    this.requests = new Map;
    this.islandMounts = new Map;
    this.rowCache = new Map;
    this.edgePaths = new Map;
    this.signKeys = "";
    this.labelHosts = new Map;
    this.labelPool = [];
    this.labelVer = 0;
    this.shown = new Set(layersOf(el));
    this.compact = el.hasAttribute("data-compact");
    this.layerColors = new Map;
    this.monochrome = false;
    this.expanded = false;
    this.edge = null;
    this.dotLabels = [];
    this.updates = [];
    this.updatesShown = [];
    this.changes = new Map;
    this.changeDots = new Map;
    this.updateSeq = 0;
    this.flight = null;
    this.navigating = false;
    this.loading = true;
    this.stats = { frames: 0, fpsT: performance.now(), fps: 0, worker: {} };
    this.searchSeq = 0;
    this.results = [];
    this.activeResult = -1;
    this.waiters = new Map;
    this.syncChain = Promise.resolve();
    this.ready = new Promise((resolve) => this.resolveReady = resolve);
    this.mount();
    this.startWorker();
    this.bindEvents();
    this.observeTheme();
    live2.add(this);
  }
  mount() {
    const el = this.el, id = this.uid;
    const help = html`<div class="card graph-explorer-help" id="${id}-help" popover data-ce-chrome>
      <div class="card-header"><h3 class="card-title">Keyboard and pointer</h3></div>
      <div class="card-content">
        <table class="graph-explorer-keys">
          <tbody>
            ${HELP_ROWS.map(([k, v]) => html`<tr>
                  <td>${k.split(" / ").map((key, j) => html`${j ? " / " : ""}<kbd class="kbd">${key}</kbd>`)}</td>
                  <td>${v}</td>
                </tr>`)}
          </tbody>
        </table>
      </div>
    </div>`;
    const chrome = html`<canvas class="graph-explorer-canvas" aria-hidden="true" data-ce-chrome></canvas>
      <svg class="graph-explorer-edges" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" data-ce-chrome>
        <g class="graph-explorer-edge-group"></g>
      </svg>
      <div class="graph-explorer-edge-labels" aria-hidden="true" data-ce-chrome></div>
      <div class="graph-explorer-world" data-ce-chrome></div>
      <div class="graph-explorer-signs" data-ce-chrome></div>
      <div class="graph-explorer-changes" aria-hidden="true" data-ce-chrome></div>
      <div class="graph-explorer-ring" hidden data-ce-chrome></div>
      <div class="graph-explorer-focus-ring" hidden aria-hidden="true" data-ce-chrome></div>
      <div class="graph-explorer-loading" data-ce-chrome>
        <span class="graph-explorer-loading-text">Generating ${fmt(this.n)} nodes...</span><progress></progress>
      </div>
      <pre class="graph-explorer-hud" aria-hidden="true" hidden data-ce-chrome></pre>
      <output class="graph-explorer-live" data-ce-chrome></output>
      <span class="graph-explorer-probe" aria-hidden="true" data-ce-chrome></span>
      ${help}`;
    const doc = new DOMParser().parseFromString(`<body>${chrome.html}</body>`, "text/html");
    for (const node of Array.from(doc.body.children))
      dfDollar10(el).append(document.adoptNode(node));
    if (!el.hasAttribute("tabindex"))
      el.tabIndex = 0;
    if (!el.hasAttribute("role"))
      dfDollar10(el).attr("role", "application");
    dfDollar10(el).attr("aria-roledescription", "graph");
    dfDollar10(el).attr("aria-describedby", `${id}-help`);
    dfDollar10(el).attr("aria-busy", "true");
    dfDollar10(el).attr("data-graph-status", "loading");
    const $ = (sel) => dfDollar10(el).children(sel).get(0);
    this.canvas = $(".graph-explorer-canvas");
    this.svgG = dfDollar10(el).find(".graph-explorer-edge-group").get(0);
    this.labelsEl = $(".graph-explorer-edge-labels");
    this.world = $(".graph-explorer-world");
    this.signs = $(".graph-explorer-signs");
    this.changesEl = $(".graph-explorer-changes");
    this.ring = $(".graph-explorer-ring");
    this.focusRing = $(".graph-explorer-focus-ring");
    this.loadingEl = $(".graph-explorer-loading");
    this.hud = $(".graph-explorer-hud");
    this.liveEl = $(".graph-explorer-live");
    this.probe = $(".graph-explorer-probe");
    this.help = $(".graph-explorer-help");
    this.bitmapCtx = this.canvas.getContext("bitmaprenderer");
    if (el.hasAttribute("data-hud"))
      this.hud.hidden = false;
  }
  startWorker() {
    this.workerUrl = URL.createObjectURL(new Blob([`(${graphExplorerWorker.toString()})(self);`], { type: "text/javascript" }));
    this.worker = new Worker(this.workerUrl, { name: "defuss-graph-explorer" });
    this.worker.onmessage = (ev) => this.onWorker(ev.data);
    this.worker.onerror = (ev) => this.fail(ev.message || "worker error");
    this.postRules();
    this.postLayers();
    this.post({ t: "init", n: this.n, seed: this.seed });
    this.t0 = performance.now();
  }
  post(m, transfer) {
    if (!this.destroyed)
      this.worker.postMessage(m, transfer || []);
  }
  fail(message) {
    dfDollar10(this.el).attr("data-graph-status", "error");
    dfDollar10(this.el).attr("aria-busy", null);
    dfDollar10(this.loadingEl).find(".graph-explorer-loading-text").text(`The graph could not be built: ${message.split(`
`)[0]}`);
    this.el.dispatchEvent(new CustomEvent("graph-explorer-error", { detail: { message }, bubbles: true }));
  }
  onWorker(m) {
    switch (m.t) {
      case "ready":
        this.genStats = m.stats;
        this.genMs = Math.round(performance.now() - this.t0);
        this.postColors();
        this.post({ t: "focus", id: m.root });
        break;
      case "view":
        this.onView(m);
        break;
      case "frame":
        this.onFrame(m);
        break;
      case "search":
        this.onSearch(m);
        break;
      case "details":
        this.resolve("details:" + m.id, m);
        break;
      case "rows":
        this.resolve("rows:" + m.id, m);
        break;
      case "subtree":
        this.resolve("subtree:" + m.id + ":" + m.levels, m.rows);
        break;
      case "edge":
        this.resolve("edge:" + m.id, m);
        break;
      case "path":
        this.resolve("path:" + m.id, m.path);
        break;
      case "patch":
        this.onPatch(m);
        break;
      case "updates":
        this.addUpdates(m.items);
        break;
      case "error":
        this.fail(String(m.message));
        break;
    }
  }
  waitFor(key, send) {
    let w = this.waiters.get(key);
    if (!w) {
      w = {};
      w.promise = new Promise((r) => w.resolve = r);
      this.waiters.set(key, w);
      send();
    }
    return w.promise;
  }
  resolve(key, value) {
    const w = this.waiters.get(key);
    if (w) {
      this.waiters.delete(key);
      w.resolve(value);
    }
  }
  fetchView(id) {
    if (this.views.has(id))
      return Promise.resolve(this.views.get(id));
    return this.waitFor("view:" + id, () => this.post({ t: "focus", id }));
  }
  postRules() {
    const rules = [];
    for (const reg of [globalRegistry, this.registry])
      for (const p of reg.edge) {
        if (!this.shown.has(p.layer || "relations"))
          continue;
        for (const r of p.rules || [])
          rules.push({
            when: r.when || [],
            style: r.style || {},
            priority: (r.priority ?? 0) + (p._scoped ? 1000 : 0)
          });
      }
    this.post({ t: "rules", rules });
  }
  onPluginsChanged() {
    this.renderUpdates();
    this.postRules();
    this.labelVer++;
    this.renderLayers();
    if (this.view) {
      this.assignRenderers();
      for (const s of this.slots.values())
        s._key = "";
      this.applyTiers(this.tiers, true);
      this.renderPanel();
      this.refreshDecor(true);
    }
  }
  postColors() {
    const probe = this.probe;
    const read = (v) => {
      probe.style.color = "";
      probe.style.color = v;
      return getComputedStyle(probe).color;
    };
    const forced = !!globalThis.matchMedia?.("(forced-colors: active)").matches;
    const tok = (name, fallback) => forced ? read(fallback) : read(`var(${name})`);
    const palette = {
      paper: tok("--background", "Canvas"),
      ink: tok("--foreground", "CanvasText"),
      muted: tok("--muted-foreground", "GrayText"),
      border: tok("--border", "GrayText"),
      ring: tok("--ring", "Highlight"),
      tones: {
        muted: tok("--muted-foreground", "GrayText"),
        ink: tok("--foreground", "CanvasText"),
        accent: tok("--chart-2", "Highlight"),
        link: tok("--chart-4", "LinkText"),
        ok: tok("--chart-3", "CanvasText"),
        warn: tok("--chart-1", "Mark"),
        danger: tok("--destructive", "Highlight")
      },
      cat: ["--chart-1", "--chart-2", "--chart-3", "--chart-4", "--chart-5"].map((v) => tok(v, "CanvasText")),
      font: getComputedStyle(this.el).fontFamily || "system-ui, sans-serif",
      dark: document.documentElement.classList.contains("dark") || getComputedStyle(document.documentElement).colorScheme === "dark"
    };
    for (const shift of [150, 210, 280])
      palette.cat.push(forced ? palette.ink : read(`oklch(from var(--chart-1) l c calc(h + ${shift}))`) || palette.ink);
    const mono = !forced && this.chartsMonochrome(palette.cat.slice(0, 5));
    if (mono !== this.monochrome) {
      this.monochrome = mono;
      this.renderLayers();
      if (this.view) {
        for (const s of this.slots.values())
          s._key = "";
        this.applyTiers(this.tiers, true);
        this.refreshDecor(true);
      }
    } else
      this.renderLayers();
    const relations = this.colorOf("relations");
    this.el.style.setProperty("--graph-explorer-relations", relations);
    this.el.style.setProperty("--graph-explorer-nodes", this.colorOf("nodes"));
    if (!forced)
      palette.tones.muted = read(relations) || palette.tones.muted;
    this.palette = palette;
    this.post({ t: "colors", palette });
  }
  chartsMonochrome(colors) {
    const canvas = dfDollar10('<canvas width="1" height="1"></canvas>').get(0);
    const g = canvas.getContext("2d", { willReadFrequently: true });
    if (!g)
      return false;
    const hues = [];
    for (const color of colors) {
      g.clearRect(0, 0, 1, 1);
      g.fillStyle = "#000";
      g.fillStyle = color;
      g.fillRect(0, 0, 1, 1);
      const [r, gr, b] = [...g.getImageData(0, 0, 1, 1).data].map((v) => v / 255);
      const max = Math.max(r, gr, b), min = Math.min(r, gr, b), d = max - min;
      if (d < 0.12)
        continue;
      const h = max === r ? (gr - b) / d % 6 : max === gr ? (b - r) / d + 2 : (r - gr) / d + 4;
      hues.push((h * 60 + 360) % 360);
    }
    let spread = 0;
    for (const a of hues)
      for (const b of hues)
        spread = Math.max(spread, Math.min(Math.abs(a - b), 360 - Math.abs(a - b)));
    return spread < 40;
  }
  observeTheme() {
    const again = () => {
      if (this.genStats)
        this.postColors();
    };
    this.themeObserver = new MutationObserver(again);
    this.themeObserver.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"]
    });
    this.mediaQueries = globalThis.matchMedia ? ["(prefers-color-scheme: dark)", "(prefers-contrast: more)", "(forced-colors: active)"].map((q) => globalThis.matchMedia(q)) : [];
    this.onMedia = again;
    for (const mq of this.mediaQueries)
      mq.addEventListener("change", again);
    this.onThemeEvent = () => requestAnimationFrame(again);
    document.addEventListener("defuss-theme-change", this.onThemeEvent);
    document.addEventListener("load", this.onThemeEvent, true);
  }
  onView(m) {
    const first = !this.views.has(m.id);
    this.views.set(m.id, m);
    m.byId = new Map(m.children.map((c) => [c.id, c.i]));
    m.edgeById = new Map(m.edges.map((e) => [m.children[e.a].id + ">" + m.children[e.b].id, e.k]));
    m.adj = m.children.map(() => []);
    m.edges.forEach((e) => {
      m.adj[e.a].push(e.k);
      m.adj[e.b].push(e.k);
    });
    for (const c of m.children)
      c.breakers = null;
    this.computeBreakerCounts(m);
    this.resolve("view:" + m.id, m);
    if (first && !this.view) {
      this.setView(m);
      this.fit(false);
      this.loading = false;
      this.loadingEl.hidden = true;
      dfDollar10(this.el).attr("aria-busy", null);
      dfDollar10(this.el).attr("data-graph-status", "ready");
      this.resolveReady();
    }
  }
  computeBreakerCounts(m) {
    if (m.leafView)
      return;
    for (const c of m.children)
      c.breakers = { open: 0, half: 0, cut: 0, total: 0 };
    for (const e of m.edges) {
      if (!e.breaker)
        continue;
      for (const end of [e.a, e.b]) {
        const b = m.children[end].breakers;
        b.open += e.breaker.open;
        b.half += e.breaker.half;
        b.cut += e.breaker.cut;
        b.total += e.breaker.members || 1;
      }
    }
  }
  setView(m) {
    this.view = m;
    for (const s of this.slots.values()) {
      s.hidden = true;
      s._key = "";
      this.free.push(s);
    }
    this.slots.clear();
    this.tiers = null;
    this.hover = -1;
    this.kbd = -1;
    this.selected = new Set([...this.selected].filter((id) => m.byId.has(id)));
    if (this.edge && this.edgeIndex(this.edge) < 0)
      this.edge = null;
    for (const p of this.edgePaths.values()) {
      p.hit.remove();
      p.line.remove();
      p.head.remove();
      p.flash?.remove();
    }
    this.edgePaths.clear();
    this.assignRenderers();
    if (!this.updatesRendered)
      this.renderUpdates();
    this.renderLayers();
    this.renderCrumbs();
    this.renderOutline();
    this.renderPanel();
    this.refreshDecor(true);
    this.signKeys = "";
    morph2(this.signs, []);
    this.closeRing();
    this.commitState();
    this.el.dispatchEvent(new CustomEvent("graph-explorer-focus", {
      detail: { focus: m.id === "c0" ? null : m.id, path: m.path },
      bubbles: true
    }));
    this.announce(`${m.path.map((p) => p.label).join(" › ")} · ${fmt(m.children.length)} nodes`);
    this.camDirty = true;
    this.requestTick();
  }
  nodeOf(i) {
    return { ...this.view.children[i], depth: this.view.path.length - 1 };
  }
  sizesOf(r, node) {
    try {
      return (typeof r.sizes === "function" ? r.sizes(node) : r.sizes) || {};
    } catch (err) {
      console.error('[graph-explorer] sizes of "' + r.name + '" failed', err);
      return {};
    }
  }
  assignRenderers() {
    const m = this.view;
    const head = this.shown.has("nodes");
    const partLayers = this.layerDefs().filter((l) => l.name !== "nodes" && l.shown).map((l) => l.name);
    m.renderers = m.children.map((c) => head ? this.pick("node", c) : null);
    m.boxes = [];
    const sizes = new Float32Array(m.children.length * 4);
    m.children.forEach((_c, i) => {
      const node = this.nodeOf(i), r = m.renderers[i];
      const hs = r ? this.sizesOf(r, node) : {};
      const chip0 = hs.chip || [140, 26], card0 = hs.card || chip0;
      let [chipW, chipH] = r ? chip0 : [0, 0], [cardW, cardH] = r ? card0 : [0, 0];
      const chipParts = [], cardParts = [];
      for (const layer of partLayers) {
        const p = this.pickPart(layer, node);
        if (!p)
          continue;
        const ps = this.sizesOf(p, node);
        if (ps.chip) {
          chipW += ps.chip[0];
          chipH = Math.max(chipH, ps.chip[1]);
          chipParts.push(p);
        }
        if (ps.card) {
          cardW = Math.max(cardW, ps.card[0]);
          cardH += ps.card[1];
          cardParts.push(p);
        }
      }
      if (!r && chipParts.length) {
        chipW += 12;
        chipH = Math.max(chipH, 22);
      }
      if (!r && cardParts.length) {
        cardW = Math.max(cardW, 168);
        cardH += 14;
      }
      if (this.compact) {
        cardW = chipW;
        cardH = chipH;
      }
      m.boxes[i] = {
        chip: chipParts,
        card: this.compact ? chipParts : cardParts,
        chipSize: [chipW, chipH],
        cardSize: [cardW, cardH]
      };
      sizes.set([chipW, chipH, cardW, cardH], i * 4);
    });
    this.post({ t: "sizes", id: m.id, sizes });
  }
  pick(kind, item) {
    for (const reg of [this.registry, globalRegistry]) {
      let best = null, score = -Infinity;
      for (const p of reg[kind]) {
        if (kind === "node" && p.layer)
          continue;
        const s = p.match(item);
        if (s === false || s == null)
          continue;
        if (s > score || s === score && p._order > best._order) {
          best = p;
          score = s;
        }
      }
      if (best)
        return best;
    }
    return null;
  }
  pickPart(layer, item) {
    for (const reg of [this.registry, globalRegistry]) {
      let best = null, score = -Infinity;
      for (const p of reg.node) {
        if (p.layer !== layer)
          continue;
        let s;
        try {
          s = p.match(item);
        } catch (err) {
          console.error(err);
          s = false;
        }
        if (s === false || s == null)
          continue;
        if (s > score || s === score && p._order > best._order) {
          best = p;
          score = s;
        }
      }
      if (best)
        return best;
    }
    return null;
  }
  layerDefs() {
    const out = BUILTIN_LAYERS.map((l) => ({ ...l, color: "" }));
    const seen = new Set(out.map((l) => l.name));
    const plugins = [...globalRegistry.node, ...globalRegistry.edge, ...this.registry.node, ...this.registry.edge];
    for (const p of plugins.sort((a, b) => a._order - b._order)) {
      if (!p.layer || seen.has(p.layer))
        continue;
      seen.add(p.layer);
      out.push({
        name: p.layer,
        label: p.layerLabel || p.layer,
        icon: p.layerIcon || "layers",
        color: p.layerColor || "",
        base: false
      });
    }
    return out.map((l, k) => ({ ...l, color: l.color || this.layerColor(k), shown: this.shown.has(l.name) }));
  }
  layerColor(k) {
    if (!this.monochrome && k < 5)
      return `var(--chart-${k + 1})`;
    return `oklch(from var(--chart-1) 0.66 max(c, 0.15) calc(h + ${(k * 72 + (k >= 5 ? 36 : 0)) % 360}))`;
  }
  colorOf(layer) {
    return this.layerColors.get(layer) || "var(--muted-foreground)";
  }
  renderLayers() {
    const defs = this.layerDefs();
    this.layerColors = new Map(defs.map((l) => [l.name, l.color]));
    const sig = defs.map((l) => l.name + "=" + l.color + "=" + l.shown).join("|") + "|" + this.compact;
    const first = Math.max(0, defs.findIndex((l) => l.shown));
    for (const outlet of this.outlets("layers")) {
      const box = outletChrome(outlet, "layers", () => dfDollar10('<div class="graph-explorer-layers" data-ce-chrome></div>').get(0));
      if (box._sig === sig)
        continue;
      box._sig = sig;
      morph2(box, html`<div
            class="toggle-group"
            role="group"
            aria-label="Layers"
            data-type="multiple"
            data-size="sm"
            data-spacing
          >
            ${defs.map((l, k) => html`<button
                  type="button"
                  class="toggle graph-explorer-layer"
                  key="${l.name}"
                  data-graph-explorer-layer="${l.name}"
                  aria-pressed="${l.shown ? "true" : "false"}"
                  tabindex="${k === first ? "0" : "-1"}"
                  style="--graph-explorer-layer: ${l.color}"
                  title="${l.label}: ${l.shown ? "shown" : "hidden"}${k < 9 ? ` (${k + 1})` : ""}"
                >
                  <span class="indicator-dot" aria-hidden="true"></span>${icon(l.icon)}<span
                    class="graph-explorer-layer-label"
                    >${l.label}</span
                  >
                </button>`)}
          </div>
          <div class="separator" data-orientation="vertical" role="separator"></div>
          <button
            type="button"
            class="toggle graph-explorer-compact"
            data-size="sm"
            data-graph-explorer-compact
            aria-pressed="${this.compact ? "true" : "false"}"
            title="Compact: every node as a one-line chip"
          >
            ${icon("rows-3")}<span class="graph-explorer-layer-label">Compact</span>
          </button>`);
    }
  }
  setLayers(names, user = true) {
    const next = new Set(layerList(names));
    if (sameLayers([...next], [...this.shown]))
      return;
    this.shown = next;
    this.layersChanged(user);
  }
  toggleLayer(name) {
    const next = new Set(this.shown);
    if (next.has(name))
      next.delete(name);
    else
      next.add(name);
    this.setLayers([...next]);
    const l = this.layerDefs().find((x) => x.name === name);
    this.announce(`${l?.label ?? name}: ${this.shown.has(name) ? "shown" : "hidden"}`);
  }
  setCompact(on, user = true) {
    if (this.compact === !!on)
      return;
    this.compact = !!on;
    this.layersChanged(user);
    this.announce(`Compact ${this.compact ? "on" : "off"}`);
  }
  layersChanged(user) {
    this.renderLayers();
    this.postLayers();
    this.postRules();
    this.labelVer++;
    this.signKeys = "";
    if (this.view) {
      this.assignRenderers();
      for (const s of this.slots.values())
        s._key = "";
      this.applyTiers(this.tiers, true);
      this.refreshDecor(true);
      this.camChanged();
    }
    this.renderUpdates();
    if (user)
      this.commitState();
    this.el.dispatchEvent(new CustomEvent("graph-explorer-layers", {
      detail: { layers: [...this.shown], compact: this.compact },
      bubbles: true
    }));
  }
  postLayers() {
    this.post({ t: "layers", nodes: this.shown.has("nodes"), relations: this.shown.has("relations") });
  }
  requestTick() {
    if (!this.raf && !this.destroyed)
      this.raf = requestAnimationFrame((t) => this.tick(t));
  }
  size() {
    const r = this.el.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.vmin = Math.min(this.w, this.h);
  }
  tick(now) {
    this.raf = 0;
    if (!this.view || this.destroyed)
      return;
    if (!this.w)
      this.size();
    if (this.flight)
      this.stepFlight(now);
    else if (!this.navigating)
      this.autoDepth();
    if (this.pendingBitmap) {
      const f = this.pendingBitmap;
      this.pendingBitmap = null;
      this.bitmapCtx.transferFromImageBitmap(f.bitmap);
      this.bitmapCam = f.cam;
      this.camDirty = true;
      this.stats.frames++;
    }
    if (this.camDirty) {
      this.camDirty = false;
      this.project();
    }
    this.maybeSend();
    if (now - this.stats.fpsT > 500)
      this.sampleHud(now);
    if (this.flight || this.pendingBitmap || this.inflight)
      this.requestTick();
    else if (!this.hud.hidden) {
      clearTimeout(this.hudT);
      this.hudT = setTimeout(() => this.sampleHud(performance.now()), 600);
    }
  }
  sampleHud(now) {
    this.stats.fps = Math.round(this.stats.frames * 1000 / Math.max(1, now - this.stats.fpsT));
    this.stats.frames = 0;
    this.stats.fpsT = now;
    if (!this.hud.hidden && this.view && !this.destroyed)
      this.renderHud();
  }
  camChanged() {
    this.camDirty = true;
    clearTimeout(this.restTimer);
    this.restTimer = setTimeout(() => {
      if (!this.view || this.destroyed)
        return;
      this.el.dispatchEvent(new CustomEvent("graph-explorer-view", {
        detail: { focus: this.view.id === "c0" ? null : this.view.id, camera: { ...this.cam } },
        bubbles: true
      }));
    }, 250);
    this.requestTick();
  }
  maybeSend() {
    const c = this.cam;
    const sel = [...this.selected].map((id) => this.view.byId.get(id)).filter((i) => i !== undefined);
    const ends = this.edgeEnds();
    const key = [
      this.view.cid,
      c.cx.toFixed(5),
      c.cy.toFixed(5),
      c.z.toFixed(3),
      this.w,
      this.h,
      this.hover,
      this.kbd,
      sel.join(","),
      ends.join(",")
    ].join("|");
    const now = performance.now();
    if (key === this.sent && !(this.inflight && now - this.sentAt > 400))
      return;
    if (this.inflight && now - this.sentAt < 120) {
      this.requestTick();
      return;
    }
    this.sent = key;
    this.sentAt = now;
    this.inflight = ++this.camSeq;
    this.post({
      t: "camera",
      id: this.camSeq,
      view: this.view.cid,
      cx: c.cx,
      cy: c.cy,
      z: c.z,
      w: this.w,
      h: this.h,
      dpr: Math.min(2, globalThis.devicePixelRatio || 1),
      hover: this.hover,
      kbd: this.kbd,
      sel,
      edge: ends.length ? ends : null
    });
  }
  onFrame(m) {
    if (m.camId >= this.inflight)
      this.inflight = 0;
    this.stats.worker = m.stats;
    this.stats.lag = this.camSeq - m.camId;
    if (!this.view || m.view !== this.view.cid || this.destroyed) {
      m.bitmap.close();
      return;
    }
    if (this.pendingBitmap)
      this.pendingBitmap.bitmap.close();
    this.pendingBitmap = { bitmap: m.bitmap, cam: m.cam, camId: m.camId };
    this.dotLabels = m.dotLabels || [];
    this.applyTiers(m.tiers);
    this.requestTick();
  }
  toScreen(x, y) {
    const c = this.cam;
    return [(x - c.cx) * c.z + this.w / 2, (y - c.cy) * c.z + this.h / 2];
  }
  project() {
    const m = this.view, c = this.cam, isCluster = !m.leafView;
    if (this.bitmapCam && this.bitmapCam.w === this.w && this.bitmapCam.h === this.h) {
      const b = this.bitmapCam, k = c.z / b.z;
      this.canvas.style.transform = `translate(${((b.cx - c.cx) * c.z).toFixed(2)}px, ${((b.cy - c.cy) * c.z).toFixed(2)}px) scale(${k.toFixed(5)})`;
    }
    for (const [i, s] of this.slots) {
      const n = m.children[i];
      const [sx, sy] = this.toScreen(n.x, n.y);
      const [x, y] = anchorBox(isCluster, s._tier, sx, sy, n.r * c.z, s._w, s._h);
      s._x = Math.round(x);
      s._y = Math.round(y);
      s.style.translate = `${s._x}px ${s._y}px`;
    }
    this.projectEdges();
    this.projectChanges();
    this.projectDecor();
    this.projectSigns();
    this.projectFocusRing();
    if (!this.ring.hidden)
      this.projectRing();
  }
  applyTiers(tiers, force = false) {
    if (!tiers || !this.view)
      return;
    this.tiers = tiers;
    const m = this.view, jobs = [], slotsForJobs = [];
    const empty = (i) => {
      const b = m.boxes?.[i];
      return !b || !m.renderers[i] && !(tiers[i] === 2 ? b.card : b.chip).length;
    };
    for (const [i, s] of this.slots) {
      if (tiers[i] < 1 || empty(i)) {
        s.hidden = true;
        s._key = "";
        this.slots.delete(i);
        this.free.push(s);
      }
    }
    for (let i = 0;i < tiers.length; i++) {
      if (tiers[i] < 1 || empty(i))
        continue;
      let s = this.slots.get(i);
      if (!s) {
        s = this.free.pop();
        if (!s) {
          s = dfDollar10('<div class="graph-explorer-node"></div>').get(0);
          dfDollar10(this.world).append(s);
        }
        s.hidden = false;
        s._key = "";
        this.slots.set(i, s);
      }
      const tier = tiers[i] === 2 && !this.compact ? "card" : "chip";
      const node = this.nodeOf(i), r = m.renderers[i], box = m.boxes[i], parts = tier === "card" ? box.card : box.chip, ctx = this.ctxFor(node, tier, i);
      const keyOf = (x) => {
        try {
          return x.key ? x.key(node, ctx) : "";
        } catch {
          return "";
        }
      };
      const key = (r ? r.name + ":" + keyOf(r) : "-") + "|" + parts.map((x) => x.name + ":" + keyOf(x)).join(",") + "|" + tier + "|" + (ctx.selected ? 1 : 0) + "|" + (ctx.expandable ? 1 : 0) + "|" + (this.dataRev.get(node.id) || 0);
      if (s._key === key && !force)
        continue;
      const [w, h] = tiers[i] === 2 ? box.cardSize : box.chipSize;
      if (s._node !== node.id) {
        s._node = node.id;
        dfDollar10(s).attr("data-node", node.id);
      }
      if (s._tier !== tiers[i]) {
        s._tier = tiers[i];
        dfDollar10(s).attr("data-tier", tier);
      }
      s._w = w;
      s._h = h;
      s.style.width = w + "px";
      s.style.height = h + "px";
      dfDollar10(s).attr("data-selected", ctx.selected ? "" : null);
      dfDollar10(s).attr("data-kind", node.kind);
      s._key = key;
      try {
        jobs.push(this.composeNode(node, tier, ctx, r, parts));
        slotsForJobs.push(s);
      } catch (err) {
        console.error('[graph-explorer] renderer "' + (r?.name ?? "parts") + '" failed', err);
      }
    }
    if (jobs.length) {
      let lists;
      try {
        lists = vnodesBatch(jobs);
      } catch (err) {
        console.error(err);
        lists = jobs.map(() => []);
      }
      lists.forEach((list, k) => morphRuntime.morph(slotsForJobs[k], list));
    }
    for (const [i, s] of this.slots)
      dfDollar10(s).attr("data-kbd", i === this.kbd ? "" : null);
    this.el.toggleAttribute("data-dim", this.hover >= 0 || this.selected.size > 0 || !!this.edge);
    for (const [i, s] of this.slots)
      s.toggleAttribute("data-hl", this.isHighlighted(i));
    this.refreshDecor(false);
    this.camDirty = true;
    this.requestTick();
  }
  composeNode(node, tier, ctx, r, parts) {
    const tag = tier === "chip" ? "span" : "div";
    const drawn = [];
    for (const p of parts) {
      let out;
      try {
        out = p.render(node, { ...ctx, parts: html`` });
      } catch (err) {
        console.error('[graph-explorer] part "' + p.name + '" failed', err);
        continue;
      }
      if (!isSafe(out) || !out.html.trim())
        continue;
      const layer = p.layer;
      drawn.push(tag === "span" ? html`<span
              class="graph-explorer-part"
              data-layer="${layer}"
              style="--graph-explorer-layer: ${this.colorOf(layer)}"
              >${out}</span
            >` : html`<div
              class="graph-explorer-part"
              data-layer="${layer}"
              style="--graph-explorer-layer: ${this.colorOf(layer)}"
            >
              ${out}
            </div>`);
    }
    const joined = html`${drawn}`;
    if (!r)
      return html`<div class="graph-explorer-parts-only" data-tier="${tier}" data-kind="${node.kind}">${joined}</div>`;
    const out = r.render(node, { ...ctx, parts: joined });
    if (!drawn.length || !isSafe(out) || out.html.includes('graph-explorer-part"'))
      return out;
    return html`${out}${joined}`;
  }
  isHighlighted(i) {
    const ends = this.edgeEnds();
    if (ends.length)
      return ends.includes(i) || i === this.hover;
    const foci = [...this.selected].map((id) => this.view.byId.get(id)).filter((x) => x !== undefined);
    if (this.hover >= 0)
      foci.push(this.hover);
    if (!foci.length)
      return true;
    if (foci.includes(i))
      return true;
    return foci.some((f) => this.view.adj[f].some((k) => {
      const e = this.view.edges[k];
      return e.a === i || e.b === i;
    }));
  }
  ctxFor(node, tier, i) {
    return {
      tier,
      selected: this.selected.has(node.id),
      highlighted: i === this.hover,
      focused: i === this.kbd,
      depth: node.depth,
      zoom: this.cam.z,
      html,
      icon,
      expanded: tier === "detail" && this.expanded,
      layers: [...this.shown],
      compact: this.compact,
      parts: html``,
      action: (name) => String(name),
      edgeLabel: (e, t = "label") => this.edgeLabelHtml(e, t),
      fetchView: (id) => this.fetchView(id),
      fetchRows: (id) => this.fetchRows(id),
      expandable: tier === "relations" ? false : this.expandableNode(node),
      request: (key, load) => {
        const r = this.requests.get(key);
        if (r && !r.stale)
          return r.done ? r.value : r.prev;
        const entry = {
          done: false,
          value: undefined,
          prev: r ? r.done ? r.value : r.prev : undefined,
          stale: false
        };
        this.requests.set(key, entry);
        Promise.resolve().then(load).then((value) => {
          entry.done = true;
          entry.value = value;
          this.dataRev.set(node.id, (this.dataRev.get(node.id) || 0) + 1);
          this.applyTiers(this.tiers);
          this.renderPanel();
        }, (err) => {
          entry.done = true;
          entry.value = entry.prev;
          console.error(err);
        });
        return entry.prev;
      },
      fetchDetails: (id) => this.waitFor("details:" + id, () => this.post({ t: "details", id })),
      fetchEdge: (id) => {
        const [a, b] = String(id).split(">");
        return this.waitFor("edge:" + a + ">" + b, () => this.post({ t: "edge", a, b }));
      },
      island: (key, content, mount) => {
        if (mount)
          this.islandMounts.set(key, mount);
        else
          this.islandMounts.delete(key);
        return island(key, content);
      }
    };
  }
  fetchSubtree(id, levels) {
    return this.waitFor("subtree:" + id + ":" + levels, () => this.post({ t: "subtree", id, levels }));
  }
  find(query, onPartial) {
    this.finder?.resolve(this.finder.results);
    this.searchSeq++;
    const seq = this.searchSeq;
    return new Promise((resolve) => {
      this.finder = { seq, resolve, onPartial, results: [] };
      this.post({ t: "search", q: query, seq });
    });
  }
  fetchRows(id) {
    const hit = this.rowCache.get(id);
    if (hit) {
      this.rowCache.delete(id);
      this.rowCache.set(id, hit);
      return hit;
    }
    const p = this.waitFor("rows:" + id, () => this.post({ t: "rows", id }));
    this.rowCache.set(id, p);
    while (this.rowCache.size > 2)
      this.rowCache.delete(this.rowCache.keys().next().value);
    return p;
  }
  expandableNode(node) {
    if (!node || !this.outlets("details").length)
      return false;
    const r = this.pick("detail", node);
    return !!r && (typeof r.page !== "function" || r.page(node) !== false);
  }
  expandableEdge(item = this.edgeItem()) {
    if (!item || !this.outlets("details").length)
      return false;
    const r = this.pickEdgeDetail(item);
    return !!r && (typeof r.page !== "function" || r.page(item) !== false);
  }
  promotedEdges() {
    const m = this.view, out = new Set;
    for (const [target, ch] of this.changes) {
      if (ch.u.kind !== "edge" || !this.shown.has(ch.u.layer))
        continue;
      const k = this.edgeIndex(target);
      if (k >= 0)
        out.add(k);
    }
    if (!this.shown.has("relations"))
      return out;
    const foci = [...this.selected].map((id) => m.byId.get(id)).filter((x) => x !== undefined);
    if (this.hover >= 0)
      foci.push(this.hover);
    if (this.kbd >= 0)
      foci.push(this.kbd);
    const picked = this.edgeIndex(this.edge);
    if (picked >= 0)
      out.add(picked);
    for (const f of foci)
      for (const k of m.adj[f]) {
        if (out.size > 80)
          break;
        out.add(k);
      }
    return out;
  }
  projectEdges() {
    const m = this.view, z = this.cam.z, want = this.promotedEdges();
    for (const [k, p] of this.edgePaths)
      if (!want.has(k)) {
        p.hit.remove();
        p.line.remove();
        p.head.remove();
        p.flash?.remove();
        this.edgePaths.delete(k);
      }
    const picked = this.edgeIndex(this.edge);
    const lines = this.shown.has("relations");
    const NS = "http://www.w3.org/2000/svg";
    for (const k of want) {
      const e = m.edges[k], a = m.children[e.a], b = m.children[e.b];
      const [ax, ay] = this.toScreen(a.x, a.y), [bx, by] = this.toScreen(b.x, b.y);
      const st = e.style;
      const w = e.kind === "agg" ? Math.min(5, st.width * (1 + Math.min(1.6, Math.log10(e.count + e.count2) * 0.7))) : st.width;
      const cl = !m.leafView;
      const g = edgePath(ax, ay, drawR(cl, a.r * z), bx, by, drawR(cl, b.r * z), st, e.bidir, w);
      let p = this.edgePaths.get(k);
      if (!p) {
        p = {
          hit: document.createElementNS(NS, "path"),
          line: document.createElementNS(NS, "path"),
          head: document.createElementNS(NS, "path")
        };
        p.hit.setAttribute("class", "graph-explorer-edge-hit");
        p.line.setAttribute("class", "graph-explorer-edge");
        p.head.setAttribute("class", "graph-explorer-edge-head");
        this.svgG.append(p.hit, p.line, p.head);
        this.edgePaths.set(k, p);
      }
      const id = this.edgeId(k);
      if (p.id !== id) {
        p.id = id;
        p.hit.setAttribute("data-graph-explorer-edge", id);
      }
      const on = k === picked;
      if (p.on !== on) {
        p.on = on;
        p.line.toggleAttribute("data-selected", on);
        p.head.toggleAttribute("data-selected", on);
      }
      const tone = TONES.includes(st.tone) ? st.tone : "muted";
      if (p.tone !== tone) {
        p.tone = tone;
        p.line.setAttribute("data-tone", tone);
        p.head.setAttribute("data-tone", tone);
      }
      const flow = st.flow && e.traffic ? "1" : null, pulse = st.pulse ? "1" : null;
      if (p.flow !== flow) {
        p.flow = flow;
        p.line.toggleAttribute("data-flow", !!flow);
      }
      if (p.pulse !== pulse) {
        p.pulse = pulse;
        p.line.toggleAttribute("data-pulse", !!pulse);
      }
      const dash = !flow && st.dash ? st.dash.join(" ") : "";
      if (p.dash !== dash) {
        p.dash = dash;
        if (dash)
          p.line.setAttribute("stroke-dasharray", dash);
        else
          p.line.removeAttribute("stroke-dasharray");
      }
      p.line.setAttribute("stroke-width", (w + 0.75).toFixed(2));
      p.line.setAttribute("d", g ? g.d : "");
      p.hit.setAttribute("d", g ? g.d : "");
      p.head.setAttribute("d", g ? g.head : "");
      p.mid = g ? g.mid : null;
      if (p.lines !== lines) {
        p.lines = lines;
        p.line.style.visibility = p.head.style.visibility = lines ? "" : "hidden";
      }
      const ch = this.changes.get(id);
      const flash = ch && ch.u.kind === "edge" && this.shown.has(ch.u.layer) ? ch : null;
      if (flash && p.flashAt !== flash.at) {
        p.flash?.remove();
        p.flash = document.createElementNS(NS, "path");
        p.flash.setAttribute("class", "graph-explorer-edge-flash");
        p.flash.setAttribute("data-layer", flash.u.layer);
        p.flash.style.setProperty("--graph-explorer-layer", this.colorOf(flash.u.layer));
        p.flash.style.animationDuration = `${CHANGE_MS}ms`;
        p.line.after(p.flash);
        p.flashAt = flash.at;
      } else if (!flash && p.flash) {
        p.flash.remove();
        p.flash = null;
        p.flashAt = null;
      }
      if (p.flash) {
        p.flash.setAttribute("d", g ? g.d : "");
        p.flash.setAttribute("stroke-width", (w + 3).toFixed(2));
      }
    }
  }
  labelPlugins(graph = false) {
    return this.edgePlugins().filter((p) => p.label && (!graph || this.shown.has(p.layer || "labels")));
  }
  labelFor(e, ctx) {
    const sig = e.breaker ? e.breaker.state + (e.breaker.openShare || 0) : "";
    if (e._lv !== this.labelVer || e._ls !== sig) {
      e._lv = this.labelVer;
      e._ls = sig;
      let best = null, score = -Infinity;
      for (const p of this.labelPlugins(true)) {
        const L = p.label;
        if (L.depths && !L.depths.includes(ctx.depth))
          continue;
        let sc;
        try {
          sc = L.match(e, ctx);
        } catch (err) {
          console.error(err);
          sc = false;
        }
        if (sc === false || sc == null)
          continue;
        sc += p._scoped ? 1000 : 0;
        if (sc > score) {
          best = p;
          score = sc;
        }
      }
      e._lp = best;
    }
    return e._lp;
  }
  edgeLabelHtml(e, tier) {
    const depth = this.view ? this.view.path.length - 1 : 0;
    const ctx = this.edgeCtx(depth, tier);
    let best = null, score = -Infinity;
    for (const p of this.labelPlugins()) {
      let sc;
      try {
        sc = p.label.match(e, ctx);
      } catch {
        sc = false;
      }
      if (sc !== false && sc != null && sc + (p._scoped ? 1000 : 0) > score) {
        best = p;
        score = sc + (p._scoped ? 1000 : 0);
      }
    }
    if (!best)
      return html``;
    try {
      return best.label.render(e, ctx);
    } catch (err) {
      console.error(err);
      return html``;
    }
  }
  edgeCtx(depth, tier) {
    return { tier, depth, zoom: this.cam.z, html, icon, view: this.view && this.view.id };
  }
  refreshDecor(reset) {
    const m = this.view;
    if (reset || !m || !this.tiers) {
      for (const h of this.labelHosts.values()) {
        h.hidden = true;
        h._sig = "";
        this.labelPool.push(h);
      }
      this.labelHosts.clear();
      if (!m || !this.tiers)
        return;
    }
    const z = this.cam.z, depth = m.path.length - 1, W = this.w, H = this.h;
    const foci = new Set([...this.selected].map((id) => m.byId.get(id)).filter((x) => x !== undefined));
    for (const end of this.edgeEnds())
      foci.add(end);
    if (this.hover >= 0)
      foci.add(this.hover);
    const picked = this.edgeIndex(this.edge);
    const isCluster = !m.leafView, cands = [];
    const ctx0 = this.edgeCtx(depth, "icon");
    for (const e of m.edges) {
      const a = m.children[e.a], b = m.children[e.b];
      const [ax, ay] = this.toScreen(a.x, a.y), [bx, by] = this.toScreen(b.x, b.y);
      const len = Math.hypot(bx - ax, by - ay) - drawR(isCluster, a.r * z) - drawR(isCluster, b.r * z);
      if (len < 24)
        continue;
      const mx = (ax + bx) / 2, my = (ay + by) / 2;
      if (mx < -20 || mx > W + 20 || my < -20 || my > H + 20)
        continue;
      const p = this.labelFor(e, ctx0);
      if (!p || len < p.label.levels.icon)
        continue;
      const focus = foci.has(e.a) || foci.has(e.b);
      if (foci.size && !focus && (this.selected.size || this.edge))
        continue;
      let pr = 0;
      try {
        pr = p.label.priority ? +p.label.priority(e, ctx0) || 0 : 0;
      } catch {
        pr = 0;
      }
      cands.push({
        e,
        p,
        len,
        pr: pr + (e.k === picked ? 5000 : 0) + (focus ? 1000 : 0) + (p._scoped ? 0.5 : 0),
        ax,
        ay,
        bx,
        by
      });
    }
    cands.sort((p, q) => q.pr - p.pr || q.len - p.len);
    const cell = 64, grid = new Map;
    const hit = (x, y, w, h) => {
      for (let gx = Math.floor(x / cell);gx <= Math.floor((x + w) / cell); gx++)
        for (let gy = Math.floor(y / cell);gy <= Math.floor((y + h) / cell); gy++) {
          const l = grid.get(gx * 7919 + gy);
          if (!l)
            continue;
          for (const r of l)
            if (x < r[0] + r[2] + 2 && x + w + 2 > r[0] && y < r[1] + r[3] + 2 && y + h + 2 > r[1])
              return true;
        }
      return false;
    };
    const put = (x, y, w, h) => {
      const r = [x, y, w, h];
      for (let gx = Math.floor(x / cell);gx <= Math.floor((x + w) / cell); gx++)
        for (let gy = Math.floor(y / cell);gy <= Math.floor((y + h) / cell); gy++) {
          const k = gx * 7919 + gy;
          let l = grid.get(k);
          if (!l)
            grid.set(k, l = []);
          l.push(r);
        }
    };
    for (const [i, sl] of this.slots) {
      const n = m.children[i], [sx, sy] = this.toScreen(n.x, n.y);
      const [x, y] = anchorBox(isCluster, sl._tier, sx, sy, n.r * z, sl._w, sl._h);
      put(x, y, sl._w, sl._h);
    }
    for (const r of this.dotLabels)
      put(r[0], r[1], r[2], r[3]);
    const used = { icon: 0, label: 0, full: 0 }, usedBy = new Map, chosen = [];
    for (const c of cands) {
      if (chosen.length >= 200)
        break;
      const L = c.p.label;
      let mine = usedBy.get(c.p);
      if (!mine)
        usedBy.set(c.p, mine = { icon: 0, label: 0, full: 0 });
      for (let t = 2;t >= 0; t--) {
        const tier = LABEL_TIERS[t];
        if (c.len < L.levels[tier] || used[tier] >= LABEL_BUDGET[tier])
          continue;
        if (L.budget && L.budget[tier] != null && mine[tier] >= L.budget[tier])
          continue;
        const [w, h] = L.sizes[tier];
        if (c.len < w * 0.9 + 8 && t > 0)
          continue;
        let placed = -1;
        for (const f of [0.5, 0.38, 0.62]) {
          const x = c.ax + (c.bx - c.ax) * f - w / 2, y = c.ay + (c.by - c.ay) * f - h / 2;
          if (!hit(x, y, w, h)) {
            put(x, y, w, h);
            placed = f;
            break;
          }
        }
        if (placed < 0)
          continue;
        used[tier]++;
        mine[tier]++;
        chosen.push({ c, tier, f: placed });
        break;
      }
    }
    const next = new Map, jobs = [], jobHosts = [];
    for (const { c, tier, f } of chosen) {
      const e = c.e;
      let hst = this.labelHosts.get(e.k);
      if (!hst) {
        hst = this.labelPool.pop();
        if (!hst) {
          hst = dfDollar10('<div class="graph-explorer-edge-label"></div>').get(0);
          dfDollar10(this.labelsEl).append(hst);
        }
        hst._sig = "";
      }
      this.labelHosts.delete(e.k);
      next.set(e.k, hst);
      hst.hidden = false;
      hst._f = f;
      hst._k = e.k;
      if (hst.hasAttribute("data-selected") !== (e.k === picked))
        dfDollar10(hst).attr("data-selected", e.k === picked ? "" : null);
      let out;
      try {
        out = c.p.label.render(e, {
          ...this.edgeCtx(depth, tier),
          source: m.children[e.a],
          target: m.children[e.b],
          selected: foci.has(e.a) || foci.has(e.b)
        });
      } catch (err) {
        console.error('[graph-explorer] edge label "' + c.p.name + '" failed', err);
        continue;
      }
      if (!isSafe(out))
        continue;
      const sig = tier + "|" + out.html;
      if (hst._sig === sig)
        continue;
      hst._sig = sig;
      dfDollar10(hst).attr("data-tier", tier);
      const layer = c.p.layer || "labels";
      dfDollar10(hst).attr("data-layer", layer);
      hst.style.setProperty("--graph-explorer-layer", this.colorOf(layer));
      dfDollar10(hst).attr("data-edge", String(e.k));
      dfDollar10(hst).attr("data-graph-explorer-edge", this.edgeId(e.k));
      jobs.push(out);
      jobHosts.push(hst);
    }
    for (const h of this.labelHosts.values()) {
      h.hidden = true;
      h._sig = "";
      this.labelPool.push(h);
    }
    this.labelHosts = next;
    if (jobs.length) {
      let lists;
      try {
        lists = vnodesBatch(jobs);
      } catch (err) {
        console.error(err);
        lists = jobs.map(() => []);
      }
      lists.forEach((list, k) => morphRuntime.morph(jobHosts[k], list));
    }
    this.camDirty = true;
  }
  edgePlugins() {
    return [...this.registry.edge, ...globalRegistry.edge].sort((a, b) => b._scoped - a._scoped || b._order - a._order);
  }
  projectDecor() {
    const m = this.view;
    if (!m)
      return;
    for (const [k, hst] of this.labelHosts) {
      const e = m.edges[k];
      if (!e) {
        hst.hidden = true;
        continue;
      }
      const a = m.children[e.a], b = m.children[e.b], f = hst._f;
      const [ax, ay] = this.toScreen(a.x, a.y), [bx, by] = this.toScreen(b.x, b.y);
      hst.style.translate = `${Math.round(ax + (bx - ax) * f)}px ${Math.round(ay + (by - ay) * f)}px`;
    }
  }
  projectSigns() {
    const m = this.view, list = [];
    const inset = 14, w = this.w, h = this.h;
    const offscreen = (sx, sy) => sx < inset || sx > w - inset || sy < inset || sy > h - inset;
    const rel = this.shown.has("relations");
    if (m.parent && rel)
      for (const ext of m.parent.external) {
        const [sx, sy] = this.toScreen(ext.x, ext.y);
        if (offscreen(sx, sy))
          list.push({
            key: "x" + ext.id,
            sx,
            sy,
            label: ext.label,
            count: ext.out + ext.in,
            dir: ext.out && ext.in ? "↔" : ext.out ? "→" : "←",
            tone: ext.style.tone,
            goto: ext.id,
            ext: true
          });
      }
    const sel = rel ? [...this.selected].map((id) => m.byId.get(id)).filter((x) => x !== undefined) : [];
    for (const f of sel)
      for (const k of m.adj[f]) {
        const e = m.edges[k], j = e.a === f ? e.b : e.a, n = m.children[j];
        const [sx, sy] = this.toScreen(n.x, n.y);
        if (offscreen(sx, sy))
          list.push({
            key: "n" + n.id,
            sx,
            sy,
            label: n.label,
            count: e.count + e.count2,
            dir: e.a === f ? "→" : "←",
            tone: e.style.tone,
            goto: n.id,
            ext: false
          });
      }
    list.sort((a, b) => b.count - a.count);
    const top = list.slice(0, 10);
    const keys = top.map((s) => s.key + s.tone).join(",");
    if (keys !== this.signKeys) {
      this.signKeys = keys;
      morph2(this.signs, html`${top.map((s) => html`<button
              type="button"
              class="graph-explorer-sign"
              key="${s.key}"
              data-graph-explorer-goto="${s.goto}"
              data-ext="${s.ext ? "1" : "0"}"
              data-tone="${s.tone}"
              title="Go to ${s.label}"
            >
              ${s.dir} ${s.label} · ${fmt(s.count)}
            </button>`)}`);
    }
    const els = dfDollar10(this.signs).children().toArray();
    const cx = w / 2, cy = h / 2;
    top.forEach((s, j) => {
      const el = els[j];
      if (!el)
        return;
      const dx = s.sx - cx, dy = s.sy - cy, t = Math.min((w / 2 - inset - 60) / Math.abs(dx || 0.000001), (h / 2 - inset - 12) / Math.abs(dy || 0.000001));
      el.style.translate = `${Math.round(cx + dx * t)}px ${Math.round(cy + dy * t)}px`;
    });
  }
  projectFocusRing() {
    const i = this.kbd;
    if (i < 0 || this.slots.has(i) || !this.view.children[i]) {
      this.focusRing.hidden = true;
      return;
    }
    const n = this.view.children[i], [sx, sy] = this.toScreen(n.x, n.y), r = Math.max(6, drawR(!this.view.leafView, n.r * this.cam.z)) + 4;
    this.focusRing.hidden = false;
    this.focusRing.style.translate = `${Math.round(sx - r)}px ${Math.round(sy - r)}px`;
    this.focusRing.style.width = this.focusRing.style.height = Math.round(r * 2) + "px";
  }
  autoDepth() {
    const m = this.view, c = this.cam, vmin = this.vmin;
    if (!m || this.loading || this.syncing)
      return;
    if (m.parent && 2 * c.z < 0.38 * vmin) {
      this.up(false);
      return;
    }
    if (m.parent && Math.hypot(c.cx, c.cy) > 1.04) {
      this.up(false);
      return;
    }
    if (m.leafView)
      return;
    for (const n of m.children) {
      const d = Math.hypot(n.x - c.cx, n.y - c.cy);
      if (d > n.r)
        continue;
      const dia = 2 * n.r * c.z;
      if (dia >= 0.45 * vmin)
        this.fetchView(n.id);
      if (dia >= 0.85 * vmin) {
        this.rebaseDown(n.i);
        return;
      }
    }
  }
  async rebaseDown(i) {
    const n = this.view.children[i];
    if (this.diving === n.id)
      return;
    this.diving = n.id;
    const child = await this.fetchView(n.id);
    this.diving = null;
    if (!this.view || this.view.children[i]?.id !== n.id)
      return;
    const conv = (cam) => cam && { ...cam, cx: (cam.cx - n.x) / n.r, cy: (cam.cy - n.y) / n.r, z: cam.z * n.r };
    const keep = this.selected;
    this.cam = conv(this.cam);
    this.bitmapCam = conv(this.bitmapCam);
    if (this.flight)
      this.flight = null;
    this.selected = new Set([...keep].filter((id) => child.byId.has(id)));
    this.setView(child);
    this.camChanged();
  }
  async up(animate = true) {
    const m = this.view;
    if (!m || !m.parent || this.upping)
      return false;
    this.upping = true;
    const parent = await this.fetchView(m.parent.id);
    this.upping = false;
    if (this.view !== m)
      return false;
    const p = m.parent;
    const conv = (cam) => cam && { ...cam, cx: p.x + cam.cx * p.r, cy: p.y + cam.cy * p.r, z: cam.z / p.r };
    this.cam = conv(this.cam);
    this.bitmapCam = conv(this.bitmapCam);
    this.flight = null;
    this.setView(parent);
    this.kbd = parent.byId.get(m.id) ?? -1;
    this.camChanged();
    if (animate)
      await this.flyTo({ cx: 0, cy: 0, z: this.fitZ() });
    return true;
  }
  async dive(i, animate = true) {
    const n = this.view.children[i];
    if (!n || n.kind !== "cluster")
      return;
    this.fetchView(n.id);
    await this.flyTo({ cx: n.x, cy: n.y, z: 0.9 * this.vmin / (2 * n.r) }, { animate });
    if (this.view.children[i] && this.view.children[i].id === n.id)
      await this.rebaseDown(i);
  }
  fitZ() {
    if (!this.w)
      this.size();
    return this.vmin / 2 / 1.04;
  }
  fit(animate = true) {
    return this.flyTo({ cx: 0, cy: 0, z: this.fitZ() }, { animate });
  }
  flyTo(target, opts = {}) {
    if (!this.w)
      this.size();
    const animate = opts.animate !== false && !reducedMotion4();
    if (this.flight)
      this.flight.done("interrupted");
    if (!animate) {
      Object.assign(this.cam, target);
      this.camChanged();
      return Promise.resolve("done");
    }
    const c = this.cam, path = zoomPath([c.cx, c.cy, this.vmin / c.z], [target.cx, target.cy, this.vmin / target.z]);
    return new Promise((resolve) => {
      this.flight = {
        path,
        start: performance.now(),
        ms: opts.ms || path.ms,
        done: (r) => {
          this.flight = null;
          resolve(r);
        }
      };
      this.requestTick();
    });
  }
  stepFlight(now) {
    const f = this.flight, t = clamp3((now - f.start) / f.ms, 0, 1), [cx, cy, w] = f.path.at(ease(t));
    this.cam.cx = cx;
    this.cam.cy = cy;
    this.cam.z = this.vmin / w;
    this.camChanged();
    if (t >= 1)
      f.done("done");
  }
  stopFlight() {
    if (this.flight)
      this.flight.done("interrupted");
  }
  async navigateTo(id, opts = {}) {
    if (!id)
      return;
    await this.ready;
    this.navigating = true;
    const animate = opts.animate !== false;
    try {
      const path = await this.waitFor("path:" + id, () => this.post({ t: "path", id }));
      if (!path || !path.length)
        return;
      const ids = path.map((p) => p.id);
      const above = opts.enter ? ids : ids.slice(0, -1);
      let climbed = false;
      while (!above.includes(this.view.id)) {
        if (!await this.up(false))
          break;
        climbed = true;
      }
      if (climbed)
        await this.fit(animate);
      let depth = ids.indexOf(this.view.id);
      while (depth < ids.length - 2) {
        const nextId = ids[depth + 1], i = this.view.byId.get(nextId);
        if (i === undefined)
          break;
        await this.dive(i, animate);
        depth = ids.indexOf(this.view.id);
      }
      const i = this.view.byId.get(id);
      if (i !== undefined && opts.enter && this.view.children[i].kind === "cluster") {
        await this.dive(i, animate);
        await this.fit(animate);
      } else if (i !== undefined) {
        if (opts.select !== false)
          this.select([id]);
        this.kbd = i;
        await this.focusNode(i, animate);
      }
    } finally {
      this.navigating = false;
      this.requestTick();
      if (this.expanded)
        this.commitState();
    }
  }
  focusNode(i, animate = true) {
    const n = this.view.children[i], want = this.view.leafView ? 90 / (2 * n.r) : Math.min(0.6 * this.vmin / (2 * n.r), 260 / (2 * n.r) * 1.2);
    return this.flyTo({ cx: n.x, cy: n.y, z: Math.max(this.cam.z, want) }, { animate });
  }
  edgeIndex(id) {
    if (!id || !this.view?.edgeById)
      return -1;
    const [a, b] = id.split(">");
    return this.view.edgeById.get(a + ">" + b) ?? this.view.edgeById.get(b + ">" + a) ?? -1;
  }
  edgeId(k) {
    const e = this.view.edges[k];
    return this.view.children[e.a].id + ">" + this.view.children[e.b].id;
  }
  edgeEnds() {
    const k = this.edgeIndex(this.edge);
    if (k < 0)
      return [];
    const e = this.view.edges[k];
    return [e.a, e.b];
  }
  selectEdge(id) {
    const k = this.edgeIndex(id);
    const next = k >= 0 ? this.edgeId(k) : null;
    if (next === this.edge && !this.selected.size)
      return;
    this.edge = next;
    this.selected = new Set;
    if (next)
      this.kbd = -1;
    this.afterSelection();
  }
  expandEdge(user = true) {
    if (!this.edge || !this.expandableEdge())
      return;
    const panel = this.detailsPanel();
    if (panel?.api && panel.api.getState().name !== "maximized")
      panel.api.setState("maximized");
    this.setExpanded(true, user);
  }
  select(ids, additive = false) {
    this.edge = null;
    const next = additive ? new Set(this.selected) : new Set;
    for (const id of ids) {
      if (additive && next.has(id))
        next.delete(id);
      else
        next.add(id);
    }
    this.selected = next;
    this.afterSelection();
  }
  afterSelection() {
    const only = this.selected.size === 1 ? this.view?.byId.get([...this.selected][0]) : undefined;
    if (only !== undefined)
      this.kbd = only;
    this.applyTiers(this.tiers);
    this.renderPanel();
    this.renderOutline();
    if (!this.selected.size && !this.edge && this.expanded && !this.navigating)
      this.collapseDetails();
    this.commitState();
    this.el.dispatchEvent(new CustomEvent("graph-explorer-select", {
      detail: { selected: [...this.selected], edge: this.edge },
      bubbles: true
    }));
    this.camChanged();
  }
  setHover(i) {
    if (i === this.hover)
      return;
    this.hover = i;
    this.el.toggleAttribute("data-dim", this.hover >= 0 || this.selected.size > 0 || !!this.edge);
    for (const [j, s] of this.slots)
      s.toggleAttribute("data-hl", this.isHighlighted(j));
    this.camChanged();
  }
  primary(i) {
    const n = this.view.children[i];
    if (!n)
      return;
    if (n.kind === "cluster")
      this.dive(i, true);
    else
      this.expandNode(i);
  }
  nodeAt(ev) {
    const slot = ev.target?.closest?.(".graph-explorer-node");
    if (slot && slot._node)
      return this.view.byId.get(slot._node) ?? -1;
    const r = this.el.getBoundingClientRect(), px = ev.clientX - r.left, py = ev.clientY - r.top;
    const c = this.cam, wx = (px - this.w / 2) / c.z + c.cx, wy = (py - this.h / 2) / c.z + c.cy;
    let best = -1, bestR = Infinity, bestD = Infinity;
    for (const n of this.view.children) {
      const d = Math.hypot(n.x - wx, n.y - wy);
      if (d <= n.r && n.r < bestR) {
        best = n.i;
        bestR = n.r;
        bestD = 0;
      } else if (best < 0 || bestD > 0) {
        const ds = (d - n.r) * c.z;
        if (ds < 8 && ds < bestD) {
          best = n.i;
          bestD = ds;
        }
      }
    }
    return best;
  }
  bringAndGo(i) {
    const m = this.view, n = m.children[i];
    if (!n)
      return;
    const nbrs = m.adj[i].map((k) => {
      const e = m.edges[k];
      return { j: e.a === i ? e.b : e.a, count: e.count + e.count2, tone: e.style.tone };
    }).sort((a, b) => b.count - a.count).slice(0, 12);
    if (!nbrs.length) {
      this.announce(`${n.label} has no neighbours at this level`);
      return;
    }
    this.ringFor = { i, nbrs, opened: performance.now() };
    morph2(this.ring, html`<span class="graph-explorer-ring-center" aria-hidden="true"></span>${nbrs.map((b, k) => html`<button
              type="button"
              class="graph-explorer-ring-item"
              key="r${b.j}"
              data-graph-explorer-ring="${b.j}"
              data-tone="${b.tone}"
              style="--k:${k}"
            >
              ${m.children[b.j].label}<span class="graph-explorer-count">${fmt(b.count)}</span>
            </button>`)}`);
    this.ring.hidden = false;
    this.ringEls = dfDollar10(this.ring).find(".graph-explorer-ring-item").toArray();
    this.ringStart = true;
    this.projectRing();
    requestAnimationFrame(() => {
      this.ringStart = false;
      this.projectRing();
    });
    this.announce(`Jump to a neighbour: ${nbrs.length} neighbours of ${n.label} around it. Choose one to fly there.`);
    this.ringEls[0]?.focus({ preventScroll: true });
  }
  projectRing() {
    const r = this.ringFor;
    if (!r)
      return;
    const n = this.view.children[r.i], [cx, cy] = this.toScreen(n.x, n.y);
    const center = dfDollar10(this.ring).find(".graph-explorer-ring-center").get(0);
    if (center)
      center.style.translate = `${Math.round(cx)}px ${Math.round(cy)}px`;
    const R = 120 + Math.max(0, r.nbrs.length - 8) * 8;
    r.nbrs.forEach((b, k) => {
      const el = this.ringEls[k];
      if (!el)
        return;
      let x, y;
      if (this.ringStart) {
        const t = this.view.children[b.j];
        [x, y] = this.toScreen(t.x, t.y);
        x = clamp3(x, 0, this.w);
        y = clamp3(y, 0, this.h);
      } else {
        const a = -Math.PI / 2 + k / r.nbrs.length * Math.PI * 2;
        x = cx + Math.cos(a) * R;
        y = cy + Math.sin(a) * R;
      }
      el.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
    });
  }
  closeRing() {
    if (this.ring.hidden)
      return false;
    this.ring.hidden = true;
    this.ringFor = null;
    morph2(this.ring, []);
    return true;
  }
  async travel(j) {
    this.closeRing();
    const n = this.view.children[j];
    if (!n)
      return;
    this.kbd = j;
    this.select([n.id]);
    await this.focusNode(j);
    this.el.focus({ preventScroll: true });
  }
  bindEvents() {
    const vp = this.el, pointers = new Map;
    let drag = null, lastTap = { i: -2, t: 0 }, pinch = null, press = 0;
    const inChrome = (t) => !!t.closest(".graph-explorer-sign, .graph-explorer-ring-item, .graph-explorer-help, [data-graph-explorer-action], button, a, input");
    dfDollar10(vp).on("pointerdown", (ev) => {
      if (inChrome(ev.target) || !this.view)
        return;
      vp.focus({ preventScroll: true });
      this.stopFlight();
      pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      vp.setPointerCapture?.(ev.pointerId);
      if (pointers.size === 2) {
        const [p, q] = [...pointers.values()];
        pinch = { d: Math.hypot(p.x - q.x, p.y - q.y), z: this.cam.z };
        drag = null;
        clearTimeout(press);
        return;
      }
      const label = ev.target.closest?.(".graph-explorer-edge-label[data-graph-explorer-edge]");
      const i = label ? -1 : this.nodeAt(ev);
      const edge = label ?? (i < 0 ? ev.target.closest?.("[data-graph-explorer-edge]") : null);
      drag = {
        x: ev.clientX,
        y: ev.clientY,
        sx: ev.clientX,
        sy: ev.clientY,
        moved: false,
        i,
        edge: edge?.getAttribute("data-graph-explorer-edge") ?? null
      };
      clearTimeout(press);
      if (i >= 0)
        press = setTimeout(() => {
          if (drag && !drag.moved) {
            drag.longPressed = true;
            this.bringAndGo(i);
          }
        }, 550);
    });
    dfDollar10(vp).on("pointermove", (ev) => {
      if (pointers.has(ev.pointerId))
        pointers.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (pinch && pointers.size === 2) {
        const [p, q] = [...pointers.values()], d = Math.hypot(p.x - q.x, p.y - q.y), r = vp.getBoundingClientRect();
        this.zoomAt((p.x + q.x) / 2 - r.left, (p.y + q.y) / 2 - r.top, pinch.z * d / pinch.d / this.cam.z);
        return;
      }
      if (drag) {
        const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
        if (!drag.moved && Math.hypot(ev.clientX - drag.sx, ev.clientY - drag.sy) > 5) {
          drag.moved = true;
          clearTimeout(press);
          vp.setAttribute("data-panning", "");
        }
        if (drag.moved && !drag.longPressed) {
          this.cam.cx -= dx / this.cam.z;
          this.cam.cy -= dy / this.cam.z;
          this.camChanged();
        }
        drag.x = ev.clientX;
        drag.y = ev.clientY;
        return;
      }
      if (ev.pointerType === "mouse" && this.view && !inChrome(ev.target))
        this.setHover(ev.target.closest?.(".graph-explorer-edge-label") ? -1 : this.nodeAt(ev));
    });
    const end = (ev) => {
      pointers.delete(ev.pointerId);
      if (pointers.size < 2)
        pinch = null;
      clearTimeout(press);
      vp.removeAttribute("data-panning");
      const d = drag;
      drag = null;
      if (!d || d.moved || !this.view)
        return;
      if (d.longPressed) {
        const item = document.elementFromPoint(ev.clientX, ev.clientY)?.closest(".graph-explorer-ring-item");
        if (item)
          this.travel(+(item.getAttribute("data-graph-explorer-ring") ?? -1));
        return;
      }
      if (this.closeRing())
        return;
      const i = d.i, now = performance.now();
      if (i < 0 && d.edge) {
        const twice = lastTap.i === -3 && lastTap.edge === d.edge && now - lastTap.t < 320;
        lastTap = { i: -3, t: now, edge: d.edge };
        this.selectEdge(d.edge);
        if (twice)
          this.expandEdge();
        else
          this.showDetails();
        return;
      }
      if (i >= 0 && lastTap.i === i && now - lastTap.t < 320) {
        lastTap = { i: -2, t: 0 };
        this.primary(i);
        return;
      }
      lastTap = { i, t: now };
      if (i >= 0) {
        this.kbd = i;
        this.select([this.view.children[i].id], ev.shiftKey);
        this.showDetails();
      } else if (this.selected.size)
        this.select([]);
    };
    dfDollar10(vp).on("pointerup", end);
    dfDollar10(vp).on("pointercancel", end);
    dfDollar10(vp).on("pointerleave", (ev) => {
      if (ev.pointerType === "mouse" && !drag)
        this.setHover(-1);
    });
    vp.addEventListener("wheel", (ev) => {
      if (!this.view)
        return;
      ev.preventDefault();
      this.stopFlight();
      const r = vp.getBoundingClientRect(), k = ev.ctrlKey ? 0.012 : 0.0016;
      this.zoomAt(ev.clientX - r.left, ev.clientY - r.top, Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 16 : 1) * k));
    }, { passive: false });
    dfDollar10(vp).on("keydown", (ev) => this.onKey(ev));
    dfDollar10(vp).on("click", (ev) => this.onClick(ev));
    this.resizeObserver = new ResizeObserver(() => {
      this.size();
      this.camChanged();
    });
    this.resizeObserver.observe(vp);
    this.attrObserver = new MutationObserver(() => void this.sync());
    this.attrObserver.observe(vp, {
      attributes: true,
      attributeFilter: [
        "data-focus",
        "data-selected",
        "data-selected-edge",
        "data-layers",
        "data-compact",
        "data-expanded",
        "data-hud"
      ]
    });
  }
  onClick(ev) {
    const t = ev.target;
    if (!t?.closest)
      return;
    const act = t.closest("[data-graph-explorer-action]");
    if (act) {
      const slot = act.closest(".graph-explorer-node");
      const id = slot ? slot._node : [...this.selected][0] ?? null;
      this.act(act.getAttribute("data-graph-explorer-action") ?? "", id, act);
      return;
    }
    const upd = t.closest("[data-graph-explorer-update]");
    if (upd) {
      this.openUpdate(upd.getAttribute("data-graph-explorer-update") ?? "");
      return;
    }
    const layer = t.closest("[data-graph-explorer-layer]");
    if (layer) {
      this.toggleLayer(layer.getAttribute("data-graph-explorer-layer") ?? "");
      return;
    }
    if (t.closest("[data-graph-explorer-compact]")) {
      this.setCompact(!this.compact);
      return;
    }
    const ring = t.closest("[data-graph-explorer-ring]");
    if (ring) {
      this.travel(+(ring.getAttribute("data-graph-explorer-ring") ?? -1));
      return;
    }
    const link = t.closest("[data-graph-explorer-edge]");
    if (link && this.view) {
      this.selectEdge(link.getAttribute("data-graph-explorer-edge"));
      this.showDetails(true);
      return;
    }
    const goto = t.closest("[data-graph-explorer-goto]");
    if (goto && this.view) {
      const id = goto.getAttribute("data-graph-explorer-goto") ?? "";
      if (this.expanded)
        this.navigateTo(id, { animate: false });
      else if (goto.getAttribute("data-ext") === "1")
        this.goSibling(id);
      else {
        const i = this.view.byId.get(id);
        if (i !== undefined)
          this.travel(i);
        else
          this.navigateTo(id);
      }
      return;
    }
    const crumb = t.closest("[data-graph-explorer-crumb]");
    if (crumb) {
      ev.preventDefault();
      this.upTo(crumb.getAttribute("data-graph-explorer-crumb") ?? "c0");
      return;
    }
    const res = t.closest("[data-graph-explorer-result]");
    if (res) {
      this.chooseResult(+(res.getAttribute("data-graph-explorer-result") ?? -1));
      return;
    }
    const oi = t.closest("[data-graph-explorer-outline]");
    if (oi && this.view) {
      const i = +(oi.getAttribute("data-graph-explorer-outline") ?? -1);
      if (i >= 0) {
        this.kbd = i;
        this.select([this.view.children[i].id]);
        this.focusNode(i);
      }
    }
  }
  async act(action, id, button) {
    if (!this.view)
      return;
    const i = id ? this.view.byId.get(id) : undefined;
    const own = ["up", "fit", "live", "help", "collapse"].includes(action);
    this.el.dispatchEvent(new CustomEvent("graph-explorer-action", {
      detail: { action, id: own ? null : id },
      bubbles: true
    }));
    if (action === "up")
      await this.up(true);
    else if (action === "fit")
      await this.fit(true);
    else if (action === "help")
      this.help.togglePopover();
    else if (action === "live") {
      const on = !this.simulating;
      this.simulating = on;
      this.post({ t: "simulate", on });
      for (const b of boundOf(this.el, '[data-graph-explorer-action="live"]'))
        dfDollar10(b).attr("aria-pressed", String(on));
      if (button && !button.closest(`[${FOR}]`))
        dfDollar10(button).attr("aria-pressed", String(on));
    } else if (action === "collapse")
      this.collapseDetails();
    else if (i === undefined) {
      if (action === "expand" && this.edge)
        this.expandEdge();
    } else if (action === "enter")
      await this.dive(i, true);
    else if (action === "bring")
      this.bringAndGo(i);
    else if (action === "details") {
      this.select([id]);
      this.showDetails(true);
    } else if (action === "expand")
      this.expandNode(i);
  }
  zoomAt(px, py, f) {
    const c = this.cam, m = this.view;
    if (!m)
      return;
    const wx = (px - this.w / 2) / c.z + c.cx, wy = (py - this.h / 2) / c.z + c.cy;
    let minZ = this.vmin * 0.05, maxZ = this.vmin * 40;
    if (!m.parent)
      minZ = this.fitZ() / 3;
    if (m.leafView)
      maxZ = 240 / (m.children[0] ? m.children[0].r : 0.02);
    c.z = clamp3(c.z * f, minZ, maxZ);
    c.cx = wx - (px - this.w / 2) / c.z;
    c.cy = wy - (py - this.h / 2) / c.z;
    this.camChanged();
  }
  async goSibling(id) {
    await this.up(false);
    const i = this.view.byId.get(id);
    if (i !== undefined)
      await this.travel(i);
  }
  async upTo(id, animate = true) {
    while (this.view.id !== id && this.view.parent) {
      if (!await this.up(false))
        break;
    }
    await this.fit(animate);
  }
  onKey(ev) {
    const m = this.view, t = ev.target;
    if (!m)
      return;
    if (ev.key === "/" && !t.closest("input, textarea")) {
      const input = this.searchInputs()[0];
      if (input) {
        ev.preventDefault();
        input.focus();
        input.select();
      }
      return;
    }
    if (t !== this.el && !t.closest(".graph-explorer-ring"))
      return;
    const key = ev.key, pan = 0.15 * this.vmin / this.cam.z;
    const dirs = {
      ArrowLeft: [-1, 0],
      ArrowRight: [1, 0],
      ArrowUp: [0, -1],
      ArrowDown: [0, 1]
    };
    if (dirs[key]) {
      ev.preventDefault();
      this.stopFlight();
      const [dx, dy] = dirs[key];
      if (ev.shiftKey || !this.moveFocus(dx, dy)) {
        this.cam.cx += dx * pan;
        this.cam.cy += dy * pan;
        this.camChanged();
      }
      return;
    }
    if (key === "Enter") {
      ev.preventDefault();
      if (this.kbd >= 0)
        this.primary(this.kbd);
      return;
    }
    if (key === " ") {
      ev.preventDefault();
      if (this.kbd >= 0) {
        this.select([m.children[this.kbd].id], ev.shiftKey);
        this.showDetails(true);
      }
      return;
    }
    if (key === "e" || key === "E") {
      ev.preventDefault();
      const i = this.kbd >= 0 ? this.kbd : m.byId.get([...this.selected][0]);
      if (this.edge && !this.selected.size && this.kbd < 0)
        this.expandEdge();
      else if (i !== undefined && i >= 0)
        this.expandNode(i);
      return;
    }
    if (/^[1-9]$/.test(key) && !ev.metaKey && !ev.ctrlKey && !ev.altKey) {
      const l = this.layerDefs()[+key - 1];
      if (l) {
        ev.preventDefault();
        this.toggleLayer(l.name);
      }
      return;
    }
    if (key === "Escape") {
      ev.preventDefault();
      if (this.closeRing()) {
        this.el.focus();
        return;
      }
      if (this.help.matches(":popover-open")) {
        this.help.hidePopover();
        return;
      }
      if (this.expanded) {
        this.collapseDetails();
        return;
      }
      const host = this.el.closest(".panel");
      if (host?.hasAttribute("data-maximized") && host.api) {
        host.api.setState("default");
        return;
      }
      if (this.edge) {
        this.selectEdge(null);
        return;
      }
      this.up(true);
      return;
    }
    if (key === "Backspace") {
      ev.preventDefault();
      this.up(true);
      return;
    }
    if (key === "0") {
      ev.preventDefault();
      this.fit(true);
      return;
    }
    if (key === "+" || key === "=") {
      ev.preventDefault();
      this.zoomAt(this.w / 2, this.h / 2, 1.35);
      return;
    }
    if (key === "-" || key === "_") {
      ev.preventDefault();
      this.zoomAt(this.w / 2, this.h / 2, 1 / 1.35);
      return;
    }
    if (key === "]" || key === "[") {
      ev.preventDefault();
      this.cycleNeighbor(key === "]" ? 1 : -1);
      return;
    }
    if (key === "b" || key === "B") {
      ev.preventDefault();
      if (this.kbd >= 0)
        this.bringAndGo(this.kbd);
      return;
    }
    if (key === "?") {
      ev.preventDefault();
      this.help.togglePopover();
    }
  }
  moveFocus(dx, dy) {
    const m = this.view, c = this.cam;
    const from = this.kbd >= 0 ? m.children[this.kbd] : { x: c.cx, y: c.cy, i: -1 };
    let best = -1, score = Infinity;
    for (const n of m.children) {
      if (n.i === from.i || !this.tiers || this.tiers[n.i] < 0)
        continue;
      const vx = n.x - from.x, vy = n.y - from.y, d = Math.hypot(vx, vy);
      if (d < 0.000000001)
        continue;
      const cos = (vx * dx + vy * dy) / d;
      if (cos < 0.5)
        continue;
      const s = d * (2 - cos);
      if (s < score) {
        score = s;
        best = n.i;
      }
    }
    if (best < 0)
      return false;
    this.setKbd(best);
    return true;
  }
  setKbd(i) {
    this.kbd = i;
    const m = this.view, n = m.children[i];
    for (const [j, s] of this.slots)
      dfDollar10(s).attr("data-kbd", j === i ? "" : null);
    const [sx, sy] = this.toScreen(n.x, n.y);
    if (sx < 40 || sx > this.w - 40 || sy < 40 || sy > this.h - 40)
      this.flyTo({ cx: n.x, cy: n.y, z: this.cam.z }, { ms: 180 });
    this.announce(`${n.label} · ${n.typeName} · ${n.kind === "cluster" ? fmt(n.members) + " nodes" : n.degree + " links"} · ${i + 1} of ${m.children.length} in ${m.path[m.path.length - 1].label}${n.scc > 1 ? " · in a cycle of " + n.scc : ""}`);
    this.camChanged();
  }
  cycleNeighbor(dir) {
    const m = this.view;
    if (this.kbd < 0)
      return;
    if (!this.nbrCursor || this.nbrCursor.of !== this.kbd) {
      const list = m.adj[this.kbd].map((k) => {
        const e = m.edges[k];
        return { j: e.a === this.kbd ? e.b : e.a, c: e.count + e.count2 };
      }).sort((a, b) => b.c - a.c).map((x) => x.j);
      this.nbrCursor = { of: this.kbd, list, at: -1 };
    }
    const cur = this.nbrCursor;
    if (!cur.list.length) {
      this.announce("No neighbours at this level");
      return;
    }
    cur.at = (cur.at + dir + cur.list.length) % cur.list.length;
    const origin = cur.of;
    this.setKbd(cur.list[cur.at]);
    this.nbrCursor = cur;
    cur.of = origin;
    this.kbd = cur.list[cur.at];
  }
  searchInputs() {
    return this.outlets("search").map((o) => this.searchBox(o).input);
  }
  searchBox(outlet) {
    const id = this.uid;
    const box = outletChrome(outlet, "search", () => {
      const made = dfDollar10(`<div class="graph-explorer-search" role="search" data-ce-chrome></div>`).get(0);
      morph2(made, html`${icon("search", { cls: "graph-explorer-search-icon" })}<input
            class="input graph-explorer-search-input"
            data-size="sm"
            type="search"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded="false"
            aria-controls="${id}-results"
            autocomplete="off"
            spellcheck="false"
            enterkeyhint="search"
            placeholder="Search ${fmt(this.n)} nodes ( / )"
            aria-label="Search the graph"
          />
          <ul
            class="graph-explorer-results"
            id="${id}-results"
            role="listbox"
            aria-label="Search results"
            hidden
          ></ul>`);
      const input = dfDollar10(made).find("input").get(0);
      let deb = 0;
      dfDollar10(input).on("input", () => {
        clearTimeout(deb);
        deb = setTimeout(() => {
          this.searchSeq++;
          this.post({ t: "search", q: input.value, seq: this.searchSeq });
        }, 140);
      });
      dfDollar10(input).on("keydown", (ev) => {
        if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
          ev.preventDefault();
          this.moveResult(ev.key === "ArrowDown" ? 1 : -1);
        } else if (ev.key === "Enter") {
          ev.preventDefault();
          this.chooseResult(this.activeResult >= 0 ? this.activeResult : 0);
        } else if (ev.key === "Escape") {
          ev.preventDefault();
          if (!this.closeResults())
            this.el.focus();
        }
      });
      dfDollar10(input).on("blur", () => setTimeout(() => {
        if (document.activeElement !== input)
          this.closeResults();
      }, 150));
      dfDollar10(made).on("pointerdown", (ev) => {
        if (ev.target.closest("[data-graph-explorer-result]"))
          ev.preventDefault();
      });
      return made;
    });
    return {
      input: dfDollar10(box).find("input").get(0),
      list: dfDollar10(box).find("ul").get(0)
    };
  }
  onSearch(m) {
    if (m.seq !== this.searchSeq)
      return;
    const finder = this.finder;
    if (finder && finder.seq === m.seq) {
      finder.results = m.results;
      if (m.partial)
        finder.onPartial?.(m.results, m.scanned);
      else {
        this.finder = null;
        finder.resolve(m.results);
      }
      return;
    }
    this.results = m.results;
    this.activeResult = m.results.length ? 0 : -1;
    const id = this.uid;
    for (const outlet of this.outlets("search")) {
      const { input, list } = this.searchBox(outlet);
      morph2(list, html`${m.results.map((r, k) => html`<li
              role="option"
              id="${id}-r${k}"
              key="r${r.id}"
              data-graph-explorer-result="${k}"
              aria-selected="${k === this.activeResult ? "true" : "false"}"
            >
              <span class="graph-explorer-result-label">${r.label}</span
              ><span class="graph-explorer-result-path">${r.type}${r.path ? " · " + r.path : ""}</span>
            </li>`)}
        ${m.partial ? html`<li class="graph-explorer-result-more" aria-hidden="true">scanning... ${fmt(m.scanned)} / ${fmt(this.n)}</li>` : ""}
        ${!m.partial && !m.results.length && m.q ? html`<li class="graph-explorer-result-more">No matches</li>` : ""}`);
      const open = !!m.q && document.activeElement === input;
      list.hidden = !open;
      dfDollar10(input).attr("aria-expanded", open ? "true" : "false");
      dfDollar10(input).attr("aria-activedescendant", open && this.activeResult >= 0 ? `${id}-r${this.activeResult}` : null);
    }
  }
  moveResult(d) {
    if (!this.results.length)
      return;
    this.activeResult = (this.activeResult + d + this.results.length) % this.results.length;
    for (const outlet of this.outlets("search")) {
      const { input, list } = this.searchBox(outlet);
      dfDollar10(list).find('[role="option"]').each((k, el) => {
        dfDollar10(el).attr("aria-selected", k === this.activeResult ? "true" : "false");
      });
      dfDollar10(input).attr("aria-activedescendant", `${this.uid}-r${this.activeResult}`);
    }
  }
  chooseResult(k) {
    const r = this.results[k];
    if (!r)
      return;
    this.closeResults();
    this.el.focus({ preventScroll: true });
    this.navigateTo(r.id);
  }
  closeResults() {
    let closed = false;
    for (const outlet of this.outlets("search")) {
      const { input, list } = this.searchBox(outlet);
      if (list.hidden)
        continue;
      list.hidden = true;
      dfDollar10(input).attr("aria-expanded", "false");
      dfDollar10(input).attr("aria-activedescendant", null);
      closed = true;
    }
    return closed;
  }
  outlets(kind) {
    return boundOf(this.el, `[data-graph-explorer-outlet="${kind}"]`);
  }
  outputs(kind) {
    return boundOf(this.el, `[data-graph-explorer-output="${kind}"]`);
  }
  detailsPanel() {
    return this.outlets("details")[0]?.closest(".panel") ?? null;
  }
  showDetails(restore = false) {
    const panel = this.detailsPanel();
    if (!panel?.api)
      return;
    const state = panel.api.getState().name;
    if (state === "closed" || restore && state === "minimized")
      panel.api.setState("default");
  }
  expandNode(i, user = true) {
    const n = this.view?.children[i];
    if (!n)
      return;
    this.kbd = i;
    if (!this.selected.has(n.id) || this.selected.size !== 1)
      this.select([n.id]);
    if (!this.expandableNode(this.nodeOf(i)))
      return;
    const panel = this.detailsPanel();
    if (panel?.api && panel.api.getState().name !== "maximized")
      panel.api.setState("maximized");
    this.setExpanded(true, user);
  }
  collapseDetails(user = true) {
    const panel = this.detailsPanel();
    if (panel?.api && panel.api.getState().name === "maximized")
      panel.api.setState("default");
    this.setExpanded(false, user);
  }
  setExpanded(on, user = true) {
    if (this.expanded === on)
      return;
    this.expanded = on;
    this.renderPanel();
    if (user)
      this.commitState();
    if (!on)
      this.el.focus({ preventScroll: true });
    else
      dfDollar10(this.detailsPanel() ?? document).find(".panel-maximize input").get(0)?.focus({ preventScroll: true });
  }
  onPanelChange(ev) {
    const panel = ev.target;
    if (panel === this.detailsPanel()) {
      const max = ev.detail?.state === "maximized";
      if (max !== this.expanded) {
        if (max && !this.selected.size && !this.edge)
          panel.api?.setState("default");
        else
          this.setExpanded(max);
      }
    }
    if (this.outlets("relations").some((o) => o.closest(".panel") === panel) && ev.detail?.state !== "minimized")
      this.renderRelations();
  }
  renderPanel() {
    const m = this.view;
    if (this.edge && m) {
      this.renderEdgePanel();
      return;
    }
    const id = [...this.selected][0], i = m && id ? m.byId.get(id) : undefined;
    const outlets = this.outlets("details");
    if (i === undefined) {
      if (this.expanded && this.navigating)
        return;
      this.writeOutput("details-title", null);
      for (const outlet of outlets)
        morph2(this.chrome(outlet, "details"), html`<div class="graph-explorer-empty">
            ${icon("crosshair", { size: "xl" })}
            <p><strong>Nothing selected</strong></p>
            <p class="graph-explorer-muted">
              Click a node to see its details here. <kbd class="kbd">E</kbd> or the ${icon("expand", { size: "xs" })}
              button expands a node's full page.
            </p>
          </div>`);
      if (this.expanded)
        this.collapseDetails();
      this.renderRelations();
      return;
    }
    const node = this.nodeOf(i), r = this.pick("detail", node);
    if (!r)
      return;
    this.writeOutput("details-title", r.title ? r.title(node) : node.label);
    if (outlets.length) {
      const ctx = this.ctxFor(node, "detail", i);
      let out;
      try {
        out = r.render(node, ctx);
      } catch (err) {
        console.error('[graph-explorer] detail renderer "' + r.name + '" failed', err);
        return;
      }
      Promise.resolve(out).then((safe) => {
        if ([...this.selected][0] !== id)
          return;
        for (const outlet of outlets)
          morphKeeping(this.chrome(outlet, "details"), safe, this.islandMounts);
      });
    }
    this.renderRelations();
  }
  edgeItem() {
    const k = this.edgeIndex(this.edge);
    if (k < 0)
      return null;
    const m = this.view, e = m.edges[k];
    return {
      kind: "edge",
      id: this.edgeId(k),
      source: this.nodeOf(e.a),
      target: this.nodeOf(e.b),
      edge: e,
      depth: m.path.length - 1
    };
  }
  pickEdgeDetail(item) {
    for (const reg of [this.registry, globalRegistry]) {
      let best = null, score = -Infinity;
      for (const p of reg.edge) {
        if (!p.detail)
          continue;
        const s = p.detail.match ? p.detail.match(item) : 0;
        if (s === false || s == null)
          continue;
        if (s > score || s === score && p._order > best._order) {
          best = p;
          score = s;
        }
      }
      if (best)
        return best.detail;
    }
    return null;
  }
  renderEdgePanel() {
    const item = this.edgeItem();
    if (!item)
      return;
    const r = this.pickEdgeDetail(item);
    if (!r)
      return;
    this.writeOutput("details-title", r.title ? r.title(item) : item.source.label + " → " + item.target.label);
    const outlets = this.outlets("details");
    if (outlets.length) {
      const ctx = { ...this.ctxFor(item.source, "detail", item.edge.a), expandable: this.expandableEdge(item) };
      let out;
      try {
        out = r.render(item, ctx);
      } catch (err) {
        console.error("[graph-explorer] edge detail renderer failed", err);
        return;
      }
      const id = item.id;
      Promise.resolve(out).then((safe) => {
        if (this.edge !== id)
          return;
        for (const outlet of outlets)
          morphKeeping(this.chrome(outlet, "details"), safe, this.islandMounts);
      });
    }
    this.renderRelations();
  }
  renderRelations() {
    const m = this.view, id = [...this.selected][0], i = m && id ? m.byId.get(id) : undefined;
    const outlets = this.outlets("relations");
    const item = this.edge ? this.edgeItem() : null;
    if (item) {
      const ctx = this.ctxFor(item.source, "relations", item.edge.a);
      const d = ctx.request("edge:" + item.id, () => ctx.fetchEdge(item.id));
      this.writeOutput("relations-title", `${item.source.label} → ${item.target.label} · ${fmt(item.edge.count + item.edge.count2)}`);
      for (const outlet of outlets) {
        const panel = outlet.closest(".panel");
        if (panel?.hasAttribute("data-minimized"))
          continue;
        morphKeeping(this.chrome(outlet, "relations"), d ? linksTable(ctx, d) : html`<p class="graph-explorer-muted graph-explorer-pad">Loading...</p>`, this.islandMounts);
      }
      return;
    }
    if (i === undefined) {
      this.writeOutput("relations-title", null);
      for (const outlet of outlets)
        morph2(this.chrome(outlet, "relations"), html`<p class="graph-explorer-muted graph-explorer-pad">Select a node to list its relations.</p>`);
      return;
    }
    const node = this.nodeOf(i);
    const ctx = this.ctxFor(node, "relations", i);
    const d = ctx.request("details:" + node.id, () => ctx.fetchDetails(node.id));
    if (!d) {
      for (const outlet of outlets)
        morph2(this.chrome(outlet, "relations"), html`<p class="graph-explorer-muted graph-explorer-pad">Loading...</p>`);
      return;
    }
    const total = node.kind === "cluster" ? d.relations?.length ?? 0 : d.outDeg ?? 0;
    this.writeOutput("relations-title", `${node.label} · ${fmt(total)}`);
    for (const outlet of outlets) {
      const panel = outlet.closest(".panel");
      if (panel?.hasAttribute("data-minimized"))
        continue;
      morphKeeping(this.chrome(outlet, "relations"), relationsTable(ctx, node, d, panel?.hasAttribute("data-maximized") ? "full" : "label", 200), this.islandMounts);
    }
  }
  chrome(outlet, kind) {
    return outletChrome(outlet, kind, () => dfDollar10(`<div class="graph-explorer-${kind}" data-ce-chrome></div>`).get(0));
  }
  writeOutput(kind, text) {
    for (const out of this.outputs(kind)) {
      if (out._graphExplorerText === undefined)
        out._graphExplorerText = dfDollar10(out).text();
      const next = text ?? out._graphExplorerText;
      if (dfDollar10(out).text() !== next)
        dfDollar10(out).text(next);
    }
  }
  renderOutline() {
    const m = this.view;
    if (!m)
      return;
    for (const outlet of this.outlets("outline")) {
      const box = outletChrome(outlet, "outline", () => {
        const made = dfDollar10('<div class="graph-explorer-outline" data-ce-chrome></div>').get(0);
        morph2(made, html`<div class="graph-explorer-outline-head">
              <input
                class="input graph-explorer-outline-filter"
                data-size="sm"
                type="search"
                placeholder="Filter this level"
                aria-label="Filter the outline"
              />
            </div>
            <ul class="graph-explorer-outline-list" role="tree" aria-label="Current cluster"></ul>`);
        const list = dfDollar10(made).find("ul").get(0);
        dfDollar10(made).find("input").on("input", () => this.renderOutline());
        dfDollar10(list).on("keydown", (ev) => {
          const items = dfDollar10(list).find("[data-graph-explorer-outline]").toArray(), at = items.indexOf(document.activeElement);
          if (ev.key === "ArrowDown" || ev.key === "ArrowUp") {
            ev.preventDefault();
            items[clamp3(at + (ev.key === "ArrowDown" ? 1 : -1), 0, items.length - 1)]?.focus();
          }
          if (ev.key === "Enter" && at >= 0) {
            ev.preventDefault();
            const i = +(items[at].getAttribute("data-graph-explorer-outline") ?? -1);
            if (i >= 0)
              this.primary(i);
            else
              this.upTo(items[at].getAttribute("data-graph-explorer-crumb") ?? "c0");
          }
        });
        dfDollar10(list).on("dblclick", (ev) => {
          const oi = ev.target.closest("[data-graph-explorer-outline]");
          const i = +(oi?.getAttribute("data-graph-explorer-outline") ?? -1);
          if (i >= 0)
            this.primary(i);
        });
        return made;
      });
      const filter = dfDollar10(box).find("input").get(0);
      const list = dfDollar10(box).find("ul").get(0);
      const q = (filter.value || "").trim().toLowerCase();
      const kids = m.children.filter((c) => !q || c.label.toLowerCase().includes(q)).sort((a, b) => b.degree + b.members - (a.degree + a.members));
      const shown = kids.slice(0, 300);
      morph2(list, html`${m.path.map((p, depth) => html`<li
              role="treeitem"
              aria-level="${depth + 1}"
              aria-expanded="true"
              key="p${p.id}"
              class="graph-explorer-outline-path"
              style="--depth:${depth}"
            >
              <button
                type="button"
                class="graph-explorer-outline-item"
                data-graph-explorer-crumb="${p.id}"
                tabindex="-1"
              >
                ${p.label}
              </button>
            </li>`)}
        ${shown.map((c) => html`<li
              role="treeitem"
              aria-level="${m.path.length + 1}"
              aria-selected="${this.selected.has(c.id) ? "true" : "false"}"
              key="o${c.id}"
              style="--depth:${m.path.length}"
            >
              <button
                type="button"
                class="graph-explorer-outline-item"
                data-graph-explorer-outline="${c.i}"
                tabindex="-1"
              >
                <span class="graph-explorer-type" data-type="${c.type}"></span
                ><span class="graph-explorer-label">${c.label}</span>
                ${smallCycle(c) ? html`<span class="graph-explorer-cycle" title="cycle of ${c.scc}">↻</span>` : ""}<span
                  class="graph-explorer-count"
                  >${c.kind === "cluster" ? fmt(c.members) : c.degree}</span
                >
              </button>
            </li>`)}
        ${kids.length > shown.length ? html`<li class="graph-explorer-outline-more">${fmt(kids.length - shown.length)} more - refine the filter</li>` : ""}
        ${!kids.length ? html`<li class="graph-explorer-outline-more">No match at this level</li>` : ""}`);
      const items = dfDollar10(list).find(".graph-explorer-outline-item").toArray();
      const first = items[m.path.length] || items[0];
      if (first)
        first.tabIndex = 0;
    }
  }
  renderCrumbs() {
    const m = this.view, last = m.path.length - 1;
    for (const outlet of this.outlets("breadcrumb")) {
      const nav = outletChrome(outlet, "path", () => {
        const made = dfDollar10('<nav class="breadcrumb graph-explorer-path" aria-label="Graph path" data-ce-chrome></nav>').get(0);
        morph2(made, html`<ol class="breadcrumb-list"></ol>`);
        return made;
      });
      morph2(dfDollar10(nav).find("ol").get(0), html`${m.path.map((p, k) => k === last ? html`<li class="breadcrumb-item" key="${p.id}">
                <span class="breadcrumb-page" aria-current="page">${p.label}</span>
              </li>` : html`<li class="breadcrumb-item" key="${p.id}">
                  <a class="breadcrumb-link" href="#${p.id}" data-graph-explorer-crumb="${p.id}">${p.label}</a>
                </li>
                <li class="breadcrumb-separator" aria-hidden="true" key="s${p.id}">›</li>`)}`);
    }
    this.writeOutput("view", m.path[last].label);
  }
  announce(text) {
    clearTimeout(this.announceT);
    this.announceT = setTimeout(() => {
      const outs = this.outputs("status");
      for (const out of outs.length ? outs : [this.liveEl])
        dfDollar10(out).text(text);
    }, 120);
  }
  renderHud() {
    const s = this.stats, w = s.worker || {}, dom = dfDollar10(this.el).find("*").toArray().length;
    dfDollar10(this.hud).text(`graph   ${fmt(this.genStats.nodes)} nodes · ${fmt(this.genStats.edges)} edges · gen ${fmt(this.genStats.ms)} ms
` + `view    ${this.view.path[this.view.path.length - 1].label} · ${this.view.children.length} children
` + `DOM     ${w.cards ?? 0} cards · ${w.chips ?? 0} chips · ${dom} elements in the explorer
` + `canvas  ${fmt(w.dots ?? 0)} dots · ${fmt(w.edges ?? 0)} edges · ${w.labels ?? 0} labels
` + `worker  ${w.ms ?? 0} ms/frame · ${s.fps} bitmaps/s · lag ${s.lag ?? 0}`);
  }
  onPatch(m) {
    const v = this.views.get(m.view);
    if (!v)
      return;
    const touched = new Set;
    for (const p of m.edges) {
      const e = v.edges[p.k];
      if (!e)
        continue;
      const was = e.breaker && e.breaker.state;
      e.breaker = p.breaker;
      e.style = p.style;
      e.traffic = p.traffic;
      if (was !== (e.breaker && e.breaker.state)) {
        touched.add(e.a);
        touched.add(e.b);
      }
    }
    if (m.external && v.parent)
      for (const x of m.external) {
        const ext = v.parent.external.find((q) => q.id === x.id);
        if (ext) {
          ext.breaker = x.breaker;
          ext.style = x.style;
        }
      }
    this.computeBreakerCounts(v);
    if (v !== this.view)
      return;
    for (const i of touched) {
      const id = v.children[i].id;
      this.dataRev.set(id, (this.dataRev.get(id) || 0) + 1);
      this.staleRequest("details:" + id);
    }
    if (!m.restyle)
      for (const id of this.selected)
        this.staleRequest("details:" + id);
    this.signKeys = "";
    this.applyTiers(this.tiers);
    if (this.selected.size)
      this.renderPanel();
    for (const p of this.edgePaths.values())
      p.tone = null;
    this.camChanged();
  }
  staleRequest(key) {
    const r = this.requests.get(key);
    if (r)
      r.stale = true;
  }
  labelOf(target) {
    const m = this.view;
    if (!m)
      return target;
    if (target.includes(">")) {
      const k = this.edgeIndex(target);
      if (k < 0)
        return target.replace(">", " → ");
      const e = m.edges[k];
      return `${m.children[e.a].label} → ${m.children[e.b].label}`;
    }
    const i = m.byId.get(target);
    return i === undefined ? target : m.children[i].label;
  }
  addUpdates(items) {
    const now = Date.now(), at = performance.now();
    const added = [];
    for (const raw of items || []) {
      if (!raw || !raw.target)
        continue;
      const target = String(raw.target);
      const kind = raw.kind === "edge" || raw.kind !== "node" && target.includes(">") ? "edge" : "node";
      const u = {
        id: raw.id ? String(raw.id) : `u${++this.updateSeq}`,
        time: Number(raw.time) || now,
        kind,
        target,
        layer: raw.layer ? String(raw.layer) : kind === "edge" ? "relations" : "nodes",
        type: raw.type ? String(raw.type) : "change",
        text: raw.text ? String(raw.text) : "",
        label: raw.label ? String(raw.label) : this.labelOf(target)
      };
      if (kind === "edge")
        u.view = raw.view ? String(raw.view) : this.view?.id ?? "c0";
      if (raw.tone && TONES.includes(raw.tone))
        u.tone = raw.tone;
      added.push(u);
      this.changes.set(target, { u, at });
    }
    if (!added.length)
      return added;
    this.updates.unshift(...added.slice().reverse());
    if (this.updates.length > UPDATE_LIMIT)
      this.updates.length = UPDATE_LIMIT;
    for (const u of added)
      this.el.dispatchEvent(new CustomEvent("graph-explorer-update", { detail: { update: u }, bubbles: true }));
    this.renderUpdates(added.filter((u) => this.shown.has(u.layer)).length);
    clearTimeout(this.changeT);
    this.changeT = setTimeout(() => this.pruneChanges(), CHANGE_MS + 50);
    if (this.view) {
      this.projectEdges();
      this.projectChanges();
    }
    return added;
  }
  pruneChanges() {
    const old = performance.now() - CHANGE_MS;
    for (const [t, ch] of this.changes)
      if (ch.at <= old)
        this.changes.delete(t);
    if (this.changes.size)
      this.changeT = setTimeout(() => this.pruneChanges(), 500);
    if (this.view && !this.destroyed) {
      this.projectEdges();
      this.projectChanges();
    }
  }
  projectChanges() {
    const m = this.view;
    if (!m || !this.changesEl)
      return;
    const keep = new Set;
    const z = this.cam.z, isCluster = !m.leafView;
    for (const [target, ch] of this.changes) {
      if (ch.u.kind !== "node" || !this.shown.has(ch.u.layer))
        continue;
      const i = m.byId.get(target);
      if (i === undefined)
        continue;
      const n = m.children[i], s = this.slots.get(i);
      let x, y;
      if (s && !s.hidden && s._x != null) {
        x = s._x + s._w - 2;
        y = s._y + 2;
      } else {
        const [sx, sy] = this.toScreen(n.x, n.y), r = drawR(isCluster, n.r * z) * 0.72;
        x = sx + r;
        y = sy - r;
      }
      if (x < -8 || y < -8 || x > this.w + 8 || y > this.h + 8)
        continue;
      keep.add(target);
      let dot = this.changeDots.get(target);
      if (!dot || dot._at !== ch.at) {
        dot?.remove();
        dot = dfDollar10(`<span class="indicator-dot graph-explorer-change-dot" data-animate="ping" data-layer="${esc3(ch.u.layer)}"></span>`).get(0);
        dot.style.setProperty("--graph-explorer-layer", this.colorOf(ch.u.layer));
        dot.style.animationDuration = `${CHANGE_MS}ms`;
        dot._at = ch.at;
        dfDollar10(this.changesEl).append(dot);
        this.changeDots.set(target, dot);
      }
      dot.style.translate = `${Math.round(x)}px ${Math.round(y)}px`;
    }
    for (const [t, dot] of this.changeDots)
      if (!keep.has(t)) {
        dot.remove();
        this.changeDots.delete(t);
      }
  }
  pickUpdate(u) {
    let best = null, bestScore = -Infinity;
    for (const p of [...this.registry.update, ...globalRegistry.update]) {
      const score = p.update.match ? p.update.match(u) : 0;
      if (score === false || score == null)
        continue;
      const rank = score * 1e6 + (p._scoped ? 500000 : 0) + p._order;
      if (rank > bestScore) {
        bestScore = rank;
        best = p.update;
      }
    }
    return best;
  }
  updateRow(u) {
    const r = this.pickUpdate(u);
    let body = u.text;
    try {
      body = r.render(u, this.updateCtx);
    } catch (err) {
      console.error("[graph-explorer] update renderer", err);
    }
    return html`<button
      type="button"
      class="graph-explorer-update"
      data-graph-explorer-update="${u.id}"
      data-layer="${u.layer}"
      data-kind="${u.kind}"
      style="--graph-explorer-layer: ${this.colorOf(u.layer)}"
      title="${u.label}: ${u.text}"
    >
      ${body}
    </button>`;
  }
  get updateCtx() {
    return {
      html,
      icon,
      color: (layer) => this.colorOf(layer),
      time: (ms) => TIME_FMT.format(ms)
    };
  }
  renderUpdates(added = 0) {
    const outs = this.outlets("updates");
    if (!outs.length)
      return;
    this.updatesRendered = true;
    this.updatesShown = this.updates.filter((u) => this.shown.has(u.layer));
    const vl = df$10.virtualList;
    for (const out of outs) {
      const box = outletChrome(out, "updates", () => dfDollar10(`<div class="graph-explorer-updates${vl ? " virtual-list" : ""}" aria-label="Updates" data-empty-text="No updates in the shown layers yet" data-ce-chrome></div>`).get(0));
      if (vl) {
        if (added && box.scrollTop > 0)
          box.scrollTop += added * (box._rowHeight || 32);
        vl.setData(box, this.updatesShown.length, (row, i) => {
          const u = this.updatesShown[i];
          if (u)
            morph2(row, this.updateRow(u));
        });
      } else
        morph2(box, this.updatesShown.length ? html`${this.updatesShown.slice(0, 200).map((u) => this.updateRow(u))}` : html`<p class="graph-explorer-muted graph-explorer-pad">No updates in the shown layers yet</p>`);
    }
  }
  async openUpdate(id) {
    const u = this.updates.find((x) => x.id === id);
    if (!u || !this.view)
      return;
    if (u.kind === "node") {
      await this.navigateTo(u.target);
      return;
    }
    if (u.view && u.view !== this.view.id) {
      if (u.view === "c0")
        await this.upTo("c0");
      else
        await this.navigateTo(u.view, { enter: true, select: false });
    }
    this.selectEdge(u.target);
    this.showDetails(true);
  }
  liveState() {
    const v = this.view;
    const focus = v && v.id !== "c0" ? v.id : null;
    const selected = [...this.selected];
    const edge = selected.length ? null : this.edge;
    return {
      name: stateNameOf2(focus, selected, edge),
      config: {
        focus,
        selected,
        layers: [...this.shown],
        compact: this.compact,
        expanded: this.expanded && (selected.length > 0 || !!edge),
        edge
      }
    };
  }
  commitState() {
    if (this.syncing || !this.view || this.loading)
      return;
    if (this.navigating && this.expanded)
      return;
    const s = this.liveState();
    applyMarkup10(this.el, s.name, s.config);
    graphExplorerApi.commit(this.el, s.name, configOf3(this.el));
  }
  sync() {
    this.syncChain = this.syncChain.then(() => this.syncNow()).catch((err) => console.error("[graph-explorer]", err));
    return this.syncChain;
  }
  async syncNow() {
    await this.ready;
    if (this.destroyed)
      return;
    const animate = !!this.synced && !reducedMotion4();
    this.synced = true;
    this.hud.hidden = !this.el.hasAttribute("data-hud");
    const want = configOf3(this.el);
    const now = this.liveState().config;
    const same = want.focus === now.focus && want.selected.join(" ") === now.selected.join(" ") && sameLayers(want.layers, now.layers) && want.compact === now.compact && want.expanded === now.expanded && want.edge === now.edge;
    if (same)
      return;
    this.syncing = true;
    try {
      if (!sameLayers(want.layers, [...this.shown]) || want.compact !== this.compact) {
        this.shown = new Set(want.layers);
        this.compact = want.compact;
        this.layersChanged(false);
      }
      const target = want.focus ?? "c0";
      if (this.view.id !== target) {
        if (target === "c0")
          await this.upTo("c0", animate);
        else
          await this.navigateTo(target, { enter: true, select: false, animate });
      }
      const inView = want.selected.filter((id) => this.view.byId.has(id));
      const missing = want.selected.find((id) => !this.view.byId.has(id));
      if (missing && !want.focus) {
        await this.navigateTo(missing, { select: false, animate });
      }
      const selected = want.selected.filter((id) => this.view.byId.has(id));
      if (selected.join(" ") !== [...this.selected].join(" ") || inView.length !== selected.length) {
        if (selected.length)
          this.edge = null;
        this.selected = new Set(selected);
        this.afterSelection();
      }
      if (!selected.length && want.edge) {
        if (this.edgeIndex(want.edge) < 0 && !want.focus)
          await this.navigateTo(want.edge.split(">")[0], { select: false, animate });
        if (this.edgeIndex(want.edge) >= 0 && this.edge !== want.edge)
          this.selectEdge(want.edge);
      } else if (!selected.length && this.edge)
        this.selectEdge(null);
      const first = this.view.byId.get(selected[0]);
      if (want.expanded && first !== undefined)
        this.expandNode(first, false);
      else if (want.expanded && this.edge && !selected.length)
        this.expandEdge(false);
      else if (this.expanded)
        this.collapseDetails(false);
    } finally {
      this.syncing = false;
    }
    this.commitState();
  }
  destroy() {
    this.destroyed = true;
    live2.delete(this);
    if (this.raf)
      cancelAnimationFrame(this.raf);
    for (const t of [this.hudT, this.restTimer, this.announceT, this.changeT])
      clearTimeout(t);
    for (const mq of this.mediaQueries || [])
      mq.removeEventListener("change", this.onMedia);
    document.removeEventListener("defuss-theme-change", this.onThemeEvent);
    document.removeEventListener("load", this.onThemeEvent, true);
    this.worker.terminate();
    URL.revokeObjectURL(this.workerUrl);
    this.resizeObserver.disconnect();
    this.themeObserver.disconnect();
    this.attrObserver.disconnect();
    unbindComponent(this.el);
    delete this.el.api;
    dfDollar10(this.el).children("[data-ce-chrome]").remove();
    for (const kind of OUTLETS)
      for (const o of this.outlets(kind)) {
        dropIslands(o);
        dfDollar10(o).children("[data-ce-chrome]").remove();
      }
    this.el._graphExplorer = undefined;
  }
}
if (!document.__graphExplorerInit) {
  document.__graphExplorerInit = true;
  const owner = (t) => {
    if (!t?.closest || t.closest(".graph-explorer"))
      return;
    const bound = t.closest(`[${FOR}]`);
    const id = bound?.getAttribute(FOR);
    return id ? dfDollar10("#" + CSS.escape(id)).get(0)?._graphExplorer : undefined;
  };
  document.addEventListener("click", (ev) => {
    const inst = owner(ev.target);
    if (inst)
      inst.onClick(ev);
  });
  document.addEventListener("keydown", (ev) => {
    const t = ev.target;
    const inst = owner(t);
    if (inst && ev.key === "/" && !t.closest("input, textarea"))
      inst.onKey(ev);
  });
  document.addEventListener("panel-change", (ev) => {
    for (const inst of live2)
      inst.onPanelChange(ev);
  });
}
var need = (target) => {
  const inst = resolveTarget(target)?._graphExplorer;
  if (!inst)
    throw new Error("graph-explorer: the element is not initialized");
  return inst;
};
df$10.graphExplorer = {
  html,
  register,
  icon,
  registerIcon,
  navigate: (target, id) => need(target).navigateTo(id),
  dive: (target, id) => need(target).navigateTo(id, { enter: true, select: false }),
  up: (target) => need(target).up(true),
  fit: (target) => need(target).fit(true),
  flyTo: (target, camera) => need(target).flyTo(camera),
  path: (target, id) => need(target).waitFor("path:" + id, () => need(target).post({ t: "path", id })),
  subtree: (target, id, levels = 3) => need(target).fetchSubtree(id, levels),
  find: (target, query, onPartial) => need(target).find(query, onPartial),
  search: (target, query) => {
    const inst = need(target);
    for (const input of inst.searchInputs()) {
      input.value = query;
      input.focus();
    }
    inst.searchSeq++;
    inst.post({ t: "search", q: query, seq: inst.searchSeq });
  },
  select: (target, ids) => need(target).select(ids.filter((id) => need(target).view?.byId.has(id))),
  selectEdge: (target, id) => need(target).selectEdge(id),
  setLayers: (target, layers) => need(target).setLayers(layers),
  layers: (target) => need(target).layerDefs(),
  setCompact: (target, on) => need(target).setCompact(on),
  expand: async (target, id) => {
    const inst = need(target);
    if (edgeKey(id)) {
      if (inst.edgeIndex(id) < 0)
        await inst.navigateTo(id.split(">")[0], { select: false });
      inst.selectEdge(id);
      inst.expandEdge();
      return;
    }
    if (!inst.view?.byId.has(id))
      await inst.navigateTo(id);
    const k = inst.view.byId.get(id);
    if (k !== undefined)
      inst.expandNode(k);
  },
  collapse: (target) => need(target).collapseDetails(),
  simulate: (target, on) => {
    const inst = need(target);
    if (!!inst.simulating !== on)
      inst.act("live", null);
  },
  update: (target, updates) => need(target).addUpdates(Array.isArray(updates) ? updates : [updates]),
  updates: (target) => [...need(target).updates],
  inspect: (target, opts = {}) => {
    const inst = need(target);
    const out = {
      view: inst.view?.id ?? null,
      cam: { ...inst.cam },
      slots: inst.slots.size,
      flight: !!inst.flight,
      navigating: inst.navigating,
      lag: inst.stats.lag ?? 0,
      elements: dfDollar10(inst.el).find("*").toArray().length,
      worker: { ...inst.stats.worker },
      graph: inst.genStats ? { ...inst.genStats } : null
    };
    if (opts.children && inst.view) {
      out.children = inst.view.children.map((n) => ({ id: n.id, label: n.label, x: n.x, y: n.y, r: n.r }));
      out.edges = inst.view.edges.map((e, k) => ({
        id: inst.edgeId(k),
        count: e.count,
        count2: e.count2,
        kind: e.kind
      }));
      out.dotLabels = inst.dotLabels.map((r) => [...r]);
    }
    return out;
  },
  destroy: (target) => need(target).destroy()
};
function init10() {
  dfDollar10(".graph-explorer:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    const inst = new Explorer(el);
    el._graphExplorer = inst;
    const config = configOf3(el);
    const name = stateNameOf2(config.focus, config.selected, config.edge);
    bindComponent(el, graphExplorerApi, { name, config });
    graphExplorerApi.setState(el, name, {});
  });
  for (const inst of live2)
    if (inst.view) {
      for (const kind of OUTLETS)
        for (const o of inst.outlets(kind))
          if (!dfDollar10(o).children("[data-ce-chrome]").get(0)) {
            inst.renderLayers();
            inst.renderCrumbs();
            inst.renderOutline();
            inst.renderPanel();
            inst.searchInputs();
            break;
          }
    }
}
init10();
new MutationObserver(init10).observe(document, { childList: true, subtree: true });
function graphExplorerWorker(self) {
  let SEED = 1540483477;
  const h32 = (a, b) => {
    let x = (a | 0) ^ Math.imul((b | 0) + 1663821227, 2654435761) ^ SEED;
    x = Math.imul(x ^ x >>> 16, 2246822507);
    x = Math.imul(x ^ x >>> 13, 3266489909);
    return (x ^ x >>> 16) >>> 0;
  };
  const rnd = (a, b) => h32(a, b) / 4294967296;
  const DOMAINS = [
    "Payments",
    "Identity",
    "Search",
    "Catalog",
    "Logistics",
    "Analytics",
    "Messaging",
    "Billing",
    "Risk",
    "Media",
    "Inventory",
    "Support",
    "Pricing",
    "Recommendations",
    "Notifications",
    "Compliance",
    "Fulfillment",
    "Accounts",
    "Marketing",
    "Data Platform",
    "Observability",
    "Edge",
    "Storage",
    "Partners",
    "Mobile",
    "Growth",
    "Security",
    "Content",
    "Ads",
    "Maps"
  ];
  const SVC_A = [
    "ledger",
    "fraud",
    "token",
    "session",
    "order",
    "cart",
    "invoice",
    "refund",
    "quota",
    "profile",
    "consent",
    "route",
    "shipment",
    "stock",
    "price",
    "promo",
    "review",
    "feed",
    "index",
    "query",
    "crawl",
    "rank",
    "asset",
    "thumb",
    "audit",
    "policy",
    "key",
    "cache",
    "event",
    "metric",
    "trace",
    "alert",
    "mail",
    "push",
    "sms",
    "geo",
    "tile",
    "billing",
    "tax",
    "payout"
  ];
  const SVC_B = [
    "api",
    "gateway",
    "worker",
    "store",
    "stream",
    "scorer",
    "sync",
    "indexer",
    "router",
    "cache",
    "broker",
    "scheduler",
    "service",
    "adapter",
    "engine",
    "proxy",
    "registry",
    "collector"
  ];
  const SYSTEM_KINDS = ["API", "Worker", "Store", "Stream"];
  const ENTITY_TYPES = ["Dataset", "Endpoint", "Document", "Person", "Job", "Topic"];
  const KIND_FAVOR = [1, 4, 0, 5];
  const EDGE_TYPES = ["calls", "reads", "owns"];
  const NOUN = [
    "order",
    "invoice",
    "ledger",
    "account",
    "payment",
    "refund",
    "session",
    "token",
    "profile",
    "cart",
    "route",
    "parcel",
    "stock",
    "price",
    "coupon",
    "review",
    "rating",
    "query",
    "index",
    "shard",
    "asset",
    "image",
    "video",
    "policy",
    "audit",
    "metric",
    "trace",
    "event",
    "alert",
    "report",
    "segment",
    "model",
    "feature",
    "schema",
    "table",
    "topic",
    "queue",
    "batch",
    "job",
    "cron",
    "contract",
    "customer",
    "merchant",
    "partner",
    "device",
    "region",
    "zone",
    "tile",
    "consent",
    "tax",
    "payout",
    "quota",
    "limit",
    "cache",
    "key",
    "secret",
    "webhook",
    "ticket",
    "case",
    "note",
    "draft",
    "budget",
    "forecast",
    "campaign"
  ];
  const ADJ = [
    "daily",
    "hourly",
    "stale",
    "fresh",
    "raw",
    "clean",
    "gold",
    "silver",
    "bronze",
    "hot",
    "cold",
    "warm",
    "live",
    "shadow",
    "legacy",
    "next",
    "beta",
    "canary",
    "eu",
    "us",
    "apac",
    "global",
    "local",
    "shared",
    "private",
    "public",
    "internal",
    "external",
    "primary",
    "replica",
    "archived",
    "pending",
    "active",
    "failed",
    "retry",
    "dead",
    "fast",
    "slow",
    "small",
    "large",
    "core",
    "edge",
    "mobile",
    "web",
    "batch",
    "stream",
    "nightly",
    "weekly",
    "monthly",
    "q1",
    "q2",
    "q3",
    "q4",
    "v1",
    "v2",
    "v3",
    "alpha",
    "omega",
    "blue",
    "green",
    "red",
    "amber",
    "gray",
    "prime"
  ];
  const USERS = ["mira", "jonas", "li", "sam", "ada", "omar", "noor", "tomas"];
  const STATE_NAMES = ["closed", "half-open", "open", "cut"];
  const SEVERITY = [0, 1, 3, 2];
  let N = 0, E = 0, C = 0, D = 0, S = 0, P = 0;
  let leafType, leafCluster, outStart, outTarget, edgeType, inDeg;
  let cParent, cLevel, cChildStart, cChildCount, cLeafStart, cLeafEnd, cKind, cName;
  let pairA, pairB, pairCount, pairState, pairTrips, pairSince, pairProbesOk, pairBy, pairVer;
  let domPairs, rootPairs, pairMap;
  const views = new Map;
  const previews = new Map;
  function generate(n, seed) {
    const t0 = performance.now();
    SEED = (seed | 0) * 668265261 ^ 1540483477;
    N = n = Math.max(2000, Math.min(4000000, n | 0));
    D = Math.min(60, Math.max(6, Math.round(n / 40000)));
    const S0 = Math.max(D * 3, Math.round(n / 190));
    const dw = new Float64Array(D);
    let dsum = 0;
    for (let d = 0;d < D; d++) {
      dw[d] = 0.65 + rnd(d, 11) * 0.7;
      dsum += dw[d];
    }
    const sysPer = new Int32Array(D);
    S = 0;
    for (let d = 0;d < D; d++) {
      sysPer[d] = Math.max(3, Math.floor(dw[d] / dsum * S0));
      S += sysPer[d];
    }
    for (let d = 0;S < S0; d = (d + 1) % D) {
      sysPer[d]++;
      S++;
    }
    C = 1 + D + S;
    cParent = new Int32Array(C);
    cLevel = new Uint8Array(C);
    cChildStart = new Int32Array(C);
    cChildCount = new Int32Array(C);
    cLeafStart = new Int32Array(C);
    cLeafEnd = new Int32Array(C);
    cKind = new Uint8Array(C);
    cName = Array.from({ length: C });
    const sw = new Float64Array(S);
    let ssum = 0;
    for (let s = 0;s < S; s++) {
      sw[s] = 0.45 + rnd(s, 13) * 1.1;
      ssum += sw[s];
    }
    const size = new Int32Array(S);
    let tot = 0;
    for (let s = 0;s < S; s++) {
      size[s] = Math.max(6, Math.floor(sw[s] / ssum * n));
      tot += size[s];
    }
    for (let s = 0;tot < n; s = (s + 1) % S) {
      size[s]++;
      tot++;
    }
    for (let s = 0;tot > n; s = (s + 1) % S)
      if (size[s] > 6) {
        size[s]--;
        tot--;
      }
    leafCluster = new Int32Array(n);
    leafType = new Uint8Array(n);
    cParent[0] = -1;
    cLevel[0] = 0;
    cChildStart[0] = 1;
    cChildCount[0] = D;
    cLeafStart[0] = 0;
    cLeafEnd[0] = n;
    cName[0] = "All domains";
    let leaf = 0, sys = 1 + D;
    for (let d = 0;d < D; d++) {
      const dom = 1 + d;
      cParent[dom] = 0;
      cLevel[dom] = 1;
      cKind[dom] = d % 8;
      cName[dom] = DOMAINS[d % DOMAINS.length] + (d >= DOMAINS.length ? " " + (Math.floor(d / DOMAINS.length) + 1) : "");
      cChildStart[dom] = sys;
      cChildCount[dom] = sysPer[d];
      cLeafStart[dom] = leaf;
      const taken = new Set;
      for (let k = 0;k < sysPer[d]; k++, sys++) {
        const s = sys - 1 - D, h = h32(sys, 17);
        let name = SVC_A[h % SVC_A.length] + "-" + SVC_B[(h >>> 8) % SVC_B.length];
        if (taken.has(name)) {
          let j = 2;
          while (taken.has(name + "-" + j))
            j++;
          name += "-" + j;
        }
        taken.add(name);
        cName[sys] = name;
        cParent[sys] = dom;
        cLevel[sys] = 2;
        cKind[sys] = (h >>> 16) % 4;
        cLeafStart[sys] = leaf;
        cChildStart[sys] = leaf;
        cChildCount[sys] = size[s];
        const favored = KIND_FAVOR[cKind[sys]];
        for (let i = leaf;i < leaf + size[s]; i++) {
          leafCluster[i] = sys;
          leafType[i] = rnd(i, 7) < 0.45 ? favored : h32(i, 8) % 6;
        }
        leaf += size[s];
        cLeafEnd[sys] = leaf;
      }
      cLeafEnd[dom] = leaf;
    }
    const dDeps = [];
    for (let d = 0;d < D; d++) {
      const list = [], k = 2 + h32(d, 21) % 3;
      for (let j = 0;list.length < k && j < 16; j++) {
        const dd = h32(d, 30 + j) % D;
        if (dd !== d && !list.includes(dd))
          list.push(dd);
      }
      dDeps.push(list);
    }
    const sDepStart = new Int32Array(S + 1), sCrossStart = new Int32Array(S + 1);
    const sDeps = [], sCross = [];
    for (let s = 0;s < S; s++) {
      const c = s + 1 + D, dom = cParent[c], first = cChildStart[dom], m = cChildCount[dom];
      sDepStart[s] = sDeps.length;
      const k = Math.min(m - 1, 2 + h32(c, 23) % 4), local = [];
      for (let j = 0;local.length < k && j < 24; j++) {
        const t = first + h32(c, 40 + j) % m;
        if (t !== c && !local.includes(t))
          local.push(t);
      }
      sDeps.push(...local);
      sCrossStart[s] = sCross.length;
      if (rnd(c, 41) < 0.55) {
        const deps = dDeps[dom - 1], kk = 1 + h32(c, 42) % 2;
        for (let j = 0;j < kk; j++) {
          const dd = 1 + deps[h32(c, 43 + j) % deps.length];
          sCross.push(cChildStart[dd] + h32(c, 50 + j) % cChildCount[dd]);
        }
      }
    }
    sDepStart[S] = sDeps.length;
    sCrossStart[S] = sCross.length;
    outStart = new Int32Array(n + 1);
    for (let i = 0;i < n; i++) {
      const k = Math.min(12, 1 + Math.floor(-Math.log(1 - rnd(i, 1)) * 1.3));
      outStart[i + 1] = outStart[i] + k;
    }
    E = outStart[n];
    outTarget = new Int32Array(E);
    edgeType = new Uint8Array(E);
    inDeg = new Int32Array(n);
    for (let i = 0;i < n; i++) {
      const c = leafCluster[i], s = c - 1 - D;
      const depN = sDepStart[s + 1] - sDepStart[s], crossN = sCrossStart[s + 1] - sCrossStart[s];
      for (let e = outStart[i], j = 0;e < outStart[i + 1]; e++, j++) {
        const u = rnd(i, 2 + j * 3);
        let tc = c;
        if (u >= 0.72 && depN > 0) {
          if (u < 0.92 || crossN === 0)
            tc = sDeps[sDepStart[s] + h32(i, 3 + j * 3) % depN];
          else
            tc = sCross[sCrossStart[s] + h32(i, 3 + j * 3) % crossN];
        }
        const tls = cLeafStart[tc], tsz = cLeafEnd[tc] - tls;
        let t = tls + h32(i, 4 + j * 3) % tsz;
        if (t === i)
          t = tls + (t - tls + 1) % tsz;
        outTarget[e] = t;
        edgeType[e] = tc === c ? h32(i, 5 + j * 3) % 3 : 0;
        inDeg[t]++;
      }
    }
    pairMap = new Map;
    const pa = [], pb = [], pc = [];
    for (let i = 0;i < n; i++) {
      const sa = leafCluster[i];
      for (let e = outStart[i];e < outStart[i + 1]; e++) {
        const sb = leafCluster[outTarget[e]];
        if (sa === sb)
          continue;
        const key = sa * C + sb;
        let p = pairMap.get(key);
        if (p === undefined) {
          p = pa.length;
          pairMap.set(key, p);
          pa.push(sa);
          pb.push(sb);
          pc.push(0);
        }
        pc[p]++;
      }
    }
    P = pa.length;
    pairA = Int32Array.from(pa);
    pairB = Int32Array.from(pb);
    pairCount = Int32Array.from(pc);
    pairState = new Uint8Array(P);
    pairTrips = new Uint16Array(P);
    pairSince = new Uint16Array(P);
    pairProbesOk = new Uint8Array(P);
    pairBy = new Uint8Array(P);
    pairVer = new Uint32Array(P);
    domPairs = new Map;
    rootPairs = [];
    for (let p = 0;p < P; p++) {
      const u = rnd(pairA[p] * 7919 + pairB[p], 51);
      pairState[p] = u < 0.84 ? 0 : u < 0.91 ? 1 : u < 0.96 ? 2 : 3;
      const h = h32(p, 52);
      pairTrips[p] = pairState[p] === 2 ? 1 + h % 40 : h % 3;
      pairSince[p] = 1 + (h >>> 8) % 180;
      pairProbesOk[p] = (h >>> 16) % 10;
      pairBy[p] = (h >>> 20) % USERS.length;
      const da = cParent[pairA[p]], db = cParent[pairB[p]];
      if (da === db) {
        let l = domPairs.get(da);
        if (!l)
          domPairs.set(da, l = []);
        l.push(p);
      } else
        rootPairs.push(p);
    }
    views.clear();
    previews.clear();
    return {
      nodes: N,
      edges: E,
      clusters: C,
      domains: D,
      systems: S,
      pairs: P,
      ms: Math.round(performance.now() - t0)
    };
  }
  const leafLabel = (i) => {
    const h = h32(i, 99);
    return NOUN[h % 64] + "-" + ADJ[(h >>> 6) % 64] + "-" + (h >>> 12) % 1000;
  };
  const idOf = (kindLeaf, idx) => (kindLeaf ? "n" : "c") + idx;
  const parseId = (id) => ({ leaf: id[0] === "n", idx: parseInt(id.slice(1), 10) });
  function pathOf(id) {
    const { leaf, idx } = parseId(id);
    const chain = [];
    let c = leaf ? leafCluster[idx] : idx;
    if (leaf)
      chain.push({ id, label: leafLabel(idx) });
    while (c >= 0) {
      chain.push({ id: "c" + c, label: cName[c] });
      c = cParent[c];
    }
    return chain.reverse();
  }
  function subtreeOf(id, levels) {
    const rows = [];
    const entity = (g, parent) => rows.push({
      id: "n" + g,
      parent,
      label: leafLabel(g),
      kind: "entity",
      type: ENTITY_TYPES[leafType[g]],
      level: 3,
      count: outStart[g + 1] - outStart[g] + inDeg[g],
      children: 0
    });
    const cluster = (c, parent, left) => {
      rows.push({
        id: "c" + c,
        parent,
        label: cName[c],
        kind: "cluster",
        type: cLevel[c] === 0 ? "Graph" : cLevel[c] === 1 ? "Domain" : SYSTEM_KINDS[cKind[c]],
        level: cLevel[c],
        count: membersOf(c),
        children: cChildCount[c]
      });
      if (left <= 1)
        return;
      const first = cChildStart[c], end = first + cChildCount[c];
      for (let k = first;k < end; k++)
        if (cLevel[c] === 2)
          entity(k, "c" + c);
        else
          cluster(k, "c" + c, left - 1);
    };
    const { leaf, idx } = parseId(id);
    if (leaf)
      entity(idx, "");
    else if (idx >= 0 && idx < C)
      cluster(idx, "", Math.max(1, levels | 0));
    if (rows.length)
      rows[0].parent = "";
    return { t: "subtree", id, levels, rows };
  }
  function membersOf(c) {
    return cLeafEnd[c] - cLeafStart[c];
  }
  function buildView(cid, wantLayout = true) {
    let v = views.get(cid);
    if (v) {
      if (v.dirty)
        refreshEdgeState(v);
      if (wantLayout && !v.laidOut)
        layoutView(v);
      return v;
    }
    const leafView = cLevel[cid] === 2;
    const start = cChildStart[cid], n = cChildCount[cid];
    v = { cid, leafView, start, n, edges: [], laidOut: false, dirty: false, sizes: null };
    v.type = new Uint8Array(n);
    v.members = new Int32Array(n);
    for (let i = 0;i < n; i++) {
      v.type[i] = leafView ? leafType[start + i] : cKind[start + i];
      v.members[i] = leafView ? 1 : membersOf(start + i);
    }
    computeEdges(v);
    computeCycles(v);
    computeRank(v);
    computeRadii(v);
    views.set(cid, v);
    if (wantLayout)
      layoutView(v);
    return v;
  }
  function computeEdges(v) {
    const map = new Map, raw = [];
    const add = (a, b, count, kind, type, pairs) => {
      const key = a * v.n + b;
      let e = map.get(key);
      if (!e) {
        e = { a, b, count: 0, kind, type, pairs: [] };
        map.set(key, e);
        raw.push(e);
      }
      e.count += count;
      if (pairs)
        e.pairs.push(...pairs);
    };
    if (v.leafView) {
      const s = v.start, end = s + v.n;
      for (let i = s;i < end; i++)
        for (let e = outStart[i];e < outStart[i + 1]; e++) {
          const t = outTarget[e];
          if (t >= s && t < end && t !== i)
            add(i - s, t - s, 1, "leaf", EDGE_TYPES[edgeType[e]], null);
        }
    } else if (v.cid === 0) {
      for (const p of rootPairs)
        add(cParent[pairA[p]] - 1, cParent[pairB[p]] - 1, pairCount[p], "agg", "calls", [p]);
    } else {
      for (const p of domPairs.get(v.cid) ?? [])
        add(pairA[p] - v.start, pairB[p] - v.start, pairCount[p], "agg", "calls", [p]);
    }
    const out = [];
    for (const e of raw) {
      if (e.merged)
        continue;
      const back = map.get(e.b * v.n + e.a);
      if (back && back !== e) {
        back.merged = true;
        out.push({
          a: e.a,
          b: e.b,
          count: e.count,
          count2: back.count,
          bidir: true,
          back: false,
          kind: e.kind,
          type: e.type,
          pairs: e.pairs.concat(back.pairs),
          ver: 0
        });
      } else
        out.push({
          a: e.a,
          b: e.b,
          count: e.count,
          count2: 0,
          bidir: false,
          back: false,
          kind: e.kind,
          type: e.type,
          pairs: e.pairs,
          ver: 0
        });
    }
    v.edges = out;
    v.adj = Array.from({ length: v.n }, () => []);
    out.forEach((e, i) => {
      v.adj[e.a].push(i);
      v.adj[e.b].push(i);
    });
    refreshEdgeState(v);
  }
  function refreshEdgeState(v) {
    for (const e of v.edges) {
      if (!e.pairs.length) {
        e.breaker = null;
        continue;
      }
      let worst = 0, trips = 0, since = 65535, probesOk = 0, by = 0, open = 0, half = 0, cut = 0, ver = 0;
      for (const p of e.pairs) {
        const st = pairState[p];
        if (SEVERITY[st] > SEVERITY[worst]) {
          worst = st;
          probesOk = pairProbesOk[p];
          by = pairBy[p];
        }
        if (st === 2)
          open++;
        else if (st === 1)
          half++;
        else if (st === 3)
          cut++;
        trips += pairTrips[p];
        if (st !== 0)
          since = Math.min(since, pairSince[p]);
        ver += pairVer[p];
      }
      const members = e.pairs.length;
      e.breaker = {
        state: STATE_NAMES[worst],
        trips,
        since: since === 65535 ? 0 : since,
        probes: 10,
        probesOk,
        by: USERS[by],
        open,
        half,
        cut,
        members,
        aggregate: members > (e.bidir ? 2 : 1),
        openShare: +(open / members).toFixed(3),
        badShare: +((open + half + cut) / members).toFixed(3)
      };
      e.traffic = e.count >= 2;
      e.ver = ver;
    }
    v.dirty = false;
  }
  function computeCycles(v) {
    const n = v.n, out = Array.from({ length: n }, () => []);
    v.edges.forEach((e, i) => {
      out[e.a].push([e.b, i]);
      if (e.bidir)
        out[e.b].push([e.a, i]);
    });
    const index = new Int32Array(n).fill(-1), low = new Int32Array(n), onStack = new Uint8Array(n);
    const comp = new Int32Array(n).fill(-1), stack = [];
    let idx = 0, nComp = 0;
    for (let s = 0;s < n; s++) {
      if (index[s] !== -1)
        continue;
      const work = [[s, 0]];
      index[s] = low[s] = idx++;
      stack.push(s);
      onStack[s] = 1;
      while (work.length) {
        const top = work[work.length - 1], u = top[0];
        if (top[1] < out[u].length) {
          const w = out[u][top[1]++][0];
          if (index[w] === -1) {
            index[w] = low[w] = idx++;
            stack.push(w);
            onStack[w] = 1;
            work.push([w, 0]);
          } else if (onStack[w])
            low[u] = Math.min(low[u], index[w]);
        } else {
          work.pop();
          if (work.length) {
            const p = work[work.length - 1][0];
            low[p] = Math.min(low[p], low[u]);
          }
          if (low[u] === index[u]) {
            let w;
            do {
              w = stack.pop();
              onStack[w] = 0;
              comp[w] = nComp;
            } while (w !== u);
            nComp++;
          }
        }
      }
    }
    const compSize = new Int32Array(nComp);
    for (let i = 0;i < n; i++)
      compSize[comp[i]]++;
    v.scc = new Int32Array(n);
    for (let i = 0;i < n; i++)
      v.scc[i] = compSize[comp[i]];
    v.comp = comp;
    const color = new Uint8Array(n);
    const markCycles = () => {
      for (const e of v.edges)
        e.cycle = e.back && v.scc[e.a] <= 12;
    };
    for (let s = 0;s < n; s++) {
      if (color[s])
        continue;
      const work = [[s, 0]];
      color[s] = 1;
      while (work.length) {
        const top = work[work.length - 1], u = top[0];
        if (top[1] < out[u].length) {
          const [w, ei] = out[u][top[1]++];
          const e = v.edges[ei];
          if (e.bidir)
            continue;
          if (color[w] === 1)
            e.back = true;
          else if (color[w] === 0) {
            color[w] = 1;
            work.push([w, 0]);
          }
        } else {
          color[u] = 2;
          work.pop();
        }
      }
    }
    markCycles();
  }
  function computeRank(v) {
    v.degree = new Float64Array(v.n);
    for (const e of v.edges) {
      v.degree[e.a] += e.count + e.count2;
      v.degree[e.b] += e.count + e.count2;
    }
    v.rank = new Float64Array(v.n);
    for (let i = 0;i < v.n; i++)
      v.rank[i] = Math.log2(1 + v.degree[i]) + Math.log2(1 + v.members[i]) * 0.6 + rnd(v.cid * 31 + i, 77) * 0.01;
    v.order = Int32Array.from({ length: v.n }, (_, i) => i).sort((a, b) => v.rank[b] - v.rank[a]);
  }
  function computeRadii(v) {
    const n = v.n;
    v.r = new Float32Array(n);
    if (v.leafView) {
      const r = Math.min(0.045, 0.42 / Math.sqrt(n));
      v.r.fill(r);
      return;
    }
    let sum = 0;
    for (let i = 0;i < n; i++)
      sum += v.members[i];
    for (let i = 0;i < n; i++)
      v.r[i] = Math.min(0.24, Math.sqrt(0.4 * v.members[i] / sum));
  }
  function phyllotaxis(n, order, r, x, y) {
    const golden = Math.PI * (3 - Math.sqrt(5));
    let maxR = 0;
    for (let i = 0;i < n; i++)
      maxR = Math.max(maxR, r[i]);
    for (let k = 0;k < n; k++) {
      const i = order[k], rad = Math.sqrt((k + 0.5) / n) * Math.max(0.2, 0.92 - maxR), a = k * golden;
      x[i] = Math.cos(a) * rad;
      y[i] = Math.sin(a) * rad;
    }
  }
  function layoutView(v) {
    const { n, r } = v;
    const x = new Float64Array(n), y = new Float64Array(n);
    phyllotaxis(n, v.order, r, x, y);
    if (n > 1) {
      const ea = v.edges.map((e) => e.a), eb = v.edges.map((e) => e.b);
      const ew = v.edges.map((e) => Math.min(3, 0.4 + Math.log2(1 + e.count + e.count2) * 0.35));
      const k = Math.sqrt(1 / n) * 0.75, k2 = k * k;
      const dx = new Float64Array(n), dy = new Float64Array(n);
      let temp = 0.08;
      const iters = n > 220 ? 70 : 100;
      for (let it = 0;it < iters; it++) {
        dx.fill(0);
        dy.fill(0);
        for (let i = 0;i < n; i++) {
          const xi = x[i], yi = y[i], ri = r[i];
          for (let j = i + 1;j < n; j++) {
            let ddx = xi - x[j], ddy = yi - y[j];
            let d2 = ddx * ddx + ddy * ddy;
            if (d2 < 0.000000000001) {
              ddx = 0.0001 * (i % 7 - 3);
              ddy = 0.0001 * (j % 5 - 2);
              d2 = ddx * ddx + ddy * ddy;
            }
            const d = Math.sqrt(d2), min = ri + r[j] + 0.012;
            let f = k2 / d;
            if (d < min)
              f += (min - d) * 6;
            const fx = ddx / d * f, fy = ddy / d * f;
            dx[i] += fx;
            dy[i] += fy;
            dx[j] -= fx;
            dy[j] -= fy;
          }
        }
        for (let m = 0;m < ea.length; m++) {
          const a = ea[m], b = eb[m];
          const ddx = x[b] - x[a], ddy = y[b] - y[a];
          const d = Math.sqrt(ddx * ddx + ddy * ddy) + 0.000000001;
          const f = d * d / k * ew[m] * 0.5;
          dx[a] += ddx / d * f;
          dy[a] += ddy / d * f;
          dx[b] -= ddx / d * f;
          dy[b] -= ddy / d * f;
        }
        for (let i = 0;i < n; i++) {
          dx[i] -= x[i] * k * 2.2;
          dy[i] -= y[i] * k * 2.2;
          const len = Math.sqrt(dx[i] * dx[i] + dy[i] * dy[i]) + 0.000000000001, step = Math.min(len, temp);
          x[i] += dx[i] / len * step;
          y[i] += dy[i] / len * step;
        }
        temp *= 0.965;
      }
      let s = Infinity;
      for (let i = 0;i < n; i++) {
        const d = Math.sqrt(x[i] * x[i] + y[i] * y[i]);
        if (d > 0.000001)
          s = Math.min(s, (0.94 - r[i]) / d);
      }
      if (!Number.isFinite(s))
        s = 1;
      for (let i = 0;i < n; i++) {
        x[i] *= s;
        y[i] *= s;
      }
      for (let pass = 0;pass < 6; pass++) {
        for (let i = 0;i < n; i++)
          for (let j = i + 1;j < n; j++) {
            const ddx = x[j] - x[i], ddy = y[j] - y[i], d = Math.sqrt(ddx * ddx + ddy * ddy) + 0.000000001, min = r[i] + r[j] + 0.006;
            if (d < min) {
              const push = (min - d) / 2;
              x[i] -= ddx / d * push;
              y[i] -= ddy / d * push;
              x[j] += ddx / d * push;
              y[j] += ddy / d * push;
            }
          }
        for (let i = 0;i < n; i++) {
          const d = Math.sqrt(x[i] * x[i] + y[i] * y[i]), max = 0.96 - r[i];
          if (d > max) {
            x[i] *= max / d;
            y[i] *= max / d;
          }
        }
      }
    }
    v.x = Float32Array.from(x);
    v.y = Float32Array.from(y);
    typeOrderFor(v);
    v.laidOut = true;
  }
  function typeOrderFor(l) {
    const n = l.type.length, buckets = Array.from({ length: 8 }, () => []);
    for (let i = 0;i < n; i++)
      buckets[l.type[i] & 7].push(i);
    l.typeStart = new Int32Array(9);
    l.typeOrder = new Int32Array(n);
    let k = 0;
    for (let t = 0;t < 8; t++) {
      l.typeStart[t] = k;
      for (const i of buckets[t])
        l.typeOrder[k++] = i;
    }
    l.typeStart[8] = k;
  }
  function preview(cid) {
    const done = views.get(cid);
    if (done && done.laidOut)
      return done;
    let p = previews.get(cid);
    if (p)
      return p;
    const leafView = cLevel[cid] === 2, start = cChildStart[cid], n = cChildCount[cid];
    const type = new Uint8Array(n), members = new Int32Array(n);
    for (let i = 0;i < n; i++) {
      type[i] = leafView ? leafType[start + i] : cKind[start + i];
      members[i] = leafView ? 1 : membersOf(start + i);
    }
    const r = new Float32Array(n);
    if (leafView)
      r.fill(Math.min(0.045, 0.42 / Math.sqrt(n)));
    else {
      let sum = 0;
      for (let i = 0;i < n; i++)
        sum += members[i];
      for (let i = 0;i < n; i++)
        r[i] = Math.min(0.24, Math.sqrt(0.4 * members[i] / sum));
    }
    const order = Int32Array.from({ length: n }, (_, i) => i).sort((a, b) => members[b] - members[a] || h32(cid, a) - h32(cid, b));
    const x = new Float32Array(n), y = new Float32Array(n);
    phyllotaxis(n, order, r, x, y);
    p = { cid, n, type, r, x, y, laidOut: false, edges: [] };
    typeOrderFor(p);
    previews.set(cid, p);
    return p;
  }
  const layoutQueue = new Map;
  let layoutTimer = 0, lastCam = null;
  function requestLayout(cid, prio) {
    const v = views.get(cid);
    if (v && v.laidOut)
      return;
    layoutQueue.set(cid, Math.max(prio, layoutQueue.get(cid) ?? 0));
    if (!layoutTimer)
      layoutTimer = setTimeout(runLayouts, 16);
  }
  function runLayouts() {
    layoutTimer = 0;
    const t0 = performance.now();
    let did = 0;
    const todo = [...layoutQueue.entries()].sort((a, b) => b[1] - a[1]);
    for (const [cid] of todo) {
      layoutQueue.delete(cid);
      buildView(cid, true);
      previews.delete(cid);
      did++;
      if (performance.now() - t0 > 12)
        break;
    }
    if (layoutQueue.size)
      layoutTimer = setTimeout(runLayouts, 0);
    if (did && lastCam)
      scheduleFrame(lastCam);
  }
  let rules = [], ruleVersion = 1;
  let showNodes = true, showRelations = true;
  const DEFAULT_STYLE = { tone: "muted", width: 1, arrow: "end" };
  function getField(o, path) {
    for (const k of path.split(".")) {
      if (o == null)
        return;
      o = o[k];
    }
    return o;
  }
  function matches(when, f) {
    for (const c of when || []) {
      const val = getField(f, c.field);
      if ("equals" in c && val !== c.equals)
        return false;
      if (c.in && !c.in.includes(val))
        return false;
      if ("exists" in c && (val !== undefined && val !== null) !== c.exists)
        return false;
      if ("gte" in c && !(typeof val === "number" && val >= c.gte))
        return false;
      if ("lte" in c && !(typeof val === "number" && val <= c.lte))
        return false;
    }
    return true;
  }
  function factsOf(e) {
    return {
      kind: e.kind,
      type: e.type,
      count: e.count + e.count2,
      bidir: e.bidir,
      back: e.back,
      cycle: !!e.cycle,
      traffic: !!e.traffic,
      breaker: e.breaker || undefined
    };
  }
  function styleOf(e) {
    const key = ruleVersion + ":" + e.ver + ":" + (e.breaker ? e.breaker.state : "");
    if (e.styleKey === key)
      return e.style;
    const f = factsOf(e);
    let best = null;
    for (const r of rules)
      if (matches(r.when, f) && (!best || r.priority > best.priority || r.priority === best.priority && r.order > best.order))
        best = r;
    const s = Object.assign({}, DEFAULT_STYLE, best ? best.style : null);
    if (f.cycle) {
      s.route = s.route || "around";
      if (s.tone === "muted") {
        s.tone = "accent";
        s.dash = s.dash || [5, 4];
      }
    }
    if (s.dash && !s.dash.length)
      s.dash = null;
    e.style = s;
    e.styleKey = key;
    return s;
  }
  let canvas = null, ctx = null;
  let palette = {
    paper: "#ffffff",
    ink: "#111111",
    muted: "#71717a",
    border: "#e4e4e7",
    ring: "#2563eb",
    tones: {
      muted: "#a1a1aa",
      ink: "#18181b",
      accent: "#7c3aed",
      link: "#2563eb",
      ok: "#16a34a",
      warn: "#d97706",
      danger: "#dc2626"
    },
    cat: ["#e76e50", "#2a9d90", "#274754", "#e8c468", "#f4a462", "#8b5cf6", "#ec4899", "#14b8a6"],
    font: "system-ui, sans-serif",
    dark: false
  };
  let selfStats = { ms: 0, dots: 0, edges: 0, labels: 0 };
  let dotCanvas = null, dotCtx = null, dotImg = null, dotBuf = null, probeCtx = null;
  const rgbaCache = new Map;
  function rgba(color, a) {
    let base = rgbaCache.get(color);
    if (!base) {
      probeCtx = probeCtx || new OffscreenCanvas(1, 1).getContext("2d", { willReadFrequently: true });
      probeCtx.clearRect(0, 0, 1, 1);
      probeCtx.fillStyle = "#888";
      probeCtx.fillStyle = color;
      probeCtx.fillRect(0, 0, 1, 1);
      const d = probeCtx.getImageData(0, 0, 1, 1).data;
      base = [d[0], d[1], d[2]];
      rgbaCache.set(color, base);
    }
    return (Math.round(a * 255) << 24 | base[2] << 16 | base[1] << 8 | base[0]) >>> 0;
  }
  const pendingFrame = { cam: null, timer: 0 };
  function scheduleFrame(cam) {
    if (!pendingFrame.cam || cam.id >= pendingFrame.cam.id)
      pendingFrame.cam = cam;
    if (!pendingFrame.timer)
      pendingFrame.timer = setTimeout(() => {
        pendingFrame.timer = 0;
        const c = pendingFrame.cam;
        pendingFrame.cam = null;
        if (c)
          renderFrame(c);
      }, 0);
  }
  const alpha = (color, a) => {
    ctx.globalAlpha = a;
    return color;
  };
  function anchorBox(isCluster, tier, sx, sy, rs, bw, bh) {
    if (isCluster && tier === 2)
      return [sx - bw / 2, Math.max(sy - rs * 0.86 + 6, sy - rs + 4)];
    return [sx - bw / 2, sy - bh / 2];
  }
  const drawR = (isCluster, rs) => isCluster ? Math.max(1.6, rs) : Math.min(6, Math.max(2.5, rs * 0.18));
  function renderFrame(cam) {
    const t0 = performance.now();
    lastCam = cam;
    const cid = cam.view;
    const v = buildView(cid, true);
    const W = Math.max(1, Math.round(cam.w * cam.dpr)), H = Math.max(1, Math.round(cam.h * cam.dpr));
    if (!canvas || canvas.width !== W || canvas.height !== H) {
      canvas = new OffscreenCanvas(W, H);
      ctx = canvas.getContext("2d");
    }
    ctx.setTransform(cam.dpr, 0, 0, cam.dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, cam.w, cam.h);
    const z = cam.z, ox = cam.w / 2 - cam.cx * z, oy = cam.h / 2 - cam.cy * z;
    const { w: vw, h: vh } = cam;
    let dots = 0, segs = 0, labels = 0;
    if (!dotCanvas || dotCanvas.width !== W || dotCanvas.height !== H) {
      dotCanvas = new OffscreenCanvas(W, H);
      dotCtx = dotCanvas.getContext("2d");
      dotImg = dotCtx.createImageData(W, H);
      dotBuf = new Uint32Array(dotImg.data.buffer);
    } else
      dotBuf.fill(0);
    const ds = cam.dpr >= 1.5 ? 3 : 2, dpr = cam.dpr;
    let usedDots = false;
    const farField = (l, x0, y0, r0, a) => {
      for (let t = 0;t < 8; t++) {
        const from = l.typeStart[t], to = l.typeStart[t + 1];
        if (from === to)
          continue;
        const px32 = rgba(palette.cat[t], a);
        ctx.fillStyle = alpha(palette.cat[t], a);
        let pathOpen = false;
        for (let k = from;k < to; k++) {
          const j = l.typeOrder[k];
          const gx = x0 + l.x[j] * r0, gy = y0 + l.y[j] * r0, gr = l.r[j] * r0;
          if (gx < -4 || gx > vw + 4 || gy < -4 || gy > vh + 4)
            continue;
          if (gr < 1.3) {
            const px = Math.round(gx * dpr) - 1, py = Math.round(gy * dpr) - 1;
            if (px >= 0 && py >= 0 && px + ds <= W && py + ds <= H) {
              for (let yy = 0;yy < ds; yy++) {
                const row = (py + yy) * W + px;
                for (let xx = 0;xx < ds; xx++)
                  dotBuf[row + xx] = px32;
              }
              usedDots = true;
            }
          } else {
            if (!pathOpen) {
              ctx.beginPath();
              pathOpen = true;
            }
            ctx.moveTo(gx + gr, gy);
            ctx.arc(gx, gy, gr, 0, Math.PI * 2);
          }
          dots++;
        }
        if (pathOpen)
          ctx.fill();
      }
    };
    if (cid !== 0) {
      const pv = buildView(cParent[cid], true), fi = cid - pv.start;
      const fx = pv.x[fi], fy = pv.y[fi], fr = pv.r[fi];
      const tx = (x) => (x - fx) / fr * z + ox, ty = (y) => (y - fy) / fr * z + oy;
      let backdropDots = 0;
      for (let j = 0;j < pv.n; j++) {
        if (j === fi)
          continue;
        const sx = tx(pv.x[j]), sy = ty(pv.y[j]), rs = pv.r[j] / fr * z;
        if (sx + rs < -50 || sx - rs > vw + 50 || sy + rs < -50 || sy - rs > vh + 50)
          continue;
        const col = palette.cat[pv.type[j] & 7];
        ctx.beginPath();
        ctx.arc(sx, sy, Math.max(1.5, rs), 0, Math.PI * 2);
        ctx.fillStyle = alpha(col, 0.05);
        ctx.fill();
        ctx.strokeStyle = alpha(col, 0.28);
        ctx.lineWidth = 1;
        ctx.stroke();
        const sc = pv.start + j;
        if (rs >= 6 && backdropDots < 60000) {
          if (rs > 120)
            requestLayout(sc, rs * 0.5);
          const l = preview(sc), d0 = dots;
          if (cLevel[sc] === 2)
            farField(l, sx, sy, rs, 0.4);
          else {
            const cs = cChildStart[sc];
            for (let t = 0;t < 8; t++) {
              ctx.beginPath();
              let any = false;
              for (let k = 0;k < l.n; k++) {
                if ((l.type[k] & 7) !== t)
                  continue;
                const gx = sx + l.x[k] * rs, gy = sy + l.y[k] * rs, gr = l.r[k] * rs;
                if (gx + gr < 0 || gx - gr > vw || gy + gr < 0 || gy - gr > vh || gr < 1.5)
                  continue;
                ctx.moveTo(gx + gr, gy);
                ctx.arc(gx, gy, gr, 0, Math.PI * 2);
                any = true;
              }
              if (any) {
                ctx.strokeStyle = alpha(palette.cat[t], 0.3);
                ctx.lineWidth = 1;
                ctx.stroke();
              }
            }
            for (let k = 0;k < l.n && backdropDots + dots - d0 < 60000; k++) {
              const gx = sx + l.x[k] * rs, gy = sy + l.y[k] * rs, gr = l.r[k] * rs;
              if (gr < 4 || gx + gr < 0 || gx - gr > vw || gy + gr < 0 || gy - gr > vh)
                continue;
              farField(preview(cs + k), gx, gy, gr, 0.4);
            }
          }
          backdropDots += dots - d0;
        }
        if (showNodes && rs > 16 && labels < 80) {
          ctx.globalAlpha = 0.55;
          ctx.fillStyle = palette.muted;
          ctx.font = "11px " + palette.font;
          ctx.textAlign = "center";
          ctx.fillText(cName[pv.start + j], sx, sy + 4);
          labels++;
        }
      }
      const picked = cam.sel && cam.sel.length > 0 || !!cam.edge;
      for (const e of showRelations ? pv.edges : []) {
        const incident = e.a === fi || e.b === fi;
        const st = styleOf(e);
        let ax = tx(pv.x[e.a]), ay = ty(pv.y[e.a]), bx = tx(pv.x[e.b]), by = ty(pv.y[e.b]);
        if (incident) {
          const len = Math.hypot(bx - ax, by - ay) || 1, ux = (bx - ax) / len, uy = (by - ay) / len;
          if (e.a === fi) {
            ax += ux * z;
            ay += uy * z;
          } else {
            bx -= ux * z;
            by -= uy * z;
          }
        }
        ctx.globalAlpha = incident ? picked ? 0.3 : 0.7 : 0.1;
        ctx.strokeStyle = palette.tones[st.tone] || palette.tones.muted;
        ctx.lineWidth = incident ? Math.min(4, 1 + Math.log10(e.count + e.count2 + 1)) : 0.75;
        ctx.setLineDash(incident && st.dash ? st.dash : []);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
        ctx.stroke();
        segs++;
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = palette.dark ? 0.4 : 0.32;
      ctx.fillStyle = palette.paper;
      ctx.beginPath();
      ctx.rect(0, 0, vw, vh);
      ctx.arc(ox, oy, z, 0, Math.PI * 2, true);
      ctx.fill("evenodd");
      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = palette.ink;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(ox, oy, z, 0, Math.PI * 2);
      ctx.stroke();
    }
    const n = v.n, sx = new Float32Array(n), sy = new Float32Array(n), rs = new Float32Array(n);
    const vis = new Uint8Array(n);
    for (let i = 0;i < n; i++) {
      sx[i] = v.x[i] * z + ox;
      sy[i] = v.y[i] * z + oy;
      rs[i] = v.r[i] * z;
      vis[i] = sx[i] + rs[i] > -40 && sx[i] - rs[i] < vw + 40 && sy[i] + rs[i] > -40 && sy[i] - rs[i] < vh + 40 ? 1 : 0;
    }
    const sel = new Set(cam.sel || []);
    const pair = Array.isArray(cam.edge) && cam.edge.length === 2 ? cam.edge : null;
    const hl = new Set;
    const focusNodes = [...sel];
    if (pair)
      focusNodes.push(pair[0], pair[1]);
    if (cam.hover >= 0)
      focusNodes.push(cam.hover);
    for (const f of focusNodes) {
      hl.add(f);
      if (pair)
        continue;
      for (const ei of v.adj[f] || []) {
        const e = v.edges[ei];
        hl.add(e.a);
        hl.add(e.b);
      }
    }
    const dimming = focusNodes.length > 0;
    const tiers = new Int8Array(n).fill(-1);
    const sizes = v.sizes;
    const cell = 96, grid = new Map, boxes = [];
    const fits = (x, y, w, h) => {
      const pad = 3, x0 = Math.floor((x - pad) / cell), x1 = Math.floor((x + w + pad) / cell), y0 = Math.floor((y - pad) / cell), y1 = Math.floor((y + h + pad) / cell);
      for (let gx = x0;gx <= x1; gx++)
        for (let gy = y0;gy <= y1; gy++) {
          const list = grid.get(gx * 100003 + gy);
          if (!list)
            continue;
          for (const b of list)
            if (x < b[0] + b[2] + pad && x + w + pad > b[0] && y < b[1] + b[3] + pad && y + h + pad > b[1])
              return false;
        }
      return true;
    };
    const place = (x, y, w, h) => {
      const b = [x, y, w, h];
      boxes.push(b);
      const x0 = Math.floor(x / cell), x1 = Math.floor((x + w) / cell), y0 = Math.floor(y / cell), y1 = Math.floor((y + h) / cell);
      for (let gx = x0;gx <= x1; gx++)
        for (let gy = y0;gy <= y1; gy++) {
          const k = gx * 100003 + gy;
          let l = grid.get(k);
          if (!l)
            grid.set(k, l = []);
          l.push(b);
        }
    };
    const isCluster = !v.leafView;
    const order = [];
    const pushed = new Uint8Array(n);
    for (const f of [...sel, cam.hover, cam.kbd])
      if (f >= 0 && f < n && !pushed[f]) {
        pushed[f] = 1;
        order.push(f);
      }
    for (const i of v.order)
      if (!pushed[i])
        order.push(i);
    let cards = 0, chips = 0;
    const chipMin = isCluster ? 24 : 7, cardMin = isCluster ? 200 : 40;
    for (const i of order) {
      if (!vis[i])
        continue;
      tiers[i] = 0;
      const d = rs[i] * 2, forced = sel.has(i) || i === cam.hover || i === cam.kbd;
      const cw = sizes ? sizes[i * 4 + 2] : isCluster ? 248 : 220, ch = sizes ? sizes[i * 4 + 3] : isCluster ? 104 : 92;
      const pw = sizes ? sizes[i * 4] : isCluster ? 150 : 140, ph = sizes ? sizes[i * 4 + 1] : 28;
      if (d >= cardMin && cards < 120 && (!isCluster || rs[i] * 1.6 > cw)) {
        const [x, y] = anchorBox(isCluster, 2, sx[i], sy[i], rs[i], cw, ch);
        if (forced || fits(x, y, cw, ch)) {
          place(x, y, cw, ch);
          tiers[i] = 2;
          cards++;
          continue;
        }
      }
      if ((d >= chipMin || forced) && chips < 300) {
        const [x, y] = anchorBox(isCluster, 1, sx[i], sy[i], rs[i], pw, ph);
        if (forced || fits(x, y, pw, ph)) {
          place(x, y, pw, ph);
          tiers[i] = 1;
          chips++;
        }
      }
    }
    for (let t = 0;t < 8; t++) {
      const col = palette.cat[t];
      for (let pass = 0;pass < 2; pass++) {
        ctx.beginPath();
        let any = false;
        for (let i = 0;i < n; i++) {
          if (!vis[i] || (v.type[i] & 7) !== t)
            continue;
          const dim = dimming && !hl.has(i);
          if (pass === 1 !== dim)
            continue;
          const dr = drawR(isCluster, rs[i]);
          ctx.moveTo(sx[i] + dr, sy[i]);
          ctx.arc(sx[i], sy[i], dr, 0, Math.PI * 2);
          any = true;
        }
        if (!any)
          continue;
        if (isCluster) {
          ctx.fillStyle = alpha(col, pass ? 0.03 : 0.07);
          ctx.fill();
          ctx.strokeStyle = alpha(col, pass ? 0.22 : 0.6);
          ctx.lineWidth = 1.25;
          ctx.stroke();
        } else {
          ctx.fillStyle = alpha(col, pass ? 0.25 : 0.95);
          ctx.fill();
        }
      }
    }
    if (isCluster) {
      let innerSegs = 0;
      for (let i = 0;i < n; i++) {
        if (!vis[i] || rs[i] < 3)
          continue;
        const cc = v.start + i;
        const l = preview(cc);
        if (rs[i] > 36)
          requestLayout(cc, rs[i]);
        const dim = dimming && !hl.has(i);
        farField(l, sx[i], sy[i], rs[i], dim ? 0.2 : cLevel[cc] < 2 ? 0.55 : 0.85);
        if (showRelations && rs[i] > 170 && l.laidOut && innerSegs < 6000) {
          ctx.strokeStyle = alpha(palette.muted, dim ? 0.06 : 0.22);
          ctx.lineWidth = 0.75;
          ctx.beginPath();
          for (const e of l.edges) {
            ctx.moveTo(sx[i] + l.x[e.a] * rs[i], sy[i] + l.y[e.a] * rs[i]);
            ctx.lineTo(sx[i] + l.x[e.b] * rs[i], sy[i] + l.y[e.b] * rs[i]);
            if (++innerSegs >= 6000)
              break;
          }
          ctx.stroke();
          segs += l.edges.length;
        }
      }
    }
    if (usedDots) {
      dotCtx.putImageData(dotImg, 0, 0);
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = 1;
      ctx.drawImage(dotCanvas, 0, 0);
      ctx.restore();
    }
    const buckets = new Map;
    for (let ei = 0;showRelations && ei < v.edges.length; ei++) {
      const e = v.edges[ei];
      const { a, b } = e;
      if (!vis[a] && !vis[b]) {
        const minx = Math.min(sx[a], sx[b]), maxx = Math.max(sx[a], sx[b]), miny = Math.min(sy[a], sy[b]), maxy = Math.max(sy[a], sy[b]);
        if (maxx < 0 || minx > vw || maxy < 0 || miny > vh)
          continue;
      }
      const st = styleOf(e);
      const incident = dimming && (pair ? a === pair[0] && b === pair[1] || a === pair[1] && b === pair[0] : focusNodes.includes(a) || focusNodes.includes(b));
      const calm = st.tone === "muted";
      const a0 = dimming ? incident ? 0.95 : 0.1 : calm ? e.kind === "agg" ? 0.3 : 0.38 : 0.8;
      const w = e.kind === "agg" ? Math.min(5, st.width * (1 + Math.min(1.6, Math.log10(e.count + e.count2) * 0.7))) : st.width;
      const key = st.tone + "|" + w.toFixed(2) + "|" + (st.dash ? st.dash.join(",") : "") + "|" + a0;
      let bk = buckets.get(key);
      if (!bk)
        buckets.set(key, bk = { tone: st.tone, w, dash: st.dash, a: a0, lines: [], arrows: [] });
      edgeGeometry(sx[a], sy[a], drawR(isCluster, rs[a]), sx[b], sy[b], drawR(isCluster, rs[b]), st, e.bidir, w, bk.lines, bk.arrows);
      segs++;
    }
    for (const bk of buckets.values()) {
      const col = palette.tones[bk.tone] || palette.tones.muted;
      ctx.globalAlpha = bk.a;
      ctx.strokeStyle = col;
      ctx.lineWidth = bk.w;
      ctx.setLineDash(bk.dash || []);
      ctx.beginPath();
      for (const poly of bk.lines) {
        ctx.moveTo(poly[0], poly[1]);
        for (let k = 2;k < poly.length; k += 2)
          ctx.lineTo(poly[k], poly[k + 1]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = col;
      ctx.beginPath();
      for (const t of bk.arrows) {
        ctx.moveTo(t[0], t[1]);
        ctx.lineTo(t[2], t[3]);
        ctx.lineTo(t[4], t[5]);
        ctx.closePath();
      }
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.font = "11px " + palette.font;
    ctx.textAlign = "left";
    ctx.fillStyle = palette.muted;
    const dotLabels = [];
    for (const i of order) {
      if (!showNodes || tiers[i] !== 0 || labels >= 160)
        continue;
      if (dimming && !hl.has(i))
        continue;
      const text = v.leafView ? leafLabel(v.start + i) : cName[v.start + i];
      const x = sx[i] + drawR(isCluster, rs[i]) + 4, y = sy[i] - 7;
      if (!fits(x, y, text.length * 4.5 + 4, 14))
        continue;
      const w = Math.ceil(ctx.measureText(text).width) + 4;
      if (!fits(x, y, w, 14))
        continue;
      place(x, y, w, 14);
      ctx.fillText(text, x, y + 11);
      dotLabels.push([x, y, w, 14]);
      labels++;
    }
    const bitmap = canvas.transferToImageBitmap();
    selfStats = { ms: +(performance.now() - t0).toFixed(1), dots, edges: segs, labels, cards, chips, view: cid };
    self.postMessage({
      t: "frame",
      camId: cam.id,
      view: cid,
      tiers,
      bitmap,
      dotLabels,
      stats: selfStats,
      cam: { cx: cam.cx, cy: cam.cy, z: cam.z, w: cam.w, h: cam.h }
    }, [bitmap, tiers.buffer]);
  }
  function edgeGeometry(ax, ay, ar, bx, by, br, st, bidir, w, lines, arrows) {
    const dx = bx - ax, dy = by - ay, len = Math.hypot(dx, dy);
    if (len < ar + br + 2)
      return;
    const ux = dx / len, uy = dy / len, head = st.arrow === "none" ? 0 : 3.5 + w * 1.4;
    if (st.route === "around") {
      const cx = (ax + bx) / 2 - uy * len * 0.22, cy = (ay + by) / 2 + ux * len * 0.22;
      const s0x = cx - ax, s0y = cy - ay, s0 = Math.hypot(s0x, s0y) || 1, e0x = cx - bx, e0y = cy - by, e0 = Math.hypot(e0x, e0y) || 1;
      const p0x = ax + s0x / s0 * ar, p0y = ay + s0y / s0 * ar, p2x = bx + e0x / e0 * (br + head * 0.6), p2y = by + e0y / e0 * (br + head * 0.6);
      const pts = (t0, t1) => {
        const out = [];
        for (let k = 0;k <= 10; k++) {
          const t = t0 + (t1 - t0) * k / 10, mt = 1 - t;
          out.push(mt * mt * p0x + 2 * mt * t * cx + t * t * p2x, mt * mt * p0y + 2 * mt * t * cy + t * t * p2y);
        }
        return out;
      };
      if (st.gap && len > 40) {
        lines.push(pts(0, 0.44));
        lines.push(pts(0.56, 1));
      } else
        lines.push(pts(0, 1));
      if (head) {
        const hx = p2x - cx, hy = p2y - cy, hl = Math.hypot(hx, hy) || 1;
        arrows.push(tri(p2x, p2y, hx / hl, hy / hl, head));
      }
      return;
    }
    const p0x = ax + ux * (ar + (bidir && head ? head * 0.6 : 0)), p0y = ay + uy * (ar + (bidir && head ? head * 0.6 : 0));
    const p2x = bx - ux * (br + head * 0.6), p2y = by - uy * (br + head * 0.6);
    if (st.gap && len > 40) {
      const mx = (p0x + p2x) / 2, my = (p0y + p2y) / 2, g = 6;
      lines.push([p0x, p0y, mx - ux * g, my - uy * g]);
      lines.push([mx + ux * g, my + uy * g, p2x, p2y]);
    } else
      lines.push([p0x, p0y, p2x, p2y]);
    if (head) {
      arrows.push(tri(p2x, p2y, ux, uy, head));
      if (bidir)
        arrows.push(tri(p0x, p0y, -ux, -uy, head));
    }
  }
  function tri(x, y, ux, uy, s) {
    const bx = x - ux * s, by = y - uy * s, px = -uy * s * 0.55, py = ux * s * 0.55;
    return [x + ux * s * 0.6, y + uy * s * 0.6, bx + px, by + py, bx - px, by - py];
  }
  function viewPayload(cid) {
    const v = buildView(cid, true);
    const children = [];
    for (let i = 0;i < v.n; i++) {
      const g = v.start + i;
      const node = {
        i,
        id: idOf(v.leafView, g),
        kind: v.leafView ? "entity" : "cluster",
        label: v.leafView ? leafLabel(g) : cName[g],
        type: v.type[i],
        typeName: v.leafView ? ENTITY_TYPES[v.type[i]] : cLevel[g] === 1 ? "Domain" : SYSTEM_KINDS[v.type[i]],
        members: v.members[i],
        children: v.leafView ? 0 : cChildCount[g],
        degree: Math.round(v.degree[i]),
        scc: v.scc[i],
        x: v.x[i],
        y: v.y[i],
        r: v.r[i]
      };
      if (v.leafView) {
        const h = h32(g, 61);
        node.degree = outStart[g + 1] - outStart[g] + inDeg[g];
        node.attrs = {
          owner: USERS[h % USERS.length],
          rows: (h >>> 4) % 9000 + 12,
          freshness: 1 + (h >>> 18) % 48,
          out: outStart[g + 1] - outStart[g],
          in: inDeg[g]
        };
      }
      children.push(node);
    }
    const edges = v.edges.map((e, k) => ({
      k,
      a: e.a,
      b: e.b,
      count: e.count,
      count2: e.count2,
      bidir: e.bidir,
      back: e.back,
      kind: e.kind,
      type: e.type,
      breaker: e.breaker,
      traffic: !!e.traffic,
      style: styleOf(e)
    }));
    let parent = null;
    if (cid !== 0) {
      const pv = buildView(cParent[cid], true), fi = cid - pv.start, fr = pv.r[fi];
      const external = [];
      for (const e of pv.edges) {
        if (e.a !== fi && e.b !== fi)
          continue;
        const j = e.a === fi ? e.b : e.a;
        external.push({
          id: "c" + (pv.start + j),
          label: cName[pv.start + j],
          x: (pv.x[j] - pv.x[fi]) / fr,
          y: (pv.y[j] - pv.y[fi]) / fr,
          r: pv.r[j] / fr,
          out: e.a === fi ? e.count : e.count2,
          in: e.a === fi ? e.count2 : e.count,
          breaker: e.breaker,
          style: styleOf(e)
        });
      }
      parent = { id: "c" + cParent[cid], x: pv.x[fi], y: pv.y[fi], r: fr, external };
    }
    return {
      t: "view",
      id: "c" + cid,
      cid,
      leafView: v.leafView,
      path: pathOf("c" + cid),
      children,
      edges,
      parent,
      stats: { nodes: N, edges: E }
    };
  }
  function details(id) {
    const { leaf, idx } = parseId(id);
    if (leaf) {
      const out = [];
      for (let e = outStart[idx];e < outStart[idx + 1] && out.length < 40; e++) {
        const t = outTarget[e];
        out.push({
          id: "n" + t,
          label: leafLabel(t),
          type: ENTITY_TYPES[leafType[t]],
          system: cName[leafCluster[t]],
          domain: cName[cParent[leafCluster[t]]],
          edge: EDGE_TYPES[edgeType[e]],
          same: leafCluster[t] === leafCluster[idx]
        });
      }
      const inc = [], want = Math.min(40, inDeg[idx]), sys = leafCluster[idx], dom = cParent[sys];
      const ranges = [
        [cLeafStart[sys], cLeafEnd[sys]],
        [cLeafStart[dom], cLeafStart[sys]],
        [cLeafEnd[sys], cLeafEnd[dom]],
        [0, cLeafStart[dom]],
        [cLeafEnd[dom], N]
      ];
      for (const [r0, r1] of ranges) {
        for (let i = r0;i < r1 && inc.length < want; i++)
          for (let e = outStart[i];e < outStart[i + 1]; e++)
            if (outTarget[e] === idx) {
              inc.push({
                id: "n" + i,
                label: leafLabel(i),
                type: ENTITY_TYPES[leafType[i]],
                system: cName[leafCluster[i]],
                domain: cName[cParent[leafCluster[i]]],
                edge: EDGE_TYPES[edgeType[e]],
                same: leafCluster[i] === sys
              });
              break;
            }
        if (inc.length >= want)
          break;
      }
      return {
        t: "details",
        id,
        out,
        in: inc,
        outDeg: outStart[idx + 1] - outStart[idx],
        inDeg: inDeg[idx],
        path: pathOf(id)
      };
    }
    const relations = [];
    if (idx !== 0) {
      const pv = buildView(cParent[idx], false), fi = idx - pv.start;
      for (const ei of pv.adj[fi]) {
        const e = pv.edges[ei], j = e.a === fi ? e.b : e.a;
        relations.push({
          id: "c" + (pv.start + j),
          label: cName[pv.start + j],
          out: e.a === fi ? e.count : e.count2,
          in: e.a === fi ? e.count2 : e.count,
          breaker: e.breaker,
          back: e.back
        });
      }
      relations.sort((a, b) => b.out + b.in - (a.out + a.in));
    }
    return {
      t: "details",
      id,
      relations: relations.slice(0, 60),
      members: membersOf(idx),
      children: cChildCount[idx],
      level: cLevel[idx],
      path: pathOf(id)
    };
  }
  const endOf = (leaf, idx) => leaf ? { id: "n" + idx, label: leafLabel(idx), type: ENTITY_TYPES[leafType[idx]], system: cName[leafCluster[idx]] } : { id: "c" + idx, label: cName[idx], type: cLevel[idx] === 1 ? "Domain" : SYSTEM_KINDS[cKind[idx]] };
  function rowsOf(id) {
    if (id.includes(">")) {
      const [aId, bId] = id.split(">");
      const A = parseId(aId), B = parseId(bId);
      const span = (p) => p.leaf ? [p.idx, p.idx + 1] : [cLeafStart[p.idx], cLeafEnd[p.idx]];
      const [a0, a1] = span(A), [b0, b1] = span(B);
      const rows = [];
      const scan = (s0, s1, t0, t1, back) => {
        for (let i = s0;i < s1; i++)
          for (let e = outStart[i];e < outStart[i + 1]; e++) {
            const t = outTarget[e];
            if (t < t0 || t >= t1)
              continue;
            rows.push({
              id: e,
              from: "n" + i,
              fromLabel: leafLabel(i),
              relation: EDGE_TYPES[edgeType[e]],
              to: "n" + t,
              toLabel: leafLabel(t),
              direction: back ? "back" : "forward",
              fromSystem: cName[leafCluster[i]],
              toSystem: cName[leafCluster[t]]
            });
          }
      };
      scan(a0, a1, b0, b1, false);
      scan(b0, b1, a0, a1, true);
      return { t: "rows", id, kind: "links", rows };
    }
    const { leaf, idx } = parseId(id);
    const s0 = leaf ? idx : cLeafStart[idx], s1 = leaf ? idx + 1 : cLeafEnd[idx];
    const rows = [];
    for (let g = s0;g < s1; g++) {
      const h = h32(g, 61), sys = leafCluster[g];
      rows.push({
        id: "n" + g,
        label: leafLabel(g),
        type: ENTITY_TYPES[leafType[g]],
        system: cName[sys],
        domain: cName[cParent[sys]],
        owner: USERS[h % USERS.length],
        out: outStart[g + 1] - outStart[g],
        in: inDeg[g],
        rows: (h >>> 4) % 9000 + 12,
        freshness: 1 + (h >>> 18) % 48
      });
    }
    return { t: "rows", id, kind: "entities", rows };
  }
  function edgeDetails(aId, bId) {
    const A = parseId(aId), B = parseId(bId);
    const byType = {};
    for (const t of EDGE_TYPES)
      byType[t] = 0;
    const samples = [];
    const out = {
      t: "edge",
      id: aId + ">" + bId,
      kind: A.leaf ? "leaf" : "agg",
      path: pathOf("c" + (A.leaf ? leafCluster[A.idx] : cParent[A.idx])),
      source: endOf(A.leaf, A.idx),
      target: endOf(B.leaf, B.idx),
      forward: 0,
      backward: 0,
      byType,
      pairs: [],
      sources: [],
      targets: [],
      samples
    };
    if (A.leaf) {
      for (const [from, to, back] of [
        [A.idx, B.idx, false],
        [B.idx, A.idx, true]
      ])
        for (let e = outStart[from];e < outStart[from + 1]; e++) {
          if (outTarget[e] !== to)
            continue;
          if (back)
            out.backward++;
          else
            out.forward++;
          byType[EDGE_TYPES[edgeType[e]]]++;
          samples.push({ from: endOf(true, from), to: endOf(true, to), type: EDGE_TYPES[edgeType[e]], back });
        }
      return out;
    }
    const domainEdge = cLevel[A.idx] === 1;
    const keyOf = (leaf) => domainEdge ? leafCluster[leaf] : leaf;
    const sent = new Map, got = new Map;
    let fs = 0, bs = 0;
    const scan = (s0, s1, t0, t1, back) => {
      let n = 0;
      for (let i = s0;i < s1; i++)
        for (let e = outStart[i];e < outStart[i + 1]; e++) {
          const t = outTarget[e];
          if (t < t0 || t >= t1)
            continue;
          n++;
          byType[EDGE_TYPES[edgeType[e]]]++;
          if (!back) {
            const ks = keyOf(i), kt = keyOf(t);
            sent.set(ks, (sent.get(ks) || 0) + 1);
            got.set(kt, (got.get(kt) || 0) + 1);
          }
          if (back ? bs < 12 : fs < 28) {
            samples.push({ from: endOf(true, i), to: endOf(true, t), type: EDGE_TYPES[edgeType[e]], back });
            if (back)
              bs++;
            else
              fs++;
          }
        }
      return n;
    };
    out.forward = scan(cLeafStart[A.idx], cLeafEnd[A.idx], cLeafStart[B.idx], cLeafEnd[B.idx], false);
    out.backward = scan(cLeafStart[B.idx], cLeafEnd[B.idx], cLeafStart[A.idx], cLeafEnd[A.idx], true);
    const top = (m) => [...m.entries()].sort((x, y) => y[1] - x[1]).slice(0, 8).map(([k, count]) => {
      const end = endOf(!domainEdge, k);
      return { id: end.id, label: end.label, type: end.type, count };
    });
    out.sources = top(sent);
    out.targets = top(got);
    const pairs = [];
    if (domainEdge) {
      for (const p of rootPairs) {
        const da = cParent[pairA[p]], db = cParent[pairB[p]];
        if (da === A.idx && db === B.idx || da === B.idx && db === A.idx)
          pairs.push(p);
      }
    } else
      for (const key of [A.idx * C + B.idx, B.idx * C + A.idx]) {
        const p = pairMap.get(key);
        if (p !== undefined)
          pairs.push(p);
      }
    out.pairs = pairs.sort((p, q) => SEVERITY[pairState[q]] - SEVERITY[pairState[p]] || pairCount[q] - pairCount[p]).slice(0, 40).map((p) => ({
      from: endOf(false, pairA[p]),
      to: endOf(false, pairB[p]),
      count: pairCount[p],
      state: STATE_NAMES[pairState[p]],
      trips: pairTrips[p],
      since: pairSince[p],
      by: USERS[pairBy[p]]
    }));
    return out;
  }
  let searchSeq = 0;
  function search(q, seq) {
    searchSeq = seq;
    const query = String(q || "").trim().toLowerCase();
    if (!query) {
      self.postMessage({ t: "search", seq, q, results: [] });
      return;
    }
    const results = [];
    const push = (id, label, kind, type) => {
      const chain = pathOf(id);
      results.push({
        id,
        label,
        kind,
        type,
        path: chain.slice(1, -1).map((p) => p.label).join(" › "),
        parents: chain.slice(0, -1)
      });
    };
    const direct = /^#?(\d+)$/.exec(query);
    if (direct && +direct[1] < N)
      push("n" + direct[1], leafLabel(+direct[1]), "entity", ENTITY_TYPES[leafType[+direct[1]]]);
    for (let c = 1;c < C && results.length < 6; c++)
      if (cName[c].toLowerCase().includes(query))
        push("c" + c, cName[c], "cluster", cLevel[c] === 1 ? "Domain" : SYSTEM_KINDS[cKind[c]]);
    let i = 0;
    const step = () => {
      if (seq !== searchSeq)
        return;
      const end = Math.min(N, i + 120000);
      for (;i < end && results.length < 12; i++)
        if (leafLabel(i).includes(query))
          push("n" + i, leafLabel(i), "entity", ENTITY_TYPES[leafType[i]]);
      if (i < N && results.length < 12) {
        self.postMessage({ t: "search", seq, q, results, partial: true, scanned: i });
        setTimeout(step, 0);
      } else
        self.postMessage({ t: "search", seq, q, results, scanned: i });
    };
    step();
  }
  let simTimer = 0;
  const BREAKER_WORDS = ["Closed", "Half-open", "Open"];
  const BREAKER_TONES = ["ok", "warn", "danger"];
  function simulate(on) {
    clearInterval(simTimer);
    simTimer = 0;
    if (on)
      simTimer = setInterval(simStep, 1100);
  }
  function simStep() {
    if (!lastCam)
      return;
    const v = views.get(lastCam.view);
    if (!v)
      return;
    const t = Date.now() & 65535, now = Date.now(), viewId = "c" + v.cid;
    const childId = (i) => (v.leafView ? "n" : "c") + (v.start + i);
    const childLabel = (i) => v.leafView ? leafLabel(v.start + i) : cName[v.start + i];
    const items = [];
    const linked = v.leafView ? [] : v.edges.map((_e, k) => k).filter((k) => v.edges[k].pairs.length);
    const pool = v.leafView ? domPairs.get(cParent[v.cid]) ?? [] : null;
    for (let k = 0;k < 3; k++) {
      let p, e;
      if (pool) {
        if (!pool.length)
          break;
        p = pool[h32(t, k) % pool.length];
      } else {
        if (!linked.length)
          break;
        e = v.edges[linked[h32(t, k + 20) % linked.length]];
        p = e.pairs[h32(t, k) % e.pairs.length];
      }
      const st = pairState[p];
      if (st === 3)
        continue;
      pairState[p] = st === 0 ? 1 : st === 1 ? rnd(t, k + 9) < 0.5 ? 0 : 2 : 1;
      if (pairState[p] === 2)
        pairTrips[p]++;
      if (pairState[p] === 1)
        pairProbesOk[p] = h32(t, k + 3) % 10;
      pairSince[p] = 1;
      pairVer[p]++;
      const dom = cParent[pairA[p]];
      const domView = views.get(dom);
      if (domView)
        domView.dirty = true;
      if (cParent[pairB[p]] !== dom && views.get(0))
        views.get(0).dirty = true;
      for (const vv of views.values())
        if (vv.cid === dom || vv.cid === 0)
          vv.dirty = true;
      const text = `${BREAKER_WORDS[pairState[p]]}: ${cName[pairA[p]]} → ${cName[pairB[p]]}`;
      const tone = BREAKER_TONES[pairState[p]];
      if (e)
        items.push({
          kind: "edge",
          target: childId(e.a) + ">" + childId(e.b),
          view: viewId,
          label: childLabel(e.a) + " → " + childLabel(e.b),
          layer: "health",
          type: "breaker",
          text,
          tone,
          time: now
        });
      else
        items.push({
          kind: "node",
          target: viewId,
          label: cName[v.cid],
          layer: "health",
          type: "breaker",
          text,
          tone,
          time: now
        });
    }
    if (v.n && rnd(t, 31) < 0.6) {
      const i = h32(t, 32) % v.n, g = v.start + i;
      const text = v.leafView ? `Updated · revision ${100 + h32(t, 33) % 900}` : cLevel[g] === 1 ? `${1 + h32(t, 34) % 5} systems deployed` : `Deployed v${1 + h32(t, 35) % 4}.${h32(t, 36) % 20}.${h32(t, 37) % 30}`;
      items.push({
        kind: "node",
        target: childId(i),
        label: childLabel(i),
        layer: "nodes",
        type: "deploy",
        text,
        time: now
      });
    }
    if (v.edges.length && rnd(t, 41) < 0.4) {
      const e = v.edges[h32(t, 42) % v.edges.length];
      const up = rnd(t, 43) < 0.5;
      items.push({
        kind: "edge",
        target: childId(e.a) + ">" + childId(e.b),
        view: viewId,
        label: childLabel(e.a) + " → " + childLabel(e.b),
        layer: "relations",
        type: "traffic",
        text: `Traffic ${up ? "up" : "down"} ${5 + h32(t, 44) % 60}%`,
        tone: up ? "accent" : "muted",
        time: now
      });
    }
    if (v.n && rnd(t, 51) < 0.3) {
      const i = h32(t, 52) % v.n;
      const d = 1 + h32(t, 53) % 5000;
      items.push({
        kind: "node",
        target: childId(i),
        label: childLabel(i),
        layer: "labels",
        type: "count",
        text: `${rnd(t, 54) < 0.7 ? "+" : "-"}${d.toLocaleString("en-US")} records`,
        time: now
      });
    }
    if (items.length)
      self.postMessage({ t: "updates", items });
    postPatch();
    scheduleFrame(lastCam);
  }
  function postPatch(restyle = false) {
    if (!lastCam || !views.get(lastCam.view))
      return;
    const cur = buildView(lastCam.view, false);
    const patch = cur.edges.map((e, k) => ({ k, breaker: e.breaker, style: styleOf(e), traffic: !!e.traffic }));
    let ext = null;
    if (cur.cid !== 0) {
      const pv = buildView(cParent[cur.cid], false), fi = cur.cid - pv.start;
      ext = pv.edges.filter((e) => e.a === fi || e.b === fi).map((e) => ({ id: "c" + (pv.start + (e.a === fi ? e.b : e.a)), breaker: e.breaker, style: styleOf(e) }));
    }
    self.postMessage({ t: "patch", view: "c" + cur.cid, edges: patch, external: ext, restyle });
  }
  self.onmessage = (ev) => {
    const m = ev.data;
    try {
      switch (m.t) {
        case "init": {
          self.postMessage({ t: "progress", phase: "generating" });
          const stats = generate(m.n, m.seed);
          self.postMessage({ t: "ready", stats, root: "c0" });
          break;
        }
        case "rules":
          rules = (m.rules || []).map((r, order) => ({
            when: r.when || [],
            style: r.style || {},
            priority: r.priority ?? 0,
            order
          }));
          ruleVersion++;
          postPatch(true);
          if (lastCam)
            scheduleFrame(lastCam);
          break;
        case "layers":
          showNodes = !!m.nodes;
          showRelations = !!m.relations;
          if (lastCam)
            scheduleFrame(lastCam);
          break;
        case "colors":
          palette = m.palette;
          rgbaCache.clear();
          if (lastCam)
            scheduleFrame(lastCam);
          break;
        case "focus": {
          const { idx } = parseId(m.id);
          self.postMessage(viewPayload(idx));
          break;
        }
        case "sizes": {
          const v = views.get(parseId(m.id).idx);
          if (v && m.sizes.length === v.n * 4) {
            v.sizes = m.sizes;
            if (lastCam)
              scheduleFrame(lastCam);
          }
          break;
        }
        case "camera":
          scheduleFrame(m);
          break;
        case "search":
          search(m.q, m.seq);
          break;
        case "details":
          self.postMessage(details(m.id));
          break;
        case "edge":
          self.postMessage(edgeDetails(m.a, m.b));
          break;
        case "rows":
          self.postMessage(rowsOf(m.id));
          break;
        case "subtree":
          self.postMessage(subtreeOf(m.id, m.levels));
          break;
        case "path":
          self.postMessage({ t: "path", id: m.id, path: pathOf(m.id), req: m.req });
          break;
        case "simulate":
          simulate(!!m.on);
          break;
      }
    } catch (err) {
      self.postMessage({ t: "error", message: String(err && err.stack || err) });
    }
  };
}

// src/components/navigation/language-switcher/language-switcher.ts
var df$11 = defussGlobals();
var dfDollar11 = defussQuery();
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
var settings2 = {
  flags: "https://cdn.jsdelivr.net/npm/flag-icons@7.2.3/flags/{shape}/{region}.svg"
};
var resolve3 = (t) => typeof t === "string" ? dfDollar11("#" + CSS.escape(t)).get(0) ?? dfDollar11(t).get(0) : t;
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
  const url = region ? settings2.flags.replace("{shape}", shape).replace("{region}", region) : "";
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
var labelOf2 = (el) => el.dataset.label || el.getAttribute("aria-label") || "Language";
var ariaOf = (el, tag) => `${labelOf2(el)}: ${nameIn(tag, tag)}`;
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
<div id="${uid}-listbox" role="listbox" class="combobox-listbox" aria-label="${esc4(labelOf2(el))}"><div class="combobox-empty" hidden>${esc4(el.dataset.empty || "No language found.")}</div>${options}</div>
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
var chromeOf = (el) => dfDollar11(el).children("[data-ce-chrome]").get(0);
function draw2(el) {
  const uid = el.id ? `${el.id}-ls` : el._lsId ??= `language-switcher-${++sequence}`;
  const focused = el.contains(document.activeElement);
  dfDollar11(el).children("[data-ce-chrome]").remove();
  const variant = el.dataset.variant;
  dfDollar11(el).append(dfDollar11(variant === "swap" ? swapHtml(el) : variant === "menu" ? menuHtml(el) : comboboxHtml(el, uid)));
  el._lsStructure = structureOf(el);
  el._lsValue = valueOf(el);
  if (focused)
    dfDollar11(el).find('.combobox-trigger, .swap > input, .language-switcher-item[aria-checked="true"]').get(0)?.focus();
}
var sequence = 0;
function update(el) {
  if (el._lsStructure !== structureOf(el) || !chromeOf(el))
    return draw2(el);
  const value = valueOf(el);
  const changed = el._lsValue !== value;
  el._lsValue = value;
  const chrome = dfDollar11(chromeOf(el));
  if (el.dataset.variant === "swap") {
    const input = chrome.find(":scope > input").get(0);
    if (changed) {
      const [shown, hidden] = input.checked ? [".swap-on", ".swap-off"] : [".swap-off", ".swap-on"];
      chrome.find(`:scope > ${shown}`).html(faceHtml(el, value));
      chrome.find(`:scope > ${hidden}`).html(faceHtml(el, nextOf(el, value)));
    }
    dfDollar11(input).attr("aria-label", swapLabel(el, value));
    return;
  }
  if (el.dataset.variant === "menu") {
    if (!changed)
      return;
    chrome.find(".language-switcher-item").each((_i, item) => {
      const tag = item.dataset.value || "";
      dfDollar11(item).attr("aria-checked", String(tag === value)).html(optionInner(el, tag, value));
    });
    return;
  }
  chrome.find(".combobox-trigger").attr("aria-label", ariaOf(el, value));
  chrome.find('[role="listbox"]').attr("aria-label", labelOf2(el));
  if (!changed)
    return;
  chrome.find(".combobox-value").html(faceHtml(el, value)).attr("data-placeholder", null);
  chrome.find(".language-switcher-option").each((_i, option) => {
    const tag = option.dataset.value || "";
    dfDollar11(option).attr("aria-selected", String(tag === value)).html(optionInner(el, tag, value));
  });
}
function choose(el, tag, announce = true) {
  const languages = languagesOf(el);
  const next = languages.find((l) => l.toLowerCase() === String(tag).toLowerCase());
  if (!next)
    return false;
  const previous = valueOf(el, languages);
  if (el.dataset.value !== next)
    dfDollar11(el).attr("data-value", next);
  update(el);
  if (announce && next !== previous)
    el.dispatchEvent(new CustomEvent("language-change", {
      bubbles: true,
      detail: { value: next, previous, name: nameIn(next, next), dir: dirOf(next) }
    }));
  return true;
}
var popoverOf = (el) => dfDollar11(el).find(":scope > .language-switcher-combobox > .combobox-content").get(0);
var isOpen = (el) => {
  try {
    return !!popoverOf(el)?.matches(":popover-open");
  } catch {
    return false;
  }
};
function applyMarkup11(el, _name, config) {
  const languages = languagesOf(el);
  const value = languages.find((l) => l.toLowerCase() === String(config?.value ?? "").toLowerCase());
  if (value)
    dfDollar11(el).attr("data-value", value);
}
function triggerStateChange11(el, name, config) {
  if (config?.value)
    choose(el, config.value, false);
  const popover = popoverOf(el);
  if (!popover)
    return;
  if (name === "open" && !isOpen(el))
    dfDollar11(el).find(".combobox-trigger").get(0)?.click();
  else if (name !== "open" && isOpen(el))
    popover.hidePopover();
}
var languageSwitcherApi = componentState({
  component: "language-switcher",
  states: languageSwitcherStates,
  mergeConfig: true,
  apply: (el, state) => triggerStateChange11(el, state.name, state.config),
  read: (el) => ({ name: isOpen(el) ? "open" : "default", config: { value: valueOf(el) } }),
  markup: (el, state) => applyMarkup11(el, state.name, state.config)
});
df$11.languageSwitcherApi = languageSwitcherApi;
df$11.languageSwitcherStates = languageSwitcherStates;
function init11() {
  dfDollar11(".language-switcher:not([data-init])").each((_i, el) => {
    el.dataset.init = "";
    if (!el.dataset.value || valueOf(el) !== el.dataset.value)
      dfDollar11(el).attr("data-value", valueOf(el));
    draw2(el);
    dfDollar11(el).on("combobox:change", (e) => {
      const value = e.detail?.values?.[0];
      el._lsValue = "";
      if (!value || !choose(el, value))
        update(el);
      languageSwitcherApi.commit(el, isOpen(el) ? "open" : "default", { value: valueOf(el) });
    });
    dfDollar11(el).on("change", (e) => {
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
    dfDollar11(el).on("dropdown:select", (e) => pick(e.detail?.item));
    dfDollar11(el).on("click", (e) => {
      const item = e.target?.closest?.(".language-switcher-item");
      if (item && !item.closest('[role="menu"]'))
        pick(item);
    });
    dfDollar11(el).on("keydown", (e) => {
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
df$11.languageSwitcher = {
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
      settings2.flags = options.flags;
  }
};
init11();
new MutationObserver(init11).observe(document, { childList: true, subtree: true });

// src/components/application/panel/panel.ts
var df$12 = defussGlobals();
var dfDollar12 = defussQuery();
var panelStates = ["default", "minimized", "maximized", "closed"];
var SIDES2 = ["north", "south", "west", "east", "center"];
var resolve4 = (t) => typeof t === "string" ? dfDollar12("#" + CSS.escape(t)).get(0) ?? dfDollar12(t).get(0) : t;
var toolInput = (panel, tool) => dfDollar12(panel).find(`:scope > .panel-header .panel-${tool} > input[type="checkbox"]`).get(0);
function regionOf2(panel) {
  const parent = panel.parentElement;
  if (!parent)
    return null;
  if (parent.classList.contains("border-layout"))
    return panel;
  if (parent.classList.contains("resizer") && parent.parentElement?.classList.contains("border-layout"))
    return parent;
  if (parent.classList.contains("border-layout-center") && parent.parentElement?.classList.contains("border-layout"))
    return parent;
  return null;
}
var sideOf = (region) => region ? SIDES2.find((s) => region.classList.contains(`border-layout-${s}`)) ?? null : null;
var hostOf = (panel) => panel.parentElement?.closest(".border-layout, [data-panel-host]") ?? null;
function applyMarkup12(el, stateName) {
  dfDollar12(el).attr("data-minimized", stateName === "minimized" ? "" : null).attr("data-maximized", stateName === "maximized" ? "" : null);
  dfDollar12(el).attr("hidden", stateName === "closed" ? "" : null);
  dfDollar12(el).children(".panel-body").attr("inert", stateName === "minimized" ? "" : null);
}
function triggerStateChange12(panel, stateName) {
  const minimized = stateName === "minimized";
  const maximized = stateName === "maximized";
  const closed = stateName === "closed";
  panel.toggleAttribute("data-minimized", minimized);
  panel.toggleAttribute("data-maximized", maximized);
  panel.toggleAttribute("hidden", closed);
  const min = toolInput(panel, "minimize");
  const max = toolInput(panel, "maximize");
  if (min)
    min.checked = minimized;
  if (max)
    max.checked = maximized;
  const body = dfDollar12(panel).find(":scope > .panel-body").get(0);
  if (body)
    body.toggleAttribute("inert", minimized);
  const region = regionOf2(panel);
  if (region && region !== panel) {
    region.toggleAttribute("data-panel-minimized", minimized);
    region.toggleAttribute("data-panel-closed", closed);
    const handle = dfDollar12(region).find(":scope > .resizer-handle").get(0);
    if (handle)
      handle.inert = minimized || maximized || closed;
  }
  const host = hostOf(panel);
  if (maximized && host) {
    panel._host = host;
    host.setAttribute("data-panel-maximized", "");
  } else if (panel._host) {
    if (!dfDollar12(panel._host).find(".panel[data-maximized]").get(0))
      panel._host.removeAttribute("data-panel-maximized");
    panel._host = null;
  }
}
var panelApi = componentState({
  component: "panel",
  states: panelStates,
  apply: (panel, state) => {
    const from = panel.dataset.stateName || "default";
    triggerStateChange12(panel, state.name);
    queueMicrotask(() => syncToggles(panel));
    if (from !== state.name) {
      panel.dispatchEvent(new CustomEvent("panel-change", {
        bubbles: true,
        detail: {
          state: state.name,
          previous: from,
          region: sideOf(regionOf2(panel))
        }
      }));
    }
  },
  markup: (el, state) => applyMarkup12(el, state.name)
});
df$12.panelApi = panelApi;
df$12.panelStates = panelStates;
function init12() {
  dfDollar12(".panel:not([data-init])").toArray().forEach((panel) => {
    panel.dataset.init = "";
    const side = sideOf(regionOf2(panel));
    if (side)
      panel.dataset.region = side;
    const header = dfDollar12(panel).find(":scope > .panel-header").get(0);
    const body = dfDollar12(panel).find(":scope > .panel-body").get(0);
    if (body) {
      if (!body.id)
        body.id = `panel-${Math.random().toString(36).slice(2, 8)}-body`;
      toolInput(panel, "minimize")?.setAttribute("aria-controls", body.id);
    }
    panel.addEventListener("change", (e) => {
      const input = e.target;
      if (!(input instanceof HTMLInputElement) || input.closest(".panel") !== panel)
        return;
      if (input === toolInput(panel, "minimize"))
        panelApi.setState(panel, input.checked ? "minimized" : "default");
      else if (input === toolInput(panel, "maximize"))
        panelApi.setState(panel, input.checked ? "maximized" : "default");
    });
    header?.addEventListener("dblclick", (e) => {
      if (panel.dataset.titleCollapse === "false" || e.target.closest(".panel-tools") || !toolInput(panel, "minimize"))
        return;
      document.getSelection()?.removeAllRanges();
      panelApi.setState(panel, panel.hasAttribute("data-minimized") ? "default" : "minimized");
    });
    dfDollar12(panel).on("click", (e) => {
      const close = e.target?.closest?.(".panel-close");
      if (!close || close.closest(".panel") !== panel)
        return;
      panelApi.setState(panel, "closed");
      if (panel.id)
        dfDollar12(`[data-panel-open="${CSS.escape(panel.id)}"], [data-panel-toggle="${CSS.escape(panel.id)}"]`).get(0)?.focus();
    });
    panel.addEventListener("keydown", (e) => {
      if (e.key !== "Escape" || !panel.hasAttribute("data-maximized"))
        return;
      e.stopPropagation();
      panelApi.setState(panel, "default");
      toolInput(panel, "maximize")?.focus();
    });
    bindComponent(panel, panelApi);
    const start = panel.hasAttribute("hidden") ? "closed" : panel.hasAttribute("data-maximized") || toolInput(panel, "maximize")?.checked ? "maximized" : panel.hasAttribute("data-minimized") || toolInput(panel, "minimize")?.checked ? "minimized" : "default";
    triggerStateChange12(panel, start);
    panel.dataset.stateName = start;
    syncToggles(panel);
  });
}
var act2 = (t, state) => {
  const panel = resolve4(t);
  if (panel?.api)
    panel.api.setState(state);
  return panel ?? null;
};
var panelActions = {
  minimize: (target) => act2(target, "minimized"),
  maximize: (target) => act2(target, "maximized"),
  restore: (target) => act2(target, "default"),
  close: (target) => act2(target, "closed"),
  open: (target) => act2(target, "default"),
  toggle: (target) => {
    const panel = resolve4(target);
    if (!panel?.api)
      return false;
    panel.api.setState(panel.hasAttribute("data-minimized") ? "default" : "minimized");
    return panel.hasAttribute("data-minimized");
  }
};
df$12.panel = panelActions;
var openersBound = false;
function bindOpeners() {
  if (openersBound)
    return;
  openersBound = true;
  dfDollar12(document).on("click", (e) => {
    const trigger = e.target?.closest?.("[data-panel-open], [data-panel-toggle]");
    if (!trigger)
      return;
    const id = trigger.dataset.panelOpen ?? trigger.dataset.panelToggle;
    const panel = dfDollar12(`#${CSS.escape(id)}`).get(0);
    if (!panel?.api)
      return;
    if (trigger.hasAttribute("data-panel-toggle") && panel.dataset.stateName !== "closed") {
      panel.api.setState("closed");
      return;
    }
    panel.api.setState("default");
    dfDollar12(panel).find(":scope > .panel-header .panel-tools :is(input, button)").get(0)?.focus();
  });
}
function syncToggles(panel) {
  if (!panel.id)
    return;
  for (const t of dfDollar12(`[data-panel-toggle="${CSS.escape(panel.id)}"]`).toArray()) {
    t.setAttribute("aria-expanded", String(panel.dataset.stateName !== "closed" && !panel.hidden));
    t.setAttribute("aria-controls", panel.id);
  }
}
bindOpeners();
init12();
new MutationObserver(init12).observe(document, { childList: true, subtree: true });

// src/components/feedback-status/progress/progress.ts
var df$13 = defussGlobals();
var dfDollar13 = defussQuery();
var progressStates = ["default", "indeterminate", "complete"];
var SELECTOR = "progress.progress";
var reducedMotion5 = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var maxOf = (el) => el.max || 1;
var clamp4 = (el, v) => Math.max(0, Math.min(maxOf(el), Number(v) || 0));
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
    dfDollar13(`output.progress-value[for~="${CSS.escape(el.id)}"]`).toArray().forEach((o) => outs.add(o));
  dfDollar13(el).closest(".progress-field").find(".progress-value").toArray().forEach((o) => {
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
    el.dispatchEvent(new CustomEvent("progress:change", {
      bubbles: true,
      detail: { value: el.value, max: el.max, percent: el.value / maxOf(el) }
    }));
  if (done && before !== "complete")
    el.dispatchEvent(new CustomEvent("progress:completed", { bubbles: true }));
}
function tween(el, to, duration) {
  stopTween(el);
  const from = el.position < 0 ? 0 : el.value;
  if (!(duration > 0) || reducedMotion5() || from === to)
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
function applyMarkup13(el, stateName, config) {
  const authored = el.position < 0 ? null : el.value;
  if (config?.max != null && Number(config.max) !== el.max)
    el.max = Number(config.max);
  if (stateName === "indeterminate")
    dfDollar13(el).attr("value", null);
  else
    el.value = stateName === "complete" ? maxOf(el) : clamp4(el, config?.value != null ? config.value : authored ?? 0);
  const indeterminate = el.position < 0;
  const pct = indeterminate ? 0 : el.value / maxOf(el);
  dfDollar13(el).attr("data-level", pct < 0.34 ? "low" : pct < 0.67 ? "mid" : "high");
  dfDollar13(el).attr("data-complete", !indeterminate && el.value >= maxOf(el) ? "" : null);
  const live = el.id ? dfDollar13("#" + CSS.escape(el.id)).get(0) : null;
  const spoken = (live ? outputsOf(live) : []).filter((out) => out.dataset.format === "fraction" || out.dataset.template).map((out) => text(out, el))[0];
  dfDollar13(el).attr("aria-valuetext", spoken || null);
}
function triggerStateChange13(el, stateName, config) {
  switch (stateName) {
    case "default": {
      if (config.max != null && Number(config.max) !== el.max)
        el.max = Number(config.max);
      const to = config.value != null ? clamp4(el, config.value) : clamp4(el, el._authored ?? 0);
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
  apply: (el, state) => triggerStateChange13(el, state.name, state.config),
  read: (el, state) => {
    const indeterminate = el.position < 0;
    return {
      name: el.dataset.stateName || "default",
      config: {
        ...state.config,
        value: indeterminate ? null : el.value,
        max: el.max,
        percent: indeterminate ? null : el.value / maxOf(el)
      }
    };
  },
  markup: (el, state) => applyMarkup13(el, state.name, state.config)
});
df$13.progressApi = progressApi;
df$13.progressStates = progressStates;
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
function init13() {
  dfDollar13(`${SELECTOR}:not([data-init])`).toArray().forEach((el) => {
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
    const el = btn && dfDollar13("#" + CSS.escape(btn.getAttribute("commandfor"))).get(0);
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
init13();
new MutationObserver(init13).observe(document, { childList: true, subtree: true });

// src/components/application/resizer/resizer.ts
var df$14 = defussGlobals();
var dfDollar14 = defussQuery();
var resizerStates = ["default"];
var HANDLES = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];
var CLASS_NUMBERS = Array.from({ length: 81 }, (_, i) => i + 16);
var clamp5 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
var numAttr = (el, key, fallback) => {
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
  const min = numAttr(wrapper, axis === "w" ? "minW" : "minH", numAttr(wrapper, "min", 80));
  const max = numAttr(wrapper, axis === "w" ? "maxW" : "maxH", numAttr(wrapper, "max", 2000));
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
  const wanted = clamp5(px, min, max);
  let resolved = wanted;
  if (mode === "classes") {
    const ladder = ladderTokens(wrapper, axis);
    setClassSize(target, nearestToken(wrapper, ladder, wanted, axis), ladder);
    resolved = currentPx(wrapper, axis);
  } else if (mode !== "controlled") {
    const step = Math.max(1, numAttr(wrapper, "step", 1));
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
function applyMarkup14(_el, _stateName) {}
function triggerStateChange14(wrapper, stateName, config = {}) {
  if (stateName !== "default")
    return;
  if (config.width !== undefined || wrapper._defaultSize)
    applySize(wrapper, "w", Number(config.width ?? wrapper._defaultSize?.[0]));
  if (config.height !== undefined || wrapper._defaultSize)
    applySize(wrapper, "h", Number(config.height ?? wrapper._defaultSize?.[1]));
}
var resizerApi = componentState({
  component: "resizer",
  states: resizerStates,
  apply: (wrapper, state) => triggerStateChange14(wrapper, state.name, state.config),
  read: (wrapper, state) => {
    return {
      name: wrapper.dataset.stateName || "default",
      config: {
        ...state.config,
        width: currentPx(wrapper, "w"),
        height: currentPx(wrapper, "h"),
        mode: wrapper.dataset.resizeMode || "px"
      }
    };
  },
  markup: (el, state) => applyMarkup14(el, state.name)
});
df$14.resizerApi = resizerApi;
df$14.resizerStates = resizerStates;
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
  el.addEventListener("dblclick", () => {
    if (wrapper.dataset.variant === "divider")
      resizerApi.setState(wrapper, "default");
  });
  return el;
}
function syncHandles(wrapper) {
  const want = handleSet(wrapper);
  for (const el of Array.from(dfDollar14(wrapper).find(":scope > .resizer-handle").toArray())) {
    if (!want.includes(el.dataset.handle))
      el.remove();
  }
  for (const h of want) {
    if (!dfDollar14(wrapper).find(`:scope > .resizer-handle[data-handle="${h}"]`).get(0))
      dfDollar14(wrapper).append(makeHandle(wrapper, h));
  }
}
function handleKeys(wrapper, handle, ev) {
  const sides = handle.dataset.handle;
  if (!sides)
    return;
  const edge = wrapper.dataset.keys === "edge" && sides.length === 1;
  const OUT = { e: "ArrowRight", w: "ArrowLeft", s: "ArrowDown", n: "ArrowUp" };
  const IN = { e: "ArrowLeft", w: "ArrowRight", s: "ArrowUp", n: "ArrowDown" };
  const dir = edge ? ev.key === OUT[sides] ? 1 : ev.key === IN[sides] ? -1 : 0 : ev.key === "ArrowRight" || ev.key === "ArrowUp" ? 1 : ev.key === "ArrowLeft" || ev.key === "ArrowDown" ? -1 : 0;
  if (dir === 0 && ev.key !== "Home" && ev.key !== "End")
    return;
  ev.preventDefault();
  const step = (numAttr(wrapper, "stepKey", 10) || 10) * (ev.shiftKey ? 10 : 1);
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
function init14() {
  const fresh = dfDollar14(".resizer:not([data-init])").toArray().filter((wrapper) => wrapper instanceof HTMLElement).filter((wrapper) => {
    wrapper.dataset.init = "";
    return !!targetOf(wrapper);
  });
  for (const wrapper of fresh)
    wrapper._defaultSize = [currentPx(wrapper, "w"), currentPx(wrapper, "h")];
  fresh.forEach((wrapper) => {
    bindComponent(wrapper, resizerApi);
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
    }).observe(wrapper, {
      attributes: true,
      attributeFilter: ["data-width", "data-height", "data-handles", "data-axis"]
    });
    wrapper.addEventListener("resizer-reset", () => resizerApi.setState(wrapper, "default"));
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

// src/components/actions/toggle/toggle.ts
var df$16 = defussGlobals();
var dfDollar16 = defussQuery();
var toggleStates = ["default", "pressed"];
function applyMarkup15(toggle, stateName, defaultPressed) {
  dfDollar16(toggle).attr("aria-pressed", stateName === "pressed" ? "true" : defaultPressed);
}
function triggerStateChange16(toggle, stateName, _config) {
  applyMarkup15(toggle, stateName, toggle._defaultPressed ?? "false");
}
var toggleApi = componentState({
  component: "toggle",
  states: toggleStates,
  apply: (toggle, state) => triggerStateChange16(toggle, state.name, state.config),
  read: (toggle, state) => ({
    name: dfDollar16(toggle).attr("aria-pressed") === "true" ? "pressed" : "default",
    config: state.config
  }),
  markup: (toggle, state) => {
    const authored = state.model.attrs.find(([name]) => name === "aria-pressed");
    applyMarkup15(toggle, state.name, authored ? authored[1] : "false");
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

// src/components/actions/toggle-group/toggle-group.ts
var df$17 = defussGlobals();
var dfDollar17 = defussQuery();
var toggleGroupStates = ["default", "disabled"];
function applyMarkup16(el, stateName) {
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
  markup: (el, state) => applyMarkup16(el, state.name)
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

//# debugId=E672B47C231F182F64756E2164756E21
/* defuss-shadcn v0.9.18 runtime provenance: bundles defuss-morph@0.2.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599) + defuss-query@0.2.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599); full notice: NOTICE.txt */
//# sourceMappingURL=knowledge-graph.js.map
