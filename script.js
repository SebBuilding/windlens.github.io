const header = document.getElementById("site-header");
const menuButton = document.getElementById("menu-button");
const navOverlay = document.getElementById("nav-overlay");
const closeMenu = document.getElementById("close-menu");
const navBackdrop = document.querySelector("[data-nav-close]");
const desktopNav = document.getElementById("nav-desktop");
const mobileNav = document.getElementById("nav-mobile");
const navHeight = () => header?.getBoundingClientRect().height ?? 96;
const isHomePage = Boolean(
    document.getElementById("product") &&
    document.getElementById("how-it-works") &&
    document.getElementById("contact")
);

const NAV_ITEMS = [
    { label: "Product", href: "/#product", sectionId: "product", key: "product" },
    { label: "How it works", href: "/#how-it-works", sectionId: "how-it-works", key: "how-it-works" },
    { label: "Who it's for", href: "/#who-its-for", sectionId: "who-its-for", key: "who-its-for" },
    {
        label: "Blogs",
        key: "blogs",
        children: [
            {
                label: "Historical analysis of forecast errors on price",
                description: "Interactive dashboard and methodology note",
                href: "/blogs/historical-analysis-forecast-errors-price/",
                key: "historical-analysis-forecast-errors-price",
            },
        ],
    },
    { label: "Contact", href: "/#contact", sectionId: "contact", key: "contact" },
];

const state = {
    desktopDropdownOpen: false,
    mobileBlogsOpen: false,
};

const quoteSlides = Array.from(document.querySelectorAll(".wl-quote-slide"));
const quotePrev = document.querySelector(".wl-quote-prev");
const quoteNext = document.querySelector(".wl-quote-next");

let lastFocusedElement = null;
let activeSectionId = "";
let scrollLocked = false;

const normalizePath = (value) => {
    if (!value) return "/";
    let next = value.replace(/index\.html$/, "");
    if (!next.startsWith("/")) next = `/${next}`;
    if (!next.endsWith("/")) next = `${next}/`;
    return next;
};

const currentPath = normalizePath(window.location.pathname);
const articlePath = "/blogs/historical-analysis-forecast-errors-price/";

const iconCaret = () => `
    <svg class="wl-nav-caret" viewBox="0 0 16 16" aria-hidden="true">
        <path d="M4 6.25 8 10l4-3.75" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path>
    </svg>
`;

const renderDesktopNav = () => {
    if (!desktopNav) return;
    desktopNav.classList.add("wl-nav-desktop-list");
    desktopNav.innerHTML = NAV_ITEMS.map((item) => {
        if (!item.children) {
            return `<a href="${item.href}" class="wl-nav-link transition" data-nav-key="${item.key}"${item.sectionId ? ` data-nav-section="${item.sectionId}"` : ""}>${item.label}</a>`;
        }
        return `
            <div class="wl-nav-dropdown" data-nav-dropdown>
                <button type="button" class="wl-nav-link wl-nav-dropdown-trigger transition" data-nav-key="${item.key}" data-nav-dropdown-trigger aria-expanded="false">
                    <span>${item.label}</span>
                    ${iconCaret()}
                </button>
                <div class="wl-nav-dropdown-menu" data-nav-dropdown-menu>
                    ${item.children.map((child) => `
                        <a href="${child.href}" class="wl-nav-dropdown-link" data-nav-key="${child.key}">
                            <span class="wl-nav-dropdown-label">${child.label}</span>
                            <span class="wl-nav-dropdown-desc">${child.description}</span>
                        </a>
                    `).join("")}
                </div>
            </div>
        `;
    }).join("");
};

const renderMobileNav = () => {
    if (!mobileNav) return;
    mobileNav.innerHTML = NAV_ITEMS.map((item) => {
        if (!item.children) {
            return `<a href="${item.href}" class="wl-nav-link" data-nav-key="${item.key}"${item.sectionId ? ` data-nav-section="${item.sectionId}"` : ""}>${item.label}</a>`;
        }
        return `
            <div class="wl-nav-mobile-group" data-nav-mobile-group>
                <button type="button" class="wl-nav-link wl-nav-mobile-trigger" data-nav-mobile-trigger aria-expanded="false">
                    <span>${item.label}</span>
                    ${iconCaret()}
                </button>
                <div class="wl-nav-mobile-children">
                    ${item.children.map((child) => `
                        <a href="${child.href}" class="wl-nav-mobile-child" data-nav-key="${child.key}">
                            <span class="wl-nav-dropdown-label">${child.label}</span>
                            <span class="wl-nav-dropdown-desc">${child.description}</span>
                        </a>
                    `).join("")}
                </div>
            </div>
        `;
    }).join("");
};

const getFocusableElements = (container) => {
    if (!container) return [];
    return Array.from(
        container.querySelectorAll(
            "a[href], button:not([disabled]), [tabindex]:not([tabindex='-1'])"
        )
    );
};

const setDesktopDropdown = (open) => {
    state.desktopDropdownOpen = open;
    const dropdown = document.querySelector("[data-nav-dropdown]");
    const trigger = document.querySelector("[data-nav-dropdown-trigger]");
    if (!dropdown || !trigger) return;
    dropdown.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", String(open));
};

const setMobileBlogs = (open) => {
    state.mobileBlogsOpen = open;
    const group = document.querySelector("[data-nav-mobile-group]");
    const trigger = document.querySelector("[data-nav-mobile-trigger]");
    if (!group || !trigger) return;
    group.classList.toggle("is-open", open);
    trigger.setAttribute("aria-expanded", String(open));
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
    setMobileBlogs(false);
    if (lastFocusedElement && typeof lastFocusedElement.focus === "function") {
        lastFocusedElement.focus();
    }
};

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

const setActiveLink = (key) => {
    activeSectionId = key || "";
    document.querySelectorAll("[data-nav-key]").forEach((node) => {
        const isActive = Boolean(key) && node.getAttribute("data-nav-key") === key;
        node.classList.toggle("is-active", isActive);
    });
    const blogsActive = key === "historical-analysis-forecast-errors-price" || key === "blogs";
    document.querySelectorAll('[data-nav-key="blogs"]').forEach((node) => {
        node.classList.toggle("is-active", blogsActive);
    });
};

const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (!el) return;
    const headerH = navHeight();
    const y = window.scrollY + el.getBoundingClientRect().top - headerH - 16;
    scrollLocked = true;
    window.scrollTo({ top: y, behavior: "smooth" });
    const unlock = () => {
        scrollLocked = false;
        window.removeEventListener("scrollend", unlock);
    };
    window.addEventListener("scrollend", unlock);
    setTimeout(unlock, 1000);
};

const updateActiveSection = () => {
    if (!isHomePage || scrollLocked) return;
    const sectionIds = NAV_ITEMS.filter((item) => item.sectionId).map((item) => item.sectionId);
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);
    const offset = navHeight() + 40;
    let currentId = "";
    for (const section of sections) {
        if (section.getBoundingClientRect().top <= offset) {
            currentId = section.id;
        }
    }
    setActiveLink(currentId);
};

const activateContactAtBottom = () => {
    if (!isHomePage) return;
    const nearBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 4;
    if (nearBottom) setActiveLink("contact");
};

const syncPathActiveState = () => {
    if (currentPath === articlePath) {
        setActiveLink("historical-analysis-forecast-errors-price");
        return;
    }
    if (!isHomePage) {
        setActiveLink("");
    }
};

renderDesktopNav();
renderMobileNav();

menuButton?.addEventListener("click", openMenu);
closeMenu?.addEventListener("click", closeMobileMenu);
navBackdrop?.addEventListener("click", closeMobileMenu);

document.addEventListener("click", (event) => {
    const dropdown = document.querySelector("[data-nav-dropdown]");
    const trigger = document.querySelector("[data-nav-dropdown-trigger]");
    if (trigger && trigger.contains(event.target)) {
        setDesktopDropdown(!state.desktopDropdownOpen);
        return;
    }
    if (dropdown && !dropdown.contains(event.target)) {
        setDesktopDropdown(false);
    }
});

document.querySelector("[data-nav-mobile-trigger]")?.addEventListener("click", () => {
    setMobileBlogs(!state.mobileBlogsOpen);
});

document.querySelectorAll("[data-nav-section]").forEach((link) => {
    link.addEventListener("click", (event) => {
        const targetId = link.getAttribute("data-nav-section");
        if (!targetId || !isHomePage) return;
        event.preventDefault();
        setActiveLink(targetId);
        closeMobileMenu();
        setDesktopDropdown(false);
        setTimeout(() => scrollToSection(targetId), 10);
    });
});

document.querySelectorAll(".wl-nav-dropdown-link, .wl-nav-mobile-child").forEach((link) => {
    link.addEventListener("click", () => {
        closeMobileMenu();
        setDesktopDropdown(false);
    });
});

if (isHomePage) {
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    window.addEventListener("scroll", activateContactAtBottom, { passive: true });
    updateActiveSection();
} else {
    syncPathActiveState();
}

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

    const resetTimer = () => {
        if (quoteTimer) clearInterval(quoteTimer);
        quoteTimer = setInterval(nextQuote, 6000);
    };

    if (quoteNext) quoteNext.addEventListener("click", () => { nextQuote(); resetTimer(); });
    if (quotePrev) quotePrev.addEventListener("click", () => { prevQuote(); resetTimer(); });

    resetTimer();
}

document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
        if (isMenuOpen()) closeMobileMenu();
        setDesktopDropdown(false);
    }
    trapFocus(event);
});
