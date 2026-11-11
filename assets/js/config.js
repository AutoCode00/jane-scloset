// The one place to set the contract address and links.
// Leave `contract` empty to run in preview mode (a simulated contract saved in this browser).
export const CONFIG = {
  networks: {
    mainnet: {
      chainId: 677,
      name: 'BOT Chain',
      rpc: 'https://rpc.botchain.ai',
      explorer: 'https://scan.botchain.ai',
      contract: '0xF1b943397ef9537f23b310426dC10d835A93b075', // ← Jane's Closet on BOT Chain mainnet (also put it in the README)
    },
    testnet: {
      chainId: 968,
      name: 'BOT Chain Testnet',
      rpc: 'https://rpc.bohr.life',
      explorer: 'https://scan.bohr.life',
      contract: '', // ← testnet address (used with ?net=testnet)
    },
  },
  links: {
    botchain: 'https://botchain.ai',
    github: 'https://github.com/AutoCode00/jane-scloset',
    x: 'https://x.com/',
  },
  storageKey: 'janescloset',
};

// The 30 daily themes. The contract picks the index: day % 30.
export const THEMES = [
  'Picnic in the park', 'Starry night party', 'Rainy day cosy', 'Beach holiday', 'Tea party',
  'Space explorer', 'Winter wonderland', 'Garden fairy', 'Rockstar', 'Pyjama party',
  'First day of school', 'Birthday bash', 'Café date', 'Candy land', 'Under the sea',
  'Royal ball', 'Sporty spice', 'Cherry blossom', 'Sweater weather', 'Disco fever',
  'Rainbow everything', 'Cottagecore', 'Monochrome magic', 'Ice-cream social', 'Movie premiere',
  'Camping trip', 'Pastel princess', 'Totally retro', 'Spring showers', 'Sleepover chic',
];
