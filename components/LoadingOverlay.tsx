
import React, { useState, useEffect } from 'react';
import { LOADING_MESSAGES } from '../constants';
import { Loader2, Sparkles } from 'lucide-react';

interface LoadingOverlayProps {
  customMessage?: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ customMessage }) => {
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setMessageIndex(prev => (prev + 1) % LOADING_MESSAGES.length);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex flex-col items-center justify-center p-6">
      <div className="bg-white rounded-[2.5rem] p-12 max-w-lg w-full shadow-2xl flex flex-col items-center text-center animate-in fade-in zoom-in duration-500">
        <div className="relative mb-8">
          <div className="absolute -inset-4 bg-indigo-50 rounded-full animate-pulse"></div>
          <Loader2 className="w-20 h-20 text-indigo-600 animate-spin relative z-10" />
          <div className="absolute top-0 right-0">
            <Sparkles className="w-6 h-6 text-indigo-400 animate-bounce" />
          </div>
        </div>
        
        <h3 className="text-2xl font-black text-slate-800 mb-2 uppercase tracking-tight">Constructing Academic Year</h3>
        
        <div className="h-10 flex items-center justify-center">
          <p className="text-indigo-600 font-black text-sm uppercase tracking-[0.15em] animate-pulse">
            {customMessage || "Initializing Generation..."}
          </p>
        </div>
        
        <p className="text-slate-500 h-16 flex items-center justify-center transition-all duration-700 italic text-base px-4">
          "{LOADING_MESSAGES[messageIndex]}"
        </p>

        <div className="w-full bg-slate-100 h-3 rounded-full mt-8 overflow-hidden border border-slate-200 p-0.5">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-700 h-full animate-progress-indeterminate rounded-full"></div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-slate-100 w-full">
          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
            Generating 18 chunks of 12 lessons each.<br/>
            This multi-stage process ensures high quality and no truncation.<br/>
            Estimated completion: 1-2 minutes.
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes progress-indeterminate {
          0% { transform: scaleX(0.1) translateX(-100%); }
          50% { transform: scaleX(0.5) translateX(25%); }
          100% { transform: scaleX(0.1) translateX(120%); }
        }
        .animate-progress-indeterminate {
          animation: progress-indeterminate 2.5s infinite ease-in-out;
          width: 100%;
          transform-origin: left;
        }
      `}</style>
    </div>
  );
};

export default LoadingOverlay;
