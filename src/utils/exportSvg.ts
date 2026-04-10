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
  
  clonedSvg.setAttribute('width', String(width));
  clonedSvg.setAttribute('height', String(height));
  clonedSvg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  
  inlineStyles(clonedSvg);
  
  const svgData = new XMLSerializer().serializeToString(clonedSvg);
  const canvas = document.createElement('canvas');
  const scale = 2;
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
    
    const pdfContent = generateSimplePdf(canvas);
    
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = options.fileName?.replace('.svg', '.pdf') || 'chart.pdf';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };
  
  img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
}

function generateSimplePdf(canvas: HTMLCanvasElement): string {
  const imgData = canvas.toDataURL('image/png', 1.0);
  const width = canvas.width / 2;
  const height = canvas.height / 2;
  
  const pdfHeader = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${width} ${height}] /Contents 4 0 R /Resources << /XObject << /Img0 5 0 R >> >> >>
endobj
4 0 obj
<< /Length 44 >>
stream
q ${width} 0 0 ${height} 0 0 cm /Img0 Do Q
endstream
endobj
5 0 obj
<< /Type /XObject /Subtype /Image /Width ${canvas.width} /Height ${canvas.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imgData.length} >>
stream
${imgData}
endstream
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n
0000000058 00000 n
0000000115 00000 n
0000000266 00000 n
0000000359 00000 n
trailer
<< /Size 6 /Root 1 0 R >>
startxref
${500 + imgData.length}
%%EOF`;
  
  return pdfHeader;
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
