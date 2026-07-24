if (typeof globalThis.ResizeObserver === 'undefined') {
  class TestResizeObserver {
    observe(): void {}

    unobserve(): void {}

    disconnect(): void {}
  }

  Object.defineProperty(globalThis, 'ResizeObserver', {
    configurable: true,
    value: TestResizeObserver,
    writable: true,
  });
}

if (typeof document !== 'undefined' && typeof document.getAnimations !== 'function') {
  Object.defineProperty(document, 'getAnimations', {
    configurable: true,
    value: () => [],
  });
}

if (typeof Element !== 'undefined' && typeof Element.prototype.getAnimations !== 'function') {
  Object.defineProperty(Element.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  });
}

if (typeof window !== 'undefined' && typeof window.matchMedia !== 'function') {
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
      addListener: () => undefined,
      removeListener: () => undefined,
      dispatchEvent: () => false,
    }),
  });
}
