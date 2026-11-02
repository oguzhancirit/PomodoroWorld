#!/bin/bash
cd "$(dirname "$0")"
S1='{"v":2,"uid":"bad11111","name":"Bozuk","onboarded":true,"toured":true,"introSeen":true,"xp":100,"coins":"abc","settings":null,"stats":"x","room":[],"av":5,"owned":null,"todos":{},"task":{"cat":"Hack"},"timer":{"phase":"focus","running":true,"endAt":"x","left":-5},"q":7}'
S2='{"v":2,"uid":"bad22222","name":"Bozuk2","onboarded":true,"toured":true,"introSeen":true,"xp":1e15,"coins":-500,"settings":{"gfx":"low","preset":"zzz","custom":{"focus":"40","brk":-3}},"room":{"items":[{"id":"nope","x":1,"z":1},null,5,{"id":"f_desk_wood","x":"a","z":null}]},"stats":{"days":null,"log":"x"},"timer":{"phase":"break","running":true,"endAt":1,"left":99999}}'
run() { local name=$1; shift; timeout 590 "$@" > final-$name.txt 2>&1; echo "$name: $(grep -E '^== ' final-$name.txt) $(grep -c 'pageerror\|threw' final-$name.txt) errs"; }
(run logic node deep.js logic desktop; run more node deep.js more desktop; run s1 node deep.js save desktop "$S1"; run s2 node deep.js save desktop "$S2"; run onboard node deep.js onboard small none; run func node func.js) &
(run lm node deep.js layout mobile; run ls node deep.js layout small; run lt node deep.js layout tablet; run ld node deep.js layout desktop; run ll node deep.js layout laptop; run lland node deep.js layout land; run lpl node deep.js layout phoneL; run abuse node abuse.js; run mp2 node mp2.js) &
wait
echo ALLDONE
