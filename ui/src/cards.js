const J = 11;
const Q = 12;
const K = 13;
const A = 1;

const HEARTS   = 2;
const CLUBS    = 3;
const DIAMONDS = 4;
const SPADES   = 1;

export function decode (bytes) {
    let n = bytes.length;
    console.assert(n % 2 === 0);

    return [...Array(n / 2).keys()]
        .map(i => {
            let nominal = decodeNominal(bytes[i * 2]);
            let suit = decodeSuit(bytes[i * 2 + 1]);
            return `${nominal} of ${suit}`;
        })
        .join(" & ");
}

function decodeNominal (byte) {
    console.assert(byte <= 13);
    if (byte === J) { return "Jack"; }
    if (byte === Q) { return "Queen"; }
    if (byte === K) { return "King"; }
    if (byte === A) { return "Ace"; }
    return byte.toString();
}

function decodeSuit (byte) {
    if (byte === HEARTS)   { return "Hearts"; }
    if (byte === CLUBS)    { return "Clubs"; }
    if (byte === DIAMONDS) { return "Diamons"; }
    if (byte === SPADES)   { return "Spades"; }
}