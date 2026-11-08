import { useCurrentFrame, useVideoConfig } from "remotion";
import { wordCaptionGroups } from "./word-captions.mjs";
import type { StudioProject } from "./studio-schema";

export const GlobalWordCaptions = ({
  project,
  index,
}: {
  project: StudioProject;
  index: number;
}) => {
  const frame = useCurrentFrame(),
    { fps, width } = useVideoConfig();
  const start = project.scenes
      .slice(0, index)
      .reduce((n, s) => n + s.duration, 0),
    duration = project.scenes[index].duration;
  const time = frame / fps + Math.ceil(start * fps - 1e-8) / fps - start;
  const groups = wordCaptionGroups(project.wordTimings ?? [], start, duration);
  const group = groups.find(
    (g, i) =>
      time >= Math.max(0, g[0].start) &&
      time <
        Math.min(
          duration,
          groups[i + 1]?.[0]?.start ?? duration,
          g[g.length - 1].end + 0.18,
        ),
  );
  if (!group) return null;
  const active = group.reduce((last, w, i) => (w.start <= time ? i : last), -1);
  return (
    <div
      style={{
        position: "absolute",
        top: "9%",
        left: "8%",
        width: "84%",
        font: `500 ${(34 * width) / 720}px/1.3 Arial`,
        textAlign: "center",
        zIndex: 900,
        color: "#ffffff80",
        textShadow: "0 2px 8px #000c",
      }}
    >
      {group
        .filter((w) => w.start <= time)
        .map((word, i) => (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginRight: 8,
              padding: "0 2px",
              color: i === active ? "#fff" : undefined,
              fontWeight: i === active ? 800 : 500,
              border: `2px solid ${i === active && word.emphasis ? "#4c8dff" : "transparent"}`,
              borderRadius: 2,
            }}
          >
            {word.text}
          </span>
        ))}
    </div>
  );
};
