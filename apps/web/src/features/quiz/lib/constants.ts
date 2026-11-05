import type { AttemptMode, AttemptStatus, ContentStatus, QuestionType, Visibility } from '../types';

export const QUESTION_TYPES: QuestionType[] = [
  'SINGLE',
  'MULTIPLE',
  'TRUE_FALSE',
  'TEXT',
  'FILL_BLANKS',
  'ORDERING',
  'OPEN',
];

export const QUESTION_TYPE_LABEL: Record<QuestionType, string> = {
  SINGLE: 'Tək seçim',
  MULTIPLE: 'Çox seçim',
  TEXT: 'Qısa cavab',
  TRUE_FALSE: 'Doğru / Yanlış',
  ORDERING: 'Sıralama',
  FILL_BLANKS: 'Boşluq doldurma',
  OPEN: 'Açıq sual',
};

export const QUESTION_TYPE_HINT: Record<QuestionType, string> = {
  SINGLE: 'Bir düzgün variant seç',
  MULTIPLE: 'Bütün düzgün variantları seç',
  TEXT: 'Cavabı yaz',
  TRUE_FALSE: 'Fikir doğrudur, yoxsa yanlış?',
  ORDERING: 'Elementləri düzgün ardıcıllığa düz',
  FILL_BLANKS: 'Boşluqları doldur',
  OPEN: 'Fikrini ətraflı yaz — müəllim yoxlayacaq',
};

export const STATUS_LABEL: Record<ContentStatus, string> = {
  DRAFT: 'Qaralama',
  PUBLISHED: 'Dərc edilib',
  ARCHIVED: 'Arxivdə',
};

export const VISIBILITY_LABEL: Record<Visibility, string> = {
  PUBLIC: 'Hamıya açıq',
  PRIVATE: 'Gizli',
  GROUPS: 'Qruplar üçün',
  PASSCODE: 'Giriş kodu ilə',
};

export const VISIBILITY_HINT: Record<Visibility, string> = {
  PUBLIC: 'Bütün tələbələr görür və başlaya bilər',
  PRIVATE: 'Yalnız sən və adminlər görür',
  GROUPS: 'Yalnız seçilmiş qrupların üzvləri',
  PASSCODE: 'Hər kəs görür, başlamaq üçün kod lazımdır',
};

export const MODE_LABEL: Record<AttemptMode, string> = {
  EXAM: 'İmtahan',
  PRACTICE: 'Məşq',
};

export const ATTEMPT_STATUS_LABEL: Record<AttemptStatus, string> = {
  IN_PROGRESS: 'Davam edir',
  SUBMITTED: 'Təhvil verilib',
  PENDING_REVIEW: 'Yoxlamada',
  GRADED: 'Qiymətləndirilib',
};

export const DIFFICULTY_LABEL: Record<number, string> = {
  1: 'Asan',
  2: 'Orta',
  3: 'Çətin',
};

export const OPTION_LETTERS = 'ABCDEFGHIJ'.split('');

/** Expedition palette for quiz covers (works on ink and paper). */
export const COVER_PALETTE = [
  '#FF8A1F', // brand cat orange
  '#FF6B3D', // ember
  '#9B7BFF', // aurora
  '#7CE7FF', // glacier
  '#4ADE80', // moss
  '#FF7EB6', // dusk
  '#FFC94D', // amber
] as const;
