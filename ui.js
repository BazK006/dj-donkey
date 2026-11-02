
const SITE_CONFIG = {
  bookingUrl: '',
  bookingLabel: 'Get in touch',
  setVideoUrl: '',
};

document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const navigation = document.querySelector('#mainNavigation');
  const watchSetButton = document.querySelector('#watch-set');

  const reduceMotion = window.matchMedia(
    '(prefers-reduced-motion: reduce)'
  );

  if (!header) {
    console.warn('DONKEY UI: Header not found.');
  }

  function scrollToSection(targetSection) {
    if (!targetSection) return;

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

    const sectionId = targetId.slice(1);

    if (!sectionId) return null;

    return document.getElementById(sectionId);
  }

  function closeMobileMenu(callback) {
    if (!navigation || !navigation.classList.contains('show')) {
      callback();
      return;
    }

    if (!window.bootstrap?.Collapse) {
      callback();
      return;
    }

    navigation.addEventListener(
      'hidden.bs.collapse',
      callback,
      { once: true }
    );

    const collapse = window.bootstrap.Collapse.getOrCreateInstance(
      navigation,
      { toggle: false }
    );

    collapse.hide();
  }

  document.addEventListener('click', (event) => {
    const link = event.target instanceof Element
      ? event.target.closest('a[href^="#"]')
      : null;

    if (!link) return;

    const targetSection = getTargetFromLink(link);

    if (!targetSection) return;

    event.preventDefault();

    if (navigation && navigation.contains(link)) {
      closeMobileMenu(() => {
        scrollToSection(targetSection);
      });
    } else {
      scrollToSection(targetSection);
    }

    if (window.history?.replaceState) {
      window.history.replaceState(
        null,
        '',
        `#${targetSection.id}`
      );
    }
  });

  if (watchSetButton) {
    watchSetButton.addEventListener('click', (event) => {
      if (!SITE_CONFIG.setVideoUrl) return;

      event.preventDefault();
      event.stopPropagation();

      window.open(
        SITE_CONFIG.setVideoUrl,
        '_blank',
        'noopener,noreferrer'
      );
    });
  }

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
