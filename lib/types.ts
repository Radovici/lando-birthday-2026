export type Lang = 'fr' | 'en';

export interface Player {
  id: string;
  name: string;
  parent_name: string;
  stars: number;
  demerits: number;
  created_at: string;
}

export interface PartyEvent {
  id: string;
  player_id: string;
  given_by: string;
  type: 'star' | 'demerit';
  reason: string;
  created_at: string;
  player?: Player;
}

export interface OlympicsScore {
  id: string;
  team: string;
  event_name: string;
  points: number;
  added_by: string | null;
  created_at: string;
}

export interface FibbageAnswer {
  id: string;
  question_id: number;
  player_name: string;
  answer: string;
  votes: number;
  is_real: boolean;
  created_at: string;
}

export interface FibbageQuestion {
  id: number;
  question: string;
  questionFR: string;
  realAnswer: string;
  realAnswerFR: string;
  emoji: string;
}

export interface QuiplashAnswer {
  id: string;
  prompt_id: number;
  player_name: string;
  answer: string;
  votes: number;
  created_at: string;
}

export interface QuiplashPrompt {
  id: number;
  fr: string;
  en: string;
}

export const QUIPLASH_PROMPTS: QuiplashPrompt[] = [
  {
    id: 1,
    fr: 'Lando pense que ___ est le meilleur super-pouvoir.',
    en: 'Lando thinks ___ is the best superpower.',
  },
  {
    id: 2,
    fr: 'La pire chose à apporter à un anniversaire c\'est ___.',
    en: 'The worst thing to bring to a birthday party is ___.',
  },
  {
    id: 3,
    fr: 'Si j\'étais invisible pendant un jour, je ferais ___.',
    en: 'If I were invisible for a day, I would ___.',
  },
  {
    id: 4,
    fr: 'Le sport le plus difficile inventé par un enfant de 7 ans serait ___.',
    en: "The hardest sport invented by a 7-year-old would be ___.",
  },
  {
    id: 5,
    fr: 'La chose la plus dégoûtante à mettre dans un gâteau d\'anniversaire c\'est ___.',
    en: 'The most disgusting thing to put in a birthday cake is ___.',
  },
  {
    id: 6,
    fr: 'Lando a un superpouvoir secret : ___.',
    en: 'Lando has a secret superpower: ___.',
  },
  {
    id: 7,
    fr: 'La règle numéro 1 dans la maison de Lando c\'est ___.',
    en: "The number one rule in Lando's house is ___.",
  },
  {
    id: 8,
    fr: 'Si Lando devenait président, sa première loi serait ___.',
    en: "If Lando became president, his first law would be ___.",
  },
];

export const FIBBAGE_QUESTIONS: FibbageQuestion[] = [
  {
    id: 1,
    question: "What is Lando's favorite color?",
    questionFR: 'Quelle est la couleur préférée de Lando?',
    realAnswer: 'Blue',
    realAnswerFR: 'Bleu',
    emoji: '🎨',
  },
  {
    id: 2,
    question: "What is Lando's favorite food?",
    questionFR: 'Quel est le plat préféré de Lando?',
    realAnswer: 'Pizza',
    realAnswerFR: 'Pizza',
    emoji: '🍕',
  },
  {
    id: 3,
    question: 'What sport does Lando love most?',
    questionFR: 'Quel sport Lando préfère-t-il?',
    realAnswer: 'Soccer',
    realAnswerFR: 'Football',
    emoji: '⚽',
  },
  {
    id: 4,
    question: 'What does Lando want to be when he grows up?',
    questionFR: 'Que veut faire Lando quand il sera grand?',
    realAnswer: 'A race car driver',
    realAnswerFR: 'Pilote de course',
    emoji: '🏎️',
  },
  {
    id: 5,
    question: "What is Lando's favorite movie?",
    questionFR: 'Quel est le film préféré de Lando?',
    realAnswer: 'Star Wars',
    realAnswerFR: 'Star Wars',
    emoji: '🎬',
  },
  {
    id: 6,
    question: 'What superpower would Lando pick?',
    questionFR: 'Quel superpouvoir Lando choisirait-il?',
    realAnswer: 'Flying',
    realAnswerFR: 'Voler',
    emoji: '🦸',
  },
  {
    id: 7,
    question: 'What animal would Lando choose as a pet?',
    questionFR: 'Quel animal Lando choisirait-il comme animal de compagnie?',
    realAnswer: 'A dog',
    realAnswerFR: 'Un chien',
    emoji: '🐾',
  },
  {
    id: 8,
    question: "What is Lando's favorite subject in school?",
    questionFR: "Quelle est la matière préférée de Lando à l'école?",
    realAnswer: 'Math',
    realAnswerFR: 'Les maths',
    emoji: '📚',
  },
];

export const OLYMPICS_EVENTS = [
  'Kickball',
  'Soccer',
  'Water Bucket Race',
  'Egg & Spoon Race',
  'Sack Race',
];

export const OLYMPICS_EVENTS_FR: Record<string, string> = {
  Kickball: 'Kickball',
  Soccer: 'Football',
  'Water Bucket Race': 'Course au seau',
  'Egg & Spoon Race': 'Course à la cuillère',
  'Sack Race': 'Course en sac',
};

export const TEAMS = ['Team Red', 'Team Blue'];

export const TEAM_NAMES: Record<string, { fr: string; en: string }> = {
  'Team Red': { fr: 'Équipe Rouge', en: 'Team Red' },
  'Team Blue': { fr: 'Équipe Bleue', en: 'Team Blue' },
};

export const STAR_REASONS_FR = [
  'A partagé ses jouets',
  'A aidé un ami',
  'A dit s\'il vous plaît/merci',
  'A marqué un but pour l\'équipe',
  'A rangé sans qu\'on le demande',
  'A été super gentil(le)',
  'A montré un excellent esprit sportif',
];

export const STAR_REASONS = [
  'Shared toys',
  'Helped a friend',
  'Said please & thank you',
  'Scored a goal for the team',
  'Cleaned up without being asked',
  'Was super kind',
  'Showed great sportsmanship',
];

export const DEMERIT_REASONS_FR = [
  'A volé un cookie',
  'A dit un gros mot',
  'A poussé dans la file',
  'A dit quelque chose de méchant',
  'A enfreint une règle',
  'A fait pleurer quelqu\'un',
];

export const DEMERIT_REASONS = [
  'Stole a cookie',
  'Used the forbidden word',
  'Pushed in line',
  'Said something mean',
  'Broke a rule',
  'Made someone cry',
];
