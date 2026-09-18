import CryptoJS from 'crypto-js';
import elliptic from 'elliptic';

const EC = elliptic.ec;
const ec = new EC('secp256k1');

export class UnspentTxOut {
    public readonly txOutId: string;
    public readonly txOutIndex: number;
    public readonly address: string;
    public readonly amount: number;

    constructor(txOutId: string, txOutIndex: number, address: string, amount: number) {
        this.txOutId = txOutId;
        this.txOutIndex = txOutIndex;
        this.address = address;
        this.amount = amount;
    }
}

export class TxIn {
    public txOutId: string;
    public txOutIndex: number;
    public signature: string;
}

export class TxOut {
    public address: string;
    public amount: number;

    constructor(address: string, amount: number) {
        this.address = address;
        this.amount = amount;
    }
}

export class Transaction {
    public id: string;
    public txIns: TxIn[];
    public txOuts: TxOut[];
}

export const getTransactionId = (transaction: Transaction): string => {
    const txInContent: string = transaction.txIns
        .map((txIn: TxIn) => txIn.txOutId + txIn.txOutIndex)
        .reduce((a: string, b: string) => a + b, '');

    const txOutContent: string = transaction.txOuts
        .map((txOut: TxOut) => txOut.address + txOut.amount)
        .reduce((a: string, b: string) => a + b, '');

    return CryptoJS.SHA256(txInContent + txOutContent).toString();
};

const toHexString = (byteArray: number[]): string => {
    return Array.from(byteArray, (byte: number) => {
        return ('0' + (byte & 0xff).toString(16)).slice(-2);
    }).join('');
};

export const signTxIn = (
    transaction: Transaction,
    txInIndex: number,
    privateKey: string,
    unspentTxOuts: UnspentTxOut[]
): string => {
    const txIn: TxIn = transaction.txIns[txInIndex];
    const dataToSign = transaction.id;
    const key = ec.keyFromPrivate(privateKey, 'hex');
    const signature: string = toHexString(key.sign(dataToSign).toDER());
    return signature;
};

export const generatePrivateKey = (): string => {
    const keyPair = ec.genKeyPair();
    return keyPair.getPrivate('hex');
};

export const getPublicKey = (privateKey: string): string => {
    return ec.keyFromPrivate(privateKey, 'hex').getPublic('hex');
};

const myPrivateKey = generatePrivateKey();
const myPublicKey = getPublicKey(myPrivateKey);

console.log('Private Key (Keep Secret):', myPrivateKey);
console.log('Public Key / Address:', myPublicKey);