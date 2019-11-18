## `dialog` Web Platform Tests

This directory contains copies of the Web Platform Tests for the HTML5 Dialog
Element, along with some extra test cases and demo pages.

To try these in a browser, run `npm run test-server` and navigate to
http://localhost:1337/tests/

**Last imported from wpt:** 2019-11-11

### Modifications

All tests have had the polyfill.js script imported. Some tests have been
additionally modified as follows:

* abspos-dialog-layout.html
    * Added `meta charset=utf-8`

* centering.html
    * Changed arrow functions to `function` notation for IE11
    * Changed backtick strings to quoted strings for IE11

* dialog-autofocus-just-once.html
    * Added `meta charset=utf-8`
    * Altered utils.js path to local subfolder
    * Changed async & arrow functions to `function` notation for IE11

* dialog-autofocus-multiple-times.html
    * Changed arrow functions to `function` notation for IE11
    * Commented out the first assertion due to buggy WebKit autofocus behaviour

* dialog-autofocus.html
    * Changed arrow functions to `function` notation for IE11
    * Commented out the first assertion due to buggy WebKit autofocus behaviour

* dialog-close.html
    * Commented out assertion that the close event is trusted

* dialog-enabled.html
    * Added `meta charset=utf-8`

* dialog-focusing-steps-prevent-autofocus.html
    * Added `meta charset=utf-8`
    * Altered utils.js path to local subfolder
    * Changed async & arrow functions to `function` notation for IE11

* dialog-return-value.html
    * Added `meta charset=utf-8`

* dialog-scrolled-viewport.html
    * Added `meta charset=utf-8`
    * Commented out assertion for dialog offsetParent being null

* dialog-showModal-remove.html
    * Added `meta charset=utf-8`
    * Changed arrow functions to `function` notation for IE11

* inert-does-not-match-disabled-selector.html
    * Added `meta charset=utf-8`

* inert-node-is-unfocusable.html
    * Added `meta charset=utf-8`

* show-modal-focusing-steps.html
    * Added `meta charset=utf-8`
    * Commented out the first assertion due to buggy WebKit autofocus behaviour
    * Changed arrow functions to `function` notation for IE11

### Extra Tests & Demos

* demo.html
    This serves as a demo page for the `<dialog>` polyfill with extra
    functionality enabled.

* component.html
    This serves as a demo page for the `<ay-dialog>` web component.
