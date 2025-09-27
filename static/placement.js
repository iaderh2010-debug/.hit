// Make makeDraggable modular: pass in needed state and helpers

export function makeDraggable(element, {
  workspace,
  tabs,
  activeTab,
  updatePositionsPanel,
  saveToLocal,
  layoutKey,
  getValveConnectionPoint,
  getClosestValveSide,
  getPipeEndpoint
}) {
  let offsetX, offsetY, dragging = false;

  element.addEventListener('mousedown', e => {
    dragging = true;
    offsetX = e.clientX - element.getBoundingClientRect().left;
    offsetY = e.clientY - element.getBoundingClientRect().top;
    element.style.zIndex = 1000;
  });

  document.addEventListener('mousemove', e => {
    if (!dragging) return;
    const rect = workspace.getBoundingClientRect();
    const x = e.clientX - offsetX - rect.left;
    const y = e.clientY - offsetY - rect.top;
    element.style.left = Math.max(0, x) + 'px';
    element.style.top = Math.max(0, y) + 'px';

    // Real-time update for pipes connected to this element
    const widgetId = element.dataset.widgetId;
    tabs[activeTab].content.forEach(item => {
      if (item.type === 'pipe-indicator' && Array.isArray(item.connectedIds) && item.connectedIds.includes(widgetId)) {
        const el1 = workspace.querySelector(`[data-widget-id='${item.connectedIds[0]}']`);
        const el2 = workspace.querySelector(`[data-widget-id='${item.connectedIds[1]}']`);
        if (el1 && el2) {
          const pt1 = el1.dataset.vectorType === 'valve'
            ? getValveConnectionPoint(el1, getClosestValveSide(el1, el2))
            : getPipeEndpoint(el1);

          const pt2 = el2.dataset.vectorType === 'valve'
            ? getValveConnectionPoint(el2, getClosestValveSide(el2, el1))
            : getPipeEndpoint(el2);
          const x1 = pt1.x, y1 = pt1.y, x2 = pt2.x, y2 = pt2.y;
          const dx = x2 - x1;
          const dy = y2 - y1;
          const length = Math.sqrt(dx * dx + dy * dy);
          const angle = Math.atan2(dy, dx) * 180 / Math.PI;
          // Update pipe DOM
          const pipeEl = workspace.querySelector(`[data-widget-id='${item.id}'] .pipe-indicator-pipe`);
          const pipeContainer = workspace.querySelector(`[data-widget-id='${item.id}']`);
          if (pipeEl && pipeContainer) {
            pipeEl.style.width = length + 'px';
            pipeEl.style.transform = `rotate(${angle}deg)`;
            pipeContainer.style.left = (x1 + x2) / 2 - length / 2 + 'px';
            pipeContainer.style.top = (y1 + y2) / 2 - 9 + 'px';
          }
          // Update layout data (not persisted until mouseup)
          item.posX = (x1 + x2) / 2 - length / 2;
          item.posY = (y1 + y2) / 2 - 9;
          item.pipeLength = length;
          item.pipeAngle = angle;
        }
      }
    });
  });

  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      element.style.zIndex = '';
      updatePositionsPanel(workspace);
      const widgetId = element.dataset.widgetId;
      const x = parseInt(element.style.left || '0', 10);
      const y = parseInt(element.style.top || '0', 10);
      const widget = tabs[activeTab].content.find(item => item.id === widgetId);
      if (widget) {
        widget.posX = x;
        widget.posY = y;
      }
      // If this is a connected element, update all pipes that reference it
      tabs[activeTab].content.forEach(item => {
        if (item.type === 'pipe-indicator' && Array.isArray(item.connectedIds) && item.connectedIds.includes(widgetId)) {
          const el1 = workspace.querySelector(`[data-widget-id='${item.connectedIds[0]}']`);
          const el2 = workspace.querySelector(`[data-widget-id='${item.connectedIds[1]}']`);
          if (el1 && el2) {
            const pt1 = el1.dataset.vectorType === 'valve'
              ? getValveConnectionPoint(el1, getClosestValveSide(el1, el2))
              : getPipeEndpoint(el1);

            const pt2 = el2.dataset.vectorType === 'valve'
              ? getValveConnectionPoint(el2, getClosestValveSide(el2, el1))
              : getPipeEndpoint(el2);
            const x1 = pt1.x, y1 = pt1.y, x2 = pt2.x, y2 = pt2.y;
            const dx = x2 - x1;
            const dy = y2 - y1;
            const length = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx) * 180 / Math.PI;
            // Update pipe DOM
            const pipeEl = workspace.querySelector(`[data-widget-id='${item.id}'] .pipe-indicator-pipe`);
            const pipeContainer = workspace.querySelector(`[data-widget-id='${item.id}']`);
            if (pipeEl && pipeContainer) {
              pipeEl.style.width = length + 'px';
              pipeEl.style.transform = `rotate(${angle}deg)`;
              pipeContainer.style.left = (x1 + x2) / 2 - length / 2 + 'px';
              pipeContainer.style.top = (y1 + y2) / 2 - 9 + 'px';
            }
            // Update layout data
            item.posX = (x1 + x2) / 2 - length / 2;
            item.posY = (y1 + y2) / 2 - 9;
            item.pipeLength = length;
            item.pipeAngle = angle;
          }
        }
      });
      saveToLocal(tabs, layoutKey);
    }
  });
}