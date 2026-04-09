import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

export interface ExportOptions {
  filename?: string;
  backgroundColor?: string;
  quality?: number;
}

export class ExportError extends Error {
  constructor(message: string, public readonly cause?: Error) {
    super(message);
    this.name = 'ExportError';
  }
}

export async function exportChartAsPNG(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const { filename = 'chart', backgroundColor = '#ffffff' } = options;

  try {
    const canvas = await html2canvas(element, {
      backgroundColor,
      scale: 2,
      useCORS: true,
      allowTaint: true,
    });

    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (error) {
    throw new ExportError(
      `PNG 导出失败: ${error instanceof Error ? error.message : '未知错误'}`,
      error instanceof Error ? error : undefined
    );
  }
}

export async function exportChartAsSVG(
  element: HTMLElement,
  options: ExportOptions = {}
): Promise<void> {
  const { filename = 'chart' } = options;

  try {
    const svgElement = element.querySelector('svg');
    if (!svgElement) {
      throw new ExportError('未找到 SVG 元素');
    }

    const svgData = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgData], {
      type: 'image/svg+xml;charset=utf-8',
    });
    const svgUrl = URL.createObjectURL(svgBlob);

    const link = document.createElement('a');
    link.download = `${filename}.svg`;
    link.href = svgUrl;
    link.click();

    URL.revokeObjectURL(svgUrl);
  } catch (error) {
    if (error instanceof ExportError) {
      throw error;
    }
    throw new ExportError(
      `SVG 导出失败: ${error instanceof Error ? error.message : '未知错误'}`,
      error instanceof Error ? error : undefined
    );
  }
}

export function exportDataAsCSV(
  data: any[],
  headers: string[],
  options: ExportOptions = {}
): void {
  const { filename = 'data' } = options;

  try {
    const csv = Papa.unparse(data, {
      columns: headers,
      header: true,
    });

    const blob = new Blob(['\ufeff' + csv], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.download = `${filename}.csv`;
    link.href = url;
    link.click();

    URL.revokeObjectURL(url);
  } catch (error) {
    throw new ExportError(
      `CSV 导出失败: ${error instanceof Error ? error.message : '未知错误'}`,
      error instanceof Error ? error : undefined
    );
  }
}

export function exportDataAsExcel(
  data: any[],
  headers: string[],
  options: ExportOptions = {}
): void {
  const { filename = 'data', sheetName = 'Sheet1' } = options as ExportOptions & {
    sheetName?: string;
  };

  try {
    const worksheet = XLSX.utils.json_to_sheet(data, {
      header: headers,
    });

    const headerRow = headers.map((h) => h);
    XLSX.utils.sheet_add_aoa(worksheet, [headerRow], { origin: 'A1' });

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    XLSX.writeFile(workbook, `${filename}.xlsx`);
  } catch (error) {
    throw new ExportError(
      `Excel 导出失败: ${error instanceof Error ? error.message : '未知错误'}`,
      error instanceof Error ? error : undefined
    );
  }
}

export function exportData(
  data: any[],
  headers: string[],
  format: 'csv' | 'excel',
  options: ExportOptions = {}
): void {
  switch (format) {
    case 'csv':
      exportDataAsCSV(data, headers, options);
      break;
    case 'excel':
      exportDataAsExcel(data, headers, options);
      break;
    default:
      throw new ExportError(`不支持的导出格式: ${format}`);
  }
}

export async function exportChart(
  element: HTMLElement,
  format: 'png' | 'svg',
  options: ExportOptions = {}
): Promise<void> {
  switch (format) {
    case 'png':
      await exportChartAsPNG(element, options);
      break;
    case 'svg':
      await exportChartAsSVG(element, options);
      break;
    default:
      throw new ExportError(`不支持的导出格式: ${format}`);
  }
}

export function getSupportedChartFormats(): string[] {
  return ['png', 'svg'];
}

export function getSupportedDataFormats(): string[] {
  return ['csv', 'excel'];
}
