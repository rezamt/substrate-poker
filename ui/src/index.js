import 'semantic-ui-css/semantic.min.css';
import React from 'react';
import {render} from 'react-dom';
import {App} from './app.jsx';
import { setNodeUri } from 'oo7-substrate';
require('./denominations');

import 'babel-polyfill';

import './events.js';

setNodeUri(['ws://127.0.0.1:9944']);

render(<App/>, document.getElementById('app'));
