const BigInt = require('big-integer');

const zero = BigInt(0);
const one = BigInt(1);
const two = BigInt(2);
const n256 = BigInt(256);
const n65537 = BigInt(65537);

export function encrypt (data, pubkey) {
    return genericCrypter(data, pubkey, n65537);
}

export function decrypt (data, pubkey, privkey) {
    console.assert(privkey.length === 32, "private key must consist of 32 bytes");
    let result = genericCrypter(data, pubkey, fromLittleEndian(privkey));

    //truncating tail of zeros
    let length = result.length;
    while (length >= 0 && result[length - 1] === 0) {
       length -= 1;
    }

    return result.subarray(0, length);
}

function genericCrypter (data, pubkey, exponent) {
    if (data.length > 32) {
        console.error("Encryption algorithm works only with messages of length <= 32 bytes")
    } else {
        console.assert(pubkey.length === 32, "public key must consist of 32 bytes");

        let base = fromLittleEndian(data);
        let modulus = fromLittleEndian(pubkey);
        let result = modularExponentiation(base, exponent, modulus);
        return toLittleEndian(result, data);
    }
}

function modularExponentiation (base, exponent, modulus) {
    let result = one;

    while (exponent.greater(zero)) {
        if (exponent.and(one).equals(one)) {
            result = result.multiply(base).mod(modulus);
        }
        base = base.square().mod(modulus);
        exponent = exponent.divide(two);
    }

    return result;
}

function fromLittleEndian (bytes) {
    let result = zero;
    let base = one;
    bytes.forEach(function (byte) {
        result = result.add(base.multiply(BigInt(byte)));
        base = base.multiply(n256);
    });
    return result;
}

function toLittleEndian (bigNumber) {
    let result = new Uint8Array(32);
    let i = 0;
    while (bigNumber.greater(zero)) {
        result[i] = bigNumber.mod(n256);
        bigNumber = bigNumber.divide(n256);
        i += 1;
    }
    return result;
}