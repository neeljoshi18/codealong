import type { VideoReconstruction } from "@/lib/types";
import { buildStitchedSnapshots } from "@/lib/snapshots";
import { thumbnailUrl } from "@/lib/youtube";

export const MOSH_PYTHON_ID = "kqtD5dpn9C8";

const converters = `def lbs_to_kg(weight):
    return weight * 0.45


def kg_to_lbs(weight):
    return weight / 0.45
`;

const utils = `def find_max(numbers):
    maximum = numbers[0]
    for number in numbers:
        if number > maximum:
            maximum = number
    return maximum
`;

export function moshPythonReconstruction(): VideoReconstruction {
  const snapshots = buildStitchedSnapshots({
    language: "python",
    defaultFile: "app.py",
    stitchFile: "tutorial.py",
    sections: [
      {
        t: 0,
        label: "Introduction",
        steps: [{ body: "# Python for Beginners\n# Follow along — this file is reconstructed from the video.\n" }],
      },
      {
        t: 75,
        label: "Your first Python program",
        steps: [
          { dt: 0, body: "" },
          { dt: 8, body: 'print("Hello World")\n' },
          { dt: 28, body: 'print("Hello World")\nprint("o----")\n' },
          { dt: 42, body: 'print("Hello World")\nprint("o----")\nprint(" ||||")\n' },
          { dt: 70, body: 'print("Hello World")\nprint("o----")\nprint(" ||||")\nprint("*" * 10)\n' },
        ],
      },
      {
        t: 330,
        label: "Variables",
        steps: [
          { dt: 0, body: "price = 10\n" },
          { dt: 15, body: "price = 10\nprice = 20\n" },
          { dt: 35, body: "price = 10\nprice = 20\nrating = 4.9\n" },
          { dt: 55, body: 'price = 10\nprice = 20\nrating = 4.9\nname = "Mosh"\n' },
          {
            dt: 80,
            body: 'price = 10\nprice = 20\nrating = 4.9\nname = "Mosh"\nis_published = False\n',
          },
          {
            dt: 140,
            body: `full_name = "John Smith"
age = 20
is_new = True
`,
          },
        ],
      },
      {
        t: 548,
        label: "Receiving input",
        steps: [
          { dt: 0, body: 'name = input("What is your name? ")\n' },
          {
            dt: 20,
            body: 'name = input("What is your name? ")\nprint("Hi " + name)\n',
          },
          {
            dt: 70,
            body: `name = input("What is your name? ")
favorite_color = input("What is your favorite color? ")
print(name + " likes " + favorite_color)
`,
          },
        ],
      },
      {
        t: 648,
        label: "Type conversion",
        steps: [
          { dt: 0, body: 'birth_year = input("Birth year: ")\n' },
          {
            dt: 25,
            body: 'birth_year = input("Birth year: ")\nage = 2019 - int(birth_year)\nprint(age)\n',
          },
          {
            dt: 55,
            body: `birth_year = input("Birth year: ")
print(type(birth_year))
age = 2019 - int(birth_year)
print(type(age))
print(age)
`,
          },
          {
            dt: 200,
            body: `weight_lbs = input("Weight (lbs): ")
weight_kg = int(weight_lbs) * 0.45
print(weight_kg)
`,
          },
        ],
      },
      {
        t: 1129,
        label: "Strings",
        steps: [
          { dt: 0, body: 'course = "Python for Beginners"\nprint(course)\n' },
          {
            dt: 30,
            body: `course = "Python for Beginners"
print(course[0])
print(course[-1])
print(course[0:3])
print(course[1:])
print(course[:5])
another = course[:]
print(another)
`,
          },
          {
            dt: 80,
            body: `name = "Jennifer"
print(name[1:-1])
`,
          },
          {
            dt: 130,
            body: `first = "John"
last = "Smith"
message = first + " [" + last + "] is a coder"
msg = f"{first} [{last}] is a coder"
print(message)
print(msg)
`,
          },
          {
            dt: 200,
            body: `course = "Python for Beginners"
print(len(course))
print(course.upper())
print(course.lower())
print(course.find("P"))
print(course.find("Beginners"))
print(course.replace("Beginners", "Absolute Beginners"))
print("Python" in course)
`,
          },
        ],
      },
      {
        t: 1421,
        label: "Arithmetic operators",
        steps: [
          {
            dt: 0,
            body: `print(10 + 3)
print(10 - 3)
print(10 * 3)
print(10 / 3)
print(10 // 3)
print(10 % 3)
print(10 ** 3)
`,
          },
          {
            dt: 40,
            body: `x = 10
x = x + 3
x += 3
print(x)
`,
          },
          {
            dt: 80,
            body: `x = 10 + 3 * 2
print(x)
x = (10 + 3) * 2 ** 2
print(x)
`,
          },
        ],
      },
      {
        t: 1631,
        label: "Comparison operators",
        steps: [
          {
            dt: 0,
            body: `temperature = 30

if temperature > 30:
    print("It's a hot day")
else:
    print("It's not a hot day")
`,
          },
          {
            dt: 40,
            body: `temperature = 35

if temperature > 30:
    print("It's a hot day")
else:
    print("It's not a hot day")
`,
          },
        ],
      },
      {
        t: 1732,
        label: "Logical operators",
        steps: [
          {
            dt: 0,
            body: `has_high_income = True
has_good_credit = True

if has_high_income and has_good_credit:
    print("Eligible for loan")
`,
          },
          {
            dt: 35,
            body: `has_high_income = False
has_good_credit = True

if has_high_income or has_good_credit:
    print("Eligible for loan")
`,
          },
          {
            dt: 70,
            body: `has_good_credit = True
has_criminal_record = False

if has_good_credit and not has_criminal_record:
    print("Eligible for loan")
`,
          },
        ],
      },
      {
        t: 1866,
        label: "If statements",
        steps: [
          {
            dt: 0,
            body: `is_hot = False
is_cold = True

if is_hot:
    print("It's a hot day")
    print("Drink plenty of water")
elif is_cold:
    print("It's a cold day")
    print("Wear warm clothes")
else:
    print("It's a lovely day")

print("Enjoy your day")
`,
          },
          {
            dt: 80,
            body: `price = 1000000
has_good_credit = True

if has_good_credit:
    down_payment = 0.1 * price
else:
    down_payment = 0.2 * price

print(f"Down payment: \${down_payment}")
`,
          },
          {
            dt: 160,
            body: `name = "J"

if len(name) < 3:
    print("Name must be at least 3 characters")
elif len(name) > 50:
    print("Name must be a maximum of 50 characters")
else:
    print("Name looks good!")
`,
          },
        ],
      },
      {
        t: 2176,
        label: "Weight converter",
        steps: [
          {
            dt: 0,
            body: `weight = int(input("Weight: "))
unit = input("(L)bs or (K)g: ")
`,
          },
          {
            dt: 40,
            body: `weight = int(input("Weight: "))
unit = input("(L)bs or (K)g: ")

if unit.upper() == "L":
    converted = weight * 0.45
    print(f"You are {converted} kilos")
else:
    converted = weight / 0.45
    print(f"You are {converted} pounds")
`,
          },
        ],
      },
      {
        t: 2502,
        label: "While loops",
        steps: [
          {
            dt: 0,
            body: `i = 1
while i <= 5:
    print(i)
    i = i + 1
print("Done")
`,
          },
          {
            dt: 30,
            body: `i = 1
while i <= 5:
    print("*" * i)
    i = i + 1
print("Done")
`,
          },
          {
            dt: 80,
            body: `secret_number = 9
guess_count = 0
guess_limit = 3
while guess_count < guess_limit:
    guess = int(input("Guess: "))
    guess_count += 1
    if guess == secret_number:
        print("You won!")
        break
else:
    print("Sorry, you failed!")
`,
          },
          {
            dt: 150,
            body: `command = ""
started = False
while True:
    command = input("> ").lower()
    if command == "start":
        if started:
            print("Car is already started!")
        else:
            started = True
            print("Car started...")
    elif command == "stop":
        if not started:
            print("Car is already stopped!")
        else:
            started = False
            print("Car stopped.")
    elif command == "help":
        print("""
start - to start the car
stop - to stop the car
quit - to quit
        """)
    elif command == "quit":
        break
    else:
        print("Sorry, I don't understand that!")
`,
          },
        ],
      },
      {
        t: 2711,
        label: "Lists",
        steps: [
          {
            dt: 0,
            body: `names = ["John", "Bob", "Mosh", "Sarah", "Mary"]
print(names)
print(names[0])
print(names[-1])
print(names[2:])
names[0] = "Jon"
print(names)
`,
          },
          {
            dt: 70,
            body: `numbers = [3, 6, 2, 8, 4, 10]
max_number = numbers[0]
for number in numbers:
    if number > max_number:
        max_number = number
print(max_number)
`,
          },
          {
            dt: 130,
            body: `matrix = [
    [1, 2, 3],
    [4, 5, 6],
    [7, 8, 9],
]
print(matrix[0][1])
for row in matrix:
    for item in row:
        print(item)
`,
          },
        ],
      },
      {
        t: 2927,
        label: "List methods",
        steps: [
          {
            dt: 0,
            body: `numbers = [5, 2, 1, 7, 4]
numbers.append(20)
print(numbers)
`,
          },
          {
            dt: 20,
            body: `numbers = [5, 2, 1, 7, 4]
numbers.append(20)
numbers.insert(0, 10)
numbers.remove(5)
print(numbers)
print(5 in numbers)
print(numbers.count(5))
`,
          },
          {
            dt: 55,
            body: `numbers = [5, 2, 1, 7, 4]
numbers.sort()
numbers.reverse()
numbers2 = numbers.copy()
print(numbers)
print(numbers2)
`,
          },
          {
            dt: 90,
            body: `numbers = [2, 2, 4, 6, 3, 4, 6, 1]
uniques = []
for number in numbers:
    if number not in uniques:
        uniques.append(number)
print(uniques)
`,
          },
        ],
      },
      {
        t: 3136,
        label: "For loops and range",
        steps: [
          {
            dt: 0,
            body: `for item in "Python":
    print(item)
`,
          },
          {
            dt: 20,
            body: `for item in ["Mosh", "John", "Sarah"]:
    print(item)
`,
          },
          {
            dt: 40,
            body: `for item in range(10):
    print(item)
`,
          },
          {
            dt: 55,
            body: `for item in range(5, 10, 2):
    print(item)
`,
          },
          {
            dt: 80,
            body: `prices = [10, 20, 30]
total = 0
for price in prices:
    total += price
print(f"Total: {total}")
`,
          },
          {
            dt: 110,
            body: `for x in range(4):
    for y in range(3):
        print(f"({x}, {y})")
`,
          },
        ],
      },
      {
        t: 3260,
        label: "Tuples and unpacking",
        steps: [
          {
            dt: 0,
            body: `numbers = (1, 2, 3)
print(numbers[0])
`,
          },
          {
            dt: 30,
            body: `coordinates = (1, 2, 3)
x, y, z = coordinates
print(y)
`,
          },
        ],
      },
      {
        t: 3295,
        label: "Dictionaries",
        steps: [
          {
            dt: 0,
            body: `customer = {
    "name": "John Smith",
    "age": 30,
    "is_verified": True,
}
print(customer["name"])
print(customer.get("name"))
print(customer.get("birthdate", "Jan 1 1980"))
`,
          },
          {
            dt: 50,
            body: `phone = input("Phone: ")
digits_mapping = {
    "1": "One",
    "2": "Two",
    "3": "Three",
    "4": "Four",
}
output = ""
for ch in phone:
    output += digits_mapping.get(ch, "!") + " "
print(output)
`,
          },
        ],
      },
      {
        t: 3345,
        label: "Emoji converter",
        steps: [
          {
            dt: 0,
            body: `message = input("> ")
words = message.split(" ")
emojis = {
    ":)": "😊",
    ":(": "😞",
}
output = ""
for word in words:
    output += emojis.get(word, word) + " "
print(output)
`,
          },
        ],
      },
      {
        t: 3375,
        label: "Functions",
        steps: [
          {
            dt: 0,
            body: `def greet_user():
    print("Hi there!")
    print("Welcome aboard")


print("Start")
greet_user()
print("Finish")
`,
          },
          {
            dt: 30,
            body: `def greet_user(first_name, last_name):
    print(f"Hi {first_name} {last_name}!")
    print("Welcome aboard")


print("Start")
greet_user("John", "Smith")
print("Finish")
`,
          },
          {
            dt: 55,
            body: `def greet_user(first_name, last_name):
    print(f"Hi {first_name} {last_name}!")
    print("Welcome aboard")


print("Start")
greet_user(last_name="Smith", first_name="John")
print("Finish")
`,
          },
          {
            dt: 80,
            body: `def square(number):
    return number * number


print(square(3))
`,
          },
          {
            dt: 110,
            body: `def emoji_converter(message):
    words = message.split(" ")
    emojis = {
        ":)": "😊",
        ":(": "😞",
    }
    output = ""
    for word in words:
        output += emojis.get(word, word) + " "
    return output


message = input("> ")
print(emoji_converter(message))
`,
          },
        ],
      },
      {
        t: 3470,
        label: "Exceptions",
        steps: [
          {
            dt: 0,
            body: `try:
    age = int(input("Age: "))
    print(age)
except ValueError:
    print("Invalid value")
`,
          },
          {
            dt: 25,
            body: `try:
    age = int(input("Age: "))
    income = 20000
    risk = income / age
    print(age)
except ZeroDivisionError:
    print("Age cannot be 0.")
except ValueError:
    print("Invalid value")
`,
          },
        ],
      },
      {
        t: 3495,
        label: "Comments",
        steps: [
          {
            dt: 0,
            body: `# This is a comment explaining the next line.
print("Sky is blue")
`,
          },
        ],
      },
      {
        t: 3505,
        label: "Classes and constructors",
        steps: [
          {
            dt: 0,
            body: `class Point:
    def move(self):
        print("move")

    def draw(self):
        print("draw")


point1 = Point()
point1.x = 10
point1.y = 20
print(point1.x)
point1.draw()

point2 = Point()
point2.x = 1
print(point2.x)
`,
          },
          {
            dt: 30,
            body: `class Point:
    def __init__(self, x, y):
        self.x = x
        self.y = y

    def move(self):
        print("move")

    def draw(self):
        print("draw")


point = Point(10, 20)
print(point.x)
`,
          },
          {
            dt: 50,
            body: `class Person:
    def __init__(self, name):
        self.name = name

    def talk(self):
        print(f"Hi, I am {self.name}")


john = Person("John Smith")
john.talk()

bob = Person("Bob Smith")
bob.talk()
`,
          },
        ],
      },
      {
        t: 3545,
        label: "Inheritance",
        steps: [
          {
            dt: 0,
            body: `class Mammal:
    def walk(self):
        print("walk")


class Dog(Mammal):
    def bark(self):
        print("bark")


class Cat(Mammal):
    def be_annoying(self):
        print("annoying")


dog1 = Dog()
dog1.walk()
dog1.bark()
`,
          },
        ],
      },
      {
        t: 3558,
        label: "Modules",
        steps: [
          {
            dt: 0,
            file: "converters.py",
            extraFiles: { "converters.py": converters },
            body: converters,
          },
          {
            dt: 8,
            file: "app.py",
            extraFiles: { "converters.py": converters },
            body: `import converters
from converters import kg_to_lbs

print(converters.kg_to_lbs(70))
print(kg_to_lbs(70))
`,
          },
          {
            dt: 20,
            file: "utils.py",
            extraFiles: { "converters.py": converters, "utils.py": utils },
            body: utils,
          },
          {
            dt: 28,
            file: "app.py",
            extraFiles: { "converters.py": converters, "utils.py": utils },
            body: `from utils import find_max

numbers = [10, 3, 6, 2]
maximum = find_max(numbers)
print(maximum)
`,
          },
        ],
      },
      {
        t: 3586,
        label: "Generating random values",
        steps: [
          {
            dt: 0,
            extraFiles: { "converters.py": converters, "utils.py": utils },
            body: `import random

for i in range(3):
    print(random.random())
    print(random.randint(10, 20))

members = ["John", "Mary", "Bob", "Mosh"]
leader = random.choice(members)
print(leader)
`,
          },
          {
            dt: 20,
            extraFiles: { "converters.py": converters, "utils.py": utils },
            body: `import random


class Dice:
    def roll(self):
        first = random.randint(1, 6)
        second = random.randint(1, 6)
        return first, second


dice = Dice()
print(dice.roll())
`,
          },
        ],
      },
      {
        t: 3600,
        label: "Files and directories",
        steps: [
          {
            dt: 0,
            extraFiles: { "converters.py": converters, "utils.py": utils },
            body: `from pathlib import Path

path = Path("ecommerce")
print(path.exists())

path = Path()
for file in path.glob("*.py"):
    print(file)
`,
          },
        ],
      },
    ],
  });

  return {
    videoId: MOSH_PYTHON_ID,
    title: "Python for Beginners – Learn Coding with Python in 1 Hour",
    channel: "Programming with Mosh",
    duration: 3606,
    language: "python",
    tutorialGoalSummary:
      "A one-hour beginner Python course covering primitives, control flow, collections, functions, exceptions, classes, modules, and a few small exercises (weight converter, guessing game, car game, emoji converter, dice).",
    inferredProjectStructure: {
      files: ["app.py", "tutorial.py", "converters.py", "utils.py"],
      description:
        "Single-file examples that later split into reusable modules (converters, utils). tutorial.py is the stitched reconstruction of every example.",
      entrypoint: "app.py",
      language: "python",
    },
    snapshots,
    transcript: [],
    source: "seed",
    status: "ready",
    progress: 100,
    message: "Seeded reconstruction ready",
    thumbnailUrl: thumbnailUrl(MOSH_PYTHON_ID),
    editorTheme: "chronos-dark",
    processedAt: new Date().toISOString(),
  };
}
