import React from 'react';
import { ReactiveComponent } from 'oo7-react';

export function SvgRow (id, elements) { //`elements` is a Bond
    return <TableRow id={id} value={
        elements.map(array => {
            let indexed = Array.from(array.entries());
            return indexed.map(entry => {
                return <td key={id + 'td' + entry[0]}>
                    <img key={id + entry[0]} src={entry[1]} alt='' width={156} height={218}/>
                    {/* Original size is 360 x 504 */}
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