import { useMemo } from 'react';

const isAnswerCorrect = (question, userAnswer) => {
    if (userAnswer === undefined || userAnswer === null) return false;
    if (!question || !question.type) return false;

    switch (question.type) {
        case 'single': return userAnswer === question.options[question.correctAnswers[0]];
        case 'multiple':
            const correctOptions = question.correctAnswers.map(i => question.options[i]).sort();
            const userOptions = Array.isArray(userAnswer) ? [...userAnswer].sort() : [];
            return JSON.stringify(correctOptions) === JSON.stringify(userOptions);
        case 'textInput': return userAnswer.trim().toLowerCase() === question.correctAnswers[0].trim().toLowerCase();
        case 'trueFalse': return userAnswer === question.correctAnswer;
        case 'ordering': return JSON.stringify(userAnswer) === JSON.stringify(question.orderItems);
        default: return false;
    }
};

export const useWeakTopics = (quizResults, quizzes, profile) => {
    const weakTopics = useMemo(() => {
        if (!profile || !quizResults.length || !quizzes.length) {
            return [];
        }

        const userResults = quizResults.filter(r => r.user_id === profile.id && r.status === 'completed');
        if (userResults.length === 0) {
            return [];
        }

        const topicStats = new Map(); // topic => { correct: 0, total: 0 }

        userResults.forEach(result => {
            const quiz = quizzes.find(q => q.id === result.quizId);
            if (!quiz || !quiz.questions) return;

            result.questionOrder.forEach(q_ordered => {
                const originalQuestion = quiz.questions.find(q => q.id === q_ordered.id);
                if (!originalQuestion) return;

                const category = quiz.category;
                if (!category) return;

                const correct = isAnswerCorrect(originalQuestion, result.userAnswers[originalQuestion.id]);

                if (!topicStats.has(category)) topicStats.set(category, { correct: 0, total: 0 });
                const stats = topicStats.get(category);
                stats.total += 1;
                if (correct) stats.correct += 1;
            });
        });

        if (topicStats.size === 0) return [];

        return Array.from(topicStats.entries()).map(([topic, stats]) => ({ name: topic, accuracy: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0, totalQuestions: stats.total, })).filter(topic => topic.totalQuestions > 2).sort((a, b) => a.accuracy - b.accuracy).slice(0, 3);
    }, [profile, quizResults, quizzes]);

    return weakTopics;
};