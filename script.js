const menuButton = document.getElementById("menu-button");
const navLinks = document.getElementById("nav-links");
const closeMenu = document.getElementById("close-menu");

menuButton.addEventListener("click", () => {
    navLinks.classList.remove("-translate-x-full");
    navLinks.classList.add("translate-x-0");
});

closeMenu.addEventListener("click", () => {
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
