import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { Octree } from "three/addons/math/Octree.js";
import { Capsule } from "three/addons/math/Capsule.js";

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { FXAAShader } from 'three/addons/shaders/FXAAShader.js';

const scene = new THREE.Scene();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const canvas = document.getElementById("experience-canvas");
const sizes = {width: innerWidth, height: innerHeight};

// Physics stuff
const GRAVITY = 30;
const CAPSULE_RADIUS = 0.35;
const CAPSULE_HEIGHT = 1;
const JUMP_HEIGHT = 11;
let MOVE_SPEED = 2;


let Character = null;
let mixer = null;
const animations = {};
const keysPressed = {};

const colliderOctree = new Octree();
const playerCollider = new Capsule(
  new THREE.Vector3(0, CAPSULE_RADIUS, 0),
  new THREE.Vector3(0, CAPSULE_HEIGHT, 0),
  CAPSULE_RADIUS
);

let playerVelocity = new THREE.Vector3();
let playerOnFloor = false;
let isSceneReady = false;


// Renderer Stuff
// See: https://threejs.org/docs/?q=render#api/en/constants/Renderer
const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});

renderer.setSize( sizes.width, sizes.height );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.75;

const modalContent = {
  "gong":{
    title: "About",
    content: "i am",
  },
  "shrine":{
    title: "Project",
    content: "This is project",
    link: "https://github.com/sykthi",
  },
  "fighting_post":{
    title: "skill",
    content: "i have skills",
  },
  "statue_frog":{
    title: "Contact",
    content: "contact me",
  },
};

const modal = document.querySelector(".modal");
const modalTitle = document.querySelector(".modal-title");
const modalProjectDescription = document.querySelector(".modal-project-description");
const modalExitButton = document.querySelector(".modal-exit-button");
const modalVisitProjectButton = document.querySelector(".modal-project-visit-button");

function showModal(id)
{
  const content = modalContent[id];
  if (content){
    modalTitle.textContent = content.title;
    modalProjectDescription.textContent = content.content;

    if(content.link){
      modalVisitProjectButton.href = content.link
      modalVisitProjectButton.classList.remove('hidden');
    }
    else{
      modalVisitProjectButton.classList.add('hidden');
    }
    modal.classList.toggle("hidden");
  }
}

function hideModel()
{
  modal.classList.toggle("hidden");
}

let intersectObject = "";
const intersectObjects = [];
const clickableObjects = [];
const intersectObjectsNames = ["fighting_post", "statue_frog", "shrine", "gong",];
//loading model
const loader = new GLTFLoader();
loader.load( '3D/Scene.glb', function ( glb ) {
  glb.scene.rotation.set(0, Math.PI/2, 0);
  glb.scene.traverse((child) => {
    if(intersectObjectsNames.includes(child.name)){
      intersectObjects.push(child);
    }
    if(child.isMesh)
    {
      child.castShadow = true;
      child.receiveShadow = true;

      if (child.material.name === "Clickables") {
        clickableObjects.push(child);  // <== Add to highlight list
      }

      if(child.material.name === "Water")
      {
        child.material.metalness = .7;
        child.material.roughness = 0;
        child.material.transparent = true;
        child.material.opacity = 0.7;
      }
    }
    if(child.name === "Ground_Collider")
    {
      child.visible = false; // hide collider
      colliderOctree.fromGraphNode(child);
    }
  });
  
  scene.add( glb.scene );
  outlinePass.selectedObjects = clickableObjects;
  isSceneReady = true;
  
}, undefined, function ( error ) {
  
  console.error( error );
  
} );

//loading character
const fbxLoader = new FBXLoader();
const degToRad = (deg) => deg * (Math.PI / 180);
fbxLoader.load('3D/Ronin.fbx', function (fbx) {
  fbx.scale.set(0.01, 0.01, 0.01);
  fbx.rotation.set(0, 0, 0);

  fbx.traverse(function (child) {
    if (child.isMesh) {
      child.castShadow = true;
      child.receiveShadow = true;
    }
  });

  Character = fbx;
  scene.add(fbx);

  // ✅ Set initial collider position manually above ground
  const startPosition = new THREE.Vector3(0, 5, -17.5); // same as original
  playerCollider.start.copy(startPosition).add(new THREE.Vector3(0, CAPSULE_RADIUS, 0));
  playerCollider.end.copy(startPosition).add(new THREE.Vector3(0, CAPSULE_HEIGHT, 0));

  mixer = new THREE.AnimationMixer(Character);

  fbxLoader.load('Anim/Walk.fbx', function (anim) {
    const runAction = mixer.clipAction(anim.animations[0]);
    runAction.setEffectiveWeight(1);
    runAction.setLoop(THREE.LoopRepeat);
    runAction.enabled = true;
    animations["walk"] = runAction;
  });

  fbxLoader.load('Anim/Idle.fbx', function (anim) {
    const runAction = mixer.clipAction(anim.animations[0]);
    runAction.setEffectiveWeight(1);
    runAction.setLoop(THREE.LoopRepeat);
    runAction.enabled = true;
    animations["idle"] = runAction;
  });
  fbxLoader.load('Anim/Run.fbx', function (anim) {
    const runAction = mixer.clipAction(anim.animations[0]);
    runAction.setEffectiveWeight(1);
    runAction.setLoop(THREE.LoopRepeat);
    runAction.enabled = true;
    animations["run"] = runAction;
  });
});

let currentAction = null;
function playAnimation(name) {
  const nextAction = animations[name];
  if (!nextAction || nextAction === currentAction) return;
  // Fade in new animation
  nextAction.reset().fadeIn(0.3).play();
  // Cross-fade from current to next
  if (currentAction) {
    currentAction.crossFadeTo(nextAction, 0.3, false);
  }
  currentAction = nextAction;
}

//dirLight
const sun = new THREE.DirectionalLight( 0xFFFFFF, 2);
sun.castShadow = true;
sun.position.set(40,30,40);
sun.target.position.set(0,0,0);
sun.shadow.mapSize.width = 4096;
sun.shadow.mapSize.height = 4096;
sun.shadow.camera.left = -35;
sun.shadow.camera.right = 35;
sun.shadow.camera.top = 35;
sun.shadow.camera.bottom = -35;
sun.shadow.normalBias = .15;
scene.add( sun );

//const shadowHelper = new THREE.CameraHelper( sun.shadow.camera );
// scene.add( shadowHelper );  //shadow helper
//const helper = new THREE.DirectionalLightHelper( sun, 10);
// scene.add( helper );

//Ambilight
const light = new THREE.AmbientLight( 0x404040, 5); // soft white light
scene.add( light );

const dayLightColor = light.color.clone();
const daySunColor = sun.color.clone();
const dayLightIntensity = light.intensity;
const daySunIntensity = sun.intensity;
const setduration = 2;

const aspect = sizes.width/sizes.height;
const camera = new THREE.OrthographicCamera( -aspect * 50, aspect * 50, 50, -50, .1, 1000 );

camera.position.x = 10;
camera.position.y = 10;
camera.position.z = -10;

const cameraoffset = new THREE.Vector3( 10, 10,-10);
camera.zoom = 10;
camera.updateProjectionMatrix();

// Post-processing setup
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const outlinePass = new OutlinePass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  scene,
  camera
);
composer.addPass(outlinePass);

// Optional: FXAA for better outline edges
const effectFXAA = new ShaderPass(FXAAShader);
const scaleFactor = 1.5; // increase for sharper outlines
effectFXAA.uniforms['resolution'].value.set(
  1 / (sizes.width * scaleFactor),
  1 / (sizes.height * scaleFactor)
);
composer.addPass(effectFXAA);

// Outline effect style
outlinePass.edgeStrength = 3.0;
outlinePass.edgeGlow = 1;
outlinePass.edgeThickness = 5;
outlinePass.pulsePeriod = 5.0; // set to >0 for pulsing glow
outlinePass.visibleEdgeColor.set('#ffff00');
outlinePass.hiddenEdgeColor.set('#000000');


const sunIcon = document.getElementById("sun-icon");
const moonIcon = document.getElementById("moon-icon");

// ✅ Set initial theme to light and icons
document.body.classList.add("light-theme");
sunIcon.style.display = "none";
moonIcon.style.display = "block";

document.getElementById("theme-toggle").addEventListener("click", toggleTheme);
function toggleTheme() {
  // First, toggle classes
  document.body.classList.toggle("dark-theme");
  document.body.classList.toggle("light-theme");

  // Now read the current (new) state
  const isDarkTheme = document.body.classList.contains("dark-theme");

  // Update icon display based on new state
  sunIcon.style.display = isDarkTheme ? "block" : "none";
  moonIcon.style.display = isDarkTheme ? "none" : "block";

  // Now apply lighting changes
  gsap.to(light.color, {
    r: isDarkTheme ? 0.25 : dayLightColor.r,
    g: isDarkTheme ? 0.31 : dayLightColor.g,
    b: isDarkTheme ? 0.78 : dayLightColor.b,
    duration: setduration,
    ease: "power2.inOut",
  });

  gsap.to(light, {
    intensity: isDarkTheme ? 2 : dayLightIntensity,
    duration: setduration,
    ease: "power2.inOut",
  });

  gsap.to(sun.color, {
    r: isDarkTheme ? 0.25 : daySunColor.r,
    g: isDarkTheme ? 0.41 : daySunColor.g,
    b: isDarkTheme ? 0.88 : daySunColor.b,
    duration: setduration,
    ease: "power2.inOut",
  });

  gsap.to(sun, {
    intensity: isDarkTheme ? 0.5 : daySunIntensity,
    duration: setduration,
    ease: "power2.inOut",
  });
}


function onResize()
{
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  const aspect = sizes.width / sizes.height;
  camera.left = -aspect * 50;
  camera.right = aspect * 50;
  camera.top = 50;
  camera.bottom = -50;
  
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  composer.setSize(sizes.width, sizes.height);
effectFXAA.uniforms['resolution'].value.set(1 / sizes.width, 1 / sizes.height);

}

function onclick()
{
  // console.log(intersectObject);
  if(intersectObject !=="") {
    showModal(intersectObject);
  }
}

function onPointerMove( event )
{
	pointer.x = ( event.clientX / window.innerWidth ) * 2 - 1;
	pointer.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
}

function updateCharacterMovement(delta) {
  if (!Character) return;

  const direction = new THREE.Vector3();
  const speed = MOVE_SPEED;

  // WASD / arrow key input
  if (keysPressed["w"] || keysPressed["arrowup"]) {
    direction.z += 1;
  }
  if (keysPressed["s"] || keysPressed["arrowdown"]) {
    direction.z -= 1;
  }
  if (keysPressed["a"] || keysPressed["arrowleft"]) {
    direction.x += 1;
  }
  if (keysPressed["d"] || keysPressed["arrowright"]) {
    direction.x -= 1;
  }

  let isMoving = direction.lengthSq() > 0;

  if (isMoving) {
    direction.normalize();

    // Apply to horizontal velocity (retain y velocity from gravity)
    playerVelocity.x = direction.x * speed;
    playerVelocity.z = direction.z * speed;

    // Rotate mesh visually to face direction
    if (Character) {
      const angle = Math.atan2(direction.x, direction.z);
      // Create a target quaternion from the angle around the Y-axis
      const targetQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), angle);
      // Smoothly rotate the character using slerp
      Character.quaternion.slerp(targetQuat, 0.1); // 0.1 = smoothing factor (adjust as needed)
    }

    if (MOVE_SPEED > 2) {
      playAnimation("run");
    } else {
      playAnimation("walk");
    }
  } else {
    // Stop horizontal movement
    playerVelocity.x = 0;
    playerVelocity.z = 0;

    playAnimation("idle");
  }
}

window.addEventListener("keydown", (event) => {
  keysPressed[event.key.toLowerCase()] = true;
  // Shift = run
  if (event.shiftKey) {
    MOVE_SPEED = 5;
  }
});

window.addEventListener("keyup", (event) => {
  keysPressed[event.key.toLowerCase()] = false;
  // Release Shift = walk
  if (event.key === "Shift") {
    MOVE_SPEED = 2;
  }
});

modalExitButton.addEventListener("click", hideModel);
window.addEventListener("resize", onResize);
window.addEventListener("click", onclick);
window.addEventListener("pointermove", onPointerMove);

window.addEventListener("keydown", (event) => {
  keysPressed[event.key.toLowerCase()] = true;
});
window.addEventListener("keyup", (event) => {
  keysPressed[event.key.toLowerCase()] = false;
});

// Reset player position if they fall below a certain threshold
const FALL_THRESHOLD = -20;
const START_POSITION = new THREE.Vector3(0, 5, -17.5); // same as original
function resetPlayerPosition() {
  // Reset collider position
  playerCollider.start.copy(START_POSITION).add(new THREE.Vector3(0, CAPSULE_RADIUS, 0));
  playerCollider.end.copy(START_POSITION).add(new THREE.Vector3(0, CAPSULE_HEIGHT, 0));

  // Reset velocity
  playerVelocity.set(0, 0, 0);

  // Update character position visually
  if (Character) {
    Character.position.copy(playerCollider.start.clone().add(new THREE.Vector3(0, -CAPSULE_RADIUS, 0)));
  }
}

function applyPlayerPhysics(delta) {
  // Apply gravity
  if (!playerOnFloor) {
    playerVelocity.y -= GRAVITY * delta;
  }

  // Limit falling speed
  if (playerVelocity.y < -50) {
    playerVelocity.y = -50;
  }

  // Move collider based on velocity
  const deltaPosition = playerVelocity.clone().multiplyScalar(delta);
  playerCollider.translate(deltaPosition);

  // Check collisions using the Octree
  const result = colliderOctree.capsuleIntersect(playerCollider);

  playerOnFloor = false;

  if (result) {
    // If there's a collision, resolve it
    playerOnFloor = result.normal.y > 0;

    // Push the collider out of geometry
    playerCollider.translate(result.normal.multiplyScalar(result.depth));

    // If on ground, nullify downward velocity
    if (playerOnFloor) {
      playerVelocity.y = 0;
    } else {
      // Slide along walls (optional)
      playerVelocity.addScaledVector(result.normal, -result.normal.dot(playerVelocity));
    }
  }

  // Check for out-of-bounds fall
if (playerCollider.start.y < FALL_THRESHOLD) {
  resetPlayerPosition();
  return; // Skip rest of physics for this frame
}

  // Sync character mesh to collider
  const newPosition = playerCollider.start.clone().add(new THREE.Vector3(0, -CAPSULE_RADIUS, 0));
  if (Character) Character.position.copy(newPosition);
}

// Animate() loop
const clock = new THREE.Clock();
function animate()
{
  const delta = clock.getDelta();

  if (isSceneReady) {
    if (mixer) mixer.update(delta);
    applyPlayerPhysics(delta);  
    updateCharacterMovement(delta); 
  }

  if (Character)
    {
      const targetCameraPosition = new THREE.Vector3(
        Character.position.x + cameraoffset.x, 
        cameraoffset.y, 
        Character.position.z + cameraoffset.z
      );
      camera.position.copy(targetCameraPosition);
      camera.lookAt(
        Character.position.x,
        camera.position.y - 10, 
        Character.position.z,
      );
    }

  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(intersectObjects);

  if (intersects.length > 0) 
  {
    document.body.style.cursor = "pointer";
    intersectObject = intersects[0].object.name;
  }
  else
  {
    document.body.style.cursor = "default";
    intersectObject = "";
  }
  // renderer.render( scene, camera );
  composer.render();

}
// 📱 Mobile Controls (simulate keysPressed)

const joystick = document.getElementById('joystick');
const container = document.getElementById('joystick-container');
const runButton = document.getElementById('run-button');

let activeTouchId = null;
let origin = { x: 0, y: 0 };

container.addEventListener('touchstart', (e) => {
  const touch = e.targetTouches[0];
  activeTouchId = touch.identifier;
  origin.x = touch.clientX;
  origin.y = touch.clientY;
});

container.addEventListener('touchmove', (e) => {
  for (let touch of e.changedTouches) {
    if (touch.identifier === activeTouchId) {
      const dx = touch.clientX - origin.x;
      const dy = touch.clientY - origin.y;

      const distance = Math.min(40, Math.hypot(dx, dy));
      const angle = Math.atan2(dy, dx);

      const x = distance * Math.cos(angle);
      const y = distance * Math.sin(angle);

      joystick.style.transform = `translate(${x}px, ${y}px)`;

      // Map movement to keysPressed
      keysPressed["w"] = dy < -15;
      keysPressed["s"] = dy > 15;
      keysPressed["a"] = dx < -15;
      keysPressed["d"] = dx > 15;

      break;
    }
  }
});

container.addEventListener('touchend', (e) => {
  for (let touch of e.changedTouches) {
    if (touch.identifier === activeTouchId) {
      activeTouchId = null;
      joystick.style.transform = `translate(0px, 0px)`;

      keysPressed["w"] = false;
      keysPressed["s"] = false;
      keysPressed["a"] = false;
      keysPressed["d"] = false;

      break;
    }
  }
});

// Run Button = shift key
runButton.addEventListener("touchstart", () => {
  keysPressed["shift"] = true;
  MOVE_SPEED = 5;
});

runButton.addEventListener("touchend", () => {
  keysPressed["shift"] = false;
  MOVE_SPEED = 2;
});

renderer.setAnimationLoop( animate );