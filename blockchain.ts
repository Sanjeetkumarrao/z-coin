import CryptoJS from 'crypto-js';
import {
    Transaction,
    TxIn,
    TxOut,
    UnspentTxOut,
    getTransactionId,
    signTxIn,
    generatePrivateKey,
    getPublicKey
} from './transaction';

class Block {
    public index: number;
    public hash: string;
    public previousHash: string;
    public timestamp: number;
    public data: Transaction[];
    public difficulty: number;
    public nonce: number;

    constructor(
        index: number,
        hash: string,
        previousHash: string,
        timestamp: number,
        data: Transaction[],
        difficulty: number,
        nonce: number
    ) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}

const calculateHash = (
    index: number,
    previousHash: string,
    timestamp: number,
    data: Transaction[],
    difficulty: number,
    nonce: number
): string => {
    return CryptoJS.SHA256(index + previousHash + timestamp + JSON.stringify(data) + difficulty + nonce).toString();
};

const hashMatchesDifficulty = (hash: string, difficulty: number): boolean => {
    const requiredPrefix = '0'.repeat(difficulty);
    return hash.startsWith(requiredPrefix);
};

const findBlock = (
    index: number,
    previousHash: string,
    timestamp: number,
    data: Transaction[],
    difficulty: number
): Block => {
    let nonce = 0;
    while (true) {
        const hash = calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
        if (hashMatchesDifficulty(hash, difficulty)) {
            console.log(`Block Mined! Nonce: ${nonce}, Hash: ${hash}`);
            return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
        }
        nonce++;
    }
};

const getCoinbaseTransaction = (address: string, blockIndex: number): Transaction => {
    const t = new Transaction();
    const txIn: TxIn = new TxIn();
    txIn.signature = '';
    txIn.txOutId = '';
    txIn.txOutIndex = blockIndex;

    t.txIns = [txIn];
    t.txOuts = [new TxOut(address, 50)];
    t.id = getTransactionId(t);
    return t;
};

const getGenesisBlock = (minerAddress: string): Block => {
    const timestamp = 1700000000;
    const difficulty = 2;
    const genesisTx = getCoinbaseTransaction(minerAddress, 0);
    const genesisHash = calculateHash(0, '0', timestamp, [genesisTx], difficulty, 0);
    return new Block(0, genesisHash, '0', timestamp, [genesisTx], difficulty, 0);
};

class Blockchain {
    private chain: Block[];
    private difficulty: number = 2;
    public unspentTxOuts: UnspentTxOut[] = [];

    constructor(minerAddress: string) {
        const genesisBlock = getGenesisBlock(minerAddress);
        this.chain = [genesisBlock];
        this.updateUnspentTxOuts([genesisBlock.data[0]]);
    }

    public getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    private updateUnspentTxOuts(transactions: Transaction[]): void {
        const newUnspentTxOuts: UnspentTxOut[] = transactions.map((t) => {
            return t.txOuts.map((txOut, index) => new UnspentTxOut(t.id, index, txOut.address, txOut.amount));
        }).reduce((a, b) => a.concat(b), []);

        const consumedTxIns: TxIn[] = transactions
            .map((t) => t.txIns)
            .reduce((a, b) => a.concat(b), []);

        this.unspentTxOuts = this.unspentTxOuts
            .filter((uTxO) => !consumedTxIns.find((txIn) => txIn.txOutId === uTxO.txOutId && txIn.txOutIndex === uTxO.txOutIndex))
            .concat(newUnspentTxOuts);
    }

    public generateNextBlock(minerAddress: string, transactions: Transaction[] = []): Block {
        const previousBlock: Block = this.getLatestBlock();
        const nextIndex: number = previousBlock.index + 1;
        const nextTimestamp: number = Math.floor(Date.now() / 1000);

        const coinbaseTx = getCoinbaseTransaction(minerAddress, nextIndex);
        const blockData = [coinbaseTx, ...transactions];

        console.log(`Mining Block ${nextIndex}...`);
        const newBlock = findBlock(nextIndex, previousBlock.hash, nextTimestamp, blockData, this.difficulty);

        this.chain.push(newBlock);
        this.updateUnspentTxOuts(blockData);
        return newBlock;
    }

    public getBalance(address: string): number {
        return this.unspentTxOuts
            .filter((uTxO) => uTxO.address === address)
            .reduce((sum, uTxO) => sum + uTxO.amount, 0);
    }

    public getChain(): Block[] {
        return this.chain;
    }
}

const minerPrivateKey = generatePrivateKey();
const minerAddress = getPublicKey(minerPrivateKey);

const userPrivateKey = generatePrivateKey();
const userAddress = getPublicKey(userPrivateKey);

console.log('--- Initializing Blockchain ---');
const myCoin = new Blockchain(minerAddress);

console.log(`Miner Initial Balance: ${myCoin.getBalance(minerAddress)} coins`);

console.log('\nMining Block 1 (Miner earns 50 coins reward)...');
myCoin.generateNextBlock(minerAddress);

console.log(`Miner New Balance: ${myCoin.getBalance(minerAddress)} coins`);

console.log('\n--- Full Blockchain Output ---');
console.log(JSON.stringify(myCoin.getChain(), null, 2));