/**
 * UI Observer - Observes and extracts UI state from the device
 */

import { parseString } from 'xml2js';
import type { Browser } from 'webdriverio';
import { UIElement, UIState, UIElementType } from '../types';
import { logger } from '../utils/logger';

export class UIObserver {
  /**
   * Get the current UI state from the driver
   */
  async getUIState(driver: Browser): Promise<UIState> {
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

      logger.debug(`Current state: ${activity}, ${elements.length} elements`);
      return state;
    } catch (error) {
      logger.error('Failed to get UI state:', error);
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
          if (key !== '$' && key !== '_') {
            const children = Array.isArray(node[key]) ? node[key] : [node[key]];
            children.forEach((child) => traverse(child));
          }
        }
      };

      // Start traversal from root
      const root = parsedXml.hierarchy || parsedXml;
      if (root) {
        for (const key in root) {
          if (key !== '$') {
            const nodes = Array.isArray(root[key]) ? root[key] : [root[key]];
            nodes.forEach((node) => traverse(node));
          }
        }
      }

      return elements;
    } catch (error) {
      logger.error('Failed to parse XML:', error);
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
    if (!attribs) {
      attribs = {};
    }

    const className = attribs.class || '';
    const elementType = this.inferElementType(className);
    const bounds = this.parseBounds(attribs.bounds || '');

    return {
      elementId,
      text: attribs.text || '',
      resourceId: attribs['resource-id'] || undefined,
      className,
      contentDesc: attribs['content-desc'] || undefined,
      bounds,
      elementType,
      clickable: attribs.clickable === 'true',
      scrollable: attribs.scrollable === 'true',
      focusable: attribs.focusable === 'true',
      longClickable: attribs['long-clickable'] === 'true',
      checked: attribs.checked === 'true',
      enabled: attribs.enabled !== 'false',
      visible: attribs.visible !== 'false',
    };
  }

  /**
   * Infer element type from class name
   */
  private inferElementType(className: string): UIElementType {
    const lower = className.toLowerCase();

    if (lower.includes('button')) return UIElementType.BUTTON;
    if (lower.includes('edittext') || lower.includes('edit')) return UIElementType.EDIT_TEXT;
    if (lower.includes('textview') || lower.includes('text')) return UIElementType.TEXT_VIEW;
    if (lower.includes('imageview') || lower.includes('image')) return UIElementType.IMAGE_VIEW;
    if (lower.includes('listview')) return UIElementType.LIST_VIEW;
    if (lower.includes('recyclerview')) return UIElementType.RECYCLER_VIEW;
    if (lower.includes('webview')) return UIElementType.WEBVIEW;
    if (lower.includes('dialog') || lower.includes('alertdialog')) return UIElementType.DIALOG;
    if (lower.includes('toggle') || lower.includes('switch')) return UIElementType.TOGGLE;
    if (lower.includes('spinner')) return UIElementType.SPINNER;

    return UIElementType.UNKNOWN;
  }

  /**
   * Parse bounds string like '[100,200][300,400]'
   */
  private parseBounds(boundsStr: string): { x1: number; y1: number; x2: number; y2: number } | undefined {
    try {
      // Format: [x1,y1][x2,y2]
      const parts = boundsStr.replace(/\]\[/g, ',').replace(/[\[\]]/g, '').split(',');
      if (parts.length === 4) {
        return {
          x1: parseInt(parts[0], 10),
          y1: parseInt(parts[1], 10),
          x2: parseInt(parts[2], 10),
          y2: parseInt(parts[3], 10),
        };
      }
    } catch (error) {
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
      logger.warn('Failed to get current activity:', error);
      return 'Unknown';
    }
  }

  /**
   * Get device information
   */
  private async getDeviceInfo(driver: Browser): Promise<Record<string, any>> {
    try {
      const capabilities: any = driver.capabilities;
      return {
        platform: capabilities.platformName || capabilities['appium:platformName'],
        platformVersion: capabilities.platformVersion || capabilities['appium:platformVersion'],
        deviceName: capabilities.deviceName || capabilities['appium:deviceName'],
      };
    } catch (error) {
      logger.warn('Failed to get device info:', error);
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
    return elements.find((e) => e.text && e.text.toLowerCase().includes(textLower));
  }

  /**
   * Find element by resource ID
   */
  findElementById(elements: UIElement[], resourceId: string): UIElement | undefined {
    return elements.find((e) => e.resourceId && e.resourceId.includes(resourceId));
  }
}

