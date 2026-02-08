const menuButton = document.getElementById("menu-button");
const navLinks = document.getElementById("nav-links");
const closeMenu = document.getElementById("close-menu");

menuButton?.addEventListener("click", () => {
    navLinks.classList.remove("-translate-x-full");
    navLinks.classList.add("translate-x-0");
});

closeMenu?.addEventListener("click", () => {
    navLinks.classList.remove("translate-x-0");
    navLinks.classList.add("-translate-x-full");
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
});

// Verify logo usage rights & follow brand guidelines.
const supportedByLogos = [
    { name: "MIT", src: "./assets/logos/MitLogo.Pdf.png", widthHint: 140 },
    { name: "EPFL", src: "./assets/logos/epfl_logo (1).png", widthHint: 150 },
    { name: "EPFL AI Center", src: "./assets/logos/epfl_ai_logo (1).png", widthHint: 180 },
    { name: "Innosuisse", src: "./assets/logos/innosuisse.png", widthHint: 160 },
];

const supportedByContainer = document.getElementById("supported-by-logos");
if (supportedByContainer) {
    supportedByContainer.innerHTML = supportedByLogos
        .map(({ name, src, widthHint }) => {
            const widthStyle = widthHint ? `style=\"--logo-width:${widthHint}px\"` : "";
            return `
                <div class="wl-supported-logo" data-tooltip="${name}" tabindex="0" role="img" aria-label="${name}" ${widthStyle}>
                    <img src="${src}" alt="${name} logo" loading="lazy" decoding="async" />
                </div>
            `;
        })
        .join("");
}
