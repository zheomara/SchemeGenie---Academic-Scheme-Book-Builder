
import React, { useState, useEffect } from 'react';
import { Download, Layout, RotateCcw, Printer, PlusCircle, Sparkles, FolderArchive, Package, Info, GraduationCap, FileText, FileDown, FileCheck, X, FileSpreadsheet } from 'lucide-react';
import InputForm from './components/InputForm';
import SchemeTable from './components/SchemeTable';
import LoadingOverlay from './components/LoadingOverlay';
import { SchemeBook, SchemeMetadata, Lesson } from './types';
import { generateLessonChunk, generateLessonResourcesContent } from './services/geminiService';
import { getWeekEndingDate } from './utils/dateUtils';
import { exportToPDF, exportToExcel, exportToWord, downloadFullPackageZip, exportRecordBookExcel } from './utils/exportUtils';

const STORAGE_KEY = 'schemegenie_v10_chunked';

const App: React.FC = () => {
  const [activeScheme, setActiveScheme] = useState<SchemeBook | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) setActiveScheme(parsed[0]);
      } catch (e) { }
    }
  }, []);

  useEffect(() => {
    if (activeScheme) localStorage.setItem(STORAGE_KEY, JSON.stringify([activeScheme]));
  }, [activeScheme]);

  const handleGenerate = async (metadata: SchemeMetadata, syllabusFile?: { data: string, mimeType: string }) => {
    setIsLoading(true);
    setError(null);
    const allLessons: Lesson[] = [];
    
    try {
      const CHUNK_SIZE = 24; // Increased from 12 to 24 to reduce API call count
      const LESSONS_PER_TERM = 72;

      for (let termNum = 1; termNum <= 3; termNum++) {
        for (let lessonStart = 1; lessonStart <= LESSONS_PER_TERM; lessonStart += CHUNK_SIZE) {
          const lessonEnd = Math.min(lessonStart + CHUNK_SIZE - 1, LESSONS_PER_TERM);
          
          setLoadingStep(`Term ${termNum}: Building Lessons ${lessonStart}-${lessonEnd}...`);
          
          const chunkData = await generateLessonChunk(termNum, lessonStart, lessonEnd, metadata, syllabusFile);
          
          const mappedChunk: Lesson[] = chunkData.map((l, index) => {
            const lessonNum = lessonStart + index;
            const weekInTerm = Math.ceil(lessonNum / metadata.lessonsPerWeek);
            const startDate = metadata.termStarts[`term${termNum as 1|2|3}`];
            
            return {
              id: `lesson-${termNum}-${lessonNum}-${Date.now()}`,
              term: termNum,
              week: weekInTerm,
              lessonNumber: lessonNum,
              topic: l.topic || 'New Topic',
              objectives: l.objectives || 'Detailed objectives pending...',
              concepts: l.concepts || '',
              activities: l.activities || 'Detailed procedures pending...',
              resources: l.resources || 'Exhaustive list of materials pending...',
              assessment: l.assessment || 'Formative assessment tasks...',
              homework: l.homework || 'Application tasks...',
              evaluation: l.evaluation || 'Specific success criteria...',
              remarks: '',
              weekEnding: getWeekEndingDate(startDate, weekInTerm),
            };
          });
          
          allLessons.push(...mappedChunk);
        }
      }

      setActiveScheme({
        id: `scheme-${Date.now()}`,
        metadata,
        lessons: allLessons,
        createdAt: Date.now()
      });
    } catch (err: any) {
      setError(err.message || "The generation process was interrupted. Please check your internet or try again in a few minutes.");
    } finally {
      setIsLoading(false);
      setLoadingStep('');
    }
  };

  const handleGenerateResources = async (lesson: Lesson) => {
    if (!activeScheme) return;
    updateLesson(lesson.id, 'isGeneratingResources', true);
    try {
      const resources = await generateLessonResourcesContent(lesson, activeScheme.metadata);
      setActiveScheme(prev => prev ? {
        ...prev,
        lessons: prev.lessons.map(l => l.id === lesson.id ? { ...l, ...resources, isGeneratingResources: false } : l)
      } : null);
    } catch (err) {
      alert("Failed to build detailed bundle. You might have hit the daily API quota.");
      updateLesson(lesson.id, 'isGeneratingResources', false);
    }
  };

  const updateLesson = (id: string, field: keyof Lesson, value: any) => {
    setActiveScheme(prev => prev ? {
      ...prev,
      lessons: prev.lessons.map(l => l.id === id ? { ...l, [field]: value } : l)
    } : null);
  };

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      <header className="bg-slate-800 text-white shadow-lg no-print sticky top-0 z-40">
        <div className="container mx-auto px-4 md:px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 p-1.5 rounded-lg shrink-0"><Package className="w-5 h-5 md:w-6 md:h-6" /></div>
            <div>
              <h1 className="text-lg md:text-xl font-bold leading-tight">SchemeGenie</h1>
              <p className="text-[10px] md:text-xs text-indigo-300 italic uppercase tracking-widest font-black">High Fidelity Batch Mapping • 216 Lessons</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeScheme && (
              <button onClick={() => { if(confirm("Discard current plan and start over?")) setActiveScheme(null); }} className="p-2 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white" title="New Scheme">
                <RotateCcw className="w-5 h-5" />
              </button>
            )}
            <div className="h-6 w-px bg-slate-700 mx-1 hidden md:block"></div>
            {activeScheme && (
              <div className="flex items-center gap-1 md:gap-2">
                 <button onClick={() => exportToPDF(activeScheme)} className="bg-rose-600 hover:bg-rose-500 text-white p-2 md:px-3 md:py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
                   <FileDown className="w-4 h-4" />
                   <span className="hidden sm:inline">PDF</span>
                 </button>
                 <button onClick={() => exportToWord(activeScheme)} className="bg-blue-600 hover:bg-blue-500 text-white p-2 md:px-3 md:py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
                   <FileText className="w-4 h-4" />
                   <span className="hidden sm:inline">DOCX</span>
                 </button>
                 <button onClick={() => exportToExcel(activeScheme)} className="bg-emerald-600 hover:bg-emerald-500 text-white p-2 md:px-3 md:py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5">
                   <FileSpreadsheet className="w-4 h-4" />
                   <span className="hidden sm:inline">EXCEL</span>
                 </button>
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 md:px-6 py-8">
        {!activeScheme ? (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-4 py-10">
              <h2 className="text-4xl md:text-6xl font-extrabold text-slate-800 tracking-tight leading-none">Complete Year <br/><span className="text-indigo-600">Deep-Syllabus Mapping</span></h2>
              <p className="text-base md:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Generating 216 lessons optimized for API efficiency. Each lesson is detailed with specific resources and evaluation criteria.
              </p>
            </div>
            <InputForm onGenerate={handleGenerate} />
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex flex-col gap-2 mt-4">
                <div className="flex items-center gap-3">
                  <Layout className="w-5 h-5" />
                  <span className="font-bold">Generation Error</span>
                </div>
                <p className="text-sm opacity-80">{error}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 no-print">
              <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-slate-200 p-8 flex flex-col justify-center relative overflow-hidden">
                <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tight leading-none mb-1">{activeScheme.metadata.subject}</h2>
                    <p className="text-slate-500 font-bold text-sm tracking-wide">{activeScheme.metadata.school} • {activeScheme.metadata.form} • {activeScheme.metadata.academicYear}</p>
                    <div className="mt-6 flex flex-wrap gap-2">
                       <span className="bg-indigo-600 text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase flex items-center gap-1.5 shadow-md">
                         <FileCheck className="w-3.5 h-3.5" /> {activeScheme.lessons.length} Lessons Verified
                       </span>
                       <span className="bg-slate-100 text-slate-600 px-4 py-1.5 rounded-full text-[10px] font-black uppercase">
                         Full Academic Year Target Reached
                       </span>
                    </div>
                  </div>
                  <button onClick={() => setActiveScheme(null)} className="text-slate-300 hover:text-rose-500 transition-colors p-2 bg-slate-50 rounded-full">
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>
              
              <div className="bg-slate-800 rounded-2xl shadow-xl p-6 text-white space-y-6">
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 border-b border-slate-700 pb-2">Master Export Suite</h3>
                <div className="grid grid-cols-3 gap-3">
                  <button onClick={() => exportToPDF(activeScheme)} className="flex flex-col items-center justify-center gap-3 bg-slate-700/50 hover:bg-rose-600 p-4 rounded-2xl transition-all border border-slate-600/50 group">
                    <FileDown className="w-6 h-6 group-hover:scale-110 transition-transform text-rose-400 group-hover:text-white" />
                    <span className="text-[8px] font-black uppercase tracking-widest">A4 PDF</span>
                  </button>
                  <button onClick={() => exportToWord(activeScheme)} className="flex flex-col items-center justify-center gap-3 bg-slate-700/50 hover:bg-blue-600 p-4 rounded-2xl transition-all border border-slate-600/50 group">
                    <FileText className="w-6 h-6 group-hover:scale-110 transition-transform text-blue-400 group-hover:text-white" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Word</span>
                  </button>
                  <button onClick={() => exportToExcel(activeScheme)} className="flex flex-col items-center justify-center gap-3 bg-slate-700/50 hover:bg-emerald-600 p-4 rounded-2xl transition-all border border-slate-600/50 group">
                    <FileSpreadsheet className="w-6 h-6 group-hover:scale-110 transition-transform text-emerald-400 group-hover:text-white" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Excel</span>
                  </button>
                  <button onClick={() => exportRecordBookExcel(activeScheme)} className="flex flex-col items-center justify-center gap-3 bg-slate-700/50 hover:bg-indigo-600 p-4 rounded-2xl transition-all border border-slate-600/50 group">
                    <GraduationCap className="w-6 h-6 group-hover:scale-110 transition-transform text-indigo-400 group-hover:text-white" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Grades</span>
                  </button>
                  <button onClick={() => downloadFullPackageZip(activeScheme)} className="flex flex-col items-center justify-center gap-3 bg-slate-700/50 hover:bg-slate-600 p-4 rounded-2xl transition-all border border-slate-600/50 group">
                    <FolderArchive className="w-6 h-6 group-hover:scale-110 transition-transform text-slate-400 group-hover:text-white" />
                    <span className="text-[8px] font-black uppercase tracking-widest">Zip</span>
                  </button>
                </div>
              </div>
            </div>

            <SchemeTable lessons={activeScheme.lessons} metadata={activeScheme.metadata} onUpdateLesson={updateLesson} onGenerateResources={handleGenerateResources} />
          </div>
        )}
      </main>
      {isLoading && <LoadingOverlay customMessage={loadingStep} />}
    </div>
  );
};

export default App;
