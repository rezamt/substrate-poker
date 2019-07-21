import React from 'react';

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
    console.assert(n % 2 === 0,
        "Cards must be encoded with even number of bytes");

    return [...Array(n / 2).keys()]
        .map(i => { return {
            nominal: bytes[i * 2],
            suit: bytes[i * 2 + 1]
        }});
}

export function hidden () {
    return 'cards/back/bicycle_blue_mod.svg';
}

export function image (card) {
    return `cards/${suit(card.suit)}/${nominal(card.nominal)}.svg`;
}

function nominal (byte) {
    console.assert(byte <= 13,
        "Nominal cannot be encoded with number greater that 13");

    if (byte === J) { return "J"; }
    if (byte === Q) { return "Q"; }
    if (byte === K) { return "K"; }
    if (byte === A) { return "A"; }
    return byte.toString();
}

function suit (byte) {
    if (byte === HEARTS)   { return "hearts"; }
    if (byte === CLUBS)    { return "clubs"; }
    if (byte === DIAMONDS) { return "diamonds"; }
    if (byte === SPADES)   { return "spades"; }
}