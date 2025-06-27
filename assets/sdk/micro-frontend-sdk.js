(function (window, document) {
  "use strict";

  const MicroFrontend = {
    /**
     * Initializes the micro frontend.
     * Options:
     *  - mainMode: "inline" (default) or "modal" – determines how the main view is rendered.
     *  - mainModeDisplay: "grid" (default) or "scrollable" – determines how the main view cards are rendered.
     *  - detailMode: "inline" or "modal" or "inlineOnModal" – determines how detail views are displayed.
     *  - target: CSS selector for the main view container (required for mainMode "inline").
     *  - serviceUrl: Base URL for the micro frontend content.
     *  - defaultKeyword: A fallback keyword if no meta tag or page context is detected.
     *  - cssMap: CSS variables for custom theming.
     */
    init: function (options) {
      options = options || {};
      options.mainMode = options.mainMode || "inline";
      options.mainModeDisplay = options.mainModeDisplay || "grid";
      options.detailMode = options.detailMode || "modal";
      options.serviceUrl = options.serviceUrl || "http://localhost:8080/search";
      options.cssMap.fontFamily = options.cssMap.fontFamily || "sans-serif";
      options.cssMap.textColor =
        MicroFrontend.validateColor(options.cssMap.textColor) || "#00b074";
      options.cssMap.buttonColor =
        MicroFrontend.validateColor(options.cssMap.buttonColor) || "#00b074";
      options.cssMap.buttonTextColor =
        MicroFrontend.validateColor(options.cssMap.buttonTextColor) || "#fff";

      // Detect keyword from page context.
      var keyword = MicroFrontend.getPageContext();
      if (!keyword && options.defaultKeyword) {
        keyword = options.defaultKeyword;
      }
      if (keyword) {
        var separator = options.serviceUrl.indexOf("?") > -1 ? "&" : "?";
        options.serviceUrl += separator + "tag=" + encodeURIComponent(keyword);
      }

      MicroFrontend.ensureHTMX(function () {
        // Load styles
        MicroFrontend.injectRootStyles(
          options.cssMap.fontFamily,
          options.cssMap.textColor,
          options.cssMap.buttonColor,
          options.cssMap.buttonTextColor
        );
        MicroFrontend.loadStyles(options.serviceUrl);

        // Load main display
        MicroFrontend.loadMainDisplay(
          options.mainModeDisplay,
          options.detailMode
        );

        // Load base url
        MicroFrontend.loadBaseUrl(options.serviceUrl);

        // Load description trimmer
        MicroFrontend.trimDescriptions();

        if (options.mainMode === "inline") {
          if (!options.target) {
            console.error(
              "MicroFrontend: 'target' selector is required for mainMode 'inline'."
            );
            return;
          }
          var container = document.querySelector(options.target);
          if (!container) {
            console.error(
              "MicroFrontend: target container not found for selector:",
              options.target
            );
            return;
          }
          MicroFrontend.loadInline(container, options.serviceUrl);
          if (options.detailMode === "modal") {
            MicroFrontend.attachDetailModal(container);
          } else if (options.detailMode === "inline") {
            MicroFrontend.attachDetailInline(container);
          }
        } else if (options.mainMode === "modal") {
          MicroFrontend.loadModal(options.serviceUrl);
        } else {
          console.error(
            "MicroFrontend: unsupported mainMode",
            options.mainMode
          );
        }
      });
    },

    /**
     * Validate color config.
     */
    validateColor(color) {
      const validColorPattern =
        /^(#([0-9A-Fa-f]{3}){1,2}|rgb\(\d+,\s*\d+,\s*\d+\)|rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)|hsl\(\d+,\s*[\d.]+%,\s*[\d.]+%\)|hsla\(\d+,\s*[\d.]+%,\s*[\d.]+%,\s*[\d.]+\))$/;
      return validColorPattern.test(color) ? color : null;
    },

    /**
     * Inject Root Styles config.
     */
    injectRootStyles(fontFamily, textColor, buttonColor, buttonTextColor) {
      const style = document.createElement("style");
      style.textContent = `
      :root {
        --mf-font-family: ${fontFamily};
        --mf-primary-color: ${textColor};
        --mf-button-bg: ${buttonColor};
        --mf-button-text: ${buttonTextColor};
        /* Add other CSS variables if needed */
      }
    `;
      document.head.appendChild(style);
    },

    /**
     * Checks the page for context using a meta tag or a content scan.
     * Returns a keyword string or an empty string.
     */
    getPageContext: function () {
      var meta = document.querySelector('meta[name="mf-keyword"]');
      if (meta && meta.getAttribute("content")) {
        return meta.getAttribute("content").trim();
      }
      // Example fallback: scan for "course" in page text.
      if (document.body.textContent.toLowerCase().indexOf("course") !== -1) {
        return "course";
      }
      return "";
    },

    /**
     * Ensures HTMX is available. Loads it from a CDN if needed.
     */
    ensureHTMX: function (callback) {
      if (window.htmx) {
        callback();
      } else {
        var script = document.createElement("script");
        script.src = "https://unpkg.com/htmx.org@1.9.2";
        script.onload = callback;
        document.head.appendChild(script);
      }
    },

    /**
     * Loads the base url for the templates links.
     */
    loadBaseUrl: function (serviceUrl) {
      // Extract the base URL from the provided service URL
      const baseUrl = new URL(serviceUrl).origin;

      // Define the script content as a function to maintain proper scope
      const scriptContent = `
			function updateElements() {
				document.querySelectorAll(".mf-has-url").forEach(element => {
					["hx-get", "hx-post"].forEach(hxAttr => {
						if (element.hasAttribute(hxAttr)) {
							let currentUrl = element.getAttribute(hxAttr).trim();

							// Ensure the URL does not already contain the baseUrl
							if (!currentUrl.startsWith("${baseUrl}")) {
								// Ensure proper formatting (add '/' if needed)
								const finalUrl = \`${baseUrl}\${currentUrl.startsWith("/") ? "" : "/"}\${currentUrl}\`;
            					element.setAttribute(hxAttr, finalUrl);
							}
						}
					});
				});
			}

			if (document.readyState === "loading") {
				document.addEventListener("DOMContentLoaded", updateElements);
			} else {
				updateElements(); // Run immediately if DOM is already loaded
			}

			// Watch for dynamically added elements
			const urlObserver = new MutationObserver(updateElements);
			urlObserver.observe(document.body, { childList: true, subtree: true });
		`;

      // Create and inject the script element
      const script = document.createElement("script");
      script.textContent = scriptContent;

      // Append the link element to the head
      document.head.appendChild(script);
    },

    /**
     * Loads the script that automatically trims descriptions text length to standardize them.
     */
    trimDescriptions: function () {
      // Define the script content as a function to maintain proper scope
      const scriptContent = `
			function truncateText(selector, maxLength) {
				document.querySelectorAll(selector).forEach(element => {
					const originalText = element.textContent.trim();
					if (originalText.length > maxLength) {
						element.textContent = originalText.slice(0, maxLength) + '...';
					}
				});
			}

			function runTruncateText() {
				truncateText(".mf-course-card__description", 75);
			}

			if (document.readyState === "loading") {
				document.addEventListener("DOMContentLoaded", runTruncateText);
			} else {
				runTruncateText(); // Run immediately if DOM is already loaded
			}

			// Watch for dynamically added elements
			const textObserver = new MutationObserver(runTruncateText);
			textObserver.observe(document.body, { childList: true, subtree: true });
		`;

      // Create and inject the script element
      const script = document.createElement("script");
      script.textContent = scriptContent;

      // Append the link element to the head
      document.head.appendChild(script);
    },

    /**
     * Loads the script that automatically updates the main display mode of the courses.
     */
    loadMainDisplay: function (display, detail) {
      // Build the script content as a self-executing function to maintain proper scope.
      const scriptContent = `
			(function() {
				function updateDisplay() {
					// Update course list display
					const courseDiv = document.getElementById("mf-course-list");
					if (courseDiv) {
						courseDiv.classList.add("mf-course-list__${
              detail === "inlineOnModal" ? "scrollable-vertical" : display
            }");
					}
			
					// Determine how to display details view based on the detail value
					if ("${detail}" === "inline" || "${detail}" === "inlineOnModal") {
						const courseButtons = document.querySelectorAll(".mf-course-card__button");
						if (courseButtons) {
							courseButtons.forEach(element => {
								let hxGetValue = element.getAttribute("hx-get") || "";
								if (hxGetValue.includes("?view=modal")) {
									hxGetValue = hxGetValue.replaceAll("?view=modal", "");
									element.setAttribute("hx-get", hxGetValue);
								}
								element.setAttribute("hx-target", "#mf-detail-container");
							});
						}
					}
			
					if ("${detail}" === "modal") {
						const courseTitles = document.querySelectorAll(".mf-course-card__title");
						if (courseTitles) {
							courseTitles.forEach(element => {
								let hxGetValue = element.getAttribute("hx-get") || "";
								if (!hxGetValue.includes("?view=modal")) {
									element.setAttribute("hx-get", hxGetValue + "?view=modal");
								}
								element.setAttribute("hx-target", "#mf-modal");
							});
						}
					}

					if ("${detail}" === "inlineOnModal") {
						const mfContainer = document.getElementById("mf-container");
						const mfCourseList = document.getElementById("mf-course-list");
						const mfDetailContainer = document.getElementById("mf-detail-container");
						const mfDetailDefault = document.getElementById("mf-detail-default");
						
						// Container styles
						if (mfContainer) {
							Object.assign(mfContainer.style, {
								display: "flex",
								gap: "1rem",
							});
						}

						// Course list styles
						if (mfCourseList) {
							Object.assign(mfCourseList.style, {
								flexBasis: "30%",
							});
						}

						// Detail container styles
						if (mfDetailContainer) {
							Object.assign(mfDetailContainer.style, {
								flexBasis: "70%",
								marginBlockStart: 0,
								maxHeight: "fit-content",
							});
						}

						// Show default detail content
						if (mfDetailDefault) {
							mfDetailDefault.style.display = 'flex';
						}
					}
				}
			
				// Run updateDisplay when DOM is ready.
				if (document.readyState === "loading") {
					document.addEventListener("DOMContentLoaded", updateDisplay);
				} else {
					updateDisplay();
				}
			
				// Watch for dynamically added elements and update if necessary.
				const detailObserver = new MutationObserver(updateDisplay);
				detailObserver.observe(document.body, { childList: true, subtree: true });
			})();
		`;

      // Create and inject the script element.
      const script = document.createElement("script");
      script.textContent = scriptContent;
      document.head.appendChild(script);
    },

    /**
     * Loads the custom styles for the templates.
     */
    loadStyles: function (serviceUrl) {
      const url = new URL(serviceUrl);
      const baseDomain = url.origin;

      // Create a new link element for the stylesheet
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${baseDomain}/static/css/style.css`;

      // Append the link element to the head
      document.head.appendChild(link);
    },

    /**
     * Loads the main view inline by setting HTMX attributes on the container.
     */
    loadInline: function (container, serviceUrl) {
      container.setAttribute("hx-get", serviceUrl);
      container.setAttribute("hx-trigger", "load");
      container.setAttribute("hx-swap", "innerHTML");
      if (window.htmx) {
        window.htmx.process(container);
      }
    },

    /**
     * Loads content into a modal overlay.
     */
    loadModal: function (serviceUrl) {
      // Create the modal overlay element.
      var modalOverlay = document.createElement("div");
      modalOverlay.id = "mf-modal";
      modalOverlay.style.cssText =
        "position: fixed; top: 0; left: 0; width: 100%; height: 100%; " +
        "background-color: rgba(0,0,0,0.5); display: flex; align-items: center; " +
        "justify-content: center; z-index: 1000;";

      // Create the modal content container.
      var modalContent = document.createElement("div");
      modalContent.id = "mf-modal-content";
      modalContent.style.cssText =
        "position: relative; background-color: #fff; padding: 20px; " +
        "border-radius: 5px; max-width: 90%; max-height: 90%; overflow: auto;";

      // Create the close button.
      var closeButton = document.createElement("button");
      closeButton.textContent = "Close";
      closeButton.style.cssText =
        "position: absolute; top: 10px; right: 10px; padding: 5px 10px; " +
        "background-color: #f44336; color: #fff; border: none; border-radius: 3px; " +
        "cursor: pointer;";
      closeButton.addEventListener("click", function () {
        document.body.removeChild(modalOverlay);
      });

      // Append the close button to the modal content.
      modalContent.appendChild(closeButton);

      // Create a separate container for the dynamic content loaded by HTMX.
      var contentContainer = document.createElement("div");
      contentContainer.id = "mf-modal-dynamic-content";
      // Set HTMX attributes on the dynamic content container.
      contentContainer.setAttribute("hx-get", serviceUrl);
      contentContainer.setAttribute("hx-trigger", "load");
      contentContainer.setAttribute("hx-swap", "innerHTML");

      // Append the content container to the modal content.
      modalContent.appendChild(contentContainer);

      // Append the modal content to the overlay.
      modalOverlay.appendChild(modalContent);
      // Append the overlay to the document body.
      document.body.appendChild(modalOverlay);

      // Process the new container with HTMX.
      if (window.htmx) {
        window.htmx.process(contentContainer);
      }
    },

    /**
     * Attaches a click listener to the inline container that opens detail views in a modal.
     * Expects clickable elements to have the class "mf-detail" and a "data-detail-url" attribute.
     */
    attachDetailModal: function (container) {
      container.addEventListener("click", function (event) {
        var target = event.target;
        while (target && target !== container) {
          if (target.classList && target.classList.contains("mf-detail")) {
            event.preventDefault();
            var detailUrl = target.getAttribute("data-detail-url");
            if (detailUrl) {
              var keyword = MicroFrontend.getPageContext();
              if (keyword) {
                var separator = detailUrl.indexOf("?") > -1 ? "&" : "?";
                detailUrl +=
                  separator + "keyword=" + encodeURIComponent(keyword);
              }
              MicroFrontend.loadModal(detailUrl);
            } else {
              console.error(
                "MicroFrontend: detail element missing 'data-detail-url' attribute."
              );
            }
            break;
          }
          target = target.parentElement;
        }
      });
    },

    /**
     * Attaches a click listener to the inline container that loads detail views inline.
     * Expects a dedicated inline detail container with the selector "#mf-detail-container".
     */
    attachDetailInline: function (container) {
      container.addEventListener("click", function (event) {
        var target = event.target;
        while (target && target !== container) {
          if (target.classList && target.classList.contains("mf-detail")) {
            event.preventDefault();
            var detailUrl = target.getAttribute("data-detail-url");
            if (detailUrl) {
              var keyword = MicroFrontend.getPageContext();
              if (keyword) {
                var separator = detailUrl.indexOf("?") > -1 ? "&" : "?";
                detailUrl +=
                  separator + "keyword=" + encodeURIComponent(keyword);
              }
              var detailContainer = document.querySelector(
                "#mf-detail-container"
              );
              if (detailContainer) {
                detailContainer.setAttribute("hx-get", detailUrl);
                detailContainer.setAttribute("hx-trigger", "load");
                detailContainer.setAttribute("hx-swap", "innerHTML");
                if (window.htmx) {
                  window.htmx.process(detailContainer);
                }
              } else {
                console.error(
                  "MicroFrontend: inline detail container '#mf-detail-container' not found."
                );
              }
            } else {
              console.error(
                "MicroFrontend: detail element missing 'data-detail-url' attribute."
              );
            }
            break;
          }
          target = target.parentElement;
        }
      });
    },
  };

  window.MicroFrontend = MicroFrontend;
})(window, document);
