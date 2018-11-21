/*! Copyright (c) 2018 Ayogo Health Inc.
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

export class DialogElement {
    constructor() {
        throw new TypeError('Illegal constructor');
    }


    get open(this : HTMLDialogElement) : boolean {
        return this.hasAttribute('open');
    }

    set open(this : HTMLDialogElement, value : boolean) {
        if (value) {
            this.setAttribute('open', '');
        } else {
            this.removeAttribute('open');
        }
    }


    show(this : HTMLDialogElement) : void {
        this.setAttribute('open', '');
    }

    showModal(this : HTMLDialogElement) : void {
        if (this.hasAttribute('open')) {
            throw new DOMException("The element already has an 'open' attribute, and therefore cannot be opened modally.", 'InvalidStateError');
        }

        if (!this.ownerDocument || !this.ownerDocument.contains(this)) {
            throw new DOMException("The element is not connected to a document.", 'InvalidStateError');
        }

        this.setAttribute('open', '');
    }

    close(this : HTMLDialogElement, result? : string) : void {
        if (!this.open) {
            return;
        }

        this.removeAttribute('open');

        // The spec is ambiguous as to whether this should be an
        // empty string or undefined. Chrome uses an empty string,
        // so we're doing the same for compatibility.
        if (result !== undefined) {
            retValMap.set(this, result != null ? result.toString() : "null");
        }


        let evt : Event;
        try {
            evt = new Event('close', { bubbles: false });
        } catch(e) {
            evt = (this.ownerDocument || window.document).createEvent('Event');
            evt.initEvent('close', false, false);
        }

        requestAnimationFrame(() => {
            this.dispatchEvent(evt);

            if (this.onclose) {
                this.onclose(evt);
            }
        });
    }
}


var retValMap : WeakMap<DialogElement, string>;
if ('WeakMap' in window) {
    retValMap = new WeakMap();
} else {
    retValMap = new Map();
}

Object.defineProperty(DialogElement.prototype, 'returnValue', {
    configurable: true,
    get: function(this : HTMLDialogElement) {
        return retValMap.get(this) || '';
    },
    set: function(this : HTMLDialogElement, value : string) {
        if (value !== undefined) {
            retValMap.set(this, value != null ? value.toString() : "null");
        }
    }
});
