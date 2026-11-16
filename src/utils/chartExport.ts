/**
 * Utility to export any rendered chart container (Recharts or inline SVG)
 * individually as crisp SVG or high-DPI PNG image files.
 */

function findTargetChartSvg(container: HTMLElement | null): SVGSVGElement | null {
  if (!container) return null;

  const rechartsSvg = container.querySelector('svg.recharts-surface') as SVGSVGElement | null;
  if (rechartsSvg) return rechartsSvg;

  const svgs = Array.from(container.querySelectorAll('svg'));
  let bestSvg: SVGSVGElement | null = null;
  let bestArea = 0;

  for (const svg of svgs) {
    const rect = svg.getBoundingClientRect();
    const area = rect.width * rect.height;
    // Ignore small UI icons (Lucide icons are typically <= 24x24)
    if (rect.width > 64 && rect.height > 64 && area > bestArea) {
      bestArea = area;
      bestSvg = svg as SVGSVGElement;
    }
  }
  return bestSvg;
}

function buildStandaloneSvgClone(
  svgEl: SVGSVGElement,
  themeMode?: 'light' | 'dark'
): { clone: SVGSVGElement; width: number; height: number } {
  const rect = svgEl.getBoundingClientRect();
  const width = Math.max(Math.round(rect.width), 560);
  const height = Math.max(Math.round(rect.height), 260);

  const isDark =
    themeMode === 'dark' ||
    (themeMode === undefined &&
      typeof document !== 'undefined' &&
      document.documentElement.classList.contains('dark'));

  const bgColor = isDark ? '#11101C' : '#ffffff';
  const defaultTextColor = isDark ? '#e4e4e7' : '#27272a';
  const defaultGridColor = isDark ? 'rgba(148,163,184,0.22)' : 'rgba(113,113,122,0.22)';

  const clone = svgEl.cloneNode(true) as SVGSVGElement;
  clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  clone.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
  clone.setAttribute('width', String(width));
  clone.setAttribute('height', String(height));
  if (!clone.getAttribute('viewBox')) {
    clone.setAttribute('viewBox', `0 0 ${width} ${height}`);
  }

  // Inline computed styles on texts so standalone SVG/PNG renders with exact typography
  const origTexts = svgEl.querySelectorAll('text, tspan');
  const cloneTexts = clone.querySelectorAll('text, tspan');
  cloneTexts.forEach((node, idx) => {
    const el = node as SVGElement;
    const orig = origTexts[idx] as SVGElement | undefined;
    const computed = orig ? window.getComputedStyle(orig) : null;
    const fill = el.getAttribute('fill') || computed?.fill || defaultTextColor;
    el.setAttribute('fill', fill === 'currentColor' ? defaultTextColor : fill);
    el.style.fontFamily =
      computed?.fontFamily || "'Plus Jakarta Sans', 'Inter', system-ui, sans-serif";
    if (computed?.fontSize) el.style.fontSize = computed.fontSize;
    if (computed?.fontWeight) el.style.fontWeight = computed.fontWeight;
  });

  // Inline gridlines & vector strokes using currentColor
  const origShapes = svgEl.querySelectorAll('line, path, circle, rect, polygon, polyline');
  const cloneShapes = clone.querySelectorAll('line, path, circle, rect, polygon, polyline');
  cloneShapes.forEach((node, idx) => {
    const el = node as SVGElement;
    const orig = origShapes[idx] as SVGElement | undefined;
    const computed = orig ? window.getComputedStyle(orig) : null;

    const attrStroke = el.getAttribute('stroke');
    if (attrStroke === 'currentColor') {
      el.setAttribute('stroke', computed?.color || defaultGridColor);
    } else if (!attrStroke && computed?.stroke && computed.stroke !== 'none') {
      el.setAttribute('stroke', computed.stroke);
    }

    const attrFill = el.getAttribute('fill');
    if (attrFill === 'currentColor') {
      el.setAttribute('fill', computed?.color || defaultTextColor);
    }
  });

  // Insert solid theme-aware backdrop rect
  const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
  bgRect.setAttribute('x', '0');
  bgRect.setAttribute('y', '0');
  bgRect.setAttribute('width', String(width));
  bgRect.setAttribute('height', String(height));
  bgRect.setAttribute('rx', '12');
  bgRect.setAttribute('fill', bgColor);
  clone.insertBefore(bgRect, clone.firstChild);

  return { clone, width, height };
}

export function sanitizeChartFilename(base: string): string {
  const clean = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 60);
  const dateStamp = new Date().toISOString().slice(0, 10);
  return `${clean || 'graphique_rizmadagascar'}_${dateStamp}`;
}

export function exportChartElementAsSvg(
  containerEl: HTMLElement | null,
  filenameBase: string,
  themeMode?: 'light' | 'dark'
): boolean {
  const svgEl = findTargetChartSvg(containerEl);
  if (!svgEl) return false;

  const { clone } = buildStandaloneSvgClone(svgEl, themeMode);
  const serializer = new XMLSerializer();
  const svgString = '<?xml version="1.0" encoding="UTF-8"?>\n' + serializer.serializeToString(clone);

  const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${sanitizeChartFilename(filenameBase)}.svg`;
  link.click();
  URL.revokeObjectURL(url);
  return true;
}

export async function exportChartElementAsPng(
  containerEl: HTMLElement | null,
  filenameBase: string,
  scale = 2,
  themeMode?: 'light' | 'dark'
): Promise<boolean> {
  const svgEl = findTargetChartSvg(containerEl);
  if (!svgEl) return false;

  const { clone, width, height } = buildStandaloneSvgClone(svgEl, themeMode);
  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(clone);
  const svgDataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgString)}`;

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(false);
          return;
        }
        ctx.scale(scale, scale);
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(false);
              return;
            }
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `${sanitizeChartFilename(filenameBase)}.png`;
            link.click();
            URL.revokeObjectURL(url);
            resolve(true);
          },
          'image/png',
          1
        );
      } catch {
        resolve(false);
      }
    };
    img.onerror = () => resolve(false);
    img.src = svgDataUrl;
  });
}
