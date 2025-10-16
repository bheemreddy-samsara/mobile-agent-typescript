/**
 * Unit tests for Grid Overlay Scaling
 * Tests bug fix: grid overlay should work correctly on high-DPI devices
 */

import { overlayGridLines } from '../src/utils/imageProcessor';
import sharp from 'sharp';

describe('Grid Overlay Scaling on High-DPI Devices', () => {
  describe('Bug #3: Grid should scale correctly for high-DPI screenshots', () => {
    it('should use actual screenshot dimensions for drawing grid', async () => {
      // Create a mock high-DPI screenshot (iPhone 14: logical 390x844, actual 1284x2778)
      const mockScreenshot = await sharp({
        create: {
          width: 1284,
          height: 2778,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const base64 = mockScreenshot.toString('base64');
      
      // Logical dimensions from getWindowSize()
      const logicalWidth = 390;
      const logicalHeight = 844;

      const result = await overlayGridLines(base64, 10, logicalWidth, logicalHeight);

      // Verify scale factor is calculated correctly
      expect(result.scaleFactor).toBeDefined();
      expect(result.scaleFactor.x).toBeCloseTo(1284 / 390, 2); // ~3.29
      expect(result.scaleFactor.y).toBeCloseTo(2778 / 844, 2); // ~3.29

      // Verify grid map is in logical coordinates (for Appium)
      expect(result.gridMap).toBeDefined();
      expect(result.gridMap.size).toBe(100); // 10x10 grid

      // Check that coordinates are in logical space (not screenshot space)
      const cellA1 = result.gridMap.get('A1');
      expect(cellA1).toBeDefined();
      expect(cellA1!.x).toBeLessThan(logicalWidth);
      expect(cellA1!.y).toBeLessThan(logicalHeight);
      expect(cellA1!.x).toBeGreaterThan(0);
      expect(cellA1!.y).toBeGreaterThan(0);
    });

    it('should handle 1:1 scale on non-retina devices', async () => {
      // Create a screenshot where logical and actual dimensions match
      const mockScreenshot = await sharp({
        create: {
          width: 1080,
          height: 1920,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const base64 = mockScreenshot.toString('base64');
      
      const result = await overlayGridLines(base64, 10, 1080, 1920);

      // Scale factor should be 1:1
      expect(result.scaleFactor.x).toBe(1);
      expect(result.scaleFactor.y).toBe(1);

      // Coordinates should match directly
      const cellB2 = result.gridMap.get('B2');
      expect(cellB2).toBeDefined();
      // Center of cell B2 in 10x10 grid: col 1, row 1 (0-indexed)
      // Expected: (1.5 * 1080/10, 1.5 * 1920/10) = (162, 288)
      expect(cellB2!.x).toBeCloseTo(162, 0);
      expect(cellB2!.y).toBeCloseTo(288, 0);
    });

    it('should correctly map grid positions across different scales', async () => {
      // Test with iPad dimensions (logical 1024x1366, actual 2048x2732)
      const mockScreenshot = await sharp({
        create: {
          width: 2048,
          height: 2732,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const base64 = mockScreenshot.toString('base64');
      const logicalWidth = 1024;
      const logicalHeight = 1366;

      const result = await overlayGridLines(base64, 10, logicalWidth, logicalHeight);

      // Scale factor should be 2x
      expect(result.scaleFactor.x).toBe(2);
      expect(result.scaleFactor.y).toBe(2);

      // Verify center cell E5
      const cellE5 = result.gridMap.get('E5');
      expect(cellE5).toBeDefined();
      
      // Center of E5 in logical space: col 4, row 4 (0-indexed)
      // Expected: (4.5 * 1024/10, 4.5 * 1366/10) = (460.8, 614.7)
      expect(cellE5!.x).toBeGreaterThan(450);
      expect(cellE5!.x).toBeLessThan(470);
      expect(cellE5!.y).toBeGreaterThan(600);
      expect(cellE5!.y).toBeLessThan(630);

      // These coordinates should work with Appium tap commands
      expect(cellE5!.x).toBeLessThan(logicalWidth);
      expect(cellE5!.y).toBeLessThan(logicalHeight);
    });

    it('should create grid covering entire screenshot (not just corner)', async () => {
      // This is the key test for the bug fix
      const actualWidth = 1284;
      const actualHeight = 2778;
      const mockScreenshot = await sharp({
        create: {
          width: actualWidth,
          height: actualHeight,
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const base64 = mockScreenshot.toString('base64');
      const result = await overlayGridLines(base64, 10, 390, 844);

      // Check corners and edges to ensure grid covers entire screenshot
      const cellA1 = result.gridMap.get('A1');   // Top-left
      const cellJ1 = result.gridMap.get('J1');   // Top-right
      const cellA10 = result.gridMap.get('A10'); // Bottom-left
      const cellJ10 = result.gridMap.get('J10'); // Bottom-right

      expect(cellA1).toBeDefined();
      expect(cellJ1).toBeDefined();
      expect(cellA10).toBeDefined();
      expect(cellJ10).toBeDefined();

      // All coordinates should be in logical space
      expect(cellA1!.x).toBeLessThan(390);
      expect(cellJ1!.x).toBeLessThan(390);
      expect(cellA1!.y).toBeLessThan(844);
      expect(cellA10!.y).toBeLessThan(844);

      // Top-right should be near right edge (logical)
      expect(cellJ10!.x).toBeGreaterThan(300); // Near right edge
      expect(cellJ10!.y).toBeGreaterThan(700); // Near bottom edge
    });

    it('should handle non-uniform scaling (different X and Y scales)', async () => {
      // Create a screenshot with different X and Y scales
      const mockScreenshot = await sharp({
        create: {
          width: 1200,  // 3x scale
          height: 1600,  // 2x scale
          channels: 4,
          background: { r: 255, g: 255, b: 255, alpha: 1 },
        },
      })
        .png()
        .toBuffer();

      const base64 = mockScreenshot.toString('base64');
      const result = await overlayGridLines(base64, 10, 400, 800);

      // Different scale factors
      expect(result.scaleFactor.x).toBe(3);
      expect(result.scaleFactor.y).toBe(2);

      // Coordinates should still be in logical space
      const cellE5 = result.gridMap.get('E5');
      expect(cellE5).toBeDefined();
      expect(cellE5!.x).toBeLessThan(400);
      expect(cellE5!.y).toBeLessThan(800);
    });
  });
});

