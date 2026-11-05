import type { AnswerValue, Question } from '../../../types';
import type { CorrectView } from '../../../lib/utils';

export interface RendererFeedback {
  /** null → not auto-gradable (OPEN). */
  correct: boolean | null;
  solution: CorrectView | null;
}

export interface RendererProps<A extends AnswerValue = AnswerValue> {
  question: Question;
  value: A | undefined;
  onChange: (value: A) => void;
  /** Locked (practice answer checked, or submitting). */
  disabled?: boolean;
  /** Practice-mode reveal. */
  feedback?: RendererFeedback | null;
  /** Stable seed for client-side shuffles (attempt id). */
  seed: string;
  /** Ask the player to advance (e.g. Enter in a text field). */
  onSubmitIntent?: () => void;
}
