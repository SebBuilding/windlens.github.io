const header = document.getElementById("site-header");
const menuButton = document.getElementById("menu-button");
const navOverlay = document.getElementById("nav-overlay");
const closeMenu = document.getElementById("close-menu");
const navBackdrop = document.querySelector("[data-nav-close]");
const navHeight = () => header?.getBoundingClientRect().height ?? 96;
const isDev = location.hostname === "localhost" || location.hostname === "127.0.0.1";

const NAV_ITEMS = [
    { label: "Product", id: "product" },
    { label: "How it works", id: "how-it-works" },
    { label: "Who it’s for", id: "who-its-for" },
    { label: "Contact", id: "contact" },
];

const desktopNav = document.getElementById("nav-desktop");
const mobileNav = document.getElementById("nav-mobile");

const renderNav = (container, itemClass) => {
    if (!container) return;
    container.innerHTML = NAV_ITEMS.map(
        (item) =>
            `<a href="#${item.id}" class="${itemClass}" data-nav-target="${item.id}">${item.label}</a>`
    ).join("");
};

renderNav(desktopNav, "wl-nav-link transition");
renderNav(mobileNav, "wl-nav-link");

const navItems = Array.from(document.querySelectorAll("[data-nav-target]"));
let lastFocusedElement = null;
let activeSectionId = NAV_ITEMS[0]?.id || "";

const setActiveLink = (id) => {
    if (!id) return;
    activeSectionId = id;
    navItems.forEach((link) => {
        link.classList.toggle("is-active", link.getAttribute("data-nav-target") === id);
    });
};

const getFocusableElements = (container) => {
    if (!container) return [];
    return Array.from(
        container.querySelectorAll(
            "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
    );
};

const openMenu = () => {
    if (!navOverlay) return;
    navOverlay.classList.add("is-open");
    navOverlay.setAttribute("aria-hidden", "false");
    menuButton?.setAttribute("aria-expanded", "true");
    lastFocusedElement = document.activeElement;
    document.body.style.overflow = "hidden";
    const focusables = getFocusableElements(navOverlay);
    if (focusables.length) focusables[0].focus();
};

const closeMobileMenu = () => {
    if (!navOverlay) return;
    navOverlay.classList.remove("is-open");
    navOverlay.setAttribute("aria-hidden", "true");
    menuButton?.setAttribute("aria-expanded", "false");
    document.body.style.overflow = "";
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
    }
};

menuButton?.addEventListener("click", () => {
    openMenu();
});

closeMenu?.addEventListener("click", closeMobileMenu);
navBackdrop?.addEventListener("click", closeMobileMenu);

const isMenuOpen = () => navOverlay?.classList.contains("is-open");
const trapFocus = (event) => {
    if (!isMenuOpen() || event.key !== "Tab") return;
    const focusables = getFocusableElements(navOverlay);
    if (!focusables.length) return;
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    }
};

const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerH = navHeight();
    const y = window.scrollY + el.getBoundingClientRect().top - headerH - 16;
    window.scrollTo({ top: y, behavior: "smooth" });
};

navItems.forEach((link) => {
    link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("data-nav-target");
        if (!targetId) return;
        event.preventDefault();
        setActiveLink(targetId);
        closeMobileMenu();
        setTimeout(() => scrollToSection(targetId), 10);
        if (isDev) {
            console.debug("[NAV] click", link.textContent?.trim(), "->", targetId);
        }
    });
});

let sectionObserver = null;
const visibleSections = new Map();
const setupObserver = () => {
    if (sectionObserver) sectionObserver.disconnect();
    const observerOptions = {
        root: null,
        rootMargin: "-25% 0px -65% 0px",
        threshold: [0.2, 0.4, 0.6],
    };
    sectionObserver = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            const id = entry.target.id;
            if (!id) return;
            if (entry.isIntersecting) {
                visibleSections.set(id, entry.intersectionRatio);
            } else {
                visibleSections.delete(id);
            }
        });
        let bestId = activeSectionId;
        let bestRatio = 0;
        visibleSections.forEach((ratio, id) => {
            if (ratio > bestRatio) {
                bestRatio = ratio;
                bestId = id;
            }
        });
        if (bestId) setActiveLink(bestId);
    }, observerOptions);
};

const sectionIds = NAV_ITEMS.map((item) => item.id);
setupObserver();
sectionIds.forEach((id) => {
    const section = document.getElementById(id);
    if (section) sectionObserver.observe(section);
});

window.addEventListener("resize", () => {
    setupObserver();
    sectionIds.forEach((id) => {
        const section = document.getElementById(id);
        if (section) sectionObserver.observe(section);
    });
});

const activateContactAtBottom = () => {
    const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
    if (!nearBottom) return;
    setActiveLink("contact");
};

window.addEventListener("scroll", activateContactAtBottom, { passive: true });

const quoteSlides = Array.from(document.querySelectorAll(".wl-quote-slide"));
const quotePrev = document.querySelector(".wl-quote-prev");
const quoteNext = document.querySelector(".wl-quote-next");

if (quoteSlides.length) {
    let quoteIndex = 0;
    let quoteTimer = null;

    const showQuote = (index) => {
        quoteSlides[quoteIndex].classList.remove("is-active");
        quoteIndex = (index + quoteSlides.length) % quoteSlides.length;
        quoteSlides[quoteIndex].classList.add("is-active");
    };

    const nextQuote = () => showQuote(quoteIndex + 1);
    const prevQuote = () => showQuote(quoteIndex - 1);

    if (quoteNext) quoteNext.addEventListener("click", () => { nextQuote(); resetTimer(); });
    if (quotePrev) quotePrev.addEventListener("click", () => { prevQuote(); resetTimer(); });

    const resetTimer = () => {
        if (quoteTimer) clearInterval(quoteTimer);
        quoteTimer = setInterval(nextQuote, 6000);
    };

    resetTimer();
}

const modalTriggers = document.querySelectorAll("[data-modal]");
const modalCloses = document.querySelectorAll("[data-modal-close]");
const lightbox = document.getElementById("image-lightbox");
const lightboxImage = document.getElementById("lightbox-image");
const lightboxCloses = document.querySelectorAll("[data-lightbox-close]");

const openModal = (modal) => {
    if (!modal) return;
    modal.classList.add("is-open");
    modal.setAttribute("aria-hidden", "false");
    document.body.classList.add("wl-no-scroll");
};

const closeModal = (modal) => {
    if (!modal) return;
    modal.classList.remove("is-open");
    modal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("wl-no-scroll");
};

modalTriggers.forEach((trigger) => {
    trigger.addEventListener("click", () => {
        const targetId = trigger.getAttribute("data-modal");
        const modal = document.getElementById(targetId);
        openModal(modal);
    });
});

modalCloses.forEach((closeBtn) => {
    closeBtn.addEventListener("click", (event) => {
        const modal = event.target.closest(".wl-modal");
        closeModal(modal);
    });
});

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        if (isMenuOpen()) closeMobileMenu();
        const activeModal = document.querySelector(".wl-modal.is-open");
        if (activeModal) closeModal(activeModal);
        if (lightbox?.classList.contains("is-open")) closeLightbox();
    }
    trapFocus(event);
});

const contactForm = document.getElementById("contact-form");
const contactSuccess = document.getElementById("contact-success");
if (contactForm && contactSuccess) {
    contactSuccess.style.display = "none";
    contactForm.addEventListener("submit", (event) => {
        event.preventDefault();
        contactSuccess.style.display = "block";
        contactForm.reset();
    });
}

const openLightbox = (src, altText) => {
    if (!lightbox || !lightboxImage) return;
    lightboxImage.src = src;
    lightboxImage.alt = altText || "Expanded visual";
    lightbox.classList.add("is-open");
    lightbox.setAttribute("aria-hidden", "false");
    document.body.classList.add("wl-no-scroll");
};

const closeLightbox = () => {
    if (!lightbox || !lightboxImage) return;
    lightbox.classList.remove("is-open");
    lightbox.setAttribute("aria-hidden", "true");
    lightboxImage.src = "";
    document.body.classList.remove("wl-no-scroll");
};

document.querySelectorAll(".wl-modal-grid img").forEach((img) => {
    img.addEventListener("click", () => {
        openLightbox(img.getAttribute("src"), img.getAttribute("alt"));
    });
});

lightboxCloses.forEach((btn) => {
    btn.addEventListener("click", closeLightbox);
});
