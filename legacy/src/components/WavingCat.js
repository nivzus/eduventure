import React, { useState, useEffect } from 'react';

const messages = [
    "Uğurlar, tələbə! Bilik gücdür!",
    "Hər sual yeni bir imkandır!",
    "Öyrənməyə davam et, sən bacaracaqsan!",
    "Səhvlər öyrənməyin bir hissəsidir. Cəhd et!",
    "Hər test səni daha da gücləndirir!",
    "Bilik yolunda irəli!",
    "Özünə inan, hər şey yaxşı olacaq!",
    "Bu testi fəth et!",
    "Düşün, öyrən, uğur qazan!",
    "Həvəslə öyrən, zövqlə cavabla!"
];

const WavingCat = () => {
    const [isVisible, setIsVisible] = useState(false);
    const [isWaving, setIsWaving] = useState(false);
    const [currentMessage, setCurrentMessage] = useState('');

    useEffect(() => {
        const scheduleNextAppearance = () => {
            const nextTime = Math.random() * 20000 + 15000; // 15-35s
            const timeoutId = setTimeout(() => {
                const randomIndex = Math.floor(Math.random() * messages.length);
                setCurrentMessage(messages[randomIndex]);
                setIsVisible(true);
                setTimeout(() => setIsWaving(true), 500);

                setTimeout(() => {
                    setIsWaving(false);
                    setIsVisible(false);
                    scheduleNextAppearance();
                }, 5000);
            }, nextTime);
            return timeoutId;
        };
        
        const initialTimeout = setTimeout(scheduleNextAppearance, 7000);
        return () => clearTimeout(initialTimeout);
    }, []);

    return (
        <div className={`fixed bottom-0 right-[-120px] sm:right-[-160px] transition-all duration-1000 ease-in-out z-50 ${isVisible ? 'right-[-15px] sm:right-[-20px]' : ''}`}>
            {isVisible && (
                <div className="absolute bottom-full left-1/2 ml-[-2rem] mb-3 w-32 sm:w-40 bg-white p-3 rounded-lg shadow-lg text-sm text-gray-800 text-center transform -translate-x-1/2 -translate-y-1/2">
                    {currentMessage}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-8 border-transparent border-t-white"></div>
                </div>
            )}
            <svg width="160" height="150" viewBox="0 0 160 150" className="w-[120px] h-auto sm:w-[160px]">
                {/* Tail with a white tip */}
                <path d="M135 90 C 160 90, 160 40, 130 40 C 125 40, 145 85, 135 90 Z" fill="#F97316"/>
                <path d="M130 40 C 125 30, 135 30, 132 40" fill="white"/>

                {/* Body */}
                <path d="M 50,130 C 10,130 10,80 40,70 C 50,20 110,20 120,70 C 150,80 150,130 110,130 Z" fill="#F97316"/>

                {/* Ears with lighter inner parts */}
                <path d="M 40,70 Q 30,40 60,50 Z" fill="#F97316"/>
                <path d="M 120,70 Q 130,40 100,50 Z" fill="#F97316"/>
                <path d="M 50,65 Q 45,50 60,55 Z" fill="#FED7AA"/>
                <path d="M 110,65 Q 115,50 100,55 Z" fill="#FED7AA"/>

                {/* Face details */}
                <circle cx="70" cy="75" r="5" fill="black"/>
                <circle cx="90" cy="75" r="5" fill="black"/>
                <path d="M 78,85 L 82,85 L 80,88 Z" fill="#F472B6"/> {/* Nose */}
                <path d="M 70,92 C 75,95 78,92 78,92" stroke="black" strokeWidth="1" fill="none" strokeLinecap="round"/>
                <path d="M 90,92 C 85,95 82,92 82,92" stroke="black" strokeWidth="1" fill="none" strokeLinecap="round"/>

                {/* Whiskers */}
                <path d="M 55,80 L 40,75" stroke="black" strokeWidth="0.5"/>
                <path d="M 55,85 L 38,85" stroke="black" strokeWidth="0.5"/>
                <path d="M 55,90 L 40,95" stroke="black" strokeWidth="0.5"/>
                <path d="M 105,80 L 120,75" stroke="black" strokeWidth="0.5"/>
                <path d="M 105,85 L 122,85" stroke="black" strokeWidth="0.5"/>
                <path d="M 105,90 L 120,95" stroke="black" strokeWidth="0.5"/>

                {/* Waving Paw with toe details */}
                <g style={{ transformOrigin: '20px 100px', transition: 'transform 0.5s' }} className={isWaving ? 'animate-wave' : ''}>
                    <path d="M 30,110 C 15,110 15,90 40,90 C 60,90 60,110 50,110 Z" fill="#FB923C"/>
                    <path d="M 38,91 C 42,93 41,97 38,96" stroke="#F97316" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                    <path d="M 45,91 C 49,93 48,97 45,96" stroke="#F97316" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
                </g>
            </svg>
        </div>
    );
};

export default WavingCat;