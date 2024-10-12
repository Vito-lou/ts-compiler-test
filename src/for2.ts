import * as ts from 'typescript';

// Create a for loop
function createForLoop(): ts.ForStatement {
    // 1. Create the variable declaration for index
    const indexDeclaration = ts.factory.createVariableDeclaration(
        ts.factory.createIdentifier("index"),
        undefined,
        undefined,
        ts.factory.createNumericLiteral(0) // Initial value of 0
    );

    // Create a variable declaration list for index
    const indexVarDeclList = ts.factory.createVariableDeclarationList(
        [indexDeclaration],
        ts.NodeFlags.Let // Use let declaration
    );

    // 2. Create the for loop condition
    const condition = ts.factory.createBinaryExpression(
        ts.factory.createIdentifier("index"),
        ts.SyntaxKind.LessThanToken,
        ts.factory.createPropertyAccessExpression(ts.factory.createIdentifier("list"), "length")
    );

    // 3. Create the increment expression
    const increment = ts.factory.createPostfixIncrement(ts.factory.createIdentifier("index"));

    const itemDeclaration = ts.factory.createVariableDeclaration(
        ts.factory.createIdentifier("item"),
        undefined,
        undefined,
        ts.factory.createElementAccessExpression(
            ts.factory.createIdentifier("list"),
            ts.factory.createIdentifier("index")
        )
    );

    const itemVarDeclList = ts.factory.createVariableDeclarationList(
        [itemDeclaration],
        ts.NodeFlags.Const
    );

    const itemAssignment = ts.factory.createVariableStatement(
        undefined,
        itemVarDeclList
    );
    // Create a block for the loop body
    const block = ts.factory.createBlock([itemAssignment], true);

    // 5. Create the for statement
    return ts.factory.createForStatement(
        indexVarDeclList, // Use VariableDeclarationList here
        condition,
        increment,
        block
    );
}

// Test generating the for loop
const forLoop = createForLoop();
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });

// Create a source file to pass to printNode
const sourceFile = ts.createSourceFile("test.ts", "", ts.ScriptTarget.Latest);

// Print the generated for loop node
const result = printer.printNode(ts.EmitHint.Unspecified, forLoop, sourceFile);
console.log(result);