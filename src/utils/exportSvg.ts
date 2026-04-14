import jsPDF from 'jspdf';

export interface ExportOptions {
  fileName?: string;
  title?: string;
  width?: number;
  height?: number;
  backgroundColor?: string;
  includeLegend?: boolean;
  quality?: number;
}

export function exportChartAsSvg(
  options: ExportOptions = {}
): void {
  const chartContainer = document.querySelector('[class*="recharts-wrapper"]');
  if (!chartContainer) {
    throw new Error('未找到图表元素');
  }

  const svgElement = chartContainer.querySelector('svg');
  if (!svgElement) {
    throw new Error('未找到SVG元素');
  }

  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  
  const bbox = svgElement.getBoundingClientRect();
  const width = options.width || bbox.width;
  const height = options.height || bbox.height;
  
  clonedSvg.setAttribute('width', String(width));
  clonedSvg.setAttribute('height', String(height));
  clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  
  inlineStyles(clonedSvg);
  
  if (options.backgroundColor) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', options.backgroundColor);
    clonedSvg.insertBefore(rect, clonedSvg.firstChild);
  }
  
  if (options.title) {
    const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleElement.setAttribute('x', '50%');
    titleElement.setAttribute('y', '30');
    titleElement.setAttribute('text-anchor', 'middle');
    titleElement.setAttribute('font-size', '18');
    titleElement.setAttribute('font-weight', 'bold');
    titleElement.setAttribute('fill', '#333');
    titleElement.textContent = options.title;
    clonedSvg.insertBefore(titleElement, clonedSvg.firstChild);
  }
  
  const svgData = new XMLSerializer().serializeToString(clonedSvg);
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  const link = document.createElement('a');
  link.href = url;
  link.download = options.fileName || 'chart.svg';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportChartAsPng(
  options: ExportOptions = {}
): void {
  const chartContainer = document.querySelector('[class*="recharts-wrapper"]');
  if (!chartContainer) {
    throw new Error('未找到图表元素');
  }

  const svgElement = chartContainer.querySelector('svg');
  if (!svgElement) {
    throw new Error('未找到SVG元素');
  }

  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  
  const bbox = svgElement.getBoundingClientRect();
  const width = options.width || bbox.width;
  const height = options.height || bbox.height;
  const scale = options.quality || 2;
  
  clonedSvg.setAttribute('width', String(width));
  clonedSvg.setAttribute('height', String(height));
  clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  
  inlineStyles(clonedSvg);
  
  if (options.backgroundColor) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('width', '100%');
    rect.setAttribute('height', '100%');
    rect.setAttribute('fill', options.backgroundColor);
    clonedSvg.insertBefore(rect, clonedSvg.firstChild);
  }
  
  if (options.title) {
    const titleElement = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    titleElement.setAttribute('x', '50%');
    titleElement.setAttribute('y', '30');
    titleElement.setAttribute('text-anchor', 'middle');
    titleElement.setAttribute('font-size', '18');
    titleElement.setAttribute('font-weight', 'bold');
    titleElement.setAttribute('fill', '#333');
    titleElement.textContent = options.title;
    clonedSvg.insertBefore(titleElement, clonedSvg.firstChild);
  }
  
  const svgData = new XMLSerializer().serializeToString(clonedSvg);
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('无法创建Canvas上下文');
  }
  
  const img = new Image();
  img.onload = () => {
    ctx.scale(scale, scale);
    ctx.fillStyle = options.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob((blob) => {
      if (!blob) {
        throw new Error('生成图片失败');
      }
      
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = options.fileName?.replace('.svg', '.png') || 'chart.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png', 1.0);
  };
  
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

export function exportChartAsPdf(
  options: ExportOptions = {}
): void {
  const chartContainer = document.querySelector('[class*="recharts-wrapper"]');
  if (!chartContainer) {
    throw new Error('未找到图表元素');
  }

  const svgElement = chartContainer.querySelector('svg');
  if (!svgElement) {
    throw new Error('未找到SVG元素');
  }

  const clonedSvg = svgElement.cloneNode(true) as SVGSVGElement;
  
  const bbox = svgElement.getBoundingClientRect();
  const width = options.width || bbox.width;
  const height = options.height || bbox.height;
  const scale = 2;
  
  clonedSvg.setAttribute('width', String(width));
  clonedSvg.setAttribute('height', String(height));
  clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  
  inlineStyles(clonedSvg);
  
  const svgData = new XMLSerializer().serializeToString(clonedSvg);
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    throw new Error('无法创建Canvas上下文');
  }
  
  const img = new Image();
  img.onload = () => {
    ctx.scale(scale, scale);
    ctx.fillStyle = options.backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0);
    
    const imgData = canvas.toDataURL('image/png', 1.0);
    
    const orientation = width > height ? 'landscape' : 'portrait';
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'px',
      format: [width, height]
    });
    
    pdf.addImage(imgData, 'PNG', 0, 0, width, height);
    
    pdf.save(options.fileName?.replace(/\.(svg|png)$/, '.pdf') || 'chart.pdf');
  };
  
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

function inlineStyles(element: SVGElement): void {
  const allElements = element.querySelectorAll('*');
  
  allElements.forEach((el) => {
    const htmlEl = el as SVGElement;
    const computedStyle = window.getComputedStyle(htmlEl);
    
    const importantStyles = [
      'fill',
      'stroke',
      'stroke-width',
      'stroke-dasharray',
      'font-family',
      'font-size',
      'font-weight',
      'text-anchor',
      'dominant-baseline',
      'opacity',
      'fill-opacity',
      'stroke-opacity',
    ];
    
    importantStyles.forEach((style) => {
      const value = computedStyle.getPropertyValue(style);
      if (value && value !== 'none' && value !== 'normal') {
        htmlEl.style.setProperty(style, value);
      }
    });
  });
}

export function getExportFormats(): { id: string; label: string; extension: string }[] {
  return [
    { id: 'svg', label: 'SVG 矢量图', extension: '.svg' },
    { id: 'png', label: 'PNG 图片', extension: '.png' },
    { id: 'pdf', label: 'PDF 文档', extension: '.pdf' },
  ];
}
