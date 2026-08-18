import '../css/styles.css';
import { initCmsRuntime } from '../cms/runtime.js';

initCmsRuntime();

// MOBILE MENU FINAL FIX START
document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.querySelector(".mobile-menu-btn");
  const navLinks = document.querySelector(".nav-links");
  const dropdowns = document.querySelectorAll(".nav-dropdown");

  if (!menuButton || !navLinks) return;

  const closeMenu = () => {
    document.body.classList.remove("menu-open");
    menuButton.setAttribute("aria-expanded", "false");
    dropdowns.forEach((dropdown) => dropdown.classList.remove("open"));
  };

  menuButton.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("menu-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));

    if (!isOpen) {
      dropdowns.forEach((dropdown) => dropdown.classList.remove("open"));
    }
  });

  dropdowns.forEach((dropdown) => {
    const trigger = dropdown.querySelector(":scope > a");

    if (!trigger) return;

    trigger.addEventListener("click", (event) => {
      if (window.innerWidth <= 980) {
        event.preventDefault();

        dropdowns.forEach((item) => {
          if (item !== dropdown) item.classList.remove("open");
        });

        dropdown.classList.toggle("open");
      }
    });
  });

  navLinks.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      if (window.innerWidth <= 980 && !link.closest(".nav-dropdown")) {
        closeMenu();
      }

      if (window.innerWidth <= 980 && link.closest(".dropdown-menu")) {
        closeMenu();
      }
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) {
      closeMenu();
    }
  });
});
// MOBILE MENU FINAL FIX END

// MOBILE SECTION ACCORDION FIX START
document.addEventListener("DOMContentLoaded", () => {
  const mobileSections = document.querySelectorAll(".mobile-collapsible");

  mobileSections.forEach((section) => {
    section.classList.remove("section-open");

    const toggle = section.querySelector(".mobile-section-toggle");
    if (!toggle) return;

    toggle.setAttribute("aria-expanded", "false");

    toggle.addEventListener("click", () => {
      const isOpen = section.classList.toggle("section-open");
      toggle.setAttribute("aria-expanded", String(isOpen));
    });
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) {
      mobileSections.forEach((section) => {
        section.classList.remove("section-open");
        const toggle = section.querySelector(".mobile-section-toggle");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
      });
    }
  });
});
// MOBILE SECTION ACCORDION FIX END

// MOBILE PROGRAMME ROW TOGGLE START
document.addEventListener("DOMContentLoaded", () => {
  const rows = document.querySelectorAll(".programme-grid article");

  rows.forEach((row) => {
    const btn = row.querySelector(".programme-mobile-toggle");
    if (!btn) return;

    btn.addEventListener("click", () => {
      if (window.innerWidth > 980) return;

      const isOpen = row.classList.toggle("mobile-open");
      btn.setAttribute("aria-expanded", String(isOpen));
    });
  });
});
// MOBILE PROGRAMME ROW TOGGLE END

// MOBILE ROW ACCORDION FINAL START
document.addEventListener("DOMContentLoaded", () => {
  const isMobile = () => window.innerWidth <= 980;

  document.querySelectorAll(".feature-grid article").forEach((card) => {
    card.addEventListener("click", () => {
      if (!isMobile()) return;
      card.classList.toggle("mobile-open");
    });
  });

  document.querySelectorAll(".programme-grid article").forEach((card) => {
    const button = card.querySelector(".programme-mobile-toggle");

    const toggleCard = () => {
      if (!isMobile()) return;
      const isOpen = card.classList.toggle("mobile-open");
      if (button) button.setAttribute("aria-expanded", String(isOpen));
    };

    card.addEventListener("click", (event) => {
      if (!isMobile()) return;
      event.preventDefault();
      toggleCard();
    });

    if (button) {
      button.addEventListener("click", (event) => {
        if (!isMobile()) return;
        event.preventDefault();
        event.stopPropagation();
        toggleCard();
      });
    }
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) {
      document.querySelectorAll(".feature-grid article, .programme-grid article").forEach((card) => {
        card.classList.remove("mobile-open");
      });

      document.querySelectorAll(".programme-mobile-toggle").forEach((button) => {
        button.setAttribute("aria-expanded", "false");
      });
    }
  });
});
// MOBILE ROW ACCORDION FINAL END
