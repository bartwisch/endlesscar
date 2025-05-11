import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  useGLTF,
  SoftShadows,
  Environment,
  Cloud,
} from "@react-three/drei";
import { useRef, useState, useEffect } from "react";
import * as THREE from "three";
import "./App.css";
import { PostProcessing } from "./PostProcessing";
import Model from "./Model";
import Car from "./Car";
import Obstacles from "./Obstacles";
import GameOver from "./GameOver";

// function Model() {
//   const gltf = useGLTF("/scene.glb");

//   useEffect(() => {
//     gltf.scene.traverse((child) => {
//       if ("isMesh" in child) {
//         child.castShadow = true;
//         child.receiveShadow = true;
//       }
//     });
//   }, [gltf]);

//   return <primitive object={gltf.scene} />;
// }

function App() {
  const MODEL_LENGTH = 31.65;
  const MODEL_SPEED = 4; // Define speed as a constant to reuse
  const [key, setKey] = useState(0); // Add a key state for forcing re-render
  const modelRefs = [
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
    useRef<THREE.Group>(null),
  ];

  // Game state
  const [gameOver, setGameOver] = useState(false);

  // Handle collision
  const handleCollision = () => {
    console.log("GAME OVER triggered in App component!");
    setGameOver(true);
  };

  // Restart game
  const handleRestart = () => {
    setGameOver(false);
    // Force a re-render to reset everything
    setKey((prev) => prev + 1);
  };

  // Force a re-render after 2.5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setKey((prev) => prev + 1);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="canvas-container">
      <Canvas
        key={key} // Add key to force full re-render on restart
        shadows="soft"
        camera={{ position: [10, 10, 40], fov: 45 }}
        dpr={1}
      >
        <color attach="background" args={["#565d6a"]} />
        <SoftShadows size={25} samples={16} focus={0.5} />
        <Environment
          files="/forest.hdr"
          background
          blur={0.5}
          environmentIntensity={0.5}
          backgroundIntensity={1.5}
          // ground={{
          //   height: 15, // how far above the ground the env starts projecting
          //   radius: 60, // how large the projection area is
          //   scale: 150, // how big the texture appears
          // }}
        />

        {/* <ambientLight intensity={0.3} /> */}
        <directionalLight
          position={[15, 15, 20]} //5,5,15
          // color={0xfaf5e3}
          intensity={7}
          castShadow
          shadow-mapSize-width={4096}
          shadow-mapSize-height={4096}
          shadow-camera-far={100}
          shadow-camera-left={-20}
          shadow-camera-right={20}
          shadow-camera-top={20}
          shadow-camera-bottom={-20}
          shadow-bias={-0.001}
        />
        {/* <Model/> */}
        {/* Creating multiple models in a line along X-axis */}
        {/* Cloud formations */}
        <Cloud
          position={[-20, 15, 10]}
          speed={0.2}
          opacity={0.5}
          // width={20}
          // depth={1.5}
          segments={20}
          color={0xffffff}
        />
        <Cloud
          position={[20, 12, 20]}
          speed={0.2}
          opacity={0.5}
          // width={15}
          // depth={1.5}
          segments={20}
        />
        <Cloud
          position={[0, 10, 30]}
          speed={0.2}
          opacity={0.5}
          // width={25}
          // depth={1.5}
          segments={20}
        />
        <Cloud
          position={[-15, 8, 40]}
          speed={0.2}
          opacity={0.5}
          // width={18}
          // depth={1.5}
          segments={20}
        />
        <Cloud
          position={[25, 14, 50]}
          speed={0.2}
          opacity={0.5}
          // width={22}
          // depth={1.5}
          segments={20}
        />
        <Cloud
          position={[-25, 13, 60]}
          speed={0.2}
          opacity={0.5}
          // width={19}
          // depth={1.5}
          segments={20}
        />
        <Cloud
          position={[15, 9, 70]}
          speed={0.2}
          opacity={0.5}
          // width={23}
          // depth={1.5}
          segments={20}
        />
        <Cloud
          position={[-10, 11, 80]}
          speed={0.2}
          opacity={0.5}
          // width={17}
          // depth={1.5}
          segments={20}
        />
        <Cloud
          position={[30, 16, 90]}
          speed={0.2}
          opacity={0.5}
          // width={21}
          // depth={1.5}
          segments={20}
        />
        <Cloud
          position={[-5, 7, 100]}
          speed={0.2}
          opacity={0.5}
          // width={24}
          // depth={1.5}
          segments={20}
        />
        {modelRefs.map((ref, index) => (
          <Model
            key={`${key}-${index}`} // Add key to force re-render
            ref={ref}
            position={[0, 0, index * MODEL_LENGTH]}
            scale={[1, 1, 1]}
            speed={MODEL_SPEED}
            modelRefs={modelRefs}
            modelLength={MODEL_LENGTH}
          />
        ))}
        <Car
          position={[0, 0.25, 0]}
          rotation={[0, 0, 0]}
          scale={0.7}
          onCollision={handleCollision}
        />

        {/* Simple obstacles in a straight line */}
        <Obstacles
          position={[0, 0, 0]}
          speed={MODEL_SPEED}
          onCollision={handleCollision}
        />

        <fog attach="fog" args={["#78867f", 1, 140]} />
        {/* city = 565d6a  forest = 78867f */}

        <OrbitControls />
        {/* <SSR /> */}
        <PostProcessing />
      </Canvas>

      {/* Game over screen */}
      {gameOver && <GameOver onRestart={handleRestart} />}
    </div>
  );
}

export default App;
