export { DevicePronunciation as WordPronunciation } from "./device-pronunciation";
// Device speech needs no network lookup, so there is nothing to prefetch.
export const prefetchPronunciation: (word: string) => void = () => undefined;
