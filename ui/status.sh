#!/bin/bash
ps -p `cat alice.pid` `cat bob.pid`

lsof -i ':8000'
lsof -i ':8001'
