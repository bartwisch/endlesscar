import {
  EffectComposer,
  Bloom,
  HueSaturation,
  N8AO,
  BrightnessContrast,
  GodRays,
} from "@react-three/postprocessing";
import { useThree } from "@react-three/fiber";
import { BlendFunction, KernelSize } from 'postprocessing';

import React, { useRef } from "react";
import { Mesh } from "three";

// Sun component that will be the source of god rays
const Sun = React.forwardRef((props, ref) => {
  return (
    <mesh ref={ref} position={[10, 10, 10]}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshBasicMaterial color="#ffffff" />
    </mesh>
  );
});

export function PostProcessing() {
  const { gl } = useThree();
  const sunRef = useRef(null);

  return (
    <>
      <Sun ref={sunRef} />
      <EffectComposer enableNormalPass>
        <N8AO
          intensity={5.5}
          aoRadius={0.9}
          distanceFalloff={1}
          screenSpaceRadius={false}
          halfRes={false}
          color="#012c06"
        />
        <BrightnessContrast brightness={0} contrast={0.05} />
        <Bloom
          luminanceThreshold={0.9}
          mipmapBlur
          luminanceSmoothing={0}
          intensity={0.2}
        />
        <HueSaturation saturation={0.3} hue={0} />
        {/* <GodRays
          sun={sunRef} // your mesh or ref to the sun source
          blendFunction={BlendFunction.SCREEN} // blend mode
          samples={150} // more samples = smoother rays
          density={1.0} // maximum density
          decay={0.97} // less decay = longer visible rays
          weight={1.5} // higher influence of light scatter
          exposure={0.8} // brighter rays
          clampMax={2.0} // allow higher brightness accumulation
          resolutionScale={1.0} // full resolution
          kernelSize={KernelSize.VERY_LARGE} // smoother blur
          blur={true} // apply blur pass to smooth the rays
        /> */}
      </EffectComposer>
    </>
  );
}
