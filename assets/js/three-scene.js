// assets/js/three-scene.js

let scene, camera, renderer, currentMesh;
let animationId;
let isShaking = false;

function init3DScene() {
    const canvas = document.getElementById('dynamic-canvas');
    if (!canvas) return;

    // 1. Scene setup
    scene = new THREE.Scene();

    // 2. Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 3, 7);

    // 3. Renderer setup
    renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // 4. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffa500, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    // Window resize handler
    window.addEventListener('resize', onWindowResize);
}

function loadDisaster3DModel(disasterId) {
    const canvas = document.getElementById('dynamic-canvas');
    canvas.style.display = 'block';

    // Clear previous mesh
    if (currentMesh) scene.remove(currentMesh);

    // Render interactive procedural 3D model based on disaster type
    if (disasterId === 'earthquake') {
        // Fractured ground mesh representation
        const geometry = new THREE.PlaneGeometry(10, 10, 16, 16);
        const material = new THREE.MeshStandardMaterial({ 
            color: 0x444444, 
            wireframe: true 
        });
        currentMesh = new THREE.Mesh(geometry, material);
        currentMesh.rotation.x = -Math.PI / 2;
        scene.add(currentMesh);

        isShaking = true;
    } else if (disasterId === 'fire') {
        // Burning emergency hazard volume
        const geometry = new THREE.ConeGeometry(1.5, 3, 32);
        const material = new THREE.MeshStandardMaterial({ color: 0xef4444, wireframe: true });
        currentMesh = new THREE.Mesh(geometry, material);
        scene.add(currentMesh);

        isShaking = false;
    }

    animate();
}

function animate() {
    animationId = requestAnimationFrame(animate);

    if (currentMesh) {
        currentMesh.rotation.z += 0.005;
    }

    // Camera shake effect for earthquake simulation
    if (isShaking) {
        camera.position.x = (Math.random() - 0.5) * 0.15;
        camera.position.y = 3 + (Math.random() - 0.5) * 0.15;
    }

    renderer.render(scene, camera);
}

function stop3DScene() {
    const canvas = document.getElementById('dynamic-canvas');
    if (canvas) canvas.style.display = 'none';
    if (animationId) cancelAnimationFrame(animationId);
}

function onWindowResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}