import { extractCodeOnly, isUsableCode } from "../src/lib/pipeline/code-from-ocr.ts";
import { mergeEvolving } from "../src/lib/pipeline/code-story.ts";

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
console.log("ok\n" + code);
