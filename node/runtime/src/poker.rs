use support::{decl_module, decl_storage, decl_event, StorageValue, StorageMap};
use support::dispatch::Result;
use support::traits::Currency;
use system::ensure_signed;

use rstd::prelude::*;

use core::debug_assert;
use runtime_io;

use crate::cards::*;
use crate::naive_rsa::*;

pub trait Trait: system::Trait + balances::Trait {
	type Event: From<Event<Self>> + Into<<Self as system::Trait>::Event>;
}

decl_storage! {
	trait Store for Module<T: Trait> as Poker {
		///Maximum 2 players currently
		Dealer get(dealer): Option<T::AccountId>;
		Player get(player): Option<T::AccountId>;

		HandKeys get(hand_keys): map T::AccountId => Vec<u8>;
		HandCards get(hand_cards): map T::AccountId => Vec<u8>;
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
				debug_assert!(player.is_none()); //1st player is always dealer
				runtime_io::print("Dealer joins the game, waiting for a player...");

				<Dealer<T>>::put(who.clone());
				Self::deposit_event(RawEvent::DealerJoined(who));
			} else if player.is_none() {
				runtime_io::print("Player joins the game! It's gonna be hot!");

				<Player<T>>::put(who.clone());
				Self::deposit_event(RawEvent::PlayerJoined(who));
			} else {
				runtime_io::print("Sorry man, no room.");
			}

			Ok(())
		}

		fn deal_hand(origin, key: Vec<u8>) -> Result {
			let who = ensure_signed(origin)?;
			debug_assert!(key.len() == 32);

			if !<HandKeys<T>>::get(who.clone()).is_empty() ||
			   !<HandCards<T>>::get(who.clone()).is_empty() {
			    Err("For current hand the state is already initialized")
			} else {
				//keys received have big-endian order of bytes
				let mut key = key.clone();
				key.reverse();

				<HandKeys<T>>::insert(who.clone(), key.clone());

				runtime_io::print("Dealing cards for a player");

				let card1 = Card { nominal: A, suit: SPADES };
				let card2 = Card { nominal: 10, suit: CLUBS };

				let cards = encode(&vec![card1, card2][..]);

				match encrypt(&cards[..],&key[..]) {
					Ok(cards) => {
						<HandCards<T>>::insert(who, cards);
						Ok(())
					},
					Err(msg) => Err(msg),
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
