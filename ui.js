const SITE_CONFIG = {
  bookingUrl: '',
  bookingLabel: 'Get in touch',
  setVideoUrl: '',

};

document.addEventListener('DOMContentLoaded', () => {
  const header = document.querySelector('.site-header');
  const navigation = document.querySelector('#mainNavigation');
  const navItems = document.querySelectorAll('.nav-link-item');

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

      behavior: reduceMotion.matches
        ? 'auto'
        : 'smooth'

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

    const collapse = bootstrap.Collapse.getOrCreateInstance(
      navigation,
      { toggle: false }
    );

    collapse.hide();

  }

  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link)
      return;

    const targetSection = getTargetFromLink(link);

    if (!targetSection)
      return;

    event.preventDefault();

    if (navigation && navigation.contains(link)) {
      closeMobileMenu(() => {
        scrollToSection(targetSection);
      });
    } else {
      scrollToSection(targetSection);
    }

    if (window.history?.replaceState) {
      history.replaceState(
        null,
        '',
        `#${targetSection.id}`
      );
    }
  });

  if (watchSetButton) {
    watchSetButton.addEventListener('click', (event) => {
      if (!SITE_CONFIG.setVideoUrl) {
        return;
      }

      event.preventDefault();
      window.open(
        SITE_CONFIG.setVideoUrl,
        '_blank',
        'noopener,noreferrer'
      );

    });

  }

  if (SITE_CONFIG.bookingUrl) {
    document.querySelectorAll('[data-booking-link]')
      .forEach(link => {

        link.href = SITE_CONFIG.bookingUrl;
        link.textContent =
          SITE_CONFIG.bookingLabel + ' ↗';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
      });
  }

  const sections = [
    document.querySelector('#home'),
    document.querySelector('#about'),
    document.querySelector('#live-performance'),
    document.querySelector('#gallery-section'),
    document.querySelector('#contact-section')
  ].filter(Boolean);

  if ('IntersectionObserver' in window) {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        const visibleSections = entries
          .filter(entry => entry.isIntersecting)
          .sort(
            (a, b) =>
              b.intersectionRatio - a.intersectionRatio
          );

        if (!visibleSections.length) return;

        const activeId =
          visibleSections[0].target.id;

        navItems.forEach(item => {
          const itemTarget =
            item.getAttribute('data-target') ||
            item.getAttribute('href');

          const isActive =
            itemTarget === `#${activeId}`;
          item.classList.toggle(
            'active',
            isActive
          );

          if (isActive) {
            item.setAttribute(
              'aria-current',
              'location'
            );
          } else {
            item.removeAttribute('aria-current');
          }
        });
      },

      {
        root: null,
        rootMargin: '-25% 0px -55% 0px',
        threshold: [0, 0.1, 0.25, 0.5, 0.75]
      }
    );

    sections.forEach(section => {
      sectionObserver.observe(section);
    });
  }

  console.info(
    'DONKEY Portfolio UI initialized successfully.'
  );
});