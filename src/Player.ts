import * as THREE from 'three';
import { WebXRManager } from 'three/src/renderers/webxr/WebXRManager';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

type ButtonName =
  | 'forwards'
  | 'backwards'
  | 'leftwards'
  | 'rightwards'
  | 'trigger'
  | 'grip'
  | 'primary'
  | 'secondary';

const defaultButtonState: Record<ButtonName, boolean> = {
  forwards: false,
  backwards: false,
  leftwards: false,
  rightwards: false,
  trigger: false,
  grip: false,
  primary: false,
  secondary: false,
};

class Pointer extends THREE.Object3D {
  super() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
    });

    this.add(new THREE.Line(geometry, material));
  }
}

type Controller = THREE.Group & {
  initialized: boolean;
  raycaster: THREE.Raycaster;
  worldspace: {
    position: THREE.Vector3;
    quaternion: THREE.Quaternion;
  };
  grip: THREE.Group;
  pointer: Pointer;
  gamepad: Gamepad;
  pressState: Record<ButtonName, boolean>;
  downState: Record<ButtonName, boolean>;
  upState: Record<ButtonName, boolean>;
};

/**
 * Couldn't find any good tutorial or guide for setting up controls
 * This this class is based on:
 * https://github.com/danielesteban/blocks/blob/master/client/core/player.js
 * It's working great!
 */
class Player extends THREE.Object3D {
  controllers: [Controller, Controller];

  constructor(public camera: THREE.Camera, public xr: WebXRManager) {
    super();
    // Make the camera a child of the Player, so the camera moves with the player
    this.add(camera);

    camera.position.y = 1.8; // player eye height

    const controllerModelFactory = new XRControllerModelFactory();

    this.controllers = [undefined, undefined];
    [...Array(2)].forEach((_, i) => {
      const controller = xr.getController(i) as Controller;
      this.controllers[i] = controller;

      // Add controller to the scene relative to the Player object
      this.add(controller);

      controller.pressState = { ...defaultButtonState };
      controller.upState = { ...defaultButtonState };
      controller.downState = { ...defaultButtonState };

      // controller.add(controller.pointer);
      controller.raycaster = new THREE.Raycaster();
      controller.raycaster.far = 32;
      controller.worldspace = {
        position: new THREE.Vector3(),
        quaternion: new THREE.Quaternion(),
      };
      controller.addEventListener('connected', ({ data: { gamepad } }) => {
        console.log('Controller connected:', i);

        // Apparently you can get the gamepad through the event data!
        controller.gamepad = gamepad;

        if (controller.initialized) {
          return;
        } else {
          controller.initialized = true;
        }

        // The XRControllerModelFactory will automatically fetch controller models
        // that match what the user is holding as closely as possible. The models
        // should be attached to the object returned from getControllerGrip in
        // order to match the orientation of the held device.
        controller.grip = xr.getControllerGrip(i);
        controller.grip.add(controllerModelFactory.createControllerModel(controller.grip));
        this.add(controller.grip); // TODO: Add to controller or add to scene? not sure how its position is managed

        controller.pointer = new Pointer();
        controller.grip.add(controller.pointer);
        // const attachments = this.attachments[handedness];
        // if (attachments) {
        //   attachments.forEach((attachment) => {
        //     controller.add(attachment);
        //   });
        // }
      });
      controller.addEventListener('disconnected', () => {
        console.log('Controller disconnected:', i);
        if (!controller.initialized) {
          return;
        }

        controller.remove(controller.grip);
        controller.remove(controller.pointer);
        delete controller.grip;
        delete controller.gamepad;

        // const attachments = this.attachments[controller.hand.handedness];
        // if (attachments) {
        //   attachments.forEach((attachment) => {
        //     controller.remove(attachment);
        //   });
        // }
      });
      return controller;
    });
  }

  update(dt: number) {
    // Update button states
    for (const controller of this.controllers) {
      if (!controller.initialized || !controller.gamepad) {
        return;
      }

      const { gamepad, pressState, upState, downState } = controller;

      [
        ['forwards', gamepad.axes[3] <= -0.5],
        ['backwards', gamepad.axes[3] >= 0.5],
        ['leftwards', gamepad.axes[2] <= -0.5],
        ['rightwards', gamepad.axes[2] >= 0.5],
        ['trigger', gamepad.buttons[0] && gamepad.buttons[0].pressed],
        ['grip', gamepad.buttons[1] && gamepad.buttons[1].pressed],
        ['primary', gamepad.buttons[4] && gamepad.buttons[4].pressed],
        ['secondary', gamepad.buttons[5] && gamepad.buttons[5].pressed],
      ].forEach(([key, value]) => {
        const btn = key as ButtonName;
        pressState[btn] = Boolean(value);
        upState[btn] = !value && pressState[btn] !== value;
        downState[btn] = value && pressState[btn] !== value;
      });
      // Todo: Matrix and raycast stuff
    }

    // Simple moving using controller axes
    // should use the camera direction
    // and maybe use states instead axes values
    if (this.controllers?.[0]) {
      const {
        grip,
        gamepad: { axes },
        pressState,
      } = this.controllers[0];
      const moveSpeed = pressState.grip ? 50 : 10;
      const controllerDir = new THREE.Vector3(
        axes[2] * dt * moveSpeed,
        0,
        axes[3] * dt * moveSpeed,
      );

      // TODO: The controller forward vector is pointing up by default... Not sure what quaternion magic
      // is needed to makte it point forward more...
      // const rotate45Forward = new THREE.Quaternion().setFromAxisAngle(
      //   new THREE.Vector3(1, 0, 0),
      //   -Math.PI / 4,
      // );

      this.position.add(
        controllerDir.applyQuaternion(grip.quaternion).applyQuaternion(this.quaternion),
      );
    }
    if (this.controllers?.[1]) {
      const {
        gamepad: { axes },
      } = this.controllers[1];
      this.rotateY(-axes[2] * dt);
    }
  }
}

export default Player;
