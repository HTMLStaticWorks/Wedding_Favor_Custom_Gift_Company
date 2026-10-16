document.addEventListener('DOMContentLoaded', () => {

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ==========================================================================
     Toast — replaces blocking alert() dialogs
     ========================================================================== */
  const toastEl = document.querySelector('.toast');
  let toastTimer = null;

  const toast = (message, icon = 'ph-check-circle') => {
    if (!toastEl) return;
    const iconEl = toastEl.querySelector('i');
    const textEl = toastEl.querySelector('span');
    if (iconEl) iconEl.className = `ph ${icon}`;
    if (textEl) textEl.textContent = message;
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 3200);
  };

  // cart.js and checkout.js post their own notices through this.
  window.Aura = Object.assign(window.Aura || {}, { toast });

  /* ==========================================================================
     Theme Toggle (Dark/Light)
     ========================================================================== */
  const themeToggles = document.querySelectorAll('.theme-toggle');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const savedTheme = localStorage.getItem('theme');

  let currentTheme = savedTheme || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', currentTheme);

  /* Telegram-style sun/moon morph. One drawing, not two icons: the disc grows
     while a masked "bite" slides across it to carve the crescent, and the beams
     spin out. That means the markup is injected once and CSS animates it off
     [data-theme] — re-writing innerHTML per click would kill the transition
     halfway and the thing would just pop between states. */
  const themeIcon = (maskId) => `
    <svg class="theme-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <mask class="moon-mask" id="${maskId}">
        <rect x="0" y="0" width="100%" height="100%" fill="white" />
        <circle cx="24" cy="10" r="6" fill="black" />
      </mask>
      <circle class="sun" cx="12" cy="12" r="6" fill="currentColor" mask="url(#${maskId})" />
      <g class="sun-beams" stroke="currentColor">
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </g>
    </svg>`;

  // Each mask needs its own id — pages carry several toggles (navbar, drawer),
  // and duplicate ids would point every SVG at the first mask on the page.
  themeToggles.forEach((toggle, i) => {
    toggle.innerHTML = themeIcon(`theme-moon-mask-${i}`);
  });

  const updateThemeState = (theme) => {
    themeToggles.forEach(toggle => {
      toggle.setAttribute('aria-pressed', theme === 'dark');
      toggle.setAttribute('aria-label', theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode');
    });
  };

  updateThemeState(currentTheme);

  themeToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', currentTheme);
      localStorage.setItem('theme', currentTheme);
      updateThemeState(currentTheme);
    });
  });

  /* ==========================================================================
     RTL Toggle
     ========================================================================== */
  const rtlToggles = document.querySelectorAll('.rtl-toggle');
  let currentDir = localStorage.getItem('dir') || 'ltr';
  document.documentElement.setAttribute('dir', currentDir);

  rtlToggles.forEach(toggle => {
    toggle.innerHTML = '<i class="ph ph-arrows-left-right"></i>';
  });

  rtlToggles.forEach(toggle => {
    toggle.addEventListener('click', () => {
      currentDir = currentDir === 'rtl' ? 'ltr' : 'rtl';
      document.documentElement.setAttribute('dir', currentDir);
      localStorage.setItem('dir', currentDir);
    });
  });

  /* ==========================================================================
     Mobile Drawer
     ========================================================================== */
  const hamburger = document.querySelector('.hamburger');
  const drawer = document.querySelector('.drawer');
  const drawerOverlay = document.querySelector('.drawer-overlay');
  const drawerClose = document.querySelector('.drawer-close');

  const openDrawer = () => {
    if (drawer) drawer.classList.add('open');
    if (drawerOverlay) drawerOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (drawerClose) drawerClose.focus();
  };

  const closeDrawer = () => {
    if (drawer) drawer.classList.remove('open');
    if (drawerOverlay) drawerOverlay.classList.remove('open');
    document.body.style.overflow = '';
    if (hamburger) hamburger.focus();
  };

  if (hamburger) hamburger.addEventListener('click', openDrawer);
  if (drawerClose) drawerClose.addEventListener('click', closeDrawer);
  if (drawerOverlay) drawerOverlay.addEventListener('click', closeDrawer);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && drawer && drawer.classList.contains('open')) closeDrawer();
  });

  /* The bag icon is owned by cart.js — it opens the bag drawer. */

  /* ==========================================================================
     Scroll state — drives the announcement retract + compact navbar
     ========================================================================== */
  const setScrollState = () => {
    document.body.classList.toggle('scrolled', window.scrollY > 24);
  };
  /* ==========================================================================
     Back to top
     ========================================================================== */
  const backToTop = document.querySelector('.back-to-top');

  const setScroll = () => {
    setScrollState();
    if (backToTop) {
      const show = window.scrollY > window.innerHeight * 0.6;
      backToTop.classList.toggle('show', show);
      // Keep it out of the tab order while it is invisible.
      backToTop.tabIndex = show ? 0 : -1;
    }
  };

  if (backToTop) {
    backToTop.tabIndex = -1;
    backToTop.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  setScroll();
  window.addEventListener('scroll', setScroll, { passive: true });

  /* ==========================================================================
     Reveal on scroll
     ========================================================================== */
  const revealTargets = document.querySelectorAll('[data-reveal], .reveal-lines, .animate-on-scroll');

  if (prefersReducedMotion || !('IntersectionObserver' in window)) {
    revealTargets.forEach(el => el.classList.add('is-visible'));
  } else {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      });
    // threshold 0 + a bottom inset: tall blocks fire as soon as their top
    // crosses into view, instead of waiting for 12% of a 600px column.
    }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });

    revealTargets.forEach(el => revealObserver.observe(el));
  }

  /* ==========================================================================
     Stat counters — figures tick up the first time their row is seen
     ========================================================================== */
  const counters = document.querySelectorAll('.stat-line strong, [data-count]');

  const runCounter = (el, delay) => {
    const raw = (el.dataset.count || el.textContent).trim();
    // prefix / number / suffix — keeps the "%" on "100%" and any leading glyph.
    const parts = raw.match(/^(\D*)([\d.,]+)(.*)$/);
    if (!parts) return;

    const [, prefix, digits, suffix] = parts;
    const target = parseFloat(digits.replace(/,/g, ''));
    if (!isFinite(target)) return;

    const grouped = digits.includes(',');
    const decimals = (digits.split('.')[1] || '').length;
    // "06" and "01" have to stay two-up. Padding to the original digit count
    // also holds the character count steady, so the row never reflows mid-count.
    const pad = grouped || decimals ? 0 : digits.length;

    const format = (value) => {
      let out = grouped
        ? value.toLocaleString(undefined, { maximumFractionDigits: decimals })
        : value.toFixed(decimals);
      if (pad) out = out.padStart(pad, '0');
      return prefix + out + suffix;
    };

    const duration = 1600;
    let start = null;

    const tick = (now) => {
      if (start === null) start = now;
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic — fast, then settles
      el.textContent = format(target * eased);
      if (t < 1) requestAnimationFrame(tick);
      else el.textContent = raw; // land on the authored string exactly
    };

    el.textContent = format(0);
    setTimeout(() => requestAnimationFrame(tick), delay);
  };

  if (counters.length && !prefersReducedMotion && 'IntersectionObserver' in window) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        counterObserver.unobserve(entry.target);
        const row = entry.target.closest('.stat-line');
        const index = row ? [...row.querySelectorAll('strong')].indexOf(entry.target) : 0;
        runCounter(entry.target, Math.max(index, 0) * 120);
      });
    }, { threshold: 0.4 });

    counters.forEach(el => counterObserver.observe(el));
  }

  /* ==========================================================================
     Wishlist (front-end interactive state)
     Add-to-bag lives in cart.js, which owns the bag and its badge.
     ========================================================================== */
  document.querySelectorAll('.wishlist').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const active = btn.classList.toggle('active');
      btn.setAttribute('aria-pressed', String(active));
      toast(active ? 'Saved to your wishlist' : 'Removed from your wishlist', active ? 'ph-heart' : 'ph-heart-break');
    });
  });

  /* ==========================================================================
     Password reveal
     ========================================================================== */
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const field = btn.closest('.password-field')?.querySelector('input');
      if (!field) return;

      const reveal = field.type === 'password';
      field.type = reveal ? 'text' : 'password';
      btn.querySelector('i').className = reveal ? 'ph ph-eye-slash' : 'ph ph-eye';
      btn.setAttribute('aria-label', reveal ? 'Hide password' : 'Show password');
      btn.setAttribute('aria-pressed', String(reveal));
      field.focus();
    });
  });

  /* ==========================================================================
     Form Validation
     ========================================================================== */
  const validateEmail = (email) => {
    return String(email)
      .toLowerCase()
      .match(
        /^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/
      );
  };

  const forms = document.querySelectorAll('form[data-validate]');
  forms.forEach(form => {
    form.addEventListener('submit', (e) => {
      let isValid = true;
      let firstInvalid = null;
      const requiredInputs = form.querySelectorAll('input[required], textarea[required], select[required]');

      requiredInputs.forEach(input => {
        const formGroup = input.closest('.form-group') || input.parentElement;

        input.classList.remove('error', 'success');
        formGroup.classList.remove('has-error');
        const errorMsg = formGroup.querySelector('.error-msg');
        if (errorMsg) errorMsg.textContent = 'This field is required';

        const fail = (msg) => {
          isValid = false;
          input.classList.add('error');
          formGroup.classList.add('has-error');
          if (msg && errorMsg) errorMsg.textContent = msg;
          if (!firstInvalid) firstInvalid = input;
        };

        if (input.type === 'checkbox') {
          if (!input.checked) {
            isValid = false;
            formGroup.classList.add('has-error');
            if (errorMsg) errorMsg.textContent = 'You must accept the terms';
            if (!firstInvalid) firstInvalid = input;
          }
        } else if (!input.value.trim()) {
          fail();
        } else if (input.type === 'email' && !validateEmail(input.value)) {
          fail('Please enter a valid email address');
        // Not `type === 'password'`: revealing a field flips it to `text`, and
        // that must not quietly skip the length rule.
        } else if ((input.type === 'password' || input.closest('.password-field')) && input.value.length < 8) {
          fail('Password must be at least 8 characters');
        } else if (input.name === 'confirm_password') {
          const pwd = form.querySelector('input[name="password"]');
          if (pwd && pwd.value !== input.value) {
            fail('Passwords do not match');
          } else {
            input.classList.add('success');
          }
        } else {
          input.classList.add('success');
        }
      });

      e.preventDefault();

      if (!isValid) {
        if (firstInvalid) firstInvalid.focus();
        toast('Please check the highlighted fields', 'ph-warning-circle');
        return;
      }

      toast('Thank you — we’ll be in touch shortly', 'ph-check-circle');
      form.reset();
      form.querySelectorAll('.form-control').forEach(el => el.classList.remove('success', 'error'));
    });
  });

});
