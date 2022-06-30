import * as THREE from "three";
import * as CANNON from "cannon";

import { Animation, DualObject } from "./setup";
import { getDiffuseMaterial, getStandardMaterial } from "./texture-loader";

(async function () {
  const options = {
    showWireframe: false,
    floorWidth: 1.27,
    floorLength: 2.54,
    ballMass: 0.16,
    ballRadius: 0.028575,
    cueForce: 75,
    railWidth: 0.1778,
    railHeight: 0.01,
    ballDropNumber: 10,
  };

  const animation = new Animation(
    document.getElementsByTagName("canvas")[0],
    animationLoop
  );

  const worldMaterials = getWorldMaterials();
  worldMaterials.contactMaterials.forEach((material) => {
    animation.world.addContactMaterial(material);
  });

  const visualMaterials = getVisualMaterials();

  const lights = getLights();
  animation.scene.add(...Object.values(lights));

  const floor = getFloor();
  animation.scene.add(floor.object);
  animation.world.addBody(floor.body);

  const walls = getWalls();
  animation.scene.add(...walls.map((wall) => wall.object));
  walls.forEach((wall) => {
    animation.world.addBody(wall.body);
  });

  const balls = getBalls();
  animation.scene.add(...balls.map((ball) => ball.object));
  balls.forEach((ball) => {
    animation.world.addBody(ball.body);
  });

  setupDebugControls();
  setupKeyboardControls();
  animation.initialize();

  function animationLoop(clock: THREE.Clock) {
    animation.world.step(1 / 60, clock.getDelta(), 10);

    floor.object.position.copy(floor.body.position as any);

    walls.forEach((wall) => {
      wall.object.position.copy(wall.body.position as any);
      wall.object.quaternion.copy(wall.body.quaternion as any);
    });

    balls.forEach((ball) => {
      ball.object.position.copy(ball.body.position as any);
      ball.object.quaternion.copy(ball.body.quaternion as any);
    });
  }

  function setupDebugControls() {
    animation.debugControls.add({ dropBalls }, "dropBalls");

    animation.debugControls.add(options, "cueForce").min(0).max(100).step(1);

    animation.debugControls
      .add(options, "ballDropNumber")
      .min(1)
      .max(100)
      .step(1);

    animation.debugControls.add(options, "showWireframe").onChange((value) => {
      balls.forEach((ball) => {
        (ball.object as any).material.wireframe = value;
      });
    });
  }

  function setupKeyboardControls() {
    window.addEventListener("keypress", (ev: KeyboardEvent) => {
      console.log(ev.key);
      if (ev.key === " ") {
        console.log("force", options.cueForce);
        balls[0].body.wakeUp();
        balls[0].body.applyForce(
          new CANNON.Vec3(0, 0, -options.cueForce),
          new CANNON.Vec3(0, 0, options.floorLength / 2)
        );
      }
    });
  }

  function getWorldMaterials() {
    const ballMaterial = new CANNON.Material("ball");
    const tableSurfaceMaterial = new CANNON.Material("table-surface");
    const tableWallMaterial = new CANNON.Material("table-wall");

    const ballTableSurfaceContactMaterial = new CANNON.ContactMaterial(
      ballMaterial,
      tableSurfaceMaterial,
      { friction: 0.0001, restitution: 0.4 }
    );

    const ballTableWallContactMaterial = new CANNON.ContactMaterial(
      ballMaterial,
      tableWallMaterial,
      { friction: 0.0001, restitution: 0.5 }
    );

    const ballBallContactMaterial = new CANNON.ContactMaterial(
      ballMaterial,
      ballMaterial,
      { friction: 0.06, restitution: 0.5 }
    );

    return {
      contactMaterials: [
        ballTableSurfaceContactMaterial,
        ballTableWallContactMaterial,
        ballBallContactMaterial,
      ],
      ballMaterial,
      tableSurfaceMaterial,
      tableWallMaterial,
    };
  }

  function getVisualMaterials() {
    const fabric = getStandardMaterial("felt", "png");
    fabric.side = THREE.DoubleSide;

    const balls: THREE.Material[] = [new THREE.MeshBasicMaterial()];
    for (let i = 1; i < 16; i++) {
      balls.push(getDiffuseMaterial(`balls/${i}.jpg`));
    }

    return { balls, fabric };
  }

  function getLights() {
    return {
      ambientLight: new THREE.AmbientLight(),
    };
  }

  function getFloor(): DualObject {
    const object = new THREE.Mesh(
      new THREE.PlaneGeometry(options.floorWidth, options.floorLength),
      visualMaterials.fabric
    );

    object.rotation.set(Math.PI * -0.5, 0, 0);
    object.position.y = 0;

    const body = new CANNON.Body({
      mass: 0,
      position: new CANNON.Vec3(
        object.position.x,
        object.position.y,
        object.position.z
      ),
      shape: new CANNON.Plane(),
      material: worldMaterials.tableSurfaceMaterial,
    });

    body.quaternion.setFromAxisAngle(new CANNON.Vec3(-1, 0, 0), Math.PI / 2);

    return { object, body };
  }

  function getWalls(): DualObject[] {
    const railYPosition =
      options.ballRadius * 2 * 0.635 + options.railHeight / 2;
    console.log(railYPosition - options.railHeight / 2);
    const longSideGeometry = new THREE.BoxGeometry(
      options.railWidth,
      options.railHeight,
      options.floorLength
    );
    const shortSideGeometry = new THREE.BoxGeometry(
      options.floorWidth,
      options.railHeight,
      options.railWidth
    );

    const walls = [
      {
        position: {
          x: -(options.floorWidth / 2) - options.railWidth / 2,
          y: railYPosition,
          z: 0,
        },
        geometry: longSideGeometry,
      },
      {
        position: {
          x: options.floorWidth / 2 + options.railWidth / 2,
          y: railYPosition,
          z: 0,
        },
        geometry: longSideGeometry,
      },
      {
        position: {
          x: 0,
          y: railYPosition,
          z: -(options.floorLength / 2) - options.railWidth / 2,
        },
        geometry: shortSideGeometry,
      },
      {
        position: {
          x: 0,
          y: railYPosition,
          z: options.floorLength / 2 + options.railWidth / 2,
        },
        geometry: shortSideGeometry,
      },
    ].map((wallOptions) => {
      const object = new THREE.Mesh(
        wallOptions.geometry,
        visualMaterials.fabric
      );

      object.position.set(
        wallOptions.position.x,
        wallOptions.position.y,
        wallOptions.position.z
      );

      const sizeHack = 10;
      const size = wallOptions.geometry.parameters;
      const body = new CANNON.Body({
        mass: 0,
        shape: new CANNON.Box(
          new CANNON.Vec3(
            size.width / 2,
            (size.height + sizeHack) / 2,
            size.depth / 2
          )
        ),
        position: new CANNON.Vec3(
          wallOptions.position.x,
          wallOptions.position.y,
          wallOptions.position.z
        ),
        material: worldMaterials.tableWallMaterial,
      });

      return { object, body };
    });

    return walls;
  }

  function getBalls(): DualObject[] {
    const breakSpot = { x: 0, z: options.floorLength / 4 };
    const rackSpot = { x: 0, z: -options.floorLength / 4 };
    const ballRadius = options.ballRadius;
    const ballDiameter = options.ballRadius * 2;
    const back = ballDiameter * Math.sqrt(0.75);

    const balls = [
      { ball: 0, x: breakSpot.x, y: options.ballRadius, z: breakSpot.z },

      {
        ball: 1,
        x: rackSpot.x - 0 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - 0 * back,
      },

      {
        ball: 2,
        x: rackSpot.x - 1 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - 1 * back,
      },
      {
        ball: 3,
        x: rackSpot.x + 1 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - 1 * back,
      },

      {
        ball: 4,
        x: rackSpot.x - 2 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - back * 2,
      },
      {
        ball: 5,
        x: rackSpot.x + 0 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - back * 2,
      },
      {
        ball: 6,
        x: rackSpot.x + 2 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - back * 2,
      },

      {
        ball: 7,
        x: rackSpot.x - 3 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - back * 3,
      },
      {
        ball: 8,
        x: rackSpot.x - 1 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - back * 3,
      },
      {
        ball: 9,
        x: rackSpot.x + 1 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - back * 3,
      },
      {
        ball: 10,
        x: rackSpot.x + 3 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - back * 3,
      },

      {
        ball: 11,
        x: rackSpot.x - 4 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - back * 4,
      },
      {
        ball: 12,
        x: rackSpot.x - 2 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - back * 4,
      },
      {
        ball: 13,
        x: rackSpot.x + 0 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - back * 4,
      },
      {
        ball: 14,
        x: rackSpot.x + 2 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - back * 4,
      },
      {
        ball: 15,
        x: rackSpot.x + 4 * ballRadius,
        y: options.ballRadius,
        z: rackSpot.z - back * 4,
      },
    ].map((details) => getBall(details));

    balls.forEach((ball) => {
      ball.body.quaternion.setFromAxisAngle(
        new CANNON.Vec3(0, -1, 0),
        Math.PI / 2
      );
    });

    return balls;
  }

  function dropBalls() {
    const axisAngles = [
      new CANNON.Vec3(1, 0, 0),
      new CANNON.Vec3(0, 1, 0),
      new CANNON.Vec3(1, 0, 0),
    ];

    for (let i = 0; i < options.ballDropNumber; i++) {
      const ball = getBall({
        ball: Math.floor(Math.random() * 16) % 16,
        x: normalRandom(options.floorWidth / 2),
        y: 3,
        z: normalRandom(options.floorLength / 2),
      });

      ball.body.quaternion.setFromAxisAngle(
        axisAngles[Math.floor(Math.random() * axisAngles.length)],
        Math.PI * normalRandom()
      );

      ball.body.angularVelocity = new CANNON.Vec3(
        normalRandom(10),
        normalRandom(10),
        normalRandom(10)
      );

      balls.push(ball);
      animation.scene.add(ball.object);
      animation.world.addBody(ball.body);
    }
  }

  function getBall(details: { ball: number; x: number; y: number; z: number }) {
    const material =
      details.ball === 0
        ? new THREE.MeshBasicMaterial()
        : getDiffuseMaterial(`balls/${details.ball}.jpg`);

    material.wireframe = options.showWireframe;

    const object = new THREE.Mesh(
      new THREE.SphereGeometry(options.ballRadius),
      material
    );

    const body = new CANNON.Body({
      mass: options.ballMass,
      shape: new CANNON.Sphere(options.ballRadius),
      position: new CANNON.Vec3(details.x, details.y, details.z),
      material: worldMaterials.ballMaterial,
      allowSleep: true,
      sleepSpeedLimit: 1,
      sleepTimeLimit: 1,
      linearDamping: 0.5,
      angularDamping: 0.5,
    });

    return { object, body };
  }

  function normalRandom(multiplier = 1) {
    return (Math.random() * 2 - 1) * multiplier;
  }
})();
