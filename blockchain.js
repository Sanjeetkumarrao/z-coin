import CryptoJS from 'crypto-js';
class Block {
    index;
    hash;
    previousHash;
    timestamp;
    data;
    constructor(index, hash, previousHash, timestamp, data) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash;
    }
}
const calculateHash = (index, previousHash, timestamp, data) => {
    return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
};
const getGenesisBlock = () => {
    const timestamp = 1700000000;
    const genesisHash = calculateHash(0, '0', timestamp, 'Genesis Block - Start of z-coin');
    return new Block(0, genesisHash, '0', timestamp, 'Genesis Block - Start of z-coin');
};
class Blockchain {
    chain;
    constructor() {
        this.chain = [getGenesisBlock()];
    }
    getLatestBlock() {
        return this.chain[this.chain.length - 1];
    }
    generateNextBlock(blockData) {
        const previousBlock = this.getLatestBlock();
        const nextIndex = previousBlock.index + 1;
        const nextTimestamp = Math.floor(Date.now() / 1000);
        const nexthash = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);
        const newBlock = new Block(nextIndex, nexthash, previousBlock.hash, nextTimestamp, blockData);
        if (this.isValidNewBlock(newBlock, previousBlock)) {
            this.chain.push(newBlock);
            return newBlock;
        }
        else {
            throw new Error('Invalid block! Rejected.');
        }
    }
    isValidNewBlock(newBlock, previousBlock) {
        if (previousBlock.index + 1 !== newBlock.index) {
            console.log('Invalid Index');
            return false;
        }
        if (previousBlock.hash !== newBlock.previousHash) {
            console.log('Invalid previousHash');
            return false;
        }
        const recalculatedHash = calculateHash(newBlock.index, newBlock.previousHash, newBlock.timestamp, newBlock.data);
        if (recalculatedHash !== newBlock.hash) {
            console.log('Invalid hash calculation');
            return false;
        }
        return true;
    }
    getChain() {
        return this.chain;
    }
}
const myCoin = new Blockchain();
console.log('Mining/Adding Block 1...');
myCoin.generateNextBlock('Sanjeet sent 10 coins to Amit');
console.log('Mining/Adding Block 2...');
myCoin.generateNextBlock('Amit sent 2 coins to Rahul');
console.log('\n--- Full Blockchain Output ---');
console.log(JSON.stringify(myCoin.getChain(), null, 2));
