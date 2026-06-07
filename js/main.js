/* =========================================
   IRON & OAK — MAIN.JS
   ========================================= */

document.addEventListener('DOMContentLoaded', function () {

  /* -----------------------------------------
     NAV SCROLL BEHAVIOUR
  ----------------------------------------- */
  const nav = document.querySelector('.nav');
  if (nav) {
    const handleScroll = () => {
      if (window.scrollY > 60) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
  }

  /* -----------------------------------------
     HAMBURGER / MOBILE MENU
  ----------------------------------------- */
  const hamburger = document.querySelector('.nav-hamburger');
  const mobileMenu = document.querySelector('.nav-mobile-menu');
  const mobileClose = document.querySelector('.nav-mobile-close');

  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', () => {
      mobileMenu.classList.add('open');
      document.body.style.overflow = 'hidden';
    });

    const closeMenu = () => {
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
    };

    if (mobileClose) mobileClose.addEventListener('click', closeMenu);

    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeMenu();
    });
  }

  /* -----------------------------------------
     INTERSECTION OBSERVER — FADE IN UP
  ----------------------------------------- */
  const fadeEls = document.querySelectorAll('.fade-in-up');
  if (fadeEls.length > 0) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    fadeEls.forEach(el => observer.observe(el));
  }

  /* -----------------------------------------
     PRICING TOGGLE (monthly / annual)
  ----------------------------------------- */
  const billingToggle = document.getElementById('billingToggle');
  const priceAmounts = document.querySelectorAll('.price-amount');
  const toggleLabelMonthly = document.getElementById('toggleLabelMonthly');
  const toggleLabelAnnual = document.getElementById('toggleLabelAnnual');

  if (billingToggle) {
    const updatePrices = () => {
      const isAnnual = billingToggle.checked;
      priceAmounts.forEach(span => {
        const monthly = span.dataset.monthly;
        const annual = span.dataset.annual;
        if (monthly !== undefined && annual !== undefined) {
          span.textContent = isAnnual ? annual : monthly;
        }
      });

      document.querySelectorAll('.price-period').forEach(el => {
        el.textContent = isAnnual ? '/mo (billed annually)' : '/month';
      });

      if (toggleLabelMonthly && toggleLabelAnnual) {
        if (isAnnual) {
          toggleLabelMonthly.classList.remove('active');
          toggleLabelAnnual.classList.add('active');
        } else {
          toggleLabelMonthly.classList.add('active');
          toggleLabelAnnual.classList.remove('active');
        }
      }
    };

    billingToggle.addEventListener('change', updatePrices);
    updatePrices();
  }

  /* -----------------------------------------
     FAQ ACCORDION
  ----------------------------------------- */
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const question = item.querySelector('.faq-question');
    if (!question) return;

    question.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');

      const parentList = item.closest('.faq-list');
      if (parentList) {
        parentList.querySelectorAll('.faq-item.open').forEach(openItem => {
          if (openItem !== item) openItem.classList.remove('open');
        });
      }

      item.classList.toggle('open', !isOpen);
    });
  });

  /* -----------------------------------------
     ACTIVE NAV LINK
  ----------------------------------------- */
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a, .nav-mobile-menu a').forEach(link => {
    const linkPath = link.getAttribute('href') || '';
    const linkFile = linkPath.split('/').pop();
    if (
      linkFile === currentPath ||
      (currentPath === '' && linkFile === 'index.html') ||
      (currentPath === 'index.html' && linkFile === 'index.html')
    ) {
      link.classList.add('active');
    }
  });

  /* -----------------------------------------
     TIMETABLE FILTER (classes page)
  ----------------------------------------- */
  const filterBtns = document.querySelectorAll('.filter-btn');
  const timetableCells = document.querySelectorAll('.timetable-cell');

  if (filterBtns.length > 0) {
    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const category = btn.dataset.filter;

        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        timetableCells.forEach(cell => {
          if (category === 'All' || cell.dataset.category === category) {
            cell.classList.remove('hidden');
          } else {
            cell.classList.add('hidden');
          }
        });
      });
    });
  }

  /* -----------------------------------------
     SMOOTH SCROLL — ANCHOR LINKS
  ----------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const targetId = this.getAttribute('href');
      if (targetId === '#') return;
      const target = document.querySelector(targetId);
      if (target) {
        e.preventDefault();
        const offset = 90;
        const top = target.getBoundingClientRect().top + window.scrollY - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });

  /* -----------------------------------------
     COUNTER ANIMATION
  ----------------------------------------- */
  const statNumbers = document.querySelectorAll('.stat-number[data-count]');
  if (statNumbers.length > 0) {
    const countObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            countObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    statNumbers.forEach(el => countObserver.observe(el));
  }

  function animateCounter(el) {
    const target = parseInt(el.dataset.count, 10);
    const suffix = el.dataset.suffix || '';
    const duration = 1800;
    const start = performance.now();

    const update = (time) => {
      const elapsed = time - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);
      el.textContent = current + suffix;
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }

  /* -----------------------------------------
     CONTACT FORM — SUCCESS STATE
  ----------------------------------------- */
  const contactForm = document.getElementById('contactForm');
  const formSuccess = document.getElementById('formSuccess');

  if (contactForm && formSuccess) {
    contactForm.addEventListener('submit', function (e) {
      e.preventDefault();
      contactForm.style.display = 'none';
      formSuccess.classList.add('visible');
      window.scrollTo({ top: formSuccess.offsetTop - 120, behavior: 'smooth' });
    });
  }

});
