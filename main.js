import * as THREE from 'three';
import { SVGLoader } from './vendor/SVGLoader.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const LOGO_CONFIG = {
  svgUrl: './assets/icons/Logo.svg',
  depth: 32,
  bevelSize: 1.1,
  secondsPerTurn: 28,

  faceColor: '#eeeeeb',
  sideColor: '#a2a2a0',

  metalness: 0.88,
  roughness: 0.24,

  maxPixelRatio: 1.7,
  softwareFPS: 20,

  dragSensitivityX: 0.008,
  dragSensitivityY: 0.004,

};

const stage = document.querySelector('#logo-stage');
const canvas = document.querySelector('#logo-canvas');

const status = document.querySelector('#render-status');

const pauseButton = document.querySelector('#toggle-rotation');
const resetButton = document.querySelector('#reset-view');

const motionIcon = document.querySelector('#motion-icon');
const motionLabel = document.querySelector('#motion-label');

const dragHint = document.querySelector('#drag-hint');

const motionPreference = window.matchMedia(
  '(prefers-reduced-motion: reduce)'
);

let renderer = null;

let ready = false;
let failed = false;

let softwareFrame = null;
let activeRenderCallback = null;

let resizeObserver = null;
let intersectionObserver = null;

let mainScene = null;
let mainCamera = null;
let mainLogo = null;

let artworkSize = null;

function setRenderLoop(callback) {
  activeRenderCallback = callback;

  if (renderer?.isWebGLRenderer) {
    renderer.setAnimationLoop(callback);
    return;
  }

  if (softwareFrame !== null) {
    cancelAnimationFrame(softwareFrame);
    softwareFrame = null;
  }

  if (!callback) return;

  let lastPaint = 0;

  function tick(time) {

    if (!activeRenderCallback) return;

    softwareFrame = requestAnimationFrame(tick);

    const frameInterval = 1000 / LOGO_CONFIG.softwareFPS;

    if (time - lastPaint < frameInterval) return;

    lastPaint = time;

    activeRenderCallback(time);
  }

  softwareFrame = requestAnimationFrame(tick);
}


/* ============================================================
   05. STATUS & FALLBACK
   ============================================================ */

function showFallback(error) {

  if (failed) return;

  failed = true;
  ready = false;

  setRenderLoop(null);

  if (stage) {
    stage.classList.remove('is-ready');
    stage.classList.remove('is-dragging');
  }

  if (status) {
    status.textContent =
      'Static logo view. 3D is unavailable on this device.';
  }

  if (pauseButton) pauseButton.disabled = true;
  if (resetButton) resetButton.disabled = true;

  if (dragHint) {
    dragHint.textContent = 'DONKEY';
  }

  console.warn('DONKEY 3D Engine:', error);
}


/* ============================================================
   06. INITIALIZE 3D SCENE
   ============================================================ */

async function startLogo() {

  // DOM Validation
  if (!stage || !canvas) {

    throw new Error(
      'Missing #logo-stage or #logo-canvas in index.html'
    );
  }


  /* --------------------------------------------------------
     Scene
  -------------------------------------------------------- */

  const scene = new THREE.Scene();

  mainScene = scene;


  /* --------------------------------------------------------
     Camera
  -------------------------------------------------------- */

  const camera = new THREE.OrthographicCamera(
    -5, 5,
    2, -2,
    0.1, 100
  );

  camera.position.set(0, 0, 16);

  camera.lookAt(0, 0, 0);

  mainCamera = camera;


  /* --------------------------------------------------------
     Renderer Initialization
  -------------------------------------------------------- */

  let softwareMode = false;

  try {

    renderer = new THREE.WebGLRenderer({

      canvas: canvas,

      alpha: true,

      antialias: true,

    });

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio || 1,
        LOGO_CONFIG.maxPixelRatio
      )
    );

    renderer.outputColorSpace = THREE.SRGBColorSpace;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure = 1.35;

    renderer.setClearColor(0x080808, 0);

  } catch (webglError) {

    console.warn(
      'WebGL unavailable. Trying SVG Renderer...',
      webglError
    );

    // SVG Software Renderer
    const { SVGRenderer } = await import(
      './vendor/renderers/SVGRenderer.js'
    );

    renderer = new SVGRenderer();

    renderer.setPrecision(2);

    renderer.overdraw = 0.8;

    renderer.setClearColor(0x080808);

    renderer.domElement.setAttribute(
      'aria-hidden',
      'true'
    );

    renderer.domElement.classList.add(
      'software-renderer'
    );

    stage.appendChild(renderer.domElement);

    canvas.hidden = true;

    softwareMode = true;
  }


  /* ========================================================
     07. ENVIRONMENT & LIGHTING
     ======================================================== */

  if (!softwareMode) {

    const environment = new RoomEnvironment();

    const generator = new THREE.PMREMGenerator(renderer);

    const environmentMap = generator.fromScene(
      environment,
      0.04
    );

    scene.environment = environmentMap.texture;

    environment.dispose();

    generator.dispose();

  } else {

    scene.add(
      new THREE.AmbientLight(0xffffff, 0.3)
    );
  }


  // Main Light
  const keyLight = new THREE.DirectionalLight(
    0xffffff,
    softwareMode ? 0.75 : 3
  );

  keyLight.position.set(-4, 5, 8);

  scene.add(keyLight);


  // Gold Rim Light
  const rimLight = new THREE.DirectionalLight(
    0xc5a158,
    softwareMode ? 0.4 : 2
  );

  rimLight.position.set(5, 0, -4);

  scene.add(rimLight);


  // Cool Fill Light
  const fillLight = new THREE.DirectionalLight(
    0xd5e1ff,
    softwareMode ? 0.2 : 1.2
  );

  fillLight.position.set(2, -3, 5);

  scene.add(fillLight);


  /* ========================================================
     08. LOAD SVG LOGO
     Convert SVG Paths into 3D Geometry
     ======================================================== */

  if (status) {
    status.textContent = 'Loading DONKEY logo...';
  }

  const loader = new SVGLoader();

  const data = await loader.loadAsync(
    LOGO_CONFIG.svgUrl
  );


  const artwork = new THREE.Group();


  /* --------------------------------------------------------
     Materials

     Standard Material: WebGL
     Basic Material: SVG Software Renderer
  -------------------------------------------------------- */

  const faceMaterial = softwareMode

    ? new THREE.MeshBasicMaterial({

      color: LOGO_CONFIG.faceColor,

    })

    : new THREE.MeshStandardMaterial({

      color: LOGO_CONFIG.faceColor,

      metalness: LOGO_CONFIG.metalness,

      roughness: LOGO_CONFIG.roughness,

      envMapIntensity: 1.3,

    });


  const sideMaterial = softwareMode

    ? new THREE.MeshBasicMaterial({

      color: LOGO_CONFIG.sideColor,

    })

    : new THREE.MeshStandardMaterial({

      color: LOGO_CONFIG.sideColor,

      metalness: LOGO_CONFIG.metalness,

      roughness: LOGO_CONFIG.roughness + 0.05,

      envMapIntensity: 1.3,

    });


  /* --------------------------------------------------------
     SVG Path Conversion
  -------------------------------------------------------- */

  for (const path of data.paths) {

    // Ignore unfilled paths
    if (path.userData.style.fill === 'none') continue;


    const shapes = SVGLoader.createShapes(path);


    for (const shape of shapes) {

      const geometry = new THREE.ExtrudeGeometry(
        shape,
        {

          depth: LOGO_CONFIG.depth,

          steps: 1,

          bevelEnabled: !softwareMode,

          bevelSize: LOGO_CONFIG.bevelSize,

          bevelThickness: LOGO_CONFIG.bevelSize,

          bevelSegments: softwareMode ? 1 : 3,

          curveSegments: softwareMode ? 10 : 24,

        }
      );


      const mesh = new THREE.Mesh(
        geometry,
        [
          faceMaterial,
          sideMaterial
        ]
      );

      artwork.add(mesh);
    }
  }


  // Verify SVG
  if (!artwork.children.length) {

    throw new Error(
      'SVG contains no filled paths. Check the source SVG.'
    );
  }


  /* ========================================================
     09. LOGO TRANSFORMATION
     ======================================================== */

  // SVG Y-axis points downward.
  // Three.js Y-axis points upward.

  artwork.scale.set(
    0.006,
    -0.006,
    0.006
  );


  artwork.updateMatrixWorld(true);


  // Calculate Bounding Box
  const bounds = new THREE.Box3().setFromObject(artwork);

  const size = bounds.getSize(
    new THREE.Vector3()
  );

  const center = bounds.getCenter(
    new THREE.Vector3()
  );


  // Center Logo
  artwork.position.sub(center);

  artworkSize = size;


  /* --------------------------------------------------------
     Create Main Logo Group
  -------------------------------------------------------- */

  const logo = new THREE.Group();

  logo.add(artwork);

  // Initial View
  logo.rotation.set(
    -0.06,
    -0.16,
    0
  );

  scene.add(logo);

  mainLogo = logo;


  /* ========================================================
     10. RESPONSIVE CAMERA
     ======================================================== */

  let viewDirty = true;


  function resize() {

    const width = stage.clientWidth;

    const height = stage.clientHeight;


    if (width <= 0 || height <= 0) return;


    const aspect = width / height;


    /*
     * คำนวณพื้นที่กล้องตามสัดส่วนหน้าจอ
     * เพื่อรักษาโลโก้ทั้งชิ้นไม่ให้ถูกตัด
     */

    const viewHeight = Math.max(

      size.y * 1.8,

      (size.x * 1.21) / aspect

    );


    const viewWidth = viewHeight * aspect;


    camera.left = -viewWidth / 2;

    camera.right = viewWidth / 2;

    camera.top = viewHeight / 2;

    camera.bottom = -viewHeight / 2;


    camera.updateProjectionMatrix();


    renderer.setSize(
      width,
      height,
      false
    );


    viewDirty = true;
  }


  // Resize Observer
  if (window.ResizeObserver) {

    resizeObserver = new ResizeObserver(resize);

    resizeObserver.observe(stage);

  } else {

    window.addEventListener('resize', resize);

  }


  resize();


  /* ========================================================
     11. ROTATION CONTROLS
     Pause / Play / Front View
     ======================================================== */
  let paused = motionPreference.matches;
  let dragging = false;
  let pointerX = 0;
  let pointerY = 0;
  let lastTime = null;


  function updateControls() {
    if (pauseButton) {
      pauseButton.setAttribute(
        'aria-pressed',
        String(paused)
      );
    }

    if (motionLabel) {
      motionLabel.textContent = paused
        ? 'Play rotation'
        : 'Pause rotation';
    }

    if (motionIcon) {
      motionIcon.textContent = paused
        ? '▷'
        : 'Ⅱ';
    }
  }


  // Pause / Play
  pauseButton?.addEventListener('click', () => {
    paused = !paused;
    updateControls();
  });


  // Front View
  resetButton?.addEventListener('click', () => {

    logo.rotation.set(0, 0, 0);

    viewDirty = true;

    paused = true;

    updateControls();
  });


  // Respect System Reduced Motion
  if (motionPreference.addEventListener) {
    motionPreference.addEventListener(
      'change',
      (event) => {
        paused = event.matches;
        updateControls();
      }
    );

  } else {
    motionPreference.addListener((event) => {
      paused = event.matches;
      updateControls();
    });
  }


  /* ========================================================
     12. DRAG CONTROLS
     Mouse / Touch / Pointer
     ======================================================== */


  // Begin Drag
  stage.addEventListener('pointerdown', (event) => {

    if (!event.isPrimary || event.button !== 0) return;


    dragging = true;

    paused = true;

    pointerX = event.clientX;

    pointerY = event.clientY;


    if (stage.setPointerCapture) {

      stage.setPointerCapture(event.pointerId);
    }


    stage.classList.add('is-dragging');

    updateControls();
  });


  // Rotate Logo
  stage.addEventListener('pointermove', (event) => {

    if (!dragging || !event.isPrimary) return;


    const deltaX = event.clientX - pointerX;

    const deltaY = event.clientY - pointerY;


    // Horizontal Rotation
    logo.rotation.y +=
      deltaX * LOGO_CONFIG.dragSensitivityX;


    // Vertical Rotation
    logo.rotation.x = THREE.MathUtils.clamp(

      logo.rotation.x +
      deltaY * LOGO_CONFIG.dragSensitivityY,

      -0.5,

      0.5

    );


    pointerX = event.clientX;

    pointerY = event.clientY;


    viewDirty = true;
  });


  // End Drag
  function endDrag() {

    dragging = false;

    stage.classList.remove('is-dragging');
  }


  stage.addEventListener('pointerup', endDrag);

  stage.addEventListener('pointercancel', endDrag);

  stage.addEventListener('lostpointercapture', endDrag);


  /* ========================================================
     13. ANIMATION FRAME
     FPS Independent Rotation
     ======================================================== */


  function frame(time) {

    const delta = lastTime === null

      ? 0

      : Math.min(
        (time - lastTime) / 1000,
        0.05
      );


    lastTime = time;


    // Check Current Animation State
    const isAnimating =
      !paused &&
      !dragging &&
      !document.hidden;


    // Automatic Rotation
    if (isAnimating) {

      logo.rotation.y +=

        delta *
        Math.PI * 2 /
        LOGO_CONFIG.secondsPerTurn;

    }


    // Render Only When Needed
    if (isAnimating || viewDirty) {

      renderer.render(scene, camera);

      viewDirty = false;
    }
  }


  /* ========================================================
     14. START ENGINE
     ======================================================== */

  ready = true;


  // Enable Controls
  if (pauseButton) pauseButton.disabled = false;

  if (resetButton) resetButton.disabled = false;


  updateControls();


  // Render First Frame Before Showing Canvas
  renderer.render(scene, camera);


  // Hide Fallback and Show 3D
  stage.classList.add('is-ready');


  if (status) {
    status.textContent = '';
  }


  /* ========================================================
     15. VISIBILITY & PERFORMANCE
     ======================================================== */

  let inView = true;


  function syncLoop() {

    lastTime = null;


    const shouldRender =
      !document.hidden &&
      inView &&
      ready &&
      !failed;


    setRenderLoop(
      shouldRender ? frame : null
    );
  }


  // Pause Rendering When Tab Is Hidden
  document.addEventListener(
    'visibilitychange',
    syncLoop
  );


  // Pause Rendering When Section Is Outside Viewport
  if (window.IntersectionObserver) {

    intersectionObserver = new IntersectionObserver(
      ([entry]) => {

        inView = entry.isIntersecting;

        syncLoop();

      },
      {
        threshold: 0
      }
    );

    intersectionObserver.observe(stage);

  }


  /* ========================================================
     16. WEBGL CONTEXT LOSS
     ======================================================== */

  canvas.addEventListener(
    'webglcontextlost',
    (event) => {

      event.preventDefault();

      showFallback(
        new Error(
          'WebGL context lost. Reload the page to retry.'
        )
      );

    }
  );


  /* ========================================================
     17. FINAL INITIALIZATION
     ======================================================== */

  syncLoop();


  console.info(
    'DONKEY 3D Engine initialized successfully.',
    {
      renderer: softwareMode
        ? 'SVG Software Renderer'
        : 'WebGL Renderer',

      logoSize: {
        width: size.x,
        height: size.y,
        depth: size.z
      },

      rotationSeconds: LOGO_CONFIG.secondsPerTurn,

      reducedMotion: paused
    }
  );

}


/* ============================================================
   18. START
   ============================================================ */
startLogo().catch((error) => {
  showFallback(error);

});
