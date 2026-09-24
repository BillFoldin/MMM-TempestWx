import React, { useState } from 'react';
import JSZip from 'jszip';
import { ModuleConfig } from '../types/tempest.ts';
import {
  getMmmTempestWxJs,
  getNodeHelperJs,
  getMmmTempestWxCss,
  getReadmeMd,
} from '../utils/moduleSourceCode.ts';

interface ModuleCodeViewerProps {
  config: ModuleConfig;
}

type FileTab = 'js' | 'helper' | 'css' | 'config' | 'readme';

export const ModuleCodeViewer: React.FC<ModuleCodeViewerProps> = ({ config }) => {
  const [activeTab, setActiveTab] = useState<FileTab>('js');
  const [copied, setCopied] = useState(false);
  const [isZipping, setIsZipping] = useState(false);
  const [showTroubleshooter, setShowTroubleshooter] = useState(true);

  const mmmJs = getMmmTempestWxJs();
  const helperJs = getNodeHelperJs();
  const css = getMmmTempestWxCss();
  const readme = getReadmeMd(config);

  const configSnippet = `// Add this to your MagicMirror config/config.js inside modules: [...]
{
  module: "MMM-TempestWx",
  position: "${config.mirrorPosition}", // "top_right", "top_left", etc.
  config: {
    stationId: "${config.stationId || 'YOUR_STATION_ID'}",
    token: "${config.token || 'YOUR_TEMPEST_TOKEN'}",
    weatherProvider: "${config.weatherProvider || 'tempest'}", // "tempest" or "NOAA"
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

      {/* Troubleshooting Alert Box */}
      {showTroubleshooter && (
        <div className="bg-amber-950/30 border-b border-amber-900/50 p-4 text-xs">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <span className="p-1 rounded bg-amber-500/20 text-amber-400 mt-0.5 shrink-0">
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </span>
              <div>
                <h4 className="font-semibold text-amber-200">
                  Fix for: <span className="font-mono text-[11px] bg-black/40 px-1 py-0.5 rounded text-amber-300">No \MagicMirror\modules\MMM-TempestWx/MMM-TempestWx.js found</span>
                </h4>
                <p className="text-neutral-300 mt-1 leading-relaxed">
                  This error happens when the files are placed in a <strong>nested subfolder</strong> (e.g. <code className="text-amber-200 font-mono">modules/MMM-TempestWx/MMM-TempestWx/</code>) after unzipping, or if the folder name has a typo.
                </p>
                <div className="mt-2.5 grid grid-cols-1 md:grid-cols-2 gap-3 font-mono text-[11px]">
                  <div className="p-2.5 rounded bg-black/60 border border-neutral-800">
                    <div className="text-neutral-400 mb-1 font-sans font-medium text-xs">Expected Folder Structure:</div>
                    <div className="text-neutral-300">
                      MagicMirror/<br />
                      &nbsp;&nbsp;└── modules/<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── <strong className="text-emerald-400">MMM-TempestWx/</strong><br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── <strong className="text-white">MMM-TempestWx.js</strong> <em>(directly here)</em><br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── node_helper.js<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;├── MMM-TempestWx.css<br />
                      &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;└── README.md <span className="text-emerald-400 font-sans text-[10px]">(zero npm dependencies, no package.json needed)</span>
                    </div>
                  </div>
                  <div className="p-2.5 rounded bg-black/60 border border-neutral-800">
                    <div className="text-neutral-400 mb-1 font-sans font-medium text-xs">Quick Terminal Fix (Raspberry Pi / Linux):</div>
                    <pre className="text-sky-300 whitespace-pre-wrap">
                      cd ~/MagicMirror/modules{"\n"}
                      # If nested inside MMM-TempestWx/MMM-TempestWx:{"\n"}
                      mv MMM-TempestWx/MMM-TempestWx/* MMM-TempestWx/{"\n"}
                      rmdir MMM-TempestWx/MMM-TempestWx{"\n"}
                      # Verify MMM-TempestWx.js is now visible:{"\n"}
                      ls -la MMM-TempestWx/
                    </pre>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-amber-900/40">
                  <div className="font-semibold text-emerald-300 mb-1 flex items-center justify-between">
                    <span>WeatherFlow API URL Verification</span>
                    <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono">Official REST endpoints</span>
                  </div>
                  <p className="text-neutral-300 text-[11px] leading-relaxed mb-2">
                    Here are the exact URLs configured for your station and token. You can copy either URL to verify it directly in your browser or with <code className="text-white">curl</code>:
                  </p>
                  <div className="space-y-2 font-mono text-[11px]">
                    <div className="p-2.5 rounded bg-black/70 border border-neutral-800">
                      <div className="text-neutral-400 text-[10px] font-sans font-medium mb-1 flex items-center justify-between">
                        <span>1. Live Observation Endpoint (Path has /station/&#123;id&#125;):</span>
                        <span className="text-neutral-500">HTTP GET</span>
                      </div>
                      <div className="text-sky-300 break-all select-all">
                        {`https://swd.weatherflow.com/swd/rest/observations/station/${config.stationId || 'YOUR_STATION_ID'}?token=${config.token || 'YOUR_TOKEN'}`}
                      </div>
                    </div>
                    <div className="p-2.5 rounded bg-black/70 border border-neutral-800">
                      <div className="text-neutral-400 text-[10px] font-sans font-medium mb-1 flex items-center justify-between">
                        <span>2. Better Forecast Endpoint (Query has ?station_id=&#123;id&#125;):</span>
                        <span className="text-neutral-500">HTTP GET</span>
                      </div>
                      <div className="text-amber-300 break-all select-all">
                        {`https://swd.weatherflow.com/swd/rest/better_forecast?station_id=${config.stationId || 'YOUR_STATION_ID'}&token=${config.token || 'YOUR_TOKEN'}`}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-3 pt-3 border-t border-amber-900/40">
                  <div className="font-semibold text-rose-300 mb-1">
                    Fix for: <span className="font-mono text-[11px] bg-black/40 px-1 py-0.5 rounded text-rose-200">HTTP 404 Not Found</span>
                  </div>
                  <p className="text-neutral-300 text-[11px] leading-relaxed">
                    1. <strong>API Endpoint URL:</strong> Ensure your <code className="text-amber-200 font-mono">node_helper.js</code> uses WeatherFlow's official REST endpoint <code className="text-emerald-400 font-mono">swd/rest/observations/station/</code> (updated in the code tabs).<br />
                    2. <strong>Station ID vs Device ID:</strong> WeatherFlow requires your numerical <strong>Station ID</strong> (e.g. 5 digits like <code className="text-white">12345</code>), NOT your hardware Device ID or Hub Serial number. Find it at <a href="https://tempestwx.com" target="_blank" rel="noreferrer" className="text-sky-300 underline">tempestwx.com</a> &gt; <em>Settings &gt; Stations &gt; [Your Station]</em> (it also appears at the end of your browser URL: <code className="text-neutral-400">tempestwx.com/station/<strong>12345</strong></code>).
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-amber-900/40">
                  <div className="font-semibold text-emerald-300 mb-1 flex items-center justify-between">
                    <span>Zero Dependencies / No package.json</span>
                    <span className="text-[10px] bg-emerald-950/80 text-emerald-400 border border-emerald-800 px-2 py-0.5 rounded font-mono">Clean CommonJS</span>
                  </div>
                  <p className="text-neutral-300 text-[11px] leading-relaxed">
                    This module uses pure Node.js built-in APIs (<code className="text-amber-200 font-mono">https</code>) with zero third-party npm packages. <strong>No <code className="text-white">package.json</code> is needed or included</strong> in the module, eliminating any CommonJS vs ES module conflicts (<code className="text-rose-300">"require is not defined in ES module scope"</code>) in MagicMirror².
                  </p>
                </div>

                <div className="mt-3 pt-3 border-t border-amber-900/40">
                  <div className="font-semibold text-amber-200 mb-1">
                    Stuck on <span className="font-mono text-[11px] bg-black/40 px-1 py-0.5 rounded text-amber-300">"Loading Tempest Station Data..."</span>? Check Logs Here:
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 font-mono text-[11px]">
                    <div className="p-2 rounded bg-black/50 border border-neutral-800">
                      <div className="text-emerald-400 font-sans font-medium mb-0.5">1. PM2 Autostart Logs:</div>
                      <code className="text-sky-300 block">pm2 logs mm</code>
                      <span className="text-[10px] text-neutral-400 font-sans block mt-1">Shows backend node_helper requests, errors, & 401 token rejects.</span>
                    </div>
                    <div className="p-2 rounded bg-black/50 border border-neutral-800">
                      <div className="text-emerald-400 font-sans font-medium mb-0.5">2. Manual Run Logs:</div>
                      <code className="text-sky-300 block">npm start dev</code>
                      <span className="text-[10px] text-neutral-400 font-sans block mt-1">Direct terminal output + launches with DevTools Console open.</span>
                    </div>
                    <div className="p-2 rounded bg-black/50 border border-neutral-800">
                      <div className="text-emerald-400 font-sans font-medium mb-0.5">3. Electron / Browser:</div>
                      <code className="text-sky-300 block">Ctrl + Shift + I</code>
                      <span className="text-[10px] text-neutral-400 font-sans block mt-1">Press on mirror screen or F12 on browser (http://localhost:8080).</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <button
              onClick={() => setShowTroubleshooter(false)}
              className="text-neutral-500 hover:text-neutral-300 p-1"
              title="Dismiss"
            >
              ✕
            </button>
          </div>
        </div>
      )}

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
