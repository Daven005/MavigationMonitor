import { NativeScriptConfig } from '@nativescript/core';

export default {
  id: 'uk.me.norburys.NavigationMonoitor',
  appResourcesPath: 'App_Resources',
  android: {
    v8Flags: '--expose_gc',
    markingMode: 'none'
  }
} as NativeScriptConfig;