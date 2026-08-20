import { extractCodeOnly, isUsableCode } from "../src/lib/pipeline/code-from-ocr.ts";

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
console.log("ok\n" + code);
