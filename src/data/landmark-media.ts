export interface LandmarkMedia {
  landmarkId: string;
  imagePath: string;
  author: string;
  license: string;
  sourceUrl: string;
}

// The photos are vendored so the trip journal also works offline. Rights and
// source pages are documented in docs/DATA_SOURCES_AND_LICENSES.md.
export const LANDMARK_MEDIA: LandmarkMedia[] = [
  {
    landmarkId: 'eiffel-tower',
    imagePath: 'landmarks/eiffel-tower.jpg',
    author: 'Edisonblus',
    license: 'CC BY-SA 3.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Eiffel_tower-Paris.jpg',
  },
  {
    landmarkId: 'cologne-cathedral',
    imagePath: 'landmarks/cologne-cathedral.jpg',
    author: 'Yair-haklai',
    license: 'CC BY-SA 4.0',
    sourceUrl: 'https://commons.wikimedia.org/wiki/File:Exterior_of_Cologne_Cathedral-.jpg',
  },
];
