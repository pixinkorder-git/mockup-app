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
  /** `${mockupId}:${artId}` for single-frame, `${mockupId}` for multi-frame. */
  id: string;
  type: 'single' | 'multi';
  mockupId: string;
  artId?: string; // single-frame only
}
