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

import DialogElement from './dialog_element.js';

function attributeObservation(records : Array<MutationRecord>) {
  for (let i = 0; i < records.length; i++) {
    const record = records[i];

    if (record.type !== 'attributes') {
      continue;
    }

    if (!(record.target instanceof DialogElement)) {
      continue;
    }

    const target = record.target as HTMLElement;
    DialogElement.prototype.attributeChangedCallback.call(target, record.attributeName!, record.oldValue, target.getAttribute(record.attributeName!));
  }
}

function augmentElements(mutationList : Array<MutationRecord> | null, _obs: MutationObserver) {
  let addedNodeCount = 0;
  let removedNodeCount = 0;

  function sumMutatedNodes(prop : 'addedNodes'|'removedNodes') {
    return function(a : number, r : MutationRecord) {
      return a += r[prop].length;
    };
  }

  if (mutationList) {
    addedNodeCount = mutationList.reduce(sumMutatedNodes('addedNodes'), 0);
    removedNodeCount = mutationList.reduce(sumMutatedNodes('removedNodes'), 0);
  }

  if (mutationList && addedNodeCount === 0 && removedNodeCount === 0) {
    return;
  }

  if (!mutationList || addedNodeCount > 0) {
    const elements = document.querySelectorAll<HTMLDialogElement>('dialog:not([__defined])');

    for (let i = 0; i < elements.length; i++) {
      DialogElement.call(elements[i]);
      Object.setPrototypeOf(elements[i], DialogElement.prototype);

      elements[i].setAttribute('__defined', '');
      DialogElement.prototype.connectedCallback.call(elements[i]);

      const mo = new MutationObserver(attributeObservation);
      mo.observe(elements[i], {
        attributes: true,
        attributeOldValue: true,
        attributeFilter: ['open']
      });
    }
  }

  if (mutationList && removedNodeCount > 0) {
    for (let i = 0; i < mutationList.length; i++) {
      if (!mutationList[i].removedNodes.length) {
        continue;
      }

      for (let j = 0; j < mutationList[i].removedNodes.length; j++) {
        const el = mutationList[i].removedNodes[j] as HTMLElement;

        if (!(el instanceof HTMLElement)) {
          continue;
        }

        if (el.tagName.toLowerCase() === 'dialog' && el.hasAttribute('__defined')) {
          DialogElement.prototype.disconnectedCallback.call(el as HTMLDialogElement);
        }

        if (!el.isConnected) {
          const children = el.querySelectorAll<HTMLDialogElement>('dialog[__defined]');
          for (let k = 0; k < children.length; k++) {
            DialogElement.prototype.disconnectedCallback.call(children[k]);
          }

          const sentinels = el.querySelectorAll<HTMLElement>('dialog-sentinel');
          for (let k = 0; k < sentinels.length; k++) {
            (sentinels[k] as any).dialogOwner.remove();
          }
        }
      }
    }
  }
}


if (!('HTMLDialogElement' in window) || !('showModal' in HTMLDialogElement.prototype)) {
  (<any>window).HTMLDialogElement = DialogElement;

  const observer = new MutationObserver(augmentElements);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      augmentElements(null, observer);
    });
  } else {
    augmentElements(null, observer);
  }

  observer.observe(document.documentElement, { childList: true, subtree: true });

  // Hack to override document.createElement
  const createElement = document.createElement;
  document.createElement = function(this : Document, tagName : string) : HTMLElement {
    const el = createElement.call(this, tagName) as HTMLDialogElement;

    if (tagName.toLowerCase() === 'dialog') {
      DialogElement.call(el);
      Object.setPrototypeOf(el, DialogElement.prototype);
    }

    return el;
  };
}
