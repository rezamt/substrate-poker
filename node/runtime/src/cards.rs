use rstd::prelude::*;
use core::debug_assert;

pub type Nominal = u8;

pub const J: Nominal = 11;
pub const Q: Nominal = 12;
pub const K: Nominal = 13;
pub const A: Nominal = 1;

pub type Suit = u8;

pub const HEARTS:   Suit = 2;
pub const CLUBS:    Suit = 3;
pub const DIAMONDS: Suit = 4;
pub const SPADES:   Suit = 1;

pub struct Card {
    pub nominal: Nominal,
    pub suit: Nominal
}

pub fn encode(cards: &[Card]) -> Vec<u8> {
    cards.iter()
        .map(|c| {
            debug_assert!(c.nominal >= 1 && c.nominal <= 13);
            debug_assert!(c.suit >= 1 && c.suit <= 4);
            vec![c.nominal, c.suit]
        })
        .flatten()
        .collect()
}