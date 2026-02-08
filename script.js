const menuButton = document.getElementById("menu-button");
const navLinks = document.getElementById("nav-links");
const closeMenu = document.getElementById("close-menu");
const navHeight = () => document.getElementById("site-header")?.getBoundingClientRect().height ?? 96;
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

const closeMobileMenu = () => {
    navLinks?.classList.remove("translate-x-0");
    navLinks?.classList.add("-translate-x-full");
};

menuButton?.addEventListener("click", () => {
    navLinks.classList.remove("-translate-x-full");
    navLinks.classList.add("translate-x-0");
});

closeMenu?.addEventListener("click", closeMobileMenu);

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
        scrollToSection(targetId);
        closeMobileMenu();
        if (isDev) {
            console.debug("[NAV] click", link.textContent?.trim(), "->", targetId);
        }
    });
});

const observerOptions = {
    root: null,
    rootMargin: `-${navHeight() + 20}px 0px -60% 0px`,
    threshold: 0.1,
};

const sectionObserver = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const id = entry.target.id;
        navItems.forEach((link) => {
            link.classList.toggle("is-active", link.getAttribute("data-nav-target") === id);
        });
    });
}, observerOptions);

const sectionIds = NAV_ITEMS.map((item) => item.id);
sectionIds.forEach((id) => {
    const section = document.getElementById(id);
    if (section) sectionObserver.observe(section);
});

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
    if (event.key !== "Escape") return;
    const activeModal = document.querySelector(".wl-modal.is-open");
    if (activeModal) closeModal(activeModal);
    if (lightbox?.classList.contains("is-open")) closeLightbox();
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

// Verify logo usage rights & follow brand guidelines.
const supportedByLogos = [
    { name: "MIT", src: "./public/logos/mit.png", widthHint: 140 },
    { name: "EPFL", src: "./public/logos/epfl.png", widthHint: 140 },
    { name: "EPFL AI Center", src: "./public/logos/epfl-ai-center.png", widthHint: 180 },
    { name: "Innosuisse", src: "./public/logos/innosuisse.png", widthHint: 150 },
];

const supportedByContainer = document.getElementById("supported-by-logos");
if (supportedByContainer) {
    supportedByContainer.innerHTML = supportedByLogos
        .map(({ name, src, widthHint }) => {
            const widthStyle = widthHint ? `style=\"--logo-width:${widthHint}px\"` : "";
            return `
                <div class=\"wl-supported-logo\" data-tooltip=\"${name}\" tabindex=\"0\" role=\"img\" aria-label=\"${name}\" ${widthStyle}>
                    <img src=\"${src}\" alt=\"${name} logo\" loading=\"lazy\" decoding=\"async\" />
                </div>
            `;
        })
        .join("");
}
