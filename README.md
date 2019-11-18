# ayDialog

An HTML5 spec-compliant `dialog` element polyfill.


## Features

* Automatic support for `dialog` elements in the page
* Support for `HTMLDialogElement` API methods
* Compatible with native `dialog` support in Chrome and Firefox
* Support for normal and modal dialogs (with backdrops)
* Proper focus trapping and disabling of background content for accessibility
* Browser support includes IE11 and Edge, Chrome, Firefox, and Safari
    * `Element.closest()` polyfill (not included) required for IE11 and Edge <15

### Additional (non-standard) Features

* Block scrolling while a modal dialog is open
* Restoring focus when a modal dialog is closed
* Automatic closing of the dialog when the backdrop is clicked


## Installation

The polyfill can be installed from npm:

```bash
npm install ay-dialog
```


## Usage

There are 3 varieties included in the package, offering a polyfill for strictly
the spec-compliant behaviour, a polyfill with additional features, and a Web
Component custom element.

### Polyfill with Extras

A polyfill implementation of the `<dialog>` element and additional behaviour in
all modern browsers.

```javascript
// ES6 import:
import 'ay-dialog/index.js';

// CommonJS require:
require('ay-dialog');
```

### Pure Spec Polyfill

A polyfill implementation for the `<dialog>` element in all modern browsers,
matching spec behaviour as closely as possible. No extra behaviour.

```javascript
// ES6 import:
import 'ay-dialog/polyfill.js';

// CommonJS require:
require('ay-dialog/polyfill');
```

### `ay-dialog` Custom Element

An implementation of the dialog spec and additional behaviour as a
`<ay-dialog>` custom element. This only works in modern browsers with support
for HTML custom elements.

```javascript
// ES6 import:
import 'ay-dialog/component.js';

// CommonJS require:
require('ay-dialog/component');
```


## Tests

This project is tested against the [Web Platform
Tests](https://web-platform-tests.org/) for the HTML5 `dialog` element.

See the `tests` folder for test cases and instructions for running tests in a
browser.


## Contributing

Contributions of bug reports, feature requests, and pull requests are greatly
appreciated!

Please note that this project is released with a [Contributor Code of
Conduct](https://github.com/AyogoHealth/ay-dialog/blob/master/CODE_OF_CONDUCT.md).
By participating in this project you agree to abide by its terms.


## Licence

Released under the MIT Licence.

Copyright © 2019 Ayogo Health Inc.
