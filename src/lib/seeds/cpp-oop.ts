import type { CodeSnapshot, VideoReconstruction } from "@/lib/types";
import { thumbnailUrl } from "@/lib/youtube";

export const CPP_OOP_ID = "wN0x9eZLix4";

function shot(t: number, body: string, label: string): CodeSnapshot {
  const text = body.endsWith("\n") ? body : `${body}\n`;
  return {
    id: `ocr${String(Math.floor(t)).padStart(6, "0")}`,
    timestamp: t,
    language: "cpp",
    activeFile: "main.cpp",
    files: { "main.cpp": text },
    label,
    origin: "ocr",
  };
}

export function cppOopReconstruction(): VideoReconstruction {
  const snapshots: CodeSnapshot[] = [
    shot(
      360,
      `#include <iostream>

int main()
{

}
`,
      "Empty main",
    ),
    shot(
      420,
      `#include <iostream>

class Employee {

};

int main()
{

}
`,
      "Empty Employee class",
    ),
    shot(
      480,
      `#include <iostream>
using std::string;

class Employee {
    string Name;
    string Company;
};

int main()
{

}
`,
      "Name and Company",
    ),
    shot(
      600,
      `#include <iostream>
using std::string;

class Employee {
    string Name;
    string Company;
    int Age;
};

int main()
{
    Employee employee1;
}
`,
      "Age and first object",
    ),
    shot(
      720,
      `#include <iostream>
using std::string;

class Employee {
private:
    string Name;
    string Company;
    int Age;
};

int main()
{
    Employee employee1;
}
`,
      "private members",
    ),
    shot(
      900,
      `#include <iostream>
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
`,
      "public fields assigned",
    ),
    shot(
      1140,
      `#include <iostream>
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
`,
      "IntroduceYourself",
    ),
    shot(
      1500,
      `#include <iostream>
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

    Employee(string name, string company, int age) {
        Name = name;
        Company = company;
        Age = age;
    }
};

int main()
{
    Employee employee1 = Employee("Saldina", "YT-CodeBeauty", 25);
    employee1.IntroduceYourself();
}
`,
      "Constructor",
    ),
    shot(
      1860,
      `#include <iostream>
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

    Employee(string name, string company, int age) {
        Name = name;
        Company = company;
        Age = age;
    }
};

int main()
{
    Employee employee1 = Employee("Saldina", "YT-CodeBeauty", 25);
    employee1.IntroduceYourself();

    Employee employee2 = Employee("John", "Amazon", 35);
    employee2.IntroduceYourself();
}
`,
      "Two constructed employees",
    ),
    shot(
      2220,
      `#include <iostream>
using std::string;

class Employee {
private:
    string Name;
    string Company;
    int Age;
public:
    void setName(string name) {
        Name = name;
    }
    string getName() {
        return Name;
    }
    void setCompany(string company) {
        Company = company;
    }
    string getCompany() {
        return Company;
    }
    void setAge(int age) {
        Age = age;
    }
    int getAge() {
        return Age;
    }
    void IntroduceYourself() {
        std::cout << "Name - " << Name << std::endl;
        std::cout << "Company - " << Company << std::endl;
        std::cout << "Age - " << Age << std::endl;
    }
    Employee(string name, string company, int age) {
        Name = name;
        Company = company;
        Age = age;
    }
};

int main()
{
    Employee employee1 = Employee("Saldina", "YT-CodeBeauty", 25);
    employee1.IntroduceYourself();

    Employee employee2 = Employee("John", "Amazon", 35);
    employee2.IntroduceYourself();

    employee1.setAge(39);
    std::cout << employee1.getName() << " is " << employee1.getAge() << " years old" << std::endl;
}
`,
      "Encapsulation",
    ),
    shot(
      2940,
      `#include <iostream>
using std::string;

class AbstractEmployee {
    virtual void AskForPromotion() = 0;
};

class Employee: AbstractEmployee {
private:
    string Company;
    int Age;
protected:
    string Name;
public:
    void setName(string name) {
        Name = name;
    }
    string getName() {
        return Name;
    }
    void setCompany(string company) {
        Company = company;
    }
    string getCompany() {
        return Company;
    }
    void setAge(int age) {
        Age = age;
    }
    int getAge() {
        return Age;
    }
    void IntroduceYourself() {
        std::cout << "Name - " << Name << std::endl;
        std::cout << "Company - " << Company << std::endl;
        std::cout << "Age - " << Age << std::endl;
    }
    Employee(string name, string company, int age) {
        Name = name;
        Company = company;
        Age = age;
    }
    void AskForPromotion() {
        if (Age > 30)
            std::cout << Name << " got promoted!" << std::endl;
        else
            std::cout << Name << ", sorry NO promotion for you!" << std::endl;
    }
};

int main()
{
    Employee employee1 = Employee("Saldina", "YT-CodeBeauty", 25);
    Employee employee2 = Employee("John", "Amazon", 35);
    employee1.AskForPromotion();
    employee2.AskForPromotion();
}
`,
      "Abstraction + AskForPromotion",
    ),
    shot(
      3660,
      `#include <iostream>
using std::string;

class AbstractEmployee {
    virtual void AskForPromotion() = 0;
};

class Employee: AbstractEmployee {
private:
    string Company;
    int Age;
protected:
    string Name;
public:
    void setName(string name) {
        Name = name;
    }
    string getName() {
        return Name;
    }
    void setCompany(string company) {
        Company = company;
    }
    string getCompany() {
        return Company;
    }
    void setAge(int age) {
        Age = age;
    }
    int getAge() {
        return Age;
    }
    void IntroduceYourself() {
        std::cout << "Name - " << Name << std::endl;
        std::cout << "Company - " << Company << std::endl;
        std::cout << "Age - " << Age << std::endl;
    }
    Employee(string name, string company, int age) {
        Name = name;
        Company = company;
        Age = age;
    }
    void AskForPromotion() {
        if (Age > 30)
            std::cout << Name << " got promoted!" << std::endl;
        else
            std::cout << Name << ", sorry NO promotion for you!" << std::endl;
    }
};

class Developer: Employee {
public:
    string FavProgrammingLanguage;
    Developer(string name, string company, int age, string favProgrammingLanguage)
        : Employee(name, company, age)
    {
        FavProgrammingLanguage = favProgrammingLanguage;
    }
};

int main()
{
    Employee employee1 = Employee("Saldina", "YT-CodeBeauty", 25);
    Employee employee2 = Employee("John", "Amazon", 35);
}
`,
      "Developer subclass",
    ),
    shot(
      4020,
      `#include <iostream>
using std::string;

class AbstractEmployee {
    virtual void AskForPromotion() = 0;
};

class Employee: AbstractEmployee {
private:
    string Company;
    int Age;
protected:
    string Name;
public:
    void setName(string name) {
        Name = name;
    }
    string getName() {
        return Name;
    }
    void setCompany(string company) {
        Company = company;
    }
    string getCompany() {
        return Company;
    }
    void setAge(int age) {
        Age = age;
    }
    int getAge() {
        return Age;
    }
    void IntroduceYourself() {
        std::cout << "Name - " << Name << std::endl;
        std::cout << "Company - " << Company << std::endl;
        std::cout << "Age - " << Age << std::endl;
    }
    Employee(string name, string company, int age) {
        Name = name;
        Company = company;
        Age = age;
    }
    void AskForPromotion() {
        if (Age > 30)
            std::cout << Name << " got promoted!" << std::endl;
        else
            std::cout << Name << ", sorry NO promotion for you!" << std::endl;
    }
};

class Developer: public Employee {
public:
    string FavProgrammingLanguage;
    Developer(string name, string company, int age, string favProgrammingLanguage)
        : Employee(name, company, age)
    {
        FavProgrammingLanguage = favProgrammingLanguage;
    }
    void FixBug() {
        std::cout << Name << " fixed bug using " << FavProgrammingLanguage << std::endl;
    }
};

int main()
{
    Developer d = Developer("Saldina", "YT-CodeBeauty", 25, "C++");
    d.FixBug();
    d.AskForPromotion();
}
`,
      "FixBug + public inheritance",
    ),
    shot(
      4380,
      `#include <iostream>
using std::string;

class AbstractEmployee {
    virtual void AskForPromotion() = 0;
};

class Employee: AbstractEmployee {
private:
    string Company;
    int Age;
protected:
    string Name;
public:
    void setName(string name) {
        Name = name;
    }
    string getName() {
        return Name;
    }
    void setCompany(string company) {
        Company = company;
    }
    string getCompany() {
        return Company;
    }
    void setAge(int age) {
        Age = age;
    }
    int getAge() {
        return Age;
    }
    void IntroduceYourself() {
        std::cout << "Name - " << Name << std::endl;
        std::cout << "Company - " << Company << std::endl;
        std::cout << "Age - " << Age << std::endl;
    }
    Employee(string name, string company, int age) {
        Name = name;
        Company = company;
        Age = age;
    }
    void AskForPromotion() {
        if (Age > 30)
            std::cout << Name << " got promoted!" << std::endl;
        else
            std::cout << Name << ", sorry NO promotion for you!" << std::endl;
    }
};

class Developer: public Employee {
public:
    string FavProgrammingLanguage;
    Developer(string name, string company, int age, string favProgrammingLanguage)
        : Employee(name, company, age)
    {
        FavProgrammingLanguage = favProgrammingLanguage;
    }
    void FixBug() {
        std::cout << Name << " fixed bug using " << FavProgrammingLanguage << std::endl;
    }
};

class Teacher: public Employee {
public:
    string Subject;
    void PrepareLesson() {
        std::cout << Name << " is preparing " << Subject << " lesson" << std::endl;
    }
    Teacher(string name, string company, int age, string subject)
        : Employee(name, company, age)
    {
        Subject = subject;
    }
};

int main()
{
    Developer d = Developer("Saldina", "YT-CodeBeauty", 25, "C++");
    Teacher t = Teacher("Jack", "Cool School", 35, "History");
    t.PrepareLesson();
    t.AskForPromotion();
}
`,
      "Teacher subclass",
    ),
    shot(
      5100,
      `#include <iostream>
using std::string;

class AbstractEmployee {
    virtual void AskForPromotion() = 0;
};

class Employee: AbstractEmployee {
private:
    string Company;
    int Age;
protected:
    string Name;
public:
    void setName(string name) {
        Name = name;
    }
    string getName() {
        return Name;
    }
    void setCompany(string company) {
        Company = company;
    }
    string getCompany() {
        return Company;
    }
    void setAge(int age) {
        Age = age;
    }
    int getAge() {
        return Age;
    }
    void IntroduceYourself() {
        std::cout << "Name - " << Name << std::endl;
        std::cout << "Company - " << Company << std::endl;
        std::cout << "Age - " << Age << std::endl;
    }
    Employee(string name, string company, int age) {
        Name = name;
        Company = company;
        Age = age;
    }
    void AskForPromotion() {
        if (Age > 30)
            std::cout << Name << " got promoted!" << std::endl;
        else
            std::cout << Name << ", sorry NO promotion for you!" << std::endl;
    }
    virtual void Work() {
        std::cout << Name << " is checking email, task backlog, performing tasks..." << std::endl;
    }
};

class Developer: public Employee {
public:
    string FavProgrammingLanguage;
    Developer(string name, string company, int age, string favProgrammingLanguage)
        : Employee(name, company, age)
    {
        FavProgrammingLanguage = favProgrammingLanguage;
    }
    void FixBug() {
        std::cout << Name << " fixed bug using " << FavProgrammingLanguage << std::endl;
    }
    void Work() {
        std::cout << Name << " is writing " << FavProgrammingLanguage << " code" << std::endl;
    }
};

class Teacher: public Employee {
public:
    string Subject;
    void PrepareLesson() {
        std::cout << Name << " is preparing " << Subject << " lesson" << std::endl;
    }
    Teacher(string name, string company, int age, string subject)
        : Employee(name, company, age)
    {
        Subject = subject;
    }
    void Work() {
        std::cout << Name << " is teaching " << Subject << std::endl;
    }
};

int main()
{
    Developer d = Developer("Saldina", "YT-CodeBeauty", 25, "C++");
    Teacher t = Teacher("Jack", "Cool School", 35, "History");
    Employee* e1 = &d;
    Employee* e2 = &t;
    e1->Work();
    e2->Work();
}
`,
      "Polymorphism",
    ),
  ];

  return {
    videoId: CPP_OOP_ID,
    title: "Object Oriented Programming (OOP) in C++ Course",
    channel: "freeCodeCamp.org / CodeBeauty",
    duration: 5425,
    language: "cpp",
    tutorialGoalSummary:
      "One C++ file grows from an empty main through an Employee class, encapsulation, abstraction, inheritance (Developer, Teacher), and polymorphism.",
    inferredProjectStructure: {
      files: ["main.cpp"],
      description: "Single evolving Visual Studio file: CodeBeauty.OOP.cpp.",
      entrypoint: "main.cpp",
      language: "cpp",
    },
    tutorialKind: "evolving",
    snapshots,
    transcript: [],
    source: "ocr",
    status: "ready",
    progress: 100,
    message: "Screen-extracted evolving C++ file",
    thumbnailUrl: thumbnailUrl(CPP_OOP_ID),
    editorTheme: "chronos-dark",
    processedAt: new Date().toISOString(),
    processedRanges: [{ start: 0, end: 5425 }],
    horizonEnd: 5425,
  };
}
