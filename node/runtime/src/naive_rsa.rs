///NAIVE IMPLEMENTATION, ONLY FOR PROOF-OF-CONCEPT

///This is simplified, vulnerable implementation of RSA, and also encryption in Runtime
///should be avoided due to performance reasons and non-deterministic nature.
///After work on "off-chain workers" finished, this will be removed.

use primitives::U256;
use rstd::prelude::*;

pub fn encrypt(data: &[u8], key: &[u8]) -> Vec<u8> {
    let exp: u32 = 65537;
    data.to_vec()
}