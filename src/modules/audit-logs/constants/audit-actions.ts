/**
 * Audit Action Constants
 *
 * Centralized definition of all auditable actions in the system.
 * Organized by domain for maintainability.
 */

// Authentication Actions
export const AUTH_ACTIONS = {
  LOGIN: 'LOGIN',
  LOGIN_FAILED: 'LOGIN_FAILED',
  LOGOUT: 'LOGOUT',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
  REQUEST_PASSWORD_RESET: 'REQUEST_PASSWORD_RESET',
  RESET_PASSWORD: 'RESET_PASSWORD',
} as const;

// User Management Actions
export const USER_ACTIONS = {
  CREATE_USER: 'CREATE_USER',
  UPDATE_USER: 'UPDATE_USER',
  DELETE_USER: 'DELETE_USER',
  ACTIVATE_USER: 'ACTIVATE_USER',
  DEACTIVATE_USER: 'DEACTIVATE_USER',
  RESET_USER_PASSWORD: 'RESET_USER_PASSWORD',
} as const;

// Restaurant Management Actions
export const RESTAURANT_ACTIONS = {
  IMPERSONATE_START: 'IMPERSONATE_START',
  IMPERSONATE_END: 'IMPERSONATE_END',
} as const;

// Entity Types
export const AUDIT_ENTITIES = {
  USER: 'USER',
  AUTH: 'AUTH',
  RESTAURANT: 'RESTAURANT',
} as const;

// All actions combined for type safety
export const AUDIT_ACTIONS = {
  ...AUTH_ACTIONS,
  ...USER_ACTIONS,
  ...RESTAURANT_ACTIONS,
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];
export type AuditEntity = (typeof AUDIT_ENTITIES)[keyof typeof AUDIT_ENTITIES];
