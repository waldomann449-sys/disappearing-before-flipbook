'use strict';

const bookElement = document.querySelector('#book');
const pages = bookElement.querySelectorAll('.book-page');
const rig = document.querySelector('.book-rig');
const previousButton = document.querySelector('#previous');
const nextButton = document.querySelector('#next');
const autoButton = document.querySelector('#autoplay');
const autoLabel = document.querySelector('#autoplay-label');
const pageStatus = document.querySelector('#page-status');
const orientationStatus = document.querySelector('#orientation');
const readerMessage = document.querySelector('#reader-message');
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const narrowScreen = window.matchMedia('(max-width: 700px)');
const pageWidth = Number(bookElement.dataset.pageWidth) || 464;
const pageHeight = Number(bookElement.dataset.pageHeight) || 638;
const lastPage = pages.length - 1;
const dwellTime = 3000;
document.documentElement.style.setProperty('--page-ratio', pageWidth / pageHeight);

const pageFlip = new St.PageFlip(bookElement, {
  width: pageWidth, height: pageHeight, size: 'stretch',
  minWidth: narrowScreen.matches ? Math.min(280, rig.clientWidth) : 1,
  maxWidth: pageWidth, minHeight: 1, maxHeight: pageHeight,
  drawShadow: true, flippingTime: reducedMotion.matches ? 1 : 900,
  usePortrait: narrowScreen.matches, startZIndex: 10, autoSize: true,
  maxShadowOpacity: .38, showCover: true, mobileScrollSupport: false,
  clickEventForward: true, useMouseEvents: true, swipeDistance: 24,
  showPageCorners: !reducedMotion.matches, disableFlipByClick: false
});

let currentPage = 0;
let isTurning = false;
let autoPlaying = false;
let autoTimer = 0;
let resizeFrame = 0;
let errorCount = 0;
let initialized = false;

function updateControls() {
  const portrait = pageFlip.getOrientation() === 'portrait';
  bookElement.dataset.edge = currentPage === 0 ? 'front' : currentPage >= lastPage ? 'back' : 'inside';
  previousButton.disabled = currentPage === 0 || isTurning;
  nextButton.disabled = currentPage >= lastPage || isTurning;
  autoButton.setAttribute('aria-pressed', String(autoPlaying));
  autoButton.setAttribute('aria-label', autoPlaying ? 'Pause automatic page turning' : currentPage >= lastPage ? 'Start automatic page turning from the cover' : 'Start automatic page turning');
  autoLabel.textContent = autoPlaying ? 'Pause' : currentPage >= lastPage ? 'Read again' : 'Auto flip';
  const number = String(currentPage + 1).padStart(2, '0');
  const count = String(pages.length).padStart(2, '0');
  pageStatus.textContent = currentPage === 0 ? `Front · ${number} / ${count}`
    : currentPage >= lastPage ? `Back · ${number} / ${count}`
    : portrait ? `${number} / ${count}`
    : `${number}—${String(Math.min(currentPage + 2, pages.length)).padStart(2, '0')} / ${count}`;
  orientationStatus.textContent = autoPlaying ? 'Turning automatically' : portrait ? 'Single page' : 'Two-page spread';
  document.querySelector('#progress-fill').style.transform = `scaleX(${(currentPage + 1) / pages.length})`;
  document.querySelector('#book-progress').setAttribute('aria-valuenow', String(currentPage + 1));
  document.querySelector('#book-progress').setAttribute('aria-valuetext', pageStatus.textContent);
}

function pauseAuto() {
  clearTimeout(autoTimer);
  autoTimer = 0;
  autoPlaying = false;
  updateControls();
}

function scheduleAuto(delay = dwellTime) {
  clearTimeout(autoTimer);
  if (!autoPlaying || isTurning || document.hidden) return;
  if (currentPage >= lastPage) { pauseAuto(); return; }
  autoTimer = window.setTimeout(() => {
    if (!autoPlaying || document.hidden) return;
    if (isTurning) { scheduleAuto(250); return; }
    turn(1, false);
  }, delay);
}

function startAuto() {
  if (isTurning) return;
  if (currentPage >= lastPage) pageFlip.turnToPage(0);
  autoPlaying = true;
  updateControls();
  scheduleAuto();
}

function turn(direction, manual = true) {
  if (manual) pauseAuto();
  if (isTurning || direction < 0 && currentPage === 0 || direction > 0 && currentPage >= lastPage) return false;
  if (reducedMotion.matches) {
    direction > 0 ? pageFlip.turnToNextPage() : pageFlip.turnToPrevPage();
  } else {
    direction > 0 ? pageFlip.flipNext('bottom') : pageFlip.flipPrev('bottom');
  }
  return true;
}

function updateOrientation(orientation) {
  bookElement.dataset.layout = orientation;
  updateControls();
}

pageFlip.on('flip', event => {
  currentPage = Number(event.data);
  if (currentPage >= lastPage) pauseAuto();
  else { updateControls(); scheduleAuto(); }
});
pageFlip.on('changeState', event => {
  isTurning = event.data === 'flipping' || event.data === 'user_fold';
  updateControls();
  if (event.data === 'read') scheduleAuto();
});
pageFlip.on('init', event => {
  initialized = true;
  updateOrientation(event.data.mode);
  bookElement.classList.add('is-ready');
});
pageFlip.on('changeOrientation', event => updateOrientation(event.data));
pageFlip.loadFromHTML(pages);
updateControls();

const requestedPageText = new URLSearchParams(location.search).get('page');
const requestedPage = Number(requestedPageText);
if (requestedPageText !== null && Number.isInteger(requestedPage) && requestedPage >= 0 && requestedPage < pages.length) {
  pageFlip.turnToPage(requestedPage);
}

previousButton.addEventListener('click', () => turn(-1));
nextButton.addEventListener('click', () => turn(1));
autoButton.addEventListener('click', () => autoPlaying ? pauseAuto() : startAuto());
// Taking hold of a page always gives control back to the reader.
bookElement.addEventListener('pointerdown', () => { if (autoPlaying) pauseAuto(); }, {passive: true});
bookElement.addEventListener('touchstart', () => { if (autoPlaying) pauseAuto(); }, {passive: true});

window.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey || event.target.isContentEditable || /INPUT|SELECT|TEXTAREA/.test(event.target.tagName)) return;
  if (event.key === 'Escape' && autoPlaying) { pauseAuto(); return; }
  if (event.key === 'ArrowLeft') { event.preventDefault(); turn(-1); }
  if (event.key === 'ArrowRight' || event.key === ' ' && event.target === document.body) { event.preventDefault(); turn(1); }
  if ((event.key === 'Home' || event.key === 'End') && !isTurning) {
    event.preventDefault(); pauseAuto(); pageFlip.turnToPage(event.key === 'Home' ? 0 : lastPage);
  }
});

function resizeReader() {
  cancelAnimationFrame(resizeFrame);
  resizeFrame = requestAnimationFrame(() => {
    if (!initialized) return;
    const settings = pageFlip.getSettings();
    settings.usePortrait = narrowScreen.matches;
    settings.minWidth = narrowScreen.matches ? Math.max(1, Math.min(280, rig.clientWidth)) : 1;
    bookElement.style.minWidth = `${settings.minWidth * (settings.usePortrait ? 1 : 2)}px`;
    pageFlip.update();
    updateOrientation(pageFlip.getOrientation());
  });
}
window.addEventListener('resize', resizeReader);
if ('ResizeObserver' in window) new ResizeObserver(resizeReader).observe(rig);
reducedMotion.addEventListener('change', () => {
  pageFlip.getSettings().flippingTime = reducedMotion.matches ? 1 : 900;
  pageFlip.getSettings().showPageCorners = !reducedMotion.matches;
});
document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAuto(); });

function showMessage(message) {
  readerMessage.textContent = message;
  readerMessage.hidden = false;
}
const fullScreenButton = document.querySelector('#fullscreen');
if (!document.fullscreenEnabled) fullScreenButton.hidden = true;
fullScreenButton.addEventListener('click', async () => {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch { showMessage('Full screen is unavailable in this browser. You can keep reading here.'); }
});
document.addEventListener('fullscreenchange', () => {
  const text = document.fullscreenElement ? 'Exit full screen' : 'Read in full screen';
  fullScreenButton.setAttribute('aria-label', text);
  fullScreenButton.setAttribute('title', text);
  resizeReader();
});

const imagePromises = [...bookElement.querySelectorAll('img')].map(img => new Promise(resolve => {
  const finish = ok => {
    if (!ok) { errorCount++; showMessage('A page could not load. Please refresh and try again.'); }
    resolve(ok);
  };
  if (img.complete) finish(img.naturalWidth > 0);
  else { img.addEventListener('load', () => finish(true), {once: true}); img.addEventListener('error', () => finish(false), {once: true}); }
}));

// A small local interface for verification and future page-turn recordings.
window.bieceReader = {
  pageFlip,
  ready: Promise.all(imagePromises),
  startAuto,
  pauseAuto,
  next: () => turn(1),
  previous: () => turn(-1),
  goTo(index) {
    pauseAuto();
    if (isTurning || !Number.isInteger(index) || index < 0 || index > lastPage) return false;
    pageFlip.turnToPage(index);
    return true;
  },
  get state() { return {page: currentPage, count: pages.length, autoPlaying, isTurning, orientation: pageFlip.getOrientation(), errorCount}; }
};
