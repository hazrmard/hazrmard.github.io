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

export function make_custom_axes(size, labels, color_x, color_y, color_z, opacity = 1.0) {
    const group = new THREE.Group();
    const origin = new THREE.Vector3(0, 0, 0);
    const headLength = size * 0.15;
    const headWidth = size * 0.08;

    const dirs = [
        new THREE.Vector3(1, 0, 0),
        new THREE.Vector3(0, 1, 0),
        new THREE.Vector3(0, 0, 1)
    ];
    const colors = [color_x, color_y, color_z];

    for (let i = 0; i < 3; i++) {
        const arrow = new THREE.ArrowHelper(dirs[i], origin, size, colors[i], headLength, headWidth);
        if (opacity < 1.0) {
            arrow.line.material.transparent = true;
            arrow.line.material.opacity = opacity;
            arrow.cone.material.transparent = true;
            arrow.cone.material.opacity = opacity;
        }
        group.add(arrow);

        const label = labels[i];
        if (label) {
            const hexColorStr = '#' + colors[i].toString(16).padStart(6, '0');
            const sprite = makeTextSprite(label, hexColorStr);
            const pos = [0, 0, 0];
            pos[i] = size + 0.12;
            sprite.position.set(...pos);
            if (opacity < 1.0) {
                sprite.material.transparent = true;
                sprite.material.opacity = opacity;
            }
            group.add(sprite);
        }
    }

    return group;
}

export function make_rotation_scene(container_id) {
    const container = document.getElementById(container_id);
    if (!container) return;

    // Inject HTML & CSS structure
    container.innerHTML = `
        <style>
            .rot-widget {
                display: flex;
                flex-direction: row;
                font-family: 'Proza Libre', system-ui, -apple-system, sans-serif;
                border: 1px solid #cbd5e1;
                border-radius: 12px;
                background: #f8fafc;
                overflow: hidden;
                box-shadow: 0 4px 12px rgba(0,0,0,0.05);
                margin: 1.5em 0;
            }
            .rot-canvas-container {
                flex: 3;
                position: relative;
                min-height: 420px;
                background: #ffffff;
            }
            .rot-controls {
                flex: 2;
                padding: 1.25rem;
                display: flex;
                flex-direction: column;
                gap: 0.75rem;
                border-left: 1px solid #e2e8f0;
                box-sizing: border-box;
                background: #f8fafc;
            }
            .rot-title {
                font-size: 1.1rem;
                font-weight: 700;
                color: #26596A;
                margin: 0 0 0.25rem 0;
                font-family: 'Cormorant Garamond', serif;
            }
            .rot-step-indicator {
                display: flex;
                justify-content: space-between;
                background: #e2e8f0;
                padding: 4px;
                border-radius: 8px;
                gap: 4px;
            }
            .rot-step-btn {
                flex: 1;
                text-align: center;
                font-size: 0.7rem;
                font-weight: 600;
                padding: 6px 2px;
                border-radius: 6px;
                cursor: pointer;
                border: none;
                background: transparent;
                color: #64748b;
                transition: all 0.2s;
            }
            .rot-step-btn.active {
                background: #ffffff;
                color: #104050;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            }
            .rot-info-text {
                font-size: 0.8rem;
                line-height: 1.4;
                color: #334155;
                min-height: 5em;
                background: #ffffff;
                padding: 0.6rem;
                border-radius: 8px;
                border: 1px solid #e2e8f0;
                box-shadow: inset 0 1px 2px rgba(0,0,0,0.02);
            }
            .rot-slider-group {
                display: flex;
                flex-direction: column;
                gap: 0.5rem;
            }
            .rot-slider-row {
                display: flex;
                flex-direction: column;
                gap: 0.15rem;
            }
            .rot-slider-label {
                display: flex;
                justify-content: space-between;
                font-size: 0.75rem;
                font-weight: 600;
                color: #475569;
            }
            .rot-slider-input {
                width: 100%;
                accent-color: #26596A;
                cursor: pointer;
                margin: 0;
            }
            .rot-axis-toggles {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 0.4rem;
                font-size: 0.7rem;
                border-top: 1px solid #e2e8f0;
                padding-top: 0.5rem;
            }
            .rot-toggle-label {
                display: flex;
                align-items: center;
                gap: 0.35rem;
                color: #475569;
                font-weight: 500;
                cursor: pointer;
            }
            .rot-toggle-label input {
                cursor: pointer;
                accent-color: #26596A;
                margin: 0;
            }
            .rot-btn-group {
                display: flex;
                gap: 0.5rem;
                margin-top: auto;
                padding-top: 0.5rem;
            }
            .rot-action-btn {
                flex: 1;
                padding: 8px 12px;
                border-radius: 8px;
                font-size: 0.75rem;
                font-weight: 600;
                cursor: pointer;
                border: 1px solid #cbd5e1;
                background: #ffffff;
                color: #334155;
                transition: all 0.2s;
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 0.35rem;
            }
            .rot-action-btn:hover {
                background: #f1f5f9;
                border-color: #94a3b8;
            }
            .rot-action-btn.primary {
                background: #26596A;
                color: #ffffff;
                border: none;
            }
            .rot-action-btn.primary:hover {
                background: #104050;
            }
            
            @media screen and (max-width: 650px) {
                .rot-widget {
                    flex-direction: column;
                }
                .rot-canvas-container {
                    min-height: 300px;
                }
                .rot-controls {
                    border-left: none;
                    border-top: 1px solid #e2e8f0;
                }
            }
        </style>
        <div class="rot-widget">
            <div class="rot-canvas-container" id="${container_id}_canvas"></div>
            <div class="rot-controls">
                <h4 class="rot-title">Tait-Bryan Euler Sequence</h4>
                
                <div class="rot-step-indicator">
                    <button class="rot-step-btn active" id="${container_id}_btn_reset">0. Align</button>
                    <button class="rot-step-btn" id="${container_id}_btn_yaw">1. Yaw (ψ)</button>
                    <button class="rot-step-btn" id="${container_id}_btn_pitch">2. Pitch (θ)</button>
                    <button class="rot-step-btn" id="${container_id}_btn_roll">3. Roll (ϕ)</button>
                </div>

                <div class="rot-info-text" id="${container_id}_info">
                    <strong>Align:</strong> The body frame $\\hat{b}$ is initially aligned with the static Inertial Frame $\\hat{n}$.
                </div>

                <div class="rot-slider-group">
                    <div class="rot-slider-row">
                        <div class="rot-slider-label">
                            <span>Yaw (ψ) - about z₀</span>
                            <span id="${container_id}_yaw_val" style="color: #007aff; font-weight: bold;">0°</span>
                        </div>
                        <input type="range" class="rot-slider-input" id="${container_id}_yaw_slider" min="-180" max="180" value="0">
                    </div>
                    
                    <div class="rot-slider-row">
                        <div class="rot-slider-label">
                            <span>Pitch (θ) - about new y₁</span>
                            <span id="${container_id}_pitch_val" style="color: #34c759; font-weight: bold;">0°</span>
                        </div>
                        <input type="range" class="rot-slider-input" id="${container_id}_pitch_slider" min="-90" max="90" value="0">
                    </div>

                    <div class="rot-slider-row">
                        <div class="rot-slider-label">
                            <span>Roll (ϕ) - about new x₂</span>
                            <span id="${container_id}_roll_val" style="color: #ff3b30; font-weight: bold;">0°</span>
                        </div>
                        <input type="range" class="rot-slider-input" id="${container_id}_roll_slider" min="-180" max="180" value="0">
                    </div>
                </div>

                <div class="rot-axis-toggles">
                    <label class="rot-toggle-label">
                        <input type="checkbox" id="${container_id}_show_n" checked>
                        <span>Inertial (n₀)</span>
                    </label>
                    <label class="rot-toggle-label">
                        <input type="checkbox" id="${container_id}_show_n_psi" checked>
                        <span>Yawed (n₁)</span>
                    </label>
                    <label class="rot-toggle-label">
                        <input type="checkbox" id="${container_id}_show_n_theta" checked>
                        <span>Pitched (n₂)</span>
                    </label>
                    <label class="rot-toggle-label">
                        <input type="checkbox" id="${container_id}_show_b" checked>
                        <span>Body (b)</span>
                    </label>
                </div>

                <div class="rot-btn-group">
                    <button class="rot-action-btn primary" id="${container_id}_btn_play">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> <span>Pause Auto</span>
                    </button>
                    <button class="rot-action-btn" id="${container_id}_btn_reset_all">Reset</button>
                </div>
            </div>
        </div>
    `;

    const canvasContainer = document.getElementById(container_id + "_canvas");
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xffffff);

    const camera = new THREE.PerspectiveCamera(45, canvasContainer.clientWidth / canvasContainer.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(canvasContainer.clientWidth, canvasContainer.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    canvasContainer.appendChild(renderer.domElement);

    camera.up.set(0, 0, -1);
    camera.position.set(-2.2, -2.2, -3.2);
    camera.lookAt(0, 0, 0);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI / 2;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.update();

    const uav = make_UAV(4, false);
    scene.add(uav);

    const inertialAxes = make_custom_axes(1.5, ['N', 'E', 'D'], 0xff3b30, 0x34c759, 0x007aff, 1.0);
    scene.add(inertialAxes);

    const yawedAxes = make_custom_axes(1.4, ['x₁', 'y₁', 'z₁'], 0xff3b30, 0x34c759, 0x007aff, 0.45);
    scene.add(yawedAxes);

    const pitchedAxes = make_custom_axes(1.3, ['x₂', 'y₂', 'z₂'], 0xff3b30, 0x34c759, 0x007aff, 0.7);
    scene.add(pitchedAxes);

    const bodyAxes = make_custom_axes(1.2, ['x_b', 'y_b', 'z_b'], 0xff2d55, 0x5856d6, 0x5ac8fa, 1.0);
    scene.add(bodyAxes);

    const state = {
        yaw: 0,
        pitch: 0,
        roll: 0,
        isPlaying: true,
        time: 0,
        duration: 16.0,
        showN: true,
        showNPsi: true,
        showNTheta: true,
        showB: true
    };

    const yawSlider = document.getElementById(container_id + "_yaw_slider");
    const pitchSlider = document.getElementById(container_id + "_pitch_slider");
    const rollSlider = document.getElementById(container_id + "_roll_slider");

    const yawVal = document.getElementById(container_id + "_yaw_val");
    const pitchVal = document.getElementById(container_id + "_pitch_val");
    const rollVal = document.getElementById(container_id + "_roll_val");

    const showNCheck = document.getElementById(container_id + "_show_n");
    const showNPsiCheck = document.getElementById(container_id + "_show_n_psi");
    const showNThetaCheck = document.getElementById(container_id + "_show_n_theta");
    const showBCheck = document.getElementById(container_id + "_show_b");

    const infoText = document.getElementById(container_id + "_info");

    const btnPlay = document.getElementById(container_id + "_btn_play");
    const btnResetAll = document.getElementById(container_id + "_btn_reset_all");

    const btnTabReset = document.getElementById(container_id + "_btn_reset");
    const btnTabYaw = document.getElementById(container_id + "_btn_yaw");
    const btnTabPitch = document.getElementById(container_id + "_btn_pitch");
    const btnTabRoll = document.getElementById(container_id + "_btn_roll");

    function updateUI() {
        yawSlider.value = state.yaw;
        pitchSlider.value = state.pitch;
        rollSlider.value = state.roll;

        yawVal.innerText = state.yaw.toFixed(0) + "°";
        pitchVal.innerText = state.pitch.toFixed(0) + "°";
        rollVal.innerText = state.roll.toFixed(0) + "°";

        showNCheck.checked = state.showN;
        showNPsiCheck.checked = state.showNPsi;
        showNThetaCheck.checked = state.showNTheta;
        showBCheck.checked = state.showB;

        btnTabReset.classList.remove("active");
        btnTabYaw.classList.remove("active");
        btnTabPitch.classList.remove("active");
        btnTabRoll.classList.remove("active");

        if (state.yaw === 0 && state.pitch === 0 && state.roll === 0) {
            btnTabReset.classList.add("active");
            infoText.innerHTML = `<strong>Align:</strong> The body frame $\\hat{b}$ is initially aligned with the static Inertial Frame $\\hat{n}$.`;
        } else if (state.pitch === 0 && state.roll === 0) {
            btnTabYaw.classList.add("active");
            infoText.innerHTML = `<strong>Yaw ($\\psi$ = ${state.yaw.toFixed(0)}°):</strong> Rotating about the vertical inertial $z_0$-axis. This defines the intermediate frame $\\hat{n}_\\psi$ with rotated axes $x_1$ and $y_1$ (Blue axis).`;
        } else if (state.roll === 0) {
            btnTabPitch.classList.add("active");
            infoText.innerHTML = `<strong>Pitch ($\\theta$ = ${state.pitch.toFixed(0)}°):</strong> Rotating about the new intermediate $y_1$-axis (East/Green). This defines the intermediate frame $\\hat{n}_{\\psi,\\theta}$ with rotated axes $x_2$ and $z_2$.`;
        } else {
            btnTabRoll.classList.add("active");
            infoText.innerHTML = `<strong>Roll ($\\phi$ = ${state.roll.toFixed(0)}°):</strong> Rotating about the new intermediate $x_2$-axis (North/Red). This defines the final body-fixed frame $\\hat{b}$ with axes $x_b, y_b, z_b$.`;
        }

        if (window.renderMathInElement) {
            try {
                window.renderMathInElement(infoText, {
                    delimiters: [
                        { left: '$$', right: '$$', display: true },
                        { left: '$', right: '$', display: false },
                        { left: '\\(', right: '\\)', display: false },
                        { left: '\\[', right: '\\]', display: true }
                    ],
                    throwOnError: false
                });
            } catch (e) {
                console.warn("KaTeX rendering failed", e);
            }
        }

        if (state.isPlaying) {
            btnPlay.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg> <span>Pause Auto</span>`;
            btnPlay.classList.add("primary");
        } else {
            btnPlay.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg> <span>Play Auto</span>`;
            btnPlay.classList.remove("primary");
        }
    }

    function applyRotations() {
        yawedAxes.rotation.set(0, 0, THREE.MathUtils.degToRad(state.yaw), 'ZYX');
        pitchedAxes.rotation.set(0, THREE.MathUtils.degToRad(state.pitch), THREE.MathUtils.degToRad(state.yaw), 'ZYX');
        bodyAxes.rotation.set(THREE.MathUtils.degToRad(state.roll), THREE.MathUtils.degToRad(state.pitch), THREE.MathUtils.degToRad(state.yaw), 'ZYX');
        uav.rotation.set(THREE.MathUtils.degToRad(state.roll), THREE.MathUtils.degToRad(state.pitch), THREE.MathUtils.degToRad(state.yaw), 'ZYX');

        inertialAxes.visible = state.showN;
        yawedAxes.visible = state.showNPsi;
        pitchedAxes.visible = state.showNTheta;
        bodyAxes.visible = state.showB;
    }

    function setManualAngle(type, value) {
        state.isPlaying = false;
        state[type] = parseFloat(value);
        updateUI();
        applyRotations();
    }

    yawSlider.addEventListener("input", (e) => setManualAngle("yaw", e.target.value));
    pitchSlider.addEventListener("input", (e) => setManualAngle("pitch", e.target.value));
    rollSlider.addEventListener("input", (e) => setManualAngle("roll", e.target.value));

    showNCheck.addEventListener("change", (e) => {
        state.showN = e.target.checked;
        applyRotations();
    });
    showNPsiCheck.addEventListener("change", (e) => {
        state.showNPsi = e.target.checked;
        applyRotations();
    });
    showNThetaCheck.addEventListener("change", (e) => {
        state.showNTheta = e.target.checked;
        applyRotations();
    });
    showBCheck.addEventListener("change", (e) => {
        state.showB = e.target.checked;
        applyRotations();
    });

    btnPlay.addEventListener("click", () => {
        state.isPlaying = !state.isPlaying;
        updateUI();
    });

    btnResetAll.addEventListener("click", () => {
        state.isPlaying = false;
        state.time = 0;
        state.yaw = 0;
        state.pitch = 0;
        state.roll = 0;
        updateUI();
        applyRotations();
    });

    btnTabReset.addEventListener("click", () => {
        state.isPlaying = false;
        state.yaw = 0;
        state.pitch = 0;
        state.roll = 0;
        updateUI();
        applyRotations();
    });

    btnTabYaw.addEventListener("click", () => {
        state.isPlaying = false;
        state.yaw = 50;
        state.pitch = 0;
        state.roll = 0;
        updateUI();
        applyRotations();
    });

    btnTabPitch.addEventListener("click", () => {
        state.isPlaying = false;
        state.yaw = 50;
        state.pitch = 30;
        state.roll = 0;
        updateUI();
        applyRotations();
    });

    btnTabRoll.addEventListener("click", () => {
        state.isPlaying = false;
        state.yaw = 50;
        state.pitch = 30;
        state.roll = 40;
        updateUI();
        applyRotations();
    });

    function easeInOutQuad(x) {
        return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
    }

    let lastTime = performance.now();
    let animFrameId = null;

    function animate() {
        animFrameId = requestAnimationFrame(animate);

        const now = performance.now();
        const deltaTime = (now - lastTime) / 1000;
        lastTime = now;

        if (state.isPlaying) {
            state.time += deltaTime;
            state.time = state.time % state.duration;
            const t = state.time;

            if (t < 1.0) {
                state.yaw = 0;
                state.pitch = 0;
                state.roll = 0;
            } else if (t < 4.0) {
                const progress = (t - 1.0) / 3.0;
                state.yaw = easeInOutQuad(progress) * 50;
                state.pitch = 0;
                state.roll = 0;
            } else if (t < 5.0) {
                state.yaw = 50;
                state.pitch = 0;
                state.roll = 0;
            } else if (t < 8.0) {
                const progress = (t - 5.0) / 3.0;
                state.yaw = 50;
                state.pitch = easeInOutQuad(progress) * 30;
                state.roll = 0;
            } else if (t < 9.0) {
                state.yaw = 50;
                state.pitch = 30;
                state.roll = 0;
            } else if (t < 12.0) {
                const progress = (t - 9.0) / 3.0;
                state.yaw = 50;
                state.pitch = 30;
                state.roll = easeInOutQuad(progress) * 40;
            } else if (t < 14.0) {
                state.yaw = 50;
                state.pitch = 30;
                state.roll = 40;
            } else {
                const progress = (t - 14.0) / 2.0;
                const ease = easeInOutQuad(progress);
                state.yaw = 50 * (1.0 - ease);
                state.pitch = 30 * (1.0 - ease);
                state.roll = 40 * (1.0 - ease);
            }

            updateUI();
            applyRotations();
        }

        controls.update();
        renderer.render(scene, camera);
    }

    animate();

    const resizeObserver = new ResizeObserver(() => {
        const width = canvasContainer.clientWidth;
        const height = canvasContainer.clientHeight;
        renderer.setSize(width, height);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    });
    resizeObserver.observe(canvasContainer);
}

