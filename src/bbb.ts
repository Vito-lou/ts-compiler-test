import * as ts from 'typescript';

// 1. Create a function to generate invalid TypeScript AST
function createInvalidAST(): string {
    return `
        const x = "Hello"; // This is a string
        const y: number = "World"; // This will cause a type error
    `;
}

// 2. Create a custom Compiler Host
const customCompilerHost: ts.CompilerHost = {
    getSourceFile: (fileName, languageVersion) => {
        if (fileName === "test.ts") {
            const code = createInvalidAST();
            return ts.createSourceFile(fileName, code, languageVersion);
        }
        return undefined; // Return undefined for other files
    },
    writeFile: (fileName, data) => {
        console.log(`Writing file ${fileName}: ${data}`);
    },
    getDefaultLibFileName: () => "lib.d.ts",
    useCaseSensitiveFileNames: () => false,
    getCanonicalFileName: fileName => fileName,
    getCurrentDirectory: () => "",
    getNewLine: () => "\n",
    fileExists: () => true,
    readFile: () => ""
};

// 3. Compile TypeScript code and capture diagnostics
function compileTsCode(): void {
    const program = ts.createProgram({
        rootNames: ["test.ts"], // Add the virtual filename
        options: {
            noEmit: true, // Do not generate output files
            strict: true, // Enable strict mode
            lib: ['es2015']
        },
        host: customCompilerHost // Use the custom Compiler Host
    });

    // Get diagnostics
    const diagnostics = ts.getPreEmitDiagnostics(program);
    console.log('diagnostics', diagnostics)
    // Check compilation results
    if (diagnostics.length > 0) {
        diagnostics.forEach(diagnostic => {
            const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n');
            console.error(`Error ${diagnostic.code}: ${message}`);
        });
    } else {
        console.log("No diagnostics found.");
    }
}

// 4. Test generation and compilation
compileTsCode();