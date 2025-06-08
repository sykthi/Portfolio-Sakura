import * as THREE from 'three';

const scene = new THREE.Scene();
const canvas = document.getElementById("experience-canvas");
const sizes = {width: innerWidth, height: innerHeight};
const camera = new THREE.PerspectiveCamera( 75, sizes.width / sizes.height, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer({canvas: canvas});
renderer.setSize( sizes.width, sizes.height );
console.log(renderer);
document.body.appendChild( renderer.domElement );

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x570000 } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

function handleResize(){
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();

  console.log("resizing");

  renderer.setSize(sizes.width, sizes.height);
}

window.addEventListener("resize", handleResize);


function animate() {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.01;
  renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate );