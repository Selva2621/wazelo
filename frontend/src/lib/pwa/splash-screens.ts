/**
 * iOS launch screens (public/icons/splash-*.png). iOS only shows one when the
 * media query matches the device exactly, so each size has its own entry.
 * [css width, css height, pixel ratio]
 */
const DEVICES: [number, number, number][] = [
  [375, 667, 2], // iPhone SE, 8
  [414, 736, 3], // iPhone 8 Plus
  [375, 812, 3], // iPhone X, XS, 11 Pro, 12/13 mini
  [414, 896, 2], // iPhone XR, 11
  [414, 896, 3], // iPhone XS Max, 11 Pro Max
  [390, 844, 3], // iPhone 12, 13, 14
  [428, 926, 3], // iPhone 12/13 Pro Max, 14 Plus
  [393, 852, 3], // iPhone 14 Pro, 15, 15 Pro, 16
  [430, 932, 3], // iPhone 14 Pro Max, 15 Plus, 15 Pro Max, 16 Plus
  [402, 874, 3], // iPhone 16 Pro, 17
  [440, 956, 3], // iPhone 16 Pro Max, 17 Pro Max
  [768, 1024, 2], // iPad, iPad mini (older)
  [820, 1180, 2], // iPad Air, iPad 10th gen
  [834, 1194, 2], // iPad Pro 11
  [1024, 1366, 2], // iPad Pro 12.9
  [810, 1080, 2], // iPad 10.2
  [744, 1133, 2], // iPad mini 6
];

export const splashScreens = DEVICES.map(([w, h, dpr]) => ({
  url: `/icons/splash-${w * dpr}x${h * dpr}.png`,
  media: `(device-width: ${w}px) and (device-height: ${h}px) and (-webkit-device-pixel-ratio: ${dpr}) and (orientation: portrait)`,
}));
