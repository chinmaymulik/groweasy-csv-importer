'use client';

import React, { useState, useCallback, useRef } from 'react';
import Papa from 'papaparse';
import { useVirtualizer } from '@tanstack/react-virtual';
import { UploadCloud, CheckCircle2, AlertCircle, Loader2, ArrowRight, FileSpreadsheet, Moon, Sun } from 'lucide-react';

const BATCH_SIZE = 10;
const MAX_RETRIES = 3;

export default function CSVImporter() {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [previewHeaders, setPreviewHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<any[]>([]);
  const [step, setStep] = useState(1);
  
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any[]>([]);
  const [stats, setStats] = useState({ imported: 0, skipped: 0 });

  const theme = {
    bg: isDarkMode ? 'bg-gray-900' : 'bg-gray-50',
    card: isDarkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200',
    text: isDarkMode ? 'text-gray-100' : 'text-gray-900',
    textMuted: isDarkMode ? 'text-gray-400' : 'text-gray-500',
    border: isDarkMode ? 'border-gray-700' : 'border-gray-200',
    hover: isDarkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50',
    tableHeader: isDarkMode ? 'bg-gray-900 text-gray-300' : 'bg-gray-50 text-gray-500',
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) processFileLocally(droppedFile);
  }, []);

  const processFileLocally = (selectedFile: File) => {
    setError(null);
    if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
      setError('Please upload a valid CSV file.');
      return;
    }

    setFile(selectedFile);
    
    Papa.parse(selectedFile, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        if (result.data && result.data.length > 0) {
          setRawRows(result.data);
          setPreviewHeaders(Object.keys(result.data[0] as object));
          setPreviewData(result.data.slice(0, 5));
          setStep(2);
        } else {
          setError('The CSV file appears to be empty.');
        }
      },
      error: (err: any) => {
        setError(`Failed to read file: ${err.message}`);
      }
    });
  };

  const processBatchWithRetry = async (batch: any[], attempt = 1): Promise<any[]> => {
    try {
      // ✅ CONNECTED TO LIVE RENDER BACKEND
      const res = await fetch('https://groweasy-csv-importer-ouvq.onrender.com/api/process-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch })
      });
      if (!res.ok) throw new Error('API Error');
      const data = await res.json();
      return data.data;
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); 
        return processBatchWithRetry(batch, attempt + 1);
      }
      throw new Error(`Batch failed after ${MAX_RETRIES} attempts`);
    }
  };

  const handleConfirmImport = async () => {
    setIsProcessing(true);
    setError(null);
    setProgress(0);
    
    let allProcessedData: any[] = [];
    let processedCount = 0;

    const chunks = [];
    for (let i = 0; i < rawRows.length; i += BATCH_SIZE) {
      chunks.push(rawRows.slice(i, i + BATCH_SIZE));
    }

    try {
      for (let i = 0; i < chunks.length; i++) {
        const batchResults = await processBatchWithRetry(chunks[i]);
        allProcessedData = [...allProcessedData, ...batchResults];
        
        processedCount += chunks[i].length;
        setProgress(Math.round((processedCount / rawRows.length) * 100));
      }

      setResults(allProcessedData);
      setStats({
        imported: allProcessedData.length,
        skipped: rawRows.length - allProcessedData.length
      });
      setStep(3);
    } catch (err) {
      setError('A fatal error occurred during batch processing. Check if backend is active.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetImporter = () => {
    setFile(null);
    setPreviewData([]);
    setRawRows([]);
    setResults([]);
    setStep(1);
    setProgress(0);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'GOOD_LEAD_FOLLOW_UP':
        return <span className="px-3 py-1 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-200 rounded-full text-xs font-semibold">GOOD LEAD</span>;
      case 'SALE_DONE':
        return <span className="px-3 py-1 bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-200 rounded-full text-xs font-semibold">SALE DONE</span>;
      case 'DID_NOT_CONNECT':
        return <span className="px-3 py-1 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full text-xs font-semibold">NO CONNECT</span>;
      case 'BAD_LEAD':
        return <span className="px-3 py-1 bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-200 rounded-full text-xs font-semibold">BAD LEAD</span>;
      default:
        return <span className="px-3 py-1 bg-gray-50 text-gray-500 dark:bg-gray-800 dark:text-gray-400 rounded-full text-xs font-semibold">{status || 'UNKNOWN'}</span>;
    }
  };

  const parentRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: results.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64, 
    overscan: 5,
  });

  return (
    <div className={`min-h-screen p-8 transition-colors font-sans ${theme.bg} ${theme.text}`}>
      <div className="max-w-6xl mx-auto space-y-8">
        
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">GrowEasy AI CSV Importer</h1>
            <p className={`${theme.textMuted} mt-2`}>Intelligently map and extract CRM leads from messy data.</p>
          </div>
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)}
            className={`p-2 rounded-full transition-colors ${isDarkMode ? 'bg-gray-800 text-yellow-400 hover:bg-gray-700' : 'bg-white shadow-sm border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md flex items-start gap-3">
            <AlertCircle className="text-red-500 w-5 h-5 mt-0.5" />
            <p className="text-red-700 text-sm font-medium">{error}</p>
          </div>
        )}

        {step === 1 && (
          <div className={`rounded-xl shadow-sm border p-10 transition-colors ${theme.card}`}>
            <div 
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-all ${
                isDragging 
                  ? 'border-[#FF8A65] bg-[#FF8A65]/10' 
                  : `${isDarkMode ? 'border-gray-600 hover:bg-gray-700/50' : 'border-gray-300 hover:bg-gray-50'}`
              }`}
            >
              <UploadCloud className={`mx-auto h-12 w-12 mb-4 ${isDragging ? 'text-[#FF8A65]' : theme.textMuted}`} />
              <h3 className="text-lg font-semibold">Drop your CSV file here</h3>
              <p className={`text-sm mt-1 mb-6 ${theme.textMuted}`}>or click to browse files (max 5MB)</p>
              
              <label className="cursor-pointer bg-[#FF8A65] hover:bg-[#FF7043] text-white px-6 py-3 rounded-lg font-medium transition-colors">
                Upload File
                <input 
                  type="file" 
                  accept=".csv" 
                  className="hidden" 
                  onChange={(e) => processFileLocally(e.target.files![0])}
                />
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className={`rounded-xl shadow-sm border overflow-hidden animate-in fade-in slide-in-from-bottom-4 ${theme.card}`}>
            <div className={`p-6 border-b flex flex-col md:flex-row justify-between md:items-center gap-4 ${theme.border} ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50/50'}`}>
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileSpreadsheet className={`w-5 h-5 ${theme.textMuted}`} />
                  Step 2: Preview Raw Data
                </h3>
                <p className={`text-sm mt-1 ${theme.textMuted}`}>
                  Showing first {previewData.length} rows of <strong>{file?.name}</strong> ({rawRows.length} total rows)
                </p>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={resetImporter}
                  disabled={isProcessing}
                  className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors disabled:opacity-50 ${isDarkMode ? 'text-gray-300 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-100'}`}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleConfirmImport}
                  disabled={isProcessing}
                  className="px-5 py-2 text-sm font-medium bg-[#FF8A65] hover:bg-[#FF7043] text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-80"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-4 h-4 animate-spin" /> Processing AI...</>
                  ) : (
                    <>Confirm & Process <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            </div>

            {isProcessing && (
              <div className="px-6 py-4 bg-orange-50 dark:bg-orange-900/20 border-b border-orange-100 dark:border-orange-900/30">
                <div className="flex justify-between text-sm mb-2 font-medium text-orange-800 dark:text-orange-300">
                  <span>Extracting CRM fields with AI (Streaming batches)...</span>
                  <span>{progress}%</span>
                </div>
                <div className="w-full bg-orange-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#FF8A65] h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-sm text-left whitespace-nowrap">
                <thead className={`text-xs uppercase sticky top-0 shadow-sm z-10 ${theme.tableHeader}`}>
                  <tr>
                    {previewHeaders.map((header, i) => (
                      <th key={i} className="px-6 py-3 font-semibold">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className={`divide-y ${isDarkMode ? 'divide-gray-700' : 'divide-gray-100'}`}>
                  {previewData.map((row, i) => (
                    <tr key={i} className={`${theme.hover} ${isProcessing ? 'opacity-50' : ''}`}>
                      {previewHeaders.map((header, j) => (
                        <td key={j} className="px-6 py-4">{row[header] || '-'}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className={`rounded-xl shadow-sm border overflow-hidden animate-in fade-in zoom-in-95 ${theme.card}`}>
            <div className={`p-6 border-b flex justify-between items-center ${theme.border} ${isDarkMode ? 'bg-gray-800' : 'bg-gray-50/50'}`}>
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  Step 3: AI Parsed Results
                </h3>
                <div className="flex gap-4">
                  <div className={`px-4 py-3 rounded-lg border flex items-center gap-3 w-48 ${isDarkMode ? 'bg-green-900/20 border-green-900/50 text-green-400' : 'bg-green-50 border-green-100 text-green-700'}`}>
                    <span className="text-2xl font-bold">{stats.imported}</span>
                    <span className="text-sm font-medium leading-tight">Total<br/>Imported</span>
                  </div>
                  <div className={`px-4 py-3 rounded-lg border flex items-center gap-3 w-48 ${isDarkMode ? 'bg-red-900/20 border-red-900/50 text-red-400' : 'bg-red-50 border-red-100 text-red-700'}`}>
                    <span className="text-2xl font-bold">{stats.skipped}</span>
                    <span className="text-sm font-medium leading-tight">Total<br/>Skipped</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={resetImporter}
                className={`px-4 py-2 text-sm font-medium border rounded-lg transition-colors ${isDarkMode ? 'border-gray-600 hover:bg-gray-700 text-gray-300' : 'border-gray-200 hover:bg-gray-50 text-gray-600'}`}
              >
                Import Another File
              </button>
            </div>

            <div className="flex flex-col w-full">
              <div className={`flex w-full px-6 py-3 text-xs uppercase font-semibold border-b ${theme.tableHeader} ${theme.border}`}>
                <div className="w-1/4">Name</div>
                <div className="w-1/4">Email</div>
                <div className="w-1/4">Contact</div>
                <div className="w-1/4">Status</div>
              </div>
              
              <div 
                ref={parentRef} 
                className={`h-[500px] overflow-auto ${isDarkMode ? 'bg-gray-900' : 'bg-white'}`}
              >
                <div style={{ height: `${rowVirtualizer.getTotalSize()}px`, width: '100%', position: 'relative' }}>
                  {rowVirtualizer.getVirtualItems().map((virtualRow) => {
                    const row = results[virtualRow.index];
                    return (
                      <div
                        key={virtualRow.index}
                        className={`absolute top-0 left-0 w-full flex items-center px-6 text-sm border-b transition-colors ${theme.border} ${theme.hover}`}
                        style={{ 
                          height: `${virtualRow.size}px`, 
                          transform: `translateY(${virtualRow.start}px)` 
                        }}
                      >
                        <div className="w-1/4 font-medium truncate pr-4">{row.name || '-'}</div>
                        <div className="w-1/4 truncate pr-4">{row.email || '-'}</div>
                        <div className="w-1/4 truncate pr-4">{row.mobile_without_country_code || '-'}</div>
                        <div className="w-1/4 truncate">
                          {getStatusBadge(row.crm_status)}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {results.length === 0 && (
                  <div className={`p-12 text-center ${theme.textMuted}`}>
                    No valid leads were found by the AI.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}