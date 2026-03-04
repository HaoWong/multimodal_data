/**
 * Jest Setup File
 * Configures the test environment before running tests
 */

import '@testing-library/jest-dom';

// Mock window.matchMedia for Ant Design responsive components
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.ResizeObserver = ResizeObserverMock;

// Mock IntersectionObserver
class IntersectionObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

window.IntersectionObserver = IntersectionObserverMock;

// Mock scrollTo
window.scrollTo = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});

// Mock TextEncoder/TextDecoder for streaming tests
global.TextEncoder = class TextEncoder {
  encode(text: string): Uint8Array {
    return new Uint8Array(Buffer.from(text));
  }
};

global.TextDecoder = class TextDecoder {
  decode(buffer?: ArrayBufferView | ArrayBuffer): string {
    if (!buffer) return '';
    return Buffer.from(buffer).toString();
  }
};

// Mock fetch for API tests
global.fetch = jest.fn();

// Suppress console errors during tests (optional)
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  // Filter out specific warnings that are expected in test environment
  const message = args[0]?.toString() || '';
  if (
    message.includes('Warning: An update to') &&
    message.includes('inside a test was not wrapped in act')
  ) {
    return;
  }
  originalConsoleError.apply(console, args);
};
