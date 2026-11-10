import { describe, expect, it } from 'vitest';
import { isSubmitShortcut } from '../web/src/composer-input';
const enter = { key: 'Enter', ctrlKey: false, metaKey: false, shiftKey: false, altKey: false, isComposing: false, keyCode: 13 };
describe('Multiline composer intent', () => {
  it('keeps plain Enter and Shift+Enter as newlines, with explicit Ctrl/Cmd submission', () => {
    expect(isSubmitShortcut(enter, false)).toBe(false);
    expect(isSubmitShortcut({ ...enter, shiftKey: true }, false)).toBe(false);
    expect(isSubmitShortcut({ ...enter, ctrlKey: true }, false)).toBe(true);
    expect(isSubmitShortcut({ ...enter, metaKey: true }, false)).toBe(true);
  });
  it('never submits IME confirmation including Safari keyCode 229, repeats and modifier ambiguity', () => {
    expect(isSubmitShortcut({ ...enter, ctrlKey: true, isComposing: true }, false)).toBe(false);
    expect(isSubmitShortcut({ ...enter, ctrlKey: true, keyCode: 229 }, false)).toBe(false);
    expect(isSubmitShortcut({ ...enter, ctrlKey: true, repeat: true }, false)).toBe(false);
    expect(isSubmitShortcut({ ...enter, ctrlKey: true }, true)).toBe(false);
    expect(isSubmitShortcut({ ...enter, ctrlKey: true, shiftKey: true }, false)).toBe(false);
    expect(isSubmitShortcut({ ...enter, ctrlKey: true, altKey: true }, false)).toBe(false);
  });
});
