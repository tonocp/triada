import { CapacitorConfig } from '@capacitor/cli';

// TODO: Remove the server option if you are in production
const config: CapacitorConfig = {
  appId: 'com.template.app',
  appName: 'Plantilla',
  zoomEnabled: false,
  webDir: 'dist',
  server: {
    cleartext: true,
  },
  plugins: {
    StatusBar: {
      style: 'DARK',
      overlaysWebView: false,
      backgroundColor: '#FFFFFFFF',
    },
  },
};

export default config;
