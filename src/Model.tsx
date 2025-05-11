import { useGLTF, Clone } from "@react-three/drei";
import { useEffect, useRef, forwardRef } from "react";
import { useFrame } from "@react-three/fiber";
import type { Vector3Tuple } from "three";
import * as THREE from "three";

interface ModelProps {
  position?: Vector3Tuple;
  scale?: Vector3Tuple;
  rotation?: Vector3Tuple;
  speed?: number;
  modelRefs: React.RefObject<THREE.Group | null>[];
  modelLength: number;
}

const Model = forwardRef<THREE.Group, ModelProps>(
  (
    {
      position = [0, 0, 0],
      scale = [1, 1, 1],
      rotation = [0, 0, 0],
      speed = 0.5,
      modelRefs,
      modelLength,
    },
    ref
  ) => {
    const { scene } = useGLTF("/scene.glb");
    const lastResetTime = useRef(0);

    useEffect(() => {
      scene.traverse((child) => {
        if ("isMesh" in child) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }, [scene]);

    useFrame((_, delta) => {
      if (ref && "current" in ref && ref.current) {
        ref.current.position.z -= speed * delta;

        // When model goes too far, reset its position
        if (ref.current.position.z < -20) {
          const currentTime = performance.now();
          // Prevent multiple resets within 100ms
          if (currentTime - lastResetTime.current < 100) return;
          lastResetTime.current = currentTime;

          // Find the highest z position among all models
          let highestZ = -Infinity;
          let secondHighestZ = -Infinity;

          modelRefs.forEach((modelRef) => {
            if (modelRef.current) {
              const z = modelRef.current.position.z;
              if (z > highestZ) {
                secondHighestZ = highestZ;
                highestZ = z;
              } else if (z > secondHighestZ) {
                secondHighestZ = z;
              }
            }
          });

          // Calculate the target position
          let targetZ = highestZ + modelLength;

          // If we have a second highest position, verify the spacing
          if (secondHighestZ !== -Infinity) {
            const currentSpacing = highestZ - secondHighestZ;
            // If spacing is off by more than 0.1 units, adjust the target
            if (Math.abs(currentSpacing - modelLength) > 0.1) {
              targetZ = secondHighestZ + modelLength;
            }
          }

          // Ensure the new position is at least modelLength away from the highest
          if (highestZ - targetZ < modelLength) {
            targetZ = highestZ + modelLength;
          }

          ref.current.position.z = targetZ;
        }
      }
    });

    return (
      <Clone
        ref={ref}
        object={scene}
        position={position}
        scale={scale}
        rotation={rotation}
      />
    );
  }
);

Model.displayName = "Model";

export default Model;
