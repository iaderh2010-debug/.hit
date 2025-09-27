export function getValveConnectionPoint(el, side) {
  const circle = el.querySelector('.vector-node-circle');
  if (!circle) return { x: 0, y: 0 };
  const svg = circle.querySelector('svg');
  const orientation = el.dataset.vectorOrientation || 'horizontal';
  const wsRect = workspace.getBoundingClientRect();
  if (!svg) {
    // fallback to container center
    const rect = circle.getBoundingClientRect();
    return { x: (rect.left + rect.right) / 2 - wsRect.left, y: (rect.top + rect.bottom) / 2 - wsRect.top };
  }
  const rect = svg.getBoundingClientRect();
  if (orientation === 'vertical') {
    if (side === 'top') {
      // Middle of top triangle base: x=24, y=4
      const x = rect.left + (24 / 48) * rect.width - wsRect.left;
      const y = rect.top + (4 / 48) * rect.height - wsRect.top;
      return { x, y };
    } else if (side === 'bottom') {
      // Middle of bottom triangle base: x=24, y=44
      const x = rect.left + (24 / 48) * rect.width - wsRect.left;
      const y = rect.top + (44 / 48) * rect.height - wsRect.top;
      return { x, y };
    }
  } else {
    // horizontal
    if (side === 'left') {
      // Middle of left triangle base: x=4, y=24
      const x = rect.left + (4 / 48) * rect.width - wsRect.left;
      const y = rect.top + (24 / 48) * rect.height - wsRect.top;
      return { x, y };
    } else if (side === 'right') {
      // Middle of right triangle base: x=44, y=24
      const x = rect.left + (44 / 48) * rect.width - wsRect.left;
      const y = rect.top + (24 / 48) * rect.height - wsRect.top;
      return { x, y };
    }
  }
  // fallback
  return { x: (rect.left + rect.right) / 2 - wsRect.left, y: (rect.top + rect.bottom) / 2 - wsRect.top };
}
export function getClosestValveSide(valveEl, otherEl) {
  const orientation = valveEl.dataset.vectorOrientation || 'horizontal';
  const wsRect = workspace.getBoundingClientRect();
  // Get valve triangle base points
  const left = getValveConnectionPoint(valveEl, orientation === 'vertical' ? 'top' : 'left');
  const right = getValveConnectionPoint(valveEl, orientation === 'vertical' ? 'bottom' : 'right');
  // Get other element center
  const rect = otherEl.getBoundingClientRect();
  const other = {
    x: (rect.left + rect.right) / 2 - wsRect.left,
    y: (rect.top + rect.bottom) / 2 - wsRect.top
  };
  // Compare distances
  const dLeft = Math.hypot(other.x - left.x, other.y - left.y);
  const dRight = Math.hypot(other.x - right.x, other.y - right.y);
  return dLeft < dRight
    ? (orientation === 'vertical' ? 'top' : 'left')
    : (orientation === 'vertical' ? 'bottom' : 'right');
}
export function getPipeEndpoint(el) {
  const wsRect = workspace.getBoundingClientRect();
  const rect = el.getBoundingClientRect();
  return {
    x: (rect.left + rect.right) / 2 - wsRect.left,
    y: (rect.top + rect.bottom) / 2 - wsRect.top
  };
}