import { U256 } from '@polkadot/types';

export function decode(bytes) {
    return "Almost...";
}

export function decrypt(data, modulus, exponent) {
    console.assert(modulus.length === 32, "modulus must consist of 32 bytes");
    console.assert(exponent.length === 32, "exponent must consist of 32 bytes");
    console.assert(data.length === 32, "encrypted message must consist of 32 bytes");

    console.log(`||| MODULUS: ${Buffer.from(modulus).toString('hex')}`);
    console.log(`||| EXPONENT: ${Buffer.from(exponent).toString('hex')}`);
    console.log(`||| DATA: ${Buffer.from(data).toString('hex')}`);
    return data; //Uint8Array
}