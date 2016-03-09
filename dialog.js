/*! Copyright 2016 Ayogo Health Inc. */

angular.module('ngDialog', ['ngAnimate'])

.directive('dialog', function($window) {
//// DIALOG MANAGER //////////////////////////////////////////////////////////
    var dialogStack = [];
    var addedStyles = false;
    var originalStyles = null;

    var kZIndexMax = Math.pow(2, 31) - 1;

    // Courtesy of AngularUI Bootstrap's $modal service
    var FOCUS_SELECTOR = [
        'a[href]',
        'area[href]',
        'input:not([disabled])',
        'button:not([disabled])',
        'select:not([disabled])',
        'textarea:not([disabled])',
        'iframe',
        'object',
        'embed',
        '*[tabindex]',
        '*[contenteditable=true]'
    ].join(',');


    var DIALOG_STYLES = [
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
        '    margin: auto;',
        '    padding: 1em;',
        '    background: white;',
        '    color: black;',
        '    border: solid;',
        '    overflow: scroll;',
        '    -webkit-overflow-scrolling: touch;',
        /*
        '}',
        '',
        'dialog[open=modal]::before {',
        '    display: block;',
        '    content: \'\';',
        '    position: fixed;',
        '    top: 0;',
        '    left: 0;',
        '    right: 0;',
        '    bottom: 0;',
        '    background: rgba(0, 0, 0, 0.1);',
        '    z-index: -1;',
        */
        '}'
    ].join('\n');


    function triggerCancel(el) {
        var evt;
        try {
            evt = new Event('cancel', { cancelable: true });
        } catch(e) {
            evt = $window.document.createEvent();
            evt.initEvent('cancel', false, true);
        }

        if (el.dispatchEvent(evt)) {
            el.close();
        }
    }


    function doFocus(el, immediate) {
        // Ewww, because "autofocus" will cause trouble for iOS :(
        var control = el.querySelector('[dialog-autofocus]');

        if (control) {
            if (immediate) {
                control.focus();
                return;
            }

            $window.setTimeout(function() {
                control.focus();
            }, 1);
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
            return;
        }

        if (immediate) {
            el.focus();
            return;
        }

        $window.setTimeout(function() {
            el.focus();
        }, 1);
    }


    function getScrollOffset() {
        if ($window.document.scrollingElement) {
            return document.scrollingElement.scrollTop;
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


//// DIRECTIVE ///////////////////////////////////////////////////////////////
    return {
        restrict: 'E',
        link: function($scope, $element, $attrs) {
            var el = $element[0];
            var parentNode = el.parentNode;
            var retVal = '';
            var prevFocus = null;
            var restoreScroll = angular.noop;

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

                    showModal.call(el, anchor);

                    doFocus(el, true);
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
            }


            // Set the aria-role to dialog
            if (!el.hasAttribute('role')) {
                el.setAttribute('role', 'dialog');
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
                        // Move it to the end of <body>
                        $window.document.body.appendChild(el);

                        el.setAttribute('open', '');
                    } else {
                        el.removeAttribute('open');

                        // Move it back to where it was originally (ish)
                        parentNode.appendChild(el);
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

                el.open = true;

                doPositioning(el, anchor, offset, false);

                prevFocus.blur();
                doFocus(el);
            };


            // Polyfill the dialog `showModal(anchor)` method
            el.showModal = function(anchor) {
                if (el.open) {
                    if (typeof DOMException === 'function') {
                        throw new DOMException('Modal is already open', 'InvalidStateError');
                    } else {
                        throw new Error('Modal is already open');
                    }
                }

                prevFocus = $window.document.activeElement;

                var offset = getScrollOffset();

                el.open = true;

                doPositioning(el, anchor, offset, true);

                restoreScroll = blockScrolling(offset);

                // Hack to make our backdrop work
                el.setAttribute('open', 'modal');

                //doBackdrop();

                dialogStack.push(el);

                prevFocus.blur();
                doFocus(el);
            };


            // Polyfill the dialog `close(result)` method
            el.close = function(result) {
                if (!el.open) {
                    return;
                }

                el.open = false;

                if (result !== void 0) {
                    retVal = result;
                }


                var evt;
                try {
                    evt = new Event('close');
                } catch(e) {
                    evt = $window.document.createEvent();
                    evt.initEvent('close', false, false);
                }
                el.dispatchEvent(evt);


                var idx = dialogStack.indexOf(el);
                if (idx !== -1) {
                    dialogStack.splice(idx, 1);
                }

                if (dialogStack.length) {
                    // focus to the top dialog
                    var top = dialogStack[dialogStack.length - 1];

                    if (prevFocus && top.contains(prevFocus)) {
                        prevFocus.focus();
                    } else {
                        doFocus(top);
                    }
                } else {
                    if (prevFocus && prevFocus.focus) {
                        prevFocus.focus();
                    } else {
                        $window.document.body.focus();
                    }
                }

                restoreScroll();
            }


            // Hook up form submissions
            var forms = el.querySelectorAll('form[method="dialog"]');
            Array.prototype.forEach.call(forms, function(frm) {
                frm.addEventListener('submit', function(e) {
                    el.close();

                    e.preventDefault();
                });
            });


            // Init hack:
            // Force it to set its open state correctly
            el.open = el.open;
        }
    };
});
