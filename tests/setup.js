/**
 * File di setup per i test Jest
 */

// Mock per document
global.document = {
    getElementById: jest.fn(() => ({
        addEventListener: jest.fn(),
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn()
        }
    })),
    querySelector: jest.fn(() => ({
        addEventListener: jest.fn(),
        classList: {
            add: jest.fn(),
            remove: jest.fn(),
            toggle: jest.fn()
        }
    })),
    querySelectorAll: jest.fn(() => []),
    dispatchEvent: jest.fn(),
    addEventListener: jest.fn(),
    createElement: jest.fn(() => ({
        classList: {
            add: jest.fn(),
            remove: jest.fn()
        },
        innerHTML: '',
        appendChild: jest.fn()
    }))
};

// Mock per window
global.window = {
    addEventListener: jest.fn(),
    location: {
        reload: jest.fn()
    },
    matchMedia: jest.fn(() => ({
        matches: false,
        addListener: jest.fn()
    }))
};

// Mock per navigator
global.navigator = {
    language: 'it-IT',
    userLanguage: undefined
};

// Mock per localStorage
const localStorageMock = (function() {
    let store = {};
    return {
        getItem: jest.fn(key => store[key] || null),
        setItem: jest.fn((key, value) => {
            store[key] = value.toString();
        }),
        removeItem: jest.fn(key => {
            delete store[key];
        }),
        clear: jest.fn(() => {
            store = {};
        }),
        length: 0,
        key: jest.fn(i => Object.keys(store)[i] || null)
    };
})();

global.localStorage = localStorageMock;

// Mock per fetch
global.fetch = jest.fn();

// Mock per alert
global.alert = jest.fn();

// Mock per URLSearchParams
global.URLSearchParams = class URLSearchParams {
    constructor(params = {}) {
        this.params = params;
    }
    toString() {
        return Object.entries(this.params)
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
    }
};

// Mock per URL
global.URL = class URL {
    constructor(path, base) {
        this.path = path;
        this.base = base;
        this.search = '';
    }
    toString() {
        return `${this.base}/${this.path}${this.search}`;
    }
};

// Rimuove warning per console.* nei test
global.console.error = jest.fn();
global.console.warn = jest.fn();
global.console.log = jest.fn();

// Custom Events
global.CustomEvent = class CustomEvent {
    constructor(name, options = {}) {
        this.name = name;
        this.detail = options.detail || {};
    }
};