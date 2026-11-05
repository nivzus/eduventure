import React from 'react';
import { StarIcon } from '../assets/icons'; // Иконка звезды остается

// Новый компонент для "печати"
const Seal = () => (
    <div className="w-32 h-32 rounded-full bg-orange-100 border-4 border-orange-500 flex items-center justify-center text-center text-orange-700">
        <div className="border-2 border-dashed border-orange-600 rounded-full w-28 h-28 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center gap-1.5">
                <p className="font-bold text-sm">Eduventure</p>
                <StarIcon className="w-4 h-4 my-2 text-orange-600" />
                <p className="font-bold text-sm">With Seda</p>
            </div>
        </div>
    </div>
);


const Certificate = React.forwardRef(({ studentName, courseTitle, completionDate }, ref) => {
    return (
        // A4 landscape is roughly 1123x794 pixels
        <div 
            ref={ref} 
            className="w-[1123px] h-[794px] bg-orange-50/50 text-gray-800 flex flex-col font-sans p-4"
        >
            <div className="w-full h-full border-2 border-orange-300 p-6 flex flex-col justify-between relative">
                {/* Decorative corners */}
                <div className="absolute top-2 left-2 w-16 h-16 border-t-4 border-l-4 border-orange-500"></div>
                <div className="absolute top-2 right-2 w-16 h-16 border-t-4 border-r-4 border-orange-500"></div>
                <div className="absolute bottom-2 left-2 w-16 h-16 border-b-4 border-l-4 border-orange-500"></div>
                <div className="absolute bottom-2 right-2 w-16 h-16 border-b-4 border-r-4 border-orange-500"></div>

                {/* Header */}
                <div className="text-center z-10">
                    <p className="text-2xl text-gray-500 tracking-widest">UĞURLU TAMAMLAMA</p>
                    <h1 className="text-7xl font-bold text-orange-600 font-serif tracking-wide my-2">SERTİFİKATI</h1>
                    <p className="text-lg text-gray-600">Bu sənəd təsdiq edir ki,</p>
                </div>

                {/* Main Content */}
                <div className="text-center my-8 z-10">
                    <p className="text-6xl font-extrabold text-gray-800 font-serif tracking-wider">
                        {studentName}
                    </p>
                    <div className="w-1/2 h-px bg-orange-300 mx-auto my-6"></div>
                    <p className="text-lg text-gray-600">
                        adlı tələbə <span className="font-bold text-orange-700">"{courseTitle}"</span> kursunu
                    </p>
                    <p className="text-2xl font-semibold text-gray-700 mt-2">
                        uğurla başa vurmuşdur.
                    </p>
                </div>

                {/* Footer */}
                <div className="flex justify-between items-center z-10">
                    <div className="text-center w-1/3">
                        <p className="font-serif text-xl border-b-2 border-gray-400 pb-1 px-4 inline-block">Sədaqət Ağayeva</p>
                        <p className="text-sm mt-1 text-gray-500">Təlimçi</p>
                    </div>
                    <div className="w-1/3 flex justify-center">
                        <Seal />
                    </div>
                    <div className="text-center w-1/3">
                        <p className="font-serif text-xl border-b-2 border-gray-400 pb-1 px-4 inline-block">{completionDate}</p>
                        <p className="text-sm mt-1 text-gray-500">Verilmə Tarixi</p>
                    </div>
                </div>
            </div>
        </div>
    );
});

export default Certificate;
