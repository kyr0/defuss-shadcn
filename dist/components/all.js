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

// src/components/accordion/accordion.ts
var df$ = defussGlobals();
var dfDollar = defussQuery();
var accordionStates = ["default", "all-open", "all-closed"];
function applyMarkup(accordion, stateName, defaults) {
  dfDollar(accordion).find(".accordion-item").each((i, item) => {
    const open = stateName === "all-open" ? true : stateName === "all-closed" ? false : defaults ? defaults[i] : null;
    if (open !== null && open !== undefined)
      dfDollar(item).attr("open", open ? "" : null);
  });
}
function triggerStateChange(accordion, stateName, _config) {
  const gen = (accordion._applyGen ?? 0) + 1;
  accordion._applyGen = gen;
  accordion._applying = true;
  applyMarkup(accordion, stateName, accordion._defaultOpen ?? []);
  setTimeout(() => {
    if (accordion._applyGen === gen)
      accordion._applying = false;
  }, 0);
}
var accordionApi = componentState({
  component: "accordion",
  states: accordionStates,
  apply: (accordion, state) => triggerStateChange(accordion, state.name, state.config),
  markup: (el, state) => applyMarkup(el, state.name, null)
});
df$.accordionApi = accordionApi;
df$.accordionStates = accordionStates;
function init() {
  dfDollar(".accordion:not([data-api])").each((_i, accordion) => {
    dfDollar(accordion).data("api", "");
    accordion._defaultOpen = dfDollar(accordion).find(".accordion-item").toArray().map((item) => item.open);
    bindComponent(accordion, accordionApi);
  });
  dfDollar('.accordion[data-type="single"]:not([data-init])').each((_i, accordion) => {
    dfDollar(accordion).data("init", "");
    const items = dfDollar(accordion).find(".accordion-item").toArray();
    const collapsible = dfDollar(accordion).attr("data-collapsible") != null;
    items.forEach((item) => {
      dfDollar(item).on("beforetoggle", (e) => {
        if (accordion._applying)
          return;
        if (e.newState !== "closed" || collapsible)
          return;
        if (!items.some((i) => i !== item && i.open))
          e.preventDefault();
      });
      dfDollar(item).on("toggle", () => {
        if (accordion._applying)
          return;
        if (item.open) {
          items.forEach((sibling) => {
            if (sibling !== item && sibling.open)
              sibling.open = false;
          });
        } else if (!collapsible) {
          if (!items.some((i) => i.open))
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
var dfDollar2 = defussQuery();
var alertDialogStates = ["default", "open"];
function applyMarkup2(el, stateName) {
  dfDollar2(el).attr("open", stateName === "open" ? "" : null);
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
var alertDialogApi = componentState({
  component: "alert-dialog",
  states: alertDialogStates,
  apply: (dialog, state) => triggerStateChange2(dialog, state.name, state.config),
  markup: (el, state) => applyMarkup2(el, state.name)
});
df$2.alertDialogApi = alertDialogApi;
df$2.alertDialogStates = alertDialogStates;
function init2() {
  dfDollar2("[data-alert-dialog-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar2("#" + CSS.escape(trigger.dataset.alertDialogTrigger)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog._trigger = trigger;
      dialog.showModal();
    });
  });
  dfDollar2("dialog.alert-dialog:not([data-init])").toArray().forEach((dialog) => {
    dialog.dataset.init = "";
    bindComponent(dialog, alertDialogApi);
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
    });
    dfDollar2(dialog).find("[data-alert-dialog-close]").toArray().forEach((btn) => {
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
var dfDollar3 = defussQuery();
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
  dfDollar3(root).find("[data-anim-canvas-go]").toArray().forEach((el) => {
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
  dfDollar3(slide).find("[data-df-entrance]").toArray().forEach((el) => {
    entrance(el, undefined, { delay: withOffset(el) });
  });
  dfDollar3(slide).find("[data-df-draw]").toArray().forEach((el) => {
    draw(el, { delay: withOffset(el) });
  });
  dfDollar3(slide).find("[data-count]").toArray().forEach((el) => {
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
function applyMarkup3(root, stateName, config = {}) {
  const slides = dfDollar3(root).find(".anim-canvas-slide").toArray();
  if (slides.length === 0)
    return;
  const overview = stateName === "overview" && config.value !== false;
  const active = slides.find((sl) => sl.id === config.slide) ?? slides.find((sl) => sl.hasAttribute("data-active")) ?? slides[0];
  dfDollar3(root).attr("data-overview", overview ? "" : null).attr("data-current-slide", active.id);
  for (const sl of slides) {
    const on = overview || sl === active;
    dfDollar3(sl).attr("data-active", sl === active ? "" : null).attr("inert", on ? null : "").attr("aria-hidden", on ? null : "true");
  }
  dfDollar3(root).find("[data-anim-canvas-go]").each((_i, el) => {
    const dir = el.getAttribute("data-anim-canvas-go");
    if (dir === "overview" || !(el instanceof HTMLButtonElement))
      return;
    dfDollar3(el).attr("disabled", active.dataset[dir] ? null : "");
  });
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
var animCanvasApi = componentState({
  component: "anim-canvas",
  states: animCanvasStates,
  apply: (root, state) => triggerStateChange3(root, state.name, state.config),
  read: (root, state) => {
    const ctx = root._animCanvas;
    return {
      name: root.dataset.stateName || "default",
      config: {
        ...state.config,
        slide: ctx?.active.id,
        overview: root.hasAttribute("data-overview")
      }
    };
  },
  markup: (el, state) => applyMarkup3(el, state.name, state.config)
});
df$3.animCanvasApi = animCanvasApi;
df$3.animCanvasStates = animCanvasStates;
function pickCanvas(target) {
  const focused = target instanceof HTMLElement ? target.closest(".anim-canvas") : null;
  if (focused)
    return focused;
  const all = Array.from(dfDollar3(".anim-canvas").toArray());
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
  dfDollar3(".anim-canvas:not([data-init])").toArray().forEach((root) => {
    root.dataset.init = "";
    bindComponent(root, animCanvasApi);
    let board = dfDollar3(root).find(":scope > .anim-canvas-board").get(0) ?? null;
    if (!board) {
      board = document.createElement("div");
      board.className = "anim-canvas-board";
      for (const slide of Array.from(dfDollar3(root).find(":scope > .anim-canvas-slide").toArray())) {
        dfDollar3(board).append(slide);
      }
      root.prepend(board);
    }
    const slides = dfDollar3(board).find(".anim-canvas-slide");
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
        const existing = pos.get(neighbor);
        if (existing) {
          if (existing.x !== np.x || existing.y !== np.y) {
            console.error(`anim-canvas: conflicting position for #${ref} - reached as (${np.x},${np.y}) from #${cur.id}, already placed at (${existing.x},${existing.y}); the relation map must be consistent`);
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
    dfDollar3(start).find("[data-count]").toArray().forEach((el) => {
      animateCount(el);
    });
  });
}
bindKeys();
init3();
new MutationObserver(init3).observe(document, { childList: true, subtree: true });

// src/components/autocomplete/autocomplete.ts
var df$4 = defussGlobals();
var dfDollar4 = defussQuery();
var autocompleteStates = ["default", "open", "loading", "empty", "error"];
var SHOWN = new Set(["open", "loading", "empty", "error"]);
var uid = 0;
var num = (v, fallback) => Number.isFinite(Number(v)) && v !== "" && v != null ? Number(v) : fallback;
var inputOf = (root) => dfDollar4(root).find(".autocomplete-input").get(0);
var popoverOf = (root) => dfDollar4(root).find(".autocomplete-popover").get(0);
var listOf = (root) => dfDollar4(root).find(".autocomplete-list").get(0);
function applyMarkup4(root, state) {
  dfDollar4(root).attr("data-state", state.name);
  const input = inputOf(root);
  if (input) {
    dfDollar4(input).attr("aria-expanded", SHOWN.has(state.name) ? "true" : "false").attr("aria-busy", state.name === "loading" ? "true" : null);
  }
}
function configOf(root) {
  const d = root.dataset;
  const [sortField, sortDir] = (d.sort || "").split(":");
  const base = {
    debounce: num(d.debounce, 200),
    minChars: num(d.minChars, 1),
    pageSize: num(d.pageSize, 20),
    url: d.url || null,
    labelField: d.labelField || "label",
    valueField: d.valueField || "id",
    searchField: d.searchField || null,
    match: d.match === "startsWith" ? "startsWith" : "contains",
    sorters: sortField ? [{ field: sortField, direction: sortDir === "desc" ? "desc" : "asc" }] : [],
    filters: []
  };
  return { ...base, ...root._config };
}
var labelOf = (cfg, record) => typeof cfg.label === "function" ? cfg.label(record) : String(record?.[cfg.labelField] ?? "");
var valueOf = (cfg, record) => typeof cfg.value === "function" ? cfg.value(record) : record?.[cfg.valueField];
function requestFor(cfg, query, page) {
  const field = cfg.searchField || cfg.labelField;
  return {
    query,
    filters: [...cfg.filters || [], ...query ? [{ field, op: cfg.match, value: query }] : []],
    sorters: cfg.sorters || [],
    page,
    pageSize: cfg.pageSize
  };
}
function normalize(answer, request) {
  const raw = Array.isArray(answer) ? { rows: answer } : answer || {};
  const rows = raw.rows ?? raw.items ?? raw.data ?? raw.results ?? [];
  const total = Number.isFinite(raw.total) ? raw.total : undefined;
  const hasMore = typeof raw.hasMore === "boolean" ? raw.hasMore : total !== undefined ? (request.page + 1) * request.pageSize < total : rows.length >= request.pageSize;
  return { rows, hasMore, total };
}
async function networkLoad(cfg, request, signal) {
  const client = cfg.client || {};
  let url;
  if (typeof cfg.url === "function")
    url = cfg.url(request);
  else {
    const params = new URLSearchParams({ q: request.query, page: String(request.page), pageSize: String(request.pageSize) });
    if (request.sorters[0])
      params.set("sort", `${request.sorters[0].field}:${request.sorters[0].direction || "asc"}`);
    url = `${cfg.url}${String(cfg.url).includes("?") ? "&" : "?"}${params}`;
  }
  const doFetch = client.fetch || globalThis.fetch.bind(globalThis);
  const response = await doFetch(url, { signal, headers: { accept: "application/json", ...client.headers } });
  if (!response.ok)
    throw new Error(`${response.status} ${response.statusText || "request failed"}`.trim());
  const json = await response.json();
  return client.parse ? client.parse(json, request) : json;
}
function localLoad(root, cfg, request) {
  if (!root._source || root._source.rows !== cfg.rows)
    root._source = dataSource(cfg.rows, { idField: cfg.valueField });
  const entries = root._source.query({ filters: request.filters, sorters: request.sorters }).entries;
  const start = request.page * request.pageSize;
  return { rows: entries.slice(start, start + request.pageSize).map((e) => e.row), total: entries.length };
}
function runLoad(root, cfg, request, signal) {
  if (typeof cfg.load === "function")
    return cfg.load(request, { signal });
  if (Array.isArray(cfg.rows))
    return localLoad(root, cfg, request);
  if (cfg.url)
    return networkLoad(cfg, request, signal);
  throw new Error("autocomplete: no data - configure rows, url or load");
}
function markMatch(el, label, query) {
  el.textContent = "";
  const at = query ? label.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (at < 0) {
    el.append(label);
    return;
  }
  const mark = document.createElement("mark");
  mark.className = "autocomplete-match";
  mark.textContent = label.slice(at, at + query.length);
  el.append(label.slice(0, at), mark, label.slice(at + query.length));
}
function appendOptions(root, rows) {
  const cfg = configOf(root);
  const list = listOf(root);
  const query = root._run.query;
  for (const record of rows) {
    const index = root._run.records.length;
    root._run.records.push(record);
    const option = document.createElement("div");
    option.className = "autocomplete-option";
    option.setAttribute("role", "option");
    option.id = `${root._uid}-opt-${index}`;
    option.dataset.index = String(index);
    option.setAttribute("aria-selected", "false");
    if (cfg.render)
      cfg.render(option, record, { query, index });
    else {
      const label = document.createElement("span");
      label.className = "autocomplete-label";
      markMatch(label, labelOf(cfg, record), query);
      option.append(label);
    }
    list.append(option);
  }
}
function setStatus(root, text) {
  const status = dfDollar4(root).find(".autocomplete-status").get(0);
  if (status)
    status.textContent = text;
}
function describe(root) {
  const run = root._run;
  const n = run.records.length;
  if (!n)
    return;
  const num = (v) => v.toLocaleString(textLocale(root));
  const total = run.total !== undefined ? ` of ${num(run.total)}` : "";
  setStatus(root, run.loadingMore ? `${num(n)}${total} · loading more…` : `${num(n)}${total}${run.hasMore ? " · scroll for more" : ""}`);
}
function activate2(root, index) {
  const run = root._run;
  const n = run.records.length;
  if (!n)
    return;
  run.active = Math.max(0, Math.min(n - 1, index));
  const input = inputOf(root);
  for (const option of dfDollar4(listOf(root)).children(".autocomplete-option").toArray()) {
    const on = Number(option.dataset.index) === run.active;
    option.toggleAttribute("data-active", on);
    if (on) {
      input.setAttribute("aria-activedescendant", option.id);
      option.scrollIntoView({ block: "nearest" });
    }
  }
  if (run.active >= n - 3)
    loadMore(root);
}
function abort(root) {
  root._controller?.abort();
  root._controller = null;
  clearTimeout(root._timer);
}
async function search(root, query) {
  abort(root);
  const cfg = configOf(root);
  const input = inputOf(root);
  root._run = { query, records: [], page: 0, hasMore: false, total: undefined, active: -1, loadingMore: false, seq: (root._run?.seq || 0) + 1 };
  listOf(root).textContent = "";
  input.removeAttribute("aria-activedescendant");
  if (query.length < cfg.minChars) {
    autocompleteApi.setState(root, "default");
    return;
  }
  setStatus(root, "Searching…");
  autocompleteApi.setState(root, "loading");
  await fetchPage(root, 0);
}
async function fetchPage(root, page) {
  const cfg = configOf(root);
  const run = root._run;
  const seq = run.seq;
  const controller = new AbortController;
  root._controller = controller;
  const request = requestFor(cfg, run.query, page);
  root.dispatchEvent(new CustomEvent("autocomplete-request", { bubbles: true, detail: { request } }));
  try {
    const answer = normalize(await runLoad(root, cfg, request, controller.signal), request);
    if (controller.signal.aborted || seq !== root._run.seq)
      return;
    run.page = page;
    run.hasMore = answer.hasMore;
    run.total = answer.total;
    run.loadingMore = false;
    appendOptions(root, answer.rows);
    if (!run.records.length) {
      setStatus(root, "");
      autocompleteApi.setState(root, "empty");
      return;
    }
    describe(root);
    if (root.store.value.name !== "open")
      autocompleteApi.setState(root, "open");
    if (run.active < 0)
      activate2(root, 0);
    const list = listOf(root);
    if (run.hasMore && list.scrollHeight <= list.clientHeight)
      loadMore(root);
  } catch (error) {
    if (controller.signal.aborted || error?.name === "AbortError" || seq !== root._run.seq)
      return;
    run.loadingMore = false;
    root._error = error;
    if (run.records.length) {
      setStatus(root, `Could not load more - ${error?.message || error}`);
      return;
    }
    setStatus(root, "");
    autocompleteApi.setState(root, "error", { message: String(error?.message || error) });
  } finally {
    if (root._controller === controller)
      root._controller = null;
  }
}
function loadMore(root) {
  const run = root._run;
  if (!run || !run.hasMore || run.loadingMore || root._controller)
    return;
  run.loadingMore = true;
  describe(root);
  fetchPage(root, run.page + 1);
}
function choose(root, index) {
  const record = root._run?.records[index];
  if (!record)
    return;
  const cfg = configOf(root);
  const label = labelOf(cfg, record);
  const value = valueOf(cfg, record);
  inputOf(root).value = label;
  const hidden = dfDollar4(root).find(".autocomplete-value").get(0);
  if (hidden)
    hidden.value = value == null ? "" : String(value);
  abort(root);
  autocompleteApi.setState(root, "default", { query: label, value: value ?? null, label });
  root.dispatchEvent(new CustomEvent("autocomplete-select", { bubbles: true, detail: { record, value, label } }));
}
function triggerStateChange4(root, state, incoming) {
  const popover = popoverOf(root);
  applyMarkup4(root, state);
  if (popover) {
    if (SHOWN.has(state.name)) {
      if (!popover.matches(":popover-open"))
        safeShowPopover(popover);
    } else if (popover.matches(":popover-open")) {
      try {
        popover.hidePopover();
      } catch {}
    }
  }
  if (state.name === "default") {
    abort(root);
    inputOf(root)?.removeAttribute("aria-activedescendant");
  }
  if (state.name === "error")
    setStatus(root, "");
  const message = dfDollar4(root).find(".autocomplete-error-text").get(0);
  if (message)
    message.textContent = state.name === "error" ? String(state.config.message || "Something went wrong.") : "";
  const typed = inputOf(root)?.value.trim() ?? "";
  if (state.name === "open" && incoming.query === undefined && !root._run?.records.length && typed) {
    queueMicrotask(() => search(root, typed));
  }
  if (typeof incoming.query === "string" && SHOWN.has(state.name) && incoming.query !== root._run?.query) {
    inputOf(root).value = incoming.query;
    queueMicrotask(() => search(root, incoming.query));
  }
}
var autocompleteApi = componentState({
  component: "autocomplete",
  states: autocompleteStates,
  mergeConfig: true,
  apply: (root, state, _previous, incoming) => triggerStateChange4(root, state, incoming),
  markup: (el, state) => applyMarkup4(el, state)
});
df$4.autocompleteApi = autocompleteApi;
df$4.autocompleteStates = autocompleteStates;
var resolve = (target) => typeof target === "string" ? dfDollar4(target).get(0) : target;
df$4.autocomplete = {
  configure(target, config = {}) {
    const root = resolve(target);
    root._config = { ...root._config, ...config };
    if (config.labelField)
      root._config.labelField = config.labelField;
    root._source = null;
  },
  search: (target, query) => {
    const root = resolve(target);
    inputOf(root).value = query;
    return search(root, query);
  },
  close: (target) => {
    autocompleteApi.setState(resolve(target), "default");
  },
  records: (target) => [...resolve(target)._run?.records ?? []]
};
function init4() {
  dfDollar4(".autocomplete:not([data-init])").toArray().forEach((root) => {
    root.dataset.init = "";
    const input = inputOf(root);
    if (!input)
      return;
    root._uid = root.id || `autocomplete-${++uid}`;
    let popover = popoverOf(root);
    if (!popover) {
      popover = document.createElement("div");
      popover.className = "autocomplete-popover";
      dfDollar4(root).append(popover);
    }
    popover.setAttribute("popover", "manual");
    if (!popover.id)
      popover.id = `${root._uid}-popover`;
    let list = listOf(root);
    if (!list) {
      list = document.createElement("div");
      list.className = "autocomplete-list";
      dfDollar4(popover).append(list);
    }
    list.setAttribute("role", "listbox");
    if (!list.id)
      list.id = `${root._uid}-list`;
    if (!list.hasAttribute("aria-label") && !list.hasAttribute("aria-labelledby"))
      list.setAttribute("aria-label", input.getAttribute("aria-label") || "Suggestions");
    if (!dfDollar4(popover).find(".autocomplete-status").get(0)) {
      const status = document.createElement("div");
      status.className = "autocomplete-status";
      status.setAttribute("role", "status");
      dfDollar4(popover).append(status);
    }
    if (!dfDollar4(popover).find(".autocomplete-error").get(0)) {
      const error = document.createElement("div");
      error.className = "autocomplete-error";
      const text = document.createElement("span");
      text.className = "autocomplete-error-text";
      const retry = document.createElement("button");
      retry.type = "button";
      retry.className = "autocomplete-retry";
      retry.textContent = "Retry";
      error.append(text, retry);
      dfDollar4(popover).append(error);
    }
    if (!dfDollar4(popover).find(".autocomplete-empty").get(0)) {
      const empty = document.createElement("div");
      empty.className = "autocomplete-empty";
      empty.textContent = root.dataset.emptyText || "No matches.";
      dfDollar4(popover).append(empty);
    }
    input.setAttribute("role", "combobox");
    input.setAttribute("aria-autocomplete", "list");
    input.setAttribute("aria-controls", list.id);
    input.setAttribute("autocomplete", "off");
    if (!input.hasAttribute("aria-expanded"))
      input.setAttribute("aria-expanded", "false");
    const anchor = `--autocomplete-${root._uid}`;
    input.style.anchorName = anchor;
    popover.style.positionAnchor = anchor;
    root._run = { query: "", records: [], page: 0, hasMore: false, active: -1, seq: 0 };
    applyMarkup4(root, { name: "default" });
    input.addEventListener("input", () => {
      abort(root);
      const query = input.value.trim();
      const hidden = dfDollar4(root).find(".autocomplete-value").get(0);
      if (hidden)
        hidden.value = "";
      root._timer = setTimeout(() => search(root, query), configOf(root).debounce);
    });
    input.addEventListener("keydown", (e) => {
      const name = root.store.value.name;
      const run = root._run;
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          if (name === "default")
            search(root, input.value.trim());
          else
            activate2(root, run.active + 1);
          break;
        case "ArrowUp":
          e.preventDefault();
          if (name !== "default")
            activate2(root, run.active - 1);
          break;
        case "PageDown":
          if (name !== "default") {
            e.preventDefault();
            activate2(root, run.active + 10);
          }
          break;
        case "PageUp":
          if (name !== "default") {
            e.preventDefault();
            activate2(root, run.active - 10);
          }
          break;
        case "Enter":
          if (name === "open" && run.active >= 0) {
            e.preventDefault();
            choose(root, run.active);
          }
          break;
        case "Escape":
          if (name !== "default")
            autocompleteApi.setState(root, "default");
          else if (input.value) {
            input.value = "";
            input.dispatchEvent(new Event("input", { bubbles: true }));
          }
          e.preventDefault();
          break;
        case "Tab":
          if (name !== "default")
            autocompleteApi.setState(root, "default");
          break;
      }
    });
    list.addEventListener("pointerdown", (e) => {
      const option = e.target.closest?.(".autocomplete-option");
      if (!option)
        return;
      e.preventDefault();
      choose(root, Number(option.dataset.index));
    });
    list.addEventListener("pointermove", (e) => {
      const option = e.target.closest?.(".autocomplete-option");
      if (option && Number(option.dataset.index) !== root._run.active)
        activate2(root, Number(option.dataset.index));
    });
    list.addEventListener("scroll", () => {
      if (list.scrollTop + list.clientHeight >= list.scrollHeight - 48)
        loadMore(root);
    }, { passive: true });
    popover.addEventListener("click", (e) => {
      if (e.target.closest?.(".autocomplete-retry"))
        search(root, root._run.query);
    });
    root.addEventListener("focusout", (e) => {
      if (e.relatedTarget && root.contains(e.relatedTarget))
        return;
      if (root.store.value.name !== "default")
        autocompleteApi.setState(root, "default");
    });
    bindComponent(root, autocompleteApi, { name: "default", config: { query: "", value: null, label: "" } });
  });
}
init4();
new MutationObserver(init4).observe(document, { childList: true, subtree: true });

// src/components/avatar/avatar.ts
var df$5 = defussGlobals();
var dfDollar5 = defussQuery();
var avatarStates = ["default", "error"];
function applyMarkup5(el, stateName) {
  const img = dfDollar5(el).find(".avatar-image");
  if (stateName === "error")
    img.attr("data-error", "").css("display", "none");
  else
    img.attr("data-error", null).css("display", "");
}
function triggerStateChange5(wrapper, stateName, _config) {
  const img = dfDollar5(wrapper).find(".avatar-image").get(0);
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
  apply: (wrapper, state) => triggerStateChange5(wrapper, state.name, state.config),
  read: (wrapper, state) => {
    const img = dfDollar5(wrapper).find(".avatar-image").get(0);
    const errored = img ? img.hasAttribute("data-error") : true;
    return {
      name: errored ? "error" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup5(el, state.name)
});
df$5.avatarApi = avatarApi;
df$5.avatarStates = avatarStates;
function init5() {
  dfDollar5(".avatar:not([data-init])").toArray().forEach((wrapper) => {
    wrapper.dataset.init = "";
    bindComponent(wrapper, avatarApi);
    const img = dfDollar5(wrapper).find(".avatar-image").get(0);
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
init5();
new MutationObserver(init5).observe(document, { childList: true, subtree: true });

// src/components/bibtex/bibtex.ts
var df$6 = defussGlobals();
var dfDollar6 = defussQuery();
var bibtexStates = ["default", "copied"];
var FORMATS = ["bibtex", "apa", "mla", "chicago", "harvard", "ieee"];
var LABELS = { bibtex: "BibTeX", apa: "APA", mla: "MLA", chicago: "Chicago", harvard: "Harvard", ieee: "IEEE" };
var COPIED_MS = 2000;
function skipGroup(s, i) {
  const open = s[i];
  if (open === '"') {
    let depth = 0;
    for (let j = i + 1;j < s.length; j++) {
      if (s[j] === "\\") {
        j++;
        continue;
      }
      if (s[j] === "{")
        depth++;
      else if (s[j] === "}")
        depth--;
      else if (s[j] === '"' && depth === 0)
        return j + 1;
    }
    return s.length;
  }
  let depth = 0;
  for (let j = i;j < s.length; j++) {
    if (s[j] === "\\") {
      j++;
      continue;
    }
    if (s[j] === "{" || s[j] === "(")
      depth++;
    else if (s[j] === "}" || s[j] === ")") {
      depth--;
      if (depth === 0)
        return j + 1;
    }
  }
  return s.length;
}
function parse(text) {
  const s = String(text ?? "");
  const entries = [];
  let i = 0;
  while ((i = s.indexOf("@", i)) !== -1) {
    const head = /^@\s*([a-zA-Z]+)\s*([{(])/.exec(s.slice(i));
    if (!head) {
      i++;
      continue;
    }
    const type = head[1].toLowerCase();
    const start = i + head[0].length - 1;
    const end = skipGroup(s, start);
    if (type === "comment" || type === "preamble" || type === "string") {
      i = end;
      continue;
    }
    const body = s.slice(start + 1, end - 1);
    const comma = body.indexOf(",");
    const key = (comma < 0 ? body : body.slice(0, comma)).trim();
    const fields = {};
    const order = [];
    const bare = {};
    let p = comma < 0 ? body.length : comma + 1;
    while (p < body.length) {
      const m = /^[\s,]*([A-Za-z][\w:-]*)\s*=\s*/.exec(body.slice(p));
      if (!m)
        break;
      p += m[0].length;
      let value = "";
      let pieces = 0;
      let bareOnly = true;
      for (;; ) {
        pieces++;
        if (body[p] === "{" || body[p] === '"') {
          const q = skipGroup(body, p);
          value += body.slice(p + 1, q - 1);
          p = q;
          bareOnly = false;
        } else {
          const bare = /^[^,#}\s]+/.exec(body.slice(p));
          if (bare) {
            value += bare[0];
            p += bare[0].length;
          }
        }
        const more = /^\s*#\s*/.exec(body.slice(p));
        if (!more)
          break;
        p += more[0].length;
      }
      const name = m[1].toLowerCase();
      if (!(name in fields))
        order.push(name);
      fields[name] = name === "month" && bareOnly ? MONTHS[value.trim().toLowerCase().slice(0, 3)] ?? value.trim() : value.trim();
      if (bareOnly && pieces === 1)
        bare[name] = value.trim();
      else
        delete bare[name];
    }
    entries.push({ type, key, fields, order, bare });
    i = end;
  }
  return entries;
}
var MONTHS = { jan: "January", feb: "February", mar: "March", apr: "April", may: "May", jun: "June", jul: "July", aug: "August", sep: "September", oct: "October", nov: "November", dec: "December" };
var IEEE_MONTH = { January: "Jan.", February: "Feb.", March: "Mar.", April: "Apr.", May: "May", June: "Jun.", July: "Jul.", August: "Aug.", September: "Sep.", October: "Oct.", November: "Nov.", December: "Dec." };
var ACCENTS = { '"': "̈", "'": "́", "`": "̀", "^": "̂", "~": "̃", "=": "̄", ".": "̇", c: "̧", v: "̌", u: "̆", H: "̋", k: "̨" };
var SYMBOLS = { ss: "ß", o: "ø", O: "Ø", aa: "å", AA: "Å", ae: "æ", AE: "Æ", l: "ł", L: "Ł", i: "ı", oe: "œ", OE: "Œ" };
function clean(value) {
  return String(value ?? "").replace(/\{?\\([`'"^~=.])\s*\{?([A-Za-z])\}?\}?/g, (_m, a, ch) => (ch + ACCENTS[a]).normalize("NFC")).replace(/\{?\\([cvuHk])\s*\{([A-Za-z])\}\}?/g, (_m, a, ch) => (ch + ACCENTS[a]).normalize("NFC")).replace(/\{?\\(ss|aa|AA|ae|AE|oe|OE|o|O|l|L|i)\b\s*\}?/g, (_m, c) => SYMBOLS[c]).replace(/\\(TeX|LaTeX|BibTeX|XeTeX|LuaTeX)\b\s*(\{\})?/g, "$1").replace(/\\([&%$#_{}])/g, "$1").replace(/---/g, "—").replace(/--/g, "–").replace(/~/g, " ").replace(/\\[A-Za-z]+\s*/g, "").replace(/[{}]/g, "").replace(/\s+/g, " ").trim();
}
function splitTop(value, sep) {
  const out = [];
  let depth = 0;
  let cur = "";
  const s = String(value);
  for (let i = 0;i < s.length; i++) {
    const ch = s[i];
    if (ch === "{")
      depth++;
    else if (ch === "}")
      depth--;
    if (depth === 0 && sep.test(s.slice(i))) {
      const m = sep.exec(s.slice(i));
      out.push(cur);
      cur = "";
      i += m[0].length - 1;
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out.map((x) => x.trim()).filter(Boolean);
}
function parseName(raw) {
  const r = raw.trim();
  if (r.startsWith("{") && skipGroup(r, 0) === r.length)
    return { first: "", last: clean(r), corporate: true };
  const parts = splitTop(r, /^,/);
  if (parts.length >= 2)
    return { first: clean(parts[parts.length - 1]), last: clean(parts[0]) };
  const words = splitTop(r, /^\s+/);
  if (words.length === 1)
    return { first: "", last: clean(words[0]) };
  let k = words.length - 1;
  while (k > 1 && /^[a-z]/.test(clean(words[k - 1])))
    k--;
  return { first: clean(words.slice(0, k).join(" ")), last: clean(words.slice(k).join(" ")) };
}
var names = (value) => value ? splitTop(value, /^\s+and\s+/i).map(parseName) : [];
var initials = (first) => first.split(/\s+/).filter(Boolean).map((w) => w.split("-").map((p) => p ? `${p[0].toUpperCase()}.` : "").join("-")).join(" ");
var esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var it = (s) => `<i>${esc(s)}</i>`;
var end = (s, mark = ".") => /[.?!]$/.test(s) ? s : s + mark;
var list = (items, sep, last) => items.length < 2 ? items.join("") : `${items.slice(0, -1).join(sep)}${last}${items[items.length - 1]}`;
var pages = (p) => clean(p).replace(/\s*[-–]+\s*/g, "–");
function facts(entry) {
  const f = entry.fields;
  const c = (k) => f[k] ? clean(f[k]) : "";
  return {
    type: entry.type,
    authors: names(f.author),
    editors: names(f.editor),
    title: c("title"),
    container: c("journal") || c("booktitle") || c("series"),
    year: c("year") || (f.date ? clean(f.date).slice(0, 4) : ""),
    month: c("month"),
    volume: c("volume"),
    number: c("number") || c("issue"),
    pages: f.pages ? pages(f.pages) : "",
    publisher: c("publisher") || c("institution") || c("school") || c("organization"),
    address: c("address") || c("location"),
    edition: c("edition"),
    doi: c("doi").replace(/^https?:\/\/(dx\.)?doi\.org\//, ""),
    url: f.url ? clean(f.url).replace(/\s/g, "") : "",
    note: c("note") || c("howpublished")
  };
}
var isArticle = (t) => t === "article";
var isPart = (t) => t === "inproceedings" || t === "incollection" || t === "inbook" || t === "conference";
var anchor = (href, text = href) => /^https?:\/\//i.test(href) ? `<a class="bibtex-link" href="${esc(href)}" target="_blank" rel="noopener">${esc(text)}</a>` : esc(text);
var doiUrl = (doi) => `https://doi.org/${doi}`;
var link = (x) => x.doi ? ` ${anchor(doiUrl(x.doi))}` : x.url ? ` ${anchor(x.url)}` : "";
var STYLES = {
  apa(x) {
    const who = x.authors.length ? x.authors : x.editors;
    const one = (n) => n.corporate || !n.first ? esc(n.last) : `${esc(n.last)}, ${esc(initials(n.first))}`;
    let out = who.length ? end(who.length > 1 ? list(who.map(one), ", ", ", &amp; ") : one(who[0])) : "";
    if (!x.authors.length && x.editors.length)
      out = out.replace(/\.$/, "") + ` (Ed${x.editors.length > 1 ? "s" : ""}.).`;
    out += ` (${esc(x.year || "n.d.")}). `;
    if (isArticle(x.type)) {
      out += `${esc(end(x.title))} ${x.container ? it(x.container) : ""}${x.volume ? `, ${it(x.volume)}` : ""}${x.number ? `(${esc(x.number)})` : ""}${x.pages ? `, ${esc(x.pages)}` : ""}.`;
    } else if (isPart(x.type)) {
      out += `${esc(end(x.title))} In ${x.container ? it(x.container) : ""}${x.pages ? ` (pp. ${esc(x.pages)})` : ""}.${x.publisher ? ` ${esc(end(x.publisher))}` : ""}`;
    } else {
      out += `${it(x.title)}${x.type === "techreport" && x.number ? ` (Report No. ${esc(x.number)})` : ""}${x.edition ? ` (${esc(x.edition)} ed.)` : ""}.${x.publisher ? ` ${esc(end(x.publisher))}` : ""}`;
    }
    return out + link(x);
  },
  mla(x) {
    const a = x.authors;
    const full = (n) => n.corporate || !n.first ? esc(n.last) : `${esc(n.first)} ${esc(n.last)}`;
    const inv = (n) => n.corporate || !n.first ? esc(n.last) : `${esc(n.last)}, ${esc(n.first)}`;
    let out = a.length === 0 ? "" : a.length === 1 ? inv(a[0]) : a.length === 2 ? `${inv(a[0])}, and ${full(a[1])}` : `${inv(a[0])}, et al`;
    if (out)
      out = `${end(out)} `;
    const bits = [];
    if (isArticle(x.type) || isPart(x.type)) {
      out += `“${esc(end(x.title))}” `;
      if (x.container)
        bits.push(it(x.container));
      if (x.volume)
        bits.push(`vol. ${esc(x.volume)}`);
      if (x.number)
        bits.push(`no. ${esc(x.number)}`);
      if (x.publisher && isPart(x.type))
        bits.push(esc(x.publisher));
      if (x.year)
        bits.push(esc(x.year));
      if (x.pages)
        bits.push(`pp. ${esc(x.pages)}`);
    } else {
      out += `${it(end(x.title))} `;
      if (x.publisher)
        bits.push(esc(x.publisher));
      if (x.year)
        bits.push(esc(x.year));
    }
    out += bits.length ? `${bits.join(", ")}.` : "";
    return out.trim() + link(x).replace(/^ (.+)$/, " $1.");
  },
  chicago(x) {
    const a = x.authors;
    const full = (n) => n.corporate || !n.first ? esc(n.last) : `${esc(n.first)} ${esc(n.last)}`;
    const inv = (n) => n.corporate || !n.first ? esc(n.last) : `${esc(n.last)}, ${esc(n.first)}`;
    const who = a.length ? [inv(a[0]), ...a.slice(1).map(full)] : [];
    let out = who.length ? `${end(list(who, ", ", who.length > 2 ? ", and " : " and "))} ` : "";
    out += `${esc(x.year || "n.d.")}. `;
    if (isArticle(x.type)) {
      out += `“${esc(end(x.title))}” ${x.container ? it(x.container) : ""}${x.volume ? ` ${esc(x.volume)}` : ""}${x.number ? ` (${esc(x.number)})` : ""}${x.pages ? `: ${esc(x.pages)}` : ""}.`;
    } else if (isPart(x.type)) {
      out += `“${esc(end(x.title))}” In ${x.container ? it(x.container) : ""}${x.pages ? `, ${esc(x.pages)}` : ""}.${x.publisher ? ` ${x.address ? `${esc(x.address)}: ` : ""}${esc(end(x.publisher))}` : ""}`;
    } else {
      out += `${it(end(x.title))}${x.publisher ? ` ${x.address ? `${esc(x.address)}: ` : ""}${esc(end(x.publisher))}` : ""}`;
    }
    return out + link(x).replace(/^ (.+)$/, " $1.");
  },
  harvard(x) {
    const a = x.authors;
    const one = (n) => n.corporate || !n.first ? esc(n.last) : `${esc(n.last)}, ${esc(initials(n.first).replace(/ /g, ""))}`;
    let out = a.length ? `${list(a.map(one), ", ", " and ")} ` : "";
    out += `(${esc(x.year || "n.d.")}) `;
    if (isArticle(x.type)) {
      out += `‘${esc(x.title)}’, ${x.container ? it(x.container) : ""}${x.volume ? `, ${esc(x.volume)}` : ""}${x.number ? `(${esc(x.number)})` : ""}${x.pages ? `, pp. ${esc(x.pages)}` : ""}.`;
    } else if (isPart(x.type)) {
      out += `‘${esc(x.title)}’, in ${x.container ? it(x.container) : ""}${x.pages ? `, pp. ${esc(x.pages)}` : ""}.${x.publisher ? ` ${esc(end(x.publisher))}` : ""}`;
    } else {
      out += `${it(x.title)}.${x.publisher ? ` ${x.address ? `${esc(x.address)}: ` : ""}${esc(end(x.publisher))}` : ""}`;
    }
    if (x.doi)
      out += ` doi:${anchor(doiUrl(x.doi), x.doi)}.`;
    else if (x.url)
      out += ` Available at: ${anchor(x.url)}.`;
    return out;
  },
  ieee(x, n) {
    const a = x.authors;
    const one = (p) => p.corporate || !p.first ? esc(p.last) : `${esc(initials(p.first))} ${esc(p.last)}`;
    const who = a.length > 6 ? `${one(a[0])} <i>et al.</i>` : list(a.map(one), ", ", a.length > 2 ? ", and " : " and ");
    let out = `<span class="bibtex-num">[${n}]</span> ${who ? `${who}, ` : ""}`;
    const when = [IEEE_MONTH[x.month] ?? x.month, x.year].filter(Boolean).map(esc).join(" ");
    if (isArticle(x.type)) {
      out += `“${esc(x.title)},” ${[x.container ? it(x.container) : "", x.volume && `vol. ${esc(x.volume)}`, x.number && `no. ${esc(x.number)}`, x.pages && `pp. ${esc(x.pages)}`, when].filter(Boolean).join(", ")}`;
    } else if (isPart(x.type)) {
      out += `“${esc(x.title)},” in ${[x.container ? it(x.container) : "", x.address && esc(x.address), when, x.pages && `pp. ${esc(x.pages)}`].filter(Boolean).join(", ")}`;
    } else if (x.type === "techreport") {
      out += `“${esc(x.title)},” ${[x.publisher && esc(x.publisher), x.address && esc(x.address), `Tech. Rep.${x.number ? ` ${esc(x.number)}` : ""}`, when].filter(Boolean).join(", ")}`;
    } else {
      out += `${it(x.title)}${x.edition ? `, ${esc(x.edition)} ed` : ""}. ${[x.address && esc(x.address), x.publisher && esc(x.publisher)].filter(Boolean).join(": ")}${x.publisher || x.address ? ", " : ""}${esc(x.year)}`;
    }
    out = end(out);
    if (x.doi)
      out = `${out.replace(/\.$/, "")}, doi: ${anchor(doiUrl(x.doi), x.doi)}.`;
    else if (x.url)
      out += ` [Online]. Available: ${anchor(x.url)}`;
    return out;
  }
};
var sortKey = (x) => `${(x.authors[0] ?? x.editors[0])?.last ?? x.title}`.toLowerCase() + " " + x.year;
function bibtexOut(entries, { align = true, highlight = true } = {}) {
  const span = (cls, s) => highlight ? `<span class="bibtex-${cls}">${esc(s)}</span>` : esc(s);
  const html = [];
  const text = [];
  for (const e of entries) {
    const width = align ? Math.max(0, ...e.order.map((k) => k.length)) : 0;
    const lines = e.order.map((k) => {
      const pad = " ".repeat(Math.max(0, width - k.length));
      const raw = e.bare?.[k];
      const value = raw ?? e.fields[k];
      const href = k === "doi" ? doiUrl(value.replace(/^https?:\/\/(dx\.)?doi\.org\//, "")) : /^https?:\/\/\S+$/.test(value) ? value : null;
      const shown = href && highlight ? `<span class="bibtex-value">${anchor(href, value)}</span>` : span("value", value);
      const [open, close] = raw === undefined ? ["{", "}"] : ["", ""];
      return { html: `  ${span("field", k)}${pad} = ${open}${href && !highlight ? anchor(href, value) : shown}${close},`, text: `  ${k}${pad} = ${open}${value}${close},` };
    });
    html.push([`@${span("type", e.type)}{${span("key", e.key)},`, ...lines.map((l) => l.html), "}"].join(`
`));
    text.push([`@${e.type}{${e.key},`, ...lines.map((l) => l.text), "}"].join(`
`));
  }
  return { html: html.join(`

`), text: text.join(`

`) };
}
var plain = (html) => html.replace(/<[^>]+>/g, "").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&amp;/g, "&");
function format2(entries, style, { align = true, highlight = true } = {}) {
  if (style === "bibtex")
    return { ...bibtexOut(entries, { align, highlight }), list: false };
  const fn = STYLES[style];
  if (!fn)
    throw new Error(`bibtex: unknown format "${style}" (supported: ${FORMATS.join(", ")})`);
  let rows = entries.map((e, i) => ({ x: facts(e), i }));
  if (style !== "ieee")
    rows = rows.sort((a, b) => sortKey(a.x).localeCompare(sortKey(b.x)));
  const refs = rows.map(({ x, i }) => fn(x, i + 1));
  return { html: refs, text: refs.map(plain).join(`

`), list: refs.length > 1 };
}
var isStyle = (f) => FORMATS.includes(f);
function formatsOf(el) {
  const own = String(dfDollar6(el).attr("data-formats") ?? "").split(/[\s,]+/).filter(isStyle);
  return own.length ? own : FORMATS;
}
function formatFor(el, state, authored) {
  const offered = formatsOf(el);
  const want = state?.config?.format;
  if (want && offered.includes(want))
    return want;
  return authored && offered.includes(authored) ? authored : offered[0];
}
function applyMarkup6(el, state, authored) {
  dfDollar6(el).attr("data-format", formatFor(el, state, authored));
  dfDollar6(el).attr("data-copied", state.name === "copied" ? "" : null);
}
var COPY_ICON = '<svg class="bibtex-icon-copy" viewBox="0 0 24 24" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>';
var DONE_ICON = '<svg class="bibtex-icon-done" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 6 9 17l-5-5"/></svg>';
function build(root) {
  const inline = root.tagName === "SPAN";
  const tag = inline ? "span" : "div";
  const variant = dfDollar6(root).attr("data-variant");
  const offered = formatsOf(root);
  const tabs = offered.length > 1 && variant !== "minimal" && variant !== "inline" ? `<${tag} class="bibtex-tabs" role="tablist" aria-label="Citation format">${offered.map((f) => `<button type="button" class="bibtex-tab" role="tab" data-format="${f}" aria-selected="false" tabindex="-1">${LABELS[f]}</button>`).join("")}</${tag}>` : "";
  const copy = dfDollar6(root).attr("data-copy") === "none" ? "" : `<button type="button" class="bibtex-copy">${COPY_ICON}${DONE_ICON}<span class="bibtex-copy-label">Copy</span></button>`;
  const bar = `<${tag} class="bibtex-bar">${tabs}${copy}<${tag} class="bibtex-status" role="status"></${tag}></${tag}>`;
  const view = `<${tag} class="bibtex-view"${tabs ? ' role="tabpanel"' : ""}></${tag}>`;
  const caption = dfDollar6(root).children("figcaption").get(0);
  if (inline) {
    dfDollar6(root).append(dfDollar6(view));
    dfDollar6(root).append(dfDollar6(bar));
  } else {
    if (caption)
      dfDollar6(caption).after(dfDollar6(bar));
    else
      dfDollar6(root).append(dfDollar6(bar));
    dfDollar6(root).append(dfDollar6(view));
  }
  root._bar = dfDollar6(root).children(".bibtex-bar").get(0);
  root._view = dfDollar6(root).children(".bibtex-view").get(0);
  const tablist = dfDollar6(root._bar).find('[role="tablist"]').get(0);
  if (tablist) {
    dfDollar6(root._view).attr("id", root._view.id || `${root.id || "bibtex"}-view-${Math.random().toString(36).slice(2, 7)}`);
    dfDollar6(tablist).find('[role="tab"]').attr("aria-controls", root._view.id);
  }
}
function show(root, fmt) {
  const out = format2(root._entries, fmt, {
    align: dfDollar6(root).attr("data-align") !== "none",
    highlight: dfDollar6(root).attr("data-highlight") !== "none"
  });
  root._text = out.text;
  const inline = root.tagName === "SPAN";
  let markup;
  if (fmt === "bibtex")
    markup = inline ? `<code class="bibtex-code">${out.html}</code>` : `<pre class="bibtex-code"><code>${out.html}</code></pre>`;
  else if (out.list && !inline)
    markup = `<ol class="bibtex-list">${out.html.map((r) => `<li class="bibtex-ref">${r}</li>`).join("")}</ol>`;
  else
    markup = inline ? `<span class="bibtex-ref">${out.html.join(" ")}</span>` : `<p class="bibtex-ref">${out.html.join(" ")}</p>`;
  dfDollar6(root._view).html(markup);
  dfDollar6(root._bar).find(".bibtex-tab").each((_i, tab) => {
    const on = dfDollar6(tab).attr("data-format") === fmt;
    dfDollar6(tab).attr("aria-selected", String(on)).attr("tabindex", on ? "0" : "-1");
  });
  dfDollar6(root._bar).find(".bibtex-copy").attr("aria-label", `Copy ${LABELS[fmt]}`);
}
function triggerStateChange6(root, state) {
  if (state.name === "copied" && !state.config?.format && root._shown)
    state = { ...state, config: { ...state.config, format: root._shown } };
  applyMarkup6(root, state, root._authored);
  const fmt = dfDollar6(root).attr("data-format");
  if (fmt !== root._shown) {
    root._shown = fmt;
    show(root, fmt);
    root.dispatchEvent(new CustomEvent("bibtex-format", { bubbles: true, detail: { format: fmt, text: root._text } }));
  }
  const copied = state.name === "copied";
  dfDollar6(root._bar).find(".bibtex-copy-label").text(copied ? "Copied" : "Copy");
  dfDollar6(root._bar).find(".bibtex-status").text(copied ? `${LABELS[fmt]} copied to the clipboard` : "");
  clearTimeout(root._copiedTimer);
  if (copied) {
    root._copiedTimer = setTimeout(() => {
      if (root.isConnected && root.store?.value.name === "copied")
        root.api.setState("default", { format: fmt });
    }, COPIED_MS);
  }
}
var bibtexApi = componentState({
  component: "bibtex",
  states: bibtexStates,
  apply: (root, state) => triggerStateChange6(root, state),
  read: (root, state) => ({ name: dfDollar6(root).attr("data-state-name") || state.name, config: { ...state.config, format: dfDollar6(root).attr("data-format") } }),
  markup: (el, state) => {
    const authored = state.model.attrs.find(([name]) => name === "data-format");
    applyMarkup6(el, state, authored ? authored[1] : null);
  }
});
df$6.bibtexApi = bibtexApi;
df$6.bibtexStates = bibtexStates;
async function copy(root) {
  const fmt = dfDollar6(root).attr("data-format");
  let ok = true;
  try {
    await navigator.clipboard.writeText(root._text ?? "");
  } catch {
    ok = false;
    globalThis.getSelection?.()?.selectAllChildren(root._view);
  }
  if (ok)
    root.api.setState("copied", { format: fmt });
  root.dispatchEvent(new CustomEvent("bibtex-copy", { bubbles: true, detail: { format: fmt, text: root._text, ok } }));
  return ok;
}
var resolve2 = (target) => typeof target === "string" ? dfDollar6(target).get(0) : target;
df$6.bibtex = {
  formats: FORMATS,
  parse,
  format: (entries, style, options) => format2(typeof entries === "string" ? parse(entries) : entries, style, options),
  show: (target, fmt) => {
    resolve2(target)?.api.setState("default", { format: fmt });
  },
  copy: (target) => copy(resolve2(target)),
  text: (target) => resolve2(target)?._text ?? "",
  entries: (target) => structuredClone(resolve2(target)?._entries ?? [])
};
function init6() {
  dfDollar6(".bibtex:not([data-init])").each((_i, root) => {
    dfDollar6(root).data("init", "");
    const src = dfDollar6(root).find(".bibtex-source").get(0);
    root._entries = parse(src ? dfDollar6(src).text() : "");
    root._authored = dfDollar6(root).attr("data-format") ?? null;
    build(root);
    bindComponent(root, bibtexApi, { name: "default", config: { format: formatFor(root, null, root._authored) } });
    triggerStateChange6(root, root.store.value);
    dfDollar6(root._bar).on("click", (e) => {
      const tab = e.target.closest?.(".bibtex-tab");
      if (tab)
        root.api.setState("default", { format: dfDollar6(tab).attr("data-format") });
      else if (e.target.closest?.(".bibtex-copy"))
        copy(root);
    });
    dfDollar6(root._bar).on("keydown", (e) => {
      const tab = e.target.closest?.(".bibtex-tab");
      if (!tab)
        return;
      const tabs = dfDollar6(root._bar).find(".bibtex-tab").toArray();
      const at = tabs.indexOf(tab);
      const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: tabs.length - 1 }[e.key];
      if (to === undefined)
        return;
      e.preventDefault();
      const next = tabs[(to + tabs.length) % tabs.length];
      root.api.setState("default", { format: dfDollar6(next).attr("data-format") });
      next.focus();
    });
  });
}
init6();
new MutationObserver(init6).observe(document, { childList: true, subtree: true });

// src/components/border-layout/border-layout.ts
var df$7 = defussGlobals();
var dfDollar7 = defussQuery();
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
var resolve3 = (t) => typeof t === "string" ? dfDollar7("#" + CSS.escape(t)).get(0) ?? dfDollar7(t).get(0) : t;
var regionOf = (layout, side) => dfDollar7(layout).find(`:scope > .border-layout-${side}`).get(0);
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
    const handle = region ? dfDollar7(region).children(".resizer-handle").get(0) : null;
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
  layout.dispatchEvent(new CustomEvent("border-layout-collapse", { bubbles: true, detail: { region: side, collapsed } }));
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
    if (!region?.classList.contains("resizer"))
      continue;
    const pane = paneOf(region);
    const px = Math.round(num2(pane?.style[SIDES[side].size], NaN));
    data[side] = { size: Number.isFinite(px) ? px : null, collapsed: region.hasAttribute("data-collapsed") };
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
    region.toggleAttribute("data-collapsed", !!saved.collapsed);
  }
  layout._restoring = false;
}
function applyMarkup7(el, stateName, config) {
  const want = new Set(stateName === "collapsed" ? config?.regions ?? (config?.region ? [config.region] : []) : []);
  for (const side of REGIONS) {
    const region = regionOf(el, side);
    if (region)
      dfDollar7(region).attr("data-collapsed", want.has(side) ? "" : null);
  }
}
function triggerStateChange7(layout, stateName, config) {
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
    triggerStateChange7(layout, state.name, state.config);
    syncState(layout);
  },
  markup: (el, state) => applyMarkup7(el, state.name, state.config)
});
df$7.borderLayoutApi = borderLayoutApi;
df$7.borderLayoutStates = borderLayoutStates;
function init7() {
  dfDollar7(".border-layout:not([data-init])").toArray().forEach((layout) => {
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
df$7.borderLayout = {
  collapse: (target, side) => {
    const l = resolve3(target);
    if (l)
      collapse(l, side, true);
  },
  expand: (target, side) => {
    const l = resolve3(target);
    if (l)
      collapse(l, side, false);
  },
  toggle: (target, side) => {
    const l = resolve3(target);
    const region = l && regionOf(l, side);
    if (!region)
      return false;
    collapse(l, side, !region.hasAttribute("data-collapsed"));
    return region.hasAttribute("data-collapsed");
  },
  resize: (target, side, px) => {
    const l = resolve3(target);
    const r = l && regionOf(l, side);
    if (r) {
      clamp(l);
      setSize(r, side, px);
    }
  },
  sizes: (target) => {
    const l = resolve3(target);
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
init7();
new MutationObserver(init7).observe(document, { childList: true, subtree: true });

// src/components/calendar/calendar.ts
var df$8 = defussGlobals();
var dfDollar8 = defussQuery();
var calSeq = 0;
var calendarStates = ["default"];
function applyMarkup8(el, config) {
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
function triggerStateChange8(cal, stateName, config) {
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
  apply: (cal, state) => triggerStateChange8(cal, state.name, state.config),
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
  markup: (el, state) => applyMarkup8(el, state.config)
}), {
  setDays(cal, days, options = {}) {
    const holder = dayHolderOf(cal);
    holder._calDays = options.merge ? { ...holder._calDays, ...days } : { ...days };
    rerender(cal);
  }
});
df$8.calendarApi = calendarApi;
df$8.calendarStates = calendarStates;
var nameSets = new Map;
function names2(el) {
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
  return Array.from(dfDollar8(owner).find(".calendar").toArray()).filter((c) => c.closest(".calendar-range") === owner);
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
  dfDollar8(owner).find("input[data-range-input]").toArray().forEach((input) => {
    const value = (input.dataset.rangeInput === "end" ? r.end : r.start) ?? "";
    if (input.value === value)
      return;
    input.value = value;
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  renderRange(owner);
}
var esc2 = (t) => String(t).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var MARK = /^[a-z][a-z0-9-]*$/;
function dayHolderOf(cal) {
  const owner = rangeOwnerOf(cal);
  return owner && owner.classList.contains("calendar-range") ? owner : cal;
}
function daysOf(cal) {
  const holder = dayHolderOf(cal);
  if (holder._calDays)
    return holder._calDays;
  const script = Array.from(dfDollar8(holder).find("script.calendar-days").toArray()).find((el) => el.parentElement === holder);
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
    attrs += ` title="${esc2(d.label)}"`;
  const aria = ` aria-label="${esc2([full.format(isoToDate(iso)), d.label, note].filter(Boolean).join(", "))}"`;
  return { attrs, note: note ? `<span class="calendar-day-note">${esc2(note)}</span>` : "", aria, blocked: d.disabled === true };
}
var YEARS_PER_PAGE = 12;
var pageStart = (year) => year - (year % YEARS_PER_PAGE + YEARS_PER_PAGE) % YEARS_PER_PAGE;
var pad2 = (n) => String(n).padStart(2, "0");
var monthOff = (y, m, min, max) => !isoInRange(`${y}-${pad2(m + 1)}-${pad2(daysInMonth(y, m))}`, min, null) || !isoInRange(`${y}-${pad2(m + 1)}-01`, null, max);
var yearOff = (y, min, max) => !isoInRange(`${y}-12-31`, min, null) || !isoInRange(`${y}-01-01`, null, max);
function renderPicker(el) {
  const st = el._calState;
  const panel = dfDollar8(el).find(".calendar-picker").get(0);
  if (!st || !panel)
    return;
  const now = new Date;
  let html = "";
  if (el.dataset.view === "months") {
    const y = st.pickYear;
    html = names2(el).months.map((name, m) => {
      const current = y === st.year && m === st.month ? ' aria-current="true"' : "";
      const today = y === now.getFullYear() && m === now.getMonth() ? " data-today" : "";
      const off = monthOff(y, m, st.minDate, st.maxDate) ? " disabled" : "";
      return `<button type="button" class="calendar-pick" data-month="${m}" id="${el.dataset.calId}-m${m}"${current}${today}${off}>${esc2(name.slice(0, 3))}</button>`;
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
  dfDollar8(panel).morph(html);
}
function renderHeader(el) {
  const st = el._calState;
  if (!st)
    return;
  const view = el.dataset.view || "days";
  const heading = dfDollar8(el).find(".calendar-heading").get(0);
  if (heading) {
    const text = view === "months" ? String(st.pickYear) : view === "years" ? `${st.pickPage} – ${st.pickPage + YEARS_PER_PAGE - 1}` : `${names2(el).months[st.month]} ${st.year}`;
    dfDollar8(heading).text(text);
    if (heading.tagName === "BUTTON") {
      dfDollar8(heading).attr("aria-label", view === "months" ? `${text}, choose a year` : view === "years" ? `Years ${text}, back to the days` : `${text}, choose a month and year`);
      dfDollar8(heading).attr("aria-expanded", String(view !== "days"));
    }
  }
  const labels = view === "months" ? ["Previous year", "Next year"] : view === "years" ? ["Previous years", "Next years"] : ["Previous month", "Next month"];
  dfDollar8(el).find('.calendar-nav[data-action="prev-month"]').attr("aria-label", labels[0]);
  dfDollar8(el).find('.calendar-nav[data-action="next-month"]').attr("aria-label", labels[1]);
  const monthSel = dfDollar8(el).find('.calendar-select[data-part="month"]').get(0);
  const yearSel = dfDollar8(el).find('.calendar-select[data-part="year"]').get(0);
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
  dfDollar8(select).html(html);
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
  const grid = dfDollar8(el).find(".calendar-grid").get(0);
  const panel = dfDollar8(el).find(".calendar-picker").get(0);
  if (!st || !panel)
    return;
  if (view !== "days" && (el.dataset.view || "days") === "days" && grid) {
    dfDollar8(panel).css("minHeight", `${grid.offsetHeight}px`).css("width", `${grid.offsetWidth}px`);
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
    const pick = dfDollar8(el).find(".calendar-day[data-selected] button").get(0) ?? dfDollar8(el).find(".calendar-day[data-today]:not([data-outside]) button").get(0) ?? dfDollar8(el).find(".calendar-day:not([data-outside]):not([data-disabled]) button").get(0);
    pick?.focus();
  } else {
    const pick = dfDollar8(panel).find(".calendar-pick[aria-current]:not([disabled])").get(0) ?? dfDollar8(panel).find(".calendar-pick:not([disabled])").get(0);
    pick?.focus();
  }
  el.dispatchEvent(new CustomEvent("calendar:view", { bubbles: true, detail: { view, year: st.year, month: st.month } }));
}
var renderGrid = (year, month, selectedDay, calId, minDate, maxDate, range, days, locale = names2(null)) => {
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
  const grid = dfDollar8(el).find(".calendar-grid").get(0);
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
  dfDollar8(grid).morph(renderGrid(year, month, selectedDay, el.dataset.calId || "", st.minDate, st.maxDate, range, days, names2(el)));
  if (focusKey)
    dfDollar8(grid).find(`[data-cal-date="${focusKey}"] button`).get(0)?.focus();
  const selDate = dfDollar8(el).find(".calendar-day[data-selected]").get(0)?.getAttribute("data-cal-date");
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
function init8() {
  dfDollar8(".calendar:not([data-init])").toArray().forEach((cal) => {
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
    const header = dfDollar8(cal).find(".calendar-header").get(0);
    let heading = dfDollar8(cal).find(".calendar-heading").get(0);
    if (cal.dataset.caption === "dropdown" && header) {
      if (heading)
        dfDollar8(heading).attr("hidden", "");
      const caption = document.createElement("span");
      caption.className = "calendar-caption";
      dfDollar8(caption).html(`<select class="calendar-select" data-part="month" aria-label="Month">${names2(cal).months.map((n, m) => `<option value="${m}">${esc2(n)}</option>`).join("")}</select>` + `<select class="calendar-select" data-part="year" aria-label="Year"></select>`);
      if (heading)
        dfDollar8(heading).after(caption);
      else
        dfDollar8(header).append(caption);
      fillYears(cal, dfDollar8(caption).find('[data-part="year"]').get(0));
      caption.addEventListener("change", (e) => {
        const sel = e.target;
        const m = Number(dfDollar8(caption).find('[data-part="month"]').get(0).value);
        const y = Number(dfDollar8(caption).find('[data-part="year"]').get(0).value);
        jumpTo(cal, y, m);
        sel.focus();
      });
    } else if (heading && heading.tagName !== "BUTTON") {
      const button = document.createElement("button");
      button.type = "button";
      button.className = heading.className;
      button.setAttribute("aria-live", heading.getAttribute("aria-live") || "polite");
      dfDollar8(heading).replaceWith(button);
      heading = button;
    }
    if (heading && heading.tagName === "BUTTON") {
      dfDollar8(heading).attr("aria-haspopup", "grid");
      if (!dfDollar8(cal).find(".calendar-picker").get(0)) {
        const panel = document.createElement("div");
        panel.className = "calendar-picker";
        panel.setAttribute("role", "group");
        const grid = dfDollar8(cal).find(".calendar-grid").get(0);
        if (grid)
          dfDollar8(grid).after(panel);
        else
          dfDollar8(cal).append(panel);
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
          const picks = Array.from(dfDollar8(cal).find(".calendar-pick").toArray());
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
        const target = dfDollar8(keyOwner).find(`.calendar-day:not([data-outside])[data-cal-date="${isoDate(from)}"] button`).get(0);
        target?.focus();
        return;
      }
      const allBtns = Array.from(dfDollar8(cal).find(".calendar-day button").toArray());
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
init8();
new MutationObserver(init8).observe(document, { childList: true, subtree: true });

// src/components/carousel/carousel.ts
var df$9 = defussGlobals();
var dfDollar9 = defussQuery();
var carSeq = 0;
var carouselStates = ["default"];
function applyMarkup9(_el, _stateName) {}
function triggerStateChange9(carousel, config) {
  const index = Number(config?.index ?? 0);
  if (typeof carousel._goTo === "function")
    carousel._goTo(index);
}
var carouselApi = componentState({
  component: "carousel",
  states: carouselStates,
  apply: (carousel, state) => triggerStateChange9(carousel, state.config),
  read: (carousel, state) => {
    return {
      name: carousel.dataset.stateName || "default",
      config: { ...state.config, index: Number(carousel.dataset.currentIndex || 0) }
    };
  },
  markup: (el, state) => applyMarkup9(el, state.name)
});
df$9.carouselApi = carouselApi;
df$9.carouselStates = carouselStates;
function init9() {
  dfDollar9(".carousel:not([data-init])").toArray().forEach((carousel) => {
    carousel.dataset.init = "";
    bindComponent(carousel, carouselApi);
    const viewport = dfDollar9(carousel).find(".carousel-viewport").get(0);
    const prevBtn = dfDollar9(carousel).find(".carousel-prev").get(0);
    const nextBtn = dfDollar9(carousel).find(".carousel-next").get(0);
    const dotsContainer = dfDollar9(carousel).find(".carousel-dots").get(0);
    const counter = dfDollar9(carousel).find(".carousel-counter").get(0);
    if (!viewport)
      return;
    const slides = () => Array.from(dfDollar9(viewport).find(".carousel-slide").toArray());
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
          dfDollar9(prevBtn).prop("disabled", currentIndex <= 0);
        if (nextBtn)
          dfDollar9(nextBtn).prop("disabled", currentIndex >= allSlides.length - 1);
      }
      if (dotsContainer)
        dfDollar9(dotsContainer).find(".carousel-dot").each(function(i) {
          dfDollar9(this).attr("aria-current", i === currentIndex ? "true" : "false");
        });
      if (counter)
        dfDollar9(counter).text(`Slide ${currentIndex + 1} of ${allSlides.length}`);
      allSlides.forEach((slide, i) => {
        dfDollar9(slide).attr("aria-label", `${i + 1} of ${allSlides.length}`);
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
      dfDollar9(dotsContainer).morph(html);
    };
    if (dotsContainer) {
      renderDots();
      dotsContainer.addEventListener("click", (e) => {
        const dot = e.target.closest(".carousel-dot");
        if (!dot)
          return;
        const idx = Array.from(dfDollar9(dotsContainer).find(".carousel-dot").toArray()).indexOf(dot);
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
init9();
new MutationObserver(init9).observe(document, { childList: true, subtree: true });

// src/components/chart/chart.ts
var df$10 = defussGlobals();
var dfDollar10 = defussQuery();
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
  const stage = dfDollar10(deck).find(":scope > .presentation-stage").get(0) ?? null;
  if (!stage)
    throw new Error('chart: chart.deck() needs a <div class="chart presentation-stage"> child of the .presentation');
  if (!isPlain(states) || Object.keys(states).length === 0)
    throw new Error("chart: chart.deck() needs at least one named state");
  const slides = Array.from(dfDollar10(deck).find(":scope > [data-slide]").toArray());
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
function applyMarkup10(_el, _stateName) {}
function triggerStateChange10(el, stateName, config = {}) {
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
  apply: (el, state) => triggerStateChange10(el, state.name, state.config),
  read: (el, state) => {
    return {
      name: el.dataset.stateName || "default",
      config: { ...state.config }
    };
  },
  markup: (el, state) => applyMarkup10(el, state.name)
});
df$10.chartApi = chartApi;
df$10.chartStates = chartStates;
df$10.chart = { mount, instance, theme: chartTheme, color: chartColor, deck: chartDeck };
df$10.chartStory = chartStory;
function init10() {
  dfDollar10(".chart:not([data-init])").toArray().forEach((el) => {
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
init10();
new MutationObserver(init10).observe(document, { childList: true, subtree: true });

// src/components/color-picker/color-picker.ts
var df$11 = defussGlobals();
var dfDollar11 = defussQuery();
var colorPickerStates = ["default"];
var getInput = (picker) => dfDollar11(picker).find('input[type="color"]').get(0);
var COLOR_FORMATS = ["hex", "rgb", "hsl", "oklch"];
var num3 = (n, digits) => String(Number(n.toFixed(digits)));
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
      return `hsl(${num3(h, 1)} ${num3(sat * 100, 1)}% ${num3(l * 100, 1)}%)`;
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
        return `oklch(${num3(L, 4)} 0 0)`;
      const H = (Math.atan2(B, A) * 180 / Math.PI + 360) % 360;
      return `oklch(${num3(L, 4)} ${num3(C, 4)} ${num3(H, 2)})`;
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
  const display = dfDollar11(picker).find(".color-picker-value").get(0);
  if (display && display.textContent !== text)
    display.textContent = text;
  dfDollar11(picker).find("input[data-color-output]").toArray().forEach((out) => {
    if (out.value === text)
      return;
    out.value = text;
    out.dispatchEvent(new Event("change", { bubbles: true }));
  });
  const switcher = dfDollar11(picker).find("select.color-picker-format").get(0);
  if (switcher && switcher.value !== format)
    switcher.value = format;
}
function applyMarkup11(el, config) {
  if (typeof config?.format === "string" && COLOR_FORMATS.includes(config.format) && config.format !== formatOf(el))
    dfDollar11(el).attr("data-format", config.format);
  const input = getInput(el);
  if (input && typeof config?.value === "string")
    input.value = config.value;
  syncValue(el);
}
function triggerStateChange11(picker, config) {
  if (typeof config?.format === "string" && COLOR_FORMATS.includes(config.format) && config.format !== formatOf(picker)) {
    picker.dataset.format = config.format;
    syncValue(picker);
  }
  const input = getInput(picker);
  if (!input || config?.value === undefined)
    return;
  input.value = String(config.value);
  input.dispatchEvent(new Event("input", { bubbles: true }));
}
var colorPickerApi = componentState({
  component: "color-picker",
  states: colorPickerStates,
  apply: (picker, state) => triggerStateChange11(picker, state.config),
  read: (picker, state) => {
    const input = getInput(picker);
    return {
      name: picker.dataset.stateName || "default",
      config: {
        ...state.config,
        value: input ? input.value : "",
        format: formatOf(picker),
        formatted: input ? formatColor(input.value, formatOf(picker)) : ""
      }
    };
  },
  markup: (el, state) => applyMarkup11(el, state.config)
});
df$11.colorPickerApi = colorPickerApi;
df$11.colorPickerStates = colorPickerStates;
function init11() {
  dfDollar11(".color-picker:not([data-init])").toArray().forEach((picker) => {
    picker.dataset.init = "";
    bindComponent(picker, colorPickerApi);
    const input = dfDollar11(picker).find('input[type="color"]').get(0);
    if (!input)
      return;
    syncValue(picker);
    input.addEventListener("input", () => {
      syncValue(picker);
    });
    dfDollar11(picker).find("select.color-picker-format").get(0)?.addEventListener("change", (e) => {
      picker.dataset.format = e.target.value;
      syncValue(picker);
    });
    new MutationObserver(() => syncValue(picker)).observe(picker, { attributes: true, attributeFilter: ["data-format"] });
  });
}
init11();
new MutationObserver(init11).observe(document, { childList: true, subtree: true });

// src/components/combobox/combobox.ts
var df$12 = defussGlobals();
var dfDollar12 = defussQuery();
var comboboxStates = ["default", "open"];
function applyMarkup12(_el, _stateName) {}
function triggerStateChange12(popover, stateName, _config) {
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
  apply: (popover, state) => triggerStateChange12(popover, state.name, state.config),
  read: (popover, state) => {
    const selected = Array.from(dfDollar12(popover).find('[role="option"][aria-selected="true"]').toArray());
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
  markup: (el, state) => applyMarkup12(el, state.name)
});
df$12.comboboxApi = comboboxApi;
df$12.comboboxStates = comboboxStates;
var esc3 = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var idPart = (t) => t.replace(/[^\w-]/g, "_");
var comboSeq = 0;
function initTags(wrapper) {
  const field = dfDollar12(wrapper).find(".combobox-field").get(0);
  const input = dfDollar12(wrapper).find(".combobox-field-input").get(0);
  const popover = dfDollar12(wrapper).find(".combobox-content").get(0);
  const listbox = dfDollar12(wrapper).find('[role="listbox"]').get(0);
  if (!field || !input || !popover || !listbox)
    return;
  const empty = dfDollar12(wrapper).find(".combobox-empty").get(0);
  const creatable = wrapper.hasAttribute("data-creatable");
  const uid = wrapper.id || popover.id || `dfcb-${++comboSeq}`;
  const options = () => Array.from(dfDollar12(listbox).find('[role="option"]:not(.combobox-create)').toArray());
  const valueOf = (o) => o.dataset.value ?? o.textContent.trim();
  const labelOf = (o) => o.textContent.trim();
  dfDollar12(listbox).attr("aria-multiselectable", "true");
  const anchorId = `--combobox-${uid}`;
  dfDollar12(field).css("anchorName", anchorId);
  dfDollar12(popover).css("positionAnchor", anchorId);
  const tags = document.createElement("span");
  tags.className = "combobox-tags";
  dfDollar12(input).before(tags);
  let createRow = null;
  if (creatable) {
    createRow = document.createElement("div");
    createRow.className = "combobox-item combobox-create";
    createRow.id = `${uid}-create`;
    createRow.setAttribute("role", "option");
    createRow.setAttribute("aria-selected", "false");
    createRow.hidden = true;
    dfDollar12(listbox).append(createRow);
  }
  let highlighted = null;
  const highlight = (el) => {
    if (highlighted)
      dfDollar12(highlighted).data("highlighted", null);
    highlighted = el;
    if (el) {
      dfDollar12(el).data("highlighted", "");
      el.scrollIntoView({ block: "nearest" });
      dfDollar12(input).attr("aria-activedescendant", el.id);
    } else
      dfDollar12(input).attr("aria-activedescendant", null);
  };
  const visible = () => [...options(), ...createRow ? [createRow] : []].filter((o) => !o.hidden && o.getAttribute("aria-disabled") !== "true");
  const isOpen = () => popover.matches(":popover-open");
  const open = () => {
    if (!isOpen())
      safeShowPopover(popover);
    dfDollar12(input).attr("aria-expanded", "true");
  };
  const close = () => {
    if (isOpen())
      popover.hidePopover();
    dfDollar12(input).attr("aria-expanded", "false");
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
      dfDollar12(o).prop("hidden", !match);
      if (match)
        any = true;
      if (q && labelOf(o).toLowerCase() === q)
        exact = o;
    }
    if (createRow) {
      const showCreate = !!text && !exact;
      dfDollar12(createRow).prop("hidden", !showCreate);
      if (showCreate)
        dfDollar12(createRow).text(`Create "${text}"`);
    }
    if (empty)
      dfDollar12(empty).prop("hidden", any || !!createRow && !createRow.hidden);
    highlight(exact ?? (createRow && !createRow.hidden ? createRow : !creatable ? visible()[0] ?? null : null));
  };
  const render = (announce = true, created = null) => {
    const chosen = options().filter((o) => o.getAttribute("aria-selected") === "true");
    const labels = chosen.map(labelOf);
    const values = chosen.map(valueOf);
    const name = wrapper.dataset.name;
    dfDollar12(tags).morph(labels.map((label, i) => `<span class="combobox-tag" id="${uid}-tag-${idPart(values[i])}">${esc3(label)}<button type="button" class="combobox-tag-remove" data-value="${esc3(values[i])}" aria-label="Remove ${esc3(label)}" tabindex="-1"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>`).join("") + (name ? values.map((v) => `<input type="hidden" name="${esc3(name)}" value="${esc3(v)}" id="${uid}-input-${idPart(v)}">`).join("") : ""));
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
        dfDollar12(option).text(text);
        if (createRow)
          dfDollar12(createRow).before(option);
        else
          dfDollar12(listbox).append(option);
        row = option;
        created = text;
      }
      dfDollar12(row).attr("aria-selected", "true");
    } else if (row) {
      if (row.getAttribute("aria-disabled") === "true")
        return;
      const on = row.getAttribute("aria-selected") === "true";
      dfDollar12(row).attr("aria-selected", on && !text ? "false" : "true");
    } else
      return;
    dfDollar12(input).val("");
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
      dfDollar12(option).attr("aria-selected", "false");
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
        dfDollar12(last).attr("aria-selected", "false");
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
    dfDollar12(input).attr("aria-expanded", String(isOpen()));
  });
}
function init12() {
  dfDollar12(".combobox:not([data-init])").toArray().forEach((wrapper) => {
    wrapper.dataset.init = "";
    if (wrapper.hasAttribute("data-tags")) {
      initTags(wrapper);
      return;
    }
    const $wrapper = dfDollar12(wrapper);
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
    dfDollar12(clearBtn).html('<svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>');
    dfDollar12(clearBtn).css("positionAnchor", anchorId);
    $trigger.after(clearBtn);
    const multiple = wrapper.hasAttribute("data-multiple");
    const uid = wrapper.id || popover.id || `dfcb-${++comboSeq}`;
    let tags = null;
    if (multiple) {
      $listbox.attr("aria-multiselectable", "true");
      tags = document.createElement("div");
      tags.className = "combobox-tags";
      tags.setAttribute("role", "list");
      tags.setAttribute("aria-label", `Selected ${trigger.getAttribute("aria-label") || dfDollar12("#" + CSS.escape(trigger.getAttribute("aria-labelledby") || "")).get(0)?.textContent?.trim() || "options"}`);
      dfDollar12(clearBtn).after(tags);
      tags.addEventListener("click", (e) => {
        const btn = e.target.closest(".combobox-tag-remove");
        if (!btn)
          return;
        const option = Array.from(allItems).find((o) => (o.dataset.value ?? o.textContent.trim()) === btn.dataset.value);
        const all = dfDollar12(tags).find(".combobox-tag-remove").toArray();
        const at = all.indexOf(btn);
        if (option)
          dfDollar12(option).attr("aria-selected", "false");
        renderSelection();
        const rest = dfDollar12(tags).find(".combobox-tag-remove").toArray();
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
        dfDollar12(tags).morph(labels.map((label, i) => `<span class="combobox-tag" role="listitem" id="${uid}-tag-${idPart(values[i])}">${esc3(label)}<button type="button" class="combobox-tag-remove" data-value="${esc3(values[i])}" aria-label="Remove ${esc3(label)}"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></button></span>`).join("") + (name ? values.map((v) => `<input type="hidden" name="${esc3(name)}" value="${esc3(v)}" id="${uid}-input-${idPart(v)}">`).join("") : ""));
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
        dfDollar12(item).prop("hidden", !match);
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
        dfDollar12(label).prop("hidden", !groupHasVisible);
      });
      $listbox.find(".combobox-separator").each(function() {
        const sep = this;
        const prev = sep.previousElementSibling;
        const next = sep.nextElementSibling;
        dfDollar12(sep).prop("hidden", Boolean(prev && prev.hidden || next && next.hidden));
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
      dfDollar12(items[index]).data("highlighted", "");
      items[index].scrollIntoView({ block: "nearest" });
      $search.attr("aria-activedescendant", items[index].id);
    };
    const selectItem = (item) => {
      if (item.getAttribute("aria-disabled") === "true")
        return;
      if (multiple) {
        dfDollar12(item).attr("aria-selected", item.getAttribute("aria-selected") === "true" ? "false" : "true");
        renderSelection();
        searchInput.focus();
        return;
      }
      allItems.attr("aria-selected", "false");
      dfDollar12(item).attr("aria-selected", "true");
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
          dfDollar12(last).attr("aria-selected", "false");
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
init12();
new MutationObserver(init12).observe(document, { childList: true, subtree: true });

// src/components/command/command.ts
var df$13 = defussGlobals();
var dfDollar13 = defussQuery();
var commandStates = ["default", "open"];
function applyMarkup13(el, stateName) {
  dfDollar13(el).attr("open", stateName === "open" ? "" : null);
}
function triggerStateChange13(dialog, stateName, _config) {
  switch (stateName) {
    case "default":
      if (dialog.open)
        dialog.close();
      break;
    case "open":
      if (!dialog.open)
        dialog.showModal();
      {
        const input = dfDollar13(dialog).find(".command-input").get(0);
        if (input)
          input.focus();
      }
      break;
  }
}
var commandApi = componentState({
  component: "command",
  states: commandStates,
  apply: (dialog, state) => triggerStateChange13(dialog, state.name, state.config),
  markup: (el, state) => applyMarkup13(el, state.name)
});
df$13.commandApi = commandApi;
df$13.commandStates = commandStates;
bindGlobalKeys((e) => {
  if (!(e.metaKey || e.ctrlKey) || e.altKey || e.key.toLowerCase() !== "k")
    return;
  const dialog = dfDollar13("dialog.command").get(0);
  if (!dialog)
    return;
  e.preventDefault();
  if (dialog.open)
    dialog.close();
  else {
    dialog.showModal();
    const input = dfDollar13(dialog).find(".command-input").get(0);
    if (input)
      input.focus();
  }
  return true;
}, { editable: true });
function getVisibleItems(list) {
  return Array.from(dfDollar13(list).find('.command-item:not([hidden]):not([aria-disabled="true"])'));
}
function highlightItem(list, index) {
  const visible = getVisibleItems(list);
  dfDollar13(list).find(".command-item[data-highlighted]").data("highlighted", null);
  if (visible.length === 0)
    return -1;
  const clamped = (index % visible.length + visible.length) % visible.length;
  dfDollar13(visible[clamped]).data("highlighted", "");
  visible[clamped].scrollIntoView({ block: "nearest" });
  return clamped;
}
function init13() {
  dfDollar13("dialog.command:not([data-init])").toArray().forEach((dialog) => {
    dialog.dataset.init = "";
    bindComponent(dialog, commandApi);
    const input = dfDollar13(dialog).find(".command-input").get(0);
    const list = dfDollar13(dialog).find(".command-list").get(0);
    const empty = dfDollar13(dialog).find(".command-empty").get(0);
    if (!input || !list)
      return;
    let highlightIndex = -1;
    const filter = (q) => {
      const query = q.toLowerCase();
      let hasVisible = false;
      const $items = dfDollar13(list).find(".command-item");
      $items.each(function() {
        const match = !query || this.textContent.toLowerCase().includes(query);
        dfDollar13(this).prop("hidden", !match);
        if (match)
          hasVisible = true;
      });
      dfDollar13(list).find(".command-group").each(function() {
        dfDollar13(this).prop("hidden", dfDollar13(this).find(".command-item:not([hidden])").length === 0);
      });
      dfDollar13(list).find(".command-separator").prop("hidden", !!query);
      if (empty)
        dfDollar13(empty).prop("hidden", hasVisible);
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
      dfDollar13(input).val("");
      filter("");
      dfDollar13(list).find(".command-item[data-highlighted]").data("highlighted", null);
      highlightIndex = -1;
    });
  });
  dfDollar13("[data-command-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar13("#" + CSS.escape(trigger.dataset.commandTrigger)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog.showModal();
      const input = dfDollar13(dialog).find(".command-input")[0];
      if (input)
        input.focus();
    });
  });
}
init13();
new MutationObserver(init13).observe(document, { childList: true, subtree: true });

// src/components/context-menu/context-menu.ts
var df$14 = defussGlobals();
var dfDollar14 = defussQuery();
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
function applyMarkup14(_el, _stateName) {}
function triggerStateChange14(menu, stateName, config) {
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
  apply: (menu, state) => triggerStateChange14(menu, state.name, state.config),
  read: (menu, state) => {
    return {
      name: menu.matches(":popover-open") ? "open" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup14(el, state.name)
});
df$14.contextMenuApi = contextMenuApi;
df$14.contextMenuStates = contextMenuStates;
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
function init14() {
  dfDollar14("[data-context-menu]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const menu = dfDollar14("#" + CSS.escape(trigger.dataset.contextMenu)).get(0);
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
init14();
new MutationObserver(init14).observe(document, { childList: true, subtree: true });

// src/components/cookie-consent/cookie-consent.ts
var df$15 = defussGlobals();
var q = defussQuery();
var cookieConsentStates = ["default", "open", "preferences", "services"];
var builtInLanguages = ["en", "de"];
var categories = ["essential", "functional", "marketing", "other"];
var translations = {
  en: {
    title: "Your privacy choices",
    text: "Essential services are always enabled. Choose whether to allow optional services. You can change or withdraw your choices at any time in Privacy settings.",
    settings: "Privacy settings",
    close: "Close without saving",
    language: "Language",
    preferences: "Privacy preferences",
    preferencesText: "Choose categories or individual services. Changes apply when you save.",
    categories: "Categories",
    services: "Services",
    acceptAll: "Accept all",
    denyAll: "Reject optional",
    save: "Save preferences",
    required: "Required",
    privacyPolicy: "Privacy policy",
    legalNotice: "Legal notice",
    moreInformation: "More information",
    blocked: "is blocked until you allow this service.",
    activate: "Allow this service",
    thirdParty: "Third-party cookies cannot be removed by this site. Use your browser settings to remove them.",
    storageError: "Your choice applies to this page, but could not be saved for your next visit.",
    categoryNames: { essential: "Essential", functional: "Functional", marketing: "Marketing", other: "Other" },
    categoryDescriptions: {
      essential: "Required for the basic functions of this website.",
      functional: "Optional features and measurement of website use.",
      marketing: "Advertising, targeting, and campaign measurement.",
      other: "Additional optional data processing services."
    }
  },
  de: {
    title: "Ihre Datenschutz-Auswahl",
    text: "Notwendige Dienste sind immer aktiv. Entscheiden Sie, welche optionalen Dienste Sie erlauben. Ihre Auswahl können Sie jederzeit in den Datenschutz-Einstellungen ändern oder widerrufen.",
    settings: "Datenschutz-Einstellungen",
    close: "Ohne Speichern schließen",
    language: "Sprache",
    preferences: "Datenschutz-Einstellungen",
    preferencesText: "Wählen Sie Kategorien oder einzelne Dienste. Änderungen gelten erst nach dem Speichern.",
    categories: "Kategorien",
    services: "Dienste",
    acceptAll: "Alle akzeptieren",
    denyAll: "Optionale ablehnen",
    save: "Auswahl speichern",
    required: "Notwendig",
    privacyPolicy: "Datenschutzerklärung",
    legalNotice: "Impressum",
    moreInformation: "Mehr Informationen",
    blocked: "ist gesperrt, bis Sie diesen Dienst erlauben.",
    activate: "Diesen Dienst erlauben",
    thirdParty: "Cookies von Drittanbietern kann diese Website nicht löschen. Entfernen Sie diese in Ihren Browser-Einstellungen.",
    storageError: "Ihre Auswahl gilt für diese Seite, konnte aber nicht für Ihren nächsten Besuch gespeichert werden.",
    categoryNames: { essential: "Notwendig", functional: "Funktional", marketing: "Marketing", other: "Sonstige" },
    categoryDescriptions: {
      essential: "Für die grundlegenden Funktionen dieser Website erforderlich.",
      functional: "Optionale Funktionen und Messung der Website-Nutzung.",
      marketing: "Werbung, Targeting und Kampagnenmessung.",
      other: "Zusätzliche optionale Dienste zur Datenverarbeitung."
    }
  }
};
var controllers2 = new Map;
var resourceOwners = new WeakMap;
var executedScripts = new WeakSet;
var uid2 = 0;
function localize(value, language) {
  if (typeof value === "string")
    return value;
  return value?.[language] ?? value?.en ?? Object.values(value ?? {}).find((v) => typeof v === "string") ?? "";
}
function languagesOf(config) {
  return [...new Set([...builtInLanguages, ...Object.keys(config.translations ?? {})])];
}
var LANGUAGE = /^[a-zA-Z]{2,3}(-[a-zA-Z0-9]{2,8})*$/;
function languageName(code) {
  try {
    const name = new Intl.DisplayNames([code], { type: "language" }).of(code);
    return name ? name.charAt(0).toLocaleUpperCase(code) + name.slice(1) : code;
  } catch {
    return code;
  }
}
function escape(value) {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
function safeUrl(value, doc) {
  if (!value)
    return;
  try {
    const url = new URL(value, doc.baseURI);
    return ["http:", "https:"].includes(url.protocol) ? url.href : undefined;
  } catch {
    return;
  }
}
function validateConfig(config) {
  if (!config || !Array.isArray(config.cookieOrigins))
    throw new TypeError("cookie-consent: cookieOrigins must be an array");
  const ids = new Set;
  for (const origin of config.cookieOrigins) {
    if (!origin || !/^[a-zA-Z][\w-]*$/.test(origin.id) || ids.has(origin.id))
      throw new TypeError("cookie-consent: service IDs must be unique and match [a-zA-Z][\\w-]*");
    if (typeof origin.name !== "string" || !origin.name.trim() || !categories.includes(origin.category) || !(typeof origin.description === "string" || origin.description && typeof origin.description === "object")) {
      throw new TypeError(`cookie-consent: invalid service ${origin.id}`);
    }
    if (origin.cookies?.some((cookie) => !/^[!#$%&'*+.^_`|~0-9a-zA-Z-]+$/.test(typeof cookie === "string" ? cookie : cookie.name) || typeof cookie !== "string" && /[;\r\n]/.test(`${cookie.path ?? ""}${cookie.domain ?? ""}`))) {
      throw new TypeError(`cookie-consent: invalid cookie descriptor for ${origin.id}`);
    }
    ids.add(origin.id);
  }
  for (const code of Object.keys(config.translations ?? {})) {
    if (!LANGUAGE.test(code))
      throw new TypeError(`cookie-consent: invalid language code ${code}`);
  }
  if (config.defaultLanguage !== undefined && !languagesOf(config).includes(config.defaultLanguage)) {
    throw new TypeError(`cookie-consent: unsupported language ${config.defaultLanguage} - add its texts to translations`);
  }
  if (config.revision !== undefined && (typeof config.revision !== "string" || !config.revision))
    throw new TypeError("cookie-consent: revision must be a nonempty string");
  if (config.maxAgeDays !== undefined && (!Number.isFinite(config.maxAgeDays) || config.maxAgeDays <= 0))
    throw new TypeError("cookie-consent: maxAgeDays must be positive");
}

class Controller {
  root;
  config;
  dialog;
  doc;
  scope;
  key;
  revision;
  storage;
  saved;
  gates = new Map;
  off = [];
  id;
  observer;
  state;
  draft = new Set;
  view = "default";
  trigger = null;
  destroyed = false;
  storageFailed = false;
  constructor(root, config) {
    validateConfig(config);
    this.root = root;
    this.config = { ...config, cookieOrigins: config.cookieOrigins.map((origin) => ({ ...origin })) };
    this.doc = root.ownerDocument;
    this.scope = config.resourceRoot ?? this.doc;
    this.id = root.id || `cookie-consent-${++uid2}`;
    if (!/^[a-zA-Z][\w-]*$/.test(this.id))
      throw new TypeError("cookie-consent: host ID must match [a-zA-Z][\\w-]*");
    this.key = config.storageKey ?? `defuss-shadcn:${this.id}`;
    this.revision = config.revision ?? "1";
    let storage = config.storage;
    if (storage === undefined) {
      try {
        storage = this.doc.defaultView?.localStorage ?? null;
      } catch {
        storage = null;
      }
    }
    this.storage = storage;
    this.saved = storage ? persisted(this.key, null, {
      storage,
      validate: (v) => v === null || typeof v === "object" && !Array.isArray(v),
      onError: () => {
        this.storageFailed = true;
      }
    }) : null;
    this.state = this.readStored();
    this.draft = new Set(this.state.acceptedServices);
    const authoredView = q(root).attr("data-state-name");
    q(root).attr("id", this.id).attr("data-init", "").attr("data-cookie-consent-ready", "");
    q(root).append(`<dialog class="dialog cookie-consent-dialog" data-init data-ce-chrome aria-labelledby="${this.id}-title" aria-describedby="${this.id}-description"><div class="dialog-content cookie-consent-content"></div></dialog>`);
    this.dialog = q(".cookie-consent-dialog", root)[0];
    controllers2.set(root, this);
    bindComponent(root, cookieConsentApi);
    root.api = this;
    this.repaint();
    this.listen(root, "click", (event) => this.onClick(event));
    this.listen(root, "change", (event) => this.onChange(event));
    this.listen(this.dialog, "cancel", () => this.close());
    this.listen(this.dialog, "close", () => {
      if (!this.dialog.open)
        this.finishClose();
    });
    this.listen(this.doc, "click", (event) => {
      const target = event.target instanceof Element ? q(event.target).closest("[data-cookie-consent-open]")[0] : undefined;
      if (target && q(target).attr("data-cookie-consent-open") === this.id) {
        this.trigger = target;
        this.open();
      }
    });
    if (this.doc.defaultView)
      this.listen(this.doc.defaultView, "storage", (event) => {
        const e = event;
        if ((e.key === this.key || e.key === null) && e.storageArea === this.storage) {
          const previous = this.state;
          if (this.saved)
            reload(this.saved);
          this.state = this.readStored();
          this.draft = new Set(this.state.acceptedServices);
          this.revoke(previous);
          this.updateTagsActivation();
          this.repaint();
          this.emit("storage");
          if (!this.state.decisionMade && this.config.autoShow !== false)
            this.open();
        }
      });
    this.observer = new MutationObserver(() => this.updateTagsActivation());
    this.observer.observe(this.scope, { childList: true, subtree: true });
    controllers2.set(root, this);
    this.updateTagsActivation();
    if (authoredView && authoredView !== "default" && cookieConsentStates.includes(authoredView))
      this.setState(authoredView);
    else if (!this.state.decisionMade && config.autoShow !== false)
      this.setState("open");
  }
  listen(target, type, handler) {
    q(target).on(type, handler, { capture: true });
    this.off.push(() => q(target).off(type, handler));
  }
  assertAlive() {
    if (this.destroyed)
      throw new Error("cookie-consent: instance was destroyed");
  }
  origin(id) {
    const origin = this.config.cookieOrigins.find((service) => service.id === id);
    if (!origin)
      throw new Error(`cookie-consent: unknown service ${id}`);
    return origin;
  }
  normalize(ids) {
    const selected = new Set(ids);
    return this.config.cookieOrigins.filter((service) => service.category === "essential" || !service.disabled && selected.has(service.id)).map((service) => service.id).sort();
  }
  makeState(ids, decisionMade = false, updatedAt = null, language = this.config.defaultLanguage ?? "en") {
    const acceptedServices = this.normalize(ids);
    const optional = this.config.cookieOrigins.filter((s) => s.category !== "essential" && !s.disabled);
    return {
      revision: this.revision,
      decisionMade,
      language,
      acceptedServices,
      updatedAt,
      acceptedCategories: categories.filter((category) => category === "essential" || (() => {
        const services = this.config.cookieOrigins.filter((s) => s.category === category && !s.disabled);
        return services.length > 0 && services.every((s) => acceptedServices.includes(s.id));
      })()),
      acceptAll: decisionMade && optional.length > 0 && optional.every((s) => acceptedServices.includes(s.id)),
      denyAll: decisionMade && optional.every((s) => !acceptedServices.includes(s.id))
    };
  }
  readStored() {
    const fallback = this.makeState([]);
    const s = this.saved?.value;
    if (!s)
      return fallback;
    const age = Date.now() - (s.updatedAt ?? 0);
    if (s.schemaVersion !== 1 || s.revision !== this.revision || s.decisionMade !== true || !languagesOf(this.config).includes(s.language ?? "") || !Array.isArray(s.acceptedServices) || !s.acceptedServices.every((id) => typeof id === "string") || typeof s.updatedAt !== "number" || !Number.isFinite(s.updatedAt) || age < 0 || age > (this.config.maxAgeDays ?? 180) * 86400000)
      return fallback;
    return this.makeState(s.acceptedServices, true, s.updatedAt, s.language);
  }
  persist() {
    if (!this.saved) {
      this.storageFailed = this.config.storage !== null;
      return;
    }
    const { revision, decisionMade, language, acceptedServices, updatedAt } = this.state;
    this.storageFailed = false;
    this.saved.set({ schemaVersion: 1, revision, decisionMade, language, acceptedServices: [...acceptedServices], updatedAt });
    this.storageFailed ||= !persistOk(this.saved);
  }
  getConsent() {
    return { ...this.state, acceptedServices: [...this.state.acceptedServices], acceptedCategories: [...this.state.acceptedCategories] };
  }
  getDraft() {
    return [...this.draft].sort();
  }
  isServiceAccepted(id) {
    this.origin(id);
    return this.state.acceptedServices.includes(id);
  }
  getState() {
    return cookieConsentApi.getState(this.root);
  }
  viewState() {
    return { name: this.dialog.open ? this.view : "default", config: { language: this.state.language } };
  }
  render(state) {
    return cookieConsentApi.render(state ?? this.getState());
  }
  setState(name, config = {}) {
    cookieConsentApi.setState(this.root, name, config);
  }
  applyView(name, config = {}) {
    this.assertAlive();
    if (!cookieConsentStates.includes(name))
      throw new Error(`cookie-consent: unknown state "${name}"`);
    if (config.language)
      this.setLanguage(config.language);
    if (name === "default") {
      this.close();
      return;
    }
    if (!this.dialog.open) {
      this.draft = new Set(this.state.acceptedServices);
      this.trigger ??= this.doc.activeElement instanceof HTMLElement ? this.doc.activeElement : null;
    }
    this.view = name;
    q(this.root).attr("data-state-name", name);
    this.repaint();
    const modal = !(this.isBanner() && name === "open");
    if (this.dialog.open && this.dialog.matches(":modal") !== modal)
      this.dialog.close();
    if (!this.dialog.open) {
      if (modal)
        this.dialog.showModal();
      else
        this.dialog.show();
    }
  }
  isBanner() {
    return q(this.root).attr("data-variant") === "banner";
  }
  open() {
    this.setState("preferences");
  }
  close() {
    this.assertAlive();
    if (this.dialog.open)
      this.dialog.close();
    this.finishClose();
  }
  finishClose() {
    this.view = "default";
    this.draft = new Set(this.state.acceptedServices);
    q(this.root).attr("data-state-name", "default");
    if (this.trigger?.isConnected)
      this.trigger.focus();
    this.trigger = null;
  }
  setLanguage(language) {
    this.assertAlive();
    if (!languagesOf(this.config).includes(language))
      throw new Error(`cookie-consent: unsupported language ${language}`);
    this.state.language = language;
    if (this.state.decisionMade)
      this.persist();
    this.repaint();
    this.refreshOverlays();
  }
  commit(ids, reason, close = true) {
    this.assertAlive();
    const previous = this.state;
    this.state = this.makeState(ids, true, Date.now(), previous.language);
    this.draft = new Set(this.state.acceptedServices);
    this.persist();
    this.revoke(previous);
    this.updateTagsActivation();
    this.repaint();
    if (close)
      this.close();
    this.emit(reason);
  }
  acceptAll() {
    this.commit(this.config.cookieOrigins.filter((s) => !s.disabled).map((s) => s.id), "accept");
  }
  denyAll() {
    this.commit([], "deny");
  }
  save() {
    this.commit(this.draft, "save");
  }
  acceptService(id) {
    const origin = this.origin(id);
    if (origin.disabled && origin.category !== "essential")
      throw new Error(`cookie-consent: service ${id} is disabled`);
    this.commit([...this.state.acceptedServices, id], "service", false);
  }
  revokeService(id) {
    if (this.origin(id).category === "essential")
      throw new Error("cookie-consent: essential services cannot be revoked");
    this.commit(this.state.acceptedServices.filter((s) => s !== id), "service", false);
  }
  reset() {
    this.assertAlive();
    if (this.saved) {
      this.saved.set(null);
      if (!forget(this.saved))
        this.storageFailed = true;
    }
    const previous = this.state;
    this.state = this.makeState([], false, null, previous.language);
    this.draft = new Set(this.state.acceptedServices);
    this.revoke(previous);
    this.updateTagsActivation();
    this.setState("open");
    this.emit("reset");
  }
  error(kind, error) {
    this.root.dispatchEvent(new CustomEvent("cookie-consent:error", { bubbles: true, detail: { kind, error } }));
  }
  emit(reason) {
    this.root.dispatchEvent(new CustomEvent("cookie-consent:change", { bubbles: true, detail: { state: this.getConsent(), reason } }));
    try {
      this.config.onChange?.(this.getConsent(), reason);
    } catch (error) {
      this.error("callback", error);
    }
    const callback = reason === "accept" ? this.config.onAccept : reason === "deny" ? this.config.onDeny : undefined;
    try {
      callback?.(this.getConsent());
    } catch (error) {
      this.error("callback", error);
    }
    if (this.storageFailed)
      this.error("storage", new Error(this.messages().storageError));
  }
  revoke(previous) {
    for (const origin of this.config.cookieOrigins) {
      if (!previous.acceptedServices.includes(origin.id) || this.state.acceptedServices.includes(origin.id))
        continue;
      try {
        origin.onRevoke?.();
      } catch (error) {
        this.error("revoke", error);
      }
      for (const cookie of origin.cookies ?? []) {
        const c = typeof cookie === "string" ? { name: cookie, path: "/" } : cookie;
        this.doc.cookie = `${c.name}=; Max-Age=0; Path=${c.path ?? "/"}${c.domain ? `; Domain=${c.domain}` : ""}; SameSite=Lax`;
      }
    }
  }
  messages() {
    const base = translations[this.state.language] ?? translations.en;
    const overrides = this.config.translations?.[this.state.language];
    return { ...base, ...overrides, categoryNames: { ...base.categoryNames, ...overrides?.categoryNames }, categoryDescriptions: { ...base.categoryDescriptions, ...overrides?.categoryDescriptions } };
  }
  links() {
    const tr = this.messages();
    return [[this.config.privacyPolicyUrl, tr.privacyPolicy], [this.config.legalNoticeUrl, tr.legalNotice]].map(([value, label]) => {
      const url = safeUrl(localize(value, this.state.language), this.doc);
      return url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(label)}</a>` : "";
    }).join("");
  }
  repaint() {
    if (this.destroyed)
      return;
    const tr = this.messages();
    const preferenceView = this.view === "preferences" || this.view === "services";
    const title = preferenceView ? tr.preferences : tr.title;
    const description = preferenceView ? tr.preferencesText : tr.text;
    const button = (action, text, variant = "") => `<button type="button" class="btn"${variant ? ` data-variant="${variant}"` : ""} data-cookie-action="${action}">${escape(text)}</button>`;
    q(this.dialog).attr("lang", this.state.language);
    q(this.root).attr("data-state-name", this.view).attr("data-consent-status", this.state.decisionMade ? "decided" : "pending");
    q(".cookie-consent-content", this.dialog).html(`<header class="dialog-header cookie-consent-header">
      <div><p class="cookie-consent-eyebrow">${escape(tr.settings)}</p><h2 id="${this.id}-title" class="dialog-title cookie-consent-title" tabindex="-1">${escape(title)}</h2></div>
      <div class="cookie-consent-tools"><select class="select" data-size="sm" data-cookie-language aria-label="${escape(tr.language)}">${languagesOf(this.config).map((code) => `<option value="${escape(code)}" lang="${escape(code)}">${escape(languageName(code))}</option>`).join("")}</select>
      <button type="button" class="btn" data-variant="ghost" data-size="icon-sm" data-cookie-action="close" aria-label="${escape(tr.close)}">×</button></div>
      </header><div class="cookie-consent-body"><p id="${this.id}-description" class="dialog-description cookie-consent-description">${escape(description)}</p>
      ${preferenceView ? `<div class="tabs cookie-consent-tabs"><div class="tab-list" role="tablist" data-init aria-label="${escape(tr.preferences)}">
        <button type="button" class="tab-trigger" role="tab" id="${this.id}-categories-tab" data-cookie-action="preferences" aria-controls="${this.id}-categories" aria-selected="${this.view === "preferences"}" tabindex="${this.view === "preferences" ? 0 : -1}">${escape(tr.categories)}</button>
        <button type="button" class="tab-trigger" role="tab" id="${this.id}-services-tab" data-cookie-action="services" aria-controls="${this.id}-services" aria-selected="${this.view === "services"}" tabindex="${this.view === "services" ? 0 : -1}">${escape(tr.services)}</button></div>
        <section class="tab-content" role="tabpanel" id="${this.id}-categories" aria-labelledby="${this.id}-categories-tab" ${this.view === "services" ? "hidden" : ""}>${this.categoryMarkup()}</section>
        <section class="tab-content" role="tabpanel" id="${this.id}-services" aria-labelledby="${this.id}-services-tab" ${this.view !== "services" ? "hidden" : ""}>${this.serviceMarkup()}</section></div>` : ""}
      <nav class="cookie-consent-links" aria-label="${escape(tr.moreInformation)}">${this.links()}</nav>
      </div><footer class="dialog-footer cookie-consent-footer">${!preferenceView ? button("preferences", tr.settings, "outline") : button("save", tr.save, "outline")}${button("deny", tr.denyAll)}${button("accept", tr.acceptAll)}</footer>`);
    q("[data-cookie-language]", this.dialog).val(this.state.language);
    for (const category of categories) {
      const services = this.config.cookieOrigins.filter((s) => s.category === category && !s.disabled);
      const selected = services.filter((s) => this.draft.has(s.id)).length;
      q(`[data-cookie-category="${category}"]`, this.dialog).prop("checked", category === "essential" || services.length > 0 && selected === services.length).prop("indeterminate", selected > 0 && selected < services.length);
    }
    for (const origin of this.config.cookieOrigins) {
      q(`[data-cookie-service="${origin.id}"]`, this.dialog).prop("checked", this.draft.has(origin.id));
    }
    q(".cookie-consent-floating", this.root).remove();
    if (this.config.showFloatingButton !== false) {
      q(this.root).append(`<button type="button" class="btn cookie-consent-floating" data-variant="outline" data-size="sm" data-ce-chrome data-cookie-action="preferences" aria-label="${escape(tr.settings)}" aria-haspopup="dialog">${escape(tr.settings)}</button>`);
    }
    this.bindTabKeys();
  }
  categoryMarkup() {
    const tr = this.messages();
    return categories.map((category) => {
      const ids = this.config.cookieOrigins.filter((s) => s.category === category && !s.disabled).map((s) => s.id);
      const required = category === "essential";
      const box = `${this.id}-category-${category}`;
      return `<div class="cookie-consent-row checkbox-item-block"><input class="checkbox" type="checkbox" id="${box}" data-cookie-category="${category}" ${required || ids.length > 0 && ids.every((id) => this.draft.has(id)) ? "checked" : ""} ${required || ids.length === 0 ? "disabled" : ""} aria-describedby="${box}-description"><div><label for="${box}" class="cookie-consent-label">${escape(tr.categoryNames[category])}${required ? ` <span class="badge" data-variant="secondary">${escape(tr.required)}</span>` : ""}</label><p class="field-description" id="${box}-description">${escape(tr.categoryDescriptions[category])}</p></div></div>`;
    }).join("");
  }
  serviceMarkup() {
    const tr = this.messages();
    return this.config.cookieOrigins.map((origin) => {
      const url = safeUrl(localize(origin.url, this.state.language), this.doc);
      const data = origin.dataCollected?.[this.state.language] ?? origin.dataCollected?.en ?? Object.values(origin.dataCollected ?? {})[0] ?? [];
      const box = `${this.id}-service-${origin.id}`;
      return `<div class="cookie-consent-row checkbox-item-block"><input class="checkbox" type="checkbox" id="${box}" data-cookie-service="${origin.id}" ${this.draft.has(origin.id) ? "checked" : ""} ${origin.category === "essential" || origin.disabled ? "disabled" : ""} aria-describedby="${box}-description"><div><label for="${box}" class="cookie-consent-label">${escape(origin.name)} <span class="badge" data-variant="outline">${escape(tr.categoryNames[origin.category])}</span></label>
        <p class="field-description" id="${box}-description">${escape(localize(origin.description, this.state.language))}</p>
        ${url ? `<a href="${escape(url)}" target="_blank" rel="noopener noreferrer">${escape(tr.moreInformation)}</a>` : ""}
        ${origin.domain ? `<p class="field-description cookie-consent-note">${escape(origin.domain)} · ${escape(tr.thirdParty)}</p>` : ""}
        ${data.length ? `<ul class="cookie-consent-data">${data.map((value) => `<li class="badge" data-variant="secondary">${escape(value)}</li>`).join("")}</ul>` : ""}</div></div>`;
    }).join("");
  }
  bindTabKeys() {
    if (q(this.root).attr("data-cookie-keys") !== null)
      return;
    q(this.root).attr("data-cookie-keys", "");
    this.listen(this.root, "keydown", (event) => {
      const e = event;
      const target = e.target instanceof Element ? q(e.target).closest('[role="tab"]')[0] : undefined;
      if (!target || !["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key))
        return;
      e.preventDefault();
      const name = e.key === "Home" ? "preferences" : e.key === "End" ? "services" : this.view === "services" ? "preferences" : "services";
      this.setState(name);
      q(`[data-cookie-action="${name}"]`, this.dialog)[0]?.focus();
    });
  }
  onClick(event) {
    if (event.target === this.dialog && this.dialog.matches(":modal")) {
      this.close();
      return;
    }
    const target = event.target instanceof Element ? q(event.target).closest("[data-cookie-action]")[0] : undefined;
    if (!target)
      return;
    switch (q(target).attr("data-cookie-action")) {
      case "accept":
        this.acceptAll();
        break;
      case "deny":
        this.denyAll();
        break;
      case "save":
        this.save();
        break;
      case "close":
        this.close();
        break;
      case "preferences":
        this.setState("preferences");
        break;
      case "services":
        this.setState("services");
        break;
    }
  }
  onChange(event) {
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement))
      return;
    if (q(target).attr("data-cookie-language") !== null) {
      this.setLanguage(q(target).val());
      return;
    }
    if (!(target instanceof HTMLInputElement))
      return;
    const service = q(target).attr("data-cookie-service");
    const category = q(target).attr("data-cookie-category");
    const checked = Boolean(q(target).prop("checked"));
    if (service) {
      const origin = this.origin(service);
      if (origin.category !== "essential" && !origin.disabled) {
        if (checked)
          this.draft.add(service);
        else
          this.draft.delete(service);
      }
    } else if (category && categories.includes(category) && category !== "essential") {
      for (const origin of this.config.cookieOrigins.filter((s) => s.category === category && !s.disabled)) {
        if (checked)
          this.draft.add(origin.id);
        else
          this.draft.delete(origin.id);
      }
    } else
      return;
    const focusKey = service ? `[data-cookie-service="${service}"]` : `[data-cookie-category="${category}"]`;
    this.repaint();
    q(focusKey, this.dialog)[0]?.focus();
  }
  updateTagsActivation() {
    if (this.destroyed)
      return;
    for (const [element, record] of this.gates) {
      if (!element.isConnected || !this.scope.contains(element)) {
        if (record.active)
          q(record.active).remove();
        record.handlers?.forEach((off) => off());
        if (record.wrapper && !element.isConnected)
          q(record.wrapper).remove();
        this.gates.delete(element);
        resourceOwners.delete(element);
      }
    }
    for (const element of q("[data-cookie-consent]:not([data-cookie-consent-active])", this.scope)) {
      const id = q(element).attr("data-cookie-consent");
      const origin = this.config.cookieOrigins.find((s) => s.id === id);
      if (!origin || !["SCRIPT", "IFRAME"].includes(element.tagName))
        continue;
      const owner = resourceOwners.get(element);
      if (owner && owner !== this)
        continue;
      resourceOwners.set(element, this);
      let record = this.gates.get(element);
      if (!record) {
        record = { service: origin.id, executed: executedScripts.has(element) };
        this.gates.set(element, record);
        if (element.tagName === "SCRIPT" && !["text/plain", "text"].includes(q(element).attr("type") ?? "")) {
          record.executed = true;
          this.error("markup", new Error(`cookie-consent: ${origin.id} script must be authored inert (type="text/plain")`));
        }
        if (element.tagName === "IFRAME" && (q(element).attr("src") || q(element).attr("srcdoc"))) {
          this.error("markup", new Error(`cookie-consent: ${origin.id} iframe must have no src or srcdoc before consent`));
        }
      }
      if (element.tagName === "SCRIPT")
        this.syncScript(element, record);
      else
        this.syncFrame(element, record, origin);
    }
  }
  syncScript(script, record) {
    if (!this.state.acceptedServices.includes(record.service)) {
      if (record.active) {
        q(record.active).remove();
        record.active = undefined;
      }
      return;
    }
    if (record.executed)
      return;
    const src = q(script).attr("data-consent-src");
    const url = src ? safeUrl(src, this.doc) : undefined;
    if (src && !url) {
      record.executed = true;
      this.error("url", new Error("cookie-consent: invalid script URL"));
      return;
    }
    const active = this.doc.createElement("script");
    q(active).attr("data-cookie-consent-active", this.id);
    const type = q(script).attr("data-consent-type") ?? "text/javascript";
    if (!["text/javascript", "module"].includes(type)) {
      record.executed = true;
      this.error("markup", new Error("cookie-consent: invalid script type"));
      return;
    }
    q(active).attr("type", type);
    for (const name of ["async", "defer", "integrity", "crossorigin", "referrerpolicy", "nomodule"]) {
      const value = q(script).attr(name);
      if (value !== null && value !== undefined)
        q(active).attr(name, value);
    }
    if (script.nonce)
      q(active).prop("nonce", script.nonce);
    if (url)
      q(active).attr("src", url);
    else
      q(active).text(q(script).text());
    record.executed = true;
    executedScripts.add(script);
    record.active = active;
    q(script).after(active);
  }
  syncFrame(frame, record, origin) {
    const allowed = this.state.acceptedServices.includes(record.service);
    if (allowed) {
      const url = safeUrl(q(frame).attr("data-consent-src") ?? "", this.doc);
      if (url && q(frame).attr("src") !== url)
        q(frame).attr("src", url);
      if (record.overlay)
        q(record.overlay).prop("hidden", true);
      q(frame).prop("hidden", false);
      return;
    }
    if (q(frame).attr("src"))
      q(frame).attr("src", "about:blank").attr("src", null);
    if (q(frame).attr("srcdoc"))
      q(frame).attr("srcdoc", null);
    q(frame).prop("hidden", true);
    if (q(frame).attr("data-consent-placeholder") === "none")
      return;
    if (!record.wrapper) {
      const wrapper = q('<div class="cookie-consent-embed"></div>')[0];
      q(frame).before(wrapper);
      q(frame).appendTo(wrapper);
      record.wrapper = wrapper;
      const overlay = q('<div class="cookie-consent-placeholder"></div>')[0];
      q(wrapper).append(overlay);
      record.overlay = overlay;
      this.renderOverlay(record, origin);
    }
    if (record.overlay)
      q(record.overlay).prop("hidden", false);
  }
  renderOverlay(record, origin) {
    if (!record.overlay)
      return;
    const tr = this.messages();
    record.handlers?.forEach((off) => off());
    q(record.overlay).html(`<p><strong>${escape(origin.name)}</strong> ${escape(tr.blocked)}</p><div class="cookie-consent-embed-actions"><button type="button" class="btn" data-size="sm" data-cookie-allow>${escape(tr.activate)}</button><button type="button" class="btn" data-variant="outline" data-size="sm" data-cookie-settings>${escape(tr.settings)}</button></div>`);
    const allow = q("[data-cookie-allow]", record.overlay);
    const settings = q("[data-cookie-settings]", record.overlay);
    const onAllow = () => this.acceptService(origin.id);
    const onSettings = () => this.open();
    allow.prop("disabled", Boolean(origin.disabled)).on("click", onAllow);
    settings.on("click", onSettings);
    record.handlers = [() => allow.off("click", onAllow), () => settings.off("click", onSettings)];
  }
  refreshOverlays() {
    for (const record of this.gates.values())
      this.renderOverlay(record, this.origin(record.service));
  }
  destroy() {
    if (this.destroyed)
      return;
    this.close();
    this.observer.disconnect();
    this.off.forEach((off) => off());
    this.saved?.destroy();
    const previous = this.state;
    this.state = this.makeState([]);
    this.revoke(previous);
    for (const [element, record] of this.gates) {
      if (record.active)
        q(record.active).remove();
      record.handlers?.forEach((off) => off());
      if (element.tagName === "IFRAME") {
        q(element).attr("src", "about:blank").attr("src", null).prop("hidden", false);
        if (record.wrapper) {
          q(record.wrapper).before(element);
          q(record.wrapper).remove();
        }
      }
      resourceOwners.delete(element);
    }
    q(this.dialog).remove();
    q(".cookie-consent-floating", this.root).remove();
    q(this.root).attr("data-init", null).attr("data-cookie-consent-ready", null).attr("data-cookie-keys", null);
    q(this.root).attr("data-cookie-consent-destroyed", "");
    unbindComponent(this.root);
    delete this.root.api;
    controllers2.delete(this.root);
    this.destroyed = true;
  }
}
function controllerFor(el) {
  const instance = controllers2.get(el);
  if (!instance)
    throw new Error("cookie-consent: initialize the element first");
  return instance;
}
function triggerStateChange15(el, stateName, config) {
  controllerFor(el).applyView(stateName, config);
}
var cookieConsentApi = componentState({
  component: "cookie-consent",
  states: cookieConsentStates,
  apply: (el, state) => triggerStateChange15(el, state.name, state.config),
  read: (el) => controllerFor(el).viewState()
});
var cookieConsent = {
  create(root, config) {
    if (controllers2.has(root))
      return controllers2.get(root);
    if (!root.isConnected)
      throw new Error("cookie-consent: root must be connected");
    if (!q(root).hasClass("cookie-consent"))
      q(root).addClass("cookie-consent");
    q(root).attr("data-cookie-consent-destroyed", null);
    const controller = new Controller(root, config);
    controllers2.set(root, controller);
    return controller;
  },
  get(root) {
    return controllers2.get(root);
  },
  init: init15
};
df$15.cookieConsentApi = cookieConsentApi;
df$15.cookieConsentStates = cookieConsentStates;
df$15.cookieConsent = cookieConsent;
function init15() {
  for (const root of q(".cookie-consent:not([data-cookie-consent-destroyed]):not([data-cookie-consent-error])")) {
    if (controllers2.has(root))
      continue;
    const configTag = q('script[type="application/json"][data-cookie-consent-config]', root)[0];
    if (!configTag)
      continue;
    try {
      cookieConsent.create(root, JSON.parse(q(configTag).text()));
    } catch (error) {
      q(root).attr("data-init", "").attr("data-cookie-consent-error", "");
      root.dispatchEvent(new CustomEvent("cookie-consent:error", { bubbles: true, detail: { kind: "config", error } }));
      console.error(error);
    }
  }
  for (const [root, instance] of controllers2)
    if (!root.isConnected)
      instance.destroy();
}
init15();
new MutationObserver(init15).observe(document, { childList: true, subtree: true });

// src/components/countdown/countdown.ts
var df$16 = defussGlobals();
var dfDollar15 = defussQuery();
var countdownStates = ["default", "running", "paused", "finished"];
var UNITS = [
  ["days", 86400],
  ["hours", 3600],
  ["minutes", 60],
  ["seconds", 1]
];
var isTimer = (el) => el.hasAttribute("data-until") || el.hasAttribute("data-duration");
function writeValue(span, n) {
  const v = Math.max(0, Math.min(999, Math.round(n)));
  span.style.setProperty("--value", String(v));
  span.textContent = String(v);
}
var valuesOf = (el) => el.classList.contains("countdown") ? [...dfDollar15(el).find(":scope > span").toArray()] : [...dfDollar15(el).find(".countdown > span").toArray()];
function split(seconds, spans) {
  let rest = Math.max(0, Math.floor(seconds));
  const out = new Map;
  for (const [unit, size] of UNITS) {
    const span = spans.find((s) => s.dataset.unit === unit);
    if (!span)
      continue;
    const v = Math.floor(rest / size);
    out.set(span, v);
    rest -= v * size;
  }
  return out;
}
var fmt = (() => {
  const DF = Intl.DurationFormat;
  return DF ? new DF(undefined, { style: "long" }) : null;
})();
function label(el, parts) {
  if (el._authorLabel)
    return;
  const d = {};
  for (const [span, v] of parts)
    d[span.dataset.unit] = v;
  const text = fmt ? fmt.format(d) : Object.entries(d).map(([u, v]) => `${v} ${u}`).join(", ");
  el.setAttribute("aria-label", text || "0");
}
function remaining(el) {
  if (el._paused != null)
    return el._paused;
  return Math.max(0, (el._deadline - Date.now()) / 1000);
}
function paintTimer(el) {
  const left = remaining(el);
  const parts = split(Math.ceil(left - 0.001), valuesOf(el));
  for (const [span, v] of parts)
    writeValue(span, v);
  label(el, parts);
  if (left <= 0 && el.dataset.stateName !== "finished")
    finish(el);
}
function stop(el) {
  clearTimeout(el._tick);
  el._tick = 0;
}
function schedule(el) {
  stop(el);
  paintTimer(el);
  if (el.dataset.stateName !== "running")
    return;
  const ms = ((el._deadline - Date.now()) % 1000 + 1000) % 1000 || 1000;
  el._tick = setTimeout(() => schedule(el), ms + 5);
}
function finish(el) {
  stop(el);
  el._paused = 0;
  el.dataset.stateName = "finished";
  for (const [span, v] of split(0, valuesOf(el)))
    writeValue(span, v);
  el.dispatchEvent(new CustomEvent("countdown:finished", { bubbles: true }));
}
function authoredDeadline(el) {
  if (el.dataset.until)
    return Date.parse(el.dataset.until);
  return Date.now() + parseFloat(el.dataset.duration || "0") * 1000;
}
function applyMarkup15(el, stateName, config) {
  const spans = valuesOf(el);
  if (stateName === "finished") {
    for (const [span, v] of split(0, spans))
      writeValue(span, v);
    return;
  }
  if (isTimer(el) || stateName !== "default")
    return;
  if (config?.value !== undefined && spans[0])
    writeValue(spans[0], config.value);
  if (config?.values) {
    for (const span of spans)
      if (span.dataset.unit in config.values)
        writeValue(span, config.values[span.dataset.unit]);
  }
}
function triggerStateChange16(el, stateName, config) {
  if (!isTimer(el) && (stateName === "running" || stateName === "paused")) {
    el.dataset.stateName = stateName;
    return;
  }
  switch (stateName) {
    case "default":
      if (isTimer(el)) {
        el._deadline = authoredDeadline(el);
        el._paused = el.hasAttribute("data-paused") ? (el._deadline - Date.now()) / 1000 : null;
        el.dataset.stateName = el._paused != null ? "paused" : "running";
        schedule(el);
      } else {
        const spans = valuesOf(el);
        if (config?.value !== undefined && spans[0])
          writeValue(spans[0], config.value);
        if (config?.values) {
          for (const s of spans)
            if (s.dataset.unit in config.values)
              writeValue(s, config.values[s.dataset.unit]);
        }
        if (config?.value === undefined && !config?.values)
          el._authored?.forEach((v, s) => writeValue(s, v));
        el.dataset.stateName = "default";
      }
      break;
    case "running": {
      if (config?.until)
        el._deadline = Date.parse(config.until);
      else if (config?.duration != null)
        el._deadline = Date.now() + config.duration * 1000;
      else if (el._paused != null)
        el._deadline = Date.now() + el._paused * 1000;
      el._paused = null;
      el.dataset.stateName = "running";
      schedule(el);
      break;
    }
    case "paused":
      el._paused = remaining(el);
      el.dataset.stateName = "paused";
      stop(el);
      paintTimer(el);
      break;
    case "finished":
      finish(el);
      break;
  }
}
var countdownApi = componentState({
  component: "countdown",
  states: countdownStates,
  apply: (el, state) => triggerStateChange16(el, state.name, state.config),
  read: (el, state) => {
    const values = {};
    valuesOf(el).forEach((s, i) => values[s.dataset.unit || i] = parseFloat(s.style.getPropertyValue("--value")) || 0);
    const config = { ...state.config, values };
    if (isTimer(el))
      config.remaining = Math.round(remaining(el));
    return { name: el.dataset.stateName || "default", config };
  },
  markup: (el, state) => applyMarkup15(el, state.name, state.config)
});
df$16.countdownApi = countdownApi;
df$16.countdownStates = countdownStates;
function init16() {
  dfDollar15(".countdown-group:not([data-init]), .countdown:not([data-init])").toArray().forEach((el) => {
    if (el.classList.contains("countdown") && !isTimer(el) && el.parentElement?.closest(".countdown-group[data-until], .countdown-group[data-duration]"))
      return;
    if (el.classList.contains("countdown-group") && !isTimer(el))
      return;
    el.dataset.init = "";
    bindComponent(el, countdownApi);
    el._authored = new Map(valuesOf(el).map((s) => [s, parseFloat(s.style.getPropertyValue("--value")) || 0]));
    if (isTimer(el)) {
      el._authorLabel = el.hasAttribute("aria-label");
      if (!el.hasAttribute("role"))
        el.setAttribute("role", "timer");
      triggerStateChange16(el, "default", {});
    } else {
      el.dataset.stateName = "default";
    }
  });
}
init16();
new MutationObserver(init16).observe(document, { childList: true, subtree: true });

// src/components/data-grid/data-grid.ts
var df$17 = defussGlobals();
var dfDollar16 = defussQuery();
var dataGridStates = ["default", "loading", "empty"];
var SAVED_KEYS = ["filters", "sorters", "locked", "expanded"];
var numberFormat = new Map;
function format3(value, spec, el) {
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
var headerRowOf = (root) => dfDollar16(root).find(".data-grid-head > .data-grid-row").get(0);
var headersOf = (root) => {
  const row = headerRowOf(root);
  return row ? dfDollar16(row).children(".data-grid-header").toArray() : [];
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
  const where = viewPersistence(grid, "data-grid", String(dfDollar16(".data-grid").toArray().indexOf(grid)), config || {});
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
function applyMarkup16(root, state) {
  const config = state.config || {};
  const headers = root._columns ? root._columns.map((c) => c.el) : headersOf(root);
  const row = headerRowOf(root);
  const locked = new Set(config.locked || []);
  const sorters = config.sorters || [];
  const order = ordered(headers, config.locked, (el) => el.dataset.field);
  if (row && order.some((el, i) => dfDollar16(row).children(".data-grid-header").get(i) !== el)) {
    order.forEach((el) => dfDollar16(row).append(el));
  }
  for (const el of headers) {
    const at = sorters.findIndex((s) => s.field === (el.dataset.sortField || el.dataset.field));
    const dir = at < 0 ? null : sorters[at].direction || sorters[at].dir || "asc";
    dfDollar16(el).attr("data-locked", locked.has(el.dataset.field) ? "" : null).attr("aria-sort", dir ? dir === "asc" ? "ascending" : "descending" : null).attr("data-sort-index", dir && sorters.length > 1 ? String(at + 1) : null);
  }
  dfDollar16(root).attr("data-state", state.name).attr("aria-busy", state.name === "loading" ? "true" : null);
}
var configOf2 = (grid) => grid._config ?? grid.store?.value.config ?? {};
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
  dfDollar16(grid._parts.head).append(row);
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
  for (const cell of dfDollar16(row).children(".data-grid-filter-cell").toArray()) {
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
    if (column.el.dataset.lockable === "false" || dfDollar16(column.el).children(".data-grid-pin").get(0))
      continue;
    const pin = document.createElement("button");
    pin.type = "button";
    pin.className = "data-grid-pin";
    pin.tabIndex = -1;
    pin.dataset.field = column.field;
    pin.setAttribute("aria-label", `Lock ${column.el.textContent.trim()}`);
    dfDollar16(column.el).append(pin);
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
    text.textContent = format3(record[column.field], column.format, grid);
    cell.append(text);
  }
}
function renderRows(grid) {
  const { viewport, body, pool } = parts(grid);
  if (!pool || !grid._order)
    return;
  const config = configOf2(grid);
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
  const count = (n) => format3(n, "number", grid);
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
  dfDollar16(grid._parts.pager).find(".data-grid-page-label").get(0).textContent = `Page ${count(page + 1)} of ${count(pages)}`;
  for (const button of dfDollar16(grid._parts.pager).find("[data-page]").toArray()) {
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
function triggerStateChange17(grid, state, previous) {
  grid._config = state.config;
  let name = state.name;
  if (name !== "loading" && grid._parts) {
    const rows = refresh(grid, state.config, previous);
    if (name === "default" && !rows)
      name = "empty";
  }
  applyMarkup16(grid, { name, config: state.config });
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
  apply: (grid, state, previous) => triggerStateChange17(grid, state, previous),
  markup: (el, state) => applyMarkup16(el, state)
});
df$17.dataGridApi = dataGridApi;
df$17.dataGridStates = dataGridStates;
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
  const config = configOf2(grid);
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
  const target = row === -1 ? grid._order[col].el : dfDollar16(grid._parts.pool).children(".data-grid-row").toArray().find((r) => r._index === row)?.children[col];
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
          query(grid, { sorters: cycleSort(configOf2(grid).sorters, column.sortField, e.shiftKey), page: 0 });
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
    const locked = new Set(configOf2(grid).locked || []);
    if (locked.has(pin.dataset.field))
      locked.delete(pin.dataset.field);
    else
      locked.add(pin.dataset.field);
    query(grid, { locked: grid._columns.map((c) => c.field).filter((f) => locked.has(f)) });
    return;
  }
  const pageButton = t.closest("[data-page]");
  if (pageButton && grid._parts.footer.contains(pageButton)) {
    const page = Math.max(0, configOf2(grid).page || 0);
    const target = { first: 0, prev: page - 1, next: page + 1, last: pageCount(grid) - 1 }[pageButton.dataset.page];
    query(grid, { page: Math.max(0, Math.min(pageCount(grid) - 1, target)) });
    return;
  }
  const header = t.closest(".data-grid-header");
  if (header && grid.contains(header)) {
    const column = grid._columns.find((c) => c.el === header);
    if (column?.sortable)
      query(grid, { sorters: cycleSort(configOf2(grid).sorters, column.sortField, e.shiftKey), page: 0 });
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
    const filters = dfDollar16(grid._parts.filters).find(".data-grid-filter").toArray().map((el) => parseFilter(el.dataset.field, el.value, el.dataset.kind)).filter(Boolean);
    query(grid, { filters, page: 0, collapsed: [] });
  }, e.type === "change" ? 0 : 200);
}
async function onNearEnd(grid, force = false) {
  if (paging(grid) !== "infinite" || grid._loadingMore || !grid._source)
    return;
  const config = configOf2(grid);
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
var resolve4 = (target) => typeof target === "string" ? dfDollar16(target).get(0) : target;
df$17.dataGrid = {
  setSource(target, rows, options = {}) {
    const grid = resolve4(target);
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
    query(resolve4(target), patch);
  },
  rows: (target) => (resolve4(target)._result?.entries ?? []).map((e) => e.row),
  selected(target) {
    const grid = resolve4(target);
    const ids = grid._selected ?? new Set;
    return (grid._source?.rows ?? []).filter((r) => ids.has(r[grid._source.idField]));
  },
  selectAll: (target) => selectAll(resolve4(target)),
  clearSelection: (target) => {
    query(resolve4(target), { selected: [] });
  },
  expandAll(target) {
    const grid = resolve4(target);
    query(grid, { expanded: grid._source.branchIds(), collapsed: [] });
  },
  collapseAll(target) {
    const grid = resolve4(target);
    const filtering = (configOf2(grid).filters || []).length > 0;
    query(grid, filtering ? { collapsed: grid._source.branchIds() } : { expanded: [] });
  }
};
function init17() {
  dfDollar16(".data-grid:not([data-init])").toArray().forEach((grid) => {
    grid.dataset.init = "";
    const viewport = dfDollar16(grid).children(".data-grid-viewport").get(0);
    const head = viewport && dfDollar16(viewport).children(".data-grid-head").get(0);
    const body = viewport && dfDollar16(viewport).children(".data-grid-body").get(0);
    if (!viewport || !head || !body)
      return;
    let footer = dfDollar16(grid).children(".data-grid-footer").get(0);
    if (!footer) {
      footer = document.createElement("div");
      footer.className = "data-grid-footer";
      dfDollar16(grid).append(footer);
    }
    body.dataset.emptyText = grid.dataset.emptyText || "No rows match.";
    const pool = document.createElement("div");
    pool.className = "data-grid-rows";
    pool.setAttribute("role", "presentation");
    dfDollar16(body).append(pool);
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
      layoutColumns(grid, configOf2(grid));
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
init17();
new MutationObserver(init17).observe(document, { childList: true, subtree: true });

// src/components/data-tree/data-tree.ts
var df$18 = defussGlobals();
var dfDollar17 = defussQuery();
var dataTreeStates = ["default", "loading", "empty"];
var uid3 = 0;
var configOf3 = (tree) => tree._config ?? tree.store?.value.config ?? {};
var labelField = (tree) => tree.dataset.labelField || "name";
function applyMarkup17(el, state) {
  dfDollar17(el).attr("data-state", state.name).attr("aria-busy", state.name === "loading" ? "true" : null);
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
  const selected = configOf3(tree).selected ?? null;
  const idField = tree._source.idField;
  let active = null;
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
      item.toggleAttribute("data-match", !!(configOf3(tree).filters || []).length && meta.isMatch);
      const label = item.lastElementChild;
      if (tree._render) {
        label.textContent = "";
        tree._render(label, entry.row, meta);
      } else {
        label.textContent = String(entry.row[labelField(tree)] ?? "");
      }
    }
    item.setAttribute("aria-selected", String(selected !== null && entry.row[idField] === selected));
    item.toggleAttribute("data-active", index === tree._active);
    if (index === tree._active)
      active = item;
  }
  if (active)
    tree.setAttribute("aria-activedescendant", active.id);
  else
    tree.removeAttribute("aria-activedescendant");
}
function refresh2(tree, config, previous) {
  if (!tree._source)
    return 0;
  tree._result = tree._source.query({ filters: config.filters, sorters: config.sorters, expanded: config.expanded, collapsed: config.collapsed });
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
function triggerStateChange18(tree, state, previous) {
  tree._config = state.config;
  let name = state.name;
  if (name !== "loading") {
    const rows = refresh2(tree, state.config, previous);
    if (name === "default" && !rows)
      name = "empty";
  }
  applyMarkup17(tree, { name, config: state.config });
  tree.dataset.stateName = name;
  if (tree._saved) {
    tree._saved.set({ filters: state.config.filters ?? [], sorters: state.config.sorters ?? [], expanded: state.config.expanded ?? [], selected: state.config.selected ?? null });
  }
  if (tree.id) {
    for (const input of dfDollar17(`[data-tree-filter="${CSS.escape(tree.id)}"]`).toArray()) {
      if (input === document.activeElement)
        continue;
      const field = input.dataset.field || labelField(tree);
      input.value = filterText((state.config.filters || []).find((x) => x.field === field));
    }
  }
}
var KEPT = ["filters", "sorters", "expanded"];
function attachPersistence3(tree, config) {
  tree._saved?.destroy();
  const where = viewPersistence(tree, "data-tree", String(dfDollar17(".data-tree").toArray().indexOf(tree)), config || {});
  tree._saved = where ? persisted(where.key, {}, { area: where.area, validate: (v) => typeof v === "object" && v !== null && !Array.isArray(v) }) : null;
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
  apply: (tree, state, previous) => triggerStateChange18(tree, state, previous),
  markup: (el, state) => applyMarkup17(el, state)
});
df$18.dataTreeApi = dataTreeApi;
df$18.dataTreeStates = dataTreeStates;
var query2 = (tree, patch) => dataTreeApi.setState(tree, tree.store.value.name === "loading" ? "loading" : "default", patch);
var entryAt = (tree, index) => tree._result?.entries[index];
function setExpanded(tree, index, open) {
  const entry = entryAt(tree, index);
  if (!entry?.meta.hasChildren || entry.meta.isExpanded === open)
    return false;
  const id = entry.row[tree._source.idField];
  const config = configOf3(tree);
  if ((config.filters || []).length) {
    const collapsed = new Set(config.collapsed || []);
    if (open)
      collapsed.delete(id);
    else
      collapsed.add(id);
    query2(tree, { collapsed: [...collapsed] });
  } else {
    const expanded = new Set(config.expanded || []);
    if (open)
      expanded.add(id);
    else
      expanded.delete(id);
    query2(tree, { expanded: [...expanded] });
  }
  return true;
}
function select(tree, index) {
  const entry = entryAt(tree, index);
  if (!entry)
    return;
  query2(tree, { selected: entry.row[tree._source.idField] });
  tree.dispatchEvent(new CustomEvent("data-tree-select", { bubbles: true, detail: { record: entry.row, meta: entry.meta } }));
}
function activate3(tree, index) {
  const total = tree._result?.entries.length ?? 0;
  if (!total)
    return;
  tree._active = Math.max(0, Math.min(total - 1, index));
  tree.scrollTop = scrollIntoViewTop(tree._active, tree.scrollTop, tree.clientHeight, tree._rowHeight, total);
  renderItems(tree);
}
function onKeydown3(tree, e) {
  const index = tree._active ?? 0;
  const entry = entryAt(tree, index);
  if (!entry)
    return;
  const page = Math.max(1, Math.floor(tree.clientHeight / tree._rowHeight) - 1);
  switch (e.key) {
    case "ArrowDown":
      activate3(tree, index + 1);
      break;
    case "ArrowUp":
      activate3(tree, index - 1);
      break;
    case "ArrowRight":
      if (entry.meta.hasChildren && !setExpanded(tree, index, true))
        activate3(tree, index + 1);
      break;
    case "ArrowLeft":
      if (entry.meta.hasChildren && entry.meta.isExpanded)
        setExpanded(tree, index, false);
      else if (entry.meta.parentId != null) {
        const parent = tree._result.entries.findIndex((x) => x.row[tree._source.idField] === entry.meta.parentId);
        if (parent >= 0)
          activate3(tree, parent);
      }
      break;
    case "Home":
      activate3(tree, 0);
      break;
    case "End":
      activate3(tree, tree._result.entries.length - 1);
      break;
    case "PageDown":
      activate3(tree, index + page);
      break;
    case "PageUp":
      activate3(tree, index - page);
      break;
    case "Enter":
    case " ":
      select(tree, index);
      break;
    case "*": {
      const parent = entry.meta.parentId ?? null;
      const ids = tree._result.entries.filter((x) => (x.meta.parentId ?? null) === parent && x.meta.hasChildren).map((x) => x.row[tree._source.idField]);
      query2(tree, { expanded: [...new Set([...configOf3(tree).expanded || [], ...ids])] });
      break;
    }
    default:
      return;
  }
  e.preventDefault();
}
function onClick2(tree, e) {
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
if (!document.__dataTreeFilterInit) {
  document.__dataTreeFilterInit = true;
  document.addEventListener("input", (e) => {
    const input = e.target.closest?.("[data-tree-filter]");
    if (!input)
      return;
    const tree = dfDollar17("#" + CSS.escape(input.dataset.treeFilter)).get(0);
    if (!tree?.store)
      return;
    clearTimeout(tree._filterTimer);
    tree._filterTimer = setTimeout(() => {
      const filter = parseFilter(input.dataset.field || labelField(tree), input.value, "text");
      query2(tree, { filters: filter ? [filter] : [], collapsed: [] });
    }, 150);
  });
}
var resolve5 = (target) => typeof target === "string" ? dfDollar17(target).get(0) : target;
df$18.dataTree = {
  setSource(target, rows, options = {}) {
    const tree = resolve5(target);
    const idField = options.idField || tree.dataset.idField || "id";
    const parentIdField = options.parentIdField || tree.dataset.parentField || "parentId";
    tree._source = dataSource(rows, { idField, tree: { idField, parentIdField } });
    tree._render = options.render || null;
    tree._sourceOptions = options;
    if (tree.store)
      dataTreeApi.setState(tree, "default", { ...options.query, ...options.persist ? attachPersistence3(tree, options.persist) : {} });
  },
  query: (target, patch) => {
    query2(resolve5(target), patch);
  },
  expandAll(target) {
    const tree = resolve5(target);
    query2(tree, { expanded: tree._source.branchIds(), collapsed: [] });
  },
  collapseAll(target) {
    const tree = resolve5(target);
    const filtering = (configOf3(tree).filters || []).length > 0;
    query2(tree, filtering ? { collapsed: tree._source.branchIds() } : { expanded: [] });
  },
  selected(target) {
    const tree = resolve5(target);
    const id = configOf3(tree).selected ?? null;
    return id === null ? null : tree._source?.rows.find((r) => r[tree._source.idField] === id) ?? null;
  }
};
function init18() {
  dfDollar17(".data-tree:not([data-init])").toArray().forEach((tree) => {
    tree.dataset.init = "";
    tree._uid = tree.id || `data-tree-${++uid3}`;
    const sizer = document.createElement("div");
    sizer.className = "data-tree-sizer";
    const pool = document.createElement("div");
    pool.className = "data-tree-items";
    pool.setAttribute("role", "presentation");
    sizer.append(pool);
    dfDollar17(tree).append(sizer);
    tree._sizer = sizer;
    tree._pool = pool;
    tree._active = 0;
    tree._rowHeight = parseFloat(getComputedStyle(tree).getPropertyValue("--data-tree-row-height")) || 32;
    tree.setAttribute("role", "tree");
    if (!tree.hasAttribute("tabindex"))
      tree.tabIndex = 0;
    const early = tree._sourceOptions || {};
    const config = { filters: [], sorters: [], expanded: [], collapsed: [], selected: null, ...early.query, ...attachPersistence3(tree, early.persist) };
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
    tree.addEventListener("click", (e) => onClick2(tree, e));
    tree.addEventListener("keydown", (e) => onKeydown3(tree, e));
    bindComponent(tree, dataTreeApi, { name: tree._source ? "default" : "loading", config });
    dataTreeApi.setState(tree, tree._source ? "default" : "loading", config);
  });
}
init18();
new MutationObserver(init18).observe(document, { childList: true, subtree: true });

// src/components/diagram/diagram.ts
var df$19 = defussGlobals();
var dfDollar18 = defussQuery();
var diagramStates = ["default", "playing", "paused", "active"];
var SVG_NS = "http://www.w3.org/2000/svg";
var RUNTIME = ".diagram-delta, .diagram-controls, .diagram-wire-labels, .diagram-wires";
var reducedMotion4 = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var authored = (scope, selector) => dfDollar18(scope).find(selector).toArray().filter((n) => !n.closest(RUNTIME));
function parseEnd(value) {
  const [ref, side] = String(value || "").split(":");
  const [id, field] = ref.split("#");
  return { id, field: field || null, side: side || null };
}
function edgeListOf(root, canvas) {
  return dfDollar18(canvas).children(".diagram-edges").get(0) ?? dfDollar18(root).children(".diagram-edges").get(0) ?? null;
}
var edgesIn = (list) => list ? dfDollar18(list).find(".diagram-edge").toArray() : [];
function nameOf(el) {
  if (!el)
    return "";
  if (el.dataset.changeLabel)
    return el.dataset.changeLabel;
  const named = dfDollar18(el).find(".diagram-node-name, .diagram-group-label").get(0) ?? (el.tagName === "LI" && el.children.length ? el.firstElementChild : null);
  const text = (named ?? el).textContent.replace(/\s+/g, " ").trim();
  return text.length > 48 ? `${text.slice(0, 47)}…` : text;
}
function stepPlan(root) {
  const stepOf = new Map;
  const explicit = authored(root, "[data-step]");
  const nodes = authored(root, ".diagram-node");
  if (explicit.length) {
    explicit.forEach((n) => stepOf.set(n, Math.max(0, parseInt(n.dataset.step, 10) || 0)));
  } else {
    let k = 0;
    const sequence = root.dataset.type === "sequence";
    const units = sequence ? [] : nodes.length ? nodes : authored(root, "tbody > tr");
    if (sequence)
      nodes.forEach((n) => stepOf.set(n, 0));
    units.forEach((n) => stepOf.set(n, ++k));
    authored(root, ".diagram-group").forEach((g) => {
      const inner = units.filter((n) => g.contains(n)).map((n) => stepOf.get(n));
      stepOf.set(g, inner.length ? Math.min(...inner) : 0);
    });
  }
  const byId = new Map(authored(root, "[data-node]").map((n) => [n.dataset.node, n]));
  const stepOfEl = (el) => {
    for (let n = el;n && n !== root; n = n.parentElement)
      if (stepOf.has(n))
        return stepOf.get(n);
    return 0;
  };
  authored(root, ".diagram-edge").forEach((edge, i) => {
    if (stepOf.has(edge))
      return;
    const a = byId.get(parseEnd(edge.dataset.from).id);
    const b = byId.get(parseEnd(edge.dataset.to).id);
    stepOf.set(edge, root.dataset.type === "sequence" ? i + 1 : Math.max(stepOfEl(a), stepOfEl(b)));
  });
  const max = Math.max(0, ...stepOf.values());
  return { stepOf, max };
}
function applyMarkup18(root, state) {
  const { stepOf, max } = stepPlan(root);
  applyActivation(root, state.name === "active" ? state.config?.ref ?? null : null);
  if (state.name === "default" || state.name === "active") {
    dfDollar18(root).attr("data-step-current", null);
    stepOf.forEach((_s, el) => {
      dfDollar18(el).attr("data-step-state", null);
      beat(el, null);
    });
    return;
  }
  const current = stateStep(state, max);
  dfDollar18(root).attr("data-step-current", String(current));
  stepOf.forEach((s, el) => {
    dfDollar18(el).attr("data-step-state", s <= 0 || s < current ? "past" : s === current ? "current" : "future");
  });
  beats(root, stepOf, current);
}
function beat(el, i) {
  if (i == null)
    el.style.removeProperty("--step-i");
  else
    el.style.setProperty("--step-i", String(i));
  if (el.getAttribute("style") === "")
    el.removeAttribute("style");
}
function beats(root, stepOf, current) {
  const items = [];
  stepOf.forEach((s, el) => {
    if (s === current && current > 0)
      items.push(el);
    else
      beat(el, null);
  });
  const boxes = items.filter((el) => !el.classList.contains("diagram-edge"));
  const index = new Map(boxes.map((el, i) => [el, i]));
  boxes.forEach((el, i) => beat(el, i));
  const nodeOf = (end) => authored(root, "[data-node]").find((n) => n.dataset.node === parseEnd(end).id);
  const at = (el) => {
    for (let n = el;n && n !== root; n = n.parentElement)
      if (index.has(n))
        return index.get(n);
    return -1;
  };
  for (const edge of items.filter((el) => el.classList.contains("diagram-edge"))) {
    beat(edge, Math.max(at(nodeOf(edge.dataset.from)), at(nodeOf(edge.dataset.to)), -0.4) + 0.6);
  }
  return Math.max(1, boxes.length);
}
var edgeRef = (edge) => edge.dataset.edge || `${edge.dataset.from}->${edge.dataset.to}`;
var activatable = (root) => authored(root, "[data-node]").filter((n) => !n.classList.contains("diagram-group") && n.dataset.shape !== "ghost");
function refTarget(root, ref) {
  if (ref == null || ref === "")
    return null;
  const node = activatable(root).find((n) => n.dataset.node === ref);
  if (node)
    return { kind: "node", el: node };
  const edge = authored(root, ".diagram-edge").find((e) => edgeRef(e) === String(ref));
  return edge ? { kind: "edge", el: edge } : null;
}
function applyActivation(root, ref) {
  const nodes = activatable(root);
  const edges = authored(root, ".diagram-edge");
  const target = refTarget(root, ref);
  dfDollar18(root).attr("data-active", target ? String(ref) : null);
  const interactive = root.hasAttribute("data-interactive");
  if (!target) {
    for (const el of [...nodes, ...edges])
      dfDollar18(el).attr("data-active-state", null);
    if (interactive)
      for (const n of nodes)
        dfDollar18(n).attr(pressedAttr(n), "false");
    return;
  }
  const related = new Set;
  const idOf = (end) => parseEnd(end).id;
  if (target.kind === "node") {
    const id = target.el.dataset.node;
    for (const e of edges) {
      if (idOf(e.dataset.from) !== id && idOf(e.dataset.to) !== id)
        continue;
      related.add(e);
      for (const end of [idOf(e.dataset.from), idOf(e.dataset.to)])
        related.add(nodes.find((n) => n.dataset.node === end));
    }
  } else {
    for (const end of [idOf(target.el.dataset.from), idOf(target.el.dataset.to)])
      related.add(nodes.find((n) => n.dataset.node === end));
  }
  for (const el of [...nodes, ...edges]) {
    dfDollar18(el).attr("data-active-state", el === target.el ? "active" : related.has(el) ? "related" : "dimmed");
  }
  if (interactive)
    for (const n of nodes)
      dfDollar18(n).attr(pressedAttr(n), n === target.el ? "true" : "false");
}
var tablePart = (el) => /^(TR|TD|TH)$/.test(el.tagName);
var pressedAttr = (el) => tablePart(el) ? "aria-selected" : "aria-pressed";
function describe2(root, ref) {
  const target = refTarget(root, ref);
  if (!target)
    return null;
  const { kind, el } = target;
  if (el.tagName === "TR") {
    const cells = dfDollar18(el).children("th, td").toArray();
    const own = (c) => [...c.childNodes].filter((n) => n.nodeType === 3 || !/^(SMALL)$/.test(n.nodeName)).map((n) => n.textContent).join("").trim();
    const heads = dfDollar18(el.closest("table")).find("thead tr").first().children("th, td").toArray();
    const detail = cells.slice(1).map((c, i) => `${heads[i + 1] ? own(heads[i + 1]) : ""} ${c.textContent.trim()}`.trim()).join(" · ");
    return { ref: String(ref), kind, element: el, label: own(cells[0]), detail };
  }
  if (kind === "node") {
    const meta = dfDollar18(el).find(".diagram-node-meta").get(0)?.textContent.trim() ?? "";
    return { ref: String(ref), kind, element: el, label: nameOf(el), detail: el.dataset.detail || meta };
  }
  const name = (end) => {
    const n = activatable(root).find((x) => x.dataset.node === parseEnd(end).id);
    return n ? nameOf(n) : parseEnd(end).id;
  };
  const text = el.textContent.trim();
  return { ref: String(ref), kind, element: el, label: `${name(el.dataset.from)} → ${name(el.dataset.to)}${text ? ` · ${text}` : ""}`, detail: el.dataset.detail || "" };
}
function activationOrder(root) {
  const { stepOf } = stepPlan(root);
  const stepFor = (n) => {
    for (let x = n;x && x !== root; x = x.parentElement)
      if (stepOf.has(x))
        return stepOf.get(x);
    return 0;
  };
  return activatable(root).map((n, i) => ({ n, i, s: stepFor(n) })).sort((a, b) => a.s - b.s || a.i - b.i).map((x) => x.n.dataset.node);
}
function stepActivation(root, by) {
  const order = activationOrder(root);
  if (!order.length)
    return;
  const state = root._shown ?? root.store?.value ?? { name: "default" };
  const at = state.name === "active" ? order.indexOf(String(state.config?.ref)) : -1;
  const next = at < 0 ? by > 0 ? 0 : order.length - 1 : (at + by + order.length) % order.length;
  root.api.setState("active", { ref: order[next] });
}
var stepping = (state) => state.name === "playing" || state.name === "paused";
var clampStep = (step, max) => Math.min(max, Math.max(0, Math.round(+step)));
var stateStep = (state, max) => {
  const step = state.config?.step;
  if (step != null && step !== "" && Number.isFinite(+step))
    return clampStep(step, max);
  return state.name === "playing" ? Math.min(1, max) : max;
};
function stepLabel(root, step) {
  const { stepOf } = stepPlan(root);
  for (const [el, s] of stepOf)
    if (s === step)
      return el.dataset.stepLabel || nameOf(el);
  return "";
}
var NORMAL = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] };
var horizontal = (side) => side === "left" || side === "right";
var ROUND = new Set(["dot", "circle", "start", "end", "ring", "event"]);
var r1 = (n) => Math.round(n * 10) / 10;
function sidePoint(r, side, t = 0.5) {
  if (side === "top")
    return { x: r.x + r.w * t, y: r.y };
  if (side === "bottom")
    return { x: r.x + r.w * t, y: r.y + r.h };
  if (side === "left")
    return { x: r.x, y: r.y + r.h * t };
  return { x: r.x + r.w, y: r.y + r.h * t };
}
var center = (r) => ({ x: r.x + r.w / 2, y: r.y + r.h / 2 });
function boundary(r, toward, round) {
  const c = center(r);
  const dx = toward.x - c.x;
  const dy = toward.y - c.y;
  if (!dx && !dy)
    return c;
  if (round) {
    const l = Math.hypot(dx, dy);
    const rad = Math.min(r.w, r.h) / 2;
    return { x: c.x + dx / l * rad, y: c.y + dy / l * rad };
  }
  const t = Math.min(r.w / 2 / Math.abs(dx || 0.000000001), r.h / 2 / Math.abs(dy || 0.000000001));
  return { x: c.x + dx * t, y: c.y + dy * t };
}
function facingSides(a, b) {
  const ca = center(a);
  const cb = center(b);
  const gapX = Math.max(b.x - (a.x + a.w), a.x - (b.x + b.w));
  const gapY = Math.max(b.y - (a.y + a.h), a.y - (b.y + b.h));
  const useX = gapX > 0 || gapY > 0 ? gapX >= gapY : Math.abs(cb.x - ca.x) >= Math.abs(cb.y - ca.y);
  if (useX)
    return cb.x >= ca.x ? ["right", "left"] : ["left", "right"];
  return cb.y >= ca.y ? ["bottom", "top"] : ["top", "bottom"];
}
function crosses(pts, r) {
  const x0 = r.x + 2;
  const x1 = r.x + r.w - 2;
  const y0 = r.y + 2;
  const y1 = r.y + r.h - 2;
  for (let i = 1;i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    if (Math.max(a.x, b.x) < x0 || Math.min(a.x, b.x) > x1 || Math.max(a.y, b.y) < y0 || Math.min(a.y, b.y) > y1)
      continue;
    return true;
  }
  return false;
}
function bestSides(a, b, fixedA, fixedB, obstacles, texts = []) {
  const [fa, fb] = facingSides(a.rect, b.rect);
  const sides = ["top", "right", "bottom", "left"];
  let best = null;
  const pa0 = (sa) => sidePoint(a.rect, sa);
  const pb0 = (sb) => sidePoint(b.rect, sb);
  const clearing = (sa, sb) => {
    if (sa !== sb)
      return [null];
    const lo = Math.min(a.rect.x, b.rect.x) - 8;
    const hi = Math.max(a.rect.x + a.rect.w, b.rect.x + b.rect.w) + 8;
    const top = Math.min(a.rect.y, b.rect.y) - 8;
    const bot = Math.max(a.rect.y + a.rect.h, b.rect.y + b.rect.h) + 8;
    const between = obstacles.filter((o) => o !== a && o !== b && (horizontal(sa) ? o.rect.y < bot && o.rect.y + o.rect.h > top : o.rect.x < hi && o.rect.x + o.rect.w > lo));
    if (!between.length)
      return [null];
    if (sa === "top")
      return [null, Math.min(...between.map((o) => o.rect.y), a.rect.y, b.rect.y) - 18];
    if (sa === "bottom")
      return [null, Math.max(...between.map((o) => o.rect.y + o.rect.h), a.rect.y + a.rect.h, b.rect.y + b.rect.h) + 18];
    if (sa === "left")
      return [null, Math.min(...between.map((o) => o.rect.x), a.rect.x, b.rect.x) - 18];
    return [null, Math.max(...between.map((o) => o.rect.x + o.rect.w), a.rect.x + a.rect.w, b.rect.x + b.rect.w) + 18];
  };
  for (const sa of fixedA ? [fixedA] : sides) {
    for (const sb of fixedB ? [fixedB] : sides) {
      for (const outer of clearing(sa, sb)) {
        const pts = elbow(pa0(sa), sa, pb0(sb), sb, 16, outer);
        let score = 0;
        for (let i = 1;i < pts.length; i++)
          score += Math.abs(pts[i].x - pts[i - 1].x) + Math.abs(pts[i].y - pts[i - 1].y);
        score += (pts.length - 2) * 30;
        if (sa !== fa || sb !== fb)
          score += 12;
        for (const o of obstacles) {
          if (o === a || o === b || o.el.contains(a.el) || o.el.contains(b.el))
            continue;
          const r = o.rect;
          if (crosses(pts, { x: r.x - 8, y: r.y - 8, w: r.w + 16, h: r.h + 16 }))
            score += 1e4;
        }
        for (const t of texts)
          if (crosses(pts, t))
            score += 4000;
        if (crosses(pts.slice(1), a.rect) || crosses(pts.slice(0, -1), b.rect))
          score += 5000;
        if (!best || score < best.score)
          best = { score, sa, sb, outer };
      }
    }
  }
  return [best.sa, best.sb, best.outer ?? null];
}
function simplify(points) {
  const out = [];
  for (const p of points) {
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - p.x) < 0.5 && Math.abs(last.y - p.y) < 0.5)
      continue;
    out.push(p);
    while (out.length >= 3) {
      const [a, b, c] = out.slice(-3);
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cross) > 0.5)
        break;
      out.splice(out.length - 2, 1);
    }
  }
  return out;
}
function elbow(a, sa, b, sb, gap = 16, outside = null) {
  const na = NORMAL[sa];
  const nb = NORMAL[sb];
  const pts = [a];
  if (horizontal(sa) && horizontal(sb)) {
    if (outside != null) {
      pts.push({ x: outside, y: a.y }, { x: outside, y: b.y });
    } else if (sa !== sb && (b.x - a.x) * na[0] > gap) {
      const mx = (a.x + b.x) / 2;
      pts.push({ x: mx, y: a.y }, { x: mx, y: b.y });
    } else if (sa === sb) {
      const x = sa === "right" ? Math.max(a.x, b.x) + gap * 1.5 : Math.min(a.x, b.x) - gap * 1.5;
      pts.push({ x, y: a.y }, { x, y: b.y });
    } else {
      const x1 = a.x + na[0] * gap;
      const x2 = b.x + nb[0] * gap;
      const my = (a.y + b.y) / 2;
      pts.push({ x: x1, y: a.y }, { x: x1, y: my }, { x: x2, y: my }, { x: x2, y: b.y });
    }
  } else if (!horizontal(sa) && !horizontal(sb)) {
    if (outside != null) {
      pts.push({ x: a.x, y: outside }, { x: b.x, y: outside });
    } else if (sa !== sb && (b.y - a.y) * na[1] > gap) {
      const my = (a.y + b.y) / 2;
      pts.push({ x: a.x, y: my }, { x: b.x, y: my });
    } else if (sa === sb) {
      const y = sa === "bottom" ? Math.max(a.y, b.y) + gap * 1.5 : Math.min(a.y, b.y) - gap * 1.5;
      pts.push({ x: a.x, y }, { x: b.x, y });
    } else {
      const y1 = a.y + na[1] * gap;
      const y2 = b.y + nb[1] * gap;
      const mx = (a.x + b.x) / 2;
      pts.push({ x: a.x, y: y1 }, { x: mx, y: y1 }, { x: mx, y: y2 }, { x: b.x, y: y2 });
    }
  } else if (horizontal(sa)) {
    const corner = { x: b.x, y: a.y };
    if ((corner.x - a.x) * na[0] > 0 && (corner.y - b.y) * nb[1] > 0)
      pts.push(corner);
    else {
      const a1 = { x: a.x + na[0] * gap, y: a.y };
      const b1 = { x: b.x, y: b.y + nb[1] * gap };
      pts.push(a1, { x: a1.x, y: b1.y }, b1);
    }
  } else {
    const corner = { x: a.x, y: b.y };
    if ((corner.y - a.y) * na[1] > 0 && (corner.x - b.x) * nb[0] > 0)
      pts.push(corner);
    else {
      const a1 = { x: a.x, y: a.y + na[1] * gap };
      const b1 = { x: b.x + nb[0] * gap, y: b.y };
      pts.push(a1, { x: b1.x, y: a1.y }, b1);
    }
  }
  pts.push(b);
  return simplify(pts);
}
var corner = 8;
function roundedPath(pts, r = corner) {
  let d = `M${r1(pts[0].x)} ${r1(pts[0].y)}`;
  for (let i = 1;i < pts.length - 1; i++) {
    const p0 = pts[i - 1];
    const p = pts[i];
    const p1 = pts[i + 1];
    const l0 = Math.hypot(p.x - p0.x, p.y - p0.y);
    const l1 = Math.hypot(p1.x - p.x, p1.y - p.y);
    const rr = Math.min(r, l0 / 2, l1 / 2);
    if (rr < 0.5) {
      d += ` L${r1(p.x)} ${r1(p.y)}`;
      continue;
    }
    const a = { x: p.x + (p0.x - p.x) / l0 * rr, y: p.y + (p0.y - p.y) / l0 * rr };
    const b = { x: p.x + (p1.x - p.x) / l1 * rr, y: p.y + (p1.y - p.y) / l1 * rr };
    d += ` L${r1(a.x)} ${r1(a.y)} Q${r1(p.x)} ${r1(p.y)} ${r1(b.x)} ${r1(b.y)}`;
  }
  const last = pts[pts.length - 1];
  return `${d} L${r1(last.x)} ${r1(last.y)}`;
}
function labelSpot(pts) {
  let best = 0;
  let at = { x: pts[0].x, y: pts[0].y };
  let along = { x: 1, y: 0 };
  for (let i = 1;i < pts.length; i++) {
    const l = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
    if (l > best) {
      best = l;
      at = { x: (pts[i].x + pts[i - 1].x) / 2, y: (pts[i].y + pts[i - 1].y) / 2 };
      along = { x: Math.abs(pts[i].x - pts[i - 1].x) > 0.5 ? 1 : 0, y: Math.abs(pts[i].y - pts[i - 1].y) > 0.5 ? 1 : 0, len: l };
    }
  }
  return { at, along };
}
var unit = (from, to) => {
  const l = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / l, y: (to.y - from.y) / l };
};
var CROW = ["M-11 0L0 -6M-11 0L0 6M-11 0H0", "stroke"];
var HEADS = {
  arrow: { parts: [["M0 0L-9 -4.5L-9 4.5Z", "fill"]], inset: 3 },
  open: { parts: [["M-8 -4.5L0 0L-8 4.5", "stroke"]], inset: 0 },
  triangle: { parts: [["M0 0L-12 -6.5L-12 6.5Z", "hollow"]], inset: 12 },
  "triangle-filled": { parts: [["M0 0L-12 -6.5L-12 6.5Z", "fill"]], inset: 4 },
  diamond: { parts: [["M0 0L-7 -4.5L-14 0L-7 4.5Z", "fill"]], inset: 4 },
  "diamond-open": { parts: [["M0 0L-7 -4.5L-14 0L-7 4.5Z", "hollow"]], inset: 14 },
  dot: { parts: [["M-7 0a3.5 3.5 0 1 0 7 0a3.5 3.5 0 1 0 -7 0", "fill"]], inset: 3 },
  one: { parts: [["M-7 -6V6", "stroke"]], inset: 0 },
  "one-one": { parts: [["M-7 -6V6M-12 -6V6", "stroke"]], inset: 0 },
  many: { parts: [CROW], inset: 0 },
  "one-many": { parts: [CROW, ["M-15 -6V6", "stroke"]], inset: 0 },
  "zero-many": { parts: [CROW, ["M-23 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "hollow"]], inset: 0 },
  "zero-one": { parts: [["M-7 -6V6", "stroke"], ["M-19 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0", "hollow"]], inset: 0 },
  none: { parts: [], inset: 0 }
};
function svg(tag, attrs = {}) {
  const el = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs))
    if (v != null)
      el.setAttribute(k, String(v));
  return el;
}
function drawHead(group, kind, tip, dir) {
  const head = HEADS[kind] ?? HEADS.arrow;
  const angle = r1(Math.atan2(dir.y, dir.x) * 180 / Math.PI);
  for (const [d, paint] of head.parts) {
    group.append(svg("path", { class: "diagram-wire-head", "data-paint": paint, d, transform: `translate(${r1(tip.x)} ${r1(tip.y)}) rotate(${angle})` }));
  }
}
function inset(pts, by, atStart) {
  if (!by)
    return pts;
  const out = pts.map((p) => ({ ...p }));
  const [i, j] = atStart ? [0, 1] : [out.length - 1, out.length - 2];
  const u = unit(out[i], out[j]);
  const l = Math.hypot(out[j].x - out[i].x, out[j].y - out[i].y);
  const d = Math.min(by, l - 1);
  out[i] = { x: out[i].x + u.x * d, y: out[i].y + u.y * d };
  return out;
}
var panelOf = (canvas) => canvas.closest(".diagram-panel")?.dataset.panel ?? null;
function edgeIn(edge, panel) {
  const change = edge.dataset.change;
  if (panel === "before" && change === "added")
    return null;
  if (panel === "after" && change === "removed")
    return null;
  const before = panel === "before";
  return {
    from: before && edge.dataset.beforeFrom || edge.dataset.from,
    to: before && edge.dataset.beforeTo || edge.dataset.to
  };
}
function layer(canvas, cls, make) {
  const existing = dfDollar18(canvas).children(`.${cls}`).get(0);
  if (existing) {
    dfDollar18(existing).empty();
    return existing;
  }
  const el = make();
  dfDollar18(canvas).append(el);
  return el;
}
function measure(canvas) {
  const box = canvas.getBoundingClientRect();
  const scale = box.width / (canvas.offsetWidth || box.width || 1) || 1;
  const ox = box.left + canvas.clientLeft * scale;
  const oy = box.top + canvas.clientTop * scale;
  const rectOf = (el) => {
    const r = el.getBoundingClientRect();
    return { x: (r.left - ox) / scale, y: (r.top - oy) / scale, w: r.width / scale, h: r.height / scale };
  };
  const nodes = new Map;
  for (const el of dfDollar18(canvas).find("[data-node]").toArray()) {
    if (el.closest(".diagram-edges") || !el.getClientRects().length)
      continue;
    nodes.set(el.dataset.node, { el, rect: rectOf(el), round: ROUND.has(el.dataset.shape) });
  }
  return { nodes, rectOf };
}
var FIT_MIN = 0.7;
function fit(root, canvas) {
  if (canvas.parentElement !== root)
    return;
  canvas.style.zoom = "";
  if (root.dataset.fit === "none")
    return;
  const natural = canvas.offsetWidth;
  const avail = root.clientWidth;
  const z = natural > avail + 1 ? Math.max(FIT_MIN, Math.floor(avail / natural * 1000) / 1000) : 1;
  if (z < 1)
    canvas.style.zoom = String(z);
}
function draw2(root, canvas) {
  if (!canvas.isConnected || !canvas.getClientRects().length)
    return;
  if (!canvas._clearPass) {
    for (const side of SIDES2) {
      canvas.style.removeProperty(`padding-${side}`);
      canvas.style.removeProperty(`--_inset-${side}`);
    }
  }
  fit(root, canvas);
  const { nodes, rectOf } = measure(canvas);
  const panel = panelOf(canvas);
  const wires = layer(canvas, "diagram-wires", () => {
    const el = svg("svg", { class: "diagram-wires", "aria-hidden": "true", focusable: "false" });
    return el;
  });
  const labels = layer(canvas, "diagram-wire-labels", () => {
    const el = document.createElement("div");
    el.className = "diagram-wire-labels";
    el.setAttribute("aria-hidden", "true");
    return el;
  });
  wires.setAttribute("width", String(canvas.clientWidth));
  wires.setAttribute("height", String(canvas.clientHeight));
  const type = root.dataset.type;
  const list = edgeListOf(root, canvas);
  const drawn = [];
  const sample = dfDollar18(canvas).find(".diagram-node:not([data-shape])").get(0) ?? canvas;
  corner = Math.min(14, Math.max(0, parseFloat(getComputedStyle(sample).borderTopLeftRadius) || 0) * 1.2);
  const texts = textRects(canvas, nodes, rectOf);
  const queue = [];
  const label = (text, at, edge, cls = "diagram-wire-label", along = null, g = null) => {
    if (text)
      queue.push({ text, at, edge, cls, along, g });
  };
  const wireGroup = (edge, extra = {}) => {
    const g = svg("g", {
      class: "diagram-wire",
      "data-line": edge?.dataset.line,
      "data-tone": edge?.dataset.tone,
      "data-step-state": edge?.dataset.stepState,
      "data-active-state": edge?.dataset.activeState,
      "data-edge-ref": edge ? edgeRef(edge) : null,
      "data-change": panel === "changes" ? edge?.dataset.change : null,
      ...Object.fromEntries(Object.entries(extra).filter(([k]) => k !== "beatOf"))
    });
    const i = (extra.beatOf ?? edge)?.style?.getPropertyValue("--step-i");
    if (i)
      g.style.setProperty("--step-i", i);
    wires.append(g);
    return g;
  };
  const interactive = root.hasAttribute("data-interactive") && !panel;
  const line = (g, d, solid) => {
    g.append(svg("path", { class: "diagram-wire-line", d, pathLength: solid ? 1 : null }));
    if (interactive && g.dataset.edgeRef)
      g.append(svg("path", { class: "diagram-wire-hit", d }));
  };
  if (type === "sequence")
    drawSequence(canvas, nodes, list, panel, rectOf, wireGroup, line, label, drawn);
  else
    drawEdges(canvas, nodes, list, panel, rectOf, wireGroup, line, label, drawn, texts);
  if (type === "fishbone")
    drawBones(nodes, wireGroup, line);
  sideDotLabels(nodes, wires, rectOf);
  placeLabels(queue, labels, wires, nodes, textRects(canvas, nodes, rectOf));
  if (panel === "changes")
    badges(canvas, labels, rectOf);
  flowTokens(labels, wires);
  if (clear(root, canvas, rectOf))
    return;
  root.dispatchEvent(new CustomEvent("diagram-drawn", { detail: { edges: drawn.length, panel } }));
}
var CLEARANCE = 20;
var SIDES2 = ["top", "right", "bottom", "left"];
function clear(root, canvas, rectOf) {
  if ((canvas._clearPass ?? 0) >= 3)
    return false;
  const cs = getComputedStyle(canvas);
  if (!parseFloat(cs.borderTopWidth))
    return false;
  const w = canvas.clientWidth;
  const h = canvas.clientHeight;
  const gap = { top: Infinity, right: Infinity, bottom: Infinity, left: Infinity };
  for (const el of dfDollar18(canvas).find("*").toArray()) {
    if (el.matches(".diagram-wires, .diagram-wire-labels, .diagram-wire-hit, .diagram-token, g") || !el.getClientRects().length)
      continue;
    const r = rectOf(el);
    if (!r.w && !r.h)
      continue;
    gap.top = Math.min(gap.top, r.y);
    gap.left = Math.min(gap.left, r.x);
    gap.bottom = Math.min(gap.bottom, h - (r.y + r.h));
    gap.right = Math.min(gap.right, w - (r.x + r.w));
  }
  const grow = SIDES2.filter((side) => gap[side] < CLEARANCE - 0.5);
  if (!grow.length)
    return false;
  const absolute = dfDollar18(canvas).children().toArray().some((c) => getComputedStyle(c).position === "absolute" && !c.matches(".diagram-wires, .diagram-wire-labels"));
  for (const side of grow) {
    const more = Math.ceil(CLEARANCE - gap[side]);
    if (absolute)
      canvas.style.setProperty(`--_inset-${side}`, `${Math.ceil(parseFloat(canvas.style.getPropertyValue(`--_inset-${side}`)) || 0) + more}px`);
    else
      canvas.style.setProperty(`padding-${side}`, `${Math.ceil(parseFloat(cs.getPropertyValue(`padding-${side}`))) + more}px`);
  }
  canvas._clearPass = (canvas._clearPass ?? 0) + 1;
  try {
    draw2(root, canvas);
  } finally {
    canvas._clearPass -= 1;
  }
  return true;
}
function textRects(canvas, nodes, rectOf) {
  const out = [];
  for (const n of nodes.values()) {
    if (n.el.classList.contains("diagram-group") || n.el.dataset.shape === "ghost")
      continue;
    if (ROUND.has(n.el.dataset.shape) || n.el.dataset.shape === "event") {
      for (const t of dfDollar18(n.el).find(".diagram-node-name, .diagram-node-eyebrow, .diagram-node-meta, .diagram-node-body").toArray())
        if (t.getClientRects().length)
          out.push(rectOf(t));
    }
  }
  const sel = ".diagram-group-label, .diagram-cell, .diagram-tag, .diagram-tick, .diagram-rule > span, .diagram-axis > *, .diagram-phases > li, .diagram-band-labels > *, .diagram-note";
  for (const t of dfDollar18(canvas).find(sel).toArray())
    if (!t.closest(RUNTIME) && t.getClientRects().length)
      out.push(rectOf(t));
  return out;
}
function sideDotLabels(nodes, wires, rectOf) {
  const dots = [...nodes.values()].filter((n) => n.el.dataset.shape === "dot" && dfDollar18(n.el).children(".diagram-node-name").get(0));
  if (!dots.length)
    return;
  const points = [...wirePoints(wires).values()].flat();
  const others = [...nodes.values()].filter((n) => n.el.dataset.shape !== "ghost" && !n.el.classList.contains("diagram-group"));
  for (const dot of dots) {
    if (dot.el.hasAttribute("data-label-side") && !dot.el._autoSide)
      continue;
    const text = dfDollar18(dot.el).children(".diagram-node-name, .diagram-node-meta").toArray();
    let best = null;
    for (const side of ["above", "below", "right", "left"]) {
      dot.el.dataset.labelSide = side;
      let score = side === "above" ? 0 : 1;
      for (const t of text) {
        const r = rectOf(t);
        for (const q of points)
          if (q.x > r.x - 2 && q.x < r.x + r.w + 2 && q.y > r.y - 2 && q.y < r.y + r.h + 2)
            score += 10;
        for (const o of others) {
          if (o === dot)
            continue;
          const ov = Math.max(0, Math.min(r.x + r.w, o.rect.x + o.rect.w) - Math.max(r.x, o.rect.x)) * Math.max(0, Math.min(r.y + r.h, o.rect.y + o.rect.h) - Math.max(r.y, o.rect.y));
          if (ov > 0)
            score += 20;
        }
      }
      if (!best || score < best.score)
        best = { side, score };
      if (score === 0)
        break;
    }
    dot.el._autoSide = true;
    dot.el.dataset.labelSide = best.side;
  }
}
function wirePoints(wires) {
  const out = new Map;
  for (const g of dfDollar18(wires).children(".diagram-wire").toArray()) {
    const path = dfDollar18(g).children(".diagram-wire-line").get(0);
    if (!path?.getTotalLength)
      continue;
    const len = path.getTotalLength();
    const pts = [];
    for (let t = 0;t <= len; t += 5)
      pts.push(path.getPointAtLength(t));
    out.set(g, pts);
  }
  return out;
}
function placeLabels(queue, layerEl, wires, nodes, texts) {
  if (!queue.length)
    return;
  const placed = [
    ...[...nodes.values()].filter((n) => !n.el.classList.contains("diagram-group") && n.el.dataset.shape !== "ghost").map((n) => n.rect),
    ...texts
  ];
  const points = wirePoints(wires);
  for (const item of queue) {
    const { text, at, edge, cls, along, g } = item;
    const span = document.createElement("span");
    span.className = cls;
    dfDollar18(span).text(text);
    for (const name of ["tone", "stepState", "change", "activeState"])
      if (edge?.dataset[name])
        span.dataset[name] = edge.dataset[name];
    if (edge)
      span.dataset.edgeRef = edgeRef(edge);
    const i = edge?.style.getPropertyValue("--step-i");
    if (i)
      span.style.setProperty("--step-i", i);
    dfDollar18(layerEl).append(span);
    const w = span.offsetWidth + 4;
    const h = span.offsetHeight + 2;
    const centered = cls === "diagram-wire-label" || cls.includes("diagram-wire-end");
    const box = (q) => centered ? { x: q.x - w / 2, y: q.y - h / 2, w, h } : { x: q.x, y: q.y - h / 2, w, h };
    const cover = (b) => {
      let sum = 0;
      for (const o of placed)
        sum += Math.max(0, Math.min(b.x + b.w, o.x + o.w) - Math.max(b.x, o.x)) * Math.max(0, Math.min(b.y + b.h, o.y + o.h) - Math.max(b.y, o.y));
      for (const [wg, pts] of points) {
        if (wg === g)
          continue;
        for (const q of pts)
          if (q.x > b.x - 1 && q.x < b.x + b.w + 1 && q.y > b.y - 1 && q.y < b.y + b.h + 1)
            sum += 40;
      }
      return sum;
    };
    let pos = at;
    const dir = along ?? { x: 1, y: 0, len: 0 };
    const step = dir.x ? w * 0.6 + 6 : h + 4;
    const across = dir.x ? { x: 0, y: h / 2 + 5 } : { x: w / 2 + 6, y: 0 };
    const room = Math.max(0, (dir.len ?? Infinity) / 2 - (dir.x ? w / 2 : h / 2));
    let least = Infinity;
    for (const [k, j] of [[0, 0], [1, 0], [-1, 0], [2, 0], [-2, 0], [0, -1], [0, 1], [1, -1], [-1, -1], [1, 1], [-1, 1], [3, 0], [-3, 0]]) {
      if (Math.abs(k * step) > room)
        continue;
      if (!along && (k || j))
        continue;
      const q = { x: at.x + dir.x * k * step + across.x * j, y: at.y + dir.y * k * step + across.y * j };
      const c = cover(box(q)) + (k || j ? 1 : 0);
      if (c < least) {
        least = c;
        pos = q;
      }
      if (c <= 1)
        break;
    }
    placed.push(box(pos));
    span.style.left = `${r1(pos.x)}px`;
    span.style.top = `${r1(pos.y)}px`;
  }
}
function drawEdges(canvas, nodes, list, panel, rectOf, wireGroup, line, label, drawn, texts = []) {
  const plans = [];
  const fig = canvas.closest(".diagram");
  const busRoute = fig?.dataset.route === "bus" || fig?.dataset.type === "organigram";
  const obstacles = [...nodes.values()].filter((n) => !n.el.classList.contains("diagram-group") && n.el.dataset.shape !== "ghost");
  for (const edge of edgesIn(list)) {
    const ends = edgeIn(edge, panel);
    if (!ends)
      continue;
    const from = parseEnd(ends.from);
    const to = parseEnd(ends.to);
    const a = nodes.get(from.id);
    const b = nodes.get(to.id);
    if (!a || !b)
      continue;
    const curve = edge.dataset.curve || "elbow";
    const plan = { edge, from, to, a, b, curve };
    if (a === b)
      plan.curve = "self";
    else if (curve === "around") {
      plan.sa = from.side || "right";
      plan.sb = to.side || plan.sa;
    } else if (curve === "elbow" && busRoute && !from.side && !to.side && Math.abs(center(a.rect).y - center(b.rect).y) > a.rect.h / 2) {
      [plan.sa, plan.sb] = center(b.rect).y > center(a.rect).y ? ["bottom", "top"] : ["top", "bottom"];
    } else if (curve === "elbow") {
      [plan.sa, plan.sb, plan.outer] = bestSides(a, b, from.side, to.side, obstacles, texts);
    }
    plans.push(plan);
  }
  const bus = canvas.closest(".diagram")?.dataset.route === "bus" || canvas.closest(".diagram")?.dataset.type === "organigram";
  const ports = new Map;
  for (const plan of plans) {
    if (!plan.sa || bus)
      continue;
    for (const [end, node, side, other] of [["a", plan.a, plan.sa, plan.b], ["b", plan.b, plan.sb, plan.a]]) {
      if ((end === "a" ? plan.from : plan.to).field)
        continue;
      const key = `${node.el.dataset.node}|${side}`;
      if (!ports.has(key))
        ports.set(key, []);
      ports.get(key).push({ plan, end, node, side, toward: center(other.rect) });
    }
  }
  for (const group of ports.values()) {
    const along = horizontal(group[0].side) ? "y" : "x";
    group.sort((p, q) => p.toward[along] - q.toward[along]);
    const r = group[0].node.rect;
    const length = horizontal(group[0].side) ? r.h : r.w;
    const step = Math.min(18, length * 0.8 / Math.max(1, group.length));
    group.forEach((p, i) => {
      const offset = (i - (group.length - 1) / 2) * step;
      const t = 0.5 + offset / length;
      p.plan[p.end === "a" ? "pa" : "pb"] = sidePoint(r, p.side, t);
    });
  }
  const fieldPoint = (node, field, toward) => {
    const row = dfDollar18(node.el).find(`[data-field="${field}"]`).get(0);
    if (!row)
      return null;
    const rr = rectOf(row);
    const left = toward.x < node.rect.x + node.rect.w / 2;
    return { point: { x: left ? node.rect.x : node.rect.x + node.rect.w, y: rr.y + rr.h / 2 }, side: left ? "left" : "right" };
  };
  const solid = [...nodes.values()].filter((n) => !n.el.classList.contains("diagram-group") && n.el.dataset.shape !== "ghost");
  const outside = Math.max(0, ...solid.map((n) => n.rect.x + n.rect.w)) + 24;
  const outsideLeft = Math.min(...solid.map((n) => n.rect.x)) - 24;
  for (const plan of plans) {
    if (!plan.sa)
      continue;
    const { a, b } = plan;
    let pa = plan.pa ?? sidePoint(a.rect, plan.sa);
    let pb = plan.pb ?? sidePoint(b.rect, plan.sb);
    let sa = plan.sa;
    let sb = plan.sb;
    if (plan.from.field) {
      const f = fieldPoint(a, plan.from.field, center(b.rect));
      if (f)
        ({ point: pa, side: sa } = f);
    }
    if (plan.to.field) {
      const f = fieldPoint(b, plan.to.field, pa);
      if (f)
        ({ point: pb, side: sb } = f);
    }
    if (plan.from.field && plan.to.field && sa !== sb && (pb.x - pa.x) * NORMAL[sa][0] <= 16) {
      sb = sa;
      pb = { x: sa === "left" ? b.rect.x : b.rect.x + b.rect.w, y: pb.y };
    }
    const facing = sa !== sb && horizontal(sa) === horizontal(sb);
    const axis = horizontal(sa) ? "y" : "x";
    if (facing && !plan.from.field && !plan.to.field && Math.abs(pa[axis] - pb[axis]) < 14) {
      const lone = (node, side) => (ports.get(`${node.el.dataset.node}|${side}`)?.length ?? 1) === 1;
      const within = (r, v) => axis === "y" ? v > r.y + 4 && v < r.y + r.h - 4 : v > r.x + 4 && v < r.x + r.w - 4;
      if (lone(a, sa) && within(a.rect, pb[axis]))
        pa = { ...pa, [axis]: pb[axis] };
      else if (lone(b, sb) && within(b.rect, pa[axis]))
        pb = { ...pb, [axis]: pa[axis] };
    }
    plan.raw = elbow(pa, sa, pb, sb, 16, plan.curve === "around" ? outside : sa === plan.sa && sb === plan.sb ? plan.outer ?? null : null);
    if (plan.curve === "around" && !plan.from.side && !plan.to.side) {
      const hits = (pts) => solid.filter((o) => o !== a && o !== b && crosses(pts, o.rect)).length;
      const left = elbow(sidePoint(a.rect, "left"), "left", sidePoint(b.rect, "left"), "left", 16, outsideLeft);
      if (hits(left) < hits(plan.raw))
        plan.raw = left;
    }
  }
  if (!bus)
    spreadChannels(plans.filter((plan) => plan.raw));
  for (const plan of plans) {
    const { edge, a, b } = plan;
    let pts;
    let dEnd;
    let dStart;
    let at;
    let path;
    const head = edge.dataset.head || "arrow";
    const tail = edge.dataset.tail || "none";
    if (plan.curve === "self") {
      const r = a.rect;
      const p1 = { x: r.x + r.w * 0.68, y: r.y };
      const p2 = { x: r.x + r.w * 0.32, y: r.y };
      path = `M${r1(p1.x)} ${r1(p1.y)} C${r1(p1.x + 6)} ${r1(r.y - 30)} ${r1(p2.x - 6)} ${r1(r.y - 30)} ${r1(p2.x)} ${r1(p2.y)}`;
      at = { x: p1.x + 8, y: r.y - 18 };
      plan.selfLabel = true;
      pts = [p1, p2];
      dEnd = { x: 0.25, y: 1 };
      dStart = { x: 0.25, y: 1 };
    } else if (plan.curve === "straight" || plan.curve === "curve") {
      const ca = center(a.rect);
      const cb = center(b.rect);
      if (plan.curve === "straight") {
        const pa = boundary(a.rect, cb, a.round);
        const pb = boundary(b.rect, ca, b.round);
        pts = inset(inset([pa, pb], HEADS[tail]?.inset ?? 0, true), HEADS[head]?.inset ?? 0, false);
        path = roundedPath(pts);
        at = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
        dEnd = unit(pa, pb);
        dStart = unit(pb, pa);
        pts = [pa, pb];
      } else {
        const len = Math.hypot(cb.x - ca.x, cb.y - ca.y) || 1;
        let n = { x: -(cb.y - ca.y) / len, y: (cb.x - ca.x) / len };
        const mid = { x: (ca.x + cb.x) / 2, y: (ca.y + cb.y) / 2 };
        const c0 = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
        if (n.x * (mid.x - c0.x) + n.y * (mid.y - c0.y) < 0)
          n = { x: -n.x, y: -n.y };
        const bend = parseFloat(edge.dataset.bend ?? "0.22");
        const ctrl = { x: mid.x + n.x * len * bend, y: mid.y + n.y * len * bend };
        const pa = boundary(a.rect, ctrl, a.round);
        const pb = boundary(b.rect, ctrl, b.round);
        dEnd = unit(ctrl, pb);
        dStart = unit(ctrl, pa);
        const ib = HEADS[head]?.inset ?? 0;
        const pbi = { x: pb.x - dEnd.x * ib, y: pb.y - dEnd.y * ib };
        path = `M${r1(pa.x)} ${r1(pa.y)} Q${r1(ctrl.x)} ${r1(ctrl.y)} ${r1(pbi.x)} ${r1(pbi.y)}`;
        at = { x: 0.25 * pa.x + 0.5 * ctrl.x + 0.25 * pb.x, y: 0.25 * pa.y + 0.5 * ctrl.y + 0.25 * pb.y };
        pts = [pa, pb];
      }
    } else {
      const raw = plan.raw;
      ({ at, along: plan.along } = labelSpot(raw));
      dEnd = unit(raw[raw.length - 2], raw[raw.length - 1]);
      dStart = unit(raw[1], raw[0]);
      pts = inset(inset(raw, HEADS[tail]?.inset ?? 0, true), HEADS[head]?.inset ?? 0, false);
      path = roundedPath(pts);
      pts = raw;
    }
    const g = wireGroup(edge);
    line(g, path, !edge.dataset.line);
    const tip = plan.curve === "self" ? pts[1] : pts[pts.length - 1];
    if (head !== "none")
      drawHead(g, head, tip, dEnd);
    if (tail !== "none")
      drawHead(g, tail, pts[0], dStart);
    g.dataset.path = path;
    copyFlow(edge, g, "2400");
    label(panel === "before" && edge.dataset.before != null ? edge.dataset.before : edge.dataset.label ?? edge.textContent.trim(), at, edge, plan.selfLabel ? "diagram-wire-label diagram-wire-self" : undefined, plan.along ?? null, g);
    const endLabel = (text, p, dir) => {
      if (!text)
        return;
      const perp = { x: -dir.y, y: dir.x };
      label(text, { x: p.x - dir.x * 16 + perp.x * 9, y: p.y - dir.y * 16 + perp.y * 9 }, edge, "diagram-wire-label diagram-wire-end", { x: Math.abs(perp.x) > 0.5 ? 1 : 0, y: Math.abs(perp.y) > 0.5 ? 1 : 0, len: 72 }, g);
    };
    endLabel(edge.dataset.fromLabel, pts[0], dStart);
    endLabel(edge.dataset.toLabel, tip, dEnd);
    drawn.push(edge);
  }
}
function spreadChannels(plans) {
  const channels = new Map;
  for (const plan of plans) {
    const r = plan.raw;
    if (r.length !== 4)
      continue;
    const vertical = Math.abs(r[1].x - r[2].x) < 0.5;
    const key = vertical ? `v${Math.round(r[1].x / 8)}` : `h${Math.round(r[1].y / 8)}`;
    if (!channels.has(key))
      channels.set(key, []);
    channels.get(key).push({ plan, vertical });
  }
  for (const group of channels.values()) {
    if (group.length < 2)
      continue;
    const along = group[0].vertical ? "y" : "x";
    group.sort((p, q) => Math.min(p.plan.raw[1][along], p.plan.raw[2][along]) - Math.min(q.plan.raw[1][along], q.plan.raw[2][along]));
    group.forEach(({ plan, vertical }, i) => {
      const offset = (i - (group.length - 1) / 2) * 10;
      const axis = vertical ? "x" : "y";
      plan.raw = plan.raw.map((pt, j) => j === 1 || j === 2 ? { ...pt, [axis]: pt[axis] + offset } : pt);
    });
  }
}
function drawSequence(canvas, nodes, list, panel, rectOf, wireGroup, line, label, drawn) {
  const bottom = canvas.clientHeight - CLEARANCE;
  for (const node of nodes.values()) {
    if (node.el.dataset.shape === "ghost")
      continue;
    const c = center(node.rect);
    const g = wireGroup(null, { "data-lifeline": "", "data-step-state": node.el.dataset.stepState, "data-active-state": node.el.dataset.activeState, beatOf: node.el });
    line(g, `M${r1(c.x)} ${r1(node.rect.y + node.rect.h)} V${r1(bottom)}`, false);
  }
  for (const edge of edgesIn(list)) {
    const ends = edgeIn(edge, panel);
    if (!ends)
      continue;
    const a = nodes.get(parseEnd(ends.from).id);
    const b = nodes.get(parseEnd(ends.to).id);
    if (!a || !b)
      continue;
    const row = rectOf(edge);
    const y = row.y + row.h * 0.62;
    const x1 = center(a.rect).x;
    const x2 = center(b.rect).x;
    const g = wireGroup(edge);
    const head = edge.dataset.head || (edge.dataset.line === "dashed" ? "open" : "arrow");
    if (a === b) {
      line(g, `M${r1(x1)} ${r1(y - 8)} H${r1(x1 + 30)} V${r1(y + 8)} H${r1(x1 + 4)}`, !edge.dataset.line);
      drawHead(g, head, { x: x1 + 1, y: y + 8 }, { x: -1, y: 0 });
      label(edge.textContent.trim(), { x: x1 + 36, y }, edge, "diagram-wire-label diagram-wire-self", null, g);
    } else {
      const dir = x2 > x1 ? 1 : -1;
      const ib = HEADS[head]?.inset ?? 0;
      line(g, `M${r1(x1)} ${r1(y)} H${r1(x2 - dir * ib)}`, !edge.dataset.line);
      drawHead(g, head, { x: x2, y }, { x: dir, y: 0 });
      label(edge.textContent.trim(), { x: (x1 + x2) / 2, y: y - 11 }, edge, "diagram-wire-label", { x: 1, y: 0, len: Math.abs(x2 - x1) - 16 }, g);
      g.dataset.path = `M${r1(x1)} ${r1(y)} H${r1(x2)}`;
      copyFlow(edge, g, "1600");
    }
    drawn.push(edge);
  }
}
function drawBones(nodes, wireGroup, line) {
  const effect = [...nodes.values()].find((n) => n.el.hasAttribute("data-effect"));
  if (!effect)
    return;
  const bones = [...nodes.values()].filter((n) => n.el.hasAttribute("data-bone"));
  const y = effect.rect.y + effect.rect.h / 2;
  const x0 = Math.min(effect.rect.x, ...bones.map((n) => n.rect.x)) - 8;
  const spine = wireGroup(null, { "data-spine": "", "data-tone": effect.el.dataset.tone });
  line(spine, `M${r1(x0)} ${r1(y)} H${r1(effect.rect.x - 3)}`, true);
  drawHead(spine, "arrow", { x: effect.rect.x, y }, { x: 1, y: 0 });
  for (const bone of bones) {
    const above = bone.rect.y + bone.rect.h / 2 < y;
    const from = { x: bone.rect.x + bone.rect.w / 2, y: above ? bone.rect.y + bone.rect.h : bone.rect.y };
    const dy = Math.abs(y - from.y);
    const to = { x: from.x + dy * 0.577, y };
    const g = wireGroup(null, { "data-bone": "", "data-tone": bone.el.dataset.tone, "data-step-state": bone.el.dataset.stepState, "data-active-state": bone.el.dataset.activeState, beatOf: bone.el });
    line(g, `M${r1(from.x)} ${r1(from.y)} L${r1(to.x)} ${r1(to.y)}`, true);
  }
}
var BADGE = { added: "+", removed: "−", changed: "Δ", moved: "→", rewired: "⇄" };
function badges(canvas, labels, rectOf) {
  for (const el of dfDollar18(canvas).find("[data-change]").toArray()) {
    if (el.closest(".diagram-edges, .diagram-wires, .diagram-wire-labels") || !el.getClientRects().length || !BADGE[el.dataset.change])
      continue;
    const r = rectOf(el);
    const chip = document.createElement("span");
    chip.className = "diagram-badge";
    chip.dataset.change = el.dataset.change;
    dfDollar18(chip).text(BADGE[el.dataset.change]);
    chip.style.left = `${r1(r.x + r.w)}px`;
    chip.style.top = `${r1(r.y)}px`;
    dfDollar18(labels).append(chip);
  }
}
function copyFlow(edge, g, fallback) {
  if (edge.dataset.flow == null)
    return;
  g.dataset.flow = edge.dataset.flow || fallback;
  if (edge.dataset.flowTokens)
    g.dataset.flowTokens = edge.dataset.flowTokens;
  if (edge.dataset.flowDelay)
    g.dataset.flowDelay = edge.dataset.flowDelay;
}
function flowTokens(labels, wires) {
  if (reducedMotion4())
    return;
  for (const g of dfDollar18(wires).children("[data-flow]").toArray()) {
    if (g.dataset.stepState === "future" || g.dataset.activeState === "dimmed")
      continue;
    const duration = Math.max(800, parseInt(g.dataset.flow, 10) || 2400);
    const count = Math.max(1, Math.min(8, parseInt(g.dataset.flowTokens, 10) || 1));
    const delay = parseInt(g.dataset.flowDelay, 10) || 0;
    for (let i = 0;i < count; i++) {
      const token = document.createElement("span");
      token.className = "diagram-token";
      if (g.dataset.tone)
        token.dataset.tone = g.dataset.tone;
      token.style.offsetPath = `path('${g.dataset.path}')`;
      dfDollar18(labels).append(token);
      const once = g.dataset.stepState === "current";
      token.animate?.([{ offsetDistance: "0%", opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 0.92 }, { offsetDistance: "100%", opacity: 0 }], {
        duration,
        delay: once ? delay + i * duration / count : delay - i * duration / count,
        iterations: once ? 1 : Infinity,
        easing: "linear",
        fill: "backwards"
      });
    }
  }
}
var PANEL_TITLES = ["Before", "Changes", "After"];
var CHANGE_WORD = { added: "Added", removed: "Removed", changed: "Changed", moved: "Moved", rewired: "Rewired" };
function panelCanvas(source, panel) {
  const copy = source.cloneNode(true);
  for (const el of [copy, ...dfDollar18(copy).find("[id]").toArray()])
    el.removeAttribute("id");
  dfDollar18(copy).find(".diagram-wires, .diagram-wire-labels").remove();
  for (const el of dfDollar18(copy).find("[data-change]").toArray()) {
    const change = el.dataset.change;
    if (panel === "before" && change === "added" || panel === "after" && change === "removed")
      el.setAttribute("data-delta-hidden", "");
  }
  if (panel === "before") {
    for (const el of dfDollar18(copy).find("[data-before]").toArray())
      dfDollar18(el).text(el.dataset.before);
    for (const el of [copy, ...dfDollar18(copy).find("[data-before-style]").toArray()]) {
      if (el.dataset.beforeStyle != null)
        el.setAttribute("style", el.dataset.beforeStyle);
    }
    for (const key of ["status", "tone", "badge", "shape"]) {
      for (const el of dfDollar18(copy).find(`[data-before-${key}]`).toArray()) {
        const old = el.getAttribute(`data-before-${key}`);
        dfDollar18(el).attr(`data-${key}`, old === "" ? null : old);
      }
    }
  }
  return copy;
}
function ledger(root, canvas) {
  const names = new Map(authored(canvas, "[data-node]").map((n) => [n.dataset.node, nameOf(n)]));
  const endName = (v) => names.get(parseEnd(v).id) || parseEnd(v).id;
  const list = edgeListOf(root, canvas);
  const items = [...authored(canvas, "[data-change]"), ...list && !canvas.contains(list) ? edgesIn(list).filter((e) => e.dataset.change) : []];
  const entries = [];
  for (const el of items) {
    const change = el.dataset.change;
    if (!CHANGE_WORD[change])
      continue;
    const isEdge = el.classList.contains("diagram-edge");
    let subject = nameOf(el);
    if (isEdge)
      subject = `${endName(el.dataset.from)} → ${endName(el.dataset.to)}${el.textContent.trim() ? ` (${el.textContent.trim()})` : ""}`;
    let note = el.dataset.changeNote || "";
    if (!note && change === "changed") {
      note = [el, ...dfDollar18(el).find("[data-before]").toArray()].filter((n) => n.dataset.before != null).map((n) => `${n.dataset.before} → ${n.textContent.trim()}`).join(" · ");
    }
    if (!note && change === "rewired" && isEdge)
      note = `was ${endName(el.dataset.beforeFrom || el.dataset.from)} → ${endName(el.dataset.beforeTo || el.dataset.to)}`;
    entries.push({ change, subject, note });
  }
  return entries;
}
function rebuildDelta(root) {
  const source = dfDollar18(root).children(".diagram-canvas").get(0);
  let host = dfDollar18(root).children(".diagram-delta").get(0);
  if (!root.hasAttribute("data-delta") || !source) {
    if (host)
      dfDollar18(host).remove();
    return;
  }
  if (!host) {
    host = document.createElement("div");
    host.className = "diagram-delta";
    source.after(host);
  }
  dfDollar18(host).empty();
  const titles = (root.dataset.deltaLabels || "").split("|").map((s) => s.trim());
  const entries = ledger(root, source);
  ["before", "changes", "after"].forEach((panel, i) => {
    const section = document.createElement("section");
    section.className = "diagram-panel";
    section.dataset.panel = panel;
    const title = document.createElement("h4");
    title.className = "diagram-panel-title";
    dfDollar18(title).text(titles[i] || PANEL_TITLES[i]);
    if (panel === "changes") {
      const count = document.createElement("span");
      count.className = "diagram-panel-count";
      dfDollar18(count).text(String(entries.length));
      dfDollar18(title).append(count);
    }
    const body = document.createElement("div");
    body.className = "diagram-panel-body";
    dfDollar18(body).append(panelCanvas(source, panel));
    dfDollar18(section).append(title).append(body);
    if (panel === "changes" && entries.length) {
      const ol = document.createElement("ol");
      ol.className = "diagram-ledger";
      for (const entry of entries) {
        const li = document.createElement("li");
        li.className = "diagram-ledger-item";
        li.dataset.change = entry.change;
        const kind = document.createElement("span");
        kind.className = "diagram-ledger-kind";
        dfDollar18(kind).text(`${BADGE[entry.change]} ${CHANGE_WORD[entry.change]}`);
        const subject = document.createElement("strong");
        dfDollar18(subject).text(entry.subject);
        dfDollar18(li).append(kind).append(subject);
        if (entry.note) {
          const note = document.createElement("span");
          note.className = "diagram-ledger-note";
          dfDollar18(note).text(entry.note);
          dfDollar18(li).append(note);
        }
        dfDollar18(ol).append(li);
      }
      dfDollar18(section).append(ol);
    }
    dfDollar18(host).append(section);
  });
  root._observer?.observe(host);
}
var ICONS = {
  prev: '<path d="m15 18-6-6 6-6"/>',
  next: '<path d="m9 18 6-6-6-6"/>',
  play: '<path d="M6 4l14 8-14 8z"/>',
  pause: '<path d="M7 4v16M17 4v16"/>',
  replay: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/>',
  all: '<path d="M4 6h16M4 12h16M4 18h16"/>'
};
function button(action, text, label) {
  const b = document.createElement("button");
  b.type = "button";
  b.className = "btn";
  b.dataset.variant = "outline";
  b.dataset.size = "sm";
  b.dataset.action = action;
  if (label)
    b.setAttribute("aria-label", label);
  const icon = svg("svg", { viewBox: "0 0 24 24", "aria-hidden": "true", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" });
  for (const d of ICONS[action].match(/d="[^"]+"/g))
    icon.append(svg("path", { d: d.slice(3, -1) }));
  b.append(icon);
  if (text) {
    const span = document.createElement("span");
    dfDollar18(span).text(text);
    b.append(span);
  }
  return b;
}
function makeControls(root) {
  const bar = document.createElement("div");
  bar.className = "diagram-controls";
  bar.setAttribute("role", "toolbar");
  bar.setAttribute("aria-label", "Diagram steps");
  bar.append(button("prev", "", "Previous step"), button("play", "Play"), button("next", "", "Next step"), button("replay", "Replay"), button("all", "Show all"));
  const status = document.createElement("output");
  status.className = "diagram-status";
  status.setAttribute("aria-live", "polite");
  bar.append(status);
  dfDollar18(bar).on("click", (e) => {
    const action = e.target.closest?.("[data-action]")?.dataset.action;
    if (action)
      control(root, action);
  });
  dfDollar18(bar).on("keydown", (e) => {
    const map = { ArrowLeft: "prev", ArrowRight: "next", Home: "first", End: "all", r: "replay", R: "replay", " ": "toggle" };
    const action = map[e.key];
    if (!action || e.key === " " && e.target.closest?.("button"))
      return;
    e.preventDefault();
    control(root, action);
  });
  const canvas = dfDollar18(root).children(".diagram-canvas").get(0);
  const after = dfDollar18(root).children(".diagram-delta").get(0) ?? canvas;
  if (after)
    after.after(bar);
  else
    dfDollar18(root).append(bar);
  return bar;
}
function updateControls(root) {
  const bar = root._controls;
  if (!bar)
    return;
  const { max } = stepPlan(root);
  const state = root._shown ?? root.store?.value ?? { name: "default", config: {} };
  const playing = state.name === "playing";
  const step = !stepping(state) ? max : stateStep(state, max);
  const play = dfDollar18(bar).find('[data-action="play"]').get(0);
  if (play) {
    const swap = dfDollar18(play).find("svg").get(0);
    if (swap) {
      dfDollar18(swap).empty();
      for (const d of ICONS[playing ? "pause" : "play"].match(/d="[^"]+"/g))
        swap.append(svg("path", { d: d.slice(3, -1) }));
    }
    dfDollar18(play).find("span").text(playing ? "Pause" : "Play");
    play.setAttribute("aria-pressed", String(playing));
  }
  dfDollar18(bar).find('[data-action="prev"]').prop("disabled", stepping(state) && step <= 1);
  dfDollar18(bar).find('[data-action="next"]').prop("disabled", !stepping(state) || step >= max);
  const status = dfDollar18(bar).find(".diagram-status");
  if (!stepping(state))
    status.text(`Complete · ${max} ${max === 1 ? "step" : "steps"}`);
  else {
    const name = stepLabel(root, step);
    status.text(`Step ${step} of ${max}${name ? ` · ${name}` : ""}`);
  }
}
function control(root, action) {
  const { max } = stepPlan(root);
  const state = root._shown ?? root.store?.value ?? { name: "default", config: {} };
  const step = !stepping(state) ? max : stateStep(state, max);
  const api = root.api;
  if (action === "toggle")
    action = state.name === "playing" ? "pause" : "play";
  if (action === "play" && state.name === "playing")
    action = "pause";
  if (action === "pause")
    api.setState("paused", { step });
  else if (action === "play")
    api.setState("playing", { step: state.name === "paused" && step < max ? step + 1 : 1 });
  else if (action === "replay")
    api.setState("playing", { step: 1 });
  else if (action === "first")
    api.setState("paused", { step: 1 });
  else if (action === "all")
    api.setState("default");
  else if (action === "prev")
    api.setState("paused", { step: !stepping(state) ? max - 1 : Math.max(1, step - 1) });
  else if (action === "next")
    api.setState("paused", { step: Math.min(max, step + 1) });
}
function msOf(root, name, fallback) {
  const raw = getComputedStyle(root).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n))
    return fallback;
  return raw.endsWith("ms") ? n : raw.endsWith("s") ? n * 1000 : n;
}
function holdOf(root, state) {
  const { stepOf, max } = stepPlan(root);
  const step = stateStep(state, max);
  let boxes = 0;
  stepOf.forEach((s, el) => {
    if (s === step && !el.classList.contains("diagram-edge"))
      boxes++;
  });
  const element = msOf(root, "--diagram-element-ms", 900);
  const appear = msOf(root, "--diagram-step-ms", 800);
  return Math.max(0, boxes - 1) * element + appear + msOf(root, "--diagram-hold", 1200);
}
function sync2(root) {
  rebuildDelta(root);
  for (const canvas of canvasesOf(root))
    draw2(root, canvas);
  updateControls(root);
}
function canvasesOf(root) {
  const delta = dfDollar18(root).children(".diagram-delta").get(0);
  if (delta)
    return dfDollar18(delta).find(".diagram-canvas").toArray();
  return dfDollar18(root).children(".diagram-canvas").toArray();
}
function triggerStateChange19(root, state) {
  applyMarkup18(root, state);
  clearTimeout(root._timer);
  const { max } = stepPlan(root);
  const step = stateStep(state, max);
  if (state.name === "playing") {
    root._timer = setTimeout(() => {
      if (!root.isConnected || root.store?.value.name !== "playing")
        return;
      if (step >= max)
        root.api.setState("paused", { step: max });
      else
        root.api.setState("playing", { step: step + 1 });
    }, holdOf(root, state));
  }
  const wasActive = root._shown?.name === "active" ? root._shown.config?.ref ?? null : null;
  root._shown = state;
  sync2(root);
  const ref = state.name === "active" ? state.config?.ref ?? null : null;
  const about = describe2(root, ref);
  updateOutputs(root, about);
  queueMicrotask(() => {
    if (state.name === "playing" || state.name === "paused") {
      root.dispatchEvent(new CustomEvent("diagram-step", { bubbles: true, detail: { step, max, label: stepLabel(root, step), state: state.name } }));
    }
    if (String(ref ?? "") !== String(wasActive ?? "")) {
      root.dispatchEvent(new CustomEvent("diagram-activate", { bubbles: true, detail: about ?? { ref: null, kind: null, element: null, label: "", detail: "" } }));
    }
  });
}
function updateOutputs(root, about) {
  if (!root.id)
    return;
  for (const out of dfDollar18(`[data-diagram-for="${root.id}"]`).toArray()) {
    if (out.tagName !== "OUTPUT")
      continue;
    if (!out.dataset.diagramEmpty)
      out.dataset.diagramEmpty = out.textContent.trim();
    dfDollar18(out).text(about ? `${about.label}${about.detail ? ` - ${about.detail}` : ""}` : out.dataset.diagramEmpty);
  }
}
var diagramApi = componentState({
  component: "diagram",
  states: diagramStates,
  apply: (root, state) => triggerStateChange19(root, state),
  markup: (el, state) => applyMarkup18(el, state)
});
df$19.diagramApi = diagramApi;
df$19.diagramStates = diagramStates;
var esc4 = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
var attr = (name, value) => value == null || value === false ? "" : value === true ? ` ${name}` : ` ${name}="${esc4(value)}"`;
var place = (o) => {
  const css = [["--col", o.col], ["--row", o.row], ["--span", o.span], ["--rspan", o.rspan], ["--x", o.x], ["--y", o.y], ["--i", o.i]].filter(([, v]) => v != null).map(([k, v]) => `${k}:${v}`);
  if (o.style)
    css.push(o.style);
  return css.join(";");
};
function nodeMarkup(n, children = "") {
  const before = n.before ?? {};
  const fields = n.fields?.length ? `<ul class="diagram-node-fields">${n.fields.map((f) => {
    const field = typeof f === "string" ? { name: f } : f;
    return `<li${attr("data-field", field.name)}${attr("data-key", field.key)}${attr("data-change", field.change)}><span>${esc4(field.name)}</span>${field.type ? `<span>${esc4(field.type)}</span>` : ""}</li>`;
  }).join("")}</ul>` : "";
  const ops = n.ops?.length ? `<ul class="diagram-node-ops">${n.ops.map((o) => `<li>${esc4(o)}</li>`).join("")}</ul>` : "";
  const text = (cls, key) => n[key] != null ? `<span class="${cls}"${attr("data-before", before[key])}>${esc4(n[key])}</span>` : "";
  const beforeStyle = ["col", "row", "span", "rspan", "x", "y"].some((k) => before[k] != null) ? place({ ...n, ...before }) : null;
  return `<div class="diagram-node"${attr("data-node", n.id)}${attr("data-shape", n.shape)}${attr("data-tone", n.tone)}${attr("data-status", n.status)}${attr("data-badge", n.badge)}${attr("data-step", n.step)}${attr("data-change", n.change)}${attr("data-change-note", n.note)}${attr("data-before-style", beforeStyle)}${attr("style", place(n) || null)}>${text("diagram-node-eyebrow", "eyebrow")}${text("diagram-node-name", "name")}${text("diagram-node-meta", "meta")}${fields}${ops}${children}</div>`;
}
function markupOf(spec) {
  const groups = spec.groups ?? [];
  const nodes = spec.nodes ?? [];
  const childrenOf = (id) => [
    ...groups.filter((g) => g.parent === id).map((g) => groupMarkup(g)),
    ...nodes.filter((n) => n.parent === id).map((n) => nodeMarkup(n))
  ].join("");
  function groupMarkup(g) {
    return `<div class="diagram-group"${attr("data-node", g.id)}${attr("data-shape", g.shape)}${attr("data-tone", g.tone)}${attr("data-step", g.step)}${attr("data-change", g.change)}${attr("style", place(g) || null)}><span class="diagram-group-label">${esc4(g.label)}</span>${childrenOf(g.id)}</div>`;
  }
  const caption = spec.title || spec.caption ? `<figcaption class="diagram-caption">${spec.eyebrow ? `<span class="diagram-eyebrow">${esc4(spec.eyebrow)}</span>` : ""}${spec.title ? `<span class="diagram-title">${esc4(spec.title)}</span>` : ""}${spec.caption ? `<span class="diagram-dek">${esc4(spec.caption)}</span>` : ""}</figcaption>` : "";
  const phases = spec.phases?.length ? `<ol class="diagram-phases" style="--row:1;--col:1;--span:${spec.cols ?? spec.phases.length}">${spec.phases.map((p) => {
    const phase = typeof p === "string" ? { name: p } : p;
    return `<li${attr("style", phase.span ? `--span:${phase.span}` : null)}>${esc4(phase.name)}</li>`;
  }).join("")}</ol>` : "";
  const top = [...groups.filter((g) => !g.parent).map(groupMarkup), ...nodes.filter((n) => !n.parent).map((n) => nodeMarkup(n))].join("");
  const edges = (spec.edges ?? []).map((e) => {
    const before = e.before ?? {};
    return `<li class="diagram-edge"${attr("data-from", e.from)}${attr("data-to", e.to)}${attr("data-line", e.line)}${attr("data-tone", e.tone)}${attr("data-head", e.head)}${attr("data-tail", e.tail)}${attr("data-curve", e.curve)}${attr("data-step", e.step)}${attr("data-flow", e.flow === true ? "" : e.flow)}${attr("data-from-label", e.fromLabel)}${attr("data-to-label", e.toLabel)}${attr("data-change", e.change)}${attr("data-before", before.label)}${attr("data-before-from", before.from)}${attr("data-before-to", before.to)}>${esc4(e.label)}</li>`;
  }).join("");
  return `${caption}<div class="diagram-canvas"${attr("style", [spec.cols ? `--cols:${spec.cols}` : "", spec.style ?? ""].filter(Boolean).join(";") || null)}>${phases}${top}</div>${edges ? `<ol class="diagram-edges">${edges}</ol>` : ""}`;
}
function diffSpecs(before, after) {
  const key = (e) => e.id ?? `${e.from}->${e.to}`;
  const merge = (olds = [], news = [], keyOf, compare) => {
    const oldMap = new Map(olds.map((o) => [keyOf(o), o]));
    const newKeys = new Set(news.map(keyOf));
    const out = news.map((n) => {
      const o = oldMap.get(keyOf(n));
      if (!o)
        return { ...n, change: "added" };
      return compare(o, n);
    });
    olds.forEach((o, i) => {
      if (!newKeys.has(keyOf(o)))
        out.splice(Math.min(i, out.length), 0, { ...o, change: "removed" });
    });
    return out;
  };
  const TEXT = ["name", "eyebrow", "meta"];
  const PLACE = ["col", "row", "span", "rspan", "x", "y"];
  const compareNode = (o, n) => {
    const text = TEXT.filter((k) => (o[k] ?? null) !== (n[k] ?? null));
    const kind = ["shape", "tone", "badge"].some((k) => (o[k] ?? null) !== (n[k] ?? null)) || JSON.stringify(o.fields ?? []) !== JSON.stringify(n.fields ?? []);
    const moved = PLACE.filter((k) => (o[k] ?? null) !== (n[k] ?? null));
    if (!text.length && !kind && !moved.length)
      return n;
    const prev = Object.fromEntries([...text, ...moved].map((k) => [k, o[k]]));
    return { ...n, change: text.length || kind ? "changed" : "moved", before: prev };
  };
  const compareEdge = (o, n) => {
    if (o.from !== n.from || o.to !== n.to)
      return { ...n, change: "rewired", before: { from: o.from, to: o.to } };
    if ((o.label ?? "") !== (n.label ?? "") || (o.line ?? "") !== (n.line ?? ""))
      return { ...n, change: "changed", before: { label: o.label ?? "" } };
    return n;
  };
  return {
    ...before,
    ...after,
    groups: merge(before.groups, after.groups, (g) => g.id, (o, n) => o.label !== n.label || PLACE.some((k) => o[k] !== n[k]) ? { ...n, change: "changed" } : n),
    nodes: merge(before.nodes, after.nodes, (n) => n.id, compareNode),
    edges: merge(before.edges, after.edges, key, compareEdge)
  };
}
var resolve6 = (target) => typeof target === "string" ? dfDollar18(target).get(0) : target;
var isDelta = (spec) => !!spec?.before && !!spec?.after;
function specFlags(root, spec) {
  for (const flag of ["steps", "autoplay", "interactive"])
    if (spec[flag])
      root.setAttribute(`data-${flag}`, typeof spec[flag] === "number" ? String(spec[flag]) : "");
}
var TONES = ["none", "accent", "link", "muted", "external", "warn", "ok", "danger"];
var SHAPES = ["box", "pill", "diamond", "store", "circle", "dot", "bar", "note", "activity", "class", "start", "end"];
var NODE_TEXT = [["eyebrow", "diagram-node-eyebrow"], ["name", "diagram-node-name"], ["meta", "diagram-node-meta"]];
var cellText = (c) => (dfDollar18(c).children("span").get(0) ?? c).textContent.trim();
var headText = (c) => [...c.childNodes].filter((n) => n.nodeType === 3 || n.nodeName !== "SMALL").map((n) => n.textContent).join("").trim();
function propertiesOf(root, ref) {
  const target = refTarget(root, ref);
  if (!target)
    return null;
  const { el, kind } = target;
  if (el.tagName === "TR") {
    const cells = dfDollar18(el).children("th, td").toArray();
    const heads = dfDollar18(el.closest("table")).find("thead tr").first().children("th, td").toArray();
    const out = { row: headText(cells[0]) };
    cells.slice(1).forEach((c, i) => {
      out[heads[i + 1] ? headText(heads[i + 1]) : `column ${i + 2}`] = cellText(c);
    });
    return out;
  }
  if (kind === "node") {
    const out = { id: el.dataset.node };
    for (const [key, cls] of NODE_TEXT)
      out[key] = dfDollar18(el).find(`.${cls}`).get(0)?.textContent.trim() ?? "";
    out.tone = el.dataset.tone || "none";
    out.shape = el.dataset.shape || "box";
    return out;
  }
  return {
    from: el.dataset.from,
    to: el.dataset.to,
    label: el.textContent.trim(),
    line: el.dataset.line || "solid",
    tone: el.dataset.tone || "none",
    head: el.dataset.head || "arrow",
    tail: el.dataset.tail || "none",
    curve: el.dataset.curve || "elbow"
  };
}
function propertySchemaOf(root, ref) {
  const target = refTarget(root, ref);
  if (!target)
    return {};
  if (target.el.tagName === "TR")
    return { row: { readOnly: true } };
  if (target.kind === "node")
    return { id: { readOnly: true }, tone: { options: TONES }, shape: { options: SHAPES } };
  const ends = Object.keys(HEADS);
  return {
    from: { readOnly: true },
    to: { readOnly: true },
    line: { options: ["solid", "dashed", "dotted", "thick"] },
    tone: { options: ["none", "accent", "link", "ink", "ok", "danger"] },
    head: { options: ends },
    tail: { options: ends },
    curve: { options: ["elbow", "straight", "curve", "around"] }
  };
}
function setPropertiesOf(root, ref, props) {
  const target = refTarget(root, ref);
  if (!target || !props)
    return false;
  const { el, kind } = target;
  const attr = (name, value, none) => dfDollar18(el).attr(`data-${name}`, value == null || value === "" || value === none ? null : String(value));
  if (el.tagName === "TR") {
    const cells = dfDollar18(el).children("th, td").toArray();
    const heads = dfDollar18(el.closest("table")).find("thead tr").first().children("th, td").toArray();
    cells.slice(1).forEach((c, i) => {
      const key = heads[i + 1] ? headText(heads[i + 1]) : `column ${i + 2}`;
      if (key in props && cellText(c) !== String(props[key]))
        dfDollar18(dfDollar18(c).children("span").get(0) ?? c).text(String(props[key]));
    });
  } else if (kind === "node") {
    const host = dfDollar18(el).children(".diagram-node-body").get(0) ?? el;
    for (const [key, cls] of NODE_TEXT) {
      if (!(key in props))
        continue;
      const value = String(props[key] ?? "");
      let span = dfDollar18(el).find(`.${cls}`).get(0);
      if (span && !value)
        dfDollar18(span).remove();
      else if (span && span.textContent !== value)
        dfDollar18(span).text(value);
      else if (!span && value) {
        span = document.createElement("span");
        span.className = cls;
        dfDollar18(span).text(value);
        const name = dfDollar18(host).children(".diagram-node-name").get(0);
        if (key === "eyebrow")
          host.prepend(span);
        else if (key === "meta" && name)
          name.after(span);
        else
          host.append(span);
      }
    }
    if ("tone" in props)
      attr("tone", props.tone, "none");
    if ("shape" in props)
      attr("shape", props.shape, "box");
  } else {
    if ("label" in props && el.textContent !== String(props.label ?? ""))
      dfDollar18(el).text(String(props.label ?? ""));
    if ("line" in props)
      attr("line", props.line, "solid");
    if ("tone" in props)
      attr("tone", props.tone, "none");
    if ("head" in props)
      attr("head", props.head, "arrow");
    if ("tail" in props)
      attr("tail", props.tail, "none");
    if ("curve" in props)
      attr("curve", props.curve, "elbow");
  }
  for (const canvas of canvasesOf(root))
    draw2(root, canvas);
  return true;
}
df$19.diagram = {
  build(target, spec) {
    const root = resolve6(target);
    if (!root)
      return null;
    const delta = isDelta(spec);
    const merged = isDelta(spec) ? diffSpecs(spec.before, spec.after) : spec;
    if (merged.type)
      dfDollar18(root).attr("data-type", merged.type);
    specFlags(root, merged);
    if (delta)
      dfDollar18(root).attr("data-delta", root.getAttribute("data-delta") ?? "");
    root._controls?.remove();
    root._controls = null;
    dfDollar18(root).children(".diagram-delta").remove();
    dfDollar18(root).html(markupOf(merged));
    setup(root);
    if (root.api)
      triggerStateChange19(root, root.store?.value ?? { name: "default", config: {} });
    return root;
  },
  markup: (spec) => markupOf(isDelta(spec) ? diffSpecs(spec.before, spec.after) : spec),
  diff: (before, after) => diffSpecs(before, after),
  redraw(target) {
    const root = resolve6(target);
    if (root)
      for (const canvas of canvasesOf(root))
        draw2(root, canvas);
  },
  play: (target, step = 1) => {
    resolve6(target)?.api.setState("playing", { step });
  },
  pause: (target) => {
    control(resolve6(target), "pause");
  },
  next: (target) => {
    control(resolve6(target), "next");
  },
  prev: (target) => {
    control(resolve6(target), "prev");
  },
  reset: (target) => {
    resolve6(target)?.api.setState("default");
  },
  activate(target, ref) {
    const root = resolve6(target);
    if (!root)
      return;
    if (ref == null || ref === "")
      root.api.setState("default");
    else
      root.api.setState("active", { ref: String(ref) });
  },
  activateNext: (target) => {
    stepActivation(resolve6(target), 1);
  },
  activatePrev: (target) => {
    stepActivation(resolve6(target), -1);
  },
  active(target) {
    const root = resolve6(target);
    const state = root?._shown ?? root?.store?.value;
    return state?.name === "active" ? describe2(root, state.config?.ref) : null;
  },
  order: (target) => activationOrder(resolve6(target)),
  properties: (target, ref) => propertiesOf(resolve6(target), ref),
  propertySchema: (target, ref) => propertySchemaOf(resolve6(target), ref),
  setProperties: (target, ref, props) => setPropertiesOf(resolve6(target), ref, props),
  steps(target) {
    const root = resolve6(target);
    const { max } = stepPlan(root);
    const state = root.store?.value ?? { name: "default" };
    return { max, current: !stepping(state) ? max : stateStep(state, max) };
  }
};
function setup(root) {
  if (root.hasAttribute("data-steps") && !root._controls)
    root._controls = makeControls(root);
  if (!root._observer) {
    root._observer = new ResizeObserver(() => {
      if (root._queued)
        return;
      root._queued = true;
      queueMicrotask(() => {
        root._queued = false;
        for (const canvas of canvasesOf(root))
          draw2(root, canvas);
      });
    });
    root._observer.observe(root);
  }
  for (const canvas of dfDollar18(root).find(".diagram-canvas").toArray())
    root._observer.observe(canvas);
  if (root.hasAttribute("data-interactive"))
    makeInteractive(root);
}
function makeInteractive(root) {
  for (const n of activatable(root)) {
    if (n.getAttribute("tabindex") == null)
      dfDollar18(n).attr("tabindex", "0");
    if (!n.getAttribute("role") && !tablePart(n))
      dfDollar18(n).attr("role", "button");
    if (n.getAttribute(pressedAttr(n)) == null)
      dfDollar18(n).attr(pressedAttr(n), "false");
  }
  if (root._interactive)
    return;
  root._interactive = true;
  const current = () => {
    const state = root._shown ?? root.store?.value ?? { name: "default" };
    return state.name === "active" ? String(state.config?.ref ?? "") : null;
  };
  const toggle = (ref) => current() === ref ? root.api.setState("default") : root.api.setState("active", { ref });
  dfDollar18(root).on("click", (e) => {
    const t = e.target;
    if (!t?.closest || t.closest(".diagram-controls, .diagram-delta, .diagram-edges, .diagram-caption, .diagram-legend"))
      return;
    const wire = t.closest("[data-edge-ref]");
    if (wire)
      return toggle(wire.dataset.edgeRef);
    const node = t.closest("[data-node]");
    if (node && activatable(root).includes(node))
      return toggle(node.dataset.node);
    if (t.closest(".diagram-canvas") && current() != null)
      root.api.setState("default");
  });
  dfDollar18(root).on("keydown", (e) => {
    const node = e.target?.closest?.("[data-node]");
    if (!node || !activatable(root).includes(node))
      return;
    const focusActive = () => activatable(root).find((n) => n.dataset.node === current())?.focus();
    if (e.key === "Enter" || e.key === " ")
      toggle(node.dataset.node);
    else if (e.key === "Escape")
      root.api.setState("default");
    else if (e.key === "ArrowRight" || e.key === "ArrowDown") {
      stepActivation(root, 1);
      focusActive();
    } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
      stepActivation(root, -1);
      focusActive();
    } else
      return;
    e.preventDefault();
  });
}
var controlsBound = false;
function bindOutsideControls() {
  if (controlsBound)
    return;
  controlsBound = true;
  dfDollar18(document).on("click", (e) => {
    const trigger = e.target?.closest?.("[data-diagram-for][data-diagram-action]");
    if (!trigger)
      return;
    const root = dfDollar18(`#${CSS.escape(trigger.dataset.diagramFor)}`).get(0);
    if (!root?.api)
      return;
    const action = trigger.dataset.diagramAction;
    if (action === "next")
      stepActivation(root, 1);
    else if (action === "prev")
      stepActivation(root, -1);
    else if (action === "clear" || action === "reset")
      root.api.setState("default");
    else if (action === "activate")
      root.api.setState("active", { ref: trigger.dataset.diagramRef });
    else if (action === "play")
      root.api.setState("playing", { step: 1 });
    else if (action === "pause")
      control(root, "pause");
    else if (action === "step-next")
      control(root, "next");
    else if (action === "step-prev")
      control(root, "prev");
  });
}
function init19() {
  bindOutsideControls();
  dfDollar18(".diagram:not([data-init])").toArray().forEach((root) => {
    root.dataset.init = "";
    const spec = dfDollar18(root).children("script.diagram-spec").get(0);
    if (spec && !dfDollar18(root).children(".diagram-canvas").get(0)) {
      try {
        const parsed = JSON.parse(spec.textContent);
        const merged = parsed.before && parsed.after ? diffSpecs(parsed.before, parsed.after) : parsed;
        if (parsed.before && parsed.after && !root.hasAttribute("data-delta"))
          root.setAttribute("data-delta", "");
        if (merged.type && !root.dataset.type)
          root.dataset.type = merged.type;
        specFlags(root, merged);
        const holder = document.createElement("div");
        dfDollar18(holder).html(markupOf(merged));
        while (holder.firstChild)
          dfDollar18(root).append(holder.firstChild);
      } catch (error) {
        console.error("[diagram] invalid spec", error);
      }
    }
    setup(root);
    bindComponent(root, diagramApi, { name: "default", config: {} });
    triggerStateChange19(root, { name: "default", config: {} });
    document.fonts?.ready.then(() => root.isConnected && diagramRedraw(root));
    if (root.hasAttribute("data-autoplay") && root.hasAttribute("data-steps")) {
      const delay = Math.max(0, Number(root.getAttribute("data-autoplay")) || 0);
      const onSlide = !!root.closest("[data-slide]");
      let seen = false;
      const io = new IntersectionObserver((entries) => {
        const shown = entries.some((e) => e.isIntersecting);
        if (!shown) {
          if (seen && onSlide)
            clearTimeout(root._autoplay);
          return;
        }
        if (seen && !onSlide)
          return;
        const first = !seen;
        seen = true;
        if (!onSlide)
          io.disconnect();
        if (reducedMotion4() || first && root.store?.value.name !== "default")
          return;
        clearTimeout(root._autoplay);
        if (delay || !first)
          root.api.setState("paused", { step: 0 });
        root._autoplay = setTimeout(() => root.isConnected && root.api.setState("playing", { step: 1 }), delay);
      }, { threshold: 0.35 });
      io.observe(root);
    }
  });
}
var diagramRedraw = (root) => {
  for (const canvas of canvasesOf(root))
    draw2(root, canvas);
};
init19();
new MutationObserver(init19).observe(document, { childList: true, subtree: true });

// src/components/dialog/dialog.ts
var df$20 = defussGlobals();
var dfDollar19 = defussQuery();
var dialogStates = ["default", "open"];
function applyMarkup19(dialog, stateName) {
  dfDollar19(dialog).attr("open", stateName === "open" ? "" : null);
}
function triggerStateChange20(dialog, stateName, _config) {
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
  apply: (dialog, state) => triggerStateChange20(dialog, state.name, state.config),
  markup: (el, state) => applyMarkup19(el, state.name)
});
df$20.dialogApi = dialogApi;
df$20.dialogStates = dialogStates;
function init20() {
  dfDollar19("[data-dialog-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar19("#" + CSS.escape(trigger.dataset.dialogTrigger)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog._trigger = trigger;
      dialog.showModal();
    });
  });
  dfDollar19("dialog:not(.alert-dialog):not(.sheet):not(.command):not(.window):not(.cookie-consent-dialog):not([data-init])").toArray().forEach((dialog) => {
    dfDollar19(dialog).data("init", "");
    bindComponent(dialog, dialogApi);
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog)
        dialog.close();
    });
    dfDollar19(dialog).find("[data-dialog-close]").toArray().forEach((btn) => {
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
init20();
new MutationObserver(init20).observe(document, { childList: true, subtree: true });

// src/components/diff/diff.ts
var df$21 = defussGlobals();
var dfDollar20 = defussQuery();
var diffStates = ["default", "before", "after"];
var rangeOf = (el) => dfDollar20(el).find(":scope > .diff-range").get(0);
function paint(el) {
  const range = rangeOf(el);
  if (!range)
    return;
  const min = parseFloat(range.min || "0");
  const max = parseFloat(range.max || "100");
  const pct = max === min ? 50 : (parseFloat(range.value) - min) / (max - min) * 100;
  el.style.setProperty("--diff-pos", `${pct}%`);
  el.dataset.stateName = pct >= 100 ? "before" : pct <= 0 ? "after" : "default";
}
function setPosition(el, pct) {
  const range = rangeOf(el);
  if (!range)
    return;
  const min = parseFloat(range.min || "0");
  const max = parseFloat(range.max || "100");
  const value = min + Math.min(100, Math.max(0, pct)) / 100 * (max - min);
  range.value = String(value);
  paint(el);
  range.dispatchEvent(new Event("input", { bubbles: true }));
}
function pointerPct(el, e) {
  const r = el.getBoundingClientRect();
  if (el.dataset.orientation === "vertical")
    return (e.clientY - r.top) / r.height * 100;
  const x = (e.clientX - r.left) / r.width * 100;
  return getComputedStyle(el).direction === "rtl" ? 100 - x : x;
}
function applyMarkup20(el, stateName) {
  const pct = stateName === "before" ? 100 : stateName === "after" ? 0 : null;
  if (pct !== null)
    dfDollar20(el).css("--diff-pos", pct + "%");
}
function triggerStateChange21(el, stateName, config) {
  switch (stateName) {
    case "default":
      setPosition(el, config?.position ?? el._defaultPosition ?? 50);
      break;
    case "before":
      setPosition(el, 100);
      break;
    case "after":
      setPosition(el, 0);
      break;
  }
}
var diffApi = componentState({
  component: "diff",
  states: diffStates,
  apply: (el, state) => triggerStateChange21(el, state.name, state.config),
  read: (el, state) => {
    const pct = parseFloat(el.style.getPropertyValue("--diff-pos")) || 0;
    const name = pct >= 100 ? "before" : pct <= 0 ? "after" : "default";
    return { name, config: { ...state.config, position: Math.round(pct * 100) / 100 } };
  },
  markup: (el, state) => applyMarkup20(el, state.name)
});
df$21.diffApi = diffApi;
df$21.diffStates = diffStates;
function init21() {
  dfDollar20(".diff:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    const range = rangeOf(el);
    if (!range)
      return;
    paint(el);
    el._defaultPosition = parseFloat(el.style.getPropertyValue("--diff-pos")) || 50;
    bindComponent(el, diffApi);
    range.addEventListener("input", () => paint(el));
    range.addEventListener("keydown", (e) => {
      const big = e.shiftKey ? 10 : 1;
      const deltas = { ArrowRight: big, ArrowUp: big, ArrowLeft: -big, ArrowDown: -big, PageUp: 10, PageDown: -10 };
      let d = deltas[e.key];
      if (d === undefined)
        return;
      e.preventDefault();
      const pct = parseFloat(el.style.getPropertyValue("--diff-pos")) || 0;
      if (el.dataset.orientation === "vertical" && (e.key === "ArrowUp" || e.key === "ArrowDown"))
        d = -d;
      if (el.dataset.orientation !== "vertical" && getComputedStyle(el).direction === "rtl" && e.key.startsWith("Arrow"))
        d = -d;
      setPosition(el, pct + d);
    });
    el.addEventListener("pointerdown", (e) => {
      if (e.button !== 0 || e.target === range)
        return;
      e.preventDefault();
      el.setPointerCapture(e.pointerId);
      el.dataset.dragging = "";
      setPosition(el, pointerPct(el, e));
      range.focus({ preventScroll: true });
    });
    el.addEventListener("pointermove", (e) => {
      if (el.hasPointerCapture(e.pointerId) || el.dataset.follow === "hover" && e.pointerType === "mouse") {
        setPosition(el, pointerPct(el, e));
      }
    });
    const end = (e) => {
      if (el.hasPointerCapture(e.pointerId))
        el.releasePointerCapture(e.pointerId);
      delete el.dataset.dragging;
    };
    el.addEventListener("pointerup", end);
    el.addEventListener("pointercancel", end);
  });
}
init21();
new MutationObserver(init21).observe(document, { childList: true, subtree: true });

// src/components/dropdown/dropdown.ts
var df$22 = defussGlobals();
var dfDollar21 = defussQuery();
var dropdownStates = ["default", "open"];
var ITEM = '[role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"]';
var isDisabled = (el) => el.disabled || el.getAttribute("aria-disabled") === "true";
var itemsOf = (menu) => Array.from(dfDollar21(menu).find(ITEM).toArray()).filter((i) => i.closest('[role="menu"]') === menu && !isDisabled(i));
var subOf = (trigger) => dfDollar21(trigger).closest(".dropdown-sub").children(".dropdown-sub-content").get(0) ?? null;
var rootOf2 = (menu) => {
  let m = menu;
  while (m?.parentElement?.closest(".dropdown-content[popover]"))
    m = m.parentElement.closest(".dropdown-content[popover]");
  return m;
};
var HOVER_OPEN = 120;
var HOVER_CLOSE = 220;
function applyMarkup21(_el, _stateName) {}
function triggerStateChange22(menu, stateName, _config) {
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
  apply: (menu, state) => triggerStateChange22(menu, state.name, state.config),
  markup: (el, state) => applyMarkup21(el, state.name)
});
df$22.dropdownApi = dropdownApi;
df$22.dropdownStates = dropdownStates;
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
function activate4(menu, item) {
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
    dfDollar21(group).find('[role="menuitemradio"]').toArray().forEach((r) => {
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
  const openSubs = () => Array.from(dfDollar21(menu).find(".dropdown-sub-content").toArray()).filter((s) => s.parentElement.closest('[role="menu"]') === menu && s.matches(":popover-open"));
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
    activate4(menu, item);
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
  const trigger = dfDollar21(wrap).find(":scope > .dropdown-sub-trigger").get(0);
  const sub = dfDollar21(wrap).find(":scope > .dropdown-sub-content").get(0);
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
function init22() {
  dfDollar21("[data-dropdown-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const menu = dfDollar21("#" + CSS.escape(trigger.dataset.dropdownTrigger)).get(0);
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
        const otherOpen = other ? dfDollar21("#" + CSS.escape(other.getAttribute("data-dropdown-trigger"))).get(0)?.matches(":popover-open") : false;
        if (!otherOpen && (!active || active === document.body || menu.contains(active) || other))
          trigger.focus({ preventScroll: true });
      }
    });
    wireMenu(menu);
    dfDollar21(menu).find(".dropdown-sub").toArray().forEach(wireSub);
  });
  dfDollar21(".dropdown-sub").toArray().forEach(wireSub);
  dfDollar21(".dropdown-content[popover]:not(.dropdown-sub-content):not([data-init])").toArray().forEach((menu) => {
    menu.dataset.init = "";
    bindComponent(menu, dropdownApi);
  });
}
init22();
new MutationObserver(init22).observe(document, { childList: true, subtree: true });

// src/components/file-input/file-input.ts
var df$23 = defussGlobals();
var dfDollar22 = defussQuery();
var fileInputStates = ["default", "dragover", "selected", "error"];
var inputOf2 = (el) => dfDollar22(el).find(".file-drop-input").get(0);
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
  return new Intl.NumberFormat(lang(el), { style: "unit", unit: units[i], unitDisplay: "short", maximumFractionDigits: i ? 1 : 0 }).format(n);
}
var ICON_X = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18M6 6l12 12"/></svg>';
function setFiles(input, files) {
  const dt = new DataTransfer;
  for (const f of files)
    dt.items.add(f);
  input.files = dt.files;
}
function renderList(el) {
  const input = inputOf2(el);
  const list = dfDollar22(el).find(".file-drop-list").get(0);
  if (!list)
    return;
  (el._urls || []).forEach((u) => URL.revokeObjectURL(u));
  el._urls = [];
  dfDollar22(list).empty().append([...input.files].map((file, i) => {
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
    dfDollar22(remove).html(ICON_X);
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
  const input = inputOf2(el);
  const err = dfDollar22(el).find(".file-drop-error").get(0);
  const message = rejected.length ? `Not added: ${rejected.map((r) => `${r.file.name} (${r.why})`).join(", ")}` : "";
  if (err) {
    err.textContent = message;
    err.setAttribute("role", "alert");
  }
  el.dataset.stateName = rejected.length ? "error" : input.files.length ? "selected" : "default";
  renderList(el);
  if (!quiet && rejected.length)
    el.dispatchEvent(new CustomEvent("file-drop:rejected", { bubbles: true, detail: { files: rejected.map((r) => r.file), message } }));
}
function onPick(el) {
  const input = inputOf2(el);
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
function applyMarkup22(el, stateName, config) {
  const err = dfDollar22(el).find(".file-drop-error").first();
  if (!err.get(0))
    return;
  err.attr("role", "alert");
  if (stateName === "error")
    err.text(config?.message || "Not added: archive.zip (type)");
  else if (stateName !== "dragover")
    err.text("");
}
function triggerStateChange23(el, stateName, config) {
  const input = inputOf2(el);
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
      const err = dfDollar22(el).find(".file-drop-error").get(0);
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
  apply: (el, state) => triggerStateChange23(el, state.name, state.config),
  read: (el, state) => {
    const input = inputOf2(el);
    return {
      name: el.dataset.stateName || "default",
      config: {
        ...state.config,
        count: input.files.length,
        files: [...input.files].map((f) => f.name),
        ...el.dataset.stateName === "error" ? { message: dfDollar22(el).find(".file-drop-error").text() } : {}
      }
    };
  },
  markup: (el, state) => applyMarkup22(el, state.name, state.config)
});
df$23.fileInputApi = fileInputApi;
df$23.fileInputStates = fileInputStates;
function init23() {
  dfDollar22(".file-drop:not([data-init])").toArray().forEach((el) => {
    const input = inputOf2(el);
    if (!input)
      return;
    el.dataset.init = "";
    el.dataset.stateName = "default";
    el._kept = [];
    dfDollar22(el).find(".file-drop-error").attr("role", "alert");
    bindComponent(el, fileInputApi);
    const zone = dfDollar22(el).find(".file-drop-zone").get(0) || el;
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
init23();
new MutationObserver(init23).observe(document, { childList: true, subtree: true });

// src/components/image/image.ts
var df$24 = defussGlobals();
var dfDollar23 = defussQuery();
var imageStates = ["default", "error"];
function applyMarkup23(el, stateName) {
  dfDollar23(el).find("img").first().attr("data-error", stateName === "error" ? "" : null);
}
function triggerStateChange24(figure, stateName, _config) {
  const img = dfDollar23(figure).find("img")[0];
  if (!img)
    return;
  switch (stateName) {
    case "default":
      dfDollar23(img).data("error", null);
      break;
    case "error":
      dfDollar23(img).data("error", "");
      break;
  }
}
var imageApi = componentState({
  component: "image",
  states: imageStates,
  apply: (figure, state) => triggerStateChange24(figure, state.name, state.config),
  read: (figure, state) => {
    const img = dfDollar23(figure).find("img")[0];
    return {
      name: img && dfDollar23(img).data("error") !== undefined ? "error" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup23(el, state.name)
});
df$24.imageApi = imageApi;
df$24.imageStates = imageStates;
var galleryIO = typeof IntersectionObserver === "function" ? new IntersectionObserver((entries) => {
  for (const e of entries) {
    if (!e.isIntersecting)
      continue;
    galleryIO.unobserve(e.target);
    readyGallery(e.target);
  }
}, { rootMargin: "300px" }) : null;
function readyGallery(gallery) {
  const imgs = [...dfDollar23(gallery).find(":scope > img, :scope > picture img").toArray()];
  Promise.all(imgs.map((img) => (img.decode ? img.decode() : Promise.resolve()).catch(() => {
    return;
  }))).then(() => {
    gallery.dataset.ready = "";
  });
}
function initHoverGalleries() {
  dfDollar23(".hover-gallery:not([data-init])").toArray().forEach((gallery) => {
    gallery.dataset.init = "";
    dfDollar23(gallery).find(":scope > img, :scope > picture img").toArray().forEach((img, i) => {
      if (img.loading === "lazy")
        img.loading = "eager";
      if (i > 0 && !img.hasAttribute("fetchpriority"))
        img.fetchPriority = "low";
    });
    if (galleryIO)
      galleryIO.observe(gallery);
    else
      readyGallery(gallery);
  });
}
function init24() {
  initHoverGalleries();
  dfDollar23(".image:not([data-init])").toArray().forEach((figure) => {
    figure.dataset.init = "";
    bindComponent(figure, imageApi);
    const img = dfDollar23(figure).find("img")[0];
    if (!img)
      return;
    if (img.complete && img.naturalWidth === 0) {
      dfDollar23(img).data("error", "");
    }
    img.addEventListener("error", () => {
      dfDollar23(img).data("error", "");
      figure.dataset.stateName = "error";
    });
    img.addEventListener("load", () => {
      dfDollar23(img).data("error", null);
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
        dfDollar23(img).data("loading", "");
        img.src = srcLow;
        const preload = new Image;
        preload.onload = preload.onerror = () => {
          img.src = finalSrc;
          dfDollar23(img).data("loading", null);
        };
        preload.src = finalSrc;
      } else if (retina) {
        img.src = srcHigh;
      }
    }
  });
}
init24();
new MutationObserver(init24).observe(document, { childList: true, subtree: true });
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
  dfDollar23(lightbox).html(`
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
  lightboxImg = dfDollar23(lightbox).find(".image-lightbox-content > img")[0];
  dfDollar23(lightbox).find(".image-lightbox-toolbar")[0].addEventListener("click", (e) => {
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
  dfDollar23(document.body).append(lightbox);
  return lightbox;
}
function upgradeLightboxToHigh() {
  if (!lightboxFigure)
    return;
  const img = dfDollar23(lightboxFigure).find("img")[0];
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
    dfDollar23(lightboxImg).css("transform", `scale(${zoom}) rotate(${rotation}deg)`);
  }
}
function openLightbox(figure) {
  const lb = getLightbox();
  zoom = 1;
  rotation = 0;
  const img = dfDollar23(figure).find("img")[0];
  lightboxFigure = figure;
  const $img = dfDollar23(lightboxImg);
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
    const img = dfDollar23(figure).find("img")[0];
    if (!img || dfDollar23(img).data("error") !== undefined)
      return;
    openLightbox(figure);
  });
}

// src/components/menubar/menubar.ts
var df$25 = defussGlobals();
var dfDollar24 = defussQuery();
var menubarStates = ["default", "open"];
var triggersOf = (bar) => Array.from(dfDollar24(bar).find(".menubar-trigger").toArray()).filter((t) => t.closest(".menubar") === bar && !t.disabled && t.getAttribute("aria-disabled") !== "true");
var menuOf = (trigger) => dfDollar24("#" + CSS.escape(trigger.dataset.dropdownTrigger || trigger.getAttribute("popovertarget") || "")).get(0);
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
  const own = Array.from(dfDollar24(menu).find('[role^="menuitem"]').toArray()).filter((x) => x.closest('[role="menu"]') === menu && !x.disabled && x.getAttribute("aria-disabled") !== "true");
  own.forEach((x) => x.removeAttribute("data-highlighted"));
  const item = last ? own.at(-1) : own[0];
  item?.setAttribute("data-highlighted", "");
  item?.focus({ preventScroll: true });
}
function applyMarkup24(_el, _stateName) {}
function triggerStateChange25(bar, stateName, config) {
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
    triggerStateChange25(bar, state.name, state.config);
  },
  read: (bar, state) => {
    const open = openMenuOf(bar);
    return { name: open ? "open" : "default", config: { ...state.config, menu: open?.id ?? null } };
  },
  markup: (el, state) => applyMarkup24(el, state.name)
});
df$25.menubarApi = menubarApi;
df$25.menubarStates = menubarStates;
function init25() {
  dfDollar24(".menubar:not([data-init])").toArray().forEach((bar) => {
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
init25();
new MutationObserver(init25).observe(document, { childList: true, subtree: true });

// src/components/mermaid/mermaid.ts
var df$26 = defussGlobals();
var dfDollar25 = defussQuery();
var mermaidStates = ["default", "rendered", "error"];
var MERMAID_URL = "https://cdn.jsdelivr.net/npm/mermaid@12.0.0/dist/mermaid.esm.min.mjs";
var modulePromise = null;
var moduleUrl = "";
function load(url) {
  const vendorUrl = url || (dfDollar25('meta[name="mermaid-module"]').get(0) ?? null)?.content || MERMAID_URL;
  if (modulePromise && vendorUrl === moduleUrl)
    return modulePromise;
  moduleUrl = vendorUrl;
  const pending = import(/* @vite-ignore */ vendorUrl).then((m) => m.default ?? m);
  pending.catch(() => {
    if (modulePromise === pending)
      modulePromise = null;
  });
  modulePromise = pending;
  return pending;
}
var probe2 = null;
function toHex(css) {
  if (!css || css === "none")
    return "";
  probe2 ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe2)
    return "";
  probe2.clearRect(0, 0, 1, 1);
  probe2.fillStyle = "rgba(1, 2, 3, 0.5)";
  probe2.fillStyle = css;
  if (probe2.fillStyle === "rgba(1, 2, 3, 0.5)")
    return "";
  probe2.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe2.getImageData(0, 0, 1, 1).data;
  const hex = (n) => n.toString(16).padStart(2, "0");
  return `#${hex(r)}${hex(g)}${hex(b)}${a < 255 ? hex(a) : ""}`;
}
function mermaidTheme(el) {
  const cs = getComputedStyle(el);
  const tok = (name, fallback) => toHex(cs.getPropertyValue(name).trim()) || fallback;
  const background = tok("--background", "#ffffff");
  const foreground = tok("--foreground", "#0a0a0a");
  const card = tok("--card", background);
  const cardFg = tok("--card-foreground", foreground);
  const muted = tok("--muted", "#f5f5f5");
  const mutedFg = tok("--muted-foreground", "#737373");
  const border = tok("--border", "#e5e5e5");
  const primary = tok("--primary", foreground);
  const primaryFg = tok("--primary-foreground", background);
  const secondary = tok("--secondary", muted);
  const accent = tok("--accent", muted);
  const accentFg = tok("--accent-foreground", foreground);
  const destructive = tok("--destructive", "#dc2626");
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(background.slice(i, i + 2), 16));
  const dark = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 < 0.5;
  return {
    darkMode: dark,
    background,
    fontFamily: cs.fontFamily || "system-ui, sans-serif",
    fontSize: "14px",
    textColor: foreground,
    primaryColor: card,
    primaryTextColor: cardFg,
    primaryBorderColor: mutedFg,
    mainBkg: card,
    nodeBorder: mutedFg,
    nodeTextColor: cardFg,
    secondaryColor: secondary,
    secondaryTextColor: foreground,
    secondaryBorderColor: border,
    tertiaryColor: muted,
    tertiaryTextColor: foreground,
    tertiaryBorderColor: border,
    lineColor: mutedFg,
    defaultLinkColor: mutedFg,
    edgeLabelBackground: background,
    titleColor: foreground,
    clusterBkg: muted,
    clusterBorder: border,
    actorBkg: card,
    actorBorder: mutedFg,
    actorTextColor: cardFg,
    actorLineColor: border,
    signalColor: foreground,
    signalTextColor: foreground,
    labelBoxBkgColor: muted,
    labelBoxBorderColor: border,
    labelTextColor: foreground,
    loopTextColor: foreground,
    activationBkgColor: muted,
    activationBorderColor: mutedFg,
    sequenceNumberColor: primaryFg,
    noteBkgColor: accent,
    noteTextColor: accentFg,
    noteBorderColor: border,
    classText: cardFg,
    labelColor: cardFg,
    altBackground: muted,
    stateBkg: card,
    stateLabelColor: cardFg,
    compositeBackground: muted,
    compositeTitleBackground: muted,
    innerEndBackground: foreground,
    specialStateColor: foreground,
    pie1: primary,
    errorBkgColor: destructive,
    errorTextColor: primaryFg
  };
}
function sourceOf(fig) {
  const pre = dfDollar25(fig).find(":scope > pre.mermaid").get(0) ?? null;
  if (!pre)
    return "";
  return Array.from(pre.childNodes).map((n) => n.nodeType === Node.TEXT_NODE ? n.data : n.nodeType === Node.ELEMENT_NODE ? dfDollar25("<div></div>").append(n.cloneNode(true)).html() ?? "" : "").join("").replace(/^\n+|\s+$/g, "");
}
function outputOf(fig) {
  let out = dfDollar25(fig).find(":scope > .mermaid-output").get(0) ?? null;
  if (!out) {
    out = document.createElement("div");
    out.className = "mermaid-output";
    out.setAttribute("data-ce-chrome", "");
    dfDollar25(fig).find(":scope > pre.mermaid").get(0)?.after(out);
  }
  return out;
}
function clearError(fig) {
  dfDollar25(fig).find(":scope > .mermaid-error").get(0)?.remove();
}
function showError(fig, message) {
  clearError(fig);
  dfDollar25(fig).find(":scope > .mermaid-output").get(0)?.remove();
  const out = document.createElement("output");
  out.className = "mermaid-error";
  out.setAttribute("role", "alert");
  out.setAttribute("data-ce-chrome", "");
  out.textContent = message;
  dfDollar25(fig).find(":scope > pre.mermaid").get(0)?.after(out);
  fig.dataset.state = "error";
  fig.dataset.stateName = "error";
}
var seq = 0;
var queue = Promise.resolve();
function renderDiagram(fig) {
  if (fig.dataset.state !== "rendered")
    fig.dataset.state = "pending";
  const job = queue.then(async () => {
    const source = sourceOf(fig);
    if (!fig.isConnected || !source) {
      if (fig.dataset.state === "pending")
        delete fig.dataset.state;
      return false;
    }
    let mermaid;
    try {
      mermaid = await load();
    } catch {
      showError(fig, `Mermaid could not be loaded from ${moduleUrl} - the diagram source is shown instead.`);
      return false;
    }
    const theme = mermaidTheme(fig);
    mermaid.initialize({
      startOnLoad: false,
      securityLevel: "strict",
      suppressErrorRendering: true,
      theme: "base",
      themeVariables: theme
    });
    try {
      const { svg, bindFunctions } = await mermaid.render(`defuss-mermaid-${++seq}`, source);
      if (!fig.isConnected)
        return false;
      clearError(fig);
      const out = outputOf(fig);
      const parsed = new DOMParser().parseFromString(svg, "text/html").body.firstElementChild;
      dfDollar25(out).empty();
      if (parsed)
        dfDollar25(out).append(document.importNode(parsed, true));
      const el = dfDollar25(out).find("svg").get(0);
      const label = fig.getAttribute("aria-label");
      if (el) {
        el.removeAttribute("height");
        el.style.maxWidth = "";
        el.setAttribute("role", "img");
        if (label && !dfDollar25(el).find(":scope > title").get(0))
          el.setAttribute("aria-label", label);
      }
      bindFunctions?.(out);
      fig.dataset.state = "rendered";
      fig.dataset.stateName = "rendered";
      fig._mermaidTheme = JSON.stringify(theme);
      return true;
    } catch (err) {
      const text = err instanceof Error ? err.message : String(err);
      showError(fig, `This diagram could not be rendered.
${text.split(`
`).slice(0, 4).join(`
`)}`);
      return false;
    }
  });
  queue = job.catch(() => {
    return;
  });
  return job;
}
function renderAll() {
  return Promise.all([...dfDollar25(".mermaid-diagram[data-init]").toArray()].map(renderDiagram));
}
function applyMarkup25(fig, stateName, config = {}) {
  dfDollar25(fig).children(".mermaid-output, .mermaid-error").remove();
  if (stateName === "default") {
    dfDollar25(fig).attr("data-state", null);
    return;
  }
  if (stateName === "rendered") {
    dfDollar25(fig).attr("data-state", "rendered");
    return;
  }
  const out = dfDollar25('<output class="mermaid-error" role="alert" data-ce-chrome></output>').text(typeof config.message === "string" ? config.message : "This diagram could not be rendered.");
  dfDollar25(fig).children("pre.mermaid").after(out);
  dfDollar25(fig).attr("data-state", "error");
}
function triggerStateChange26(fig, stateName, config) {
  switch (stateName) {
    case "default":
      clearError(fig);
      dfDollar25(fig).find(":scope > .mermaid-output").get(0)?.remove();
      delete fig.dataset.state;
      fig.dataset.stateName = "default";
      return;
    case "rendered":
      return renderDiagram(fig);
    case "error":
      showError(fig, typeof config.message === "string" ? config.message : "This diagram could not be rendered.");
      return;
  }
}
var mermaidApi = componentState({
  component: "mermaid",
  states: mermaidStates,
  apply: (fig, state) => triggerStateChange26(fig, state.name, state.config),
  read: (fig, state) => {
    const error = dfDollar25(fig).children(".mermaid-error").get(0);
    const config = { ...state.config, ...error ? { message: error.textContent ?? "" } : {} };
    return { name: fig.dataset.stateName || "default", config };
  },
  markup: (el, state) => applyMarkup25(el, state.name, state.config)
});
df$26.mermaidApi = mermaidApi;
df$26.mermaidStates = mermaidStates;
df$26.mermaid = { load, render: renderDiagram, renderAll, theme: mermaidTheme, url: MERMAID_URL };
var themeWatched2 = false;
function watchTheme2() {
  if (themeWatched2)
    return;
  themeWatched2 = true;
  let timer = 0;
  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      dfDollar25('.mermaid-diagram[data-state="rendered"]').toArray().forEach((fig) => {
        if (JSON.stringify(mermaidTheme(fig)) !== fig._mermaidTheme)
          renderDiagram(fig);
      });
    }, 80);
  };
  const mo = new MutationObserver(schedule);
  mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class", "style", "data-theme"] });
  if (document.head)
    mo.observe(document.head, { childList: true, subtree: true, characterData: true });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", schedule);
}
function init26() {
  dfDollar25("pre.mermaid:not(.mermaid-diagram > pre)").toArray().forEach((pre) => {
    const fig = document.createElement("figure");
    fig.className = "mermaid-diagram";
    pre.before(fig);
    fig.append(pre);
  });
  dfDollar25(".mermaid-diagram:not([data-init])").toArray().forEach((fig) => {
    fig.dataset.init = "";
    if (!dfDollar25(fig).find(":scope > pre.mermaid").get(0))
      return;
    fig.dataset.stateName = "default";
    bindComponent(fig, mermaidApi);
    watchTheme2();
    renderDiagram(fig);
  });
}
init26();
new MutationObserver(init26).observe(document, { childList: true, subtree: true });

// src/components/navigation-menu/navigation-menu.ts
var df$27 = defussGlobals();
var dfDollar26 = defussQuery();
var navigationMenuStates = ["default", "open"];
function applyMarkup26(_el, _stateName) {}
function triggerStateChange27(content, stateName, _config) {
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
  apply: (content, state) => triggerStateChange27(content, state.name, state.config),
  markup: (el, state) => applyMarkup26(el, state.name)
});
df$27.navigationMenuApi = navigationMenuApi;
df$27.navigationMenuStates = navigationMenuStates;
function init27() {
  dfDollar26(".nav-menu-trigger[popovertarget]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const content = dfDollar26("#" + CSS.escape(trigger.getAttribute("popovertarget"))).get(0);
    if (!content)
      return;
    const anchorId = `--nav-menu-${content.id}`;
    trigger.style.anchorName = anchorId;
    content.style.positionAnchor = anchorId;
  });
  dfDollar26(".nav-menu-content[popover]:not([data-init])").toArray().forEach((content) => {
    content.dataset.init = "";
    bindComponent(content, navigationMenuApi);
  });
}
init27();
new MutationObserver(init27).observe(document, { childList: true, subtree: true });

// src/components/number-input/number-input.ts
var df$28 = defussGlobals();
var dfDollar27 = defussQuery();
var numberInputStates = ["default"];
var getInput2 = (wrapper) => dfDollar27(wrapper).find('input:not([type="hidden"])').get(0);
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
  dfDollar27(wrapper).find("input[data-number-output]").toArray().forEach((out) => {
    if (out.value === value)
      return;
    out.value = value;
    out.dispatchEvent(new Event("change", { bubbles: true }));
  });
}
function placeCurrencySymbol(wrapper, input, cfg) {
  let unit = dfDollar27(wrapper).find(".number-input-unit").get(0);
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
function applyMarkup27(_el, _stateName) {}
function triggerStateChange28(wrapper, config) {
  const input = getInput2(wrapper);
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
  apply: (wrapper, state) => triggerStateChange28(wrapper, state.config),
  read: (wrapper, state) => {
    const input = getInput2(wrapper);
    return {
      name: wrapper.dataset.stateName || "default",
      config: {
        ...state.config,
        value: input ? input.value : "",
        ...wrapper._money ? { number: wrapper.dataset.value ?? "", currency: wrapper._money.currency, locale: wrapper._money.locale } : {}
      }
    };
  },
  markup: (el, state) => applyMarkup27(el, state.name)
});
df$28.numberInputApi = numberInputApi;
df$28.numberInputStates = numberInputStates;
function init28() {
  dfDollar27(".number-input:not([data-init])").toArray().forEach((wrapper) => {
    wrapper.dataset.init = "";
    bindComponent(wrapper, numberInputApi);
    const input = getInput2(wrapper);
    const decBtn = dfDollar27(wrapper).find('[data-action="decrement"]').get(0);
    const incBtn = dfDollar27(wrapper).find('[data-action="increment"]').get(0);
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
init28();
new MutationObserver(init28).observe(document, { childList: true, subtree: true });

// src/components/otp-input/otp-input.ts
var df$29 = defussGlobals();
var dfDollar28 = defussQuery();
var otpInputStates = ["default", "filled", "invalid"];
var PATTERNS = {
  digits: /[^0-9]/g,
  alphanumeric: /[^a-zA-Z0-9]/g
};
var lengthOf = (otp) => Math.max(1, parseInt(otp.dataset.length || "6", 10) || 6);
function clean2(otp, raw) {
  const strip = PATTERNS[otp.dataset.pattern] ?? PATTERNS.digits;
  return raw.replace(strip, "").slice(0, lengthOf(otp));
}
function paint2(otp) {
  const field = otp._field;
  if (!field)
    return;
  const value = field.value;
  const focused = document.activeElement === field;
  const caret = Math.min(field.selectionStart ?? value.length, lengthOf(otp) - 1);
  otp._slots.forEach((slot, i) => {
    const char = value[i] ?? "";
    slot.textContent = otp.hasAttribute("data-mask") && char ? "•" : char;
    slot.toggleAttribute("data-filled", char !== "");
    slot.toggleAttribute("data-active", focused && i === caret && value.length < lengthOf(otp));
    slot.toggleAttribute("data-caret", focused && i === value.length && value.length < lengthOf(otp));
  });
}
function announceComplete(otp) {
  otp.dispatchEvent(new CustomEvent("otp-complete", { bubbles: true, detail: { value: otp._field.value } }));
}
function applyMarkup28(el, stateName) {
  const invalid = stateName === "invalid";
  dfDollar28(el).attr("data-invalid", invalid ? "" : null);
  dfDollar28(el).find("input").first().attr("aria-invalid", invalid ? "true" : null);
}
function triggerStateChange29(otp, stateName, config) {
  const field = otp._field;
  switch (stateName) {
    case "default":
      otp.removeAttribute("data-invalid");
      field.removeAttribute("aria-invalid");
      if (typeof config.value === "string")
        field.value = clean2(otp, config.value);
      break;
    case "filled":
      otp.removeAttribute("data-invalid");
      field.removeAttribute("aria-invalid");
      if (typeof config.value === "string") {
        field.value = clean2(otp, config.value);
      } else if (field.value.length < lengthOf(otp)) {
        field.value = "0".repeat(lengthOf(otp));
      }
      break;
    case "invalid":
      otp.setAttribute("data-invalid", "");
      field.setAttribute("aria-invalid", "true");
      if (typeof config.value === "string")
        field.value = clean2(otp, config.value);
      break;
  }
  paint2(otp);
}
var otpInputApi = componentState({
  component: "otp-input",
  states: otpInputStates,
  apply: (otp, state) => {
    triggerStateChange29(otp, state.name, state.config);
  },
  read: (otp, state) => {
    return {
      name: otp.dataset.stateName || "default",
      config: { ...state.config, ...otp._field ? { value: otp._field.value } : {} }
    };
  },
  markup: (el, state) => applyMarkup28(el, state.name)
});
df$29.otpInputApi = otpInputApi;
df$29.otpInputStates = otpInputStates;
function init29() {
  dfDollar28(".otp-input:not([data-init])").toArray().forEach((otp) => {
    otp.dataset.init = "";
    const field = dfDollar28(otp).find("input").get(0);
    if (!field)
      return;
    otp._field = field;
    const length = lengthOf(otp);
    field.maxLength = length;
    if (!field.getAttribute("inputmode")) {
      field.setAttribute("inputmode", otp.dataset.pattern === "alphanumeric" ? "text" : "numeric");
    }
    if (!field.getAttribute("autocomplete"))
      field.setAttribute("autocomplete", "one-time-code");
    const groupSize = parseInt(otp.dataset.groupSize || "0", 10) || 0;
    otp._slots = [];
    const shell = document.createElement("div");
    shell.className = "otp-input-slots";
    shell.setAttribute("aria-hidden", "true");
    for (let i = 0;i < length; i++) {
      if (groupSize && i > 0 && i % groupSize === 0) {
        const sep = document.createElement("div");
        sep.className = "otp-input-separator";
        dfDollar28(shell).append(sep);
      }
      const slot = document.createElement("div");
      slot.className = "otp-input-slot";
      dfDollar28(shell).append(slot);
      otp._slots.push(slot);
    }
    dfDollar28(otp).append(shell);
    const sync = () => {
      const cleaned = clean2(otp, field.value);
      if (cleaned !== field.value) {
        const at = field.selectionStart;
        field.value = cleaned;
        if (at !== null)
          field.setSelectionRange(Math.min(at, cleaned.length), Math.min(at, cleaned.length));
      }
      paint2(otp);
      if (field.value.length === length) {
        otpInputApi.setState(otp, otp.hasAttribute("data-invalid") ? "invalid" : "filled", {
          value: field.value
        });
        announceComplete(otp);
      }
    };
    field.addEventListener("input", sync);
    field.addEventListener("focus", () => paint2(otp));
    field.addEventListener("blur", () => paint2(otp));
    field.addEventListener("keyup", () => paint2(otp));
    field.addEventListener("click", () => paint2(otp));
    field.addEventListener("select", () => paint2(otp));
    bindComponent(otp, otpInputApi);
    otpInputApi.setState(otp, field.value.length === length ? "filled" : "default", {});
  });
}
init29();
new MutationObserver(init29).observe(document, { childList: true, subtree: true });

// src/components/pagination/pagination.ts
var df$30 = defussGlobals();
var dfDollar29 = defussQuery();
var paginationStates = ["default"];
var numAttr = (el, key, fallback) => {
  const v = parseInt(el.dataset[key] ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
};
function renderWindow(nav) {
  const list = dfDollar29(nav).find(".pagination-list").get(0);
  const prev = dfDollar29(nav).find(".pagination-prev").get(0);
  const next = dfDollar29(nav).find(".pagination-next").get(0);
  const prevLi = prev?.closest("li") ?? null;
  const nextLi = next?.closest("li") ?? null;
  if (!list || !prev || !next || !prevLi || !nextLi)
    return;
  const min = Math.max(1, numAttr(nav, "minPage", 1));
  const max = Math.max(min, numAttr(nav, "maxPage", 1));
  const active = Math.min(max, Math.max(min, numAttr(nav, "activePage", min)));
  dfDollar29(prev).attr("aria-disabled", active <= min ? "true" : null);
  dfDollar29(next).attr("aria-disabled", active >= max ? "true" : null);
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
    const page = node.nodeType === Node.ELEMENT_NODE ? dfDollar29(node).find(".pagination-link[data-page]").attr("data-page") : null;
    const p = page ? parseInt(page, 10) : NaN;
    if (Number.isFinite(p) && p >= start && p <= end) {
      node.remove();
      survivors.set(p, node);
    } else
      node.remove();
  }
  for (const node of windowNodes(start, end, min, max, active, survivors))
    dfDollar29(nextLi).before(node);
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
      const a = dfDollar29(node).find("a").get(0);
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
function applyConfig(nav, config) {
  const a = config.activePage ?? config.page;
  if (a !== undefined && numAttr(nav, "activePage", 1) !== Number(a))
    nav.dataset.activePage = String(a);
  if (config.minPage !== undefined && numAttr(nav, "minPage", 1) !== Number(config.minPage))
    nav.dataset.minPage = String(config.minPage);
  if (config.maxPage !== undefined && numAttr(nav, "maxPage", 1) !== Number(config.maxPage))
    nav.dataset.maxPage = String(config.maxPage);
  if (config.pageDisplayCount !== undefined && numAttr(nav, "pageDisplayCount", 5) !== Number(config.pageDisplayCount))
    nav.dataset.pageDisplayCount = String(config.pageDisplayCount);
}
function applyMarkup29(nav, config = {}) {
  applyConfig(nav, config);
  if (nav.hasAttribute("data-active-page"))
    renderWindow(nav);
}
function triggerStateChange30(nav, stateName, config = {}) {
  if (stateName !== "default")
    return;
  applyConfig(nav, config);
  if (nav.hasAttribute("data-active-page"))
    renderWindow(nav);
}
var paginationApi = componentState({
  component: "pagination",
  states: paginationStates,
  apply: (nav, state) => triggerStateChange30(nav, state.name, state.config),
  read: (nav, state) => {
    return {
      name: nav.dataset.stateName || "default",
      config: {
        ...state.config,
        activePage: numAttr(nav, "activePage", 1),
        minPage: numAttr(nav, "minPage", 1),
        maxPage: numAttr(nav, "maxPage", 1),
        pageDisplayCount: numAttr(nav, "pageDisplayCount", 5)
      }
    };
  },
  markup: (el, state) => applyMarkup29(el, state.config)
});
df$30.paginationApi = paginationApi;
df$30.paginationStates = paginationStates;
function init30() {
  dfDollar29(".pagination:not([data-init])").toArray().forEach((nav) => {
    nav.dataset.init = "";
    bindComponent(nav, paginationApi);
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
init30();
new MutationObserver(init30).observe(document, { childList: true, subtree: true });

// src/components/panel/panel.ts
var df$31 = defussGlobals();
var dfDollar30 = defussQuery();
var panelStates = ["default", "minimized", "maximized", "closed"];
var SIDES3 = ["north", "south", "west", "east", "center"];
var resolve7 = (t) => typeof t === "string" ? dfDollar30("#" + CSS.escape(t)).get(0) ?? dfDollar30(t).get(0) : t;
var toolInput = (panel, tool) => dfDollar30(panel).find(`:scope > .panel-header .panel-${tool} > input[type="checkbox"]`).get(0);
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
var sideOf = (region) => region ? SIDES3.find((s) => region.classList.contains(`border-layout-${s}`)) ?? null : null;
var hostOf = (panel) => panel.parentElement?.closest(".border-layout, [data-panel-host]") ?? null;
function applyMarkup30(el, stateName) {
  dfDollar30(el).attr("data-minimized", stateName === "minimized" ? "" : null).attr("data-maximized", stateName === "maximized" ? "" : null);
  dfDollar30(el).attr("hidden", stateName === "closed" ? "" : null);
  dfDollar30(el).children(".panel-body").attr("inert", stateName === "minimized" ? "" : null);
}
function triggerStateChange31(panel, stateName) {
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
  const body = dfDollar30(panel).find(":scope > .panel-body").get(0);
  if (body)
    body.toggleAttribute("inert", minimized);
  const region = regionOf2(panel);
  if (region && region !== panel) {
    region.toggleAttribute("data-panel-minimized", minimized);
    region.toggleAttribute("data-panel-closed", closed);
    const handle = dfDollar30(region).find(":scope > .resizer-handle").get(0);
    if (handle)
      handle.inert = minimized || maximized || closed;
  }
  const host = hostOf(panel);
  if (maximized && host) {
    panel._host = host;
    host.setAttribute("data-panel-maximized", "");
  } else if (panel._host) {
    if (!dfDollar30(panel._host).find(".panel[data-maximized]").get(0))
      panel._host.removeAttribute("data-panel-maximized");
    panel._host = null;
  }
}
var panelApi = componentState({
  component: "panel",
  states: panelStates,
  apply: (panel, state) => {
    const from = panel.dataset.stateName || "default";
    triggerStateChange31(panel, state.name);
    queueMicrotask(() => syncToggles(panel));
    if (from !== state.name) {
      panel.dispatchEvent(new CustomEvent("panel-change", { bubbles: true, detail: { state: state.name, previous: from, region: sideOf(regionOf2(panel)) } }));
    }
  },
  markup: (el, state) => applyMarkup30(el, state.name)
});
df$31.panelApi = panelApi;
df$31.panelStates = panelStates;
function init31() {
  dfDollar30(".panel:not([data-init])").toArray().forEach((panel) => {
    panel.dataset.init = "";
    const side = sideOf(regionOf2(panel));
    if (side)
      panel.dataset.region = side;
    const header = dfDollar30(panel).find(":scope > .panel-header").get(0);
    const body = dfDollar30(panel).find(":scope > .panel-body").get(0);
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
    dfDollar30(panel).on("click", (e) => {
      const close = e.target?.closest?.(".panel-close");
      if (!close || close.closest(".panel") !== panel)
        return;
      panelApi.setState(panel, "closed");
      if (panel.id)
        dfDollar30(`[data-panel-open="${CSS.escape(panel.id)}"], [data-panel-toggle="${CSS.escape(panel.id)}"]`).get(0)?.focus();
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
    triggerStateChange31(panel, start);
    panel.dataset.stateName = start;
    syncToggles(panel);
  });
}
var act = (t, state) => {
  const panel = resolve7(t);
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
    const panel = resolve7(target);
    if (!panel?.api)
      return false;
    panel.api.setState(panel.hasAttribute("data-minimized") ? "default" : "minimized");
    return panel.hasAttribute("data-minimized");
  }
};
df$31.panel = panelActions;
var openersBound = false;
function bindOpeners() {
  if (openersBound)
    return;
  openersBound = true;
  dfDollar30(document).on("click", (e) => {
    const trigger = e.target?.closest?.("[data-panel-open], [data-panel-toggle]");
    if (!trigger)
      return;
    const id = trigger.dataset.panelOpen ?? trigger.dataset.panelToggle;
    const panel = dfDollar30(`#${CSS.escape(id)}`).get(0);
    if (!panel?.api)
      return;
    if (trigger.hasAttribute("data-panel-toggle") && panel.dataset.stateName !== "closed") {
      panel.api.setState("closed");
      return;
    }
    panel.api.setState("default");
    dfDollar30(panel).find(":scope > .panel-header .panel-tools :is(input, button)").get(0)?.focus();
  });
}
function syncToggles(panel) {
  if (!panel.id)
    return;
  for (const t of dfDollar30(`[data-panel-toggle="${CSS.escape(panel.id)}"]`).toArray()) {
    t.setAttribute("aria-expanded", String(panel.dataset.stateName !== "closed" && !panel.hidden));
    t.setAttribute("aria-controls", panel.id);
  }
}
bindOpeners();
init31();
new MutationObserver(init31).observe(document, { childList: true, subtree: true });

// src/components/popover/popover.ts
var df$32 = defussGlobals();
var dfDollar31 = defussQuery();
var popoverStates = ["default", "open"];
function applyMarkup31(_el, _stateName) {}
function triggerStateChange32(popover, stateName, _config) {
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
  apply: (popover, state) => triggerStateChange32(popover, state.name, state.config),
  markup: (el, state) => applyMarkup31(el, state.name)
});
df$32.popoverApi = popoverApi;
df$32.popoverStates = popoverStates;
function init32() {
  dfDollar31("[popovertarget]:not([data-init])").toArray().forEach((trigger) => {
    const id = trigger.getAttribute("popovertarget");
    const popover = dfDollar31("#" + CSS.escape(id)).get(0);
    if (!popover || !popover.classList.contains("popover"))
      return;
    trigger.dataset.init = "";
    const anchorId = `--popover-${id}`;
    trigger.style.anchorName = anchorId;
    popover.style.positionAnchor = anchorId;
  });
  dfDollar31(".popover[popover]:not([data-init])").toArray().forEach((popover) => {
    popover.dataset.init = "";
    bindComponent(popover, popoverApi);
  });
}
init32();
new MutationObserver(init32).observe(document, { childList: true, subtree: true });

// src/components/presentation/presentation.ts
var df$33 = defussGlobals();
var dfDollar32 = defussQuery();
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
  const num = (suffix) => {
    const n = parseFloat(pick(suffix) ?? "");
    return Number.isFinite(n) ? n : undefined;
  };
  if (num("Duration") !== undefined)
    opts.duration = num("Duration");
  if (num("Scale") !== undefined)
    opts.scale = num("Scale");
  if (num("Blocks") !== undefined)
    opts.blocks = Math.round(num("Blocks"));
  if (num("Stagger") !== undefined)
    opts.stagger = num("Stagger");
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
var probe3 = null;
function rgbOf(css) {
  if (!css || typeof document === "undefined")
    return null;
  probe3 ??= document.createElement("canvas").getContext("2d", { willReadFrequently: true });
  if (!probe3)
    return null;
  probe3.clearRect(0, 0, 1, 1);
  probe3.fillStyle = "rgba(1, 2, 3, 0.5)";
  probe3.fillStyle = css;
  if (probe3.fillStyle === "rgba(1, 2, 3, 0.5)")
    return null;
  probe3.fillRect(0, 0, 1, 1);
  const [r, g, b, a] = probe3.getImageData(0, 0, 1, 1).data;
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
var slidesOf = (root) => Array.from(dfDollar32(root).find(":scope > [data-slide]").toArray());
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
function applyMarkup32(root, stateName, config = {}) {
  const slides = slidesOf(root);
  const want = config.index ?? config.slide;
  if (want !== undefined && slides.length) {
    const target = slides[clampIndex(want, slides.length)];
    slides.forEach((slide) => {
      const on = slide === target;
      dfDollar32(slide).attr("data-active", on ? "" : null).attr("inert", on ? null : "").attr("aria-hidden", String(!on));
    });
  }
  if (stateName === "notes")
    root.toggleAttribute("data-notes", config.value !== false);
  else if (typeof config.notes === "boolean")
    root.toggleAttribute("data-notes", config.notes);
  else if (stateName === "default" && want === undefined && config.fullscreen === undefined)
    root.removeAttribute("data-notes");
}
function triggerStateChange33(root, stateName, config = {}) {
  if (!presentationStates.includes(stateName)) {
    throw new Error(`presentation: unknown state "${stateName}" (supported: ${presentationStates.join(", ")})`);
  }
  const want = config.index ?? config.slide;
  if (stateName !== "notes" && typeof config.notes === "boolean")
    root.toggleAttribute("data-notes", config.notes);
  if (stateName === "default") {
    if (want !== undefined) {
      const to = clampIndex(want, slidesOf(root).length);
      if (to !== indexOf(root))
        root._presentationActivate?.(to);
    }
    if (want === undefined && config.notes === undefined && config.fullscreen === undefined) {
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
var presentationApi = componentState({
  component: "presentation",
  states: presentationStates,
  apply: (root, state) => triggerStateChange33(root, state.name, state.config),
  read: (root, state) => {
    return {
      name: root.dataset.stateName || "default",
      config: {
        ...state.config,
        slide: indexOf(root),
        notes: root.hasAttribute("data-notes"),
        fullscreen: root.hasAttribute("data-fullscreen")
      }
    };
  },
  markup: (el, state) => applyMarkup32(el, state.name, state.config)
});
df$33.presentationApi = presentationApi;
df$33.presentationStates = presentationStates;
var keysBound2 = false;
function bindKeyboard() {
  if (keysBound2)
    return;
  keysBound2 = true;
  bindGlobalKeys((e) => {
    const target = e.target;
    const root = target?.closest(".presentation") ?? (dfDollar32(".presentation").get(0) ?? null);
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
        triggerStateChange33(root, "fullscreen", { value: !root.hasAttribute("data-fullscreen") });
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
    const slide = dfDollar32("#" + CSS.escape(id)).get(0);
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
function init33() {
  dfDollar32(".presentation:not([data-init])").toArray().forEach((root) => {
    root.dataset.init = "";
    bindComponent(root, presentationApi);
    const enter = (target) => {
      const slides = slidesOf(root);
      slides.forEach((slide) => {
        const on = slide === target;
        slide.toggleAttribute("data-active", on);
        slide.inert = !on;
        slide.setAttribute("aria-hidden", String(!on));
        dfDollar32(slide).find("video[autoplay]").toArray().forEach((video) => {
          if (on) {
            video.currentTime = 0;
            video.play()?.catch(() => {});
          } else
            video.pause();
        });
      });
      dfDollar32(target).find("[data-count]").toArray().forEach((el) => animateCount(el));
      dfDollar32(target).find("[data-df-entrance]").toArray().forEach((el) => {
        entrance(el);
      });
      dfDollar32(target).find("[data-df-draw]").toArray().forEach((el) => {
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
    const activate = (index, forward) => {
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
      const counter = dfDollar32(root).find(".presentation-counter").get(0);
      if (counter)
        counter.textContent = `${clamped + 1} / ${slides.length}`;
      const progress = dfDollar32(root).find("progress.presentation-progress").get(0);
      if (progress) {
        progress.setAttribute("max", String(slides.length));
        progress.setAttribute("value", String(clamped + 1));
      }
      const loop = root.hasAttribute("data-loop");
      const prev = dfDollar32(root).find('[data-presentation-action="prev"]').get(0) ?? null;
      const next = dfDollar32(root).find('[data-presentation-action="next"]').get(0) ?? null;
      if (prev)
        prev.disabled = clamped === 0 && !loop;
      if (next)
        next.disabled = clamped === slides.length - 1 && !loop;
      const pad = (n) => String(n).padStart(2, "0");
      const number = dfDollar32(slides[clamped]).find(".presentation-slide-number").get(0);
      if (number)
        number.textContent = `${pad(clamped + 1)}⁄${pad(slides.length)}`;
    };
    root._presentationActivate = activate;
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
          activate(root.hasAttribute("data-loop") ? (at + 1) % total : at + 1, true);
          break;
        case "prev":
          activate(root.hasAttribute("data-loop") && at === 0 ? total - 1 : at - 1, false);
          break;
        case "first":
          activate(0);
          break;
        case "last":
          activate(total - 1);
          break;
        case "notes":
          root.toggleAttribute("data-notes");
          break;
        case "fullscreen":
          triggerStateChange33(root, "fullscreen", { value: !root.hasAttribute("data-fullscreen") });
          break;
      }
    });
    bindKeyboard();
    bindHash();
    bindFullscreen();
    const hashId = decodeURIComponent(location.hash.slice(1));
    const hashIndex = hashId ? slidesOf(root).findIndex((s) => s.id === hashId) : -1;
    activate(hashIndex >= 0 ? hashIndex : coerceIndex(root.dataset.currentSlide, 0));
    applyScale();
  });
}
init33();
new MutationObserver(init33).observe(document, { childList: true, subtree: true });

// src/components/product-showcase/product-showcase.ts
var df$34 = defussGlobals();
var dfDollar33 = defussQuery();
var productShowcaseStates = ["default", "playing"];
function applyMarkup33(el, stateName) {
  dfDollar33(el).attr("data-state", stateName === "playing" ? "playing" : "default");
}
function triggerStateChange34(showcase, stateName, _config) {
  const video = dfDollar33(showcase).find("video").get(0);
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
var productShowcaseApi = componentState({
  component: "product-showcase",
  states: productShowcaseStates,
  apply: (showcase, state) => triggerStateChange34(showcase, state.name, state.config),
  read: (showcase, state) => {
    const playing = showcase.dataset.state === "playing";
    return {
      name: showcase.dataset.stateName || (playing ? "playing" : "default"),
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup33(el, state.name)
});
df$34.productShowcaseApi = productShowcaseApi;
df$34.productShowcaseStates = productShowcaseStates;
function init34() {
  dfDollar33(".mk-showcase:not([data-init])").toArray().forEach((showcase) => {
    showcase.dataset.init = "";
    showcase.dataset.state = "default";
    bindComponent(showcase, productShowcaseApi);
    dfDollar33(showcase).find(".mk-showcase-play").get(0)?.addEventListener("click", () => {
      productShowcaseApi.setState(showcase, "playing");
    });
    dfDollar33(showcase).find("video").get(0)?.addEventListener("pause", () => {
      if (showcase.dataset.state === "playing")
        productShowcaseApi.setState(showcase, "default");
    });
  });
}
init34();
new MutationObserver(init34).observe(document, { childList: true, subtree: true });

// src/components/progress/progress.ts
var df$35 = defussGlobals();
var dfDollar34 = defussQuery();
var progressStates = ["default", "indeterminate", "complete"];
var SELECTOR = "progress.progress";
var reducedMotion5 = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var maxOf = (el) => el.max || 1;
var clamp2 = (el, v) => Math.max(0, Math.min(maxOf(el), Number(v) || 0));
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
    dfDollar34(`output.progress-value[for~="${CSS.escape(el.id)}"]`).toArray().forEach((o) => outs.add(o));
  dfDollar34(el).closest(".progress-field").find(".progress-value").toArray().forEach((o) => {
    if (!o.htmlFor?.value || el.id && o.htmlFor.contains(el.id))
      outs.add(o);
  });
  return [...outs];
}
function paint3(el) {
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
  paint3(el);
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
  if (!(duration > 0) || reducedMotion5() || from === to)
    return commit(el, to);
  const t0 = performance.now();
  el.dataset.stateName = "default";
  el.toggleAttribute("data-running", true);
  const frame = (now) => {
    const k = Math.min(1, (now - t0) / duration);
    if (k < 1) {
      el.value = round(from + (to - from) * k);
      paint3(el);
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
function applyMarkup34(el, stateName, config) {
  const authored = el.position < 0 ? null : el.value;
  if (config?.max != null && Number(config.max) !== el.max)
    el.max = Number(config.max);
  if (stateName === "indeterminate")
    dfDollar34(el).attr("value", null);
  else
    el.value = stateName === "complete" ? maxOf(el) : clamp2(el, config?.value != null ? config.value : authored ?? 0);
  const indeterminate = el.position < 0;
  const pct = indeterminate ? 0 : el.value / maxOf(el);
  dfDollar34(el).attr("data-level", pct < 0.34 ? "low" : pct < 0.67 ? "mid" : "high");
  dfDollar34(el).attr("data-complete", !indeterminate && el.value >= maxOf(el) ? "" : null);
  const live = el.id ? dfDollar34("#" + CSS.escape(el.id)).get(0) : null;
  const spoken = (live ? outputsOf(live) : []).filter((out) => out.dataset.format === "fraction" || out.dataset.template).map((out) => text(out, el))[0];
  dfDollar34(el).attr("aria-valuetext", spoken || null);
}
function triggerStateChange35(el, stateName, config) {
  switch (stateName) {
    case "default": {
      if (config.max != null && Number(config.max) !== el.max)
        el.max = Number(config.max);
      const to = config.value != null ? clamp2(el, config.value) : clamp2(el, el._authored ?? 0);
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
      paint3(el);
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
  apply: (el, state) => triggerStateChange35(el, state.name, state.config),
  read: (el, state) => {
    const indeterminate = el.position < 0;
    return {
      name: el.dataset.stateName || "default",
      config: { ...state.config, value: indeterminate ? null : el.value, max: el.max, percent: indeterminate ? null : el.value / maxOf(el) }
    };
  },
  markup: (el, state) => applyMarkup34(el, state.name, state.config)
});
df$35.progressApi = progressApi;
df$35.progressStates = progressStates;
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
function init35() {
  dfDollar34(`${SELECTOR}:not([data-init])`).toArray().forEach((el) => {
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
    paint3(el);
  });
}
if (!("commandForElement" in HTMLButtonElement.prototype) && !document.__progressCommandInit) {
  document.__progressCommandInit = true;
  document.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest('button[commandfor][command^="--"]') : null;
    const el = btn && dfDollar34("#" + CSS.escape(btn.getAttribute("commandfor"))).get(0);
    if (el?.matches(`${SELECTOR}[data-init]`))
      run(el, btn.getAttribute("command").slice(2));
  });
}
new MutationObserver((records) => {
  for (const r of records) {
    const el = r.target;
    if (el instanceof HTMLProgressElement && el.matches(`${SELECTOR}[data-init]`) && !el._raf) {
      paint3(el);
      el.dataset.stateName = el.position < 0 ? "indeterminate" : el.value >= maxOf(el) ? "complete" : "default";
    }
  }
}).observe(document, { attributes: true, subtree: true, attributeFilter: ["value", "max"] });
init35();
new MutationObserver(init35).observe(document, { childList: true, subtree: true });

// src/components/property-grid/property-grid.ts
var df$36 = defussGlobals();
var dfDollar35 = defussQuery();
var propertyGridStates = ["default", "editing"];
var isGroup = (v) => v !== null && typeof v === "object";
var pathKey = (path) => path.join(".");
var toPath = (path) => Array.isArray(path) ? path.map(String) : String(path).split(".").filter((s) => s !== "");
var clone = (v) => v === undefined ? undefined : structuredClone(v);
var configOf4 = (root) => root._config ?? root.store?.value.config ?? {};
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
function typeOf(value, conf) {
  if (conf?.type)
    return conf.type;
  if (conf?.options)
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
function confOf(root, path) {
  const sc = optionsOf(root).sourceConfig ?? {};
  return sc[pathKey(path)] ?? sc[path[path.length - 1]] ?? null;
}
function fill(cell, content) {
  if (content == null || content === false)
    return false;
  dfDollar35(cell).empty();
  if (content instanceof Node)
    dfDollar35(cell).append(content);
  else
    dfDollar35(cell).text(String(content));
  return true;
}
function defaultValue(cell, value, type) {
  dfDollar35(cell).empty();
  const span = document.createElement("span");
  if (type === "object" || type === "array") {
    span.className = "property-grid-summary";
    const n = Object.keys(value).length;
    dfDollar35(span).text(type === "array" ? `[${n} ${n === 1 ? "item" : "items"}]` : `{${n} ${n === 1 ? "property" : "properties"}}`);
  } else if (type === "boolean") {
    span.className = "property-grid-bool";
    span.dataset.value = String(value);
    dfDollar35(span).text(String(value));
  } else if (type === "color") {
    span.className = "property-grid-color";
    const swatch = document.createElement("i");
    swatch.className = "property-grid-swatch";
    swatch.style.background = value;
    swatch.setAttribute("aria-hidden", "true");
    dfDollar35(span).append(swatch).append(document.createTextNode(value));
  } else if (type === "json") {
    span.className = "property-grid-summary";
    dfDollar35(span).text(JSON.stringify(value));
  } else if (type === "null") {
    span.className = "property-grid-null";
    dfDollar35(span).text("null");
  } else {
    dfDollar35(span).text(String(value ?? ""));
  }
  dfDollar35(cell).append(span);
}
function rowsOf(root, source) {
  const out = [];
  const collapsed = new Set(configOf4(root).collapsed ?? []);
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
function renderRows2(root) {
  const { source = {} } = configOf4(root);
  const opts = optionsOf(root);
  let table = dfDollar35(root).children(".property-grid-table").get(0);
  const focused = table?.contains(document.activeElement) ? document.activeElement.closest("tr")?.dataset.path : null;
  if (!table) {
    table = document.createElement("table");
    table.className = "property-grid-table";
    const head = document.createElement("thead");
    const tr = document.createElement("tr");
    for (const [label, cls] of [[root.dataset.keyLabel || "Property", "property-grid-key"], [root.dataset.valueLabel || "Value", "property-grid-value"]]) {
      const th = document.createElement("th");
      th.scope = "col";
      th.className = cls;
      dfDollar35(th).text(label);
      tr.append(th);
    }
    head.append(tr);
    if (root.hasAttribute("data-headless"))
      head.hidden = true;
    table.append(head, document.createElement("tbody"));
    dfDollar35(root).append(table);
  }
  const body = dfDollar35(table).children("tbody").get(0);
  dfDollar35(body).empty();
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
      dfDollar35(keyText).text(row.conf?.displayName ?? row.key);
    if (row.group) {
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "property-grid-toggle";
      const open = !(configOf4(root).collapsed ?? []).includes(tr.dataset.path);
      toggle.setAttribute("aria-expanded", String(open));
      toggle.tabIndex = -1;
      dfDollar35(toggle).append(keyText);
      dfDollar35(keyCell).append(toggle);
    } else {
      dfDollar35(keyCell).append(keyText);
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
    dfDollar35(td).text(root.dataset.emptyText || "No properties.");
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
var focusTargets = (root) => dfDollar35(root).find(".property-grid-table > tbody > tr").toArray().map((tr) => tr.classList.contains("property-grid-group") ? dfDollar35(tr).find(".property-grid-toggle").get(0) : dfDollar35(tr).children(".property-grid-value").get(0)).filter(Boolean);
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
function defaultEditor(type, value, conf) {
  let el;
  if (type === "boolean") {
    el = document.createElement("input");
    el.type = "checkbox";
    el.className = "switch";
    el.setAttribute("role", "switch");
    el.checked = !!value;
    return { el, getValue: () => el.checked, immediate: true };
  }
  if (type === "enum") {
    el = document.createElement("select");
    el.className = "select";
    el.dataset.size = "xs";
    for (const opt of conf?.options ?? []) {
      const o = document.createElement("option");
      const [v, label] = isGroup(opt) ? [opt.value, opt.label ?? opt.value] : [opt, opt];
      o.value = String(v);
      dfDollar35(o).text(String(label));
      if (v === value)
        o.selected = true;
      el.append(o);
    }
    const values = (conf?.options ?? []).map((o) => isGroup(o) ? o.value : o);
    return { el, getValue: () => values.find((v) => String(v) === el.value) ?? el.value, immediate: true };
  }
  if (type === "text" || type === "object" || type === "array" || type === "json") {
    el = document.createElement("textarea");
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
  el = document.createElement("input");
  el.className = type === "color" ? "property-grid-color-input" : "input";
  if (type !== "color")
    el.dataset.size = "xs";
  el.type = type === "number" ? "number" : type === "color" ? "color" : type === "date" ? "date" : "text";
  if (type === "number") {
    el.step = conf?.step ?? "any";
    if (conf?.min != null)
      el.min = conf.min;
    if (conf?.max != null)
      el.max = conf.max;
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
function editorFor(root, row, value) {
  const conf = confOf(root, row._path);
  const type = row.dataset.type;
  const ctx = { path: [...row._path], type, config: conf, source: configOf4(root).source, grid: root };
  const custom = optionsOf(root).getEditorFn?.(row._path[row._path.length - 1], value, ctx);
  if (custom === false)
    return null;
  if (custom instanceof HTMLElement) {
    const el = custom;
    return { el, immediate: el.type === "checkbox" || el.tagName === "SELECT", getValue: () => el.type === "checkbox" ? el.checked : el.type === "number" || el.type === "range" ? el.valueAsNumber : el.value };
  }
  if (custom && custom.el)
    return custom;
  return defaultEditor(type, value, conf);
}
function openEditor(root, path) {
  closeEditor(root);
  const row = dfDollar35(root).find(".property-grid-table > tbody > tr").toArray().find((tr) => tr.dataset.path === path);
  if (!row || row.hasAttribute("data-readonly"))
    return false;
  const cell = dfDollar35(row).children(".property-grid-value").get(0);
  const value = getAt(configOf4(root).source, row._path);
  const editor = editorFor(root, row, value);
  if (!editor)
    return false;
  const wrap = document.createElement("div");
  wrap.className = "property-grid-editor";
  dfDollar35(wrap).append(editor.el);
  cell.dataset.editing = "";
  dfDollar35(cell).empty().append(wrap);
  root._editor = { path, row, cell, editor, value };
  const target = editor.el.matches?.("input, select, textarea, button, [tabindex]") ? editor.el : dfDollar35(editor.el).find("input, select, textarea, button, [tabindex]").get(0) ?? editor.el;
  (editor.focus ?? (() => target.focus?.()))();
  if (target.select && target.type !== "checkbox" && target.type !== "color" && target.type !== "date")
    target.select();
  return true;
}
function ruleProblem(conf, value) {
  if (!conf)
    return "";
  const say = (fallback) => conf.message || fallback;
  const empty = value === null || value === undefined || value === "" || Array.isArray(value) && !value.length;
  if (conf.required && empty)
    return say("Required");
  if (empty)
    return "";
  if (typeof value === "number") {
    if (Number.isNaN(value))
      return say("Not a number");
    if (conf.integer && !Number.isInteger(value))
      return say("Must be a whole number");
    if (conf.min != null && value < conf.min)
      return say(`Must be at least ${conf.min}`);
    if (conf.max != null && value > conf.max)
      return say(`Must be at most ${conf.max}`);
  }
  if (typeof value === "string") {
    if (conf.minLength != null && value.length < conf.minLength)
      return say(`At least ${conf.minLength} characters`);
    if (conf.maxLength != null && value.length > conf.maxLength)
      return say(`At most ${conf.maxLength} characters`);
    if (conf.pattern && !new RegExp(`^(?:${conf.pattern})$`).test(value))
      return say("Does not match the expected format");
  }
  if (Array.isArray(value)) {
    if (conf.minItems != null && value.length < conf.minItems)
      return say(`At least ${conf.minItems}`);
    if (conf.maxItems != null && value.length > conf.maxItems)
      return say(`At most ${conf.maxItems}`);
  }
  return "";
}
function showProblem(ed, control, problem) {
  control.setAttribute?.("aria-invalid", "true");
  const wrap = dfDollar35(ed.cell).children(".property-grid-editor").get(0) ?? ed.cell;
  let note = dfDollar35(wrap).children(".property-grid-error").get(0);
  if (!note) {
    note = document.createElement("div");
    note.className = "property-grid-error";
    note.setAttribute("role", "alert");
    note.id = `pg-error-${Math.random().toString(36).slice(2, 8)}`;
    dfDollar35(wrap).append(note);
    control.setAttribute?.("aria-describedby", note.id);
  }
  dfDollar35(note).text(problem);
}
function closeEditor(root) {
  if (!root._editor)
    return;
  root._editor = null;
  renderRows2(root);
}
function commit2(root, then = "stay") {
  const ed = root._editor;
  if (!ed)
    return true;
  const control = dfDollar35(ed.editor.el).find("input, select, textarea").get(0) ?? ed.editor.el;
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
    const answer = optionsOf(root).validateFn?.(key, value, { path: [...row._path], type: row.dataset.type, config: confOf(root, row._path), source: configOf4(root).source, grid: root });
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
  const before = new CustomEvent("property-grid-beforechange", { bubbles: true, cancelable: true, detail: { path, key, value, oldValue } });
  if (same || !root.dispatchEvent(before)) {
    root.api.setState("default", { editing: null });
    restoreFocus(root, path, then);
    return true;
  }
  const source = setAt(configOf4(root).source, row._path, value);
  root.api.setState("default", { source, editing: null });
  root.dispatchEvent(new CustomEvent("property-grid-change", { bubbles: true, detail: { path, key, value, oldValue, source: clone(source) } }));
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
function applyMarkup35(el, state) {
  dfDollar35(el).attr("data-editing", state.name === "editing" && state.config?.editing ? String(state.config.editing) : null);
}
function triggerStateChange36(root, state, incoming) {
  root._config = state.config ?? {};
  applyMarkup35(root, state);
  const rebuild = !dfDollar35(root).children(".property-grid-table").get(0) || "source" in (incoming ?? {}) || "collapsed" in (incoming ?? {});
  if (rebuild) {
    root._editor = null;
    renderRows2(root);
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
  apply: (root, state, _previous, incoming) => triggerStateChange36(root, state, incoming),
  markup: (el, state) => applyMarkup35(el, state)
});
df$36.propertyGridApi = propertyGridApi;
df$36.propertyGridStates = propertyGridStates;
var resolve8 = (target) => typeof target === "string" ? dfDollar35(target).get(0) : target;
df$36.propertyGrid = {
  configure(target, options = {}) {
    const root = resolve8(target);
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
      root.api.setState(root.store.value.name, { collapsed: configOf4(root).collapsed ?? [] });
    return root;
  },
  setSource(target, source) {
    const root = resolve8(target);
    if (!root)
      return;
    if (!root.api)
      root._pendingSource = clone(source ?? {});
    else
      root.api.setState("default", { source: clone(source ?? {}), editing: null, collapsed: [] });
  },
  getSource: (target) => clone(configOf4(resolve8(target)).source ?? {}),
  setProperty(target, path, value) {
    const root = resolve8(target);
    if (!root)
      return;
    const p = toPath(path);
    const oldValue = getAt(configOf4(root).source, p);
    const source = setAt(configOf4(root).source, p, clone(value));
    root.api.setState(root.store.value.name === "editing" ? "default" : root.store.value.name, { source, editing: null });
    root.dispatchEvent(new CustomEvent("property-grid-change", { bubbles: true, detail: { path: pathKey(p), key: p[p.length - 1], value: clone(value), oldValue, source: clone(source) } }));
  },
  getProperty: (target, path) => clone(getAt(configOf4(resolve8(target)).source, toPath(path))),
  edit: (target, path) => {
    resolve8(target)?.api.setState("editing", { editing: pathKey(toPath(path)) });
  },
  commit: (target) => commit2(resolve8(target)),
  cancel: (target) => {
    resolve8(target)?.api.setState("default", { editing: null });
  },
  expand(target, path) {
    const root = resolve8(target);
    const key = pathKey(toPath(path));
    root?.api.setState(root.store.value.name, { collapsed: (configOf4(root).collapsed ?? []).filter((p) => p !== key) });
  },
  collapse(target, path) {
    const root = resolve8(target);
    const key = pathKey(toPath(path));
    const collapsed = new Set(configOf4(root)?.collapsed ?? []);
    collapsed.add(key);
    root?.api.setState(root.store.value.name, { collapsed: [...collapsed] });
  }
};
function toggleGroup(root, path) {
  const collapsed = new Set(configOf4(root).collapsed ?? []);
  if (collapsed.has(path))
    collapsed.delete(path);
  else
    collapsed.add(path);
  root.api.setState("default", { collapsed: [...collapsed], editing: null });
}
function init36() {
  dfDollar35(".property-grid:not([data-init])").toArray().forEach((root) => {
    root.dataset.init = "";
    let source = root._pendingSource ?? {};
    const script = dfDollar35(root).children("script.property-grid-source").get(0);
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
    const conf = dfDollar35(root).children("script.property-grid-config").get(0);
    if (conf) {
      try {
        root._options = { ...root._options, sourceConfig: JSON.parse(conf.textContent || "{}") };
      } catch (error) {
        console.error("[property-grid] invalid config JSON", error);
      }
    }
    if (!root.getAttribute("role"))
      root.setAttribute("role", "group");
    dfDollar35(root).on("click", (e) => {
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
    dfDollar35(root).on("keydown", (e) => {
      const t = e.target;
      if (root._editor && root._editor.cell.contains(t)) {
        if (e.key === "Escape") {
          e.preventDefault();
          e.stopPropagation();
          const { path } = root._editor;
          root.api.setState("default", { editing: null });
          restoreFocus(root, path, "stay");
        } else if (e.key === "Enter" && (!(root._editor.editor.multiline || root._editor.editor.ownsEnter) || e.metaKey || e.ctrlKey)) {
          e.preventDefault();
          commit2(root);
        } else if (e.key === "Tab") {
          const targets = focusTargets(root);
          const at = targets.findIndex((x) => x.closest("tr") === root._editor.row);
          const edge = e.shiftKey ? at <= 0 : at >= targets.length - 1;
          if (!edge)
            e.preventDefault();
          commit2(root, edge ? "none" : e.shiftKey ? "prev" : "next");
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
        const open = !(configOf4(root).collapsed ?? []).includes(row.dataset.path);
        if (e.key === "ArrowLeft" && open || e.key === "ArrowRight" && !open || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          toggleGroup(root, row.dataset.path);
        }
      } else if ((e.key === "Enter" || e.key === "F2") && !row.hasAttribute("data-readonly")) {
        e.preventDefault();
        root.api.setState("editing", { editing: row.dataset.path });
      }
    });
    dfDollar35(root).on("change", (e) => {
      if (root._editor?.editor.immediate && root._editor.cell.contains(e.target))
        commit2(root, "stay");
    });
    dfDollar35(root).on("focusout", (e) => {
      const ed = root._editor;
      if (!ed || !ed.cell.contains(e.target) || ed.cell.contains(e.relatedTarget))
        return;
      setTimeout(() => {
        if (root._editor === ed && !ed.cell.contains(document.activeElement))
          commit2(root, "none");
      }, 0);
    });
    bindComponent(root, propertyGridApi, { name: "default", config: { source, editing: null, collapsed: [] } });
    triggerStateChange36(root, { name: "default", config: { source, editing: null, collapsed: [] } }, { source });
  });
}
init36();
new MutationObserver(init36).observe(document, { childList: true, subtree: true });

// src/components/questionnaire/questionnaire.ts
var df$37 = defussGlobals();
var dfDollar36 = defussQuery();
var questionnaireStates = ["default", "answering", "review", "submitted"];
var LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
var stepsOf = (root) => dfDollar36(root).find(".questionnaire-step[data-step]").toArray();
var stepById = (root, id) => root._flow?.byId.get(id) ?? null;
var titleOf = (step) => (dfDollar36(step).find(".questionnaire-title").get(0)?.textContent ?? step.dataset.step).trim();
var controlsOf = (step) => dfDollar36(step).find("input[name], select[name], textarea[name]").toArray().filter((c) => c.type !== "hidden" || c.dataset.answer !== undefined);
var isEnd = (step) => !!step && step.hasAttribute("data-end");
function rulesOf(root) {
  let authored = {};
  const script = dfDollar36(root).find("script.questionnaire-rules").get(0);
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
var operand = (value, answers) => value && typeof value === "object" && !Array.isArray(value) && ("field" in value) ? answers[value.field] : value;
var lower2 = (v) => String(v ?? "").toLowerCase();
function compare(a, b) {
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
  const target = operand(cond.value, answers);
  switch (cond.op) {
    case "answered":
      return !isEmpty(v);
    case "empty":
      return isEmpty(v);
    case "neq":
      return Array.isArray(v) ? !v.includes(target) : lower2(v) !== lower2(target);
    case "gt":
      return !isEmpty(v) && !isEmpty(target) && compare(v, target) > 0;
    case "gte":
      return !isEmpty(v) && !isEmpty(target) && compare(v, target) >= 0;
    case "lt":
      return !isEmpty(v) && !isEmpty(target) && compare(v, target) < 0;
    case "lte":
      return !isEmpty(v) && !isEmpty(target) && compare(v, target) <= 0;
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
  for (const control of controlsOf(step)) {
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
function nextOf(root, stepId, answers) {
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
  const radios = controlsOf(step).filter((c) => c.type === "radio");
  for (const c of controlsOf(step)) {
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
  const label = control.closest("label") || control.id && dfDollar36(`label[for="${CSS.escape(control.id)}"]`).get(0);
  if (!label)
    return control.value;
  const own = dfDollar36(label).find(".questionnaire-choice-label").get(0);
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
      stack.push(nextOf(root, id, answers));
    else
      for (const e of edgesOf(root, step))
        stack.push(e.to);
  }
  return seen;
}
var answeredStep = (step, answers) => {
  const names = [...new Set(controlsOf(step).map((c) => c.name))];
  return names.length === 0 || names.some((n) => !isEmpty(answers[n]));
};
function readStep(step) {
  const out = {};
  const groups = new Map;
  for (const c of controlsOf(step)) {
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
  for (const c of controlsOf(step)) {
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
  for (const c of controlsOf(step))
    delete next[c.name];
  writeStep(step, next);
  return next;
}
function invalidOf(root, step, answers) {
  for (const c of controlsOf(step)) {
    if (!c.checkValidity())
      return { control: c, message: c.validationMessage };
  }
  const boxes = controlsOf(step).filter((c) => c.type === "checkbox");
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
        return { control: rule.field ? controlsOf(step).find((c) => c.name === rule.field) : null, message: rule.message || "Check this answer." };
    }
  } else if (typeof rules === "function") {
    const message = rules(answers, readStep(step));
    if (message)
      return { control: null, message: String(message) };
  }
  return null;
}
function errorEl(step) {
  let el = dfDollar36(step).find(".questionnaire-error").get(0);
  if (!el) {
    el = document.createElement("p");
    el.className = "questionnaire-error";
    el.id = `${step.closest(".questionnaire").id || "questionnaire"}-${step.dataset.step}-error`;
    el.setAttribute("role", "alert");
    el.hidden = true;
    dfDollar36(step).append(el);
  }
  return el;
}
function showInvalid(step, problem) {
  const el = errorEl(step);
  el.textContent = problem.message;
  el.hidden = false;
  step.setAttribute("aria-invalid", "true");
  step.setAttribute("aria-describedby", el.id);
  const target = problem.control || controlsOf(step)[0];
  if (target) {
    target.setAttribute("aria-invalid", "true");
    target.focus({ preventScroll: false });
  }
}
function clearInvalid(step) {
  const el = dfDollar36(step).find(".questionnaire-error").get(0);
  if (el) {
    el.hidden = true;
    el.textContent = "";
  }
  step.removeAttribute("aria-invalid");
  for (const c of controlsOf(step))
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
function applyMarkup36(root, state) {
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
    dfDollar36(s).attr("hidden", !submitted && s === step ? null : "");
  for (const block of dfDollar36(root).find(".questionnaire-block").toArray()) {
    dfDollar36(block).attr("hidden", !submitted && step && block.contains(step) ? null : "");
  }
  const button = (name) => dfDollar36(root).find(`[data-questionnaire="${name}"]`).toArray();
  const end = isEnd(step);
  for (const b of button("back"))
    dfDollar36(b).attr("hidden", submitted || state.name === "default" ? "" : null);
  for (const b of button("next"))
    dfDollar36(b).attr("hidden", submitted || end ? "" : null);
  for (const b of button("submit"))
    dfDollar36(b).attr("hidden", submitted || !end ? "" : null);
  for (const b of button("skip"))
    dfDollar36(b).attr("hidden", submitted || !step?.hasAttribute("data-optional") ? "" : null);
  for (const n of dfDollar36(root).find(".questionnaire-actions").toArray())
    dfDollar36(n).attr("hidden", submitted ? "" : null);
  for (const c of dfDollar36(root).find(".questionnaire-complete").toArray())
    dfDollar36(c).attr("hidden", submitted ? null : "");
  dfDollar36(root).attr("data-state", state.name);
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
  const host = dfDollar36(root).find(".questionnaire-progress").get(0);
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
  const bar = dfDollar36(host).find(".questionnaire-bar").get(0);
  bar.value = percent;
  bar.setAttribute("aria-label", `${percent}% done`);
  const label = dfDollar36(host).find(".questionnaire-progress-label").get(0);
  const branchy = remainingBranches(root, walk.step);
  label.textContent = walk.submitted ? "Done" : endNow ? "Review your answers" : `Question ${done + 1} of ${branchy ? "about " : ""}${total}`;
  const currentBlock = stepById(root, walk.step)?.closest(".questionnaire-block")?.dataset.block;
  const visitedBlocks = new Set(walk.history.slice(0, walk.index).map((id) => stepById(root, id)?.closest(".questionnaire-block")?.dataset.block));
  for (const chip of dfDollar36(host).find(".questionnaire-block-chip").toArray()) {
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
  const host = dfDollar36(root).find(".questionnaire-trail").get(0) || root.id && dfDollar36(`.questionnaire-trail[data-for="${CSS.escape(root.id)}"]`).get(0);
  if (!host)
    return;
  if (!root.contains(host) && !host._wired) {
    host._wired = true;
    host.addEventListener("click", (e) => {
      const go = e.target.closest?.("[data-questionnaire-go]")?.dataset.questionnaireGo;
      if (go)
        goTo2(root, go);
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
    a.textContent = answerText(root, step, walk.answers) || (walk.skipped.includes(id) ? "Skipped" : "—");
    button.append(q, a);
    li.append(button);
    list.append(li);
  });
  host.append(list);
}
function answerText(root, step, answers) {
  const parts = [];
  const names = [...new Set(controlsOf(step).map((c) => c.name))];
  for (const name of names) {
    const v = answers[name];
    if (isEmpty(v))
      continue;
    const controls = controlsOf(step).filter((c) => c.name === name);
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
  const host = step && dfDollar36(step).find(".questionnaire-summary").get(0);
  if (!host)
    return;
  host.textContent = "";
  const list = document.createElement("dl");
  list.className = "questionnaire-summary-list";
  for (const id of walk.history.slice(0, walk.index)) {
    const s = stepById(root, id);
    if (!s || isEnd(s) || !controlsOf(s).length)
      continue;
    const row = document.createElement("div");
    row.className = "questionnaire-summary-row";
    const dt = document.createElement("dt");
    dt.textContent = titleOf(s);
    const dd = document.createElement("dd");
    const text = document.createElement("span");
    text.textContent = answerText(root, s, walk.answers) || "Skipped";
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
  let host = dfDollar36(root).find(".questionnaire-notice").get(0);
  if (!host) {
    host = document.createElement("div");
    host.className = "questionnaire-notice";
    host.setAttribute("role", "status");
    const first = dfDollar36(root).find(".questionnaire-block, .questionnaire-step").get(0);
    if (first)
      dfDollar36(first).before(host);
    else
      dfDollar36(root).append(host);
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
    const choices = dfDollar36(step).find(".questionnaire-choice").toArray();
    choices.forEach((choice, i) => {
      if (!choice.dataset.key)
        choice.dataset.key = root.dataset.shortcuts === "digits" ? String(i + 1) : LETTERS[i] ?? "";
    });
  }
}
function paint4(root) {
  renderProgress(root);
  renderTrail(root);
  renderSummary(root);
}
function record(root, name) {
  const walk = cfgOf(root);
  const config = { step: walk.step, answers: walk.answers, history: walk.history, index: walk.index, skipped: walk.skipped };
  if (root.store)
    questionnaireApi.commit(root, name ?? landed(root, walk), config);
  if (root._draft)
    root._draft.set(walk.submitted ? null : config);
}
function show2(root, id, focus = true) {
  const walk = cfgOf(root);
  const step = stepById(root, id);
  if (!step)
    return;
  walk.step = id;
  walk.entered = readStep(step);
  const name = landed(root, walk);
  applyMarkup36(root, { name, config: { step: id } });
  root.dataset.stateName = name;
  clearInvalid(step);
  paint4(root);
  if (focus) {
    const target = controlsOf(step).find((c) => c.type !== "radio" || c.checked) || controlsOf(step)[0] || dfDollar36(root).find('[data-questionnaire="submit"]').get(0);
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
      root.dispatchEvent(new CustomEvent("questionnaire-invalid", { bubbles: true, detail: { step: walk.step, message: problem.message } }));
      return false;
    }
  }
  clearInvalid(step);
  const skipped = skip ? [...new Set([...walk.skipped, walk.step])] : walk.skipped.filter((s) => s !== walk.step);
  const was = mergeAnswers({}, walk.entered || {});
  const now = mergeAnswers({}, skip ? {} : mine);
  const changed = Object.keys({ ...was, ...now }).filter((k) => JSON.stringify(was[k]) !== JSON.stringify(now[k]));
  const to = skip ? defaultNext(root, step) : nextOf(root, walk.step, answers);
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
      if (s !== step && deps.some((d) => changed.includes(d)) && answeredStep(s, answers) && controlsOf(s).length) {
        answers = clearStep(s, answers);
        cleared.push(s.dataset.step);
      }
    }
    const path = reachable(root, answers, skipped);
    for (const s of root._flow.steps) {
      const id = s.dataset.step;
      if (path.has(id) || !controlsOf(s).length || !answeredStep(s, answers) || cleared.includes(id))
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
    root.dispatchEvent(new CustomEvent("questionnaire-invalidate", { bubbles: true, detail: { cause: walk.step, changed, cleared } }));
  } else
    notify(root, "");
  show2(root, to);
  record(root);
  root.dispatchEvent(new CustomEvent("questionnaire-step", { bubbles: true, detail: { step: to, from: history[walk.index - 1], answers } }));
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
  show2(root, walk.history[walk.index]);
  record(root);
  return true;
}
function goTo2(root, id) {
  const walk = cfgOf(root);
  const at = walk.history.indexOf(id);
  if (at < 0)
    return false;
  walk.index = at;
  show2(root, id);
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
  show2(root, root._flow.start);
  record(root, "default");
}
async function submit(root) {
  const walk = cfgOf(root);
  if (!isEnd(stepById(root, walk.step)))
    return advance(root);
  const path = new Set(walk.history.slice(0, walk.index + 1));
  const names = new Set(root._flow.steps.filter((s) => path.has(s.dataset.step)).flatMap((s) => controlsOf(s).map((c) => c.name)));
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
  applyMarkup36(root, { name: "submitted", config: { step: walk.step } });
  root.dataset.stateName = "submitted";
  notify(root, "");
  paint4(root);
  record(root, "submitted");
  root.dispatchEvent(new CustomEvent("questionnaire-submit", { bubbles: true, detail: { answers, history: walk.history.slice(0, walk.index + 1) } }));
  return true;
}
function triggerStateChange37(root, state, incoming) {
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
        go(nextOf(root, walk.step, walk.answers) || defaultNext(root, stepById(root, walk.step)));
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
  applyMarkup36(root, { name, config: { step: walk.step } });
  root.dataset.stateName = name;
  paint4(root);
  if (root._draft)
    root._draft.set(walk.submitted ? null : { step: walk.step, answers: walk.answers, history: walk.history, index: walk.index, skipped: walk.skipped });
}
var questionnaireApi = componentState({
  component: "questionnaire",
  states: questionnaireStates,
  mergeConfig: true,
  apply: (root, state, _previous, incoming) => triggerStateChange37(root, state, incoming),
  read: (root, state) => {
    const walk = cfgOf(root);
    if (!walk)
      return state;
    return { name: landed(root, walk), config: { ...state.config, step: walk.step, answers: walk.answers, history: walk.history, index: walk.index, skipped: walk.skipped } };
  },
  markup: (el, state) => applyMarkup36(el, state)
});
df$37.questionnaireApi = questionnaireApi;
df$37.questionnaireStates = questionnaireStates;
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
    for (const c of controlsOf(s))
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
    const required = (id) => controlsOf(stepById(root, id)).filter((c) => c.required).map((c) => c.name);
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
  const nodes = steps.map((s) => ({ id: s.dataset.step, title: titleOf(s), end: isEnd(s), block: s.closest(".questionnaire-block")?.dataset.block || "" }));
  const list = [...edges].flatMap(([from, l]) => l.map((e) => ({ from, ...e })));
  return { ok: errors.length === 0, errors: [...new Set(errors)], warnings: [...new Set(warnings)], nodes, edges: list };
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
  const diagram = df$37.diagram;
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
    root.dispatchEvent(new CustomEvent("questionnaire-jump-refused", { bubbles: true, detail: { to, step: walk.step, reason } }));
  };
  const onActivate = (e) => {
    if (syncing)
      return;
    const walk = cfgOf(root);
    const to = e.detail?.kind === "node" ? e.detail.ref : null;
    if (!walk || !to || to === walk.step)
      return void focus();
    if (walk.history.includes(to))
      return void goTo2(root, to);
    const step = stepById(root, walk.step);
    const answers = step && !isEnd(step) ? mergeAnswers(walk.answers, readStep(step)) : walk.answers;
    if (to === nextOf(root, walk.step, answers)) {
      if (!advance(root))
        refuse(to, "invalid");
      return;
    }
    refuse(to, "unreached");
  };
  dfDollar36(figure).on("diagram-activate", onActivate);
  const off = root.store.subscribe(draw);
  draw();
  const unlink = () => {
    off?.();
    dfDollar36(figure).off("diagram-activate", onActivate);
    delete figure._questionnaireUnlink;
  };
  figure._questionnaireUnlink = unlink;
  return unlink;
}
var resolve9 = (target) => typeof target === "string" ? dfDollar36(target).get(0) : target;
df$37.questionnaire = {
  configure(target, config = {}) {
    const root = resolve9(target);
    root._config = { ...root._config, ...config };
    if (root._flow)
      root._flow.rules = rulesOf(root);
    if (config.persist && root._walk)
      attachDraft(root, config.persist);
  },
  next: (target) => advance(resolve9(target)),
  back: (target) => back(resolve9(target)),
  skip: (target) => advance(resolve9(target), { skip: true }),
  goTo: (target, id) => goTo2(resolve9(target), id),
  restart: (target) => restart(resolve9(target)),
  submit: (target) => submit(resolve9(target)),
  answers: (target) => ({ ...cfgOf(resolve9(target))?.answers }),
  history: (target) => {
    const walk = cfgOf(resolve9(target));
    return walk ? walk.history.slice(0, walk.index + 1) : [];
  },
  nextOf: (target, stepId, answers) => nextOf(resolve9(target), stepId, answers ?? cfgOf(resolve9(target)).answers),
  analyze: (target) => analyze(resolve9(target)),
  toMermaid: (target) => toMermaid(resolve9(target)),
  toDiagram: (target, options) => toDiagram(resolve9(target), options),
  linkDiagram: (target, figure) => linkDiagram(resolve9(target), resolve9(figure))
};
function attachDraft(root, config) {
  root._draft?.destroy();
  const where = viewPersistence(root, "questionnaire", String(dfDollar36(".questionnaire").toArray().indexOf(root)), config || {});
  root._draft = where ? persisted(where.key, null, { area: where.area, validate: (v) => v === null || typeof v === "object" && !Array.isArray(v) }) : null;
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
    const live = dfDollar36(".questionnaire[data-init]").toArray().filter((q) => q._walk && !q._walk.submitted && q.checkVisibility());
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
  const choice = dfDollar36(step).find(".questionnaire-choice").toArray().find((c) => c.dataset.key?.toLowerCase() === key);
  if (choice)
    input = dfDollar36(choice).find('input[type="radio"], input[type="checkbox"]').get(0);
  else if (/^[1-9]$/.test(key) && !dfDollar36(step).find(".questionnaire-choice").get(0)) {
    input = dfDollar36(step).find('input[type="radio"]').toArray()[Number(key) - 1] ?? null;
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
function init37() {
  dfDollar36(".questionnaire:not([data-init])").toArray().forEach((root) => {
    root.dataset.init = "";
    readFlow(root);
    if (!root._flow.steps.length)
      return;
    root.setAttribute("novalidate", "");
    keyHints(root);
    root._walk = { step: root._flow.start, answers: {}, history: [root._flow.start], index: 0, skipped: [], submitted: false };
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
        return goTo2(root, go);
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
        const choice = holder && dfDollar36(holder).find('input[type="radio"], input[type="checkbox"]').get(0);
        if (choice)
          choice.checked = true;
      }
      cfgOf(root).answers = mergeAnswers(cfgOf(root).answers, readStep(step));
      clearInvalid(step);
      record(root);
      if (e.type === "change" && e.target.type === "radio" && root.hasAttribute("data-auto-advance") && controlsOf(step).every((c) => c.type === "radio")) {
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
    bindComponent(root, questionnaireApi, { name: "default", config: { step: root._flow.start, answers: {}, history: [root._flow.start], index: 0, skipped: [] } });
    show2(root, root._walk.step, false);
    record(root);
    if (restored)
      notify(root, "Your answers from earlier are back.", { name: "restart", label: "Start over" });
  });
}
init37();
new MutationObserver(init37).observe(document, { childList: true, subtree: true });

// src/components/radial-progress/radial-progress.ts
var df$38 = defussGlobals();
var dfDollar37 = defussQuery();
var radialProgressStates = ["default", "indeterminate", "complete"];
var SELECTOR2 = ".radial-progress";
var reducedMotion6 = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var maxOf2 = (el) => parseFloat(el.getAttribute("aria-valuemax") || "") || 100;
var valueOf2 = (el) => el.hasAttribute("aria-valuenow") ? parseFloat(el.getAttribute("aria-valuenow")) || 0 : null;
var clamp3 = (el, v) => Math.max(0, Math.min(maxOf2(el), Number(v) || 0));
var round2 = (v) => Math.round(v * 10) / 10;
var formats2 = new Map;
var fmtFor2 = (node) => {
  const locale = textLocale(node);
  if (!formats2.has(locale)) {
    formats2.set(locale, {
      pct: new Intl.NumberFormat(locale, { style: "percent", maximumFractionDigits: 0 }),
      num: new Intl.NumberFormat(locale, { maximumFractionDigits: 1 })
    });
  }
  return formats2.get(locale);
};
function text2(el) {
  const { pct: pctFmt, num: numFmt } = fmtFor2(el);
  const v = valueOf2(el);
  const max = maxOf2(el);
  if (v == null)
    return el.dataset.indeterminate ?? "…";
  const tpl = el.dataset.template;
  if (tpl) {
    return tpl.replaceAll("{value}", numFmt.format(Math.round(v))).replaceAll("{max}", numFmt.format(max)).replaceAll("{percent}", pctFmt.format(v / max));
  }
  switch (el.dataset.format) {
    case "fraction":
      return `${numFmt.format(Math.round(v))} / ${numFmt.format(max)}`;
    case "value":
      return numFmt.format(Math.round(v));
    default:
      return pctFmt.format(v / max);
  }
}
function labelTarget(el) {
  const slot = dfDollar37(el).find(":scope > .radial-progress-value").get(0);
  if (slot)
    return slot;
  return el.children.length === 0 ? el : null;
}
function paint5(el) {
  const v = valueOf2(el);
  const pct = v == null ? 0 : v / maxOf2(el);
  if (v != null)
    el.style.setProperty("--value", String(round2(pct * 100)));
  else
    el.style.removeProperty("--value");
  el.dataset.level = pct < 0.34 ? "low" : pct < 0.67 ? "mid" : "high";
  el.toggleAttribute("data-complete", v != null && v >= maxOf2(el));
  const target = labelTarget(el);
  const t = text2(el);
  if (target)
    target.textContent = t;
  if (el.dataset.format === "fraction" || el.dataset.template)
    el.setAttribute("aria-valuetext", t);
  else if (!el._authorValuetext)
    el.removeAttribute("aria-valuetext");
}
function stopTween2(el) {
  if (el._raf)
    cancelAnimationFrame(el._raf);
  el._raf = 0;
  el.removeAttribute("data-running");
}
function setValue(el, v) {
  if (!el.hasAttribute("aria-valuemin"))
    el.setAttribute("aria-valuemin", "0");
  el.setAttribute("aria-valuenow", String(round2(v)));
  paint5(el);
}
function commit3(el, v) {
  const before = el.dataset.stateName;
  setValue(el, v);
  const done = v >= maxOf2(el);
  el.dataset.stateName = done ? "complete" : "default";
  el.dispatchEvent(new CustomEvent("progress:change", { bubbles: true, detail: { value: v, max: maxOf2(el), percent: v / maxOf2(el) } }));
  if (done && before !== "complete")
    el.dispatchEvent(new CustomEvent("progress:completed", { bubbles: true }));
}
function tween2(el, to, duration) {
  stopTween2(el);
  const from = valueOf2(el) ?? 0;
  if (!(duration > 0) || reducedMotion6() || from === to)
    return commit3(el, to);
  const t0 = performance.now();
  el.dataset.stateName = "default";
  el.setAttribute("data-running", "");
  const frame = (now) => {
    const k = Math.min(1, (now - t0) / duration);
    if (k < 1) {
      setValue(el, from + (to - from) * k);
      el._raf = requestAnimationFrame(frame);
    } else {
      stopTween2(el);
      commit3(el, to);
    }
  };
  el._raf = requestAnimationFrame(frame);
}
var stepOf2 = (el) => parseFloat(el.dataset.step || "") || maxOf2(el) / 10;
var durationOf2 = (el) => parseFloat(el.dataset.duration || "") || 3000;
function applyMarkup37(el, stateName, config) {
  const authored = valueOf2(el);
  el._authorValuetext = el.hasAttribute("aria-valuetext") && !el.dataset.format && !el.dataset.template;
  if (!el.hasAttribute("aria-valuemin"))
    dfDollar37(el).attr("aria-valuemin", "0");
  if (config?.max != null && Number(config.max) !== maxOf2(el))
    dfDollar37(el).attr("aria-valuemax", String(config.max));
  if (stateName === "indeterminate") {
    dfDollar37(el).attr("aria-valuenow", null);
    paint5(el);
  } else
    setValue(el, stateName === "complete" ? maxOf2(el) : clamp3(el, config?.value != null ? config.value : authored ?? 0));
}
function triggerStateChange38(el, stateName, config) {
  switch (stateName) {
    case "default": {
      if (config.max != null && Number(config.max) !== maxOf2(el))
        el.setAttribute("aria-valuemax", String(config.max));
      const to = clamp3(el, config.value != null ? config.value : el._authored ?? 0);
      if (config.duration > 0)
        tween2(el, to, config.duration);
      else {
        stopTween2(el);
        commit3(el, to);
      }
      break;
    }
    case "indeterminate":
      stopTween2(el);
      el.removeAttribute("aria-valuenow");
      paint5(el);
      el.dataset.stateName = "indeterminate";
      break;
    case "complete":
      if (config.duration > 0)
        tween2(el, maxOf2(el), config.duration);
      else {
        stopTween2(el);
        commit3(el, maxOf2(el));
      }
      break;
  }
}
var radialProgressApi = componentState({
  component: "radial-progress",
  states: radialProgressStates,
  apply: (el, state) => triggerStateChange38(el, state.name, state.config),
  read: (el, state) => {
    const v = valueOf2(el);
    return {
      name: el.dataset.stateName || "default",
      config: { ...state.config, value: v, max: maxOf2(el), percent: v == null ? null : v / maxOf2(el) }
    };
  },
  markup: (el, state) => applyMarkup37(el, state.name, state.config)
});
df$38.radialProgressApi = radialProgressApi;
df$38.radialProgressStates = radialProgressStates;
function run2(el, command) {
  const now = valueOf2(el) ?? 0;
  switch (command) {
    case "reset":
      radialProgressApi.setState(el, "default", { value: 0 });
      break;
    case "increment":
      radialProgressApi.setState(el, "default", { value: now + stepOf2(el) });
      break;
    case "decrement":
      radialProgressApi.setState(el, "default", { value: now - stepOf2(el) });
      break;
    case "complete":
      radialProgressApi.setState(el, "complete");
      break;
    case "indeterminate":
      radialProgressApi.setState(el, "indeterminate");
      break;
    case "play": {
      if (now >= maxOf2(el))
        setValue(el, 0);
      const rest = 1 - (valueOf2(el) ?? 0) / maxOf2(el);
      radialProgressApi.setState(el, "default", { value: maxOf2(el), duration: durationOf2(el) * rest });
      break;
    }
    case "pause": {
      const held = valueOf2(el) ?? 0;
      stopTween2(el);
      commit3(el, held);
      break;
    }
  }
}
var COMMANDS2 = ["reset", "increment", "decrement", "complete", "indeterminate", "play", "pause"];
function init38() {
  dfDollar37(`${SELECTOR2}:not([data-init])`).toArray().forEach((el) => {
    el.dataset.init = "";
    bindComponent(el, radialProgressApi);
    el._authorValuetext = el.hasAttribute("aria-valuetext") && !el.dataset.format && !el.dataset.template;
    if (!el.hasAttribute("aria-valuenow") && el.style.getPropertyValue("--value") !== "" && el.getAttribute("role") === "progressbar") {
      el.setAttribute("aria-valuenow", String(parseFloat(el.style.getPropertyValue("--value")) / 100 * maxOf2(el)));
    }
    if (!el.hasAttribute("role"))
      el.setAttribute("role", "progressbar");
    if (!el.hasAttribute("aria-valuemin"))
      el.setAttribute("aria-valuemin", "0");
    el._authored = valueOf2(el);
    const v = valueOf2(el);
    el.dataset.stateName = v == null ? "indeterminate" : v >= maxOf2(el) ? "complete" : "default";
    el.addEventListener("command", (e) => {
      const c = String(e.command || "");
      if (c.startsWith("--"))
        run2(el, c.slice(2));
    });
    for (const c of COMMANDS2)
      el.addEventListener(`progress:${c}`, () => run2(el, c));
    paint5(el);
  });
}
if (!("commandForElement" in HTMLButtonElement.prototype) && !document.__radialProgressCommandInit) {
  document.__radialProgressCommandInit = true;
  document.addEventListener("click", (e) => {
    const btn = e.target instanceof Element ? e.target.closest('button[commandfor][command^="--"]') : null;
    const el = btn && dfDollar37("#" + CSS.escape(btn.getAttribute("commandfor"))).get(0);
    if (el?.matches(`${SELECTOR2}[data-init]`))
      run2(el, btn.getAttribute("command").slice(2));
  });
}
new MutationObserver((records) => {
  for (const r of records) {
    const el = r.target;
    if (el instanceof HTMLElement && el.matches(`${SELECTOR2}[data-init]`) && !el._raf) {
      paint5(el);
      const v = valueOf2(el);
      el.dataset.stateName = v == null ? "indeterminate" : v >= maxOf2(el) ? "complete" : "default";
    }
  }
}).observe(document, { attributes: true, subtree: true, attributeFilter: ["aria-valuenow", "aria-valuemax"] });
init38();
new MutationObserver(init38).observe(document, { childList: true, subtree: true });

// src/components/resizer/resizer.ts
var df$39 = defussGlobals();
var dfDollar38 = defussQuery();
var resizerStates = ["default"];
var HANDLES = ["n", "e", "s", "w", "ne", "nw", "se", "sw"];
var CLASS_NUMBERS = Array.from({ length: 81 }, (_, i) => i + 16);
var clamp4 = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
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
  const wanted = clamp4(px, min, max);
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
function applyMarkup38(_el, _stateName) {}
function triggerStateChange39(wrapper, stateName, config = {}) {
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
  apply: (wrapper, state) => triggerStateChange39(wrapper, state.name, state.config),
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
  markup: (el, state) => applyMarkup38(el, state.name)
});
df$39.resizerApi = resizerApi;
df$39.resizerStates = resizerStates;
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
  for (const el of Array.from(dfDollar38(wrapper).find(":scope > .resizer-handle").toArray())) {
    if (!want.includes(el.dataset.handle))
      el.remove();
  }
  for (const h of want) {
    if (!dfDollar38(wrapper).find(`:scope > .resizer-handle[data-handle="${h}"]`).get(0))
      dfDollar38(wrapper).append(makeHandle(wrapper, h));
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
function init39() {
  const fresh = dfDollar38(".resizer:not([data-init])").toArray().filter((wrapper) => wrapper instanceof HTMLElement).filter((wrapper) => {
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
init39();
new MutationObserver(init39).observe(document, { childList: true, subtree: true });

// src/components/search-filter/search-filter.ts
var df$40 = defussGlobals();
var dfDollar39 = defussQuery();
var searchFilterStates = ["default", "filled", "searching"];
function setValue2(box, value) {
  const field = box._field;
  if (field.value === value)
    return;
  field.value = value;
  field.dispatchEvent(new Event("input", { bubbles: true }));
}
function applyMarkup39(el, stateName) {
  const field = dfDollar39(el).children("input");
  if (!field.attr("enterkeyhint"))
    field.attr("enterkeyhint", "search");
  field.attr("aria-busy", stateName === "searching" ? "true" : null);
}
function triggerStateChange40(box, stateName, config) {
  const field = box._field;
  const value = typeof config.value === "string" ? config.value : undefined;
  if (stateName === "searching")
    field.setAttribute("aria-busy", "true");
  else
    field.removeAttribute("aria-busy");
  switch (stateName) {
    case "default":
      setValue2(box, value ?? "");
      break;
    case "filled":
    case "searching":
      if (value !== undefined)
        setValue2(box, value);
      break;
  }
}
var searchFilterApi = componentState({
  component: "search-filter",
  states: searchFilterStates,
  apply: (box, state) => {
    box.dataset.stateName = state.name;
    triggerStateChange40(box, state.name, state.config);
  },
  markup: (el, state) => applyMarkup39(el, state.name)
});
df$40.searchFilterApi = searchFilterApi;
df$40.searchFilterStates = searchFilterStates;
function clear2(box) {
  searchFilterApi.setState(box, "default", {});
  box._field.focus();
  box.dispatchEvent(new CustomEvent("search-clear", { bubbles: true }));
}
function init40() {
  dfDollar39(".search-box:not([data-init])").toArray().forEach((box) => {
    box.dataset.init = "";
    const field = dfDollar39(box).find(":scope > input").get(0);
    if (!field)
      return;
    box._field = field;
    if (!field.getAttribute("enterkeyhint"))
      field.setAttribute("enterkeyhint", "search");
    field.addEventListener("input", () => {
      const name = box.dataset.stateName;
      if (field.value === "") {
        if (name !== "default")
          searchFilterApi.setState(box, "default", {});
      } else if (name !== "searching" && name !== "filled") {
        searchFilterApi.setState(box, "filled", {});
      }
    });
    field.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && field.value !== "") {
        e.preventDefault();
        e.stopPropagation();
        clear2(box);
      }
    });
    dfDollar39(box).find(":scope > .search-box-clear").get(0)?.addEventListener("click", () => clear2(box));
    box.addEventListener("mousedown", (e) => {
      if (e.target !== field && !e.target.closest("button, a")) {
        e.preventDefault();
        field.focus();
      }
    });
    bindComponent(box, searchFilterApi);
    searchFilterApi.setState(box, field.value === "" ? "default" : "filled", {});
  });
}
init40();
new MutationObserver(init40).observe(document, { childList: true, subtree: true });

// src/components/session/session.ts
var df$41 = defussGlobals();
var dfDollar40 = defussQuery();
var sessionStates = ["default", "detached", "streaming"];
var num4 = (el, key, fallback) => {
  const v = parseFloat(el.dataset[key]);
  return Number.isFinite(v) ? v : fallback;
};
var reduced = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var resolve10 = (t) => typeof t === "string" ? dfDollar40("#" + CSS.escape(t)).get(0) ?? dfDollar40(t).get(0) : t;
var parts2 = (s) => ({
  viewport: dfDollar40(s).find(":scope > .session-viewport").get(0),
  content: dfDollar40(s).find(":scope > .session-viewport > .session-content").get(0)
});
var fromEnd = (v) => v.scrollHeight - v.scrollTop - v.clientHeight;
function scrollViewport(s, top, smooth) {
  const { viewport } = s._parts;
  s.setAttribute("data-autoscrolling", "");
  viewport.scrollTo({ top, behavior: smooth && !reduced() ? "smooth" : "instant" });
  clearTimeout(s._settle);
  s._settle = setTimeout(() => settle2(s), smooth ? 700 : 50);
}
function settle2(s) {
  clearTimeout(s._settle);
  s.removeAttribute("data-autoscrolling");
  measure2(s);
}
function measure2(s) {
  const { viewport } = s._parts;
  if (!viewport)
    return;
  const threshold = num4(s, "threshold", 48);
  const start = viewport.scrollTop > 1;
  const end = fromEnd(viewport) > 1;
  const tokens = [start && "start", end && "end"].filter(Boolean).join(" ");
  if (tokens)
    s.setAttribute("data-scrollable", tokens);
  else
    s.removeAttribute("data-scrollable");
  dfDollar40(s).find(".session-scroll-button").toArray().forEach((b) => {
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
  const need = Math.max(0, Math.round(viewport.clientHeight - vpPad - num4(s, "peek", 48) - below));
  if (need !== Math.round(pad))
    content.style.paddingBlockEnd = need ? `${need}px` : "";
  if (need) {
    const short = anchorTop(s, a) - (viewport.scrollHeight - viewport.clientHeight);
    if (short > 0)
      content.style.paddingBlockEnd = `${need + Math.ceil(short)}px`;
  }
}
var anchorTop = (s, item) => item.offsetTop - num4(s, "peek", 48);
function scrollToEnd(s, { smooth = true } = {}) {
  s.setAttribute("data-stick", "");
  scrollViewport(s, s._parts.viewport.scrollHeight, smooth);
}
function scrollToStart(s, { smooth = true } = {}) {
  s.removeAttribute("data-stick");
  scrollViewport(s, 0, smooth);
}
function scrollToMessage(s, id, { smooth = true } = {}) {
  const item = dfDollar40(s._parts.content).find(`.session-item[data-message-id="${CSS.escape(id)}"]`).get(0);
  if (!item)
    return false;
  s.removeAttribute("data-stick");
  scrollViewport(s, anchorTop(s, item), smooth);
  hold(s, () => anchorTop(s, item), smooth ? 900 : 400);
  return true;
}
function applyMarkup40(el, stateName) {
  const { content } = parts2(el);
  if (content)
    dfDollar40(content).attr("aria-busy", stateName === "streaming" ? "true" : null);
}
function triggerStateChange41(s, stateName, config) {
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
    triggerStateChange41(s, state.name, state.config);
  },
  markup: (el, state) => applyMarkup40(el, state.name)
});
df$41.sessionApi = sessionApi;
df$41.sessionStates = sessionStates;
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
    settle2(s);
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
    measure2(s);
}
function onResize(s) {
  const { viewport } = s._parts;
  anchorSpace(s);
  if (s._opening) {
    s.setAttribute("data-autoscrolling", "");
    viewport.scrollTop = s._opening();
    settle2(s);
    return;
  }
  if (s.hasAttribute("data-stick") && fromEnd(viewport) > 1) {
    s.setAttribute("data-autoscrolling", "");
    viewport.scrollTop = viewport.scrollHeight;
    settle2(s);
  } else
    measure2(s);
}
function track(s) {
  if (!s.hasAttribute("data-track"))
    return;
  const { viewport, content } = s._parts;
  const top = viewport.getBoundingClientRect().top;
  const bottom = top + viewport.clientHeight;
  const items = Array.from(dfDollar40(content).find(":scope > .session-item").toArray());
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
function init41() {
  dfDollar40(".session:not([data-init])").toArray().forEach((s) => {
    const p = parts2(s);
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
      measure2(s);
    }, { passive: true });
    ["wheel", "touchstart", "keydown", "pointerdown"].forEach((type) => viewport.addEventListener(type, () => {
      s._opening = null;
    }, { passive: true }));
    viewport.addEventListener("scrollend", () => settle2(s));
    new MutationObserver((records) => onItems(s, records)).observe(content, { childList: true });
    new ResizeObserver(() => onResize(s)).observe(content);
    new ResizeObserver(() => measure2(s)).observe(viewport);
    dfDollar40(s).find(".session-scroll-button").toArray().forEach((b) => {
      b.addEventListener("click", () => b.dataset.to === "start" ? scrollToStart(s) : follow(s));
    });
    if (s.hasAttribute("data-drop"))
      bindDrop(s);
    bindComponent(s, sessionApi);
    s.setAttribute("data-pending-scroll", "");
    s.dataset.stateName = "default";
    const where = s.dataset.defaultPosition || "end";
    const last = [...dfDollar40(content).find(":scope > .session-item[data-anchor]").toArray()].pop();
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
df$41.session = {
  append(target, content, options) {
    const s = resolve10(target);
    const item = toItem(content, options);
    s?._parts?.content.append(item);
    return item;
  },
  prepend(target, content, options) {
    const s = resolve10(target);
    const items = (Array.isArray(content) ? content : [content]).map((c) => toItem(c, options));
    s?._parts?.content.prepend(...items);
    return items;
  },
  scrollToEnd: (target, options) => {
    const s = resolve10(target);
    if (s)
      follow(s, options);
  },
  scrollToStart: (target, options) => {
    const s = resolve10(target);
    if (s)
      scrollToStart(s, options);
  },
  scrollToMessage: (target, id, options) => {
    const s = resolve10(target);
    return s ? scrollToMessage(s, id, options) : false;
  },
  isAtEnd: (target) => {
    const s = resolve10(target);
    return !!s && fromEnd(s._parts.viewport) <= num4(s, "threshold", 48);
  }
};
init41();
new MutationObserver(init41).observe(document, { childList: true, subtree: true });

// src/components/sheet/sheet.ts
var df$42 = defussGlobals();
var dfDollar41 = defussQuery();
var sheetStates = ["default", "open"];
function applyMarkup41(el, stateName) {
  dfDollar41(el).attr("open", stateName === "open" ? "" : null);
}
function triggerStateChange42(sheet, stateName, _config) {
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
  apply: (sheet, state) => triggerStateChange42(sheet, state.name, state.config),
  markup: (el, state) => applyMarkup41(el, state.name)
});
df$42.sheetApi = sheetApi;
df$42.sheetStates = sheetStates;
function init42() {
  dfDollar41("[data-sheet-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const sheet = dfDollar41("#" + CSS.escape(trigger.dataset.sheetTrigger)).get(0);
    if (!sheet)
      return;
    trigger.addEventListener("click", () => {
      sheet._trigger = trigger;
      sheet.showModal();
    });
  });
  dfDollar41("dialog.sheet:not([data-init])").toArray().forEach((sheet) => {
    sheet.dataset.init = "";
    bindComponent(sheet, sheetApi);
    sheet.addEventListener("click", (e) => {
      if (e.target === sheet)
        sheet.close();
    });
    dfDollar41(sheet).find("[data-sheet-close]").toArray().forEach((btn) => {
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
init42();
new MutationObserver(init42).observe(document, { childList: true, subtree: true });

// src/components/sidebar/sidebar.ts
var df$43 = defussGlobals();
var dfDollar42 = defussQuery();
var sidebarStates = ["default", "collapsed"];
function applyMarkup42(el, stateName) {
  dfDollar42(el).attr("data-state", stateName === "collapsed" ? "collapsed" : el._authoredState ??= dfDollar42(el).attr("data-state") || "expanded");
}
function triggerStateChange43(sidebar, stateName, _config) {
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
    triggerStateChange43(sidebar, state.name, state.config);
  },
  read: (sidebar, state) => {
    return {
      name: sidebar.dataset.state === "collapsed" ? "collapsed" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup42(el, state.name)
});
df$43.sidebarApi = sidebarApi;
df$43.sidebarStates = sidebarStates;
function init43() {
  dfDollar42(".app-sidebar:not([data-init])").toArray().forEach((sidebar) => {
    sidebar.dataset.init = "";
    sidebar._defaultState = sidebar.dataset.state || "expanded";
    sidebar._pinned = !!sidebar.dataset.stateName;
    bindComponent(sidebar, sidebarApi);
    const triggerId = sidebar.id ? `[data-sidebar-trigger="${sidebar.id}"]` : ".sidebar-trigger";
    dfDollar42(triggerId).toArray().forEach((trigger) => {
      trigger.addEventListener("click", () => {
        const state = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
        sidebar.dataset.state = state;
        sidebar._pinned = true;
      });
    });
    document.__sidebarAutoRo?.observe(sidebar.parentElement ?? sidebar);
    autoCollapseSidebar(sidebar);
  });
  dfDollar42("[data-sidebar-mobile]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const dialog = dfDollar42("#" + CSS.escape(trigger.dataset.sidebarMobile)).get(0);
    if (!dialog)
      return;
    trigger.addEventListener("click", () => {
      dialog.showModal();
    });
    dfDollar42(dialog).find(".sidebar-mobile-close").toArray().forEach((btn) => {
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
init43();
new MutationObserver(init43).observe(document, { childList: true, subtree: true });
if (!document.__sidebarKbInit) {
  document.__sidebarKbInit = true;
  bindGlobalKeys((e) => {
    if (!(e.metaKey || e.ctrlKey) || e.key !== "b")
      return;
    const sidebar = dfDollar42(".app-sidebar").get(0);
    if (!sidebar)
      return;
    e.preventDefault();
    sidebar.dataset.state = sidebar.dataset.state === "collapsed" ? "expanded" : "collapsed";
    sidebar._pinned = true;
    return true;
  });
}

// src/components/slider/slider.ts
var df$44 = defussGlobals();
var dfDollar43 = defussQuery();
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
function outputsOf2(el) {
  if (!el.id)
    return [];
  return [...dfDollar43("output[for]").toArray()].filter((o) => o.htmlFor.contains(el.id));
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
  for (const out of outputsOf2(el)) {
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
var rangeInputs = (range) => [...dfDollar43(range).find(":scope > .slider").toArray()].slice(0, 2);
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
function applyMarkup43(el, stateName) {
  if (stateName === "disabled")
    dfDollar43(el).attr("disabled", "");
}
function triggerStateChange44(el, stateName, config) {
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
  apply: (el, state) => triggerStateChange44(el, state.name, state.config),
  read: (el, state) => {
    return {
      name: el.disabled ? "disabled" : "default",
      config: { ...state.config, value: el.value }
    };
  },
  markup: (el, state) => applyMarkup43(el, state.name)
});
df$44.sliderApi = sliderApi;
df$44.sliderStates = sliderStates;
function init44() {
  dfDollar43(".slider-range:not([data-init])").toArray().forEach((range) => {
    range.dataset.init = "";
    initRange(range);
  });
  dfDollar43(".slider:not([data-init])").toArray().forEach((el) => {
    el.dataset.init = "";
    el._defaultDisabled = el.disabled;
    bindComponent(el, sliderApi);
    if (el.dataset.thumbEmoji && !el.dataset.thumb)
      el.dataset.thumb = "emoji";
    updateSliderValue(el);
    el.addEventListener("input", () => updateSliderValue(el));
  });
}
init44();
new MutationObserver(init44).observe(document, { childList: true, subtree: true });

// src/components/sortable/sortable.ts
var df$45 = defussGlobals();
var dfDollar44 = defussQuery();
var sortableStates = ["default"];
var drag = null;
var sortableLabels = (list) => dfDollar44(list).find(".sortable-item").map((item) => dfDollar44(item).find("span:not(.sortable-handle):not(.sortable-moves)").text().trim());
function applyMarkup44(_el, _stateName) {}
function triggerStateChange45(list, stateName, config) {
  if (stateName !== "default")
    return;
  dfDollar44(list).append(list._defaultOrder ?? []);
  list._syncMoves?.();
  if (config?.index !== undefined) {
    const item = dfDollar44(list).find(".sortable-item")[Number(config.index)];
    list._setActive?.(item);
  }
}
var sortableApi = componentState({
  component: "sortable",
  states: sortableStates,
  apply: (list, state) => triggerStateChange45(list, state.name, state.config),
  read: (list, state) => {
    const items = Array.from(dfDollar44(list).find(".sortable-item"));
    const active = dfDollar44(list).find(".sortable-item[data-active]")[0];
    return {
      name: list.dataset.stateName || "default",
      config: {
        ...state.config,
        order: sortableLabels(list),
        activeIndex: active ? items.indexOf(active) : -1
      }
    };
  },
  markup: (el, state) => applyMarkup44(el, state.name)
});
df$45.sortableApi = sortableApi;
df$45.sortableStates = sortableStates;
function init45() {
  dfDollar44(".sortable:not([data-init])").toArray().forEach((list) => {
    list.dataset.init = "";
    bindComponent(list, sortableApi);
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
      dfDollar44(list).after(liveRegion);
    }
    function announce(msg) {
      dfDollar44(liveRegion).text("");
      requestAnimationFrame(() => {
        dfDollar44(liveRegion).text(msg);
      });
    }
    function getItems() {
      return Array.from(dfDollar44(list).find('.sortable-item:not([aria-disabled="true"])'));
    }
    function getAllItems() {
      return Array.from(dfDollar44(list).find(".sortable-item"));
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
      dfDollar44(list).append(all.map((el, i) => fixed[i] ? el : movable[m++]));
      return slot;
    }
    function syncMoves() {
      const all = getAllItems();
      const free = all.map((el) => !isLocked(el));
      all.forEach((item, i) => {
        const label = getItemLabel(item);
        dfDollar44(item).find(".sortable-move").each(function() {
          const up = this.dataset.move === "up";
          const room = up ? free.slice(0, i).some(Boolean) : free.slice(i + 1).some(Boolean);
          dfDollar44(this).prop("disabled", isLocked(item) || !room);
          if (!this.hasAttribute("aria-label") || this.dataset.autoLabel !== undefined) {
            dfDollar44(this).attr("aria-label", `Move ${label} ${up ? "up" : "down"}`).data("autoLabel", "");
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
        dfDollar44(before).before(item);
      else
        dfDollar44(list).append(item);
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
        dfDollar44(items[0]).attr("tabindex", "0");
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
      return group ? Array.from(dfDollar44(".sortable[data-group]").toArray()).filter((l) => l.dataset.group === group) : [list];
    };
    function getActiveItem() {
      return dfDollar44(list).find(".sortable-item[data-active]")[0];
    }
    function setActive(item, focus = true) {
      getAllItems().forEach((el) => {
        dfDollar44(el).data("active", null).attr("tabindex", "-1");
      });
      if (item) {
        dfDollar44(item).data("active", "").attr("tabindex", "0");
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
      dfDollar44(clone).find(".sortable-handle, .sortable-moves, .sortable-move").toArray().forEach((el) => el.remove());
      return clone.textContent.trim();
    }
    const allItems = getAllItems();
    allItems.forEach((item, i) => {
      dfDollar44(item).attr("tabindex", i === 0 ? "0" : "-1");
    });
    syncMoves();
    const accepts = () => !!drag && (drag.from === list || !!list.dataset.group && list.dataset.group === drag.from.dataset.group);
    const clearOver = () => {
      dfDollar44(list).find("[data-over]").data("over", null);
      dfDollar44(list).data("over", null);
    };
    list.addEventListener("dragstart", (e) => {
      const item = e.target.closest?.(".sortable-item");
      if (!item || !list.contains(item) || isLocked(item))
        return;
      drag = { item, from: list };
      dfDollar44(item).data("dragging", "");
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "");
    });
    list.addEventListener("dragend", () => {
      if (drag)
        dfDollar44(drag.item).data("dragging", null);
      groupLists().forEach((l) => {
        dfDollar44(l).data("over", null);
        dfDollar44(l).find("[data-over]").data("over", null);
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
        dfDollar44(item).data("over", pos < midpoint ? "before" : "after");
      } else {
        dfDollar44(list).data("over", "end");
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
      const target = dfDollar44(list).find(".sortable-item[data-over]")[0];
      const position = target ? dfDollar44(target).data("over") : "end";
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
      const target = button.disabled ? dfDollar44(item).find(`.sortable-move[data-move="${button.dataset.move === "up" ? "down" : "up"}"]`).get(0) : button;
      target?.focus();
    });
    list.addEventListener("keydown", (e) => {
      if (e.target.closest?.(".sortable-move"))
        return;
      const active = getActiveItem() || dfDollar44(list).find('.sortable-item[tabindex="0"]')[0];
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
      } else if ((e.key === NEXT_KEY || e.key === PREV_KEY) && e.altKey) {
        e.preventDefault();
        const from = getAllItems().indexOf(active);
        const slot = place(active, from + (e.key === NEXT_KEY ? 1 : -1));
        if (slot >= 0)
          moved(active, slot);
      } else if ((e.key === NEXT_LIST_KEY || e.key === PREV_LIST_KEY) && e.altKey && list.dataset.group) {
        e.preventDefault();
        const lists = groupLists();
        const other = lists[lists.indexOf(list) + (e.key === NEXT_LIST_KEY ? 1 : -1)];
        if (!other?._receive)
          return;
        other._receive(active, getAllItems().indexOf(active), list);
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
init45();
new MutationObserver(init45).observe(document, { childList: true, subtree: true });

// src/components/steps/steps.ts
var df$46 = defussGlobals();
var dfDollar45 = defussQuery();
var stepsStates = ["default"];
var numAttr3 = (el, key, fallback) => {
  const v = parseInt(el.dataset[key] ?? "", 10);
  return Number.isFinite(v) ? v : fallback;
};
function renderSteps(ol) {
  const items = Array.from(dfDollar45(ol).find(".step").toArray());
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
function applyMarkup45(ol, config = {}) {
  if (config.activeStep !== undefined && numAttr3(ol, "activeStep", 1) !== Number(config.activeStep))
    ol.dataset.activeStep = String(config.activeStep);
  if (config.errorStep !== undefined && numAttr3(ol, "errorStep", 0) !== Number(config.errorStep)) {
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
function triggerStateChange46(ol, stateName, config = {}) {
  if (stateName !== "default")
    return;
  const a = config.activeStep ?? config.step ?? config.page;
  if (a !== undefined && numAttr3(ol, "activeStep", 1) !== Number(a))
    ol.dataset.activeStep = String(a);
  if (config.errorStep !== undefined) {
    if (numAttr3(ol, "errorStep", 0) !== Number(config.errorStep)) {
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
  apply: (ol, state) => triggerStateChange46(ol, state.name, state.config),
  read: (ol, state) => {
    return {
      name: ol.dataset.stateName || "default",
      config: {
        ...state.config,
        activeStep: numAttr3(ol, "activeStep", 1),
        activeStepError: numAttr3(ol, "errorStep", 0) === numAttr3(ol, "activeStep", 1) && numAttr3(ol, "errorStep", 0) !== 0,
        errorStep: numAttr3(ol, "errorStep", 0),
        size: ol.dataset.size ?? "md"
      }
    };
  },
  markup: (el, state) => applyMarkup45(el, state.config)
});
df$46.stepsApi = stepsApi;
df$46.stepsStates = stepsStates;
function init46() {
  dfDollar45(".steps:not([data-init])").toArray().forEach((ol) => {
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
      const items = Array.from(dfDollar45(ol).find(".step").toArray());
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
init46();
new MutationObserver(init46).observe(document, { childList: true, subtree: true });

// src/components/table/table.ts
var df$47 = defussGlobals();
var dfDollar46 = defussQuery();
var tableStates = ["default", "sorted", "selected"];
var bodyOf = (table) => table.tBodies[0];
var bodyRows = (table) => [...bodyOf(table)?.rows ?? []];
var rowBox = (row) => dfDollar46(row).find(':scope > .table-select input[type="checkbox"]').get(0);
var headBox = (table) => dfDollar46(table.tHead).find('.table-select input[type="checkbox"]').get(0);
function enhanceHead(table) {
  dfDollar46(table.tHead).find(".table-sort").each((_i, btn) => {
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
    if (dfDollar46(th).find(".table-sort").get(0))
      th.setAttribute("aria-sort", i === col ? direction : "none");
  });
  table._sort = { column: col, direction };
}
function unsort(table) {
  const body = bodyOf(table);
  if (body && table._original)
    body.append(...table._original.filter((r) => r.parentElement === body));
  dfDollar46(table.tHead).find("[aria-sort]").attr("aria-sort", "none");
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
  dfDollar46(table.tHead).find("[aria-sort]").attr("aria-sort", "none");
  table._sort = null;
  announceMove(table, row);
}
function initReorder(table) {
  let dragged = null;
  const clear = () => dfDollar46(table).find("[data-drop]").toArray().forEach((r) => r.removeAttribute("data-drop"));
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
    const row = dfDollar46(table).find("tbody > tr[data-drop]").get(0);
    if (!dragged || !row)
      return;
    e.preventDefault();
    const ref = row.dataset.drop === "before" ? row : row.nextSibling;
    if (ref)
      dfDollar46(ref).before(dragged);
    else
      dfDollar46(row.parentElement).append(dragged);
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
      dfDollar46(ref).before(row);
    else
      dfDollar46(row.parentElement).append(row);
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
function triggerStateChange47(table, stateName, config) {
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
  apply: (table, state) => triggerStateChange47(table, state.name, state.config),
  read: (table, state) => {
    const selected = bodyRows(table).flatMap((r, i) => r.getAttribute("aria-selected") === "true" ? [i] : []);
    return { name: table.dataset.stateName || "default", config: { ...state.config, sort: table._sort ?? null, selected } };
  },
  markup: (el, state) => {
    enhanceHead(el);
    triggerStateChange47(el, state.name, state.config);
  }
});
df$47.tableApi = tableApi;
df$47.tableStates = tableStates;
function init47() {
  dfDollar46("table.table:not([data-init])").toArray().forEach((table) => {
    table.dataset.init = "";
    table.dataset.stateName = "default";
    table._original = bodyRows(table);
    table._sort = null;
    bindComponent(table, tableApi);
    enhanceHead(table);
    dfDollar46(table.tHead).find(".table-sort").toArray().forEach((btn) => {
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
    const pre = dfDollar46(table.tHead).find('th[aria-sort="ascending"], th[aria-sort="descending"]').get(0);
    if (pre)
      sortBy(table, pre.cellIndex, pre.getAttribute("aria-sort"));
    if (dfDollar46(table).find('.table-select input[type="checkbox"]').get(0)) {
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
    if (dfDollar46(table).find(".table-handle").get(0))
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
init47();
new MutationObserver(init47).observe(document, { childList: true, subtree: true });

// src/components/tabs/tabs.ts
var df$48 = defussGlobals();
var dfDollar47 = defussQuery();
var tabsStates = ["default", "active", "disabled"];
var ICON = ":scope > :is(svg, img, i, .tab-icon)";
var LUCIDE_NAME = /^[a-z][a-z0-9-]*$/;
var iconOf = (tab) => {
  const icon = dfDollar47(tab).find(ICON).get(0);
  if (!icon)
    return "";
  return icon.getAttribute("data-lucide") ?? icon.textContent.trim();
};
var labelOf2 = (tab) => {
  const label = dfDollar47(tab).find(":scope > .tab-label").get(0);
  if (label)
    return label.textContent.trim();
  return Array.from(tab.childNodes).filter((n) => n.nodeType === Node.TEXT_NODE).map((n) => n.textContent).join("").trim();
};
var setLabel = (tab, text) => {
  const label = dfDollar47(tab).find(":scope > .tab-label").get(0);
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
  dfDollar47(tab).find(ICON).get(0)?.remove();
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
  if (typeof config.label === "string" && config.label !== labelOf2(tab))
    setLabel(tab, config.label);
  if (typeof config.icon === "string" && config.icon !== iconOf(tab))
    setIcon(tab, config.icon);
};
var triggersOf2 = (el) => {
  const list = el.getAttribute("role") === "tablist" ? el : el.closest('[role="tablist"]');
  return Array.from(dfDollar47(list).find('[role="tab"]').toArray());
};
var activateTab = (tab, triggers) => {
  triggers.forEach((t) => {
    t.setAttribute("aria-selected", "false");
    t.setAttribute("tabindex", "-1");
    t.dataset.stateName = t.disabled ? "disabled" : "default";
    const panel = dfDollar47("#" + CSS.escape(t.getAttribute("aria-controls"))).get(0);
    if (panel)
      panel.hidden = true;
  });
  tab.setAttribute("aria-selected", "true");
  tab.removeAttribute("tabindex");
  tab.dataset.stateName = "active";
  const panel = dfDollar47("#" + CSS.escape(tab.getAttribute("aria-controls"))).get(0);
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
  if (labelOf2(tab) !== tab._authored.label)
    setLabel(tab, tab._authored.label);
  if (iconOf(tab) !== tab._authored.icon)
    setIcon(tab, tab._authored.icon);
  tab.dataset.stateName = tabName(tab);
};
var authoredTab = (triggers) => triggers.find((t) => t._authored.selected) || triggers.find((t) => !t.disabled);
function triggerStateChange48(el, stateName, config) {
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
  triggers.forEach((t) => dfDollar47(t).attr("aria-selected", "false").attr("tabindex", "-1"));
  dfDollar47(tab).attr("aria-selected", "true").attr("tabindex", null);
};
var selectedOf = (t) => dfDollar47(t).attr("aria-selected") === "true";
var disabledOf = (t) => dfDollar47(t).attr("disabled") != null;
function listMarkup(list, stateName, config) {
  const triggers = dfDollar47(list).find('[role="tab"]').toArray();
  if (stateName === "default") {
    const tab = triggers.find(selectedOf) || triggers.find((t) => !disabledOf(t));
    if (tab)
      selectMarkup(tab, triggers);
  } else if (stateName === "disabled")
    triggers.forEach((t) => dfDollar47(t).attr("disabled", ""));
  const pick = typeof config?.index === "number" ? triggers[config.index] : typeof config?.id === "string" ? triggers.find((t) => t.id === config.id) : null;
  if (pick && !disabledOf(pick))
    selectMarkup(pick, triggers);
}
function tabMarkup(tab, stateName, config) {
  if (stateName === "active")
    dfDollar47(tab).attr("disabled", null).attr("aria-selected", "true").attr("tabindex", null);
  else
    dfDollar47(tab).attr("disabled", stateName === "disabled" ? "" : null);
  applyContent(tab, config ?? {});
}
var tabsApi = componentState({
  component: "tabs",
  states: tabsStates,
  apply: (el, state, _previous, incoming) => triggerStateChange48(el, state.name, incoming),
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
      config: { ...state.config, label: labelOf2(el), icon: iconOf(el) }
    };
  },
  markup: (el, state) => (el.getAttribute("role") === "tablist" ? listMarkup : tabMarkup)(el, state.name, state.config),
  mergeConfig: true
});
df$48.tabsApi = tabsApi;
df$48.tabsStates = tabsStates;
function init48() {
  dfDollar47('[role="tablist"]:not([data-init]):has(.tab-trigger)').toArray().forEach((tablist) => {
    tablist.dataset.init = "";
    const triggers = Array.from(dfDollar47(tablist).find('[role="tab"]').toArray());
    triggers.forEach((t) => {
      t._authored = {
        selected: t.getAttribute("aria-selected") === "true",
        disabled: t.disabled,
        label: labelOf2(t),
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
init48();
new MutationObserver(init48).observe(document, { childList: true, subtree: true });

// src/components/theme-switcher/theme-switcher.ts
var df$49 = defussGlobals();
var dfDollar48 = defussQuery();
var themeSwitcherStates = ["default", "open"];
var STORAGE_KEY = "defuss-shadcn-color-theme";
var LINK_ID = "theme-css";
var THEME_EVENT = "defuss-theme-change";
var chosen;
var remembered = () => chosen ??= persisted(STORAGE_KEY, "default");
function themeHref(root, id) {
  if (root.dataset.themeBase)
    return `${root.dataset.themeBase}/${id}.css`;
  const tokens = dfDollar48("#tokens-css").get(0) || dfDollar48('link[href*="default-semantic-tokens.css"]').get(0);
  if (tokens)
    return new URL(`../${id}.css`, tokens.href).href;
  return `${id}.css`;
}
function applyThemeId(root, id) {
  let link = dfDollar48("#" + CSS.escape(LINK_ID)).get(0);
  if (!id || id === "default") {
    link?.remove();
    remembered().set("default");
    loadTheme("default").catch(() => {
      return;
    });
    syncTrigger(root, "default");
    document.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { id: "default" } }));
    return;
  }
  remembered().set(id);
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
  const tokens = dfDollar48("#tokens-css").get(0) || dfDollar48('link[href*="default-semantic-tokens.css"]').get(0);
  if (tokens)
    dfDollar48(tokens).after(link);
  else
    dfDollar48(document.head).append(link);
  loadTheme(id).catch(() => {
    return;
  });
  syncTrigger(root, id);
  document.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { id } }));
}
function syncTrigger(root, id) {
  const $root = dfDollar48(root);
  const trigger = $root.find(".theme-switcher-trigger")[0];
  const items = Array.from($root.find(".theme-switcher-item"));
  const active = items.find((i) => i.dataset.themeId === id);
  items.forEach((i) => dfDollar48(i).attr("aria-checked", i === active ? "true" : "false"));
  if (!trigger)
    return;
  const dot = dfDollar48(trigger).find(".theme-switcher-dot")[0];
  const label = dfDollar48(trigger).find(".theme-switcher-label")[0];
  const first = active?.dataset.themeColors?.split(",")[0]?.trim();
  if (dot)
    dfDollar48(dot).css("background", first || "");
  if (label && (active || id === "default"))
    dfDollar48(label).text(active?.dataset.themeLabel || "Default");
  root.dataset.themeId = id;
}
function applyMarkup46(_el, _stateName) {}
function triggerStateChange49(menu, stateName, _config) {
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
var themeSwitcherApi = Object.assign(componentState({
  component: "theme-switcher",
  states: themeSwitcherStates,
  apply: (menu, state) => triggerStateChange49(menu, state.name, state.config),
  markup: (el, state) => applyMarkup46(el, state.name)
}), {
  select(menu, id) {
    const root = menu.closest(".theme-switcher");
    if (!root)
      throw new Error("theme-switcher: menu is not inside a .theme-switcher root");
    applyThemeId(root, id);
  }
});
df$49.themeSwitcherApi = themeSwitcherApi;
df$49.themeSwitcherStates = themeSwitcherStates;
function init49() {
  dfDollar48(".theme-switcher-menu:not([data-init])").toArray().forEach((menu) => {
    menu.dataset.init = "";
    const root = menu.closest(".theme-switcher");
    const trigger = (root ? dfDollar48(root).find(".theme-switcher-trigger").get(0) : undefined) ?? (menu.id && dfDollar48(`[popovertarget="${menu.id}"]`).get(0));
    const getItems = () => Array.from(dfDollar48(menu).find(".theme-switcher-item").toArray());
    if (trigger) {
      const anchorId = `--theme-switcher-${menu.id || "menu"}`;
      dfDollar48(trigger).css("anchorName", anchorId);
      dfDollar48(menu).css("positionAnchor", anchorId);
    }
    menu.addEventListener("toggle", () => {
      if (trigger)
        dfDollar48(trigger).attr("aria-expanded", menu.matches(":popover-open") ? "true" : "false");
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
      const holder = dfDollar48(item).find(".theme-switcher-dots").get(0);
      if (holder && !holder.childElementCount) {
        const spans = (item.dataset.themeColors || "").split(",").slice(0, 5).map((c) => c.trim()).filter(Boolean).map((c) => `<span style="background:${c}"></span>`).join("");
        dfDollar48(holder).html(spans);
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
    bindComponent(menu, themeSwitcherApi);
    if (root) {
      const initial = dfDollar48("#" + CSS.escape(LINK_ID)).get(0)?.dataset.themeId || remembered().value || "default";
      if (initial !== "default" || dfDollar48("#" + CSS.escape(LINK_ID)).get(0))
        syncTrigger(root, initial);
    }
  });
}
document.addEventListener(THEME_EVENT, (e) => {
  const id = e.detail?.id || "default";
  dfDollar48(".theme-switcher").toArray().forEach((root) => syncTrigger(root, id));
});
init49();
new MutationObserver(init49).observe(document, { childList: true, subtree: true });

// src/components/toast/toast.ts
var df$50 = defussGlobals();
var dfDollar49 = defussQuery();
var toastStates = ["default"];
function applyMarkup47(_el, _stateName) {}
function triggerStateChange50(container, stateName, _config) {
  if (stateName !== "default")
    return;
  dfDollar49(container).find(".toast").toArray().forEach((el) => toastDismiss(el));
}
var toastApi = componentState({
  component: "toast",
  states: toastStates,
  apply: (container, state) => {
    triggerStateChange50(container, state.name, state.config);
  },
  read: (container, state) => {
    return {
      name: container.dataset.stateName || "default",
      config: { ...state.config, count: dfDollar49(container).find(".toast").toArray().length }
    };
  },
  markup: (el, state) => applyMarkup47(el, state.name)
});
df$50.toastApi = toastApi;
df$50.toastStates = toastStates;
var DURATION = 4000;
var MAX_VISIBLE = 3;
var toastCallbacks = new WeakMap;
var toastContainer = dfDollar49("#toast-container").get(0);
if (!toastContainer) {
  toastContainer = document.createElement("div");
  toastContainer.id = "toast-container";
  toastContainer.className = "toast-container";
  toastContainer.setAttribute("aria-label", "Notifications");
  toastContainer.setAttribute("data-position", "bottom-right");
  dfDollar49(document.body).append(toastContainer);
}
var stackToasts = (container) => {
  const toasts = [...dfDollar49(container).find(".toast:not([data-leaving])").toArray()];
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
      dfDollar49(el).remove();
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
    dfDollar49(el).remove();
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
    dfDollar49(contentEl).append(dfDollar49(icons[variant]));
  }
  const textDiv = document.createElement("div");
  textDiv.className = "toast-text";
  if (title) {
    const p = document.createElement("p");
    p.className = "toast-title";
    dfDollar49(p).text(title);
    dfDollar49(textDiv).append(p);
  }
  if (description) {
    const p = document.createElement("p");
    p.className = "toast-description";
    dfDollar49(p).text(description);
    dfDollar49(textDiv).append(p);
  }
  dfDollar49(contentEl).append(textDiv);
  const closeBtn = document.createElement("button");
  closeBtn.className = "toast-close";
  closeBtn.setAttribute("aria-label", "Dismiss");
  closeBtn.dataset.toastClose = "";
  dfDollar49(closeBtn).html('<svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>');
  dfDollar49(contentEl).append(closeBtn);
  let host = el;
  if (aura) {
    const style = aura === true ? "" : String(aura);
    el.classList.add("aura", "aura-md");
    if (style)
      el.classList.add(`aura-${style}`);
    el.dataset.aura = style || "default";
    host = document.createElement("div");
    host.className = "toast-surface";
    dfDollar49(el).append(host);
  }
  dfDollar49(host).append(contentEl);
  if (action) {
    const actionsDiv = document.createElement("div");
    actionsDiv.className = "toast-actions";
    const actionBtn = document.createElement("button");
    actionBtn.className = "btn";
    actionBtn.setAttribute("data-variant", "outline");
    actionBtn.setAttribute("data-size", "sm");
    actionBtn.dataset.toastAction = "";
    dfDollar49(actionBtn).text(action.label);
    dfDollar49(actionsDiv).append(actionBtn);
    dfDollar49(host).append(actionsDiv);
  }
  if (animation) {
    el._animation = typeof animation === "string" ? { in: animation } : animation;
    el.dataset.anim = "";
  }
  dfDollar49(toastContainer).append(el);
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
  const toasts = dfDollar49(toastContainer).find(".toast").toArray();
  if (toasts.length > (toastContainer.dataset.stack === "pile" ? 6 : MAX_VISIBLE))
    toastDismiss(toasts[0]);
  return el;
};
function init50() {
  dfDollar49("#toast-container:not([data-init])").toArray().forEach((container) => {
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
init50();
new MutationObserver(init50).observe(document.body, { childList: true, subtree: true });
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
    dfDollar49(toastContainer).find(".toast").toArray().forEach((el) => {
      toastDismiss(el);
    });
  }
};
df$50.toast = toastActions;

// src/components/toggle/toggle.ts
var df$51 = defussGlobals();
var dfDollar50 = defussQuery();
var toggleStates = ["default", "pressed"];
function applyMarkup48(toggle, stateName, defaultPressed) {
  dfDollar50(toggle).attr("aria-pressed", stateName === "pressed" ? "true" : defaultPressed);
}
function triggerStateChange51(toggle, stateName, _config) {
  applyMarkup48(toggle, stateName, toggle._defaultPressed ?? "false");
}
var toggleApi = componentState({
  component: "toggle",
  states: toggleStates,
  apply: (toggle, state) => triggerStateChange51(toggle, state.name, state.config),
  read: (toggle, state) => ({ name: dfDollar50(toggle).attr("aria-pressed") === "true" ? "pressed" : "default", config: state.config }),
  markup: (toggle, state) => {
    const authored = state.model.attrs.find(([name]) => name === "aria-pressed");
    applyMarkup48(toggle, state.name, authored ? authored[1] : "false");
  }
});
df$51.toggleApi = toggleApi;
df$51.toggleStates = toggleStates;
function init51() {
  dfDollar50(".toggle:not([data-init]):not(.toggle-group .toggle)").each((_i, toggle) => {
    dfDollar50(toggle).data("init", "");
    toggle._defaultPressed = dfDollar50(toggle).attr("aria-pressed") || "false";
    bindComponent(toggle, toggleApi, { name: toggle._defaultPressed === "true" ? "pressed" : "default", config: {} });
    dfDollar50(toggle).on("click", () => {
      dfDollar50(toggle).attr("aria-pressed", String(dfDollar50(toggle).attr("aria-pressed") !== "true"));
    });
  });
}
init51();
new MutationObserver(init51).observe(document, { childList: true, subtree: true });

// src/components/toggle-group/toggle-group.ts
var df$52 = defussGlobals();
var dfDollar51 = defussQuery();
var toggleGroupStates = ["default", "disabled"];
function applyMarkup49(el, stateName) {
  dfDollar51(el).attr("data-disabled", stateName === "disabled" ? "" : null);
}
function triggerStateChange52(group, stateName, _config) {
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
  apply: (group, state) => triggerStateChange52(group, state.name, state.config),
  read: (group, state) => {
    return {
      name: group.hasAttribute("data-disabled") ? "disabled" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup49(el, state.name)
});
df$52.toggleGroupApi = toggleGroupApi;
df$52.toggleGroupStates = toggleGroupStates;
function init52() {
  dfDollar51(".toggle-group:not([data-init])").toArray().forEach((group) => {
    group.dataset.init = "";
    bindComponent(group, toggleGroupApi);
    const type = group.getAttribute("data-type") || "single";
    const getToggles = () => Array.from(dfDollar51(group).find(".toggle:not(:disabled)").toArray());
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
init52();
new MutationObserver(init52).observe(document, { childList: true, subtree: true });

// src/components/toolbar/toolbar.ts
var df$53 = defussGlobals();
var dfDollar52 = defussQuery();
var toolbarStates = ["default"];
function applyMarkup50(_el, _stateName) {}
function triggerStateChange53(toolbar, items, stateName, config) {
  if (stateName !== "default" || items.length === 0)
    return;
  const target = items[Math.min(Number(config?.focus ?? 0), items.length - 1)] || items[0];
  items.forEach((item) => item.setAttribute("tabindex", item === target ? "0" : "-1"));
  if (toolbar.contains(document.activeElement))
    target.focus();
}
var toolbarApi = componentState({
  component: "toolbar",
  states: toolbarStates,
  apply: (toolbar, state) => {
    const items = toolbarItems(toolbar);
    triggerStateChange53(toolbar, items, state.name, state.config);
  },
  read: (toolbar, state) => {
    const items = toolbarItems(toolbar);
    const idx = items.findIndex((item) => item.getAttribute("tabindex") === "0");
    return {
      name: toolbar.dataset.stateName || "default",
      config: { ...state.config, rovingIndex: idx }
    };
  },
  markup: (el, state) => applyMarkup50(el, state.name)
});
df$53.toolbarApi = toolbarApi;
df$53.toolbarStates = toolbarStates;
var toolbarItems = (toolbar) => Array.from(dfDollar52(toolbar).find('button:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])').toArray());
function init53() {
  dfDollar52('.toolbar[role="toolbar"]:not([data-init])').toArray().forEach((toolbar) => {
    toolbar.dataset.init = "";
    bindComponent(toolbar, toolbarApi);
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
init53();
new MutationObserver(init53).observe(document, { childList: true, subtree: true });

// src/components/tooltip/tooltip.ts
var df$54 = defussGlobals();
var dfDollar53 = defussQuery();
var tooltipStates = ["default", "visible"];
function applyMarkup51(_el, _stateName) {}
function triggerStateChange54(tip, stateName, _config) {
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
var tooltipApi = componentState({
  component: "tooltip",
  states: tooltipStates,
  apply: (tip, state) => triggerStateChange54(tip, state.name, state.config),
  markup: (el, state) => applyMarkup51(el, state.name)
});
df$54.tooltipApi = tooltipApi;
df$54.tooltipStates = tooltipStates;
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
function init54() {
  dfDollar53("[data-tooltip-trigger]:not([data-init])").toArray().forEach((trigger) => {
    trigger.dataset.init = "";
    const tip = dfDollar53("#" + CSS.escape(trigger.dataset.tooltipTrigger)).get(0);
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
      const wait = groupOpen ? 0 : delay;
      openTimer = setTimeout(() => {
        try {
          tip.showPopover();
        } catch {}
        markGroupOpen();
      }, wait);
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
  dfDollar53(".tooltip[popover]:not([data-init])").toArray().forEach((tip) => {
    tip.dataset.init = "";
    bindComponent(tip, tooltipApi);
  });
}
init54();
new MutationObserver(init54).observe(document, { childList: true, subtree: true });
if (!document.__tooltipScrollInit) {
  document.__tooltipScrollInit = true;
  document.addEventListener("scroll", () => {
    dfDollar53(".tooltip:popover-open").toArray().forEach((tip) => {
      try {
        tip.hidePopover();
      } catch {}
    });
  }, { passive: true, capture: true });
}

// src/components/tree-view/tree-view.ts
var df$55 = defussGlobals();
var dfDollar54 = defussQuery();
var treeViewStates = ["default", "expanded"];
function applyMarkup52(el, stateName) {
  if (stateName === "expanded")
    dfDollar54(el).attr("open", "");
}
function triggerStateChange55(details, stateName, _config) {
  switch (stateName) {
    case "default":
      details.open = details._defaultOpen ?? false;
      break;
    case "expanded":
      details.open = true;
      break;
  }
}
var treeViewApi = componentState({
  component: "tree-view",
  states: treeViewStates,
  apply: (details, state) => triggerStateChange55(details, state.name, state.config),
  read: (details, state) => {
    return {
      name: details.open ? "expanded" : "default",
      config: state.config
    };
  },
  markup: (el, state) => applyMarkup52(el, state.name)
});
df$55.treeViewApi = treeViewApi;
df$55.treeViewStates = treeViewStates;
var itemOf = (row) => row.closest('[role="treeitem"]');
var isDisabled2 = (item) => item?.getAttribute("aria-disabled") === "true";
function selectItem(tree, item) {
  if (!item || isDisabled2(item) || item.getAttribute("aria-selected") === "true")
    return;
  dfDollar54(tree).find('[role="treeitem"][aria-selected="true"]').toArray().forEach((other) => other.setAttribute("aria-selected", "false"));
  item.setAttribute("aria-selected", "true");
  tree.dispatchEvent(new CustomEvent("tree-select", { bubbles: true, detail: { item } }));
}
var checkOf = (item) => item ? dfDollar54(item).find(":scope > .tree-leaf > .tree-check, :scope > details > .tree-branch-trigger > .tree-check").get(0) : undefined;
var childItems = (item) => [...dfDollar54(item).find(":scope > details > .tree-group").get(0)?.children ?? []].filter((li) => li.matches('[role="treeitem"]'));
var cascades = (tree) => tree.dataset.checkable !== "independent";
function checkDown(item, checked) {
  for (const child of childItems(item)) {
    const box = checkOf(child);
    if (box && !box.disabled) {
      box.checked = checked;
      box.indeterminate = false;
    }
    checkDown(child, checked);
  }
}
function rollUp(tree, item) {
  let parent = item.parentElement?.closest('[role="treeitem"]');
  while (parent && tree.contains(parent)) {
    const box = checkOf(parent);
    if (box) {
      const kids = childItems(parent).map(checkOf).filter(Boolean);
      const on = kids.filter((k) => k.checked && !k.indeterminate).length;
      const mixed = kids.some((k) => k.indeterminate);
      box.checked = kids.length > 0 && on === kids.length;
      box.indeterminate = mixed || on > 0 && on < kids.length;
    }
    parent = parent.parentElement?.closest('[role="treeitem"]');
  }
}
function syncAria(tree) {
  dfDollar54(tree).find('[role="treeitem"]').toArray().forEach((item) => {
    const box = checkOf(item);
    if (box)
      item.setAttribute("aria-checked", box.indeterminate ? "mixed" : String(box.checked));
  });
}
function checkedValues(tree) {
  return [...dfDollar54(tree).find(".tree-check").toArray()].filter((b) => b.checked && !b.indeterminate).map((b) => b.value !== "on" ? b.value : dfDollar54(b).closest('[role="treeitem"]').find(":scope > * > span:last-child, :scope > details > summary > span:last-child").get(0)?.textContent ?? "");
}
function onCheck(tree, item) {
  const box = checkOf(item);
  if (!box)
    return;
  box.indeterminate = false;
  if (cascades(tree)) {
    checkDown(item, box.checked);
    rollUp(tree, item);
  }
  syncAria(tree);
  tree.dispatchEvent(new CustomEvent("tree-check", { bubbles: true, detail: { item, checked: box.checked, values: checkedValues(tree) } }));
}
function initChecks(tree) {
  let n = 0;
  dfDollar54(tree).find(".tree-check").toArray().forEach((box) => {
    if (!box.hasAttribute("aria-label") && !box.hasAttribute("aria-labelledby")) {
      const label = dfDollar54(box.parentElement).find(":scope > span:last-child").get(0);
      if (label) {
        label.id ||= `${tree.id || "tree"}-lbl-${n++}-${Math.random().toString(36).slice(2, 7)}`;
        box.setAttribute("aria-labelledby", label.id);
      }
    }
  });
  if (cascades(tree)) {
    dfDollar54(tree).find('[role="treeitem"]').toArray().forEach((item) => {
      const b = checkOf(item);
      if (b?.checked)
        checkDown(item, true);
    });
    const leaves = [...dfDollar54(tree).find('[role="treeitem"]').toArray()].filter((i) => !childItems(i).length);
    leaves.forEach((leaf) => rollUp(tree, leaf));
  }
  syncAria(tree);
  tree.addEventListener("change", (e) => {
    if (!e.target.matches?.(".tree-check"))
      return;
    onCheck(tree, itemOf(e.target));
  });
}
function clearDrop(tree) {
  dfDollar54(tree).find("[data-drop]").toArray().forEach((r) => r.removeAttribute("data-drop"));
}
function announceMove2(tree, item) {
  const parentItem = item.parentElement.closest('[role="treeitem"]');
  const index = [...item.parentElement.children].indexOf(item);
  tree.dispatchEvent(new CustomEvent("tree-reorder", { bubbles: true, detail: { item, parent: parentItem ?? tree, index } }));
}
function initSortable(tree) {
  let dragged = null;
  const rows = () => dfDollar54(tree).find(".tree-branch-trigger, .tree-leaf").toArray();
  rows().forEach((row) => {
    if (!isDisabled2(itemOf(row)))
      row.draggable = true;
  });
  tree.addEventListener("dragstart", (e) => {
    const row = e.target.closest?.(".tree-branch-trigger, .tree-leaf");
    if (!row)
      return;
    dragged = itemOf(row);
    dragged.dataset.dragging = "";
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", row.textContent.trim());
  });
  tree.addEventListener("dragover", (e) => {
    const row = e.target.closest?.(".tree-branch-trigger, .tree-leaf");
    if (!dragged || !row)
      return;
    const target = itemOf(row);
    if (target === dragged || dragged.contains(target))
      return clearDrop(tree);
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const r = row.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height;
    const isBranch = row.matches(".tree-branch-trigger");
    const where = isBranch ? y < 0.25 ? "before" : y > 0.75 ? "after" : "inside" : y < 0.5 ? "before" : "after";
    if (row.dataset.drop !== where) {
      clearDrop(tree);
      row.dataset.drop = where;
    }
  });
  tree.addEventListener("dragleave", (e) => {
    if (!tree.contains(e.relatedTarget))
      clearDrop(tree);
  });
  tree.addEventListener("drop", (e) => {
    const row = dfDollar54(tree).find("[data-drop]").get(0);
    if (!dragged || !row)
      return;
    e.preventDefault();
    const target = itemOf(row);
    const where = row.dataset.drop;
    if (where === "inside") {
      const details = dfDollar54(target).find(":scope > details").get(0);
      details.open = true;
      dfDollar54(details).find(":scope > .tree-group").get(0).append(dragged);
    } else {
      const ref = where === "before" ? target : target.nextSibling;
      if (ref)
        dfDollar54(ref).before(dragged);
      else
        dfDollar54(target.parentElement).append(dragged);
    }
    clearDrop(tree);
    announceMove2(tree, dragged);
    if (tree.hasAttribute("data-checkable") && cascades(tree)) {
      dfDollar54(tree).find('[role="treeitem"]').toArray().forEach((i) => {
        if (!childItems(i).length)
          rollUp(tree, i);
      });
      syncAria(tree);
    }
  });
  tree.addEventListener("dragend", () => {
    if (dragged)
      delete dragged.dataset.dragging;
    dragged = null;
    clearDrop(tree);
  });
}
function moveByKey(tree, row, dir) {
  const item = itemOf(row);
  const sib = dir < 0 ? item.previousElementSibling : item.nextElementSibling;
  if (!sib)
    return;
  const ref = dir < 0 ? sib : sib.nextSibling;
  if (ref)
    dfDollar54(ref).before(item);
  else
    dfDollar54(item.parentElement).append(item);
  row.focus();
  announceMove2(tree, item);
}
function init55() {
  dfDollar54('.tree[role="tree"]:not([data-init])').toArray().forEach((tree) => {
    tree.dataset.init = "";
    const selectable = tree.hasAttribute("data-selectable");
    if (selectable) {
      dfDollar54(tree).find('[role="treeitem"]').toArray().forEach((item) => {
        if (!isDisabled2(item) && !item.hasAttribute("aria-selected"))
          item.setAttribute("aria-selected", "false");
      });
    }
    if (tree.hasAttribute("data-checkable"))
      initChecks(tree);
    if (tree.hasAttribute("data-sortable"))
      initSortable(tree);
    const checkable = tree.hasAttribute("data-checkable");
    tree.addEventListener("click", (e) => {
      const row = e.target.closest(".tree-branch-trigger, .tree-leaf");
      if (!row || !tree.contains(row))
        return;
      const item = itemOf(row);
      if (isDisabled2(item)) {
        e.preventDefault();
        return;
      }
      if (selectable)
        selectItem(tree, item);
      const box = checkOf(item);
      if (checkable && !selectable && box && row.matches(".tree-leaf") && e.target !== box && !box.disabled) {
        box.checked = !box.checked;
        onCheck(tree, item);
      }
    });
    dfDollar54(tree).find(".tree-branch").toArray().forEach((details) => {
      const treeitem = details.closest('[role="treeitem"]');
      if (!treeitem)
        return;
      details._defaultOpen = details.open;
      bindComponent(details, treeViewApi);
      details.addEventListener("toggle", () => {
        treeitem.setAttribute("aria-expanded", String(details.open));
        details.dataset.stateName = details.open ? "expanded" : "default";
      });
    });
    tree.addEventListener("keydown", (e) => {
      const target = e.target.closest(".tree-branch-trigger, .tree-leaf");
      if (!target)
        return;
      const allItems = Array.from(dfDollar54(tree).find(".tree-branch-trigger, .tree-leaf").toArray());
      const visibleItems = allItems.filter((item) => item.checkVisibility());
      const index = visibleItems.indexOf(target);
      if (e.altKey && tree.hasAttribute("data-sortable") && (e.key === "ArrowUp" || e.key === "ArrowDown")) {
        e.preventDefault();
        moveByKey(tree, target, e.key === "ArrowUp" ? -1 : 1);
        return;
      }
      if (e.key === " " && checkable) {
        const box = checkOf(itemOf(target));
        if (box && !box.disabled && !isDisabled2(itemOf(target))) {
          e.preventDefault();
          box.checked = !box.checked;
          onCheck(tree, itemOf(target));
          return;
        }
      }
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
            if (detailsR && !detailsR.open && !isDisabled2(itemOf(target)))
              detailsR.open = true;
          }
          break;
        case "Enter":
        case " ": {
          const item = itemOf(target);
          if (isDisabled2(item)) {
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
init55();
new MutationObserver(init55).observe(document, { childList: true, subtree: true });

// src/components/typewriter/typewriter.ts
var df$56 = defussGlobals();
var dfDollar55 = defussQuery();
var typewriterStates = ["default", "paused", "done"];
var num5 = (el, key, fallback) => {
  const v = parseFloat(el.dataset[key]);
  return Number.isFinite(v) && v >= 0 ? v : fallback;
};
var reducedMotion7 = () => globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
var graphemes = (text) => globalThis.Intl?.Segmenter ? Array.from(new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(text), (s) => s.segment) : Array.from(text);
function paint6(tw, index, count) {
  const src = tw._sources[index];
  tw._text.textContent = src.chars.slice(0, count).join("");
  tw._text.className = `typewriter-text${src.className ? ` ${src.className}` : ""}`;
  tw._text.setAttribute("style", src.style);
  tw.dataset.index = String(index);
  tw._index = index;
  tw._count = count;
}
var phase = (tw, name) => {
  tw.dataset.phase = name;
};
function stop2(tw) {
  clearTimeout(tw._timer);
  tw._timer = 0;
}
function keyDelay(tw, base) {
  if (!tw.hasAttribute("data-variable"))
    return base;
  return base * (0.5 + Math.random());
}
function step(tw) {
  if (!tw.isConnected)
    return stop2(tw);
  const src = tw._sources[tw._index];
  const last = tw._index === tw._sources.length - 1;
  const loop = tw.hasAttribute("data-loop");
  const next = (fn, ms) => {
    tw._timer = setTimeout(() => fn(tw), ms);
  };
  if (tw._deleting) {
    if (tw._count > 0) {
      phase(tw, "deleting");
      paint6(tw, tw._index, tw._count - 1);
      return next(step, keyDelay(tw, num5(tw, "deleteSpeed", 35)));
    }
    tw._deleting = false;
    paint6(tw, (tw._index + 1) % tw._sources.length, 0);
    return next(step, num5(tw, "speed", 70));
  }
  if (tw._count < src.chars.length) {
    phase(tw, "typing");
    paint6(tw, tw._index, tw._count + 1);
    return next(step, keyDelay(tw, num5(tw, "speed", 70)));
  }
  tw.dispatchEvent(new CustomEvent("typewriter-typed", { bubbles: true, detail: { index: tw._index, text: src.text } }));
  if (last && !loop)
    return finish2(tw);
  phase(tw, "holding");
  tw._deleting = true;
  return next(step, num5(tw, "pause", 1500));
}
function finish2(tw) {
  typewriterApi.setState(tw, "done", { index: tw._index });
  tw.dispatchEvent(new CustomEvent("typewriter-done", { bubbles: true, detail: { index: tw._index } }));
}
function stepInstant(tw) {
  if (!tw.isConnected)
    return stop2(tw);
  const last = tw._index === tw._sources.length - 1;
  paint6(tw, tw._index, tw._sources[tw._index].chars.length);
  phase(tw, "idle");
  if (last && !tw.hasAttribute("data-loop"))
    return finish2(tw);
  tw._timer = setTimeout(() => {
    paint6(tw, (tw._index + 1) % tw._sources.length, 0);
    stepInstant(tw);
  }, num5(tw, "pause", 1500) + 1000);
}
function run3(tw, delay = 0) {
  stop2(tw);
  const go = () => reducedMotion7() ? stepInstant(tw) : step(tw);
  if (delay)
    tw._timer = setTimeout(go, delay);
  else
    go();
}
function applyMarkup53(_el, _stateName) {}
function triggerStateChange56(tw, stateName, config, previous) {
  const count = tw._sources.length;
  const asked = config.index === undefined || config.index === "" ? NaN : Number(config.index);
  const pick = Number.isInteger(asked) ? Math.min(Math.max(asked, 0), count - 1) : undefined;
  switch (stateName) {
    case "default":
      if (pick === undefined && previous === "paused") {
        run3(tw);
        break;
      }
      tw._deleting = false;
      paint6(tw, pick ?? 0, 0);
      phase(tw, "idle");
      run3(tw, config.immediate ? 0 : num5(tw, "startDelay", 0));
      break;
    case "paused":
      stop2(tw);
      phase(tw, "idle");
      break;
    case "done": {
      stop2(tw);
      const index = pick ?? tw._index ?? 0;
      paint6(tw, index, tw._sources[index].chars.length);
      phase(tw, "idle");
      break;
    }
  }
}
var typewriterApi = componentState({
  component: "typewriter",
  states: typewriterStates,
  apply: (tw, state, previous) => {
    tw.dataset.stateName = state.name;
    triggerStateChange56(tw, state.name, state.config, previous.name);
  },
  markup: (el, state) => applyMarkup53(el, state.name)
});
df$56.typewriterApi = typewriterApi;
df$56.typewriterStates = typewriterStates;
function init56() {
  dfDollar55(".typewriter:not([data-init])").toArray().forEach((tw) => {
    tw.dataset.init = "";
    const children = Array.from(tw.children);
    if (!children.length)
      return;
    tw._sources = children.map((c) => ({
      text: c.textContent ?? "",
      chars: graphemes(c.textContent ?? ""),
      className: c.getAttribute("class") ?? "",
      style: c.getAttribute("style") ?? ""
    }));
    children.forEach((c) => c.classList.add("typewriter-source"));
    const line = document.createElement("span");
    line.className = "typewriter-line";
    line.setAttribute("aria-hidden", "true");
    tw._text = document.createElement("span");
    tw._text.className = "typewriter-text";
    const cursor = document.createElement("span");
    cursor.className = "typewriter-cursor";
    line.append(tw._text, cursor);
    tw.append(line);
    if (tw.hasAttribute("data-reserve")) {
      const ghost = document.createElement("span");
      ghost.className = "typewriter-ghost";
      ghost.setAttribute("aria-hidden", "true");
      tw._sources.forEach((s) => {
        const g = document.createElement("span");
        g.textContent = s.text;
        dfDollar55(ghost).append(g);
      });
      tw.append(ghost);
    }
    bindComponent(tw, typewriterApi);
    paint6(tw, 0, 0);
    phase(tw, "idle");
    tw.dataset.stateName = "default";
    if (tw.dataset.trigger === "visible" && globalThis.IntersectionObserver) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          io.disconnect();
          typewriterApi.setState(tw, "default", {});
        }
      });
      io.observe(tw);
    } else {
      typewriterApi.setState(tw, "default", {});
    }
  });
}
init56();
new MutationObserver(init56).observe(document, { childList: true, subtree: true });

// src/components/virtual-list/virtual-list.ts
var df$57 = defussGlobals();
var dfDollar56 = defussQuery();
var virtualListStates = ["default", "loading", "empty"];
var columnsOf = (list) => Math.max(1, parseInt(list.dataset.columns || "1", 10) || 1);
var itemCount = (list) => list._source ? list._result.entries.length : list._count;
var rowCount = (list) => Math.ceil(itemCount(list) / columnsOf(list));
var listSizer = (list) => sizerHeight(rowCount(list), list._rowHeight);
function fill2(list, el, index) {
  if (!list._source)
    return list._renderRow(el, index);
  const entry = list._result.entries[index];
  list._render(el, entry.row, { index, ...entry.meta });
}
function renderRows3(list) {
  const rows = list._rows;
  if (!rows)
    return;
  const count = itemCount(list);
  const cols = columnsOf(list);
  const total = rowCount(list);
  const { first, count: pool, shift } = virtualWindow(list.scrollTop, list.clientHeight, list._rowHeight, total);
  while (rows.children.length < pool) {
    const row = document.createElement("div");
    row.className = "virtual-list-row";
    row.setAttribute("role", cols > 1 ? "row" : "listitem");
    dfDollar56(rows).append(row);
  }
  while (rows.children.length > pool) {
    rows.lastElementChild.remove();
  }
  rows.style.translate = `0 ${shift}px`;
  for (let i = 0;i < rows.children.length; i++) {
    const row = rows.children[i];
    const index = first + i;
    if (row._index === index)
      continue;
    row._index = index;
    row.dataset.index = String(index);
    if (cols === 1) {
      row.setAttribute("aria-posinset", String(index + 1));
      row.setAttribute("aria-setsize", String(count));
      fill2(list, row, index);
      continue;
    }
    row.setAttribute("aria-rowindex", String(index + 1));
    while (row.children.length < cols) {
      const cell = document.createElement("div");
      cell.className = "virtual-list-cell";
      cell.setAttribute("role", "gridcell");
      dfDollar56(row).append(cell);
    }
    for (let c = 0;c < cols; c++) {
      const cell = row.children[c];
      const itemIndex = index * cols + c;
      cell.setAttribute("aria-colindex", String(c + 1));
      if (itemIndex >= count) {
        cell.hidden = true;
        cell.dataset.index = "";
        continue;
      }
      cell.hidden = false;
      cell.dataset.index = String(itemIndex);
      fill2(list, cell, itemIndex);
    }
  }
}
var defaultRenderRow = (row, index) => {
  row.textContent = `Row ${index + 1}`;
};
function applyMarkup54(el, stateName) {
  dfDollar56(el).attr("data-state", stateName).attr("aria-busy", stateName === "loading" ? "true" : null);
}
function refresh3(list, config) {
  if (list._source)
    list._result = list._source.query({ filters: config.filters, sorters: config.sorters });
  const sizer = list._rows?.parentElement;
  if (sizer)
    sizer.style.height = `${listSizer(list)}px`;
  if (columnsOf(list) > 1)
    list.setAttribute("aria-rowcount", String(rowCount(list)));
  if (list._rows) {
    Array.from(list._rows.children).forEach((row) => {
      row._index = -1;
    });
  }
  return itemCount(list);
}
function triggerStateChange57(list, stateName, config, incoming = config) {
  if (list._source && stateName !== "loading" && !refresh3(list, config) && stateName === "default")
    stateName = "empty";
  list.dataset.state = stateName;
  list.dataset.stateName = stateName;
  switch (stateName) {
    case "default":
      list.removeAttribute("aria-busy");
      renderRows3(list);
      if (typeof incoming.index === "number") {
        const item = Math.floor(Math.max(0, Math.min(itemCount(list) - 1, incoming.index)) / columnsOf(list));
        list.scrollTop = scrollTopFor(item, list.clientHeight, list._rowHeight, rowCount(list));
        renderRows3(list);
      }
      break;
    case "loading":
      list.setAttribute("aria-busy", "true");
      break;
    case "empty":
      list.removeAttribute("aria-busy");
      break;
  }
}
var virtualListApi = componentState({
  component: "virtual-list",
  states: virtualListStates,
  mergeConfig: true,
  apply: (list, state, _previous, incoming) => triggerStateChange57(list, state.name, state.config, incoming),
  markup: (el, state) => applyMarkup54(el, state.name)
});
df$57.virtualListApi = virtualListApi;
df$57.virtualListStates = virtualListStates;
df$57.virtualList = {
  setData(list, count, renderRow) {
    list._source = null;
    list._count = Math.max(0, Math.floor(count) || 0);
    if (renderRow)
      list._renderRow = renderRow;
    refresh3(list, {});
    if (list.store)
      virtualListApi.setState(list, list._count ? "default" : "empty");
  },
  setSource(list, rows, { render, idField = "id", query = {} } = {}) {
    list._source = dataSource(rows, { idField });
    list._result = list._source.query(query);
    if (render)
      list._render = render;
    list._render ??= (el, record) => {
      el.textContent = String(record[idField]);
    };
    if (list.store)
      virtualListApi.setState(list, "default", { filters: [], sorters: [], ...query });
    else
      list._pendingQuery = query;
  },
  query(list, query) {
    virtualListApi.setState(list, "default", query);
  },
  rows(list) {
    return list._source ? list._result.entries.map((entry) => entry.row) : [];
  }
};
if (!document.__virtualListQueryInit) {
  document.__virtualListQueryInit = true;
  const target = (el, attr) => dfDollar56("#" + CSS.escape(el.getAttribute(attr))).get(0);
  document.addEventListener("input", (e) => {
    const input = e.target.closest?.("[data-virtual-list-filter]");
    const list = input && target(input, "data-virtual-list-filter");
    if (!list?._source || !list.store)
      return;
    clearTimeout(list._filterTimer);
    list._filterTimer = setTimeout(() => {
      const filters = dfDollar56(`[data-virtual-list-filter="${CSS.escape(list.id)}"]`).toArray().map((el) => parseFilter(el.dataset.field || list._source.idField, el.value, el.dataset.kind || "text")).filter(Boolean);
      virtualListApi.setState(list, "default", { filters });
    }, 150);
  });
  document.addEventListener("change", (e) => {
    const select = e.target.closest?.("[data-virtual-list-sort]");
    const list = select && target(select, "data-virtual-list-sort");
    if (!list?._source || !list.store)
      return;
    const [field, direction] = select.value.split(":");
    virtualListApi.setState(list, "default", { sorters: field ? [{ field, direction: direction === "desc" ? "desc" : "asc" }] : [] });
  });
}
function init57() {
  dfDollar56(".virtual-list:not([data-init])").toArray().forEach((list) => {
    list.dataset.init = "";
    let sizer = dfDollar56(list).find(".virtual-list-sizer").get(0);
    if (!sizer) {
      sizer = document.createElement("div");
      sizer.className = "virtual-list-sizer";
      dfDollar56(list).append(sizer);
    }
    let rows = dfDollar56(sizer).find(".virtual-list-rows").get(0);
    if (!rows) {
      rows = document.createElement("div");
      rows.className = "virtual-list-rows";
      dfDollar56(sizer).append(rows);
    }
    list._rows = rows;
    list._renderRow = list._renderRow || defaultRenderRow;
    list._rowHeight = parseFloat(getComputedStyle(list).getPropertyValue("--virtual-list-row-height")) || 40;
    if (typeof list._count !== "number") {
      list._count = parseInt(list.dataset.count || "0", 10) || 0;
    }
    const cols = columnsOf(list);
    list.setAttribute("role", cols > 1 ? "grid" : "list");
    if (cols > 1)
      list.setAttribute("aria-colcount", String(cols));
    if (!list.hasAttribute("tabindex"))
      list.tabIndex = 0;
    sizer.style.height = `${listSizer(list)}px`;
    let queued = false;
    list.addEventListener("scroll", () => {
      if (queued)
        return;
      queued = true;
      requestAnimationFrame(() => {
        queued = false;
        if (list.dataset.state !== "loading" && list.dataset.state !== "empty")
          renderRows3(list);
      });
    }, { passive: true });
    new ResizeObserver(() => {
      if (list.dataset.state !== "loading" && list.dataset.state !== "empty")
        renderRows3(list);
    }).observe(list);
    bindComponent(list, virtualListApi);
    if (list._source)
      virtualListApi.setState(list, "default", { filters: [], sorters: [], ...list._pendingQuery });
    else
      virtualListApi.setState(list, list._count ? "default" : "empty");
  });
}
init57();
new MutationObserver(init57).observe(document, { childList: true, subtree: true });

// src/components/window/window.ts
var df$58 = defussGlobals();
var dfDollar57 = defussQuery();
var windowStates = ["default", "maximized", "minimized", "closed"];
var topZ = 10;
var KEEP = 48;
var resolve11 = (target) => typeof target === "string" ? dfDollar57("#" + CSS.escape(target)).get(0) ?? dfDollar57(target).get(0) : target;
var titleOf2 = (w) => dfDollar57(w).find(".window-title").get(0)?.textContent?.trim() ?? "";
var posOf = (w) => ({ x: w.offsetLeft, y: w.offsetTop });
function moveTo(w, x, y) {
  const parent = w.offsetParent;
  const bar = dfDollar57(w).find(".window-titlebar").get(0);
  if (parent) {
    const ctl = dfDollar57(w).find(".window-controls").get(0)?.offsetWidth ?? 0;
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
  dfDollar57(".window[data-active]").toArray().forEach((o) => {
    if (o !== w)
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
function activateTopmost() {
  const open = Array.from(dfDollar57(".window[open]").toArray());
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
function applyMarkup55(el, stateName) {
  const open = stateName !== "closed";
  dfDollar57(el).attr("open", open ? "" : null);
  dfDollar57(el).attr("data-maximized", stateName === "maximized" ? "" : null);
  dfDollar57(el).attr("data-minimized", stateName === "minimized" ? "" : null);
  dfDollar57(el).find(".window-maximize").attr("aria-label", stateName === "maximized" ? "Restore" : "Maximize");
  dfDollar57(el).find(".window-minimize").attr("aria-label", stateName === "minimized" ? "Restore" : "Minimize");
}
function triggerStateChange58(w, stateName, config) {
  const maxBtn = dfDollar57(w).find(".window-maximize").get(0);
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
  dfDollar57(w).find(".window-minimize").get(0)?.setAttribute("aria-label", stateName === "minimized" ? "Restore" : "Minimize");
}
var windowApi = componentState({
  component: "window",
  states: windowStates,
  apply: (w, state) => {
    w.dataset.stateName = state.name;
    triggerStateChange58(w, state.name, state.config);
  },
  read: (w, state) => {
    const name = !w.open ? "closed" : w.dataset.stateName || "default";
    return { name, config: name === "closed" ? {} : state.config };
  },
  markup: (el, state) => applyMarkup55(el, state.name)
});
df$58.windowApi = windowApi;
df$58.windowStates = windowStates;
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
function init58() {
  dfDollar57("dialog.window:not([data-init])").toArray().forEach((w) => {
    w.dataset.init = "";
    const bar = dfDollar57(w).find(":scope > .window-titlebar").get(0);
    if (bar) {
      if (!bar.hasAttribute("tabindex"))
        bar.tabIndex = 0;
      bindDrag(w, bar);
    }
    if (!w.hasAttribute("aria-labelledby") && !w.hasAttribute("aria-label")) {
      const title = dfDollar57(w).find(".window-title").get(0);
      if (title) {
        if (!title.id)
          title.id = `window-title-${Math.random().toString(36).slice(2, 8)}`;
        w.setAttribute("aria-labelledby", title.id);
      }
    }
    w.addEventListener("pointerdown", () => raise(w), true);
    w.addEventListener("focusin", () => raise(w));
    dfDollar57(w).find(".window-maximize").get(0)?.addEventListener("click", () => windowApi.setState(w, w.hasAttribute("data-maximized") ? "default" : "maximized", {}));
    dfDollar57(w).find(".window-close").get(0)?.addEventListener("click", (e) => {
      e.preventDefault();
      windowApi.setState(w, "closed", {});
    });
    dfDollar57(w).find(".window-minimize").get(0)?.addEventListener("click", () => windowApi.setState(w, w.hasAttribute("data-minimized") ? "default" : "minimized", {}));
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
    dfDollar57(w).find(".window-maximize").attr("aria-label", initial === "maximized" ? "Restore" : "Maximize");
    dfDollar57(w).find(".window-minimize").attr("aria-label", initial === "minimized" ? "Restore" : "Minimize");
    if (w.open) {
      w.style.zIndex = String(++topZ);
      dfDollar57(".window[data-active]").toArray().forEach((o) => o.removeAttribute("data-active"));
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
  const host = resolve11(parent) ?? dfDollar57(".window-desktop").get(0) ?? document.body;
  const w = document.createElement("dialog");
  w.className = "window";
  if (id)
    w.id = id;
  if (chrome)
    w.dataset.chrome = chrome;
  if (resizable)
    w.setAttribute("data-resizable", "");
  const count = dfDollar57(host).find(":scope > .window").toArray().length;
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
  init58();
  showQuietly(w);
  if (focus)
    windowApi.setState(w, "default", {});
  if (icon)
    globalThis.lucide?.createIcons?.();
  return w;
}
var list2 = (scope, all = false) => dfDollar57(resolve11(scope) ?? document).find(all ? ".window" : ".window[open]").toArray();
function cascade(scope, step = 28) {
  list2(scope).sort((a, b) => Number(a.style.zIndex || 0) - Number(b.style.zIndex || 0)).forEach((w, i) => {
    windowApi.setState(w, "default", {});
    moveTo(w, 16 + i * step, 16 + i * step);
  });
}
function tile(scope) {
  const wins = list2(scope);
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
    const w = resolve11(target);
    if (w)
      windowApi.setState(w, "default", config);
    return w;
  },
  close: (target) => {
    const w = resolve11(target);
    if (w)
      windowApi.setState(w, "closed", {});
    return w;
  },
  focus: (target) => {
    const w = resolve11(target);
    if (w?.open)
      raise(w);
    return w;
  },
  move: (target, x, y) => {
    const w = resolve11(target);
    return w ? moveTo(w, x, y) : null;
  },
  resize: (target, width, height) => {
    const w = resolve11(target);
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
    const w = resolve11(target);
    if (w)
      windowApi.setState(w, "maximized", {});
    return w;
  },
  minimize: (target) => {
    const w = resolve11(target);
    if (w)
      windowApi.setState(w, "minimized", {});
    return w;
  },
  restore: (target) => {
    const w = resolve11(target);
    if (w)
      windowApi.setState(w, "default", {});
    return w;
  },
  toggleMaximize: (target) => {
    const w = resolve11(target);
    if (w)
      windowApi.setState(w, w.hasAttribute("data-maximized") ? "default" : "maximized", {});
    return w;
  },
  active: () => dfDollar57(".window[open][data-active]").get(0),
  list: list2,
  cascade,
  tile
};
df$58.win = windowActions;
init58();
new MutationObserver(init58).observe(document, { childList: true, subtree: true });

//# debugId=8B7733A8D23F392964756E2164756E21
/* defuss-shadcn v0.9.6 runtime provenance: bundles defuss-morph@0.2.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599) + defuss-query@0.2.0 (MIT, sha256:6265fec10f843f2aa8bf9f2a44bbf584dbb0dcbfef8a37a53dd04848f7ab4599); full notice: NOTICE.txt */
//# sourceMappingURL=all.js.map
