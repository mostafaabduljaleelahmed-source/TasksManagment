import React from 'react';
import { X, Code, Download, ArrowLeftRight } from 'lucide-react';
import { DiffEditor } from '@monaco-editor/react';

interface SubmissionDiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  originalCode: string;
  modifiedCode: string;
  originalTitle?: string;
  modifiedTitle?: string;
  language?: string;
}

export const SubmissionDiffModal: React.FC<SubmissionDiffModalProps> = ({
  isOpen,
  onClose,
  originalCode,
  modifiedCode,
  originalTitle = 'Previous Attempt',
  modifiedTitle = 'Selected Attempt',
  language = 'python'
}) => {
  if (!isOpen) return null;

  const handleDownload = () => {
    const blob = new Blob([modifiedCode], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `submission_attempt.${language === 'cpp' ? 'cpp' : language === 'java' ? 'java' : 'py'}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#121215] border border-[#2B2B36] rounded-2xl max-w-5xl w-full h-[85vh] p-6 flex flex-col space-y-4 shadow-2xl animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#1F1F26] pb-4">
          <div className="flex items-center gap-2 text-violet-400 font-extrabold text-sm">
            <ArrowLeftRight className="w-5 h-5" />
            <span>Code Attempt Comparison Diff</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDownload}
              className="px-3.5 py-1.5 bg-[#1F1F26] hover:bg-[#2A2A34] border border-[#2B2B36] rounded-xl text-xs font-semibold text-zinc-200 transition-all flex items-center gap-2"
            >
              <Download className="w-4 h-4 text-violet-400" />
              Download Code
            </button>
            <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Diff Labels */}
        <div className="grid grid-cols-2 gap-4 text-xs font-bold text-zinc-400 px-2">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-amber-400" />
            <span>{originalTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-emerald-400" />
            <span>{modifiedTitle}</span>
          </div>
        </div>

        {/* Monaco Diff Editor Workspace */}
        <div className="flex-1 border border-[#262632] rounded-xl overflow-hidden bg-[#09090B]">
          <DiffEditor
            original={originalCode}
            modified={modifiedCode}
            language={language}
            theme="vs-dark"
            options={{
              readOnly: true,
              renderSideBySide: true,
              minimap: { enabled: false },
              fontSize: 13,
              scrollBeyondLastLine: false,
            }}
          />
        </div>
      </div>
    </div>
  );
};
