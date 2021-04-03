## `dialog` Web Platform Tests

This directory contains copies of the Web Platform Tests for the HTML5 Dialog
Element, along with some extra test cases and demo pages.

To try these in a browser, run `npm run test-server` and navigate to
http://localhost:1337/tests/

**Last imported from wpt:** 2021-03-31

### Modifications

All tests have had the polyfill.js script imported. Some tests have been
additionally modified as follows:

* abspos-dialog-layout.html
    * Added `meta charset=utf-8`
    * Fixed style reset code

* centering.html
    * Changed arrow functions to `function` notation for IE11
    * Changed backtick strings to quoted strings for IE11
    * Changed for...of to for loop for IE11

* dialog.html
    * Added `meta charset=utf-8`
    * Changed arrow functions to `function` notation for IE11
    * Changed backtick strings to quoted strings for IE11
    * Changed for...of to for loop for IE11
    * Replaced `fit-content` check with regex for Firefox

* dialog-autofocus-just-once.html
    * Added `meta charset=utf-8`
    * Altered utils.js path to local subfolder
    * Changed arrow functions to `function` notation for IE11
    * Changed `async`/`await` syntax to use `Promises`

* dialog-autofocus-multiple-times.html
    * Changed arrow functions to `function` notation for IE11
    * Manually set initial focus due to buggy WebKit autofocus behaviour

* dialog-autofocus.html
    * Changed arrow functions to `function` notation for IE11
    * Commented out the first assertion due to buggy WebKit autofocus behaviour

* dialog-close.html
    * Commented out assertion that the close event is trusted

* dialog-display.html
    * Added `meta charset=utf-8`

* dialog-enabled.html
    * Added `meta charset=utf-8`

* dialog-focusing-steps-prevent-autofocus.html
    * Added `meta charset=utf-8`
    * Altered utils.js path to local subfolder
    * Changed arrow functions to `function` notation for IE11
    * Changed `async`/`await` syntax to use `Promises`

* dialog-form-submission.html
    * Changed arrow functions to `function` notation for IE11
    * Changed `async`/`await` syntax to use `Promises`
    * **NOTE:** WebDriver-requiring tests are commented out

* dialog-return-value.html
    * Added `meta charset=utf-8`

* dialog-showModal-remove.html
    * Added `meta charset=utf-8`
    * Changed arrow functions to `function` notation for IE11

* inert-does-not-match-disabled-selector.html
    * Added `meta charset=utf-8`

* inert-node-is-unfocusable.html
    * Added `meta charset=utf-8`

* remove-dialog-should-unblock-document.html
    * Added `meta charset=utf-8`

* show-modal-focusing-steps.html
    * Added `meta charset=utf-8`
    * Manually set initial focus due to buggy WebKit autofocus behaviour
    * Changed arrow functions to `function` notation for IE11

* resources/common.js
    * Set loaded based on document readyState (IE11 seems to fire load early)
    * Workaround for IE11's lack of autofocus support

* resources/utils.js
    * Changed arrow functions to `function` notation for IE11

### Extra/Proposed Web Platform Tests

Most of these are taken from Firefox patches that have not landed in the WHATWG
spec yet.

* xspec-dialog-showModal.html
    This includes the polyfill with additions and verifies that the dialog
    receives focus.

* xspec-focus-after-close.html
    This includes the polyfill with additions and verifies that focus is
    returned to the previous element when the dialog is closed.

    * Changed input removal to work in IE11

* xspec-inert-node-is-unfocusable.html
    This includes the polyfill with additions and verifies that the dialog
    receives focus.

* xspec-show-modal-focusing-steps.html
    This includes the polyfill with additions and verifies that the dialog
    receives focus.

### Demos

* demo.html
    This serves as a demo page for the `<dialog>` polyfill with extra
    functionality enabled.

* component.html
    This serves as a demo page for the `<ay-dialog>` web component.
