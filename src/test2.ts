import * as ts from 'typescript';
import * as path from 'path';

export function createTsSourceFileWithErrors(): ts.SourceFile {
    const astFragments = createAstFragmentsWithErrors();
    const sourceText = printAstFragments(astFragments);
    return ts.createSourceFile('test.ts', sourceText, ts.ScriptTarget.Latest, true);
}

function createAstFragmentsWithErrors(): ts.Statement[] {
    return [
        // const x = "Hello"
        ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
                [ts.factory.createVariableDeclaration(
                    ts.factory.createIdentifier("x"),
                    undefined,
                    undefined,
                    ts.factory.createStringLiteral("Hello")
                )],
                ts.NodeFlags.Const
            )
        ),
        // const y: number = "World"
        ts.factory.createVariableStatement(
            undefined,
            ts.factory.createVariableDeclarationList(
                [ts.factory.createVariableDeclaration(
                    ts.factory.createIdentifier("y"),
                    undefined,
                    ts.factory.createKeywordTypeNode(ts.SyntaxKind.NumberKeyword),
                    ts.factory.createStringLiteral("World")
                )],
                ts.NodeFlags.Const
            )
        )
    ];
}

function printAstFragments(statements: ts.Statement[]): string {
    const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
    const resultFile = ts.createSourceFile("temp.ts", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);
    const sourceFile = ts.factory.updateSourceFile(resultFile, statements);
    return printer.printFile(sourceFile);
}

export function analyzeTsCode(sourceFile: ts.SourceFile): readonly ts.Diagnostic[] {
    const compilerOptions: ts.CompilerOptions = {
        noEmit: true,
        strict: true,
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.CommonJS,
        lib: ['lib.es2015.d.ts'],
    };

    const compilerHost = createCompilerHost(compilerOptions, sourceFile);
    const program = ts.createProgram([sourceFile.fileName], compilerOptions, compilerHost);
    return ts.getPreEmitDiagnostics(program);
}

function createCompilerHost(compilerOptions: ts.CompilerOptions, sourceFile: ts.SourceFile): ts.CompilerHost {
    const tsconfigPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
    const basePath = tsconfigPath ? path.dirname(tsconfigPath) : process.cwd();
    const libPath = path.join(basePath, 'node_modules', 'typescript', 'lib');

    const compilerHost = ts.createCompilerHost(compilerOptions);
    const originalGetSourceFile = compilerHost.getSourceFile;
    compilerHost.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) => {
        if (fileName.startsWith('lib.')) {
            const libFilePath = path.join(libPath, fileName);
            const sourceText = ts.sys.readFile(libFilePath);
            return sourceText !== undefined
                ? ts.createSourceFile(fileName, sourceText, languageVersion)
                : undefined;
        }
        return fileName === sourceFile.fileName
            ? sourceFile
            : originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
    };

    return compilerHost;
}

export function logDiagnostics(diagnostics: ts.Diagnostic[]): void {
    if (diagnostics.length > 0) {
        diagnostics.forEach(diagnostic => {
            if (diagnostic.file) {
                let { line, character } = diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start!);
                let message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
                console.log(`${diagnostic.file.fileName} (${line + 1},${character + 1}): ${message}`);
            } else {
                console.log(ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
            }
        });
    } else {
        console.log("No diagnostics found.");
    }
}

function generateJavaScript(sourceFile: ts.SourceFile): string {
    const compilerOptions: ts.CompilerOptions = {
        target: ts.ScriptTarget.ES5,
        module: ts.ModuleKind.CommonJS,
    };

    const result = ts.transpileModule(sourceFile.text, {
        compilerOptions: compilerOptions,
        fileName: sourceFile.fileName
    });

    return result.outputText;
}

function main() {
    const sourceFile = createTsSourceFileWithErrors();

    // Print the generated TypeScript code
    console.log("Generated TypeScript code with intentional errors:");
    console.log(sourceFile.text);

    const diagnostics = analyzeTsCode(sourceFile);
    logDiagnostics(diagnostics as ts.Diagnostic[]);

    const jsCode = generateJavaScript(sourceFile);
    console.log('Generated JavaScript code:');
    console.log(jsCode);
}

main();