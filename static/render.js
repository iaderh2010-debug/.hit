import {
  createButton,
  createIndicatorLight,
  createGauge,
  createLevelBar,
  createPipeIndicator,
  createVectorNode
} from './createElements.js';

import {
  darkenColor
} from './ui.js';

import {
  makeDraggable
} from './placement.js';

import {
  saveToLocal
} from './dataFlow.js';

import {
  getValveConnectionPoint,
  getClosestValveSide,
  getPipeEndpoint
} from './geo&Cnntn.js';

export function renderTabs(tabBar, tabs, activeTab, setActiveTab, newPageBtn) {
  tabBar.querySelectorAll('.tab-btn').forEach(btn => btn.remove());
  tabs.forEach((tab, idx) => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn' + (activeTab === idx ? ' active' : '');
    btn.textContent = tab.name || `Página ${idx + 1}`;
    btn.onclick = () => setActiveTab(idx);

    // Right-click (context menu) for tab options
    btn.oncontextmenu = (e) => {
      e.preventDefault();
      openTabConfigModal(idx);
    };

    tabBar.insertBefore(btn, newPageBtn);
  });
}
export function updatePositionsPanel(workspace) {
    const text = [...workspace.children].map((el, i) => {
      const x = parseInt(el.style.left || '0', 10);
      const y = parseInt(el.style.top || '0', 10);
      const name = el.querySelector('button')?.textContent || el.querySelector('.indicator-label')?.textContent;
      return `Elemento ${i + 1}: "${name}" — x: ${x}px, y: ${y}px`;
    }).join('\n');
    const posEl = document.getElementById('positionsText');
    if (posEl) posEl.textContent = text || '(no hay elementos)';
  }
export function setActiveTab(idx, tabBar, tabs, newPageBtn, workspace, isEditMode, layoutKey) {
  renderTabs(tabBar, tabs, idx, (idx) => setActiveTab(idx, tabBar, tabs, newPageBtn, workspace, isEditMode), newPageBtn);
  workspace.innerHTML = '';
  tabs[idx].content.forEach(item => {
    let container;
    if (item.type === 'button') {
      const obj = createButton();
      container = obj.container;
      const btn = obj.button;
      container.dataset.widgetId = item.id;
      btn.textContent = item.nombre;
      btn.dataset.ip = item.ip;
      btn.dataset.port = item.puerto;
      btn.dataset.direccion = item.direccion;
      btn.dataset.modo = item.modo;
      btn.dataset.bgColor = item.bgColor;
      btn.dataset.fontColor = item.fontColor;
      btn.dataset.fontFamily = item.fontFamily;
      btn.dataset.width = item.width;
      btn.dataset.height = item.height;

      // Use fallback if bgColor is missing or invalid
      let bgColor = item.bgColor;
      if (!bgColor || bgColor === "undefined") bgColor = "#3498db";
      btn.style.backgroundColor = bgColor;

      btn.style.color = item.fontColor;
      let fontFamily = item.fontFamily;
      if (!fontFamily || fontFamily === "undefined") fontFamily = "Arial";
      btn.style.fontFamily = fontFamily;
      btn.dataset.fontFamily = fontFamily;
      btn.style.width = item.width + 'px';
      btn.style.height = item.height + 'px';
      const fontSize = Math.max(12, Math.floor(parseInt(item.height) * 0.4));
      btn.style.fontSize = fontSize + 'px';

      const hoverColor = darkenColor(bgColor);
      btn.onmouseover = () => btn.style.backgroundColor = hoverColor;
      btn.onmouseout = () => btn.style.backgroundColor = bgColor;
    } else if (item.type === 'indicator') {
      const obj = createIndicatorLight();
      container = obj.container;
      container.dataset.widgetId = item.id;
      obj.label.textContent = item.nombre;
      obj.light.dataset.ip = item.ip;
      obj.light.dataset.port = item.puerto;
      obj.light.dataset.direccion = item.direccion;

      // Use fallback if colorOn/colorOff are missing or invalid
      let colorOn = item.colorOn;
      if (!colorOn || colorOn === "undefined") colorOn = "#ffff00";
      obj.light.dataset.colorOn = colorOn;

      let colorOff = item.colorOff;
      if (!colorOff || colorOff === "undefined") colorOff = "#888888";
      obj.light.dataset.colorOff = colorOff;

      obj.light.style.backgroundColor = obj.light.dataset.colorOff;
    } else if (item.type === 'gauge') {
      const obj = createGauge();
      container = obj.container;
      container.dataset.widgetId = item.id;
      obj.label.textContent = item.nombre;
      obj.gauge.dataset.ip = item.ip;
      obj.gauge.dataset.port = item.puerto;
      obj.gauge.dataset.direccion = item.direccion;

      // Use fallback if gaugeColor is missing or invalid
      let gaugeColor = item.gaugeColor;
      if (!gaugeColor || gaugeColor === "undefined") gaugeColor = "#3498db";
      obj.gauge.dataset.gaugeColor = gaugeColor;

      obj.gauge.dataset.maxValue = item.maxValue;
      obj.gauge.dataset.minValue = item.minValue;
      obj.gauge.dataset.displayMode = item.displayMode;
      obj.gauge.dataset.wordSize = item.wordSize;

          if (typeof item.value !== 'undefined') {
        setGaugeValue(obj.gauge, item.value);
      }
    } else if (item.type === 'level') {
      const obj = createLevelBar();
      container = obj.container;
      container.dataset.widgetId = item.id;
      obj.label.textContent = item.nombre;
      obj.bar.dataset.ip = item.ip;
      obj.bar.dataset.port = item.puerto;
      obj.bar.dataset.direccion = item.direccion;

      // Use fallback if barColor is missing or invalid
      let barColor = item.barColor;
      if (!barColor || barColor === "undefined") barColor = "#3498db";
      obj.bar.dataset.barColor = barColor;
      obj.bar.style.backgroundColor = barColor;

      obj.bar.dataset.maxValue = item.maxValue;
      obj.bar.dataset.minValue = item.minValue;
      obj.bar.dataset.displayMode = item.displayMode;
      obj.bar.dataset.sourceType = item.sourceType;
      obj.bar.dataset.orientation = item.orientation;
      obj.bar.dataset.wordSize = item.wordSize;

          if (typeof item.value !== 'undefined') {
        setLevelFill(obj.bar, item.value);
      }
    } else if (item.type === 'pipe-indicator') {
  const obj = createPipeIndicator();
  container = obj.container;
  container.dataset.widgetId = item.id;
  obj.pipe.dataset.ip = item.ip;
  obj.pipe.dataset.port = item.puerto;
  obj.pipe.dataset.direccion = item.direccion;
  let colorOn = item.colorOn;
  if (!colorOn || colorOn === "undefined") colorOn = "#00bfff";
  obj.pipe.dataset.colorOn = colorOn;
  let colorOff = item.colorOff;
  if (!colorOff || colorOff === "undefined") colorOff = "#888888";
  obj.pipe.dataset.colorOff = colorOff;
  obj.pipe.style.backgroundColor = obj.pipe.dataset.colorOff;

  // --- Always recalculate endpoints if connectedIds exist ---
  if (item.connectedIds && item.connectedIds.length === 2) {
    const el1 = workspace.querySelector(`[data-widget-id='${item.connectedIds[0]}']`);
    const el2 = workspace.querySelector(`[data-widget-id='${item.connectedIds[1]}']`);
    if (el1 && el2) {
      const wsRect = workspace.getBoundingClientRect();
      const getPipeEndpoint = (el, side) => {
        if (el.dataset.vectorType === 'valve') {
          const orientation = el.dataset.vectorOrientation || 'horizontal';
          if (orientation === 'vertical') {
            return getValveConnectionPoint(el, side);
          } else {
            return getValveConnectionPoint(el, side);
          }
        } else {
          const rect = el.getBoundingClientRect();
          return {
            x: (rect.left + rect.right) / 2 - wsRect.left,
            y: (rect.top + rect.bottom) / 2 - wsRect.top
          };
        }
      };
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
      obj.pipe.style.width = length + 'px';
      obj.pipe.style.transform = `rotate(${angle}deg)`;
      container.style.left = (x1 + x2) / 2 - length / 2 + 'px';
      container.style.top = (y1 + y2) / 2 - 9 + 'px';
    } else {
      // fallback to saved position
      container.style.left = item.posX + 'px';
      container.style.top = item.posY + 'px';
      if (item.pipeLength) obj.pipe.style.width = item.pipeLength + 'px';
      if (item.pipeAngle !== undefined) obj.pipe.style.transform = `rotate(${item.pipeAngle}deg)`;
    }
  } else {
    // fallback to saved position
    container.style.left = item.posX + 'px';
    container.style.top = item.posY + 'px';
    if (item.pipeLength) obj.pipe.style.width = item.pipeLength + 'px';
    if (item.pipeAngle !== undefined) obj.pipe.style.transform = `rotate(${item.pipeAngle}deg)`;
  }
  } else if (item.type === 'vector') {
      const obj = createVectorNode();
      container = obj.container;
      container.dataset.widgetId = item.id;
      obj.label.textContent = item.nombre;
    }
    if (container) {
      container.style.left = item.posX + 'px';
      container.style.top = item.posY + 'px';
      workspace.appendChild(container);
      // Only make draggable if not a pipe-indicator
      if (isEditMode && item.type !== 'pipe-indicator') makeDraggable(container, {
        workspace,
        tabs,
        activeTab: idx,
        updatePositionsPanel,
        saveToLocal,
        layoutKey,
        getValveConnectionPoint,
        getClosestValveSide,
        getPipeEndpoint
      });
    }
  });
  updatePositionsPanel(workspace);
}
export function updateVectorSymbol(container, type, orientation = 'horizontal') {
  const circle = container.querySelector('.vector-node-circle');
  if (!circle) return;
  circle.innerHTML = '';
  if (type === 'valve') {
    circle.style.backgroundColor = 'transparent';
    circle.style.boxShadow = 'none';
    circle.style.border = 'none';
    circle.style.position = 'relative';
    circle.style.width = '48px';
    circle.style.height = '48px';
    circle.style.display = 'flex';
    circle.style.alignItems = 'center';
    circle.style.justifyContent = 'center';

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("width", "48");
    svg.setAttribute("height", "48");
    svg.setAttribute("viewBox", "0 0 48 48");

    // Triangles pointing toward each other, scaled up
    const leftTriangle = document.createElementNS(svgNS, "polygon");
    leftTriangle.setAttribute("points", "4,12 24,24 4,36");
    leftTriangle.setAttribute("fill", "#2196f3");

    const rightTriangle = document.createElementNS(svgNS, "polygon");
    rightTriangle.setAttribute("points", "44,12 24,24 44,36");
    rightTriangle.setAttribute("fill", "#2196f3");

    svg.appendChild(leftTriangle);
    svg.appendChild(rightTriangle);

    // Rotate for vertical orientation
    if (orientation === 'vertical') {
      svg.style.transform = 'rotate(90deg)';
    } else {
      svg.style.transform = '';
    }

    circle.appendChild(svg);
  } else {
    circle.style.backgroundColor = '#ff9800';
    circle.style.boxShadow = '';
    circle.style.border = '2px solid #333';
    circle.style.position = '';
    circle.style.width = '24px';
    circle.style.height = '24px';
  }
}
export function setGaugeValue(arc, value) {
  const max = 100;
  const dashoffset = 126 - (value / max) * 126;
  arc.setAttribute('stroke-dashoffset', dashoffset);
}
export function setLevelFill(bar, value) {
  bar.style.height = value + '%';
}