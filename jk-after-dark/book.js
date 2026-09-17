(() => {
  const sheets = [...document.querySelectorAll('.sheet')];
  const book = document.getElementById('bookObject');
  const stage = document.getElementById('book');
  const prevButton = document.getElementById('prevPage');
  const nextButton = document.getElementById('nextPage');
  const edgePrev = document.getElementById('edgePrev');
  const edgeNext = document.getElementById('edgeNext');
  const resetButton = document.getElementById('resetBook');
  const currentLabel = document.getElementById('pageCurrent');
  const progressBar = document.getElementById('progressBar');
  const hint = document.getElementById('interactionHint');

  const initialSpread = Number.parseInt(new URLSearchParams(window.location.search).get('spread') || '0', 10);
  let current = Number.isFinite(initialSpread) ? Math.max(0, Math.min(sheets.length, initialSpread)) : 0;
  let pointerStart = null;
  let busy = false;

  function labelFor(position) {
    if (position === 0) return '封面';
    if (position === sheets.length) return '封底';
    const firstPage = position * 2;
    return `${String(firstPage).padStart(2, '0')}—${String(firstPage + 1).padStart(2, '0')}`;
  }

  function render(announce = true) {
    sheets.forEach((sheet, index) => {
      const flipped = index < current;
      sheet.classList.toggle('flipped', flipped);
      sheet.style.zIndex = flipped ? index + 1 : sheets.length - index + 1;
      sheet.style.transform = flipped
        ? `rotateY(-180deg) translateZ(${-index * 0.45}px)`
        : `rotateY(0deg) translateZ(${(sheets.length - index) * 0.45}px)`;
    });

    book.classList.toggle('is-front-closed', current === 0);
    book.classList.toggle('is-back-closed', current === sheets.length);
    prevButton.disabled = current === 0;
    nextButton.disabled = current === sheets.length;
    edgePrev.disabled = current === 0;
    edgeNext.disabled = current === sheets.length;
    currentLabel.textContent = labelFor(current);
    progressBar.style.transform = `scaleX(${current / sheets.length})`;
    if (announce) hint.textContent = current === sheets.length ? '画册已合上 · 点击“重置”重新观看' : '拖动书页或使用键盘 ← → 翻页';
  }

  function turn(delta) {
    const target = Math.max(0, Math.min(sheets.length, current + delta));
    if (target === current || busy) return;
    busy = true;
    const turningSheet = delta > 0 ? sheets[current] : sheets[current - 1];
    turningSheet?.classList.add('turning');
    current = target;
    render();
    window.setTimeout(() => {
      turningSheet?.classList.remove('turning');
      busy = false;
    }, 940);
  }

  function reset() {
    if (busy) return;
    current = 0;
    render();
  }

  prevButton.addEventListener('click', () => turn(-1));
  nextButton.addEventListener('click', () => turn(1));
  edgePrev.addEventListener('click', () => turn(-1));
  edgeNext.addEventListener('click', () => turn(1));
  resetButton.addEventListener('click', reset);

  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft') turn(-1);
    if (event.key === 'ArrowRight' || event.key === ' ') {
      event.preventDefault();
      turn(1);
    }
    if (event.key === 'Home') reset();
    if (event.key === 'End' && !busy) {
      current = sheets.length;
      render();
    }
  });

  stage.addEventListener('pointerdown', (event) => {
    if (event.target.closest('button')) return;
    pointerStart = { x: event.clientX, y: event.clientY };
    stage.setPointerCapture?.(event.pointerId);
  });

  stage.addEventListener('pointerup', (event) => {
    if (!pointerStart) return;
    const dx = event.clientX - pointerStart.x;
    const dy = event.clientY - pointerStart.y;
    if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy)) turn(dx < 0 ? 1 : -1);
    pointerStart = null;
  });

  stage.addEventListener('pointermove', (event) => {
    if (event.pointerType === 'touch') return;
    const rect = stage.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - .5;
    const y = (event.clientY - rect.top) / rect.height - .5;
    stage.style.setProperty('--tilt-x', `${x * 7 - 4}deg`);
    stage.style.setProperty('--tilt-y', `${y * -4}deg`);
  });

  stage.addEventListener('pointerleave', () => {
    stage.style.setProperty('--tilt-x', '-4deg');
    stage.style.setProperty('--tilt-y', '0deg');
    pointerStart = null;
  });

  book.classList.add('is-initial');
  render(false);
  requestAnimationFrame(() => requestAnimationFrame(() => book.classList.remove('is-initial')));
})();
