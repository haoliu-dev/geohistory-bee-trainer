import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Resolve module imports to handle both ESM and CommonJS/default export styles
const pdfjs = (pdfjsLib as any).default || pdfjsLib;
const mammothLib = (mammoth as any).default || mammoth;

// Set worker for PDF.js safely using a stable CDN (cdnjs)
// This fixes the "Failed to execute 'importScripts'" error often seen with esm.sh worker URLs
if (pdfjs.GlobalWorkerOptions) {
  pdfjs.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
}

export const readFileContent = async (file: File): Promise<string> => {
  const extension = file.name.split('.').pop()?.toLowerCase();

  try {
    switch (extension) {
      case 'txt':
      case 'md':
      case 'html':
      case 'htm':
        return await readTextFile(file);
      case 'docx':
        return await readDocxFile(file);
      case 'pdf':
        return await readPdfFile(file);
      default:
        throw new Error(`Unsupported file type: ${extension}`);
    }
  } catch (error) {
    console.error(`Error reading file ${file.name}:`, error);
    throw new Error(`Failed to parse ${file.name}`);
  }
};

const readTextFile = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve(e.target?.result as string || '');
    reader.onerror = (e) => reject(e);
    reader.readAsText(file);
  });
};

const readDocxFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        if (!arrayBuffer) {
          reject(new Error("Empty file"));
          return;
        }
        // Use resolved mammothLib
        const result = await mammothLib.extractRawText({ arrayBuffer });
        resolve(result.value);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

const readPdfFile = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const arrayBuffer = e.target?.result as ArrayBuffer;
        // Use resolved pdfjs
        // We pass the data as a typed array (Uint8Array) which PDF.js handles well
        const loadingTask = pdfjs.getDocument({ 
          data: new Uint8Array(arrayBuffer),
          useSystemFonts: true // Sometimes helps with font loading errors
        });
        
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          // Add a space between items to prevent words from sticking together
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n';
        }
        resolve(fullText);
      } catch (err) {
        console.error("PDF Parsing Error Details:", err);
        reject(err);
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsArrayBuffer(file);
  });
};

export const processUploadedFiles = async (files: File[]): Promise<string> => {
  const results = await Promise.all(files.map(readFileContent));
  return results.join('\n\n--- NEXT FILE ---\n\n');
};