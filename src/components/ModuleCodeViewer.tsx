import React, { useState } from 'react';
import JSZip from 'jszip';
import { ModuleConfig } from '../types/tempest.ts';
import {
  getMmmTempestWxJs,
  getNodeHelperJs,
  getMmmTempestWxCss,
  getPackageJson,
  getReadmeMd,
} from '../utils/moduleSourceCode.ts';

interface ModuleCodeViewerProps {
  config: ModuleConfig;
}

type FileTab = 'js' | 'helper' | 'css' | 'config' | 'package' | 'readme';

export const ModuleCodeViewer: React.FC<ModuleCodeViewerProps> = ({ config }) => {
  const [activeTab, setActiveTab] = useState<FileTab>('js');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);

  const mmmJs = getMmmTempestWxJs();
  const helperJs = getNodeHelperJs();
  const css = getMmmTempestWxCss();
  const pkg = getPackageJson();
  const readme = getReadmeMd(config);

  const configSnippet = `// Add this to your MagicMirror config/config.js inside modules: [...]
{
  module: "MMM-TempestWx",
  position: "${config.mirrorPosition}", // "top_right", "top_left", etc.
  config: {
    stationId: "${config.stationId || 'YOUR_STATION_ID'}",
    token: "${config.token || 'YOUR_TEMPEST_TOKEN'}",
    units: "${config.units}",
    pressureUnit: "${config.pressureUnit}",
    updateInterval: ${config.updateIntervalSeconds * 1000},
    showModalOnTouch: ${config.showModalOnTouch},
    autoCloseModalSeconds: ${config.autoCloseModalSeconds},
    showFeelsLike: ${config.showFeelsLike},
    showDewPoint: ${config.showDewPoint},
    showTrendArrows: ${config.showTrendArrows}
  }
},`;

  let currentCode = mmmJs;
  let currentFilename = 'MMM-TempestWx.js';

  if (activeTab === 'helper') {
    currentCode = helperJs;
    currentFilename = 'node_helper.js';
  } else if (activeTab === 'css') {
    currentCode = css;
    currentFilename = 'MMM-TempestWx.css';
  } else if (activeTab === 'config') {
    currentCode = configSnippet;
    currentFilename = 'config.js snippet';
  } else if (activeTab === 'package') {
    currentCode = pkg;
    currentFilename = 'package.json';
  } else if (activeTab === 'readme') {
    currentCode = readme;
    currentFilename = 'README.md';
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(currentCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy', err);
    }
  };

  const handleDownloadZip = async () => {
    setIsZipping(true);
    try {
      const zip = new JSZip();
      const folder = zip.folder('MMM-TempestWx');
      if (folder) {
        folder.file('MMM-TempestWx.js', mmmJs);
        folder.file('node_helper.js', helperJs);
        folder.file('MMM-TempestWx.css', css);
        folder.file('package.json', pkg);
        folder.file('README.md', readme);
      }

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'MMM-TempestWx.zip';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to generate ZIP', err);
    } finally {
      setIsZipping(false);
    }
  };

  return (
    <div className="bg-neutral-950 border border-neutral-800 rounded-2xl overflow-hidden flex flex-col shadow-xl">
      {/* Top action & tabs bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-800 bg-neutral-900/60 p-3 sm:px-5 gap-3">
        {/* Tab buttons */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('js')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap ${
              activeTab === 'js'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            MMM-TempestWx.js
          </button>
          <button
            onClick={() => setActiveTab('helper')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap ${
              activeTab === 'helper'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            node_helper.js
          </button>
          <button
            onClick={() => setActiveTab('css')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap ${
              activeTab === 'css'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            MMM-TempestWx.css
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap ${
              activeTab === 'config'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            config.js
          </button>
          <button
            onClick={() => setActiveTab('readme')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap ${
              activeTab === 'readme'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            README.md
          </button>
          <button
            onClick={() => setActiveTab('package')}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium transition-colors whitespace-nowrap ${
              activeTab === 'package'
                ? 'bg-neutral-800 text-white shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-900'
            }`}
          >
            package.json
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-xs font-medium text-neutral-200 transition-colors"
            title="Copy current file code"
          >
            {copied ? (
              <>
                <svg className="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <svg className="w-3.5 h-3.5 text-neutral-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                <span>Copy {currentFilename}</span>
              </>
            )}
          </button>

          <button
            onClick={handleDownloadZip}
            disabled={isZipping}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-neutral-100 hover:bg-white text-neutral-950 text-xs font-medium transition-colors shadow-sm disabled:opacity-50"
            title="Download full module zip archive ready to unpack into MagicMirror/modules"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>{isZipping ? 'Archiving...' : 'Download Module ZIP'}</span>
          </button>
        </div>
      </div>

      {/* Code Display Area */}
      <div className="relative p-4 sm:p-5 bg-black/95 overflow-x-auto max-h-[520px] font-mono text-xs text-neutral-300 leading-relaxed scrollbar-thin scrollbar-thumb-neutral-800">
        <pre>
          <code>{currentCode}</code>
        </pre>
      </div>

      {/* Footer Info Ribbon */}
      <div className="px-5 py-3 border-t border-neutral-800/80 bg-neutral-900/40 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-neutral-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Built-in Node.js API: Uses native <code className="text-neutral-200">https</code> & <code className="text-neutral-200">fetch</code>. Zero external npm dependencies.</span>
        </div>
        <div className="text-[11px] text-neutral-400">
          Target: <code className="text-neutral-300">~/MagicMirror/modules/MMM-TempestWx/</code>
        </div>
      </div>
    </div>
  );
};
