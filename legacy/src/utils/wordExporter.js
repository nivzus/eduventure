import { Document, Paragraph, TextRun, HeadingLevel, AlignmentType, TabStopType, TabStopPosition } from 'docx';

export const generateWordDocument = (quiz) => {
    // Новая функция для форматирования вариантов с буквами (A, B, C...)
    const formatOptionWithLetter = (option, index) => {
        const letter = String.fromCharCode(65 + index); // A, B, C...
        return new Paragraph({
            children: [
                new TextRun({ text: `\t${letter}) ` }),
                new TextRun(option.toString()),
            ],
            indent: { left: 400 },
        });
    };

    // Новая функция для форматирования вариантов с квадратиком для выбора
    const formatOptionWithCheckbox = (option) => {
        return new Paragraph({
            children: [
                // Используем Unicode-символ квадратика
                new TextRun({ text: `\t☐ ` }),
                new TextRun(option.toString()),
            ],
            indent: { left: 400 },
        });
    };

    const children = [
        new Paragraph({
            children: [
                new TextRun("Name:_________________________"),
                new TextRun({
                    text: "\tDate:____________________",
                    break: 0,
                }),
            ],
            tabStops: [
                {
                    type: TabStopType.RIGHT,
                    position: TabStopPosition.MAX,
                },
            ],
            spacing: { after: 400 },
        }),
        new Paragraph({
            text: quiz.title,
            heading: HeadingLevel.HEADING_1,
            alignment: AlignmentType.CENTER,
        }),
        new Paragraph({
            text: quiz.description || '',
        }),
        new Paragraph({ text: '' }), // Spacer
    ];

    quiz.questions.forEach((q, index) => {
        // Для fillInTheBlanks создаем специальный параграф с пропусками
        if (q.type === 'fillInTheBlanks') {
            const textWithBlanks = q.text.replace(/\[.*?\]/g, '[_________________]');
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: `${index + 1}. `, bold: true }),
                        new TextRun(textWithBlanks),
                    ],
                    spacing: { before: 200 },
                })
            );
        } else {
            // Для всех остальных типов вопросов оставляем как было
            children.push(
                new Paragraph({
                    children: [
                        new TextRun({ text: `${index + 1}. `, bold: true }),
                        new TextRun(q.text),
                    ],
                    spacing: { before: 200 },
                })
            );
        }

        switch (q.type) {
            case 'single':
                q.options.forEach((opt, optIndex) => {
                    children.push(formatOptionWithLetter(opt, optIndex));
                });
                break;
            case 'multiple':
                q.options.forEach((opt) => {
                    children.push(formatOptionWithCheckbox(opt));
                });
                break;
            case 'trueFalse':
                children.push(formatOptionWithLetter("Doğru", 0));
                children.push(formatOptionWithLetter("Yanlış", 1));
                break;
            case 'textInput':
            case 'open':
                 // Оставляем пустое место для письменного ответа
                 children.push(new Paragraph({ text: `\n\n\n` }));
                break;
            case 'ordering':
                // Перемешиваем элементы для сортировки
                const shuffledItems = [...q.orderItems].sort(() => Math.random() - 0.5);
                shuffledItems.forEach((item) => {
                    children.push(new Paragraph({ text: `\t- ${item}`}));
                });
                 children.push(new Paragraph({ text: `\n\n` })); // Место для ответа
                 break;
            default:
                break;
        }
    });

    const doc = new Document({
        styles: {
            default: {
                document: {
                    run: {
                        font: "Times New Roman",
                        size: 24, // 12pt * 2
                    },
                },
            },
            heading1: {
                run: {
                    font: "Times New Roman",
                    size: 32, // 16pt
                    bold: true,
                },
            },
        },
        sections: [{
            children: children,
        }],
    });

    return doc;
};