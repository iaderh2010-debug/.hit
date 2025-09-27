import {
  updatePositionsPanel
} from './render.js';

import {
  saveToLocal
} from './dataFlow.js';

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

export function openConfigModal(target, tabs, activeTab, workspace, layoutKey) {
  // Use a local variable for currentTarget, not a global
  // If you need global, use window.currentTarget = target;
  window.currentTarget = target;

  document.getElementById('cfgIP').parentElement.style.display = '';
  document.getElementById('cfgPuerto').parentElement.style.display = '';
  document.getElementById('cfgDireccion').parentElement.style.display = '';
  document.getElementById('cfgModo').parentElement.style.display = '';

  buttonExtras.style.display = 'none';
  indicatorExtras.style.display = 'none';
  levelExtras.style.display = 'none';
  gaugeExtras.style.display = 'none';
  vectorExtras.style.display = 'none';

  alert('openConfigModal called! isLevel: ' + !!target.isLevel);

  if (target.button) {
    nombreInput.value = target.button.textContent;
    modoInput.value = target.button.dataset.modo || 'pulse';
    bgColorInput.value = target.button.dataset.bgColor || '#3498db';
    fontColorInput.value = target.button.dataset.fontColor || '#fff';
    fontFamilyInput.value = target.button.dataset.fontFamily || 'Arial';
    btnWidthInput.value = target.button.dataset.width || '120';
    btnHeightInput.value = target.button.dataset.height || '40';
    buttonExtras.style.display = 'block';
  } else if (target.isLight) {
    nombreInput.value = target.label.textContent;
    modoInput.value = 'read';
    indicatorExtras.style.display = 'block';

    let colorOn = target.light?.dataset.colorOn;
    if (!colorOn || colorOn === "undefined") colorOn = "#ffff00";
    indicatorColorOnInput.value = colorOn;

    let colorOff = target.light?.dataset.colorOff;
    if (!colorOff || colorOff === "undefined") colorOff = "#888888";
    indicatorColorOffInput.value = colorOff;

  } else if (target.isGauge) {
    nombreInput.value = target.label.textContent;
    modoInput.value = 'read';
    gaugeExtras.style.display = 'block';

    let gaugeColor = target.gauge?.dataset.gaugeColor;
    if (!gaugeColor || gaugeColor === "undefined") gaugeColor = "#3498db";
    document.getElementById('cfgGaugeColor').value = gaugeColor;

    document.getElementById('cfgGaugeMaxValue').value = target.gauge.dataset.maxValue || '100';
    document.getElementById('cfgGaugeMinValue').value = target.gauge.dataset.minValue || '0';
    document.getElementById('cfgGaugeDisplayMode').value = target.gauge.dataset.displayMode || 'percentage';

  } else if (target.isLevel) {
    nombreInput.value = target.label.textContent;
    modoInput.value = 'read';

    let barColor = target.bar.dataset.barColor;
    if (!barColor || barColor === "undefined") barColor = "#3498db";
    barColorInput.value = barColor;

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

  } else if (target.isPipe) {
    nombreInput.value = ""; // Pipes have no label
    modoInput.value = 'read';
    indicatorExtras.style.display = 'block';

    // Set color pickers to current pipe colors or defaults
    let colorOn = target.pipe?.dataset.colorOn;
    if (!colorOn || colorOn === "undefined") colorOn = "#00bfff";
    indicatorColorOnInput.value = colorOn;

    let colorOff = target.pipe?.dataset.colorOff;
    if (!colorOff || colorOff === "undefined") colorOff = "#888888";
    indicatorColorOffInput.value = colorOff;
  } else if (target.isVector) {
    nombreInput.value = target.label.textContent;
    vectorExtras.style.display = 'block';
    vectorTypeInput.value = target.container.dataset.vectorType || 'node';

    // Show orientation dropdown only for valve
    const orientationExtras = document.getElementById('vectorOrientationExtras');
    const orientationInput = document.getElementById('cfgVectorOrientation');
    if (vectorTypeInput.value === 'valve') {
      orientationExtras.style.display = 'block';
      orientationInput.value = target.container.dataset.vectorOrientation || 'horizontal';
    } else {
      orientationExtras.style.display = 'none';
    }

    // Hide Modbus fields for vector
    document.getElementById('cfgIP').parentElement.style.display = 'none';
    document.getElementById('cfgPuerto').parentElement.style.display = 'none';
    document.getElementById('cfgDireccion').parentElement.style.display = 'none';
    document.getElementById('cfgModo').parentElement.style.display = 'none';
    buttonExtras.style.display = 'none';
    indicatorExtras.style.display = 'none';
    gaugeExtras.style.display = 'none';
    levelExtras.style.display = 'none';

    // Listen for type change to show/hide orientation
    vectorTypeInput.onchange = () => {
      if (vectorTypeInput.value === 'valve' || vectorTypeInput.value === 'divertor') {
        orientationExtras.style.display = 'block';
      } else {
        orientationExtras.style.display = 'none';
      }
    };
  } else {
    // Show Modbus fields for other widgets
    document.getElementById('cfgIP').parentElement.style.display = '';
    document.getElementById('cfgPuerto').parentElement.style.display = '';
    document.getElementById('cfgDireccion').parentElement.style.display = '';
    document.getElementById('cfgModo').parentElement.style.display = '';
  }

  ipInput.value =
    target.button?.dataset.ip ??
    target.light?.dataset.ip ??
    target.gauge?.dataset.ip ??
    target.bar?.dataset.ip ??
    '192.168.0.201';

  puertoInput.value =
    target.button?.dataset.port ??
    target.light?.dataset.port ??
    target.gauge?.dataset.port ??
    target.bar?.dataset.port ??
    '502';

  direccionInput.value =
    target.button?.dataset.direccion ??
    target.light?.dataset.direccion ??
    target.gauge?.dataset.direccion ??
    target.bar?.dataset.direccion ??
    '8192';

  // --- Set deleteBtn.onclick here so it always deletes the correct widget ---
  deleteBtn.onclick = () => {
    if (currentTarget?.container) {
      const widgetId = currentTarget.container.dataset.widgetId;

      // Remove all pipes linked to this widget
      const pipesToRemove = tabs[activeTab].content.filter(
        item => item.type === 'pipe-indicator' && item.connectedIds && item.connectedIds.includes(widgetId)
      );
      pipesToRemove.forEach(pipe => {
        // Remove pipe from DOM
        const pipeEl = workspace.querySelector(`[data-widget-id="${pipe.id}"]`);
        if (pipeEl) pipeEl.remove();
        // Remove pipe from content array
        tabs[activeTab].content = tabs[activeTab].content.filter(item => item.id !== pipe.id);
      });

      // Remove the widget itself from DOM and content array
      currentTarget.container.remove();
      const idx = tabs[activeTab].content.findIndex(item => item.id === widgetId);
      if (idx !== -1)
        tabs[activeTab].content.splice(idx, 1);

      saveToLocal(tabs, layoutKey);
      updatePositionsPanel(workspace);
    }
    closeModal();
  };

  cancelBtn.onclick = closeModal;

  modal.classList.add('show');
}
export function closeModal() {
    modal.classList.remove('show');
    updatePositionsPanel(document.getElementById('workspace'));
  }
export function openTabConfigModal(tabIdx) {
  modal.classList.add('show');
  nombreInput.value = tabs[tabIdx].name;
  buttonExtras.style.display = 'none';
  indicatorExtras.style.display = 'none';
  levelExtras.style.display = 'none';
  gaugeExtras.style.display = 'none';

  // OK button: rename tab
  confirmBtn.onclick = () => {
    const newName = nombreInput.value.trim();
    // Check for duplicate name (case-insensitive, excluding current tab)
    if (
      !newName ||
      tabs.some((t, i) => i !== tabIdx && t.name.toLowerCase() === newName.toLowerCase())
    ) {
      alert('El nombre de la página ya existe o es inválido. Por favor, elija otro nombre.');
      nombreInput.focus();
      return;
    }
    tabs[tabIdx].name = newName;
    renderTabs();
    saveToLocal(tabs, layoutKey);
    closeModal();
  };

  // Delete button: remove tab
  deleteBtn.onclick = () => {
    if (tabs.length > 1) {
      tabs.splice(tabIdx, 1);
      if (activeTab >= tabs.length) activeTab = tabs.length - 1;
      renderTabs();
      setActiveTab(activeTab);
      saveToLocal(tabs, layoutKey);
    } else {
      alert('Debe haber al menos una página.');
    }
    closeModal();
  };

  cancelBtn.onclick = closeModal;
}