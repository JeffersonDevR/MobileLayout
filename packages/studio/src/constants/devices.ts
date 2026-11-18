import { DevicePreset } from '../types';

export const DEVICE_PRESETS: DevicePreset[] = [
  // --- iOS Devices ---
  {
    id: 'iphone-15',
    name: 'iPhone 15 Pro',
    width: 393,
    height: 852,
    isMobile: true,
    hasFrame: true,
    platform: 'ios',
    brand: 'apple',
    cameraCutout: 'island',
    navBarType: 'gesture',
    safeArea: { top: 47, bottom: 34 }
  },
  {
    id: 'iphone-14',
    name: 'iPhone 14 / 13',
    width: 390,
    height: 844,
    isMobile: true,
    hasFrame: true,
    platform: 'ios',
    brand: 'apple',
    cameraCutout: 'notch',
    navBarType: 'gesture',
    safeArea: { top: 47, bottom: 34 }
  },
  {
    id: 'ipad-mini',
    name: 'iPad Mini',
    width: 744,
    height: 1133,
    isMobile: true,
    hasFrame: true,
    platform: 'ios',
    brand: 'apple',
    cameraCutout: 'none',
    navBarType: 'gesture',
    safeArea: { top: 24, bottom: 20 }
  },

  // --- Android Devices ---
  {
    id: 'pixel-8-pro',
    name: 'Google Pixel 8 Pro',
    width: 412,
    height: 915,
    isMobile: true,
    hasFrame: true,
    platform: 'android',
    brand: 'google',
    cameraCutout: 'punch-hole-center',
    navBarType: 'gesture',
    safeArea: { top: 38, bottom: 24 }
  },
  {
    id: 'pixel-7a',
    name: 'Google Pixel 7a',
    width: 412,
    height: 892,
    isMobile: true,
    hasFrame: true,
    platform: 'android',
    brand: 'google',
    cameraCutout: 'punch-hole-center',
    navBarType: 'gesture',
    safeArea: { top: 36, bottom: 24 }
  },
  {
    id: 'galaxy-s24-ultra',
    name: 'Samsung Galaxy S24 Ultra',
    width: 412,
    height: 915,
    isMobile: true,
    hasFrame: true,
    platform: 'android',
    brand: 'samsung',
    cameraCutout: 'punch-hole-center',
    navBarType: 'gesture',
    safeArea: { top: 38, bottom: 24 }
  },
  {
    id: 'galaxy-s23',
    name: 'Samsung Galaxy S23',
    width: 360,
    height: 780,
    isMobile: true,
    hasFrame: true,
    platform: 'android',
    brand: 'samsung',
    cameraCutout: 'punch-hole-center',
    navBarType: '3-button',
    safeArea: { top: 32, bottom: 24 }
  },
  {
    id: 'z-fold-5-cover',
    name: 'Galaxy Z Fold 5 (Cover)',
    width: 375,
    height: 920,
    isMobile: true,
    hasFrame: true,
    platform: 'android',
    brand: 'samsung',
    cameraCutout: 'punch-hole-center',
    navBarType: 'gesture',
    safeArea: { top: 34, bottom: 24 }
  },
  {
    id: 'z-fold-5-open',
    name: 'Galaxy Z Fold 5 (Unfolded)',
    width: 768,
    height: 904,
    isMobile: true,
    hasFrame: true,
    platform: 'android',
    brand: 'samsung',
    cameraCutout: 'punch-hole-right',
    navBarType: 'gesture',
    safeArea: { top: 32, bottom: 24 }
  },
  {
    id: 'xiaomi-13-pro',
    name: 'Xiaomi 13 Pro',
    width: 393,
    height: 851,
    isMobile: true,
    hasFrame: true,
    platform: 'android',
    brand: 'xiaomi',
    cameraCutout: 'punch-hole-center',
    navBarType: 'gesture',
    safeArea: { top: 36, bottom: 24 }
  },
  {
    id: 'galaxy-tab-s9',
    name: 'Samsung Galaxy Tab S9',
    width: 800,
    height: 1280,
    isMobile: true,
    hasFrame: true,
    platform: 'android',
    brand: 'samsung',
    cameraCutout: 'punch-hole-center',
    navBarType: 'gesture',
    safeArea: { top: 24, bottom: 20 }
  },

  // --- Responsive / Generic ---
  {
    id: 'responsive',
    name: 'Responsive Canvas',
    width: 430,
    height: 800,
    isMobile: false,
    hasFrame: false,
    platform: 'generic',
    brand: 'generic',
    cameraCutout: 'none',
    safeArea: { top: 0, bottom: 0 }
  }
];
