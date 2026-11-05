import React, { useState } from 'react';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import ComboBox from '../components/ui/ComboBox';
import Modal from '../components/ui/Modal';
import QuestionEditor from '../components/QuestionEditor';
import { ArrowLeftIcon, PlusIcon, CheckIcon, UploadIcon, LibraryIcon, DocumentTextIcon, PencilAltIcon, ClockIcon, SaveIcon, SparklesIcon, XIcon, DownloadIcon } from '../assets/icons';
import { TrashIcon } from '../assets/icons';
import mammoth from 'mammoth';
import { Packer } from 'docx';
import { saveAs } from 'file-saver';
import { generateWordDocument } from '../utils/wordExporter'; // Создадим этот файл

const AIQuestionGeneratorModal = ({ isOpen, onClose, onGenerate, showToast }) => {
    const [text, setText] = useState('');
    const [criteria, setCriteria] = useState([{ type: 'single', count: 3 }]);
    const [tags, setTags] = useState('');
    const [files, setFiles] = useState([]);
    const [totalPoints, setTotalPoints] = useState(5);
    const [numOptions, setNumOptions] = useState(4);
    const [isLoading, setIsLoading] = useState(false);
    const [difficulty, setDifficulty] = useState('orta'); // 'asan', 'orta', 'çətin'
    const [addImage, setAddImage] = useState(false);
    const [generateDistractors, setGenerateDistractors] = useState(false);
    const fileInputRef = React.useRef(null);

    const handleGenerate = async () => {
        if (!text.trim()) {
            showToast('Zəhmət olmasa, suallar yaratmaq üçün mətn daxil edin.');
            return;
        }
        if (criteria.reduce((sum, c) => sum + c.count, 0) === 0) {
            showToast('Ən azı bir sual yaratmalısınız.');
            return;
        }
        setIsLoading(true);
        try {
            await onGenerate(text, files, criteria, tags, totalPoints, numOptions, addImage, difficulty, generateDistractors);
            onClose();
            setText('');
            setFiles([]);
        } catch (error) {
            showToast(`Sual yaradılarkən xəta baş verdi: ${error.message}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCriteriaChange = (index, field, value) => {
        const newCriteria = [...criteria];
        newCriteria[index][field] = field === 'count' ? parseInt(value, 10) : value;
        setCriteria(newCriteria);
    };

    const addCriteria = () => {
        setCriteria([...criteria, { type: 'single', count: 1 }]);
    };

    const removeCriteria = (index) => {
        if (criteria.length > 1) {
            setCriteria(criteria.filter((_, i) => i !== index));
        }
    };

    const handleFileChange = (e) => {
        if (e.target.files) {
            const newFiles = Array.from(e.target.files);
            if (files.length + newFiles.length > 10) {
                showToast('Maksimum 10 fayl yükləyə bilərsiniz.');
                return;
            }
            setFiles(prev => [...prev, ...newFiles]);
        }
    };

    const removeFile = (fileToRemove) => {
        setFiles(files.filter(file => file !== fileToRemove));
    };


    if (!isOpen) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Mətndən AI ilə Suallar Yarat">
            <div className="space-y-4 max-h-[75vh] overflow-y-auto px-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700">Mətn</label>
                    <textarea value={text} onChange={e => setText(e.target.value)} rows="10" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Sualların yaradılacağı mətni bura daxil edin..."></textarea>
                </div>
                <div>
                    <label className="block text-sm font-medium text-gray-700">Fayllar (şəkil, .docx, .pdf)</label>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*,.docx,.pdf,application/pdf" className="hidden" />
                    <Button onClick={() => fileInputRef.current.click()} variant="secondary" size="sm" className="mt-1"><UploadIcon /> Fayl seç</Button>
                    {files.length > 0 && (
                        <div className="mt-2 space-y-2">
                            {files.map((file, index) => (
                                <div key={index} className="flex items-center justify-between p-2 bg-gray-100 rounded-md text-sm">
                                    <span>{file.name}</span>
                                    <button onClick={() => removeFile(file)} className="text-red-500 hover:text-red-700">
                                        <XIcon />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                </div>
                <h4 className="font-semibold pt-2 border-t">Kriteriyalar</h4>
                <div className="space-y-2">
                    {criteria.map((crit, index) => (
                        <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-md">
                            <select value={crit.type} onChange={e => handleCriteriaChange(index, 'type', e.target.value)} className="p-2 border border-gray-300 rounded-md bg-white flex-grow">
                                <option value="single">Tək seçimli</option>
                                <option value="multiple">Çox seçimli</option>
                                <option value="fillInTheBlanks">Boşluq doldurma</option>
                                <option value="trueFalse">Doğru/Yanlış</option>
                                <option value="textInput">Mətn daxiletmə</option>
                                <option value="ordering">Sıralama</option>
                                <option value="open">Açıq sual</option>
                            </select>
                            <input type="number" value={crit.count} onChange={e => handleCriteriaChange(index, 'count', e.target.value)} min="1" className="w-20 p-2 border border-gray-300 rounded-md" />
                            <span className="text-sm text-gray-600">ədəd</span>
                            <Button onClick={() => removeCriteria(index)} variant="danger" size="sm" disabled={criteria.length <= 1}><TrashIcon /></Button>
                        </div>
                    ))}
                </div>
                <Button onClick={addCriteria} variant="secondary" size="sm" className="w-full"><PlusIcon /> Yeni Kriteriya</Button>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t">
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Səviyyə</label>
                        <select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm">
                            <option value="asan">Asan</option>
                            <option value="orta">Orta</option>
                            <option value="çətin">Çətin</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Variantların sayı</label>
                        <input type="number" value={numOptions} onChange={e => setNumOptions(parseInt(e.target.value, 10))} min="2" max="6" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Ümumi Bal</label>
                        <input type="number" value={totalPoints} onChange={e => setTotalPoints(parseInt(e.target.value, 10))} min="1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700">Teqlər (vergüllə ayırın)</label>
                        <input type="text" value={tags} onChange={e => setTags(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Məs: qrammatika, ingilis dili" />
                    </div>
                </div>
                <div className="pt-4 border-t">
                    <label className="flex items-center cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={addImage} 
                            onChange={e => setAddImage(e.target.checked)} 
                            className="h-4 w-4 text-orange-600 rounded border-gray-300" 
                        />
                        <span className="ml-2 text-sm text-gray-700">Suallara uyğun şəkillər tap və əlavə et (URL)</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">AI hər sual üçün uyğun və lisenziyasız bir şəkil tapmağa çalışacaq.</p>
                </div>
                <div className="pt-4">
                    <label className="flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            checked={generateDistractors}
                            onChange={e => setGenerateDistractors(e.target.checked)}
                            className="h-4 w-4 text-orange-600 rounded border-gray-300"
                        />
                        <span className="ml-2 text-sm text-gray-700">Mətnə əsaslanan çaşdırıcı cavablar yarat</span>
                    </label>
                    <p className="text-xs text-gray-500 mt-1 ml-6">AI seçməli suallar üçün mətnə əsaslanan, lakin yanlış olan cavab variantları (distraktorlar) yaratmağa çalışacaq.</p>
                </div>

            </div>
            <div className="mt-6 flex justify-end">
                <Button onClick={handleGenerate} disabled={isLoading}>
                    {isLoading ? 'Yaradılır...' : <><SparklesIcon /> Yarat</>}
                </Button>
            </div>
        </Modal>
    );
};

const QuizEditorPage = ({ quiz, onSave, onBack, showToast, existingCategories = [], uniqueTags = [], onImportRequest, onAddFromBankRequest, onDraftChange, onSaveQuestionToBank, onSaveAllQuestionsToBank }) => {
    const [isAIGeneratorOpen, setIsAIGeneratorOpen] = useState(false);
    // State to store the context of the last AI generation
    const [aiSourceText, setAiSourceText] = useState('');
    const [aiSourceFiles, setAiSourceFiles] = useState([]);

    const handleQuizInfoChange = (e) => {
        const { name, value, type, checked } = e.target;
        let finalValue = type === 'checkbox' ? checked : value;
        if (type === 'datetime-local') {
            finalValue = value ? new Date(value).toISOString() : null;
        }
        onDraftChange({ ...quiz, [name]: finalValue });
    };

    const handleCategoryChange = (value) => {
        onDraftChange({ ...quiz, category: value });
    };

    const handleQuestionsChange = (newQuestions) => {
        onDraftChange({ ...quiz, questions: newQuestions });
    };

    const generateQuestion = (type, text, points = 1) => ({
        id: Date.now() + Math.random(),
        text,
        type,
        points,
        options: ['', ''],
        correctAnswers: [],
        correctAnswer: true,
        orderItems: ['', ''],
        imageUrl: '',
        audioUrl: '',
        explanation: ''
    });

    const generate9thGradeTemplate = () => {
        if (!window.confirm('Mövcud suallar silinəcək və 9-cu sinif şablonu tətbiq ediləcək. Davam etmək istəyirsiniz?')) return;
        const questions = [
            // Listening
            ...Array.from({ length: 3 }, (_, i) => generateQuestion('single', `Sual ${i + 1} (Listening)`)),
            generateQuestion('trueFalse', 'Sual 4 (Listening - True/False)'),
            // Reading 1
            ...Array.from({ length: 3 }, (_, i) => generateQuestion('single', `Sual ${i + 5} (Reading)`)),
            // Reading 2
            ...Array.from({ length: 5 }, (_, i) => generateQuestion('single', `Sual ${i + 8} (Reading)`)),
            // Grammar
            ...Array.from({ length: 13 }, (_, i) => generateQuestion('single', `Sual ${i + 13} (Grammar)`)),
            // Writing
            generateQuestion('open', 'Sual 26 (Writing)', 10)
        ];
        handleQuestionsChange(questions);
    };

    const generate11thGradeTemplate = () => {
        if (!window.confirm('Mövcud suallar silinəcək və 11-ci sinif şablonu tətbiq ediləcək. Davam etmək istəyirsiniz?')) return;
        const questions = [
            // Listening
            ...Array.from({ length: 3 }, (_, i) => generateQuestion('single', `Sual ${i + 1} (Listening)`)),
            // Grammar
            ...Array.from({ length: 19 }, (_, i) => generateQuestion('single', `Sual ${i + 4} (Grammar)`)),
            // Reading
            ...Array.from({ length: 4 }, (_, i) => generateQuestion('single', `Sual ${i + 23} (Reading)`)),
            ...Array.from({ length: 4 }, (_, i) => generateQuestion('open', `Sual ${i + 27} (Reading - Open)`))
        ];
        handleQuestionsChange(questions);
    };

    const addQuestion = () => {
        const newQuestion = {
            id: Date.now(),
            text: '',
            type: 'single',
            options: ['', ''],
            correctAnswers: [],
            correctAnswer: true,
            orderItems: ['', ''],
            imageUrl: '',
            audioUrl: '',
            explanation: '',
            points: 1
        };
        handleQuestionsChange([...quiz.questions, newQuestion]);
    };

    const updateQuestion = (updatedQuestion) => {
        handleQuestionsChange(quiz.questions.map(q => q.id === updatedQuestion.id ? updatedQuestion : q));
    };

    const deleteQuestion = (questionId) => {
        handleQuestionsChange(quiz.questions.filter(q => q.id !== questionId));
    };

    const handleDuplicateQuestion = (questionId) => {
        const questionToClone = quiz.questions.find(q => q.id === questionId);
        if (!questionToClone) return;

        const clonedQuestion = { ...questionToClone, id: Date.now() + Math.random() };
        const originalIndex = quiz.questions.findIndex(q => q.id === questionId);
        const newQuestions = [...quiz.questions];
        newQuestions.splice(originalIndex + 1, 0, clonedQuestion);
        handleQuestionsChange(newQuestions);
    };

    const handleSave = () => {
        if (!quiz.title || !quiz.title.trim()) {
            showToast("Testin adı boş ola bilməz!");
            return;
        }
        if (!quiz.category || !quiz.category.trim()) {
            showToast("Kateqoriya boş ola bilməz!");
            return;
        }
        onSave(quiz);
    };

    const handleExportToWord = () => {
        showToast('Word sənədi hazırlanır...');
        try {
            const doc = generateWordDocument(quiz);
            Packer.toBlob(doc).then(blob => {
                saveAs(blob, `${quiz.title.replace(/ /g, '_')}.docx`);
            });
        } catch (error) {
            showToast(`Sənəd yaradılarkən xəta baş verdi: ${error.message}`, 'error');
            console.error(error);
        }
    };

    const handleGenerateAIQuestions = async (text, files, criteria, tags, totalPoints, numOptions, addImage, difficulty, generateDistractors) => {
        const questionRequests = criteria.map(c => `${c.count} ədəd "${c.type}" tipli sual`).join(', ');
        const totalQuestions = criteria.reduce((sum, c) => sum + c.count, 0);
        const pointsPerQuestion = Math.max(1, Math.floor(totalPoints / totalQuestions));
        const tagsArray = tags.split(',').map(t => t.trim()).filter(Boolean);

        let fileBasedContent = '';
        const fileParts = [];

        for (const file of files) {
            if (file.type.startsWith('image/') || file.type === 'application/pdf') {
                const base64 = await new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result.split(',')[1]);
                    reader.onerror = error => reject(error);
                });
                fileParts.push({
                    inline_data: {
                        mime_type: file.type,
                        data: base64
                    }
                });
            } else if (file.name.endsWith('.docx')) {
                const arrayBuffer = await file.arrayBuffer();
                const result = await mammoth.convertToHtml({ arrayBuffer });
                // Simple text extraction by stripping HTML tags
                const tempDiv = document.createElement('div');
                tempDiv.innerHTML = result.value;
                fileBasedContent += `\n\nSənəddən mətn (${file.name}):\n${tempDiv.textContent || tempDiv.innerText || ''}`;
            }
        }

        const prompt = `
            Mənə verilən mətnə və fayllara əsasən, aşağıdakı kriteriyalara uyğun test sualları hazırla: ${questionRequests}.
            
            Ümumi Qaydalar:
            1. Nəticəni mütləq və yalnız valid JSON array formatında, heç bir əlavə mətn və ya formatlama olmadan qaytar.
            2. Hər bir obyekt aşağıdakı struktura malik olmalıdır.
            3. "single" və "multiple" tipli suallar üçün ${numOptions} cavab variantı olsun.
            4. Hər sual üçün "points" dəyəri ${pointsPerQuestion} olmalıdır.
            5. Hər sual üçün "tags" massivinə bu teqləri əlavə et: ${JSON.stringify(tagsArray)}.
            6. Sualların çətinlik səviyyəsi "${difficulty}" olmalıdır.
            ${addImage ? '7. Hər sual üçün "imageUrl" sahəsinə sualın məzmununa uyğun, internetdən tapılmış, istifadəsi sərbəst (müəllif hüququ olmayan) bir şəkil URL-i əlavə et. Əgər uyğun şəkil tapılmasa, bu sahəni boş saxla ("").' : ''}
            ${generateDistractors ? '8. "single" və "multiple" tipli suallar üçün yanlış cavab variantlarını (distraktorları) mətnə əsaslanaraq məntiqli, lakin çaşdırıcı şəkildə tərtib et.' : ''}

            JSON Strukturları:
            - "single" üçün: {"text": "...", "type": "single", "options": ["A", "B", "C", "D"], "correctAnswers": [index], "points": ${pointsPerQuestion}, "explanation": "...", "tags": ${JSON.stringify(tagsArray)}, "imageUrl": "..."}
            - "multiple" üçün: {"text": "...", "type": "multiple", "options": ["A", "B", "C", "D"], "correctAnswers": [index1, index2], "points": ${pointsPerQuestion}, "explanation": "...", "tags": ${JSON.stringify(tagsArray)}, "imageUrl": "..."}
            - "trueFalse" üçün: {"text": "...", "type": "trueFalse", "correctAnswer": true, "points": ${pointsPerQuestion}, "explanation": "...", "tags": ${JSON.stringify(tagsArray)}, "imageUrl": "..."}
            - "fillInTheBlanks" üçün: {"text": "Cavab [buradadır].", "type": "fillInTheBlanks", "correctAnswers": ["buradadır"], "points": ${pointsPerQuestion}, "explanation": "...", "tags": ${JSON.stringify(tagsArray)}, "imageUrl": "..."}
            - "textInput" üçün: {"text": "...", "type": "textInput", "correctAnswers": ["düzgün cavab"], "points": ${pointsPerQuestion}, "explanation": "...", "tags": ${JSON.stringify(tagsArray)}, "imageUrl": "..."}
            - "ordering" üçün: {"text": "...", "type": "ordering", "orderItems": ["Birinci", "İkinci", "Üçüncü"], "points": ${pointsPerQuestion}, "explanation": "...", "tags": ${JSON.stringify(tagsArray)}, "imageUrl": "..."}
            - "open" üçün: {"text": "...", "type": "open", "points": ${pointsPerQuestion}, "explanation": "...", "tags": ${JSON.stringify(tagsArray)}, "imageUrl": "..."}

            Nümunə "fillInTheBlanks" formatı: Düzgün cavablar mətnin içində kvadrat mötərizə [ ] ilə göstərilməli və "correctAnswers" massivində ayrıca qeyd edilməlidir.
            
            Mətn: "${text} ${fileBasedContent}"
        `;

        // Вызываем нашу Supabase Edge Function
        const url = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/gemini-proxy`;

        const requestBody = {
            contents: [{ parts: [{ text: prompt }, ...fileParts] }]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    // Добавляем заголовок авторизации Supabase
                    'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorBody = await response.json();
                const errorMessage = errorBody?.error?.message || response.statusText;
                throw new Error(`API sorğusu uğursuz oldu: ${errorMessage}`);
            }

            const data = await response.json();
            
            if (!data.candidates || data.candidates.length === 0) {
                throw new Error('AI modelindən cavab alınmadı.');
            }

            // Gemini sometimes wraps the JSON in markdown, so we need to clean it.
            let jsonString = data.candidates[0].content.parts[0].text;
            jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();
            
            const generatedQuestions = JSON.parse(jsonString);
            const newQuestions = generatedQuestions.map(q => ({ ...q, id: Date.now() + Math.random() }));
            handleQuestionsChange([...quiz.questions, ...newQuestions]);
            showToast(`${newQuestions.length} sual AI tərəfindən uğurla yaradıldı!`);

            // Save context for variation generation
            setAiSourceText(text + fileBasedContent);
            setAiSourceFiles(files.filter(f => f.type.startsWith('image/') || f.type === 'application/pdf'));
        } catch (error) {
            console.error("AI Generation Error:", error);
            throw new Error(error.message || 'Naməlum şəbəkə xətası.');
        }
    };

    const formatDateTimeForInput = (isoString) => {
        if (!isoString) return '';
        const date = new Date(isoString);
        return new Date(date.getTime() - (date.getTimezoneOffset() * 60000)).toISOString().slice(0, 16);
    };

    const handleGenerateVariation = async (originalQuestion) => {
        showToast('Bənzər sual yaradılır...');

        const { id, ...questionExample } = originalQuestion;

        let prompt;
        const hasAiContext = aiSourceText || aiSourceFiles.length > 0;

        if (hasAiContext) {
            prompt = `
                Mənə verilən mətnə və/və ya fayllara əsaslanaraq, aşağıdakı nümunəyə bənzər YENİ bir sual yarat.
                Mənbə Mətn: "${aiSourceText}"
            `;
        } else {
            let questionContext = `Sualın mətni: ${questionExample.text}\n`;
            // Handle different question types to build context
            switch (questionExample.type) {
                case 'single':
                case 'multiple':
                    if (questionExample.options && questionExample.options.length > 0) {
                        questionContext += `Variantlar: ${questionExample.options.join(', ')}\n`;
                        const correctOptions = (questionExample.correctAnswers || []).map(i => questionExample.options[i]);
                        questionContext += `Düzgün cavab(lar): ${correctOptions.join(', ')}\n`;
                    }
                    break;
                case 'textInput':
                case 'fillInTheBlanks':
                    questionContext += `Düzgün cavab(lar): ${(questionExample.correctAnswers || []).join(', ')}\n`;
                    break;
                case 'trueFalse':
                    questionContext += `Düzgün cavab: ${questionExample.correctAnswer}\n`;
                    break;
                case 'ordering':
                    questionContext += `Düzgün sıralama: ${(questionExample.orderItems || []).join(' -> ')}\n`;
                    break;
                // For 'open' questions, no answer context is needed.
                default:
                    break;
            }
            if (questionExample.explanation) {
                questionContext += `İzah: ${questionExample.explanation}\n`;
            }

            prompt = `
                Aşağıdakı sualın öz məzmununa (mətn, variantlar, izah) əsaslanaraq, ona bənzər YENİ bir sual yarat.
                Məlumat mənbəyi kimi aşağıdakı sualın detallarını istifadə et.
                Məlumat Mənbəyi (Sualın özü):\n${questionContext}
            `;
        }

        prompt += `

            Qaydalar:
            1. Nəticəni mütləq və yalnız bir elementdən ibarət valid JSON array formatında qaytar.
            2. Yeni sual nümunə ilə eyni mövzuda, stildə və çətinlikdə olmalıdır, lakin onu təkrarlamamalıdır.
            3. Nümunədəki bütün sahələri (type, points, tags, imageUrl və s.) nəzərə al.
            4. Əgər nümunədə "imageUrl" varsa, yeni sual üçün də uyğun, YENİ bir şəkil tapmağa çalış.

            JSON Strukturu (nümunə ilə eyni olmalıdır): ${JSON.stringify(questionExample)}

            Sual üçün nümunə:
            ${JSON.stringify(questionExample)}
        `;

        const fileParts = [];
        for (const file of aiSourceFiles) {
             const base64 = await new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = () => resolve(reader.result.split(',')[1]);
                reader.onerror = error => reject(error);
            });
            fileParts.push({
                inline_data: { mime_type: file.type, data: base64 }
            });
        }

        const url = `${process.env.REACT_APP_SUPABASE_URL}/functions/v1/gemini-proxy`;
        const requestBody = {
            contents: [{ parts: [{ text: prompt }, ...fileParts] }]
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.REACT_APP_SUPABASE_ANON_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorBody = await response.json();
                throw new Error(errorBody?.error?.message || response.statusText);
            }

            const data = await response.json();
            let jsonString = data.candidates[0].content.parts[0].text;
            jsonString = jsonString.replace(/```json/g, '').replace(/```/g, '').trim();

            const generatedQuestions = JSON.parse(jsonString);

            if (generatedQuestions && generatedQuestions.length > 0) {
                const newQuestion = { ...generatedQuestions[0], id: Date.now() + Math.random() };
                const originalIndex = quiz.questions.findIndex(q => q.id === originalQuestion.id);
                const newQuestionsList = [...quiz.questions];
                newQuestionsList.splice(originalIndex + 1, 0, newQuestion);
                handleQuestionsChange(newQuestionsList);
                showToast('Bənzər sual uğurla yaradıldı və əlavə edildi!');
            } else {
                throw new Error('AI modelindən düzgün formatda cavab alınmadı.');
            }
        } catch (error) {
            console.error("AI Variation Generation Error:", error);
            showToast(`Bənzər sual yaradılarkən xəta baş verdi: ${error.message}`);
        }
    };

    if (!quiz) {
        return <div>Yüklənir...</div>;
    }

    return (
        <>
        <AIQuestionGeneratorModal
            isOpen={isAIGeneratorOpen}
            onClose={() => setIsAIGeneratorOpen(false)}
            onGenerate={handleGenerateAIQuestions}
            showToast={showToast}
        />
        <div className="animate-fade-in">
            <div className="grid lg:grid-cols-3 gap-8 items-start">

                {/* --- Left Column: Settings Panel --- */}
                <div className="lg:col-span-1 lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-4 space-y-6">
                    <div className="flex flex-col gap-2">
                        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Test Redaktoru</h1>
                        <div className="flex flex-col sm:flex-row gap-2">
                            <Button onClick={onBack} variant="secondary" className="w-full justify-center"><ArrowLeftIcon /> Siyahıya qayıt</Button>
                            <Button onClick={handleSave} className="w-full justify-center"><CheckIcon />Testi yadda saxla</Button>
                        </div>
                    </div>

                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><DocumentTextIcon /> Əsas Məlumatlar</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Testin adı</label>
                                <input type="text" name="title" value={quiz.title || ''} onChange={handleQuizInfoChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Kateqoriya</label>
                                <ComboBox options={existingCategories} value={quiz.category || ''} onChange={handleCategoryChange} placeholder="Kateqoriyanı seçin və ya yazın..." />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Təsvir</label>
                                <textarea name="description" value={quiz.description || ''} onChange={handleQuizInfoChange} rows="4" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"></textarea>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><PencilAltIcon /> Parametrlər</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Test üçün vaxt (dəqiqə)</label>
                                <input type="number" name="timeLimit" value={quiz.timeLimit || 10} onChange={handleQuizInfoChange} min="1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div className="space-y-3 pt-2 border-t">
                                <label className="flex items-center cursor-pointer"><input type="checkbox" name="shuffleQuestions" checked={!!quiz.shuffleQuestions} onChange={handleQuizInfoChange} className="h-4 w-4 text-orange-600 rounded border-gray-300" /> <span className="ml-2 text-sm text-gray-700">Sualları qarışdır</span></label>
                                <label className="flex items-center cursor-pointer"><input type="checkbox" name="shuffleOptions" checked={!!quiz.shuffleOptions} onChange={handleQuizInfoChange} className="h-4 w-4 text-orange-600 rounded border-gray-300" /> <span className="ml-2 text-sm text-gray-700">Variantları qarışdır</span></label>
                                <label className="flex items-center cursor-pointer"><input type="checkbox" name="display_all_questions" checked={!!quiz.display_all_questions} onChange={handleQuizInfoChange} className="h-4 w-4 text-orange-600 rounded border-gray-300" /> <span className="ml-2 text-sm text-gray-700">Bütün sualları bir səhifədə göstər</span></label>
                                <label className="flex items-center cursor-pointer"><input type="checkbox" name="allow_back_navigation" checked={quiz.allow_back_navigation === true} onChange={handleQuizInfoChange} className="h-4 w-4 text-orange-600 rounded border-gray-300" /> <span className="ml-2 text-sm text-gray-700">Geri qayıtmağa icazə ver</span></label>
                                <label className="flex items-center cursor-pointer"><input type="checkbox" name="is_published" checked={!!quiz.is_published} onChange={handleQuizInfoChange} className="h-4 w-4 text-orange-600 rounded border-gray-300" /> <span className="ml-2 text-sm text-gray-700">Dərc et (istifadəçilər üçün görünən)</span></label>
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2"><ClockIcon /> Qabaqcıl Tənzimləmələr</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Başlama vaxtı (Könüllü)</label>
                                <input type="datetime-local" name="start_time" value={formatDateTimeForInput(quiz.start_time)} onChange={handleQuizInfoChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bitmə vaxtı (Könüllü)</label>
                                <input type="datetime-local" name="end_time" value={formatDateTimeForInput(quiz.end_time)} onChange={handleQuizInfoChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Cəhd limiti (0 = limitsiz)</label>
                                <input type="number" name="attempt_limit" value={quiz.attempt_limit || 0} onChange={handleQuizInfoChange} min="0" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Giriş Kodu (Könüllü)</label>
                                <input type="text" name="passcode" value={quiz.passcode || ''} onChange={handleQuizInfoChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" placeholder="Test üçün parol təyin et" />
                            </div>
                        </div>
                    </Card>
                </div>

                {/* --- Right Column: Questions --- */}
                <div className="lg:col-span-2 space-y-6">
                    <Card>
                        <div className="flex flex-wrap gap-4 justify-between items-center mb-4">
                            <h2 className="text-xl font-bold text-gray-800">Suallar ({quiz.questions.length})</h2>
                            <div className="flex flex-wrap gap-2">
                                <Button onClick={generate9thGradeTemplate} variant="secondary">9-cu Sinif Şablonu</Button>
                                <Button onClick={generate11thGradeTemplate} variant="secondary">11-ci Sinif Şablonu</Button>
                            <Button onClick={handleExportToWord} variant="secondary"><DownloadIcon /> Word</Button>
                                <Button onClick={onAddFromBankRequest} variant="secondary"><LibraryIcon />Bankdan</Button>
                                <Button onClick={onImportRequest} variant="secondary"><UploadIcon />CSV-dən</Button>
                                <Button onClick={() => onSaveAllQuestionsToBank(quiz.questions)} variant="secondary"><SaveIcon />Hamısını Banka Göndər</Button>
                                <Button onClick={() => setIsAIGeneratorOpen(true)} variant="primary"><SparklesIcon />AI ilə Yarat</Button>
                                <Button onClick={addQuestion}><PlusIcon />Yeni Sual</Button>
                            </div>
                        </div>
                        <div className="space-y-4">
                            {quiz.questions.map((q, index) => (
                                <QuestionEditor
                                    key={q.id}
                                    question={q}
                                    index={index}
                                    onUpdate={updateQuestion}
                                    onDelete={() => deleteQuestion(q.id)}
                                    onDuplicate={() => handleDuplicateQuestion(q.id)}
                                    onSaveToBank={() => onSaveQuestionToBank(q)}
                                    onGenerateVariation={() => handleGenerateVariation(q)}
                                    uniqueTags={uniqueTags}
                                />
                            ))}
                        </div>
                        {quiz.questions.length === 0 && (
                            <div className="text-center py-12 border-2 border-dashed border-gray-300 rounded-lg">
                                <p className="text-gray-500">Hələ heç bir sual əlavə edilməyib. Yuxarıdakı düymələrdən istifadə edərək sual əlavə edin.</p>
                            </div>
                        )}
                    </Card>
                </div>
            </div>
        </div>
        </>
    );
};

export default QuizEditorPage;
