import InputRange from 'react-input-range';
import React from "react";

export class RaiseSelector extends React.Component {
    constructor (props) {
        super(props);
        this.state = { value: props.default };
        game.raise.changed(this.state.value);
    }

    setState (state) {
        super.setState(state);
        game.raise.changed(state.value);
    }

    render () {
        return (
            <InputRange
                name={"choose amount of chips for raise"}
                allowSameValues={true}
                maxValue={this.props.maxValue}
                minValue={this.props.minValue}
                value={this.state.value}
                onChange={value => this.setState({ value })} />
        );
    }
}