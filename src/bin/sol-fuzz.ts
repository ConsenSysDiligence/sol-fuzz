#!/usr/bin/env node
import { Command } from "commander";
import fse from "fs-extra";
import {
    assert,
    ASTReader,
    ASTWriter,
    CACHE_DIR,
    CompilationOutput,
    CompileFailedError,
    compileJson,
    compileJsonData,
    CompileResult,
    CompilerKind,
    CompilerVersions,
    compileSol,
    compileSourceString,
    DefaultASTWriterMapping,
    downloadSupportedCompilers,
    isExact,
    LatestCompilerVersion,
    PathOptions,
    PossibleCompilerKinds,
    PrettyFormatter
} from "solc-typed-ast";
import { applyNRandomRewrites, makeRewrite, parseRules } from "../rewrites";
import { Rewrite } from "../rewrites/dsl";
import { BaseRule, GenRule, RewriteRule } from "../rewrites/dsl/ast";
import { GenEnv } from "../rewrites/dsl/build";
import { PeggySyntaxError } from "../rewrites/dsl/parser_gen";
import { Diversity, Unbiased } from "../utils";

const pkg = require("../../package.json");

enum CompileMode {
    Auto = "auto",
    Sol = "sol",
    Json = "json"
}

const compileModes = Object.values(CompileMode);

async function main() {
    const program = new Command();

    program
        .name("sol-fuzz")
        .description(pkg.description)
        .version(pkg.version, "-v, --version", "Print package version")
        .helpOption("-h, --help", "Print help message");

    program.argument("file", "Solidity file to re-write");

    program
        .option("--solidity-versions", "Print information about supported Solidity versions.")
        .option("--stdin", "Read input from STDIN instead of files.")
        .option(
            "--mode <mode>",
            `One of the following input modes: "${CompileMode.Sol}" (Solidity source), "${CompileMode.Json}" (JSON compiler artifact), "${CompileMode.Auto}" (try to detect by file extension)`,
            CompileMode.Auto
        )
        .option(
            "--compiler-version <compilerVersion>",
            `Solc version to use: ${LatestCompilerVersion} (exact SemVer version specifier), auto (try to detect suitable compiler version)`,
            "auto"
        )
        .option(
            "--compiler-kind <compilerKind>",
            `Type of Solidity compiler to use. Currently supported values are "${CompilerKind.WASM}" or "${CompilerKind.Native}".`,
            CompilerKind.WASM
        )
        .option("--path-remapping <pathRemapping>", "Path remapping input for Solc.")
        .option("--base-path <basePath>", "Base path for compiler to look for files Solc.")
        .option(
            "--include-path <includePath...>",
            "Include paths for compiler to additinally look for files. Supports multiple entries."
        )
        .option(
            "--compiler-settings <compilerSettings>",
            `Additional settings passed to the solc compiler in the form of a JSON string (e.g. '{"optimizer": {"enabled": true, "runs": 200}}'). Note the double quotes. For more details see https://docs.soliditylang.org/en/latest/using-the-compiler.html#input-description.`
        )
        .option(
            "--locate-compiler-cache",
            "Print location of current compiler cache directory (used to store downloaded compilers)."
        )
        .option(
            "--download-compilers <compilerKind...>",
            `Download specified kind of supported compilers to compiler cache. Supports multiple entries.`
        )
        .option("--rewrites <rewritePath>", `Path to file containing AST re-writes`)
        .option("--rewrite-depth <rewriteDepth>", `Number of re-writes to apply`, "1")
        .option("--num-results <numResults>", `Number of results to return`, "1")
        .option(
            "--diversity",
            "If enabled try to diversify the random choices we make - i.e. bias towards less chosen options."
        );

    program.parse(process.argv);

    const args = program.args;
    const options = program.opts();

    if (options.solidityVersions) {
        const message = [
            "Latest supported version: " + LatestCompilerVersion,
            "",
            `All supported versions (${CompilerVersions.length} total):`,
            ...CompilerVersions
        ].join("\n");

        console.log(message);

        return;
    }

    if (options.locateCompilerCache) {
        console.log(CACHE_DIR);

        return;
    }

    if (options.downloadCompilers) {
        const compilerKinds = options.downloadCompilers.map((kind: string): CompilerKind => {
            if (PossibleCompilerKinds.has(kind)) {
                return kind as CompilerKind;
            }

            throw new Error(
                `Invalid compiler kind "${kind}". Possible values: ${[
                    ...PossibleCompilerKinds.values()
                ].join(", ")}.`
            );
        });

        console.log(
            `Downloading compilers (${compilerKinds.join(", ")}) to current compiler cache:`
        );

        for await (const compiler of downloadSupportedCompilers(compilerKinds)) {
            console.log(`${compiler.path} (${compiler.constructor.name} v${compiler.version})`);
        }

        return;
    }

    if (options.help || (!args.length && !options.stdin)) {
        console.log(program.helpInformation());

        return;
    }

    let rules: BaseRule[] = [];

    if (options.rewrites) {
        try {
            rules = parseRules(fse.readFileSync(options.rewrites, { encoding: "utf-8" }));
        } catch (e) {
            if (e instanceof PeggySyntaxError) {
                console.error(
                    `Error parsing rewrites: ${e.location.start.line}:${e.location.start.column}: ${e.message}`
                );
                return;
            }

            throw e;
        }
    }

    const genRules: GenRule[] = rules.filter((r) => r instanceof GenRule) as GenRule[];
    const env: GenEnv = new Map(genRules.map((r) => [r.name, r.pattern]));

    const rewriteRules: RewriteRule[] = rules.filter(
        (r) => r instanceof RewriteRule
    ) as RewriteRule[];

    if (rewriteRules.length === 0) {
        console.error(`No re-write rules specified. Exiting...`);
        return;
    }

    const rand = options.diversity ? new Diversity() : new Unbiased();

    const rewrites: Rewrite[] = rewriteRules.map((r) => makeRewrite(r, env, rand));

    const stdin: boolean = options.stdin;
    const mode: CompileMode = options.mode;
    const compilerKind: CompilerKind = options.compilerKind;

    if (!PossibleCompilerKinds.has(compilerKind)) {
        throw new Error(
            `Invalid compiler kind "${compilerKind}". Possible values: ${[
                ...PossibleCompilerKinds.values()
            ].join(", ")}.`
        );
    }

    if (!compileModes.includes(mode)) {
        throw new Error(`Invalid mode "${mode}". Possible values: ${compileModes.join(", ")}.`);
    }

    const compilerVersion: string = options.compilerVersion;

    if (!(compilerVersion === "auto" || isExact(compilerVersion))) {
        const message = [
            `Invalid compiler version "${compilerVersion}".`,
            'Possible values: "auto" or exact version string.'
        ].join(" ");

        throw new Error(message);
    }

    const pathOptions: PathOptions = {
        remapping: options.pathRemapping ? options.pathRemapping.split(";") : [],
        basePath: options.basePath,
        includePath: options.includePath
    };

    let compilerSettings: any = undefined;

    if (options.compilerSettings) {
        try {
            compilerSettings = JSON.parse(options.compilerSettings);
        } catch (e) {
            throw new Error(
                `Invalid compiler settings '${options.compilerSettings}'. Compiler settings must be a valid JSON object (${e}).`
            );
        }
    }

    const compilationOutput: CompilationOutput[] = [CompilationOutput.ALL];

    let result: CompileResult;

    try {
        if (stdin) {
            if (mode === "auto") {
                throw new Error(
                    'Mode "auto" is not supported for the input from STDIN. Explicitly specify "mode" as "sol" or "json" instead.'
                );
            }

            const fileName = "stdin";
            const content = await fse.readFile(process.stdin.fd, { encoding: "utf-8" });

            result =
                mode === "json"
                    ? await compileJsonData(
                          fileName,
                          JSON.parse(content),
                          compilerVersion,
                          compilationOutput,
                          compilerSettings,
                          compilerKind
                      )
                    : await compileSourceString(
                          fileName,
                          content,
                          compilerVersion,
                          pathOptions,
                          compilationOutput,
                          compilerSettings,
                          compilerKind
                      );
        } else {
            const fileName = args[0];
            const iSingleFileName = fileName.toLowerCase();

            let isSol: boolean;
            let isJson: boolean;

            if (mode === "auto") {
                isSol = iSingleFileName.endsWith(".sol");
                isJson = iSingleFileName.endsWith(".json");
            } else {
                isSol = mode === "sol";
                isJson = mode === "json";
            }

            if (isSol) {
                result = await compileSol(
                    fileName,
                    compilerVersion,
                    pathOptions,
                    compilationOutput,
                    compilerSettings,
                    compilerKind
                );
            } else if (isJson) {
                result = await compileJson(
                    fileName,
                    compilerVersion,
                    compilationOutput,
                    compilerSettings,
                    compilerKind
                );
            } else {
                throw new Error("Unable to auto-detect mode by the file name: " + fileName);
            }
        }
    } catch (e: any) {
        if (e instanceof CompileFailedError) {
            console.error("Compile errors encountered:");

            for (const failure of e.failures) {
                console.error(
                    failure.compilerVersion
                        ? `SolcJS ${failure.compilerVersion}:`
                        : "Unknown compiler:"
                );

                for (const error of failure.errors) {
                    console.error(error);
                }
            }

            throw new Error("Unable to compile due to errors above.");
        }

        throw e;
    }

    const reader = new ASTReader();
    const units = reader.read(result.data);
    const formatter = new PrettyFormatter(4, 0);
    const writer = new ASTWriter(
        DefaultASTWriterMapping,
        formatter,
        result.compilerVersion as string
    );

    assert(units.length === 1, `Expected a single source unit`);

    const rewriteDepth = Number(options.rewriteDepth);
    const numResults = Number(options.numResults);
    for (let i = 0; i < numResults; i++) {
        const variant = applyNRandomRewrites(units[0], rewrites, rewriteDepth, rand);
        console.log("==================================================================");
        console.log(writer.write(variant));
    }
}

main()
    .then(() => {
        process.exit(0);
    })
    .catch((e) => {
        console.error(e.message);

        process.exit(1);
    });
