"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRM } from "@pixiv/three-vrm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

type VRMContainer = HTMLDivElement & { loadVRM?: (url: string) => void };

// Centralized configuration
const adjust = 0;
const hexToColor = (hex: string): number => {
  return parseInt(hex.replace("#", "0x"), 16);
};
const RENDER_CONFIG = {
  // Scene settings
  backgroundColor: 0xffffff,

  // Camera settings
  camera: {
    fov: 45,
    near: 0.1,
    far: 100,
    position: {
      x: 0, // Left/right of model (- is left, + is right)
      y: 1.5 + adjust, // Height (up/down)
      z: 1.25, // Distance from model (higher = further away)
    },
    lookAt: {
      x: 0, // Where camera looks horizontally
      y: 1.3 + adjust, // Where camera looks vertically
      z: 0, // Where camera looks depth-wise
    },
  },

  // Lighting settings
  hemisphereLight: {
    skyColor: hexToColor("#ffffff"),
    groundColor: hexToColor("#ffffff"),
    intensity: 1,
  },
  directionalLight: {
    color: hexToColor("#ffffff"),
    intensity: 0.9,
    position: {
      x: -1,
      y: 1.75,
      z: 1,
    },
    shadowMapSize: 2048,
  },
  ambientLight: {
    color: hexToColor("#e0f8f5"),
    intensity: 0.85,
  },

  // Material settings
  wallMaterial: {
    color: hexToColor("#ccfef7"),
    roughness: 0.8,
    metalness: 0.2,
  },
  // Shadow settings
  shadowBias: -0.0005,
};

export default function VRMViewer() {
  const containerRef = useRef<VRMContainer>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modelUrl, setModelUrl] = useState<string>("/models/daw.vrm");
  const [error, setError] = useState<string>("");

  // Setup and render the scene
  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(RENDER_CONFIG.backgroundColor);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      RENDER_CONFIG.camera.fov,
      window.innerWidth / window.innerHeight,
      RENDER_CONFIG.camera.near,
      RENDER_CONFIG.camera.far
    );
    camera.position.set(
      RENDER_CONFIG.camera.position.x,
      RENDER_CONFIG.camera.position.y,
      RENDER_CONFIG.camera.position.z
    );
    camera.lookAt(
      RENDER_CONFIG.camera.lookAt.x,
      RENDER_CONFIG.camera.lookAt.y,
      RENDER_CONFIG.camera.lookAt.z
    );

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    containerRef.current.innerHTML = "";
    containerRef.current.appendChild(renderer.domElement);

    // Controls setup
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1;
    controls.maxDistance = 10;
    controls.target.set(
      RENDER_CONFIG.camera.lookAt.x,
      RENDER_CONFIG.camera.lookAt.y,
      RENDER_CONFIG.camera.lookAt.z
    );

    // Disable manual rotation and zoom
    controls.enableRotate = false;
    controls.enableZoom = false;
    controls.enablePan = false;

    // Hemisphere light
    const hemiLight = new THREE.HemisphereLight(
      RENDER_CONFIG.hemisphereLight.skyColor,
      RENDER_CONFIG.hemisphereLight.groundColor,
      RENDER_CONFIG.hemisphereLight.intensity
    );
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // Directional light
    const dirLight = new THREE.DirectionalLight(
      RENDER_CONFIG.directionalLight.color,
      RENDER_CONFIG.directionalLight.intensity
    );
    dirLight.position.set(
      RENDER_CONFIG.directionalLight.position.x,
      RENDER_CONFIG.directionalLight.position.y,
      RENDER_CONFIG.directionalLight.position.z
    );
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width =
      RENDER_CONFIG.directionalLight.shadowMapSize;
    dirLight.shadow.mapSize.height =
      RENDER_CONFIG.directionalLight.shadowMapSize;
    dirLight.shadow.camera.near = 0.5;
    dirLight.shadow.camera.far = 50;
    dirLight.shadow.camera.left = -5;
    dirLight.shadow.camera.right = 5;
    dirLight.shadow.camera.top = 5;
    dirLight.shadow.camera.bottom = -5;
    dirLight.shadow.bias = RENDER_CONFIG.shadowBias;
    scene.add(dirLight);

    // Ambient light
    const ambLight = new THREE.AmbientLight(
      RENDER_CONFIG.ambientLight.color,
      RENDER_CONFIG.ambientLight.intensity
    );
    scene.add(ambLight);

    // White room setup
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: RENDER_CONFIG.wallMaterial.color,
      side: THREE.DoubleSide,
      roughness: RENDER_CONFIG.wallMaterial.roughness,
      metalness: RENDER_CONFIG.wallMaterial.metalness,
    });

    // Floor with shadow receiving
    const floor = new THREE.Mesh(floorGeometry, wallMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Back wall
    const backWall = new THREE.Mesh(floorGeometry, wallMaterial);
    backWall.position.z = -10;
    backWall.position.y = 10;
    backWall.receiveShadow = true;
    scene.add(backWall);

    // Left wall
    const leftWall = new THREE.Mesh(floorGeometry, wallMaterial);
    leftWall.position.x = -10;
    leftWall.position.y = 10;
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    // Right wall
    const rightWall = new THREE.Mesh(floorGeometry, wallMaterial);
    rightWall.position.x = 10;
    rightWall.position.y = 10;
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Animation loop
    let currentVrm: VRM | null = null;

    const animate = (): void => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);

      // Update VRM animations if needed
      if (currentVrm) {
        currentVrm.update(clock.getDelta());
      }
    };

    const clock = new THREE.Clock();
    animate();

    // Handle window resize
    const handleResize = (): void => {
      if (!containerRef.current) return;
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener("resize", handleResize);

    // Load VRM model function
    const loadVRM = (url: string): void => {
      if (!url) return;

      setIsLoading(true);
      setError("");

      // Clear previous model if it exists
      if (currentVrm) {
        scene.remove(currentVrm.scene as unknown as THREE.Object3D);
        currentVrm = null;
      }

      // Setup VRM loader
      const loader = new GLTFLoader();
      loader.register(
        (parser) => new VRMLoaderPlugin(parser) as unknown as any
      );

      loader.load(
        url,
        (gltf) => {
          const vrm = gltf.userData.vrm as VRM;
          if (vrm) {
            // VRM specific setup
            currentVrm = vrm;

            // Configure lighting on the VRM
            vrm.scene.traverse((object) => {
              if (object instanceof THREE.Mesh) {
                object.castShadow = true;
                object.receiveShadow = true;

                if (object.material) {
                  if (Array.isArray(object.material)) {
                    object.material.forEach((mat) => {
                      if (mat.isMeshStandardMaterial) {
                        mat.envMapIntensity = 1;
                      }
                    });
                  } else if (object.material.isMeshStandardMaterial) {
                    object.material.envMapIntensity = 1;
                  }
                }
              }
            });

            // Reset rotation to face camera
            vrm.scene.rotation.y = 0;

            // Add to scene
            if (!(vrm.scene instanceof THREE.Object3D))
              throw new Error("VRM scene is not an Object3D");

            scene.add(vrm.scene);

            // Center model at origin
            const box = new THREE.Box3().setFromObject(vrm.scene);
            const center = box.getCenter(new THREE.Vector3());

            vrm.scene.position.x = vrm.scene.position.x - center.x;
            vrm.scene.position.z = vrm.scene.position.z - center.z;

            // No need to adjust camera - keep it at the configured position
          } else {
            setError("Failed to load VRM model: No VRM data found");
          }
          setIsLoading(false);
        },
        (progress) => {
          console.log(
            "Loading progress:",
            (progress.loaded / progress.total) * 100,
            "%"
          );
        },
        (error: unknown) => {
          let message = "Unknown error";
          if (error instanceof Error) {
            message = error.message;
          } else if (typeof error === "object" && error && "message" in error) {
            message = String((error as { message: unknown }).message);
          }
          console.error("Error loading VRM:", error);
          setError(`Failed to load VRM model: ${message}`);
          setIsLoading(false);
        }
      );
    };

    // Function to handle model loading
    const handleLoadModel = (url: string): void => {
      loadVRM(url);
    };

    const container = containerRef.current;
    if (container) {
      container.loadVRM = handleLoadModel;
    }

    // Load initial model if URL is provided
    if (modelUrl) {
      handleLoadModel(modelUrl);
    }

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      scene.clear();
      controls.dispose();
      if (containerRef.current?.childNodes.length) {
        containerRef.current.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Handle loading model from URL
  const handleLoadModel = (): void => {
    if (!modelUrl) return;
    if (
      containerRef.current &&
      typeof containerRef.current.loadVRM === "function"
    ) {
      containerRef.current.loadVRM(modelUrl);
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-white">
      {/* VRM Viewer Container */}
      <div ref={containerRef} className="w-full h-full relative" />

      {/* Controls Overlay */}
      <div className="absolute bottom-4 left-0 right-0 mx-auto p-4 flex justify-center">
        <Card className="w-full max-w-lg bg-white bg-opacity-80">
          <CardContent className="p-4">
            <div className="flex space-x-2">
              <Input
                placeholder="Enter VRM model URL"
                value={modelUrl}
                onChange={(e) => setModelUrl(e.target.value)}
                disabled={isLoading}
                className="flex-1"
              />
              <Button
                onClick={handleLoadModel}
                disabled={isLoading || !modelUrl}
              >
                {isLoading ? "Loading..." : "Load Model"}
              </Button>
            </div>

            {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
