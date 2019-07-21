use crate::stage::*;

use parity_codec::{Encode, Decode};
use rstd::prelude::*;

pub const KEY_SIZE: usize = 32;

#[derive(Encode, Decode, Default, Clone)]
pub struct PublicStorage {
    pub hand:  Vec<u8>,
    pub flop:  Vec<u8>,
    pub turn:  Vec<u8>,
    pub river: Vec<u8>
}

impl PublicStorage {

    pub fn is_initialized(&self) -> bool {
        !self.hand.is_empty() ||
        !self.flop.is_empty() ||
        !self.turn.is_empty() ||
        !self.river.is_empty()
    }

    pub fn retrieve(self, stage: StageId) -> Vec<u8> {
        match stage {
            FLOP => self.flop,
            TURN => self.turn,
            RIVER => self.river,

            _ => panic!("Illegal argument")
        }
    }

    pub fn is_valid(&self) -> bool {
        self.hand.len()  == KEY_SIZE &&
        self.flop.len()  == KEY_SIZE &&
        self.turn.len()  == KEY_SIZE &&
        self.river.len() == KEY_SIZE
    }

}

#[derive(Encode, Decode, Default, Clone)]
pub struct RevealedSecrets {
    pub hand:  Option<Vec<u8>>,
    pub flop:  Option<Vec<u8>>,
    pub turn:  Option<Vec<u8>>,
    pub river: Option<Vec<u8>>
}

impl RevealedSecrets {

    pub fn retrieve(self, stage: StageId) -> Option<Vec<u8>> {
        match stage {
            FLOP  => self.flop,
            TURN  => self.turn,
            RIVER => self.river,

            _ => panic!("Illegal argument")
        }
    }

    pub fn submit(&mut self, stage: StageId, secret: Vec<u8>) {
        match stage {
            FLOP  => self.flop  = Some(secret),
            TURN  => self.turn  = Some(secret),
            RIVER => self.river = Some(secret),

            _ => panic!("Illegal argument")
        }
    }

    pub fn is_valid(&self) -> bool {
        vec![&self.hand, &self.flop, &self.turn, &self.river].iter()
            .all(|secret| {
                secret.as_ref()
                    .map(|s| s.len() == KEY_SIZE)
                    .unwrap_or(true)
            })
    }

}