
import React, { useState, useRef } from 'react';
import { SchemeMetadata } from '../types';
import { getAcademicYears } from '../utils/dateUtils';
import { SUBJECT_TEMPLATES } from '../constants';
import { FileText, Sparkles, Upload, FileUp, X, Loader2, CheckCircle2, Calendar } from 'lucide-react';
import { extractSyllabusInfo } from '../services/geminiService';

interface InputFormProps {
  onGenerate: (metadata: SchemeMetadata, syllabusFile?: { data: string, mimeType: string }) => void;
}

const InputForm: React.FC<InputFormProps> = ({ onGenerate }) => {
  const [formData, setFormData] = useState<SchemeMetadata>({
    subject: '',
    form: '',
    weeksPerTerm: 12,
    lessonsPerWeek: 6, // Updated default to 6 for 72 lessons/term (12 weeks * 6 lessons)
    teacherName: '',
    school: '',
    academicYear: getAcademicYears()[0],
    termStarts: {
      term1: new Date().toISOString().split('T')[0],
      term2: new Date(new Date().setMonth(new Date().getMonth() + 4)).toISOString().split('T')[0],
      term3: new Date(new Date().setMonth(new Date().getMonth() + 8)).toISOString().split('T')[0]
    }
  });

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isExtracted, setIsExtracted] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name.startsWith('termStart')) {
      const termKey = name.split('-')[1] as keyof typeof formData.termStarts;
      setFormData(prev => ({ ...prev, termStarts: { ...prev.termStarts, [termKey]: value } }));
    } else {
      setFormData(prev => ({ ...prev, [name]: name === 'weeksPerTerm' || name === 'lessonsPerWeek' ? parseInt(value) || 0 : value }));
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
          setFormData(prev => ({ ...prev, subject: info.subject, form: info.form, weeksPerTerm: info.recommendedWeeksPerTerm }));
          setIsExtracted(true);
        } finally { setIsExtracting(false); }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onGenerate(formData, fileBase64 ? { data: fileBase64, mimeType: 'application/pdf' } : undefined);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="space-y-2">
          <label className="text-sm font-medium flex items-center gap-2 text-slate-700">
            <Upload className="w-4 h-4" /> Syllabus PDF (Optional)
          </label>
          <div onClick={() => !selectedFile && fileInputRef.current?.click()} className="border-2 border-dashed rounded-xl p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors">
            <input type="file" ref={fileInputRef} className="hidden" accept="application/pdf" onChange={handleFileChange} />
            {selectedFile ? <p className="text-sm font-bold text-indigo-600">{selectedFile.name}</p> : <p className="text-sm text-slate-400">Upload to auto-fill metadata & derive 216 lessons</p>}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <input required name="subject" value={formData.subject} onChange={handleChange} className="border p-2 rounded-lg" placeholder="Subject (e.g. Physics)" />
          <input required name="form" value={formData.form} onChange={handleChange} className="border p-2 rounded-lg" placeholder="Form/Class (e.g. Form 3)" />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {['term1', 'term2', 'term3'].map((t, idx) => (
            <div key={t} className="space-y-1">
              <label className="text-[10px] font-bold text-slate-500 uppercase">Term {idx + 1} Start</label>
              <input type="date" name={`termStart-${t}`} value={formData.termStarts[t as keyof typeof formData.termStarts]} onChange={handleChange} className="w-full border p-2 rounded-lg text-xs" />
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Weeks Per Term</label>
            <input type="number" name="weeksPerTerm" value={formData.weeksPerTerm} onChange={handleChange} className="w-full border p-2 rounded-lg" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-slate-500 uppercase">Lessons Per Week</label>
            <input type="number" name="lessonsPerWeek" value={formData.lessonsPerWeek} onChange={handleChange} className="w-full border p-2 rounded-lg" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-indigo-600 uppercase">Total Lessons</label>
            <div className="w-full bg-indigo-100 p-2 rounded-lg text-center font-bold text-indigo-700">
              216 (Fixed)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <input name="teacherName" value={formData.teacherName} onChange={handleChange} className="border p-2 rounded-lg" placeholder="Teacher" />
          <input name="school" value={formData.school} onChange={handleChange} className="border p-2 rounded-lg" placeholder="School" />
          <select name="academicYear" value={formData.academicYear} onChange={handleChange} className="border p-2 rounded-lg">
            {getAcademicYears().map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        <button type="submit" disabled={isExtracting} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-lg hover:bg-indigo-700 flex items-center justify-center gap-2">
          {isExtracting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          Generate Full Year Scheme (216 Lessons)
        </button>
      </form>
    </div>
  );
};

export default InputForm;
