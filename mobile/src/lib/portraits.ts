import type { ImageSourcePropType } from 'react-native';

/**
 * Faces for the demo, cut from the one photo of people at work the app
 * already carries (assets/images/background-all.jpg, 612 × 500): the
 * founder at her desk and the man beside her. Members without a photo are
 * shown by their initials. Once members upload profile photos, those win.
 *
 * fx, fy: the centre of the face in the photo, from 0 to 1.
 * k: how many times wider than the circle the photo is drawn.
 */
export interface Portrait {
  source: ImageSourcePropType;
  width: number;
  height: number;
  fx: number;
  fy: number;
  k: number;
}

const office = require('../../assets/images/background-all.jpg') as ImageSourcePropType;

const PORTRAITS: Record<string, Portrait> = {
  'Amina Wanjiru': { source: office, width: 612, height: 500, fx: 0.715, fy: 0.5, k: 3.6 },
  'Brian Otieno': { source: office, width: 612, height: 500, fx: 0.505, fy: 0.17, k: 3.9 },
};

export function portraitFor(name: string): Portrait | undefined {
  return PORTRAITS[name.trim()];
}
