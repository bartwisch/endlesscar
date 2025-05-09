import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useGLTF, useAnimations } from '@react-three/drei';

export default function Car({ position = [0, 0, 0], rotation = [0, 0, 0], scale = 1 }) {
  const group = useRef();
  const [carPosition, setCarPosition] = useState([...position]);
  const [carRotation, setCarRotation] = useState([...rotation]);
  const [animationPlaying, setAnimationPlaying] = useState(false);
  const [movement, setMovement] = useState({ left: false, right: false });
  const targetRotationRef = useRef(rotation[1]);
  
  // Create refs for spotlight targets
  const leftTargetRef = useRef();
  const rightTargetRef = useRef();
  
  // Load the GLB file from the public folder
  const { scene, animations } = useGLTF('/car.glb');
  const { actions, names, mixer } = useAnimations(animations, group);
  
  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Reversed controls (right now moves left, left moves right)
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        setMovement(prev => ({ ...prev, right: true }));
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        setMovement(prev => ({ ...prev, left: true }));
      }
      
      // Play animation when any movement key is pressed
      if (!animationPlaying && 
          (e.key === 'a' || e.key === 'A' || e.key === 'd' || e.key === 'D' || 
           e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
        playAnimation();
      }
    };
    
    const handleKeyUp = (e) => {
      if (e.key === 'a' || e.key === 'A' || e.key === 'ArrowLeft') {
        setMovement(prev => ({ ...prev, right: false }));
      }
      if (e.key === 'd' || e.key === 'D' || e.key === 'ArrowRight') {
        setMovement(prev => ({ ...prev, left: false }));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [animationPlaying]);
  
  // Initialize the model and animations
  useEffect(() => {
    if (scene) {
      // Apply materials and shadows to the model
      scene.traverse((node) => {
        if (node.isMesh) {
          node.castShadow = true;
          node.receiveShadow = true;
        }
      });
      
      // Log available animations for debugging
      console.log("Available animations:", names);
      
      // Play all animations automatically on load
      playAnimation();
    }
    
    // Initial car position and rotation
    setCarPosition([...position]);
    setCarRotation([...rotation]);
    targetRotationRef.current = rotation[1];
    
    return () => {
      // Cleanup animations
      Object.values(actions).forEach(action => action?.reset().stop());
    };
  }, [scene, animations, actions, names, position, rotation]);
  
  // Handle smooth movement and rotation
  useFrame((_, delta) => {
    // Update the animation mixer on each frame
    if (mixer) mixer.update(delta);
    
    // Movement speed and rotation factors
    const speed = 0.07; // Horizontal speed
    const rotationSpeed = 0.03; // Reduced from 0.05 for smoother rotation
    const maxRotationAngle = 0.15; // Reduced from 0.25 (about 8.5 degrees instead of 14)
    
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
    
    // Ensure the rotation stays within limits
    targetYRotation = Math.min(Math.max(targetYRotation, rotationLowerLimit), rotationUpperLimit);
    
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
      if ((movement.left && carRotation[1] > baseRotation + 0.2) || 
          (movement.right && carRotation[1] < baseRotation - 0.2)) {
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
  });
  
  // Play animation
  const playAnimation = () => {
    if (names && names.length > 0) {
      setAnimationPlaying(true);
      
      // Play all animations continuously - one of them should move the wheels
      names.forEach(name => {
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
      position={carPosition} 
      rotation={carRotation} 
      scale={scale} 
      onClick={debugModel}
      dispose={null}
    >
      <primitive object={scene} />
      
      {/* Spotlight targets */}
      <object3D ref={leftTargetRef} position={[-0.8, 0.3, -10]} />
      <object3D ref={rightTargetRef} position={[0.8, 0.3, -10]} />
      
      {/* Left headlight */}
      <spotLight
        position={[-0.7, 0.5, 1.5]} // Left side, slightly elevated, front of car
        angle={0.6} // Wider beam spread
        penumbra={0.3} // Softer edges
        intensity={100.5}
        color="#f0f0ff" // Slightly blue-ish white
        castShadow
        target={leftTargetRef.current}
      />
      
      {/* Right headlight */}
      <spotLight
        position={[0.7, 0.5, 1.5]} // Right side, slightly elevated, front of car
        angle={0.6} // Wider beam spread
        penumbra={0.3} // Softer edges
        intensity={100.5}
        color="#f0f0ff" // Slightly blue-ish white
        castShadow
        target={rightTargetRef.current}
      />
    </group>
  );
}

// Preload the model to improve performance
useGLTF.preload('/car.glb');