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


// Map of dialog return values (for IDL safety)
let retValMap : WeakMap<HTMLDialogElement, string>          = ('WeakMap' in window) ? new WeakMap() : new Map();

// Map of dialogs to their backdrop containers
let backdropMap : WeakMap<HTMLDialogElement, HTMLElement>   = ('WeakMap' in window) ? new WeakMap() : new Map();

// Map of dialogs to their original DOM positions
let sentinelMap : WeakMap<HTMLDialogElement, HTMLElement>   = ('WeakMap' in window) ? new WeakMap() : new Map();


// Mutation Observer to watch for dialogs being removed from the page
let mObserver : MutationObserver | null = null;


// Mutation Observer callback function for the body
function moCallback(list : Array<MutationRecord>, _observer : MutationObserver) {
    if (!document.body.querySelectorAll('dialog-backdrop').length) {
        return;
    }


    function predicate(mRec : MutationRecord) {
        return mRec.type === 'childList'
            && mRec.removedNodes.length
            && mRec.target
            && mRec.target.nodeName === 'DIALOG-BACKDROP';
    }

    function remover(node : HTMLDialogElement) {
        if (sentinelMap.has(node)) {
            let sentinel = sentinelMap.get(node);
            const parentNode = sentinel!.parentNode;
            parentNode!.removeChild(sentinel!);

            sentinelMap.delete(node);
        }


        if (backdropMap.has(node)) {
            let backdrop = backdropMap.get(node);
            backdrop!.parentNode!.removeChild(backdrop!);

            backdropMap.delete(node);
        }
    }

    list.filter(predicate).forEach(mr => {
        Array.prototype.forEach.call(mr.removedNodes, remover);
    });
}


export class DialogElement extends HTMLElement {
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
        if (this.hasAttribute('open')) {
            return;
        }

        this.setAttribute('open', '');
    }


    showModal(this : HTMLDialogElement) : void {
        if (this.hasAttribute('open')) {
            throw new DOMException("The element already has an 'open' attribute, and therefore cannot be opened modally.", 'InvalidStateError');
        }

        let parentNode = this.parentNode;

        if (!this.ownerDocument || !this.ownerDocument.contains(this) || !parentNode) {
            throw new DOMException("The element is not connected to a document.", 'InvalidStateError');
        }

        this.setAttribute('open', '');


        if (!sentinelMap.has(this)) {
            let sentinel = this.ownerDocument!.createElement('dialog-sentinel');
            parentNode.insertBefore(sentinel, this);

            sentinelMap.set(this, sentinel);
        }

        let backdrop = backdropMap.get(this) || this.ownerDocument!.createElement('dialog-backdrop');
        this.ownerDocument!.body.appendChild(backdrop);
        backdrop.appendChild(this);

        backdropMap.set(this, backdrop);


        if (!mObserver) {
            mObserver = new MutationObserver(moCallback);
            mObserver.observe(document.body, { childList: true, subtree: true });
        }
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

        // Native events are dispatched asynchronously
        requestAnimationFrame(() => {
            this.dispatchEvent(evt);

            // Fire any onclose callbacks, because dispatchEvent won't
            if (this.onclose) {
                this.onclose(evt);
            }

            if (sentinelMap.has(this)) {
                let sentinel = sentinelMap.get(this);
                const parentNode = sentinel!.parentNode;
                parentNode!.insertBefore(this, sentinel!);
                parentNode!.removeChild(sentinel!);

                sentinelMap.delete(this);
            }


            if (backdropMap.has(this)) {
                let backdrop = backdropMap.get(this);
                backdrop!.parentNode!.removeChild(backdrop!);

                backdropMap.delete(this);
            }
        });
    }
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
