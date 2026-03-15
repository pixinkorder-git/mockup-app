export interface ArtImage {
  id: string;
  name: string;
  url: string; // blob URL
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
