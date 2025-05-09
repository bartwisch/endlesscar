import { EffectComposer, Bloom, HueSaturation, N8AO, BrightnessContrast } from '@react-three/postprocessing';
import { useThree } from '@react-three/fiber';
import { BlendFunction } from 'postprocessing';

export function PostProcessing() {
  const { gl } = useThree();

  return (
    <EffectComposer enableNormalPass>
      <N8AO
        intensity={5.5}
        aoRadius={0.9}
        distanceFalloff={1}
        screenSpaceRadius={false}
        halfRes={false}
        color="#012c06"
      />
      <BrightnessContrast brightness={0} contrast={0.0} />
      <Bloom
        luminanceThreshold={0.9}
        mipmapBlur
        luminanceSmoothing={0}
        intensity={0.4}
      />
      {/* Optional HueSaturation effect - uncomment if needed */}
      <HueSaturation
        saturation={0.3}
        hue={0}
      />
    </EffectComposer>
  );
}