// Note: Scroll-animation.js was assisted by Claude and should be considered public-domain. Feel free to use it if you are snooping around this code.
window.addEventListener("DOMContentLoaded", () => {
    const scrollBox = document.getElementById("main-content");
    if (!scrollBox) return;

    const animatedElements = Array.from(
        scrollBox.querySelectorAll("[data-animate]")
    );
    if (!animatedElements.length) return;

    for (const element of animatedElements) {
        element.style.opacity = "0";
    }

    const revealElement = (element) => {
        const animationClasses = (element.dataset.animate || "")
            .split(" ")
            .map((name) => name.trim())
            .filter(Boolean);

        element.style.opacity = "";
        if (animationClasses.length) {
            element.classList.add(...animationClasses);
        }
    };

    const observer = new IntersectionObserver(
        (entries, obs) => {
            for (const entry of entries) {
                if (!entry.isIntersecting) continue;
                revealElement(entry.target);
                obs.unobserve(entry.target);
            }
        },
        {
            root: scrollBox,
            threshold: 0.2,
            rootMargin: "0px 0px -10% 0px",
        }
    );

    for (const element of animatedElements) {
        observer.observe(element);
    }
});
