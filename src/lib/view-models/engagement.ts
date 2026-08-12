// Normalizes schema v1.2 typed quiz answers and puzzle solutions into
// discriminated unions for the renderers. The content validator guarantees the
// kind pairings at build time; these functions enforce them at the type level
// and throw on unsupported combinations rather than rendering wrongly.
import type { Engagement, QuizQuestion } from '../../types';

export type PreparedQuizQuestion =
  | {
      type: 'multiple_choice';
      questionId: string;
      question: string;
      options: string[];
      answerText: string;
      explanation: string;
    }
  | {
      type: 'true_false';
      questionId: string;
      question: string;
      answerBoolean: boolean;
      explanation: string;
    }
  | {
      type: 'sequence';
      questionId: string;
      question: string;
      answerItems: string[];
      explanation: string;
    }
  | {
      type: 'scenario' | 'short_answer';
      questionId: string;
      question: string;
      modelAnswer: string;
      explanation: string;
    };

export function prepareQuizQuestion(question: QuizQuestion): PreparedQuizQuestion {
  const { question_id: questionId, question: text, answer, explanation } = question;
  switch (question.type) {
    case 'multiple_choice': {
      if (answer.kind !== 'text' || answer.text === undefined) {
        throw new Error(`${questionId}: multiple_choice requires a text answer`);
      }
      const options = question.options ?? [];
      if (options.length < 2) throw new Error(`${questionId}: multiple_choice requires options`);
      if (!options.includes(answer.text)) {
        throw new Error(`${questionId}: answer "${answer.text}" is not among the options`);
      }
      return { type: 'multiple_choice', questionId, question: text, options, answerText: answer.text, explanation };
    }
    case 'true_false': {
      if (answer.kind !== 'boolean' || answer.boolean === undefined) {
        throw new Error(`${questionId}: true_false requires a boolean answer`);
      }
      return { type: 'true_false', questionId, question: text, answerBoolean: answer.boolean, explanation };
    }
    case 'sequence': {
      if (answer.kind !== 'ordered_list' || !answer.items || answer.items.length < 2) {
        throw new Error(`${questionId}: sequence requires an ordered_list answer`);
      }
      return { type: 'sequence', questionId, question: text, answerItems: answer.items, explanation };
    }
    case 'scenario':
    case 'short_answer': {
      if (answer.kind !== 'text' || answer.text === undefined) {
        throw new Error(`${questionId}: ${question.type} requires a text model answer`);
      }
      // Model answer is for self-check, never automatic scoring.
      return { type: question.type, questionId, question: text, modelAnswer: answer.text, explanation };
    }
    default:
      throw new Error(`${questionId}: unsupported quiz type ${(question as QuizQuestion).type}`);
  }
}

export function prepareQuiz(quiz: QuizQuestion[]): PreparedQuizQuestion[] {
  return quiz.map(prepareQuizQuestion);
}

type Puzzle = Engagement['puzzle'];

export type PreparedPuzzle =
  | { type: 'sequence'; title: string; instructions: string; items: string[]; solutionItems: string[] }
  | {
      type: 'matching';
      title: string;
      instructions: string;
      pairs: { prompt: string; answer: string }[];
      choices: string[];
    }
  | {
      type: 'sort';
      title: string;
      instructions: string;
      groups: { label: string; items: string[] }[];
      items: string[];
    }
  | {
      type: 'case_grid';
      title: string;
      instructions: string;
      pairs: { prompt: string; answer: string }[];
      choices: string[];
    }
  | { type: 'word_scramble'; title: string; instructions: string; items: string[]; solutionText: string };

export function preparePuzzle(puzzle: Puzzle): PreparedPuzzle {
  const { title, instructions, solution } = puzzle;
  switch (puzzle.type) {
    case 'sequence': {
      if (solution.kind !== 'ordered_list' || !solution.items || solution.items.length < 2) {
        throw new Error(`Puzzle "${title}": sequence requires an ordered_list solution`);
      }
      const items = puzzle.items && puzzle.items.length > 0 ? puzzle.items : [...solution.items];
      return { type: 'sequence', title, instructions, items, solutionItems: solution.items };
    }
    case 'matching':
    case 'case_grid': {
      if (solution.kind !== 'pairs' || !solution.pairs || solution.pairs.length === 0) {
        throw new Error(`Puzzle "${title}": ${puzzle.type} requires a pairs solution`);
      }
      const answers = solution.pairs.map((pair) => pair.answer);
      const choices = puzzle.choices && puzzle.choices.length > 0 ? puzzle.choices : dedupe(answers);
      for (const answer of answers) {
        if (!choices.includes(answer)) {
          throw new Error(`Puzzle "${title}": answer "${answer}" missing from choices`);
        }
      }
      return { type: puzzle.type, title, instructions, pairs: solution.pairs, choices };
    }
    case 'sort': {
      if (solution.kind !== 'groups' || !solution.groups || solution.groups.length < 2) {
        throw new Error(`Puzzle "${title}": sort requires a groups solution`);
      }
      const items = solution.groups.flatMap((group) => group.items);
      return { type: 'sort', title, instructions, groups: solution.groups, items };
    }
    case 'word_scramble': {
      if (solution.kind !== 'text' || solution.text === undefined) {
        throw new Error(`Puzzle "${title}": word_scramble requires a text solution`);
      }
      const items = puzzle.items ?? [];
      return { type: 'word_scramble', title, instructions, items, solutionText: solution.text };
    }
    default:
      throw new Error(`Unsupported puzzle type ${(puzzle as Puzzle).type}`);
  }
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}
