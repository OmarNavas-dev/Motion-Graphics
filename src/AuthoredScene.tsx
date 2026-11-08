import {
  AbsoluteFill,
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import { renderAuthored } from "./authored-renderer.mjs";
import { identities } from "./semantic-director.mjs";
import { useBundledFonts } from "./fonts";
import type { StudioProject, StudioScene, StyleName } from "./studio-schema";

export const AuthoredScene = ({
  scene,
  style,
  showText,
}: {
  scene: StudioScene;
  project?: StudioProject;
  style: StyleName;
  showText: boolean;
}) => {
  useBundledFonts();
  const frame = useCurrentFrame(),
    { width, height, fps } = useVideoConfig();
  if (!scene.authored) return null;
  const paths = [
    ...new Set(
      scene.authored.layers
        .flatMap((l) => [l.asset, l.fillAsset])
        .filter((s): s is string => Boolean(s)),
    ),
  ];
  const assets = Object.fromEntries(paths.map((p) => [p, staticFile(p)]));
  const html = renderAuthored(scene.authored, {
    time: frame / fps,
    duration: scene.duration,
    width,
    height,
    showText,
    assets,
    theme: identities[style],
  });
  return (
    <AbsoluteFill>
      {paths.map((p) => (
        <Img
          key={p}
          src={assets[p]}
          style={{ position: "absolute", width: 1, height: 1, opacity: 0 }}
        />
      ))}
      <div
        style={{ position: "absolute", inset: 0 }}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </AbsoluteFill>
  );
};
