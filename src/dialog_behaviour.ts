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

import { DialogElement } from './dialog_element.js';
import { DialogContext } from './dialog_context.js';

// Keep track of whether polyfilled dialog styles have been (or need to be)
// added to the page.
var stylesAdded : boolean = false;

// We need some special behaviour for iOS/Safari mobile due to keyboard
// interactions and user input requirements.
var isSafariMobile : boolean = !!navigator.userAgent.match(/iP(ad|od|hone)/);


var dialogStyles = `
    dialog-sentinel,
    [hidden] {
        display: none;
    }

    dialog {
        position: absolute;
        left: 0;
        right: 0;
        width: -webkit-fit-content;
        width: -moz-fit-content;
        width: fit-content;
        height: -webkit-fit-content;
        height: -moz-fit-content;
        height: fit-content;
        max-height: 100vh;
        margin: auto;
        padding: 1em;
        background: white;
        color: black;
        border: solid;
        visibility: hidden;
        overflow: auto;
        -webkit-overflow-scrolling: touch;
    }

    dialog:focus {
        outline: 0 none;
    }

    dialog[open] {
        visibility: visible;
    }
`;


var backdropStyles = `
    dialog[open] + .backdrop {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        right: 0;
        background: rgba(0, 0, 0, 0.1);
        touch-action: none;
    }
`;


export class DialogBehaviour {
    private el: HTMLDialogElement;
    private opener : (HTMLElement | null) = null;
    private backdrop : (HTMLElement | null) = null;
    private sentinel : (HTMLElement | null) = null;


    constructor(dlg : HTMLDialogElement) {
        this.el = dlg;


        if (!stylesAdded && !('HTMLDialogElement' in window)) {
            this.addStyles();

            (window as any).HTMLDialogElement = DialogElement;
        }


        // Set the aria-role to dialog (even if natively supported)
        if (!this.el.hasAttribute('role')) {
            this.el.setAttribute('role', 'dialog');
        }


        // Ensure the dialog is focusable
        if (!this.el.hasAttribute('tabindex')) {
            this.el.tabIndex = -1;
        }


        this.polyfillOpenProperty();
        this.polyfillReturnValueProperty();
        this.polyfillShowMethod();
        this.polyfillShowModalMethod();
        this.polyfillCloseMethod();

        this.el.addEventListener('close', () => this.doDialogClose());

        this.el.open = this.el.hasAttribute('open');
    }


    public get ownerDocument() {
        return this.el.ownerDocument;
    }


    public setStacking(zOffset : number) {
        this.el.style.zIndex = `${zOffset}`;

        if (this.backdrop) {
            this.backdrop.style.zIndex = `${zOffset - 1}`;
        }
    }


    public triggerCancel() {
        var evt : Event;

        try {
            evt = new Event('cancel', { cancelable: true });
        } catch(e) {
            evt = (this.ownerDocument || window.document).createEvent('Event');
            evt.initEvent('cancel', false, true);
        }

        Object.defineProperty(evt, '__ayDialog', { value: true });

        if (this.el.dispatchEvent(evt)) {
            this.el.close();
        }
    }


    public destroy() {
    }


    private doDialogFocus(immediate = false, skipAutofocus = false) {
        // Ewww, because "autofocus" will cause trouble for iOS :(
        let control = this.el.querySelector('[autofocus]:not([disabled])') as HTMLElement;

        // Ensure we start scrolled to the top of the dialog, before focusing
        this.el.scrollTop = 0;

        if (control && !skipAutofocus) {
            if (immediate) {
                control.focus();
                return;
            }

            setTimeout(() => {
                control.focus();
            }, 1);

            this.el.focus();
            return;
        }

        this.el.focus();
    }


    private doDialogClose() {
        this.el.open = false;

        DialogContext.closeDialog(this);

        // Restore focus back to the opener element
        if (this.opener && this.opener.focus) {
            this.opener.focus();
        }
    }


    // Polyfill the dialog `open` property
    private polyfillOpenProperty() {
        if ('open' in this.el) {
            return;
        }

        let descriptor = Object.getOwnPropertyDescriptor((window as any).HTMLDialogElement.prototype as HTMLDialogElement, 'open');

        Object.defineProperty(this.el, 'open', {
            configurable: false,
            get: descriptor!.get!.bind(this.el) as () => boolean,
            set: descriptor!.set!.bind(this.el) as (value : boolean) => void
        });
    }


    // Polyfill the dialog `returnValue` property
    private polyfillReturnValueProperty() {
        if ('returnValue' in this.el) {
            return;
        }

        let descriptor = Object.getOwnPropertyDescriptor((window as any).HTMLDialogElement.prototype as HTMLDialogElement, 'returnValue');

        Object.defineProperty(this.el, 'returnValue', {
            configurable: true,
            get: descriptor!.get!.bind(this.el) as () => string,
            set: descriptor!.set!.bind(this.el) as (value : string) => void
        });
    }


    private polyfillShowMethod() {
        if ('show' in this.el) {
            return;
        }

        Object.defineProperty(this.el, 'show', {
            configurable: false,
            writable: false,
            value: ((window as any).HTMLDialogElement.prototype as HTMLDialogElement).show.bind(this.el)
        });
    }


    private polyfillShowModalMethod() {
        Object.defineProperty(this.el, 'showModal', {
            configurable: false,
            writable: false,
            value: () => {
                this.opener = (this.el.ownerDocument || window.document).activeElement as HTMLElement;

                DialogContext.openDialog(this);

                ((window as any).HTMLDialogElement.prototype as HTMLDialogElement).showModal.call(this.el);

                //requestAnimationFrame(() => {
                    this.doDialogFocus(!isSafariMobile);
                //});
            }
        });
    }


    private polyfillCloseMethod() {
        if ('close' in this.el) {
            return;
        }

        Object.defineProperty(this.el, 'close', {
            writable: false,
            configurable: false,
            value: ((window as any).HTMLDialogElement.prototype as HTMLDialogElement).close.bind(this.el)
        });
    }


    private addStyles() {
        stylesAdded = true;

        let dlgStyle = document.createElement('style');
        dlgStyle.appendChild(document.createTextNode(dialogStyles + backdropStyles));

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
}
