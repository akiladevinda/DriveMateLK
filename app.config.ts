import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'DriveMate LK',
  slug: 'drivemate-lk',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'drivematelk',
  userInterfaceStyle: 'automatic',
  splash: {
    image: './assets/minimal-splash.png',
    resizeMode: 'contain',
    backgroundColor: '#0D1B2A',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.drivematelk.app',
    infoPlist: {
      NSCameraUsageDescription:
        'DriveMate LK needs camera access to scan dashboard warning lights and vehicle documents.',
      NSPhotoLibraryUsageDescription:
        'DriveMate LK needs photo library access to upload vehicle documents and receipts.',
      NSLocationWhenInUseUsageDescription:
        'DriveMate LK needs your location to find nearby garages and roadside assistance.',
      NSFaceIDUsageDescription:
        'DriveMate LK uses Face ID to protect sensitive vehicle documents.',
      NSMicrophoneUsageDescription:
        'DriveMate LK may use the microphone for voice symptom descriptions.',
    },
  },
  android: {
    adaptiveIcon: {
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      backgroundColor: '#0D1B2A',
      monochromeImage: './assets/android-icon-monochrome.png',
    },
    package: 'com.drivematelk.app',
    permissions: [
      'CAMERA',
      'READ_EXTERNAL_STORAGE',
      'WRITE_EXTERNAL_STORAGE',
      'ACCESS_FINE_LOCATION',
      'ACCESS_COARSE_LOCATION',
      'USE_BIOMETRIC',
      'USE_FINGERPRINT',
      'RECEIVE_BOOT_COMPLETED',
      'VIBRATE',
      'POST_NOTIFICATIONS',
    ],
    config: {
      googleMaps: {
        apiKey: process.env.EXPO_PUBLIC_GOOGLE_MAPS_ANDROID_KEY,
      },
    },
  },
  web: {
    favicon: './assets/favicon.png',
    bundler: 'metro',
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    'expo-font',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#0D1B2A',
        image: './assets/minimal-splash.png',
        imageWidth: 280,
        resizeMode: 'contain',
      },
    ],
    [
      'expo-notifications',
      {
        color: '#2EC946',
      },
    ],
    [
      'expo-camera',
      {
        cameraPermission:
          'Allow DriveMate LK to access your camera to scan warning lights and documents.',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission:
          'Allow DriveMate LK to access your photos for documents and receipts.',
      },
    ],
    [
      'expo-location',
      {
        locationWhenInUsePermission:
          'Allow DriveMate LK to use your location to find nearby garages and roadside help.',
      },
    ],
    'expo-local-authentication',
  ],
  experiments: {
    typedRoutes: true,
  },
  extra: {
    eas: {
      projectId: 'replace-with-eas-project-id',
    },
    router: {
      origin: false,
    },
  },
  owner: 'drivematelk',
});
