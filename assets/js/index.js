
document.addEventListener('DOMContentLoaded', () => {
    const videoCards = document.querySelectorAll('.video-card');
    videoCards.forEach(card => {
        const video = card.querySelector('.custom-video');

        if (!video) return;

        card.addEventListener('click', () => {

            if (!video.paused) {
                video.pause();
                return;
            }

            document.querySelectorAll('.custom-video').forEach(v => {
                v.pause();
            });

            video.muted = false;

            video.play().catch(error => {
                console.log('Video playback prevented:', error);
            });
        });
    });

    const navigation = document.getElementById('mainNavigation');
    const navItems = document.querySelectorAll('.nav-link-item');

    const header = document.querySelector('.site-header')
        || document.querySelector('header.fixed-top');

    function scrollToSection(targetSection) {
        const headerHeight = header
            ? header.getBoundingClientRect().height
            : 0;

        const spacing = 16;

        const targetPosition =
            window.scrollY +
            targetSection.getBoundingClientRect().top -
            headerHeight -
            spacing;

        window.scrollTo({
            top: Math.max(0, targetPosition),
            behavior: 'smooth'
        });
    }

    navItems.forEach(item => {
        item.addEventListener('click', event => {

            const targetId =
                item.getAttribute('data-target') ||
                item.getAttribute('href');

            if (!targetId || !targetId.startsWith('#')) return;

            const targetSection = document.getElementById(
                targetId.substring(1)
            );

            if (!targetSection)
                return;

            event.preventDefault();
            if (navigation && navigation.classList.contains('show')
                && window.bootstrap?.Collapse) {
                navigation.addEventListener(
                    'hidden.bs.collapse',
                    () => {
                        scrollToSection(targetSection);
                    },
                    { once: true }
                );
                bootstrap.Collapse
                    .getOrCreateInstance(navigation)
                    .hide();
            } else {
                scrollToSection(targetSection);
            }
        });
    });
});
