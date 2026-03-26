
import React, { useState, useRef } from 'react';
import { SchemeMetadata } from '../types';
import { getAcademicYears } from '../utils/dateUtils';
import { FileText, Sparkles, Upload, FileUp, X, Loader2, ListOrdered, PencilLine, Info, Settings2 } from 'lucide-react';
import { extractSyllabusInfo } from '../services/geminiService';

interface InputFormProps {
  onGenerate: (metadata: SchemeMetadata, syllabusFile?: { data: string, mimeType: string }) => void;
}

const InputForm: React.FC<InputFormProps> = ({ onGenerate }) => {
  const [inputMode, setInputMode] = useState<'upload' | 'manual'>('upload');
  const [formData, setFormData] = useState<SchemeMetadata>({
    subject: '',
    form: '',
    weeksPerTerm: 12,
    lessonsPerWeek: 6,
    lessonsPerTerm: 72,
    teacherName: '',
    school: '',
    academicYear: getAcademicYears()[0],
    manualTopics: '',
    termStarts: {
      term1: new Date().toISOString().split('T')[0],
      term2: new Date(new Date().setMonth(new Date().getMonth() + 4)).toISOString().split('T')[0],
      term3: new Date(new Date().setMonth(new Date().getMonth() + 8)).toISOString().split('T')[0]
    }
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('termStart')) {
      const termKey = name.split('-')[1] as keyof typeof formData.termStarts;
      setFormData(prev => ({ ...prev, termStarts: { ...prev.termStarts, [termKey]: value } }));
    } else {
      setFormData(prev => {
        const nextValue = (name === 'weeksPerTerm' || name === 'lessonsPerWeek' || name === 'lessonsPerTerm') ? parseInt(value) || 0 : value;
        const nextData = { ...prev, [name]: nextValue };
        
        // Auto-calculate lessonsPerTerm if weeksPerTerm or lessonsPerWeek changes
        if (name === 'weeksPerTerm' || name === 'lessonsPerWeek') {
          nextData.lessonsPerTerm = nextData.weeksPerTerm * nextData.lessonsPerWeek;
        }
        
        return nextData;
      });
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file?.type === 'application/pdf') {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        setFileBase64(base64);
        setIsExtracting(true);
        try {
          const info = await extractSyllabusInfo({ data: base64, mimeType: 'application/pdf' });
          setFormData(prev => ({ 
            ...prev, 
            subject: info.subject, 
            form: info.form, 
            weeksPerTerm: info.recommendedWeeksPerTerm,
            lessonsPerWeek: info.recommendedLessonsPerWeek,
            lessonsPerTerm: info.recommendedWeeksPerTerm * info.recommendedLessonsPerWeek
          }));
        } finally { setIsExtracting(false); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(formData, inputMode === 'upload' && fileBase64 ? { data: fileBase64, mimeType: 'application/pdf' } : undefined);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <div className="flex border-b border-slate-100">
        <button 
          type="button"
          onClick={() => setInputMode('upload')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${inputMode === 'upload' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <Upload className="w-4 h-4" /> Upload Syllabus PDF
        </button>
        <button 
          type="button"
          onClick={() => setInputMode('manual')}
          className={`flex-1 py-4 flex items-center justify-center gap-2 text-xs font-black uppercase tracking-widest transition-all ${inputMode === 'manual' ? 'bg-indigo-50 text-indigo-700 border-b-2 border-indigo-600' : 'text-slate-400 hover:bg-slate-50'}`}
        >
          <ListOrdered className="w-4 h-4" /> Enter Topics Manually
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {inputMode === 'upload' ? (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-slate-700">
              <FileUp className="w-4 h-4" /> Syllabus Document (PDF)
            </label>
            <div 
              onClick={() => !selectedFile && fileInputRef.current?.click()} 
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-all ${selectedFile ? 'border-indigo-200 bg-indigo-50' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50 cursor-pointer'}`}
            >
              <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileChange} />
              {selectedFile ? (
                <div className="flex flex-col items-center gap-2">
                  <div className="bg-white p-2 rounded-lg shadow-sm border border-indigo-100">
                    <p className="text-sm font-black text-indigo-600">{selectedFile.name}</p>
                  </div>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); setFileBase64(null); }} className="text-[10px] text-rose-500 font-bold uppercase hover:underline">Remove File</button>
                </div>
              ) : (
                <div className="space-y-1">
                  <p className="text-sm text-slate-500 font-medium">Click to upload your syllabus PDF</p>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider text-center">AI will extract and sequence topics from this document</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2 text-slate-700">
              <PencilLine className="w-4 h-4" /> Custom Topic List (Strict Adherence)
            </label>
            <textarea
              name="manualTopics"
              value={formData.manualTopics}
              onChange={handleChange}
              placeholder="Paste your specific topics here. The AI will ONLY use these topics and will not add outside content."
              className="w-full border border-slate-200 p-4 rounded-xl text-sm min-h-[120px] focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all placeholder:text-slate-300"
            />
            <p className="text-[10px] text-slate-400 flex items-center gap-1">
              <Info className="w-3 h-3 text-indigo-500" /> <strong>Strict Mode:</strong> No external syllabus data will be added.
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Subject</label>
            <input required name="subject" value={formData.subject} onChange={handleChange} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Physics" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Form / Grade</label>
            <input required name="form" value={formData.form} onChange={handleChange} className="w-full border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="e.g. Form 3" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {['term1', 'term2', 'term3'].map((t, idx) => (
            <div key={t} className="space-y-1">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Term {idx + 1} Start</label>
              <input type="date" name={`termStart-${t}`} value={formData.termStarts[t as keyof typeof formData.termStarts]} onChange={handleChange} className="w-full border p-2 rounded-lg text-xs focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
          ))}
        </div>

        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Settings2 className="w-4 h-4 text-slate-400" />
            <span className="text-xs font-black uppercase tracking-widest text-slate-500">Curriculum Structure</span>
          </div>
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Weeks/Term</label>
              <input type="number" name="weeksPerTerm" value={formData.weeksPerTerm} onChange={handleChange} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lessons/Week</label>
              <input type="number" name="lessonsPerWeek" value={formData.lessonsPerWeek} onChange={handleChange} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lessons/Term</label>
              <input type="number" name="lessonsPerTerm" value={formData.lessonsPerTerm} onChange={handleChange} className="w-full border p-2.5 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-indigo-600" />
              <p className="text-[8px] text-slate-400 uppercase font-black">Target total</p>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Year Total</label>
              <div className="w-full bg-indigo-100 p-2.5 rounded-xl text-center font-black text-indigo-700 border border-indigo-200">
                {formData.lessonsPerTerm * 3} Lessons
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <input name="teacherName" value={formData.teacherName} onChange={handleChange} className="border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="Teacher Name" />
          <input name="school" value={formData.school} onChange={handleChange} className="border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" placeholder="School Name" />
          <select name="academicYear" value={formData.academicYear} onChange={handleChange} className="border p-2.5 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white">
            {getAcademicYears().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <button 
          type="submit" 
          disabled={isExtracting} 
          className="w-full bg-indigo-600 text-white font-black py-4 rounded-xl hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-100 disabled:opacity-50"
        >
          {isExtracting ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Sparkles className="w-5 h-5" />
          )}
          Generate Specific Scheme
        </button>
      </form>
    </div>
  );
};

export default InputForm;
