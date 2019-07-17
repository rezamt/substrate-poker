use parity_codec::{Encode, Decode};
use rstd::prelude::*;

#[derive(Encode, Decode, Default, Clone)]
pub struct PublicStorage {
    pub hand: Vec<u8>,
    pub flop: Vec<u8>,
    pub turn: Vec<u8>,
    pub river: Vec<u8>
}

impl PublicStorage {

    pub fn is_initialized(&self) -> bool {
        !self.hand.is_empty() ||
        !self.flop.is_empty() ||
        !self.turn.is_empty() ||
        !self.river.is_empty()
    }

    pub fn is_valid(&self) -> bool {
        self.hand.len()  == 32 &&
        self.flop.len()  == 32 &&
        self.turn.len()  == 32 &&
        self.river.len() == 32
    }

}