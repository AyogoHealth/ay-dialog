/* Copyright 2020 Ayogo Health Inc.
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

import { hasWeakMap, hasWeakSet, dialogFocusSteps } from './dialog_element.js';

// Map of dialogs to their trigger element for refocusing
const prevFocusMap : WeakMap<HTMLDialogElement, HTMLElement> = hasWeakMap ? new WeakMap() : new Map();

// Set of dialogs that we've added tabIndex to
const tabIndexSet : WeakSet<HTMLDialogElement> = hasWeakSet ? new WeakSet() : new Set();

// Map of elements to their scroll positions and style attr when they become inert
const scrollPosMap : WeakMap<HTMLElement, [number, number, string|null]> = hasWeakMap ? new WeakMap() : new Map();

// Stack of the "top layer" elements -- can't reuse the one in dialog_element
// because we might be adding behaviour to a native dialog instead of our
// polyfill implementation :(
const topLayerStack : Array<HTMLElement> = [];


function findFocusedElement(root : Document|ShadowRoot) : HTMLElement|null {
  let active = root.activeElement as HTMLElement;

  if (active && active.shadowRoot) {
    const subActive = findFocusedElement(active.shadowRoot);
    if (subActive) {
      active = subActive;
    }
  }

  return active;
}

function backdropClickHandler(evt : MouseEvent) {
  if (!evt.target) {
    return;
  }

  const dlg = (evt.target as HTMLElement).closest('dialog,ay-dialog') as HTMLDialogElement;

  if (!dlg) {
    return;
  }

  const rect = dlg.getBoundingClientRect();
  const inDialog = evt.clientY >= rect.top &&
                   evt.clientY <= rect.top + rect.height &&
                   evt.clientX >= rect.left &&
                   evt.clientX <= rect.left + rect.width;

  if (inDialog) {
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
    if (dlg.dispatchEvent(cancel) && dlg.open) {
      dlg.close();
    }
  });
}

function captureScrollState(dialog : HTMLDialogElement) {
  if (topLayerStack.length === 0) {
    topLayerStack.push(<HTMLElement>document.scrollingElement || document.querySelector('body'));
  }

  const beforeTop = topLayerStack[topLayerStack.length - 1];
  const scrollTop = beforeTop.scrollTop;
  const scrollLeft = beforeTop.scrollLeft;
  scrollPosMap.set(beforeTop, [scrollTop, scrollLeft, beforeTop.getAttribute('style')]);

  if (beforeTop.scrollHeight > document.documentElement.clientHeight) {
    beforeTop.style.position = 'fixed';
    beforeTop.style.left = -scrollLeft + 'px';
    beforeTop.style.top = -scrollTop + 'px';
  }

  topLayerStack.push(dialog);
}

function restoreScrollState(dialog : HTMLDialogElement) {
  const idx = topLayerStack.indexOf(dialog);
  if (idx >= 0) {
    topLayerStack.splice(idx, 1);
  }

  const newTop = topLayerStack[topLayerStack.length - 1];
  if (idx >= 0 && scrollPosMap.has(newTop)) {
    const fields = scrollPosMap.get(newTop)!;
    const scrollTop = fields[0];
    const scrollLeft = fields[1];
    const style = fields[2];

    if (style) {
      newTop.setAttribute('style', style);
    } else {
      newTop.removeAttribute('style');
    }

    newTop.scrollTop = scrollTop;
    newTop.scrollLeft = scrollLeft;

    scrollPosMap.delete(newTop);
  }
}


declare class WebComponentizedDialog extends HTMLDialogElement {
  static readonly observedAttributes? : Array<string>;

  connectedCallback? : () => void;
  adoptedCallback? : () => void;
  disconnectedCallback? : (oldDocument : Document, newDocument : Document) => void;
  attributeChangedCallback? : (name : string, oldValue : string, newValue : string) => void;
}

export default function (DialogElement : typeof WebComponentizedDialog) {
  // Overriding behaviour for showModal():
  //
  // * Store the previously focused element
  const _show = DialogElement.prototype.show;
  DialogElement.prototype.show = function(this : HTMLDialogElement) {
    const origFocus = findFocusedElement(document);
    if (origFocus) {
      prevFocusMap.set(this, origFocus);
    }

    _show.apply(this, arguments as any);
  };


  // Overriding behaviour for showModal():
  //
  // * Add tabindex to force the dialog to be focusable
  // * Store the previously focused element
  // * Capture scroll position and prevent scrolling
  // * Ensure clicking the backdrop will close the modal
  // * Focus the dialog rather than the first focusable child
  const _showModal = DialogElement.prototype.showModal;
  DialogElement.prototype.showModal = function(this : HTMLDialogElement) {
    if (!this.hasAttribute('tabindex')) {
      tabIndexSet.add(this);
      this.tabIndex = 0;
    }

    const origFocus = findFocusedElement(document);
    if (origFocus) {
      prevFocusMap.set(this, origFocus);
    }

    captureScrollState(this);

    _showModal.apply(this, arguments as any);

    this.addEventListener('click', backdropClickHandler);
    dialogFocusSteps(this, false);
  };


  // Overriding behaviour for close():
  //
  // * Undo any tabIndex hackery from showModal
  // * Remove the backdrop click event listener
  // * Try to restore focus to the previously focused element
  // * Restore the previous scroll position
  const _close = DialogElement.prototype.close;
  DialogElement.prototype.close = function(this : HTMLDialogElement) {
    _close.apply(this, arguments as any);

    if (tabIndexSet.has(this)) {
      this.removeAttribute('tabIndex');
      tabIndexSet.delete(this);
    }

    this.removeEventListener('click', backdropClickHandler);

    if (prevFocusMap.has(this)) {
      const prevFocus = prevFocusMap.get(this);
      prevFocusMap.delete(this);

      if (prevFocus && prevFocus.focus) {
        prevFocus.focus({ preventScroll: true });
      }
    }

    restoreScrollState(this);
  };


  // Overriding behaviour for disconnectedCallback(), if it exists:
  //
  // * Remove the backdrop click event listener
  const _disconnectedCallback = DialogElement.prototype.disconnectedCallback;
  if (_disconnectedCallback) {
    DialogElement.prototype.disconnectedCallback = function(this : HTMLDialogElement) {
      _disconnectedCallback.apply(this, arguments as any);

      if ((('isConnected' in this) && this.isConnected) || (this.ownerDocument!.documentElement.contains(this))) {
        return;
      }

      this.removeEventListener('click', backdropClickHandler);
    };
  }

  return DialogElement;
}
