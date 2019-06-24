use rstd::prelude::*;
use core::debug_assert;

pub type Nominal = u8;

pub const J: Nominal = 11;
pub const Q: Nominal = 12;
pub const K: Nominal = 13;
pub const A: Nominal = 14;

pub type Suit = u8;

pub const HEARTS:   Suit = 0;
pub const CLUBS:    Suit = 1;
pub const DIAMONDS: Suit = 2;
pub const SPADES:   Suit = 3;

pub struct Card {
    pub nominal: Nominal,
    pub suit: Nominal
}

pub fn encode(cards: &[Card]) -> Vec<u8> {
    cards.iter()
        .map(|c| {
            debug_assert!(c.nominal >= 2 && c.nominal <= A);
            debug_assert!(c.suit <= SPADES);
            vec![c.nominal, c.suit]
        })
        .flatten()
        .collect()
}