// Importing three.js, assuming it's already included in your environment
import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js";
import { OrbitControls } from "./OrbitControls.js"

// Function to create the UAV model
// The UAV has `n_props` arms, equally spaced.
export function make_UAV(n_props, with_axes = true) {
    const UAV = new THREE.Group();

    // Create central body (sphere)
    const bodyGeometry = new THREE.SphereGeometry(0.25, 32, 32); // Diameter 1
    const bodyMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    UAV.add(body);

    // Create propeller arms and propellers
    const armLength = 1.0;

    for (let i = 0; i < n_props; i++) {
        const angle = (i / n_props) * Math.PI * 2;

        // Create arm
        const armGeometry = new THREE.CylinderGeometry(0.05, 0.05, armLength, 16);
        const armMaterial = new THREE.MeshBasicMaterial({ color: 0x0000ff });
        const arm = new THREE.Mesh(armGeometry, armMaterial);

        // right handed coordinate system
        // x -> North
        // y -> East
        // z -> Down
        arm.position.x = Math.sin(angle) * armLength / 2;
        arm.position.y = Math.cos(angle) * armLength / 2;
        arm.position.z = 0;
        arm.rotation.z = angle;
        UAV.add(arm);
    }

    if (with_axes) {
        const axes = make_axes(1.5, ["x/Roll", "y/Pitch", "z/Yaw"]);
        UAV.add(axes);
    }

    return UAV;
}

export function make_axes(size, labels = ['N', 'E', 'D']) {
    const group = new THREE.Group();
    const axesHelper = new THREE.AxesHelper(size);
    group.add(axesHelper);

    const colors = ['red', 'green', 'blue'];

    for (let i = 0; i < 3; i++) {
        const label = labels[i];
        if (label) {
            const sprite = makeTextSprite(label, colors[i]);
            const pos = [0, 0, 0];
            pos[i] = size;
            sprite.position.set(...pos);
            group.add(sprite);
        }
    }

    return group;
}

function makeTextSprite(message, color) {
    const canvas = document.createElement('canvas');
    const context = canvas.getContext('2d');
    const fontSize = 64;
    context.font = "Bold " + fontSize + "px Arial";

    const textWidth = context.measureText(message).width;
    canvas.width = textWidth;
    canvas.height = fontSize;

    context.font = "Bold " + fontSize + "px Arial";
    context.fillStyle = color;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(message, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMaterial = new THREE.SpriteMaterial({ map: texture, depthTest: false });
    const sprite = new THREE.Sprite(spriteMaterial);

    const aspectRatio = canvas.width / canvas.height;
    sprite.scale.set(0.25 * aspectRatio, 0.25, 1);
    return sprite;
}

// Function to create a scene and render the UAV inside a given div
export function make_scene(uav, div_id) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);
    const camera = new THREE.PerspectiveCamera(100, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });

    // Set the size of the renderer and append to the given div
    const container = document.getElementById(div_id);
    container.style.width = "500px";
    container.style.height = "500px";
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Global axes at origin
    const globalAxes = make_axes(2.0);
    scene.add(globalAxes);

    // Add the UAV to the scene
    uav.position.set(1, 1, -1)
    scene.add(uav);

    // Set camera up vector to represent the NED "Up" direction (-Z is Up in NED)
    camera.up.set(0, 0, -1);

    // Set camera position to view the UAV
    camera.position.set(-2, -1, -4);
    camera.lookAt(0, 0, 0);

    // Add orbit controls - this will capture the camera's up vector (0, 0, -1)
    // and establish the orbiting rotation axis around the Z-axis.
    const controls = new OrbitControls(camera, renderer.domElement);

    // In NED, the horizontal ground plane is the XY plane, and Z is vertical (pointing down).
    // The camera's "Up" vector is (0, 0, -1) (pointing up).
    // - Polar angle 0 corresponds to looking straight down along the +Z axis (from above the UAV).
    // - Polar angle Math.PI / 2 corresponds to looking horizontally (parallel to the XY plane).
    // - Polar angle Math.PI corresponds to looking straight up along the -Z axis (from below the UAV).
    // To lock the camera to the upper hemisphere (Z <= 0), we set the polar angle limits to [0, Math.PI / 2].
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2; // Correctly locks camera to the upper hemisphere
    controls.update();

    // Animation loop to render the scene and allow navigation
    function animate() {
        requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
    }

    animate();
}
