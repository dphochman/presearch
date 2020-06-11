#!/usr/bin/env deno
/**
 * Deno wishlist items for compatibility with node/ts-node.
 */
// import { Deno, Reader } from './deno.ts';

 // function readAllStrSync(stream = Deno.stdin, onComplete: (str: string) => void): void {
//     const decoder = new TextDecoder();
//     const bytes = Deno.readAllSync(stream);
//     const input = decoder.decode(bytes);
//     onComplete(input);
// }
function readAllStr(reader = Deno.stdin, onComplete: (str: string) => void, timeout?: number): void {
    let isComplete = false;
    if (timeout && timeout > 0) {
        setTimeout(() => {
            if (!isComplete) {
                throw new Error('Reader not available or timed out.');
            }}, timeout);
    }
    Deno.readAll(reader).then((bytes: Uint8Array) => {
        const decoder = new TextDecoder();
        const input = decoder.decode(bytes);
        isComplete = true;
        onComplete(input);
    });
}

const commandPath = Deno.execPath().match(/\/([^\/]+)$/) || Deno.execPath().match(/\\([^\\]+)$/);
const RUNTIME_NAME = commandPath ? commandPath[1] : 'unknown';

const READFILE_OPTIONS = { encoding: 'utf8' };

export const DenoWishlist = {
    RUNTIME_NAME,
    READFILE_OPTIONS,
    readAllStr
};
