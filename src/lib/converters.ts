import * as pdfjsLib from 'pdfjs-dist';
// @ts-ignore
import pdfWorkerSrc from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import heic2any from 'heic2any';
import mammoth from 'mammoth';
import * as xlsx from 'xlsx';
import html2pdf from 'html2pdf.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerSrc;

import { jsPDF } from 'jspdf';

export type FileType = 'image/png' | 'image/jpeg' | 'image/webp' | 'application/pdf' | 'text/csv' | 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

export interface ConvertOptions {
  file: File;
  toType: FileType | string;
  onProgress?: (progress: number) => void;
}

export async function convertDocxToPdf(options: ConvertOptions): Promise<Blob> {
  const arrayBuffer = await options.file.arrayBuffer();
  if (options.onProgress) options.onProgress(30);
  const result = await mammoth.convertToHtml({ arrayBuffer });
  const html = result.value;
  if (options.onProgress) options.onProgress(60);

  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.padding = '40px';
  container.style.fontFamily = 'Arial, sans-serif';
  container.style.lineHeight = '1.6';

  const worker = html2pdf().set({
    margin: 1,
    filename: 'document.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
  }).from(container);

  const pdfArrayBuffer = await worker.output('arraybuffer');
  if (options.onProgress) options.onProgress(100);

  return new Blob([pdfArrayBuffer], { type: 'application/pdf' });
}

export async function convertXlsxToCsv(options: ConvertOptions): Promise<Blob> {
  const arrayBuffer = await options.file.arrayBuffer();
  if (options.onProgress) options.onProgress(50);
  const workbook = xlsx.read(arrayBuffer, { type: 'array' });
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  const csvStr = xlsx.utils.sheet_to_csv(worksheet);
  if (options.onProgress) options.onProgress(100);
  return new Blob([csvStr], { type: 'text/csv' });
}

export async function convertPptxToPdfMock(options: ConvertOptions): Promise<Blob> {
  return new Promise((resolve) => {
    if (options.onProgress) options.onProgress(50);
    const pdf = new jsPDF();
    pdf.setFontSize(22);
    pdf.text(options.file.name, 20, 30);
    pdf.setFontSize(14);
    pdf.text("Client-side PPTX conversion requires a backend service.", 20, 50);
    const blob = pdf.output('blob');
    if (options.onProgress) options.onProgress(100);
    resolve(blob);
  });
}

export async function convertImageToPdf(options: ConvertOptions): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      let fileToConvert = options.file;
      
      // Handle HEIC/HEIF files first
      if (fileToConvert.type === 'image/heic' || fileToConvert.type === 'image/heif' || fileToConvert.name.toLowerCase().endsWith('.heic')) {
        if (options.onProgress) options.onProgress(20);
        const convertedBlob = await heic2any({
          blob: fileToConvert,
          toType: "image/jpeg",
          quality: 0.9
        });
        const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        fileToConvert = new File([finalBlob], fileToConvert.name + '.jpg', { type: 'image/jpeg' });
        if (options.onProgress) options.onProgress(50);
      }

      const img = new Image();
      const url = URL.createObjectURL(fileToConvert);
      img.onload = () => {
        try {
          const pdf = new jsPDF({
            orientation: img.width > img.height ? 'landscape' : 'portrait',
            unit: 'px',
            format: [img.width, img.height]
          });
          pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
          const blob = pdf.output('blob');
          URL.revokeObjectURL(url);
          if (options.onProgress) options.onProgress(100);
          resolve(blob);
        } catch (err) {
          URL.revokeObjectURL(url);
          reject(err);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image for PDF conversion"));
      };
      img.src = url;
    } catch (err) {
      reject(err);
    }
  });
}

export async function convertImage(options: ConvertOptions): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      let fileToConvert = options.file;
      
      // Handle HEIC/HEIF files first
      if (fileToConvert.type === 'image/heic' || fileToConvert.type === 'image/heif' || fileToConvert.name.toLowerCase().endsWith('.heic')) {
        if (options.onProgress) options.onProgress(30);
        const convertedBlob = await heic2any({
          blob: fileToConvert,
          toType: options.toType,
          quality: 0.9
        });
        const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
        if (options.onProgress) options.onProgress(100);
        return resolve(finalBlob);
      }

      const img = new Image();
      const url = URL.createObjectURL(fileToConvert);
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
           URL.revokeObjectURL(url);
           return reject(new Error("Could not get canvas context"));
        }
        
        // Handle transparency for JPEG targets
        if (options.toType === 'image/jpeg') {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
        
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Conversion failed"));
          }
        }, options.toType, 0.9);
        if (options.onProgress) options.onProgress(100);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load image for conversion"));
      };
      img.src = url;
    } catch(err) {
      reject(err);
    }
  });
}

export async function convertPdfToImages(options: ConvertOptions): Promise<Blob> {
  const arrayBuffer = await options.file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  const blobs: Blob[] = [];

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const viewport = page.getViewport({ scale: 2.0 }); // High resolution
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) continue;
    
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    
    // Fill white background for transparent PDFs
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    await page.render({ canvasContext: ctx, viewport } as any).promise;
    
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, options.toType, 0.9));
    if (blob) blobs.push(blob);
    
    if (options.onProgress) {
      options.onProgress(Math.round((i / numPages) * 100));
    }
  }

  if (blobs.length === 1) {
    return blobs[0];
  } else {
    // If multiple pages, zip them
    const zip = new JSZip();
    blobs.forEach((blob, index) => {
      const ext = options.toType === 'image/png' ? 'png' : options.toType === 'image/webp' ? 'webp' : 'jpg';
      zip.file(`page_${index + 1}.${ext}`, blob);
    });
    return zip.generateAsync({ type: 'blob' }, (metadata) => {
        if (options.onProgress) {
            // we already did 100% of pdf conversion, but let's keep it maxed out
            options.onProgress(100);
        }
    });
  }
}

export async function mergeImagesToPdf(files: File[], onProgress?: (progress: number) => void): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      if (files.length === 0) return reject(new Error("No files provided"));
      
      const pdf = new jsPDF({ unit: 'px', format: 'a4' });
      pdf.deletePage(1);

      let processed = 0;
      for (let i = 0; i < files.length; i++) {
        let file = files[i];
        
        // Handle HEIC
        if (file.type === 'image/heic' || file.type === 'image/heif' || file.name.toLowerCase().endsWith('.heic')) {
          const convertedBlob = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.9 });
          const finalBlob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob;
          file = new File([finalBlob], file.name + '.jpg', { type: 'image/jpeg' });
        }

        const img = new Image();
        const url = URL.createObjectURL(file);
        await new Promise<void>((imgResolve, imgReject) => {
          img.onload = () => {
             pdf.addPage([img.width, img.height], img.width > img.height ? 'landscape' : 'portrait');
             pdf.setPage(i + 1);
             pdf.addImage(img, 'JPEG', 0, 0, img.width, img.height);
             URL.revokeObjectURL(url);
             imgResolve();
          };
          img.onerror = () => {
             URL.revokeObjectURL(url);
             imgReject(new Error(`Failed to load image ${file.name}`));
          };
          img.src = url;
        });
        
        processed++;
        if (onProgress) onProgress(Math.round((processed / files.length) * 100));
      }
      
      resolve(pdf.output('blob'));
    } catch (err) {
      reject(err);
    }
  });
}

export async function convertGenericMock(options: ConvertOptions, ext: string): Promise<Blob> {
  return new Promise((resolve) => {
    let progress = 10;
    if (options.onProgress) options.onProgress(progress);
    
    const interval = setInterval(() => {
      progress += 20;
      if (options.onProgress) options.onProgress(progress);
      if (progress >= 100) {
        clearInterval(interval);
        
        // Return a simple text file or simple dummy file
        const blob = new Blob(["This is a simulated conversion result for preview purposes.\nReal processing requires a backend."], { type: options.toType });
        resolve(blob);
      }
    }, 300);
  });
}

export async function convertFile(options: ConvertOptions): Promise<{ blob: Blob, name: string }> {
  try {
    const { file, toType } = options;
    const lowerName = file.name.toLowerCase();
    const isSourceImage = file.type.startsWith('image/') || lowerName.endsWith('.heic') || lowerName.endsWith('.heif') || lowerName.endsWith('.raw');
    const isTargetImage = toType.startsWith('image/');
    const isSourcePdf = file.type === 'application/pdf';
    
    // Auto-detect doc types by extension
    const isDocx = lowerName.endsWith('.docx');
    const isXlsx = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');
    const isPptx = lowerName.endsWith('.pptx') || lowerName.endsWith('.ppt');

    const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
    const ext = toType === 'image/png' ? 'png' : 
                toType === 'image/webp' ? 'webp' : 
                toType === 'application/pdf' ? 'pdf' : 
                toType === 'text/csv' ? 'csv' : 
                toType === 'image/jpeg' ? 'jpg' :
                toType === 'image/gif' ? 'gif' :
                toType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'docx' :
                toType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ? 'xlsx' :
                toType === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ? 'pptx' :
                toType === 'text/plain' ? 'txt' :
                toType === 'video/mp4' ? 'mp4' :
                toType === 'video/webm' ? 'webm' : 
                toType === 'video/avi' ? 'avi' : 'bin';

    if (options.onProgress) options.onProgress(5); // Start indicator

    let resultBlob: Blob;

    if (isSourceImage && isTargetImage) {
      resultBlob = await convertImage(options);
      return { blob: resultBlob, name: `${originalNameWithoutExt}.${ext}` };
    } else if (isSourceImage && toType === 'application/pdf') {
      resultBlob = await convertImageToPdf(options);
      return { blob: resultBlob, name: `${originalNameWithoutExt}.pdf` };
    } else if (isSourcePdf && isTargetImage) {
      resultBlob = await convertPdfToImages(options);
      if (resultBlob.type === 'application/zip') {
        return { blob: resultBlob, name: `${originalNameWithoutExt}_images.zip` };
      } else {
        return { blob: resultBlob, name: `${originalNameWithoutExt}.${ext}` };
      }
    } else if (isDocx && toType === 'application/pdf') {
      resultBlob = await convertDocxToPdf(options);
      return { blob: resultBlob, name: `${originalNameWithoutExt}.pdf` };
    } else if (isXlsx && toType === 'text/csv') {
      resultBlob = await convertXlsxToCsv(options);
      return { blob: resultBlob, name: `${originalNameWithoutExt}.csv` };
    } else if (isPptx && toType === 'application/pdf') {
      resultBlob = await convertPptxToPdfMock(options);
      return { blob: resultBlob, name: `${originalNameWithoutExt}.pdf` };
    }

    // Fallback Mock for formatting extensions requested by user (Video, other docs)
    resultBlob = await convertGenericMock(options, ext);
    return { blob: resultBlob, name: `${originalNameWithoutExt}.${ext}` };
  } catch (error) {
    console.error("Conversion error:", error);
    throw error;
  }
}

