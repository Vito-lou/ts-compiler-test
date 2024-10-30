import { Project, ScriptTarget, ModuleKind, SourceFile, DiagnosticCategory, VariableDeclarationKind } from 'ts-morph';

export function createTsSourceFileWithErrors(): SourceFile {
    const project = new Project({
        compilerOptions: {
            target: ScriptTarget.Latest,
            module: ModuleKind.CommonJS,
        }
    });

    // Create an empty source file
    const sourceFile = project.createSourceFile('test.ts', '', { overwrite: true });


    handleNode1(sourceFile);
    handleNode2(sourceFile);

    return sourceFile;
}

function handleNode1(sourceFile: SourceFile) {
    const nodeId = 'handleNode1'
    // Add marker comment
    sourceFile.addStatements(`// START ${nodeId}`);

    sourceFile.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        declarations: [{
            name: 'x',
            initializer: '"Hello"'
        }]
    });

    sourceFile.addStatements(`// END ${nodeId}`);
}

function handleNode2(sourceFile: SourceFile) {
    const nodeId = 'handleNode2'
    // Add marker comment
    sourceFile.addStatements(`// START ${nodeId}`);

    sourceFile.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        declarations: [{
            name: 'y',
            type: 'number',
            initializer: '"World"'
        }]
    });

    sourceFile.addStatements(`// END ${nodeId}`);
}
export function analyzeTsCode(sourceFile: SourceFile): void {
    const diagnostics = sourceFile.getPreEmitDiagnostics();

    if (diagnostics.length > 0) {
        diagnostics.forEach(diagnostic => {
            const message = diagnostic.getMessageText();
            const category = diagnostic.getCategory();
            const pos = diagnostic.getStart();

            if (pos !== undefined) {
                const { line, column } = sourceFile.getLineAndColumnAtPos(pos);

                // Find which handler caused the error by searching for the nearest preceding START comment
                const fullText = sourceFile.getFullText();
                const textBeforeError = fullText.substring(0, pos);
                const startComments = [...textBeforeError.matchAll(/\/\/ START (handleNode\d+)/g)];
                const endComments = [...textBeforeError.matchAll(/\/\/ END (handleNode\d+)/g)];

                let handlerId = 'unknown';
                if (startComments.length > 0) {
                    const lastStart = startComments[startComments.length - 1];
                    const lastEnd = endComments[endComments.length - 1];

                    // Check if we're between the last START and END
                    if (!lastEnd || lastStart.index > lastEnd.index) {
                        handlerId = lastStart[1];
                    }
                }

                console.log(`${sourceFile.getFilePath()} (${line},${column}) [Handler: ${handlerId}]: ${category === DiagnosticCategory.Error ? 'Error' : 'Warning'}: ${message}`);
            } else {
                console.log(`${category === DiagnosticCategory.Error ? 'Error' : 'Warning'}: ${message}`);
            }
        });
    } else {
        console.log("No diagnostics found.");
    }
}

export function generateJavaScript(sourceFile: SourceFile): string {
    return sourceFile.getEmitOutput().getOutputFiles()[0].getText();
}

function main() {
    const sourceFile = createTsSourceFileWithErrors();

    // Print the generated TypeScript code
    console.log("Generated TypeScript code with intentional errors:");
    console.log(sourceFile.getFullText());

    // Analyze and print diagnostics
    analyzeTsCode(sourceFile);

    // Generate and print JavaScript code
    const jsCode = generateJavaScript(sourceFile);
    console.log('Generated JavaScript code:');
    console.log(jsCode);
}

main();