const keys = require('./keys.js');

//Be careful, stage_ui = stage_node - 1
const HAND = 0;  // 4 % 4 == 0, i.e. revealing hand cards after RIVER
const FLOP = 1;  //PREFLOP at node side
const TURN = 2;  //FLOP at node side
const RIVER = 3; //TURN at node side
//const SHOWDOWN = 4;

export const STAGES = [HAND, FLOP, TURN, RIVER];
export const NAMES = ['hand', 'flop', 'turn', 'river'];

export function secretFromStage(stage) {
    let next = stage % (STAGES.length);
    return keys.BONDS[next].map(key => key.exponent);
}