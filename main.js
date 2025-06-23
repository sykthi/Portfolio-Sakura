import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { Octree } from "three/addons/math/Octree.js";
import { Capsule } from "three/addons/math/Capsule.js";

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
const MOVE_SPEED = 7;

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
  
}, undefined, function ( error ) {
  
  console.error( error );
  
} );

//loading character

const fbxLoader = new FBXLoader();
const degToRad = (deg) => deg * (Math.PI / 180);
fbxLoader.load('3D/roni.fbx', function (fbx) {
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
  const startPosition = new THREE.Vector3(0, 5, -17);
  playerCollider.start.copy(startPosition).add(new THREE.Vector3(0, CAPSULE_RADIUS, 0));
  playerCollider.end.copy(startPosition).add(new THREE.Vector3(0, CAPSULE_HEIGHT, 0));

  mixer = new THREE.AnimationMixer(Character);

  fbxLoader.load('Anim/Walk.fbx', function (anim) {
    const runAction = mixer.clipAction(anim.animations[0]);
    animations["walk"] = runAction;
  });

  fbxLoader.load('Anim/Idle.fbx', function (anim) {
    const runAction = mixer.clipAction(anim.animations[0]);
    animations["idle"] = runAction;
  });
});


function playAnimation(name) {
  if (!animations[name]) return;
  if (animations[name].isRunning()) return;

  for (let key in animations) {
    animations[key].stop();
  }

  animations[name].reset().play();
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
sun.shadow.normalBias = .2;
scene.add( sun );

const shadowHelper = new THREE.CameraHelper( sun.shadow.camera );
// scene.add( shadowHelper );  //shadow helper
const helper = new THREE.DirectionalLightHelper( sun, 10);
// scene.add( helper );

//Ambilight
const light = new THREE.AmbientLight( 0x404040, 5); // soft white light
scene.add( light );

const aspect = sizes.width/sizes.height;
const camera = new THREE.OrthographicCamera( -aspect * 50, aspect * 50, 50, -50, .1, 1000 );

camera.position.x = 10;
camera.position.y = 10;
camera.position.z = -10;

const controls = new OrbitControls( camera, canvas );
controls.update();

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
      Character.rotation.y = angle;
    }

    playAnimation("walk");
  } else {
    // Stop horizontal movement
    playerVelocity.x = 0;
    playerVelocity.z = 0;

    playAnimation("idle");
  }
}

function onKeyDown(event) {
  if ((event.key === " " || event.code === "Space") && playerOnFloor) {
  playerVelocity.y = JUMP_HEIGHT;
}

}


modalExitButton.addEventListener("click", hideModel);
window.addEventListener("resize", onResize);
// window.addEventListener("keydown", onKeyDown);
window.addEventListener("click", onclick);
window.addEventListener("pointermove", onPointerMove);

window.addEventListener("keydown", (event) => {
  keysPressed[event.key.toLowerCase()] = true;
});

window.addEventListener("keyup", (event) => {
  keysPressed[event.key.toLowerCase()] = false;
});

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

  // Sync character mesh to collider
  const newPosition = playerCollider.start.clone().add(new THREE.Vector3(0, -CAPSULE_RADIUS, 0));
  if (Character) Character.position.copy(newPosition);
}

// Animate() loop
const clock = new THREE.Clock();
function animate()
{
  const delta = clock.getDelta();
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(intersectObjects);


  if (mixer) mixer.update(delta);
  applyPlayerPhysics(delta);  
  updateCharacterMovement(delta); // 👈 update movement & play animation

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
  renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate );