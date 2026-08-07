import React from 'react';
import { X, Plus, Minus, FileDiff } from 'lucide-react';

interface CodeDiffViewerProps {
  oldCode: string;
  newCode: string;
  oldAttemptNumber: number;
  newAttemptNumber: number;
  onClose: () => void;
}

interface DiffLine {
  type: 'added' | 'removed' | 'unchanged';
  oldLineNumber?: number;
  newLineNumber?: number;
  content: string;
}

export const CodeDiffViewer: React.FC<CodeDiffViewerProps> = ({
  oldCode,
  newCode,
  oldAttemptNumber,
  newAttemptNumber,
  onClose,
}) => {
  const computeDiff = (): DiffLine[] => {
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    const diff: DiffLine[] = [];

    let i = 0;
    let j = 0;

    while (i < oldLines.length || j < newLines.length) {
      if (i < oldLines.length && j < newLines.length && oldLines[i] === newLines[j]) {
        diff.push({
          type: 'unchanged',
          oldLineNumber: i + 1,
          newLineNumber: j + 1,
          content: oldLines[i],
        });
        i++;
        j++;
      } else if (j < newLines.length && (!oldLines.includes(newLines[j]) || i >= oldLines.length)) {
        diff.push({
          type: 'added',
          newLineNumber: j + 1,
          content: newLines[j],
        });
        j++;
      } else if (i < oldLines.length) {
        diff.push({
          type: 'removed',
          oldLineNumber: i + 1,
          content: oldLines[i],
        });
        i++;
      }
    }

    return diff;
  };

  const diffLines = computeDiff();
  const addedCount = diffLines.filter((l) => l.type === 'added').length;
  const removedCount = diffLines.filter((l) => l.type === 'removed').length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 dir-rtl" dir="rtl">
      <div className="w-full max-w-5xl h-[85vh] bg-[#111827] border border-[#1F2937] rounded-3xl shadow-2xl flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F2937] bg-[#1A2234]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl">
              <FileDiff className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                مقارنة الفروقات بين المحاولات (Diff View)
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                مقارنة المحاولة #{oldAttemptNumber} مع المحاولة الأخيرة #{newAttemptNumber}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 text-xs font-mono">
              <span className="px-2.5 py-1 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                <Plus className="w-3.5 h-3.5" /> +{addedCount} إضافات
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/30 font-bold flex items-center gap-1">
                <Minus className="w-3.5 h-3.5" /> -{removedCount} محذوفات
              </span>
            </div>

            <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-xl hover:bg-zinc-800 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Diff Code Container */}
        <div className="flex-1 overflow-y-auto p-4 bg-[#0B0F19] font-mono text-xs leading-relaxed space-y-0.5">
          {diffLines.map((line, idx) => (
            <div
              key={idx}
              className={`flex items-start px-3 py-0.5 rounded ${
                line.type === 'added'
                  ? 'bg-emerald-500/15 text-emerald-300 border-r-2 border-emerald-400'
                  : line.type === 'removed'
                  ? 'bg-rose-500/15 text-rose-300 border-r-2 border-rose-400 line-through opacity-75'
                  : 'text-zinc-300 hover:bg-[#111827]'
              }`}
            >
              <div className="w-12 text-zinc-600 text-left shrink-0 select-none text-[10px] pl-2 font-mono">
                {line.oldLineNumber || ''}
              </div>
              <div className="w-12 text-zinc-600 text-left shrink-0 select-none text-[10px] pl-2 font-mono border-l border-[#1F2937] ml-2">
                {line.newLineNumber || ''}
              </div>
              <div className="w-6 text-center shrink-0 font-bold">
                {line.type === 'added' ? '+' : line.type === 'removed' ? '-' : ' '}
              </div>
              <pre className="flex-1 whitespace-pre-wrap font-mono">{line.content}</pre>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
};
