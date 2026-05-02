import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileImage, 
  FileText, 
  UploadCloud, 
  Download, 
  CheckCircle2, 
  X, 
  Loader2,
  Image as ImageIcon,
  FileArchive,
  RefreshCw,
  AlertCircle,
  Wand2,
  Globe
} from 'lucide-react';
import { cn } from './lib/utils';
import { convertFile, mergeImagesToPdf, FileType } from './lib/converters';

type FileStatus = 'idle' | 'converting' | 'done' | 'error';
type AppMode = 'convert' | 'merge';
type Language = 'id' | 'en';

interface FileConversionTask {
  id: string;
  sourceFile: File;
  targetFormat: FileType;
  status: FileStatus;
  progress: number;
  resultBlob?: Blob;
  resultName?: string;
  error?: string;
}

const translations = {
  id: {
    title: 'KAIConverter',
    subtitle: 'Konversi Aman & Sisi Klien',
    convertMode: 'Konversi File',
    mergeMode: 'Gabung ke PDF',
    heroConvert: 'Konversi apa saja.',
    heroConvertDesc: 'Deteksi format cerdas. Memproses lokal. Tarik & Lepas Dokumen, Gambar, atau Video apa saja untuk mengonversinya secara instan.',
    heroMerge: 'Gabungkan ke PDF.',
    heroMergeDesc: 'Gabungkan beberapa gambar menjadi satu dokumen PDF secara instan dan aman.',
    dropzoneTitle: 'Tarik & lepas file ke sini',
    dropzoneDesc: 'atau klik untuk memilih file dari komputer Anda (ukuran tidak terbatas)',
    processingTitle: 'Memproses File',
    processingDesc: 'File sedang dikonversi secara otomatis di browser Anda.',
    mergeTitle: 'Gambar untuk Digabungkan',
    mergeDesc: 'Gambar akan digabungkan menjadi satu dokumen PDF.',
    clearAll: 'Hapus Semua',
    downloadAll: 'Unduh Semua',
    convertAll: 'Konversi Semua',
    generatePdf: 'Buat PDF',
    generatingPdf: 'Membuat Dokumen PDF...',
    processingImages: 'Memproses {count} gambar ({progress}%)',
    pdfSuccess: 'PDF Berhasil Dibuat!',
    savePdf: 'Simpan PDF',
    readyForPdf: 'Gambar siap untuk PDF',
    error: 'Kesalahan',
    convertingTo: 'Mengonversi',
    convertedTo: 'Berhasil dikonversi ke',
    footer: 'Hak Cipta',
    allRightsReserved: 'Seluruh hak cipta dilindungi.',
    welcomeTitle: 'Selamat Datang di KAIConverter!',
    welcomeDesc1: 'Platform all-in-one Anda untuk mengonversi gambar, dokumen, dan video.',
    welcomeDesc2: 'Semuanya diproses secara lokal di browser Anda, memastikan data Anda tetap pribadi dan aman. Tidak perlu pendaftaran, ukuran file tidak dibatasi!',
    welcomeDesc3: 'Terima kasih telah menggunakan layanan kami. Selamat mencoba!',
    close: 'Tutup',
    language: 'Bahasa',
    target: 'Target:',
    uploadMore: 'Unggah File Lainnya',
  },
  en: {
    title: 'KAIConverter',
    subtitle: 'Secure & Client-Side Converting',
    convertMode: 'Convert Files',
    mergeMode: 'Merge to PDF',
    heroConvert: 'Convert anything.',
    heroConvertDesc: 'Intelligent format detection. Local processing. Drop any Document, Image, or Video to instantly convert them.',
    heroMerge: 'Merge to PDF.',
    heroMergeDesc: 'Combine multiple images into a single PDF document instantly and securely.',
    dropzoneTitle: 'Drop files here',
    dropzoneDesc: 'or click to select files from your computer (unlimited size)',
    processingTitle: 'Processing Files',
    processingDesc: 'Files are automatically being converted right in your browser.',
    mergeTitle: 'Images to Merge',
    mergeDesc: 'Images will be merged into a single PDF document.',
    clearAll: 'Clear All',
    downloadAll: 'Download All',
    convertAll: 'Convert All',
    generatePdf: 'Generate PDF',
    generatingPdf: 'Creating PDF Document...',
    processingImages: 'Processing {count} images ({progress}%)',
    pdfSuccess: 'PDF Generated Successfully!',
    savePdf: 'Save PDF',
    readyForPdf: 'Image ready for PDF',
    error: 'Error',
    convertingTo: 'Converting',
    convertedTo: 'Converted to',
    footer: 'Copyright',
    allRightsReserved: 'All rights reserved.',
    welcomeTitle: 'Welcome to KAIConverter!',
    welcomeDesc1: 'Your all-in-one platform for converting images, documents, and videos.',
    welcomeDesc2: 'Everything is processed locally in your browser, ensuring your data remains private and secure. No sign-up required, unlimited file size!',
    welcomeDesc3: 'Thank you for using our service. Enjoy!',
    close: 'Close',
    language: 'Language',
    target: 'Target:',
    uploadMore: 'Upload More Files',
  }
};

export default function App() {
  const [lang, setLang] = useState<Language>('id');
  const [showWelcome, setShowWelcome] = useState(true);
  const t = translations[lang];

  const [mode, setMode] = useState<AppMode>('convert');
  const [tasks, setTasks] = useState<FileConversionTask[]>([]);
  const [mergeProgress, setMergeProgress] = useState(-1); // -1 means inactive
  const [mergedPdfUrl, setMergedPdfUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getValidTargets = (file: File) => {
    const lowerName = file.name.toLowerCase();
    const isImage = file.type.startsWith('image/') || ['.heic', '.heif', '.raw', '.cr2', '.cr3', '.crw', '.nef', '.nrw', '.arw', '.srf', '.sr2', '.raf', '.orf', '.rw2', '.pef', '.svg', '.eps', '.ai', '.cdr', '.psd', '.psb', '.xcf', '.indd', '.clip', '.ico', '.icns', '.tga', '.targa', '.exr', '.dds', '.bmp', '.dib', '.tiff', '.tif', '.jpg', '.jpeg', '.jpe', '.png', '.gif', '.webp', '.avif', '.apng'].some(ext => lowerName.endsWith(ext));
    const isDocx = lowerName.endsWith('.docx') || lowerName.endsWith('.doc');
    const isXlsx = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv');
    const isPdf = file.type === 'application/pdf' || lowerName.endsWith('.pdf');

    const imageOpts = { group: 'Images', opts: [
      { value: 'image/jpeg', label: 'JPG' },
      { value: 'image/png', label: 'PNG' },
      { value: 'image/webp', label: 'WEBP' }
    ]};
    
    const pdfOpt = { group: 'Documents', opts: [
      { value: 'application/pdf', label: 'PDF' }
    ]};
    
    const csvOpt = { group: 'Spreadsheets', opts: [
      { value: 'text/csv', label: 'CSV' }
    ]};

    if (isImage) {
      return [imageOpts, pdfOpt];
    } else if (isPdf) {
      return [imageOpts];
    } else if (isDocx) {
      return [pdfOpt, imageOpts];
    } else if (isXlsx) {
      return [csvOpt, pdfOpt];
    }

    // Default fallback
    return [imageOpts, pdfOpt];
  };

  const getSmartTargetFormat = (file: File): FileType => {
    const validGroups = getValidTargets(file);
    // return the first format of the first group
    return validGroups[0].opts[0].value as FileType;
  };

  const getFormatLabel = (format: string) => {
    const labels: Record<string, string> = {
      'image/jpeg': 'JPG',
      'image/png': 'PNG',
      'image/webp': 'WEBP',
      'image/gif': 'GIF',
      'application/pdf': 'PDF',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
      'text/plain': 'TXT',
      'text/csv': 'CSV',
      'video/mp4': 'MP4',
      'video/webm': 'WEBM',
      'video/avi': 'AVI',
    };
    return labels[format] || format.split('/').pop()?.toUpperCase() || format;
  };

  const startConversion = async (task: FileConversionTask) => {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, status: 'converting', progress: 0 } : t)));

    const targetFormat = task.targetFormat;
    
    try {
      const result = await convertFile({
        file: task.sourceFile,
        toType: targetFormat,
        onProgress: (progress) => {
          setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, progress } : t)));
        }
      });

      setTasks((prev) => prev.map((t) => 
        t.id === task.id 
          ? { ...t, status: 'done', progress: 100, resultBlob: result.blob, resultName: result.name, targetFormat } 
          : t
      ));
    } catch (error: any) {
      setTasks((prev) => prev.map((t) => 
        t.id === task.id 
          ? { ...t, status: 'error', error: error.message || "Conversion failed", targetFormat } 
          : t
      ));
    }
  };

  const startAll = () => {
    tasks.filter(t => t.status === 'idle' || t.status === 'error').forEach(startConversion);
  };

  const handleFiles = (files: FileList | File[]) => {
    const newTasks: FileConversionTask[] = Array.from(files).map((file) => ({
      id: Math.random().toString(36).substring(7) + Date.now(),
      sourceFile: file,
      targetFormat: getSmartTargetFormat(file),
      status: 'idle',
      progress: 0,
    }));

    setTasks((prev) => [...newTasks, ...prev]);
  };

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const removeTask = (id: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== id));
  };

  const clearAll = () => {
    setTasks([]);
    setMergeProgress(-1);
    if (mergedPdfUrl) {
      URL.revokeObjectURL(mergedPdfUrl);
      setMergedPdfUrl(null);
    }
  };

  const startPdfMerge = async () => {
    try {
      setMergeProgress(0);
      const files = tasks.map(t => t.sourceFile);
      const blob = await mergeImagesToPdf(files, (progress) => {
        setMergeProgress(progress);
      });
      setMergeProgress(100);
      const url = URL.createObjectURL(blob);
      setMergedPdfUrl(url);
    } catch (e: any) {
      alert("Error merging PDF: " + e.message);
      setMergeProgress(-1);
    }
  };

  const downloadFile = (task: FileConversionTask) => {
    if (!task.resultBlob || !task.resultName) return;
    const url = URL.createObjectURL(task.resultBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = task.resultName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const downloadAll = async () => {
     const doneTasks = tasks.filter(t => t.status === 'done');
     for (const task of doneTasks) {
       downloadFile(task);
       await new Promise(resolve => setTimeout(resolve, 300));
     }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans overflow-hidden flex flex-col relative">
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none"></div>
      <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] bg-indigo-600/10 blur-[100px] rounded-full pointer-events-none"></div>

      {/* Navbar */}
      <header className="relative z-10 flex flex-col sm:flex-row items-center justify-between px-6 py-4 border-b border-white/5 bg-slate-950/20 backdrop-blur-md sticky top-0 gap-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-blue-500/20">
            <RefreshCw className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">{t.title}</h1>
        </div>
        
        <div className="flex bg-slate-900 overflow-hidden rounded-xl border border-white/5 p-1">
          <button 
            onClick={() => setMode('convert')} 
            className={cn("px-4 py-2 rounded-lg text-sm font-semibold transition-all", mode === 'convert' ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200")}
          >
            {t.convertMode}
          </button>
          <button 
            onClick={() => setMode('merge')} 
            className={cn("px-4 py-2 rounded-lg text-sm font-semibold transition-all", mode === 'merge' ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200")}
          >
            {t.mergeMode}
          </button>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-sm font-medium text-slate-400 hidden sm:block">
            {t.subtitle}
          </div>
          <div className="flex items-center gap-2 bg-slate-800/50 rounded-lg p-1">
             <button onClick={() => setLang('id')} className={cn("px-2 py-1 text-xs font-bold rounded-md transition-colors", lang === 'id' ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-200")}>ID</button>
             <button onClick={() => setLang('en')} className={cn("px-2 py-1 text-xs font-bold rounded-md transition-colors", lang === 'en' ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-200")}>EN</button>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
        
        {tasks.length === 0 ? (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-8 w-full"
          >
            {/* Header Section */}
            <div className="text-center max-w-2xl mx-auto space-y-4 pt-8">
              <h2 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white flex justify-center items-center gap-3">
                {mode === 'convert' ? (
                  <><Wand2 className="w-10 h-10 text-blue-400" /> {t.heroConvert}</>
                ) : (
                  <><FileArchive className="w-10 h-10 text-indigo-400" /> {t.heroMerge}</>
                )}
              </h2>
              <p className="text-lg text-slate-400">
                {mode === 'convert' ? t.heroConvertDesc : t.heroMergeDesc}
              </p>
            </div>

            {/* Dropzone */}
            <div className="w-full relative group cursor-pointer" onClick={() => fileInputRef.current?.click()} onDragOver={onDragOver} onDragLeave={onDragLeave} onDrop={onDrop}>
              <div className={cn("absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-[2.5rem] blur opacity-20 pointer-events-none transition-opacity", isDragging ? "opacity-40" : "group-hover:opacity-40")}></div>
              
              <div
                className={cn(
                  "relative flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-[2.5rem] transition-all duration-200 ease-in-out bg-slate-900/40 backdrop-blur-xl",
                  isDragging 
                    ? "border-blue-500 bg-blue-500/10 scale-[1.02]" 
                    : "border-slate-700 hover:border-slate-500"
                )}
              >
                <input 
                  type="file" 
                  multiple 
                  className="hidden" 
                  ref={fileInputRef}
                  onChange={(e) => {
                    if (e.target.files) handleFiles(e.target.files);
                    e.target.value = ''; // Reset
                  }}
                  accept=".doc,.docx,.docm,.dot,.dotx,.txt,.rtf,.odt,.wpd,.wps,.pages,.log,.msg,.xls,.xlsx,.xlsm,.xlsb,.xlt,.xltx,.csv,.tsv,.ods,.numbers,.ppt,.pptx,.pptm,.pot,.potx,.pps,.ppsx,.odp,.key,.pdf,.xps,.oxps,.djvu,.pub,.epub,.mobi,.azw,.azw3,.fb2,.ibooks,.md,.xml,.html,.htm,.tex,.latex,.yaml,.yml,.json,.jpg,.jpeg,.jpe,.png,.bmp,.dib,.tiff,.tif,.heic,.heif,.gif,.webp,.avif,.apng,.raw,.dng,.cr2,.cr3,.crw,.nef,.nrw,.arw,.srf,.sr2,.raf,.orf,.rw2,.pef,.svg,.eps,.ai,.cdr,.psd,.psb,.xcf,.indd,.clip,.ico,.icns,.tga,.targa,.exr,.dds,.mp4,.m4v,.mkv,.avi,.mov,.qt,.wmv,.asf,.webm,.flv,.f4v,.swf,.ogv,.ogg,.m2ts,.mts,.mxf,.ts,.braw,.r3d,.mpg,.mpeg,.mpe,.mp2,.vob,.ifo,.3gp,.3g2,.rm,.rmvb,.amv"
                />
                
                <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mb-6 shadow-inner group-hover:scale-110 transition-transform duration-300">
                  <UploadCloud className="w-10 h-10 text-blue-400" />
                </div>
                
                <h3 className="text-2xl font-semibold text-white mb-2">
                  Choose files or drag & drop here
                </h3>
                <p className="text-sm text-slate-500 max-w-sm mb-4 leading-relaxed">
                  Supports all major Document, Image, and Video formats.
                </p>
                <button className="bg-blue-600 px-8 py-3 rounded-2xl font-bold text-white shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:bg-blue-500 pointer-events-none transition-colors">Select Files</button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full space-y-6 pb-20"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                  {mode === 'convert' ? t.processingTitle : t.mergeTitle}
                  <span className="bg-blue-500/20 text-blue-400 text-sm py-1 px-3 rounded-full">{tasks.length}</span>
                </h3>
                <p className="text-sm text-slate-400 mt-1">
                  {mode === 'convert' ? t.processingDesc : t.mergeDesc}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={clearAll}
                  className="px-4 py-2 text-sm font-medium text-slate-300 bg-slate-800/50 border border-slate-700 hover:bg-slate-800 rounded-xl transition-colors"
                >
                  {t.clearAll}
                </button>
                {mode === 'convert' && tasks.some(t => t.status === 'done') && (
                  <button
                    onClick={downloadAll}
                    className="px-4 py-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)] rounded-xl transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" /> {t.downloadAll}
                  </button>
                )}
                {mode === 'convert' && tasks.some(t => t.status === 'idle' || t.status === 'error') && (
                   <button
                   onClick={startAll}
                   className="px-4 py-2 text-sm font-semibold text-slate-950 bg-white hover:bg-slate-200 rounded-xl transition-colors shadow-sm"
                 >
                   {t.convertAll}
                 </button>
                )}
                {mode === 'merge' && mergeProgress === -1 && !mergedPdfUrl && (
                  <button
                    onClick={startPdfMerge}
                    className="px-4 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-500 shadow-[0_0_20px_rgba(79,70,229,0.3)] rounded-xl transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" /> {t.generatePdf}
                  </button>
                )}
              </div>
            </div>

            {mode === 'merge' && (mergeProgress !== -1 || mergedPdfUrl) && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="bg-slate-800/50 border border-indigo-500/30 rounded-2xl p-6 text-center shadow-[0_0_30px_rgba(79,70,229,0.1)] relative overflow-hidden"
              >
                {mergeProgress !== -1 && mergeProgress < 100 && (
                   <div className="absolute left-0 bottom-0 top-0 bg-indigo-500/10 pointer-events-none transition-all duration-300 ease-out z-0 border-r border-indigo-400/50" style={{ width: `${mergeProgress}%` }} />
                )}
                <div className="relative z-10 flex flex-col items-center gap-3">
                  {mergeProgress === 100 && mergedPdfUrl ? (
                    <>
                      <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-full flex items-center justify-center mb-2 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
                        <CheckCircle2 className="w-6 h-6" />
                      </div>
                      <h4 className="text-xl font-bold text-white">{t.pdfSuccess}</h4>
                      <div className="flex gap-3 mt-2">
                        <a 
                          href={mergedPdfUrl} 
                          download="merged_images.pdf" 
                          className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-xl text-sm font-bold shadow-md transition-colors flex items-center gap-2"
                        >
                          <Download className="w-4 h-4" /> {t.savePdf}
                        </a>
                      </div>
                    </>
                  ) : (
                    <>
                       <Loader2 className="w-8 h-8 animate-spin text-indigo-400 mb-2" />
                       <h4 className="text-lg font-bold text-white">{t.generatingPdf}</h4>
                       <p className="text-slate-400 text-sm">{t.processingImages.replace('{count}', tasks.length.toString()).replace('{progress}', mergeProgress.toString())}</p>
                    </>
                  )}
                </div>
              </motion.div>
            )}

            <div className="grid gap-3">
              <AnimatePresence>
                {tasks.map((task) => {
                  const isDone = task.status === 'done';
                  const isConverting = task.status === 'converting';
                  const isError = task.status === 'error';
                  const isImage = task.sourceFile.type.startsWith('image/') || task.sourceFile.name.toLowerCase().endsWith('.heic');
                  const isPdf = task.sourceFile.type === 'application/pdf';

                  return (
                    <motion.div
                      key={task.id}
                      initial={{ opacity: 0, scale: 0.98, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      layout
                      className={cn(
                        "bg-slate-900/30 border backdrop-blur-sm rounded-2xl p-4 pr-5 shadow-sm flex items-center gap-4 relative overflow-hidden transition-colors",
                        isConverting ? "border-blue-500/50 shadow-[0_0_15px_rgba(37,99,235,0.1)]" : "border-white/5"
                      )}
                    >
                      {/* Subdued Progress Background */}
                      {isConverting && (
                         <div 
                           className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-blue-600/5 to-blue-500/20 transition-all duration-300 ease-out z-0 border-r border-blue-400/50"
                           style={{ width: `${task.progress}%` }}
                         />
                      )}

                      <div className="relative z-10 flex items-center justify-center w-12 h-12 rounded-xl bg-slate-800 border border-slate-700 flex-shrink-0 shadow-inner overflow-hidden">
                        {isConverting && (
                           <motion.div 
                             className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-400/30 to-transparent w-full h-[200%]"
                             animate={{ y: ['-100%', '100%'] }}
                             transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                           />
                        )}
                        {isImage && <FileImage className={cn("w-6 h-6", isConverting ? "text-blue-300" : "text-blue-400")} />}
                        {isPdf && <FileText className={cn("w-6 h-6", isConverting ? "text-blue-300" : "text-indigo-400")} />}
                        {!isImage && !isPdf && <FileArchive className="w-6 h-6 text-slate-400" />}
                      </div>

                      <div className="relative z-10 flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-semibold text-slate-200 truncate pr-4">
                            {task.sourceFile.name}
                          </p>
                          <span className="text-xs font-medium text-slate-500 flex-shrink-0">
                            {formatBytes(task.sourceFile.size)}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-3 text-xs">
                           {mode === 'merge' ? (
                             <span className="text-slate-400 font-medium whitespace-nowrap">{t.readyForPdf}</span>
                           ) : isError ? (
                               <span className="text-red-400 font-medium flex items-center gap-1">
                                   <AlertCircle className="w-3.5 h-3.5" />
                                   {task.error}
                               </span>
                           ) : isDone ? (
                               <span className="text-emerald-400 font-medium flex items-center gap-1">
                                   <CheckCircle2 className="w-3.5 h-3.5" />
                                   {t.convertedTo} {getFormatLabel(task.targetFormat)}
                               </span>
                           ) : isConverting ? (
                               <div className="flex items-center gap-3 flex-1">
                                  <div className="flex items-center gap-1.5 text-blue-400 font-medium">
                                    <Loader2 className="w-3 h-3 animate-spin" />
                                    {t.convertingTo}
                                  </div>
                                  <div className="h-1.5 flex-1 bg-slate-800 rounded-full overflow-hidden">
                                     <div 
                                        className="h-full bg-blue-400 shadow-[0_0_10px_rgba(96,165,250,0.8)] transition-all duration-300 ease-out" 
                                        style={{ width: `${task.progress}%` }} 
                                      />
                                  </div>
                                  <span className="text-blue-400 font-medium w-8 text-right">{task.progress}%</span>
                               </div>
                           ) : (
                               <div className="flex items-center gap-2">
                                  <span className="text-slate-400 font-medium">
                                     {t.target}
                                  </span>
                                  <select 
                                    value={task.targetFormat}
                                    onChange={(e) => {
                                      setTasks(prev => prev.map(t => t.id === task.id ? { ...t, targetFormat: e.target.value as FileType } : t));
                                    }}
                                    className="bg-slate-800 text-slate-200 text-xs font-semibold px-2 py-1 rounded-md outline-none border border-slate-700 focus:border-blue-500"
                                  >
                                    {getValidTargets(task.sourceFile).map((group: any) => (
                                      <optgroup key={group.group} label={group.group}>
                                        {group.opts.map((opt: any) => (
                                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                      </optgroup>
                                    ))}
                                  </select>
                               </div>
                           )}
                        </div>
                      </div>

                      <div className="relative z-10 flex items-center gap-2 flex-shrink-0 ml-4">
                        {mode === 'merge' ? null : isDone ? (
                          <button
                            onClick={() => downloadFile(task)}
                            className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-sm font-semibold shadow-sm transition-colors flex items-center gap-2"
                            title="Download"
                          >
                            <Download className="w-4 h-4" /> Save
                          </button>
                        ) : isConverting ? null : (
                          <button
                            onClick={() => startConversion(task)}
                            className="bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 px-4 py-2 rounded-xl text-sm font-semibold transition-colors border border-blue-500/20"
                          >
                            Convert
                          </button>
                        )}
                        
                        {(!isConverting || mode === 'merge') && (
                          <button
                            onClick={() => removeTask(task.id)}
                            className="p-2.5 text-slate-500 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-colors"
                            title="Remove"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

             <div className="flex justify-center mt-8">
               <button 
                 onClick={() => {
                   const uploader = document.createElement('input');
                   uploader.type = 'file';
                   uploader.multiple = true;
                   uploader.accept = mode === 'merge' ? "image/*,.heic,.heif,.jpg,.jpeg,.png,.webp,.bmp,.tiff" : ".doc,.docx,.docm,.dot,.dotx,.txt,.rtf,.odt,.wpd,.wps,.pages,.log,.msg,.xls,.xlsx,.xlsm,.xlsb,.xlt,.xltx,.csv,.tsv,.ods,.numbers,.ppt,.pptx,.pptm,.pot,.potx,.pps,.ppsx,.odp,.key,.pdf,.xps,.oxps,.djvu,.pub,.epub,.mobi,.azw,.azw3,.fb2,.ibooks,.md,.xml,.html,.htm,.tex,.latex,.yaml,.yml,.json,.jpg,.jpeg,.jpe,.png,.bmp,.dib,.tiff,.tif,.heic,.heif,.gif,.webp,.avif,.apng,.raw,.dng,.cr2,.cr3,.crw,.nef,.nrw,.arw,.srf,.sr2,.raf,.orf,.rw2,.pef,.svg,.eps,.ai,.cdr,.psd,.psb,.xcf,.indd,.clip,.ico,.icns,.tga,.targa,.exr,.dds,.mp4,.m4v,.mkv,.avi,.mov,.qt,.wmv,.asf,.webm,.flv,.f4v,.swf,.ogv,.ogg,.m2ts,.mts,.mxf,.ts,.braw,.r3d,.mpg,.mpeg,.mpe,.mp2,.vob,.ifo,.3gp,.3g2,.rm,.rmvb,.amv";
                   uploader.onchange = (e: any) => {
                     if (e.target.files) handleFiles(e.target.files);
                   };
                   uploader.click();
                 }}
                 className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-2xl font-semibold shadow-sm transition-colors border border-white/5"
               >
                 <UploadCloud className="w-5 h-5 text-blue-400" />
                 {t.uploadMore}
               </button>
            </div>

          </motion.div>
        )}

      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 border-t border-white/5 mt-auto bg-slate-900/20 backdrop-blur-md text-center">
        <p className="text-sm text-slate-400">
          &copy; {new Date().getFullYear()} {t.footer}{' '}
          <a
            href="https://kaidev.my.id"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 font-medium transition-colors hover:underline"
          >
            KaiDev
          </a>
          . {t.allRightsReserved}
        </p>
      </footer>

      {/* Welcome Card Modal */}
      <AnimatePresence>
        {showWelcome && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-slate-900 border border-slate-700 shadow-2xl rounded-2xl p-6 sm:p-8 max-w-lg w-full relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-blue-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/4 pointer-events-none"></div>
              
              <button 
                onClick={() => setShowWelcome(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
                aria-label="Close welcome card"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex flex-col items-center text-center space-y-4 relative z-10">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 mb-2">
                  <Wand2 className="w-8 h-8 text-white" />
                </div>
                
                <h3 className="text-2xl sm:text-3xl font-extrabold text-white">
                  {t.welcomeTitle}
                </h3>
                
                <div className="space-y-3 text-slate-300 pb-6 text-sm sm:text-base">
                  <p>{t.welcomeDesc1}</p>
                  <p>{t.welcomeDesc2}</p>
                  <p className="font-medium text-blue-400">{t.welcomeDesc3}</p>
                </div>

                <div className="flex justify-center items-center gap-3 pb-6 border-b border-slate-800 w-full mb-6">
                  <Globe className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-400 font-medium">{t.language}:</span>
                  <div className="flex items-center gap-2 bg-slate-800 rounded-lg p-1">
                    <button onClick={() => setLang('id')} className={cn("px-3 py-1 text-xs font-bold rounded-md transition-colors", lang === 'id' ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-200")}>Indonesia</button>
                    <button onClick={() => setLang('en')} className={cn("px-3 py-1 text-xs font-bold rounded-md transition-colors", lang === 'en' ? "bg-blue-500 text-white" : "text-slate-400 hover:text-slate-200")}>English</button>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowWelcome(false)}
                  className="w-full sm:w-auto px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all hover:scale-105 active:scale-95 shadow-lg shadow-blue-500/20"
                >
                  {t.close}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

