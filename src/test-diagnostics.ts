import * as ts from 'typescript';
import * as path from 'path';

function createInvalidAST(): ts.SourceFile {
    // 使用 AST 生成源代码文本
    function generateSourceText(): string {
        const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
        const resultFile = ts.createSourceFile("temp.ts", "", ts.ScriptTarget.Latest, false, ts.ScriptKind.TS);

        const statements: ts.Statement[] = [
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

        const sourceFile = ts.factory.updateSourceFile(resultFile, statements);
        return printer.printFile(sourceFile);
    }

    const sourceText = generateSourceText();

    // 使用生成的源代码文本创建 SourceFile
    return ts.createSourceFile('test.ts', sourceText, ts.ScriptTarget.Latest, true);
}

// Compile TypeScript code and capture diagnostics
function compileTsCode(sourceFile: ts.SourceFile): void {
    const compilerOptions: ts.CompilerOptions = {
        noEmit: true,
        strict: true,
        target: ts.ScriptTarget.Latest,
        module: ts.ModuleKind.CommonJS,
        lib: ['lib.es2015.d.ts'], // Add this line to include standard library
    };

    // Print the generated TypeScript code
    console.log("Generated TypeScript code:");
    console.log(sourceFile.text);

    // Get the path to the TypeScript library files
    const tsconfigPath = ts.findConfigFile(process.cwd(), ts.sys.fileExists, 'tsconfig.json');
    const basePath = tsconfigPath ? path.dirname(tsconfigPath) : process.cwd();
    const libPath = path.join(basePath, 'node_modules', 'typescript', 'lib');

    // Create a custom compiler host
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

    // Get diagnostics
    const program = ts.createProgram([sourceFile.fileName], compilerOptions, compilerHost);
    const diagnostics = ts.getPreEmitDiagnostics(program);

    // Check for diagnostics and log them
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

// Test generating and compiling invalid AST
const sourceFile = createInvalidAST();
compileTsCode(sourceFile);