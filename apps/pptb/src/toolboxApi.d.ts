import type { PptbToolboxApi } from '@ryanmakes/eb_platformadapter';

declare global {
  interface Window {
    toolboxAPI?: PptbToolboxApi;
  }
}

export {};
