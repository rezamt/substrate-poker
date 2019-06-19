#!/bin/bash
ps -p `cat alice.pid` `cat bob.pid`

lsof -i ':9944'
lsof -i ':9945'
