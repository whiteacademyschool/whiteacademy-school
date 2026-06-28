import '../css/styles.css';
import Lenis from '@studio-freight/lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

const lenis = new Lenis({
  duration: 1.1,
  smoothWheel: true,
  lerp: 0.08,
});

function raf(time) {
  lenis.raf(time);
  requestAnimationFrame(raf);
}

requestAnimationFrame(raf);

document.querySelectorAll('section, .strip-card, .resource-grid article, .activity-grid article, .testimonial-grid article').forEach((el) => {
  el.classList.add('reveal');
});

gsap.utils.toArray('.reveal').forEach((el) => {
  gsap.to(el, {
    opacity: 1,
    y: 0,
    duration: 0.85,
    ease: 'power3.out',
    scrollTrigger: {
      trigger: el,
      start: 'top 86%',
    },
  });
});

gsap.to('.kid-one', {
  y: -18,
  rotate: -2,
  duration: 3,
  repeat: -1,
  yoyo: true,
  ease: 'sine.inOut',
});

gsap.to('.kid-two', {
  y: 18,
  rotate: 2,
  duration: 3.4,
  repeat: -1,
  yoyo: true,
  ease: 'sine.inOut',
});

gsap.to('.float-card', {
  y: -14,
  duration: 2.8,
  repeat: -1,
  yoyo: true,
  stagger: .4,
  ease: 'sine.inOut',
});
