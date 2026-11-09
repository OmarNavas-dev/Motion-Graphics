import {Composition} from 'remotion';
import {StudioVideo} from './StudioVideo';
import {TransparentBroll} from './BrollTrack';
import {
  defaultStudioProject,
  getDimensions,
  getTotalFrames,
  getProjectFps,
  type StudioProps,
} from './studio-schema';

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="StudioVideo"
        component={StudioVideo}
        defaultProps={{project: defaultStudioProject}}
        width={getDimensions(defaultStudioProject.format, defaultStudioProject.resolution).width}
        height={getDimensions(defaultStudioProject.format, defaultStudioProject.resolution).height}
        fps={getProjectFps(defaultStudioProject)}
        durationInFrames={getTotalFrames(defaultStudioProject)}
        calculateMetadata={({props}: {props: StudioProps}) => ({
          durationInFrames: getTotalFrames(props.project),
          ...getDimensions(props.project.format, props.project.resolution),
          fps: getProjectFps(props.project),
        })}
      />
      <Composition
        id="TransparentBroll"
        component={TransparentBroll}
        defaultProps={{project: defaultStudioProject}}
        width={getDimensions(defaultStudioProject.format, defaultStudioProject.resolution).width}
        height={getDimensions(defaultStudioProject.format, defaultStudioProject.resolution).height}
        fps={getProjectFps(defaultStudioProject)}
        durationInFrames={getTotalFrames(defaultStudioProject)}
        calculateMetadata={({props}: {props: StudioProps}) => ({
          durationInFrames: getTotalFrames(props.project),
          ...getDimensions(props.project.format, props.project.resolution),
          fps: getProjectFps(props.project),
        })}
      />
    </>
  );
};
