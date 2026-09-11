import * as THREE from "three";

import { ARButton } from "three/addons/webxr/ARButton.js";
import { XRButton } from 'three/addons/webxr/XRButton.js';

/// HTML UI tagovi
const overlayDisplay = document.querySelector("#ar-overlay");
const totalLength = document.querySelector("#total-length");
const resetBtn = document.querySelector("#reset-btn");
const arContainer = document.querySelector("#ar-container");
const body = document.querySelector("body");
const closeArea = document.querySelector("#close-poly-btn");
const totalArea = document.querySelector("#total-area");


// Varijable
let clicked = 0;
let points = [];
let isNewMesurment = false;

// Osnovna Three 3D scene Kamera i Scena
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(
  70,
  window.innerWidth / window.innerHeight,
  0.01,
  20,
);

// Funkcija za novo merenje i brisanje svega postojećega sem inicijalnog markera
function RestartMeasurment(scene) {
  points = [];
  const geomsToRemove = scene.children.filter(
    (child) => child.name !== "reticle",
  );

  geomsToRemove.forEach((geom) => {
    scene.remove(geom);
  });

  if (child.geometry) child.geometry.dispose();
  if (child.material) {
    if (Array.isArray(child.material)) {
      child.material.forEach((m) => m.dispose());
    } else {
      child.material.dispose();
    }
  }

  scene.remove(child);
}

// Dodavanje eventa na dugmad
resetBtn.addEventListener("click", () => {
  RestartMeasurment(scene);
});
// Uklanjamo propagiranje eventa na Three scenu
resetBtn.addEventListener("beforexrselect", (e) => {
  e.preventDefault();
});


closeArea.addEventListener("click", () => {
  // Ako imamo minimum br tacaka za poligon mozemo povrsinu da izracunamo
  if (points.length >= 3) {
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#DEFFF2"),
    });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints([
      firstPoint,
      lastPoint,
    ]);
    const line = new THREE.Line(lineGeometry, lineMaterial);
    const midlePoint = new THREE.Vector3()
      .addVectors(firstPoint, lastPoint)
      .multiplyScalar(0.5);
    const d = firstPoint.distanceTo(lastPoint);
    const d2Vectors = points.map(
      (point) => new THREE.Vector2(point.x, point.z),
    );
    // Ispis povrsine u HTML tag
    totalArea.textContent = `Povrsina: ${Math.abs(THREE.ShapeUtils.area(d2Vectors)).toFixed(2)} m2`;
    
    const textSprite = createTextSprite(`${d.toFixed(2)} m`);
    textSprite.position.copy(midlePoint);
    scene.add(textSprite);
    scene.add(line);
  }
});
// Uklanjamo propagiranje eventa na Three scenu
closeArea.addEventListener("beforexrselect", (e) => {
  e.preventDefault();
});
// Funkcija za racunanje duzine i kreiranje sredine linije za ispis duzine segmenta
function _getLengths() {
  if (points.length > 0) {
    return points.reduce(
      (acc, cur, index, arr) => {
        if (index < arr.length - 1) {
          let length = arr[index].distanceTo(arr[index + 1]);
          let middle = new THREE.Vector3()
            .addVectors(arr[index], arr[index + 1])
            .multiplyScalar(0.5);
          acc.total += length;
          acc.segments.push({
            length: length,
            midlePoint: middle,
          });
        }
        return acc;
      },
      {
        total: 0,
        segments: [],
      },
    );
  }
  return {
    total: 0,
    segments: [],
  };
}

function createTextSprite(text) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  canvas.width = 256;
  canvas.height = 128;

  context.font = "48px Arial";
  context.fillStyle = "aqua";
  context.textAlign = "center";
  context.textBaseline = "middle";

  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);

  const material = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
  });

  const sprite = new THREE.Sprite(material);

  sprite.scale.set(0.2, 0.1, 1);

  return sprite;
}

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
body.appendChild(renderer.domElement);
body.appendChild(
  ARButton.createButton(renderer, {
    requiredFeatures: ["hit-test"],
    optionalFeatures: ["dom-overlay","plane-detection"],
    domOverlay: { root: document.querySelector("#ar-overlay") },
  }),
);

let hitTestSource = null;
let hitTestSourceRequested = false;
let referenceSpace = null;

const reticleGeometry = new THREE.CircleGeometry(0.01, 32);
const reticleMaterial = new THREE.MeshBasicMaterial({
  color: new THREE.Color("#DEFFF2"),
});
// Krug indikator 
const reticle = new THREE.Mesh(reticleGeometry, reticleMaterial);
reticle.name = "reticle";
reticle.matrixAutoUpdate = false;
reticle.visible = false;
scene.add(reticle);

renderer.xr.addEventListener("sessionstart", async () => {
  const session = renderer.xr.getSession();
  referenceSpace = renderer.xr.getReferenceSpace();

  const viewerSpace = await session.requestReferenceSpace("viewer");
  hitTestSource = await session.requestHitTestSource({ space: viewerSpace });
  hitTestSourceRequested = true;
  session.addEventListener("end", () => {
    hitTestSourceRequested = false;
    hitTestSource = null;
  });
});

// Funkcija selekt - Kada korisnik klikne na prostor definisu se segmenti i tacke
function onSelect() {
  if (reticle.visible) {
  
    const point = new THREE.Vector3();
    point.name = clicked;
    point.setFromMatrixPosition(reticle.matrix);
    points.push(point);

    if (points.length > 1) {
      const segments = _getLengths().segments;
      const lastSegment = segments[segments.length - 1];
      const textSprite = createTextSprite(`${lastSegment.length.toFixed(2)} m`);
      textSprite.position.copy(lastSegment.midlePoint);
      scene.add(textSprite);
    }

    const lineMaterial = new THREE.LineBasicMaterial({
      color: new THREE.Color("#DEFFF2"),
    });
    const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.Line(lineGeometry, lineMaterial);

    scene.add(line);

    const geometry = new THREE.CircleGeometry(0.01, 32);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#0FF4C6"),
    });
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.setFromMatrixPosition(reticle.matrix);
    mesh.quaternion.setFromRotationMatrix(reticle.matrix);
    scene.add(mesh);

    totalLength.innerHTML = `Duzina: ${_getLengths().total.toFixed(2)} m`;
  }
}

const controller = renderer.xr.getController(0);
controller.addEventListener("select", onSelect);
scene.add(controller);

renderer.setAnimationLoop((timestamp, frame) => {
  if (frame && hitTestSource) {
    const hitTestResults = frame.getHitTestResults(hitTestSource);
    if (hitTestResults.length > 0) {
      const hit = hitTestResults[0];
        const pose = hit.getPose(referenceSpace);
        totalLength.innerHTML=pose
      reticle.visible = true;
      reticle.matrix.fromArray(pose.transform.matrix);
    } else {
      reticle.visible = false;
    }
  }
  renderer.render(scene, camera);
});
