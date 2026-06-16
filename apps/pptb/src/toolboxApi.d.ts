import type { PptbToolboxApi } from '@pavb/platform';

declare global {
  interface Window {
    toolboxAPI?: PptbToolboxApi;
  }
}

export {};
