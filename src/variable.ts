import * as ts from 'typescript';

function createVariableDeclarations() {
    // 单个变量声明
    const singleDeclaration = ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
            [ts.factory.createVariableDeclaration(
                ts.factory.createIdentifier("x"),
                undefined,
                undefined,
                ts.factory.createNumericLiteral(5)
            )],
            ts.NodeFlags.Const
        )
    );

    // 多个变量声明
    const multipleDeclarations = ts.factory.createVariableStatement(
        undefined,
        ts.factory.createVariableDeclarationList(
            [
                ts.factory.createVariableDeclaration(
                    ts.factory.createIdentifier("a"),
                    undefined,
                    undefined,
                    ts.factory.createNumericLiteral(1)
                ),
                ts.factory.createVariableDeclaration(
                    ts.factory.createIdentifier("b"),
                    undefined,
                    undefined,
                    ts.factory.createStringLiteral("hello")
                )
            ],
            ts.NodeFlags.Let
        )
    );

    // 创建一个函数声明，其中包含这些变量声明
    const functionDeclaration = ts.factory.createFunctionDeclaration(
        undefined,
        undefined,
        ts.factory.createIdentifier("exampleFunction"),
        undefined,
        [],
        undefined,
        ts.factory.createBlock(
            [
                singleDeclaration,
                multipleDeclarations,
                ts.factory.createExpressionStatement(
                    ts.factory.createCallExpression(
                        ts.factory.createIdentifier("console.log"),
                        undefined,
                        [ts.factory.createIdentifier("x"), ts.factory.createIdentifier("a"), ts.factory.createIdentifier("b")]
                    )
                )
            ],
            true
        )
    );

    return functionDeclaration;
}

// 创建一个源文件
const sourceFile = ts.createSourceFile(
    "example.ts",
    "",
    ts.ScriptTarget.Latest,
    false,
    ts.ScriptKind.TS
);

// 创建变量声明
const functionDeclaration = createVariableDeclarations();

// 打印生成的代码
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
const result = printer.printNode(ts.EmitHint.Unspecified, functionDeclaration, sourceFile);
console.log(result);

// 编译并执行生成的代码
const compiledFunction = new Function(result + "\nexampleFunction();");
compiledFunction();