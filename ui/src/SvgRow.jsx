import React from 'react';
import ReactSVG from "react-svg";
import { ReactiveComponent } from 'oo7-react';

export function SvgRow (id, elements) { //`elements` is a Bond
    return <TableRow id={id} value={
        elements.map(array => {
            let indexed = Array.from(array.entries());
            console.log(indexed);
            console.log(indexed.length);

            return indexed.map(entry => {
                return <td key={id + 'td' + entry[0]}>
                    <ReactSVG key={id + entry[0]} src={entry[1]}/>
                </td>
            });
        })
    }/>
}

class TableRow extends ReactiveComponent {
    constructor () {
        super(["value", "default", "className"])
    }
    render () {
        if (this.ready() || this.props.default == null) {
            return (<table key={this.id + 'table'} className={this.state.className} name={this.props.name}>
                <tbody key={this.id + 'tbody'}>
                <tr key={this.id + 'tr'}>
                    {this.state.value}
                </tr>
                </tbody>
            </table>)
        } else {
            return <span>{this.props.default}</span>
        }
    }
}