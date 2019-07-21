const PREFLOP = 0;
const FLOP = 1;
const TURN = 2;
const RIVER = 3;

export const STAGES = [PREFLOP, FLOP, TURN, RIVER];
export const NAMES = ['preflop', 'flop', 'turn', 'river'];

export function next(stage) {
    let result = (stage + 1) % (STAGES.length);
    //PREFLOP follows after RIVER, what means
    //that we are passing secret for PREFLOP stage,
    //i.e. we are revealing our hand cards
    console.log(`Next stage is ${result}`);
    return result;
}