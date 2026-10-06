// -- Carousel -------------------------------------------------
// Scroll-snap carousel with keyboard navigation, prev/next buttons,
// dot indicators, loop, autoplay, and ARIA, plus the named-state API
// (AGENTS.md "State API"). The carousel's observable state is which slide is
// showing, so 'default' carries an optional { index } preset (0 = first) and
// getState().config.index reports the live slide index.

// Shared preamble (AGENTS.md "State API"); the implementation lives in core.js —
// build.ts rewrites this import into a df$.shadcn.shared binding in dist/.
// defussQuery: the callable runtime - dots are (re)rendered through keyed
// morph, flags ride .attr()/.prop() (plans/defuss-query-morph-integration.md
// §3 carousel row).
import { defussGlobals, defussQuery, componentState, bindComponent } from '../../../shared/state-api.js';

const df$ = defussGlobals();
const dfDollar = defussQuery();
// id prefix source for carousels without their own #id (unique per element)
let carSeq = 0;

const carouselStates = ['default'];

// VERIFIED: (verify's API docs gate) the states below are exactly the declared ones, each
// described, and every config field typed, described and named in the code.
/** setState() configs per state (getState() reports the slide shown). */
export interface CarouselStateConfigs {
  /** The carousel showing one slide. */
  default: {
    /** the slide to show, 0-based (default 0) */
    index?: number;
  };
}

/**
 * The markup of a state, for render(): the attributes a state writes, applied
 * to a detached copy of the authored markup ('default' IS the authored
 * markup). The live element gets the same markup from triggerStateChange -
 * the e2e render round trip proves they agree.
 */
function applyMarkup(_el, _stateName) {
  // one state, and it writes no markup: { index } scrolls the track - the
  // position and the generated dots follow it (runtime-owned, see the e2e)
}

/**
 * UI side of setState: scroll to a slide index (clamped/looped by the
 * carousel's own scrollToIndex, exposed on the element at init).
 */
function triggerStateChange(carousel, config) {
  const index = Number(config?.index ?? 0);
  if (typeof carousel._goTo === 'function') carousel._goTo(index);
}

/** Registry-level API; pass the carousel element explicitly. Unknown names throw. */
export const carouselApi = componentState({
  component: 'carousel',
  states: carouselStates,
  apply: (carousel, state) => triggerStateChange(carousel, state.config),
  read: (carousel, state) => {
    return {
      name: carousel.dataset.stateName || 'default',
      // live slide index - updated by updateState() on scroll, not just setState
      config: { ...state.config, index: Number(carousel.dataset.currentIndex || 0) },
    };
  },
  markup: (el, state) => applyMarkup(el, state.name),
});

df$.carouselApi = carouselApi;
df$.carouselStates = carouselStates;

function init() {
dfDollar('.carousel:not([data-init])').toArray().forEach((carousel) => {
  carousel.dataset.init = '';
  // el.store + el.api (AGENTS.md "State through stores")
  bindComponent(carousel, carouselApi);

  const viewport = dfDollar(carousel).find('.carousel-viewport').get(0);
  const prevBtn = dfDollar(carousel).find('.carousel-prev').get(0);
  const nextBtn = dfDollar(carousel).find('.carousel-next').get(0);
  const dotsContainer = dfDollar(carousel).find('.carousel-dots').get(0);
  const counter = dfDollar(carousel).find('.carousel-counter').get(0);
  if (!viewport) return;

  const slides = () => Array.from(dfDollar(viewport).find('.carousel-slide').toArray());
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

    // Prev/next disabled states (non-loop) - native IDL flags via .prop()
    if (!isLoop) {
      if (prevBtn) dfDollar(prevBtn).prop('disabled', currentIndex <= 0);
      if (nextBtn) dfDollar(nextBtn).prop('disabled', currentIndex >= allSlides.length - 1);
    }

    // Dot indicators - scalar ARIA flag per dot through query (§3: attr, no re-render)
    if (dotsContainer)
      dfDollar(dotsContainer)
        .find('.carousel-dot')
        .each(function (this: HTMLElement, i: number) { dfDollar(this).attr('aria-current', i === currentIndex ? 'true' : 'false'); });

    // Counter (literal template text, consumer-visible label)
    if (counter) dfDollar(counter).text(`Slide ${currentIndex + 1} of ${allSlides.length}`);

    // ARIA labels on slides
    allSlides.forEach((slide, i) => { dfDollar(slide).attr('aria-label', `${i + 1} of ${allSlides.length}`); });
  };

  // ── IntersectionObserver for current slide ──
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
          const idx = slides().indexOf(entry.target as HTMLElement);
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

  // ── Dots ─────────────────────────────────────
  // Dot structure renders through morph with stable id keys (slides are
  // consumer-authored, fixed order → index ids ARE the identity, §3). An
  // empty container morphs the initial dot list; when slides change out of
  // band, a slide-count check short-circuits unless reconciliation is due —
  // then ONE keyed morph pass reconciles instead of hand-building buttons.
  // Consumer-provided dots stay consumer-owned (never re-rendered; only
  // their aria-current flag is maintained).
  const carId = (carousel.dataset.carouselId ||= carousel.id || `dfsc-${++carSeq}`);
  let dotCount = -1;
  const renderDots = () => {
    if (!dotsContainer) return;
    const n = slides().length;
    if (dotCount === -1 && dotsContainer.children.length) { dotCount = n; return; } // consumer dots
    if (n === dotCount) return; // structure already matches the slide count
    dotCount = n;
    const html = Array.from({ length: n }, (_, i) =>
      `<button id="${carId}-dot-${i}" class="carousel-dot" aria-label="Go to slide ${i + 1}" aria-current="${i === currentIndex ? 'true' : 'false'}"></button>`,
    ).join('');
    dfDollar(dotsContainer).morph(html); // trusted static markup (§5.1 sink rule)
  };
  if (dotsContainer) {
    renderDots();
    dotsContainer.addEventListener('click', (e) => {
      const dot = (e.target as HTMLElement).closest<HTMLElement>('.carousel-dot');
      if (!dot) return;
      const idx = Array.from(dfDollar(dotsContainer).find('.carousel-dot').toArray()).indexOf(dot);
      if (idx !== -1) scrollToIndex(idx);
    });
  }
  // keep the dot structure in sync when slides change out of band
  let lastSlideCount = slides().length;
  const syncObserver = new MutationObserver(() => {
    const n = slides().length;
    if (n !== lastSlideCount) {
      lastSlideCount = n;
      renderDots();
      observer.disconnect();
      slides().forEach((slide) => observer.observe(slide));
      updateState(Math.min(currentIndex, Math.max(0, n - 1)));
    }
  });
  if (viewport) syncObserver.observe(viewport, { childList: true });

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
