/* ==========================================================================
   AURA — Shopping bag
   Front-end demo only: state lives in localStorage, nothing is ever posted.
   The drawer markup is injected here rather than pasted into every page, so
   the eight pages that carry the bag icon can never drift out of sync.
   ========================================================================== */
(function () {

  const STORAGE_KEY = 'aura:bag:v1';
  const SEEDED_KEY = 'aura:bag:seeded';
  const FREE_SHIPPING = 200;
  const SIZES = ['XS', 'S', 'M', 'L', 'XL'];

  /* The bag a first-time visitor lands on — the client asked for a checkout
     that demos with real line items, so we prefill once and never again. */
  const SAMPLE_BAG = [
    {
      id: 'rose-soy-candle',
      title: 'Hand-Poured Rose Soy Candle',
      category: 'Candle Favors',
      price: 4.50,
      compareAt: 6.00,
      image: 'https://images.unsplash.com/photo-1603006905003-be475563bc59?auto=format&fit=crop&w=400&q=80',
      size: '4 oz',
      qty: 50
    },
    {
      id: 'wildflower-honey-jar',
      title: 'Wildflower Honey Jar & Dipper',
      category: 'Gourmet Favors',
      price: 5.20,
      compareAt: null,
      image: 'https://images.unsplash.com/photo-1587049352847-4a222e784d38?auto=format&fit=crop&w=400&q=80',
      size: '2 oz',
      qty: 50
    },
    {
      id: 'engraved-coaster-pair',
      title: 'Laser-Engraved Monogram Coasters',
      category: 'Keepsakes',
      price: 7.80,
      compareAt: null,
      image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&w=400&q=80',
      size: 'Pair',
      qty: 25
    }
  ];

  /* ------------------------------------------------------------------------
     State
     ------------------------------------------------------------------------ */
  let items = [];

  const read = () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw !== null) return JSON.parse(raw) || [];
      // First visit in this browser — seed the demo bag once.
      if (!localStorage.getItem(SEEDED_KEY)) {
        localStorage.setItem(SEEDED_KEY, '1');
        return SAMPLE_BAG.map(item => Object.assign({}, item));
      }
      return [];
    } catch (err) {
      return [];
    }
  };

  const persist = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch (err) { /* private mode — the bag simply won't survive reload */ }
  };

  items = read();
  // The seeded bag must hit storage straight away, or the next page load sees
  // the seeded flag with nothing behind it and the bag comes back empty.
  persist();

  const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
  const count = () => items.reduce((sum, i) => sum + i.qty, 0);
  const subtotal = () => items.reduce((sum, i) => sum + i.price * i.qty, 0);
  const savings = () => items.reduce(
    (sum, i) => sum + (i.compareAt ? (i.compareAt - i.price) * i.qty : 0), 0
  );

  const toast = (msg, icon) => {
    if (window.Aura && typeof window.Aura.toast === 'function') window.Aura.toast(msg, icon);
  };

  /* A line is identified by product + size: two sizes of one piece are two lines. */
  const lineKey = (item) => item.id + '::' + item.size;

  const add = (product) => {
    const existing = items.find(i => lineKey(i) === lineKey(product));
    if (existing) {
      existing.qty += product.qty || 1;
    } else {
      items.push(Object.assign({ qty: 1 }, product));
    }
    persist();
    render();
  };

  const setQty = (key, qty) => {
    const item = items.find(i => lineKey(i) === key);
    if (!item) return;
    if (qty <= 0) {
      items = items.filter(i => lineKey(i) !== key);
      toast(item.title + ' removed from your bag', 'ph-trash');
    } else {
      item.qty = Math.min(qty, 10);
    }
    persist();
    render();
  };

  const setSize = (key, size) => {
    const item = items.find(i => lineKey(i) === key);
    if (!item) return;
    item.size = size;
    // Changing size may collide with an existing line — merge them.
    const twin = items.find(i => i !== item && lineKey(i) === lineKey(item));
    if (twin) {
      twin.qty += item.qty;
      items = items.filter(i => i !== item);
    }
    persist();
    render();
  };

  const remove = (key) => setQty(key, 0);

  const clear = () => {
    items = [];
    persist();
    render();
  };

  /* ------------------------------------------------------------------------
     Drawer markup — injected once per page
     ------------------------------------------------------------------------ */
  const drawerHTML = `
    <div class="cart-overlay"></div>
    <aside class="cart-drawer" aria-label="Shopping bag" aria-hidden="true">
      <header class="cart-head">
        <div>
          <span class="eyebrow no-rule">Your Selection</span>
          <h3 class="cart-title">The Bag</h3>
        </div>
        <button class="cart-close" aria-label="Close bag"><i class="ph ph-x"></i></button>
      </header>

      <div class="ship-meter">
        <p class="ship-copy"></p>
        <span class="ship-track"><span class="ship-fill"></span></span>
      </div>

      <div class="cart-items"></div>

      <div class="cart-empty" hidden>
        <i class="ph ph-handbag-simple"></i>
        <h4>Your bag is empty</h4>
        <p>Nothing chosen yet — the new season is waiting.</p>
        <a href="shop.html" class="btn btn-outline btn-sm">Browse the Collection</a>
      </div>

      <footer class="cart-foot">
        <div class="cart-line saved" hidden><span>You save</span><span class="cart-saved-val"></span></div>
        <div class="cart-line"><span>Shipping</span><span class="cart-ship-val">Calculated at checkout</span></div>
        <div class="cart-line total"><span>Subtotal</span><strong class="cart-subtotal">$0</strong></div>
        <p class="cart-note">Taxes calculated at checkout · Complimentary alterations</p>
        <a href="checkout.html" class="btn btn-primary btn-full cart-checkout">Proceed to Checkout</a>
        <button class="cart-continue" type="button">Continue shopping</button>
      </footer>
    </aside>
  `;

  let overlay, drawer, itemsEl, emptyEl, footEl;

  const mount = () => {
    const host = document.createElement('div');
    host.innerHTML = drawerHTML;
    while (host.firstElementChild) document.body.appendChild(host.firstElementChild);

    overlay = document.querySelector('.cart-overlay');
    drawer = document.querySelector('.cart-drawer');
    itemsEl = drawer.querySelector('.cart-items');
    emptyEl = drawer.querySelector('.cart-empty');
    footEl = drawer.querySelector('.cart-foot');

    drawer.querySelector('.cart-close').addEventListener('click', close);
    drawer.querySelector('.cart-continue').addEventListener('click', close);
    overlay.addEventListener('click', close);

    // One delegated listener covers every line, before and after re-render.
    itemsEl.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-act]');
      if (!btn) return;
      const key = btn.closest('.cart-item').dataset.key;
      const act = btn.dataset.act;
      if (act === 'remove') return remove(key);
      const item = items.find(i => lineKey(i) === key);
      if (!item) return;
      setQty(key, item.qty + (act === 'inc' ? 1 : -1));
    });

    itemsEl.addEventListener('change', (e) => {
      const select = e.target.closest('.cart-size select');
      if (!select) return;
      setSize(select.closest('.cart-item').dataset.key, select.value);
    });
  };

  const isOpen = () => drawer && drawer.classList.contains('open');
  let lastFocused = null;

  const open = () => {
    if (!drawer) return;
    lastFocused = document.activeElement;
    drawer.classList.add('open');
    drawer.setAttribute('aria-hidden', 'false');
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    drawer.querySelector('.cart-close').focus();
  };

  const close = () => {
    if (!drawer) return;
    drawer.classList.remove('open');
    drawer.setAttribute('aria-hidden', 'true');
    overlay.classList.remove('open');
    document.body.style.overflow = '';
    if (lastFocused) lastFocused.focus();
  };

  /* ------------------------------------------------------------------------
     Render
     ------------------------------------------------------------------------ */
  const lineHTML = (item) => {
    const key = lineKey(item);
    const options = SIZES.map(s =>
      `<option value="${s}"${s === item.size ? ' selected' : ''}>${s}</option>`
    ).join('');
    const price = item.compareAt
      ? `<span class="price-original">${money(item.compareAt)}</span> <span class="price-sale">${money(item.price)}</span>`
      : money(item.price);

    return `
      <article class="cart-item" data-key="${key}">
        <a href="shop.html" class="cart-thumb">
          <img src="${item.image}" alt="${item.title}" loading="lazy">
        </a>
        <div class="cart-item-body">
          <span class="product-category">${item.category}</span>
          <h4>${item.title}</h4>
          <div class="price">${price}</div>
          <div class="cart-item-foot">
            <label class="cart-size">Size
              <select aria-label="Size for ${item.title}">${options}</select>
            </label>
            <div class="qty">
              <button type="button" data-act="dec" aria-label="Decrease quantity">&minus;</button>
              <span>${item.qty}</span>
              <button type="button" data-act="inc" aria-label="Increase quantity">+</button>
            </div>
          </div>
        </div>
        <button type="button" class="cart-remove" data-act="remove" aria-label="Remove ${item.title}">
          <i class="ph ph-x"></i>
        </button>
      </article>
    `;
  };

  const renderDrawer = () => {
    if (!drawer) return;
    const total = subtotal();
    const saved = savings();
    const empty = items.length === 0;

    drawer.querySelector('.cart-title').textContent = empty
      ? 'The Bag'
      : count() + (count() === 1 ? ' Piece' : ' Pieces');

    itemsEl.innerHTML = items.map(lineHTML).join('');
    itemsEl.hidden = empty;
    emptyEl.hidden = !empty;
    footEl.hidden = empty;

    drawer.querySelector('.cart-subtotal').textContent = money(total);

    const savedLine = drawer.querySelector('.cart-line.saved');
    savedLine.hidden = saved <= 0;
    drawer.querySelector('.cart-saved-val').textContent = '−' + money(saved);

    const remaining = FREE_SHIPPING - total;
    const meter = drawer.querySelector('.ship-meter');
    meter.hidden = empty;
    drawer.querySelector('.ship-copy').innerHTML = remaining > 0
      ? `Spend <strong>${money(remaining)}</strong> more for complimentary shipping`
      : 'Complimentary shipping unlocked';
    drawer.querySelector('.ship-fill').style.width =
      Math.min(100, (total / FREE_SHIPPING) * 100) + '%';
    drawer.querySelector('.cart-ship-val').textContent =
      remaining > 0 ? 'Calculated at checkout' : 'Complimentary';
  };

  const renderBadges = () => {
    const n = count();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = n;
      el.classList.toggle('is-empty', n === 0);
    });
  };

  const render = () => {
    renderBadges();
    renderDrawer();
    // Lets checkout.js re-render its summary off the same source of truth.
    document.dispatchEvent(new CustomEvent('aura:bagchange', { detail: { items: items } }));
  };

  /* ------------------------------------------------------------------------
     Reading a product off a card in the page
     ------------------------------------------------------------------------ */
  const slug = (text) => text.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const parseMoney = (text) => Number(String(text).replace(/[^0-9.]/g, '')) || 0;

  const productFromCard = (card) => {
    const title = (card.querySelector('.product-title')?.textContent || 'Item').trim();
    const priceEl = card.querySelector('.price');
    const saleEl = card.querySelector('.price-sale');
    const compareEl = card.querySelector('.price-original');

    return {
      id: card.dataset.sku || slug(title),
      title: title,
      category: (card.querySelector('.product-category')?.textContent || 'Aura').trim(),
      price: parseMoney(saleEl ? saleEl.textContent : (priceEl ? priceEl.textContent : 0)),
      compareAt: compareEl ? parseMoney(compareEl.textContent) : null,
      image: card.querySelector('.card-img-wrapper img')?.src || '',
      size: card.dataset.defaultSize || 'M',
      qty: 1
    };
  };

  /* ------------------------------------------------------------------------
     Wire up
     ------------------------------------------------------------------------ */
  document.addEventListener('DOMContentLoaded', () => {
    mount();

    document.querySelectorAll('.cart-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        open();
      });
    });

    document.querySelectorAll('.quick-add-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const card = btn.closest('.product-card');
        if (!card) return;

        add(productFromCard(card));

        const original = btn.dataset.label || btn.textContent;
        btn.dataset.label = original;
        btn.textContent = 'Added';
        btn.classList.add('added');
        setTimeout(() => {
          btn.textContent = original;
          btn.classList.remove('added');
        }, 1600);

        toast(card.querySelector('.product-title')?.textContent.trim() + ' added to your bag',
              'ph-handbag-simple');
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) close();
    });

    // Trap focus inside the drawer while it is open.
    drawer.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !isOpen()) return;
      const focusable = drawer.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
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

    render();
  });

  /* Public surface — checkout.js and any page script read the bag through this. */
  window.AuraCart = {
    items: () => items.map(i => Object.assign({}, i)),
    count: count,
    subtotal: subtotal,
    savings: savings,
    money: money,
    freeShippingThreshold: FREE_SHIPPING,
    add: add,
    remove: remove,
    setQty: setQty,
    clear: clear,
    open: open,
    close: close
  };

})();
