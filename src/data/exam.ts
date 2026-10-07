export const EXAM_VERSION = 'c-2026.1';
export const DURATION_MS = 180 * 60 * 1000;
export type Difficulty = 'Hard' | 'Medium' | 'Easy';
export type Question = { id: string; number: number; title: string; prompt: string; marks: number; difficulty?: Difficulty };

export const codingQuestions: Question[] = [
  { id: 'c1', number: 1, title: 'Student Management System', marks: 10, difficulty: 'Hard', prompt: 'Write a menu-driven C program using structures and functions to manage up to 100 students. Store roll number, name and marks out of 100. Support adding students, displaying students, searching by roll number, displaying the student with the highest marks, calculating average marks and exiting. Reject duplicate roll numbers and invalid marks. Handle an empty list.' },
  { id: 'c2', number: 2, title: 'Student File Operations', marks: 10, difficulty: 'Hard', prompt: 'Accept a student’s roll number, name and marks. Write the details to student.txt, close the file, reopen it and display its contents. Handle file-opening failures. Names may contain spaces.' },
  { id: 'c3', number: 3, title: 'Dynamic Memory Allocation', marks: 10, difficulty: 'Hard', prompt: 'Accept a positive n. Use malloc() to allocate space for n integers. Check allocation success, accept and display the integers, calculate sum and floating-point average, and release memory with free().' },
  { id: 'c4', number: 4, title: 'Array Sorting and Searching', marks: 10, difficulty: 'Hard', prompt: 'Accept 1–100 integers. Sort them in ascending order without a library sorting function. Display the sorted array. Perform linear search for an input value. Display its first position in the sorted array, counting from 1, or “Not found.”' },
  { id: 'c5', number: 5, title: 'Prime Number', marks: 5, difficulty: 'Medium', prompt: 'Check whether an input integer is prime. Correctly handle values less than 2.' },
  { id: 'c6', number: 6, title: 'Array Statistics', marks: 5, difficulty: 'Medium', prompt: 'Accept 1–100 integers and display the largest, smallest, sum and floating-point average.' },
  { id: 'c7', number: 7, title: 'String Length Using Pointers', marks: 5, difficulty: 'Medium', prompt: 'Read a string and calculate its length using a pointer without strlen(). Count spaces, but exclude the terminating null character and input newline.' },
  { id: 'c8', number: 8, title: 'Menu-Driven Calculator', marks: 5, difficulty: 'Medium', prompt: 'Use a loop and switch to offer Add, Subtract, Multiply, Divide and Exit. Accept two numbers for each calculation. Handle division by zero and invalid choices. Repeat until Exit.' },
  { id: 'c9', number: 9, title: 'Arithmetic Operations', marks: 2.5, difficulty: 'Easy', prompt: 'Accept two integers and display addition, subtraction, multiplication, integer division and remainder. Handle a zero second operand before division or modulus.' },
  { id: 'c10', number: 10, title: 'Even or Odd', marks: 2.5, difficulty: 'Easy', prompt: 'Check whether an input integer is even or odd.' },
  { id: 'c11', number: 11, title: 'Largest of Three', marks: 2.5, difficulty: 'Easy', prompt: 'Use if-else to display the largest of three integers. Handle equal values.' },
  { id: 'c12', number: 12, title: 'Multiplication Table', marks: 2.5, difficulty: 'Easy', prompt: 'Use a loop to print an input integer’s multiplication table from 1 to 10.' },
];

const blankPrompts = [
  'The standard input/output header is #include <________>.',
  'The function commonly used to display formatted output is ________().',
  'The function commonly used to read formatted input is ________().',
  'The format specifier for int is ________.',
  'Complete: scanf("%d", ________n);',
  'The integer remainder operator is ________.',
  'Complete: n % 2 == ________.',
  'With integer operands, 17 / 5 evaluates to ________.',
  '17 % 5 evaluates to ________.',
  'The equality comparison operator is ________.',
  'Complete: if (a > b) printf("%d", a); ________ printf("%d", b);',
  'Complete: for (i = 1; i <= ________; i++) to iterate from 1 through 10.',
  'An integer must be greater than ________ to be prime.',
  'The first array index is ________.',
  'The last valid index of an array containing n elements is ________.',
  'Complete: int numbers[________]; to hold 10 integers.',
  'Complete: sum = sum + ________; using array arr and index i.',
  'Complete: average = (________)sum / n; using the type double.',
  'Checking array elements one at a time is called ________ search.',
  'Smallest-to-largest sorting is ________ order.',
  'The terminating null character literal is ________.',
  'The standard string-length function is ________().',
  'Complete an integer pointer declaration: int ________p;',
  'Complete: p = ________x; to store x’s address.',
  'Complete: value = ________p; to access the pointed-to integer.',
  'The dynamic memory allocation function is ________().',
  'The function that releases dynamically allocated memory is ________().',
  'Complete: FILE *fp = fopen("student.txt", "________"); for writing.',
  'The function that closes an open file is ________().',
  'Complete: ________ Student { int roll; char name[50]; float marks; };',
];
export const blankQuestions: Question[] = blankPrompts.map((prompt, i) => ({ id: `b${i + 1}`, number: i + 1, title: `Blank ${i + 1}`, prompt, marks: 1 }));
export const questions = [...codingQuestions, ...blankQuestions];
export const STARTER_CODE = '#include <stdio.h>\n\nint main(void) {\n    // Write your solution here.\n\n    return 0;\n}\n';
