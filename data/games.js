// MiniGamePlanet — Complete 100-Game Catalog
// Each entry: name, slug, category, description, icon, accent color, keywords, built flag

export const categories = [
  { name: 'Arcade',   icon: '🕹', accent: '#0891B2' },
  { name: 'Puzzle',   icon: '🧩', accent: '#2563EB' },
  { name: 'Card',     icon: '🃏', accent: '#DC2626' },
  { name: 'Word',     icon: '🔤', accent: '#D97706' },
  { name: 'Strategy', icon: '♟️', accent: '#0D9488' },
  { name: 'Casino',   icon: '🎰', accent: '#059669' },
  { name: 'Casual',   icon: '🎯', accent: '#E11D48' },
  { name: 'Action',   icon: '🏃', accent: '#EA580C' },
  { name: 'Board',    icon: '🎲', accent: '#4F46E5' },
  { name: 'Builder',  icon: '🏗', accent: '#0891B2' },
  { name: 'Math',     icon: '📐', accent: '#0284C7' },
  { name: 'Trivia',   icon: '🌍', accent: '#6D28D9' },
];

export const games = [

  // ─── CARD (10) ────────────────────────────────────────────────

  {
    name: 'Blackjack',
    slug: 'blackjack',
    category: 'Card',
    description: 'Play free online Blackjack. Hit, stand, double down or split — beat the dealer to 21 without going bust in this classic card game.',
    icon: '🂡',
    accent: '#DC2626',
    keywords: ['blackjack', '21', 'card game', 'casino card'],
    built: false
  },
  {
    name: 'Klondike Solitaire',
    slug: 'solitaire',
    category: 'Card',
    description: 'Classic Klondike Solitaire with draw-3 rules. Drag and drop cards to build foundation piles from Ace to King in this timeless patience game.',
    icon: '🃏',
    accent: '#DC2626',
    keywords: ['solitaire', 'klondike', 'patience', 'card game'],
    built: false
  },
  {
    name: 'Spider Solitaire',
    slug: 'spider-solitaire',
    category: 'Card',
    description: 'Free Spider Solitaire with 1-suit, 2-suit, and 4-suit difficulty modes. Build descending sequences and clear the tableau.',
    icon: '🕷',
    accent: '#DC2626',
    keywords: ['spider solitaire', 'card game', 'patience', 'solitaire variant'],
    built: false
  },
  {
    name: 'FreeCell',
    slug: 'freecell',
    category: 'Card',
    description: 'Play FreeCell Solitaire online — every deal is solvable. Use four free cells strategically to move all cards to the foundations.',
    icon: '🗃',
    accent: '#DC2626',
    keywords: ['freecell', 'solitaire', 'card game', 'strategy card'],
    built: false
  },
  {
    name: 'Video Poker',
    slug: 'video-poker',
    category: 'Card',
    description: 'Free Video Poker — Jacks or Better. Hold your best cards, draw replacements, and aim for a Royal Flush in this fast-paced poker game.',
    icon: '🎰',
    accent: '#DC2626',
    keywords: ['video poker', 'jacks or better', 'poker', 'card game'],
    built: false
  },
  {
    name: 'War Card Game',
    slug: 'war',
    category: 'Card',
    description: 'Play the classic War card game online. Flip cards against your opponent — highest card wins. Experience the thrill of ties going to war.',
    icon: '⚔',
    accent: '#DC2626',
    keywords: ['war card game', 'card battle', 'simple card game'],
    built: false
  },
  {
    name: 'Memory Match',
    slug: 'memory-match',
    category: 'Card',
    description: 'Test your memory with this matching card game. Flip pairs of cards to find matches across multiple grid sizes and emoji themes.',
    icon: '🧠',
    accent: '#DC2626',
    keywords: ['memory match', 'matching game', 'concentration', 'pairs'],
    built: false
  },
  {
    name: 'Go Fish',
    slug: 'go-fish',
    category: 'Card',
    description: 'Play Go Fish against a smart AI opponent. Ask for cards, collect sets of four, and outsmart the computer in this beloved card game.',
    icon: '🐟',
    accent: '#DC2626',
    keywords: ['go fish', 'card game', 'kids card game', 'family game'],
    built: false
  },
  {
    name: 'Crazy Eights',
    slug: 'crazy-eights',
    category: 'Card',
    description: 'Free Crazy Eights card game with up to 3 AI opponents. Match suits or ranks, play wild eights, and be the first to empty your hand.',
    icon: '8️⃣',
    accent: '#DC2626',
    keywords: ['crazy eights', 'card game', 'uno style', 'family card game'],
    built: false
  },
  {
    name: 'High Low Card Game',
    slug: 'high-low',
    category: 'Card',
    description: 'Guess if the next card is higher or lower. Build your streak in this fast, addictive card guessing game with satisfying combo rewards.',
    icon: '📊',
    accent: '#DC2626',
    keywords: ['high low', 'higher lower', 'card guessing', 'streak game'],
    built: false
  },

  // ─── ARCADE (12) ──────────────────────────────────────────────

  {
    name: 'Snake',
    slug: 'snake',
    category: 'Arcade',
    description: 'Play the classic Snake game online. Guide your snake to eat food and grow longer without hitting the walls or your own tail.',
    icon: '🐍',
    accent: '#0891B2',
    keywords: ['snake game', 'classic arcade', 'retro game', 'nokia snake'],
    built: false
  },
  {
    name: 'Pong',
    slug: 'pong',
    category: 'Arcade',
    description: 'Free online Pong with AI opponents and 2-player mode. The original arcade classic — paddle, ball, and pure competitive fun.',
    icon: '🏓',
    accent: '#0891B2',
    keywords: ['pong', 'table tennis', 'arcade classic', 'two player'],
    built: false
  },
  {
    name: 'Brick Breaker',
    slug: 'breakout',
    category: 'Arcade',
    description: 'Smash bricks with a bouncing ball in this free Breakout-style game. Collect power-ups and clear every level in this arcade classic.',
    icon: '🧱',
    accent: '#0891B2',
    keywords: ['brick breaker', 'breakout', 'arcade', 'ball game'],
    built: false
  },
  {
    name: 'Asteroids',
    slug: 'asteroids',
    category: 'Arcade',
    description: 'Pilot your ship through asteroid fields. Rotate, thrust, and shoot to survive in this faithful recreation of the arcade legend.',
    icon: '☄',
    accent: '#0891B2',
    keywords: ['asteroids', 'space shooter', 'arcade classic', 'retro'],
    built: false
  },
  {
    name: 'Space Invaders',
    slug: 'space-invaders',
    category: 'Arcade',
    description: 'Defend Earth from descending alien waves. Shoot invaders, protect your shields, and face bosses in this iconic arcade shooter.',
    icon: '👾',
    accent: '#0891B2',
    keywords: ['space invaders', 'alien shooter', 'arcade shooter', 'retro'],
    built: false
  },
  {
    name: 'Flappy Jump',
    slug: 'flappy-jump',
    category: 'Arcade',
    description: 'Tap to flap through pipes in this addictive one-button arcade game. Simple to learn, fiendishly hard to master. How far can you go?',
    icon: '🐦',
    accent: '#0891B2',
    keywords: ['flappy game', 'one tap game', 'pipe game', 'arcade'],
    built: false
  },
  {
    name: 'Fruit Slicer',
    slug: 'fruit-slicer',
    category: 'Arcade',
    description: 'Swipe to slice falling fruit and rack up combos. Avoid bombs and chain slices for massive bonus points in this juicy arcade game.',
    icon: '🍉',
    accent: '#0891B2',
    keywords: ['fruit slicer', 'fruit ninja', 'swipe game', 'touch arcade'],
    built: false
  },
  {
    name: 'Endless Runner',
    slug: 'endless-runner',
    category: 'Arcade',
    description: 'Run, jump, and duck through an endless obstacle course. Collect coins, dodge barriers, and chase your best distance in this runner.',
    icon: '🏃',
    accent: '#0891B2',
    keywords: ['endless runner', 'running game', 'side scroller', 'obstacle game'],
    built: false
  },
  {
    name: 'Whack-a-Mole',
    slug: 'whack-a-mole',
    category: 'Arcade',
    description: 'Whack moles as they pop up from their holes. Hit golden moles for bonus points, but watch out for bombs in this frantic tapping game.',
    icon: '🔨',
    accent: '#0891B2',
    keywords: ['whack a mole', 'tapping game', 'reaction game', 'arcade'],
    built: false
  },
  {
    name: 'Helicopter',
    slug: 'helicopter-game',
    category: 'Arcade',
    description: 'Hold to rise, release to fall. Navigate your helicopter through tight cave passages in this addictive one-button distance game.',
    icon: '🚁',
    accent: '#0891B2',
    keywords: ['helicopter game', 'cave flyer', 'one button', 'distance game'],
    built: false
  },
  {
    name: 'Target Shooter',
    slug: 'duck-hunt',
    category: 'Arcade',
    description: 'Aim and click to hit moving targets before time runs out. Track your accuracy and compete against your best score in this shooter.',
    icon: '🎯',
    accent: '#0891B2',
    keywords: ['target shooter', 'aim game', 'shooting game', 'accuracy'],
    built: false
  },
  {
    name: 'Dodge Ball',
    slug: 'dodge-ball',
    category: 'Arcade',
    description: 'Dodge falling and bouncing circles to survive as long as possible. Collect power-ups like shields and slow-mo to extend your run.',
    icon: '⚡',
    accent: '#0891B2',
    keywords: ['dodge ball', 'dodge game', 'survival', 'avoidance game'],
    built: false
  },

  // ─── PUZZLE (14) ──────────────────────────────────────────────

  {
    name: 'Mine Sweeper',
    slug: 'minesweeper',
    category: 'Puzzle',
    description: 'Sweep for mines in this free online Mine Sweeper. Uncover safe tiles, place flags, and clear the board across three difficulty levels.',
    icon: '💣',
    accent: '#2563EB',
    keywords: ['minesweeper', 'mine sweeper', 'logic puzzle', 'grid game'],
    built: false
  },
  {
    name: '2048',
    slug: 'twenty-forty-eight',
    category: 'Puzzle',
    description: 'Slide and merge numbered tiles to reach 2048 and beyond. A simple concept with deep strategy — how high can you score?',
    icon: '🔢',
    accent: '#2563EB',
    keywords: ['2048', 'number puzzle', 'sliding tiles', 'merge game'],
    built: false
  },
  {
    name: 'Sudoku',
    slug: 'sudoku',
    category: 'Puzzle',
    description: 'Play free Sudoku puzzles at four difficulty levels. Use notes, get hints, and improve your logic skills with this classic number puzzle.',
    icon: '9️⃣',
    accent: '#2563EB',
    keywords: ['sudoku', 'number puzzle', 'logic puzzle', 'brain game'],
    built: false
  },
  {
    name: 'Nonogram',
    slug: 'nonogram',
    category: 'Puzzle',
    description: 'Reveal hidden pictures by filling cells according to number clues. Also known as Picross — a satisfying logic-art puzzle.',
    icon: '🖼',
    accent: '#2563EB',
    keywords: ['nonogram', 'picross', 'griddler', 'picture logic'],
    built: false
  },
  {
    name: 'Sliding Puzzle',
    slug: 'sliding-puzzle',
    category: 'Puzzle',
    description: 'Slide numbered tiles into the correct order. Choose from 3x3, 4x4, or 5x5 grids and race the clock in this classic puzzle.',
    icon: '🔀',
    accent: '#2563EB',
    keywords: ['sliding puzzle', '15 puzzle', 'tile puzzle', 'number slide'],
    built: false
  },
  {
    name: 'Tower of Hanoi',
    slug: 'tower-of-hanoi',
    category: 'Puzzle',
    description: 'Move all discs from one peg to another, never placing a larger disc on a smaller one. A timeless mathematical brain teaser.',
    icon: '🗼',
    accent: '#2563EB',
    keywords: ['tower of hanoi', 'disc puzzle', 'math puzzle', 'brain teaser'],
    built: false
  },
  {
    name: 'Lights Out',
    slug: 'lights-out',
    category: 'Puzzle',
    description: 'Click a light to toggle it and its neighbors. Turn all lights off to solve the puzzle. Simple rules, surprisingly deep challenge.',
    icon: '💡',
    accent: '#2563EB',
    keywords: ['lights out', 'toggle puzzle', 'grid puzzle', 'logic game'],
    built: false
  },
  {
    name: 'Pipe Connect',
    slug: 'pipe-connect',
    category: 'Puzzle',
    description: 'Rotate pipe pieces to connect the water source to the drain before time runs out. Increasingly complex layouts test your spatial logic.',
    icon: '🔧',
    accent: '#2563EB',
    keywords: ['pipe puzzle', 'plumber game', 'connect pipes', 'rotation puzzle'],
    built: false
  },
  {
    name: 'Color Flood',
    slug: 'color-flood',
    category: 'Puzzle',
    description: 'Flood-fill the board from the top-left corner by choosing colors. Clear the entire grid in limited moves across multiple board sizes.',
    icon: '🎨',
    accent: '#2563EB',
    keywords: ['color flood', 'flood fill', 'color puzzle', 'board clear'],
    built: false
  },
  {
    name: 'Jigsaw Puzzle',
    slug: 'jigsaw',
    category: 'Puzzle',
    description: 'Drag and snap jigsaw pieces into place to reveal beautiful geometric images. Choose from 9, 16, or 25 piece puzzles.',
    icon: '🧩',
    accent: '#2563EB',
    keywords: ['jigsaw puzzle', 'drag puzzle', 'picture puzzle', 'relaxing game'],
    built: false
  },
  {
    name: 'Maze Runner',
    slug: 'maze-runner',
    category: 'Puzzle',
    description: 'Navigate procedurally generated mazes from start to exit. Choose your size, enable fog-of-war, and race the clock.',
    icon: '🌀',
    accent: '#2563EB',
    keywords: ['maze game', 'maze runner', 'labyrinth', 'maze puzzle'],
    built: false
  },
  {
    name: 'Box Pusher',
    slug: 'sokoban',
    category: 'Puzzle',
    description: 'Push boxes onto target squares in this strategic puzzle. Plan your moves carefully — one wrong push and you may need to undo.',
    icon: '📦',
    accent: '#2563EB',
    keywords: ['sokoban', 'box pusher', 'push puzzle', 'warehouse game'],
    built: false
  },
  {
    name: 'Block Puzzle',
    slug: 'block-puzzle',
    category: 'Puzzle',
    description: 'Rotate and place falling blocks to complete rows. A fresh take on the classic falling-block puzzle with original shapes and smooth gameplay.',
    icon: '🟦',
    accent: '#2563EB',
    keywords: ['block puzzle', 'falling blocks', 'row clear', 'tile game'],
    built: false
  },
  {
    name: 'Match Three',
    slug: 'match-three',
    category: 'Puzzle',
    description: 'Swap adjacent gems to match three or more in a row. Chain reactions, combos, and timed or endless modes await in this gem-matching game.',
    icon: '💎',
    accent: '#2563EB',
    keywords: ['match three', 'gem game', 'swap puzzle', 'jewel game'],
    built: false
  },

  // ─── WORD (8) ─────────────────────────────────────────────────

  {
    name: 'Word Guess',
    slug: 'word-guess',
    category: 'Word',
    description: 'Guess the hidden 5-letter word in 6 tries. Color-coded clues guide you. Play the daily challenge or unlimited mode anytime.',
    icon: '📝',
    accent: '#D97706',
    keywords: ['word guess', 'five letter word', 'daily word game', 'word puzzle'],
    built: false
  },
  {
    name: 'Hangman',
    slug: 'hangman',
    category: 'Word',
    description: 'Guess the hidden word one letter at a time before the drawing completes. Multiple categories and hundreds of words keep it fresh.',
    icon: '🪢',
    accent: '#D97706',
    keywords: ['hangman', 'word guessing', 'letter game', 'vocabulary game'],
    built: false
  },
  {
    name: 'Word Search',
    slug: 'word-search',
    category: 'Word',
    description: 'Find hidden words in a grid of letters. Swipe to select in any direction. Multiple themes and grid sizes from easy to expert.',
    icon: '🔍',
    accent: '#D97706',
    keywords: ['word search', 'word find', 'grid words', 'hidden words'],
    built: false
  },
  {
    name: 'Anagram Scramble',
    slug: 'anagram-scramble',
    category: 'Word',
    description: 'Unscramble jumbled letters to find the hidden word. Drag tiles or type your answer. Timer and hints keep the pressure on.',
    icon: '🔠',
    accent: '#D97706',
    keywords: ['anagram', 'word scramble', 'unscramble', 'letter puzzle'],
    built: false
  },
  {
    name: 'Typing Race',
    slug: 'typing-race',
    category: 'Word',
    description: 'Test your typing speed with a visual car race. Track WPM and accuracy in real time. Over 200 sentences to practice with.',
    icon: '⌨',
    accent: '#D97706',
    keywords: ['typing test', 'typing race', 'wpm test', 'typing speed'],
    built: false
  },
  {
    name: 'Mini Crossword',
    slug: 'crossword-mini',
    category: 'Word',
    description: 'Solve quick 5x5 crossword puzzles with concise clues. Perfect for a coffee break — challenging but completable in minutes.',
    icon: '✏',
    accent: '#D97706',
    keywords: ['mini crossword', 'crossword puzzle', 'word puzzle', 'clue game'],
    built: false
  },
  {
    name: 'Word Chain',
    slug: 'word-chain',
    category: 'Word',
    description: 'Change one letter at a time to transform a start word into the target word. Find the shortest chain in this clever word ladder puzzle.',
    icon: '🔗',
    accent: '#D97706',
    keywords: ['word chain', 'word ladder', 'letter change', 'word transform'],
    built: false
  },
  {
    name: 'Spelling Bee',
    slug: 'spelling-bee',
    category: 'Word',
    description: 'Create as many words as you can using 7 letters arranged in a honeycomb. Every word must include the center letter. How many can you find?',
    icon: '🐝',
    accent: '#D97706',
    keywords: ['spelling bee', 'honeycomb', 'word finder', 'vocabulary'],
    built: false
  },

  // ─── CASINO (8) ───────────────────────────────────────────────

  {
    name: 'Slot Machine',
    slug: 'slot-machine',
    category: 'Casino',
    description: 'Spin the reels on free 3-reel and 5-reel slot machines. Animated spins, win celebrations, and zero real money — pure entertainment.',
    icon: '🎰',
    accent: '#059669',
    keywords: ['slot machine', 'slots', 'fruit machine', 'free slots'],
    built: false
  },
  {
    name: 'Roulette',
    slug: 'roulette',
    category: 'Casino',
    description: 'Place your bets and watch the ball spin on a European roulette wheel. Realistic ball physics and full betting board — all for fun.',
    icon: '🎡',
    accent: '#059669',
    keywords: ['roulette', 'wheel spin', 'casino game', 'betting game'],
    built: false
  },
  {
    name: 'Dice Roller',
    slug: 'dice-roller',
    category: 'Casino',
    description: 'Roll 1 to 6 dice with satisfying 3D animations. Use preset game modes or free roll. Track your roll history and statistics.',
    icon: '🎲',
    accent: '#059669',
    keywords: ['dice roller', 'dice game', 'roll dice', 'virtual dice'],
    built: false
  },
  {
    name: 'Coin Flip',
    slug: 'coin-flip',
    category: 'Casino',
    description: 'Flip a realistic 3D coin and track your results. See heads vs tails streaks, view probability stats, and test your luck.',
    icon: '🪙',
    accent: '#059669',
    keywords: ['coin flip', 'coin toss', 'heads tails', 'random flip'],
    built: false
  },
  {
    name: 'Spin the Wheel',
    slug: 'spin-the-wheel',
    category: 'Casino',
    description: 'Customize wheel segments and give it a spin. Realistic spin physics, confetti on results, and satisfying tick-tick-tick deceleration.',
    icon: '🎯',
    accent: '#059669',
    keywords: ['spin the wheel', 'prize wheel', 'random picker', 'wheel spinner'],
    built: false
  },
  {
    name: 'Scratch Card',
    slug: 'scratch-card',
    category: 'Casino',
    description: 'Scratch off the silver coating to reveal prizes underneath. Multiple card designs and satisfying canvas-based scratch mechanics.',
    icon: '🎫',
    accent: '#059669',
    keywords: ['scratch card', 'scratchie', 'lottery', 'scratch off'],
    built: false
  },
  {
    name: 'Keno',
    slug: 'keno',
    category: 'Casino',
    description: 'Pick your lucky numbers from 1 to 80, then watch 20 numbers drawn one by one. Match more numbers to win bigger in this lottery-style game.',
    icon: '🔢',
    accent: '#059669',
    keywords: ['keno', 'lottery game', 'number pick', 'casino game'],
    built: false
  },
  {
    name: 'Baccarat',
    slug: 'baccarat',
    category: 'Casino',
    description: 'Bet on Player, Banker, or Tie in this elegant casino card game. Full third-card rules and clean card presentation — for free.',
    icon: '🂠',
    accent: '#059669',
    keywords: ['baccarat', 'punto banco', 'casino card', 'card game'],
    built: false
  },

  // ─── STRATEGY (10) ────────────────────────────────────────────

  {
    name: 'Tic Tac Toe',
    slug: 'tic-tac-toe',
    category: 'Strategy',
    description: 'Play Tic Tac Toe against AI with three difficulty levels or challenge a friend locally. The classic strategy game, perfected.',
    icon: '❌',
    accent: '#0D9488',
    keywords: ['tic tac toe', 'noughts and crosses', 'x and o', 'strategy'],
    built: false
  },
  {
    name: 'Connect Four',
    slug: 'connect-four',
    category: 'Strategy',
    description: 'Drop colored discs to connect four in a row before your opponent. Play against smart AI or a friend with smooth falling animations.',
    icon: '🔴',
    accent: '#0D9488',
    keywords: ['connect four', 'four in a row', 'drop game', 'strategy game'],
    built: false
  },
  {
    name: 'Reversi',
    slug: 'reversi',
    category: 'Strategy',
    description: 'Outflank your opponent to flip their pieces in this classic Reversi board game. AI with three difficulty levels challenges your strategy.',
    icon: '⚫',
    accent: '#0D9488',
    keywords: ['reversi', 'othello', 'flip game', 'board strategy'],
    built: false
  },
  {
    name: 'Checkers',
    slug: 'checkers',
    category: 'Strategy',
    description: 'Play Checkers online with mandatory jumps, double jumps, and kinging. Challenge the AI or play locally with a friend.',
    icon: '🔵',
    accent: '#0D9488',
    keywords: ['checkers', 'draughts', 'board game', 'jump game'],
    built: false
  },
  {
    name: 'Chess',
    slug: 'chess',
    category: 'Strategy',
    description: 'Play Chess against AI with three difficulty levels. Full rules including castling, en passant, and pawn promotion. Move history included.',
    icon: '♟',
    accent: '#0D9488',
    keywords: ['chess', 'chess online', 'chess game', 'strategy board'],
    built: false
  },
  {
    name: 'Battleship',
    slug: 'battleship',
    category: 'Strategy',
    description: 'Place your fleet and hunt the enemy ships in this classic Battleship game. Smart AI uses hunt-and-target strategy to find your ships.',
    icon: '🚢',
    accent: '#0D9488',
    keywords: ['battleship', 'naval game', 'ship hunt', 'grid strategy'],
    built: false
  },
  {
    name: 'Dots and Boxes',
    slug: 'dots-and-boxes',
    category: 'Strategy',
    description: 'Draw lines between dots to complete boxes. Score more boxes than your AI opponent in this deceptively strategic pencil-and-paper game.',
    icon: '▪',
    accent: '#0D9488',
    keywords: ['dots and boxes', 'dot game', 'line game', 'pencil game'],
    built: false
  },
  {
    name: 'Gomoku',
    slug: 'four-in-a-row',
    category: 'Strategy',
    description: 'Place stones on a 15x15 board to get five in a row. Simple rules but deep strategy — also known as Five in a Row or Gobang.',
    icon: '⚪',
    accent: '#0D9488',
    keywords: ['gomoku', 'five in a row', 'gobang', 'go board game'],
    built: false
  },
  {
    name: 'Mancala',
    slug: 'mancala',
    category: 'Strategy',
    description: 'Sow and capture stones in this ancient strategy game. Watch animated stone movements as you compete against AI or a friend.',
    icon: '🥜',
    accent: '#0D9488',
    keywords: ['mancala', 'sowing game', 'kalah', 'ancient strategy'],
    built: false
  },
  {
    name: 'Nim',
    slug: 'nim',
    category: 'Strategy',
    description: 'Remove objects from rows on your turn — whoever takes the last one loses. Simple enough for kids, with a mathematically perfect strategy beneath.',
    icon: '🪨',
    accent: '#0D9488',
    keywords: ['nim', 'subtraction game', 'math strategy', 'take away game'],
    built: false
  },

  // ─── CASUAL (10) ──────────────────────────────────────────────

  {
    name: 'Rock Paper Scissors',
    slug: 'rock-paper-scissors',
    category: 'Casual',
    description: 'Play Rock Paper Scissors with animated reveals and score tracking. Includes the Lizard-Spock variant for extra strategic depth.',
    icon: '✊',
    accent: '#E11D48',
    keywords: ['rock paper scissors', 'rps', 'hand game', 'quick game'],
    built: false
  },
  {
    name: 'Clicker Game',
    slug: 'clicker',
    category: 'Casual',
    description: 'Click to earn, buy upgrades, and watch your numbers skyrocket. An addictive idle clicker with auto-clickers and a prestige system.',
    icon: '👆',
    accent: '#E11D48',
    keywords: ['clicker game', 'idle game', 'incremental', 'clicking game'],
    built: false
  },
  {
    name: 'Reaction Time Test',
    slug: 'reaction-time',
    category: 'Casual',
    description: 'Test your reaction speed. Wait for the color change, click as fast as you can. Average over 5 rounds measures your true reflexes.',
    icon: '⚡',
    accent: '#E11D48',
    keywords: ['reaction time', 'reflex test', 'speed test', 'reaction game'],
    built: false
  },
  {
    name: 'Aim Trainer',
    slug: 'aim-trainer',
    category: 'Casual',
    description: 'Sharpen your aim by clicking targets that appear randomly. Track accuracy and speed over 30-second rounds with adjustable settings.',
    icon: '🎯',
    accent: '#E11D48',
    keywords: ['aim trainer', 'aim practice', 'mouse accuracy', 'click speed'],
    built: false
  },
  {
    name: 'Color Match',
    slug: 'color-match',
    category: 'Casual',
    description: 'The word says blue but it is printed in red — which is it? This Stroop-effect game tests your brain speed with 60 seconds on the clock.',
    icon: '🌈',
    accent: '#E11D48',
    keywords: ['color match', 'stroop test', 'brain game', 'color game'],
    built: false
  },
  {
    name: 'Simon Says',
    slug: 'simon-says',
    category: 'Casual',
    description: 'Watch the color sequence, then repeat it. Each round adds one more step. How long can you remember? Satisfying tones with each color.',
    icon: '🔴',
    accent: '#E11D48',
    keywords: ['simon says', 'memory game', 'sequence game', 'pattern game'],
    built: false
  },
  {
    name: 'Trivia Quiz',
    slug: 'trivia-quiz',
    category: 'Casual',
    description: 'Test your knowledge across multiple categories with 250+ questions. Timed answers and streak bonuses make every question count.',
    icon: '❓',
    accent: '#E11D48',
    keywords: ['trivia quiz', 'quiz game', 'knowledge test', 'general knowledge'],
    built: false
  },
  {
    name: 'Number Memory',
    slug: 'number-memory',
    category: 'Casual',
    description: 'See a number, memorize it, type it back. The digits increase each round. How many digits can your short-term memory handle?',
    icon: '🔢',
    accent: '#E11D48',
    keywords: ['number memory', 'digit span', 'memory test', 'brain game'],
    built: false
  },
  {
    name: 'Sequence Memory',
    slug: 'sequence-memory',
    category: 'Casual',
    description: 'Watch tiles light up in sequence, then tap them in the same order. The sequence grows each round — test your spatial memory.',
    icon: '🟦',
    accent: '#E11D48',
    keywords: ['sequence memory', 'pattern memory', 'tile memory', 'brain game'],
    built: false
  },
  {
    name: 'Spot the Difference',
    slug: 'spot-the-difference',
    category: 'Casual',
    description: 'Compare two scenes and find the hidden differences. Procedurally generated levels with geometric art keep the challenge fresh.',
    icon: '🔎',
    accent: '#E11D48',
    keywords: ['spot the difference', 'find difference', 'observation game', 'visual puzzle'],
    built: false
  },

  // ─── ACTION (8) ───────────────────────────────────────────────

  {
    name: 'Card Dodger',
    slug: 'card-dodger',
    category: 'Action',
    description: 'Dodge falling objects at increasing speed. Collect power-ups like shields and slow-mo to survive longer in this fast-paced action game.',
    icon: '🃏',
    accent: '#EA580C',
    keywords: ['card dodger', 'dodge game', 'avoidance', 'action game'],
    built: false
  },
  {
    name: 'Jumping Rabbit',
    slug: 'jumping-rabbit',
    category: 'Action',
    description: 'Guide a rabbit upward through moving and breaking platforms. A vertical platformer with spring jumps and endless climbing action.',
    icon: '🐰',
    accent: '#EA580C',
    keywords: ['jumping rabbit', 'platform game', 'vertical jumper', 'doodle jump'],
    built: false
  },
  {
    name: 'Tower Stacker',
    slug: 'tower-stack',
    category: 'Action',
    description: 'Tap to drop the swinging block and stack it perfectly. Each misalignment makes the tower narrower. How high can you build?',
    icon: '🏗',
    accent: '#EA580C',
    keywords: ['tower stacker', 'stacking game', 'timing game', 'building game'],
    built: false
  },
  {
    name: 'Rhythm Tap',
    slug: 'rhythm-tap',
    category: 'Action',
    description: 'Hit notes in three lanes to the beat. Perfect timing earns bonus points. Procedural songs and combo multipliers make every round unique.',
    icon: '🎵',
    accent: '#EA580C',
    keywords: ['rhythm game', 'music game', 'tap game', 'beat game'],
    built: false
  },
  {
    name: 'Color Switch',
    slug: 'color-switch',
    category: 'Action',
    description: 'Guide your ball through rotating color barriers. You can only pass through the segment matching your color. One tap to jump.',
    icon: '🔵',
    accent: '#EA580C',
    keywords: ['color switch', 'color game', 'timing game', 'one tap action'],
    built: false
  },
  {
    name: 'Knife Throw',
    slug: 'knife-throw',
    category: 'Action',
    description: 'Throw knives at a rotating log without hitting other knives. Boss rounds with changing patterns test your timing to the limit.',
    icon: '🔪',
    accent: '#EA580C',
    keywords: ['knife throw', 'knife hit', 'timing game', 'precision game'],
    built: false
  },
  {
    name: 'Ball Bounce',
    slug: 'ball-bounce',
    category: 'Action',
    description: 'Keep your ball bouncing on shrinking platforms. Tap to move platforms and maintain the bounce in this challenging reaction game.',
    icon: '🏀',
    accent: '#EA580C',
    keywords: ['ball bounce', 'bouncing game', 'platform game', 'reaction game'],
    built: false
  },
  {
    name: 'Gravity Flip',
    slug: 'gravity-flip',
    category: 'Action',
    description: 'Auto-run through obstacle courses by tapping to flip gravity. Navigate ceilings and floors in this fast-paced gravity-switching runner.',
    icon: '🔄',
    accent: '#EA580C',
    keywords: ['gravity flip', 'gravity game', 'auto runner', 'flip game'],
    built: false
  },

  // ─── BUILDER (4) ──────────────────────────────────────────────

  {
    name: 'Pixel Art Painter',
    slug: 'pixel-art',
    category: 'Builder',
    description: 'Create pixel art on 8x8, 16x16, or 32x32 grids with a full color palette. Draw, fill, erase, and download your creations as PNG.',
    icon: '🎨',
    accent: '#0891B2',
    keywords: ['pixel art', 'drawing game', 'pixel painter', 'art maker'],
    built: false
  },
  {
    name: 'Sand Simulation',
    slug: 'sand-box',
    category: 'Builder',
    description: 'Drop sand, water, stone, and fire particles and watch them interact. A mesmerizing physics sandbox with realistic particle behavior.',
    icon: '⏳',
    accent: '#0891B2',
    keywords: ['sand simulation', 'falling sand', 'particle sandbox', 'physics sim'],
    built: false
  },
  {
    name: 'Music Pad',
    slug: 'music-pad',
    category: 'Builder',
    description: 'Tap drum, bass, and synth pads to create beats. Use the 16-step sequencer to compose loops. Multiple instrument kits available.',
    icon: '🎹',
    accent: '#0891B2',
    keywords: ['music pad', 'drum machine', 'beat maker', 'sequencer'],
    built: false
  },
  {
    name: 'Logic Circuit Builder',
    slug: 'circuit-builder',
    category: 'Builder',
    description: 'Build digital logic circuits with AND, OR, NOT, and XOR gates. Wire inputs to outputs and solve challenges or experiment freely.',
    icon: '🔌',
    accent: '#0891B2',
    keywords: ['logic circuit', 'circuit builder', 'logic gates', 'digital logic'],
    built: false
  },

  // ─── BOARD (6) ────────────────────────────────────────────────

  {
    name: 'Snakes and Ladders',
    slug: 'snakes-and-ladders',
    category: 'Board',
    description: 'Roll the dice and race to square 100. Climb ladders for shortcuts and slide down snakes. Play with 1 to 4 players against AI.',
    icon: '🐍',
    accent: '#4F46E5',
    keywords: ['snakes and ladders', 'chutes and ladders', 'board game', 'dice game'],
    built: false
  },
  {
    name: 'Ludo',
    slug: 'ludo',
    category: 'Board',
    description: 'Race your tokens around the board in this classic Ludo game. Roll a 6 to enter, land on opponents to send them home. 2-4 players.',
    icon: '🎲',
    accent: '#4F46E5',
    keywords: ['ludo', 'board game', 'parcheesi', 'token race'],
    built: false
  },
  {
    name: 'Yahtzee',
    slug: 'yahtzee',
    category: 'Board',
    description: 'Roll five dice up to three times per turn and fill your scorecard categories. Strategic choices make every roll matter in this classic.',
    icon: '🎲',
    accent: '#4F46E5',
    keywords: ['yahtzee', 'dice game', 'score game', 'category dice'],
    built: false
  },
  {
    name: 'Backgammon',
    slug: 'backgammon',
    category: 'Board',
    description: 'Move your checkers and bear them off before your opponent. Full backgammon rules with smart AI, doubling, and drag-and-drop play.',
    icon: '🎯',
    accent: '#4F46E5',
    keywords: ['backgammon', 'board game', 'dice strategy', 'checker game'],
    built: false
  },
  {
    name: 'Chinese Checkers',
    slug: 'chinese-checkers',
    category: 'Board',
    description: 'Hop your marbles across the star-shaped board before your opponents. Chain hops for dramatic moves in this multi-player strategy game.',
    icon: '⭐',
    accent: '#4F46E5',
    keywords: ['chinese checkers', 'star board', 'marble game', 'hop game'],
    built: false
  },
  {
    name: 'Dominoes',
    slug: 'dominoes',
    category: 'Board',
    description: 'Match domino endpoints and score on multiples of five. Play against AI opponents in this classic tile-matching table game.',
    icon: '🁣',
    accent: '#4F46E5',
    keywords: ['dominoes', 'domino game', 'tile game', 'matching game'],
    built: false
  },

  // ─── MATH & LOGIC (5) ────────────────────────────────────────

  {
    name: 'Math Sprint',
    slug: 'math-sprint',
    category: 'Math',
    description: 'Solve arithmetic problems as fast as you can in 60 seconds. Streak multipliers reward consecutive correct answers. How high can you score?',
    icon: '➕',
    accent: '#0284C7',
    keywords: ['math sprint', 'arithmetic', 'math game', 'speed math'],
    built: false
  },
  {
    name: 'Number Puzzle',
    slug: 'number-puzzle',
    category: 'Math',
    description: 'Fill the grid so every row and column sums to the target number. Logic and arithmetic combine in this number-placement brain teaser.',
    icon: '🔢',
    accent: '#0284C7',
    keywords: ['number puzzle', 'sum puzzle', 'grid math', 'logic puzzle'],
    built: false
  },
  {
    name: 'Binary Game',
    slug: 'binary-game',
    category: 'Math',
    description: 'Convert between binary and decimal as fast as you can. Start with 4-bit numbers and work up to 8-bit. Learn binary while you play.',
    icon: '💻',
    accent: '#0284C7',
    keywords: ['binary game', 'binary conversion', 'computer science', 'number base'],
    built: false
  },
  {
    name: 'Equation Builder',
    slug: 'equation-builder',
    category: 'Math',
    description: 'Arrange numbers and operators to build an equation equaling the target value. Over 50 puzzles ranging from simple to mind-bending.',
    icon: '🧮',
    accent: '#0284C7',
    keywords: ['equation builder', 'math puzzle', 'number equation', 'arithmetic puzzle'],
    built: false
  },
  {
    name: 'Logic Grid Puzzle',
    slug: 'logic-grid',
    category: 'Math',
    description: 'Solve Einstein-style logic puzzles by eliminating possibilities from a grid of clues. Five increasingly difficult puzzles await.',
    icon: '🧠',
    accent: '#0284C7',
    keywords: ['logic grid', 'einstein puzzle', 'deduction', 'logic game'],
    built: false
  },

  // ─── TRIVIA & KNOWLEDGE (5) ──────────────────────────────────

  {
    name: 'Flag Quiz',
    slug: 'flag-quiz',
    category: 'Trivia',
    description: 'Identify countries by their flag. Over 100 CSS-rendered flags with region filters. Build a streak and test your world knowledge.',
    icon: '🏳',
    accent: '#6D28D9',
    keywords: ['flag quiz', 'world flags', 'country quiz', 'geography game'],
    built: false
  },
  {
    name: 'Capital City Quiz',
    slug: 'capital-quiz',
    category: 'Trivia',
    description: 'Name the capital city of each country. All 195 capitals included with multiple-choice and type-in modes. Filter by region.',
    icon: '🏛',
    accent: '#6D28D9',
    keywords: ['capital quiz', 'city quiz', 'geography', 'world capitals'],
    built: false
  },
  {
    name: 'Geography Quiz',
    slug: 'geography-quiz',
    category: 'Trivia',
    description: 'Click on an SVG world map to locate countries. Your score depends on how close your click is. Learn geography while you play.',
    icon: '🌍',
    accent: '#6D28D9',
    keywords: ['geography quiz', 'map game', 'world quiz', 'country location'],
    built: false
  },
  {
    name: 'History Timeline',
    slug: 'history-timeline',
    category: 'Trivia',
    description: 'Drag historical events to the correct position on a timeline. Over 100 events from ancient history to modern times. How well do you know history?',
    icon: '📜',
    accent: '#6D28D9',
    keywords: ['history timeline', 'history game', 'timeline quiz', 'date game'],
    built: false
  },
  {
    name: 'Periodic Table Quiz',
    slug: 'periodic-table-quiz',
    category: 'Trivia',
    description: 'Test your chemistry knowledge with all 118 elements. Multiple quiz modes on an interactive periodic table. Symbol, name, or number — your choice.',
    icon: '⚗',
    accent: '#6D28D9',
    keywords: ['periodic table', 'chemistry quiz', 'elements quiz', 'science game'],
    built: false
  },
];
