function waitUntilLoadedAndAutofocused() {
  return new Promise(function(resolve) {
      var loaded = document.readyState === "complete";
      var autofocused = false;
      window.addEventListener('load', function() {
          loaded = true;
          if (autofocused)
              resolve();
      }, false);
      document.addEventListener('focusin', function() {
          if (autofocused)
              return;
          autofocused = true;
          if (loaded)
              resolve();
      }, false);

      // IE11 doesn't support autofocus
      setTimeout(function() {
        if (!autofocused) {
          const el = document.querySelector('[autofocus]');
          if (el) {
            el.focus();
          }

          autofocused = true;
          if (loaded)
              resolve();
        }
      }, 10);
    });
}
