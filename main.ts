import express, { Request, Response } from 'express';
import {
    generatePrivateKey,
    getPublicKey,
    Transaction
} from './transaction';
import CryptoJS from 'crypto-js';

class Block {
    public index: number;
    public hash: string;
    public previousHash: string;
    public timestamp: number;
    public data: string;
    public difficulty: number;
    public nonce: number;

    constructor(
        index: number,
        hash: string,
        previousHash: string,
        timestamp: number,
        data: string,
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
    data: string,
    difficulty: number,
    nonce: number
): string => {
    return CryptoJS.SHA256(index + previousHash + timestamp + data + difficulty + nonce).toString();
};

const hashMatchesDifficulty = (hash: string, difficulty: number): boolean => {
    const requiredPrefix = '0'.repeat(difficulty);
    return hash.startsWith(requiredPrefix);
};

const findBlock = (
    index: number,
    previousHash: string,
    timestamp: number,
    data: string,
    difficulty: number
): Block => {
    let nonce = 0;
    while (true) {
        const hash = calculateHash(index, previousHash, timestamp, data, difficulty, nonce);
        if (hashMatchesDifficulty(hash, difficulty)) {
            return new Block(index, hash, previousHash, timestamp, data, difficulty, nonce);
        }
        nonce++;
    }
};

const getGenesisBlock = (): Block => {
    const timestamp = 1700000000;
    const difficulty = 2;
    const genesisHash = calculateHash(0, '0', timestamp, 'Genesis Block - Start of z-coin', difficulty, 0);
    return new Block(0, genesisHash, '0', timestamp, 'Genesis Block - Start of z-coin', difficulty, 0);
};

class Blockchain {
    private chain: Block[];
    private difficulty: number = 2;

    constructor() {
        this.chain = [getGenesisBlock()];
    }

    public getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    public generateNextBlock(blockData: string): Block {
        const previousBlock: Block = this.getLatestBlock();
        const nextIndex: number = previousBlock.index + 1;
        const nextTimestamp: number = Math.floor(Date.now() / 1000);

        const newBlock = findBlock(
            nextIndex,
            previousBlock.hash,
            nextTimestamp,
            blockData,
            this.difficulty
        );

        this.chain.push(newBlock);
        return newBlock;
    }

    public getChain(): Block[] {
        return this.chain;
    }
}

const zCoin = new Blockchain();
const app = express();
app.use(express.json());

const HTTP_PORT = process.env.HTTP_PORT || 3001;

app.get('/blocks', (req: Request, res: Response) => {
    res.send(zCoin.getChain());
});

app.post('/mineBlock', (req: Request, res: Response) => {
    const data = req.body.data || 'Default z-coin transaction';
    const newBlock = zCoin.generateNextBlock(data);
    res.send(newBlock);
});

app.listen(HTTP_PORT, () => {
    console.log(`z-coin HTTP node running on port: ${HTTP_PORT}`);
});