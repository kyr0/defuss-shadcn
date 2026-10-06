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

// src/components/avatar/avatar.ts
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

// src/components/dialog/dialog.ts
var df$2 = defussGlobals();
var dfDollar2 = defussQuery();
var dialogStates = ["default", "open"];
function applyMarkup2(dialog, stateName) {
  dfDollar2(dialog).attr("open", stateName === "open" ? "" : null);
}
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
var dialogApi = componentState({
  component: "dialog",
  states: dialogStates,
  apply: (dialog, state) => triggerStateChange2(dialog, state.name, state.config),
  markup: (el, state) => applyMarkup2(el, state.name)
});
df$2.dialogApi = dialogApi;
df$2.dialogStates = dialogStates;
function init2() {
  dfDollar2("[data-dialog-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar2("#" + CSS.escape(trigger.dataset.dialogTrigger)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog._trigger = trigger;
      dialog.showModal();
    });
  });
  dfDollar2("dialog:not(.alert-dialog):not(.sheet):not(.command):not(.window):not(.cookie-consent-dialog):not([data-init])").toArray().forEach((dialog) => {
    dfDollar2(dialog).data("init", "");
    bindComponent(dialog, dialogApi);
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog)
        dialog.close();
    });
    dfDollar2(dialog).find("[data-dialog-close]").toArray().forEach((btn) => {
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

// src/components/dropdown/dropdown.ts
var df$3 = defussGlobals();
var dfDollar3 = defussQuery();
var dropdownStates = ["default", "open"];
var ITEM = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
var isDisabled = (el) => el.disabled || el.getAttribute("aria-disabled") === "true";
var itemsOf = (menu) => Array.from(dfDollar3(menu).find(ITEM).toArray()).filter((i) => i.closest('[role="menu"]') === menu && !isDisabled(i));
var subOf = (trigger) => dfDollar3(trigger).closest(".dropdown-sub").children(".dropdown-sub-content").get(0) ?? null;
var rootOf2 = (menu) => {
  let m = menu;
  while (m?.parentElement?.closest(".dropdown-content[popover]"))
    m = m.parentElement.closest(".dropdown-content[popover]");
  return m;
};
var HOVER_OPEN = 120;
var HOVER_CLOSE = 220;
function applyMarkup3(_el, _stateName) {}
function triggerStateChange3(menu, stateName, _config) {
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
  apply: (menu, state) => triggerStateChange3(menu, state.name, state.config),
  markup: (el, state) => applyMarkup3(el, state.name)
});
df$3.dropdownApi = dropdownApi;
df$3.dropdownStates = dropdownStates;
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
    dfDollar3(group).find('[role="menuitemradio"]').toArray().forEach((r) => {
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
  const openSubs = () => Array.from(dfDollar3(menu).find(".dropdown-sub-content").toArray()).filter((s) => s.parentElement.closest('[role="menu"]') === menu && s.matches(":popover-open"));
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
  const trigger = dfDollar3(wrap).find(":scope > .dropdown-sub-trigger").get(0);
  const sub = dfDollar3(wrap).find(":scope > .dropdown-sub-content").get(0);
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
function init3() {
  dfDollar3("[data-dropdown-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const menu = dfDollar3("#" + CSS.escape(trigger.dataset.dropdownTrigger)).get(0);
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
        const otherOpen = other ? dfDollar3("#" + CSS.escape(other.getAttribute("data-dropdown-trigger"))).get(0)?.matches(":popover-open") : false;
        if (!otherOpen && (!active || active === document.body || menu.contains(active) || other))
          trigger.focus({ preventScroll: true });
      }
    });
    wireMenu(menu);
    dfDollar3(menu).find(".dropdown-sub").toArray().forEach(wireSub);
  });
  dfDollar3(".dropdown-sub").toArray().forEach(wireSub);
  dfDollar3(".dropdown-content[popover]:not(.dropdown-sub-content):not([data-init])").toArray().forEach((menu) => {
    menu.dataset.init = "";
    bindComponent(menu, dropdownApi);
  });
}
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// src/components/popover/popover.ts
var df$4 = defussGlobals();
var dfDollar4 = defussQuery();
var popoverStates = ["default", "open"];
function applyMarkup4(_el, _stateName) {}
function triggerStateChange4(popover, stateName, _config) {
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
  apply: (popover, state) => triggerStateChange4(popover, state.name, state.config),
  markup: (el, state) => applyMarkup4(el, state.name)
});
df$4.popoverApi = popoverApi;
df$4.popoverStates = popoverStates;
function init4() {
  dfDollar4("[popovertarget]:not([data-init])").toArray().forEach((trigger) => {
    const id = trigger.getAttribute("popovertarget");
    const popover = dfDollar4("#" + CSS.escape(id)).get(0);
    if (!popover || !popover.classList.contains("popover"))
      return;
    trigger.dataset.init = "";
    const anchorId = `--popover-${id}`;
    trigger.style.anchorName = anchorId;
    popover.style.positionAnchor = anchorId;
  });
  dfDollar4(".popover[popover]:not([data-init])").toArray().forEach((popover) => {
    popover.dataset.init = "";
    bindComponent(popover, popoverApi);
  });
}
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// src/components/resizer/resizer.ts
var df$5 = defussGlobals();
var dfDollar5 = defussQuery();
var resizerStates = ["default"];
var HANDLES = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];
var CLASS_NUMBERS = Array.from({ length: 81 }, (_, i) => i + 16);
var clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
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
  const wanted = clamp(px, min, max);
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
function applyMarkup5(_el, _stateName) {}
function triggerStateChange5(wrapper, stateName, config = {}) {
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
  apply: (wrapper, state) => triggerStateChange5(wrapper, state.name, state.config),
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
  markup: (el, state) => applyMarkup5(el, state.name)
});
df$5.resizerApi = resizerApi;
df$5.resizerStates = resizerStates;
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
  for (const el of Array.from(dfDollar5(wrapper).find(":scope > .resizer-handle").toArray())) {
    if (!want.includes(el.dataset.handle))
      el.remove();
  }
  for (const h of want) {
    if (!dfDollar5(wrapper).find(`:scope > .resizer-handle[data-handle="${h}"]`).get(0))
      dfDollar5(wrapper).append(makeHandle(wrapper, h));
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
function init5() {
  const fresh = dfDollar5(".resizer:not([data-init])").toArray().filter((wrapper) => wrapper instanceof HTMLElement).filter((wrapper) => {
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
    }).observe(wrapper, { attributes: true, attributeFilter: ["data-width", "data-height", "data-handles", "data-axis"] });
    wrapper.addEventListener("resizer-reset", () => resizerApi.setState(wrapper, "default"));
  });
}
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// src/components/session/session.ts
var df$6 = defussGlobals();
var dfDollar6 = defussQuery();
var sessionStates = ["default", "detached", "streaming"];
var num = (el, key, fallback) => {
  const v = parseFloat(el.dataset[key]);
  return Number.isFinite(v) ? v : fallback;
};
var reduced = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var resolve = (t) => typeof t === "string" ? dfDollar6("#" + CSS.escape(t)).get(0) ?? dfDollar6(t).get(0) : t;
var parts = (s) => ({
  viewport: dfDollar6(s).find(":scope > .session-viewport").get(0),
  content: dfDollar6(s).find(":scope > .session-viewport > .session-content").get(0)
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
  const threshold = num(s, "threshold", 48);
  const start = viewport.scrollTop > 1;
  const end = fromEnd(viewport) > 1;
  const tokens = [start && "start", end && "end"].filter(Boolean).join(" ");
  if (tokens)
    s.setAttribute("data-scrollable", tokens);
  else
    s.removeAttribute("data-scrollable");
  dfDollar6(s).find(".session-scroll-button").toArray().forEach((b) => {
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
  const need = Math.max(0, Math.round(viewport.clientHeight - vpPad - num(s, "peek", 48) - below));
  if (need !== Math.round(pad))
    content.style.paddingBlockEnd = need ? `${need}px` : "";
  if (need) {
    const short = anchorTop(s, a) - (viewport.scrollHeight - viewport.clientHeight);
    if (short > 0)
      content.style.paddingBlockEnd = `${need + Math.ceil(short)}px`;
  }
}
var anchorTop = (s, item) => item.offsetTop - num(s, "peek", 48);
function scrollToEnd(s, { smooth = true } = {}) {
  s.setAttribute("data-stick", "");
  scrollViewport(s, s._parts.viewport.scrollHeight, smooth);
}
function scrollToStart(s, { smooth = true } = {}) {
  s.removeAttribute("data-stick");
  scrollViewport(s, 0, smooth);
}
function scrollToMessage(s, id, { smooth = true } = {}) {
  const item = dfDollar6(s._parts.content).find(`.session-item[data-message-id="${CSS.escape(id)}"]`).get(0);
  if (!item)
    return false;
  s.removeAttribute("data-stick");
  scrollViewport(s, anchorTop(s, item), smooth);
  hold(s, () => anchorTop(s, item), smooth ? 900 : 400);
  return true;
}
function applyMarkup6(el, stateName) {
  const { content } = parts(el);
  if (content)
    dfDollar6(content).attr("aria-busy", stateName === "streaming" ? "true" : null);
}
function triggerStateChange6(s, stateName, config) {
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
    triggerStateChange6(s, state.name, state.config);
  },
  markup: (el, state) => applyMarkup6(el, state.name)
});
df$6.sessionApi = sessionApi;
df$6.sessionStates = sessionStates;
function onItems(s, records) {
  const { viewport } = s._parts;
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
  const items = Array.from(dfDollar6(content).find(":scope > .session-item").toArray());
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
  s.dispatchEvent(new CustomEvent("session-visibility", { bubbles: true, detail: { currentAnchorId: currentId, visibleMessageIds: ids } }));
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
function init6() {
  dfDollar6(".session:not([data-init])").toArray().forEach((s) => {
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
    dfDollar6(s).find(".session-scroll-button").toArray().forEach((b) => {
      b.addEventListener("click", () => b.dataset.to === "start" ? scrollToStart(s) : follow(s));
    });
    if (s.hasAttribute("data-drop"))
      bindDrop(s);
    bindComponent(s, sessionApi);
    s.setAttribute("data-pending-scroll", "");
    s.dataset.stateName = "default";
    const where = s.dataset.defaultPosition || "end";
    const last = [...dfDollar6(content).find(":scope > .session-item[data-anchor]").toArray()].pop();
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
df$6.session = {
  append(target, content, options) {
    const s = resolve(target);
    const item = toItem(content, options);
    s?._parts?.content.append(item);
    return item;
  },
  prepend(target, content, options) {
    const s = resolve(target);
    const items = (Array.isArray(content) ? content : [content]).map((c) => toItem(c, options));
    s?._parts?.content.prepend(...items);
    return items;
  },
  scrollToEnd: (target, options) => {
    const s = resolve(target);
    if (s)
      follow(s, options);
  },
  scrollToStart: (target, options) => {
    const s = resolve(target);
    if (s)
      scrollToStart(s, options);
  },
  scrollToMessage: (target, id, options) => {
    const s = resolve(target);
    return s ? scrollToMessage(s, id, options) : false;
  },
  isAtEnd: (target) => {
    const s = resolve(target);
    return !!s && fromEnd(s._parts.viewport) <= num(s, "threshold", 48);
  }
};
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// src/components/toast/toast.ts
var df$7 = defussGlobals();
var dfDollar7 = defussQuery();
var toastStates = ["default"];
function applyMarkup7(_el, _stateName) {}
function triggerStateChange7(container, stateName, _config) {
  if (stateName !== "default")
    return;
  dfDollar7(container).find(".toast").toArray().forEach((el) => toastDismiss(el));
}
var toastApi = componentState({
  component: "toast",
  states: toastStates,
  apply: (container, state) => {
    triggerStateChange7(container, state.name, state.config);
  },
  read: (container, state) => {
    return {
      name: container.dataset.stateName || "default",
      config: { ...state.config, count: dfDollar7(container).find(".toast").toArray().length }
    };
  },
  markup: (el, state) => applyMarkup7(el, state.name)
});
df$7.toastApi = toastApi;
df$7.toastStates = toastStates;
var DURATION = 4000;
var MAX_VISIBLE = 3;
var toastCallbacks = new WeakMap;
var toastContainer = dfDollar7("#toast-container").get(0);
if (!toastContainer) {
  toastContainer = document.createElement("div");
  toastContainer.id = "toast-container";
  toastContainer.className = "toast-container";
  toastContainer.setAttribute("aria-label", "Notifications");
  toastContainer.setAttribute("data-position", "bottom-right");
  dfDollar7(document.body).append(toastContainer);
}
var stackToasts = (container) => {
  const toasts = [...dfDollar7(container).find(".toast:not([data-leaving])").toArray()];
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
      dfDollar7(el).remove();
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
    dfDollar7(el).remove();
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
    dfDollar7(contentEl).append(dfDollar7(icons[variant]));
  }
  const textDiv = document.createElement("div");
  textDiv.className = "toast-text";
  if (title) {
    const p = document.createElement("p");
    p.className = "toast-title";
    dfDollar7(p).text(title);
    dfDollar7(textDiv).append(p);
  }
  if (description) {
    const p = document.createElement("p");
    p.className = "toast-description";
    dfDollar7(p).text(description);
    dfDollar7(textDiv).append(p);
  }
  dfDollar7(contentEl).append(textDiv);
  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.dataset.toastClose = "";
  dfDollar7(closeBtn).html('<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>');
  dfDollar7(contentEl).append(closeBtn);
  let host = el;
  if (aura) {
    const style = aura === true ? "" : String(aura);
    el.classList.add("aura", "aura-md");
    if (style)
      el.classList.add(`aura-${style}`);
    el.dataset.aura = style || "default";
    host = document.createElement("div");
    host.className = "toast-surface";
    dfDollar7(el).append(host);
  }
  dfDollar7(host).append(contentEl);
  if (action) {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "toast-actions";
    const actionBtn = document.createElement("button");
    actionBtn.className = "btn";
    actionBtn.setAttribute("data-variant", "outline");
    actionBtn.setAttribute("data-size", "sm");
    actionBtn.dataset.toastAction = "";
    dfDollar7(actionBtn).text(action.label);
    dfDollar7(actionsDiv).append(actionBtn);
    dfDollar7(host).append(actionsDiv);
  }
  if (animation) {
    el._animation = typeof animation === "string" ? { in: animation } : animation;
    el.dataset.anim = "";
  }
  dfDollar7(toastContainer).append(el);
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
  const toasts = dfDollar7(toastContainer).find(".toast").toArray();
  if (toasts.length > (toastContainer.dataset.stack === "pile" ? 6 : MAX_VISIBLE))
    toastDismiss(toasts[0]);
  return el;
};
function init7() {
  dfDollar7("#toast-container:not([data-init])").toArray().forEach((container) => {
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
init7();
new MutationObserver(init7).observe(document.body, { childList: true, subtree: true });
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
    dfDollar7(toastContainer).find(".toast").toArray().forEach((el) => {
      toastDismiss(el);
    });
  }
};
df$7.toast = toastActions;

//# debugId=245BEF9D6E03E99C64756E2164756E21
/* defuss-shadcn v0.9.6 runtime provenance: bundles defuss-morph@0.2.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599) + defuss-query@0.2.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599); full notice: NOTICE.txt */
//# sourceMappingURL=messenger.js.map
