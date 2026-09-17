import '../css/styles.css';
import { initCmsRuntime } from '../cms/runtime.js';
import { cmsClient, cmsConfigured } from '../cms/client.js';
import { DEFAULT_NAVIGATION, NAVIGATION_CONTENT_KEY, NAVIGATION_PAGE_PATH, renderPrimaryNavigation } from '../cms/navigation.js';

initCmsRuntime();




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
