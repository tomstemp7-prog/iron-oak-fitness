/* ============================================
   IRON & OAK FITNESS — main.js
   ============================================ */

(function () {
  'use strict';

  /* ---------- Nav scroll behaviour ---------- */
  const nav = document.querySelector('.nav');
  if (nav) {
    const onScroll = () => {
      nav.classList.toggle('scrolled', window.scrollY > 20);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Mobile hamburger ---------- */
  const hamburger  = document.querySelector('.hamburger');
  const mobileMenu = document.querySelector('.mobile-menu');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      const isOpen = hamburger.classList.toggle('open');
      mobileMenu.classList.toggle('open', isOpen);
      hamburger.setAttribute('aria-expanded', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      });
    });

    document.addEventListener('click', (e) => {
      if (nav && !nav.contains(e.target) && !mobileMenu.contains(e.target)) {
        hamburger.classList.remove('open');
        mobileMenu.classList.remove('open');
        hamburger.setAttribute('aria-expanded', 'false');
        document.body.style.overflow = '';
      }
    });
  }

  /* ---------- Active nav link ---------- */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .mobile-menu a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  /* ---------- Pricing toggle ---------- */
  const pricingToggle = document.getElementById('pricingToggle');
  if (pricingToggle) {
    const monthly = {
      basic:   { price: '25',    sub: '',                         saving: '' },
      plus:    { price: '40',    sub: '',                         saving: '' },
      premium: { price: '55',    sub: '',                         saving: '' },
    };
    const annual = {
      basic:   { price: '20.83', sub: '£250/yr billed annually',  saving: 'Save £50/year' },
      plus:    { price: '33.33', sub: '£400/yr billed annually',  saving: 'Save £80/year' },
      premium: { price: '45.83', sub: '£550/yr billed annually',  saving: 'Save £110/year' },
    };

    const labelMonthly = document.getElementById('labelMonthly');
    const labelAnnual  = document.getElementById('labelAnnual');

    const applyPricing = (isAnnual) => {
      const data = isAnnual ? annual : monthly;
      ['basic', 'plus', 'premium'].forEach(plan => {
        const amountEl = document.querySelector(`[data-plan="${plan}"] .amount`);
        const subEl    = document.querySelector(`[data-plan="${plan}"] .plan-annual-info`);
        const saveEl   = document.querySelector(`[data-plan="${plan}"] .savings-badge`);
        if (amountEl) amountEl.textContent = data[plan].price;
        if (subEl)    subEl.textContent    = data[plan].sub;
        if (saveEl)   saveEl.textContent   = data[plan].saving;
      });
      if (labelMonthly) labelMonthly.classList.toggle('active', !isAnnual);
      if (labelAnnual)  labelAnnual.classList.toggle('active', isAnnual);
    };

    pricingToggle.addEventListener('change', () => applyPricing(pricingToggle.checked));
    applyPricing(false);
  }

  /* ---------- FAQ accordion ---------- */
  document.querySelectorAll('.faq-item').forEach(item => {
    const btn    = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');
    if (!btn || !answer) return;

    btn.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(openItem => {
        openItem.classList.remove('open');
        openItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
      });
      if (!isOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  /* ---------- Contact form ---------- */
  const contactForm = document.getElementById('contactForm');
  if (contactForm) {
    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const submitBtn = contactForm.querySelector('[type="submit"]');
      const success   = document.getElementById('formSuccess');

      submitBtn.textContent = 'Sending…';
      submitBtn.disabled    = true;

      setTimeout(() => {
        contactForm.reset();
        submitBtn.textContent = 'Message Sent!';
        if (success) {
          success.classList.add('show');
          success.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
        setTimeout(() => {
          submitBtn.textContent = 'Send Message';
          submitBtn.disabled    = false;
          if (success) success.classList.remove('show');
        }, 5000);
      }, 900);
    });
  }

  /* ---------- Smooth scroll for anchor links ---------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', (e) => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const navH = parseInt(getComputedStyle(document.documentElement)
          .getPropertyValue('--nav-h')) || 70;
        const top = target.getBoundingClientRect().top + window.scrollY - navH;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

})();
