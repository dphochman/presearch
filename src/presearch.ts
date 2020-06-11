#!/usr/bin/env deno
/**
 * presearch.ts - compound search files, pipe file paths in and out.
 */

// TODO Describe native ways to feed paths into find, xargs, etc.
// TODO Add tests.
// TODO Display command-line in debug output.
// TODO Generate package for Deno, node with mjs, ts-node, and babel-node.
// TODO Expose with secure website and webservice.
// TODO Describe how to output windows/posix/native file paths.
// TODO Describe how to output full paths.
// TODO Describe how to output to editor, clipboard, VSCode inputs.
// TODO Describe how to input options & files from VSCode search, editor.
// TODO Refactor for proper modules, reuse.
// TODO Describe how to use as 'presearch' and 'andsearch', with other commands.
// in presearch, output should be filepaths, no line/column, nothing fancy, to feed next search.

// DONE Get options from command line.
// DONE Read STDIN.
// DONE Implement --help.

// Node v14+ & npm compatibility.
// import { readFileSync as readFileStrSync } from 'fs';
// import denoCompat from '../../deno-compat/src/deno-compat';
// const { Deno, DenoWishlist, os } = denoCompat;

// ts-node compatibility
// `ts-node FILE OPTIONS
// import { Deno, DenoWishlist, fs, os } from '../../deno-compat/src/deno-compat';
// const denocompat = require('../../deno-compat/src/deno-compat.ts');
// const { readFileStrSync } = fs;

// Deno compatibility.
// `deno run --allow-read --allow-env --unstable FILE OPTIONS` command-line permission requires: --allow-read
import { existsSync, readFileStrSync } from 'https://deno.land/std/fs/mod.ts';
import * as os from 'https://deno.land/std/node/os.ts';
import { DenoWishlist } from './deno-wishlist.ts';

const RUNTIME_NAME = DenoWishlist.RUNTIME_NAME;
const READFILE_OPTIONS = DenoWishlist.READFILE_OPTIONS;

enum IInputFrom { stdin, scratch }
enum IOutputFormat { link, tree, count, json, glob, verbose }
enum IOutputHeader { path, line, column }
enum IOutputLevel { debug, info, warning, error, quiet }

interface IPresearchOptions {
    outputLevel: IOutputLevel;
    command?: string;
    args: string[];

    /** Search string or regex as string */
    searchTerm: string;
    /** Search the file names/paths provided as input? */
    searchName: boolean;
    /** Search the file content? */
    searchContent: boolean;
    /** Search under input directories or globs, not only specific file paths. */
    searchRecursive?: boolean;
    /** Match case? */
    matchCase: boolean;
    /** Match whole word? */
    matchWord: boolean;
    /** Use regular expression? */
    useRegex: boolean;
    /** Select files that do not match? */
    invertMatch: boolean;

    includePaths: string[];
    excludePaths: string[];
    useIgnoreFiles: boolean;
    useGlobalIgnoreFiles?: boolean;
    inputFrom: IInputFrom;
    verifyInput: boolean;

    outputFormat?: IOutputFormat;
    /** Output the path, line, column character-position of the match */
    outputHeader: IOutputHeader[];
    /** terminate values with NUL byte */
    outputNUL?: boolean;
}

type IPresearchInput = string[];

interface IPresearchResult {
    title: string;
    /** Search result relative paths, name-only. */
    paths: string[];
    /** Search result details, with line and column. */
    lines: Array<{ path: string, line: number, column?: number }>;
    /** Search result with count per path. */
    counts?: Array<{ path: string, count: number }>;
    /** Total number of occurrences */
    count?: number;
}

type IPresearchOutput = string;

/**
 * Initialization
 */
let OPTIONS: IPresearchOptions;
let INPUT: IPresearchInput;
let RESULT: IPresearchResult = { title: '', paths: [], lines: [] };
let OUTPUT: IPresearchOutput = '';

// TODO Wrap in anonymous function to protect global namespace.
function STEP0() { OPTIONS = getOptions(STEP1); }
function STEP1() { getInput(OPTIONS, STEP2); }
function STEP2() { doSearch(OPTIONS, INPUT, STEP3); }
function STEP3() { OUTPUT = doOutput(OPTIONS, RESULT); }
STEP0();
// process_exit(0);

function getDefaultOptions(): IPresearchOptions {
    const options: IPresearchOptions = {
        command: '',
        args: [],
        searchTerm: '',
        searchName: false,
        searchContent: true,
        searchRecursive: false,
        matchCase: false,
        matchWord: false,
        useRegex: false,
        invertMatch: false,
        inputFrom: Deno.isatty(Deno.stdin.rid) ? IInputFrom.scratch : IInputFrom.stdin,
        verifyInput: true,
        includePaths: [],
        excludePaths: [],
        useIgnoreFiles: false,
        outputLevel: IOutputLevel.error,
        outputFormat: IOutputFormat.link,
        outputHeader: [IOutputHeader.path]
    };
    return options;
}
function getOptions(callback?: () => void): IPresearchOptions {
    const options: IPresearchOptions = getDefaultOptions();

    // TODO Apply option overrides from a config file.

    // TODO Save command line for replay, debug, title.
    options.command = RUNTIME_NAME;
    options.args = Deno.args;

    // Apply command-line arguments.
    // TODO Parse command-line with minimist.
    let argc = 0;
    let arg = '';
    while (argc < Deno.args.length) {
        arg = Deno.args[argc];
        switch (arg.toLowerCase()) {
            case '-h': case '--help':
                const msg = [
                    'FILEPATH(S) | [deno run --unstable --allow-read --allow-env] presearch.ts [OPTIONS] PATTERN',
                    '-h, --help                   \t Display help and exit.',
                    '    --name | --no-name       \t Search file paths or not (default)',
                    '    --content | --no-content \t Search file content (default) or not',
                    '-w, --word | --no-word       \t Match whole word or any text',
                    '-i, --ignore-case | --case   \t Ignore case or match case',
                    '-l, --literal | -r, --regex  \t Search term is literal (default) or regular expression',
                    '-v, --invert | --no-invert   \t Select files that do NOT match, or that do match (default)',
                    '',
                    'INPUT OPTIONS',
                    '    --include FILEPATTERNS   \t Include these files in search',
                    '-x, --exclude FILEPATTERNS   \t Exclude these files from search',
                    '--, --stdin                  \t Include files from STDIN (default)',
                    '    --use-ignore-files       \t Use exclude settings and ignore files (default)',
                    '    --no-ignore-files        \t Do not use exclude settings and ignore file (e.g. .gitignore)',
                    '    --verify | --no-verify   \t Verify specified input files exist (default)',
                    '',
                    'OUTPUT OPTIONS',
                    '-q, --quiet | --error | --warn | --info | --debug',
                    '                             \t Set output message level.',
                    '-m, --name-only              \t Output matching filepath only, and not line or column',
                    '    --filename, --filepath   \t Output matching filepath (default)',
                    '-n, --line                   \t Output line number',
                    '-o, --column                 \t Output column number',
                    '-z, --null                   \t Append null to each output'
                ];
                console.log(msg.join('\n'));
                Deno.exit(0);
            case '--debug': options.outputLevel = IOutputLevel.debug; break;
            case '--info': options.outputLevel = IOutputLevel.info; break;
            case '--warn': case '--warning': options.outputLevel = IOutputLevel.warning; break;
            case '--error': options.outputLevel = IOutputLevel.error; break;
            case '-q': case '--quiet': options.outputLevel = IOutputLevel.quiet; break;

            case '--name': options.searchName = true; break;
            case '--no-name': options.searchName = false; break;

            case '--content': options.searchContent = true; break;
            case '--no-content': options.searchContent = false; break;

            case '-s': case '--recursive': options.searchRecursive = true; break;
            case '--no-recursive': options.searchRecursive = false; break;

            case '-w': case '--word': case '--match-word': case '--match-whole-word':
                options.matchWord = true; break;
            case '--no-word': case '--no-match-word': case '--no-match-whole-word':
                options.matchWord = false; break;

            case '--case': case '--match-case': case '--case-sensitive':
            case '--no-ignore-case':
                options.matchCase = true; break;
            case '-i': case '--no-case': case '--no-match-case': case '--case-insensitive':
            case '--ignore-case':
                options.matchCase = false; break;

            case '-r': case '--regex': case '--regexp': options.useRegex = true; break;
            case '-l': case '--literal': case '--string': options.useRegex = false; break;

            case '-v': case '--invert': case '--invert-match': options.invertMatch = true; break;
            case '--no-invert': case '--no-invert-match': options.invertMatch = false; break;

            // INPUT Settings
            // TODO Handle '--include=...' and '--exclude=...' format.
            case '--include': case '--include-files':
                argc++; arg = Deno.args[argc];
                options.includePaths.push(arg); break;
            case '-x': case '--exclude': case '--exclude-files':
                argc++; arg = Deno.args[argc];
                options.excludePaths.push(arg); break;

            case '--verify': case '--verify-input':
                options.verifyInput = true; break;
            case '--no-verify': case '--no-verify-input':
                options.verifyInput = false; break;

            case '--scratch': case '--no-stdin': case '--presearch': case '--cwd':
                options.inputFrom = IInputFrom.scratch; break;
            case '-': case '--':
            case '--stdin': case '--no-scratch': case '--andsearch':
                options.inputFrom = IInputFrom.stdin; break;
            case '--use-exclude-settings': case '--use-ignore-files':
                options.useIgnoreFiles = true; break;
            case '--no-exclude-settings': case '--no-ignore-files':
                options.useIgnoreFiles = false; break;

            // OUTPUT Settings
            case '--tree': options.outputFormat = IOutputFormat.tree; break;
            case '--link': options.outputFormat = IOutputFormat.link; break;
            case '-c': case '--count': options.outputFormat = IOutputFormat.count; break;
            case '--json': options.outputFormat = IOutputFormat.json; break;
            case '--glob': options.outputFormat = IOutputFormat.glob; break;
            case '--verbose': options.outputFormat = IOutputFormat.verbose; break;

            case '--no-filename': case '--no-filepath':
                const pos = options.outputHeader.indexOf(IOutputHeader.path);
                if (pos >= 0) {
                    options.outputHeader.splice(pos, 1);
                }
                break;
            case '-m': case '--name-only':
                options.outputHeader = [IOutputHeader.path]; break;
            case '--path': case '--filename': case '--filepath': case '--file':
                options.outputHeader.push(IOutputHeader.path); break;
            case '-n': case '--line': case '--line-number':
                options.outputHeader.push(IOutputHeader.line); break;
            case '-o': case '--column': case '--character': case '--position':
                options.outputHeader.push(IOutputHeader.column); break;

            case '-z': case '--null': case '--print0': options.outputNUL = true; break;

            default:
                if (options.searchTerm === '') {
                    options.searchTerm = arg;
                } else {
                    if (options.outputLevel <= IOutputLevel.debug) {
                        console.debug(Deno.args.join(' '));
                    }
                    if (options.outputLevel <= IOutputLevel.error) {
                        console.error('Unrecognized option in word #' + argc + '/' + Deno.args.length +
                        ' "' + arg + '"');
                        Deno.exit(1);
                    }
                }
        }
        argc++;
    }

    // Verify
    if (options.searchTerm === '') {
        if (options.outputLevel <= IOutputLevel.error) {
            console.error('No search term specified');
        }
        Deno.exit(1);
    }
    if (!options.searchName && !options.searchContent) {
        if (options.outputLevel <= IOutputLevel.error) {
            console.error('Must search either content or name.');
        }
        Deno.exit(1);
    }

    OPTIONS = options;
    if (options.outputLevel <= IOutputLevel.debug) { console.debug('OPTIONS', OPTIONS); }
    if (callback) { callback(); }
    return options;
}

function getInput(options: IPresearchOptions, callback?: () => any): void {
    // let input: string = '';

    function onInputRead(str: string) {
        // TODO Limit to existing files.
        // TODO Limit to full-width lines with paths (not indented lines, blanks, title, or comments).
        INPUT = str.split(os.EOL).filter(path => path !== '');
        if (options.outputLevel <= IOutputLevel.debug) { console.debug('INPUT', INPUT); }
        if (callback) { callback(); }
    }

    const ignoreFiles = getIgnoreFiles(options);
    const includePaths = options.includePaths;
    const excludePaths = options.excludePaths;

    if (options.inputFrom === IInputFrom.scratch) {
        // TODO Apply ignoreFiles.
        // TODO Collect files from pwd, include, exclude.
        if (options.outputLevel <= IOutputLevel.error) {
            console.error('Input from current working directory is not yet supported.');
        }
        Deno.exit(2);
    }

    if (includePaths && includePaths.length) {
        if (options.outputLevel <= IOutputLevel.error) {
            console.error('Include paths are not supported with input stream');
        }
        Deno.exit(2);
    }
    if (excludePaths && excludePaths.length) {
        if (options.outputLevel <= IOutputLevel.error) {
            console.error('Exclude paths are not supported with input stream');
        }
        Deno.exit(2);
    }

    DenoWishlist.readAllStr(Deno.stdin, onInputRead, 1000);
}
function getIgnoreFiles(options: IPresearchOptions): any[] {
    const ignoreFiles: Array<{ [filetype: string]: string }> = [];

    // TODO Use VSCode settings.json "search.useGlobalIgnoreFiles".
    if (options.useGlobalIgnoreFiles) {
        // let filecontent: string;
        let vscodeUserSettingsPath = '';
        if (os.type() === 'Windows_NT') {
            vscodeUserSettingsPath = Deno.env.get('APPDATA') + '/code/user/settings.json';
        } else {
            vscodeUserSettingsPath = '$HOME/Library/Application Support/Code/User/settings.json';
        }
        if (existsSync(vscodeUserSettingsPath)) {
            const filecontent: string = readFileStrSync(vscodeUserSettingsPath, READFILE_OPTIONS);
            ignoreFiles.push({ vscodeUserSettings: filecontent });
        }
    }
    if (options.useIgnoreFiles) { // glob patterns in files.
        // TODO Use VSCode settings.json "search.useIgnoreFiles".
        // TODO Use git only if `git status` succeeds.
        // TODO Find ignore files via `git config core.excludesFile`.
        // TODO Find global .gitignore via `git config --system`
        // TODO Find ignore files at $XDG_CONFIG_HOME/git/ignore, $GIT_DIR/info/exclude, .gitignore.
        if (existsSync('.gitignore')) {
            ignoreFiles.push({ gitIgnoreFile: readFileStrSync('.gitignore', READFILE_OPTIONS) });
        }
        if (existsSync('.ignore')) {
            ignoreFiles.push({ ignoreFile: readFileStrSync('.ignore', READFILE_OPTIONS) });
        }
        if (existsSync('.vscode/settings.json')) {
            // Limit to values in "git.ignoredRepositories".
            ignoreFiles.push({ vscodeWorkspaceSettings: readFileStrSync('.vscode/settings.json', READFILE_OPTIONS) });
        }

        // TODO extract files.include, files.exclude from VSCode settings.json.
        // TODO extract search.include, search.exclude from VSCode settings.json.
    }
    return ignoreFiles;
}

function doSearch(options: IPresearchOptions, input: IPresearchInput, callback?: () => void): void {
    const result: IPresearchResult = RESULT;
    const { args } = options;
    result.title = 'Results for ' + args.join(' ');

    // TODO Limit processing to outputFormat: link, tree, count, json, glob, verbose.
    // Limit processing to outputHeader: path, line, column.
    if (options.outputHeader.includes(IOutputHeader.path)) {
        result.paths = getResultPaths(options, input, result);
        result.count = result.paths.length;
    } else if (options.outputHeader.includes(IOutputHeader.line)) {
        if (options.outputLevel <= IOutputLevel.error) {
            console.error('Output level line not yet implemented.');
        }
        // Deno.exit(2);
        result.lines = getResultLines(options, input, result);
        result.counts = getResultCounts(options, input, result);
    } else if (options.outputHeader.includes(IOutputHeader.column)) {
        if (options.outputLevel <= IOutputLevel.error) {
            console.error('Output level column not yet implemented.');
        }
        // Deno.exit(2);
        result.lines = getResultLines(options, input, result);
        result.counts = getResultCounts(options, input, result);
    } else {
        if (options.outputLevel <= IOutputLevel.error) {
            console.error('Output level not selected.');
        }
        Deno.exit(1);
    }

    RESULT = result;
    if (options.outputLevel <= IOutputLevel.debug) { console.debug('RESULT', RESULT); }
    if (callback) { callback(); }
    return;
}
function getResultLines(options: IPresearchOptions, input: IPresearchInput, result?: IPresearchResult) {
    const lines: IPresearchResult['lines'] = [];
    return lines;
}
function getResultCounts(options: IPresearchOptions, input: IPresearchInput, result?: IPresearchResult) {
    const counts: IPresearchResult['counts'] = [];
    return counts;
}
/**
 * Which files pass the search criteria.
 */
function getResultPaths(options: IPresearchOptions, input: IPresearchInput, result?: IPresearchResult): string[] {
    const { searchTerm } = options;
    let searchLiteral = searchTerm;

    let useRegex = options.useRegex;
    let regexFlags = '';
    if (!options.matchCase) { useRegex = true; regexFlags = 'i'; }
    if (options.matchWord) { useRegex = true; searchLiteral = '\\b' + searchLiteral + '\\b'; }
    const searchRegex = new RegExp(searchLiteral, regexFlags);

    const invertMatch = options.invertMatch;

    const paths = input.filter((path, index) => {
        let found = false;
        if (!found && options.searchName) {
            found = useRegex ? (path.search(searchRegex) >= 0) : (path.indexOf(searchLiteral) >= 0);
        }
        if (!found && options.searchContent) {
            if (existsSync(path)) {
                const content = readFileStrSync(path, READFILE_OPTIONS);
                found = useRegex ? (content.search(searchRegex) >= 0) : (content.indexOf(searchLiteral) >= 0);
            }
        }
        if (invertMatch) {
            found = !found;
        }
        return found;
    });
    return paths;
}

function doOutput(options: IPresearchOptions, result: IPresearchResult, callback?: () => void): IPresearchOutput {
    let output = '';
    const separator = options.outputNUL ? String.fromCharCode(0) : os.EOL;

    if (options.outputLevel <= IOutputLevel.info) { console.log(result.title); }

    switch (options.outputFormat) {
        case IOutputFormat.glob:
            // Comma-separated, whitespace-escaped string files to include.
            output = result.paths.join(',');
            output = output.replace(/ /g, '\ '); // Escape spaces in file paths.
            // TODO Reduce with definitive glob patters where paths have similar text.
            break;
        case IOutputFormat.count:
            output = result.paths.length.toString();
            break;
        case IOutputFormat.tree:
            if (options.outputLevel <= IOutputLevel.error) {
                console.error('tree output not implemented');
            }
            Deno.exit(2);
        case IOutputFormat.json:
            if (options.outputLevel <= IOutputLevel.error) {
                console.error('json output not implemented');
            }
            Deno.exit(2);
        case IOutputFormat.verbose:
            if (options.outputLevel <= IOutputLevel.error) {
                console.error('verbose output not implemented');
            }
            Deno.exit(2);
        case IOutputFormat.link:
        default:
            switch (options.outputHeader[0]) {
                case IOutputHeader.line:
                case IOutputHeader.column:
                    if (options.outputLevel <= IOutputLevel.error) {
                        console.error('Output header format not implemented');
                    }
                    Deno.exit(2);
                case IOutputHeader.path:
                default:
                    output = result.paths.join(separator);
                    break;
            }
            break;
    }
    if (options.outputLevel <= IOutputLevel.error) { console.log(output); }

    // TODO Implement outputFormat: link, tree, count, json, glob, verbose.
    // TODO Implement outputHeader: path, line, column

    OUTPUT = output;
    if (options.outputLevel <= IOutputLevel.debug) { console.debug('OUTPUT', OUTPUT); }
    if (callback) { callback(); }
    return output;
}
