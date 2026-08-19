import { extractCodeOnly, isCleanCode, isUsableCode } from "../src/lib/pipeline/code-from-ocr.ts";
import { mergeEvolving } from "../src/lib/pipeline/code-story.ts";

const seed900 = `#include <iostream>
using std::string;

class Employee {
public:
    string Name;
    string Company;
    int Age;
};

int main()
{
    Employee employee1;
    employee1.Name = "Saldina";
    employee1.Company = "YT-CodeBeauty";
    employee1.Age = 25;
}
`;

const seed1140 = `#include <iostream>
using std::string;

class Employee {
public:
    string Name;
    string Company;
    int Age;

    void IntroduceYourself() {
        std::cout << "Name - " << Name << std::endl;
        std::cout << "Company - " << Company << std::endl;
        std::cout << "Age - " << Age << std::endl;
    }
};

int main()
{
    Employee employee1;
    employee1.Name = "Saldina";
    employee1.Company = "YT-CodeBeauty";
    employee1.Age = 25;
    employee1.IntroduceYourself();

    Employee employee2;
    employee2.Name = "John";
    employee2.Company = "Amazon";
    employee2.Age = 35;
    employee2.IntroduceYourself();
}
`;

const ocr960 = `tinclude <iostream>
using std::string;
aclass Employee {
public:
string Name;
string Company;
int Age;
void IntroduceYourself() {
std::cout << "Name - " << Name << std::endl;
std::cout << "Company - " << Company << std::endl;
std::cout << "Age - " << Age << std::endl;
}
eint main()
{
Employee employeel;
employeel.Name = "Saldina";
`;

const ocr1020 = `int Age;
void IntroduceYourself() {
std::cout << "Name - " << Name << std::endl;
std::cout << "Company - " << Company << std::endl;
std::cout << "Age - " << Age << std::endl;
}
eint main()
{
Employee employeel;
employeel.Name = "Saldina";
employeel.IntroduceYourself();
`;

const ocr1260 = `std::cout << "Name - " << Name << std::endl;
std::cout << "Company - " << Company << std::endl;
eint main()
{
    Employee employeel;
//employeel.Name = "Saldina";
//employee1.Company = "YT-CodeBeauty";
employeel.IntroduceYourself();
Employee employee2;
employee2.IntroduceYourself();
`;

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error("FAIL", msg);
    process.exitCode = 1;
  } else {
    console.log("ok ", msg);
  }
}

const extracted = extractCodeOnly(ocr960);
assert(isUsableCode(extracted.code), "960 OCR is usable");
assert(extracted.code.includes("IntroduceYourself"), "960 extract keeps IntroduceYourself");
assert(extracted.code.includes("#include"), "960 extract keeps # on include");
assert(!/^include </m.test(extracted.code), "960 extract does not strip #include");

const grew = mergeEvolving(seed900, extracted.code);
assert(grew.code.includes("#include"), "weave keeps #include");
assert(grew.code.includes("class Employee"), "weave keeps class Employee");
assert(grew.code.includes("IntroduceYourself"), "960 weave adds IntroduceYourself");
assert((grew.code.match(/#include/g) || []).length === 1, "no duplicate include");

const grown = grew.code;
const again = mergeEvolving(grown, seed900);
assert(again.code.includes("IntroduceYourself"), "later seed 900 must not shrink live buffer");

const hop = mergeEvolving(grown, seed1140);
assert(hop.code.includes("employee2"), "seed 1140 hop adds employee2");
assert(hop.code.includes("#include"), "1140 hop keeps include");

const scrolled = mergeEvolving(seed1140, extractCodeOnly(ocr1020).code);
assert(scrolled.code.includes("#include"), "scrolled viewport keeps cutoff prefix");
assert(scrolled.code.includes("IntroduceYourself"), "scrolled viewport keeps method");

const commented = mergeEvolving(seed1140, extractCodeOnly(ocr1260).code);
assert(commented.code.includes("#include"), "1260 keeps prefix");
assert(/\/\/\s*employee1\.Name/.test(commented.code), "1260 comments the Name assignment");
assert(commented.code.includes("class Employee"), "1260 keeps class");

assert(!isCleanCode(ocr960), "raw dirty OCR is not persistable");
assert(isCleanCode(grew.code), "weaved 960+900 is persistable");

const unbalanced = `#include <iostream>
using std::string;
class Employee {
public:
int Age;
void IntroduceYourself() {
std::cout << "Name - " << Name << std::endl;
int main()
Employee employee1;
`;
const wovenUnbalanced = mergeEvolving(seed900, unbalanced);
assert(wovenUnbalanced.code.includes("};"), "unbalanced OCR must not drop class close");
assert(wovenUnbalanced.code.includes("IntroduceYourself"), "unbalanced OCR still adds method");
assert((wovenUnbalanced.code.match(/int main/g) || []).length === 1, "unbalanced OCR does not duplicate main");

if (process.exitCode) {
  console.error("\n--- grown file ---\n" + grew.code);
  console.error("\n--- 1260 ---\n" + commented.code);
  console.error("\n--- unbalanced ---\n" + wovenUnbalanced.code);
} else {
  console.log("all merge tests passed");
}
