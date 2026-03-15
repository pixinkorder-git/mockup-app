export interface ArtImage {
  id: string;
  name: string;
  url: string;
  w: number; // natural width — stored on upload for sync aspect-ratio computation
  h: number; // natural height
}

export interface Frame {
  id: string;
  x: number; // original image coordinates
  y: number;
  w: number;
  h: number;
  color: string; // overlay color
}

export interface MockupTemplate {
  id: string;
  name: string;
  url: string; // blob URL
  frames: Frame[];
}

export interface GeneratedResult {
  id: string;
  mockupId: string;
  mockupName: string;
  artNames: string[];
  dataUrl: string;
}

/** A single renderable unit: one mockup + art assignment. */
export interface Combination {
  /**
   * Single-frame: `${mockupId}:${artId}`
   * Multi-frame:  `${mockupId}:${artStartIdx}`
   */
  id: string;
  type: 'single' | 'multi';
  mockupId: string;
  artId?: string;       // single-frame: the specific art to place
  artStartIdx?: number; // multi-frame: starting index into the arts array for the sliding window
}
