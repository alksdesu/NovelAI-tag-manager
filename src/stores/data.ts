import { createStore } from 'solid-js/store';
import type { AppData } from '../types';
import { loadFromStorage } from './persistence';

/**
 * Main persisted data store.
 * Contains categories, tags, settings, and assistant conversations.
 * Automatically persisted to localStorage via effect in persistence.ts.
 */
const [data, setData] = createStore<AppData>(loadFromStorage());

export { data, setData };
