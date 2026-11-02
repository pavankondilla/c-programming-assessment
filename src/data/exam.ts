import paper from '../../q.txt?raw';

export const EXAM_VERSION = 'c-2026.2';
export const DURATION_MS = 180 * 60 * 1000;
export type Difficulty = 'Hard' | 'Medium' | 'Easy';
export type Question = { id: string; number: number; title: string; prompt: string; marks: number; difficulty?: Difficulty; part?: string };

// Parts A-E total 70 coding marks. The unchanged 30 blanks add 30 marks.
export const CODING_MARKS = [4, 2, 2, 2, 2, 4, 4, 4, 3, 3, 4, 6, 7, 8, 15] as const;
function parseCodingPaper(text: string): Question[] {
  const found: { number: number; title: string; prompt: string; part: string }[] = [];
  let part = 'Part A - C Programming Fundamentals';
  let current: { number: number; title: string; lines: string[]; part: string } | null = null;
  const finish = () => {
    if (current) found.push({ number: current.number, title: current.title, prompt: current.lines.join('\n').trim(), part: current.part });
  };
  for (const line of text.replace(/\r\n/g, '\n').split('\n')) {
    const section = line.trim();
    if (/^Part [B-E]\s*[-\u2014]/.test(section)) { finish(); current = null; part = section; continue; }
    const match = /^Q(\d+)\.\s*(.+)$/.exec(section);
    if (match) { finish(); current = { number: Number(match[1]), title: match[2].trim(), lines: [], part }; continue; }
    if (current) current.lines.push(line);
  }
  finish();
  if (found.length !== CODING_MARKS.length || found.some((q, i) => q.number !== i + 1 || !q.prompt)) throw new Error('q.txt must contain Q1 through Q15 with a prompt for each question.');
  return found.map((q, i) => ({
    id: `c${i + 1}`, number: q.number, title: q.title, prompt: q.prompt, part: q.part, marks: CODING_MARKS[i],
    difficulty: CODING_MARKS[i] >= 6 ? 'Hard' : CODING_MARKS[i] >= 3 ? 'Medium' : 'Easy',
  }));
}
export const codingQuestions: Question[] = parseCodingPaper(paper);

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
