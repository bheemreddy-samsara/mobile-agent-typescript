/**
 * Image Processing Utilities for Vision-Based Fallback
 */

import sharp from "sharp";
import type { UIElement } from "../types";
import { logger } from "./logger";

/**
 * Convert base64 string to Buffer
 */
export function base64ToBuffer(base64: string): Buffer {
  // Remove data URL prefix if present
  const base64Data = base64.replace(/^data:image\/\w+;base64,/, "");
  return Buffer.from(base64Data, "base64");
}

/**
 * Convert Buffer to base64 string
 */
export function bufferToBase64(buffer: Buffer): string {
  return buffer.toString("base64");
}

/**
 * Overlay numeric tags on interactive elements in a screenshot
 */
export async function overlayNumericTags(
  base64Image: string,
  elements: UIElement[],
): Promise<{ image: string; mapping: Map<number, UIElement> }> {
  try {
    const imageBuffer = base64ToBuffer(base64Image);
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();

    if (!metadata.width || !metadata.height) {
      throw new Error("Failed to get image dimensions");
    }

    const mapping = new Map<number, UIElement>();
    const clickableElements = elements.filter((e) => e.clickable && e.visible && e.bounds);

    // Create SVG overlay with numbered tags
    const svgElements: string[] = [];

    clickableElements.forEach((element, index) => {
      const tagId = index + 1;
      mapping.set(tagId, element);

      if (element.bounds) {
        const centerX = Math.floor((element.bounds.x1 + element.bounds.x2) / 2);
        const centerY = Math.floor((element.bounds.y1 + element.bounds.y2) / 2);

        // Draw a circle with number
        const radius = 20;
        svgElements.push(`
          <circle cx="${centerX}" cy="${centerY}" r="${radius}" 
                  fill="rgba(255, 0, 0, 0.7)" stroke="white" stroke-width="2"/>
          <text x="${centerX}" y="${centerY + 5}" 
                font-size="16" font-weight="bold" fill="white" 
                text-anchor="middle" font-family="Arial">${tagId}</text>
        `);
      }
    });

    const svg = `
      <svg width="${metadata.width}" height="${metadata.height}">
        ${svgElements.join("\n")}
      </svg>
    `;

    // Composite the SVG overlay onto the image
    const taggedImageBuffer = await image
      .composite([
        {
          input: Buffer.from(svg),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    logger.debug(`Overlaid ${mapping.size} numeric tags on screenshot`);

    return {
      image: bufferToBase64(taggedImageBuffer),
      mapping,
    };
  } catch (error: any) {
    logger.error("Failed to overlay numeric tags:", error);
    throw error;
  }
}

/**
 * Overlay grid lines on a screenshot
 */
export async function overlayGridLines(
  base64Image: string,
  gridSize: number,
  logicalWidth: number,
  logicalHeight: number,
): Promise<{
  image: string;
  gridMap: Map<string, { x: number; y: number }>;
  scaleFactor: { x: number; y: number };
}> {
  try {
    const imageBuffer = base64ToBuffer(base64Image);
    const image = sharp(imageBuffer);

    // Get actual screenshot dimensions (high-DPI devices have larger screenshots)
    const metadata = await image.metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("Failed to get screenshot dimensions");
    }

    const actualWidth = metadata.width;
    const actualHeight = metadata.height;

    // Calculate scale factor between screenshot and logical coordinates
    const scaleFactorX = actualWidth / logicalWidth;
    const scaleFactorY = actualHeight / logicalHeight;

    logger.debug(
      `Grid overlay: logical=${logicalWidth}x${logicalHeight}, actual=${actualWidth}x${actualHeight}, scale=${scaleFactorX.toFixed(2)}x${scaleFactorY.toFixed(2)}`,
    );

    const gridMap = new Map<string, { x: number; y: number }>();
    const svgElements: string[] = [];

    // Use actual screenshot dimensions for drawing
    const cellWidth = actualWidth / gridSize;
    const cellHeight = actualHeight / gridSize;

    // Create grid lines and labels
    for (let i = 0; i <= gridSize; i++) {
      const x = Math.floor(i * cellWidth);
      const y = Math.floor(i * cellHeight);

      // Vertical lines
      svgElements.push(`
        <line x1="${x}" y1="0" x2="${x}" y2="${actualHeight}" 
              stroke="rgba(0, 255, 0, 0.5)" stroke-width="${Math.max(2, Math.floor(scaleFactorX * 2))}"/>
      `);

      // Horizontal lines
      svgElements.push(`
        <line x1="0" y1="${y}" x2="${actualWidth}" y2="${y}" 
              stroke="rgba(0, 255, 0, 0.5)" stroke-width="${Math.max(2, Math.floor(scaleFactorY * 2))}"/>
      `);
    }

    // Add grid labels (A-Z for columns, 1-N for rows)
    // Store coordinates in LOGICAL space (for Appium tap commands)
    for (let row = 0; row < gridSize; row++) {
      for (let col = 0; col < gridSize; col++) {
        const colLabel = String.fromCharCode(65 + col); // A, B, C, ...
        const rowLabel = (row + 1).toString();
        const gridLabel = `${colLabel}${rowLabel}`;

        // Calculate center in actual screenshot coordinates
        const actualCenterX = Math.floor((col + 0.5) * cellWidth);
        const actualCenterY = Math.floor((row + 0.5) * cellHeight);

        // Convert back to logical coordinates for Appium
        const logicalX = Math.floor(actualCenterX / scaleFactorX);
        const logicalY = Math.floor(actualCenterY / scaleFactorY);

        gridMap.set(gridLabel, { x: logicalX, y: logicalY });

        // Add label text (scaled font size)
        const fontSize = Math.max(14, Math.floor(14 * scaleFactorX));
        svgElements.push(`
          <text x="${Math.floor(col * cellWidth) + Math.floor(10 * scaleFactorX)}" 
                y="${Math.floor(row * cellHeight) + Math.floor(20 * scaleFactorY)}" 
                font-size="${fontSize}" font-weight="bold" fill="lime" 
                stroke="black" stroke-width="${Math.max(1, Math.floor(scaleFactorX))}"
                font-family="Arial">${gridLabel}</text>
        `);
      }
    }

    const svg = `
      <svg width="${actualWidth}" height="${actualHeight}">
        ${svgElements.join("\n")}
      </svg>
    `;

    // Composite the SVG overlay onto the image
    const gridImageBuffer = await image
      .composite([
        {
          input: Buffer.from(svg),
          top: 0,
          left: 0,
        },
      ])
      .png()
      .toBuffer();

    logger.debug(
      `Created ${gridSize}x${gridSize} grid overlay with ${gridMap.size} cells (coordinates in logical space)`,
    );

    return {
      image: bufferToBase64(gridImageBuffer),
      gridMap,
      scaleFactor: { x: scaleFactorX, y: scaleFactorY },
    };
  } catch (error: any) {
    logger.error("Failed to overlay grid lines:", error);
    throw error;
  }
}
