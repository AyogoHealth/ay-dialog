## ayDialog source

* **dialog_element.ts**

  Implementation of an HTML dialog element complying with the HTML5 spec.

* **dialog_additions.ts**

  Additional behaviour provided above and beyond what's required by the spec.

* **index.ts**

  A polyfill implementation of the `<dialog>` element and additional behaviour
  in all modern browsers.

* **polyfill.ts**

  A polyfill implementation for the `<dialog>` element in all modern browsers,
  matching spec behaviour as closely as possible.

* **web_component.ts**

  An implementation of the dialog spec and additional behaviour as a
  `<ay-dialog>` custom element. This only works in modern browsers with support
  for HTML custom elements.
