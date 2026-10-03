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
    fr: 'Si Lando devenait directeur du Lycée, sa première règle serait ___.',
    en: 'If Lando became principal of Lycée, his first rule would be ___.',
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
    fr: 'La chose la plus folle que Lando a vue au camp cet été c\'est ___.',
    en: 'The craziest thing Lando saw at camp this summer was ___.',
  },
  {
    id: 8,
    fr: 'Au foot, Lando est célèbre pour ___.',
    en: 'On the soccer field, Lando is famous for ___.',
  },
];

export const FIBBAGE_QUESTIONS: FibbageQuestion[] = [
  {
    id: 1,
    question: "What is the name of Lando's summer camp?",
    questionFR: "Comment s'appelle le camp d'été de Lando?",
    realAnswer: 'Deer Mountain Day Camp',
    realAnswerFR: 'Deer Mountain Day Camp',
    emoji: '⛺',
  },
  {
    id: 2,
    question: 'What does Lando do every single day at camp?',
    questionFR: 'Quelle activité Lando fait-il tous les jours au camp?',
    realAnswer: 'Swimming',
    realAnswerFR: 'La natation',
    emoji: '🏊',
  },
  {
    id: 3,
    question: "What are the names of Lando's siblings?",
    questionFR: "Comment s'appellent les frère et sœur de Lando?",
    realAnswer: 'Bowie and Posie',
    realAnswerFR: 'Bowie et Posie',
    emoji: '👧🧒',
  },
  {
    id: 4,
    question: 'What sport did Lando specifically request for his party?',
    questionFR: 'Quel sport Lando voulait-il avoir à sa fête?',
    realAnswer: 'Soccer, basketball and kickball',
    realAnswerFR: 'Football, basket et kickball',
    emoji: '⚽',
  },
  {
    id: 5,
    question: "Who else in Lando's family goes to Lycée?",
    questionFR: "Qui d'autre dans la famille de Lando va au Lycée?",
    realAnswer: 'His cousin Victoria',
    realAnswerFR: 'Sa cousine Victoria',
    emoji: '🏫',
  },
  {
    id: 6,
    question: "What is the name of Lando's country house town?",
    questionFR: 'Dans quelle ville est la maison de campagne de Lando?',
    realAnswer: 'Garrison',
    realAnswerFR: 'Garrison',
    emoji: '🏡',
  },
  {
    id: 7,
    question: "How old is Lando's sister Posie?",
    questionFR: "Quel âge a la sœur de Lando, Posie?",
    realAnswer: '2 years old',
    realAnswerFR: '2 ans',
    emoji: '👶',
  },
  {
    id: 8,
    question: "How old is Lando's brother Bowie?",
    questionFR: "Quel âge a le frère de Lando, Bowie?",
    realAnswer: '4 years old',
    realAnswerFR: '4 ans',
    emoji: '🧒',
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
