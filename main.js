
import * as THREE from 'three';
import { SVGLoader } from './vendor/SVGLoader.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const LOGO_CONFIG = {
  svgUrl: './assets/icons/Logo.svg',
  depth: 32,
  bevelSize: 1.1,
  secondsPerTurn: 28,

  initialRotationX: -0.06,
  initialRotationY: -0.16,
  resumeDelay: 500,
  resumeTiltSpeed: 3.5,

  faceColor: '#eeeeeb',
  sideColor: '#a2a2a0',
  metalness: 0.88,
  roughness: 0.24,

  maxPixelRatio: 1.7,
  softwareFPS: 20,

  dragSensitivityX: 0.006,
  dragSensitivityY: 0.002,
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

let resumeTimer = null;


// =========================================
// RENDER LOOP
// =========================================

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
  const frameInterval = 1000 / LOGO_CONFIG.softwareFPS;

  function tick(time) {
    if (!activeRenderCallback) return;

    softwareFrame = requestAnimationFrame(tick);

    if (time - lastPaint < frameInterval) return;

    lastPaint = time;
    activeRenderCallback(time);
  }

  softwareFrame = requestAnimationFrame(tick);
}


// =========================================
// AUTO RESUME TIMER
// =========================================
function clearResumeTimer() {
  if (resumeTimer !== null) {
    window.clearTimeout(resumeTimer);
    resumeTimer = null;
  }
}


// =========================================
// FALLBACK
// =========================================
function showFallback(error) {
  if (failed) return;

  failed = true;
  ready = false;

  clearResumeTimer();
  setRenderLoop(null);

  if (stage) {
    stage.classList.remove('is-ready', 'is-dragging');
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


// =========================================
// INITIALIZE 3D SCENE
// =========================================
async function startLogo() {

  if (!stage || !canvas) {
    throw new Error(
      'Missing #logo-stage or #logo-canvas in index.html'
    );
  }

  const scene = new THREE.Scene();

  const camera = new THREE.OrthographicCamera(
    -5, 5,
    2, -2,
    0.1, 100
  );

  camera.position.set(0, 0, 16);
  camera.lookAt(0, 0, 0);

  let softwareMode = false;


  // RENDERER
  try {
    renderer = new THREE.WebGLRenderer({
      canvas,
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


  // LIGHTING
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

  const keyLight = new THREE.DirectionalLight(
    0xffffff,
    softwareMode ? 0.75 : 3
  );

  keyLight.position.set(-4, 5, 8);
  scene.add(keyLight);

  const rimLight = new THREE.DirectionalLight(
    0xc5a158,
    softwareMode ? 0.4 : 2
  );

  rimLight.position.set(5, 0, -4);
  scene.add(rimLight);

  const fillLight = new THREE.DirectionalLight(
    0xd5e1ff,
    softwareMode ? 0.2 : 1.2
  );

  fillLight.position.set(2, -3, 5);
  scene.add(fillLight);


  // LOAD SVG
  if (status) {
    status.textContent = 'Loading DONKEY logo...';
  }

  const loader = new SVGLoader();

  const data = await loader.loadAsync(
    LOGO_CONFIG.svgUrl
  );

  const artwork = new THREE.Group();


  // MATERIALS
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


  // SVG PATH CONVERSION
  for (const path of data.paths) {

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

  if (!artwork.children.length) {
    throw new Error(
      'SVG contains no filled paths. Check the source SVG.'
    );
  }


  // LOGO TRANSFORMATION
  artwork.scale.set(
    0.006,
    -0.006,
    0.006
  );

  artwork.updateMatrixWorld(true);

  const bounds = new THREE.Box3().setFromObject(artwork);

  const size = bounds.getSize(
    new THREE.Vector3()
  );

  const center = bounds.getCenter(
    new THREE.Vector3()
  );

  artwork.position.sub(center);


  // MAIN LOGO GROUP
  const logo = new THREE.Group();

  logo.add(artwork);

  logo.rotation.set(
    LOGO_CONFIG.initialRotationX,
    LOGO_CONFIG.initialRotationY,
    0
  );

  scene.add(logo);


  // =========================================
  // RESPONSIVE CAMERA
  // =========================================
  let viewDirty = true;

  function resize() {

    const width = stage.clientWidth;
    const height = stage.clientHeight;

    if (width <= 0 || height <= 0) return;

    const aspect = width / height;

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

  if (window.ResizeObserver) {

    resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(stage);

  } else {
    window.addEventListener('resize', resize);
  }

  resize();


  // =========================================
  // ROTATION STATE
  // =========================================
  let manuallyPaused = false;
  let dragging = false;
  let returningToBase = false;

  let activePointerId = null;

  let pointerX = 0;
  let pointerY = 0;

  let lastTime = null;


  function isRotationPaused() {
    return (
      manuallyPaused ||
      dragging ||
      resumeTimer !== null ||
      motionPreference.matches
    );
  }


  function updateControls() {

    const paused = isRotationPaused();

    if (pauseButton) {
      pauseButton.setAttribute(
        'aria-pressed',
        String(paused)
      );
    }

    if (motionLabel) {
      motionLabel.textContent = paused
        ? 'PLAY ROTATION'
        : 'PAUSE ROTATION';
    }

    if (motionIcon) {
      motionIcon.textContent = paused
        ? '▷'
        : 'Ⅱ';
    }
  }


  // =========================================
  // AUTO RESUME
  // =========================================
  function scheduleAutoResume() {

    clearResumeTimer();

    if (
      manuallyPaused ||
      motionPreference.matches ||
      failed
    ) {
      updateControls();
      return;
    }

    resumeTimer = window.setTimeout(() => {

      resumeTimer = null;

      returningToBase = true;

      updateControls();

    }, LOGO_CONFIG.resumeDelay);

    updateControls();
  }


  // =========================================
  // PAUSE / PLAY BUTTON
  // =========================================
  pauseButton?.addEventListener('click', () => {

    if (dragging || motionPreference.matches) return;

    const currentlyPaused = isRotationPaused();

    if (currentlyPaused) {

      manuallyPaused = false;

      clearResumeTimer();

      returningToBase = true;

    } else {

      manuallyPaused = true;

      clearResumeTimer();

      returningToBase = false;
    }

    updateControls();
  });


  // FRONT VIEW
  resetButton?.addEventListener('click', () => {

    clearResumeTimer();

    logo.rotation.set(0, 0, 0);

    manuallyPaused = true;
    returningToBase = false;

    viewDirty = true;

    updateControls();
  });


  // REDUCED MOTION
  function handleMotionPreferenceChange(event) {

    if (event.matches) {

      clearResumeTimer();

      returningToBase = false;

    } else if (!manuallyPaused && !dragging) {

      returningToBase = true;
    }

    updateControls();
  }

  if (motionPreference.addEventListener) {

    motionPreference.addEventListener(
      'change',
      handleMotionPreferenceChange
    );

  } else {

    motionPreference.addListener(
      handleMotionPreferenceChange
    );
  }


  // =========================================
  // DRAG CONTROLS
  // =========================================
  function beginDrag(event) {

    if (!event.isPrimary) return;

    if (
      event.pointerType === 'mouse' &&
      event.button !== 0
    ) {
      return;
    }

    clearResumeTimer();

    dragging = true;
    returningToBase = false;

    activePointerId = event.pointerId;

    pointerX = event.clientX;
    pointerY = event.clientY;

    try {
      stage.setPointerCapture(event.pointerId);

    } catch (error) {
      console.warn(
        'DONKEY: Pointer capture unavailable.',
        error
      );
    }

    stage.classList.add('is-dragging');

    updateControls();
  }

  function moveDrag(event) {
    if (
      !dragging ||
      event.pointerId !== activePointerId
    ) {
      return;
    }

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
  }


  function endDrag(event) {

    if (!dragging) return;

    if (
      event &&
      event.pointerId !== activePointerId
    ) {
      return;
    }

    dragging = false;
    activePointerId = null;

    stage.classList.remove('is-dragging');

    scheduleAutoResume();
  }


  stage.addEventListener('pointerdown', beginDrag);
  stage.addEventListener('pointermove', moveDrag);
  stage.addEventListener('pointerup', endDrag);
  stage.addEventListener('pointercancel', endDrag);
  stage.addEventListener('lostpointercapture', endDrag);

  window.addEventListener('blur', () => {
    if (dragging) {
      endDrag();
    }
  });


  // =========================================
  // ANIMATION FRAME
  // =========================================
  function frame(time) {

    const delta = lastTime === null
      ? 0
      : Math.min(
        (time - lastTime) / 1000,
        0.05
      );

    lastTime = time;

    const isAnimating =
      !manuallyPaused &&
      !dragging &&
      resumeTimer === null &&
      !motionPreference.matches &&
      !document.hidden;


    // AUTO ROTATION
    if (isAnimating) {

      logo.rotation.y +=
        delta *
        Math.PI * 2 /
        LOGO_CONFIG.secondsPerTurn;


      // RETURN TO HORIZONTAL POSITION
      if (returningToBase) {

        logo.rotation.x = THREE.MathUtils.damp(
          logo.rotation.x,
          LOGO_CONFIG.initialRotationX,
          LOGO_CONFIG.resumeTiltSpeed,
          delta
        );

        if (
          Math.abs(
            logo.rotation.x -
            LOGO_CONFIG.initialRotationX
          ) < 0.001
        ) {
          logo.rotation.x =
            LOGO_CONFIG.initialRotationX;

          returningToBase = false;
        }
      }
    }


    if (isAnimating || viewDirty) {

      renderer.render(scene, camera);

      viewDirty = false;
    }
  }

  ready = true;

  if (pauseButton) {
    pauseButton.disabled = false;
  }

  if (resetButton) {
    resetButton.disabled = false;
  }

  updateControls();

  renderer.render(scene, camera);

  stage.classList.add('is-ready');

  if (status) {
    status.textContent = '';
  }

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

  document.addEventListener(
    'visibilitychange',
    syncLoop
  );


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
      resumeDelay: LOGO_CONFIG.resumeDelay,
      reducedMotion: motionPreference.matches
    }
  );
}

startLogo().catch((error) => {
  showFallback(error);
});
