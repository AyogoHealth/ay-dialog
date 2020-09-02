/* Copyright 2019 Ayogo Health Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to
 * deal in the Software without restriction, including without limitation the
 * rights to use, copy, modify, merge, publish, distribute, sublicense, and/or
 * sell copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
 * IN THE SOFTWARE.
 */

const POLYFILL_STYLES = [
  'dialog-sentinel {',
  '    display: none;',
  '}',
  '',
  'dialog-backdrop {',
  '    position: fixed;',
  '    top: 0;',
  '    left: 0;',
  '    height: 100vh;',
  '    width: 100vw;',
  '    background: rgba(0, 0, 0, 0.1);',
  '    display: flex;',
  '    justify-content: center;',
  '    justify-content: safe center;',
  '    align-items: center;',
  '    align-items: safe center;',
  '    overflow: auto;',
  '    overscroll-behavior: contain;',
  '    touch-action: none;',
  '    z-index: 2147483647;',
  '    -webkit-overflow-scrolling: touch;',
  '    isolation: isolate;',
  '}'
].join('\n');

const DIALOG_STYLES = [
  'dialog, ay-dialog {',
  '    display: block;',
  '    position: absolute;',
  '    top: auto;',
  '    bottom: auto;',
  '    left: auto;',
  '    right: auto;',
  '    width: -webkit-fit-content;',
  '    width: -moz-fit-content;',
  '    width: fit-content;',
  '    height: -webkit-fit-content;',
  '    height: -moz-fit-content;',
  '    height: fit-content;',
  '    block-size: -webkit-fit-content;',
  '    block-size: -moz-fit-content;',
  '    block-size: fit-content;',
  '    inline-size: -webkit-fit-content;',
  '    inline-size: -moz-fit-content;',
  '    inline-size: fit-content;',
  '    margin: auto !important;',
  '    max-height: 100vh;',
  '    padding: 1em;',
  '    background: white;',
  '    background: -apple-system-text-background;',
  '    color: black;',
  '    color: text;',
  '    border: solid;',
  '    overflow: auto;',
  '    -webkit-overflow-scrolling: touch;',
  '}',
  '',
  'dialog:focus, ay-dialog:focus {',
  '    outline: 0 none;',
  '}',
  '',
  'dialog:not([open]), ay-dialog:not([open]) {',
  '    display: none;',
  '}'
].join('\n');

// This query is adapted from a11y-dialog
// https://github.com/edenspiekermann/a11y-dialog/blob/cf4ed81/a11y-dialog.js#L6-L18
const focusableElements = [
  'a[href]:not([tabindex^="-"]):not([inert])',
  'area[href]:not([tabindex^="-"]):not([inert])',
  'input:not(:disabled):not([tabindex^="-"]):not([inert])',
  'select:not(:disabled):not([tabindex^="-"]):not([inert])',
  'textarea:not(:disabled):not([tabindex^="-"]):not([inert])',
  'button:not(:disabled):not([tabindex^="-"]):not([inert])',
  'iframe:not([tabindex^="-"]):not([inert])',
  'object:not([tabindex^="-"]):not([inert])',
  'embed:not([tabindex^="-"]):not([inert])',
  'details:not([tabindex^="-"]):not([inert])',
  'summary:not([tabindex^="-"]):not([inert])',
  '[contenteditable]:not([contenteditable="false"]):not([tabindex^="-"]):not([inert])',
  '[tabindex]:not([tabindex^="-"]):not([inert])',
  'audio[controls]:not([tabindex^="-"]):not([inert])',
  'video[controls]:not([tabindex^="-"]):not([inert])'
].join(',');

const hasWeakMap = ('WeakMap' in window);

// Map of dialog return values (for IDL safety)
const retValMap : WeakMap<HTMLDialogElement, string>          = hasWeakMap ? new WeakMap() : new Map();

// Map of dialogs to their backdrop containers
const backdropMap : WeakMap<HTMLDialogElement, HTMLElement>   = hasWeakMap ? new WeakMap() : new Map();

// Map of dialogs to their original DOM positions
const sentinelMap : WeakMap<HTMLDialogElement, HTMLElement>   = hasWeakMap ? new WeakMap() : new Map();

// Map of top layer elements to their original aria-hidden value
const origAriaHidden : WeakMap<HTMLElement, string|null>      = hasWeakMap ? new WeakMap() : new Map();

// Stack of the "top layer" elements
const topLayerStack : Array<HTMLElement> = [];

// Whether the dialog polyfill styles have been added to the page
let initialized : boolean = false;


let DOMExceptionCtor : typeof DOMException = DOMException;
try {
  new DOMExceptionCtor('test', 'NotSupportedError');
} catch(ex) {
  const NameToCode : { [name: string] : number } = {
    'InvalidStateError': 11
  };

  DOMExceptionCtor = (function(this : DOMException, message : string, name : string) {
    Object.setPrototypeOf(this, DOMException.prototype);

    Object.defineProperty(this, 'message', { value: message });
    Object.defineProperty(this, 'name', { value: name });
    Object.defineProperty(this, 'code', { value: NameToCode[name] });
  } as any);
}


// Add default styling for the dialog
function addStyles(styles : string) {
  const dlgStyle = document.createElement('style');
  dlgStyle.appendChild(document.createTextNode(styles));

  let insertPoint : HTMLElement | null;
  if (insertPoint = document.querySelector('link')) {
    insertPoint.parentNode!.insertBefore(dlgStyle, insertPoint);
  } else if (insertPoint = document.querySelector('style')) {
    insertPoint.parentNode!.insertBefore(dlgStyle, insertPoint);
  } else if (insertPoint = document.querySelector('head')) {
    insertPoint.appendChild(dlgStyle);
  } else {
    document.appendChild(dlgStyle);
  }
}


// Run dialog focusing steps
function dialogFocusSteps(dialog : HTMLDialogElement, focusChild : boolean) {
  if (focusChild === undefined) {
    focusChild = true;
  }
  let control : HTMLElement | null = null;

  const autofocuses = dialog.querySelectorAll<HTMLElement>('[autofocus]:not(:disabled):not([tabindex^="-"]):not([inert])');
  for (let i = 0; i < autofocuses.length; i++) {
    // Need to ensure that the autofocus element is actually focusable
    if (!autofocuses[i].offsetWidth || !autofocuses[i].offsetHeight) {
      continue;
    }

    control = autofocuses[i];
    break;
  }

  if (!control && focusChild) {
    control = dialogFocusFirstChild(dialog);
  }

  if (!control) {
    control = dialog;
  }

  control.focus();
}


// Focus the first focusable child of the dialog element
function dialogFocusFirstChild(dialog : HTMLDialogElement) {
  let control : HTMLElement | null = null;

  const focusables = dialog.querySelectorAll<HTMLElement>(focusableElements);

  for (let i = 0; i < focusables.length; i++) {
    if (!focusables[i].offsetWidth || !focusables[i].offsetHeight) {
      continue;
    }

    control = focusables[i];
    break;
  }

  return control;
}


// Click handler to forward backdrop clicks to the dialog
function backdropClickHandler(dialog : HTMLDialogElement) {
  return function(e : MouseEvent) {
    if (!e.target || !(e.target instanceof HTMLElement) || e.target.tagName.toLowerCase() !== 'dialog-backdrop') {
      return;
    }

    let evt : MouseEvent;

    try {
      evt = new MouseEvent(e.type, {
        bubbles:        e.bubbles,
        cancelable:     e.cancelable,
        view:           e.view,
        detail:         e.detail,
        screenX:        e.screenX,
        screenY:        e.screenY,
        clientX:        e.clientX,
        clientY:        e.clientY,
        ctrlKey:        e.ctrlKey,
        altKey:         e.altKey,
        shiftKey:       e.shiftKey,
        metaKey:        e.metaKey,
        button:         e.button,
        relatedTarget:  e.relatedTarget
      });
    } catch(ex) {
      evt = dialog.ownerDocument!.createEvent('MouseEvent');
      evt.initMouseEvent(e.type, e.bubbles, e.cancelable, e.view!,
        e.detail, e.screenX, e.screenY, e.clientX, e.clientY,
        e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button,
        e.relatedTarget);
    }

    dialog.dispatchEvent(evt);

    e.stopPropagation();
    return false;
  };
}


// Handler for the escape key when a dialog is open
function escapeKeyHandler(evt : KeyboardEvent) {
  if (evt.defaultPrevented || evt.keyCode !== 27 || !evt.target) {
    return;
  }

  const input = (evt.target as HTMLElement).closest('input') as HTMLInputElement;

  // Don't capture escape in text fields
  if (input && ['button', 'submit', 'reset', 'checkbox', 'radio', 'range'].indexOf(input.type) === -1) {
    return;
  }

  const dlg = (evt.target as HTMLElement).closest('dialog,ay-dialog') as HTMLDialogElement;

  if (!dlg || !dlg.open || !backdropMap.has(dlg)) {
    return;
  }

  let cancel : Event;
  try {
    cancel = new Event('cancel', { bubbles: false, cancelable: true });
  } catch(e) {
    cancel = dlg.ownerDocument!.createEvent('Event');
    cancel.initEvent('cancel', false, true);
  }

  // Native events are dispatched asynchronously
  requestAnimationFrame(function() {
    if (dlg.dispatchEvent(cancel)) {
      dlg.close();
    }
  });
}


// Ensure elements that are not in the top layer are not accessible
function applyInertness() {
  // Loop over all the elements, *except* the top one
  for (let i = 0; i < topLayerStack.length - 1; i++) {
    const el = topLayerStack[i];

    if (!origAriaHidden.has(el)) {
      origAriaHidden.set(el, el.getAttribute('aria-hidden'));
      el.setAttribute('aria-hidden', 'true');
    }

    const active = document.activeElement;
    if (el.contains(active)) {
      if (active && ('blur' in active) && active !== document.body) {
        (active as HTMLElement).blur();
      }
      document.body.focus();
    }
  }

  const topEl = topLayerStack[topLayerStack.length - 1];

  if (origAriaHidden.has(topEl)) {
    const value = origAriaHidden.get(topEl);
    if (value) {
      topEl.setAttribute('aria-hidden', value);
    } else {
      topEl.removeAttribute('aria-hidden');
    }
    origAriaHidden.delete(topEl);
  }
}


function checkInertFocus(evt : FocusEvent) {
  let topEl;

  for (let i = topLayerStack.length; i > 0; i--) {
    topEl = topLayerStack[i - 1];

    // Edge case where a dialog is removed and then code is run before the
    // mutation observer kicks in
    if (topEl.isConnected) {
      break;
    }
  }

  if (!(topEl instanceof AyDialogElement)) {
    return;
  }

  if (evt.target instanceof HTMLElement && evt.target !== topEl && !topEl.contains(evt.target)) {
    evt.preventDefault();
    evt.stopPropagation();
    evt.target.blur();

    const el = dialogFocusFirstChild(topEl as HTMLDialogElement);
    if (el) {
      el.focus();
    }
  }
}


function AyDialogElement(this : HTMLDialogElement) {
  var _this = this;
  try {
    const _newTarget = this && this instanceof AyDialogElement ? this.constructor : void 0;
    if (_newTarget) {
      _this = Reflect.construct(HTMLElement, [], _newTarget);
    }
  } catch(e) { }

  _this.addEventListener('keydown', escapeKeyHandler);

  return _this;
}

AyDialogElement.prototype = Object.create(HTMLElement.prototype);

Object.defineProperty(AyDialogElement.prototype, 'constructor', {
  configurable: true,
  enumerable: false,
  writable: false,
  value: AyDialogElement
});

Object.defineProperty(AyDialogElement.prototype, 'open', {
  configurable: true,
  enumerable: true,
  get: function(this : HTMLDialogElement) {
    return this.hasAttribute('open');
  },
  set: function(this : HTMLDialogElement, value : boolean) {
    if (value) {
      this.setAttribute('open', '');
    } else {
      this.removeAttribute('open');
    }
  }
});

Object.defineProperty(AyDialogElement.prototype, 'returnValue', {
  configurable: true,
  enumerable: true,
  get: function(this : HTMLDialogElement) {
    return retValMap.get(this) || '';
  },
  set: function(this : HTMLDialogElement, value : string) {
    if (value !== undefined) {
      retValMap.set(this, value !== null ? value.toString() : "null");
    }
  }
});

if ('Symbol' in window) {
  Object.defineProperty(AyDialogElement.prototype, Symbol.toStringTag, {
    value: 'HTMLDialogElement',
    configurable: true,
    enumerable: false,
    writable: false
  });
}


Object.defineProperty(AyDialogElement.prototype, 'show', {
  configurable: true,
  enumerable: true,
  writable: true,
  value: function(this : HTMLDialogElement) {
    if (!(this instanceof AyDialogElement)) {
      throw new TypeError("Illegal Invocation");
    }

    if (this.hasAttribute('open')) {
      return;
    }

    this.setAttribute('open', '');

    dialogFocusSteps(this, (<any>AyDialogElement)._focusChildrenOnOpen);
  }
});


Object.defineProperty(AyDialogElement.prototype, 'showModal', {
  configurable: true,
  enumerable: true,
  writable: true,
  value: function(this : HTMLDialogElement) {
    if (!(this instanceof AyDialogElement)) {
      throw new TypeError("Illegal Invocation");
    }

    if (this.hasAttribute('open')) {
      throw new DOMExceptionCtor("The element already has an 'open' attribute, and therefore cannot be opened modally.", 'InvalidStateError');
    }

    const parentNode = this.parentNode;

    if (!this.ownerDocument || !this.ownerDocument.documentElement.contains(this) || !parentNode) {
      throw new DOMExceptionCtor("The element is not connected to a document.", 'InvalidStateError');
    }

    this.setAttribute('open', '');


    if (!sentinelMap.has(this)) {
      const sentinel = this.ownerDocument!.createElement('dialog-sentinel');
      parentNode.insertBefore(sentinel, this);

      sentinelMap.set(this, sentinel);
    }


    const backdropEl = backdropMap.get(this);

    if (backdropEl) {
      backdropEl.hidden = false;
    } else {
      const backdrop = this.ownerDocument!.createElement('dialog-backdrop');
      backdrop.addEventListener('click', backdropClickHandler(this));
      this.ownerDocument!.documentElement.appendChild(backdrop);
      backdrop.appendChild(this);

      backdropMap.set(this, backdrop);
    }

    topLayerStack.push(this);
    applyInertness();

    dialogFocusSteps(this, (<any>AyDialogElement)._focusChildrenOnOpen);
  }
});


Object.defineProperty(AyDialogElement.prototype, 'close', {
  configurable: true,
  enumerable: true,
  writable: true,
  value: function(this : HTMLDialogElement) {
    if (!(this instanceof AyDialogElement)) {
      throw new TypeError("Illegal Invocation");
    }

    if (!this.open) {
      return;
    }

    this.removeAttribute('open');

    const result = arguments && arguments[0];

    // The spec is ambiguous as to whether this should be an
    // empty string or undefined. Chrome uses an empty string,
    // so we're doing the same for compatibility.
    if (result !== undefined) {
      retValMap.set(this, result !== null ? result.toString() : "null");
    }

    const idx = topLayerStack.indexOf(this);
    if (idx >= 0) {
      topLayerStack.splice(idx, 1);
      applyInertness();
    }

    const sentinel = sentinelMap.get(this);
    sentinelMap.delete(this);

    if (sentinel && sentinel.parentNode) {
      const parentNode = sentinel.parentNode;
      parentNode.insertBefore(this, sentinel);
      parentNode.removeChild(sentinel);
    }


    const backdrop = backdropMap.get(this);
    backdropMap.delete(this);

    if (backdrop && backdrop.parentNode) {
      backdrop.parentNode.removeChild(backdrop);
    }

    let evt : Event;
    try {
      evt = new Event('close', { bubbles: false, cancelable: false });
    } catch(e) {
      evt = this.ownerDocument!.createEvent('Event');
      evt.initEvent('close', false, false);
    }

    // Native events are dispatched asynchronously
    requestAnimationFrame((function(this : HTMLDialogElement) {
      this.dispatchEvent(evt);

      // Fire any onclose callbacks, because dispatchEvent won't
      if (this.onclose) {
        this.onclose(evt);
      }
    }).bind(this));
  }
});


// IE11 doesn't implement Element#remove, but the tests require it :\
if (!('remove' in AyDialogElement.prototype)) {
  Object.defineProperty(AyDialogElement.prototype, 'remove', {
    configurable: true,
    enumerable: true,
    writable: true,
    value: function(this : HTMLDialogElement) {
      if (this.parentNode) {
        this.parentNode.removeChild(this);
      }
    }
  });
}

Object.defineProperty(AyDialogElement.prototype, 'connectedCallback', {
  configurable: true,
  enumerable: false,
  value: function(this : HTMLDialogElement) {
    if (!initialized) {
      initialized = true;

      if (getComputedStyle(this).position !== 'absolute') {
        addStyles(POLYFILL_STYLES + DIALOG_STYLES);
      } else {
        addStyles(POLYFILL_STYLES);
      }

      if (!topLayerStack.length) {
        topLayerStack.push(document.body);
      }

      document.addEventListener('focus', checkInertFocus, true);
    }

    // Set the aria-role to dialog
    if (!this.hasAttribute('role')) {
      this.setAttribute('role', 'dialog');
    }
  }
});


Object.defineProperty(AyDialogElement.prototype, 'attributeChangedCallback', {
  configurable: true,
  enumerable: false,
  writable: true,
  value: function(this : HTMLDialogElement, attribute : string, _oldValue : string, _newValue : string) {
    if (attribute === 'open' && !this.hasAttribute('open')) {
      const backdrop = backdropMap.get(this);
      if (backdrop) {
        backdrop.hidden = true;
      }
    }
  }
});


Object.defineProperty(AyDialogElement.prototype, 'disconnectedCallback', {
  configurable: true,
  enumerable: false,
  writable: true,
  value: function(this : HTMLDialogElement) {
    if ((('isConnected' in this) && this.isConnected) || (this.ownerDocument!.documentElement.contains(this))) {
      return;
    }

    this.removeEventListener('keydown', escapeKeyHandler);

    const idx = topLayerStack.indexOf(this);
    if (idx >= 0) {
      topLayerStack.splice(idx, 1);
      applyInertness();
    }

    if (sentinelMap.has(this)) {
      const sentinel = sentinelMap.get(this);
      sentinelMap.delete(this);

      if (sentinel && sentinel.parentNode) {
        sentinel.parentNode.removeChild(sentinel);
      }
    }


    if (backdropMap.has(this)) {
      const backdrop = backdropMap.get(this);
      backdropMap.delete(this);

      if (backdrop && backdrop.parentNode) {
        backdrop.parentNode.removeChild(backdrop);
      }
    }

    retValMap.delete(this);
  }
});

export default AyDialogElement;
