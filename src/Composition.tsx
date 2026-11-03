import {Composition} from 'remotion';
import {ProfessionalShowcase} from './ProfessionalShowcase';

export const MyComposition: React.FC = () => {
  return (
    <Composition
      id="MotionProfesional"
      component={ProfessionalShowcase}
      durationInFrames={288}
      fps={24}
      width={720}
      height={1280}
    />
  );
};
