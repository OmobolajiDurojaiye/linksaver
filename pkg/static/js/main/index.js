"use strict";

// DOM Content Loaded Event
document.addEventListener("DOMContentLoaded", function () {
  // Initialize the landing page
  initLandingPage();
  // Initialize auth modals
  initAuthModals();
  // Initialize flash messages
  initFlashMessages();
  // Check for URL parameters to show specific modal
  checkUrlParams();
});

// Check URL parameters and show appropriate modal
function checkUrlParams() {
  const urlParams = new URLSearchParams(window.location.search);
  const showLogin = urlParams.get("show_login");

  if (showLogin === "true") {
    // Open login modal after successful signup
    setTimeout(() => {
      openAuthModal("login");
    }, 1000); // Small delay to let flash message show first

    // Clean URL
    window.history.replaceState({}, document.title, window.location.pathname);
  }
}

// Initialize landing page functionality
function initLandingPage() {
  // Get button elements
  const loginBtn = document.getElementById("loginBtn");
  const signupBtn = document.getElementById("signupBtn");
  const getStartedBtn = document.getElementById("getStartedBtn");
  const learnMoreBtn = document.getElementById("learnMoreBtn");
  const ctaSignupBtn = document.getElementById("ctaSignupBtn");

  // Add event listeners for auth buttons
  if (loginBtn) {
    loginBtn.addEventListener("click", () => openAuthModal("login"));
  }

  if (signupBtn) {
    signupBtn.addEventListener("click", () => openAuthModal("signup"));
  }

  if (getStartedBtn) {
    getStartedBtn.addEventListener("click", () => openAuthModal("signup"));
  }

  if (ctaSignupBtn) {
    ctaSignupBtn.addEventListener("click", () => openAuthModal("signup"));
  }

  if (learnMoreBtn) {
    learnMoreBtn.addEventListener("click", handleLearnMoreClick);
  }

  // Initialize animations and interactions
  initScrollAnimations();
  initLinkCardAnimations();
  initNavbarScroll();
}

// Handle learn more button click
function handleLearnMoreClick() {
  // Smooth scroll to features section
  const featuresSection = document.querySelector(".features");
  if (featuresSection) {
    featuresSection.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }
}

// Initialize Auth Modals
function initAuthModals() {
  const modal = document.getElementById("authModal");
  const closeBtn = document.querySelector(".close");
  const switchToSignup = document.getElementById("switchToSignup");
  const switchToLogin = document.getElementById("switchToLogin");
  const loginForm = document.getElementById("loginFormElement");
  const signupForm = document.getElementById("signupFormElement");

  // Close modal when clicking X
  if (closeBtn) {
    closeBtn.addEventListener("click", closeAuthModal);
  }

  // Close modal when clicking outside
  if (modal) {
    modal.addEventListener("click", function (e) {
      if (e.target === modal) {
        closeAuthModal();
      }
    });
  }

  // Switch between forms
  if (switchToSignup) {
    switchToSignup.addEventListener("click", function (e) {
      e.preventDefault();
      switchAuthForm("signup");
    });
  }

  if (switchToLogin) {
    switchToLogin.addEventListener("click", function (e) {
      e.preventDefault();
      switchAuthForm("login");
    });
  }

  // Form submissions
  if (loginForm) {
    loginForm.addEventListener("submit", handleLoginSubmit);
  }

  if (signupForm) {
    signupForm.addEventListener("submit", handleSignupSubmit);
  }

  // Real-time validation
  initFormValidation();
}

// Open Auth Modal
function openAuthModal(type = "login") {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.classList.add("show");
    document.body.style.overflow = "hidden";
    switchAuthForm(type);
  }
}

// Close Auth Modal
function closeAuthModal() {
  const modal = document.getElementById("authModal");
  if (modal) {
    modal.classList.remove("show");
    document.body.style.overflow = "auto";
    clearFormErrors();
  }
}

// Switch Auth Form
function switchAuthForm(type) {
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  if (type === "login") {
    loginForm.classList.add("active");
    signupForm.classList.remove("active");
  } else {
    signupForm.classList.add("active");
    loginForm.classList.remove("active");
  }

  clearFormErrors();
}

// Handle Login Submit
function handleLoginSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const email = form.querySelector("#loginEmail").value.trim();
  const password = form.querySelector("#loginPassword").value;

  // Validate form
  if (!validateLoginForm(email, password)) {
    return;
  }

  // Show loading state
  setButtonLoading(submitBtn, true);

  // Submit form
  setTimeout(() => {
    form.submit();
  }, 500);
}

// Handle Signup Submit
function handleSignupSubmit(e) {
  e.preventDefault();

  const form = e.target;
  const submitBtn = form.querySelector('button[type="submit"]');
  const name = form.querySelector("#signupName").value.trim();
  const email = form.querySelector("#signupEmail").value.trim();
  const password = form.querySelector("#signupPassword").value;
  const confirmPassword = form.querySelector("#confirmPassword").value;

  // Validate form
  if (!validateSignupForm(name, email, password, confirmPassword)) {
    return;
  }

  // Show loading state
  setButtonLoading(submitBtn, true);

  // Update button text for signup flow
  submitBtn.textContent = "Creating account...";

  // Submit form
  setTimeout(() => {
    form.submit();
  }, 500);
}

// Validate Login Form
function validateLoginForm(email, password) {
  let isValid = true;

  // Clear previous errors
  clearFormErrors();

  // Validate email
  if (!email) {
    showFieldError("loginEmail", "Email is required");
    isValid = false;
  } else if (!isValidEmail(email)) {
    showFieldError("loginEmail", "Please enter a valid email");
    isValid = false;
  }

  // Validate password
  if (!password) {
    showFieldError("loginPassword", "Password is required");
    isValid = false;
  }

  return isValid;
}

// Validate Signup Form
function validateSignupForm(name, email, password, confirmPassword) {
  let isValid = true;

  // Clear previous errors
  clearFormErrors();

  // Validate name
  if (!name) {
    showFieldError("signupName", "Full name is required");
    isValid = false;
  } else if (name.length < 2) {
    showFieldError("signupName", "Name must be at least 2 characters");
    isValid = false;
  }

  // Validate email
  if (!email) {
    showFieldError("signupEmail", "Email is required");
    isValid = false;
  } else if (!isValidEmail(email)) {
    showFieldError("signupEmail", "Please enter a valid email");
    isValid = false;
  }

  // Validate password
  if (!password) {
    showFieldError("signupPassword", "Password is required");
    isValid = false;
  } else if (password.length < 6) {
    showFieldError("signupPassword", "Password must be at least 6 characters");
    isValid = false;
  }

  // Validate confirm password
  if (!confirmPassword) {
    showFieldError("confirmPassword", "Please confirm your password");
    isValid = false;
  } else if (password !== confirmPassword) {
    showFieldError("confirmPassword", "Passwords do not match");
    isValid = false;
  }

  return isValid;
}

// Show Field Error
function showFieldError(fieldId, message) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.classList.add("error");

    // Remove existing error message
    const existingError = field.parentNode.querySelector(".error-message");
    if (existingError) {
      existingError.remove();
    }

    // Add new error message
    const errorElement = document.createElement("span");
    errorElement.className = "error-message";
    errorElement.textContent = message;
    field.parentNode.appendChild(errorElement);
  }
}

// Clear Form Errors
function clearFormErrors() {
  const errorFields = document.querySelectorAll(".form-group input.error");
  const errorMessages = document.querySelectorAll(".error-message");

  errorFields.forEach((field) => field.classList.remove("error"));
  errorMessages.forEach((message) => message.remove());
}

// Initialize Form Validation
function initFormValidation() {
  const inputs = document.querySelectorAll(".form-group input");

  inputs.forEach((input) => {
    input.addEventListener("blur", function () {
      // Clear error when user starts typing
      if (this.classList.contains("error")) {
        this.classList.remove("error");
        const errorMessage = this.parentNode.querySelector(".error-message");
        if (errorMessage) {
          errorMessage.remove();
        }
      }
    });

    input.addEventListener("input", function () {
      // Clear error when user starts typing
      if (this.classList.contains("error")) {
        this.classList.remove("error");
        const errorMessage = this.parentNode.querySelector(".error-message");
        if (errorMessage) {
          errorMessage.remove();
        }
      }
    });
  });
}

// Set Button Loading State
function setButtonLoading(button, loading) {
  if (loading) {
    button.classList.add("loading");
    button.disabled = true;
    button.setAttribute("data-original-text", button.textContent);
    // Default loading text - can be overridden
    if (!button.textContent.includes("...")) {
      button.textContent = "Please wait...";
    }
  } else {
    button.classList.remove("loading");
    button.disabled = false;
    button.textContent =
      button.getAttribute("data-original-text") || button.textContent;
  }
}

// Utility Functions
function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Flash Messages
function initFlashMessages() {
  // Check if there are flash messages to show from server
  const urlParams = new URLSearchParams(window.location.search);
  const message = urlParams.get("message");
  const type = urlParams.get("type");

  if (message && type) {
    showFlashMessage(decodeURIComponent(message), type);
    // Clean URL parameters but preserve show_login
    const showLogin = urlParams.get("show_login");
    const newUrl = showLogin
      ? `${window.location.pathname}?show_login=${showLogin}`
      : window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  }
}

function showFlashMessage(message, type = "info") {
  const container = document.getElementById("flashMessages");
  if (!container) return;

  const flashDiv = document.createElement("div");
  flashDiv.className = `flash-message flash-${type}`;
  flashDiv.textContent = message;

  // Add click to dismiss
  flashDiv.addEventListener("click", function () {
    this.style.animation = "slideOutRight 0.3s ease";
    setTimeout(() => {
      if (this.parentNode) {
        this.parentNode.removeChild(this);
      }
    }, 300);
  });

  container.appendChild(flashDiv);

  // Auto remove after 5 seconds for success messages, 7 seconds for others
  const autoRemoveTime = type === "success" ? 5000 : 7000;
  setTimeout(() => {
    if (flashDiv.parentNode) {
      flashDiv.style.animation = "slideOutRight 0.3s ease";
      setTimeout(() => {
        if (flashDiv.parentNode) {
          flashDiv.parentNode.removeChild(flashDiv);
        }
      }, 300);
    }
  }, autoRemoveTime);
}

// Initialize scroll animations
function initScrollAnimations() {
  // Observe elements for scroll animations
  const observerOptions = {
    threshold: 0.1,
    rootMargin: "0px 0px -50px 0px",
  };

  const observer = new IntersectionObserver(
    handleScrollAnimation,
    observerOptions
  );

  // Observe feature cards
  const featureCards = document.querySelectorAll(".feature-card");
  featureCards.forEach((card) => {
    observer.observe(card);
  });

  // Observe CTA section
  const ctaSection = document.querySelector(".cta");
  if (ctaSection) {
    observer.observe(ctaSection);
  }
}

// Handle scroll animation
function handleScrollAnimation(entries) {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = "1";
      entry.target.style.transform = "translateY(0)";
    }
  });
}

// Initialize link card animations
function initLinkCardAnimations() {
  const linkCards = document.querySelectorAll(".link-preview-card");

  linkCards.forEach((card, index) => {
    // Add staggered animation delay
    card.style.animationDelay = `${index * 0.2}s`;

    // Add hover effects
    card.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-8px) scale(1.02)";
    });

    card.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0) scale(1)";
    });
  });
}

// Initialize navbar scroll effects
function initNavbarScroll() {
  const navbar = document.querySelector(".navbar");
  let lastScrollTop = 0;

  window.addEventListener("scroll", function () {
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    // Add/remove background blur based on scroll position
    if (scrollTop > 50) {
      navbar.style.background = "rgba(30, 30, 47, 0.98)";
      navbar.style.backdropFilter = "blur(15px)";
    } else {
      navbar.style.background = "rgba(30, 30, 47, 0.95)";
      navbar.style.backdropFilter = "blur(10px)";
    }

    // Hide/show navbar on scroll (optional)
    if (scrollTop > lastScrollTop && scrollTop > 100) {
      // Scrolling down
      navbar.style.transform = "translateY(-100%)";
    } else {
      // Scrolling up
      navbar.style.transform = "translateY(0)";
    }

    lastScrollTop = scrollTop;
  });
}

// Smooth scrolling for anchor links
document.addEventListener("click", function (e) {
  if (
    e.target.tagName === "A" &&
    e.target.getAttribute("href") &&
    e.target.getAttribute("href").startsWith("#")
  ) {
    e.preventDefault();
    const targetId = e.target.getAttribute("href").substring(1);
    const targetElement = document.getElementById(targetId);

    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }
  }
});

// Enhanced button click effects
document.addEventListener("click", function (e) {
  if (
    e.target.classList.contains("btn-primary") ||
    e.target.classList.contains("btn-secondary")
  ) {
    // Add ripple effect
    const button = e.target;
    const ripple = document.createElement("span");
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = e.clientX - rect.left - size / 2;
    const y = e.clientY - rect.top - size / 2;

    ripple.style.cssText = `
            position: absolute;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.3);
            width: ${size}px;
            height: ${size}px;
            left: ${x}px;
            top: ${y}px;
            pointer-events: none;
            transform: scale(0);
            animation: ripple 0.6s linear;
        `;

    // Add ripple animation
    if (!document.querySelector("#ripple-style")) {
      const style = document.createElement("style");
      style.id = "ripple-style";
      style.textContent = `
              @keyframes ripple {
                  to {
                      transform: scale(2);
                      opacity: 0;
                  }
              }
              @keyframes slideOutRight {
                  to {
                      opacity: 0;
                      transform: translateX(100%);
                  }
              }
          `;
      document.head.appendChild(style);
    }

    button.style.position = "relative";
    button.style.overflow = "hidden";
    button.appendChild(ripple);

    // Remove ripple after animation
    setTimeout(() => {
      if (button.contains(ripple)) {
        button.removeChild(ripple);
      }
    }, 600);
  }
});

// Initialize feature card hover effects
function initFeatureCardEffects() {
  const featureCards = document.querySelectorAll(".feature-card");

  featureCards.forEach((card) => {
    card.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-15px) rotateY(5deg)";
      this.style.transition = "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)";
    });

    card.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0) rotateY(0deg)";
    });
  });
}

// Call additional initialization functions
document.addEventListener("DOMContentLoaded", function () {
  initFeatureCardEffects();
});

// Close modal with Escape key
document.addEventListener("keydown", function (e) {
  if (e.key === "Escape") {
    closeAuthModal();
  }
});
