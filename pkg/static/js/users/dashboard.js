"use strict";

class LinkSaver {
  constructor() {
    this.currentLinkDataForModal = null; // Store data of the link being viewed/edited
    this.initializeEventListeners();
    this.autoDismissServerFlashMessages();
    this.initLazyLoadObserver(); // For potential future image previews or heavy content
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
    const errorElement = document.createElement("span");
    errorElement.className = "form-error-message";
    errorElement.textContent = message;
    // Insert after field or its wrapper
    if (field.parentNode.classList.contains("form-group")) {
      field.parentNode.appendChild(errorElement);
    } else {
      field.insertAdjacentElement("afterend", errorElement);
    }
  }

  clearFieldErrors(form) {
    form
      .querySelectorAll(".error-input")
      .forEach((el) => el.classList.remove("error-input"));
    form.querySelectorAll(".form-error-message").forEach((el) => el.remove());
  }

  openAddLinkModal() {
    document.getElementById("modalTitle").textContent = "Add New Link";
    document.getElementById("saveBtn").textContent = "Save Link";
    const linkForm = document.getElementById("linkForm");
    linkForm.reset();
    this.clearFieldErrors(linkForm); // Clear errors when opening
    linkForm.action = appConfig.addLinkUrl;
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
        "opacity 0.4s ease, transform 0.4s ease, margin-bottom 0.4s ease";
      notification.style.opacity = "0";
      notification.style.transform = "translateX(110%)";
      notification.style.marginBottom = `-${notification.offsetHeight}px`; // Collapse space
      setTimeout(() => notification.remove(), 400);
    }
  }

  createNotificationsContainer() {
    const container = document.createElement("div");
    container.id = "js-notifications-container";
    // Basic styling, primary styling from CSS file
    container.style.position = "fixed";
    container.style.zIndex = "10001"; // Above server flash potentially
    document.body.appendChild(container);
    return container;
  }

  initLazyLoadObserver() {
    // Placeholder for future lazy loading implementation if needed
    // Example:
    // const images = document.querySelectorAll('img[data-src]');
    // const observer = new IntersectionObserver((entries, observer) => {
    //   entries.forEach(entry => {
    //     if (entry.isIntersecting) {
    //       const img = entry.target;
    //       img.src = img.dataset.src;
    //       img.removeAttribute('data-src');
    //       observer.unobserve(img);
    //     }
    //   });
    // });
    // images.forEach(img => observer.observe(img));
  }
}

document.addEventListener("DOMContentLoaded", () => {
  window.linkSaverApp = new LinkSaver();
});
