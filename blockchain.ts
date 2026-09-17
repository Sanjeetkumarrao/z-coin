import CryptoJS from 'crypto-js';

class Block {
    public index: number;
    public hash: string;
    public previousHash: string;
    public timestamp: number;
    public data: string;

    constructor (index: number, hash: string, previousHash: string, timestamp: number, data: string){
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.data = data;
        this.hash = hash;
    }
}

const calculateHash = (
    index: number,
    previousHash: string,
    timestamp: number,
    data: string
) : string => {
    return CryptoJS.SHA256(index + previousHash + timestamp + data).toString();
};

const getGenesisBlock = (): Block => {
    const timestamp = 1700000000;
    const genesisHash = calculateHash(0, '0', timestamp, 'Genesis Block - Start of z-coin');
    return new Block(0, genesisHash, '0', timestamp, 'Genesis Block - Start of z-coin')
};

class Blockchain {
    private chain: Block[];

    constructor(){
        this.chain = [getGenesisBlock()];
    }

    public getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    public generateNextBlock(blockData: string): Block {
        const previousBlock: Block = this.getLatestBlock();
        const nextIndex: number = previousBlock.index + 1;
        const nextTimestamp: number = Math.floor(Date.now() / 1000);
        const nexthash: string = calculateHash(nextIndex, previousBlock.hash, nextTimestamp, blockData);

        const newBlock = new Block(nextIndex, nexthash, previousBlock.hash, nextTimestamp, blockData)

        if(this.isValidNewBlock(newBlock, previousBlock)){
            this.chain.push(newBlock);
            return newBlock;
        } else{
            throw new Error('Invalid block! Rejected.');
        }
    }

    public isValidNewBlock(newBlock: Block, previousBlock: Block): boolean {
        if(previousBlock.index + 1 !== newBlock.index){
            console.log('Invalid Index');
            return false;
        }

        if(previousBlock.hash !== newBlock.previousHash){
            console.log('Invalid previousHash');
            return false;
        }

        const recalculatedHash = calculateHash(
            newBlock.index,
            newBlock.previousHash,
            newBlock.timestamp,
            newBlock.data
        );

        if(recalculatedHash !== newBlock.hash) {
            console.log('Invalid hash calculation');
            return false;
        }
        return true;
    }

    public getChain(): Block[] {
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