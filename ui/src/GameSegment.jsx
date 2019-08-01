import React from 'react';
require('semantic-ui-css/semantic.min.css');

import { Icon, Label, Header, Segment, Button } from 'semantic-ui-react';
import { Bond } from 'oo7';
import { If } from 'oo7-react';
import { Identicon } from 'polkadot-identicon';
import { SignerBond } from './AccountIdBond.jsx';
import { TransactButton } from './TransactButton.jsx';
import { BlinkingLabel } from './BlinkingLabel.jsx';
import { Pretty } from './Pretty';
import { SvgRow } from './SvgRow';

import { calls, post, runtime } from 'oo7-substrate';
import {secretStore} from 'oo7-substrate/src/secretStore.js';

const bufEq = require('arraybuffer-equal');

import { decode, image, hidden } from './cards.js';
import { decrypt } from './naive_rsa.js';
import { BONDS } from './keys.js';
import {BalanceBond} from "./BalanceBond";
const keys = require('./keys.js');
const stages = require('./stages.js');

function accountsAreEqualAndNotNull(left, right) {
    return left != null && right != null
        && bufEq(left.buffer, right.buffer);
}

function bondsAccountsAreEqualAndNotNull(left, right) {
    return left.map(d => right.map(u => accountsAreEqualAndNotNull(d, u)));
}

export class GameSegment extends React.Component {
    constructor () {
        super();
        window.game = this;
        this.accounts = secretStore();

        this.user = new Bond;
        this.isLoggedIn = (new Bond).default(false);
        this.isLoggedOut = this.isLoggedIn.map(flag => !flag);

        this.dealer = runtime.poker.dealer;
        this.player = runtime.poker.player;

        this.isDealer = bondsAccountsAreEqualAndNotNull(this.dealer, this.user);
        this.isPlayer = bondsAccountsAreEqualAndNotNull(this.player, this.user);

        this.opponent = this.isDealer.map(isDealer => {
            if (isDealer) {
                return this.player;
            } else {
                return this.dealer;
            }
        });

        this.dealerIsJoined = this.dealer.map(d => d != null);
        this.playerIsJoined = this.player.map(p => p != null);

        this.isJoined = this.isDealer.map(d =>
            this.isPlayer.map(p =>
                d || p));

        this.handKey = new Bond();
        this.flopKey = new Bond();
        this.turnKey = new Bond();
        this.riverKey = new Bond();

        this.handCards = runtime.poker.handCards(game.user);
        this.opponentCards = this.opponent.map(runtime.poker.openCards);

        this.sharedCards = runtime.poker.sharedCards;
        this.stage = runtime.poker.stage;

        this.handCardsAreDealt = this.handCards.map(encrypted => encrypted.length !== 0);
        this.opponentCardsAreRevealed = this.opponentCards.map(encrypted => encrypted.length !== 0);

        this.isJoined.tie(joined => {
            this.isLoggedIn.then(logged => {
                if (joined && logged) { //joining a game while being logged in
                    this.handCardsAreDealt.then(dealt => {
                        console.log("Joining the game");
                        keys.generate();
                        this.requestPreflop();
                    });
                }
            });
        });

        this.isLoggedIn.tie(logged => {
            this.isJoined.then(joined => {
                if (joined && logged) { //logging in while being joined to a game
                    this.handCardsAreDealt.then(dealt => {
                        console.log("Resuming to the game");
                        if (dealt) {
                            keys.load();
                        } else {
                            keys.generate();
                            this.requestPreflop();
                        }
                    });
                }
            });
        });
    }

    logIn () {
        game.isLoggedIn.changed(true);
    }

    logOut () {
        game.isLoggedIn.changed(false);
    }

    logInKeyPressHandler (event) {
        if (event.key === "Enter" && game.user.isReady()) {
            game.logIn();
        }
    }

    leaveGame () {
        console.log("LEAVING");
    }

    requestPreflop () {
        game.opponent.tie((other, id) => {
            if (other != null) {
                console.log("Requesting a new round");
                let tx = {
                    sender: this.user,
                    call: calls.poker.preflop(
                        keys.hand.map(key => key.modulus),
                        keys.flop.map(key => key.modulus),
                        keys.turn.map(key => key.modulus),
                        keys.river.map(key => key.modulus))
                };
                let status = post(tx);
                status.tie((s,id) => {
                    console.log(s);
                    if (s.confirmed || s.scheduled) {
                        console.log("Request for a new round registered");
                        status.untie(id);
                    }
                });
                if (id) {
                    game.opponent.untie(id);
                }
            }
        });
    }

    render () {
        return <Segment style={{ margin: '1em' }} padded>
            <Header as='h2'>
                <Icon name='send' />
                <Header.Content>
                    <table><tbody><tr>
                        <td width="400">
                            Blockchain Poker
                            <Header.Subheader>Play poker via blockchain</Header.Subheader>
                        </td><td>
                            <If condition={this.isLoggedIn} then={
                                <div style={{ paddingTop: '1em' }}>
                                    <Button onClick={this.logOut} content="Log out" icon="sign in" color="orange" />
                                </div>
                            }/>
                        </td>
                    </tr></tbody></table>
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
                    { this.displayAccountInfo() }

                    <If condition={this.dealerIsJoined} then={<div style={{ paddingTop: '1em' }}>
                        <table><tbody><tr>
                            <td>Blinds are </td>
                            <td><Label color="violet" size="large">
                                <Pretty value={runtime.poker.blinds
                                    .map(blinds => `${blinds[0][0]}/${blinds[0][1]}`)
                                }/>
                            </Label></td>
                            <td> in this game</td>
                        </tr></tbody></table>

                        <If condition={this.handCardsAreDealt}
                            else={this.displayParticipant(this.dealer, false)}/>
                        <If condition={this.playerIsJoined} then={<div>
                            <If condition={this.handCardsAreDealt}
                                else={this.displayParticipant(this.player, false)}/>
                            <p />

                            <If condition={this.isJoined} then={
                                this.renderGameTable()
                            } else={
                                this.displayMessage("Sorry, at the moment here are only two chairs...")
                            }/>
                        </div>} else={
                            <If condition={this.isJoined} then={
                                this.displayMessage("You are waiting at the table...")
                            } else={<span>
                                { this.displayMessage("One person is waiting at the table.") }
                                { this.renderJoinGameSection() }
                            </span>}/>
                        }/>
                    </div>} else={<span>
                        { this.displayMessage("There is nobody in the room.") }
                        { this.renderCreateGameSection() }
                    </span>}/>
				</span>} />
            </div>
        </Segment>
    }

    renderCreateGameSection () {
        let buyIn = new Bond;
        let blind = new Bond;

        return <div style={{ paddingTop: '1em' }}>
            <div style={{ paddingBottom: '1em' }}>
                <div style={{ fontSize: 'small' }}>minimal amount to bet</div>
                <BalanceBond bond={blind} />
            </div>
            <div style={{ paddingBottom: '1em' }}>
                <div style={{ fontSize: 'small' }}>amount to put on the table</div>
                <BalanceBond bond={buyIn} />
            </div>
            <div style={{ paddingTop: '1em' }}>
                <TransactButton tx={{
                    sender: this.user,
                    call: calls.poker.createGame(buyIn, blind),
                    compact: false,
                    longevity: true
                }} color="green" icon="sign in"
                   content="Create"/>
            </div>
        </div>;
    }

    renderJoinGameSection () {
        let buyIn = new Bond;

        return <div style={{ paddingTop: '1em' }}>
            <div style={{ paddingBottom: '1em' }}>
                <div style={{ fontSize: 'small' }}>amount to put on table</div>
                <BalanceBond bond={buyIn} />
            </div>
            <div style={{ paddingTop: '1em' }}>
                <TransactButton tx={{
                    sender: this.user,
                    call: calls.poker.joinGame(buyIn),
                    compact: false,
                    longevity: true
                }} color="green" icon="sign in"
                   content="Join"/>
            </div>
        </div>;
    }

    renderGameTable () {
        return <div style={{
            'width': '1282px',
            'height': '679px',
            'backgroundColor': 'green',
            'border': '10px solid darkgreen',
            'borderRadius': '20px',
            'paddingTop': '20px',
            'paddingLeft': '20px',
            'paddingRight': '20px',
            'paddingBottom': '20px',
        }}>
            <If condition={this.handCardsAreDealt} then={<span>
                {/*Players have received cards on their hands*/}
                <table><tbody><tr>
                        <td>
                            <table><tbody><tr><td>
                                { this.displayParticipant(this.opponent, true)}
                                { this.displayOpponentCards() }
                                { this.displayBet(this.opponent) }
                            </td></tr>
                            <tr height="30"><td></td></tr>
                            <tr><td>
                                { this.displayBet(this.user) }
                                { this.displayHandCards() }
                                { this.displayParticipant(this.user, true)}
                            </td></tr></tbody></table>
                        </td>
                        <td>
                            <table><tbody><tr><td>
                                <div style={{
                                    'paddingLeft': '24px'}}>
                                    <div style={{
                                        'height': '265px',
                                        'width': '838px',
                                        'backgroundColor': 'forestgreen',
                                        'border': '6px solid greenyellow',
                                        'borderRadius': '12px',
                                        'paddingTop': '12px',
                                        'paddingLeft': '12px',
                                        'paddingRight': '12px',
                                        'paddingBottom': '12px',}}>
                                        <If condition={this.sharedCards.map(encoded => encoded.length > 0)}
                                            then={this.displaySharedCards()}/>
                                    </div>
                                </div>
                            </td></tr><tr><td>
                                { this.displayActions() }
                            </td></tr></tbody></table>
                        </td>
                </tr></tbody></table>
            </span>} else={<span>
                {/*Players haven't received cards yet*/}
                {this.displayStatus("Providing round keys and waiting for cards...")}
                {this.displayMessage("Good luck and have fun.")}
            </span>}/>
        </div>;
    }

    displayAccountInfo () {
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

    displayParticipant (participant, markDealer) {
        let content = <span>
            <Label color="blue">
                <Pretty value={participant.map(account => game.accounts.find(account).name)}/>
            </Label>
            <Label><Pretty value={runtime.poker.stacks(participant)}/></Label>
            <If condition={bondsAccountsAreEqualAndNotNull(participant, this.user)}
                then={<Label color="yellow">You</Label>}
                else={<Label color="yellow">Opponent</Label>}/>
        </span>;

        return <table><tbody>
            <If condition={markDealer} then={<tr>
                <td width="259px">{content}</td>
                <td>
                    <If condition={bondsAccountsAreEqualAndNotNull(participant, this.dealer)}
                        then={<Label color="red"><Pretty value="Dealer" /></Label>}/>
                </td>
            </tr>} else={<tr><td>
                {content}
            </td></tr>}/>
        </tbody></table>;
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

    displayBet (participant) {
        let bet = runtime.poker.bets(participant);
        return <div align="center" style={{'height': '30px'}}>
            <If condition={bet.map(v => v != 0)}
                then={<Label color="olive">Bet: <Pretty value={bet}/></Label>}/>
        </div>;
    }

    displayActions () {
        return <div align="center">
            <TransactButton color="red" content="Leave" tx={{
                sender: this.user,
                call: calls.poker.leave()
            }}/>
            <TransactButton color="red" content="Fold" tx={{
                sender: this.user,
                call: calls.poker.fold()
            }} size="massive"/>
            <TransactButton color="yellow" content="Raise" tx={{
                sender: this.user,
                    call: calls.poker.nextStage(this.stage.map(stage => {
                    return stages.secretFromStage(stage);
                }))
            }} size="massive"/>
            <TransactButton color="green" content="Call" tx={{
                sender: this.user,
                call: calls.poker.nextStage(this.stage.map(stage => {
                    return stages.secretFromStage(stage);
                }))
            }} size="massive"/>
            <TransactButton color="blue" content="Check" tx={{
                sender: this.user,
                call: calls.poker.nextStage(this.stage.map(stage => {
                    return stages.secretFromStage(stage);
                }))
            }}/>
        </div>
    }

    displayOpponentCards () {
        let hiddenCards = new Bond();
        hiddenCards.changed([...Array(2).keys()]
            .map(_ => hidden()));

        return <If condition={this.opponentCardsAreRevealed}
           then={SvgRow("opponent-revealed",
               this.opponentCards.map(encoded => decode(encoded).map(image)))}
           else={SvgRow("opponent-hidden", hiddenCards)}/>;
    }

    displaySharedCards () {
        return SvgRow("shared",
            this.sharedCards.map(encoded => {
                let cards = decode(encoded);
                return cards.map(image);
            })
        );
    }

    displayStatus (status) {
        return <div style={{ paddingTop: '1em', paddingBottom: '1em' }}>
            <BlinkingLabel size="massive" color="yellow">
                { status }
            </BlinkingLabel>
        </div>;
    }

    displayMessage (message) {
        return <div style={{ paddingTop: '1em' }}>
            <Label size="large" color="blue">
                { message }
            </Label>
        </div>;
    }

    displayGameResult () {
        return <Label>TODO: WINNER</Label>
    }
}

//todo:
//1. Try to use `bonds.me`, see this doc for details: https://wiki.parity.io/oo7-Parity-Examples
//2. Implement codec for some structures. Though they are not actually used, they produce warnings.

// const {} = require('oo7-react');
// const {} = require('oo7-parity');
// const {AccountLabel} = require('parity-reactive-ui');