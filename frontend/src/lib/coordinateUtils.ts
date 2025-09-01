/**
 * Utility functions for converting between pixel coordinates and percentage coordinates
 * for PDF question mapping that scales properly across different zoom levels and screen sizes
 */

export interface PixelCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PercentageCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PageSize {
  width: number;
  height: number;
}

/**
 * Convert pixel coordinates to percentage coordinates
 * @param pixelCoord - The pixel coordinates to convert
 * @param pageSize - The current page size in pixels
 * @returns Percentage coordinates (0-100)
 */
export const pixelsToPercentage = (
  pixelCoord: PixelCoordinates,
  pageSize: PageSize
): PercentageCoordinates => {
  if (pageSize.width === 0 || pageSize.height === 0) {
    console.warn('Page size is zero, returning original coordinates');
    return pixelCoord;
  }

  return {
    x: (pixelCoord.x / pageSize.width) * 100,
    y: (pixelCoord.y / pageSize.height) * 100,
    width: (pixelCoord.width / pageSize.width) * 100,
    height: (pixelCoord.height / pageSize.height) * 100,
  };
};

/**
 * Convert percentage coordinates to pixel coordinates
 * @param percentCoord - The percentage coordinates to convert (0-100)
 * @param pageSize - The current page size in pixels
 * @returns Pixel coordinates
 */
export const percentageToPixels = (
  percentCoord: PercentageCoordinates,
  pageSize: PageSize
): PixelCoordinates => {
  return {
    x: (percentCoord.x / 100) * pageSize.width,
    y: (percentCoord.y / 100) * pageSize.height,
    width: (percentCoord.width / 100) * pageSize.width,
    height: (percentCoord.height / 100) * pageSize.height,
  };
};

/**
 * Get the current page size from a page element
 * @param pageNumber - The page number to get size for
 * @returns Page size or null if element not found
 */
export const getPageSize = (pageNumber: number): PageSize | null => {
  const pageElement = document.getElementById(`page-${pageNumber}`);
  if (!pageElement) {
    console.warn(`Page element page-${pageNumber} not found`);
    return null;
  }

  const rect = pageElement.getBoundingClientRect();
  return {
    width: rect.width,
    height: rect.height,
  };
};

/**
 * Get page size from a page element using CSS computed width/height
 * This is more reliable for PDF.js rendered pages
 * @param pageNumber - The page number to get size for
 * @returns Page size or null if element not found
 */
export const getPageSizeFromComputedStyle = (pageNumber: number): PageSize | null => {
  // Use the actual PDF page element for consistency
  const pdfPageElement = document.querySelector(`#page-${pageNumber} .react-pdf__Page`);
  if (pdfPageElement) {
    const rect = pdfPageElement.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
    };
  }

  // Fallback to the page container
  const pageElement = document.getElementById(`page-${pageNumber}`);
  if (!pageElement) {
    console.warn(`Page element page-${pageNumber} not found`);
    return null;
  }

  // Find the canvas element within the page (PDF.js renders pages as canvas)
  const canvasElement = pageElement.querySelector('canvas');
  if (canvasElement) {
    return {
      width: canvasElement.offsetWidth,
      height: canvasElement.offsetHeight,
    };
  }

  // Fallback to the page element itself
  return {
    width: pageElement.offsetWidth,
    height: pageElement.offsetHeight,
  };
};

/**
 * Validate that percentage coordinates are within valid bounds
 * @param coords - Percentage coordinates to validate
 * @returns true if valid, false otherwise
 */
export const validatePercentageCoordinates = (coords: PercentageCoordinates): boolean => {
  return (
    coords.x >= 0 && coords.x <= 100 &&
    coords.y >= 0 && coords.y <= 100 &&
    coords.width >= 0 && coords.width <= 100 &&
    coords.height >= 0 && coords.height <= 100 &&
    coords.x + coords.width <= 100 &&
    coords.y + coords.height <= 100
  );
};

/**
 * Round percentage coordinates to a reasonable precision
 * @param coords - Percentage coordinates to round
 * @param precision - Number of decimal places (default: 3)
 * @returns Rounded percentage coordinates
 */
export const roundPercentageCoordinates = (
  coords: PercentageCoordinates,
  precision: number = 3
): PercentageCoordinates => {
  const factor = Math.pow(10, precision);
  return {
    x: Math.round(coords.x * factor) / factor,
    y: Math.round(coords.y * factor) / factor,
    width: Math.round(coords.width * factor) / factor,
    height: Math.round(coords.height * factor) / factor,
  };
};

/**
 * Convert annotation line points from pixels to percentage
 * @param points - Array of pixel coordinates [x1, y1, x2, y2, ...]
 * @param pageSize - The current page size in pixels
 * @returns Array of percentage coordinates
 */
export const linePointsToPercentage = (
  points: number[],
  pageSize: PageSize
): number[] => {
  if (pageSize.width === 0 || pageSize.height === 0) {
    console.warn('Page size is zero, returning original points');
    return points;
  }

  const percentagePoints: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    if (i + 1 < points.length) {
      percentagePoints.push((points[i] / pageSize.width) * 100);
      percentagePoints.push((points[i + 1] / pageSize.height) * 100);
    }
  }
  return percentagePoints;
};

/**
 * Convert annotation line points from percentage to pixels
 * @param points - Array of percentage coordinates [x1, y1, x2, y2, ...]
 * @param pageSize - The current page size in pixels
 * @returns Array of pixel coordinates
 */
export const linePointsToPixels = (
  points: number[],
  pageSize: PageSize
): number[] => {
  const pixelPoints: number[] = [];
  for (let i = 0; i < points.length; i += 2) {
    if (i + 1 < points.length) {
      pixelPoints.push((points[i] / 100) * pageSize.width);
      pixelPoints.push((points[i + 1] / 100) * pageSize.height);
    }
  }
  return pixelPoints;
};

/**
 * Convert annotation position from pixels to percentage
 * @param position - Pixel position {x, y}
 * @param pageSize - The current page size in pixels
 * @returns Percentage position
 */
export const positionToPercentage = (
  position: { x: number; y: number },
  pageSize: PageSize
): { x: number; y: number } => {
  if (pageSize.width === 0 || pageSize.height === 0) {
    console.warn('Page size is zero, returning original position');
    return position;
  }

  return {
    x: (position.x / pageSize.width) * 100,
    y: (position.y / pageSize.height) * 100,
  };
};

/**
 * Convert annotation position from percentage to pixels
 * @param position - Percentage position {x, y}
 * @param pageSize - The current page size in pixels
 * @returns Pixel position
 */
export const positionToPixels = (
  position: { x: number; y: number },
  pageSize: PageSize
): { x: number; y: number } => {
  return {
    x: (position.x / 100) * pageSize.width,
    y: (position.y / 100) * pageSize.height,
  };
};

/**
 * Calculate scaled font size based on page size
 * @param baseFontSize - Base font size in pixels
 * @param pageSize - Current page size
 * @param referencePageSize - Reference page size (default 595x842 for A4)
 * @returns Scaled font size
 */
export const getScaledFontSize = (
  baseFontSize: number,
  pageSize: PageSize,
  referencePageSize: PageSize = { width: 595, height: 842 }
): number => {
  // Calculate scaling factor based on width (could also use average of width/height)
  const scaleFactor = pageSize.width / referencePageSize.width;
  return Math.max(8, baseFontSize * scaleFactor); // Minimum font size of 8px
};

/**
 * Convert percentage-based dimensions to pixels
 * @param dimensions - Percentage dimensions {width, height}
 * @param pageSize - The current page size in pixels
 * @returns Pixel dimensions
 */
export const dimensionsToPixels = (
  dimensions: { width?: number; height?: number },
  pageSize: PageSize
): { width?: number; height?: number } => {
  return {
    width: dimensions.width ? (dimensions.width / 100) * pageSize.width : undefined,
    height: dimensions.height ? (dimensions.height / 100) * pageSize.height : undefined,
  };
};

/**
 * Convert pixel dimensions to percentage
 * @param dimensions - Pixel dimensions {width, height}
 * @param pageSize - The current page size in pixels
 * @returns Percentage dimensions
 */
export const dimensionsToPercentage = (
  dimensions: { width?: number; height?: number },
  pageSize: PageSize
): { width?: number; height?: number } => {
  if (pageSize.width === 0 || pageSize.height === 0) {
    console.warn('Page size is zero, returning original dimensions');
    return dimensions;
  }

  return {
    width: dimensions.width ? (dimensions.width / pageSize.width) * 100 : undefined,
    height: dimensions.height ? (dimensions.height / pageSize.height) * 100 : undefined,
  };
};
