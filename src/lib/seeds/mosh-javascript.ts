import type { CodeSnapshot, VideoReconstruction } from "@/lib/types";
import { thumbnailUrl } from "@/lib/youtube";

export const MOSH_JS_ID = "W6NZfCO5SIk";

function shot(
  t: number,
  file: string,
  body: string,
  label: string,
): CodeSnapshot {
  return {
    id: `ocr${String(Math.floor(t)).padStart(6, "0")}`,
    timestamp: t,
    language: file.endsWith(".html") ? "html" : "javascript",
    activeFile: file,
    files: { [file]: body.endsWith("\n") ? body : `${body}\n` },
    label,
    origin: "ocr",
  };
}

export function moshJavascriptReconstruction(): VideoReconstruction {
  const snapshots: CodeSnapshot[] = [
    shot(
      450,
      "index.html",
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Document</title>
</head>
<body>

</body>
</html>
`,
      "First HTML page",
    ),
    shot(
      600,
      "index.html",
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="ie=edge">
  <title>Document</title>
</head>
<body>
  <h1>Hello World</h1>
  <script>
    console.log('Hello World');
  </script>
</body>
</html>
`,
      "Hello World in the page",
    ),
    shot(
      1100,
      "index.js",
      `let name = 'Mosh';
console.log(name);
`,
      "Variables",
    ),
    shot(
      1166,
      "index.js",
      `let name = 'Mosh';
console.log(name);

// Cannot be a reserved keyword
// Should be meaningful
// Cannot start with a number (1name)
// Cannot contain a space or hyphen (-)

let firstName;
`,
      "Naming rules",
    ),
    shot(
      1224,
      "index.js",
      `let name = 'Mosh';
console.log(name);

// Cannot be a reserved keyword
// Should be meaningful
// Cannot start with a number (1name)
// Cannot contain a space or hyphen (-)

let firstName;
`,
      "Naming rules",
    ),
    shot(
      1400,
      "index.js",
      `const interestRate = 0.3;
interestRate = 1;
console.log(interestRate);
`,
      "Constants",
    ),
    shot(
      1600,
      "index.js",
      `let name = 'Mosh'; // String Literal
let age = 30; // Number Literal
let isApproved = false; // Boolean Literal
let firstName = undefined;
let selectedColor = null;
`,
      "Primitive types",
    ),
    shot(
      1800,
      "index.js",
      `let name = 'Mosh';
let age = 30;
let isApproved = false;
let firstName = undefined;
let selectedColor = null;
`,
      "typeof primitives",
    ),
    shot(
      2000,
      "index.js",
      `let person = {
  name: 'Mosh',
  age: 30
};

// Dot Notation
person.name = 'John';

console.log(person.name);
`,
      "Objects",
    ),
    shot(
      2200,
      "index.js",
      `let selectedColors = ['red', 'blue'];
console.log(selectedColors);
`,
      "Arrays",
    ),
    shot(
      2600,
      "index.js",
      `function greet(name) {
  console.log('Hello ' + name);
}

greet('John');
greet('Mary');
`,
      "Functions",
    ),
  ];

  return {
    videoId: MOSH_JS_ID,
    title: "JavaScript Tutorial for Beginners: Learn JavaScript in 1 Hour",
    channel: "Programming with Mosh",
    duration: 2897,
    language: "javascript",
    tutorialGoalSummary:
      "Mosh's one-hour JavaScript intro: HTML shell, console, variables, naming rules, const, primitives, objects, arrays, functions.",
    inferredProjectStructure: {
      files: ["index.html", "index.js", "lesson.js"],
      description:
        "Screen extracts plus lesson.js, which stitches each standalone example as the video moves on.",
      entrypoint: "index.js",
      language: "javascript",
    },
    tutorialKind: "episodes",
    snapshots,
    transcript: [],
    source: "ocr",
    status: "ready",
    progress: 100,
    message: "Screen-extracted moments from the video",
    thumbnailUrl: thumbnailUrl(MOSH_JS_ID),
    editorTheme: "chronos-js",
    processedAt: new Date().toISOString(),
    processedRanges: [{ start: 0, end: 2897 }],
    horizonEnd: 2897,
  };
}
