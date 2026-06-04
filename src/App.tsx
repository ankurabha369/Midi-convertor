import React, { useState, useRef, useMemo } from 'react';
import { Midi } from '@tonejs/midi';
import { FileUp, FileAudio, Download, AlertCircle, Music } from 'lucide-react';

type MidiNoteData = {
  track: number;
  eventType: string;
  midiNote: number;
  noteName: string;
  velocity: number;
  duration: number;
  time: number;
};

type TabType = 'table' | 'csv' | 'markdown' | 'json';

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedData, setParsedData] = useState<MidiNoteData[] | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('table');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processMidi = async (selectedFile: File) => {
    setIsProcessing(true);
    setError(null);
    setParsedData(null);
    setFile(selectedFile);

    try {
      const buffer = await selectedFile.arrayBuffer();
      const midi = new Midi(buffer);
      
      const notes: MidiNoteData[] = [];

      midi.tracks.forEach((track, trackIndex) => {
        track.notes.forEach(note => {
          notes.push({
            track: trackIndex,
            eventType: 'note_on',
            midiNote: note.midi,
            noteName: note.name,
            velocity: note.velocity,
            duration: note.duration,
            time: note.time
          });
        });
      });

      if (notes.length === 0) {
        throw new Error("No notes found in the MIDI file.");
      }

      setParsedData(notes);
    } catch (err: any) {
      setError(err.message || "Failed to process MIDI file. Please ensure it is a valid .mid file.");
      setFile(null);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.name.toLowerCase().endsWith('.mid') || droppedFile.name.toLowerCase().endsWith('.midi') || droppedFile.type === 'audio/midi')) {
      await processMidi(droppedFile);
    } else {
      setError("Please upload a valid .mid or .midi file.");
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      await processMidi(selectedFile);
    }
    // reset input valuation so same file can be selected again
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const formattedContent = useMemo(() => {
    if (!parsedData) return "";

    switch (activeTab) {
      case 'csv': {
        let csv = "Track,Event Type,Midi Note,Note Name,Velocity,Duration (seconds),Time (seconds)\n";
        parsedData.forEach(note => {
          csv += `${note.track},${note.eventType},${note.midiNote},${note.noteName},${note.velocity},${note.duration},${note.time}\n`;
        });
        return csv;
      }
      case 'markdown': {
        let md = "| Track | Event Type | Midi Note | Note Name | Velocity | Duration (seconds) | Time (seconds) |\n";
        md += "|---|---|---|---|---|---|---|\n";
        parsedData.forEach(note => {
          md += `| ${note.track} | ${note.eventType} | ${note.midiNote} | ${note.noteName} | ${note.velocity} | ${note.duration} | ${note.time} |\n`;
        });
        return md;
      }
      case 'json': {
        return JSON.stringify(parsedData, null, 2);
      }
      default:
        return "";
    }
  }, [parsedData, activeTab]);

  const handleDownload = () => {
    if (!parsedData) return;

    let content = formattedContent;
    let mimeType = 'text/plain';
    let extension = '.txt';

    if (activeTab === 'csv' || activeTab === 'table') {
      // For table, download as CSV as it makes the most sense
      if (activeTab === 'table') {
        let csv = "Track,Event Type,Midi Note,Note Name,Velocity,Duration (seconds),Time (seconds)\n";
        parsedData.forEach(note => {
          csv += `${note.track},${note.eventType},${note.midiNote},${note.noteName},${note.velocity},${note.duration},${note.time}\n`;
        });
        content = csv;
      }
      mimeType = 'text/csv;charset=utf-8;';
      extension = '.csv';
    } else if (activeTab === 'markdown') {
      mimeType = 'text/markdown;charset=utf-8;';
      extension = '.md';
    } else if (activeTab === 'json') {
      mimeType = 'application/json;charset=utf-8;';
      extension = '.json';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    
    // Create base filename
    const baseName = file?.name ? file.name.replace(/\.midi?$/i, '') : 'converted';
    link.download = `${baseName}${extension}`;
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const appleSystemUIStyles = "antialiased selection:bg-blue-200 selection:text-blue-900";

  return (
    <div className={`min-h-screen bg-[#F5F5F7] text-[#1D1D1F] font-sans p-6 md:p-12 flex flex-col items-center ${appleSystemUIStyles}`}>
      
      {/* Header */}
      <div className="text-center mb-10">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-white shadow-sm border border-black/5 text-[#0071e3] mb-5">
          <Music size={28} strokeWidth={2} />
        </div>
        <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-[#1D1D1F] mb-3">
          MIDI Converter
        </h1>
        <p className="text-lg text-[#86868B] max-w-lg mx-auto">
          Extract structural data from MIDI tracks into Table, CSV, Markdown, or JSON.
        </p>
      </div>

      {/* Main Workspace Frame */}
      <div className="max-w-5xl w-full flex flex-col gap-6">
        
        {/* Toolbar */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-4 shadow-[0_4px_24px_rgba(0,0,0,0.04)] border border-black/5 flex flex-wrap items-center justify-between gap-4 sticky top-6 z-10">
          <div className="flex gap-3 items-center">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg text-white bg-[#0071e3] hover:bg-[#0077ED] transition-colors focus:ring-4 focus:ring-[#0071e3]/20"
            >
              Upload MIDI File
            </button>
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept=".mid,.midi,audio/midi"
              className="hidden"
            />
            {file && (
              <span className="text-sm text-[#1D1D1F] font-medium ml-2 truncate max-w-[200px]" title={file.name}>
                {file.name}
              </span>
            )}
          </div>

          <div className="flex bg-[#EFEFF0] p-1 rounded-xl items-center text-sm font-medium">
            {(['table', 'csv', 'markdown', 'json'] as TabType[]).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                disabled={!parsedData}
                className={`px-4 py-1.5 rounded-lg capitalize transition-all duration-200 ${
                  activeTab === tab 
                    ? 'bg-white shadow-sm text-[#1D1D1F]' 
                    : 'text-[#86868B] hover:text-[#1D1D1F] disabled:opacity-50 disabled:hover:text-[#86868B]'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div>
            <button
              onClick={handleDownload}
              disabled={!parsedData}
              className="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg border border-black/10 text-[#1D1D1F] bg-white hover:bg-gray-50 focus:ring-4 focus:ring-black/5 disabled:opacity-40 disabled:hover:bg-white transition-colors"
            >
              {activeTab === 'table' ? 'Download CSV' : 'Download'}
            </button>
          </div>
        </div>

        {/* Workspace Area */}
        <div className="bg-white rounded-3xl shadow-[0_8px_30px_rgba(0,0,0,0.04)] border border-black/5 overflow-hidden min-h-[400px] flex flex-col">
          
          {!parsedData && !isProcessing && !error && (
            <div className="flex-1 flex flex-col items-center justify-center p-12">
              <div
                className={`p-16 text-center border-2 border-dashed transition-all rounded-3xl w-full max-w-2xl ${
                  isDragging 
                    ? 'border-[#0071e3] bg-[#0071e3]/5 scale-[1.02]' 
                    : 'border-black/10 hover:border-black/20 hover:bg-[#F5F5F7]'
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
              >
                <div className="mx-auto w-16 h-16 bg-[#F5F5F7] rounded-full flex items-center justify-center mb-6">
                  <FileUp className={`h-8 w-8 ${isDragging ? 'text-[#0071e3]' : 'text-[#86868B]'}`} />
                </div>
                <h3 className="mt-2 text-xl font-medium text-[#1D1D1F]">
                  Drag and drop a MIDI file
                </h3>
                <p className="mt-3 text-sm text-[#86868B] mb-8">
                  Support for standard .mid and .midi files
                </p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-sm font-medium text-[#0071e3] hover:underline"
                >
                  Or browse your device
                </button>
              </div>
            </div>
          )}

          {isProcessing && (
            <div className="flex-1 flex flex-col items-center justify-center p-16">
              <div className="w-10 h-10 border-4 border-[#EFEFF0] border-t-[#0071e3] rounded-full animate-spin mb-6"></div>
              <h3 className="text-lg font-medium text-[#1D1D1F]">Processing MIDI File</h3>
              <p className="text-[#86868B] mt-2">Extracting tracks and note sequences...</p>
            </div>
          )}

          {error && (
            <div className="flex-1 flex flex-col items-center justify-center p-16 text-center">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-50 text-red-500 mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-medium text-[#1D1D1F] mb-3">Unable to Parse File</h3>
              <p className="text-[#86868B] max-w-md">{error}</p>
            </div>
          )}

          {parsedData && activeTab === 'table' && (
            <div className="flex-1 overflow-auto max-h-[600px] w-full">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead className="bg-[#F5F5F7] sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-6 py-3 text-xs font-semibold text-[#86868B] uppercase tracking-wider border-b border-black/5">Track</th>
                    <th className="px-6 py-3 text-xs font-semibold text-[#86868B] uppercase tracking-wider border-b border-black/5">Event Type</th>
                    <th className="px-6 py-3 text-xs font-semibold text-[#86868B] uppercase tracking-wider border-b border-black/5">Midi Note</th>
                    <th className="px-6 py-3 text-xs font-semibold text-[#86868B] uppercase tracking-wider border-b border-black/5">Note Name</th>
                    <th className="px-6 py-3 text-xs font-semibold text-[#86868B] uppercase tracking-wider border-b border-black/5">Velocity</th>
                    <th className="px-6 py-3 text-xs font-semibold text-[#86868B] uppercase tracking-wider border-b border-black/5">Duration (s)</th>
                    <th className="px-6 py-3 text-xs font-semibold text-[#86868B] uppercase tracking-wider border-b border-black/5">Time (s)</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-black/5 text-sm text-[#1D1D1F]">
                  {parsedData.map((note, i) => (
                    <tr key={i} className="hover:bg-[#F5F5F7]/50 transition-colors">
                      <td className="px-6 py-3">{note.track}</td>
                      <td className="px-6 py-3 font-mono text-xs">{note.eventType}</td>
                      <td className="px-6 py-3 font-mono text-xs text-[#0071e3]">{note.midiNote}</td>
                      <td className="px-6 py-3 font-medium">{note.noteName}</td>
                      <td className="px-6 py-3 font-mono text-xs">{note.velocity.toFixed(3)}</td>
                      <td className="px-6 py-3 font-mono text-xs">{note.duration.toFixed(3)}</td>
                      <td className="px-6 py-3 font-mono text-xs">{note.time.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {parsedData && activeTab !== 'table' && (
            <div className="flex-1 bg-white flex flex-col">
              <div className="px-6 py-3 bg-[#F5F5F7] border-b border-black/5 text-xs font-semibold text-[#86868B] uppercase tracking-wider flex justify-between">
                <span>{activeTab.toUpperCase()} Output</span>
                <span>{parsedData.length} records</span>
              </div>
              <div className="p-6 overflow-auto max-h-[550px] font-mono text-[13px] text-[#1D1D1F] whitespace-pre bg-[#FAFAFA] m-4 rounded-xl border border-black/5 shadow-inner">
                {formattedContent}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

