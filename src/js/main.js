import '../css/styles.css';
import { initCmsRuntime } from '../cms/runtime.js';
import { cmsClient, cmsConfigured } from '../cms/client.js';
import { DEFAULT_NAVIGATION, NAVIGATION_CONTENT_KEY, NAVIGATION_PAGE_PATH, renderPrimaryNavigation } from '../cms/navigation.js';

initCmsRuntime();

// GLOBAL FLOATING CONTACT BUTTONS
document.addEventListener("DOMContentLoaded", () => {
  let contactButtons = document.querySelector(".float-buttons");

  if (!contactButtons) {
    contactButtons = document.createElement("div");
    document.body.append(contactButtons);
  }

  contactButtons.className = "float-buttons";
  contactButtons.setAttribute("role", "navigation");
  contactButtons.setAttribute("aria-label", "Contact White Academy");
  contactButtons.innerHTML = `
    <a
      class="wa"
      href="https://wa.me/919483782999?text=Hello%20White%20Academy%2C%20I%20would%20like%20more%20information."
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with White Academy on WhatsApp"
      title="WhatsApp White Academy"
      data-label="WhatsApp"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M20.6 11.8a8.6 8.6 0 0 1-12.7 7.6L3 20.8l1.4-4.7A8.6 8.6 0 1 1 20.6 11.8Z" />
        <path d="M8.4 7.5c.2-.4.4-.4.8-.4h.4c.2 0 .4.1.5.4l.9 2.1c.1.3.1.5-.1.7l-.7.8c-.2.2-.1.4 0 .6.7 1.3 1.8 2.3 3.1 3 .2.1.4.1.6-.1l.9-1.1c.2-.2.4-.3.7-.2l2.1 1c.3.1.4.3.4.6 0 .7-.3 1.4-.9 1.8-.6.5-1.4.7-2.1.6-1.2-.2-2.7-.7-4.4-2.2-2-1.8-3.2-4-3.3-5.5 0-.8.3-1.5.7-1.9l.4-.2Z" />
      </svg>
    </a>
    <a
      class="call"
      href="tel:+919483782999"
      aria-label="Call White Academy at +91 94837 82999"
      title="Call White Academy"
      data-label="Call us"
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path d="M7.2 3.5 9.6 6a1.6 1.6 0 0 1 .2 1.9L8.5 9.7a13 13 0 0 0 5.8 5.8l1.8-1.3a1.6 1.6 0 0 1 1.9.2l2.5 2.4a1.6 1.6 0 0 1 .3 1.9l-.8 1.4a2.5 2.5 0 0 1-2.4 1.2C9.8 20.4 3.6 14.2 2.7 6.4A2.5 2.5 0 0 1 3.9 4l1.4-.8a1.6 1.6 0 0 1 1.9.3Z" />
      </svg>
    </a>
  `;
});
// GLOBAL FLOATING CONTACT BUTTONS END




document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll('.file-control input[type="file"]').forEach((input) => {
    input.addEventListener("change", () => {
      const label = input.closest(".file-control");
      const fileName = input.files?.[0]?.name;
      const status = label?.querySelector("strong");

      if (status) status.textContent = fileName || "Upload File +";
    });
  });
});

// GLOBAL NAVIGATION AND MOBILE MENU
document.addEventListener("DOMContentLoaded", () => {
  const menuButton = document.querySelector(".mobile-menu-btn");
  const navLinks = document.querySelector(".nav-links");
  if (!navLinks) return;

  const applyNavigation = (items) => {
    navLinks.innerHTML = renderPrimaryNavigation(items, window.location.pathname);
  };

  const closeMenu = () => {
    document.body.classList.remove("menu-open");
    menuButton?.setAttribute("aria-expanded", "false");
    navLinks.querySelectorAll(".nav-dropdown").forEach((dropdown) => dropdown.classList.remove("open"));
  };

  applyNavigation(DEFAULT_NAVIGATION);

  if (cmsConfigured && cmsClient) {
    cmsClient
      .from("cms_content")
      .select("value")
      .eq("page_path", NAVIGATION_PAGE_PATH)
      .eq("content_key", NAVIGATION_CONTENT_KEY)
      .maybeSingle()
      .then(({ data }) => {
        if (!data?.value) return;
        try {
          applyNavigation(JSON.parse(data.value));
        } catch {
          applyNavigation(DEFAULT_NAVIGATION);
        }
      });

    cmsClient
      .channel("cms-global-navigation")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "cms_content",
          filter: `page_path=eq.${NAVIGATION_PAGE_PATH}`,
        },
        (payload) => {
          if (payload.eventType === "DELETE" || payload.new?.content_key !== NAVIGATION_CONTENT_KEY) {
            if (payload.old?.content_key === NAVIGATION_CONTENT_KEY) applyNavigation(DEFAULT_NAVIGATION);
            return;
          }
          try {
            applyNavigation(JSON.parse(payload.new.value));
          } catch {
            applyNavigation(DEFAULT_NAVIGATION);
          }
        },
      )
      .subscribe();
  }

  menuButton?.addEventListener("click", () => {
    const isOpen = document.body.classList.toggle("menu-open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    if (!isOpen) navLinks.querySelectorAll(".nav-dropdown").forEach((dropdown) => dropdown.classList.remove("open"));
  });

  navLinks.addEventListener("click", (event) => {
    const trigger = event.target.closest(".nav-dropdown > a");
    if (trigger && window.innerWidth <= 980) {
      event.preventDefault();
      const dropdown = trigger.closest(".nav-dropdown");
      navLinks.querySelectorAll(".nav-dropdown").forEach((item) => {
        if (item !== dropdown) item.classList.remove("open");
      });
      dropdown.classList.toggle("open");
      return;
    }

    if (window.innerWidth <= 980 && event.target.closest("a")) closeMenu();
  });

  window.addEventListener("resize", () => {
    if (window.innerWidth > 980) closeMenu();
  });
});
// GLOBAL NAVIGATION END

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
