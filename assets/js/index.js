const SITE_CONFIG = {
    bookingUrl: '',
    bookingLabel: 'Get in touch',
    setVideoUrl: '',
};

document.addEventListener('DOMContentLoaded', () => {
    const header = document.querySelector('.site-header');
    const navigation = document.querySelector('#mainNavigation');
    const watchSetButton = document.querySelector('#watch-set');
    const videoCards = document.querySelectorAll('.video-card');

    const reduceMotion = window.matchMedia(
        '(prefers-reduced-motion: reduce)'
    );

    const SCROLL_DEFAULT = 8;

    const SCROLL_ABOUT = 8;
    const SCROLL_PERFORMANCE = -50;
    const SCROLL_GALLERY = -70;
    const SCROLL_BOOKING = -80;

    if (!header) {
        console.warn('DONKEY UI: Header not found.');
    }

    function scrollToSection(targetSection) {
        if (!targetSection) return;

        const headerBottom = header
            ? Math.max(0, header.getBoundingClientRect().bottom)
            : 0;

        const scrollOffsets = {
            about: SCROLL_ABOUT,
            'live-performance': SCROLL_PERFORMANCE,
            'gallery-section': SCROLL_GALLERY,
            'contact-section': SCROLL_BOOKING,
        };

        const scrollGap =
            scrollOffsets[targetSection.id] ?? SCROLL_DEFAULT;

        const targetPosition =
            window.scrollY +
            targetSection.getBoundingClientRect().top -
            headerBottom -
            scrollGap;

        window.scrollTo({
            top: Math.max(0, targetPosition),
            behavior: reduceMotion.matches ? 'auto' : 'smooth',
        });
    }

    function getTargetFromLink(link) {
        const targetId =
            link.getAttribute('data-target') ||
            link.getAttribute('href');

        if (!targetId || !targetId.startsWith('#')) {
            return null;
        }

        return document.getElementById(targetId.slice(1));
    }

    function closeMobileMenu(callback) {
        if (!navigation || !navigation.classList.contains('show')) {
            requestAnimationFrame(callback);
            return;
        }

        const Collapse = window.bootstrap?.Collapse;

        if (!Collapse) {
            requestAnimationFrame(callback);
            return;
        }

        navigation.addEventListener(
            'hidden.bs.collapse',
            () => {
                requestAnimationFrame(() => {
                    requestAnimationFrame(callback);
                });
            },
            { once: true }
        );

        Collapse.getOrCreateInstance(
            navigation,
            { toggle: false }
        ).hide();
    }

    document.addEventListener('click', (event) => {
        if (!(event.target instanceof Element))
            return;

        if (
            event.button !== 0 ||
            event.ctrlKey ||
            event.metaKey ||
            event.shiftKey ||
            event.altKey
        ) {
            return;
        }

        const link = event.target.closest('a[href^="#"]');

        if (!link)
            return;

        if (link.id === 'watch-set' && SITE_CONFIG.setVideoUrl) {
            event.preventDefault();
            window.open(
                SITE_CONFIG.setVideoUrl,
                '_blank',
                'noopener,noreferrer'
            );
            return;
        }

        const targetSection = getTargetFromLink(link);

        if (!targetSection) return;

        event.preventDefault();

        const performScroll = () => {
            scrollToSection(targetSection);

            if (window.history?.replaceState) {
                window.history.replaceState(
                    null,
                    '',
                    `#${targetSection.id}`
                );
            }
        };

        if (navigation && navigation.contains(link)) {
            closeMobileMenu(performScroll);
        } else {
            performScroll();
        }
    });

    videoCards.forEach((card) => {
        const video = card.querySelector('.custom-video');

        if (!video) return;

        card.addEventListener('click', (event) => {
            if (
                event.target instanceof Element &&
                event.target.closest('a, button')
            ) {
                return;
            }

            if (!video.paused) {
                video.pause();
                return;
            }

            document.querySelectorAll('.custom-video').forEach((item) => {
                if (item !== video) {
                    item.pause();
                }
            });

            video.muted = false;

            video.play().catch((error) => {
                console.warn('Video playback prevented:', error);
            });
        });
    });

    if (SITE_CONFIG.bookingUrl) {
        document.querySelectorAll('[data-booking-link]')
            .forEach((link) => {
                link.href = SITE_CONFIG.bookingUrl;
                link.textContent = `${SITE_CONFIG.bookingLabel} ↗`;
                link.target = '_blank';
                link.rel = 'noopener noreferrer';
            });
    }

    console.info(
        'DONKEY Portfolio UI initialized successfully.'
    );
});
