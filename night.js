/* Guru Status, "Night lobby" page script. The page reads fully without it. */
(function () {
  'use strict';

  // Leave empty until a real endpoint accepts leads. Empty = honest WhatsApp hand-off.
  var FORM_ENDPOINT = '';
  var WA_NUMBER = '995555500000';

  var dl = window.dataLayer = window.dataLayer || [];
  function push(ev, params) {
    var o = { event: ev };
    if (params) for (var k in params) o[k] = params[k];
    dl.push(o);
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var params;
  try { params = new URLSearchParams(location.search); } catch (e) { params = { get: function () { return null; } }; }

  /* CTA clicks */
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('[data-cta]');
    if (a) push('cta_click', { cta: a.getAttribute('data-cta'), cta_text: (a.textContent || '').trim().slice(0, 60) });
  });

  /* Header turns solid once you leave the hero top */
  var bar = document.getElementById('bar');
  function onScroll() { bar.classList.toggle('is-solid', window.scrollY > 40); }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* Hero video: only with motion allowed and no data saver; pause offscreen */
  var video = document.querySelector('.hero__video');
  var saveData = navigator.connection && navigator.connection.saveData;
  if (video && !reduce && !saveData) {
    video.src = video.getAttribute('data-src');
    video.addEventListener('playing', function () { video.classList.add('is-on'); });
    var p = video.play(); if (p && p.catch) p.catch(function () {});
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        en.forEach(function (x) { if (x.isIntersecting) { var q = video.play(); if (q && q.catch) q.catch(function () {}); } else video.pause(); });
      }).observe(video);
    }
  }

  /* The reveal: a hush, then the number rolls in like a lift floor display */
  var section = document.getElementById('price');
  var call = document.getElementById('call');
  var priceEl = document.getElementById('priceNum');
  var revealed = false, timer = null;
  var holdAuto = params.get('reveal') === '0';

  function buildRoll() {
    var textEl = priceEl.querySelector('.price__text');
    var str = textEl.textContent.trim();
    var fs = parseFloat(getComputedStyle(priceEl).fontSize) || 100;
    var roll = document.createElement('span');
    roll.className = 'price__roll'; roll.setAttribute('aria-hidden', 'true');
    var strips = [];
    var digitIndex = 0;
    for (var i = 0; i < str.length; i++) {
      var ch = str[i];
      // measure the final glyph so the settled number sets exactly like plain text
      var m = document.createElement('span'); m.textContent = ch; m.style.display = 'inline-block';
      priceEl.appendChild(m); var w = m.getBoundingClientRect().width / fs; priceEl.removeChild(m);
      var cell = document.createElement('span'); cell.className = 'price__ch'; cell.style.width = w.toFixed(3) + 'em';
      if (/\d/.test(ch)) {
        var target = +ch, strip = document.createElement('span'); strip.className = 'price__strip';
        var steps = 10 + target;
        for (var s = 0; s <= steps; s++) { var d = document.createElement('span'); d.textContent = s % 10; strip.appendChild(d); }
        strip.style.setProperty('--d', (1.25 + digitIndex * 0.2).toFixed(2) + 's');
        strip.setAttribute('data-to', steps);
        cell.appendChild(strip); strips.push(strip); digitIndex++;
      } else { cell.textContent = ch; }
      roll.appendChild(cell);
    }
    textEl.classList.add('sr');
    priceEl.appendChild(roll);
    void roll.offsetWidth;
    requestAnimationFrame(function () {
      strips.forEach(function (st) { st.style.transform = 'translateY(-' + st.getAttribute('data-to') + 'em)'; });
    });
  }

  function reveal(instant) {
    if (revealed || !section) return;
    revealed = true; clearTimeout(timer);
    if (instant || reduce) {
      section.classList.add('is-instant', 'is-hush', 'is-revealed');
      return;
    }
    call.classList.add('is-lit');
    setTimeout(function () { section.classList.add('is-hush'); }, 450);
    setTimeout(function () {
      var go = function () { buildRoll(); section.classList.add('is-revealed'); };
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(go, go); else go();
    }, 1800);
  }

  if (section && call && priceEl) {
    call.addEventListener('click', function () {
      push('cta_click', { cta: 'price_reveal_button', cta_text: 'Show the price' });
      reveal(false);
    });
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        en.forEach(function (x) {
          if (revealed) return;
          if (x.intersectionRatio >= 0.6) {
            if (!timer && !holdAuto) timer = setTimeout(function () { reveal(false); }, 2600);
          } else {
            clearTimeout(timer); timer = null;
            // scrolled past without stopping: show the answer, settled
            if (!x.isIntersecting && x.boundingClientRect.top < 0) reveal(true);
          }
        });
      }, { threshold: [0, 0.6] }).observe(section);
    } else { reveal(true); }
  }

  /* Form */
  var form = document.getElementById('leadForm');
  if (form) {
    var started = false;
    var startOnce = function () { if (!started) { started = true; push('form_start', { form: 'price_list' }); } };
    form.addEventListener('focusin', startOnce);
    form.addEventListener('input', startOnce);

    var err = document.getElementById('formError');
    var handoff = document.getElementById('handoff');
    var waLink = document.getElementById('waLink');
    var hTitle = document.getElementById('handoffTitle');
    var hText = document.getElementById('handoffText');

    function fail(input, msg) {
      input.setAttribute('aria-invalid', 'true');
      err.textContent = msg; err.hidden = false; input.focus();
    }

    function showHandoff(msgText, sent, phone) {
      waLink.href = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(msgText);
      if (sent) {
        hTitle.textContent = 'Thank you.';
        hText.textContent = 'The sales team will send the available apartments to ' + phone + ' on WhatsApp. If you would rather start the chat now, open WhatsApp below.';
        waLink.textContent = 'Message us on WhatsApp';
      } else {
        hTitle.textContent = 'One more step.';
        hText.textContent = 'Your request is written and waiting in WhatsApp. Press send there, and the sales team replies with the list.';
        waLink.textContent = 'Open WhatsApp';
      }
      handoff.hidden = false;
      handoff.focus({ preventScroll: true });
      handoff.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'center' });
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      err.hidden = true;
      var name = form.elements.name, phone = form.elements.phone;
      name.removeAttribute('aria-invalid'); phone.removeAttribute('aria-invalid');
      var nv = name.value.trim(), pv = phone.value.trim();
      if (!nv) return fail(name, 'Add your name, so the team knows who to write to.');
      if (pv.replace(/\D/g, '').length < 8) return fail(phone, 'Add your WhatsApp number with the country code, for example +995 555 12 34 56.');
      var typeInput = form.querySelector('input[name=type]:checked');
      var type = typeInput ? typeInput.value : 'Both';
      var msg = "Hello, I'd like the available apartments at Guru Status with floor plans and prices. " +
        'Name: ' + nv + '. WhatsApp: ' + pv + '. Interested in: ' + type + '.';
      var btn = form.querySelector('button[type=submit]');

      if (!FORM_ENDPOINT) {
        push('lead_preview', { form: 'price_list', apartment_type: type, reason: 'no_endpoint' });
        showHandoff(msg, false);
        return;
      }
      btn.disabled = true;
      fetch(FORM_ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: nv, phone: pv, apartment_type: type, page: location.href, source: 'guru-status-night' })
      }).then(function (r) {
        if (!r.ok) throw new Error('status ' + r.status);
        push('generate_lead', { form: 'price_list', apartment_type: type });
        showHandoff(msg, true, pv);
      }).catch(function () {
        push('lead_preview', { form: 'price_list', apartment_type: type, reason: 'endpoint_error' });
        showHandoff(msg, false);
      }).then(function () { btn.disabled = false; });
    });
  }

  /* Screenshot helpers: ?reveal=1 settles the price, ?shot=<id> jumps to a section */
  if (params.get('reveal') === '1') reveal(true);
  if (params.get('reveal') === 'go') reveal(false);
  var shot = params.get('shot');
  if (shot) {
    // headless screenshots ignore scroll, so hide everything above the target instead
    var target = document.getElementById(shot);
    if (target) {
      var n = target.previousElementSibling;
      while (n) { n.style.display = 'none'; n = n.previousElementSibling; }
      var off = +params.get('off') || 0;
      if (off) target.style.marginTop = (-off) + 'px';
      bar.classList.add('is-solid');
    }
  }
})();
