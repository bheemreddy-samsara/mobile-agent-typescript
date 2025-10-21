/**
 * Tests for robust JSON parsing from LLM responses with code fences/prose
 */

import { BaseLLMProvider } from '../src/llm/LLMProvider';
import { UIState } from '../src/types';

class MockLLMProvider extends BaseLLMProvider {
  private mockResponse = '';
  setResponse(r: string) { this.mockResponse = r; }
  async query(): Promise<string> { return this.mockResponse; }
  async queryWithVision(): Promise<string> { return this.mockResponse; }
}

describe('LLM parsing with code fences', () => {
  const ui: UIState = {
    activity: 'A',
    elements: [],
    timestamp: new Date(),
    deviceInfo: {},
  };

  it('parses fenced JSON for hierarchy action', async () => {
    const p = new MockLLMProvider();
    p.setResponse('```json\n{"action":"click","element_id":"e1","confidence":0.9}\n```');
    const res = await p.generateAction(ui, 'click', []);
    expect(res.action).toBe('click');
    expect(res.elementId).toBe('e1');
    expect(res.confidence).toBe(0.9);
  });

  it('parses fenced JSON for grid overlay', async () => {
    const p = new MockLLMProvider();
    (ui as any).screenshotBase64 = 'base64';
    (ui as any).gridMap = new Map([['C3', { x: 10, y: 10 }]]);
    p.setResponse('Here you go:\n```json\n{"action":"click","grid_position":"C3","confidence":0.8}\n```');
    const res = await p.generateActionWithGridOverlay(ui, 'click', []);
    expect(res.action).toBe('click');
    expect(res.gridPosition).toBe('C3');
    expect(res.coordinates).toEqual({ x: 10, y: 10 });
  });

  it('parses fenced JSON for pure vision', async () => {
    const p = new MockLLMProvider();
    p.setResponse('```json\n{"element":"Login","location":{"x_percent":50,"y_percent":80},"action":"click"}\n```');
    const res = await p.generateActionWithPureVision('b64', 'click', { width: 100, height: 100 }, []);
    expect(res.coordinates).toEqual({ x: 50, y: 80 });
  });
});

