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
