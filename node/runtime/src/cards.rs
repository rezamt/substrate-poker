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

#[derive(PartialEq, Eq, Debug)]
pub struct Card {
    pub nominal: Nominal,
    pub suit: Suit
}

impl Card {
    pub fn validate(&self) -> bool {
        debug_assert!(self.nominal >= 1 && self.nominal <= 13);
        debug_assert!(self.suit >= 1 && self.suit <= 4);

        self.nominal >= 1 && self.nominal <= 13
            && self.suit >= 1 && self.suit <= 4
    }
}

pub fn hearts(n: Nominal) -> Card {
    Card { nominal: n, suit: HEARTS }
}

pub fn clubs(n: Nominal) -> Card {
    Card { nominal: n, suit: CLUBS }
}

pub fn diamonds(n: Nominal) -> Card {
    Card { nominal: n, suit: DIAMONDS }
}

pub fn spades(n: Nominal) -> Card {
    Card { nominal: n, suit: SPADES }
}

pub fn encode(cards: &[Card]) -> Vec<u8> {
    cards.iter()
        .map(|card| {
            card.validate();
            vec![card.nominal, card.suit]
        })
        .flatten()
        .collect()
}

//a bit unfair random generation, see the test
pub fn from_random(bytes: &[u8]) -> Card {
    let card = Card {
        nominal: bytes[0] % 13 + 1,
        suit: bytes[1] % 4 + 1,
    };

    card.validate();
    card
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn generate_from_random() {
        assert!(from_random(&[1, 0]) == spades(2));
        assert!(from_random(&[14, 0]) == spades(2));
        assert!(from_random(&[142, 6]) == clubs(K));

        assert!(from_random(&[0, 7]) == diamonds(A));
        assert!(from_random(&[247, 7]) == diamonds(A));
        assert!(from_random(&[248, 7]) == diamonds(2));
        assert!(from_random(&[255, 7]) == diamonds(9));
        //this means that 10, J, Q, K are less frequent

        assert!(from_random(&[255, 0]) == spades(9));
        assert!(from_random(&[255, 252]) == spades(9));
        assert!(from_random(&[255, 253]) == hearts(9));
        assert!(from_random(&[255, 254]) == clubs(9));
        assert!(from_random(&[255, 255]) == diamonds(9));
        //for suits, it is fair
    }
}