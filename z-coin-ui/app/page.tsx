'use client';

import React, { useState, useEffect } from 'react';

interface Block {
  index: number;
  hash: string;
  previousHash: string;
  timestamp: number;
  data: string;
  difficulty: number;
  nonce: number;
}

export default function Home() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [blockData, setBlockData] = useState('');
  const [isMining, setIsMining] = useState(false);
  const [nodeUrl, setNodeUrl] = useState('http://localhost:3001');
  const [statusMsg, setStatusMsg] = useState('');

  const fetchBlocks = async () => {
    try {
      const res = await fetch(`${nodeUrl}/blocks`);
      if (res.ok) {
        const data = await res.json();
        setBlocks(data);
        setStatusMsg('Connected to node');
      } else {
        setStatusMsg('Error fetching blocks from node');
      }
    } catch (err) {
      setStatusMsg('Cannot connect to z-coin node');
    }
  };

  useEffect(() => {
    fetchBlocks();
    const interval = setInterval(fetchBlocks, 3000);
    return () => clearInterval(interval);
  }, [nodeUrl]);

  const handleMine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockData.trim()) return;

    setIsMining(true);
    setStatusMsg('Mining in progress...');

    try {
      const res = await fetch(`${nodeUrl}/mineBlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: blockData }),
      });

      if (res.ok) {
        setBlockData('');
        setStatusMsg('Block successfully mined!');
        fetchBlocks();
      } else {
        setStatusMsg('Mining failed.');
      }
    } catch (err) {
      setStatusMsg('Node connection failed while mining.');
    } finally {
      setIsMining(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-6 font-mono text-sm">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="border-b border-neutral-800 pb-4 mb-6 flex justify-between items-baseline">
          <div>
            <h1 className="text-xl font-bold text-white">z-coin explorer</h1>
            <p className="text-xs text-neutral-500 mt-1">naive blockchain node interface</p>
          </div>
          <div className="text-xs text-neutral-400">
            Node:{' '}
            <input
              type="text"
              value={nodeUrl}
              onChange={(e) => setNodeUrl(e.target.value)}
              className="border border-neutral-700 bg-neutral-900 px-2 py-1 rounded text-xs w-48 font-mono text-white focus:outline-none focus:border-neutral-500"
            />
          </div>
        </div>

        {/* Status */}
        <div className="mb-6 text-xs bg-neutral-900 border border-neutral-800 p-2.5 text-neutral-400">
          Status: <span className="text-white">{statusMsg}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Mine Block Form */}
          <div className="md:col-span-1">
            <div className="border border-neutral-800 p-4 bg-neutral-900/50">
              <h2 className="font-bold text-white border-b border-neutral-800 pb-2 mb-3">
                Mine New Block
              </h2>
              <form onSubmit={handleMine}>
                <div className="mb-3">
                  <label className="block text-xs text-neutral-400 mb-1">Data / Payload:</label>
                  <textarea
                    value={blockData}
                    onChange={(e) => setBlockData(e.target.value)}
                    placeholder="e.g. Sanjeet sent 10 coins"
                    rows={4}
                    className="w-full border border-neutral-800 bg-neutral-950 p-2 text-xs font-mono text-white focus:outline-none focus:border-neutral-600 resize-none"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isMining || !blockData.trim()}
                  className="w-full bg-neutral-200 text-black font-semibold py-2 text-xs hover:bg-white disabled:bg-neutral-800 disabled:text-neutral-600 transition-none"
                >
                  {isMining ? 'Mining...' : 'Mine Block'}
                </button>
              </form>
            </div>
          </div>

          {/* Chain Display */}
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-3">
              <h2 className="font-bold text-white">Chain History ({blocks.length})</h2>
              <button
                onClick={fetchBlocks}
                className="text-xs underline text-neutral-400 hover:text-white"
              >
                refresh
              </button>
            </div>

            <div className="space-y-3">
              {blocks.slice().reverse().map((block) => (
                <div
                  key={block.index}
                  className="border border-neutral-800 p-3 bg-neutral-900/40 text-xs font-mono space-y-1.5"
                >
                  <div className="flex justify-between border-b border-neutral-800 pb-1 font-bold">
                    <span className="text-white">Block #{block.index}</span>
                    <span className="text-neutral-500 font-normal">
                      Nonce: {block.nonce} | Diff: {block.difficulty}
                    </span>
                  </div>

                  <div>
                    <span className="text-neutral-500">Hash: </span>
                    <span className="break-all text-neutral-300">{block.hash}</span>
                  </div>

                  <div>
                    <span className="text-neutral-500">Prev: </span>
                    <span className="break-all text-neutral-500">{block.previousHash}</span>
                  </div>

                  <div className="pt-1 border-t border-neutral-800/60 flex justify-between items-center">
                    <span className="font-semibold text-neutral-200">
                      Data: {typeof block.data === 'string' ? block.data : JSON.stringify(block.data)}
                    </span>
                    <span className="text-[10px] text-neutral-500">
                      {new Date(block.timestamp * 1000).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}