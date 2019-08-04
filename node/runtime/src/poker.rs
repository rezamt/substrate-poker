use crate::{naive_rsa, stage, cards, keys};

use support::{decl_module, decl_storage, decl_event, StorageValue, StorageMap};
use support::traits::{Currency, WithdrawReason, ExistenceRequirement};
use support::dispatch::Result;
use system::ensure_signed;

use rstd::prelude::*;

use core::debug_assert;

use runtime_primitives::traits::Hash;
use runtime_primitives::traits::As;
use parity_codec::Encode;

pub trait Trait: system::Trait + balances::Trait {
	type Event: From<Event<Self>> + Into<<Self as system::Trait>::Event>;
}

decl_storage! {
	trait Store for Module<T: Trait> as Poker {
		///Minimal amount to bet (small and big "blinds")
		Blinds get(blinds): (T::Balance, T::Balance);

		///Maximum 2 players currently
		Dealer get(dealer): Option<T::AccountId>;
		Player get(player): Option<T::AccountId>;

		///`Idle` when game is finished or not started,
		///and `Preflop`,`Flop`,`Turn` or `River` when it is in progress
		Stage get(stage): u32;

		///Chips which are fixed after betting round and withdrawn from participants' stacks
		Pot get(pot): T::Balance;
		///Current bets of participants, can change until they are equal
		Bets get(bets): map T::AccountId => T::Balance;
		///Game balances of participants
		Stacks get(stacks): map T::AccountId => T::Balance;

		///Indicator of a participant who's turn to bet;
		///if it is `None`, that means we are waiting for the keys for next stage
		BetsNow get(bets_now): Option<T::AccountId>;

		///Current maximum bet, other players must "call" or "raise" it, or fold cards
		BetLevel get(bet_level): Option<T::Balance>;

		///This field is Some, when a game is over
		Winner get(winner): Option<T::AccountId>;

		///Key pairs generated by each participant,
		///secret parts are revealed in certain moments,
		///unlocking stages of the game or revealing cards
		Keys get(keys): map T::AccountId => keys::PublicStorage;
		Secrets get(secrets): map T::AccountId => keys::RevealedSecrets;

		///Cards which are shared among participants
		SharedCards get(shared_cards): Vec<u8>;

		///Cards "in the pocket", private and non-visible before showdown
		PocketCards get(pocket_cards): map T::AccountId => Vec<u8>;

		///Cards "in the pocket" which have been revealed by their owner
		OpenCards get(open_cards): map T::AccountId => Vec<u8>;

		///Shared cards are hidden and revealed by-stage when all
		///players submit their secret keys for corresponding stages
		FlopCards get(flop_cards): Vec<u8>;
		TurnCards get(turn_cards): Vec<u8>;
		RiverCards get(river_cards): Vec<u8>;
	}
}

decl_module! {
	pub struct Module<T: Trait> for enum Call where origin: T::Origin {
		fn deposit_event<T>() = default;

		fn create_game(origin, buy_in: T::Balance, big_blind: T::Balance) -> Result {
			let who = ensure_signed(origin)?;

			let dealer = Self::dealer();
			let player = Self::player();

			if dealer.is_some() || player.is_some() {
				return Self::error(who, "The game is already created, probably you can join.");
			}
			if buy_in < big_blind {
				return Self::error(who, "Choose smaller blinds.");
			}

			Self::announce("Dealer joins the game, waiting for a player...");
			<Dealer<T>>::put(&who);

			let small_blind = big_blind / T::Balance::sa(2);
			<Blinds<T>>::put((small_blind, big_blind));

			Self::refill_chips(who, buy_in)
		}

		fn join_game(origin, buy_in: T::Balance) -> Result {
			let who = ensure_signed(origin)?;

			let dealer = Self::dealer();
			let player = Self::player();

			if dealer.is_none() {
				return Self::error(who, "There is nobody so far, you are free to set up the game.");
			}
			if player.is_some() {
				return Self::error(who, "Sorry man, no room.");
			}
			let (_, minimal_amount) = Self::blinds();
			if buy_in < minimal_amount {
				return Self::error(who, "Get some money first...");
			}

			<Player<T>>::put(&who);
			Self::announce("Player joins the game! It's gonna be hot!");

			Self::refill_chips(who, buy_in)
		}

		fn leave_game_anyway(origin) -> Result {
			let who = ensure_signed(origin)?;
			if Self::stage() != stage::IDLE && Self::stage() != stage::SHOWDOWN {
				Self::perform_fold(who.clone())?;
			}
			Self::remove_participant(who)
		}

		fn leave_game(origin) -> Result {
			let who = ensure_signed(origin)?;
			if Self::stage() != stage::IDLE {
				return Self::error(who, "Can't quit while the game is in progress");
			}

			//for the case when we made a blind bet,
			//but other player haven't yet
			Self::reset_idle(&who);

			Self::remove_participant(who)
		}

		fn preflop(origin,
				hand_key: Vec<u8>,
				flop_key: Vec<u8>,
				turn_key: Vec<u8>,
				river_key: Vec<u8>) -> Result {
			let who = ensure_signed(origin)?;

			if Self::keys(&who).is_initialized() {
				Self::error(who, "For current round, preflop stage is already initialized")
			} else {
				Self::info(who.clone(), "Registering participant's keys for preflop stage");

				//All keys are received in big-endian format
				let keys = keys::PublicStorage {
					hand: hand_key,
					flop: flop_key,
					turn: turn_key,
					river: river_key
				};

				debug_assert!(keys.is_valid());
				<Keys<T>>::insert(&who, &keys);

				let dealer = Self::dealer().unwrap();
				let player = Self::player().unwrap();

				let dealer_keys = Self::keys(&dealer);
				let player_keys = Self::keys(&player);

				if dealer_keys.is_initialized() && player_keys.is_initialized() {
					//Since we can't store the state of cards deck in (visible) blocks,
					//we have to deal all cards in one atomic transaction;
					//then we encrypt flop, turn and river with public keys of all participants
					//and we encrypt hand cards by public keys of corresponding player
					Self::info_all("Dealing cards for this round");

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
					<PocketCards<T>>::insert(&player, player_cards);

					let dealer_cards = naive_rsa::encrypt(&dealer_cards[..], &dealer_keys.hand[..])?;
					<PocketCards<T>>::insert(&dealer, dealer_cards);

					let flop_cards = naive_rsa::encrypt(&flop_cards[..], &player_keys.flop[..])?;
					let flop_cards = naive_rsa::encrypt(&flop_cards[..], &dealer_keys.flop[..])?;
					<FlopCards<T>>::put(flop_cards);

					let turn_cards = naive_rsa::encrypt(&turn_cards[..], &player_keys.turn[..])?;
					let turn_cards = naive_rsa::encrypt(&turn_cards[..], &dealer_keys.turn[..])?;
					<TurnCards<T>>::put(turn_cards);

					let river_cards = naive_rsa::encrypt(&river_cards[..], &player_keys.river[..])?;
					let river_cards = naive_rsa::encrypt(&river_cards[..], &dealer_keys.river[..])?;
					<RiverCards<T>>::put(river_cards);

					<Winner<T>>::kill();
					<Stage<T>>::put(stage::PREFLOP);
					<BetsNow<T>>::put(&dealer);
				} else {
					Self::info(who.clone(), "Waiting for other participants to deal hand cards");
				}

				let (small_blind, big_blind) = Self::blinds();
				<BetLevel<T>>::put(big_blind.clone());

				let blind_bet = if &who == &dealer {
					small_blind
				} else {
					big_blind
				};

				<Bets<T>>::insert(&who, blind_bet);
				Ok(())
			}
		}

		fn check(origin) -> Result {
			let who = ensure_signed(origin)?;
			if !Self::makes_bet_now(&who) {
				return Self::error(who, "Wait for your turn, please.");
			}

			let level = Self::bet_level();
			if let Some(current) = level {
				if current > Self::zero() {
					return Self::error(who, "There is already a bet, you can't check.");
				}
			}

			Self::perform_check(who, level.is_none())
		}

		fn call(origin) -> Result {
			let who = ensure_signed(origin)?;
			if !Self::makes_bet_now(&who) {
				return Self::error(who, "Wait for your turn, please.");
			}

			let level = Self::bet_level();
			if level.is_none() || level == Some(Self::zero()) {
				Self::perform_check(who, level.is_none())
			} else {
				let level = level.unwrap();
				let stack = Self::stacks(&who);
				if stack <= level {
					<Bets<T>>::insert(&who, stack);
					Self::deposit_event(RawEvent::AllIn(who));

					//since there are only 2 participants, all-in means end of bets
					<BetsNow<T>>::kill();
				}  else {
					<Bets<T>>::insert(&who, level);
					Self::deposit_event(RawEvent::Call(who.clone()));

					//previous move was either raise or big blind
					if Self::is_option_available(&who, level) {
						<BetsNow<T>>::put(Self::opponent(&who));
					} else {
						<BetsNow<T>>::kill();
					}
				}

				Ok(())
			}
		}

		fn raise(origin, total: T::Balance) -> Result {
			let who = ensure_signed(origin)?;
			if !Self::makes_bet_now(&who) {
				return Self::error(who, "Wait for your turn, please.");
			}

			let stack = Self::stacks(&who);
			if total < stack {
				return Self::error(who, "You don't have enough chips for such a raise.");
			}

			let level = Self::bet_level().unwrap_or(Self::zero());
			if total <= level {
				return Self::error(who, "Raise must be more than the current bet (even if you go all-in).");
			}

			if total == stack {
				Self::deposit_event(RawEvent::AllIn(who.clone()));
			} else {
				if total < level * T::Balance::sa(2) {
					return Self::error(who, "Raise must be at least doubling the current bet.");
				}

				let diff = total - level;
				let (_, big_blind) = Self::blinds();
				if diff < big_blind {
					return Self::error(who, "Raise must be at least equal to big blind.");
				}

				Self::deposit_event(RawEvent::Raise(who.clone(), diff));
			}

			<BetLevel<T>>::put(total);
			<Bets<T>>::insert(&who, total);
			<BetsNow<T>>::put(Self::opponent(&who));
			Ok(())
		}

		fn next_stage(origin, stage_secret: Vec<u8>) -> Result {
			let who = ensure_signed(origin)?;

			let stage = Self::stage() + 1;
			if stage == stage::SHOWDOWN {
				//Current stage is the last, revealing hand cards
				return Self::reveal_hand(who, stage_secret);
			}

			if Self::secrets(&who).retrieve(stage).is_some() {
				Self::error(who, "The next stage is already initialized for this player")
			} else {
				Self::info(who.clone(), "Registering participant's keys for the next stage");

				<Secrets<T>>::mutate(&who, |secrets| {
					(*secrets).submit(stage, stage_secret);
					debug_assert!(secrets.is_valid());
				});

				let dealer = Self::dealer().unwrap();
				let player = Self::player().unwrap();

				let dealer_secret = Self::secrets(&dealer).retrieve(stage);
				let player_secret = Self::secrets(&player).retrieve(stage);

				if dealer_secret.is_some() && player_secret.is_some() {
					Self::info_all("Revealing cards of the next stage");
					let dealer_secret = dealer_secret.unwrap();
					let player_secret = player_secret.unwrap();

					let dealer_key = Self::keys(&dealer).retrieve(stage);
					let player_key = Self::keys(&player).retrieve(stage);

					let hidden = match stage {
						stage::FLOP  => Self::flop_cards(),
						stage::TURN  => Self::turn_cards(),
						stage::RIVER => Self::river_cards(),

						_ => unreachable!()
					};

					let revealed = naive_rsa::decrypt(&hidden, &dealer_key[..], &dealer_secret[..])?;
					let mut revealed = naive_rsa::decrypt(&revealed, &player_key[..], &player_secret[..])?;

					if !cards::decode(&revealed[..]).into_iter().all(|card| card.is_valid()) {
						return Self::error_all("Critical error: decrypted cards are invalid");
					}

					<SharedCards<T>>::mutate(|v| v.append(&mut revealed));

					<BetsNow<T>>::put(&player);
					<Stage<T>>::put(stage);
					Ok(())
				} else {
					//Technically, if we use commutative encryption, then we can
					//remove one layer of encryption after each player submits his secret
					//for current stage. Also we can do it in current implementation
					//after receiving dealer's secret (because his secret is last of applied),
					//but for simplicity we wait for all in PoC
					Self::info(who, "Waiting for other participants to deal next stage");
					Ok(())
				}
			}
		}

		fn fold(origin) -> Result {
			let who = ensure_signed(origin)?;
			Self::perform_fold(who)
		}
	}
}


decl_event!(
	pub enum Event<T> where AccountId = <T as system::Trait>::AccountId,
							Balance = <T as balances::Trait>::Balance {
		///Auxiliary events; they are redundant and not necessary,
		///but provide better user experience
		Announcement(Vec<u8>),
		InfoMessage(Option<AccountId>, Vec<u8>),
		ErrorMessage(Option<AccountId>, Vec<u8>),

		NewParticipant(AccountId, Balance),
		NewDealer(AccountId),
		ParticipantLeft(AccountId),

		Call(AccountId),
		Check(AccountId),
		Raise(AccountId, Balance),
		AllIn(AccountId),
		Fold(AccountId),
	}
);

impl<T: Trait> Module<T> {

	fn refill_chips(who: T::AccountId, buy_in: T::Balance) -> Result {
		let _ = <balances::Module<T> as Currency<_>>::withdraw(
			&who, buy_in, WithdrawReason::Transfer,
			ExistenceRequirement::KeepAlive)?;

		<Stacks<T>>::insert(&who, &buy_in);
		Self::deposit_event(RawEvent::NewParticipant(who, buy_in));
		Ok(())
	}

	fn reveal_hand(who: T::AccountId, hand_secret: Vec<u8>) -> Result {
		Self::announce("Revealing pocket cards");

		let hand_key  = Self::keys(&who).hand;
		let encrypted = Self::pocket_cards(&who);
		let decrypted = naive_rsa::decrypt(&encrypted, &hand_key[..], &hand_secret[..])?;

		<OpenCards<T>>::insert(&who, decrypted);
		<Stage<T>>::put(stage::SHOWDOWN);
		Ok(())
	}

	fn perform_check(who: T::AccountId, first_check: bool) -> Result {
		if first_check {
			<BetsNow<T>>::put(Self::opponent(&who));
		} else {
			//since there are only 2 participants, we are last who checks
			<BetsNow<T>>::kill();
		}

		Self::deposit_event(RawEvent::Check(who));
		Ok(())
	}

	fn perform_fold(who: T::AccountId) -> Result {
		let dealer = Self::dealer().unwrap();
		let player = Self::player().unwrap();

		let prize = Self::calculate_pot();

		let winner = if who == dealer { player } else { dealer };
		{
			let prize = prize.clone();
			<Stacks<T>>::mutate(&winner, move |v| *v += prize);
		}

		Self::deposit_event(RawEvent::Fold(who));
		Self::reset_round();
		Ok(())
	}

	fn remove_participant(who: T::AccountId) -> Result {
		//This version is for 2 participants maximum;
		//and no game can contain only a player without a dealer,
		//so either we remove the player, or replace the dealer
		let player = Self::player();
		let target = Some(who.clone());

		let stack = <Stacks<T>>::take(&who);
		let _ = <balances::Module<T> as Currency<_>>::deposit_into_existing(&who, stack)?;

		if player != target {
			if Self::dealer() != target {
				return Self::error(who, "The account is not a participant of this game");
			}
			if let Some(player) = player {
				Self::deposit_event(RawEvent::NewDealer(player.clone()));
				<Dealer<T>>::put(player);
			} else {
				<Dealer<T>>::kill();
			};
		}
		<Player<T>>::kill();

		Self::deposit_event(RawEvent::ParticipantLeft(who));

		Ok(())
	}

	fn error(who: T::AccountId, message: &'static str) -> Result {
		let bytes = message.as_bytes().to_vec();
		Self::deposit_event(RawEvent::ErrorMessage(Some(who), bytes));
		Err(message)
	}

	fn info(who: T::AccountId, message: &'static str) {
		let bytes = message.as_bytes().to_vec();
		Self::deposit_event(RawEvent::InfoMessage(Some(who), bytes));
	}

	fn error_all(message: &'static str) -> Result {
		let bytes = message.as_bytes().to_vec();
		Self::deposit_event(RawEvent::ErrorMessage(None, bytes));
		Err(message)
	}

	fn info_all(message: &'static str) {
		let bytes = message.as_bytes().to_vec();
		Self::deposit_event(RawEvent::InfoMessage(None, bytes));
	}

	fn announce(message: &'static str) {
		let bytes = message.as_bytes().to_vec();
		Self::deposit_event(RawEvent::Announcement(bytes));
	}

	///Auxiliary functions

	fn zero() -> T::Balance {
		T::Balance::sa(0)
	}

	fn opponent(who: &T::AccountId) -> T::AccountId {
		let dealer = Self::dealer().unwrap();

		if &dealer == who {
			Self::player().unwrap()
		} else {
			dealer
		}
	}

	fn calculate_pot() -> T::Balance {
		let dealer = Self::dealer().unwrap();
		let player = Self::player().unwrap();

		let d_bet = <Bets<T>>::take(&dealer);
		let p_bet = <Bets<T>>::take(&player);

		<Stacks<T>>::mutate(&dealer, |v| *v -= d_bet);
		<Stacks<T>>::mutate(&player, |v| *v -= p_bet);

		<Pot<T>>::take() + d_bet + p_bet
	}

	fn makes_bet_now(who: &T::AccountId) -> bool {
		let expected = Self::bets_now();
		expected.is_some() && who == &expected.unwrap()
	}

	///Special rule in Poker
	fn is_option_available(who: &T::AccountId, bet: T::Balance) -> bool {
		if Self::stage() != stage::PREFLOP {
			return false;
		}
		let (_, big_blind) = Self::blinds();
		if bet != big_blind {
			return false;
		}

		//check should occur at small blind position
		//in case of more than 2 participants, it is not necessary a dealer
		who == &Self::dealer().unwrap()
	}

	fn reset_idle(who_waits: &T::AccountId) {
		<Bets<T>>::remove(who_waits);

		Self::dealer().into_iter().for_each(<Keys<T>>::remove);
		Self::player().into_iter().for_each(<Keys<T>>::remove);
	}

	fn reset_round() {
		let dealer = Self::dealer().unwrap();
		let player = Self::player().unwrap();

		vec![&dealer, &player]
			.iter().for_each(|k| {
			<Keys<T>>::remove(*k);
			<Secrets<T>>::remove(*k);
			<PocketCards<T>>::remove(*k);
			<OpenCards<T>>::remove(*k);
		});

		<FlopCards<T>>::kill();
		<TurnCards<T>>::kill();
		<RiverCards<T>>::kill();
		<SharedCards<T>>::kill();
		<Stage<T>>::kill();
		<BetsNow<T>>::kill();

		//Swapping roles
		<Dealer<T>>::put(player);
		<Player<T>>::put(dealer);
	}

}

//todo: optimize some places using `exists`

//todo: optimize some origin/who places

//todo: invent something to remove duplicated code for dealer/player

//todo: reduce usage of `unwrap()`

//todo: proper input-output of money to the game:
//1. reserve balance instead of withdrawal at the moment of joining
//2. unreserve balance + deposit/withdraw difference when leaving