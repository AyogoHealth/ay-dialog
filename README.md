ayDialog
========

An HTML5 spec-compliant &lt;dialog&gt; polyfill built with Angular 1.x.

<small>Copyright © 2016 Ayogo Health Inc.</small>


Features
--------

* Automatic upgrading of `dialog` elements via Angular directive
* Support for API methods (`show()`, `showModal()`, `close()`, `returnValue`)
* Compatible with native `dialog` support in Chrome
* Support for normal and modal dialogs (with backdrops)
* Proper focus handling and disabling of background content for accessibility

Usage
-----

To get started, install the package from npm: `npm install ay-dialog`

### Basic Usage

Add a script tag to your page to reference the dialog.js file:

```html
<script src="node_modules/ay-dialog/dialog.js"></script>
```

Reference the module in your Angular app's dependencies:

```javascript
angular.module(myApp, ['ayDialog'])
```

### ES5 with Browserify

Reference the module in your Angular app's dependencies:

```javascript
var ayDialog = require('ay-dialog').default;

angular.module(myApp, [ayDialog])
```

### ES6 / TypeScript

Reference the module in your Angular app's dependencies:

```typescript
import ayDialog from 'ay-dialog';

angular.module(myApp, [ayDialog])
```

A TypeScript module definition is included, which also provides typings for the
HTMLDialogElement interface.


Styling
-------

It's not possible to implement the backdrop as a pseudo-element (as it is in native implementations), so the backdrop is added as a sibling element with a `.backdrop` class.

Note that you need two separate selectors to support both `.backdrop` and `::backdrop`, otherwise browsers that don't recognize the pseudo-element will skip the CSS block entirely!

```css
dialog + .backdrop {
    background: rgba(1, 0, 0, 0.1);
}

dialog::backdrop {
    background: rgba(1, 0, 0, 0.1);
}
```

Notes
-----

Released under the terms of the [MIT License](LICENSE).
