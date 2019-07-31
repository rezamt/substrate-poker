const React = require('react');
import { Label } from 'semantic-ui-react';

const SPEED = 0.1;

export class BlinkingLabel extends React.Component {
    constructor(props) {
        super(props);
        this.internal = new Label(props);
        this.state = { time: 0 };
    }

    blink () {
        this.setState({ time: this.state.time + SPEED });
    }

    componentDidMount () {
        this.setState({ time: 0 });
        this.timer = setInterval(() => this.blink(), 50);
    }

    componentWillUnmount () {
        clearInterval(this.timer);
    }

    render () {
        let opacity = Math.cos(this.state.time);
        return <div ref={(el) => this.self = el}
                    style={{opacity: opacity}}>
            { this.internal.render() }
        </div>
    }
}