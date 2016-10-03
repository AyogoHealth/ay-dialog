/*! Copyright (c) 2016 Ayogo Health Inc.
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

angular.module('ayDialog', [])

.directive('dialog', ['$window', function($window) {
//// DIALOG MANAGER //////////////////////////////////////////////////////////
    var dialogStack = [];
    var backdropStack = [];
    var addedStyles = false;
    var originalStyles = null;

    var isSafariMobile = $window.navigator.userAgent.match(/iP(ad|od|hone)/);

    var kZIndexMax = Math.pow(2, 31) - 1;

    // Courtesy of AngularUI Bootstrap's $modal service
    var FOCUS_SELECTOR = [
        'a[href]',
        'area[href]',
        'input:not([disabled])',
        'button:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'keygen:not([disabled])',
        'iframe',
        'object',
        'embed',
        '[tabindex]:not([disabled]):not([tabindex=""])',
        '[contenteditable=true]'
    ].join(',');


    var DIALOG_STYLES = [
        '[hidden] {',
        '    display: none;',
        '}',
        '',
        'dialog {',
        '    position: absolute;',
        '    left: 0;',
        '    right: 0;',
        '    width: -webkit-fit-content;',
        '    width: -moz-fit-content;',
        '    width: fit-content;',
        '    height: -webkit-fit-content;',
        '    height: -moz-fit-content;',
        '    height: fit-content;',
        '    max-height: 100vh;',
        '    margin: auto;',
        '    padding: 1em;',
        '    background: white;',
        '    color: black;',
        '    border: solid;',
        '    visibility: hidden;',
        '    overflow: auto;',
        '    -webkit-overflow-scrolling: touch;',
        '}',
        '',
        'dialog[open] {',
        '    visibility: visible;',
        '}',
        '',
        'dialog[open] + .backdrop {',
        '    position: fixed;',
        '    top: 0;',
        '    bottom: 0;',
        '    left: 0;',
        '    right: 0;',
        '    background: rgba(0, 0, 0, 0.1);',
        '    touch-action: none;',
        '}'
    ].join('\n');


    function triggerCancel(el) {
        var evt;
        try {
            evt = new Event('cancel', { cancelable: true });
        } catch(e) {
            evt = $window.document.createEvent('Event');
            evt.initEvent('cancel', false, true);
        }
        Object.defineProperty(evt, '__ngDialog', { value: true });

        if (el.dispatchEvent(evt)) {
            el.close();
        }
    }


    function doFocus(el, immediate, skipauto) {
        // Ewww, because "autofocus" will cause trouble for iOS :(
        var control = el.querySelector('[autofocus]:not([disabled])');

        if (control && !skipauto) {
            if (immediate) {
                control.focus();
                return;
            }

            $window.setTimeout(function() {
                control.focus();
            }, 1);
            el.focus();
            return;
        }

        var control = el.querySelector(FOCUS_SELECTOR);

        if (control) {
            if (immediate) {
                control.focus();
                return;
            }

            $window.setTimeout(function() {
                control.focus();
            }, 1);
            el.focus();
            return;
        }

        el.focus();
    }


    function getScrollOffset() {
        if ($window.document.body.style.top) {
            var offset = parseInt($window.document.body.style.top, 10);
            return Math.abs(offset);
        }

        if ($window.document.scrollingElement) {
            return $window.document.scrollingElement.scrollTop;
        } else {
            return $window.document.documentElement.scrollTop + $window.document.body.scrollTop;
        }
    }


    function doPositioning(el, anchor, scrollOffset, modal) {
        if (anchor) {
            console.warn('Magic Alignment mode for <dialog> unsupported!');
        }

        // Normal Alignment
        if (!modal) {
            return;
        }

        // Centered Alignment
        var topValue = scrollOffset + ($window.innerHeight - el.offsetHeight) / 2;

        el.style.top = Math.max(scrollOffset, topValue) + 'px';
        el.style.zIndex = kZIndexMax;
    }


    function doBackdrop() {
        var len = dialogStack.length;
        var topDialog = dialogStack[dialogStack.length - 1];

        for (var i = len; i > 0; --i) {
            dialogStack[i - 1].style.zIndex = kZIndexMax - (2*len - i - 1);
            backdropStack[i - 1].style.zIndex = kZIndexMax - (2*len - i);
        }

        var nodes = $window.document.body.children;
        for (var i = 0, ii = nodes.length; i < ii; ++i) {
          if (['SCRIPT', 'STYLE', 'LINK'].indexOf(nodes[i].tagName) !== -1) {
            continue;
          }

          if (topDialog && nodes[i] !== topDialog) {
            nodes[i].setAttribute('aria-hidden', true);
          } else {
            nodes[i].removeAttribute('aria-hidden');
          }
        }
    }


    function blockScrolling(offset) {
        var htmlNode = document.documentElement;
        var prevHtmlStyle = htmlNode.getAttribute('style') || '';
        var prevBodyStyle = document.body.getAttribute('style') || '';

        var clientWidth = document.body.clientWidth;

        if (document.body.scrollHeight > htmlNode.clientHeight) {
            document.body.style.position = 'fixed';
            document.body.style.width = '100%';
            document.body.style.top = -offset + 'px';

            htmlNode.style.overflowY = 'scroll';
        }

        if (document.body.clientWidth < clientWidth) {
            document.body.style.overflow = 'hidden';
        }

        return function() {
            document.body.setAttribute('style', prevBodyStyle);
            htmlNode.setAttribute('style', prevHtmlStyle);

            if (document.scrollingElement) {
                document.scrollingElement.scrollTop = offset;
            } else {
                $window.scrollTo(0, offset);
            }
        }
    }


    function backdropClick(e) {
        var topDialog = dialogStack[dialogStack.length - 1];

        var evt;
        try {
            evt = new MouseEvent('click', {
              bubbles:        e.bubbles,
              cancelable:     e.cancelable,
              view:           $window,
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
        } catch(e) {
            evt = $window.document.createEvent('MouseEvent');
            evt.initMouseEvent(e.type, e.bubbles, e.cancelable, $window,
                e.detail, e.screenX, e.screenY, e.clientX, e.clientY,
                e.ctrlKey, e.altKey, e.shiftKey, e.metaKey, e.button,
                e.relatedTarget);
        }

        topDialog.dispatchEvent(evt);
        e.stopPropagation();
    }


    function keyPress(e) {
      var topDialog = dialogStack[dialogStack.length - 1];
      if (!topDialog) {
        return;
      }

      if (e.keyCode === 27) {
        e.preventDefault();
        e.stopPropagation();

        triggerCancel(topDialog);
      }
    }


    function modalFocus(e) {
      var topDialog = dialogStack[dialogStack.length - 1];
      if (!topDialog) {
        return;
      }

      if (e.target !== topDialog && !topDialog.contains(e.target)) {
        e.preventDefault();
        e.stopPropagation();
        e.target.blur();

        doFocus(topDialog, true, true);
      }
    }


//// DIRECTIVE ///////////////////////////////////////////////////////////////
    return {
        restrict: 'E',
        link: function($scope, $element, $attrs) {
            var el = $element[0];
            var parentNode = el.parentNode;
            var retVal = '';
            var prevFocus = null;
            var restoreScroll = angular.noop;
            var backdrop = null;

            // Set the aria-role to dialog (even if natively supported)
            if (!el.hasAttribute('role')) {
                el.setAttribute('role', 'dialog');
            }


            if (('HTMLDialogElement' in $window) &&
                (el instanceof $window.HTMLDialogElement))
            {
                if (!addedStyles) {
                    addedStyles = true;
                }

                // Slight hack to prevent scrolling on the body while
                // dialogs are open.
                var showModal = HTMLDialogElement.prototype.showModal;
                el.showModal = function(anchor) {
                    restoreScroll = blockScrolling();
                    dialogStack.push(el);

                    requestAnimationFrame(function() {
                        showModal.call(el, anchor);

                        doFocus(el, true);
                    });
                };

                function checkUnblockScrolling() {
                    var idx = dialogStack.indexOf(el);
                    if (idx !== -1) {
                        dialogStack.splice(idx, 1);
                    }

                    restoreScroll();
                }

                el.addEventListener('close', checkUnblockScrolling);
                el.addEventListener('cancel', checkUnblockScrolling);

                $element.on('$destroy', function() {
                    el.removeEventListener('close', checkUnblockScrolling);
                    el.removeEventListener('cancel', checkUnblockScrolling);
                    el = null;
                });

                // Nothing more to do, <dialog> is supported
                return;
            }


            // Add global dialog styles if needed
            if (!addedStyles) {
                addedStyles = true;

                var dlgStyle = $window.document.createElement('style');
                if (dlgStyle.styleSheet) {
                    dlgStyle.styleSheet.cssText = DIALOG_STYLES;
                } else {
                    dlgStyle.appendChild($window.document.createTextNode(DIALOG_STYLES));
                }

                var first = $window.document.querySelector('link');
                if (first) {
                    first.parentNode.insertBefore(dlgStyle, first);
                } else {
                    first = $window.document.querySelector('style');

                    if (first) {
                        first.parentNode.insertBefore(dlgStyle, first);
                    } else {
                        first = $window.document.querySelector('head');
                        first.appendChild(dlgStyle);
                    }
                }


                document.body.addEventListener('keydown', keyPress);
                document.addEventListener('focus', modalFocus, true);
            }


            // Add support for the `hidden` attribute to older browsers
            if (!('hidden' in el)) {
                Object.defineProperty(el, 'hidden', {
                    get: function() {
                        return el.hasAttribute('hidden');
                    },
                    set: function(value) {
                        if (value) {
                            el.setAttribute('hidden', '');
                        } else {
                            el.removeAttribute('hidden');
                        }
                    }
                });
            }


            // Polyfill the dialog `open` property
            Object.defineProperty(el, 'open', {
                get: function() { return el.hasAttribute('open'); },
                set: function(value) {
                    el.hidden = !value;

                    if (value) {
                        // Move it to the end of <body> if modal
                        if (backdrop && $window.document.body.contains(backdrop)) {
                            $window.document.body.insertBefore(el, backdrop);
                        }

                        el.setAttribute('open', '');
                    } else {
                        var wasOpen = el.hasAttribute('open');
                        el.removeAttribute('open');

                        if (backdrop) {
                            $window.document.body.removeChild(backdrop);
                        }

                        // Move it back to where it was originally (ish)
                        if (wasOpen && parentNode && parentNode !== el.parentNode) {
                            parentNode.appendChild(el);
                        }
                    }
                }
            });


            // Polyfill the dialog `returnValue` property
            Object.defineProperty(el, 'returnValue', {
                get: function() { return retVal; },
                set: function(value) { retVal = value; }
            });


            // Polyfill the dialog `show(anchor)` method
            el.show = function(anchor) {
                if (el.open) {
                    return;
                }

                prevFocus = $window.document.activeElement;

                var offset = getScrollOffset();

                el.hidden = false;

                doPositioning(el, anchor, offset, false);

                if (prevFocus && (prevFocus != $window.document.body)) {
                    prevFocus.blur();
                }

                if (isSafariMobile) {
                    doFocus(el);
                }

                requestAnimationFrame(function() {
                    el.open = true;

                    if (!isSafariMobile) {
                        doFocus(el, true);
                    }
                });
            };


            // Polyfill the dialog `showModal(anchor)` method
            el.showModal = function(anchor) {
                if (el.open) {
                    return;
                }

                prevFocus = $window.document.activeElement;

                var offset = getScrollOffset();

                el.hidden = false;

                if (!backdrop) {
                    backdrop = $window.document.createElement('div');
                    backdrop.setAttribute('class', 'backdrop');
                    backdrop.addEventListener('click', backdropClick);
                }
                $window.document.body.appendChild(backdrop);

                dialogStack.push(el);
                backdropStack.push(backdrop);

                doPositioning(el, anchor, offset, true);
                doBackdrop();

                restoreScroll = blockScrolling(offset);

                if (prevFocus && (prevFocus != $window.document.body)) {
                    prevFocus.blur();
                }

                if (isSafariMobile) {
                    doFocus(el);
                }

                requestAnimationFrame(function() {
                    el.open = true;

                    if (!isSafariMobile) {
                        doFocus(el, true);
                    }
                });
            };


            // Polyfill the dialog `close(result)` method
            el.close = function(result) {
                if (!el.open) {
                    return;
                }

                // The spec is ambiguous as to whether this should be an empty
                // string or undefined. Chrome uses an empty string, so we're
                // doing the same for compatibility.
                if (result !== undefined) {
                    retVal = result;
                }


                var evt;
                try {
                    evt = new Event('close', { bubbles: false });
                } catch(e) {
                    evt = $window.document.createEvent('Event');
                    evt.initEvent('close', false, false);
                }
                el.dispatchEvent(evt);
            }


            function handleCancel(evt) {
                if (!el.open || evt.__ngDialog) {
                    return;
                }

                // The spec is ambiguous as to whether this should be an empty
                // string or undefined. Chrome uses an empty string, so we're
                // doing the same for compatibility.
                retVal = "";
                el.close();
            }

            el.addEventListener('cancel', handleCancel);


            function doClose() {
                el.open = false;

                var idx = dialogStack.indexOf(el);
                if (idx !== -1) {
                    dialogStack.splice(idx, 1);

                    if (backdrop) {
                        idx = backdropStack.indexOf(backdrop);

                        if (idx !== -1) {
                            backdropStack.splice(idx, 1);
                        }
                    }
                }

                if (dialogStack.length) {
                    // focus to the top dialog
                    var top = dialogStack[dialogStack.length - 1];

                    if (prevFocus && top.contains(prevFocus)) {
                        prevFocus.focus();
                    } else {
                        doFocus(top, !isSafariMobile);
                    }
                } else {
                    if (prevFocus && prevFocus.focus) {
                        prevFocus.focus();
                    } else {
                        $window.document.body.focus();
                    }
                }

                doBackdrop();
                el.style.zIndex = null;
                el.style.top = null;

                restoreScroll();
            }

            el.addEventListener('close', doClose);


            // Hook up form submissions
            var forms = el.querySelectorAll('form[method="dialog"]');
            Array.prototype.forEach.call(forms, function(frm) {
                frm.addEventListener('submit', function(e) {
                    el.close();

                    e.preventDefault();
                });
            });


            // Do some cleanup when the element is removed from the DOM
            $element.on('$destroy', function() {
                if (backdrop) {
                    if ($window.document.body.contains(backdrop)) {
                        $window.document.body.removeChild(backdrop);
                    }

                    backdrop.removeEventListener('click', backdropClick);
                    backdrop = null;
                }

                el.removeEventListener('close', doClose);
                el.removeEventListener('cancel', handleCancel);
                el = null;
            });

            // Init hack:
            // Force it to set its open state correctly
            el.open = el.open;
        }
    };
}]);


if (typeof exports === 'object') {
    Object.defineProperty(exports, '__esModule', { value: true});
    exports.default = 'ayDialog';
}
