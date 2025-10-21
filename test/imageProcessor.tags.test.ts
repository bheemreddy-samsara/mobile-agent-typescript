/**
 * Unit tests for Numeric Tagging overlay
 */

import sharp from 'sharp';
import { overlayNumericTags } from '../src/utils/imageProcessor';
import { UIElement, UIElementType } from '../src/types';
import { UIObserver } from '../src/observer/UIObserver';

describe('Numeric Tagging Overlay', () => {
  it('should overlay numeric tags and map clickable elements', async () => {
    // Create a base white image 400x800
    const base = await sharp({
      create: { width: 400, height: 800, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
      .png()
      .toBuffer();

    const base64 = base.toString('base64');

    // Define elements: 3 clickable with bounds, 1 non-clickable
    const elements: UIElement[] = [
      {
        elementId: 'e1',
        text: 'Login',
        resourceId: 'com.example:id/login',
        className: 'android.widget.Button',
        contentDesc: 'Login',
        bounds: { x1: 50, y1: 100, x2: 150, y2: 150 },
        elementType: UIElementType.BUTTON,
        clickable: true,
        scrollable: false,
        focusable: true,
        longClickable: false,
        checked: false,
        enabled: true,
        visible: true,
      },
      {
        elementId: 'e2',
        text: 'Email',
        resourceId: 'com.example:id/email',
        className: 'android.widget.EditText',
        contentDesc: 'Email',
        bounds: { x1: 60, y1: 200, x2: 300, y2: 240 },
        elementType: UIElementType.EDIT_TEXT,
        clickable: true,
        scrollable: false,
        focusable: true,
        longClickable: false,
        checked: false,
        enabled: true,
        visible: true,
      },
      {
        elementId: 'e3',
        text: 'Settings',
        resourceId: 'com.example:id/settings',
        className: 'android.widget.Button',
        contentDesc: 'Settings',
        bounds: { x1: 200, y1: 600, x2: 350, y2: 650 },
        elementType: UIElementType.BUTTON,
        clickable: true,
        scrollable: false,
        focusable: true,
        longClickable: false,
        checked: false,
        enabled: true,
        visible: true,
      },
      {
        elementId: 'e4',
        text: 'Decor',
        resourceId: 'com.example:id/decor',
        className: 'android.view.View',
        contentDesc: 'Decoration',
        bounds: { x1: 10, y1: 10, x2: 30, y2: 30 },
        elementType: UIElementType.UNKNOWN,
        clickable: false,
        scrollable: false,
        focusable: false,
        longClickable: false,
        checked: false,
        enabled: true,
        visible: true,
      },
    ];

    const { image, mapping } = await overlayNumericTags(base64, elements);

    // Mapping should include only the 3 clickable/visible elements
    expect(mapping.size).toBe(3);

    // Decoded image should be same dimensions and not identical to base (overlay applied)
    const buf = Buffer.from(image, 'base64');
    expect(buf.equals(base)).toBe(false);
    const meta = await sharp(buf).metadata();
    expect(meta.width).toBe(400);
    expect(meta.height).toBe(800);

    // Sample pixel near center of e1 and expect red overlay dominance
    const centerX = Math.floor((50 + 150) / 2);
    const centerY = Math.floor((100 + 150) / 2);
    const raw = await sharp(buf).raw().ensureAlpha().toBuffer({ resolveWithObject: true });
    const width = meta.width || 400;
    const sampleRadius = 3;
    let redDominant = false;
    for (let dy = -sampleRadius; dy <= sampleRadius && !redDominant; dy++) {
      for (let dx = -sampleRadius; dx <= sampleRadius && !redDominant; dx++) {
        const x = Math.min(Math.max(centerX + dx, 0), width - 1);
        const y = Math.min(Math.max(centerY + dy, 0), (meta.height || 800) - 1);
        const idx = (y * width + x) * 4;
        const r = raw.data[idx];
        const g = raw.data[idx + 1];
        const b = raw.data[idx + 2];
        if (r > g && r > b) redDominant = true;
      }
    }
    expect(redDominant).toBe(true);
  });

  it('UIObserver should populate tagMapping in tagged mode', async () => {
    // Prepare a mock driver
    const png = await sharp({
      create: { width: 300, height: 600, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
    })
      .png()
      .toBuffer();
    const screenshotBase64 = png.toString('base64');

    // Minimal pageSource XML with two nodes, one clickable with bounds
    const xml = `<?xml version='1.0' encoding='UTF-8' standalone='yes' ?>
      <hierarchy>
        <node index="0" class="android.widget.Button" text="OK" clickable="true" bounds="[100,200][200,250]" />
        <node index="1" class="android.view.View" text="" clickable="false" bounds="[0,0][50,50]" />
      </hierarchy>`;

    const mockDriver: any = {
      getPageSource: jest.fn().mockResolvedValue(xml),
      getCurrentActivity: jest.fn().mockResolvedValue('TestActivity'),
      getWindowSize: jest.fn().mockResolvedValue({ width: 300, height: 600 }),
      takeScreenshot: jest.fn().mockResolvedValue(screenshotBase64),
      capabilities: { platformName: 'Android' },
    };

    const observer = new UIObserver();
    const state = await observer.getUIState(mockDriver, 'tagged');

    // Should include a tagged screenshot and a mapping of size 1
    expect(state.screenshotBase64).toBeDefined();
    expect(state.tagMapping).toBeDefined();
    expect(state.tagMapping!.size).toBe(1);

    // Mapped element should correspond to the clickable one with elementId "1"
    const onlyTag = Array.from(state.tagMapping!.entries())[0];
    const elem = onlyTag[1];
    expect(elem.elementId).toBe('1');
    expect(elem.clickable).toBe(true);
  });
});
