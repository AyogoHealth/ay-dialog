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

import { DialogBehaviour } from './dialog_behaviour.js';

interface IStackingContextState {
    offset : number;

    position : string | null | undefined;
    left : string | null | undefined;
    right : string | null | undefined;
    top : string | null | undefined;
    overflow : string | null | undefined;

    htmlMinHeight : string | null | undefined;
    htmlOverflowY : string | null | undefined;
};


export class DialogContext {
    private static dialogStack : Array<DialogBehaviour>  = [];
    private static stackingState : Array<IStackingContextState> = [];


    public static openDialog(dlg : DialogBehaviour) {
        this.dialogStack.unshift(dlg);

        const offset = this.getScrollOffset();
        this.blockScrolling(offset);
    }


    public static closeDialog(dlg : DialogBehaviour) {
        let idx = this.dialogStack.indexOf(dlg);

        if (idx > -1) {
            this.unblockScrolling(idx);
            this.dialogStack.splice(idx, 1);
        }
    }


    /*
    private static dlgKeypressListener(e : KeyboardEvent) {
        // Escape
        if (e.keyCode === 27) {
            let dlg = this.dialogStack[0];

            if (dlg) {
                dlg.triggerCancel();
            }
        }
    }
    */


    private static getScrollOffset() {
        let dlg = this.dialogStack[0];

        if (!dlg) {
            return 0;
        }

        let doc = dlg.ownerDocument;

        if (!doc) {
            return 0;
        }

        if (doc.body.style.top) {
            return Math.abs(parseInt(doc.body.style.top, 10));
        }

        if (doc.scrollingElement) {
            return doc.scrollingElement.scrollTop;
        } else {
            return doc.documentElement.scrollTop + doc.body.scrollTop;
        }
    }


    private static blockScrolling(offset : number) {
        let dlg = this.dialogStack[0];

        if (!dlg || !dlg.ownerDocument) {
            return;
        }

        let doc = dlg.ownerDocument;
        let htmlNode = doc.documentElement;
        let clientWidth = doc.body.clientWidth;

        // Capture the old values
        let state : IStackingContextState = {
            offset:         offset,

            position:       doc.body.style.position,
            left:           doc.body.style.left,
            right:          doc.body.style.right,
            top:            doc.body.style.top,
            overflow:       doc.body.style.overflow,

            htmlMinHeight:  htmlNode.style.minHeight,
            htmlOverflowY:  htmlNode.style.overflowY
        };
        this.stackingState.unshift(state);

        if (doc.body.scrollHeight > htmlNode.clientHeight) {
            doc.body.style.setProperty('position', 'fixed');
            doc.body.style.setProperty('left', '0');
            doc.body.style.setProperty('right', '0');
            doc.body.style.setProperty('top', `${-offset}px`);

            htmlNode.style.setProperty('min-height', '100vh');
            htmlNode.style.setProperty('overflow-y', 'scroll');
        }

        if (doc.body.clientWidth < clientWidth) {
            doc.body.style.setProperty('overflow',  'hidden');
        }
    }


    private static unblockScrolling(idx : number) {
        let dlg = this.dialogStack[0];

        if (!dlg || !dlg.ownerDocument) {
            return;
        }

        let doc = dlg.ownerDocument;
        let htmlNode = doc.documentElement;

        let state = this.stackingState[idx];
        this.stackingState.splice(idx, 1);

        if (idx != 0) {
            return;
        }

        if (state.position) {
            doc.body.style.setProperty('position', state.position);
        } else {
            doc.body.style.removeProperty('position');
        }

        if (state.left) {
            doc.body.style.setProperty('left', state.left);
        } else {
            doc.body.style.removeProperty('left');
        }

        if (state.right) {
            doc.body.style.setProperty('right', state.right);
        } else {
            doc.body.style.removeProperty('right');
        }

        if (state.top) {
            doc.body.style.setProperty('top', state.top);
        } else {
            doc.body.style.removeProperty('top');
        }

        if (state.overflow) {
            doc.body.style.setProperty('overflow', state.overflow);
        } else {
            doc.body.style.removeProperty('overflow');
        }

        if (state.htmlMinHeight) {
            htmlNode.style.setProperty('min-height', state.htmlMinHeight);
        } else {
            htmlNode.style.removeProperty('min-height');
        }

        if (state.htmlOverflowY) {
            htmlNode.style.setProperty('overflow-y', state.htmlOverflowY);
        } else {
            htmlNode.style.removeProperty('overflow-y');
        }


        if (doc.scrollingElement) {
            doc.scrollingElement.scrollTop = state.offset;
        } else {
            scrollTo(0, state.offset);
        }
    }
};
