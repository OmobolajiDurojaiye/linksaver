"use strict";

class LinkSaver {
  constructor() {
    this.currentLinkDataForModal = null; // Store data of the link being viewed/edited

    this.initializeEventListeners();
    this.autoDismissServerFlashMessages();
  }

  autoDismissServerFlashMessages() {
    const serverFlashMessages = document.querySelectorAll(
      "#flash-messages-container .alert"
    );
    serverFlashMessages.forEach((flash) => {
      setTimeout(() => {
        if (flash && flash.parentElement) {
          flash.style.transition = "opacity 0.5s ease";
          flash.style.opacity = "0";
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

    // Modal close buttons (using more specific IDs from HTML)
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
    document
      .getElementById("cancelBtn")
      ?.addEventListener("click", () => this.closeModal("linkModal"));
    document
      .getElementById("cancelDeleteBtn")
      ?.addEventListener("click", () => this.closeModal("deleteModal"));

    // Add/Edit Link form validation (client-side)
    document
      .getElementById("linkForm")
      ?.addEventListener("submit", (e) => this.validateLinkSaverForm(e));

    // Event delegation for actions on link cards
    const linksGrid = document.getElementById("linksGrid");
    if (linksGrid) {
      linksGrid.addEventListener("click", (e) => {
        const linkCard = e.target.closest(".link-card");
        if (!linkCard) return;

        // Populate currentLinkDataForModal from data attributes
        this.currentLinkDataForModal = {
          id: linkCard.dataset.id,
          url: linkCard.dataset.url,
          title: linkCard.dataset.title,
          description: linkCard.dataset.description,
          category: linkCard.dataset.category,
          keywords: linkCard.dataset.keywords, // This is a comma-separated string
        };

        if (e.target.classList.contains("edit-btn")) {
          this.openEditLinkModal();
        } else if (e.target.classList.contains("delete-btn")) {
          this.showDeleteConfirmationModal();
        } else if (!e.target.classList.contains("action-btn")) {
          // Click on card itself (not buttons)
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
      if (e.key === "Escape") this.closeAllModals();
    });
  }

  validateLinkSaverForm(event) {
    const form = event.target;
    const urlField = form.querySelector("#linkUrl");
    const titleField = form.querySelector("#linkTitle");
    let isValid = true;

    if (!urlField.value.trim() || !titleField.value.trim()) {
      this.showJsNotification("URL and Title are required fields.", "error");
      isValid = false;
    }

    if (urlField.value.trim()) {
      try {
        new URL(urlField.value.trim());
      } catch (_) {
        this.showJsNotification("Please enter a valid URL.", "error");
        isValid = false;
      }
    }

    if (!isValid) {
      event.preventDefault(); // Stop form submission if client-side validation fails
    }
    // If valid, the form submits traditionally to the server
  }

  openAddLinkModal() {
    document.getElementById("modalTitle").textContent = "Add New Link";
    document.getElementById("saveBtn").textContent = "Save Link";
    const linkForm = document.getElementById("linkForm");
    linkForm.reset();
    linkForm.action = appConfig.addLinkUrl;
    this.openModal("linkModal");
  }

  openEditLinkModal() {
    if (!this.currentLinkDataForModal) return;
    document.getElementById("modalTitle").textContent = "Edit Link";
    document.getElementById("saveBtn").textContent = "Update Link";

    const linkForm = document.getElementById("linkForm");
    linkForm.action = `${appConfig.editLinkBaseUrl}/${this.currentLinkDataForModal.id}`;

    document.getElementById("linkUrl").value = this.currentLinkDataForModal.url;
    document.getElementById("linkTitle").value =
      this.currentLinkDataForModal.title;
    document.getElementById("linkDescription").value =
      this.currentLinkDataForModal.description;
    document.getElementById("linkCategoryModal").value =
      this.currentLinkDataForModal.category;
    document.getElementById("linkKeywords").value =
      this.currentLinkDataForModal.keywords;

    this.openModal("linkModal");
  }

  showLinkDetailsModal() {
    if (!this.currentLinkDataForModal) return;
    const detailsContainer = document.getElementById("linkDetailsContent");
    const link = this.currentLinkDataForModal;

    detailsContainer.innerHTML = `
      <div class="detail-item"><span class="detail-label">Title:</span><div class="detail-value">${this.escapeHtml(
        link.title
      )}</div></div>
      <div class="detail-item"><span class="detail-label">URL:</span><div class="detail-value"><a href="${this.escapeHtml(
        link.url
      )}" target="_blank" class="detail-url">${this.escapeHtml(
      link.url
    )}</a></div></div>
      ${
        link.description
          ? `<div class="detail-item"><span class="detail-label">Description:</span><div class="detail-value">${this.escapeHtml(
              link.description
            )}</div></div>`
          : ""
      }
      ${
        link.category
          ? `<div class="detail-item"><span class="detail-label">Category:</span><div class="detail-value">${this.formatCategory(
              link.category
            )}</div></div>`
          : ""
      }
      ${
        link.keywords
          ? `<div class="detail-item"><span class="detail-label">Keywords:</span><div class="detail-keywords">${link.keywords
              .split(",")
              .filter((k) => k.trim())
              .map(
                (k) =>
                  `<span class="keyword-tag">${this.escapeHtml(
                    k.trim()
                  )}</span>`
              )
              .join("")}</div></div>`
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

  // Actions from Details Modal
  actionOpenLink() {
    if (this.currentLinkDataForModal && this.currentLinkDataForModal.url) {
      window.open(this.currentLinkDataForModal.url, "_blank");
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

  // Modal Management
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add("active");
      document.body.style.overflow = "hidden"; // Prevent background scroll
      const firstFocusable = modal.querySelector(
        'input:not([type="hidden"]), textarea, select, button'
      );
      if (firstFocusable) setTimeout(() => firstFocusable.focus(), 50); // Delay for transition
    }
  }

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove("active");
      // Only restore scroll if no other modals are active
      if (!document.querySelector(".modal-overlay.active")) {
        document.body.style.overflow = "";
      }
    }
  }

  closeAllModals() {
    document.querySelectorAll(".modal-overlay.active").forEach((modal) => {
      this.closeModal(modal.id);
    });
  }

  // Utility: Escape HTML
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

  // Utility: Show JS-based notification (for client-side validation, etc.)
  showJsNotification(message, type = "info") {
    const notificationsContainer =
      document.getElementById("js-notifications-container") ||
      this.createNotificationsContainer();

    const notification = document.createElement("div");
    notification.className = `alert alert-${type}`; // Use same CSS classes as server flash
    notification.innerHTML = `${this.escapeHtml(message)}
        <button type="button" class="close" onclick="this.parentElement.remove()">×</button>`;

    notificationsContainer.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.style.transition = "opacity 0.3s ease";
        notification.style.opacity = "0";
        setTimeout(() => notification.remove(), 300);
      }
    }, 5000);
  }

  createNotificationsContainer() {
    const container = document.createElement("div");
    container.id = "js-notifications-container";
    // Style it similarly to your server flash messages container
    container.style.cssText = `
        position: fixed;
        top: 70px; /* Adjust if it overlaps with server flash */
        right: 20px;
        z-index: 9999; /* Below server flash if they can overlap */
        max-width: 400px;
      `;
    document.body.appendChild(container);
    return container;
  }
}

// Initialize the LinkSaver app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.linkSaver = new LinkSaver();
});
