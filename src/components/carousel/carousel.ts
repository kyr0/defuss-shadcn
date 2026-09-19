// -- Carousel -------------------------------------------------
// Scroll-snap carousel with keyboard navigation, prev/next buttons,
// dot indicators, loop, autoplay, and ARIA, plus the named-state API
// (AGENTS.md "State API"). The carousel's observable state is which slide is
// showing, so 'default' carries an optional { index } preset (0 = first) and
// getState().config.index reports the live slide index.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
import { defussGlobals } from '../../shared/state-api.js';

const df$ = defussGlobals();

const carouselStates = ['default'];

/**
 * UI side of setState: scroll to a slide index (clamped/looped by the
 * carousel's own scrollToIndex, exposed on the element at init).
 */
function triggerStateChange(carousel, config) {
  const index = Number(config?.index ?? 0);
  if (typeof carousel._goTo === 'function') carousel._goTo(index);
}

/** Registry-level API; pass the carousel element explicitly. Unknown names throw. */
export const carouselApi = {
  setState(carousel, stateName, config = {}) {
    if (!carouselStates.includes(stateName)) {
      throw new Error(`carousel: unknown state "${stateName}" (supported: ${carouselStates.join(', ')})`);
    }
    triggerStateChange(carousel, config);
    // state lives on the ELEMENT, not the module (many carousels per page)
    carousel.dataset.stateName = stateName;
    carousel._stateConfig = config;
  },
  getState(carousel) {
    return {
      name: carousel.dataset.stateName || 'default',
      // live slide index — updated by updateState() on scroll, not just setState
      config: { ...carousel._stateConfig, index: Number(carousel.dataset.currentIndex || 0) },
    };
  },
};

df$.carouselApi = carouselApi;
df$.carouselStates = carouselStates;

function init() {
document.querySelectorAll('.carousel:not([data-init])').forEach((carousel) => {
  carousel.dataset.init = '';
  // bind-scope the api per instance: `$('#gallery').api.setState('default', { index: 2 })`
  carousel.api = {
    setState: (stateName, config) => carouselApi.setState(carousel, stateName, config),
    getState: () => carouselApi.getState(carousel),
  };

  const viewport = carousel.querySelector('.carousel-viewport');
  const prevBtn = carousel.querySelector('.carousel-prev');
  const nextBtn = carousel.querySelector('.carousel-next');
  const dotsContainer = carousel.querySelector('.carousel-dots');
  const counter = carousel.querySelector('.carousel-counter');
  if (!viewport) return;

  const slides = () => Array.from(viewport.querySelectorAll('.carousel-slide'));
  const isVertical = carousel.dataset.orientation === 'vertical';
  const isLoop = carousel.hasAttribute('data-loop');
  const autoplayDelay = carousel.dataset.autoplay ? parseInt(carousel.dataset.autoplay, 10) : 0;
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const behavior = reducedMotion ? 'auto' : 'smooth';

  let currentIndex = 0;
  let autoplayTimer = null;

  // ── ARIA setup ───────────────────────────────
  if (!carousel.hasAttribute('role')) carousel.setAttribute('role', 'region');
  carousel.setAttribute('aria-roledescription', 'carousel');
  if (!carousel.hasAttribute('aria-label')) carousel.setAttribute('aria-label', 'Carousel');

  slides().forEach((slide, i) => {
    slide.setAttribute('role', 'group');
    slide.setAttribute('aria-roledescription', 'slide');
    if (!slide.hasAttribute('aria-label')) {
      slide.setAttribute('aria-label', `${i + 1} of ${slides().length}`);
    }
  });

  // ── Scroll to index ─────────────────────────
  const scrollToIndex = (index) => {
    const allSlides = slides();
    if (!allSlides.length) return;

    let target = index;
    if (isLoop) {
      target = ((index % allSlides.length) + allSlides.length) % allSlides.length;
    } else {
      target = Math.max(0, Math.min(index, allSlides.length - 1));
    }

    const slide = allSlides[target];
    if (isVertical) {
      viewport.scrollTo({ top: slide.offsetTop - viewport.offsetTop, behavior });
    } else {
      viewport.scrollTo({ left: slide.offsetLeft - viewport.offsetLeft, behavior });
    }
  };

  // ── Update state (buttons, dots, counter) ───
  const updateState = (index) => {
    const allSlides = slides();
    if (!allSlides.length) return;
    currentIndex = index;
    // mirror the live index onto the element for the State API (AGENTS.md:
    // state must not live in module scope)
    carousel.dataset.currentIndex = String(index);

    // Prev/next disabled states (non-loop)
    if (!isLoop) {
      if (prevBtn) prevBtn.disabled = currentIndex <= 0;
      if (nextBtn) nextBtn.disabled = currentIndex >= allSlides.length - 1;
    }

    // Dot indicators
    if (dotsContainer) {
      const dots = dotsContainer.querySelectorAll('.carousel-dot');
      dots.forEach((dot, i) => {
        dot.setAttribute('aria-current', i === currentIndex ? 'true' : 'false');
      });
    }

    // Counter
    if (counter) {
      counter.textContent = `Slide ${currentIndex + 1} of ${allSlides.length}`;
    }

    // ARIA labels on slides
    allSlides.forEach((slide, i) => {
      slide.setAttribute('aria-label', `${i + 1} of ${allSlides.length}`);
    });
  };

  // ── IntersectionObserver for current slide ──
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const idx = slides().indexOf(entry.target);
          if (idx !== -1) updateState(idx);
        }
      }
    },
    { root: viewport, threshold: 0.5 }
  );

  slides().forEach((slide) => observer.observe(slide));

  // ── Navigation ──────────────────────────────
  const goNext = () => scrollToIndex(currentIndex + 1);
  const goPrev = () => scrollToIndex(currentIndex - 1);

  if (prevBtn) prevBtn.addEventListener('click', goPrev);
  if (nextBtn) nextBtn.addEventListener('click', goNext);
  // expose the closure's scroll-to for the State API (element member, not module)
  carousel._goTo = scrollToIndex;

  // ── Dot click handlers ──────────────────────
  if (dotsContainer) {
    const allSlides = slides();
    // Generate dots if empty
    if (!dotsContainer.children.length && allSlides.length) {
      allSlides.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'carousel-dot';
        dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
        dot.setAttribute('aria-current', i === 0 ? 'true' : 'false');
        dotsContainer.appendChild(dot);
      });
    }

    dotsContainer.addEventListener('click', (e) => {
      const dot = e.target.closest('.carousel-dot');
      if (!dot) return;
      const dots = Array.from(dotsContainer.querySelectorAll('.carousel-dot'));
      const idx = dots.indexOf(dot);
      if (idx !== -1) scrollToIndex(idx);
    });
  }

  // ── Keyboard navigation ─────────────────────
  carousel.addEventListener('keydown', (e) => {
    const prevKey = isVertical ? 'ArrowUp' : 'ArrowLeft';
    const nextKey = isVertical ? 'ArrowDown' : 'ArrowRight';
    if (e.key === prevKey) { e.preventDefault(); goPrev(); }
    if (e.key === nextKey) { e.preventDefault(); goNext(); }
    if (e.key === 'Home') { e.preventDefault(); scrollToIndex(0); }
    if (e.key === 'End') { e.preventDefault(); scrollToIndex(slides().length - 1); }
  });

  // Make carousel focusable if not already
  if (!carousel.hasAttribute('tabindex')) {
    carousel.setAttribute('tabindex', '0');
  }

  // ── Autoplay ────────────────────────────────
  const startAutoplay = () => {
    if (!autoplayDelay) return;
    stopAutoplay();
    autoplayTimer = setInterval(goNext, autoplayDelay);
    viewport.setAttribute('aria-live', 'off');
  };

  const stopAutoplay = () => {
    if (autoplayTimer) {
      clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
    viewport.setAttribute('aria-live', 'polite');
  };

  if (autoplayDelay) {
    startAutoplay();
    // Pause on hover and focus (WAI-ARIA APG requirement)
    carousel.addEventListener('mouseenter', stopAutoplay);
    carousel.addEventListener('mouseleave', startAutoplay);
    carousel.addEventListener('focusin', stopAutoplay);
    carousel.addEventListener('focusout', startAutoplay);
  } else {
    viewport.setAttribute('aria-live', 'polite');
  }

  // ── Initial state ───────────────────────────
  updateState(0);
});
}

init();
new MutationObserver(init).observe(document, { childList: true, subtree: true });
