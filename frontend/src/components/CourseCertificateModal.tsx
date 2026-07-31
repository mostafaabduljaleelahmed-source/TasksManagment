import { X, Award, Printer } from 'lucide-react';

interface CourseCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  studentName: string;
  courseName: string;
  instructorName?: string;
  completionDate?: string;
  verificationCode?: string;
}

export const CourseCertificateModal: React.FC<CourseCertificateModalProps> = ({
  isOpen,
  onClose,
  studentName,
  courseName,
  instructorName = 'Academy Director',
  completionDate = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
  verificationCode = `CERT-${Math.random().toString(36).substring(2, 8).toUpperCase()}-${Date.now().toString().slice(-4)}`
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#0D0D12] border border-[#2B2B36] rounded-3xl max-w-3xl w-full p-6 space-y-6 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header Action Bar */}
        <div className="flex items-center justify-between border-b border-[#1F1F26] pb-4">
          <div className="flex items-center gap-2 text-violet-400 font-bold text-xs">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Verified Official Certificate</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-extrabold rounded-xl text-xs flex items-center gap-2 transition-all shadow-lg shadow-amber-950/40"
            >
              <Printer className="w-4 h-4" />
              Print / Save PDF
            </button>
            <button onClick={onClose} className="text-zinc-500 hover:text-white p-1">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Certificate Template */}
        <div
          id="printable-certificate"
          className="bg-gradient-to-br from-[#13131A] via-[#1A1A24] to-[#0F0F16] border-4 border-amber-500/40 rounded-2xl p-10 text-center space-y-6 relative overflow-hidden shadow-2xl"
        >
          {/* Decorative Corner Accents */}
          <div className="absolute top-0 left-0 w-24 h-24 border-t-4 border-l-4 border-amber-400/60 rounded-tl-2xl pointer-events-none" />
          <div className="absolute top-0 right-0 w-24 h-24 border-t-4 border-r-4 border-amber-400/60 rounded-tr-2xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-24 h-24 border-b-4 border-l-4 border-amber-400/60 rounded-bl-2xl pointer-events-none" />
          <div className="absolute bottom-0 right-0 w-24 h-24 border-b-4 border-r-4 border-amber-400/60 rounded-br-2xl pointer-events-none" />

          {/* Academy Badge */}
          <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-amber-500 to-yellow-400 mx-auto flex items-center justify-center text-black shadow-xl shadow-amber-500/30">
            <Award className="w-9 h-9" />
          </div>

          <div className="space-y-1">
            <h2 className="text-xs uppercase font-extrabold tracking-widest text-amber-400">Private Programming Academy</h2>
            <h1 className="text-3xl font-serif font-black text-white tracking-wide">CERTIFICATE OF COMPLETION</h1>
            <p className="text-xs text-zinc-400 uppercase tracking-wider">This is to certify that</p>
          </div>

          {/* Student Name */}
          <div className="py-2">
            <h2 className="text-2xl font-black text-amber-300 font-serif border-b-2 border-amber-500/30 pb-2 inline-block px-8">
              {studentName}
            </h2>
          </div>

          <p className="text-xs text-zinc-300 max-w-lg mx-auto leading-relaxed">
            has successfully fulfilled all curriculum requirements, coding assignments, and examinations for the course:
          </p>

          {/* Course Name */}
          <div className="py-1">
            <h3 className="text-xl font-extrabold text-white tracking-tight">{courseName}</h3>
          </div>

          {/* Footer Metadata & Verification */}
          <div className="pt-6 grid grid-cols-3 items-end border-t border-[#2A2A38] text-xs text-zinc-400">
            <div className="text-left space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Issued On</span>
              <p className="font-bold text-zinc-200">{completionDate}</p>
            </div>

            <div className="text-center space-y-1">
              <div className="w-20 h-20 bg-white p-1 mx-auto rounded-lg shadow-md border border-zinc-300">
                {/* QR Code Placeholder Preview */}
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://jatask.runasp.net/verify/${verificationCode}`}
                  alt="QR Verification"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-[9px] font-mono text-zinc-400 block">{verificationCode}</span>
            </div>

            <div className="text-right space-y-1">
              <span className="text-[10px] text-zinc-500 uppercase font-bold block">Authorized Instructor</span>
              <p className="font-bold text-amber-400 font-serif">{instructorName}</p>
              <div className="w-28 border-b border-amber-500/40 ml-auto pt-1" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
