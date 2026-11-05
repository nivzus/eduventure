'use client';

import type { AnswerValue } from '../../../types';
import { ChoiceQuestion } from './ChoiceQuestion';
import { FillBlanksQuestion } from './FillBlanksQuestion';
import { OpenQuestion } from './OpenQuestion';
import { OrderingQuestion } from './OrderingQuestion';
import { TextQuestion } from './TextQuestion';
import { TrueFalseQuestion } from './TrueFalseQuestion';
import type { RendererProps } from './types';

export { initialOrdering } from './OrderingQuestion';
export type { RendererFeedback, RendererProps } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
export function QuestionRenderer(props: RendererProps<AnswerValue>) {
  const p = props as RendererProps<any>;
  switch (props.question.type) {
    case 'SINGLE':
    case 'MULTIPLE':
      return <ChoiceQuestion {...p} />;
    case 'TRUE_FALSE':
      return <TrueFalseQuestion {...p} />;
    case 'TEXT':
      return <TextQuestion {...p} />;
    case 'FILL_BLANKS':
      return <FillBlanksQuestion {...p} />;
    case 'ORDERING':
      return <OrderingQuestion {...p} />;
    case 'OPEN':
      return <OpenQuestion {...p} />;
    default:
      return <p className="text-muted">Bu sual növü dəstəklənmir.</p>;
  }
}
