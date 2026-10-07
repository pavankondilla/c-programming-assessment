// Loaded by the examiner screen only. This is demo access control, not a secret key.
// Checked against C17 semantics; whitespace variants are accepted deliberately.
export const answerKey: Record<string, string[]> = {
  b1: ['stdio.h'], b2: ['printf', 'printf()'], b3: ['scanf', 'scanf()'], b4: ['%d'],
  b5: ['&'], b6: ['%'], b7: ['0'], b8: ['3'], b9: ['2'], b10: ['=='],
  b11: ['else'], b12: ['10'], b13: ['1'], b14: ['0'], b15: ['n-1'], b16: ['10'],
  b17: ['arr[i]'], b18: ['double'], b19: ['linear', 'sequential'], b20: ['ascending'],
  b21: ["'\\0'"], b22: ['strlen', 'strlen()'], b23: ['*'], b24: ['&'], b25: ['*'],
  b26: ['malloc', 'malloc()'], b27: ['free', 'free()'], b28: ['w'], b29: ['fclose', 'fclose()'], b30: ['struct'],
};
export function markBlank(id: string, answer: string) {
  let value = answer.trim();
  if (['b15', 'b17'].includes(id)) value = value.replace(/\s/g, '');
  if (['b19', 'b20'].includes(id)) value = value.toLowerCase();
  return answerKey[id]?.includes(value) ? 1 : 0;
}
