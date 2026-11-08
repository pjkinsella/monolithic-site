(() => {
  const feed = document.querySelector('.feed');
  const feedFrame = document.querySelector('.feed-frame');
  const transcript = document.querySelector('.transcript');
  const ghosts = document.querySelector('.ghost-layer');
  const bar = document.querySelector('.scrollbar');
  const thumb = document.querySelector('.scrollbar-thumb');
  const barGhosts = document.querySelector('.scrollbar-ghosts');
  const cursor = transcript.querySelector('.cursor');
  const cursorAnchor = transcript.querySelector('.cursor-line');
  const wordmark = transcript.querySelector('.ascii-wordmark');
  const headerBrand = document.querySelector('.masthead__brand');
  const clock = document.querySelector('.masthead__clock');
  const clockValue = clock.querySelector('.clock-value');
  let clockCharacters = [];
  const caretLayer = document.querySelector('.caret-layer');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const forcedColors = matchMedia('(forced-colors: active)');
  let state = null;
  let expectedScroll = 0;
  let wheelRemainder = 0;
  let drag = null;
  let pendingLayout = false;

  const effectsEnabled = () => !reducedMotion.matches && !forcedColors.matches;

  function updateClock() {
    const now = new Date();
    const pad = value => String(value).padStart(2, '0');
    const next = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    if (!clockCharacters.length) {
      clockCharacters = [...next].map(character => {
        const digit = document.createElement('span');
        digit.className = 'clock-digit';
        digit.append(document.createTextNode(character));
        return digit;
      });
      clockValue.replaceChildren(...clockCharacters);
    } else {
      clockCharacters.forEach((digit, index) => {
        const old = digit.firstChild.nodeValue;
        if (old === next[index]) return;
        if (effectsEnabled()) {
          const ghost = document.createElement('span');
          ghost.className = 'clock-ghost visual-ghost';
          ghost.textContent = old;
          digit.append(ghost);
          expire(ghost);
        }
        digit.firstChild.nodeValue = next[index];
      });
    }
    clock.setAttribute('aria-label', `Current local date and time: ${next}`);
    clock.dateTime = now.toISOString();
  }

  function metrics() {
    const line = parseFloat(getComputedStyle(document.documentElement).fontSize) * 1.6;
    const stepped = getComputedStyle(transcript).getPropertyValue('--terminal-stepped').trim() === '1';
    const range = Math.max(0, feed.scrollHeight - feed.clientHeight);
    const contentRows = Math.max(1, Math.round((transcript.getBoundingClientRect().height - transcript.firstElementChild.getBoundingClientRect().height) / line));
    const contentHeight = stepped ? feed.clientHeight + contentRows * line : feed.scrollHeight;
    const thumbHeight = Math.min(bar.clientHeight, Math.max(28, bar.clientHeight * feed.clientHeight / contentHeight));
    return {line, stepped, range, contentRows, thumbHeight, thumbTravel: Math.max(0, bar.clientHeight - thumbHeight)};
  }

  function expire(element) {
    element.addEventListener('animationend', () => element.remove(), {once: true});
    element.addEventListener('animationcancel', () => element.remove(), {once: true});
  }

  function clearGhosts() {
    ghosts.replaceChildren();
    barGhosts.replaceChildren();
    caretLayer.querySelectorAll('.cursor-ghost').forEach(element => element.remove());
    headerBrand.parentElement.querySelectorAll('.masthead__brand-ghost').forEach(element => element.remove());
    clock.querySelectorAll('.clock-ghost').forEach(element => element.remove());
  }

  function updateHeaderBrand() {
    const visible = wordmark.getBoundingClientRect().bottom <= feed.getBoundingClientRect().top;
    if (headerBrand.classList.contains('is-visible') === visible) return;
    if (effectsEnabled()) {
      const ghost = document.createElement('span');
      ghost.className = 'masthead__brand-ghost visual-ghost';
      ghost.setAttribute('aria-hidden', 'true');
      ghost.textContent = headerBrand.textContent;
      headerBrand.parentElement.append(ghost);
      expire(ghost);
    }
    headerBrand.classList.toggle('is-visible', visible);
  }

  function leaveTextGhost(row, line) {
    const frame = transcript.cloneNode(true);
    frame.className = 'ghost-frame';
    frame.dataset.row = row;
    frame.setAttribute('aria-hidden', 'true');
    frame.setAttribute('inert', '');
    frame.style.transform = `translateY(${-row * line}px)`;
    frame.querySelectorAll('[id], [aria-labelledby]').forEach(element => {
      element.removeAttribute('id');
      element.removeAttribute('aria-labelledby');
    });
    ghosts.append(frame);
    expire(frame);
  }

  function leaveBarGhost(progress, current) {
    const ghost = document.createElement('span');
    ghost.className = 'scrollbar-ghost visual-ghost';
    ghost.style.height = `${current.thumbHeight}px`;
    ghost.style.transform = `translateY(${progress * current.thumbTravel}px)`;
    barGhosts.append(ghost);
    expire(ghost);
  }

  function leaveCursorGhost() {
    const ghost = document.createElement('span');
    ghost.className = 'cursor-ghost visual-ghost';
    ghost.style.transform = cursor.style.transform;
    const impression = cursor.cloneNode(true);
    impression.style.transform = 'none';
    impression.style.animation = 'none';
    impression.style.opacity = getComputedStyle(cursor).opacity;
    ghost.append(impression);
    caretLayer.append(ghost);
    expire(ghost);
  }

  function paintCaret() {
    const c = state.caret;
    cursor.style.transform = `translate(${c.x}px, ${c.startY + c.row * c.line}px)`;
  }

  function paint(current = metrics()) {
    if (!state) return;
    let progress;
    if (current.stepped) {
      transcript.style.setProperty('--text-offset', `${-state.textRow * current.line}px`);
      progress = state.textRow / current.contentRows;
      feed.scrollTop = Math.ceil(progress * current.range);
    } else {
      progress = current.range ? feed.scrollTop / current.range : 0;
    }
    expectedScroll = feed.scrollTop;
    thumb.style.height = `${current.thumbHeight}px`;
    thumb.style.transform = `translateY(${progress * current.thumbTravel}px)`;
    bar.setAttribute('aria-valuenow', String(Math.round(progress * 100)));
    bar.setAttribute('aria-valuetext', `${Math.round(progress * 100)}% scrolled`);
    paintCaret();
    updateHeaderBrand();
  }

  function layout() {
    pendingLayout = false;
    clearGhosts();
    wheelRemainder = 0;
    const current = metrics();
    const anchor = cursorAnchor.getBoundingClientRect();
    const viewport = feed.getBoundingClientRect();
    const matrix = getComputedStyle(transcript).transform;
    const shift = current.stepped && matrix !== 'none' ? -new DOMMatrixReadOnly(matrix).m42 : feed.scrollTop;
    const height = cursor.getBoundingClientRect().height;
    const bottom = Math.max(0, feed.clientHeight - height);
    const startY = Math.max(0, Math.min(bottom, anchor.top - viewport.top + shift + (current.line - height) / 2));
    const minRows = -Math.floor(startY / current.line);
    const maxRows = Math.max(0, Math.floor((bottom - startY) / current.line));
    const textRow = state ? Math.min(current.contentRows, state.textRow) : Math.round((current.range ? feed.scrollTop / current.range : 0) * current.contentRows);
    const caretRow = state ? Math.max(minRows, Math.min(maxRows, state.caret.row)) : 0;
    state = {textRow, caret: {x: anchor.left - viewport.left, startY, line: current.line, minRows, maxRows, row: caretRow}};
    paint(current);
  }

  function scheduleLayout() {
    if (!pendingLayout) {
      pendingLayout = true;
      requestAnimationFrame(layout);
    }
  }

  // Each input row moves the caret first. Only a caret already at an edge
  // can scroll the text. This state is independent of scroll direction.
  function step(direction, count = 1) {
    const current = metrics();
    if (!current.stepped) {
      feed.scrollTop += direction * count * current.line;
      return;
    }
    const c = state.caret;
    for (let i = 0; i < count; i++) {
      const nextCaret = Math.max(c.minRows, Math.min(c.maxRows, c.row + direction));
      if (nextCaret !== c.row) {
        if (effectsEnabled()) leaveCursorGhost();
        c.row = nextCaret;
        paintCaret();
      } else {
        const nextText = Math.max(0, Math.min(current.contentRows, state.textRow + direction));
        if (nextText !== state.textRow) {
          if (effectsEnabled()) {
            leaveTextGhost(state.textRow, current.line);
            leaveBarGhost(state.textRow / current.contentRows, current);
          }
          state.textRow = nextText;
        }
      }
    }
    paint(current);
  }

  // Dragging or explicitly seeking the scrollbar controls content directly.
  function seek(progress, home = false) {
    const current = metrics();
    progress = Math.max(0, Math.min(1, progress));
    if (!current.stepped) {
      feed.scrollTop = progress * current.range;
      if (home) state.caret.row = 0;
      paint(current);
      return;
    }
    const target = Math.round(progress * current.contentRows);
    const direction = Math.sign(target - state.textRow);
    for (let row = state.textRow; row !== target; row += direction) {
      if (effectsEnabled()) {
        leaveTextGhost(row, current.line);
        leaveBarGhost(row / current.contentRows, current);
      }
    }
    if (home || direction) {
      const nextCaret = home ? 0 : direction > 0 ? state.caret.maxRows : state.caret.minRows;
      if (nextCaret !== state.caret.row && effectsEnabled()) leaveCursorGhost();
      state.caret.row = nextCaret;
    }
    state.textRow = target;
    paint(current);
  }

  document.addEventListener('keydown', event => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey ||
        event.target.closest('input, textarea, select, [contenteditable]:not([contenteditable="false"])')) return;
    const direction = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
    if (direction) {
      event.preventDefault();
      wheelRemainder = 0;
      step(direction);
    } else if ((event.target === bar || event.target === feed) && ['Home', 'End', 'PageUp', 'PageDown'].includes(event.key)) {
      event.preventDefault();
      if (event.key === 'Home') seek(0, true);
      else if (event.key === 'End') seek(1);
      else step(event.key === 'PageDown' ? 1 : -1, Math.max(1, Math.floor(feed.clientHeight / metrics().line)));
    }
  });

  function consumeWheel(delta) {
    if (wheelRemainder && Math.sign(delta) !== Math.sign(wheelRemainder)) wheelRemainder = 0;
    wheelRemainder += delta;
    const count = Math.trunc(wheelRemainder / metrics().line);
    if (count) {
      wheelRemainder -= count * metrics().line;
      step(Math.sign(count), Math.abs(count));
    }
  }

  feedFrame.addEventListener('wheel', event => {
    if (event.ctrlKey) return;
    const current = metrics();
    const scale = event.deltaMode === 1 ? current.line : event.deltaMode === 2 ? feed.clientHeight : 1;
    if (current.stepped) {
      event.preventDefault();
      consumeWheel(event.deltaY * scale);
    } else if (bar.contains(event.target)) {
      event.preventDefault();
      feed.scrollTop += event.deltaY * scale;
    }
  }, {passive: false});

  let touchY = null;
  feed.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch' && metrics().stepped) {
      touchY = event.clientY;
      feed.setPointerCapture(event.pointerId);
    }
  });
  feed.addEventListener('pointermove', event => {
    if (touchY !== null && event.pointerType === 'touch') {
      consumeWheel(touchY - event.clientY);
      touchY = event.clientY;
    }
  });
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) feed.addEventListener(name, () => { touchY = null; });

  function dragTo(clientY) {
    if (!drag) return;
    const current = metrics();
    if (!current.thumbTravel) return;
    const y = clientY - bar.getBoundingClientRect().top - drag.offset;
    seek(y / current.thumbTravel);
  }

  bar.addEventListener('pointerdown', event => {
    if (event.button !== 0) return;
    event.preventDefault();
    bar.focus({preventScroll: true});
    const current = metrics();
    const localY = event.clientY - bar.getBoundingClientRect().top;
    const progress = current.stepped ? state.textRow / current.contentRows : current.range ? feed.scrollTop / current.range : 0;
    const thumbY = progress * current.thumbTravel;
    const onThumb = localY >= thumbY && localY <= thumbY + current.thumbHeight;
    drag = {offset: onThumb ? localY - thumbY : current.thumbHeight / 2};
    bar.setPointerCapture(event.pointerId);
    if (!onThumb) dragTo(event.clientY);
  });
  bar.addEventListener('pointermove', event => dragTo(event.clientY));
  for (const name of ['pointerup', 'pointercancel', 'lostpointercapture']) bar.addEventListener(name, () => { drag = null; });

  feed.addEventListener('scroll', () => {
    const current = metrics();
    if (current.stepped) {
      if (Math.abs(feed.scrollTop - expectedScroll) > 0.5) seek(current.range ? feed.scrollTop / current.range : 0);
    } else {
      const progress = current.range ? feed.scrollTop / current.range : 0;
      if (effectsEnabled() && Math.abs(feed.scrollTop - expectedScroll) > 0.5) leaveBarGhost(current.range ? expectedScroll / current.range : 0, current);
      state.textRow = Math.round(progress * current.contentRows);
      paint(current);
    }
  }, {passive: true});

  updateClock();
  setInterval(updateClock, 1000);
  document.addEventListener('visibilitychange', updateClock);
  bar.hidden = false;
  caretLayer.hidden = false;
  caretLayer.append(cursor);
  feedFrame.classList.add('has-scrollbar');
  feed.classList.add('terminal-managed');
  new ResizeObserver(scheduleLayout).observe(feed);
  reducedMotion.addEventListener('change', scheduleLayout);
  forcedColors.addEventListener('change', scheduleLayout);
  layout();
})();
