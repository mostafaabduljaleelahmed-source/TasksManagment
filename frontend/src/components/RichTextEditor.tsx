import React, { useState } from 'react';
import {
  Bold, Italic, Heading1, Heading2, Heading3, List, ListOrdered,
  Code, Table, Image as ImageIcon, Link as LinkIcon, Eye, Edit3
} from 'lucide-react';

interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value,
  onChange,
  placeholder = 'Write assignment description with formatting, code blocks, tables, images, and links...'
}) => {
  const [mode, setMode] = useState<'write' | 'preview'>('write');

  const insertText = (before: string, after: string = '', defaultText: string = '') => {
    const textarea = document.getElementById('rich-text-textarea') as HTMLTextAreaElement | null;
    if (!textarea) {
      onChange(value + before + defaultText + after);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.substring(start, end) || defaultText;

    const newValue = value.substring(0, start) + before + selected + after + value.substring(end);
    onChange(newValue);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selected.length);
    }, 0);
  };

  const handleAddLink = () => {
    const url = prompt('Enter hyperlink URL:', 'https://');
    if (!url) return;
    const title = prompt('Enter link text:', 'Resource Link') || 'Link';
    insertText(`[${title}](`, `)`, url);
  };

  const handleAddImage = () => {
    const url = prompt('Enter image URL:', 'https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=800');
    if (!url) return;
    const alt = prompt('Enter image description/alt text:', 'Assignment Diagram') || 'Image';
    insertText(`![${alt}](`, `)`, url);
  };

  const handleAddTable = () => {
    const tableTemplate = `\n| Feature | Input Format | Expected Output |\n| :--- | :--- | :--- |\n| Test Case 1 | 5 10 | 15 |\n| Test Case 2 | -3 7 | 4 |\n`;
    insertText(tableTemplate);
  };

  return (
    <div className="bg-[#1F1F24] border border-[#2F2F37] rounded-xl overflow-hidden shadow-lg">
      {/* Editor Toolbar Header */}
      <div className="bg-[#16161A] border-b border-[#2F2F37] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-1">
          {/* Headings */}
          <button
            type="button"
            onClick={() => insertText('# ', '\n', 'Heading 1')}
            className="p-1.5 hover:bg-[#272732] text-zinc-400 hover:text-white rounded-lg transition-colors"
            title="Heading 1"
          >
            <Heading1 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertText('## ', '\n', 'Heading 2')}
            className="p-1.5 hover:bg-[#272732] text-zinc-400 hover:text-white rounded-lg transition-colors"
            title="Heading 2"
          >
            <Heading2 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertText('### ', '\n', 'Heading 3')}
            className="p-1.5 hover:bg-[#272732] text-zinc-400 hover:text-white rounded-lg transition-colors"
            title="Heading 3"
          >
            <Heading3 className="w-4 h-4" />
          </button>

          <span className="w-px h-4 bg-[#2F2F37] mx-1" />

          {/* Formatting */}
          <button
            type="button"
            onClick={() => insertText('**', '**', 'bold text')}
            className="p-1.5 hover:bg-[#272732] text-zinc-400 hover:text-white rounded-lg transition-colors"
            title="Bold"
          >
            <Bold className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertText('*', '*', 'italic text')}
            className="p-1.5 hover:bg-[#272732] text-zinc-400 hover:text-white rounded-lg transition-colors"
            title="Italic"
          >
            <Italic className="w-4 h-4" />
          </button>

          <span className="w-px h-4 bg-[#2F2F37] mx-1" />

          {/* Lists */}
          <button
            type="button"
            onClick={() => insertText('- ', '\n', 'List item')}
            className="p-1.5 hover:bg-[#272732] text-zinc-400 hover:text-white rounded-lg transition-colors"
            title="Unordered List"
          >
            <List className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => insertText('1. ', '\n', 'Numbered item')}
            className="p-1.5 hover:bg-[#272732] text-zinc-400 hover:text-white rounded-lg transition-colors"
            title="Ordered List"
          >
            <ListOrdered className="w-4 h-4" />
          </button>

          <span className="w-px h-4 bg-[#2F2F37] mx-1" />

          {/* Advanced Blocks */}
          <button
            type="button"
            onClick={() => insertText('```python\n', '\n```', '# write code snippet here')}
            className="p-1.5 hover:bg-[#272732] text-zinc-400 hover:text-white rounded-lg transition-colors"
            title="Code Block"
          >
            <Code className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleAddTable}
            className="p-1.5 hover:bg-[#272732] text-zinc-400 hover:text-white rounded-lg transition-colors"
            title="Insert Table"
          >
            <Table className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleAddImage}
            className="p-1.5 hover:bg-[#272732] text-zinc-400 hover:text-white rounded-lg transition-colors"
            title="Insert Image"
          >
            <ImageIcon className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={handleAddLink}
            className="p-1.5 hover:bg-[#272732] text-zinc-400 hover:text-white rounded-lg transition-colors"
            title="Insert Link"
          >
            <LinkIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector: Write vs Preview */}
        <div className="flex items-center gap-1 bg-[#1F1F24] p-1 rounded-lg border border-[#2F2F37]">
          <button
            type="button"
            onClick={() => setMode('write')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 ${
              mode === 'write' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Edit3 className="w-3 h-3" />
            Write
          </button>
          <button
            type="button"
            onClick={() => setMode('preview')}
            className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors flex items-center gap-1 ${
              mode === 'preview' ? 'bg-violet-600 text-white' : 'text-zinc-400 hover:text-white'
            }`}
          >
            <Eye className="w-3 h-3" />
            Preview
          </button>
        </div>
      </div>

      {/* Editor Body */}
      {mode === 'write' ? (
        <textarea
          id="rich-text-textarea"
          rows={6}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full bg-[#1F1F24] text-white p-4 text-xs font-mono focus:outline-none resize-y min-h-[140px]"
        />
      ) : (
        <div className="p-4 text-xs bg-[#1A1A20] text-zinc-200 min-h-[140px] overflow-y-auto">
          <RichTextViewer content={value} />
        </div>
      )}
    </div>
  );
};

// RichTextViewer handles rendering markdown/HTML description cleanly and safely
export const RichTextViewer: React.FC<{ content: string }> = ({ content }) => {
  if (!content || !content.trim()) {
    return <p className="text-zinc-500 italic text-xs">No description provided.</p>;
  }

  // Parse lines into clean markdown-like elements
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBlockLines: string[] = [];
  let inTable = false;
  let tableRows: string[][] = [];

  lines.forEach((line, index) => {
    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <div key={`code-${index}`} className="my-3 bg-[#111827] border border-[#1F2937] rounded-xl p-3 font-mono text-xs overflow-x-auto">
            <pre className="text-emerald-400 whitespace-pre-wrap">{codeBlockLines.join('\n')}</pre>
          </div>
        );
        codeBlockLines = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      return;
    }

    // Table detection (lines starting and containing '|')
    if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
      if (!inTable) inTable = true;
      const cells = line.split('|').slice(1, -1).map(c => c.trim());
      // Ignore separator row like | --- | --- |
      if (!cells.every(c => c.startsWith('---') || c.startsWith(':---') || c.startsWith('---:'))) {
        tableRows.push(cells);
      }
      return;
    } else if (inTable) {
      // Flush table
      elements.push(
        <div key={`table-${index}`} className="my-3 overflow-x-auto border border-[#2F2F37] rounded-xl">
          <table className="w-full text-xs text-left text-zinc-300">
            {tableRows.length > 0 && (
              <thead className="bg-[#272732] text-white font-bold border-b border-[#2F2F37]">
                <tr>
                  {tableRows[0].map((headerCell, hIdx) => (
                    <th key={hIdx} className="px-3 py-2 font-bold">{headerCell}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody className="divide-y divide-[#2F2F37] bg-[#1F1F24]">
              {tableRows.slice(1).map((row, rIdx) => (
                <tr key={rIdx} className="hover:bg-[#272732]/50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-3 py-2 font-mono text-zinc-300">{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableRows = [];
      inTable = false;
    }

    // Headings
    if (line.startsWith('# ')) {
      elements.push(<h1 key={index} className="text-xl font-extrabold text-white my-3 tracking-tight border-b border-[#2F2F37] pb-1">{parseFormatting(line.replace('# ', ''))}</h1>);
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(<h2 key={index} className="text-lg font-bold text-white my-2.5 tracking-tight">{parseFormatting(line.replace('## ', ''))}</h2>);
      return;
    }
    if (line.startsWith('### ')) {
      elements.push(<h3 key={index} className="text-base font-bold text-blue-400 my-2">{parseFormatting(line.replace('### ', ''))}</h3>);
      return;
    }

    // Lists
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      elements.push(
        <li key={index} className="ml-5 list-disc text-zinc-300 my-1">
          {parseFormatting(line.trim().substring(2))}
        </li>
      );
      return;
    }

    if (/^\d+\.\s/.test(line.trim())) {
      const content = line.trim().replace(/^\d+\.\s/, '');
      elements.push(
        <li key={index} className="ml-5 list-decimal text-zinc-300 my-1">
          {parseFormatting(content)}
        </li>
      );
      return;
    }

    // Empty lines
    if (!line.trim()) {
      elements.push(<div key={index} className="h-2" />);
      return;
    }

    // Normal paragraph
    elements.push(
      <p key={index} className="text-zinc-300 leading-relaxed my-1">
        {parseFormatting(line)}
      </p>
    );
  });

  // Flush remaining table if exists
  if (inTable && tableRows.length > 0) {
    elements.push(
      <div key="table-flush" className="my-3 overflow-x-auto border border-[#2F2F37] rounded-xl">
        <table className="w-full text-xs text-left text-zinc-300">
          <thead className="bg-[#272732] text-white font-bold border-b border-[#2F2F37]">
            <tr>
              {tableRows[0].map((headerCell, hIdx) => (
                <th key={hIdx} className="px-3 py-2 font-bold">{headerCell}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#2F2F37] bg-[#1F1F24]">
            {tableRows.slice(1).map((row, rIdx) => (
              <tr key={rIdx} className="hover:bg-[#272732]/50">
                {row.map((cell, cIdx) => (
                  <td key={cIdx} className="px-3 py-2 font-mono text-zinc-300">{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return <div className="space-y-1 leading-relaxed text-xs">{elements}</div>;
};

// Helper function to parse Bold, Italic, Images, and Links inline
function parseFormatting(text: string): React.ReactNode {
  // Check image syntax ![alt](url)
  const imageMatch = text.match(/!\[(.*?)\]\((.*?)\)/);
  if (imageMatch) {
    const alt = imageMatch[1] || 'Image';
    const url = imageMatch[2];
    const parts = text.split(imageMatch[0]);
    return (
      <>
        {parts[0]}
        <img src={url} alt={alt} className="my-3 rounded-xl border border-[#2F2F37] max-h-64 object-cover shadow-lg" />
        {parts[1]}
      </>
    );
  }

  // Check link syntax [title](url)
  const linkMatch = text.match(/\[(.*?)\]\((.*?)\)/);
  if (linkMatch) {
    const title = linkMatch[1];
    const url = linkMatch[2];
    const parts = text.split(linkMatch[0]);
    return (
      <>
        {parts[0]}
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline font-semibold transition-colors">
          {title}
        </a>
        {parts[1]}
      </>
    );
  }

  // Simple bold **text** or italic *text* parsing
  let parts: (string | React.ReactNode)[] = [text];

  // Bold
  if (text.includes('**')) {
    const boldSplit = text.split('**');
    parts = boldSplit.map((part, idx) =>
      idx % 2 === 1 ? <strong key={idx} className="font-extrabold text-white">{part}</strong> : part
    );
  }

  return <>{parts}</>;
}
