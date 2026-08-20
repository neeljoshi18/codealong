import { extractCodeOnly, isUsableCode, repairOcrTypos } from "../src/lib/pipeline/code-from-ocr.ts";
import { filesForMoment, mergeEvolving, sameExample } from "../src/lib/pipeline/code-story.ts";
import { snapshotFitsPlayhead } from "../src/lib/snapshots.ts";
import type { CodeSnapshot } from "../src/lib/types.ts";

const mixed = `
check_user_input.py
currency_converter.py
elif_statements.py
grocery_budget_calc.py
External Libraries
Scratches and Consoles
k_progtam.py                2     if budget > bill:
and Comotes                 3         print(budget)
milk_quantity = int(input('How many cartons of milk in your cart? '))
bill = bill + milk * milk_quantity
if budget > bill:
    print(budget)
else:
    print('Not enough funds')
`;

const { code, score } = extractCodeOnly(mixed);
if (code.includes("check_user_input") || code.includes("External Libraries")) {
  throw new Error("file tree leaked into code:\n" + code);
}
if (!code.includes("milk_quantity") || !code.includes("print")) {
  throw new Error("lost the real code:\n" + code);
}
if (!/^    print\(budget\)/m.test(code) && !/^        print\(budget\)/m.test(code)) {
  throw new Error("python indent was stripped:\n" + code);
}
if (!isUsableCode(code) || score < 2) {
  throw new Error(`not usable score=${score}\n${code}`);
}
const cpp = extractCodeOnly("#include <iostream>\nclass Employee {\npublic:\n  int Age;\n};\n");
if (!cpp.code.includes("#include") || !cpp.code.includes("class Employee")) {
  throw new Error("cpp seed-like OCR broken:\n" + cpp.code);
}

const grocery = `if budget > bill:\n    print(budget)\nelse:\n    print('Not enough funds')\n`;
const secret = `import random\nsecret_number = random.randint(1, 100)\nwhile True:\n    user_guess = int(input('Guess'))\n`;
const jumped = mergeEvolving(grocery, secret);
if (jumped.code.includes("budget") || jumped.recovered) {
  throw new Error("unrelated python examples were woven:\n" + jumped.code);
}
if (!jumped.code.includes("secret_number")) {
  throw new Error("lost the new example:\n" + jumped.code);
}

const grown = mergeEvolving(
  `#include <iostream>\nclass Employee {\npublic:\n    int Age;\n};\n`,
  `int Age;\nvoid IntroduceYourself() {\n    std::cout << Age;\n}\n`,
);
if (!grown.code.includes("#include") || !grown.code.includes("IntroduceYourself")) {
  throw new Error("C++ evolve lost prefix:\n" + grown.code);
}

if (sameExample(grocery, secret)) {
  throw new Error("grocery and secret_number counted as the same example");
}

const dill = repairOcrTypos(`if budget > DILL:
    print (budget)
else:
    print('Not enough funds')
`);
if (dill.includes("DILL") || dill.includes("print (")) {
  throw new Error("OCR typo not repaired:\n" + dill);
}
if (!dill.includes("if budget > bill:")) {
  throw new Error("DILL did not become bill:\n" + dill);
}
if (repairOcrTypos("if quess is too big").includes("quess")) {
  throw new Error("quess not repaired to guess");
}

const raadoa = repairOcrTypos(`import raadoa\nsecret_number = random.randint(1, 100)\n`);
if (raadoa.includes("raadoa") || !raadoa.includes("import random")) {
  throw new Error("import raadoa not repaired:\n" + raadoa);
}

const grocerySnap: CodeSnapshot = {
  id: "g",
  timestamp: 1114,
  language: "python",
  activeFile: "app.py",
  files: { "app.py": grocery },
  label: "grocery",
  origin: "ocr",
};
const secretSnap: CodeSnapshot = {
  id: "s",
  timestamp: 3061,
  language: "python",
  activeFile: "secret_number.py",
  files: { "secret_number.py": secret },
  label: "secret",
  origin: "ocr",
};
if (snapshotFitsPlayhead(grocerySnap, 3061, { kind: "episodes" })) {
  throw new Error("grocery at 18:34 was allowed at 51:01");
}
if (snapshotFitsPlayhead(grocerySnap, 3061, { kind: "evolving", allowHistoric: false })) {
  throw new Error("misclassified evolving python still used grocery at 51:01");
}
if (!snapshotFitsPlayhead(secretSnap, 3061, { kind: "episodes" })) {
  throw new Error("51:01 secret_number rejected at 51:01");
}

const cppSnap: CodeSnapshot = {
  id: "c",
  timestamp: 900,
  language: "cpp",
  activeFile: "main.cpp",
  files: { "main.cpp": grown.code },
  label: "employee",
  origin: "ocr",
};
if (!snapshotFitsPlayhead(cppSnap, 1260, { kind: "evolving", allowHistoric: true })) {
  throw new Error("C++ seed at 15:00 should fill 21:00");
}

const moment = filesForMoment([grocerySnap, secretSnap], 3061, secretSnap, "episodes");
if (moment["app.py"]?.includes("budget")) {
  throw new Error("episode filesForMoment kept grocery app.py:\n" + JSON.stringify(moment));
}
if (!moment["secret_number.py"]?.includes("secret_number")) {
  throw new Error("episode filesForMoment lost secret_number");
}

console.log("ok\n" + code);
