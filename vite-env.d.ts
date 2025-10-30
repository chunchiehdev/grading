/// <reference types="vite/client" />

/**
 * Type definitions for Vite-specific features
 */
interface ImportMetaEnv {
  readonly NODE_ENV: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
  readonly hot?: {
    readonly data: unknown;
    accept(): void;
    accept(cb: (mod: unknown) => void): void;
    accept(dep: string, cb: (mod: unknown) => void): void;
    accept(deps: readonly string[], cb: (mods: unknown[]) => void): void;
    dispose(cb: (data: unknown) => void): void;
    decline(): void;
    invalidate(): void;
    on(event: string, cb: (...args: unknown[]) => void): void;
  };
}
