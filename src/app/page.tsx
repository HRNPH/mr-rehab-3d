/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  GLTFLoader,
  GLTFLoaderPlugin,
} from "three/addons/loaders/GLTFLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import {
  VRMLoaderPlugin,
  VRM,
  VRMExpressionPresetName,
  VRMHumanBoneName,
} from "@pixiv/three-vrm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type VRMContainer = HTMLDivElement & {
  loadVRM?: (url: string) => void;
  playAnimation?: (url: string) => void;
  setExpression?: (expression: string, weight?: number) => void;
};

// Animation control function type
type AnimationControl = {
  playAnimation: (animationUrl: string) => void;
  stopAnimation: () => void;
  setExpression: (expression: string, weight?: number) => void;
  resetExpressions: () => void;
};

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
      x: 0,
      y: 1.5 + adjust,
      z: 1.25,
    },
    lookAt: {
      x: 0,
      y: 1.3 + adjust,
      z: 0,
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

  // UI settings
  showControls: true,

  // Disable Camera Manual Rotation and Zoom
  disableCameraRotation: false,

  // Expression preset weights
  expressionWeight: 1.0,

  // Available expressions
  expressions: [
    "neutral",
    "happy",
    "angry",
    "sad",
    "relaxed",
    "surprised",
    "aa",
    "ih",
    "ou",
    "ee",
    "oh",
    "blink",
    "blinkLeft",
    "blinkRight",
    // Not Yet Working
    // "lookUp",
    // "lookDown",
    // "lookLeft",
    // "lookRight",
  ],
};

export default function VRMViewer() {
  const containerRef = useRef<VRMContainer>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [modelUrl, setModelUrl] = useState<string>("/models/daw.vrm");
  const [animationUrl, setAnimationUrl] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [showUI, setShowUI] = useState<boolean>(RENDER_CONFIG.showControls);
  const [activeExpression, setActiveExpression] = useState<string>("");

  // Animation control ref to allow access from outside
  const animationControlRef = useRef<AnimationControl | null>(null);

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
    if (RENDER_CONFIG.disableCameraRotation) {
      controls.enableRotate = false;
      controls.enableZoom = false;
      controls.enablePan = false;
    }

    // Lighting setup
    const hemiLight = new THREE.HemisphereLight(
      RENDER_CONFIG.hemisphereLight.skyColor,
      RENDER_CONFIG.hemisphereLight.groundColor,
      RENDER_CONFIG.hemisphereLight.intensity
    );
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

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

    const ambLight = new THREE.AmbientLight(
      RENDER_CONFIG.ambientLight.color,
      RENDER_CONFIG.ambientLight.intensity
    );
    scene.add(ambLight);

    // Room setup
    const floorGeometry = new THREE.PlaneGeometry(20, 20);
    const wallMaterial = new THREE.MeshStandardMaterial({
      color: RENDER_CONFIG.wallMaterial.color,
      side: THREE.DoubleSide,
      roughness: RENDER_CONFIG.wallMaterial.roughness,
      metalness: RENDER_CONFIG.wallMaterial.metalness,
    });

    const floor = new THREE.Mesh(floorGeometry, wallMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const backWall = new THREE.Mesh(floorGeometry, wallMaterial);
    backWall.position.z = -10;
    backWall.position.y = 10;
    backWall.receiveShadow = true;
    scene.add(backWall);

    const leftWall = new THREE.Mesh(floorGeometry, wallMaterial);
    leftWall.position.x = -10;
    leftWall.position.y = 10;
    leftWall.rotation.y = Math.PI / 2;
    leftWall.receiveShadow = true;
    scene.add(leftWall);

    const rightWall = new THREE.Mesh(floorGeometry, wallMaterial);
    rightWall.position.x = 10;
    rightWall.position.y = 10;
    rightWall.rotation.y = -Math.PI / 2;
    rightWall.receiveShadow = true;
    scene.add(rightWall);

    // Animation and model variables
    let currentVrm: VRM | null = null;
    let mixer: THREE.AnimationMixer | null = null;
    let activeAction: THREE.AnimationAction | null = null;

    const animate = (): void => {
      requestAnimationFrame(animate);

      const delta = clock.getDelta();

      // Update VRM animations
      if (currentVrm) {
        currentVrm.update(delta);
      }

      // Update animation mixer
      if (mixer) {
        mixer.update(delta);
      }

      controls.update();
      renderer.render(scene, camera);
    };

    const clock = new THREE.Clock();
    animate();

    // Function to load animation and apply it to current VRM
    const playAnimation = (animationUrl: string): void => {
      if (!currentVrm || !animationUrl) return;

      // Clear previous animation
      if (activeAction) {
        activeAction.fadeOut(0.5);
        activeAction = null;
      }

      // Determine file type
      const isGLTF =
        animationUrl.toLowerCase().endsWith(".glb") ||
        animationUrl.toLowerCase().endsWith(".gltf");
      const isFBX = animationUrl.toLowerCase().endsWith(".fbx");

      if (isFBX) {
        // Use FBXLoader for FBX files
        const loader = new FBXLoader();
        loader.load(
          animationUrl,
          (fbx) => {
            if (!currentVrm) return;

            console.log("FBX loaded:", fbx);

            // Create animation mixer if it doesn't exist
            if (!mixer) {
              mixer = new THREE.AnimationMixer(
                currentVrm.scene as unknown as THREE.Object3D
              );
            }

            // Get animations from FBX
            const animations = fbx.animations;
            if (!animations || animations.length === 0) {
              setError("No animation found in the FBX file");
              return;
            }

            console.log("FBX animations found:", animations.length);

            try {
              // Create a bone mapping between FBX and VRM
              const boneMapping: Record<
                string,
                THREE.Object3D<THREE.Object3DEventMap>
              > = {};

              // Map VRM humanoid bones to THREE.Object3D for animation
              if (currentVrm.humanoid) {
                // This maps standard humanoid bones to the actual VRM model bones
                Object.values(VRMHumanBoneName).forEach((boneName) => {
                  const vrmBone =
                    currentVrm!.humanoid!.getRawBoneNode(boneName);
                  if (!(vrmBone instanceof THREE.Object3D))
                    throw new Error("VRM bone is not an Object3D");

                  if (vrmBone) {
                    // Use the bone name as key for mapping
                    boneMapping[boneName] = vrmBone;

                    // Also try common naming patterns
                    const lowerName = boneName.toLowerCase();
                    boneMapping[lowerName] = vrmBone;

                    // Add common FBX naming conventions
                    if (lowerName.includes("spine")) {
                      boneMapping["spine"] = vrmBone;
                    }
                    if (lowerName.includes("neck")) {
                      boneMapping["neck"] = vrmBone;
                    }
                    if (lowerName.includes("head")) {
                      boneMapping["head"] = vrmBone;
                    }
                    if (lowerName.includes("lefthand")) {
                      boneMapping["hand_l"] = vrmBone;
                      boneMapping["left_hand"] = vrmBone;
                    }
                    if (lowerName.includes("righthand")) {
                      boneMapping["hand_r"] = vrmBone;
                      boneMapping["right_hand"] = vrmBone;
                    }
                    // Add more mappings as needed
                  }
                });
              }

              // Clone the animation to avoid modifying the original
              const clip = animations[0].clone();

              // Create a new clip with mapped tracks
              const tracks: THREE.KeyframeTrack[] = [];

              // Process each track in the animation
              clip.tracks.forEach((track) => {
                // Extract the bone name from the track name (format is usually "boneName.property")
                const trackSplit = track.name.split(".");
                if (trackSplit.length < 2) return;

                const fbxBoneName = trackSplit[0];
                const property = trackSplit[1];

                // Find corresponding VRM bone
                let vrmBone: THREE.Object3D | null = null;

                // Try direct mapping first
                if (boneMapping[fbxBoneName]) {
                  vrmBone = boneMapping[fbxBoneName];
                } else {
                  // Try to find closest match
                  const fbxNameLower = fbxBoneName.toLowerCase();
                  for (const [key, bone] of Object.entries(boneMapping)) {
                    if (
                      fbxNameLower.includes(key.toLowerCase()) ||
                      key.toLowerCase().includes(fbxNameLower)
                    ) {
                      vrmBone = bone;
                      break;
                    }
                  }
                }

                // If we found a matching bone, create a new track
                if (vrmBone) {
                  // Create a new track with the VRM bone name
                  const newTrackName = `${vrmBone.name}.${property}`;

                  // Clone the track with new name
                  let newTrack: THREE.KeyframeTrack;

                  if (track instanceof THREE.QuaternionKeyframeTrack) {
                    newTrack = new THREE.QuaternionKeyframeTrack(
                      newTrackName,
                      [...track.times],
                      [...track.values]
                    );
                  } else if (track instanceof THREE.VectorKeyframeTrack) {
                    newTrack = new THREE.VectorKeyframeTrack(
                      newTrackName,
                      [...track.times],
                      Array.from(track.values)
                    );
                  } else {
                    // Other track types
                    newTrack = new THREE.KeyframeTrack(
                      newTrackName,
                      [...track.times],
                      Array.from(track.values)
                    );
                  }

                  tracks.push(newTrack);
                }
              });

              // If we couldn't map any tracks, fall back to simple animation
              if (tracks.length === 0) {
                console.warn(
                  "No tracks could be mapped - falling back to simple animation"
                );

                // Create a simple animation that moves the model
                const duration = 2.0;
                const positionTrack = new THREE.VectorKeyframeTrack(
                  ".position",
                  [0, duration / 2, duration],
                  [0, 0, 0, 0, 0.1, 0, 0, 0, 0]
                );

                const customClip = new THREE.AnimationClip(
                  "fallback-motion",
                  duration,
                  [positionTrack]
                );

                const action = mixer.clipAction(customClip);
                action.clampWhenFinished = false;
                action.setLoop(THREE.LoopRepeat, Infinity);
                action.timeScale = 1.0;
                action.reset().fadeIn(0.5).play();
                activeAction = action;

                console.log("Playing fallback animation");
              } else {
                // Create new animation clip with mapped tracks
                const newClip = new THREE.AnimationClip(
                  "retargeted-animation",
                  clip.duration,
                  tracks
                );

                // Play the animation
                const action = mixer.clipAction(newClip);
                action.clampWhenFinished = false;
                action.setLoop(THREE.LoopRepeat, Infinity);
                action.timeScale = 1.0;
                action.reset().fadeIn(0.5).play();
                activeAction = action;

                console.log(
                  `Playing animation with ${tracks.length} mapped tracks`
                );
              }
            } catch (err) {
              console.error("Error applying animation:", err);
              setError(
                `Error applying animation: ${
                  err instanceof Error ? err.message : String(err)
                }`
              );
            }
          },
          (progress) => {
            console.log(
              "Animation loading progress:",
              (progress.loaded / progress.total) * 100,
              "%"
            );
          },
          (error) => {
            console.error("Error loading animation:", error);
            let message = "Unknown error";
            if (error instanceof Error) {
              message = error.message;
            } else if (
              typeof error === "object" &&
              error &&
              "message" in error
            ) {
              message = String((error as { message: unknown }).message);
            }
            setError(`Failed to load animation: ${message}`);
          }
        );
      } else {
        // Default to GLTFLoader for GLB/GLTF files
        const loader = new GLTFLoader();
        loader.load(
          animationUrl,
          (gltf) => {
            if (!currentVrm) return;

            // Create a new animation mixer if needed
            if (!mixer) {
              mixer = new THREE.AnimationMixer(
                currentVrm.scene as unknown as THREE.Object3D
              );
            }

            // Get animation
            const clip = gltf.animations[0];
            if (!clip) {
              console.error("No animation found in the file");
              return;
            }

            // Apply the animation
            const action = mixer.clipAction(clip);
            action.reset().fadeIn(0.5).play();
            activeAction = action;

            console.log(`Playing animation: ${animationUrl}`);
          },
          (progress) => {
            console.log(
              "Animation loading progress:",
              (progress.loaded / progress.total) * 100,
              "%"
            );
          },
          (error) => {
            console.error("Error loading animation:", error);
            let message = "Unknown error";
            if (error instanceof Error) {
              message = error.message;
            } else if (
              typeof error === "object" &&
              error &&
              "message" in error
            ) {
              message = String((error as { message: unknown }).message);
            }
            setError(`Failed to load animation: ${message}`);
          }
        );
      }
    };

    // Function to stop any playing animation
    const stopAnimation = (): void => {
      if (activeAction) {
        activeAction.fadeOut(0.5);
        activeAction = null;
      }
    };

    // Function to set VRM expression
    const setExpression = (
      expression: string,
      weight = RENDER_CONFIG.expressionWeight
    ): void => {
      if (!currentVrm || !currentVrm.expressionManager) {
        console.warn("No VRM loaded or no expression manager available");
        return;
      }

      // Reset all expressions first
      resetExpressions();

      // Set the new expression
      currentVrm.expressionManager.setValue(
        expression as VRMExpressionPresetName,
        weight
      );
      setActiveExpression(expression);

      console.log(`Set expression: ${expression} with weight ${weight}`);
    };

    // Function to reset all expressions
    const resetExpressions = (): void => {
      if (!currentVrm || !currentVrm.expressionManager) return;

      RENDER_CONFIG.expressions.forEach((expr) => {
        try {
          currentVrm!.expressionManager!.setValue(
            expr as VRMExpressionPresetName,
            0
          );
        } catch (e) {
          // Ignore if expression doesn't exist
        }
      });

      setActiveExpression("");
    };

    // Set up animation control ref
    animationControlRef.current = {
      playAnimation,
      stopAnimation,
      setExpression,
      resetExpressions,
    };

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

      // Clear previous model
      if (currentVrm) {
        scene.remove(currentVrm.scene as unknown as THREE.Object3D);
        currentVrm = null;
      }

      // Reset animation data
      mixer = null;
      activeAction = null;
      resetExpressions();

      // Load the model
      const loader = new GLTFLoader();
      // Register VRMLoaderPlugin for GLTFLoader
      loader.register(
        (parser) => new VRMLoaderPlugin(parser) as unknown as GLTFLoaderPlugin
      );

      loader.load(
        url,
        (gltf) => {
          const vrm = gltf.userData.vrm as VRM;
          if (vrm) {
            currentVrm = vrm;

            // Configure the VRM
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

            // Face camera
            vrm.scene.rotation.y = 0;

            // Add to scene
            if (!(vrm.scene instanceof THREE.Object3D))
              throw new Error("VRM scene is not an Object3D");

            scene.add(vrm.scene);

            // Center model
            const box = new THREE.Box3().setFromObject(vrm.scene);
            const center = box.getCenter(new THREE.Vector3());

            vrm.scene.position.x = vrm.scene.position.x - center.x;
            vrm.scene.position.z = vrm.scene.position.z - center.z;

            console.log("VRM loaded successfully", vrm);

            // Log available expressions
            if (vrm.expressionManager) {
              console.log(
                "Available expressions:",
                Object.keys(vrm.expressionManager.expressions)
              );
            }

            // Log bones for debugging
            console.log("VRM humanoid bones:", vrm.humanoid);

            // Print all bone nodes for mapping purposes
            const boneNodes: Record<string, string> = {};
            if (vrm.humanoid) {
              Object.keys(vrm.humanoid.humanBones).forEach((boneName) => {
                const bone = vrm.humanoid?.getRawBoneNode(
                  boneName as VRMHumanBoneName
                );
                if (bone) {
                  boneNodes[boneName] = bone.name;
                }
              });
              console.log("Available VRM bones for mapping:", boneNodes);
            }
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

    // Set up container methods
    const container = containerRef.current;
    if (container) {
      container.loadVRM = loadVRM;
      container.playAnimation = playAnimation;
      container.setExpression = setExpression;
    }

    // Load initial model if URL is provided
    if (modelUrl) {
      loadVRM(modelUrl);
    }

    // Store the current container ref for cleanup
    const cleanupContainer = container;

    // Cleanup function
    return () => {
      window.removeEventListener("resize", handleResize);
      renderer.dispose();
      scene.clear();
      controls.dispose();
      if (cleanupContainer?.childNodes.length) {
        cleanupContainer.removeChild(renderer.domElement);
      }
    };
  }, [modelUrl]);

  // Handle loading model
  const handleLoadModel = (): void => {
    if (!modelUrl) return;
    if (
      containerRef.current &&
      typeof containerRef.current.loadVRM === "function"
    ) {
      containerRef.current.loadVRM(modelUrl);
    }
  };

  // Handle playing animation
  const handlePlayAnimation = (): void => {
    if (!animationUrl) return;
    if (
      containerRef.current &&
      typeof containerRef.current.playAnimation === "function"
    ) {
      containerRef.current.playAnimation(animationUrl);
    }
  };

  // Handle stopping animation
  const handleStopAnimation = (): void => {
    if (animationControlRef.current) {
      animationControlRef.current.stopAnimation();
    }
  };

  // Handle expression change
  const handleSetExpression = (expression: string): void => {
    if (
      containerRef.current &&
      typeof containerRef.current.setExpression === "function"
    ) {
      containerRef.current.setExpression(expression);
    }
  };

  // Handle expression reset
  const handleResetExpressions = (): void => {
    if (animationControlRef.current) {
      animationControlRef.current.resetExpressions();
    }
  };

  return (
    <div className="flex flex-col w-full h-screen bg-white">
      {/* VRM Viewer Container */}
      <div ref={containerRef} className="w-full h-full relative" />

      {/* UI Toggle */}
      {/* <div className="absolute top-4 right-4">
        <div className="flex items-center space-x-2">
          <Switch id="show-ui" checked={showUI} onCheckedChange={setShowUI} />
          <Label htmlFor="show-ui">Controls</Label>
        </div>
      </div> */}

      {/* Controls Overlay */}
      {showUI && (
        <div className="absolute bottom-4 left-0 right-0 mx-auto p-4 flex flex-col items-center gap-2">
          <Card className="w-full max-w-lg bg-white bg-opacity-80">
            <CardContent className="p-4">
              <Tabs defaultValue="model">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="model">Model</TabsTrigger>
                  <TabsTrigger value="animation">Animation</TabsTrigger>
                  <TabsTrigger value="expression">Expression</TabsTrigger>
                </TabsList>

                <TabsContent value="model" className="mt-2">
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
                      {isLoading ? "Loading..." : "Load"}
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="animation" className="mt-2">
                  <div className="flex space-x-2">
                    <Input
                      placeholder="Enter animation URL (.fbx/.glb file path)"
                      value={animationUrl}
                      onChange={(e) => setAnimationUrl(e.target.value)}
                      disabled={isLoading}
                      className="flex-1"
                    />
                    <Button
                      onClick={handlePlayAnimation}
                      disabled={isLoading || !animationUrl}
                    >
                      Play
                    </Button>
                    <Button variant="outline" onClick={handleStopAnimation}>
                      Stop
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="expression" className="mt-2">
                  <div className="grid grid-cols-3 gap-2">
                    {RENDER_CONFIG.expressions.map((expr) => (
                      <Button
                        key={expr}
                        variant={
                          activeExpression === expr ? "default" : "outline"
                        }
                        size="sm"
                        onClick={() => handleSetExpression(expr)}
                        className="text-xs"
                      >
                        {expr}
                      </Button>
                    ))}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleResetExpressions}
                      className="col-span-3 mt-2"
                    >
                      Reset Expressions
                    </Button>
                  </div>
                </TabsContent>
              </Tabs>

              {error && <p className="text-red-500 mt-2 text-sm">{error}</p>}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
