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
  realAnswer: string;
  emoji: string;
}

export const FIBBAGE_QUESTIONS: FibbageQuestion[] = [
  { id: 1, question: "What is Lando's favorite color?", realAnswer: "Blue", emoji: "🎨" },
  { id: 2, question: "What is Lando's favorite food?", realAnswer: "Pizza", emoji: "🍕" },
  { id: 3, question: "What sport does Lando love most?", realAnswer: "Soccer", emoji: "⚽" },
  { id: 4, question: "What does Lando want to be when he grows up?", realAnswer: "A race car driver", emoji: "🏎️" },
  { id: 5, question: "What is Lando's favorite movie?", realAnswer: "Star Wars", emoji: "🎬" },
  { id: 6, question: "What superpower would Lando pick?", realAnswer: "Flying", emoji: "🦸" },
  { id: 7, question: "What animal would Lando choose as a pet?", realAnswer: "A dog", emoji: "🐾" },
  { id: 8, question: "What is Lando's favorite subject in school?", realAnswer: "Math", emoji: "📚" },
];

export const OLYMPICS_EVENTS = [
  "Kickball",
  "Soccer",
  "Water Bucket Race",
  "Egg & Spoon Race",
  "Sack Race",
];

export const TEAMS = ["Team Red", "Team Blue"];

export const STAR_REASONS = [
  "Shared toys",
  "Helped a friend",
  "Said please & thank you",
  "Scored a goal for the team",
  "Cleaned up without being asked",
  "Was super kind",
  "Showed great sportsmanship",
];

export const DEMERIT_REASONS = [
  "Stole a cookie",
  "Used the forbidden word",
  "Pushed in line",
  "Said something mean",
  "Broke a rule",
  "Made someone cry",
];
