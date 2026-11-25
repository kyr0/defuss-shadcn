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
// src/shared/record-drag.ts
var RECORDS_MIME = "application/x-defuss-records+json";
var current = null;
function dropEffects(value) {
  const words = (value ?? "").split(/\s+/).filter((w) => w === "move" || w === "copy");
  return words.length ? [...new Set(words)] : ["move", "copy"];
}
function subtreeOf(rows, roots, fields) {
  const take = new Set(roots);
  if (fields.parentIdField) {
    const children = new Map;
    for (const r of rows) {
      const p = r[fields.parentIdField] ?? null;
      if (!children.has(p))
        children.set(p, []);
      children.get(p).push(r);
    }
    const queue = [...roots];
    while (queue.length) {
      const id = queue.shift();
      for (const child of children.get(id) ?? []) {
        const cid = child[fields.idField];
        if (take.has(cid))
          continue;
        take.add(cid);
        queue.push(cid);
      }
    }
  }
  return rows.filter((r) => take.has(r[fields.idField]));
}
function topRoots(records, roots, fields) {
  if (!fields.parentIdField)
    return [...roots];
  const byId = new Map(records.map((r) => [r[fields.idField], r]));
  const set = new Set(roots);
  return roots.filter((id) => {
    let parent = byId.get(id)?.[fields.parentIdField];
    const seen = new Set;
    while (parent != null && !seen.has(parent)) {
      if (set.has(parent))
        return false;
      seen.add(parent);
      parent = byId.get(parent)?.[fields.parentIdField];
    }
    return true;
  });
}
function startRecordDrag(e, drag, text, label) {
  current = drag;
  const dt = e.dataTransfer;
  if (!dt)
    return;
  const payload = {
    version: 1,
    records: drag.records,
    roots: drag.roots,
    idField: drag.idField,
    parentIdField: drag.parentIdField
  };
  try {
    dt.setData(RECORDS_MIME, JSON.stringify(payload));
  } catch {}
  dt.setData("text/plain", text.plain);
  dt.setData("text/html", text.html);
  dt.effectAllowed = drag.effects.length === 2 ? "copyMove" : drag.effects[0];
  const image = document.createElement("div");
  image.className = "record-drag-image";
  image.textContent = label;
  image.style.cssText = "position:absolute;top:-1000px;left:0;padding:0.25rem 0.625rem;border:1px solid var(--border);" + "border-radius:var(--radius-md);background:var(--popover);color:var(--popover-foreground);" + "font:500 0.8125rem/1.4 var(--font-sans);white-space:nowrap;box-shadow:var(--shadow-md)";
  document.body.append(image);
  dt.setDragImage(image, -12, -12);
  setTimeout(() => image.remove());
}
var recordDrag = () => current?.source.isConnected ? current : null;
var carriesRecords = (e) => !!recordDrag() || !!e.dataTransfer?.types.includes(RECORDS_MIME);
function endRecordDrag(drag) {
  if (!drag || drag === current)
    current = null;
}
function dropEffectFor(e, target, drag) {
  const allowed = (drag ? drag.effects : ["copy"]).filter((x) => target.includes(x));
  if (!allowed.length)
    return null;
  if (allowed.length === 1)
    return allowed[0];
  return e.altKey || e.ctrlKey ? "copy" : "move";
}
function droppedRecords(e) {
  const drag = recordDrag();
  if (drag)
    return {
      version: 1,
      records: drag.records,
      roots: drag.roots,
      idField: drag.idField,
      parentIdField: drag.parentIdField
    };
  try {
    const data = JSON.parse(e.dataTransfer?.getData(RECORDS_MIME) || "null");
    if (data?.version === 1 && Array.isArray(data.records) && Array.isArray(data.roots) && data.idField)
      return data;
  } catch {}
  return null;
}
function placeRecords(spec) {
  const { idField, parentIdField, from, at } = spec;
  const fromParent = from.parentIdField;
  const roots = topRoots(from.records, from.roots, from);
  const moving = new Set(from.records.map((r) => r[from.idField]));
  if (spec.within && at.id !== null && moving.has(at.id))
    return null;
  const base = spec.within ? spec.rows.filter((r) => !moving.has(r[idField])) : spec.rows.slice();
  const target = at.id === null ? null : base.find((r) => r[idField] === at.id);
  if (at.id !== null && !target)
    return null;
  const taken = new Set(base.map((r) => r[idField]));
  let next = Math.max(0, ...[...taken].filter((x) => typeof x === "number" && Number.isFinite(x))) + 1;
  const ids = new Map;
  for (const r of from.records) {
    const old = r[from.idField];
    let id = old;
    if (spec.copy || taken.has(id)) {
      if (typeof old === "number")
        id = next++;
      else
        for (let n = 2;taken.has(id = `${old}-${n}`); n++)
          ;
    }
    taken.add(id);
    ids.set(old, id);
  }
  const parent = !parentIdField ? null : at.place === "into" ? at.id : at.place === "end" ? null : target?.[parentIdField] ?? null;
  const rootSet = new Set(roots);
  const inserted = from.records.map((r) => {
    const old = r[from.idField];
    const record = { ...r };
    delete record[from.idField];
    record[idField] = ids.get(old);
    if (parentIdField) {
      const was = fromParent ? r[fromParent] : null;
      if (fromParent && fromParent !== parentIdField)
        delete record[fromParent];
      record[parentIdField] = rootSet.has(old) || !ids.has(was) ? parent : ids.get(was);
    }
    return record;
  });
  const index = at.place === "end" || at.place === "into" || !target ? base.length : base.indexOf(target) + (at.place === "after" ? 1 : 0);
  return {
    rows: [...base.slice(0, index), ...inserted, ...base.slice(index)],
    inserted,
    roots: roots.map((id) => ids.get(id))
  };
}
function withoutRecords(rows, records, idField) {
  const gone = new Set(records.map((r) => r[idField]));
  return rows.filter((r) => !gone.has(r[idField]));
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
var SHARED_ABI = "0.10.2";
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
  carriesRecords,
  dropEffectFor,
  dropEffects,
  droppedRecords,
  endRecordDrag,
  placeRecords,
  recordDrag,
  startRecordDrag,
  subtreeOf,
  topRoots,
  withoutRecords,
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

// src/components/application/border-layout/border-layout.ts
var df$ = defussGlobals();
var dfDollar = defussQuery();
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
var resolve = (t) => typeof t === "string" ? dfDollar("#" + CSS.escape(t)).get(0) ?? dfDollar(t).get(0) : t;
var regionOf = (layout, side) => dfDollar(layout).find(`:scope > .border-layout-${side}`).get(0);
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
    const handle = region ? dfDollar(region).children(".resizer-handle").get(0) : null;
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
  const bar = dfDollar(panel).children(".panel-header").get(0)?.getBoundingClientRect().height ?? 40;
  return num2(panel.dataset.min, Math.round(bar + 32));
};
var open2 = (panel) => !panel.hidden && !panel.hasAttribute("data-minimized");
var titleOf = (panel) => dfDollar(panel).find(":scope > .panel-header .panel-title").text().trim() || panel.getAttribute("aria-label") || "";
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
    dfDollar(panel).before(dfDollar(`<div class="border-layout-stack-divider" role="separator" aria-orientation="${row ? "vertical" : "horizontal"}" data-ce-chrome></div>`));
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
  for (const d of dfDollar(stack).children(".border-layout-stack-divider").toArray())
    if (!d.nextElementSibling?.classList.contains("panel"))
      d.remove();
  const levels = levelsOf(stack);
  for (const d of dfDollar(stack).children(".border-layout-stack-divider").toArray()) {
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
      const header = dfDollar(p).children(".panel-header").get(0);
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
  const handle = region.classList.contains("resizer") ? dfDollar(region).children(".resizer-handle").get(0) : null;
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
function applyMarkup(el, stateName, config) {
  const want = new Set(stateName === "collapsed" ? config?.regions ?? (config?.region ? [config.region] : []) : []);
  for (const side of REGIONS) {
    const region = regionOf(el, side);
    if (region)
      dfDollar(region).attr("data-collapsed", want.has(side) ? "" : null);
  }
}
function triggerStateChange(layout, stateName, config) {
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
    triggerStateChange(layout, state.name, state.config);
    syncState(layout);
  },
  markup: (el, state) => applyMarkup(el, state.name, state.config)
});
df$.borderLayoutApi = borderLayoutApi;
df$.borderLayoutStates = borderLayoutStates;
function init() {
  dfDollar(".border-layout:not([data-init])").toArray().forEach((layout) => {
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
  const el = typeof target === "string" ? dfDollar(`#${CSS.escape(target)}`).get(0) ?? dfDollar(target).get(0) : target;
  return el?.classList.contains("border-layout-stack") ? el : null;
};
df$.borderLayout = {
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
    const el = typeof panel === "string" ? dfDollar(panel).get(0) : panel;
    if (!el)
      return null;
    el.removeAttribute("data-minimized");
    dfDollar(st).append(el);
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
init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });

// src/components/forms-inputs/combobox/combobox.ts
var df$2 = defussGlobals();
var dfDollar2 = defussQuery();
var comboboxStates = ["default", "open"];
function applyMarkup2(_el, _stateName) {}
function triggerStateChange2(popover, stateName, _config) {
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
  apply: (popover, state) => triggerStateChange2(popover, state.name, state.config),
  read: (popover, state) => {
    const selected = Array.from(dfDollar2(popover).find('[role="option"][aria-selected="true"]').toArray());
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
  markup: (el, state) => applyMarkup2(el, state.name)
});
df$2.comboboxApi = comboboxApi;
df$2.comboboxStates = comboboxStates;
var esc2 = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var idPart = (t) => t.replace(/[^\w-]/g, "_");
var comboSeq = 0;
function hideEmptyGroups(listbox) {
  dfDollar2(listbox).find(".combobox-group-label").each((_i, label) => {
    let next = label.nextElementSibling;
    let groupHasVisible = false;
    while (next && !next.classList.contains("combobox-group-label") && !next.classList.contains("combobox-separator")) {
      if (next.getAttribute("role") === "option" && !next.hidden && !next.classList.contains("combobox-create"))
        groupHasVisible = true;
      next = next.nextElementSibling;
    }
    dfDollar2(label).prop("hidden", !groupHasVisible);
  });
  dfDollar2(listbox).find(".combobox-separator").each((_i, sep) => {
    const prev = sep.previousElementSibling;
    const next = sep.nextElementSibling;
    dfDollar2(sep).prop("hidden", Boolean(prev && prev.hidden || next && next.hidden));
  });
}
function initTags(wrapper) {
  const field = dfDollar2(wrapper).find(".combobox-field").get(0);
  const input = dfDollar2(wrapper).find(".combobox-field-input").get(0);
  const popover = dfDollar2(wrapper).find(".combobox-content").get(0);
  const listbox = dfDollar2(wrapper).find('[role="listbox"]').get(0);
  if (!field || !input || !popover || !listbox)
    return;
  const empty = dfDollar2(wrapper).find(".combobox-empty").get(0);
  const creatable = wrapper.hasAttribute("data-creatable");
  const uid = wrapper.id || popover.id || `dfcb-${++comboSeq}`;
  const options = () => Array.from(dfDollar2(listbox).find('[role="option"]:not(.combobox-create)').toArray());
  const valueOf = (o) => o.dataset.value ?? o.textContent.trim();
  const labelOf = (o) => o.textContent.trim();
  dfDollar2(listbox).attr("aria-multiselectable", "true");
  const anchorId = `--combobox-${uid}`;
  dfDollar2(field).css("anchorName", anchorId);
  dfDollar2(popover).css("positionAnchor", anchorId);
  const tags = document.createElement("span");
  tags.className = "combobox-tags";
  dfDollar2(input).before(tags);
  let createRow = null;
  if (creatable) {
    createRow = document.createElement("div");
    createRow.className = "combobox-item combobox-create";
    createRow.id = `${uid}-create`;
    createRow.setAttribute("role", "option");
    createRow.setAttribute("aria-selected", "false");
    createRow.hidden = true;
    dfDollar2(listbox).prepend(createRow);
  }
  let highlighted = null;
  const highlight = (el) => {
    if (highlighted)
      dfDollar2(highlighted).data("highlighted", null);
    highlighted = el;
    if (el) {
      dfDollar2(el).data("highlighted", "");
      el.scrollIntoView({ block: "nearest" });
      dfDollar2(input).attr("aria-activedescendant", el.id);
    } else
      dfDollar2(input).attr("aria-activedescendant", null);
  };
  const visible = () => dfDollar2(listbox).find('[role="option"]').toArray().filter((o) => !o.hidden && o.getAttribute("aria-disabled") !== "true");
  const isOpen = () => popover.matches(":popover-open");
  const open = () => {
    if (!isOpen())
      safeShowPopover(popover);
    dfDollar2(input).attr("aria-expanded", "true");
  };
  const close = () => {
    if (isOpen())
      popover.hidePopover();
    dfDollar2(input).attr("aria-expanded", "false");
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
      dfDollar2(o).prop("hidden", !match);
      if (match)
        any = true;
      if (q && labelOf(o).toLowerCase() === q)
        exact = o;
    }
    if (createRow) {
      const showCreate = !!text && !exact;
      dfDollar2(createRow).prop("hidden", !showCreate);
      if (showCreate)
        dfDollar2(createRow).text(`Create "${text}"`);
    }
    hideEmptyGroups(listbox);
    if (empty)
      dfDollar2(empty).prop("hidden", any || !!createRow && !createRow.hidden);
    highlight(exact ?? (createRow && !createRow.hidden ? createRow : !creatable ? visible()[0] ?? null : null));
  };
  const render = (announce = true, created = null) => {
    const chosen = options().filter((o) => o.getAttribute("aria-selected") === "true");
    const labels = chosen.map(labelOf);
    const values = chosen.map(valueOf);
    const name = wrapper.dataset.name;
    dfDollar2(tags).morph(labels.map((label, i) => `<span class="combobox-tag" id="${uid}-tag-${idPart(values[i])}">${esc2(label)}<button type="button" class="combobox-tag-remove" data-value="${esc2(values[i])}" aria-label="Remove ${esc2(label)}" tabindex="-1"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>`).join("") + (name ? values.map((v) => `<input type="hidden" name="${esc2(name)}" value="${esc2(v)}" id="${uid}-input-${idPart(v)}">`).join("") : ""));
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
        dfDollar2(option).text(text);
        const firstGroup = dfDollar2(listbox).find(".combobox-group-label").get(0);
        if (firstGroup)
          dfDollar2(firstGroup).before(option);
        else
          dfDollar2(listbox).append(option);
        row = option;
        created = text;
      }
      dfDollar2(row).attr("aria-selected", "true");
    } else if (row) {
      if (row.getAttribute("aria-disabled") === "true")
        return;
      const on = row.getAttribute("aria-selected") === "true";
      dfDollar2(row).attr("aria-selected", on && !text ? "false" : "true");
    } else
      return;
    dfDollar2(input).val("");
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
      dfDollar2(option).attr("aria-selected", "false");
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
        dfDollar2(last).attr("aria-selected", "false");
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
    dfDollar2(input).attr("aria-expanded", String(isOpen()));
  });
}
function init2() {
  dfDollar2(".combobox:not([data-init])").toArray().forEach((wrapper) => {
    wrapper.dataset.init = "";
    if (wrapper.hasAttribute("data-tags")) {
      initTags(wrapper);
      return;
    }
    const $wrapper = dfDollar2(wrapper);
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
    dfDollar2(clearBtn).html('<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>');
    dfDollar2(clearBtn).css("positionAnchor", anchorId);
    $trigger.after(clearBtn);
    const multiple = wrapper.hasAttribute("data-multiple");
    const uid = wrapper.id || popover.id || `dfcb-${++comboSeq}`;
    let tags = null;
    if (multiple) {
      $listbox.attr("aria-multiselectable", "true");
      tags = document.createElement("div");
      tags.className = "combobox-tags";
      tags.setAttribute("role", "list");
      tags.setAttribute("aria-label", `Selected ${trigger.getAttribute("aria-label") || dfDollar2("#" + CSS.escape(trigger.getAttribute("aria-labelledby") || "")).get(0)?.textContent?.trim() || "options"}`);
      dfDollar2(clearBtn).after(tags);
      tags.addEventListener("click", (e) => {
        const btn = e.target.closest(".combobox-tag-remove");
        if (!btn)
          return;
        const option = Array.from(allItems).find((o) => (o.dataset.value ?? o.textContent.trim()) === btn.dataset.value);
        const all = dfDollar2(tags).find(".combobox-tag-remove").toArray();
        const at = all.indexOf(btn);
        if (option)
          dfDollar2(option).attr("aria-selected", "false");
        renderSelection();
        const rest = dfDollar2(tags).find(".combobox-tag-remove").toArray();
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
        dfDollar2(tags).morph(labels.map((label, i) => `<span class="combobox-tag" role="listitem" id="${uid}-tag-${idPart(values[i])}">${esc2(label)}<button type="button" class="combobox-tag-remove" data-value="${esc2(values[i])}" aria-label="Remove ${esc2(label)}"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>`).join("") + (name ? values.map((v) => `<input type="hidden" name="${esc2(name)}" value="${esc2(v)}" id="${uid}-input-${idPart(v)}">`).join("") : ""));
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
        dfDollar2(item).prop("hidden", !match);
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
      dfDollar2(items[index]).data("highlighted", "");
      items[index].scrollIntoView({ block: "nearest" });
      $search.attr("aria-activedescendant", items[index].id);
    };
    const selectItem = (item) => {
      if (item.getAttribute("aria-disabled") === "true")
        return;
      if (multiple) {
        dfDollar2(item).attr("aria-selected", item.getAttribute("aria-selected") === "true" ? "false" : "true");
        renderSelection();
        searchInput.focus();
        return;
      }
      allItems.attr("aria-selected", "false");
      dfDollar2(item).attr("aria-selected", "true");
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
          dfDollar2(last).attr("aria-selected", "false");
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
init2();
new MutationObserver(init2).observe(document, { childList: true, subtree: true });

// src/components/big-data/data-tree/data-tree.ts
var df$3 = defussGlobals();
var dfDollar3 = defussQuery();
var dataTreeStates = ["default", "loading", "empty"];
var uid = 0;
var configOf = (tree) => tree._config ?? tree.store?.value.config ?? {};
var labelField = (tree) => tree.dataset.labelField || "name";
function applyMarkup3(el, state) {
  dfDollar3(el).attr("data-state", state.name).attr("aria-busy", state.name === "loading" ? "true" : null);
}
function siblingInfo(tree) {
  const result = tree._result;
  if (tree._siblings?.result === result)
    return tree._siblings;
  const size = new Map;
  const pos = Array.from({ length: result.entries.length }, () => 0);
  result.entries.forEach((entry, i) => {
    const parent = entry.meta.parentId ?? null;
    const n = (size.get(parent) ?? 0) + 1;
    size.set(parent, n);
    pos[i] = n;
  });
  tree._siblings = { result, size, pos };
  return tree._siblings;
}
function renderItems(tree) {
  const pool = tree._pool;
  if (!pool || !tree._result)
    return;
  const entries = tree._result.entries;
  const total = entries.length;
  const h = tree._rowHeight;
  const win = virtualWindow(tree.scrollTop, tree.clientHeight, h, total);
  tree._sizer.style.height = `${sizerHeight(total, h)}px`;
  while (pool.children.length < win.count) {
    const item = document.createElement("div");
    item.className = "data-tree-item";
    item.setAttribute("role", "treeitem");
    item.id = `${tree._uid}-item-${pool.children.length}`;
    const toggle = document.createElement("span");
    toggle.className = "data-tree-toggle";
    toggle.setAttribute("aria-hidden", "true");
    const label = document.createElement("span");
    label.className = "data-tree-label";
    item.append(toggle, label);
    pool.append(item);
  }
  while (pool.children.length > win.count)
    pool.lastElementChild.remove();
  pool.style.translate = `0 ${win.shift}px`;
  const { size, pos } = siblingInfo(tree);
  const selected = configOf(tree).selected ?? null;
  const idField = tree._source.idField;
  const draggable = tree.hasAttribute("data-drag");
  let active = null;
  let edShown = false;
  for (let i = 0;i < pool.children.length; i++) {
    const item = pool.children[i];
    const index = win.first + i;
    const entry = entries[index];
    const key = `${tree._gen}:${index}`;
    if (item._key !== key) {
      item._key = key;
      item._index = index;
      item.dataset.index = String(index);
      const meta = entry.meta;
      item.style.setProperty("--depth", String(meta.depth));
      item.setAttribute("aria-level", String(meta.depth + 1));
      item.setAttribute("aria-setsize", String(size.get(meta.parentId ?? null)));
      item.setAttribute("aria-posinset", String(pos[index]));
      if (meta.hasChildren)
        item.setAttribute("aria-expanded", String(meta.isExpanded));
      else
        item.removeAttribute("aria-expanded");
      item.toggleAttribute("data-match", !!(configOf(tree).filters || []).length && meta.isMatch);
      delete item.dataset.editing;
      const label = item.lastElementChild;
      if (tree._render) {
        label.textContent = "";
        tree._render(label, entry.row, meta);
      } else {
        label.textContent = String(entry.row[labelField(tree)] ?? "");
      }
    }
    const ed = tree._editor;
    if (ed && ed.id === entry.row[idField]) {
      edShown = true;
      if (!item.contains(ed.wrap)) {
        const focused = ed.wrap.contains(document.activeElement) || document.activeElement === document.body;
        placeTreeEditor(item, ed);
        if (focused)
          editorControl(ed.editor).focus({ preventScroll: true });
      }
    }
    item.setAttribute("aria-selected", String(selected !== null && entry.row[idField] === selected));
    const drags = draggable && !(ed && ed.id === entry.row[idField]);
    if (item.draggable !== drags)
      item.draggable = drags;
    item.toggleAttribute("data-active", index === tree._active);
    if (index === tree._active)
      active = item;
  }
  if (active)
    tree.setAttribute("aria-activedescendant", active.id);
  else
    tree.removeAttribute("aria-activedescendant");
  if (tree._editor && !edShown && !tree._writing)
    queueMicrotask(() => {
      if (tree._editor && !commitTreeEdit(tree, false))
        cancelTreeEdit(tree, false);
    });
}
var editField = (tree) => tree.dataset.editField || labelField(tree);
function treeRules(tree) {
  const d = tree.dataset;
  const rules = {};
  if (tree.hasAttribute("data-required"))
    rules.required = true;
  if (d.minLength)
    rules.minLength = Number(d.minLength);
  if (d.maxLength)
    rules.maxLength = Number(d.maxLength);
  if (d.pattern)
    rules.pattern = d.pattern;
  if (d.message)
    rules.message = d.message;
  if (d.options)
    rules.options = d.options.split(",").map((o) => o.trim());
  return rules;
}
var treeContext = (tree, entry) => {
  const field = editField(tree);
  const rules = treeRules(tree);
  return {
    record: entry.row,
    meta: entry.meta,
    field,
    type: tree.dataset.editor || valueType(entry.row[field], rules),
    rules,
    tree
  };
};
function placeTreeEditor(item, ed) {
  ed.item = item;
  item.dataset.editing = "";
  const label = item.lastElementChild;
  label.textContent = "";
  label.append(ed.wrap);
}
function openTreeEdit(tree, index) {
  if (!tree.hasAttribute("data-editable") || tree.hasAttribute("data-readonly"))
    return false;
  const entry = entryAt(tree, index);
  if (!entry)
    return false;
  if (tree._editor && !commitTreeEdit(tree, false))
    return false;
  const ctx = treeContext(tree, entry);
  const value = entry.row[ctx.field];
  const custom = tree._sourceOptions?.getEditorFn?.(ctx.field, value, ctx);
  if (custom === false)
    return false;
  const editor = asEditor(custom) ?? builtinEditor(ctx.type, value, ctx.rules);
  activate(tree, index);
  const wrap = document.createElement("span");
  wrap.className = "data-tree-editor";
  wrap.append(editor.el);
  const ed = { id: entry.row[tree._source.idField], field: ctx.field, editor, wrap, value, entry, item: null };
  tree._editor = ed;
  const item = dfDollar3(tree._pool).children(".data-tree-item").toArray().find((x) => x._index === index);
  if (item)
    placeTreeEditor(item, ed);
  wrap.addEventListener("keydown", (e) => {
    e.stopPropagation();
    const act = editorKey(e, editor);
    if (!act)
      return;
    e.preventDefault();
    if (act === "cancel")
      cancelTreeEdit(tree);
    else
      commitTreeEdit(tree);
  });
  wrap.addEventListener("click", (e) => e.stopPropagation());
  wrap.addEventListener("dblclick", (e) => e.stopPropagation());
  wrap.addEventListener("change", () => {
    if (editor.immediate)
      commitTreeEdit(tree);
  });
  wrap.addEventListener("focusout", (e) => {
    if (wrap.contains(e.relatedTarget))
      return;
    setTimeout(() => {
      if (tree._editor === ed && !wrap.contains(document.activeElement))
        commitTreeEdit(tree, false);
    }, 0);
  });
  focusEditor(editor);
  return true;
}
function cancelTreeEdit(tree, focus = true) {
  if (!tree._editor)
    return;
  tree._editor = null;
  tree._gen = (tree._gen || 0) + 1;
  renderItems(tree);
  if (focus)
    tree.focus({ preventScroll: true });
}
function writeTreeRecord(tree, id, patch) {
  const idField = tree._source.idField;
  const rows = tree._source.rows;
  const at = rows.findIndex((r) => r[idField] === id);
  if (at < 0)
    return null;
  const record = { ...rows[at], ...patch };
  const next = rows.slice();
  next[at] = record;
  tree._source.setRows(next);
  tree._writing = true;
  triggerStateChange3(tree, tree.store.value, tree.store.value);
  tree._writing = false;
  const index = tree._result.entries.findIndex((x) => x.row[idField] === id);
  if (index >= 0)
    activate(tree, index);
  return record;
}
function commitTreeEdit(tree, focus = true) {
  const ed = tree._editor;
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
  const ctx = treeContext(tree, ed.entry);
  if (!problem)
    problem = editorProblem(ctx.rules, value);
  if (!problem) {
    const answer = tree._sourceOptions?.validateFn?.(ed.field, value, ctx);
    if (typeof answer === "string" && answer)
      problem = answer;
    else if (answer === false)
      problem = "Invalid value";
  }
  if (problem) {
    const control = editorControl(ed.editor);
    control.setAttribute("aria-invalid", "true");
    let note = dfDollar3(ed.wrap).children(".data-tree-error").get(0);
    if (!note) {
      note = document.createElement("span");
      note.className = "data-tree-error";
      note.setAttribute("role", "alert");
      note.id = `dt-error-${Math.random().toString(36).slice(2, 8)}`;
      ed.wrap.append(note);
      control.setAttribute("aria-describedby", note.id);
    }
    dfDollar3(note).text(problem);
    return false;
  }
  tree._editor = null;
  const oldValue = ed.value;
  const before = new CustomEvent("data-tree-beforeedit", {
    bubbles: true,
    cancelable: true,
    detail: { record: ed.entry.row, field: ed.field, value, oldValue }
  });
  const same = JSON.stringify(value) === JSON.stringify(oldValue) && !ed.editor.patch;
  if (same || !tree.dispatchEvent(before)) {
    tree._gen = (tree._gen || 0) + 1;
    renderItems(tree);
  } else {
    const record = writeTreeRecord(tree, ed.id, { ...ed.editor.patch?.(), [ed.field]: value });
    tree.dispatchEvent(new CustomEvent("data-tree-edit", {
      bubbles: true,
      detail: { record, field: ed.field, value, oldValue }
    }));
  }
  if (focus)
    tree.focus({ preventScroll: true });
  return true;
}
function refresh(tree, config, previous) {
  if (!tree._source)
    return 0;
  if (tree._editor && !tree._writing) {
    tree._writing = true;
    if (!commitTreeEdit(tree, false))
      tree._editor = null;
    tree._writing = false;
  }
  tree._result = tree._source.query({
    filters: config.filters,
    sorters: config.sorters,
    expanded: config.expanded,
    collapsed: config.collapsed
  });
  tree._gen = (tree._gen || 0) + 1;
  const prev = previous?.config || {};
  if (JSON.stringify(prev.filters ?? []) !== JSON.stringify(config.filters ?? [])) {
    tree.scrollTop = 0;
    const first = tree._result.entries.findIndex((e) => e.meta.isMatch);
    tree._active = (config.filters || []).length ? Math.max(0, first) : 0;
  }
  tree._active = Math.min(tree._active ?? 0, Math.max(0, tree._result.entries.length - 1));
  renderItems(tree);
  return tree._result.entries.length;
}
function triggerStateChange3(tree, state, previous) {
  tree._config = state.config;
  let name = state.name;
  if (name !== "loading") {
    const rows = refresh(tree, state.config, previous);
    if (name === "default" && !rows)
      name = "empty";
  }
  applyMarkup3(tree, { name, config: state.config });
  tree.dataset.stateName = name;
  if (tree._saved) {
    tree._saved.set({
      filters: state.config.filters ?? [],
      sorters: state.config.sorters ?? [],
      expanded: state.config.expanded ?? [],
      selected: state.config.selected ?? null
    });
  }
  if (tree.id) {
    for (const input of dfDollar3(`[data-tree-filter="${CSS.escape(tree.id)}"]`).toArray()) {
      if (input === document.activeElement)
        continue;
      const field = input.dataset.field || labelField(tree);
      input.value = filterText((state.config.filters || []).find((x) => x.field === field));
    }
  }
}
var KEPT = ["filters", "sorters", "expanded"];
function attachPersistence2(tree, config) {
  tree._saved?.destroy();
  const where = viewPersistence(tree, "data-tree", String(dfDollar3(".data-tree").toArray().indexOf(tree)), config || {});
  tree._saved = where ? persisted(where.key, {}, {
    area: where.area,
    validate: (v) => typeof v === "object" && v !== null && !Array.isArray(v)
  }) : null;
  const kept = {};
  for (const k of KEPT)
    if (Array.isArray(tree._saved?.value[k]))
      kept[k] = tree._saved.value[k];
  if (tree._saved && tree._saved.value.selected !== undefined)
    kept.selected = tree._saved.value.selected;
  return kept;
}
var dataTreeApi = componentState({
  component: "data-tree",
  states: dataTreeStates,
  mergeConfig: true,
  apply: (tree, state, previous) => triggerStateChange3(tree, state, previous),
  markup: (el, state) => applyMarkup3(el, state)
});
df$3.dataTreeApi = dataTreeApi;
df$3.dataTreeStates = dataTreeStates;
var query = (tree, patch) => dataTreeApi.setState(tree, tree.store.value.name === "loading" ? "loading" : "default", patch);
var entryAt = (tree, index) => tree._result?.entries[index];
function ancestorsOf(tree, id) {
  const src = tree._source;
  if (tree._parents?.rows !== src.rows) {
    const field = tree._parentField || "parentId";
    const map = new Map;
    for (const row of src.rows)
      map.set(row[src.idField], row[field] ?? null);
    tree._parents = { rows: src.rows, map };
  }
  const map = tree._parents.map;
  const out = [];
  const seen = new Set;
  for (let at = map.get(id) ?? null;at !== null && map.has(at) && !seen.has(at); at = map.get(at) ?? null) {
    seen.add(at);
    out.unshift(at);
  }
  return out;
}
function setExpanded(tree, index, open) {
  const entry = entryAt(tree, index);
  if (!entry?.meta.hasChildren || entry.meta.isExpanded === open)
    return false;
  const id = entry.row[tree._source.idField];
  const config = configOf(tree);
  if ((config.filters || []).length) {
    const collapsed = new Set(config.collapsed || []);
    if (open)
      collapsed.delete(id);
    else
      collapsed.add(id);
    query(tree, { collapsed: [...collapsed] });
  } else if (open && tree.hasAttribute("data-exclusive")) {
    query(tree, { expanded: [...ancestorsOf(tree, id), id] });
  } else {
    const expanded = new Set(config.expanded || []);
    if (open)
      expanded.add(id);
    else
      expanded.delete(id);
    query(tree, { expanded: [...expanded] });
  }
  return true;
}
function select(tree, index) {
  const entry = entryAt(tree, index);
  if (!entry)
    return;
  query(tree, { selected: entry.row[tree._source.idField] });
  tree.dispatchEvent(new CustomEvent("data-tree-select", {
    bubbles: true,
    detail: { record: entry.row, meta: entry.meta }
  }));
}
function activate(tree, index) {
  const total = tree._result?.entries.length ?? 0;
  if (!total)
    return;
  tree._active = Math.max(0, Math.min(total - 1, index));
  tree.scrollTop = scrollIntoViewTop(tree._active, tree.scrollTop, tree.clientHeight, tree._rowHeight, total);
  renderItems(tree);
}
function onKeydown2(tree, e) {
  if (tree._editor && tree._editor.wrap.contains(e.target))
    return;
  const index = tree._active ?? 0;
  const entry = entryAt(tree, index);
  if (!entry)
    return;
  const page = Math.max(1, Math.floor(tree.clientHeight / tree._rowHeight) - 1);
  switch (e.key) {
    case "ArrowDown":
      activate(tree, index + 1);
      break;
    case "ArrowUp":
      activate(tree, index - 1);
      break;
    case "ArrowRight":
      if (entry.meta.hasChildren && !setExpanded(tree, index, true))
        activate(tree, index + 1);
      break;
    case "ArrowLeft":
      if (entry.meta.hasChildren && entry.meta.isExpanded)
        setExpanded(tree, index, false);
      else if (entry.meta.parentId != null) {
        const parent = tree._result.entries.findIndex((x) => x.row[tree._source.idField] === entry.meta.parentId);
        if (parent >= 0)
          activate(tree, parent);
      }
      break;
    case "Home":
      activate(tree, 0);
      break;
    case "End":
      activate(tree, tree._result.entries.length - 1);
      break;
    case "PageDown":
      activate(tree, index + page);
      break;
    case "PageUp":
      activate(tree, index - page);
      break;
    case "F2":
      if (!openTreeEdit(tree, index))
        return;
      break;
    case "Enter":
    case " ":
      select(tree, index);
      break;
    case "*": {
      const parent = entry.meta.parentId ?? null;
      const ids = tree._result.entries.filter((x) => (x.meta.parentId ?? null) === parent && x.meta.hasChildren).map((x) => x.row[tree._source.idField]);
      query(tree, { expanded: [...new Set([...configOf(tree).expanded || [], ...ids])] });
      break;
    }
    default:
      return;
  }
  e.preventDefault();
}
function onClick(tree, e) {
  const item = e.target.closest?.(".data-tree-item");
  if (!item || !tree._pool.contains(item))
    return;
  tree._active = item._index;
  if (e.target.closest(".data-tree-toggle")) {
    const entry = entryAt(tree, item._index);
    setExpanded(tree, item._index, !entry?.meta.isExpanded);
    return;
  }
  select(tree, item._index);
}
var fieldsOf = (tree) => ({
  idField: tree._source.idField,
  parentIdField: tree._source.tree?.parentIdField ?? tree._parentField ?? "parentId"
});
function outline(tree, records, root) {
  const { idField, parentIdField } = fieldsOf(tree);
  const children = new Map;
  for (const r of records) {
    const p = r[parentIdField] ?? null;
    if (!children.has(p))
      children.set(p, []);
    children.get(p).push(r);
  }
  const lines = [];
  const items = [];
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const walk = (r, depth) => {
    const label = String(r[labelField(tree)] ?? "");
    lines.push("\t".repeat(depth) + label);
    const kids = children.get(r[idField]) ?? [];
    items.push(`<li>${esc(label)}`);
    if (kids.length) {
      items.push("<ul>");
      for (const k of kids)
        walk(k, depth + 1);
      items.push("</ul>");
    }
    items.push("</li>");
  };
  const top = records.find((r) => r[idField] === root);
  if (top)
    walk(top, 0);
  return { plain: lines.join(`
`), html: `<ul>${items.join("")}</ul>` };
}
function onTreeDragStart(tree, e) {
  const item = e.target;
  if (!tree.hasAttribute("data-drag") || !tree._source || !item.classList?.contains("data-tree-item"))
    return;
  if (!tree._pool.contains(item))
    return;
  const entry = entryAt(tree, item._index);
  if (!entry)
    return e.preventDefault();
  const fields = fieldsOf(tree);
  const root = entry.row[fields.idField];
  const records = subtreeOf(tree._source.rows, [root], fields);
  const drag = {
    source: tree,
    records,
    roots: [root],
    ...fields,
    effects: dropEffects(tree.dataset.drag),
    remove: () => writeTreeRows(tree, withoutRecords(tree._source.rows, records, fields.idField)),
    done: (effect, target) => tree.dispatchEvent(new CustomEvent("data-tree-dragend", {
      bubbles: true,
      detail: { records, effect, target }
    }))
  };
  const label = String(entry.row[labelField(tree)] ?? "");
  startRecordDrag(e, drag, outline(tree, records, root), records.length > 1 ? `${label} (+${records.length - 1})` : label);
  tree.setAttribute("data-dragging-items", "");
}
function onTreeDragEnd(tree) {
  tree.removeAttribute("data-dragging-items");
  const drag = recordDrag();
  if (drag?.source === tree)
    endRecordDrag(drag);
}
function treeDropAt(tree, e) {
  const h = tree._rowHeight;
  const y = e.clientY - tree._sizer.getBoundingClientRect().top;
  const index = Math.max(0, Math.floor(y / h));
  const entry = entryAt(tree, index);
  if (!entry)
    return { at: { id: null, place: "end" }, index: tree._result?.entries.length ?? 0 };
  const f = y / h - index;
  const place = f < 0.25 ? "before" : f > 0.75 ? "after" : "into";
  return { at: { id: entry.row[tree._source.idField], place }, index };
}
function showTreeDrop(tree, at, index = 0) {
  let mark = tree._dropMark;
  if (!at) {
    mark?.remove();
    tree._dropMark = null;
    return;
  }
  if (!mark) {
    mark = tree._dropMark = document.createElement("div");
    mark.className = "data-tree-drop";
    mark.setAttribute("aria-hidden", "true");
  }
  if (mark.parentElement !== tree._sizer)
    tree._sizer.append(mark);
  const entries = tree._result?.entries ?? [];
  const row = at.place === "end" ? entries.length : at.place === "after" ? index + 1 : index;
  mark.dataset.place = at.place;
  mark.style.top = `${row * tree._rowHeight}px`;
  mark.style.setProperty("--depth", String(at.place === "end" ? 0 : entries[index]?.meta.depth ?? 0));
}
function onTreeDragOver(tree, e) {
  if (!tree.hasAttribute("data-drop") || !tree._source || !carriesRecords(e))
    return;
  const drag = recordDrag();
  const effect = dropEffectFor(e, dropEffects(tree.dataset.drop), drag);
  const { at, index } = treeDropAt(tree, e);
  const box = tree.getBoundingClientRect();
  if (e.clientY < box.top + tree._rowHeight)
    tree.scrollTop -= 12;
  else if (e.clientY > box.bottom - tree._rowHeight)
    tree.scrollTop += 12;
  const within = drag?.source === tree && effect === "move";
  const idField = tree._source.idField;
  if (!effect || within && at.id !== null && drag.records.some((r) => r[idField] === at.id)) {
    if (e.dataTransfer)
      e.dataTransfer.dropEffect = "none";
    showTreeDrop(tree, null);
    return;
  }
  e.preventDefault();
  if (e.dataTransfer)
    e.dataTransfer.dropEffect = effect;
  showTreeDrop(tree, at, index);
}
function onTreeDrop(tree, e) {
  showTreeDrop(tree, null);
  if (!tree.hasAttribute("data-drop") || !tree._source)
    return;
  const drag = recordDrag();
  const payload = droppedRecords(e);
  const effect = dropEffectFor(e, dropEffects(tree.dataset.drop), drag);
  if (!payload || !effect)
    return;
  e.preventDefault();
  dropTreeRecords(tree, payload, effect, treeDropAt(tree, e).at, drag);
}
function dropTreeRecords(tree, payload, effect, at, drag) {
  const fields = fieldsOf(tree);
  const within = !!drag && drag.source === tree && effect === "move";
  const placed = placeRecords({
    rows: tree._source.rows,
    ...fields,
    from: payload,
    at,
    copy: effect === "copy",
    within
  });
  const source = drag?.source ?? null;
  const detail = { records: placed?.inserted ?? [], effect, source, at };
  if (!placed || !tree.dispatchEvent(new CustomEvent("data-tree-beforedrop", { bubbles: true, cancelable: true, detail }))) {
    endRecordDrag(drag);
    return null;
  }
  if (drag && effect === "move" && !within)
    drag.remove();
  const first = placed.roots[0];
  const parentOf = new Map(placed.rows.map((r) => [r[fields.idField], r[fields.parentIdField] ?? null]));
  const way = [];
  const seen = new Set;
  for (let p = parentOf.get(first) ?? null;p !== null && parentOf.has(p) && !seen.has(p); p = parentOf.get(p) ?? null) {
    seen.add(p);
    way.unshift(p);
  }
  const patch = { selected: first ?? null };
  if (way.length)
    patch.expanded = [...new Set([...configOf(tree).expanded || [], ...way])];
  writeTreeRows(tree, placed.rows, patch);
  drag?.done(effect, tree);
  endRecordDrag(drag);
  const index = tree._result?.entries.findIndex((x) => x.row[fields.idField] === first) ?? -1;
  if (index >= 0)
    activate(tree, index);
  tree.focus({ preventScroll: true });
  tree.dispatchEvent(new CustomEvent("data-tree-drop", { bubbles: true, detail }));
  return placed.inserted;
}
function writeTreeRows(tree, next, patch = {}) {
  tree._source.setRows(next);
  const sel = configOf(tree).selected ?? null;
  if (!("selected" in patch) && sel !== null && !next.some((r) => r[tree._source.idField] === sel))
    patch = { ...patch, selected: null };
  tree._writing = true;
  try {
    if (Object.keys(patch).length)
      query(tree, patch);
    else
      triggerStateChange3(tree, tree.store.value, tree.store.value);
  } finally {
    tree._writing = false;
  }
}
if (!document.__dataTreeFilterInit) {
  document.__dataTreeFilterInit = true;
  document.addEventListener("input", (e) => {
    const input = e.target.closest?.("[data-tree-filter]");
    if (!input)
      return;
    const tree = dfDollar3("#" + CSS.escape(input.dataset.treeFilter)).get(0);
    if (!tree?.store)
      return;
    clearTimeout(tree._filterTimer);
    tree._filterTimer = setTimeout(() => {
      const filter = parseFilter(input.dataset.field || labelField(tree), input.value, "text");
      query(tree, { filters: filter ? [filter] : [], collapsed: [] });
    }, 150);
  });
}
var resolve2 = (target) => typeof target === "string" ? dfDollar3(target).get(0) : target;
df$3.dataTree = {
  setSource(target, rows, options = {}) {
    const tree = resolve2(target);
    const idField = options.idField || tree.dataset.idField || "id";
    const parentIdField = options.parentIdField || tree.dataset.parentField || "parentId";
    tree._source = dataSource(rows, { idField, tree: { idField, parentIdField } });
    tree._parentField = parentIdField;
    tree._render = options.render || null;
    tree._sourceOptions = options;
    if (tree.store)
      dataTreeApi.setState(tree, "default", {
        ...options.query,
        ...options.persist ? attachPersistence2(tree, options.persist) : {}
      });
  },
  query: (target, patch) => {
    query(resolve2(target), patch);
  },
  expandAll(target) {
    const tree = resolve2(target);
    query(tree, { expanded: tree._source.branchIds(), collapsed: [] });
  },
  collapseAll(target) {
    const tree = resolve2(target);
    const filtering = (configOf(tree).filters || []).length > 0;
    query(tree, filtering ? { collapsed: tree._source.branchIds() } : { expanded: [] });
  },
  reveal(target, id) {
    const tree = resolve2(target);
    if (!tree?._source || !tree.store)
      return false;
    if (!tree._source.rows.some((r) => r[tree._source.idField] === id))
      return false;
    const way = ancestorsOf(tree, id);
    const config = configOf(tree);
    if ((config.filters || []).length) {
      const collapsed = new Set(config.collapsed || []);
      for (const a of way)
        collapsed.delete(a);
      query(tree, { collapsed: [...collapsed], selected: id });
    } else {
      const expanded = tree.hasAttribute("data-exclusive") ? way : [...new Set([...config.expanded || [], ...way])];
      query(tree, { expanded, selected: id });
    }
    const index = tree._result?.entries.findIndex((e) => e.row[tree._source.idField] === id) ?? -1;
    if (index < 0)
      return false;
    activate(tree, index);
    return true;
  },
  source: (target) => resolve2(target)._source,
  edit(target, id) {
    const tree = resolve2(target);
    if (!df$3.dataTree.reveal(tree, id))
      return false;
    const index = tree._result.entries.findIndex((x) => x.row[tree._source.idField] === id);
    return openTreeEdit(tree, index);
  },
  commit: (target) => commitTreeEdit(resolve2(target)),
  cancel: (target) => cancelTreeEdit(resolve2(target)),
  update(target, id, patch) {
    const tree = resolve2(target);
    const old = tree._source.rows.find((r) => r[tree._source.idField] === id);
    if (!old)
      return null;
    const record = writeTreeRecord(tree, id, patch);
    for (const field of Object.keys(patch))
      tree.dispatchEvent(new CustomEvent("data-tree-edit", {
        bubbles: true,
        detail: { record, field, value: patch[field], oldValue: old[field] }
      }));
    return record;
  },
  selected(target) {
    const tree = resolve2(target);
    const id = configOf(tree).selected ?? null;
    return id === null ? null : tree._source?.rows.find((r) => r[tree._source.idField] === id) ?? null;
  },
  insert(target, records, at = { id: null, place: "end" }) {
    const tree = resolve2(target);
    if (!tree?._source || !tree.store)
      return null;
    const fields = fieldsOf(tree);
    const placed = placeRecords({
      rows: tree._source.rows,
      ...fields,
      from: { version: 1, records, roots: records.map((r) => r[fields.idField]), ...fields },
      at,
      copy: false,
      within: false
    });
    if (!placed)
      return null;
    writeTreeRows(tree, placed.rows);
    return placed.inserted;
  },
  remove(target, ids) {
    const tree = resolve2(target);
    if (!tree?._source || !tree.store)
      return [];
    const fields = fieldsOf(tree);
    const gone = subtreeOf(tree._source.rows, ids, fields);
    if (gone.length)
      writeTreeRows(tree, withoutRecords(tree._source.rows, gone, fields.idField));
    return gone;
  }
};
function init3() {
  dfDollar3(".data-tree:not([data-init])").toArray().forEach((tree) => {
    tree.dataset.init = "";
    tree._uid = tree.id || `data-tree-${++uid}`;
    const sizer = document.createElement("div");
    sizer.className = "data-tree-sizer";
    const pool = document.createElement("div");
    pool.className = "data-tree-items";
    pool.setAttribute("role", "presentation");
    sizer.append(pool);
    dfDollar3(tree).append(sizer);
    tree._sizer = sizer;
    tree._pool = pool;
    tree._active = 0;
    tree._rowHeight = parseFloat(getComputedStyle(tree).getPropertyValue("--data-tree-row-height")) || 32;
    tree.setAttribute("role", "tree");
    if (!tree.hasAttribute("tabindex"))
      tree.tabIndex = 0;
    const early = tree._sourceOptions || {};
    const config = {
      filters: [],
      sorters: [],
      expanded: [],
      collapsed: [],
      selected: null,
      ...early.query,
      ...attachPersistence2(tree, early.persist)
    };
    let queued = false;
    tree.addEventListener("scroll", () => {
      if (queued)
        return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        renderItems(tree);
      });
    }, { passive: true });
    new ResizeObserver(() => renderItems(tree)).observe(tree);
    tree.addEventListener("click", (e) => onClick(tree, e));
    tree.addEventListener("keydown", (e) => onKeydown2(tree, e));
    tree.addEventListener("dragstart", (e) => onTreeDragStart(tree, e));
    tree.addEventListener("dragend", () => onTreeDragEnd(tree));
    tree.addEventListener("dragenter", (e) => onTreeDragOver(tree, e));
    tree.addEventListener("dragover", (e) => onTreeDragOver(tree, e));
    tree.addEventListener("dragleave", (e) => {
      if (!tree.contains(e.relatedTarget))
        showTreeDrop(tree, null);
    });
    tree.addEventListener("drop", (e) => onTreeDrop(tree, e));
    new MutationObserver(() => {
      tree._gen = (tree._gen || 0) + 1;
      renderItems(tree);
    }).observe(tree, { attributes: true, attributeFilter: ["data-drag"] });
    tree.addEventListener("dblclick", (e) => {
      const item = e.target.closest?.(".data-tree-item");
      if (!item || !tree._pool.contains(item) || e.target.closest(".data-tree-toggle"))
        return;
      if (openTreeEdit(tree, item._index))
        e.preventDefault();
    });
    bindComponent(tree, dataTreeApi, { name: tree._source ? "default" : "loading", config });
    dataTreeApi.setState(tree, tree._source ? "default" : "loading", config);
  });
}
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// src/components/overlays/dialog/dialog.ts
var df$4 = defussGlobals();
var dfDollar4 = defussQuery();
var dialogStates = ["default", "open"];
function applyMarkup4(dialog, stateName) {
  dfDollar4(dialog).attr("open", stateName === "open" ? "" : null);
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
      break;
  }
}
var shown = (dialog) => dialog.open ? "open" : "default";
var dialogApi = componentState({
  component: "dialog",
  states: dialogStates,
  apply: (dialog, state) => triggerStateChange4(dialog, state.name, state.config),
  read: (dialog, state) => ({ name: shown(dialog), config: state.config }),
  markup: (el, state) => applyMarkup4(el, state.name)
});
df$4.dialogApi = dialogApi;
df$4.dialogStates = dialogStates;
function init4() {
  dfDollar4("[data-dialog-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar4("#" + CSS.escape(trigger.dataset.dialogTrigger)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog._trigger = trigger;
      dialog.showModal();
    });
  });
  dfDollar4("dialog:not(.alert-dialog):not(.sheet):not(.command):not(.window):not(.cookie-consent-dialog):not([data-init])").toArray().forEach((dialog) => {
    dfDollar4(dialog).data("init", "");
    bindComponent(dialog, dialogApi, { name: shown(dialog), config: {} });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog)
        dialog.close();
    });
    dfDollar4(dialog).find("[data-dialog-close]").toArray().forEach((btn) => {
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
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// src/components/navigation/dropdown/dropdown.ts
var df$5 = defussGlobals();
var dfDollar5 = defussQuery();
var dropdownStates = ["default", "open"];
var ITEM = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
var isDisabled = (el) => el.disabled || el.getAttribute("aria-disabled") === "true";
var itemsOf = (menu) => Array.from(dfDollar5(menu).find(ITEM).toArray()).filter((i) => i.closest('[role="menu"]') === menu && !isDisabled(i));
var subOf = (trigger) => dfDollar5(trigger).closest(".dropdown-sub").children(".dropdown-sub-content").get(0) ?? null;
var rootOf2 = (menu) => {
  let m = menu;
  while (m?.parentElement?.closest(".dropdown-content[popover]"))
    m = m.parentElement.closest(".dropdown-content[popover]");
  return m;
};
var HOVER_OPEN = 120;
var HOVER_CLOSE = 220;
function applyMarkup5(_el, _stateName) {}
function triggerStateChange5(menu, stateName, _config) {
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
  apply: (menu, state) => triggerStateChange5(menu, state.name, state.config),
  markup: (el, state) => applyMarkup5(el, state.name)
});
df$5.dropdownApi = dropdownApi;
df$5.dropdownStates = dropdownStates;
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
function activate2(menu, item) {
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
    dfDollar5(group).find('[role="menuitemradio"]').toArray().forEach((r) => {
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
  const openSubs = () => Array.from(dfDollar5(menu).find(".dropdown-sub-content").toArray()).filter((s) => s.parentElement.closest('[role="menu"]') === menu && s.matches(":popover-open"));
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
    activate2(menu, item);
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
  const trigger = dfDollar5(wrap).find(":scope > .dropdown-sub-trigger").get(0);
  const sub = dfDollar5(wrap).find(":scope > .dropdown-sub-content").get(0);
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
function init5() {
  dfDollar5("[data-dropdown-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const menu = dfDollar5("#" + CSS.escape(trigger.dataset.dropdownTrigger)).get(0);
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
        const otherOpen = other ? dfDollar5("#" + CSS.escape(other.getAttribute("data-dropdown-trigger"))).get(0)?.matches(":popover-open") : false;
        if (!otherOpen && (!active || active === document.body || menu.contains(active) || other))
          trigger.focus({ preventScroll: true });
      }
    });
    wireMenu(menu);
    dfDollar5(menu).find(".dropdown-sub").toArray().forEach(wireSub);
  });
  dfDollar5(".dropdown-sub").toArray().forEach(wireSub);
  dfDollar5(".dropdown-content[popover]:not(.dropdown-sub-content):not([data-init])").toArray().forEach((menu) => {
    menu.dataset.init = "";
    bindComponent(menu, dropdownApi);
  });
}
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// src/components/navigation/language-switcher/language-switcher.ts
var df$6 = defussGlobals();
var dfDollar6 = defussQuery();
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
var resolve3 = (t) => typeof t === "string" ? dfDollar6("#" + CSS.escape(t)).get(0) ?? dfDollar6(t).get(0) : t;
var esc3 = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
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
  const image = region ? ` data-region="${esc3(region)}" style="--language-switcher-flag: url('${esc3(url)}')"` : "";
  return `<span class="language-switcher-flag" data-code="${esc3(partsOf(tag).language.toUpperCase())}"${image} aria-hidden="true"></span>`;
}
var GLOBE = '<svg class="language-switcher-icon" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>';
var CHEVRON = '<svg class="combobox-chevron" aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg>';
function faceHtml(el, tag) {
  const display = el.dataset.display || "label";
  const flag = flagHtml(el, tag) || (display === "icon" ? GLOBE : "");
  const text = display === "icon" ? "" : display === "code" ? codeLabel(tag) : el.dataset.names === "ui" ? nameIn(tag, valueOf(el)) : nameIn(tag, tag);
  return `${flag}${text ? `<span class="language-switcher-label" lang="${esc3(tag)}" dir="${dirOf(tag)}">${esc3(text)}</span>` : ""}`;
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
  return `${flagHtml(el, tag)}<span class="language-switcher-name" lang="${esc3(n.lang)}" dir="${dirOf(n.lang)}">${esc3(n.name)}</span><span class="language-switcher-alt" lang="${esc3(n.altLang)}" dir="${dirOf(n.altLang)}"${n.alt ? "" : " hidden"}>${esc3(n.alt)}</span>`;
};
function comboboxHtml(el, uid) {
  const languages = languagesOf(el);
  const value = valueOf(el, languages);
  const search = el.dataset.search || "Search languages...";
  const options = languages.map((tag) => `<div role="option" id="${uid}-${idPart2(tag)}" class="combobox-item language-switcher-option" data-value="${esc3(tag)}" aria-selected="${tag === value}">${optionInner(el, tag, value)}</div>`).join("");
  const icon = (el.dataset.display || "label") === "icon";
  return `<div class="combobox language-switcher-combobox" data-ce-chrome${el.dataset.size ? ` data-size="${esc3(el.dataset.size)}"` : ""}>
<button type="button" class="btn combobox-trigger" data-variant="${esc3(el.dataset.buttonVariant || "ghost")}"${icon ? ' data-size="icon"' : ""} aria-haspopup="listbox" aria-expanded="false" aria-label="${esc3(ariaOf(el, value))}" aria-controls="${uid}-popover"><span class="combobox-value">${faceHtml(el, value)}</span>${icon ? "" : CHEVRON}</button>
<div id="${uid}-popover" class="combobox-content language-switcher-content" popover>
<div class="combobox-search"${languages.length > 7 ? "" : " data-quiet"}><input class="combobox-search-input" type="text" role="combobox" autocomplete="off" aria-expanded="true" aria-controls="${uid}-listbox" aria-activedescendant="" aria-autocomplete="list" placeholder="${esc3(search)}" aria-label="${esc3(search)}"></div>
<div id="${uid}-listbox" role="listbox" class="combobox-listbox" aria-label="${esc3(labelOf(el))}"><div class="combobox-empty" hidden>${esc3(el.dataset.empty || "No language found.")}</div>${options}</div>
</div>
</div>`;
}
function swapHtml(el) {
  const value = valueOf(el);
  return `<label class="swap language-switcher-swap"${el.dataset.swap === "fade" ? "" : ` data-variant="${esc3(el.dataset.swap || "flip")}"`} data-ce-chrome${el.dataset.size ? ` data-size="${esc3(el.dataset.size)}"` : ""}>
<input type="checkbox" role="button" aria-label="${esc3(swapLabel(el, value))}">
<span class="swap-off">${faceHtml(el, value)}</span>
<span class="swap-on">${faceHtml(el, nextOf(el, value))}</span>
</label>`;
}
function menuHtml(el) {
  const value = valueOf(el);
  return `<div class="language-switcher-menu" data-ce-chrome>${languagesOf(el).map((tag) => `<button type="button" class="dropdown-item dropdown-radio language-switcher-item" role="menuitemradio" tabindex="-1" aria-checked="${tag === value}" data-value="${esc3(tag)}">${optionInner(el, tag, value)}</button>`).join("")}</div>`;
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
var chromeOf = (el) => dfDollar6(el).children("[data-ce-chrome]").get(0);
function draw2(el) {
  const uid = el.id ? `${el.id}-ls` : el._lsId ??= `language-switcher-${++sequence}`;
  const focused = el.contains(document.activeElement);
  dfDollar6(el).children("[data-ce-chrome]").remove();
  const variant = el.dataset.variant;
  dfDollar6(el).append(dfDollar6(variant === "swap" ? swapHtml(el) : variant === "menu" ? menuHtml(el) : comboboxHtml(el, uid)));
  el._lsStructure = structureOf(el);
  el._lsValue = valueOf(el);
  if (focused)
    dfDollar6(el).find('.combobox-trigger, .swap > input, .language-switcher-item[aria-checked="true"]').get(0)?.focus();
}
var sequence = 0;
function update(el) {
  if (el._lsStructure !== structureOf(el) || !chromeOf(el))
    return draw2(el);
  const value = valueOf(el);
  const changed = el._lsValue !== value;
  el._lsValue = value;
  const chrome = dfDollar6(chromeOf(el));
  if (el.dataset.variant === "swap") {
    const input = chrome.find(":scope > input").get(0);
    if (changed) {
      const [shown, hidden] = input.checked ? [".swap-on", ".swap-off"] : [".swap-off", ".swap-on"];
      chrome.find(`:scope > ${shown}`).html(faceHtml(el, value));
      chrome.find(`:scope > ${hidden}`).html(faceHtml(el, nextOf(el, value)));
    }
    dfDollar6(input).attr("aria-label", swapLabel(el, value));
    return;
  }
  if (el.dataset.variant === "menu") {
    if (!changed)
      return;
    chrome.find(".language-switcher-item").each((_i, item) => {
      const tag = item.dataset.value || "";
      dfDollar6(item).attr("aria-checked", String(tag === value)).html(optionInner(el, tag, value));
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
    dfDollar6(option).attr("aria-selected", String(tag === value)).html(optionInner(el, tag, value));
  });
}
function choose(el, tag, announce = true) {
  const languages = languagesOf(el);
  const next = languages.find((l) => l.toLowerCase() === String(tag).toLowerCase());
  if (!next)
    return false;
  const previous = valueOf(el, languages);
  if (el.dataset.value !== next)
    dfDollar6(el).attr("data-value", next);
  update(el);
  if (announce && next !== previous)
    el.dispatchEvent(new CustomEvent("language-change", {
      bubbles: true,
      detail: { value: next, previous, name: nameIn(next, next), dir: dirOf(next) }
    }));
  return true;
}
var popoverOf = (el) => dfDollar6(el).find(":scope > .language-switcher-combobox > .combobox-content").get(0);
var isOpen = (el) => {
  try {
    return !!popoverOf(el)?.matches(":popover-open");
  } catch {
    return false;
  }
};
function applyMarkup6(el, _name, config) {
  const languages = languagesOf(el);
  const value = languages.find((l) => l.toLowerCase() === String(config?.value ?? "").toLowerCase());
  if (value)
    dfDollar6(el).attr("data-value", value);
}
function triggerStateChange6(el, name, config) {
  if (config?.value)
    choose(el, config.value, false);
  const popover = popoverOf(el);
  if (!popover)
    return;
  if (name === "open" && !isOpen(el))
    dfDollar6(el).find(".combobox-trigger").get(0)?.click();
  else if (name !== "open" && isOpen(el))
    popover.hidePopover();
}
var languageSwitcherApi = componentState({
  component: "language-switcher",
  states: languageSwitcherStates,
  mergeConfig: true,
  apply: (el, state) => triggerStateChange6(el, state.name, state.config),
  read: (el) => ({ name: isOpen(el) ? "open" : "default", config: { value: valueOf(el) } }),
  markup: (el, state) => applyMarkup6(el, state.name, state.config)
});
df$6.languageSwitcherApi = languageSwitcherApi;
df$6.languageSwitcherStates = languageSwitcherStates;
function init6() {
  dfDollar6(".language-switcher:not([data-init])").each((_i, el) => {
    el.dataset.init = "";
    if (!el.dataset.value || valueOf(el) !== el.dataset.value)
      dfDollar6(el).attr("data-value", valueOf(el));
    draw2(el);
    dfDollar6(el).on("combobox:change", (e) => {
      const value = e.detail?.values?.[0];
      el._lsValue = "";
      if (!value || !choose(el, value))
        update(el);
      languageSwitcherApi.commit(el, isOpen(el) ? "open" : "default", { value: valueOf(el) });
    });
    dfDollar6(el).on("change", (e) => {
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
    dfDollar6(el).on("dropdown:select", (e) => pick(e.detail?.item));
    dfDollar6(el).on("click", (e) => {
      const item = e.target?.closest?.(".language-switcher-item");
      if (item && !item.closest('[role="menu"]'))
        pick(item);
    });
    dfDollar6(el).on("keydown", (e) => {
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
df$6.languageSwitcher = {
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
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// src/components/application/panel/panel.ts
var df$7 = defussGlobals();
var dfDollar7 = defussQuery();
var panelStates = ["default", "minimized", "maximized", "closed"];
var SIDES2 = ["north", "south", "west", "east", "center"];
var resolve4 = (t) => typeof t === "string" ? dfDollar7("#" + CSS.escape(t)).get(0) ?? dfDollar7(t).get(0) : t;
var toolInput = (panel, tool) => dfDollar7(panel).find(`:scope > .panel-header .panel-${tool} > input[type="checkbox"]`).get(0);
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
function applyMarkup7(el, stateName) {
  dfDollar7(el).attr("data-minimized", stateName === "minimized" ? "" : null).attr("data-maximized", stateName === "maximized" ? "" : null);
  dfDollar7(el).attr("hidden", stateName === "closed" ? "" : null);
  dfDollar7(el).children(".panel-body").attr("inert", stateName === "minimized" ? "" : null);
}
function triggerStateChange7(panel, stateName) {
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
  const body = dfDollar7(panel).find(":scope > .panel-body").get(0);
  if (body)
    body.toggleAttribute("inert", minimized);
  const region = regionOf2(panel);
  if (region && region !== panel) {
    region.toggleAttribute("data-panel-minimized", minimized);
    region.toggleAttribute("data-panel-closed", closed);
    const handle = dfDollar7(region).find(":scope > .resizer-handle").get(0);
    if (handle)
      handle.inert = minimized || maximized || closed;
  }
  const host = hostOf(panel);
  if (maximized && host) {
    panel._host = host;
    host.setAttribute("data-panel-maximized", "");
  } else if (panel._host) {
    if (!dfDollar7(panel._host).find(".panel[data-maximized]").get(0))
      panel._host.removeAttribute("data-panel-maximized");
    panel._host = null;
  }
}
var panelApi = componentState({
  component: "panel",
  states: panelStates,
  apply: (panel, state) => {
    const from = panel.dataset.stateName || "default";
    triggerStateChange7(panel, state.name);
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
  markup: (el, state) => applyMarkup7(el, state.name)
});
df$7.panelApi = panelApi;
df$7.panelStates = panelStates;
function init7() {
  dfDollar7(".panel:not([data-init])").toArray().forEach((panel) => {
    panel.dataset.init = "";
    const side = sideOf(regionOf2(panel));
    if (side)
      panel.dataset.region = side;
    const header = dfDollar7(panel).find(":scope > .panel-header").get(0);
    const body = dfDollar7(panel).find(":scope > .panel-body").get(0);
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
    dfDollar7(panel).on("click", (e) => {
      const close = e.target?.closest?.(".panel-close");
      if (!close || close.closest(".panel") !== panel)
        return;
      panelApi.setState(panel, "closed");
      if (panel.id)
        dfDollar7(`[data-panel-open="${CSS.escape(panel.id)}"], [data-panel-toggle="${CSS.escape(panel.id)}"]`).get(0)?.focus();
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
    triggerStateChange7(panel, start);
    panel.dataset.stateName = start;
    syncToggles(panel);
  });
}
var act = (t, state) => {
  const panel = resolve4(t);
  if (panel?.api)
    panel.api.setState(state);
  return panel ?? null;
};
var panelActions = {
  minimize: (target) => act(target, "minimized"),
  maximize: (target) => act(target, "maximized"),
  restore: (target) => act(target, "default"),
  close: (target) => act(target, "closed"),
  open: (target) => act(target, "default"),
  toggle: (target) => {
    const panel = resolve4(target);
    if (!panel?.api)
      return false;
    panel.api.setState(panel.hasAttribute("data-minimized") ? "default" : "minimized");
    return panel.hasAttribute("data-minimized");
  }
};
df$7.panel = panelActions;
var openersBound = false;
function bindOpeners() {
  if (openersBound)
    return;
  openersBound = true;
  dfDollar7(document).on("click", (e) => {
    const trigger = e.target?.closest?.("[data-panel-open], [data-panel-toggle]");
    if (!trigger)
      return;
    const id = trigger.dataset.panelOpen ?? trigger.dataset.panelToggle;
    const panel = dfDollar7(`#${CSS.escape(id)}`).get(0);
    if (!panel?.api)
      return;
    if (trigger.hasAttribute("data-panel-toggle") && panel.dataset.stateName !== "closed") {
      panel.api.setState("closed");
      return;
    }
    panel.api.setState("default");
    dfDollar7(panel).find(":scope > .panel-header .panel-tools :is(input, button)").get(0)?.focus();
  });
}
function syncToggles(panel) {
  if (!panel.id)
    return;
  for (const t of dfDollar7(`[data-panel-toggle="${CSS.escape(panel.id)}"]`).toArray()) {
    t.setAttribute("aria-expanded", String(panel.dataset.stateName !== "closed" && !panel.hidden));
    t.setAttribute("aria-controls", panel.id);
  }
}
bindOpeners();
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

// src/components/application/property-grid/property-grid.ts
var df$8 = defussGlobals();
var dfDollar8 = defussQuery();
var propertyGridStates = ["default", "editing"];
var isGroup = (v) => v !== null && typeof v === "object";
var pathKey = (path) => path.join(".");
var toPath = (path) => Array.isArray(path) ? path.map(String) : String(path).split(".").filter((s) => s !== "");
var clone = (v) => v === undefined ? undefined : structuredClone(v);
var configOf2 = (root) => root._config ?? root.store?.value.config ?? {};
var optionsOf = (root) => root._options ?? {};
function getAt(obj, path) {
  let at = obj;
  for (const k of path) {
    if (!isGroup(at))
      return;
    at = at[k];
  }
  return at;
}
function setAt(obj, path, value) {
  if (!path.length)
    return value;
  const [head, ...rest] = path;
  const copy = Array.isArray(obj) ? [...obj] : { ...obj };
  copy[head] = setAt(isGroup(obj) ? obj[head] : undefined, rest, value);
  return copy;
}
var typeOf = (value, conf) => valueType(value, conf);
function confOf(root, path) {
  const sc = optionsOf(root).sourceConfig ?? {};
  return sc[pathKey(path)] ?? sc[path[path.length - 1]] ?? null;
}
function fill(cell, content) {
  if (content == null || content === false)
    return false;
  dfDollar8(cell).empty();
  if (content instanceof Node)
    dfDollar8(cell).append(content);
  else
    dfDollar8(cell).text(String(content));
  return true;
}
function defaultValue(cell, value, type) {
  dfDollar8(cell).empty();
  const span = document.createElement("span");
  if (type === "object" || type === "array") {
    span.className = "property-grid-summary";
    const n = Object.keys(value).length;
    dfDollar8(span).text(type === "array" ? `[${n} ${n === 1 ? "item" : "items"}]` : `{${n} ${n === 1 ? "property" : "properties"}}`);
  } else if (type === "boolean") {
    span.className = "property-grid-bool";
    span.dataset.value = String(value);
    dfDollar8(span).text(String(value));
  } else if (type === "color") {
    span.className = "property-grid-color";
    const swatch = document.createElement("i");
    swatch.className = "property-grid-swatch";
    swatch.style.background = value;
    swatch.setAttribute("aria-hidden", "true");
    dfDollar8(span).append(swatch).append(document.createTextNode(value));
  } else if (type === "json") {
    span.className = "property-grid-summary";
    dfDollar8(span).text(JSON.stringify(value));
  } else if (type === "null") {
    span.className = "property-grid-null";
    dfDollar8(span).text("null");
  } else {
    dfDollar8(span).text(String(value ?? ""));
  }
  dfDollar8(cell).append(span);
}
function rowsOf(root, source) {
  const out = [];
  const collapsed = new Set(configOf2(root).collapsed ?? []);
  const sort = root.dataset.sort;
  const walk = (obj, path, depth) => {
    let keys = Object.keys(obj);
    if (!Array.isArray(obj) && (sort === "asc" || sort === "desc")) {
      keys = keys.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }) * (sort === "desc" ? -1 : 1));
    }
    for (const key of keys) {
      const p = [...path, key];
      const value = obj[key];
      const conf = confOf(root, p);
      if (conf?.hidden)
        continue;
      out.push({ path: p, key, value, depth, conf, type: typeOf(value, conf), group: isGroup(value) && !conf?.type });
      if (isGroup(value) && !conf?.type && !collapsed.has(pathKey(p)))
        walk(value, p, depth + 1);
    }
  };
  if (isGroup(source))
    walk(source, [], 0);
  return out;
}
function renderRows(root) {
  const { source = {} } = configOf2(root);
  const opts = optionsOf(root);
  let table = dfDollar8(root).children(".property-grid-table").get(0);
  const focused = table?.contains(document.activeElement) ? document.activeElement.closest("tr")?.dataset.path : null;
  if (!table) {
    table = document.createElement("table");
    table.className = "property-grid-table";
    const head = document.createElement("thead");
    const tr = document.createElement("tr");
    for (const [label, cls] of [
      [root.dataset.keyLabel || "Property", "property-grid-key"],
      [root.dataset.valueLabel || "Value", "property-grid-value"]
    ]) {
      const th = document.createElement("th");
      th.scope = "col";
      th.className = cls;
      dfDollar8(th).text(label);
      tr.append(th);
    }
    head.append(tr);
    if (root.hasAttribute("data-headless"))
      head.hidden = true;
    table.append(head, document.createElement("tbody"));
    dfDollar8(root).append(table);
  }
  const body = dfDollar8(table).children("tbody").get(0);
  dfDollar8(body).empty();
  const readonlyAll = root.hasAttribute("data-readonly");
  const rows = rowsOf(root, source);
  for (const row of rows) {
    const tr = document.createElement("tr");
    tr._path = row.path;
    tr.className = row.group ? "property-grid-group" : "property-grid-row";
    tr.dataset.path = pathKey(row.path);
    tr.dataset.type = row.type;
    if (row.depth)
      tr.style.setProperty("--depth", String(row.depth));
    const keyCell = document.createElement("th");
    keyCell.scope = "row";
    keyCell.className = "property-grid-key";
    const valueCell = document.createElement("td");
    valueCell.className = "property-grid-value";
    const ctx = { path: [...row.path], depth: row.depth, type: row.type, config: row.conf, source, grid: root };
    if (row.conf?.description)
      keyCell.title = row.conf.description;
    const keyText = document.createElement("span");
    keyText.className = "property-grid-label";
    if (!fill(keyText, opts.keyRenderFn?.(row.key, row.value, ctx)))
      dfDollar8(keyText).text(row.conf?.displayName ?? row.key);
    if (row.group) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "property-grid-toggle";
      const open = !(configOf2(root).collapsed ?? []).includes(tr.dataset.path);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.tabIndex = -1;
      dfDollar8(toggle).append(keyText);
      dfDollar8(keyCell).append(toggle);
    } else {
      dfDollar8(keyCell).append(keyText);
    }
    if (!fill(valueCell, opts.valueRenderFn?.(row.value, row.key, ctx)))
      defaultValue(valueCell, row.value, row.type);
    const readonly = readonlyAll || row.conf?.readOnly || row.group && !opts.getEditorFn;
    if (readonly)
      tr.dataset.readonly = "";
    else
      valueCell.setAttribute("aria-label", `${row.conf?.displayName ?? row.key}: edit`);
    valueCell.tabIndex = -1;
    tr.append(keyCell, valueCell);
    body.append(tr);
  }
  if (!rows.length) {
    const tr = document.createElement("tr");
    tr.className = "property-grid-empty";
    const td = document.createElement("td");
    td.colSpan = 2;
    dfDollar8(td).text(root.dataset.emptyText || "No properties.");
    tr.append(td);
    body.append(tr);
  }
  const target = focusTargets(root);
  const keep = target.find((t) => t.closest("tr")?.dataset.path === focused) ?? target.find((t) => t.closest("tr")?.dataset.path === root._current) ?? target[0];
  if (keep) {
    keep.tabIndex = 0;
    root._current = keep.closest("tr").dataset.path;
    if (focused)
      keep.focus();
  }
}
var focusTargets = (root) => dfDollar8(root).find(".property-grid-table > tbody > tr").toArray().map((tr) => tr.classList.contains("property-grid-group") ? dfDollar8(tr).find(".property-grid-toggle").get(0) : dfDollar8(tr).children(".property-grid-value").get(0)).filter(Boolean);
function moveFocus(root, from, by) {
  const targets = focusTargets(root);
  const at = targets.indexOf(from);
  const next = targets[by === Infinity ? targets.length - 1 : by === -Infinity ? 0 : Math.max(0, Math.min(targets.length - 1, at + by))];
  if (!next)
    return;
  for (const t of targets)
    t.tabIndex = -1;
  next.tabIndex = 0;
  root._current = next.closest("tr").dataset.path;
  next.focus();
}
var defaultEditor = (type, value, conf) => builtinEditor(type, value, conf, { colorClass: "property-grid-color-input" });
function editorFor(root, row, value) {
  const conf = confOf(root, row._path);
  const type = row.dataset.type;
  const ctx = { path: [...row._path], type, config: conf, source: configOf2(root).source, grid: root };
  const custom = optionsOf(root).getEditorFn?.(row._path[row._path.length - 1], value, ctx);
  if (custom === false)
    return null;
  return asEditor(custom) ?? defaultEditor(type, value, conf);
}
function openEditor(root, path) {
  closeEditor(root);
  const row = dfDollar8(root).find(".property-grid-table > tbody > tr").toArray().find((tr) => tr.dataset.path === path);
  if (!row || row.hasAttribute("data-readonly"))
    return false;
  const cell = dfDollar8(row).children(".property-grid-value").get(0);
  const value = getAt(configOf2(root).source, row._path);
  const editor = editorFor(root, row, value);
  if (!editor)
    return false;
  const wrap = document.createElement("div");
  wrap.className = "property-grid-editor";
  dfDollar8(wrap).append(editor.el);
  cell.dataset.editing = "";
  dfDollar8(cell).empty().append(wrap);
  root._editor = { path, row, cell, editor, value };
  focusEditor(editor);
  return true;
}
var ruleProblem = (conf, value) => editorProblem(conf, value);
function showProblem(ed, control, problem) {
  control.setAttribute?.("aria-invalid", "true");
  const wrap = dfDollar8(ed.cell).children(".property-grid-editor").get(0) ?? ed.cell;
  let note = dfDollar8(wrap).children(".property-grid-error").get(0);
  if (!note) {
    note = document.createElement("div");
    note.className = "property-grid-error";
    note.setAttribute("role", "alert");
    note.id = `pg-error-${Math.random().toString(36).slice(2, 8)}`;
    dfDollar8(wrap).append(note);
    control.setAttribute?.("aria-describedby", note.id);
  }
  dfDollar8(note).text(problem);
}
function closeEditor(root) {
  if (!root._editor)
    return;
  root._editor = null;
  renderRows(root);
}
function commit(root, then = "stay") {
  const ed = root._editor;
  if (!ed)
    return true;
  const control = editorControl(ed.editor);
  const { path, row } = ed;
  const key = row._path[row._path.length - 1];
  let problem = ed.editor.validate?.() ?? "";
  let value;
  if (!problem) {
    try {
      value = ed.editor.getValue();
    } catch (error) {
      problem = String(error.message ?? error);
    }
  }
  if (!problem)
    problem = ruleProblem(confOf(root, row._path), value);
  if (!problem) {
    const answer = optionsOf(root).validateFn?.(key, value, {
      path: [...row._path],
      type: row.dataset.type,
      config: confOf(root, row._path),
      source: configOf2(root).source,
      grid: root
    });
    if (typeof answer === "string" && answer)
      problem = answer;
    else if (answer === false)
      problem = "Invalid value";
  }
  if (problem) {
    showProblem(ed, control, problem);
    return false;
  }
  const oldValue = ed.value;
  closeEditor(root);
  const same = JSON.stringify(value) === JSON.stringify(oldValue);
  const before = new CustomEvent("property-grid-beforechange", {
    bubbles: true,
    cancelable: true,
    detail: { path, key, value, oldValue }
  });
  if (same || !root.dispatchEvent(before)) {
    root.api.setState("default", { editing: null });
    restoreFocus(root, path, then);
    return true;
  }
  const source = setAt(configOf2(root).source, row._path, value);
  root.api.setState("default", { source, editing: null });
  root.dispatchEvent(new CustomEvent("property-grid-change", {
    bubbles: true,
    detail: { path, key, value, oldValue, source: clone(source) }
  }));
  restoreFocus(root, path, then);
  return true;
}
function restoreFocus(root, path, then) {
  const target = focusTargets(root).find((t) => t.closest("tr").dataset.path === path);
  if (!target)
    return;
  if (then === "next" || then === "prev")
    moveFocus(root, target, then === "next" ? 1 : -1);
  else if (then === "stay")
    moveFocus(root, target, 0);
}
function applyMarkup8(el, state) {
  dfDollar8(el).attr("data-editing", state.name === "editing" && state.config?.editing ? String(state.config.editing) : null);
}
function triggerStateChange8(root, state, incoming) {
  root._config = state.config ?? {};
  applyMarkup8(root, state);
  const rebuild = !dfDollar8(root).children(".property-grid-table").get(0) || "source" in (incoming ?? {}) || "collapsed" in (incoming ?? {});
  if (rebuild) {
    root._editor = null;
    renderRows(root);
  }
  if (state.name === "editing" && state.config?.editing) {
    if (root._editor?.path !== state.config.editing) {
      if (!openEditor(root, state.config.editing))
        queueMicrotask(() => root.api.setState("default", { editing: null }));
    }
  } else if (root._editor) {
    closeEditor(root);
  }
}
var propertyGridApi = componentState({
  component: "property-grid",
  states: propertyGridStates,
  mergeConfig: true,
  apply: (root, state, _previous, incoming) => triggerStateChange8(root, state, incoming),
  markup: (el, state) => applyMarkup8(el, state)
});
df$8.propertyGridApi = propertyGridApi;
df$8.propertyGridStates = propertyGridStates;
var resolve5 = (target) => typeof target === "string" ? dfDollar8(target).get(0) : target;
df$8.propertyGrid = {
  configure(target, options = {}) {
    const root = resolve5(target);
    if (!root)
      return null;
    const { source, ...rest } = options;
    root._options = { ...root._options, ...rest };
    if (!root.api) {
      if (source !== undefined)
        root._pendingSource = clone(source);
      return root;
    }
    if (source !== undefined)
      root.api.setState("default", { source: clone(source), editing: null });
    else
      root.api.setState(root.store.value.name, { collapsed: configOf2(root).collapsed ?? [] });
    return root;
  },
  setSource(target, source) {
    const root = resolve5(target);
    if (!root)
      return;
    if (!root.api)
      root._pendingSource = clone(source ?? {});
    else
      root.api.setState("default", { source: clone(source ?? {}), editing: null, collapsed: [] });
  },
  getSource: (target) => clone(configOf2(resolve5(target)).source ?? {}),
  setProperty(target, path, value) {
    const root = resolve5(target);
    if (!root)
      return;
    const p = toPath(path);
    const oldValue = getAt(configOf2(root).source, p);
    const source = setAt(configOf2(root).source, p, clone(value));
    root.api.setState(root.store.value.name === "editing" ? "default" : root.store.value.name, {
      source,
      editing: null
    });
    root.dispatchEvent(new CustomEvent("property-grid-change", {
      bubbles: true,
      detail: { path: pathKey(p), key: p[p.length - 1], value: clone(value), oldValue, source: clone(source) }
    }));
  },
  getProperty: (target, path) => clone(getAt(configOf2(resolve5(target)).source, toPath(path))),
  edit: (target, path) => {
    resolve5(target)?.api.setState("editing", { editing: pathKey(toPath(path)) });
  },
  commit: (target) => commit(resolve5(target)),
  cancel: (target) => {
    resolve5(target)?.api.setState("default", { editing: null });
  },
  expand(target, path) {
    const root = resolve5(target);
    const key = pathKey(toPath(path));
    root?.api.setState(root.store.value.name, { collapsed: (configOf2(root).collapsed ?? []).filter((p) => p !== key) });
  },
  collapse(target, path) {
    const root = resolve5(target);
    const key = pathKey(toPath(path));
    const collapsed = new Set(configOf2(root)?.collapsed ?? []);
    collapsed.add(key);
    root?.api.setState(root.store.value.name, { collapsed: [...collapsed] });
  }
};
function toggleGroup(root, path) {
  const collapsed = new Set(configOf2(root).collapsed ?? []);
  if (collapsed.has(path))
    collapsed.delete(path);
  else
    collapsed.add(path);
  root.api.setState("default", { collapsed: [...collapsed], editing: null });
}
function init8() {
  dfDollar8(".property-grid:not([data-init])").toArray().forEach((root) => {
    root.dataset.init = "";
    let source = root._pendingSource ?? {};
    const script = dfDollar8(root).children("script.property-grid-source").get(0);
    try {
      if (root._pendingSource)
        delete root._pendingSource;
      else if (script)
        source = JSON.parse(script.textContent || "{}");
      else if (root.dataset.source)
        source = JSON.parse(root.dataset.source);
    } catch (error) {
      console.error("[property-grid] invalid source JSON", error);
    }
    const conf = dfDollar8(root).children("script.property-grid-config").get(0);
    if (conf) {
      try {
        root._options = { ...root._options, sourceConfig: JSON.parse(conf.textContent || "{}") };
      } catch (error) {
        console.error("[property-grid] invalid config JSON", error);
      }
    }
    if (!root.getAttribute("role"))
      root.setAttribute("role", "group");
    dfDollar8(root).on("click", (e) => {
      const t = e.target;
      if (!t?.closest || t.closest(".property-grid-editor"))
        return;
      const toggle = t.closest(".property-grid-toggle");
      if (toggle) {
        toggleGroup(root, toggle.closest("tr").dataset.path);
        return;
      }
      const cell = t.closest(".property-grid-value");
      const row = cell?.closest("tr");
      if (!row || row.closest("thead") || row.hasAttribute("data-readonly"))
        return;
      root.api.setState("editing", { editing: row.dataset.path });
    });
    dfDollar8(root).on("keydown", (e) => {
      const t = e.target;
      if (root._editor && root._editor.cell.contains(t)) {
        const act = editorKey(e, root._editor.editor);
        if (act === "cancel") {
          e.preventDefault();
          e.stopPropagation();
          const { path } = root._editor;
          root.api.setState("default", { editing: null });
          restoreFocus(root, path, "stay");
        } else if (act === "commit") {
          e.preventDefault();
          commit(root);
        } else if (act === "next" || act === "prev") {
          const targets = focusTargets(root);
          const at = targets.findIndex((x) => x.closest("tr") === root._editor.row);
          const edge = e.shiftKey ? at <= 0 : at >= targets.length - 1;
          if (!edge)
            e.preventDefault();
          commit(root, edge ? "none" : e.shiftKey ? "prev" : "next");
        }
        return;
      }
      const row = t.closest?.("tr");
      if (!row || !root.contains(row) || row.closest("thead"))
        return;
      const keys = { ArrowDown: 1, ArrowUp: -1, Home: -Infinity, End: Infinity, PageDown: 10, PageUp: -10 };
      if (e.key in keys) {
        e.preventDefault();
        moveFocus(root, t, keys[e.key]);
      } else if (row.classList.contains("property-grid-group") && (e.key === "ArrowLeft" || e.key === "ArrowRight" || e.key === "Enter" || e.key === " ")) {
        const open = !(configOf2(root).collapsed ?? []).includes(row.dataset.path);
        if (e.key === "ArrowLeft" && open || e.key === "ArrowRight" && !open || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleGroup(root, row.dataset.path);
        }
      } else if ((e.key === "Enter" || e.key === "F2") && !row.hasAttribute("data-readonly")) {
        e.preventDefault();
        root.api.setState("editing", { editing: row.dataset.path });
      }
    });
    dfDollar8(root).on("change", (e) => {
      if (root._editor?.editor.immediate && root._editor.cell.contains(e.target))
        commit(root, "stay");
    });
    dfDollar8(root).on("focusout", (e) => {
      const ed = root._editor;
      if (!ed || !ed.cell.contains(e.target) || ed.cell.contains(e.relatedTarget))
        return;
      setTimeout(() => {
        if (root._editor === ed && !ed.cell.contains(document.activeElement))
          commit(root, "none");
      }, 0);
    });
    bindComponent(root, propertyGridApi, { name: "default", config: { source, editing: null, collapsed: [] } });
    triggerStateChange8(root, { name: "default", config: { source, editing: null, collapsed: [] } }, { source });
  });
}
init8();
new MutationObserver(init8).observe(document, { childList: true, subtree: true });

// src/components/application/resizer/resizer.ts
var df$9 = defussGlobals();
var dfDollar9 = defussQuery();
var resizerStates = ["default"];
var HANDLES = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];
var CLASS_NUMBERS = Array.from({ length: 81 }, (_, i) => i + 16);
var clamp2 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
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
  const wanted = clamp2(px, min, max);
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
function applyMarkup9(_el, _stateName) {}
function triggerStateChange9(wrapper, stateName, config = {}) {
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
  apply: (wrapper, state) => triggerStateChange9(wrapper, state.name, state.config),
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
  markup: (el, state) => applyMarkup9(el, state.name)
});
df$9.resizerApi = resizerApi;
df$9.resizerStates = resizerStates;
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
  for (const el of Array.from(dfDollar9(wrapper).find(":scope > .resizer-handle").toArray())) {
    if (!want.includes(el.dataset.handle))
      el.remove();
  }
  for (const h of want) {
    if (!dfDollar9(wrapper).find(`:scope > .resizer-handle[data-handle="${h}"]`).get(0))
      dfDollar9(wrapper).append(makeHandle(wrapper, h));
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
function init9() {
  const fresh = dfDollar9(".resizer:not([data-init])").toArray().filter((wrapper) => wrapper instanceof HTMLElement).filter((wrapper) => {
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
init9();
new MutationObserver(init9).observe(document, { childList: true, subtree: true });

// src/components/forms-inputs/slider/slider.ts
var df$10 = defussGlobals();
var dfDollar10 = defussQuery();
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
  return [...dfDollar10("output[for]").toArray()].filter((o) => o.htmlFor.contains(el.id));
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
var rangeInputs = (range) => [...dfDollar10(range).find(":scope > .slider").toArray()].slice(0, 2);
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
function applyMarkup10(el, stateName) {
  if (stateName === "disabled")
    dfDollar10(el).attr("disabled", "");
}
function triggerStateChange10(el, stateName, config) {
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
  apply: (el, state) => triggerStateChange10(el, state.name, state.config),
  read: (el, state) => {
    return {
      name: el.disabled ? "disabled" : "default",
      config: { ...state.config, value: el.value }
    };
  },
  markup: (el, state) => applyMarkup10(el, state.name)
});
df$10.sliderApi = sliderApi;
df$10.sliderStates = sliderStates;
function init10() {
  dfDollar10(".slider-range:not([data-init])").toArray().forEach((range) => {
    range.dataset.init = "";
    initRange(range);
  });
  dfDollar10(".slider:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    el._defaultDisabled = el.disabled;
    bindComponent(el, sliderApi);
    if (el.dataset.thumbEmoji && !el.dataset.thumb)
      el.dataset.thumb = "emoji";
    updateSliderValue(el);
    el.addEventListener("input", () => updateSliderValue(el));
  });
}
init10();
new MutationObserver(init10).observe(document, { childList: true, subtree: true });

// src/components/navigation/steps/steps.ts
var df$11 = defussGlobals();
var dfDollar11 = defussQuery();
var stepsStates = ["default"];
var numAttr2 = (el, key, fallback) => {
  const v = parseInt(el.dataset[key] ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
};
function renderSteps(ol) {
  const items = Array.from(dfDollar11(ol).find(".step").toArray());
  if (items.length === 0)
    return;
  const total = items.length;
  const active = Math.min(total, Math.max(1, numAttr2(ol, "activeStep", 1)));
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
function applyMarkup11(ol, config = {}) {
  if (config.activeStep !== undefined && numAttr2(ol, "activeStep", 1) !== Number(config.activeStep))
    ol.dataset.activeStep = String(config.activeStep);
  if (config.errorStep !== undefined && numAttr2(ol, "errorStep", 0) !== Number(config.errorStep)) {
    if (Number(config.errorStep))
      ol.dataset.errorStep = String(config.errorStep);
    else
      delete ol.dataset.errorStep;
  }
  if (config.size !== undefined && (ol.dataset.size ?? "md") !== config.size)
    ol.dataset.size = String(config.size);
  if (ol.hasAttribute("data-active-step"))
    renderSteps(ol);
}
function triggerStateChange11(ol, stateName, config = {}) {
  if (stateName !== "default")
    return;
  const a = config.activeStep ?? config.step ?? config.page;
  if (a !== undefined && numAttr2(ol, "activeStep", 1) !== Number(a))
    ol.dataset.activeStep = String(a);
  if (config.errorStep !== undefined) {
    if (numAttr2(ol, "errorStep", 0) !== Number(config.errorStep)) {
      if (Number(config.errorStep))
        ol.dataset.errorStep = String(config.errorStep);
      else
        delete ol.dataset.errorStep;
    }
  } else if (config.activeStepError === true)
    ol.dataset.errorStep = ol.dataset.activeStep ?? "1";
  else if (config.activeStepError === false)
    delete ol.dataset.errorStep;
  if (config.size !== undefined && (ol.dataset.size ?? "md") !== config.size)
    ol.dataset.size = String(config.size);
  if (ol.hasAttribute("data-active-step"))
    renderSteps(ol);
}
var stepsApi = componentState({
  component: "steps",
  states: stepsStates,
  apply: (ol, state) => triggerStateChange11(ol, state.name, state.config),
  read: (ol, state) => {
    return {
      name: ol.dataset.stateName || "default",
      config: {
        ...state.config,
        activeStep: numAttr2(ol, "activeStep", 1),
        activeStepError: numAttr2(ol, "errorStep", 0) === numAttr2(ol, "activeStep", 1) && numAttr2(ol, "errorStep", 0) !== 0,
        errorStep: numAttr2(ol, "errorStep", 0),
        size: ol.dataset.size ?? "md"
      }
    };
  },
  markup: (el, state) => applyMarkup11(el, state.config)
});
df$11.stepsApi = stepsApi;
df$11.stepsStates = stepsStates;
function init11() {
  dfDollar11(".steps:not([data-init])").toArray().forEach((ol) => {
    ol.dataset.init = "";
    bindComponent(ol, stepsApi);
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
      const items = Array.from(dfDollar11(ol).find(".step").toArray());
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
init11();
new MutationObserver(init11).observe(document, { childList: true, subtree: true });

// src/components/data-display/table/table.ts
var df$12 = defussGlobals();
var dfDollar12 = defussQuery();
var tableStates = ["default", "sorted", "selected"];
var bodyOf = (table) => table.tBodies[0];
var bodyRows = (table) => [...bodyOf(table)?.rows ?? []];
var rowBox = (row) => dfDollar12(row).find(':scope > .table-select input[type="checkbox"]').get(0);
var headBox = (table) => dfDollar12(table.tHead).find('.table-select input[type="checkbox"]').get(0);
function enhanceHead(table) {
  dfDollar12(table.tHead).find(".table-sort").each((_i, btn) => {
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
    if (dfDollar12(th).find(".table-sort").get(0))
      th.setAttribute("aria-sort", i === col ? direction : "none");
  });
  table._sort = { column: col, direction };
}
function unsort(table) {
  const body = bodyOf(table);
  if (body && table._original)
    body.append(...table._original.filter((r) => r.parentElement === body));
  dfDollar12(table.tHead).find("[aria-sort]").attr("aria-sort", "none");
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
  dfDollar12(table.tHead).find("[aria-sort]").attr("aria-sort", "none");
  table._sort = null;
  announceMove(table, row);
}
function initReorder(table) {
  let dragged = null;
  const clear = () => dfDollar12(table).find("[data-drop]").toArray().forEach((r) => r.removeAttribute("data-drop"));
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
    const row = dfDollar12(table).find("tbody > tr[data-drop]").get(0);
    if (!dragged || !row)
      return;
    e.preventDefault();
    const ref = row.dataset.drop === "before" ? row : row.nextSibling;
    if (ref)
      dfDollar12(ref).before(dragged);
    else
      dfDollar12(row.parentElement).append(dragged);
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
      dfDollar12(ref).before(row);
    else
      dfDollar12(row.parentElement).append(row);
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
function triggerStateChange12(table, stateName, config) {
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
  apply: (table, state) => triggerStateChange12(table, state.name, state.config),
  read: (table, state) => {
    const selected = bodyRows(table).flatMap((r, i) => r.getAttribute("aria-selected") === "true" ? [i] : []);
    return {
      name: table.dataset.stateName || "default",
      config: { ...state.config, sort: table._sort ?? null, selected }
    };
  },
  markup: (el, state) => {
    enhanceHead(el);
    triggerStateChange12(el, state.name, state.config);
  }
});
df$12.tableApi = tableApi;
df$12.tableStates = tableStates;
function init12() {
  dfDollar12("table.table:not([data-init])").toArray().forEach((table) => {
    table.dataset.init = "";
    table.dataset.stateName = "default";
    table._original = bodyRows(table);
    table._sort = null;
    bindComponent(table, tableApi);
    enhanceHead(table);
    dfDollar12(table.tHead).find(".table-sort").toArray().forEach((btn) => {
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
    const pre = dfDollar12(table.tHead).find('th[aria-sort="ascending"], th[aria-sort="descending"]').get(0);
    if (pre)
      sortBy(table, pre.cellIndex, pre.getAttribute("aria-sort"));
    if (dfDollar12(table).find('.table-select input[type="checkbox"]').get(0)) {
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
    if (dfDollar12(table).find(".table-handle").get(0))
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
init12();
new MutationObserver(init12).observe(document, { childList: true, subtree: true });

// src/components/actions/toggle/toggle.ts
var df$13 = defussGlobals();
var dfDollar13 = defussQuery();
var toggleStates = ["default", "pressed"];
function applyMarkup12(toggle, stateName, defaultPressed) {
  dfDollar13(toggle).attr("aria-pressed", stateName === "pressed" ? "true" : defaultPressed);
}
function triggerStateChange13(toggle, stateName, _config) {
  applyMarkup12(toggle, stateName, toggle._defaultPressed ?? "false");
}
var toggleApi = componentState({
  component: "toggle",
  states: toggleStates,
  apply: (toggle, state) => triggerStateChange13(toggle, state.name, state.config),
  read: (toggle, state) => ({
    name: dfDollar13(toggle).attr("aria-pressed") === "true" ? "pressed" : "default",
    config: state.config
  }),
  markup: (toggle, state) => {
    const authored = state.model.attrs.find(([name]) => name === "aria-pressed");
    applyMarkup12(toggle, state.name, authored ? authored[1] : "false");
  }
});
df$13.toggleApi = toggleApi;
df$13.toggleStates = toggleStates;
function init13() {
  dfDollar13(".toggle:not([data-init]):not(.toggle-group .toggle)").each((_i, toggle) => {
    dfDollar13(toggle).data("init", "");
    toggle._defaultPressed = dfDollar13(toggle).attr("aria-pressed") || "false";
    bindComponent(toggle, toggleApi, { name: toggle._defaultPressed === "true" ? "pressed" : "default", config: {} });
    dfDollar13(toggle).on("click", () => {
      dfDollar13(toggle).attr("aria-pressed", String(dfDollar13(toggle).attr("aria-pressed") !== "true"));
    });
  });
}
init13();
new MutationObserver(init13).observe(document, { childList: true, subtree: true });

// src/components/application/window/window.ts
var df$14 = defussGlobals();
var dfDollar14 = defussQuery();
var windowStates = ["default", "maximized", "minimized", "closed"];
var topZ = 10;
var KEEP = 48;
var resolve6 = (target) => typeof target === "string" ? dfDollar14("#" + CSS.escape(target)).get(0) ?? dfDollar14(target).get(0) : target;
var titleOf2 = (w) => dfDollar14(w).find(".window-title").get(0)?.textContent?.trim() ?? "";
var posOf = (w) => ({ x: w.offsetLeft, y: w.offsetTop });
function moveTo(w, x, y, bounded = true) {
  const parent = w.offsetParent;
  const bar = dfDollar14(w).find(".window-titlebar").get(0);
  if (parent && bounded) {
    const ctl = dfDollar14(w).find(".window-controls").get(0)?.offsetWidth ?? 0;
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
var deskOf = (w) => w.parentElement?.closest(".window-manager, .window-desktop") ?? document;
function raise(w) {
  if (!w.open)
    return;
  if (w.hasAttribute("data-active") && Number(w.style.zIndex) === topZ)
    return;
  topZ += 1;
  w.style.zIndex = String(topZ);
  dfDollar14(deskOf(w)).find(".window[data-active]").toArray().forEach((o) => {
    if (o !== w && deskOf(o) === deskOf(w))
      o.removeAttribute("data-active");
  });
  w.setAttribute("data-active", "");
  w.dispatchEvent(new CustomEvent("window-focus", { bubbles: true, detail: { title: titleOf2(w) } }));
}
function showQuietly(w) {
  const prev = document.activeElement;
  w.show();
  if (prev && prev !== document.body && prev.isConnected && prev.focus)
    prev.focus({ preventScroll: true });
  else if (w.contains(document.activeElement))
    document.activeElement.blur();
}
function activateTopmost(closed) {
  const desk = deskOf(closed);
  const open = dfDollar14(desk).find(".window[open]").toArray().filter((o) => deskOf(o) === desk);
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
function applyMarkup13(el, stateName) {
  const open = stateName !== "closed";
  dfDollar14(el).attr("open", open ? "" : null);
  dfDollar14(el).attr("data-maximized", stateName === "maximized" ? "" : null);
  dfDollar14(el).attr("data-minimized", stateName === "minimized" ? "" : null);
  dfDollar14(el).find(".window-maximize").attr("aria-label", stateName === "maximized" ? "Restore" : "Maximize");
  dfDollar14(el).find(".window-minimize").attr("aria-label", stateName === "minimized" ? "Restore" : "Minimize");
}
function triggerStateChange14(w, stateName, config) {
  const maxBtn = dfDollar14(w).find(".window-maximize").get(0);
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
  dfDollar14(w).find(".window-minimize").get(0)?.setAttribute("aria-label", stateName === "minimized" ? "Restore" : "Minimize");
}
var windowApi = componentState({
  component: "window",
  states: windowStates,
  apply: (w, state) => {
    w.dataset.stateName = state.name;
    triggerStateChange14(w, state.name, state.config);
  },
  read: (w, state) => {
    const name = !w.open ? "closed" : w.dataset.stateName || "default";
    return { name, config: name === "closed" ? {} : state.config };
  },
  markup: (el, state) => applyMarkup13(el, state.name)
});
df$14.windowApi = windowApi;
df$14.windowStates = windowStates;
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
    const free = !!w.closest("[data-share]");
    const onMove = (m) => moveTo(w, start.x + m.clientX - sx, start.y + m.clientY - sy, !free);
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
function init14() {
  dfDollar14("dialog.window:not([data-init])").toArray().forEach((w) => {
    w.dataset.init = "";
    const bar = dfDollar14(w).find(":scope > .window-titlebar").get(0);
    if (bar) {
      if (!bar.hasAttribute("tabindex"))
        bar.tabIndex = 0;
      bindDrag(w, bar);
    }
    if (!w.hasAttribute("aria-labelledby") && !w.hasAttribute("aria-label")) {
      const title = dfDollar14(w).find(".window-title").get(0);
      if (title) {
        if (!title.id)
          title.id = `window-title-${Math.random().toString(36).slice(2, 8)}`;
        w.setAttribute("aria-labelledby", title.id);
      }
    }
    w.addEventListener("pointerdown", () => raise(w), true);
    w.addEventListener("focusin", () => raise(w));
    dfDollar14(w).find(".window-maximize").get(0)?.addEventListener("click", () => windowApi.setState(w, w.hasAttribute("data-maximized") ? "default" : "maximized", {}));
    dfDollar14(w).find(".window-close").get(0)?.addEventListener("click", (e) => {
      e.preventDefault();
      windowApi.setState(w, "closed", {});
    });
    dfDollar14(w).find(".window-minimize").get(0)?.addEventListener("click", () => windowApi.setState(w, w.hasAttribute("data-minimized") ? "default" : "minimized", {}));
    w.addEventListener("close", () => {
      if (w.open)
        return;
      w.dataset.stateName = "closed";
      w.removeAttribute("data-active");
      w.removeAttribute("data-maximized");
      w.removeAttribute("data-minimized");
      activateTopmost(w);
    });
    bindComponent(w, windowApi);
    const initial = !w.open ? "closed" : w.hasAttribute("data-maximized") ? "maximized" : w.hasAttribute("data-minimized") ? "minimized" : "default";
    w.dataset.stateName = initial;
    dfDollar14(w).find(".window-maximize").attr("aria-label", initial === "maximized" ? "Restore" : "Maximize");
    dfDollar14(w).find(".window-minimize").attr("aria-label", initial === "minimized" ? "Restore" : "Minimize");
    if (w.open) {
      w.style.zIndex = String(++topZ);
      dfDollar14(deskOf(w)).find(".window[data-active]").toArray().forEach((o) => {
        if (deskOf(o) === deskOf(w))
          o.removeAttribute("data-active");
      });
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
  const host = resolve6(parent) ?? dfDollar14(".window-desktop").get(0) ?? document.body;
  const w = document.createElement("dialog");
  w.className = "window";
  if (id)
    w.id = id;
  if (chrome)
    w.dataset.chrome = chrome;
  if (resizable)
    w.setAttribute("data-resizable", "");
  const count = dfDollar14(host).find(":scope > .window").toArray().length;
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
  for (const [cls, label, type] of [
    ["window-minimize", "Minimize", "button"],
    ["window-maximize", "Maximize", "button"],
    ["window-close", "Close", "submit"]
  ]) {
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
  init14();
  showQuietly(w);
  if (focus)
    windowApi.setState(w, "default", {});
  if (icon)
    globalThis.lucide?.createIcons?.();
  return w;
}
var list = (scope, all = false) => dfDollar14(resolve6(scope) ?? document).find(all ? ".window" : ".window[open]").toArray();
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
    const w = resolve6(target);
    if (w)
      windowApi.setState(w, "default", config);
    return w;
  },
  close: (target) => {
    const w = resolve6(target);
    if (w)
      windowApi.setState(w, "closed", {});
    return w;
  },
  focus: (target) => {
    const w = resolve6(target);
    if (w?.open)
      raise(w);
    return w;
  },
  move: (target, x, y, bounded = true) => {
    const w = resolve6(target);
    return w ? moveTo(w, x, y, bounded) : null;
  },
  resize: (target, width, height) => {
    const w = resolve6(target);
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
    const w = resolve6(target);
    if (w)
      windowApi.setState(w, "maximized", {});
    return w;
  },
  minimize: (target) => {
    const w = resolve6(target);
    if (w)
      windowApi.setState(w, "minimized", {});
    return w;
  },
  restore: (target) => {
    const w = resolve6(target);
    if (w)
      windowApi.setState(w, "default", {});
    return w;
  },
  toggleMaximize: (target) => {
    const w = resolve6(target);
    if (w)
      windowApi.setState(w, w.hasAttribute("data-maximized") ? "default" : "maximized", {});
    return w;
  },
  active: () => dfDollar14(".window[open][data-active]").toArray().reduce((a, b) => !a || Number(b.style.zIndex || 0) > Number(a.style.zIndex || 0) ? b : a, undefined),
  list,
  cascade,
  tile
};
df$14.win = windowActions;
init14();
new MutationObserver(init14).observe(document, { childList: true, subtree: true });

// src/components/workflows/workflow/workflow.ts
var df$15 = defussGlobals();
var dfDollar15 = defussQuery();
var workflowStates = ["default", "readonly"];
function fail(message) {
  throw new Error(message);
}
function assert(condition, message) {
  if (!condition)
    fail(message);
}
var isRecord = (v) => !!v && typeof v === "object" && !Array.isArray(v);
function text(v, field) {
  assert(typeof v === "string" && v.length > 0 && v.length <= 1e4, `Invalid ${field}`);
}
function ident(v) {
  text(v, "id");
  assert(v.length <= 200, "ID exceeds 200 characters");
}
function num3(v, field) {
  assert(typeof v === "number" && Number.isFinite(v) && Math.abs(v) <= 1e9, `Invalid ${field}`);
}
function rect(v) {
  for (const k of ["x", "y", "width", "height"])
    num3(v[k], k);
  assert(v.width >= 80 && v.height >= 40, "Invalid geometry: minimum size 80 × 40");
}
function jsonValue(value, depth = 0) {
  assert(depth <= 32, "JSON nesting exceeds 32");
  if (value === null || typeof value === "string" || typeof value === "boolean")
    return;
  if (typeof value === "number") {
    assert(Number.isFinite(value), "Non-finite JSON number");
    return;
  }
  assert(typeof value === "object", "Data must contain only JSON values");
  const proto = Object.getPrototypeOf(value);
  assert(Array.isArray(value) || proto === Object.prototype || proto === null, "Data must be plain JSON");
  for (const child of Object.values(value))
    jsonValue(child, depth + 1);
}
function validateNode(value, depth = 0) {
  assert(isRecord(value), "Invalid node");
  ident(value.id);
  text(value.type, "node type");
  text(value.title, "node title");
  rect(value);
  assert(Array.isArray(value.ports), "Ports must be an array");
  assert(value.ports.length <= 256, "At most 256 ports per node");
  const ports = new Set;
  for (const p of value.ports) {
    assert(isRecord(p), "Invalid port");
    ident(p.id);
    text(p.type, "port type");
    assert(!ports.has(p.id), `Duplicate port ${p.id}`);
    ports.add(p.id);
    assert(p.direction === "input" || p.direction === "output", "Invalid port direction");
    if (p.label !== undefined)
      text(p.label, "port label");
    if (p.optional !== undefined)
      assert(typeof p.optional === "boolean", "Invalid optional flag");
    if (p.maxConnections !== undefined)
      assert(Number.isInteger(p.maxConnections) && p.maxConnections >= 0, "Invalid port multiplicity");
    if (p.accepts !== undefined)
      assert(Array.isArray(p.accepts) && p.accepts.every((t) => typeof t === "string" && t.length), "Invalid accepted types");
  }
  assert(isRecord(value.data), "Node data must be an object");
  jsonValue(value.data);
  if (value.groupId !== undefined)
    ident(value.groupId);
  if (value.locked !== undefined)
    assert(typeof value.locked === "boolean", "Invalid locked flag");
  if (value.subgraph !== undefined) {
    assert(depth < 8, "Subworkflow nesting exceeds 8");
    validateDocument(value.subgraph, depth + 1);
  }
}
function validateEdge(value) {
  assert(isRecord(value), "Invalid edge");
  ident(value.id);
  for (const k of ["source", "target"]) {
    const e = value[k];
    assert(isRecord(e), "Invalid endpoint");
    ident(e.node);
    ident(e.port);
  }
  if (value.route !== undefined)
    assert(["bezier", "orthogonal", "straight"].includes(value.route), "Invalid route");
  if (value.points !== undefined) {
    assert(Array.isArray(value.points) && value.points.length <= 256, "Invalid reroute points");
    for (const p of value.points) {
      assert(isRecord(p), "Invalid point");
      num3(p.x, "point x");
      num3(p.y, "point y");
    }
  }
  if (value.label !== undefined)
    text(value.label, "edge label");
  if (value.color !== undefined)
    text(value.color, "edge color");
  edgeLook(value, "edge");
  if (value.type !== undefined)
    text(value.type, "edge type");
  if (value.data !== undefined) {
    assert(isRecord(value.data), "Invalid edge data");
    jsonValue(value.data);
  }
}
function edgeLook(value, what) {
  if (value.dash !== undefined)
    assert(["solid", "dashed", "dotted"].includes(value.dash), `Invalid ${what} dash`);
  if (value.width !== undefined)
    assert(typeof value.width === "number" && value.width >= 0.5 && value.width <= 12, `Invalid ${what} width (0.5 to 12)`);
  if (value.animated !== undefined)
    assert(typeof value.animated === "boolean", `Invalid ${what} animated`);
}
function validateGroup(value) {
  assert(isRecord(value), "Invalid group");
  ident(value.id);
  text(value.title, "group title");
  rect(value);
  if (value.parentId !== undefined)
    ident(value.parentId);
  if (value.collapsed !== undefined)
    assert(typeof value.collapsed === "boolean", "Invalid collapsed flag");
  if (value.color !== undefined)
    text(value.color, "group color");
}
function validateDocument(value, depth = 0) {
  assert(isRecord(value), "Invalid document");
  assert(value.schemaVersion === 1, `Unsupported schemaVersion ${String(value.schemaVersion)}`);
  ident(value.id);
  text(value.title, "document title");
  if (value.policy !== undefined)
    assert(isRecord(value.policy) && typeof value.policy.allowCycles === "boolean", "Invalid graph policy");
  for (const k of ["nodes", "edges", "groups"])
    assert(Array.isArray(value[k]), `${k} must be an array`);
  const nodes = value.nodes;
  const edges = value.edges;
  const groups = value.groups;
  assert(nodes.length <= 1e5 && edges.length <= 1e6 && groups.length <= 1e4, "Document exceeds import limits");
  const lists = [
    [nodes, (v) => validateNode(v, depth)],
    [edges, validateEdge],
    [groups, validateGroup]
  ];
  for (const [items, validate] of lists) {
    const ids = new Set;
    for (const item of items) {
      validate(item);
      const key = item.id;
      assert(!ids.has(key), `Duplicate ID ${key}`);
      ids.add(key);
    }
  }
  if (value.metadata !== undefined) {
    assert(isRecord(value.metadata), "Invalid metadata");
    jsonValue(value.metadata);
  }
  for (const key of ["inputs", "outputs"])
    if (value[key] !== undefined) {
      assert(Array.isArray(value[key]), `Invalid ${key}`);
      const ids = new Set;
      for (const port of value[key]) {
        assert(isRecord(port), "Invalid interface port");
        ident(port.id);
        text(port.type, "interface type");
        assert(!ids.has(port.id), "Duplicate interface port");
        ids.add(port.id);
        assert(isRecord(port.endpoint), "Invalid interface endpoint");
        ident(port.endpoint.node);
        ident(port.endpoint.port);
      }
    }
}
function frozen(value) {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const v of Object.values(value))
      frozen(v);
  }
  return value;
}
var uidCounter = 0;
var uid2 = (prefix = "id") => `${prefix}-${globalThis.crypto?.randomUUID?.().slice(0, 8) ?? Date.now().toString(36)}${(++uidCounter).toString(36)}`;
var emptyDocument = () => ({
  schemaVersion: 1,
  id: "workflow",
  title: "Untitled workflow",
  nodes: [],
  edges: [],
  groups: []
});
var portKey = (p) => p.node + "\x00" + p.port;
var edgeKey = (e) => e.source.node + "\x00" + e.source.port + "\x00" + e.target.node + "\x00" + e.target.port;
var capacity = (port) => port.maxConnections === 0 ? Infinity : port.maxConnections ?? (port.direction === "input" ? 1 : Infinity);

class GraphStore {
  nodes = new Map;
  edges = new Map;
  groups = new Map;
  incident = new Map;
  outbound = new Map;
  portEdges = new Map;
  signatures = new Map;
  listeners = new Set;
  past = [];
  future = [];
  header;
  version = 0;
  policy;
  constructor(document2 = emptyDocument(), policy = {}) {
    validateDocument(document2);
    this.policy = Object.freeze({
      ...policy,
      allowCycles: policy.allowCycles ?? document2.policy?.allowCycles ?? false
    });
    const copy = structuredClone(document2);
    const { nodes, edges, groups, ...header } = copy;
    this.header = frozen({ ...header, policy: { allowCycles: !!this.policy.allowCycles } });
    for (const value of nodes)
      this.validateSubgraph(value);
    for (const value of nodes)
      this.raw({ kind: "nodes", id: value.id, value: frozen(value) });
    for (const value of groups)
      this.raw({ kind: "groups", id: value.id, value: frozen(value) });
    for (const value of edges)
      this.raw({ kind: "edges", id: value.id, value: frozen(value) });
    this.validateGroups();
    this.validateInterface();
    for (const edge of this.edges.values())
      this.validateConnection(edge, false);
    if (!this.policy.allowCycles)
      this.topologicalOrder();
  }
  get title() {
    return this.header.title;
  }
  get canUndo() {
    return this.past.length > 0;
  }
  get canRedo() {
    return this.future.length > 0;
  }
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  export() {
    const byId = (a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
    return structuredClone({
      ...this.header,
      nodes: [...this.nodes.values()].sort(byId),
      edges: [...this.edges.values()].sort(byId),
      groups: [...this.groups.values()].sort(byId)
    });
  }
  edgesFor(id) {
    return this.incident.get(id) ?? new Set;
  }
  connections(endpoint) {
    return this.portEdges.get(portKey(endpoint)) ?? new Set;
  }
  index(map, key, id, add) {
    if (add) {
      let set = map.get(key);
      if (!set)
        map.set(key, set = new Set);
      set.add(id);
    } else {
      const set = map.get(key);
      set?.delete(id);
      if (!set?.size)
        map.delete(key);
    }
  }
  indexEdge(e, add) {
    this.index(this.incident, e.source.node, e.id, add);
    this.index(this.incident, e.target.node, e.id, add);
    this.index(this.portEdges, portKey(e.source), e.id, add);
    this.index(this.portEdges, portKey(e.target), e.id, add);
    this.index(this.outbound, e.source.node, e.id, add);
    this.index(this.signatures, edgeKey(e), e.id, add);
  }
  valueOf(p) {
    return p.kind === "nodes" ? this.nodes.get(p.id) : p.kind === "edges" ? this.edges.get(p.id) : this.groups.get(p.id);
  }
  raw(p) {
    if (p.kind === "edges") {
      const prev = this.edges.get(p.id);
      if (prev)
        this.indexEdge(prev, false);
      if (p.value) {
        this.edges.set(p.id, p.value);
        this.indexEdge(p.value, true);
      } else
        this.edges.delete(p.id);
    } else if (p.kind === "nodes") {
      if (p.value)
        this.nodes.set(p.id, p.value);
      else
        this.nodes.delete(p.id);
    } else if (p.value)
      this.groups.set(p.id, p.value);
    else
      this.groups.delete(p.id);
  }
  announce(label, patches, undo) {
    const event = Object.freeze({
      label,
      patches: Object.freeze(patches),
      version: ++this.version,
      undo
    });
    for (const listener of this.listeners)
      try {
        listener(event);
      } catch (e) {
        console.error("workflow: a change listener failed", e);
      }
  }
  commit(label, patches) {
    if (!patches.length)
      return;
    const unique = new Map;
    for (const p of patches) {
      assert(p.kind === "nodes" || p.kind === "edges" || p.kind === "groups", "Unknown entity");
      if (p.value) {
        if (p.kind === "nodes") {
          validateNode(p.value);
          if (p.value.subgraph !== this.nodes.get(p.id)?.subgraph)
            this.validateSubgraph(p.value);
        } else if (p.kind === "edges")
          validateEdge(p.value);
        else
          validateGroup(p.value);
        assert(p.id === p.value.id, "Patch ID mismatch");
      }
      unique.set(p.kind + "\x00" + p.id, frozen(structuredClone(p)));
    }
    const forward = [...unique.values()];
    const backward = forward.map((p) => Object.freeze({ kind: p.kind, id: p.id, value: this.valueOf(p) }));
    const affected = new Set;
    for (const p of forward) {
      if (p.kind === "nodes")
        for (const id of this.edgesFor(p.id))
          affected.add(id);
      this.raw(p);
    }
    try {
      for (const p of forward) {
        if (p.kind === "edges")
          affected.add(p.id);
        if (p.kind === "nodes") {
          for (const id of this.edgesFor(p.id))
            affected.add(id);
          const groupId = p.value?.groupId;
          if (groupId)
            assert(this.groups.has(groupId), "Missing group");
        }
      }
      if (forward.some((p) => p.kind === "groups"))
        this.validateGroups();
      this.validateInterface();
      for (const id of affected) {
        const e = this.edges.get(id);
        if (e)
          this.validateConnection(e, false);
      }
      if (!this.policy.allowCycles) {
        for (const p of forward)
          if (p.kind === "edges" && p.value)
            this.checkCycle(p.value);
      }
    } catch (e) {
      for (const p of [...backward].reverse())
        this.raw(p);
      throw e;
    }
    this.past.push({ label, forward, backward });
    this.future = [];
    if (this.past.length > (this.policy.historyLimit ?? 100))
      this.past.shift();
    this.announce(label, forward, false);
  }
  undo() {
    const entry = this.past.pop();
    if (!entry)
      return;
    for (const p of entry.backward)
      this.raw(p);
    this.future.push(entry);
    this.announce(`Undo ${entry.label}`, entry.backward, true);
  }
  redo() {
    const entry = this.future.pop();
    if (!entry)
      return;
    for (const p of entry.forward)
      this.raw(p);
    this.past.push(entry);
    this.announce(`Redo ${entry.label}`, entry.forward, true);
  }
  history() {
    return {
      changes: [...this.past, ...[...this.future].reverse()].map((e) => e.label),
      at: this.past.length
    };
  }
  travel(at) {
    const to = Math.max(0, Math.min(Math.round(at), this.past.length + this.future.length));
    while (this.past.length > to)
      this.undo();
    while (this.past.length < to && this.future.length)
      this.redo();
  }
  updateNode(id, update, label = "Update node") {
    const n = this.nodes.get(id);
    assert(n, "Unknown node");
    this.commit(label, [{ kind: "nodes", id, value: { ...n, ...update } }]);
  }
  addNode(node) {
    assert(!this.nodes.has(node.id), "Duplicate node ID");
    this.commit("Add node", [{ kind: "nodes", id: node.id, value: node }]);
  }
  connect(source, target, replaceId) {
    const edge = {
      id: replaceId ?? uid2("edge"),
      source,
      target,
      route: this.edges.get(replaceId ?? "")?.route ?? "bezier"
    };
    this.commit(replaceId ? "Reconnect" : "Connect", [{ kind: "edges", id: edge.id, value: edge }]);
    return edge.id;
  }
  canConnect(source, target, replaceId) {
    try {
      this.validateConnection({ id: replaceId ?? "\x00preview", source, target }, true);
      return;
    } catch (e) {
      return e.message;
    }
  }
  deleteNodes(ids) {
    const patches = [];
    const edgeIds = new Set;
    for (const id of ids) {
      if (this.nodes.get(id)?.locked)
        continue;
      for (const e of this.edgesFor(id))
        edgeIds.add(e);
      patches.push({ kind: "nodes", id });
    }
    this.commit("Delete nodes", [...[...edgeIds].map((id) => ({ kind: "edges", id })), ...patches]);
  }
  deleteEdge(id) {
    this.commit("Disconnect", [{ kind: "edges", id }]);
  }
  groupNodes(ids, title = "Group") {
    const nodes = [...ids].map((id) => this.nodes.get(id)).filter((n) => !!n);
    assert(nodes.length, "Select at least one node");
    const id = uid2("group");
    const x = Math.min(...nodes.map((n) => n.x)) - 30;
    const y = Math.min(...nodes.map((n) => n.y)) - 60;
    const parentId = nodes.every((n) => n.groupId && n.groupId === nodes[0].groupId) ? nodes[0].groupId : undefined;
    const group = {
      id,
      title,
      x,
      y,
      width: Math.max(...nodes.map((n) => n.x + n.width)) - x + 30,
      height: Math.max(...nodes.map((n) => n.y + n.height)) - y + 30,
      ...parentId ? { parentId } : {}
    };
    this.commit("Group nodes", [
      { kind: "groups", id, value: group },
      ...nodes.map((n) => ({ kind: "nodes", id: n.id, value: { ...n, groupId: id } }))
    ]);
    return id;
  }
  ungroup(id) {
    const parentId = this.groups.get(id)?.parentId;
    const patches = [{ kind: "groups", id }];
    const lift = (v, key) => {
      const copy = { ...v };
      if (parentId)
        copy[key] = parentId;
      else
        delete copy[key];
      return copy;
    };
    for (const n of this.nodes.values())
      if (n.groupId === id)
        patches.push({ kind: "nodes", id: n.id, value: lift(n, "groupId") });
    for (const g of this.groups.values())
      if (g.parentId === id)
        patches.push({ kind: "groups", id: g.id, value: lift(g, "parentId") });
    this.commit("Ungroup", patches);
  }
  groupMembers(id) {
    const members = [];
    for (const n of this.nodes.values()) {
      let gid = n.groupId;
      while (gid) {
        if (gid === id) {
          members.push(n);
          break;
        }
        gid = this.groups.get(gid)?.parentId;
      }
    }
    return members;
  }
  fragment(ids) {
    const selected = new Set(ids);
    const doc = emptyDocument();
    doc.nodes = [...selected].map((id) => this.nodes.get(id)).filter((n) => !!n).map((n) => {
      const copy = structuredClone(n);
      delete copy.groupId;
      return copy;
    });
    doc.edges = structuredClone([...this.edges.values()].filter((e) => selected.has(e.source.node) && selected.has(e.target.node)));
    return doc;
  }
  paste(fragment, offset = { x: 40, y: 40 }) {
    const valid = new GraphStore(fragment, this.policy);
    const remap = new Map([...valid.nodes.keys()].map((id) => [id, uid2("node")]));
    const nodes = [...valid.nodes.values()].map((n) => {
      const v = { ...n, id: remap.get(n.id), x: n.x + offset.x, y: n.y + offset.y };
      delete v.groupId;
      return v;
    });
    const edges = [...valid.edges.values()].map((e) => ({
      ...e,
      id: uid2("edge"),
      source: { ...e.source, node: remap.get(e.source.node) },
      target: { ...e.target, node: remap.get(e.target.node) },
      points: e.points?.map((p) => ({ x: p.x + offset.x, y: p.y + offset.y }))
    }));
    this.commit("Paste", [
      ...nodes.map((value) => ({ kind: "nodes", id: value.id, value })),
      ...edges.map((value) => ({ kind: "edges", id: value.id, value }))
    ]);
    return nodes.map((n) => n.id);
  }
  compatible(out, input) {
    if (this.policy.compatible)
      return this.policy.compatible(out, input);
    return out.type === input.type || out.type === "any" || input.type === "any" || !!input.accepts?.includes(out.type);
  }
  validateConnection(edge, cycle) {
    const source = this.nodes.get(edge.source.node);
    const target = this.nodes.get(edge.target.node);
    assert(source && target, `Dangling edge ${edge.id}`);
    assert(source !== target, "A node cannot connect to itself");
    const out = source.ports.find((p) => p.id === edge.source.port);
    const input = target.ports.find((p) => p.id === edge.target.port);
    assert(out?.direction === "output" && input?.direction === "input", `Invalid port direction on ${edge.id}`);
    assert(this.compatible(out, input), `Incompatible types: ${out.type} → ${input.type}`);
    for (const [endpoint, port] of [
      [edge.source, out],
      [edge.target, input]
    ]) {
      const set = this.connections(endpoint);
      const count = set.size - (set.has(edge.id) ? 1 : 0);
      assert(count < capacity(port), `Port ${port.label ?? port.id} is full`);
    }
    const duplicates = this.signatures.get(edgeKey(edge));
    assert(!duplicates || duplicates.size - (duplicates.has(edge.id) ? 1 : 0) === 0, "Duplicate connection");
    const reason = this.policy.connection?.(edge, source, target);
    assert(!reason, reason ?? "Connection rejected");
    if (cycle && !this.policy.allowCycles)
      this.checkCycle(edge);
  }
  checkCycle(edge) {
    const stack = [edge.target.node];
    const seen = new Set;
    while (stack.length) {
      const id = stack.pop();
      assert(id !== edge.source.node, "Connection would create a cycle");
      if (seen.has(id))
        continue;
      seen.add(id);
      for (const eid of this.outbound.get(id) ?? [])
        if (eid !== edge.id)
          stack.push(this.edges.get(eid).target.node);
    }
  }
  validateGroups() {
    for (const n of this.nodes.values())
      if (n.groupId)
        assert(this.groups.has(n.groupId), `Missing group ${n.groupId}`);
    for (const g of this.groups.values()) {
      const seen = new Set([g.id]);
      let p = g.parentId;
      while (p) {
        assert(!seen.has(p), "Group hierarchy cycle");
        seen.add(p);
        const parent = this.groups.get(p);
        assert(parent, `Missing group ${p}`);
        p = parent.parentId;
      }
    }
  }
  validateSubgraph(node) {
    if (!node.subgraph)
      return;
    new GraphStore(node.subgraph);
    for (const direction of ["input", "output"]) {
      const bindings = (direction === "input" ? node.subgraph.inputs : node.subgraph.outputs) ?? [];
      const ports = node.ports.filter((p) => p.direction === direction);
      assert(ports.length === bindings.length && ports.every((p) => bindings.some((b) => b.id === p.id && b.type === p.type)), `Subworkflow interface mismatch on ${node.id}`);
    }
  }
  validateInterface() {
    for (const [ports, direction] of [
      [this.header.inputs, "input"],
      [this.header.outputs, "output"]
    ])
      for (const p of ports ?? []) {
        const port = this.nodes.get(p.endpoint.node)?.ports.find((q) => q.id === p.endpoint.port);
        assert(port && port.direction === direction && port.type === p.type, `Invalid interface binding ${p.id}`);
      }
  }
  topologicalOrder() {
    const indegree = new Map([...this.nodes.keys()].map((id) => [id, 0]));
    for (const e of this.edges.values())
      indegree.set(e.target.node, indegree.get(e.target.node) + 1);
    const queue = [...indegree].filter(([, d]) => d === 0).map(([id]) => id);
    for (let i = 0;i < queue.length; i++)
      for (const eid of this.outbound.get(queue[i]) ?? []) {
        const target = this.edges.get(eid).target.node;
        const d = indegree.get(target) - 1;
        indegree.set(target, d);
        if (!d)
          queue.push(target);
      }
    assert(queue.length === this.nodes.size, "Graph contains a cycle");
    return queue;
  }
}
function workflowEngine() {
  const PORT_TOP = 52;
  const PORT_STEP = 26;
  const HEADER = 40;
  const portPosition = (node, portId) => {
    let port;
    for (const p of node.ports)
      if (p.id === portId) {
        port = p;
        break;
      }
    let row = 0;
    if (port)
      for (const p of node.ports) {
        if (p.id === portId)
          break;
        if (p.direction === port.direction)
          row++;
      }
    return { x: node.x + (port?.direction === "output" ? node.width : 0), y: node.y + PORT_TOP + row * PORT_STEP };
  };
  const contentTop = (node) => {
    let i = 0;
    let o = 0;
    for (const p of node.ports)
      if (p.direction === "input")
        i++;
      else
        o++;
    return PORT_TOP + Math.max(i, o) * PORT_STEP - 8;
  };
  const viewport = (camera, width, height, padding = 0) => ({
    x: (-camera.x - padding) / camera.zoom,
    y: (-camera.y - padding) / camera.zoom,
    width: (width + padding * 2) / camera.zoom,
    height: (height + padding * 2) / camera.zoom
  });
  const bounds = (points, padding = 0) => {
    let x = Infinity;
    let y = Infinity;
    let right = -Infinity;
    let bottom = -Infinity;
    for (const p of points) {
      if (p.x < x)
        x = p.x;
      if (p.y < y)
        y = p.y;
      if (p.x > right)
        right = p.x;
      if (p.y > bottom)
        bottom = p.y;
    }
    return { x: x - padding, y: y - padding, width: right - x + padding * 2, height: bottom - y + padding * 2 };
  };
  const intersects = (a, b) => a.x <= b.x + b.width && a.x + a.width >= b.x && a.y <= b.y + b.height && a.y + a.height >= b.y;
  const route = (edge, a, b) => {
    let points;
    let cubic = false;
    if (edge.points?.length)
      points = [a, ...edge.points, b];
    else if (edge.route === "straight")
      points = [a, b];
    else if (edge.route === "orthogonal") {
      const mid = (a.x + b.x) / 2;
      points = [a, { x: mid, y: a.y }, { x: mid, y: b.y }, b];
    } else {
      const arm = Math.max(48, Math.abs(b.x - a.x) * 0.5);
      points = [a, { x: a.x + arm, y: a.y }, { x: b.x - arm, y: b.y }, b];
      cubic = true;
    }
    return { points, cubic, box: bounds(points, 8), type: -1 };
  };
  const trace = (ctx, curve) => {
    const p = curve.points;
    ctx.moveTo(p[0].x, p[0].y);
    if (curve.cubic)
      ctx.bezierCurveTo(p[1].x, p[1].y, p[2].x, p[2].y, p[3].x, p[3].y);
    else
      for (let i = 1;i < p.length; i++)
        ctx.lineTo(p[i].x, p[i].y);
  };
  const samples = (curve) => {
    if (!curve.cubic)
      return curve.points;
    const [a, b, c, d] = curve.points;
    const result = [];
    for (let i = 0;i <= 32; i++) {
      const t = i / 32;
      const s = 1 - t;
      result.push({
        x: s * s * s * a.x + 3 * s * s * t * b.x + 3 * s * t * t * c.x + t * t * t * d.x,
        y: s * s * s * a.y + 3 * s * s * t * b.y + 3 * s * t * t * c.y + t * t * t * d.y
      });
    }
    return result;
  };
  const distanceToCurve = (point, curve) => {
    const pts = samples(curve);
    let min = Infinity;
    for (let i = 1;i < pts.length; i++) {
      const a = pts[i - 1];
      const b = pts[i];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy || 1)));
      min = Math.min(min, Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy));
    }
    return min;
  };
  const collapsedAncestor = (node, groups) => {
    let id = node.groupId;
    let collapsed;
    let guard = 0;
    while (id && guard++ < 64) {
      const g = groups.get(id);
      if (!g)
        break;
      if (g.collapsed)
        collapsed = id;
      id = g.parentId;
    }
    return collapsed;
  };
  const typeIndex = (type) => {
    if (!type || type === "any")
      return -1;
    let h = 2166136261;
    for (let i = 0;i < type.length; i++)
      h = Math.imul(h ^ type.charCodeAt(i), 16777619);
    return (h >>> 0) % 8;
  };

  class SpatialIndex {
    items;
    levels;
    constructor() {
      this.items = new Map;
      this.levels = new Map;
    }
    get size() {
      return this.items.size;
    }
    clear() {
      this.items.clear();
      this.levels.clear();
    }
    remove(id) {
      const item = this.items.get(id);
      if (!item)
        return;
      const grid = this.levels.get(item.level);
      for (const key of item.keys) {
        const cell = grid.get(key);
        cell.delete(id);
        if (!cell.size)
          grid.delete(key);
      }
      if (!grid.size)
        this.levels.delete(item.level);
      this.items.delete(id);
    }
    set(id, box) {
      this.remove(id);
      const level = Math.max(7, Math.ceil(Math.log2(Math.max(box.width, box.height, 1))));
      const size = 2 ** level;
      let grid = this.levels.get(level);
      if (!grid)
        this.levels.set(level, grid = new Map);
      const keys = [];
      for (let x = Math.floor(box.x / size);x <= Math.floor((box.x + box.width) / size); x++)
        for (let y = Math.floor(box.y / size);y <= Math.floor((box.y + box.height) / size); y++) {
          const key = x + "," + y;
          keys.push(key);
          let cell = grid.get(key);
          if (!cell)
            grid.set(key, cell = new Set);
          cell.add(id);
        }
      this.items.set(id, { box: { x: box.x, y: box.y, width: box.width, height: box.height }, level, keys });
    }
    query(box, limit = Infinity, workLimit = Infinity) {
      const seen = new Set;
      const ids = [];
      let examined = 0;
      let stopped = false;
      const visit = (cell) => {
        if (!cell)
          return;
        for (const id of cell) {
          if (seen.has(id))
            continue;
          seen.add(id);
          examined++;
          if (intersects(this.items.get(id).box, box))
            ids.push(id);
          if (ids.length >= limit || examined >= workLimit) {
            stopped = true;
            return;
          }
        }
      };
      for (const [level, grid] of this.levels) {
        const size = 2 ** level;
        const x0 = Math.floor(box.x / size);
        const x1 = Math.floor((box.x + box.width) / size);
        const y0 = Math.floor(box.y / size);
        const y1 = Math.floor((box.y + box.height) / size);
        if ((x1 - x0 + 1) * (y1 - y0 + 1) > grid.size * 2) {
          for (const [key, cell] of grid) {
            const comma = key.indexOf(",");
            const x = +key.slice(0, comma);
            const y = +key.slice(comma + 1);
            if (x >= x0 && x <= x1 && y >= y0 && y <= y1)
              visit(cell);
            if (stopped)
              break;
          }
        } else
          for (let x = x0;x <= x1 && !stopped; x++)
            for (let y = y0;y <= y1 && !stopped; y++)
              visit(grid.get(x + "," + y));
        if (stopped)
          break;
      }
      return { ids, examined, truncated: stopped };
    }
  }

  class Scene {
    nodes;
    edges;
    groups;
    nodeIndex;
    edgeIndex;
    curves;
    incident;
    members;
    constructor() {
      this.nodes = new Map;
      this.edges = new Map;
      this.groups = new Map;
      this.nodeIndex = new SpatialIndex;
      this.edgeIndex = new SpatialIndex;
      this.curves = new Map;
      this.incident = new Map;
      this.members = new Map;
    }
    load(doc) {
      this.nodes = new Map(doc.nodes.map((n) => [n.id, n]));
      this.edges = new Map(doc.edges.map((e) => [e.id, e]));
      this.groups = new Map(doc.groups.map((g) => [g.id, g]));
      this.incident.clear();
      for (const e of doc.edges)
        this.indexEdge(e, true);
      this.rebuild();
    }
    indexEdge(e, add) {
      for (const id of e.source.node === e.target.node ? [e.source.node] : [e.source.node, e.target.node]) {
        if (add) {
          let set = this.incident.get(id);
          if (!set)
            this.incident.set(id, set = new Set);
          set.add(e.id);
        } else {
          const set = this.incident.get(id);
          set?.delete(e.id);
          if (!set?.size)
            this.incident.delete(id);
        }
      }
    }
    node(id) {
      const n = this.nodes.get(id);
      this.nodeIndex.remove(id);
      if (n && !collapsedAncestor(n, this.groups))
        this.nodeIndex.set(id, n);
    }
    edge(id) {
      this.edgeIndex.remove(id);
      this.curves.delete(id);
      const e = this.edges.get(id);
      if (!e)
        return;
      const a = this.nodes.get(e.source.node);
      const b = this.nodes.get(e.target.node);
      if (!a || !b)
        return;
      const ga = collapsedAncestor(a, this.groups);
      const gb = collapsedAncestor(b, this.groups);
      if (ga && ga === gb)
        return;
      const proxy = (gid, output) => {
        const g = this.groups.get(gid);
        return { x: g.x + (output ? 240 : 0), y: g.y + 28 };
      };
      const curve = route(e, ga ? proxy(ga, true) : portPosition(a, e.source.port), gb ? proxy(gb, false) : portPosition(b, e.target.port));
      let type = "any";
      for (const p of a.ports)
        if (p.id === e.source.port) {
          type = p.type;
          break;
        }
      curve.type = typeIndex(type);
      this.curves.set(id, curve);
      this.edgeIndex.set(id, curve.box);
    }
    rebuild() {
      this.members.clear();
      for (const n of this.nodes.values()) {
        let id = n.groupId;
        let guard = 0;
        while (id && guard++ < 64) {
          let members = this.members.get(id);
          if (!members)
            this.members.set(id, members = new Set);
          members.add(n.id);
          id = this.groups.get(id)?.parentId;
        }
      }
      this.nodeIndex.clear();
      this.edgeIndex.clear();
      this.curves.clear();
      for (const id of this.nodes.keys())
        this.node(id);
      for (const id of this.edges.keys())
        this.edge(id);
    }
    patch(patches) {
      const nodes = new Set;
      const edges = new Set;
      const movedGroups = new Set;
      let groups = false;
      for (const p of patches) {
        if (p.kind === "nodes") {
          if (this.nodes.get(p.id)?.groupId !== p.value?.groupId)
            groups = true;
          if (p.value)
            this.nodes.set(p.id, p.value);
          else
            this.nodes.delete(p.id);
          nodes.add(p.id);
        } else if (p.kind === "groups") {
          const old = this.groups.get(p.id);
          if (!old || !p.value || old.collapsed !== p.value.collapsed || old.parentId !== p.value.parentId)
            groups = true;
          else
            movedGroups.add(p.id);
          if (p.value)
            this.groups.set(p.id, p.value);
          else
            this.groups.delete(p.id);
        } else {
          const old = this.edges.get(p.id);
          if (old)
            this.indexEdge(old, false);
          if (p.value) {
            this.edges.set(p.id, p.value);
            this.indexEdge(p.value, true);
          } else
            this.edges.delete(p.id);
          edges.add(p.id);
        }
      }
      if (groups) {
        this.rebuild();
        return;
      }
      for (const id of movedGroups)
        for (const member of this.members.get(id) ?? [])
          for (const eid of this.incident.get(member) ?? [])
            edges.add(eid);
      for (const id of nodes) {
        this.node(id);
        for (const eid of this.incident.get(id) ?? [])
          edges.add(eid);
      }
      for (const id of edges)
        this.edge(id);
    }
    hit(point, tolerance) {
      const query = this.edgeIndex.query({ x: point.x - tolerance, y: point.y - tolerance, width: tolerance * 2, height: tolerance * 2 }, 2000, 1e4);
      let best;
      let min = tolerance;
      for (const id of query.ids) {
        const d = distanceToCurve(point, this.curves.get(id));
        if (d < min) {
          min = d;
          best = id;
        }
      }
      return best;
    }
    draw(ctx, f) {
      const start = performance.now();
      const c = f.camera;
      const p = f.palette;
      ctx.setTransform(f.dpr, 0, 0, f.dpr, 0, 0);
      ctx.clearRect(0, 0, f.width, f.height);
      ctx.setTransform(f.dpr * c.zoom, 0, 0, f.dpr * c.zoom, f.dpr * c.x, f.dpr * c.y);
      const box = viewport(c, f.width, f.height, 50);
      const eq = this.edgeIndex.query(box, f.maxEdges, f.maxEdges * 6);
      const tiny = c.zoom < 0.12;
      const nodeLimit = tiny ? f.maxNodes * 10 : f.maxNodes;
      const nq = this.nodeIndex.query(box, nodeLimit, nodeLimit * 6);
      if (f.edgeSelection && this.curves.has(f.edgeSelection) && !eq.ids.includes(f.edgeSelection)) {
        if (eq.ids.length >= f.maxEdges)
          eq.ids.pop();
        eq.ids.unshift(f.edgeSelection);
      }
      const selected = new Set(f.selection);
      const hot = new Set;
      if (selected.size && selected.size <= 64)
        for (const id of selected)
          for (const eid of this.incident.get(id) ?? [])
            hot.add(eid);
      const batches = new Map;
      for (const id of eq.ids) {
        if (id === f.edgeSelection || hot.has(id))
          continue;
        const e = this.edges.get(id);
        const curve = this.curves.get(id);
        const color = e.color ?? (curve.type >= 0 ? p.types[curve.type] : p.edge);
        const dash = e.dash ?? "solid";
        const width = e.width ?? 1.75;
        const key = color + "|" + dash + "|" + width;
        let batch = batches.get(key);
        if (!batch)
          batches.set(key, batch = { color, dash, width, ids: [] });
        batch.ids.push(id);
      }
      const px = 1 / c.zoom;
      ctx.lineCap = "round";
      ctx.globalAlpha = c.zoom < 0.2 ? 0.4 : c.zoom < 0.5 ? 0.6 : 0.85;
      for (const batch of batches.values()) {
        const w = Math.max(1, batch.width * px);
        ctx.strokeStyle = batch.color;
        ctx.lineWidth = w;
        const b = Math.max(1, batch.width);
        ctx.setLineDash(batch.dash === "dashed" ? [Math.max(6, b * 3) * px, Math.max(5, b * 2.5) * px] : batch.dash === "dotted" ? [0.01, Math.max(4, b * 2.5) * px] : []);
        ctx.beginPath();
        for (const id of batch.ids)
          trace(ctx, this.curves.get(id));
        ctx.stroke();
      }
      ctx.setLineDash([]);
      ctx.globalAlpha = 1;
      if (hot.size) {
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = Math.max(1.5, 2.25 * px);
        ctx.beginPath();
        for (const id of hot) {
          const curve = this.curves.get(id);
          if (curve && id !== f.edgeSelection)
            trace(ctx, curve);
        }
        ctx.stroke();
      }
      if (f.edgeSelection && this.curves.has(f.edgeSelection)) {
        ctx.strokeStyle = p.accent;
        ctx.lineWidth = Math.max(2, 3.5 * px);
        ctx.beginPath();
        trace(ctx, this.curves.get(f.edgeSelection));
        ctx.stroke();
      }
      const dom = new Set(f.domIds);
      const radius = Math.min(p.radius, 12);
      const font = f.dpr * c.zoom >= 0.18;
      const titleSize = Math.max(13, 11 / c.zoom);
      let fontSize = 0;
      ctx.textBaseline = "middle";
      if (tiny) {
        const boxes = new Map;
        for (const id of nq.ids) {
          if (dom.has(id))
            continue;
          const n = this.nodes.get(id);
          const color = selected.has(id) ? p.accent : n.accent ?? p.muted;
          let list = boxes.get(color);
          if (!list)
            boxes.set(color, list = []);
          list.push(n);
        }
        for (const [color, list] of boxes) {
          ctx.fillStyle = color;
          ctx.beginPath();
          for (const n of list)
            ctx.rect(n.x, n.y, n.width, n.height);
          ctx.fill();
        }
      }
      for (const id of tiny ? [] : nq.ids) {
        if (dom.has(id))
          continue;
        const n = this.nodes.get(id);
        const accent = n.accent ?? p.muted;
        const h = n.height;
        const size = Math.min(titleSize, h * 0.6 / 1.7);
        const band = Math.max(HEADER, size * 1.7);
        ctx.fillStyle = p.node;
        ctx.strokeStyle = selected.has(id) ? p.accent : p.border;
        ctx.lineWidth = (selected.has(id) ? 2.5 : 1) * px;
        ctx.beginPath();
        ctx.roundRect(n.x, n.y, n.width, h, radius);
        ctx.fill();
        ctx.stroke();
        ctx.save();
        ctx.beginPath();
        ctx.roundRect(n.x, n.y, n.width, band, [radius, radius, 0, 0]);
        ctx.clip();
        ctx.globalAlpha = 0.16;
        ctx.fillStyle = accent;
        ctx.fillRect(n.x, n.y, n.width, band);
        ctx.globalAlpha = 1;
        ctx.fillRect(n.x, n.y, Math.max(4, 3 / c.zoom), band);
        ctx.restore();
        if (n.status && n.status !== "idle") {
          ctx.fillStyle = p.status[n.status] ?? p.muted;
          ctx.fillRect(n.x, n.y + h - 4, n.width, 4);
        }
        if (font) {
          if (fontSize !== size)
            ctx.font = `600 ${fontSize = size}px ${p.font}`;
          const pad = Math.max(14, size * 0.9);
          const fits = Math.max(1, Math.floor((n.width - pad * 2) / (size * 0.58)));
          ctx.fillStyle = p.text;
          ctx.fillText(n.title.length > fits ? n.title.slice(0, Math.max(1, fits - 1)) + "…" : n.title, n.x + pad, n.y + band / 2, n.width - pad * 2);
        }
        if (c.zoom >= 0.35)
          for (const port of n.ports) {
            const pos = portPosition(n, port.id);
            const t = typeIndex(port.type);
            ctx.beginPath();
            ctx.fillStyle = t >= 0 ? p.types[t] : p.muted;
            ctx.arc(pos.x, pos.y, 5, 0, Math.PI * 2);
            ctx.fill();
          }
      }
      return {
        frame: f.id,
        drawMs: performance.now() - start,
        edges: eq.ids.length,
        nodes: nq.ids.length,
        edgeBudget: f.maxEdges,
        edgesTruncated: eq.truncated
      };
    }
  }
  const layeredLayout = (doc, gap = { x: 100, y: 48 }) => {
    const indegree = new Map(doc.nodes.map((n) => [n.id, 0]));
    const outgoing = new Map;
    const level = new Map;
    for (const e of doc.edges) {
      indegree.set(e.target.node, (indegree.get(e.target.node) ?? 0) + 1);
      const out = outgoing.get(e.source.node) ?? [];
      out.push(e.target.node);
      outgoing.set(e.source.node, out);
    }
    const queue = doc.nodes.filter((n) => indegree.get(n.id) === 0).map((n) => n.id);
    for (const id of queue)
      level.set(id, 0);
    for (let i = 0;i < queue.length; i++)
      for (const target of outgoing.get(queue[i]) ?? []) {
        level.set(target, Math.max(level.get(target) ?? 0, level.get(queue[i]) + 1));
        const count = indegree.get(target) - 1;
        indegree.set(target, count);
        if (!count)
          queue.push(target);
      }
    let max = 0;
    for (const value of level.values())
      max = Math.max(max, value);
    for (const [id, degree] of indegree)
      if (degree > 0)
        level.set(id, max + 1);
    const columns = new Map;
    for (const n of doc.nodes) {
      const l = level.get(n.id);
      let col = columns.get(l);
      if (!col)
        columns.set(l, col = []);
      col.push(n);
    }
    const sources = new Map;
    for (const e of doc.edges) {
      const list = sources.get(e.target.node) ?? [];
      list.push(e.source.node);
      sources.set(e.target.node, list);
    }
    const rowOf = new Map;
    const widths = new Map;
    const levels = [...columns.keys()].sort((a, b) => a - b);
    for (const l of levels) {
      const col = columns.get(l);
      if (l > 0)
        col.sort((a, b) => {
          const mean = (n) => {
            const s = (sources.get(n.id) ?? []).map((id) => rowOf.get(id)).filter((r) => r !== undefined);
            return s.length ? s.reduce((x, y) => x + y, 0) / s.length : Infinity;
          };
          return mean(a) - mean(b);
        });
      col.forEach((n, i) => rowOf.set(n.id, i));
      widths.set(l, Math.max(...col.map((n) => n.width)));
    }
    const result = [];
    let x = 0;
    for (const l of levels) {
      let y = 0;
      for (const n of columns.get(l)) {
        result.push([n.id, { x, y }]);
        y += n.height + gap.y;
      }
      x += widths.get(l) + gap.x;
    }
    return result;
  };
  return {
    PORT_TOP,
    PORT_STEP,
    HEADER,
    portPosition,
    contentTop,
    viewport,
    bounds,
    intersects,
    route,
    distanceToCurve,
    collapsedAncestor,
    typeIndex,
    SpatialIndex,
    Scene,
    layeredLayout
  };
}
function workflowWorker(self, engineFactory) {
  const engine = engineFactory();
  const scene = new engine.Scene;
  let canvas;
  self.onmessage = (event) => {
    const m = event.data;
    try {
      if (m.type === "load")
        scene.load(m.doc);
      else if (m.type === "patch")
        scene.patch(m.patches);
      else if (m.type === "hit")
        self.postMessage({ type: "hit", id: m.id, edge: scene.hit(m.point, m.tolerance) });
      else if (m.type === "layout")
        self.postMessage({ type: "layout", id: m.id, positions: engine.layeredLayout(m.doc) });
      else if (m.type === "frame") {
        const f = m.frame;
        const w = Math.max(1, Math.round(f.width * f.dpr));
        const h = Math.max(1, Math.round(f.height * f.dpr));
        if (!canvas)
          canvas = new OffscreenCanvas(w, h);
        if (canvas.width !== w)
          canvas.width = w;
        if (canvas.height !== h)
          canvas.height = h;
        const ctx = canvas.getContext("2d");
        if (!ctx)
          throw new Error("OffscreenCanvas 2D is unavailable");
        const start = performance.now();
        const stats = scene.draw(ctx, f);
        const bitmap = canvas.transferToImageBitmap();
        stats.rasterMs = performance.now() - start;
        self.postMessage({ type: "frame", frame: f, stats, bitmap }, [bitmap]);
      }
    } catch (error) {
      self.postMessage({ type: "error", id: m?.id, message: error.message });
    }
  };
}
var ENGINE = workflowEngine();
var workerSource = "";
function startWorker(name) {
  if (typeof Worker === "undefined" || typeof OffscreenCanvas === "undefined")
    return null;
  try {
    workerSource ||= URL.createObjectURL(new Blob([`(${workflowWorker.toString()})(self, ${workflowEngine.toString()});`], { type: "text/javascript" }));
    return new Worker(workerSource, { name });
  } catch {
    return null;
  }
}

class EdgeRenderer {
  document;
  present;
  mode = "main";
  canvas;
  worker = null;
  scene = null;
  inFlight = false;
  next = null;
  timer;
  dead = false;
  hitId = 0;
  waits = new Map;
  constructor(canvas, document2, present, useWorker) {
    this.document = document2;
    this.present = present;
    this.canvas = canvas;
    const worker = useWorker ? startWorker("defuss-workflow") : null;
    if (!worker) {
      this.fallback();
      return;
    }
    this.worker = worker;
    this.mode = "worker";
    worker.onmessage = (event) => this.message(event.data);
    worker.onerror = () => this.fallback();
    worker.postMessage({ type: "load", doc: this.document() });
  }
  message(m) {
    if (m.type === "error") {
      if (m.id && this.waits.has(m.id)) {
        this.waits.get(m.id)(NO_ANSWER);
        this.waits.delete(m.id);
      } else
        this.fallback();
      return;
    }
    if (m.type === "hit" || m.type === "layout") {
      this.waits.get(m.id)?.(m.type === "hit" ? m.edge : m.positions);
      this.waits.delete(m.id);
      return;
    }
    if (m.type !== "frame")
      return;
    clearTimeout(this.timer);
    this.inFlight = false;
    if (this.dead) {
      m.bitmap.close();
      return;
    }
    this.resize(m.frame);
    const ctx = this.canvas.getContext("bitmaprenderer");
    if (ctx)
      ctx.transferFromImageBitmap(m.bitmap);
    else
      m.bitmap.close();
    this.present(m.frame, m.stats, "worker");
    const next = this.next;
    this.next = null;
    if (next && next.id !== m.frame.id)
      this.draw(next);
  }
  fallback() {
    if (this.dead)
      return;
    this.worker?.terminate();
    this.worker = null;
    clearTimeout(this.timer);
    this.inFlight = false;
    if (this.mode === "worker") {
      const fresh = this.canvas.ownerDocument.createElement("canvas");
      fresh.className = this.canvas.className;
      this.canvas.replaceWith(fresh);
      this.canvas = fresh;
    }
    this.mode = "main";
    this.scene = new ENGINE.Scene;
    this.scene.load(this.document());
    for (const resolve of this.waits.values())
      resolve(NO_ANSWER);
    this.waits.clear();
    if (this.next)
      this.draw(this.next);
  }
  load(doc) {
    if (this.dead)
      return;
    if (this.worker)
      this.worker.postMessage({ type: "load", doc });
    else
      this.scene.load(doc);
  }
  patch(patches) {
    if (this.dead || !patches.length)
      return;
    if (this.worker)
      this.worker.postMessage({ type: "patch", patches });
    else
      this.scene.patch(patches);
  }
  draw(frame) {
    if (this.dead)
      return;
    this.next = frame;
    if (this.worker) {
      if (this.inFlight)
        return;
      this.inFlight = true;
      this.next = null;
      this.worker.postMessage({ type: "frame", frame });
      this.timer = setTimeout(() => this.fallback(), 1e4);
    } else {
      this.next = null;
      this.resize(frame);
      const stats = this.scene.draw(this.canvas.getContext("2d"), frame);
      this.present(frame, stats, "main");
    }
  }
  resize(f) {
    const w = Math.max(1, Math.round(f.width * f.dpr));
    const h = Math.max(1, Math.round(f.height * f.dpr));
    if (this.canvas.width !== w)
      this.canvas.width = w;
    if (this.canvas.height !== h)
      this.canvas.height = h;
  }
  ask(message, timeout) {
    return new Promise((resolve) => {
      const id = ++this.hitId;
      this.waits.set(id, resolve);
      this.worker.postMessage({ ...message, id });
      setTimeout(() => {
        if (this.waits.delete(id))
          resolve(NO_ANSWER);
      }, timeout);
    });
  }
  hit(point, tolerance) {
    if (this.dead)
      return Promise.resolve(null);
    if (!this.worker)
      return Promise.resolve(this.scene.hit(point, tolerance));
    return this.ask({ type: "hit", point, tolerance }, 1e4).then((answer) => answer === NO_ANSWER ? null : answer);
  }
  destroy() {
    this.dead = true;
    this.worker?.terminate();
    clearTimeout(this.timer);
    for (const resolve of this.waits.values())
      resolve(NO_ANSWER);
    this.waits.clear();
  }
}
function layoutPositions(doc, signal) {
  if (signal?.aborted)
    return Promise.reject(new Error("Layout cancelled"));
  const worker = startWorker("defuss-workflow-layout");
  if (!worker)
    return Promise.resolve(ENGINE.layeredLayout(doc));
  return new Promise((resolve, reject) => {
    const finish = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      worker.terminate();
    };
    const abort = () => {
      finish();
      reject(new Error("Layout cancelled"));
    };
    const timer = setTimeout(() => {
      finish();
      reject(new Error("Layout timed out"));
    }, 30000);
    signal?.addEventListener("abort", abort, { once: true });
    worker.onerror = () => {
      finish();
      resolve(ENGINE.layeredLayout(doc));
    };
    worker.onmessage = (e) => {
      finish();
      if (e.data.type === "error")
        reject(new Error(e.data.message));
      else
        resolve(e.data.positions);
    };
    worker.postMessage({ type: "layout", id: 1, doc });
  });
}
function layoutPatches(doc, positions) {
  if (doc.nodes.some((n) => n.locked))
    throw new Error("Unlock nodes before arranging");
  const nodes = doc.nodes.map((n) => ({ ...n, ...positions.get(n.id) }));
  const groups = new Map(doc.groups.map((g) => [g.id, g]));
  const points = new Map;
  for (const n of nodes) {
    let gid = n.groupId;
    while (gid) {
      const pts = points.get(gid) ?? [];
      pts.push({ x: n.x - 30, y: n.y - 60 }, { x: n.x + n.width + 30, y: n.y + n.height + 30 });
      points.set(gid, pts);
      gid = groups.get(gid)?.parentId;
    }
  }
  return [
    ...nodes.map((value) => ({ kind: "nodes", id: value.id, value })),
    ...doc.groups.map((g) => ({
      kind: "groups",
      id: g.id,
      value: points.has(g.id) ? { ...g, ...ENGINE.bounds(points.get(g.id)) } : g
    })),
    ...doc.edges.filter((e) => e.points?.length).map((e) => ({ kind: "edges", id: e.id, value: { ...e, points: [] } }))
  ];
}
var ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
var esc4 = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
var fmt = (n) => Number(n).toLocaleString("en-US");
var clamp3 = (v, a, b) => Math.max(a, Math.min(b, v));
var MIN_ZOOM = 0.025;
var MAX_ZOOM = 3;
var CARD_ZOOM = 0.55;
var NO_ANSWER = Symbol("no answer");
function capture(el, pointerId) {
  try {
    el.setPointerCapture(pointerId);
  } catch {}
}
var SAFE_IMAGE = /^(?:https?:|data:image\/|blob:|\.{0,2}\/|[\w-]+\/)/i;
var ICONS = {
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  minus: '<path d="M5 12h14"/>',
  fit: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/>',
  edit: '<path d="M7 7h10v10"/><path d="M7 17 17 7"/>',
  map: '<path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z"/><path d="M15 5.764v15"/><path d="M9 3.236v15"/>'
};
var icon = (name) => `<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] ?? ""}</svg>`;
var accentOf = (color) => !color ? undefined : /^chart-[1-5]$/.test(color) ? `var(--${color})` : color;
var globalTypes = new Map;
var globalEdgeTypes = new Map;
function checkEdgeType(definition) {
  assert(isRecord(definition), "Invalid connection type");
  text(definition.type, "connection type");
  assert(definition.type.length > 0, "A connection type needs a name");
  if (definition.color !== undefined)
    text(definition.color, "connection type color");
  edgeLook(definition, "connection type");
  if (definition.render !== undefined)
    assert(typeof definition.render === "function", "A connection type render must be a function");
  return definition;
}
var FIELD_KINDS = [
  "text",
  "textarea",
  "number",
  "select",
  "slider",
  "checkbox",
  "switch",
  "color",
  "image",
  "output",
  "value"
];
var customEditor = (f) => !!f.edit || f.editor === "external";
var showsValue = (f) => customEditor(f) || !!f.render || f.kind === "value" || f.kind === "output" || f.kind === "image";
function checkType(definition) {
  assert(isRecord(definition), "Invalid node type");
  text(definition.type, "node type name");
  text(definition.label, "node type label");
  assert(Array.isArray(definition.ports), "A node type needs ports");
  validateNode({
    id: "probe",
    type: definition.type,
    title: definition.label,
    x: 0,
    y: 0,
    width: 260,
    height: 200,
    ports: definition.ports,
    data: definition.defaults ?? {}
  });
  for (const f of definition.fields ?? []) {
    assert(isRecord(f), "Invalid field");
    text(f.key, "field key");
    assert(FIELD_KINDS.includes(f.kind), `Unknown field kind ${String(f.kind)}`);
    assert(f.editor === undefined || f.editor === "inline" || f.editor === "external", "Invalid field editor");
    assert(f.height === undefined || typeof f.height === "number" && f.height > 0, "Invalid field height");
    for (const hook of ["edit", "render", "renderLabel"])
      assert(f[hook] === undefined || typeof f[hook] === "function", `A field's ${hook} must be a function`);
  }
  assert(definition.layout === undefined || definition.layout === "controls" || definition.layout === "list", "Invalid node layout");
  return {
    ...definition,
    ports: structuredClone(definition.ports),
    defaults: structuredClone(definition.defaults ?? {})
  };
}
var fieldHeight = (f, layout = "controls") => f.height ?? (f.kind === "image" ? 150 : layout === "list" ? 50 : f.kind === "value" ? 78 : controlHeight(f));
var controlHeight = (f) => f.kind === "textarea" ? 46 + 20 * (f.rows ?? 3) : f.kind === "image" ? 150 : f.kind === "output" ? 72 : f.kind === "checkbox" || f.kind === "switch" ? 34 : 62;
function createNode(definition, at, layout = "controls") {
  const node = {
    id: uid2("node"),
    type: definition.type,
    title: definition.label,
    x: Math.round(at.x),
    y: Math.round(at.y),
    width: definition.width ?? 260,
    height: 100,
    ports: structuredClone(definition.ports),
    data: structuredClone(definition.defaults ?? {})
  };
  const fields = (definition.fields ?? []).reduce((h, f) => h + fieldHeight(f, definition.layout ?? layout), 0);
  node.height = definition.height ?? Math.max(120, ENGINE.contentTop(node) + 20 + (fields || 48));
  return node;
}
function changedSince() {
  let last;
  return (node, runtime, readonly) => {
    const same = last && last[2] === runtime && last[3] === node.title && last[4] === readonly && (last[0] === node.data || last[1] === JSON.stringify(node.data));
    if (same) {
      last[0] = node.data;
      return false;
    }
    last = [node.data, JSON.stringify(node.data), runtime, node.title, readonly];
    return true;
  };
}
var outputOf = (runtime) => runtime.output && typeof runtime.output === "object" && !Array.isArray(runtime.output) ? runtime.output : null;
function fieldValue(field, node, runtime) {
  const out = outputOf(runtime);
  if (field.kind === "output")
    return out?.[field.key];
  if (field.kind === "image")
    return out?.[field.key] ?? node.data[field.key];
  return node.data[field.key];
}
function put2(el, content) {
  if (content === null || content === undefined)
    return false;
  dfDollar15(el).empty();
  if (typeof content === "string")
    el.textContent = content;
  else
    el.append(content);
  return true;
}
function defaultLabel(el, field) {
  dfDollar15(el).empty();
  el.append(el.ownerDocument.createTextNode(field.label ?? field.key));
  if (!customEditor(field))
    return;
  const mark = el.ownerDocument.createElement("span");
  mark.className = "workflow-field-edit-icon";
  mark.setAttribute("aria-hidden", "true");
  dfDollar15(mark).html(icon("edit"));
  el.append(mark);
}
function summary(value) {
  if (value === undefined || value === null)
    return "";
  if (typeof value !== "object")
    return String(value);
  const short = (v) => v === null || typeof v !== "object" ? String(v) : Array.isArray(v) ? `[${v.length}]` : "{…}";
  const text = Array.isArray(value) ? `${value.length} ${value.length === 1 ? "item" : "items"}: ${value.slice(0, 4).map(short).join(", ")}` : Object.entries(value).slice(0, 6).map(([k, v]) => `${k}: ${short(v)}`).join(" · ");
  return text.length > 140 ? text.slice(0, 139) + "…" : text;
}
function defaultValueView(el, field, value) {
  const doc = el.ownerDocument;
  const empty = value === undefined || value === null || value === "";
  el.dataset.empty = String(empty);
  if (field.kind === "image") {
    const src = String(value ?? "");
    if (!SAFE_IMAGE.test(src)) {
      dfDollar15(el).empty();
      el.dataset.empty = "true";
      el.textContent = "No picture yet";
      return;
    }
    let img = dfDollar15(el).children("img").get(0);
    if (!img) {
      dfDollar15(el).empty();
      img = doc.createElement("img");
      img.className = "workflow-image";
      img.alt = field.label ?? field.key;
      img.decoding = "async";
      img.loading = "lazy";
      el.append(img);
    }
    if (img.getAttribute("src") !== src)
      img.setAttribute("src", src);
    return;
  }
  dfDollar15(el).empty();
  if (empty) {
    el.textContent = field.kind === "output" ? "—" : "Not set";
    return;
  }
  if (field.kind === "color" && typeof value === "string") {
    const swatch = doc.createElement("i");
    swatch.className = "workflow-field-swatch";
    swatch.style.background = value;
    swatch.setAttribute("aria-hidden", "true");
    el.append(swatch, doc.createTextNode(value));
    return;
  }
  el.textContent = typeof value === "string" ? value : field.kind === "output" ? JSON.stringify(value) : summary(value);
}
function fieldsView(host, node, fields, fh, idBase) {
  const doc = host.ownerDocument;
  const entries = [];
  const off = new AbortController;
  const signal = off.signal;
  fields.forEach((field, i) => {
    const wrap = doc.createElement("div");
    wrap.className = "workflow-field";
    wrap.dataset.kind = field.kind;
    wrap.dataset.key = field.key;
    const id = `${idBase}-${i}-${field.key}`.replace(/[^\w-]/g, "_");
    const commit = (value) => fh.write({ [field.key]: value });
    if (showsValue(field)) {
      const label = doc.createElement("span");
      label.className = "label workflow-field-label";
      label.id = `${id}-label`;
      const value = doc.createElement("div");
      value.className = field.kind === "output" && !field.render ? "workflow-field-value workflow-output" : "workflow-field-value";
      value.id = id;
      if (customEditor(field)) {
        wrap.dataset.customEditor = "";
        value.setAttribute("role", "button");
        value.tabIndex = 0;
        value.setAttribute("aria-haspopup", "dialog");
        value.setAttribute("aria-labelledby", label.id);
        value.dataset.workflowFieldEdit = field.key;
        const open = () => {
          if (!fh.readonly())
            fh.edit(field.key);
        };
        value.addEventListener("click", open, { signal });
        value.addEventListener("keydown", (e) => {
          if (e.key !== "Enter" && e.key !== " ")
            return;
          e.preventDefault();
          open();
        }, { signal });
      }
      wrap.append(label, value);
      host.append(wrap);
      entries.push({ field, label, el: value, shows: true });
      return;
    }
    const label = doc.createElement("label");
    label.className = "label";
    label.htmlFor = id;
    let el;
    let readout;
    if (field.kind === "textarea") {
      const t = doc.createElement("textarea");
      t.className = "textarea";
      t.rows = field.rows ?? 3;
      if (field.placeholder)
        t.placeholder = field.placeholder;
      t.addEventListener("change", () => commit(t.value), { signal });
      el = t;
    } else if (field.kind === "select") {
      const sel = doc.createElement("select");
      sel.className = "select";
      for (const option of field.options ?? []) {
        const o = doc.createElement("option");
        o.value = o.textContent = option;
        sel.append(o);
      }
      sel.addEventListener("change", () => commit(sel.value), { signal });
      el = sel;
    } else {
      const input = doc.createElement("input");
      if (field.kind === "number" || field.kind === "slider") {
        if (field.kind === "slider") {
          input.type = "range";
          input.className = "slider";
        } else {
          input.type = "number";
          input.className = "input";
        }
        if (field.min !== undefined)
          input.min = String(field.min);
        if (field.max !== undefined)
          input.max = String(field.max);
        if (field.step !== undefined)
          input.step = String(field.step);
        input.addEventListener("change", () => commit(input.valueAsNumber), { signal });
        if (field.kind === "slider") {
          readout = doc.createElement("output");
          readout.className = "workflow-readout";
          input.addEventListener("input", () => readout.textContent = input.value, { signal });
        }
      } else if (field.kind === "checkbox" || field.kind === "switch") {
        input.type = "checkbox";
        input.className = "checkbox";
        if (field.kind === "switch") {
          input.className = "switch";
          input.setAttribute("role", "switch");
        }
        input.addEventListener("change", () => commit(input.checked), { signal });
      } else if (field.kind === "color") {
        input.type = "color";
        input.className = "workflow-color";
        input.addEventListener("change", () => commit(input.value), { signal });
      } else {
        input.type = "text";
        input.className = "input";
        if (field.placeholder)
          input.placeholder = field.placeholder;
        input.addEventListener("change", () => commit(input.value), { signal });
      }
      el = input;
    }
    el.id = id;
    if (field.kind === "checkbox" || field.kind === "switch") {
      wrap.classList.add("workflow-field-row");
      wrap.append(el, label);
    } else if (readout) {
      const head = doc.createElement("div");
      head.className = "workflow-field-head";
      head.append(label, readout);
      wrap.append(head, el);
    } else
      wrap.append(label, el);
    host.append(wrap);
    entries.push({ field, label, el, readout });
  });
  const changed = changedSince();
  const view = {
    update(n, runtime) {
      if (!changed(n, runtime, fh.readonly()))
        return;
      for (const entry of entries) {
        const { field, el, readout } = entry;
        const value = fieldValue(field, n, runtime);
        const ctx = fh.context(field, n, runtime);
        if (!put2(entry.label, field.renderLabel?.(value, ctx)))
          defaultLabel(entry.label, field);
        if (entry.shows) {
          if (customEditor(field))
            el.setAttribute("aria-disabled", String(ctx.readonly));
          if (field.render) {
            if (put2(el, field.render(value, ctx))) {
              el.dataset.empty = "false";
              entry.shown = undefined;
              continue;
            }
          }
          const key = JSON.stringify(value ?? null);
          if (entry.shown !== key)
            defaultValueView(el, field, value);
          entry.shown = key;
          continue;
        }
        if (el === doc.activeElement)
          continue;
        const input = el;
        if (field.kind === "checkbox" || field.kind === "switch")
          input.checked = value === true;
        else
          input.value = value === undefined || value === null ? "" : String(value);
        if (readout)
          readout.textContent = input.value;
      }
    },
    destroy() {
      off.abort();
      dfDollar15(host).empty();
    }
  };
  view.update(node, IDLE);
  return view;
}
function gridConfig(field) {
  const conf = { displayName: field.label ?? field.key };
  if (showsValue(field))
    return { ...conf, type: "json", readOnly: true };
  if (field.kind === "select")
    return { ...conf, type: "enum", options: field.options ?? [] };
  if (field.kind === "number" || field.kind === "slider")
    return { ...conf, type: "number", min: field.min, max: field.max, step: field.step };
  if (field.kind === "checkbox" || field.kind === "switch")
    return { ...conf, type: "boolean" };
  if (field.kind === "color")
    return { ...conf, type: "color" };
  return { ...conf, type: field.kind === "textarea" ? "text" : "string" };
}
function listView(host, node, fields, fh) {
  const pg = df$15.propertyGrid;
  const configure = pg?.configure;
  if (!configure)
    return null;
  const doc = host.ownerDocument;
  const grid = doc.createElement("div");
  grid.className = "property-grid workflow-properties";
  grid.dataset.layout = "list";
  grid.dataset.frame = "none";
  grid.setAttribute("aria-label", `${node.title}: fields`);
  host.append(grid);
  const byKey = new Map((fields ?? []).map((f) => [f.key, f]));
  let current = node;
  let runtime = IDLE;
  const ctxFor = (key) => {
    const field = byKey.get(key);
    return field ? fh.context(field, current, runtime) : null;
  };
  const sourceConfig = {};
  for (const field of fields ?? [])
    sourceConfig[field.key] = gridConfig(field);
  const off = new AbortController;
  const signal = off.signal;
  grid.addEventListener("property-grid-beforechange", (e) => e.stopPropagation(), { signal });
  grid.addEventListener("property-grid-change", (e) => {
    e.stopPropagation();
    const { path, source } = e.detail;
    const top = path.split(".")[0];
    if (fields && !byKey.has(top))
      return;
    shown = JSON.stringify(source);
    fh.write({ [top]: source[top] });
  }, { signal });
  const openFrom = (target) => {
    const row = target?.closest?.("tr[data-path]");
    const cell = target?.closest?.(".property-grid-value");
    const field = row && cell ? byKey.get(row.dataset.path) : undefined;
    if (!field || !customEditor(field) || fh.readonly())
      return false;
    fh.edit(field.key);
    return true;
  };
  grid.addEventListener("click", (e) => void openFrom(e.target), { signal });
  grid.addEventListener("keydown", (e) => {
    if ((e.key === "Enter" || e.key === "F2") && openFrom(e.target))
      e.preventDefault();
  }, { signal });
  let shown = "";
  let pending = null;
  let readonly;
  let unsubscribe;
  const apply = (source) => {
    const text = JSON.stringify(source);
    if (text === shown)
      return;
    shown = text;
    configure(grid, { source });
  };
  configure(grid, {
    sourceConfig,
    keyRenderFn: (key) => {
      const field = byKey.get(key);
      if (!field)
        return null;
      const el = doc.createElement("span");
      el.className = "workflow-field-label";
      const ctx = ctxFor(key);
      if (!put2(el, field.renderLabel?.(fieldValue(field, current, runtime), ctx)))
        defaultLabel(el, field);
      return el;
    },
    valueRenderFn: (_value, key) => {
      const field = byKey.get(key);
      if (!field || !showsValue(field))
        return null;
      const el = doc.createElement("div");
      el.className = field.kind === "output" && !field.render ? "workflow-field-value workflow-output" : "workflow-field-value";
      const value = fieldValue(field, current, runtime);
      if (!(field.render && put2(el, field.render(value, ctxFor(key)))))
        defaultValueView(el, field, value);
      if (customEditor(field))
        el.dataset.workflowFieldEdit = field.key;
      return el;
    },
    getEditorFn: (key) => {
      const field = byKey.get(key);
      return field && showsValue(field) ? false : null;
    }
  });
  const changed = changedSince();
  const view = {
    update(n, state) {
      if (!changed(n, state, fh.readonly()))
        return;
      current = n;
      runtime = state;
      const ro = fh.readonly();
      if (ro !== readonly) {
        readonly = ro;
        grid.toggleAttribute("data-readonly", ro);
        shown = "";
      }
      const source = fields ? Object.fromEntries(fields.map((f) => [f.key, fieldValue(f, n, state) ?? null])) : { ...n.data };
      if (grid.store?.value.name === "editing") {
        pending = source;
        unsubscribe ??= grid.store.subscribe((v) => {
          if (v.name !== "editing" && pending) {
            const next = pending;
            pending = null;
            queueMicrotask(() => apply(next));
          }
        });
        return;
      }
      if (fields?.some((f) => f.render || f.renderLabel))
        shown = "";
      apply(source);
    },
    destroy() {
      off.abort();
      unsubscribe?.();
      dfDollar15(host).empty();
    }
  };
  view.update(node, IDLE);
  return view;
}
function dataView(host, node, description) {
  const doc = host.ownerDocument;
  const intro = doc.createElement("p");
  intro.className = "workflow-node-description";
  const list = doc.createElement("dl");
  list.className = "workflow-data";
  host.append(intro, list);
  const view = {
    update(n, runtime) {
      intro.textContent = description ?? "";
      intro.hidden = !description;
      const out = runtime.output && typeof runtime.output === "object" && !Array.isArray(runtime.output) ? runtime.output : {};
      const entries = [...Object.entries(n.data), ...Object.entries(out).map(([k, v]) => [`→ ${k}`, v])].slice(0, 5);
      dfDollar15(list).empty();
      list.append(...entries.flatMap(([k, v]) => {
        const dt = doc.createElement("dt");
        dt.textContent = k;
        const dd = doc.createElement("dd");
        const s = typeof v === "string" ? v : JSON.stringify(v);
        dd.textContent = s.length > 80 ? s.slice(0, 79) + "…" : s;
        return [dt, dd];
      }));
    },
    destroy() {
      dfDollar15(host).empty();
    }
  };
  view.update(node, { status: "idle" });
  return view;
}
var IDLE = Object.freeze({ status: "idle" });
var edgeTypesVersion = 0;
function curveAt(curve, t = 0.5) {
  const p = curve.points;
  if (curve.cubic) {
    const u = 1 - t;
    const a = u * u * u;
    const b = 3 * u * u * t;
    const d = 3 * u * t * t;
    const e = t * t * t;
    return {
      x: a * p[0].x + b * p[1].x + d * p[2].x + e * p[3].x,
      y: a * p[0].y + b * p[1].y + d * p[2].y + e * p[3].y
    };
  }
  let total = 0;
  for (let i = 1;i < p.length; i++)
    total += Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
  let left = total * t;
  for (let i = 1;i < p.length; i++) {
    const d = Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y);
    if (d >= left && d > 0)
      return { x: p[i - 1].x + (p[i].x - p[i - 1].x) * left / d, y: p[i - 1].y + (p[i].y - p[i - 1].y) * left / d };
    left -= d;
  }
  return p[0];
}

class Canvas {
  graph;
  root;
  selected = new Set;
  selectedEdge;
  camera = { x: 80, y: 80, zoom: 1 };
  readonly;
  stats;
  palette;
  hooks;
  budget = { dom: 150, edges: 5000, nodes: 3000 };
  edgeBudget = 5000;
  fastFrames = 0;
  nodeIndex = new ENGINE.SpatialIndex;
  groupIndex = new ENGINE.SpatialIndex;
  cards = new Map;
  pool = [];
  groupEls = new Map;
  runtime = new Map;
  statusDirty = new Set;
  viewport;
  grid;
  groupLayer;
  nodeLayer;
  overlay;
  mini;
  miniBase;
  miniBounds = { x: 0, y: 0, width: 1, height: 1 };
  miniDirty = true;
  live;
  message;
  empty;
  renderer;
  flowLayer;
  labelLayer;
  decor = new Map;
  decorated = null;
  drawnCamera = null;
  abort = new AbortController;
  resize;
  unsubscribe;
  raf = 0;
  frameId = 0;
  revision = 0;
  dead = false;
  gesture;
  pointers = new Map;
  space = false;
  preview = new Map;
  pendingPreview = new Map;
  groupPreview = new Map;
  pendingGroups = [];
  connection;
  clipboard;
  viewTimer;
  messageTimer;
  colorCache = new Map;
  probe;
  zoomLabel;
  probeCtx = null;
  idBase;
  ready;
  resolveReady;
  constructor(root, store, options, hooks) {
    this.root = root;
    this.graph = store;
    this.hooks = hooks;
    this.readonly = options.readonly;
    this.idBase = (root.id || uid2("wf")) + "-f";
    this.ready = new Promise((resolve) => this.resolveReady = resolve);
    const doc = root.ownerDocument;
    const viewport = doc.createElement("div");
    viewport.className = "workflow-viewport";
    viewport.setAttribute("data-ce-chrome", "");
    dfDollar15(viewport).html(`<div class="workflow-grid"></div><div class="workflow-groups"></div><canvas class="workflow-edges"></canvas>` + `<svg class="workflow-edge-flow" aria-hidden="true"></svg>` + `<div class="workflow-nodes"></div><div class="workflow-edge-labels"></div><canvas class="workflow-overlay"></canvas>` + `<div class="workflow-empty" hidden><strong>An empty workflow</strong><span>Add a node from the palette, then drag from a port to connect it.</span></div>` + `<div class="workflow-message" role="status" hidden></div>` + (options.controls ? `<div class="workflow-controls" role="toolbar" aria-label="View">` + `<button type="button" class="btn" data-variant="ghost" data-size="icon-sm" data-workflow-control="zoom-out" aria-label="Zoom out" title="Zoom out (−)">${icon("minus")}</button>` + `<button type="button" class="workflow-zoom" data-workflow-control="reset" aria-label="Zoom to 100%" title="Zoom to 100%">100%</button>` + `<button type="button" class="btn" data-variant="ghost" data-size="icon-sm" data-workflow-control="zoom-in" aria-label="Zoom in" title="Zoom in (+)">${icon("plus")}</button>` + `<button type="button" class="btn" data-variant="ghost" data-size="icon-sm" data-workflow-control="fit" aria-label="Fit the workflow" title="Fit (F)">${icon("fit")}</button>` + `</div>` : "") + `<canvas class="workflow-minimap" aria-label="Minimap - click to move the view"${options.minimap ? "" : " hidden"}></canvas>` + `<span class="workflow-probe" aria-hidden="true"></span>` + `<div class="workflow-live" aria-live="polite" aria-atomic="true"></div>`);
    root.append(viewport);
    this.viewport = viewport;
    const part = (cls) => dfDollar15(viewport).children(cls).get(0);
    this.grid = part(".workflow-grid");
    this.groupLayer = part(".workflow-groups");
    this.nodeLayer = part(".workflow-nodes");
    this.flowLayer = part(".workflow-edge-flow");
    this.labelLayer = part(".workflow-edge-labels");
    this.overlay = part(".workflow-overlay");
    this.mini = part(".workflow-minimap");
    this.miniBase = doc.createElement("canvas");
    this.live = part(".workflow-live");
    this.message = part(".workflow-message");
    this.empty = part(".workflow-empty");
    this.probe = part(".workflow-probe");
    this.zoomLabel = dfDollar15(viewport).find(".workflow-zoom").get(0);
    this.palette = this.readPalette();
    this.reindex();
    this.renderer = new EdgeRenderer(part(".workflow-edges"), () => this.sceneDocument(), (f, s, r) => this.present(f, s, r), options.worker);
    this.unsubscribe = this.subscribe();
    this.resize = new ResizeObserver(() => {
      this.miniDirty = true;
      this.request();
    });
    this.resize.observe(root);
    this.listen();
    this.request();
  }
  resolve(color) {
    const cached = this.colorCache.get(color);
    if (cached)
      return cached;
    this.probe.style.color = "";
    this.probe.style.color = color;
    const computed = getComputedStyle(this.probe).color || color;
    let out = computed;
    try {
      this.probeCtx ??= this.root.ownerDocument.createElement("canvas").getContext("2d", { willReadFrequently: true });
      const ctx = this.probeCtx;
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = computed;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      out = `rgba(${r}, ${g}, ${b}, ${(a / 255).toFixed(3)})`;
    } catch {}
    this.colorCache.set(color, out);
    return out;
  }
  readPalette() {
    this.colorCache.clear();
    const css = getComputedStyle(this.root);
    const v = (name, fallback) => this.resolve(css.getPropertyValue(name).trim() || fallback);
    const radius = parseFloat(getComputedStyle(this.probe).borderTopLeftRadius) || 10;
    return {
      node: v("--workflow-node", "#fff"),
      border: v("--workflow-border", "#ddd"),
      text: v("--workflow-text", "#111"),
      muted: v("--workflow-muted", "#888"),
      accent: v("--workflow-accent", "#3b82f6"),
      edge: v("--workflow-edge", "#999"),
      font: css.fontFamily || "system-ui, sans-serif",
      radius,
      types: Array.from({ length: 8 }, (_, i) => v(`--workflow-type-${i}`, "#888")),
      status: {
        queued: v("--workflow-queued", "#888"),
        running: v("--workflow-running", "#3b82f6"),
        success: v("--workflow-success", "#16a34a"),
        error: v("--workflow-error", "#dc2626"),
        cancelled: v("--workflow-muted", "#888")
      }
    };
  }
  refreshTheme() {
    this.palette = this.readPalette();
    this.decorated = null;
    for (const d of this.decor.values())
      d.drawn = undefined;
    this.renderer.load(this.sceneDocument());
    this.miniDirty = true;
    this.request();
  }
  subscribe() {
    return this.graph.subscribe((change) => {
      this.revision++;
      this.preview.clear();
      this.pendingPreview.clear();
      this.groupPreview.clear();
      this.pendingGroups = [];
      if (change.patches.some((p) => p.kind === "groups"))
        this.reindex();
      else
        for (const p of change.patches)
          if (p.kind === "nodes") {
            this.nodeIndex.remove(p.id);
            const n = p.value;
            if (n && !ENGINE.collapsedAncestor(n, this.graph.groups))
              this.nodeIndex.set(p.id, n);
            if (!n) {
              this.selected.delete(p.id);
              this.runtime.delete(p.id);
            }
          }
      if (this.selectedEdge && !this.graph.edges.has(this.selectedEdge))
        this.selectedEdge = undefined;
      if (change.patches.some((p) => p.kind === "edges"))
        this.decorated = null;
      this.renderer.patch(change.patches.map((p) => this.scenePatch(p)));
      this.miniDirty = true;
      this.request();
      this.hooks.change(change);
    });
  }
  setGraph(store) {
    this.cancel();
    this.unsubscribe();
    this.graph = store;
    this.unsubscribe = this.subscribe();
    this.selected.clear();
    this.selectedEdge = undefined;
    this.runtime.clear();
    for (const [id, card] of this.cards)
      this.release(id, card);
    for (const el of this.groupEls.values())
      el.remove();
    this.groupEls.clear();
    for (const id of this.decor.keys())
      this.dropDecor(id);
    this.decorated = null;
    this.revision++;
    this.reindex();
    this.renderer.load(this.sceneDocument());
    this.miniDirty = true;
    this.request();
  }
  sceneNode(n) {
    const definition = this.hooks.types(n.type);
    const accent = accentOf(definition?.color);
    const status = this.runtime.get(n.id)?.status;
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height,
      ports: n.ports,
      data: {},
      groupId: n.groupId,
      accent: accent ? this.resolve(accent) : undefined,
      status: status && status !== "idle" ? status : undefined
    };
  }
  scenePatch(p) {
    if (p.kind === "nodes" && p.value)
      return { ...p, value: this.sceneNode(p.value) };
    if (p.kind === "edges" && p.value)
      return { ...p, value: this.sceneEdge(p.value) };
    return p;
  }
  look(e) {
    let port;
    const source = this.graph.nodes.get(e.source.node);
    if (source) {
      for (const p of source.ports)
        if (p.id === e.source.port) {
          port = p;
          break;
        }
    }
    const type = this.hooks.edgeType(e.type ?? port?.type ?? "");
    return {
      type,
      port,
      color: e.color ?? type?.color,
      dash: e.dash ?? type?.dash,
      width: e.width ?? type?.width,
      animated: e.animated ?? type?.animated ?? false
    };
  }
  sceneEdge(e) {
    const look = this.look(e);
    const color = accentOf(look.color);
    return {
      id: e.id,
      source: e.source,
      target: e.target,
      route: e.route,
      points: e.points,
      color: color ? this.resolve(color) : undefined,
      dash: look.dash,
      width: look.width
    };
  }
  sceneDocument() {
    return {
      schemaVersion: 1,
      id: "scene",
      title: "scene",
      nodes: [...this.graph.nodes.values()].map((n) => this.sceneNode(this.preview.get(n.id) ?? n)),
      edges: [...this.graph.edges.values()].map((e) => this.sceneEdge(e)),
      groups: [...this.graph.groups.values()]
    };
  }
  reindex() {
    this.nodeIndex.clear();
    this.groupIndex.clear();
    for (const n of this.graph.nodes.values())
      if (!ENGINE.collapsedAncestor(n, this.graph.groups))
        this.nodeIndex.set(n.id, n);
    for (const g of this.graph.groups.values())
      if (!this.hiddenGroup(g))
        this.groupIndex.set(g.id, { ...g, width: g.collapsed ? 240 : g.width, height: g.collapsed ? 56 : g.height });
  }
  hiddenGroup(g) {
    let id = g.parentId;
    while (id) {
      const p = this.graph.groups.get(id);
      if (!p)
        break;
      if (p.collapsed)
        return true;
      id = p.parentId;
    }
    return false;
  }
  setReadonly(value) {
    if (this.readonly === value)
      return;
    this.cancel();
    this.readonly = value;
    for (const card of this.cards.values()) {
      card.body.disabled = value;
      if (card.node)
        this.attempt(() => card.view?.update(card.node, card.runtime ?? IDLE));
    }
    this.request();
  }
  setCamera(camera, rest = true) {
    if (![camera.x, camera.y, camera.zoom].every(Number.isFinite))
      throw new Error("Invalid camera");
    this.camera = { x: camera.x, y: camera.y, zoom: clamp3(camera.zoom, MIN_ZOOM, MAX_ZOOM) };
    this.request();
    if (rest)
      this.rest();
  }
  rest() {
    clearTimeout(this.viewTimer);
    this.viewTimer = setTimeout(() => this.hooks.view(), 150);
  }
  select(ids, edge) {
    const next = new Set;
    for (const id of ids)
      if (this.graph.nodes.has(id))
        next.add(id);
    const nextEdge = edge && this.graph.edges.has(edge) ? edge : undefined;
    const same = next.size === this.selected.size && [...next].every((id) => this.selected.has(id)) && nextEdge === this.selectedEdge;
    if (same)
      return;
    this.selected.clear();
    for (const id of next)
      this.selected.add(id);
    this.selectedEdge = nextEdge;
    this.request();
    this.hooks.select();
  }
  setRuntime(id, state) {
    if (!this.graph.nodes.has(id))
      return;
    const before = this.runtime.get(id)?.status ?? "idle";
    if (state.status === "idle")
      this.runtime.delete(id);
    else
      this.runtime.set(id, { ...state });
    if (before !== state.status)
      this.statusDirty.add(id);
    this.request();
  }
  clearRuntime() {
    for (const id of this.runtime.keys())
      this.statusDirty.add(id);
    this.runtime.clear();
    this.request();
  }
  getRuntime(id) {
    return this.runtime.get(id) ?? IDLE;
  }
  center() {
    return {
      x: (this.root.clientWidth / 2 - this.camera.x) / this.camera.zoom,
      y: (this.root.clientHeight / 2 - this.camera.y) / this.camera.zoom
    };
  }
  flyTo(point, zoom = this.camera.zoom) {
    this.setCamera({
      x: this.root.clientWidth / 2 - point.x * zoom,
      y: this.root.clientHeight / 2 - point.y * zoom,
      zoom
    });
  }
  focusField(id, key) {
    const k = CSS.escape(key);
    const find = () => {
      const body = this.cards.get(id)?.body;
      return body ? dfDollar15(body).find(`[data-key="${k}"] :is(input,select,textarea,[tabindex]), tr[data-path="${k}"] .property-grid-value`).get(0) : undefined;
    };
    if (!this.graph.nodes.has(id))
      return false;
    const now = find();
    if (now) {
      now.focus({ preventScroll: true });
      return true;
    }
    this.focusNode(id, false);
    requestAnimationFrame(() => requestAnimationFrame(() => find()?.focus({ preventScroll: true })));
    return true;
  }
  focusNode(id, focus = true) {
    const n = this.graph.nodes.get(id);
    if (!n)
      return;
    const collapsed = ENGINE.collapsedAncestor(n, this.graph.groups);
    if (collapsed) {
      const g = this.graph.groups.get(collapsed);
      this.flyTo({ x: g.x + 120, y: g.y + 28 });
    } else
      this.flyTo({ x: n.x + n.width / 2, y: n.y + n.height / 2 }, Math.max(this.camera.zoom, 0.8));
    this.select([id]);
    if (focus)
      this.root.focus({ preventScroll: true });
  }
  fit(selectionOnly = false) {
    const nodes = selectionOnly ? [...this.selected].map((id) => this.graph.nodes.get(id)).filter(Boolean) : [...this.graph.nodes.values()];
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    if (!nodes.length || !w || !h) {
      this.setCamera({ x: 80, y: 80, zoom: 1 });
      return;
    }
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const n of nodes) {
      if (n.x < x0)
        x0 = n.x;
      if (n.y < y0)
        y0 = n.y;
      if (n.x + n.width > x1)
        x1 = n.x + n.width;
      if (n.y + n.height > y1)
        y1 = n.y + n.height;
    }
    const b = { x: x0 - 60, y: y0 - 60, width: x1 - x0 + 120, height: y1 - y0 + 120 };
    let band = 0;
    for (const sel of [".workflow-minimap", ".workflow-controls"]) {
      const part = dfDollar15(this.root).find(sel).get(0);
      if (part && !part.hidden)
        band = Math.max(band, h - part.offsetTop + 8);
    }
    const zoomIn = (height) => clamp3(Math.min(1.2, w / b.width, height / b.height), MIN_ZOOM, MAX_ZOOM);
    const above = band > 0 && h - band >= h * 0.55 && (zoomIn(h - band) >= CARD_ZOOM || zoomIn(h) < CARD_ZOOM);
    const free = above ? h - band : h;
    const zoom = zoomIn(free);
    this.setCamera({ x: (w - b.width * zoom) / 2 - b.x * zoom, y: (free - b.height * zoom) / 2 - b.y * zoom, zoom });
  }
  zoomBy(factor) {
    this.zoomAt({ x: this.root.clientWidth / 2, y: this.root.clientHeight / 2 }, factor);
  }
  zoomAt(p, factor) {
    const w = this.toWorld(p);
    const zoom = clamp3(this.camera.zoom * factor, MIN_ZOOM, MAX_ZOOM);
    this.setCamera({ x: p.x - w.x * zoom, y: p.y - w.y * zoom, zoom });
  }
  toWorld(p, camera = this.camera) {
    return { x: (p.x - camera.x) / camera.zoom, y: (p.y - camera.y) / camera.zoom };
  }
  toScreen(p, camera = this.camera) {
    return { x: p.x * camera.zoom + camera.x, y: p.y * camera.zoom + camera.y };
  }
  local(e) {
    const r = this.root.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }
  notify(message, tone = "info") {
    this.live.textContent = message;
    this.message.textContent = message;
    this.message.dataset.tone = tone;
    this.message.hidden = false;
    clearTimeout(this.messageTimer);
    this.messageTimer = setTimeout(() => this.message.hidden = true, 4000);
  }
  report(error) {
    const message = error instanceof Error ? error.message : String(error);
    this.notify(message, "error");
    this.hooks.error(message);
  }
  attempt(fn) {
    try {
      fn();
    } catch (e) {
      this.report(e);
    }
  }
  request() {
    if (!this.raf && !this.dead)
      this.raf = requestAnimationFrame(() => {
        this.raf = 0;
        this.draw();
      });
  }
  domIds() {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    const box = ENGINE.viewport(this.camera, w, h, 160);
    const ids = new Set;
    const doc = this.root.ownerDocument;
    const focused = doc.activeElement?.closest("[data-node-id]")?.dataset.nodeId;
    if (focused && this.root.contains(doc.activeElement) && this.graph.nodes.has(focused))
      ids.add(focused);
    if (this.camera.zoom < CARD_ZOOM)
      return [...ids];
    for (const id of this.selected) {
      if (ids.size >= this.budget.dom)
        break;
      const n = this.preview.get(id) ?? this.graph.nodes.get(id);
      if (!ENGINE.collapsedAncestor(n, this.graph.groups) && ENGINE.intersects(n, box))
        ids.add(id);
    }
    for (const id of this.nodeIndex.query(box, this.budget.dom * 4, 20000).ids) {
      if (ids.size >= this.budget.dom)
        break;
      ids.add(id);
    }
    return [...ids];
  }
  draw() {
    if (this.dead)
      return;
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    if (!w || !h)
      return;
    if (this.pendingPreview.size) {
      this.renderer.patch([...this.pendingPreview.values()].map((n) => ({ kind: "nodes", id: n.id, value: this.sceneNode(n) })));
      this.pendingPreview.clear();
    }
    if (this.pendingGroups.length) {
      this.renderer.patch(this.pendingGroups);
      this.pendingGroups = [];
    }
    if (this.statusDirty.size) {
      const patches = [];
      for (const id of this.statusDirty) {
        const n = this.preview.get(id) ?? this.graph.nodes.get(id);
        if (n)
          patches.push({ kind: "nodes", id, value: this.sceneNode(n) });
      }
      this.statusDirty.clear();
      this.renderer.patch(patches);
    }
    const domIds = this.domIds();
    this.syncCards(domIds);
    this.renderGroups(w, h);
    this.place();
    this.empty.hidden = this.graph.nodes.size > 0;
    const frame = {
      id: ++this.frameId,
      revision: this.revision,
      camera: { ...this.camera },
      width: w,
      height: h,
      dpr: Math.min(globalThis.devicePixelRatio || 1, 2),
      domIds,
      selection: [...this.selected].slice(0, 64),
      edgeSelection: this.selectedEdge,
      maxEdges: this.edgeBudget,
      maxNodes: this.budget.nodes,
      palette: this.palette
    };
    this.renderer.draw(frame);
    this.drawOverlay();
    this.drawMinimap();
  }
  place() {
    const c = this.camera;
    const step = 24 * c.zoom;
    this.grid.style.backgroundSize = `${step}px ${step}px`;
    this.grid.style.backgroundPosition = `${c.x}px ${c.y}px`;
    this.grid.dataset.fine = String(step < 8);
    for (const [id, card] of this.cards) {
      const n = this.preview.get(id) ?? this.graph.nodes.get(id);
      if (n)
        card.el.style.transform = `translate(${n.x * c.zoom + c.x}px, ${n.y * c.zoom + c.y}px) scale(${c.zoom})`;
    }
    this.groupLayer.style.setProperty("--workflow-zoom", String(c.zoom));
    for (const [id, el] of this.groupEls) {
      const g = this.groupPreview.get(id) ?? this.graph.groups.get(id);
      if (g)
        el.style.transform = `translate(${g.x * c.zoom + c.x}px, ${g.y * c.zoom + c.y}px) scale(${c.zoom})`;
    }
    const d = this.drawnCamera;
    const canvas = this.renderer.canvas;
    if (d) {
      const s = c.zoom / d.zoom;
      canvas.style.transform = s === 1 && c.x === d.x && c.y === d.y ? "" : `translate(${c.x - d.x * s}px, ${c.y - d.y * s}px) scale(${s})`;
    }
    const zoom = this.zoomLabel;
    if (zoom)
      zoom.textContent = `${Math.round(c.zoom * 100)}%`;
    this.placeEdges();
  }
  curveOf(e) {
    const a = this.preview.get(e.source.node) ?? this.graph.nodes.get(e.source.node);
    const b = this.preview.get(e.target.node) ?? this.graph.nodes.get(e.target.node);
    if (!a || !b)
      return null;
    if (ENGINE.collapsedAncestor(a, this.graph.groups) || ENGINE.collapsedAncestor(b, this.graph.groups))
      return null;
    return ENGINE.route(e, ENGINE.portPosition(a, e.source.port), ENGINE.portPosition(b, e.target.port));
  }
  dropDecor(id) {
    const d = this.decor.get(id);
    d?.path?.remove();
    d?.label?.remove();
    this.decor.delete(id);
  }
  placeEdges() {
    const c = this.camera;
    const box = ENGINE.viewport(c, this.root.clientWidth, this.root.clientHeight, 40);
    const wanted = new Map;
    if (c.zoom >= 0.12) {
      if (!this.decorated) {
        this.decorated = new Set;
        for (const e of this.graph.edges.values()) {
          const look = this.look(e);
          if (e.label || look.animated || look.type?.render)
            this.decorated.add(e.id);
        }
      }
      const flowing = new Set;
      for (const [id, r] of this.runtime)
        if (r.status === "running") {
          for (const eid of this.graph.edgesFor(id))
            if (this.graph.edges.get(eid)?.target.node === id)
              flowing.add(eid);
        }
      const candidates = this.decorated.size + flowing.size <= 1500 ? [...this.decorated, ...flowing] : this.nodeIndex.query(box, 300, 5000).ids.flatMap((id) => [...this.graph.edgesFor(id)]).filter((id) => this.decorated.has(id) || flowing.has(id));
      for (const id of candidates) {
        if (wanted.size >= 300)
          break;
        if (wanted.has(id))
          continue;
        const e = this.graph.edges.get(id);
        if (!e)
          continue;
        const curve = this.curveOf(e);
        if (!curve || !ENGINE.intersects(curve.box, box))
          continue;
        const look = this.look(e);
        wanted.set(id, {
          e,
          curve,
          look,
          flow: look.animated || flowing.has(id),
          label: c.zoom >= 0.3 && (!!e.label || !!look.type?.render)
        });
      }
    }
    for (const id of this.decor.keys())
      if (!wanted.has(id))
        this.dropDecor(id);
    const labels = [];
    const doc = this.root.ownerDocument;
    const screen = (p) => `${(p.x * c.zoom + c.x).toFixed(1)},${(p.y * c.zoom + c.y).toFixed(1)}`;
    for (const [id, w] of wanted) {
      let d = this.decor.get(id);
      if (!d)
        this.decor.set(id, d = {});
      if (w.flow) {
        if (!d.path) {
          d.path = doc.createElementNS("http://www.w3.org/2000/svg", "path");
          d.path.setAttribute("class", "workflow-edge-flow-path");
          this.flowLayer.append(d.path);
        }
        const p = w.curve.points;
        d.path.setAttribute("d", w.curve.cubic ? `M${screen(p[0])}C${screen(p[1])} ${screen(p[2])} ${screen(p[3])}` : "M" + p.map(screen).join("L"));
        const slot = ENGINE.typeIndex(w.look.port?.type ?? "any");
        d.path.style.stroke = accentOf(w.look.color) ?? (slot >= 0 ? `var(--workflow-type-${slot})` : "var(--workflow-edge)");
        d.path.style.strokeWidth = `${Math.max(2, (w.look.width ?? 1.75) + 1)}px`;
        d.path.toggleAttribute("data-selected", id === this.selectedEdge);
      } else if (d.path) {
        d.path.remove();
        d.path = undefined;
      }
      if (w.label) {
        const runtime = this.getRuntime(w.e.source.node);
        const value = outputOf(runtime)?.[w.e.source.port];
        const selected = id === this.selectedEdge;
        const drawn = d.drawn;
        if (!d.label || !drawn || drawn[0] !== w.e || drawn[1] !== value || drawn[2] !== selected || drawn[3] !== edgeTypesVersion || drawn[4] !== runtime.status) {
          if (!d.label) {
            d.label = doc.createElement("button");
            d.label.type = "button";
            d.label.className = "workflow-edge-label";
            d.label.tabIndex = -1;
            d.label.dataset.edgeId = id;
            this.labelLayer.append(d.label);
          }
          d.drawn = [w.e, value, selected, edgeTypesVersion, runtime.status];
          let content = w.e.label ?? null;
          if (content === null && w.look.type?.render)
            try {
              content = w.look.type.render(w.e, {
                source: this.graph.nodes.get(w.e.source.node),
                target: this.graph.nodes.get(w.e.target.node),
                port: w.look.port,
                value,
                runtime,
                selected,
                workflow: this.root
              });
            } catch (error) {
              this.report(error);
            }
          if (!put2(d.label, content)) {
            d.label.remove();
            d.label = undefined;
            continue;
          }
          d.label.toggleAttribute("data-selected", selected);
          d.label.setAttribute("aria-label", `Connection ${w.e.label ?? id}`);
          d.size = undefined;
        }
        labels.push({ d, curve: w.curve, selected: id === this.selectedEdge });
      } else if (d.label) {
        d.label.remove();
        d.label = undefined;
        d.drawn = undefined;
      }
    }
    this.placeLabels(labels, box);
  }
  placeLabels(list, box) {
    if (!list.length)
      return;
    const c = this.camera;
    const scale = Math.min(1.25, Math.max(0.75, c.zoom));
    for (const it of list)
      if (!it.d.size?.width)
        it.d.size = { width: it.d.label.offsetWidth, height: it.d.label.offsetHeight };
    const crowd = list.length <= 150;
    const cards = [];
    if (crowd)
      for (const id of this.nodeIndex.query(box, 600, 6000).ids) {
        const n = this.preview.get(id) ?? this.graph.nodes.get(id);
        if (!n || ENGINE.collapsedAncestor(n, this.graph.groups))
          continue;
        const x = n.x * c.zoom + c.x;
        const y = n.y * c.zoom + c.y;
        cards.push({ x, y, r: x + n.width * c.zoom, b: y + n.height * c.zoom });
      }
    const placed = [];
    const free = (q) => !cards.some((o) => q.x < o.r && q.r > o.x && q.y < o.b && q.b > o.y) && !placed.some((o) => q.x < o.r && q.r > o.x && q.y < o.b && q.b > o.y);
    const ALONG = [0.5, 0.4, 0.6, 0.3, 0.7, 0.22, 0.78];
    const PLACES = [
      ...ALONG.map((t) => [t, 0]),
      ...ALONG.flatMap((t) => [
        [t, 1],
        [t, -1]
      ])
    ];
    for (const it of [...list].sort((a, b) => Number(b.selected) - Number(a.selected))) {
      const w = it.d.size.width * scale;
      const h = it.d.size.height * scale;
      const rect = ([t, side]) => {
        const m = curveAt(it.curve, t);
        const x = m.x * c.zoom + c.x - w / 2;
        const y = m.y * c.zoom + c.y - h / 2 + side * (h / 2 + 6);
        return { x: x - 2, y: y - 2, r: x + w + 2, b: y + h + 2 };
      };
      let at;
      if (crowd)
        for (const place of PLACES) {
          const q = rect(place);
          if (free(q)) {
            at = q;
            break;
          }
        }
      else
        at = rect([0.5, 0]);
      const crowded = !at && !it.selected;
      if (!at)
        at = rect([0.5, 0]);
      if (!crowded)
        placed.push(at);
      it.d.label.toggleAttribute("data-crowded", crowded);
      it.d.label.style.transform = `translate(${(at.x + 2).toFixed(1)}px, ${(at.y + 2).toFixed(1)}px) scale(${scale})`;
    }
  }
  present(f, stats, renderer) {
    if (this.dead)
      return;
    const cost = stats.rasterMs ?? stats.drawMs;
    if (cost > 20 && stats.edges > 128) {
      this.edgeBudget = Math.max(Math.min(128, this.budget.edges), Math.floor(this.edgeBudget * Math.max(0.15, Math.min(0.8, 14 / cost))));
      this.fastFrames = 0;
    } else if (cost < 10 && ++this.fastFrames >= 30) {
      this.edgeBudget = Math.min(this.budget.edges, Math.ceil(this.edgeBudget * 1.15));
      this.fastFrames = 0;
    }
    this.drawnCamera = f.camera;
    this.place();
    this.stats = {
      frame: stats.frame,
      drawMs: Math.round(stats.drawMs * 10) / 10,
      edges: stats.edges,
      nodes: stats.nodes,
      domNodes: this.cards.size,
      edgeBudget: stats.edgeBudget,
      edgesTruncated: stats.edgesTruncated,
      renderer,
      zoom: f.camera.zoom
    };
    this.root.dataset.renderer = renderer;
    this.hooks.frame(this.stats);
    this.resolveReady();
  }
  release(id, card) {
    this.attempt(() => card.view?.destroy());
    card.view = undefined;
    card.node = undefined;
    card.runtime = undefined;
    dfDollar15(card.body).empty();
    card.el.remove();
    this.cards.delete(id);
    if (this.pool.length < this.budget.dom)
      this.pool.push(card);
  }
  syncCards(ids) {
    const wanted = new Set(ids);
    for (const [id, card] of this.cards)
      if (!wanted.has(id))
        this.release(id, card);
    for (const id of ids) {
      const node = this.preview.get(id) ?? this.graph.nodes.get(id);
      if (!node)
        continue;
      let card = this.cards.get(id);
      if (!card) {
        card = this.pool.pop() ?? this.newCard();
        this.cards.set(id, card);
        card.el.dataset.nodeId = id;
        card.signature = "";
        card.type = "";
        this.nodeLayer.append(card.el);
      }
      this.updateCard(card, node);
    }
  }
  newCard() {
    const doc = this.root.ownerDocument;
    const el = doc.createElement("article");
    el.className = "workflow-node";
    el.setAttribute("role", "group");
    const head = doc.createElement("header");
    head.className = "workflow-node-header";
    const title = doc.createElement("span");
    title.className = "workflow-node-title";
    const status = doc.createElement("span");
    status.className = "workflow-node-status";
    head.append(title, status);
    const ports = doc.createElement("div");
    ports.className = "workflow-node-ports";
    const body = doc.createElement("fieldset");
    body.className = "workflow-node-body";
    const progress = doc.createElement("div");
    progress.className = "workflow-node-progress";
    const resize = doc.createElement("button");
    resize.type = "button";
    resize.className = "workflow-node-resize";
    resize.setAttribute("aria-label", "Resize node");
    resize.title = "Drag to resize; arrow keys resize";
    resize.addEventListener("keydown", (e) => {
      if (!e.key.startsWith("Arrow") || this.readonly)
        return;
      e.preventDefault();
      e.stopPropagation();
      const n = this.graph.nodes.get(el.dataset.nodeId);
      if (!n || n.locked)
        return;
      const dx = e.key === "ArrowRight" ? 16 : e.key === "ArrowLeft" ? -16 : 0;
      const dy = e.key === "ArrowDown" ? 16 : e.key === "ArrowUp" ? -16 : 0;
      this.attempt(() => this.graph.updateNode(n.id, { width: Math.max(160, n.width + dx), height: Math.max(ENGINE.contentTop(n) + 40, n.height + dy) }, "Resize"));
    });
    el.append(head, ports, body, progress, resize);
    return { el, title, status, ports, body, progress, signature: "", type: "", typeVersion: -1 };
  }
  updateCard(card, n) {
    const c = this.camera;
    card.el.style.width = `${n.width}px`;
    card.el.style.height = `${n.height}px`;
    card.el.style.transform = `translate(${n.x * c.zoom + c.x}px, ${n.y * c.zoom + c.y}px) scale(${c.zoom})`;
    card.el.toggleAttribute("data-selected", this.selected.has(n.id));
    card.el.toggleAttribute("data-locked", !!n.locked);
    card.el.toggleAttribute("data-subgraph", !!n.subgraph);
    card.el.setAttribute("aria-label", n.title);
    if (card.title.textContent !== n.title)
      card.title.textContent = n.title;
    const state = this.getRuntime(n.id);
    card.el.dataset.status = state.status;
    card.status.title = state.message ?? state.status;
    card.status.textContent = state.status === "running" && state.progress !== undefined ? `${Math.round(state.progress * 100)}%` : state.status === "idle" ? "" : state.status;
    card.progress.style.setProperty("--workflow-progress", String(state.progress ?? (state.status === "success" ? 1 : 0)));
    const definition = this.hooks.types(n.type);
    const accent = accentOf(definition?.color);
    if (accent)
      card.el.style.setProperty("--workflow-accent-color", accent);
    else
      card.el.style.removeProperty("--workflow-accent-color");
    const signature = JSON.stringify(n.ports);
    if (card.signature !== signature) {
      dfDollar15(card.ports).empty();
      card.signature = signature;
      for (const direction of ["input", "output"])
        n.ports.filter((p) => p.direction === direction).forEach((p, i) => {
          const doc = this.root.ownerDocument;
          const button = doc.createElement("button");
          button.type = "button";
          button.className = "workflow-port";
          button.dataset.portId = p.id;
          button.dataset.direction = direction;
          button.style.top = `${ENGINE.PORT_TOP + i * ENGINE.PORT_STEP - 11}px`;
          const t = ENGINE.typeIndex(p.type);
          button.style.setProperty("--workflow-port", t >= 0 ? `var(--workflow-type-${t})` : "var(--workflow-edge)");
          button.title = `${p.label ?? p.id} · ${p.type}`;
          button.setAttribute("aria-label", `${direction} ${p.label ?? p.id} (${p.type})`);
          const dot = doc.createElement("i");
          dot.setAttribute("aria-hidden", "true");
          const label = doc.createElement("span");
          label.textContent = p.label ?? p.id;
          button.append(dot, label);
          card.ports.append(button);
        });
    }
    card.body.style.top = `${ENGINE.contentTop(n)}px`;
    const version = this.hooks.typesVersion();
    if (card.type !== n.type || !card.node || card.typeVersion !== version) {
      this.attempt(() => card.view?.destroy());
      card.view = undefined;
      dfDollar15(card.body).empty();
      card.type = n.type;
      card.typeVersion = version;
      const id = n.id;
      const context = {
        updateData: (data) => this.hooks.write(id, data),
        requestResize: (height) => {
          const current = this.graph.nodes.get(id);
          if (!this.readonly && current)
            this.attempt(() => this.graph.updateNode(id, { height: Math.max(ENGINE.contentTop(current) + 40, height) }, "Resize"));
        }
      };
      const host = {
        write: (data) => this.hooks.write(id, data),
        edit: (key) => this.hooks.edit(id, key),
        context: (field, node, runtime) => ({
          node,
          field,
          runtime,
          workflow: this.root,
          readonly: this.readonly,
          custom: customEditor(field)
        }),
        readonly: () => this.readonly
      };
      const layout = definition?.layout ?? this.hooks.layout();
      this.attempt(() => {
        if (definition?.mount)
          card.view = definition.mount(card.body, n, context);
        else {
          const fields = definition?.fields?.length ? definition.fields : null;
          const list = layout === "list" ? listView(card.body, n, fields, host) : null;
          if (list)
            card.view = list;
          else if (fields)
            card.view = fieldsView(card.body, n, fields, host, `${this.idBase}-${n.id}`);
          else
            card.view = dataView(card.body, n, definition?.description);
        }
      });
      card.el.dataset.layout = dfDollar15(card.body).children(".workflow-properties").get(0) ? "list" : "controls";
      card.node = undefined;
    }
    if (card.node !== n || card.runtime !== state)
      this.attempt(() => card.view?.update(n, state));
    card.node = n;
    card.runtime = state;
    card.body.disabled = this.readonly;
    if (this.connection)
      this.markCompatible(card);
  }
  renderGroups(w, h) {
    const ids = new Set(this.groupIndex.query(ENGINE.viewport(this.camera, w, h, 100), 100, 2000).ids);
    for (const [id, el] of this.groupEls)
      if (!ids.has(id)) {
        el.remove();
        this.groupEls.delete(id);
      }
    for (const id of ids) {
      const g = this.groupPreview.get(id) ?? this.graph.groups.get(id);
      if (!g)
        continue;
      let el = this.groupEls.get(id);
      if (!el) {
        el = this.root.ownerDocument.createElement("section");
        el.className = "workflow-group";
        el.dataset.groupId = id;
        dfDollar15(el).html(`<header class="workflow-group-header"><button type="button" class="workflow-group-toggle"></button><span class="workflow-group-title"></span><span class="workflow-group-count"></span></header>`);
        this.groupEls.set(id, el);
        this.groupLayer.append(el);
      }
      el.style.width = `${g.collapsed ? 240 : g.width}px`;
      el.style.height = `${g.collapsed ? 56 : g.height}px`;
      el.toggleAttribute("data-collapsed", !!g.collapsed);
      if (g.color)
        el.style.setProperty("--workflow-group-color", g.color);
      const title = dfDollar15(el).find(".workflow-group-title").get(0);
      if (title.textContent !== g.title)
        title.textContent = g.title;
      const toggle = dfDollar15(el).find(".workflow-group-toggle").get(0);
      toggle.textContent = g.collapsed ? "+" : "−";
      toggle.setAttribute("aria-label", `${g.collapsed ? "Expand" : "Collapse"} ${g.title}`);
      toggle.setAttribute("aria-expanded", String(!g.collapsed));
      toggle.disabled = this.readonly;
      const count = dfDollar15(el).find(".workflow-group-count").get(0);
      count.textContent = g.collapsed ? `${fmt(this.graph.groupMembers(id).length)} nodes` : "";
    }
  }
  toggleGroup(id) {
    const g = this.graph.groups.get(id);
    if (!g || this.readonly)
      return;
    this.attempt(() => this.graph.commit(g.collapsed ? "Expand group" : "Collapse group", [
      { kind: "groups", id, value: { ...g, collapsed: !g.collapsed } }
    ]));
  }
  listen() {
    const signal = this.abort.signal;
    const root = this.root;
    root.addEventListener("scroll", () => {
      if (root.scrollLeft || root.scrollTop)
        root.scrollTo(0, 0);
    }, { signal });
    root.addEventListener("pointerdown", (e) => this.down(e), { signal });
    root.addEventListener("pointermove", (e) => this.move(e), { signal });
    root.addEventListener("pointerup", (e) => this.up(e), { signal });
    root.addEventListener("pointercancel", (e) => {
      this.pointers.delete(e.pointerId);
      this.cancel();
    }, { signal });
    root.addEventListener("lostpointercapture", (e) => {
      this.pointers.delete(e.pointerId);
      if (this.gesture && this.gesture.pointer === e.pointerId)
        this.cancel();
    }, { signal });
    root.addEventListener("wheel", (e) => this.wheel(e), { passive: false, signal });
    root.addEventListener("keydown", (e) => this.key(e), { signal });
    root.addEventListener("keyup", (e) => {
      if (e.code === "Space")
        this.space = false;
    }, { signal });
    root.addEventListener("focusout", () => {
      this.space = false;
      this.request();
    }, { signal });
    root.addEventListener("dblclick", (e) => {
      const target = e.target;
      const id = target.closest("[data-node-id]")?.dataset.nodeId ?? (target === root ? this.pressedNode : undefined);
      if (id && this.graph.nodes.get(id)?.subgraph && !target.closest("input,textarea,select,button"))
        this.hooks.enter(id);
      else if (!id && !target.closest(".workflow-group,.workflow-controls,.workflow-minimap"))
        this.fit();
    }, { signal });
    root.addEventListener("click", (e) => {
      const target = e.target;
      const control = target.closest("[data-workflow-control]")?.dataset.workflowControl;
      if (control === "zoom-in")
        this.zoomBy(1.25);
      else if (control === "zoom-out")
        this.zoomBy(0.8);
      else if (control === "fit")
        this.fit();
      else if (control === "reset")
        this.zoomBy(1 / this.camera.zoom);
      const toggle = target.closest(".workflow-group-toggle");
      if (toggle)
        this.toggleGroup(toggle.closest("[data-group-id]").dataset.groupId);
      const port = target.closest("[data-port-id]");
      if (port && e.detail === 0 && !this.readonly) {
        const nodeEl = port.closest("[data-node-id]");
        this.portAction({ node: nodeEl.dataset.nodeId, port: port.dataset.portId }, port.dataset.direction);
      }
    }, { signal });
    root.addEventListener("dragover", (e) => {
      if (e.dataTransfer?.types.includes("application/x-workflow-type") && !this.readonly) {
        e.preventDefault();
        e.dataTransfer.dropEffect = "copy";
      }
    }, { signal });
    root.addEventListener("drop", (e) => {
      const type = e.dataTransfer?.getData("application/x-workflow-type");
      if (!type || this.readonly)
        return;
      e.preventDefault();
      this.addNode(type, this.toWorld(this.local(e)));
    }, { signal });
    this.mini.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      capture(this.mini, e.pointerId);
      this.miniJump(e);
    }, { signal });
    this.mini.addEventListener("pointermove", (e) => {
      if (this.mini.hasPointerCapture(e.pointerId))
        this.miniJump(e);
    }, { signal });
  }
  miniJump(e) {
    const r = this.mini.getBoundingClientRect();
    const b = this.miniBounds;
    this.flyTo({
      x: b.x + (e.clientX - r.left) / r.width * b.width,
      y: b.y + (e.clientY - r.top) / r.height * b.height
    });
  }
  addNode(type, at) {
    if (this.readonly)
      return;
    const definition = this.hooks.types(type);
    if (!definition) {
      this.report(`Unknown node type ${type}`);
      return;
    }
    const where = at ?? this.center();
    const node = createNode(definition, { x: where.x - (definition.width ?? 260) / 2, y: where.y - 40 }, this.hooks.layout());
    let added;
    this.attempt(() => {
      this.graph.addNode(node);
      this.select([node.id]);
      added = node.id;
    });
    return added;
  }
  down(e) {
    const target = e.target;
    if (e.button === 2)
      return;
    if (target.closest(".workflow-minimap,.workflow-controls,.workflow-group-toggle"))
      return;
    const edgeLabel = target.closest(".workflow-edge-label");
    if (edgeLabel?.dataset.edgeId && e.pointerType !== "touch") {
      e.preventDefault();
      this.select([], edgeLabel.dataset.edgeId);
      this.root.focus({ preventScroll: true });
      return;
    }
    const point = this.local(e);
    if (e.pointerType === "touch") {
      this.pointers.set(e.pointerId, point);
      if (this.pointers.size === 2) {
        this.cancel();
        const [a, b] = [...this.pointers.values()];
        this.gesture = {
          type: "pinch",
          pointer: e.pointerId,
          start: point,
          last: point,
          camera: { ...this.camera },
          original: [],
          pinch: {
            distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
            center: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }
          }
        };
        e.preventDefault();
        return;
      }
    }
    const port = target.closest("[data-port-id]");
    const nodeEl = target.closest("[data-node-id]");
    if (port && nodeEl && !this.readonly) {
      e.preventDefault();
      e.stopPropagation();
      this.portAction({ node: nodeEl.dataset.nodeId, port: port.dataset.portId }, port.dataset.direction);
      if (this.connection)
        this.connection.cursor = point;
      capture(this.root, e.pointerId);
      return;
    }
    if (target.closest('input,textarea,select,option,label,[contenteditable="true"],a,.property-grid,[data-workflow-field-edit]') || target.closest("button:not(.workflow-node-resize)"))
      return;
    this.root.focus({ preventScroll: true });
    this.pressedNode = nodeEl?.dataset.nodeId;
    let type = "pan";
    let original = [];
    if (nodeEl && !this.space && e.button !== 1) {
      const id = nodeEl.dataset.nodeId;
      if (e.shiftKey || e.metaKey || e.ctrlKey) {
        const next = new Set(this.selected);
        if (next.has(id))
          next.delete(id);
        else
          next.add(id);
        this.select(next);
      } else if (!this.selected.has(id))
        this.select([id]);
      if (!this.readonly) {
        type = target.closest(".workflow-node-resize") ? "resize" : "move";
        original = (type === "resize" ? [id] : [...this.selected]).map((nid) => this.graph.nodes.get(nid)).filter((n) => n && !n.locked);
      }
    } else if (e.shiftKey && !this.space)
      type = "marquee";
    const groupEl = target.closest(".workflow-group-header")?.closest("[data-group-id]");
    let movingGroups;
    if (groupEl && !this.readonly) {
      const gid = groupEl.dataset.groupId;
      const members = this.graph.groupMembers(gid);
      if (members.some((n) => n.locked)) {
        this.report("Unlock the group’s nodes before moving it");
        return;
      }
      this.select(members.map((n) => n.id));
      type = "move";
      original = members;
      movingGroups = [...this.graph.groups.values()].filter((g) => {
        let id = g.id;
        while (id) {
          if (id === gid)
            return true;
          id = this.graph.groups.get(id)?.parentId;
        }
        return false;
      });
    }
    if (!nodeEl && this.selectedEdge && !this.readonly) {
      const edge = this.graph.edges.get(this.selectedEdge);
      const index = edge?.points?.findIndex((p) => {
        const s = this.toScreen(p);
        return Math.hypot(s.x - point.x, s.y - point.y) < 9;
      }) ?? -1;
      if (index >= 0) {
        this.gesture = {
          type: "bend",
          pointer: e.pointerId,
          start: point,
          last: point,
          camera: { ...this.camera },
          original,
          bend: { edge: this.selectedEdge, index, points: structuredClone(edge.points) }
        };
        e.preventDefault();
        capture(this.root, e.pointerId);
        return;
      }
    }
    this.gesture = {
      type,
      pointer: e.pointerId,
      start: point,
      last: point,
      camera: { ...this.camera },
      original,
      groups: movingGroups
    };
    e.preventDefault();
    capture(this.root, e.pointerId);
    this.root.dataset.gesture = type;
  }
  move(e) {
    const point = this.local(e);
    if (this.pointers.has(e.pointerId))
      this.pointers.set(e.pointerId, point);
    if (this.connection) {
      this.connection.cursor = point;
      this.connectionMoved = true;
      this.drawOverlay();
    }
    const g = this.gesture;
    if (!g)
      return;
    if (g.type === "pinch") {
      if (this.pointers.size < 2)
        return;
      const [a, b] = [...this.pointers.values()];
      const distance = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const center = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const zoom = clamp3(g.camera.zoom * distance / g.pinch.distance, MIN_ZOOM, MAX_ZOOM);
      const world = this.toWorld(g.pinch.center, g.camera);
      this.setCamera({ x: center.x - world.x * zoom, y: center.y - world.y * zoom, zoom });
      return;
    }
    if (g.pointer !== e.pointerId)
      return;
    g.last = point;
    const dx = g.last.x - g.start.x;
    const dy = g.last.y - g.start.y;
    if (g.type === "pan")
      this.setCamera({ ...g.camera, x: g.camera.x + dx, y: g.camera.y + dy });
    else if (g.type === "move" || g.type === "resize") {
      const grid = 16;
      const snap = (v) => e.altKey ? v : Math.round(v / grid) * grid;
      const wx = dx / this.camera.zoom;
      const wy = dy / this.camera.zoom;
      for (const n of g.original) {
        const value = g.type === "move" ? { ...n, x: g.groups ? n.x + snap(wx) : snap(n.x + wx), y: g.groups ? n.y + snap(wy) : snap(n.y + wy) } : {
          ...n,
          width: Math.max(160, snap(n.width + wx)),
          height: Math.max(ENGINE.contentTop(n) + 40, snap(n.height + wy))
        };
        this.preview.set(n.id, value);
        this.pendingPreview.set(n.id, value);
        if (!ENGINE.collapsedAncestor(n, this.graph.groups))
          this.nodeIndex.set(n.id, value);
        const card = this.cards.get(n.id);
        if (card)
          this.updateCard(card, value);
      }
      this.pendingGroups = (g.groups ?? []).map((group) => {
        const value = { ...group, x: group.x + snap(wx), y: group.y + snap(wy) };
        this.groupPreview.set(group.id, value);
        this.groupIndex.set(group.id, {
          ...value,
          width: value.collapsed ? 240 : value.width,
          height: value.collapsed ? 56 : value.height
        });
        return { kind: "groups", id: group.id, value };
      });
      this.request();
    } else
      this.drawOverlay();
  }
  up(e) {
    this.pointers.delete(e.pointerId);
    if (this.connection && e.type === "pointerup") {
      const hit = this.root.ownerDocument.elementFromPoint(e.clientX, e.clientY);
      const portEl = hit?.closest("[data-port-id]");
      const nodeEl = hit?.closest("[data-node-id]");
      const from = this.connection.endpoint;
      if (portEl && nodeEl) {
        const endpoint = { node: nodeEl.dataset.nodeId, port: portEl.dataset.portId };
        if (endpoint.node !== from.node || endpoint.port !== from.port)
          this.portAction(endpoint, portEl.dataset.direction);
      } else if (nodeEl && nodeEl.dataset.nodeId !== from.node) {
        const port = this.bestPort(nodeEl.dataset.nodeId);
        if (port)
          this.portAction({ node: nodeEl.dataset.nodeId, port: port.id }, port.direction);
        else {
          this.report("No free port of a matching type on that node");
          this.endConnection();
        }
      } else if (this.connectionMoved)
        this.endConnection();
    }
    const g = this.gesture;
    if (g?.type === "pinch") {
      if (this.pointers.size < 2) {
        this.gesture = undefined;
        delete this.root.dataset.gesture;
      }
      return;
    }
    if (g && g.pointer !== e.pointerId)
      return;
    this.gesture = undefined;
    delete this.root.dataset.gesture;
    if (this.root.hasPointerCapture(e.pointerId))
      this.root.releasePointerCapture(e.pointerId);
    if (!g)
      return;
    const moved = Math.hypot(g.last.x - g.start.x, g.last.y - g.start.y) > 3;
    if (g.type === "move" || g.type === "resize") {
      const patches = [
        ...[...this.preview.values()].map((value) => ({ kind: "nodes", id: value.id, value })),
        ...[...this.groupPreview.values()].map((value) => ({ kind: "groups", id: value.id, value }))
      ];
      this.preview.clear();
      this.pendingPreview.clear();
      this.groupPreview.clear();
      this.pendingGroups = [];
      if (moved && patches.length) {
        try {
          this.graph.commit(g.type === "move" ? "Move nodes" : "Resize nodes", patches);
        } catch (err) {
          this.restore(g);
          this.report(err);
        }
      } else
        this.restore(g);
    } else if (g.type === "marquee") {
      const a = this.toWorld(g.start);
      const b = this.toWorld(g.last);
      const rect = {
        x: Math.min(a.x, b.x),
        y: Math.min(a.y, b.y),
        width: Math.abs(a.x - b.x),
        height: Math.abs(a.y - b.y)
      };
      this.select(this.nodeIndex.query(rect).ids);
    } else if (g.type === "bend" && g.bend) {
      const edge = this.graph.edges.get(g.bend.edge);
      if (edge && moved) {
        g.bend.points[g.bend.index] = this.toWorld(g.last);
        this.attempt(() => this.graph.commit("Move reroute point", [
          { kind: "edges", id: edge.id, value: { ...edge, points: g.bend.points } }
        ]));
      }
    } else if (g.type === "pan" && !moved) {
      const store = this.graph;
      const version = store.version;
      const point = this.toWorld(this.local(e));
      if (!this.pressedNode)
        this.renderer.hit(point, 8 / this.camera.zoom).then((id) => {
          if (this.dead || this.graph !== store || store.version !== version)
            return;
          this.select([], id);
          if (id && e.altKey && !this.readonly) {
            const edge = this.graph.edges.get(id);
            this.attempt(() => this.graph.commit("Add reroute point", [
              { kind: "edges", id, value: { ...edge, points: [...edge.points ?? [], point] } }
            ]));
          }
        });
    }
    this.drawOverlay();
    this.request();
  }
  connectionMoved = false;
  pressedNode;
  restore(g) {
    this.renderer.patch([
      ...g.original.map((value) => ({ kind: "nodes", id: value.id, value: this.sceneNode(value) })),
      ...(g.groups ?? []).map((value) => ({ kind: "groups", id: value.id, value }))
    ]);
    this.reindex();
  }
  bestPort(nodeId) {
    const pending = this.connection;
    const n = this.graph.nodes.get(nodeId);
    if (!pending || !n)
      return;
    const want = pending.direction === "output" ? "input" : "output";
    return n.ports.find((p) => {
      if (p.direction !== want)
        return false;
      const endpoint = { node: nodeId, port: p.id };
      return want === "input" ? !this.graph.canConnect(pending.endpoint, endpoint, pending.replaceId) : !this.graph.canConnect(endpoint, pending.endpoint, pending.replaceId);
    });
  }
  markCompatible(card) {
    const pending = this.connection;
    for (const el of dfDollar15(card.ports).children("[data-port-id]").toArray()) {
      if (!pending) {
        delete el.dataset.compatible;
        continue;
      }
      const endpoint = { node: card.el.dataset.nodeId, port: el.dataset.portId };
      const ok = el.dataset.direction !== pending.direction && endpoint.node !== pending.endpoint.node && !(el.dataset.direction === "input" ? this.graph.canConnect(pending.endpoint, endpoint, pending.replaceId) : this.graph.canConnect(endpoint, pending.endpoint, pending.replaceId));
      el.dataset.compatible = String(ok);
    }
  }
  endConnection() {
    this.connection = undefined;
    this.connectionMoved = false;
    delete this.root.dataset.connecting;
    for (const card of this.cards.values())
      this.markCompatible(card);
    this.drawOverlay();
  }
  portAction(endpoint, direction) {
    if (!this.connection) {
      const existing = direction === "input" ? [...this.graph.connections(endpoint)][0] : undefined;
      if (existing) {
        const edge = this.graph.edges.get(existing);
        this.connection = { endpoint: edge.source, direction: "output", replaceId: existing };
      } else
        this.connection = { endpoint, direction };
      this.root.dataset.connecting = this.connection.direction;
      this.live.textContent = "Pick a port to connect to. Escape cancels.";
      for (const card of this.cards.values())
        this.markCompatible(card);
      this.drawOverlay();
      return;
    }
    const pending = this.connection;
    if (pending.direction === direction) {
      if (pending.endpoint.node === endpoint.node && pending.endpoint.port === endpoint.port)
        return;
      this.report("Connect an output to an input");
      this.endConnection();
      return;
    }
    const source = direction === "output" ? endpoint : pending.endpoint;
    const target = direction === "input" ? endpoint : pending.endpoint;
    this.attempt(() => {
      const id = this.graph.connect(source, target, pending.replaceId);
      this.live.textContent = "Connected";
      this.select([], id);
    });
    this.endConnection();
  }
  cancel() {
    const g = this.gesture;
    this.gesture = undefined;
    delete this.root.dataset.gesture;
    if (this.connection)
      this.endConnection();
    this.preview.clear();
    this.pendingPreview.clear();
    this.groupPreview.clear();
    this.pendingGroups = [];
    this.revision++;
    if (g && (g.original.length || g.groups?.length))
      this.restore(g);
    this.drawOverlay();
    this.request();
  }
  wheel(e) {
    const target = e.target;
    const body = target.closest(".workflow-node-body, textarea, select");
    if (body && body.scrollHeight > body.clientHeight && !e.ctrlKey)
      return;
    if (target.closest(".workflow-minimap"))
      return;
    e.preventDefault();
    const scale = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? 400 : 1;
    if (!e.ctrlKey && !e.metaKey && (e.shiftKey || e.deltaMode === 0 && Math.abs(e.deltaX) > 0.5)) {
      const dx = e.shiftKey && !e.deltaX ? e.deltaY : e.deltaX;
      const dy = e.shiftKey && !e.deltaX ? 0 : e.deltaY;
      this.setCamera({ ...this.camera, x: this.camera.x - dx * scale, y: this.camera.y - dy * scale });
    } else
      this.zoomAt(this.local(e), Math.exp(-e.deltaY * scale * (e.ctrlKey ? 0.01 : 0.0015)));
  }
  copy() {
    this.clipboard = this.graph.fragment(this.selected);
  }
  paste(fragment = this.clipboard) {
    if (this.readonly || !fragment)
      return;
    this.attempt(() => this.select(this.graph.paste(fragment)));
  }
  duplicate() {
    if (!this.readonly && this.selected.size)
      this.paste(this.graph.fragment(this.selected));
  }
  removeSelection() {
    if (this.readonly)
      return;
    this.attempt(() => {
      if (this.selectedEdge)
        this.graph.deleteEdge(this.selectedEdge);
      else if (this.selected.size)
        this.graph.deleteNodes(this.selected);
      this.select([]);
    });
  }
  align(axis) {
    if (this.readonly)
      return;
    const nodes = [...this.selected].map((id) => this.graph.nodes.get(id)).filter((n) => n && !n.locked);
    if (nodes.length < 2)
      return;
    const coordinate = Math.min(...nodes.map((n) => n[axis]));
    this.attempt(() => this.graph.commit(axis === "x" ? "Align left" : "Align top", nodes.map((n) => ({ kind: "nodes", id: n.id, value: { ...n, [axis]: coordinate } }))));
  }
  key(e) {
    const target = e.target;
    if (target.closest('input,textarea,select,[contenteditable="true"],.property-grid,[data-workflow-field-edit]'))
      return;
    const mod = e.ctrlKey || e.metaKey;
    const k = e.key.toLowerCase();
    if (e.key === "Escape") {
      if (this.connection || this.gesture)
        e.preventDefault();
      this.cancel();
      return;
    }
    if (e.code === "Space" && target === this.root) {
      this.space = true;
      e.preventDefault();
      return;
    }
    if (mod && k === "a") {
      e.preventDefault();
      this.select(this.graph.nodes.keys());
    } else if (mod && k === "c") {
      e.preventDefault();
      this.copy();
    } else if (mod && k === "v") {
      e.preventDefault();
      this.paste();
    } else if (mod && k === "d") {
      e.preventDefault();
      this.duplicate();
    } else if (mod && (k === "z" || k === "y")) {
      e.preventDefault();
      if (this.readonly)
        return;
      this.cancel();
      if (e.shiftKey || k === "y")
        this.graph.redo();
      else
        this.graph.undo();
    } else if ((e.key === "Delete" || e.key === "Backspace") && !mod) {
      e.preventDefault();
      this.removeSelection();
    } else if (k === "f" && !mod) {
      e.preventDefault();
      this.fit(e.shiftKey && this.selected.size > 0);
    } else if ((e.key === "+" || e.key === "=") && !mod)
      this.zoomBy(1.25);
    else if (e.key === "-" && !mod)
      this.zoomBy(0.8);
    else if (e.key === "0" && !mod)
      this.zoomBy(1 / this.camera.zoom);
    else if (e.key === "Enter" && this.selected.size === 1) {
      const id = [...this.selected][0];
      if (this.graph.nodes.get(id)?.subgraph) {
        e.preventDefault();
        this.hooks.enter(id);
      }
    } else if (e.key.startsWith("Arrow") && this.selected.size && target === this.root) {
      e.preventDefault();
      if (e.altKey) {
        const first = [...this.selected][0];
        const forward = e.key === "ArrowRight" || e.key === "ArrowDown";
        for (const eid of this.graph.edgesFor(first)) {
          const edge = this.graph.edges.get(eid);
          if (forward && edge.source.node === first)
            return this.focusNode(edge.target.node);
          if (!forward && edge.target.node === first)
            return this.focusNode(edge.source.node);
        }
        return;
      }
      if (this.readonly)
        return;
      const amount = e.shiftKey ? 64 : 16;
      const dx = e.key === "ArrowLeft" ? -amount : e.key === "ArrowRight" ? amount : 0;
      const dy = e.key === "ArrowUp" ? -amount : e.key === "ArrowDown" ? amount : 0;
      this.attempt(() => this.graph.commit("Nudge nodes", [...this.selected].map((id) => this.graph.nodes.get(id)).filter((n) => n && !n.locked).map((n) => ({ kind: "nodes", id: n.id, value: { ...n, x: n.x + dx, y: n.y + dy } }))));
    }
  }
  drawOverlay() {
    const w = this.root.clientWidth;
    const h = this.root.clientHeight;
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    if (this.overlay.width !== Math.round(w * dpr))
      this.overlay.width = Math.round(w * dpr);
    if (this.overlay.height !== Math.round(h * dpr))
      this.overlay.height = Math.round(h * dpr);
    const ctx = this.overlay.getContext("2d");
    if (!ctx)
      return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = this.palette.accent;
    ctx.fillStyle = this.palette.accent;
    ctx.lineWidth = 2;
    const pending = this.connection;
    if (pending) {
      const n = this.graph.nodes.get(pending.endpoint.node);
      if (n) {
        const p = this.toScreen(ENGINE.portPosition(n, pending.endpoint.port));
        const q = pending.cursor ?? { x: p.x + (pending.direction === "output" ? 80 : -80), y: p.y };
        const arm = Math.max(40, Math.abs(q.x - p.x) / 2) * (pending.direction === "output" ? 1 : -1);
        ctx.setLineDash([6, 5]);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.bezierCurveTo(p.x + arm, p.y, q.x - arm, q.y, q.x, q.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(q.x, q.y, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    const g = this.gesture;
    if (g?.type === "marquee") {
      ctx.globalAlpha = 0.12;
      ctx.fillRect(g.start.x, g.start.y, g.last.x - g.start.x, g.last.y - g.start.y);
      ctx.globalAlpha = 1;
      ctx.lineWidth = 1;
      ctx.strokeRect(g.start.x + 0.5, g.start.y + 0.5, g.last.x - g.start.x, g.last.y - g.start.y);
    }
    const points = g?.bend ? g.bend.points.map((p, i) => i === g.bend.index ? this.toWorld(g.last) : p) : this.graph.edges.get(this.selectedEdge ?? "")?.points;
    for (const p of points ?? []) {
      const s = this.toScreen(p);
      ctx.fillRect(s.x - 5, s.y - 5, 10, 10);
    }
  }
  drawMinimap() {
    if (this.mini.hidden)
      return;
    const W = 180;
    const H = 116;
    const dpr = Math.min(globalThis.devicePixelRatio || 1, 2);
    if (this.mini.width !== W * dpr) {
      this.mini.width = this.miniBase.width = W * dpr;
      this.mini.height = this.miniBase.height = H * dpr;
      this.miniDirty = true;
    }
    if (this.miniDirty) {
      this.miniDirty = false;
      const base = this.miniBase.getContext("2d");
      base.setTransform(dpr, 0, 0, dpr, 0, 0);
      base.clearRect(0, 0, W, H);
      const nodes = [...this.graph.nodes.values()];
      if (!nodes.length)
        this.miniBounds = { x: 0, y: 0, width: 1000, height: 640 };
      else {
        const pts = [];
        for (const n of nodes)
          pts.push(n, { x: n.x + n.width, y: n.y + n.height });
        const b = ENGINE.bounds(pts, 120);
        const scale = Math.min(W / b.width, H / b.height);
        b.x -= (W / scale - b.width) / 2;
        b.y -= (H / scale - b.height) / 2;
        b.width = W / scale;
        b.height = H / scale;
        this.miniBounds = b;
        base.fillStyle = this.palette.muted;
        base.globalAlpha = 0.55;
        const stride = Math.max(1, Math.ceil(nodes.length / 4000));
        for (let i = 0;i < nodes.length; i += stride) {
          const n = nodes[i];
          base.fillRect((n.x - b.x) * scale, (n.y - b.y) * scale, Math.max(1, n.width * scale), Math.max(1, n.height * scale));
        }
        base.globalAlpha = 1;
        base.fillStyle = this.palette.accent;
        for (const id of [...this.selected].slice(0, 500)) {
          const n = this.graph.nodes.get(id);
          if (n)
            base.fillRect((n.x - b.x) * scale, (n.y - b.y) * scale, Math.max(2, n.width * scale), Math.max(2, n.height * scale));
        }
      }
    }
    const ctx = this.mini.getContext("2d");
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, this.mini.width, this.mini.height);
    ctx.drawImage(this.miniBase, 0, 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const b = this.miniBounds;
    const scale = W / b.width;
    const box = ENGINE.viewport(this.camera, this.root.clientWidth, this.root.clientHeight);
    ctx.strokeStyle = this.palette.accent;
    ctx.lineWidth = 1.5;
    ctx.strokeRect((box.x - b.x) * scale, (box.y - b.y) * scale, box.width * scale, box.height * scale);
  }
  selectionChanged() {
    this.miniDirty = true;
  }
  visibleNodeIds() {
    const box = ENGINE.viewport(this.camera, this.root.clientWidth, this.root.clientHeight);
    return this.nodeIndex.query(box).ids;
  }
  destroy() {
    if (this.dead)
      return;
    this.dead = true;
    cancelAnimationFrame(this.raf);
    clearTimeout(this.viewTimer);
    clearTimeout(this.messageTimer);
    this.abort.abort();
    this.resize.disconnect();
    this.unsubscribe();
    this.renderer.destroy();
    for (const card of this.cards.values())
      this.attempt(() => card.view?.destroy());
    this.cards.clear();
    this.pool = [];
    this.viewport.remove();
    delete this.root.dataset.renderer;
    delete this.root.dataset.gesture;
    delete this.root.dataset.connecting;
  }
}
function localExecutor(types) {
  return {
    async run(document2, context) {
      const evaluate = async (doc, seeds, root) => {
        const store = new GraphStore(doc);
        const outputs = Object.create(null);
        let i = 0;
        for (const id of store.topologicalOrder()) {
          context.signal.throwIfAborted();
          const node = store.nodes.get(id);
          const inputs = Object.assign(Object.create(null), seeds[id]);
          for (const eid of store.edgesFor(id)) {
            const e = store.edges.get(eid);
            if (e.target.node !== id)
              continue;
            const value = outputs[e.source.node]?.[e.source.port];
            if (value === undefined)
              continue;
            (inputs[e.target.port] ??= []).push(value);
          }
          if (root)
            context.emit({ nodeId: id, state: { status: "running", progress: 0 } });
          if (node.subgraph) {
            const injected = Object.create(null);
            for (const p of node.subgraph.inputs ?? [])
              (injected[p.endpoint.node] ??= Object.create(null))[p.endpoint.port] = inputs[p.id] ?? [];
            const nested = await evaluate(node.subgraph, injected, false);
            outputs[id] = Object.create(null);
            for (const p of node.subgraph.outputs ?? []) {
              const v = nested[p.endpoint.node]?.[p.endpoint.port];
              if (v !== undefined)
                outputs[id][p.id] = v;
            }
          } else {
            const type = types(node.type);
            if (!type?.run)
              throw new Error(`No run handler for ${node.title} (${node.type})`);
            const progress = (value) => {
              if (root)
                context.emit({ nodeId: id, state: { status: "running", progress: clamp3(value, 0, 1) } });
            };
            outputs[id] = await type.run(structuredClone(node), { inputs, signal: context.signal, progress }) ?? {};
          }
          context.signal.throwIfAborted();
          if (root)
            context.emit({ nodeId: id, state: { status: "success", progress: 1, output: outputs[id] } });
          if (++i % 64 === 0)
            await new Promise((r) => setTimeout(r, 0));
        }
        return outputs;
      };
      await evaluate(document2, Object.create(null), true);
    }
  };
}
var GENERATED_TYPES = ["image", "latent", "text", "number"];
function generate(spec = {}) {
  const count = clamp3(Math.floor(spec.nodes ?? 1000), 1, 1e5);
  const want = clamp3(Math.floor(spec.edges ?? count * 2), 0, Math.min(1e6, count * 60));
  let seed = (spec.seed ?? 1) >>> 0 || 1;
  const rand = () => {
    seed ^= seed << 13;
    seed ^= seed >>> 17;
    seed ^= seed << 5;
    return (seed >>> 0) / 4294967296;
  };
  const perStage = clamp3(Math.floor(spec.stage ?? Math.ceil(Math.sqrt(count))), 1, count);
  const stages = Math.ceil(count / perStage);
  const doc = emptyDocument();
  doc.id = `generated-${count}`;
  doc.title = `${fmt(count)} nodes, ${fmt(want)} connections`;
  const ports = [
    ...GENERATED_TYPES.map((type) => ({
      id: `in-${type}`,
      label: type,
      direction: "input",
      type,
      maxConnections: 0
    })),
    ...GENERATED_TYPES.map((type) => ({ id: `out-${type}`, label: type, direction: "output", type }))
  ];
  const STEPS = ["Load", "Resize", "Encode", "Sample", "Decode", "Filter", "Blend", "Score", "Caption", "Save"];
  for (let i = 0;i < count; i++) {
    const stage = Math.floor(i / perStage);
    const row = i % perStage;
    doc.nodes.push({
      id: `n${i}`,
      type: "generated",
      title: `${STEPS[(stage + row) % STEPS.length]} ${i}`,
      x: stage * 360,
      y: row * 220,
      width: 240,
      height: 180,
      ports,
      data: { stage, index: i }
    });
  }
  if (stages > 1)
    for (let i = 0;i < want; i++) {
      const s = Math.floor(rand() * (stages - 1));
      const t = Math.min(stages - 1, s + 1 + Math.floor(rand() * rand() * 3));
      const a = s * perStage + Math.floor(rand() * perStage);
      const b = t * perStage + Math.floor(rand() * perStage);
      if (a >= count || b >= count)
        continue;
      const type = GENERATED_TYPES[Math.floor(rand() * GENERATED_TYPES.length)];
      doc.edges.push({
        id: `e${doc.edges.length}`,
        source: { node: `n${a}`, port: `out-${type}` },
        target: { node: `n${b}`, port: `in-${type}` }
      });
    }
  const seen = new Set;
  doc.edges = doc.edges.filter((e) => {
    const key = edgeKey(e);
    if (seen.has(key))
      return false;
    seen.add(key);
    return true;
  });
  const span = Math.floor(spec.groups ?? 0);
  if (span > 0)
    for (let s = 0, g = 0;s < stages; s += span, g++) {
      const id = `g${g}`;
      const x = s * 360 - 30;
      const width = Math.min(span, stages - s) * 360 - 120 + 60;
      doc.groups.push({
        id,
        title: `Stages ${s + 1}-${Math.min(stages, s + span)}`,
        x,
        y: -60,
        width,
        height: perStage * 220 + 50,
        ...spec.collapsed && g % 2 === 1 ? { collapsed: true } : {}
      });
      for (let i = s * perStage;i < Math.min(count, (s + span) * perStage); i++)
        doc.nodes[i].groupId = id;
    }
  return doc;
}
function fromComfy(prompt) {
  jsonValue(prompt);
  assert(isRecord(prompt), "Invalid ComfyUI prompt");
  const doc = emptyDocument();
  doc.id = "comfyui-prompt";
  doc.title = "Imported ComfyUI prompt";
  const map = new Map;
  Object.entries(prompt).forEach(([id, entry], i) => {
    const raw = entry;
    assert(isRecord(raw) && typeof raw.class_type === "string" && isRecord(raw.inputs), "Invalid ComfyUI node");
    const n = {
      id,
      type: `comfy:${entry.class_type}`,
      title: entry._meta?.title || entry.class_type,
      x: i % 4 * 360,
      y: Math.floor(i / 4) * 300,
      width: 260,
      height: 200,
      ports: [],
      data: { params: {} }
    };
    map.set(id, n);
    doc.nodes.push(n);
  });
  for (const [id, entry] of Object.entries(prompt)) {
    const n = map.get(id);
    for (const [key, value] of Object.entries(entry.inputs)) {
      if (Array.isArray(value) && value.length === 2 && typeof value[0] === "string" && typeof value[1] === "number") {
        const source = map.get(value[0]);
        assert(source && Number.isInteger(value[1]) && value[1] >= 0 && value[1] < 256, "Invalid ComfyUI output link");
        const out = `out:${value[1]}`;
        for (let slot = 0;slot <= value[1]; slot++)
          if (!source.ports.some((p) => p.id === `out:${slot}`))
            source.ports.push({ id: `out:${slot}`, label: `Output ${slot}`, direction: "output", type: "any" });
        n.ports.push({ id: `in:${key}`, label: key, direction: "input", type: "any" });
        doc.edges.push({
          id: `link-${doc.edges.length}`,
          source: { node: source.id, port: out },
          target: { node: id, port: `in:${key}` }
        });
      } else
        n.data.params[key] = value;
    }
  }
  for (const n of doc.nodes)
    n.height = Math.max(n.height, 110 + 26 * n.ports.length);
  return new GraphStore(doc).export();
}
function toComfy(document2) {
  const store = new GraphStore(document2);
  const prompt = Object.create(null);
  for (const n of store.nodes.values()) {
    assert(n.type.startsWith("comfy:") && !n.subgraph, "ComfyUI export needs imported comfy:* nodes");
    const params = n.data.params;
    assert(isRecord(params), "Invalid ComfyUI parameters");
    prompt[n.id] = {
      class_type: n.type.slice(6),
      inputs: structuredClone(params),
      _meta: { title: n.title }
    };
  }
  for (const e of store.edges.values()) {
    assert(e.source.port.startsWith("out:") && e.target.port.startsWith("in:"), "Invalid ComfyUI port");
    prompt[e.target.node].inputs[e.target.port.slice(3)] = [e.source.node, Number(e.source.port.slice(4))];
  }
  return prompt;
}
var object = (value, name) => {
  assert(isRecord(value), `Invalid ${name}`);
  return value;
};
var list2 = (value, name) => {
  assert(Array.isArray(value), `Invalid ${name}`);
  return value;
};
var word = (value, name) => {
  assert(typeof value === "string" && value.length > 0, `Invalid ${name}`);
  return value;
};
function fromGradio(raw) {
  jsonValue(raw);
  const input = object(raw, "Gradio workflow");
  assert(input.schema_version === "2", 'The Gradio adapter reads schema_version "2"');
  const doc = emptyDocument();
  doc.id = typeof input.id === "string" ? input.id : "gradio-workflow";
  doc.title = word(input.name, "Gradio name");
  const { references, operators, subjects, edges, ...metadata } = input;
  doc.metadata = { gradio: metadata };
  for (const [collection, role] of [
    [references, "reference"],
    [operators, "operator"],
    [subjects, "subject"]
  ])
    for (const value of list2(collection, role)) {
      const n = object(value, "Gradio node");
      const ports = [];
      const originalPorts = {};
      for (const [direction, values] of [
        ["input", n.inputs],
        ["output", n.outputs]
      ])
        for (const pv of list2(values, `${direction} ports`)) {
          const p = object(pv, "Gradio port");
          const id = `${direction}:${word(p.id, "port id")}`;
          const type = word(p.type, "port type");
          originalPorts[id] = p;
          ports.push({
            id,
            label: typeof p.label === "string" && p.label ? p.label : String(p.id),
            direction,
            type,
            optional: p.required !== true,
            ...type === "text" ? { accepts: ["markdown"] } : type === "markdown" ? { accepts: ["text"] } : {}
          });
        }
      const { inputs: _inputs, outputs: _outputs, data, x, y, width, height, ...extra } = n;
      doc.nodes.push({
        id: word(n.id, "node id"),
        type: `gradio:${role}`,
        title: word(n.label, "node label"),
        x: typeof x === "number" ? x : doc.nodes.length % 4 * 360,
        y: typeof y === "number" ? y : Math.floor(doc.nodes.length / 4) * 300,
        width: typeof width === "number" ? Math.max(160, width) : 260,
        height: typeof height === "number" ? Math.max(110 + 26 * ports.length, height) : Math.max(200, 110 + 26 * ports.length),
        ports,
        data: { values: data ?? {}, gradio: extra, gradioPorts: originalPorts }
      });
    }
  doc.edges = list2(edges, "Gradio edges").map((value) => {
    const e = object(value, "Gradio edge");
    return {
      id: word(e.id, "edge id"),
      source: { node: word(e.from_node_id, "source node"), port: `output:${word(e.from_port_id, "source port")}` },
      target: { node: word(e.to_node_id, "target node"), port: `input:${word(e.to_port_id, "target port")}` }
    };
  });
  return new GraphStore(doc).export();
}
function toGradio(document2) {
  const store = new GraphStore(document2);
  const result = {
    ...object(document2.metadata?.gradio ?? {}, "Gradio metadata"),
    schema_version: "2",
    id: document2.id,
    name: document2.title,
    references: [],
    operators: [],
    subjects: [],
    edges: []
  };
  for (const n of store.nodes.values()) {
    assert(n.type.startsWith("gradio:") && !n.subgraph, "Gradio export needs imported gradio:* nodes");
    const extra = object(n.data.gradio, "Gradio node metadata");
    const original = object(n.data.gradioPorts, "Gradio port metadata");
    const ports = (direction) => n.ports.filter((p) => p.direction === direction).map((p) => ({
      ...original[p.id] ? object(original[p.id], "port metadata") : {},
      id: p.id.slice(direction.length + 1),
      label: p.label ?? p.id,
      type: p.type,
      required: !p.optional
    }));
    const value = {
      ...extra,
      id: n.id,
      label: n.title,
      data: n.data.values ?? {},
      inputs: ports("input"),
      outputs: ports("output"),
      x: n.x,
      y: n.y,
      width: n.width,
      height: n.height
    };
    const collection = n.type === "gradio:reference" ? "references" : n.type === "gradio:operator" ? "operators" : n.type === "gradio:subject" ? "subjects" : "";
    assert(collection, "Unknown Gradio role");
    result[collection].push(value);
  }
  result.edges = [...store.edges.values()].map((e) => ({
    id: e.id,
    from_node_id: e.source.node,
    from_port_id: e.source.port.slice(7),
    to_node_id: e.target.node,
    to_port_id: e.target.port.slice(6),
    type: store.nodes.get(e.source.node).ports.find((p) => p.id === e.source.port).type
  }));
  return result;
}
function readAny(raw) {
  assert(isRecord(raw), "Not a workflow");
  if (raw.schemaVersion !== undefined)
    return raw;
  if (raw.schema_version !== undefined)
    return fromGradio(raw);
  return fromComfy(raw);
}
var OUTLETS = ["palette", "outline", "inspector", "breadcrumb"];
var live = new Set;
var typesVersion = 0;

class Workflow {
  el;
  canvas;
  types = new Map;
  edgeTypes = new Map;
  stack = [];
  execution = null;
  runAbort = null;
  layoutAbort = null;
  outletsTimer = 0;
  inspectedKey = "";
  inspectedGraph = null;
  attrObserver;
  writing = false;
  themeObserver;
  offTheme;
  file;
  failed = "";
  constructor(el) {
    this.el = el;
    this.readTypes();
    let store;
    try {
      store = new GraphStore(this.readSource());
    } catch (e) {
      this.failed = e.message;
      store = new GraphStore;
    }
    el.setAttribute("role", "application");
    el.setAttribute("aria-roledescription", "workflow editor");
    if (!el.hasAttribute("tabindex"))
      el.tabIndex = 0;
    this.canvas = new Canvas(el, store, {
      readonly: el.hasAttribute("data-readonly"),
      worker: el.dataset.worker !== "none",
      minimap: el.dataset.minimap !== "none",
      controls: el.dataset.controls !== "none"
    }, {
      types: (type) => this.type(type),
      typesVersion: () => typesVersion,
      change: (change) => this.changed(change),
      select: () => this.selected(),
      view: () => this.emit("workflow-view"),
      frame: () => this.scheduleOutputs(),
      error: (message) => this.emit("workflow-error", message),
      enter: (id) => this.enter(id),
      write: (id, data) => void this.writeData(id, data),
      edit: (id, key) => void this.editField(id, key),
      layout: () => this.layout(),
      edgeType: (name) => this.edgeTypes.get(name) ?? globalEdgeTypes.get(name)
    });
    this.file = el.ownerDocument.createElement("input");
    this.file.type = "file";
    this.file.accept = ".json,application/json";
    this.file.hidden = true;
    this.file.setAttribute("data-ce-chrome", "");
    this.file.addEventListener("change", () => void this.importFile());
    this.canvas.viewport.append(this.file);
    if (this.failed)
      this.canvas.report(`The workflow could not be read: ${this.failed}`);
    this.attrObserver = new MutationObserver(() => {
      if (this.writing)
        return;
      const c = configOf3(el);
      this.canvas.setReadonly(el.hasAttribute("data-readonly"));
      this.canvas.select(c.selected, c.edge ?? undefined);
      this.refreshOutlets();
    });
    this.attrObserver.observe(el, {
      attributes: true,
      attributeFilter: ["data-readonly", "data-selected", "data-selected-edge"]
    });
    const initial = configOf3(el);
    if (initial.selected.length || initial.edge)
      this.canvas.select(initial.selected, initial.edge ?? undefined);
    const theme = () => this.canvas.refreshTheme();
    this.themeObserver = new MutationObserver(theme);
    this.themeObserver.observe(el.ownerDocument.documentElement, {
      attributes: true,
      attributeFilter: ["class", "style", "data-theme"]
    });
    el.ownerDocument.addEventListener("defuss-theme-change", theme);
    this.offTheme = () => el.ownerDocument.removeEventListener("defuss-theme-change", theme);
    live.add(this);
    this.canvas.ready.then(() => {
      if (el.dataset.camera) {
        const [x, y, zoom] = el.dataset.camera.split(/[\s,]+/).map(Number);
        if ([x, y, zoom].every(Number.isFinite))
          this.canvas.setCamera({ x, y, zoom });
        else
          this.canvas.fit();
      } else
        this.canvas.fit();
      el.dataset.workflowStatus = this.failed ? "error" : "ready";
      this.refreshOutlets();
    });
    this.canvas.fit();
    this.refreshOutlets();
  }
  readSource() {
    const script = dfDollar15(this.el).children("script.workflow-source").get(0);
    if (script?.textContent?.trim()) {
      const doc = readAny(JSON.parse(script.textContent));
      return doc;
    }
    if (this.el.dataset.generate)
      return generate({
        nodes: Number(this.el.dataset.generate),
        edges: this.el.dataset.edges ? Number(this.el.dataset.edges) : undefined,
        seed: this.el.dataset.seed ? Number(this.el.dataset.seed) : undefined,
        stage: this.el.dataset.stage ? Number(this.el.dataset.stage) : undefined,
        groups: this.el.dataset.groups ? Number(this.el.dataset.groups) : undefined,
        collapsed: this.el.hasAttribute("data-collapsed")
      });
    return emptyDocument();
  }
  readTypes() {
    for (const script of dfDollar15(this.el).children("script.workflow-types").toArray()) {
      try {
        const list = JSON.parse(script.textContent || "[]");
        for (const t of Array.isArray(list) ? list : [list]) {
          const checked = checkType(t);
          this.types.set(checked.type, checked);
        }
      } catch (e) {
        console.error("workflow: invalid node types", e);
      }
    }
  }
  type(type) {
    const local = this.types.get(type);
    const global = globalTypes.get(type);
    if (!local || !global)
      return local ?? global;
    const fields = local.fields && global.fields ? local.fields.map((field) => {
      const lender = global.fields.find((g) => g.key === field.key);
      return lender ? { ...lender, ...field } : field;
    }) : local.fields ?? global.fields;
    return { ...global, ...local, fields, run: local.run ?? global.run, mount: local.mount ?? global.mount };
  }
  layout() {
    return this.el.dataset.layout === "list" ? "list" : "controls";
  }
  location() {
    return this.stack.map((f) => f.nodeId);
  }
  writeData(id, data) {
    if (this.canvas.readonly)
      return false;
    const node = this.graph.nodes.get(id);
    if (!node)
      return false;
    const changed = Object.keys(data).filter((k) => JSON.stringify(node.data[k]) !== JSON.stringify(data[k]));
    if (!changed.length)
      return true;
    let ok = false;
    this.canvas.attempt(() => {
      this.graph.updateNode(id, { data: { ...node.data, ...data } }, `Edit ${node.title || id}: ${changed.join(", ")}`);
      ok = true;
    });
    if (!ok)
      return false;
    const path = this.location();
    for (const key of changed)
      this.el.dispatchEvent(new CustomEvent("workflow-field-change", {
        bubbles: true,
        detail: {
          nodeId: id,
          key,
          value: structuredClone(data[key]),
          oldValue: node.data[key] === undefined ? undefined : structuredClone(node.data[key]),
          path
        }
      }));
    return true;
  }
  field(id, key) {
    const node = this.graph.nodes.get(id);
    return node ? this.type(node.type)?.fields?.find((f) => f.key === key) : undefined;
  }
  async editField(id, key) {
    const node = this.graph.nodes.get(id);
    const field = this.field(id, key);
    if (!node || !field)
      return false;
    if (!customEditor(field))
      return this.canvas.focusField(id, key);
    if (this.canvas.readonly)
      return false;
    const value = node.data[key] === undefined ? undefined : structuredClone(node.data[key]);
    const asked = new CustomEvent("workflow-field-edit", {
      bubbles: true,
      cancelable: true,
      detail: { nodeId: id, key, value, path: this.location() }
    });
    if (!this.el.dispatchEvent(asked) || !field.edit)
      return false;
    const graph = this.graph;
    let next;
    try {
      next = await field.edit(value, {
        node,
        field,
        runtime: this.canvas.getRuntime(id),
        workflow: this.el,
        readonly: false,
        custom: true
      });
    } catch (e) {
      this.canvas.report(e);
      return false;
    }
    if (next === undefined || this.graph !== graph || !graph.nodes.has(id))
      return false;
    return this.writeData(id, { [key]: next });
  }
  tree() {
    const rows = [];
    const levels = [...this.stack.map((f) => f.graph), this.graph];
    const entered = this.location();
    const walk = (nodes, groups, depth, prefix, parent) => {
      const level = prefix.join("/");
      const known = new Set;
      const groupList = [...groups];
      for (const g of groupList)
        known.add(g.id);
      for (const g of groupList)
        rows.push({
          id: `${level}#${g.id}`,
          parentId: g.parentId && known.has(g.parentId) ? `${level}#${g.parentId}` : parent,
          title: g.title,
          kind: "group",
          type: "group",
          path: [...prefix]
        });
      for (const n of nodes) {
        const path = [...prefix, n.id];
        const id = path.join("/");
        rows.push({
          id,
          parentId: n.groupId && known.has(n.groupId) ? `${level}#${n.groupId}` : parent,
          title: n.title,
          kind: n.subgraph ? "subworkflow" : "node",
          type: n.type,
          path
        });
        if (!n.subgraph)
          continue;
        const live = depth >= 0 && entered[depth] === n.id ? levels[depth + 1] : undefined;
        if (live)
          walk(live.nodes.values(), live.groups.values(), depth + 1, path, id);
        else
          walk(n.subgraph.nodes, n.subgraph.groups ?? [], -1, path, id);
      }
    };
    walk(levels[0].nodes.values(), levels[0].groups.values(), 0, [], null);
    return rows;
  }
  reveal(path, camera) {
    if (!path.length)
      return false;
    const way = path.slice(0, -1);
    const id = path[path.length - 1];
    const here = this.location();
    let common = 0;
    while (common < here.length && common < way.length && here[common] === way[common])
      common++;
    if (here.length > common)
      this.leave(here.length - common);
    for (let i = common;i < way.length; i++) {
      if (!this.graph.nodes.get(way[i])?.subgraph)
        return false;
      this.enter(way[i]);
    }
    if (!this.graph.nodes.has(id))
      return false;
    if (camera)
      this.canvas.focusNode(id, false);
    else
      this.canvas.select([id]);
    return true;
  }
  register(definition) {
    const checked = checkType(definition);
    this.types.set(checked.type, checked);
    typesVersion++;
    this.canvas.refreshTheme();
    this.refreshOutlets();
    return () => {
      if (this.types.get(checked.type) === checked)
        this.types.delete(checked.type);
      typesVersion++;
      this.canvas.refreshTheme();
      this.refreshOutlets();
    };
  }
  registerEdge(definition) {
    const checked = checkEdgeType(definition);
    this.edgeTypes.set(checked.type, checked);
    edgeTypesVersion++;
    this.canvas.refreshTheme();
    return () => {
      if (this.edgeTypes.get(checked.type) === checked)
        this.edgeTypes.delete(checked.type);
      edgeTypesVersion++;
      this.canvas.refreshTheme();
    };
  }
  setEdge(id, update) {
    const e = this.graph.edges.get(id);
    if (!e)
      return false;
    const next = { ...e, ...update, id: e.id, source: e.source, target: e.target };
    for (const k of Object.keys(next))
      if (next[k] === undefined || next[k] === null)
        delete next[k];
    validateEdge(next);
    this.graph.commit("Edit connection", [{ kind: "edges", id, value: next }]);
    return true;
  }
  allTypes() {
    return [...new Set([...globalTypes.keys(), ...this.types.keys()])].map((t) => this.type(t));
  }
  get graph() {
    return this.canvas.graph;
  }
  emit(name, message) {
    const el = this.el;
    if (name === "workflow-view") {
      el.dispatchEvent(new CustomEvent("workflow-view", {
        bubbles: true,
        detail: { camera: { ...this.canvas.camera } }
      }));
    } else if (name === "workflow-error") {
      el.dispatchEvent(new CustomEvent("workflow-error", { bubbles: true, detail: { message: message ?? "" } }));
    }
  }
  changed(change) {
    this.el.dispatchEvent(new CustomEvent("workflow-change", {
      bubbles: true,
      detail: { label: change.label, version: change.version, undo: change.undo, patches: change.patches }
    }));
    this.writeAttrs();
    this.refreshOutlets();
  }
  selected() {
    this.canvas.selectionChanged();
    this.writeAttrs();
    const { selected, edge } = configOf3(this.el);
    this.el.dispatchEvent(new CustomEvent("workflow-select", {
      bubbles: true,
      detail: { selected, edge, path: this.location() }
    }));
    this.refreshOutlets();
  }
  writeAttrs() {
    this.writing = true;
    applyMarkup14(this.el, this.canvas.readonly ? "readonly" : "default", {
      selected: [...this.canvas.selected],
      edge: this.canvas.selectedEdge ?? null
    });
    this.attrObserver?.takeRecords();
    this.writing = false;
  }
  setReadonly(on) {
    this.canvas.setReadonly(on);
    this.writeAttrs();
    this.refreshOutlets();
  }
  enter(id) {
    const n = this.graph.nodes.get(id);
    if (!n?.subgraph)
      return;
    let child;
    try {
      child = new GraphStore(n.subgraph);
    } catch (e) {
      this.canvas.report(e);
      return;
    }
    this.stack.push({ graph: this.graph, nodeId: id, camera: { ...this.canvas.camera } });
    this.canvas.setGraph(child);
    this.canvas.fit();
    this.navigated();
  }
  leave(levels = 1) {
    for (let i = 0;i < levels; i++) {
      const parent = this.stack.pop();
      if (!parent)
        break;
      if (!this.canvas.readonly && this.graph.version > 0)
        this.canvas.attempt(() => parent.graph.updateNode(parent.nodeId, { subgraph: this.graph.export() }, "Edit subworkflow"));
      this.canvas.setGraph(parent.graph);
      this.canvas.setCamera(parent.camera);
    }
    this.navigated();
  }
  navigated() {
    this.writeAttrs();
    this.el.dispatchEvent(new CustomEvent("workflow-navigate", { bubbles: true, detail: { path: this.path() } }));
    this.refreshOutlets();
  }
  path() {
    return [...this.stack.map((f) => f.graph.title), this.graph.title];
  }
  export() {
    let doc = this.graph.export();
    for (const frame of [...this.stack].reverse()) {
      const parent = frame.graph.export();
      const n = parent.nodes.find((x) => x.id === frame.nodeId);
      n.subgraph = doc;
      doc = parent;
    }
    return doc;
  }
  load(doc) {
    const store = new GraphStore(doc);
    this.cancelRun();
    this.layoutAbort?.abort();
    this.stack = [];
    this.canvas.setGraph(store);
    this.canvas.fit();
    this.navigated();
  }
  async arrange() {
    if (this.canvas.readonly)
      return;
    this.layoutAbort?.abort();
    const abort = new AbortController;
    this.layoutAbort = abort;
    const store = this.graph;
    const version = store.version;
    const doc = store.export();
    this.canvas.notify("Arranging…");
    try {
      const positions = await layoutPositions(doc, abort.signal);
      if (abort.signal.aborted || this.graph !== store || store.version !== version)
        return;
      store.commit("Arrange", layoutPatches(doc, new Map(positions)));
      this.canvas.fit();
      this.canvas.notify("Arranged");
    } catch (e) {
      if (!abort.signal.aborted)
        this.canvas.report(e);
    }
  }
  configure(options) {
    if ("execution" in options)
      this.execution = options.execution ?? null;
    this.refreshOutlets();
  }
  get running() {
    return !!this.runAbort;
  }
  cancelRun() {
    this.runAbort?.abort(new DOMException("Run cancelled", "AbortError"));
  }
  async run() {
    if (this.runAbort)
      return;
    const abort = new AbortController;
    this.runAbort = abort;
    const canvas = this.canvas;
    const store = this.graph;
    const doc = store.export();
    const adapter = this.execution ?? localExecutor((type) => this.type(type));
    const active = new Set(doc.nodes.map((n) => n.id));
    canvas.clearRuntime();
    const send = (e) => {
      if (abort.signal.aborted || !active.has(e.nodeId) || canvas.graph !== store)
        return;
      canvas.setRuntime(e.nodeId, e.state);
      this.el.dispatchEvent(new CustomEvent("workflow-node-state", {
        bubbles: true,
        detail: { nodeId: e.nodeId, state: e.state }
      }));
      if (e.state.status === "success" || e.state.status === "error" || e.state.status === "cancelled")
        active.delete(e.nodeId);
    };
    for (const id of active)
      canvas.setRuntime(id, { status: "queued" });
    this.el.dataset.running = "";
    this.el.setAttribute("aria-busy", "true");
    this.runEvent("running");
    this.refreshOutlets();
    let status = "done";
    let message;
    try {
      await Promise.race([
        adapter.run(structuredClone(doc), { signal: abort.signal, emit: send }),
        new Promise((_, reject) => abort.signal.addEventListener("abort", () => reject(abort.signal.reason), { once: true }))
      ]);
      for (const id of active)
        canvas.setRuntime(id, { status: "success" });
    } catch (error) {
      status = abort.signal.aborted ? "cancelled" : "error";
      message = error?.message ?? String(error);
      for (const id of active)
        canvas.setRuntime(id, { status: abort.signal.aborted ? "cancelled" : "error", message });
      if (status === "error")
        canvas.report(message);
    } finally {
      this.runAbort = null;
      delete this.el.dataset.running;
      this.el.removeAttribute("aria-busy");
      this.runEvent(status, message);
      this.refreshOutlets();
    }
  }
  runEvent(status, message) {
    this.el.dispatchEvent(new CustomEvent("workflow-run", {
      bubbles: true,
      detail: { status, ...message ? { message } : {} }
    }));
  }
  async importFile() {
    const selected = this.file.files?.[0];
    this.file.value = "";
    if (!selected)
      return;
    try {
      if (selected.size > 128 * 1024 * 1024)
        throw new Error("The file exceeds 128 MiB");
      this.load(readAny(JSON.parse(await selected.text())));
      this.canvas.notify(`Imported ${selected.name}`);
    } catch (e) {
      this.canvas.report(e);
    }
  }
  download() {
    const doc = this.export();
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = this.el.ownerDocument.createElement("a");
    a.href = url;
    a.download = `${(doc.title || "workflow").replace(/[^\w-]+/g, "-").toLowerCase()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  action(name, source) {
    const c = this.canvas;
    const edit = (fn) => {
      if (!c.readonly)
        c.attempt(fn);
    };
    switch (name) {
      case "undo":
        edit(() => this.graph.undo());
        break;
      case "redo":
        edit(() => this.graph.redo());
        break;
      case "fit":
        c.fit();
        break;
      case "fit-selection":
        c.fit(c.selected.size > 0);
        break;
      case "zoom-in":
        c.zoomBy(1.25);
        break;
      case "zoom-out":
        c.zoomBy(0.8);
        break;
      case "arrange":
        this.arrange();
        break;
      case "group":
        edit(() => {
          const id = this.graph.groupNodes(c.selected, source?.dataset.workflowTitle || "Group");
          c.notify(`Grouped as ${this.graph.groups.get(id).title}`);
        });
        break;
      case "ungroup": {
        const n = this.graph.nodes.get([...c.selected][0] ?? "");
        if (n?.groupId)
          edit(() => this.graph.ungroup(n.groupId));
        break;
      }
      case "collapse": {
        const n = this.graph.nodes.get([...c.selected][0] ?? "");
        if (n?.groupId)
          c.toggleGroup(n.groupId);
        break;
      }
      case "duplicate":
        c.duplicate();
        break;
      case "copy":
        c.copy();
        break;
      case "paste":
        c.paste();
        break;
      case "delete":
        c.removeSelection();
        break;
      case "select-all":
        c.select(this.graph.nodes.keys());
        break;
      case "align-left":
        c.align("x");
        break;
      case "align-top":
        c.align("y");
        break;
      case "run":
        this.run();
        break;
      case "cancel":
        this.cancelRun();
        break;
      case "parent":
        this.leave();
        break;
      case "top":
        this.leave(this.stack.length);
        break;
      case "enter":
        if (c.selected.size === 1)
          this.enter([...c.selected][0]);
        break;
      case "import":
        if (!c.readonly)
          this.file.click();
        break;
      case "export":
        this.download();
        break;
      case "readonly":
        this.setReadonly(!c.readonly);
        break;
      case "add":
        if (source?.dataset.workflowType)
          c.addNode(source.dataset.workflowType);
        break;
      default:
        c.report(`Unknown action ${name}`);
    }
  }
  find(selector) {
    const id = this.el.id;
    const outside = id ? dfDollar15(`[data-workflow-for="${CSS.escape(id)}"]`).toArray() : [];
    return outside.filter((o) => o.matches(selector));
  }
  scheduleOutputs() {
    if (this.outletsTimer)
      return;
    this.outletsTimer = globalThis.setTimeout(() => {
      this.outletsTimer = 0;
      this.renderOutputs();
    }, 120);
  }
  refreshOutlets() {
    this.renderOutputs();
    this.renderActions();
    for (const o of this.find('[data-workflow-outlet="palette"]'))
      this.renderPalette(o);
    for (const o of this.find('[data-workflow-outlet="outline"]'))
      this.renderOutline(o);
    for (const o of this.find('[data-workflow-outlet="inspector"]'))
      this.renderInspector(o);
    for (const o of this.find('[data-workflow-outlet="breadcrumb"]'))
      this.renderBreadcrumb(o);
  }
  renderOutputs() {
    const c = this.canvas;
    const s = c.stats;
    const values = {
      title: this.graph.title,
      nodes: fmt(this.graph.nodes.size),
      edges: fmt(this.graph.edges.size),
      groups: fmt(this.graph.groups.size),
      selection: c.selectedEdge ? "1 connection" : c.selected.size ? `${fmt(c.selected.size)} selected` : "Nothing selected",
      zoom: `${Math.round(c.camera.zoom * 100)}%`,
      drawn: s ? `${fmt(s.edges)} connections drawn${s.edgesTruncated ? " (sampled)" : ""}` : "",
      cards: s ? `${fmt(s.domNodes)} cards` : "",
      renderer: s ? s.renderer === "worker" ? "Worker canvas" : "Main-thread canvas" : "",
      frame: s ? `${s.drawMs.toFixed(1)} ms` : "",
      status: this.running ? "Running…" : c.live.textContent || "Ready",
      depth: String(this.stack.length)
    };
    for (const o of this.find("[data-workflow-output]")) {
      const key = o.dataset.workflowOutput;
      if (key in values && o.textContent !== values[key])
        o.textContent = values[key];
      if (key === "drawn")
        o.toggleAttribute("data-sampled", !!s?.edgesTruncated);
    }
  }
  renderActions() {
    const c = this.canvas;
    const ro = c.readonly;
    const single = c.selected.size === 1 ? this.graph.nodes.get([...c.selected][0]) : undefined;
    const disabled = {
      undo: ro || !this.graph.canUndo,
      redo: ro || !this.graph.canRedo,
      arrange: ro || !this.graph.nodes.size,
      group: ro || !c.selected.size,
      ungroup: ro || !single?.groupId,
      collapse: ro || !single?.groupId,
      duplicate: ro || !c.selected.size,
      delete: ro || !c.selected.size && !c.selectedEdge,
      paste: ro,
      "align-left": ro || c.selected.size < 2,
      "align-top": ro || c.selected.size < 2,
      "fit-selection": !c.selected.size,
      run: this.running || !this.graph.nodes.size,
      cancel: !this.running,
      parent: !this.stack.length,
      top: !this.stack.length,
      enter: !single?.subgraph,
      import: ro,
      add: ro
    };
    for (const b of this.find("[data-workflow-action]")) {
      const name = b.dataset.workflowAction;
      if (name in disabled)
        b.disabled = disabled[name];
      if (name === "readonly")
        b.setAttribute("aria-pressed", String(ro));
    }
  }
  renderPalette(o) {
    let listEl = dfDollar15(o).find(".workflow-palette-list").get(0);
    if (!listEl) {
      dfDollar15(o).html(`<div class="workflow-palette" data-ce-chrome><input class="input" data-size="sm" type="search" placeholder="Search node types" aria-label="Search node types" data-workflow-search="palette"><div class="workflow-palette-list" role="list"></div></div>`);
      listEl = dfDollar15(o).find(".workflow-palette-list").get(0);
    }
    const search = dfDollar15(o).find("[data-workflow-search]").get(0);
    const query = search.value.trim().toLowerCase();
    const ro = this.canvas.readonly;
    const only = (o.dataset.workflowTypes ?? "").split(/\s+/).filter(Boolean);
    const listed = (type) => !only.length || only.some((w) => w.endsWith("*") ? type.startsWith(w.slice(0, -1)) : type === w);
    const groups = new Map;
    for (const t of this.allTypes()) {
      if (!listed(t.type))
        continue;
      if (query && !`${t.label} ${t.type} ${t.description ?? ""} ${t.category ?? ""}`.toLowerCase().includes(query))
        continue;
      const key = t.category ?? "Nodes";
      if (!groups.has(key))
        groups.set(key, []);
      groups.get(key).push(t);
    }
    let markup = "";
    for (const [category, types] of groups) {
      markup += `<p class="workflow-palette-heading">${esc4(category)}</p>`;
      for (const t of types) {
        const accent = accentOf(t.color);
        markup += `<button type="button" class="workflow-palette-item" role="listitem" draggable="${!ro}" data-workflow-action="add" data-workflow-type="${esc4(t.type)}"${ro ? " disabled" : ""}` + `${accent ? ` style="--workflow-accent-color: ${esc4(accent)}"` : ""} title="Click to add, or drag onto the canvas">` + `<span class="workflow-palette-swatch" aria-hidden="true"></span><span class="workflow-palette-text"><strong>${esc4(t.label)}</strong>${t.description ? `<small>${esc4(t.description)}</small>` : ""}</span></button>`;
      }
    }
    if (!markup)
      markup = `<p class="workflow-muted">No node type matches.</p>`;
    dfDollar15(listEl).html(markup);
  }
  renderOutline(o) {
    let listEl = dfDollar15(o).find(".workflow-outline-list").get(0);
    if (!listEl) {
      dfDollar15(o).html(`<div class="workflow-outline" data-ce-chrome><input class="input" data-size="sm" type="search" placeholder="Find a node" aria-label="Find a node" data-workflow-search="outline"><div class="workflow-outline-list"></div></div>`);
      listEl = dfDollar15(o).find(".workflow-outline-list").get(0);
    }
    const search = dfDollar15(o).find("[data-workflow-search]").get(0);
    const query = search.value.trim().toLowerCase();
    const LIMIT = 100;
    let count = 0;
    let markup = "";
    const groups = [...this.graph.groups.values()].filter((g) => !query || g.title.toLowerCase().includes(query));
    if (groups.length) {
      markup += `<p class="workflow-palette-heading">Groups</p>`;
      for (const g of groups.slice(0, 50))
        markup += `<button type="button" class="workflow-outline-item" data-workflow-group="${esc4(g.id)}" aria-expanded="${!g.collapsed}"><span class="workflow-outline-icon" aria-hidden="true">${g.collapsed ? "▸" : "▾"}</span><span>${esc4(g.title)}</span><small>${fmt(this.graph.groupMembers(g.id).length)}</small></button>`;
    }
    markup += `<p class="workflow-palette-heading">Nodes</p>`;
    for (const n of this.graph.nodes.values()) {
      if (query && !`${n.title} ${n.id} ${n.type}`.toLowerCase().includes(query))
        continue;
      if (++count > LIMIT)
        continue;
      const current = this.canvas.selected.has(n.id);
      markup += `<button type="button" class="workflow-outline-item" data-workflow-node="${esc4(n.id)}"${current ? ' aria-current="true"' : ""}><span class="workflow-outline-icon" aria-hidden="true">${n.subgraph ? "⧉" : "•"}</span><span>${esc4(n.title)}</span><small>${esc4(n.type)}</small></button>`;
    }
    if (!count)
      markup += `<p class="workflow-muted">No node matches.</p>`;
    else if (count > LIMIT)
      markup += `<p class="workflow-muted">${fmt(LIMIT)} of ${fmt(count)} shown - search to narrow.</p>`;
    dfDollar15(listEl).html(markup);
  }
  renderBreadcrumb(o) {
    const path = this.path();
    const items = path.map((title, i) => {
      const last = i === path.length - 1;
      const up = path.length - 1 - i;
      return (i ? `<li class="breadcrumb-separator" aria-hidden="true">/</li>` : "") + `<li class="breadcrumb-item">${last ? `<span class="breadcrumb-page" aria-current="page">${esc4(title)}</span>` : `<button type="button" class="breadcrumb-link" data-workflow-up="${up}">${esc4(title)}</button>`}</li>`;
    }).join("");
    dfDollar15(o).html(`<nav class="breadcrumb" aria-label="Workflow path" data-ce-chrome><ol class="breadcrumb-list">${items}</ol></nav>`);
  }
  renderInspector(o) {
    const c = this.canvas;
    const store = this.graph;
    const ids = [...c.selected];
    const doc = o.ownerDocument;
    const key = JSON.stringify([ids, c.selectedEdge, store.version, c.readonly, this.stack.length]);
    if (o.contains(doc.activeElement) && doc.activeElement?.matches("input,textarea,select") && this.inspectedKey.startsWith(JSON.stringify([ids, c.selectedEdge]).slice(0, -1)))
      return;
    if (key === this.inspectedKey && store === this.inspectedGraph && dfDollar15(o).children("[data-ce-chrome]").get(0))
      return;
    this.inspectedKey = key;
    this.inspectedGraph = store;
    const ro = c.readonly ? " disabled" : "";
    const field = (label, control, id) => `<div class="workflow-inspector-field"><label class="label" for="${id}">${esc4(label)}</label>${control}</div>`;
    const base = (this.el.id || "workflow") + "-inspector";
    let body = "";
    if (c.selectedEdge) {
      const e = store.edges.get(c.selectedEdge);
      const from = store.nodes.get(e.source.node);
      const to = store.nodes.get(e.target.node);
      const port = from?.ports.find((p) => p.id === e.source.port);
      body = `<p class="workflow-inspector-kicker">Connection</p><h3 class="workflow-inspector-title">${esc4(from?.title)} → ${esc4(to?.title)}</h3>` + `<p class="workflow-muted"><code>${esc4(e.source.port)}</code> → <code>${esc4(e.target.port)}</code> · ${esc4(port?.type ?? "any")}</p>` + field("Route", `<select class="select" id="${base}-route" data-workflow-edit="route"${ro}>${["bezier", "orthogonal", "straight"].map((r) => `<option value="${r}"${(e.route ?? "bezier") === r ? " selected" : ""}>${r[0].toUpperCase() + r.slice(1)}</option>`).join("")}</select>`, `${base}-route`) + field("Label", `<input class="input" id="${base}-edge-label" data-workflow-edit="edge-label" value="${esc4(e.label ?? "")}"${ro}>`, `${base}-edge-label`) + field("Line", `<select class="select" id="${base}-dash" data-workflow-edit="dash"${ro}>${["solid", "dashed", "dotted"].map((r) => `<option value="${r}"${(e.dash ?? "solid") === r ? " selected" : ""}>${r[0].toUpperCase() + r.slice(1)}</option>`).join("")}</select>`, `${base}-dash`) + `<div class="workflow-inspector-actions"><button type="button" class="btn" data-variant="outline" data-size="sm" data-workflow-edit="clear-points"${ro || !e.points?.length ? " disabled" : ""}>Clear reroute points</button>` + `<button type="button" class="btn" data-variant="destructive" data-size="sm" data-workflow-edit="disconnect"${ro}>Disconnect</button></div>` + `<p class="workflow-muted">Alt-click the connection to add a reroute point, drag its square handles to move them.</p>`;
    } else if (ids.length === 1) {
      const n = store.nodes.get(ids[0]);
      const type = this.type(n.type);
      const json = JSON.stringify(n.data, null, 2);
      const edges = [...store.edgesFor(n.id)].slice(0, 50).map((id) => store.edges.get(id));
      body = `<p class="workflow-inspector-kicker">${esc4(type?.label ?? n.type)}</p><h3 class="workflow-inspector-title">${esc4(n.title)}</h3>` + field("Title", `<input class="input" id="${base}-title" data-workflow-edit="title" value="${esc4(n.title)}"${ro}>`, `${base}-title`) + `<div class="workflow-inspector-row"><input class="switch" type="checkbox" role="switch" id="${base}-locked" data-workflow-edit="locked"${n.locked ? " checked" : ""}${ro}><label for="${base}-locked">Lock position</label></div>` + field("Data (JSON)", `<textarea class="textarea workflow-json" id="${base}-data" rows="6" spellcheck="false" data-workflow-edit="data"${ro}>${esc4(json)}</textarea>`, `${base}-data`) + `<div class="workflow-inspector-actions"><button type="button" class="btn" data-variant="secondary" data-size="sm" data-workflow-edit="apply-data"${ro}>Apply data</button>` + (n.subgraph ? `<button type="button" class="btn" data-variant="outline" data-size="sm" data-workflow-action="enter">Open subworkflow</button>` : "") + (n.groupId ? `<button type="button" class="btn" data-variant="outline" data-size="sm" data-workflow-action="ungroup"${ro}>Ungroup</button>` : "") + `</div>` + `<p class="workflow-palette-heading">Ports</p><ul class="workflow-inspector-list">${n.ports.map((p) => `<li><span class="workflow-port-swatch" style="--workflow-port: ${ENGINE.typeIndex(p.type) >= 0 ? `var(--workflow-type-${ENGINE.typeIndex(p.type)})` : "var(--workflow-edge)"}" aria-hidden="true"></span>${p.direction === "input" ? "in" : "out"} <strong>${esc4(p.label ?? p.id)}</strong><code>${esc4(p.type)}</code><span class="workflow-muted">${store.connections({ node: n.id, port: p.id }).size}</span></li>`).join("")}</ul>` + `<p class="workflow-palette-heading">Connections (${fmt(store.edgesFor(n.id).size)})</p><div class="workflow-inspector-list">${edges.map((e) => {
        const other = store.nodes.get(e.source.node === n.id ? e.target.node : e.source.node);
        return `<button type="button" class="workflow-outline-item" data-workflow-select-edge="${esc4(e.id)}"><span class="workflow-outline-icon" aria-hidden="true">${e.source.node === n.id ? "→" : "←"}</span><span>${esc4(other?.title)}</span><small>${esc4(e.source.node === n.id ? e.source.port : e.target.port)}</small></button>`;
      }).join("")}</div>`;
    } else if (ids.length > 1) {
      body = `<p class="workflow-inspector-kicker">Selection</p><h3 class="workflow-inspector-title">${fmt(ids.length)} nodes</h3>` + `<div class="workflow-inspector-actions">` + `<button type="button" class="btn" data-variant="outline" data-size="sm" data-workflow-action="align-left"${ro}>Align left</button>` + `<button type="button" class="btn" data-variant="outline" data-size="sm" data-workflow-action="align-top"${ro}>Align top</button>` + `<button type="button" class="btn" data-variant="outline" data-size="sm" data-workflow-action="group"${ro}>Group</button>` + `<button type="button" class="btn" data-variant="outline" data-size="sm" data-workflow-action="fit-selection">Fit selection</button>` + `</div>`;
    } else {
      const k = (keys) => keys.length > 1 ? `<kbd class="kbd-group">${keys.map((x) => `<kbd class="kbd">${x}</kbd>`).join("")}</kbd>` : `<kbd class="kbd">${keys[0]}</kbd>`;
      const rows = [
        [["Drag"], "Pan; Shift-drag selects"],
        [["Wheel"], "Zoom; a trackpad pans"],
        [["⌘", "Z"], "Undo; ⇧ redoes"],
        [["⌘", "D"], "Duplicate"],
        [["⌘", "C"], "Copy; ⌘ V pastes"],
        [["F"], "Fit; ⇧ F the selection"],
        [["Del"], "Delete the selection"],
        [["Alt", "→"], "Follow a connection"],
        [["Esc"], "Cancel"]
      ];
      body = `<p class="workflow-inspector-kicker">${esc4(this.graph.title)}</p><h3 class="workflow-inspector-title">${fmt(store.nodes.size)} nodes, ${fmt(store.edges.size)} connections</h3>` + `<p class="workflow-muted">Select a node or a connection to inspect it. Drag from a port to connect; drop on a card to use its first free port that fits.</p>` + `<dl class="workflow-keys">${rows.map(([keys, what]) => `<dt>${k(keys)}</dt><dd>${esc4(what)}</dd>`).join("")}</dl>`;
    }
    dfDollar15(o).html(`<div class="workflow-inspector" data-ce-chrome>${body}</div>`);
  }
  edit(control) {
    const c = this.canvas;
    const store = this.graph;
    const what = control.dataset.workflowEdit;
    const id = [...c.selected][0];
    const node = id ? store.nodes.get(id) : undefined;
    c.attempt(() => {
      if (what === "title" && node)
        store.updateNode(node.id, { title: control.value.trim() || node.title }, "Rename");
      else if (what === "locked" && node)
        store.updateNode(node.id, { locked: control.checked }, "Lock");
      else if (what === "apply-data" && node) {
        const area = dfDollar15(control.closest(".workflow-inspector")).find('[data-workflow-edit="data"]').get(0);
        let parsed;
        try {
          parsed = JSON.parse(area.value);
        } catch {
          throw new Error("The data is not valid JSON");
        }
        assert(isRecord(parsed), "The data must be a JSON object");
        store.updateNode(node.id, { data: parsed }, "Edit data");
        c.notify("Data applied");
      } else if (c.selectedEdge) {
        const e = store.edges.get(c.selectedEdge);
        if (!e)
          return;
        if (what === "route")
          store.commit("Change route", [
            {
              kind: "edges",
              id: e.id,
              value: { ...e, route: control.value }
            }
          ]);
        else if (what === "edge-label" || what === "dash") {
          const value = control.value.trim();
          this.setEdge(e.id, what === "dash" ? { dash: value === "solid" ? undefined : value } : { label: value || undefined });
        } else if (what === "clear-points")
          store.commit("Clear reroute points", [{ kind: "edges", id: e.id, value: { ...e, points: [] } }]);
        else if (what === "disconnect")
          c.removeSelection();
      }
    });
  }
  destroy() {
    this.cancelRun();
    this.layoutAbort?.abort();
    clearTimeout(this.outletsTimer);
    this.attrObserver.disconnect();
    this.themeObserver.disconnect();
    this.offTheme();
    this.canvas.destroy();
    this.file.remove();
    live.delete(this);
    for (const kind of OUTLETS)
      for (const o of this.find(`[data-workflow-outlet="${kind}"]`))
        dfDollar15(o).children("[data-ce-chrome]").remove();
    delete this.el.dataset.workflowStatus;
  }
}
function configOf3(el) {
  const inst = el._workflow;
  return {
    selected: (el.getAttribute("data-selected") ?? "").split(/\s+/).filter(Boolean),
    edge: el.getAttribute("data-selected-edge") || null,
    camera: inst ? { ...inst.canvas.camera } : null
  };
}
var idList = (v) => Array.isArray(v) ? v.map(String) : typeof v === "string" ? v.split(/\s+/).filter(Boolean) : [];
function applyMarkup14(el, name, config) {
  el.toggleAttribute("data-readonly", name === "readonly");
  const selected = config.edge ? [] : idList(config.selected);
  if (selected.length)
    el.setAttribute("data-selected", selected.join(" "));
  else
    el.removeAttribute("data-selected");
  if (config.edge)
    el.setAttribute("data-selected-edge", config.edge);
  else
    el.removeAttribute("data-selected-edge");
}
function triggerStateChange15(el, name, config, incoming) {
  const inst = el._workflow;
  if (!inst) {
    applyMarkup14(el, name, config);
    return Promise.resolve();
  }
  const merged = { ...config };
  if (incoming && "selected" in incoming && idList(incoming.selected).length && !("edge" in incoming))
    merged.edge = null;
  inst.canvas.setReadonly(name === "readonly");
  inst.canvas.select(merged.edge ? [] : idList(merged.selected), merged.edge || undefined);
  if (incoming?.camera)
    inst.canvas.setCamera(incoming.camera);
  inst.writeAttrs();
  inst.refreshOutlets();
  return inst.canvas.ready;
}
var workflowApi = componentState({
  component: "workflow",
  states: workflowStates,
  mergeConfig: true,
  apply: (el, state, _previous, incoming) => triggerStateChange15(el, state.name, state.config, incoming),
  read: (el) => ({
    name: el.hasAttribute("data-readonly") ? "readonly" : "default",
    config: configOf3(el)
  }),
  markup: (el, state) => applyMarkup14(el, state.name, state.config),
  events: ["workflow-view"]
});
df$15.workflowApi = workflowApi;
df$15.workflowStates = workflowStates;
var instanceFor2 = (from) => {
  const host = from.closest("[data-workflow-for]");
  const id = host?.dataset.workflowFor;
  const el = id ? dfDollar15(`#${CSS.escape(id)}`).get(0) : from.closest(".workflow");
  return el?._workflow;
};
var docs = new WeakSet;
function delegate2(doc) {
  if (docs.has(doc))
    return;
  docs.add(doc);
  doc.addEventListener("click", (e) => {
    const target = e.target;
    if (!(target instanceof Element))
      return;
    const action = target.closest("[data-workflow-action]");
    if (action && !action.disabled) {
      const inst = instanceFor2(action);
      if (inst) {
        e.preventDefault();
        inst.action(action.dataset.workflowAction, action);
        return;
      }
    }
    const inst = instanceFor2(target);
    if (!inst)
      return;
    const node = target.closest("[data-workflow-node]");
    if (node)
      inst.canvas.focusNode(node.dataset.workflowNode);
    const group = target.closest("[data-workflow-group]");
    if (group)
      inst.canvas.toggleGroup(group.dataset.workflowGroup);
    const edge = target.closest("[data-workflow-select-edge]");
    if (edge)
      inst.canvas.select([], edge.dataset.workflowSelectEdge);
    const up = target.closest("[data-workflow-up]");
    if (up)
      inst.leave(Number(up.dataset.workflowUp) || 1);
    const edit = target.closest("button[data-workflow-edit]");
    if (edit)
      inst.edit(edit);
  });
  doc.addEventListener("change", (e) => {
    const target = e.target;
    if (!(target instanceof Element) || !target.matches("input[data-workflow-edit],select[data-workflow-edit]"))
      return;
    instanceFor2(target)?.edit(target);
  });
  doc.addEventListener("input", (e) => {
    const target = e.target;
    if (!(target instanceof Element) || !target.matches("[data-workflow-search]"))
      return;
    const inst = instanceFor2(target);
    const outlet = target.closest("[data-workflow-outlet]");
    if (!inst || !outlet)
      return;
    if (target.dataset.workflowSearch === "palette")
      inst.renderPalette(outlet);
    else
      inst.renderOutline(outlet);
  });
  doc.addEventListener("keydown", (e) => {
    const target = e.target;
    if (e.key !== "Enter" || !(target instanceof Element) || !target.matches('[data-workflow-search="palette"]'))
      return;
    const first = dfDollar15(target.closest("[data-workflow-outlet]")).find("[data-workflow-type]:not([disabled])").get(0);
    if (first) {
      e.preventDefault();
      instanceFor2(target)?.action("add", first);
    }
  });
  doc.addEventListener("dragstart", (e) => {
    const target = e.target;
    if (!(target instanceof Element))
      return;
    const item = target.closest("[data-workflow-type]");
    if (item && e.dataTransfer) {
      e.dataTransfer.setData("application/x-workflow-type", item.dataset.workflowType);
      e.dataTransfer.effectAllowed = "copy";
    }
  });
}
var resolveTarget = (target) => typeof target === "string" ? dfDollar15(target).get(0) ?? null : target;
var need = (target) => {
  const inst = resolveTarget(target)?._workflow;
  if (!inst)
    throw new Error("workflow: the element is not initialized");
  return inst;
};
df$15.workflow = {
  register(scope, definition) {
    if (scope === "global") {
      const checked = checkType(definition);
      globalTypes.set(checked.type, checked);
      typesVersion++;
      for (const inst of live)
        inst.refreshOutlets();
      for (const inst of live)
        inst.canvas.refreshTheme();
      return () => {
        if (globalTypes.get(checked.type) === checked)
          globalTypes.delete(checked.type);
        typesVersion++;
        for (const inst of live)
          inst.refreshOutlets();
      };
    }
    return need(scope).register(definition);
  },
  registerEdge(scope, definition) {
    if (scope === "global") {
      const checked = checkEdgeType(definition);
      globalEdgeTypes.set(checked.type, checked);
      edgeTypesVersion++;
      for (const inst of live)
        inst.canvas.refreshTheme();
      return () => {
        if (globalEdgeTypes.get(checked.type) === checked)
          globalEdgeTypes.delete(checked.type);
        edgeTypesVersion++;
        for (const inst of live)
          inst.canvas.refreshTheme();
      };
    }
    return need(scope).registerEdge(definition);
  },
  setEdge(target, id, update) {
    return need(target).setEdge(id, update);
  },
  load(target, document2) {
    need(target).load(readAny(document2));
  },
  export(target) {
    return need(target).export();
  },
  addNode(target, type, at) {
    return need(target).canvas.addNode(type, at);
  },
  node(target, type, at, overrides) {
    const inst = need(target);
    const definition = inst.type(type);
    if (!definition)
      throw new Error(`Unknown node type ${type}`);
    const n = createNode(definition, at, inst.layout());
    const { data, ...rest } = overrides ?? {};
    return { ...n, ...rest, data: { ...n.data, ...data } };
  },
  connect(target, source, to) {
    return need(target).graph.connect(source, to);
  },
  commit(target, label, patches) {
    need(target).graph.commit(label, patches);
  },
  undo(target) {
    need(target).graph.undo();
  },
  redo(target) {
    need(target).graph.redo();
  },
  history(target) {
    return need(target).graph.history();
  },
  travel(target, at) {
    const inst = need(target);
    if (!inst.canvas.readonly)
      inst.canvas.attempt(() => inst.graph.travel(at));
  },
  select(target, ids, edge) {
    need(target).canvas.select(edge ? [] : ids, edge);
  },
  focus(target, id) {
    need(target).canvas.focusNode(id);
  },
  setField(target, id, key, value) {
    return need(target).writeData(id, { [key]: value });
  },
  getField(target, id, key) {
    const v = need(target).graph.nodes.get(id)?.data[key];
    return v === undefined ? undefined : structuredClone(v);
  },
  editField(target, id, key) {
    return need(target).editField(id, key);
  },
  tree(target) {
    return need(target).tree();
  },
  reveal(target, path, options) {
    return need(target).reveal(path, !!options?.camera);
  },
  fit(target, selection) {
    need(target).canvas.fit(!!selection);
  },
  camera(target, camera) {
    const inst = need(target);
    if (camera)
      inst.canvas.setCamera(camera);
    return { ...inst.canvas.camera };
  },
  arrange(target) {
    return need(target).arrange();
  },
  run(target) {
    return need(target).run();
  },
  cancel(target) {
    need(target).cancelRun();
  },
  setRuntime(target, id, state) {
    need(target).canvas.setRuntime(id, state);
  },
  configure(target, options) {
    need(target).configure(options);
  },
  enter(target, id) {
    need(target).enter(id);
  },
  leave(target, levels) {
    need(target).leave(levels ?? 1);
  },
  stats(target) {
    const s = need(target).canvas.stats;
    return s ? { ...s } : null;
  },
  action(target, name) {
    need(target).action(name);
  },
  generate(spec) {
    return generate(spec);
  },
  validate(document2) {
    try {
      new GraphStore(document2);
      return null;
    } catch (e) {
      return e.message;
    }
  },
  fromComfy(prompt) {
    return fromComfy(prompt);
  },
  toComfy(document2) {
    return toComfy(document2);
  },
  fromGradio(workflow) {
    return fromGradio(workflow);
  },
  toGradio(document2) {
    return toGradio(document2);
  },
  destroy(target) {
    const el = resolveTarget(target);
    const inst = el?._workflow;
    if (!el || !inst)
      return;
    inst.destroy();
    el._workflow = undefined;
    unbindComponent(el);
    delete el.api;
  }
};
function init15() {
  dfDollar15(".workflow:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    delegate2(el.ownerDocument);
    let inst;
    try {
      inst = new Workflow(el);
    } catch (e) {
      el.dataset.workflowStatus = "error";
      console.error("workflow: could not start", e);
      return;
    }
    el._workflow = inst;
    const config = configOf3(el);
    bindComponent(el, workflowApi, {
      name: el.hasAttribute("data-readonly") ? "readonly" : "default",
      config
    });
    inst.writeAttrs();
  });
  for (const inst of live)
    for (const kind of OUTLETS)
      for (const o of inst.find(`[data-workflow-outlet="${kind}"]`))
        if (!dfDollar15(o).children("[data-ce-chrome]").get(0)) {
          inst.refreshOutlets();
          break;
        }
  for (const inst of live)
    if (!inst.el.isConnected)
      df$15.workflow.destroy(inst.el);
}
init15();
new MutationObserver((records) => {
  if (records.some((r) => !r.target.closest?.(".workflow-viewport")))
    init15();
}).observe(document, { childList: true, subtree: true });

//# debugId=197AFF6FF788AC2064756E2164756E21
/* defuss-shadcn v0.10.2 runtime provenance: bundles defuss-morph@0.2.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599) + defuss-query@0.2.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599); full notice: NOTICE.txt */
//# sourceMappingURL=workflow-studio.js.map
