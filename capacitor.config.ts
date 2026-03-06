import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.triada.app',
  appName: 'Triada',
  zoomEnabled: false,
  webDir: 'dist',
  server: {
    cleartext: true,
  },
  plugins: {
    CapacitorSQLite: {
      iosDatabaseLocation: 'Library/CapacitorDatabase',
      iosIsEncryption: false,
      androidIsEncryption: false,
    },
    StatusBar: {
      style: 'DARK',
      overlaysWebView: false,
      backgroundColor: '#FFFFFFFF',
    },
  },
};

export default config;
