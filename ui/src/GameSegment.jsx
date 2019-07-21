import React from 'react';
require('semantic-ui-css/semantic.min.css');

import { Icon, Label, Header, Segment, Button } from 'semantic-ui-react';
import { Bond } from 'oo7';
import { If } from 'oo7-react';
import { calls, runtime } from 'oo7-substrate';
import { Identicon } from 'polkadot-identicon';
import { SignerBond } from './AccountIdBond.jsx';
import { TransactButton } from './TransactButton.jsx';
import { Pretty } from './Pretty';
import { SvgRow } from './SvgRow';

const bufEq = require('arraybuffer-equal');

import { decode, image } from './cards.js';
import { decrypt } from './naive_rsa.js';
import { BONDS } from './keys.js';
const keys = require('./keys.js');

function accountsAreEqualAndNotNull(left, right) {
    return left != null && right != null
        && bufEq(left.buffer, right.buffer);
}

export class GameSegment extends React.Component {
    constructor () {
        super();
        window.game = this;
        window.keys = keys;
        window.bonds = BONDS;

        this.user = new Bond;
        this.isLoggedIn = (new Bond).default(false);
        this.isLoggedOut = this.isLoggedIn.map(flag => !flag);

        this.dealer = runtime.poker.dealer;
        this.player = runtime.poker.player;

        this.dealerIsJoined = this.dealer.map(d => d != null);
        this.playerIsJoined = this.player.map(p => p != null);

        this.isDealer = this.dealer.map(d =>
            this.user.map(u =>
                accountsAreEqualAndNotNull(d, u)));

        this.isPlayer = this.player.map(p =>
            this.user.map(u =>
                accountsAreEqualAndNotNull(p, u)));

        this.isJoined = this.isDealer.map(d =>
            this.isPlayer.map(p =>
                d || p));

        this.handKey = new Bond();
        this.flopKey = new Bond();
        this.turnKey = new Bond();
        this.riverKey = new Bond();

        this.handCards = runtime.poker.handCards(game.user);
        this.sharedCards = runtime.poker.sharedCards;
        this.stage = runtime.poker.stage;

        this.handCardsAreDealt = this.handCards.map(encrypted => encrypted.length !== 0);

        this.isJoined.tie(joined => {
            this.isLoggedIn.then(logged => {
                if (joined && logged) {
                    this.handCardsAreDealt.then(dealt => console.assert(!dealt));
                    console.log("Joined the game");
                    keys.generate();
                }
            });
        })
    }

    logIn () {
        game.isLoggedIn.changed(true);
        game.isJoined.then(joined => {
           if (joined) {
               console.log("Resuming to the game");
               game.handCardsAreDealt.then(dealt => {
                   if (dealt) {
                       keys.load();
                   } else {
                       keys.generate();
                   }
               })
           }
        });
    }

    logOut () {
        game.isLoggedIn.changed(false);
    }

    logInKeyPressHandler (event) {
        if (event.key === "Enter" && game.user.isReady()) {
            game.logIn();
        }
    }

    render () {
        return <Segment style={{ margin: '1em' }} padded>
            <Header as='h2'>
                <Icon name='send' />
                <Header.Content>
                    Blockchain Poker
                    <Header.Subheader>Play poker via blockchain</Header.Subheader>
                </Header.Content>
            </Header>
            <div>
                {/* Logging in */}
                <If condition={this.isLoggedOut} then={<span>
                    <div style={{ fontSize: 'small' }}>Please input account information:</div>
                    <SignerBond bond={this.user} onKeyDown={this.logInKeyPressHandler}/>
					<div style={{ paddingTop: '1em' }}>
                        <If condition={this.user.ready()} then={
                            <Button onClick={this.logIn} content="Log in" icon="sign in" color="orange"/>
                        } else={
                            <Button content="Log in" icon="sign in" />
                        } />
					</div>
				</span>} />

				{/* User logged in */}
                <If condition={this.isLoggedIn} then={<span>
                    <If condition={this.dealerIsJoined} then={<div style={{ paddingTop: '1em' }}>
                        { this.displayMember("dealer", this.dealer, this.isDealer) }
                        <If condition={this.playerIsJoined} then={<div>
                            { this.displayMember("player", this.player, this.isPlayer) }
                            <p />

                            {this.dealing()}
                        </div>} else={
                            <If condition={this.isJoined} then={
                                this.displayStatus("You are waiting at the table...")
                            } else={<span>
                                { this.displayStatus("One person is waiting at the table.") }

                                {/* JOIN */}
                                <div style={{ paddingTop: '1em' }}>
                                    <TransactButton tx={{
                                        sender: this.user,
                                        call: calls.poker.joinGame(),
                                        compact: false,
                                        longevity: true
                                    }} color="green" icon="sign in"
                                       content="Join"/>
                                </div>
                            </span>}/>
                        }/>
                    </div>} else={<span>
                        { this.displayLoginMessage() }
                        { this.displayStatus("There is nobody in the room.") }

                        {/* INIT */}
                        <div style={{ paddingTop: '1em' }}>
                            <TransactButton tx={{
                                sender: runtime.indices.tryIndex(this.user),
                                call: calls.poker.joinGame(),
                                compact: false,
                                longevity: true
                            }} color="green" icon="sign in"
                               content="Take a seat"/>
                        </div>
                        </span>}/>

					<div style={{ paddingTop: '1em' }}>
						<Button onClick={this.logOut} content="Log out" icon="sign in" color="orange" />
					</div>
				</span>} />
            </div>
        </Segment>
    }

    displayStatus (status) {
        return <div style={{ paddingTop: '1em' }}>
            <Label color="blue">
                { status }
            </Label>
        </div>;
    }

    dealing () {
        return <If condition={this.isJoined} then={
            <If condition={this.handCardsAreDealt} then={this.game()}
                else={<span>
                    <TransactButton content="deal cards" icon='game' tx={{
                        sender: this.user,
                        call: calls.poker.preflop(
                            keys.hand.map(key => key.modulus),
                            keys.flop.map(key => key.modulus),
                            keys.turn.map(key => key.modulus),
                            keys.river.map(key => key.modulus))
                    }}/>
                    {this.displayStatus("Good luck and have fun.")}
                </span>}/>
        } else={
            this.displayStatus("Sorry, at the moment here are only two chairs...")
        }/>;
    }

    game () {
        return <span>
            { this.displaySharedCards() }
            { this.displayHandCards() }
            <TransactButton content="Next!" icon='game' tx={{
                sender: this.user,
                call: calls.poker.nextStage(this.stage.map(stage => {
                    return keys.BONDS[stage + 1].map(key => key.exponent);
                }))
            }}/>
        </span>;
    }

    displayLoginMessage () {
        return <div>
            <Label>Logged in as
                <Label.Detail>
                    <Pretty value={this.user} />
                </Label.Detail>
            </Label>
            <Label>Balance
                <Label.Detail>
                    <Pretty value={runtime.balances.balance(this.user)} />
                </Label.Detail>
            </Label>
        </div>;
    }

    displayMember (role, member, predicate) {
        return <div>
            <If condition={role === "dealer"} then={
                <Label color="red"><Pretty value="Dealer" /></Label>
            } else={
                <Label color="blue"><Pretty value="Player" /></Label>
            } />

            {/*<Identicon size='24' account={member} />*/}
            <Label>
                <Pretty value={member.map(account =>
                    runtime.indices.ss58Encode(runtime.indices.tryIndex(account))
                )} />
            </Label>
            {/*<Pretty value={member} />*/}
            <If condition={predicate} then={
                <Label color="yellow">You</Label>
            } />
        </div>;
    }

    displayHandCards () {
        return SvgRow("hand",
            this.handCards.map(encrypted =>
                keys.hand.map(key => {
                    let decrypted = decrypt(encrypted, key.modulus, key.exponent);
                    let cards = decode(decrypted);
                    return cards.map(image);
                }))
        );
    }

    displaySharedCards () {
        return SvgRow("shared",
            this.sharedCards.map(encoded => {
                let cards = decode(encoded);
                return cards.map(image);
            })
        );
    }
}

//todo:
//1. Try to use `bonds.me`, see this doc for details: https://wiki.parity.io/oo7-Parity-Examples

// const {} = require('oo7-react');
// const {} = require('oo7-parity');
// const {AccountLabel} = require('parity-reactive-ui');