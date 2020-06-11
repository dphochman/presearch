# Filter files to feed into detailed search

* Sometimes I need a compound search, e.g. limit the search to the results of a previous search.
* Should be comfortable for Linux shells, DOS shell, PowerShell.
* Combines ls, grep, find, dir, findstr, locate, mdfind, xargs.
* Feeds VS Code Search feature.

## Examples

* *.ts files that contain `InjectionToken` but not `@Injectable()`.
* find all files with name containing "common" or "shared".
* find files named `-(module|component|service)\.`.
* *.ts files containing word "NgModule" but not "@NgModule".
* find *.ts files containing multiple occurrences of `from '(.+)';`.
* find all git-staged files containing "from 'libs".

## Input

* Search (string/pattern).
* Search what: File name, relative path, full path, file content, folder name, or multiple?
* Recursive? (default=true, unless fed by a previous search).
* Match case vs. ignore case?
* Match Whole Word?
* Use Regular Expression?
* Invert match?
* Files/paths to include (default=project root, pwd).
* Files/paths to exclude
* Use Exclude Settings and Ignore Files? (default=True).
* Output format: result tree, full file paths, relative paths, count, JSON, globs.
* Output paths: native, Windows/DOS (backslash), Linux (forward-slash).
* Output header: just path, include line number, include column number.
* Output to: search panel, specified file, clipboard, feed next search, VS Code Search files to include, VS Code Search files to exclude, STDOUT (for next command).

## Technical approach

* Maximum compatibility for VS Code, command-lines (pipe, redirect), OS.
* node.js or ts-node or deno.
* executable VS Code extension.
* Don't provide features that can be piped via stdin/stdout, e.g. read from / write to a file.
