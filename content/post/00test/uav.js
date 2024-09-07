// Importing three.js, assuming it's already included in your environment
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";
import {OrbitControls} from "./OrbitControls.js"

// Function to create the UAV model
export function make_UAV(n_props) {
    const UAV = new THREE.Object3D();
    
    // Create central body (sphere)
    const bodyGeometry = new THREE.SphereGeometry(0.5, 32, 32); // Diameter 1
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    UAV.add(body);

    // Create propeller arms and propellers
    const armLength = 1.0; // Twice the body diameter (i.e., 1)
    const propellerRadius = 0.25; // Propeller diameter is 0.5
    
    for (let i = 0; i < n_props; i++) {
        const angle = (i / n_props) * Math.PI * 2;
        
        // Create arm
        const armGeometry = new THREE.CylinderGeometry(0.05, 0.05, armLength, 16);
        const armMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        const arm = new THREE.Mesh(armGeometry, armMaterial);
        
        arm.position.x = Math.cos(angle) * (armLength / 2 + 0.5);
        arm.position.y = 0;
        arm.position.z = Math.sin(angle) * (armLength / 2 + 0.5);
        arm.rotation.z = angle;
        UAV.add(arm);
        
        // Create propeller
        const propellerGeometry = new THREE.CircleGeometry(propellerRadius, 32);
        const propellerMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
        const propeller = new THREE.Mesh(propellerGeometry, propellerMaterial);
        
        propeller.position.x = Math.cos(angle) * (armLength + 0.5);
        propeller.position.y = 0;
        propeller.position.z = Math.sin(angle) * (armLength + 0.5);
        propeller.rotation.x = Math.PI / 2; // Rotate flat
        
        UAV.add(propeller);
    }

    return UAV;
}

// Function to create a scene and render the UAV inside a given div
export function make_scene(uav, div_id) {
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer();
    
    // Set the size of the renderer and append to the given div
    const container = document.getElementById(div_id);
    container.style.width = "100%"; // Set width to full container width
    container.style.height = "300px"; // Set height to full viewport height
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);
    
    // Add the UAV to the scene
    scene.add(uav);
    
    // Add orbit controls
    const controls = new OrbitControls(camera, renderer.domElement);
    
    // Set camera position to view the UAV
    camera.position.z = 5;
    
    // Animation loop to render the scene and allow navigation
    function animate() {
        requestAnimationFrame(animate);
        controls.update(); // Only required if controls.enableDamping = true
        renderer.render(scene, camera);
    }
    
    animate();
}
