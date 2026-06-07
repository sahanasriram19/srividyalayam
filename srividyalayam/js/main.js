// =============================================
//  SRIVIDYALAYAM — Shared JS
// =============================================

document.addEventListener('DOMContentLoaded', () => {

  // --- Active nav link based on current page ---
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-links a').forEach(link => {
    if (link.classList.contains('nav-cta')) return; // skip the enrol button
    const href = link.getAttribute('href').split('#')[0]; // strip any #anchor
    if (href === currentPage || (currentPage === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });

  // --- Cross-page anchor scroll (e.g. classes.html#enrol) ---
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }

  // --- Mobile hamburger toggle ---
  const hamburger = document.querySelector('.nav-hamburger');
  const navLinks  = document.querySelector('.nav-links');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    // Close on link click
    navLinks.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  // --- Scroll-reveal (lightweight, no library needed) ---
  const revealEls = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach(el => observer.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('visible'));
  }

});

// --- Gallery carousel ---
const slides = document.querySelectorAll('.gallery-slide');
const dots   = document.querySelectorAll('.gallery-dot');
if (slides.length) {
  let current = 0;

  function goToSlide(n) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (n + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  // Auto-advance every 3 seconds
  setInterval(() => goToSlide(current + 1), 3000);

  // Click dots to jump to slide
  dots.forEach((dot, i) => {
    dot.addEventListener('click', () => goToSlide(i));
  });
}