import { Project, ScriptTarget, ModuleKind, SourceFile, DiagnosticCategory, VariableDeclarationKind } from 'ts-morph';

interface CodeSegment {
    handlerId: string;
    start: number;
    end: number;
}

export function createTsSourceFileWithErrors(): SourceFile {
    const project = new Project({
        compilerOptions: {
            target: ScriptTarget.Latest,
            module: ModuleKind.CommonJS,
        }
    });

    // Create an empty source file
    const sourceFile = project.createSourceFile('test.ts', '', { overwrite: true });
    const codeSegments: CodeSegment[] = [];

    handleNode1(sourceFile, codeSegments);
    handleNode2(sourceFile, codeSegments);
    (sourceFile as any).__codeSegments = codeSegments;

    return sourceFile;
}

function handleNode1(sourceFile: SourceFile, codeSegments: CodeSegment[]) {
    const startPos = sourceFile.getEnd();

    sourceFile.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        declarations: [{
            name: 'x',
            initializer: '"Hello"'
        }]
    });

    codeSegments.push({
        handlerId: 'handleNode1',
        start: startPos,
        end: sourceFile.getEnd()
    });
}


function handleNode2(sourceFile: SourceFile, codeSegments: CodeSegment[]) {
    const startPos = sourceFile.getEnd();

    sourceFile.addVariableStatement({
        declarationKind: VariableDeclarationKind.Const,
        declarations: [{
            name: 'y',
            type: 'number',
            initializer: '"World"'
        }]
    });

    codeSegments.push({
        handlerId: 'handleNode2',
        start: startPos,
        end: sourceFile.getEnd()
    });
}

export function analyzeTsCode(sourceFile: SourceFile): void {
    const diagnostics = sourceFile.getPreEmitDiagnostics();
    const codeSegments: CodeSegment[] = (sourceFile as any).__codeSegments || [];

    if (diagnostics.length > 0) {
        diagnostics.forEach(diagnostic => {
            const message = diagnostic.getMessageText();
            const category = diagnostic.getCategory();
            const pos = diagnostic.getStart();

            if (pos !== undefined) {
                const { line, column } = sourceFile.getLineAndColumnAtPos(pos);

                // Find which handler caused the error by checking the source map
                const handlerId = codeSegments.find(segment =>
                    pos >= segment.start && pos <= segment.end
                )?.handlerId || 'unknown';

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