/**
 * Inject a visible cursor and click ripple effect into the page.
 * Used by the demo recording to show mouse movements and clicks.
 */
export const CURSOR_SCRIPT = `
(() => {
  // Cursor dot
  const cursor = document.createElement('div');
  Object.assign(cursor.style, {
    position: 'fixed', zIndex: '999999', pointerEvents: 'none',
    width: '20px', height: '20px', borderRadius: '50%',
    background: 'rgba(239, 68, 68, 0.9)', border: '2px solid white',
    boxShadow: '0 0 8px rgba(0,0,0,0.3)',
    transform: 'translate(-50%, -50%)', transition: 'left 0.15s ease, top 0.15s ease',
    left: '-100px', top: '-100px',
  });
  document.body.appendChild(cursor);

  document.addEventListener('mousemove', (e) => {
    cursor.style.left = e.clientX + 'px';
    cursor.style.top = e.clientY + 'px';
  });

  // Click ripple
  document.addEventListener('mousedown', (e) => {
    cursor.style.transform = 'translate(-50%, -50%) scale(0.7)';
    const ripple = document.createElement('div');
    Object.assign(ripple.style, {
      position: 'fixed', zIndex: '999998', pointerEvents: 'none',
      left: e.clientX + 'px', top: e.clientY + 'px',
      width: '0', height: '0', borderRadius: '50%',
      border: '3px solid rgba(239, 68, 68, 0.6)',
      transform: 'translate(-50%, -50%)',
      transition: 'all 0.4s ease-out', opacity: '1',
    });
    document.body.appendChild(ripple);
    requestAnimationFrame(() => {
      ripple.style.width = '40px';
      ripple.style.height = '40px';
      ripple.style.opacity = '0';
    });
    setTimeout(() => ripple.remove(), 500);
  });

  document.addEventListener('mouseup', () => {
    cursor.style.transform = 'translate(-50%, -50%) scale(1)';
  });
})();
`;
