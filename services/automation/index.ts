// Action DSL - Minimal, Safe Page Automation
// 
// This module provides a declarative DSL for page actions routed through aiBridge
// with permissions, stable element handles, timeouts, retries, and cancellation.
// No eval. Works in Electron (primary), no-ops on web.

// Core Action DSL
export * from './actions';
export { ActionExecutor } from './executor';

// Smart Automation Loop (Plan-Execute-Reflect)
export * from './smart-loop';

// Individual components
export * from './planner';
export * from './resolver';
export * from './policy';
export * from './reflection';
export * from './memory';
export * from './telemetry';

// Examples and utilities
export * from './examples';
