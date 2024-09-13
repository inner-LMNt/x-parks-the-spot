// jest.setup.js

import '@testing-library/jest-dom';

// Polyfill for TextEncoder and TextDecoder
import { TextEncoder, TextDecoder } from 'util';
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Mock Next.js router
jest.mock('next/router', () => require('next-router-mock'));
jest.mock('next/navigation', () => ({
    ...require('next-router-mock'),
    useSearchParams: jest.fn(),
}));

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
    })),
});

// Mock IntersectionObserver
class MockIntersectionObserver {
    constructor(callback) {
        this.callback = callback;
    }
    observe() {}
    unobserve() {}
    disconnect() {}
}
global.IntersectionObserver = MockIntersectionObserver;

// Suppress console.error and console.warn in tests
global.console.error = jest.fn();
global.console.warn = jest.fn();

// Add custom jest matchers
expect.extend({
    // Add any custom matchers here if needed
});

// Set timezone for consistent date testing
process.env.TZ = 'UTC';

// Mock ResizeObserver
class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
}
global.ResizeObserver = ResizeObserver;

// Cleanup after each test
afterEach(() => {
    jest.clearAllMocks();
});