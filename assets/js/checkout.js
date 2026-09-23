/* ==========================================================================
   AURA — Checkout (mock)
   Renders the order summary from the bag, validates the form client-side and
   swaps in a confirmation panel. No network call is ever made.
   ========================================================================== */
document.addEventListener('DOMContentLoaded', () => {

  const page = document.querySelector('.checkout-page');
  if (!page || !window.AuraCart) return;

  const money = window.AuraCart.money;
  const TAX_RATE = 0.08;

  const PROMOS = {
    AURA20: { type: 'percent', value: 0.20, label: '20% seasonal event' },
    WELCOME10: { type: 'percent', value: 0.10, label: '10% first order' },
    FREESHIP: { type: 'shipping', value: 0, label: 'Complimentary express' }
  };

  let promo = null;

  const els = {
    items: page.querySelector('.summary-items'),
    subtotal: page.querySelector('[data-total="subtotal"]'),
    discountLine: page.querySelector('.summary-line.discount'),
    discount: page.querySelector('[data-total="discount"]'),
    shipping: page.querySelector('[data-total="shipping"]'),
    tax: page.querySelector('[data-total="tax"]'),
    grand: page.querySelector('[data-total="grand"]'),
    itemCount: page.querySelector('.summary-count'),
    promoInput: page.querySelector('.promo-input'),
    promoMsg: page.querySelector('.promo-msg'),
    form: page.querySelector('.checkout-form'),
    submitBtn: page.querySelector('.place-order')
  };

  const shippingCost = () => {
    const selected = page.querySelector('input[name="delivery"]:checked');
    const base = selected ? Number(selected.dataset.cost || 0) : 0;
    if (promo && PROMOS[promo].type === 'shipping') return 0;
    // Standard delivery is complimentary once the bag clears the threshold.
    if (base > 0 && selected.value === 'standard' &&
        window.AuraCart.subtotal() >= window.AuraCart.freeShippingThreshold) return 0;
    return base;
  };

  const discountAmount = () => {
    if (!promo) return 0;
    const rule = PROMOS[promo];
    if (rule.type !== 'percent') return 0;
    return window.AuraCart.subtotal() * rule.value;
  };

  const summaryItemHTML = (item) => `
    <div class="summary-item">
      <img src="${item.image}" alt="${item.title}" loading="lazy">
      <div>
        <h4>${item.title}</h4>
        <span class="meta">Size ${item.size} · Qty ${item.qty}</span>
      </div>
      <span class="line-total">${money(item.price * item.qty)}</span>
    </div>
  `;

  const render = () => {
    const items = window.AuraCart.items();
    const sub = window.AuraCart.subtotal();
    const ship = shippingCost();
    const disc = discountAmount();
    const tax = Math.max(0, sub - disc) * TAX_RATE;
    const grand = Math.max(0, sub - disc) + ship + tax;
    const n = window.AuraCart.count();

    els.items.innerHTML = items.length
      ? items.map(summaryItemHTML).join('')
      : '<p class="cart-note">Your bag is empty — <a href="shop.html" class="link-underline">browse the collection</a>.</p>';

    if (els.itemCount) els.itemCount.textContent = n + (n === 1 ? ' item' : ' items');

    els.subtotal.textContent = money(sub);
    els.shipping.textContent = ship === 0 ? 'Complimentary' : money(ship);
    els.tax.textContent = money(tax);
    els.grand.textContent = money(grand);

    els.discountLine.hidden = disc <= 0;
    els.discount.textContent = '−' + money(disc);

    if (els.submitBtn) {
      els.submitBtn.disabled = items.length === 0;
      els.submitBtn.textContent = items.length === 0
        ? 'Your Bag Is Empty'
        : 'Place Order · ' + money(grand);
    }
  };

  /* Delivery choice changes shipping and therefore tax-inclusive totals. */
  page.querySelectorAll('input[name="delivery"]').forEach(input => {
    input.addEventListener('change', render);
  });

  /* Promo code -------------------------------------------------------------- */
  const promoForm = page.querySelector('.promo-form');
  if (promoForm) {
    promoForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const code = (els.promoInput.value || '').trim().toUpperCase();

      if (!code) {
        els.promoMsg.textContent = 'Enter a code to apply.';
        els.promoMsg.className = 'promo-msg bad';
        return;
      }
      if (!PROMOS[code]) {
        promo = null;
        els.promoMsg.textContent = `“${code}” is not a valid code.`;
        els.promoMsg.className = 'promo-msg bad';
        render();
        return;
      }

      promo = code;
      els.promoMsg.textContent = `${code} applied — ${PROMOS[code].label}.`;
      els.promoMsg.className = 'promo-msg ok';
      render();
    });
  }

  /* A code arriving from the shop banner's "copy" link applies itself. */
  const preset = new URLSearchParams(window.location.search).get('promo');
  if (preset && PROMOS[preset.toUpperCase()]) {
    promo = preset.toUpperCase();
    if (els.promoInput) els.promoInput.value = promo;
    if (els.promoMsg) {
      els.promoMsg.textContent = `${promo} applied — ${PROMOS[promo].label}.`;
      els.promoMsg.className = 'promo-msg ok';
    }
  }

  /* Validation + confirmation ---------------------------------------------- */
  const fieldError = (input, message) => {
    const group = input.closest('.form-group') || input.parentElement;
    group.classList.add('has-error');
    input.classList.add('error');
    const msg = group.querySelector('.error-msg');
    if (msg) msg.textContent = message;
  };

  const clearError = (input) => {
    const group = input.closest('.form-group') || input.parentElement;
    group.classList.remove('has-error');
    input.classList.remove('error');
  };

  const digits = (value) => value.replace(/\D/g, '');

  const validate = () => {
    let ok = true;
    let firstBad = null;

    els.form.querySelectorAll('input[required], select[required]').forEach(input => {
      clearError(input);
      const value = input.value.trim();
      const fail = (msg) => {
        ok = false;
        fieldError(input, msg);
        if (!firstBad) firstBad = input;
      };

      if (input.type === 'checkbox') {
        if (!input.checked) fail('Please accept to continue');
        return;
      }
      if (!value) return fail('This field is required');

      if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(value)) {
        fail('Please enter a valid email address');
      } else if (input.name === 'card' && digits(value).length < 15) {
        fail('Enter a 16-digit card number');
      } else if (input.name === 'expiry' && !/^(0[1-9]|1[0-2])\s*\/\s*\d{2}$/.test(value)) {
        fail('Use MM/YY');
      } else if (input.name === 'cvc' && digits(value).length < 3) {
        fail('3 or 4 digits');
      } else if (input.name === 'postcode' && value.length < 3) {
        fail('Enter a valid postcode');
      }
    });

    return { ok, firstBad };
  };

  /* Light input masking so the mock card fields feel real */
  const cardInput = els.form?.querySelector('input[name="card"]');
  if (cardInput) {
    cardInput.addEventListener('input', () => {
      const grouped = digits(cardInput.value).slice(0, 16).match(/.{1,4}/g);
      cardInput.value = grouped ? grouped.join(' ') : '';
    });
  }

  const expiryInput = els.form?.querySelector('input[name="expiry"]');
  if (expiryInput) {
    expiryInput.addEventListener('input', () => {
      const d = digits(expiryInput.value).slice(0, 4);
      expiryInput.value = d.length > 2 ? d.slice(0, 2) + ' / ' + d.slice(2) : d;
    });
  }

  const orderNumber = () =>
    'AUR-' + String(Math.floor(100000 + Math.random() * 899999));

  const deliveryWindow = () => {
    const selected = page.querySelector('input[name="delivery"]:checked');
    const days = selected ? Number(selected.dataset.days || 5) : 5;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  };

  if (els.form) {
    els.form.addEventListener('submit', (e) => {
      e.preventDefault();

      if (window.AuraCart.count() === 0) return;

      const { ok, firstBad } = validate();
      if (!ok) {
        if (firstBad) {
          firstBad.focus();
          firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
        if (window.Aura) window.Aura.toast('Please check the highlighted fields', 'ph-warning-circle');
        return;
      }

      const email = els.form.querySelector('input[name="email"]').value.trim();
      const total = els.grand.textContent;
      const ref = orderNumber();
      const eta = deliveryWindow();

      const main = page.querySelector('.checkout-main');
      main.innerHTML = `
        <div class="confirmation">
          <div class="check"><i class="ph ph-check"></i></div>
          <span class="eyebrow centered">Order Confirmed</span>
          <h2>Thank you — your pieces are on their way.</h2>
          <p class="subtext">A confirmation has been sent to ${email}. Our client care team
            will be in touch should anything need your attention.</p>
          <div class="order-meta">
            <div><span>Order</span><strong>${ref}</strong></div>
            <div><span>Total</span><strong>${total}</strong></div>
            <div><span>Arriving by</span><strong>${eta}</strong></div>
          </div>
          <div class="hero-actions" style="justify-content:center">
            <a href="shop.html" class="btn btn-primary">Continue Shopping</a>
            <a href="contact.html" class="btn btn-outline">Client Care</a>
          </div>
          <p class="cart-note" style="margin-top:var(--space-6)">
            This is a demonstration checkout — no payment was taken and no order was placed.
          </p>
        </div>
      `;

      // Steps indicator catches up, the summary locks, the bag empties.
      page.querySelectorAll('.checkout-steps li').forEach(li => {
        li.classList.remove('active');
        li.classList.add('done');
      });
      const summary = page.querySelector('.summary');
      if (summary) summary.hidden = true;
      page.querySelector('.checkout-grid').classList.add('is-complete');

      window.AuraCart.clear();
      if (window.Aura) window.Aura.toast('Order ' + ref + ' confirmed', 'ph-check-circle');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  // Editing the bag from the drawer while on this page keeps the summary honest.
  document.addEventListener('aura:bagchange', render);
  render();

});
