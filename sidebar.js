window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Loaded!');

    const navLinks = document.getElementsByClassName('n-link');
    const sections = document.getElementsByTagName('section');

    // Set navigation link to active on click
    for (let i = 0; i < navLinks.length; i++) {
        navLinks[i].addEventListener('click', () => {
            setActiveHighlight(i);
        });
    }

    function setActiveHighlight(index) {
        for (let link of navLinks) {
            link.classList.remove('active');
        }
        navLinks[index].classList.add('active');
    }

    // Update active highlight based on current section
    function updateActiveHighlight() {

        // Get scrollbox position relative to viewport
        const scrollboxRect = document.getElementById('scrollbox').getBoundingClientRect();

        let currentSectionId = null;
        let closestSection = null;
        let minDistance = Infinity;

        for (let section of sections) {
            // getBoundingClientRect relative to viewport, need to account for scrollbox position
            const sectionRect = section.getBoundingClientRect();
            // Calculate distance from the top of the scrollbox to the top of the section
            const distance = Math.abs(sectionRect.top - scrollboxRect.top);
            if (
                sectionRect.top < scrollboxRect.bottom &&
                sectionRect.bottom > scrollboxRect.top
            ) {
                if (distance < minDistance) {
                    minDistance = distance;
                    closestSection = section;
                }
            }
        }

        if (closestSection && closestSection.id) {
            currentSectionId = closestSection.id;
        }

        // Highlight sidebar navigation link based on current section
        if (currentSectionId) {
            for (let i = 0; i < navLinks.length; i++) {
                const link = navLinks[i];
                // Check if href is an anchor link to section ID
                if (link.hash && link.hash.replace('#', '') === currentSectionId) {
                    setActiveHighlight(i);
                }
            }
        }
    }

    // Update active highlight on initial DOM load
    updateActiveHighlight();
    // Update highlightwhen scrolling
    scrollbox.addEventListener('scroll', updateActiveHighlight);

});