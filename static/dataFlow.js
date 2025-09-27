export function saveToLocal(tabs, layoutKey) {
  localStorage.setItem(layoutKey, JSON.stringify(tabs));
}
export function loadLayoutFromBackend(layoutKey, setTabs, renderTabs, setActiveTabAndRender) {
  fetch('/get-layout')
    .then(res => res.json())
    .then(data => {
      let tabs;
      if (data.tabs) {
        tabs = data.tabs.map((tab, idx) => ({
          ...tab,
          name: tab.name && tab.name.trim() ? tab.name : `Página ${idx + 1}`
        }));
        if (!Array.isArray(tabs) || tabs.length === 0) {
          tabs = [{ name: 'Página 1', id: 'tab-' + Date.now(), content: [] }];
        }
      } else if (data.layout) {
        tabs = [{ name: 'Página 1', id: 'tab-' + Date.now(), content: data.layout }];
      }
      // Save to user-specific localStorage
      localStorage.setItem(layoutKey, JSON.stringify(tabs));
      setTabs(tabs);
      renderTabs();
      setActiveTabAndRender(0);
    });
}
export function saveLayoutToBackend(tabs) {
  return fetch('/save-layout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tabs })
  })
    .then(res => {
      if (!res.ok) {
        throw new Error('HTTP status ' + res.status);
      }
      return res.json();
    });
}
export function propagatePipeConfig(widgetId, config, visited = new Set()) {
  if (visited.has(widgetId)) return;
  visited.add(widgetId);

  // Find all pipes connected to this widget
  tabs[activeTab].content.forEach(item => {
    if (item.type === 'pipe-indicator' && item.connectedIds && item.connectedIds.includes(widgetId)) {
      Object.assign(item, config);
      // Propagate to both endpoints
      item.connectedIds.forEach(id => {
        if (id !== widgetId) {
          const w = tabs[activeTab].content.find(x => x.id === id);
          if (w && w.type === 'vector' && w.attachedPipeIds) {
            // Propagate to all pipes attached to this vector except the current pipe
            w.attachedPipeIds.forEach(pid => {
              if (pid !== item.id) propagatePipeConfig(pid, config, visited);
            });
          } else if (w && w.type === 'pipe-indicator') {
            propagatePipeConfig(id, config, visited);
          }
        }
      });
    }
    // If starting from a vector, propagate to all attached pipes
    if (item.type === 'vector' && item.id === widgetId && item.attachedPipeIds) {
      item.attachedPipeIds.forEach(pid => {
        propagatePipeConfig(pid, config, visited);
      });
    }
  });
}