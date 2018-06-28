#!/usr/bin/env bash
rm -fr node_modules
npm install
npm audit fix
npm run compile
npm test
