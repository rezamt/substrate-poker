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

const bufEq = require('arraybuffer-equal');

function accountsEqualAndNotNull(left, right) {
    return left != null && right != null
        && bufEq(left.buffer, right.buffer);
}

export class GameSegment extends React.Component {
    constructor () {
        super();

        window.game = this;

        this.user = new Bond;
        this.loggedIn = (new Bond).default(false);
        this.loggedOut = this.loggedIn.map(flag => !flag);

        this.dealer = runtime.poker.dealer.defaultTo(null);
        this.player = runtime.poker.player.defaultTo(null);

        this.dealerIsHere = this.dealer.map(d => d != null);
        this.playerIsHere = this.player.map(p => p != null);

        this.isDealer = this.dealer.map(d =>
            this.user.map(u =>
                accountsEqualAndNotNull(d, u)));

        this.isPlayer = this.player.map(p =>
            this.user.map(u =>
                accountsEqualAndNotNull(p, u)));

        this.isJoined = this.isDealer.map(d =>
            this.isPlayer.map(p =>
                d || p));
    }

    logIn () {
        game.loggedIn.changed(true)
    }

    logOut () {
        game.loggedIn.changed(false)
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
                <If condition={this.loggedOut} then={<span>
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
                <If condition={this.loggedIn} then={<span>
                    <If condition={this.dealerIsHere} then={<div>
                        { this.displayMember("dealer", this.dealer, this.isDealer) }
                        <If condition={this.playerIsHere} then={<div>
                            { this.displayMember("player", this.player, this.isPlayer) }
                            <p />

                            <If condition={this.isJoined} then={
                                this.displayStatus("Good luck and have fun.")
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
                                        sender: runtime.indices.tryIndex(this.user),
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
            <Label color="olive">
                <Pretty value={member.map(account =>
                    runtime.indices.ss58Encode(runtime.indices.tryIndex(account))
                )} />
            </Label>
            <Pretty value={member} />
            <If condition={predicate} then={
                <Label color="yellow">You</Label>
            } />
        </div>;
    }

    logInKeyPressHandler (event) {
        if (event.key === "Enter" && game.user.isReady()) {
            game.logIn();
        }
    }
}

//todo:
//1. Try to use `bonds.me`, see this doc for details: https://wiki.parity.io/oo7-Parity-Examples

// const {} = require('oo7-react');
// const {} = require('oo7-parity');
// const {AccountLabel} = require('parity-reactive-ui');