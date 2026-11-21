// Keyboard + button input. Keys are tracked as a held set so movement is
// smooth; single-press actions (E, Q, R, M, Enter) fire once per press.
export function bindInput(handlers) {
  const held = new Set();
  const codeOf = (e) => e.code;

  function isMove(code) {
    return ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code);
  }

  window.addEventListener('keydown', (e) => {
    if (isMove(codeOf(e))) {
      held.add(codeOf(e));
      e.preventDefault();
    }
    if (e.repeat) return;
    if (codeOf(e) === 'ShiftLeft' || codeOf(e) === 'ShiftRight') held.add('Shift');
    if (codeOf(e) === 'KeyE') handlers.onInteract();
    if (codeOf(e) === 'KeyQ') handlers.onThrowCoin();
    if (codeOf(e) === 'KeyR') handlers.onRestart();
    if (codeOf(e) === 'KeyM') handlers.onMute();
    if (codeOf(e) === 'Enter') handlers.onConfirm();
    if (codeOf(e) === 'Digit1') handlers.onLevel(0);
    if (codeOf(e) === 'Digit2') handlers.onLevel(1);
    if (codeOf(e) === 'Digit3') handlers.onLevel(2);
  });

  window.addEventListener('keyup', (e) => {
    held.delete(codeOf(e));
    if (codeOf(e) === 'ShiftLeft' || codeOf(e) === 'ShiftRight') held.delete('Shift');
  });

  window.addEventListener('blur', () => held.clear());

  return {
    moveVector() {
      let x = 0;
      let y = 0;
      if (held.has('KeyA') || held.has('ArrowLeft')) x -= 1;
      if (held.has('KeyD') || held.has('ArrowRight')) x += 1;
      if (held.has('KeyW') || held.has('ArrowUp')) y -= 1;
      if (held.has('KeyS') || held.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) {
        x *= Math.SQRT1_2;
        y *= Math.SQRT1_2;
      }
      return { x, y, sneak: held.has('Shift') };
    },
  };
}
