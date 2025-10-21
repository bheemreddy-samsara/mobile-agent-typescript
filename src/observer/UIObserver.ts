/**
 * UI Observer - Observes and extracts UI state from the device
 */

import type { Browser } from "webdriverio";
import { parseString } from "xml2js";
import { type UIElement, UIElementType, type UIState } from "../types";
import { overlayGridLines, overlayNumericTags } from "../utils/imageProcessor";
import { logger } from "../utils/logger";

export class UIObserver {
  /**
   * Get the current UI state from the driver
   */
  async getUIState(
    driver: Browser,
    captureMode: "none" | "screenshot" | "tagged" | "grid" = "none",
    gridSize = 10,
  ): Promise<UIState> {
    try {
      const pageSource = await driver.getPageSource();
      const activity = await this.getCurrentActivity(driver);
      const deviceInfo = await this.getDeviceInfo(driver);

      const elements = await this.parseUIHierarchy(pageSource);

      const state: UIState = {
        activity,
        elements,
        xmlSource: pageSource,
        timestamp: new Date(),
        deviceInfo,
      };

      // Capture screenshot based on mode
      if (captureMode !== "none") {
        const screenshotBase64 = await this.captureScreenshotAsBase64(driver);
        state.screenshotBase64 = screenshotBase64;

        if (captureMode === "tagged") {
          const { image, mapping } = await overlayNumericTags(screenshotBase64, elements);
          state.screenshotBase64 = image;
          state.tagMapping = mapping;
          logger.debug(`Tagged screenshot with ${mapping.size} elements`);
        } else if (captureMode === "grid") {
          const windowSize = await driver.getWindowSize();
          const { image, gridMap, scaleFactor } = await overlayGridLines(
            screenshotBase64,
            gridSize,
            windowSize.width,
            windowSize.height,
          );
          state.screenshotBase64 = image;
          state.gridMap = gridMap; // Already scaled to logical coordinates
          logger.debug(
            `Created grid overlay with ${gridMap.size} cells (scale: ${scaleFactor.x.toFixed(2)}x${scaleFactor.y.toFixed(2)})`,
          );
        }
      }

      logger.debug(`Current state: ${activity}, ${elements.length} elements`);
      return state;
    } catch (error) {
      logger.error("Failed to get UI state:", error);
      throw error;
    }
  }

  /**
   * Capture screenshot as base64 string
   */
  async captureScreenshotAsBase64(driver: Browser): Promise<string> {
    try {
      const screenshot = await driver.takeScreenshot();
      return screenshot;
    } catch (error) {
      logger.error("Failed to capture screenshot:", error);
      throw error;
    }
  }

  /**
   * Capture screenshot with numeric tags overlaid on interactive elements
   */
  async captureScreenshotWithTags(
    driver: Browser,
    elements: UIElement[],
  ): Promise<{ screenshot: string; tagMapping: Map<number, UIElement> }> {
    try {
      const screenshotBase64 = await this.captureScreenshotAsBase64(driver);
      const result = await overlayNumericTags(screenshotBase64, elements);
      return {
        screenshot: result.image,
        tagMapping: result.mapping,
      };
    } catch (error) {
      logger.error("Failed to capture tagged screenshot:", error);
      throw error;
    }
  }

  /**
   * Generate grid overlay on screenshot
   */
  async generateGridOverlay(
    driver: Browser,
    gridSize = 10,
  ): Promise<{ screenshot: string; gridMap: Map<string, { x: number; y: number }> }> {
    try {
      const screenshotBase64 = await this.captureScreenshotAsBase64(driver);
      const windowSize = await driver.getWindowSize();
      const result = await overlayGridLines(
        screenshotBase64,
        gridSize,
        windowSize.width, // Logical width
        windowSize.height, // Logical height
      );
      return {
        screenshot: result.image,
        gridMap: result.gridMap, // Already in logical coordinates
      };
    } catch (error) {
      logger.error("Failed to generate grid overlay:", error);
      throw error;
    }
  }

  /**
   * Parse UI hierarchy from XML
   */
  private async parseUIHierarchy(pageSource: string): Promise<UIElement[]> {
    const elements: UIElement[] = [];

    if (!pageSource) {
      return elements;
    }

    try {
      const parsedXml = await this.parseXML(pageSource);
      let elementId = 0;

      const traverse = (node: any) => {
        if (!node) return;

        elementId++;
        const element = this.parseElement(node.$, elementId.toString());
        elements.push(element);

        // Recursively process children
        for (const key in node) {
          if (key !== "$" && key !== "_") {
            const children = Array.isArray(node[key]) ? node[key] : [node[key]];
            for (const child of children) {
              traverse(child);
            }
          }
        }
      };

      // Start traversal from root
      const root = parsedXml.hierarchy || parsedXml;
      if (root) {
        for (const key in root) {
          if (key !== "$") {
            const nodes = Array.isArray(root[key]) ? root[key] : [root[key]];
            for (const nodeItem of nodes) {
              traverse(nodeItem);
            }
          }
        }
      }

      return elements;
    } catch (error) {
      logger.error("Failed to parse XML:", error);
      return elements;
    }
  }

  /**
   * Parse XML string to object
   */
  private parseXML(xml: string): Promise<any> {
    return new Promise((resolve, reject) => {
      parseString(xml, { explicitArray: false }, (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Parse a single UI element from XML attributes
   */
  private parseElement(attribs: any, elementId: string): UIElement {
    const attrs = attribs ?? {};

    const className = attrs.class || "";
    const elementType = this.inferElementType(className);
    const bounds = this.parseBounds(attrs.bounds || "");

    return {
      elementId,
      text: attrs.text || "",
      resourceId: attrs["resource-id"] || undefined,
      className,
      contentDesc: attrs["content-desc"] || undefined,
      bounds,
      elementType,
      clickable: attrs.clickable === "true",
      scrollable: attrs.scrollable === "true",
      focusable: attrs.focusable === "true",
      longClickable: attrs["long-clickable"] === "true",
      checked: attrs.checked === "true",
      enabled: attrs.enabled !== "false",
      visible: attrs.visible !== "false",
    };
  }

  /**
   * Infer element type from class name
   */
  private inferElementType(className: string): UIElementType {
    const lower = className.toLowerCase();

    if (lower.includes("button")) return UIElementType.BUTTON;
    if (lower.includes("edittext") || lower.includes("edit")) return UIElementType.EDIT_TEXT;
    if (lower.includes("textview") || lower.includes("text")) return UIElementType.TEXT_VIEW;
    if (lower.includes("imageview") || lower.includes("image")) return UIElementType.IMAGE_VIEW;
    if (lower.includes("listview")) return UIElementType.LIST_VIEW;
    if (lower.includes("recyclerview")) return UIElementType.RECYCLER_VIEW;
    if (lower.includes("webview")) return UIElementType.WEBVIEW;
    if (lower.includes("dialog") || lower.includes("alertdialog")) return UIElementType.DIALOG;
    if (lower.includes("toggle") || lower.includes("switch")) return UIElementType.TOGGLE;
    if (lower.includes("spinner")) return UIElementType.SPINNER;

    return UIElementType.UNKNOWN;
  }

  /**
   * Parse bounds string like '[100,200][300,400]'
   */
  private parseBounds(
    boundsStr: string,
  ): { x1: number; y1: number; x2: number; y2: number } | undefined {
    try {
      // Format: [x1,y1][x2,y2]
      const parts = boundsStr.replace(/\]\[/g, ",").replace(/[[\]]/g, "").split(",");
      if (parts.length === 4) {
        return {
          x1: Number.parseInt(parts[0], 10),
          y1: Number.parseInt(parts[1], 10),
          x2: Number.parseInt(parts[2], 10),
          y2: Number.parseInt(parts[3], 10),
        };
      }
    } catch (_error) {
      // Ignore parsing errors
    }
    return undefined;
  }

  /**
   * Get current activity name
   */
  private async getCurrentActivity(driver: Browser): Promise<string> {
    try {
      return await driver.getCurrentActivity();
    } catch (error) {
      logger.warn("Failed to get current activity:", error);
      return "Unknown";
    }
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(driver: Browser): Promise<Record<string, any>> {
    try {
      const capabilities: any = driver.capabilities;
      return {
        platform: capabilities.platformName || capabilities["appium:platformName"],
        platformVersion: capabilities.platformVersion || capabilities["appium:platformVersion"],
        deviceName: capabilities.deviceName || capabilities["appium:deviceName"],
      };
    } catch (error) {
      logger.warn("Failed to get device info:", error);
      return {};
    }
  }

  /**
   * Get element center coordinates
   */
  getElementCenter(element: UIElement): { x: number; y: number } | undefined {
    if (!element.bounds) {
      return undefined;
    }

    return {
      x: Math.floor((element.bounds.x1 + element.bounds.x2) / 2),
      y: Math.floor((element.bounds.y1 + element.bounds.y2) / 2),
    };
  }

  /**
   * Find element by text
   */
  findElementByText(elements: UIElement[], text: string): UIElement | undefined {
    const textLower = text.toLowerCase();
    return elements.find((e) => e.text?.toLowerCase().includes(textLower));
  }

  /**
   * Find element by resource ID
   */
  findElementById(elements: UIElement[], resourceId: string): UIElement | undefined {
    return elements.find((e) => e.resourceId?.includes(resourceId));
  }
}
