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


declare class WebComponentizedDialog extends HTMLDialogElement {
  static readonly observedAttributes? : Array<string>;

  connectedCallback? : () => void;
  adoptedCallback? : () => void;
  disconnectedCallback? : (oldDocument : Document, newDocument : Document) => void;
  attributeChangedCallback? : (name : string, oldValue : string, newValue : string) => void;
}

export default function (DialogElement : typeof WebComponentizedDialog) {
  // Set the undocumented property to keep focus on the dialog when opening
  Object.defineProperty(DialogElement, '_focusChildrenOnOpen', {
    enumerable: false,
    configurable: false,
    value: true
  });


  // Overriding behaviour for showModal():
  //
  // * Ensure clicking the backdrop will close the modal
  const _showModal = DialogElement.prototype.showModal;
  DialogElement.prototype.showModal = function(this : HTMLDialogElement) {
    _showModal.apply(this, arguments as any);

    this.addEventListener('click', backdropClickHandler);
  };


  // Overriding behaviour for close():
  //
  // * Remove the backdrop click event listener
  const _close = DialogElement.prototype.close;
  DialogElement.prototype.close = function(this : HTMLDialogElement) {
    _close.apply(this, arguments as any);

    this.removeEventListener('click', backdropClickHandler);
  };


  // Overriding behaviour for connectedCallback(): (if it exists)
  //
  // * Add tabindex to force the dialog to be focusable
  const _connectedCallback = DialogElement.prototype.connectedCallback;
  if (_connectedCallback) {
    DialogElement.prototype.connectedCallback = function(this : HTMLDialogElement) {
      _connectedCallback.apply(this, arguments as any);

      // Ensure the dialog is focusable
      if (!this.hasAttribute('tabindex')) {
        this.tabIndex = -1;
      }
    };
  }


  // Overriding behaviour for disconnectedCallback(): (if it exists)
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
