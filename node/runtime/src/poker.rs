use crate::{cards, keys, naive_rsa};

use support::{decl_module, decl_storage, decl_event, StorageValue, StorageMap};
use support::dispatch::Result;
use support::traits::Currency;
use system::ensure_signed;

use rstd::prelude::*;

use core::debug_assert;
use runtime_io;

use runtime_primitives::traits::Hash;
use parity_codec::Encode;

pub trait Trait: system::Trait + balances::Trait {
	type Event: From<Event<Self>> + Into<<Self as system::Trait>::Event>;
}

decl_storage! {
	trait Store for Module<T: Trait> as Poker {
		///Maximum 2 players currently
		Dealer get(dealer): Option<T::AccountId>;
		Player get(player): Option<T::AccountId>;

		Keys get(keys): map T::AccountId => keys::PublicStorage;

		HandCards get(hand_cards): map T::AccountId => Vec<u8>;

		//Shared cards are stored as tuples: left side for encrypted
		//and right becomes non-empty after revealing left side
		FlopCards get(flop_cards): (Vec<u8>, Vec<u8>);
		TurnCards get(turn_cards): (Vec<u8>, Vec<u8>);
		RiverCards get(river_cards): (Vec<u8>, Vec<u8>);
	}
}

decl_module! {
	pub struct Module<T: Trait> for enum Call where origin: T::Origin {
		fn deposit_event<T>() = default;

		fn join_game(origin) -> Result {
			let who = ensure_signed(origin)?;

			let dealer = <Dealer<T>>::get();
			let player = <Player<T>>::get();
			if dealer.is_none() {
				debug_assert!(player.is_none()); //First player is always dealer
				runtime_io::print("Dealer joins the game, waiting for a player...");

				<Dealer<T>>::put(&who);
				Self::deposit_event(RawEvent::DealerJoined(who));
			} else if player.is_none() {
				runtime_io::print("Player joins the game! It's gonna be hot!");

				<Player<T>>::put(&who);
				Self::deposit_event(RawEvent::PlayerJoined(who));
			} else {
				runtime_io::print("Sorry man, no room.");
			}

			Ok(())
		}

		fn preflop(origin,
				hand_key: Vec<u8>,
				flop_key: Vec<u8>,
				turn_key: Vec<u8>,
				river_key: Vec<u8>) -> Result {
			//All keys are received in big-endian format
			let who = ensure_signed(origin)?;

			let keys = keys::PublicStorage {
				hand: hand_key,
				flop: flop_key,
				turn: turn_key,
				river: river_key
			};

			debug_assert!(keys.is_valid());

			if <Keys<T>>::get(&who).is_initialized() {
				Err("For current round the state is already initialized")
			} else {
				runtime_io::print("Registering participant's keys for this round");
				<Keys<T>>::insert(&who, &keys);

				let dealer = <Dealer<T>>::get().unwrap();
				let player = <Player<T>>::get().unwrap();

				let dealer_keys = <Keys<T>>::get(&dealer);
				let player_keys = <Keys<T>>::get(&player);

				if dealer_keys.is_initialized() && player_keys.is_initialized() {
					//Since we can't store the state of cards deck in (visible) blocks,
					//we have to deal all cards in one atomic transaction;
					//then we encrypt flop, turn and river with public keys of all participants
					//and we encrypt hand cards by public keys of corresponding player
					runtime_io::print("Dealing cards for this round");

					//This is fake random for my proof-of-concept;
					//in future, it has to be replaced with off-chain random generation
					//also it probably can be workarounded with sending a nonce from the player
					let seed = (<system::Module<T>>::random_seed(), &who, &dealer_keys, &player_keys)
						.using_encoded(<T as system::Trait>::Hashing::hash);

					let mut deck = (0..1024)
						.flat_map(|i| (seed, i).using_encoded(|x| x.to_vec())) //32 bytes
						.map(cards::from_random);

					let mut cards = vec![];
					while cards.len() < 12 {
						let card = deck.next().unwrap();
						if !cards.contains(&card) {
							cards.push(card);
						}
					}

					let player_cards = cards::encode(vec![&cards[0], &cards[2]]);
					let dealer_cards = cards::encode(vec![&cards[1], &cards[3]]);
					let flop_cards   = cards::encode(vec![&cards[5], &cards[6], &cards[7]]);
					let turn_cards   = cards::encode(vec![&cards[9]]);
					let river_cards  = cards::encode(vec![&cards[11]]);

					let player_cards = naive_rsa::encrypt(&player_cards[..], &player_keys.hand[..])?;
					<HandCards<T>>::insert(player, player_cards);

					let dealer_cards = naive_rsa::encrypt(&dealer_cards[..], &dealer_keys.hand[..])?;
					<HandCards<T>>::insert(dealer, dealer_cards);

					let flop_cards = naive_rsa::encrypt(&flop_cards[..], &player_keys.flop[..])?;
					let flop_cards = naive_rsa::encrypt(&flop_cards[..], &dealer_keys.flop[..])?;
					<FlopCards<T>>::put((flop_cards, vec![]));

					let turn_cards = naive_rsa::encrypt(&turn_cards[..], &player_keys.turn[..])?;
					let turn_cards = naive_rsa::encrypt(&turn_cards[..], &dealer_keys.turn[..])?;
					<TurnCards<T>>::put((turn_cards, vec![]));

					let river_cards = naive_rsa::encrypt(&river_cards[..], &player_keys.river[..])?;
					let river_cards = naive_rsa::encrypt(&river_cards[..], &dealer_keys.river[..])?;
					<RiverCards<T>>::put((river_cards, vec![]));

					Ok(())
				} else {
					runtime_io::print("Waiting for other participants to deal cards");
					Ok(())
				}
			}
		}
	}
}

decl_event!(
	pub enum Event<T> where AccountId = <T as system::Trait>::AccountId {
		DealerJoined(AccountId),
		PlayerJoined(AccountId),
	}
);
