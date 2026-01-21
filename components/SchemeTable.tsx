
import React, { useState } from 'react';
import { Lesson, SchemeMetadata } from '../types';
import { PackageOpen, Loader2, ChevronRight, Hash, CalendarDays, BookOpen } from 'lucide-react';
import { downloadLessonResourcesZip } from '../utils/exportUtils';

interface SchemeTableProps {
  lessons: Lesson[];
  metadata: SchemeMetadata;
  onUpdateLesson: (id: string, field: keyof Lesson, value: any) => void;
  onGenerateResources: (lesson: Lesson) => Promise<void>;
}

const SchemeTable: React.FC<SchemeTableProps> = ({ lessons, metadata, onUpdateLesson, onGenerateResources }) => {
  const [activeTerm, setActiveTerm] = useState<number>(1);
  const terms = [1, 2, 3];

  const scrollToTerm = (term: number) => {
    setActiveTerm(term);
    const element = document.getElementById(`term-section-${term}`);
    if (element) {
      const offset = 140; // Account for sticky headers
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className="space-y-8">
      {/* Term Navigation Bar */}
      <div className="sticky top-[64px] z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 py-3 no-print">
        <div className="flex items-center justify-center gap-2 md:gap-4">
          {terms.map(t => {
            const count = lessons.filter(l => l.term === t).length;
            const isActive = activeTerm === t;
            return (
              <button
                key={t}
                onClick={() => scrollToTerm(t)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-black transition-all ${
                  isActive 
                  ? 'bg-indigo-600 text-white shadow-lg scale-105' 
                  : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
              >
                TERM {t}
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-indigo-400' : 'bg-slate-300'}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-16">
        {terms.map(termNum => {
          const termLessons = lessons.filter(l => l.term === termNum);
          if (termLessons.length === 0) return null;

          return (
            <div key={termNum} id={`term-section-${termNum}`} className="space-y-4 scroll-mt-40">
              <div className="flex items-center gap-4 px-2">
                <div className="h-10 w-10 bg-slate-800 text-white rounded-xl flex items-center justify-center font-black text-xl shadow-md">
                  {termNum}
                </div>
                <div>
                  <h2 className="text-xl font-black text-slate-800 uppercase tracking-tight">Term {termNum}</h2>
                  <p className="text-xs text-slate-500 font-bold uppercase tracking-widest flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> {termLessons.length} Detailed Lessons Derived from Syllabus
                  </p>
                </div>
              </div>
              
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse table-fixed">
                    <thead className="bg-slate-50 text-[10px] uppercase tracking-wider font-black border-b border-slate-200 text-slate-500">
                      <tr>
                        <th className="px-2 py-4 w-[40px] text-center">Wk</th>
                        <th className="px-2 py-4 w-[40px] text-center">L#</th>
                        <th className="px-2 py-4 w-[85px]">Week Ending</th>
                        <th className="px-2 py-4 w-[130px]">Topic</th>
                        <th className="px-2 py-4 w-[160px]">Objectives</th>
                        <th className="px-2 py-4 w-[160px]">Activities</th>
                        <th className="px-2 py-4 w-[180px]">Resources (Detailed)</th>
                        <th className="px-2 py-4 w-[110px]">Assessment</th>
                        <th className="px-2 py-4 w-[80px] no-print">Bundle</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {termLessons.map((lesson) => (
                        <tr key={lesson.id} className="hover:bg-indigo-50/30 transition-colors align-top">
                          <td className="px-2 py-3 text-center font-black text-slate-400 text-xs">{lesson.week}</td>
                          <td className="px-2 py-3 text-center font-bold text-indigo-600 text-xs">{lesson.lessonNumber}</td>
                          <td className="px-2 py-3 text-[10px] text-slate-500 font-medium leading-tight">
                            <span className="block text-slate-400 text-[8px] font-bold uppercase mb-0.5">Fri</span>
                            {lesson.weekEnding}
                          </td>
                          <td className="px-2 py-3 text-[11px] font-black text-slate-800 leading-snug break-words">
                            {lesson.topic}
                          </td>
                          <td className="px-2 py-3 text-[10px] text-slate-600 leading-relaxed break-words">
                            {lesson.objectives}
                          </td>
                          <td className="px-2 py-3 text-[10px] text-slate-600 leading-relaxed break-words">
                            {lesson.activities}
                          </td>
                          <td className="px-2 py-3 text-[10px] text-slate-700 leading-relaxed font-medium bg-slate-50/50 break-words whitespace-pre-wrap">
                            {lesson.resources}
                          </td>
                          <td className="px-2 py-3 text-[10px] text-slate-500 leading-tight break-words">
                            {lesson.assessment}
                          </td>
                          <td className="px-2 py-3 no-print">
                            {lesson.lessonPlanContent ? (
                              <button 
                                onClick={() => downloadLessonResourcesZip(lesson, metadata)} 
                                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 rounded-lg text-[9px] font-black transition-all shadow-sm"
                              >
                                DOWNLOAD
                              </button>
                            ) : (
                              <button 
                                onClick={() => onGenerateResources(lesson)} 
                                disabled={lesson.isGeneratingResources} 
                                className="w-full border-2 border-indigo-100 text-indigo-600 hover:bg-indigo-50 py-2 rounded-lg text-[9px] font-black transition-all disabled:opacity-50"
                              >
                                {lesson.isGeneratingResources ? (
                                  <Loader2 className="w-3 h-3 animate-spin mx-auto" />
                                ) : (
                                  'GENERATE'
                                )}
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SchemeTable;
