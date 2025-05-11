import { useFrame } from "@react-three/fiber";
import { useGLTF, Clone } from "@react-three/drei";
import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

interface ObstacleProps {
  position?: [number, number, number];
  speed: number;
  onCollision: () => void;
}

const OBSTACLE_PATHS = ["/obstacle1.glb", "/obstacle2.glb", "/obstacle3.glb"];

// Preload all obstacles
OBSTACLE_PATHS.forEach((path) => useGLTF.preload(path));

interface ObstacleInstanceProps {
  path: string;
  position: [number, number, number];
  scale: [number, number, number];
  speed: number;
  onRemove: () => void;
  checkCollision: (obstacleZ: number) => void;
}

// Single obstacle instance
function ObstacleInstance({
  path,
  position,
  scale,
  speed,
  onRemove,
  checkCollision,
}: ObstacleInstanceProps) {
  const ref = useRef<THREE.Group>(null);
  const { scene } = useGLTF(path);
  const hasPassed = useRef(false);

  useEffect(() => {
    if (scene) {
      scene.traverse((child) => {
        if ("isMesh" in child) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
    }
  }, [scene]);

  useFrame((_, delta) => {
    if (ref.current) {
      // Move obstacle at the same speed as the road
      ref.current.position.z -= speed * delta;

      // Simple collision detection - check if obstacle is near car position (which is at z=0)
      // Only check once as it passes the car
      if (
        ref.current.position.z < 2 &&
        ref.current.position.z > -2 &&
        !hasPassed.current
      ) {
        checkCollision(ref.current.position.z);
        hasPassed.current = true;
      }

      // Remove when passed the player
      if (ref.current.position.z < -20) {
        onRemove();
      }
    }
  });

  return <Clone ref={ref} object={scene} position={position} scale={scale} />;
}

export default function Obstacles({
  position = [0, 0, 0],
  speed,
  onCollision,
}: ObstacleProps) {
  const [obstacles, setObstacles] = useState<
    Array<{
      id: number;
      path: string;
      position: [number, number, number];
      scale: [number, number, number];
    }>
  >([]);

  const lastSpawnTime = useRef(0);
  const nextObstacleId = useRef(0);
  const spawnDistance = useRef(100); // Initial spawn distance
  const fixedInterval = useRef(3500); // Fixed interval between obstacles (3.5 seconds)

  // Generate a random obstacle
  const generateRandomObstacle = () => {
    const obstacleIndex = Math.floor(Math.random() * OBSTACLE_PATHS.length);
    const path = OBSTACLE_PATHS[obstacleIndex];

    // Generate random scale between 0.3 and 0.5
    const randomScale = 0.3 + Math.random() * 0.2;
    const scale: [number, number, number] = [
      randomScale,
      randomScale,
      randomScale,
    ];

    return {
      id: nextObstacleId.current++,
      path,
      position: [0, 0, spawnDistance.current] as [number, number, number],
      scale,
    };
  };

  // Remove an obstacle by ID
  const removeObstacle = (id: number) => {
    setObstacles((prev) => prev.filter((obs) => obs.id !== id));
  };

  // Simple collision check based on car's jump state
  const checkCollision = (obstacleZ: number) => {
    // Get car's jump state from document
    const carElement = document.querySelector(".car-jumping");
    const isJumping = carElement !== null;

    // If car is not jumping and obstacle is passing through, trigger collision
    if (!isJumping && obstacleZ < 1 && obstacleZ > -1) {
      console.log("Collision detected: Car hit obstacle!");
      onCollision();
    }
  };

  // Spawn obstacles over time
  useFrame(() => {
    const now = performance.now();

    // Use fixed interval for consistent gameplay
    if (now - lastSpawnTime.current > fixedInterval.current) {
      lastSpawnTime.current = now;
      spawnDistance.current = 100; // Fixed distance
      setObstacles((prev) => [...prev, generateRandomObstacle()]);
    }
  });

  return (
    <group position={position}>
      {obstacles.map((obstacle) => (
        <ObstacleInstance
          key={obstacle.id}
          path={obstacle.path}
          position={obstacle.position}
          scale={obstacle.scale}
          speed={speed}
          onRemove={() => removeObstacle(obstacle.id)}
          checkCollision={checkCollision}
        />
      ))}
    </group>
  );
}
