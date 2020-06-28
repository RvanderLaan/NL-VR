import * as THREE from 'three';

import * as GEOTIFF from 'geotiff';
import { BufferAttribute } from 'three';

type Coverage = 'ahn3_05m_dsm' | 'ahn3_5m_dsm';

// Height data
const format = 'GEOTIFF_FLOAT32';
const crs = 'EPSG:28992';

export interface IBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

const heightBaseUrl = `https://geodata.nationaalgeoregister.nl/ahn3/wcs?SERVICE=WCS&VERSION=1.0.0&REQUEST=GetCoverage&FORMAT=${format}`;
const rgbBaseUrl = `https://geodata.nationaalgeoregister.nl/luchtfoto/infrarood/wms?&REQUEST=GetMap&SERVICE=WMS&VERSION=1.3.0&LAYERS=2019_ortho25&FORMAT=image/jpeg&STYLES=`;

const getMapUrl = (baseUrl: string, bounds: IBounds, scale: number) =>
  `${baseUrl}&BBOX=${bounds.minX},${bounds.minY},${bounds.maxX},${
    bounds.maxY
  }&CRS=${crs}&RESPONSE_CRS=${crs}&WIDTH=${Math.round(
    scale * (bounds.maxX - bounds.minX),
  )}&HEIGHT=${Math.round(scale * (bounds.maxY - bounds.minY))}`;

const getRgbUrl = (bounds: IBounds) =>
  // scale of 4 times, since there are 4 points per meter (every 0.25m)
  `${getMapUrl(rgbBaseUrl, bounds, 4)}`;

const getHeightDataMapUrl = (bounds: IBounds, coverage: Coverage, scale: 2 | 0.2) =>
  // scale of 2 since 2 points per meter (every 0.5m)
  `${getMapUrl(heightBaseUrl, bounds, scale)}&COVERAGE=${coverage}`;

class Tile extends THREE.Object3D {
  heightData: Float32Array;
  minHeight: number;
  maxHeight: number;

  plane: THREE.Mesh;

  constructor(public bounds: IBounds, public heightDataScale: 0.5 | 5) {
    super();

    console.log(bounds);

    const { minX, maxX, minY, maxY } = this.bounds;

    const width = maxX - minX; // meters
    const height = maxY - minY; // meters
    const wVerts = width / heightDataScale;
    const hVerts = height / heightDataScale;

    // Move and scale this tile correctly to the world position/scale
    this.position.add(new THREE.Vector3(minX + width / 2, 0, minY + width / 2));

    const rgbUrl = getRgbUrl(bounds);
    console.log(rgbUrl);
    const texture = new THREE.TextureLoader().load(rgbUrl);

    const geometry = new THREE.PlaneBufferGeometry(width, height, wVerts - 1, hVerts - 1);
    const material = new THREE.MeshStandardMaterial({ map: texture });
    this.plane = new THREE.Mesh(geometry, material);
    this.plane.rotateX(-Math.PI / 2);
    // this.plane.rotateZ(-Math.PI / 2);
    this.add(this.plane);

    this.plane.scale.multiply(new THREE.Vector3(1, -1, 1));

    const verts = geometry.attributes.position as BufferAttribute;
    const vertData: Float32Array = verts.array as any;

    // for (let j = 0; j < wVerts; j++) {
    //   for (let i = 0; i < hVerts; i++) {
    //     //+0 is x, +1 is y.
    //     vertData[3 * (j * wVerts + i) + 2] = Math.random();
    //   }
    // }
    // verts.needsUpdate = true;
    // geometry.computeVertexNormals();

    const heightUrl = getHeightDataMapUrl(
      bounds,
      heightDataScale === 0.5 ? 'ahn3_05m_dsm' : 'ahn3_5m_dsm',
      heightDataScale === 0.5 ? 2 : 0.2,
    );
    console.log(heightUrl);

    fetch(heightUrl)
      .then(async (res: any) => {
        const blob = await res.blob();
        const image = await GEOTIFF.fromBlob(blob);
        const data = await image.readRasters();
        const { width, height } = data;

        console.log(blob, width, height);

        const [heightData]: Float32Array[] = data;
        this.heightData = heightData;

        const sorted = new Float32Array(heightData);
        sorted.sort();

        this.minHeight = sorted[0];
        this.maxHeight = sorted[sorted.length - 1];

        for (let j = 0; j < wVerts; j++) {
          for (let i = 0; i < hVerts; i++) {
            //+0 is x, +1 is y.
            let height = heightData[j * wVerts + i];
            if (height > 1000) {
              height = this.minHeight; // todo: closest realistic number
            }
            vertData[3 * (j * wVerts + i) + 2] = height;
          }
        }
        verts.needsUpdate = true;
        geometry.computeVertexNormals();
      })
      .catch((error: any) => {
        console.error(error);
        this.heightData = new Float32Array();
      });
  }
}

export default Tile;
