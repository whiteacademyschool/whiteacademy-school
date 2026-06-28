import '../css/styles.css';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 1.15,
  smoothWheel: true,
  lerp: 0.08,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

gsap.to('.reveal', {
  opacity: 1,
  y: 0,
  duration: 0.9,
  ease: 'power3.out',
  stagger: 0.08,
  scrollTrigger: {
    trigger: 'body',
    start: 'top 85%',
  },
});

document.querySelectorAll('.section .reveal').forEach((element) => {
  gsap.to(element, {
    opacity: 1,
    y: 0,
    duration: 0.9,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: element,
      start: 'top 86%',
    },
  });
});

gsap.to('.main-card', {
  y: -18,
  duration: 3,
  repeat: -1,
  yoyo: true,
  ease: 'sine.inOut',
});

gsap.to('.card-a', {
  y: 18,
  duration: 3.4,
  repeat: -1,
  yoyo: true,
  ease: 'sine.inOut',
});

gsap.to('.card-b', {
  y: -14,
  duration: 3.1,
  repeat: -1,
  yoyo: true,
  ease: 'sine.inOut',
});

const header = document.querySelector('[data-header]');

window.addEventListener('scroll', () => {
  header.classList.toggle('is-scrolled', window.scrollY > 24);
});
