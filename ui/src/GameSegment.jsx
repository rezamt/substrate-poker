import React from 'react';
require('semantic-ui-css/semantic.min.css');

import { Icon, Label, Header, Segment, Button } from 'semantic-ui-react';
import { Bond } from 'oo7';
import { If } from 'oo7-react';
import { pretty } from 'oo7-substrate';
import { calls, runtime } from 'oo7-substrate';
import { Identicon } from 'polkadot-identicon';
import { SignerBond } from './AccountIdBond.jsx';
import { TransactButton } from './TransactButton.jsx';
import { Pretty } from './Pretty';

import { decode, decrypt } from './cards.js';

const bufEq = require('arraybuffer-equal');
const NodeRSA = require('node-rsa');

const MODULUS_STORAGE_KEY = 'blockchain_poker_hand_key_modulus';
const EXPONENT_STORAGE_KEY = 'blockchain_poker_hand_key_exponent';

function accountsAreEqualAndNotNull(left, right) {
    return left != null && right != null
        && bufEq(left.buffer, right.buffer);
}

export class GameSegment extends React.Component {
    constructor () {
        super();

        window.game = this;

        this.user = new Bond;
        this.isLoggedIn = (new Bond).default(false);
        this.isLoggedOut = this.isLoggedIn.map(flag => !flag);

        this.dealer = runtime.poker.dealer; //.defaultTo(null);
        this.player = runtime.poker.player; //.defaultTo(null);

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

        this.handCards = runtime.poker.handCards(game.user);
        this.handCardsAreDealt = this.handCards.map(encrypted => encrypted.length !== 0);

        this.isJoined.tie(joined => {
            this.isLoggedIn.then(logged => {
                if (joined && logged) {
                    this.handCardsAreDealt.then(dealt => console.assert(!dealt));
                    console.log("Joined the game");
                    game.generateHandKey();
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
                       game.loadHandKey();
                   } else {
                       game.generateHandKey();
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

    modulusField () {
        this.user.then(account => console.log(MODULUS_STORAGE_KEY + pretty(account)));
        return MODULUS_STORAGE_KEY + pretty(this.user._value);
    }

    exponentField () {
        this.user.then(account => console.log(EXPONENT_STORAGE_KEY + pretty(account)));
        return EXPONENT_STORAGE_KEY + pretty(this.user._value);
    }

    clearHandKey () {
        console.log("Clearing hand key");
        console.assert(this.user.isReady());
        localStorage.setItem(game.modulusField(), "");
        localStorage.setItem(game.exponentField(), "");
        this.handKey.reset();
    }

    loadHandKey () {
        console.log("Loading hand key");
        let modulus = localStorage.getItem(game.modulusField());
        let exponent = localStorage.getItem(game.exponentField());
        if (modulus !== "" && exponent !== "") {
            this.handKey.changed({
                modulus: Buffer.from(modulus, 'hex'),
                exponent: Buffer.from(exponent, 'hex')
            });
        } else {
            this.handKey.reset();
        }
    }

    generateHandKey () {
        console.log("Generating hand key");
        const key = new NodeRSA({b: 256}, 'components', 'browser');

        const components = key.exportKey('components');
        console.assert(components.e === 65537);

        const modulus = components.n.subarray(1);
        const exponent = components.d;

        localStorage.setItem(game.modulusField(), Buffer.from(modulus).toString('hex'));
        localStorage.setItem(game.exponentField(), Buffer.from(exponent).toString('hex'));
        this.handKey.changed({modulus: modulus, exponent: exponent});
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

                            <If condition={this.isJoined} then={
                                <If condition={this.handCardsAreDealt} then={this.displayHandCards()}
                                    else={<span>
                                        <TransactButton content="deal cards" icon='game' tx={{
                                            sender: this.user,
                                            call: calls.poker.dealHand(this.handKey.map(key => key.modulus))
                                        }}/>
                                        {this.displayStatus("Good luck and have fun.")}
                                </span>}/>
                            } else={
                                this.displayStatus("Sorry, at the moment here are only two chairs...")
                            }/>
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
        return <Pretty value={this.handCards.map(encrypted =>
            this.handKey.map(key =>
                decode(decrypt(encrypted, key.modulus, key.exponent)))
        )}/>;
    }
}

//todo:
//1. Try to use `bonds.me`, see this doc for details: https://wiki.parity.io/oo7-Parity-Examples

// const {} = require('oo7-react');
// const {} = require('oo7-parity');
// const {AccountLabel} = require('parity-reactive-ui');