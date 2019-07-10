///NAIVE IMPLEMENTATION, ONLY FOR PROOF-OF-CONCEPT

///This is simplified, vulnerable implementation of RSA, and also encryption in Runtime
///should be avoided due to performance reasons and non-deterministic nature.
///After work on "off-chain workers" finished, this will be removed.

/// This implementation is adapted version of https://github.com/getreu/rustlang-play-rsa

use core::str;
use core::convert::TryFrom;

use rstd::result;
use rstd::prelude::*;
use primitives::U256;

type Result = result::Result<Vec<u8>, &'static str>;

pub fn encrypt(data: &[u8], pubkey: &[u8]) -> Result {
    let exponent: U256 = U256::from(65537);
    generic_crypter(data, pubkey, exponent)
}

fn generic_crypter(data: &[u8], pubkey: &[u8], exponent: U256) -> Result {
    if data.len() > 32 {
        Err("Encryption algorithm works only with messages of length <= 32 bytes")
    } else {
        let modulus: U256 = U256::from_little_endian(pubkey);
        let base: U256 = U256::from_little_endian(data);

        let result = modular_exponentiation(base, exponent, modulus);

        let mut bytes = vec![0;32];
        U256::to_little_endian(&result, &mut bytes);
        Ok(bytes)
    }
}

fn modular_exponentiation(mut base: U256, mut exponent: U256, modulus: U256) -> U256 {
    let mut result = U256::one();

    while exponent > U256::zero() {
        if (exponent & U256::one()) == U256::one() {
            result = U256::try_from(result.full_mul(base) % modulus).unwrap();
        }
        base = U256::try_from(base.full_mul(base) % modulus).unwrap();

        exponent = exponent >> 1;
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    //public modulus
    const PUBLIC_KEY: [u8; 32] = [159, 152, 51, 63, 56, 236, 171, 124, 45, 135, 54, 162, 205, 236, 198, 245, 19, 46, 53, 100, 118, 84, 91, 52, 154, 205, 76, 225, 199, 53, 134, 136];

    //private exponent
    const PRIVATE_KEY: [u8; 32] = [25, 179, 118, 205, 152, 40, 219, 84, 40, 144, 120, 121, 145, 37, 130, 26, 36, 45, 66, 62, 172, 151, 163, 62, 196, 188, 207, 172, 93, 93, 87, 81];

    #[test]
    fn composition_is_identity() {
        let message: &[u8] = "Don't tell anybody.".as_bytes();
        let encrypted = encrypt(message, &PUBLIC_KEY).unwrap();
        let decrypted = decrypt(&encrypted, &PUBLIC_KEY, &PRIVATE_KEY).unwrap();
        assert!(decrypted == message);
    }

    fn decrypt(data: &[u8], pubkey: &[u8], privkey: &[u8]) -> Result {
        let exponent: U256 = U256::from_little_endian(privkey);
        generic_crypter(data, pubkey, exponent)
            .map(|mut bytes: Vec<u8>| {
                let mut end = bytes.len() - 1;
                while end >= 0 && bytes[end] == 0 {
                    end -= 1;
                }
                bytes.truncate(end + 1);
                bytes
            })
    }
}