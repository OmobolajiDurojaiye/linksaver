"use strict";

class LinkSaver {
  constructor() {
    this.currentLinkDataForModal = null; // Store data of the link being viewed/edited
    this.metadataFetchController = null; // For aborting previous fetch requests
    this.initializeEventListeners();
    this.autoDismissServerFlashMessages();
    this.initLazyLoadObserver(); // For potential future image previews or heavy content
    this.initializeMetadataFetching(); // For URL input blur
    this.initializeUserOverrideListeners(); // For title/description inputs
  }

  autoDismissServerFlashMessages() {
    const serverFlashMessages = document.querySelectorAll(
      "#flash-messages-container .alert"
    );
    serverFlashMessages.forEach((flash) => {
      setTimeout(() => {
        if (flash && flash.parentElement) {
          flash.style.transition = "opacity 0.5s ease, transform 0.5s ease";
          flash.style.opacity = "0";
          flash.style.transform = "translateX(100%)";
          setTimeout(() => flash.remove(), 500);
        }
      }, 5000);
    });
  }

  initializeEventListeners() {
    // Add Link Button
    document
      .getElementById("addLinkBtn")
      ?.addEventListener("click", () => this.openAddLinkModal());
    document
      .getElementById("emptyStateAddLinkBtn")
      ?.addEventListener("click", () => this.openAddLinkModal());

    // Modal close buttons
    document
      .getElementById("closeModalBtn")
      ?.addEventListener("click", () => this.closeModal("linkModal"));
    document
      .getElementById("closeDetailsModalBtn")
      ?.addEventListener("click", () => this.closeModal("detailsModal"));
    document
      .getElementById("closeDeleteModalBtn")
      ?.addEventListener("click", () => this.closeModal("deleteModal"));

    // Form cancel buttons
    document.getElementById("cancelBtn")?.addEventListener("click", (e) => {
      e.preventDefault(); // Prevent form submission if it's a submit button accidentally
      this.closeModal("linkModal");
    });
    document
      .getElementById("cancelDeleteBtn")
      ?.addEventListener("click", (e) => {
        e.preventDefault();
        this.closeModal("deleteModal");
      });

    // Add/Edit Link form submission
    const linkFormElement = document.getElementById("linkForm");
    if (linkFormElement) {
      linkFormElement.addEventListener("submit", (e) =>
        this.handleLinkSaverFormSubmit(e)
      );
    }

    // Event delegation for actions on link cards
    const linksGrid = document.getElementById("linksGrid");
    if (linksGrid) {
      linksGrid.addEventListener("click", (e) => {
        const linkCard = e.target.closest(".link-card");
        if (!linkCard) return;

        this.currentLinkDataForModal = {
          id: linkCard.dataset.id,
          url: linkCard.dataset.url,
          title: linkCard.dataset.title,
          description: linkCard.dataset.description,
          category: linkCard.dataset.category,
          keywords: linkCard.dataset.keywords,
        };

        const actionButton = e.target.closest(".action-btn");
        if (actionButton) {
          if (actionButton.classList.contains("edit-btn")) {
            e.stopPropagation(); // Prevent card click if button is clicked
            this.openEditLinkModal();
          } else if (actionButton.classList.contains("delete-btn")) {
            e.stopPropagation();
            this.showDeleteConfirmationModal();
          }
        } else {
          // Click on card itself
          this.showLinkDetailsModal();
        }
      });
    }

    // Category filter auto-submit
    document
      .getElementById("categoryFilter")
      ?.addEventListener("change", (e) => {
        e.target.closest("form").submit();
      });

    // Details Modal action buttons
    document
      .getElementById("openLinkBtn")
      ?.addEventListener("click", () => this.actionOpenLink());
    document
      .getElementById("detailsEditLinkBtn")
      ?.addEventListener("click", () => this.actionEditFromDetails());
    document
      .getElementById("detailsDeleteLinkBtn")
      ?.addEventListener("click", () => this.actionDeleteFromDetails());

    // Close modals on overlay click
    document.querySelectorAll(".modal-overlay").forEach((overlay) => {
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) this.closeModal(overlay.id);
      });
    });

    // Close modals with Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        const activeModal = document.querySelector(".modal-overlay.active");
        if (activeModal) {
          this.closeModal(activeModal.id);
        }
      }
    });
  }

  initializeMetadataFetching() {
    const linkUrlInput = document.getElementById("linkUrl");
    if (linkUrlInput) {
      linkUrlInput.addEventListener("blur", (e) => this.handleUrlInputBlur(e));
      this.addMetadataFetchIndicator(linkUrlInput); // Add visual indicator
    }
  }

  addMetadataFetchIndicator(urlInput) {
    const indicator = document.createElement("span");
    indicator.id = "metadataFetchIndicator";
    indicator.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle;">
        <circle cx="11" cy="11" r="8"></circle>
        <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
      </svg>`; // Magnifying glass icon
    indicator.style.position = "absolute";
    indicator.style.right = "10px";
    indicator.style.top = "50%";
    indicator.style.transform = "translateY(-50%) scale(0.8)";
    indicator.style.display = "none"; // Hidden by default
    indicator.style.color = "var(--text-muted)";
    indicator.style.pointerEvents = "none"; // Don't interfere with input clicks

    const parentFormGroup = urlInput.closest(".form-group");
    if (parentFormGroup) {
      if (getComputedStyle(parentFormGroup).position === "static") {
        parentFormGroup.style.position = "relative";
      }
      // Insert it before the error span if present, or just append
      const errorSpan = parentFormGroup.querySelector(".form-error-message");
      if (errorSpan) {
        parentFormGroup.insertBefore(indicator, errorSpan);
      } else {
        parentFormGroup.appendChild(indicator);
      }
    }
  }

  showMetadataFetchIndicator(show = true) {
    const indicator = document.getElementById("metadataFetchIndicator");
    if (indicator) {
      indicator.style.display = show ? "inline-block" : "none";
    }
  }

  async handleUrlInputBlur(event) {
    const urlField = event.target;
    const urlValue = urlField.value.trim();
    const linkForm = urlField.closest("form");

    if (!urlValue) {
      this.showMetadataFetchIndicator(false);
      this.resetMetadataPreview();
      return;
    }

    try {
      // Basic client-side validation to ensure it's a plausible URL structure
      // The server will do more robust validation. Add http if missing for URL constructor.
      new URL(urlValue.startsWith("http") ? urlValue : `http://${urlValue}`);
    } catch (_) {
      // Don't show JS notification here, server will validate.
      // Just ensure indicator is off and preview reset.
      this.showMetadataFetchIndicator(false);
      this.resetMetadataPreview();
      return;
    }

    if (this.metadataFetchController) {
      this.metadataFetchController.abort(); // Abort previous request
    }
    this.metadataFetchController = new AbortController();
    const signal = this.metadataFetchController.signal;

    this.showMetadataFetchIndicator(true);
    this.resetMetadataPreview(true); // Keep preview area visible with loading state

    try {
      const csrfToken = linkForm.querySelector(
        'input[name="csrf_token"]'
      ).value;
      const response = await fetch(appConfig.fetchMetadataUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": csrfToken,
        },
        body: JSON.stringify({ url: urlValue }),
        signal: signal,
      });

      this.showMetadataFetchIndicator(false);

      if (signal.aborted) {
        console.log("Metadata fetch aborted.");
        return;
      }

      const metadata = await response.json();

      if (!response.ok) {
        this.showJsNotification(
          `Metadata fetch: ${metadata.error || response.statusText}`,
          "error"
        );
        this.resetMetadataPreview(); // Hide preview on error
        return;
      }

      const titleField = linkForm.querySelector("#linkTitle");
      const descriptionField = linkForm.querySelector("#linkDescription");

      if (
        metadata.title &&
        (!titleField.value.trim() || titleField.dataset.autoFilled === "true")
      ) {
        titleField.value = metadata.title;
        titleField.dataset.autoFilled = "true";
      }
      if (
        metadata.description &&
        (!descriptionField.value.trim() ||
          descriptionField.dataset.autoFilled === "true")
      ) {
        descriptionField.value = metadata.description;
        descriptionField.dataset.autoFilled = "true";
      }

      this.updateMetadataPreview(metadata);

      if (metadata.title || metadata.description || metadata.image_url) {
        this.showJsNotification("Metadata auto-filled.", "info");
      } else {
        this.showJsNotification(
          "No specific metadata found to auto-fill.",
          "info"
        );
      }
    } catch (error) {
      this.showMetadataFetchIndicator(false);
      this.resetMetadataPreview();
      if (error.name === "AbortError") {
        // This is expected if a new request starts or modal closes
        console.log("Metadata fetch aborted by user action.");
      } else {
        console.error("Error fetching metadata:", error);
        this.showJsNotification(
          "Client-side error fetching metadata. Check console.",
          "error"
        );
      }
    } finally {
      this.metadataFetchController = null;
    }
  }

  initializeUserOverrideListeners() {
    const linkForm = document.getElementById("linkForm");
    if (linkForm) {
      const titleField = linkForm.querySelector("#linkTitle");
      const descriptionField = linkForm.querySelector("#linkDescription");

      if (titleField) {
        titleField.addEventListener("input", () => {
          titleField.dataset.autoFilled = "false";
        });
      }
      if (descriptionField) {
        descriptionField.addEventListener("input", () => {
          descriptionField.dataset.autoFilled = "false";
        });
      }
    }
  }

  updateMetadataPreview(metadata) {
    const previewArea = document.getElementById("metadataPreviewArea");
    const imagePreview = document.getElementById("metadataImagePreview");
    const noImageText = document.getElementById("metadataNoImageText");
    const descriptionPreview = document.getElementById(
      "metadataDescriptionPreview"
    );

    if (!previewArea || !imagePreview || !noImageText || !descriptionPreview)
      return;

    let showPreview = false;

    if (metadata.image_url) {
      imagePreview.src = metadata.image_url;
      imagePreview.style.display = "block";
      noImageText.style.display = "none";
      showPreview = true;
    } else {
      imagePreview.style.display = "none";
      imagePreview.src = "#"; // Clear previous image
      noImageText.style.display = "flex";
    }

    if (metadata.description) {
      descriptionPreview.textContent =
        metadata.description.length > 150
          ? metadata.description.substring(0, 147) + "..."
          : metadata.description;
      showPreview = true;
    } else {
      descriptionPreview.textContent = "No description fetched.";
    }

    // Show preview area if there's an image or a description was fetched (even if empty string)
    if (metadata.image_url || typeof metadata.description === "string") {
      showPreview = true;
    }

    previewArea.style.display = showPreview ? "block" : "none";
  }

  resetMetadataPreview(showLoading = false) {
    const previewArea = document.getElementById("metadataPreviewArea");
    const imagePreview = document.getElementById("metadataImagePreview");
    const noImageText = document.getElementById("metadataNoImageText");
    const descriptionPreview = document.getElementById(
      "metadataDescriptionPreview"
    );

    if (!previewArea || !imagePreview || !noImageText || !descriptionPreview)
      return;

    if (showLoading) {
      previewArea.style.display = "block";
      imagePreview.style.display = "none";
      imagePreview.src = "#";
      noImageText.style.display = "flex";
      descriptionPreview.textContent = "Fetching metadata...";
    } else {
      previewArea.style.display = "none";
      imagePreview.src = "#";
      imagePreview.style.display = "none";
      noImageText.style.display = "flex";
      descriptionPreview.textContent = "";
    }
  }

  handleLinkSaverFormSubmit(event) {
    if (!this.validateLinkSaverForm(event.target)) {
      event.preventDefault(); // Stop form submission if client-side validation fails
    }
    // If valid, the form submits traditionally to the server which handles success/error
  }

  validateLinkSaverForm(form) {
    const urlField = form.querySelector("#linkUrl");
    const titleField = form.querySelector("#linkTitle");
    let isValid = true;

    // Clear previous errors
    this.clearFieldErrors(form);

    if (!urlField.value.trim()) {
      this.showFieldError(urlField, "URL is a required field.");
      isValid = false;
    } else {
      try {
        new URL(urlField.value.trim());
      } catch (_) {
        this.showFieldError(
          urlField,
          "Please enter a valid URL (e.g., https://example.com)."
        );
        isValid = false;
      }
    }

    if (!titleField.value.trim()) {
      this.showFieldError(titleField, "Title is a required field.");
      isValid = false;
    }

    if (!isValid) {
      this.showJsNotification(
        "Please correct the errors in the form.",
        "error"
      );
    }
    return isValid;
  }

  showFieldError(field, message) {
    field.classList.add("error-input"); // Add a class for styling
    const errorElementId = `${field.id}Error`; // Convention for error element ID
    let errorElement = document.getElementById(errorElementId);

    if (!errorElement) {
      // If the dedicated span (e.g., #urlError) doesn't exist or we want a new one
      errorElement = document.createElement("span");
      errorElement.id = errorElementId; // Assign ID if creating dynamically
      errorElement.className = "form-error-message";
      errorElement.setAttribute("role", "alert");

      // Insert after field or its wrapper
      if (field.parentNode.classList.contains("form-group")) {
        field.parentNode.appendChild(errorElement);
      } else {
        field.insertAdjacentElement("afterend", errorElement);
      }
    }
    errorElement.textContent = message;
    errorElement.style.display = "block"; // Ensure it's visible
  }

  clearFieldErrors(form) {
    form
      .querySelectorAll(".error-input")
      .forEach((el) => el.classList.remove("error-input"));
    form.querySelectorAll(".form-error-message").forEach((el) => {
      el.textContent = ""; // Clear text
      el.style.display = "none"; // Hide it
    });
  }

  openAddLinkModal() {
    document.getElementById("modalTitle").textContent = "Add New Link";
    document.getElementById("saveBtn").textContent = "Save Link";
    const linkForm = document.getElementById("linkForm");
    linkForm.reset();
    this.clearFieldErrors(linkForm); // Clear errors when opening
    linkForm.action = appConfig.addLinkUrl;

    const titleField = linkForm.querySelector("#linkTitle");
    const descriptionField = linkForm.querySelector("#linkDescription");
    if (titleField) titleField.dataset.autoFilled = "true"; // Allow autofill on first try for new link
    if (descriptionField) descriptionField.dataset.autoFilled = "true"; // Allow autofill

    this.resetMetadataPreview();
    document.getElementById("linkUrl").focus(); // Focus on first field
    this.openModal("linkModal");
  }

  openEditLinkModal() {
    if (!this.currentLinkDataForModal) return;
    document.getElementById("modalTitle").textContent = "Edit Link";
    document.getElementById("saveBtn").textContent = "Update Link";

    const linkForm = document.getElementById("linkForm");
    this.clearFieldErrors(linkForm); // Clear errors when opening
    linkForm.action = `${appConfig.editLinkBaseUrl}/${this.currentLinkDataForModal.id}`;

    document.getElementById("linkUrl").value = this.currentLinkDataForModal.url;
    document.getElementById("linkTitle").value =
      this.currentLinkDataForModal.title;
    document.getElementById("linkDescription").value =
      this.currentLinkDataForModal.description || "";
    document.getElementById("linkCategoryModal").value =
      this.currentLinkDataForModal.category || "";
    document.getElementById("linkKeywords").value =
      this.currentLinkDataForModal.keywords || "";

    const titleField = linkForm.querySelector("#linkTitle");
    const descriptionField = linkForm.querySelector("#linkDescription");
    // For edit, assume existing data is user-input, don't mark as auto-filled initially
    // User might want to re-trigger autofill by clearing URL and blurring again
    if (titleField) titleField.dataset.autoFilled = "false";
    if (descriptionField) descriptionField.dataset.autoFilled = "false";

    this.resetMetadataPreview(); // Also reset preview for edit modal
    document.getElementById("linkUrl").focus(); // Focus on first field
    this.openModal("linkModal");
  }

  showLinkDetailsModal() {
    if (!this.currentLinkDataForModal) return;
    const detailsContainer = document.getElementById("linkDetailsContent");
    const link = this.currentLinkDataForModal;

    detailsContainer.innerHTML = `
      <div class="detail-item">
        <span class="detail-label">Title:</span>
        <div class="detail-value title">${this.escapeHtml(link.title)}</div>
      </div>
      <div class="detail-item">
        <span class="detail-label">URL:</span>
        <div class="detail-value">
          <a href="${this.escapeHtml(
            link.url
          )}" target="_blank" rel="noopener noreferrer" class="detail-url">${this.escapeHtml(
      link.url
    )}</a>
        </div>
      </div>
      ${
        link.description
          ? `
        <div class="detail-item">
          <span class="detail-label">Description:</span>
          <div class="detail-value">${this.escapeHtml(link.description)}</div>
        </div>`
          : ""
      }
      ${
        link.category
          ? `
        <div class="detail-item">
          <span class="detail-label">Category:</span>
          <div class="detail-value">
            <span class="link-category">${this.formatCategory(
              link.category
            )}</span>
          </div>
        </div>`
          : ""
      }
      ${
        link.keywords && link.keywords.trim()
          ? `
        <div class="detail-item">
          <span class="detail-label">Keywords:</span>
          <div class="detail-keywords">
            ${link.keywords
              .split(",")
              .filter((k) => k.trim())
              .map(
                (k) =>
                  `<span class="keyword-tag">${this.escapeHtml(
                    k.trim()
                  )}</span>`
              )
              .join("")}
          </div>
        </div>`
          : ""
      }
    `;
    this.openModal("detailsModal");
  }

  showDeleteConfirmationModal() {
    if (!this.currentLinkDataForModal) return;
    document.getElementById("deleteLinkTitleText").textContent =
      this.currentLinkDataForModal.title;
    document.getElementById(
      "deleteLinkForm"
    ).action = `${appConfig.deleteLinkBaseUrl}/${this.currentLinkDataForModal.id}`;
    this.openModal("deleteModal");
  }

  actionOpenLink() {
    if (this.currentLinkDataForModal && this.currentLinkDataForModal.url) {
      window.open(
        this.currentLinkDataForModal.url,
        "_blank",
        "noopener,noreferrer"
      );
    }
  }
  actionEditFromDetails() {
    if (this.currentLinkDataForModal) {
      this.closeModal("detailsModal");
      this.openEditLinkModal();
    }
  }
  actionDeleteFromDetails() {
    if (this.currentLinkDataForModal) {
      this.closeModal("detailsModal");
      this.showDeleteConfirmationModal();
    }
  }

  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden";
      const firstFocusable = modal.querySelector(
        'button, [href], input:not([type="hidden"]), select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (firstFocusable) setTimeout(() => firstFocusable.focus(), 50); // Delay for transition
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal && modal.classList.contains("active")) {
      modal.classList.remove("active");
      // Check if any other modal is active before restoring scroll
      const anyOtherModalActive = document.querySelector(
        ".modal-overlay.active"
      );
      if (!anyOtherModalActive) {
        document.body.style.overflow = "";
      }
      // If closing the link modal, abort any ongoing metadata fetch
      if (modalId === "linkModal" && this.metadataFetchController) {
        this.metadataFetchController.abort();
        this.metadataFetchController = null;
        this.showMetadataFetchIndicator(false); // Hide indicator
      }
    }
  }

  escapeHtml(text) {
    if (text === null || typeof text === "undefined") return "";
    return String(text).replace(/[&<>"']/g, (match) => {
      const S = { "&": "&", "<": "<", ">": ">", '"': '"', "'": "'" };
      return S[match];
    });
  }

  formatCategory(category) {
    if (!category) return "";
    return category.charAt(0).toUpperCase() + category.slice(1);
  }

  showJsNotification(message, type = "info") {
    const notificationsContainer =
      document.getElementById("js-notifications-container") ||
      this.createNotificationsContainer();

    const notification = document.createElement("div");
    notification.className = `alert alert-${type}`;
    notification.innerHTML = `${this.escapeHtml(message)}
        <button type="button" class="close" aria-label="Close notification">×</button>`;

    notification.querySelector(".close").addEventListener("click", () => {
      this.dismissNotification(notification);
    });

    notificationsContainer.appendChild(notification);

    setTimeout(() => {
      this.dismissNotification(notification);
    }, 6000); // Increased display time
  }

  dismissNotification(notification) {
    if (notification && notification.parentElement) {
      notification.style.transition =
        "opacity 0.4s ease, transform 0.4s ease, margin-bottom 0.4s ease, padding 0.4s ease, height 0.4s ease";
      notification.style.opacity = "0";
      notification.style.transform = "translateX(110%)";
      notification.style.paddingTop = "0";
      notification.style.paddingBottom = "0";
      notification.style.marginBottom = "0";
      notification.style.height = "0";
      setTimeout(() => notification.remove(), 400);
    }
  }

  createNotificationsContainer() {
    let container = document.getElementById("js-notifications-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "js-notifications-container";
      // Basic styling, primary styling from CSS file
      // CSS file should handle position, z-index etc.
      document.body.appendChild(container);
    }
    return container;
  }

  initLazyLoadObserver() {
    // Placeholder for future lazy loading implementation if needed
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.linkSaverApp = new LinkSaver();
});
