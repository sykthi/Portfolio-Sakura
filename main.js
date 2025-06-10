import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const scene = new THREE.Scene();
const canvas = document.getElementById("experience-canvas");
const sizes = {width: innerWidth, height: innerHeight};

const renderer = new THREE.WebGLRenderer({canvas: canvas, antialias: true});

renderer.setSize( sizes.width, sizes.height );
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;

//loading model
const loader = new GLTFLoader();

loader.load( './Scene3.glb', function ( glb ) {
  console.log(glb);
  glb.scene.traverse(child => {
    if(child.isMesh){
      child.castShadow = true;
      child.receiveShadow = true;
    }
    console.log(child);
  });

  scene.add( glb.scene );

}, undefined, function ( error ) {

  console.error( error );

} );

//dirLight
const sun = new THREE.DirectionalLight( 0xFFFFFF );
sun.castShadow = true;
sun.position.set(30,25,-30);
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
scene.add( shadowHelper );
console.log(sun.shadow);
const helper = new THREE.DirectionalLightHelper( sun, 5 );
scene.add( helper );

//Ambilight
const light = new THREE.AmbientLight( 0x404040, 10); // soft white light
scene.add( light );

const aspect = sizes.width/sizes.height;
const camera = new THREE.OrthographicCamera( -aspect * 50, aspect * 50, 50, -50, 1, 1000 );

camera.position.x = -12;
camera.position.y = 11;
camera.position.z = -12;

const controls = new OrbitControls( camera, canvas );
controls.update();

function handleResize(){
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

window.addEventListener("resize", handleResize);


function animate() {
  // console.log(camera.position);
  renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate );