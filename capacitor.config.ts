import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.hydmetro.tracker',
  appName: 'Hyd Metro Tracker',
  webDir: 'dist',
  bundledWebRuntime: false,
  android: {
    backgroundColor: '#050505',
  },
};

export default config;
