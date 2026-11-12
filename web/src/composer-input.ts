// Multiline by default on every device. Explicit Ctrl/Cmd+Enter sends;
// IME confirmation never sends, including Safari's legacy keyCode 229.
export function isSubmitShortcut(event: { key: string; ctrlKey: boolean; metaKey: boolean; shiftKey: boolean; altKey: boolean; isComposing: boolean; keyCode: number; repeat?: boolean }, composing: boolean) {
  return event.key === 'Enter' && (event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey && !event.repeat && !composing && !event.isComposing && event.keyCode !== 229;
}
