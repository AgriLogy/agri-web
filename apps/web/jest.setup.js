// jest setupFiles entry — runs before the test framework is loaded so
// `expect` is not yet available here. Environment polyfills only.

// Minimal MessageChannel polyfill so antd's rc-form (which uses it for
// batched watcher notifications) works under jsdom. We avoid Node's
// `worker_threads` MessageChannel because it spins up a helper thread
// that keeps the event loop alive and prevents jest from exiting.
if (typeof globalThis.MessageChannel === 'undefined') {
  class FakeMessagePort {
    constructor() {
      this.onmessage = null;
      this._other = null;
    }
    postMessage(data) {
      const target = this._other;
      if (target && typeof target.onmessage === 'function') {
        // Defer so postMessage stays asynchronous like the real DOM API.
        setTimeout(() => target.onmessage({ data }), 0);
      }
    }
    close() {}
    start() {}
    addEventListener() {}
    removeEventListener() {}
  }
  globalThis.MessageChannel = class FakeMessageChannel {
    constructor() {
      this.port1 = new FakeMessagePort();
      this.port2 = new FakeMessagePort();
      this.port1._other = this.port2;
      this.port2._other = this.port1;
    }
  };
}

// jsdom doesn't ship ResizeObserver; antd's rc-resize-observer needs it.
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class FakeResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  });
}
