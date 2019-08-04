import 'semantic-ui-css/semantic.min.css';
import 'react-notifications/lib/notifications.css';
import 'react-input-range/lib/css/index.css';
import React from 'react';
import {render} from 'react-dom';
import {App} from './app.jsx';
import { setNodeUri } from 'oo7-substrate';
require('./denominations');

import 'babel-polyfill';

import './events.js';

setNodeUri(['ws://127.0.0.1:9944']);

render(<App/>, document.getElementById('app'));
