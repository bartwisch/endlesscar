import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame } from "@react-three/fiber";
import { useGLTF, useAnimations } from "@react-three/drei";

export default function Car({
  position = [0, 0, 0],
  rotation = [0, 0, 0],
  scale = 1,
  onCollision = () => {},
}) {
  const group = useRef<THREE.Group>(null);
  const [carPosition, setCarPosition] = useState([...position]);
  const [carRotation, setCarRotation] = useState([...rotation]);
  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [movement, setMovement] = useState({
    left: false,
    right: false,
    jump: false,
  });
  const targetRotationRef = useRef(rotation[1]);

  // Jumping state
  const [isJumping, setIsJumping] = useState(false);
  const [jumpHeight, setJumpHeight] = useState(0);
  const jumpVelocityRef = useRef(0);
  const initialYPosition = useRef(position[1]);

  // Collision detection
  const carBoundingBox = useRef(new THREE.Box3());

  // Create refs for spotlight targets
  const leftTargetRef = useRef<THREE.Object3D>(null);
  const rightTargetRef = useRef<THREE.Object3D>(null);

  // Load the GLB file from the public folder
  const { scene, animations } = useGLTF("/car.glb");
  const { actions, names, mixer } = useAnimations(animations, group);

  // Add/remove jumping class for simple collision detection
  useEffect(() => {
    const container = document.querySelector(".canvas-container");
    if (container) {
      if (isJumping) {
        container.classList.add("car-jumping");
      } else {
        container.classList.remove("car-jumping");
      }
    }
  }, [isJumping]);

  // Stop animations when jumping
  useEffect(() => {
    if (isJumping) {
      // Pause all animations when jumping
      Object.values(actions).forEach((action) => {
        if (action) {
          action.paused = true;
        }
      });
    } else {
      // Resume animations when back on the ground
      Object.values(actions).forEach((action) => {
        if (action) {
          action.paused = false;
        }
      });
    }
  }, [isJumping, actions]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Reversed controls (right now moves left, left moves right)
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") {
        setMovement((prev) => ({ ...prev, right: true }));
      }
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") {
        setMovement((prev) => ({ ...prev, left: true }));
      }

      // Jump controls
      if (
        e.key === "w" ||
        e.key === "W" ||
        e.key === " " ||
        e.key === "PageUp"
      ) {
        if (!isJumping) {
          setIsJumping(true);
          jumpVelocityRef.current = 0.2; // Increased from 0.2 for a stronger initial jump
          setMovement((prev) => ({ ...prev, jump: true }));
        }
      }

      // Play animation when any movement key is pressed
      if (
        !animationPlaying &&
        (e.key === "a" ||
          e.key === "A" ||
          e.key === "d" ||
          e.key === "D" ||
          e.key === "ArrowLeft" ||
          e.key === "ArrowRight" ||
          e.key === "w" ||
          e.key === "W" ||
          e.key === " " ||
          e.key === "PageUp")
      ) {
        playAnimation();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "a" || e.key === "A" || e.key === "ArrowLeft") {
        setMovement((prev) => ({ ...prev, right: false }));
      }
      if (e.key === "d" || e.key === "D" || e.key === "ArrowRight") {
        setMovement((prev) => ({ ...prev, left: false }));
      }
      if (
        e.key === "w" ||
        e.key === "W" ||
        e.key === " " ||
        e.key === "PageUp"
      ) {
        setMovement((prev) => ({ ...prev, jump: false }));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [animationPlaying, isJumping]);

  // Initialize the model and animations
  useEffect(() => {
    if (scene) {
      // Apply materials and shadows to the model
      scene.traverse((node) => {
        if ("isMesh" in node && node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });

      // Initialize bounding box
      if (group.current) {
        carBoundingBox.current.setFromObject(group.current);
      }

      // Log available animations for debugging
      console.log("Available animations:", names);

      // Play all animations automatically on load
      playAnimation();
    }

    // Initial car position and rotation
    setCarPosition([...position]);
    setCarRotation([...rotation]);
    targetRotationRef.current = rotation[1];
    initialYPosition.current = position[1];

    return () => {
      // Cleanup animations
      Object.values(actions).forEach((action) => action?.reset().stop());
    };
  }, [scene, animations, actions, names, position, rotation]);

  // Handle smooth movement and rotation
  useFrame((state, delta) => {
    // Update the animation mixer on each frame
    if (mixer) mixer.update(delta);

    // Movement speed and rotation factors
    const speed = 0.07; // Horizontal speed
    const rotationSpeed = 0.03; // Reduced from 0.05 for smoother rotation
    const maxRotationAngle = 0.15; // Reduced from 0.25 (about 8.5 degrees instead of 14)
    const gravity = 0.008; // Reduced from 0.01 for a longer jump arc
    const maxJumpHeight = 3.0; // Increased from 2.5 for a higher maximum jump

    // Calculate new position and rotation
    let moved = false;
    let newPosition = [...carPosition];
    let targetYRotation = carRotation[1];

    // Set the rotation limits (original rotation ± max degrees in radians)
    const baseRotation = rotation[1];
    const maxRotationDegrees = 0.2; // Reduced from 0.35 (about 11.5 degrees instead of 20)
    const rotationUpperLimit = baseRotation + maxRotationDegrees;
    const rotationLowerLimit = baseRotation - maxRotationDegrees;

    if (movement.left) {
      newPosition[0] -= speed;
      targetYRotation = carRotation[1] - maxRotationAngle; // Reversed rotation direction
      moved = true;
    }

    if (movement.right) {
      newPosition[0] += speed;
      targetYRotation = carRotation[1] + maxRotationAngle; // Reversed rotation direction
      moved = true;
    }

    // Handle jumping physics
    if (isJumping) {
      // Apply velocity and gravity
      jumpVelocityRef.current -= gravity;
      setJumpHeight((prev) => prev + jumpVelocityRef.current);

      // Update Y position
      newPosition[1] = initialYPosition.current + jumpHeight;

      // Check if we've landed
      if (jumpHeight <= 0 && jumpVelocityRef.current < 0) {
        setIsJumping(false);
        setJumpHeight(0);
        jumpVelocityRef.current = 0;
        newPosition[1] = initialYPosition.current;
      }

      // Limit maximum jump height
      if (jumpHeight > maxJumpHeight) {
        setJumpHeight(maxJumpHeight);
        jumpVelocityRef.current = 0; // Start falling
      }

      moved = true;
    }

    // Ensure the rotation stays within limits
    targetYRotation = Math.min(
      Math.max(targetYRotation, rotationLowerLimit),
      rotationUpperLimit
    );

    // If not moving, return to neutral rotation
    if (!movement.left && !movement.right) {
      targetYRotation = rotation[1]; // Original rotation
    }

    // Calculate rotation interpolation factor - faster when changing direction
    let rotationFactor = rotationSpeed;

    // Detect direction change more aggressively
    const isChangingDirection =
      (movement.left && targetRotationRef.current < baseRotation) ||
      (movement.right && targetRotationRef.current > baseRotation) ||
      // Also check if we're already tilted in the opposite direction
      (movement.left && carRotation[1] > baseRotation) ||
      (movement.right && carRotation[1] < baseRotation);

    if (isChangingDirection) {
      rotationFactor = 0.25; // Reduced from 0.6 for less abrupt transition

      // For extreme direction changes, make it somewhat faster but still smooth
      if (
        (movement.left && carRotation[1] > baseRotation + 0.2) ||
        (movement.right && carRotation[1] < baseRotation - 0.2)
      ) {
        rotationFactor = 0.4; // Reduced from 0.8 for smoother changes
      }
    }

    // Apply rotation with appropriate factor
    targetRotationRef.current = THREE.MathUtils.lerp(
      targetRotationRef.current,
      targetYRotation,
      rotationFactor
    );

    // Update state
    setCarPosition(newPosition);
    setCarRotation([carRotation[0], targetRotationRef.current, carRotation[2]]);

    // Update spotlight target positions to be relative to the car's position
    // This ensures the headlights always point forward from the car's perspective
    if (leftTargetRef.current && rightTargetRef.current) {
      // Calculate the forward vector based on car's rotation
      const forwardX = Math.sin(carRotation[1]) * 10;
      const forwardZ = Math.cos(carRotation[1]) * 10;

      // Position the targets in front of the car, maintaining their relative left/right offset
      leftTargetRef.current.position.set(
        carPosition[0] - 0.8 + forwardX,
        carPosition[1] + 0.3,
        carPosition[2] + forwardZ
      );

      rightTargetRef.current.position.set(
        carPosition[0] + 0.8 + forwardX,
        carPosition[1] + 0.3,
        carPosition[2] + forwardZ
      );
    }

    // Update car bounding box for collision detection
    if (group.current) {
      carBoundingBox.current.setFromObject(group.current);

      // Make the bounding box slightly smaller for more accurate collisions
      carBoundingBox.current.min.x += 0.3;
      carBoundingBox.current.max.x -= 0.3;
      carBoundingBox.current.min.z += 0.3;
      carBoundingBox.current.max.z -= 0.3;

      // Check for collision with obstacles
      // We need to get all obstacles in the scene and check for collision
      const obstacles: THREE.Object3D[] = [];
      state.scene.traverse((child) => {
        if (child.userData && child.userData.isObstacle === true) {
          obstacles.push(child);
        }
      });

      console.log(`Found ${obstacles.length} obstacles to check`);

      for (const obstacle of obstacles) {
        // Direct access to the bounding box stored on the obstacle userData
        if (obstacle.userData && obstacle.userData.boundingBox) {
          const obstacleBoundingBox = obstacle.userData.boundingBox;

          // Debug logging
          console.log("Checking collision with obstacle at", obstacle.position);

          // If car is not jumping and there's a collision
          if (
            !isJumping &&
            carBoundingBox.current.intersectsBox(obstacleBoundingBox)
          ) {
            console.log("COLLISION DETECTED!");
            // Trigger game over
            onCollision();
            break;
          }
        }
      }
    }
  });

  // Play animation
  const playAnimation = () => {
    if (names && names.length > 0) {
      setAnimationPlaying(true);

      // Play all animations continuously - one of them should move the wheels
      names.forEach((name) => {
        const action = actions[name];
        if (action) {
          // Set animation to loop indefinitely
          action.reset().play().setLoop(THREE.LoopRepeat, Infinity);
          console.log(`Playing animation: ${name}`);
        }
      });
    }
  };

  // Debug function
  const debugModel = () => {
    console.log("Scene structure:", scene);
    console.log("Animations:", animations);
  };

  return (
    <group
      ref={group}
      position={[carPosition[0], carPosition[1], carPosition[2]]}
      rotation={[carRotation[0], carRotation[1], carRotation[2]]}
      scale={scale}
      onClick={debugModel}
      dispose={null}
      name="car"
      userData={{
        boundingBox: carBoundingBox.current,
        isJumping: isJumping,
      }}
    >
      <primitive object={scene} />

      {/* Spotlight targets */}
      <object3D ref={leftTargetRef} position={[-0.8, 0.3, -10]} />
      <object3D ref={rightTargetRef} position={[0.8, 0.3, -10]} />

      {/* Left headlight */}
      {/* <spotLight
        position={[-0.7, 0.5, 1.5]} // Left side, slightly elevated, front of car
        angle={0.6} // Wider beam spread
        penumbra={0.3} // Softer edges
        intensity={100.5}
        color="#f0f0ff" // Slightly blue-ish white
        castShadow
        target={leftTargetRef.current}
      />
      
      <spotLight
        position={[0.7, 0.5, 1.5]} // Right side, slightly elevated, front of car
        angle={0.6} // Wider beam spread
        penumbra={0.3} // Softer edges
        intensity={100.5}
        color="#f0f0ff" // Slightly blue-ish white
        castShadow
        target={rightTargetRef.current}
      /> */}
    </group>
  );
}

// Preload the model to improve performance
useGLTF.preload("/car.glb");
