#!/bin/bash

# ts-node with node v13+
# See: https://github.com/TypeStrong/ts-node/issues/1007
# find ./src -name *.ts | _
# node --loader ts-node/esm.mjs --experimental-specifier-resolution=node src/presearch.ts -w -i "settimeout"

# ts-node with node v12: node --experimental-modules, package.json: "type": "module"
# See: https://github.com/TypeStrong/ts-node/issues/1007
# find ./src -name *.ts | _
# node --loader ts-node/esm.mjs --experimental-modules --experimental-specifier-resolution=node src/presearch.ts -w -i "settimeout"

# node: FAIL. does not run typescript.
# find ./src -name *.ts | node --experimental-import-meta-resolve src/presearch.ts -w -i "settimeout"

# Deno v1.0.2.
# find ./src -name *.ts | deno run --unstable --allow-read --allow-env src/presearch.ts -w --case "settimeout"
find ./src -name *.ts | deno run --unstable --allow-read --allow-env src/presearch.ts -w -i "settimeout"
find ./src -name *.ts | deno run --unstable --allow-read --allow-env src/presearch.ts -w -i "settimeout" --glob
find ./src -name *.ts | deno run --unstable --allow-read --allow-env src/presearch.ts -w -i "settimeout" --count
find ./src -name *.ts | deno run --unstable --allow-read --allow-env src/presearch.ts -w -i "settimeout" --json
find ./src -name *.ts | deno run --unstable --allow-read --allow-env src/presearch.ts -w -i "settimeout" --quiet --link
# find ./src -name *.ts | deno run --unstable --allow-read --allow-env src/presearch.ts -w -i -v "settimeout"
# find ./src -name *.ts | deno run --unstable --allow-read --allow-env src/presearch.ts -w -i -z "settimeout"
# find ./src -name *.ts | deno eval --unstable -T "console.log(Deno.readAllSync(Deno.stdin))"
