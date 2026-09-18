import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import CryptoJS from 'crypto-js';
import cors from 'cors';

class Transaction {
    public id: string;
    public sender: string;
    public receiver: string;
    public amount: number;

    constructor(sender: string, receiver: string, amount: number) {
        this.sender = sender;
        this.receiver = receiver;
        this.amount = amount;
        this.id = CryptoJS.SHA256(sender + receiver + amount + Date.now()).toString();
    }
}

class Block {
    public index: number;
    public hash: string;
    public previousHash: string;
    public timestamp: number;
    public transactions: Transaction[];
    public difficulty: number;
    public nonce: number;

    constructor(
        index: number,
        hash: string,
        previousHash: string,
        timestamp: number,
        transactions: Transaction[],
        difficulty: number,
        nonce: number
    ) {
        this.index = index;
        this.previousHash = previousHash;
        this.timestamp = timestamp;
        this.transactions = transactions;
        this.hash = hash;
        this.difficulty = difficulty;
        this.nonce = nonce;
    }
}

const calculateHash = (
    index: number,
    previousHash: string,
    timestamp: number,
    transactions: Transaction[],
    difficulty: number,
    nonce: number
): string => {
    return CryptoJS.SHA256(index + previousHash + timestamp + JSON.stringify(transactions) + difficulty + nonce).toString();
};

const hashMatchesDifficulty = (hash: string, difficulty: number): boolean => {
    const requiredPrefix = '0'.repeat(difficulty);
    return hash.startsWith(requiredPrefix);
};

const findBlock = (
    index: number,
    previousHash: string,
    timestamp: number,
    transactions: Transaction[],
    difficulty: number
): Block => {
    let nonce = 0;
    while (true) {
        const hash = calculateHash(index, previousHash, timestamp, transactions, difficulty, nonce);
        if (hashMatchesDifficulty(hash, difficulty)) {
            return new Block(index, hash, previousHash, timestamp, transactions, difficulty, nonce);
        }
        nonce++;
    }
};

const getGenesisBlock = (): Block => {
    const timestamp = 1700000000;
    const difficulty = 2;
    const genesisTx = new Transaction("Network", "Genesis Miner", 50);
    const genesisHash = calculateHash(0, '0', timestamp, [genesisTx], difficulty, 0);
    return new Block(0, genesisHash, '0', timestamp, [genesisTx], difficulty, 0);
};

class Blockchain {
    private chain: Block[];
    private difficulty: number = 2;
    public mempool: Transaction[] = [];

    constructor() {
        this.chain = [getGenesisBlock()];
    }

    public getLatestBlock(): Block {
        return this.chain[this.chain.length - 1];
    }

    public addTransactionToMempool(tx: Transaction): boolean {
        this.mempool.push(tx);
        return true;
    }

    public generateNextBlock(minerAddress: string): Block {
        const previousBlock: Block = this.getLatestBlock();
        const nextIndex: number = previousBlock.index + 1;
        const nextTimestamp: number = Math.floor(Date.now() / 1000);

        // Coinbase reward transaction for miner
        const rewardTx = new Transaction("Network", minerAddress, 50);
        const blockTransactions = [rewardTx, ...this.mempool];

        const newBlock = findBlock(
            nextIndex,
            previousBlock.hash,
            nextTimestamp,
            blockTransactions,
            this.difficulty
        );

        this.chain.push(newBlock);
        this.mempool = []; // Clear mempool after mining
        return newBlock;
    }

    public getChain(): Block[] {
        return this.chain;
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
        if (latestBlockHeld.hash === latestBlockReceived.previousHash) {
            zCoin.getChain().push(latestBlockReceived);
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

const HTTP_PORT = Number(process.env.PORT) || Number(process.env.HTTP_PORT) || 3001;
const P2P_PORT = Number(process.env.P2P_PORT) || 6001;

const app = express();

app.use(cors({ origin: '*' })); // Cloud deployment ke liye flexible CORS
app.use(express.json());

app.get('/blocks', (req: Request, res: Response) => {
    res.send(zCoin.getChain());
});

app.get('/mempool', (req: Request, res: Response) => {
    res.send(zCoin.mempool);
});

app.post('/transact', (req: Request, res: Response) => {
    const { sender, receiver, amount } = req.body;
    if (!sender || !receiver || !amount) {
        return res.status(400).send({ error: 'Invalid transaction parameters' });
    }
    const tx = new Transaction(sender, receiver, Number(amount));
    zCoin.addTransactionToMempool(tx);
    res.send({ status: 'Transaction added to mempool', tx });
});

app.post('/mineBlock', (req: Request, res: Response) => {
    const minerAddress = req.body.minerAddress || 'Default Miner';
    const newBlock = zCoin.generateNextBlock(minerAddress);
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