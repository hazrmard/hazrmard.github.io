import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera( 75, 1, 0.1, 1000 );

const renderer = new THREE.WebGLRenderer();
renderer.setSize( 300, 300 );
document.getElementById("three_container").appendChild( renderer.domElement );

const geometry = new THREE.BoxGeometry( 1, 1, 1 );
const material = new THREE.MeshBasicMaterial( { color: 0x00ff00 } );
const cube = new THREE.Mesh( geometry, material );
scene.add( cube );

camera.position.z = 5;

function animate() {
	renderer.render( scene, camera );
}
renderer.setAnimationLoop( animate );