"use strict";

window.addEventListener("load", function () {
  const preloader = document.getElementById("preloader");

  if (preloader) {
    // Minimum display time for the preloader animation (in milliseconds).
    // This ensures the animation is visible for a short period,
    // even if the page loads very quickly.
    const minDisplayTime = 1000; // 1 second

    setTimeout(() => {
      preloader.classList.add("loaded");

      // Optional: Remove preloader from DOM after its fade-out transition.
      // This helps keep the DOM clean.
      preloader.addEventListener("transitionend", function (event) {
        // Check if the transition that ended was for 'opacity'
        // and if the preloader now has the 'loaded' class.
        if (
          event.propertyName === "opacity" &&
          preloader.classList.contains("loaded")
        ) {
          // Check if the element is still in the DOM before trying to remove
          if (preloader.parentNode) {
            preloader.parentNode.removeChild(preloader);
          }
        }
      });
    }, minDisplayTime);
  }
});
