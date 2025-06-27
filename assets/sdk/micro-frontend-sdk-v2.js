(function (window, document) {
  "use strict";

  const MicroFrontend = {
    /**
     * MAIN INITIALIZATION
     * Orchestrates the entire setup process
     *
     * Options:
     *  - mainMode: "inline" (default) or "modal" – determines how the main view is rendered.
     *  - detailMode: "inline" or "modal" – determines how detail views are displayed.
     *  - target: CSS selector for the main view container (required for mainMode "inline").
     *  - serviceUrl: Base URL for the micro frontend content.
     *  - defaultKeyword: A fallback keyword if no meta tag or page context is detected.
     *  - styleSelectors: Object mapping CSS selectors to style properties.
     *  - cssMap: Custom CSS variable mapping.
     *
     * @param {Object} options - Configuration options
     */
    init: function (options = {}) {
      this.config = this._mergeConfig(options);
      this._initializeShadowRoot();
      this._detectKeyword();
      this._prepareServiceUrl();

      this._loadDependencies(() => {
        this._adaptStyles();
        this._loadCoreContent();
        this._setupContentHandlers();
      });
    },

    // ------------------------------
    // CONFIGURATION MANAGEMENT
    // ------------------------------

    /**
     * Merge user config with safe defaults
     */
    _mergeConfig: function (userOptions) {
      return {
        mainMode: userOptions.mainMode || "inline",
        detailMode: userOptions.detailMode || "modal",
        target: userOptions.target || null,
        serviceUrl: userOptions.serviceUrl || "http://localhost:8080/search",
        defaultKeyword: userOptions.defaultKeyword || "",
        styleSelectors: {
          body: userOptions.styleSelectors?.body || "body",
          button:
            userOptions.styleSelectors?.button || 'button, [type="button"]',
        },
        cssMap: {
          fontFamily: userOptions.cssMap?.fontFamily || "--mf-font-family",
          color: userOptions.cssMap?.color || "--mf-text-color",
          buttonColor: userOptions.cssMap?.buttonColor || "--mf-button-text",
          buttonBg: userOptions.cssMap?.buttonBg || "--mf-button-bg",
        },
      };
    },

    /**
     * Prepare service URL with keyword parameter
     */
    _prepareServiceUrl: function () {
      if (this.keyword) {
        const separator = this.config.serviceUrl.includes("?") ? "&" : "?";
        this.config.serviceUrl = `${
          this.config.serviceUrl
        }${separator}keyword=${encodeURIComponent(this.keyword)}`;
      }
    },

    // ------------------------------
    // STYLE ADAPTATION SYSTEM
    // ------------------------------

    /**
     * Core style adaptation flow
     */
    _adaptStyles: function () {
      try {
        const styles = this._extractParentStyles();
        const cssVars = this._generateCSSVariables(styles);
        this._injectStyleElement(cssVars);
      } catch (error) {
        console.warn("Style adaptation failed, using fallbacks:", error);
        this._injectFallbackStyles();
      }
    },

    /**
     * Extract computed styles from parent elements
     */
    _extractParentStyles: function () {
      const styles = {};
      Object.entries(this.config.styleSelectors).forEach(([key, selector]) => {
        const element = document.querySelector(selector);
        if (element) {
          const computed = getComputedStyle(element);
          styles[key] = {
            fontFamily: computed.fontFamily,
            color: computed.color,
            backgroundColor: computed.backgroundColor,
          };
        }
      });
      return styles;
    },

    /**
     * Generate CSS variables from extracted styles
     */
    _generateCSSVariables: function (styles) {
      let css = ":host {";
      Object.entries(this.config.cssMap).forEach(([prop, varName]) => {
        const elementType = this._normalizeProp(prop);
        const value =
          styles[elementType]?.[prop] || this._getStyleFallback(prop);
        css += `${varName}: ${value};`;
      });
      css += "}";
      return css;
    },

    /**
     * Normalize CSS property names to match selector keys
     */
    _normalizeProp: function (prop) {
      return prop.replace(/(Color|Bg|FontFamily)/g, "");
    },

    /**
     * Get fallback values for missing styles
     */
    _getStyleFallback: function (prop) {
      const fallbacks = {
        fontFamily: "system-ui, sans-serif",
        color: "#333",
        buttonColor: "#fff",
        buttonBg: "#0066cc",
      };
      return fallbacks[prop] || "unset";
    },

    /**
     * Inject generated CSS variables into shadow DOM
     */
    _injectStyleElement: function (cssContent) {
      const styleEl = document.createElement("style");
      styleEl.textContent = cssContent;
      this.shadowRoot.appendChild(styleEl);
    },

    /**
     * Load fallback styles when parent styles can't be extracted
     */
    _injectFallbackStyles: function () {
      const fallbackCSS = `
        :host {
          --mf-font: system-ui, sans-serif;
          --mf-text: #333;
          --mf-btn-text: #fff;
          --mf-btn-bg: #0066cc;
        }
      `;
      this._injectStyleElement(fallbackCSS);
    },

    // ------------------------------
    // CORE CONTENT MANAGEMENT
    // ------------------------------

    /**
     * Main content loading sequence
     */
    _loadCoreContent: function () {
      // Load styles and content into shadow root
      this._loadExternalStyles();
      this._setupBaseUrl();
      this._initTextTruncation();

      if (this.config.mainMode === "inline") {
        this._handleInlineContent();
      } else {
        this._handleModalContent();
      }
    },

    /**
     * Handle inline content presentation
     */
    _handleInlineContent: function () {
      const container = this.internalWrapper;
      this._initHTMX(container, this.config.serviceUrl);
      this.config.detailMode === "modal"
        ? this._setupModalHandlers(container)
        : this._setupInlineDetailHandlers(container);
    },

    /**
     * Handle modal content presentation
     */
    _handleModalContent: function () {
      const modal = this._createModalStructure();
      this._initHTMX(modal.contentContainer, this.config.serviceUrl);
    },

    /**
     * Load external CSS files from service URL
     */
    _loadExternalStyles: function () {
      const styleLink = document.createElement("link");
      styleLink.rel = "stylesheet";
      styleLink.href = `${
        new URL(this.config.serviceUrl).origin
      }/static/css/style.css`;
      this.shadowRoot.appendChild(styleLink);
    },

    /**
     * Get target container element with validation
     */
    _getTargetContainer: function () {
      const container = document.querySelector(this.config.target);
      if (!container) {
        throw new Error(`Target container not found: ${this.config.target}`);
      }
      return container;
    },

    // ------------------------------
    // HTMX INTEGRATION
    // ------------------------------

    /**
     * Initialize HTMX on elements
     */
    _initHTMX: function (element, url) {
      // Ensure HTMX is available
      if (!window.htmx) {
        console.error("HTMX not loaded");
        return;
      }

      // Set attributes with valid selectors
      element.setAttribute("hx-get", url);
      element.setAttribute("hx-trigger", "load");
      element.setAttribute("hx-swap", "innerHTML");

      // Process within shadow root context
      htmx.process(element, {
        root: this.shadowRoot, // Critical for shadow DOM targeting
        onNewNode: (node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            htmx.process(node, { root: this.shadowRoot });
          }
        },
      });

      // Define the extension once globally
      //   if (!window.htmxShadowPartsInitialized) {
      //     htmx.defineExtension("shadowParts", {
      //       onEvent: (name, evt) => {
      //         if (name === "htmx:beforeProcessNode") {
      //           const el = evt.detail.elt;
      //           if (
      //             el.hasAttribute("hx-target") &&
      //             el.getAttribute("hx-target").startsWith("part:")
      //           ) {
      //             const partName = el.getAttribute("hx-target").split(":")[1];
      //             el.setAttribute("hx-target", `[part="${partName}"]`);
      //             el.dataset.htmxShadowRoot = this.container.id;
      //           }
      //         }
      //       },
      //     });
      //     window.htmxShadowPartsInitialized = true;
      //   }

      // Configure element attributes
      //   element.setAttribute("hx-get", url);
      //   element.setAttribute("hx-trigger", "load");
      //   element.setAttribute("hx-swap", "innerHTML");
      //   element.dataset.htmxShadowRoot = this.container.id;

      // Process with shadow context
      //   htmx.process(element, {
      //     root: this.shadowRoot,
      //     extensions: ["shadowParts"],
      //     onNewNode: (node) => {
      //       if (node.nodeType === Node.ELEMENT_NODE) {
      //         // Convert part: targets in new nodes
      //         if (
      //           node.hasAttribute("hx-target") &&
      //           node.getAttribute("hx-target").startsWith("part:")
      //         ) {
      //           const partName = node.getAttribute("hx-target").split(":")[1];
      //           node.setAttribute("hx-target", `[part="${partName}"]`);
      //         }

      //         htmx.process(node, {
      //           root: this.shadowRoot,
      //           extensions: ["shadowParts"],
      //         });
      //       }
      //     },
      //   });
    },

    // ------------------------------
    // MODAL MANAGEMENT SYSTEM
    // ------------------------------

    /**
     * Create modal DOM structure
     */
    _createModalStructure: function () {
      const overlay = document.createElement("div");
      overlay.id = "mf-modal-overlay";
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      `;

      const content = document.createElement("div");
      content.id = "mf-modal-content";
      content.style.cssText = `
        background: white;
        padding: 2rem;
        border-radius: 8px;
        max-width: 90%;
        max-height: 90vh;
        overflow: auto;
        position: relative;
      `;

      const closeBtn = this._createCloseButton(() => {
        document.body.removeChild(overlay);
      });

      const dynamicContent = document.createElement("div");
      dynamicContent.id = "mf-modal-dynamic-content";

      content.append(closeBtn, dynamicContent);
      overlay.appendChild(content);
      document.body.appendChild(overlay);

      return {
        overlay,
        contentContainer: dynamicContent,
      };
    },

    /**
     * Create modal close button
     */
    _createCloseButton: function (onClick) {
      const btn = document.createElement("button");
      btn.textContent = "×";
      btn.style.cssText = `
        position: absolute;
        top: 1rem;
        right: 1rem;
        background: transparent;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
      `;
      btn.addEventListener("click", onClick);
      return btn;
    },

    // ------------------------------
    // CONTENT OBSERVERS SUBSYSTEM
    // ------------------------------

    /**
     * Set up MutationObserver for text truncation
     */
    _setupTextTruncationObserver: function () {
      const truncate = () => {
        this.shadowRoot
          .querySelectorAll(".mf-course-card__description")
          .forEach((el) => {
            const maxLength = 60;
            const text = el.textContent.trim();
            el.textContent =
              text.length > maxLength ? text.slice(0, maxLength) + "..." : text;
          });
      };

      this.textTruncationObserver = new MutationObserver(truncate);
      this.textTruncationObserver.observe(this.shadowRoot, {
        childList: true,
        subtree: true,
      });

      // Initial truncation
      truncate();
    },

    /**
     * Set up MutationObserver for dynamic URL updates
     */
    _setupDynamicUrlObserver: function () {
      const updateUrls = () => {
        const baseUrl = new URL(this.config.serviceUrl).origin;
        this.shadowRoot.querySelectorAll(".mf-has-url").forEach((el) => {
          ["hx-get", "hx-post"].forEach((attr) => {
            const value = el.getAttribute(attr);
            if (value && !value.startsWith(baseUrl)) {
              el.setAttribute(
                attr,
                `${baseUrl}${value.startsWith("/") ? value : `/${value}`}`
              );
            }
          });
        });
      };

      this.urlObserver = new MutationObserver(updateUrls);
      this.urlObserver.observe(this.shadowRoot, {
        childList: true,
        subtree: true,
      });

      // Initial update
      updateUrls();
    },

    // ------------------------------
    // CONTENT HANDLERS & UTILITIES
    // ------------------------------

    /**
     * Set up text truncation system
     */
    _initTextTruncation: function () {
      const script = document.createElement("script");
      script.textContent = `
        (function() {
          const truncate = (selector, max) => {
            document.querySelectorAll(selector).forEach(el => {
              const text = el.textContent.trim();
              el.textContent = text.length > max 
                ? text.slice(0, max) + '...' 
                : text;
            });
          };

          const observer = new MutationObserver(() => {
            truncate('.mf-course-card__description', 75);
          });

          if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => observer.observe(document.body, {
              childList: true,
              subtree: true
            }));
          } else {
            observer.observe(document.body, { childList: true, subtree: true });
          }
        })();
      `;
      this.shadowRoot.appendChild(script);
    },

    /**
     * Set up base URL for all dynamic links
     */
    _setupBaseUrl: function () {
      const baseUrl = new URL(this.config.serviceUrl).origin;
      const script = document.createElement("script");
      script.textContent = `
        (function() {
          const updateUrls = () => {
            document.querySelectorAll('.mf-has-url').forEach(el => {
              ['hx-get', 'hx-post'].forEach(attr => {
                const value = el.getAttribute(attr);
                if (value && !value.startsWith('${baseUrl}')) {
                  el.setAttribute(attr, '${baseUrl}' + (value.startsWith('/') ? value : '/' + value));
                }
              });
            });
          };

          const observer = new MutationObserver(updateUrls);
          observer.observe(document.body, { childList: true, subtree: true });
          updateUrls();
        })();
      `;
      this.shadowRoot.appendChild(script);
    },

    /**
     * Handle inline detail view navigation
     */
    _handleInlineDetailNavigation: function (element) {
      const detailUrl = element.dataset.detailUrl;
      const detailContainer = document.querySelector("#mf-detail-container");

      if (!detailContainer) {
        console.error("Detail container not found");
        return;
      }

      this._initHTMX(detailContainer, this._addKeywordParam(detailUrl));
    },

    /**
     * Set up all content interaction handlers
     */
    _setupContentHandlers: function () {
      this._setupTextTruncationObserver();
      this._setupDynamicUrlObserver();
    },

    // ------------------------------
    // EVENT HANDLING SYSTEM
    // ------------------------------

    /**
     * Set up modal interaction handlers
     */
    _setupModalHandlers: function (container) {
      container.addEventListener("click", (e) => {
        const target = e.target.closest(".mf-detail");
        if (target) {
          e.preventDefault();
          const detailUrl = target.dataset.detailUrl;
          if (detailUrl) {
            this._loadModalContent(detailUrl);
          }
        }
      });
    },

    /**
     * Load content into modal
     */
    _loadModalContent: function (url) {
      const modal = this._createModalStructure();
      this._initHTMX(modal.contentContainer, this._addKeywordParam(url));
    },

    /**
     * Handle inline detail view interactions
     */
    _setupInlineDetailHandlers: function (container) {
      container.addEventListener("click", (e) => {
        const detailElement = e.target.closest(".mf-detail");
        if (detailElement) {
          e.preventDefault();
          this._handleInlineDetailNavigation(detailElement);
        }
      });
    },

    // ------------------------------
    // HELPER METHODS
    // ------------------------------

    /**
     * Initialize shadow root container
     */
    _initializeShadowRoot: function () {
      // Get the target container element
      this.container = document.querySelector(this.config.target);

      if (!this.container) {
        throw new Error(`Target container not found: ${this.config.target}`);
      }

      // Remove existing content in light DOM
      this.container.innerHTML = "";

      // Create fresh shadow root
      if (this.container.shadowRoot) this.container.shadowRoot.remove();
      this.shadowRoot = this.container.attachShadow({ mode: "open" });

      // Create internal wrapper INSIDE shadow root
      this.internalWrapper = document.createElement("div");
      this.internalWrapper.id = "mf-internal-wrapper";
      this.shadowRoot.appendChild(this.internalWrapper);

      //   // Attach shadow root if not already attached
      //   if (!this.container.shadowRoot) {
      //     this.shadowRoot = this.container.attachShadow({ mode: "open" });
      //   } else {
      //     this.shadowRoot = this.container.shadowRoot;
      //     console.warn("Using existing shadow root on container");
      //   }

      //   // Clear existing content if any
      //   this.shadowRoot.innerHTML = "";

      //   // Add encapsulation style
      //   const encapsulationStyle = document.createElement("style");
      //   encapsulationStyle.textContent = `
      //     :host {
      //       display: block;
      //       contain: content;
      //       /* Add other default host styles here */
      //     }
      //   `;
      //   this.shadowRoot.appendChild(encapsulationStyle);
    },

    /**
     * Add keyword parameter to URLs
     */
    _addKeywordParam: function (url) {
      if (!this.keyword) return url;
      const separator = url.includes("?") ? "&" : "?";
      return `${url}${separator}keyword=\${encodeURIComponent(this.keyword)}`;
    },

    /**
     * Detect page context keyword
     */
    _detectKeyword: function () {
      const meta = document.querySelector('meta[name="mf-keyword"]');
      this.keyword = meta?.content?.trim() || this.config.defaultKeyword;
    },

    /**
     * Load external dependencies
     */
    _loadDependencies: function (callback) {
      if (!window.htmx) {
        const script = document.createElement("script");
        script.src = "https://unpkg.com/htmx.org@1.9.2";
        script.onload = () => {
          // Initialize extensions after HTMX loads
          this._initializeHTMXExtensions();
          callback();
        };
        document.head.appendChild(script);
      } else {
        this._initializeHTMXExtensions();
        callback();
      }
    },

    /**
     * Initialize HTMX extensions
     */
    _initializeHTMXExtensions: function () {
      if (!window.htmxShadowPartsInitialized && window.htmx) {
        htmx.defineExtension("shadowParts", {
          onEvent: (name, evt) => {
            if (name === "htmx:beforeProcessNode") {
              const el = evt.detail.elt;
              if (
                el.hasAttribute("hx-target") &&
                el.getAttribute("hx-target").startsWith("part:")
              ) {
                const partName = el.getAttribute("hx-target").split(":")[1];
                el.setAttribute("hx-target", `[part="${partName}"]`);
                el.dataset.htmxShadowRoot = this.container.id;
              }
            }
          },
        });
        window.htmxShadowPartsInitialized = true;
      }
    },
  };

  window.MicroFrontend = MicroFrontend;
})(window, document);
