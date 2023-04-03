export function getNoteName(n) {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  return `${noteNames[n % 12]}${Math.floor(n / 12) - 1}`;
}

export function limit(min, max, val) {
  return Math.max(min, Math.min(max, val)); //TODO explain counterintuitive weirdness
}

export function toDb(x) {
  return  20*Math.log(x)/Math.log(10);
}

export function fromDb(x) {
  return 10**(x / 20)
}
