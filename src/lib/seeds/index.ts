import type { FeaturedTutorial, VideoReconstruction } from "@/lib/types";
import { MOSH_JS_ID, moshJavascriptReconstruction } from "@/lib/seeds/mosh-javascript";
import { MOSH_PYTHON_ID, moshPythonReconstruction } from "@/lib/seeds/mosh-python";
import { CPP_OOP_ID, cppOopReconstruction } from "@/lib/seeds/cpp-oop";

const builders: Record<string, () => VideoReconstruction> = {
  [MOSH_PYTHON_ID]: moshPythonReconstruction,
  [MOSH_JS_ID]: moshJavascriptReconstruction,
  [CPP_OOP_ID]: cppOopReconstruction,
};

export const FEATURED_TUTORIALS: FeaturedTutorial[] = [
  {
    videoId: MOSH_JS_ID,
    title: "JavaScript in 1 Hour",
    channel: "Programming with Mosh",
    durationLabel: "48m",
    language: "JavaScript",
    blurb: "Separate examples — variables, objects, functions. lesson.js stitches them.",
  },
  {
    videoId: CPP_OOP_ID,
    title: "OOP in C++",
    channel: "freeCodeCamp / CodeBeauty",
    durationLabel: "90m",
    language: "C++",
    blurb: "One file that grows: Employee → encapsulation → inheritance → polymorphism.",
  },
  {
    videoId: MOSH_PYTHON_ID,
    title: "Python for Beginners",
    channel: "Programming with Mosh",
    durationLabel: "1h",
    language: "Python",
    blurb: "Syllabus seed — not yet frame-verified.",
  },
];

export function getSeed(videoId: string): VideoReconstruction | null {
  const build = builders[videoId];
  if (!build) return null;
  const rec = structuredClone(build());
  if (rec.transcript.length === 0) {
    rec.transcript = rec.snapshots.map((s, i) => ({
      start: s.timestamp,
      duration: Math.max(1, (rec.snapshots[i + 1]?.timestamp ?? s.timestamp + 12) - s.timestamp),
      text: s.label,
    }));
  }
  return rec;
}

export function isSeeded(videoId: string): boolean {
  return videoId in builders;
}

export { MOSH_JS_ID, MOSH_PYTHON_ID, CPP_OOP_ID };
