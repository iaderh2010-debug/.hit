document.addEventListener('DOMContentLoaded', () => {
  const workspace = document.getElementById('workspace');
  const isEditMode = document.body.dataset.editMode === 'true';

function setGaugeValue(arc, value) {
  const max = 100;
  const dashoffset = 126 - (value / max) * 126;
  arc.setAttribute('stroke-dashoffset', dashoffset);
}
// HSL darkener
  function darkenColor(hex, factor = 0.8) {
    const r = parseInt(hex.slice(1, 3), 16) / 255;
    const g = parseInt(hex.slice(3, 5), 16) / 255;
    const b = parseInt(hex.slice(5, 7), 16) / 255;
    const hls = RGBToHLS(r, g, b);
    hls[1] *= factor;
    const [r2, g2, b2] = HLSToRGB(...hls);
    return '#' + [r2, g2, b2].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
  }
  function RGBToHLS(r, g, b) {
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0, s, l = (max + min) / 2;
    if (max === min) s = h = 0;
    else {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return [h, l, s];
  }
  function HLSToRGB(h, l, s) {
    function hue2rgb(p, q, t) {
      if (t < 0) t += 1; if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    }
    let r, g, b;
    if (s === 0) r = g = b = l;
    else {
      const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
      const p = 2 * l - q;
      r = hue2rgb(p, q, h + 1 / 3);
      g = hue2rgb(p, q, h);
      b = hue2rgb(p, q, h - 1 / 3);
    }
    return [r, g, b];
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

  // Drag & Drop logic
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
        } else if (type === 'gauge') {
          obj = createGauge();
        } else if (type === 'level') {
          obj = createLevelBar();
        } else {
          obj = createButton();
        }
      obj.container.style.left = e.offsetX + 'px';
      obj.container.style.top = e.offsetY + 'px';
      workspace.appendChild(obj.container);
      openConfigModal(obj);
      updatePositionsPanel();
    });
  }


 function createButton() {
    const container = document.createElement('div');
    container.className = 'button-block';
    container.style.position = 'absolute';
    container.style.left = '0px';
    container.style.top = '0px';

    const button = document.createElement('button');
    button.textContent = 'Botón sin nombre';
    container.appendChild(button);

    if (isEditMode) {
      button.addEventListener('contextmenu', e => {
        e.preventDefault();
        openConfigModal({ container, button });
      });
      makeDraggable(container);
    }

    return { container, button };
  }

  function createIndicatorLight() {
    const container = document.createElement('div');
    container.className = 'indicator-block';
    container.style.position = 'absolute';
    container.style.left = '0px';
    container.style.top = '0px';

    const label = document.createElement('div');
    label.textContent = 'Luz sin nombre';
    label.className = 'indicator-label';

    const light = document.createElement('div');
    light.className = 'indicator-light off';

    container.appendChild(label);
    container.appendChild(light);

    if (isEditMode) {
      container.addEventListener('contextmenu', e => {
        e.preventDefault();
        openConfigModal({ container, label, light, isLight: true });
      });
      makeDraggable(container);
    }

    return { container, label, light, isLight: true };
  }

function createGauge() {
  const container = document.createElement('div');
  container.className = 'gauge-block';
  container.style.position = 'absolute';
  container.style.left = '0px';
  container.style.top = '0px';

  const label = document.createElement('div');
  label.textContent = 'Medidor sin nombre';
  label.className = 'gauge-label';

  // Create SVG gauge
  const gaugeWrapper = document.createElement('div');
  gaugeWrapper.className = 'gauge-wrapper';

  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 100 50");
  svg.classList.add('gauge-svg');

  const backgroundArc = document.createElementNS("http://www.w3.org/2000/svg", "path");
  backgroundArc.setAttribute("d", "M10,50 A40,40 0 0,1 90,50");
  backgroundArc.setAttribute("fill", "none");
  backgroundArc.setAttribute("stroke", "#ddd");
  backgroundArc.setAttribute("stroke-width", "10");

  const foregroundArc = document.createElementNS("http://www.w3.org/2000/svg", "path");
  foregroundArc.setAttribute("d", "M10,50 A40,40 0 0,1 90,50");
  foregroundArc.setAttribute("fill", "none");
  foregroundArc.setAttribute("stroke", "#3498db");
  foregroundArc.setAttribute("stroke-width", "10");
  foregroundArc.setAttribute("stroke-dasharray", "126");
  foregroundArc.setAttribute("stroke-dashoffset", "126");
  foregroundArc.setAttribute("stroke-linecap", "round");
  foregroundArc.classList.add('gauge-arc');

  svg.appendChild(backgroundArc);
  svg.appendChild(foregroundArc);
  gaugeWrapper.appendChild(svg);

  container.appendChild(label);
  container.appendChild(gaugeWrapper);

  container.label = label;
  container.gauge = foregroundArc;
  container.isGauge = true;

  if (isEditMode) {
    container.addEventListener('contextmenu', e => {
      e.preventDefault();
      openConfigModal({ container, label, gauge: foregroundArc, isGauge: true });
    });
    makeDraggable(container);
  }

  return { container, label, gauge: foregroundArc, isGauge: true };
}

function createLevelBar() {
  const container = document.createElement('div');
  container.className = 'level-block';
  container.style.position = 'absolute';
  container.style.left = '0px';
  container.style.top = '0px';

  const label = document.createElement('div');
  label.className = 'level-label';
  label.textContent = 'Nivel sin nombre';

  const barWrapper = document.createElement('div');
  barWrapper.className = 'level-wrapper';

  const barFill = document.createElement('div');
  barFill.className = 'level-fill';

  const percentLabel = document.createElement('div');
  percentLabel.className = 'level-percent-label';
  percentLabel.textContent = '0%';

  // ✅ Graduation lines
  const maxLabel = document.createElement('div');
  maxLabel.className = 'level-top-line';
  maxLabel.textContent = '100%';

  const minLabel = document.createElement('div');
  minLabel.className = 'level-bottom-line';
  minLabel.textContent = '0%';

  // Assemble structure
  barWrapper.appendChild(barFill);
  barWrapper.appendChild(percentLabel);
  barWrapper.appendChild(maxLabel);
  barWrapper.appendChild(minLabel);

  container.appendChild(label);
  container.appendChild(barWrapper);

  // Attach for later reference
  container.label = label;
  container.bar = barFill;
  container.percentLabel = percentLabel;
  container.minLabel = minLabel;
  container.maxLabel = maxLabel;
  container.displayMode = 'percentage'; // default
  container.isLevel = true;

  if (isEditMode) {
    container.addEventListener('contextmenu', e => {
      e.preventDefault();
      openConfigModal(container);
    });
    makeDraggable(container);
  }

    return {
    container,
    label,
    bar: barFill,
    percentLabel,
    minLabel,
    maxLabel,
    isLevel: true
  };
}

const saveBtn = document.getElementById('saveLayout');
if (saveBtn) {
  saveBtn.onclick = () => {
    const layout = [...workspace.children].map(el => {
      const x = parseInt(el.style.left || '0', 10);
      const y = parseInt(el.style.top || '0', 10);

      if (el.classList.contains('button-block')) {
        const b = el.querySelector('button');
        return {
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
          type: 'indicator',
          nombre: label.textContent,
          ip: l.dataset.ip,
          puerto: l.dataset.port,
          direccion: l.dataset.direccion,
          posX: x,
          posY: y
        };
      } else if (el.classList.contains('gauge-block')) {
        const g = el.querySelector('.gauge-arc');
        const label = el.querySelector('.gauge-label');
        return {
          type: 'gauge',
          nombre: label.textContent,
          ip: g.dataset.ip,
          puerto: g.dataset.port,
          direccion: g.dataset.direccion,
          posX: x,
          posY: y
        };
      } else if (el.classList.contains('level-block')) {
        const bar = el.querySelector('.level-fill');
        const label = el.querySelector('.level-label');
        return {
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
      }
      return null;
    }).filter(item => item !== null); // avoid nulls from unknown types

        fetch('/save-layout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ layout })
    })
    .then(res => res.json())
    .then(data => alert(data.status === 'ok' ? '✅ Layout guardado.' : '❌ Error al guardar.'))
    .catch(() => alert('❌ Error de red.'));
  }; 

  function setLevelFill(bar, value) {
  bar.style.height = value + '%';
}

  function makeDraggable(element) {
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
    });

    document.addEventListener('mouseup', () => {
      if (dragging) {
        dragging = false;
        element.style.zIndex = '';
        updatePositionsPanel();
      }
    });
  }

  function updatePositionsPanel() {
    const text = [...workspace.children].map((el, i) => {
      const x = parseInt(el.style.left || '0', 10);
      const y = parseInt(el.style.top || '0', 10);
      const name = el.querySelector('button')?.textContent || el.querySelector('.indicator-label')?.textContent;
      return `Elemento ${i + 1}: "${name}" — x: ${x}px, y: ${y}px`;
    }).join('\n');
    const posEl = document.getElementById('positionsText');
    if (posEl) posEl.textContent = text || '(no hay elementos)';
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
  const levelExtras = document.getElementById('levelExtras');
  const barColorInput = document.getElementById('cfgBarColor');
  const maxValueInput = document.getElementById('cfgMaxValue');
  const minValueInput = document.getElementById('cfgMinValue');
  const displayModeInput = document.getElementById('cfgDisplayMode');
  const confirmBtn = document.getElementById('confirmConfig');
  const deleteBtn = document.getElementById('deleteButton');
  const cancelBtn = document.getElementById('cancelConfig');

  let currentTarget = null;

  function openConfigModal(target) {
  currentTarget = target;

  // Hide all optional config sections
  buttonExtras.style.display = 'none';
  //indicatorExtras.style.display = 'none';
  levelExtras.style.display = 'none';
  //linkExtras.style.display = 'none';

  if (target.isLight) {
    nombreInput.value = target.label.textContent;
    modoInput.value = 'read';
    indicatorExtras.style.display = 'block';
  } else if (target.isGauge) {
    nombreInput.value = target.label.textContent;
    modoInput.value = 'read';
    // (no extras to show yet for gauge)
  } else if (target.isLevel) {
  nombreInput.value = target.label.textContent;
  modoInput.value = 'read';
  barColorInput.value = target.bar.dataset.barColor || '#3498db';
  maxValueInput.value = target.bar.dataset.maxValue || '100';
  minValueInput.value = target.bar.dataset.minValue || '0';
  displayModeInput.value = target.bar.dataset.displayMode || 'percentage';
  const sourceTypeInput = document.getElementById('cfgSourceType');
  sourceTypeInput.value = target.bar.dataset.sourceType || 'register';
  const wordSizeInput = document.getElementById('cfgWordSize');
  wordSizeInput.value = target.bar.dataset.wordSize || '1';
  const orientationInput = document.getElementById('cfgOrientation');
  orientationInput.value = target.bar.dataset.orientation || 'vertical';
  levelExtras.style.display = 'block';
  } else {
    const btn = target.button;
    nombreInput.value = btn.textContent;
    modoInput.value = btn.dataset.modo || 'pulse';
    bgColorInput.value = btn.dataset.bgColor || '#3498db';
    fontColorInput.value = btn.dataset.fontColor || '#ffffff';
    fontFamilyInput.value = btn.dataset.fontFamily || 'Arial';
    btnWidthInput.value = btn.dataset.width || '120';
    btnHeightInput.value = btn.dataset.height || '40';
    buttonExtras.style.display = 'block'; // ✅ show button options
  }

  ipInput.value =
    target.button?.dataset.ip ??
    target.light?.dataset.ip ??
    target.gauge?.dataset.ip ??
    target.bar?.dataset.ip ??      // ✅ added for level bar
    '192.168.0.201';

  puertoInput.value =
    target.button?.dataset.port ??
    target.light?.dataset.port ??
    target.gauge?.dataset.port ??
    target.bar?.dataset.port ??    // ✅ added for level bar
    '502';

  direccionInput.value =
    target.button?.dataset.direccion ??
    target.light?.dataset.direccion ??
    target.gauge?.dataset.direccion ??
    target.bar?.dataset.direccion ?? // ✅ added for level bar
    '8192';

  modal.classList.add('show');
}

  function closeModal() {
    modal.classList.remove('show');
    updatePositionsPanel();
  }

confirmBtn.onclick = () => {
  const { button, label, light, gauge, bar, isLight, isGauge, isLevel } = currentTarget;
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
  } else if (isGauge) {
    label.textContent = nombre;
    gauge.dataset.ip = ip;
    gauge.dataset.port = puerto;
    gauge.dataset.direccion = direccion;
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

    bar.style.backgroundColor = barColorInput.value;
  } else {
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
};

  deleteBtn.onclick = () => {
    if (currentTarget?.container) {
      currentTarget.container.remove();
      updatePositionsPanel();
    }
    closeModal();
  };
  cancelBtn.onclick = closeModal;

  // Load layout from server if any
fetch('/get-layout')
  .then(res => res.json())
  .then(data => {
    if (!data.layout) return;

    data.layout.forEach(item => {
      let container;

      if (item.type === 'button') {
        const obj = createButton();
        container = obj.container;
        const btn = obj.button;

        btn.textContent = item.nombre;
        btn.dataset.ip = item.ip;
        btn.dataset.port = item.puerto;
        btn.dataset.direccion = item.direccion;
        btn.dataset.modo = item.modo;
        btn.dataset.bgColor = item.bgColor || '#3498db';
        btn.dataset.fontColor = item.fontColor || '#ffffff';
        btn.dataset.fontFamily = item.fontFamily || 'Arial';
        btn.dataset.width = item.width || '120';
        btn.dataset.height = item.height || '40';

        btn.style.backgroundColor = btn.dataset.bgColor;
        btn.style.color = btn.dataset.fontColor;
        btn.style.fontFamily = btn.dataset.fontFamily;
        btn.style.width = btn.dataset.width + 'px';
        btn.style.height = btn.dataset.height + 'px';
        const fontSize = Math.max(12, Math.floor(parseInt(btn.dataset.height) * 0.4));
        btn.style.fontSize = fontSize + 'px';

        const hoverColor = darkenColor(btn.dataset.bgColor);
        btn.addEventListener('mouseover', () => btn.style.backgroundColor = hoverColor);
        btn.addEventListener('mouseout', () => btn.style.backgroundColor = btn.dataset.bgColor);

      } else if (item.type === 'indicator') {
        const obj = createIndicatorLight();
        container = obj.container;
        obj.label.textContent = item.nombre;
        obj.light.dataset.ip = item.ip;
        obj.light.dataset.port = item.puerto;
        obj.light.dataset.direccion = item.direccion;

      } else if (item.type === 'gauge') {
        const obj = createGauge();
        container = obj.container;
        obj.label.textContent = item.nombre || 'Medidor';
        obj.gauge.dataset.ip = item.ip;
        obj.gauge.dataset.port = item.puerto;
        obj.gauge.dataset.direccion = item.direccion;

      } else if (item.type === 'level') {
        const obj = createLevelBar();
        container = obj.container;
        obj.label.textContent = item.nombre || 'Nivel';
        obj.bar.dataset.ip = item.ip;
        obj.bar.dataset.port = item.puerto;
        obj.bar.dataset.direccion = item.direccion;
        obj.bar.dataset.barColor = item.barColor || '#3498db';
        obj.bar.dataset.maxValue = item.maxValue || '100';
        obj.bar.style.backgroundColor = obj.bar.dataset.barColor;

        // Live updates only in view mode
        if (!isEditMode) {
          const sourceType = item.sourceType || 'register';
          const wordSize = parseInt(item.wordSize || '1', 10);
          setInterval(() => {
            if (sourceType === 'bit') {
              const url = `/coil-status?ip=${item.ip}&port=${item.puerto}&address=${item.direccion}`;
              fetch(url)
                .then(res => res.json())
                .then(data => {
                  let rawValue = data.coil ? 1 : 0;
                  const min = parseFloat(item.minValue || '0');
                  const max = parseFloat(item.maxValue || '100');
                  const range = max - min;
                  const percent = range > 0 ? ((rawValue - min) / range) * 100 : 0;
                  const clamped = Math.max(0, Math.min(100, percent));
                  const orientation = item.orientation || 'vertical';
                  if (orientation === 'horizontal') {
                    obj.bar.style.width = clamped + '%';
                    obj.bar.style.height = '100%';
                  } else {
                    obj.bar.style.height = clamped + '%';
                    obj.bar.style.width = '100%';
                  }
                  const label = obj.container.querySelector('.level-percent-label');
                  if (label) label.textContent = `${Math.round(clamped)}%`;
                })
                .catch(() => {
                  obj.bar.style.height = '0%';
                  const label = obj.container.querySelector('.level-percent-label');
                  if (label) label.textContent = '0%';
                });
            } else {
              const url = `/register-value?ip=${item.ip}&port=${item.puerto}&address=${item.direccion}&words=${wordSize}`;
              fetch(url)
                .then(res => res.json())
                .then(data => {
                  let rawValue;
                  if (wordSize === 2 && Array.isArray(data.value)) {
                    // Combine two 16-bit registers into a 32-bit integer (big-endian)
                    rawValue = (data.value[0] << 16) | data.value[1];
                  } else {
                    rawValue = parseFloat(Array.isArray(data.value) ? data.value[0] : data.value);
                  }
                  const min = parseFloat(item.minValue || '0');
                  const max = parseFloat(item.maxValue || '100');
                  const range = max - min;
                  const percent = range > 0 ? ((rawValue - min) / range) * 100 : 0;
                  const clamped = Math.max(0, Math.min(100, percent));
                  obj.bar.style.height = clamped + '%';
                  const label = obj.container.querySelector('.level-percent-label');
                  if (label) label.textContent = `${Math.round(clamped)}%`;
                })
                .catch(() => {
                  obj.bar.style.height = '0%';
                  const label = obj.container.querySelector('.level-percent-label');
                  if (label) label.textContent = '0%';
                });
            }
          }, 1000);
          }
        }

      if (container) {
        container.style.left = item.posX + 'px';
        container.style.top = item.posY + 'px';
        workspace.appendChild(container);
      }
    });

    updatePositionsPanel();
  });
}
})
