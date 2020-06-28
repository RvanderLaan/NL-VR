import * as THREE from 'three';
import Player from './Player';
import Tile, { IBounds } from './Tile';

class World {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  player: Player;

  testCube: THREE.Mesh;

  mainTile: Tile;

  constructor(public renderer: THREE.WebGLRenderer) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000,
    );

    this.player = new Player(this.camera, renderer.xr);
    this.scene.add(this.player);

    // TODO: Temporary init position (Hoofddorp coordinates)
    // Should ask player for their location, otherwise default location of Amsterdam or something
    this.player.position.add(new THREE.Vector3(107627, 0, 479962));

    this.initialize();
  }

  initialize() {
    // Background light
    this.scene.add(new THREE.HemisphereLight(0x606060, 0x404040));
    // Directional light
    const light = new THREE.DirectionalLight(0xffffff);
    light.position.set(1, 1, 1).normalize();
    this.scene.add(light);

    // Some dummy geometry
    const geometry = new THREE.BoxGeometry();
    const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
    this.testCube = new THREE.Mesh(geometry, material);
    this.testCube.position.add(this.player.position).add(new THREE.Vector3(0, 1, -2));
    this.scene.add(this.testCube);

    // TODO:
    // 4 high resolution (0.5m) tiles surrounded by 8 low resolution (5m) tiles
    // that follow the player
    // e.g. the high-res tiles could be 500px = 250m, with 2 verteces per meter
    // then each low res tile is would be 500m = 100px
    const tileSize = 250;
    const pos = this.player.position;
    this.mainTile = this.createTile(pos.x, pos.z, tileSize, 0.5);
    this.scene.add(this.mainTile);

    // Also load surrounding tiles
    setTimeout(() => {
      for (let i = 0; i < 3; i++) {
        for (let j = 0; j < 3; j++) {
          if (!(i == 1 && j == 1)) {
            console.log(i, j);
            this.scene.add(
              this.createTile(
                pos.x + (i - 1) * tileSize,
                pos.z + (j - 1) * tileSize,
                tileSize,
                0.5,
              ),
            );
          }
        }
      }
    }, 5000);
  }

  createTile(x: number, y: number, tileSize: number, res: 0.5 | 5) {
    const fractX = x % tileSize;
    const fractY = y % tileSize;
    const bounds: IBounds = {
      minX: x - fractX,
      minY: y - fractY,
      maxX: x - fractX + tileSize,
      maxY: y - fractY + tileSize,
    };
    return new Tile(bounds, res);
  }

  update(dt: number) {
    this.testCube.rotation.x += 0.01;
    this.testCube.rotation.y += 0.01;

    this.player.update(dt);
  }
}

export default World;
