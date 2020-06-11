#!/usr/bin/env ts-node
/**
 * Extract a declaration from a TypeScript file.
 * Can be used to create a subset of a TypeScript library.
 *
 * USAGE
 * `./extract-typescript.ts SOURCEFILE DECLARATIONNAME`
 *
 * EXAMPLES
 * `./extract-typescript.ts ./lib.deno.d.ts Reader`
 *  will output the Reader interface.
 */
import { readFileSync } from 'fs';

const sourcefile = process.argv[2];
const decname = process.argv[3];
const DEBUG_FLAG = false;

const READ_FILE_OPTIONS = { encoding: 'utf8', flags: 'r' };
const content = readFileSync(sourcefile, READ_FILE_OPTIONS);

const result: string[] = [];

// DONE Include 'extends ...', 'implements ..., ...'
// DONE Include '<...>' after declaration name, prototypes, interfaces, return type.
// DONE Run from command line.

// TODO Include multiple line 'extends' and 'implements'.
// TODO Exclude matching comments.
// TODO Limit to exported declarations.
// TODO Detect 'declare function clearTimeout(...);
// TODO Use typescript parser for more accuracy and options.
// TODO Output `// tslint:disable:rulename` or `// tslint:disable` to top of a file.
// TODO Output a comment for each extracted section: source, line number, timestamp.
// TODO Exclude last line if it declares another symbol.

// Assumes a well-formatted declaration file.
const reType = `(<[^>]+>)?`;
const reSymbol = `\\w+${reType}`;
const reDeclaration = ` ${decname}${reType}` +
    `( extends ${reSymbol}(, ${reSymbol}){0,99})?` +
    `( implements ${reSymbol}(, ${reSymbol}){0,99})?` +
    ` [\\{=]`;
const reFind = new RegExp(reDeclaration);

let charPos = -1;
charPos = content.search(reFind);
if (charPos < 0) {
    charPos = content.indexOf(' ' + decname + ' {');
}
if (charPos < 0) {
    charPos = content.indexOf(' ' + decname + ' =');
}
if (charPos < 0) {
    console.error(`// ERROR: Declaration ${decname} not found`);
    process.exit(1);
}
const beforeLines = content.substr(0, charPos).split('\n');
const lineNumber = beforeLines.length;
if (DEBUG_FLAG) {
    console.debug({ charPos, lineNumber });
}

let line = beforeLines.reverse()[0];
const indentPrefix = line.match(/^(\s*)./)[1];

const afterLines = content.substr(charPos).split('\n');
line = line + afterLines[0];
result.push(line);
if (DEBUG_FLAG) {
    console.debug(0, line);
}

if (line.search(/;\r?$/) === -1) {
    const lineMax = afterLines.length;
    const rePrefix = new RegExp('^' + indentPrefix + '[^\\s]');
    let foundMatch = false;
    for (let n = 1; n < lineMax && !foundMatch; n++) {
        line = afterLines[n];
        if (DEBUG_FLAG) {
            console.debug(n, line);
        }
        result.push(line);
        foundMatch = (line.search(rePrefix) === 0);
    }
}
result.push('');
console.log(result.join('\n'));
