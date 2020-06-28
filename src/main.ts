import * as THREE from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import World from './World';

//////////////////////////////
// Regular THREE stuff
//////////////////////////////

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Sets up the camera and the player's controllers, and other entities of the world
const world = new World(renderer);

// Desktop controls
const controls = new OrbitControls(world.camera, renderer.domElement);

function onWindowResize() {
  world.camera.aspect = window.innerWidth / window.innerHeight;
  world.camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', onWindowResize, false);

//////////////////////////////
// VR stuff
//////////////////////////////
document.body.appendChild(VRButton.createButton(renderer));
renderer.xr.enabled = true;

const clock = new THREE.Clock();

clock.start();

renderer.setAnimationLoop(function () {
  const dt = clock.getDelta();

  world.update(dt);
  controls.update();

  renderer.render(world.scene, world.camera);
});
