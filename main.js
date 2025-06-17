import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
// import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
const canvas = document.getElementById("experience-canvas");
const sizes = {width: innerWidth, height: innerHeight};

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

loader.load( './Scene1.glb', function ( glb ) {
  glb.scene.traverse((child) => {
    if(intersectObjectsNames.includes(child.name)){
      intersectObjects.push(child);
    }
    if(child.isMesh){
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
  });

  scene.add( glb.scene );

}, undefined, function ( error ) {

  console.error( error );

} );

//dirLight
const sun = new THREE.DirectionalLight( 0xFFFFFF, 2);
sun.castShadow = true;
sun.position.set(-40,30,40);
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
camera.position.z = 10;

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

// function onkeyDown(event)
// {
//   console.log(event);
//   switch(event.key.toLowerCase()){
//     case "w":
//     case "arrowup":
//       character.instance.position.x -= character.moveDistance;
//       break;
//     case "s":
//     case "arrowdown":
//       character.instance.position.x += character.moveDistance;
//       break;
//     case "a":
//     case "arrowleft":
//       character.instance.position.z += character.moveDistance;
//       break;
//     case "d":
//     case "arrowright":
//       character.instance.position.z -= character.moveDistance;
//       break;
//     default:
//       return;
//   }
// }
// window.addEventListener("keydown", onkeyDown);

modalExitButton.addEventListener("click", hideModel);
window.addEventListener("resize", onResize);
window.addEventListener("click", onclick);
window.addEventListener("pointermove", onPointerMove);

function animate()
{
  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(intersectObjects);

  if (intersects.length > 0) 
  {
    document.body.style.cursor = "pointer";
  }
  else
  {
    document.body.style.cursor = "default";
    intersectObject = "";
  }

  for (let i = 0; i < intersects.length; i++)
  {
    // console.log(intersects[0].object.name);
    intersectObject = intersects[0].object.name;
  }

  renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate );