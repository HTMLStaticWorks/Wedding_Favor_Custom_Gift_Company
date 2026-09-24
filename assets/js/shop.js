document.addEventListener('DOMContentLoaded', () => {

  /* ==========================================================================
     Product Filtering (Shop Page)
     ========================================================================== */
  const filterBtns = document.querySelectorAll('.filter-btn');
  // Scoped to the main grid — the New Arrivals rail carries product cards too
  // and must never be hidden by a filter.
  const productCards = document.querySelectorAll('#product-list .product-card');
  const emptyState = document.querySelector('.empty-state');

  const applyFilter = (filterGender, filterOccasion) => {
    let visible = 0;

    productCards.forEach(card => {
      const cardGender = card.getAttribute('data-gender');
      const cardOccasion = card.getAttribute('data-occasion');

      let show = true;
      if (filterGender && filterGender !== 'all' && cardGender !== filterGender) show = false;
      if (filterOccasion && filterOccasion !== 'all' && cardOccasion !== filterOccasion) show = false;

      card.style.display = show ? 'flex' : 'none';
      if (show) visible += 1;
    });

    if (emptyState) emptyState.hidden = visible !== 0;
  };

  const markActive = (btn) => {
    filterBtns.forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    if (btn) {
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
    }
  };

  if (filterBtns.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        markActive(btn);
        applyFilter(btn.getAttribute('data-gender'), btn.getAttribute('data-occasion'));
      });
    });

    // Honour ?gender= and ?occasion= links coming from the homepage tiles and footer
    const params = new URLSearchParams(window.location.search);
    const gender = params.get('gender');
    const occasion = params.get('occasion');

    if (gender || occasion) {
      const g = gender || 'all';
      const o = occasion || 'all';
      const match = Array.from(filterBtns).find(b =>
        b.getAttribute('data-gender') === g && b.getAttribute('data-occasion') === o
      );
      markActive(match || null);
      applyFilter(g, o);
    }
  }

  /* ==========================================================================
     New Arrivals rail — arrow paging
     ========================================================================== */
  const rail = document.querySelector('.rail');
  if (rail) {
    const prevBtn = document.querySelector('.rail-btn[data-dir="prev"]');
    const nextBtn = document.querySelector('.rail-btn[data-dir="next"]');

    const step = () => {
      const card = rail.querySelector('.product-card');
      if (!card) return rail.clientWidth;
      const gap = parseFloat(getComputedStyle(rail).columnGap) || 32;
      return card.getBoundingClientRect().width + gap;
    };

    const syncArrows = () => {
      if (!prevBtn || !nextBtn) return;
      const max = rail.scrollWidth - rail.clientWidth;
      // In RTL, scrollLeft runs negative — compare on magnitude.
      const pos = Math.abs(rail.scrollLeft);
      prevBtn.disabled = pos <= 4;
      nextBtn.disabled = pos >= max - 4;
    };

    const page = (dir) => {
      const rtl = document.documentElement.getAttribute('dir') === 'rtl';
      rail.scrollBy({ left: step() * dir * (rtl ? -1 : 1), behavior: 'smooth' });
    };

    if (prevBtn) prevBtn.addEventListener('click', () => page(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => page(1));
    rail.addEventListener('scroll', syncArrows, { passive: true });
    window.addEventListener('resize', syncArrows);
    syncArrows();
  }

  /* ==========================================================================
     Seasonal sale countdown
     ========================================================================== */
  const clock = document.querySelector('[data-countdown]');
  if (clock) {
    let targetAttr = clock.getAttribute('data-countdown');
    let target = new Date(targetAttr).getTime();

    // If date is invalid or in the past, dynamically set target to upcoming Sunday 23:59:59
    if (isNaN(target) || target <= Date.now()) {
      const now = new Date();
      const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
      const nextSunday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilSunday, 23, 59, 59);
      target = nextSunday.getTime();
    }

    const pad = (n) => String(Math.max(0, n)).padStart(2, '0');
    const parts = {
      days: clock.querySelector('[data-unit="days"]'),
      hours: clock.querySelector('[data-unit="hours"]'),
      minutes: clock.querySelector('[data-unit="minutes"]'),
      seconds: clock.querySelector('[data-unit="seconds"]')
    };

    let timer = null;
    const tick = () => {
      let diff = target - Date.now();
      if (diff <= 0) {
        target += 7 * 24 * 60 * 60 * 1000;
        diff = target - Date.now();
      }
      diff = Math.floor(diff / 1000);
      if (parts.days) parts.days.textContent = pad(Math.floor(diff / 86400));
      if (parts.hours) parts.hours.textContent = pad(Math.floor(diff / 3600) % 24);
      if (parts.minutes) parts.minutes.textContent = pad(Math.floor(diff / 60) % 60);
      if (parts.seconds) parts.seconds.textContent = pad(diff % 60);
    };

    tick();
    timer = setInterval(tick, 1000);
  }

  /* ==========================================================================
     Copy the promo code out of the sale banner
     ========================================================================== */
  document.querySelectorAll('.promo-copy').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.getAttribute('data-code') || '';
      const done = () => {
        if (window.Aura) window.Aura.toast('Code ' + code + ' copied', 'ph-copy');
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(code).then(done).catch(done);
      } else {
        done();
      }
    });
  });

  /* ==========================================================================
     Size Guide Modal
     ========================================================================== */
  const sizeGuideBtns = document.querySelectorAll('.size-guide-btn');
  const modalOverlay = document.querySelector('.modal-overlay');
  const modalClose = document.querySelector('.modal-close');
  const modalBody = document.querySelector('.modal-body');
  let lastFocused = null;

  const measureNote = `<p style="font-size:var(--text-small); color:var(--color-text-muted); margin-top:var(--space-3)">
      All favor dimensions are crafted in our studio. Digital proof review and custom ribbon swatch samples are complimentary on every order.
    </p>`;

  const sizeTables = {
    candles: `
      <span class="eyebrow">Studio Specifications</span>
      <h3 id="modal-title">Candle Favors — Size &amp; Burn Guide</h3>
      <table>
        <thead><tr><th>Favor Size</th><th>Height</th><th>Diameter</th><th>Est. Burn Time</th></tr></thead>
        <tbody>
          <tr><td>Petite (2 oz)</td><td>2.0 in</td><td>1.8 in</td><td>~15 Hours</td></tr>
          <tr><td>Standard (4 oz)</td><td>2.6 in</td><td>2.2 in</td><td>~30 Hours</td></tr>
          <tr><td>Grand (8 oz)</td><td>3.5 in</td><td>3.0 in</td><td>~60 Hours</td></tr>
        </tbody>
      </table>${measureNote}
    `,
    packaging: `
      <span class="eyebrow">Bespoke Finishes</span>
      <h3 id="modal-title">Packaging &amp; Wax Seal Guide</h3>
      <table>
        <thead><tr><th>Option</th><th>Material</th><th>Monogram Area</th></tr></thead>
        <tbody>
          <tr><td>Wax Seal Stamp</td><td>Metallic Rose Gold Wax</td><td>1.0 in Circular</td></tr>
          <tr><td>Foil Embossed Tag</td><td>300gsm Cotton Cardstock</td><td>2.0 in x 3.5 in</td></tr>
          <tr><td>Custom Ribbon</td><td>Double-Face Satin / Velvet</td><td>0.75 in Width</td></tr>
        </tbody>
      </table>${measureNote}
    `,
    quantities: `
      <span class="eyebrow">Event Concierge</span>
      <h3 id="modal-title">Favor Quantity Guide</h3>
      <table>
        <thead><tr><th>Guest Count</th><th>Recommended Favors</th><th>Lead Time</th></tr></thead>
        <tbody>
          <tr><td>50 Guests</td><td>55 Favors (+10% buffer)</td><td>3–5 Days</td></tr>
          <tr><td>100 Guests</td><td>110 Favors (+10% buffer)</td><td>5–7 Days</td></tr>
          <tr><td>250 Guests</td><td>275 Favors (+10% buffer)</td><td>7–10 Days</td></tr>
        </tbody>
      </table>${measureNote}
    `
  };

  const openSizeGuide = (type) => {
    if (!modalOverlay || !modalBody) return;

    lastFocused = document.activeElement;
    modalBody.innerHTML = sizeTables[type] || sizeTables.candles;
    modalOverlay.classList.add('open');
    if (modalClose) modalClose.focus();
    document.body.style.overflow = 'hidden';
  };

  const closeSizeGuide = () => {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  };

  sizeGuideBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      openSizeGuide(btn.getAttribute('data-garment-type') || 'tops');
    });
  });

  if (modalClose) modalClose.addEventListener('click', closeSizeGuide);
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeSizeGuide();
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalOverlay && modalOverlay.classList.contains('open')) {
      closeSizeGuide();
    }
  });

  /* ==========================================================================
     Keep focus inside the open modal
     ========================================================================== */
  if (modalOverlay) {
    modalOverlay.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !modalOverlay.classList.contains('open')) return;
      const focusable = modalOverlay.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    });
  }

});
