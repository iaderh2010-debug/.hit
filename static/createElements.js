import {
  updateVectorSymbol
} from './render.js';

export function createButton() {
    const container = document.createElement('div');
    container.className = 'button-block';
    container.style.position = 'absolute';
    container.style.left = '0px';
    container.style.top = '0px';

    const button = document.createElement('button');
    button.textContent = 'Botón sin nombre';
    container.appendChild(button);

    return { container, button };
  }

export function createIndicatorLight() {
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

    return { container, label, light, isLight: true };
  }

export function createGauge() {
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

  const valueDisplay = document.createElement('div');
  valueDisplay.className = 'gauge-value-display';
  valueDisplay.textContent = '0%';
  gaugeWrapper.appendChild(valueDisplay);

  const minLabel = document.createElement('div');
  minLabel.className = 'gauge-min-label';
  minLabel.textContent = '0%';
  gaugeWrapper.appendChild(minLabel);

  const maxLabel = document.createElement('div');
  maxLabel.className = 'gauge-max-label';
  maxLabel.textContent = '100%';
  gaugeWrapper.appendChild(maxLabel);

  container.appendChild(label);
  container.appendChild(gaugeWrapper);

  container.label = label;
  container.gauge = foregroundArc;
  container.isGauge = true;

  return { container, label, gauge: foregroundArc, isGauge: true };
}

export function createLevelBar() {
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

export function createPipeIndicator() {
  const container = document.createElement('div');
  container.className = 'pipe-indicator-block';
  container.style.position = 'absolute';
  container.style.left = '0px';
  container.style.top = '0px';

  // REMOVE label creation
  // const label = document.createElement('div');
  // label.textContent = 'Pipe sin nombre';
  // label.className = 'pipe-indicator-label';

  const pipe = document.createElement('div');
  pipe.className = 'pipe-indicator-pipe off';
  pipe.style.width = '80px';
  pipe.style.height = '4px'; // thinner line
  pipe.style.borderRadius = '2px'; // less rounded
  pipe.style.backgroundColor = '#888888';
  pipe.style.margin = '8px 0';

  // container.appendChild(label); // REMOVE this line
  container.appendChild(pipe);

  return { container, pipe, isPipe: true };
}

export function createVectorNode(type = 'node') {
  const container = document.createElement('div');
  container.className = 'vector-node-block';
  container.style.position = 'absolute';
  container.style.left = '0px';
  container.style.top = '0px';
  container.dataset.vectorType = type;

  const circle = document.createElement('div');
  circle.className = 'vector-node-circle';
  circle.style.width = '24px';
  circle.style.height = '24px';
  circle.style.borderRadius = '50%';
  circle.style.backgroundColor = '#ff9800';
  circle.style.border = '2px solid #333';
  circle.style.display = 'flex';
  circle.style.alignItems = 'center';
  circle.style.justifyContent = 'center';

  updateVectorSymbol(container, type);

  const label = document.createElement('div');
  label.className = 'vector-node-label';
  label.textContent = 'Vector';

  container.appendChild(circle);
  container.appendChild(label);

  return { container, label, circle, isVector: true };
}