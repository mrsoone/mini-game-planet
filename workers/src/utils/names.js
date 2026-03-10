const ADJECTIVES = [
  'Blue','Red','Gold','Silver','Green','Dark','Bright','Swift','Lucky','Wild',
  'Brave','Calm','Cool','Fire','Ice','Iron','Jade','Neon','Royal','Sage',
  'Storm','Zen','Pixel','Turbo','Cosmic','Phantom','Solar','Lunar','Velvet','Thunder'
];

const ANIMALS = [
  'Fox','Eagle','Panda','Wolf','Hawk','Bear','Lynx','Orca','Crow','Dove',
  'Falcon','Tiger','Cobra','Phoenix','Dragon','Shark','Raven','Viper','Mantis','Jaguar',
  'Osprey','Bison','Gecko','Heron','Mamba','Otter','Sparrow','Stag','Wren','Yak'
];

export function generateName() {
  const buf = new Uint32Array(3);
  crypto.getRandomValues(buf);
  const adj = ADJECTIVES[buf[0] % ADJECTIVES.length];
  const animal = ANIMALS[buf[1] % ANIMALS.length];
  const num = String(buf[2] % 100).padStart(2, '0');
  return `${adj}${animal}${num}`;
}

const SLUR_FRAGMENTS = [
  'fuck','shit','ass','dick','cunt','bitch','nigger','nigga','faggot','retard',
  'slut','whore','cock','pussy','damn','bastard','piss','crap'
];

export function isNameClean(name) {
  if (!name || typeof name !== 'string') return false;
  if (name.length < 3 || name.length > 20) return false;
  if (!/^[a-zA-Z0-9 ]+$/.test(name)) return false;
  const lower = name.toLowerCase().replace(/\s/g, '');
  return !SLUR_FRAGMENTS.some(s => lower.includes(s));
}
