const makeSeed = () => `seed_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

const createRng = (seed: string) => {
  let state = 0;
  for (let i = 0; i < seed.length; i += 1) {
    state = (state * 31 + seed.charCodeAt(i)) % 2147483647;
  }
  return () => {
    state = (state * 48271) % 2147483647;
    return state / 2147483647;
  };
};

const buildIdenticon = (seed: string) => {
  const rng = createRng(seed);
  const grid: boolean[] = [];
  for (let row = 0; row < 5; row += 1) {
    const rowValues = [rng() > 0.5, rng() > 0.5, rng() > 0.5];
    const mirrored = [...rowValues, rowValues[1], rowValues[0]];
    grid.push(...mirrored);
  }
  const palette = ['#4f46e5', '#0ea5e9', '#22c55e', '#f97316', '#ec4899'];
  const colorIndex = Math.abs(seed.split('').reduce((sum, char) => sum + char.charCodeAt(0), 0)) % palette.length;
  return { grid, color: palette[colorIndex] };
};

export { buildIdenticon, makeSeed };
