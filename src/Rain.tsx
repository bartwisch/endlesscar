import { useRef, useMemo, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTexture } from "@react-three/drei";

interface RainProps {
  count?: number;
  speed?: number;
  opacity?: number;
  fadeDistance?: number;
  areaWidth?: number;
  areaDepth?: number;
  color?: string;
}

export default function Rain({
  count = 5000,
  speed = 15,
  opacity = 0.5,
  fadeDistance = 30,
  areaWidth = 40,
  areaDepth = 30,
  color = "#8eb1e5",
}: RainProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const fakeDropTexture = useTexture("/api/placeholder/4/32"); // Will be replaced with actual raindrop texture in production

  // Rain positions and velocities
  const rainData = useMemo(() => {
    const halfWidth = areaWidth / 2;
    const data = [];

    for (let i = 0; i < count; i++) {
      // Position within the specified area (x: -20 to 20, z: 0 to 30)
      const x = Math.random() * areaWidth - halfWidth; // -20 to 20
      const y = Math.random() * 30 + 10; // Start above camera
      const z = Math.random() * areaDepth; // 0 to 30

      // Velocities with slight variation
      const velocity = -(speed + Math.random() * 5);

      // Slightly tilt raindrops
      const tiltX = -0.1 - Math.random() * 0.2;

      // Slight variations in size
      const size = 0.03 + Math.random() * 0.03;

      data.push({ position: [x, y, z], velocity, tiltX, size });
    }
    return data;
  }, [count, areaWidth, areaDepth, speed]);

  // Set initial positions
  useEffect(() => {
    if (!meshRef.current) return;

    rainData.forEach((data, i) => {
      const [x, y, z] = data.position;
      dummy.position.set(x, y, z);

      // Apply raindrop rotation
      dummy.rotation.set(data.tiltX, 0, 0);

      // Apply raindrop scale
      dummy.scale.set(0.05, data.size, 0.05);

      dummy.updateMatrix();
      meshRef.current?.setMatrixAt(i, dummy.matrix);
    });

    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [rainData]);

  // Animation loop
  useFrame((state, delta) => {
    if (!meshRef.current) return;

    for (let i = 0; i < count; i++) {
      meshRef.current.getMatrixAt(i, dummy.matrix);
      dummy.position.setFromMatrixPosition(dummy.matrix);

      // Move raindrops down based on velocity and delta time
      dummy.position.y += rainData[i].velocity * delta;

      // Reset position if below ground
      if (dummy.position.y < -2) {
        dummy.position.y = 30 + Math.random() * 10;
        dummy.position.x = Math.random() * areaWidth - areaWidth / 2;
        dummy.position.z = Math.random() * areaDepth;
      }

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  // Instanced material with custom shader
  const rainMaterial = useMemo(() => {
    return new THREE.ShaderMaterial({
      transparent: true,
      uniforms: {
        uTime: { value: 0 },
        uTexture: { value: fakeDropTexture },
        uColor: { value: new THREE.Color(color) },
        uOpacity: { value: opacity },
        uFadeDistance: { value: fadeDistance },
      },
      vertexShader: `
        uniform float uTime;
        uniform float uFadeDistance;
        varying float vVisibility;
        
        void main() {
          vec4 modelPosition = modelMatrix * vec4(position, 1.0);
          vec4 viewPosition = viewMatrix * modelPosition;
          vec4 projectionPosition = projectionMatrix * viewPosition;
          
          gl_Position = projectionPosition;
          
          // Calculate distance fade
          float distance = length(viewPosition.xyz);
          vVisibility = clamp(1.0 - distance / uFadeDistance, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D uTexture;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying float vVisibility;
        
        void main() {
          vec2 uv = gl_PointCoord;
          vec4 textureColor = texture2D(uTexture, uv);
          
          // Apply raindrop color
          gl_FragColor = vec4(uColor, textureColor.a * uOpacity * vVisibility);
        }
      `,
    });
  }, [fakeDropTexture, color, opacity, fadeDistance]);

  // Update time uniform for animation
  useFrame(({ clock }) => {
    rainMaterial.uniforms.uTime.value = clock.getElapsedTime();
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <boxGeometry args={[1, 1, 1]} />
      <primitive object={rainMaterial} attach="material" />
    </instancedMesh>
  );
}

// Rain Splash Effect Component (optional, can be added to your scene)
export function RainSplashes({
  count = 100,
  floorY = 0,
  areaWidth = 40,
  areaDepth = 30,
}: {
  count?: number;
  floorY?: number;
  areaWidth?: number;
  areaDepth?: number;
}) {
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Splash data with lifecycle
  const splashData = useMemo(() => {
    const halfWidth = areaWidth / 2;
    return Array.from({ length: count }, () => ({
      position: [
        Math.random() * areaWidth - halfWidth,
        floorY + 0.01, // Slightly above floor to avoid z-fighting
        Math.random() * areaDepth,
      ],
      scale: 0,
      opacity: 0,
      targetScale: 0.5 + Math.random() * 1,
      lifespan: 0.5 + Math.random() * 0.5,
      age: Math.random() * 2, // Stagger initial splash times
    }));
  }, [count, floorY, areaWidth, areaDepth]);

  useFrame((state, delta) => {
    if (!meshRef.current) return;

    for (let i = 0; i < count; i++) {
      const splash = splashData[i];

      // Update age
      splash.age += delta;

      if (splash.age >= splash.lifespan) {
        // Reset splash
        splash.position[0] = Math.random() * areaWidth - areaWidth / 2;
        splash.position[2] = Math.random() * areaDepth;
        splash.targetScale = 0.5 + Math.random() * 1;
        splash.lifespan = 0.5 + Math.random() * 0.5;
        splash.age = 0;
        splash.scale = 0;
        splash.opacity = 0;
      } else {
        // Calculate lifecycle phase (0-1)
        const phase = splash.age / splash.lifespan;

        // Growth phase
        if (phase < 0.2) {
          splash.scale = (phase / 0.2) * splash.targetScale;
          splash.opacity = phase / 0.2;
        }
        // Fade out phase
        else {
          splash.scale = splash.targetScale;
          splash.opacity = 1 - (phase - 0.2) / 0.8;
        }
      }

      // Apply transforms
      const [x, y, z] = splash.position;
      dummy.position.set(x, y, z);
      dummy.scale.set(splash.scale, 0.01, splash.scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;

    // Update opacity in material
    if (meshRef.current.material instanceof THREE.Material) {
      meshRef.current.material.opacity = 0.3;
      meshRef.current.material.needsUpdate = true;
    }
  });

  return (
    <instancedMesh
      ref={meshRef}
      args={[undefined, undefined, count]}
      frustumCulled={false}
    >
      <cylinderGeometry args={[1, 1, 0.05, 8]} />
      <meshBasicMaterial
        color="#ffffff"
        transparent={true}
        opacity={0.3}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

// Example usage in your scene:
/*
import { Rain, RainSplashes } from './Rain'

function Scene() {
  return (
    <>
      <Rain 
        count={5000}
        speed={15}
        opacity={0.5}
        areaWidth={40}
        areaDepth={30}
        color="#8eb1e5"
      />
      <RainSplashes 
        count={100}
        floorY={0}
        areaWidth={40}
        areaDepth={30}
      />
      // Rest of your scene
    </>
  )
}
*/
