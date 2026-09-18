'use client';

import React, { useState, useEffect } from 'react';

interface Transaction {
  id: string;
  sender: string;
  receiver: string;
  amount: number;
}

interface Block {
  index: number;
  hash: string;
  previousHash: string;
  timestamp: number;
  transactions: Transaction[];
  difficulty: number;
  nonce: number;
}

export default function Home() {
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [mempool, setMempool] = useState<Transaction[]>([]);
  const [sender, setSender] = useState('');
  const [receiver, setReceiver] = useState('');
  const [amount, setAmount] = useState('');
  const [minerAddress, setMinerAddress] = useState('Sanjeet-Node');
  const [isMining, setIsMining] = useState(false);
  const [nodeUrl, setNodeUrl] = useState(
    process.env.NEXT_PUBLIC_NODE_URL || 'http://localhost:3001'
  );
  const [statusMsg, setStatusMsg] = useState('');

  const fetchNodeData = async () => {
    try {
      const [blocksRes, mempoolRes] = await Promise.all([
        fetch(`${nodeUrl}/blocks`),
        fetch(`${nodeUrl}/mempool`),
      ]);

      if (blocksRes.ok && mempoolRes.ok) {
        setBlocks(await blocksRes.json());
        setMempool(await mempoolRes.json());
        setStatusMsg('Connected to node');
      } else {
        setStatusMsg('Error fetching node data');
      }
    } catch (err) {
      setStatusMsg('Cannot connect to z-coin node');
    }
  };

  useEffect(() => {
    fetchNodeData();
    const interval = setInterval(fetchNodeData, 3000);
    return () => clearInterval(interval);
  }, [nodeUrl]);

  const handleSendTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sender || !receiver || !amount) return;

    try {
      const res = await fetch(`${nodeUrl}/transact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sender, receiver, amount: Number(amount) }),
      });

      if (res.ok) {
        setSender('');
        setReceiver('');
        setAmount('');
        setStatusMsg('Transaction sent to Mempool!');
        fetchNodeData();
      }
    } catch (err) {
      setStatusMsg('Failed to send transaction.');
    }
  };

  const handleMine = async () => {
    setIsMining(true);
    setStatusMsg('Mining block with mempool transactions...');

    try {
      const res = await fetch(`${nodeUrl}/mineBlock`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minerAddress }),
      });

      if (res.ok) {
        setStatusMsg('Block successfully mined!');
        fetchNodeData();
      }
    } catch (err) {
      setStatusMsg('Mining failed.');
    } finally {
      setIsMining(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200 p-6 font-mono text-sm">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="border-b border-neutral-800 pb-4 mb-6 flex justify-between items-baseline">
          <div>
            <h1 className="text-xl font-bold text-white">z-coin explorer</h1>
            <p className="text-xs text-neutral-500 mt-1">decentralized mempool & ledger interface</p>
          </div>
          <div className="text-xs text-neutral-400">
            Node:{' '}
            <input
              type="text"
              value={nodeUrl}
              onChange={(e) => setNodeUrl(e.target.value)}
              className="border border-neutral-700 bg-neutral-900 px-2 py-1 rounded text-xs w-56 font-mono text-white focus:outline-none focus:border-neutral-500"
            />
          </div>
        </div>

        {/* Status */}
        <div className="mb-6 text-xs bg-neutral-900 border border-neutral-800 p-2.5 text-neutral-400 flex justify-between items-center">
          <span>Status: <span className="text-white">{statusMsg}</span></span>
          <span>Pending Mempool Txs: <span className="text-white">{mempool.length}</span></span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Controls Column */}
          <div className="md:col-span-1 space-y-6">
            {/* Create Transaction */}
            <div className="border border-neutral-800 p-4 bg-neutral-900/50">
              <h2 className="font-bold text-white border-b border-neutral-800 pb-2 mb-3">
                New Transaction
              </h2>
              <form onSubmit={handleSendTransaction} className="space-y-3">
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Sender:</label>
                  <input
                    type="text"
                    value={sender}
                    onChange={(e) => setSender(e.target.value)}
                    placeholder="e.g. Alice"
                    className="w-full border border-neutral-800 bg-neutral-950 p-2 text-xs font-mono text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Receiver:</label>
                  <input
                    type="text"
                    value={receiver}
                    onChange={(e) => setReceiver(e.target.value)}
                    placeholder="e.g. Bob"
                    className="w-full border border-neutral-800 bg-neutral-950 p-2 text-xs font-mono text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <div>
                  <label className="block text-xs text-neutral-400 mb-1">Amount:</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g. 15"
                    className="w-full border border-neutral-800 bg-neutral-950 p-2 text-xs font-mono text-white focus:outline-none focus:border-neutral-600"
                  />
                </div>
                <button
                  type="submit"
                  className="w-full bg-neutral-800 text-white py-2 text-xs hover:bg-neutral-700 font-semibold"
                >
                  Send to Mempool
                </button>
              </form>
            </div>

            {/* Mining Box */}
            <div className="border border-neutral-800 p-4 bg-neutral-900/50">
              <h2 className="font-bold text-white border-b border-neutral-800 pb-2 mb-3">
                Mining Node
              </h2>
              <div className="mb-3">
                <label className="block text-xs text-neutral-400 mb-1">Miner Address:</label>
                <input
                  type="text"
                  value={minerAddress}
                  onChange={(e) => setMinerAddress(e.target.value)}
                  className="w-full border border-neutral-800 bg-neutral-950 p-2 text-xs font-mono text-white focus:outline-none focus:border-neutral-600"
                />
              </div>
              <button
                onClick={handleMine}
                disabled={isMining}
                className="w-full bg-neutral-200 text-black font-semibold py-2 text-xs hover:bg-white disabled:bg-neutral-800 disabled:text-neutral-600"
              >
                {isMining ? 'Mining Block...' : 'Mine Mempool Block'}
              </button>
            </div>
          </div>

          {/* Ledger Display */}
          <div className="md:col-span-2 space-y-6">
            {/* Mempool View */}
            <div>
              <h2 className="font-bold text-white mb-3">Pending Mempool ({mempool.length})</h2>
              {mempool.length === 0 ? (
                <div className="border border-neutral-800 p-3 bg-neutral-900/20 text-xs text-neutral-500 font-mono">
                  No pending transactions in mempool.
                </div>
              ) : (
                <div className="space-y-2">
                  {mempool.map((tx) => (
                    <div key={tx.id} className="border border-neutral-800 p-2.5 bg-neutral-900/60 text-xs flex justify-between">
                      <span className="text-neutral-300">{tx.sender} ➔ {tx.receiver}</span>
                      <span className="text-white font-bold">{tx.amount} z-coins</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Chain View */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <h2 className="font-bold text-white">Chain History ({blocks.length})</h2>
                <button onClick={fetchNodeData} className="text-xs underline text-neutral-400 hover:text-white">
                  refresh
                </button>
              </div>

              <div className="space-y-3">
                {blocks.slice().reverse().map((block) => (
                  <div key={block.index} className="border border-neutral-800 p-3 bg-neutral-900/40 text-xs font-mono space-y-1.5">
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
                    <div className="pt-2 border-t border-neutral-800/60 space-y-1">
                      <span className="text-neutral-400 text-[11px] block font-semibold">
                        Transactions ({block.transactions?.length || 0}):
                      </span>
                      {block.transactions?.map((tx, idx) => (
                        <div key={idx} className="text-[11px] text-neutral-300 pl-2 border-l border-neutral-800">
                          {tx.sender} ➔ {tx.receiver}: <span className="text-white">{tx.amount} z-coins</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}