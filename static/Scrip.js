import {
  createButton,
  createIndicatorLight,
  createGauge,
  createLevelBar,
  createPipeIndicator,
  createVectorNode
} from './createElements.js';

import {
  loadLayoutFromBackend,
  saveLayoutToBackend,
  propagatePipeConfig,
  saveToLocal
} from './dataFlow.js';

import {
  getValveConnectionPoint,
  getClosestValveSide,
  getPipeEndpoint
} from './geo&Cnntn.js';

import {
  openConfigModal,
  closeModal,
  openTabConfigModal
} from './modal.js';

import{
  makeDraggable,
} from './placement.js';

import {
  renderTabs,
  updatePositionsPanel,
  setActiveTab,
  updateVectorSymbol,
  setGaugeValue,
  setLevelFill
} from './render.js';

import {
  darkenColor,
  RGBToHLS,
  HLSToRGB,
  getCurrentUsername
} from './ui.js';

document.addEventListener('DOMContentLoaded', () => {
  // Clear all scada_layout keys on login or logout page load
  if (window.location.pathname.endsWith('login.html') || window.location.pathname.endsWith('logout')) {
    Object.keys(localStorage).forEach(key => {
      if (key.startsWith('scada_layout_')) localStorage.removeItem(key);
    });
  }
  const username = getCurrentUsername();
  const layoutKey = username ? `scada_layout_${username}` : 'scada_layout';
  const workspace = document.getElementById('workspace');
  const tabBar = document.getElementById('tab-bar');
  const newPageBtn = document.getElementById('new-page-btn');
  const newPageModal = document.getElementById('new-page-modal');
  const closeTabModal = document.getElementById('close-new-page-modal');
  const pageNameInput = document.getElementById('page-name-input');
  const createPageBtn = document.getElementById('create-page-btn');

 let tabs = [];
let activeTab = 0;
const isEditMode = document.body.dataset.editMode === 'true';

  function setActiveTabAndRender(idx) {
    activeTab = idx;
    setActiveTab(idx, tabBar, tabs, newPageBtn, workspace, isEditMode, layoutKey);
  }

  function getFreeValveSide(valveEl, otherEl, usedSides) {
  // Get all possible sides
  const allSides = ['left', 'right', 'up', 'down'];
  // Find the closest side
  const closest = getClosestValveSide(valveEl, otherEl);
  // If closest is free, use it
  if (!usedSides.includes(closest)) return closest;
  // Otherwise, pick the first free side (or stay on current)
  return allSides.find(side => !usedSides.includes(side)) || null;
}
  
  function rerenderPipes() {
  // Remove all existing pipes
  [...workspace.querySelectorAll('.pipe-indicator-block')].forEach(pipeEl => pipeEl.remove());

  // Helper: get used sides for a valve, except for the current pipe
  function getValveUsedSides(valveId, exceptPipeId) {
    return tabs[activeTab].content
      .filter(w => w.type === 'pipe-indicator' && w.connectedIds && w.connectedIds.includes(valveId) && w.id !== exceptPipeId)
      .map(w => {
        if (!w.valveSides) return null;
        const idx = w.connectedIds[0] === valveId ? 0 : 1;
        return w.valveSides ? w.valveSides[idx] : null;
      })
      .filter(Boolean);
  }

  // Render all pipes for the active tab
  tabs[activeTab].content.forEach(widgetData => {
    if (widgetData.type === 'pipe-indicator') {
      const [id1, id2] = widgetData.connectedIds || [];
      const el1 = workspace.querySelector(`[data-widgetid="${id1}"],[data-widget-id="${id1}"]`);
      const el2 = workspace.querySelector(`[data-widgetid="${id2}"],[data-widget-id="${id2}"]`);
      if (!el1 || !el2) return;

      // --- Valve-aware connection points with side locking ---
      let pt1, pt2;
      let side1 = null, side2 = null;

      // For each endpoint, if it's a valve, try to use the closest free side, else keep current
      if (el1.dataset.vectorType === 'valve') {
        if (!widgetData.valveSides) widgetData.valveSides = [null, null];
        const usedSides = getValveUsedSides(id1, widgetData.id);
        const closest = getClosestValveSide(el1, el2);
        const current = widgetData.valveSides[0];
        // Only switch if closest is free, else keep current
        if (!usedSides.includes(closest)) {
          side1 = closest;
        } else if (current && !usedSides.includes(current)) {
          side1 = current;
        } else {
          // Find any free side, or fallback to closest
          const allSides = ['left', 'right', 'up', 'down'];
          side1 = allSides.find(s => !usedSides.includes(s)) || closest;
        }
        widgetData.valveSides[0] = side1;
        pt1 = getValveConnectionPoint(el1, side1);
      } else {
        pt1 = getPipeEndpoint(el1);
      }

      if (el2.dataset.vectorType === 'valve') {
        if (!widgetData.valveSides) widgetData.valveSides = [null, null];
        const usedSides = getValveUsedSides(id2, widgetData.id);
        const closest = getClosestValveSide(el2, el1);
        const current = widgetData.valveSides[1];
        if (!usedSides.includes(closest)) {
          side2 = closest;
        } else if (current && !usedSides.includes(current)) {
          side2 = current;
        } else {
          const allSides = ['left', 'right', 'up', 'down'];
          side2 = allSides.find(s => !usedSides.includes(s)) || closest;
        }
        widgetData.valveSides[1] = side2;
        pt2 = getValveConnectionPoint(el2, side2);
      } else {
        pt2 = getPipeEndpoint(el2);
      }

      let x1 = pt1.x, y1 = pt1.y, x2 = pt2.x, y2 = pt2.y;
      const dx = x2 - x1;
      const dy = y2 - y1;
      const length = Math.sqrt(dx * dx + dy * dy);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;

      // Create pipe DOM
      const container = document.createElement('div');
      container.className = 'pipe-indicator-block';
      container.style.position = 'absolute';
      container.style.left = (x1 + x2) / 2 - length / 2 + 'px';
      container.style.top = (y1 + y2) / 2 - 9 + 'px';
      container.dataset.widgetId = widgetData.id;

      const pipe = document.createElement('div');
      pipe.className = 'pipe-indicator-pipe off';
      pipe.style.width = length + 'px';
      pipe.style.height = '4px';
      pipe.style.borderRadius = '2px';
      pipe.style.backgroundColor = widgetData.colorOff || '#888888';
      pipe.style.margin = '8px 0';
      pipe.style.transform = `rotate(${angle}deg)`;

      // Restore dataset if needed
      pipe.dataset.ip = widgetData.ip;
      pipe.dataset.port = widgetData.puerto;
      pipe.dataset.direccion = widgetData.direccion;
      pipe.dataset.colorOn = widgetData.colorOn;
      pipe.dataset.colorOff = widgetData.colorOff;

      container.appendChild(pipe);

      if (isEditMode) {
        container.addEventListener('contextmenu', e => {
          e.preventDefault();
          openConfigModal({
            container,
            pipe,
            isPipe: true
          }, tabs, activeTab, workspace, layoutKey);
        });
      }

      workspace.appendChild(container);
    }
  });
}
  // Show modal for new tab
  newPageBtn.onclick = () => {
    newPageModal.classList.add('show'); // to show
    pageNameInput.value = '';
    pageNameInput.focus();
closeTabModal.onclick = () => { newPageModal.classList.remove('show'); };
newPageModal.onclick = (e) => { if (e.target === newPageModal) newPageModal.classList.remove('show'); };
  }
// Create new tab
createPageBtn.onclick = () => {
  const name = pageNameInput.value.trim();
  // Check for duplicate name (case-insensitive)
  if (
    !name ||
    tabs.some(tab => tab.name.toLowerCase() === name.toLowerCase())
  ) {
    alert('El nombre de la página ya existe o es inválido. Por favor, elija otro nombre.');
    pageNameInput.focus();
    return;
  }
  tabs.push({ name, id: 'tab-' + Date.now(), content: [] });
  renderTabs(tabBar, tabs, activeTab, setActiveTabAndRender, newPageBtn);
  setActiveTabAndRender(tabs.length - 1);
  saveToLocal(tabs, layoutKey);
}
  newPageModal.classList.remove('show');

  tabBar.addEventListener('dblclick', (e) => {
  const tabEl = e.target.closest('.tab');
  if (tabEl) {
    const tabIndex = Array.from(tabBar.children).indexOf(tabEl);
    openTabConfigModal(tabIndex);
  }
});

// Load tabs and widgets from backend
const localTabs = localStorage.getItem(layoutKey);
if (localTabs) {
  tabs = JSON.parse(localTabs);
  if (!Array.isArray(tabs) || tabs.length === 0) {
    tabs = [{ name: 'Página 1', id: 'tab-' + Date.now(), content: [] }];
  }
  renderTabs(tabBar, tabs, activeTab, setActiveTabAndRender, newPageBtn);
  setActiveTabAndRender(0);

  // Remove existing widgets from workspace
  while (workspace.firstChild) workspace.removeChild(workspace.firstChild);

  // Render widgets for the active tab (except pipes)
  tabs[activeTab].content.forEach(widgetData => {
    let obj;
    if (widgetData.type === 'indicator') {
      obj = createIndicatorLight();
      obj.label.textContent = widgetData.nombre;
      obj.light.dataset.ip = widgetData.ip;
      obj.light.dataset.port = widgetData.puerto;
      obj.light.dataset.direccion = widgetData.direccion;
      obj.light.dataset.colorOn = widgetData.colorOn;
      obj.light.dataset.colorOff = widgetData.colorOff;
      obj.container.style.left = widgetData.posX + 'px';
      obj.container.style.top = widgetData.posY + 'px';
    } else if (widgetData.type === 'gauge') {
      obj = createGauge();
      obj.label.textContent = widgetData.nombre;
      obj.gauge.dataset.ip = widgetData.ip;
      obj.gauge.dataset.port = widgetData.puerto;
      obj.gauge.dataset.direccion = widgetData.direccion;
      obj.gauge.dataset.gaugeColor = widgetData.gaugeColor;
      obj.gauge.dataset.maxValue = widgetData.maxValue;
      obj.gauge.dataset.minValue = widgetData.minValue;
      obj.gauge.dataset.displayMode = widgetData.displayMode;
      obj.gauge.dataset.wordSize = widgetData.wordSize;
      obj.container.style.left = widgetData.posX + 'px';
      obj.container.style.top = widgetData.posY + 'px';
    } else if (widgetData.type === 'level') {
      obj = createLevelBar();
      obj.label.textContent = widgetData.nombre;
      obj.bar.dataset.ip = widgetData.ip;
      obj.bar.dataset.port = widgetData.puerto;
      obj.bar.dataset.direccion = widgetData.direccion;
      obj.bar.dataset.barColor = widgetData.barColor;
      obj.bar.dataset.maxValue = widgetData.maxValue;
      obj.bar.dataset.minValue = widgetData.minValue;
      obj.bar.dataset.displayMode = widgetData.displayMode;
      obj.bar.dataset.sourceType = widgetData.sourceType;
      obj.bar.dataset.orientation = widgetData.orientation;
      obj.bar.dataset.wordSize = widgetData.wordSize;
      obj.bar.style.backgroundColor = widgetData.barColor;
      obj.container.style.left = widgetData.posX + 'px';
      obj.container.style.top = widgetData.posY + 'px';
    } else if (widgetData.type === 'vector') {
        obj = createVectorNode();
        obj.label.textContent = widgetData.nombre;
        obj.container.style.left = widgetData.posX + 'px';
        obj.container.style.top = widgetData.posY + 'px';
        // Restore vectorType and orientation if present
        if (widgetData.vectorType) {
          obj.container.dataset.vectorType = widgetData.vectorType;
        }
        if (widgetData.vectorOrientation) {
          obj.container.dataset.vectorOrientation = widgetData.vectorOrientation;
        }
        updateVectorSymbol(
          obj.container,
          widgetData.vectorType || 'node',
          widgetData.vectorOrientation || 'horizontal'
        );
      // You may want to restore vectorType, orientation, etc. if you store them
    } else if (widgetData.type === 'button') {
      obj = createButton();
      obj.button.textContent = widgetData.nombre;
      obj.button.dataset.ip = widgetData.ip;
      obj.button.dataset.port = widgetData.puerto;
      obj.button.dataset.direccion = widgetData.direccion;
      obj.button.dataset.modo = widgetData.modo;
      obj.button.dataset.bgColor = widgetData.bgColor;
      obj.button.dataset.fontColor = widgetData.fontColor;
      obj.button.dataset.fontFamily = widgetData.fontFamily;
      obj.button.dataset.width = widgetData.width;
      obj.button.dataset.height = widgetData.height;
      obj.button.style.backgroundColor = widgetData.bgColor;
      obj.button.style.color = widgetData.fontColor;
      obj.button.style.fontFamily = widgetData.fontFamily;
      obj.button.style.width = widgetData.width + 'px';
      obj.button.style.height = widgetData.height + 'px';
      obj.container.style.left = widgetData.posX + 'px';
      obj.container.style.top = widgetData.posY + 'px';
    } else {
      // Skip pipes here, will render after all widgets
      return;
    }

    obj.container.dataset.widgetId = widgetData.id;
    workspace.appendChild(obj.container);

    // Add right-click handler for config modal and make draggable
    if (isEditMode) {
      obj.container.addEventListener('contextmenu', e => {
        e.preventDefault();
        openConfigModal(obj, tabs, activeTab, workspace, layoutKey);
      });

      makeDraggable(obj.container, {
        workspace,
        tabs,
        activeTab,
        updatePositionsPanel,
        saveToLocal,
        getValveConnectionPoint,
        getClosestValveSide,
        getPipeEndpoint,
        // Add this callback to update pipes after move:
        onDragEnd: rerenderPipes
      });
    }
  });

  // Render pipes after all widgets
  rerenderPipes();
} else {
  loadLayoutFromBackend(layoutKey, (newTabs) => { tabs = newTabs; }, renderTabs, setActiveTabAndRender);
}

// Drag & Drop logic for active tab
if (isEditMode) {
  document.querySelectorAll('.coil-item').forEach(item => {
    item.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', item.dataset.type);
    });
  });

  workspace.addEventListener('dragover', e => e.preventDefault());
workspace.addEventListener('drop', e => {
  e.preventDefault();
  const type = e.dataTransfer.getData('text/plain');
  let obj;
  if (type === 'indicator') {
    obj = createIndicatorLight();
  } else if (type === 'pipe-indicator') {
    obj = createPipeIndicator();
  } else if (type === 'gauge') {
    obj = createGauge();
  } else if (type === 'level') {
    obj = createLevelBar();
  } else if (type === 'vector') {
    obj = createVectorNode();
  } else {
    obj = createButton();
  }
  // Assign unique id
  const widgetId = 'widget-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
  obj.container.dataset.widgetId = widgetId;

  obj.container.style.left = e.offsetX + 'px';
  obj.container.style.top = e.offsetY + 'px';
  workspace.appendChild(obj.container);

  if (isEditMode) {
  obj.container.addEventListener('contextmenu', e => {
    e.preventDefault();
    openConfigModal(obj, tabs, activeTab, workspace, layoutKey);
  });
}

  if (isEditMode) {
    makeDraggable(obj.container, {
      workspace,
      tabs,
      activeTab,
      updatePositionsPanel,
      saveToLocal,
      getValveConnectionPoint,
      getClosestValveSide,
      getPipeEndpoint,
      onDragEnd: rerenderPipes
    });
  }

  tabs[activeTab].content.push({
    id: widgetId,
    type,
    nombre: type === 'button' ? obj.button.textContent :
           type === 'indicator' ? obj.label.textContent :
           type === 'gauge' ? obj.label.textContent :
           obj.label.textContent,
    ip: '192.168.0.201',
    puerto: '502',
    direccion: '8192',
    posX: e.offsetX,
    posY: e.offsetY
    // Add other default properties as needed
  });
  saveToLocal(tabs, layoutKey);

  openConfigModal(obj, tabs, activeTab, workspace, layoutKey); // Optional: only if you want config modal to open after drop

  updatePositionsPanel(workspace);
});
}

  // Panel to show element positions
  const positionsPanel = document.createElement('div');
  positionsPanel.id = 'positionsPanel';
  positionsPanel.style = `
    padding: 10px;
    background: #f4f4f4;
    border-top: 1px solid #ccc;
    font-family: monospace;
    height: 120px;
    overflow-y: auto;
    white-space: pre-wrap;
  `;
  positionsPanel.innerHTML = '<h4>Posiciones de elementos:</h4><pre id="positionsText">(sin datos aún)</pre>';
  workspace.insertAdjacentElement('afterend', positionsPanel);

// --- PIPE PLACEMENT MODE ---
let pipePlacementMode = false;
let pipeSelection = [];

const menuPipeItem = document.querySelector('.coil-item[data-type="pipe-indicator"]');
if (menuPipeItem) {
  menuPipeItem.addEventListener('click', () => {
    pipePlacementMode = true;
    pipeSelection = [];
    workspace.style.cursor = 'crosshair';
    alert('Selecciona dos elementos para conectar con una tubería.');
  });
}

workspace.addEventListener('click', function pipePlacementHandler(e) {
  if (!pipePlacementMode) return;
  // Only allow selecting workspace children (widgets)
  let el = e.target;
  while (el && el.parentElement !== workspace) el = el.parentElement;
  if (!el || el === workspace) return;
  // Only allow selecting valid widgets (not pipes)
  if (el.classList.contains('pipe-indicator-block')) return;
  pipeSelection.push(el);
  el.style.outline = '2px solid #00bfff';
  if (pipeSelection.length === 2) {
    pipeSelection.forEach(x => x.style.outline = '');
    const wsRect = workspace.getBoundingClientRect();

    // --- Valve-aware connection points ---
    let start = pipeSelection[0], end = pipeSelection[1];
let startType = start.dataset.vectorType;
let endType = end.dataset.vectorType;

// Lock the closest triangle base for each endpoint
let side1 = startType === 'valve' ? getClosestValveSide(start, end) : null;
let side2 = endType === 'valve' ? getClosestValveSide(end, start) : null;

// Get the actual connection points
let pt1 = startType === 'valve'
  ? getValveConnectionPoint(start, side1)
  : getPipeEndpoint(start);
let pt2 = endType === 'valve'
  ? getValveConnectionPoint(end, side2)
  : getPipeEndpoint(end);

let x1 = pt1.x, y1 = pt1.y, x2 = pt2.x, y2 = pt2.y;
const dx = x2 - x1;
const dy = y2 - y1;
const length = Math.sqrt(dx * dx + dy * dy);
const angle = Math.atan2(dy, dx) * 180 / Math.PI;

// Create thin pipe line, no label
const container = document.createElement('div');
container.className = 'pipe-indicator-block';
container.style.position = 'absolute';
container.style.left = (x1 + x2) / 2 - length / 2 + 'px';
container.style.top = (y1 + y2) / 2 - 9 + 'px';

const pipe = document.createElement('div');
pipe.className = 'pipe-indicator-pipe off';
pipe.style.width = length + 'px';
pipe.style.height = '4px'; // thin line
pipe.style.borderRadius = '2px';
pipe.style.backgroundColor = '#888888';
pipe.style.margin = '8px 0';
pipe.style.transform = `rotate(${angle}deg)`;

container.appendChild(pipe);

if (isEditMode) {
  container.addEventListener('contextmenu', e => {
    e.preventDefault();
    openConfigModal({
      container,
      pipe,
      isPipe: true
    }, tabs, activeTab, workspace, layoutKey);
  });
}

workspace.appendChild(container);
const widgetId = 'widget-' + Date.now() + '-' + Math.floor(Math.random() * 10000);
container.dataset.widgetId = widgetId;

tabs[activeTab].content.push({
  id: widgetId,
  type: 'pipe-indicator',
  ip: '192.168.0.201',
  puerto: '502',
  direccion: '8192',
  colorOn: '#00bfff',
  colorOff: '#888888',
  posX: (x1 + x2) / 2 - length / 2,
  posY: (y1 + y2) / 2 - 9,
  pipeLength: length,
  pipeAngle: angle,
  connectedIds: [pipeSelection[0].dataset.widgetId, pipeSelection[1].dataset.widgetId],
});

pipeSelection.forEach(sel => {
  const widget = tabs[activeTab].content.find(w => w.id === sel.dataset.widgetId);
  if (widget && widget.type === 'vector') {
    if (!widget.attachedPipeIds) widget.attachedPipeIds = [];
    widget.attachedPipeIds.push(widgetId); // widgetId is the new pipe's id
  }
});
saveToLocal(tabs, layoutKey);
updatePositionsPanel(workspace);
pipePlacementMode = false;
pipeSelection = [];
workspace.style.cursor = '';
  }
});

// --- END PIPE PLACEMENT MODE ---

const saveBtn = document.getElementById('saveLayout');
if (saveBtn) {
  saveBtn.onclick = () => {
    // Update the active tab's content with current workspace widgets
    // For pipe-indicator, always try to preserve pipeLength/pipeAngle from previous layout if not present in DOM
    tabs[activeTab].content = [...workspace.children].map(el => {
      const x = parseInt(el.style.left || '0', 10);
      const y = parseInt(el.style.top || '0', 10);
      const widgetId = el.dataset.widgetId;
      // Find previous data for this widget (if any)
      const prev = tabs[activeTab].content.find(w => w.id === widgetId);

      if (el.classList.contains('button-block')) {
        const b = el.querySelector('button');
        return {
          id: widgetId,
          type: 'button',
          nombre: b.textContent,
          ip: b.dataset.ip,
          puerto: b.dataset.port,
          direccion: b.dataset.direccion,
          modo: b.dataset.modo,
          bgColor: b.dataset.bgColor,
          fontColor: b.dataset.fontColor,
          fontFamily: b.dataset.fontFamily,
          width: b.dataset.width || '120',
          height: b.dataset.height || '40',
          posX: x,
          posY: y
        };
      } else if (el.classList.contains('indicator-block')) {
        const l = el.querySelector('.indicator-light');
        const label = el.querySelector('.indicator-label');
        return {
          id: widgetId,
          type: 'indicator',
          nombre: label.textContent,
          ip: l.dataset.ip,
          puerto: l.dataset.port,
          direccion: l.dataset.direccion,
          colorOn: l.dataset.colorOn || '#ffff00',
          colorOff: l.dataset.colorOff || '#888888',
          posX: x,
          posY: y
        };
      } else if (el.classList.contains('gauge-block')) {
        const g = el.querySelector('.gauge-arc');
        const label = el.querySelector('.gauge-label');
        return {
          id: widgetId,
          type: 'gauge',
          nombre: label.textContent,
          ip: g.dataset.ip,
          puerto: g.dataset.port,
          direccion: g.dataset.direccion,
          gaugeColor: g.dataset.gaugeColor || '#3498db',
          maxValue: g.dataset.maxValue || '100',
          minValue: g.dataset.minValue || '0',
          displayMode: g.dataset.displayMode || 'percentage',
          wordSize: g.dataset.wordSize || '2',
          posX: x,
          posY: y
        };
      } else if (el.classList.contains('level-block')) {
        const bar = el.querySelector('.level-fill');
        const label = el.querySelector('.level-label');
        return {
          id: widgetId,
          type: 'level',
          nombre: label.textContent,
          ip: bar.dataset.ip,
          puerto: bar.dataset.port,
          direccion: bar.dataset.direccion,
          barColor: bar.dataset.barColor || '#3498db',
          maxValue: bar.dataset.maxValue || '100',
          minValue: bar.dataset.minValue || '0',
          displayMode: bar.dataset.displayMode || 'percentage',
          sourceType: bar.dataset.sourceType || 'register',
          orientation: bar.dataset.orientation || 'vertical',
          wordSize: bar.dataset.wordSize || '1',
          posX: x,
          posY: y
        };
      } else if (el.classList.contains('pipe-indicator-block')) {
          const p = el.querySelector('.pipe-indicator-pipe');
          // No label for pipe-indicator
          let pipeLength = undefined;
          let pipeAngle = undefined;
          if (p && p.style.width) {
            pipeLength = parseFloat(p.style.width);
          } else if (prev && typeof prev.pipeLength !== 'undefined') {
            pipeLength = prev.pipeLength;
          }
          if (p && p.style.transform) {
            const match = p.style.transform.match(/rotate\((-?\d+(?:\.\d+)?)deg\)/);
            if (match) pipeAngle = parseFloat(match[1]);
          } else if (prev && typeof prev.pipeAngle !== 'undefined') {
            pipeAngle = prev.pipeAngle;
          }
          let connectedIds = prev && Array.isArray(prev.connectedIds) ? prev.connectedIds : undefined;
          return {
            id: widgetId,
            type: 'pipe-indicator',
            nombre: '', // No label for pipe-indicator
            ip: p.dataset.ip,
            puerto: p.dataset.port,
            direccion: p.dataset.direccion,
            colorOn: p.dataset.colorOn || '#00bfff',
            colorOff: p.dataset.colorOff || '#888888',
            posX: x,
            posY: y,
            ...(typeof pipeLength !== 'undefined' ? { pipeLength } : {}),
            ...(typeof pipeAngle !== 'undefined' ? { pipeAngle } : {}),
            ...(connectedIds ? { connectedIds } : {})
          };
        } else if (el.classList.contains('vector-node-block')) {
          const circle = el.querySelector('.vector-node-circle');
          const label = el.querySelector('.vector-node-label');
          return {
          id: widgetId,
          type: 'vector',
          nombre: label.textContent,
          posX: x,
          posY: y,
        };
      }
      return null;
    }).filter(item => item !== null);
    saveToLocal(tabs, layoutKey);

    // Save the whole tabs array!
    saveLayoutToBackend(tabs)
    .then(data => alert(data.status === 'ok' ? '✅ Layout guardado.' : '❌ Error al guardar.'))
    .catch(() => alert('❌ Error de red.'));
  };
}

  // Modal config logic
  const modal = document.getElementById('configModal');
  const nombreInput = document.getElementById('cfgNombre');
  const ipInput = document.getElementById('cfgIP');
  const puertoInput = document.getElementById('cfgPuerto');
  const direccionInput = document.getElementById('cfgDireccion');
  const modoInput = document.getElementById('cfgModo');
  const bgColorInput = document.getElementById('cfgBgColor');
  const fontColorInput = document.getElementById('cfgFontColor');
  const fontFamilyInput = document.getElementById('cfgFontFamily');
  const btnWidthInput = document.getElementById('cfgBtnWidth');
  const btnHeightInput = document.getElementById('cfgBtnHeight');
  const buttonExtras = document.getElementById('buttonExtras');
  const indicatorExtras = document.getElementById('indicatorExtras');
  const indicatorColorOnInput = document.getElementById('cfgIndicatorColorOn');
  const indicatorColorOffInput = document.getElementById('cfgIndicatorColorOff');
  const levelExtras = document.getElementById('levelExtras');
  const gaugeExtras = document.getElementById('gaugeExtras');
  const barColorInput = document.getElementById('cfgBarColor');
  const maxValueInput = document.getElementById('cfgMaxValue');
  const minValueInput = document.getElementById('cfgMinValue');
  const vectorExtras = document.getElementById('vectorExtras');
  const vectorTypeInput = document.getElementById('cfgVectorType');
  const displayModeInput = document.getElementById('cfgDisplayMode');
  const confirmBtn = document.getElementById('confirmConfig');
  const deleteBtn = document.getElementById('deleteButton');
  const cancelBtn = document.getElementById('cancelConfig');
  
  let currentTarget = null;
  
confirmBtn.onclick = () => {
  const currentTarget = window.currentTarget;
  if (!currentTarget || !currentTarget.container) {
    alert('No widget selected or widget is invalid.');
    return;
  }
  const { button, label, light, gauge, bar, pipe, isLight, isGauge, isLevel, isPipe, isVector, isButton } = window.currentTarget || {};
  const nombre = nombreInput.value;
  const ip = ipInput.value;
  const puerto = parseInt(puertoInput.value, 10);
  const direccion = parseInt(direccionInput.value, 10);
  const modo = modoInput.value;

  if (isLight) {
    label.textContent = nombre;
    light.dataset.ip = ip;
    light.dataset.port = puerto;
    light.dataset.direccion = direccion;
    light.dataset.colorOn = indicatorColorOnInput.value;
    light.dataset.colorOff = indicatorColorOffInput.value;
  } else if (isPipe) {
    label.textContent = nombre;
    pipe.dataset.ip = ip;
    pipe.dataset.port = puerto;
    pipe.dataset.direccion = direccion;
    pipe.dataset.colorOn = indicatorColorOnInput.value;
    pipe.dataset.colorOff = indicatorColorOffInput.value;
    pipe.style.backgroundColor = pipe.dataset.colorOff;

    // Propagate config changes to connected pipes
    const widgetId = currentTarget.container.dataset.widgetId;
    propagatePipeConfig(widgetId, {
      colorOn: indicatorColorOnInput.value,
      colorOff: indicatorColorOffInput.value,
      // Add other properties you want to propagate
    });
  } else if (isGauge) {
    label.textContent = nombre;
    gauge.dataset.ip = ip;
    gauge.dataset.port = puerto;
    gauge.dataset.direccion = direccion;
    gauge.dataset.gaugeColor = document.getElementById('cfgGaugeColor').value;
    gauge.dataset.maxValue = document.getElementById('cfgGaugeMaxValue').value;
    gauge.dataset.minValue = document.getElementById('cfgGaugeMinValue').value;
    gauge.dataset.displayMode = document.getElementById('cfgGaugeDisplayMode').value;
    gauge.dataset.wordSize = document.getElementById('cfgGaugeWordSize')?.value || '2';
  } else if (isLevel) {
    label.textContent = nombre;
    bar.dataset.ip = ip;
    bar.dataset.port = puerto;
    bar.dataset.direccion = direccion;
    bar.dataset.barColor = barColorInput.value;
    bar.dataset.maxValue = maxValueInput.value;
    bar.dataset.minValue = minValueInput.value;
    bar.dataset.displayMode = displayModeInput.value;
    bar.dataset.sourceType = document.getElementById('cfgSourceType').value;
    bar.dataset.wordSize = document.getElementById('cfgWordSize').value;
    bar.dataset.orientation = document.getElementById('cfgOrientation').value;
    bar.style.backgroundColor = barColorInput.value;
  } else if (isVector) {
    label.textContent = nombreInput.value;
    currentTarget.container.dataset.vectorType = vectorTypeInput.value;
    let orientation = '';
    if (vectorTypeInput.value === 'valve') {
      orientation = document.getElementById('cfgVectorOrientation').value;
      currentTarget.container.dataset.vectorOrientation = orientation;
      // --- Update valveSides for all connected pipes ---
      const valveId = currentTarget.container.dataset.widgetId;
      tabs[activeTab].content.forEach(item => {
        if (item.type === 'pipe-indicator' && item.connectedIds && item.connectedIds.length === 2) {
          if (!Array.isArray(item.valveSides)) item.valveSides = [null, null];
          if (item.connectedIds[0] === valveId) {
            item.valveSides[0] = getClosestValveSide(currentTarget.container, workspace.querySelector(`[data-widget-id='${item.connectedIds[1]}']`));
          }
          if (item.connectedIds[1] === valveId) {
            item.valveSides[1] = getClosestValveSide(currentTarget.container, workspace.querySelector(`[data-widget-id='${item.connectedIds[0]}']`));
          }
        }
      });
    } else {
      delete currentTarget.container.dataset.vectorOrientation;
    }
    // Redraw vector symbol
    updateVectorSymbol(currentTarget.container, vectorTypeInput.value, orientation || 'horizontal');

    // --- Save to tabs content ---
    const widgetId = currentTarget.container.dataset.widgetId;
    const widget = tabs[activeTab].content.find(w => w.id === widgetId);
    if (widget) {
      widget.vectorType = vectorTypeInput.value;
      widget.vectorOrientation = orientation || '';
      widget.nombre = nombreInput.value;
    }
  }

  // --- Only run this if editing a button ---
  if (isButton && button) {
    const bg = bgColorInput.value;
    const font = fontColorInput.value;
    const fontFam = fontFamilyInput.value;
    const width = btnWidthInput.value || '120';
    const height = btnHeightInput.value || '40';

    button.textContent = nombre;
    button.dataset.ip = ip;
    button.dataset.port = puerto;
    button.dataset.direccion = direccion;
    button.dataset.modo = modo;
    button.dataset.bgColor = bg;
    button.dataset.fontColor = font;
    button.dataset.fontFamily = fontFam;
    button.dataset.width = width;
    button.dataset.height = height;

    button.style.backgroundColor = bg;
    button.style.color = font;
    button.style.fontFamily = fontFam;
    button.style.width = width + 'px';
    button.style.height = height + 'px';

    const fontSize = Math.max(12, Math.floor(parseInt(height) * 0.4));
    button.style.fontSize = fontSize + 'px';

    const hoverColor = darkenColor(bg);
    button.onmouseover = () => button.style.backgroundColor = hoverColor;
    button.onmouseout = () => button.style.backgroundColor = bg;

    button.onclick = () => {
      if (modo === 'pulse') {
        button.disabled = true;
        fetch('/pulse-dynamic', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ip, port: puerto, address: direccion })
        }).finally(() => button.disabled = false);
      } else {
        fetch(`/coil-status?ip=${ip}&port=${puerto}&address=${direccion}`)
          .then(res => res.json())
          .then(data => alert(`${nombre}: ${data.coil ? '🟢 Encendido' : '⚫ Apagado'}`));
      }
    };
  }

  closeModal();
  saveToLocal(tabs, layoutKey);
}
});
