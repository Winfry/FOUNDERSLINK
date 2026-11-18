// An image file imported in code is something an <Image> can draw: the
// bundler turns it into a reference to the asset.
declare module '*.jpg' {
  const source: import('react-native').ImageSourcePropType;
  export default source;
}
declare module '*.png' {
  const source: import('react-native').ImageSourcePropType;
  export default source;
}
