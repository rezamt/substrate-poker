import React from 'react';
require('semantic-ui-css/semantic.min.css');
import { Icon, Accordion, List, Checkbox, Label, Header, Segment, Divider, Button } from 'semantic-ui-react';
import { Bond, TransformBond } from 'oo7';
import { ReactiveComponent, If, Rspan } from 'oo7-react';
import {
    calls, runtime, chain, system, runtimeUp, ss58Decode, ss58Encode, pretty,
    addressBook, secretStore, metadata, nodeService, bytesToHex, hexToBytes, AccountId
} from 'oo7-substrate';
import Identicon from 'polkadot-identicon';
import { AccountIdBond, SignerBond } from './AccountIdBond.jsx';
import { BalanceBond } from './BalanceBond.jsx';
import { InputBond } from './InputBond.jsx';
import { TransactButton } from './TransactButton.jsx';
import { FileUploadBond } from './FileUploadBond.jsx';
import { WalletList, SecretItem } from './WalletList';
import { TransformBondButton } from './TransformBondButton';
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
        return <Segment style={{margin: '1em'}} padded>
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
					<div style={{paddingTop: '1em'}}>
                        <If condition={this.user.ready()} then={
                            <Button onClick={this.logIn} content="Log in" icon="sign in" color="orange"/>
                        } else={
                            <Button content="Log in" icon="sign in" />
                        } />
					</div>
				</span>} />

				{/* User logged in */}
                <If condition={this.loggedIn} then={<span>
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

                    <If condition={this.dealerIsHere} then={<span>
                        <If condition={this.playerIsHere} then={
                            <If condition={this.isJoined} then={
                                <Label color="blue">Good luck and have fun.</Label>
                            } else={
                                <Label color="blue">Sorry, at the moment here are only two chairs...</Label>
                            }/>
                        } else={
                            <If condition={this.isJoined} then={
                                <Label color="blue">You are waiting at the table...</Label>
                            } else={<span>
                                <Label color="blue">One person is waiting at the table.</Label>

                                {/* JOIN */}
                                <div style={{paddingBottom: '1em'}}>
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
                    </span>} else={<span>
                        <Label color="blue">The is nobody in the room.</Label>

                        {/* INIT */}
                        <div style={{paddingBottom: '1em'}}>
                            <TransactButton tx={{
                                sender: runtime.indices.tryIndex(this.user),
                                call: calls.poker.joinGame(),
                                compact: false,
                                longevity: true
                            }} color="green" icon="sign in"
                               content="Take a seat"/>
                        </div>
                        </span>}/>

					<div style={{paddingTop: '1em'}}>
						<Button onClick={this.logOut} content="Log out" icon="sign in" color="orange" />
					</div>
				</span>} />
            </div>
        </Segment>
    }

    logInKeyPressHandler (event) {
        if (event.key === "Enter" && game.user.isReady()) {
            game.logIn();
        }
    }
}