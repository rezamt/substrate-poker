use support::{decl_module, decl_storage, decl_event, StorageValue};
use support::dispatch::Result;
use support::traits::Currency;
use system::ensure_signed;

use core::debug_assert;

use runtime_io;

pub trait Trait: system::Trait + balances::Trait {
	type Event: From<Event<Self>> + Into<<Self as system::Trait>::Event>;
}

decl_storage! {
	trait Store for Module<T: Trait> as Poker {
		//maximum 2 players currently
		Dealer get(dealer): Option<T::AccountId>;
		Player get(player): Option<T::AccountId>;
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
	}
}

decl_event!(
	pub enum Event<T> where AccountId = <T as system::Trait>::AccountId {
		DealerJoined(AccountId),
		PlayerJoined(AccountId),
	}
);

/// tests for this module
#[cfg(test)]
mod tests {
	use super::*;

	use runtime_io::with_externalities;
	use primitives::{H256, Blake2Hasher};
	use support::{impl_outer_origin, assert_ok};
	use runtime_primitives::{
		BuildStorage,
		traits::{BlakeTwo256, IdentityLookup},
		testing::{Digest, DigestItem, Header}
	};

	impl_outer_origin! {
		pub enum Origin for Test {}
	}

	// For testing the module, we construct most of a mock runtime. This means
	// first constructing a configuration type (`Test`) which `impl`s each of the
	// configuration traits of modules we want to use.
	#[derive(Clone, Eq, PartialEq)]
	pub struct Test;
	impl system::Trait for Test {
		type Origin = Origin;
		type Index = u64;
		type BlockNumber = u64;
		type Hash = H256;
		type Hashing = BlakeTwo256;
		type Digest = Digest;
		type AccountId = u64;
		type Lookup = IdentityLookup<Self::AccountId>;
		type Header = Header;
		type Event = ();
		type Log = DigestItem;
	}
	impl Trait for Test {
		type Event = ();
	}
	type TemplateModule = Module<Test>;

	// This function basically just builds a genesis storage key/value store according to
	// our desired mockup.
	fn new_test_ext() -> runtime_io::TestExternalities<Blake2Hasher> {
		system::GenesisConfig::<Test>::default().build_storage().unwrap().0.into()
	}

	#[test]
	fn it_works_for_default_value() {
		with_externalities(&mut new_test_ext(), || {
			// Just a dummy test for the dummy funtion `do_something`
			// calling the `do_something` function with a value 42
			assert_ok!(TemplateModule::do_something(Origin::signed(1), 42));
			// asserting that the stored value is equal to what we stored
			assert_eq!(TemplateModule::something(), Some(42));
		});
	}
}
