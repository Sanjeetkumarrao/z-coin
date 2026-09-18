import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import CryptoJS from 'crypto-js';
import cors from 'cors';

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

    public replaceChain(newBlocks: Block[]): boolean {
        if (newBlocks.length > this.chain.length) {
            console.log('Received blockchain is longer. Replacing current chain...');
            this.chain = newBlocks;
            return true;
        }
        return false;
    }
}

const zCoin = new Blockchain();
const sockets: WebSocket[] = [];

enum MessageType {
    QUERY_LATEST = 0,
    QUERY_ALL = 1,
    RESPONSE_BLOCKCHAIN = 2
}

class Message {
    public type: MessageType;
    public data: any;
}

const initP2PServer = (p2pPort: number) => {
    const server = new WebSocketServer({ port: p2pPort });
    server.on('connection', (ws: WebSocket) => initConnection(ws));
    console.log(`z-coin P2P node listening on port: ${p2pPort}`);
};

const initConnection = (ws: WebSocket) => {
    sockets.push(ws);
    initMessageHandler(ws);
    initErrorHandler(ws);
    write(ws, { type: MessageType.QUERY_LATEST, data: null });
};

const JSONToObject = <T>(data: string): T => {
    try {
        return JSON.parse(data);
    } catch (e) {
        return null;
    }
};

const initMessageHandler = (ws: WebSocket) => {
    ws.on('message', (data: string) => {
        const message: Message = JSONToObject<Message>(data);
        if (message === null) return;

        switch (message.type) {
            case MessageType.QUERY_LATEST:
                write(ws, responseLatestMsg());
                break;
            case MessageType.QUERY_ALL:
                write(ws, responseChainMsg());
                break;
            case MessageType.RESPONSE_BLOCKCHAIN:
                const receivedBlocks: Block[] = JSONToObject<Block[]>(message.data);
                if (receivedBlocks === null) break;
                handleBlockchainResponse(receivedBlocks);
                break;
        }
    });
};

const write = (ws: WebSocket, message: Message): void => ws.send(JSON.stringify(message));
const broadcast = (message: Message): void => sockets.forEach((socket) => write(socket, message));

const responseLatestMsg = (): Message => ({
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify([zCoin.getLatestBlock()])
});

const responseChainMsg = (): Message => ({
    type: MessageType.RESPONSE_BLOCKCHAIN,
    data: JSON.stringify(zCoin.getChain())
});

const handleBlockchainResponse = (receivedBlocks: Block[]) => {
    const latestBlockReceived: Block = receivedBlocks[receivedBlocks.length - 1];
    const latestBlockHeld: Block = zCoin.getLatestBlock();

    if (latestBlockReceived.index > latestBlockHeld.index) {
        console.log(`Block ahead. Local: ${latestBlockHeld.index}, Network: ${latestBlockReceived.index}`);
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            zCoin.generateNextBlock(latestBlockReceived.data);
            broadcast(responseLatestMsg());
        } else {
            broadcast(responseChainMsg());
        }
    }
};

const connectToPeers = (newPeer: string): void => {
    const ws = new WebSocket(newPeer);
    ws.on('open', () => initConnection(ws));
};

const initErrorHandler = (ws: WebSocket) => {
    const closeConnection = (myWs: WebSocket) => {
        sockets.splice(sockets.indexOf(myWs), 1);
    };
    ws.on('close', () => closeConnection(ws));
    ws.on('error', () => closeConnection(ws));
};

const HTTP_PORT = Number(process.env.HTTP_PORT) || 3001;
const P2P_PORT = Number(process.env.P2P_PORT) || 6001;

const app = express();

app.use(cors());
app.use(express.json());

app.get('/blocks', (req: Request, res: Response) => {
    res.send(zCoin.getChain());
});

app.post('/mineBlock', (req: Request, res: Response) => {
    const data = req.body.data || 'Default z-coin transaction';
    const newBlock = zCoin.generateNextBlock(data);
    broadcast(responseLatestMsg());
    res.send(newBlock);
});

app.get('/peers', (req: Request, res: Response) => {
    res.send(sockets.map((s: any) => `${s._socket.remoteAddress}:${s._socket.remotePort}`));
});

app.post('/addPeer', (req: Request, res: Response) => {
    connectToPeers(req.body.peer);
    res.send({ status: 'Peer connected' });
});

app.listen(HTTP_PORT, () => {
    console.log(`z-coin HTTP node running on port: ${HTTP_PORT}`);
});

initP2PServer(P2P_PORT);