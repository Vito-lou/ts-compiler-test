import * as ts from 'typescript';

// Utility function to create a boolean literal
function createBooleanLiteral(factory: ts.NodeFactory, flag: boolean): ts.BooleanLiteral {
    return flag ? factory.createTrue() : factory.createFalse();
}

// Function to create a variable statement with a boolean type
function createBoolVariable(): ts.VariableStatement {
    const factory = ts.factory; // Get the NodeFactory

    // Create an identifier for the variable
    const identifier = factory.createIdentifier('isTrue');

    // Create a boolean literal (true)
    const booleanLiteral = createBooleanLiteral(factory, true); // Change to false if needed

    // Create a variable declaration
    const variableDeclaration = factory.createVariableDeclaration(
        identifier,           // Identifier
        undefined,            // Type (undefined means TypeScript infers it)
        undefined,            // Initializer type (undefined means let TypeScript infer)
        booleanLiteral        // Initial value
    );

    // Create a variable declaration list
    const variableDeclarationList = factory.createVariableDeclarationList(
        [variableDeclaration], // List of declarations
        ts.NodeFlags.None      // No special flags
    );

    // Create a variable statement
    return factory.createVariableStatement(
        [],                     // Modifiers (e.g., `const`, `let`, etc.)
        variableDeclarationList  // The variable declaration list
    );
}

// Generate and print the resulting AST node
const boolVarDecl = createBoolVariable();
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const result = printer.printNode(ts.EmitHint.Unspecified, boolVarDecl, ts.createSourceFile('test.ts', '', ts.ScriptTarget.Latest, false, ts.ScriptKind.TS));
console.log(result);